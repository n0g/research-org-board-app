<template>
  <f7-page name="inbox" class="inbox-page" no-swipeback>
    <div class="inbox-screen">
      <AppSidebar current-page="inbox" />

      <div class="inbox-main" :class="{ 'inbox-main-collapsed': sidebarCollapsed }">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-expand-btn"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <i class="ph ph-sidebar-simple" aria-hidden="true"></i>
        </button>

        <div class="project-tasks inbox-tasks-pane">
          <div class="tasks-header">
            <div class="tasks-title">
              <i class="ph ph-tray" aria-hidden="true"></i>
              Inbox
            </div>
            <div class="tasks-subtitle">{{ inboxTasks.length }} task{{ inboxTasks.length !== 1 ? 's' : '' }}</div>
          </div>

          <div role="list" aria-label="Inbox tasks">
            <TaskItem v-for="task in inboxTasks" :key="task.id" :task="task" />
          </div>

          <!-- Quick-add -->
          <div class="task-quick-add-wrap" :class="{ 'task-quick-add-wrap-sep': inboxTasks.length }">
            <div
              v-if="!addingTask"
              class="task-quick-add-row"
              role="button"
              tabindex="0"
              @click="startAdd"
              @keydown.enter.prevent="startAdd"
              @keydown.space.prevent="startAdd"
            >
              <div class="task-handle-spacer" aria-hidden="true"></div>
              <div class="task-quick-add-btn" aria-hidden="true"><i class="ph ph-plus"></i></div>
              <span class="task-quick-add-label">Add task</span>
            </div>
            <div v-else class="task-quick-add-row task-quick-add-editing">
              <div class="task-handle-spacer" aria-hidden="true"></div>
              <div class="task-quick-add-btn" aria-hidden="true"><i class="ph ph-plus"></i></div>
              <input
                ref="quickAddInputEl"
                v-model="newTaskContent"
                class="quick-add-input"
                type="text"
                placeholder="Task name"
                @keydown.enter.prevent="submitAdd"
                @keydown.escape.stop="cancelAdd"
                @blur="onAddBlur"
              >
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppTabbar current-tab="inbox" />
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'
import AppSidebar from '../components/AppSidebar.vue'
import AppTabbar from '../components/AppTabbar.vue'
import TaskItem from '../components/TaskItem.vue'

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()

const addingTask = ref(false)
const newTaskContent = ref('')
const quickAddInputEl = ref(null)

const inboxTasks = computed(() =>
  store.tasks.filter(t => t.project_id === store.inboxProjectId && !t.is_completed)
)

function startAdd() {
  addingTask.value = true
  nextTick(() => quickAddInputEl.value?.focus())
}

async function submitAdd() {
  const content = newTaskContent.value.trim()
  if (content && store.inboxProjectId) {
    await store.quickAddTask(content, store.inboxProjectId).catch(console.error)
  }
  newTaskContent.value = ''
  addingTask.value = false
}

function cancelAdd() {
  newTaskContent.value = ''
  addingTask.value = false
}

function onAddBlur() {
  setTimeout(() => { if (addingTask.value) cancelAdd() }, 150)
}

onMounted(async () => {
  await store.loadIfStale()
})
</script>
