<template>
  <div
    ref="cardEl"
    class="card"
    :class="{ dragging: dragging, stale: isStale && !isOnIce, 'on-ice': isOnIce }"
    role="listitem"
    tabindex="0"
    @keydown.enter.prevent="$emit('click')"
    @keydown.space.prevent="$emit('click')"
  >
    <div class="card-name">{{ project.name }}</div>

    <div
      v-if="statusText"
      ref="statusEl"
      class="card-status editable"
      role="button"
      tabindex="0"
      :title="'Click to edit'"
      :aria-label="'Edit status: ' + statusText"
      @pointerdown.stop
      @click.stop="startStatusEdit"
      @keydown.enter.prevent.stop="startStatusEdit"
      @keydown.space.prevent.stop="startStatusEdit"
    >{{ editingStatus ? '' : statusText }}</div>

    <input
      v-if="editingStatus"
      ref="statusInputEl"
      v-model="statusDraft"
      class="card-status-input"
      @pointerdown.stop
      @click.stop
      @blur="saveStatusEdit"
      @keydown.stop
      @keydown.enter.prevent="statusInputEl?.blur()"
      @keydown.escape.prevent="cancelStatusEdit"
    >

    <div v-if="tags.length" class="card-meta">
      <span
        v-for="tag in tags"
        :key="tag.key"
        class="tag"
        :class="tag.cls"
        v-html="tag.text"
      ></span>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { nearestDue, dueStatus, formatDate } from '../lib/helpers.js'

const props = defineProps({
  project: { type: Object, required: true },
  stage: { type: Object, default: null },
})

const emit = defineEmits(['click'])

const store = useBoardStore()
const cardEl = ref(null)
const statusEl = ref(null)
const statusInputEl = ref(null)
const dragging = ref(false)
const editingStatus = ref(false)
const statusDraft = ref('')

const stageInfo = computed(() => store.projectStage(props.project.id))
const stageLabelSet = computed(() => new Set(store.stageLabels))
const tasks = computed(() => store.projectTasks(props.project.id))
const meta = computed(() => store.projectMeta(props.project.id))
const deadline = computed(() => store.projectDeadline(props.project.id))
const nearest = computed(() => nearestDue(tasks.value))

const statusText = computed(() => stageInfo.value?.task.content ?? '')
const personLabels = computed(() =>
  stageInfo.value
    ? (stageInfo.value.task.labels || []).filter(l => !stageLabelSet.value.has(l))
    : []
)

const dateStr = computed(() => {
  const t = stageInfo.value?.task
  return t ? (t.updated_at || t.created_at) : null
})
const staleDays = computed(() =>
  dateStr.value ? (Date.now() - new Date(dateStr.value).getTime()) / 86400000 : null
)
const isStale = computed(() => staleDays.value !== null && staleDays.value > 14)
const isOnIce = computed(() => props.stage?.label === 'stage::on-ice')

const tags = computed(() => {
  const list = []
  let key = 0
  personLabels.value.forEach(l => {
    list.push({ key: key++, cls: 'person', text: esc(l) })
  })
  if (meta.value.venue) {
    const dl = deadline.value
      ? deadline.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null
    list.push({ key: key++, cls: 'venue', text: esc(meta.value.venue) + (dl ? ' · ' + esc(dl) : '') })
  }
  if (nearest.value) {
    const st = dueStatus(nearest.value)
    const label = formatDate(new Date(nearest.value).toISOString().split('T')[0])
    list.push({ key: key++, cls: st, text: (st === 'overdue' ? '⚠︎ ' : '') + esc(label) })
  }
  if (tasks.value.length) {
    list.push({ key: key++, cls: '', text: tasks.value.length + ' task' + (tasks.value.length !== 1 ? 's' : '') })
  }
  if (isStale.value && !isOnIce.value) {
    const weeks = Math.floor(staleDays.value / 7)
    list.push({ key: key++, cls: 'stale-tag', text: `⏱︎ ${weeks}w` })
  }
  return list
})

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function startStatusEdit() {
  statusDraft.value = statusText.value
  editingStatus.value = true
  setTimeout(() => { statusInputEl.value?.focus(); statusInputEl.value?.select() }, 0)
}

async function saveStatusEdit() {
  editingStatus.value = false
  const val = statusDraft.value.trim() || statusText.value
  if (val !== statusText.value && stageInfo.value) {
    await store.updateStatusText(stageInfo.value.task.id, val).catch(console.error)
  }
}

function cancelStatusEdit() {
  editingStatus.value = false
}

onMounted(() => {
  const card = cardEl.value
  if (!card) return

  card.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    store.cardDragging = true

    const startX = e.clientX
    const startY = e.clientY
    const rect = card.getBoundingClientRect()
    const offsetX = startX - rect.left
    const offsetY = startY - rect.top

    let isDragging = false
    let ghost = null
    let currentCol = null

    function onMove(e) {
      if (!isDragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return
        isDragging = true
        dragging.value = true
        document.body.style.cursor = 'grabbing'
        const accentColor = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()
        ghost = card.cloneNode(true)
        Object.assign(ghost.style, {
          position: 'fixed',
          width: rect.width + 'px',
          borderRadius: '14px',
          pointerEvents: 'none',
          zIndex: '1000',
          opacity: '1',
          transform: 'rotate(2.5deg) scale(1.06)',
          boxShadow: `0 28px 60px rgba(0,0,0,0.55), 0 0 0 1.5px ${accentColor}`,
          margin: '0',
          transition: 'none',
        })
        document.body.appendChild(ghost)
      }
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
      document.removeEventListener('pointermove', onMove)
      document.body.style.cursor = ''
      store.cardDragging = false
      if (!isDragging) { emit('click'); return }
      ghost?.remove()
      dragging.value = false
      currentCol?.classList.remove('drag-over')
      const newLabel  = currentCol?.dataset.stageLabel ?? null
      const oldLabel  = stageInfo.value?.label ?? ''
      const oldTaskId = stageInfo.value?.task.id ?? ''
      if (newLabel && newLabel !== oldLabel) {
        store.moveStage(props.project.id, oldTaskId, oldLabel, newLabel).catch(console.error)
      }
    }

    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp, { once: true })
  })
})
</script>
