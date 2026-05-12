import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { buildTestContext } from '../utils/builders.js';

const WEBHOOK_SECRET = 'pdl_ntfset_test_secret';

function uniqueEventId(name) {
  return `evt_${name}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function signedWebhook(event) {
  const raw = JSON.stringify(event);
  const ts = Math.floor(Date.now() / 1000);
  const h1 = crypto.createHmac('sha256', WEBHOOK_SECRET).update(`${ts}:${raw}`).digest('hex');
  return {
    method: 'POST',
    url: '/webhooks/paddle',
    headers: {
      'content-type': 'application/json',
      'paddle-signature': `ts=${ts};h1=${h1}`
    },
    body: raw
  };
}

function subscriptionEvent({ eventId, orgId, subscriptionId = 'sub_test_1', status = 'active', priceId = 'pri_team_monthly' }) {
  return {
    event_id: eventId,
    event_type: 'subscription.updated',
    data: {
      id: subscriptionId,
      status,
      customer_id: 'ctm_test_1',
      custom_data: { orgId, plan: priceId === 'pri_business_monthly' ? 'BUSINESS' : 'TEAM' },
      current_billing_period: {
        starts_at: '2026-05-12T00:00:00Z',
        ends_at: '2026-06-12T00:00:00Z'
      },
      items: [{ price: { id: priceId } }]
    }
  };
}

describe('Billing Routes', () => {
  let ctx;
  let eventIds;

  beforeEach(async () => {
    process.env.PADDLE_WEBHOOK_SECRET = WEBHOOK_SECRET;
    process.env.PADDLE_CLIENT_TOKEN = 'test_client_token';
    process.env.PADDLE_PRICE_TEAM_MONTHLY = 'pri_team_monthly';
    process.env.PADDLE_PRICE_TEAM_YEARLY = 'pri_team_yearly';
    process.env.PADDLE_PRICE_BUSINESS_MONTHLY = 'pri_business_monthly';
    process.env.PADDLE_PRICE_BUSINESS_YEARLY = 'pri_business_yearly';
    eventIds = [];
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    if (ctx && eventIds.length > 0) {
      await ctx.prisma.billingEvent.deleteMany({ where: { providerEventId: { in: eventIds } } });
    }
    await ctx.cleanup();
  });

  test('GET /orgs/:orgId/billing returns plan, usage, and limits', async () => {
    const org = await ctx.buildOrg({ plan: 'FREE' });
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });
    await ctx.buildApp({ orgId: org.id });
    await ctx.buildEnv({ orgId: org.id });

    const response = await ctx.injectAuth({ method: 'GET', url: `/orgs/${org.id}/billing` }, owner);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.plan, 'FREE');
    assert.equal(body.usage.members, 1);
    assert.equal(body.usage.apps, 1);
    assert.equal(body.limits.members, 3);
    assert.equal(body.limits.customRoles, false);
  });

  test('checkout requires billing manage scope', async () => {
    const org = await ctx.buildOrg({ plan: 'FREE' });
    const developer = await ctx.buildUserInOrg(org, { role: 'DEVELOPER' });

    const response = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/billing/checkout`,
      body: { plan: 'TEAM', interval: 'month' }
    }, developer);

    assert.equal(response.statusCode, 403);
  });

  test('checkout returns Paddle client configuration for owners', async () => {
    const org = await ctx.buildOrg({ plan: 'FREE' });
    const owner = await ctx.buildUserInOrg(org, { role: 'OWNER' });

    const response = await ctx.injectAuth({
      method: 'POST',
      url: `/orgs/${org.id}/billing/checkout`,
      body: { plan: 'TEAM', interval: 'month' }
    }, owner);

    assert.equal(response.statusCode, 200);
    const body = JSON.parse(response.body);
    assert.equal(body.provider, 'paddle');
    assert.equal(body.clientToken, 'test_client_token');
    assert.equal(body.items[0].priceId, 'pri_team_monthly');
    assert.equal(body.customData.orgId, org.id);
  });

  test('Paddle webhook updates subscription and deduplicates events', async () => {
    const org = await ctx.buildOrg({ plan: 'FREE' });

    const event = subscriptionEvent({ eventId: uniqueEventId('billing_active'), orgId: org.id });
    eventIds.push(event.event_id);
    const first = await ctx.fastify.inject(signedWebhook(event));
    const second = await ctx.fastify.inject(signedWebhook(event));

    assert.equal(first.statusCode, 200);
    assert.equal(second.statusCode, 200);
    assert.equal(JSON.parse(second.body).duplicate, true);

    const dbOrg = await ctx.prisma.organization.findUnique({ where: { id: org.id } });
    const subscription = await ctx.prisma.billingSubscription.findUnique({ where: { orgId: org.id } });
    const storedEvent = await ctx.prisma.billingEvent.findUnique({ where: { providerEventId: event.event_id } });

    assert.equal(dbOrg.plan, 'TEAM');
    assert.equal(subscription.status, 'ACTIVE');
    assert.equal(subscription.plan, 'TEAM');
    assert.equal(storedEvent.orgId, org.id);
  });

  test('Paddle canceled webhook downgrades to Free', async () => {
    const org = await ctx.buildOrg({ plan: 'TEAM' });
    const active = subscriptionEvent({ eventId: uniqueEventId('billing_active'), orgId: org.id });
    eventIds.push(active.event_id);
    await ctx.fastify.inject(signedWebhook(active));

    const canceled = subscriptionEvent({
      eventId: uniqueEventId('billing_canceled'),
      orgId: org.id,
      status: 'canceled'
    });
    eventIds.push(canceled.event_id);
    const response = await ctx.fastify.inject(signedWebhook(canceled));

    assert.equal(response.statusCode, 200);
    const dbOrg = await ctx.prisma.organization.findUnique({ where: { id: org.id } });
    const subscription = await ctx.prisma.billingSubscription.findUnique({ where: { orgId: org.id } });
    assert.equal(dbOrg.plan, 'FREE');
    assert.equal(subscription.status, 'CANCELED');
    assert.equal(subscription.plan, 'FREE');
  });
});
