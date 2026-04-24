export const DEFAULT_STAGES = [
  { name: 'Planning',         label: 'stage::planning' },
  { name: 'Data Collection',  label: 'stage::data-collection' },
  { name: 'Preparing',        label: 'stage::preparing-to-submit' },
  { name: 'Revision',         label: 'stage::revision' },
  { name: 'Awaiting Reviews', label: 'stage::under-submission' },
  { name: 'On Ice',           label: 'stage::on-ice' },
]

const VENUES = ['ccs', 'usenix', 'ndss', 's&p', 'soups', 'chi', 'cscw', 'pets', 'popets']

export function getProjectStage(tasks, stageLabels, projectId) {
  const stageLabelSet = new Set(stageLabels)
  for (const t of tasks) {
    if (t.project_id !== projectId) continue
    const sl = (t.labels || []).find(l => stageLabelSet.has(l))
    if (sl) return { task: t, label: sl }
  }
  return null
}

export function getProjectMeta(tasks, projectId) {
  let venue = null, author = null
  for (const t of tasks) {
    if (t.project_id !== projectId) continue
    const n = t.content.toLowerCase()
    for (const v of VENUES) {
      if (n.includes(v)) { venue = v.toUpperCase(); break }
    }
    if (n.startsWith('author:') || n.startsWith('first author:')) {
      author = t.content.split(':')[1].trim().split(' ')[0]
    }
    for (const l of (t.labels || [])) {
      for (const v of VENUES) {
        if (l.toLowerCase() === v) { venue = v.toUpperCase(); break }
      }
    }
  }
  return { venue, author }
}

export function getProjectTasks(tasks, stageLabels, excludedSectionIds, projectId) {
  const stageLabelSet = new Set(stageLabels)
  return tasks
    .filter(t => {
      if (t.project_id !== projectId) return false
      if (t.is_completed) return false
      if ((t.labels || []).some(l => stageLabelSet.has(l))) return false
      if (excludedSectionIds.has(t.section_id)) return false
      return true
    })
    .sort((a, b) => (a.priority || 4) - (b.priority || 4))
}

export function getProjectDeadline(tasks, deadlineSectionIds, projectId) {
  const deadlineTasks = tasks.filter(
    t => t.project_id === projectId && deadlineSectionIds.has(t.section_id) && !t.is_completed && t.due
  )
  if (!deadlineTasks.length) return null
  const dates = deadlineTasks.map(t => new Date(t.due.date)).sort((a, b) => a - b)
  const future = dates.filter(d => d > Date.now())
  return future.length ? future[0] : dates[dates.length - 1]
}

export function nearestDue(tasks) {
  let nearest = null
  for (const t of tasks) {
    if (!t.due) continue
    const d = new Date(t.due.date).getTime()
    if (!nearest || d < nearest) nearest = d
  }
  return nearest
}

export function dueStatus(dateMs) {
  const diff = dateMs - Date.now()
  if (diff < 0) return 'overdue'
  if (diff < 7 * 86400000) return 'due-soon'
  return 'ok'
}

export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
