# SocialGrid — V1 (pilot)

_Cool app for small business owners — helps with social media._

A mobile-first web app where small business owners (salons, restaurants, cafes, cloud kitchens)
ask for social media posts through a friendly chat (text, voice notes, photos), and the two
founders ("experts") make and deliver the content from an expert dashboard.
No AI in V1, but everything is stored so AI can be plugged in later.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS 4 + shadcn/ui-style components ·
Supabase (Postgres, Auth, Storage, Realtime) · next-intl (English + हिंदी) · Vercel.

---

## Accounts you need

| Service | Why | Plan |
|---|---|---|
| **GitHub** | Holds the code; Vercel deploys from it | Free |
| **Supabase** (supabase.com) | Database, logins, file storage, live chat updates | Free tier |
| **Vercel** (vercel.com) — sign up *with your GitHub account* | Hosts the website | Hobby (free) |

Optional, later: a domain name (any registrar, connect it in Vercel → Domains). Nothing else is
needed for V1 — no payment gateway, SMS, WhatsApp API or AI accounts.

> Vercel's free Hobby plan is meant for non-commercial use. Once the pilot becomes a paid
> product, move to Vercel Pro (or another host).

## Free-tier limits to know

- **Supabase pauses a free project after about a week with no activity.** With 4 active pilot
  clients this rarely happens; if it does, open the Supabase dashboard and click *Restore*.
- **Storage is about 1 GB.** Client photos are shrunk in the browser (max 2048px, JPEG ~80%)
  before upload, and expert videos are capped at 50 MB. Keep an eye on *Storage* usage in Supabase.
- Database 500 MB — plenty for the pilot.

---

## Deploy, step by step

### 1. Put the code on GitHub
Create an empty **private** repository, then from this folder:
```bash
git remote add origin https://github.com/<you>/socialgrid.git
git push -u origin main
```

### 2. Create the Supabase project
1. supabase.com → **New project**. Region: **Mumbai (ap-south-1)**. Save the database password.
2. **SQL Editor** → run these files in order (paste each, click *Run*):
   1. `supabase/migrations/0001_schema.sql`
   2. `supabase/migrations/0002_rls.sql`
   3. `supabase/migrations/0003_storage.sql`
   4. `supabase/seed.sql` (placeholder plan, festival calendar Oct 2026–Oct 2027, quick-start cards)
3. **Authentication → Sign In / Providers → Email**: keep Email enabled, turn **off**
   "Confirm email" and turn **off** "Allow new users to sign up" (experts create all accounts).
4. **Project Settings → API Keys**: copy the URL, the *publishable* key and the *secret* key.

### 3. Create the expert accounts and sample clients
```bash
cp .env.example .env.local     # fill in the 3 Supabase values (+ expert emails/names if you like)
npm install
npm run seed
```
It prints the logins and passwords **once** — save them. Experts log in with their email;
sample clients log in with the placeholder emails shown by setup — change them to real ones under Clients → client → Plan & settings → Login email.
Running it again is safe (existing accounts are skipped).

