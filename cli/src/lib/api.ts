import { requireConfig, activeToken } from './config.ts';

export async function apiGet(path: string): Promise<Response> {
  return apiCall('GET', path);
}

export async function apiPost(path: string, body?: unknown): Promise<Response> {
  return apiCall('POST', path, body);
}

export async function apiPut(path: string, body?: unknown): Promise<Response> {
  return apiCall('PUT', path, body);
}

export async function apiDelete(path: string): Promise<Response> {
  return apiCall('DELETE', path);
}

async function apiCall(method: string, path: string, body?: unknown): Promise<Response> {
  const cfg = requireConfig();
  const token = activeToken(cfg);
  if (!token) {
    console.error('No token for active org. Run: mull auth login');
    process.exit(1);
  }

  const res = await fetch(`${cfg.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 401) {
    console.error('Session expired or revoked. Run: mull auth login');
    process.exit(1);
  }

  return res;
}
