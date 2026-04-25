# Research Board App

A PWA that displays Todoist research projects as a Kanban board, organized by pipeline stage. Has a secondary Reviews screen (in progress) for tracking HotCRP paper reviews.

## Tech Stack

- **Framework7 + Vue 3 + Pinia** — component-based UI with iOS native feel
- **Vite** — build tool; `base: './'` for GitHub Pages compatibility
- **vite-plugin-pwa** — generates service worker and handles precaching (replaces manual `sw.js`)
- **Todoist REST API v1** (`https://api.todoist.com/api/v1`)
- **GitHub Actions** (`deploy.yml`) — builds and deploys `dist/` to GitHub Pages on push to `main`
- **Google Fonts CDN** — Inter (UI font) + Material Symbols Outlined (icons); loaded via `<link>` in `index.html`

### File Structure

```
src/
  main.js           — Vue app entry; F7 + Pinia setup; toggles .dark class on <html>
  routes.js         — F7 router routes (/, /token/, /board/, /setup/, /reviews/, /hotcrp/, /project/:id/)
  App.vue           — f7-app root; sets initialUrl from store before F7 boots; calls useTheme() for OS listener
  pages/
    TokenPage.vue        — API token entry
    BoardPage.vue        — main board with PTR, keyboard shortcuts, bottom tabbar
    ProjectDetailPage.vue — full-page split-panel project detail (route: /project/:id/)
    SetupPage.vue        — stage configuration with drag-to-reorder
    ReviewsPage.vue      — HotCRP paper review list, grouped by site; bottom tabbar
    HotCRPPage.vue       — CORS proxy URL + HotCRP site management (add/remove sites)
  components/
    AppSidebar.vue    — shared sidebar: nav, collaborator/venue filters, collapse toggle
    BoardColumn.vue   — single kanban column
    ProjectCard.vue   — project card with drag-and-drop and inline status edit
    TaskItem.vue      — task row with complete/due editing
    SettingsSheet.vue — F7 Sheet for settings (includes theme toggle)
  stores/
    board.js    — Pinia store for Todoist board data; exposes allCollaborators, allVenues, activeFilter, setFilter
    reviews.js  — Pinia store for HotCRP sites, proxy URL, and fetched paper results
  lib/
    todoist.js  — api(token, path, ...) and apiAll(token, path)
    helpers.js  — pure functions: getProjectStage, getProjectTasks, etc.
    sortable.js — minimal drag-to-reorder for SetupPage stage list
    hotcrp.js   — fetchReviewPapers(siteUrl, token, proxyUrl); handles CORS proxy routing
  composables/
    usePullToRefresh.js — custom PTR (Touch Events, 80px threshold, card-drag conflict fix)
    useTheme.js         — theme cycling (auto/light/dark); returns themePref for SettingsSheet
    useSidebar.js       — module-level singleton ref for sidebar collapsed state + localStorage persistence
  assets/
    app.css         — all CSS: design tokens, F7 overrides, component styles
    fonts/          — IBM Plex Mono woff2 files (used only for .kbd)
public/
  favicon.ico       — multi-size favicon (16/32/48px), Stitch icon
  icons/            — PNG icons for PWA manifest (32/180/192/512px), Stitch icon
  manifest.json     — Web App Manifest
index.html          — Vite entry with anti-FOUC script and CSP
vite.config.js
package.json
```

## Security

Content Security Policy via `<meta http-equiv="Content-Security-Policy">` in `index.html`:
- `script-src 'self' 'sha256-...'` — hash covers the one inline anti-FOUC theme script
- `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com` — needed for F7's runtime styles and Google Fonts
- `font-src 'self' data: https://fonts.gstatic.com` — allows Google Fonts woff2 files
- `connect-src https://api.todoist.com https:` — `https:` added to allow HotCRP proxy requests

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

