# Research Board

A PWA that turns your Todoist research projects into a Kanban pipeline board. Designed for academic researchers who want a live overview of all their projects across writing, submission, revision, and review stages — on desktop, tablet, and mobile.

## What it does

- **Pipeline board** — one column per stage (Planning → Data Collection → Preparing → Revision → Awaiting Reviews → On Ice). Projects move between stages by updating a label in Todoist.
- **Project detail** — tap any card to open a split-panel view: metadata on the left (collaborators, status, venue, deadline, submission link, summary), task list on the right.
- **Task management** — view and complete open tasks per project; quick-add new tasks inline.
- **Stale indicator** — cards whose status hasn't been updated in more than 14 days show a `!` badge.
- **HotCRP integration** — if a project has a submission URL pointing to a configured HotCRP instance, the app fetches and displays the submission status (draft / submitted / accepted / rejected) on both the card and the detail page.
- **Settings sync** — stage configuration and HotCRP settings are synced to a Todoist project so they follow you across devices.
- **PWA** — installable on Mac, iPad, and iPhone; works offline using the last cached data.

## Todoist setup

The app expects a specific structure in Todoist. You need to set this up once before using the app.

### 1. Create a "Research" project

Create a top-level Todoist project named exactly **Research**. All your research sub-projects live inside it.

### 2. Create stage labels

Create Todoist labels with these exact names (or configure custom ones in the app):

| Stage            | Label                        |
|------------------|------------------------------|
| Planning         | `stage::planning`            |
| Data Collection  | `stage::data-collection`     |
| Preparing        | `stage::preparing-to-submit` |
| Revision         | `stage::revision`            |
| Awaiting Reviews | `stage::under-submission`    |
| On Ice           | `stage::on-ice`              |

### 3. Structure each research project

Each sub-project under Research needs three sections:

- **📌 Current Status** — one task whose label is the current stage label (e.g. `stage::preparing-to-submit`). Add collaborator names as additional labels on this task. The task content is the status description shown on the card.
- **📌 Deadlines** — deadline tasks (excluded from the main task list).
- **📌 Submission** — one task whose content is the HotCRP submission URL (optional).

Any other sections and tasks appear in the task list on the project detail page.

### 4. Create a settings project

Create a top-level Todoist project named exactly **Research Runway Settings**. The app uses this to sync your stage configuration and HotCRP settings across devices. You don't need to add anything to it manually.

## Deploy to GitHub Pages

1. Fork or clone this repo, then push to your own GitHub account.
2. Go to repo **Settings → Pages → Source**: `main` branch, `/ (root)`.
3. Wait ~30 seconds for the first deploy.
4. Visit `https://YOURNAME.github.io/REPONAME/`.

## Install as app

**Mac (Chrome or Edge):** Address bar → install icon (⊕) → opens as a standalone window.  
**iPad / iPhone:** Safari → Share → **Add to Home Screen**. Must use Safari — Chrome on iOS does not support PWA installation.

## First-time setup

1. Get your Todoist API token: Todoist **Settings → Integrations → Developer**.
2. Open the app and paste your token on the welcome screen.
3. The board loads automatically. Stages use the default label mapping — change them via **Settings → Reconfigure stages** if needed.

## HotCRP setup (optional)

If you review papers on a HotCRP instance, the app can show submission and review statuses.

1. **Set up a CORS proxy** — browsers can't call HotCRP directly. Deploy the Cloudflare Worker below, then paste the worker URL in **Settings → Reviews → CORS Proxy URL**.

2. **Add your HotCRP site** — in **Settings → Reviews**, add your HotCRP base URL and API token (get it from your HotCRP profile page).

3. **Add submission URLs** — in the project detail page, paste the full HotCRP paper URL (e.g. `https://your-conference.hotcrp.com/paper/42`) into the Submission field.

### Cloudflare Worker (CORS proxy)

Create a new Worker at [dash.cloudflare.com](https://dash.cloudflare.com) with this code:

```js
export default {
  async fetch(request) {
    const { searchParams } = new URL(request.url)
    const target = searchParams.get('url')
    const token = searchParams.get('token')

    if (!target) return new Response('Missing url param', { status: 400 })

    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET',
          'Access-Control-Allow-Headers': '*',
        }
      })
    }

    const headers = {}
    if (token) headers['Authorization'] = `Bearer ${token}`

    const response = await fetch(target, { headers })
    const body = await response.text()

    return new Response(body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    })
  }
}
```

## Keyboard shortcuts

| Key | Action         |
|-----|----------------|
| `R` | Refresh data   |

## Notes

- Your Todoist token is stored in browser `localStorage` and only ever sent to `api.todoist.com`.
- The app works offline — the service worker caches the last loaded state.
- Tapping the Todoist link in a project detail opens that project directly in the Todoist app.
- Theme (light/dark/auto) and accent color are per-device and not synced.
