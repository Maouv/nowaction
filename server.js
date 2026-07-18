import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import crypto from 'crypto';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Increase body size limit to support large designs/conversations
app.use(express.json({ limit: '10mb' }));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

const PROJECT_FILE = path.join(__dirname, 'project_data.json');

/* ===== Multi-project / multi-session storage (Phase 1) ===== */
const DATA_DIR = path.join(__dirname, 'data');
const PROJECTS_DIR = path.join(DATA_DIR, 'projects');
const PROJECTS_INDEX_FILE = path.join(DATA_DIR, 'projects.index.json');

const DEFAULT_SHAPE_COUNTER = { rectangle: 0, circle: 0, text: 0, image: 0 };

const LEGACY_PROJECT_ID = 'legacy-default';
// Set once at boot (after migration runs) and never re-derived from
// "does project_data.json exist" — see save/load shims below for why.
let legacyMigrationDone = false;

/* pathExists */
async function pathExists(p) {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

/* ensureDir */
async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

/* readJson */
async function readJson(filePath, fallback) {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    if (err.code === 'ENOENT') return fallback;
    throw err;
  }
}

/* writeJson */
async function writeJson(filePath, data) {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/* projectFilePath */
function projectFilePath(projectId) {
  return path.join(PROJECTS_DIR, `${projectId}.json`);
}

/* projectSessionsDir */
function projectSessionsDir(projectId) {
  return path.join(PROJECTS_DIR, projectId, 'sessions');
}

/* sessionFilePath */
function sessionFilePath(projectId, sessionId) {
  return path.join(projectSessionsDir(projectId), `${sessionId}.json`);
}

/* sessionsIndexPath */
function sessionsIndexPath(projectId) {
  return path.join(PROJECTS_DIR, projectId, 'sessions.index.json');
}

/* readProjectsIndex */
async function readProjectsIndex() {
  return readJson(PROJECTS_INDEX_FILE, []);
}

/* writeProjectsIndex */
async function writeProjectsIndex(index) {
  await writeJson(PROJECTS_INDEX_FILE, index);
}

/* upsertProjectsIndexEntry */
async function upsertProjectsIndexEntry(entry) {
  const index = await readProjectsIndex();
  const i = index.findIndex((p) => p.id === entry.id);
  if (i >= 0) index[i] = { ...index[i], ...entry };
  else index.push(entry);
  await writeProjectsIndex(index);
}

/* removeProjectsIndexEntry */
async function removeProjectsIndexEntry(projectId) {
  const index = await readProjectsIndex();
  await writeProjectsIndex(index.filter((p) => p.id !== projectId));
}

/* readSessionsIndex */
async function readSessionsIndex(projectId) {
  return readJson(sessionsIndexPath(projectId), []);
}

/* writeSessionsIndex */
async function writeSessionsIndex(projectId, index) {
  await writeJson(sessionsIndexPath(projectId), index);
}

/* upsertSessionsIndexEntry */
async function upsertSessionsIndexEntry(projectId, entry) {
  const index = await readSessionsIndex(projectId);
  const i = index.findIndex((s) => s.id === entry.id);
  if (i >= 0) index[i] = { ...index[i], ...entry };
  else index.push(entry);
  await writeSessionsIndex(projectId, index);
}

/* removeSessionsIndexEntry */
async function removeSessionsIndexEntry(projectId, sessionId) {
  const index = await readSessionsIndex(projectId);
  await writeSessionsIndex(projectId, index.filter((s) => s.id !== sessionId));
}

/* migrateLegacyProjectIfNeeded — one-time migration of the old single global
   project_data.json into the new /data/projects/ layout. Runs once at boot;
   never deletes the legacy file, only renames it so it isn't reprocessed. */
async function migrateLegacyProjectIfNeeded() {
  const legacyExists = await pathExists(PROJECT_FILE);
  const projectsDirExists = await pathExists(PROJECTS_DIR);

  if (!legacyExists || projectsDirExists) return;

  console.log('[migration] Legacy project_data.json found, migrating to /data/projects/ ...');

  const legacy = await readJson(PROJECT_FILE, {});
  const projectId = 'legacy-default';
  const sessionId = crypto.randomUUID();
  const now = legacy.updatedAt || new Date().toISOString();

  const project = {
    id: projectId,
    name: 'My First Project',
    createdAt: now,
    updatedAt: now,
    shapes: legacy.shapes || [],
    shapeCounter: legacy.shapeCounter || { ...DEFAULT_SHAPE_COUNTER },
    groups: legacy.groups || {},
    aiSettings: legacy.aiSettings || {},
    activeSessionId: sessionId
  };

  const session = {
    id: sessionId,
    projectId,
    name: 'Session 1',
    createdAt: now,
    updatedAt: now,
    messages: legacy.aiMessages || []
  };

  await writeJson(projectFilePath(projectId), project);
  await writeJson(sessionFilePath(projectId, sessionId), session);
  await writeSessionsIndex(projectId, [{ id: sessionId, name: session.name, updatedAt: now }]);
  await writeProjectsIndex([{ id: projectId, name: project.name, updatedAt: now }]);

  await fs.rename(PROJECT_FILE, `${PROJECT_FILE}.migrated`);

  console.log(`[migration] Done. Project "${projectId}" with session "${sessionId}" created. Legacy file renamed to project_data.json.migrated.`);
}

// API route to SAVE project (shapes + chats) server-side
app.post('/api/save-project', async (req, res) => {
  try {
    const { shapes, shapeCounter, groups, aiMessages, aiSettings } = req.body;

    if (legacyMigrationDone) {
      // Route straight to the legacy-default project + its active session.
      // project_data.json is never touched again once migration has happened.
      const project = await readJson(projectFilePath(LEGACY_PROJECT_ID), null);
      if (!project) {
        return res.status(500).json({ error: 'legacy-default project missing after migration — data inconsistency, investigate /data/projects/.' });
      }

      const now = new Date().toISOString();
      const updatedProject = {
        ...project,
        shapes: shapes || [],
        shapeCounter: shapeCounter || { ...DEFAULT_SHAPE_COUNTER },
        groups: groups || {},
        aiSettings: aiSettings || {},
        updatedAt: now
      };

      // A missing activeSessionId shouldn't be possible post-migration, but
      // handle it defensively rather than silently dropping aiMessages.
      let sessionId = updatedProject.activeSessionId;
      if (!sessionId) {
        sessionId = crypto.randomUUID();
        await writeJson(sessionFilePath(LEGACY_PROJECT_ID, sessionId), {
          id: sessionId,
          projectId: LEGACY_PROJECT_ID,
          name: 'Session 1',
          createdAt: now,
          updatedAt: now,
          messages: []
        });
        await upsertSessionsIndexEntry(LEGACY_PROJECT_ID, { id: sessionId, name: 'Session 1', updatedAt: now });
        updatedProject.activeSessionId = sessionId;
      }

      await writeJson(projectFilePath(LEGACY_PROJECT_ID), updatedProject);
      await upsertProjectsIndexEntry({ id: LEGACY_PROJECT_ID, name: updatedProject.name, updatedAt: now });

      const existingSession = await readJson(sessionFilePath(LEGACY_PROJECT_ID, sessionId), null);
      await writeJson(sessionFilePath(LEGACY_PROJECT_ID, sessionId), {
        ...(existingSession || { id: sessionId, projectId: LEGACY_PROJECT_ID, name: 'Session 1', createdAt: now }),
        messages: aiMessages || [],
        updatedAt: now
      });
      await upsertSessionsIndexEntry(LEGACY_PROJECT_ID, { id: sessionId, name: (existingSession && existingSession.name) || 'Session 1', updatedAt: now });

      console.log('Project saved successfully (routed to legacy-default project).');
      return res.json({ success: true, message: 'Project autosaved to server successfully!' });
    }

    // Pre-migration fallback: no /data/projects/legacy-default.json exists yet
    // (fresh install, migration hasn't run). Keep old single-file behavior.
    const projectData = {
      shapes: shapes || [],
      shapeCounter: shapeCounter || { rectangle: 0, circle: 0, text: 0 },
      groups: groups || {},
      aiMessages: aiMessages || [],
      aiSettings: aiSettings || {},
      updatedAt: new Date().toISOString()
    };

    await fs.writeFile(PROJECT_FILE, JSON.stringify(projectData, null, 2), 'utf-8');
    console.log('Project saved successfully to server-side file.');
    res.json({ success: true, message: 'Project autosaved to server successfully!' });
  } catch (error) {
    console.error('Save Project Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save project on the server.' });
  }
});

