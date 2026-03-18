# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start development server (Vite)
npm run build     # Build for production
npm run preview   # Preview production build locally
```

No test runner is configured.

## Architecture

React 18 SPA built with Vite, styled with Tailwind CSS, backed by Supabase, deployed on Vercel.

**Routing:** React Router v6 in `src/App.jsx`. All routes rewrite to `index.html` via `vercel.json`. Admin routes are nested under `/admin` and wrapped with `ProtectedRoute` which calls `supabase.auth.getSession()`.

**Supabase:** Client in `src/lib/supabase.js` — env vars `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (stored in `.env.local`). RLS is enabled: public read on published articles, categories, tags, products; writes require authenticated admin user.

**SEO:** `react-helmet-async` — `HelmetProvider` wraps the app in `main.jsx`. Use `<SEO>` component (`src/components/SEO.jsx`) on every page.

**Markdown:** `marked` library. Article `content` field is Markdown; rendered with `marked.parse()` + `dangerouslySetInnerHTML` inside `.article-content` wrapper (prose styles defined in `index.css`).

**Styling:** Tailwind CSS with custom theme:
- Brand: `primary` (#FF5C1A), `primary-dark` (#E04A0F)
- Background: `bg` (#FAF9F7 cream), `dark` (#0D0D0D)
- Border: `border` (#E5E2DB)
- Fonts: `font-heading` → Barlow Condensed, `font-body` → DM Sans (loaded via Google Fonts in `index.html`)

## Source layout

```
src/
  components/
    Header.jsx          — sticky dark nav with mobile hamburger; Instagram + Telegram icons (desktop nav + mobile menu)
    Footer.jsx          — minimal dark footer with Instagram + Telegram icons
    ArticleCard.jsx     — card with cover, category badge, score badge
    SEO.jsx             — react-helmet-async meta tags
    ProtectedRoute.jsx  — auth guard, redirects to /admin/login
    Toast.jsx           — useToast hook + ToastContainer (fixed bottom-right, auto-dismiss 3.5s)
  pages/
    Home.jsx            — hero + 9 latest articles + categories grid
    ArticlePage.jsx     — /articoli/:slug, markdown rendering, affiliate links
    CategoryPage.jsx    — /categoria/:slug, paginated (12/page)
    AboutPage.jsx       — /chi-siamo (static)
    ContactPage.jsx     — /contatti (static, phonepulse.it@gmail.com)
    NotFound.jsx        — 404
    admin/
      AdminLogin.jsx        — /admin/login, supabase.auth.signInWithPassword
      AdminLayout.jsx       — sidebar layout with Outlet, handles logout
      AdminDashboard.jsx    — /admin/dashboard, stats counters
      AdminArticles.jsx     — /admin/articoli, table with edit/delete
      AdminArticleEditor.jsx — /admin/articoli/nuovo + /admin/articoli/:id
      AdminReview.jsx       — /admin/review, review/publish/discard AI-generated drafts (is_published=false)
  lib/
    supabase.js         — Supabase client
scripts/
  news_automation.py    — Python script: fetches RSS feeds, filters by keywords, generates drafts via Gemini/OpenRouter LLM, fetches cover image from Unsplash, inserts as unpublished articles in Supabase; sends Telegram notification on completion
  requirements.txt      — Python deps (feedparser, requests, supabase, etc.)
.github/workflows/
  news-automation.yml   — GitHub Actions: runs news_automation.py every 2 hours (cron) + manual trigger; secrets: GEMINI_API_KEY, OPENROUTER_API_KEY, UNSPLASH_ACCESS_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
```

## Database schema (Supabase, schema public)

| Table | Key fields |
|-------|-----------|
| `articles` | id, slug, title, excerpt, content (markdown), category_id→categories, cover_image_url, author, published_at, is_published, seo_title, seo_description, affiliate_links (jsonb array of `{label, url}`), score (0-100) |
| `categories` | id, name, slug, description, color (hex) — seeded: Recensioni, Comparativi, Guide, News, Offerte |
| `tags` | id, name, slug |
| `article_tags` | article_id, tag_id (pivot) |
| `products` | id, name, brand, slug, image_url, price_it, amazon_url, specs (jsonb) |

When querying articles with category: `.select('*, categories(id, name, slug, color)')` — the join comes back as `article.categories` (object, not array).

## Social channels

- Instagram: `https://www.instagram.com/phonepulse.it`
- Telegram: `https://t.me/PhonePulseIT`

Icons are SVG inline (no external library) in `Header.jsx` and `Footer.jsx`. When adding new social channels, follow the same pattern.

## Admin setup

Create admin user via Supabase Dashboard → Authentication → Users → Invite user (use phonepulse.it@gmail.com). Login at `/admin/login`.
