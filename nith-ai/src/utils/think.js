const OPEN = '<think>';
const CLOSE = '</think>';

/**
 * Qwen3 emits its reasoning inside <think>…</think> before the answer.
 * Split a (possibly still streaming) message into thinking + answer.
 */
export function parseThink(text = '') {
  const trimmed = text.replace(/^\s+/, '');
  if (!trimmed.startsWith(OPEN)) {
    // Hide a half-streamed opening tag such as "<thi" instead of flashing it.
    if (trimmed.length > 0 && trimmed.length < OPEN.length && OPEN.startsWith(trimmed)) {
      return { thinking: '', answer: '', thinkingOpen: false };
    }
    return { thinking: '', answer: text, thinkingOpen: false };
  }
  const end = trimmed.indexOf(CLOSE);
  if (end === -1) {
    return { thinking: trimmed.slice(OPEN.length).trim(), answer: '', thinkingOpen: true };
  }
  return {
    thinking: trimmed.slice(OPEN.length, end).trim(),
    answer: trimmed.slice(end + CLOSE.length).replace(/^\s+/, ''),
    thinkingOpen: false,
  };
}
