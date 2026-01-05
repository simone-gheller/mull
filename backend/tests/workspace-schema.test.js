import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach, afterEach, describe, it, expect } from '@jest/globals';

const prisma = new PrismaClient();

describe('Workspace Schema Tests', () => {
  let testUser;
  let testWorkspace;

  beforeAll(async () => {
    // Clean up any existing test data
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        email: 'test@example.com',
        passwordHash: 'hashedpassword',
        displayName: 'Test User',
        authProvider: 'PASSWORD'
      }
    });
  });

  afterEach(async () => {
    // Clean up after each test
    await prisma.workspaceInvite.deleteMany({});
    await prisma.workspaceMember.deleteMany({});
    await prisma.workspace.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('User Model', () => {
    it('should create user with new fields', async () => {
      const user = await prisma.user.create({
        data: {
          email: 'newuser@example.com',
          passwordHash: 'hash123',
          displayName: 'New User',
          authProvider: 'GOOGLE',
          googleId: 'google123'
        }
      });

      expect(user.email).toBe('newuser@example.com');
      expect(user.displayName).toBe('New User');
      expect(user.authProvider).toBe('GOOGLE');
      expect(user.googleId).toBe('google123');
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });
  });

  describe('Workspace Model', () => {
    it('should create workspace with all fields', async () => {
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Test Workspace',
          slug: 'test-workspace',
          type: 'TEAM',
          plan: 'ENTERPRISE',
          allowedDomains: ['example.com', 'test.com'],
          createdBy: testUser.id
        }
      });

      expect(workspace.name).toBe('Test Workspace');
      expect(workspace.slug).toBe('test-workspace');
      expect(workspace.type).toBe('TEAM');
      expect(workspace.plan).toBe('ENTERPRISE');
      expect(workspace.allowedDomains).toEqual(['example.com', 'test.com']);
      expect(workspace.createdBy).toBe(testUser.id);
    });
  });

  describe('WorkspaceMember Model', () => {
    beforeEach(async () => {
      testWorkspace = await prisma.workspace.create({
        data: {
          name: 'Test Workspace',
          slug: 'test-workspace',
          type: 'TEAM',
          plan: 'FREE',
          allowedDomains: [],
          createdBy: testUser.id
        }
      });
    });

    it('should create workspace member', async () => {
      const member = await prisma.workspaceMember.create({
        data: {
          workspaceId: testWorkspace.id,
          userId: testUser.id,
          role: 'OWNER',
          joinedVia: 'CREATED'
        }
      });

      expect(member.workspaceId).toBe(testWorkspace.id);
      expect(member.userId).toBe(testUser.id);
      expect(member.role).toBe('OWNER');
      expect(member.joinedVia).toBe('CREATED');
    });

    it('should enforce unique workspace-user constraint', async () => {
      await prisma.workspaceMember.create({
        data: {
          workspaceId: testWorkspace.id,
          userId: testUser.id,
          role: 'OWNER'
        }
      });

      await expect(
        prisma.workspaceMember.create({
          data: {
            workspaceId: testWorkspace.id,
            userId: testUser.id,
            role: 'ADMIN'
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('WorkspaceInvite Model', () => {
    beforeEach(async () => {
      testWorkspace = await prisma.workspace.create({
        data: {
          name: 'Test Workspace',
          slug: 'test-workspace',
          type: 'TEAM',
          plan: 'FREE',
          allowedDomains: [],
          createdBy: testUser.id
        }
      });
    });

    it('should create workspace invite', async () => {
      const invite = await prisma.workspaceInvite.create({
        data: {
          workspaceId: testWorkspace.id,
          email: 'invited@example.com',
          code: 'inv_123456',
          role: 'MEMBER',
          maxUses: 1,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
          createdBy: testUser.id
        }
      });

      expect(invite.workspaceId).toBe(testWorkspace.id);
      expect(invite.email).toBe('invited@example.com');
      expect(invite.code).toBe('inv_123456');
      expect(invite.role).toBe('MEMBER');
      expect(invite.maxUses).toBe(1);
      expect(invite.uses).toBe(0);
    });

    it('should enforce unique invite code', async () => {
      await prisma.workspaceInvite.create({
        data: {
          workspaceId: testWorkspace.id,
          code: 'unique_code',
          role: 'MEMBER',
          createdBy: testUser.id
        }
      });

      await expect(
        prisma.workspaceInvite.create({
          data: {
            workspaceId: testWorkspace.id,
            code: 'unique_code',
            role: 'ADMIN',
            createdBy: testUser.id
          }
        })
      ).rejects.toThrow();
    });
  });

  describe('Relations', () => {
    it('should load workspace with members and invites', async () => {
      const workspace = await prisma.workspace.create({
        data: {
          name: 'Test Workspace',
          slug: 'test-workspace',
          type: 'TEAM',
          plan: 'FREE',
          allowedDomains: [],
          createdBy: testUser.id
        }
      });

      await prisma.workspaceMember.create({
        data: {
          workspaceId: workspace.id,
          userId: testUser.id,
          role: 'OWNER'
        }
      });

      await prisma.workspaceInvite.create({
        data: {
          workspaceId: workspace.id,
          code: 'test_invite',
          role: 'MEMBER',
          createdBy: testUser.id
        }
      });

      const workspaceWithRelations = await prisma.workspace.findUnique({
        where: { id: workspace.id },
        include: {
          members: {
            include: { user: true }
          },
          invites: true,
          creator: true
        }
      });

      expect(workspaceWithRelations.members).toHaveLength(1);
      expect(workspaceWithRelations.invites).toHaveLength(1);
      expect(workspaceWithRelations.creator.email).toBe(testUser.email);
    });
  });
});