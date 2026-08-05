/**
 * v1 SDK-facing config routes — no /orgs/:orgId prefix.
 * Org context is inferred from the access key (SERVICE token → identity.orgId,
 * PAT → ?org= query param or appId binding lookup).
 *
 * Routes:
 *   GET  /v1/config          — full snapshot or delta since sinceVersion
 *   GET  /v1/config/events   — SSE stream for realtime change hints
 *   PATCH /v1/config/:key    — update a single config value (dashboard / CLI / CI)
 */
import { uuidv7 } from 'uuidv7';
import { internalBus } from '../realtime/internalBus.js';
import { register, unregister, broadcast } from '../realtime/clientRegistry.js';
import {
  decryptParameterValue,
  encryptedParameterValueData,
} from '../crypto/envelope.js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const isUuid = (s) => UUID_RE.test(s);

const SSE_HEARTBEAT_INTERVAL_MS = 25_000;

// ---------------------------------------------------------------------------
// Helper: resolve org, app, environment from query params + auth context
// ---------------------------------------------------------------------------
async function resolveConfigTarget(fastify, request, reply, { project, env: envParam, org: orgParam }) {
  const { auth } = request;
  const prisma = fastify.prisma;

  // 1. Determine orgId
  let orgId;
  if (auth.identityType === 'SERVICE') {
    orgId = auth.orgId;
  } else if (orgParam) {
    // PAT with explicit ?org= — verify membership
    const membership = request.user?.organizations?.find(o => o.id === orgParam);
    if (!membership) {
      reply.code(403).send({ error: 'Forbidden', message: 'Not a member of this organization', statusCode: 403 });
      return null;
    }
    orgId = orgParam;
  } else if (auth.appId) {
    // PAT bound to a specific app — infer org from the app
    const app = await prisma.app.findUnique({ where: { id: auth.appId }, select: { orgId: true } });
    orgId = app?.orgId ?? null;
  } else {
    reply.code(400).send({
      error: 'Bad Request',
      message: 'Cannot determine organization: use a service token, or provide ?org=<id> with a PAT',
      statusCode: 400,
    });
    return null;
  }

  if (!orgId) {
    reply.code(400).send({ error: 'Bad Request', message: 'Unable to resolve organization', statusCode: 400 });
    return null;
  }

  // 2. Resolve appId from ?project= (UUID or name) or token binding
  let appId;
  if (!project && auth.appId) {
    appId = auth.appId;
  } else if (!project) {
    reply.code(400).send({ error: 'Bad Request', message: '?project=<id|name> is required', statusCode: 400 });
    return null;
  } else if (isUuid(project)) {
    const app = await prisma.app.findFirst({ where: { id: project, orgId }, select: { id: true } });
    if (!app) {
      reply.code(404).send({ error: 'Not Found', message: 'App not found', statusCode: 404 });
      return null;
    }
    appId = app.id;
  } else {
    const app = await prisma.app.findFirst({ where: { orgId, name: project }, select: { id: true } });
    if (!app) {
      reply.code(404).send({ error: 'Not Found', message: `App '${project}' not found`, statusCode: 404 });
      return null;
    }
    appId = app.id;
  }

  // Validate token's app binding if present
  if (auth.appId && auth.appId !== appId) {
    reply.code(403).send({ error: 'Forbidden', message: 'Token is not scoped to this app', statusCode: 403 });
    return null;
  }

  // 3. Resolve environmentId from ?env= (UUID or name) or token binding
  let environmentId;
  let environmentName;
  if (!envParam && auth.environmentId) {
    environmentId = auth.environmentId;
    const e = await prisma.environment.findUnique({ where: { id: environmentId }, select: { name: true } });
    environmentName = e?.name ?? environmentId;
  } else if (!envParam) {
    reply.code(400).send({ error: 'Bad Request', message: '?env=<id|name> is required', statusCode: 400 });
    return null;
  } else if (isUuid(envParam)) {
    const e = await prisma.environment.findFirst({ where: { id: envParam, orgId }, select: { id: true, name: true } });
    if (!e) {
      reply.code(404).send({ error: 'Not Found', message: 'Environment not found', statusCode: 404 });
      return null;
    }
    environmentId = e.id;
    environmentName = e.name;
  } else {
    const e = await prisma.environment.findFirst({ where: { orgId, name: envParam }, select: { id: true, name: true } });
    if (!e) {
      reply.code(404).send({ error: 'Not Found', message: `Environment '${envParam}' not found`, statusCode: 404 });
      return null;
    }
    environmentId = e.id;
    environmentName = e.name;
  }

  // Validate token's environment binding if present
  if (auth.environmentId && auth.environmentId !== environmentId) {
    reply.code(403).send({ error: 'Forbidden', message: 'Token is not scoped to this environment', statusCode: 403 });
    return null;
  }

  return { orgId, appId, environmentId, environmentName };
}

