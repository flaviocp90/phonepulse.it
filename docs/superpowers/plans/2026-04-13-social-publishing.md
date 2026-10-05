# Social Publishing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-article Telegram + Instagram toggles in AdminReview so the admin can publish to both social channels when approving a draft.

**Architecture:** A Supabase Edge Function (`post-to-social`) handles all social API calls server-side, keeping credentials out of the frontend. The admin UI adds two checkboxes to each `DraftCard`; on publish, `handlePublish` calls the edge function after the Supabase DB update.

**Tech Stack:** React 18, Supabase JS client (`supabase.functions.invoke`), Deno (Edge Function), Telegram Bot API (`sendPhoto`), Instagram Graph API v19.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `supabase/functions/post-to-social/index.ts` | Create | Edge Function: Telegram + Instagram posting |
| `src/pages/admin/AdminReview.jsx` | Modify | Add `postTo` state + checkboxes to `DraftCard`; update `handlePublish` to call edge function |

---

## Task 1: Create the Edge Function skeleton

**Files:**
- Create: `supabase/functions/post-to-social/index.ts`

- [ ] **Step 1: Write the Edge Function file**

```typescript
// supabase/functions/post-to-social/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const HASHTAGS: Record<string, string> = {
  recensioni: '#recensione #smartphone #tech #tecnologia #phonepulse #android #iphone',
  news: '#news #tecnologia #smartphone #android #iphone #phonepulse',
  guide: '#guide #howto #tech #smartphone #tecnologia #phonepulse',
  comparativi: '#confronto #versus #smartphone #tech #tecnologia #phonepulse',
  offerte: '#offerta #deal #smartphone #tech #amazon #phonepulse',
}
const FALLBACK_HASHTAGS = '#smartphone #tech #tecnologia #phonepulse'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    })
  }

  const { title, excerpt, cover_image_url, slug, platforms, category_slug } = await req.json()

  const results: Record<string, string> = {}

  if (platforms.includes('telegram')) {
    results.telegram = await postToTelegram({ title, excerpt, cover_image_url, slug })
  }

  if (platforms.includes('instagram')) {
    results.instagram = await postToInstagram({ excerpt, cover_image_url, category_slug })
  }

  return new Response(JSON.stringify(results), {
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
})

async function postToTelegram({
  title,
  excerpt,
  cover_image_url,
  slug,
}: {
  title: string
  excerpt: string
  cover_image_url: string
  slug: string
}): Promise<string> {
  const token = Deno.env.get('TELEGRAM_BOT_TOKEN')!
  const chatId = Deno.env.get('TELEGRAM_CHAT_ID')!

  const caption = `📱 ${title}\n\n${excerpt}\n\n👉 https://phonepulse.it/articoli/${slug}`

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, photo: cover_image_url, caption }),
    })
    const data = await res.json()
    if (!data.ok) throw new Error(data.description)
    return 'ok'
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}

