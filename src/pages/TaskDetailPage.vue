<template>
  <f7-page name="task-detail" class="task-detail-page">
    <div
      class="task-detail-main"
      @touchstart.passive="onTouchStart"
      @touchend.passive="onTouchEnd"
    >
      <div class="task-detail-topbar">
        <button class="back-btn" @click="goBack">
          <i class="ph ph-arrow-left" aria-hidden="true"></i>
          Tasks
        </button>
        <div class="task-nav-bar">
          <button class="task-nav-btn" :disabled="!prevId" aria-label="Previous task" @click="goPrev">
            <i class="ph ph-caret-left" aria-hidden="true"></i>
          </button>
          <span class="task-nav-count">{{ currentIndex + 1 }} / {{ taskIds.length }}</span>
          <button class="task-nav-btn" :disabled="!nextId" aria-label="Next task" @click="goNext">
            <i class="ph ph-caret-right" aria-hidden="true"></i>
          </button>
        </div>
      </div>

      <TaskDetailPanel v-if="task" :task="task" @completed="goNext" />
      <div v-else class="triage-no-selection">
        <i class="ph ph-list-checks" aria-hidden="true"></i>
        <p>Task not found</p>
      </div>
    </div>

  </f7-page>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useTabbar } from '../composables/useTabbar.js'
import TaskDetailPanel from '../components/TaskDetailPanel.vue'

const props = defineProps({
  f7route: { type: Object, required: true },
})

const store = useBoardStore()

// On entry, seed triageCurrentId from the URL param
const urlTaskId = computed(() => props.f7route.params.id)

// Ordered task list from the triage page (set before navigating here)
const taskIds = computed(() =>
  store.triageTaskIds.length ? store.triageTaskIds : store.tasks.filter(t => !t.is_completed).map(t => t.id)
)

// Current task ID — driven by store so next/prev can update it without router involvement
const currentId = computed(() => store.triageCurrentId || urlTaskId.value)
const currentIndex = computed(() => taskIds.value.indexOf(currentId.value))
const prevId = computed(() => currentIndex.value > 0 ? taskIds.value[currentIndex.value - 1] : null)
const nextId = computed(() => currentIndex.value < taskIds.value.length - 1 ? taskIds.value[currentIndex.value + 1] : null)

const task = computed(() => store.tasks.find(t => t.id === currentId.value) ?? null)

function goNext() {
  if (nextId.value) store.triageCurrentId = nextId.value
  else goBack()
}
function goPrev() {
  if (prevId.value) store.triageCurrentId = prevId.value
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
  if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
    if (dx < 0) goNext()
    else goPrev()
  }
}

const { hide: hideTabbar, show: showTabbar } = useTabbar()

onMounted(async () => {
  hideTabbar()
  store.triageCurrentId = urlTaskId.value
  store.initStages()
  await store.loadIfStale()
})

onBeforeUnmount(showTabbar)

function goBack() { f7.view.current.router.back() }
</script>
