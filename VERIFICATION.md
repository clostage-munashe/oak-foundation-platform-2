# Requirements verification

Compared the app with all 12 pages of `OAK Foundation Event Attendance Platform Requirements.pdf` and visually inspected its final access matrix. Used that matrix for the conflicting Partner-directory permission.

Verified on 14 September 2026:
- Production build and TypeScript checks pass.
- Seven validation/QR tests pass.
- Local HTTP smoke workflow passes all five roles and 25 page access checks, coordination-only API access, Partner-only QR generation, original timestamp on duplicate check-in, private note creation/editing, and cross-user note isolation.
- Browser registration as Coordination Team redirects to Check-in and exposes Check-in, Programme, Partners, and Attendance in desktop/mobile navigation.
- Attendance role filter correctly narrows the participant list.
- All four pages load; 400px mobile layout has no horizontal page overflow.
- Exact role choices and common dropdown styling are retained.

Preview is left as the synthetic Demo Coordinator. Automated requirements test rows/notes were removed; existing user data was retained.

Not verified with external credentials: live Supabase migration/execution and confirmation email delivery. Physical camera scanning was not exercised in this pass. Event resource files, official partner logos and unspecified profile details were not supplied; reference placeholders remain as described in README.md.

New Supabase installations must run migrations 001 and 002, then seed.sql. Existing installations must run migration 002. Email configuration is documented in README.md and .env.example.
