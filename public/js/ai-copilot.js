/* NOWACTION — extracted from public/index.html (lines 3048-3791 of the original monolithic file).
   Classic script (no ES modules) — relies on shared global scope with the other js/*.js files,
   loaded in the same order they appear in index.html. Do not reorder the <script> tags. */

      const AI_SYSTEM_PROMPT = `You are "NOWACTION Copilot", an AI design buddy for NOWACTION - a minimalist, mobile-first spec design tool.
The user is designing layout components (rectangles, circles, and text shapes).
You can generate and append shapes directly to the user's canvas by including a JSON block at the very end of your response.

To add shapes, output a JSON block enclosed in \`\`\`json and \`\`\` code fence.
Your JSON object MUST conform to this exact schema:
{
  "action": "add_shapes",
  "shapes": [
    {
      "type": "rectangle" | "circle" | "text",
      "name": "string (descriptive name)",
      "x": number (relative to world origin. standard visible viewport is roughly -200 to 200),
      "y": number (relative to world origin. standard visible viewport is roughly -250 to 250),
      "w": number (width in pixels),
      "h": number (height in pixels),
      "fill": "string (hex color like #3b82f6 or 'transparent')",
      "strokeWidth": number (0 to 10),
      "strokeColor": "string (hex color)",
      "borderRadius": number (0 to 50, only applicable for rectangle),
      "opacity": number (0 to 100),
      "fontSize": number (only for text, default 14),
      "textColor": "string (only for text, default #ffffff)",
      "text": "string (only for text, text content)",
      "fontFamily": "string (optional font family, e.g. 'Poppins', 'sans-serif', 'serif', 'Space Grotesk')"
    }
  ]
}

Example: If the user asks for a blue primary button, you can describe it briefly in human words, then append:
\`\`\`json
{
  "action": "add_shapes",
  "shapes": [
    {
      "type": "rectangle",
      "name": "Button Background",
      "x": -100,
      "y": 50,
      "w": 200,
      "h": 44,
      "fill": "#3b82f6",
      "strokeWidth": 0,
      "strokeColor": "transparent",
      "borderRadius": 8,
      "opacity": 100
    },
    {
      "type": "text",
      "name": "Button Label",
      "x": -100,
      "y": 50,
      "w": 200,
      "h": 44,
      "fill": "transparent",
      "strokeWidth": 0,
      "strokeColor": "transparent",
      "opacity": 100,
      "fontSize": 14,
      "textColor": "#ffffff",
      "text": "Get Started",
      "fontFamily": "sans-serif"
    }
  ]
}
\`\`\`

IMPORTANT INSTRUCTIONS:
1. Speak in English.
2. Keep your descriptions concise, helpful, and focused on design principles.
3. Keep the JSON shapes perfectly positioned so they overlap nicely (e.g. text shape directly overlapping its background rectangle shape with identical x, y, w, h).
4. Do not output anything after the \`\`\`json block. Keep the JSON code block clean and parsable.
`;

      let aiMessages = [
        { role: 'assistant', content: 'Hello! I am your NOWACTION design AI assistant. I can help you create layouts, write text content, or provide design suggestions!\n\nBy default, I use Google Gemini (free with your server API key, no key input required!). However, you can change the model/provider in the ⚙️ settings menu.' }
      ];
      
      let aiSettings = {
        provider: 'gemini',
        apiKey: '',
        baseUrl: '',
        model: ''
      };

      let isAiSidebarOpen = false;

      function loadAiState() {
        // Load settings
        const savedSettings = localStorage.getItem('graps_ai_settings_v1');
        if (savedSettings) {
          try {
            aiSettings = JSON.parse(savedSettings);
          } catch (e) {
            console.error(e);
          }
        }
        
        // Load messages
        const savedMessages = localStorage.getItem('graps_ai_messages_v1');
        if (savedMessages) {
          try {
            aiMessages = JSON.parse(savedMessages);
          } catch (e) {
            console.error(e);
          }
        }

        // Load sidebar toggle state
        isAiSidebarOpen = localStorage.getItem('graps_ai_sidebar_open') === 'true';
        updateAiSidebarVisibility();
        
        // Populate inputs
        populateAiSettingsInputs();
      }

      function saveAiState() {
        localStorage.setItem('graps_ai_settings_v1', JSON.stringify(aiSettings));
        localStorage.setItem('graps_ai_messages_v1', JSON.stringify(aiMessages));
        localStorage.setItem('graps_ai_sidebar_open', isAiSidebarOpen ? 'true' : 'false');
      }

      function populateAiSettingsInputs() {
        const provSelect = document.getElementById('ai-provider-select');
        const provSelectMob = document.getElementById('ai-provider-select-mobile');
        const keyInput = document.getElementById('ai-api-key-input');
        const keyInputMob = document.getElementById('ai-api-key-input-mobile');
        const baseInput = document.getElementById('ai-base-url-input');
        const baseInputMob = document.getElementById('ai-base-url-input-mobile');
        const modelInput = document.getElementById('ai-model-input');
        const modelInputMob = document.getElementById('ai-model-input-mobile');

        if (provSelect) provSelect.value = aiSettings.provider || 'gemini';
        if (provSelectMob) provSelectMob.value = aiSettings.provider || 'gemini';
        if (keyInput) keyInput.value = aiSettings.apiKey || '';
        if (keyInputMob) keyInputMob.value = aiSettings.apiKey || '';
        if (baseInput) baseInput.value = aiSettings.baseUrl || '';
        if (baseInputMob) baseInputMob.value = aiSettings.baseUrl || '';
        
        if (modelInput) modelInput.value = aiSettings.model || '';
        if (modelInputMob) modelInputMob.value = aiSettings.model || '';
      }

      function updateAiSidebarVisibility() {
        const sidebar = document.getElementById('ai-chat-sidebar');
        const toggleBtn = document.getElementById('btn-ai-copilot-toggle');
        if (isAiSidebarOpen) {
          sidebar.classList.remove('hidden');
          toggleBtn.classList.add('bg-accent/25', 'border-accent');
        } else {
          sidebar.classList.add('hidden');
          toggleBtn.classList.remove('bg-accent/25', 'border-accent');
        }
      }

      function extractJsonFromMessage(text) {
        if (!text) return null;
        const jsonRegex = /```json\s*([\s\S]*?)\s*```/;
        const match = text.match(jsonRegex);
        if (match) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed && parsed.action === 'add_shapes' && Array.isArray(parsed.shapes)) {
              return parsed.shapes;
            }
          } catch (e) {
            console.warn("Failed to parse JSON from AI message:", e);
          }
        }
        return null;
      }

      function renderMessageHtml(msg, index) {
        if (msg.role === 'user') {
          return `
            <div class="p-3 text-xs leading-relaxed rounded-l-lg rounded-br-lg self-end max-w-[85%] bg-accent/20 border border-accent/30 text-text">
              <span class="font-bold text-textSec text-[10px] font-mono uppercase tracking-wider block mb-1">Anda</span>
              <div>${msg.content.replace(/\n/g, '<br>')}</div>
            </div>
          `;
        } else {
          const shapesFromAi = extractJsonFromMessage(msg.content);
          // Remove the code fence from visual presentation
          const cleanText = msg.content.replace(/```json\s*[\s\S]*?\s*```/, '').trim();
          const formattedText = cleanText
            .replace(/\n/g, '<br>')
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

          let html = `
            <div class="p-3 text-xs leading-relaxed rounded-r-lg rounded-bl-lg self-start max-w-[85%] bg-border/40 border border-border/60 text-text">
              <span class="font-bold text-accent text-[10px] font-mono uppercase tracking-wider block mb-1">✨ NOWACTION Copilot</span>
              <div>${formattedText}</div>
          `;

          if (shapesFromAi && shapesFromAi.length > 0) {
            const listStr = shapesFromAi.map(s => `• ${s.name || s.type} (${s.type})`).join('<br>');
            const serializedShapes = JSON.stringify(shapesFromAi).replace(/"/g, '&quot;');
            html += `
              <div class="mt-2.5 p-2 bg-[#0d0d0d] border border-accent/20 rounded text-[11px] space-y-2">
                <div class="font-bold text-accent font-mono text-[9px] uppercase tracking-wider">📦 AI Layout Generated</div>
                <div class="text-textSec font-mono text-[9px] leading-snug">${listStr}</div>
                <button onclick="applyAiGeneratedShapes(${serializedShapes})" class="w-full py-1.5 bg-accent/20 hover:bg-accent/35 border border-accent/40 text-accent font-mono text-[10px] rounded transition-all font-bold flex items-center justify-center space-x-1 cursor-pointer">
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Apply to Canvas</span>
                </button>
              </div>
            `;
          }

          html += `</div>`;
          return html;
        }
      }

      function renderAiMessages() {
        const desktopList = document.getElementById('ai-messages-list');
        const mobileList = document.getElementById('ai-messages-list-mobile');

        if (desktopList) {
          desktopList.innerHTML = aiMessages.map((msg, idx) => renderMessageHtml(msg, idx)).join('');
          desktopList.scrollTop = desktopList.scrollHeight;
        }

        if (mobileList) {
          mobileList.innerHTML = aiMessages.map((msg, idx) => renderMessageHtml(msg, idx)).join('');
          mobileList.scrollTop = mobileList.scrollHeight;
        }
      }

      window.applyAiGeneratedShapes = function(shapesToInject) {
        if (!Array.isArray(shapesToInject)) return;
        
        // Find center of current viewport to place shapes
        const rect = canvasViewport.getBoundingClientRect();
        const worldCenterX = Math.round((rect.width / 2 - panX) / scale);
        const worldCenterY = Math.round((rect.height / 2 - panY) / scale);

        // Calculate bounding box of injected shapes
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        shapesToInject.forEach(s => {
          const x = s.x || 0;
          const y = s.y || 0;
          const w = s.w || 100;
          const h = s.h || 100;
          if (x < minX) minX = x;
          if (x + w > maxX) maxX = x + w;
          if (y < minY) minY = y;
          if (y + h > maxY) maxY = y + h;
        });

        const shapesCenterX = (minX + maxX) / 2;
        const shapesCenterY = (minY + maxY) / 2;

        const offsetX = isFinite(shapesCenterX) ? worldCenterX - shapesCenterX : 0;
        const offsetY = isFinite(shapesCenterY) ? worldCenterY - shapesCenterY : 0;

        shapesToInject.forEach((s, idx) => {
          const newId = `sh-ai-${Date.now()}-${idx}`;
          const targetX = Math.round((s.x || 0) + offsetX);
          const targetY = Math.round((s.y || 0) + offsetY);

          const newShape = {
            id: newId,
            type: s.type || 'rectangle',
            name: s.name || `${s.type.charAt(0).toUpperCase() + s.type.slice(1)} AI`,
            x: targetX,
            y: targetY,
            w: s.w || 120,
            h: s.h || 80,
            fill: s.fill || '#3b82f6',
            strokeWidth: s.strokeWidth !== undefined ? Number(s.strokeWidth) : 0,
            strokeColor: s.strokeColor || '#262626',
            borderRadius: s.borderRadius !== undefined ? Number(s.borderRadius) : 8,
            blur: s.blur !== undefined ? Number(s.blur) : 0,
            opacity: s.opacity !== undefined ? Number(s.opacity) : 100,
            locked: false
          };

          if (newShape.type === 'text') {
            newShape.fontSize = s.fontSize || 14;
            newShape.textColor = s.textColor || '#ffffff';
            newShape.fontFamily = s.fontFamily || 'sans-serif';
            newShape.text = s.text || 'Text Content';
          }

          shapes.push(newShape);
        });

        saveToLocalStorage();
        render();
        updatePropertiesPanel();
        renderLayersList();
        
        alert(`Berhasil menambahkan ${shapesToInject.length} elemen ke canvas!`);
      };

      /* ===== AI session creation, scoped to project (Phase 3) ===== */

      /* defaultWelcomeMessages — shared so a fresh project/new session shows
         the same friendly greeting instead of a blank chat panel. */
      function defaultWelcomeMessages() {
        return [
          {
            role: 'assistant',
            content:
              'Hello! I am your NOWACTION design AI assistant. I can help you create layouts, write text content, or provide design suggestions!\n\nBy default, I use Google Gemini (free with your server API key, no key input required!). However, you can change the model/provider in the ⚙️ settings menu.'
          }
        ];
      }

      /* createAiSessionOnServer */
      async function createAiSessionOnServer(name) {
        const res = await fetch(`/api/projects/${currentProjectId}/sessions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: name || 'New Session' })
        });
        if (!res.ok) throw new Error('Failed to create AI session');
        return res.json();
      }

      /* ensureActiveSession — lazily creates a session the first time a
         message is sent in a project that doesn't have one yet (e.g. a
         brand-new project from Phase 2 that was never explicitly given a
         "New Chat" click). Without this, that first message would be pushed
         into aiMessages but never actually persisted anywhere server-side,
         since saveProjectState() only PUTs session messages when
         currentActiveSessionId is set. */
      async function ensureActiveSession() {
        if (currentActiveSessionId) return currentActiveSessionId;
        if (!currentProjectId) return null;
        try {
          const created = await createAiSessionOnServer('Session 1');
          currentActiveSessionId = created.id;
        } catch (e) {
          console.warn('Failed to auto-create AI session:', e);
        }
        return currentActiveSessionId;
      }

      /* startNewAiSession — explicit "New Chat" action. Creates a fresh
         AiSession scoped to the current project and makes it active. The
         previous session's messages are left completely untouched on disk —
         this only swaps what's active in memory, nothing is deleted. */
      async function startNewAiSession() {
        if (!currentProjectId) {
          alert('Tidak ada project aktif.');
          return;
        }
        if (aiMessages && aiMessages.length > 0) {
          const proceed = confirm(
            'Mulai chat baru? Riwayat chat yang sekarang tetap tersimpan dan bisa dibuka lagi nanti.'
          );
          if (!proceed) return;
        }
        try {
          const created = await createAiSessionOnServer(`Session ${formatUpdatedAt(new Date().toISOString())}`);
          currentActiveSessionId = created.id;
          aiMessages = defaultWelcomeMessages();
          renderAiMessages();
        } catch (e) {
          console.error('New AI Session Error:', e);
          alert('Gagal membuat sesi chat baru. Coba lagi.');
        }
      }

      /* ===== Session history: browse & reopen an older session (Phase 4) ===== */

      /* fetchSessionsList */
      async function fetchSessionsList() {
        if (!currentProjectId || !sessionsListEl) return;
        sessionsListEl.innerHTML = `<p class="text-xs text-textSec text-center py-6">Loading...</p>`;
        try {
          const res = await fetch(`/api/projects/${currentProjectId}/sessions`);
          const result = await res.json();
          renderSessionsList((result && result.data) || []);
        } catch (e) {
          console.warn('Failed to fetch sessions list:', e);
          sessionsListEl.innerHTML = `<p class="text-xs text-amber-500/80 text-center py-6">Gagal memuat riwayat sesi.</p>`;
        }
      }

      /* renderSessionsList — most recently updated first */
      function renderSessionsList(sessions) {
        if (!sessionsListEl) return;
        if (!sessions || sessions.length === 0) {
          sessionsListEl.innerHTML = `<p class="text-xs text-textSec text-center py-6">No sessions yet.</p>`;
          return;
        }
        const sorted = [...sessions].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

        sessionsListEl.innerHTML = sorted
          .map(
            (s) => `
          <button data-session-id="${s.id}" class="w-full text-left px-3 py-2.5 rounded border ${
              s.id === currentActiveSessionId ? 'border-accent bg-accent/10' : 'border-border bg-bg/40 hover:bg-border/60'
            } transition-colors flex items-center justify-between space-x-2 cursor-pointer">
            <span class="flex flex-col min-w-0">
              <span class="text-xs font-semibold text-text truncate">${escapeHtml(s.name)}</span>
              <span class="text-[10px] font-mono text-textSec">${formatUpdatedAt(s.updatedAt)}</span>
            </span>
            ${s.id === currentActiveSessionId ? '<i class="codicon codicon-check text-accent text-sm shrink-0"></i>' : ''}
          </button>
        `
          )
          .join('');

        sessionsListEl.querySelectorAll('[data-session-id]').forEach((btn) => {
          btn.addEventListener('click', () => reopenSession(btn.getAttribute('data-session-id')));
        });
      }

      /* openSessionsModal */
      function openSessionsModal() {
        if (!currentProjectId) return;
        sessionsModal.classList.remove('hidden');
        fetchSessionsList();
      }

      /* closeSessionsModal */
      function closeSessionsModal() {
        sessionsModal.classList.add('hidden');
      }

      /* reopenSession — sets an older session back as the project's active
         one. Flushes any pending save for the CURRENT session first (same
         safety pattern as switchToProject), then loads the target session's
         messages and persists the activeSessionId change on the project. */
      async function reopenSession(sessionId) {
        if (!currentProjectId) return;
        if (sessionId === currentActiveSessionId) {
          closeSessionsModal();
          return;
        }

        try {
          if (saveTimeout) {
            clearTimeout(saveTimeout);
            saveTimeout = null;
          }
          if (pendingSaveData && pendingSaveProjectId === currentProjectId) {
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
                'Gagal menyimpan sesi yang sekarang. Tetap buka sesi lain? Perubahan yang belum tersimpan akan hilang.'
              );
              if (!proceed) return;
              pendingSaveData = null;
              pendingSaveProjectId = null;
              pendingSaveSessionId = null;
            }
          }

          const sRes = await fetch(`/api/projects/${currentProjectId}/sessions/${sessionId}`);
          if (!sRes.ok) throw new Error('Failed to load session');
          const sResult = await sRes.json();
          const session = sResult.data;

          currentActiveSessionId = sessionId;
          aiMessages = session.messages || defaultWelcomeMessages();

          // Persist "this is now the active session" on the project record.
          await fetch(`/api/projects/${currentProjectId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ activeSessionId: sessionId })
          });

          renderAiMessages();
          closeSessionsModal();
        } catch (e) {
          console.error('Reopen Session Error:', e);
          alert('Gagal membuka sesi tersebut. Coba lagi.');
        }
      }

      async function sendAiMessage(userText) {
        if (!userText.trim()) return;

        // Ensure key is provided
        if (!aiSettings.apiKey) {
          alert("Please set your API Key first in the AI configuration settings (⚙️ button in the AI Copilot panel)!");
          // Open settings panel
          document.getElementById('ai-settings-panel').classList.remove('hidden');
          document.getElementById('ai-settings-panel-mobile').classList.remove('hidden');
          return;
        }

        // Make sure there's a session to persist into before this message is saved.
        await ensureActiveSession();

        // Add user message
        aiMessages.push({ role: 'user', content: userText });
        renderAiMessages();
        saveProjectState();

        // Clear inputs
        document.getElementById('ai-chat-input').value = '';
        document.getElementById('ai-chat-input-mobile').value = '';

        // Insert temporary typing indicator
        const typingId = 'ai-typing-temp';
        const desktopList = document.getElementById('ai-messages-list');
        const mobileList = document.getElementById('ai-messages-list-mobile');
        
        const typingHtml = `
          <div id="${typingId}" class="py-2 px-1 text-xs text-textSec animate-pulse flex items-center space-x-1.5 self-start">
            <span class="font-bold text-accent text-[10px] font-mono uppercase tracking-wider">NOWACTION Copilot is typing...</span>
          </div>
        `;
        if (desktopList) desktopList.insertAdjacentHTML('beforeend', typingHtml);
        if (mobileList) mobileList.insertAdjacentHTML('beforeend', typingHtml);
        if (desktopList) desktopList.scrollTop = desktopList.scrollHeight;
        if (mobileList) mobileList.scrollTop = mobileList.scrollHeight;

        try {
          // Prepare payload for local Express proxy
          const messagesPayload = [
            { role: 'system', content: AI_SYSTEM_PROMPT },
            ...aiMessages
          ];

          const response = await fetch('/api/ai-proxy', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              provider: aiSettings.provider,
              apiKey: aiSettings.apiKey,
              baseUrl: aiSettings.baseUrl || undefined,
              model: aiSettings.model || undefined,
              messages: messagesPayload
            })
          });

          // Remove typing indicator
          const indicatorD = document.getElementById(typingId);
          if (indicatorD) indicatorD.remove();

          if (!response.ok) {
            const errData = await response.json();
            throw new Error(errData.error || 'Fetch failed on AI proxy.');
          }

          const data = await response.json();
          const assistantContent = data.choices && data.choices[0] && data.choices[0].message
            ? data.choices[0].message.content
            : 'Sorry, I did not receive a valid response.';

          aiMessages.push({ role: 'assistant', content: assistantContent });
          renderAiMessages();
          saveProjectState();

        } catch (error) {
          console.error("AI Request Failed:", error);
          const indicatorD = document.getElementById(typingId);
          if (indicatorD) indicatorD.remove();

          // Add notice
          aiMessages.push({
            role: 'assistant',
            content: `⚠️ **Failed to contact AI**: ${error.message || 'Connection error.'}\n\nPlease double check your API Key, Provider, and Base URL in the ⚙️ settings.`
          });
          renderAiMessages();
          saveProjectState();
        }
      }

      function setupAiEventListeners() {
        // New Chat session (Phase 3)
        const newSessionBtn = document.getElementById('btn-ai-new-session');
        if (newSessionBtn) {
          newSessionBtn.addEventListener('click', startNewAiSession);
        }
        const newSessionBtnMob = document.getElementById('btn-ai-new-session-mobile');
        if (newSessionBtnMob) {
          newSessionBtnMob.addEventListener('click', startNewAiSession);
        }

        // Session history (Phase 4)
        const historyBtn = document.getElementById('btn-ai-session-history');
        if (historyBtn) {
          historyBtn.addEventListener('click', openSessionsModal);
        }
        const historyBtnMob = document.getElementById('btn-ai-session-history-mobile');
        if (historyBtnMob) {
          historyBtnMob.addEventListener('click', openSessionsModal);
        }
        btnCloseSessionsModal.addEventListener('click', closeSessionsModal);

        // Toggle desktop sidebar
        const toggleBtn = document.getElementById('btn-ai-copilot-toggle');
        if (toggleBtn) {
          toggleBtn.addEventListener('click', () => {
            isAiSidebarOpen = !isAiSidebarOpen;
            updateAiSidebarVisibility();
            saveAiState();
            if (isAiSidebarOpen) {
              setTimeout(renderAiMessages, 50);
            }
          });
        }

        const closeBtn = document.getElementById('btn-ai-sidebar-close');
        if (closeBtn) {
          closeBtn.addEventListener('click', () => {
            isAiSidebarOpen = false;
            updateAiSidebarVisibility();
            saveAiState();
          });
        }

        // Toggle settings panel (desktop & mobile)
        const settingsToggle = document.getElementById('btn-ai-settings-toggle');
        if (settingsToggle) {
          settingsToggle.addEventListener('click', () => {
            const panel = document.getElementById('ai-settings-panel');
            panel.classList.toggle('hidden');
          });
        }

        const settingsToggleMob = document.getElementById('btn-ai-settings-toggle-mobile');
        if (settingsToggleMob) {
          settingsToggleMob.addEventListener('click', () => {
            const panel = document.getElementById('ai-settings-panel-mobile');
            panel.classList.toggle('hidden');
          });
        }

        // Save settings (desktop)
        const saveBtn = document.getElementById('btn-save-ai-settings');
        if (saveBtn) {
          saveBtn.addEventListener('click', () => {
            const provider = document.getElementById('ai-provider-select').value;
            const apiKey = document.getElementById('ai-api-key-input').value.trim();
            const baseUrl = document.getElementById('ai-base-url-input').value.trim();
            const model = document.getElementById('ai-model-input').value.trim();

            aiSettings = { provider, apiKey, baseUrl, model };
            saveAiState();
            saveProjectState();
            populateAiSettingsInputs();
            document.getElementById('ai-settings-panel').classList.add('hidden');
            alert('AI Copilot configuration successfully saved!');
          });
        }

        // Save settings (mobile)
        const saveBtnMob = document.getElementById('btn-save-ai-settings-mobile');
        if (saveBtnMob) {
          saveBtnMob.addEventListener('click', () => {
            const provider = document.getElementById('ai-provider-select-mobile').value;
            const apiKey = document.getElementById('ai-api-key-input-mobile').value.trim();
            const baseUrl = document.getElementById('ai-base-url-input-mobile').value.trim();
            const model = document.getElementById('ai-model-input-mobile').value.trim();

            aiSettings = { provider, apiKey, baseUrl, model };
            saveAiState();
            saveProjectState();
            populateAiSettingsInputs();
            document.getElementById('ai-settings-panel-mobile').classList.add('hidden');
            alert('AI Copilot configuration successfully saved!');
          });
        }

        // Sync provider defaults on selection
        const provSelect = document.getElementById('ai-provider-select');
        if (provSelect) {
          provSelect.addEventListener('change', (e) => {
            const prov = e.target.value;
            const modelInput = document.getElementById('ai-model-input');
            const baseInput = document.getElementById('ai-base-url-input');
            if (prov === 'anthropic') {
              if (modelInput) modelInput.value = 'claude-3-5-sonnet-20241022';
              if (baseInput) baseInput.placeholder = 'https://api.anthropic.com';
            } else {
              if (modelInput) modelInput.value = 'gpt-4o-mini';
              if (baseInput) baseInput.placeholder = 'https://api.openai.com/v1';
            }
          });
        }

        const provSelectMob = document.getElementById('ai-provider-select-mobile');
        if (provSelectMob) {
          provSelectMob.addEventListener('change', (e) => {
            const prov = e.target.value;
            const modelInputMob = document.getElementById('ai-model-input-mobile');
            const baseInputMob = document.getElementById('ai-base-url-input-mobile');
            if (prov === 'anthropic') {
              if (modelInputMob) modelInputMob.value = 'claude-3-5-sonnet-20241022';
              if (baseInputMob) baseInputMob.placeholder = 'https://api.anthropic.com';
            } else {
              if (modelInputMob) modelInputMob.value = 'gpt-4o-mini';
              if (baseInputMob) baseInputMob.placeholder = 'https://api.openai.com/v1';
            }
          });
        }

        // Send triggers
        const sendBtn = document.getElementById('btn-ai-send');
        const chatInput = document.getElementById('ai-chat-input');
        if (sendBtn && chatInput) {
          sendBtn.addEventListener('click', () => {
            sendAiMessage(chatInput.value);
          });
          chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendAiMessage(chatInput.value);
            }
          });
        }

        const sendBtnMob = document.getElementById('btn-ai-send-mobile');
        const chatInputMob = document.getElementById('ai-chat-input-mobile');
        if (sendBtnMob && chatInputMob) {
          sendBtnMob.addEventListener('click', () => {
            sendAiMessage(chatInputMob.value);
          });
          chatInputMob.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendAiMessage(chatInputMob.value);
            }
          });
        }
      }

      // Start the application with dual server-first loading and local fallbacks
      /* resolveInitialProjectId — Phase 2 doesn't yet persist "last active
         project" across reloads (that's Phase 4's resume flow). For now:
         prefer the migrated legacy-default project if it exists (the
         common upgrade case), else the most recently updated project, else
         auto-create a fresh default project so there's always something to load. */

