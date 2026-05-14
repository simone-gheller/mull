import { uuidv7 } from 'uuidv7';

export async function findOrCreateUserIdentity(tx, { orgId, user }) {
  const existing = await tx.identity.findFirst({
    where: { orgId, type: 'USER', ownerUserId: user.id }
  });
  if (existing) return existing;
  return tx.identity.create({
    data: {
      id: uuidv7(),
      orgId,
      type: 'USER',
      name: user.displayName || user.email || user.id,
      ownerUserId: user.id
    }
  });
}
