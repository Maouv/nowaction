/* NOWACTION — extracted from public/index.html (lines 565-1132 of the original monolithic file).
   Classic script (no ES modules) — relies on shared global scope with the other js/*.js files,
   loaded in the same order they appear in index.html. Do not reorder the <script> tags. */

      let shapes = [];
      let selectedShapeId = null;
      let selectedShapeIds = new Set();
      let clipboardShapes = [];
      let attachedImageBase64 = null;
      let pendingImageX = 0;
      let pendingImageY = 0;
      let activeTool = 'select'; // 'select' | 'rectangle' | 'circle' | 'text' | 'image'
      let panX = 0;
      let panY = 0;
      let scale = 1.0;
      let shapeCounter = { rectangle: 0, circle: 0, text: 0, image: 0 };
      let groups = {}; // groupId -> { name }

      // Multi-project state (Phase 2)
      const DEFAULT_SHAPE_COUNTER = { rectangle: 0, circle: 0, text: 0, image: 0 };
      let currentProjectId = null;
      let currentActiveSessionId = null; // AI session belonging to the current project, if any
      let projectsCache = [];
      let isSwitchingProject = false;

      // Touch & mouse (Pointer Event) parameters
      const activePointers = new Map();
      let dragMode = null; // 'pan' | 'drag' | 'resize' | 'zoom'
      let dragShapeId = null;
      const dragGroupStartPositions = new Map(); // sid -> {x, y} snapshot for group-aware drag
      let startPanX = 0, startPanY = 0;
      let startShapeX = 0, startShapeY = 0;
      let startShapeW = 0, startShapeH = 0;
      let startScale = 1;
      let initialDistance = 0;
      let initialMidpoint = { x: 0, y: 0 };
      let midWorldX = 0, midWorldY = 0;
      let hasMoved = false;
      let startPointerX = 0, startPointerY = 0;

      // Text edit locking to disable drag & pan during editing
      let isEditingText = false;

      // Google Font library declarations
      const defaultFonts = [
        { name: 'Poppins', url: 'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;700&display=swap' },
        { name: 'Lobster', url: 'https://fonts.googleapis.com/css2?family=Lobster&display=swap' },
        { name: 'Playfair Display', url: 'https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap' },
        { name: 'Space Grotesk', url: 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300..700&display=swap' }
      ];
      let customFonts = JSON.parse(localStorage.getItem('graps_custom_fonts') || 'null') || defaultFonts;

      function loadAllCustomFonts() {
        // Clear any previously injected custom font links to avoid duplicates
        document.querySelectorAll('.custom-font-link').forEach(el => el.remove());
        
        customFonts.forEach(font => {
          if (font.url) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.className = 'custom-font-link';
            link.href = font.url;
            document.head.appendChild(link);
          }
        });
      }

      // DOM Elements cache
      const canvasViewport = document.getElementById('canvas-viewport');
      const canvasWorld = document.getElementById('canvas-world');
      const zoomDisplay = document.getElementById('zoom-display');
      const btnResetView = document.getElementById('btn-reset-view');
      const btnExportTop = document.getElementById('btn-export-top');
      const btnPreviewTop = document.getElementById('btn-preview-top');
      const exportModal = document.getElementById('export-modal');
      const btnCloseModal = document.getElementById('btn-close-modal');

      // Projects modal elements (Phase 2)
      const btnCurrentProject = document.getElementById('btn-current-project');
      const currentProjectNameEl = document.getElementById('current-project-name');
      const projectsModal = document.getElementById('projects-modal');
      const btnCloseProjectsModal = document.getElementById('btn-close-projects-modal');
      const btnNewProject = document.getElementById('btn-new-project');
      const projectsSearchInput = document.getElementById('projects-search-input');
      const projectsListEl = document.getElementById('projects-list');

      // Session history modal elements (Phase 4)
      const sessionsModal = document.getElementById('sessions-modal');
      const btnCloseSessionsModal = document.getElementById('btn-close-sessions-modal');
      const sessionsListEl = document.getElementById('sessions-list');

      function loadDefaultShapes() {
        shapes = [
          {
            id: 'sh-1',
            type: 'rectangle',
            name: 'Rectangle 1',
            x: -160,
            y: -140,
            w: 140,
            h: 100,
            fill: '#2563eb',
            strokeWidth: 2,
            strokeColor: '#3b82f6',
            borderRadius: 8,
            blur: 0,
            opacity: 100,
            rotation: 0,
            locked: false
          },
          {
            id: 'sh-2',
            type: 'circle',
            name: 'Circle 1',
            x: 40,
            y: -140,
            w: 120,
            h: 120,
            fill: '#10b981',
            strokeWidth: 0,
            strokeColor: '#059669',
            borderRadius: 0, // unused for circle
            blur: 0,
            opacity: 90,
            rotation: 0,
            locked: false
          },
          {
            id: 'sh-3',
            type: 'text',
            name: 'Text 1',
            x: -160,
            y: 20,
            w: 320,
            h: 80,
            fill: 'transparent',
            strokeWidth: 0,
            strokeColor: '#334155',
            borderRadius: 6,
            blur: 0,
            opacity: 100,
            rotation: 0,
            locked: false,
            fontSize: 16,
            textColor: '#f8fafc',
            fontFamily: 'Inter, sans-serif',
            text: 'Tap a tool then tap canvas to add shapes.\nDouble-tap text to edit its content!'
          }
        ];
        shapeCounter = { rectangle: 1, circle: 1, text: 1 };
      }

      function resetViewToCenter() {
        const rect = canvasViewport.getBoundingClientRect();
        // Place world 0,0 directly in the center of the viewport
        panX = rect.width / 2;
        panY = rect.height / 2;
        scale = 1.0;
        render();
      }

      // Dual-persistence state saver (Local Browser + Server File Database)
      // Phase 2: now project-aware. Saves always target the currently active
      // project (currentProjectId) via PUT /api/projects/:id, plus the active
      // AI session's messages via PUT /api/projects/:id/sessions/:sessionId
      // when one exists. The old global POST /api/save-project shim from
      // Phase 1 is no longer in this critical path — it's kept in server.js
      // purely for legacy/manual back-compat, not called from the UI anymore.
      let saveTimeout = null;
      let pendingSaveData = null; // { payload, messagesPayload } not yet confirmed saved to the server
      let pendingSaveProjectId = null; // snapshot of WHICH project pendingSaveData belongs to
      let pendingSaveSessionId = null; // snapshot of WHICH session pendingSaveData's messages belong to (if any)

      /* flushSaveToServer — does the actual network save for a given project/session.
         Takes projectId/sessionId as explicit params (not read from "current" globals)
         so a save that was queued for project A can never accidentally land on
         project B if the user switched projects while it was in flight/pending. */
      async function flushSaveToServer(projectId, sessionId, payload, messagesPayload, indicator) {
        if (!projectId) return false;
        try {
          const projRes = await fetch(`/api/projects/${projectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!projRes.ok) throw new Error('Server returned non-OK status for project save');

          if (sessionId) {
            const sessRes = await fetch(`/api/projects/${projectId}/sessions/${sessionId}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messages: messagesPayload })
            });
            if (!sessRes.ok) throw new Error('Server returned non-OK status for session save');
          }

          // Only clear the pending markers if they still point at this exact
          // save — avoids clobbering a newer pending save queued in the meantime.
          if (pendingSaveProjectId === projectId && pendingSaveSessionId === sessionId) {
            pendingSaveData = null;
            pendingSaveProjectId = null;
            pendingSaveSessionId = null;
          }

          if (indicator) {
            indicator.innerHTML = `
              <span class="inline-flex items-center text-[10px] font-mono text-emerald-400/80">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                Autosaved to Cloud & Local
              </span>
            `;
            setTimeout(() => {
              if (indicator && indicator.innerText.includes('Autosaved')) {
                indicator.innerHTML = '';
              }
            }, 3000);
          }
          return true;
        } catch (e) {
          console.warn('Failed server-side save, fallback to local only:', e);
          if (indicator) {
            indicator.innerHTML = `
              <span class="inline-flex items-center text-[10px] font-mono text-amber-500/80" title="Failed to sync to cloud server, changes saved in browser">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                Local Only (Offline)
              </span>
            `;
          }
          return false;
        }
      }

      async function saveProjectState() {
        // 1. Instantly save to local browser storage (still global/unscoped —
        // Phase 4 makes resume-on-refresh project-scoped; not needed yet
        // since Phase 2 only handles in-app switching, not reload).
        localStorage.setItem('graps_designer_shapes_v1', JSON.stringify(shapes));
        localStorage.setItem('graps_designer_counter_v1', JSON.stringify(shapeCounter));
        localStorage.setItem('graps_designer_groups_v1', JSON.stringify(groups));
        localStorage.setItem('graps_ai_settings_v1', JSON.stringify(aiSettings));
        localStorage.setItem('graps_ai_messages_v1', JSON.stringify(aiMessages));

        // Update indicator text in header
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
          indicator.innerHTML = `
            <span class="inline-flex items-center text-[10px] font-mono text-emerald-400">
              <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse mr-1.5"></span>
              Menyimpan...
            </span>
          `;
        }

        const payload = { shapes, shapeCounter, groups, aiSettings };
        const messagesPayload = aiMessages;

        // Snapshot exactly which project/session this save is for, captured
        // NOW (synchronously) rather than re-read at flush time. This is what
        // makes switchToProject()'s force-flush and the unload beacon safe:
        // even if the user switches projects mid-debounce, this save still
        // knows unambiguously where it belongs.
        pendingSaveData = { payload, messagesPayload };
        pendingSaveProjectId = currentProjectId;
        pendingSaveSessionId = currentActiveSessionId;

        // Debounce server autosave to prevent spamming HTTP requests on rapid actions (e.g. dragging)
        if (saveTimeout) clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
          flushSaveToServer(currentProjectId, currentActiveSessionId, payload, messagesPayload, indicator);
        }, 1000);
      }

      // Force-send any not-yet-confirmed save to the server the moment the
      // page is about to be hidden/closed/refreshed. sendBeacon is used
      // instead of fetch because in-flight fetch requests can get cancelled
      // when the page unloads, while sendBeacon is designed by the browser
      // specifically to survive that. sendBeacon only supports POST, so this
      // targets a dedicated POST beacon-save endpoint rather than the PUT
      // endpoints flushSaveToServer() uses.
      function flushPendingSaveOnUnload() {
        if (!pendingSaveData || !pendingSaveProjectId) return;
        try {
          const body = {
            ...pendingSaveData.payload,
            sessionId: pendingSaveSessionId || undefined,
            messages: pendingSaveSessionId ? pendingSaveData.messagesPayload : undefined
          };
          const blob = new Blob([JSON.stringify(body)], { type: 'application/json' });
          navigator.sendBeacon(`/api/projects/${pendingSaveProjectId}/beacon-save`, blob);
        } catch (e) {
          // Best effort only — nothing more can be done once the page is unloading.
        }
        pendingSaveData = null;
        pendingSaveProjectId = null;
        pendingSaveSessionId = null;
      }
      window.addEventListener('pagehide', flushPendingSaveOnUnload);
      window.addEventListener('beforeunload', flushPendingSaveOnUnload);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') flushPendingSaveOnUnload();
      });

      function saveToLocalStorage() {
        saveProjectState();
      }

      /* ===== Projects modal / switching (Phase 2) ===== */

      /* escapeHtml — minimal defensive escaping for user-typed project names rendered via innerHTML */
      function escapeHtml(str) {
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;');
      }

      /* formatUpdatedAt */
      function formatUpdatedAt(iso) {
        if (!iso) return '';
        try {
          return new Date(iso).toLocaleString();
        } catch (e) {
          return '';
        }
      }

      /* updateCurrentProjectPill */
      function updateCurrentProjectPill(name) {
        if (currentProjectNameEl) currentProjectNameEl.textContent = name || 'Untitled Project';
      }

      /* setProjectSwitchUiBusy — disables the pill + list while a switch/flush is in flight */
      function setProjectSwitchUiBusy(busy) {
        if (btnCurrentProject) btnCurrentProject.disabled = busy;
        if (btnNewProject) btnNewProject.disabled = busy;
        if (projectsListEl) projectsListEl.classList.toggle('opacity-50', busy);
        if (projectsListEl) projectsListEl.classList.toggle('pointer-events-none', busy);
      }

      /* fetchProjectsList */
      async function fetchProjectsList() {
        try {
          const res = await fetch('/api/projects');
          const result = await res.json();
          projectsCache = (result && result.data) || [];
        } catch (e) {
          console.warn('Failed to fetch projects list:', e);
          projectsCache = [];
        }
        renderProjectsList(projectsSearchInput ? projectsSearchInput.value : '');
      }

      /* renderProjectsList — simple client-side name filter + most-recently-updated first */
      function renderProjectsList(filterText = '') {
        if (!projectsListEl) return;
        const term = filterText.trim().toLowerCase();
        const filtered = !term
          ? projectsCache
          : projectsCache.filter((p) => (p.name || '').toLowerCase().includes(term));
        const sorted = [...filtered].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        if (sorted.length === 0) {
          projectsListEl.innerHTML = `<p class="text-xs text-textSec text-center py-6">No projects found.</p>`;
          return;
        }

        projectsListEl.innerHTML = sorted
          .map(
            (p) => `
          <button data-project-id="${p.id}" class="w-full text-left px-3 py-2.5 rounded border ${
              p.id === currentProjectId ? 'border-accent bg-accent/10' : 'border-border bg-bg/40 hover:bg-border/60'
            } transition-colors flex items-center justify-between space-x-2 cursor-pointer">
            <span class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-text truncate">${escapeHtml(p.name)}</span>
              <span class="text-[10px] font-mono text-textSec">${formatUpdatedAt(p.updatedAt)}</span>
            </span>
            ${p.id === currentProjectId ? '<i class="codicon codicon-check text-accent text-sm shrink-0"></i>' : ''}
          </button>
        `
          )
          .join('');

        projectsListEl.querySelectorAll('[data-project-id]').forEach((btn) => {
          btn.addEventListener('click', () => switchToProject(btn.getAttribute('data-project-id')));
        });
      }

      /* openProjectsModal */
      function openProjectsModal() {
        if (projectsSearchInput) projectsSearchInput.value = '';
        projectsModal.classList.remove('hidden');
        fetchProjectsList();
      }

      /* closeProjectsModal */
      function closeProjectsModal() {
        projectsModal.classList.add('hidden');
      }

      /* createNewProject */
      async function createNewProject() {
        const name = prompt('Project name:', 'Untitled Project');
        if (name === null) return; // user cancelled
        const trimmed = name.trim() || 'Untitled Project';

        setProjectSwitchUiBusy(true);
        try {
          const res = await fetch('/api/projects', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: trimmed })
          });
          if (!res.ok) throw new Error('Server returned non-OK status');
          const created = await res.json();
          await switchToProject(created.id);
        } catch (e) {
          console.error('Create Project Error:', e);
          alert('Gagal membuat project baru. Coba lagi.');
        } finally {
          setProjectSwitchUiBusy(false);
        }
      }

      /* switchToProject — force-flushes any pending save for the CURRENT
         project first (so in-flight edits never get silently lost or land
         in the wrong project's file), then loads and swaps in the target
         project's full state. */
      async function switchToProject(projectId) {
        if (isSwitchingProject) return;
        if (projectId === currentProjectId) {
          closeProjectsModal();
          return;
        }

        isSwitchingProject = true;
        setProjectSwitchUiBusy(true);

        try {
          // 1. Force-flush any pending save for the project we're LEAVING.
          if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
          }
          if (pendingSaveData && pendingSaveProjectId) {
            const indicator = document.getElementById('save-indicator');
            const ok = await flushSaveToServer(
              pendingSaveProjectId,
              pendingSaveSessionId,
              pendingSaveData.payload,
              pendingSaveData.messagesPayload,
              indicator
            );
            if (!ok) {
              const proceed = confirm(
                'Gagal menyimpan project sebelumnya. Tetap pindah project? Perubahan yang belum tersimpan akan hilang.'
              );
              if (!proceed) {
                return; // abort switch, stay on current project — pendingSaveData is left intact to retry later
              }
              // User explicitly accepted the loss — clear it so it doesn't
              // wrongly get retried against the NEW project later.
              pendingSaveData = null;
              pendingSaveProjectId = null;
              pendingSaveSessionId = null;
            }
          }

          // 2. Load the target project's full state.
          const res = await fetch(`/api/projects/${projectId}`);
          if (!res.ok) throw new Error('Failed to load selected project.');
          const result = await res.json();
          const project = result.data;

          let messages = defaultWelcomeMessages();
          if (project.activeSessionId) {
            try {
              const sRes = await fetch(`/api/projects/${projectId}/sessions/${project.activeSessionId}`);
              if (sRes.ok) {
                const sResult = await sRes.json();
                messages = (sResult.data && sResult.data.messages) || messages;
              }
            } catch (e) {
              console.warn('Failed to load session for switched project:', e);
            }
          }

          // 3. Swap in-memory state.
          currentProjectId = project.id;
          currentActiveSessionId = project.activeSessionId || null;
          shapes = project.shapes || [];
          shapeCounter = project.shapeCounter || { ...DEFAULT_SHAPE_COUNTER };
          groups = project.groups || {};
          aiSettings = project.aiSettings || { provider: 'gemini', apiKey: '', baseUrl: '', model: '' };
          aiMessages = messages;
          selectedShapeId = null;
          selectedShapeIds.clear();
          localStorage.setItem(LAST_PROJECT_STORAGE_KEY, currentProjectId);

          updateCurrentProjectPill(project.name);
          populateAiSettingsInputs();
          render();
          renderLayersList();
          updatePropertiesPanel();
          renderAiMessages();

          closeProjectsModal();
        } catch (e) {
          console.error('Switch Project Error:', e);
          alert('Gagal memuat project yang dipilih. Coba lagi.');
        } finally {
          isSwitchingProject = false;
          setProjectSwitchUiBusy(false);
        }
      }

      // Manual project backup download
      function downloadBackupProjectFile() {
        const data = {
          shapes,
          shapeCounter,
          groups,
          aiMessages,
          aiSettings,
          version: 'graps_v1',
          exportedAt: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `graps_project_backup_${new Date().toISOString().slice(0,10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      // Manual project backup import
      window.importProjectFile = function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async function(e) {
          try {
            const data = JSON.parse(e.target.result);
            if (data.shapes && Array.isArray(data.shapes)) {
              shapes = data.shapes;
              shapeCounter = data.shapeCounter || { rectangle: shapes.filter(x => x.type === 'rectangle').length, circle: shapes.filter(x => x.type === 'circle').length, text: shapes.filter(x => x.type === 'text').length };
              groups = data.groups || {};
              aiMessages = data.aiMessages || aiMessages;
              aiSettings = data.aiSettings || aiSettings;
              
              saveProjectState();
              render();
              renderAiMessages();
              renderLayersList();
              if (typeof updatePropertiesPanel === 'function') updatePropertiesPanel();
              
              alert('Project backup successfully imported! Synchronizing with cloud...');
              closeExportModal();
            } else {
              alert('Invalid .json file format for NOWACTION project.');
            }
          } catch (err) {
            alert('Failed to read JSON file: ' + err.message);
          }
        };
        reader.readAsText(file);
      };


