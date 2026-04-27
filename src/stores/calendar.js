import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const BAKED_CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID || ''

export const useCalendarStore = defineStore('calendar', () => {
  const clientId = ref(BAKED_CLIENT_ID || localStorage.getItem('rb_gcal_client_id') || '')
  const accessToken = ref(localStorage.getItem('rb_gcal_token') || '')
  const tokenExpiry = ref(parseInt(localStorage.getItem('rb_gcal_token_expiry') || '0'))
  const selectedCalendarId = ref(localStorage.getItem('rb_gcal_calendar_id') || 'primary')
  const calendarList = ref([])
  const events = ref([])
  const loading = ref(false)
  const connectError = ref('')

  const isConnected = computed(() => !!accessToken.value && Date.now() < tokenExpiry.value)

  const scheduledByTaskId = computed(() => {
    const map = new Map()
    for (const ev of events.value) {
      const taskId = ev.extendedProperties?.private?.todoist_task_id
      if (taskId) {
        if (!map.has(taskId)) map.set(taskId, [])
        map.get(taskId).push(ev)
      }
    }
    return map
  })

  function saveClientId(id) {
    clientId.value = id.trim()
    localStorage.setItem('rb_gcal_client_id', clientId.value)
  }

  function _storeToken(token, expiresIn) {
    accessToken.value = token
    const expiry = Date.now() + (Number(expiresIn) - 60) * 1000
    tokenExpiry.value = expiry
    localStorage.setItem('rb_gcal_token', token)
    localStorage.setItem('rb_gcal_token_expiry', String(expiry))
  }

  function _initClient(callback) {
    return window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.value,
      scope: 'https://www.googleapis.com/auth/calendar.events',
      callback,
      error_callback: (err) => callback({ error: err.type }),
    })
  }

  function connect() {
    connectError.value = ''
    if (!clientId.value) { connectError.value = 'Enter a Client ID first.'; return }
    if (!window.google?.accounts?.oauth2) { connectError.value = 'Google Identity Services not loaded — refresh and try again.'; return }
    _initClient((resp) => {
      if (resp.error) { connectError.value = resp.error_description || resp.error; return }
      _storeToken(resp.access_token, resp.expires_in)
      connectError.value = ''
    }).requestAccessToken()
  }

  // Silently get a fresh token using the existing Google session (no popup).
  // Falls back to false if the session has expired — caller must then prompt the user.
  function _silentRefresh() {
    if (!clientId.value || !window.google?.accounts?.oauth2) return Promise.resolve(false)
    return new Promise((resolve) => {
      _initClient((resp) => {
        if (resp.error) { resolve(false); return }
        _storeToken(resp.access_token, resp.expires_in)
        resolve(true)
      }).requestAccessToken({ prompt: '' })
    })
  }

  async function _ensureToken() {
    if (isConnected.value) return true
    return _silentRefresh()
  }

  function saveCalendarId(id) {
    selectedCalendarId.value = id
    localStorage.setItem('rb_gcal_calendar_id', id)
  }

  async function fetchCalendarList() {
    if (!await _ensureToken()) return
    try {
      const res = await fetch(
        'https://www.googleapis.com/calendar/v3/users/me/calendarList?minAccessRole=writer',
        { headers: { Authorization: `Bearer ${accessToken.value}` } }
      )
      if (!res.ok) return
      const data = await res.json()
      calendarList.value = data.items || []
    } catch {}
  }

  function disconnect() {
    if (accessToken.value) {
      try { window.google?.accounts?.oauth2?.revoke(accessToken.value) } catch {}
    }
    accessToken.value = ''
    tokenExpiry.value = 0
    events.value = []
    calendarList.value = []
    localStorage.removeItem('rb_gcal_token')
    localStorage.removeItem('rb_gcal_token_expiry')
  }

  async function loadWeekEvents(weekStart) {
    if (!await _ensureToken()) return
    loading.value = true
    try {
      const timeMin = new Date(weekStart)
      timeMin.setHours(0, 0, 0, 0)
      const timeMax = new Date(weekStart)
      timeMax.setDate(timeMax.getDate() + 7)
      timeMax.setHours(23, 59, 59, 999)
      const params = new URLSearchParams({
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '250',
      })
      const calId = encodeURIComponent(selectedCalendarId.value)
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calId}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken.value}` } }
      )
      if (!res.ok) {
        if (res.status === 401) disconnect()
        throw new Error(`Calendar API ${res.status}`)
      }
      const data = await res.json()
      events.value = data.items || []
    } finally {
      loading.value = false
    }
  }

  async function createEvent(title, dateObj, startHour, startMinute, durationMinutes, taskId) {
    if (!await _ensureToken()) throw new Error('Not authenticated')
    const start = new Date(dateObj)
    start.setHours(startHour, startMinute, 0, 0)
    const end = new Date(start.getTime() + durationMinutes * 60_000)
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const body = {
      summary: title,
      start: { dateTime: start.toISOString(), timeZone: tz },
      end: { dateTime: end.toISOString(), timeZone: tz },
    }
    if (taskId) body.extendedProperties = { private: { todoist_task_id: String(taskId) } }
    const calId = encodeURIComponent(selectedCalendarId.value)
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calId}/events`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken.value}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(`Failed to create event: ${res.status}`)
    const event = await res.json()
    events.value.push(event)
    return event
  }

  return {
    clientId, events, loading, connectError, selectedCalendarId, calendarList,
    isConnected, scheduledByTaskId,
    saveClientId, saveCalendarId, connect, disconnect,
    loadWeekEvents, createEvent, fetchCalendarList,
  }
})
