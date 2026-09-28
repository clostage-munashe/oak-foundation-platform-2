# Backend architecture and operations

This is a full-stack Next.js App Router service, not a separately hosted API. The browser calls same-origin Route Handlers under `/api/*`; server-rendered pages call server-only repository functions directly. Supabase Auth provides staff identity; the registration session is a separate random 256-bit opaque token in an HttpOnly, Secure-on-HTTPS, SameSite=Lax cookie. Supabase Postgres is the production system of record. The filesystem JSON repository is deliberately localhost-only demo mode and must never hold real attendee data.

## Request/data flow

- Registration form → `POST /api/register` → Zod validation and throttle → generates ID, partner-only QR pass code, and independent session token → inserts registration → attempts Resend email → sets HttpOnly cookie. Email delivery failure does not undo a successful registration.
- Staff sign-in → Supabase Auth password login in the browser → RLS-protected staff membership lookup → server validates the current Auth user against `public.staff` for every privileged request. A self-selected registration role does not grant production staff access.
- Attendance and check-in → staff-only API handlers → service-role database operations. Check-in is an atomic update from unchecked to checked-in, so repeat scans preserve the original timestamp.
- Programme and partner pages → role-protected Server Components → server-only repository reads of seeded event content. The directory filters and navigation are client-side against the loaded content.
- Personal notes → `POST /api/notes` create/update → eligibility, ownership, session ID, and text validated on the server. Note ownership is checked on every edit. The UI has no delete-note action.
- Event downloads → `GET /api/resources/{id}` → checks programme role and attendee/staff session → returns a 60-second signed URL from private Supabase Storage. There is no upload UI/API; staff upload files and set resource paths through Supabase.
- Every mutating/API request checks same-origin `Origin` when supplied. JSON payloads are bounded and checked. Production rate limits are atomic, shared across app instances, and store only HMAC-derived address keys. Apply migration 003. Configure the hosting proxy to overwrite, not trust client-provided, `X-Real-IP`/`X-Forwarded-For`.

## Endpoint reference

JSON error shape: `{ "error": "Human-readable message" }`. Authentication means either the HttpOnly attendee cookie or a valid Supabase Auth session with a matching staff membership. The endpoint-specific role requirements are listed below. Responses containing personal registration fields are never available from the public endpoints.

| Method | Endpoint | Purpose | Authentication | Request body | Success response |
|---|---|---|---|---|---|
| POST | `/api/register` | Create registration, attempt partner email, start attendee session | Public; throttled (5/hour/IP) | Registration fields: `firstName`, `lastName`, `organisation`, `programmeArea?`, `role`, `email`, `phone`, `dietary?`, `accessibility?`, `travel?`, `accommodation?`, `consent: true`; `website` honeypot | `201 { registration }` (session token omitted; `Set-Cookie: oak-session`) |
| GET | `/api/attendance` | Read attendance roster (limited PII only) | Supabase-authenticated member of `public.staff`; throttled | None | `{ registrations: [{id,firstName,lastName,organisation,role,createdAt,checkedInAt}] }` |
| POST | `/api/check-in` | Idempotently check in Partner pass | Supabase-authenticated staff member; throttled (120/min) | `{ code: "OAK-2026-…" }` | `{ registration: limited attendee data, already: boolean }`; unknown code is 404 |
| POST | `/api/notes` | Create or edit caller-owned session note | Registered `OAK Staff`, `Coordination Team`, `Presenter`, or `Observer`, or authenticated staff; throttled (30/min) | Create: `{sessionId,day,text}`. Edit: same plus `{id}`. Submitted `name` and `organisation` are overwritten from session identity | `{ note }` |
| GET | `/api/resources/{id}` | Obtain a private resource download link | Eligible programme role plus attendee session or staff Auth session; throttled | None | `{ url }` (signed for 60 seconds) |
| POST | `/api/auth/sign-out` | Clear Supabase Auth session | Supabase Auth session | Empty | `{ ok: true }` |
| POST | `/api/demo-check-in` | Exercise seeded sample scan in local demo | Local demo synthetic coordinator only; unavailable when Supabase configured | `{ id: "collin" | "james" | "awa" | "kayden" }` | `{ registration, already }` |

There are intentionally no public registration-list, arbitrary account creation, resource-upload, partner/programme CRUD, note-list, or note-delete endpoints. Pages load only the data they need; resource/content maintenance is through the secured Supabase project dashboard/SQL Editor. Static gallery assets live under `public/gallery/`.

## Database model

All tables are in `public`; primary keys and foreign keys are enforced in Postgres. RLS is enabled on all tables. Browser roles have no direct registration, notes, resources, or rate-limit access. Server-side service-role access is used only in `server-only` modules and Route Handlers.

