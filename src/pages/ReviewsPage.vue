<template>
  <f7-page name="reviews" class="reviews-page" no-swipeback>
    <f7-navbar class="reviews-navbar">
      <f7-nav-left>
        <div class="nav-title-group">
          <button class="nav-sibling-link" @click="goBoard">Board</button>
          <h1 class="board-title">Reviews</h1>
        </div>
      </f7-nav-left>
      <f7-nav-right>
        <span class="last-updated" aria-live="polite">{{ lastUpdatedText }}</span>
        <button
          class="btn icon"
          title="Refresh"
          aria-label="Refresh reviews"
          :disabled="store.loading"
          @click="store.loadAll()"
        >↺</button>
        <button
          class="btn icon"
          title="Toggle theme"
          aria-label="Toggle theme"
          @click="cycleTheme"
        >{{ themeIcon }}</button>
        <button
          class="btn icon"
          title="Settings"
          aria-label="Settings"
          @click="goSettings"
        >⚙&#xFE0E;</button>
      </f7-nav-right>
    </f7-navbar>

    <div class="reviews-screen">
      <div v-if="store.loading" class="reviews-loading" role="status">
        <div class="board-spinner"></div>
        <span class="sr-only">Loading reviews</span>
      </div>

      <div v-else-if="!store.sites.length" class="reviews-empty">
        <p>No review sites configured.</p>
        <button class="btn primary" @click="goManageSites">Configure HotCRP sites →</button>
      </div>

      <template v-else>
        <div
          v-for="result in store.results"
          :key="result.site.id"
          class="review-site-section"
        >
          <div class="review-site-head">
            <span class="review-site-name">{{ result.site.name }}</span>
            <span v-if="!result.error" class="review-site-count">
              {{ result.papers.length }} paper{{ result.papers.length !== 1 ? 's' : '' }}
            </span>
          </div>

          <div v-if="result.error" class="review-error" role="alert">{{ result.error }}</div>
          <div v-else-if="!result.papers.length" class="review-empty-site">No papers assigned for review</div>
          <div v-else class="review-papers">
            <div
              v-for="paper in result.papers"
              :key="paper.pid"
              class="review-paper"
            >
              <div class="review-paper-head">
                <span class="review-paper-id">#{{ paper.pid }}</span>
                <span class="review-status-badge" :class="reviewStatusClass(paper)">{{ reviewStatusText(paper) }}</span>
              </div>
              <div class="review-paper-title">{{ paper.title }}</div>
              <div v-if="authorList(paper)" class="review-paper-authors">{{ authorList(paper) }}</div>
            </div>
          </div>
        </div>

        <div v-if="!store.results.length" class="reviews-empty">
          <p>Tap ↺ to load your assigned reviews.</p>
        </div>
      </template>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard">Board</button>
      <button class="tab-btn tab-btn-active" aria-current="page">Reviews</button>
      <button class="tab-btn" @click="goSettings">Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { computed, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useReviewsStore } from '../stores/reviews.js'
import { useTheme } from '../composables/useTheme.js'

const store = useReviewsStore()
const { themeIcon, cycleTheme } = useTheme()

const lastUpdatedText = computed(() =>
  store.lastUpdated ? `updated ${store.lastUpdated.toLocaleTimeString()}` : ''
)

function goBoard() {
  f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
}

function goManageSites() {
  f7.views.main.router.navigate('/hotcrp/')
}

function goSettings() {
  f7.views.main.router.navigate('/settings/', { clearPreviousHistory: true })
}

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

onMounted(() => {
  if (store.sites.length && !store.results.length) store.loadAll()
})
</script>
