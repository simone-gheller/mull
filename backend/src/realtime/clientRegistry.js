// Registry of active SSE connections, keyed by routingKey = `${orgId}:${appId}:${environmentId}`.
// Each value is a Set of sendFn(eventName, data, id?) functions.
// Filtering is server-side: SDK clients never receive events from other orgs/apps/envs.
const registry = new Map();

export function register(routingKey, sendFn) {
  if (!registry.has(routingKey)) registry.set(routingKey, new Set());
  registry.get(routingKey).add(sendFn);
}

export function unregister(routingKey, sendFn) {
  const bucket = registry.get(routingKey);
  if (!bucket) return;
  bucket.delete(sendFn);
  if (bucket.size === 0) registry.delete(routingKey);
}

// Broadcast an event to all SSE clients subscribed to this routingKey.
export function broadcast(routingKey, eventName, data, id) {
  registry.get(routingKey)?.forEach(fn => {
    try { fn(eventName, data, id); } catch { /* client already gone */ }
  });
}

export function getCount(routingKey) {
  return registry.get(routingKey)?.size ?? 0;
}

export function totalConnections() {
  let n = 0;
  for (const s of registry.values()) n += s.size;
  return n;
}
