<template>
  <div class="triage-detail-inner">
    <header class="triage-detail-header">
      <div class="triage-detail-header-top">
        <div class="triage-project-badge">{{ projectName }}</div>
        <span class="triage-save-status" :class="{ visible: saveStatus }" role="status" aria-live="polite">{{ saveStatus }}</span>
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
        <label id="label-time" class="triage-field-label">Estimated Time</label>
        <div class="seg-ctrl" role="group" aria-labelledby="label-time">
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
        <label for="task-deadline" class="triage-field-label">Deadline</label>
        <div class="deadline-input-row">
          <input
            id="task-deadline"
            class="meta-date-visible"
            type="date"
            v-model="draft.deadline"
          >
          <button
            v-if="draft.deadline"
            class="deadline-clear-btn"
            aria-label="Clear deadline"
            @click="draft.deadline = ''"
          >
            <span class="material-symbols-outlined" aria-hidden="true">close</span>
          </button>
        </div>
      </div>

      <div class="triage-field">
        <label id="label-importance" class="triage-field-label">Importance</label>
        <div class="seg-ctrl" role="group" aria-labelledby="label-importance">
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
        <label id="label-urgency" class="triage-field-label">Urgency</label>
        <div class="seg-ctrl" role="group" aria-labelledby="label-urgency">
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
        <label id="label-delegatable" class="triage-field-label">Delegatable</label>
        <div class="seg-ctrl triage-seg-narrow" role="group" aria-labelledby="label-delegatable">
          <button class="seg-btn" :class="{ active: draft.delegatable === 'no' }" @click="draft.delegatable = 'no'">No</button>
          <button class="seg-btn" :class="{ active: draft.delegatable === 'yes' }" @click="draft.delegatable = 'yes'">Yes</button>
        </div>
      </div>

      <div class="triage-field">
        <label class="triage-field-label">People</label>
        <div class="collab-chips">
          <span v-for="name in draft.people" :key="name" class="collab-chip">
            <span class="material-symbols-outlined">person</span>
            {{ name }}
            <button class="collab-chip-remove" :aria-label="'Remove ' + name" @click="removePerson(name)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </span>
          <button v-if="!addingPerson" class="collab-add-pill" @click.stop="startAddPerson">
            <span class="material-symbols-outlined">add</span>
          </button>
          <div v-else ref="personWrapperEl" class="collab-combo-wrapper">
            <input
              ref="personInputEl"
              v-model="personQuery"
              class="collab-combo-input"
              placeholder="Name…"
              autocomplete="off"
              @keydown.enter.prevent="commitPerson(personQuery)"
              @keydown.escape.prevent="cancelAddPerson"
            >
            <div v-if="filteredPeople.length" class="popup-dropdown">
              <button
                v-for="c in filteredPeople"
                :key="c"
                class="popup-option"
                @mousedown.prevent
                @click="commitPerson(c)"
              >{{ c }}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="triage-complete-row">
        <button class="triage-complete-btn" :disabled="completing" @click="complete">
          <span class="material-symbols-outlined">check_circle</span>
          {{ completing ? 'Marking done…' : 'Mark as done' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue'
import { useBoardStore } from '../stores/board.js'
import { useTaskTriage, URGENCY_OPTS, LEVEL_OPTS, TIME_OPTS, capitalize } from '../composables/useTaskTriage.js'

const props = defineProps({
  task: { type: Object, required: true },
})

const emit = defineEmits(['completed'])

const store = useBoardStore()
const { draft, saveStatus, initDraft } = useTaskTriage()

const projectName = computed(() => store.displayProjects.find(p => p.id === props.task.project_id)?.name ?? '')

watch(() => props.task, (task) => {
  if (task) { initDraft(task); editingNotes.value = false; editingTitle.value = false }
}, { immediate: true })

// ── Complete ──
const completing = ref(false)

async function complete() {
  if (completing.value) return
  completing.value = true
  try {
    await store.completeTask(props.task.id)
    emit('completed')
  } finally {
    completing.value = false
  }
}

// ── Notes editing ──
const editingNotes = ref(false)
const notesInputEl = ref(null)

async function startEditNotes() {
  editingNotes.value = true
  await nextTick()
  notesInputEl.value?.focus()
}

// ── People ──
const addingPerson = ref(false)
const personQuery = ref('')
const personInputEl = ref(null)
const personWrapperEl = ref(null)

const filteredPeople = computed(() => {
  const q = personQuery.value.toLowerCase()
  const existing = new Set(draft.value.people)
  return store.allCollaborators
    .filter(c => !existing.has(c) && (!q || c.toLowerCase().includes(q)))
    .slice(0, 8)
})

async function startAddPerson() {
  addingPerson.value = true
  personQuery.value = ''
  await nextTick()
  personInputEl.value?.focus()
}

function commitPerson(name) {
  const trimmed = name.trim()
  if (trimmed && !draft.value.people.includes(trimmed)) {
    draft.value.people = [...draft.value.people, trimmed]
  }
  cancelAddPerson()
}

function cancelAddPerson() {
  addingPerson.value = false
  personQuery.value = ''
}

function removePerson(name) {
  draft.value.people = draft.value.people.filter(p => p !== name)
}

function onDocClick(e) {
  if (!personWrapperEl.value?.contains(e.target)) cancelAddPerson()
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))

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
