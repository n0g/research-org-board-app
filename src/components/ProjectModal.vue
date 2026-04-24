<template>
  <f7-sheet
    class="project-sheet"
    :opened="open"
    swipe-to-close
    backdrop
    @sheet:closed="$emit('close')"
  >
    <div class="swipe-handler"></div>
    <f7-page-content>
      <template v-if="project">
        <div class="modal-head">
          <h2 class="modal-title" id="modal-title">{{ project.name }}</h2>
          <button class="close-btn" aria-label="Close" @click="$emit('close')">×</button>
        </div>

        <div class="modal-body" role="dialog" aria-modal="true" aria-labelledby="modal-title">
          <!-- Stage selector -->
          <div class="detail-row" style="align-items:flex-start">
            <span class="label">Stage</span>
            <div class="stage-selector">
              <button
                v-for="s in store.stages"
                :key="s.label"
                class="stage-opt"
                :class="{ active: stageInfo?.label === s.label }"
                :aria-pressed="stageInfo?.label === s.label ? 'true' : 'false'"
                @click="changeStage(s.label)"
              >{{ s.name }}</button>
            </div>
          </div>

          <div v-if="meta.venue" class="detail-row">
            <span class="label">Venue</span>
            <span class="value">{{ meta.venue }}</span>
          </div>
          <div v-if="meta.author" class="detail-row">
            <span class="label">Author</span>
            <span class="value">{{ meta.author }}</span>
          </div>

          <div class="detail-row">
            <span class="label">Open</span>
            <a :href="'todoist://project?id=' + project.id" class="todoist-link">in Todoist app ↗</a>
          </div>

          <!-- Task list -->
          <div class="tasks-section">
            <div class="section-label">Open tasks ({{ tasks.length }})</div>
            <div v-if="!tasks.length" class="no-tasks">No open tasks</div>
            <TaskItem
              v-for="task in tasks"
              :key="task.id"
              :task="task"
            />
            <input
              type="text"
              class="quick-add-input"
              placeholder="+ add a task…"
              aria-label="Add a task to this project"
              v-model="quickAddText"
              @keydown.enter.prevent="quickAdd"
            >
          </div>
        </div>
      </template>
    </f7-page-content>
  </f7-sheet>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useBoardStore } from '../stores/board.js'
import TaskItem from './TaskItem.vue'

const props = defineProps({
  project: { type: Object, default: null },
  open: { type: Boolean, default: false },
})

defineEmits(['close'])

const store = useBoardStore()
const quickAddText = ref('')

const stageInfo = computed(() => props.project ? store.projectStage(props.project.id) : null)
const meta = computed(() => props.project ? store.projectMeta(props.project.id) : {})
const tasks = computed(() => props.project ? store.projectTasks(props.project.id) : [])

async function changeStage(newLabel) {
  if (!props.project || !stageInfo.value) return
  await store.moveStage(
    props.project.id,
    stageInfo.value.task.id,
    stageInfo.value.label,
    newLabel
  ).catch(console.error)
}

async function quickAdd() {
  const val = quickAddText.value.trim()
  if (!val || !props.project) return
  quickAddText.value = ''
  await store.quickAddTask(val, props.project.id).catch(console.error)
}
</script>
