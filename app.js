// ──────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────
const S = {
  token: localStorage.getItem('rb_token'),
  stages: JSON.parse(localStorage.getItem('rb_stages') || 'null'),
  projects: [],
  tasks: [],
  labels: [],
  excludedSectionIds: new Set(),
  deadlineSectionIds: new Set(),
  lastUpdated: null,
};

// ──────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────
async function init() {
  applyTheme(localStorage.getItem('rb_theme') || 'auto');
  if (!S.token) { showScreen('screen-token'); return; }
  if (!S.stages) {
    S.stages = DEFAULT_STAGES;
    localStorage.setItem('rb_stages', JSON.stringify(DEFAULT_STAGES));
  } else {
    // Migrate: move Revision before Awaiting Reviews if still in old order
    const ri = S.stages.findIndex(s => s.label === 'stage::revision');
    const ai = S.stages.findIndex(s => s.label === 'stage::under-submission');
    if (ri !== -1 && ai !== -1 && ri > ai) {
      S.stages.splice(ai, 0, S.stages.splice(ri, 1)[0]);
      localStorage.setItem('rb_stages', JSON.stringify(S.stages));
    }
  }
  showScreen('screen-board');
  await loadData();
}

// ──────────────────────────────────────────────
// API
// ──────────────────────────────────────────────
async function api(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Authorization': `Bearer ${S.token}`, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`https://api.todoist.com/api/v1${path}`, opts);
  if (!r.ok) throw new Error(`Todoist API ${r.status}: ${await r.text()}`);
  if (r.status === 204) return null;
  return r.json();
}

async function apiAll(path) {
  let results = [], cursor = null;
  do {
    const url = cursor ? `${path}?cursor=${encodeURIComponent(cursor)}` : path;
    const res = await api(url);
    if (Array.isArray(res)) return res;
    results = results.concat(res.results || []);
    cursor = res.next_cursor || null;
  } while (cursor);
  return results;
}

// ──────────────────────────────────────────────
// TOKEN SCREEN
// ──────────────────────────────────────────────
async function submitToken() {
  const val = document.getElementById('token-input').value.trim();
  const err = document.getElementById('token-error');
  err.style.display = 'none';
  if (!val) return;
  S.token = val;
  try {
    await api('/projects');
    localStorage.setItem('rb_token', val);
    if (!S.stages) {
      S.stages = DEFAULT_STAGES;
      localStorage.setItem('rb_stages', JSON.stringify(DEFAULT_STAGES));
    }
    showScreen('screen-board');
    loadData();
  } catch(e) {
    S.token = null;
    err.textContent = 'Could not connect — check your token.';
    err.style.display = 'block';
  }
}

// ──────────────────────────────────────────────
// SETUP SCREEN
// ──────────────────────────────────────────────
const DEFAULT_STAGES = [
  { name: 'Planning',          label: 'stage::planning' },
  { name: 'Data Collection',   label: 'stage::data-collection' },
  { name: 'Preparing',         label: 'stage::preparing-to-submit' },
  { name: 'Revision',          label: 'stage::revision' },
  { name: 'Awaiting Reviews',  label: 'stage::under-submission' },
  { name: 'On Ice',            label: 'stage::on-ice' },
];

async function loadLabels() {
  try {
    S.labels = await apiAll('/labels');
  } catch(e) { S.labels = []; }
}

async function showSetup() {
  await loadLabels();
  renderLabelChips();
  renderStageRows(S.stages || DEFAULT_STAGES);
  showScreen('screen-setup');
}

function renderLabelChips() {
  const el = document.getElementById('label-chips');
  if (!S.labels.length) { el.innerHTML = '<span style="color:var(--text3);font-size:12px">No labels found</span>'; return; }
  el.innerHTML = S.labels.map(l =>
    `<span class="chip" tabindex="0" role="button" data-label="${escHtml(l.name)}">${escHtml(l.name)}</span>`
  ).join('');
}

function fillLabel(name) {
  const inputs = document.querySelectorAll('.stage-label-input');
  for (const inp of inputs) {
    if (!inp.value) { inp.value = name; inp.focus(); return; }
  }
  addStageRow(name);
}

