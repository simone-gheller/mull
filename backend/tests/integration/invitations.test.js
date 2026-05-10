import { test, describe, afterEach, beforeEach } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import { buildTestContext } from '../utils/builders.js';

function tokenHash(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

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
      const rawToken = `token-${uuidv7()}`;
      const invite = await ctx.prisma.orgInvite.create({
        data: {
          id: uuidv7(),
          orgId: org.id,
          email: member.email,
          role: 'ADMIN',
          tokenHash: tokenHash(rawToken),
          invitedBy: inviter.id,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const response = await ctx.injectAuth({
        method: 'POST',
        url: '/invites/accept',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token: rawToken }),
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
