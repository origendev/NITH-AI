import { useState } from 'react';
import { Monitor, Moon, Sun, X } from 'lucide-react';
import Modal from './Modal';
import ConfirmDialog from './ConfirmDialog';
import { API_BASE_URL, CHAT_ENDPOINT } from '../services/api';
import { SHORTCUTS, formatShortcut } from '../utils/shortcuts';

function Row({ title, children }) {
  return (
    <div className="border-t border-fg/10 py-4 first:border-t-0">
      <h3 className="mb-2 text-sm font-medium">{title}</h3>
      {children}
    </div>
  );
}

export default function SettingsModal({
  theme,
  onTheme,
  userName,
  onUserName,
  conversationCount,
  onClearAll,
  onClose,
}) {
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      <Modal onClose={onClose} labelledBy="settings-title" className="sm:max-w-lg">
        <div className="p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 id="settings-title" className="text-lg font-semibold">
              Settings
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close settings"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-fg/10"
            >
              <X size={20} />
            </button>
          </div>

          <Row title="Appearance">
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'light', label: 'Light', icon: Sun },
                { id: 'dark', label: 'Dark', icon: Moon },
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  aria-pressed={theme === id}
                  onClick={() => onTheme(id)}
                  className={`flex h-11 items-center justify-center gap-2 rounded-xl border text-sm font-medium ${
                    theme === id ? 'border-fg bg-fg/10' : 'border-fg/15 hover:bg-fg/5'
                  }`}
                >
                  <Icon size={18} />
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
              <Monitor size={14} /> Your choice is saved in this browser.
            </p>
          </Row>

          <Row title="Your name">
            <input
              value={userName}
              maxLength={40}
              onChange={(event) => onUserName(event.target.value)}
              placeholder="Shown in the sidebar"
              aria-label="Your name"
              className="h-11 w-full rounded-xl border border-fg/15 bg-transparent px-3 text-base outline-none focus:border-fg/40 sm:text-sm"
            />
          </Row>

          <Row title="Keyboard shortcuts">
            <ul className="space-y-1.5 text-sm">
              {SHORTCUTS.map((shortcut) => (
                <li key={shortcut.id} className="flex items-center justify-between">
                  <span className="text-muted">{shortcut.label}</span>
                  <kbd className="rounded-md bg-fg/10 px-2 py-0.5 font-mono text-xs">{formatShortcut(shortcut)}</kbd>
                </li>
              ))}
              <li className="flex items-center justify-between">
                <span className="text-muted">Send message</span>
                <kbd className="rounded-md bg-fg/10 px-2 py-0.5 font-mono text-xs">Enter</kbd>
              </li>
              <li className="flex items-center justify-between">
                <span className="text-muted">New line</span>
                <kbd className="rounded-md bg-fg/10 px-2 py-0.5 font-mono text-xs">Shift+Enter</kbd>
              </li>
            </ul>
          </Row>

          <Row title="Backend">
            <p className="break-all rounded-lg bg-fg/[0.06] px-3 py-2 font-mono text-xs">
              POST {API_BASE_URL || window.location.origin}
              {CHAT_ENDPOINT}
            </p>
            <p className="mt-2 text-xs text-muted">
              Set <code className="font-mono">VITE_API_BASE_URL</code> in <code className="font-mono">.env</code> to
              change it. Your API key lives only on the server.
            </p>
          </Row>

          <Row title="Data">
            <button
              type="button"
              disabled={conversationCount === 0}
              onClick={() => setConfirmClear(true)}
              className="h-11 rounded-full border border-red-500/40 px-5 text-sm font-medium text-red-500 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
            >
              Delete all chats ({conversationCount})
            </button>
          </Row>
        </div>
      </Modal>

      {confirmClear && (
        <ConfirmDialog
          danger
          title="Delete all chats?"
          message="Every conversation saved in this browser will be permanently deleted. This can’t be undone."
          confirmLabel="Delete all"
          onCancel={() => setConfirmClear(false)}
          onConfirm={() => {
            onClearAll();
            setConfirmClear(false);
            onClose();
          }}
        />
      )}
    </>
  );
}
