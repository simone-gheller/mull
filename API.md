# SafeConfig API Reference

Documentazione completa di tutti gli endpoint REST implementati nel backend SafeConfig.

## Indice
- [Autenticazione](#autenticazione)
- [Health Check](#health-check)
- [Auth](#auth)
- [Apps](#apps)
- [Environments](#environments)
- [Parameters](#parameters)
- [Parameter Values](#parameter-values)
- [Config](#config)

---

## Autenticazione

Tutti gli endpoint (eccetto `/health` e `/auth/*`) richiedono autenticazione JWT tramite Supabase.

### JWT e JWKS

Il sistema usa **JWKS (JSON Web Key Set)** per la verifica dei token JWT firmati con algoritmo ES256:
- **Locale**: `http://localhost:54321/auth/v1/.well-known/jwks.json`
- **Produzione**: `https://{project-ref}.supabase.co/auth/v1/.well-known/jwks.json`

**Setup locale (richiesto):**
```bash
# Genera JWT signing key e avvia Supabase
npx supabase gen signing-key --algorithm ES256 | jq '[.]' > supabase/signing_keys.json && npm run supabase:start
```

### Come ottenere un token e organization ID

**1. Registrazione via Supabase:**
```bash
# Registra nuovo utente (usa Supabase anon key)
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"

curl -X POST 'http://localhost:54321/auth/v1/signup' \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**2. Login via Supabase:**
```bash
curl -X POST 'http://localhost:54321/auth/v1/token?grant_type=password' \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"email": "test@example.com", "password": "password123"}'
```

**3. Salva il token:**
```bash
export TOKEN=$(curl -s -X POST 'http://localhost:54321/auth/v1/token?grant_type=password' \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')
```

**4. Ottieni il tuo organization ID:**
```bash
# Al primo accesso viene creata automaticamente un'organizzazione personale
export ORG_ID=$(curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq -r '.organization.id')
```

**Nota importante sull'organizzazione:**
- Al primo login, viene automaticamente creata un'organizzazione personale per l'utente
- L'utente diventa automaticamente OWNER della propria organizzazione
- L'organization ID è necessario per accedere a tutti gli endpoint delle risorse (apps, environments, parameters)
- I token JWT sono verificati tramite JWKS per garantire autenticità e integrità

---

## Endpoint API

### Health Check

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/health` |
| **Auth** | ❌ No |
| **File** | `backend/src/server.js:58-60` |

**Request:**
```bash
curl -X GET http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-04-26T20:00:00.000Z"
}
```

---

### Auth - Get Current User

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/auth/me` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/auth.js:14-60` |
| **Models** | `User`, `Organization` |

**Request:**
```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "019dcba6-c6f2-7334-84f6-3a9f3cf59401",
  "email": "test@example.com",
  "displayName": "test",
  "memberships": [
    {
      "organizationId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "OWNER",
      "organization": {
        "id": "550e8400-e29b-41d4-a716-446655440000",
        "name": "test's Organization"
      }
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized (no token or invalid token)

---

### Auth - Admin Example

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/auth/admin/example` |
| **Auth** | ✅ Required (Bearer JWT + ADMIN role) |
| **File** | `backend/src/routes/auth.js:66-95` |
| **Models** | `User` |

**Request:**
```bash
curl -X POST http://localhost:3000/auth/admin/example \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"
```

**Response:**
```json
{
  "message": "Admin access granted",
  "user": "test@example.com"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (user doesn't have ADMIN role)

---

### Apps - List All Apps

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/orgs/:orgId/apps` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/apps.js:13-57` |
| **Models** | `App`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID

**Request:**
```bash
curl -X GET "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "550e8400-e29b-41d4-a716-446655440001",
    "orgId": "550e8400-e29b-41d4-a716-446655440000",
    "parentId": null,
    "name": "root-app",
    "ancestors": [],
    "depth": 0
  },
  {
    "id": "550e8400-e29b-41d4-a716-446655440002",
    "orgId": "550e8400-e29b-41d4-a716-446655440000",
    "parentId": "550e8400-e29b-41d4-a716-446655440001",
    "name": "child-app",
    "ancestors": ["550e8400-e29b-41d4-a716-446655440001"],
    "depth": 1
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not a member of organization)
- `500` - Server Error

---

### Apps - Create New App

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/orgs/:orgId/apps` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/apps.js:60-165` |
| **Models** | `App`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID

**Body Parameters:**
- `name` (string, required) - App name (unique per organization)
- `parentId` (UUID, optional) - Parent app ID for hierarchy

**Request:**
```bash
# App root (senza parent)
curl -X POST "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-app"
  }'

# App child (con parent)
curl -X POST "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-child-app",
    "parentId": "550e8400-e29b-41d4-a716-446655440001"
  }'
```

**Response:**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440003",
  "orgId": "550e8400-e29b-41d4-a716-446655440000",
  "parentId": "550e8400-e29b-41d4-a716-446655440001",
  "name": "my-child-app",
  "ancestors": ["550e8400-e29b-41d4-a716-446655440001"],
  "depth": 1
}
```

**Status Codes:**
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized
- `403` - Forbidden (parent app not in same organization)
- `404` - Not Found (parent app not found)
- `409` - Conflict (duplicate app name in organization)
- `500` - Server Error

---

### Environments - List All Environments

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/orgs/:orgId/environments` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/environments.js:14-50` |
| **Models** | `Environment`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID

**Request:**
```bash
curl -X GET "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "orgId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "development"
  },
  {
    "id": "650e8400-e29b-41d4-a716-446655440002",
    "orgId": "550e8400-e29b-41d4-a716-446655440000",
    "name": "production"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not a member of organization)
- `500` - Server Error

---

### Environments - Create New Environment

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/orgs/:orgId/environments` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/environments.js:53-123` |
| **Models** | `Environment`, `Organization`, `ParameterValue` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID

**Body Parameters:**
- `name` (string, required) - Environment name (unique per organization)

**Request:**
```bash
curl -X POST "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "staging"
  }'
```

**Response:**
```json
{
  "id": "650e8400-e29b-41d4-a716-446655440003",
  "orgId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "staging"
}
```

**Note:** La creazione di un nuovo environment crea automaticamente `ParameterValue` entries vuote per tutti i parametri esistenti nell'organizzazione.

**Status Codes:**
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized
- `404` - Not Found (organization not found)
- `409` - Conflict (duplicate environment name)
- `500` - Server Error

---

### Parameters - List Parameters for App

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/orgs/:orgId/parameters` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/parameters.js:14-74` |
| **Models** | `Parameter`, `App`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID

**Query Parameters:**
- `appId` (UUID, required) - App ID

**Request:**
```bash
curl -X GET "http://localhost:3000/orgs/$ORG_ID/parameters?appId=550e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
[
  {
    "id": "750e8400-e29b-41d4-a716-446655440001",
    "appId": "550e8400-e29b-41d4-a716-446655440001",
    "key": "DATABASE_URL"
  },
  {
    "id": "750e8400-e29b-41d4-a716-446655440002",
    "appId": "550e8400-e29b-41d4-a716-446655440001",
    "key": "API_KEY"
  }
]
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (missing parameters)
- `401` - Unauthorized
- `403` - Forbidden (app not in organization)
- `404` - Not Found (app not found)
- `500` - Server Error

---

### Parameters - Create Parameter

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `POST` |
| **Path** | `/orgs/:orgId/parameters` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/parameters.js:77-169` |
| **Models** | `Parameter`, `App`, `Organization`, `ParameterValue` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID

**Body Parameters:**
- `appId` (UUID, required) - App ID
- `key` (string, required) - Parameter key (unique per app)

**Request:**
```bash
curl -X POST "http://localhost:3000/orgs/$ORG_ID/parameters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appId": "550e8400-e29b-41d4-a716-446655440001",
    "key": "DATABASE_URL"
  }'
```

**Response:**
```json
{
  "id": "750e8400-e29b-41d4-a716-446655440001",
  "appId": "550e8400-e29b-41d4-a716-446655440001",
  "key": "DATABASE_URL"
}
```

**Note:** La creazione di un parametro crea automaticamente `ParameterValue` entries vuote per tutti gli environment esistenti nell'organizzazione.

**Status Codes:**
- `201` - Created
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized
- `403` - Forbidden (app not in organization)
- `404` - Not Found (app not found)
- `409` - Conflict (duplicate parameter key in app)
- `500` - Server Error

---

### Parameter Values - List All Values for App

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/orgs/:orgId/parameters/:appId/values` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/parameterValues.js:17-93` |
| **Models** | `ParameterValue`, `Parameter`, `App`, `Environment`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID
- `appId` (UUID, required) - App ID

**Request:**
```bash
curl -X GET "http://localhost:3000/orgs/$ORG_ID/parameters/550e8400-e29b-41d4-a716-446655440001/values" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "development": {
    "environmentId": "650e8400-e29b-41d4-a716-446655440001",
    "values": [
      {
        "id": "850e8400-e29b-41d4-a716-446655440001",
        "parameterId": "750e8400-e29b-41d4-a716-446655440001",
        "parameterKey": "DATABASE_URL",
        "value": "postgres://localhost:5432/mydb-dev"
      },
      {
        "id": "850e8400-e29b-41d4-a716-446655440002",
        "parameterId": "750e8400-e29b-41d4-a716-446655440002",
        "parameterKey": "API_KEY",
        "value": "dev-api-key-123"
      }
    ]
  },
  "production": {
    "environmentId": "650e8400-e29b-41d4-a716-446655440002",
    "values": [
      {
        "id": "850e8400-e29b-41d4-a716-446655440003",
        "parameterId": "750e8400-e29b-41d4-a716-446655440001",
        "parameterKey": "DATABASE_URL",
        "value": "postgres://prod-server:5432/mydb-prod"
      },
      {
        "id": "850e8400-e29b-41d4-a716-446655440004",
        "parameterId": "750e8400-e29b-41d4-a716-446655440002",
        "parameterKey": "API_KEY",
        "value": "prod-api-key-456"
      }
    ]
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (app not in organization)
- `404` - Not Found (app not found)
- `500` - Server Error

---

### Parameter Values - Get Single Value

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/orgs/:orgId/parameters/values/:id` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/parameterValues.js:98-149` |
| **Models** | `ParameterValue`, `Parameter`, `App`, `Environment`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID
- `id` (UUID, required) - Parameter Value ID

**Request:**
```bash
curl -X GET "http://localhost:3000/orgs/$ORG_ID/parameters/values/850e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440001",
  "parameterId": "750e8400-e29b-41d4-a716-446655440001",
  "environmentId": "650e8400-e29b-41d4-a716-446655440001",
  "value": "postgres://localhost:5432/mydb",
  "parameter": {
    "id": "750e8400-e29b-41d4-a716-446655440001",
    "key": "DATABASE_URL",
    "appId": "550e8400-e29b-41d4-a716-446655440001"
  },
  "environment": {
    "id": "650e8400-e29b-41d4-a716-446655440001",
    "name": "development",
    "orgId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (parameter value not in organization)
- `404` - Not Found (parameter value not found)
- `500` - Server Error

---

### Parameter Values - Update Value

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `PUT` |
| **Path** | `/orgs/:orgId/parameters/values/:id` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/parameterValues.js:154-207` |
| **Models** | `ParameterValue`, `Parameter`, `App`, `Environment`, `Organization` |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID
- `id` (UUID, required) - Parameter Value ID

**Body Parameters:**
- `value` (string, required) - New value for the parameter

**Request:**
```bash
curl -X PUT "http://localhost:3000/orgs/$ORG_ID/parameters/values/850e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "postgres://newhost:5432/newdb"
  }'
```

**Response:**
```json
{
  "id": "850e8400-e29b-41d4-a716-446655440001",
  "parameterId": "750e8400-e29b-41d4-a716-446655440001",
  "environmentId": "650e8400-e29b-41d4-a716-446655440001",
  "value": "postgres://newhost:5432/newdb"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad Request (invalid value)
- `401` - Unauthorized
- `403` - Forbidden (parameter value not in organization)
- `404` - Not Found (parameter value not found)
- `500` - Server Error

---

### Config - Render Configuration with Inheritance

| Proprietà | Valore |
|-----------|--------|
| **Metodo** | `GET` |
| **Path** | `/orgs/:orgId/config/:appId/:envId` |
| **Auth** | ✅ Required (Bearer JWT) |
| **File** | `backend/src/routes/config.js:11-107` |
| **Models** | `App`, `Environment`, `Organization` (usa view `config_inheritance`) |

**Path Parameters:**
- `orgId` (UUID, required) - Organization ID
- `appId` (UUID, required) - App ID
- `envId` (UUID, required) - Environment ID

**Request:**
```bash
curl -X GET "http://localhost:3000/orgs/$ORG_ID/config/550e8400-e29b-41d4-a716-446655440001/650e8400-e29b-41d4-a716-446655440001" \
  -H "Authorization: Bearer $TOKEN"
```

**Response:**
```json
{
  "DATABASE_URL": "postgres://localhost:5432/mydb",
  "API_KEY": "secret-key-123",
  "DEBUG": "true"
}
```

**Note:** Questo endpoint risolve l'inheritance gerarchica dei parametri. Se un parametro è definito sia nell'app parent che nell'app child, viene restituito il valore dell'app più profonda (child override parent).

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (not a member of organization, or cross-organization access)
- `404` - Not Found (app or environment not found)
- `500` - Server Error

---

## Note sulle Modifiche URL

**Importante:** L'API è stata aggiornata per utilizzare path parameters invece di query parameters o headers per l'organization ID.

**Deprecato (vecchio formato):**
- Header `X-Org-Id` - Non più utilizzato
- Query parameter `?orgId=` - Non più utilizzato

**Nuovo formato:**
- Tutti gli endpoint org-scoped ora utilizzano `/orgs/:orgId/...` nel path
- L'organization ID è obbligatorio e fa parte del path URL
- Migliore semantica REST e chiarezza dell'API

---

## Modelli Database

### Organization
```prisma
model Organization {
  id           String        @id @default(uuid())
  name         String
  users        User[]
  apps         App[]
  environments Environment[]
}
```

### User
```prisma
model User {
  id             String        @id @default(uuid())
  supabaseId     String        @unique
  email          String        @unique
  displayName    String?
  role           UserRole      @default(USER)
  organizationId String?
  organization   Organization? @relation(fields: [organizationId], references: [id])
}

enum UserRole {
  USER
  ADMIN
  OWNER
}
```

### App
```prisma
model App {
  id         String      @id @default(uuid())
  orgId      String
  parentId   String?
  name       String
  ancestors  String[]    // Array di UUID dei parent
  depth      Int         @default(0)
  organization Organization @relation(fields: [orgId], references: [id])
  parent     App?        @relation("AppHierarchy", fields: [parentId], references: [id])
  children   App[]       @relation("AppHierarchy")
  parameters Parameter[]
}
```

### Environment
```prisma
model Environment {
  id           String           @id @default(uuid())
  orgId        String
  name         String
  organization Organization     @relation(fields: [orgId], references: [id])
  values       ParameterValue[]
}
```

### Parameter
```prisma
model Parameter {
  id     String           @id @default(uuid())
  appId  String
  key    String
  app    App              @relation(fields: [appId], references: [id])
  values ParameterValue[]
}
```

### ParameterValue
```prisma
model ParameterValue {
  id            String      @id @default(uuid())
  parameterId   String
  environmentId String
  value         String?
  parameter     Parameter   @relation(fields: [parameterId], references: [id])
  environment   Environment @relation(fields: [environmentId], references: [id])
}
```

---

## Script di Test Completo

```bash
#!/bin/bash

# Supabase anon key (locale)
ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0"
SUPABASE_URL="http://localhost:54321"

# 1. Registra/Login via Supabase e ottieni il token
echo "=== Login via Supabase ==="
LOGIN_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/token?grant_type=password" \
  -H "Content-Type: application/json" \
  -H "apikey: $ANON_KEY" \
  -d '{"email": "test@example.com", "password": "password123"}')
export TOKEN=$(echo $LOGIN_RESPONSE | jq -r '.access_token')
echo "Token ottenuto: ${TOKEN:0:20}..."

# 2. Test health
echo -e "\n=== Health Check ==="
curl -s http://localhost:3000/health | jq .

# 3. Ottieni i dati utente e organization ID (auto-creato al primo login)
echo -e "\n=== Current User ==="
ME_RESPONSE=$(curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN")
echo $ME_RESPONSE | jq .

# 4. Estrai l'organization ID
export ORG_ID=$(echo $ME_RESPONSE | jq -r '.organization.id')
echo -e "\nUsing Organization ID: $ORG_ID"

# 5. Crea un'app
echo -e "\n=== Create App ==="
APP_RESPONSE=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-app"}')
echo $APP_RESPONSE | jq .
export APP_ID=$(echo $APP_RESPONSE | jq -r '.id')

# 6. Crea un environment
echo -e "\n=== Create Environment ==="
ENV_RESPONSE=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "development"}')
echo $ENV_RESPONSE | jq .
export ENV_ID=$(echo $ENV_RESPONSE | jq -r '.id')

# 7. Crea un parametro
echo -e "\n=== Create Parameter ==="
PARAM_RESPONSE=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/parameters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"appId\": \"$APP_ID\", \"key\": \"DATABASE_URL\"}")
echo $PARAM_RESPONSE | jq .

# 8. Lista parameter values
echo -e "\n=== List Parameter Values ==="
curl -s "http://localhost:3000/orgs/$ORG_ID/parameters/$APP_ID/values" \
  -H "Authorization: Bearer $TOKEN" | jq .

# 9. Update parameter value
echo -e "\n=== Get Parameter Values to Update ==="
VALUES=$(curl -s "http://localhost:3000/orgs/$ORG_ID/parameters/$APP_ID/values" \
  -H "Authorization: Bearer $TOKEN")
# Estrai il primo value ID dal primo environment (nuovo formato grouped)
VALUE_ID=$(echo $VALUES | jq -r 'to_entries | .[0].value.values[0].id')

echo -e "\n=== Update Parameter Value ==="
curl -s -X PUT "http://localhost:3000/orgs/$ORG_ID/parameters/values/$VALUE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"value": "postgres://localhost:5432/testdb"}' | jq .

# 10. Get config with inheritance
echo -e "\n=== Get Rendered Config ==="
curl -s "http://localhost:3000/orgs/$ORG_ID/config/$APP_ID/$ENV_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

---

## Note Importanti

1. **Organization Auto-Creation**: Al primo login, viene automaticamente creata un'organizzazione personale per l'utente, che diventa OWNER
2. **Organization Context**: Tutti gli endpoint org-scoped richiedono `orgId` come path parameter (es. `/orgs/:orgId/apps`)
3. **UUID Format**: Tutti gli ID devono essere UUID validi
4. **Auto-sync**: La creazione di environments/parameters crea automaticamente le relative `ParameterValue` entries
5. **Inheritance**: L'endpoint `/config` risolve automaticamente l'inheritance gerarchica delle app
6. **Authentication**: Utilizza JWT tokens - usa il refresh token endpoint se necessario per rinnovare il token
7. **Migration da vecchio formato**: Se stai migrando da codice esistente, sostituisci:
   - Header `X-Org-Id` con path parameter `/orgs/:orgId`
   - Query parameter `?orgId=` con path parameter `/orgs/:orgId`
