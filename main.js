var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.js
var main_exports = {};
__export(main_exports, {
  ZettelOutlinePlugin: () => ZettelOutlinePlugin,
  ZettelOutlineSettingTab: () => ZettelOutlineSettingTab,
  default: () => main_default
});
module.exports = __toCommonJS(main_exports);

// src/utils/sanitize.js
function isSingleCharString(value) {
  return typeof value === "string" && value.length === 1;
}
function isDigitChar(ch) {
  return ch.length === 1 && ch >= "0" && ch <= "9";
}

// src/index/Parser.js
function validateDelimiterConstraints(settings) {
  const idSeg = settings.idSegmentDelimiter;
  const titleDelim = settings.titleDelimiter;
  if (!isSingleCharString(idSeg) || !isSingleCharString(titleDelim)) return "delimiter_constraints";
  if (idSeg === titleDelim) return "delimiter_constraints";
  if (isDigitChar(idSeg) || isDigitChar(titleDelim)) return "delimiter_constraints";
  return null;
}
function parseFileName(basename, settings) {
  const constraint = validateDelimiterConstraints(settings);
  if (constraint) return { ok: false, reason: constraint };
  const delimiter = settings.titleDelimiter;
  const idSegmentDelimiter = settings.idSegmentDelimiter;
  const allowTrim = settings.titleDelimiter === " " ? false : settings.allowTrimAroundDelimiter;
  const split = splitTitleAndIdStrict(basename, settings.idPosition, delimiter, allowTrim);
  if (!split.ok) return split;
  const title = split.title;
  const idKey = split.idKey;
  if (!title) return { ok: false, reason: "empty_title" };
  if (!idKey) return { ok: false, reason: "empty_id" };
  const parsedId = parseIdKey(idKey, idSegmentDelimiter);
  if (!parsedId.ok) return parsedId;
  const segments = parsedId.segments;
  const rootKey = String(segments[0]);
  const normalizedIdKey = normalizeIdForCompare(segments, idSegmentDelimiter);
  return {
    ok: true,
    parsed: { idKey, title, segments, normalizedIdKey, rootKey }
  };
}
function splitTitleAndIdStrict(basename, idPosition, delimiter, allowTrimAroundDelimiter) {
  if (delimiter === " ") {
    const split = splitBySingleSpaceDelimiter(basename, idPosition);
    if (!split.ok) return split;
    return { ok: true, title: split.title, idKey: split.idKey };
  }
  const index = idPosition === "prefix" ? basename.indexOf(delimiter) : basename.lastIndexOf(delimiter);
  if (index < 0) return { ok: false, reason: "no_delimiter" };
  let left = basename.slice(0, index);
  let right = basename.slice(index + delimiter.length);
  if (allowTrimAroundDelimiter) {
    if (left.endsWith(" ")) left = left.slice(0, -1);
    if (right.startsWith(" ")) right = right.slice(1);
    if (left.endsWith(" ")) return { ok: false, reason: "no_delimiter" };
    if (right.startsWith(" ")) return { ok: false, reason: "no_delimiter" };
  }
  if (idPosition === "prefix") {
    return { ok: true, idKey: left, title: right };
  }
  return { ok: true, title: left, idKey: right };
}
function splitBySingleSpaceDelimiter(basename, idPosition) {
  if (!basename.includes(" ")) return { ok: false, reason: "no_delimiter" };
  if (idPosition === "prefix") {
    const idx2 = basename.indexOf(" ");
    if (idx2 < 0) return { ok: false, reason: "no_delimiter" };
    if (idx2 > 0 && basename[idx2 - 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
    if (idx2 + 1 < basename.length && basename[idx2 + 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
    return { ok: true, idKey: basename.slice(0, idx2), title: basename.slice(idx2 + 1) };
  }
  const idx = basename.lastIndexOf(" ");
  if (idx < 0) return { ok: false, reason: "no_delimiter" };
  if (idx > 0 && basename[idx - 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
  if (idx + 1 < basename.length && basename[idx + 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
  return { ok: true, title: basename.slice(0, idx), idKey: basename.slice(idx + 1) };
}
function parseIdKey(idKey, idSegmentDelimiter) {
  if (!idKey) return { ok: false, reason: "empty_id" };
  const parts = idKey.split(idSegmentDelimiter);
  if (parts.length === 0) return { ok: false, reason: "invalid_id" };
  const segments = [];
  for (const part of parts) {
    if (!part) return { ok: false, reason: "invalid_id" };
    if (part.length > 4) return { ok: false, reason: "segment_too_long" };
    if (!/^\d+$/.test(part)) return { ok: false, reason: "invalid_id" };
    const value = Number(part);
    if (!Number.isFinite(value) || value < 0 || value > 9999) return { ok: false, reason: "invalid_id" };
    segments.push(value);
  }
  return { ok: true, segments };
}
function normalizeIdForCompare(segments, idSegmentDelimiter) {
  return segments.map((n) => String(n).padStart(4, "0")).join(idSegmentDelimiter);
}
function segmentsFromIdKey(idKey, idSegmentDelimiter) {
  const parsed = parseIdKey(idKey, idSegmentDelimiter);
  if (!parsed.ok) return null;
  return parsed.segments;
}

// src/index/Exclusions.js
function normalizeExcludedFolders(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
  return [...new Set(values.map((path) => String(path).trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "")).filter((path) => path && !path.split("/").some((part) => part === ".." || part === ".")))].sort();
}
function isDateId(id) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(id);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function exclusionReason(file, settings, parsed) {
  const path = String(file.path ?? "").replace(/\\/g, "/");
  if (normalizeExcludedFolders(settings.excludedFolders).some((folder) => path.startsWith(folder + "/"))) return "excluded_folder";
  if (settings.excludeDateIds && parsed?.ok && isDateId(parsed.parsed.idKey)) return "excluded_date";
  return null;
}
function parseIndexedFile(file, settings) {
  const parsed = parseFileName(file.basename, settings);
  const reason = exclusionReason(file, settings, parsed);
  return reason ? { ok: false, reason } : parsed;
}

// src/services/IndexService.js
var import_obsidian = require("obsidian");

// src/i18n/i18n.js
var dict = {
  en: {
    "create.invalidPosition": "Choose a position between 1 and the end of this level.",
    "shortcuts.newParent": "New parent note",
    "shortcuts.newRoot": "New top-level note",
    "shortcuts.expandAll": "Expand all",
    "shortcuts.collapseAll": "Collapse all",
    "shortcuts.help": "Show panel shortcuts",
    "shortcuts.history": "Show structure history",
    "shortcuts.scope": "Active only in the focused tree. Name inputs retain normal text editing shortcuts.",
    "create.parent": "New parent note",
    "create.undoHasContent": "The created note has content. Resolve its content before undoing creation.",
    "archive.kind.createsibling": "New sibling note",
    "archive.kind.createchild": "New child note",
    "archive.kind.createparent": "New parent note",
    "archive.kind.createroot": "New top-level note",
    "archive.kind.createfill": "Create missing note",
    "archive.title": "Structure history",
    "archive.open": "Show structure history",
    "archive.empty": "No history yet. Future renames and branch moves will be recorded.",
    "archive.previous": "Previous operation",
    "archive.next": "Next operation",
    "archive.onlyChanges": "Changed notes and parent context only",
    "archive.interrupted": "This operation did not finish normally. Check files before restoring.",
    "archive.before": "Before",
    "archive.after": "After",
    "archive.compare": "Structure comparison. Left/right arrows navigate operations.",
    "archive.scope": "Restores names, numbering and paths only. Note contents and newly added notes are retained.",
    "archive.restore": "Restore before state",
    "archive.blocked": "Restore blocked by {count} conflicts:",
    "archive.reason.rules": "Naming rules changed or index needs rebuilding",
    "archive.reason.missing": "Note missing or its identity cannot be verified",
    "archive.reason.occupied": "Destination path or number is occupied",
    "archive.noChanges": "Current structure already matches this state.",
    "archive.confirm": "Restore filenames for {count} notes. Review these changes:",
    "archive.apply": "Confirm restore",
    "archive.restored": "Structure restored. Undo returns to the preceding state.",
    "archive.moved": "Moved",
    "archive.added": "Added",
    "archive.removed": "Removed",
    "archive.storageError": "Unable to read or save structure history. Check plugin directory permissions.",
    "archive.unreadable": "Cannot read structure history. Structural edits are paused to protect recovery records.",
    "archive.conflicts": "Restore conflicts detected. Refresh the preview.",
    "archive.kind.rename": "Rename",
    "archive.kind.indent": "Indent",
    "archive.kind.outdent": "Outdent",
    "archive.kind.move": "Move branch",
    "archive.kind.edit": "Edit structure",
    "archive.kind.restore": "Restore structure",
    "archive.kind.undo": "Undo",
    "archive.kind.redo": "Redo",
    "move.drop.before": "Insert before {title}",
    "move.drop.after": "Insert after {title}",
    "move.drop.inside": "Make a child of {title}",
    "shortcuts.moveUp": "Move branch up",
    "shortcuts.moveDown": "Move branch down",
    "move.previewParent": "Append as the last child of {parent}",
    "move.previewRoot": "Append at the top level",
    "move.cycle": "Cannot move a branch into itself or its descendants.",
    "move.sameParent": "This branch already belongs to that level.",
    "move.dropRoot": "Drop here to move to the top level",
    "shortcuts.newSibling": "New sibling note",
    "shortcuts.newChild": "New child note",
    "shortcuts.deleteFile": "Delete selected file",
    "command.focus": "Focus outline panel",
    "command.focusNeedsList": "Switch to style 2 to use keyboard navigation.",
    "shortcuts.indent": "Indent branch",
    "shortcuts.outdent": "Outdent branch",
    "move.noPrevious": "No previous sibling to indent under.",
    "move.topLevel": "Top-level entries cannot be outdented.",
    "move.excluded": "Branch contains excluded files or its destination is invalid.",
    "move.full": "Destination numbering has reached 9999.",
    "move.conflict": "Branch changed or destination numbering is occupied.",
    "move.rollbackFailed": "Move and recovery were incomplete. Check files and rebuild the index.",
    "ignored.excluded_folder": "Excluded folder",
    "ignored.excluded_date": "Date ID",
    "exclude.title": "Exclusions",
    "exclude.folders": "Excluded folders",
    "exclude.foldersDesc": "One vault-relative path per line, including subfolders.",
    "exclude.dates": "Exclude date IDs",
    "exclude.datesDesc": "Exclude valid YYYY-MM-DD IDs, such as 2025-02-03. Off by default.",
    "exclude.apply": "Rebuild to apply. Files are not modified or deleted.",
    "exclude.creation": "The new note would be excluded. Adjust its number or destination folder.",
    "shortcuts.title": "Panel shortcuts",
    "shortcuts.desc": "Active only when the style 2 outline has focus. Click to record; Escape cancels, Backspace clears.",
    "shortcuts.up": "Previous row",
    "shortcuts.down": "Next row",
    "shortcuts.left": "Collapse or parent",
    "shortcuts.right": "Expand or child",
    "shortcuts.open": "Open note",
    "shortcuts.first": "First row",
    "shortcuts.last": "Last row",
    "shortcuts.rename": "Rename note",
    "shortcuts.undo": "Undo",
    "shortcuts.redo": "Redo",
    "shortcuts.redoAlt": "Redo (alternate)",
    "shortcuts.unbound": "Unassigned",
    "shortcuts.record": "Press shortcut\u2026",
    "shortcuts.conflict": "Another panel action uses this shortcut.",
    "shortcuts.reset": "Restore default shortcut",
    "history.busy": "An edit is already in progress.",
    "edit.missing": "The note no longer exists.",
    "edit.invalid": "Invalid note name or conflicting delimiter.",
    "edit.rules": "Rules changed or the index is unavailable. Rebuild first.",
    "edit.changed": "The file was changed externally. Cannot apply this operation.",
    "edit.conflict": "The destination filename already exists.",
    "create.numberHint": "Use the up and down arrow keys in the number field to increase or decrease the number.",
    "create.cancel": "Cancel",
    "create.titlePlaceholder": "Enter note name",
    "delete.file": "Delete file",
    "delete.failed": "Could not delete the note.",
    "create.fill": "Create note for this number",
    "create.sibling": "New sibling note",
    "create.child": "New child note",
    "create.root": "New top-level note",
    "create.number": "Number",
    "create.title": "Title",
    "create.submit": "Create",
    "create.menu": "New note",
    "create.rebuild": "Rebuild the index before creating a note.",
    "create.invalidNumber": "Use an integer from 0 to 9999.",
    "create.needTitle": "Enter a title.",
    "create.invalidTitle": "The title contains unsupported characters or delimiters.",
    "create.conflict": "This number or filename is already in use.",
    "create.failed": "Could not finish; check whether the note was created",
    "tree.expandAll": "Expand all",
    "tree.collapseAll": "Collapse all",
    "settings.outlineStyle.name": "Outline style",
    "settings.outlineStyle.classic": "Style 1 \xB7 Classic",
    "settings.outlineStyle.list": "Style 2 \xB7 Multilevel list",
    "settings.ui.live": "Changes appear immediately in the outline sidebar.",
    "settings.number.decrease": "Decrease",
    "settings.number.increase": "Increase",
    "settings.example.number": "Number",
    "settings.example.rebuildHint": "After changing parsing rules, click Rebuild index to apply them to the outline.",
    "settings.example.pending": "Rules have not been applied. Click Rebuild index to update the outline.",
    "settings.example.rebuildFailed": "Index rebuild failed. Please try again.",
    "settings.example.label": "Live example",
    "settings.example.title": "Sample note",
    "settings.example.titleLabel": "Title",
    "settings.example.result": "Parsed \u2192",
    "settings.example.levels": "Levels",
    "settings.example.trim": "Allows up to one space on each side of the title delimiter; shown above with spaces.",
    "settings.example.space": "Title and ID are separated by exactly one space. Trim is disabled.",
    "settings.example.strict": "ID must touch the title delimiter with no extra spaces.",
    "plugin.name": "Zettel Outline",
    "command.open": "Open Zettel Outline",
    "ribbon.tooltip": "Zettel Outline",
    "view.title": "Zettel Outline",
    "roots.header": "Root ({count})",
    "roots.stale": "Index is stale, rebuild required (Settings \u2192 Rebuild).",
    "tree.loading": "Loading...",
    "tree.stale": "Index is stale. Please rebuild in Settings.",
    "tree.hint.collapsed": "Open a file in the outline to show its tree",
    "tree.hint.fileNotInIndex": "Current file is not in the outline tree",
    "settings.title": "Zettel Outline",
    "settings.section.rules": "Parsing rules",
    "settings.section.ui": "UI",
    "settings.section.index": "Index",
    "settings.section.advanced": "Advanced",
    "settings.idPosition.name": "ID position",
    "settings.idPosition.desc": "Choose one mode only: prefix or suffix.",
    "settings.idPosition.prefix": "prefix (ID + delimiter + title)",
    "settings.idPosition.suffix": "suffix (title + delimiter + ID)",
    "settings.idSegmentDelimiter.name": "ID segment delimiter",
    "settings.idSegmentDelimiter.desc": "Single char, not a digit, and must differ from title delimiter.",
    "settings.titleDelimiter.name": "Title delimiter",
    "settings.titleDelimiter.desc": "Single char delimiter between title and ID. Space is allowed (with strict 1-space rule).",
    "settings.allowTrim.name": "Allow trim around delimiter",
    "settings.allowTrim.desc": "If enabled, allows at most 1 space on each side of the title delimiter. Disabled when title delimiter is space.",
    "settings.manualRebuild.name": "Manual rebuild on rule change",
    "settings.manualRebuild.desc": "If enabled, rule changes mark index stale and require manual rebuild.",
    "settings.trustCache.name": "Trust cache on startup",
    "settings.trustCache.desc": "If enabled and settingsHash matches, renders from cache first, then validates in background.",
    "settings.showIgnoredSummary.name": "Show ignored summary notice",
    "settings.showIgnoredSummary.desc": "After rebuild/scan, show one summary notice of ignored files and reasons.",
    "settings.debounce.name": "Debounce (ms)",
    "settings.debounce.desc": "Debounce for incremental updates.",
    "settings.rowHeight.name": "Row height (px)",
    "settings.rowHeight.desc": "Row height for virtual tree.",
    "settings.overscan.name": "Overscan rows",
    "settings.overscan.desc": "Extra rows rendered above and below viewport.",
    "settings.profiler.name": "Enable profiler",
    "settings.profiler.desc": "Logs timings to console.",
    "settings.treeRootTitleColor.name": "Root title color",
    "settings.treeRootTitleColor.desc": "Applies to the root title row (default follows theme accent).",
    "settings.treeLevel1TitleColor.name": "Level-1 title color",
    "settings.treeLevel1TitleColor.desc": "Applies to level-1 titles (e.g. 1. xxx). Default follows theme.",
    "settings.color.reset": "Reset to theme default",
    "settings.rebuild.name": "Rebuild index",
    "settings.rebuild.desc": "Re-scan vault and rebuild index (required when index is stale).",
    "settings.rebuild.button": "Rebuild",
    "notice.delimiterDigitNotAllowed": "Delimiter cannot be a digit character.",
    "notice.delimiterSameNotAllowed": "Delimiters must be different.",
    "notice.trimNotAllowedWhenSpaceDelimiter": "Trim mode cannot be enabled when title delimiter is space.",
    "notice.invalidDelimiterConstraints": "Invalid parse rule: delimiter constraints not satisfied.",
    "notice.conflict": "ID conflict: {id}. Files: {files}. Please search and rename.",
    "notice.conflictFilesTotal": "Total {count} conflicting files.",
    "notice.conflictIdsTotal": "Total {count} IDs have conflicts.",
    "notice.ignoredSummaryHeader": "Ignored summary: {count} files ignored",
    "notice.rebuildComplete": "Index rebuild completed.",
    "notice.rootFileMissing": "Root {rootKey} has no root note file.",
    "ignored.no_delimiter": "no title delimiter",
    "ignored.empty_title": "empty title",
    "ignored.empty_id": "empty ID",
    "ignored.invalid_id": "invalid ID",
    "ignored.segment_too_long": "segment >4 digits",
    "ignored.space_delimiter_not_exact_one": "space delimiter not exact one",
    "ignored.delimiter_constraints": "delimiter constraints violated"
  },
  zh: {
    "create.invalidPosition": "\u8BF7\u8F93\u5165\u672C\u5C42\u53EF\u7528\u7684\u4F4D\u7F6E\u7F16\u53F7\uFF0C\u8303\u56F4\u4E3A 1 \u5230\u672B\u5C3E\u65B0\u589E\u4F4D\u7F6E\u3002",
    "shortcuts.newParent": "\u65B0\u5EFA\u7236\u7B14\u8BB0",
    "shortcuts.newRoot": "\u65B0\u5EFA\u9876\u5C42\u7B14\u8BB0",
    "shortcuts.expandAll": "\u5168\u90E8\u5C55\u5F00",
    "shortcuts.collapseAll": "\u5168\u90E8\u6298\u53E0",
    "shortcuts.help": "\u663E\u793A\u9762\u677F\u5FEB\u6377\u952E",
    "shortcuts.history": "\u67E5\u770B\u7ED3\u6784\u5386\u53F2",
    "shortcuts.scope": "\u4EC5\u5728\u7B14\u8BB0\u6811\u83B7\u5F97\u7126\u70B9\u65F6\u751F\u6548\uFF1B\u540D\u79F0\u8F93\u5165\u6846\u5185\u4FDD\u7559\u6587\u5B57\u7F16\u8F91\u5FEB\u6377\u952E\u3002",
    "create.parent": "\u65B0\u5EFA\u7236\u7B14\u8BB0",
    "create.undoHasContent": "\u65B0\u5EFA\u7B14\u8BB0\u5DF2\u6709\u6B63\u6587\uFF0C\u4E0D\u80FD\u64A4\u9500\u521B\u5EFA\uFF1B\u8BF7\u5148\u5904\u7406\u6B63\u6587\u5185\u5BB9\u3002",
    "archive.kind.createsibling": "\u65B0\u5EFA\u540C\u7EA7\u7B14\u8BB0",
    "archive.kind.createchild": "\u65B0\u5EFA\u5B50\u7B14\u8BB0",
    "archive.kind.createparent": "\u65B0\u5EFA\u7236\u7B14\u8BB0",
    "archive.kind.createroot": "\u65B0\u5EFA\u9876\u5C42\u7B14\u8BB0",
    "archive.kind.createfill": "\u8865\u5EFA\u7B14\u8BB0",
    "archive.title": "\u7ED3\u6784\u5386\u53F2",
    "archive.open": "\u67E5\u770B\u7ED3\u6784\u5386\u53F2",
    "archive.empty": "\u5C1A\u65E0\u7ED3\u6784\u5386\u53F2\u3002\u4E4B\u540E\u7684\u6539\u540D\u3001\u79FB\u52A8\u548C\u5347\u964D\u7EA7\u4F1A\u81EA\u52A8\u8BB0\u5F55\u3002",
    "archive.previous": "\u4E0A\u4E00\u6B21\u64CD\u4F5C",
    "archive.next": "\u4E0B\u4E00\u6B21\u64CD\u4F5C",
    "archive.onlyChanges": "\u4EC5\u770B\u53D8\u5316\u53CA\u76F8\u5173\u7236\u8282\u70B9",
    "archive.interrupted": "\u8FD9\u6B21\u64CD\u4F5C\u672A\u6B63\u5E38\u5B8C\u6210\u3002\u8BF7\u6838\u5BF9\u6587\u4EF6\u72B6\u6001\u540E\u518D\u5C1D\u8BD5\u6062\u590D\u3002",
    "archive.before": "\u4FEE\u6539\u524D",
    "archive.after": "\u4FEE\u6539\u540E",
    "archive.compare": "\u7ED3\u6784\u524D\u540E\u5BF9\u6BD4\uFF0C\u5DE6\u53F3\u65B9\u5411\u952E\u5207\u6362\u64CD\u4F5C",
    "archive.scope": "\u4EC5\u6062\u590D\u540D\u79F0\u3001\u7F16\u53F7\u548C\u8DEF\u5F84\uFF0C\u4E0D\u8986\u76D6\u6B63\u6587\uFF0C\u4E0D\u5220\u9664\u540E\u6765\u65B0\u589E\u7684\u7B14\u8BB0\u3002",
    "archive.restore": "\u6062\u590D\u5230\u4FEE\u6539\u524D",
    "archive.blocked": "\u6709 {count} \u9879\u51B2\u7A81\uFF0C\u6682\u4E0D\u80FD\u6062\u590D\uFF1A",
    "archive.reason.rules": "\u547D\u540D\u89C4\u5219\u5DF2\u6539\u53D8\u6216\u7D22\u5F15\u9700\u8981\u91CD\u5EFA",
    "archive.reason.missing": "\u6587\u4EF6\u7F3A\u5931\u6216\u65E0\u6CD5\u786E\u8BA4\u662F\u539F\u6765\u7684\u7B14\u8BB0",
    "archive.reason.occupied": "\u76EE\u6807\u8DEF\u5F84\u6216\u7F16\u53F7\u5DF2\u88AB\u5360\u7528",
    "archive.noChanges": "\u5F53\u524D\u7ED3\u6784\u5DF2\u4E0E\u8FD9\u4E00\u7248\u672C\u4E00\u81F4\u3002",
    "archive.confirm": "\u5C06\u6062\u590D {count} \u7BC7\u7B14\u8BB0\u7684\u6587\u4EF6\u540D\u3002\u8BF7\u6838\u5BF9\u4EE5\u4E0B\u6539\u52A8\uFF1A",
    "archive.apply": "\u786E\u8BA4\u6062\u590D",
    "archive.restored": "\u7ED3\u6784\u5DF2\u6062\u590D\uFF0C\u53EF\u7528\u64A4\u9500\u8FD4\u56DE\u6062\u590D\u524D\u3002",
    "archive.moved": "\u79FB\u5C42",
    "archive.added": "\u65B0\u589E",
    "archive.removed": "\u79FB\u9664",
    "archive.storageError": "\u7ED3\u6784\u5386\u53F2\u4FDD\u5B58\u6216\u8BFB\u53D6\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u63D2\u4EF6\u76EE\u5F55\u6743\u9650\u3002",
    "archive.unreadable": "\u7ED3\u6784\u5386\u53F2\u6587\u4EF6\u65E0\u6CD5\u8BFB\u53D6\uFF0C\u5DF2\u6682\u505C\u7ED3\u6784\u7F16\u8F91\u4EE5\u4FDD\u62A4\u6062\u590D\u8BB0\u5F55\u3002",
    "archive.conflicts": "\u7ED3\u6784\u6062\u590D\u5B58\u5728\u51B2\u7A81\uFF0C\u8BF7\u91CD\u65B0\u67E5\u770B\u9884\u89C8\u3002",
    "archive.kind.rename": "\u4FEE\u6539\u540D\u79F0",
    "archive.kind.indent": "\u964D\u4E00\u7EA7",
    "archive.kind.outdent": "\u5347\u4E00\u7EA7",
    "archive.kind.move": "\u79FB\u52A8\u5206\u652F",
    "archive.kind.edit": "\u7F16\u8F91\u7ED3\u6784",
    "archive.kind.restore": "\u6062\u590D\u7ED3\u6784",
    "archive.kind.undo": "\u64A4\u9500",
    "archive.kind.redo": "\u91CD\u505A",
    "move.drop.before": "\u63D2\u5165\u5230\u300C{title}\u300D\u4E4B\u524D",
    "move.drop.after": "\u63D2\u5165\u5230\u300C{title}\u300D\u4E4B\u540E",
    "move.drop.inside": "\u6210\u4E3A\u300C{title}\u300D\u7684\u5B50\u9879",
    "shortcuts.moveUp": "\u5206\u652F\u4E0A\u79FB",
    "shortcuts.moveDown": "\u5206\u652F\u4E0B\u79FB",
    "move.previewParent": "\u6210\u4E3A\u300C{parent}\u300D\u7684\u672B\u5C3E\u5B50\u9879",
    "move.previewRoot": "\u8FFD\u52A0\u5230\u9876\u5C42\u672B\u5C3E",
    "move.cycle": "\u4E0D\u80FD\u79FB\u52A8\u5230\u81EA\u8EAB\u6216\u5B50\u8282\u70B9\u4E0B\u9762\u3002",
    "move.sameParent": "\u8BE5\u6761\u76EE\u5DF2\u7ECF\u5C5E\u4E8E\u8FD9\u4E00\u5C42\u7EA7\u3002",
    "move.dropRoot": "\u62D6\u5230\u8FD9\u91CC\uFF0C\u79FB\u81F3\u9876\u5C42",
    "shortcuts.newSibling": "\u65B0\u5EFA\u540C\u7EA7\u7B14\u8BB0",
    "shortcuts.newChild": "\u65B0\u5EFA\u5B50\u7B14\u8BB0",
    "shortcuts.deleteFile": "\u5220\u9664\u5F53\u524D\u6587\u4EF6",
    "command.focus": "\u6253\u5F00\u5361\u7247\u7B14\u8BB0\u6811",
    "command.focusNeedsList": "\u8BF7\u5148\u5207\u6362\u5230\u6837\u5F0F\u4E8C\uFF0C\u518D\u4F7F\u7528\u9762\u677F\u952E\u76D8\u64CD\u4F5C\u3002",
    "shortcuts.indent": "\u964D\u4E00\u7EA7",
    "shortcuts.outdent": "\u5347\u4E00\u7EA7",
    "move.noPrevious": "\u6CA1\u6709\u524D\u4E00\u4E2A\u540C\u7EA7\u6761\u76EE\uFF0C\u65E0\u6CD5\u964D\u7EA7\u3002",
    "move.topLevel": "\u9876\u5C42\u6761\u76EE\u4E0D\u80FD\u518D\u5347\u7EA7\u3002",
    "move.excluded": "\u5206\u652F\u5305\u542B\u6392\u9664\u6587\u4EF6\uFF0C\u6216\u76EE\u6807\u7F16\u53F7\u4E0D\u7B26\u5408\u5F53\u524D\u89C4\u5219\uFF0C\u65E0\u6CD5\u79FB\u52A8\u3002",
    "move.full": "\u76EE\u6807\u5C42\u7EA7\u7F16\u53F7\u5DF2\u8FBE\u5230 9999\u3002",
    "move.conflict": "\u5206\u652F\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u4FEE\u6539\uFF0C\u6216\u76EE\u6807\u7F16\u53F7\u5DF2\u88AB\u5360\u7528\u3002",
    "move.rollbackFailed": "\u79FB\u52A8\u672A\u5B8C\u6210\u4E14\u672A\u80FD\u5B8C\u5168\u6062\u590D\uFF0C\u8BF7\u68C0\u67E5\u6587\u4EF6\u5E76\u91CD\u5EFA\u7D22\u5F15\u3002",
    "ignored.excluded_folder": "\u5DF2\u6392\u9664\u6587\u4EF6\u5939",
    "ignored.excluded_date": "\u5DF2\u6392\u9664\u65E5\u671F\u7F16\u53F7",
    "exclude.title": "\u6392\u9664\u89C4\u5219",
    "exclude.folders": "\u6392\u9664\u6587\u4EF6\u5939",
    "exclude.foldersDesc": "\u6BCF\u884C\u4E00\u4E2A\u5E93\u5185\u8DEF\u5F84\uFF0C\u5305\u542B\u5176\u5B50\u6587\u4EF6\u5939\uFF0C\u5982\uFF1A\u65E5\u8BB0 \u6216 \u5F52\u6863/\u65E5\u8BB0\u3002",
    "exclude.dates": "\u6392\u9664\u65E5\u671F\u7F16\u53F7",
    "exclude.datesDesc": "\u6392\u9664\u7F16\u53F7\u4E3A\u6709\u6548\u65E5\u671F\u7684\u7B14\u8BB0\uFF0C\u5982 2025-02-03\uFF1B\u9ED8\u8BA4\u5173\u95ED\u3002",
    "exclude.apply": "\u4FEE\u6539\u540E\u91CD\u5EFA\u7D22\u5F15\u751F\u6548\uFF0C\u4E0D\u4FEE\u6539\u6216\u5220\u9664\u6587\u4EF6\u3002",
    "exclude.creation": "\u65B0\u7B14\u8BB0\u5C06\u88AB\u5F53\u524D\u6392\u9664\u89C4\u5219\u5FFD\u7565\uFF0C\u8BF7\u8C03\u6574\u7F16\u53F7\u6216\u65B0\u7B14\u8BB0\u4FDD\u5B58\u4F4D\u7F6E\u3002",
    "shortcuts.title": "\u9762\u677F\u5FEB\u6377\u952E",
    "shortcuts.desc": "\u4EC5\u5728\u6837\u5F0F\u4E8C\u7684\u7B14\u8BB0\u6811\u83B7\u5F97\u7126\u70B9\u65F6\u751F\u6548\u3002\u70B9\u51FB\u6309\u952E\u6309\u94AE\u540E\u5F55\u5165\uFF1BEsc \u53D6\u6D88\uFF0C\u9000\u683C\u952E\u6E05\u9664\u3002",
    "shortcuts.up": "\u4E0A\u4E00\u884C",
    "shortcuts.down": "\u4E0B\u4E00\u884C",
    "shortcuts.left": "\u6298\u53E0\u6216\u8FD4\u56DE\u7236\u884C",
    "shortcuts.right": "\u5C55\u5F00\u6216\u8FDB\u5165\u5B50\u884C",
    "shortcuts.open": "\u6253\u5F00\u7B14\u8BB0",
    "shortcuts.first": "\u7B2C\u4E00\u884C",
    "shortcuts.last": "\u6700\u540E\u4E00\u884C",
    "shortcuts.rename": "\u4FEE\u6539\u7B14\u8BB0\u540D\u79F0",
    "shortcuts.undo": "\u64A4\u9500",
    "shortcuts.redo": "\u91CD\u505A",
    "shortcuts.redoAlt": "\u91CD\u505A\uFF08\u5907\u7528\uFF09",
    "shortcuts.unbound": "\u672A\u8BBE\u7F6E",
    "shortcuts.record": "\u8BF7\u6309\u5FEB\u6377\u952E\u2026",
    "shortcuts.conflict": "\u8BE5\u5FEB\u6377\u952E\u5DF2\u88AB\u5176\u4ED6\u9762\u677F\u64CD\u4F5C\u4F7F\u7528\u3002",
    "shortcuts.reset": "\u6062\u590D\u9ED8\u8BA4\u5FEB\u6377\u952E",
    "history.busy": "\u6B63\u5728\u5904\u7406\u4E0A\u4E00\u9879\u4FEE\u6539\uFF0C\u8BF7\u7A0D\u5019\u3002",
    "edit.missing": "\u7B14\u8BB0\u5DF2\u4E0D\u5B58\u5728\u3002",
    "edit.invalid": "\u7B14\u8BB0\u540D\u79F0\u4E0D\u5408\u6CD5\uFF0C\u6216\u4E0E\u5F53\u524D\u5206\u9694\u7B26\u51B2\u7A81\u3002",
    "edit.rules": "\u547D\u540D\u89C4\u5219\u5DF2\u6539\u53D8\u6216\u7D22\u5F15\u4E0D\u53EF\u7528\uFF0C\u8BF7\u5148\u91CD\u5EFA\u7D22\u5F15\u3002",
    "edit.changed": "\u6587\u4EF6\u5DF2\u88AB\u5176\u4ED6\u64CD\u4F5C\u6539\u540D\uFF0C\u65E0\u6CD5\u7EE7\u7EED\u64A4\u9500\u6216\u91CD\u505A\u3002",
    "edit.conflict": "\u76EE\u6807\u6587\u4EF6\u540D\u5DF2\u5B58\u5728\uFF0C\u65E0\u6CD5\u6539\u540D\u3002",
    "create.numberHint": "\u5728\u7F16\u53F7\u8F93\u5165\u6846\u4E2D\uFF0C\u53EF\u7528\u952E\u76D8 \u2191 / \u2193 \u65B9\u5411\u952E\u589E\u51CF\u6570\u5B57\u3002",
    "create.cancel": "\u53D6\u6D88",
    "create.titlePlaceholder": "\u8F93\u5165\u7B14\u8BB0\u540D\u79F0",
    "delete.file": "\u5220\u9664\u6587\u4EF6",
    "delete.failed": "\u5220\u9664\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    "create.fill": "\u8865\u5EFA\u6B64\u7F16\u53F7\u7684\u7B14\u8BB0",
    "create.sibling": "\u65B0\u5EFA\u540C\u7EA7\u7B14\u8BB0",
    "create.child": "\u65B0\u5EFA\u5B50\u7B14\u8BB0",
    "create.root": "\u65B0\u5EFA\u9876\u5C42\u7B14\u8BB0",
    "create.number": "\u7F16\u53F7",
    "create.title": "\u7B14\u8BB0\u540D\u79F0",
    "create.submit": "\u521B\u5EFA",
    "create.menu": "\u65B0\u5EFA\u7B14\u8BB0",
    "create.rebuild": "\u8BF7\u5148\u91CD\u5EFA\u7D22\u5F15\uFF0C\u518D\u521B\u5EFA\u7B14\u8BB0\u3002",
    "create.invalidNumber": "\u7F16\u53F7\u987B\u4E3A 0 \u81F3 9999 \u7684\u6574\u6570\u3002",
    "create.needTitle": "\u8BF7\u8F93\u5165\u6807\u9898\u3002",
    "create.invalidTitle": "\u6807\u9898\u5305\u542B\u4E0D\u652F\u6301\u7684\u5B57\u7B26\u6216\u5206\u9694\u7B26\u3002",
    "create.conflict": "\u8BE5\u7F16\u53F7\u6216\u6587\u4EF6\u540D\u5DF2\u88AB\u5360\u7528\u3002",
    "create.failed": "\u521B\u5EFA\u672A\u5B8C\u6210\uFF0C\u8BF7\u68C0\u67E5\u7B14\u8BB0\u662F\u5426\u5DF2\u751F\u6210",
    "tree.expandAll": "\u5168\u90E8\u5C55\u5F00",
    "tree.collapseAll": "\u5168\u90E8\u6298\u53E0",
    "settings.outlineStyle.name": "\u7B14\u8BB0\u6811\u6837\u5F0F",
    "settings.outlineStyle.classic": "\u6837\u5F0F\u4E00 \xB7 \u7ECF\u5178",
    "settings.outlineStyle.list": "\u6837\u5F0F\u4E8C \xB7 \u591A\u7EA7\u5217\u8868",
    "settings.ui.live": "\u8C03\u6574\u540E\uFF0C\u53F3\u4FA7\u7B14\u8BB0\u6811\u5373\u65F6\u66F4\u65B0\u3002",
    "settings.number.decrease": "\u51CF\u5C11",
    "settings.number.increase": "\u589E\u52A0",
    "settings.example.number": "\u7F16\u53F7",
    "settings.example.rebuildHint": "\u4FEE\u6539\u89E3\u6790\u89C4\u5219\u540E\uFF0C\u8BF7\u70B9\u51FB\u300C\u91CD\u5EFA\u7D22\u5F15\u300D\uFF0C\u4F7F\u65B0\u89C4\u5219\u5E94\u7528\u5230\u7B14\u8BB0\u6811\u3002",
    "settings.example.pending": "\u89C4\u5219\u5DF2\u4FEE\u6539\uFF0C\u8BF7\u91CD\u5EFA\u7D22\u5F15\u3002",
    "settings.example.rebuildFailed": "\u7D22\u5F15\u91CD\u5EFA\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002",
    "settings.example.label": "\u6587\u4EF6\u540D\u793A\u4F8B",
    "settings.example.title": "\u793A\u4F8B\u7B14\u8BB0",
    "settings.example.titleLabel": "\u6807\u9898",
    "settings.example.result": "\u89E3\u6790\u7ED3\u679C \u2192",
    "settings.example.levels": "\u5C42\u7EA7",
    "settings.example.trim": "\u6807\u9898\u5206\u5272\u7B26\u4E24\u4FA7\u5404\u5141\u8BB8\u6700\u591A 1 \u4E2A\u7A7A\u683C\uFF0C\u4E0A\u65B9\u793A\u4F8B\u5DF2\u5C55\u793A\u7A7A\u683C\u5199\u6CD5\u3002",
    "settings.example.space": "\u6807\u9898\u4E0E ID \u4E4B\u95F4\u6070\u597D 1 \u4E2A\u7A7A\u683C\uFF0Ctrim \u5DF2\u7981\u7528\u3002",
    "settings.example.strict": "ID \u5FC5\u987B\u7D27\u90BB\u6807\u9898\u5206\u5272\u7B26\uFF0C\u4E0D\u80FD\u591A\u52A0\u7A7A\u683C\u3002",
    "plugin.name": "\u5361\u7247\u7B14\u8BB0\u6811",
    "command.open": "\u6253\u5F00\u5361\u7247\u7B14\u8BB0\u6811",
    "ribbon.tooltip": "\u6253\u5F00\u5361\u7247\u7B14\u8BB0\u6811",
    "view.title": "\u5361\u7247\u7B14\u8BB0\u6811",
    "roots.header": "\u6839\u76EE\u5F55\uFF08{count}\uFF09",
    "roots.stale": "\u7D22\u5F15\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u91CD\u5EFA\u7D22\u5F15\u3002",
    "tree.loading": "\u52A0\u8F7D\u4E2D\u2026",
    "tree.stale": "\u7D22\u5F15\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u91CD\u5EFA\u7D22\u5F15\u3002",
    "tree.hint.collapsed": "\u6253\u5F00\u7B14\u8BB0\u6811\u4E2D\u7684\u7B14\u8BB0\u4EE5\u67E5\u770B\u5C42\u7EA7\u3002",
    "tree.hint.fileNotInIndex": "\u5F53\u524D\u7B14\u8BB0\u4E0D\u5728\u7B14\u8BB0\u6811\u4E2D\u3002",
    "settings.title": "\u5361\u7247\u7B14\u8BB0\u6811",
    "settings.section.rules": "\u6587\u4EF6\u540D\u89C4\u5219",
    "settings.section.ui": "\u754C\u9762",
    "settings.section.index": "\u7D22\u5F15",
    "settings.section.advanced": "\u9AD8\u7EA7",
    "settings.idPosition.name": "\u7F16\u53F7\u4F4D\u7F6E",
    "settings.idPosition.desc": "\u53EA\u80FD\u4E8C\u9009\u4E00\uFF1AID \u5728\u524D\uFF08prefix\uFF09\u6216 ID \u5728\u540E\uFF08suffix\uFF09\u3002",
    "settings.idPosition.prefix": "\u7F16\u53F7\u5728\u524D",
    "settings.idPosition.suffix": "\u7F16\u53F7\u5728\u540E",
    "settings.idSegmentDelimiter.name": "\u5C42\u7EA7\u5206\u9694\u7B26",
    "settings.idSegmentDelimiter.desc": "\u5206\u9694\u5404\u7EA7\u7F16\u53F7\uFF0C\u5982 100-1-2 \u4E2D\u7684\u300C-\u300D\u3002",
    "settings.titleDelimiter.name": "\u6807\u9898\u5206\u9694\u7B26",
    "settings.titleDelimiter.desc": "\u5206\u9694\u6807\u9898\u4E0E\u7F16\u53F7\uFF0C\u53EF\u4F7F\u7528\u7A7A\u683C\u3002",
    "settings.allowTrim.name": "\u5141\u8BB8\u5206\u9694\u7B26\u4E24\u4FA7\u7559\u7A7A\u683C",
    "settings.allowTrim.desc": "\u4E24\u4FA7\u5404\u9650\u4E00\u4E2A\u7A7A\u683C\uFF1B\u5206\u9694\u7B26\u4E3A\u7A7A\u683C\u65F6\u4E0D\u53EF\u7528\u3002",
    "settings.manualRebuild.name": "\u89C4\u5219\u53D8\u66F4\u540E\u624B\u52A8\u91CD\u5EFA",
    "settings.manualRebuild.desc": "\u5F00\u542F\u540E\uFF0C\u89C4\u5219\u53D8\u66F4\u4F1A\u628A\u7D22\u5F15\u6807\u8BB0\u4E3A\u8FC7\u671F\uFF0C\u9700\u8981\u624B\u52A8\u70B9\u51FB\u91CD\u5EFA\u3002",
    "settings.trustCache.name": "\u542F\u52A8\u65F6\u4F7F\u7528\u7F13\u5B58",
    "settings.trustCache.desc": "\u89C4\u5219\u4E00\u81F4\u65F6\u5148\u663E\u793A\u7F13\u5B58\uFF0C\u518D\u540E\u53F0\u6821\u9A8C\u3002",
    "settings.showIgnoredSummary.name": "\u663E\u793A\u5FFD\u7565\u7EDF\u8BA1\u63D0\u793A",
    "settings.showIgnoredSummary.desc": "\u91CD\u5EFA/\u626B\u63CF\u5B8C\u6210\u540E\u5F39\u51FA\u4E00\u6B21\u201C\u5FFD\u7565\u539F\u56E0\u7EDF\u8BA1\u201D\uFF08\u53EF\u5173\u95ED\uFF09\u3002",
    "settings.debounce.name": "\u9632\u6296\uFF08\u6BEB\u79D2\uFF09",
    "settings.debounce.desc": "\u589E\u91CF\u66F4\u65B0\u7684\u9632\u6296\u65F6\u95F4\u3002",
    "settings.rowHeight.name": "\u884C\u9AD8\uFF08\u50CF\u7D20\uFF09",
    "settings.rowHeight.desc": "\u8C03\u6574\u7B14\u8BB0\u6811\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
    "settings.overscan.name": "\u6EDA\u52A8\u9884\u52A0\u8F7D\u884C\u6570",
    "settings.overscan.desc": "\u63D0\u524D\u52A0\u8F7D\u5C4F\u5E55\u5916\u7684\u6761\u76EE\uFF0C\u51CF\u5C11\u6EDA\u52A8\u65F6\u7684\u7A7A\u767D\u3002",
    "settings.profiler.name": "\u5F00\u542F\u6027\u80FD\u65E5\u5FD7",
    "settings.profiler.desc": "\u8F93\u51FA\u8017\u65F6\u5230\u63A7\u5236\u53F0\u3002",
    "settings.treeRootTitleColor.name": "\u6839\u6807\u9898\u989C\u8272",
    "settings.treeRootTitleColor.desc": "\u8C03\u6574\u6839\u5217\u8868\u4E0E\u7B14\u8BB0\u6811\u6839\u6807\u9898\u7684\u989C\u8272\u3002",
    "settings.treeLevel1TitleColor.name": "\u4E00\u7EA7\u6761\u76EE\u989C\u8272",
    "settings.treeLevel1TitleColor.desc": "\u8C03\u6574\u5C55\u5F00\u540E\u4E00\u7EA7\u6761\u76EE\u7684\u989C\u8272\u3002",
    "settings.color.reset": "\u6062\u590D\u4E3B\u9898\u989C\u8272",
    "settings.rebuild.name": "\u91CD\u5EFA\u7D22\u5F15",
    "settings.rebuild.desc": "\u91CD\u65B0\u626B\u63CF\u5E76\u91CD\u5EFA\u7D22\u5F15\uFF08\u7D22\u5F15\u8FC7\u671F\u65F6\u9700\u8981\uFF09\u3002",
    "settings.rebuild.button": "\u91CD\u5EFA",
    "notice.delimiterDigitNotAllowed": "\u8BF7\u8F93\u5165\u4E00\u4E2A\u975E\u6570\u5B57\u5B57\u7B26\u3002",
    "notice.delimiterSameNotAllowed": "\u4E24\u4E2A\u5206\u9694\u7B26\u4E0D\u80FD\u76F8\u540C\u3002",
    "notice.trimNotAllowedWhenSpaceDelimiter": "\u5206\u9694\u7B26\u4E3A\u7A7A\u683C\u65F6\uFF0C\u4E0D\u80FD\u989D\u5916\u7559\u7A7A\u683C\u3002",
    "notice.invalidDelimiterConstraints": "\u89E3\u6790\u89C4\u5219\u4E0D\u5408\u6CD5\uFF1A\u5206\u9694\u7B26\u7EA6\u675F\u4E0D\u6EE1\u8DB3\u3002",
    "notice.conflict": "\u3010ID\u51B2\u7A81\uFF1A{id}\u3002\u6587\u4EF6\u540D\uFF1A{files}\u3002\u5EFA\u8BAE\u641C\u7D22\u540E\u4FEE\u6539\u3011",
    "notice.conflictFilesTotal": "\u3010\u5171 {count} \u6761\u51B2\u7A81\u6587\u4EF6\u3011",
    "notice.conflictIdsTotal": "\u3010\u5171 {count} \u4E2A ID \u5B58\u5728\u51B2\u7A81\u3011",
    "notice.ignoredSummaryHeader": "\u3010\u5FFD\u7565\u7EDF\u8BA1\uFF1A\u5171 {count} \u4E2A\u6587\u4EF6\u88AB\u5FFD\u7565\u3011",
    "notice.rebuildComplete": "\u7D22\u5F15\u91CD\u5EFA\u5B8C\u6210\u3002",
    "notice.rootFileMissing": "Root {rootKey} \u6CA1\u6709\u6839\u8282\u70B9\u7B14\u8BB0\u6587\u4EF6",
    "ignored.no_delimiter": "\u7F3A\u5C11\u6807\u9898\u5206\u5272\u7B26",
    "ignored.empty_title": "\u6807\u9898\u4E3A\u7A7A",
    "ignored.empty_id": "ID \u4E3A\u7A7A",
    "ignored.invalid_id": "ID \u4E0D\u5408\u6CD5",
    "ignored.segment_too_long": "\u6570\u5B57\u6BB5\u8D85\u8FC7 4 \u4F4D",
    "ignored.space_delimiter_not_exact_one": "\u7A7A\u683C\u5206\u5272\u7B26\u4E0D\u662F\u201C\u6070\u597D 1 \u4E2A\u7A7A\u683C\u201D",
    "ignored.delimiter_constraints": "\u5206\u9694\u7B26\u7EA6\u675F\u4E0D\u6EE1\u8DB3"
  }
};
function getLocale(app) {
  var _a, _b, _c, _d;
  const cfg = (_b = (_a = app == null ? void 0 : app.vault) == null ? void 0 : _a.getConfig) == null ? void 0 : _b.bind(app.vault);
  const raw = cfg && ((_d = (_c = cfg("language")) != null ? _c : cfg("locale")) != null ? _d : cfg("lang")) || (typeof navigator !== "undefined" ? navigator.language : "") || "";
  const lower = String(raw).toLowerCase();
  if (lower.startsWith("zh")) return "zh";
  return "en";
}
function t(app, key, vars) {
  var _a, _b;
  const locale = getLocale(app);
  const template = (_b = (_a = dict[locale][key]) != null ? _a : dict.en[key]) != null ? _b : key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) => {
    var _a2;
    return String((_a2 = vars[k]) != null ? _a2 : `{${k}}`);
  });
}

// src/utils/hash.js
function fnv1a32(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function fnv1a32Parts(parts, separator = "\0") {
  let hash = 2166136261;
  const mix = (str) => {
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  };
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) mix(separator);
    mix(parts[i]);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

// src/perf/Profiler.js
function nowMs() {
  const p = globalThis.performance;
  if (p && typeof p.now === "function") return p.now();
  return Date.now();
}
var Profiler = class {
  constructor(isEnabled) {
    this.isEnabled = isEnabled;
  }
  time(label, fn, opts) {
    var _a;
    if (!this.isEnabled()) return fn();
    const t0 = nowMs();
    try {
      return fn();
    } finally {
      const dt = nowMs() - t0;
      const threshold = (_a = opts == null ? void 0 : opts.thresholdMs) != null ? _a : 0;
      if (dt >= threshold) this.log(label, dt, opts == null ? void 0 : opts.extra);
    }
  }
  async timeAsync(label, fn, opts) {
    var _a;
    if (!this.isEnabled()) return await fn();
    const t0 = nowMs();
    try {
      return await fn();
    } finally {
      const dt = nowMs() - t0;
      const threshold = (_a = opts == null ? void 0 : opts.thresholdMs) != null ? _a : 0;
      if (dt >= threshold) this.log(label, dt, opts == null ? void 0 : opts.extra);
    }
  }
  logMs(label, ms, extra) {
    if (!this.isEnabled()) return;
    this.log(label, ms, extra);
  }
  log(label, ms, extra) {
    const payload = extra ? { ...extra } : void 0;
    console.debug(`[zettel-outline] ${label}: ${ms.toFixed(1)}ms`, payload != null ? payload : "");
  }
};
function profilerFromSettings(settings) {
  return new Profiler(() => !!settings().enableProfiler);
}

// src/services/IndexService.js
function emptyIgnoredStats() {
  return {
    total: 0,
    byReason: {
      no_delimiter: 0,
      empty_title: 0,
      empty_id: 0,
      invalid_id: 0,
      segment_too_long: 0,
      space_delimiter_not_exact_one: 0,
      delimiter_constraints: 0
    }
  };
}
function addIgnored(stats, reason) {
  var _a;
  stats.total += 1;
  stats.byReason[reason] = ((_a = stats.byReason[reason]) != null ? _a : 0) + 1;
}
function settingsHash(settings) {
  const normalized = {
    idPosition: settings.idPosition,
    titleDelimiter: settings.titleDelimiter,
    idSegmentDelimiter: settings.idSegmentDelimiter,
    allowTrimAroundDelimiter: settings.titleDelimiter === " " ? false : settings.allowTrimAroundDelimiter
  };
  const folders = normalizeExcludedFolders(settings.excludedFolders);
  if (folders.length) normalized.excludedFolders = folders;
  if (settings.excludeDateIds) normalized.excludeDateIds = true;
  return fnv1a32(JSON.stringify(normalized));
}
function snapshotFromFiles(files) {
  var _a, _b, _c, _d;
  const sorted = [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
  let maxMtime = 0;
  let acc = "";
  for (const file of sorted) {
    const mtime = (_b = (_a = file.stat) == null ? void 0 : _a.mtime) != null ? _b : 0;
    const size = (_d = (_c = file.stat) == null ? void 0 : _c.size) != null ? _d : 0;
    if (mtime > maxMtime) maxMtime = mtime;
    acc += `${file.path}\0${mtime}\0${size}\0`;
  }
  return { fileCount: sorted.length, maxMtime, rollingHash: fnv1a32(acc) };
}
function isMarkdownFile(file) {
  return !!file && file.extension === "md";
}
var IndexService = class {
  constructor(deps) {
    this.lastMarkdownLeaf = null;
    this.index = null;
    this.viewState = {
      activeFilePath: null,
      activeIdKey: null,
      activeRootKey: null,
      expandedRootKey: null,
      expandedNodes: /* @__PURE__ */ new Set()
    };
    this.candidatesByPath = /* @__PURE__ */ new Map();
    this.conflictSet = /* @__PURE__ */ new Map();
    this.conflictWinner = /* @__PURE__ */ new Map();
    this.conflictNoticeDigest = null;
    this.rebuildInProgress = false;
    this.rebuildEventQueue = [];
    this.flushTimer = null;
    this.pendingEvents = [];
    this.saveTimer = null;
    this.lastIgnoredStats = null;
    this.saveInFlight = null;
    this.saveRequested = false;
    this.sortedParentsByRoot = /* @__PURE__ */ new Map();
    this.deps = deps;
    this.profiler = profilerFromSettings(() => this.deps.settings());
  }
  getApp() {
    return this.deps.app;
  }
  getSettings() {
    return this.deps.settings();
  }
  getIndex() {
    return this.index;
  }
  getViewState() {
    return this.viewState;
  }
  setLastMarkdownLeaf(leaf) {
    if (!leaf) return;
    if (leaf.view instanceof import_obsidian.MarkdownView) this.lastMarkdownLeaf = leaf;
  }
  getChildrenForRender(parentId, rootKey) {
    var _a;
    if (!this.index) return [];
    const children = (_a = this.index.childrenIndex.get(parentId)) != null ? _a : [];
    if (children.length <= 1) return children;
    let sortedSet = this.sortedParentsByRoot.get(rootKey);
    if (!sortedSet) {
      sortedSet = /* @__PURE__ */ new Set();
      this.sortedParentsByRoot.set(rootKey, sortedSet);
    }
    if (sortedSet.has(parentId)) return children;
    children.sort((a, b) => {
      var _a2, _b;
      const na = (_a2 = this.index) == null ? void 0 : _a2.idIndex.get(a);
      const nb = (_b = this.index) == null ? void 0 : _b.idIndex.get(b);
      if (!na || !nb) return 0;
      return na.normalizedIdKey < nb.normalizedIdKey ? -1 : na.normalizedIdKey > nb.normalizedIdKey ? 1 : 0;
    });
    sortedSet.add(parentId);
    return children;
  }
  async openFileByPath(filePath, opts) {
    var _a, _b;
    const file = this.deps.app.vault.getAbstractFileByPath(filePath);
    if (file && file instanceof import_obsidian.TFile) {
      const isMobile = import_obsidian.Platform.isMobileApp;
      const wantNewTab = !!(opts == null ? void 0 : opts.newTab) && !isMobile;
      if (wantNewTab) {
        await this.deps.app.workspace.getLeaf("tab").openFile(file, { active: true });
        return;
      }
      const markdownLeaf = (_b = (_a = this.lastMarkdownLeaf) != null ? _a : this.deps.app.workspace.getLeavesOfType("markdown").find((leaf) => leaf.view instanceof import_obsidian.MarkdownView)) != null ? _b : null;
      if (markdownLeaf && markdownLeaf.view instanceof import_obsidian.MarkdownView) {
        await markdownLeaf.openFile(file, { active: true });
        return;
      }
      await this.deps.app.workspace.getLeaf(true).openFile(file, { active: true });
    }
  }
  async initialize() {
    const settings = this.deps.settings();
    const currentSettingsHash = settingsHash(settings);
    const cache = await this.profiler.timeAsync("loadCache", () => this.deps.loadCache());
    if (!cache) {
      this.setIndex(this.emptyIndex(currentSettingsHash, false));
      void this.rebuild({ reason: "startup" });
      return;
    }
    if (cache.version !== 1 && cache.version !== 2) {
      this.setIndex(this.emptyIndex(currentSettingsHash, false));
      void this.rebuild({ reason: "startup" });
      return;
    }
    if (cache.settingsHash !== currentSettingsHash) {
      if (settings.requireManualRebuildOnRuleChange) {
        const idx = this.emptyIndex(currentSettingsHash, true);
        this.setIndex(idx);
        return;
      }
      this.setIndex(this.emptyIndex(currentSettingsHash, false));
      void this.rebuild({ reason: "startup" });
      return;
    }
    if (settings.trustCacheOnStartup) {
      const restored = this.profiler.time("restoreIndexFromCache", () => this.restoreIndexFromCache(cache, currentSettingsHash));
      this.setIndex(restored);
      void this.backgroundValidate(cache);
    } else {
      this.setIndex(this.emptyIndex(currentSettingsHash, false));
      void this.rebuild({ reason: "startup" });
    }
  }
  async onSettingsChanged() {
    const settings = this.deps.settings();
    if (settings.titleDelimiter === " ") settings.allowTrimAroundDelimiter = false;
    const constraint = validateDelimiterConstraints(settings);
    if (constraint) {
      this.deps.onNotices([t(this.deps.app, "notice.invalidDelimiterConstraints")]);
      const idx = this.emptyIndex(settingsHash(settings), true);
      this.setIndex(idx);
      return;
    }
    const newHash = settingsHash(settings);
    if (!this.index) {
      this.setIndex(this.emptyIndex(newHash, settings.requireManualRebuildOnRuleChange));
      return;
    }
    if (this.index.settingsHash !== newHash) {
      if (settings.requireManualRebuildOnRuleChange) {
        this.index.stale = true;
        this.index.settingsHash = newHash;
        this.viewState.expandedRootKey = null;
        this.viewState.expandedNodes.clear();
        this.deps.onIndexUpdated();
      } else {
        await this.rebuild({ reason: "manual" });
      }
    }
  }
  onFileOpen(file) {
    var _a, _b, _c, _d;
    const path = (_a = file == null ? void 0 : file.path) != null ? _a : null;
    this.viewState.activeFilePath = path;
    const idKey = path && this.index ? (_b = this.index.pathIndex.get(path)) != null ? _b : null : null;
    this.viewState.activeIdKey = idKey;
    this.viewState.activeRootKey = idKey && this.index ? (_d = (_c = this.index.idIndex.get(idKey)) == null ? void 0 : _c.rootKey) != null ? _d : null : null;
    if (!idKey) {
      this.viewState.expandedRootKey = null;
      this.viewState.expandedNodes.clear();
      return;
    }
    if (this.viewState.activeRootKey) {
      this.setExpandedRoot(this.viewState.activeRootKey);
      this.ensureVisible(idKey);
    }
  }
  setExpandedRoot(rootKey) {
    this.viewState.expandedRootKey = rootKey;
    this.viewState.expandedNodes.clear();
    if (rootKey) this.expandAllForRoot(rootKey);
  }
  notifyViewStateChanged() {
    this.deps.onIndexUpdated();
  }
  toggleExpandedNode(idKey) {
    if (this.viewState.expandedNodes.has(idKey)) this.viewState.expandedNodes.delete(idKey);
    else this.viewState.expandedNodes.add(idKey);
  }
  expandAllForRoot(rootKey) {
    if (!this.index) return;
    for (const [parent] of this.index.childrenIndex.entries()) {
      const node = this.index.idIndex.get(parent);
      if (!node) continue;
      if (node.rootKey !== rootKey) continue;
      if (parent === rootKey) continue;
      this.viewState.expandedNodes.add(parent);
    }
  }
  ensureVisible(idKey) {
    if (!this.index) return;
    const node = this.index.idIndex.get(idKey);
    if (!node) return;
    if (!this.viewState.expandedRootKey || this.viewState.expandedRootKey !== node.rootKey) return;
    const ancestors = [];
    let current = idKey;
    while (current) {
      const n = this.index.idIndex.get(current);
      if (!n) break;
      const parent = n.parentKey;
      if (!parent) break;
      ancestors.push(parent);
      current = parent;
      if (parent === node.rootKey) break;
    }
    for (const a of ancestors) this.viewState.expandedNodes.add(a);
  }
  async rebuild(opts) {
    var _a, _b, _c;
    if (this.rebuildInProgress) return;
    this.rebuildInProgress = true;
    this.rebuildEventQueue = [];
    this.deps.onIndexUpdated();
    try {
      await this.waitForLayoutReady();
      const settings = this.deps.settings();
      const currentHash = settingsHash(settings);
      const files = this.profiler.time("getMarkdownFiles", () => this.deps.app.vault.getMarkdownFiles());
      const built = this.profiler.time("buildIndexFromFiles", () => this.buildIndexFromFiles(files, currentHash), {
        thresholdMs: 5,
        extra: { reason: opts.reason, files: files.length }
      });
      this.setIndex(built.index);
      this.lastIgnoredStats = built.ignoredStats;
      this.sortedParentsByRoot.clear();
      const activeIdKey = this.viewState.activeFilePath && built.index.pathIndex.has(this.viewState.activeFilePath) ? (_a = built.index.pathIndex.get(this.viewState.activeFilePath)) != null ? _a : null : null;
      this.viewState.activeIdKey = activeIdKey;
      this.viewState.activeRootKey = activeIdKey ? (_c = (_b = built.index.idIndex.get(activeIdKey)) == null ? void 0 : _b.rootKey) != null ? _c : null : null;
      await this.saveNow(built.snapshot);
      const notices = [];
      notices.push(...this.buildConflictNoticeMessages(built.index));
      if (settings.showIgnoredSummaryNotice) {
        const ignoredMsg = this.buildIgnoredSummaryNotice(built.ignoredStats);
        if (ignoredMsg) notices.push(ignoredMsg);
      }
      const msgs = [];
      if (opts.reason === "manual") msgs.push(t(this.deps.app, "notice.rebuildComplete"));
      if (notices.length) msgs.push(notices.join("\n"));
      if (msgs.length) this.deps.onNotices(msgs);
      if (this.rebuildEventQueue.length) {
        const queued = [...this.rebuildEventQueue];
        this.rebuildEventQueue = [];
        for (const e of queued) {
          this.pendingEvents.push(e);
        }
        this.scheduleFlush();
      }
    } finally {
      this.rebuildInProgress = false;
      this.deps.onIndexUpdated();
    }
  }
  onCreate(file) {
    var _a;
    if (!isMarkdownFile(file)) return;
    if (this.rebuildInProgress) {
      this.rebuildEventQueue.push({ type: "create", path: file.path });
      return;
    }
    if ((_a = this.index) == null ? void 0 : _a.stale) return;
    this.pendingEvents.push({ type: "create", path: file.path });
    this.scheduleFlush();
  }
  onDelete(file) {
    var _a;
    const path = file == null ? void 0 : file.path;
    if (!path) return;
    if (this.rebuildInProgress) {
      this.rebuildEventQueue.push({ type: "delete", path });
      return;
    }
    if ((_a = this.index) == null ? void 0 : _a.stale) return;
    this.pendingEvents.push({ type: "delete", path });
    this.scheduleFlush();
  }
  onRename(file, oldPath) {
    var _a;
    const path = file == null ? void 0 : file.path;
    if (!path) return;
    if (this.rebuildInProgress) {
      this.rebuildEventQueue.push({ type: "rename", path, oldPath });
      return;
    }
    if ((_a = this.index) == null ? void 0 : _a.stale) return;
    this.pendingEvents.push({ type: "rename", path, oldPath });
    this.scheduleFlush();
  }
  scheduleFlush() {
    const ms = this.deps.settings().debounceMs;
    if (this.flushTimer) window.clearTimeout(this.flushTimer);
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      void this.flush();
    }, ms);
  }
  async flush() {
    if (this.editBatch && !this.editBatchFlushing) return;
    var _a, _b, _c, _d, _e, _f;
    if (!this.index) return;
    if (this.index.stale) return;
    const events = this.pendingEvents.splice(0);
    if (!events.length) return;
    const t0 = (_c = (_b = (_a = globalThis.performance) == null ? void 0 : _a.now) == null ? void 0 : _b.call(_a)) != null ? _c : Date.now();
    const affectedRoots = /* @__PURE__ */ new Set();
    for (const e of events) {
      if (e.type === "rename" && e.oldPath) {
        const old = this.candidatesByPath.get(e.oldPath);
        if (old) affectedRoots.add(old.rootKey);
        this.deleteCandidate(e.oldPath, affectedRoots);
        await this.createOrUpdateCandidateByPath(e.path, affectedRoots);
      } else if (e.type === "delete") {
        this.deleteCandidate(e.path, affectedRoots);
      } else if (e.type === "create") {
        await this.createOrUpdateCandidateByPath(e.path, affectedRoots);
      }
    }
    for (const rootKey of affectedRoots) {
      this.profiler.time("rebuildRoot", () => this.rebuildRoot(rootKey), { thresholdMs: 10, extra: { rootKey } });
      this.sortedParentsByRoot.delete(rootKey);
    }
    this.index.stale = false;
    this.deps.onIndexUpdated();
    this.requestSave();
    const notices = this.buildConflictNoticeMessages(this.index);
    if (notices.length) this.deps.onNotices([notices.join("\n")]);
    const dt = ((_f = (_e = (_d = globalThis.performance) == null ? void 0 : _d.now) == null ? void 0 : _e.call(_d)) != null ? _f : Date.now()) - t0;
    this.profiler.logMs("flush.total", dt, { events: events.length, affectedRoots: affectedRoots.size });
  }
  deleteCandidate(path, affectedRoots) {
    const candidate = this.candidatesByPath.get(path);
    if (!candidate) return;
    affectedRoots.add(candidate.rootKey);
    this.candidatesByPath.delete(path);
    const list = this.conflictSet.get(candidate.normalizedIdKey);
    if (list) {
      const idx = list.indexOf(path);
      if (idx >= 0) list.splice(idx, 1);
      if (!list.length) {
        this.conflictSet.delete(candidate.normalizedIdKey);
        this.conflictWinner.delete(candidate.normalizedIdKey);
      } else {
        this.conflictWinner.set(candidate.normalizedIdKey, list[0]);
      }
    }
  }
  async createOrUpdateCandidateByPath(path, affectedRoots) {
    var _a;
    const file = this.deps.app.vault.getAbstractFileByPath(path);
    if (!isMarkdownFile(file)) return;
    const settings = this.deps.settings();
    const parsed = parseIndexedFile(file, settings);
    if (!parsed.ok) return;
    const c = {
      filePath: file.path,
      idKey: parsed.parsed.idKey,
      normalizedIdKey: parsed.parsed.normalizedIdKey,
      rootKey: parsed.parsed.rootKey,
      title: parsed.parsed.title,
      segments: parsed.parsed.segments
    };
    affectedRoots.add(c.rootKey);
    this.candidatesByPath.set(path, c);
    const list = (_a = this.conflictSet.get(c.normalizedIdKey)) != null ? _a : [];
    if (!list.includes(path)) {
      list.push(path);
      list.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      this.conflictSet.set(c.normalizedIdKey, list);
      this.conflictWinner.set(c.normalizedIdKey, list[0]);
    }
  }
  rebuildRoot(rootKey) {
    var _a, _b, _c;
    if (!this.index) return;
    const idKeysToRemove = [];
    for (const [idKey, node] of this.index.idIndex.entries()) {
      if (node.rootKey === rootKey) idKeysToRemove.push(idKey);
    }
    for (const idKey of idKeysToRemove) {
      const node = this.index.idIndex.get(idKey);
      if (node == null ? void 0 : node.filePath) this.index.pathIndex.delete(node.filePath);
      this.index.idIndex.delete(idKey);
      this.index.childrenIndex.delete(idKey);
    }
    for (const [parent, children] of this.index.childrenIndex.entries()) {
      const filtered = children.filter((id) => {
        var _a2;
        const n = (_a2 = this.index) == null ? void 0 : _a2.idIndex.get(id);
        if (!n) return false;
        return n.rootKey !== rootKey;
      });
      if (filtered.length !== children.length) {
        if (filtered.length) this.index.childrenIndex.set(parent, filtered);
        else this.index.childrenIndex.delete(parent);
      }
    }
    const visibleCandidates = [];
    for (const candidate of this.candidatesByPath.values()) {
      if (candidate.rootKey !== rootKey) continue;
      const winnerPath = this.conflictWinner.get(candidate.normalizedIdKey);
      if (winnerPath !== candidate.filePath) continue;
      visibleCandidates.push(candidate);
    }
    if (!visibleCandidates.length) {
      this.index.rootMeta.delete(rootKey);
      this.recomputeRoots();
      this.recomputeConflicts();
      this.recomputeNormalizedIdIndex();
      return;
    }
    visibleCandidates.sort((a, b) => a.filePath < b.filePath ? -1 : a.filePath > b.filePath ? 1 : 0);
    const visibleIdSet = /* @__PURE__ */ new Set();
    for (const c of visibleCandidates) visibleIdSet.add(c.idKey);
    const rootFileCandidate = (_a = visibleCandidates.find((c) => c.idKey === rootKey)) != null ? _a : null;
    const rootTitle = rootFileCandidate ? rootFileCandidate.title : rootKey;
    const meta = {
      rootKey,
      title: rootTitle,
      count: visibleCandidates.filter((c) => c.filePath).length,
      rootFilePath: rootFileCandidate == null ? void 0 : rootFileCandidate.filePath
    };
    this.index.rootMeta.set(rootKey, meta);
    if (rootFileCandidate) {
      const node = {
        idKey: rootKey,
        normalizedIdKey: normalizeIdForCompare([Number(rootKey)], this.deps.settings().idSegmentDelimiter),
        segments: [Number(rootKey)],
        depth: 1,
        parentKey: null,
        rootKey,
        filePath: rootFileCandidate.filePath,
        title: rootFileCandidate.title
      };
      this.index.idIndex.set(rootKey, node);
      this.index.pathIndex.set(rootFileCandidate.filePath, rootKey);
    } else {
      const node = {
        idKey: rootKey,
        normalizedIdKey: normalizeIdForCompare([Number(rootKey)], this.deps.settings().idSegmentDelimiter),
        segments: [Number(rootKey)],
        depth: 1,
        parentKey: null,
        rootKey,
        filePath: null,
        title: rootTitle
      };
      this.index.idIndex.set(rootKey, node);
    }
    for (const c of visibleCandidates) {
      if (c.idKey === rootKey) continue;
      const node = {
        idKey: c.idKey,
        normalizedIdKey: c.normalizedIdKey,
        segments: c.segments,
        depth: c.segments.length,
        parentKey: null,
        rootKey,
        filePath: c.filePath,
        title: c.title
      };
      this.index.idIndex.set(node.idKey, node);
      this.index.pathIndex.set(node.filePath, node.idKey);
    }
    for (const c of visibleCandidates) {
      const node = this.index.idIndex.get(c.idKey);
      if (!node || node.idKey === rootKey) continue;
      node.parentKey = this.computeParentKey(node.idKey, rootKey);
    }
    for (const node of this.index.idIndex.values()) {
      if (node.rootKey !== rootKey) continue;
      if (!node.parentKey) continue;
      const arr = (_b = this.index.childrenIndex.get(node.parentKey)) != null ? _b : [];
      arr.push(node.idKey);
      this.index.childrenIndex.set(node.parentKey, arr);
    }
    for (const [parent, children] of this.index.childrenIndex.entries()) {
      if (((_c = this.index.idIndex.get(parent)) == null ? void 0 : _c.rootKey) !== rootKey) continue;
      children.sort((a, b) => {
        var _a2, _b2;
        const na = (_a2 = this.index) == null ? void 0 : _a2.idIndex.get(a);
        const nb = (_b2 = this.index) == null ? void 0 : _b2.idIndex.get(b);
        if (!na || !nb) return 0;
        return na.normalizedIdKey < nb.normalizedIdKey ? -1 : na.normalizedIdKey > nb.normalizedIdKey ? 1 : 0;
      });
    }
    this.recomputeRoots();
    this.recomputeConflicts();
    this.recomputeNormalizedIdIndex();
  }
  computeParentKey(idKey, rootKey) {
    var _a;
    const settings = this.deps.settings();
    const parts = idKey.split(settings.idSegmentDelimiter);
    if (parts.length <= 1) return rootKey;
    for (let i = parts.length - 1; i >= 1; i--) {
      const candidate = parts.slice(0, i).join(settings.idSegmentDelimiter);
      if ((_a = this.index) == null ? void 0 : _a.idIndex.has(candidate)) return candidate;
    }
    return rootKey;
  }
  recomputeRoots() {
    if (!this.index) return;
    const rootKeys = /* @__PURE__ */ new Set();
    for (const node of this.index.idIndex.values()) {
      if (node.filePath) rootKeys.add(node.rootKey);
    }
    const roots = [...rootKeys].sort((a, b) => Number(a) - Number(b));
    this.index.roots = roots;
    for (const key of [...this.index.rootMeta.keys()]) {
      if (!rootKeys.has(key)) this.index.rootMeta.delete(key);
    }
  }
  recomputeConflicts() {
    if (!this.index) return;
    const conflicts = /* @__PURE__ */ new Map();
    for (const [norm, list] of this.conflictSet.entries()) {
      if (list.length > 1) conflicts.set(norm, [...list]);
    }
    this.index.conflicts = conflicts;
  }
  recomputeNormalizedIdIndex() {
    if (!this.index) return;
    const map = /* @__PURE__ */ new Map();
    for (const node of this.index.idIndex.values()) {
      if (!node.filePath) continue;
      map.set(node.normalizedIdKey, node.idKey);
    }
    this.index.normalizedIdIndex = map;
  }
  buildIndexFromFiles(files, currentSettingsHash) {
    var _a;
    const settings = this.deps.settings();
    const ignoredStats = emptyIgnoredStats();
    this.candidatesByPath.clear();
    this.conflictSet.clear();
    this.conflictWinner.clear();
    for (const file of files) {
      const parsed = parseIndexedFile(file, settings);
      if (!parsed.ok) {
        addIgnored(ignoredStats, parsed.reason);
        continue;
      }
      const candidate = {
        filePath: file.path,
        idKey: parsed.parsed.idKey,
        normalizedIdKey: parsed.parsed.normalizedIdKey,
        rootKey: parsed.parsed.rootKey,
        title: parsed.parsed.title,
        segments: parsed.parsed.segments
      };
      this.candidatesByPath.set(candidate.filePath, candidate);
      const list = (_a = this.conflictSet.get(candidate.normalizedIdKey)) != null ? _a : [];
      list.push(candidate.filePath);
      this.conflictSet.set(candidate.normalizedIdKey, list);
    }
    for (const [norm, list] of this.conflictSet.entries()) {
      list.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      this.conflictWinner.set(norm, list[0]);
    }
    const empty = {
      idIndex: /* @__PURE__ */ new Map(),
      normalizedIdIndex: /* @__PURE__ */ new Map(),
      pathIndex: /* @__PURE__ */ new Map(),
      childrenIndex: /* @__PURE__ */ new Map(),
      roots: [],
      rootMeta: /* @__PURE__ */ new Map(),
      conflicts: /* @__PURE__ */ new Map(),
      stale: false,
      settingsHash: currentSettingsHash
    };
    this.index = empty;
    const affectedRoots = /* @__PURE__ */ new Set();
    for (const c of this.candidatesByPath.values()) affectedRoots.add(c.rootKey);
    for (const rootKey of affectedRoots) this.rebuildRoot(rootKey);
    const index = this.index;
    const snapshot = snapshotFromFiles(files);
    return { index, snapshot, ignoredStats };
  }
  restoreIndexFromCache(cache, currentSettingsHash) {
    var _a;
    const index = {
      idIndex: /* @__PURE__ */ new Map(),
      normalizedIdIndex: /* @__PURE__ */ new Map(),
      pathIndex: /* @__PURE__ */ new Map(),
      childrenIndex: /* @__PURE__ */ new Map(),
      roots: cache.roots,
      rootMeta: new Map(Object.entries(cache.rootMeta)),
      conflicts: /* @__PURE__ */ new Map(),
      stale: false,
      settingsHash: currentSettingsHash
    };
    const settings = this.deps.settings();
    const delimiter = settings.idSegmentDelimiter;
    this.candidatesByPath.clear();
    this.conflictSet.clear();
    this.conflictWinner.clear();
    this.sortedParentsByRoot.clear();
    for (const persisted of Object.values(cache.nodes)) {
      const segments = (_a = segmentsFromIdKey(persisted.idKey, delimiter)) != null ? _a : persisted.idKey.split(delimiter).map((s) => Number(s));
      const normalized = normalizeIdForCompare(segments, delimiter);
      const node = {
        idKey: persisted.idKey,
        normalizedIdKey: normalized,
        segments,
        depth: segments.length,
        parentKey: persisted.parentKey,
        rootKey: persisted.rootKey,
        filePath: persisted.filePath,
        title: persisted.title
      };
      index.idIndex.set(node.idKey, node);
      index.pathIndex.set(node.filePath, node.idKey);
      index.normalizedIdIndex.set(node.normalizedIdKey, node.idKey);
    }
    const addCandidate = (p) => {
      var _a2, _b;
      const segments = (_a2 = segmentsFromIdKey(p.idKey, delimiter)) != null ? _a2 : p.idKey.split(delimiter).map((s) => Number(s));
      const normalizedIdKey = normalizeIdForCompare(segments, delimiter);
      const c = {
        filePath: p.filePath,
        idKey: p.idKey,
        normalizedIdKey,
        rootKey: p.rootKey,
        title: p.title,
        segments
      };
      this.candidatesByPath.set(c.filePath, c);
      const list = (_b = this.conflictSet.get(c.normalizedIdKey)) != null ? _b : [];
      list.push(c.filePath);
      this.conflictSet.set(c.normalizedIdKey, list);
    };
    if (cache.version === 2) {
      for (const p of Object.values(cache.candidates)) addCandidate(p);
    } else {
      for (const p of Object.values(cache.nodes)) {
        addCandidate({ filePath: p.filePath, idKey: p.idKey, rootKey: p.rootKey, title: p.title });
      }
    }
    for (const [parent, children] of Object.entries(cache.children)) {
      index.childrenIndex.set(parent, children);
    }
    this.index = index;
    this.ensureVirtualRoots(index);
    for (const [norm, list] of this.conflictSet.entries()) {
      list.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      this.conflictWinner.set(norm, list[0]);
    }
    return index;
  }
  ensureVirtualRoots(index) {
    const delimiter = this.deps.settings().idSegmentDelimiter;
    for (const [rootKey, meta] of index.rootMeta.entries()) {
      if (index.idIndex.has(rootKey)) continue;
      const seg = Number(rootKey);
      const node = {
        idKey: rootKey,
        normalizedIdKey: normalizeIdForCompare([seg], delimiter),
        segments: [seg],
        depth: 1,
        parentKey: null,
        rootKey,
        filePath: null,
        title: meta.title
      };
      index.idIndex.set(rootKey, node);
    }
  }
  cacheFromIndex(index, snapshot) {
    const nodes = {};
    const pathToId = {};
    const children = {};
    const rootMeta = {};
    const candidates = {};
    for (const rootKey of index.roots) {
      const meta = index.rootMeta.get(rootKey);
      if (meta) rootMeta[rootKey] = meta;
    }
    for (const node of index.idIndex.values()) {
      if (!node.filePath) continue;
      nodes[node.idKey] = {
        idKey: node.idKey,
        parentKey: node.parentKey,
        rootKey: node.rootKey,
        filePath: node.filePath,
        title: node.title
      };
      pathToId[node.filePath] = node.idKey;
    }
    for (const [parent, kids] of index.childrenIndex.entries()) {
      children[parent] = kids;
    }
    for (const c of this.candidatesByPath.values()) {
      candidates[c.filePath] = { filePath: c.filePath, idKey: c.idKey, rootKey: c.rootKey, title: c.title };
    }
    return {
      version: 2,
      settingsHash: index.settingsHash,
      snapshot,
      roots: index.roots,
      rootMeta,
      nodes,
      pathToId,
      children,
      candidates
    };
  }
  async backgroundValidate(cache) {
    if (this.rebuildInProgress) return;
    const settings = this.deps.settings();
    const currentHash = settingsHash(settings);
    if (cache.settingsHash !== currentHash) return;
    await this.waitForLayoutReady();
    const files = this.profiler.time("getMarkdownFiles(backgroundValidate)", () => this.deps.app.vault.getMarkdownFiles());
    const snapshot = this.profiler.time("snapshotFromFiles(backgroundValidate)", () => snapshotFromFiles(files), {
      thresholdMs: 5,
      extra: { files: files.length }
    });
    if (snapshot.rollingHash === cache.snapshot.rollingHash) return;
    await this.rebuild({ reason: "background_validate" });
  }
  async waitForLayoutReady() {
    await new Promise((resolve) => this.deps.app.workspace.onLayoutReady(resolve));
  }
  isRebuilding() {
    return this.rebuildInProgress;
  }
  requestSave() {
    if (!this.index || this.index.stale) return;
    this.saveRequested = true;
    if (this.saveTimer) return;
    const ms = this.deps.settings().saveDebounceMs;
    this.saveTimer = window.setTimeout(() => {
      this.saveTimer = null;
      void this.runDebouncedSave();
    }, ms);
  }
  async runDebouncedSave() {
    if (!this.index || this.index.stale) {
      this.saveRequested = false;
      return;
    }
    if (!this.saveRequested) return;
    this.saveRequested = false;
    const snapshot = this.profiler.time("snapshotFromFiles(save)", () => snapshotFromFiles(this.deps.app.vault.getMarkdownFiles()), {
      thresholdMs: 5
    });
    const cache = this.cacheFromIndex(this.index, snapshot);
    this.saveInFlight = this.profiler.timeAsync("saveCache(debounced)", () => this.deps.saveCache(cache), { thresholdMs: 5 });
    await this.saveInFlight;
    this.saveInFlight = null;
    if (this.saveRequested) this.requestSave();
  }
  async saveNow(snapshotOverride) {
    if (!this.index) return;
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    this.saveRequested = false;
    const snapshot = snapshotOverride != null ? snapshotOverride : this.profiler.time("snapshotFromFiles(saveNow)", () => snapshotFromFiles(this.deps.app.vault.getMarkdownFiles()), { thresholdMs: 5 });
    const cache = this.cacheFromIndex(this.index, snapshot);
    this.saveInFlight = this.profiler.timeAsync("saveCache(flush)", () => this.deps.saveCache(cache), { thresholdMs: 5 });
    await this.saveInFlight;
    this.saveInFlight = null;
  }
  async shutdown() {
    if (this.flushTimer) window.clearTimeout(this.flushTimer);
    this.flushTimer = null;
    if (this.saveTimer) window.clearTimeout(this.saveTimer);
    this.saveTimer = null;
    if (this.index && !this.index.stale) await this.saveNow();
  }
  buildConflictNoticeMessages(index) {
    const entries = [...index.conflicts.entries()].sort(
      (a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0
    );
    const lines = [];
    const maxIds = 20;
    const shown = entries.slice(0, maxIds);
    for (const [norm, filePaths] of shown) {
      const winner = filePaths[0];
      const winnerIdKey = index.pathIndex.get(winner);
      const displayId = winnerIdKey != null ? winnerIdKey : norm;
      const filesShown = filePaths.slice(0, 3).map((p) => {
        var _a;
        return (_a = p.split("/").pop()) != null ? _a : p;
      });
      let msg = t(this.deps.app, "notice.conflict", { id: displayId, files: filesShown.join("; ") });
      if (filePaths.length > 3) msg += `
` + t(this.deps.app, "notice.conflictFilesTotal", { count: filePaths.length });
      lines.push(msg);
    }
    if (entries.length > maxIds) lines.push(t(this.deps.app, "notice.conflictIdsTotal", { count: entries.length }));
    const digestParts = [];
    for (const [norm, filePaths] of entries) {
      digestParts.push(norm);
      digestParts.push(String(filePaths.length));
      for (const p of filePaths) digestParts.push(p);
    }
    const digest = fnv1a32Parts(digestParts);
    if (digest === this.conflictNoticeDigest) return [];
    this.conflictNoticeDigest = digest;
    return lines.length ? [lines.join("\n")] : [];
  }
  buildIgnoredSummaryNotice(stats) {
    if (!stats.total) return null;
    const parts = Object.entries(stats.byReason).filter(([, v]) => v > 0).map(([k, v]) => `${t(this.deps.app, `ignored.${k}`)}\uFF1A${v}`);
    return `${t(this.deps.app, "notice.ignoredSummaryHeader", { count: stats.total })}
${parts.join("\uFF1B")}`;
  }
  emptyIndex(currentSettingsHash, stale) {
    this.index = {
      idIndex: /* @__PURE__ */ new Map(),
      normalizedIdIndex: /* @__PURE__ */ new Map(),
      pathIndex: /* @__PURE__ */ new Map(),
      childrenIndex: /* @__PURE__ */ new Map(),
      roots: [],
      rootMeta: /* @__PURE__ */ new Map(),
      conflicts: /* @__PURE__ */ new Map(),
      stale,
      settingsHash: currentSettingsHash
    };
    this.candidatesByPath.clear();
    this.conflictSet.clear();
    this.conflictWinner.clear();
    this.sortedParentsByRoot.clear();
    return this.index;
  }
  setIndex(index) {
    this.index = index;
    this.deps.onIndexUpdated();
  }
};

// src/services/StructureArchive.js
var LIMIT = 100;
var MAX_BYTES = 5 * 1024 * 1024;
var GROUP_IDLE_MS = 6e4;
var sameStructure = (a, b) => a.hash === b.hash && a.delimiter === b.delimiter && JSON.stringify(a.nodes) === JSON.stringify(b.nodes);
var uid = () => Date.now().toString(36) + "-" + Math.random().toString(36).slice(2);
var StructureArchive = class {
  constructor(app, service, path, report = () => {
  }) {
    this.app = app;
    this.service = service;
    this.path = path;
    this.report = report;
    this.records = [];
    this.registry = {};
    this.identities = /* @__PURE__ */ new WeakMap();
    this.listeners = /* @__PURE__ */ new Set();
    this.queue = Promise.resolve();
    this.pending = null;
    this.timer = null;
    this.disabled = false;
    this.group = null;
  }
  async load() {
    const adapter = this.app.vault.adapter;
    let data = null, found = false;
    for (const path of [this.path, this.path + ".bak"]) {
      if (!await adapter.exists(path)) continue;
      found = true;
      try {
        const parsed = JSON.parse(await adapter.read(path));
        if (parsed.version !== 1 || !Array.isArray(parsed.records) || !parsed.registry || typeof parsed.registry !== "object") throw Error("archive.invalid");
        if (Object.values(parsed.registry).some((item) => !item || item.path !== null && typeof item.path !== "string" || typeof item.ctime !== "number")) throw Error("archive.invalid");
        const validSnapshot = (snapshot) => snapshot && typeof snapshot.hash === "string" && typeof snapshot.delimiter === "string" && Array.isArray(snapshot.nodes) && snapshot.nodes.every((node) => node && typeof node.id === "string" && typeof node.path === "string" && typeof node.title === "string" && Array.isArray(node.segments) && node.segments.length > 0 && node.segments.every((n) => Number.isInteger(n) && n >= 0 && n <= 9999));
        if (parsed.records.some((record) => !record || !validSnapshot(record.before) || !validSnapshot(record.after)) || parsed.pending && !validSnapshot(parsed.pending.before)) throw Error("archive.invalid");
        data = parsed;
        break;
      } catch (error) {
        this.report(error);
      }
    }
    if (found && !data) {
      this.disabled = true;
      this.report(Error("archive.unreadable"));
      return;
    }
    if (!data) return;
    this.records = data.records.slice(-LIMIT);
    this.registry = data.registry;
    for (const [id, item] of Object.entries(this.registry)) {
      const file = item.path && this.app.vault.getAbstractFileByPath(item.path);
      if (file && file.extension === "md" && item.ctime > 0 && file.stat?.ctime === item.ctime) this.identities.set(file, id);
    }
    if (data.pending) {
      const after = this.capture();
      this.records.push({ ...data.pending, after, status: "interrupted" });
      this.pending = null;
      await this.save();
    }
  }
  identify(file) {
    let id = this.identities.get(file);
    if (!id) {
      id = uid();
      this.identities.set(file, id);
    }
    this.registry[id] = { path: file.path, ctime: file.stat?.ctime ?? 0 };
    return id;
  }
  capture() {
    const settings = this.service.getSettings();
    const nodes = [];
    for (const file of this.app.vault.getMarkdownFiles()) {
      const parsed = parseIndexedFile(file, settings);
      if (!parsed.ok) continue;
      nodes.push({ id: this.identify(file), path: file.path, title: parsed.parsed.title, idKey: parsed.parsed.idKey, segments: parsed.parsed.segments.slice() });
    }
    nodes.sort((a, b) => a.path.localeCompare(b.path));
    return { hash: settingsHash(settings), delimiter: settings.idSegmentDelimiter, nodes };
  }
  async begin(kind, isolated = false) {
    if (this.disabled) throw Error("archive.unreadable");
    if (this.service.isRebuilding() || this.service.editBatch || this.service.creatingNote) throw Error("history.busy");
    const token = { id: uid(), time: Date.now(), kind, before: this.capture() };
    const group = this.group;
    if (isolated || kind === "restore" || !group || token.time - group.lastTime >= GROUP_IDLE_MS || !sameStructure(group.after, token.before)) this.group = null;
    token.isolated = isolated || kind === "restore";
    this.pending = token;
    try {
      await this.save();
    } catch (error) {
      this.pending = null;
      throw error;
    }
    return token;
  }
  async finish(token, status = "complete") {
    const after = this.capture();
    if (status === "complete" && !token.isolated) {
      let group = this.group;
      if (!group) group = { ...token, after, status, lastTime: Date.now(), count: 0 };
      group.after = after;
      group.lastTime = Date.now();
      group.count++;
      if (group.count > 1) group.kind = "edit";
      const index = this.records.findIndex((record) => record.id === group.id);
      if (sameStructure(group.before, after)) {
        if (index >= 0) this.records.splice(index, 1);
      } else if (index >= 0) this.records[index] = group;
      else this.records.push(group);
      this.group = group;
    } else {
      this.group = null;
      if (!sameStructure(token.before, after)) this.records.push({ ...token, after, status });
    }
    this.pending = null;
    try {
      await this.save();
    } catch (error) {
      this.report(error);
    }
    this.emit();
  }
  changed(file, oldPath, deleted = false) {
    let id = this.identities.get(file);
    if (!id && oldPath) id = Object.keys(this.registry).find((key) => this.registry[key].path === oldPath && this.registry[key].ctime > 0 && file.stat?.ctime === this.registry[key].ctime);
    if (!id) return;
    this.identities.set(file, id);
    this.registry[id] = { path: deleted ? null : file.path, ctime: file.stat?.ctime ?? 0 };
    if (!this.pending) {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.save().catch(this.report);
      }, 250);
    }
  }
  resolve(id) {
    const item = this.registry[id];
    if (!item?.path) return null;
    const file = this.app.vault.getAbstractFileByPath(item.path);
    return file && file.extension === "md" && this.identities.get(file) === id ? file : null;
  }
  async save() {
    if (this.disabled) throw Error("archive.unreadable");
    while (this.records.length > LIMIT) this.records.shift();
    let text = JSON.stringify({ version: 1, records: this.records, registry: this.registry, pending: this.pending });
    while (text.length > MAX_BYTES / 3 && this.records.length > 1) {
      this.records.shift();
      text = JSON.stringify({ version: 1, records: this.records, registry: this.registry, pending: this.pending });
    }
    const retained = /* @__PURE__ */ new Set();
    for (const record of this.records) for (const snapshot of [record.before, record.after]) for (const node of snapshot.nodes) retained.add(node.id);
    if (this.pending) for (const node of this.pending.before.nodes) retained.add(node.id);
    if (retained.size) {
      for (const id of Object.keys(this.registry)) if (!retained.has(id)) delete this.registry[id];
    }
    text = JSON.stringify({ version: 1, records: this.records, registry: this.registry, pending: this.pending });
    const write = async () => {
      const adapter = this.app.vault.adapter;
      if (await adapter.exists(this.path)) {
        const old = await adapter.read(this.path);
        try {
          const parsed = JSON.parse(old);
          if (parsed.version === 1) await adapter.write(this.path + ".bak", old);
        } catch {
        }
      }
      await adapter.write(this.path, text);
    };
    this.queue = this.queue.catch(() => {
    }).then(write);
    return this.queue;
  }
  emit() {
    for (const listener of this.listeners) listener();
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  async close() {
    clearTimeout(this.timer);
    this.group = null;
    await this.save();
  }
};

// src/view/StructureHistoryModal.js
var import_obsidian2 = require("obsidian");

// src/services/EditHistory.js
var EditHistory = class {
  constructor(limit = 100, archive = null) {
    this.archive = archive;
    this.limit = limit;
    this.undoStack = [];
    this.redoStack = [];
    this.busy = false;
  }
  async run(action) {
    if (this.busy) throw new Error("history.busy");
    this.busy = true;
    try {
      return await action();
    } finally {
      this.busy = false;
    }
  }
  async perform(command, direction, label) {
    const token = this.archive ? await this.archive.begin(label, command.kind === "restore") : null;
    try {
      await command[direction]();
    } catch (error) {
      if (token) await this.archive.finish(token, "failed");
      throw error;
    }
    if (token) await this.archive.finish(token);
  }
  execute(command) {
    return this.run(async () => {
      await this.perform(command, "redo", command.kind ?? "edit");
      this.undoStack.push(command);
      if (this.undoStack.length > this.limit) this.undoStack.shift();
      this.redoStack = [];
      return command;
    });
  }
  undo() {
    return this.run(async () => {
      const command = this.undoStack.at(-1);
      if (!command) return;
      await this.perform(command, "undo", "undo");
      this.undoStack.pop();
      this.redoStack.push(command);
      return command;
    });
  }
  redo() {
    return this.run(async () => {
      const command = this.redoStack.at(-1);
      if (!command) return;
      await this.perform(command, "redo", "redo");
      this.redoStack.pop();
      this.undoStack.push(command);
      return command;
    });
  }
};

// src/services/RenameNote.js
function historyFor(service) {
  return service.editHistory ?? (service.editHistory = new EditHistory(100, service.structureArchive));
}
function makeRenameCommand(app, service, path, title, selection) {
  if (service.editBatch) throw Error("history.busy");
  const settings = service.getSettings();
  const hash = settingsHash(settings);
  const file = app.vault.getAbstractFileByPath(path);
  if (!file || file.extension !== "md") throw new Error("edit.missing");
  const parsed = parseFileName(file.basename, settings);
  const clean = title.trim();
  if (!parsed.ok || !clean || /[\\/:*?"<>|\x00-\x1f]/.test(clean)) throw new Error("edit.invalid");
  const id = parsed.parsed.idKey;
  const basename = settings.idPosition === "prefix" ? `${id}${settings.titleDelimiter}${clean}` : `${clean}${settings.titleDelimiter}${id}`;
  const check = parseFileName(basename, settings);
  if (!check.ok || check.parsed.title !== clean || check.parsed.idKey !== id || /[. ]$/.test(basename) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(basename)) throw new Error("edit.invalid");
  const slash = path.lastIndexOf("/");
  const after = path.slice(0, slash + 1) + basename + ".md";
  if (after === path) return null;
  const apply = async (from, to) => {
    if (settingsHash(service.getSettings()) !== hash || service.getIndex()?.stale || service.isRebuilding()) throw new Error("edit.rules");
    if (app.vault.getAbstractFileByPath(from) !== file || file.path !== from) throw new Error("edit.changed");
    const target = app.vault.getAbstractFileByPath(to);
    if (target && target !== file) throw new Error("edit.conflict");
    await app.fileManager.renameFile(file, to);
    service.onRename(file, from);
    try {
      await service.flush();
    } catch (error) {
      await app.fileManager.renameFile(file, from);
      service.onRename(file, to);
      await service.flush();
      throw error;
    }
  };
  return { kind: "rename", selection, before: path, after, redo: () => apply(path, after), undo: () => apply(after, path) };
}

// src/services/RestoreStructure.js
function planStructureRestore(archive, snapshot) {
  const { app, service } = archive, settings = service.getSettings();
  const conflicts = [], entries = [];
  if (snapshot.hash !== settingsHash(settings) || !service.getIndex() || service.getIndex().stale || service.isRebuilding()) conflicts.push({ reason: "rules" });
  const paths = /* @__PURE__ */ new Set(), numbers = /* @__PURE__ */ new Map();
  for (const node of snapshot.nodes) {
    if (!node.path.endsWith(".md") || node.path.startsWith("/") || /[\\:*?"<>|\x00-\x1f]/.test(node.path) || node.path.split("/").some((part) => part === "." || part === "..")) {
      conflicts.push({ reason: "rules", path: node.path });
      continue;
    }
    const file = archive.resolve(node.id);
    if (!file) {
      conflicts.push({ reason: "missing", path: node.path });
      continue;
    }
    if (file.path === node.path) continue;
    const basename = node.path.slice(node.path.lastIndexOf("/") + 1, -3);
    const parsed = parseIndexedFile({ path: node.path, basename }, settings);
    if (!parsed.ok) {
      conflicts.push({ reason: "rules", path: node.path });
      continue;
    }
    const key = parsed.parsed.segments.join("/");
    if (paths.has(node.path) || numbers.has(key)) conflicts.push({ reason: "occupied", path: node.path });
    paths.add(node.path);
    numbers.set(key, file);
    entries.push({ file, id: node.id, before: file.path, after: node.path });
  }
  const moving = new Set(entries.map((entry) => entry.file));
  for (const entry of entries) {
    const occupied = app.vault.getAbstractFileByPath(entry.after);
    if (occupied && !moving.has(occupied)) conflicts.push({ reason: "occupied", path: entry.after });
  }
  for (const file of app.vault.getMarkdownFiles()) {
    if (moving.has(file)) continue;
    const p = parseIndexedFile(file, settings);
    if (p.ok && numbers.has(p.parsed.segments.join("/"))) conflicts.push({ reason: "occupied", path: file.path });
  }
  return { entries, conflicts };
}
function makeStructureRestoreCommand(archive, snapshot) {
  const plan = planStructureRestore(archive, snapshot);
  if (plan.conflicts.length) throw Error("archive.conflicts");
  if (!plan.entries.length) return null;
  const { app, service } = archive, entries = plan.entries;
  const hash = settingsHash(service.getSettings());
  const token = Date.now().toString(36) + Math.random().toString(36).slice(2);
  const apply = async (reverse) => {
    if (service.editBatch || service.getIndex()?.stale || service.isRebuilding() || settingsHash(service.getSettings()) !== hash) throw Error("edit.rules");
    const moving = new Set(entries.map((e) => e.file));
    for (const e of entries) {
      const from = reverse ? e.after : e.before, to = reverse ? e.before : e.after;
      if (archive.resolve(e.id) !== e.file || e.file.path !== from) throw Error("edit.changed");
      const existing = app.vault.getAbstractFileByPath(to);
      if (existing && !moving.has(existing)) throw Error("edit.conflict");
    }
    const targetNumbers = /* @__PURE__ */ new Set();
    for (const e of entries) {
      const path = reverse ? e.before : e.after;
      const basename = path.slice(path.lastIndexOf("/") + 1, -3);
      const parsed = parseIndexedFile({ path, basename }, service.getSettings());
      if (!parsed.ok) throw Error("edit.rules");
      targetNumbers.add(parsed.parsed.segments.join("/"));
    }
    for (const file of app.vault.getMarkdownFiles()) {
      if (moving.has(file)) continue;
      const parsed = parseIndexedFile(file, service.getSettings());
      if (parsed.ok && targetNumbers.has(parsed.parsed.segments.join("/"))) throw Error("edit.conflict");
    }
    if (!reverse && planStructureRestore(archive, snapshot).conflicts.length) throw Error("archive.conflicts");
    const rename = async (e, path) => {
      const old = e.file.path;
      await app.fileManager.renameFile(e.file, path);
      archive.changed(e.file, old);
      service.onRename(e.file, old);
    };
    const temp = (e, i, phase) => e.before.slice(0, e.before.lastIndexOf("/") + 1) + `.zettel-restore-${token}-${phase}-${i}.md`;
    service.editBatch = true;
    try {
      for (let i = 0; i < entries.length; i++) {
        const path = temp(entries[i], i, "stage");
        if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
        await rename(entries[i], path);
      }
      for (const e of entries) {
        const path = reverse ? e.before : e.after;
        if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
        await rename(e, path);
      }
      service.editBatchFlushing = true;
      await service.flush();
    } catch (error) {
      try {
        for (let i = 0; i < entries.length; i++) {
          const path = temp(entries[i], i, "rollback");
          if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
          await rename(entries[i], path);
        }
        for (const e of entries) {
          const path = reverse ? e.after : e.before;
          if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
          await rename(e, path);
        }
        service.editBatchFlushing = true;
        await service.flush();
      } catch {
        service.getIndex().stale = true;
        throw Error("move.rollbackFailed");
      }
      throw error;
    } finally {
      service.editBatch = false;
      service.editBatchFlushing = false;
      service.notifyViewStateChanged();
    }
  };
  const activePath = service.getViewState?.().activeFilePath;
  const selected = entries.find((e) => e.before === activePath) ?? entries[0];
  const numberAt = (path) => parseIndexedFile({ path, basename: path.slice(path.lastIndexOf("/") + 1, -3) }, service.getSettings()).parsed?.segments.join(service.getSettings().idSegmentDelimiter);
  return { kind: "restore", entries, beforeSelection: numberAt(selected.before), afterSelection: numberAt(selected.after), selection: numberAt(selected.after), redo: () => apply(false), undo: () => apply(true) };
}

// src/view/StructureDiff.js
function flatSnapshot(snapshot) {
  const actual = new Map(snapshot.nodes.map((node) => [node.segments.join("/"), node]));
  const tree = /* @__PURE__ */ new Map();
  for (const node of snapshot.nodes) for (let i = 1; i <= node.segments.length; i++) {
    const segments = node.segments.slice(0, i), key = segments.join("/"), real = actual.get(key);
    if (!tree.has(key)) tree.set(key, real ? { ...real, depth: i - 1, key: real.id } : { id: "gap:" + key, key: "gap:" + key, title: "", path: "", segments, depth: i - 1, placeholder: true });
  }
  return [...tree.values()].sort((a, b) => {
    for (let i = 0; i < Math.min(a.segments.length, b.segments.length); i++) if (a.segments[i] !== b.segments[i]) return a.segments[i] - b.segments[i];
    return a.segments.length - b.segments.length;
  });
}
function alignStructure(before, after) {
  const left = flatSnapshot(before), right = flatSnapshot(after);
  const rightIndex = new Map(right.map((node, i) => [node.key, i]));
  const matches = left.map((node, i) => ({ left: i, right: rightIndex.get(node.key) })).filter((item) => item.right !== void 0);
  const tails = [], tailIndices = [], previous = [];
  for (let i = 0; i < matches.length; i++) {
    let low = 0, high = tails.length;
    while (low < high) {
      const mid = low + high >> 1;
      if (tails[mid] < matches[i].right) low = mid + 1;
      else high = mid;
    }
    previous[i] = low ? tailIndices[low - 1] : -1;
    tails[low] = matches[i].right;
    tailIndices[low] = i;
  }
  const anchors = [];
  let cursor = tailIndices[tails.length - 1];
  while (cursor !== void 0 && cursor >= 0) {
    anchors.push(matches[cursor]);
    cursor = previous[cursor];
  }
  anchors.reverse();
  const pairs = [];
  let l = 0, r = 0;
  for (const anchor of [...anchors, { left: left.length, right: right.length }]) {
    while (l < anchor.left || r < anchor.right) {
      pairs.push({ left: l < anchor.left ? left[l++] : null, right: r < anchor.right ? right[r++] : null });
    }
    if (l < left.length && r < right.length) pairs.push({ left: left[l++], right: right[r++] });
  }
  const originals = new Map(before.nodes.map((node) => [node.id, node])), updates = new Map(after.nodes.map((node) => [node.id, node]));
  const change = (node) => {
    if (!node || node.placeholder) return {};
    const old = originals.get(node.id), next = updates.get(node.id);
    return { added: !old, removed: !next, title: !!old && !!next && old.title !== next.title, number: !!old && !!next && old.idKey !== next.idKey, path: !!old && !!next && old.path !== next.path, moved: !!old && !!next && old.segments.slice(0, -1).join("/") !== next.segments.slice(0, -1).join("/") };
  };
  return pairs.map((pair) => ({ ...pair, leftChange: change(pair.left), rightChange: change(pair.right) }));
}
function textChanges(oldText, newText) {
  let prefix2 = 0;
  while (prefix2 < Math.min(oldText.length, newText.length) && oldText[prefix2] === newText[prefix2]) prefix2++;
  let suffix = 0;
  while (suffix < oldText.length - prefix2 && suffix < newText.length - prefix2 && oldText[oldText.length - 1 - suffix] === newText[newText.length - 1 - suffix]) suffix++;
  return { prefix: oldText.slice(0, prefix2), old: oldText.slice(prefix2, oldText.length - suffix), next: newText.slice(prefix2, newText.length - suffix), suffix: suffix ? oldText.slice(-suffix) : "" };
}

// src/view/StructureHistoryModal.js
var StructureHistoryModal = class extends import_obsidian2.Modal {
  constructor(app, service) {
    super(app);
    this.service = service;
    this.archive = service.structureArchive;
    this.position = Math.max(0, (this.archive?.records.length ?? 1) - 1);
    this.closed = /* @__PURE__ */ new Set();
    this.onlyChanges = true;
    this.confirm = null;
  }
  onOpen() {
    this.modalEl.addClass("zettel-outline-history-modal");
    this.contentEl.setAttribute("tabindex", "-1");
    this.contentEl.addEventListener("keydown", (event) => {
      if (event.isComposing || event.ctrlKey || event.metaKey || event.altKey || ["INPUT", "TEXTAREA", "SELECT"].includes(event.target.tagName)) return;
      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        event.stopPropagation();
        this.navigate(event.key === "ArrowLeft" ? -1 : 1);
      }
    });
    this.unsubscribe = this.archive?.subscribe(() => this.render());
    this.render();
    this.contentEl.focus({ preventScroll: true });
  }
  onClose() {
    this.unsubscribe?.();
  }
  navigate(delta) {
    this.position = Math.min(this.archive.records.length - 1, Math.max(0, this.position + delta));
    this.confirm = null;
    this.closed.clear();
    this.render();
    this.contentEl.focus({ preventScroll: true });
  }
  button(host, label, callback, icon) {
    const button = host.createEl("button", { text: icon ? "" : label, attr: { "aria-label": label, title: label, type: "button" } });
    if (icon) (0, import_obsidian2.setIcon)(button, icon);
    button.addEventListener("click", callback);
    return button;
  }
  render() {
    const el = this.contentEl;
    el.empty();
    el.createEl("h3", { text: t(this.app, "archive.title") });
    const records = this.archive?.records ?? [];
    if (!records.length) {
      el.createDiv({ cls: "zettel-outline-history__empty", text: t(this.app, "archive.empty") });
      return;
    }
    this.position = Math.max(0, Math.min(this.position, records.length - 1));
    const record = records[this.position];
    const bar = el.createDiv({ cls: "zettel-outline-history__toolbar" });
    const prev = this.button(bar, t(this.app, "archive.previous"), () => this.navigate(-1), "chevron-left");
    prev.disabled = this.position === 0;
    const date = new Date(record.time).toLocaleString();
    bar.createDiv({ cls: "zettel-outline-history__caption", text: `${date} \xB7 ${t(this.app, "archive.kind." + record.kind)} \xB7 ${this.position + 1} / ${records.length}` });
    const next = this.button(bar, t(this.app, "archive.next"), () => this.navigate(1), "chevron-right");
    next.disabled = this.position === records.length - 1;
    const filter = el.createEl("label", { cls: "zettel-outline-history__filter" });
    const check = filter.createEl("input", { attr: { type: "checkbox" } });
    check.checked = this.onlyChanges;
    filter.createSpan({ text: t(this.app, "archive.onlyChanges") });
    check.addEventListener("change", () => {
      this.onlyChanges = check.checked;
      this.render();
    });
    if (record.status !== "complete") el.createDiv({ cls: "zettel-outline-history__warning", text: t(this.app, "archive.interrupted") });
    const headers = el.createDiv({ cls: "zettel-outline-history__headers" });
    headers.createDiv({ text: t(this.app, "archive.before") });
    headers.createDiv({ text: t(this.app, "archive.after") });
    const scroller = el.createDiv({ cls: "zettel-outline-history__scroll", attr: { tabindex: "0", "aria-label": t(this.app, "archive.compare") } });
    const pairs = alignStructure(record.before, record.after);
    const before = new Map(record.before.nodes.map((n) => [n.id, n])), after = new Map(record.after.nodes.map((n) => [n.id, n]));
    const paths = [new Map(record.before.nodes.map((n) => [n.segments.join("/"), n.id])), new Map(record.after.nodes.map((n) => [n.segments.join("/"), n.id]))];
    const changed = /* @__PURE__ */ new Set();
    for (const pair of pairs) for (const side of ["left", "right"]) if (Object.values(pair[side + "Change"]).some(Boolean) && pair[side]) changed.add(pair[side].id);
    const relevant = new Set(changed);
    for (const snapshot of [record.before, record.after]) for (const node of snapshot.nodes) if (changed.has(node.id)) for (let i = 1; i < node.segments.length; i++) {
      const key = node.segments.slice(0, i).join("/");
      relevant.add(paths[0].get(key) ?? "gap:" + key);
      relevant.add(paths[1].get(key) ?? "gap:" + key);
    }
    const hidden = (node, side) => {
      if (!node) return true;
      if (this.onlyChanges && !relevant.has(node.id)) return true;
      for (let i = 1; i < node.segments.length; i++) {
        const key = node.segments.slice(0, i).join("/");
        if (this.closed.has(paths[side].get(key) ?? "gap:" + key)) return true;
      }
      return false;
    };
    for (const pair of pairs) {
      const left = hidden(pair.left, 0) ? null : pair.left, right = hidden(pair.right, 1) ? null : pair.right;
      if (!left && !right) continue;
      const row = scroller.createDiv({ cls: "zettel-outline-history__pair" });
      this.cell(row, left, "left", pair.leftChange, after, record.before);
      this.cell(row, right, "right", pair.rightChange, before, record.after);
    }
    const footer = el.createDiv({ cls: "zettel-outline-history__footer" });
    footer.createDiv({ cls: "setting-item-description", text: t(this.app, "archive.scope") });
    const restore = this.button(footer, t(this.app, "archive.restore"), () => {
      this.confirm = planStructureRestore(this.archive, record.before);
      this.render();
    });
    restore.disabled = this.busy || this.archive.disabled || !!this.service.editBatch || !!this.service.editHistory?.busy;
    if (this.confirm) {
      const panel = el.createDiv({ cls: "zettel-outline-history__confirmation", attr: { "aria-live": "polite" } });
      if (this.confirm.conflicts.length) {
        panel.createDiv({ text: t(this.app, "archive.blocked", { count: this.confirm.conflicts.length }) });
        for (const conflict of this.confirm.conflicts.slice(0, 20)) panel.createDiv({ text: t(this.app, "archive.reason." + conflict.reason) + (conflict.path ? " \xB7 " + conflict.path : "") });
      } else if (!this.confirm.entries.length) panel.createDiv({ text: t(this.app, "archive.noChanges") });
      else {
        panel.createDiv({ text: t(this.app, "archive.confirm", { count: this.confirm.entries.length }) });
        const list = panel.createDiv({ cls: "zettel-outline-history__plan" });
        for (const entry of this.confirm.entries) list.createDiv({ text: entry.before + " \u2192 " + entry.after });
        const accept = this.button(panel, t(this.app, "archive.apply"), async () => {
          if (this.busy) return;
          this.busy = true;
          accept.disabled = true;
          try {
            const command = makeStructureRestoreCommand(this.archive, record.before);
            if (command) await historyFor(this.service).execute(command);
            this.confirm = null;
            new import_obsidian2.Notice(t(this.app, "archive.restored"));
            this.render();
          } catch (error) {
            new import_obsidian2.Notice(t(this.app, error.message));
            this.confirm = planStructureRestore(this.archive, record.before);
          } finally {
            this.busy = false;
            this.render();
          }
        });
        accept.disabled = !!this.busy;
      }
    }
  }
  cell(host, node, side, change, other, snapshot) {
    const cell = host.createDiv({ cls: "zettel-outline-history__cell" + (node ? "" : " is-blank") });
    if (!node) return;
    const modified = Object.values(change).some(Boolean);
    if (modified) cell.addClass(side === "left" ? "is-before-change" : "is-after-change");
    const line = cell.createDiv({ cls: "zettel-outline-history__node" });
    line.style.paddingLeft = `${node.depth * 20}px`;
    const hasChildren = snapshot.nodes.some((n) => n.segments.length > node.segments.length && node.segments.every((v, i) => n.segments[i] === v));
    const toggle = this.button(line, this.closed.has(node.id) ? t(this.app, "tree.expandAll") : t(this.app, "tree.collapseAll"), () => {
      const scroll = host.parentElement.scrollTop;
      if (this.closed.has(node.id)) this.closed.delete(node.id);
      else this.closed.add(node.id);
      this.render();
      const scroller = this.contentEl.querySelector(".zettel-outline-history__scroll");
      if (scroller) scroller.scrollTop = scroll;
    }, this.closed.has(node.id) ? "chevron-right" : "chevron-down");
    toggle.classList.add("zettel-outline-history__toggle");
    toggle.disabled = !hasChildren;
    if (!hasChildren) toggle.style.visibility = "hidden";
    const counterpart = other.get(node.id);
    const number = line.createSpan({ cls: "zettel-outline-history__number" });
    this.diffText(number, node.idKey ?? node.segments.join(snapshot.delimiter), counterpart?.idKey, side, change.number);
    const title = line.createSpan({ cls: "zettel-outline-history__name" });
    this.diffText(title, node.title, counterpart?.title, side, change.title);
    if (change.moved) line.createSpan({ cls: "zettel-outline-history__badge", text: t(this.app, "archive.moved") });
    if (change.added || change.removed) line.createSpan({ cls: "zettel-outline-history__badge", text: t(this.app, change.added ? "archive.added" : "archive.removed") });
    if (modified && node.path) {
      const path = cell.createDiv({ cls: "zettel-outline-history__path" });
      this.diffText(path, node.path, counterpart?.path, side, change.path);
    }
  }
  diffText(host, value, other, side, highlight) {
    if (!highlight || other === void 0) {
      host.createSpan({ text: value });
      return;
    }
    const diff = side === "left" ? textChanges(value, other) : textChanges(other, value);
    host.createSpan({ text: diff.prefix });
    host.createEl("mark", { text: side === "left" ? diff.old : diff.next });
    host.createSpan({ text: diff.suffix });
  }
};

// src/settings/Shortcuts.js
var defaultShortcuts = {
  moveUp: "Ctrl+Shift+ArrowUp",
  moveDown: "Ctrl+Shift+ArrowDown",
  newSibling: "Ctrl+Enter",
  newChild: "Ctrl+Shift+Enter",
  newParent: "Ctrl+Alt+Enter",
  newRoot: "",
  expandAll: "Ctrl+Alt+ArrowDown",
  collapseAll: "Ctrl+Alt+ArrowUp",
  help: "Ctrl+/",
  history: "",
  deleteFile: "Delete",
  indent: "Tab",
  outdent: "Shift+Tab",
  up: "ArrowUp",
  down: "ArrowDown",
  left: "ArrowLeft",
  right: "ArrowRight",
  open: "Enter",
  first: "Home",
  last: "End",
  rename: "Alt+Enter",
  undo: "Ctrl+z",
  redo: "Ctrl+y",
  redoAlt: "Ctrl+Shift+z"
};
function keyBinding(event) {
  if (event.isComposing || ["Control", "Shift", "Alt", "Meta", "Dead", "Process", "Unidentified"].includes(event.key)) return null;
  const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
  return [event.ctrlKey && "Ctrl", event.metaKey && "Meta", event.altKey && "Alt", event.shiftKey && "Shift", key].filter(Boolean).join("+");
}
function effectiveShortcuts(settings = {}) {
  const custom = settings.panelShortcuts ?? {}, bindings = { ...defaultShortcuts, ...custom };
  for (const action of Object.keys(bindings)) if (!(action in custom) && Object.entries(custom).some(([key, binding]) => key !== action && binding && binding === bindings[action])) bindings[action] = "";
  return bindings;
}
function shortcutAction(event, settings = {}) {
  const binding = keyBinding(event);
  const shortcuts = effectiveShortcuts(settings);
  return Object.keys(shortcuts).find((action) => shortcuts[action] && (shortcuts[action] === binding || !settings.panelShortcuts?.[action] && binding?.startsWith("Meta+") && shortcuts[action] === binding.replace("Meta+", "Ctrl+")));
}
function shortcutLabel(binding) {
  return binding.replace("ArrowUp", "\u2191").replace("ArrowDown", "\u2193").replace("ArrowLeft", "\u2190").replace("ArrowRight", "\u2192").replace("Enter", "\u21B5").replace(" ", "Space");
}

// src/main.js
var import_obsidian8 = require("obsidian");

// src/view/ListIndex.js
function buildListIndex(index, delimiter) {
  const idIndex = /* @__PURE__ */ new Map();
  for (const source of index.idIndex.values()) {
    if (!source.filePath) continue;
    for (let depth = 1; depth <= source.segments.length; depth++) {
      const segments = source.segments.slice(0, depth);
      const idKey = segments.join(delimiter);
      if (!idIndex.has(idKey)) idIndex.set(idKey, { idKey, segments, rootKey: String(segments[0]), title: "", filePath: null });
      if (depth === source.segments.length) idIndex.set(idKey, { ...source, idKey, title: source.filePath ? source.title : "" });
    }
  }
  const childrenIndex = /* @__PURE__ */ new Map();
  const roots = [];
  const sorted = [...idIndex.values()].sort((a, b) => {
    for (let i = 0; i < Math.min(a.segments.length, b.segments.length); i++) {
      if (a.segments[i] !== b.segments[i]) return a.segments[i] - b.segments[i];
    }
    return a.segments.length - b.segments.length;
  });
  for (const node of sorted) {
    if (node.segments.length === 1) roots.push(node.idKey);
    else {
      const parent = node.segments.slice(0, -1).join(delimiter);
      if (!childrenIndex.has(parent)) childrenIndex.set(parent, []);
      childrenIndex.get(parent).push(node.idKey);
    }
  }
  return { ...index, idIndex, childrenIndex, roots };
}

// src/services/TreeEdit.js
var prefix = (a, b) => a.length >= b.length && b.every((n, i) => n === a[i]);
var numberKey = (parts) => parts.join("/");
function makeTreeEdit(app, service, operation) {
  const settings = service.getSettings(), hash = settingsHash(settings), index = service.getIndex();
  if (!index || index.stale || service.isRebuilding() || service.editBatch) throw Error("edit.rules");
  const view = buildListIndex(index, settings.idSegmentDelimiter), nodes = /* @__PURE__ */ new Map();
  const root = { key: null, children: [], parent: null };
  for (const [key, node] of view.idIndex) nodes.set(key, { ...node, key, local: node.segments.at(-1), children: [], parent: null });
  for (const node of nodes.values()) {
    const parent = node.segments.length === 1 ? root : nodes.get(node.segments.slice(0, -1).join(settings.idSegmentDelimiter));
    node.parent = parent;
    parent.children.push(node);
  }
  for (const node of [root, ...nodes.values()]) node.children.sort((a, b) => a.local - b.local);
  const source = nodes.get(operation.id), target = nodes.get(operation.target);
  let selected = source, newNode = null, createdPlan = null;
  const compact = (parent) => parent.children.forEach((child, i) => {
    child.local = i + 1;
  });
  const detach = (node) => {
    node.parent.children.splice(node.parent.children.indexOf(node), 1);
  };
  const insert = (node, parent, position) => {
    node.parent = parent;
    parent.children.splice(position, 0, node);
  };
  const ensureSource = () => {
    if (!source) throw Error("edit.missing");
  };
  const move = (parent, position) => {
    ensureSource();
    if (parent !== root && prefix(parent.segments, source.segments)) throw Error("move.cycle");
    const old = source.parent, oldIndex = old.children.indexOf(source);
    if (old === parent && oldIndex < position) position--;
    if (old === parent && position === oldIndex) return false;
    detach(source);
    insert(source, parent, position);
    compact(old);
    compact(parent);
    return true;
  };
  let changed = true;
  if (operation.type === "outdent") {
    ensureSource();
    const parent = source.parent;
    if (parent === root) throw Error("move.topLevel");
    changed = move(parent.parent, parent.parent.children.indexOf(parent) + 1);
  } else if (operation.type === "indent") {
    ensureSource();
    const siblings = source.parent.children, position = siblings.indexOf(source);
    if (position < 1) throw Error("move.noPrevious");
    const parent = siblings[position - 1];
    changed = move(parent, parent.children.length);
  } else if (operation.type === "position") {
    ensureSource();
    if (operation.target && !target) throw Error("edit.missing");
    if (target && prefix(target.segments, source.segments)) throw Error("move.cycle");
    const parent = operation.where === "inside" ? target : target?.parent ?? root;
    const position = operation.where === "inside" || !target ? parent.children.length : parent.children.indexOf(target) + (operation.where === "after" ? 1 : 0);
    changed = move(parent, position);
  } else if (operation.type === "create") {
    const mode = operation.mode;
    if (mode !== "root") ensureSource();
    if (mode === "parent") {
      if (source.parent !== root && !source.parent.filePath) {
        newNode = source.parent;
        selected = newNode;
      } else {
        const parent = source.parent, position = parent.children.indexOf(source);
        newNode = { key: "new", local: source.local, children: [], parent };
        parent.children.splice(position, 1, newNode);
        source.parent = newNode;
        source.local = 1;
        newNode.children.push(source);
        selected = newNode;
      }
    } else if (mode === "fill") {
      if (source.filePath) throw Error("create.conflict");
      newNode = source;
      selected = source;
    } else {
      const parent = mode === "child" ? source : mode === "sibling" ? source.parent : root;
      const position = operation.position ?? (mode === "sibling" ? parent.children.indexOf(source) + 1 : parent.children.length);
      if (!Number.isInteger(position) || position < 0 || position > parent.children.length) throw Error("create.invalidNumber");
      newNode = { key: "new", local: position + 1, children: [], parent };
      insert(newNode, parent, position);
      compact(parent);
      selected = newNode;
    }
    if (newNode?.filePath) throw Error("create.conflict");
  } else throw Error("edit.invalid");
  if (!changed) return null;
  const mapping = /* @__PURE__ */ new Map();
  const visit = (parent, parts) => {
    if (parent.children.length > 9999) throw Error("move.full");
    for (const node of parent.children) {
      node.after = [...parts, node.local];
      if (node.key !== "new") mapping.set(node.key, node.after);
      visit(node, node.after);
    }
  };
  visit(root, []);
  const basename = (title, parts) => settings.idPosition === "prefix" ? `${parts.join(settings.idSegmentDelimiter)}${settings.titleDelimiter}${title}` : `${title}${settings.titleDelimiter}${parts.join(settings.idSegmentDelimiter)}`;
  const validatePath = (path, segments, title) => {
    const name = path.slice(path.lastIndexOf("/") + 1, -3);
    if (!path.endsWith(".md") || /[\\:*?"<>|\x00-\x1f]/.test(path) || path.split("/").some((p) => p === "." || p === "..") || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) throw Error("create.invalidTitle");
    const parsed = parseIndexedFile({ path, basename: name }, settings);
    if (!parsed.ok || numberKey(parsed.parsed.segments) !== numberKey(segments) || parsed.parsed.title !== title) throw Error("move.excluded");
  };
  const all = app.vault.getMarkdownFiles().flatMap((file) => {
    const p = parseFileName(file.basename, settings);
    return p.ok ? [{ file, p: p.parsed }] : [];
  });
  const prefixMaps = [...mapping].map(([key, to]) => ({ from: key.split(settings.idSegmentDelimiter).map(Number), to })).sort((a, b) => b.from.length - a.from.length);
  const entries = [];
  for (const { file, p } of all) {
    const map = prefixMaps.find((item) => prefix(p.segments, item.from));
    const afterParts = map ? [...map.to, ...p.segments.slice(map.from.length)] : null;
    if (!afterParts || numberKey(afterParts) === numberKey(p.segments)) continue;
    if (!parseIndexedFile(file, settings).ok) throw Error("move.excluded");
    const after = file.path.slice(0, file.path.lastIndexOf("/") + 1) + basename(p.title, afterParts) + ".md";
    validatePath(after, afterParts, p.title);
    entries.push({ file, before: file.path, after, oldId: numberKey(p.segments), newId: numberKey(afterParts) });
  }
  if (newNode) {
    const title = operation.title?.trim();
    if (!title) throw Error("create.needTitle");
    const folder = operation.folder ?? "";
    const path = (folder && folder !== "/" ? folder + "/" : "") + basename(title, newNode.after) + ".md";
    validatePath(path, newNode.after, title);
    createdPlan = { path, number: numberKey(newNode.after) };
  }
  if (!entries.length && !createdPlan) return null;
  const token = Math.random().toString(36).slice(2), affected = new Set(entries.map((e) => e.file));
  let createdFile = null;
  const apply = async (reverse) => {
    if (service.editBatch || service.isRebuilding() || service.getIndex()?.stale || settingsHash(service.getSettings()) !== hash) throw Error("edit.rules");
    const moving = new Set(affected);
    if (reverse && createdFile) moving.add(createdFile);
    if (reverse && createdPlan) {
      if (!createdFile || app.vault.getAbstractFileByPath(createdPlan.path) !== createdFile) throw Error("edit.changed");
      if (await app.vault.read(createdFile) !== "") throw Error("create.undoHasContent");
    }
    const paths = /* @__PURE__ */ new Set(), ids = /* @__PURE__ */ new Set();
    for (const e of entries) {
      const from = reverse ? e.after : e.before, to = reverse ? e.before : e.after, id = reverse ? e.oldId : e.newId;
      if (e.file.path !== from || app.vault.getAbstractFileByPath(from) !== e.file) throw Error("edit.changed");
      const existing = app.vault.getAbstractFileByPath(to);
      if (existing && !moving.has(existing) || paths.has(to) || ids.has(id)) throw Error("edit.conflict");
      paths.add(to);
      ids.add(id);
    }
    if (!reverse && createdPlan) {
      const existing = app.vault.getAbstractFileByPath(createdPlan.path);
      if (existing && !moving.has(existing) || paths.has(createdPlan.path) || ids.has(createdPlan.number)) throw Error("edit.conflict");
      ids.add(createdPlan.number);
    }
    for (const file of app.vault.getMarkdownFiles()) {
      if (moving.has(file)) continue;
      const parsed = parseFileName(file.basename, settings);
      if (!parsed.ok) continue;
      const key = numberKey(parsed.parsed.segments);
      if (ids.has(key) || entries.some((e) => prefix(parsed.parsed.segments, (reverse ? e.newId : e.oldId).split("/").map(Number)))) throw Error("move.conflict");
    }
    const rename = async (file, path) => {
      const old = file.path;
      await app.fileManager.renameFile(file, path);
      service.onRename(file, old);
    };
    const temp = (path, i, phase) => path.slice(0, path.lastIndexOf("/") + 1) + `.zettel-edit-${token}-${phase}-${i}.md`;
    const originalCreated = createdFile;
    service.editBatch = true;
    try {
      if (reverse && createdFile) {
        const path = temp(createdPlan.path, 0, "parent");
        if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
        await rename(createdFile, path);
      }
      for (let i = 0; i < entries.length; i++) {
        if (settingsHash(service.getSettings()) !== hash || service.getIndex()?.stale || service.isRebuilding()) throw Error("edit.rules");
        const expected = reverse ? entries[i].after : entries[i].before;
        if (entries[i].file.path !== expected || app.vault.getAbstractFileByPath(expected) !== entries[i].file) throw Error("edit.changed");
        const path = temp(entries[i].before, i, "stage");
        if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
        await rename(entries[i].file, path);
      }
      for (const e of entries) {
        const path = reverse ? e.before : e.after;
        if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
        await rename(e.file, path);
      }
      if (!reverse && createdPlan) {
        if (app.vault.getAbstractFileByPath(createdPlan.path)) throw Error("edit.conflict");
        createdFile = await app.vault.create(createdPlan.path, "");
        service.onCreate(createdFile);
      }
      service.editBatchFlushing = true;
      await service.flush();
      if (reverse && createdFile) {
        await app.fileManager.trashFile(createdFile);
        service.structureArchive?.changed(createdFile, createdFile.path, true);
        service.onDelete(createdFile);
        createdFile = null;
      }
    } catch (error) {
      service.editBatchFlushing = false;
      try {
        if (!reverse && createdFile && createdFile !== originalCreated) {
          if (await app.vault.read(createdFile) !== "") throw Error("create.undoHasContent");
          await app.fileManager.trashFile(createdFile);
          service.onDelete(createdFile);
          createdFile = null;
        }
        for (let i = 0; i < entries.length; i++) {
          const path = temp(entries[i].before, i, "rollback");
          if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
          await rename(entries[i].file, path);
        }
        for (const e of entries) {
          const path = reverse ? e.after : e.before;
          if (app.vault.getAbstractFileByPath(path)) throw Error("edit.conflict");
          await rename(e.file, path);
        }
        if (reverse && originalCreated) {
          if (!app.vault.getAbstractFileByPath(originalCreated.path)) throw Error("edit.missing");
          if (app.vault.getAbstractFileByPath(createdPlan.path) && originalCreated.path !== createdPlan.path) throw Error("edit.conflict");
          if (originalCreated.path !== createdPlan.path) await rename(originalCreated, createdPlan.path);
          createdFile = originalCreated;
        }
        service.editBatchFlushing = true;
        await service.flush();
      } catch {
        service.getIndex().stale = true;
        throw Error("move.rollbackFailed");
      }
      throw error;
    } finally {
      service.editBatch = false;
      service.editBatchFlushing = false;
      service.notifyViewStateChanged();
    }
  };
  const beforeSelection = source?.segments.join(settings.idSegmentDelimiter), afterSelection = selected?.after.join(settings.idSegmentDelimiter);
  return { kind: operation.type === "create" ? "create" + operation.mode : operation.type === "position" ? "move" : operation.type, entries, createdPlan, beforeSelection, afterSelection, selection: afterSelection, getCreatedFile: () => createdFile, redo: () => apply(false), undo: () => apply(true) };
}

// src/view/createControls.js
function resizeNumberInput(input, value) {
  const digits = Math.max(1, String(value).length);
  input.style.width = `max(20px, calc(${digits}ch + 10px))`;
}
function bindImmediateHint(trigger, tooltip) {
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
  trigger.addEventListener("pointerleave", () => {
    if (!pinned) hide();
  });
  trigger.addEventListener("focus", show);
  trigger.addEventListener("blur", () => {
    pinned = false;
    hide();
  });
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    pinned = !pinned;
    show();
  });
  trigger.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      pinned = false;
      hide();
    }
  });
}

// src/view/NoteCreation.js
var import_obsidian3 = require("obsidian");
function occupiedNumbers(files, settings, includeExcluded = false) {
  const occupied = /* @__PURE__ */ new Set();
  const actual = /* @__PURE__ */ new Set();
  for (const file of files) {
    const parsed = includeExcluded ? parseFileName(file.basename, settings) : parseIndexedFile(file, settings);
    if (!parsed.ok) continue;
    const segments = parsed.parsed.segments;
    actual.add(segments.join("/"));
    for (let i = 1; i <= segments.length; i++) occupied.add(segments.slice(0, i).join("/"));
  }
  return { occupied, actual };
}
function noteBasename(title, segments, settings) {
  const id = segments.join(settings.idSegmentDelimiter);
  return settings.idPosition === "prefix" ? `${id}${settings.titleDelimiter}${title}` : `${title}${settings.titleDelimiter}${id}`;
}
function creationContext(service, mode, node) {
  const settings = service.getSettings(), tree = buildListIndex(service.getIndex(), settings.idSegmentDelimiter);
  const parent = mode === "child" ? node.segments : mode === "sibling" ? node.segments.slice(0, -1) : [];
  const siblings = parent.length ? tree.childrenIndex.get(parent.join(settings.idSegmentDelimiter)) ?? [] : tree.roots;
  if (mode === "fill") return { parent: node.segments.slice(0, -1), number: node.segments.at(-1), fixed: true };
  if (mode === "parent") {
    const ancestor = node.segments.slice(0, -1), oldParent = tree.idIndex.get(ancestor.join(settings.idSegmentDelimiter));
    const segments = oldParent && !oldParent.filePath ? ancestor : node.segments;
    return { parent: segments.slice(0, -1), number: segments.at(-1), fixed: true };
  }
  return { parent, number: mode === "sibling" ? siblings.indexOf(node.segments.join(settings.idSegmentDelimiter)) + 2 : siblings.length + 1, max: siblings.length + 1, fixed: false };
}
function openNoteCreation(app, service, mode, node) {
  const settings = service.getSettings();
  if (service.editBatch) {
    new import_obsidian3.Notice(t(app, "history.busy"));
    return;
  }
  if (!service.getIndex() || service.getIndex().stale || service.getIndex().settingsHash !== settingsHash(settings) || service.isRebuilding()) {
    new import_obsidian3.Notice(t(app, "create.rebuild"));
    return;
  }
  new CreateNoteModal(app, service, mode, node).open();
}
var CreateNoteModal = class extends import_obsidian3.Modal {
  constructor(app, service, mode, node) {
    super(app);
    this.service = service;
    this.mode = mode;
    this.node = node;
    this.anchorPaths = node ? [...service.getIndex().idIndex.values()].filter((item) => item.filePath && node.segments.every((n, i) => item.segments[i] === n)).map((item) => item.filePath).sort().join("\n") : null;
    const context = creationContext(service, mode, node);
    Object.assign(this, context);
    this.ruleHash = settingsHash(service.getSettings());
    this.title = "";
  }
  onOpen() {
    this.modalEl.addClass("zettel-outline-create-modal");
    this.contentEl.createDiv({ cls: "zettel-outline-create__heading", text: t(this.app, `create.${this.mode}`) });
    this.preview = this.contentEl.createEl("div", { cls: "zettel-outline-create__preview", attr: { "aria-live": "polite" } });
    const nameRow = new import_obsidian3.Setting(this.contentEl).setName(t(this.app, "create.title"));
    nameRow.settingEl.addClass("zettel-outline-create__row");
    nameRow.addText((input) => {
      this.titleInput = input;
      input.setPlaceholder(t(this.app, "create.titlePlaceholder"));
      input.inputEl.setAttribute("aria-label", t(this.app, "create.title"));
      input.onChange((value) => {
        this.title = value;
        this.update();
      });
      input.inputEl.addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.isComposing) {
          event.preventDefault();
          this.submit();
        }
      });
    });
    const numberRow = new import_obsidian3.Setting(this.contentEl).setName(t(this.app, "create.number"));
    numberRow.settingEl.addClass("zettel-outline-create__row");
    numberRow.controlEl.addClass("zettel-outline-create__number");
    if (!this.fixed) {
      const hint = numberRow.nameEl.createEl("button", { cls: "zettel-outline-create__number-hint", attr: { type: "button", "aria-label": t(this.app, "create.numberHint") } });
      (0, import_obsidian3.setIcon)(hint, "circle-alert");
      const tooltip = this.modalEl.createDiv({ cls: "zettel-outline-create__instant-hint", text: t(this.app, "create.numberHint"), attr: { role: "tooltip" } });
      tooltip.id = "zettel-outline-number-hint";
      hint.setAttribute("aria-describedby", tooltip.id);
      bindImmediateHint(hint, tooltip);
    }
    if (this.fixed) {
      numberRow.controlEl.createSpan({ text: [...this.parent, this.number].join(this.service.getSettings().idSegmentDelimiter) });
    } else {
      if (this.parent.length) numberRow.controlEl.createSpan({ cls: "zettel-outline-create__parent", text: this.parent.join(this.service.getSettings().idSegmentDelimiter) + this.service.getSettings().idSegmentDelimiter });
      const changeNumber = (delta) => {
        const current = Number(this.number);
        this.number = Math.min(this.max ?? 9999, Math.max(1, (Number.isFinite(current) ? current : 0) + delta));
        this.numberInput.setValue(String(this.number));
        this.update();
      };
      numberRow.addText((input) => {
        this.numberInput = input;
        input.setValue(String(this.number));
        Object.assign(input.inputEl, { type: "number", min: "1", max: String(this.max ?? 9999), step: "1" });
        input.inputEl.setAttribute("aria-label", t(this.app, "create.number"));
        input.onChange((value) => {
          this.number = value;
          this.update();
        });
        input.inputEl.addEventListener("keydown", (event) => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault();
            changeNumber(event.key === "ArrowUp" ? 1 : -1);
          }
        });
      });
    }
    this.error = this.contentEl.createDiv({ cls: "zettel-outline-settings__error", attr: { "aria-live": "polite" } });
    const actions = new import_obsidian3.Setting(this.contentEl);
    actions.settingEl.addClass("zettel-outline-create__actions");
    actions.addButton((button) => {
      button.buttonEl.addClass("zettel-outline-create__cancel");
      button.setButtonText(t(this.app, "create.cancel")).onClick(() => this.close());
    });
    actions.addButton((button) => {
      this.submitButton = button;
      button.setButtonText(t(this.app, "create.submit")).setCta().onClick(() => this.submit());
    });
    this.update();
    this.titleInput.inputEl.focus();
  }
  validate() {
    const settings = this.service.getSettings();
    if (this.service.getIndex()?.stale || this.service.isRebuilding() || settingsHash(settings) !== this.ruleHash) return "create.rebuild";
    if (String(this.number) === "" || !Number.isInteger(Number(this.number)) || Number(this.number) < (this.fixed ? 0 : 1) || Number(this.number) > (this.max ?? 9999)) return this.fixed ? "create.invalidNumber" : "create.invalidPosition";
    if (this.node) {
      const paths = [...this.service.getIndex().idIndex.values()].filter((item) => item.filePath && this.node.segments.every((n, i) => item.segments[i] === n)).map((item) => item.filePath).sort().join("\n");
      if (paths !== this.anchorPaths) return "edit.changed";
    }
    const title = this.title.trim();
    if (!title) return "create.needTitle";
    if (/[\\/:*?"<>|\x00-\x1f]/.test(title)) return "create.invalidTitle";
    const segments = [...this.parent, Number(this.number)];
    const sets = occupiedNumbers(this.app.vault.getMarkdownFiles(), settings, true);
    if (this.fixed && this.mode === "fill" && sets.actual.has(segments.join("/"))) return "create.conflict";
    const basename = noteBasename(title, segments, settings);
    if (/[\\/:*?"<>|\x00-\x1f]/.test(basename) || /[. ]$/.test(basename) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(basename)) return "create.invalidTitle";
    const parsed = parseFileName(basename, settings);
    if (!parsed.ok || parsed.parsed.title !== title || parsed.parsed.segments.join("/") !== segments.join("/")) return "create.invalidTitle";
    const folder = this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path ?? "");
    const path = (!folder.path || folder.path === "/" ? "" : folder.path + "/") + basename + ".md";
    if (exclusionReason({ path }, settings, parsed)) return "exclude.creation";
    try {
      this.creationCommand = makeTreeEdit(this.app, this.service, { type: "create", mode: this.mode, id: this.node?.segments.join(settings.idSegmentDelimiter), title, folder: folder.path, position: this.fixed ? void 0 : Number(this.number) - 1 });
      if (this.creationCommand?.createdPlan.path !== path) return "edit.changed";
    } catch (error) {
      return error.message;
    }
    return null;
  }
  update() {
    if (this.numberInput) resizeNumberInput(this.numberInput.inputEl, this.number);
    this.preview.textContent = noteBasename(this.title.trim() || t(this.app, "create.title"), [...this.parent, this.number], this.service.getSettings()) + ".md";
    this.preview.classList.toggle("is-placeholder", !this.title.trim());
    const error = this.validate();
    this.error.textContent = error && error !== "create.needTitle" ? t(this.app, error) : "";
    this.submitButton.setDisabled(!!error || this.busy);
  }
  async submit() {
    if (this.busy || this.service.creatingNote) return;
    if (this.service.editBatch) {
      new import_obsidian3.Notice(t(this.app, "history.busy"));
      return;
    }
    this.update();
    if (this.validate()) return;
    this.busy = true;
    this.update();
    try {
      const command = this.creationCommand;
      if (!command) return;
      await historyFor(this.service).execute(command);
      const file = command.getCreatedFile();
      if (file) await this.service.openFileByPath(file.path, { newTab: false });
      this.close();
    } catch (error) {
      this.error.textContent = `${t(this.app, "create.failed")}: ${error.message}`;
    } finally {
      this.busy = false;
      this.submitButton.setDisabled(false);
    }
  }
};

// src/view/OutlineView.js
var import_obsidian7 = require("obsidian");

// src/view/ShortcutHelpModal.js
var import_obsidian4 = require("obsidian");
var ShortcutHelpModal = class extends import_obsidian4.Modal {
  constructor(app, service) {
    super(app);
    this.service = service;
  }
  onOpen() {
    this.contentEl.createEl("h3", { text: t(this.app, "shortcuts.title") });
    this.contentEl.createDiv({ cls: "setting-item-description", text: t(this.app, "shortcuts.scope") });
    const bindings = effectiveShortcuts(this.service.getSettings());
    for (const [action, binding] of Object.entries(bindings)) {
      const row = this.contentEl.createDiv({ cls: "zettel-outline-shortcut-help__row" });
      row.createSpan({ text: t(this.app, "shortcuts." + action) });
      row.createEl("kbd", { text: binding ? shortcutLabel(binding) : t(this.app, "shortcuts.unbound") });
    }
  }
};

// src/services/PositionBranch.js
function makePositionCommand(app, service, id, target, where) {
  return makeTreeEdit(app, service, { type: "position", id, target, where });
}

// src/view/dragBranch.js
function exceedsDragThreshold(start, x, y) {
  return Math.hypot(x - start.x, y - start.y) >= 5;
}
function nearestDrop(candidates, x, y) {
  if (!candidates.length) return null;
  const distance = Math.min(...candidates.map((c) => Math.abs(c.y - y)));
  return candidates.filter((c) => Math.abs(c.y - y) <= distance + 4).sort((a, b) => Math.abs(a.x - x) - Math.abs(b.x - x))[0];
}
function bindBranchDrag(tree, move, label, describe = () => "") {
  const viewport = tree.viewportEl, doc = viewport.ownerDocument, win = doc.defaultView;
  const line = tree.host.createDiv({ cls: "zettel-outline__position-line" });
  const feedback = tree.host.createDiv({ cls: "zettel-outline__drop-feedback" });
  let start = null, active = false, target = null, suppressUntil = 0, frame = null, last = null;
  const end = () => {
    if (active) suppressUntil = Date.now() + 350;
    start = null;
    active = false;
    target = null;
    last = null;
    if (frame) win.cancelAnimationFrame(frame);
    frame = null;
    tree.draggingId = null;
    line.style.display = "none";
    feedback.style.display = "none";
    viewport.classList.remove("is-branch-dragging");
    for (const el of viewport.querySelectorAll(".is-drag-source,.is-drag-parent")) el.classList.remove("is-drag-source", "is-drag-parent");
  };
  const candidates = () => {
    const rect = viewport.getBoundingClientRect(), height = tree.indexService.getSettings().rowHeightPx;
    const font = parseFloat(win.getComputedStyle(viewport).fontSize) || 16, indent = font * 2;
    const origin = tree.listIndex.idIndex.get(start.id).segments;
    const rows = tree.visible;
    const result = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i], node = tree.listIndex.idIndex.get(row.idKey);
      if (origin.length <= node.segments.length && origin.every((n, k) => node.segments[k] === n)) continue;
      let endIndex = i + 1;
      while (endIndex < rows.length && rows[endIndex].depth > row.depth) endIndex++;
      const x = rect.left + 18 + row.depth * indent;
      result.push({ id: row.idKey, where: "before", x, y: rect.top + i * height - viewport.scrollTop, parent: node.segments.slice(0, -1) });
      result.push({ id: row.idKey, where: "after", x, y: rect.top + endIndex * height - viewport.scrollTop, parent: node.segments.slice(0, -1) });
      result.push({ id: row.idKey, where: "inside", x: x + indent, y: rect.top + endIndex * height - viewport.scrollTop, parent: node.segments });
    }
    return result.filter((c) => c.y >= rect.top - 4 && c.y <= rect.bottom + 4);
  };
  const update = (x, y) => {
    const rect = viewport.getBoundingClientRect();
    if (x < rect.left - 20 || x > rect.right + 20 || y < rect.top - 25 || y > rect.bottom + 25) {
      target = null;
      line.style.display = "none";
      feedback.style.display = "none";
      return;
    }
    target = nearestDrop(candidates(), x, y);
    if (!target) return;
    line.style.display = "block";
    line.style.left = target.x + "px";
    line.style.top = target.y + "px";
    line.style.width = Math.max(20, rect.right - target.x - 8) + "px";
    const parent = tree.listIndex.idIndex.get(target.parent.join(tree.indexService.getSettings().idSegmentDelimiter));
    feedback.textContent = describe(target);
    feedback.style.display = "block";
    for (const el of viewport.querySelectorAll(".is-drag-parent")) el.classList.remove("is-drag-parent");
    if (parent) {
      for (const el of viewport.querySelectorAll("[data-outline-id]")) if (el.getAttribute("data-outline-id") === parent.idKey) el.classList.add("is-drag-parent");
    }
  };
  const tick = () => {
    if (!active || !last) return;
    const rect = viewport.getBoundingClientRect();
    const delta = last.y < rect.top + 28 ? -8 : last.y > rect.bottom - 28 ? 8 : 0;
    if (delta) {
      viewport.scrollTop = Math.max(0, viewport.scrollTop + delta);
      update(last.x, last.y);
    }
    frame = win.requestAnimationFrame(tick);
  };
  const down = (event) => {
    if (event.button !== 0 || tree.editing || tree.indexService.editBatch || tree.indexService.editHistory?.busy || event.target.closest("button,input")) return;
    if (!event.target.closest(".zettel-outline__tree-title,.zettel-outline__tree-number")) return;
    const row = event.target.closest("[data-outline-id]");
    if (!row) return;
    start = { id: row.getAttribute("data-outline-id"), x: event.clientX, y: event.clientY };
  };
  const motion = (event) => {
    if (!start) return;
    if (!active && !exceedsDragThreshold(start, event.clientX, event.clientY)) return;
    if (!active) {
      active = true;
      viewport.classList.add("is-branch-dragging");
      const source = tree.listIndex.idIndex.get(start.id).segments;
      for (const row of viewport.querySelectorAll("[data-outline-id]")) {
        const node = tree.listIndex.idIndex.get(row.getAttribute("data-outline-id"));
        if (node && source.every((n, i) => node.segments[i] === n)) row.classList.add("is-drag-source");
      }
      frame = win.requestAnimationFrame(tick);
    }
    event.preventDefault();
    last = { x: event.clientX, y: event.clientY };
    update(last.x, last.y);
  };
  const up = (event) => {
    if (!start) return;
    if (!active) {
      end();
      return;
    }
    event.preventDefault();
    update(event.clientX, event.clientY);
    const id = start.id, destination = target;
    end();
    if (destination) move(id, { target: destination.id, where: destination.where });
  };
  const key = (event) => {
    if (active && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      end();
    }
  };
  const click = (event) => {
    if (Date.now() < suppressUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  };
  const native = (event) => {
    if (start) event.preventDefault();
  };
  viewport.addEventListener("mousedown", down);
  viewport.addEventListener("dragstart", native);
  viewport.addEventListener("click", click, true);
  doc.addEventListener("mousemove", motion, true);
  doc.addEventListener("mouseup", up, true);
  win.addEventListener("keydown", key, true);
  win.addEventListener("blur", end);
  return () => {
    end();
    line.remove();
    feedback.remove();
    viewport.removeEventListener("mousedown", down);
    viewport.removeEventListener("dragstart", native);
    viewport.removeEventListener("click", click, true);
    doc.removeEventListener("mousemove", motion, true);
    doc.removeEventListener("mouseup", up, true);
    win.removeEventListener("keydown", key, true);
    win.removeEventListener("blur", end);
  };
}

// src/services/MoveBranch.js
function makeMoveCommand(app, service, id, direction) {
  if (Array.isArray(direction)) {
    const delimiter = service.getSettings().idSegmentDelimiter;
    return makeTreeEdit(app, service, { type: "position", id, target: direction.length ? direction.join(delimiter) : null, where: direction.length ? "inside" : "after" });
  }
  return makeTreeEdit(app, service, { type: direction, id });
}

// src/view/outlineKeys.js
function captureOutlineKeys(viewport, handle, getSettings = () => ({})) {
  const ownerWindow = viewport.ownerDocument?.defaultView;
  if (!ownerWindow) return () => {
  };
  const listener = (event) => {
    if (viewport.ownerDocument.activeElement !== viewport || event.target !== viewport || event.isComposing) return;
    if (!shortcutAction(event, getSettings())) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    handle(event);
  };
  ownerWindow.addEventListener("keydown", listener, true);
  return () => ownerWindow.removeEventListener("keydown", listener, true);
}

// src/view/VirtualTree.js
var import_obsidian6 = require("obsidian");

// src/view/deleteNoteFile.js
var import_obsidian5 = require("obsidian");
async function deleteNoteFile(app, service, path) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!file || file.extension !== "md") return;
  try {
    await app.fileManager.trashFile(file);
    service.onDelete(file);
    await service.flush();
  } catch (error) {
    new import_obsidian5.Notice(t(app, "delete.failed"));
    console.error("Zettel Outline: could not trash note", error);
  }
}