function renderStageRows(stages) {
  const el = document.getElementById('stage-rows');
  el.innerHTML = '';
  stages.forEach((s) => addStageRow(s.label, s.name));
}

function addStageRow(labelVal = '', nameVal = '') {
  const el = document.getElementById('stage-rows');
  const row = document.createElement('div');
  row.className = 'stage-row';
  row.innerHTML = `
    <span class="handle" aria-hidden="true" title="drag to reorder">⠿</span>
    <input type="text" placeholder="Display name" aria-label="Stage display name" value="${escHtml(nameVal)}" class="stage-name-input">
    <input type="text" placeholder="Todoist label" aria-label="Todoist label name" value="${escHtml(labelVal)}" class="stage-label-input">
    <button class="del" aria-label="Remove stage">×</button>
  `;
  el.appendChild(row);
}

function saveSetup() {
  const rows = document.querySelectorAll('.stage-row');
  const stages = [];
  for (const row of rows) {
    const name = row.querySelector('.stage-name-input').value.trim();
    const label = row.querySelector('.stage-label-input').value.trim();
    if (name && label) stages.push({ name, label });
  }
  if (!stages.length) {
    const err = document.getElementById('setup-error');
    err.textContent = 'Add at least one stage.';
    err.style.display = 'block';
    return;
  }
  S.stages = stages;
  localStorage.setItem('rb_stages', JSON.stringify(stages));
  showScreen('screen-board');
  loadData();
}

// ──────────────────────────────────────────────
// DATA LOADING
// ──────────────────────────────────────────────
async function loadData(manual = false) {
  const boardEl = document.getElementById('board');
  const loadingEl = document.getElementById('board-loading');
  if (!boardEl.children.length && loadingEl) loadingEl.style.display = 'flex';
  boardEl.setAttribute('aria-busy', 'true');
  try {
    const [projects, tasks, sections] = await Promise.all([
      apiAll('/projects'),
      apiAll('/tasks'),
      apiAll('/sections'),
    ]);
    S.projects = projects;
    S.tasks = tasks;
    const EXCLUDED = new Set(['📌 Current Status', '📌 Deadlines']);
    S.excludedSectionIds = new Set(sections.filter(s => EXCLUDED.has(s.name)).map(s => s.id));
    S.deadlineSectionIds = new Set(sections.filter(s => s.name === '📌 Deadlines').map(s => s.id));
    S.lastUpdated = new Date();
    renderBoard();
    scrollToStageParam();
    const el = document.getElementById('last-updated');
    if (el) el.textContent = `updated ${S.lastUpdated.toLocaleTimeString()}`;
  } catch(e) {
    console.error(e);
    if (manual) alert('Failed to load: ' + e.message);
  } finally {
    if (loadingEl) loadingEl.style.display = 'none';
    boardEl.setAttribute('aria-busy', 'false');
  }
}

// ──────────────────────────────────────────────
// DATA HELPERS
// ──────────────────────────────────────────────
const stageLabels = () => S.stages.map(s => s.label);

function getProjectStage(projectId) {
  const tasks = S.tasks.filter(t => t.project_id === projectId);
  for (const t of tasks) {
    const sl = (t.labels || []).find(l => stageLabels().includes(l));
    if (sl) return { task: t, label: sl };
  }
  return null;
}

function getProjectMeta(projectId) {
  const tasks = S.tasks.filter(t => t.project_id === projectId);
  let venue = null, author = null;
  for (const t of tasks) {
    const n = t.content.toLowerCase();
    const VENUES = ['ccs','usenix','ndss','s&p','soups','chi','cscw','pets','popets'];
    for (const v of VENUES) {
      if (n.includes(v)) { venue = v.toUpperCase(); break; }
    }
    if (n.startsWith('author:') || n.startsWith('first author:')) {
      author = t.content.split(':')[1].trim().split(' ')[0];
    }
    for (const l of (t.labels || [])) {
      const lv = l.toLowerCase();
      for (const v of VENUES) {
        if (lv === v) { venue = v.toUpperCase(); break; }
      }
    }
  }
  return { venue, author };
}

