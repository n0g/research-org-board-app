<template>
  <f7-page name="schedule" class="schedule-page" no-swipeback>
    <div class="schedule-screen">
      <AppSidebar current-page="schedule">
        <template #filters>
          <template v-if="store.displayProjects.length">
            <div class="sidebar-section-header" @click="projectsOpen = !projectsOpen">
              <span class="sidebar-section-label">Projects</span>
              <span
                class="material-symbols-outlined sidebar-section-chevron"
                :class="{ open: projectsOpen }"
                aria-hidden="true"
              >keyboard_arrow_down</span>
            </div>
            <template v-if="projectsOpen">
              <button
                v-for="project in store.displayProjects"
                :key="project.id"
                class="sidebar-nav-item"
                :class="{ 'sidebar-filter-active': activeProjectId === project.id }"
                :title="project.name"
                @click="toggleProject(project.id)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">folder</span>
                <span class="sidebar-label">{{ project.name }}</span>
              </button>
            </template>
          </template>
        </template>
      </AppSidebar>

      <div class="schedule-main">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-expand-btn"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <span class="material-symbols-outlined">side_navigation</span>
        </button>

        <!-- Left: task list -->
        <div class="schedule-list" :class="{ 'schedule-list-collapsed': sidebarCollapsed }">
          <!-- Mobile: not-connected notice -->
          <div v-if="!calStore.isConnected" class="cal-mobile-notice">
            <span class="material-symbols-outlined">calendar_today</span>
            <span>{{ calStore.clientId ? 'Calendar session expired' : 'Connect Google Calendar to schedule tasks' }}</span>
            <button class="btn sm primary" @click="calStore.clientId ? calStore.connect() : goSettings()">
              {{ calStore.clientId ? 'Reconnect' : 'Settings' }}
            </button>
          </div>
          <div class="triage-tabs">
            <div class="seg-ctrl">
              <button
                v-for="t in TABS"
                :key="t.key"
                class="seg-btn"
                :class="{ active: tab === t.key }"
                @click="tab = t.key"
              >{{ t.label }}</button>
            </div>
          </div>
          <div class="triage-list-body">
            <div v-if="!filteredTasks.length" class="triage-empty-list">No tasks</div>
            <div
              v-for="task in filteredTasks"
              :key="task.id"
              class="triage-task-row schedule-task-row"
              :class="{ 'schedule-task-dragging': draggingTask?.id === task.id }"
              @pointerdown="onTaskPointerDown($event, task)"
            >
              <div class="triage-task-project">{{ projectName(task) }}</div>
              <div class="triage-task-title">{{ task.content }}</div>
              <div class="triage-task-meta">
                <div class="triage-task-tags">
                  <span v-if="getUrgencyLabel(task)" class="triage-tag">
                    <span class="material-symbols-outlined">bolt</span>{{ getUrgencyLabel(task) }}
                  </span>
                  <span v-if="getImportance(task)" class="triage-tag">
                    <span class="material-symbols-outlined">star</span>{{ getImportance(task) }}
                  </span>
                  <span v-if="getTime(task)" class="triage-tag triage-tag-dim">{{ getTime(task) }}</span>
                </div>
                <span v-if="scheduledLabel(task)" class="triage-tag triage-tag-scheduled">
                  <span class="material-symbols-outlined">event</span>{{ scheduledLabel(task) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: calendar -->
        <div class="schedule-cal">
          <template v-if="!calStore.isConnected">
            <div class="cal-not-connected">
              <span class="material-symbols-outlined">calendar_today</span>
              <p>{{ calStore.clientId ? 'Session expired — reconnect to continue' : 'Connect Google Calendar to schedule tasks' }}</p>
              <p v-if="calStore.connectError" class="cal-connect-error">{{ calStore.connectError }}</p>
              <button class="btn primary" @click="calStore.clientId ? calStore.connect() : goSettings()">
                {{ calStore.clientId ? 'Reconnect' : 'Open Settings' }}
              </button>
              <button v-if="calStore.clientId" class="btn" style="margin-top: 8px" @click="goSettings">Settings</button>
            </div>
          </template>
          <template v-else>
            <!-- Week navigation -->
            <div class="cal-nav">
              <button class="cal-nav-btn" title="Previous week" @click="prevWeek">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <span class="cal-nav-label">{{ weekLabel }}</span>
              <button class="cal-nav-btn" title="Next week" @click="nextWeek">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
              <button class="cal-today-btn" @click="goToday">Today</button>
              <span v-if="calStore.loading" class="cal-loading-dot"></span>
            </div>

            <!-- Calendar grid -->
            <div class="cal-week">
              <!-- Header: day names + dates -->
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

              <!-- Scrollable time grid -->
              <div ref="calBodyEl" class="cal-scroll">
                <div class="cal-inner">
                  <!-- Time labels -->
                  <div class="cal-time-col">
                    <div
                      v-for="slot in timeSlots"
                      :key="slot.key"
                      class="cal-time-cell"
                    >
                      <span v-if="slot.minute === 0" class="cal-time-label">{{ formatHour(slot.hour) }}</span>
                    </div>
                  </div>

                  <!-- Day columns -->
                  <div ref="calDaysEl" class="cal-days">
                    <div
                      v-for="day in weekDays"
                      :key="isoDate(day)"
                      class="cal-day-col"
                      :class="{ 'cal-today': isToday(day) }"
                    >
                      <!-- Slot cells (drop targets + grid lines) -->
                      <div
                        v-for="slot in timeSlots"
                        :key="slot.key"
                        class="cal-slot"
                        :class="{
                          'cal-slot-hover': isHoveredSlot(day, slot),
                          'cal-slot-hour': slot.minute === 0,
                        }"
                        :data-date="isoDate(day)"
                        :data-hour="slot.hour"
                        :data-minute="slot.minute"
                      ></div>

                      <!-- Events -->
                      <div
                        v-for="ev in timedDayEvents(day)"
                        :key="ev.id"
                        class="cal-event"
                        :class="{ 'cal-event-moving': draggingCalEvent?.id === ev.id }"
                        :style="eventStyle(ev)"
                        draggable="false"
                        @dragstart.prevent
                        @pointerdown.stop="onCalEventPointerDown($event, ev)"
                      >
                        <div class="cal-event-title">{{ ev.summary }}</div>
                        <div v-if="eventTimeStr(ev)" class="cal-event-time">{{ eventTimeStr(ev) }}</div>
                      </div>

                      <!-- Drop preview -->
                      <div
                        v-if="dropPreviewStyle(day)"
                        class="cal-drop-preview"
                        :style="dropPreviewStyle(day)"
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Tap-to-schedule sheet (mobile) -->
    <teleport to="body">
      <div v-if="sheetOpen" class="sched-sheet-backdrop" @click.self="closeSheet">
        <div class="sched-sheet">
          <div class="sched-sheet-header">
            <span class="sched-sheet-title">Schedule Task</span>
            <button class="sched-sheet-close" aria-label="Close" @click="closeSheet">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>
          <div class="sched-sheet-task">{{ sheetTask?.content }}</div>
          <div class="sched-sheet-fields">
            <label class="sched-field">
              <span class="sched-field-label">Date</span>
              <input type="date" v-model="sheetDate" class="sched-field-input">
            </label>
            <label class="sched-field">
              <span class="sched-field-label">Time</span>
              <input type="time" v-model="sheetTime" class="sched-field-input">
            </label>
            <label class="sched-field">
              <span class="sched-field-label">Duration</span>
              <select v-model.number="sheetDuration" class="sched-field-input">
                <option :value="15">15 min</option>
                <option :value="30">30 min</option>
                <option :value="60">1 hour</option>
                <option :value="90">1.5 hours</option>
                <option :value="120">2 hours</option>
              </select>
            </label>
          </div>
          <div class="sched-sheet-actions">
            <button class="btn" @click="closeSheet">Cancel</button>
            <button class="btn primary" @click="confirmSheet">Schedule</button>
          </div>
        </div>
      </div>
    </teleport>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard"><span class="material-symbols-outlined">dashboard</span>Board</button>
      <button class="tab-btn" @click="goTasks"><span class="material-symbols-outlined">checklist</span>Tasks</button>
      <button class="tab-btn tab-btn-active" aria-current="page"><span class="material-symbols-outlined">calendar_today</span>Schedule</button>
      <button class="tab-btn" @click="goSettings"><span class="material-symbols-outlined">settings</span>Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, nextTick, watch } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useCalendarStore } from '../stores/calendar.js'
