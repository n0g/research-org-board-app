# Research Board App

A single-file PWA that displays Todoist research projects as a Kanban board, organized by pipeline stage.

## Tech Stack

- Single HTML file (`index.html`) — no build step, no dependencies
- Vanilla JS + CSS custom properties
- Todoist REST API v1 (`https://api.todoist.com/api/v1`)
- Service worker (`sw.js`) for offline/PWA support — **network-first** strategy so reloads always get the latest version
- Hosted on GitHub Pages

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
- **Task list** — tasks in `📌 Current Status` and `📌 Deadlines` sections are excluded; only real todos are shown

## Theme

Three modes: **auto** (follows OS), **light**, **dark**. Stored in `localStorage` as `rb_theme`. A no-FOUC inline script in `<head>` applies the theme before first render. Toggle cycles auto → light → dark → auto.

## Service Worker

Cache name must be bumped (e.g. `rb-v11` → `rb-v12`) with every deployment to force Safari to pick up the new version. The network-first fetch strategy means a plain reload is sufficient once the new SW is active.

## Key localStorage Keys

| Key         | Value                        |
|-------------|------------------------------|
| `rb_token`  | Todoist API token            |
| `rb_stages` | JSON array of `{name, label}` |
| `rb_theme`  | `"auto"` / `"light"` / `"dark"` |
