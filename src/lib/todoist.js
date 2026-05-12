const BASE = 'https://api.todoist.com/api/v1'
const SYNC_BASE = 'https://api.todoist.com/api/v1/sync'

export async function syncCommands(token, commands) {
  const body = new URLSearchParams({ commands: JSON.stringify(commands) })
  const r = await fetch(SYNC_BASE, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  if (!r.ok) throw new Error(`Todoist Sync API ${r.status}: ${await r.text()}`)
  const data = await r.json()
  for (const cmd of commands) {
    const status = data.sync_status?.[cmd.uuid]
    if (status && typeof status === 'object' && status.error) {
      throw new Error(`Sync command ${cmd.type} failed: ${status.error}`)
    }
  }
  return data
}

export async function api(token, path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  }
  if (body) opts.body = JSON.stringify(body)
  const r = await fetch(`${BASE}${path}`, opts)
  if (!r.ok) throw new Error(`Todoist API ${r.status}: ${await r.text()}`)
  if (r.status === 204) return null
  return r.json()
}

export async function apiAll(token, path) {
  let results = [], cursor = null
  do {
    const url = cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path
    const res = await api(token, url)
    if (Array.isArray(res)) return res
    results = results.concat(res.results || [])
    cursor = res.next_cursor || null
  } while (cursor)
  return results
}
