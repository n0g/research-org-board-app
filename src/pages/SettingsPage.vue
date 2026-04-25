<template>
  <f7-page name="settings" class="settings-page" no-swipeback>
    <div class="settings-screen">
      <AppSidebar current-page="settings" />

      <div class="settings-main">
        <button
          v-if="sidebarCollapsed"
          class="sidebar-expand-btn"
          title="Expand sidebar"
          aria-label="Expand sidebar"
          @click="toggleSidebar"
        >
          <span class="material-symbols-outlined">side_navigation</span>
        </button>

        <div class="settings-content">
          <h1 class="settings-page-title">Settings</h1>

          <div class="settings-group">
            <div class="settings-group-label">Appearance</div>
            <div class="settings-row">
              <span class="settings-row-label">Theme</span>
              <button class="btn sm" :aria-label="'Theme: ' + themeName" @click="cycleTheme">
                {{ themeIcon }} {{ themeName }}
              </button>
            </div>
          </div>

          <div class="divider"></div>

          <div class="settings-group">
            <div class="settings-group-label">Configuration</div>
            <div class="settings-row">
              <span class="settings-row-label">Pipeline stages</span>
              <button class="btn sm" @click="reconfigure">Reconfigure</button>
            </div>
            <div class="settings-row">
              <span class="settings-row-label">Review sites</span>
              <button class="btn sm" @click="goReviewSites">Manage</button>
            </div>
          </div>

          <div class="divider"></div>

          <div class="settings-group">
            <div class="settings-group-label">Account</div>
            <div class="settings-row">
              <span class="settings-row-label">Todoist connection</span>
              <button class="btn sm danger" @click="disconnect">Disconnect</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <f7-toolbar no-hairline position="bottom" class="bottom-tabbar">
      <button class="tab-btn" @click="goBoard">Board</button>
      <button class="tab-btn" @click="goReviews">Reviews</button>
      <button class="tab-btn tab-btn-active" aria-current="page">Settings</button>
    </f7-toolbar>
  </f7-page>
</template>

<script setup>
import { computed } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { useSidebar } from '../composables/useSidebar.js'
import { useTheme } from '../composables/useTheme.js'
import AppSidebar from '../components/AppSidebar.vue'

const store = useBoardStore()
const { sidebarCollapsed, toggleSidebar } = useSidebar()
const { themeIcon, cycleTheme, themePref } = useTheme()

const THEME_NAMES = { auto: 'Auto', light: 'Light', dark: 'Dark' }
const themeName = computed(() => THEME_NAMES[themePref.value] ?? 'Auto')

function reconfigure() {
  f7.views.main.router.navigate('/setup/')
}

function disconnect() {
  store.resetToken()
  f7.views.main.router.navigate('/token/', { clearPreviousHistory: true })
}

function goReviewSites() {
  f7.views.main.router.navigate('/hotcrp/')
}

function goBoard() {
  f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
}

function goReviews() {
  f7.views.main.router.navigate('/reviews/', { clearPreviousHistory: true })
}
</script>
