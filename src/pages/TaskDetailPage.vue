<template>
  <f7-page name="task-detail" class="task-detail-page">
    <div
      class="task-detail-main"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="task-detail-topbar">
        <button class="back-btn" @click="goBack">
          <span class="material-symbols-outlined">arrow_back</span>
          Tasks
        </button>
        <div class="task-nav-bar">
          <button class="task-nav-btn" :disabled="!prevTaskId" aria-label="Previous task" @click="goPrev">
            <span class="material-symbols-outlined">chevron_left</span>
          </button>
          <span class="task-nav-count">{{ taskIndex + 1 }} / {{ taskIds.length }}</span>
          <button class="task-nav-btn" :disabled="!nextTaskId" aria-label="Next task" @click="goNext">
            <span class="material-symbols-outlined">chevron_right</span>
          </button>
        </div>
      </div>

      <TaskDetailPanel v-if="task" :task="task" @completed="goNext" />
      <div v-else class="triage-no-selection">
        <span class="material-symbols-outlined">checklist</span>
        <p>Task not found</p>
      </div>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard"><span class="material-symbols-outlined">dashboard</span>Board</button>
      <button class="tab-btn tab-btn-active" aria-current="page"><span class="material-symbols-outlined">checklist</span>Tasks</button>
      <button class="tab-btn" @click="goSchedule"><span class="material-symbols-outlined">calendar_today</span>Schedule</button>
      <button class="tab-btn" @click="goSettings"><span class="material-symbols-outlined">settings</span>Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import TaskDetailPanel from '../components/TaskDetailPanel.vue'

const props = defineProps({
  f7route: { type: Object, required: true },
})

const store = useBoardStore()
const taskId = computed(() => props.f7route.params.id)
const task = computed(() => store.tasks.find(t => t.id === taskId.value) ?? null)

// Ordered task IDs from the triage list (set when navigating here from TaskTriagePage)
const taskIds = computed(() =>
  store.triageTaskIds.length ? store.triageTaskIds : store.tasks.filter(t => !t.is_completed).map(t => t.id)
)
const taskIndex = computed(() => taskIds.value.indexOf(taskId.value))
const prevTaskId = computed(() => taskIndex.value > 0 ? taskIds.value[taskIndex.value - 1] : null)
const nextTaskId = computed(() => taskIndex.value < taskIds.value.length - 1 ? taskIds.value[taskIndex.value + 1] : null)

function goNext() {
  if (nextTaskId.value) f7.views.main.router.navigate(`/tasks/${nextTaskId.value}/`, { reloadCurrent: true })
  else goBack()
}
function goPrev() {
  if (prevTaskId.value) f7.views.main.router.navigate(`/tasks/${prevTaskId.value}/`, { reloadCurrent: true })
}

// ── Swipe gesture ──
let swipeX = 0
let swipeY = 0

function onTouchStart(e) {
  swipeX = e.touches[0].clientX
  swipeY = e.touches[0].clientY
}

function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - swipeX
  const dy = e.changedTouches[0].clientY - swipeY
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) {
    if (dx < 0) goNext()
    else goPrev()
  }
}

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
})

function goBack() { f7.views.main.router.back() }
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goSchedule() { f7.views.main.router.navigate('/schedule/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }
</script>
