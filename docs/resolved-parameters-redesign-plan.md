# Resolved Parameters Redesign Plan

Date: 2026-05-09

Status: implemented for the list/project flows. `ParameterDetail.jsx` is compatible with `isSet`, but a dedicated all-environment resolved detail endpoint is still deferred.

## Goal

Redesign parameter inheritance resolution so the backend owns the domain model and the frontend receives a clean contract.

The product is not released yet, so we will change the existing `/parameters/resolved` contract directly instead of maintaining backward compatibility.

## Core Semantics

1. Blank value means inherit.
   - A submitted `value === ''` is not an intentional empty value.
   - It means "no local value is set for this parameter/environment".
   - If an ancestor has a set value, the child inherits it.
   - If no ancestor has a set value, the effective value is unset.

2. Non-empty value means set.
   - A submitted non-empty string creates or updates a local value.
   - That local value shadows ancestor values for that environment.

3. Parameter definition inheritance and parameter value inheritance are related but different.
   - A key can be locally defined, inherited as a definition, or defined locally as an override.
   - For each environment, the effective value may still come from the local parameter or an ancestor parameter depending on `is_set`.

## Why `is_set` Is Required

Parameter values are encrypted at rest. PostgreSQL can no longer inspect whether the plaintext value was `''`.

Because `config_inheritance` should continue resolving inheritance in SQL, the database needs a non-secret state flag:

```prisma
isSet Boolean @default(false) @map("is_set")
```

Meaning:

```txt
is_set = false  -> inherit / unset locally
is_set = true   -> local value is intentionally set
```

Even when `is_set=false`, the encrypted columns can contain encrypted `''` to keep encrypted fields non-null. SQL must use `is_set`, not ciphertext, to decide inheritance.

## Database Plan

### Migration

Add:

```sql
ALTER TABLE parameter_values
  ADD COLUMN is_set BOOLEAN NOT NULL DEFAULT false;
```

### Backfill

Because plaintext `parameter_values.value` has already been dropped, backfill must decrypt each row:

1. Read every `parameter_values` row.
2. Decrypt the value in Node.
3. Set `is_set = decryptedValue !== ''`.
4. Do not log decrypted values.
5. Make the script idempotent.

The implemented script is `backend/scripts/backfill-parameter-value-is-set.js`. Keep it until every non-local environment has run the backfill.

## Write Path Changes

### Parameter Value Update

`PUT /orgs/:orgId/parameters/values/:id`

```js
const normalized = value ?? '';
const isSet = normalized !== '';
```

Write:

```js
{
  isSet,
  ...encryptedParameterValueData({ value: normalized, ...ids })
}
```

Response should include:

```js
{
  id,
  parameterId,
  environmentId,
  isSet,
  value
}
```

### Sync Helpers

New parameter/environment sync creates encrypted blank values:

```js
{
  isSet: false,
  ...encryptedParameterValueData({ value: '' })
}
```

### Override Creation

When creating override parameter values, defaults stay unset:

```txt
is_set = false
```

The first non-empty edit sets `is_set=true`.

Clearing a value back to `''` sets `is_set=false`, causing inheritance again.

## `config_inheritance` View

The view must ignore unset values:

```sql
WHERE pv.is_set = true
```

Desired behavior:

```txt
root  DB_HOST = "prod.db"  is_set=true
child DB_HOST = ""         is_set=false
```

Effective config for child:

```txt
DB_HOST = "prod.db"
```

If no row in the app chain has `is_set=true`, the key is omitted from rendered config for that environment.

## `/parameters/resolved` New Contract

Route:

```txt
GET /orgs/:orgId/parameters/resolved?appId=...&environmentId=...
```

`environmentId` is optional:

1. Without `environmentId`: return resolved parameter definitions and summary.
2. With `environmentId`: also return effective value for that environment.

### Response Shape

```js
{
  app: {
    id: string,
    name: string
  },
  environment: {
    id: string,
    name: string,
    isSecret: boolean
  } | null,
  summary: {
    total: number,
    local: number,
    inherited: number,
    overrides: number
  },
  items: [
    {
      key: string,
      relationship: "local" | "inherited" | "override",

      parameter: {
        id: string,
        appId: string,
        appName: string,
        description: string | null,
        isSecret: boolean
      },

      overridden: {
        parameterId: string,
        appId: string,
        appName: string
      } | null,

      value: {
        state: "set" | "inherited" | "unset" | "redacted",
        valueId: string | null,
        parameterId: string | null,
        environmentId: string,
        value: string | null,
        sourceAppId: string | null,
        sourceAppName: string | null,
        isSecret: boolean,
        isSet: boolean,
        canRead: boolean,
        canWrite: boolean
      } | null
    }
  ]
}
```

