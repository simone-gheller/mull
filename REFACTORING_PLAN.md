# Refactoring Plan: Standardize orgId to Path Parameter

## Goal
Refactor all API endpoints to use `/orgs/:orgId/...` prefix pattern for better REST semantics and HTTP caching compatibility.

## User Decisions
✅ **appId parameter**: Mantenere come query param `?appId=X` (più flessibile per filtering)
✅ **Organization creation**: Auto-create org quando utente fa primo login

## Current State Analysis

### Current Pattern
All routes currently use **dual extraction** (header OR query param):
```javascript
const orgId = request.headers['x-org-id'] || request.query.orgId;
```

### Affected Routes
1. **apps.js** - `/apps` (GET, POST)
2. **environments.js** - `/environments` (GET, POST)
3. **parameters.js** - `/parameters` (GET, POST)
4. **parameterValues.js** - `/parameters/:appId/values` (GET), `/parameters/values/:id` (GET, PUT)
5. **config.js** - `/config/:appId/:envId` (GET)
6. **auth.js** - `/auth/me`, `/auth/admin/example` (NO CHANGES - no org context)

### Route Registration
**File:** `backend/src/server.js:63-68`
```javascript
fastify.register(authRoutes);      // No org prefix
fastify.register(configRoutes);     // Need org prefix
fastify.register(environmentRoutes); // Need org prefix
fastify.register(appRoutes);        // Need org prefix
fastify.register(parameterRoutes);  // Need org prefix
fastify.register(parameterValueRoutes); // Need org prefix
```

## Implementation Plan

### Step 1: Auto-Create Organization on First Login

**File:** `backend/src/plugins/auth.js` (lines 54-95)

Update the user creation logic to also create an organization:

**Current code (lines 62-72):**
```javascript
if (!user) {
  // First-time user - auto-create with USER role
  user = await fastify.prisma.user.create({
    data: {
      id: uuidv7(),
      supabaseId,
      email,
      displayName: email.split('@')[0],
      role: 'USER'
    },
    include: {
      organization: {
        select: { id: true, name: true }
      }
    }
  });
```

**New code:**
```javascript
if (!user) {
  // First-time user - auto-create with personal organization
  const orgId = uuidv7();

  // Create organization and user in transaction
  const result = await fastify.prisma.$transaction(async (tx) => {
    // Create personal organization
    const org = await tx.organization.create({
      data: {
        id: orgId,
        name: `${email.split('@')[0]}'s Organization`
      }
    });

    // Create user linked to organization
    const newUser = await tx.user.create({
      data: {
        id: uuidv7(),
        supabaseId,
        email,
        displayName: email.split('@')[0],
        role: 'OWNER', // Owner of their own org
        organizationId: orgId
      },
      include: {
        organization: {
          select: { id: true, name: true }
        }
      }
    });

    return newUser;
  });

  user = result;
  fastify.log.info({ userId: user.id, orgId, email }, 'New user and organization auto-created');
}
```

### Step 2: Update Route Registration (server.js)
**File:** `backend/src/server.js`

Add `prefix` option to route registration (except auth):
```javascript
// Auth routes - no prefix (no org context)
fastify.register(authRoutes);

