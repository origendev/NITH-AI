import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import FloatingMenu from './FloatingMenu';

export default function ModelSelector({ models, value, onChange }) {
  const [anchor, setAnchor] = useState(null);
  const current = models.find((m) => m.id === value) || models[0];

  return (
    <>
      <button
        type="button"
        data-menu-trigger
        aria-haspopup="menu"
        aria-expanded={!!anchor}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          setAnchor((existing) => (existing ? null : rect));
        }}
        className={`flex h-10 items-center gap-1.5 rounded-lg px-3 text-lg font-medium hover:bg-fg/10 ${
          anchor ? 'bg-fg/10' : ''
        }`}
      >
        {current.name}
        <ChevronDown size={16} className="text-muted" />
      </button>

      {anchor && (
        <FloatingMenu anchor={anchor} placement="below-start" width={288} onClose={() => setAnchor(null)}>
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              role="menuitemradio"
              aria-checked={model.id === current.id}
              onClick={() => {
                onChange(model.id);
                setAnchor(null);
              }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-fg/10"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{model.name}</span>
                <span className="block text-xs text-muted">{model.description}</span>
              </span>
              {model.id === current.id && <Check size={18} className="shrink-0" />}
            </button>
          ))}
        </FloatingMenu>
      )}
    </>
  );
}
