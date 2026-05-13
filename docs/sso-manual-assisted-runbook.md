# Manual-Assisted SSO Runbook

Enterprise SSO is available only for Business and Custom organizations. In v1, mull stores and enforces the organization SSO policy, while the initial SAML provider is created by a mull admin in Supabase.

## Setup

1. Collect the customer's SAML metadata URL or XML from their IdP.
2. Create the SAML provider in Supabase Auth using the project SSO administration workflow.
3. Copy the generated `sso_provider_id`.
4. In mull org settings, set:
   - provider name
   - `sso_provider_id`
   - verified email domains
   - connection status `ACTIVE`
5. Set SSO mode to `OPTIONAL` and verify a test login.
6. After the customer confirms access, switch mode to `REQUIRED`.

## Operational Notes

- Do not delete SSO settings on downgrade; enforcement is suspended until the org returns to Business or Custom.
- Keep owner password fallback enabled unless the customer explicitly requests strict lockout behavior.
- Social OAuth providers such as Google and GitHub are personal login methods and do not satisfy `REQUIRED` company SSO.
