<template>
  <f7-page name="board" class="board-page" no-swipeback>
    <div class="board-screen">
      <!-- Sidebar: desktop only -->
      <aside class="board-sidebar" :class="{ collapsed: sidebarCollapsed }">
        <div class="sidebar-brand">
          <span class="sidebar-brand-name">Research Board</span>
          <button
            class="sidebar-collapse-btn"
            :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
            @click="toggleSidebar"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <rect x="1.5" y="2" width="13" height="12" rx="1.5" stroke="currentColor" stroke-width="1.25"/>
              <path d="M5.5 2v12" stroke="currentColor" stroke-width="1.25"/>
            </svg>
          </button>
        </div>

        <nav class="sidebar-nav">
          <div class="sidebar-nav-item sidebar-nav-active" title="Board">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0">
              <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
              <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
            </svg>
            <span class="sidebar-label">Board</span>
          </div>
          <button class="sidebar-nav-item" title="Reviews" @click="goReviews">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0">
              <path d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9z" stroke="currentColor" stroke-width="1.25"/>
              <path d="M5 5.5h6M5 8h6M5 10.5h4" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
            <span class="sidebar-label">Reviews</span>
          </button>
        </nav>

        <template v-if="store.allCollaborators.length">
          <div class="sidebar-section-label">Collaborators</div>
          <button
            v-for="person in store.allCollaborators"
            :key="person"
            class="sidebar-nav-item"
            :class="{ 'sidebar-filter-active': store.activeFilter?.type === 'person' && store.activeFilter?.value === person }"
            :title="person"
            @click="store.setFilter('person', person)"
          >
            <span class="sidebar-avatar" aria-hidden="true">{{ person.slice(0, 2).toUpperCase() }}</span>
            <span class="sidebar-label">{{ person }}</span>
          </button>
        </template>

        <template v-if="store.allVenues.length">
          <div class="sidebar-section-label">Venues</div>
          <button
            v-for="venue in store.allVenues"
            :key="venue"
            class="sidebar-nav-item"
            :class="{ 'sidebar-filter-active': store.activeFilter?.type === 'venue' && store.activeFilter?.value === venue }"
            :title="venue"
            @click="store.setFilter('venue', venue)"
          >
            <span class="sidebar-venue-dot" aria-hidden="true"></span>
            <span class="sidebar-label">{{ venue }}</span>
          </button>
        </template>

        <div class="sidebar-footer">
          <button class="sidebar-nav-item" title="Settings" @click="settingsOpen = true">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style="flex-shrink:0">
              <circle cx="8" cy="8" r="2.25" stroke="currentColor" stroke-width="1.25"/>
              <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.93 2.93l1.06 1.06M12.01 12.01l1.06 1.06M2.93 13.07l1.06-1.06M12.01 3.99l1.06-1.06" stroke="currentColor" stroke-width="1.25" stroke-linecap="round"/>
            </svg>
            <span class="sidebar-label">Settings</span>
          </button>
          <div class="sidebar-last-updated" aria-live="polite">{{ lastUpdatedText }}</div>
        </div>
      </aside>

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

    <ProjectModal
      :project="activeProject"
      :open="!!activeProject"
      @close="closeProject"
    />

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
import ProjectModal from '../components/ProjectModal.vue'
import SettingsSheet from '../components/SettingsSheet.vue'

const store = useBoardStore()
const screenEl = ref(null)
const ptrIndicator = ref(null)
const activeProject = ref(null)
const settingsOpen = ref(false)
const boardReady = ref(false)
const sidebarCollapsed = ref(localStorage.getItem('rb_sidebar_collapsed') === '1')

function toggleSidebar() {
  sidebarCollapsed.value = !sidebarCollapsed.value
  localStorage.setItem('rb_sidebar_collapsed', sidebarCollapsed.value ? '1' : '0')
}

const lastUpdatedText = computed(() =>
  store.lastUpdated ? `Updated ${store.lastUpdated.toLocaleTimeString()}` : ''
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
    activeProject.value = null
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
