import { getTestContext } from './setup/testHelpers.js'

describe('Parameters API', () => {
  let context

  beforeAll(async () => {
    context = await getTestContext()
  })

  beforeEach(async () => {
    await context.cleanup()
  })

  describe('Parameter Management', () => {
    test('should create parameters within a project', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      // Setup authentication
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const paramData = {
        name: 'DATABASE_URL'
      }

      const response = await context.api.createParameter(user.email, project.id, paramData)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('id')
      expect(response.body.name).toBe(paramData.name)
      expect(response.body.projectId).toBe(project.id)
    })

    test('should list parameters', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      
      // Setup authentication  
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.api.getParameters(user.email, project.id)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('parameters')
      expect(Array.isArray(response.body.parameters)).toBe(true)
      
      const foundParam = response.body.parameters.find(p => p.id === parameter.id)
      expect(foundParam).toBeDefined()
    })

    test('should return empty list for project with no parameters', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Create a new empty project
      const newProject = await context.api.createProject(user.email, {
        name: 'Empty Project',
        orgId: org.id
      })

      const response = await context.api.getParameters(user.email, newProject.body.id)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('parameters')
      expect(response.body.parameters).toHaveLength(0)
    })

    test('should prevent creating parameters in unauthorized projects', async () => {
      // Create two separate organizations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { user: user2, org: org2 } = await context.fixtures.createUserWithOrg('ADMIN')

      // User2 creates a project in org2
      const project = await context.fixtures.createProject(org2.id, user2.id)

      // User1 tries to create parameter in user2's project
      await context.auth.registerUser(user1.email, 'testpass123', org1.name)

      const paramData = {
        name: 'UNAUTHORIZED_PARAM'
      }

      const response = await context.api.createParameter(user1.email, project.id, paramData, 403)

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent duplicate parameter names within same project', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const paramData = {
        name: 'DATABASE_URL'
      }

      // Create first parameter
      const response1 = await context.api.createParameter(user.email, project.id, paramData)
      expect(response1.statusCode).toBe(200)

      // Try to create duplicate parameter
      const response2 = await context.api.createParameter(user.email, project.id, paramData, 409)
      expect(response2.statusCode).toBe(409)
    })
  })

  describe('Parameter Retrieval by ID', () => {
    test('should get parameter by ID for authorized user', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameter.id}`, user.email)

      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(parameter.id)
      expect(response.body.name).toBe(parameter.name)
      expect(response.body.projectId).toBe(project.id)
      expect(response.body).toHaveProperty('versions')
      expect(response.body).toHaveProperty('project')
    })

    test('should prevent access to parameters from other organizations', async () => {
      // Create two separate organizations with parameters
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { user: user2, org: org2, project: project2, parameter: param2 } = await context.fixtures.createCompleteProject()

      // User1 tries to access user2's parameter
      await context.auth.registerUser(user1.email, 'testpass123', org1.name)

      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project2.id}/parameters/${param2.id}`, user1.email)

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should return 404 for non-existent parameter', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const fakeParameterId = 'non-existent-param-id'
      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${fakeParameterId}`, user.email)

      expect(response.statusCode).toBe(404)
      expect(response.body.error).toContain('Parameter not found')
    })

    test('should include parameter versions in response', async () => {
      const { user, org, project, parameter, versions } = await context.fixtures.createProjectWithVersions(
        context.server.crypto
      )
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameter.id}`, user.email)

      expect(response.statusCode).toBe(200)
      expect(response.body.versions).toBeDefined()
      expect(Array.isArray(response.body.versions)).toBe(true)
      expect(response.body.versions.length).toBeGreaterThan(0)
    })
  })

  describe('Parameter Lifecycle', () => {
    test('should allow updating parameter name within same project', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const updateData = { name: 'UPDATED_PARAM_NAME' }
      const response = await context.api.updateParameter(user.email, project.id, parameter.id, updateData)

      expect(response.statusCode).toBe(200)
      expect(response.body.name).toBe('UPDATED_PARAM_NAME')
      expect(response.body.id).toBe(parameter.id)
      expect(response.body.projectId).toBe(project.id)
    })

    test('should prevent updating parameter from other organizations', async () => {
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { project: project2, parameter: param2 } = await context.fixtures.createCompleteProject()

      await context.auth.registerUser(user1.email, 'testpass123', org1.name)

      const updateData = { name: 'HACKED_PARAM' }
      const response = await context.api.updateParameter(user1.email, project2.id, param2.id, updateData, 403)

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent duplicate parameter names when updating', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Create two parameters in the same project
      const param1Data = { name: 'PARAM_ONE' }
      const param2Data = { name: 'PARAM_TWO' }
      
      const param1Response = await context.api.createParameter(user.email, project.id, param1Data)
      const param2Response = await context.api.createParameter(user.email, project.id, param2Data)

      // Try to update param2 to have the same name as param1
      const updateData = { name: 'PARAM_ONE' }
      const response = await context.api.updateParameter(user.email, project.id, param2Response.body.id, updateData, 409)

      expect(response.statusCode).toBe(409)
      expect(response.body.error).toContain('Parameter with this name already exists')
    })

    test('should allow deleting parameter without versions', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Create a parameter without versions
      const paramData = { name: 'DELETABLE_PARAM' }
      const createResponse = await context.api.createParameter(user.email, project.id, paramData)
      const parameterId = createResponse.body.id

      // Delete the parameter
      const deleteResponse = await context.api.deleteParameter(user.email, project.id, parameterId)
      expect(deleteResponse.statusCode).toBe(204)

      // Verify parameter is deleted
      const getResponse = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameterId}`, user.email)
      expect(getResponse.statusCode).toBe(404)
    })

    test('should prevent deleting parameters with active versions', async () => {
      const { user, org, project, parameter } = await context.fixtures.createProjectWithVersions(
        context.server.crypto
      )
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const response = await context.api.deleteParameter(user.email, project.id, parameter.id, 409)

      expect(response.statusCode).toBe(409)
      expect(response.body.error).toContain('Cannot delete parameter with existing versions')
    })

    test('should prevent deleting parameters from other organizations', async () => {
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { project: project2, parameter: param2 } = await context.fixtures.createCompleteProject()

      await context.auth.registerUser(user1.email, 'testpass123', org1.name)

      const response = await context.api.deleteParameter(user1.email, project2.id, param2.id, 403)

      expect(response.statusCode).toBe(403)
      expect(response.body.error).toContain('Not authorized')
    })

    test('should return 404 when updating non-existent parameter', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const fakeParameterId = 'non-existent-param-id'
      const updateData = { name: 'NEW_NAME' }
      const response = await context.api.updateParameter(user.email, project.id, fakeParameterId, updateData, 404)

      expect(response.statusCode).toBe(404)
      expect(response.body.error).toContain('Parameter not found')
    })

    test('should return 404 when deleting non-existent parameter', async () => {
      const { user, org, project } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const fakeParameterId = 'non-existent-param-id'
      const response = await context.api.deleteParameter(user.email, project.id, fakeParameterId, 404)

      expect(response.statusCode).toBe(404)
      expect(response.body.error).toContain('Parameter not found')
    })
  })
})