import { useSidebar } from '../composables/useSidebar.js'
import { TABS, getLabel, getUrgencyLabel, getImportance, getTime } from '../composables/useTaskTriage.js'
import AppSidebar from '../components/AppSidebar.vue'

const store = useBoardStore()
const calStore = useCalendarStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()

// ── Task list ──
const tab = ref('all')
const projectsOpen = ref(true)
const activeProjectId = ref(null)

function toggleProject(id) {
  activeProjectId.value = activeProjectId.value === id ? null : id
}

const allTasks = computed(() => {
  const projectSet = new Set(store.displayProjects.map(p => p.id))
  return store.tasks.filter(t =>
    !t.is_completed &&
    projectSet.has(t.project_id) &&
    !store.excludedSectionIds.has(t.section_id)
  )
})

const filteredTasks = computed(() => {
  let tasks = activeProjectId.value
    ? allTasks.value.filter(t => t.project_id === activeProjectId.value)
    : allTasks.value
  switch (tab.value) {
    case 'important': return tasks.filter(t => getLabel(t, 'importance::') === 'high')
    case 'quick': return tasks.filter(t => getLabel(t, 'time::') === '15m')
    case 'urgent': return tasks.filter(t => (t.priority ?? 1) === 4)
    default: return tasks
  }
})

