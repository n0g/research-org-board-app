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
    <!-- Stale indicator -->
    <div v-if="isStale && !isOnIce" class="card-stale-indicator" :aria-label="`Stale: ${staleWeeks}w`">!</div>

    <!-- Venue badge -->
    <div v-if="meta.venue" class="card-venue-badge" :class="venueColorClass">
      <span class="card-venue-dot"></span>
      <span class="card-venue-name">{{ meta.venue }}</span>
    </div>

    <!-- Title -->
    <div class="card-name">{{ project.name }}</div>

    <!-- Status -->
    <div v-if="statusText" class="card-status">{{ statusText }}</div>

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
import { VENUES, stripPersonPrefix, isPersonLabel, nearestDue, dueStatus, formatDate } from '../lib/helpers.js'

const props = defineProps({
  project: { type: Object, required: true },
  stage: { type: Object, default: null },
})

const emit = defineEmits(['click'])

const store = useBoardStore()
const cardEl = ref(null)
const dragging = ref(false)

const stageInfo = computed(() => store.projectStage(props.project.id))
const stageLabelSet = computed(() => new Set(store.stageLabels))
const tasks = computed(() => store.projectTasks(props.project.id))
const meta = computed(() => store.projectMeta(props.project.id))
const deadline = computed(() => store.projectDeadline(props.project.id))

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

// Venue color
const venueColorClass = computed(() => {
  const v = (meta.value.venue ?? '').toUpperCase()
  if (['PETS', 'POPETS', 'CCS', 'CHI', 'CSCW'].some(k => v.includes(k))) return 'venue-blue'
  if (['USENIX', 'NDSS'].some(k => v.includes(k))) return 'venue-green'
  return 'venue-orange'
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
