import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api, apiAll } from '../lib/todoist.js'
import {
  DEFAULT_STAGES,
  getProjectStage,
  getProjectMeta,
  getProjectTasks,
  getProjectDeadline,
} from '../lib/helpers.js'

export const useBoardStore = defineStore('board', () => {
  const token = ref(localStorage.getItem('rb_token'))
  const stages = ref(JSON.parse(localStorage.getItem('rb_stages') || 'null'))
  const projects = ref([])
  const tasks = ref([])
  const excludedSectionIds = ref(new Set())
  const deadlineSectionIds = ref(new Set())
  const lastUpdated = ref(null)
  const loading = ref(false)
  const cardDragging = ref(false)
  const labels = ref([])
  const activeFilter = ref(null) // { type: 'person'|'venue', value: string } | null

  const stageLabels = computed(() => (stages.value || []).map(s => s.label))

  const displayProjects = computed(() => {
    const root = projects.value.find(p => !p.parent_id && p.name === 'Research')
    return root ? projects.value.filter(p => p.parent_id === root.id) : projects.value
  })

  const allCollaborators = computed(() => {
    const stageSet = new Set(stageLabels.value)
    const people = new Set()
    displayProjects.value.forEach(p => {
      const stage = getProjectStage(tasks.value, stageLabels.value, p.id)
      if (stage) (stage.task.labels || []).filter(l => !stageSet.has(l)).forEach(l => people.add(l))
    })
    return [...people].sort()
  })

  const allVenues = computed(() => {
    const venues = new Set()
    displayProjects.value.forEach(p => {
      const meta = getProjectMeta(tasks.value, p.id)
      if (meta.venue) venues.add(meta.venue)
    })
    return [...venues].sort()
  })

  function setFilter(type, value) {
    if (activeFilter.value?.type === type && activeFilter.value?.value === value) {
      activeFilter.value = null
    } else {
      activeFilter.value = { type, value }
    }
  }

  function initStages() {
    if (!stages.value) {
      stages.value = DEFAULT_STAGES
      localStorage.setItem('rb_stages', JSON.stringify(DEFAULT_STAGES))
    } else {
      // Migrate: ensure Revision comes before Awaiting Reviews
      const ri = stages.value.findIndex(s => s.label === 'stage::revision')
      const ai = stages.value.findIndex(s => s.label === 'stage::under-submission')
      if (ri !== -1 && ai !== -1 && ri > ai) {
        stages.value.splice(ai, 0, stages.value.splice(ri, 1)[0])
        localStorage.setItem('rb_stages', JSON.stringify(stages.value))
      }
    }
  }

  async function saveToken(val) {
    await api(val, '/projects')
    token.value = val
    localStorage.setItem('rb_token', val)
    if (!stages.value) {
      stages.value = DEFAULT_STAGES
      localStorage.setItem('rb_stages', JSON.stringify(DEFAULT_STAGES))
    }
  }

  function saveStages(newStages) {
    stages.value = newStages
    localStorage.setItem('rb_stages', JSON.stringify(newStages))
  }

  function resetToken() {
    localStorage.removeItem('rb_token')
    localStorage.removeItem('rb_stages')
    token.value = null
    stages.value = null
  }

  async function loadData() {
    loading.value = true
    try {
      const [projectsData, tasksData, sectionsData] = await Promise.all([
        apiAll(token.value, '/projects'),
        apiAll(token.value, '/tasks'),
        apiAll(token.value, '/sections'),
      ])
      projects.value = projectsData
      tasks.value = tasksData
      const EXCLUDED = new Set(['📌 Current Status', '📌 Deadlines'])
      excludedSectionIds.value = new Set(sectionsData.filter(s => EXCLUDED.has(s.name)).map(s => s.id))
      deadlineSectionIds.value = new Set(sectionsData.filter(s => s.name === '📌 Deadlines').map(s => s.id))
      lastUpdated.value = new Date()
    } finally {
      loading.value = false
    }
  }

  function projectStage(projectId) {
    return getProjectStage(tasks.value, stageLabels.value, projectId)
  }

  function projectMeta(projectId) {
    return getProjectMeta(tasks.value, projectId)
  }

  function projectTasks(projectId) {
    return getProjectTasks(tasks.value, stageLabels.value, excludedSectionIds.value, projectId)
  }

  function projectDeadline(projectId) {
    return getProjectDeadline(tasks.value, deadlineSectionIds.value, projectId)
  }

  async function moveStage(projectId, oldTaskId, oldLabel, newLabel) {
    if (oldLabel === newLabel) return
    if (!oldTaskId) throw new Error('No stage task found for this project.')
    const task = tasks.value.find(t => t.id === oldTaskId)
    if (task) {
      const newLabels = (task.labels || []).filter(l => l !== oldLabel).concat(newLabel)
      await api(token.value, `/tasks/${oldTaskId}`, 'POST', { labels: newLabels })
      task.labels = newLabels
    }
  }

  async function completeTask(taskId) {
    await api(token.value, `/tasks/${taskId}/close`, 'POST')
    tasks.value = tasks.value.filter(t => t.id !== taskId)
  }

  async function quickAddTask(content, projectId) {
    const task = await api(token.value, '/tasks', 'POST', { content, project_id: projectId })
    tasks.value.push(task)
  }

  async function updateTaskDue(taskId, dateVal) {
    const body = dateVal ? { due_date: dateVal } : { due_string: 'no due date' }
    await api(token.value, `/tasks/${taskId}`, 'POST', body)
    const task = tasks.value.find(t => t.id === taskId)
    if (task) task.due = dateVal ? { date: dateVal } : null
  }

  async function updateStatusText(taskId, content) {
    await api(token.value, `/tasks/${taskId}`, 'POST', { content })
    const task = tasks.value.find(t => t.id === taskId)
    if (task) task.content = content
  }

  return {
    token, stages, projects, tasks, loading, lastUpdated, cardDragging, labels,
    activeFilter, stageLabels, displayProjects, excludedSectionIds, deadlineSectionIds,
    allCollaborators, allVenues,
    initStages, saveToken, saveStages, resetToken, loadData,
    projectStage, projectMeta, projectTasks, projectDeadline,
    moveStage, completeTask, quickAddTask, updateTaskDue, updateStatusText, setFilter,
  }
})
