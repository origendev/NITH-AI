import { useEffect } from 'react';
import { createPortal } from 'react-dom';

// Only the top-most modal reacts to Escape (e.g. a confirm dialog opened from Settings).
const stack = [];

export default function Modal({ onClose, labelledBy, className = 'sm:max-w-md', children }) {
  useEffect(() => {
    const token = Symbol('modal');
    stack.push(token);
    const onKey = (event) => {
      if (event.key === 'Escape' && stack[stack.length - 1] === token) {
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      stack.splice(stack.indexOf(token), 1);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex animate-fade-in items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`max-h-[92dvh] w-full animate-pop overflow-y-auto rounded-t-3xl bg-surface text-fg shadow-2xl dark:bg-[#2b2b2b] sm:rounded-3xl ${className}`}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