// API route to LOAD project server-side
app.get('/api/load-project', async (req, res) => {
  try {
    if (legacyMigrationDone) {
      // Route straight to the legacy-default project + its active session,
      // reassembled into the shape the old frontend already expects.
      const project = await readJson(projectFilePath(LEGACY_PROJECT_ID), null);
      if (!project) {
        return res.json({ success: true, data: null, message: 'No server-side save found.' });
      }

      const session = project.activeSessionId
        ? await readJson(sessionFilePath(LEGACY_PROJECT_ID, project.activeSessionId), null)
        : null;

      return res.json({
        success: true,
        data: {
          shapes: project.shapes,
          shapeCounter: project.shapeCounter,
          groups: project.groups,
          aiMessages: session ? session.messages : [],
          aiSettings: project.aiSettings,
          updatedAt: project.updatedAt
        }
      });
    }

    // Pre-migration fallback: read the legacy single file directly.
    try {
      const content = await fs.readFile(PROJECT_FILE, 'utf-8');
      const data = JSON.parse(content);
      return res.json({ success: true, data });
    } catch (err) {
      if (err.code === 'ENOENT') {
        // No saved file yet, which is completely fine
        return res.json({ success: true, data: null, message: 'No server-side save found.' });
      }
      throw err;
    }
  } catch (error) {
    console.error('Load Project Error:', error);
    res.status(500).json({ error: error.message || 'Failed to load project from the server.' });
  }
});