function getProjectTasks(projectId) {
  const stageLabelSet = new Set(stageLabels());
  return S.tasks.filter(t => {
    if (t.project_id !== projectId) return false;
    if (t.is_completed) return false;
    if ((t.labels || []).some(l => stageLabelSet.has(l))) return false;
    if (S.excludedSectionIds.has(t.section_id)) return false;
    return true;
  }).sort((a, b) => (a.priority || 4) - (b.priority || 4));
}

function getProjectDeadline(projectId) {
  const tasks = S.tasks.filter(t =>
    t.project_id === projectId &&
    S.deadlineSectionIds.has(t.section_id) &&
    !t.is_completed && t.due
  );
  if (!tasks.length) return null;
  const dates = tasks.map(t => new Date(t.due.date)).sort((a, b) => a - b);
  const future = dates.filter(d => d > Date.now());
  return future.length ? future[0] : dates[dates.length - 1];
}

function nearestDue(tasks) {
  const now = Date.now();
  let nearest = null;
  for (const t of tasks) {
    if (!t.due) continue;
    const d = new Date(t.due.date).getTime();
    if (!nearest || d < nearest) nearest = d;
  }
  return nearest;
}

function dueStatus(dateMs) {
  const now = Date.now();
  const diff = dateMs - now;
  if (diff < 0) return 'overdue';
  if (diff < 7 * 86400000) return 'due-soon';
  return 'ok';
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ──────────────────────────────────────────────
// RENDER BOARD
// ──────────────────────────────────────────────
function scrollToStageParam() {
  const label = new URLSearchParams(location.search).get('stage');
  if (!label) return;
  const idx = S.stages.findIndex(s => s.label === label);
  if (idx === -1) return;
  const col = document.querySelector(`.col[data-stage="${idx}"]`);
  if (col) col.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' });
}

function getDisplayProjects() {
  const root = S.projects.find(p => !p.parent_id && p.name === 'Research');
  if (root) return S.projects.filter(p => p.parent_id === root.id);
  return S.projects;
}

function renderBoard() {
  const board = document.getElementById('board');
  board.innerHTML = '';
  const displayProjects = getDisplayProjects();

  S.stages.forEach((stage, idx) => {
    const projects = displayProjects.filter(p => {
      const s = getProjectStage(p.id);
      return s && s.label === stage.label;
    }).sort((a, b) => {
      const da = getProjectDeadline(a.id), db = getProjectDeadline(b.id);
      if (!da && !db) return 0;
      if (!da) return 1;
      if (!db) return -1;
      return da - db;
    });

    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.stage = idx;
    col.dataset.stageLabel = stage.label;

    col.innerHTML = `
      <div class="col-head">
        <span class="col-name">${escHtml(stage.name)}</span>
        <span class="col-count">${projects.length}</span>
      </div>
      <div class="col-body" id="col-${idx}" role="list"></div>
    `;
    board.appendChild(col);

    const body = col.querySelector('.col-body');
    if (!projects.length) {
      body.innerHTML = '<div class="empty-col">—</div>';
    } else {
      projects.forEach(p => body.appendChild(renderCard(p, stage)));
    }
  });

  // Unassigned column
  const unassigned = displayProjects.filter(p => !getProjectStage(p.id));
  if (unassigned.length) {
    const col = document.createElement('div');
    col.className = 'col';
    col.dataset.stage = '99';
    col.innerHTML = `
      <div class="col-head">
        <span class="col-name" style="color:var(--text3)">Unassigned</span>
        <span class="col-count">${unassigned.length}</span>
      </div>
      <div class="col-body" role="list"></div>
    `;
    board.appendChild(col);
    const body = col.querySelector('.col-body');
    unassigned.forEach(p => body.appendChild(renderCard(p, null)));
  }
}

// ──────────────────────────────────────────────
// INLINE STATUS EDIT
// ──────────────────────────────────────────────
function startStatusEdit(e, statusEl, taskId) {
  e.stopPropagation();
  const current = statusEl.textContent.trim();
  const input = document.createElement('input');
  input.type = 'text';
  input.value = current;
  input.className = 'card-status-input';
  input.addEventListener('pointerdown', e => e.stopPropagation());
  input.addEventListener('click', e => e.stopPropagation());

  let done = false;
  async function save() {
    if (done) return; done = true;
    const val = input.value.trim() || current;
    if (val !== current) {
      await api(`/tasks/${taskId}`, 'POST', { content: val }).catch(console.error);
      const task = S.tasks.find(t => t.id === taskId);
      if (task) task.content = val;
    }
    renderBoard();
  }
  input.addEventListener('blur', save);
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    if (e.key === 'Escape') { done = true; renderBoard(); }
  });

  statusEl.replaceWith(input);
  input.focus();
  input.select();
}

