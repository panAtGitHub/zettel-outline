export const defaultShortcuts = {
  moveUp:"Ctrl+Shift+ArrowUp", moveDown:"Ctrl+Shift+ArrowDown", newSibling:"Ctrl+Enter", newChild:"Ctrl+Shift+Enter", newParent:"Ctrl+Alt+Enter", newRoot:"", expandAll:"Ctrl+Alt+ArrowDown", collapseAll:"Ctrl+Alt+ArrowUp", help:"Ctrl+/", history:"", deleteFile:"Delete", indent:"Tab", outdent:"Shift+Tab", up:"ArrowUp", down:"ArrowDown", left:"ArrowLeft", right:"ArrowRight", open:"Enter", first:"Home", last:"End", rename:"Alt+Enter", undo:"Ctrl+z", redo:"Ctrl+y", redoAlt:"Ctrl+Shift+z"
};
export function keyBinding(event) {
  if (event.isComposing || ["Control","Shift","Alt","Meta","Dead","Process","Unidentified"].includes(event.key)) return null;
  const key=event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return [event.ctrlKey && "Ctrl", event.metaKey && "Meta", event.altKey && "Alt", event.shiftKey && "Shift", key].filter(Boolean).join("+");
}
export function effectiveShortcuts(settings={}) {
  const custom=settings.panelShortcuts??{},bindings={...defaultShortcuts,...custom};
  for(const action of Object.keys(bindings))if(!(action in custom)&&Object.entries(custom).some(([key,binding])=>key!==action&&binding&&binding===bindings[action]))bindings[action]='';
  return bindings;
}
export function shortcutAction(event, settings = {}) {
  const binding=keyBinding(event);
  const shortcuts=effectiveShortcuts(settings);
  // Also accept Command for the default Ctrl combinations on macOS.
  return Object.keys(shortcuts).find(action => shortcuts[action] && (shortcuts[action] === binding || (!settings.panelShortcuts?.[action] && binding?.startsWith("Meta+") && shortcuts[action] === binding.replace("Meta+","Ctrl+"))));
}
export function shortcutLabel(binding) {
  return binding.replace("ArrowUp","↑").replace("ArrowDown","↓").replace("ArrowLeft","←").replace("ArrowRight","→").replace("Enter","↵").replace(" ","Space");
}
