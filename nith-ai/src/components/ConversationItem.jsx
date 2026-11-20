import { useRef, useState } from 'react';
import { Ellipsis, Loader, Pencil, Trash2 } from 'lucide-react';
import FloatingMenu, { MenuItem } from './FloatingMenu';

export default function ConversationItem({
  conversation,
  active,
  streaming,
  onSelect,
  onRename,
  onDelete,
}) {
  const [anchor, setAnchor] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const finished = useRef(false);

  const startEditing = () => {
    setAnchor(null);
    setDraft(conversation.title);
    finished.current = false;
    setEditing(true);
  };

  const commit = () => {
    if (finished.current) return;
    finished.current = true;
    if (draft.trim() && draft.trim() !== conversation.title) onRename(conversation.id, draft);
    setEditing(false);
  };

  const cancel = () => {
    finished.current = true;
    setEditing(false);
  };

  return (
    <div
      className={`group relative flex h-10 items-center rounded-lg text-sm ${
        active || anchor ? 'bg-fg/10' : 'hover:bg-fg/5'
      }`}
    >
      {editing ? (
        <input
          autoFocus
          value={draft}
          maxLength={80}
          aria-label="Rename conversation"
          onChange={(event) => setDraft(event.target.value)}
          onFocus={(event) => event.target.select()}
          onBlur={commit}
          onKeyDown={(event) => {
            if (event.key === 'Enter') commit();
            if (event.key === 'Escape') cancel();
          }}
          className="mx-1 h-8 min-w-0 flex-1 rounded-md bg-surface px-2 text-base outline-none ring-1 ring-fg/30 dark:bg-input md:text-sm"
        />
      ) : (
        <>
          <button
            type="button"
            onClick={() => onSelect(conversation.id)}
            title={conversation.title}
            aria-current={active ? 'page' : undefined}
            className="h-full min-w-0 flex-1 truncate rounded-lg px-3 text-left"
          >
            {conversation.title}
          </button>
          {streaming && (
            <Loader size={14} aria-label="Generating" className="mr-1 shrink-0 animate-spin text-muted" />
          )}
          <button
            type="button"
            data-menu-trigger
            aria-label={`Options for ${conversation.title}`}
            aria-haspopup="menu"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setAnchor((current) => (current ? null : rect));
            }}
            className={`mr-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-muted hover:text-fg focus:opacity-100 [@media(hover:none)]:opacity-100 ${
              active || anchor ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <Ellipsis size={18} />
          </button>
        </>
      )}

      {anchor && (
        <FloatingMenu anchor={anchor} placement="below-end" width={176} onClose={() => setAnchor(null)}>
          <MenuItem icon={Pencil} onClick={startEditing}>
            Rename
          </MenuItem>
          <MenuItem
            icon={Trash2}
            danger
            onClick={() => {
              setAnchor(null);
              onDelete(conversation);
            }}
          >
            Delete
          </MenuItem>
        </FloatingMenu>
      )}
    </div>
  );
}
