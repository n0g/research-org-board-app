<template>
  <f7-page name="schedule-place" class="schedule-place-page">
    <div class="place-screen">

      <div class="place-topbar">
        <button class="back-btn" @click="cancel">
          <span class="material-symbols-outlined">arrow_back</span>
          Schedule
        </button>
        <span class="place-task-label">{{ store.pendingScheduleTask?.content }}</span>
      </div>

      <template v-if="calStore.isConnected">
        <div class="cal-nav">
          <button class="cal-nav-btn" title="Previous week" @click="prevWeek">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="cal-nav-label">{{ weekLabel }}</span>
          <button class="cal-nav-btn" title="Next week" @click="nextWeek">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
          <button class="cal-today-btn" @click="goToday">Today</button>
        </div>

        <div class="cal-week place-cal-week">
          <div class="cal-header">
            <div class="cal-gutter"></div>
            <div
              v-for="day in weekDays"
              :key="isoDate(day)"
              class="cal-day-head"
              :class="{ 'cal-today': isToday(day) }"
            >
              <span class="cal-day-name">{{ dayName(day) }}</span>
              <span class="cal-day-num">{{ day.getDate() }}</span>
              <div
                v-for="ev in allDayEvents(day)"
                :key="ev.id"
                class="cal-allday-bar"
                :style="{ background: ev._calColor || 'var(--accent)' }"
                :title="ev.summary"
              >{{ ev.summary }}</div>
            </div>
          </div>

          <div ref="calBodyEl" class="cal-scroll">
            <div class="cal-inner">
              <div class="cal-time-col">
                <div v-for="slot in timeSlots" :key="slot.key" class="cal-time-cell">
                  <span v-if="slot.minute === 0" class="cal-time-label">{{ formatHour(slot.hour) }}</span>
                </div>
              </div>
              <div class="cal-days">
                <div
                  v-for="day in weekDays"
                  :key="isoDate(day)"
                  class="cal-day-col"
                  :class="{ 'cal-today': isToday(day) }"
                >
                  <div
                    v-for="slot in timeSlots"
                    :key="slot.key"
                    class="cal-slot place-slot"
                    :class="{ 'cal-slot-hour': slot.minute === 0 }"
                    @click="scheduleAt(day, slot)"
                    @mouseover="hoveredDay = isoDate(day); hoveredSlot = slot"
                    @mouseleave="hoveredDay = null; hoveredSlot = null"
                  ></div>

                  <div
                    v-for="ev in timedDayEvents(day)"
                    :key="ev.id"
                    class="cal-event"
                    :style="eventStyle(ev)"
                  >
                    <div class="cal-event-title">{{ ev.summary }}</div>
                    <div v-if="eventTimeStr(ev)" class="cal-event-time">{{ eventTimeStr(ev) }}</div>
                  </div>

                  <div
                    v-if="hoveredDay === isoDate(day) && hoveredSlot"
                    class="cal-drop-preview"
                    :style="previewStyle()"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-else class="cal-not-connected">
        <span class="material-symbols-outlined">calendar_today</span>
        <p>{{ calStore.clientId ? 'Session expired — reconnect to continue' : 'Connect Google Calendar in Settings' }}</p>
        <button class="btn primary" @click="calStore.clientId ? calStore.connect() : goSettings()">
          {{ calStore.clientId ? 'Reconnect' : 'Settings' }}
        </button>
      </div>

    </div>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useCalendarStore } from '../stores/calendar.js'
import { getTime } from '../composables/useTaskTriage.js'

const store = useBoardStore()
const calStore = useCalendarStore()

const SLOT_HEIGHT = 40
const START_HOUR = 7
const END_HOUR = 21

function getMonday(d) {
  const day = new Date(d)
  const dow = day.getDay()
  const diff = dow === 0 ? -6 : 1 - dow
  day.setDate(day.getDate() + diff)
  day.setHours(0, 0, 0, 0)
  return day
}

const weekStart = ref(getMonday(new Date()))
const calBodyEl = ref(null)
const hoveredDay = ref(null)
const hoveredSlot = ref(null)

const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.value)
    d.setDate(d.getDate() + i)
    return d
  })
)

