# CLI Walkthrough

This document explains the mull CLI: what it is, how auth works, what commands are available, and how the pieces connect.

## What We Built

A standalone CLI (`mull`) for SafeConfig, distributed as a self-contained binary built with Bun. Developers can use it to authenticate, inspect configuration, and set parameter values without opening the web app.

```bash
curl -fsSL https://raw.githubusercontent.com/sgheller/safeconfig/main/cli/scripts/install.sh | bash
```

---

## Auth: Device Flow

The CLI uses a browser-based device flow — the same pattern as GitHub CLI and Vercel CLI. No password is typed into the terminal.

### Flow

```
mull auth login
  │
  ├─ POST /cli/device-code  { deviceName: hostname }
  │    └─ server creates CliDeviceCode, stores SHA256(deviceCode), returns raw deviceCode + id
  │
  ├─ CLI opens browser → https://app.safeconfig.io/cli-auth?code=<id>
  │    └─ user logs in, selects org, clicks "Authorize"
  │    └─ browser calls POST /cli/device-code/<id>/approve  { orgId }
  │         └─ server writes approvedAt + approvedByUserId + orgId (no token yet)
  │
  └─ CLI polls GET /cli/device-code/<id>/status?secret=<deviceCode>  every 2s
       ├─ pending  → keep polling
       └─ approved → server creates AccessKey (source='CLI') inside a transaction,
                     marks consumedAt, returns token once
                     CLI saves token in ~/.mull/config.json (chmod 600)
```

### Security properties

| Property | Implementation |
|----------|----------------|
| Token never in DB | Created at poll time, returned once, `consumedAt` set immediately |
| Device code secret | Random 32 bytes; only SHA256 hash stored in `cli_device_codes` |
| File security | `~/.mull/config.json` chmod 600 |
| Session TTL | 90 days, revocable from web app |
| Rate limits | 5 req/min POST, 30 req/min GET status |

### CLI session vs API token

Both are `AccessKey` records in the same table. The `source` field separates them:

- `source='CLI'` → created by device flow, shown as "CLI sessions" in web app
- `source='MANUAL'` → created manually in settings, shown as "API tokens"

---

## Config File

```json
// ~/.mull/config.json  (chmod 600)
{
  "apiUrl": "https://api.safeconfig.io",
  "email": "user@example.com",
  "orgs": {
    "<orgId>": { "token": "mull_pat_...", "name": "Acme Corp" }
  },
  "activeOrgId": "<orgId>"
}
```

Multiple orgs are supported. `activeOrgId` determines which org and token are used for all commands.

---

## Commands

### Auth

```bash
mull auth login       # device flow: opens browser, polls until approved
mull auth logout      # removes active org from config
mull auth logout --all  # clears all orgs
mull auth whoami      # shows email, org, role, credential type
```

### Resources

```bash
mull apps             # list apps in the active org (with hierarchy depth)
mull envs             # list environments (name, tier, protected)

mull params list --app <name>               # list parameter keys + descriptions
mull params list --app <name> --env <name>  # list keys with resolved values
mull params set <key> --app <name> --env <name>  # set a value (prompts, hidden input)

mull config pull --app <name> --env <name>             # .env to stdout
mull config pull --app <name> --env <name> --output .env  # write to file
mull config pull --app <name> --env <name> --json      # JSON format
```

### Meta

```bash
mull version   # print CLI version
mull update    # download and install latest release
mull help      # show usage
```

---

## Backend Changes

### New model: `CliDeviceCode`

```prisma
model CliDeviceCode {
  id               String    @id @db.Uuid
  deviceCodeHash   String    @unique   // SHA256 of the raw secret
  deviceName       String              // hostname of the machine
  expiresAt        DateTime
  approvedAt       DateTime?
  approvedByUserId String?   @db.Uuid
  orgId            String?   @db.Uuid
  consumedAt       DateTime?           // set when token is delivered; blocks re-use
  createdAt        DateTime  @default(now())
  @@map("cli_device_codes")
}
```

### Updated model: `AccessKey.source`

```prisma
source  String  @default("MANUAL") @db.VarChar(16)
```

### New file: `backend/src/lib/identities.js`

`findOrCreateUserIdentity` was extracted from `accessKeys.js` and is now shared between `accessKeys.js` and `cliAuth.js`. It looks up an existing `Identity` for a user+org pair or creates one if none exists.

### New file: `backend/src/routes/cliAuth.js`

Four endpoints:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| `POST` | `/cli/device-code` | none | Start device flow |
| `GET` | `/cli/device-code/:id` | none | Get device name for confirm page |
| `GET` | `/cli/device-code/:id/status` | none (secret in query) | Poll for approval; delivers token once |
| `POST` | `/cli/device-code/:id/approve` | Supabase JWT only | Approve from browser |

---

## Frontend Changes

### New page: `CliAuth.jsx` at `/cli-auth`

Public route (no ProtectedRoute wrapper). Reads `?code=<id>` from the URL.

States:
1. **Loading** — waiting for auth context
2. **Not authenticated** — inline login form with "Authorize mull CLI" header
3. **Org selection** — dropdown if user has multiple orgs
4. **Confirm** — shows device name fetched from `GET /cli/device-code/:id`, "Authorize" button
5. **Success** — "Authorized. You can close this window."
6. **Error** — code not found, expired, or already used

---

## CLI Project Structure

```
cli/
├── src/
│   ├── index.ts              # entry point + command routing
│   ├── constants.ts          # VERSION, API_URL, APP_URL — inlined at build time
│   ├── commands/
│   │   ├── auth/
│   │   │   ├── login.ts      # device flow
│   │   │   ├── logout.ts
│   │   │   └── whoami.ts
│   │   ├── apps/list.ts
│   │   ├── envs/list.ts
│   │   ├── params/
│   │   │   ├── list.ts
│   │   │   └── set.ts
│   │   ├── config/pull.ts
│   │   ├── version.ts
│   │   └── update.ts
│   └── lib/
│       ├── api.ts            # fetch wrapper with Bearer token
│       ├── config.ts         # read/write ~/.mull/config.json
│       ├── flags.ts          # minimal --flag value parser
│       ├── resolve.ts        # resolve app/env name → ID via API
│       ├── ui.ts             # clack + picocolors helpers
│       └── update.ts         # daily update check via GitHub releases API
├── build.ts                  # Bun.spawnSync wrapper for cross-compilation
├── scripts/install.sh        # curl-pipe installer
└── .github/workflows/cli-release.yml  # build + publish on cli/v* tags
```

### Build

```bash
cd cli
bun run dev auth login          # local dev (env vars set automatically)
bun build.ts                    # all 4 targets: darwin-arm64/x64, linux-x64, windows-x64
bun build.ts --target=bun-darwin-arm64  # single target
```

Constants (`VERSION`, `API_URL`, `APP_URL`) are inlined via `--env=*` at build time — not embedded as `--define` flags, which Bun's CLI does not support.

### Release

Tag `cli/v0.1.0` → GitHub Actions builds all targets → creates GitHub release with binaries.
