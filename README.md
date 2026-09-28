# OAK Foundation event platform

Next.js, TypeScript, Tailwind CSS, Supabase. Event: 9–11 November 2026, Harare (location from the supplied image reference).

## Run locally

Use Node.js 22 or newer. In this folder run:

```sh
npm install
npm run build
npm start
```

Open http://127.0.0.1:3000. With no Supabase variables, synthetic data is stored in `.data/demo.json` and only localhost is allowed. Register to select your role and open its pages. Use a different email when testing another role.

## Where the pages are

The sidebar and mobile navigation follow the PDF's final access matrix:

| Role                           | After registration | Available pages                                         |
| ------------------------------ | ------------------ | ------------------------------------------------------- |
| Partner                        | `/qr-code`         | Registration, My QR Code                                |
| OAK Staff, Presenter, Observer | `/programme`       | Registration, Programme, Partners                       |
| Coordination Team              | `/check-in`        | Registration, Check-in, Programme, Partners, Attendance |

Programme is `/programme`, the directory is `/partners`, and the dashboard is `/attendance`. Restricted URLs also check the role on the server. Selecting a role during registration grants that role, as specified by the PDF. A 30-day HttpOnly registration session remembers the current registration in that browser. The random session token is separate from the Partner QR code. Existing pre-update passes do not create a session; previously registered users need an administrator-assisted migration or a fresh test email.

The PDF's page 9 permits Partners in the directory, but its final matrix excludes them. The final matrix is the default used here.

## Connect your Supabase account

1. Create your Supabase project.
2. In its SQL Editor, run `supabase/migrations/001_event_portal.sql` once, then `002_requirements.sql`, `003_api_rate_limits.sql`, `004_hashed_attendee_sessions.sql`, and `supabase/seed.sql`. For an existing installation, run any migrations not previously applied in ascending order; seed content only if needed.
3. Copy `.env.example` to `.env.local`, in this folder next to `package.json`.
4. Fill in these values locally from your Supabase project settings:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY=YOUR_SERVER_SECRET_KEY
RATE_LIMIT_SECRET=YOUR_RANDOM_64_CHARACTER_HEX_SECRET
RESEND_API_KEY=
EMAIL_FROM=
```

The URL and publishable key are browser-safe. `SUPABASE_SECRET_KEY` and `RATE_LIMIT_SECRET` are server-only. `RATE_LIMIT_SECRET` is optional; generate it with `openssl rand -hex 32`, or leave it blank to use the server Supabase key for HMAC pseudonyms. Never give server secrets a `NEXT_PUBLIC_` prefix or paste them into chat. Keep `.env.local` out of source control. Restart the app after changing these values.

5. Optional returning coordinator login: create an Auth user in Supabase and add its UUID to `public.staff` using SQL Editor. In this app, `staff` means Coordination Team access, not the registration role OAK Staff:

```sql
insert into public.staff(user_id) values ('AUTH_USER_UUID');
```

Use `/staff` to sign in. Normal participant registration does not require this account setup.

6. Use Supabase Table Editor to replace illustrative programme and partner content. Upload event resources to the private `event-resources` bucket and set the matching `resources.storage_path`. Downloads are signed by the server after checking programme access.

## Partner confirmation emails

Create a Resend account, verify your sending domain, and place its API key in `RESEND_API_KEY` and a verified sender such as `OAK Events <events@yourdomain.org>` in `EMAIL_FROM`. Both are server-only. The registration endpoint sends Partners their registration details and an attached QR PNG using the [Resend send-email API](https://resend.com/docs/api-reference/emails/send-email). No email is sent for other roles. Without configuration or if sending fails, registration remains saved and the QR page tells the participant to download their pass. Live delivery requires your account settings and has not been tested with credentials.

## Included workflows

- Five exact roles, role-aware navigation and protected pages/API routes.
- Required personal/contact fields; separate travel and accommodation requirements; consent.
- Partner-only QR display/download and idempotent check-in with original timestamp preserved on repeat scans.
- Coordination-account-only attendance counts, rate, role breakdown, participant details, name/organisation search, role/status filters, refresh and polling. Local demo permits its synthetic coordinator only on localhost.
- Programme schedule/details, private per-session notes with editing and owner checks.
- Partner directory/details, reference logo initials, website and available contact information.

## Reference content limits

The original boards provide only Day 1's full schedule and eight partner profiles. Day 2/3 details and missing profile descriptions remain illustrative. Official partner logos and some contacts were not supplied, so reference initials and available details are shown. Gallery crops are low resolution. Resource files themselves were not supplied. Replace these event assets before launch.

## Verification and deployment

```sh
npm test
npm run build
npm run test:smoke
```

The smoke script runs only against the local demo and creates synthetic test registrations and private notes. Deploy to a Next.js server host with HTTPS and the environment values configured. Apply migrations 001–004 before accepting production traffic. In production, coordinator access requires an authenticated Supabase Auth user explicitly listed in `public.staff`; selecting the Coordination Team registration role does not grant staff access. Configure the host to overwrite `X-Real-IP` or `X-Forwarded-For` with the actual client address, so distributed rate limits cannot be evaded by spoofing headers. This is not a static-export app. No external database, sender account, or public deployment is provisioned by these source files.
