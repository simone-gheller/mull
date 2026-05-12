# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

SafeConfig (product name: **mull**) is a secure configuration management system built with Node.js/Fastify and PostgreSQL. It implements envelope cryptography to securely store and manage sensitive configuration parameters across apps and environments. Target: B2B developer tool.

## Deployment Architecture

```
safeconfig.io           → Marketing landing page (React + Vite — frontend/)
app.safeconfig.io       → Dashboard SPA (React + Vite — frontend/)
api.safeconfig.io       → REST API (Fastify — backend/)
```

**Current frontend state:**
- One React + Vite app (`frontend/app/`) contains both landing page and dashboard
- Short term: deploy as single app on `safeconfig.io`
- Long term: split into two Vite apps sharing `packages/ui` component library

**Monorepo structure:**
```
safeconfig/
├── backend/          # Fastify API — source of truth for business logic
├── frontend/
│   ├── app/          # Dashboard SPA (React 19 + Vite)
│   └── marketing/    # Landing page
├── packages/
│   └── ui/           # @mull/ui — shared design system
├── docs/             # Architecture and design documents
└── supabase/         # Local Supabase config + email templates
```

## Key Commands

```bash
# Backend (from backend/)
npm run dev            # http://localhost:3000
npm run db:migrate     # npx prisma migrate deploy
npm run db:migrate:dev # npx prisma migrate dev
npm run db:generate    # regenerate Prisma client
npm run db:backfill:is-set # one-off after encrypted-value migration

# Frontend (from root)
npm run dev:app        # http://localhost:5173
npm run build:app

# Supabase local
npx supabase start     # starts auth + DB (port 54321/54322)
npx supabase stop
# Inbucket (email testing): http://localhost:54324
# Studio: http://localhost:54323
```

## Commit Style

Use Conventional Commit messages matching the existing repository history:

```
type(scope): concise summary
type(scope): concise summary — specific detail
```

Common scopes: `backend`, `frontend`, `auth`, `app`, `repo`.
Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

Examples:
- `feat(backend): parameter values — encrypted history and rollback`
- `feat(frontend): parameter detail — history and rollback UI`
- `docs(repo): refresh review backlog and architecture notes`

## Environment Setup

Backend `.env` requires:
- `DATABASE_URL` — PostgreSQL (Supabase local: `postgresql://postgres:postgres@127.0.0.1:54322/postgres`)
- `SUPABASE_URL` — `http://localhost:54321` locally
- `SUPABASE_PUBLISHABLE_KEY` — anon key from `npx supabase status`
- `MASTER_KEY_HEX` — 64 hex chars (for envelope encryption KEK)
- `KEK_VERSION` — integer, current key version
- `CORS_ORIGIN` — comma-separated allowed origins (default: `http://localhost:5173,http://localhost:5174`)

Optional: `SUPABASE_PROJECT_REF` (production), `GOOGLE_CLIENT_ID/SECRET/REDIRECT_URI` (OAuth).

## Architecture

### Database Schema (current, implemented)

