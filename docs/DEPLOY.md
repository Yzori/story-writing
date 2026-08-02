# Deploying Quiloria

Go-live runbook for a self-hosted deployment. The build is `output: "standalone"` (see `next.config.ts`), so the app runs as a plain Node server behind your reverse proxy.

## 1. Prerequisites

- Node 20+
- PostgreSQL 14+ (the app uses partial unique indexes, advisory locks, and `FOR UPDATE SKIP LOCKED`)
- A reverse proxy (Caddy/nginx) terminating TLS

## 2. Environment

Copy `.env.example` to `.env.local` and fill it in. The app fails fast at boot if `DATABASE_URL` or `AUTH_SECRET` is missing (`src/server/env.ts`). Everything else degrades gracefully when absent, but three "optional" vars are load-bearing in production:

| Var | What breaks without it |
|-----|------------------------|
| `CRON_SECRET` | **All scheduled jobs silently never run** — digests, Circle renewals, AI-quota resets, commission auto-release. Set it and wire the schedule (step 5). |
| `APP_URL` | Links inside emails point at localhost. |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | No email at all (notifications, digests). |
| `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Ink Drop purchases and billing portal disabled. |
| `ANTHROPIC_API_KEY` | AI assistant features disabled. |

`x-forwarded-for` handling: rate limiting keys on the **last** hop of the header, so the proxy must append the client IP (default behavior in nginx `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for` and in Caddy).

## 3. Database migrations

The drizzle journal is intentionally frozen at 0009; later migrations are hand-written SQL applied by a companion script. The whole train is run by one command:

```sh
npm run db:dev:migrate
```

Despite the `dev` in the name this is the production pipeline: it baselines the journaled 0000–0009 set, runs `drizzle-kit migrate`, then applies every unjournaled `drizzle/*.sql` in filename order, tracked in a `__dev_migrations` table (each file is idempotent-safe: duplicate-object errors are treated as already applied).

The full train (65 files, through 0067) was verified to apply cleanly to an empty database on 2026-08-02.

Note: `drizzle/0063_ink_drop_balance_check.sql` adds its CHECK constraint as `NOT VALID`. After deploying, validate it manually during a quiet window:

```sql
ALTER TABLE "users" VALIDATE CONSTRAINT "users_ink_drop_balance_nonnegative";
```

## 4. Build and run

```sh
npm ci
npm run build
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
node .next/standalone/server.js   # PORT=3000 by default
```

Run it under a process manager (systemd unit, pm2, or a container). The server is stateless except for in-memory rate-limit buckets — run **one instance** unless you move rate limiting to a shared store (persistent limits already live in Postgres; the in-memory tier is per-instance best-effort).

## 5. Cron

Scheduled jobs run only when something POSTs `/api/cron` with the secret. Every job is due-date-guarded and the route takes a transaction-scoped advisory lock, so overlapping or frequent invocations are safe. Every 15 minutes is a good cadence:

```cron
*/15 * * * * curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://your-domain/api/cron >/dev/null
```

## 6. Stripe

Point a webhook at `https://your-domain/api/webhooks/stripe` and put its signing secret in `STRIPE_WEBHOOK_SECRET`. Create the subscription price IDs referenced in `.env.example` in the Stripe dashboard.

## 7. Post-deploy smoke test

1. Register with email + password; log out; log back in.
2. Create a story, write a chapter, publish it, open the public story page logged out.
3. Toggle "Open the doors" on a story and confirm it appears in Browse.
4. `curl -X POST -H "Authorization: Bearer $CRON_SECRET" .../api/cron` returns 200 with per-job results.
5. If Resend is configured: trigger a notification (follow someone) and check the email lands.
6. If Stripe is configured: buy the smallest Ink Drop pack in test mode; check the webhook fires and the balance credits.

## Known deferred items

- GDPR endpoints (`/api/account/export`, `/api/account/delete`) exist but have no settings UI yet.
- Web push (VAPID) is not wired; email is the only notification channel.
