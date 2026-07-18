import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
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

// API route to SAVE project (shapes + chats) server-side
app.post('/api/save-project', async (req, res) => {
  try {
    const { shapes, shapeCounter, groups, aiMessages, aiSettings } = req.body;
    
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

// API route for AI BYOK Proxy with Google Gemini and server-side fallback keys
app.post('/api/ai-proxy', async (req, res) => {
  try {
    const { provider, apiKey, baseUrl, model, messages } = req.body;

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
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
