-- SocialGrid V1 schema
-- Tables, enums and helper functions. RLS lives in 0002, storage in 0003.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Enums (add values later with `alter type ... add value`)
-- ---------------------------------------------------------------------------
create type public.industry as enum ('salon', 'restaurant', 'cafe', 'cloud_kitchen');
create type public.autonomy_mode as enum ('manual', 'ai_draft_review', 'auto');
create type public.content_type as enum (
  'single_post', 'carousel', 'story', 'reel', 'festival_greeting', 'caption_only'
);
create type public.message_sender as enum ('client', 'expert', 'system');
create type public.message_kind as enum (
  'text', 'voice', 'images', 'options_card', 'suggestion', 'status'
);
create type public.request_source as enum ('chat', 'quick_start', 'suggestion', 'plan_slot');
create type public.request_status as enum (
  'new', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled'
);
create type public.rule_scope as enum ('client', 'industry', 'global');
create type public.example_source as enum ('delivered', 'manual');
create type public.suggestion_kind as enum ('festival', 'inactivity', 'plan_reminder', 'custom');
create type public.suggestion_status as enum ('pending', 'accepted', 'dismissed');
create type public.subscription_status as enum ('trial', 'active', 'past_due', 'paused', 'expired');
create type public.plan_slot_status as enum ('planned', 'waiting_photo', 'in_progress', 'done');
create type public.emoji_level as enum ('none', 'some', 'lots');

-- ---------------------------------------------------------------------------
-- Roles & profiles
-- ---------------------------------------------------------------------------
create table public.roles (
  id   smallint primary key,
  name text not null unique
);
insert into public.roles (id, name) values (1, 'expert'), (2, 'client');

create table public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  role_id               smallint not null references public.roles (id),
  display_name          text not null,
  phone                 text unique,
  preferred_ui_language text not null default 'en' check (preferred_ui_language in ('en', 'hi')),
  created_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Businesses & brand
-- ---------------------------------------------------------------------------
create table public.businesses (
  id                  uuid primary key default gen_random_uuid(),
  owner_profile_id    uuid not null unique references public.profiles (id) on delete restrict,
  name                text not null,
  industry            public.industry not null,
  autonomy_mode       public.autonomy_mode not null default 'manual',
  suggestions_enabled boolean not null default true,
  photo_consent       boolean not null default false,
  created_at          timestamptz not null default now()
);

create table public.brand_profiles (
  business_id       uuid primary key references public.businesses (id) on delete cascade,
  owner_name        text,
  address           text,
  maps_link         text,
  timings           text,
  contact_phone     text,
  whatsapp          text,
  logo_path         text,
  colors            jsonb not null default '{"primary":"#E8590C","secondary":"#FFF4E6","accent":"#2B8A3E"}',
  font_style        text not null default 'modern',
  example_paths     jsonb not null default '[]',
  tone              text not null default 'friendly',
  content_languages text[] not null default '{en}',
  default_language  text not null default 'en',
  emoji_level       public.emoji_level not null default 'some',
  audience          text,
  audience_tags     text[] not null default '{}',
  avoid_list        text[] not null default '{}',
  avoid_custom      text,
  signature_items   text,
  current_offers    text,
  updated_at        timestamptz not null default now()
);

create table public.offerings (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null,
  price        numeric(10, 2),
  description  text,
  photo_path   text,
  is_signature boolean not null default false,
  sort         int not null default 0,
  created_at   timestamptz not null default now()
);
create index on public.offerings (business_id);

-- Photos the client adds from the "Your brand" page
create table public.brand_photos (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  path        text not null,
  uploaded_by uuid references public.profiles (id),
  created_at  timestamptz not null default now()
);
create index on public.brand_photos (business_id);

