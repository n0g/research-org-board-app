<template>
  <f7-page name="board" class="board-page" no-swipeback>
    <div class="board-screen">
      <AppSidebar current-page="board" @settings="settingsOpen = true" />

      <!-- Board main area -->
      <div ref="screenEl" class="board-main">
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
      </div>
    </div>

    <SettingsSheet
      :open="settingsOpen"
      @close="settingsOpen = false"
    />

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn tab-btn-active" aria-current="page">Board</button>
      <button class="tab-btn" @click="goReviews">Reviews</button>
      <button class="tab-btn" @click="settingsOpen = true">Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { usePullToRefresh } from '../composables/usePullToRefresh.js'
import BoardColumn from '../components/BoardColumn.vue'
import AppSidebar from '../components/AppSidebar.vue'
import SettingsSheet from '../components/SettingsSheet.vue'

const store = useBoardStore()
const screenEl = ref(null)
const ptrIndicator = ref(null)
const settingsOpen = ref(false)
const boardReady = ref(false)

const unassignedProjects = computed(() =>
  store.displayProjects.filter(p => !store.projectStage(p.id))
)

function openProject(project) {
  f7.views.main.router.navigate('/project/' + project.id + '/')
}

function goReviews() {
  f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true })
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
  if (e.key === 'Escape') {
    settingsOpen.value = false
  }
}

onMounted(async () => {
  store.initStages()
  await store.loadData()
  boardReady.value = true
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
