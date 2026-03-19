# UI Refactor Design — PhonePulse.it

**Date:** 2026-03-19
**Status:** Approved
**Scope:** Full frontend visual redesign (no logic changes)

---

## Overview

Complete visual refactor of PhonePulse.it — an Italian smartphone review site built with React 18 + Vite + Tailwind CSS + Supabase. The goal is to elevate the interface from a functional-but-generic layout to a distinctive editorial design with the character of a premium tech magazine.

**Mood:** Hybrid — dark header/hero, light body, editorial layout. Inspired by Wired Italia.

---

## 1. Typography

### Fonts (replacing Barlow Condensed + DM Sans)

| Role | Font | Rationale |
|------|------|-----------|
| Heading | **Bebas Neue** | Ultra-condensed grotesque. Uppercase only. Bold, editorial presence. |
| Body | **Figtree** | Humanist sans-serif. Warm, highly legible, modern. |

**Loading:** Google Fonts via `index.html` `<link>` tags.
**Important constraint:** Bebas Neue is uppercase-only — never apply to body text, nav links, or any mixed-case UI copy.

### Tailwind config update
```js
fontFamily: {
  heading: ['"Bebas Neue"', 'sans-serif'],
  body: ['"Figtree"', 'sans-serif'],
}
```

---

## 2. Color Palette

Brand colors unchanged. Usage rules tightened.

| Token | Value | Usage |
|-------|-------|-------|
| `primary` | `#FF5C1A` | CTA buttons, score badge, active nav, key accents only |
| `primary-dark` | `#E04A0F` | Hover state of primary |
| `dark` | `#0D0D0D` | Header, footer, hero, score card |
| `bg` | `#F5F4F1` | Page body background (slightly warmer than current `#FAF9F7`) |
| `surface` | `#FFFFFF` | Card backgrounds, elevated sections |
| `border` | `#E2DFD8` | Subtle dividers |
| `text-muted` | `#6B6560` | Dates, meta, secondary copy |

**New Tailwind tokens to add:** `surface`, `text-muted`

---

## 3. Texture

- **Grain noise:** SVG grain texture applied as CSS `::before` pseudoelement on the dark hero section only.
- `opacity: 0.03` — subtle, adds depth without visual weight.
- No texture on light sections.

---

## 4. Components

### 4.1 Header

**File:** `src/components/Header.jsx`

- Height: `h-16` (up from `h-14`)
- Logo: `PHONE` in Bebas Neue orange + `PULSE` white, tighter tracking
- Nav links: Figtree medium, uppercase, increased letter-spacing
- Bottom border: `border-white/5` (less heavy than current `border-white/10`)
- Social icons: unchanged position and SVGs
- Mobile menu: unchanged structure, font updated

### 4.2 Footer

**File:** `src/components/Footer.jsx`

- Three-column layout: logo | copyright + social | legal links
- Add tagline below logo: _"Recensioni smartphone per scegliere meglio."_ in Figtree, `text-white/30`
- Text opacity reduced to `text-white/25`
- Social icons slightly larger (20px instead of 16px)

### 4.3 ArticleCard (full rewrite)

**File:** `src/components/ArticleCard.jsx`

**New design:**
- Aspect ratio: `aspect-[3/4]` (portrait, more photographic)
- Image: full-cover via `object-cover`, fills entire card
- Overlay: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)`
- Text anchored to bottom of card:
  - Category badge (category color)
  - Title in Bebas Neue, white, `text-2xl`
  - Date in Figtree, `text-white/50`, `text-xs`
- Score badge: orange circle, top-right, unchanged
- Hover: `scale(1.02)` on image + `brightness(1.1)` — no translate
- No visible border

### 4.4 Home — Hero

**File:** `src/pages/Home.jsx`

- Height: `~45vh`, `min-h-[340px]`
- Background: `#0D0D0D` with grain texture via CSS `::before`
- Title: Bebas Neue, `text-7xl md:text-9xl`, white, uppercase, `leading-none` — fills most of the width
- Subtitle: Figtree, `text-base`, `text-white/50`, max ~60 characters
- CTA buttons: primary orange solid + secondary `border border-white/20`
- Remove: radial gradient, "Tech italiana" badge

### 4.5 Home — Article Grid

**File:** `src/pages/Home.jsx`

**Desktop layout:**
- Row 1: featured card `col-span-2` + one normal card `col-span-1`
- Rows 2–3: 3 normal cards each
- Total: 9 articles (unchanged from current)

**Mobile:** single column, all cards equal size
**Tablet (sm/md):** normal 2-column grid, no featured card asymmetry

### 4.6 Home — Categories Section

**File:** `src/pages/Home.jsx`

- Style: horizontal row of 5 pill-shaped links
- Dark background section (contrasts with light article grid above)
- Each pill: icon + category name in Figtree uppercase
- Replace current bordered card widget look with a cleaner "secondary nav" feel

### 4.7 ArticlePage

**File:** `src/pages/ArticlePage.jsx`

- Breadcrumb: separator `/` → `›`
- Title: Bebas Neue, `text-5xl md:text-7xl`, `leading-none`
- Excerpt: Figtree italic, `text-lg`, `text-muted`, left border `border-primary/40` (slightly thicker: `border-l-[5px]`)
- Score card: unchanged structure, font updated
- Affiliate links: more compact, orange hover border more prominent

---

## 5. CSS / index.css

- Add grain texture CSS for `.hero-grain` pseudoelement
- Update `.article-content` to use Figtree instead of DM Sans
- Update prose heading styles to use Bebas Neue
- Adjust `body` default font to Figtree

---

## 6. Implementation Order

1. `index.html` — swap Google Fonts
2. `tailwind.config.js` — update fontFamily, add surface + text-muted tokens
3. `src/index.css` — grain texture, article-content prose update
4. `src/components/Header.jsx` — font, height, spacing
5. `src/components/Footer.jsx` — tagline, font, icon size
6. `src/components/ArticleCard.jsx` — full rewrite (overlay layout)
7. `src/pages/Home.jsx` — hero, featured grid, categories
8. `src/pages/ArticlePage.jsx` — title, excerpt, breadcrumb

---

## 7. Explicit Non-Goals

The following are **not changed** in this refactor:

- All Supabase data fetching, auth, and state logic
- `SEO.jsx`, `ProtectedRoute.jsx`, `Toast.jsx`, `SchemaMarkup`
- All admin pages (`AdminLogin`, `AdminLayout`, `AdminDashboard`, `AdminArticles`, `AdminArticleEditor`, `AdminReview`)
- `CategoryPage.jsx`, `AboutPage.jsx`, `ContactPage.jsx`, `NotFound.jsx` (font inheritance applies automatically)
- Routing, `vercel.json`, `.github/workflows/`, `scripts/`

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Bebas Neue uppercase-only | Never use on body text, nav links, or mixed-case copy. Only titles and display elements. |
| Card `3/4` crop on landscape images | `object-cover` handles it; most Unsplash images are wide enough. Acceptable crop. |
| Featured `col-span-2` on tablet | Degrade gracefully to equal-width 2-column grid at `sm`/`md` breakpoints. |
