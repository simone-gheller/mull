import { uuidv7 } from 'uuidv7';
import { uuidV7Param } from '../schemas/common.js';
import { billingConfig } from '../config.js';
import { getPlanLimits } from '../lib/planLimits.js';
import {
  billingProvider,
  normalizePaddleStatus,
  paddleApi,
  planForPriceId,
  planForSubscriptionStatus,
  priceIdFor,
  verifyPaddleSignature
} from '../lib/billing.js';
import { invalidateOrg } from '../lib/orgSecurityCache.js';

const orgIdParamsSchema = {
  type: 'object',
  required: ['orgId'],
  properties: {
    orgId: uuidV7Param('Organization ID'),
  },
};

function toDate(value) {
  return value ? new Date(value) : null;
}

function paddleSubscriptionPeriod(subscription) {
  return {
    currentPeriodStart: toDate(subscription?.current_billing_period?.starts_at),
    currentPeriodEnd: toDate(subscription?.current_billing_period?.ends_at),
    trialEndsAt: toDate(subscription?.trial_dates?.ends_at),
    cancelAtPeriodEnd: subscription?.scheduled_change?.action === 'cancel'
  };
}

function paddleSubscriptionPriceId(subscription) {
  return subscription?.items?.[0]?.price?.id || subscription?.items?.[0]?.price_id || null;
}

function checkoutReturnUrl(config, orgId) {
  const appUrl = config.APP_URL || 'http://localhost:5173';
  return `${appUrl.replace(/\/$/, '')}/settings/org?tab=billing&orgId=${orgId}`;
}

async function loadBillingState(prisma, orgId) {
  const [org, subscription, usage] = await Promise.all([
    prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, plan: true }
    }),
    prisma.billingSubscription.findUnique({ where: { orgId } }),
    Promise.all([
      prisma.userOrganization.count({ where: { orgId } }),
      prisma.app.count({ where: { orgId } }),
      prisma.environment.count({ where: { orgId } }),
      prisma.parameterValue.count({ where: { environment: { orgId } } }),
      prisma.accessKey.count({ where: { identity: { orgId }, revokedAt: null } })
    ])
  ]);

  const [members, apps, environments, parameterValues, serviceTokens] = usage;
  const limits = getPlanLimits(org?.plan);

  return {
    plan: org?.plan || 'FREE',
    limits,
    usage: { members, apps, environments, parameterValues, serviceTokens },
    subscription: subscription ? {
      provider: subscription.provider,
      status: subscription.status,
      providerPriceId: subscription.providerPriceId,
      currentPeriodStart: subscription.currentPeriodStart,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      trialEndsAt: subscription.trialEndsAt
    } : null
  };
}

async function resolveOrgIdForPaddleEvent(prisma, config, data) {
  const provider = billingProvider(config);
  const customOrgId = data?.custom_data?.orgId || data?.custom_data?.org_id;
  if (customOrgId) return customOrgId;

  if (data?.id?.startsWith?.('sub_')) {
    const existing = await prisma.billingSubscription.findUnique({
      where: { provider_providerSubscriptionId: { provider, providerSubscriptionId: data.id } },
      select: { orgId: true }
    });
    if (existing) return existing.orgId;
  }

  if (data?.customer_id) {
    const customer = await prisma.billingCustomer.findUnique({
      where: { provider_providerCustomerId: { provider, providerCustomerId: data.customer_id } },
      select: { orgId: true }
    });
    if (customer) return customer.orgId;
  }

  return null;
}

async function upsertPaddleCustomer(prisma, config, { orgId, data }) {
  if (!data?.customer_id) return;
  await prisma.billingCustomer.upsert({
    where: { orgId },
    create: {
      id: uuidv7(),
      orgId,
      provider: billingProvider(config),
      providerCustomerId: data.customer_id,
      billingEmail: data?.customer?.email || null
    },
    update: {
      providerCustomerId: data.customer_id,
      ...(data?.customer?.email ? { billingEmail: data.customer.email } : {})
    }
  });
}

async function applyPaddleSubscriptionEvent(prisma, config, data) {
  const orgId = await resolveOrgIdForPaddleEvent(prisma, config, data);
  if (!orgId || !data?.id?.startsWith?.('sub_')) return { orgId, applied: false };

  const status = normalizePaddleStatus(data.status);
  const priceId = paddleSubscriptionPriceId(data);
  const plan = planForSubscriptionStatus(config, data);
  const storedPlan = billingConfig.activeStatuses.has(status) ? plan : 'FREE';
  const period = paddleSubscriptionPeriod(data);

  await upsertPaddleCustomer(prisma, config, { orgId, data });
  await prisma.$transaction([
    prisma.billingSubscription.upsert({
      where: { orgId },
      create: {
        id: uuidv7(),
        orgId,
        provider: billingProvider(config),
        providerSubscriptionId: data.id,
        providerPriceId: priceId || 'unknown',
        plan: storedPlan,
        status,
        ...period
      },
      update: {
        providerSubscriptionId: data.id,
        providerPriceId: priceId || 'unknown',
        plan: storedPlan,
        status,
        ...period
      }
    }),
    prisma.organization.update({
      where: { id: orgId },
      data: { plan: storedPlan }
    })
  ]);

  invalidateOrg(orgId);

  return { orgId, applied: true };
}

