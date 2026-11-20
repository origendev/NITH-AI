import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ApiError, DEFAULT_MODEL, streamChat } from '../services/api';
import { makeTitle, toApiContent, uid } from '../utils/text';
import { parseThink } from '../utils/think';

const CONVERSATIONS_KEY = 'nithai.conversations.v1';
const ACTIVE_KEY = 'nithai.activeConversation.v1';

function loadConversations() {
  try {
    const data = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
    if (!Array.isArray(data)) return [];
    return data
      .filter((c) => c && typeof c.id === 'string' && Array.isArray(c.messages))
      .map((c) => ({
        ...c,
        title: c.title || 'New chat',
        createdAt: c.createdAt || Date.now(),
        updatedAt: c.updatedAt || c.createdAt || Date.now(),
        // Drop assistant placeholders that were interrupted before any text arrived.
        messages: c.messages.filter(
          (m) => m && (m.role === 'user' || m.role === 'assistant') && (m.role === 'user' || m.content || m.error),
        ),
      }));
  } catch {
    return [];
  }
}

function saveConversations(conversations) {
  try {
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch {
    /* storage full or unavailable — conversations stay in memory */
  }
}

/**
 * All chat state: conversations, the active conversation, streaming, stop,
 * regenerate, rename, delete and local persistence.
 */
export function useChat({ model = DEFAULT_MODEL } = {}) {
  const initial = useRef(null);
  if (!initial.current) {
    const conversations = loadConversations();
    let activeId = null;
    try {
      const saved = localStorage.getItem(ACTIVE_KEY);
      if (saved && conversations.some((c) => c.id === saved)) activeId = saved;
    } catch {
      /* ignore */
    }
    initial.current = { conversations, activeId };
  }

  const [conversations, setConversations] = useState(initial.current.conversations);
  const [activeId, setActiveId] = useState(initial.current.activeId);
  const [streamingIds, setStreamingIds] = useState([]);

  // Mirrors so callbacks always read the latest values without re-creating.
  const conversationsRef = useRef(conversations);
  const activeIdRef = useRef(activeId);
  const modelRef = useRef(model);
  const controllers = useRef(new Map());
  conversationsRef.current = conversations;
  activeIdRef.current = activeId;
  modelRef.current = model;

  /* ---------------- persistence ---------------- */
  useEffect(() => {
    const timer = setTimeout(() => saveConversations(conversations), 300);
    return () => clearTimeout(timer);
  }, [conversations]);

  useEffect(() => {
    const flush = () => saveConversations(conversationsRef.current);
    const onVisibility = () => document.visibilityState === 'hidden' && flush();
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    try {
      if (activeId) localStorage.setItem(ACTIVE_KEY, activeId);
      else localStorage.removeItem(ACTIVE_KEY);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  useEffect(() => {
    const live = controllers.current;
    return () => live.forEach((controller) => controller.abort());
  }, []);

  /* ---------------- helpers ---------------- */
  const patchMessage = useCallback((convId, msgId, patch) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId
          ? c
          : { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) },
      ),
    );
  }, []);

  const removeMessage = useCallback((convId, msgId) => {
    setConversations((prev) =>
      prev.map((c) =>
        c.id !== convId ? c : { ...c, messages: c.messages.filter((m) => m.id !== msgId) },
      ),
    );
  }, []);

  /** Stream a reply into the assistant message `assistantId`. */
  const run = useCallback(
    async (convId, assistantId, history) => {
      const apiMessages = history
        .filter((m) => !m.error)
        .map((m) => ({
          role: m.role,
          content: m.role === 'assistant' ? parseThink(m.content).answer : toApiContent(m),
        }))
        .filter((m) => m.content.trim() !== '');

      const controller = new AbortController();
      controllers.current.set(convId, controller);
      setStreamingIds((ids) => [...ids.filter((id) => id !== convId), convId]);

      let text = '';
      let frame = null;
      const flush = () => {
        frame = null;
        patchMessage(convId, assistantId, { content: text });
      };
      const cancelFrame = () => {
        if (frame !== null) cancelAnimationFrame(frame);
        frame = null;
      };
      const touch = () =>
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, updatedAt: Date.now() } : c)),
        );

      try {
        await streamChat({
          messages: apiMessages,
          model: modelRef.current,
          signal: controller.signal,
          onToken: (token) => {
            text += token;
            if (frame === null) frame = requestAnimationFrame(flush);
          },
        });
        cancelFrame();
        if (!parseThink(text).answer.trim()) {
          patchMessage(convId, assistantId, {
            content: text,
            error: 'The model finished without producing an answer. Try regenerating.',
          });
        } else {
          patchMessage(convId, assistantId, { content: text });
        }
      } catch (err) {
        cancelFrame();
        if (err?.name === 'AbortError') {
          if (text.trim()) patchMessage(convId, assistantId, { content: text, stopped: true });
          else removeMessage(convId, assistantId);
        } else {
          const message =
            err instanceof ApiError
              ? err.message
              : 'Something went wrong while generating a reply. Please try again.';
          patchMessage(convId, assistantId, { content: text, error: message });
        }
      } finally {
        controllers.current.delete(convId);
        setStreamingIds((ids) => ids.filter((id) => id !== convId));
        touch();
      }
    },
    [patchMessage, removeMessage],
  );

  /* ---------------- public actions ---------------- */
  const send = useCallback(
    (text, attachments = []) => {
      const content = (text || '').trim();
      if (!content && attachments.length === 0) return false;

      const now = Date.now();
      let convId = activeIdRef.current;
      const existing = convId ? conversationsRef.current.find((c) => c.id === convId) : null;
      if (existing && controllers.current.has(convId)) return false; // already generating

      const userMessage = { id: uid(), role: 'user', content, createdAt: now };
      if (attachments.length) {
        userMessage.attachments = attachments.map(({ name, size, text: body }) => ({
          name,
          size,
          text: body,
        }));
      }
      const assistantMessage = { id: uid(), role: 'assistant', content: '', createdAt: now };
      const history = [...(existing ? existing.messages : []), userMessage];

      if (existing) {
        setConversations((prev) =>
          prev.map((c) =>
            c.id === convId
              ? { ...c, updatedAt: now, messages: [...c.messages, userMessage, assistantMessage] }
              : c,
          ),
        );
      } else {
        convId = uid();
        const created = {
          id: convId,
          title: makeTitle(content || attachments[0]?.name),
          createdAt: now,
          updatedAt: now,
          messages: [userMessage, assistantMessage],
        };
        setConversations((prev) => [created, ...prev]);
        setActiveId(convId);
      }

      run(convId, assistantMessage.id, history);
      return true;
    },
    [run],
  );

  const stop = useCallback(() => {
    controllers.current.get(activeIdRef.current)?.abort();
  }, []);

  const regenerate = useCallback(() => {
    const convId = activeIdRef.current;
    const conversation = conversationsRef.current.find((c) => c.id === convId);
    if (!conversation || controllers.current.has(convId)) return;

    let base = conversation.messages;
    if (base.length && base[base.length - 1].role === 'assistant') base = base.slice(0, -1);
    if (!base.length || base[base.length - 1].role !== 'user') return;

    const assistantMessage = { id: uid(), role: 'assistant', content: '', createdAt: Date.now() };
    setConversations((prev) =>
      prev.map((c) =>
        c.id === convId
          ? { ...c, updatedAt: Date.now(), messages: [...base, assistantMessage] }
          : c,
      ),
    );
    run(convId, assistantMessage.id, base);
  }, [run]);

  const newChat = useCallback(() => setActiveId(null), []);
  const selectChat = useCallback((id) => setActiveId(id), []);

  const renameChat = useCallback((id, title) => {
    const next = title.trim();
    if (!next) return;
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title: next } : c)));
  }, []);

  const deleteChat = useCallback((id) => {
    controllers.current.get(id)?.abort();
    setConversations((prev) => prev.filter((c) => c.id !== id));
    setActiveId((current) => (current === id ? null : current));
  }, []);

  const clearAll = useCallback(() => {
    controllers.current.forEach((controller) => controller.abort());
    setConversations([]);
    setActiveId(null);
    try {
      localStorage.removeItem(CONVERSATIONS_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const activeConversation = useMemo(
    () => conversations.find((c) => c.id === activeId) || null,
    [conversations, activeId],
  );

  return {
    conversations,
    activeId,
    activeConversation,
    streamingIds,
    isStreaming: activeId !== null && streamingIds.includes(activeId),
    send,
    stop,
    regenerate,
    newChat,
    selectChat,
    renameChat,
    deleteChat,
    clearAll,
  };
}
