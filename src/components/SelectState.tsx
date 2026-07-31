"use client";

/**
 * Marks a native `<select>` with `data-open` while its list is showing, so CSS
 * can flip the chevron.
 *
 * There is no CSS selector for "this select is open". `:focus` is the usual
 * stand-in, but a select keeps focus after you pick an option — the arrow would
 * stay flipped while the list is closed, which is worse than not flipping at
 * all. So the state is tracked from the events that actually open and close it.
 *
 * One delegated listener set on the document covers every select in the app,
 * including ones rendered later, so no individual field has to opt in.
 */
import { useEffect } from "react";

const OPEN = "data-open";

export default function SelectState() {
  useEffect(() => {
    const sel = (t: EventTarget | null): HTMLSelectElement | null =>
      t instanceof HTMLSelectElement ? t : null;

    const onPointerDown = (e: Event) => {
      const el = sel(e.target);
      if (!el || el.multiple || el.disabled) return;
      // Pressing an already-open select closes it, so this toggles.
      if (el.hasAttribute(OPEN)) el.removeAttribute(OPEN);
      else el.setAttribute(OPEN, "");
    };

    // Picking a value, tabbing away or clicking elsewhere all close the list.
    const onClose = (e: Event) => sel(e.target)?.removeAttribute(OPEN);

    const onKey = (e: KeyboardEvent) => {
      const el = sel(e.target);
      if (!el) return;
      if (e.key === "Escape" || e.key === "Enter" || e.key === "Tab") {
        el.removeAttribute(OPEN);
      } else if (e.key === " " || e.key === "ArrowDown" || e.key === "ArrowUp") {
        el.setAttribute(OPEN, "");
      }
    };

    // Capture phase: `blur` and `change` do not bubble from form controls.
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("change", onClose, true);
    document.addEventListener("blur", onClose, true);
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("change", onClose, true);
      document.removeEventListener("blur", onClose, true);
      document.removeEventListener("keydown", onKey, true);
    };
  }, []);

  return null;
}
