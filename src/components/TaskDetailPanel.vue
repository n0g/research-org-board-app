<template>
  <div class="triage-detail-inner">
    <header class="triage-detail-header">
      <div class="triage-detail-header-top">
        <div class="triage-project-badge">{{ projectName }}</div>
        <span class="triage-save-status" :class="{ visible: saveStatus }">{{ saveStatus }}</span>
      </div>
      <h2
        v-if="!editingTitle"
        class="triage-detail-title triage-detail-title-editable"
        @click="startEditTitle"
      >{{ task.content }}</h2>
      <textarea
        v-else
        ref="titleInputEl"
        v-model="titleDraft"
        class="triage-detail-title triage-title-input"
        rows="2"
        @blur="saveTitle"
        @keydown.meta.enter.prevent="titleInputEl?.blur()"
        @keydown.escape.prevent="cancelTitle"
      ></textarea>
      <div
        v-if="!editingNotes && !draft.notes"
        class="triage-notes-placeholder"
        @click="startEditNotes"
      >Add notes…</div>
      <div
        v-else-if="!editingNotes"
        class="triage-notes-preview"
        @click="startEditNotes"
      >{{ draft.notes }}</div>
      <textarea
        v-else
        ref="notesInputEl"
        v-model="draft.notes"
        class="triage-notes"
        placeholder="Add notes…"
        rows="4"
        @blur="editingNotes = false"
        @keydown.escape.prevent="editingNotes = false"
      ></textarea>
    </header>

    <div class="triage-fields">
      <div class="triage-field">
        <label class="triage-field-label">Urgency</label>
        <div class="seg-ctrl">
          <button
            v-for="u in URGENCY_OPTS"
            :key="u.val"
            class="seg-btn"
            :class="{ active: draft.urgency === u.val }"
            @click="draft.urgency = u.val"
          >{{ u.label }}</button>
        </div>
      </div>

      <div class="triage-field">
        <label class="triage-field-label">Importance</label>
        <div class="seg-ctrl">
          <button
            v-for="lvl in LEVEL_OPTS"
            :key="lvl"
            class="seg-btn"
            :class="{ active: draft.importance === lvl }"
            @click="draft.importance = lvl"
          >{{ capitalize(lvl) }}</button>
        </div>
      </div>

      <div class="triage-field">
        <label class="triage-field-label">Estimated Time</label>
        <div class="seg-ctrl">
          <button
            v-for="t in TIME_OPTS"
            :key="t"
            class="seg-btn"
            :class="{ active: draft.time === t }"
            @click="draft.time = t"
          >{{ t }}</button>
        </div>
      </div>

      <div class="triage-field">
        <label class="triage-field-label">Delegatable</label>
        <div class="seg-ctrl triage-seg-narrow">
          <button class="seg-btn" :class="{ active: draft.delegatable === 'no' }" @click="draft.delegatable = 'no'">No</button>
          <button class="seg-btn" :class="{ active: draft.delegatable === 'yes' }" @click="draft.delegatable = 'yes'">Yes</button>
        </div>
      </div>

      <div class="triage-field">
        <label class="triage-field-label">Deadline</label>
        <input
          class="meta-date-visible"
          type="date"
          v-model="draft.deadline"
        >
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { useTaskTriage, URGENCY_OPTS, LEVEL_OPTS, TIME_OPTS, capitalize } from '../composables/useTaskTriage.js'

const props = defineProps({
  task: { type: Object, required: true },
})

const store = useBoardStore()
const { draft, saveStatus, initDraft } = useTaskTriage()

const projectName = computed(() => store.displayProjects.find(p => p.id === props.task.project_id)?.name ?? '')

watch(() => props.task, (task) => {
  if (task) { initDraft(task); editingNotes.value = false; editingTitle.value = false }
}, { immediate: true })

// ── Notes editing ──
const editingNotes = ref(false)
const notesInputEl = ref(null)

async function startEditNotes() {
  editingNotes.value = true
  await nextTick()
  notesInputEl.value?.focus()
}

// ── Title editing ──
const editingTitle = ref(false)
const titleDraft = ref('')
const titleInputEl = ref(null)

async function startEditTitle() {
  titleDraft.value = props.task.content
  editingTitle.value = true
  await nextTick()
  titleInputEl.value?.focus()
  titleInputEl.value?.select()
}

async function saveTitle() {
  editingTitle.value = false
  const name = titleDraft.value.trim()
  if (!name || name === props.task.content) return
  await store.updateTaskTriage(props.task.id, { content: name })
}

function cancelTitle() {
  editingTitle.value = false
}
</script>
