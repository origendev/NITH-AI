export const uid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Build a short conversation title from the first user message. */
export function makeTitle(text, fallback = 'New chat') {
  const clean = String(text || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[#*_`>~[\]()]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return fallback;
  if (clean.length <= 40) return clean;
  const cut = clean.slice(0, 40);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 20 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function formatBytes(n) {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`;
}

/** A code fence longer than any backtick run inside `text`. */
export function fenceFor(text) {
  const runs = text.match(/`+/g) || [];
  const longest = runs.reduce((max, run) => Math.max(max, run.length), 0);
  return '`'.repeat(Math.max(3, longest + 1));
}

/**
 * The backend contract only carries plain-text `content`, so text attachments
 * are inlined into the user's message when the request is built.
 */
export function toApiContent(message) {
  if (!message.attachments?.length) return message.content;
  const files = message.attachments
    .map((file) => {
      const fence = fenceFor(file.text);
      return `File: ${file.name}\n${fence}\n${file.text}\n${fence}`;
    })
    .join('\n\n');
  return `${files}\n\n${message.content}`.trim();
}

/** Group conversations into ChatGPT-style date buckets (newest first). */
export function groupByDate(conversations, now = Date.now()) {
  const DAY = 86_400_000;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const t0 = today.getTime();
  const buckets = [
    ['Today', (t) => t >= t0],
    ['Yesterday', (t) => t >= t0 - DAY],
    ['Previous 7 days', (t) => t >= t0 - 7 * DAY],
    ['Previous 30 days', (t) => t >= t0 - 30 * DAY],
    ['Older', () => true],
  ];
  const groups = buckets.map(([label]) => ({ label, items: [] }));
  [...conversations]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((conv) => {
      const index = buckets.findIndex(([, test]) => test(conv.updatedAt));
      groups[index].items.push(conv);
    });
  return groups.filter((g) => g.items.length > 0);
}

/** Plain-markdown transcript used by the Share button. */
export function conversationToMarkdown(conversation, userName = 'You') {
  const lines = [`# ${conversation.title}`, ''];
  conversation.messages.forEach((m) => {
    if (m.error && !m.content) return;
    const who = m.role === 'user' ? userName || 'You' : 'Nith AI';
    const body =
      m.role === 'assistant'
        ? m.content.replace(/^\s*<think>[\s\S]*?(<\/think>|$)\s*/, '')
        : m.content;
    lines.push(`**${who}:**`, '', body.trim(), '');
  });
  return lines.join('\n').trim() + '\n';
}
