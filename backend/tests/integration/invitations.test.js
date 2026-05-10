import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import { uuidv7 } from 'uuidv7';
import { buildTestContext } from '../utils/builders.js';

describe('Invitation Routes', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await buildTestContext();
  });

  afterEach(async () => {
    await ctx.cleanup();
  });

  describe('POST /invites/accept', () => {
    test('should not mutate role when invited user is already a member', async () => {
      const org = await ctx.buildOrg();
      const inviter = await ctx.buildUserInOrg(org, { role: 'OWNER' });
      const member = await ctx.buildUserInOrg(org, { role: 'USER' });
      const invite = await ctx.prisma.orgInvite.create({
        data: {
          id: uuidv7(),
          orgId: org.id,
          email: member.email,
          role: 'ADMIN',
          token: `token-${uuidv7()}`,
          invitedBy: inviter.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: '/invites/accept',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: invite.token }),
      }, member);

      assert.strictEqual(response.statusCode, 409);

      const membership = await ctx.prisma.userOrganization.findUnique({
        where: { userId_orgId: { userId: member.id, orgId: org.id } },
      });
      assert.strictEqual(membership.role, 'USER');

      const storedInvite = await ctx.prisma.orgInvite.findUnique({ where: { id: invite.id } });
      assert.strictEqual(storedInvite.status, 'PENDING');
    });
  });
});
