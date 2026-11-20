import { useCallback, useEffect, useRef, useState } from 'react';
import { copyText } from '../utils/clipboard';

/** Returns [copied, copy]. `copied` flips true for a moment after a successful copy. */
export function useCopy(resetAfter = 1800) {
  const [copied, setCopied] = useState(false);
  const timer = useRef();

  useEffect(() => () => clearTimeout(timer.current), []);

  const copy = useCallback(
    async (text) => {
      const ok = await copyText(text);
      if (ok) {
        setCopied(true);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setCopied(false), resetAfter);
      }
      return ok;
    },
    [resetAfter],
  );

  return [copied, copy];
}
