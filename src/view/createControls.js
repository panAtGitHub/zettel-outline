export function resizeNumberInput(input, value) {
  const digits = Math.max(1, String(value).length);
  input.style.width = `max(20px, calc(${digits}ch + 10px))`;
}

export function bindImmediateHint(trigger, tooltip) {
  let pinned = false;
  const show = () => {
    const rect = trigger.getBoundingClientRect();
    tooltip.style.left = `${Math.max(8, Math.min(rect.left, trigger.ownerDocument.defaultView.innerWidth - 310))}px`;
    tooltip.style.top = `${rect.bottom + 6}px`;
    tooltip.style.setProperty("display", "block", "important");
  };
  const hide = () => tooltip.style.setProperty("display", "none", "important");
  hide();
  trigger.addEventListener("pointerenter", show);
  trigger.addEventListener("pointerleave", () => { if (!pinned) hide(); });
  trigger.addEventListener("focus", show);
  trigger.addEventListener("blur", () => { pinned = false; hide(); });
  trigger.addEventListener("click", event => { event.preventDefault(); event.stopPropagation(); pinned = !pinned; show(); });
  trigger.addEventListener("keydown", event => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); pinned = false; hide(); } });
}
