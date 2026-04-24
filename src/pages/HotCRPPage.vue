<template>
  <f7-page name="hotcrp" class="setup-page">
    <f7-navbar title="Review Sites" back-link="Back" />

    <div class="setup-content">
      <div class="setup-box">

        <!-- Proxy URL -->
        <div class="section-label">CORS proxy</div>
        <p class="sub" style="margin-bottom:12px">
          Browsers block direct HotCRP requests (CORS). Route them through a proxy that adds the required headers.
          Use <code class="inline-code">https://corsproxy.io/?url=</code> for zero-setup, or
          <a class="setup-link" href="https://developers.cloudflare.com/workers/" target="_blank" rel="noopener">your own Cloudflare Worker</a>
          for full control.
        </p>
        <div class="proxy-row">
          <input
            type="text"
            v-model="proxyDraft"
            placeholder="https://corsproxy.io/?url="
            aria-label="Proxy URL"
            class="proxy-input"
            @keydown.enter.prevent="saveProxy"
          >
          <button class="btn sm" @click="saveProxy">Save</button>
          <button v-if="store.proxyUrl" class="btn sm danger" @click="clearProxy">Clear</button>
        </div>
        <p v-if="store.proxyUrl" class="proxy-active">
          Active: <code class="inline-code">{{ store.proxyUrl }}</code>
        </p>
        <p v-else class="proxy-inactive">No proxy set — fetches will fail due to CORS.</p>

        <hr class="divider">

        <!-- Sites -->
        <div class="section-label">Configured sites</div>
        <div v-if="!store.sites.length" class="no-labels" style="margin-bottom:16px">No sites configured yet</div>
        <div v-else class="site-rows">
          <div v-for="site in store.sites" :key="site.id" class="site-row">
            <div class="site-info">
              <div class="site-name-text">{{ site.name }}</div>
              <div class="site-url-text">{{ site.url }}</div>
            </div>
            <button
              class="del"
              :aria-label="'Remove ' + site.name"
              @click="store.removeSite(site.id)"
            >×</button>
          </div>
        </div>

        <hr class="divider">

        <!-- Add site -->
        <div class="section-label">Add site</div>
        <input
          type="text"
          v-model="newUrl"
          placeholder="https://hotcrp.example.org"
          aria-label="Site URL"
          @keydown.enter.prevent="focusToken"
        >
        <input
          ref="tokenInputEl"
          type="text"
          v-model="newToken"
          placeholder="API key (Profile → API tokens in HotCRP)"
          aria-label="API key"
          style="margin-top:8px"
          @keydown.enter.prevent="focusName"
        >
        <input
          ref="nameInputEl"
          type="text"
          v-model="newName"
          placeholder="Display name (optional)"
          aria-label="Display name"
          style="margin-top:8px"
          @keydown.enter.prevent="addSite"
        >

        <div v-if="addError" class="error-msg" role="alert" style="margin-top:10px">{{ addError }}</div>

        <div class="setup-actions" style="margin-top:16px">
          <button class="btn" @click="goBack">← back</button>
          <button class="btn primary" @click="addSite">Add site</button>
        </div>
      </div>
    </div>
  </f7-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useReviewsStore } from '../stores/reviews.js'

const store = useReviewsStore()
const tokenInputEl = ref(null)
const nameInputEl = ref(null)

const proxyDraft = ref(store.proxyUrl)
const newUrl = ref('')
const newToken = ref('')
const newName = ref('')
const addError = ref('')

function saveProxy() {
  store.saveProxy(proxyDraft.value)
}

function clearProxy() {
  proxyDraft.value = ''
  store.saveProxy('')
}

function focusToken() { tokenInputEl.value?.focus() }
function focusName() { nameInputEl.value?.focus() }

function goBack() {
  f7.views.main.router.back()
}

function addSite() {
  addError.value = ''
  const url = newUrl.value.trim()
  const token = newToken.value.trim()
  if (!url) { addError.value = 'Enter a site URL.'; return }
  if (!token) { addError.value = 'Enter an API key.'; return }
  try { new URL(url) } catch { addError.value = 'Invalid URL — include https://'; return }
  store.addSite(url, token, newName.value)
  newUrl.value = ''
  newToken.value = ''
  newName.value = ''
}

onMounted(() => { proxyDraft.value = store.proxyUrl })
</script>
