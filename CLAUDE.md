# Research Board App

A PWA that displays Todoist research projects as a Kanban board, organized by pipeline stage.

## Tech Stack

- **Framework7 + Vue 3 + Pinia** — component-based UI with iOS native feel
- **Vite** — build tool; `base: './'` for GitHub Pages compatibility
- **vite-plugin-pwa** — generates service worker and handles precaching (replaces manual `sw.js`)
- **Todoist REST API v1** (`https://api.todoist.com/api/v1`)
- **GitHub Actions** (`deploy.yml`) — builds and deploys `dist/` to GitHub Pages on push to `main`

### File Structure

```
src/
  main.js           — Vue app entry; F7 + Pinia setup
  routes.js         — F7 router routes (/, /token/, /board/, /setup/)
  App.vue           — f7-app root with f7-view
  pages/
    TokenPage.vue   — API token entry
    BoardPage.vue   — main board with PTR, keyboard shortcuts
    SetupPage.vue   — stage configuration with drag-to-reorder
  components/
    BoardColumn.vue  — single kanban column
    ProjectCard.vue  — project card with drag-and-drop
    TaskItem.vue     — task in modal with complete/due editing
    ProjectModal.vue — F7 Sheet (swipe-to-close) for project detail
    SettingsSheet.vue — F7 Sheet for settings
  stores/board.js   — Pinia store (replaces global `S` object)
  lib/
    todoist.js      — api(token, path, ...) and apiAll(token, path)
    helpers.js      — pure functions: getProjectStage, getProjectTasks, etc.
    sortable.js     — minimal drag-to-reorder for SetupPage stage list
  composables/
    usePullToRefresh.js — custom PTR (Touch Events, 80px threshold, card-drag conflict fix)
    useTheme.js         — theme cycling (auto/light/dark)
  assets/
    app.css         — all CSS: design tokens, F7 overrides, component styles
    fonts/          — IBM Plex Mono + Playfair Display woff2 files
public/
  icons/            — PNG icons for PWA manifest
  manifest.json     — Web App Manifest
index.html          — Vite entry with anti-FOUC script and CSP
vite.config.js
package.json
```

## Security

Content Security Policy via `<meta http-equiv="Content-Security-Policy">` in `index.html`:
- `script-src 'self' 'sha256-...'` — hash covers the one inline anti-FOUC theme script
- `style-src 'self' 'unsafe-inline'` — needed for F7's runtime styles and Vue scoped CSS
- `connect-src https://api.todoist.com` only

The anti-FOUC script is exactly: `(function(){var t=localStorage.getItem('rb_theme')||'auto';document.documentElement.dataset.theme=t==='dark'||t==='auto'&&matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light'})();`

To get its SHA-256: `printf '%s' '<script content>' | openssl dgst -sha256 -binary | openssl base64`

## Todoist Data Model

Projects are direct children of a top-level Todoist project named **"Research"**. The app filters to only these sub-projects.

Each research project has two sections:
- `📌 Current Status` — contains a single task whose labels encode the pipeline stage and contact person
- `📌 Deadlines` — contains deadline tasks (excluded from the task list view)

### Stage tracking

The stage is stored as a label on the task inside `📌 Current Status`:

```
Task content: "Preparing for submission"
Labels: ["stage::preparing-to-submit", "Junho"]
```

The non-stage labels on that task are treated as the **contact person** for the project and shown as a green tag on the card.

### Stage label convention

Labels follow the `stage::` prefix pattern:

| Display name     | Todoist label                  |
|------------------|-------------------------------|
| Planning         | `stage::planning`              |
| Data Collection  | `stage::data-collection`       |
| Preparing        | `stage::preparing-to-submit`   |
| Revision         | `stage::revision`              |
| Awaiting Reviews | `stage::under-submission`      |
| On Ice           | `stage::on-ice`                |

## App Behaviour

- **Token screen** — user enters Todoist API token once; stored in `localStorage`
- **No setup on first load** — default stages applied automatically; setup only via Settings → Reconfigure stages
- **Board** — one column per stage; projects without a matching stage label appear in "Unassigned"
- **Drag and drop** — Pointer Events on `ProjectCard.vue`; updates stage label in Todoist on drop; `store.cardDragging` flag prevents PTR from firing during drag
- **Inline status edit** — clicking the status line on a card replaces it with an `<input>`; blur or Enter saves; Escape cancels
- **Stale indicator** — cards whose Current Status task hasn't been updated in >14 days show `⏱ Xw`; On Ice cards are exempt
- **Task list** — Current Status and Deadlines sections excluded; only real todos shown in modal
- **Quick-add task** — input at bottom of modal task list; Enter creates task via API
- **Pull-to-refresh** — custom composable (`usePullToRefresh.js`); Touch Events, 80px threshold; ignores touch events when `store.cardDragging` is true
- **F7 Sheets** — `ProjectModal` and `SettingsSheet` use `<f7-sheet swipe-to-close backdrop>` for native swipe-to-dismiss

