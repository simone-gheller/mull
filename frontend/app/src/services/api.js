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

  async discoverLogin(email) {
    const response = await apiClient.post('/auth/login-discovery', { email });
    return response.data;
  }

  async getPersonalAccessKeys() {
    const response = await apiClient.get('/auth/access-keys');
    return response.data;
  }

  async createPersonalAccessKey(data) {
    const response = await apiClient.post('/auth/access-keys', data);
    return response.data;
  }

  async revokePersonalAccessKey(keyId) {
    await apiClient.delete(`/auth/access-keys/${keyId}`);
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

  async getOrgSsoSettings() {
    const response = await apiClient.get(`/orgs/${this.orgId}/sso`);
    return response.data;
  }

  async updateOrgSsoSettings(data) {
    const response = await apiClient.patch(`/orgs/${this.orgId}/sso`, data);
    return response.data;
  }

  async getAuditEvents(params = {}) {
    const search = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') search.set(key, value);
    });
    const suffix = search.toString() ? `?${search.toString()}` : '';
    const response = await apiClient.get(`/orgs/${this.orgId}/audit-events${suffix}`);
    return response.data;
  }

  async getOrgAccessKeys() {
    const response = await apiClient.get(`/orgs/${this.orgId}/access-keys`);
    return response.data;
  }

  async createOrgAccessKey(data) {
    const response = await apiClient.post(`/orgs/${this.orgId}/access-keys`, data);
    return response.data;
  }

  async revokeOrgAccessKey(keyId) {
    await apiClient.delete(`/orgs/${this.orgId}/access-keys/${keyId}`);
  }

  async getBilling() {
    const response = await apiClient.get(`/orgs/${this.orgId}/billing`);
    return response.data;
  }

  async createBillingCheckout(data) {
    const response = await apiClient.post(`/orgs/${this.orgId}/billing/checkout`, data);
    return response.data;
  }

  async createBillingPortalSession() {
    const response = await apiClient.post(`/orgs/${this.orgId}/billing/portal`);
    return response.data;
  }

  // Members
  async getMembers() {
    const response = await apiClient.get(`/orgs/${this.orgId}/members`);
    return response.data;
  }

  async updateMemberRole(userId, roleId) {
    const response = await apiClient.patch(`/orgs/${this.orgId}/members/${userId}`, { roleId });
    return response.data;
  }

  async removeMember(userId) {
    await apiClient.delete(`/orgs/${this.orgId}/members/${userId}`);
  }

  async getRoles() {
    const response = await apiClient.get(`/orgs/${this.orgId}/roles`);
    return response.data;
  }

  async createRole(data) {
    const response = await apiClient.post(`/orgs/${this.orgId}/roles`, data);
    return response.data;
  }

  async updateRole(roleId, data) {
    const response = await apiClient.patch(`/orgs/${this.orgId}/roles/${roleId}`, data);
    return response.data;
  }

  async deleteRole(roleId) {
    await apiClient.delete(`/orgs/${this.orgId}/roles/${roleId}`);
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
    await apiClient.post(`/orgs/${this.orgId}/exports/parameters`, { appId });
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

  async updateEnvironment(envId, envData) {
    const response = await apiClient.patch(`/orgs/${this.orgId}/environments/${envId}`, envData);
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

  async getResolvedParameters(appId, environmentId) {
    const params = new URLSearchParams({ appId });
    if (environmentId) params.set('environmentId', environmentId);
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters/resolved?${params.toString()}`);
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

  async getParameterValueHistory(valueId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters/values/${valueId}/history`);
    return response.data;
  }

  async revealParameterValueVersion(valueId, versionId) {
    const response = await apiClient.get(`/orgs/${this.orgId}/parameters/values/${valueId}/history/${versionId}`);
    return response.data;
  }

  async rollbackParameterValue(valueId, versionId) {
    const response = await apiClient.post(`/orgs/${this.orgId}/parameters/values/${valueId}/rollback`, { versionId });
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

  // Invites
  async getInvites() {
    const response = await apiClient.get(`/orgs/${this.orgId}/invites`);
    return response.data;
  }

  async sendInvite({ email, roleId }) {
    const response = await apiClient.post(`/orgs/${this.orgId}/invites`, { email, roleId });
    return response.data;
  }

  async revokeInvite(id) {
    await apiClient.delete(`/orgs/${this.orgId}/invites/${id}`);
  }

  async getInviteByToken(token) {
    const response = await apiClient.get(`/invites/${token}`);
    return response.data;
  }

  async acceptInvite(token) {
    const response = await apiClient.post('/invites/accept', { token });
    return response.data;
  }
}

export default new ApiService();
