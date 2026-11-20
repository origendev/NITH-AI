import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  Settings,
  SquarePen,
  Sun,
  X,
} from 'lucide-react';
import Logo from './Logo';
import ConversationItem from './ConversationItem';
import ConfirmDialog from './ConfirmDialog';
import FloatingMenu, { MenuItem } from './FloatingMenu';
import { groupByDate } from '../utils/text';
import { formatShortcut, getShortcut } from '../utils/shortcuts';

function NavButton({ icon: Icon, label, onClick, compact, shortcut }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={compact ? label : undefined}
      className={`group flex h-10 items-center rounded-lg text-sm hover:bg-fg/10 ${
        compact ? 'w-10 justify-center' : 'w-full gap-3 px-3'
      }`}
    >
      <Icon size={18} className="shrink-0" />
      {!compact && <span className="flex-1 truncate text-left">{label}</span>}
      {!compact && shortcut && (
        <span className="hidden text-xs text-muted opacity-0 group-hover:opacity-100 md:inline">
          {shortcut}
        </span>
      )}
    </button>
  );
}

export default function Sidebar({
  conversations,
  activeId,
  streamingIds,
  userName,
  theme,
  compact,
  mobile,
  open,
  searchTick,
  onSelect,
  onNew,
  onRename,
  onDelete,
  onToggleTheme,
  onOpenSettings,
  onToggleCollapse,
  onClose,
}) {
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [profileAnchor, setProfileAnchor] = useState(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (searchTick > 0) {
      setSearchOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [searchTick]);

  const groups = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matches = needle
      ? conversations.filter(
          (c) =>
            c.title.toLowerCase().includes(needle) ||
            c.messages.some((m) => m.content.toLowerCase().includes(needle)),
        )
      : conversations;
    return groupByDate(matches);
  }, [conversations, query]);

  const closeSearch = () => {
    setQuery('');
    setSearchOpen(false);
  };

  const displayName = userName.trim() || 'Guest';
  const initial = displayName[0].toUpperCase();

  return (
    <>
      {mobile && open && (
        <div
          className="fixed inset-0 z-30 animate-fade-in bg-black/50"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        aria-label="Sidebar"
        {...(mobile && !open ? { inert: '' } : {})}
        className={`fixed inset-y-0 left-0 z-40 flex w-[min(300px,85vw)] flex-col bg-sidebar text-fg transition-transform duration-200 ease-out md:static md:z-auto md:translate-x-0 md:transition-[width] ${
          open ? 'translate-x-0' : '-translate-x-full'
        } ${compact ? 'md:w-[60px]' : 'md:w-[260px]'}`}
      >
        {/* Brand + collapse */}
        <div
          className={`flex h-14 shrink-0 items-center ${
            compact ? 'justify-center' : 'justify-between pl-3 pr-2'
          }`}
        >
          {compact ? (
            <button
              type="button"
              onClick={onToggleCollapse}
              title="Open sidebar"
              aria-label="Open sidebar"
              className="group flex h-10 w-10 items-center justify-center rounded-lg hover:bg-fg/10"
            >
              <Logo size={34} className="group-hover:hidden" />
              <PanelLeftOpen size={20} className="hidden group-hover:block" />
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onNew}
                aria-label="Nith AI — new chat"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-fg/10"
              >
                <Logo size={34} />
                <span className="text-base font-semibold tracking-tight">Nith AI</span>
              </button>
              <button
                type="button"
                onClick={mobile ? onClose : onToggleCollapse}
                aria-label={mobile ? 'Close sidebar' : 'Collapse sidebar'}
                title={mobile ? 'Close sidebar' : 'Collapse sidebar'}
                className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-fg/10 hover:text-fg"
              >
                {mobile ? <X size={20} /> : <PanelLeftClose size={20} />}
              </button>
            </>
          )}
        </div>

        {/* Primary actions */}
        <nav className={`flex flex-col gap-0.5 px-2 ${compact ? 'items-center' : ''}`}>
          <NavButton
            icon={SquarePen}
            label="New chat"
            onClick={onNew}
            compact={compact}
            shortcut={formatShortcut(getShortcut('new-chat'))}
          />
          {searchOpen && !compact ? (
            <div className="flex h-10 items-center gap-2 rounded-lg bg-fg/10 px-3">
              <Search size={18} className="shrink-0 text-muted" />
              <input
                ref={searchRef}
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => event.key === 'Escape' && closeSearch()}
                placeholder="Search chats"
                aria-label="Search chats"
                className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted md:text-sm"
              />
              <button
                type="button"
                onClick={closeSearch}
                aria-label="Close search"
                className="flex h-6 w-6 items-center justify-center rounded-md text-muted hover:text-fg"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <NavButton
              icon={Search}
              label="Search chats"
              compact={compact}
              shortcut={formatShortcut(getShortcut('search'))}
              onClick={() => {
                if (compact) onToggleCollapse();
                setSearchOpen(true);
                requestAnimationFrame(() => searchRef.current?.focus());
              }}
            />
          )}
        </nav>

        {/* Conversation history */}
        {compact ? (
          <div className="flex-1" />
        ) : (
          <div className="mt-3 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {groups.length === 0 ? (
              <p className="px-3 py-8 text-center text-sm text-muted">
                {query.trim() ? `No chats match “${query.trim()}”.` : 'No conversations yet. Start a new chat!'}
              </p>
            ) : (
              groups.map((group) => (
                <section key={group.label} className="mb-3">
                  <h3 className="px-3 pb-1 pt-2 text-xs font-medium text-muted">{group.label}</h3>
                  <ul className="flex flex-col gap-0.5">
                    {group.items.map((conversation) => (
                      <li key={conversation.id}>
                        <ConversationItem
                          conversation={conversation}
                          active={conversation.id === activeId}
                          streaming={streamingIds.includes(conversation.id)}
                          onSelect={onSelect}
                          onRename={onRename}
                          onDelete={setPendingDelete}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        )}

        {/* Profile */}
        <div className={`shrink-0 p-2 ${compact ? 'flex justify-center' : ''}`}>
          <button
            type="button"
            data-menu-trigger
            aria-haspopup="menu"
            aria-label="Account menu"
            title={compact ? displayName : undefined}
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setProfileAnchor((current) => (current ? null : rect));
            }}
            className={`flex items-center gap-3 rounded-lg hover:bg-fg/10 ${
              compact ? 'h-10 w-10 justify-center' : 'w-full p-2 text-left'
            } ${profileAnchor ? 'bg-fg/10' : ''}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-fg text-sm font-semibold text-surface">
              {initial}
            </span>
            {!compact && <span className="min-w-0 flex-1 truncate text-sm font-medium">{displayName}</span>}
          </button>
        </div>
      </aside>

      {profileAnchor && (
        <FloatingMenu
          anchor={profileAnchor}
          placement={compact ? 'right-end' : 'above-start'}
          width={compact ? 240 : 236}
          onClose={() => setProfileAnchor(null)}
        >
          <MenuItem
            icon={Settings}
            onClick={() => {
              setProfileAnchor(null);
              onOpenSettings();
            }}
          >
            Settings
          </MenuItem>
          <MenuItem
            icon={theme === 'dark' ? Sun : Moon}
            onClick={() => {
              setProfileAnchor(null);
              onToggleTheme();
            }}
          >
            {theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          </MenuItem>
        </FloatingMenu>
      )}

      {pendingDelete && (
        <ConfirmDialog
          danger
          title="Delete chat?"
          message={`“${pendingDelete.title}” will be permanently deleted from this browser. This can’t be undone.`}
          confirmLabel="Delete"
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => {
            onDelete(pendingDelete.id);
            setPendingDelete(null);
          }}
        />
      )}
    </>
  );
}
