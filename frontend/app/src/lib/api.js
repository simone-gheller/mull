import axios from 'axios';

let _token = null;
let _backendDown = false;
const _backendStatusListeners = new Set();

export const setToken = (token) => {
  _token = token;
};

const notifyBackendStatus = (isDown) => {
  if (_backendDown === isDown) return;
  _backendDown = isDown;
  _backendStatusListeners.forEach(listener => listener(isDown));
};

export const onBackendStatusChange = (listener) => {
  _backendStatusListeners.add(listener);
  return () => _backendStatusListeners.delete(listener);
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  if (_token) {
    config.headers.Authorization = `Bearer ${_token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => {
    notifyBackendStatus(false);
    return response;
  },
  (error) => {
    notifyBackendStatus(!error.response);
    return Promise.reject(error);
  }
);

export default apiClient;
