/**
 * Multi-Provider LLM Abstraction Layer
 *
 * Routes LLM calls to either Claude (Anthropic) or Ollama based on
 * per-role configuration via environment variables.
 *
 * Roles:
 *   - tutor        → main tutoring agent (default: claude — fast, interactive)
 *   - language_agent → linguistic analysis (default: ollama — async, latency-tolerant)
 *
 * Env vars:
 *   TUTOR_PROVIDER        = claude | ollama   (default: claude)
 *   LANGUAGE_PROVIDER      = claude | ollama   (default: ollama)
 *   OLLAMA_URL             = http://ollama.railway.internal:11434  (Railway internal)
 *   OLLAMA_TUTOR_MODEL     = qwen3.5:9b        (default)
 *   OLLAMA_LANGUAGE_MODEL  = qwen3.5:4b         (default)
 */

const Anthropic = require('@anthropic-ai/sdk');

// ─── Provider configuration ────────────────────────────────────────
const PROVIDERS = {
  claude: {
    tutor: {
      model: 'claude-sonnet-4-20250514',
      maxTokens: 1024,
    },
    language_agent: {
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 256,
    },
  },
  ollama: {
    tutor: {
      model: process.env.OLLAMA_TUTOR_MODEL || 'qwen3.5:9b',
    },
    language_agent: {
      model: process.env.OLLAMA_LANGUAGE_MODEL || 'qwen3.5:4b',
    },
  },
};

// ─── Role → provider mapping ───────────────────────────────────────
const ROLE_PROVIDER = {
  tutor: (process.env.TUTOR_PROVIDER || 'claude').toLowerCase(),
  language_agent: (process.env.LANGUAGE_PROVIDER || 'ollama').toLowerCase(),
};

// ─── Shared Anthropic client (singleton) ───────────────────────────
let _anthropicClient = null;

function getAnthropicClient() {
  if (!_anthropicClient && process.env.ANTHROPIC_API_KEY) {
    _anthropicClient = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return _anthropicClient;
}

// ─── Ollama URL ────────────────────────────────────────────────────
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

// ─── Response cleaning helpers ─────────────────────────────────────

/**
 * Strip Qwen's <think>...</think> reasoning blocks before parsing.
 * Keeps the actual response content only.
 */
function stripThinking(text) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
}

/**
 * Strip markdown code fences that Ollama models sometimes wrap JSON in.
 */
function stripCodeFences(text) {
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
  }
  return cleaned.trim();
}

/**
 * Full response cleaning pipeline: strip thinking, then code fences.
 * Safe to call on Claude responses too (no-op if nothing to strip).
 */
function cleanResponse(text) {
  return stripCodeFences(stripThinking(text));
}

// ─── Claude provider ───────────────────────────────────────────────
async function chatClaude(role, systemPrompt, messages, options = {}) {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error('ANTHROPIC_API_KEY not set — cannot use Claude provider');
  }

  const config = PROVIDERS.claude[role];
  if (!config) {
    throw new Error(`Unknown role for Claude provider: ${role}`);
  }

  const response = await client.messages.create({
    model: options.model || config.model,
    max_tokens: options.maxTokens || config.maxTokens,
    system: systemPrompt,
    messages: messages.map((m) => ({
      role: m.role,
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    })),
  });

  return response.content[0]?.text || '';
}