// ---------------------------------------------------------------------------
// Helper: current version for (app, env)
// ---------------------------------------------------------------------------
async function getCurrentVersion(prisma, appId, environmentId) {
  const rows = await prisma.$queryRaw`
    SELECT version FROM config_environment_versions
    WHERE app_id = ${appId}::uuid AND environment_id = ${environmentId}::uuid
  `;
  return rows.length > 0 ? Number(rows[0].version) : 0;
}

// ---------------------------------------------------------------------------
// Helper: full config snapshot via existing config_inheritance view
// ---------------------------------------------------------------------------
async function fetchFullSnapshot(prisma, { orgId, appId, environmentId }) {
  return prisma.$queryRaw`
    SELECT
      key,
      parameter_value_id,
      parameter_id,
      environment_id,
      value_ciphertext,
      value_iv,
      value_tag,
      dek_ciphertext,
      dek_iv,
      dek_tag,
      kek_version,
      encryption_alg
    FROM config_inheritance
    WHERE app_id = ${appId}::uuid
      AND environment_id = ${environmentId}::uuid
      AND org_id = ${orgId}::uuid
  `;
}

// ---------------------------------------------------------------------------
// SSE helpers
// ---------------------------------------------------------------------------
function sseWrite(raw, eventName, data, id) {
  let msg = `event: ${eventName}\n`;
  if (id !== undefined) msg += `id: ${id}\n`;
  msg += `data: ${JSON.stringify(data)}\n\n`;
  raw.write(msg);
}