| Table | Fields (type; required unless marked optional) | Relationships / indexes / constraints |
|---|---|---|
| `staff` | `user_id uuid` PK; `created_at timestamptz` default `now()` | `user_id` → `auth.users(id)` with cascade delete; only the matching authenticated user can select its membership; only trusted service-role/admin setup can add membership |
| `registrations` | `id uuid` PK default `gen_random_uuid()`; `code text` nullable; `email text`; `data jsonb`; `checked_in_at timestamptz` nullable; `created_at timestamptz`; `session_token_hash text` nullable; `session_expires_at timestamptz` nullable | unique `email`; unique nullable `code`; email must be lowercase; `data` must be a JSON object. `data` stores `firstName`, `lastName`, `organisation`, `programmeArea`, `role`, `email`, `phone`, `dietary`, `accessibility`, `travel`, `accommodation`, `consent`, `emailStatus`, and `createdAt`. Raw attendee session tokens are never stored for new registrations; SHA-256 hash and expiry are separate columns. Partial indexes on checked-in timestamp and expiry; unique partial index on non-null session hashes. Migration 004 lazily removes any still-valid legacy raw token when its owner next uses that session. Partner gets a code; other roles have SQL NULL code. |
| `partners` | `id text` PK; `position integer` default 0; `data jsonb` | `data` represents `Partner` UI shape (`initials`, `name`, `region`, `category`, `tags`, `since`, `website`, `about`, `contact`, `email`). Ordered by `position`. No FK to attendee registrations (directory profiles are not attendee identities). |
| `sessions` | `id text` PK; `position integer` default 0; `data jsonb` | `data` represents `Session` UI shape (`day`, `time`, `end`, `title`, `speaker`, `venue`, `type`, `description`, optional `featured`). Ordered by `position`. Notes reference the session by ID stored in note JSON; this is not currently a database FK. |
| `notes` | `id text` PK; `data jsonb`; `created_at timestamptz` default `now()` | `data` contains `ownerId`, `sessionId`, `name`, `organisation`, `text`, `day`, `time`. Owner/session are currently JSON fields, not relational FKs. Owner matching is enforced server-side; browser roles cannot read notes directly. Seed examples have no owner and are not shown as personal notes. |
| `resources` | `id text` PK; `name text`; `storage_path text` nullable | Path points into private Storage bucket `event-resources`; not a relational FK. Storage bucket is private, max object size 209,715,200 bytes (200 MiB); server returns short-lived signed links only. |
| `api_rate_limits` | `key_hash text` PK; `window_started_at timestamptz`; `hit_count integer` | `hit_count > 0`; rate key must be SHA-256 HMAC hex; RPC validates limit/window bounds. Only service role may execute limiter RPC or access rows; periodic opportunistic SQL cleanup removes entries older than a day. |

### Schema changes and seed data

Run `supabase/migrations/001_event_portal.sql`, then `002_requirements.sql`, `003_api_rate_limits.sql`, and `004_hashed_attendee_sessions.sql`, in order on a new project. Run `supabase/seed.sql` after migrations to load sample partner/session/resource metadata and illustrative shared notes. For a project that already ran a migration, apply only later unapplied migrations. Preserve and back up production data before changing a live schema. Migration 004 preserves still-active old sessions by migrating them to hashes on next use; sessions already older than 30 days are invalid. Seed content is illustrative and should be reviewed/replaced before launch.

## Environment variables

Copy the complete root `.env.example` to `.env.local`; never commit `.env.local` or set server secrets with a `NEXT_PUBLIC_` prefix.

| Variable | Required when | Where to obtain it |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase production | Supabase Dashboard → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase production | Same page → publishable key (legacy projects may label it `anon`); browser-safe, protected by RLS |
| `SUPABASE_SECRET_KEY` | Supabase production | Supabase Dashboard → Project Settings → API → secret/service-role key. Treat as a root credential; server-only, never expose in browser or chat |
| `RATE_LIMIT_SECRET` | Recommended in production; optional | Generate a private random value with `openssl rand -hex 32`; store in deployment secret settings and `.env.local`. If blank, server Supabase key is used to HMAC limiter identifiers |
| `RESEND_API_KEY` | Only to email partners | Resend Dashboard → API Keys; make a restricted key where supported |
| `EMAIL_FROM` | Only to email partners | A sender address/domain verified in Resend, e.g. `OAK Events <events@yourdomain.org>` |

## Local run and test

From a fresh terminal in the repository root, Node.js 20.9+ (22 recommended) is needed:

1. `npm install`
2. Copy `.env.example` to `.env.local` (blank values mean localhost-only demo), then optionally add Supabase settings.
3. With real Supabase settings, apply migrations 001–003 and seed in the SQL Editor before starting.
4. `npm run dev` and open `http://127.0.0.1:3000`.
5. Run checks: `npm run typecheck`, `npm test`, `npm run build`.
6. To run HTTP end-to-end tests, start `npm run dev` in one terminal and run `npm run test:smoke` in another. It operates only against local demo mode and creates test records in `.data/demo.json`; do not point it to real attendee data. Existing dev server on port 3000 can be reused.