/* ===== Project endpoints (Phase 1) ===== */

/* POST /api/projects — create a new project */
app.post('/api/projects', async (req, res) => {
  try {
    const { name } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const project = {
      id,
      name: name || 'Untitled Project',
      createdAt: now,
      updatedAt: now,
      shapes: [],
      shapeCounter: { ...DEFAULT_SHAPE_COUNTER },
      groups: {},
      aiSettings: {},
      activeSessionId: null
    };

    await writeJson(projectFilePath(id), project);
    await ensureDir(projectSessionsDir(id));
    await writeSessionsIndex(id, []);
    await upsertProjectsIndexEntry({ id, name: project.name, updatedAt: now });

    res.json({ id, name: project.name });
  } catch (error) {
    console.error('Create Project Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create project.' });
  }
});

/* GET /api/projects — list all projects (lightweight index) */
app.get('/api/projects', async (req, res) => {
  try {
    const index = await readProjectsIndex();
    res.json({ success: true, data: index });
  } catch (error) {
    console.error('List Projects Error:', error);
    res.status(500).json({ error: error.message || 'Failed to list projects.' });
  }
});

/* GET /api/projects/:projectId — full project (shapes/groups/etc, NOT session messages) */
app.get('/api/projects/:projectId', async (req, res) => {
  try {
    const project = await readJson(projectFilePath(req.params.projectId), null);
    if (!project) return res.status(404).json({ error: 'Project not found.' });
    res.json({ success: true, data: project });
  } catch (error) {
    console.error('Get Project Error:', error);
    res.status(500).json({ error: error.message || 'Failed to load project.' });
  }
});

/* PUT /api/projects/:projectId — save/update project (shapes/groups/shapeCounter/aiSettings/name/activeSessionId) */
app.put('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const existing = await readJson(projectFilePath(projectId), null);
    if (!existing) return res.status(404).json({ error: 'Project not found.' });

    const { name, shapes, shapeCounter, groups, aiSettings, activeSessionId } = req.body;
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      shapes: shapes !== undefined ? shapes : existing.shapes,
      shapeCounter: shapeCounter !== undefined ? shapeCounter : existing.shapeCounter,
      groups: groups !== undefined ? groups : existing.groups,
      aiSettings: aiSettings !== undefined ? aiSettings : existing.aiSettings,
      activeSessionId: activeSessionId !== undefined ? activeSessionId : existing.activeSessionId,
      updatedAt: now
    };

    await writeJson(projectFilePath(projectId), updated);
    await upsertProjectsIndexEntry({ id: projectId, name: updated.name, updatedAt: now });

    res.json({ success: true, message: 'Project saved.', updatedAt: now });
  } catch (error) {
    console.error('Update Project Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save project.' });
  }
});

