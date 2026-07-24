/* NOWACTION — extracted from public/index.html (lines 3792-3972 of the original monolithic file).
   Classic script (no ES modules) — relies on shared global scope with the other js/*.js files,
   loaded in the same order they appear in index.html. Do not reorder the <script> tags. */

      const LAST_PROJECT_STORAGE_KEY = 'nowaction_last_project_id';

      /* resolveInitialProjectId — Phase 4: the explicit "last active project"
         preference (set every time the user loads/switches/creates a
         project) now takes priority. Falls back to the Phase 2 heuristic
         chain (legacy-default → most recently updated → auto-create) for
         first-ever loads or if the remembered project no longer exists. */
      async function resolveInitialProjectId() {
        const lastProjectId = localStorage.getItem(LAST_PROJECT_STORAGE_KEY);
        if (lastProjectId) {
          try {
            const res = await fetch(`/api/projects/${lastProjectId}`);
            if (res.ok) {
              const result = await res.json();
              if (result.success) return lastProjectId;
            }
          } catch (e) {
            // remembered project unreachable/deleted — fall through
          }
        }

        try {
          const legacyRes = await fetch('/api/projects/legacy-default');
          if (legacyRes.ok) {
            const legacyResult = await legacyRes.json();
            if (legacyResult.success) return 'legacy-default';
          }
        } catch (e) {
          // fall through to project list
        }

        const listRes = await fetch('/api/projects');
        if (!listRes.ok) throw new Error('Failed to list projects');
        const listResult = await listRes.json();
        const list = (listResult && listResult.data) || [];

        if (list.length > 0) {
          const sorted = [...list].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
          return sorted[0].id;
        }

        // Totally fresh install, no projects at all yet — create one.
        const createRes = await fetch('/api/projects', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: 'My First Project' })
        });
        if (!createRes.ok) throw new Error('Failed to auto-create default project');
        const created = await createRes.json();
        return created.id;
      }

      async function startApp() {
        loadAllCustomFonts();
        
        // Center view initially centered in viewport
        resetViewToCenter();

        // Bind layout events
        setupEventListeners();
        setupMobileTabs();
        setupAiEventListeners();

        // Show loading status in the top bar indicator
        const indicator = document.getElementById('save-indicator');
        if (indicator) {
          indicator.innerHTML = `
            <span class="inline-flex items-center text-[10px] font-mono text-textSec animate-pulse">
              <span class="w-1.5 h-1.5 rounded-full bg-textSec mr-1.5"></span>
              Menghubungkan...
            </span>
          `;
        }

        let loadedFromServer = false;

        try {
          const projectId = await resolveInitialProjectId();
          const projRes = await fetch(`/api/projects/${projectId}`);
          if (!projRes.ok) throw new Error('Failed to load project');
          const projResult = await projRes.json();
          const project = projResult.data;

          currentProjectId = project.id;
          currentActiveSessionId = project.activeSessionId || null;
          shapes = project.shapes || [];
          shapeCounter = project.shapeCounter || { ...DEFAULT_SHAPE_COUNTER };
          groups = project.groups || {};
          aiSettings = project.aiSettings || aiSettings;
          localStorage.setItem(LAST_PROJECT_STORAGE_KEY, currentProjectId);

          if (currentActiveSessionId) {
            try {
              const sessRes = await fetch(`/api/projects/${projectId}/sessions/${currentActiveSessionId}`);
              if (sessRes.ok) {
                const sessResult = await sessRes.json();
                aiMessages = (sessResult.data && sessResult.data.messages) || aiMessages;
              }
            } catch (e) {
              console.warn('Failed to load active session messages:', e);
            }
          }

          updateCurrentProjectPill(project.name);
          loadedFromServer = true;

          if (indicator) {
            indicator.innerHTML = `
              <span class="inline-flex items-center text-[10px] font-mono text-emerald-400">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
                Sinkronisasi Cloud Aktif
              </span>
            `;
            setTimeout(() => {
              if (indicator && indicator.innerText.includes('Cloud Aktif')) {
                indicator.innerHTML = '';
              }
            }, 3500);
          }
        } catch (e) {
          console.warn('Server connection failed, falling back to local storage:', e);
        }

        // Fallback to local storage / built-in defaults if the server (or
        // every project endpoint above) is unreachable.
        if (!loadedFromServer) {
          const saved = localStorage.getItem('graps_designer_shapes_v1');
          const savedCounter = localStorage.getItem('graps_designer_counter_v1');
          const savedGroups = localStorage.getItem('graps_designer_groups_v1');
          
          if (saved) {
            try {
              shapes = JSON.parse(saved);
              if (savedCounter) shapeCounter = JSON.parse(savedCounter);
              groups = savedGroups ? JSON.parse(savedGroups) : {};
            } catch (e) {
              groups = {};
              loadDefaultShapes();
            }
          } else {
            groups = {};
            loadDefaultShapes();
          }

          // Load local AI state
          loadAiState();
          updateCurrentProjectPill('Offline (Local Only)');

          if (indicator) {
            indicator.innerHTML = `
              <span class="inline-flex items-center text-[10px] font-mono text-amber-500/80" title="Gagal tersambung ke database cloud server. Menggunakan database lokal browser Anda.">
                <span class="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                Penyimpanan Lokal Aktif
              </span>
            `;
            setTimeout(() => {
              if (indicator && indicator.innerText.includes('Penyimpanan Lokal')) {
                indicator.innerHTML = '';
              }
            }, 3500);
          }
        } else {
          // Sync local storage so it remains in sync with the server
          localStorage.setItem('graps_designer_shapes_v1', JSON.stringify(shapes));
          localStorage.setItem('graps_designer_counter_v1', JSON.stringify(shapeCounter));
          localStorage.setItem('graps_designer_groups_v1', JSON.stringify(groups));
          localStorage.setItem('graps_ai_settings_v1', JSON.stringify(aiSettings));
          localStorage.setItem('graps_ai_messages_v1', JSON.stringify(aiMessages));
        }

        // Populate settings inputs (provider/key/baseUrl/model for whichever project loaded)
        populateAiSettingsInputs();

        // Render everything
        render();
        renderAiMessages();
        renderLayersList();
        updatePropertiesPanel();
      }
      
      startApp();