```prisma
model User {
  id            String             @id @db.Uuid        // UUIDv7
  supabaseId    String             @unique @map("supabase_id")
  email         String             @unique
  displayName   String?            @map("display_name")
  organizations UserOrganization[]
}

model Organization {
  id      String             @id @db.Uuid              // UUIDv7
  name    String
  members UserOrganization[]
  apps    App[]
  environments Environment[]
}

model UserOrganization {
  userId String @map("user_id") @db.Uuid
  orgId  String @map("org_id") @db.Uuid
  roleId String @map("role_id") @db.Uuid
  user   User         @relation(...)
  org    Organization @relation(...)
  role   Role         @relation(...)
  @@id([userId, orgId])
}

model Role {
  id          String   @id @db.Uuid
  orgId       String?  @map("org_id") @db.Uuid        // null for system roles
  key         String                                      // OWNER | ADMIN | DEVELOPER | VIEWER | custom
  kind        RoleKind                                    // SYSTEM | CUSTOM
  permissions Json
}

model ParameterValue {
  id            String @id @db.Uuid
  parameterId   String @map("parameter_id") @db.Uuid
  environmentId String @map("environment_id") @db.Uuid

  valueCiphertext Bytes    @map("value_ciphertext")
  valueIv         Bytes    @map("value_iv")
  valueTag        Bytes    @map("value_tag")
  dekCiphertext   Bytes    @map("dek_ciphertext")
  dekIv           Bytes    @map("dek_iv")
  dekTag          Bytes    @map("dek_tag")
  kekVersion      Int      @map("kek_version")
  encryptionAlg   String   @default("AES-256-GCM") @map("encryption_alg")
  encryptedAt     DateTime @map("encrypted_at")
  isSet           Boolean  @default(false) @map("is_set")
}

model Identity {
  id          String       @id @db.Uuid
  orgId       String       @map("org_id") @db.Uuid
  type        IdentityType                         // USER | SERVICE
  name        String
  ownerUserId String?      @map("owner_user_id") @db.Uuid
  disabledAt  DateTime?    @map("disabled_at")
}

model AccessKey {
  id              String   @id @db.Uuid
  identityId      String   @map("identity_id") @db.Uuid
  createdByUserId String   @map("created_by_user_id") @db.Uuid
  name            String
  tokenHash       String   @unique @map("token_hash")
  tokenPrefix     String   @map("token_prefix")
  scopes          String[]
  appId           String?  @map("app_id") @db.Uuid
  environmentId   String?  @map("environment_id") @db.Uuid
  expiresAt       DateTime? @map("expires_at")
  lastUsedAt      DateTime? @map("last_used_at")
  revokedAt       DateTime? @map("revoked_at")
}
```

**Key invariants:**
- App-created IDs should be **UUIDv7** (time-ordered). Registration trigger, builders, routes, and seeds generate UUIDv7 explicitly; do not rely on generic Prisma UUID defaults when adding new write paths.
- The pattern `^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-...` is validated on all `:orgId` params.
- `User.role` and `User.organizationId` do NOT exist — they were removed in the multi-org migration.
- `Organization.users` does NOT exist — use `Organization.members` (the join table relation).
- `ParameterValue.value` does NOT exist. Values are encrypted at rest.
- `ParameterValue.isSet` is the non-secret state flag for inheritance. `false` means "unset locally / inherit"; `true` means "this local value shadows ancestors".
- Access keys are modeled as `Identity` (actor) + `AccessKey` (credential). Raw access keys are shown once and never stored; DB stores only `tokenHash` and `tokenPrefix`.
- PAT format is `mull_pat_<keyId>_<secret>`; org service-token format is `mull_st_<keyId>_<secret>`.
- Access key scopes are `config:read`, `parameters:read`, `parameters:write`, `apps:read`, and `environments:read`. Optional `appId`/`environmentId` bindings restrict where the key can be used.

### User Creation Flow (Registration)

User and org are created **atomically by a PostgreSQL trigger** on `auth.users` INSERT:

```
frontend: supabase.auth.signUp({ options: { data: { display_name, organization_name } } })
  → Supabase inserts into auth.users
  → Trigger handle_new_user() fires:
      - INSERT INTO public.users (uuid_generate_v7() IDs)
      - INSERT INTO public.organizations (name from raw_user_meta_data)
      - INSERT INTO public.user_organizations (role = 'OWNER')
  → Supabase sends OTP email to Inbucket (local) or real inbox (prod)
  → frontend: supabase.auth.verifyOtp({ email, token, type: 'signup' })
  → onAuthStateChange fires → fetchUserData() → /auth/me → dashboard
```

For **Google OAuth**: same trigger fires, org name auto-generated from email prefix.

The `authenticate` backend decorator is a **pure lookup** — it never creates users or orgs. Returns 401 if user not in `public.users`.

### Authentication (`backend/src/plugins/auth.js`)

