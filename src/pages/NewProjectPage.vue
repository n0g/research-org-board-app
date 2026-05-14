<template>
  <f7-page name="new-project" class="project-page">
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
          <i class="ph ph-sidebar-simple" aria-hidden="true"></i>
        </button>

        <section class="project-meta">
          <button class="back-btn" @click="goBack">
            <i class="ph ph-arrow-left" aria-hidden="true"></i>
            Board
          </button>

          <textarea
            ref="titleInputEl"
            v-model="titleDraft"
            class="project-title project-title-input"
            rows="2"
            placeholder="Project title…"
            :disabled="creating"
            @keydown.enter.prevent="create"
            @keydown.meta.enter.prevent="create"
            @keydown.escape.prevent="goBack"
          ></textarea>

          <p class="new-project-hint">
            <span v-if="creating">Creating project…</span>
            <span v-else-if="errorMsg" class="new-project-error">{{ errorMsg }}</span>
            <span v-else>Press Enter to create</span>
          </p>
        </section>

        <section class="project-tasks">
          <div class="tasks-header">
            <div class="tasks-title">Project Tasks</div>
            <div class="tasks-subtitle">0 open tasks</div>
          </div>
          <div class="no-tasks">Create the project to add tasks</div>
        </section>
      </div>
    </div>

  </f7-page>
</template>

<script setup>
import { ref, nextTick, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'
import AppSidebar from '../components/AppSidebar.vue'

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()

const titleInputEl = ref(null)
const titleDraft = ref('')
const creating = ref(false)
const errorMsg = ref('')

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
  await nextTick()
  titleInputEl.value?.focus()
})

async function create() {
  const name = titleDraft.value.trim()
  if (!name || creating.value) return
  creating.value = true
  errorMsg.value = ''
  try {
    const project = await store.createProject(name)
    f7.view.current.router.navigate(`/project/${project.id}/`, { reloadCurrent: true })
  } catch (e) {
    errorMsg.value = 'Failed to create project. Please try again.'
    creating.value = false
  }
}

function goBack()     { f7.view.current.router.back() }
function goBoard()    { f7.tab.show('#view-board') }
function goSettings() { f7.tab.show('#view-settings') }
</script>