The non-stage labels on that task are treated as the **contact person** for the project and shown as a chip on the card.

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
- **Stale indicator** — cards whose Current Status task hasn't been updated in >14 days show `!` badge; On Ice cards are exempt
- **Project detail** — clicking a card navigates to `/project/:id/` (full-page split panel); back button returns to board
- **Task list** — shown in project detail right pane; Current Status and Deadlines sections excluded
- **Quick-add task** — input at bottom of task list in project detail; Enter creates task via API
- **Pull-to-refresh** — custom composable (`usePullToRefresh.js`); Touch Events, 80px threshold; ignores touch events when `store.cardDragging` is true
- **Sidebar filters** — click a collaborator or venue in the sidebar to filter cards across all columns; click again to clear
- **Bottom tabbar** — visible on mobile (< 768px); hidden on desktop where sidebar serves navigation

## Sidebar / Navigation

Both Board and ProjectDetail pages use `AppSidebar.vue`:

- **Nav items**: Board (active highlight), Reviews, Tasks (disabled), Schedule (disabled)
- **Filters**: Collaborators and Venues sections (collapsible); clicking filters the board via `store.setFilter(type, value)`
- **Footer**: Settings button, last-updated timestamp
- **Collapse**: `useSidebar.js` singleton ref; persisted to `localStorage` as `rb_sidebar_collapsed`
  - Collapsed = sidebar fully hidden (`width: 0; overflow: hidden`)
  - A floating `sidebar-expand-btn` appears at `position: absolute; top: ...; left: 12px` inside `.board-main` / `.project-main` (both have `position: relative`)
  - `BoardPage` and `ProjectDetailPage` both import `useSidebar` to render this button

The sidebar is `display: none` on mobile and shown via `@media (min-width: 768px)`.

## HotCRP Reviews (in progress)

Reviews page (`/reviews/`) shows papers assigned to the user for review, fetched from one or more HotCRP instances. The feature exists but is **not yet working as intended** — treat as work-in-progress.

### Architecture

- **`stores/reviews.js`** — Pinia setup store; holds `sites[]`, `proxyUrl`, `results[]`, `loading`, `lastUpdated`
- **`lib/hotcrp.js`** — `fetchReviewPapers(siteUrl, token, proxyUrl)` — fetches `GET /api/papers?q=re:me` with auth
- **`pages/HotCRPPage.vue`** — configure CORS proxy URL and add/remove HotCRP sites
- **`pages/ReviewsPage.vue`** — lists papers per site with review status badge (Not started / In progress / Submitted)

### CORS Proxy

Browsers block direct HotCRP requests. The app routes through a configurable proxy URL:

- **Generic proxy** (e.g. `https://corsproxy.io/?url=`): `api_key` is embedded in the encoded target URL so the proxy forwards it transparently
- **Custom Cloudflare Worker**: also receives `&token=TOKEN` separately so it can send `Authorization: Bearer TOKEN` instead

URL construction:
```js
// With proxy: api_key embedded in target, token also passed separately for Workers
`${proxyUrl}?url=${encodeURIComponent(hotcrpPath + '&api_key=' + encodeURIComponent(token))}&token=${encodeURIComponent(token)}`
// Direct (no proxy):
`${hotcrpPath}&api_key=${encodeURIComponent(token)}`
```

### Site/Proxy Storage

Sites are stored as `[{id, url, token, name}]` in `localStorage` under `rb_hotcrp_sites`. Proxy URL under `rb_hotcrp_proxy`. The `proxyDraft` input in HotCRPPage is kept in sync with the store via a `watch`.

## Theme

Three modes: **auto** (CSS media query), **light**, **dark**. Stored in `localStorage` as `rb_theme`.
- Anti-FOUC inline script in `index.html` sets `data-theme` before Vue mounts
- `useTheme.js` composable handles cycling and OS change events; called in `App.vue` for app-lifetime listener
- Theme toggle lives in `SettingsSheet.vue` (not in a navbar)
- CSS: `:root` = light-first tokens; `html[data-theme="dark"]` overrides for dark mode; F7 CSS vars overridden via same selectors

## PWA

- `manifest.json`: `"display": "standalone"`, `theme_color: "#F5F5F7"` (light) / icons from Stitch design
- `apple-mobile-web-app-status-bar-style`: `"black-translucent"` — status bar overlays content
- Safe area insets: `env(safe-area-inset-top)` added to `.sidebar-brand`, `.board-main`, `.project-meta`, `.project-tasks` padding
- `viewport-fit=cover` in viewport meta tag (required for safe area insets to work)

