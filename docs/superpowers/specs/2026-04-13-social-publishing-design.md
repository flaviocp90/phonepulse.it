# Social Publishing — Design Spec
**Date:** 2026-04-13  
**Status:** Approved

## Overview

When reviewing a draft article in AdminReview, the admin can toggle publishing to Instagram and/or Telegram. The post includes the cover image, title, excerpt, and article link. Intended to grow both channels from zero.

---

## 1. UI — `DraftCard` in `AdminReview.jsx`

Two checkboxes added between the content preview and the action buttons:

```
[ ✓ ] Telegram   [ ✓ ] Instagram
[Pubblica]  [Modifica]  [Scarta]
```

- Default: both checked
- If neither checked: article publishes to blog only (existing behavior)
- If `cover_image_url` is missing: both checkboxes disabled with tooltip "Nessuna immagine di copertina"
- State is local to each `DraftCard`: `postTo: { telegram: boolean, instagram: boolean }`

**Publish flow:**
1. Supabase update (`is_published: true`, etc.) — same as now
2. If any platform selected: call Edge Function `post-to-social` with article data + platform list
3. Edge Function failure shows a warning toast; article remains published

---

## 2. Supabase Edge Function — `post-to-social`

**Path:** `supabase/functions/post-to-social/index.ts`

**Input (JSON body):**
```json
{
  "title": "string",
  "excerpt": "string",
  "cover_image_url": "string (public URL)",
  "slug": "string",
  "platforms": ["telegram", "instagram"],
  "category_slug": "string"
}
```

**Secrets (set in Supabase Dashboard → Edge Functions → Secrets):**
```
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
INSTAGRAM_ACCESS_TOKEN    # long-lived token, expires every 60 days
INSTAGRAM_ACCOUNT_ID      # Instagram Business Account ID
```

**Output:**
```json
{ "telegram": "ok", "instagram": "ok" }
// or
{ "telegram": "ok", "instagram": "error: <message>" }
```

**Auth:** Called with the Supabase anon key from the authenticated admin session. The function verifies the caller is authenticated via the Authorization header before posting.

**Error handling:** Each platform is attempted independently. Partial failure (e.g., Instagram fails, Telegram succeeds) returns mixed results. The frontend shows a warning toast for any failed platform.

---

## 3. Caption Templates

### Telegram
```
📱 {title}

{excerpt}

👉 https://phonepulse.it/articoli/{slug}
```
- Uses `sendPhoto` with `photo: cover_image_url` and `caption` field
- `parse_mode: "HTML"` not needed for this template

### Instagram
```
{excerpt} 👇

🔗 Link in bio

{hashtags}
```
- Uses Graph API: create container → publish
- `image_url` must be a publicly accessible URL (existing cover images qualify)
- Max caption: 2200 chars (excerpt truncated at 400 chars if needed)

### Hashtag sets by category

| Category slug | Hashtags |
|---------------|----------|
| `recensioni` | `#recensione #smartphone #tech #tecnologia #phonepulse #android #iphone` |
| `news` | `#news #tecnologia #smartphone #android #iphone #phonepulse` |
| `guide` | `#guide #howto #tech #smartphone #tecnologia #phonepulse` |
| `comparativi` | `#confronto #versus #smartphone #tech #tecnologia #phonepulse` |
| `offerte` | `#offerta #deal #smartphone #tech #amazon #phonepulse` |
| fallback | `#smartphone #tech #tecnologia #phonepulse` |

---

## 4. Instagram Graph API Flow

**Prerequisite (one-time setup):**
1. Convert Instagram account to Business or Creator (free, in Instagram settings)
2. Connect to a Facebook Page
3. Get a Page access token via Meta Graph API Explorer
4. Exchange for a long-lived token (valid 60 days)
5. Get Instagram Business Account ID from the Page
6. Store both in Supabase Edge Function secrets

**Publishing flow (inside Edge Function):**
```
POST https://graph.facebook.com/v19.0/{INSTAGRAM_ACCOUNT_ID}/media
  body: { image_url, caption, access_token }
  → returns { id: creation_id }

POST https://graph.facebook.com/v19.0/{INSTAGRAM_ACCOUNT_ID}/media_publish
  body: { creation_id, access_token }
  → returns { id: post_id }
```

**Token renewal:** Manual every ~55 days (before 60-day expiry). Out of scope for this implementation. A reminder should be added to the admin docs.

---

## 5. Files Changed

| File | Change |
|------|--------|
| `src/pages/admin/AdminReview.jsx` | Add `postTo` state + two checkboxes to `DraftCard`; update `handlePublish` to call Edge Function |
| `supabase/functions/post-to-social/index.ts` | New Edge Function: Telegram + Instagram posting logic |

No database schema changes required.

---

## Out of Scope

- Automatic Instagram token refresh
- LLM-generated captions
- Twitter/X or other platforms
- Stories (Instagram feed posts only)
