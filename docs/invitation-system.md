# Org Invitation System — Implementation Plan

## Flow

```
1. Admin apre Organization → Members
   └─ compila InviteBar: email + ruolo → click "send invite"

2. Frontend chiama POST /orgs/:orgId/invites
   └─ API (ADMIN+) crea record OrgInvite con token + status=PENDING
   └─ Backend invia email via nodemailer (mailpit locale porta 54325)
       └─ email contiene link: ${APP_URL}/invite/accept?token=${dbToken}

3. Utente apre la mail, clicca il link
   └─ Browser apre /invite/accept?token=abc123 (nessun hash, nessuna auto-auth)

4. InviteAcceptPage carica info invite (GET /invites/:token → orgName, role, email)
   └─ Mostra due opzioni:
       ├─ "ho già un account" → /login?invite=${token}
       └─ "sono nuovo" → /signup?invite=${token}&email=${invitedEmail}

5a. Percorso utente NUOVO (/signup?invite=token)
    ├─ Signup form: banner "You're joining [orgName] as [role]"
    ├─ Email pre-compilata dall'URL, org name default = "my org"
    ├─ Submit → supabase.auth.signUp() → OTP inviato da Supabase
    ├─ Salva token in sessionStorage('invite_token')
    ├─ Step OTP → supabase.auth.verifyOtp({ type: 'signup' })
    ├─ onAuthStateChange SIGNED_IN → fetchUserData()
    └─ Se sessionStorage ha 'invite_token' → POST /invites/accept { token }
        └─ aggiunge user all'org, marca invite ACCEPTED → dashboard

5b. Percorso utente ESISTENTE (/login?invite=token)
    ├─ Login form: banner "You're joining [orgName] as [role]"
    ├─ Login → onAuthStateChange SIGNED_IN
    └─ Se URL ha ?invite=token → POST /invites/accept { token }
        └─ aggiunge user all'org, marca invite ACCEPTED → dashboard

6. Revoca
   └─ DELETE /invites/:id → NON elimina il record, setta status=REVOKED
   └─ Nessuna pulizia Supabase necessaria (non viene mai chiamato inviteUserByEmail)

7. Scadenza
   └─ GET /invites/:token → se expiresAt < now E status=PENDING → ritorna 410
   └─ Nessun job di cleanup necessario (filtrato on-the-fly)
```

---

## Schema DB

```prisma
enum InviteStatus {
  PENDING
  ACCEPTED
  REVOKED
}

model OrgInvite {
  id         String       @id @db.Uuid
  orgId      String       @map("org_id") @db.Uuid
  email      String       @db.VarChar(255)
  role       UserRole     @default(USER)
  token      String       @unique @db.VarChar(128)
  invitedBy  String       @map("invited_by") @db.Uuid
  status     InviteStatus @default(PENDING)
  expiresAt  DateTime     @map("expires_at")
  resolvedAt DateTime?    @map("resolved_at") // set on ACCEPTED or REVOKED
  createdAt  DateTime     @default(now()) @map("created_at")

  org     Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
  inviter User         @relation("SentInvites", fields: [invitedBy], references: [id])

  @@unique([orgId, email])
  @@index([token])
  @@map("org_invites")
}
```

Aggiungere a `Organization`: `invites OrgInvite[]`
Aggiungere a `User`: `sentInvites OrgInvite[] @relation("SentInvites")`

---

## Backend

### Env vars

```
SMTP_HOST=127.0.0.1
SMTP_PORT=54325
SMTP_FROM=noreply@mull.app
APP_URL=http://localhost:5173
```

### `backend/src/plugins/mailer.js` (nuovo)

Plugin fastify-plugin con nodemailer. Decoratore `fastify.mailer` con `sendMail()`.
SMTP punta a mailpit locale (porta 54325). Nessun auth in locale.

### `backend/src/routes/orgs.js` — modifiche alle route invite

**POST `/invites`** — ADMIN+:
1. Controlla già membro → 409
2. Controlla invite PENDING non scaduto già esistente → 409
3. Cerca email in `public.users` (Prisma):
   - Trovato → direct add `user_organizations` → `{ type: 'added_directly' }`
   - Non trovato → crea OrgInvite, invia email, → `{ type: 'invite_sent' }`
4. Email inviata da `fastify.mailer`, link = `${APP_URL}/invite/accept?token=${token}`
5. **Non usare più `inviteUserByEmail`** — zero interazione con Supabase auth

