<template>
  <f7-app v-bind="f7params">
    <f7-view main :url="initialUrl" :transition="'f7-cover-v'" />
  </f7-app>
</template>

<script setup>
import { ref, watch, onMounted, nextTick } from 'vue'
import routes from './routes.js'
import { useBoardStore } from './stores/board.js'
import { useReviewsStore } from './stores/reviews.js'
import { useSettingsStore } from './stores/settings.js'
import { useTheme } from './composables/useTheme.js'
import { useAccentColor } from './composables/useAccentColor.js'

useTheme()
const accentColor = useAccentColor()

const store = useBoardStore()
const reviewsStore = useReviewsStore()
const settingsStore = useSettingsStore()
const initialUrl = store.token ? '/board/' : '/'

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

watch(accentColor.accentColor, (color) => {
  if (!settingsLoaded.value || !store.token) return
  settingsStore.save(store.token, 'accent_color', color)
})

onMounted(async () => {
  if (!store.token) { settingsLoaded.value = true; return }

  const settings = await settingsStore.load(store.token)

  if (settings.stages?.length)    store.saveStages(settings.stages)
  if (settings.hotcrp_sites)      reviewsStore.setSites(settings.hotcrp_sites)
  if (settings.hotcrp_proxy)      reviewsStore.saveProxy(settings.hotcrp_proxy)
  if (settings.accent_color)      accentColor.setColor(settings.accent_color)

  // Let Vue flush reactive updates (watch callbacks fire here, see settingsLoaded=false, skip save)
  await nextTick()
  settingsLoaded.value = true
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
