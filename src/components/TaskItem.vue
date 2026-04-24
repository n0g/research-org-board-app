<template>
  <div class="task-item" :class="priorityClass" :id="'task-' + task.id">
    <div
      class="task-check"
      :class="{ done: completing }"
      role="button"
      tabindex="0"
      aria-label="Complete task"
      @click="complete"
      @keydown.enter.prevent="complete"
      @keydown.space.prevent="complete"
    ></div>
    <div class="task-content">
      <div class="task-name">
        <span v-if="priorityLabel" class="sr-only">{{ priorityLabel }}: </span>
        {{ task.content }}
      </div>
      <div
        v-if="!editingDue"
        class="task-due"
        :class="dueClass"
        role="button"
        tabindex="0"
        @click="startDueEdit"
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
const editingDue = ref(false)
const completing = ref(false)

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
</script>
