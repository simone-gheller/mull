import { getTestContext } from './setup/testHelpers.js'

describe('Versions API', () => {
  let context

  beforeAll(async () => {
    context = await getTestContext()
  })

  beforeEach(async () => {
    await context.cleanup()
  })

  describe('Parameter Versions with Encryption', () => {
    test('should create encrypted parameter versions', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      
      // Setup authentication
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const versionData = {
        value: 'postgres://user:pass@localhost:5432/db',
        versionTag: 'v1.0'
      }

      const response = await context.api.createVersion(user.email, project.id, parameter.id, versionData)

      expect(response.statusCode).toBe(200)
      expect(response.body).toHaveProperty('id')
      expect(response.body.parameterId).toBe(parameter.id)
      expect(response.body.versionTag).toBe(versionData.versionTag)
      expect(response.body).toHaveProperty('kekVersion')
      expect(response.body).toHaveProperty('createdAt')
    })

    test('should retrieve and decrypt parameter versions', async () => {
      // Use fixtures to create encrypted version
      const { user, org, project, parameter, versions } = await context.fixtures.createProjectWithVersions(
        context.server.crypto
      )

      // Setup authentication
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const version = versions[0]
      
      // Get the version through API
      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameter.id}/versions/${version.id}`, user.email)
      
      expect(response.statusCode).toBe(200)
      expect(response.body.id).toBe(version.id)
      expect(response.body.parameterId).toBe(parameter.id)
      expect(response.body).toHaveProperty('value') // Decrypted value should be present
      expect(response.body.versionTag).toBe('v1')
    })

    test('should prevent creating versions for unauthorized parameters', async () => {
      // Create two separate organizations
      const { user: user1, org: org1 } = await context.fixtures.createUserWithOrg('ADMIN')
      const { user: user2, org: org2, project: project2, parameter: param2 } = await context.fixtures.createCompleteProject()

      // User1 tries to create version for user2's parameter
      await context.auth.registerUser(user1.email, 'testpass123', org1.name)

      const versionData = {
        value: 'unauthorized-secret',
        versionTag: 'v1.0'
      }

      const response = await context.api.createVersion(user1.email, project2.id, param2.id, versionData, 403)
      expect(response.statusCode).toBe(403)
    })

    test('should prevent duplicate version tags for same parameter', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const versionData = {
        value: 'secret-value-v1',
        versionTag: 'v1.0'
      }

      // Create first version
      const response1 = await context.api.createVersion(user.email, project.id, parameter.id, versionData)
      expect(response1.statusCode).toBe(200)

      // Try to create duplicate version tag
      const duplicateVersionData = {
        ...versionData,
        value: 'different-secret-v1'
      }

      const response2 = await context.api.createVersion(user.email, project.id, parameter.id, duplicateVersionData, 409)
      expect(response2.statusCode).toBe(409)
    })

    test('should maintain encryption integrity across operations', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const originalValue = 'super-secret-database-url'
      const versionData = {
        value: originalValue,
        versionTag: 'v1.0'
      }

      // Create encrypted version
      const createResponse = await context.api.createVersion(user.email, project.id, parameter.id, versionData)
      expect(createResponse.statusCode).toBe(200)
      const versionId = createResponse.body.id

      // Retrieve and verify decryption
      const getResponse = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameter.id}/versions/${versionId}`, user.email)
      expect(getResponse.statusCode).toBe(200)
      expect(getResponse.body.value).toBe(originalValue)
      expect(getResponse.body.versionTag).toBe('v1.0')
    })
  })

  describe('Version Authorization and Cross-Organizational Security', () => {
    test('should prevent retrieving versions from parameters of another organization', async () => {
      // Create two separate organizations with their own projects and versions
      const { user: user1, org: org1, project: project1, parameter: param1, versions: versions1 } = 
        await context.fixtures.createProjectWithVersions(context.server.crypto)
      
      const { user: user2, org: org2 } = await context.fixtures.createUserWithOrg('ADMIN')

      // Setup authentication for both users
      await context.auth.registerUser(user1.email, 'testpass123', org1.name)
      await context.auth.registerUser(user2.email, 'testpass123', org2.name)

      // User2 tries to retrieve user1's version
      const version1 = versions1[0]
      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project1.id}/parameters/${param1.id}/versions/${version1.id}`, user2.email)
      
      expect(response.statusCode).toBe(403)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Not authorized')
    })

    test('should prevent retrieving non-existent versions', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('ADMIN')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const { project, parameter } = await context.fixtures.createCompleteProject()
      const response = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameter.id}/versions/non-existent-id`, user.email)
      
      expect(response.statusCode).toBe(403)
    })

    test('should allow organization members to access versions regardless of role', async () => {
      // Create organization with owner and a version
      const { user: owner, org, project, parameter } = await context.fixtures.createCompleteProject()
      await context.auth.registerUser(owner.email, 'testpass123', org.name)

      // Create a version as owner
      const versionData = {
        value: 'shared-secret',
        versionTag: 'v1.0'
      }
      const createResponse = await context.api.createVersion(owner.email, project.id, parameter.id, versionData)
      expect(createResponse.statusCode).toBe(200)
      const versionId = createResponse.body.id

      // Create a regular member in the same organization
      const member = await context.fixtures.createUser()
      await context.fixtures.createMembership(member.id, org.id, 'MEMBER')
      await context.auth.registerUser(member.email, 'testpass123', org.name)

      // Member should be able to access the version
      const getResponse = await context.auth.authenticatedRequest('get', `/api/projects/${project.id}/parameters/${parameter.id}/versions/${versionId}`, member.email)
      
      expect(getResponse.statusCode).toBe(200)
      expect(getResponse.body.value).toBe('shared-secret')
      expect(getResponse.body.versionTag).toBe('v1.0')
    })

    test('should prevent creating versions with missing required fields', async () => {
      const { user, org, project, parameter } = await context.fixtures.createCompleteProject()
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      // Test missing project/parameter context - simulate invalid URL
      const response1 = await context.auth.authenticatedRequest('post', `/api/projects/invalid-project/parameters/invalid-param/versions`, user.email)
        .send({
          value: 'test-value',
          versionTag: 'v1.0'
        })
      expect(response1.statusCode).toBe(403)

      // Test missing versionTag
      const response2 = await context.api.createVersion(user.email, project.id, parameter.id, {
        value: 'test-value'
      }, 400)
      expect(response2.statusCode).toBe(400)
      expect(response2.body.error).toContain('versionTag')

      // Test missing value
      const response3 = await context.api.createVersion(user.email, project.id, parameter.id, {
        versionTag: 'v1.0'
      }, 400)
      expect(response3.statusCode).toBe(400)
      expect(response3.body.error).toContain('value')
    })

    test('should prevent creating versions for non-existent parameters', async () => {
      const { user, org } = await context.fixtures.createUserWithOrg('ADMIN')
      await context.auth.registerUser(user.email, 'testpass123', org.name)

      const { project } = await context.fixtures.createCompleteProject()
      const versionData = {
        value: 'test-value',
        versionTag: 'v1.0'
      }

      const response = await context.api.createVersion(user.email, project.id, 'non-existent-parameter-id', versionData, 403)
      expect(response.statusCode).toBe(403)
      expect(response.body).toHaveProperty('error')
      expect(response.body.error).toContain('Parameter not found')
    })

    test('should prevent unauthorized users from creating versions without authentication', async () => {
      const { parameter } = await context.fixtures.createCompleteProject()

      const { project } = await context.fixtures.createCompleteProject()
      const versionData = {
        value: 'unauthorized-value',
        versionTag: 'v1.0'
      }

      // Try to create version without authentication token
      const response = await context.auth.server.inject({
        method: 'POST',
        url: `/api/projects/${project.id}/parameters/${parameter.id}/versions`,
        payload: versionData
      })

      expect(response.statusCode).toBe(401)
    })

    test('should handle cross-organizational parameter access correctly', async () => {
      // Create two organizations
      const { user: user1, org: org1, project: project1, parameter: param1 } = await context.fixtures.createCompleteProject()
      const { user: user2, org: org2, project: project2, parameter: param2 } = await context.fixtures.createCompleteProject()

      await context.auth.registerUser(user1.email, 'testpass123', org1.name)
      await context.auth.registerUser(user2.email, 'testpass123', org2.name)

      // User1 creates version for their own parameter (should succeed)
      const validVersionData = {
        value: 'user1-secret',
        versionTag: 'v1.0'
      }
      const validResponse = await context.api.createVersion(user1.email, project1.id, param1.id, validVersionData)
      expect(validResponse.statusCode).toBe(200)

      // User1 tries to create version for user2's parameter (should fail)
      const invalidVersionData = {
        value: 'unauthorized-secret',
        versionTag: 'v1.0'
      }
      const invalidResponse = await context.api.createVersion(user1.email, project2.id, param2.id, invalidVersionData, 403)
      expect(invalidResponse.statusCode).toBe(403)
      expect(invalidResponse.body.error).toContain('Not authorized')
    })

    test('should maintain version isolation between organizations', async () => {
      // Create identical setups in two different organizations
      const setup1 = await context.fixtures.createProjectWithVersions(context.server.crypto, {
        orgName: 'Org1',
        projectName: 'SharedProject', 
        parameterName: 'SharedParam'
      })
      
      const setup2 = await context.fixtures.createProjectWithVersions(context.server.crypto, {
        orgName: 'Org2', 
        projectName: 'SharedProject',
        parameterName: 'SharedParam'
      })

      // Setup authentication
      await context.auth.registerUser(setup1.user.email, 'testpass123', setup1.org.name)
      await context.auth.registerUser(setup2.user.email, 'testpass123', setup2.org.name)

      // Each user should only see their own versions
      const response1 = await context.auth.authenticatedRequest('get', `/api/projects/${setup1.project.id}/parameters/${setup1.parameter.id}/versions/${setup1.versions[0].id}`, setup1.user.email)
      expect(response1.statusCode).toBe(200)

      const response2 = await context.auth.authenticatedRequest('get', `/api/projects/${setup2.project.id}/parameters/${setup2.parameter.id}/versions/${setup2.versions[0].id}`, setup2.user.email)
      expect(response2.statusCode).toBe(200)

      // Cross-access should be denied
      const crossResponse1 = await context.auth.authenticatedRequest('get', `/api/projects/${setup2.project.id}/parameters/${setup2.parameter.id}/versions/${setup2.versions[0].id}`, setup1.user.email)
      expect(crossResponse1.statusCode).toBe(403)

      const crossResponse2 = await context.auth.authenticatedRequest('get', `/api/projects/${setup1.project.id}/parameters/${setup1.parameter.id}/versions/${setup1.versions[0].id}`, setup2.user.email)
      expect(crossResponse2.statusCode).toBe(403)
    })
  })
})