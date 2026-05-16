# vextis API Reference

REST API implemented with Fastify + Prisma. Local base URL: `http://localhost:3000`.

Current contract status: pre-release, no backward-compatibility guarantees yet.

## Authentication

Browser/user management endpoints use a Supabase Bearer JWT. Runtime and automation endpoints can also use vextis access keys where a route declares the required scope.

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Access key formats:

```txt
vextis_pat_<keyId>_<secret>  # personal access token
vextis_st_<keyId>_<secret>   # organization service token
```

Access key scopes:

```txt
config:read
parameters:read
parameters:write
apps:read
environments:read
```

Management endpoints for orgs, members, invites, audit, billing, and access-key creation/revocation require a Supabase user session. Access keys are shown only once on creation; the database stores a hash and prefix only.

```bash
curl http://localhost:3000/orgs/$ORG_ID/config/$APP_ID/$ENV_ID \
  -H "Authorization: Bearer $VEXTIS_SERVICE_TOKEN"
```

Registration is not a backend REST endpoint. The frontend calls `supabase.auth.signUp()`; a PostgreSQL trigger on `auth.users` creates `public.users`, `public.organizations`, and `public.user_organizations` atomically.

Google OAuth uses the same trigger path.

### Access Keys

Personal tokens:

```txt
GET    /auth/access-keys
POST   /auth/access-keys
DELETE /auth/access-keys/:keyId
```

Service tokens:

```txt
GET    /orgs/:orgId/access-keys
POST   /orgs/:orgId/access-keys
DELETE /orgs/:orgId/access-keys/:keyId
```

Create body:

```json
{
  "name": "github deploy",
  "scopes": ["config:read"],
  "ttl": "90d",
  "appId": "019...",
  "environmentId": "019..."
}
```

`ttl` can be `30d`, `90d`, `365d`, or `never`. `appId` and `environmentId` are optional bindings.

## Organization Context

Most product endpoints are org-scoped:

```txt
/orgs/:orgId/...
```

`validateOrgAccess` checks that the authenticated user is a member of `:orgId` and sets `request.orgRole` as a compatibility alias for the role key.

Roles are per organization and are presets of scopes:

```txt
OWNER > ADMIN > DEVELOPER > VIEWER
```

Custom roles are org-scoped and paid-plan only. Config values are secret-by-default; `config:reveal` controls plaintext access, and protected environments can restrict reveal/write through permission conditions.

## Auth

### `GET /auth/me`

Returns the current backend user and memberships.

```json
{
  "id": "019dfe08-8b5e-7e08-abe2-7fd735d11f0c",
  "email": "user@example.com",
  "displayName": "Ada Lovelace",
  "organizations": [
    {
      "id": "019dfe08-8b5f-7fec-86f4-b8675bf9580f",
      "name": "acme-corp",
      "role": "OWNER",
      "roleId": "019...",
      "roleKey": "OWNER",
      "roleName": "Owner"
    }
  ]
}
```

### `GET /auth/whoami`

Returns the authenticated API actor for Supabase JWTs, personal access tokens, and service tokens. Use this for CLI/SDK bootstrap when the caller needs org IDs.

```bash
curl http://localhost:3000/auth/whoami \
  -H "Authorization: Bearer $VEXTIS_TOKEN"
```

```json
{
  "identityType": "USER",
  "identityName": "Ada Lovelace",
  "credentialType": "ACCESS_KEY",
  "credentialPrefix": "vextis_pat_019...",
  "scopes": ["config:read"],
  "organizations": [
    {
      "id": "019...",
      "name": "acme",
      "role": "OWNER"
    }
  ],
  "appId": null,
  "environmentId": null
}
```

### `PATCH /auth/me`

Updates profile fields.

```json
{ "displayName": "Ada Lovelace" }
```

### `POST /orgs`

Creates an additional organization for an existing authenticated user. The caller becomes `OWNER`.

