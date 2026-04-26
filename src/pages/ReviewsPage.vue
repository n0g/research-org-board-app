<template>
  <f7-page name="reviews" class="reviews-page" no-swipeback>
    <div class="reviews-screen">
      <AppSidebar current-page="reviews">
        <template #filters>
          <template v-if="store.sites.length">
            <div class="sidebar-section-header" @click="confsOpen = !confsOpen">
              <span class="sidebar-section-label">Conferences</span>
              <span
                class="material-symbols-outlined sidebar-section-chevron"
                :class="{ open: confsOpen }"
                aria-hidden="true"
              >keyboard_arrow_down</span>
            </div>
            <template v-if="confsOpen">
              <button
                v-for="site in store.sites"
                :key="site.id"
                class="sidebar-nav-item"
                :class="{ 'sidebar-filter-active': activeSiteId === site.id }"
                :title="site.name || site.url"
                @click="toggleSite(site.id)"
              >
                <span class="material-symbols-outlined" aria-hidden="true">web</span>
                <span class="sidebar-label">{{ site.name || site.url }}</span>
              </button>
            </template>
          </template>
        </template>
      </AppSidebar>

      <div class="reviews-main">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-expand-btn"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <span class="material-symbols-outlined">side_navigation</span>
        </button>

        <div class="reviews-content">
          <div class="reviews-content-header">
            <h1 class="reviews-page-title">Reviews</h1>
            <button class="btn sm" :disabled="store.loading" @click="store.loadAll()">
              <span class="material-symbols-outlined">refresh</span>
              Refresh
            </button>
          </div>

          <div v-if="store.loading" class="reviews-loading" role="status">
            <div class="board-spinner"></div>
            <span class="sr-only">Loading reviews…</span>
          </div>

          <div v-else-if="!store.sites.length" class="reviews-empty">
            <p>No review sites configured.</p>
            <button class="btn primary" @click="goManageSites">Configure sites in Settings →</button>
          </div>

          <template v-else>
            <div v-if="!store.results.length" class="reviews-empty">
              <p>Hit Refresh to load your assigned papers.</p>
            </div>

            <div
              v-for="result in filteredResults"
              :key="result.site.id"
              class="review-site-section"
            >
              <div class="review-site-head">
                <span class="review-site-name">{{ result.site.name || result.site.url }}</span>
                <span v-if="!result.error" class="review-site-count">
                  {{ result.papers.length }} paper{{ result.papers.length !== 1 ? 's' : '' }}
                </span>
              </div>

              <div v-if="result.error" class="review-error" role="alert">{{ result.error }}</div>
              <div v-else-if="!result.papers.length" class="review-empty-site">No papers assigned for review</div>
              <div v-else class="review-papers">
                <a
                  v-for="paper in result.papers"
                  :key="paper.pid"
                  class="review-paper external"
                  :href="`${result.site.url.replace(/\/+$/, '')}/paper/${paper.pid}`"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <div class="review-paper-head">
                    <span class="review-paper-id">#{{ paper.pid }}</span>
                    <span class="review-status-badge" :class="reviewStatusClass(paper)">{{ reviewStatusText(paper) }}</span>
                  </div>
                  <div class="review-paper-title">{{ paper.title }}</div>
                  <div v-if="authorList(paper)" class="review-paper-authors">{{ authorList(paper) }}</div>
                </a>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard"><span class="material-symbols-outlined">dashboard</span>Board</button>
      <button class="tab-btn" @click="goTasks"><span class="material-symbols-outlined">checklist</span>Tasks</button>
      <button class="tab-btn tab-btn-active" aria-current="page"><span class="material-symbols-outlined">grading</span>Reviews</button>
      <button class="tab-btn" @click="goSettings"><span class="material-symbols-outlined">settings</span>Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useReviewsStore } from '../stores/reviews.js'
import { useSidebar } from '../composables/useSidebar.js'
import AppSidebar from '../components/AppSidebar.vue'

const store = useReviewsStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()

const confsOpen = ref(true)
const activeSiteId = ref(null)

function toggleSite(id) {
  activeSiteId.value = activeSiteId.value === id ? null : id
}

const filteredResults = computed(() =>
  activeSiteId.value
    ? store.results.filter(r => r.site.id === activeSiteId.value)
    : store.results
)

function reviewStatusClass(paper) {
  const r = paper.myReview
  if (!r) return 'status-not-started'
  if (r.reviewSubmitted || r.submitted) return 'status-submitted'
  return 'status-in-progress'
}

function reviewStatusText(paper) {
  const r = paper.myReview
  if (!r) return 'Not started'
  if (r.reviewSubmitted || r.submitted) return 'Submitted'
  return 'In progress'
}

function authorList(paper) {
  if (!paper.authors?.length) return ''
  const names = paper.authors.slice(0, 3).map(a => {
    if (typeof a === 'string') return a
    return [a.first, a.last].filter(Boolean).join(' ') || a.name || ''
  }).filter(Boolean)
  const rest = paper.authors.length - 3
  return names.join(', ') + (rest > 0 ? ` +${rest} more` : '')
}

function goBoard() { f7.views.main.router.navigate('/board/', { clearPreviousHistory: true }) }
function goTasks() { f7.views.main.router.navigate('/tasks/', { clearPreviousHistory: true }) }
function goManageSites() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }
function goSettings() { f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true }) }

onMounted(() => {
  if (store.sites.length && !store.results.length) store.loadAll()
})
</script>
