# @mull/app

Stack: React 19 + Vite + react-router-dom  
Design system: sempre `@mull/ui` — mai duplicare componenti UI.  
Tema: `useTheme()` → `{ T, mode, toggle }`. Tutti i colori da `T.*`, mai hex hardcoded.

## Struttura pagine (route reali)

```
/login          → pages/Login.jsx
/signup         → pages/Signup.jsx          ← due step inline (form + OTP)
/oauth/callback → pages/OAuthCallback.jsx
/verify-email   → RIMOSSA (ora inline in /signup)

/dashboard      → components/layout/Layout.jsx (ProtectedRoute)
  index         → pages/Dashboard.jsx
  /projects     → pages/Projects.jsx
  /parameters   → pages/Parameters.jsx
  /parameters/:parameterId → pages/ParameterDetail.jsx
  /environments → pages/Environments.jsx
  /users        → coming soon (inline placeholder)

/settings       → components/layout/SettingsLayout.jsx (ProtectedRoute)
  index         → redirect a /settings/profile
  /profile      → pages/ProfilePage.jsx
  /security     → coming soon
  /tokens       → coming soon
  /org          → pages/OrgSettingsPage.jsx
```

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

## Convenzioni

- Un file per pagina in `src/pages/`
- Componenti specifici dell'app in `src/components/`
- Niente logica di business nei componenti UI — chiamate API solo nei page component o in hook dedicati
- `sessionStorage` per stato temporaneo di registrazione (`signup_step`, `signup_email`)
- `localStorage` per preferenze persistenti (`active_org_id`)
