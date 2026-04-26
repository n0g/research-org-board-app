<template>
  <aside class="board-sidebar" :class="{ collapsed: sidebarCollapsed }">
    <!-- Brand header -->
    <div class="sidebar-brand">
      <span class="sidebar-brand-name sidebar-label">Research Projects</span>
      <button
        class="sidebar-collapse-btn"
        :title="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-label="sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        @click="toggleSidebar"
      >
        <span class="material-symbols-outlined">side_navigation</span>
      </button>
    </div>

    <!-- Nav items -->
    <nav class="sidebar-nav">
      <div
        class="sidebar-nav-item"
        :class="currentPage === 'board' ? 'sidebar-nav-active' : ''"
        :role="currentPage === 'board' ? 'presentation' : 'button'"
        :tabindex="currentPage === 'board' ? -1 : 0"
        title="Board"
        @click="currentPage !== 'board' && goBoard()"
        @keydown.enter.prevent="currentPage !== 'board' && goBoard()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">dashboard</span>
        <span class="sidebar-label">Board</span>
      </div>

      <button
        class="sidebar-nav-item"
        :class="currentPage === 'reviews' ? 'sidebar-nav-active' : ''"
        title="Reviews"
        @click="currentPage !== 'reviews' && goReviews()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">checklist</span>
        <span class="sidebar-label">Reviews</span>
      </button>

      <button
        class="sidebar-nav-item"
        :class="currentPage === 'tasks' ? 'sidebar-nav-active' : ''"
        title="Tasks"
        @click="currentPage !== 'tasks' && goTasks()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">checklist</span>
        <span class="sidebar-label">Tasks</span>
      </button>

      <div class="sidebar-nav-item sidebar-nav-disabled" title="Schedule (coming soon)">
        <span class="material-symbols-outlined" aria-hidden="true">calendar_today</span>
        <span class="sidebar-label">Schedule</span>
      </div>
    </nav>

    <!-- Custom filters slot (e.g. Reviews page conferences) — hides default collaborators/venues -->
    <slot name="filters" />

    <!-- Collaborators section -->
    <template v-if="!$slots.filters && store.allCollaborators.length">
      <div
        class="sidebar-section-header"
        @click="collabOpen = !collabOpen"
      >
        <span class="sidebar-section-label">Collaborators</span>
        <span
          class="material-symbols-outlined sidebar-section-chevron"
          :class="{ open: collabOpen }"
          aria-hidden="true"
        >keyboard_arrow_down</span>
      </div>
      <template v-if="collabOpen">
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
    </template>

    <!-- Venues section -->
    <template v-if="!$slots.filters && store.allVenues.length">
      <div
        class="sidebar-section-header"
        @click="venuesOpen = !venuesOpen"
      >
        <span class="sidebar-section-label">Venues</span>
        <span
          class="material-symbols-outlined sidebar-section-chevron"
          :class="{ open: venuesOpen }"
          aria-hidden="true"
        >keyboard_arrow_down</span>
      </div>
      <template v-if="venuesOpen">
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
    </template>

    <!-- Footer -->
    <div class="sidebar-footer">
      <button
        class="sidebar-nav-item"
        :class="currentPage === 'settings' ? 'sidebar-nav-active' : ''"
        title="Settings"
        @click="currentPage !== 'settings' && goSettings()"
      >
        <span class="material-symbols-outlined" aria-hidden="true">settings</span>
        <span class="sidebar-label">Settings</span>
      </button>
      <div v-if="lastUpdatedText" class="sidebar-last-updated">{{ lastUpdatedText }}</div>
    </div>
  </aside>
</template>

<script setup>
import { ref, computed } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'

const props = defineProps({
  currentPage: { type: String, default: 'board' },
})
defineEmits([])

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()

const collabOpen = ref(true)
const venuesOpen = ref(true)

const lastUpdatedText = computed(() =>
  store.lastUpdated ? `Updated ${store.lastUpdated.toLocaleTimeString()}` : ''
)

function goBoard() {
  f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
}

function goTasks() {
  f7.views.main.router.navigate('/tasks/', { clearPreviousHistory: true })
}

function goReviews() {
  f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true })
}

function goSettings() {
  f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true })
}
</script>
