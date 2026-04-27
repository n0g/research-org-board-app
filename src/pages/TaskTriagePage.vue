<template>
  <f7-page name="tasks" class="tasks-page" no-swipeback>
    <div class="tasks-screen">
      <AppSidebar current-page="tasks">
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

      <div class="tasks-main">
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
        <div class="triage-list" :class="{ 'triage-list-collapsed': sidebarCollapsed }">
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
              class="triage-task-row"
              :class="{ selected: selectedTask?.id === task.id }"
              @click="selectTask(task)"
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
                <span v-if="task.due?.date" class="triage-task-date">{{ formatDeadline(task.due.date) }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Right: task detail -->
        <div class="triage-detail">
          <TaskDetailPanel v-if="selectedTask" :task="selectedTask" @completed="selectedTask = null" />
          <div v-else class="triage-no-selection">
            <span class="material-symbols-outlined">checklist</span>
            <p>Select a task to triage</p>
          </div>
        </div>
      </div>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard"><span class="material-symbols-outlined">dashboard</span>Board</button>
      <button class="tab-btn tab-btn-active" aria-current="page"><span class="material-symbols-outlined">checklist</span>Tasks</button>
      <button class="tab-btn" @click="goReviews"><span class="material-symbols-outlined">grading</span>Reviews</button>
      <button class="tab-btn" @click="goSettings"><span class="material-symbols-outlined">settings</span>Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'
import { TABS, getLabel, getUrgencyLabel, getImportance, getTime, formatDeadline } from '../composables/useTaskTriage.js'
import AppSidebar from '../components/AppSidebar.vue'
import TaskDetailPanel from '../components/TaskDetailPanel.vue'

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()
const selectedTask = ref(null)

const tab = ref('all')
const projectsOpen = ref(true)
const activeProjectId = ref(null)

function toggleProject(id) {
  activeProjectId.value = activeProjectId.value === id ? null : id
  selectedTask.value = null
}

// ── Task data ──
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

// ── Selection ──
function selectTask(task) {
  if (window.innerWidth < 768) {
    f7.views.main.router.navigate(`/tasks/${task.id}/`, { transition: 'f7-push' })
  } else {
    selectedTask.value = task
  }
}

// ── Navigation ──
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goReviews() { f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
})
</script>
