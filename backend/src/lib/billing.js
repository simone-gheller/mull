import crypto from 'node:crypto';
import { billingConfig } from '../config.js';

export function billingProvider(config = {}) {
  return String(config.BILLING_PROVIDER || 'paddle').toUpperCase();
}

export function paddleApiBaseUrl(config = {}) {
  return config.PADDLE_ENV === 'production'
    ? 'https://api.paddle.com'
    : 'https://sandbox-api.paddle.com';
}

export function paddlePriceMap() {
  return {
    PADDLE_PRICE_TEAM_MONTHLY: { plan: 'TEAM', interval: 'month' },
    PADDLE_PRICE_TEAM_YEARLY: { plan: 'TEAM', interval: 'year' },
    PADDLE_PRICE_BUSINESS_MONTHLY: { plan: 'BUSINESS', interval: 'month' },
    PADDLE_PRICE_BUSINESS_YEARLY: { plan: 'BUSINESS', interval: 'year' }
  };
}

export function priceIdFor(config = {}, plan, interval = 'month') {
  const normalizedPlan = String(plan || '').toUpperCase();
  const normalizedInterval = interval === 'year' ? 'YEARLY' : 'MONTHLY';
  const envKey = `PADDLE_PRICE_${normalizedPlan}_${normalizedInterval}`;
  const priceId = config[envKey];
  if (!billingConfig.selfServePlans.includes(normalizedPlan) || !priceId) return null;
  return priceId;
}

export function planForPriceId(config = {}, priceId) {
  for (const [envKey, meta] of Object.entries(paddlePriceMap())) {
    if (config[envKey] && config[envKey] === priceId) {
      return meta.plan;
    }
  }
  return null;
}

export function normalizePaddleStatus(status) {
  const normalized = String(status || '').toUpperCase();
  return billingConfig.subscriptionStatuses.has(normalized) ? normalized : 'PAST_DUE';
}

export function planForSubscriptionStatus(config = {}, subscription) {
  const status = normalizePaddleStatus(subscription?.status);
  if (!billingConfig.activeStatuses.has(status)) return 'FREE';

  const priceId = subscription?.items?.[0]?.price?.id || subscription?.items?.[0]?.price_id;
  return planForPriceId(config, priceId) || subscription?.custom_data?.plan || 'FREE';
}

export function parsePaddleSignature(header) {
  const parts = String(header || '').split(';');
  const parsed = { signatures: [] };
  for (const part of parts) {
    const [key, value] = part.split('=');
    if (key === 'ts') parsed.timestamp = value;
    if (key === 'h1' && value) parsed.signatures.push(value);
  }
  return parsed;
}

export function verifyPaddleSignature({ rawBody, signatureHeader, secret, toleranceSeconds = 300 }) {
  if (!secret) throw new Error('Paddle webhook secret is not configured');
  const { timestamp, signatures } = parsePaddleSignature(signatureHeader);
  if (!timestamp || signatures.length === 0) return false;

  const eventTimeMs = Number(timestamp) * 1000;
  if (!Number.isFinite(eventTimeMs)) return false;
  if (Math.abs(Date.now() - eventTimeMs) > toleranceSeconds * 1000) return false;

  const signedPayload = `${timestamp}:${rawBody}`;
  const expected = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');

  return signatures.some(signature => {
    const signatureBuffer = Buffer.from(signature, 'hex');
    return signatureBuffer.length === expectedBuffer.length &&
      crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
  });
}

export async function paddleApi(config = {}, path, { method = 'GET', body } = {}) {
  if (!config.PADDLE_API_KEY) {
    const error = new Error('Paddle API key is not configured');
    error.statusCode = 503;
    throw error;
  }

  const response = await fetch(`${paddleApiBaseUrl(config)}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.PADDLE_API_KEY}`,
      'Content-Type': 'application/json'
    },
    ...(body ? { body: JSON.stringify(body) } : {})
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.detail || payload?.error?.message || 'Paddle API request failed');
    error.statusCode = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}
