<template>
  <f7-page name="setup" class="setup-page">
    <f7-navbar title="Configure Stages" back-link="Board" />

    <div class="setup-content">
      <div class="setup-box">
        <p class="sub">Map Todoist labels to pipeline stages. Each row: display name (left) + exact Todoist label name (right). Order = column order on the board.</p>

        <div class="section-label">Your Todoist labels</div>
        <div class="label-chips" role="list">
          <span
            v-for="l in store.labels"
            :key="l.id"
            class="chip"
            tabindex="0"
            role="button"
            :aria-label="'Use label ' + l.name"
            @click="fillLabel(l.name)"
            @keydown.enter.prevent="fillLabel(l.name)"
            @keydown.space.prevent="fillLabel(l.name)"
          >{{ l.name }}</span>
          <span v-if="!store.labels.length" class="no-labels">No labels found</span>
        </div>

        <hr class="divider">

        <div class="section-label">Stage mapping</div>
        <div ref="rowsEl" class="stage-rows">
          <div
            v-for="(row, i) in rows"
            :key="row.key"
            class="stage-row"
            :data-index="i"
          >
            <span class="handle" aria-hidden="true" title="drag to reorder">⠿</span>
            <input
              type="text"
              placeholder="Display name"
              aria-label="Stage display name"
              v-model="row.name"
              class="stage-name-input"
            >
            <input
              type="text"
              placeholder="Todoist label"
              aria-label="Todoist label name"
              v-model="row.label"
              class="stage-label-input"
            >
            <button class="del" :aria-label="'Remove stage ' + row.name" @click="rows.splice(i, 1)">×</button>
          </div>
        </div>

        <button class="btn sm" @click="addRow" style="margin-top:4px">+ add stage</button>

        <hr class="divider">

        <div v-if="error" class="error-msg" role="alert">{{ error }}</div>
        <div class="setup-actions">
          <button class="btn" @click="back">← back</button>
          <button class="btn primary" @click="save">Save & open board →</button>
        </div>
      </div>
    </div>
  </f7-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { f7 } from 'framework7-vue/bundle'
import { useBoardStore } from '../stores/board.js'
import { DEFAULT_STAGES } from '../lib/helpers.js'
import { apiAll } from '../lib/todoist.js'
import { initSortable } from '../lib/sortable.js'

const store = useBoardStore()
const rowsEl = ref(null)
const error = ref('')
let keyCounter = 0

const rows = ref((store.stages || DEFAULT_STAGES).map(s => ({ ...s, key: keyCounter++ })))

function addRow(labelVal = '', nameVal = '') {
  rows.value.push({ name: nameVal, label: labelVal, key: keyCounter++ })
}

function fillLabel(name) {
  const empty = rows.value.find(r => !r.label)
  if (empty) { empty.label = name; return }
  addRow(name)
}

function back() {
  store.resetToken()
  f7.views.main.router.navigate('/token/', { clearPreviousHistory: true })
}

function save() {
  const stages = rows.value
    .map(r => ({ name: r.name.trim(), label: r.label.trim() }))
    .filter(r => r.name && r.label)
  if (!stages.length) { error.value = 'Add at least one stage.'; return }
  store.saveStages(stages)
  f7.views.main.router.navigate('/board/', { clearPreviousHistory: true })
}

onMounted(async () => {
  try {
    store.labels = await apiAll(store.token, '/labels')
  } catch { store.labels = [] }
  if (rowsEl.value) initSortable(rowsEl.value, rows)
})
</script>
