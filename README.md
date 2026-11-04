# Project 30 — student learning and admin platform

Responsive HTML/CSS/vanilla-JS frontend, Supabase Auth/PostgreSQL/Storage, and Vercel serverless API.

## Included
- Google OAuth student sign-in; Free and Pro access; course chapters, videos and past-exam resources.
- Responsive dashboard, polished gradient visual system, micro-animations, mobile layouts and PWA app-shell caching.
- Configurable Pro price and Telebirr/CBE payment receiver details from the admin dashboard.
- Verify.ET REST integration for CBE and Telebirr reference checks. The API key stays server-side. Successful instant responses activate Pro only when the ETB amount and settlement-account match are confirmed.
- Signed Verify.ET webhook receiver with timestamp tolerance and HMAC-SHA256 validation. Queued webhook results without a settlement-match object are intentionally left for manual review rather than granting access unsafely.
- Manual private receipt upload and admin approve/reject fallback.
- Admin student directory, Free/Pro plan management, and permanent account deletion.
- Private student/admin support inbox stored in the existing RLS-protected `payment_events` table; support rows are not exposed by student database policies.
- Announcement management, one-active-session enforcement, AI notes summary endpoint and watermarked learning view.

## Supabase prerequisites
Use the existing Project 30 database schema already configured in your Supabase project. The application expects the tables `profiles`, `active_sessions`, `site_settings`, `courses`, `chapters`, `resources`, `payment_submissions`, `announcements`, and `payment_events`, plus a private Storage bucket named `payment-proofs`. No SQL file is bundled in this ZIP as requested. Keep the service-role key private in Vercel.

Enable Google under Supabase Authentication → Providers and add `SITE_URL/learn.html` to allowed redirect URLs. Set `SUPABASE_URL` and `SUPABASE_ANON_KEY` in Vercel Environment Variables. The browser obtains only these public values at runtime from `/api/public-config`; the service-role key remains server-only.

## Vercel environment variables
Add these under Project → Settings → Environment Variables:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD` — plain value stored only in Vercel environment variables, never in the ZIP or frontend. Use a long unique password and restrict Vercel project access.
- `ADMIN_JWT_SECRET` — random secret of at least 32 bytes
- `VERIFY_ET_API_KEY` — Verify.ET API key with verification read/write permissions
- `VERIFY_ET_WEBHOOK_SECRET` — endpoint secret (`whsec_...`) created when registering the webhook
- `SITE_URL`
- Optional `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`

Generate a JWT secret with `openssl rand -base64 48`. Admin password hashing is not required; the server compares the supplied password with `ADMIN_PASSWORD` in the Vercel environment and issues an HttpOnly signed session cookie. Never put that password in client-side code.

## Verify.ET setup
1. In Verify.ET, create an API key with `verification:read` and `verification:write` permissions.
2. In Verify.ET dashboard → API Keys → Webhooks, register `https://YOUR_DOMAIN/api/payment-webhook` and copy its `whsec_` secret immediately into `VERIFY_ET_WEBHOOK_SECRET`.
3. Send the Verify.ET webhook test and confirm it receives HTTP 204.
4. In `/admin.html` → Settings, set the exact Telebirr settlement phone/account and CBE receiving account. These values are sent as `settlementAccount` in verification requests.
5. Test with a low-value real transaction before launch. A payment is automatically approved only if Verify.ET returns `verified: true`, `status: success`, the configured ETB amount, currency `ETB`, and `settlementAccountMatch.matched: true`.
6. A 202 queued result is not treated as paid unless a signed webhook includes a positive settlement match. Otherwise the record remains in manual review. This is intentional fail-closed behavior because the documented webhook example does not guarantee that the settlement match object is included.

Supported reference fields follow Verify.ET: CBE Receipt ID, Telebirr transaction number. The app sends an explicit `bank` value and `settlementAccount`.

## Deploy
1. Install dependencies with `npm install`.
2. Set Supabase project URL and anon key in `public/assets/supabase.js`.
3. Add Vercel environment variables listed above.
4. Deploy the project to Vercel. Visit `/admin.html` and sign in with the configured environment credentials.

## Important limitations
- Websites cannot reliably prevent screenshots, screen recording, browser inspection, DevTools, or all copying. The learning view uses deterrents and a watermark only; real protection comes from server-side access checks.
- Offline support caches the public app shell, not protected course material or private messages.
- Student deletion is permanent and cascades through auth-linked records. Confirm before deleting.
- Verify.ET API credits, image OCR credits, account permissions, and webhook registration are managed in Verify.ET. This build verifies typed bank references; it does not submit receipt images to Verify.ET OCR.
- The support inbox uses `payment_events` rows whose provider begins with `support:`. The table must remain RLS-enabled without student read/write policies; the service-role API performs all chat operations.

## Function budget
There are 11 API endpoint files plus one shared helper under `api/`, designed to remain within a 12-function Hobby deployment limit. Confirm Vercel's function count after deployment because platform counting rules may change.


## Deployment values and OAuth setup

Production site URL: `https://project30-seven.vercel.app`

Required Vercel environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY` (publishable/anon key; safe for browser use with RLS)
- `SUPABASE_SERVICE_ROLE_KEY` (secret; server only)
- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `ADMIN_JWT_SECRET` (generate a unique random secret)
- `VERIFY_ET_API_KEY` (private)
- `VERIFY_ET_WEBHOOK_SECRET` (private)
- `SITE_URL` = `https://project30-seven.vercel.app`

Verify.ET webhook endpoint:
`https://project30-seven.vercel.app/api/payment-webhook`

Google OAuth is configured in Supabase Authentication → Providers → Google, not with Google credentials in Vercel for this application. Create a Google OAuth Web application client in Google Cloud Console. Add the Supabase callback URL shown on the Supabase Google provider page (typically `https://YOUR_SUPABASE_PROJECT_REF.supabase.co/auth/v1/callback`) to Google Authorized redirect URIs. Copy the generated Client ID and Client Secret into Supabase's Google provider settings. In Supabase Authentication → URL Configuration, set the Site URL to `https://project30-seven.vercel.app` and add `https://project30-seven.vercel.app/learn.html` to Redirect URLs.

Redeploy after changing Vercel environment variables. No `.env` file is required or included.


## Mobile responsiveness update
This build includes a mobile-first overflow hardening pass for the landing page and learning/admin layouts. It clips accidental horizontal page overflow, constrains responsive cards and artwork, improves small-screen spacing, and preserves normal document scrolling so visitors can reach all content. Support-chat message history and modal content retain their own necessary scrolling where applicable. Google sign-in buttons now use the official multicolour Google mark as inline SVG.


## Dashboard navigation update
The student learning page and admin dashboard use a shared fixed top navigation bar. On narrow screens, navigation opens from the menu button. The main document remains vertically scrollable so all course, payment, settings, support and announcement content stays accessible; horizontal page overflow is clipped. Existing backend endpoints and authentication flows are retained.
