<template>
  <f7-page name="token" class="token-page" no-navbar>
    <div class="token-screen">
      <div class="token-box">
        <h1>Research Board</h1>
        <p>
          Enter your Todoist API token to continue. Find it at<br>
          <a href="https://todoist.com/app/settings/integrations/developer" target="_blank" rel="noopener noreferrer">
            Settings → Integrations → Developer</a>.
          Stored locally on this device only.
        </p>
        <input
          type="password"
          v-model="tokenInput"
          placeholder="API token…"
          aria-label="Todoist API token"
          autocomplete="off"
          spellcheck="false"
          @keydown.enter="submit"
        >
        <div v-if="error" class="error-msg" role="alert">{{ error }}</div>
        <div class="btn-row">
          <button class="btn primary" @click="submit" :disabled="busy">
            {{ busy ? 'Connecting…' : 'Connect →' }}
          </button>
        </div>
      </div>
    </div>
  </f7-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'

const store = useBoardStore()
const tokenInput = ref('')
const error = ref('')
const busy = ref(false)

onMounted(() => {
  if (store.token) {
    f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
  }
})

async function submit() {
  const val = tokenInput.value.trim()
  if (!val) return
  error.value = ''
  busy.value = true
  try {
    await store.saveToken(val)
    f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
  } catch {
    error.value = 'Could not connect — check your token.'
  } finally {
    busy.value = false
  }
}
</script>
