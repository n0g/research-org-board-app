import { defineStore } from 'pinia'
import { ref } from 'vue'
import { fetchReviewPapers } from '../lib/hotcrp.js'

const SITES_KEY = 'rb_hotcrp_sites'
const PROXY_KEY = 'rb_hotcrp_proxy'

export const useReviewsStore = defineStore('reviews', () => {
  const sites = ref(JSON.parse(localStorage.getItem(SITES_KEY) || '[]'))
  const proxyUrl = ref(localStorage.getItem(PROXY_KEY) || '')
  const results = ref([])
  const loading = ref(false)
  const lastUpdated = ref(null)

  function saveSites() {
    localStorage.setItem(SITES_KEY, JSON.stringify(sites.value))
  }

  function saveProxy(url) {
    proxyUrl.value = url.trim()
    if (proxyUrl.value) {
      localStorage.setItem(PROXY_KEY, proxyUrl.value)
    } else {
      localStorage.removeItem(PROXY_KEY)
    }
  }

  function addSite(url, token, name) {
    const hostname = (() => { try { return new URL(url).hostname } catch { return url } })()
    sites.value.push({
      id: Date.now().toString(),
      url: url.replace(/\/+$/, ''),
      token,
      name: name.trim() || hostname,
    })
    saveSites()
  }

  function removeSite(id) {
    sites.value = sites.value.filter(s => s.id !== id)
    results.value = results.value.filter(r => r.site.id !== id)
    saveSites()
  }

  async function loadAll() {
    if (!sites.value.length) return
    loading.value = true
    try {
      const settled = await Promise.allSettled(
        sites.value.map(site => fetchReviewPapers(site.url, site.token, proxyUrl.value))
      )
      results.value = settled.map((r, i) => ({
        site: sites.value[i],
        papers: r.status === 'fulfilled' ? r.value : [],
        error: r.status === 'rejected' ? (r.reason?.message || 'Failed to load') : null,
      }))
      lastUpdated.value = new Date()
    } finally {
      loading.value = false
    }
  }

  return { sites, proxyUrl, results, loading, lastUpdated, addSite, removeSite, saveProxy, loadAll }
})