// src/view/VirtualTree.js
var panelLabelSequence = 0;
var VirtualTree = class {
  constructor(host, indexService, opts) {
    this.forest = !!opts?.forest;
    this.expanded = /* @__PURE__ */ new Set();
    this.rootKey = null;
    this.visible = [];
    this.activeId = null;
    this.selectedId = null;
    this.buildToken = 0;
    this.isBuilding = false;
    this.pendingBuildTimer = null;
    this.pendingScrollToActive = false;
    var _a;
    this.host = host;
    this.indexService = indexService;
    this.expandedMode = (_a = opts == null ? void 0 : opts.expandedMode) != null ? _a : "manual";
    this.viewportEl = host.createDiv({ cls: "zettel-outline__tree-viewport" });
    this.spacerEl = this.viewportEl.createDiv({ cls: "zettel-outline__tree-spacer" });
    this.viewportEl.addEventListener("scroll", () => this.renderWindow());
    if (this.forest) {
      this.viewportEl.setAttribute("tabindex", "0");
      this.viewportEl.setAttribute("role", "tree");
      this.panelLabel = host.createDiv({ text: t(this.indexService.deps.app, "view.title"), attr: { id: `zettel-outline-label-${++panelLabelSequence}`, hidden: "" } });
      this.viewportEl.setAttribute("aria-labelledby", this.panelLabel.id);
      if (this.viewportEl.ownerDocument) this.releaseDrag = bindBranchDrag(this, (id, parent) => this.moveBranchTo(id, parent), "", (target) => {
        const app = this.indexService.deps.app;
        const node = this.listIndex?.idIndex.get(target.id);
        return t(app, `move.drop.${target.where}`, { title: node?.title || target.id });
      });
      this.releaseKeys = captureOutlineKeys(this.viewportEl, (event) => this.onKeyDown(event), () => this.indexService.getSettings());
      this.viewportEl.addEventListener("keydown", (event) => this.onKeyDown(event));
      this.viewportEl.addEventListener("focus", () => {
        if (!this.selectedId) this.selectRow(this.activeId ?? this.visible[0]?.idKey);
      });
    }
  }
  destroy() {
    this.releaseKeys?.();
    this.releaseDrag?.();
    this.panelLabel?.remove();
    this.buildToken += 1;
    if (this.pendingBuildTimer) window.clearTimeout(this.pendingBuildTimer);
    this.viewportEl.remove();
  }
  setRoot(rootKey) {
    if (this.rootKey === rootKey) return;
    this.rootKey = rootKey;
    this.buildToken += 1;
    if (this.pendingBuildTimer) {
      window.clearTimeout(this.pendingBuildTimer);
      this.pendingBuildTimer = null;
    }
    this.isBuilding = false;
    this.pendingScrollToActive = false;
    this.visible = [];
    this.viewportEl.scrollTop = 0;
  }
  setActive(idKey) {
    if (this.forest && idKey && idKey !== this.activeId) {
      const node = this.indexService.getIndex()?.idIndex.get(idKey);
      if (node) for (let i = 1; i < node.segments.length; i++) this.expanded.add(node.segments.slice(0, i).join(this.indexService.getSettings().idSegmentDelimiter));
    }
    const previousActive = this.activeId;
    this.activeId = this.forest && idKey ? this.indexService.getIndex()?.idIndex.get(idKey)?.segments.join(this.indexService.getSettings().idSegmentDelimiter) ?? idKey : idKey;
    if (this.forest && this.activeId && this.activeId !== previousActive) this.selectedId = this.activeId;
    if (idKey) this.pendingScrollToActive = true;
  }
  selectRow(idKey) {
    if (!idKey) return;
    this.selectedId = idKey;
    const position = this.visible.findIndex((row) => row.idKey === idKey);
    if (position >= 0) {
      const height = this.indexService.getSettings().rowHeightPx;
      const top = position * height;
      const viewport = this.viewportEl;
      if (top < viewport.scrollTop) viewport.scrollTop = top;
      else if (top + height > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = Math.max(0, top + height - viewport.clientHeight);
    }
    this.renderWindow();
  }
  async onKeyDown(event) {
    if (!this.forest || event.target !== this.viewportEl || event.isComposing) return;
    const action = shortcutAction(event, this.indexService.getSettings());
    if (!action) return;
    if (["undo", "redo", "redoAlt"].includes(action)) {
      event.preventDefault();
      event.stopPropagation();
      try {
        const history = historyFor(this.indexService);
        const command = await (action === "undo" ? history.undo() : history.redo());
        if (command) {
          const id = action === "undo" ? command.beforeSelection ?? command.selection : command.afterSelection ?? command.selection;
          this.revealSelection(id);
        }
      } catch (error) {
        new import_obsidian6.Notice(t(this.indexService.deps.app, error.message));
      }
      return;
    }
    if (["help", "history", "newRoot", "expandAll", "collapseAll"].includes(action)) {
      event.preventDefault();
      event.stopPropagation();
      const app = this.indexService.deps.app;
      if (event.repeat) return;
      if (action === "help") new ShortcutHelpModal(app, this.indexService).open();
      else if (action === "history") new StructureHistoryModal(app, this.indexService).open();
      else if (action === "newRoot") {
        if (!event.repeat) openNoteCreation(app, this.indexService, "root");
      } else {
        this.expanded = action === "expandAll" ? new Set(this.listIndex?.idIndex.keys() ?? []) : /* @__PURE__ */ new Set();
        this.pendingScrollToActive = false;
        this.refresh();
      }
      return;
    }
    if (!this.visible.length) return;
    event.preventDefault();
    event.stopPropagation();
    let position = this.visible.findIndex((row2) => row2.idKey === this.selectedId);
    if (position < 0) {
      this.selectRow(this.visible[0].idKey);
      return;
    }
    const row = this.visible[position];
    if (action === "moveUp" || action === "moveDown") {
      const node = this.listIndex.idIndex.get(row.idKey);
      const siblings = node.segments.length === 1 ? this.listIndex.roots : this.listIndex.childrenIndex.get(node.segments.slice(0, -1).join(this.indexService.getSettings().idSegmentDelimiter));
      const index = siblings.indexOf(row.idKey), other = siblings[index + (action === "moveUp" ? -1 : 1)];
      if (other) await this.moveBranchTo(row.idKey, { target: other, where: action === "moveUp" ? "before" : "after" });
    } else if (action === "indent" || action === "outdent") {
      try {
        const command = makeMoveCommand(this.indexService.deps.app, this.indexService, row.idKey, action);
        if (command) {
          await historyFor(this.indexService).execute(command);
          this.revealSelection(command.afterSelection);
        }
      } catch (error) {
        new import_obsidian6.Notice(t(this.indexService.deps.app, error.message));
      }
    } else if (["newSibling", "newChild", "newParent", "deleteFile"].includes(action)) {
      if (event.repeat || this.indexService.editBatch || this.indexService.editHistory?.busy) return;
      const node = this.listIndex?.idIndex.get(row.idKey);
      if (!node) return;
      const app = this.indexService.deps.app;
      if (action === "deleteFile") {
        if (node.filePath) await deleteNoteFile(app, this.indexService, node.filePath);
      } else openNoteCreation(app, this.indexService, action === "newSibling" ? "sibling" : action === "newParent" ? "parent" : "child", node);
    } else if (action === "rename") this.startRename(row.idKey);
    else if (action === "up") this.selectRow(this.visible[Math.max(0, position - 1)].idKey);
    else if (action === "down") this.selectRow(this.visible[Math.min(this.visible.length - 1, position + 1)].idKey);
    else if (action === "first") this.selectRow(this.visible[0].idKey);
    else if (action === "last") this.selectRow(this.visible.at(-1).idKey);
    else if (action === "right") {
      if (row.hasChildren && !this.expanded.has(row.idKey)) {
        this.expanded.add(row.idKey);
        this.pendingScrollToActive = false;
        this.refresh();
      } else if (row.hasChildren && this.visible[position + 1]) this.selectRow(this.visible[position + 1].idKey);
    } else if (action === "left") {
      if (row.hasChildren && this.expanded.has(row.idKey)) {
        this.expanded.delete(row.idKey);
        this.pendingScrollToActive = false;
        this.refresh();
      } else for (let i = position - 1; i >= 0; i--) if (this.visible[i].depth < row.depth) {
        this.selectRow(this.visible[i].idKey);
        break;
      }
    } else if (action === "open") {
      const node = this.listIndex?.idIndex.get(row.idKey);
      if (node?.filePath) {
        await this.indexService.openFileByPath(node.filePath, { newTab: false });
        if (this.viewportEl.isConnected) this.viewportEl.focus({ preventScroll: true });
      } else if (node) openNoteCreation(this.indexService.deps.app, this.indexService, "fill", node);
    }
  }
  async moveBranchTo(id, parent) {
    try {
      const command = parent && !Array.isArray(parent) ? makePositionCommand(this.indexService.deps.app, this.indexService, id, parent.target, parent.where) : makeMoveCommand(this.indexService.deps.app, this.indexService, id, parent);
      if (!command) return;
      await historyFor(this.indexService).execute(command);
      this.revealSelection(command.afterSelection);
    } catch (error) {
      new import_obsidian6.Notice(t(this.indexService.deps.app, error.message));
    }
  }
  revealSelection(id) {
    if (!id) {
      this.refresh();
      return;
    }
    const parts = id.split(this.indexService.getSettings().idSegmentDelimiter);
    for (let i = 1; i < parts.length; i++) this.expanded.add(parts.slice(0, i).join(this.indexService.getSettings().idSegmentDelimiter));
    this.selectedId = id;
    this.pendingScrollToActive = false;
    this.refresh();
    this.selectRow(id);
    if (this.viewportEl.isConnected) this.viewportEl.focus({ preventScroll: true });
  }
  startRename(id) {
    if (this.editing) return;
    const node = this.listIndex?.idIndex.get(id);
    if (!node) return;
    const app = this.indexService.deps.app;
    if (!node.filePath) {
      openNoteCreation(app, this.indexService, "fill", node);
      return;
    }
    this.editing = { id, path: node.filePath, title: node.title };
    this.renderWindow();
    this.renameInput?.focus();
    this.renameInput?.select();
  }
  async finishRename(commit) {
    const edit = this.editing;
    if (!edit || edit.busy) return;
    if (!commit) {
      this.editing = null;
      this.renderWindow();
      this.viewportEl.focus();
      return;
    }
    edit.busy = true;
    if (this.renameInput) this.renameInput.disabled = true;
    try {
      const app = this.indexService.deps.app;
      const command = makeRenameCommand(app, this.indexService, edit.path, edit.title, edit.id);
      if (command) await historyFor(this.indexService).execute(command);
      this.editing = null;
      this.refresh();
      this.viewportEl.focus({ preventScroll: true });
    } catch (error) {
      this.renameInput?.remove();
      edit.busy = false;
      new import_obsidian6.Notice(t(this.indexService.deps.app, error.message));
      this.renderWindow();
      this.renameInput?.focus();
    }
  }
  refresh() {
    this.computeVisibleRowsChunked();
  }
  scrollToActive() {
    if (!this.activeId) return;
    this.pendingScrollToActive = true;
    if (this.tryScrollToActive()) this.pendingScrollToActive = false;
  }
  tryScrollToActive() {
    if (!this.activeId) return false;
    const idx = this.visible.findIndex((r) => r.idKey === this.activeId);
    if (idx < 0) return false;
    const h = this.indexService.getSettings().rowHeightPx;
    const top = idx * h;
    const viewport = this.viewportEl;
    if (viewport.clientHeight <= 0) return false;
    if (top < viewport.scrollTop) viewport.scrollTop = top;
    else if (top + h > viewport.scrollTop + viewport.clientHeight) {
      viewport.scrollTop = Math.max(0, top + h - viewport.clientHeight);
    }
    return true;
  }
  computeVisibleRowsChunked() {
    const sourceIndex = this.indexService.getIndex();
    const index = this.forest && sourceIndex ? buildListIndex(sourceIndex, this.indexService.getSettings().idSegmentDelimiter) : sourceIndex;
    this.listIndex = this.forest ? index : null;
    const viewState = this.indexService.getViewState();
    if (!index || !this.forest && !this.rootKey) {
      this.visible = [];
      this.renderWindow(true);
      return;
    }
    const rootNode = index.idIndex.get(this.rootKey);
    if (!this.forest && !rootNode) {
      this.visible = [];
      this.renderWindow(true);
      return;
    }
    const token = this.buildToken += 1;
    if (this.pendingBuildTimer) window.clearTimeout(this.pendingBuildTimer);
    this.isBuilding = true;
    const expanded = this.forest ? this.expanded : viewState.expandedNodes;
    const rows = [];
    const stack = this.forest ? [...index.roots].reverse().map((idKey) => ({ idKey, depth: 0 })) : [{ idKey: this.rootKey, depth: 0 }];
    const timeBudgetMs = 8;
    const step = () => {
      var _a, _b, _c, _d, _e, _f;
      if (token !== this.buildToken) return;
      const start = (_c = (_b = (_a = globalThis.performance) == null ? void 0 : _a.now) == null ? void 0 : _b.call(_a)) != null ? _c : Date.now();
      while (stack.length) {
        const item = stack.pop();
        const children = this.forest ? index.childrenIndex.get(item.idKey) ?? [] : this.indexService.getChildrenForRender(item.idKey, this.rootKey);
        rows.push({ idKey: item.idKey, depth: item.depth, hasChildren: children.length > 0 });
        const isExpanded = !this.forest && (item.idKey === this.rootKey || this.expandedMode === "all") || expanded.has(item.idKey);
        if (isExpanded) {
          for (let i = children.length - 1; i >= 0; i--) {
            stack.push({ idKey: children[i], depth: item.depth + 1 });
          }
        }
        const now = (_f = (_e = (_d = globalThis.performance) == null ? void 0 : _d.now) == null ? void 0 : _e.call(_d)) != null ? _f : Date.now();
        if (now - start > timeBudgetMs) break;
      }
      if (token !== this.buildToken) return;
      this.visible = rows;
      if (this.forest && !stack.length && !rows.some((row) => row.idKey === this.selectedId)) {
        const segments = this.listIndex.idIndex.get(this.selectedId)?.segments ?? [];
        this.selectedId = rows.findLast((row) => {
          const candidate = this.listIndex.idIndex.get(row.idKey)?.segments ?? [];
          return candidate.length < segments.length && candidate.every((part, i) => part === segments[i]);
        })?.idKey ?? rows[0]?.idKey ?? null;
      }
      this.renderWindow(true);
      if (this.pendingScrollToActive && this.tryScrollToActive()) this.pendingScrollToActive = false;
      if (stack.length) {
        this.pendingBuildTimer = window.setTimeout(step, 0);
        return;
      }
      this.pendingBuildTimer = null;
      this.isBuilding = false;
    };
    step();
  }
  renderWindow(force = false) {
    const index = this.forest ? this.listIndex : this.indexService.getIndex();
    const viewState = this.indexService.getViewState();
    if (!index) return;
    const settings = this.indexService.getSettings();
    const rowHeight = settings.rowHeightPx;
    const overscan = settings.overscanRows;
    const viewportHeight = this.viewportEl.clientHeight || 1;
    const scrollTop = this.viewportEl.scrollTop;
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
    const endRow = Math.min(this.visible.length, Math.ceil((scrollTop + viewportHeight) / rowHeight) + overscan);
    this.spacerEl.style.height = `${this.visible.length * rowHeight}px`;
    if (this.editing && this.renameInput?.isConnected) return;
    this.spacerEl.empty();
    for (let i = startRow; i < endRow; i++) {
      const r = this.visible[i];
      const node = index.idIndex.get(r.idKey);
      if (!node) continue;
      const rowEl = this.spacerEl.createDiv({ cls: "zettel-outline__tree-row" });
      const listStyle = settings.outlineStyle === "list";
      if (listStyle) rowEl.style.paddingLeft = `calc(var(--zettel-outline-list-start, 1em) + ${r.depth} * var(--zettel-outline-list-indent, 2em))`;
      if (this.forest) {
        for (let level = 0; level < r.depth; level++) {
          const guide = rowEl.createDiv({ cls: "zettel-outline__indent-guide" });
          guide.style.left = `calc(var(--zettel-outline-list-start, 1em) + ${level} * var(--zettel-outline-list-indent, 2em) + var(--zettel-outline-guide-offset, 0.5em))`;
        }
      }
      const addToggle = (anchor) => {
        const toggle = anchor.createEl("button", { cls: "zettel-outline__branch-toggle", text: r.hasChildren ? this.expanded.has(r.idKey) ? "\u25BE" : "\u25B8" : "" });
        if (!listStyle) toggle.style.left = `calc(-2px + ${r.depth} * var(--zettel-outline-list-indent, 2em))`;
        if (r.hasChildren) (0, import_obsidian6.setIcon)(toggle, this.expanded.has(r.idKey) ? "chevron-down" : "chevron-right");
        toggle.disabled = !r.hasChildren;
        if (r.hasChildren && !this.expanded.has(r.idKey)) toggle.addClass("is-collapsed");
        toggle.setAttribute("aria-label", node.title);
        if (r.hasChildren) toggle.setAttribute("aria-expanded", String(this.expanded.has(r.idKey)));
        toggle.onclick = (event) => {
          event.stopPropagation();
          if (this.expanded.has(r.idKey)) this.expanded.delete(r.idKey);
          else this.expanded.add(r.idKey);
          this.pendingScrollToActive = false;
          this.refresh();
        };
      };
      if (this.forest && !listStyle) addToggle(rowEl);
      rowEl.style.top = `${i * rowHeight}px`;
      rowEl.style.height = `${rowHeight}px`;
      if (this.activeId && this.activeId === r.idKey) rowEl.addClass("is-active");
      if (this.forest) {
        rowEl.draggable = false;
        rowEl.setAttribute("data-outline-id", r.idKey);
        rowEl.id = `zettel-outline-row-${encodeURIComponent(r.idKey)}`;
        rowEl.setAttribute("role", "treeitem");
        rowEl.setAttribute("aria-level", String(r.depth + 1));
        rowEl.setAttribute("aria-selected", String(this.selectedId === r.idKey));
        if (r.hasChildren) rowEl.setAttribute("aria-expanded", String(this.expanded.has(r.idKey)));
        if (this.selectedId === r.idKey) {
          rowEl.addClass("is-selected");
          this.viewportEl.setAttribute("aria-activedescendant", rowEl.id);
        }
      }
      if (r.depth === 1) rowEl.addClass("is-level1");
      if (this.rootKey && node.idKey === this.rootKey) {
        rowEl.addClass("is-root");
      }
      if (listStyle || node.idKey !== this.rootKey) {
        const number = rowEl.createDiv({ cls: "zettel-outline__tree-number" });
        const parts = node.segments.slice(1);
        const text = listStyle ? `${node.segments.at(-1)}.` : parts.length === 1 ? `${parts[0]}.` : parts.join(".");
        number.setText(text);
        if (this.forest && listStyle) addToggle(number);
      }
      const title = rowEl.createDiv({ cls: "zettel-outline__tree-title" });
      title.setText(node.title);
      if (this.editing?.id === r.idKey) {
        title.empty();
        const input = title.createEl("input", { cls: "zettel-outline__rename-input", attr: { type: "text", "aria-label": t(this.indexService.deps.app, "create.title") } });
        this.renameInput = input;
        input.value = this.editing.title;
        input.disabled = !!this.editing.busy;
        input.addEventListener("input", () => {
          if (this.editing) this.editing.title = input.value;
        });
        input.addEventListener("click", (event) => event.stopPropagation());
        input.addEventListener("keydown", (event) => {
          event.stopPropagation();
          if (event.isComposing) return;
          if (event.key === "Enter" || event.key === "Escape") {
            event.preventDefault();
            this.finishRename(event.key === "Enter");
          }
        });
        input.addEventListener("blur", () => {
          if (this.editing && !this.editing.busy) this.finishRename(false);
        });
      }
      if (this.forest) {
        if (!node.filePath) {
          const add = title.createEl("button", { cls: "clickable-icon zettel-outline__create-missing", attr: { "aria-label": t(this.indexService.deps.app, "create.fill"), title: t(this.indexService.deps.app, "create.fill") } });
          (0, import_obsidian6.setIcon)(add, "circle-plus");
          add.onclick = (event) => {
            event.stopPropagation();
            openNoteCreation(this.indexService.deps.app, this.indexService, "fill", node);
          };
        }
        const showMenu = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const menu = new import_obsidian6.Menu();
          for (const mode of ["sibling", "child", "parent"]) menu.addItem((item) => item.setTitle(t(this.indexService.deps.app, `create.${mode}`)).setIcon("plus").onClick(() => openNoteCreation(this.indexService.deps.app, this.indexService, mode, node)));
          if (node.filePath) {
            menu.addSeparator();
            menu.addItem((item) => item.setTitle(t(this.indexService.deps.app, "delete.file")).setIcon("trash-2").onClick(() => deleteNoteFile(this.indexService.deps.app, this.indexService, node.filePath)));
          }
          menu.showAtMouseEvent(event);
        };
        rowEl.oncontextmenu = showMenu;
        const more = rowEl.createEl("button", { cls: "clickable-icon zettel-outline__row-menu", attr: { "aria-label": t(this.indexService.deps.app, "create.menu") } });
        (0, import_obsidian6.setIcon)(more, "ellipsis");
        more.onclick = showMenu;
      }
      rowEl.onclick = async (ev) => {
        if (this.forest) {
          this.selectedId = r.idKey;
          this.viewportEl.focus?.({ preventScroll: true });
        }
        if (!node.filePath) return;
        const mouse = ev;
        const newTab = mouse.metaKey || mouse.ctrlKey;
        await this.indexService.openFileByPath(node.filePath, { newTab });
        if (this.forest && !newTab && this.viewportEl.isConnected) this.viewportEl.focus({ preventScroll: true });
      };
    }
    if (this.pendingScrollToActive && this.tryScrollToActive()) this.pendingScrollToActive = false;
  }
};

