# AGENTS.md

Vanilla JS motion-website builder. Express server + classic `<script>` frontend. **No build step, no bundler, no framework, no tests.**

## Commands

```bash
npm run dev        # node server.js, serves http://localhost:3000
npm run check      # syntax-check ONLY: server.js, public/js/motion-app.js, public/js/motion-export-runtime.js
```

- `npm run lint` is a **no-op placeholder** — there is no linter.
- `npm run check` does NOT cover the legacy editor files (`state-and-projects.js`, `events-and-export.js`, `shapes-and-interaction.js`, `render-and-panels.js`, `ai-copilot.js`, `app-init.js`, `scroll-anim-*.js`). After editing any of those, syntax-check manually: `node --check public/js/<file>.js`.
- No test framework exists. Verification is `npm run check` plus manual browser smoke tests at a `390 × 844` viewport.
- Frontend edits just need a browser refresh. `server.js` changes require restarting the process.

## Two frontends

- `/` — the current editor. Single self-contained file: `public/js/motion-app.js` (~2800 lines, IIFE, no imports). All editor logic lives there; `public/index.html` loads only it. Export compiler lives in `public/js/motion-export-runtime.js` (the runtime embedded in exported HTML).
- `/legacy.html` — legacy editor + AI Copilot. Split across `public/js/state-and-projects.js` → `events-and-export.js` → `shapes-and-interaction.js` → `render-and-panels.js` → `ai-copilot.js` → `app-init.js` → `scroll-anim-runtime.js` → `scroll-anim-ui.js`, loaded in that strict order (classic globals, no modules). Match that order when touching them.

## Persistence & API

- Projects are JSON files on disk (no DB): `data/projects/<uuid>.json`, sessions in `data/projects/<uuid>/sessions/<uuid>.json`, plus `data/projects.index.json` and per-project `sessions.index.json`. Project payload includes `schemaVersion: 3`, `viewport`, `canvasConfig`, `background`.
- Migration runs once at boot: if `project_data.json` exists and `data/projects/` doesn't, it creates `data/projects/legacy-default.json` and renames the file to `project_data.json.migrated` (committed archive). `legacyMigrationDone` is derived from the file's existence, never from `project_data.json`.
- Current UI uses the new endpoints directly: `GET/PUT /api/projects/:id`, sessions under `/api/projects/:id/sessions`, `POST /api/projects/:id/beacon-save` (sendBeacon). Do not assume the frontend uses the legacy shims.
- Legacy shims `POST /api/save-project` and `GET /api/load-project` still work but route to `legacy-default` after migration; they exist for back-compat only.
- `POST /api/ai-proxy` is provider-agnostic (gemini / anthropic / openai-compatible). No local key required — it falls back to `GEMINI_API_KEY` / `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` env vars (see `.env.example`). It forces `stream: false` and normalizes non-standard shapes (SSE, Ollama, `data.data` envelope) into `{ choices: [{ message: { role, content } }] }`.
- `server.js` has a catch-all `app.get('*')` serving `index.html` for any unmatched route, so adding new HTML files under `public/` is fine but unknown routes resolve to the SPA.

## Domain notes

- Editor is mobile-first: fixed `390 × 844` preview viewport; document scroll position is the global playhead.
- Keyframes use normalized global `at` positions (0–1). Legacy projects with `p` positions are migrated in the browser on load.
- The selected-layer `</>` Code action runs through the same export compiler as full export — never copy editor DOM into generated code.
- Grouping uses flat `groupId` semantics (deliberate; structural nested groups are backlog).

## Write style
- no docstring
- preffer minimal coding but works
