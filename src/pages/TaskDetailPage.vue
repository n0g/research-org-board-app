<template>
  <f7-page name="task-detail" class="task-detail-page">
    <div class="task-detail-main">
      <button class="back-btn" @click="goBack">
        <span class="material-symbols-outlined">arrow_back</span>
        Tasks
      </button>

      <TaskDetailPanel v-if="task" :task="task" @completed="goBack" />
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
import TaskDetailPanel from '../components/TaskDetailPanel.vue'

const props = defineProps({
  f7route: { type: Object, required: true },
})

const store = useBoardStore()
const taskId = computed(() => props.f7route.params.id)
const task = computed(() => store.tasks.find(t => t.id === taskId.value) ?? null)

onMounted(async () => {
  store.initStages()
  await store.loadIfStale()
})

function goBack() { f7.views.main.router.back() }
function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goReviews() { f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }
</script>
