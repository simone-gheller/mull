# Access Key With Identity Model

## Summary

Implement access keys v1 with an explicit Identity + Credential model. An identity represents who is acting in mull; an access key represents how that identity authenticated.

OIDC is out of scope for v1. Future OIDC / Machine Identity v2 should add auth methods to `Identity`, not replace access keys.

## Model

- `Identity`
  - belongs to one organization
  - type: `USER` or `SERVICE`
  - service identities have an `ownerUserId` used as the delegated user for legacy attribution
- `AccessKey`
  - belongs to one identity
  - stores only `tokenHash` and `tokenPrefix`
  - supports `scopes`, optional `appId`, optional `environmentId`, `expiresAt`, `lastUsedAt`, and `revokedAt`

Token formats:

- Personal access token: `mull_pat_<keyId>_<secret>`
- Service token: `mull_st_<keyId>_<secret>`

## Runtime Auth Contract

Authenticated requests receive a flat `request.auth` object:

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

`request.user` remains for compatibility. For service tokens it may contain the delegated owner user so existing version-history rows can still populate `createdByUserId`.

## Authorization

- Supabase JWTs keep the current user membership and role behavior and receive `scopes: ['*']`.
- PATs authenticate as the owning user, then are limited by access-key scopes and optional app/environment binding.
- Service tokens authenticate as service identities and can only access their own org.
- Access-key-aware routes use `requireScope(scope)`.
- Role-only admin surfaces remain human/JWT only unless explicitly made scope-aware.

## Initial Scopes

- `config:read`
- `parameters:read`
- `parameters:write`
- `apps:read`
- `environments:read`

## Future TODO

- Add OIDC / Machine Identity v2 as auth methods on `Identity`.
- Migrate route attribution fully from `request.user` to `request.auth`.
- Consider replacing delegated user compatibility with first-class actor attribution in version history.
