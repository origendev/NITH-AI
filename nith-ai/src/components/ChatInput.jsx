import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowUp, FileText, Paperclip, Square, X } from 'lucide-react';
import { formatBytes } from '../utils/text';

const MAX_FILES = 5;
const MAX_BYTES = 200 * 1024;
const ACCEPT =
  '.txt,.md,.markdown,.json,.csv,.tsv,.log,.xml,.html,.css,.js,.jsx,.ts,.tsx,.py,.java,.c,.cpp,.cs,.go,.rs,.sql,.sh,.yaml,.yml,.toml,.ini,.env,text/*';

export default function ChatInput({ isStreaming, onSend, onStop, focusKey }) {
  const [value, setValue] = useState('');
  const [files, setFiles] = useState([]);
  const [notice, setNotice] = useState('');
  const textareaRef = useRef(null);
  const fileRef = useRef(null);

  const canSend = (value.trim().length > 0 || files.length > 0) && !isStreaming;

  const resize = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, []);

  useEffect(resize, [value, resize]);

  // Focus on mount and whenever the conversation changes (desktop only, so the
  // mobile keyboard does not pop up unexpectedly).
  useEffect(() => {
    if (window.matchMedia('(pointer: fine)').matches) textareaRef.current?.focus();
  }, [focusKey]);

  useEffect(() => {
    if (!notice) return undefined;
    const timer = setTimeout(() => setNotice(''), 4000);
    return () => clearTimeout(timer);
  }, [notice]);

  const submit = () => {
    if (!canSend) return;
    const ok = onSend(value, files);
    if (ok !== false) {
      setValue('');
      setFiles([]);
    }
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      submit();
    }
  };

  const addFiles = async (fileList) => {
    const picked = Array.from(fileList || []);
    if (!picked.length) return;
    const next = [...files];
    const problems = [];
    for (const file of picked) {
      if (next.length >= MAX_FILES) {
        problems.push(`You can attach up to ${MAX_FILES} files.`);
        break;
      }
      if (file.size > MAX_BYTES) {
        problems.push(`${file.name} is larger than ${formatBytes(MAX_BYTES)}.`);
        continue;
      }
      try {
        const text = await file.text();
        if (text.includes('\u0000')) {
          problems.push(`${file.name} is not a text file.`);
          continue;
        }
        next.push({ id: `${file.name}-${file.size}-${file.lastModified}`, name: file.name, size: file.size, text });
      } catch {
        problems.push(`Couldn't read ${file.name}.`);
      }
    }
    setFiles(next);
    setNotice(problems[0] || '');
  };

  return (
    <div className="shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 sm:px-4">
      <div className="mx-auto w-full max-w-3xl">
        {notice && (
          <p role="status" className="mb-2 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-500">
            {notice}
          </p>
        )}

        <div className="rounded-[28px] bg-input px-2 py-2 shadow-sm focus-within:ring-1 focus-within:ring-fg/20">
          {files.length > 0 && (
            <ul className="flex flex-wrap gap-2 px-2 pb-2 pt-1">
              {files.map((file) => (
                <li
                  key={file.id}
                  className="flex max-w-full items-center gap-2 rounded-xl border border-fg/10 bg-surface/60 py-1.5 pl-3 pr-1.5 text-sm"
                >
                  <FileText size={16} className="shrink-0 text-muted" />
                  <span className="max-w-[180px] truncate">{file.name}</span>
                  <span className="shrink-0 text-xs text-muted">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((list) => list.filter((f) => f.id !== file.id))}
                    aria-label={`Remove ${file.name}`}
                    className="flex h-6 w-6 items-center justify-center rounded-full text-muted hover:bg-fg/10 hover:text-fg"
                  >
                    <X size={14} />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="flex items-end gap-1">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="hidden"
              onChange={(event) => {
                addFiles(event.target.files);
                event.target.value = '';
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              aria-label="Attach text files"
              title="Attach text files"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-muted hover:bg-fg/10 hover:text-fg sm:h-10 sm:w-10"
            >
              <Paperclip size={20} />
            </button>

            <textarea
              ref={textareaRef}
              value={value}
              rows={1}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Message Nith AI"
              aria-label="Message Nith AI"
              className="max-h-[200px] min-h-[44px] flex-1 resize-none bg-transparent px-2 py-[10px] text-base leading-6 outline-none placeholder:text-muted sm:min-h-[40px] sm:py-2"
            />

            {isStreaming ? (
              <button
                type="button"
                onClick={onStop}
                aria-label="Stop generating"
                title="Stop generating"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-surface hover:opacity-80 sm:h-10 sm:w-10"
              >
                <Square size={14} fill="currentColor" />
              </button>
            ) : (
              <button
                type="button"
                onClick={submit}
                disabled={!canSend}
                aria-label="Send message"
                title="Send message"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-fg text-surface transition-opacity hover:opacity-80 disabled:cursor-not-allowed disabled:opacity-25 sm:h-10 sm:w-10"
              >
                <ArrowUp size={20} />
              </button>
            )}
          </div>
        </div>

        <p className="mt-2 text-center text-xs text-muted">
          Nith AI can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
}
