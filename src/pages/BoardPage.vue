<template>
  <f7-page name="board" class="board-page" no-swipeback>
    <f7-navbar class="board-navbar">
      <f7-nav-left>
        <h1 class="board-title">Research Board</h1>
      </f7-nav-left>
      <f7-nav-right>
        <span class="last-updated" aria-live="polite">{{ lastUpdatedText }}</span>
        <button
          class="btn icon"
          title="Toggle theme"
          aria-label="Toggle theme"
          @click="cycleTheme"
        >{{ themeIcon }}</button>
        <button
          class="btn icon"
          title="Settings"
          aria-label="Settings"
          @click="settingsOpen = true"
        >⚙</button>
      </f7-nav-right>
    </f7-navbar>

    <div ref="screenEl" class="board-screen">
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

    <ProjectModal
      :project="activeProject"
      :open="!!activeProject"
      @close="closeProject"
    />

    <SettingsSheet
      :open="settingsOpen"
      @close="settingsOpen = false"
    />
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { useTheme } from '../composables/useTheme.js'
import { usePullToRefresh } from '../composables/usePullToRefresh.js'
import BoardColumn from '../components/BoardColumn.vue'
import ProjectModal from '../components/ProjectModal.vue'
import SettingsSheet from '../components/SettingsSheet.vue'

const store = useBoardStore()
const screenEl = ref(null)
const ptrIndicator = ref(null)
const activeProject = ref(null)
const settingsOpen = ref(false)
const boardReady = ref(false)

const { themeIcon, cycleTheme } = useTheme()

const lastUpdatedText = computed(() =>
  store.lastUpdated ? `updated ${store.lastUpdated.toLocaleTimeString()}` : ''
)

const unassignedProjects = computed(() =>
  store.displayProjects.filter(p => !store.projectStage(p.id))
)

function openProject(project) {
  activeProject.value = project
}

function closeProject() {
  activeProject.value = null
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
    activeProject.value = null
    settingsOpen.value = false
  }
}

onMounted(async () => {
  store.initStages()
  await store.loadData()
  boardReady.value = true
  // Scroll to stage from URL param (shortcut)
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
