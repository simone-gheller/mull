# @vextis/app

Stack: React 19 + Vite + react-router-dom  
Design system: sempre `@vextis/ui` — mai duplicare componenti UI.  
Tema: `useTheme()` → `{ T, mode, toggle }`. Tutti i colori da `T.*`, mai hex hardcoded.

## Struttura pagine (route reali)

```
/login          → pages/Login.jsx
/signup         → pages/Signup.jsx          ← due step inline (form + OTP)
/cli-auth       → pages/CliAuth.jsx         ← conferma device flow CLI (public)
/oauth/callback → pages/OAuthCallback.jsx
/invite/accept  → pages/InviteAcceptPage.jsx
/verify-email   → RIMOSSA (ora inline in /signup)

/dashboard      → components/layout/Layout.jsx (ProtectedRoute)
  index         → pages/Dashboard.jsx
  /apps         → pages/Projects.jsx
  /parameters   → pages/Parameters.jsx
  /:orgSlug/:appSlug/parameters/:paramKey → pages/ParameterDetail.jsx
  /environments → pages/Environments.jsx

/account        → components/layout/Layout.jsx (ProtectedRoute)  ← account personale
  index         → redirect a /account/profile
  /profile      → pages/ProfilePage.jsx      (nome, email, org list, danger zone)
  /security     → pages/SecurityPage.jsx     (password reset, OAuth, sessioni browser + CLI)
  /tokens       → pages/PersonalTokensPage.jsx (PAT manuali — NON sessioni CLI)

/settings       → components/layout/Layout.jsx (ProtectedRoute)  ← solo org settings
  index         → redirect a /settings/org
  /org          → pages/OrgSettingsPage.jsx  (tab: members, roles, tokens, billing, audit, settings)
  /profile      → redirect a /account/profile   (backward compat)
  /security     → redirect a /account/security  (backward compat)
  /tokens       → redirect a /account/tokens    (backward compat)
```

**Sidebar:** "org settings" è il punto di ingresso org; le sottovoci (members · roles · tokens · billing · audit · settings) sono sempre visibili come nav annidata. Lo stato tab attivo viene letto da `?tab=` via `useSearchParams` sia nella sidebar che in `OrgSettingsPage`.

**Header user menu:** punta a `/account/profile`, `/account/security`, `/account/tokens`.

## Auth e contesto globale

`context/AuthContext.jsx` espone via `useAuth()`:
- `user` — oggetto Supabase user (email, user_metadata.display_name, ecc.)
- `orgs` — array `[{id, name, role}]` da `/auth/me`
- `orgId` — org attiva (string UUID o null)
- `isAuthenticated` / `loading` / `error`
- `login({ email, password })` → `{ success, error? }`
- `register({ email, password, displayName, organizationName })` → `{ success, sessionCreated }`
- `verifyOtp({ email, token })` → `{ success, error? }`
- `switchOrg(orgId)` — aggiorna localStorage + apiService
- `logout()`
- `clearError()` — **stabilizzato con useCallback([])**, usare come dependency in useEffect senza loop

Quando `isAuthenticated` diventa true, tutti i dati utente e org sono disponibili.  
Se il backend API non risponde, `orgs` è `[]` e l'app funziona parzialmente (vedi TODO in CLAUDE.md root).

## Chiamate API

- `lib/api.js` — axios client, base URL da `VITE_API_URL` (default `http://localhost:3000`), token Bearer impostato via `setToken()`
- `services/api.js` — `ApiService` singleton con metodi per ogni risorsa; usa `this.orgId` (impostato da `AuthContext` via `apiService.setOrgId()`)
- `lib/supabase.js` — client Supabase per auth (signUp, signIn, verifyOtp, OAuth)

## Parameters UI contract

La pagina `Parameters.jsx` usa `apiService.getResolvedParameters(appId, environmentId)` come sorgente principale. Il backend ritorna `items[]` con:
- `relationship`: `local` | `inherited` | `override`, cioè dove vive la definizione del parametro.
- `parameter`: definizione vincente (`id`, `appId`, `appName`, `description`, `isSecret`).
- `overridden`: ancestor sovrascritto, solo per `override`.
- `value`: stato effettivo nell'environment selezionato.

`value.state` può essere:
- `set`: valore effettivo dalla app corrente.
- `inherited`: valore effettivo da ancestor.
- `unset`: nessun valore settato nella chain.
- `redacted`: esiste un valore secret ma l'utente non può leggerlo.

Semantica prodotto: `''` non è un valore intenzionale. Salvare stringa vuota significa unset locale e riattiva l'ereditarietà. Il flag pubblico è `isSet`; non dedurre mai ereditarietà da `value === ''`.

`GET /parameters/:appId/values` ritorna valori per environment raggruppati come oggetto, non array. Ogni value include `isSet`; `value` può essere `null` se unset o redatto.

## Toasts

`ToastProvider` è già montato in `App.jsx`; usare `useToast()` per nuove azioni. Ad oggi non tutti i flussi create/delete/export/error lo usano ancora.

## Convenzioni

- Un file per pagina in `src/pages/`
- Componenti specifici dell'app in `src/components/`
- Niente logica di business nei componenti UI — chiamate API solo nei page component o in hook dedicati
- `sessionStorage` per stato temporaneo di registrazione (`signup_step`, `signup_email`)
- `localStorage` per preferenze persistenti (`active_org_id`)
