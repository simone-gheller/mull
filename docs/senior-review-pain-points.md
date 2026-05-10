# Senior Review Pain Points

Review date: 2026-05-09.
Last updated after audit trail, audit retention, and hashed invite tokens: 2026-05-10.

This file is a backlog/reference document. Items marked **Resolved** were valid findings at review time and have since been addressed.

## Resolved Since Review

1. **Resolved — parameter values were plaintext.**
   `ParameterValue.value` has been dropped. Values are now encrypted at rest with AES-256-GCM envelope encryption: value ciphertext/IV/tag, wrapped DEK ciphertext/IV/tag, `kekVersion`, `encryptionAlg`, and `encryptedAt`.

2. **Resolved — production authorization referenced removed `app.isSecret`.**
   Secret gating now checks parameter/environment secrecy. Grouped value reads redact row by row instead of gating the whole app.

3. **Resolved — blank child values shadowed ancestors.**
   `parameter_values.is_set` is now the explicit non-secret state flag. Empty string means unset/inherit, and `config_inheritance` filters `WHERE pv.is_set = true`.

4. **Partially resolved — `/parameters/resolved` contract was chaotic and frontend-heavy.**
   The backend now returns resolved definition relationship plus optional effective environment value state. The Parameters list and Project detail consume the new contract. Parameter Detail is compatible but still lacks a dedicated all-environment resolved detail endpoint.

5. **Partially resolved — no encryption safety net.**
   Unit tests cover envelope roundtrip and tamper/AAD failures. Integration tests cover parameter value encryption behavior and `/parameters/resolved` blank-child fallback.

6. **Resolved — toast infrastructure missing.**
   `ToastProvider` exists and wraps app routes. Adoption now covers the main app/environment/invite/org-save/export paths; some lower-priority paths may still need adoption.

7. **Resolved — mutating configuration was too permissive.**
   Creating apps, environments, parameters, and parameter overrides now requires `ADMIN` or `OWNER`.

8. **Resolved — non-secret parameter values could be updated by non-admin users.**
   `PUT /orgs/:orgId/parameters/values/:id` now requires `ADMIN` or `OWNER` for every value update, while read redaction and blank-as-inherit semantics are unchanged. This is a conservative policy until the permission model is redesigned with granular write capabilities.

9. **Resolved — additional organization creation was not transactional.**
   `POST /orgs` now creates the organization and owner membership in a single Prisma transaction.

10. **Resolved — invite acceptance could mutate existing membership role.**
   Invite acceptance now returns `409` when the authenticated user is already a member and does not update their role.

11. **Resolved — `/config` lacked direct integration coverage.**
   `GET /orgs/:orgId/config/:appId/:envId` now has an integration test covering inherited config and unset child overrides.

12. **Resolved — backend-down detection was missing.**
   Axios network errors now mark the backend as down, `AuthContext` polls `/health` every 10 seconds, and the app shows a sticky recovery banner until the API responds.

13. **Resolved — parameter export was a stub.**
   The app detail panel exports parameters to JSON with app metadata, timestamp, per-environment values, and completion/error toasts.

14. **Resolved — organization token settings showed fake data.**
   The org token tab now shows an honest unavailable state instead of static placeholder token rows.

15. **Resolved — billing and usage looked more mature than reality.**
   Billing now shows the current free plan and real member usage only; invoice/API-call placeholders were removed or marked coming soon.

16. **Resolved — `testMode` authentication was embedded in the production auth plugin.**
   Test authentication now lives in a separate test auth plugin. Production auth only contains the Supabase/JWT path.

17. **Resolved — UUIDv7 route and input validation was inconsistent.**
   UUIDv7 validation is now centralized through `uuidV7Param()`/`isUuidV7()` and applied to app-level params plus relevant query/body IDs across apps, environments, parameters, parameter values, config, org routes, and invite revocation. Invite tokens remain plain token strings because they are not UUIDs.