```json
{ "name": "new-workspace" }
```

## Apps

Prefix: `/orgs/:orgId/apps`

Apps form a materialized hierarchy:

- `parentId`: direct parent.
- `ancestors`: root-to-parent UUID path.
- `depth`: `0` for root, `1` for child, etc.

### `GET /orgs/:orgId/apps`

Returns every app for the org, ordered for tree rendering.

### `GET /orgs/:orgId/apps/:appId`

Returns one app.

### `POST /orgs/:orgId/apps`

```json
{
  "name": "api",
  "parentId": null
}
```

`name` is unique within an organization.

### `PATCH /orgs/:orgId/apps/:appId`

Updates app metadata currently supported by the route.

### `DELETE /orgs/:orgId/apps/:appId`

Deletes an app. Requires `ADMIN` or `OWNER`. Parameter/value deletion cascades, but deleting an app with children may fail because child apps reference their parent with `onDelete: Restrict`.

## Environments

Prefix: `/orgs/:orgId/environments`

### `GET /orgs/:orgId/environments`

Returns org environments.

```json
[
  {
    "id": "019...",
    "orgId": "019...",
    "name": "production",
    "tier": "PRODUCTION",
    "protected": true
  }
]
```

All values are sensitive by default. `protected=true` means reveal/write requires a permission that allows protected environments.

### `POST /orgs/:orgId/environments`

```json
{
  "name": "staging",
  "tier": "STAGING",
  "protected": false
}
```

Creates encrypted, unset `ParameterValue` rows for existing parameters in the org.

### `DELETE /orgs/:orgId/environments/:envId`

Deletes an environment and its values.

## Parameters

Prefix: `/orgs/:orgId/parameters`

### `GET /orgs/:orgId/parameters?appId=:appId`

Returns parameter definitions directly owned by the app. This endpoint does not resolve inheritance.

```json
[
  {
    "id": "019...",
    "appId": "019...",
    "key": "DATABASE_URL",
    "description": "Primary database URL"
  }
]
```

### `POST /orgs/:orgId/parameters`

```json
{
  "appId": "019...",
  "key": "DATABASE_URL",
  "description": "Primary database URL"
}
```

Creates encrypted, unset `ParameterValue` rows for every existing environment in the org.

### `GET /orgs/:orgId/parameters/resolved?appId=:appId&environmentId=:envId`

Primary frontend list contract. It resolves parameter definitions through the app ancestry chain and optionally resolves the effective value for one environment.

`environmentId` is optional:

- omitted: returns definitions + summary only, `value: null`.
- present: returns effective value state for that environment.

Response:

```json
{
  "app": { "id": "019...", "name": "api" },
  "environment": { "id": "019...", "name": "production", "tier": "PRODUCTION", "protected": true },
  "summary": {
    "total": 3,
    "local": 1,
    "inherited": 1,
    "overrides": 1
  },
  "items": [
    {
      "key": "DATABASE_URL",
      "relationship": "override",
      "parameter": {
        "id": "019...",
        "appId": "019...",
        "appName": "api",
        "description": "Primary database URL"
      },
      "overridden": {
        "parameterId": "019...",
        "appId": "019...",
        "appName": "root"
      },
      "value": {
        "state": "inherited",
        "valueId": "019...",
        "parameterId": "019...",
        "environmentId": "019...",
        "value": "postgres://example",
        "sourceAppId": "019...",
        "sourceAppName": "root",
        "isSet": true,
        "canRead": true,
        "canWrite": true
      }
    }
  ]
}
```

`relationship` describes the winning definition:

- `local`: definition is on requested app and no ancestor defines the key.
- `inherited`: definition comes from nearest ancestor.
- `override`: requested app defines the key and shadows an ancestor definition.

`value.state` describes the effective value for the requested environment:

- `set`: value comes from requested app.
- `inherited`: value comes from an ancestor app.
- `unset`: no row in the chain has `isSet=true`.
- `redacted`: value exists, but caller cannot read it.

