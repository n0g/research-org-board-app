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
        <div class="triage-list">
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
          <template v-if="selectedTask">
            <div class="triage-detail-inner">
              <header class="triage-detail-header">
                <div class="triage-project-badge">{{ projectName(selectedTask) }}</div>
                <h2 class="triage-detail-title">{{ selectedTask.content }}</h2>
                <textarea
                  v-model="draft.notes"
                  class="triage-notes"
                  placeholder="Add notes…"
                  rows="3"
                ></textarea>
              </header>

              <div class="triage-fields">
                <div class="triage-field">
                  <label class="triage-field-label">Urgency</label>
                  <div class="seg-ctrl">
                    <button
                      v-for="u in URGENCY_OPTS"
                      :key="u.val"
                      class="seg-btn"
                      :class="{ active: draft.urgency === u.val }"
                      @click="draft.urgency = u.val"
                    >{{ u.label }}</button>
                  </div>
                </div>

                <div class="triage-field">
                  <label class="triage-field-label">Importance</label>
                  <div class="seg-ctrl">
                    <button
                      v-for="lvl in LEVEL_OPTS"
                      :key="lvl"
                      class="seg-btn"
                      :class="{ active: draft.importance === lvl }"
                      @click="draft.importance = lvl"
                    >{{ capitalize(lvl) }}</button>
                  </div>
                </div>

                <div class="triage-field">
                  <label class="triage-field-label">Estimated Time</label>
                  <div class="seg-ctrl">
                    <button
                      v-for="t in TIME_OPTS"
                      :key="t"
                      class="seg-btn"
                      :class="{ active: draft.time === t }"
                      @click="draft.time = t"
                    >{{ t }}</button>
                  </div>
                </div>

                <div class="triage-field">
                  <label class="triage-field-label">Delegatable</label>
                  <div class="seg-ctrl triage-seg-narrow">
                    <button class="seg-btn" :class="{ active: draft.delegatable === 'no' }" @click="draft.delegatable = 'no'">No</button>
                    <button class="seg-btn" :class="{ active: draft.delegatable === 'yes' }" @click="draft.delegatable = 'yes'">Yes</button>
                  </div>
                </div>

                <div class="triage-field">
                  <label class="triage-field-label">Deadline</label>
                  <input
                    class="meta-date-visible"
                    type="date"
                    v-model="draft.deadline"
                  >
                </div>

                <div class="triage-actions">
                  <button class="btn primary triage-save-btn" :disabled="saving" @click="saveChanges">
                    {{ saving ? 'Saving…' : 'Save Changes' }}
                  </button>
                </div>
              </div>
            </div>
          </template>
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
import { parseLocalDate } from '../lib/helpers.js'
import AppSidebar from '../components/AppSidebar.vue'

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'important', label: 'Important' },
  { key: 'quick', label: 'Quick' },
  { key: 'urgent', label: 'Urgent' },
]
const URGENCY_OPTS = [
  { val: 'low', label: 'Low' },
  { val: 'med', label: 'Med' },
  { val: 'high', label: 'High' },
  { val: 'urgent', label: 'Urgent' },
]
const LEVEL_OPTS = ['low', 'med', 'high']
const TIME_OPTS = ['15m', '30m', '1h', '2h']
const TRIAGE_PREFIXES = ['importance::', 'time::', 'delegatable::']

const tab = ref('all')
const selectedTask = ref(null)
const saving = ref(false)
const draft = ref({ urgency: 'low', importance: null, time: null, delegatable: null, deadline: '', notes: '' })
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
    case 'urgent': return tasks.filter(t => (t.priority ?? 4) === 1)
    default: return tasks
  }
})

function projectName(task) {
  return store.displayProjects.find(p => p.id === task.project_id)?.name ?? ''
}

// ── Attribute helpers ──
function getLabel(task, prefix) {
  return (task.labels || []).find(l => l.startsWith(prefix))?.slice(prefix.length) ?? null
}

function getUrgencyLabel(task) {
  const p = task.priority ?? 4
  if (p === 1) return 'Urgent'
  if (p === 2) return 'High'
  if (p === 3) return 'Med'
  return 'Low'
}

function getImportance(task) {
  const v = getLabel(task, 'importance::')
  return v ? capitalize(v) : null
}

function getTime(task) {
  return getLabel(task, 'time::')
}

function urgencyFromPriority(p) {
  if (p === 1) return 'urgent'
  if (p === 2) return 'high'
  if (p === 3) return 'med'
  return 'low'
}

function priorityFromUrgency(u) {
  if (u === 'urgent') return 1
  if (u === 'high') return 2
  if (u === 'med') return 3
  return 4
}

function formatDeadline(dateStr) {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

// ── Selection ──
function selectTask(task) {
  selectedTask.value = task
  draft.value = {
    urgency: urgencyFromPriority(task.priority ?? 4),
    importance: getLabel(task, 'importance::'),
    time: getLabel(task, 'time::'),
    delegatable: getLabel(task, 'delegatable::'),
    deadline: task.due?.date ?? '',
    notes: task.description ?? '',
  }
}

// ── Save ──
async function saveChanges() {
  if (!selectedTask.value || saving.value) return
  saving.value = true
  try {
    const task = selectedTask.value
    const baseLabels = (task.labels || []).filter(l => !TRIAGE_PREFIXES.some(p => l.startsWith(p)))
    const triageLabels = []
    if (draft.value.importance) triageLabels.push(`importance::${draft.value.importance}`)
    if (draft.value.time) triageLabels.push(`time::${draft.value.time}`)
    if (draft.value.delegatable) triageLabels.push(`delegatable::${draft.value.delegatable}`)
    await store.updateTaskTriage(task.id, {
      priority: priorityFromUrgency(draft.value.urgency),
      labels: [...baseLabels, ...triageLabels],
      dueDate: draft.value.deadline || null,
      description: draft.value.notes,
    })
  } finally {
    saving.value = false
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
