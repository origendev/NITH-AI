// Single source of truth for keyboard shortcuts: used by App (handling),
// Sidebar (hints) and SettingsModal (reference list).

export const isMac =
  typeof navigator !== 'undefined' &&
  /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');

export const SHORTCUTS = [
  { id: 'new-chat', key: 'o', shift: true, label: 'New chat' },
  { id: 'search', key: 'k', label: 'Search chats' },
  { id: 'sidebar', key: 'b', label: 'Toggle sidebar' },
  { id: 'theme', key: 'l', shift: true, label: 'Toggle theme' },
  { id: 'settings', key: ',', label: 'Open settings' },
];

export function matchShortcut(event) {
  if (!(event.metaKey || event.ctrlKey) || event.altKey) return null;
  const key = event.key.toLowerCase();
  const hit = SHORTCUTS.find((s) => s.key === key && !!s.shift === event.shiftKey);
  return hit ? hit.id : null;
}

export function formatShortcut(shortcut) {
  const key = shortcut.key.toUpperCase();
  return isMac
    ? `${shortcut.shift ? '⇧' : ''}⌘${key}`
    : `Ctrl+${shortcut.shift ? 'Shift+' : ''}${key}`;
}

export const getShortcut = (id) => SHORTCUTS.find((s) => s.id === id);
