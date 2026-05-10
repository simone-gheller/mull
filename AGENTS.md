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
  userId String   @map("user_id") @db.Uuid
  orgId  String   @map("org_id") @db.Uuid
  role   UserRole @default(USER)                       // USER | ADMIN | OWNER
  user   User         @relation(...)
  org    Organization @relation(...)
  @@id([userId, orgId])
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
```

**Key invariants:**
- App-created IDs should be **UUIDv7** (time-ordered). Registration trigger, builders, routes, and seeds generate UUIDv7 explicitly; do not rely on generic Prisma UUID defaults when adding new write paths.
- The pattern `^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-...` is validated on all `:orgId` params.
- `User.role` and `User.organizationId` do NOT exist — they were removed in the multi-org migration.
- `Organization.users` does NOT exist — use `Organization.members` (the join table relation).
- `ParameterValue.value` does NOT exist. Values are encrypted at rest.
- `ParameterValue.isSet` is the non-secret state flag for inheritance. `false` means "unset locally / inherit"; `true` means "this local value shadows ancestors".

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
- **`authenticate`** — verifies Supabase JWT via JWKS, looks up user+orgs via Prisma, attaches `request.user = { ...user, organizations: [{id, name, role}] }`
- **`validateOrgAccess`** — checks `request.user.organizations` for the `:orgId` param, sets `request.orgRole`. Returns 403 if not a member.
- **`requireRole(role)`** — checks `request.orgRole` (not `request.user.role`). Must come after `validateOrgAccess` in preHandler array.

Usage pattern: `preHandler: [fastify.authenticate, fastify.validateOrgAccess, fastify.requireRole('OWNER')]`

### Route Structure

**Auth routes** (no org context — `backend/src/routes/auth.js`):
- `GET /auth/me` — returns `{ id, email, displayName, organizations: [{id, name, role}] }`
- `PATCH /auth/me` — update displayName
- `POST /orgs` — create additional org for authenticated user (OWNER role assigned)
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
  /settings/tokens        (coming soon)
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
- **Per-org role** (`OWNER > ADMIN > USER`) — stored in `UserOrganization`, not on `User`
- **`validateOrgAccess` on every org-scoped route** — 403 if not a member of the org in the path
- **UUIDv7 validation** on all `:orgId` params — rejects UUIDv4 or malformed IDs
- **Envelope encryption** — parameter values encrypted at rest, keys managed server-side
- **Row-by-row redaction** — grouped value reads redact secret parameter/environment values per row for non-admin users
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
- `envelope.test.js` — unit tests for envelope encryption roundtrip/tamper/AAD failures
- `parameters.test.js` also covers `/parameters/resolved` inheritance fallback for blank child values

**Non coperto:** `GET /orgs/:orgId/config/:appId/:envId` (raw SQL + view `config_inheritance`), `POST /orgs/:orgId/parameters/override`, full invitation acceptance edge cases.

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

### Backend unreachable detection
Quando il backend API è giù, l'utente resta sulla dashboard con org name `'...'` e tutte le chiamate API falliscono silenziosamente. Implementare:
1. **`frontend/app/src/lib/api.js`** — response interceptor axios: distingue errori di rete (`!error.response`) da errori HTTP normali (401/403/500). Espone `onBackendStatusChange(fn)` callback.
2. **`frontend/app/src/context/AuthContext.jsx`** — aggiunge `backendDown` state, registra il callback, fa polling su `/health` ogni 10s quando è down, ri-fetcha i dati utente al recovery.
3. **`frontend/app/src/App.jsx`** — `BackendStatusBanner` component inline: legge `backendDown` da `useAuth()`, mostra banner sticky con colori `T.amber` / `T.amberBg` / `T.amberBorder`. Errori HTTP normali non triggherano il banner.

### Ripensare testMode in auth.js
Attualmente `src/plugins/auth.js` contiene un branch `if (options.testMode)` che registra decorator alternativi per i test (`authenticate`, `validateOrgAccess`, `requireRole`). Questo accoppia la logica di test al codice di produzione. Valutare alternative più pulite: mock del plugin a livello di Fastify, plugin separato solo per test, o iniezione diretta di `request.user` tramite hook `onRequest`.

### Audit log (parameter values)
Tracciare chi ha modificato un valore, in quale environment, da/a quale valore, con timestamp.
- Schema: nuovo model `ParameterValueAudit` (id, parameterValueId, userId, oldValue, newValue, changedAt)
- Backend: `PUT /parameters/values/:id` popola record audit dopo ogni update
- Frontend: sezione `// audit` in `frontend/app/src/pages/ParameterDetail.jsx` — sostituisce il placeholder `// history`

### Version history (parameter values)
Visualizzare la storia dei valori per un parametro+environment specifico.
- Derivabile dall'audit log (stesso model, query filtrata per `parameterValueId`)
- Frontend: sezione `// history` già presente come placeholder in `ParameterDetail.jsx`
- Utile per rollback manuale a un valore precedente

### Toast notification adoption
`ToastProvider` exists in `frontend/app/src/context/ToastContext.jsx` and wraps app routes. Continue adopting it in remaining create/delete/export/error paths; today it is used at least for parameter creation.

### Export parametri (Projects.jsx)
Il bottone export è già presente nel detail panel di `/dashboard/apps` (`handleExport` è stub vuoto). Implementare:
- Chiamare `apiService.getResolvedParameters(selectedApp.id)` + `apiService.getParameterValues(selectedApp.id)` in parallelo
- Costruire oggetto JSON: `{ app: { id, name }, exportedAt: ISO string, parameters: [{ key, description, isSecret, values: { [envName]: value } }] }`
- Creare blob, generare URL temporaneo con `URL.createObjectURL`, triggerare download con `<a download>` sintetico, revocare URL
- Notifica toast `'parameters exported'` al completamento

### Frontend tests
Il frontend (`frontend/app/`) non ha nessun framework di test installato. Opzioni valutate:
- **Vitest + React Testing Library** — unit/integration, integrazione nativa con Vite. Valore limitato perché ogni componente richiede mock pesanti di Supabase, axios e react-router.
- **Playwright** — E2E nel browser reale, nessun mock, copre signup/login/dashboard. Richiede backend + Supabase attivi per girare.
- **Raccomandazione**: Playwright per i golden path (signup, login, dashboard) quando il prodotto si stabilizza. Rimandato perché il frontend è ancora in evoluzione rapida e il costo di manutenzione supera il beneficio attuale.
