# Research Board

A PWA for tracking research projects through your pipeline, backed by Todoist.

## Deploy to GitHub Pages

1. Create a new repo (or use existing): `github.com/YOURNAME/research-board`
2. Push these files:
   ```
   git init
   git add .
   git commit -m "Research board PWA"
   git remote add origin git@github.com:YOURNAME/research-board.git
   git push -u origin main
   ```
3. Go to repo Settings → Pages → Source: `main` branch, `/ (root)`
4. Visit `https://YOURNAME.github.io/research-board/`

## Install as app

**Mac (Chrome):** Address bar → install icon (⊕) → opens as standalone window  
**iPad/iPhone:** Safari → Share → Add to Home Screen (must use Safari)  
**Chrome on iPad:** doesn't support Add to Home Screen — use Safari

## First-time setup

1. Get your Todoist API token: Settings → Integrations → Developer
2. Paste it on the token screen
3. Configure which Todoist labels map to stages (edit names + exact label names)
4. Done — board loads automatically on every visit

## Stage convention

The app looks for a task in each project that has one of your stage labels.
Your existing `Stage: Writing` or equivalent pinned tasks work as-is —
just make sure the Todoist label name in the config matches exactly.

## Keyboard shortcuts

- `R` — refresh data
- `Escape` — close modal/panel

## Updating

After making changes: `git add . && git commit -m "update" && git push`  
GitHub Pages redeploys in ~30 seconds.

## Notes

- Token stored in browser localStorage, never sent anywhere except Todoist's API
- Offline: loads last cached state via service worker
- Todoist deep link in project modal opens the project directly in the Todoist app