// src/view/OutlineView.js
(0, import_obsidian7.addIcon)("zettel-outline-expand-all", '<path d="M18 16H82M18 84H82M50 42V25M40 35L50 25L60 35M50 58V75M40 65L50 75L60 65" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');
(0, import_obsidian7.addIcon)("zettel-outline-collapse-all", '<path d="M18 50H82" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M50 10V34M40 24L50 34L60 24M50 90V66M40 76L50 66L60 76" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');
var VIEW_TYPE_ZETTEL_OUTLINE = "zettel-outline-view";
var OutlineView = class extends import_obsidian7.ItemView {
  constructor(leaf, indexService) {
    super(leaf);
    this.rootEl = null;
    this.rootsEl = null;
    this.treeEl = null;
    this.virtualTree = null;
    this.virtualTreeRootKey = null;
    this.rootsCollapsed = false;
    this.indexService = indexService;
  }
  getViewType() {
    return VIEW_TYPE_ZETTEL_OUTLINE;
  }
  getDisplayText() {
    return t(this.app, "view.title");
  }
  getIcon() {
    return "list-tree";
  }
  async onOpen() {
    const container = this.containerEl.children[1];
    container.empty();
    container.addClass("zettel-outline");
    this.rootEl = container;
    this.rootsEl = container.createDiv({ cls: "zettel-outline__roots" });
    this.treeEl = container.createDiv({ cls: "zettel-outline__tree" });
    this.refresh();
  }
  focusKeyboard() {
    if (this.indexService.getSettings().outlineStyle !== "list") {
      new import_obsidian7.Notice(t(this.app, "command.focusNeedsList"));
      return;
    }
    if (!this.virtualTree?.forest) this.refresh();
    const tree = this.virtualTree;
    if (!tree?.forest) return;
    if (tree.editing && tree.renameInput) {
      tree.renameInput.focus();
      return;
    }
    tree.viewportEl.focus({ preventScroll: true });
    const id = tree.visible.some((row) => row.idKey === tree.selectedId) ? tree.selectedId : tree.visible.some((row) => row.idKey === tree.activeId) ? tree.activeId : tree.visible[0]?.idKey;
    if (id) tree.selectRow(id);
  }
  async onClose() {
    var _a;
    (_a = this.virtualTree) == null ? void 0 : _a.destroy();
    this.virtualTree = null;
    this.virtualTreeRootKey = null;
  }
  refresh() {
    var _a, _b, _c, _d, _e;
    if (!this.rootsEl || !this.treeEl) return;
    if (this.rootEl) {
      const settings = this.indexService.getSettings();
      this.rootEl.classList.toggle("zettel-outline--list", settings.outlineStyle === "list");
      const rootTitleColor = ((_a = settings.treeRootTitleColor) != null ? _a : "").trim();
      const level1Color = ((_b = settings.treeLevel1TitleColor) != null ? _b : "").trim();
      this.rootEl.style.setProperty("--zettel-outline-row-height", `${settings.rowHeightPx}px`);
      if (rootTitleColor) this.rootEl.style.setProperty("--zettel-outline-root-title-color", rootTitleColor);
      else this.rootEl.style.removeProperty("--zettel-outline-root-title-color");
      if (level1Color) this.rootEl.style.setProperty("--zettel-outline-level1-title-color", level1Color);
      else this.rootEl.style.removeProperty("--zettel-outline-level1-title-color");
    }
    if (this.indexService.getSettings().outlineStyle === "list") {
      this.renderList();
      return;
    }
    this.rootsEl.removeClass("zettel-outline__list-toolbar");
    if (this.virtualTree?.forest) {
      this.virtualTree.destroy();
      this.virtualTree = null;
      this.virtualTreeRootKey = null;
    }
    const index = this.indexService.getIndex();
    const viewState = this.indexService.getViewState();
    this.rootsEl.empty();
    const header = this.rootsEl.createDiv({ cls: "zettel-outline__roots-header" });
    const headerCaret = header.createDiv({ cls: "zettel-outline__roots-header-caret" });
    (0, import_obsidian7.setIcon)(headerCaret, this.rootsCollapsed ? "chevron-right" : "chevron-down");
    headerCaret.onclick = (ev) => {
      ev.stopPropagation();
      this.rootsCollapsed = !this.rootsCollapsed;
      this.refresh();
    };
    const headerText = header.createDiv({ cls: "zettel-outline__roots-header-text" });
    headerText.setText(t(this.app, "roots.header", { count: (_c = index == null ? void 0 : index.roots.length) != null ? _c : 0 }));
    if (this.indexService.isRebuilding() && !(index == null ? void 0 : index.stale)) {
      this.rootsEl.createDiv({ cls: "zettel-outline__stale", text: t(this.app, "tree.loading") });
    }
    if (index == null ? void 0 : index.stale) {
      this.rootsEl.createDiv({ cls: "zettel-outline__stale", text: t(this.app, "roots.stale") });
    }
    if (!this.rootsCollapsed && index) {
      for (const rootKey of index.roots) {
        const meta = index.rootMeta.get(rootKey);
        const row = this.rootsEl.createDiv({ cls: "zettel-outline__root-row" });
        if (viewState.activeRootKey === rootKey) row.addClass("is-active");
        const left = row.createDiv({ cls: "zettel-outline__root-left" });
        const count = (_d = meta == null ? void 0 : meta.count) != null ? _d : 0;
        const title = (_e = meta == null ? void 0 : meta.title) != null ? _e : rootKey;
        left.createSpan({ cls: "zettel-outline__root-count", text: String(count) });
        const titleEl = left.createSpan({ cls: "zettel-outline__root-title", text: title });
        titleEl.title = title;
        const right = row.createDiv({ cls: "zettel-outline__root-right" });
        right.setText(rootKey);
        row.onclick = (ev) => this.onRootRowClick(rootKey, ev);
      }
    }
    this.renderTree();
  }
  renderList() {
    const index = this.indexService.getIndex();
    this.rootsEl.empty();
    this.rootsEl.addClass("zettel-outline__list-toolbar");
    if (!this.virtualTree?.forest) {
      this.virtualTree?.destroy();
      this.treeEl.empty();
      this.virtualTree = new VirtualTree(this.treeEl, this.indexService, { forest: true });
      this.virtualTreeRootKey = null;
    }
    const history = this.rootsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t(this.app, "archive.open"), title: t(this.app, "archive.open") } });
    (0, import_obsidian7.setIcon)(history, "history");
    history.onclick = () => new StructureHistoryModal(this.app, this.indexService).open();
    const rebuild = this.rootsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t(this.app, "settings.rebuild.name"), title: t(this.app, "settings.rebuild.name") } });
    (0, import_obsidian7.setIcon)(rebuild, "refresh-cw");
    rebuild.disabled = this.indexService.isRebuilding() || !!this.indexService.editBatch || !!this.indexService.editHistory?.busy;
    rebuild.onclick = async () => {
      if (this.indexService.isRebuilding() || this.indexService.editBatch || this.indexService.editHistory?.busy) return;
      rebuild.disabled = true;
      try {
        await this.indexService.rebuild({ reason: "manual" });
      } catch (error) {
        new import_obsidian7.Notice(t(this.app, "settings.example.rebuildFailed"));
        console.error("Zettel Outline: rebuild failed", error);
      } finally {
        this.refresh();
      }
    };
    const add = this.rootsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t(this.app, "create.root"), title: t(this.app, "create.root") } });
    (0, import_obsidian7.setIcon)(add, "circle-plus");
    add.onclick = () => openNoteCreation(this.app, this.indexService, "root");
    for (const [icon, key, expand] of [["zettel-outline-expand-all", "tree.expandAll", true], ["zettel-outline-collapse-all", "tree.collapseAll", false]]) {
      const button = this.rootsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t(this.app, key), title: t(this.app, key) } });
      (0, import_obsidian7.setIcon)(button, icon);
      button.disabled = !index || index.stale;
      button.onclick = () => {
        this.virtualTree.expanded = expand ? new Set(this.virtualTree.listIndex?.idIndex.keys() ?? []) : /* @__PURE__ */ new Set();
        this.virtualTree.pendingScrollToActive = false;
        this.virtualTree.refresh();
      };
    }
    if (!index || index.stale) {
      this.virtualTree.destroy();
      this.virtualTree = null;
      this.treeEl.createDiv({ cls: "zettel-outline__tree-empty", text: t(this.app, index ? "tree.stale" : "tree.loading") });
      return;
    }
    const active = this.indexService.getViewState().activeIdKey;
    const changed = active !== this.virtualTree.activeId;
    this.virtualTree.setActive(active);
    if (!changed) this.virtualTree.pendingScrollToActive = false;
    this.virtualTree.refresh();
  }
  onRootRowClick(rootKey, ev) {
    const index = this.indexService.getIndex();
    if (!index) return;
    if (index.stale) {
      return;
    }
    const meta = index.rootMeta.get(rootKey);
    const rootFilePath = meta == null ? void 0 : meta.rootFilePath;
    if (!rootFilePath) {
      new import_obsidian7.Notice(t(this.app, "notice.rootFileMissing", { rootKey }));
      return;
    }
    const newTab = ev.metaKey || ev.ctrlKey;
    void this.indexService.openFileByPath(rootFilePath, { newTab });
  }
  renderTree() {
    var _a, _b, _c, _d;
    if (!this.treeEl) return;
    const index = this.indexService.getIndex();
    const viewState = this.indexService.getViewState();
    if (!index) {
      (_a = this.virtualTree) == null ? void 0 : _a.destroy();
      this.virtualTree = null;
      this.virtualTreeRootKey = null;
      this.treeEl.empty();
      this.treeEl.createDiv({ cls: "zettel-outline__tree-empty", text: t(this.app, "tree.loading") });
      return;
    }
    if (index.stale) {
      (_b = this.virtualTree) == null ? void 0 : _b.destroy();
      this.virtualTree = null;
      this.virtualTreeRootKey = null;
      this.treeEl.empty();
      this.treeEl.createDiv({ cls: "zettel-outline__tree-empty", text: t(this.app, "tree.stale") });
      return;
    }
    if (viewState.activeRootKey && viewState.activeIdKey) {
      if (viewState.expandedRootKey !== viewState.activeRootKey) {
        this.indexService.setExpandedRoot(viewState.activeRootKey);
      }
      this.indexService.ensureVisible(viewState.activeIdKey);
    } else if (viewState.expandedRootKey) {
      this.indexService.setExpandedRoot(null);
    }
    const viewState2 = this.indexService.getViewState();
    if (!viewState2.expandedRootKey) {
      (_c = this.virtualTree) == null ? void 0 : _c.destroy();
      this.virtualTree = null;
      this.virtualTreeRootKey = null;
      this.treeEl.empty();
      this.treeEl.createDiv({ cls: "zettel-outline__tree-empty", text: t(this.app, "tree.hint.collapsed") });
      if (viewState2.activeFilePath && !viewState2.activeIdKey) {
        this.treeEl.createDiv({
          cls: "zettel-outline__tree-empty zettel-outline__tree-empty--secondary",
          text: t(this.app, "tree.hint.fileNotInIndex")
        });
      }
      return;
    }
    if (this.virtualTree && this.virtualTreeRootKey !== viewState2.expandedRootKey) {
      this.virtualTree.destroy();
      this.virtualTree = null;
      this.virtualTreeRootKey = null;
    }
    if (!this.virtualTree) {
      this.treeEl.empty();
      this.virtualTree = new VirtualTree(this.treeEl, this.indexService, { expandedMode: "all" });
      this.virtualTreeRootKey = viewState2.expandedRootKey;
    }
    this.virtualTree.setRoot(viewState2.expandedRootKey);
    const activeId = viewState2.activeIdKey && ((_d = index.idIndex.get(viewState2.activeIdKey)) == null ? void 0 : _d.rootKey) === viewState2.expandedRootKey ? viewState2.activeIdKey : null;
    this.virtualTree.setActive(activeId);
    this.virtualTree.refresh();
    if (activeId) this.virtualTree.scrollToActive();
  }
};

