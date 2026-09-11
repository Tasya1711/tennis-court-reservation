# Tennis Reservation Platform — Architecture Proposal (Phase 2)

Status: **awaiting approval — no application code has been written yet.**

Scope confirmed in discovery: single venue, 3 courts (Court 1/2/3, seeded but manageable later via a simple admin panel), 1-hour slots 08:00–22:00 Europe/Kyiv, full payment upfront, cancellation included, coach-lesson section is a promotional card only (no booking flow), no subscription banner, no mandatory email verification (but architected so it can be turned on later), minimal placeholder legal pages, WayForPay sandbox for payments (portfolio project, no live merchant account needed).

---

## 1. Final tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16 (App Router) + TypeScript** | One deployable app; API routes are the backend. Best fit for a solo full-stack build with image optimization, SSR, and easy Vercel deploy built in. (Originally scoped as "Next.js 15" during discovery — 16 is current stable as of scaffolding and carries no architectural change for us, just naming: `middleware.ts` → `proxy.ts`, noted throughout below.) |
| Styling | **Tailwind CSS** | Fast to build a consistent mobile design system; utility classes keep the "premium minimal" look consistent without a heavy component library. |
| Animation | **Framer Motion** | Native React integration for page/element transitions, built-in `useReducedMotion` support. GSAP added only if the cinematic intro genuinely needs finer timeline control than Framer Motion gives — I'll try Framer Motion first. |
| Database | **Supabase Postgres** | Managed Postgres with generous free tier; relational integrity + transactions are what make double-booking prevention actually safe. |
| ORM | **Prisma** | Typed queries/migrations against the Supabase Postgres connection string. Mature tooling, clear migration history. |
| Auth | **Supabase Auth** via `@supabase/ssr` | Handles password hashing, session cookies, and refresh entirely — we never touch raw passwords. Official Next.js App Router integration (proxy-based session refresh — Next.js 16 renamed the `middleware.ts` convention to `proxy.ts`/`proxy.js`; same mechanism, new name) is the current recommended pattern. |
| File storage | **Supabase Storage** | Same project as auth/DB — one account, one dashboard, no second vendor for the MVP. |
| Payments | **WayForPay** (sandbox now) | See §7. |
| i18n | **next-intl**, cookie-based locale (no URL prefix) | Default `uk`, switch to `en`, persisted via cookie — appropriate since most pages are authenticated app screens, not content that needs per-locale indexing. |
| Image processing | **sharp** | Server-side validation/resizing of uploaded avatars before they reach Storage. |
| Validation | **Zod** | Schema validation on every API route input. |
| Date/timezone | **date-fns + date-fns-tz** | Explicit Europe/Kyiv conversion, never relies on server or device local time. |
| Deployment | **Vercel** (app) + **Supabase** (data) | Zero server ops, HTTPS/CDN by default, Vercel Cron for the reservation-expiry job. |

---

## 2. Frontend architecture

Mobile-only viewport (max-width container, safe-area padding via `env(safe-area-inset-*)`), screens as App Router routes so each has its own loading/error boundary:

```
/                      cinematic intro (blurred first-page_photo → reveal, "tennis" wordmark)
/auth                  login/register, glass panel over first-page_photo
/onboarding/avatar     post-registration avatar step
/home                  main page, second-page_photo background, coach card, "Make a reservation"
/reserve               court → date → time selection
/reserve/summary       reservation summary before payment
/payment/[id]          redirect handoff to WayForPay
/payment/success        blurred first-page_photo, confirmation, "Go to my account"
/payment/failed
/account               profile photo, reservations list
/legal/privacy
/legal/terms
/legal/refund-policy
/admin/courts           protected, simple CRUD
```

Shared building blocks: `components/ui` (buttons, inputs, skeletons, error banners — all touch-target ≥44px, accessible labels/focus states), each screen transition wrapped in a Framer Motion `AnimatePresence` at the layout level so intro → auth → onboarding → home → reserve → payment → success → account all animate consistently, respecting `prefers-reduced-motion`.

