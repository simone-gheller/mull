# Documentation Map

Last updated: 2026-05-11.

This folder is organized by the kind of question each document answers.

## Current System References

- [API reference](API.md) — implemented REST endpoints, auth, access keys, config rendering, and operational notes.
- [Current ER model](er-model.md) — implemented Prisma/Postgres model and invariants.
- [Access key identity walkthrough](access-key-identity-walkthrough.md) — how PATs, service tokens, `Identity`, `AccessKey`, `request.auth`, scopes, and `/auth/whoami` fit together.
- [Invitation system](invitation-system.md) — invite token hashing, preview, accept, and email flow.

## Implementation Notes And Plans

- [Access key identity plan](access-key-identity-plan.md) — implementation plan that produced the current access-key feature; OIDC remains future work.
- [Envelope encryption implementation plan](envelope-encryption-implementation-plan.md) — historical plan for encrypted parameter values.
- [Resolved parameters redesign plan](resolved-parameters-redesign-plan.md) — resolved parameter inheritance design notes.

## Product, Review, And Design Backlog

- [Senior review pain points](senior-review-pain-points.md) — current security/product debt and resolved review findings.
- [UI redesign](ui-redesign.md) — design review notes and visual/product polish backlog.
- [Competitors](competitors.md) — competitor research notes.

## File Groups For This Branch

Access key + identity work in this branch is grouped as:

- Backend schema and auth: `backend/prisma/`, `backend/src/plugins/`, `backend/src/lib/accessKeys.js`
- Backend API routes: `backend/src/routes/accessKeys.js`, `backend/src/routes/auth.js`, scoped config/parameter/app/environment routes
- Frontend UI: `frontend/app/src/components/settings/AccessKeysPanel.jsx`, token settings pages, API service methods
- Tests: `backend/tests/unit/accessKeys.test.js`, `backend/tests/integration/accessKeys.test.js`
- Documentation: this docs folder plus root `README.md`, `AGENTS.md`, and `CLAUDE.md`
