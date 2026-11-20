/**
 * Nith AI — backend API service.
 *
 * Contract (FastAPI):
 *   POST {API_BASE_URL}/api/chat
 *   body: { model: "qwen3:8b", messages: [{ role, content }], stream: true }
 *
 * The browser never talks to Ollama directly and no credentials live here.
 * To change the backend, edit the constants below or `streamChat`; the rest of
 * the app only depends on `streamChat`, `MODELS`, `DEFAULT_MODEL` and `ApiError`.
 */

// VITE_API_BASE_URL: URL of the FastAPI server. Empty string = same origin.
const configuredBase = import.meta.env?.VITE_API_BASE_URL;
export const API_BASE_URL = (
  configuredBase === undefined ? 'http://localhost:8000' : configuredBase
).replace(/\/+$/, '');

export const CHAT_ENDPOINT = '/api/chat';

export const MODELS = [
  { id: 'qwen3:8b', name: 'Nith AI', description: 'Chosen by the server (see backend/.env)' },
];
export const DEFAULT_MODEL = MODELS[0].id;

export class ApiError extends Error {
  /** @param {string} message user-facing text
   *  @param {{kind?: 'network'|'http'|'server'|'empty', status?: number, cause?: unknown}} [meta] */
  constructor(message, { kind = 'server', status, cause } = {}) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
    this.cause = cause;
  }
}

/* ------------------------------------------------------------------ */
/* Response parsing                                                    */
/* ------------------------------------------------------------------ */

/**
 * Pull `{ content, thinking }` out of one decoded payload. Understands the
 * shapes FastAPI proxies commonly forward: Ollama chat/generate, OpenAI-style
 * deltas, and simple `{ content }` / `{ token }` objects.
 */
function extract(payload) {
  if (payload == null) return {};
  if (typeof payload === 'string') return { content: payload };
  if (payload.error) {
    const text = typeof payload.error === 'string' ? payload.error : payload.error.message;
    throw new ApiError(text || 'The backend reported an error.', { kind: 'server' });
  }
  const message = payload.message;
  const choice = payload.choices?.[0];
  const delta = choice?.delta ?? choice?.message;

  const content =
    (typeof message === 'string' ? message : message?.content) ??
    payload.response ??
    delta?.content ??
    (typeof payload.delta === 'string' ? payload.delta : payload.delta?.text ?? payload.delta?.content) ??
    (typeof payload.content === 'string' ? payload.content : undefined) ??
    payload.token ??
    payload.text;

  const thinking =
    (typeof message === 'object' ? message?.thinking : undefined) ??
    payload.thinking ??
    delta?.reasoning_content ??
    delta?.reasoning;

  return {
    content: typeof content === 'string' ? content : undefined,
    thinking: typeof thinking === 'string' ? thinking : undefined,
  };
}

/**
 * Incremental parser. Auto-detects the wire format from the first bytes:
 *   - NDJSON  (`{"message":{"content":"Hi"}}\n…`)  — Ollama's native format
 *   - SSE     (`data: {...}\n\n`, optional `data: [DONE]`)
 *   - plain text chunks
 * Reasoning supplied through a separate `thinking` field is re-wrapped in
 * <think>…</think> so the UI has a single representation to render.
 */
