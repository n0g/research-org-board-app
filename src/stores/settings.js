import { defineStore } from 'pinia'
import { ref } from 'vue'
import { api, apiAll } from '../lib/todoist.js'

const SETTINGS_PROJECT = 'Research Runway Settings'
const SETTINGS_TASK = 'app-settings'

export const useSettingsStore = defineStore('settings', () => {
  const _projectId = ref(null)
  const _taskId = ref(null)
  const _cache = ref(null)

  async function _findProject(token) {
    if (_projectId.value) return _projectId.value
    const projects = await apiAll(token, '/projects')
    const proj = projects.find(p => p.name === SETTINGS_PROJECT && !p.parent_id)
    if (!proj) return null
    _projectId.value = proj.id
    return proj.id
  }

  async function load(token) {
    if (!token) return {}
    try {
      const projectId = await _findProject(token)
      if (!projectId) return {}
      const res = await api(token, `/tasks?project_id=${projectId}`)
      const tasks = Array.isArray(res) ? res : (res.results || [])
      const task = tasks.find(t => t.content === SETTINGS_TASK) ?? tasks[0] ?? null
      if (!task) return {}
      _taskId.value = task.id
      const parsed = task.description ? JSON.parse(task.description) : {}
      _cache.value = parsed
      return parsed
    } catch (e) {
      console.warn('[settings] load failed:', e.message)
      return {}
    }
  }

  async function save(token, key, value) {
    if (!token) return
    try {
      const projectId = await _findProject(token)
      if (!projectId) return
      _cache.value = { ...(_cache.value || {}), [key]: value }
      const description = JSON.stringify(_cache.value)
      if (_taskId.value) {
        await api(token, `/tasks/${_taskId.value}`, 'POST', { description })
      } else {
        const task = await api(token, '/tasks', 'POST', {
          content: SETTINGS_TASK,
          description,
          project_id: projectId,
        })
        _taskId.value = task.id
      }
    } catch (e) {
      console.warn('[settings] save failed:', e.message)
    }
  }

  return { load, save }
})
