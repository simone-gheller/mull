# SafeConfig Frontend

React + Vite frontend for SafeConfig. Contains both the marketing landing page and the authenticated dashboard.

## Deployment targets

| Route | Domain | Notes |
|-------|--------|-------|
| `/`, `/login`, `/register` | `safeconfig.io` | Public, SEO-relevant |
| `/dashboard/*` | `app.safeconfig.io` | Protected, no SEO needed |

Short term: deployed as a single app on `safeconfig.io`. Long term: split into two separate Vite apps sharing a component library.

## Tech Stack

- **React 18** with Vite
- **Tailwind CSS v4**
- **Framer Motion**
- **React Router**
- **React Hook Form + Zod**
- **Axios**

## Pages

### Public (`safeconfig.io`)
- `/` — Landing page: hero, features, pricing, CTA
- `/login` — Email/password + Google OAuth
- `/register` — Account creation

### Dashboard (`app.safeconfig.io`, protected)
- `/dashboard` — Overview and quick actions
- `/dashboard/projects` — App/project management
- `/dashboard/parameters` — Parameter listing with search and filtering
- `/dashboard/parameters/:id` — Version history and value management
- `/dashboard/users` — Team member management (admin only)

## Getting Started

```bash
npm install
npm run dev   # http://localhost:5174
npm run build
```

Environment variables (`.env`):
```bash
VITE_API_URL=http://localhost:3000
VITE_APP_URL=http://localhost:5174
```

## Known issues (must fix before production)

- **API misalignment** — `src/services/api.js` calls old endpoints (`/auth/login`, `/api/projects`). Must be updated to match current backend:
  - `/auth/login` → `/auth/signin`
  - `/api/projects` → `/orgs/:orgId/apps`
  - All org-scoped endpoints must use `/orgs/:orgId/` prefix
- **Auth flow** — `AuthContext.jsx` expects HttpOnly cookies from the server. Backend currently returns JSON tokens. Either add cookie support to backend (`POST /auth/signin` with `Set-Cookie`) or switch to `localStorage`/`sessionStorage` in the frontend.
- **Debug logs** — `AuthContext.jsx` has multiple `console.log` statements that must be removed before production.

## Project Structure

```
src/
├── components/
│   ├── ui/       # Reusable UI primitives (Button, Input, Card, Modal, Badge)
│   └── layout/   # Layout components
├── pages/        # Page components
├── context/      # AuthContext — auth state management
├── services/     # api.js — Axios HTTP client (needs alignment, see above)
├── hooks/        # Custom hooks
└── utils/        # Utility functions
```
