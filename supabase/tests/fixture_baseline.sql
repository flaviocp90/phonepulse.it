-- Synthetic baseline only; no private records or real Auth. Run in an empty local database.
\set ON_ERROR_STOP on
DO $$ begin if not exists(select from pg_roles where rolname='anon') then create role anon; end if; if not exists(select from pg_roles where rolname='authenticated') then create role authenticated; end if; if not exists(select from pg_roles where rolname='service_role') then create role service_role bypassrls; end if; end $$;
create schema auth;
create function auth.role() returns text language sql stable as 'select current_user::text';
grant usage on schema public, auth to anon, authenticated, service_role;
create table public."categories" ("id" uuid not null default gen_random_uuid(),
"name" text not null,
"slug" text not null,
"description" text,
"color" text default '#FF5C1A'::text,
"created_at" timestamp with time zone default now());
alter table public."categories" add constraint "categories_pkey" PRIMARY KEY (id);
alter table public."categories" add constraint "categories_slug_key" UNIQUE (slug);
alter table public."categories" enable row level security;
create table public."articles" ("id" uuid not null default gen_random_uuid(),
"slug" text not null,
"title" text not null,
"excerpt" text,
"content" text,
"category_id" uuid,
"cover_image_url" text,
"author" text default 'PhonePulse'::text,
"published_at" timestamp with time zone,
"created_at" timestamp with time zone default now(),
"updated_at" timestamp with time zone default now(),
"is_published" boolean default false,
"seo_title" text,
"seo_description" text,
"affiliate_links" jsonb default '[]'::jsonb,
"score" integer,
"needs_review" boolean default false,
"discarded" boolean default false,
"llm_model" text,
"image_source" text);
alter table public."articles" add constraint "articles_category_id_fkey" FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
alter table public."articles" add constraint "articles_pkey" PRIMARY KEY (id);
alter table public."articles" add constraint "articles_score_check" CHECK (((score >= 0) AND (score <= 100)));
alter table public."articles" add constraint "articles_slug_key" UNIQUE (slug);
alter table public."articles" enable row level security;
create table public."daily_counters" ("id" uuid not null default gen_random_uuid(),
"date" date not null,
"gemini_calls" integer default 0,
"updated_at" timestamp with time zone default now(),
"google_cse_calls" integer default 0);
alter table public."daily_counters" add constraint "daily_counters_date_key" UNIQUE (date);
alter table public."daily_counters" add constraint "daily_counters_pkey" PRIMARY KEY (id);
alter table public."daily_counters" enable row level security;
create policy "Authenticated users can read all articles" on public."articles" for SELECT to "authenticated" using (true);
create policy "Authenticated users can update articles" on public."articles" for UPDATE to "authenticated" using (true) with check (true);
create policy "Public read published articles" on public."articles" for SELECT to "public" using ((is_published = true));
create policy "Allow all for service role" on public."daily_counters" for ALL to "public" using (true) with check (true);
grant all on public.articles, public.daily_counters to anon, authenticated, service_role;
insert into public.articles(slug,title,is_published,needs_review,discarded) select 'synthetic-'||n,'Synthetic article '||n,n<=90,n between 50 and 90 or n between 91 and 4449,n>4450 from generate_series(1,4784) n;
insert into public.daily_counters(date) select date '2020-01-01'+n from generate_series(0,88) n;

-- Task 3: tags schema verified from Task 1 inventory metadata, no private rows.
create table public.tags (
  id uuid primary key default gen_random_uuid(), name text not null,
  slug text not null unique, created_at timestamptz default now()
);
create table public.article_tags (
  article_id uuid not null references public.articles(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  primary key (article_id, tag_id)
);
alter table public.tags enable row level security;
alter table public.article_tags enable row level security;
create policy "Public read tags" on public.tags for select using (true);
create policy "Public read article_tags" on public.article_tags for select using (true);
grant all on public.tags, public.article_tags to anon, authenticated, service_role;