-- ---------------------------------------------------------------------------
-- Weekly plan
-- ---------------------------------------------------------------------------
create table public.weekly_plans (
  business_id uuid primary key references public.businesses (id) on delete cascade,
  -- [{ "type": "reel", "goal": "offer", "day": 1 }]  day: 0 = Monday ... 6 = Sunday
  slots       jsonb not null default '[]',
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Conversations & requests
-- ---------------------------------------------------------------------------
create table public.conversations (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null unique references public.businesses (id) on delete cascade,
  created_at  timestamptz not null default now()
);

create table public.requests (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete cascade,
  source             public.request_source not null default 'chat',
  quick_start_type   text,
  structured_answers jsonb not null default '{}',
  summary            text,
  content_type       public.content_type,
  language           text,
  is_urgent          boolean not null default false,
  status             public.request_status not null default 'new',
  due_at             timestamptz not null,
  current_revision   int not null default 0,
  plan_slot_id       uuid,
  suggestion_id      uuid,
  created_by         uuid references public.profiles (id),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  delivered_at       timestamptz,
  completed_at       timestamptz
);
create index on public.requests (business_id, created_at desc);
create index on public.requests (status, due_at);

create table public.plan_slots (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  week_start  date not null,
  slot_index  int not null,
  day         smallint not null default 0,
  type        public.content_type not null,
  goal        text,
  status      public.plan_slot_status not null default 'planned',
  request_id  uuid references public.requests (id) on delete set null,
  reminded_at timestamptz,
  unique (business_id, week_start, slot_index)
);
alter table public.requests
  add constraint requests_plan_slot_fk foreign key (plan_slot_id)
  references public.plan_slots (id) on delete set null;

create table public.messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.conversations (id) on delete cascade,
  sender            public.message_sender not null,
  sender_profile_id uuid references public.profiles (id),
  kind              public.message_kind not null default 'text',
  body              text,
  -- [{ "bucket": "client-uploads", "path": "...", "type": "image" | "audio", "duration": 12 }]
  attachments       jsonb not null default '[]',
  -- kind-specific data: chips, option ids, suggestion id, i18n key + params for system text
  payload           jsonb not null default '{}',
  request_id        uuid references public.requests (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index on public.messages (conversation_id, created_at);
create index on public.messages (request_id);

create table public.conversation_reads (
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  profile_id      uuid not null references public.profiles (id) on delete cascade,
  last_read_at    timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

create table public.revisions (
  id                 uuid primary key default gen_random_uuid(),
  request_id         uuid not null references public.requests (id) on delete cascade,
  number             int not null,
  client_feedback    text,
  feedback_chip      text,
  expert_change_note text,
  due_at             timestamptz,
  created_at         timestamptz not null default now(),
  unique (request_id, number)
);

create table public.content_options (
  id               uuid primary key default gen_random_uuid(),
  request_id       uuid not null references public.requests (id) on delete cascade,
  revision_id      uuid references public.revisions (id) on delete set null,
  revision_number  int not null default 0,
  position         int not null default 0,
  content_type     public.content_type not null default 'single_post',
  -- [{ "path": "...", "type": "image" | "video", "name": "slide-1.jpg" }]
  media            jsonb not null default '[]',
  caption          text,
  hashtags         text,
  language         text not null default 'en',
  -- { "script": "", "shot_list": "", "on_screen_text": "", "audio_mood": "" }
  reel_fields      jsonb not null default '{}',
  -- { "occasion": [], "style": [], "goal": [] }
  tags             jsonb not null default '{}',
  why_it_works     text,
  expert_notes     text,
  chosen           boolean not null default false,
  is_gold_standard boolean not null default false,
  brand_snapshot   jsonb,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now(),
  delivered_at     timestamptz
);
create index on public.content_options (request_id);

create table public.downloads (
  id         uuid primary key default gen_random_uuid(),
  option_id  uuid not null references public.content_options (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  action     text not null default 'download',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Teaching library
-- ---------------------------------------------------------------------------
create table public.rules (
  id          uuid primary key default gen_random_uuid(),
  scope       public.rule_scope not null default 'client',
  business_id uuid references public.businesses (id) on delete cascade,
  industry    public.industry,
  text        text not null,
  active      boolean not null default true,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  check (
    (scope = 'client' and business_id is not null)
    or (scope = 'industry' and industry is not null)
    or scope = 'global'
  )
);

create table public.examples (
  id               uuid primary key default gen_random_uuid(),
  source           public.example_source not null,
  option_id        uuid unique references public.content_options (id) on delete cascade,
  request_id       uuid references public.requests (id) on delete set null,
  industry         public.industry,
  business_id      uuid references public.businesses (id) on delete set null,
  content_type     public.content_type,
  media            jsonb not null default '[]',
  caption          text,
  notes            text,
  tags             jsonb not null default '{}',
  is_gold_standard boolean not null default false,
  brand_snapshot   jsonb,
  created_by       uuid references public.profiles (id),
  created_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Calendar & suggestions
-- ---------------------------------------------------------------------------
create table public.festivals (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  name_hi           text not null,
  date              date not null,
  industries        public.industry[] not null default '{salon,restaurant,cafe,cloud_kitchen}',
  default_lead_days int not null default 5,
  active            boolean not null default true
);
create index on public.festivals (date);

create table public.suggestions (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  kind        public.suggestion_kind not null,
  -- { "title_en", "title_hi", "text_en", "text_hi", "festival_id", "content_type" }
  payload     jsonb not null default '{}',
  dedupe_key  text,
  show_at     timestamptz not null default now(),
  status      public.suggestion_status not null default 'pending',
  message_id  uuid references public.messages (id) on delete set null,
  created_by  uuid references public.profiles (id),
  created_at  timestamptz not null default now(),
  unique (business_id, dedupe_key)
);

-- ---------------------------------------------------------------------------
-- Plans & subscriptions
-- ---------------------------------------------------------------------------
create table public.plans (
  id        uuid primary key default gen_random_uuid(),
  name      text not null,
  price_inr int not null default 0,
  -- { "requests_per_month": null | number, "content_types": null | ["single_post", ...] }
  limits    jsonb not null default '{}',
  active    boolean not null default true
);

create table public.subscriptions (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null unique references public.businesses (id) on delete cascade,
  plan_id            uuid references public.plans (id),
  status             public.subscription_status not null default 'trial',
  current_period_end timestamptz,
  provider           text not null default 'manual',
  provider_ref       text,
  updated_at         timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Settings (single row) & quick-start cards
-- ---------------------------------------------------------------------------
create table public.settings (
  id                   smallint primary key default 1 check (id = 1),
  standard_hours       numeric(5, 2) not null default 6,
  urgent_hours         numeric(5, 2) not null default 2,
  revision_hours       numeric(5, 2) not null default 3,
  work_start           time not null default '09:00',
  work_end             time not null default '21:00',
  -- ISO weekday numbers: 1 = Monday ... 7 = Sunday
  work_days            smallint[] not null default '{1,2,3,4,5,6,7}',
  timezone             text not null default 'Asia/Kolkata',
  suggestion_lead_days int not null default 5,
  inactivity_days      int not null default 7,
  updated_at           timestamptz not null default now()
);
insert into public.settings (id) values (1);

create table public.quick_start_cards (
  id           uuid primary key default gen_random_uuid(),
  industry     public.industry not null,
  key          text not null,
  label_en     text not null,
  label_hi     text not null,
  icon         text not null default 'sparkles',
  content_type public.content_type not null default 'single_post',
  -- [{ "id": "item", "q_en": "", "q_hi": "", "type": "choice" | "text" | "photo",
  --    "options": [{ "en": "", "hi": "" }] }]
  questions    jsonb not null default '[]',
  sort         int not null default 0,
  active       boolean not null default true,
  unique (industry, key)
);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so they can be used inside RLS policies)
-- ---------------------------------------------------------------------------
create or replace function public.is_expert()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles p join roles r on r.id = p.role_id
    where p.id = auth.uid() and r.name = 'expert'
  );
$$;

create or replace function public.owns_business(bid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from businesses b where b.id = bid and b.owner_profile_id = auth.uid());
$$;

-- Same check for storage paths, whose first folder is the business id as text
create or replace function public.owns_business_folder(folder text)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from businesses b where b.id::text = folder and b.owner_profile_id = auth.uid()
  );
$$;

create or replace function public.can_see_business(bid uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_expert() or public.owns_business(bid);
$$;

-- The single place where "may this business create a new request?" is decided.
-- Returns 'ok', 'inactive' (paused/expired), 'limit_reached' or 'type_not_allowed'.
create or replace function public.request_access(bid uuid, ctype public.content_type default null)
returns text
language plpgsql stable security definer set search_path = public
as $$
declare
  sub    subscriptions%rowtype;
  lim    jsonb;
  quota  int;
  used   int;
  tz     text;
begin
  select * into sub from subscriptions where business_id = bid;
  if found and sub.status in ('paused', 'expired') then
    return 'inactive';
  end if;

  if found and sub.plan_id is not null then
    select limits into lim from plans where id = sub.plan_id;
  end if;
  lim := coalesce(lim, '{}'::jsonb);

  if ctype is not null and jsonb_typeof(lim -> 'content_types') = 'array'
     and not (lim -> 'content_types') ? ctype::text then
    return 'type_not_allowed';
  end if;

  if jsonb_typeof(lim -> 'requests_per_month') = 'number' then
    quota := (lim ->> 'requests_per_month')::int;
    select timezone into tz from settings where id = 1;
    select count(*) into used from requests r
    where r.business_id = bid
      and r.status <> 'cancelled'
      and r.created_at >= (date_trunc('month', now() at time zone coalesce(tz, 'Asia/Kolkata'))
                           at time zone coalesce(tz, 'Asia/Kolkata'));
    if used >= quota then
      return 'limit_reached';
    end if;
  end if;

  return 'ok';
end;
$$;

-- Client may edit only timings and offering prices; everything else is expert-owned.
create or replace function public.client_update_timings(bid uuid, new_timings text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.owns_business(bid) then
    raise exception 'not allowed';
  end if;
  update brand_profiles set timings = new_timings, updated_at = now() where business_id = bid;
end;
$$;

create or replace function public.client_update_offering_price(oid uuid, new_price numeric)
returns void
language plpgsql security definer set search_path = public
as $$
declare bid uuid;
begin
  select business_id into bid from offerings where id = oid;
  if bid is null or not public.owns_business(bid) then
    raise exception 'not allowed';
  end if;
  update offerings set price = new_price where id = oid;
end;
$$;

-- updated_at bookkeeping
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger requests_touch before update on public.requests
  for each row execute function public.touch_updated_at();
create trigger brand_profiles_touch before update on public.brand_profiles
  for each row execute function public.touch_updated_at();
create trigger subscriptions_touch before update on public.subscriptions
  for each row execute function public.touch_updated_at();
create trigger weekly_plans_touch before update on public.weekly_plans
  for each row execute function public.touch_updated_at();
