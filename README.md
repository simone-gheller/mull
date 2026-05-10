# mull

Secure configuration management system. Store and manage sensitive parameters across hierarchical apps and environments using server-side envelope encryption.

The repository name is still `safeconfig`; the product name is **mull**.

## Architecture

```
safeconfig.io        → short-term single React/Vite app
app.safeconfig.io    → dashboard SPA target
api.safeconfig.io    → Fastify REST API + PostgreSQL
```

## Monorepo structure

```
safeconfig/
├── backend/          # Fastify API, Prisma, envelope crypto
├── frontend/
│   ├── app/          # dashboard SPA, currently also auth entrypoint
│   └── marketing/    # landing page workspace
├── packages/ui/      # @mull/ui shared design system
├── docs/             # architecture, API, review, design docs
└── supabase/         # local Supabase config and email templates
```

## Quick start

### 1. Start Supabase local

```bash
cd backend
npx supabase gen signing-key --algorithm ES256 | jq '[.]' > ../supabase/signing_keys.json
npm run supabase:start
```

### 2. Start the API

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, MASTER_KEY_HEX, etc.
npm install
npm run db:migrate
npm run db:generate
npm run dev            # http://localhost:3000
```

Required backend env vars include `DATABASE_URL`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `MASTER_KEY_HEX`, `KEK_VERSION`, and `CORS_ORIGIN`.

### 3. Start the frontend

```bash
npm install
npm run dev:app        # http://localhost:5173
```

## Docs

- [API reference](docs/API.md)
- [ER model](docs/er-model.md)
- [Envelope encryption](docs/envelope-encryption-implementation-plan.md)
- [Resolved parameters and inheritance](docs/resolved-parameters-redesign-plan.md)
- [Senior review backlog](docs/senior-review-pain-points.md)

## Key features

- **Envelope encryption** — AES-256-GCM with per-value DEK wrapped by a KEK
- **App hierarchy** — parent/child apps with parameter inheritance
- **Blank-as-inherit semantics** — empty string clears a local value and falls back to ancestors
- **Multi-environment** — dev, staging, production, or any custom env
- **Supabase auth** — JWT verified via JWKS, local OTP flow, Google OAuth support
- **Role-based access** — OWNER / ADMIN / USER per organization

## Current caveats

- `/config/:appId/:envId` is still authenticated with user JWTs, not scoped machine tokens.
- Audit log and version history are not implemented yet.
- The frontend production app currently builds as one large JS chunk (~703 kB minified, ~201 kB gzip).
