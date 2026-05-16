import { requireConfig, activeToken } from './config.ts';
import { errorExit } from './errors.ts';
import { DEFAULT_API_URL } from '../constants.ts';

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
  // VEXTIS_TOKEN env var overrides config file — enables CI without ~/.vextis/config.json
  const envToken = process.env.VEXTIS_TOKEN;
  let token: string | null;
  let apiUrl: string;

  if (envToken) {
    token = envToken;
    apiUrl = DEFAULT_API_URL;
  } else {
    const cfg = requireConfig();
    token = activeToken(cfg);
    apiUrl = cfg.apiUrl;
  }

  if (!token) {
    errorExit('No token for active org.', 'run: vextis auth login');
  }

  let res: Response;
  try {
    res = await fetch(`${apiUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    errorExit(
      `Could not reach ${apiUrl}.`,
      'check your connection, then run: vextis doctor'
    );
  }

  if (res.status === 401) {
    errorExit('Session expired or revoked.', 'run: vextis auth login');
  }

  return res;
}
