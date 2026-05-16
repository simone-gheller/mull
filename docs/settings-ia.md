# Settings Information Architecture

Last updated: 2026-05-16.

This document describes the current route structure and UI layout for the settings area of the vextis dashboard.

---

## Route Split: `/account` vs `/settings`

Settings are split into two route trees based on scope:

| Tree | Scope | Entry point |
|------|-------|-------------|
| `/account/*` | Personal — affects only the current user | `/account/profile` |
| `/settings/*` | Organization — affects all org members | `/settings/org` |

### Why the split

Before this redesign all personal pages (`profile`, `security`, `tokens`) lived under `/settings` alongside the org settings page. This created scope confusion: the sidebar "settings" entry opened the user's personal profile rather than org configuration. The split makes the boundary explicit.

Old routes are kept as backward-compatible redirects:

```
/settings/profile  → /account/profile
/settings/security → /account/security
/settings/tokens   → /account/tokens
/settings          → /settings/org
```

---

## `/account` Pages

### `/account/profile` — ProfilePage

- Profile hero (avatar, display name, role badge, email)
- Personal Information form (display name + read-only email)
- Organizations list — all orgs the user belongs to, with role badge; active org highlighted
- Danger Zone — disabled "delete account" button

### `/account/security` — SecurityPage

Single page combining authentication settings and active sessions.

**Password + Auth Methods card:**
- Password section: `+ reset password` button sends a `resetPasswordForEmail` email
- Authentication Methods: toggle rows for Email, GitHub, Google with provider icons
  - Toggle on = linked; toggle off = unlink (guarded: cannot remove last identity)
  - Email toggle disabled if already linked (toggle linking would re-send password reset)

**Active Sessions section:**
- Table columns: `id · agent · os · accessed · (action)`
- **Browser session row**: decoded from `supabase.auth.getSession()` — `session_id` JWT claim as ID (first 10 hex chars, dashes stripped), `browser` for agent, OS from `navigator.userAgent`, `CURRENT` badge
- **CLI session rows**: from `GET /auth/access-keys` filtered to `source === 'CLI'` and not revoked — `tokenPrefix` as ID, `cli` for agent, OS parsed from `"hostname · macOS"` name suffix, last used date, inline revoke
- Inline revoke: clicking "revoke" shows `yes / no` buttons inline (no native `confirm()` dialog)
- Revoked sessions are filtered out on load and removed from local state on revoke

### `/account/tokens` — PersonalTokensPage

Manual personal access tokens only. CLI sessions (`source='CLI'`) are excluded from this view — they appear on the Security page instead.

---

## `/settings` Pages

### `/settings/org` — OrgSettingsPage

The sidebar always renders the org settings sub-items as nested nav links:

```
◎ org settings
  members
  roles
  tokens
  billing
  audit
  settings
```

Active tab state is driven by `?tab=` search param (`useSearchParams` from react-router-dom). Clicking a sub-item sets the param; refreshing the page restores the correct tab. Default tab: `settings`.

Content is full-width (no two-column layout inside the page — the sidebar provides navigation).

---

## Sidebar Behavior

`Sidebar.jsx` reads `location.pathname` and `location.search` to compute:

- `isOrgSettings` — true when path is `/settings/org`
- `activeTab` — the `?tab=` value, used to highlight the active sub-item

The org sub-items are **always visible** (not collapsed), so the org navigation structure is immediately apparent without a click to expand.

---

## Header User Menu

The user menu dropdown links:

| Label | Route |
|-------|-------|
| profile settings | `/account/profile` |
| security | `/account/security` |
| personal tokens | `/account/tokens` |
