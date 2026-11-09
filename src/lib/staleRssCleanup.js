// Conservative stale-RSS cleanup: preserves rows and events through the editor RPC.
export const STALE_RSS_DAYS = 14
export const STALE_RSS_MAX_BATCH = 30

export function cutoffIso(now = new Date(), days = STALE_RSS_DAYS) {
  return new Date(now.getTime() - days * 86400000).toISOString()
}

export function eligibleStaleRssDraft(row, cutoff) {
  return !!row &&
    row.origin === 'rss' &&
    row.status === 'draft' &&
    row.content_format === 'news' &&
    row.version === 1 &&
    Number.isFinite(Date.parse(row.created_at)) &&
    Date.parse(row.created_at) < Date.parse(cutoff)
}
