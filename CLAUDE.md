# Research Board App

A PWA that displays Todoist research projects as a Kanban board, organized by pipeline stage. Has a secondary Reviews screen (in progress) for tracking HotCRP paper reviews.

## Tech Stack

- **Framework7 + Vue 3 + Pinia** — component-based UI with iOS native feel
- **Vite** — build tool; `base: './'` for GitHub Pages compatibility
- **vite-plugin-pwa** — generates service worker and handles precaching (replaces manual `sw.js`)
- **Todoist REST API v1** (`https://api.todoist.com/api/v1`)
- **GitHub Actions** (`deploy.yml`) — builds and deploys `dist/` to GitHub Pages on push to `main`

### File Structure

```
src/
  main.js           — Vue app entry; F7 + Pinia setup; toggles .dark class on <html>
  routes.js         — F7 router routes (/, /token/, /board/, /setup/, /reviews/, /hotcrp/)
  App.vue           — f7-app root; sets initialUrl from store before F7 boots (avoids router race)
  pages/
    TokenPage.vue   — API token entry
    BoardPage.vue   — main board with PTR, keyboard shortcuts, bottom tabbar
    SetupPage.vue   — stage configuration with drag-to-reorder
    ReviewsPage.vue — HotCRP paper review list, grouped by site; bottom tabbar
    HotCRPPage.vue  — CORS proxy URL + HotCRP site management (add/remove sites)
  components/
    BoardColumn.vue   — single kanban column
    ProjectCard.vue   — project card with drag-and-drop
    TaskItem.vue      — task in modal with complete/due editing
    ProjectModal.vue  — F7 Sheet (swipe-to-close) for project detail
    SettingsSheet.vue — F7 Sheet for settings
  stores/
    board.js    — Pinia store for Todoist board data
    reviews.js  — Pinia store for HotCRP sites, proxy URL, and fetched paper results
  lib/
    todoist.js  — api(token, path, ...) and apiAll(token, path)
    helpers.js  — pure functions: getProjectStage, getProjectTasks, etc.
    sortable.js — minimal drag-to-reorder for SetupPage stage list
    hotcrp.js   — fetchReviewPapers(siteUrl, token, proxyUrl); handles CORS proxy routing
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
- **Bottom tabbar** — Board and Reviews pages each have a `<f7-toolbar position="bottom">` for switching between the two screens

## Topbar / Navigation

Both Board and Reviews pages share the same navbar pattern:

- **Left**: `.nav-title-group` flex container with an `<h1 class="board-title">` (current page, bold) and a `<button class="nav-sibling-link">` (other page, dimmed). A separator is injected via CSS adjacent sibling selectors so the `|` always appears between the two items regardless of DOM order.
- **Right**: last-updated timestamp, refresh, theme toggle, settings (all liquid glass style)

CSS separator rule:
```css
.board-title + .nav-sibling-link,
.nav-sibling-link + .board-title {
  border-left: 0.5px solid var(--border2);
  padding-left: 10px;
}
```

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
- `.board-navbar .btn.icon` and `.reviews-navbar .btn.icon` use Liquid Glass style: 32px circle, `backdrop-filter: blur(24px) saturate(200%)`, semi-transparent border
- Glass sheet: `.project-sheet` / `.settings-sheet` use `backdrop-filter: blur(48px) saturate(200%)` with semi-transparent `--f7-sheet-bg-color`; `.page-content` inside is `background: transparent` to let the blur show through
- F7 dark mode: `<html>` gets both `data-theme="dark"` and `.dark` class — `useTheme.js` and `main.js` both toggle the class
- Nav separator between sibling page links uses adjacent sibling selectors (see Topbar section) — do not put `border-left` directly on `.nav-sibling-link` base rule

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
Mark projects as "in focus" via a `sprint::focus` Todoist label. Toggle from the card modal. Visual treatment TBD. Clear all focus labels at sprint start.

### Ideas column (zero effort — config only)
Add `stage::idea` to stage configuration. No code change needed.

### Quick-add project (medium effort)
A "+" action that creates a new sub-project under "Research". Requires `POST /projects` with `parent_id` (Research root ID is already found in `displayProjects` computed).

### Global quick-add task (small effort)
Add a task to any project from anywhere without opening the modal.

## Key localStorage Keys

| Key                | Value                                   |
|--------------------|-----------------------------------------|
| `rb_token`         | Todoist API token                       |
| `rb_stages`        | JSON array of `{name, label}`           |
| `rb_theme`         | `"auto"` / `"light"` / `"dark"`        |
| `rb_hotcrp_sites`  | JSON array of `{id, url, token, name}`  |
| `rb_hotcrp_proxy`  | CORS proxy URL string                   |
