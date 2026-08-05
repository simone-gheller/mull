# Status page — OpenStatus

vextis's public status page runs on [OpenStatus](https://www.openstatus.dev). Two different
setups, on purpose:

- **Local (this directory)** — OpenStatus's own lightweight self-host mode, for previewing the
  status page experience and testing the `STATUS_URL` wiring in the docs site. Not deployed
  anywhere; runs on your machine only.
- **Production** — OpenStatus's hosted **Hobby (free) tier** at [openstatus.dev](https://www.openstatus.dev),
  not self-hosted. vextis is a customer of their SaaS there — see "Going to production" below.

We don't vendor our own copy of OpenStatus's `docker-compose-lightweight.yaml` here (their compose
file, image tags, and env var names are the actual source of truth and can change between
releases — a stale copy would silently drift and break). Run it straight from their repo instead:

## Local setup

```bash
git clone https://github.com/openstatushq/openstatus /tmp/openstatus
cd /tmp/openstatus
cp .env.docker-lightweight.example .env.docker
```

Set these in `.env.docker`:

- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `RESEND_API_KEY` — required for login-link emails; use any Resend API key (a free account is
  fine for local testing)

Then start it:

```bash
docker compose -f docker-compose-lightweight.yaml up -d
docker compose -f docker-compose-lightweight.yaml ps
```

This brings up 4 containers: a dashboard (`:3000`, where you create the status page and log
incidents), the public status page itself (`:3001`), a libSQL database (`:8080`), and a migration
runner. No monitoring/probing services — this lightweight mode is status-page-only, incidents and
maintenance windows are entered by hand through the dashboard, which is all vextis needs (see
`docs/ui-redesign.md` and the docs-restructure plan for why).

Point the local docs site at it while testing:

```bash
# frontend/docs/.env.local
VITE_STATUS_URL=http://localhost:3001
```

## Going to production

1. Create an OpenStatus account and status page on the **Hobby (free)** tier at
   [openstatus.dev](https://www.openstatus.dev) — this is a real account-creation step, do it
   yourself rather than having an agent do it.
2. Once the page exists, set `VITE_STATUS_URL` to its real URL (or your custom domain, e.g.
   `https://status.vextis.io`, if you set up a CNAME for it) in the docs site's production build
   env. Until this is set, the "Status" link in the docs top nav and the marketing footer stays
   hidden — see `frontend/docs/src/constants.js` (`STATUS_URL`).
3. Incidents/maintenance windows from then on are managed entirely through OpenStatus's own
   dashboard — it has its own auth, separate from vextis's Supabase/Fastify auth by design.
