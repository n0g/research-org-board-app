<template>
  <div class="task-item-wrap">
    <div class="task-delete-zone" aria-label="Delete task" @click="doDelete">
      <span class="material-symbols-outlined">delete</span>
    </div>
    <div
      class="task-item"
      :class="[priorityClass, { 'swipe-open': swipeOpen }]"
      :id="'task-' + task.id"
      :style="swipeStyle"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerCancel"
      @click="onItemClick"
    >
      <div
        class="task-check"
        :class="{ done: completing }"
        role="button"
        tabindex="0"
        aria-label="Complete task"
        @click.stop="complete"
        @keydown.enter.prevent="complete"
        @keydown.space.prevent="complete"
      ></div>
      <div class="task-content">
        <div v-if="!editingTitle" class="task-name" role="button" tabindex="0" @click.stop="startTitleEdit" @keydown.enter.prevent="startTitleEdit">
          <span v-if="priorityLabel" class="sr-only">{{ priorityLabel }}: </span>
          <template v-for="seg in contentSegments" :key="seg.i">
            <a v-if="seg.href" :href="seg.href" target="_blank" rel="noopener noreferrer" class="task-link" @click.stop>{{ seg.text }}</a>
            <template v-else>{{ seg.text }}</template>
          </template>
        </div>
        <input
          v-if="editingTitle"
          ref="titleInputEl"
          class="task-title-edit"
          :value="task.content"
          @blur="saveTitle"
          @keydown.enter.prevent="titleInputEl?.blur()"
          @keydown.escape.stop="editingTitle = false"
          @click.stop
        >
        <div
          v-if="!editingDue"
          class="task-due"
          :class="dueClass"
          role="button"
          tabindex="0"
          @click.stop="startDueEdit"
          @keydown.enter.prevent="startDueEdit"
          @keydown.space.prevent="startDueEdit"
        >
          <template v-if="task.due">{{ dueClass === 'overdue' ? '⚠︎ ' : '· ' }}{{ formattedDue }}</template>
          <template v-else>+ due date</template>
        </div>
        <input
          v-if="editingDue"
          ref="dueInputEl"
          type="date"
          class="task-due-edit"
          :value="task.due?.date ?? ''"
          @blur="saveDue"
          @keydown.enter.prevent="dueInputEl?.blur()"
          @keydown.escape.stop="editingDue = false"
        >
      </div>
      <div class="task-hover-actions">
        <button class="task-action-btn" aria-label="Delete task" @click.stop="doDelete">
          <span class="material-symbols-outlined">delete</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { dueStatus, formatDate } from '../lib/helpers.js'

const props = defineProps({
  task: { type: Object, required: true },
})

const store = useBoardStore()
const dueInputEl = ref(null)
const titleInputEl = ref(null)
const editingDue = ref(false)
const editingTitle = ref(false)
const completing = ref(false)

// ── Swipe state ──
const swipeX = ref(0)
const swipeOpen = ref(false)
const isSwiping = ref(false)
let startX = 0, startY = 0, dirLocked = false, isHoriz = false

const SNAP = 80

const swipeStyle = computed(() => ({
  transform: `translateX(${swipeX.value}px)`,
  transition: isSwiping.value ? 'none' : 'transform 0.25s ease',
}))

function onPointerDown(e) {
  if (e.pointerType === 'mouse') return
  startX = e.clientX; startY = e.clientY
  dirLocked = false; isHoriz = false
  isSwiping.value = true
}

function onPointerMove(e) {
  if (!isSwiping.value) return
  const dx = e.clientX - startX
  const dy = e.clientY - startY
  if (!dirLocked && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    isHoriz = Math.abs(dx) > Math.abs(dy)
    dirLocked = true
  }
  if (!dirLocked || !isHoriz) return
  e.preventDefault()
  const base = swipeOpen.value ? -SNAP : 0
  swipeX.value = Math.min(0, Math.max(-SNAP, base + dx))
}

function onPointerUp() {
  if (!isSwiping.value) return
  isSwiping.value = false
  if (!isHoriz) return
  if (swipeX.value < -SNAP / 2) {
    swipeX.value = -SNAP; swipeOpen.value = true
  } else {
    swipeX.value = 0; swipeOpen.value = false
  }
}

function onPointerCancel() {
  isSwiping.value = false
  swipeX.value = swipeOpen.value ? -SNAP : 0
}

function onItemClick() {
  if (swipeOpen.value) { swipeX.value = 0; swipeOpen.value = false }
}

// ── Link rendering ──
const contentSegments = computed(() => {
  const text = props.task.content ?? ''
  const segments = []
  const re = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g
  let last = 0, m, i = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segments.push({ i: i++, text: text.slice(last, m.index) })
    segments.push({ i: i++, text: m[1], href: m[2] })
    last = m.index + m[0].length
  }
  if (last < text.length) segments.push({ i: i++, text: text.slice(last) })
  return segments
})

// ── Priority ──
const priorityClass = computed(() => {
  if (props.task.priority === 4) return 'p1'
  if (props.task.priority === 3) return 'p2'
  if (props.task.priority === 2) return 'p3'
  return ''
})

const priorityLabel = computed(() => {
  if (props.task.priority === 4) return 'Priority 1'
  if (props.task.priority === 3) return 'Priority 2'
  if (props.task.priority === 2) return 'Priority 3'
  return ''
})

// ── Due date ──
const dueClass = computed(() => {
  if (!props.task.due) return ''
  return dueStatus(new Date(props.task.due.date).getTime())
})

const formattedDue = computed(() => formatDate(props.task.due?.date ?? ''))

async function complete() {
  completing.value = true
  await store.completeTask(props.task.id).catch(console.error)
}

function startDueEdit() {
  editingDue.value = true
  setTimeout(() => dueInputEl.value?.focus(), 0)
}

async function saveDue() {
  editingDue.value = false
  const val = dueInputEl.value?.value ?? ''
  await store.updateTaskDue(props.task.id, val).catch(console.error)
}

function startTitleEdit() {
  editingTitle.value = true
  setTimeout(() => titleInputEl.value?.select(), 0)
}

async function saveTitle() {
  editingTitle.value = false
  const val = titleInputEl.value?.value?.trim()
  if (val && val !== props.task.content) {
    await store.updateStatusText(props.task.id, val).catch(console.error)
  }
}

async function doDelete() {
  await store.deleteTask(props.task.id).catch(console.error)
}
</script>
