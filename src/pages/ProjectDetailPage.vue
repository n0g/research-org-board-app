<template>
  <f7-page name="project-detail" class="project-page" no-swipeback>
    <div class="project-screen">
      <AppSidebar current-page="board" @settings="settingsOpen = true" />

      <div class="project-main">
        <!-- Left metadata pane -->
        <section class="project-meta">
          <button class="back-btn" @click="goBack">
            <span class="material-symbols-outlined">arrow_back</span>
            Board
          </button>

          <h1 class="project-title">{{ project?.name ?? 'Loading…' }}</h1>

          <!-- Status -->
          <div class="meta-section">
            <div class="meta-label">Status</div>
            <div class="meta-value">
              <span class="status-dot" :class="stageDotClass"></span>
              <span>{{ stageInfo?.task.content ?? '—' }}</span>
            </div>
          </div>

          <!-- Target Venue -->
          <div v-if="meta.venue" class="meta-section">
            <div class="meta-label">Target Venue</div>
            <div class="meta-value">
              <span class="material-symbols-outlined">label</span>
              {{ meta.venue }}
            </div>
          </div>

          <!-- Deadline -->
          <div class="meta-section">
            <div class="meta-label">Deadline</div>
            <div class="meta-value">
              <span class="material-symbols-outlined">calendar_today</span>
              <span :class="deadlineDateClass">{{ formattedDeadline }}</span>
            </div>
          </div>

          <!-- Collaborators -->
          <div v-if="personLabels.length" class="meta-section">
            <div class="meta-label">Collaborators</div>
            <div class="collab-chips">
              <span v-for="person in personLabels" :key="person" class="collab-chip">
                <span class="material-symbols-outlined">person</span>
                {{ person }}
              </span>
            </div>
          </div>

          <!-- Pipeline Stage -->
          <div v-if="store.stages" class="meta-section">
            <div class="meta-label">Pipeline Stage</div>
            <div class="stage-selector">
              <button
                v-for="(stage, idx) in store.stages"
                :key="stage.label"
                class="stage-opt"
                :class="{ active: stageInfo?.label === stage.label }"
                @click="changeStage(stage)"
              >{{ stage.name }}</button>
            </div>
          </div>

          <!-- Todoist link -->
          <a
            v-if="project"
            class="todoist-link"
            :href="`https://todoist.com/app/project/${project.id}`"
            target="_blank"
            rel="noopener noreferrer"
          >Open in Todoist ↗</a>
        </section>

        <!-- Right tasks pane -->
        <section class="project-tasks">
          <div class="tasks-header">
            <div class="tasks-title">Project Tasks</div>
            <div class="tasks-subtitle">{{ tasks.length }} open task{{ tasks.length !== 1 ? 's' : '' }}</div>
          </div>

          <!-- Quick-add -->
          <div class="task-quick-add">
            <div class="task-quick-add-icon">
              <span class="material-symbols-outlined">add</span>
            </div>
            <input
              v-model="newTaskContent"
              class="quick-add-input"
              type="text"
              placeholder="Add a task…"
              @keydown.enter.prevent="addTask"
            >
          </div>

          <!-- Task section label -->
          <div v-if="tasks.length" class="task-group-label">Tasks</div>

          <TaskItem
            v-for="task in tasks"
            :key="task.id"
            :task="task"
          />

          <div v-if="!tasks.length" class="no-tasks">No open tasks</div>
        </section>
      </div>
    </div>

    <SettingsSheet :open="settingsOpen" @close="settingsOpen = false" />

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn tab-btn-active" aria-current="page" @click="goBoard">Board</button>
      <button class="tab-btn" @click="goReviews">Reviews</button>
      <button class="tab-btn" @click="settingsOpen = true">Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'

import AppSidebar from '../components/AppSidebar.vue'
import SettingsSheet from '../components/SettingsSheet.vue'
import TaskItem from '../components/TaskItem.vue'

const props = defineProps({
  f7route: { type: Object, required: true },
})

const store = useBoardStore()
const { sidebarCollapsed } = useSidebar()
const settingsOpen = ref(false)
const newTaskContent = ref('')

const projectId = computed(() => props.f7route.params.id)

const project = computed(() =>
  store.displayProjects.find(p => p.id === projectId.value) ?? null
)

const stageInfo = computed(() => store.projectStage(projectId.value))
const meta = computed(() => store.projectMeta(projectId.value))
const tasks = computed(() => store.projectTasks(projectId.value))
const deadline = computed(() => store.projectDeadline(projectId.value))

const stageLabelSet = computed(() => new Set(store.stageLabels))

const personLabels = computed(() =>
  stageInfo.value
    ? (stageInfo.value.task.labels || []).filter(l => !stageLabelSet.value.has(l))
    : []
)

const stageIndex = computed(() => {
  if (!stageInfo.value || !store.stages) return -1
  return store.stages.findIndex(s => s.label === stageInfo.value.label)
})

const stageDotClass = computed(() => {
  const idx = stageIndex.value
  if (idx < 0) return ''
  return `stage-${Math.min(idx, 5)}`
})

const formattedDeadline = computed(() => {
  if (!deadline.value) return 'None'
  return deadline.value.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
})

const deadlineDateClass = computed(() => {
  if (!deadline.value) return ''
  const diff = deadline.value.getTime() - Date.now()
  if (diff < 0) return 'overdue-text'
  if (diff < 7 * 86400000) return 'due-soon-text'
  return ''
})

async function changeStage(stage) {
  if (!stageInfo.value) return
  const oldLabel = stageInfo.value.label
  const oldTaskId = stageInfo.value.task.id
  if (oldLabel === stage.label) return
  await store.moveStage(projectId.value, oldTaskId, oldLabel, stage.label).catch(console.error)
}

async function addTask() {
  const content = newTaskContent.value.trim()
  if (!content || !project.value) return
  newTaskContent.value = ''
  await store.quickAddTask(content, project.value.id).catch(console.error)
}

function goBack() {
  f7.views.main.router.back()
}

function goBoard() {
  f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
}

function goReviews() {
  f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true })
}

onMounted(async () => {
  if (!store.tasks.length) {
    store.initStages()
    await store.loadData()
  }
})
</script>