**DELETE `/invites/:inviteId`** — ADMIN+:
- Trova invite (deve appartenere all'org)
- Setta `status = REVOKED`, `resolvedAt = now()`
- **Non elimina il record**
- Nessuna pulizia utente Supabase (non è stato creato nessun auth.user)

**GET `/invites`** — ADMIN+:
- Filtra `status = PENDING` e `expiresAt > now`

### `backend/src/routes/invitations.js` — route pubbliche

**GET `/invites/:token`** — no auth:
- Trova OrgInvite by token
- Se `status = REVOKED` → 410 `{ error: 'Gone', message: 'Invitation was revoked' }`
- Se `status = ACCEPTED` → 410 `{ error: 'Gone', message: 'Invitation already used' }`
- Se `status = PENDING` ma `expiresAt < now` → 410 `{ error: 'Gone', message: 'Invitation has expired' }`
- Ritorna `{ orgName, inviterEmail, role, email, expiresAt }`

**POST `/invites/accept`** — richiede auth:
- Body: `{ token: string }`
- Trova invite by token, verifica status PENDING + non scaduto
- Verifica `invite.email === request.user.email` → 403 con `invitedEmail` se mismatch
- `$transaction`:
  - upsert `user_organizations`
  - UPDATE `org_invites` SET `status=ACCEPTED`, `resolvedAt=now()`
- Ritorna `{ orgId, orgName, role }`

### `backend/src/server.js`

Registrare `mailerPlugin` e `invitationRoutes`.

---

## Frontend

### `frontend/app/src/services/api.js`

```js
getInvites()                  // GET /orgs/:orgId/invites
sendInvite({ email, role })   // POST /orgs/:orgId/invites
revokeInvite(id)              // DELETE /orgs/:orgId/invites/:id
getInviteByToken(token)       // GET /invites/:token  (public)
acceptInvite(token)           // POST /invites/accept { token }
```

### `frontend/app/src/hooks/useInvites.js`

Espone `{ invites, loading, error, sendInvite, revokeInvite }`.
`revokeInvite` aggiorna la lista locale (filtra per id).

### `frontend/app/src/pages/OrgSettingsPage.jsx`

InviteBar e Pending Invites già wireati — solo rinominare `cancelInvite` → `revokeInvite`.

### `frontend/app/src/pages/InviteAcceptPage.jsx` (nuova, public route)

- Legge `token` da URLSearchParams
- Carica info invite via `getInviteByToken(token)` (no auth richiesta)
- Loading / errore (revocato, scaduto, non trovato) con messaggi specifici
- Se invite valido: mostra orgName + role + due bottoni:
  - "I already have an account" → navigate(`/login?invite=${token}`)
  - "Create account" → navigate(`/signup?invite=${token}&email=${invite.email}`)

### `frontend/app/src/pages/Signup.jsx` — modifiche

- Se URL ha `?invite=token`:
  - Legge `?email` e pre-compila il campo email (readonly)
  - Legge il token, chiama `getInviteByToken(token)` → mostra banner "Joining [orgName] as [role]"
  - Salva `invite_token` in `sessionStorage` prima di submitS
  - Org name field: valore di default `"my org"` (indipendentemente dall'invite)
- Dopo `verifyOtp` success + session attiva:
  - Se `sessionStorage.getItem('invite_token')`: chiama `acceptInvite(token)` → `switchOrg(result.orgId)`
  - Rimuove `invite_token` da sessionStorage
  - Navigate `/dashboard`

### `frontend/app/src/pages/Login.jsx` — modifiche

- Se URL ha `?invite=token`:
  - Legge token, chiama `getInviteByToken(token)` → mostra banner
- Dopo login success:
  - Se URL ha `?invite`: chiama `acceptInvite(token)` → `switchOrg(result.orgId)`
  - Navigate `/dashboard`

### `frontend/app/src/App.jsx`

```jsx
<Route path="/invite/accept" element={<InviteAcceptPage />} />
```
Fuori da `ProtectedRoute`. Rimuovere `/onboarding/set-password` (non serve più — Supabase gestisce la password al signup normale).

---

## Supabase config

Nessuna modifica — non usiamo più `inviteUserByEmail`. Il `site_url` rimane `http://localhost:5173` (già aggiornato).

---

## Email invite (template HTML)

Stile identico a `confirmation.html` (dark, branded).
Contiene: nome org, ruolo, link cliccabile a `/invite/accept?token=${token}`.
**Nessun OTP code** — l'email ha solo il link, non un codice da digitare.
L'OTP del signup è quello di Supabase (via email separata al momento del signUp).

---

## Verification

| Scenario | Risultato atteso |
|----------|-----------------|
| Invite → nuovo utente | Email ricevuta → link → InviteAcceptPage → signup con banner → OTP → acceptInvite → dashboard nell'org invitata |
| Invite → utente esistente | Link → InviteAcceptPage → login con banner → acceptInvite → dashboard |
| Invite → utente già membro | 409 al POST /invites |
| Revoca | Record REVOKED, link → 410 "Invitation was revoked" |
| Scadenza | 410 "Invitation has expired" |
| Stesso email, re-invite dopo revoca | Nuovo invite PENDING possibile (vecchio è REVOKED, non c'è più @@unique conflict su email+orgId per PENDING) |

---

## Note tecniche

- **Nessun `inviteUserByEmail`** → nessun orphan in `auth.users` → nessun problema di sessione auto-attivata
- **Email via nodemailer → mailpit** (porta 54325 locale)
- **`@@unique([orgId, email])`** → diventa un problema se si vuole re-invitare dopo revoca. Soluzione: cambiare il constraint in un indice parziale `WHERE status = 'PENDING'`, oppure controllare solo via query (e non avere il unique constraint su email+orgId).
- La verifica "è già un pending invite?" avviene via query (`status=PENDING AND expiresAt > now`), non via unique constraint → rimuovere `@@unique([orgId, email])` dallo schema, tenere solo `@@index([orgId])`.
