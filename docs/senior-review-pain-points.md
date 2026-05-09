# Senior Review Pain Points

Review date: 2026-05-09.

## Critical

1. Parameter values are stored in plaintext. The product positioning promises secure configuration and envelope encryption, but `ParameterValue.value` is currently plain `TEXT`, and the required `MASTER_KEY_HEX` is not used in the value read/write path.

2. The rendered config endpoint returns full config to any authenticated organization member. `GET /orgs/:orgId/config/:appId/:envId` is the product's most sensitive API, but it currently uses user JWT auth only, with no service tokens, scopes, audit logging, or role gate.

3. Production authorization has a schema drift bug. `requireRole(..., { onlyIfSecret: true })` still reads `app.isSecret`, but that field has been removed from the Prisma schema. Some value routes can therefore fail at runtime.

4. Mutating configuration is too permissive. Regular `USER` members can create apps, environments, and parameters because the create routes only require authentication and organization membership.

5. Non-secret parameter values can be updated by non-admin users. `PUT /parameters/values/:id` only enforces `ADMIN` when the value is considered secret, which is risky for config integrity.

6. Audit logging is missing where it matters most. Updating values, revealing secrets, exporting parameters, accepting invites, and fetching rendered config should create durable audit events.

7. Version history and rollback are missing. The UI shows a history placeholder, but there is no backend model or route to inspect previous values or restore one.

## Backend And Security Debt

8. API/service tokens are missing. A B2B config product needs scoped machine credentials for CI/CD, deploy systems, runtime config fetching, and rotation.

9. Organization creation is not transactional. `POST /orgs` creates the organization and membership in separate writes, so partial failure can leave an orphan organization.

10. Invite acceptance can update existing membership role through an upsert. Even if normal invite creation prevents inviting an existing member, the accept endpoint should avoid surprising role mutation.

11. `testMode` authentication is embedded in the production auth plugin. This makes the auth plugin harder to reason about and keeps test-only behavior inside production code.

12. UUID validation appears to rely mostly on OpenAPI `format: uuid`, not a consistently enforced UUIDv7 invariant at the route boundary.

13. The `config_inheritance` raw SQL/view path is one of the riskiest backend paths and is not covered by tests.

14. Secret reveal is not audited. For a security product, reveal should be a visible, intentional, logged event.

15. Secret masking and authorization are split across route decorators, route handlers, and frontend behavior. This should be centralized so the policy is easier to verify.

## Frontend And Product Debt

16. Backend-down detection is not implemented. Axios has no response interceptor for network errors, and `AuthContext` silently treats failed `/auth/me` calls as missing user data.

17. The app can show an authenticated shell with empty organizations when the backend is unreachable. This creates the `'...'` org-name/failing-dashboard state described in the backlog.

18. Parameter export is still a stub in `Projects.jsx`.

19. Organization API tokens in settings are static placeholder rows, not real data.

20. Personal tokens are still a "coming soon" route.

21. The security page contains placeholder sessions and disabled actions for password, 2FA, session revoke, and account deletion.

22. Organization audit is a visible placeholder.

23. Billing and usage are placeholder-like and may communicate more product maturity than exists.

24. `/dashboard/users` exists conceptually and `Users.jsx` exists, but the current router does not expose it.

25. The frontend has no automated tests. For the current maturity, Playwright golden paths would be more valuable than component tests with heavy mocks.

26. Toasts exist now, but not every create/delete/export/error path consistently uses them.

## Testing And Developer Experience

27. Backend tests require local Supabase/Postgres and are not self-contained. In the reviewed environment they failed with `connect EPERM 127.0.0.1:54322`.

28. There is no quick unit-level safety net for auth/role policy, encryption behavior, config rendering, or invite acceptance edge cases.

29. Frontend production build succeeds, but the app bundle is a single large JavaScript chunk.

30. Build output for `frontend/app` is about 703 kB raw / 201 kB gzip for JS. This is not catastrophic, but it is high for the current feature set.

## Relevant Missing Features

31. Envelope encryption at rest with ciphertext, IV, auth tag, wrapped DEK, KEK version, checksum, and migration for existing plaintext values.

32. Scoped org/app/environment API tokens with one-time display, hashed storage, rotation, revoke, last-used timestamp, and least-privilege scopes.

33. Audit log model and UI for value changes, secret reveal, config fetch, export, invite lifecycle, member role changes, token creation, and token revoke.

34. Version history and manual rollback for parameter values.

35. Role management: change role, remove member, transfer ownership, and protect against removing/downgrading the last owner.

36. Backend unreachable banner and recovery polling.

37. Export parameters to JSON from the app detail panel.

38. CI setup that can run backend integration tests against an ephemeral database.

39. E2E golden paths: signup, OTP verification, login, org switch, create app/environment/parameter, edit value, invite accept.

40. Bundle splitting by route and removal or lazy-loading of heavy dependencies used only on public/rare pages.