// ─── Ollama provider ───────────────────────────────────────────────
async function chatOllama(role, systemPrompt, messages, options = {}) {
  const config = PROVIDERS.ollama[role];
  if (!config) {
    throw new Error(`Unknown role for Ollama provider: ${role}`);
  }

  const model = options.model || config.model;

  // Build Ollama-compatible messages array (OpenAI chat format)
  const ollamaMessages = [];

  if (systemPrompt) {
    ollamaMessages.push({ role: 'system', content: systemPrompt });
  }

  for (const m of messages) {
    ollamaMessages.push({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
    });
  }

  const body = {
    model,
    messages: ollamaMessages,
    stream: false,
    options: {
      temperature: options.temperature ?? 0.7,
      num_ctx: options.contextLength || 8192,
    },
  };

  if (options.maxTokens) {
    body.options.num_predict = options.maxTokens;
  }

  const response = await fetch(`${OLLAMA_URL}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Ollama API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

// ─── Unified chat interface ────────────────────────────────────────

/**
 * Send a chat request to the configured LLM provider for a given role.
 * If Ollama fails and ANTHROPIC_API_KEY is set, automatically falls back to Claude.
 *
 * @param {string} role - 'tutor' or 'language_agent'
 * @param {string} systemPrompt - System prompt text
 * @param {Array<{role: string, content: string}>} messages - Conversation messages
 * @param {Object} [options] - Override options (model, maxTokens, temperature)
 * @returns {Promise<string>} Cleaned text response from the LLM
 */
async function chat(role, systemPrompt, messages, options = {}) {
  const provider = ROLE_PROVIDER[role] || 'claude';

  console.log(`[LLM] ${role} → ${provider} (${PROVIDERS[provider]?.[role]?.model || 'unknown model'})`);

  try {
    let raw;
    if (provider === 'ollama') {
      raw = await chatOllama(role, systemPrompt, messages, options);
    } else {
      raw = await chatClaude(role, systemPrompt, messages, options);
    }
    // Clean response (strip thinking blocks + code fences)
    return cleanResponse(raw);
  } catch (error) {
    // If Ollama fails and Claude is available, try fallback
    if (provider === 'ollama' && process.env.ANTHROPIC_API_KEY) {
      const fallbackModel = role === 'tutor' ? 'claude-sonnet' : 'claude-haiku';
      console.warn(`[LLM] Ollama failed for ${role}, falling back to Claude (${fallbackModel}): ${error.message}`);
      try {
        const raw = await chatClaude(role, systemPrompt, messages, options);
        return cleanResponse(raw);
      } catch (fallbackError) {
        console.error(`[LLM] Claude fallback also failed for ${role}: ${fallbackError.message}`);
        throw fallbackError;
      }
    }
    throw error;
  }
}

/**
 * Check if a provider is available for a given role.
 *
 * @param {string} role - 'tutor' or 'language_agent'
 * @returns {boolean}
 */
function isProviderAvailable(role) {
  const provider = ROLE_PROVIDER[role] || 'claude';

  if (provider === 'claude') {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  if (provider === 'ollama') {
    // Ollama is available if URL is set; Claude fallback covers downtime
    return !!OLLAMA_URL || !!process.env.ANTHROPIC_API_KEY;
  }

  return false;
}

/**
 * Health check — verify a provider is reachable and has the right model.
 *
 * @param {string} role - 'tutor' or 'language_agent'
 * @returns {Promise<Object>} Status info
 */
async function checkProvider(role) {
  const providerKey = ROLE_PROVIDER[role];
  const provider = PROVIDERS[providerKey]?.[role];

  try {
    if (providerKey === 'ollama') {
      const resp = await fetch(`${OLLAMA_URL}/api/tags`);
      const data = await resp.json();
      const models = data.models?.map((m) => m.name) || [];
      return {
        status: 'ok',
        provider: providerKey,
        model: provider?.model,
        available_models: models,
        model_loaded: models.some((m) => m.startsWith(provider?.model?.split(':')[0])),
        fallback: process.env.ANTHROPIC_API_KEY ? 'claude available' : 'no fallback',
      };
    } else {
      return {
        status: process.env.ANTHROPIC_API_KEY ? 'ok' : 'no api key',
        provider: providerKey,
        model: provider?.model,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      provider: providerKey,
      model: provider?.model,
      error: error.message,
      fallback: process.env.ANTHROPIC_API_KEY ? 'claude available' : 'no fallback',
    };
  }
}

/**
 * Get info about the current provider configuration (for diagnostics).
 */
function getProviderInfo() {
  return {
    tutor: {
      provider: ROLE_PROVIDER.tutor,
      model: PROVIDERS[ROLE_PROVIDER.tutor]?.tutor?.model || 'unknown',
    },
    language_agent: {
      provider: ROLE_PROVIDER.language_agent,
      model: PROVIDERS[ROLE_PROVIDER.language_agent]?.language_agent?.model || 'unknown',
    },
    ollama_url: OLLAMA_URL,
    anthropic_key_set: !!process.env.ANTHROPIC_API_KEY,
  };
}

module.exports = {
  chat,
  cleanResponse,
  isProviderAvailable,
  checkProvider,
  getProviderInfo,
  ROLE_PROVIDER,
  PROVIDERS,
};
