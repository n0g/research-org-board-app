# Research Board App

A PWA that displays Todoist research projects as a Kanban board, organized by pipeline stage.

## Tech Stack

- `index.html` — app shell: all CSS, font-face declarations, CSP meta tag, static HTML structure
- `app.js` — all application JavaScript (extracted from index.html to satisfy CSP `script-src 'self'`)
- `sw.js` — service worker; cache name must be bumped on every deploy to force Safari to update
- `fonts/` — self-hosted woff2 latin-subset files (IBM Plex Mono 300/300i/400/500, Playfair Display)
- No build step, no dependencies — vanilla JS + CSS custom properties
- Todoist REST API v1 (`https://api.todoist.com/api/v1`)
- Hosted on GitHub Pages

## Security

Content Security Policy via `<meta http-equiv="Content-Security-Policy">`:
- `script-src 'self' 'sha256-...'` — the SHA-256 hash covers the one inline anti-FOUC script in `<head>`
- `unsafe-inline` is intentionally absent from `script-src`; all JS lives in `app.js`
- `style-src 'self' 'unsafe-inline'` — inline styles are unavoidable for CSS custom properties
- `connect-src https://api.todoist.com` only

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
- **No setup screen on first load** — default stages are applied automatically; setup screen is only reachable via Settings → Reconfigure stages
- **Board** — one column per stage; projects without a matching stage label appear in an "Unassigned" column
- **Drag and drop** — cards can be dragged between columns using Pointer Events (works on desktop and iOS touch); updates the stage label in Todoist immediately
- **Inline status edit** — clicking the status line on a card replaces it with an `<input>`; blur or Enter saves to Todoist; Escape cancels
- **Stale indicator** — cards whose `📌 Current Status` task has not been updated in >14 days show a `⏱ Xw` amber tag; `role="img"` + `aria-label` carries the meaning for screen readers; On Ice cards are exempt
- **Task list** — tasks in `📌 Current Status` and `📌 Deadlines` sections are excluded; only real todos are shown in the modal
- **Quick-add task** — ghost `<input>` at the bottom of the modal task list; Enter creates the task via API, re-renders the modal body, and re-focuses the input for rapid entry
- **Pull-to-refresh** — swipe down on the board to reload data; implemented with Touch Events (separate from the Pointer Events used for card drag); `#ptr-indicator` is a small circle that follows the finger and spins on release; threshold is 80px
- **Initial load spinner** — `#board-loading` overlays the board with a centered spinner until the first data fetch completes; there is no manual reload button in the topbar

## Topbar

Contains: title, last-updated timestamp (`aria-live="polite"`), theme toggle, settings button. There is **no reload button** — refreshing is done via pull-to-refresh or the `R` keyboard shortcut.

## Theme

Three modes: **auto** (follows OS), **light**, **dark**. Stored in `localStorage` as `rb_theme`. A no-FOUC inline script in `<head>` applies the theme before first render. Toggle cycles auto → light → dark → auto.

## Accessibility (WCAG 2.1 AA target)

- **Focus management** — modal and settings panel both trap Tab with named `trapFocus`/`trapFocusSettings` functions (add/remove via addEventListener so they can be cleanly removed on close); opener element focus is restored on close
- **Dialog semantics** — `role="dialog" aria-modal="true" aria-labelledby` on both `.modal` and `.settings-panel`
- **Live regions** — `role="alert"` on error messages; `aria-live="polite"` on last-updated timestamp; `role="status"` on board-loading overlay
- **List semantics** — `role="list"` on `.col-body`; `role="listitem"` on cards
- **Interactive elements** — all dynamic buttons use `role="button" tabindex="0"` with keydown delegation on `#modal-body`; label chips in setup use same pattern; card-status edit uses `role="button"` with Enter/Space keydown handler
- **Color independence** — stale state: `⏱ Xw` tag + `role="img"` aria-label; priority: `.sr-only` "Priority N:" prefix in task name; overdue: `⚠` text prefix
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` collapses all animation/transition durations to 0.01ms
- **Contrast** — dark palette `--text3: #6e7a8a` passes 4.5:1 on `--bg`; default tag text uses `--text2` (not `--text3`) to pass on `--bg2`
- **Screen reader utilities** — `.sr-only` class (visually hidden, announced by screen readers); `aria-hidden="true"` on decorative elements (`#ptr-indicator`, drag handles)

## CSS Notes

- The global `.spin` keyframe only does `rotate(360deg)`, which overrides any `transform` already on the element (e.g. `translateX(-50%)`). For elements that need both, define a dedicated keyframe that combines both transforms (see `@keyframes ptr-spin`).
- `input.quick-add-input` overrides the base `input[type="text"]` background/border to transparent; works because it appears later in the stylesheet at the same specificity (0,1,1). Do not reorder these rules.

## Service Worker

Cache name must be bumped (e.g. `rb-v28` → `rb-v29`) with every deployment to force Safari to pick up the new version. The **cache-first** fetch strategy means the SW must be replaced before a reload picks up new assets. Todoist API calls always bypass the cache (network-only with empty-object fallback).

## Key localStorage Keys

| Key         | Value                        |
|-------------|------------------------------|
| `rb_token`  | Todoist API token            |
| `rb_stages` | JSON array of `{name, label}` |
| `rb_theme`  | `"auto"` / `"light"` / `"dark"` |
