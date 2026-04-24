export async function fetchReviewPapers(siteUrl, token) {
  const base = siteUrl.replace(/\/+$/, '')
  const url = `${base}/api/papers?q=re:me&api_key=${encodeURIComponent(token)}`
  let r
  try {
    r = await fetch(url)
  } catch {
    throw new Error(
      'Network error — the HotCRP server must send Access-Control-Allow-Origin headers ' +
      'to allow browser requests. Add this to Apache: ' +
      '"Header always set Access-Control-Allow-Origin *" or ask the conference organizers.'
    )
  }
  if (!r.ok) {
    const text = await r.text().catch(() => '')
    if (text.trim().startsWith('<')) throw new Error('Got HTML — wrong URL or session required (check the URL ends before /api/...)')
    throw new Error(`HTTP ${r.status}`)
  }
  const data = await r.json()
  if (data.ok === false) throw new Error(data.error || 'HotCRP API error')
  return Array.isArray(data) ? data : (data.papers || [])
}