### Relationship Semantics

`relationship` describes where the winning parameter definition lives:

1. `local`
   - Parameter definition is on the requested app.
   - No ancestor has the same key.

2. `inherited`
   - Parameter definition comes from nearest ancestor.
   - Requested app does not define that key.

3. `override`
   - Parameter definition is on the requested app.
   - An ancestor also defines the same key.

### Value State Semantics

When `environmentId` is present:

1. `set`
   - Effective value comes from the requested app's winning parameter and `is_set=true`.

2. `inherited`
   - Effective value comes from an ancestor parameter value with `is_set=true`.

3. `unset`
   - No value in the app chain is set for this key/environment.

4. `redacted`
   - A value exists, but caller cannot read it because it is secret.

Secret means:

```js
parameter.isSecret || environment.isSecret
```

For `USER`:

```js
canRead = false
value = null
state = "redacted"
```

For `ADMIN` or `OWNER`, value can be decrypted and returned.

`canWrite`:

1. `true` for non-secret values for all org members.
2. `true` for secret values only for `ADMIN` and `OWNER`.
3. `false` otherwise.

## Backend Implementation Notes

1. Validate `appId`.
2. Load requested app and its chain:

```js
chain = [...app.ancestors, app.id]
```

3. Load parameters in chain in one Prisma query.
4. Resolve winning definitions by key using chain order root to current.
5. Track nearest overridden ancestor for local overrides.
6. If `environmentId` is provided:
   - Validate environment belongs to org.
   - Load parameter values for all candidate parameters in one query.
   - For each key, walk from current app back to root and pick first value with `isSet=true`.
   - Redact/decrypt based on role.

This keeps DB access bounded and avoids N queries.

## Frontend Changes

### `apiService.getResolvedParameters`

Update signature:

```js
getResolvedParameters(appId, environmentId)
```

### `Projects.jsx`

Use:

```js
const resolved = await apiService.getResolvedParameters(app.id);
setDetail(resolved.summary);
```

### `Parameters.jsx`

Replace the current two-step loading:

1. `/parameters/resolved`
2. one or more `/parameters/:appId/values`

with a single call:

```js
const resolved = await apiService.getResolvedParameters(appId, selectedEnvId);
setParameters(resolved.items);
```

Remove:

```js
loadParamValues()
sourceAppIds
paramValues map
```

Render from:

```js
param.relationship
param.parameter
param.overridden
param.value
```

UI states:

1. `set`
   - show masked/revealable value.

2. `inherited`
   - show masked/revealable value.
   - show `inherited from {sourceAppName}`.

3. `unset`
   - show `unset`.

4. `redacted`
   - show lock/restricted.

### `ParameterDetail.jsx`

Phase 1:

Update existing logic to respect `isSet` and blank-as-inherit.

Phase 2:

Add a dedicated detail endpoint:

```txt
GET /orgs/:orgId/parameters/detail?appId=...&key=...
```

This endpoint should return all environment values already resolved. This can be done after the list page redesign.

## Tests

### Backend

1. `PUT` non-empty value sets `isSet=true`.
2. `PUT` blank value sets `isSet=false`.
3. New sync-created values have `isSet=false`.
4. `/config` inherits parent value when child value is blank.
5. `/config` uses child value when child value is non-empty.
6. `/config` omits key when no ancestor value is set.
7. `/parameters/resolved?environmentId=` returns `inherited` for child blank.
8. `/parameters/resolved?environmentId=` returns `set` for child non-empty.
9. `/parameters/resolved?environmentId=` returns `unset` when no value is set.
10. Secret value redaction works for inherited values.

### Frontend

Manual smoke tests first:

1. Create parent app and child app.
2. Create parameter on parent.
3. Set parent production value.
4. Verify child shows inherited value.
5. Set child value.
6. Verify child shows local set value.
7. Clear child value.
8. Verify child returns to inherited value.
9. Verify `/config` matches UI.

## Implementation Status

Completed:

1. Added `is_set` migration.
2. Added `backend/scripts/backfill-parameter-value-is-set.js` and ran it locally.
3. Updated parameter-value write paths.
4. Updated `config_inheritance` to ignore unset values.
5. Redesigned `/parameters/resolved` response.
6. Refactored `Projects.jsx`.
7. Refactored `Parameters.jsx`.
8. Updated `ParameterDetail.jsx` for `isSet` compatibility.
9. Added backend coverage for `/parameters/resolved` blank-child fallback and parameter value `isSet` behavior.
10. Ran migrations, backfill, backend tests, and frontend build locally.

Deferred:

1. Dedicated parameter detail endpoint that returns resolved values for every environment.
2. Direct `/config` integration coverage for view behavior.
3. Frontend automated tests for the inheritance UI.
