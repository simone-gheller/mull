# Access Key Identity Walkthrough

This walkthrough explains the access key work added in this session: why it exists, what changed, how requests flow, and how to test it.

## What We Built

The product now has a first version of API access keys for REST API, CLI, and SDK usage.

There are two key types:

- Personal access tokens: `vextis_pat_<keyId>_<secret>`
- Organization service tokens: `vextis_st_<keyId>_<secret>`

The important design decision is that a token is not the actor by itself. The actor is an `Identity`; the token is a credential used by that identity.

In practical terms:

- A PAT authenticates a user identity.
- A service token authenticates a service identity owned by an org.
- The raw token is shown once, then only a hash and prefix are stored.
- OIDC is intentionally not implemented yet; future OIDC should become another auth method on `Identity`.

## Data Model

Prisma now has two new models in `backend/prisma/schema.prisma`:

- `Identity`
  - `type`: `USER` or `SERVICE`
  - `orgId`: every identity belongs to one org
  - `name`: display/debug name
  - `ownerUserId`: used for service identity ownership and delegated attribution
  - `disabledAt`: future kill switch for the whole identity

- `AccessKey`
  - belongs to an `Identity`
  - has `createdByUserId`
  - stores `tokenHash`, `tokenPrefix`, scopes, optional `appId`, optional `environmentId`
  - tracks `expiresAt`, `lastUsedAt`, `revokedAt`

Migration:

```txt
backend/prisma/migrations/20260511000000_access_keys_identity/migration.sql
```

This creates:

```txt
identities
access_keys
IdentityType enum
```

The migration has already been applied to the local DB during this session.

## Runtime Auth Contract

The backend now normalizes all auth flows into `request.auth`.

Shape:

```js
request.auth = {
  identityType,
  identityId,
  identityName,

  credentialType,
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

Examples:

JWT browser session:

```js
{
  identityType: 'USER',
  credentialType: 'SUPABASE_JWT',
  scopes: ['*'],
  delegatedUserId: user.id
}
```

PAT:

```js
{
  identityType: 'USER',
  credentialType: 'ACCESS_KEY',
  scopes: ['config:read', 'parameters:read'],
  delegatedUserId: user.id
}
```

Service token:

```js
{
  identityType: 'SERVICE',
  credentialType: 'ACCESS_KEY',
  scopes: ['config:read'],
  orgId: serviceIdentity.orgId,
  delegatedUserId: serviceIdentity.ownerUserId
}
```

`request.user` still exists for compatibility. For service tokens, it is populated with the delegated owner user so existing code that needs `createdByUserId` still works. The audit actor remains the access key/service identity, not the delegated user.

## Auth Flow

The auth plugin now chooses the strategy by token prefix:

```txt
Authorization: Bearer vextis_pat_...  -> access key auth
Authorization: Bearer vextis_st_...   -> access key auth
anything else                       -> Supabase JWT auth
```

Access key auth does this:

1. Parse token format.
2. Load `AccessKey` by key id.
3. Verify the full token with SHA-256 hash comparison using `crypto.timingSafeEqual`.
4. Reject revoked, expired, or disabled-identity keys.
5. Build `request.auth`.
6. Set `lastUsedAt`.

Key files:

```txt
backend/src/lib/accessKeys.js
backend/src/plugins/auth.js
backend/src/plugins/testAuth.js
```

## Authorization

New decorators:

```js
fastify.requireScope('config:read')
fastify.requireJwtAuth()
fastify.enforceAccessKeyResource(request, reply, { appId, environmentId })
```

Existing role checks still exist:

```js
fastify.requireRole('ADMIN')
```

The split is:

- JWT users have `scopes: ['*']`.
- PATs need the right scope and still respect the owning user role.
- Service tokens need the right scope and are treated as machine actors for scoped API access.
- Org/member/invite/audit/access-key management endpoints are JWT-only.

Initial scopes:

```txt
config:read
parameters:read
parameters:write
apps:read
environments:read
```

Access key app/environment bindings are enforced by `enforceAccessKeyResource`.

## API Endpoints Added

Personal access keys:

```txt
GET    /auth/access-keys
POST   /auth/access-keys
DELETE /auth/access-keys/:keyId
```

Organization service tokens:

```txt
GET    /orgs/:orgId/access-keys
POST   /orgs/:orgId/access-keys
DELETE /orgs/:orgId/access-keys/:keyId
```

Actor introspection:

```txt
GET /auth/whoami
```

`/auth/me` remains JWT-only. `/auth/whoami` works with JWT, PAT, and service tokens and is intended for CLI/SDK bootstrap.

Example:

```bash
curl -sS "$API_URL/auth/whoami" \
  -H "Authorization: Bearer $VEXTIS_PAT" | jq
