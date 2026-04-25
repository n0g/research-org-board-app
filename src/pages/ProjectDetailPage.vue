<template>
  <f7-page name="project-detail" class="project-page" no-swipeback>
    <div class="project-screen">
      <AppSidebar current-page="board" />

      <div class="project-main">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-expand-btn"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <span class="material-symbols-outlined">side_navigation</span>
        </button>

        <!-- Left metadata pane -->
        <section class="project-meta">
          <button class="back-btn" @click="goBack">
            <span class="material-symbols-outlined">arrow_back</span>
            Board
          </button>

          <h1
            v-if="!editingTitle"
            class="project-title project-title-editable"
            @click="startEditTitle"
          >{{ project?.name ?? 'Loading…' }}</h1>
          <textarea
            v-else
            ref="titleInputEl"
            v-model="titleDraft"
            class="project-title project-title-input"
            rows="2"
            @blur="saveTitle"
            @keydown.meta.enter.prevent="titleInputEl?.blur()"
            @keydown.escape.prevent="cancelTitle"
          ></textarea>

          <!-- Collaborators (first after title) -->
          <div class="meta-section">
            <div class="meta-label">Collaborators</div>
            <div class="collab-chips">
              <span v-for="person in personLabels" :key="person" class="collab-chip">
                <span class="material-symbols-outlined">person</span>
                {{ person }}
              </span>
              <button v-if="!addingCollab" class="collab-add-pill" @click="startAddCollab">+</button>
              <div v-else ref="collabWrapperEl" class="collab-combo-wrapper">
                <input
                  ref="collabInputEl"
                  v-model="collabQuery"
                  class="collab-combo-input"
                  placeholder="Name…"
                  autocomplete="off"
                  @keydown.enter.prevent="commitCollab(collabQuery)"
                  @keydown.escape.prevent="cancelAddCollab"
                >
                <div v-if="filteredCollabs.length" class="popup-dropdown">
                  <button
                    v-for="c in filteredCollabs"
                    :key="c"
                    class="popup-option"
                    @mousedown.prevent
                    @click="commitCollab(c)"
                  >{{ c }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Status -->
          <div class="meta-section">
            <div class="meta-label">Status</div>
            <div
              v-if="!editingStatus"
              class="meta-editable"
              :class="{ placeholder: !statusText }"
              @click="startEdit('status')"
            >{{ statusText || 'Add a status…' }}</div>
            <textarea
              v-else
              ref="statusTextareaEl"
              v-model="statusDraft"
              class="meta-textarea"
              rows="3"
              @blur="saveStatus"
              @keydown.escape.prevent="cancelStatus"
              @keydown.meta.enter.prevent="statusTextareaEl?.blur()"
            ></textarea>
          </div>

          <!-- Stage -->
          <div class="meta-section">
            <div class="meta-label">Pipeline Stage</div>
            <div ref="stageWrapperEl" class="popup-wrapper">
              <button class="popup-btn" @click.stop="stagePopupOpen = !stagePopupOpen">
                <span>{{ stageObj?.name ?? 'Unassigned' }}</span>
                <span class="material-symbols-outlined popup-chevron">expand_more</span>
              </button>
              <div v-if="stagePopupOpen" class="popup-dropdown">
                <button
                  v-for="stage in store.stages"
                  :key="stage.label"
                  class="popup-option"
                  :class="{ selected: stageInfo?.label === stage.label }"
                  @click="selectStage(stage)"
                >{{ stage.name }}</button>
              </div>
            </div>
          </div>

          <!-- Venue + Deadline side by side -->
          <div class="meta-row-pair">
            <!-- Venue (left) -->
            <div class="meta-section">
              <div class="meta-label">Venue</div>
              <div
                v-if="!editingVenue"
                class="meta-editable"
                :class="{ placeholder: !venueText }"
                @click="startEditVenue"
              >{{ venueText || 'Add venue…' }}</div>
              <input
                v-else
                ref="venueInputEl"
                v-model="venueDraft"
                class="meta-input"
                type="text"
                placeholder="e.g. PETS 2026"
                @blur="saveVenue"
                @keydown.enter.prevent="venueInputEl?.blur()"
                @keydown.escape.prevent="cancelVenue"
              >
            </div>

            <!-- Deadline (right) -->
            <div class="meta-section">
              <div class="meta-label">Deadline</div>
              <input
                class="meta-date-visible"
                :class="deadlineDateClass"
                type="date"
                :value="deadlineDateValue"
                @change="onDeadlineChange"
                @keydown.enter.prevent="($event.target).blur()"
              >
            </div>
          </div>

          <!-- Summary -->
          <div class="meta-section">
            <div class="meta-label">Summary</div>
            <div
              v-if="!editingSummary"
              class="meta-editable"
              :class="{ placeholder: !summaryText }"
              @click="startEdit('summary')"
            >{{ summaryText || 'Add a summary…' }}</div>
            <textarea
              v-else
              ref="summaryTextareaEl"
              v-model="summaryDraft"
              class="meta-textarea"
              rows="4"
              @blur="saveSummary"
              @keydown.escape.prevent="cancelSummary"
              @keydown.meta.enter.prevent="summaryTextareaEl?.blur()"
            ></textarea>
          </div>

          <!-- Todoist link + delete -->
          <div v-if="project" class="project-meta-footer">
            <a
              class="todoist-link"
              :href="`https://todoist.com/app/project/${project.id}`"
              target="_blank"
              rel="noopener noreferrer"
            >Open in Todoist ↗</a>
            <button class="project-delete-btn" title="Delete project" aria-label="Delete project" @click="confirmDelete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
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

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn tab-btn-active" aria-current="page" @click="goBoard">Board</button>
      <button class="tab-btn" @click="goReviews">Reviews</button>
      <button class="tab-btn" @click="goSettings">Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'
import { VENUES, stripPersonPrefix, isPersonLabel } from '../lib/helpers.js'

import AppSidebar from '../components/AppSidebar.vue'
import TaskItem from '../components/TaskItem.vue'

const props = defineProps({
  f7route: { type: Object, required: true },
})

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()
const newTaskContent = ref('')

const projectId = computed(() => props.f7route.params.id)
const project = computed(() => store.displayProjects.find(p => p.id === projectId.value) ?? null)
const stageInfo = computed(() => store.projectStage(projectId.value))
const meta = computed(() => store.projectMeta(projectId.value))
const tasks = computed(() => store.projectTasks(projectId.value))
const deadlineTask = computed(() => store.projectDeadlineTaskBase(projectId.value))
const deadline = computed(() => store.projectDeadline(projectId.value))

const stageLabelSet = computed(() => new Set(store.stageLabels))
const stageObj = computed(() => store.stages?.find(s => s.label === stageInfo.value?.label) ?? null)

const personLabels = computed(() =>
  stageInfo.value
    ? (stageInfo.value.task.labels || [])
        .filter(l => !stageLabelSet.value.has(l) && !VENUES.includes(l.toLowerCase()) && isPersonLabel(l))
        .map(stripPersonPrefix)
    : []
)

// ── Deadline ──
const deadlineDateValue = computed(() => {
  if (!deadline.value) return ''
  const d = deadline.value
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const deadlineDateClass = computed(() => {
  if (!deadline.value) return ''
  const diff = deadline.value.getTime() - Date.now()
  if (diff < 0) return 'overdue-text'
  if (diff < 7 * 86400000) return 'due-soon-text'
  return ''
})

async function onDeadlineChange(e) {
  await store.setDeadlineDate(projectId.value, e.target.value).catch(console.error)
}

// ── Venue ──
const venueText = computed(() => deadlineTask.value?.content ?? '')
const editingVenue = ref(false)
const venueDraft = ref('')
const venueInputEl = ref(null)

async function startEditVenue() {
  venueDraft.value = venueText.value
  editingVenue.value = true
  await nextTick()
  venueInputEl.value?.focus()
  venueInputEl.value?.select()
}

async function saveVenue() {
  editingVenue.value = false
  const val = venueDraft.value.trim()
  if (val !== venueText.value) {
    await store.updateVenue(projectId.value, val).catch(console.error)
  }
}

function cancelVenue() { editingVenue.value = false }

// ── Title ──
const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref(null)

async function startEditTitle() {
  if (!project.value) return
  titleDraft.value = project.value.name
  editingTitle.value = true
  await nextTick()
  titleInputEl.value?.focus()
  titleInputEl.value?.select()
}

async function saveTitle() {
  editingTitle.value = false
  const val = titleDraft.value.trim()
  if (val && val !== project.value?.name) {
    await store.renameProject(projectId.value, val).catch(console.error)
  }
}

function cancelTitle() { editingTitle.value = false }

// ── Status ──
const statusText = computed(() => stageInfo.value?.task.content ?? '')
const editingStatus = ref(false)
const statusDraft = ref('')
const statusTextareaEl = ref(null)

async function startEdit(field) {
  if (field === 'status') {
    statusDraft.value = statusText.value
    editingStatus.value = true
    await nextTick()
    statusTextareaEl.value?.focus()
    statusTextareaEl.value?.select()
  } else {
    summaryDraft.value = summaryText.value
    editingSummary.value = true
    await nextTick()
    summaryTextareaEl.value?.focus()
    summaryTextareaEl.value?.select()
  }
}

async function saveStatus() {
  editingStatus.value = false
  const val = statusDraft.value.trim() || statusText.value
  if (val !== statusText.value && stageInfo.value) {
    await store.updateStatusText(stageInfo.value.task.id, val).catch(console.error)
  }
}
function cancelStatus() { editingStatus.value = false }

// ── Summary (Todoist 📌 Summary section) ──
const summaryText = computed(() => store.projectSummaryTask(projectId.value)?.content ?? '')
const editingSummary = ref(false)
const summaryDraft = ref('')
const summaryTextareaEl = ref(null)

async function saveSummary() {
  editingSummary.value = false
  const val = summaryDraft.value.trim()
  if (val !== summaryText.value) {
    await store.updateSummary(projectId.value, val).catch(console.error)
  }
}
function cancelSummary() { editingSummary.value = false }

// ── Stage popup ──
const stageWrapperEl = ref(null)
const stagePopupOpen = ref(false)

async function selectStage(stage) {
  stagePopupOpen.value = false
  if (!stageInfo.value || stageInfo.value.label === stage.label) return
  await store.moveStage(projectId.value, stageInfo.value.task.id, stageInfo.value.label, stage.label).catch(console.error)
}

// ── Collaborator combo ──
const addingCollab = ref(false)
const collabQuery = ref('')
const collabInputEl = ref(null)
const collabWrapperEl = ref(null)

const filteredCollabs = computed(() => {
  const q = collabQuery.value.toLowerCase()
  const existing = new Set(personLabels.value)
  return store.allCollaborators
    .filter(c => !existing.has(c) && (!q || c.toLowerCase().includes(q)))
    .slice(0, 8)
})

async function startAddCollab() {
  addingCollab.value = true
  collabQuery.value = ''
  await nextTick()
  collabInputEl.value?.focus()
}

async function commitCollab(name) {
  const trimmed = name.trim()
  if (trimmed && !personLabels.value.includes(trimmed)) {
    await store.addCollaborator(projectId.value, trimmed).catch(console.error)
  }
  cancelAddCollab()
}

function cancelAddCollab() {
  addingCollab.value = false
  collabQuery.value = ''
}

// Close popups on outside click
function onDocClick(e) {
  if (!stageWrapperEl.value?.contains(e.target)) stagePopupOpen.value = false
  if (!collabWrapperEl.value?.contains(e.target)) cancelAddCollab()
}

// ── Tasks ──
async function addTask() {
  const content = newTaskContent.value.trim()
  if (!content || !project.value) return
  newTaskContent.value = ''
  await store.quickAddTask(content, project.value.id).catch(console.error)
}

// ── Delete project ──
async function confirmDelete() {
  if (!project.value) return
  if (!window.confirm(`Delete "${project.value.name}"? This cannot be undone.`)) return
  await store.deleteProject(projectId.value).catch(console.error)
  f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
}

// ── Navigation ──
function goBack() { f7.views.main.router.back() }
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goReviews() { f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }

onMounted(async () => {
  document.addEventListener('click', onDocClick)
  store.initStages()
  await store.loadIfStale()
})

onUnmounted(() => {
  document.removeEventListener('click', onDocClick)
})
</script>