Decorators registered on Fastify:
- **`authenticate`** — accepts Supabase JWTs plus `mull_pat_*`/`mull_st_*` access keys. It normalizes every authenticated request into `request.auth`.
- **`validateOrgAccess`** — for JWT/PAT checks user membership in `:orgId`; for service tokens checks the service identity belongs to `:orgId`.
- **`requireScope(scope, options?)`** — checks role permissions for JWT/PAT, direct scopes for service tokens, and optional environment conditions.
- **`requireJwtAuth()`** — keeps account/org/admin management endpoints user-session only.
- **`requireRole(role)`** — legacy compatibility alias for coarse system-role checks; prefer `requireScope`.
- **`enforceAccessKeyResource(request, reply, { appId, environmentId })`** — enforces optional access-key app/environment bindings.

Usage pattern: `preHandler: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireScope('roles:manage')]`

`request.auth` shape:

```js
{
  identityType,      // USER | SERVICE
  identityId,
  identityName,
  credentialType,    // SUPABASE_JWT | ACCESS_KEY
  credentialId,
  credentialPrefix,
  orgId,
  orgRole,
  scopes,
  appId,
  environmentId,
  delegatedUserId
}
```

`request.user` remains for compatibility. For service tokens it is the delegated owner/creator user used for legacy `createdByUserId`, while audit records the access key identity as the real actor.

### Route Structure

**Auth routes** (no org context — `backend/src/routes/auth.js`):
- `GET /auth/me` — returns `{ id, email, displayName, organizations: [{id, name, role}] }`
- `GET /auth/whoami` — returns normalized actor/auth context for JWT, PAT, and service-token callers; use for CLI/SDK org discovery
- `PATCH /auth/me` — update displayName
- `POST /orgs` — create additional org for authenticated user (OWNER role assigned)
- `GET/POST/DELETE /auth/access-keys` — personal access token management
- `POST /auth/admin/example` — example admin-only endpoint

**Org-scoped routes** (all prefixed `/orgs/:orgId`, all have `validateOrgAccess`):
- `GET/POST/PATCH/DELETE /orgs/:orgId/apps`
- `GET/POST/DELETE /orgs/:orgId/environments`
- `GET/POST /orgs/:orgId/parameters`
- `GET /orgs/:orgId/parameters/resolved?appId=&environmentId=` — resolved parameter definitions and optional effective value for one env
- `POST /orgs/:orgId/parameters/override` — create/retrieve local override parameter
- `GET /orgs/:orgId/parameters/:appId/values`
- `GET/PUT /orgs/:orgId/parameters/values/:id`
- `GET /orgs/:orgId/config/:appId/:envId` — rendered config with inheritance
- `GET/PATCH /orgs/:orgId`
- `GET /orgs/:orgId/members`
- `GET/POST/DELETE /orgs/:orgId/invites`
- `GET/POST/DELETE /orgs/:orgId/access-keys` — org service-token management

**Invite routes outside org prefix**:
- `GET /invites/:token` — public invite preview
- `POST /invites/accept` — authenticated invite acceptance

### Cryptography (`backend/src/crypto/envelope.js`)

Envelope encryption: AES-256-GCM. Each parameter value has a random DEK (Data Encryption Key) wrapped by the active KEK (Key Encryption Key, from `MASTER_KEY_HEX` + `KEK_VERSION`). The crypto module uses Additional Authenticated Data (AAD) that binds ciphertext to `parameterValueId`, `parameterId`, and `environmentId`.

Important semantics:
- Empty string is not an intentional stored config value in the product.
- `PUT value: ''` encrypts `''` but sets `isSet=false`.
- SQL inheritance uses `is_set`, never ciphertext/plaintext.
- `config_inheritance` intentionally filters `WHERE pv.is_set = true`; therefore `is_set` is always true inside that view.
- Decryption happens only in backend route handlers after auth/role checks.

### Frontend Auth (`frontend/app/src/context/AuthContext.jsx`)

