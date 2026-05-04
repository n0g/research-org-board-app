import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { GCAL_CLIENT_ID } from '../config.js'

const BAKED_CLIENT_ID = import.meta.env.VITE_GCAL_CLIENT_ID || GCAL_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly'

export const useCalendarStore = defineStore('calendar', () => {
  const clientId = ref(BAKED_CLIENT_ID || localStorage.getItem('rb_gcal_client_id') || '')
  const accessToken = ref(localStorage.getItem('rb_gcal_token') || '')
  const tokenExpiry = ref(parseInt(localStorage.getItem('rb_gcal_token_expiry') || '0'))
  const selectedCalendarId = ref(localStorage.getItem('rb_gcal_calendar_id') || 'primary')
  const calendarList = ref([])
  const events = ref([])
  const loading = ref(false)
  const connectError = ref('')
  let _refreshTimer = null

  const isConnected = computed(() => !!accessToken.value && Date.now() < tokenExpiry.value)

  const writableCalendars = computed(() =>
    calendarList.value.filter(c => c.accessRole === 'writer' || c.accessRole === 'owner')
  )

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
    _scheduleRefresh()
  }

  function _scheduleRefresh() {
    if (_refreshTimer) clearTimeout(_refreshTimer)
    const msUntilRefresh = tokenExpiry.value - Date.now() - 5 * 60 * 1000
    if (msUntilRefresh > 0) {
      _refreshTimer = setTimeout(() => _silentRefresh(), msUntilRefresh)
    }
  }

  function _initClient(callback) {
    return window.google.accounts.oauth2.initTokenClient({
      client_id: clientId.value,
      scope: SCOPES,
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
        'https://www.googleapis.com/calendar/v3/users/me/calendarList',
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
    // Fetch calendar list first if we don't have it yet (needed for colors)
    if (!calendarList.value.length) await fetchCalendarList()
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

      const cals = calendarList.value.length
        ? calendarList.value
        : [{ id: 'primary', backgroundColor: null }]

      const results = await Promise.allSettled(
        cals.map(async (cal) => {
          const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
            { headers: { Authorization: `Bearer ${accessToken.value}` } }
          )
          if (res.status === 401) { disconnect(); return [] }
          if (!res.ok) return []
          const data = await res.json()
          return (data.items || []).map(ev => ({ ...ev, _calColor: cal.backgroundColor, _calId: cal.id }))
        })
      )

      events.value = results
        .filter(r => r.status === 'fulfilled')
        .flatMap(r => r.value)
        .sort((a, b) => new Date(a.start?.dateTime || a.start?.date) - new Date(b.start?.dateTime || b.start?.date))
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
    // Tag with the selected calendar's color so it renders correctly immediately
    const calColor = calendarList.value.find(c => c.id === selectedCalendarId.value)?.backgroundColor ?? null
    events.value.push({ ...event, _calColor: calColor, _calId: selectedCalendarId.value })
    return event
  }

  async function deleteEvent(eventId, calId) {
    if (!await _ensureToken()) throw new Error('Not authenticated')
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken.value}` } }
    )
    if (!res.ok && res.status !== 404 && res.status !== 410) throw new Error(`Failed to delete event: ${res.status}`)
    events.value = events.value.filter(ev => ev.id !== eventId)
  }

  async function updateEvent(eventId, calId, newStart, newEnd) {
    if (!await _ensureToken()) throw new Error('Not authenticated')
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    const body = {
      start: { dateTime: newStart.toISOString(), timeZone: tz },
      end: { dateTime: newEnd.toISOString(), timeZone: tz },
    }
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    )
    if (!res.ok) throw new Error(`Failed to update event: ${res.status}`)
    const updated = await res.json()
    const idx = events.value.findIndex(ev => ev.id === eventId)
    if (idx !== -1) events.value[idx] = { ...events.value[idx], ...updated }
    return updated
  }

  async function deleteAllByTaskId(taskId) {
    if (!await _ensureToken()) return
    const cals = calendarList.value.length
      ? calendarList.value.filter(c => c.accessRole === 'writer' || c.accessRole === 'owner')
      : [{ id: selectedCalendarId.value }]
    await Promise.allSettled(cals.map(async cal => {
      const params = new URLSearchParams({
        privateExtendedProperty: `todoist_task_id=${taskId}`,
        singleEvents: 'true',
        maxResults: '50',
      })
      const res = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?${params}`,
        { headers: { Authorization: `Bearer ${accessToken.value}` } }
      )
      if (!res.ok) return
      const data = await res.json()
      await Promise.allSettled((data.items || []).map(ev => deleteEvent(ev.id, cal.id)))
    }))
  }

  async function updateEventTitle(taskId, title) {
    if (!await _ensureToken()) return
    const evs = scheduledByTaskId.value.get(String(taskId))
    if (!evs?.length) return
    const ev = evs[0]
    const res = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(ev._calId)}/events/${ev.id}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: title }),
      }
    )
    if (!res.ok) return
    const updated = await res.json()
    const idx = events.value.findIndex(e => e.id === ev.id)
    if (idx !== -1) events.value[idx] = { ...events.value[idx], ...updated }
  }

  // Proactive refresh: schedule on startup if we already have a stored token
  _scheduleRefresh()

  // Refresh on app focus in case the token expired while the app was in the background
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && accessToken.value && !isConnected.value) {
        _silentRefresh()
      }
    })
  }

  async function linkEventToTask(eventId, calId, taskId) {
    if (!await _ensureToken()) throw new Error('Not authenticated')
    await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events/${eventId}`,
      {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${accessToken.value}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ extendedProperties: { private: { todoist_task_id: String(taskId) } } }),
      }
    )
    const ev = events.value.find(e => e.id === eventId)
    if (ev) {
      if (!ev.extendedProperties) ev.extendedProperties = {}
      if (!ev.extendedProperties.private) ev.extendedProperties.private = {}
      ev.extendedProperties.private.todoist_task_id = String(taskId)
    }
  }

  return {
    clientId, events, loading, connectError, selectedCalendarId, calendarList, writableCalendars,
    isConnected, scheduledByTaskId,
    saveClientId, saveCalendarId, connect, disconnect,
    loadWeekEvents, createEvent, deleteEvent, deleteAllByTaskId, updateEvent, updateEventTitle, fetchCalendarList,
    linkEventToTask,
  }
})