/* DELETE /api/projects/:projectId — remove project and all its sessions */
app.delete('/api/projects/:projectId', async (req, res) => {
  try {
    const { projectId } = req.params;
    const existing = await readJson(projectFilePath(projectId), null);
    if (!existing) return res.status(404).json({ error: 'Project not found.' });

    await fs.rm(projectFilePath(projectId), { force: true });
    await fs.rm(path.join(PROJECTS_DIR, projectId), { recursive: true, force: true });
    await removeProjectsIndexEntry(projectId);

    res.json({ success: true, message: 'Project deleted.' });
  } catch (error) {
    console.error('Delete Project Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete project.' });
  }
});

/* ===== AI Session endpoints (Phase 1) ===== */

/* POST /api/projects/:projectId/sessions — create a new session, scoped to the project, and set it active */
app.post('/api/projects/:projectId/sessions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await readJson(projectFilePath(projectId), null);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const { name } = req.body;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();

    const session = {
      id,
      projectId,
      name: name || 'New Session',
      createdAt: now,
      updatedAt: now,
      messages: []
    };

    await writeJson(sessionFilePath(projectId, id), session);
    await upsertSessionsIndexEntry(projectId, { id, name: session.name, updatedAt: now });

    project.activeSessionId = id;
    project.updatedAt = now;
    await writeJson(projectFilePath(projectId), project);
    await upsertProjectsIndexEntry({ id: projectId, name: project.name, updatedAt: now });

    res.json({ id, name: session.name });
  } catch (error) {
    console.error('Create Session Error:', error);
    res.status(500).json({ error: error.message || 'Failed to create session.' });
  }
});

/* GET /api/projects/:projectId/sessions — list sessions for a project (lightweight index) */
app.get('/api/projects/:projectId/sessions', async (req, res) => {
  try {
    const { projectId } = req.params;
    const project = await readJson(projectFilePath(projectId), null);
    if (!project) return res.status(404).json({ error: 'Project not found.' });

    const index = await readSessionsIndex(projectId);
    res.json({ success: true, data: index });
  } catch (error) {
    console.error('List Sessions Error:', error);
    res.status(500).json({ error: error.message || 'Failed to list sessions.' });
  }
});

/* GET /api/projects/:projectId/sessions/:sessionId — full session incl. messages (for resume) */
app.get('/api/projects/:projectId/sessions/:sessionId', async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const session = await readJson(sessionFilePath(projectId, sessionId), null);
    if (!session) return res.status(404).json({ error: 'Session not found.' });
    res.json({ success: true, data: session });
  } catch (error) {
    console.error('Get Session Error:', error);
    res.status(500).json({ error: error.message || 'Failed to load session.' });
  }
});

/* PUT /api/projects/:projectId/sessions/:sessionId — save session messages (replaces old aiMessages save) */
app.put('/api/projects/:projectId/sessions/:sessionId', async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const existing = await readJson(sessionFilePath(projectId, sessionId), null);
    if (!existing) return res.status(404).json({ error: 'Session not found.' });

    const { name, messages } = req.body;
    const now = new Date().toISOString();

    const updated = {
      ...existing,
      name: name !== undefined ? name : existing.name,
      messages: messages !== undefined ? messages : existing.messages,
      updatedAt: now
    };

    await writeJson(sessionFilePath(projectId, sessionId), updated);
    await upsertSessionsIndexEntry(projectId, { id: sessionId, name: updated.name, updatedAt: now });

    res.json({ success: true, message: 'Session saved.', updatedAt: now });
  } catch (error) {
    console.error('Update Session Error:', error);
    res.status(500).json({ error: error.message || 'Failed to save session.' });
  }
});

/* DELETE /api/projects/:projectId/sessions/:sessionId — remove a session (old sessions stay unless explicitly deleted) */
app.delete('/api/projects/:projectId/sessions/:sessionId', async (req, res) => {
  try {
    const { projectId, sessionId } = req.params;
    const existing = await readJson(sessionFilePath(projectId, sessionId), null);
    if (!existing) return res.status(404).json({ error: 'Session not found.' });

    await fs.rm(sessionFilePath(projectId, sessionId), { force: true });
    await removeSessionsIndexEntry(projectId, sessionId);

    // If the deleted session was active, clear it — frontend/Phase 4 decides what to open next
    const project = await readJson(projectFilePath(projectId), null);
    if (project && project.activeSessionId === sessionId) {
      project.activeSessionId = null;
      project.updatedAt = new Date().toISOString();
      await writeJson(projectFilePath(projectId), project);
    }

    res.json({ success: true, message: 'Session deleted.' });
  } catch (error) {
    console.error('Delete Session Error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete session.' });
  }
});

