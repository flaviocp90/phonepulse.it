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

**Loading:** Google Fonts via `index.html` `<link>` tags. Replace existing Barlow Condensed + DM Sans `<link>` elements with new Bebas Neue + Figtree ones. Leave all other `<link>`, `<script>`, and `<meta>` tags in `index.html` untouched (including Ahrefs verification meta and analytics scripts — do not remove or reorder them).

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

The following tokens are updated in `tailwind.config.js`. `primary` and `primary-dark` and `dark` are unchanged. `bg` and `border` values are updated (see below). `surface` and `text-muted` are new tokens.

| Token | Old Value | New Value | Usage |
|-------|-----------|-----------|-------|
| `primary` | `#FF5C1A` | `#FF5C1A` | CTA buttons, score badge, active nav, key accents only |
| `primary-dark` | `#E04A0F` | `#E04A0F` | Hover state of primary |
| `dark` | `#0D0D0D` | `#0D0D0D` | Header, footer, hero, score card |
| `bg` | `#FAF9F7` | **`#F5F4F1`** | Page body background (slightly warmer) |
| `surface` | _(new)_ | **`#FFFFFF`** | Card backgrounds, elevated sections |
| `border` | `#E5E2DB` | **`#E2DFD8`** | Subtle dividers |
| `text-muted` | _(new)_ | **`#6B6560`** | Dates, meta, secondary copy |

### Complete Tailwind colors block (replace existing)
```js
colors: {
  primary: '#FF5C1A',
  'primary-dark': '#E04A0F',
  bg: '#F5F4F1',
  dark: '#0D0D0D',
  border: '#E2DFD8',
  surface: '#FFFFFF',
  'text-muted': '#6B6560',
},
```

---

## 3. Texture

- **Grain noise:** Inline SVG data URI grain texture applied via CSS on the `.hero-section` element using a `::before` pseudoelement.
- `opacity: 0.03` — subtle, adds depth without visual weight.
- No texture on light sections.

### CSS implementation
```css
.hero-section {
  position: relative;
}
.hero-section::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0.03;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
  background-repeat: repeat;
  z-index: 0;
}
.hero-section > * {
  position: relative;
  z-index: 1;
}
```

---

## 4. Components

### 4.1 Header

**File:** `src/components/Header.jsx`

- Height: `h-16` (up from `h-14`)
- Logo: `PHONE` in Bebas Neue orange + `PULSE` white, tighter tracking (`tracking-tight`)
- Nav links: Figtree medium (`font-medium`), uppercase (`uppercase`), `tracking-widest`, `text-xs`
- Bottom border: `border-white/5` (less heavy than current `border-white/10`)
- Social icons: unchanged position and SVGs
- Mobile menu: unchanged structure, font updated to Figtree

### 4.2 Footer

**File:** `src/components/Footer.jsx`

- Three-column layout on desktop (`sm:flex-row`), stacks to column on mobile
- Column 1: logo + tagline _"Recensioni smartphone per scegliere meglio."_ in Figtree `text-sm text-white/30`
- Column 2 (center): copyright text + social icons row (icons 20px, up from 16px)
- Column 3: Sitemap + Privacy links
- Text opacity: `text-white/25` (reduced from `text-white/30`)

### 4.3 ArticleCard (full rewrite)

**File:** `src/components/ArticleCard.jsx`

**New design:**
- Aspect ratio: `aspect-[3/4]` (portrait, more photographic)
- Image: full-cover via `object-cover`, fills entire card — `excerpt` is intentionally omitted from the card UI
- Overlay: `linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)`
- Text anchored to bottom of card (inside the overlay):
  - Category badge (category color) in Figtree
  - Title in Bebas Neue, white, `text-2xl`, `leading-tight`
  - Date in Figtree, `text-white/50`, `text-xs`
- Score badge: orange circle, top-right, unchanged
- Hover: `scale-[1.02]` on image + `brightness-110`, `transition-all duration-500` — no translate
- No visible border (`rounded-xl overflow-hidden`)

**Fallback when `cover_image_url` is null:** render a solid dark background (`bg-dark`) in place of the image. The gradient overlay and text remain fully legible against the dark surface. `ImagePlaceholder` component is removed.

**`CardSkeleton` in `Home.jsx`:** update from `aspect-[16/9]` to `aspect-[3/4]` to match new card proportions.

### 4.4 Home — Hero

**File:** `src/pages/Home.jsx`

- Add `hero-section` class to the `<section>` element (triggers grain texture CSS)
- Height: `min-h-[340px]` with `py-12 md:py-16`
- Background: `bg-dark`
- Title: Bebas Neue, `text-7xl md:text-[120px]`, white, `leading-none` — fills most container width
- Subtitle: Figtree, `text-base`, `text-white/50`, kept short (~60 chars)
- CTA buttons: primary orange solid + secondary `border border-white/20 text-white`
- Remove: inline `style` radial gradient, "Tech italiana" pill badge

