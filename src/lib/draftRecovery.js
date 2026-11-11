import { readClaimDraft } from './claimReview.js'

export const RECOVERY_LIMIT = 1000000
export const recoveryKey = (userId, articleId) => `phonepulse:editor-recovery:v1:${userId}:${articleId}`

export function readRecovery(raw, userId, articleId) {
  if (raw.length > RECOVERY_LIMIT) throw new Error('Copia locale troppo grande.')
  const value = JSON.parse(raw)
  if (value.schema !== 1 || value.userId !== userId || value.articleId !== articleId || !(value.version === null || Number.isSafeInteger(value.version)) || !value.value || !value.value.form) throw new Error('Copia locale non valida.')
  const fields = ['title', 'slug', 'category_id', 'excerpt', 'content', 'cover_image_url', 'score', 'seo_title', 'seo_description', 'affiliate_links', 'author', 'image_source', 'content_format']
  const form = value.value.form
  if (fields.some(key => typeof form[key] !== 'string') || !Array.isArray(form.sources) || form.sources.length > 50 || !Array.isArray(value.value.tags) || value.value.tags.some(tag => typeof tag !== 'string')) throw new Error('Campi della copia locale non validi.')
  const claims = readClaimDraft(value.value.claims)
  const provenance = value.value.provenance
  if (provenance && (typeof provenance !== 'object' || JSON.stringify(provenance).length > 2000)) throw new Error('Provenienza locale non valida.')
  return { ...value, value: { form: Object.fromEntries([...fields, 'sources'].map(key => [key, form[key]])), tags: value.value.tags, claims, provenance } }
}
