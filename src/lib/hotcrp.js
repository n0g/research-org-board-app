export async function fetchReviewPapers(siteUrl, token, proxyUrl = '') {
  const base = siteUrl.replace(/\/+$/, '')
  const hotcrpPath = `${base}/api/papers?q=re:me`

  // Embed api_key in the target URL so generic proxies (corsproxy.io, etc.) forward auth
  // correctly without needing to understand the &token= parameter. Custom Cloudflare Workers
  // can still read &token= and send Authorization: Bearer instead.
  const url = proxyUrl
    ? `${proxyUrl.replace(/\/+$/, '')}?url=${encodeURIComponent(hotcrpPath + '&api_key=' + encodeURIComponent(token))}&token=${encodeURIComponent(token)}`
    : `${hotcrpPath}&api_key=${encodeURIComponent(token)}`

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
    if (text.trim().startsWith('<')) throw new Error('Got HTML — check the site URL and that your API key has reviewer permissions')
    throw new Error(`HTTP ${r.status}`)
  }
  const data = await r.json()
  if (data.ok === false) throw new Error(data.error || 'HotCRP API error')
  return Array.isArray(data) ? data : (data.papers || [])
}