State: `{ user, orgs, orgId, isAuthenticated, loading, error }`.

- `orgs` — array of `{id, name, role}` from `/auth/me`
- `orgId` — active org, resolved as: `localStorage['active_org_id']` → OWNER org → first org
- `switchOrg(id)` — updates localStorage + `apiService.setOrgId()`
- `verifyOtp({ email, token })` — calls `supabase.auth.verifyOtp({ type: 'signup' })`
- `clearError` — wrapped in `useCallback([])` to prevent infinite re-render loops when used as useEffect dependency

### Frontend Routes (`frontend/app/src/App.jsx`)

```
/               → redirect to /login
/login          → Login (PublicRoute)
/signup         → Signup — two-step inline: form → OTP on same URL (PublicRoute)
/oauth/callback → OAuthCallback
/invite/accept  → InviteAcceptPage
/dashboard      → Layout (ProtectedRoute)
  /dashboard/apps
  /dashboard/parameters
  /dashboard/:orgSlug/:appSlug/parameters/:paramKey
  /dashboard/environments
/settings       → Layout (ProtectedRoute)
  /settings/profile
  /settings/security
  /settings/tokens        (personal access token management)
  /settings/org
```

**Signup flow detail (`frontend/app/src/pages/Signup.jsx`):**
- Two internal components: `FormStep` (registration form) and `OtpStep` (OTP input)
- `sessionStorage` keys `signup_step` and `signup_email` persist step across accidental refresh
- On OTP success: sessionStorage cleared, `onAuthStateChange` navigates to dashboard
- `result.sessionCreated` flag handles case where email confirmation is disabled (direct dashboard nav)

### Email Templates (`supabase/templates/`)

- `confirmation.html` — branded OTP email (dark theme, `termGreen` code box, mono font)
- Subject: `{{ .Token }} — verify your mull account` (OTP code visible in push notification)
- Tracked in git; pushed to production via `supabase push` once project is linked

## Security Model

