export async function fetchWhoami(siteUrl, token, proxyUrl = '') {
  return _hotcrpGet(siteUrl, token, proxyUrl, '/api/whoami')
}

export async function fetchReviewPapers(siteUrl, token, proxyUrl = '') {
  const data = await _hotcrpGet(siteUrl, token, proxyUrl, '/api/papers?q=re:me')
  return Array.isArray(data) ? data : (data.papers || [])
}

async function _hotcrpGet(siteUrl, token, proxyUrl, path) {
  const base = siteUrl.replace(/\/+$/, '')
  const hotcrpUrl = `${base}${path}`

  const url = proxyUrl
    ? `${proxyUrl.replace(/\/+$/, '')}?url=${encodeURIComponent(hotcrpUrl)}`
    : hotcrpUrl

  let r
  try {
    r = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
    })
  } catch {
    throw new Error(
      proxyUrl
        ? 'Network error — check your proxy URL and that the service is running'
        : 'Network error — configure a proxy URL in Settings to bypass CORS'
    )
  }

  if (!r.ok) {
    const text = await r.text().catch(() => '')
    if (text.trim().startsWith('<')) throw new Error('Got HTML — check the site URL is correct')
    throw new Error(`HTTP ${r.status}`)
  }

  const data = await r.json()
  if (data.ok === false) {
    const msg = data.message_list?.[0]?.message?.replace(/^<\d+>/, '').trim() || 'HotCRP API error'
    throw new Error(msg)
  }
  return data
}