const timeSlots = computed(() => {
  const slots = []
  for (let h = START_HOUR; h < END_HOUR; h++) {
    slots.push({ hour: h, minute: 0, key: `${h}:00` })
    slots.push({ hour: h, minute: 30, key: `${h}:30` })
  }
  return slots
})

const weekLabel = computed(() => {
  const start = weekDays.value[0]
  const end = weekDays.value[6]
  const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  return `${startStr} – ${endStr}, ${end.getFullYear()}`
})

function isoDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
}
function isToday(d) { return isoDate(d) === isoDate(new Date()) }
function dayName(d) { return d.toLocaleDateString(undefined, { weekday: 'short' }) }
function formatHour(h) {
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

function timedDayEvents(day) {
  const dateStr = isoDate(day)
  return calStore.events.filter(ev => ev.start?.dateTime && ev.start.dateTime.slice(0, 10) === dateStr)
}
function allDayEvents(day) {
  const dateStr = isoDate(day)
  return calStore.events.filter(ev => !ev.start?.dateTime && ev.start?.date === dateStr)
}
function eventStyle(ev) {
  const start = new Date(ev.start.dateTime)
  const end = new Date(ev.end.dateTime)
  const startMins = (start.getHours() - START_HOUR) * 60 + start.getMinutes()
  const duration = Math.max((end - start) / 60000, 30)
  return {
    top: `${(startMins / 30) * SLOT_HEIGHT}px`,
    height: `${(duration / 30) * SLOT_HEIGHT - 2}px`,
    background: ev._calColor || 'var(--accent)',
  }
}
function eventTimeStr(ev) {
  if (!ev.start?.dateTime) return ''
  return new Date(ev.start.dateTime).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

function taskDuration() {
  const t = getTime(store.pendingScheduleTask)
  if (t === '15m') return 15
  if (t === '30m') return 30
  if (t === '2h') return 120
  return 60
}

function previewStyle() {
  if (!hoveredSlot.value) return null
  const startMins = (hoveredSlot.value.hour - START_HOUR) * 60 + hoveredSlot.value.minute
  return {
    top: `${(startMins / 30) * SLOT_HEIGHT}px`,
    height: `${(taskDuration() / 30) * SLOT_HEIGHT - 2}px`,
  }
}

function prevWeek() {
  const d = new Date(weekStart.value); d.setDate(d.getDate() - 7)
  weekStart.value = d; calStore.loadWeekEvents(d)
}
function nextWeek() {
  const d = new Date(weekStart.value); d.setDate(d.getDate() + 7)
  weekStart.value = d; calStore.loadWeekEvents(d)
}
function goToday() {
  weekStart.value = getMonday(new Date()); calStore.loadWeekEvents(weekStart.value)
}

async function scheduleAt(day, slot) {
  const task = store.pendingScheduleTask
  if (!task) return
  const existing = calStore.scheduledByTaskId.get(task.id) || []
  await Promise.allSettled(existing.map(ev => calStore.deleteEvent(ev.id, ev._calId)))
  try {
    const [year, month, dayN] = isoDate(day).split('-').map(Number)
    const start = new Date(year, month - 1, dayN, slot.hour, slot.minute, 0, 0)
    await calStore.createEvent(task.content, new Date(year, month - 1, dayN), slot.hour, slot.minute, taskDuration(), task.id)
    await store.saveScheduledTime(task.id, start.toISOString())
  } catch (err) {
    console.error('Failed to schedule:', err)
  }
  store.pendingScheduleTask = null
  f7.views.main.router.back()
}

function cancel() {
  store.pendingScheduleTask = null
  f7.views.main.router.back()
}

function goSettings() {
  f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true })
}

onMounted(async () => {
  if (!store.pendingScheduleTask) { f7.views.main.router.back(); return }
  if (calStore.isConnected) {
    calStore.loadWeekEvents(weekStart.value)
    await nextTick()
    if (calBodyEl.value) {
      const currentHourOffset = Math.max(0, new Date().getHours() - START_HOUR - 1)
      calBodyEl.value.scrollTop = currentHourOffset * SLOT_HEIGHT * 2
    }
  }
})
</script>
