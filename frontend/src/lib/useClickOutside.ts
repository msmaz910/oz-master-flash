import { useEffect, type RefObject } from "react";

/**
 * Calls `onClickOutside` when a mousedown lands outside `ref`.
 * Pass `enabled: false` to leave the listener detached (e.g. while a menu is closed).
 */
export function useClickOutside(
  ref: RefObject<HTMLElement | null>,
  onClickOutside: () => void,
  enabled: boolean = true
): void {
  useEffect(() => {
    if (!enabled) return;

    const handleMouseDown = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        onClickOutside();
      }
    };

    document.addEventListener("mousedown", handleMouseDown);
    return () => document.removeEventListener("mousedown", handleMouseDown);
  }, [ref, onClickOutside, enabled]);
}