// ──────────────────────────────────────────────
// DRAG & DROP
// ──────────────────────────────────────────────
function initCardDrag(card, project) {
  card.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    const startX = e.clientX;
    const startY = e.clientY;
    const rect = card.getBoundingClientRect();
    const offsetX = startX - rect.left;
    const offsetY = startY - rect.top;

    let dragging = false;
    let ghost = null;
    let currentCol = null;

    function onMove(e) {
      if (!dragging) {
        if (Math.hypot(e.clientX - startX, e.clientY - startY) < 8) return;
        dragging = true;
        ghost = card.cloneNode(true);
        Object.assign(ghost.style, {
          position: 'fixed',
          width: rect.width + 'px',
          pointerEvents: 'none',
          zIndex: '1000',
          opacity: '0.9',
          transform: 'rotate(2deg) scale(1.03)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
          margin: '0',
          transition: 'none',
        });
        document.body.appendChild(ghost);
        card.classList.add('dragging');
      }

      ghost.style.left = (e.clientX - offsetX) + 'px';
      ghost.style.top  = (e.clientY - offsetY) + 'px';

      ghost.style.visibility = 'hidden';
      const el = document.elementFromPoint(e.clientX, e.clientY);
      ghost.style.visibility = '';
      const col = el ? el.closest('.col[data-stage-label]') : null;

      if (col !== currentCol) {
        if (currentCol) currentCol.classList.remove('drag-over');
        currentCol = col;
        if (currentCol) currentCol.classList.add('drag-over');
      }
    }

    function onUp() {
      document.removeEventListener('pointermove', onMove);
      if (!dragging) { openModal(project); return; }

      ghost.remove();
      card.classList.remove('dragging');
      if (currentCol) currentCol.classList.remove('drag-over');

      const newLabel  = currentCol ? currentCol.dataset.stageLabel : null;
      const stageInfo = getProjectStage(project.id);
      const oldLabel  = stageInfo ? stageInfo.label : '';
      const oldTaskId = stageInfo ? stageInfo.task.id : '';

      if (newLabel && newLabel !== oldLabel) {
        moveStage(project.id, oldTaskId, oldLabel, newLabel);
      }
    }

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp, { once: true });
  });
}

