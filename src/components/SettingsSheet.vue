<template>
  <f7-sheet
    class="settings-sheet"
    :opened="open"
    swipe-to-close
    backdrop
    @sheet:closed="$emit('close')"
  >
    <div class="swipe-handler"></div>
    <f7-page-content>
      <div class="modal-head">
        <h3 id="settings-heading">Settings</h3>
        <button class="close-btn" aria-label="Close" @click="$emit('close')">×</button>
      </div>
      <div
        class="settings-body"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-heading"
      >
        <div class="settings-row">
          <span class="settings-row-label">Appearance</span>
          <button class="btn sm" :aria-label="'Theme: ' + themeName" @click="cycleTheme">
            {{ themeIcon }} {{ themeName }}
          </button>
        </div>
        <div class="divider"></div>
        <p class="settings-hint">Reconfigure stages, manage review sites, or switch token.</p>
        <button class="btn" @click="reconfigure">Reconfigure stages</button>
        <br><br>
        <button class="btn" @click="goReviewSites">Review sites</button>
        <br><br>
        <button class="btn danger" @click="disconnect">Disconnect &amp; clear token</button>
      </div>
    </f7-page-content>
  </f7-sheet>
</template>

<script setup>
import { computed } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useTheme } from '../composables/useTheme.js'

defineProps({ open: { type: Boolean, default: false } })
const emit = defineEmits(['close'])

const store = useBoardStore()
const { themeIcon, cycleTheme, themePref } = useTheme()

const THEME_NAMES = { auto: 'Auto', light: 'Light', dark: 'Dark' }
const themeName = computed(() => THEME_NAMES[themePref.value] ?? 'Auto')

function reconfigure() {
  emit('close')
  setTimeout(() => f7.views.main.router.navigate('/setup/'), 300)
}

function disconnect() {
  store.resetToken()
  f7.views.main.router.navigate('/token/', { clearPreviousHistory: true })
}

function goReviewSites() {
  emit('close')
  setTimeout(() => f7.views.main.router.navigate('/hotcrp/'), 300)
}
</script>
