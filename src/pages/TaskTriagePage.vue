<template>
  <f7-page name="tasks" class="tasks-page" no-swipeback>
    <div class="tasks-screen">
      <AppSidebar current-page="tasks">
        <template #filters>
          <template v-if="projectsWithTasks.length">
            <button class="sidebar-section-header" :aria-expanded="projectsOpen" @click="projectsOpen = !projectsOpen">
              <span class="sidebar-section-label">Projects</span>
              <span
                class="material-symbols-outlined sidebar-section-chevron"
                :class="{ open: projectsOpen }"
                aria-hidden="true"
              >keyboard_arrow_down</span>
            </button>
            <template v-if="projectsOpen">
              <button
                v-for="project in projectsWithTasks"
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
          <span class="material-symbols-outlined">left_panel_open</span>
        </button>

        <!-- Left: task list -->
        <div class="triage-list" :class="{ 'triage-list-collapsed': sidebarCollapsed }">
          <div ref="taskListBodyEl" class="triage-list-body" role="listbox" aria-label="Tasks">
            <div v-if="!filteredTasks.length" class="triage-empty-list">No tasks</div>
            <div
              v-for="(task, idx) in filteredTasks"
              :key="task.id"
              class="triage-task-row"
              :class="{ selected: selectedTask?.id === task.id }"
              tabindex="0"
              role="option"
              :aria-selected="selectedTask?.id === task.id"
              @click="selectTask(task)"
              @keydown.enter.prevent="selectTask(task)"
              @keydown.space.prevent="selectTask(task)"
              @keydown.down.prevent.stop="focusTaskRow(idx + 1)"
              @keydown.up.prevent.stop="focusTaskRow(idx - 1)"
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
          <button
            class="filter-fab"
            :class="{ active: showUntriaged }"
            :aria-pressed="showUntriaged"
            :aria-label="showUntriaged ? 'Show all tasks' : 'Show untriaged only'"
            @click="showUntriaged = !showUntriaged"
          >
            <span class="material-symbols-outlined">filter_alt</span>
          </button>
        </div>

        <!-- Right: task detail -->
        <div class="triage-detail">
          <template v-if="selectedTask">
            <div class="task-nav-bar">
              <button class="task-nav-btn" :disabled="selectedIndex <= 0" aria-label="Previous task" @click="goPrev">
                <span class="material-symbols-outlined">chevron_left</span>
              </button>
              <span class="task-nav-count">{{ selectedIndex + 1 }} / {{ filteredTasks.length }}</span>
              <button class="task-nav-btn" :disabled="selectedIndex >= filteredTasks.length - 1" aria-label="Next task" @click="goNext">
                <span class="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
            <TaskDetailPanel :task="selectedTask" @completed="onCompleted" />
          </template>
          <div v-else class="triage-no-selection">
            <span class="material-symbols-outlined">checklist</span>
            <p>Select a task to triage</p>
          </div>
        </div>
      </div>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard"><span class="material-symbols-outlined">view_kanban</span>Board</button>
      <button class="tab-btn tab-btn-active" aria-current="page"><span class="material-symbols-outlined">checklist</span>Tasks</button>
      <button class="tab-btn" @click="goSchedule"><span class="material-symbols-outlined">calendar_today</span>Schedule</button>
      <button class="tab-btn" @click="goSettings"><span class="material-symbols-outlined">settings</span>Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'
import { getLabel, getUrgencyLabel, getImportance, getTime, formatDeadline } from '../composables/useTaskTriage.js'
import AppSidebar from '../components/AppSidebar.vue'
import TaskDetailPanel from '../components/TaskDetailPanel.vue'

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()
const selectedTask = ref(null)
const taskListBodyEl = ref(null)

const showUntriaged = ref(false)
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
    (projectSet.has(t.project_id) || t.project_id === store.inboxProjectId) &&
    !store.excludedSectionIds.has(t.section_id)
  )
})

const projectsWithTasks = computed(() => {
  const ids = new Set(allTasks.value.map(t => t.project_id))
  return store.displayProjects.filter(p => ids.has(p.id))
})

const filteredTasks = computed(() => {
  let tasks = activeProjectId.value
    ? allTasks.value.filter(t => t.project_id === activeProjectId.value)
    : allTasks.value
  if (showUntriaged.value) tasks = tasks.filter(t => !getLabel(t, 'time::'))
  return tasks
})

function projectName(task) {
  return store.displayProjects.find(p => p.id === task.project_id)?.name ?? ''
}

// ── Selection & navigation ──
const selectedIndex = computed(() =>
  selectedTask.value ? filteredTasks.value.findIndex(t => t.id === selectedTask.value.id) : -1
)

function selectTask(task) {
  if (window.innerWidth < 768) {
    store.triageTaskIds = filteredTasks.value.map(t => t.id)
    store.triageCurrentId = task.id
    f7.views.main.router.navigate(`/tasks/${task.id}/`, { transition: 'f7-push' })
  } else {
    selectedTask.value = task
  }
}

function goNext() {
  const i = selectedIndex.value
  if (i >= 0 && i < filteredTasks.value.length - 1) selectedTask.value = filteredTasks.value[i + 1]
}

function goPrev() {
  const i = selectedIndex.value
  if (i > 0) selectedTask.value = filteredTasks.value[i - 1]
}

function onCompleted() {
  const i = selectedIndex.value
  selectedTask.value = filteredTasks.value[i + 1] ?? filteredTasks.value[i - 1] ?? null
}

function focusTaskRow(idx) {
  const rows = taskListBodyEl.value?.querySelectorAll('.triage-task-row')
  if (rows && idx >= 0 && idx < rows.length) rows[idx].focus()
}

function handleKey(e) {
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') goNext()
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') goPrev()
}

// ── Page navigation ──
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goSchedule() { f7.views.main.router.navigate('/schedule/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
  document.addEventListener('keydown', handleKey)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', handleKey)
})
</script>