## 3. Backend architecture

Next.js Route Handlers under `app/api/**`, each one: parses/validates input with Zod → checks the Supabase session (via `@supabase/ssr` server client) → authorizes against the resource owner → runs the Prisma query/transaction → returns typed JSON. No business logic lives in client components — the API is the only place that can create/confirm a reservation, matching "the backend/database must be the source of truth."

### 3.1 API route reference

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/api/courts` | GET | public | list active courts |
| `/api/courts/:id/availability` | GET | public | slot availability for a date |
| `/api/reservations` | POST | user | create `PENDING_PAYMENT` reservation |
| `/api/reservations` | GET | user | list own reservations |
| `/api/reservations/:id` | GET | user (owner) | reservation detail (used for success-page polling) |
| `/api/reservations/:id/cancel` | POST | user (owner) / admin | cancel a confirmed reservation |
| `/api/payments/create` | POST | user (owner) | build & sign WayForPay purchase request |
| `/api/payments/webhook` | POST | WayForPay only (signature-verified, not a user session) | payment confirmation callback |
| `/api/payments/:orderReference/status` | GET | user (owner) | poll status after redirect |
| `/api/profile` | GET/PATCH | user | read/update own profile |
| `/api/profile/avatar` | POST | user | upload/replace avatar |
| `/api/admin/courts` | GET/POST | admin | list/create courts |
| `/api/admin/courts/:id` | PATCH | admin | edit a court |
| `/api/cron/expire-reservations` | GET | `CRON_SECRET` header, not a user session | expire stale holds (housekeeping only — see §7) |

Registration/login/logout are not custom routes — the frontend calls the Supabase Auth SDK directly (`supabase.auth.signUp/signInWithPassword/signOut`), which talks to Supabase's own `/auth/v1` endpoints.

## 4. Database schema

```prisma
// profiles: 1:1 with Supabase auth.users, holds app-specific fields
model Profile {
  id         String   @id @db.Uuid          // == auth.users.id
  username   String   @unique
  avatarUrl  String?                        // null => default user-photo.jpeg on the client
  role       Role     @default(CUSTOMER)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  reservations Reservation[]
}
enum Role { CUSTOMER ADMIN }

model Court {
  id        String   @id @default(uuid())
  name      String                          // "Court 1"
  priceUah  Int                             // whole UAH per 1-hour slot
  isActive  Boolean  @default(true)
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  reservations Reservation[]
}

model Reservation {
  id             String   @id @default(uuid())
  userId         String   @db.Uuid
  courtId        String
  date           DateTime @db.Date          // Kyiv civil date, denormalized for display/queries
  startTime      String                     // "08:00" Kyiv wall-clock, denormalized
  endTime        String                     // "09:00"
  startAt        DateTime                   // canonical UTC instant (date+startTime interpreted in Europe/Kyiv)
  endAt          DateTime
  status         ReservationStatus @default(PENDING_PAYMENT)
  paymentStatus  PaymentStatus     @default(UNPAID)
  orderReference String   @unique           // sent to WayForPay
  amountUah      Int
  expiresAt      DateTime                   // PENDING_PAYMENT hold expiry
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  user  Profile @relation(fields: [userId], references: [id])
  court Court   @relation(fields: [courtId], references: [id])
  payments Payment[]

  // Enforced additionally at the DB level (raw SQL migration, Prisma doesn't
  // express partial unique indexes natively):
  // CREATE UNIQUE INDEX reservations_court_slot_active_uidx
  //   ON "Reservation" ("courtId", "startAt")
  //   WHERE status IN ('PENDING_PAYMENT', 'CONFIRMED');
}
enum ReservationStatus { PENDING_PAYMENT CONFIRMED CANCELLED EXPIRED }
enum PaymentStatus     { UNPAID PAID REFUNDED FAILED }

