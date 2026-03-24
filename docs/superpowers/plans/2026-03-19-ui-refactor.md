# UI Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the entire visual interface of PhonePulse.it from a functional-but-generic layout to a distinctive editorial design inspired by Wired Italia, without touching any data/logic code.

**Architecture:** Purely visual changes — Tailwind tokens, font swaps, and component rewrites. No data fetching, routing, auth, or admin code is touched. Changes flow top-down: tokens → global CSS → shared components → pages.

**Tech Stack:** React 18, Vite, Tailwind CSS v3, Google Fonts (Bebas Neue + Figtree)

**Spec:** `docs/superpowers/specs/2026-03-19-ui-refactor-design.md`

**No test runner is configured** — skip TDD steps, verify visually via `npm run dev`.

---

## File Map

| File | Action | What changes |
|------|--------|-------------|
| `index.html` | Modify | Swap Google Fonts link (Barlow+DM Sans → Bebas Neue+Figtree) |
| `tailwind.config.js` | Modify | New fontFamily, updated color tokens |
| `src/index.css` | Modify | Grain texture CSS, Figtree body, article-content font updates |
| `src/components/Header.jsx` | Modify | h-16, Bebas Neue logo, Figtree nav, border-white/5 |
| `src/components/Footer.jsx` | Modify | Tagline, 3-col layout, 20px icons |
| `src/components/ArticleCard.jsx` | Rewrite | aspect-[3/4], full overlay layout, dark fallback, no excerpt |
| `src/pages/Home.jsx` | Modify | Hero restyle, CardSkeleton ratio, featured grid, categories pills |
| `src/pages/ArticlePage.jsx` | Modify | Bebas title, italic excerpt, › breadcrumb, affiliate hover |

---

## Task 1: Swap Google Fonts

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Replace only the Google Fonts stylesheet link**

`index.html` contains a duplicate Ahrefs analytics `<script>` tag (lines 9 and 19) — **leave both untouched exactly as they are**. Do not remove, reorder, or alter any `<script>` or `<meta>` tags.

Find and replace **only** this block (lines 21–26):

```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@600;700&family=DM+Sans:wght@400;500;600&display=swap"
    rel="stylesheet"
  />
```

Replace with:

```html
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link
    href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Figtree:wght@400;500;600;700&display=swap"
    rel="stylesheet"
  />
```

- [ ] **Step 2: Commit**

```bash
git add index.html
git commit -m "feat(ui): swap Google Fonts to Bebas Neue + Figtree"
```

---

## Task 2: Update Tailwind Config

**Files:**
- Modify: `tailwind.config.js`

- [ ] **Step 1: Replace the inner `extend` object only**

The current `tailwind.config.js` contains this exact block inside `theme.extend`:

```js
      colors: {
        primary: '#FF5C1A',
        'primary-dark': '#E04A0F',
        bg: '#FAF9F7',
        dark: '#0D0D0D',
        border: '#E5E2DB',
      },
      fontFamily: {
        heading: ['"Barlow Condensed"', '"Barlow"', 'sans-serif'],
        body: ['"DM Sans"', 'sans-serif'],
      },
```

Replace the content of `theme.extend` with (keeping the outer `theme: { extend: { ... } }` wrapper intact):

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
      fontFamily: {
        heading: ['"Bebas Neue"', 'sans-serif'],
        body: ['"Figtree"', 'sans-serif'],
      },
```

Changes vs. current:
- `bg`: `#FAF9F7` → `#F5F4F1`
- `border`: `#E5E2DB` → `#E2DFD8`
- `surface`: new token `#FFFFFF`
- `text-muted`: new token `#6B6560`
- `fontFamily.heading`: Barlow Condensed → Bebas Neue
- `fontFamily.body`: DM Sans → Figtree

- [ ] **Step 2: Commit**

```bash
git add tailwind.config.js
git commit -m "feat(ui): update Tailwind tokens — new fonts, surface/text-muted, tuned bg/border"
```

---

## Task 3: Update Global CSS

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add grain texture CSS block**

Find this exact string at the top of the file:

```css
@tailwind base;
```

Replace with:

```css
/* Hero grain texture */
.hero-section {
  position: relative;
  overflow: hidden;
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

@tailwind base;
```

- [ ] **Step 2: Update article-content body font**

Find:

