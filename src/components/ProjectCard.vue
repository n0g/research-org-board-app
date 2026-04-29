<template>
  <div
    ref="cardEl"
    class="card"
    :class="{
      dragging: dragging,
      stale: isStale && !isOnIce,
      'on-ice': isOnIce
    }"
    role="listitem"
    tabindex="0"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <!-- Top-right corner icons -->
    <div class="card-top-right">
      <span
        v-if="submissionStatus"
        class="card-submission-icon"
        :class="`card-submission-${submissionStatusKey}`"
        :title="submissionStatus"
      ><span class="material-symbols-outlined">{{ submissionStatusIcon }}</span></span>
      <div v-if="isStale && !isOnIce" class="card-stale-indicator" :aria-label="`Stale: ${staleWeeks}w`">!</div>
    </div>

    <!-- Venue badge -->
    <div v-if="meta.venue" class="card-venue-badge">
      <span class="card-venue-dot"></span>
      <span class="card-venue-name">{{ meta.venue }}</span>
    </div>

    <!-- Title -->
    <div class="card-name">{{ project.name }}</div>

    <!-- Status -->
    <div v-if="statusText" class="card-status">{{ statusText }}</div>

    <!-- Scheduled hours dots -->
    <div v-if="scheduledDots > 0" class="card-schedule-dots">
      <span v-for="i in scheduledDots" :key="i" class="card-schedule-dot"></span>
    </div>

    <!-- Bottom row: people + date -->
    <div class="card-bottom">
      <div class="card-people">
        <span
          v-for="person in personLabels"
          :key="person"
          class="card-person-chip"
        >{{ person }}</span>
      </div>

      <div v-if="deadlineDate" class="card-date" :class="deadlineDateClass">
        <span class="material-symbols-outlined">calendar_today</span>
        {{ deadlineFormatted }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { useReviewsStore } from '../stores/reviews.js'
import { VENUES, stripPersonPrefix, isPersonLabel, nearestDue, dueStatus, formatDate } from '../lib/helpers.js'

function getWeekRange() {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1))
  monday.setHours(0, 0, 0, 0)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  sunday.setHours(23, 59, 59, 999)
  return { monday, sunday }
}

function taskHours(task) {
  const label = (task.labels || []).find(l => l.startsWith('time::'))?.slice(5)
  if (label === '15m') return 0.25
  if (label === '30m') return 0.5
  if (label === '1h') return 1
  if (label === '2h') return 2
  return 1
}

const props = defineProps({
  project: { type: Object, required: true },
  stage: { type: Object, default: null },
})

const emit = defineEmits(['click'])

const store = useBoardStore()
const reviewsStore = useReviewsStore()
const cardEl = ref(null)
const dragging = ref(false)

const stageInfo = computed(() => store.projectStage(props.project.id))
const stageLabelSet = computed(() => new Set(store.stageLabels))
const tasks = computed(() => store.projectTasks(props.project.id))
const meta = computed(() => store.projectMeta(props.project.id))
const deadline = computed(() => store.projectDeadline(props.project.id))

const scheduledDots = computed(() => {
  const { monday, sunday } = getWeekRange()
  const allTasks = store.tasks.filter(t => t.project_id === props.project.id && !t.is_completed)
  let hours = 0
  for (const task of allTasks) {
    const line = (task.description || '').split('\n').find(l => l.startsWith('📅 Scheduled:'))
    const m = line?.match(/\(([^)]+)\)$/)
    if (!m) continue
    const dt = new Date(m[1])
    if (dt >= monday && dt <= sunday) hours += taskHours(task)
  }
  return Math.min(Math.round(hours), 10)
})

const statusText = computed(() => stageInfo.value?.task.content ?? '')
const personLabels = computed(() => {
  if (!stageInfo.value) return []
  return (stageInfo.value.task.labels || [])
    .filter(l => !stageLabelSet.value.has(l) && !VENUES.includes(l.toLowerCase()) && isPersonLabel(l))
    .map(stripPersonPrefix)
})

const dateStr = computed(() => {
  const t = stageInfo.value?.task
  return t ? (t.updated_at || t.created_at) : null
})
const staleDays = computed(() =>
  dateStr.value ? (Date.now() - new Date(dateStr.value).getTime()) / 86400000 : null
)
const isStale = computed(() => staleDays.value !== null && staleDays.value > 14)
const isOnIce = computed(() => props.stage?.label === 'stage::on-ice')
const staleWeeks = computed(() => staleDays.value ? Math.floor(staleDays.value / 7) : 0)

