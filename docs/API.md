# mull API Reference

REST API implemented with Fastify + Prisma. Local base URL: `http://localhost:3000`.

Current contract status: pre-release, no backward-compatibility guarantees yet.

## Authentication

All endpoints except `/health`, `/auth/*`, and `GET /invites/:token` require a Supabase Bearer JWT. `POST /invites/accept` is authenticated.

```bash
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

Registration is not a backend REST endpoint. The frontend calls `supabase.auth.signUp()`; a PostgreSQL trigger on `auth.users` creates `public.users`, `public.organizations`, and `public.user_organizations` atomically.

Google OAuth uses the same trigger path.

## Organization Context

Most product endpoints are org-scoped:

```txt
/orgs/:orgId/...
```

`validateOrgAccess` checks that the authenticated user is a member of `:orgId` and sets `request.orgRole`.

Roles are per organization:

```txt
OWNER > ADMIN > USER
```

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
      "role": "OWNER"
    }
  ]
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
    "isSecret": true
  }
]
```

`isSecret=true` means values in that environment are treated as secret regardless of parameter-level secrecy.

### `POST /orgs/:orgId/environments`

```json
{
  "name": "staging",
  "isSecret": false
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
    "description": "Primary database URL",
    "isSecret": true
  }
]
```

### `POST /orgs/:orgId/parameters`

```json
{
  "appId": "019...",
  "key": "DATABASE_URL",
  "description": "Primary database URL",
  "isSecret": true
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
  "environment": { "id": "019...", "name": "production", "isSecret": true },
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
        "description": "Primary database URL",
        "isSecret": true
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
        "isSecret": true,
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

Caveat: this endpoint currently uses authenticated user JWTs. Scoped service tokens for runtime/CI config fetches are still backlog.

## Invitations

### `GET /orgs/:orgId/invites`

Lists invites for an org.

### `POST /orgs/:orgId/invites`

Creates an invite. Existing users can be added directly; new users receive an app-level invite flow.

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

### `POST /invites/accept`

Accepts an invite for the authenticated/signup flow.

## Database Model Notes

- IDs are UUIDv7 for app-created rows.
- `User.role` and `User.organizationId` do not exist.
- Roles live in `UserOrganization`.
- `ParameterValue.value` does not exist.
- `ParameterValue.isSet` is the inheritance state flag.
- `Environment.isSecret` and `Parameter.isSecret` both contribute to secret gating.

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
