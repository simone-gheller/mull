import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

class ApiService {
  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true, // Enable cookies
    });

    // Response interceptor to handle token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const original = error.config;

        // Don't retry if this is already a retry, or if it's a refresh/login/register endpoint call
        if (error.response?.status === 401 && !original._retry && 
            !original.url?.includes('/auth/refresh') && 
            !original.url?.includes('/auth/login') && 
            !original.url?.includes('/auth/register')) {
          original._retry = true;
          console.log('API: Got 401, attempting token refresh for:', original.url);

          try {
            // Make a direct axios request to refresh tokens via cookies
            console.log('API: Calling refresh endpoint...');
            await axios.post(`${API_BASE_URL}/auth/refresh`, {}, {
              withCredentials: true,
              headers: {
                'Content-Type': 'application/json',
              }
            });

            console.log('API: Token refresh successful, retrying original request');
            // Retry the original request with cookies
            return this.client(original);
          } catch (refreshError) {
            // Refresh failed, clear auth state and redirect to login
            console.log('API: Token refresh failed, redirecting to login', refreshError.response?.status);
            
            // Dispatch logout event to clear auth state
            window.dispatchEvent(new CustomEvent('auth:logout'));
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth methods

  async login(credentials) {
    const response = await this.client.post('/auth/login', credentials);
    return response.data;
  }

  async register(userData) {
    const response = await this.client.post('/auth/register', userData);
    return response.data;
  }

  async refreshToken(refreshToken) {
    const response = await this.client.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async logout() {
    await this.client.post('/auth/logout');
    // Cookies are cleared by the server
  }

  async getSessions() {
    const response = await this.client.get('/auth/sessions');
    return response.data;
  }

  // Projects methods
  async getProjects() {
    const response = await this.client.get('/api/projects');
    return response.data;
  }

  async getProject(projectId) {
    const response = await this.client.get(`/api/projects/${projectId}`);
    return response.data;
  }

  async createProject(projectData) {
    const response = await this.client.post('/api/projects', projectData);
    return response.data;
  }

  async updateProject(projectId, projectData) {
    const response = await this.client.put(`/api/projects/${projectId}`, projectData);
    return response.data;
  }

  async deleteProject(projectId) {
    await this.client.delete(`/api/projects/${projectId}`);
  }

  // Parameters methods
  async getParameters(projectId, includeInherited = true) {
    const response = await this.client.get(
      `/api/projects/${projectId}/parameters?includeInherited=${includeInherited}`
    );
    return response.data;
  }

  async getParameter(projectId, parameterId) {
    const response = await this.client.get(
      `/api/projects/${projectId}/parameters/${parameterId}`
    );
    return response.data;
  }

  async createParameter(projectId, parameterData) {
    const response = await this.client.post(
      `/api/projects/${projectId}/parameters`,
      parameterData
    );
    return response.data;
  }

  async updateParameter(projectId, parameterId, parameterData) {
    const response = await this.client.put(
      `/api/projects/${projectId}/parameters/${parameterId}`,
      parameterData
    );
    return response.data;
  }

  async deleteParameter(projectId, parameterId) {
    await this.client.delete(`/api/projects/${projectId}/parameters/${parameterId}`);
  }

  async getResolvedParameter(projectId, parameterName, versionTag) {
    const response = await this.client.get(
      `/api/projects/${projectId}/parameters/${parameterName}/resolved${
        versionTag ? `?versionTag=${versionTag}` : ''
      }`
    );
    return response.data;
  }

  // Versions methods
  async getVersions(projectId, parameterId) {
    const response = await this.client.get(
      `/api/projects/${projectId}/parameters/${parameterId}/versions`
    );
    return response.data;
  }

  async getVersion(projectId, parameterId, versionId) {
    const response = await this.client.get(
      `/api/projects/${projectId}/parameters/${parameterId}/versions/${versionId}`
    );
    return response.data;
  }

  async createVersion(projectId, parameterId, versionData) {
    const response = await this.client.post(
      `/api/projects/${projectId}/parameters/${parameterId}/versions`,
      versionData
    );
    return response.data;
  }

  async updateVersion(projectId, parameterId, versionId, versionData) {
    const response = await this.client.put(
      `/api/projects/${projectId}/parameters/${parameterId}/versions/${versionId}`,
      versionData
    );
    return response.data;
  }

  async deleteVersion(projectId, parameterId, versionId) {
    await this.client.delete(
      `/api/projects/${projectId}/parameters/${parameterId}/versions/${versionId}`
    );
  }

  // Users methods
  async getUsers() {
    const response = await this.client.get('/api/users');
    return response.data;
  }

  async getUser(userId) {
    const response = await this.client.get(`/api/users/${userId}`);
    return response.data;
  }

  async createUser(userData) {
    const response = await this.client.post('/api/users', userData);
    return response.data;
  }
}

export default new ApiService();