// Audit trail of every webhook/payment event, independent of current reservation state
model Payment {
  id             String   @id @default(uuid())
  reservationId  String
  provider       String   @default("wayforpay")
  orderReference String
  amountUah      Int
  status         String                     // raw provider status string
  rawPayload     Json
  createdAt      DateTime @default(now())
  reservation    Reservation @relation(fields: [reservationId], references: [id])
}

// Lightweight, no-extra-service rate limiting (see §9)
model AuthAttempt {
  id        String   @id @default(uuid())
  key       String                          // hash of IP+email
  createdAt DateTime @default(now())
  @@index([key, createdAt])
}
```

**Why the partial unique index is the real double-booking guard:** any two concurrent requests for the same `(courtId, startAt)` will race to insert a row; Postgres allows exactly one to succeed and the second gets a constraint-violation error, which the API turns into a `409 Conflict` — this holds regardless of app-level bugs, multiple server instances, or retried requests. Prisma transactions and an app-level "is this slot free" pre-check are still done for a fast, friendly error message, but the unique index is what actually prevents the double booking.

### 4.1 Relationships (summary)

`Profile 1—N Reservation` (a user has many reservations), `Court 1—N Reservation` (a court has many reservations), `Reservation 1—N Payment` (one reservation can have multiple payment/webhook events logged against it — e.g. a failed attempt followed by a successful one). `Profile.id` is a foreign key onto Supabase's own `auth.users.id`, not a separate identity system.

### 4.2 Row Level Security (RLS) policies

**Where RLS actually sits in this architecture, honestly stated:** all application reads/writes go through Next.js API routes using Prisma over the **direct/pooled Postgres connection**, which authenticates as a Postgres role that bypasses RLS by design (this is how Supabase's own connection strings work — RLS is enforced on the PostgREST/`supabase-js` path, not on a raw `postgres://` connection). That means **the primary authorization boundary is the ownership/role checks written in each route handler** (§5–6), not RLS.

RLS is still enabled and policies are still written, as defense-in-depth: if the service-role key or DB URL ever leaked, or if a future feature queries Supabase directly from a client (e.g. Realtime subscriptions), these policies are what stand between an attacker and the data instead of nothing.

```sql
alter table "Profile"     enable row level security;
alter table "Court"       enable row level security;
alter table "Reservation" enable row level security;
alter table "Payment"     enable row level security;
alter table "AuthAttempt" enable row level security;

-- Profiles: a user can read/update only their own profile
create policy profile_select_own on "Profile"
  for select using (auth.uid() = id);
create policy profile_update_own on "Profile"
  for update using (auth.uid() = id) with check (auth.uid() = id);
-- no insert/delete policy for regular users — the row is created by the
-- on_auth_user_created trigger (security definer), never by client insert.

-- Courts: public, read-only reference data
create policy court_select_active on "Court"
  for select using (is_active = true);
-- no insert/update/delete policy — admin writes only ever happen through
-- our own admin API routes, which use Prisma (bypasses RLS) after an
-- explicit role check in code.

-- Reservations: a user can read only their own reservations
create policy reservation_select_own on "Reservation"
  for select using (auth.uid() = "userId");
-- no insert/update/delete policy for the authenticated role — creation,
-- confirmation, cancellation and expiry are exclusively server-driven.

-- Payment and AuthAttempt: no policies granting the authenticated/anon
-- role any access at all — service-role (server) only, by default-deny.
```

### 4.3 Prisma migrations vs. Supabase migrations — the trade-off

Supabase ships its own CLI/migration system (`supabase/migrations`, tied to its dashboard branching features), and Prisma has its own (`prisma migrate`). Running both against the same tables is a real footgun: two independent migration histories can drift out of sync and eventually disagree about what the schema actually is.

