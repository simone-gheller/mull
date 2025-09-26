import { getTestContext } from './setup/testHelpers.js'

describe('Projects API', () => {
  let context

  beforeAll(async () => {
    context = await getTestContext()
  })

  beforeEach(async () => {
    await context.cleanup()
  })

  describe('Project Creation', () => {
    test('should create a project with organization', async () => {
      // Create user with organization using fixtures
      const { user, org } = await context.fixtures.createUserWithOrg('OWNER')

      const projectData = {
        name: 'Test Project',
        orgId: org.id
      }

      // Register and login the user to get tokens
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.api.createProject(user.email, projectData)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe(projectData.name)
      expect(response.body.orgId).toBe(org.id)
      expect(response.body.createdBy).toBe(user.id)
      expect(response.body).toHaveProperty('createdAt')
    })

    test('should list projects for authenticated user', async () => {
      // Create a complete project setup
      const { user, org, project } = await context.fixtures.createCompleteProject()

      // Create session for the user
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.api.getProjects(user.email)

      expect(response.statusCode).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
      
      // Should find our created project
      const foundProject = response.body.find(p => p.id === project.id)
      expect(foundProject).toBeDefined()
      expect(foundProject.name).toBe(project.name)
    })

    test('should prevent unauthorized project creation', async () => {
      // Create two separate organizations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('OWNER')
      const { org: org2 } = await context.fixtures.createUserWithOrg('OWNER')

      // Register user1 (they belong to org1, not org2)
      await context.auth.registerUser(user1.email, 'testpass123', org1.name)

      const projectData = {
        name: 'Evil Project',
        orgId: org2.id  // Try to create project in different org!
      }

      // This should fail with 403 because user1 doesn't belong to org2
      const response = await context.api.createProject(user1.email, projectData, 403)

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized for this organization')
    })

    test('should prevent MEMBER from creating projects', async () => {
      // Create organization with MEMBER role
      const { user, org } = await context.fixtures.createUserWithOrg('MEMBER')

      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const projectData = {
        name: 'Member Project',
        orgId: org.id
      }

      // This should fail with 403 because MEMBER role can't create projects
      const response = await context.api.createProject(user.email, projectData, 403)

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Insufficient permissions')
    })
  })

  describe('Project Deletion', () => {
    test('should allow authorized user to delete project', async () => {
      // Create user with ADMIN role (can delete projects)
      const { user, org } = await context.fixtures.createUserWithOrg('ADMIN')

      const projectData = {
        name: 'Project to Delete',
        orgId: org.id
      }

      // Register and login the user
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Create a project
      const createResponse = await context.api.createProject(user.email, projectData)
      expect(createResponse.statusCode).toBe(200)
      const projectId = createResponse.body.id

      // Delete the project
      const deleteResponse = await context.api.deleteProject(user.email, projectId)
      expect(deleteResponse.statusCode).toBe(204)

      // Verify project is deleted - getting projects should not include the deleted one
      const listResponse = await context.api.getProjects(user.email)
      const foundProject = listResponse.body.find(p => p.id === projectId)
      expect(foundProject).toBeUndefined()
    })

    test('should prevent user from different org from deleting projects', async () => {
      // Create two separate organizations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('OWNER')
      const { user: user2, org: org2 } = await context.fixtures.createUserWithOrg('OWNER')

      // User1 creates a project in org1
      await context.auth.registerUser(user1.email, 'testpass123', org1.name)
      const projectData = {
        name: 'Org1 Project',
        orgId: org1.id
      }
      const createResponse = await context.api.createProject(user1.email, projectData)
      const projectId = createResponse.body.id

      // User2 tries to delete user1's project (should fail)
      await context.auth.registerUser(user2.email, 'testpass123', org2.name)
      const deleteResponse = await context.api.deleteProject(user2.email, projectId, 403)

      expect(deleteResponse.statusCode).toBe(403)
      expect(deleteResponse.body.error).toContain('Not authorized to access this project')
    })

    test('should prevent MEMBER role from deleting projects', async () => {
      // Create OWNER to create project and MEMBER to try deleting
      const { user: owner, org } = await context.fixtures.createUserWithOrg('OWNER')
      const member = await context.fixtures.createUserWithPassword(
        `member-${Date.now()}@example.com`, 
        'testpass123'
      )

      // Add member to the same organization
      await context.fixtures.createMembership(member.id, org.id, 'MEMBER')

      // Owner creates a project
      await context.auth.registerUser(owner.email, 'testpass123', org.name)
      const projectData = {
        name: 'Project to Delete',
        orgId: org.id
      }
      const createResponse = await context.api.createProject(owner.email, projectData)
      const projectId = createResponse.body.id

      // Member tries to delete project (should fail)
      await context.auth.registerUser(member.email, 'testpass123', org.name)
      const deleteResponse = await context.api.deleteProject(member.email, projectId, 403)

      expect(deleteResponse.statusCode).toBe(403)
      expect(deleteResponse.body.error).toContain('Insufficient permissions')
    })

    test('should prevent deleting non-existent project', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('OWNER')
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Try to delete a non-existent project
      const fakeProjectId = 'non-existent-project-id'
      const deleteResponse = await context.api.deleteProject(user.email, fakeProjectId, 403)

      expect(deleteResponse.statusCode).toBe(403)
      expect(deleteResponse.body.error).toContain('Project not found')
    })
  })

})