```css
  font-family: 'DM Sans', sans-serif;
```

Replace with:

```css
  font-family: 'Figtree', sans-serif;
```

- [ ] **Step 3: Update article-content heading font**

Find this exact block:

```css
.article-content h1,
.article-content h2,
.article-content h3,
.article-content h4 {
  @apply font-heading font-bold text-dark mt-10 mb-4;
}
```

Replace with:

```css
.article-content h1,
.article-content h2,
.article-content h3,
.article-content h4 {
  @apply font-heading font-bold text-dark mt-10 mb-4;
  font-family: 'Bebas Neue', sans-serif;
}
```

(The `@apply font-heading` already resolves to Bebas Neue after the config change. The explicit `font-family` line is redundant but ensures no inheritance edge cases.)

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "feat(ui): add hero grain texture and update article-content fonts"
```

---

## Task 4: Restyle Header

**Files:**
- Modify: `src/components/Header.jsx`

- [ ] **Step 1: Update header wrapper border**

Find:

```jsx
    <header className="bg-dark border-b border-white/10 sticky top-0 z-50">
```

Replace with:

```jsx
    <header className="bg-dark border-b border-white/5 sticky top-0 z-50">
```

- [ ] **Step 2: Update inner container height**

Find:

```jsx
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-14">
```

Replace with:

```jsx
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
```

- [ ] **Step 3: Keep the logo img tag, update span font classes**

The logo `<Link>` currently contains an `<img src="/logo.png" ...>` tag — **keep it exactly as-is**. Only update the two `<span>` elements. The font-heading class already resolves to Bebas Neue after the config update, so no class changes are needed on the spans. Confirm they both use `font-heading`:

```jsx
          <span className="text-primary text-2xl font-heading font-bold tracking-tight leading-none">PHONE</span>
          <span className="text-white text-2xl font-heading font-bold tracking-tight leading-none">PULSE</span>
```

No change required here — Bebas Neue will load automatically via the class. Just verify visually.

- [ ] **Step 4: Update desktop nav link classes**

Find the `className` prop on desktop `<NavLink>` elements:

```jsx
              className={({ isActive }) =>
                `text-sm font-body font-medium transition-colors ${
                  isActive ? 'text-primary' : 'text-white/60 hover:text-white'
                }`
              }
```

Replace with:

```jsx
              className={({ isActive }) =>
                `text-xs font-body font-medium uppercase tracking-widest transition-colors ${
                  isActive ? 'text-primary' : 'text-white/60 hover:text-white'
                }`
              }