async function postToInstagram({
  excerpt,
  cover_image_url,
  category_slug,
}: {
  excerpt: string
  cover_image_url: string
  category_slug: string
}): Promise<string> {
  const accessToken = Deno.env.get('INSTAGRAM_ACCESS_TOKEN')!
  const accountId = Deno.env.get('INSTAGRAM_ACCOUNT_ID')!

  const hashtags = HASHTAGS[category_slug] ?? FALLBACK_HASHTAGS
  const truncated = excerpt.length > 400 ? excerpt.slice(0, 400) + '…' : excerpt
  const caption = `${truncated} 👇\n\n🔗 Link in bio\n\n${hashtags}`

  try {
    // Step 1: create media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_url: cover_image_url, caption, access_token: accessToken }),
      }
    )
    const containerData = await containerRes.json()
    if (containerData.error) throw new Error(containerData.error.message)

    // Step 2: publish container
    const publishRes = await fetch(
      `https://graph.facebook.com/v19.0/${accountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ creation_id: containerData.id, access_token: accessToken }),
      }
    )
    const publishData = await publishRes.json()
    if (publishData.error) throw new Error(publishData.error.message)

    return 'ok'
  } catch (e) {
    return `error: ${(e as Error).message}`
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add supabase/functions/post-to-social/index.ts
git commit -m "feat(social): add post-to-social edge function"
```

---

## Task 2: Deploy Edge Function and set secrets

**Files:** none (Supabase Dashboard + CLI)

- [ ] **Step 1: Install Supabase CLI if missing**

```bash
brew install supabase/tap/supabase
```

- [ ] **Step 2: Link project**

```bash
supabase link --project-ref <your-project-ref>
```

`<your-project-ref>` is the ID in your Supabase project URL (e.g. `xyzxyzxyz`), visible at Settings → General.

- [ ] **Step 3: Deploy the function**

```bash
supabase functions deploy post-to-social --no-verify-jwt
```

Note: `--no-verify-jwt` is used because the function does its own auth check via the Authorization header forwarded from the Supabase JS client.

- [ ] **Step 4: Set secrets in Supabase Dashboard**

Go to **Supabase Dashboard → Edge Functions → post-to-social → Secrets** and add:

```
TELEGRAM_BOT_TOKEN    = <your bot token>
TELEGRAM_CHAT_ID      = <your channel/group chat id>
INSTAGRAM_ACCESS_TOKEN = <long-lived page access token>   # set after Instagram setup
INSTAGRAM_ACCOUNT_ID   = <instagram business account id>  # set after Instagram setup
```

Telegram secrets are already in GitHub Actions secrets — use the same values.

---

## Task 3: Instagram Business Account setup

**Files:** none (one-time manual setup)

- [ ] **Step 1: Convert Instagram account to Business or Creator**

In the Instagram app: Settings → Account → Switch to Professional Account → Business → Done.

- [ ] **Step 2: Connect to a Facebook Page**

In Instagram: Settings → Account → Linked Accounts → Facebook → connect to an existing Page or create a new one named "PhonePulse".

- [ ] **Step 3: Get a short-lived User token**

Go to [Meta Graph API Explorer](https://developers.facebook.com/tools/explorer/):
- Select your app (create one at developers.facebook.com if needed → Business type)
- Click **Generate Access Token**
- Grant permissions: `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`, `pages_show_list`
- Copy the token

- [ ] **Step 4: Exchange for long-lived token (60-day)**

Run in terminal (replace `<APP_ID>`, `<APP_SECRET>`, `<SHORT_LIVED_TOKEN>`):

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<SHORT_LIVED_TOKEN>"
```

Copy the returned `access_token`.

- [ ] **Step 5: Get Instagram Business Account ID**

```bash
curl "https://graph.facebook.com/v19.0/me/accounts?access_token=<LONG_LIVED_TOKEN>"
```

This returns your Pages. Use the Page's `id` to fetch the linked Instagram account:

```bash
curl "https://graph.facebook.com/v19.0/<PAGE_ID>?fields=instagram_business_account&access_token=<LONG_LIVED_TOKEN>"
```

The `instagram_business_account.id` is your `INSTAGRAM_ACCOUNT_ID`.

- [ ] **Step 6: Store in Supabase secrets**

Set `INSTAGRAM_ACCESS_TOKEN` and `INSTAGRAM_ACCOUNT_ID` in Supabase Dashboard (see Task 2, Step 4).

---

## Task 4: Update AdminReview UI

**Files:**
- Modify: `src/pages/admin/AdminReview.jsx`

- [ ] **Step 1: Add `postTo` state to `DraftCard` and checkbox UI**

In `DraftCard`, add state and the checkbox section between the content preview and the action buttons. Replace the existing `DraftCard` function with the version below (only `DraftCard` changes — all other functions stay the same):

```jsx
function DraftCard({ article, onPublish, onDiscard }) {
  const navigate = useNavigate()
  const [seoOpen, setSeoOpen] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const [postTo, setPostTo] = useState({ telegram: true, instagram: true })

  const plainPreview = markdownToPlainText(article.content)
  const hasImage = Boolean(article.cover_image_url)

  function togglePlatform(platform) {
    setPostTo(prev => ({ ...prev, [platform]: !prev[platform] }))
  }

  return (
    <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
      {/* Cover image */}
      {article.cover_image_url && (
        <img
          src={article.cover_image_url}
          alt=""
          className="w-full h-48 object-cover"
        />
      )}

      <div className="p-6">
        {/* Category badge */}
        <div className="flex items-center gap-3 mb-3">
          {article.categories && (
            <span
              className="text-xs font-body font-semibold px-2.5 py-1 rounded-full"
              style={{
                backgroundColor: article.categories.color + '20',
                color: article.categories.color,
              }}
            >
              {article.categories.name}
            </span>
          )}
          <span className="text-xs font-body text-gray-400">{formatDate(article.created_at)}</span>
        </div>

        {/* Title */}
        <h2 className="font-heading font-bold text-dark text-xl leading-tight mb-2">
          {article.title}
        </h2>

        {/* Excerpt */}
        {article.excerpt && (
          <p className="font-body text-sm text-gray-600 line-clamp-2 mb-3">{article.excerpt}</p>
        )}

        {/* Content preview */}
        {plainPreview && (
          <p className="font-body text-xs text-gray-400 line-clamp-3 mb-4 border-l-2 border-border pl-3">
            {plainPreview}
          </p>
        )}

        {/* SEO accordion */}
        <div className="mb-5">
          <button
            onClick={() => setSeoOpen(o => !o)}
            className="flex items-center gap-1.5 text-xs font-body font-medium text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              className={`transition-transform ${seoOpen ? 'rotate-90' : ''}`}
            >
              <path d="M4 2l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Dettagli SEO
          </button>
          {seoOpen && (
            <div className="mt-3 space-y-2 bg-gray-50 rounded-lg p-3">
              <div>
                <span className="text-xs font-body text-gray-400 uppercase tracking-wide">SEO Title</span>
                <p className="text-sm font-body text-dark mt-0.5">{article.seo_title || '—'}</p>
              </div>
              <div>
                <span className="text-xs font-body text-gray-400 uppercase tracking-wide">SEO Description</span>
                <p className="text-sm font-body text-dark mt-0.5">{article.seo_description || '—'}</p>
              </div>
            </div>
          )}
        </div>

        {/* Social toggles */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b border-border">
          <span className="text-xs font-body text-gray-400 font-medium">Pubblica anche su:</span>
          {[
            { key: 'telegram', label: 'Telegram' },
            { key: 'instagram', label: 'Instagram' },
          ].map(({ key, label }) => (
            <label
              key={key}
              className={`flex items-center gap-1.5 cursor-pointer select-none ${!hasImage ? 'opacity-40 cursor-not-allowed' : ''}`}
              title={!hasImage ? 'Nessuna immagine di copertina' : undefined}
            >
              <input
                type="checkbox"
                checked={postTo[key]}
                onChange={() => hasImage && togglePlatform(key)}
                disabled={!hasImage}
                className="accent-primary w-3.5 h-3.5"
              />
              <span className="text-xs font-body text-gray-600">{label}</span>
            </label>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => onPublish(article, postTo)}
            className="bg-primary hover:bg-primary-dark text-white font-body font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Pubblica
          </button>
          <button
            onClick={() => navigate(`/admin/articoli/${article.id}`)}
            className="border border-border text-dark hover:bg-gray-50 font-body font-medium px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Modifica
          </button>
          {confirmDiscard ? (
            <DiscardConfirm
              onConfirm={() => onDiscard(article.id)}
              onCancel={() => setConfirmDiscard(false)}
            />
          ) : (
            <button
              onClick={() => setConfirmDiscard(true)}
              className="text-red-500 hover:text-red-700 font-body text-sm px-2 py-1 transition-colors"
            >
              Scarta
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Update `handlePublish` in `AdminReview` to accept article + postTo, then call Edge Function**

Replace the existing `handlePublish` function:

```javascript
async function handlePublish(article, postTo) {
  const id = article.id
  setDrafts(prev => prev.filter(d => d.id !== id))

  const { error: err } = await supabase
    .from('articles')
    .update({ is_published: true, needs_review: false, published_at: new Date().toISOString() })
    .eq('id', id)

  if (err) {
    addToast('Errore durante la pubblicazione', 'error')
    fetchAll()
    return
  }

  addToast('✓ Articolo pubblicato')

  const platforms = Object.entries(postTo)
    .filter(([, enabled]) => enabled)
    .map(([key]) => key)

  if (platforms.length === 0) return

  const { data: socialResult, error: fnErr } = await supabase.functions.invoke('post-to-social', {
    body: {
      title: article.title,
      excerpt: article.excerpt,
      cover_image_url: article.cover_image_url,
      slug: article.slug,
      platforms,
      category_slug: article.categories?.slug || '',
    },
  })

  if (fnErr) {
    addToast('Articolo pubblicato, ma errore social', 'error')
    return
  }

  if (socialResult?.telegram === 'ok') addToast('✓ Postato su Telegram')
  if (socialResult?.telegram?.startsWith('error')) addToast('Errore Telegram: ' + socialResult.telegram.replace('error: ', ''), 'error')

  if (socialResult?.instagram === 'ok') addToast('✓ Postato su Instagram')
  if (socialResult?.instagram?.startsWith('error')) addToast('Errore Instagram: ' + socialResult.instagram.replace('error: ', ''), 'error')
}
```

- [ ] **Step 3: Verify the `onPublish` call in the render passes the full article object**

In the JSX where `DraftCard` is rendered (around line 419), confirm the prop matches:

```jsx
<DraftCard
  key={article.id}
  article={article}
  onPublish={handlePublish}
  onDiscard={handleDiscard}
/>
```

No change needed here — `handlePublish` now receives `(article, postTo)` from inside `DraftCard`.

- [ ] **Step 4: Commit**

```bash
git add src/pages/admin/AdminReview.jsx
git commit -m "feat(review): add Telegram + Instagram social toggles to DraftCard"
```

---

## Task 5: Manual testing

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Test publish with no social toggles**

Open a draft card. Uncheck both Telegram and Instagram. Click Pubblica. Confirm:
- Article disappears from list
- Toast shows "✓ Articolo pubblicato"
- No Telegram/Instagram toasts appear
- Article is published in Supabase (`is_published: true`)

- [ ] **Step 3: Test publish with Telegram only**

Revert the article to draft in Supabase (`is_published: false, needs_review: true`). In the card, check only Telegram. Click Pubblica. Confirm:
- Toast "✓ Articolo pubblicato"
- Toast "✓ Postato su Telegram"
- Photo appears in your Telegram channel with title, excerpt, and link

- [ ] **Step 4: Test article with no cover image**

In Supabase set `cover_image_url = null` for a draft. Reload AdminReview. Confirm:
- Both checkboxes are disabled (grayed out)
- Hovering shows tooltip "Nessuna immagine di copertina"

- [ ] **Step 5: Test Instagram (after completing Task 3)**

With Instagram credentials set in Supabase secrets: publish a draft with Instagram checked. Confirm photo appears on the Instagram Business account feed.

---

## Token Renewal Reminder

**Instagram access token expires every 60 days.** To renew:

```bash
curl "https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=<APP_ID>&client_secret=<APP_SECRET>&fb_exchange_token=<CURRENT_TOKEN>"
```

Update `INSTAGRAM_ACCESS_TOKEN` in Supabase Edge Function secrets. Set a calendar reminder for day 55.
