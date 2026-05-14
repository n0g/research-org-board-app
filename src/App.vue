<template>
  <f7-app v-bind="f7params">
    <!-- Pre-auth: single view for token entry -->
    <f7-view v-if="!store.token" main url="/" />

    <!-- Authenticated: tab views + shared tabbar -->
    <template v-else>
      <f7-views tabs>
        <f7-view id="view-board"    name="board"    tab tab-active url="/board/" />
        <f7-view id="view-tasks"    name="tasks"    tab url="/tasks/" />
        <f7-view id="view-schedule" name="schedule" tab url="/schedule/" />
        <f7-view id="view-settings" name="settings" tab url="/settings/" />
      </f7-views>
      <f7-toolbar
        v-show="tabbarVisible"
        no-hairline
        position="bottom"
        class="bottom-tabbar"
      >
        <button
          class="tab-btn"
          :class="{ 'tab-btn-active': activeTab === 'board' }"
          :aria-current="activeTab === 'board' ? 'page' : undefined"
          @click="showTab('board')"
        ><i class="ph ph-kanban" aria-hidden="true"></i>Board</button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn-active': activeTab === 'tasks' }"
          :aria-current="activeTab === 'tasks' ? 'page' : undefined"
          @click="showTab('tasks')"
        ><i class="ph ph-list-checks" aria-hidden="true"></i>Tasks</button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn-active': activeTab === 'schedule' }"
          :aria-current="activeTab === 'schedule' ? 'page' : undefined"
          @click="showTab('schedule')"
        ><i class="ph ph-calendar" aria-hidden="true"></i>Schedule</button>
        <button
          class="tab-btn"
          :class="{ 'tab-btn-active': activeTab === 'settings' }"
          :aria-current="activeTab === 'settings' ? 'page' : undefined"
          @click="showTab('settings')"
        ><i class="ph ph-gear" aria-hidden="true"></i>Settings</button>
      </f7-toolbar>
    </template>
  </f7-app>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import routes from './routes.js'
import { useBoardStore } from './stores/board.js'
import { useReviewsStore } from './stores/reviews.js'
import { useCalendarStore } from './stores/calendar.js'
import { useSettingsStore } from './stores/settings.js'
import { useTheme } from './composables/useTheme.js'
import { useAccentColor } from './composables/useAccentColor.js'
import { useTabbar } from './composables/useTabbar.js'

useTheme()
useAccentColor()

const store = useBoardStore()
const reviewsStore = useReviewsStore()
const calStore = useCalendarStore()
const settingsStore = useSettingsStore()

const { visible: tabbarVisible } = useTabbar()
const activeTab = ref('board')

function showTab(name) {
  f7.tab.show('#view-' + name)
  activeTab.value = name
}

// Guard: watches only fire for user-made changes, not the initial settings load
const settingsLoaded = ref(false)

watch(() => store.stages, (stages) => {
  if (!settingsLoaded.value || !store.token || !stages) return
  settingsStore.save(store.token, 'stages', stages)
}, { deep: true })

watch(() => reviewsStore.sites, (sites) => {
  if (!settingsLoaded.value || !store.token) return
  settingsStore.save(store.token, 'hotcrp_sites', sites)
}, { deep: true })

watch(() => reviewsStore.proxyUrl, (url) => {
  if (!settingsLoaded.value || !store.token) return
  settingsStore.save(store.token, 'hotcrp_proxy', url)
})

watch(() => calStore.selectedCalendarId, (id) => {
  if (!settingsLoaded.value || !store.token) return
  settingsStore.save(store.token, 'gcal_calendar_id', id)
})

onMounted(async () => {
  // Keep activeTab in sync when tabs are shown via sidebar or programmatic navigation
  f7.on('tabShow', (tabEl) => {
    const name = tabEl.id?.replace('view-', '')
    if (name) activeTab.value = name
  })

  if (!store.token) { settingsLoaded.value = true; return }

  const settings = await settingsStore.load(store.token)

  if (settings.stages?.length)      store.saveStages(settings.stages)
  if (settings.hotcrp_sites)        reviewsStore.setSites(settings.hotcrp_sites)
  if (settings.hotcrp_proxy)        reviewsStore.saveProxy(settings.hotcrp_proxy)
  if (settings.gcal_calendar_id)    calStore.saveCalendarId(settings.gcal_calendar_id)

  // Let Vue flush reactive updates so watch callbacks fire while settingsLoaded=false
  await nextTick()
  settingsLoaded.value = true

  // Backfill: write any settings not yet in Todoist (e.g. first run of sync feature)
  if (!settings.stages && store.stages?.length)
    settingsStore.save(store.token, 'stages', store.stages)
  if (!settings.hotcrp_sites && reviewsStore.sites.length)
    settingsStore.save(store.token, 'hotcrp_sites', reviewsStore.sites)
  if (!settings.hotcrp_proxy && reviewsStore.proxyUrl)
    settingsStore.save(store.token, 'hotcrp_proxy', reviewsStore.proxyUrl)
  if (!settings.gcal_calendar_id && calStore.selectedCalendarId && calStore.selectedCalendarId !== 'primary')
    settingsStore.save(store.token, 'gcal_calendar_id', calStore.selectedCalendarId)
})

const f7params = {
  name: 'Research Board',
  theme: 'ios',
  darkMode: false,
  routes,
  touch: {
    iosTouchRipple: false,
    mdTouchRipple: false,
  },
}
</script>