**Decision: Prisma Migrate is the single source of truth for schema**, since Prisma is already our ORM and app code depends on `schema.prisma` matching the real database. The Supabase CLI/dashboard migration tooling is not used. Anything Prisma's schema language can't express — RLS policies, the `on_auth_user_created` trigger, storage bucket policies — is added by hand-editing the generated SQL of a Prisma migration (`prisma migrate dev --create-only`, edit the generated `.sql` file, then apply) so it still lives in the same versioned migration history as everything else, rather than in a second, separately-tracked system.

**Connection pooling**: Supabase fronts Postgres with a pooler (Supavisor) for serverless-friendly short-lived connections — this is what `DATABASE_URL` (Transaction pooler, port 6543) is used for at runtime. Prisma's migration engine needs a non-pooled connection (for advisory locks and prepared statements the transaction pooler doesn't support), which is what `DIRECT_URL` is for — pointed at Supabase's **Session pooler** (same pooler host, port 5432), not the raw `db.<ref>.supabase.co:5432` host: that direct host is IPv6-only unless the project has the paid IPv4 add-on, and was unreachable during setup. Both values come from Supabase's own "Connect" panel (Project Settings → Database), which encodes the password correctly — worth copying from there directly rather than retyping, since a password with special characters needs percent-encoding in a connection string.

**Correction found empirically during implementation**: the plan above (`directUrl` in the Prisma `datasource` block) is how Prisma 5/6 worked, but the installed version turned out to be **Prisma 7**, which removed `url`/`directUrl` from `schema.prisma` entirely — confirmed by running `prisma validate` against the real CLI rather than assuming. The actual setup: `schema.prisma`'s `datasource` block has no `url` at all; a new **`prisma.config.ts`** at the project root holds `datasource.url = env("DIRECT_URL")` and is used only by CLI commands (`migrate`, `studio`); the runtime `PrismaClient` (`lib/prisma.ts`) connects separately via the `@prisma/adapter-pg` driver adapter constructed directly with `DATABASE_URL` (pooled). This is a config-shape change only — the pooled-vs-direct reasoning above is unchanged.

**Also found empirically**: `prisma migrate dev` validates against a throwaway shadow database that doesn't have Supabase's `auth` schema, so it fails on migrations referencing `auth.users` (the FK on `Profile.id` and the `on_auth_user_created` trigger). This project's actual migration workflow is: hand-author/hand-edit migration SQL directly (as already planned for the RLS/trigger additions), then apply with `prisma migrate deploy` (no shadow database) instead of `prisma migrate dev`. `npm run db:deploy` is the command to use; `db:migrate` is kept only for schema-only changes that don't touch `auth.*`.

**One more empirical fix**: the first version of the `handle_new_user()` trigger didn't set `updated_at` (Prisma's `@updatedAt` is applied by Prisma Client, not as a Postgres column default), which would have made every real signup fail with a NOT NULL violation. Caught by M1's own verification script (which drove a real insert through the trigger) before any user ever hit it — fixed in a follow-up migration.

## 5. Authentication architecture

- Registration/login/logout run through the Supabase Auth JS SDK (client-side calls to Supabase's own `/auth/v1` endpoints — not something we reimplement), using `@supabase/ssr` so the session lives in httpOnly, secure, SameSite cookies and is refreshed automatically in `proxy.ts` (Next.js 16's replacement for `middleware.ts` — same execution model, renamed file/export).
- On successful sign-up, a Postgres trigger (`on_auth_user_created`) inserts the matching `Profile` row — keeps profile creation atomic with account creation instead of a second client-side call that could fail.
- Email confirmation is **disabled** in the Supabase Auth settings for now (toggle, not a code change) — user can log in immediately after registering. Turning it on later is a dashboard setting plus a "check your email" screen; no auth rework needed.
- `GET /api/profile` acts as the "auth/me" endpoint: reads the session, joins `Profile`, returns the merged user object the frontend needs.
- Protected routes/pages check the session server-side (in the route handler or a server component) and redirect to `/auth` if absent — never trust a client-side "isLoggedIn" flag alone.
- Admin routes additionally check `profile.role === 'ADMIN'`.