```

- [ ] **Step 5: Update mobile nav link classes**

Find the `className` prop on mobile `<NavLink>` elements:

```jsx
              className={({ isActive }) =>
                `text-sm font-body font-medium py-2.5 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-primary bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
```

Replace with:

```jsx
              className={({ isActive }) =>
                `text-xs font-body font-medium uppercase tracking-widest py-2.5 px-3 rounded-lg transition-colors ${
                  isActive ? 'text-primary bg-white/5' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`
              }
```

- [ ] **Step 6: Commit**

```bash
git add src/components/Header.jsx
git commit -m "feat(ui): restyle header — h-16, uppercase nav, softer border"
```

---

## Task 5: Restyle Footer

**Files:**
- Modify: `src/components/Footer.jsx`

- [ ] **Step 1: Rewrite Footer JSX**

Replace the entire `return (...)` block with:

```jsx
  return (
    <footer className="bg-dark border-t border-white/5 mt-auto">
      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
        {/* Col 1: logo + tagline */}
        <div className="flex flex-col items-center sm:items-start gap-1">
          <Link to="/" className="flex items-center" aria-label="PhonePulse">
            <span className="text-primary font-heading font-bold text-xl leading-none">PHONE</span>
            <span className="text-white font-heading font-bold text-xl leading-none">PULSE</span>
          </Link>
          <p className="text-white/30 text-sm font-body">Recensioni smartphone per scegliere meglio.</p>
        </div>

        {/* Col 2: copyright + social */}
        <div className="flex flex-col items-center gap-2">
          <p className="text-white/25 text-xs font-body">© PhonePulse {new Date().getFullYear()} — Tutti i diritti riservati</p>
          <div className="flex items-center gap-4">
            <a
              href="https://www.instagram.com/phonepulse.it?igsh=MXc5cmhmeWIyY2xvdA%3D%3D&utm_source=qr"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
              className="text-white/30 hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                <circle cx="12" cy="12" r="4"/>
                <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" stroke="none"/>
              </svg>
            </a>
            <a
              href="https://t.me/PhonePulseIT"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram"
              className="text-white/30 hover:text-primary transition-colors"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L8.32 14.617l-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.828.942z"/>
              </svg>
            </a>
          </div>
        </div>

        {/* Col 3: legal links */}
        <div className="flex items-center gap-4">
          <Link to="/sitemap" className="text-white/25 text-xs font-body hover:text-white/50 transition-colors">
            Sitemap
          </Link>
          <Link to="/privacy" className="text-white/25 text-xs font-body hover:text-white/50 transition-colors">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  )
```

- [ ] **Step 2: Commit**

```bash
git add src/components/Footer.jsx
git commit -m "feat(ui): restyle footer — tagline, 3-col layout, 20px social icons"
```

---

## Task 6: Rewrite ArticleCard

**Files:**
- Rewrite: `src/components/ArticleCard.jsx`

- [ ] **Step 1: Replace the entire file content**

The `excerpt` field is intentionally omitted from the new card UI (only visible on the article page). `featured` prop controls title size on the homepage featured card.

```jsx
import { Link } from 'react-router-dom'

function formatDate(dateString) {
  if (!dateString) return ''
  return new Date(dateString).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export default function ArticleCard({ article, featured = false }) {
  const { slug, title, cover_image_url, published_at, score, categories } = article

  return (
    <Link
      to={`/articoli/${slug}`}
      className="group relative flex flex-col aspect-[3/4] rounded-xl overflow-hidden bg-dark"
    >
      {/* Image */}
      {cover_image_url ? (
        <img
          src={cover_image_url}
          alt={title}
          className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] group-hover:brightness-110 transition-all duration-500"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-dark" />
      )}

      {/* Gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.2) 50%, transparent 100%)',
        }}
      />

      {/* Score badge */}
      {score != null && (
        <div className="absolute top-3 right-3 bg-primary text-white text-xs font-body font-bold rounded-full w-10 h-10 flex flex-col items-center justify-center shadow-lg leading-none z-10">
          <span className="text-sm font-bold">{score}</span>
          <span className="text-[9px] opacity-80 font-medium">/100</span>
        </div>
      )}

      {/* Text anchored to bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-4 flex flex-col gap-1.5 z-10">
        {categories && (
          <span
            className="inline-block text-[10px] font-body font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full w-fit"
            style={{
              backgroundColor: categories.color ? `${categories.color}30` : '#FF5C1A30',
              color: categories.color || '#FF5C1A',
            }}
          >
            {categories.name}
          </span>
        )}
        <h3 className={`font-heading text-white leading-tight ${featured ? 'text-4xl' : 'text-2xl'}`}>
          {title}
        </h3>
        <time className="text-xs text-white/50 font-body">{formatDate(published_at)}</time>
      </div>
    </Link>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ArticleCard.jsx
git commit -m "feat(ui): rewrite ArticleCard — portrait overlay layout, dark fallback, featured prop"
```

---

## Task 7: Restyle Home Page

**Files:**
- Modify: `src/pages/Home.jsx`

**Important:** The `CATEGORY_ICONS` constant defined at the top of `Home.jsx` (lines 3–29) must be preserved exactly as-is throughout all edits in this task.

- [ ] **Step 1: Replace CardSkeleton entirely**

Find the entire `CardSkeleton` function (lines 38–51) and replace it with this simpler version that matches the new `aspect-[3/4]` card:

```jsx
function CardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden animate-pulse aspect-[3/4] bg-gray-200" />
  )
}
```

- [ ] **Step 2: Restyle the Hero section**

Find the entire hero `<section>` block:

```jsx
        {/* Hero */}
        <section className="bg-dark relative overflow-hidden">
          <div className="absolute inset-0 opacity-20 pointer-events-none"
            style={{
              backgroundImage: 'radial-gradient(circle at 70% 50%, #FF5C1A 0%, transparent 60%)',
            }}
          />
          <div className="max-w-6xl mx-auto px-4 py-14 md:py-20 relative">
            <div className="max-w-2xl">
              <span className="inline-block text-primary text-xs font-body font-semibold uppercase tracking-widest mb-4 border border-primary/30 px-3 py-1 rounded-full">
                Tech italiana
              </span>
              <h1 className="text-4xl md:text-6xl font-heading font-bold text-white leading-tight mb-5">
                Recensioni e guide smartphone<br />
                <span className="text-primary">per scegliere bene.</span>
              </h1>
              <p className="text-white/50 text-lg font-body leading-relaxed mb-8">
                Analisi approfondite, comparativi onesti e guide pratiche per trovare il telefono giusto senza perdere tempo.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/categoria/recensioni"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Esplora le recensioni
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <Link
                  to="/categoria/guide"
                  className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Guide all'acquisto
                </Link>
              </div>
            </div>
          </div>
        </section>
```

Replace with:

```jsx
        {/* Hero */}
        <section className="hero-section bg-dark">
          <div className="max-w-6xl mx-auto px-4 py-12 md:py-16">
            <div className="max-w-4xl">
              <h1 className="text-7xl md:text-[120px] font-heading text-white leading-none mb-4 uppercase">
                Recensioni e guide smartphone<br />
                <span className="text-primary">per scegliere bene.</span>
              </h1>
              <p className="text-white/50 text-base font-body leading-relaxed mb-8 max-w-md">
                Analisi approfondite, comparativi onesti e guide pratiche per trovare il telefono giusto.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  to="/categoria/recensioni"
                  className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Esplora le recensioni
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7"/>
                  </svg>
                </Link>
                <Link
                  to="/categoria/guide"
                  className="inline-flex items-center gap-2 border border-white/20 hover:border-white/40 text-white text-sm font-body font-semibold px-5 py-2.5 rounded-full transition-colors"
                >
                  Guide all'acquisto
                </Link>
              </div>
            </div>
          </div>
        </section>
```

- [ ] **Step 3: Update article grid with section heading and featured layout**

Find this block:

```jsx
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-2xl font-heading font-bold text-dark">Ultimi articoli</h2>
          </div>
```

Replace with:

```jsx
          <div className="flex items-baseline justify-between mb-8">
            <h2 className="text-3xl font-heading text-dark uppercase">Ultimi articoli</h2>
          </div>
```

Then find the article grid rendering — the entire block from `{loading ? (` through to the closing `)}` of the ternary — and replace it:

```jsx
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 9 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : articles.length === 0 && !error ? (
            <p className="text-gray-400 font-body text-center py-16">Nessun articolo pubblicato ancora.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article, index) => (
                <div key={article.id} className={index === 0 ? 'lg:col-span-2' : ''}>
                  <ArticleCard article={article} featured={index === 0} />
                </div>
              ))}
            </div>
          )}
```

- [ ] **Step 4: Restyle Categories section**

Find the entire categories `<section>` block:

```jsx
        {categories.length > 0 && (
          <section className="bg-white border-t border-border">
            <div className="max-w-6xl mx-auto px-4 py-14">
              <h2 className="text-2xl font-heading font-bold text-dark mb-8">Esplora per categoria</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="group flex flex-col items-center justify-center text-center px-4 py-6 rounded-xl border-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
                    style={{
                      borderColor: cat.color ? `${cat.color}40` : '#FF5C1A40',
                      backgroundColor: cat.color ? `${cat.color}08` : '#FF5C1A08',
                    }}
                  >
                    <div
                      className="mb-3 group-hover:scale-110 transition-transform"
                      style={{ color: cat.color || '#FF5C1A' }}
                    >
                      {CATEGORY_ICONS[cat.slug] || (
                        <div className="w-6 h-6 rounded-full" style={{ backgroundColor: cat.color || '#FF5C1A' }} />
                      )}
                    </div>
                    <span
                      className="text-sm font-heading font-bold uppercase tracking-wide"
                      style={{ color: cat.color || '#FF5C1A' }}
                    >
                      {cat.name}
                    </span>
                    {cat.description && (
                      <span className="text-xs text-gray-400 font-body mt-1.5 leading-tight line-clamp-2">
                        {cat.description}
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
```

Replace with:

```jsx
        {categories.length > 0 && (
          <section className="bg-dark">
            <div className="max-w-6xl mx-auto px-4 py-12">
              <h2 className="text-3xl font-heading text-white uppercase mb-6">Esplora per categoria</h2>
              <div className="flex flex-wrap justify-center gap-3">
                {categories.map(cat => (
                  <Link
                    key={cat.id}
                    to={`/categoria/${cat.slug}`}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/10 text-white/60 hover:text-white hover:border-white/30 transition-colors"
                  >
                    <span style={{ color: cat.color || '#FF5C1A' }}>
                      {CATEGORY_ICONS[cat.slug] || (
                        <div className="w-4 h-4 rounded-full" style={{ backgroundColor: cat.color || '#FF5C1A' }} />
                      )}
                    </span>
                    <span className="text-sm font-body uppercase tracking-widest">{cat.name}</span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/Home.jsx
git commit -m "feat(ui): restyle home — editorial hero, featured grid, dark categories pills"
```

---

## Task 8: Restyle Article Page

**Files:**
- Modify: `src/pages/ArticlePage.jsx`

- [ ] **Step 1: Update breadcrumb separators**

There are two identical `<span>/</span>` elements in the breadcrumb `<nav>`. Replace **all instances** of:

```jsx
              <span>/</span>
```

With:

```jsx
              <span className="text-gray-400">&rsaquo;</span>
```

- [ ] **Step 2: Update article title**

Find:

```jsx
            <h1 className="text-4xl md:text-5xl font-heading font-bold text-dark leading-tight mb-4">
              {article.title}
            </h1>
```

Replace with:

```jsx
            <h1 className="text-5xl md:text-7xl font-heading text-dark leading-none mb-4 uppercase">
              {article.title}
            </h1>
```

Note: `font-bold` is intentionally removed — Bebas Neue is a single-weight font and `font-bold` has no visual effect on it. `leading-tight` → `leading-none` for tighter editorial feel. `uppercase` added.

- [ ] **Step 3: Update excerpt styling**

Find:

```jsx
              <p className="text-lg text-gray-500 font-body leading-relaxed mb-6 border-l-4 border-primary/30 pl-4">
                {article.excerpt}
              </p>
```

Replace with:

```jsx
              <p className="text-lg text-[#6B6560] font-body italic leading-relaxed mb-6 border-l-[5px] border-primary/40 pl-4">
                {article.excerpt}
              </p>
```

- [ ] **Step 4: Update affiliate links hover**

Find:

```jsx
                      className="inline-flex items-center justify-between gap-3 bg-white border border-border px-4 py-3 rounded-xl hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
```

Replace with:

```jsx
                      className="inline-flex items-center justify-between gap-3 bg-white border border-border px-4 py-2.5 rounded-xl hover:border-primary/60 hover:shadow-md transition-all duration-200 group"
```

- [ ] **Step 5: Commit**

```bash
git add src/pages/ArticlePage.jsx
git commit -m "feat(ui): restyle article page — Bebas title, italic excerpt, rsaquo breadcrumb"
```

---

## Task 9: Visual QA Pass

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Check each page**

Visit and inspect:
- `/` — Hero title renders huge in Bebas Neue. First article card spans 2 columns on desktop. Categories section is dark with pill links.
- `/articoli/[any-slug]` — Title in Bebas Neue, italic excerpt with orange left border, `›` breadcrumb separator.
- `/categoria/recensioni` — All cards display in portrait 3/4 ratio with gradient overlay.
- Resize to mobile (< 640px) — single column everywhere, hero stacks correctly, footer stacks vertically.
- Resize to tablet (640px–1023px) — 2-column card grid, no featured asymmetry.

- [ ] **Step 3: Verify Bebas Neue constraint**

Confirm Bebas Neue is NOT used on: nav links, footer body text, meta text, body copy, admin pages.
Confirm it IS used on: logo spans, hero h1, article page h1, section h2 headings, card titles.

- [ ] **Step 4: Commit any QA fixes**

```bash
git add -p
git commit -m "fix(ui): QA pass adjustments"
```

---

## Task 10: Production Build Check

- [ ] **Step 1: Run build**

```bash
npm run build
```

Expected: exits with code 0. Warnings about unused CSS are acceptable; errors are not.

- [ ] **Step 2: Preview**

```bash
npm run preview
```

Confirm production build renders correctly in the browser before considering the refactor complete.

- [ ] **Step 3: Final commit if needed**

```bash
git add .
git commit -m "fix(ui): production build fixes"
```