function projectName(task) {
  return store.displayProjects.find(p => p.id === task.project_id)?.name ?? ''
}

function scheduledLabel(task) {
  const ev = calStore.scheduledByTaskId.get(task.id)?.[0]
  if (!ev) return null
  const start = new Date(ev.start.dateTime || ev.start.date)
  const datePart = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  if (!ev.start.dateTime) return datePart
  const h = start.getHours(), m = start.getMinutes()
  const h12 = h % 12 || 12
  const period = h >= 12 ? 'pm' : 'am'
  const timePart = m === 0 ? `${h12}${period}` : `${h12}:${String(m).padStart(2, '0')}${period}`
  return `${datePart} ${timePart}`
}

// ── Calendar / week navigation ──
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
const calDaysEl = ref(null)

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
  const year = end.getFullYear()
  return `${startStr} – ${endStr}, ${year}`
})

function isoDate(d) { return d.toISOString().slice(0, 10) }
function isToday(d) { return isoDate(d) === isoDate(new Date()) }
function dayName(d) { return d.toLocaleDateString(undefined, { weekday: 'short' }) }

function formatHour(h) {
  if (h === 12) return '12pm'
  return h > 12 ? `${h - 12}pm` : `${h}am`
}

async function prevWeek() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() - 7)
  weekStart.value = d
  calStore.loadWeekEvents(d)
}

async function nextWeek() {
  const d = new Date(weekStart.value)
  d.setDate(d.getDate() + 7)
  weekStart.value = d
  calStore.loadWeekEvents(d)
}

function goToday() {
  weekStart.value = getMonday(new Date())
  calStore.loadWeekEvents(weekStart.value)
}

// ── Events ──
function timedDayEvents(day) {
  const dateStr = isoDate(day)
  return calStore.events.filter(ev => ev.start?.dateTime && ev.start.dateTime.slice(0, 10) === dateStr)
}

function allDayEvents(day) {
  const dateStr = isoDate(day)
  return calStore.events.filter(ev => !ev.start?.dateTime && ev.start?.date === dateStr)
}