## 6. Image storage architecture

- Avatar upload: client sends the file to `POST /api/profile/avatar` (our own route, not directly to Supabase from the browser) → server validates MIME type (`image/jpeg`, `image/png`, `image/webp` only) and size (≤5MB) → `sharp` re-encodes and resizes to a fixed square (e.g. 512×512, converted to WebP) — this both strips any malicious payload hidden in the original file and guarantees a real, decodable image, not just a spoofed extension → uploaded to Supabase Storage under `avatars/{userId}.webp` using the **service-role key (server-only)** → the public/CDN URL is saved to `Profile.avatarUrl`.
- If the user skips upload (or `avatarUrl` is null), the frontend renders the bundled `user-photo.jpeg` asset directly — no placeholder round-trip to storage needed.
- Only the resulting URL is ever stored in the database — never raw file bytes.

## 7. Reservation & double-booking protection (flow)

1. `GET /api/courts/:id/availability?date=YYYY-MM-DD` computes the 14 possible slots (08:00→21:00 start times) in Europe/Kyiv. A slot counts as unavailable if it's `CONFIRMED`, or a still-live `PENDING_PAYMENT` (`expiresAt` still in the future) — an expired-but-not-yet-swept `PENDING_PAYMENT` is correctly treated as available here, independent of whether the cron below has run yet. Computed entirely server-side from the database — the frontend never calculates availability itself.
2. `POST /api/reservations` — re-checks availability, lazily flips that *specific* slot to `EXPIRED` if its prior hold has already lapsed, then inserts a new `PENDING_PAYMENT` reservation with `expiresAt = now + 10 minutes`. If the partial unique index rejects the insert (someone else just took it in the meantime), the API returns `409` and the frontend shows "this slot was just taken."
3. `POST /api/payments/create` — builds and signs the WayForPay purchase request for that reservation, returns the redirect URL.
4. `GET /api/cron/expire-reservations`, invoked by Vercel Cron (GET, not POST — corrected against Vercel's actual docs; it sends `Authorization: Bearer $CRON_SECRET` automatically), sweeps every `PENDING_PAYMENT` row past its `expiresAt` to `EXPIRED`. **This is housekeeping, not what keeps booking correct** — steps 1 and 2 above already make expiry self-healing at read/write time regardless of this job's cadence, so it only affects how quickly the `status` column itself reflects reality (for the account page, a future admin view, etc.), not whether a slot is actually bookable. Worth knowing because Vercel's free Hobby plan only allows cron jobs to run **once a day** — an expression like the originally-planned "every 2 minutes" fails to deploy on it entirely. `vercel.json` schedules it for `0 3 * * *` (03:00 UTC daily) accordingly; tightening this to every few minutes only matters cosmetically and only requires a paid Vercel plan.
5. `POST /api/reservations/:id/cancel` — only the owning user (or admin), only while `CONFIRMED` and before `startAt`; sets `CANCELLED`, which also frees the slot.

## 8. Payment architecture & webhook flow

**WayForPay build**: purchase request signed with `HMAC_MD5` over `merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;productName;productCount;productPrice` using the merchant secret key (server-only) → user is redirected to WayForPay's hosted payment page (card entry happens entirely on their domain — we never see card numbers) → WayForPay POSTs the result asynchronously to our `serviceUrl` (`/api/payments/webhook`), signed the same way, and separately redirects the browser to our `returnUrl`.

`/api/payments/webhook`:
1. Verify the `HMAC_MD5` signature against our secret key — reject anything that doesn't match.
2. Look up the reservation by `orderReference`; verify `amount`/`currency` match what we expect (never trust the amount from the request alone).
3. If `transactionStatus === 'Approved'` and the reservation is still `PENDING_PAYMENT` (not expired), set it `CONFIRMED` / `paymentStatus PAID` inside a transaction, and insert a `Payment` audit row with the raw payload.
4. Respond with WayForPay's required acknowledgment JSON (`orderReference`, `status: accept`, timestamp, signature) — WayForPay retries for up to 4 days until it gets a valid ack, so this must be idempotent (safe to process the same webhook twice).

The **success page never marks anything confirmed itself** — it polls `GET /api/reservations/:id` for a few seconds showing "confirming your payment…" until the status reflects what the webhook actually recorded, since the webhook can land slightly before or after the browser redirect. This is the "never trust the frontend redirect" requirement in practice.

**Ukrainian payment provider comparison** (confirmed against WayForPay's current docs during this proposal):

| Provider | Apple Pay | Card coverage | API/webhooks | Fees | Sandbox w/o business registration |
|---|---|---|---|---|---|
| **WayForPay (recommended)** | Yes | Any Visa/Mastercard incl. Monobank/PrivatBank-issued — card networks, not bank-specific integrations | Clean REST API, `HMAC_MD5`-signed webhooks, retried for 4 days | ~2% base | **Yes** — published test credentials (`merchantAccount: test_merch_n1`) for full integration testing |
| LiqPay | Yes | Same (any Visa/MC) | Simple API, signature-verified callbacks | ~2.75–3% | Yes, own sandbox |
| Fondy | Yes | Same | Good API, more international focus | ~2.6–2.9% | Yes |
| Portmone | Limited | Same | Older/less ergonomic API | Varies | Limited |

Worth restating: "Monobank support" and "PrivatBank support" aren't separate integrations — those are ordinary Visa/Mastercard cards processed identically by any of the above. Apple Pay is the real differentiator, and all three top providers support it.

**Legal/checkout requirements** (per WayForPay's merchant onboarding docs, for when this ever goes to a real merchant account): a public offer/terms of purchase, a refund/return policy, and clear contact/business information visible on the site; `merchantDomainName` is tied to a specific verified domain. None of this blocks sandbox testing — it only matters when applying for a live merchant account later, which is out of scope for this portfolio build. The placeholder legal pages below are structured to be swapped for real content at that point.

**Legal pages** (`/legal/privacy`, `/legal/terms`, `/legal/refund-policy`): minimal, clearly marked as demo/placeholder content, structured with the sections a real policy would need (data collected, payment handling, cancellation/refund terms, contact) so real text can be dropped in later without restructuring.

### 8.1 Apple Pay — production requirements, and what the sandbox can/can't prove

Apple Pay is **kept in the architecture, not removed** — but it genuinely cannot be exercised end-to-end in a sandbox, for reasons that are about how Apple Pay works, not a WayForPay limitation:

- The Apple Pay button only appears/works after Apple has verified the merchant. That needs an **Apple Developer Program membership ($99/yr)**, an Apple **Merchant ID**, and a domain-association file (`/.well-known/apple-developer-merchantid-domain-association`) hosted on a **real, verified HTTPS production domain** — a `*.vercel.app` preview URL or `localhost` cannot complete this verification.
- WayForPay's side additionally requires a **production merchant account** with Apple Pay enabled in their dashboard (their published sandbox test merchant, `test_merch_n1`, is not Apple-Pay-enabled).
- Because of this, there is no legitimate way to click a real Apple Pay button and get a real Apple-signed payment token in this project's current sandbox setup — and per your instruction, **I will not fake that response**. If a screenshot/demo of the flow is wanted, the honest options are: (a) show the Apple Pay button rendered in a disabled/"requires production configuration" state, or (b) document the flow without a live demo. I'd go with (a) for portfolio purposes, clearly labeled — say if you'd rather I omit the button entirely until it's real.

**Why no code rewrite is needed later — this is the key architectural point:** because we're using WayForPay's **hosted checkout page** (§8, the redirect-based flow), Apple Pay is not a separate code path in our app at all. WayForPay's own checkout page detects Safari-on-Apple-device + wallet capability and shows an Apple Pay button alongside card fields automatically, purely based on the merchant account's configuration — nothing in `/api/payments/create`, the redirect, or the webhook handler changes. Enabling real Apple Pay later is entirely an **account/configuration change** (Apple Developer enrollment, WayForPay dashboard, domain verification), not an application change.

**What's testable now vs. later:**

| Testable in sandbox today | Requires production setup |
|---|---|
| Full card-payment flow: create → sign → redirect → webhook → signature verify → confirm | Apple Pay button actually appearing and completing a real transaction |
| Failed/declined/cancelled card payment handling | — needs Apple Developer Program ($99/yr) |
| Webhook idempotency and amount/currency verification | — needs a verified production domain (not localhost/preview) |
| Reservation hold expiry or a card payment being abandoned | — needs a WayForPay production merchant account with Apple Pay enabled |

## 9. Security architecture

- Passwords never touched by our code — Supabase Auth handles hashing/storage.
- Every API route: Zod-validated input, session-checked, ownership-checked before any write. This app-level check is the primary authorization boundary; Postgres Row Level Security policies (§4.2) are a secondary defense-in-depth layer, since Prisma's connection bypasses RLS by design — see §4.2 for exactly why and what the policies still protect against.
- Double-booking prevented at the DB constraint level (§4), not just app logic.
- File uploads: MIME allowlist, size cap, re-encoded server-side with `sharp` before storage.
- Webhook: signature-verified, amount-verified, idempotent.
- Rate limiting on `/api/auth/*`-adjacent flows and `POST /api/reservations`: implemented via the `AuthAttempt` table (count attempts per hashed IP+email in a rolling window) rather than adding a new Redis vendor — keeps this to zero extra accounts for a portfolio build. If this ever needs to scale, swapping in Upstash Redis later is a small, isolated change.
- Secrets: only ever read in server-side code (route handlers, `lib/`); Next.js's `NEXT_PUBLIC_` prefix convention is the hard boundary — nothing without that prefix ever reaches the browser bundle.
- CSRF: SameSite cookies + JSON-only same-origin POST bodies; no state-changing GET routes.
- XSS: React's default escaping, no `dangerouslySetInnerHTML` on user-generated content.
- SQL injection: Prisma parameterized queries exclusively, no raw string concatenation.
- Dependency hygiene: `npm install prisma` resolves to a `8.0.0-rc.x` pre-release by default (Prisma 8 is mid-release as of this build) whose bundled cloud/dev-server tooling (`@prisma/composer`, `alchemy`, `hono`) carried several high-severity advisories. Pinned to the stable `7.10.0` line for both `prisma` and `@prisma/client` instead. The `prisma` CLI package is a `devDependency` only (it's never imported by app code — only `@prisma/client` runs at runtime), so it's excluded from production installs (`npm ci --omit=dev`, what Vercel runs) regardless.

## 10. Deployment architecture

Vercel project connected to the GitHub repo (once you're ready — no rush on this while we're building). Supabase project holds Postgres/Auth/Storage. Vercel Cron (defined in `vercel.json`) triggers the reservation-expiry route. Environment variables set in the Vercel dashboard for production, `.env.local` for local dev (gitignored).

## 11. Free vs paid, and what you'll need to create

| Service | Needed now? | Cost |
|---|---|---|
| Supabase account + project | Yes | Free tier (500MB DB / 1GB storage / 50k MAU) |
| WayForPay | No account needed — public sandbox credentials cover full integration testing | Free |
| Vercel account | Not until we deploy | Free (Hobby) tier |
| Domain name | No — Vercel's `*.vercel.app` subdomain is fine for this build | N/A now (~$10–15/yr later) |
| Apple Developer Program | No — real Apple Pay needs a paid ($99/yr) account + a verified production domain; not realistic to demo properly in a sandbox portfolio build. I'd leave Apple Pay as a documented, wired-for-later capability rather than actually enabling it now. | Skipped for now |

**Total cost to build and fully test this: $0.** The only account you need to create right now is Supabase.

## 12. Folder structure

```
tennis-reservation/
  app/
    page.tsx                     intro
    auth/page.tsx
    onboarding/avatar/page.tsx
    home/page.tsx
    reserve/page.tsx
    reserve/summary/page.tsx
    payment/[id]/page.tsx
    payment/success/page.tsx
    payment/failed/page.tsx
    account/page.tsx
    legal/{privacy,terms,refund-policy}/page.tsx
    admin/courts/page.tsx
    api/
      courts/route.ts
      courts/[id]/availability/route.ts
      reservations/route.ts
      reservations/[id]/route.ts
      reservations/[id]/cancel/route.ts
      payments/create/route.ts
      payments/webhook/route.ts
      payments/[orderReference]/status/route.ts
      profile/route.ts
      profile/avatar/route.ts
      admin/courts/route.ts
      admin/courts/[id]/route.ts
      cron/expire-reservations/route.ts
  components/
    ui/  intro/  auth/  reservation/  account/
  lib/
    supabase/{server,client,proxy}.ts
    prisma.ts
    payments/wayforpay.ts
    reservations/{availability,expiry}.ts
    i18n/{messages/uk.json, messages/en.json, request.ts}
    validation/*.ts
  prisma/
    schema.prisma
    seed.ts
    migrations/
  prisma.config.ts                (Prisma 7 — CLI-only config, direct URL; see §4.3)
  proxy.ts                        (Next.js 16's replacement for middleware.ts)
  public/images/  (project assets)
  .env.example
  .gitignore
```

## 13. Environment variables

See `.env.example` in the project root. Client-exposed values are prefixed `NEXT_PUBLIC_`; everything else is server-only and must never appear in client components or be committed. `DATABASE_URL` is the pooled connection the app uses at runtime; `DIRECT_URL` is the unpooled connection Prisma needs for migrations — both come from the same Supabase project (see §4.3 and the setup steps below).

## 14. Exact setup steps for you

These are the only things you need to do outside of code for local development — I'll implement against whatever values end up in `.env.local`, but I never need to see the values themselves.

1. **Create a Supabase account and project** at supabase.com (a region close to Ukraine — e.g. EU Central/Frankfurt — will give the lowest latency; happy to use a different region if you prefer).
2. In the new project: **Project Settings → API** — copy `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`, and the `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and the `service_role` key (keep this one especially secret — full DB access) → `SUPABASE_SERVICE_ROLE_KEY`.
3. **Project Settings → Database → Connection string**: copy the **pooled** connection (Transaction mode, port 6543) → `DATABASE_URL` (append `?pgbouncer=true` if the UI doesn't already include it), and the **direct** connection (port 5432) → `DIRECT_URL`.
4. **WayForPay — sandbox, no signup needed yet**: set `WAYFORPAY_MERCHANT_ACCOUNT=test_merch_n1`, `WAYFORPAY_SECRET_KEY=flk3409refn54t54t*FNJRET` (WayForPay's published public test credentials), `WAYFORPAY_MERCHANT_DOMAIN_NAME=localhost`.
5. **`CRON_SECRET`**: any random string you generate yourself (e.g. `openssl rand -hex 32`) — it just has to match what's configured on the Vercel Cron job later.
6. Copy `.env.example` to `.env.local` in the project root and fill in the values from steps 2–5. `.env.local` is already gitignored.
7. Nothing else is required to start building — Vercel account creation and a real domain only matter once we're ready to deploy, and WayForPay/Apple Developer production accounts only matter if this ever becomes a real, paid product (§11, §8.1).
