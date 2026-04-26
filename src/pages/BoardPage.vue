<template>
  <f7-page name="board" class="board-page" no-swipeback>
    <div class="board-screen">
      <AppSidebar current-page="board" />

      <!-- Board main area -->
      <div ref="screenEl" class="board-main">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-expand-btn"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <span class="material-symbols-outlined">side_navigation</span>
        </button>
        <div ref="ptrIndicator" class="ptr-indicator" aria-hidden="true"></div>

        <div v-if="store.loading && !boardReady" class="board-loading" role="status">
          <span class="sr-only">Loading board</span>
          <div class="board-spinner"></div>
        </div>

        <div class="board" role="main" :aria-busy="store.loading">
          <BoardColumn
            v-for="(stage, idx) in store.stages"
            :key="stage.label"
            :stage="stage"
            :stage-index="idx"
            @card-click="openProject"
          />
          <BoardColumn
            v-if="unassignedProjects.length"
            :stage="{ name: 'Unassigned', label: '' }"
            :stage-index="99"
            :override-projects="unassignedProjects"
            @card-click="openProject"
          />
        </div>

        <button class="fab-new-project" title="New project" aria-label="New project" @click="openNewProject">
          <span class="material-symbols-outlined">add</span>
        </button>
      </div>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn tab-btn-active" aria-current="page">Board</button>
      <button class="tab-btn" @click="goTasks">Tasks</button>
      <button class="tab-btn" @click="goReviews">Reviews</button>
      <button class="tab-btn" @click="goSettings">Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useReviewsStore } from '../stores/reviews.js'
import { usePullToRefresh } from '../composables/usePullToRefresh.js'
import { useSidebar } from '../composables/useSidebar.js'
import BoardColumn from '../components/BoardColumn.vue'
import AppSidebar from '../components/AppSidebar.vue'

const store = useBoardStore()
const reviewsStore = useReviewsStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()
const screenEl = ref(null)
const ptrIndicator = ref(null)
const boardReady = ref(false)

const unassignedProjects = computed(() =>
  store.displayProjects.filter(p => !store.projectStage(p.id))
)

function openProject(project) {
  f7.views.main.router.navigate('/project/' + project.id + '/')
}

function openNewProject() {
  f7.views.main.router.navigate('/project/new/')
}

function goTasks() { f7.views.main.router.navigate('/tasks/', { clearPreviousHistory: true }) }
function goReviews() {
  f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true })
}

function goSettings() {
  f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true })
}

usePullToRefresh(
  () => screenEl.value,
  () => ptrIndicator.value,
  () => store.loadData(),
  () => store.cardDragging
)

function onKeyDown(e) {
  if (e.key === 'r' && !e.metaKey && !e.ctrlKey && document.activeElement.tagName !== 'INPUT') {
    store.loadData()
  }
}

function triggerSubmissionStatuses() {
  const items = store.displayProjects.map(p => ({
    id: p.id,
    submissionUrl: store.projectSubmissionTask(p.id)?.content?.trim() || '',
  }))
  reviewsStore.loadSubmissionStatuses(items)
}

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
  boardReady.value = true
  triggerSubmissionStatuses()
  const label = new URLSearchParams(location.search).get('stage')
  if (label && store.stages) {
    const idx = store.stages.findIndex(s => s.label === label)
    if (idx !== -1) {
      const col = document.querySelector(`.col[data-stage="${idx}"]`)
      if (col) col.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    }
  }
  document.addEventListener('keydown', onKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>