function eventStyle(ev) {
  const start = new Date(ev.start.dateTime || ev.start.date + 'T00:00')
  const end = new Date(ev.end.dateTime || ev.end.date + 'T00:00')
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

// ── Tap-to-schedule sheet ──
const sheetOpen = ref(false)
const sheetTask = ref(null)
const sheetDate = ref('')
const sheetTime = ref('')
const sheetDuration = ref(60)

function _nextHalfHour() {
  const now = new Date()
  now.setSeconds(0, 0)
  now.setMinutes(now.getMinutes() < 30 ? 30 : 60)
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function openSheet(task) {
  sheetTask.value = task
  const existing = calStore.scheduledByTaskId.get(task.id)?.[0]
  if (existing?.start?.dateTime) {
    const d = new Date(existing.start.dateTime)
    sheetDate.value = isoDate(d)
    sheetTime.value = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    const dur = existing.end?.dateTime
      ? Math.round((new Date(existing.end.dateTime) - d) / 60000)
      : taskDurationMinutes(task)
    sheetDuration.value = dur
  } else {
    sheetDate.value = isoDate(new Date())
    sheetTime.value = _nextHalfHour()
    sheetDuration.value = taskDurationMinutes(task)
  }
  sheetOpen.value = true
}

function closeSheet() { sheetOpen.value = false }

async function confirmSheet() {
  const task = sheetTask.value
  if (!task || !sheetDate.value || !sheetTime.value) return
  closeSheet()
  const [year, month, day] = sheetDate.value.split('-').map(Number)
  const [hour, minute] = sheetTime.value.split(':').map(Number)
  const existing = calStore.scheduledByTaskId.get(task.id) || []
  await Promise.allSettled(existing.map(ev => calStore.deleteEvent(ev.id, ev._calId)))
  try {
    await calStore.createEvent(task.content, new Date(year, month - 1, day), hour, minute, sheetDuration.value, task.id)
  } catch (err) {
    console.error('Failed to schedule:', err)
  }
}

// ── Drag and drop ──
const draggingTask = ref(null)
const draggingCalEvent = ref(null)
const hoveredSlot = ref(null)
let ghostEl = null

function taskDurationMinutes(task) {
  const t = getTime(task)
  if (t === '15m') return 15
  if (t === '30m') return 30
  if (t === '2h') return 120
  return 60
}

function isHoveredSlot(day, slot) {
  return (
    hoveredSlot.value?.dateStr === isoDate(day) &&
    hoveredSlot.value?.hour === slot.hour &&
    hoveredSlot.value?.minute === slot.minute
  )
}

function dropPreviewStyle(day) {
  if ((!draggingTask.value && !draggingCalEvent.value) || !hoveredSlot.value) return null
  if (hoveredSlot.value.dateStr !== isoDate(day)) return null
  const startMins = (hoveredSlot.value.hour - START_HOUR) * 60 + hoveredSlot.value.minute
  let duration = 60
  if (draggingTask.value) {
    duration = taskDurationMinutes(draggingTask.value)
  } else if (draggingCalEvent.value?.start?.dateTime && draggingCalEvent.value?.end?.dateTime) {
    duration = Math.max(
      (new Date(draggingCalEvent.value.end.dateTime) - new Date(draggingCalEvent.value.start.dateTime)) / 60000,
      30
    )
  }
  return {
    top: `${(startMins / 30) * SLOT_HEIGHT}px`,
    height: `${(duration / 30) * SLOT_HEIGHT - 2}px`,
  }
}

function _startDrag(e, label) {
  ghostEl = document.createElement('div')
  ghostEl.className = 'cal-drag-ghost'
  ghostEl.textContent = label
  ghostEl.style.left = `${e.clientX + 14}px`
  ghostEl.style.top = `${e.clientY - 10}px`
  document.body.appendChild(ghostEl)
  document.addEventListener('pointermove', onPointerMove)
  document.addEventListener('pointerup', onPointerUp)
}

function onTaskPointerDown(e, task) {
  e.preventDefault()
  if (e.pointerType === 'touch') {
    if (calStore.isConnected) openSheet(task)
    else goSettings()
    return
  }
  if (e.button !== 0) return
  draggingTask.value = task
  _startDrag(e, task.content)
}

function onCalEventPointerDown(e, ev) {
  if (e.button !== 0) return
  e.preventDefault()
  draggingCalEvent.value = ev
  _startDrag(e, ev.summary)
}

function _slotFromPointer(e) {
  const daysEl = calDaysEl.value
  const scrollEl = calBodyEl.value
  if (!daysEl || !scrollEl) return null
  const rect = daysEl.getBoundingClientRect()
  if (e.clientX < rect.left || e.clientX > rect.right ||
      e.clientY < rect.top  || e.clientY > rect.bottom) return null
  const colWidth = rect.width / 7
  const dayIndex = Math.min(6, Math.max(0, Math.floor((e.clientX - rect.left) / colWidth)))
  const yInContent = (e.clientY - rect.top) + scrollEl.scrollTop
  const slotIndex = Math.floor(yInContent / SLOT_HEIGHT)
  const totalSlots = (END_HOUR - START_HOUR) * 2
  if (slotIndex < 0 || slotIndex >= totalSlots) return null
  return {
    dateStr: isoDate(weekDays.value[dayIndex]),
    hour: START_HOUR + Math.floor(slotIndex / 2),
    minute: (slotIndex % 2) * 30,
  }
}

function onPointerMove(e) {
  if (!draggingTask.value && !draggingCalEvent.value) return
  if (ghostEl) {
    ghostEl.style.left = `${e.clientX + 14}px`
    ghostEl.style.top = `${e.clientY - 10}px`
  }
  hoveredSlot.value = _slotFromPointer(e)
}

async function onPointerUp() {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  if (ghostEl) { ghostEl.remove(); ghostEl = null }

  const task = draggingTask.value
  const calEv = draggingCalEvent.value
  const slot = hoveredSlot.value
  draggingTask.value = null
  draggingCalEvent.value = null
  hoveredSlot.value = null

  if (!slot || !calStore.isConnected) return

  const [year, month, day] = slot.dateStr.split('-').map(Number)

  if (task) {
    // Delete any existing events for this task, then create a fresh one
    const existing = calStore.scheduledByTaskId.get(task.id) || []
    await Promise.allSettled(existing.map(ev => calStore.deleteEvent(ev.id, ev._calId)))
    try {
      await calStore.createEvent(
        task.content,
        new Date(year, month - 1, day),
        slot.hour,
        slot.minute,
        taskDurationMinutes(task),
        task.id
      )
    } catch (err) {
      console.error('Failed to create event:', err)
    }
  } else if (calEv?.start?.dateTime) {
    // Move existing calendar event, preserving duration
    const newStart = new Date(year, month - 1, day, slot.hour, slot.minute, 0, 0)
    const duration = new Date(calEv.end.dateTime) - new Date(calEv.start.dateTime)
    const newEnd = new Date(newStart.getTime() + duration)
    try {
      await calStore.updateEvent(calEv.id, calEv._calId, newStart, newEnd)
    } catch (err) {
      console.error('Failed to move event:', err)
    }
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('pointermove', onPointerMove)
  document.removeEventListener('pointerup', onPointerUp)
  if (ghostEl) { ghostEl.remove(); ghostEl = null }
  draggingTask.value = null
  draggingCalEvent.value = null
})

// ── Navigation ──
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goTasks() { f7.views.main.router.navigate('/tasks/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }

watch(() => calStore.isConnected, async (connected) => {
  if (connected) {
    calStore.loadWeekEvents(weekStart.value)
    await nextTick()
    if (calBodyEl.value) calBodyEl.value.scrollTop = SLOT_HEIGHT * 2
  }
})

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
  if (calStore.isConnected) {
    calStore.loadWeekEvents(weekStart.value)
    await nextTick()
    if (calBodyEl.value) calBodyEl.value.scrollTop = SLOT_HEIGHT * 2
  }
})
</script>
