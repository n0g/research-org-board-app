export async function fetchWhoami(siteUrl, token, proxyUrl = '') {
  return _hotcrpGet(siteUrl, token, proxyUrl, '/api/whoami')
}

export async function fetchReviewPapers(siteUrl, token, proxyUrl = '') {
  const data = await _hotcrpGet(siteUrl, token, proxyUrl, '/api/papers?q=re:me')
  return Array.isArray(data) ? data : (data.papers || [])
}

export async function fetchPaperStatus(siteUrl, paperId, token, proxyUrl = '') {
  const data = await _hotcrpGet(siteUrl, token, proxyUrl, `/api/papers?q=${paperId}`)
  if (Array.isArray(data)) return data[0] ?? null
  if (data.papers) return data.papers[0] ?? null
  return data.pid ? data : null
}

export function extractPaperId(submissionUrl) {
  const pathMatch = submissionUrl.match(/\/paper(?:\.php)?\/(\d+)/)
  if (pathMatch) return pathMatch[1]
  const queryMatch = submissionUrl.match(/[?&]p=(\d+)/)
  if (queryMatch) return queryMatch[1]
  return null
}

export function matchSiteForUrl(sites, submissionUrl) {
  if (!submissionUrl) return null
  return sites.find(s => submissionUrl.startsWith(s.url)) ?? null
}

function _normalizeError(err) {
  const msg = err.message || ''
  if (/function not found|api function missing/i.test(msg)) return new Error('Paper status not available on this HotCRP version')
  if (/bad request/i.test(msg) || msg === 'HTTP 400') return new Error('Request not supported — this HotCRP version may not support this feature')
  if (msg === 'HTTP 401') return new Error('Unauthorized — check your API token')
  if (msg === 'HTTP 403') return new Error('Access denied — check your API token')
  return err
}

async function _hotcrpGet(siteUrl, token, proxyUrl, path) {
  const base = siteUrl.replace(/\/+$/, '')
  try {
    return await _hotcrpFetch(`${base}${path}`, token, proxyUrl)
  } catch (err) {
    if (!/function not found/i.test(err.message)) throw _normalizeError(err)
    // Retry 1: some instances use api.php/ prefix instead of api/
    const phpPath = path.replace(/^\/api\//, '/api.php/')
    try {
      return await _hotcrpFetch(`${base}${phpPath}`, token, proxyUrl)
    } catch (retryErr) {
      if (!/function not found/i.test(retryErr.message)) throw _normalizeError(retryErr)
      // Retry 2: HotCRP v3 uses singular 'paper' instead of 'papers'
      const singularPath = phpPath.replace('/papers', '/paper')
      if (singularPath === phpPath) throw _normalizeError(retryErr)
      try {
        return await _hotcrpFetch(`${base}${singularPath}`, token, proxyUrl)
      } catch (finalErr) {
        throw _normalizeError(finalErr)
      }
    }
  }
}

async function _hotcrpFetch(hotcrpUrl, token, proxyUrl) {

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
