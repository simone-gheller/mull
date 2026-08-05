// Pulls the backend's live-generated OpenAPI spec (@fastify/swagger, backend/src/openapi/config.js)
// into a static file the docs site bundles at build time — same "no runtime coupling to
// api.vextis.io" reasoning as generate-llms-txt.js.
//
// Defaults to the real production API so a plain `npm run build` (what Vercel runs, with no
// backend on localhost) self-heals with the live spec — no dashboard env var to remember to set.
// Local dev overrides this to localhost via OPENAPI_SPEC_URL in package.json's "dev" script, so
// `npm run dev` reflects unshipped local backend schema changes instead. The output file
// (src/content/openapi.json) is gitignored: it's fully derived, regenerated on every dev/build.
import { writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '../src/content/openapi.json');
const specUrl = process.env.OPENAPI_SPEC_URL || 'https://api.vextis.io/docs/json';

try {
  const res = await fetch(specUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  const spec = await res.json();
  writeFileSync(outPath, JSON.stringify(spec, null, 2));
  console.log(`Wrote ${outPath} (${Object.keys(spec.paths ?? {}).length} paths from ${specUrl})`);
} catch (err) {
  if (existsSync(outPath)) {
    console.warn(`Could not reach ${specUrl} (${err.message}) — keeping existing openapi.json.`);
  } else {
    console.warn(`Could not reach ${specUrl} (${err.message}) — writing a placeholder openapi.json.`);
    const placeholder = {
      openapi: '3.0.0',
      info: { title: 'vextis API', version: '0.0.0', description: 'Spec unavailable at build time — run the backend locally and re-run `npm run fetch:openapi`, or check OPENAPI_SPEC_URL.' },
      paths: {},
    };
    writeFileSync(outPath, JSON.stringify(placeholder, null, 2));
  }
}
