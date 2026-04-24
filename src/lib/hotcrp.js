export async function fetchReviewPapers(siteUrl, token, proxyUrl = '') {
  const base = siteUrl.replace(/\/+$/, '')
  const direct = `${base}/api/papers?q=re:me&api_key=${encodeURIComponent(token)}`
  const url = proxyUrl ? `${proxyUrl.replace(/\/+$/, '')}?url=${encodeURIComponent(direct)}` : direct

  let r
  try {
    r = await fetch(url)
  } catch {
    throw new Error(
      proxyUrl
        ? 'Network error — check your proxy URL is correct and the service is running'
        : 'Network error — configure a proxy URL in Review Sites settings to bypass CORS'
    )
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
