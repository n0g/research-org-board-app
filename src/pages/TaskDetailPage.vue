<template>
  <f7-page name="task-detail" class="task-detail-page">
    <div class="task-detail-main">
      <button class="back-btn" @click="goBack">
        <span class="material-symbols-outlined">arrow_back</span>
        Tasks
      </button>

      <div v-if="task" class="triage-detail-inner">
        <header class="triage-detail-header">
          <div class="triage-detail-header-top">
            <div class="triage-project-badge">{{ projectName }}</div>
            <span class="triage-save-status" :class="{ visible: saveStatus }">{{ saveStatus }}</span>
          </div>
          <h2 class="triage-detail-title">{{ task.content }}</h2>
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
        </div>
      </div>

      <div v-else class="triage-no-selection">
        <span class="material-symbols-outlined">checklist</span>
        <p>Task not found</p>
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
import { computed, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useTaskTriage, URGENCY_OPTS, LEVEL_OPTS, TIME_OPTS, capitalize } from '../composables/useTaskTriage.js'

const props = defineProps({
  f7route: { type: Object, required: true },
})

const store = useBoardStore()
const { draft, saveStatus, initDraft } = useTaskTriage()

const taskId = computed(() => props.f7route.params.id)
const task = computed(() => store.tasks.find(t => t.id === taskId.value) ?? null)
const projectName = computed(() => store.displayProjects.find(p => p.id === task.value?.project_id)?.name ?? '')

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
  if (task.value) initDraft(task.value)
})

function goBack() { f7.views.main.router.back() }
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goReviews() { f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }
</script>
