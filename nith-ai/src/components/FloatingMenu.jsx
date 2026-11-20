import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Popover menu rendered in a portal with fixed positioning, so it is never
 * clipped by scrolling or transformed ancestors (sidebar list, mobile drawer).
 *
 * `anchor` is the trigger's DOMRect. Triggers must carry `data-menu-trigger`
 * so that clicking them again toggles the menu instead of closing + reopening.
 */
export default function FloatingMenu({
  anchor,
  placement = 'below-end',
  width = 192,
  onClose,
  children,
}) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999 });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || !anchor) return;
    const height = el.offsetHeight;
    const margin = 8;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let top;
    let left;
    if (placement === 'above-start') {
      top = anchor.top - height - 8;
      left = anchor.left;
      if (top < margin) top = anchor.bottom + 8;
    } else if (placement === 'right-end') {
      left = anchor.right + 8;
      top = anchor.bottom - height;
    } else {
      top = anchor.bottom + 4;
      left = placement === 'below-start' ? anchor.left : anchor.right - width;
      if (top + height > vh - margin) top = anchor.top - height - 4;
    }
    left = Math.max(margin, Math.min(left, vw - width - margin));
    top = Math.max(margin, Math.min(top, vh - height - margin));
    setPos({ top, left });
  }, [anchor, placement, width]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (ref.current?.contains(event.target)) return;
      if (event.target.closest?.('[data-menu-trigger]')) return;
      onClose();
    };
    const onKey = (event) => event.key === 'Escape' && onClose();
    const onScroll = (event) => {
      if (!ref.current?.contains(event.target)) onClose();
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      style={{ position: 'fixed', top: pos.top, left: pos.left, width }}
      className="z-[70] animate-pop rounded-xl border border-fg/10 bg-surface p-1.5 text-fg shadow-xl dark:bg-input"
    >
      {children}
    </div>,
    document.body,
  );
}

export function MenuItem({ icon: Icon, children, onClick, danger = false, trailing }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={`flex min-h-10 w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-fg/10 ${
        danger ? 'text-red-500' : ''
      }`}
    >
      {Icon && <Icon size={18} className="shrink-0" />}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {trailing}
    </button>
  );
}