function renderCard(project, stage) {
  const tasks = getProjectTasks(project.id);
  const meta = getProjectMeta(project.id);
  const nearest = nearestDue(tasks);
  const dueSt = nearest ? dueStatus(nearest) : null;
  const openCount = tasks.length;
  const stageInfo = getProjectStage(project.id);
  const stageLabelSet = new Set(stageLabels());
  const statusText = stageInfo ? stageInfo.task.content : '';
  const personLabels = stageInfo
    ? (stageInfo.task.labels || []).filter(l => !stageLabelSet.has(l))
    : [];

  const dateStr = stageInfo && (stageInfo.task.updated_at || stageInfo.task.created_at);
  const staleDays = dateStr ? (Date.now() - new Date(dateStr).getTime()) / 86400000 : null;
  const isStale = staleDays !== null && staleDays > 14;
  const isOnIce = stage && stage.label === 'stage::on-ice';

  const card = document.createElement('div');
  card.className = 'card';
  card.setAttribute('role', 'listitem');
  if (isStale && !isOnIce) card.classList.add('stale');
  if (isOnIce) card.classList.add('on-ice');

  const nameEl = document.createElement('div');
  nameEl.className = 'card-name';
  nameEl.textContent = project.name;
  card.appendChild(nameEl);

  if (statusText && stageInfo) {
    const statusEl = document.createElement('div');
    statusEl.className = 'card-status editable';
    statusEl.textContent = statusText;
    statusEl.title = 'Click to edit';
    statusEl.tabIndex = 0;
    statusEl.setAttribute('role', 'button');
    statusEl.setAttribute('aria-label', 'Edit status: ' + statusText);
    statusEl.addEventListener('pointerdown', e => e.stopPropagation());
    statusEl.addEventListener('click', e => startStatusEdit(e, statusEl, stageInfo.task.id));
    statusEl.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); startStatusEdit(e, statusEl, stageInfo.task.id); }
    });
    card.appendChild(statusEl);
  }

  const deadline = getProjectDeadline(project.id);
  const deadlineStr = deadline
    ? deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : null;

  let tags = '';
  personLabels.forEach(l => { tags += `<span class="tag person">${escHtml(l)}</span>`; });
  if (meta.venue) tags += `<span class="tag venue">${escHtml(meta.venue)}${deadlineStr ? ' · ' + escHtml(deadlineStr) : ''}</span>`;
  if (nearest) {
    const label = formatDate(new Date(nearest).toISOString().split('T')[0]);
    tags += `<span class="tag ${dueSt}">${dueSt === 'overdue' ? '⚠ ' : ''}${label}</span>`;
  }
  if (openCount) tags += `<span class="tag">${openCount} task${openCount !== 1 ? 's' : ''}</span>`;
  if (isStale && !isOnIce) {
    const weeks = Math.floor(staleDays / 7);
    tags += `<span class="tag stale-tag" role="img" aria-label="Stale — last updated ${weeks} week${weeks !== 1 ? 's' : ''} ago">⏱ ${weeks}w</span>`;
  }
  if (tags) {
    const metaEl = document.createElement('div');
    metaEl.className = 'card-meta';
    metaEl.innerHTML = tags;
    card.appendChild(metaEl);
  }

  card.tabIndex = 0;
  card.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal(project); }
  });
  initCardDrag(card, project);
  return card;
}

// ──────────────────────────────────────────────
// PROJECT MODAL
// ──────────────────────────────────────────────
let _modalOpener = null;