// API route for AI BYOK Proxy with Google Gemini and server-side fallback keys
app.post('/api/ai-proxy', async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, model, messages, projectId, sessionId } = req.body;

    // Phase 1: accept projectId/sessionId for logging/future canvas-injection use.
    // The proxy itself remains stateless — it does not read/write project or
    // session files, it only forwards `messages` upstream as before.
    if (projectId || sessionId) {
      console.log(`AI proxy call for projectId=${projectId || 'n/a'} sessionId=${sessionId || 'n/a'}`);
    }

    // Smart fallback: Check environment variables if no API key is specified in frontend
    let activeKey = apiKey;
    let activeProvider = provider || 'gemini';

    if (!activeKey) {
      if (activeProvider === 'gemini') {
        activeKey = process.env.GEMINI_API_KEY;
      } else if (activeProvider === 'openai') {
        activeKey = process.env.OPENAI_API_KEY;
      } else if (activeProvider === 'anthropic') {
        activeKey = process.env.ANTHROPIC_API_KEY;
      }
    }

    // Double fallback: if provider was something else, but we only have GEMINI_API_KEY, use gemini
    if (!activeKey && process.env.GEMINI_API_KEY) {
      activeProvider = 'gemini';
      activeKey = process.env.GEMINI_API_KEY;
    }

    if (!activeKey) {
      return res.status(400).json({ 
        error: `API Key is required for provider "${activeProvider}". Please add the key in AI Settings or define it on the server.` 
      });
    }

    if (activeProvider === 'gemini') {
      // Use Gemini OpenAI-compatible endpoint
      const geminiModel = model || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
      const openAiBody = {
        model: geminiModel,
        messages: messages,
        temperature: 0.7
      };

      // Construct Google Gemini OpenAI-compatible URL
      const url = `https://generativelanguage.googleapis.com/v1beta/openai/chat/completions?key=${activeKey}`;
      console.log(`Proxying to Gemini API (via OpenAI interface): ${geminiModel}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(openAiBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      return res.json(data);

    } else if (activeProvider === 'anthropic') {
      // Structure Anthropic request
      // Anthropic does not allow system messages in the messages array.
      // System message must be passed as the 'system' top-level parameter.
      const systemMsg = messages.find(m => m.role === 'system');
      const filteredMessages = messages.filter(m => m.role !== 'system');
      
      const anthropicBody = {
        model: model || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
        messages: filteredMessages.map(m => ({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content
        })),
        max_tokens: 4000
      };

      if (systemMsg) {
        anthropicBody.system = systemMsg.content;
      }

      // Default Anthropic endpoint if none provided
      const url = baseUrl ? `${baseUrl.replace(/\/+$/, '')}/v1/messages` : 'https://api.anthropic.com/v1/messages';
      
      console.log(`Proxying to Anthropic: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': activeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(anthropicBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        return res.status(response.status).json({ error: errorText });
      }

      const data = await response.json();
      // Standardize response structure for client
      const assistantMessage = data.content && data.content[0] ? data.content[0].text : '';
      return res.json({
        choices: [
          {
            message: {
              role: 'assistant',
              content: assistantMessage
            }
          }
        ]
      });
    } else {
      // Default: OpenAI compatible
      const openAiBody = {
        model: model || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: messages,
        temperature: 0.7,
        // Force non-streaming: some OpenAI-compatible local servers (llama.cpp,
        // vLLM, LM Studio, etc.) default to SSE streaming even without a
        // stream flag, which breaks response.json() with
        // "Unexpected non-whitespace character after JSON..."
        stream: false
      };

      // Ensure v1 endpoint is appended correctly
      let url = baseUrl || 'https://api.openai.com/v1';
      url = url.replace(/\/+$/, '');
      if (!url.endsWith('/chat/completions')) {
        url = `${url}/chat/completions`;
      }

      console.log(`Proxying to OpenAI compatible: ${url}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify(openAiBody)
      });

      // Read as text first so we can handle non-JSON / SSE-formatted bodies
      // gracefully instead of throwing an opaque SyntaxError.
      const rawText = await response.text();

      if (!response.ok) {
        return res.status(response.status).json({ error: rawText });
      }

      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        // Fallback: some local servers still stream SSE ("data: {...}\n\n")
        // even when stream:false is sent. Try to parse it as SSE and stitch
        // together the last full chat-completion chunk, or the concatenated
        // delta content if it's a stream of deltas.
        const dataLines = rawText
          .split('\n')
          .map(l => l.trim())
          .filter(l => l.startsWith('data:') && l.slice(5).trim() !== '[DONE]');

        if (dataLines.length > 0) {
          try {
            const chunks = dataLines.map(l => JSON.parse(l.slice(5).trim()));
            const lastChunk = chunks[chunks.length - 1];

            if (lastChunk.choices && lastChunk.choices[0] && lastChunk.choices[0].message) {
              // Non-delta JSON objects sent line by line — just use the last one.
              data = lastChunk;
            } else {
              // Streamed deltas — reassemble the full message content.
              const content = chunks
                .map(c => c.choices?.[0]?.delta?.content || '')
                .join('');
              data = {
                choices: [{ message: { role: 'assistant', content } }]
              };
            }
          } catch (sseErr) {
            console.error('AI Proxy Error: failed to parse SSE fallback', sseErr);
            return res.status(502).json({
              error: `Upstream returned a non-JSON response the proxy could not parse: ${parseErr.message}`
            });
          }
        } else {
          console.error('AI Proxy Error: response was not valid JSON', parseErr);
          return res.status(502).json({
            error: `Upstream returned a non-JSON response the proxy could not parse: ${parseErr.message}`
          });
        }
      }

      // Debug: log the raw upstream shape so we can see what the local
      // OpenAI-compatible server actually returns if the frontend still
      // says "Sorry, I did not receive a valid response."
      console.log('Upstream OpenAI-compatible response (truncated):', JSON.stringify(data).slice(0, 500));

      // Some gateways/proxies wrap the actual OpenAI-shaped payload inside
      // an extra top-level "data" envelope: { data: { choices: [...] } }.
      // Unwrap it if present so the rest of the normalization logic works.
      if (!data?.choices && data?.data?.choices) {
        data = data.data;
      }

      // Normalize alternate response shapes into the standard
      // { choices: [{ message: { role, content } }] } shape the frontend expects.
      const hasStandardShape = data?.choices?.[0]?.message?.content !== undefined;

      if (!hasStandardShape && data?.choices?.[0]) {
        const choice = data.choices[0];
        let content;

        if (typeof choice.text === 'string') {
          // Legacy /v1/completions style
          content = choice.text;
        } else if (choice.delta && typeof choice.delta.content === 'string') {
          // Single streaming delta chunk that slipped through as JSON
          content = choice.delta.content;
        } else if (typeof choice.message === 'string') {
          content = choice.message;
        }

        if (content !== undefined) {
          data = { choices: [{ message: { role: 'assistant', content } }] };
        }
      } else if (!hasStandardShape && typeof data?.message?.content === 'string') {
        // Ollama-native /api/chat style: { message: { role, content } }
        data = { choices: [{ message: { role: 'assistant', content: data.message.content } }] };
      } else if (!hasStandardShape && typeof data?.response === 'string') {
        // Ollama-native /api/generate style: { response: "..." }
        data = { choices: [{ message: { role: 'assistant', content: data.response } }] };
      }

      return res.json(data);
    }
  } catch (error) {
    console.error('AI Proxy Error:', error);
    res.status(500).json({ error: error.message || 'An unexpected error occurred during the API request.' });
  }
});

// Fallback to serve index.html for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

/* boot — run one-time legacy migration BEFORE ensuring PROJECTS_DIR exists
   (migration needs to see PROJECTS_DIR as absent to know it hasn't run yet),
   then start listening */
async function boot() {
  await migrateLegacyProjectIfNeeded();
  await ensureDir(PROJECTS_DIR);

  // Once legacy-default project exists (whether migrated just now, or on a
  // prior boot), the old /api/save-project and /api/load-project endpoints
  // become permanent shims routed to it — they never read/write
  // project_data.json again, even if that file gets recreated somehow.
  legacyMigrationDone = await pathExists(projectFilePath(LEGACY_PROJECT_ID));

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
  });
}

boot();
