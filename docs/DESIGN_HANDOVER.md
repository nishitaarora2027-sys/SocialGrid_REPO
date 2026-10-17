# SocialGrid — UI/UX Redesign Handover

> For: Claude Design · From: SocialGrid founders · Status: V1 pilot is live; full UI/UX redesign requested before wider launch.

---

## 1. Live app (review the current design here)

**URL:** https://socialgrid-wheat.vercel.app

| What to review | How to get in |
|---|---|
| **Customer side** (business owner) | `/login` → **Customer login** tab → demo customer: `demo.customer@socialgrid.test` / *(password shared separately by the founders)* |
| **Team side** (SocialGrid founders) | `/login` → **SocialGrid team** tab → demo founder login *(shared separately by the founders)* |
| Public pages, no login | `/login`, `/forgot`, `/reset` (owner-only account rescue, needs a recovery code) |

Review on **desktop first**, then at phone width (≈390 px).
Language toggle **English / हिंदी** is in the top bar of every screen — check both.

---

## 2. What SocialGrid is (60-second version)

SocialGrid is a done-for-you social media service for **small Indian businesses** — salons, restaurants, cafes, cloud kitchens.

- The **business owner (customer)** asks for posts the way they'd message a friend: type, send a voice note, or share photos in a **chat**. They get finished posts back (image/carousel/reel + caption + hashtags), pick one, download it and post it to Instagram/WhatsApp themselves.
- The **SocialGrid team (2–3 founders, "experts")** receive these requests in a **queue**, make the content (by hand or with the built-in **AI draft** helper), and deliver 1–3 options per request back into the chat.
- Every delivered post is saved with tags so an AI can learn each brand's taste later.

**Promise to customers:** "Tell us what you need in your own words, we'll handle the rest — ready by a clear time."

### Who uses it

| Persona | Who | Device | Tech comfort | What they care about |
|---|---|---|---|---|
| **Customer** | Owner of a salon/restaurant/cafe in a tier-1/2 Indian city, 25–55, often Hindi-first | Phone mostly; sometimes laptop | Low–medium. Lives in WhatsApp & Instagram | Speed, zero effort, posts that look professional, knowing *when* it'll be ready |
| **Founder / expert** | SocialGrid team member making the content | **Laptop first**, phone on the go | High | Seeing what's due, all context for a client in one place, delivering fast, not missing anything |

---

## 3. Design direction (founders' specifications)

### 3.1 Feel
- **"A mix of minimal, familiar and playful."** There should be *stuff* on screen — helpful, alive, a bit of personality — but **never so much that it feels confusing or complicated**.
- **Benchmark for ease: the ChatGPT website** — one obvious place to type, a clean side panel for history/navigation, calm layout, instant understanding of what to do next. **But not as bare as ChatGPT**: we want warmth, light colour, friendly illustrations/emoji moments, visual previews of posts.
- **Familiar:** the customer chat should feel as natural as WhatsApp (bubbles, voice notes, photo sharing, ticks/status).
- **Playful, in small doses:** celebration moments (post delivered, post downloaded — confetti exists today), friendly empty states, idea cards with icons. Never cartoonish for the team side.
- Must work for **non-technical, Hindi-first users**: big tap targets, plain words, icons + labels (not icon-only), no jargon.

### 3.2 Scope & freedom
- **Redesign everything:** customer app, team dashboard, and all auth pages (login, forgot password, set new password, account rescue, first-time setup) — **one consistent design system**.
- **Flows may be rethought**, not just restyled: navigation, page structure, order of steps can change — **as long as every existing feature (section 5) is still covered**. Call out anything you propose to remove or merge.
- New features are *not* in scope for this pass, but note ideas in a separate "Later" list.

### 3.3 Devices
1. **Desktop is the priority** for both sides (design desktop first; ≥1280 px).
2. **Phone must also work well for everyone** (customers *and* founders) — second priority, ≈360–430 px.
3. Tablet: just needs to not break.

### 3.4 Brand
- Name: **SocialGrid**. Current logo: a 2×2 rounded-grid mark in orange — refresh it to fit the new palette (propose options).
- **Brand palette — chosen by the founders** (reference image: [`docs/design/brand-palette.jpg`](design/brand-palette.jpg)). This **replaces** today's orange/cream:

  | Name | Hex | Role |
  |---|---|---|
  | **Salted Caramel** | `#B9825B` | Primary brand colour — warmth, accents, highlights, illustrations |
  | **Sea Glass** | `#8FB9B2` | Secondary — calm accents, success/positive moments, tags, the team side's cooler tone |
  | **Shell White** | ≈`#EAE3D8` (sample from the image) | Base / background surfaces |

  The mood of the reference: natural, tactile, premium-but-warm (caramel, sea glass, shells), with **bold, heavy, wide display type** for headings.