function trapFocus(e) {
  if (e.key !== 'Tab') return;
  const focusable = Array.from(document.getElementById('modal').querySelectorAll(
    'button, [href], input, [tabindex="0"]'
  )).filter(el => !el.disabled && el.offsetParent !== null);
  if (focusable.length < 2) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openModal(project) {
  _modalOpener = document.activeElement;
  const overlay = document.getElementById('modal-overlay');
  const title = document.getElementById('modal-title');
  const body = document.getElementById('modal-body');

  title.textContent = project.name;
  body.innerHTML = renderModalBody(project);
  overlay.classList.add('open');
  overlay.addEventListener('keydown', trapFocus);
  document.getElementById('modal-close-btn').focus();
}

function renderModalBody(project) {
  const stageInfo = getProjectStage(project.id);
  const tasks = getProjectTasks(project.id);
  const meta = getProjectMeta(project.id);

  let html = '';

  // Stage selector — data attributes instead of inline onclick
  html += `<div class="detail-row" style="align-items:flex-start">
    <span class="label">Stage</span>
    <div class="stage-selector">
      ${S.stages.map(s => `
        <button class="stage-opt ${stageInfo && stageInfo.label === s.label ? 'active' : ''}"
          aria-pressed="${stageInfo && stageInfo.label === s.label ? 'true' : 'false'}"
          data-action="move-stage"
          data-project-id="${escHtml(project.id)}"
          data-old-task-id="${escHtml(stageInfo ? stageInfo.task.id : '')}"
          data-old-label="${escHtml(stageInfo ? stageInfo.label : '')}"
          data-new-label="${escHtml(s.label)}">
          ${escHtml(s.name)}
        </button>
      `).join('')}
    </div>
  </div>`;

  if (meta.venue) html += `<div class="detail-row"><span class="label">Venue</span><span class="value">${escHtml(meta.venue)}</span></div>`;
  if (meta.author) html += `<div class="detail-row"><span class="label">Author</span><span class="value">${escHtml(meta.author)}</span></div>`;

  html += `<div class="detail-row">
    <span class="label">Open</span>
    <a href="todoist://project?id=${escHtml(project.id)}" style="color:var(--accent);font-size:12px;text-decoration:none">in Todoist app ↗</a>
  </div>`;

  // Tasks — data attributes instead of inline onclick
  html += `<div class="tasks-section">
    <div class="section-label">Open tasks (${tasks.length})</div>`;

  if (!tasks.length) {
    html += '<div class="no-tasks">No open tasks</div>';
  } else {
    tasks.forEach(t => {
      const pClass = t.priority === 4 ? 'p1' : t.priority === 3 ? 'p2' : t.priority === 2 ? 'p3' : '';
      const pText = t.priority === 4 ? 'Priority 1' : t.priority === 3 ? 'Priority 2' : t.priority === 2 ? 'Priority 3' : '';
      const dueStr = t.due ? t.due.date : '';
      const status = dueStr ? dueStatus(new Date(dueStr).getTime()) : '';
      html += `
        <div class="task-item ${pClass}" id="task-${escHtml(t.id)}">
          <div class="task-check"
            role="button" tabindex="0" aria-label="Complete task"
            data-action="complete-task"
            data-task-id="${escHtml(t.id)}"
            data-project-id="${escHtml(project.id)}"></div>
          <div class="task-content">
            <div class="task-name">${pText ? `<span class="sr-only">${pText}: </span>` : ''}${escHtml(t.content)}</div>
            ${dueStr
              ? `<div class="task-due ${status}" role="button" tabindex="0"
                  data-action="edit-due"
                  data-task-id="${escHtml(t.id)}"
                  data-due="${escHtml(dueStr)}"
                  data-project-id="${escHtml(project.id)}">
                  ${status === 'overdue' ? '⚠ ' : '📅 '}${formatDate(dueStr)}
                </div>`
              : `<div class="task-due" role="button" tabindex="0"
                  data-action="edit-due"
                  data-task-id="${escHtml(t.id)}"
                  data-due=""
                  data-project-id="${escHtml(project.id)}">+ due date</div>`
            }
          </div>
        </div>`;
    });
  }
  html += '</div>';
  return html;
}

async function moveStage(projectId, oldTaskId, oldLabel, newLabel) {
  if (oldLabel === newLabel) return;
  try {
    if (oldTaskId) {
      const task = S.tasks.find(t => t.id === oldTaskId);
      if (task) {
        const newLabels = (task.labels || []).filter(l => l !== oldLabel).concat(newLabel);
        await api(`/tasks/${oldTaskId}`, 'POST', { labels: newLabels });
        task.labels = newLabels;
      }
    } else {
      alert('No stage task found for this project. Create a task with a stage label in Todoist first.');
      return;
    }
    renderBoard();
    const project = S.projects.find(p => p.id === projectId);
    if (project) document.getElementById('modal-body').innerHTML = renderModalBody(project);
  } catch(e) {
    alert('Failed to update stage: ' + e.message);
  }
}

async function completeTask(taskId, projectId) {
  try {
    await api(`/tasks/${taskId}/close`, 'POST');
    S.tasks = S.tasks.filter(t => t.id !== taskId);
    renderBoard();
    const project = S.projects.find(p => p.id === projectId);
    if (project) document.getElementById('modal-body').innerHTML = renderModalBody(project);
  } catch(e) {
    alert('Failed to complete task: ' + e.message);
  }
}

function editDue(taskId, currentDue, projectId) {
  const taskEl = document.getElementById(`task-${taskId}`);
  if (!taskEl) return;
  const dueEl = taskEl.querySelector('.task-due');
  if (!dueEl) return;

  const inp = document.createElement('input');
  inp.type = 'date';
  inp.className = 'task-due-edit';
  inp.value = currentDue || '';
  inp.onblur = () => saveDue(taskId, inp.value, projectId);
  inp.onkeydown = e => {
    if (e.key === 'Enter') inp.blur();
    if (e.key === 'Escape') { inp.remove(); dueEl.style.display = ''; }
  };
  dueEl.style.display = 'none';
  dueEl.parentNode.insertBefore(inp, dueEl.nextSibling);
  inp.focus();
}

async function saveDue(taskId, dateVal, projectId) {
  try {
    const body = dateVal ? { due_date: dateVal } : { due_string: 'no due date' };
    await api(`/tasks/${taskId}`, 'POST', body);
    const task = S.tasks.find(t => t.id === taskId);
    if (task) {
      if (dateVal) task.due = { date: dateVal };
      else task.due = null;
    }
    renderBoard();
    const project = S.projects.find(p => p.id === projectId);
    if (project) document.getElementById('modal-body').innerHTML = renderModalBody(project);
  } catch(e) {
    alert('Failed to update due date: ' + e.message);
  }
}

function closeModal() {
  const overlay = document.getElementById('modal-overlay');
  overlay.classList.remove('open');
  overlay.removeEventListener('keydown', trapFocus);
  if (_modalOpener) { _modalOpener.focus(); _modalOpener = null; }
}

// ──────────────────────────────────────────────
// THEME
// ──────────────────────────────────────────────
const THEME_ICONS = { auto: '◑', light: '☀', dark: '☾' };
const THEME_CYCLE = { auto: 'light', light: 'dark', dark: 'auto' };

function applyTheme(pref) {
  const dark = pref === 'dark' || (pref === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
  const btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = THEME_ICONS[pref];
}

function cycleTheme() {
  const cur = localStorage.getItem('rb_theme') || 'auto';
  const next = THEME_CYCLE[cur];
  localStorage.setItem('rb_theme', next);
  applyTheme(next);
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if ((localStorage.getItem('rb_theme') || 'auto') === 'auto') applyTheme('auto');
});

// ──────────────────────────────────────────────
// SETTINGS
// ──────────────────────────────────────────────
let _settingsOpener = null;

function trapFocusSettings(e) {
  if (e.key !== 'Tab') return;
  const focusable = Array.from(document.querySelector('.settings-panel').querySelectorAll(
    'button, [href], input, [tabindex="0"]'
  )).filter(el => !el.disabled && el.offsetParent !== null);
  if (focusable.length < 2) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (e.shiftKey) {
    if (document.activeElement === first) { e.preventDefault(); last.focus(); }
  } else {
    if (document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
}

function openSettings() {
  _settingsOpener = document.activeElement;
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.add('open');
  overlay.addEventListener('keydown', trapFocusSettings);
  document.getElementById('settings-close-btn').focus();
}

function closeSettings() {
  const overlay = document.getElementById('settings-overlay');
  overlay.classList.remove('open');
  overlay.removeEventListener('keydown', trapFocusSettings);
  if (_settingsOpener) { _settingsOpener.focus(); _settingsOpener = null; }
}

function resetToken() {
  localStorage.removeItem('rb_token');
  localStorage.removeItem('rb_stages');
  S.token = null; S.stages = null;
  location.reload();
}

// ──────────────────────────────────────────────
// UTILS
// ──────────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function escHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;')
    .replace(/'/g,'&#39;');
}

// ──────────────────────────────────────────────
// PULL TO REFRESH
// ──────────────────────────────────────────────
function initPullToRefresh() {
  const screen = document.getElementById('screen-board');
  const ind = document.getElementById('ptr-indicator');
  const THRESHOLD = 80;
  let startY = 0, active = false, refreshing = false;

  screen.addEventListener('touchstart', e => {
    if (e.touches.length !== 1 || refreshing) return;
    const col = e.target.closest('.col-body');
    if (col && col.scrollTop > 0) return;
    startY = e.touches[0].clientY;
    active = true;
  }, { passive: true });

  screen.addEventListener('touchmove', e => {
    if (!active) return;
    const dy = e.touches[0].clientY - startY;
    if (dy <= 4) return;
    const pull = Math.min(dy * 0.5, THRESHOLD);
    const progress = pull / THRESHOLD;
    ind.style.top = (44 + pull * 0.6) + 'px';
    ind.style.opacity = Math.min(progress * 2, 1);
    ind.textContent = progress >= 1 ? '↑' : '↓';
    ind.className = progress >= 1 ? 'ready' : '';
  }, { passive: true });

  screen.addEventListener('touchend', e => {
    if (!active) return;
    active = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy >= THRESHOLD && !refreshing) {
      refreshing = true;
      ind.textContent = '';
      ind.className = 'spinning';
      loadData(true).finally(() => {
        refreshing = false;
        ind.className = '';
        ind.style.opacity = '0';
      });
    } else {
      ind.className = '';
      ind.style.opacity = '0';
    }
  });
}

// ──────────────────────────────────────────────
// EVENT WIRING
// ──────────────────────────────────────────────

// Token screen
document.getElementById('token-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitToken();
});
document.getElementById('submit-token-btn').addEventListener('click', submitToken);

// Setup screen
document.getElementById('add-stage-btn').addEventListener('click', () => addStageRow());
document.getElementById('back-btn').addEventListener('click', resetToken);
document.getElementById('save-setup-btn').addEventListener('click', saveSetup);
document.getElementById('stage-rows').addEventListener('click', e => {
  if (e.target.classList.contains('del')) e.target.closest('.stage-row').remove();
});
document.getElementById('label-chips').addEventListener('click', e => {
  const chip = e.target.closest('.chip');
  if (chip) fillLabel(chip.dataset.label);
});
document.getElementById('label-chips').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const chip = e.target.closest('.chip');
  if (chip) { e.preventDefault(); fillLabel(chip.dataset.label); }
});