export function createStreamParser(onToken) {
  let mode = null;
  let buffer = '';
  let raw = '';
  let emitted = false;
  let inThink = false;

  const out = (text) => {
    if (!text) return;
    emitted = true;
    onToken(text);
  };

  const emit = ({ content, thinking }) => {
    if (thinking) {
      if (!inThink) {
        inThink = true;
        out('<think>');
      }
      out(thinking);
    }
    if (content) {
      if (inThink) {
        inThink = false;
        out('</think>');
      }
      out(content);
    }
  };

  const handleLine = (line) => {
    let text = line.replace(/\r$/, '');
    if (mode === 'sse') {
      if (text === '' || text.startsWith(':') || /^(event|id|retry):/.test(text)) return;
      if (text.startsWith('data:')) text = text.slice(5).replace(/^ /, '');
    } else if (text.trim() === '') {
      return;
    }
    if (text.trim() === '[DONE]') return;

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = undefined;
    }
    if (parsed !== undefined && typeof parsed === 'object') emit(extract(parsed));
    else if (mode === 'sse') emit({ content: text }); // plain-text SSE payload
  };

  return {
    get emitted() {
      return emitted;
    },
    push(chunk) {
      if (!emitted) raw += chunk;
      if (mode === null) {
        buffer += chunk;
        const head = buffer.trimStart();
        if (!head) return;
        mode =
          head[0] === '{' ? 'json' : /^(data|event|id|retry):|^:/.test(head) ? 'sse' : 'text';
        chunk = buffer;
        buffer = '';
      }
      if (mode === 'text') {
        out(chunk);
        return;
      }
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop();
      lines.forEach(handleLine);
    },
    end() {
      if (mode === 'text' || mode === null) return;
      if (buffer) handleLine(buffer);
      buffer = '';
      // A single (possibly pretty-printed) JSON document instead of a stream.
      if (!emitted && mode === 'json') {
        try {
          emit(extract(JSON.parse(raw)));
        } catch (err) {
          if (err instanceof ApiError) throw err;
        }
      }
    },
  };
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

function httpMessage(status, detail) {
  let base;
  if (status === 404) {
    base = `The chat endpoint was not found (POST ${CHAT_ENDPOINT}). Check VITE_API_BASE_URL and the backend routes.`;
  } else if (status === 401 || status === 403) {
    base = 'The backend rejected the request (not authorised).';
  } else if (status === 400 || status === 422) {
    base = 'The backend could not understand the request.';
  } else if (status === 429) {
    base = 'The backend is busy right now. Please try again in a moment.';
  } else if (status === 502 || status === 503 || status === 504) {
    base =
      'The backend is reachable but the model is not responding. Ollama or the Kaggle session may be starting up or have stopped.';
  } else {
    base = `The backend returned an error (HTTP ${status}).`;
  }
  return detail ? `${base}\n\nDetails: ${detail}` : base;
}

async function readErrorDetail(response) {
  try {
    const text = (await response.text()).trim();
    if (!text || text.startsWith('<')) return '';
    try {
      const json = JSON.parse(text);
      const detail = json.detail ?? json.error ?? json.message;
      if (!detail) return '';
      return typeof detail === 'string' ? detail : JSON.stringify(detail);
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return '';
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Stream a chat completion.
 * @param {object} options
 * @param {{role: 'user'|'assistant'|'system', content: string}[]} options.messages
 * @param {string} [options.model]
 * @param {AbortSignal} [options.signal]
 * @param {(token: string) => void} options.onToken  called for every text fragment
 * @returns {Promise<void>} resolves when the stream ends; rejects with ApiError / AbortError
 */
export async function streamChat({ messages, model = DEFAULT_MODEL, signal, onToken }) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${CHAT_ENDPOINT}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'text/event-stream, application/x-ndjson, application/json, text/plain',
      },
      body: JSON.stringify({ model, messages, stream: true }),
      signal,
    });
  } catch (err) {
    if (err?.name === 'AbortError') throw err;
    const where = API_BASE_URL || 'this origin';
    throw new ApiError(
      `Can't reach the Nith AI backend at ${where}.\n\nMake sure the FastAPI server is running, VITE_API_BASE_URL points to it, and CORS allows this site.`,
      { kind: 'network', cause: err },
    );
  }

  if (!response.ok) {
    const detail = await readErrorDetail(response);
    throw new ApiError(httpMessage(response.status, detail), {
      kind: 'http',
      status: response.status,
    });
  }
  if (!response.body) {
    throw new ApiError('This browser cannot read streaming responses.', { kind: 'server' });
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createStreamParser(onToken);
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      parser.push(decoder.decode(value, { stream: true }));
    }
    parser.push(decoder.decode());
    parser.end();
  } catch (err) {
    if (err?.name === 'AbortError' || err instanceof ApiError) throw err;
    throw new ApiError('The connection to the backend was interrupted while the reply was streaming.', {
      kind: 'network',
      cause: err,
    });
  } finally {
    try {
      reader.releaseLock();
    } catch {
      /* already released */
    }
  }

  if (!parser.emitted) {
    throw new ApiError('The backend returned an empty response.', { kind: 'empty' });
  }
}