## Accessibility (WCAG 2.1 AA target)

- **Focus management** — F7 Sheet has built-in focus trap; opener element focus restored on close via F7's sheet close events
- **Dialog semantics** — `role="dialog" aria-modal="true" aria-labelledby` on `.modal-body` inside each sheet
- **Live regions** — `role="status"` on board-loading overlay
- **List semantics** — `role="list"` on `.col-body`; `role="listitem"` on cards
- **Interactive elements** — all card action elements have `tabindex="0"` and keydown handlers
- **Reduced motion** — `@media (prefers-reduced-motion: reduce)` collapses all durations to 0.01ms

## CSS Notes

- **Design tokens**: light-first in `:root`; dark overrides in `html[data-theme="dark"]`. Key tokens: `--bg`, `--bg-surface`, `--bg-sidebar`, `--text`, `--text2`, `--text3`, `--border`, `--accent`, `--font`, `--stage-0` … `--stage-5`
- **Typography**: `--font` = Inter + system stack (all UI); IBM Plex Mono (`--font-code`) only used for `.kbd`; Playfair Display removed
- **F7 `.card` conflict**: F7's CSS applies `margin: 16px` to all `.card` elements globally. Our `.card` rule must include `margin: 0` to override it, otherwise cards are misaligned and over-spaced.
- **Scroll-snap + padding**: `.board` uses `scroll-snap-type: x mandatory`. When `padding-left` is set on a scroll-snap container, scroll snap advances the scroll position to snap the first item to the viewport edge — scrolling the padding off-screen. Fix: always set `scroll-padding-left` equal to `padding-left` on `.board`. Currently `padding: 24px; scroll-padding: 24px;` base, with `padding-left: 48px; scroll-padding-left: 48px` on `@media (min-width: 768px)`.
- **Media query placement**: CSS media query overrides for `.board` must come *after* the base `.board { padding }` rule in the file, or the base rule wins the cascade (same specificity, later position wins).
- **Board left padding**: Extra `padding-left: 48px` on desktop (via `@media (min-width: 768px)`) creates breathing room between the sidebar and the first column. Requires matching `scroll-padding-left`.
- **`@keyframes ptr-spin`**: combines both `translateX(-50%)` and `rotate(360deg)` — do not split into two transforms (the global `.spin` only rotates, which would break the centering).
- **`.board-page .page-content`**: `padding: 0 !important` — F7's default page-content padding is fully zeroed; safe area is handled manually via `env(safe-area-inset-top)` on `.board-main`.
- **Column scrollbars**: hidden via `scrollbar-width: none` + `.col-body::-webkit-scrollbar { display: none }`. Content still scrolls.
- **F7 dark mode**: `<html>` gets both `data-theme="dark"` and `.dark` class — `useTheme.js` and `main.js` both toggle the class.

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

### HotCRP Reviews (revisit)
The Reviews page and HotCRP integration exist but are not working as intended. Needs rethinking before further work.

### Sprint focus (medium effort)
Mark projects as "in focus" via a `sprint::focus` Todoist label. Toggle from the project detail page. Visual treatment TBD. Clear all focus labels at sprint start.

### Ideas column (zero effort — config only)
Add `stage::idea` to stage configuration. No code change needed.

### Quick-add project (medium effort)
A "+" action that creates a new sub-project under "Research". Requires `POST /projects` with `parent_id` (Research root ID is already found in `displayProjects` computed).

### Global quick-add task (small effort)
Add a task to any project from anywhere without opening the detail page.

## Key localStorage Keys

| Key                      | Value                                   |
|--------------------------|-----------------------------------------|
| `rb_token`               | Todoist API token                       |
| `rb_stages`              | JSON array of `{name, label}`           |
| `rb_theme`               | `"auto"` / `"light"` / `"dark"`        |
| `rb_sidebar_collapsed`   | `"1"` (collapsed) or absent/`"0"`      |
| `rb_hotcrp_sites`        | JSON array of `{id, url, token, name}`  |
| `rb_hotcrp_proxy`        | CORS proxy URL string                   |