### `POST /orgs/:orgId/parameters/override`

Creates or retrieves a local override parameter in a child app.

```json
{
  "key": "DATABASE_URL",
  "appId": "019...",
  "description": "Optional override description"
}
```

New override values are unset by default (`isSet=false`), so they do not shadow ancestor values until a non-empty value is saved.

## Parameter Values

Parameter values are encrypted at rest. The plaintext column has been removed.

### `GET /orgs/:orgId/parameters/:appId/values`

Returns values for parameters directly owned by the app, grouped by environment name.

```json
{
  "production": {
    "environmentId": "019...",
    "values": [
      {
        "id": "019...",
        "parameterId": "019...",
        "parameterKey": "DATABASE_URL",
        "isSet": true,
        "value": "postgres://example"
      },
      {
        "id": "019...",
        "parameterId": "019...",
        "parameterKey": "OPTIONAL_FLAG",
        "isSet": false,
        "value": null
      }
    ]
  }
}
```

`value` is `null` when `isSet=false` or when the value is redacted for the caller.

### `GET /orgs/:orgId/parameters/values/:id`

Returns one value with `parameter` and `environment` relations. Secret values require `ADMIN` or `OWNER`.

### `PUT /orgs/:orgId/parameters/values/:id`

```json
{ "value": "postgres://localhost:5432/mydb" }
```

Semantics:

- non-empty string: encrypts value and sets `isSet=true`.
- empty string: encrypts `''` but sets `isSet=false`.

Empty string means "unset locally / inherit", not an intentional empty config value.

Response:

```json
{
  "id": "019...",
  "parameterId": "019...",
  "environmentId": "019...",
  "isSet": true,
  "value": "postgres://localhost:5432/mydb"
}
```

## Config

### `GET /orgs/:orgId/config/:appId/:envId`

Returns flat rendered config with app inheritance applied.

```json
{
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "secret-key-123"
}
```

Implementation:

- PostgreSQL view `config_inheritance` resolves the winning set values.
- The view filters `WHERE pv.is_set = true`, so unset local values never shadow ancestors.
- The view returns encrypted columns only.
- Node decrypts the already-resolved rows in memory.

Access keys can call this endpoint when they have `config:read`. Optional access-key `appId` and `environmentId` bindings are enforced before rendering.

Successful config fetches create `config.fetch` audit events with app/environment metadata and parameter count, never rendered plaintext values.

## CLI Device Flow

The device flow enables the `vextis` CLI to obtain an access token via a browser-based authorization step without embedding credentials in the terminal.

### `POST /cli/device-code`

Starts a device flow session. Rate-limited to 5 requests per minute.

```json
{
  "deviceName": "hostname",
  "platform": "darwin",
  "previousToken": "vextis_pat_019..."
}
```

`platform` is optional; the server maps it to a readable OS label (`darwin` → `macOS`) and appends it to `deviceName` as `"hostname · macOS"`. `previousToken` is optional; if present the server parses it to extract the key ID and stores it as `previousKeyId` to be revoked atomically when the new token is delivered.

Response `201`:

```json
{
  "id": "019...",
  "deviceCode": "<random 32-byte base64url secret>",
  "verificationUrl": "https://app.vextis.io/cli-auth?code=019...",
  "expiresAt": "2026-05-16T10:10:00.000Z"
}
```

The raw `deviceCode` is shown to the CLI and used as the polling secret. Only `SHA256(deviceCode)` is stored.

### `GET /cli/device-code/:id`

Public. Returns the device name and expiry for the browser confirmation page.

```json
{
  "deviceName": "dev-machine · macOS",
  "expiresAt": "2026-05-16T10:10:00.000Z"
}
```

Returns `404` if the code does not exist, has expired, or has already been consumed.

### `GET /cli/device-code/:id/status?secret=<deviceCode>`

