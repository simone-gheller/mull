/**
 * Mock implementation of Google OAuth service for testing
 */

// Create mock functions manually to avoid Jest compatibility issues
const createMockFunction = () => {
  const mockFn = (...args) => mockFn._mockImplementation(...args)
  mockFn._mockImplementation = () => {}
  mockFn._mockReturnValue = undefined
  mockFn._calls = []
  
  mockFn.mockImplementation = (impl) => {
    mockFn._mockImplementation = impl
    return mockFn
  }
  
  mockFn.mockReturnValue = (value) => {
    mockFn._mockReturnValue = value
    mockFn._mockImplementation = () => value
    return mockFn
  }
  
  mockFn.mockResolvedValue = (value) => {
    mockFn._mockImplementation = async () => value
    return mockFn
  }
  
  mockFn.mockRejectedValue = (error) => {
    mockFn._mockImplementation = async () => { throw error }
    return mockFn
  }
  
  mockFn.mockReset = () => {
    mockFn._calls = []
    mockFn._mockImplementation = () => {}
    return mockFn
  }
  
  mockFn.toHaveBeenCalled = () => mockFn._calls.length > 0
  mockFn.toHaveBeenCalledWith = (...args) => {
    return mockFn._calls.some(call => 
      call.length === args.length && 
      call.every((arg, i) => arg === args[i])
    )
  }
  
  // Override the function to track calls
  const originalImpl = mockFn._mockImplementation
  mockFn._mockImplementation = (...args) => {
    mockFn._calls.push(args)
    return originalImpl(...args)
  }
  
  return mockFn
}

export const mockGoogleOAuth = {
  // Mock for getAuthUrl method
  getAuthUrl: createMockFunction(),
  
  // Mock for getProfile method
  getProfile: createMockFunction(),
  
  // Mock for validateConfig method
  validateConfig: createMockFunction(),
  
  // Mock for generateState method (used internally)
  generateState: createMockFunction(),
  
  // Mock for parseState method (used internally)
  parseState: createMockFunction(),
  
  // Helper to reset all mocks
  resetAllMocks() {
    this.getAuthUrl.mockReset()
    this.getProfile.mockReset()
    this.validateConfig.mockReset()
    this.generateState.mockReset()
    this.parseState.mockReset()
  }
}

// Set up default mock implementations
mockGoogleOAuth.getAuthUrl.mockImplementation((action, invitationToken) => {
  return `https://accounts.google.com/oauth/authorize?action=${action}&token=${invitationToken || 'none'}`
})

mockGoogleOAuth.validateConfig.mockImplementation(() => {
  // Default to successful validation
  return true
})

mockGoogleOAuth.generateState.mockImplementation((action, invitationToken) => {
  const stateData = {
    action,
    nonce: 'mock_nonce',
    timestamp: Date.now(),
    ...(invitationToken && { invitationToken })
  }
  return Buffer.from(JSON.stringify(stateData)).toString('base64')
})

mockGoogleOAuth.parseState.mockImplementation((state) => {
  try {
    return JSON.parse(Buffer.from(state, 'base64').toString())
  } catch (error) {
    throw new Error('Invalid state parameter')
  }
})

// Default export for ES module compatibility
export default mockGoogleOAuth