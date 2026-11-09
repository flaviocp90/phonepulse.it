export const MAX_CLAIMS = 12

export function claimReviewErrors(claims, sources) {
  if (!Array.isArray(claims) || claims.length > MAX_CLAIMS) return ['Numero di verifiche non valido.']
  if (!claims.length) return []
  const validUrls = new Set((sources || []).filter(s => s && /^https:\/\//i.test(s.url || '') && s.retrieved_at).map(s => s.url))
  const errors = []
  claims.forEach((claim, index) => {
    const label = `Affermazione ${index + 1}`
    if (typeof claim.statement !== 'string' || claim.statement.trim().length < 15 || claim.statement.length > 700) errors.push(`${label}: descrizione da 15 a 700 caratteri.`)
    if (typeof claim.source_url !== 'string' || !validUrls.has(claim.source_url)) errors.push(`${label}: seleziona una fonte HTTPS con consultazione registrata.`)
    if (typeof claim.evidence !== 'string' || claim.evidence.trim().length < 15 || claim.evidence.length > 240) errors.push(`${label}: aggiungi un breve passaggio della fonte (15-240 caratteri).`)
    if (typeof claim.rationale !== 'string' || claim.rationale.trim().length < 20 || claim.rationale.length > 500) errors.push(`${label}: spiega il controllo effettuato (20-500 caratteri).`)
    if (!['supported', 'conflicted', 'unknown'].includes(claim.decision)) errors.push(`${label}: assegna un esito.`)
  })
  return errors
}

export function claimReviewSummary(claims, sources) {
  const errors = claimReviewErrors(claims, sources)
  return { errors, complete: claims.length > 0 && errors.length === 0 && claims.every(item => item.decision === 'supported') }
}

export function claimReviewAudit(claims, sources) {
  const { errors, complete } = claimReviewSummary(claims, sources)
  if (!complete) throw new Error(errors[0] || 'Le affermazioni controverse o non verificate impediscono questa attestazione.')
  return {
    schema_version: 1,
    mode: 'manual_editor_review',
    // This is not server-verified provenance; actor and article version are logged
    // by the pre-existing approve_article/corrected RPC.
    claims: claims.map(({ statement, source_url, evidence, rationale, decision }) => ({
      statement: statement.trim(), source_url, evidence: evidence.trim(),
      rationale: rationale.trim(), decision
    }))
  }
}