async function applyPaddleTransactionEvent(prisma, config, data) {
  const orgId = await resolveOrgIdForPaddleEvent(prisma, config, data);
  if (!orgId) return { orgId, applied: false };

  await upsertPaddleCustomer(prisma, config, { orgId, data });
  return { orgId, applied: true };
}

export default async function billingRoutes(fastify) {
  fastify.get('/orgs/:orgId/billing', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('org:read')],
    schema: { tags: ['billing'], security: [{ bearerAuth: [] }], params: orgIdParamsSchema },
  }, async (request, reply) => {
    const state = await loadBillingState(fastify.prisma, request.params.orgId);
    return reply.send(state);
  });

  fastify.post('/orgs/:orgId/billing/checkout', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('billing:manage')],
    schema: {
      tags: ['billing'],
      security: [{ bearerAuth: [] }],
      params: orgIdParamsSchema,
      body: {
        type: 'object',
        required: ['plan'],
        properties: {
          plan: { type: 'string', enum: ['TEAM', 'BUSINESS'] },
          interval: { type: 'string', enum: ['month', 'year'], default: 'month' }
        }
      }
    },
  }, async (request, reply) => {
    const interval = request.body.interval === 'year' ? 'year' : 'month';
    const plan = request.body.plan;
    const priceId = priceIdFor(fastify.config, plan, interval);
    if (!priceId) {
      return reply.code(503).send({ error: 'Service Unavailable', message: 'Paddle price is not configured', statusCode: 503 });
    }
    if (!fastify.config.PADDLE_CLIENT_TOKEN) {
      return reply.code(503).send({ error: 'Service Unavailable', message: 'Paddle client token is not configured', statusCode: 503 });
    }

    return reply.send({
      provider: 'paddle',
      environment: fastify.config.PADDLE_ENV === 'production' ? 'production' : 'sandbox',
      clientToken: fastify.config.PADDLE_CLIENT_TOKEN,
      items: [{ priceId, quantity: 1 }],
      customer: { email: request.user.email },
      customData: {
        orgId: request.params.orgId,
        plan,
        billingProvider: 'paddle'
      },
      settings: {
        successUrl: checkoutReturnUrl(fastify.config, request.params.orgId)
      }
    });
  });

  fastify.post('/orgs/:orgId/billing/portal', {
    onRequest: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireJwtAuth(), fastify.requireScope('billing:manage')],
    schema: { tags: ['billing'], security: [{ bearerAuth: [] }], params: orgIdParamsSchema },
  }, async (request, reply) => {
    const customer = await fastify.prisma.billingCustomer.findUnique({ where: { orgId: request.params.orgId } });
    const subscription = await fastify.prisma.billingSubscription.findUnique({ where: { orgId: request.params.orgId } });
    if (!customer) {
      return reply.code(404).send({ error: 'Not Found', message: 'No billing customer exists for this organization', statusCode: 404 });
    }

    const body = subscription?.providerSubscriptionId
      ? { subscription_ids: [subscription.providerSubscriptionId] }
      : {};
    const session = await paddleApi(fastify.config, `/customers/${customer.providerCustomerId}/portal-sessions`, {
      method: 'POST',
      body
    });

    return reply.send({
      url: session?.data?.urls?.general?.overview || session?.data?.urls?.general
    });
  });

  fastify.post('/webhooks/paddle', {
    config: { rateLimit: false },
    schema: { tags: ['billing'] }
  }, async (request, reply) => {
    const rawBody = request.rawBody || JSON.stringify(request.body || {});
    const signatureHeader = request.headers['paddle-signature'];
    const valid = verifyPaddleSignature({
      rawBody,
      signatureHeader,
      secret: fastify.config.PADDLE_WEBHOOK_SECRET
    });
    if (!valid) {
      return reply.code(401).send({ error: 'Unauthorized', message: 'Invalid Paddle signature', statusCode: 401 });
    }

    const event = request.body || JSON.parse(rawBody);
    const eventId = event.event_id;
    const eventType = event.event_type;
    if (!eventId || !eventType) {
      return reply.code(400).send({ error: 'Bad Request', message: 'Invalid Paddle event', statusCode: 400 });
    }
    const eventOrgId = await resolveOrgIdForPaddleEvent(fastify.prisma, fastify.config, event.data);

    try {
      await fastify.prisma.billingEvent.create({
        data: { providerEventId: eventId, orgId: eventOrgId, provider: billingProvider(fastify.config), type: eventType }
      });
    } catch (error) {
      if (error.code === 'P2002') return reply.send({ received: true, duplicate: true });
      throw error;
    }

    if (eventType.startsWith('subscription.')) {
      await applyPaddleSubscriptionEvent(fastify.prisma, fastify.config, event.data);
    } else if (eventType.startsWith('transaction.')) {
      await applyPaddleTransactionEvent(fastify.prisma, fastify.config, event.data);
    } else if (eventType === 'customer.created' || eventType === 'customer.updated') {
      const orgId = await resolveOrgIdForPaddleEvent(fastify.prisma, fastify.config, event.data);
      if (orgId) await upsertPaddleCustomer(fastify.prisma, fastify.config, { orgId, data: event.data });
    }

    return reply.send({ received: true });
  });
}

export const testables = {
  applyPaddleSubscriptionEvent,
  loadBillingState,
  paddleSubscriptionPriceId,
  planForPriceId
};