- **Supabase JWT** (ES256) verified via JWKS — no password/session management in backend
- **Per-org RBAC roles** (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`, paid custom roles) — `UserOrganization.roleId` points to `Role`, whose permissions are scopes with optional environment conditions
- **`validateOrgAccess` on every org-scoped route** — 403 if not a member of the org in the path
- **UUIDv7 validation** on all `:orgId` params — rejects UUIDv4 or malformed IDs
- **Envelope encryption** — parameter values encrypted at rest, keys managed server-side
- **Secret-by-default config** — all values are sensitive; `config:reveal` controls plaintext access and protected environments restrict reveal/write
- **Blank-as-inherit** — empty value clears the local value and allows ancestor fallback

## Tests

### Backend (`backend/tests/`)

- Framework: Node.js built-in `test` + `assert`, HTTP via `fastify.inject()` (no supertest)
- Unit: `npm test` oppure `npm run test:unit` da `backend/` — gira solo `tests/unit/**/*.test.js`, non richiede Supabase o `.env`
- Integration: `npm run test:integration` da `backend/` — richiede Supabase locale attivo + `.env` configurato, fa preflight DB e poi gira `tests/integration/**/*.test.js`
- Full suite: `npm run test:all` da `backend/` — unit + integration in sequenza
- Utility integration: `backend/tests/utils/builders.js` — `buildTestContext()` crea un'istanza Fastify in `testMode: true`

**Test directory convention:**
- `tests/unit/` — test isolati: niente Fastify app completo, Prisma, Supabase, DB o `.env`
- `tests/integration/` — test Fastify inject + Prisma + DB reale; usare i builder e Supabase locale

**testMode** (`src/plugins/testAuth.js`): quando attivo, il decorator `authenticate` legge `x-test-user-id` header invece di verificare JWT via JWKS. Permette test senza Supabase auth. Attivato solo da `buildTestContext()`, mai in produzione.

**Builder helpers:**
- `ctx.buildUser(overrides)` — crea User (no org)
- `ctx.buildOrgMembership({ userId, orgId, role })` — aggiunge user all'org
- `ctx.buildUserInOrg(org, { role, ...userOverrides })` — convenience: user + membership in un colpo
- `ctx.injectAuth(options, user)` — inject con `x-test-user-id: user.id`

**Copertura attuale:**
- `apps.test.js` — GET/POST /orgs/:orgId/apps
- `environments.test.js` — GET/POST /orgs/:orgId/environments
- `parameters.test.js` — GET/POST /orgs/:orgId/parameters
- `parameterValues.test.js` — GET /orgs/:orgId/parameters/:appId/values, GET/PUT /orgs/:orgId/parameters/values/:id
- `auth.test.js` — GET/PATCH /auth/me, POST /orgs
- `orgs.test.js` — GET/PATCH /orgs/:orgId, GET /orgs/:orgId/members
- `config.test.js` — GET /orgs/:orgId/config/:appId/:envId inherited config rendering
- `auditEvents.test.js` — tenant-visible audit event matrix
- `accessKeys.test.js` — PAT/service-token creation, `/auth/whoami`, scope denial, service-token config fetch, PAT role checks
- `envelope.test.js` — unit tests for envelope encryption roundtrip/tamper/AAD failures
- `accessKeys.test.js` (unit) — token parsing, hashing, scope validation
- `parameters.test.js` also covers `/parameters/resolved` inheritance fallback for blank child values

**Non coperto:** frontend route behavior and E2E golden paths; additional invite edge cases beyond current acceptance coverage.

**Nota sul formato risposta**: `GET /orgs/:orgId/parameters/:appId/values` ritorna un oggetto `{ [envName]: { environmentId, values: [{id, parameterId, parameterKey, isSet, value}] } }`, non un array. `value` è `null` quando `isSet=false` o quando il valore è redatto.

---

## TODO

### Verifica shortcut da tastiera (fix #30)
Gli shortcut globali sono implementati in `frontend/app/src/components/layout/Layout.jsx` ma non verificati manualmente. Testare:
- `⌘K` apre/chiude la palette e non si attiva quando si digita in un input
- `?` apre il modal shortcut solo fuori da input di testo
- `/` mette il focus su `[data-search]` in Parameters (non attivo su altre pagine)
- `N` apre il modal corretto in Projects, Parameters (solo se app selezionata), Environments — e non si attiva durante la digitazione
- `Esc` chiude palette e modal shortcut
- Arrow keys + Space navigano l'albero AppTreeA
- Nessun conflitto tra shortcut globali e input nelle pagine

### Access key / RBAC next steps
- Implement access key rotation UX: create replacement, revoke old key, and show migration state.
- Add service identity disable/enable controls and bulk revoke for all keys on an identity.
- Model future OIDC/workload identity as auth methods on `Identity` (GitHub Actions, GitLab, Kubernetes, cloud workloads).
- Redesign member permissions beyond coarse `USER`/`ADMIN`/`OWNER`, using access-key scopes as the conceptual foundation for explicit capabilities.

### Toast notification adoption
`ToastProvider` exists in `frontend/app/src/context/ToastContext.jsx` and wraps app routes. Continue adopting it in remaining create/delete/export/error paths; today it is used at least for parameter creation.

### Frontend tests
Il frontend (`frontend/app/`) non ha nessun framework di test installato. Opzioni valutate:
- **Vitest + React Testing Library** — unit/integration, integrazione nativa con Vite. Valore limitato perché ogni componente richiede mock pesanti di Supabase, axios e react-router.
- **Playwright** — E2E nel browser reale, nessun mock, copre signup/login/dashboard. Richiede backend + Supabase attivi per girare.
- **Raccomandazione**: Playwright per i golden path (signup, login, dashboard) quando il prodotto si stabilizza. Rimandato perché il frontend è ancora in evoluzione rapida e il costo di manutenzione supera il beneficio attuale.