```

This returns organizations, scopes, credential type, key prefix, and optional app/environment bindings.

## UI Changes

The frontend has real access key management in two places:

- Personal tokens page: `/account/tokens` (manual PATs only — CLI sessions are excluded)
- Org tokens tab: `/settings/org?tab=tokens`

CLI sessions (`source='CLI'`) are shown separately on `/account/security` as "Active Sessions" with revoke controls. The Security page also shows the current browser session (decoded from the Supabase JWT) alongside CLI sessions in a unified table.

Shared component:

```txt
frontend/app/src/components/settings/AccessKeysPanel.jsx
```

Capabilities:

- create PAT or service token
- choose TTL preset: `30d`, `90d`, `365d`, `never`
- choose scopes
- optionally bind to app/environment
- show raw token once
- copy token
- revoke existing key

API service methods were added in:

```txt
frontend/app/src/services/api.js
```

## Audit Behavior

Audit events now understand access-key actors.

When the request uses an access key:

- `actorType` becomes `API_TOKEN`
- `actorDisplay` uses identity/key info
- metadata includes:
  - `credentialId`
  - `credentialPrefix`
  - `identityId`
  - `identityName`
  - `delegatedUserId`

Raw tokens are never stored in audit metadata.

Key file:

```txt
backend/src/plugins/audit.js
```

## Route Changes

Scoped read/write access was added to:

- `GET /orgs/:orgId/config/:appId/:envId` -> `config:read`
- app reads -> `apps:read`
- environment reads -> `environments:read`
- parameter reads -> `parameters:read`
- parameter writes/value writes/rollback -> `parameters:write` plus existing role semantics for user/PAT

JWT-only enforcement was added to:

- `/auth/me`
- `/auth/me` patch
- `POST /orgs`
- org settings/member/invite/audit routes
- access-key management routes

## How To Test Manually

Set variables:

```bash
export API_URL="http://localhost:3000"
export VEXTIS_PAT="vextis_pat_..."
```

Discover org id:

```bash
curl -sS "$API_URL/auth/whoami" \
  -H "Authorization: Bearer $VEXTIS_PAT" | jq
```

Then:

```bash
export ORG_ID="019..."
export APP_ID="019..."
export ENV_ID="019..."
```

Read rendered config with `config:read`:

```bash
curl -sS "$API_URL/orgs/$ORG_ID/config/$APP_ID/$ENV_ID" \
  -H "Authorization: Bearer $VEXTIS_PAT" | jq
```

List parameters with `parameters:read`:

```bash
curl -sS "$API_URL/orgs/$ORG_ID/parameters?appId=$APP_ID" \
  -H "Authorization: Bearer $VEXTIS_PAT" | jq
```

Update a value with `parameters:write`; for PAT this also requires the owning user to be `ADMIN` or `OWNER`:

```bash
export VALUE_ID="019..."

curl -sS -X PUT "$API_URL/orgs/$ORG_ID/parameters/values/$VALUE_ID" \
  -H "Authorization: Bearer $VEXTIS_PAT" \
  -H "Content-Type: application/json" \
  -d '{"value":"hello-from-pat"}' | jq
```

Expected denial if scope is missing:

```bash
curl -i "$API_URL/orgs/$ORG_ID/config/$APP_ID/$ENV_ID" \
  -H "Authorization: Bearer $VEXTIS_PAT"
```

Without `config:read`, this should return `403`.

## Tests Added And Run

Unit tests:

```txt
backend/tests/unit/accessKeys.test.js
```

Covers:

- PAT/service token creation and parsing
- invalid token parsing
- token hashing
- scope validation and wildcard checks

Integration tests:

```txt
backend/tests/integration/accessKeys.test.js
```

Covers:

- service token creation
- one-time raw token display
- service token config fetch
- missing-scope denial
- PAT role checks
- `/auth/whoami` for JWT, PAT, and service token

Verification run in this session:

```bash
cd backend
npm run db:generate
npx prisma validate
npm run test:unit
npm run test:integration
```

Frontend build:

```bash
npm run build:app
```

All tests/builds passed after applying the local migration.

## Important Caveats

- `request.user` still exists and is intentionally kept for compatibility.
- `request.auth` is the new long-term auth contract.
- Service token writes use `delegatedUserId` for existing `createdByUserId` history rows, while audit records the API token identity as the real actor.
- App binding is currently exact app only, not subtree.
- OIDC is not implemented yet; it should be added later as another auth method on `Identity`.