### 4.5 Home — Article Grid

**File:** `src/pages/Home.jsx`

**Featured card selection:** `articles[0]` is always the featured card. The grid uses conditional rendering: `articles[0]` renders in a `col-span-2` slot, `articles.slice(1)` renders in normal slots.

**Desktop layout (lg):**
```
[ featured (col-span-2) ] [ normal ]
[ normal ] [ normal ] [ normal ]
[ normal ] [ normal ] [ normal ]
```

**Tablet (sm–md):** standard `grid-cols-2`, all cards equal — no featured asymmetry. `articles[0]` renders as a normal card.

**Mobile:** single column, all cards equal.

**Grid class:** `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6`

Featured card first child: `lg:col-span-2` — normal cards have no special class.

### 4.6 Home — Categories Section

**File:** `src/pages/Home.jsx`

- Background: `bg-dark` (dark section contrasting with light article grid above)
- Layout: `flex flex-wrap justify-center gap-3` — pills wrap on mobile, no overflow
- Each pill: `flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors`
- Icon + category name in Figtree `text-sm uppercase tracking-widest`
- Replace current bordered-card grid with this pill row

### 4.7 ArticlePage

**File:** `src/pages/ArticlePage.jsx`

- Breadcrumb: separator `/` → `›` (HTML entity `&rsaquo;`)
- Title: Bebas Neue, `text-5xl md:text-7xl`, `leading-none`
- Excerpt: Figtree italic, `text-lg`, `text-text-muted` (or inline `text-[#6B6560]`), `border-l-[5px] border-primary/40 pl-4`
- Score card: unchanged structure, Figtree font for body text within it
- Affiliate links: padding reduced to `py-2.5`, hover state `border-primary/60 shadow-md`

**`CategoryPage` side-effect:** `CategoryPage.jsx` renders `ArticleCard` components in a grid. After the rewrite to `aspect-[3/4]`, the cards will be taller. The existing `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6` grid on `CategoryPage` is compatible — no changes needed, visual result is acceptable.

---

## 5. CSS / index.css

- Add `.hero-section` grain texture pseudoelement (full snippet in Section 3)
- Update `body` default font from DM Sans to Figtree: `font-family: 'Figtree', sans-serif` (via Tailwind `font-body` class on `body`)
- Update `.article-content` `font-family` from `'DM Sans'` to `'Figtree'`
- Update `.article-content h1–h4` to use `font-family: 'Bebas Neue', sans-serif` for prose headings

---

## 6. Implementation Order

1. `index.html` — swap Google Fonts (Barlow Condensed + DM Sans → Bebas Neue + Figtree). Leave all other tags untouched.
2. `tailwind.config.js` — update fontFamily; replace full colors block (bg, border updated; surface, text-muted added)
3. `src/index.css` — grain texture pseudoelement, update article-content font families
4. `src/components/Header.jsx` — h-16, Bebas Neue logo, Figtree nav, border-white/5
5. `src/components/Footer.jsx` — tagline, three-column layout, 20px icons
6. `src/components/ArticleCard.jsx` — full rewrite: aspect-[3/4], overlay layout, dark fallback, remove excerpt
7. `src/pages/Home.jsx` — hero restyling + hero-section class, CardSkeleton aspect ratio, featured grid layout, categories pill row
8. `src/pages/ArticlePage.jsx` — Bebas Neue title, italic excerpt, › breadcrumb, affiliate link hover

---

## 7. Explicit Non-Goals

The following are **not changed** in this refactor:

- All Supabase data fetching, auth, and state logic
- `SEO.jsx`, `ProtectedRoute.jsx`, `Toast.jsx`, `SchemaMarkup`
- All admin pages (`AdminLogin`, `AdminLayout`, `AdminDashboard`, `AdminArticles`, `AdminArticleEditor`, `AdminReview`)
- `CategoryPage.jsx`, `AboutPage.jsx`, `ContactPage.jsx`, `NotFound.jsx` — font inheritance applies automatically; grid layout on CategoryPage is compatible as-is
- Routing, `vercel.json`, `.github/workflows/`, `scripts/`
- Ahrefs analytics/verification scripts in `index.html` — leave entirely unchanged

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Bebas Neue uppercase-only | Never use on body text, nav links, or mixed-case copy. Only titles and display elements. |
| Card `3/4` crop on landscape images | `object-cover` handles it; most Unsplash images are wide enough. Acceptable crop. |
| Featured `col-span-2` on tablet | Degrade gracefully to equal-width 2-column grid at `sm`/`md` breakpoints. |
| No image fallback | Dark surface (`bg-dark`) replaces ImagePlaceholder — text overlay remains legible. |
| CategoryPage card height change | Taller cards with existing gap-6 grid — visually acceptable, no code change needed. |
