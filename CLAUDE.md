# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeConfig is a secure configuration management system built with Node.js/Fastify and PostgreSQL. It implements envelope cryptography to securely store and manage sensitive configuration parameters.

## Key Commands

### Development
- `npm run dev` - Start development server with nodemon
- `npm start` - Start production server
- `npm test` - Run tests with Jest (uses experimental VM modules)

### Database
- `npm run migrate` - Run Prisma migrations
- `npm run generate` - Generate Prisma client
- `docker-compose up` - Start PostgreSQL database

### Environment Setup
- Requires `.env` file with `DATABASE_URL`, `MASTER_KEY_HEX` (64 hex chars), and `KEK_VERSION`
- Database runs on PostgreSQL (port 5432)
- **Supabase Local (Required for development)**:
  ```bash
  # Generate JWT signing key and convert to array format
  npx supabase gen signing-key --algorithm ES256 | jq '[.]' > supabase/signing_keys.json && npm run supabase:start
  ```
  - JWKS endpoint: `http://localhost:54321/auth/v1/.well-known/jwks.json`
- **Supabase Production**: Set `SUPABASE_PROJECT_REF` and `SUPABASE_URL` in `.env`
- **Google OAuth (Optional)**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`
  - If not configured, Google OAuth routes will log warnings but won't break the app

## Architecture

### Core Components

**Server (`backend/src/server.js`)**
- Fastify-based REST API server
- Runs on port 3000
- All routes require authentication except `/auth/*`
- Registers plugins: Prisma, JWT auth

**Cryptography (`backend/src/crypto/crypto.js`)**
- Envelope encryption using AES-256-GCM
- DEK (Data Encryption Key) wrapped with KEK (Key Encryption Key)
- Includes integrity verification via SHA-256 checksums

**Database Schema**
- Users with Supabase authentication
  - `supabaseId` unique identifier from Supabase Auth
  - `email` and `displayName` from authentication
  - `role` enum (USER/ADMIN/OWNER)
  - **Auto-organization creation**: First-time users automatically get a personal organization and become OWNER
- Organizations contain apps and environments
  - Users belong to one organization
  - Apps have hierarchical structure with parent-child relationships
- Apps containing parameters with inheritance support
- Environments (dev, staging, production, etc.)
- Parameters define configuration keys per app
- ParameterValues store actual values per parameter per environment

**App Hierarchy**
- Apps have hierarchical structure with parent-child relationships
- `ancestors` array tracks all parent apps
- `depth` field indicates level in hierarchy
- Parameter inheritance: child apps inherit from parents, can override values

**Authentication (`backend/src/plugins/auth.js`)**
- Supabase JWT token validation (ES256 algorithm) via JWKS
- Uses JWKS (JSON Web Key Set) for secure token verification in both local and production
- Local: JWKS URL `http://localhost:54321/auth/v1/.well-known/jwks.json`
- Production: JWKS URL `https://{project-ref}.supabase.co/auth/v1/.well-known/jwks.json`
- Auto-creates user + personal organization on first login
- New users become OWNER of their organization

### Route Structure

**Authentication Routes** (no org context):
- `GET /auth/me` - Get current user info (includes organization)
- `POST /auth/admin/example` - Example admin-only endpoint

**Organization-Scoped Routes** (all use `/orgs/:orgId` prefix):
- `GET /orgs/:orgId/apps` - List all apps
- `POST /orgs/:orgId/apps` - Create new app
- `GET /orgs/:orgId/environments` - List all environments
- `POST /orgs/:orgId/environments` - Create new environment (auto-syncs parameter values)
- `GET /orgs/:orgId/parameters?appId=X` - List parameters for an app
- `POST /orgs/:orgId/parameters` - Create new parameter (auto-creates values for all envs)
- `GET /orgs/:orgId/parameters/:appId/values` - List all parameter values for an app
- `GET /orgs/:orgId/parameters/values/:id` - Get single parameter value
- `PUT /orgs/:orgId/parameters/values/:id` - Update parameter value
- `GET /orgs/:orgId/config/:appId/:envId` - Get rendered config with inheritance

**Key Design Decisions**:
- Organization ID in URL path (not header/query) for HTTP caching compatibility
- RESTful resource scoping: `/orgs/:orgId/resource`
- `appId` kept as query param in `/parameters` for flexible filtering
- All endpoints validate organization access

### Security Model
- **Supabase JWT authentication** with ES256 tokens
- **Role-based access control** with OWNER > ADMIN > USER hierarchy
- **Organization-scoped security** - all resources isolated by organization
- **Path-based org context** - orgId in URL path for clear resource scoping
- **Auto-organization** - Users get personal organization on first login (become OWNER)
- **Cross-org protection** - All CRUD operations validate organization access

## Testing

Tests are located in `backend/tests/` and use Jest with Supertest for API testing. Run with `npm test` which includes experimental VM modules flag for ES6 module support.

### Test Infrastructure
- **Test Helpers (`tests/setup/testHelpers.js`)** - Authentication, API helpers, and fixture management
- **Fixtures (`tests/setup/fixtures.js`)** - Database fixtures for creating test data with proper cleanup
- **Global Setup (`tests/setup/globalSetup.js`)** - Test server initialization and database setup

### Test Coverage
- **Authentication & Authorization** (`auth.test.js`) - Login, registration, token refresh, role-based permissions
- **Project Management** (`projects.test.js`) - CRUD operations with comprehensive security testing
- **Parameter & Version Management** (`parameters.test.js`, `versions.test.js`) - Encrypted parameter versions with envelope cryptography
- **Invitation System** (`invitations.test.js`) - Organization invitation workflow and security
- **Cross-organizational Security** - Prevents unauthorized access across organization boundaries
- **Error Handling** - Proper HTTP status codes and meaningful error messages

### Key Test Features
- Comprehensive security testing for all endpoints
- Role-based permission validation (OWNER/ADMIN/MEMBER)
- Cross-organizational access prevention
- Proper error status codes (403 for unauthorized, 409 for conflicts)
- Cleanup mechanisms to prevent test pollution
- Readable logs with pino-pretty formatting