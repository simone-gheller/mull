# SafeConfig API Reference

REST API implementata con Fastify + Prisma. Base URL locale: `http://localhost:3000`.

## Indice

- [Autenticazione](#autenticazione)
- [GET /auth/me](#auth---get-current-user)
- [PATCH /auth/me](#auth---update-profile)
- [POST /orgs](#orgs---create-organization)
- [Apps](#apps)
- [Environments](#environments)
- [Parameters](#parameters)
- [Parameter Values](#parameter-values)
- [Config](#config)

---

## Autenticazione

Tutti gli endpoint (eccetto `/health` e `/auth/*`) richiedono Bearer JWT Supabase.

### Ottenere un token (locale)

```bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Login (utente già registrato)
export TOKEN=$(curl -s -X POST 'http://localhost:54321/auth/v1/token?grant_type=password' \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')
```

**Nota sulla registrazione:** La registrazione avviene via `supabase.auth.signUp()` con OTP email. Il trigger PostgreSQL `on_auth_user_created` crea atomicamente `public.users` + `public.organizations` + `public.user_organizations` al momento dell'INSERT in `auth.users`. Non esiste un endpoint REST di registrazione separato.

### Ottenere l'organization ID

```bash
export ORG_ID=$(curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq -r '.organizations[0].id')
```

---

## Auth - Get Current User

| | |
|---|---|
| **Metodo** | `GET /auth/me` |
| **Auth** | Bearer JWT |
| **File** | `backend/src/routes/auth.js` |

```bash
curl http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN"
```

**Response:**
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

- `organizations` è sempre un array (supporto multi-org)
- `role` è per-org, non globale sull'utente

**Status:** `200` | `401`

---

## Auth - Update Profile

| | |
|---|---|
| **Metodo** | `PATCH /auth/me` |
| **Auth** | Bearer JWT |

```bash
curl -X PATCH http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"displayName": "Ada Lovelace"}'
```

**Status:** `200` | `401`

---

## Orgs - Create Organization

Crea un'organizzazione aggiuntiva per un utente già esistente. L'utente diventa automaticamente OWNER.

| | |
|---|---|
| **Metodo** | `POST /orgs` |
| **Auth** | Bearer JWT |

```bash
curl -X POST http://localhost:3000/orgs \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "new-workspace"}'
```

**Response:** `201`
```json
{ "id": "019dfe...", "name": "new-workspace", "role": "OWNER" }
```

**Nota:** Questo endpoint crea org aggiuntive, non sostituisce la creazione durante la registrazione (che è gestita dal trigger SQL).

---

## Apps

Tutti gli endpoint app usano il prefisso `/orgs/:orgId/apps`. Richiedono membership nell'org.

### GET /orgs/:orgId/apps

```bash
curl "http://localhost:3000/orgs/$ORG_ID/apps" -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  { "id": "...", "orgId": "...", "parentId": null, "name": "root-app", "ancestors": [], "depth": 0 },
  { "id": "...", "orgId": "...", "parentId": "...", "name": "child-app", "ancestors": ["..."], "depth": 1 }
]
```

### POST /orgs/:orgId/apps

```bash
curl -X POST "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "my-app", "parentId": null}'
```

**Status:** `201` | `400` | `401` | `403` | `409` (nome duplicato)

---

## Environments

### GET /orgs/:orgId/environments

```bash
curl "http://localhost:3000/orgs/$ORG_ID/environments" -H "Authorization: Bearer $TOKEN"
```

**Response:** `[{ "id": "...", "orgId": "...", "name": "development" }, ...]`

### POST /orgs/:orgId/environments

```bash
curl -X POST "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "staging"}'
```

Crea automaticamente `ParameterValue` entries vuote per tutti i parametri esistenti nell'org.

**Status:** `201` | `409` (nome duplicato)

---

## Parameters

### GET /orgs/:orgId/parameters?appId=:appId

```bash
curl "http://localhost:3000/orgs/$ORG_ID/parameters?appId=$APP_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** `[{ "id": "...", "appId": "...", "key": "DATABASE_URL" }, ...]`

### POST /orgs/:orgId/parameters

```bash
curl -X POST "http://localhost:3000/orgs/$ORG_ID/parameters" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"appId\": \"$APP_ID\", \"key\": \"DATABASE_URL\"}"
```

Crea automaticamente `ParameterValue` entries vuote per tutti gli environment esistenti.

**Status:** `201` | `409` (chiave duplicata nell'app)

---

## Parameter Values

### GET /orgs/:orgId/parameters/:appId/values

```bash
curl "http://localhost:3000/orgs/$ORG_ID/parameters/$APP_ID/values" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:** oggetto con chiavi = nome environment, valori = array di parameter values.

### PUT /orgs/:orgId/parameters/values/:id

```bash
curl -X PUT "http://localhost:3000/orgs/$ORG_ID/parameters/values/$VALUE_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"value": "postgres://localhost:5432/mydb"}'
```

---

## Config - Rendered Config with Inheritance

### GET /orgs/:orgId/config/:appId/:envId

Restituisce la configurazione risolta, con ereditarietà gerarchica (child override parent).

```bash
curl "http://localhost:3000/orgs/$ORG_ID/config/$APP_ID/$ENV_ID" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "secret-key-123"
}
```

**Status:** `200` | `403` (cross-org access) | `404`

---

## Modelli Database (schema Prisma attuale)

```prisma
model User {
  id          String             @id @db.Uuid    // UUIDv7
  supabaseId  String             @unique
  email       String             @unique
  displayName String?
  organizations UserOrganization[]
  // NOTA: role e organizationId non esistono più (rimossi nella multi-org migration)
}

model Organization {
  id      String             @id @db.Uuid        // UUIDv7
  name    String
  members UserOrganization[]
  apps    App[]
  environments Environment[]
}

model UserOrganization {
  userId String   @map("user_id") @db.Uuid
  orgId  String   @map("org_id") @db.Uuid
  role   UserRole @default(USER)
  @@id([userId, orgId])
}

enum UserRole { USER ADMIN OWNER }

model App {
  id        String  @id @db.Uuid
  orgId     String  @db.Uuid
  parentId  String? @db.Uuid
  name      String
  ancestors String[] @db.Uuid   // UUIDs dei parent
  depth     Int      @default(0)
}

model Environment {
  id    String @id @db.Uuid
  orgId String @db.Uuid
  name  String
}

model Parameter {
  id    String @id @db.Uuid
  appId String @db.Uuid
  key   String
}

model ParameterValue {
  id            String  @id @db.Uuid
  parameterId   String  @db.Uuid
  environmentId String  @db.Uuid
  value         String?
}
```

---

## Script di test completo

```bash
#!/bin/bash
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

# Login
export TOKEN=$(curl -s -X POST 'http://localhost:54321/auth/v1/token?grant_type=password' \
  -H "Content-Type: application/json" -H "apikey: $ANON_KEY" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')

# Health
curl -s http://localhost:3000/health | jq .

# User + org
ME=$(curl -s http://localhost:3000/auth/me -H "Authorization: Bearer $TOKEN")
echo $ME | jq .
export ORG_ID=$(echo $ME | jq -r '.organizations[0].id')

# App
APP=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "test-app"}')
export APP_ID=$(echo $APP | jq -r '.id')

# Environment
ENV=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name": "development"}')
export ENV_ID=$(echo $ENV | jq -r '.id')

# Parameter
curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/parameters" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d "{\"appId\": \"$APP_ID\", \"key\": \"DATABASE_URL\"}" | jq .

# Values
VALUES=$(curl -s "http://localhost:3000/orgs/$ORG_ID/parameters/$APP_ID/values" \
  -H "Authorization: Bearer $TOKEN")
VALUE_ID=$(echo $VALUES | jq -r 'to_entries | .[0].value.values[0].id')

curl -s -X PUT "http://localhost:3000/orgs/$ORG_ID/parameters/values/$VALUE_ID" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"value": "postgres://localhost:5432/testdb"}' | jq .

# Config
curl -s "http://localhost:3000/orgs/$ORG_ID/config/$APP_ID/$ENV_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```