// Submission status badge
const submissionStatus = computed(() => reviewsStore.submissionStatuses[props.project.id]?.status ?? null)
const submissionStatusKey = computed(() => {
  const s = (submissionStatus.value || '').toLowerCase()
  if (s.includes('accept')) return 'accepted'
  if (s.includes('reject')) return 'rejected'
  if (s === 'submitted' || (s.includes('submit') && !s.includes('not'))) return 'submitted'
  if (s.includes('not')) return 'draft'
  return 'draft'
})
const submissionStatusIcon = computed(() => {
  const k = submissionStatusKey.value
  if (k === 'accepted') return 'check_circle'
  if (k === 'rejected') return 'cancel'
  if (k === 'submitted') return 'cloud_upload'
  return 'radio_button_unchecked'
})

// Deadline display
const deadlineDate = computed(() => deadline.value)
const deadlineFormatted = computed(() => {
  if (!deadline.value) return ''
  return deadline.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
})
const deadlineDateClass = computed(() => {
  if (!deadline.value) return ''
  const diff = deadline.value.getTime() - Date.now()
  if (diff < 0) return 'overdue'
  if (diff < 7 * 86400000) return 'due-soon'
  return ''
})


onMounted(() => {
  const card = cardEl.value
  if (!card) return

  card.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return

    const startX = e.clientX
    const startY = e.clientY
    const rect = card.getBoundingClientRect()
    const offsetX = startX - rect.left
    const offsetY = startY - rect.top
    const isTouch = e.pointerType === 'touch'
    const pointerId = e.pointerId

    let isDragging = false
    let wasCancelled = false
    let ghost = null
    let currentCol = null
    let longPressTimer = null
    let lastX = startX
    let lastY = startY

    function activateDrag() {
      if (isDragging) return
      isDragging = true
      dragging.value = true
      store.cardDragging = true
      if (isTouch) {
        navigator.vibrate?.(10)
        card.setPointerCapture(pointerId)
      }
      document.body.style.cursor = 'grabbing'
      document.documentElement.style.setProperty('--placeholder-h', rect.height + 'px')
      const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
      ghost = card.cloneNode(true)
      Object.assign(ghost.style, {
        position: 'fixed',
        width: rect.width + 'px',
        borderRadius: '12px',
        pointerEvents: 'none',
        zIndex: '1000',
        opacity: '0.9',
        transform: 'rotate(2deg) scale(1.04)',
        boxShadow: `0 28px 60px rgba(0,0,0,0.25), 0 0 0 1.5px ${accentColor}`,
        margin: '0',
        transition: 'none',
      })
      ghost.style.left = (lastX - offsetX) + 'px'
      ghost.style.top  = (lastY - offsetY) + 'px'
      document.body.appendChild(ghost)
    }

    if (isTouch) {
      longPressTimer = setTimeout(activateDrag, 350)
    }

    function onMove(e) {
      lastX = e.clientX
      lastY = e.clientY

      if (!isDragging) {
        if (isTouch) {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) > 8) {
            wasCancelled = true
            clearTimeout(longPressTimer)
            document.removeEventListener('pointermove', onMove)
          }
        } else {
          if (Math.hypot(e.clientX - startX, e.clientY - startY) >= 8) {
            store.cardDragging = true
            activateDrag()
          }
        }
        return
      }

      e.preventDefault()
      ghost.style.left = (e.clientX - offsetX) + 'px'
      ghost.style.top  = (e.clientY - offsetY) + 'px'
      ghost.style.visibility = 'hidden'
      const el = document.elementFromPoint(e.clientX, e.clientY)
      ghost.style.visibility = ''
      const col = el?.closest('.col[data-stage-label]') ?? null
      if (col !== currentCol) {
        currentCol?.classList.remove('drag-over')
        currentCol = col
        currentCol?.classList.add('drag-over')
      }
    }

    function onUp() {
      clearTimeout(longPressTimer)
      document.removeEventListener('pointermove', onMove)
      document.body.style.cursor = ''
      store.cardDragging = false
      if (!isDragging) {
        if (!wasCancelled) emit('click')
        return
      }
      ghost?.remove()
      dragging.value = false
      currentCol?.classList.remove('drag-over')
      document.documentElement.style.removeProperty('--placeholder-h')
      const newLabel  = currentCol?.dataset.stageLabel ?? null
      const oldLabel  = stageInfo.value?.label ?? ''
      const oldTaskId = stageInfo.value?.task.id ?? ''
      if (newLabel && newLabel !== oldLabel) {
        store.moveStage(props.project.id, oldTaskId, oldLabel, newLabel).catch(console.error)
      }
    }

    document.addEventListener('pointermove', onMove, { passive: false })
    document.addEventListener('pointerup', onUp, { once: true })
  })
})
</script>