The local demo deliberately throttles at a looser 20x threshold to allow automated smoke runs; it is not a deployment mode. The browser-only staff sign-in screen is intentionally disabled in demo mode.

## Manual production setup and deployment checklist

1. **Create Supabase project** → [supabase.com/dashboard](https://supabase.com/dashboard) → New project → choose region and strong database password → wait for provisioning → verify Project URL and API keys appear in Project Settings → API.
2. **Apply schema** → project SQL Editor → paste/execute migrations 001–004 in order, then `supabase/seed.sql` → verify all seven expected public tables exist, RLS is enabled, and `event-resources` bucket is private.
3. **Configure environment** → local root `.env.local` and production host's encrypted environment-variable settings → populate Supabase URL/publishable/secret keys; generate `RATE_LIMIT_SECRET`; add Resend values only if delivery is needed → restart/redeploy → verify app loads and create one synthetic test registration.
4. **Create staff identity** → Supabase Dashboard → Authentication → Users → Add user; give the event coordinator a strong unique password via a secure out-of-band channel → copy user UUID → Supabase SQL Editor: `insert into public.staff(user_id) values ('AUTH_USER_UUID');` → sign in at `/staff`, verify `/attendance` and `/check-in`; verify a non-member account receives 403 and cannot access the roster. Do not expose the secret key to event staff.
5. **Configure email (optional)** → create Resend account, verify sending domain/DNS records, create API key → add `RESEND_API_KEY` and verified `EMAIL_FROM` in local/production server-only environments → test registration with a controlled inbox and inspect Resend delivery logs.
6. **Add actual event content/assets** → Supabase Table Editor replace illustrative partner/session JSON and review `supabase/seed.sql` before running in production; add actual files in Storage → `event-resources` (private) → set each matching `resources.storage_path` → test eligible signed link and confirm it expires. Review/replace demo imagery, contact facts, and draft privacy notice as necessary.
7. **Deploy Next.js application** → push source to a private/approved Git repository → create a Node.js-capable deployment on Vercel or another Next.js host → set Node 22+, build `npm run build`, start with `npm start` (provider's Next.js adapter may manage these) → add all configured env variables to Production and Preview separately → deploy over HTTPS. Do not use static export.
8. **Trust proxy IP headers** → host/proxy settings → ensure it overwrites `X-Real-IP` or `X-Forwarded-For` with the connecting client's actual address, removing user-supplied versions → verify rate limiting from external clients. If this cannot be guaranteed, add provider-specific trusted IP resolution before production.
9. **Connect domain and verify** → deployment project → add domain, follow DNS records provided by host, enable HTTPS → set Supabase Auth Site URL and allowed redirect URLs to the deployed origin (for this password-only flow, include the origin) → open site, register test user, verify cookie is Secure, sign in staff and test authorized routes. App/API are same-origin, so no CORS allowlist is required or enabled.
10. **Go-live controls** → review actual privacy notice, data retention/deletion procedures, and consent with the organization's legal/privacy owner; remove synthetic/demo registrations; replace test users; restrict Dashboard membership and service-role secret access; set backups/monitoring; verify HTTPS and Supabase backups/restore procedure.

### Production verification sequence

- With valid Supabase configuration, public pages/APIs must not silently fall back to local demo. Invalid/incomplete public Supabase configuration should fail deployment/startup checks; never deploy with blank values.
- Submit valid and invalid registrations; verify stored row, normalized unique email, partner-only pass, accommodation field, consent, cookie attributes, duplicate email 409, and email delivery status. Confirm API output never returns `sessionToken`.
- Confirm `OAK Staff`, `Presenter`, and `Observer` cannot query attendance or check in; a Supabase Auth user without a `public.staff` row is denied; a provisioned member can do both.
- Scan a valid Partner twice and verify second response says already checked in with exact same timestamp. Invalid/other-role codes must be non-disclosing 404s.
- Create/edit a note as an eligible user; try another user's note ID and verify it cannot be read/edited. Verify notes from another owner never render.
- Request an existing private resource as authorized user; verify a 60-second link works then expires. Unauthenticated/ineligible requests must fail and no storage path is returned.
- Run `npm run typecheck`, `npm test`, `npm run build`; run `npm run test:smoke` only against a local demo server.

## Implemented boundaries and known manual gaps

The server provides the complete backend for current visible workflows. It does not invent features absent from the UI: there is no attendee edit/delete/export, staff self-registration/password recovery, note deletion, partner/schedule CMS, resource upload, invitation/RSVP, push notification, or public CORS API. If any are required, define the UI/permissions and retention policy before adding routes. Supabase credentials, production data, staff identities, Resend sender verification, domain, deployment, official content/resources, and approved privacy/retention policy must be supplied by the project owner. Live third-party credentials and camera hardware cannot be validated from this workspace.
