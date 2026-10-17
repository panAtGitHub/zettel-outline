import { shortcutAction } from "../settings/Shortcuts.js";
// Run before document-level application hotkeys, but only for a focused outline.
export function captureOutlineKeys(viewport, handle, getSettings = () => ({})) {
  const ownerWindow = viewport.ownerDocument?.defaultView;
  if (!ownerWindow) return () => {};
  const listener = event => {
    if (viewport.ownerDocument.activeElement !== viewport || event.target !== viewport || event.isComposing) return;
    if (!shortcutAction(event,getSettings())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handle(event);
  };
  ownerWindow.addEventListener("keydown", listener, true);
  return () => ownerWindow.removeEventListener("keydown", listener, true);
}