## Topbar

Contains: title (Playfair Display), last-updated timestamp, theme toggle, settings button. No reload button — pull-to-refresh or `R` keyboard shortcut.

## Theme

Three modes: **auto** (CSS media query), **light**, **dark**. Stored in `localStorage` as `rb_theme`.
- Anti-FOUC inline script in `index.html` sets `data-theme` before Vue mounts
- `useTheme.js` composable handles cycling and OS change events
- CSS: `:root` defaults to dark; `@media (prefers-color-scheme: light)` overrides for auto mode; `html[data-theme="light"]` for explicit light; F7 CSS vars overridden via `html[data-theme="dark/light"]` selectors

## Accessibility (WCAG 2.1 AA target)

- **Focus management** — F7 Sheet has built-in focus trap; opener element focus restored on close via F7's sheet close events
- **Dialog semantics** — `role="dialog" aria-modal="true" aria-labelledby` on `.modal-body` inside each sheet
- **Live regions** — `aria-live="polite"` on last-updated timestamp; `role="status"` on board-loading overlay
- **List semantics** — `role="list"` on `.col-body`; `role="listitem"` on cards
- **Interactive elements** — all card action elements have `tabindex="0"` and keydown handlers
- **Color independence** — stale state: `⏱ Xw` tag + aria-label; priority: `.sr-only` prefix; overdue: `⚠` text
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` collapses all durations to 0.01ms
- **Touch targets** — `.task-check`, `.chip`, `.task-due` all have `min-height: 24px` (WCAG 2.5.8)

## CSS Notes

- F7 CSS variables are overridden in `app.css` using `html[data-theme="dark/light"]` and `:root` selectors
- `@keyframes ptr-spin` combines both `translateX(-50%)` and `rotate(360deg)` — do not split into two transforms (the global `.spin` only rotates, which would break the centering)
- `.board-page .page-content` zeroes only left/right/bottom padding (not top) so F7's navbar offset padding-top is preserved; columns fill the remaining height
- `input.quick-add-input` overrides base input styles with transparent background/border
- Typography: `--ui` = system font stack (`-apple-system, BlinkMacSystemFont, …`); `--serif` = Playfair Display (card/modal titles); `--code` = IBM Plex Mono (only used for `.kbd`)
- Color tokens follow iOS system color names: `--bg` = systemGroupedBackground, `--bg1` = secondarySystemGroupedBackground, etc.
- `.board-navbar .btn.icon` uses Liquid Glass style: 32px circle, `backdrop-filter: blur`, semi-transparent border
- Glass sheet: `.project-sheet` / `.settings-sheet` use `backdrop-filter: blur(48px) saturate(200%)` with semi-transparent `--f7-sheet-bg-color`; `.page-content` inside is `background: transparent` to let the blur show through
- F7 dark mode: `<html>` gets both `data-theme="dark"` and `.dark` class — `useTheme.js` and `main.js` both toggle the class

## Service Worker

Managed by `vite-plugin-pwa` in `generateSW` mode. No manual cache name bumping needed — Vite's hashed filenames + Workbox precache handles cache invalidation automatically. Todoist API calls use `NetworkFirst` strategy.

## Intended Workflow

The app is used as a **pipeline overview** across MacBook and tablet — not a day-to-day task manager. Key use cases:

- **Passive overview** — keep all research projects in sight at a glance
- **Status meetings** — walk through project states, quickly capture tasks mid-conversation
- **Sprint planning** — decide which projects are in focus for the week

Task scheduling and calendar management stay outside this app (handled via Claude + Google Calendar).

## Planned Features

These were discussed and deferred pending real usage. Implement when the user asks.

### Sprint focus (medium effort)
Mark projects as "in focus" via a `sprint::focus` Todoist label. Toggle from the card modal. Visual treatment TBD. Clear all focus labels at sprint start.

### Ideas column (zero effort — config only)
Add `stage::idea` to stage configuration. No code change needed.

### Quick-add project (medium effort)
A "+" action that creates a new sub-project under "Research". Requires `POST /projects` with `parent_id` (Research root ID is already found in `displayProjects` computed).

### Global quick-add task (small effort)
Add a task to any project from anywhere without opening the modal.

## Key localStorage Keys

| Key         | Value                        |
|-------------|------------------------------|
| `rb_token`  | Todoist API token            |
| `rb_stages` | JSON array of `{name, label}` |
| `rb_theme`  | `"auto"` / `"light"` / `"dark"` |
