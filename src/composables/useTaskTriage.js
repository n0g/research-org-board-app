import { ref, watch, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { parseLocalDate } from '../lib/helpers.js'

export const TABS = [
  { key: 'all', label: 'All' },
  { key: 'quick', label: 'Quick' },
  { key: 'urgent', label: 'Urgent' },
  { key: 'important', label: 'Important' },
]
export const URGENCY_OPTS = [
  { val: 'low', label: 'Low' },
  { val: 'med', label: 'Med' },
  { val: 'high', label: 'High' },
  { val: 'urgent', label: 'Urgent' },
]
export const LEVEL_OPTS = ['low', 'med', 'high']
export const TIME_OPTS = ['15m', '30m', '1h', '2h']
export const TRIAGE_PREFIXES = ['importance::', 'time::', 'delegatable::']

export function getLabel(task, prefix) {
  return (task.labels || []).find(l => l.startsWith(prefix))?.slice(prefix.length) ?? null
}

export function getUrgencyLabel(task) {
  const p = task.priority ?? 1
  if (p === 4) return 'Urgent'
  if (p === 3) return 'High'
  if (p === 2) return 'Med'
  return null
}

export function getImportance(task) {
  const v = getLabel(task, 'importance::')
  return v ? capitalize(v) : null
}

export function getTime(task) {
  return getLabel(task, 'time::')
}

export function urgencyFromPriority(p) {
  if (p === 4) return 'urgent'
  if (p === 3) return 'high'
  if (p === 2) return 'med'
  return 'low'
}

export function priorityFromUrgency(u) {
  if (u === 'urgent') return 4
  if (u === 'high') return 3
  if (u === 'med') return 2
  return 1
}

export function formatDeadline(dateStr) {
  const d = parseLocalDate(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : ''
}

export function useTaskTriage() {
  const store = useBoardStore()
  const draft = ref({ urgency: 'low', importance: null, time: null, delegatable: null, deadline: '', notes: '' })
  const saveStatus = ref('')
  const currentTask = ref(null)

  let saveTimer = null
  let statusTimer = null
  let skipNextWatch = false

  watch(draft, () => {
    if (!currentTask.value || skipNextWatch) { skipNextWatch = false; return }
    clearTimeout(saveTimer)
    saveTimer = setTimeout(saveChanges, 800)
  }, { deep: true })

  onUnmounted(() => {
    clearTimeout(saveTimer)
    clearTimeout(statusTimer)
  })

  function initDraft(task) {
    clearTimeout(saveTimer)
    skipNextWatch = true
    currentTask.value = task
    draft.value = {
      urgency: urgencyFromPriority(task.priority ?? 4),
      importance: getLabel(task, 'importance::'),
      time: getLabel(task, 'time::'),
      delegatable: getLabel(task, 'delegatable::'),
      deadline: task.due?.date ?? '',
      notes: (task.description ?? '').split('\n').filter(l => !l.startsWith('📅 Scheduled:')).join('\n').trimEnd(),
    }
    saveStatus.value = ''
  }

  async function saveChanges() {
    if (!currentTask.value) return
    saveStatus.value = 'Saving…'
    try {
      const task = currentTask.value
      const baseLabels = (task.labels || []).filter(l => !TRIAGE_PREFIXES.some(p => l.startsWith(p)))
      const triageLabels = []
      if (draft.value.importance) triageLabels.push(`importance::${draft.value.importance}`)
      if (draft.value.time) triageLabels.push(`time::${draft.value.time}`)
      if (draft.value.delegatable) triageLabels.push(`delegatable::${draft.value.delegatable}`)
      await store.updateTaskTriage(task.id, {
        priority: priorityFromUrgency(draft.value.urgency),
        labels: [...baseLabels, ...triageLabels],
        dueDate: draft.value.deadline || null,
        description: draft.value.notes,
      })
      saveStatus.value = 'Saved'
      clearTimeout(statusTimer)
      statusTimer = setTimeout(() => { saveStatus.value = '' }, 2000)
    } catch {
      saveStatus.value = 'Error saving'
    }
  }

  return { draft, saveStatus, currentTask, initDraft, saveChanges }
}