- ⚠️ **Contrast note (measured):** the palette colours are too light to carry text or primary buttons on their own:
  - Caramel on Shell White 2.6:1, Caramel on white 3.3:1, Sea Glass on Shell White 1.7:1, white on Sea Glass 2.2:1 — all below the **4.5:1** needed for body text.
  - Please **derive a tonal scale** for each colour and use the **deeper shades for text, icons and button fills** (e.g. a deep caramel ≈`#8A5A38` gives 4.6:1 on Shell White and 5.8:1 with white text; a deep sea glass ≈`#3F6F69` gives 4.5:1 / 5.7:1), with a warm near-black ink (≈`#2B2420`, 12:1 on Shell White) for body copy. Keep the three palette colours as the recognisable surfaces and accents.
  - Status colours (overdue/urgent red, warning amber) still need to exist — tune them to sit with this palette.
- Typography must render **Devanagari (Hindi) and Latin equally well** (current fallback stack includes Noto Sans Devanagari). Hindi text runs ~20–30% longer than English — layouts must allow it. The heavy display style from the reference is for headings only; body text must stay highly readable.
- Must meet **WCAG AA contrast**; minimum 16 px body on phones, 44 px tap targets.
- **Themes:** design **both light and dark**, with **light as the default** and a user toggle (both customer and team sides). Derive the dark theme from the same palette.

### 3.5 Inspiration references
- **ChatGPT website** — ease, one obvious input, calm side navigation (but we want more warmth and content than it has).
- **Claude (claude.ai)** — warm, calm, readable; good model for the chat, side panel and the AI-helper feel.
- **Instagram** — visual-first post previews (grid, carousel dots, reels), familiar to every customer; the Posts library and delivered-post cards should feel at home next to Instagram.
- **WhatsApp** — chat familiarity for customers (bubbles, voice notes, photos, ticks).

### 3.6 Decisions already made
- **Login stays one page with two clearly separated choices** ("Customer" vs "SocialGrid team") — no separate login URLs for now. Make the distinction unmistakable within that single page.
- Light theme default; dark theme available via toggle.
- Brand palette fixed as above; logo may evolve to match.

---

## 4. Current information architecture (as built today)

```
Public
├── /login            Two tabs: "Customer login" | "SocialGrid team" (email + password, show/hide, Forgot password?)
├── /forgot           Enter email → reset link emailed
├── /update-password  Set new password (from the email link)
├── /reset            Owner-only "Account rescue" (recovery code → list all logins, set passwords,
│                     create test customer, create/repair founder login)
└── /setup            One-time first-run setup (creates database + founder logins); locked afterwards

Customer (business owner)            Team (founders / experts)
├── /chat   ← home                   ├── /expert            Request queue (home)
├── /posts  Library of delivered     ├── /expert/requests/:id  Request workspace
├── /brand  Their brand details      ├── /expert/clients    Client list
└── /help   How it works + contact   ├── /expert/clients/new   Create client (onboarding)
                                     ├── /expert/clients/:id   Client detail (tabs)
                                     ├── /expert/library    Teaching library (examples, rules)
                                     └── /expert/settings   Settings (tabs)
```

Customer nav today: header with business name, language toggle, hamburger menu (Chat, Your posts, Your brand, Help, Log out).
Team nav today: left sidebar on desktop (Queue with count, Clients, Teaching library, Settings, language, log out).

---

## 5. Feature inventory — everything the new design must cover

### 5.1 Auth & accounts
- Login with **email + password**, two clearly separated audiences (customer vs team). Wrong-tab message auto-switches the tab.
- Show/hide password; keeps typed email after an error; clear error messages (wrong password, wrong tab, invalid email, service problem with a short code).
- **Forgot password** (email link) → **Set new password** page → continue to the right home.
- **Account rescue** (owner-only, recovery code): list of all logins grouped *Team / Customers / Unfinished*, set any password, create a test customer, create or repair a founder login.
- **First-time setup** page (rarely seen; can stay simple).
- Language toggle EN/HI everywhere, remembered per user.

