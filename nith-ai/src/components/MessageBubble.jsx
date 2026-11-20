import { memo, useState } from 'react';
import { Check, ChevronDown, CircleAlert, Copy, FileText, RefreshCw } from 'lucide-react';
import Logo from './Logo';
import Markdown from './Markdown';
import { useCopy } from '../hooks/useCopy';
import { parseThink } from '../utils/think';
import { formatBytes } from '../utils/text';

const actionClass =
  'flex h-8 w-8 items-center justify-center rounded-lg text-muted hover:bg-fg/10 hover:text-fg';

function CopyButton({ text, label }) {
  const [copied, copy] = useCopy();
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      aria-label={copied ? 'Copied' : label}
      title={copied ? 'Copied' : label}
      className={actionClass}
    >
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}

function TypingIndicator() {
  return (
    <div className="flex h-7 items-center gap-1.5" role="status" aria-label="Nith AI is typing">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="h-2 w-2 animate-dot rounded-full bg-muted"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function ThinkingBlock({ text, active }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mb-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-sm text-muted hover:text-fg"
      >
        <span className={active ? 'animate-soft-pulse' : ''}>
          {active ? 'Thinking…' : 'Thought process'}
        </span>
        <ChevronDown size={16} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <p className="mt-2 whitespace-pre-wrap border-l-2 border-fg/15 pl-3 text-sm leading-6 text-muted">
          {text || 'Working through the question…'}
        </p>
      )}
    </div>
  );
}

function UserMessage({ message }) {
  return (
    <div className="group flex animate-fade-in-up flex-col items-end">
      {message.attachments?.length > 0 && (
        <div className="mb-2 flex max-w-[85%] flex-wrap justify-end gap-2 md:max-w-[70%]">
          {message.attachments.map((file, index) => (
            <span
              key={`${file.name}-${index}`}
              className="inline-flex max-w-full items-center gap-2 rounded-xl border border-fg/10 px-3 py-2 text-sm"
            >
              <FileText size={16} className="shrink-0 text-muted" />
              <span className="truncate">{file.name}</span>
              <span className="shrink-0 text-xs text-muted">{formatBytes(file.size)}</span>
            </span>
          ))}
        </div>
      )}
      {message.content && (
        <div className="max-w-[85%] whitespace-pre-wrap break-words rounded-3xl bg-input px-5 py-2.5 leading-7 md:max-w-[70%]">
          {message.content}
        </div>
      )}
      {message.content && (
        <div className="mt-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          <CopyButton text={message.content} label="Copy message" />
        </div>
      )}
    </div>
  );
}

function AssistantMessage({ message, isLast, isStreaming, onRegenerate }) {
  const { thinking, answer, thinkingOpen } = parseThink(message.content);
  const waiting = isStreaming && !answer && !thinkingOpen;
  const showActions = !isStreaming && (answer || message.error);

  return (
    <div className="group flex animate-fade-in-up gap-3 md:gap-4">
      <div className="mt-0.5 flex w-7 shrink-0 justify-center">
        <Logo size={36} pulse={isStreaming && !answer} />
      </div>
      <div className="min-w-0 flex-1">
        {(thinking || thinkingOpen) && (
          <ThinkingBlock text={thinking} active={isStreaming && thinkingOpen} />
        )}
        {answer && <Markdown streaming={isStreaming}>{answer}</Markdown>}
        {waiting && <TypingIndicator />}

        {message.error && (
          <div
            role="alert"
            className={`flex gap-3 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm ${
              answer ? 'mt-4' : ''
            }`}
          >
            <CircleAlert size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words leading-6">{message.error}</p>
              {isLast && (
                <button
                  type="button"
                  onClick={onRegenerate}
                  className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-fg/20 px-4 text-sm font-medium hover:bg-fg/10"
                >
                  <RefreshCw size={14} />
                  Try again
                </button>
              )}
            </div>
          </div>
        )}

        {message.stopped && !isStreaming && (
          <p className="mt-2 text-xs text-muted">Response stopped.</p>
        )}

        {showActions && (
          <div
            className={`-ml-2 mt-2 flex items-center gap-0.5 transition-opacity focus-within:opacity-100 [@media(hover:none)]:opacity-100 ${
              isLast ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            {answer && <CopyButton text={answer} label="Copy response" />}
            {isLast && (
              <button
                type="button"
                onClick={onRegenerate}
                aria-label="Regenerate response"
                title="Regenerate response"
                className={actionClass}
              >
                <RefreshCw size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isLast, isStreaming, onRegenerate }) {
  return message.role === 'user' ? (
    <UserMessage message={message} />
  ) : (
    <AssistantMessage
      message={message}
      isLast={isLast}
      isStreaming={isStreaming}
      onRegenerate={onRegenerate}
    />
  );
}

export default memo(MessageBubble);
