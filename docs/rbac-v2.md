# RBAC v2: Org Roles, Scopes, and Protected Environments

mull now treats all parameter values as sensitive by default. Values are always encrypted at rest, never logged raw, and revealed only when authorization grants `config:reveal`.

## Model

- **Role** is an org-level preset of permissions.
- **System roles** are global: `OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`.
- **Custom roles** are org-scoped and available only on paid plans.
- **Access keys** keep direct scopes plus optional app/environment binding.
- **Environment** is the operational boundary:
  - `tier`: `DEVELOPMENT`, `STAGING`, `PRODUCTION`, `CUSTOM`
  - `protected`: blocks reveal/write unless the role permission allows that environment.

## Important Scopes

- `config:read`: read config metadata/state.
- `config:reveal`: reveal plaintext values.
- `config:write`: update, clear, or rollback values.
- `parameters:read`, `parameters:write`, `parameters:delete`: manage parameter definitions.
- `apps:read`, `apps:manage`
- `environments:read`, `environments:manage`
- `members:read`, `members:manage`
- `roles:read`, `roles:manage`
- `access_keys:read`, `access_keys:manage`
- `audit:read`

## Defaults

- `OWNER`: all scopes.
- `ADMIN`: operational admin, including protected config reveal/write, but no billing/delete-org by default.
- `DEVELOPER`: can read metadata and reveal/write non-protected environment values.
- `VIEWER`: read-only metadata and non-protected reveal.

Personal access tokens require both:

1. the token scope, and
2. the owning user role permission.

Service tokens require only their own scopes plus org/app/environment binding.
