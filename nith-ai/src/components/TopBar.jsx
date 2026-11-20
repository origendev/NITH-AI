import { Check, Menu, Settings, Share2 } from 'lucide-react';
import ModelSelector from './ModelSelector';
import { useCopy } from '../hooks/useCopy';

export default function TopBar({
  showMenuButton,
  onOpenSidebar,
  models,
  model,
  onModelChange,
  getShareText,
  canShare,
  onOpenSettings,
}) {
  const [copied, copy] = useCopy(2200);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between gap-2 px-2 sm:px-3">
      <div className="flex min-w-0 items-center gap-1">
        {showMenuButton && (
          <button
            type="button"
            onClick={onOpenSidebar}
            aria-label="Open sidebar"
            className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-fg/10"
          >
            <Menu size={22} />
          </button>
        )}
        <ModelSelector models={models} value={model} onChange={onModelChange} />
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={!canShare}
          onClick={() => copy(getShareText())}
          title={canShare ? 'Copy this conversation as Markdown' : 'Nothing to share yet'}
          className="flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium hover:bg-fg/10 disabled:opacity-40 disabled:hover:bg-transparent sm:border sm:border-fg/15 sm:px-4"
        >
          {copied ? <Check size={16} /> : <Share2 size={16} />}
          <span className="hidden sm:inline">{copied ? 'Copied' : 'Share'}</span>
          <span className="sr-only sm:hidden">{copied ? 'Copied' : 'Share conversation'}</span>
        </button>
        <button
          type="button"
          onClick={onOpenSettings}
          aria-label="Settings"
          title="Settings"
          className="flex h-11 w-11 items-center justify-center rounded-lg hover:bg-fg/10 sm:h-10 sm:w-10"
        >
          <Settings size={20} />
        </button>
      </div>
    </header>
  );
}