18. **Resolved/removed — `/dashboard/users` was considered missing.**
   This is no longer tracked as a product gap: `settings/profile` owns the session user surface, and `settings/org` owns organization and member management.

19. **Partially resolved — frontend app shipped as one large route bundle.**
   Route pages are now lazy-loaded with `React.lazy`/`Suspense`, producing route-level chunks. Bundle size should still be monitored as feature code grows.

20. **Resolved — audit logging was missing where it mattered most.**
   `AuditEvent` now records tenant-visible events for value updates/clears/rollback, secret reveal, config fetch, parameter export, invite lifecycle, org/app/environment/parameter mutations, and profile updates. Audit metadata is sanitized and does not store plaintext secret values or raw invite tokens.

21. **Resolved — organization audit was a visible placeholder.**
   `settings/org` now has a real audit tab backed by `GET /orgs/:orgId/audit-events` with pagination and filters for action, resource type, and outcome.

22. **Resolved — invite tokens were persisted in plaintext.**
   `OrgInvite` now stores `token_hash` only. Raw invite tokens exist only in the email/link and incoming request; preview and accept routes hash the received token before lookup.

## Current Critical Risks

7. The rendered config endpoint returns full config to any authenticated organization member. `GET /orgs/:orgId/config/:appId/:envId` is audited, but it still uses user JWT auth only, with no service tokens, scopes, or dedicated runtime role gate.

## Backend And Security Debt

12. API/service tokens are missing. A B2B config product needs scoped machine credentials for CI/CD, deploy systems, runtime config fetching, and rotation.

17. The `config_inheritance` raw SQL/view path is still high risk. It now has direct `/config` integration coverage, but the path still deserves care because it is raw SQL and returns the product's most sensitive output.

19. Secret masking and authorization are split across route decorators, route handlers, and frontend behavior. This should be centralized so the policy is easier to verify.

20. Key management is env-backed only. Local `.env` is acceptable for development, but production should move `MASTER_KEY_HEX`/KEK material to a managed secret store and define rotation/rewrap procedures.

## Frontend And Product Debt

24. Personal tokens are still a "coming soon" route.

28. The frontend has no automated tests. For current maturity, Playwright golden paths would be more valuable than component tests with heavy mocks.

29. Toast adoption is improved for main app, environment, invite, org-save, and export paths, but lower-priority paths should continue adopting it as they change.

30. Parameter Detail still makes multiple grouped-value calls and performs some fallback assembly client-side. A dedicated backend detail endpoint would simplify it and reduce duplicate logic.

## Testing And Developer Experience

31. Backend tests require local Supabase/Postgres and are not self-contained. They pass locally with Supabase active on `127.0.0.1:54322` and `.env` configured, but CI still needs an ephemeral database strategy.

32. Partially resolved: integration tests now cover role policy, config rendering, invite acceptance edge cases, encryption behavior, inheritance fallback, and the audit action matrix. Frontend route behavior and additional auth/role edge cases still need a quicker safety net.

33. Frontend production build succeeds, and route-level lazy loading now avoids a single route bundle. Chunk size should continue to be watched.

34. Build output for `frontend/app` is no longer one large JS file after lazy route splitting, but aggregate JS remains worth monitoring for the current feature set.

## Relevant Missing Features

35. Scoped org/app/environment API tokens with one-time display, hashed storage, rotation, revoke, last-used timestamp, and least-privilege scopes.

36. Member role-change auditing once role management ships.

38. Role and permission management: change role, remove member, transfer ownership, protect against removing/downgrading the last owner, and redesign the coarse `USER`/`ADMIN` split into explicit capabilities such as config read/write and secret read/write.

41. CI setup that can run backend integration tests against an ephemeral database.

42. E2E golden paths: signup, OTP verification, login, org switch, create app/environment/parameter, edit/clear/inherit value, invite accept.

43. Further bundle tuning beyond route-level lazy loading, including lazy-loading heavy dependencies used only on public/rare pages.
