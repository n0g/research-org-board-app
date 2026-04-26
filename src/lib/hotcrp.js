export async function fetchWhoami(siteUrl, token, proxyUrl = '') {
  return _hotcrpGet(siteUrl, token, proxyUrl, '/api/whoami')
}

export async function fetchReviewPapers(siteUrl, token, proxyUrl = '') {
  const data = await _hotcrpGet(siteUrl, token, proxyUrl, '/api/papers?q=re:me')
  return Array.isArray(data) ? data : (data.papers || [])
}

export async function fetchPaperStatus(siteUrl, paperId, token, proxyUrl = '') {
  const data = await _hotcrpGet(siteUrl, token, proxyUrl, `/api/papers?q=${paperId}`)
  console.log('[hotcrp] fetchPaperStatus raw response:', JSON.stringify(data))
  // Response can be array, { papers: [...] }, or a single paper object
  if (Array.isArray(data)) return data[0] ?? null
  if (data.papers) return data.papers[0] ?? null
  return data.pid ? data : null
}

export function extractPaperId(submissionUrl) {
  const pathMatch = submissionUrl.match(/\/paper\/(\d+)/)
  if (pathMatch) return pathMatch[1]
  const queryMatch = submissionUrl.match(/[?&]p=(\d+)/)
  if (queryMatch) return queryMatch[1]
  return null
}

export function matchSiteForUrl(sites, submissionUrl) {
  if (!submissionUrl) return null
  return sites.find(s => submissionUrl.startsWith(s.url)) ?? null
}

async function _hotcrpGet(siteUrl, token, proxyUrl, path) {
  const base = siteUrl.replace(/\/+$/, '')
  const hotcrpUrl = `${base}${path}`

  // Pass token as query param to the Worker so it adds Authorization server-side,
  // avoiding CORS preflight caused by custom request headers from the browser.
  // For direct requests (no proxy), send the header directly.
  // Strip any trailing ?url= or &url= that users may have stored from the old corsproxy.io format
  const proxyBase = proxyUrl.replace(/[?&]url=.*$/, '').replace(/\/+$/, '')
  const url = proxyUrl
    ? `${proxyBase}?url=${encodeURIComponent(hotcrpUrl)}&token=${encodeURIComponent(token)}`
    : hotcrpUrl

  const init = proxyUrl ? {} : { headers: { 'Authorization': `Bearer ${token}` } }

  let r
  try {
    r = await fetch(url, init)
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
