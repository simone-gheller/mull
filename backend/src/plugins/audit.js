import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import { getAuditExpiresAt } from '../lib/planLimits.js';

const SENSITIVE_METADATA_KEYS = new Set([
  'value',
  'oldValue',
  'newValue',
  'token',
  'inviteToken',
  'authorization',
  'password',
  'secret'
]);

const UUID_V7_PATTERN = '[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}';
const ORG_PATH_PATTERN = new RegExp(`^/orgs/(${UUID_V7_PATTERN})(?:/|$)`, 'i');

function sanitizeMetadata(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {};
  return Object.fromEntries(
    Object.entries(input)
      .filter(([key, value]) => !SENSITIVE_METADATA_KEYS.has(key) && value !== undefined)
  );
}

function actorDisplay(user) {
  if (!user) return null;
  return user.displayName || user.email || user.id;
}

function requestActorDisplay(request, user) {
  if (request?.auth?.credentialType === 'ACCESS_KEY') {
    return request.auth.identityName || request.auth.credentialPrefix || request.auth.identityId;
  }
  return actorDisplay(user);
}

function pathFromUrl(url) {
  try {
    return new URL(url, 'http://safeconfig.local').pathname;
  } catch {
    return url;
  }
}

function isUserOrgMember(user, orgId) {
  return Boolean(user?.organizations?.some(org => org.id === orgId));
}

export function resolveHttpFailureOrgId(request) {
  const paramsOrgId = request.params?.orgId;
  if (paramsOrgId) return paramsOrgId;

  const pathOrgId = pathFromUrl(request.url).match(ORG_PATH_PATTERN)?.[1];
  if (pathOrgId && (request.auth?.orgId === pathOrgId || isUserOrgMember(request.user, pathOrgId))) {
    return pathOrgId;
  }

  const bodyOrgId = request.body && typeof request.body === 'object' && !Array.isArray(request.body)
    ? request.body.orgId
    : null;
  if (bodyOrgId && (request.auth?.orgId === bodyOrgId || isUserOrgMember(request.user, bodyOrgId))) {
    return bodyOrgId;
  }

  if (request.auth?.identityType === 'SERVICE' && request.auth.orgId) {
    return request.auth.orgId;
  }

  return null;
}

export function httpFailureTarget(request) {
  const route = request.routeOptions?.url || request.routerPath || pathFromUrl(request.url);
  return {
    route,
    path: pathFromUrl(request.url),
    label: `${request.method} ${route}`
  };
}

async function loadOrgPlan(client, orgId) {
  const org = await client.organization.findUnique({
    where: { id: orgId },
    select: { plan: true }
  });
  return org?.plan ?? 'STARTER';
}

async function auditPlugin(fastify) {
  async function log(event, options = {}) {
    const client = options.tx ?? fastify.prisma;
    const request = event.request;
    const user = event.actorUser ?? request?.user ?? null;
    const orgId = event.orgId ?? request?.params?.orgId;
    if (!orgId) return null;
    if (request && event.outcome && event.outcome !== 'SUCCESS') {
      request.auditFailureLogged = true;
    }

    const plan = event.orgPlan ?? await loadOrgPlan(client, orgId);

    return client.auditEvent.create({
      data: {
        id: uuidv7(),
        orgId,
        actorUserId: event.actorUserId ?? user?.id ?? null,
        actorType: event.actorType ?? (request?.auth?.credentialType === 'ACCESS_KEY' ? 'API_TOKEN' : (user ? 'USER' : 'ANONYMOUS')),
        actorDisplay: event.actorDisplay ?? requestActorDisplay(request, user),
        action: event.action,
        resourceType: event.resourceType,
        resourceId: event.resourceId ?? null,
        resourceLabel: event.resourceLabel ?? null,
        outcome: event.outcome ?? 'SUCCESS',
        requestId: event.requestId ?? request?.id ?? null,
        ip: event.ip ?? request?.ip ?? null,
        userAgent: event.userAgent ?? request?.headers?.['user-agent'] ?? null,
        metadata: sanitizeMetadata({
          ...(request?.auth?.credentialType === 'ACCESS_KEY' ? {
            credentialId: request.auth.credentialId,
            credentialPrefix: request.auth.credentialPrefix,
            identityId: request.auth.identityId,
            identityName: request.auth.identityName,
            delegatedUserId: request.auth.delegatedUserId
          } : {}),
          ...event.metadata
        }),
        expiresAt: getAuditExpiresAt(plan)
      }
    });
  }

  async function pruneExpired(now = new Date()) {
    return fastify.prisma.auditEvent.deleteMany({
      where: { expiresAt: { not: null, lt: now } }
    });
  }

  function hashSensitiveValue(value) {
    if (value == null) return null;
    const rawKey = process.env.AUDIT_HASH_KEY_HEX || process.env.MASTER_KEY_HEX;
    if (!rawKey) return null;
    const key = Buffer.from(rawKey, 'hex');
    return crypto.createHmac('sha256', key).update(String(value), 'utf8').digest('hex');
  }

  fastify.decorate('audit', { log, pruneExpired, hashSensitiveValue });

  fastify.addHook('onResponse', async (request, reply) => {
    if (!request.user || request.auditFailureLogged) return;
    if (['GET', 'HEAD', 'OPTIONS'].includes(request.method)) return;
    if (reply.statusCode < 400) return;

    const orgId = resolveHttpFailureOrgId(request);
    if (!orgId) return;
    const target = httpFailureTarget(request);

    await log({
      request,
      orgId,
      action: reply.statusCode === 401 || reply.statusCode === 403 ? 'http.request_denied' : 'http.request_failed',
      resourceType: 'http_request',
      resourceId: target.route,
      resourceLabel: target.label,
      outcome: reply.statusCode === 401 || reply.statusCode === 403 ? 'DENIED' : 'FAILURE',
      metadata: {
        method: request.method,
        route: target.route,
        path: target.path,
        statusCode: reply.statusCode
      }
    });
  });
}

export default fp(auditPlugin, { name: 'audit' });