### 4. Deploy on Vercel
1. vercel.com → **Add New → Project** → import the GitHub repo (framework is auto-detected).
2. Add the environment variables from `.env.example`
   (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY`,
   optionally `NEXT_PUBLIC_SUPPORT_WHATSAPP`).
3. **Deploy.** Every push to `main` redeploys automatically.
4. Back in Supabase → **Authentication → URL Configuration**: set *Site URL* to your Vercel URL.

### 5. Before the first client
- **Settings → Festival calendar:** check the dates. Lunar festivals (Diwali, Holi, Eid, …) are best estimates.
- **Settings → Turnaround:** defaults are 6 working hours (standard), 2 (urgent), 3 (revision), 9 AM–9 PM IST, all days.
- Delete or keep the two sample clients.

---

## Logins and email

Everyone logs in with **email + password**. Founders create client accounts (no public sign-up).
Forgotten password: **Forgot password?** on the login page emails a reset link. Supabase's built-in
email sender allows only ~2 emails/hour, so send auth emails through **Resend**:

1. resend.com → sign up → **Domains** → add your domain and the DNS records it shows (until a domain is
   verified, Resend only delivers to your own address).
2. Resend → **API Keys** → create one (sending access).
3. Supabase → **Authentication → Emails → SMTP Settings** → enable custom SMTP:
   host `smtp.resend.com`, port `465`, username `resend`, password = the API key,
   sender `no-reply@yourdomain.com`, sender name `SocialGrid`.
4. Supabase → **Authentication → Rate Limits** → raise "emails per hour" (e.g. 100).
5. Supabase → **Authentication → URL Configuration** → Site URL = your site; add `https://your-site/**`
   to Redirect URLs.
6. Supabase → **Authentication → Emails → Templates → Reset password** → make the link
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/update-password`
   (works even when the email is opened on a different device).

Emergency fallback without email: set `RECOVERY_CODE` in Vercel and use `/reset`.

## AI drafts

In a request, **Write 3 drafts** creates captions + hashtags from the brand profile, menu, rules, past
posts and the client's messages; **Generate image** makes a picture for an option. Nothing is sent to
the client until an expert approves. Text uses River (DeepSeek) and falls back to OpenRouter; images
use OpenRouter. Keys and model names are environment variables (see `.env.example`), so models can be
changed in Vercel without code changes.

## Day-to-day use

**Onboarding a client (in person, ~10 min):** Expert → Clients → *Create client* → business,
owner name, login email, mobile (optional), password (auto-suggested, easy to read out) → brand wizard (basics, look,
voice, audience, things to avoid) → menu/services → weekly plan. Give the owner their email
+ password and add the site to their home screen (Chrome menu → *Add to Home screen*).

**Client:** opens the app → chat. Taps an idea card (guided 1–3 questions) or types / sends a
voice note / photos. Gets an instant "ready by 6:00 PM today" message. When ready: *Choose this
one* → *Download* → *Copy caption* (or *Share* straight to Instagram/WhatsApp). *Make changes*
sends it back to the team.

**Expert:** Queue (overdue first, colour-coded time left) → open a request → chat + client
photos (download) + brand panel + rules + photo checklist → make the post in your own tools →
upload 1–3 options, caption, hashtags, **learning tags** → *Approve & deliver*.

**Subscriptions:** Clients → client → *Plan & settings*. `paused`/`expired` blocks new requests
but the client keeps full access to past posts and chats. `past_due` shows a gentle banner.

---

## Develop locally
```bash
npm install
cp .env.example .env.local   # point at a Supabase project (a separate dev project is ideal)
npm run dev                   # http://localhost:3000
npm test                      # unit tests (turnaround + date formatting)
npm run lint && npm run typecheck && npm run check:i18n
```
`check:i18n` verifies every translation key used in code exists in both `messages/en.json`
and `messages/hi.json`.

## Project map
```
supabase/migrations/   schema, Row Level Security, storage buckets + policies
supabase/seed.sql      plan, festivals, quick-start cards
supabase/tests/        RLS isolation test (plain Postgres + stub auth/storage schemas)
scripts/seed.ts        expert + sample client accounts
messages/{en,hi}.json  all UI text
src/app/(client)/      chat, posts, brand, help
src/app/expert/        queue, request workspace, clients, teaching library, settings
src/lib/actions/       server actions (all writes)
src/lib/domain.ts      requests, revisions, messages, weekly plan slots
src/lib/turnaround.ts  working-hours due-time maths
src/lib/suggestions/   festival / inactivity / plan-reminder rules (run when the client opens chat)
src/lib/billing/       BillingProvider interface + ManualBillingProvider; request_access check
src/lib/ai/            River/OpenRouter providers with fallback, caption + image prompts
src/lib/auth/          email login (swappable AuthProvider)
```

## How it's built for later

- **AI:** `src/lib/ai/` — implement `ContentGenerator.generateDraft()` and return it from
  `getContentGenerator()` for `ai_draft_review` / `auto`; enable the mode in
  `ENABLED_AUTONOMY_MODES`. Context to feed it: brand profile, `rules` (client/industry/global)
  and `examples` (every delivered option with tags, chosen flag, brand snapshot, revision notes;
  gold-standard ones first). Voice transcription: implement `Transcriber`.
- **Razorpay:** add a `BillingProvider` implementation next to `billing/manual.ts` and a webhook
  route that calls `handleWebhook`. Plan limits are enforced in one place — the
  `request_access()` SQL function.
- **Other login methods (OTP, Google):** replace `emailPasswordAuth` in `src/lib/auth/provider.ts`.
- **More roles:** roles live in the `roles` table; add a row and extend `ROLE`/RLS helpers.
- **New content types:** `alter type public.content_type add value '…'` + add to `CONTENT_TYPES`
  and the `contentTypes` translations.

## Security model
Row Level Security is on for every table and storage bucket. Clients can only read their own
business's data and files, and can only upload into their own folder; they never see draft
options. Client actions (new requests, choosing, asking for changes) go through server actions
that verify ownership first. Experts have full access. The `SUPABASE_SECRET_KEY` is only used on
the server — never expose it in client code or share it.