CLI polling endpoint. Rate-limited to 30 requests per minute.

The server validates `SHA256(secret) == deviceCodeHash`. Responses:

- `{ "status": "pending" }` — user has not approved yet
- `{ "status": "expired" }` — code TTL elapsed
- `404` — code not found or already consumed

On approval (not yet consumed):

1. Revokes `previousKeyId` if set (scoped to `identityId`, so cross-user revocation is impossible)
2. Creates a new `AccessKey` with `source='CLI'` and 90-day TTL
3. Sets `consumedAt` — future polls return `404`

Approved response:

```json
{
  "status": "approved",
  "token": "vextis_pat_019..._<secret>",
  "orgId": "019...",
  "orgName": "acme-corp",
  "email": "user@example.com"
}
```

The token is never stored; this is the only response where it appears.

### `POST /cli/device-code/:id/approve`

Requires a Supabase JWT (not a PAT). Called by the browser after the user clicks "Authorize".

```json
{ "orgId": "019..." }
```

Validates that the authenticated user is a member of `orgId`. Sets `approvedAt`, `approvedByUserId`, `orgId`. No token is created here; creation happens on the next poll.

## Audit Events

### `GET /orgs/:orgId/audit-events`

Lists tenant-visible audit events for OWNER/ADMIN users.

Query filters:

- `cursor`
- `limit` (1-100)
- `action`
- `resourceType`
- `actorUserId`
- `outcome` (`SUCCESS`, `DENIED`, `FAILURE`)
- `from`, `to` ISO datetimes

Response:

```json
{
  "items": [
    {
      "id": "019...",
      "actorDisplay": "owner@example.com",
      "action": "parameter_value.reveal_current",
      "resourceType": "parameter_value",
      "resourceLabel": "DATABASE_URL",
      "outcome": "SUCCESS",
      "metadata": {
        "protected": true,
        "tier": "PRODUCTION",
        "isSet": true
      },
      "createdAt": "2026-05-10T12:00:00.000Z",
      "expiresAt": "2026-08-08T12:00:00.000Z"
    }
  ],
  "nextCursor": null
}
```

Audit events intentionally do not store plaintext secret values, raw invite tokens, or full credentials.

## Invitations

### `GET /orgs/:orgId/invites`

Lists invites for an org.

### `POST /orgs/:orgId/invites`

Creates an invite for a non-member email. Existing registered users still accept through the same app-level invite link. The raw invite token is sent only in the email link; the database stores only `token_hash`.

```json
{
  "email": "teammate@example.com",
  "role": "USER"
}
```

### `DELETE /orgs/:orgId/invites/:inviteId`

Revokes a pending invite.

### `GET /invites/:token`

Public invite preview/validation endpoint.
The backend hashes the received token and looks up `org_invites.token_hash`.

### `POST /invites/accept`

Accepts an invite for the authenticated/signup flow.
The backend hashes the received token and never persists the raw token.

## Database Model Notes

- IDs are UUIDv7 for app-created rows.
- `User.role` and `User.organizationId` do not exist.
- Memberships point to `Role` via `UserOrganization.roleId`.
- `ParameterValue.value` does not exist.
- `ParameterValue.isSet` is the inheritance state flag.
- `Environment.protected` and `Environment.tier` feed RBAC conditions; `Parameter.isSecret` and `Environment.isSecret` no longer exist.
- `OrgInvite.token` does not exist; invite lookup uses `tokenHash` / `token_hash`.
- `AuditEvent` stores tenant-visible activity metadata with per-row retention.

## Migration Operations

For a fresh/local database:

```bash
cd backend
npm run db:migrate
npm run db:generate
```

For an environment that already had encrypted values before `is_set` was added:

```bash
cd backend
npm run db:migrate
npm run db:backfill:is-set
```

The backfill decrypts existing encrypted rows only to set the non-secret `is_set` flag. It does not log plaintext values.
