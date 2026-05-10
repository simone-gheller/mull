# Current ER Model

Last updated: 2026-05-09.

This document describes the implemented Prisma schema, not the aspirational billing/token/audit model.

```mermaid
erDiagram
    ORGANIZATION ||--o{ USER_ORGANIZATION : "members"
    USER ||--o{ USER_ORGANIZATION : "memberships"
    ORGANIZATION ||--o{ ORG_INVITE : "invites"
    USER ||--o{ ORG_INVITE : "sent invites"

    ORGANIZATION ||--o{ APP : "owns"
    APP ||--o{ APP : "parent child"
    APP ||--o{ PARAMETER : "defines"

    ORGANIZATION ||--o{ ENVIRONMENT : "owns"
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
    }

    USER_ORGANIZATION {
        uuid user_id PK,FK
        uuid org_id PK,FK
        enum role "USER, ADMIN, OWNER"
    }

    ORG_INVITE {
        uuid id PK
        uuid org_id FK
        string email
        enum role
        string token UK
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
        boolean is_secret
    }

    PARAMETER {
        uuid id PK
        uuid app_id FK
        string key
        string description
        boolean is_secret
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
```

## Invariants

1. `User.role` and `User.organizationId` do not exist. Membership and role are stored in `UserOrganization`.
2. `Organization.members` is the join-table relation; there is no direct `Organization.users` relation.
3. `App.ancestors` is a materialized root-to-parent path. The app itself is not included.
4. `Parameter.key` is unique per app.
5. `ParameterValue` is unique per `(parameterId, environmentId)`.
6. `ParameterValue.value` no longer exists. Values are encrypted at rest.
7. `ParameterValue.isSet=false` means unset locally / inherit from ancestors.
8. `Environment.isSecret || Parameter.isSecret` makes a value secret for read authorization.

## Config Inheritance View

`config_inheritance` is a SQL view, not a Prisma model. It expands app ancestry and returns the winning encrypted value row for each `(app, org, environment, key)`.

Important behavior:

```sql
WHERE pv.is_set = true
```

Unset local values are omitted before ranking, so a blank child value does not shadow a set ancestor value. Because of that filter, `is_set` is always true for rows returned by the view.

The backend decrypts returned rows in Node after the view has resolved inheritance.

## Planned But Not Implemented

These concepts are product/backlog items and are intentionally absent from the current schema:

- API/service tokens
- audit log
- parameter value version history
- billing/subscription tables
- SSO connections