// Board topbar
document.getElementById('theme-btn').addEventListener('click', cycleTheme);
document.getElementById('settings-btn').addEventListener('click', openSettings);

// Modal — event delegation for dynamically rendered content
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeModal();
});
document.getElementById('modal-body').addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const check = e.target.closest('[data-action="complete-task"]');
  if (check) { e.preventDefault(); completeTask(check.dataset.taskId, check.dataset.projectId); return; }
  const due = e.target.closest('[data-action="edit-due"]');
  if (due) { e.preventDefault(); editDue(due.dataset.taskId, due.dataset.due, due.dataset.projectId); }
});
document.getElementById('modal-close-btn').addEventListener('click', closeModal);
document.getElementById('modal-body').addEventListener('click', e => {
  const stageOpt = e.target.closest('[data-action="move-stage"]');
  if (stageOpt) {
    const { projectId, oldTaskId, oldLabel, newLabel } = stageOpt.dataset;
    moveStage(projectId, oldTaskId, oldLabel, newLabel);
    return;
  }
  const check = e.target.closest('[data-action="complete-task"]');
  if (check) {
    completeTask(check.dataset.taskId, check.dataset.projectId);
    return;
  }
  const due = e.target.closest('[data-action="edit-due"]');
  if (due) {
    editDue(due.dataset.taskId, due.dataset.due, due.dataset.projectId);
    return;
  }
});

// Settings panel
document.getElementById('settings-overlay').addEventListener('click', e => {
  if (e.target === e.currentTarget) closeSettings();
});
document.getElementById('settings-close-btn').addEventListener('click', closeSettings);
document.getElementById('reconfigure-btn').addEventListener('click', () => { closeSettings(); showSetup(); });
document.getElementById('disconnect-btn').addEventListener('click', resetToken);

// Global keyboard shortcuts
document.addEventListener('keydown', e => {
  if (e.key === 'r' && !e.metaKey && !e.ctrlKey && document.activeElement.tagName !== 'INPUT') {
    loadData(true);
  }
  if (e.key === 'Escape') {
    closeModal();
    closeSettings();
  }
});

// ──────────────────────────────────────────────
// SERVICE WORKER
// ──────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').catch(() => {});
  navigator.serviceWorker.addEventListener('controllerchange', () => window.location.reload());
}

initPullToRefresh();
init();