### 5.2 Customer app
**Chat (home)**
- Conversation with the SocialGrid team: text, **voice notes** (record up to 2 min, playback), **photos** (multi-select, compressed before upload), system messages ("Got it! Ready by 6:00 PM today", "Working on it", "Your post is ready").
- **Quick-start idea cards** (e.g. "Festival post", "New offer", "Today's special") → a guided sheet with 1–3 simple questions → creates a request.
- **Suggestions** from the system inside chat (upcoming festival, "haven't posted in a while", weekly-plan reminders) with accept/dismiss.
- When sending a message while a post is recent, the app asks: **"A new post"** or **"Changes to <that post>"**.
- **Receiving content:** an options card with 1–3 options (single image, carousel with slide count, reel with script/shot list, story, caption-only) → **Choose this one** → **Download** (single image, each slide, or all slides as a zip) → **Copy caption** → **Share** (native share sheet to Instagram/WhatsApp) → celebration moment.
- **Ask for changes** on a delivered post: quick chips ("Change colours", "Shorter caption", …) + free text → goes back to the team; revision count shown.
- Status visibility: due time / "ready by", ticks for delivered/read, live updates (realtime).
- Subscription banners: **past due** (gentle reminder), **paused/expired** (can't send new requests but can still see everything).
- Welcome state for brand-new customers (idea cards visible until the first message).

**Your posts (library)** — grid of every delivered/chosen post, filter by type (post, carousel, reel, story, festival, caption-only), re-download, copy caption.

**Your brand** — what SocialGrid knows about their business: name, timings (editable), address, contact, brand photos (customer can add), menu/services with prices (customer can edit price), colours, tone. Customer can edit only some fields.

**Help** — how it works in 3–4 steps, WhatsApp/call the team.

### 5.3 Team dashboard
**Queue (home)**
- All open requests across clients, **overdue first**, colour-coded time left (green → amber → red), urgent flag, status chips (New, In progress, Changes asked, Delivered, Completed, Cancelled), counts.

**Request workspace** (the most important team screen — dense, must stay calm)
- Left/centre: the full **chat with the client** (send messages, ask for a photo), client photos with download, voice notes.
- **Options editor** (1–3 options): content type, media upload (image/video, reorder, remove), caption, language (EN/HI/Hinglish), hashtags, reel fields (script, shot list, on-screen text, audio mood), **learning tags** (occasion, style, goal — required before delivery), "why it works", internal notes.
- **AI helper:** "✨ Write 3 drafts" (captions + hashtags from the brand profile, menu, rules, past posts, client's words; language picker) and "✨ Generate image" per option (pre-filled idea). Shows loading (10–60 s) and errors.
- Actions: Mark in progress, Save draft, **Approve & deliver**, change note for revisions, mark urgent, cancel.
- Right panel: **brand panel** (colours, fonts, tone, languages, audience, signature items, current offers, contact), **things to avoid**, **rules** (client / industry / global), photo-consent warning, recent chosen posts.

**Clients** — list with status; **Create client** (business name, owner name, login email, optional mobile/WhatsApp, password generator, industry, language) → **brand wizard** (basics, look, voice, audience, things to avoid) → menu/services → weekly plan.

**Client detail** (tabs): Brand profile · Menu/services · Weekly plan (posting slots per day; start a slot as a request) · Plan & settings (subscription status/plan/period, autonomy mode, suggestions on/off, photo consent, custom suggestions, **login email**, **reset password**) · History (all requests).

**Teaching library** — examples (delivered posts with tags, mark as gold standard, manual examples) and rules (client/industry/global) that train future AI.

**Settings** (tabs): Turnaround (working hours, standard/urgent/revision hours, working days) · Festival calendar (add/edit/delete) · Plans (price, limits) · Quick-start cards (per industry, questions) · **My account** (change my password, add a founder).

---

## 6. Known UX pain points to solve
1. **Login confusion** — two audiences on one page caused real failed logins; the new design must make "Customer vs Team" unmistakable **on the same page** (see 3.6).
2. The **request workspace is dense**; on smaller laptops the editor and context panels compete. Needs clear hierarchy: what's due, what the client asked, what I'm delivering.
3. Customer header can feel crowded on phones (long business names + language toggle + menu).
4. The **AI helper** was bolted on — it should feel native (where drafts appear, how to compare/accept/regenerate).
5. Options editor is a long scrolling form; learning-tag fields feel like homework.
6. Empty states and loading states are plain.
7. Status of a request (where is my post?) could be more visible to customers without opening chat history.

---

## 7. Content & language rules
- Every string exists in **English and Hindi**; designs should show both for key screens.
- Tone toward customers: warm, simple, respectful ("Sunita जी"), short sentences, no tech words ("request" → "post you asked for").
- Times are shown in IST with friendly phrasing ("Ready by 6:00 PM today", "tomorrow 10:30 AM").
- Money in ₹ with Indian grouping (₹16,000).

---

## 8. Technical constraints (so designs are buildable)
- Built with **Next.js + Tailwind CSS 4 + shadcn/ui-style components (Radix primitives)** and lucide icons. Any design that maps to these is cheapest to build; custom illustration and motion are fine.
- Realtime chat updates, file uploads (photos ≤ ~2 MB after compression, videos ≤ 50 MB), voice recording in the browser.
- Installed as a home-screen web app on phones (PWA), so no browser chrome assumptions.
- Customers can't see draft (undelivered) options; experts see everything.

---

## 9. What we'd like back from Design
1. **Design principles + mood** (2–3 directions, then one chosen) matching section 3.
2. **Design system:** colour tokens built on the brand palette (light default + dark, with the tonal scales from 3.4), type scale (Latin + Devanagari), spacing, radius, elevation, iconography, illustration style, motion.
3. **Component library:** buttons, inputs, tabs, chips/tags, chat bubbles (text, voice, photo, system, options card), post previews (single/carousel/reel/story), status badges, timers, empty/loading/error states, toasts, sheets/dialogs.
4. **Key screens — desktop first, then phone:**
   - Login (+ forgot / set new password / account rescue)
   - Customer: Chat (empty, active, post ready, asking for changes), Posts library, Brand, Help, subscription banners
   - Team: Queue, Request workspace (incl. AI drafts), Clients list, Create client + brand wizard, Client detail tabs, Teaching library, Settings
5. **Revised flows** where you changed structure, with a short note of what moved and why, and a checklist proving every feature in section 5 is still covered.
6. A **"Later" list** of feature ideas that came up but are out of scope.

---

*Questions for the founders can be added at the end of this file.*