// Org-scoped routes - all use /orgs/:orgId prefix
fastify.register(configRoutes, { prefix: '/orgs/:orgId' });
fastify.register(environmentRoutes, { prefix: '/orgs/:orgId' });
fastify.register(appRoutes, { prefix: '/orgs/:orgId' });
fastify.register(parameterRoutes, { prefix: '/orgs/:orgId' });
fastify.register(parameterValueRoutes, { prefix: '/orgs/:orgId' });
```

### Step 3: Update Each Route File

#### 3.1 apps.js
**Changes:**
- Remove orgId header/query extraction logic (lines 17, 65)
- Use `request.params.orgId` instead
- Remove orgId validation (lines 20-26, 68-74) - path param is required by default
- Update OpenAPI schemas to include orgId in params

**Before:**
```javascript
const orgId = request.headers['x-org-id'] || request.query.orgId;
if (!orgId) { return reply.code(400)... }
```

**After:**
```javascript
const { orgId } = request.params;
```

#### 3.2 environments.js
**Changes:**
- Remove orgId header/query extraction (lines 18, 58)
- Use `request.params.orgId`
- Remove orgId validation (lines 21-27, 61-67)
- Update OpenAPI schemas

#### 3.3 parameters.js
**Changes:**
- Remove orgId header/query extraction (lines 18, 82)
- Use `request.params.orgId`
- Remove orgId validation (lines 22-28, 85-91)
- **Keep appId as query param** (no change to line 19: `const appId = request.query.appId;`)
- Update OpenAPI schemas

#### 3.4 parameterValues.js
**Changes:**
- Remove orgId header extraction (lines 28, 109, 166)
- Use `request.params.orgId`
- No validation to remove (already missing explicit check)
- Update OpenAPI schemas

#### 3.5 config.js
**Changes:**
- Remove orgId header/query extraction (line 16)
- Use `request.params.orgId`
- Remove orgId validation (lines 19-25)
- Update OpenAPI schemas

#### 3.6 auth.js
**Changes:**
- Update `/auth/me` response to always include organization info
- Add organization ID to response for easy access

### Step 4: Update OpenAPI Schemas

**Files:** `backend/src/openapi/*.js`

For each route schema:

1. **Remove** query parameter schema for orgId:
```javascript
// REMOVE (if exists)
querystring: orgIdQuerySchema,
```

2. **Remove** header schema for orgId:
```javascript
// REMOVE
headers: orgIdSchema,
```

3. **Add** orgId to params:
```javascript
params: {
  type: 'object',
  required: ['orgId', ...existingParams],
  properties: {
    orgId: {
      type: 'string',
      pattern: UUID_V7_PATTERN,
      format: 'uuid',
      description: 'Organization ID'
    },
    ...existingProperties
  }
}
```

**Affected schema files:**
- `backend/src/openapi/appRoutes.js`
- `backend/src/openapi/environmentRoutes.js`
- `backend/src/openapi/parameterRoutes.js` - Keep appId in querystring
- `backend/src/openapi/parameterValueRoutes.js`
- `backend/src/openapi/configRoutes.js`

### Step 5: Update API.md Documentation

**File:** `API.md`

Update all curl examples and endpoint paths:

**Before:**
```bash
GET /apps?orgId=550e8400-e29b-41d4-a716-446655440000
```

**After:**
```bash
GET /orgs/550e8400-e29b-41d4-a716-446655440000/apps
```

Update for all org-scoped endpoints. Add section explaining auto-org creation on first login.

### Step 6: Update CLAUDE.md

**File:** `CLAUDE.md`

Update route structure documentation to reflect new patterns and auto-org creation behavior.

## New URL Structure

| Old Endpoint | New Endpoint |
|--------------|--------------|
| `GET /apps?orgId=X` | `GET /orgs/:orgId/apps` |
| `POST /apps?orgId=X` | `POST /orgs/:orgId/apps` |
| `GET /environments?orgId=X` | `GET /orgs/:orgId/environments` |
| `POST /environments?orgId=X` | `POST /orgs/:orgId/environments` |
| `GET /parameters?appId=A&orgId=X` | `GET /orgs/:orgId/parameters?appId=A` |
| `POST /parameters?orgId=X` | `POST /orgs/:orgId/parameters` |
| `GET /parameters/:appId/values` + header | `GET /orgs/:orgId/parameters/:appId/values` |
| `GET /parameters/values/:id` + header | `GET /orgs/:orgId/parameters/values/:id` |
| `PUT /parameters/values/:id` + header | `PUT /orgs/:orgId/parameters/values/:id` |
| `GET /config/:appId/:envId?orgId=X` | `GET /orgs/:orgId/config/:appId/:envId` |

**Auth routes unchanged:**
- `GET /auth/me` (but response now includes org)
- `POST /auth/admin/example`

## Benefits

✅ **HTTP Caching** - Cache keys include orgId in URL path
✅ **RESTful** - Resources properly scoped to organizations
✅ **Clear Semantics** - URL structure shows resource hierarchy
✅ **Simpler Code** - No dual extraction logic (header OR query)
✅ **Path Validation** - Fastify validates path params automatically
✅ **Auto Organization** - Users get personal org on first login

## Files to Modify

### Core Logic (2 files)
1. ✏️ `backend/src/plugins/auth.js` - Add auto-org creation on first login
2. ✏️ `backend/src/server.js` - Add prefix to route registration

### Route Files (5 files)
3. ✏️ `backend/src/routes/apps.js` - Remove header/query extraction, use params
4. ✏️ `backend/src/routes/environments.js` - Remove header/query extraction, use params
5. ✏️ `backend/src/routes/parameters.js` - Remove header/query extraction, use params (keep appId query)
6. ✏️ `backend/src/routes/parameterValues.js` - Remove header extraction, use params
7. ✏️ `backend/src/routes/config.js` - Remove header/query extraction, use params

### OpenAPI Schema Files (5 files)
8. ✏️ `backend/src/openapi/appRoutes.js` - Add orgId to params, remove query/header
9. ✏️ `backend/src/openapi/environmentRoutes.js` - Add orgId to params, remove query/header
10. ✏️ `backend/src/openapi/parameterRoutes.js` - Add orgId to params, remove header, keep appId query
11. ✏️ `backend/src/openapi/parameterValueRoutes.js` - Add orgId to params, remove header
12. ✏️ `backend/src/openapi/configRoutes.js` - Add orgId to params, remove query/header

### Documentation (2 files)
13. ✏️ `API.md` - Update all endpoint paths and curl examples
14. ✏️ `CLAUDE.md` - Update route structure and auto-org creation documentation

**Total:** 14 files

## Verification Steps

### 1. Start Supabase and Server
```bash
# Terminal 1 - Supabase
cd backend
npm run supabase:start

# Terminal 2 - Server
npm run dev
```

### 2. Register New User (Auto-Creates Org)
```bash
# Register new user - this will auto-create organization
curl -X POST 'http://127.0.0.1:54321/auth/v1/signup' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "password": "password123"}' \
  | jq -r '.access_token' > /tmp/token.txt

export TOKEN=$(cat /tmp/token.txt)
```

### 3. Get User Info and Extract Org ID
```bash
# Get user info (now includes organization)
curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq .

# Extract org ID
export ORG_ID=$(curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN" | jq -r '.organization.id')

echo "Organization ID: $ORG_ID"
```

### 4. Test New Endpoints

```bash
# Test apps
curl -s "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test create app
APP_RESPONSE=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/apps" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "test-app"}')
echo $APP_RESPONSE | jq .
export APP_ID=$(echo $APP_RESPONSE | jq -r '.id')

# Test environments
curl -s "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test create environment
ENV_RESPONSE=$(curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/environments" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "development"}')
echo $ENV_RESPONSE | jq .
export ENV_ID=$(echo $ENV_RESPONSE | jq -r '.id')

# Test create parameter
curl -s -X POST "http://localhost:3000/orgs/$ORG_ID/parameters" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"appId\": \"$APP_ID\", \"key\": \"DATABASE_URL\"}" | jq .

# Test list parameter values
curl -s "http://localhost:3000/orgs/$ORG_ID/parameters/$APP_ID/values" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Test config endpoint
curl -s "http://localhost:3000/orgs/$ORG_ID/config/$APP_ID/$ENV_ID" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 5. Verify OpenAPI Docs
```bash
# Check Swagger UI
open http://localhost:3000/docs
```

Verify all endpoints show `/orgs/{orgId}/...` paths.

### 6. Test Error Cases
```bash
# Invalid orgId format (should fail validation)
curl -s "http://localhost:3000/orgs/invalid-uuid/apps" \
  -H "Authorization: Bearer $TOKEN" | jq .

# Different user's org (should return 403 or empty)
curl -s "http://localhost:3000/orgs/999e8400-e29b-41d4-a716-446655440000/apps" \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 7. Test Auto-Org Creation
```bash
# Login with existing user from before refactoring (should get auto-org)
TOKEN2=$(curl -s -X POST 'http://127.0.0.1:54321/auth/v1/token?grant_type=password' \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password123"}' | jq -r '.access_token')

curl -s http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN2" | jq .
# Should now show organization field populated
```

## Risk Assessment

### Low Risk
- ✅ Breaking change but API is not in production yet
- ✅ Changes are systematic and repetitive
- ✅ Auth routes unchanged (no org context needed)
- ✅ Auto-org creation simplifies testing

### Medium Risk
- ⚠️ Need to update all curl examples in docs
- ⚠️ Frontend will need updates (if exists)
- ⚠️ Existing users without org will get one on next login
- ⚠️ Need to handle edge case: user already has org

### Mitigation
- 🔍 Thorough testing with verification script
- 📝 Clear documentation of new URL structure
- 🧪 Manual testing of each endpoint type
- 🛡️ Transaction for org creation (atomic)
- 📊 Check if user already has org before creating

## Notes

1. **No middleware needed** - Fastify path params are automatically extracted
2. **Schema reuse** - Can create reusable `orgIdPathParam` schema in `common.js`
3. **Backward compatibility** - NOT maintained (breaking change accepted)
4. **Organization ownership** - First user becomes OWNER of their personal org
5. **User role** - Changed from USER to OWNER for auto-created org
6. **Org naming** - Uses pattern: "{username}'s Organization"
