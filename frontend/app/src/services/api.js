import apiClient from '../lib/api';

class ApiService {
  orgId = null;

  setOrgId(id) {
    this.orgId = id;
  }

  // Profile
  async getMe() {
    const response = await apiClient.get('/auth/me');
    return response.data;
  }

  async updateProfile(data) {
    const response = await apiClient.patch('/auth/me', data);
    return response.data;
  }

  // Org
  async getOrg() {
    const response = await apiClient.get(`/orgs/${this.orgId}`);
    return response.data;
  }

  async updateOrg(data) {
    const response = await apiClient.patch(`/orgs/${this.orgId}`, data);
    return response.data;
  }

  // Members
  async getMembers() {
    const response = await apiClient.get(`/orgs/${this.orgId}/members`);
    return response.data;
  }

  // Apps (previously "projects")
  async getProjects() {
    const response = await apiClient.get(`/orgs/${this.orgId}/apps`);
    return response.data;
  }

  async getProject(appId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/apps/${appId}`);
    return response.data;
  }

  async createProject(appData) {
    const response = await apiClient.post(`/orgs/${this.orgId}/apps`, appData);
    return response.data;
  }

  async updateProject(appId, appData) {
    const response = await apiClient.patch(`/orgs/${this.orgId}/apps/${appId}`, appData);
    return response.data;
  }

  async deleteProject(appId) {
    await apiClient.delete(`/orgs/${this.orgId}/apps/${appId}`);
  }

  async exportProjectParameters(appId) {
    const [resolved, values] = await Promise.all([
      this.getResolvedParameters(appId),
      this.getParameterValues(appId),
    ]);
    return { parameters: resolved, values };
  }

  // Environments
  async getEnvironments() {
    const response = await apiClient.get(`/orgs/${this.orgId}/environments`);
    return response.data;
  }

  async createEnvironment(envData) {
    const response = await apiClient.post(`/orgs/${this.orgId}/environments`, envData);
    return response.data;
  }

  async deleteEnvironment(envId) {
    await apiClient.delete(`/orgs/${this.orgId}/environments/${envId}`);
  }

  // Parameters
  async getParameters(appId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters?appId=${appId}`);
    return response.data;
  }

  async getResolvedParameters(appId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters/resolved?appId=${appId}`);
    return response.data;
  }

  async createParameterOverride(key, appId, description) {
    const response = await apiClient.post(`/orgs/${this.orgId}/parameters/override`, { key, appId, ...(description ? { description } : {}) });
    return response.data;
  }

  async createParameter(paramData) {
    const response = await apiClient.post(`/orgs/${this.orgId}/parameters`, paramData);
    return response.data;
  }

  // Parameter values
  async getParameterValues(appId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters/${appId}/values`);
    return response.data;
  }

  async getParameterValue(valueId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters/values/${valueId}`);
    return response.data;
  }

  async updateParameterValue(valueId, valueData) {
    const response = await apiClient.put(
      `/orgs/${this.orgId}/parameters/values/${valueId}`,
      valueData
    );
    return response.data;
  }

  // Rendered config
  async getConfig(appId, envId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/config/${appId}/${envId}`);
    return response.data;
  }

  // Users
  async getUsers() {
    const response = await apiClient.get(`/orgs/${this.orgId}/users`);
    return response.data;
  }
}

export default new ApiService();
