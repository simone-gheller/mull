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
- Users with hybrid authentication (password + Google OAuth)
  - `authProvider` enum (PASSWORD/GOOGLE)
  - `googleId` for Google account linking
  - `displayName` from OAuth providers
- Organizations with role-based memberships (OWNER/ADMIN/MEMBER)
- Projects containing parameters with inheritance support (parentProjectId)
- Versioned parameter values with envelope encryption fields
- Session management with device tracking and authentication provider tracking
- Invitation system for organization membership
- Audit logging for all operations

**Project Inheritance (`backend/src/services/inheritance.js`)**
- Hierarchical project structure with parent-child relationships
- Parameter inheritance with child overrides
- Circular dependency detection
- Inheritance chain resolution for parameter lookups

**Google OAuth Integration (`backend/src/services/googleOAuth.js`)**
- Invitation-preserving OAuth flow (users still need invitations)
- State parameter validation with CSRF protection
- Account linking for existing users
- Organization creation for owner registration
- Email verification requirements
- Support for login, registration, and invitation acceptance flows

### Route Structure
- `/api/parameters` - CRUD for configuration parameters (requires project access)
- `/api/projects` - Project management (create requires ADMIN+, delete requires ADMIN+)
- `/api/users` - User management
- `/api/versions` - Parameter version management with encryption/decryption
- `/auth/register` - User registration (creates new organization)
- `/auth/login` - User authentication (smart login for already-authenticated users)
- `/auth/refresh` - Token refresh with unique identifiers
- `/auth/logout` - Session termination
- `/auth/invitations` - Organization invitation management
- `/auth/google` - Google OAuth initiation (supports login, register, invitation flows)
- `/auth/google/callback` - Google OAuth callback handler
- `/auth/google/link` - Link Google account to existing authenticated user

### Security Model
- **JWT-based authentication** with unique token identifiers (jti) to prevent duplicate tokens
- **Role-based access control** with OWNER > ADMIN > MEMBER hierarchy
- **Organization-scoped security** - all resources are isolated by organization membership
- **Comprehensive authorization** - all CRUD operations validate user permissions and organization access
- **Envelope encryption** for all sensitive data using AES-256-GCM
- **Associated Authenticated Data (AAD)** includes projectId|paramName|versionTag for integrity
- **Master key rotation** support via KEK versioning
- **Bcrypt password hashing** for secure credential storage

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