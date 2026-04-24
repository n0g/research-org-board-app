export async function fetchReviewPapers(siteUrl, token) {
  const base = siteUrl.replace(/\/+$/, '')
  const url = `${base}/api/papers?q=re:me&api_key=${encodeURIComponent(token)}`
  let r
  try {
    r = await fetch(url)
  } catch {
    throw new Error('Network error — check URL or CORS headers on the server')
  }
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    if (text.trim().startsWith('<')) throw new Error('Got HTML — wrong URL or authentication required')
    throw new Error(`HTTP ${r.status}`)
  }
  const data = await r.json()
  if (data.ok === false) throw new Error(data.error || 'HotCRP API error')
  return Array.isArray(data) ? data : (data.papers || [])
}