// src/settings/Settings.js
var defaultSettings = {
  idPosition: "suffix",
  idSegmentDelimiter: "-",
  titleDelimiter: "+",
  allowTrimAroundDelimiter: false,
  requireManualRebuildOnRuleChange: true,
  trustCacheOnStartup: true,
  showIgnoredSummaryNotice: true,
  debounceMs: 150,
  saveDebounceMs: 2e3,
  rowHeightPx: 22,
  outlineStyle: "classic",
  excludedFolders: [],
  excludeDateIds: false,
  overscanRows: 8,
  enableProfiler: false,
  treeRootTitleColor: "",
  treeLevel1TitleColor: ""
};

// src/main.js
var ZettelOutlinePlugin = class extends import_obsidian8.Plugin {
  constructor() {
    super(...arguments);
    this.settingsTab = null;
  }
  async onload() {
    var _a;
    const data = await this.loadData();
    const storedSettings = (_a = data == null ? void 0 : data.settings) != null ? _a : data && !("version" in data) ? data : null;
    this.settings = Object.assign({}, defaultSettings, storedSettings != null ? storedSettings : {});
    this.settings.requireManualRebuildOnRuleChange = true;
    const legacyTreeTitleColor = storedSettings == null ? void 0 : storedSettings.treeTitleColor;
    if (!this.settings.treeRootTitleColor && typeof legacyTreeTitleColor === "string" && legacyTreeTitleColor.trim()) {
      this.settings.treeRootTitleColor = legacyTreeTitleColor.trim();
    }
    if (typeof legacyTreeTitleColor === "string") {
      delete this.settings.treeTitleColor;
      await this.saveData({ ...data != null ? data : {}, settings: this.settings });
    }
    this.indexService = new IndexService({
      app: this.app,
      loadCache: async () => {
        var _a2;
        const d = await this.loadData();
        const cache = (_a2 = d == null ? void 0 : d.cache) != null ? _a2 : d && (d.version === 1 || d.version === 2) ? d : null;
        return cache;
      },
      saveCache: async (cache) => {
        var _a2;
        const d = (_a2 = await this.loadData()) != null ? _a2 : {};
        const next = { ...d, settings: this.settings, cache };
        await this.saveData(next);
      },
      settings: () => this.settings,
      onIndexUpdated: () => this.refreshViews(),
      onNotices: (messages) => messages.forEach((m) => new import_obsidian8.Notice(m))
    });
    const historyPath = (this.manifest.dir || `${this.app.vault.configDir}/plugins/${this.manifest.id}`) + "/history.json";
    this.indexService.structureArchive = new StructureArchive(this.app, this.indexService, historyPath, (error) => {
      console.error("Zettel Outline: structure history", error);
      new import_obsidian8.Notice(t(this.app, "archive.storageError"));
    });
    this.registerView(VIEW_TYPE_ZETTEL_OUTLINE, (leaf) => new OutlineView(leaf, this.indexService));
    this.addCommand({
      id: "focus-zettel-outline",
      name: t(this.app, "command.open"),
      callback: () => this.focusOutline()
    });
    this.addCommand({ id: "show-structure-history", name: t(this.app, "archive.open"), callback: () => new StructureHistoryModal(this.app, this.indexService).open() });
    this.addRibbonIcon("list-tree", t(this.app, "ribbon.tooltip"), () => this.focusOutline());
    this.settingsTab = new ZettelOutlineSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    await this.indexService.initialize();
    try {
      await this.indexService.structureArchive.load();
    } catch (error) {
      this.indexService.structureArchive.disabled = true;
      console.error(error);
      new import_obsidian8.Notice(t(this.app, "archive.storageError"));
    }
    this.registerEvent(this.app.vault.on("create", (file) => this.indexService.onCreate(file)));
    this.registerEvent(this.app.vault.on("delete", (file) => {
      this.indexService.structureArchive.changed(file, file.path, true);
      this.indexService.onDelete(file);
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
      this.indexService.structureArchive.changed(file, oldPath);
      this.indexService.onRename(file, oldPath);
    }));
    this.registerEvent(
      this.app.workspace.on("file-open", (file) => {
        this.indexService.onFileOpen(file);
        this.refreshViews();
      })
    );
    this.registerEvent(
      this.app.workspace.on("active-leaf-change", (leaf) => {
        this.indexService.setLastMarkdownLeaf(leaf);
      })
    );
  }
  onunload() {
    void this.indexService.structureArchive?.close().catch((error) => console.error(error));
    void this.indexService.shutdown();
    this.app.workspace.detachLeavesOfType(VIEW_TYPE_ZETTEL_OUTLINE);
  }
  async saveSettings() {
    var _a;
    const d = (_a = await this.loadData()) != null ? _a : {};
    await this.saveData({ ...d, settings: this.settings });
    await this.indexService.onSettingsChanged();
    this.refreshViews();
  }
  async activateView() {
    var _a, _b, _c, _d, _e, _f;
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZETTEL_OUTLINE);
    if (leaves.length > 0) {
      this.app.workspace.revealLeaf(leaves[0]);
      return;
    }
    const isMobile = import_obsidian8.Platform.isMobileApp;
    const leaf = isMobile ? (_c = (_b = (_a = this.app.workspace).getRightLeaf) == null ? void 0 : _b.call(_a, false)) != null ? _c : this.app.workspace.getLeaf(true) : (_f = (_e = (_d = this.app.workspace).getRightLeaf) == null ? void 0 : _e.call(_d, false)) != null ? _f : this.app.workspace.getLeaf("tab");
    await (leaf == null ? void 0 : leaf.setViewState({ type: VIEW_TYPE_ZETTEL_OUTLINE, active: true }));
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }
  async focusOutline() {
    await this.activateView();
    const leaf = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZETTEL_OUTLINE)[0];
    if (!leaf) return;
    await this.app.workspace.revealLeaf(leaf);
    leaf.view.focusKeyboard?.();
  }
  refreshViews() {
    if (this.indexService?.editBatch) return;
    this.settingsTab?.updateExample?.();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZETTEL_OUTLINE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof OutlineView) view.refresh();
    }
  }
};
var ZettelOutlineSettingTab = class extends import_obsidian8.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.lastRuleHash = null;
    this.sectionOpen = {
      rules: true,
      ui: false,
      index: false,
      advanced: false
    };
    this.plugin = plugin;
  }
  hide() {
    this.shortcutCaptureCleanup?.();
  }
  display() {
    this.shortcutCaptureCleanup?.();
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h2", { text: t(this.app, "settings.title") });
    const createSection = (key, title, opts) => {
      const details = containerEl.createEl("details", { cls: "zettel-outline-settings__section" });
      if (this.sectionOpen[key] === void 0) this.sectionOpen[key] = !!(opts == null ? void 0 : opts.defaultOpen);
      details.open = this.sectionOpen[key];
      details.addEventListener("toggle", () => {
        this.sectionOpen[key] = details.open;
      });
      details.createEl("summary", { text: title });
      return details;
    };
    const rulesSection = createSection("rules", t(this.app, "settings.section.rules"), { defaultOpen: true });
    const example = rulesSection.createDiv({ cls: "zettel-outline-settings__example", attr: { "aria-live": "polite" } });
    let excludeRebuildRow = null;
    const updateExample = () => {
      const settings = this.plugin.settings;
      const index = this.plugin.indexService.index;
      const pending = !index || index.stale || index.settingsHash !== settingsHash(settings);
      excludeRebuildRow?.settingEl.style.setProperty("display", pending ? "" : "none");
      const id = [100, 1, 2].join(settings.idSegmentDelimiter);
      const title = t(this.app, "settings.example.title");
      const trim = settings.titleDelimiter !== " " && settings.allowTrimAroundDelimiter;
      const separator = trim ? ` ${settings.titleDelimiter} ` : settings.titleDelimiter;
      const basename = settings.idPosition === "prefix" ? `${id}${separator}${title}` : `${title}${separator}${id}`;
      const result = parseFileName(basename, settings);
      example.empty();
      const header = example.createDiv({ cls: "zettel-outline-settings__example-header" });
      header.createEl("strong", { text: t(this.app, "settings.example.label") });
      if (pending) {
        const button = header.createEl("button", { text: t(this.app, "settings.rebuild.name"), cls: "mod-cta" });
        button.disabled = !!this.rebuildingExample;
        button.addEventListener("click", async () => {
          this.rebuildingExample = true;
          button.disabled = true;
          try {
            await this.plugin.indexService.rebuild({ reason: "manual" });
            this.plugin.refreshViews();
          } catch (error) {
            new import_obsidian8.Notice(t(this.app, "settings.example.rebuildFailed"));
            console.error("Zettel Outline: rebuild failed", error);
          } finally {
            this.rebuildingExample = false;
            updateExample();
          }
        });
      }
      example.createEl("code", { text: `${basename}.md` });
      if (result.ok) {
        example.createDiv({ text: `${t(this.app, "settings.example.number")}: ${result.parsed.idKey}\u3000${t(this.app, "settings.example.levels")}: ${result.parsed.segments.join(" \u2192 ")}` });
      }
      if (pending) example.createDiv({ cls: "setting-item-description", text: t(this.app, "settings.example.pending") });
    };
    this.updateExample = updateExample;
    updateExample();
    const uiSection = createSection("ui", t(this.app, "settings.section.ui"), { defaultOpen: false });
    const advancedSection = createSection("advanced", t(this.app, "settings.section.advanced"), { defaultOpen: false });
    const excludeSection = createSection("exclude", t(this.app, "exclude.title"));
    new import_obsidian8.Setting(excludeSection).setName(t(this.app, "exclude.folders")).setDesc(t(this.app, "exclude.foldersDesc")).addTextArea((input) => {
      input.setValue(normalizeExcludedFolders(this.plugin.settings.excludedFolders).join("\n"));
      input.inputEl.rows = 3;
      input.inputEl.setAttribute("aria-label", t(this.app, "exclude.folders"));
      input.onChange(async (value) => {
        this.plugin.settings.excludedFolders = normalizeExcludedFolders(value);
        await this.plugin.saveSettings();
      });
    });
    new import_obsidian8.Setting(excludeSection).setName(t(this.app, "exclude.dates")).setDesc(t(this.app, "exclude.datesDesc")).addToggle((toggle) => toggle.setValue(!!this.plugin.settings.excludeDateIds).onChange(async (value) => {
      this.plugin.settings.excludeDateIds = value;
      await this.plugin.saveSettings();
    }));
    excludeRebuildRow = new import_obsidian8.Setting(excludeSection).setDesc(t(this.app, "exclude.apply")).addButton((button) => button.setButtonText(t(this.app, "settings.rebuild.name")).onClick(async () => {
      button.setDisabled(true);
      try {
        await this.plugin.indexService.rebuild({ reason: "manual" });
        this.plugin.refreshViews();
      } finally {
        button.setDisabled(false);
      }
    }));
    updateExample();
    const shortcutSection = createSection("shortcuts", t(this.app, "shortcuts.title"));
    shortcutSection.createDiv({ cls: "setting-item-description", text: t(this.app, "shortcuts.desc") });
    for (const [action, fallback] of Object.entries(defaultShortcuts)) {
      const setting = new import_obsidian8.Setting(shortcutSection).setName(t(this.app, `shortcuts.${action}`));
      const current = () => effectiveShortcuts(this.plugin.settings)[action];
      setting.addButton((button) => {
        const update = () => button.setButtonText(current() ? shortcutLabel(current()) : t(this.app, "shortcuts.unbound"));
        update();
        button.onClick(() => {
          this.shortcutCaptureCleanup?.();
          button.setButtonText(t(this.app, "shortcuts.record"));
          button.buttonEl.focus();
          const ownerWindow = button.buttonEl.ownerDocument.defaultView;
          const cleanup = () => {
            ownerWindow.removeEventListener("keydown", record, true);
            button.buttonEl.removeEventListener("blur", cleanup);
            update();
            this.shortcutCaptureCleanup = null;
          };
          const record = async (event) => {
            if (event.isComposing) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            if (event.key === "Escape") {
              cleanup();
              return;
            }
            const binding = event.key === "Backspace" ? "" : keyBinding(event);
            if (binding === null) return;
            const bindings = effectiveShortcuts(this.plugin.settings);
            if (binding && Object.keys(bindings).some((key) => key !== action && bindings[key] === binding)) {
              new import_obsidian8.Notice(t(this.app, "shortcuts.conflict"));
              return;
            }
            this.plugin.settings.panelShortcuts = { ...this.plugin.settings.panelShortcuts, [action]: binding };
            cleanup();
            await this.plugin.saveSettings();
          };
          ownerWindow.addEventListener("keydown", record, true);
          button.buttonEl.addEventListener("blur", cleanup);
          this.shortcutCaptureCleanup = cleanup;
        });
      }).addExtraButton((button) => button.setIcon("rotate-ccw").setTooltip(t(this.app, "shortcuts.reset")).onClick(async () => {
        this.shortcutCaptureCleanup?.();
        const bindings = effectiveShortcuts(this.plugin.settings);
        if (Object.keys(bindings).some((key) => key !== action && bindings[key] === fallback)) {
          new import_obsidian8.Notice(t(this.app, "shortcuts.conflict"));
          return;
        }
        this.plugin.settings.panelShortcuts = { ...this.plugin.settings.panelShortcuts, [action]: fallback };
        await this.plugin.saveSettings();
        this.display();
      }));
    }
    new import_obsidian8.Setting(rulesSection).setName(t(this.app, "settings.idPosition.name")).addDropdown(
      (dd) => dd.addOption("prefix", t(this.app, "settings.idPosition.prefix")).addOption("suffix", t(this.app, "settings.idPosition.suffix")).setValue(this.plugin.settings.idPosition).onChange(async (value) => {
        this.plugin.settings.idPosition = value;
        updateExample();
        await this.plugin.saveSettings();
      })
    );
    const addDelimiterSetting = (key, otherKey) => {
      const setting = new import_obsidian8.Setting(rulesSection).setName(t(this.app, `settings.${key}.name`)).setDesc(t(this.app, `settings.${key}.desc`));
      const error = setting.infoEl.createDiv({ cls: "zettel-outline-settings__error", attr: { "aria-live": "polite" } });
      setting.addText((input) => input.setValue(this.plugin.settings[key]).onChange(async (value) => {
        const message = value.length !== 1 || /^[0-9]$/.test(value) ? t(this.app, "notice.delimiterDigitNotAllowed") : value === this.plugin.settings[otherKey] ? t(this.app, "notice.delimiterSameNotAllowed") : "";
        error.textContent = message;
        input.inputEl.setAttribute("aria-invalid", String(!!message));
        if (message) return;
        this.plugin.settings[key] = value;
        if (key === "titleDelimiter") {
          if (value === " ") this.plugin.settings.allowTrimAroundDelimiter = false;
          allowTrimToggle?.setValue(this.plugin.settings.allowTrimAroundDelimiter).setDisabled(value === " ");
        }
        updateExample();
        await this.plugin.saveSettings();
      }));
    };
    addDelimiterSetting("idSegmentDelimiter", "titleDelimiter");
    addDelimiterSetting("titleDelimiter", "idSegmentDelimiter");
    let allowTrimToggle = null;
    new import_obsidian8.Setting(rulesSection).setName(t(this.app, "settings.allowTrim.name")).setDesc(t(this.app, "settings.allowTrim.desc")).addToggle(
      (tg) => (allowTrimToggle = tg).setValue(this.plugin.settings.allowTrimAroundDelimiter).onChange(async (value) => {
        if (this.plugin.settings.titleDelimiter === " " && value) {
          new import_obsidian8.Notice(t(this.app, "notice.trimNotAllowedWhenSpaceDelimiter"));
          return;
        }
        this.plugin.settings.allowTrimAroundDelimiter = value;
        updateExample();
        await this.plugin.saveSettings();
      })
    );
    if (this.plugin.settings.titleDelimiter === " ") {
      allowTrimToggle == null ? void 0 : allowTrimToggle.setDisabled(true);
      if (this.plugin.settings.allowTrimAroundDelimiter) {
        this.plugin.settings.allowTrimAroundDelimiter = false;
        void this.plugin.saveSettings();
      }
    }
    new import_obsidian8.Setting(advancedSection).setName(t(this.app, "settings.trustCache.name")).setDesc(t(this.app, "settings.trustCache.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.trustCacheOnStartup).onChange(async (value) => {
        this.plugin.settings.trustCacheOnStartup = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian8.Setting(advancedSection).setName(t(this.app, "settings.showIgnoredSummary.name")).setDesc(t(this.app, "settings.showIgnoredSummary.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.showIgnoredSummaryNotice).onChange(async (value) => {
        this.plugin.settings.showIgnoredSummaryNotice = value;
        await this.plugin.saveSettings();
      })
    );
    const addNumberSetting = (section, label, key, min, step) => {
      const setting = new import_obsidian8.Setting(section).setName(t(this.app, `settings.${label}.name`)).setDesc(t(this.app, `settings.${label}.desc`));
      setting.controlEl.addClass("zettel-outline-settings__number");
      let input;
      let minus;
      const update = async (value) => {
        if (value === "") return;
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < min) return;
        this.plugin.settings[key] = number;
        input.setValue(String(number));
        minus.setDisabled(number <= min);
        this.plugin.refreshViews();
        await this.plugin.saveSettings();
      };
      setting.addButton((button) => {
        minus = button;
        button.setButtonText("\u2212").setTooltip(t(this.app, "settings.number.decrease")).setDisabled(this.plugin.settings[key] <= min).onClick(() => update(String(Math.max(min, this.plugin.settings[key] - step))));
        button.buttonEl.setAttribute("aria-label", `${t(this.app, "settings.number.decrease")} ${t(this.app, `settings.${label}.name`)}`);
      });
      setting.addText((control) => {
        input = control;
        control.inputEl.type = "number";
        control.inputEl.min = String(min);
        control.inputEl.step = String(step);
        control.inputEl.setAttribute("aria-label", t(this.app, `settings.${label}.name`));
        control.setValue(String(this.plugin.settings[key])).onChange(update);
      });
      setting.addButton((button) => {
        button.setButtonText("\uFF0B").setTooltip(t(this.app, "settings.number.increase")).onClick(() => update(String(this.plugin.settings[key] + step)));
        button.buttonEl.setAttribute("aria-label", `${t(this.app, "settings.number.increase")} ${t(this.app, `settings.${label}.name`)}`);
      });
    };
    uiSection.createDiv({ cls: "setting-item-description", text: t(this.app, "settings.ui.live") });
    new import_obsidian8.Setting(uiSection).setName(t(this.app, "settings.outlineStyle.name")).addDropdown(
      (dropdown) => dropdown.addOption("classic", t(this.app, "settings.outlineStyle.classic")).addOption("list", t(this.app, "settings.outlineStyle.list")).setValue(this.plugin.settings.outlineStyle).onChange(async (value) => {
        this.plugin.settings.outlineStyle = value;
        this.plugin.refreshViews();
        await this.plugin.saveSettings();
      })
    );
    addNumberSetting(uiSection, "rowHeight", "rowHeightPx", 12, 1);
    addNumberSetting(advancedSection, "overscan", "overscanRows", 0, 1);
    addNumberSetting(advancedSection, "debounce", "debounceMs", 0, 10);
    const readCssVar = (name) => {
      try {
        return getComputedStyle(document.body).getPropertyValue(name).trim() || getComputedStyle(document.documentElement).getPropertyValue(name).trim();
      } catch (e) {
        return "";
      }
    };
    const rgbToHex = (r, g, b) => {
      const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
      const to2 = (n) => clamp(n).toString(16).padStart(2, "0");
      return `#${to2(r)}${to2(g)}${to2(b)}`;
    };
    const normalizeColorForPicker = (raw) => {
      const s = (raw != null ? raw : "").trim();
      if (!s) return "";
      if (s.startsWith("#")) return s;
      const m = s.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
      if (m) return rgbToHex(Number(m[1]), Number(m[2]), Number(m[3]));
      try {
        const el = document.createElement("div");
        el.style.color = s;
        document.body.appendChild(el);
        const computed = getComputedStyle(el).color.trim();
        el.remove();
        const m2 = computed.match(/^rgba?\((\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
        if (m2) return rgbToHex(Number(m2[1]), Number(m2[2]), Number(m2[3]));
      } catch (e) {
      }
      return "";
    };
    const themeAccentHex = () => {
      const candidate = readCssVar("--interactive-accent") || readCssVar("--color-accent") || readCssVar("--text-accent") || readCssVar("--text-accent-hover") || "";
      return normalizeColorForPicker(candidate);
    };
    const setColorSetting = async (key, value) => {
      this.plugin.settings[key] = normalizeColorForPicker(value);
      if (key === "treeRootTitleColor") delete this.plugin.settings.treeTitleColor;
      this.plugin.refreshViews();
      await this.plugin.saveSettings();
    };
    new import_obsidian8.Setting(uiSection).setName(t(this.app, "settings.treeRootTitleColor.name")).setDesc(t(this.app, "settings.treeRootTitleColor.desc")).addColorPicker((cp) => {
      const fallback = themeAccentHex() || "#3d7eff";
      cp.setValue(this.plugin.settings.treeRootTitleColor || fallback).onChange(async (value) => {
        await setColorSetting("treeRootTitleColor", value);
      });
    }).addExtraButton(
      (btn) => btn.setIcon("rotate-ccw").setTooltip(t(this.app, "settings.color.reset")).onClick(async () => {
        await setColorSetting("treeRootTitleColor", "");
        this.sectionOpen.ui = true;
        this.display();
      })
    );
    new import_obsidian8.Setting(uiSection).setName(t(this.app, "settings.treeLevel1TitleColor.name")).setDesc(t(this.app, "settings.treeLevel1TitleColor.desc")).addColorPicker((cp) => {
      const fallback = themeAccentHex() || "#3d7eff";
      cp.setValue(this.plugin.settings.treeLevel1TitleColor || fallback).onChange(async (value) => {
        await setColorSetting("treeLevel1TitleColor", value);
      });
    }).addExtraButton(
      (btn) => btn.setIcon("rotate-ccw").setTooltip(t(this.app, "settings.color.reset")).onClick(async () => {
        await setColorSetting("treeLevel1TitleColor", "");
        this.sectionOpen.ui = true;
        this.display();
      })
    );
    new import_obsidian8.Setting(advancedSection).setName(t(this.app, "settings.profiler.name")).setDesc(t(this.app, "settings.profiler.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.enableProfiler).onChange(async (value) => {
        this.plugin.settings.enableProfiler = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
var main_default = ZettelOutlinePlugin;
