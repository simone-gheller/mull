# SafeConfig

Secure configuration management system. Store and manage sensitive parameters across apps and environments using envelope encryption.

## Architecture

```
safeconfig.io        → Landing page + auth (React + Vite)
app.safeconfig.io    → Dashboard (React + Vite)
api.safeconfig.io    → REST API (Fastify + PostgreSQL)
```

## Monorepo structure

```
safeconfig/
├── backend/     # Fastify REST API
├── frontend/    # React + Vite (landing + dashboard)
├── docs/        # Design documents
└── supabase/    # Local auth config
```

## Quick start

### 1. Start Supabase (auth)

```bash
cd backend
npx supabase gen signing-key --algorithm ES256 | jq '[.]' > ../supabase/signing_keys.json
npm run supabase:start
```

### 2. Start the API

```bash
cd backend
cp .env.example .env   # fill in DATABASE_URL, MASTER_KEY_HEX, etc.
npm install
npm run migrate
npm run dev            # http://localhost:3000
```

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev            # http://localhost:5174
```

## Docs

- [API reference](API.md)
- [Frontend](frontend/README.md)
- [ER model](docs/er-model.md)

## Key features

- **Envelope encryption** — AES-256-GCM with per-value DEK, wrapped by KEK
- **App hierarchy** — parent/child apps with parameter inheritance
- **Multi-environment** — dev, staging, production, or any custom env
- **Supabase auth** — JWT (ES256) via JWKS, works locally and in production
- **Role-based access** — OWNER / ADMIN / USER per organization
