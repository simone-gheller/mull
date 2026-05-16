# Current ER Model

Last updated: 2026-05-16.

This document describes the implemented Prisma schema, not aspirational billing/SSO models.

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER_ORGANIZATION : "members"
    USER ||--o{ USER_ORGANIZATION : "memberships"
    ORGANIZATION ||--o{ ORG_INVITE : "invites"
    ORGANIZATION ||--o{ AUDIT_EVENT : "audit events"
    ORGANIZATION ||--o{ IDENTITY : "identities"
    USER ||--o{ ORG_INVITE : "sent invites"
    USER ||--o{ AUDIT_EVENT : "actor"
    USER ||--o{ IDENTITY : "owns service/user identities"
    USER ||--o{ ACCESS_KEY : "created keys"
    IDENTITY ||--o{ ACCESS_KEY : "credentials"

    ORGANIZATION ||--o{ APP : "owns"
    APP ||--o{ APP : "parent child"
    APP ||--o{ PARAMETER : "defines"
    APP ||--o{ ACCESS_KEY : "optional binding"

    ORGANIZATION ||--o{ ENVIRONMENT : "owns"
    ENVIRONMENT ||--o{ ACCESS_KEY : "optional binding"
    PARAMETER ||--o{ PARAMETER_VALUE : "has env values"
    ENVIRONMENT ||--o{ PARAMETER_VALUE : "has parameter values"

    USER {
        uuid id PK
        string supabase_id UK
        string email UK
        string display_name
    }

    ORGANIZATION {
        uuid id PK
        string name
        enum plan "FREE, TEAM, BUSINESS, ENTERPRISE"
    }

    USER_ORGANIZATION {
        uuid user_id PK,FK
        uuid org_id PK,FK
        uuid role_id FK
    }

    ROLE {
        uuid id PK
        uuid org_id FK "nullable for system roles"
        string key
        enum kind "SYSTEM, CUSTOM"
        json permissions
    }

    ORG_INVITE {
        uuid id PK
        uuid org_id FK
        string email
        uuid role_id FK
        string token_hash UK
        uuid invited_by FK
        enum status "PENDING, ACCEPTED, REVOKED"
        timestamp expires_at
        timestamp resolved_at
        timestamp created_at
    }

    APP {
        uuid id PK
        uuid org_id FK
        uuid parent_id FK
        string name
        uuid[] ancestors
        int depth
    }

    ENVIRONMENT {
        uuid id PK
        uuid org_id FK
        string name
        enum tier "DEVELOPMENT, STAGING, PRODUCTION, CUSTOM"
        boolean protected
    }

    PARAMETER {
        uuid id PK
        uuid app_id FK
        string key
        string description
    }

    PARAMETER_VALUE {
        uuid id PK
        uuid parameter_id FK
        uuid environment_id FK
        bytea value_ciphertext
        bytea value_iv
        bytea value_tag
        bytea dek_ciphertext
        bytea dek_iv
        bytea dek_tag
        int kek_version
        string encryption_alg
        timestamp encrypted_at
        boolean is_set
    }

    PARAMETER_VALUE_VERSION {
        uuid id PK
        uuid parameter_value_id FK
        uuid parameter_id FK
        uuid environment_id FK
        uuid created_by_user_id FK
        int version_number
        enum change_type "UPDATE, CLEAR, ROLLBACK"
        uuid rolled_back_from_version_id FK
        bytea value_ciphertext
        boolean is_set
        timestamp created_at
    }

    AUDIT_EVENT {
        uuid id PK
        uuid org_id FK
        uuid actor_user_id FK
        enum actor_type "USER, API_TOKEN, SYSTEM, ANONYMOUS"
        string actor_display
        string action
        string resource_type
        string resource_id
        string resource_label
        enum outcome "SUCCESS, DENIED, FAILURE"
        string request_id
        string ip
        string user_agent
        json metadata
        timestamp created_at
        timestamp expires_at
    }

    IDENTITY {
        uuid id PK
        uuid org_id FK
        enum type "USER, SERVICE"
        string name
        uuid owner_user_id FK
        timestamp disabled_at
        timestamp created_at
        timestamp updated_at
    }

    ACCESS_KEY {
        uuid id PK
        uuid identity_id FK
        uuid created_by_user_id FK
        string name
        string token_hash UK
        string token_prefix
        string[] scopes
        string source "MANUAL | CLI"
        uuid app_id FK
        uuid environment_id FK
        timestamp expires_at
        timestamp last_used_at
        timestamp revoked_at
        timestamp created_at
        timestamp updated_at
    }

    CLI_DEVICE_CODE {
        uuid id PK
        string device_code_hash UK "SHA256 of raw secret"
        string device_name "hostname · OS"
        timestamp expires_at
        timestamp approved_at
        uuid approved_by_user_id FK
        uuid org_id FK
        timestamp consumed_at "set on token delivery; blocks re-use"
        uuid previous_key_id FK "exact key to revoke on re-login"
        timestamp created_at
    }
```

Add these relations to the Mermaid diagram (not shown above for brevity):

```
USER ||--o{ CLI_DEVICE_CODE : "approved by"
ORGANIZATION ||--o{ CLI_DEVICE_CODE : "org"
ACCESS_KEY ||--o| CLI_DEVICE_CODE : "previous_key_id (optional)"
```

## Invariants

1. `User.role` and `User.organizationId` do not exist. Memberships store `roleId` and resolve permissions through `Role`.
2. `Organization.members` is the join-table relation; there is no direct `Organization.users` relation.
3. `App.ancestors` is a materialized root-to-parent path. The app itself is not included.
4. `Parameter.key` is unique per app.
5. `ParameterValue` is unique per `(parameterId, environmentId)`.
6. `ParameterValue.value` no longer exists. Values are encrypted at rest.
7. `ParameterValue.isSet=false` means unset locally / inherit from ancestors.
8. All parameter values are secret-by-default. `Environment.protected` and `Environment.tier` are RBAC conditions for reveal/write authorization.
9. `OrgInvite.tokenHash` stores only a SHA-256 fingerprint of the raw email token.
10. `AccessKey.tokenHash` stores only a SHA-256 fingerprint of the full raw access key. The raw token is shown once at creation.
11. `AccessKey.tokenPrefix` stores the non-secret `vextis_pat_<keyId>` or `vextis_st_<keyId>` prefix for display, audit, and support.
12. Access keys may be bound to one app and/or one environment; those bindings must belong to the same organization as the identity.
13. `AuditEvent.metadata` must not contain plaintext parameter values, raw invite tokens, raw access keys, or full credentials.
14. Audit retention is stored per row in `expiresAt`; Postgres function `prune_expired_audit_events()` deletes expired rows and is scheduled through `pg_cron` when available.
15. `AccessKey.source` distinguishes CLI sessions (`'CLI'`, created by device flow) from manual API tokens (`'MANUAL'`). They share the same table but are displayed separately: CLI sessions in `/account/security`, manual tokens in `/account/tokens`.
16. `CliDeviceCode.previousKeyId` is the key ID sent by the CLI from its current config. During token delivery it is revoked atomically (scoped to the same `identityId` to prevent cross-user revocation). The raw previous token is never stored; only the key ID extracted via `parseAccessKeyToken` is persisted.

## Config Inheritance View

`config_inheritance` is a SQL view, not a Prisma model. It expands app ancestry and returns the winning encrypted value row for each `(app, org, environment, key)`.

Important behavior:

```sql
WHERE pv.is_set = true
```

Unset local values are omitted before ranking, so a blank child value does not shadow a set ancestor value. Because of that filter, `is_set` is always true for rows returned by the view.

The backend decrypts returned rows in Node after the view has resolved inheritance.

## Access Key Identity Model

Access keys are implemented with a two-layer model:

- `Identity` is the actor: either a user identity or a service identity.
- `AccessKey` is the credential used to authenticate that identity.
- PATs use `vextis_pat_<keyId>_<secret>` and authenticate a user identity.
- Service tokens use `vextis_st_<keyId>_<secret>` and authenticate a service identity owned by an organization.
- `request.auth` is the runtime contract for auth/authorization. `request.user` remains for compatibility.

See [Access Key Identity Walkthrough](access-key-identity-walkthrough.md) for the request flow and route policy.

## Planned But Not Implemented

These concepts are product/backlog items and are intentionally absent from the current schema:

- OIDC/workload identity auth methods
- SSO connections