// ---------------------------------------------------------------------------
// Route plugin
// ---------------------------------------------------------------------------
export default async function v1ConfigRoutes(fastify) {
  const { prisma } = fastify;

  /**
   * GET /v1/config
   * Full snapshot (no sinceVersion) or delta (sinceVersion provided).
   * SDK calls this on startup and after receiving a config.updated SSE hint.
   */
  fastify.get('/config', {
    onRequest: [fastify.authenticate, fastify.requireScope('config:read')],
    config: { rateLimit: { max: 300, timeWindow: '1 minute' } },
    // Not yet in the public API reference — SDKs (docs "SDKs" page) haven't shipped, and this
    // protocol doesn't have request/response schemas defined yet. Give it real `tags`/`schema`
    // and drop `hide` once it's ready to document for real.
    schema: { hide: true },
  }, async (request, reply) => {
    const { project, env, org, sinceVersion } = request.query;

    const target = await resolveConfigTarget(fastify, request, reply, { project, env, org });
    if (!target) return;
    const { orgId, appId, environmentId, environmentName } = target;

    const currentVersion = await getCurrentVersion(prisma, appId, environmentId);

    // --- Delta response ---
    if (sinceVersion !== undefined) {
      const since = Number(sinceVersion);
      if (currentVersion <= since) {
        return reply.send({
          appId,
          environment: environmentName,
          fromVersion: since,
          version: currentVersion,
          values: {},
          changedKeys: [],
        });
      }

      // Collect all changed keys between sinceVersion and current
      const events = await prisma.$queryRaw`
        SELECT changed_keys FROM config_events
        WHERE app_id = ${appId}::uuid
          AND environment_id = ${environmentId}::uuid
          AND version > ${since}
        ORDER BY version ASC
      `;
      const changedKeySet = new Set();
      for (const ev of events) {
        for (const k of (ev.changed_keys ?? [])) changedKeySet.add(k);
      }
      const changedKeys = [...changedKeySet];

      // Fetch current values for only the changed keys
      const rows = await fetchFullSnapshot(prisma, { orgId, appId, environmentId });
      const values = {};
      for (const row of rows) {
        if (changedKeySet.has(row.key)) {
          values[row.key] = decryptParameterValue(row);
        }
      }

      return reply.send({
        appId,
        environment: environmentName,
        fromVersion: since,
        version: currentVersion,
        values,
        changedKeys,
      });
    }

    // --- Full snapshot ---
    const rows = await fetchFullSnapshot(prisma, { orgId, appId, environmentId });
    const values = {};
    const meta = {};
    for (const row of rows) {
      values[row.key] = decryptParameterValue(row);
      // Schema metadata (live/secret/type) not yet stored in DB; return safe defaults
      meta[row.key] = { live: false, secret: false, type: 'string' };
    }

    return reply.send({
      appId,
      environment: environmentName,
      version: currentVersion,
      values,
      meta,
    });
  });

  /**
   * GET /v1/config/events
   * SSE stream. SDK opens this after the initial snapshot fetch.
   * Sends: connected → optional catch-up config.updated → heartbeats → config.updated on change.
   * SDK protocol: SSE events are hints; SDK always re-fetches via GET /v1/config?sinceVersion=N.
   */
  fastify.get('/config/events', {
    onRequest: [fastify.authenticate, fastify.requireScope('config:read')],
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } },
    schema: { hide: true },
  }, async (request, reply) => {
    const { project, env, org, lastVersion } = request.query;

    const target = await resolveConfigTarget(fastify, request, reply, { project, env, org });
    if (!target) return;
    const { orgId, appId, environmentId } = target;

    const latestVersion = await getCurrentVersion(prisma, appId, environmentId);
    const routingKey = `${orgId}:${appId}:${environmentId}`;

    // Switch to raw SSE mode — bypass Fastify's normal response lifecycle
    const raw = reply.raw;
    raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // disable nginx/proxy buffering
    });
    raw.flushHeaders();

    // sendFn registered in clientRegistry — called by broadcast() on config.updated
    const sendFn = (eventName, data, id) => sseWrite(raw, eventName, data, id);

    // Send connected event immediately
    sseWrite(raw, 'connected', { latestVersion });

    // If SDK is behind, send a catch-up hint so it fetches the delta right away
    const clientVersion = lastVersion !== undefined ? Number(lastVersion) : latestVersion;
    if (latestVersion > clientVersion) {
      sseWrite(raw, 'config.updated', {
        version: latestVersion,
        changedKeys: [],
        reason: 'catch_up_required',
      }, String(latestVersion));
    }

    register(routingKey, sendFn);

    // Heartbeat every 25s — lets SDK detect a dead connection
    const heartbeatTimer = setInterval(() => {
      try {
        sseWrite(raw, 'heartbeat', {
          latestVersion: latestVersion, // broadcasts the last known version
          serverTime: new Date().toISOString(),
        });
      } catch {
        cleanup();
      }
    }, SSE_HEARTBEAT_INTERVAL_MS);

    // Forward internal config.updated events to this client
    const busHandler = (event) => {
      if (event.appId !== appId || event.environmentId !== environmentId) return;
      try {
        sseWrite(raw, 'config.updated', {
          appId: event.appId,
          environment: event.environmentId,
          version: event.version,
          changedKeys: event.changedKeys,
        }, String(event.version));
      } catch {
        cleanup();
      }
    };
    internalBus.on('config.updated', busHandler);

    function cleanup() {
      clearInterval(heartbeatTimer);
      internalBus.off('config.updated', busHandler);
      unregister(routingKey, sendFn);
      try { raw.end(); } catch { /* already closed */ }
    }

    // Wait until the client disconnects
    await new Promise((resolve) => {
      request.socket.once('close', resolve);
      request.socket.once('end', resolve);
    });

    cleanup();
  });

  /**
   * PATCH /v1/config/:key
   * Update a config value. Atomically increments the env version and
   * inserts a config_events row which triggers SSE notification via Supabase Realtime.
   */
  fastify.patch('/config/:key', {
    onRequest: [fastify.authenticate, fastify.requireScope('config:write')],
    schema: { hide: true },
  }, async (request, reply) => {
    const { key } = request.params;
    const { project, env, org } = request.query;
    const { value, live, secret } = request.body ?? {};

    if (value === undefined) {
      return reply.code(400).send({ error: 'Bad Request', message: '`value` is required in body', statusCode: 400 });
    }

    const target = await resolveConfigTarget(fastify, request, reply, { project, env, org });
    if (!target) return;
    const { orgId, appId, environmentId } = target;

    const normalizedValue = value ?? '';
    const isSet = normalizedValue !== '';

    const newVersion = await prisma.$transaction(async (tx) => {
      // Find or create the Parameter for this key+app
      let parameter = await tx.parameter.findFirst({
        where: { appId, key },
        select: { id: true },
      });
      if (!parameter) {
        parameter = await tx.parameter.create({
          data: { id: uuidv7(), appId, key },
          select: { id: true },
        });
      }

      // Find or create the ParameterValue for this parameter+environment
      let pv = await tx.parameterValue.findFirst({
        where: { parameterId: parameter.id, environmentId },
        select: { id: true },
      });
      const pvId = pv?.id ?? uuidv7();
      const encData = encryptedParameterValueData({
        value: normalizedValue,
        parameterValueId: pvId,
        parameterId: parameter.id,
        environmentId,
      });

      if (pv) {
        await tx.parameterValue.update({
          where: { id: pvId },
          data: { isSet, ...encData },
        });
      } else {
        await tx.parameterValue.create({
          data: { id: pvId, parameterId: parameter.id, environmentId, isSet, ...encData },
        });
      }

      // Atomically increment (or initialise) the version counter for this (app, env)
      const versionRows = await tx.$queryRaw`
        INSERT INTO config_environment_versions (app_id, environment_id, org_id, version, updated_at)
        VALUES (${appId}::uuid, ${environmentId}::uuid, ${orgId}::uuid, 1, NOW())
        ON CONFLICT (app_id, environment_id)
        DO UPDATE SET version = config_environment_versions.version + 1, updated_at = NOW()
        RETURNING version
      `;
      const version = Number(versionRows[0].version);

      // Insert the changelog row — Supabase Realtime picks this up and routes to SSE clients
      await tx.$queryRaw`
        INSERT INTO config_events (id, org_id, app_id, environment_id, version, changed_keys, type, created_at)
        VALUES (
          ${uuidv7()}::uuid,
          ${orgId}::uuid,
          ${appId}::uuid,
          ${environmentId}::uuid,
          ${version},
          ${JSON.stringify([key])}::jsonb,
          'config.updated',
          NOW()
        )
      `;

      return version;
    });

    return reply.send({ version: newVersion, changedKeys: [key] });
  });
}
