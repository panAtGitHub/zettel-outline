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
var import_obsidian6 = require("obsidian");

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
var import_obsidian2 = require("obsidian");

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

// src/services/IndexService.js
var import_obsidian = require("obsidian");

// src/i18n/i18n.js
var dict = {
  en: {
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
    "create.parent": "Parent number",
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
    "create.parent": "\u7236\u7EA7\u7F16\u53F7",
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
    "settings.outlineStyle.name": "\u5927\u7EB2\u6837\u5F0F",
    "settings.outlineStyle.classic": "\u6837\u5F0F\u4E00 \xB7 \u7ECF\u5178",
    "settings.outlineStyle.list": "\u6837\u5F0F\u4E8C \xB7 \u591A\u7EA7\u5217\u8868",
    "settings.ui.live": "\u8C03\u6574\u540E\uFF0C\u53F3\u4FA7\u5927\u7EB2\u5373\u65F6\u66F4\u65B0\u3002",
    "settings.number.decrease": "\u51CF\u5C11",
    "settings.number.increase": "\u589E\u52A0",
    "settings.example.number": "\u7F16\u53F7",
    "settings.example.rebuildHint": "\u4FEE\u6539\u89E3\u6790\u89C4\u5219\u540E\uFF0C\u8BF7\u70B9\u51FB\u300C\u91CD\u5EFA\u7D22\u5F15\u300D\uFF0C\u4F7F\u65B0\u89C4\u5219\u5E94\u7528\u5230\u5927\u7EB2\u3002",
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
    "plugin.name": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "command.open": "\u6253\u5F00\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "ribbon.tooltip": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "view.title": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "roots.header": "\u6839\u76EE\u5F55\uFF08{count}\uFF09",
    "roots.stale": "\u7D22\u5F15\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u91CD\u5EFA\u7D22\u5F15\u3002",
    "tree.loading": "\u52A0\u8F7D\u4E2D\u2026",
    "tree.stale": "\u7D22\u5F15\u5DF2\u8FC7\u671F\uFF0C\u8BF7\u5728\u8BBE\u7F6E\u4E2D\u91CD\u5EFA\u7D22\u5F15\u3002",
    "tree.hint.collapsed": "\u6253\u5F00\u5927\u7EB2\u4E2D\u7684\u7B14\u8BB0\u4EE5\u67E5\u770B\u5C42\u7EA7\u3002",
    "tree.hint.fileNotInIndex": "\u5F53\u524D\u7B14\u8BB0\u4E0D\u5728\u5927\u7EB2\u4E2D\u3002",
    "settings.title": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
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
    "settings.rowHeight.desc": "\u8C03\u6574\u5927\u7EB2\u6761\u76EE\u7684\u95F4\u8DDD\u3002",
    "settings.overscan.name": "\u6EDA\u52A8\u9884\u52A0\u8F7D\u884C\u6570",
    "settings.overscan.desc": "\u63D0\u524D\u52A0\u8F7D\u5C4F\u5E55\u5916\u7684\u6761\u76EE\uFF0C\u51CF\u5C11\u6EDA\u52A8\u65F6\u7684\u7A7A\u767D\u3002",
    "settings.profiler.name": "\u5F00\u542F\u6027\u80FD\u65E5\u5FD7",
    "settings.profiler.desc": "\u8F93\u51FA\u8017\u65F6\u5230\u63A7\u5236\u53F0\u3002",
    "settings.treeRootTitleColor.name": "\u6839\u6807\u9898\u989C\u8272",
    "settings.treeRootTitleColor.desc": "\u8C03\u6574\u6839\u5217\u8868\u4E0E\u5927\u7EB2\u6839\u6807\u9898\u7684\u989C\u8272\u3002",
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
    const parsed = parseFileName(file.basename, settings);
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
      const parsed = parseFileName(file.basename, settings);
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

// src/view/NoteCreation.js
function occupiedNumbers(files, settings) {
  const occupied = /* @__PURE__ */ new Set();
  const actual = /* @__PURE__ */ new Set();
  for (const file of files) {
    const parsed = parseFileName(file.basename, settings);
    if (!parsed.ok) continue;
    const segments = parsed.parsed.segments;
    actual.add(segments.join("/"));
    for (let i = 1; i <= segments.length; i++) occupied.add(segments.slice(0, i).join("/"));
  }
  return { occupied, actual };
}
function suggestNumber(occupied, parent) {
  let max = 0;
  for (const key of occupied) {
    const parts = key.split("/").map(Number);
    if (parts.length === parent.length + 1 && parent.every((n, i) => n === parts[i])) max = Math.max(max, parts.at(-1));
  }
  return max + 1;
}
function noteBasename(title, segments, settings) {
  const id = segments.join(settings.idSegmentDelimiter);
  return settings.idPosition === "prefix" ? `${id}${settings.titleDelimiter}${title}` : `${title}${settings.titleDelimiter}${id}`;
}
function openNoteCreation(app, service, mode, node) {
  const settings = service.getSettings();
  if (!service.getIndex() || service.getIndex().stale || service.getIndex().settingsHash !== settingsHash(settings) || service.isRebuilding()) {
    new import_obsidian2.Notice(t(app, "create.rebuild"));
    return;
  }
  new CreateNoteModal(app, service, mode, node).open();
}
var CreateNoteModal = class extends import_obsidian2.Modal {
  constructor(app, service, mode, node) {
    super(app);
    this.service = service;
    this.mode = mode;
    this.parent = mode === "child" ? node.segments : mode === "sibling" ? node.segments.slice(0, -1) : [];
    const settings = service.getSettings();
    this.ruleHash = settingsHash(settings);
    this.number = mode === "fill" ? node.segments.at(-1) : suggestNumber(occupiedNumbers(app.vault.getMarkdownFiles(), settings).occupied, this.parent);
    if (mode === "fill") this.parent = node.segments.slice(0, -1);
    this.title = "";
  }
  onOpen() {
    this.modalEl.addClass("zettel-outline-create-modal");
    this.contentEl.createDiv({ cls: "zettel-outline-create__heading", text: t(this.app, `create.${this.mode}`) });
    this.preview = this.contentEl.createEl("div", { cls: "zettel-outline-create__preview", attr: { "aria-live": "polite" } });
    const nameRow = new import_obsidian2.Setting(this.contentEl).setName(t(this.app, "create.title"));
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
    const numberRow = new import_obsidian2.Setting(this.contentEl).setName(t(this.app, "create.number"));
    numberRow.settingEl.addClass("zettel-outline-create__row");
    numberRow.controlEl.addClass("zettel-outline-create__number");
    if (this.mode !== "fill") {
      const hint = numberRow.nameEl.createEl("button", { cls: "zettel-outline-create__number-hint", attr: { type: "button", "aria-label": t(this.app, "create.numberHint") } });
      (0, import_obsidian2.setIcon)(hint, "circle-alert");
      const tooltip = this.modalEl.createDiv({ cls: "zettel-outline-create__instant-hint", text: t(this.app, "create.numberHint"), attr: { role: "tooltip" } });
      tooltip.id = "zettel-outline-number-hint";
      hint.setAttribute("aria-describedby", tooltip.id);
      bindImmediateHint(hint, tooltip);
    }
    if (this.mode === "fill") {
      numberRow.controlEl.createSpan({ text: [...this.parent, this.number].join(this.service.getSettings().idSegmentDelimiter) });
    } else {
      if (this.parent.length) numberRow.controlEl.createSpan({ cls: "zettel-outline-create__parent", text: this.parent.join(this.service.getSettings().idSegmentDelimiter) + this.service.getSettings().idSegmentDelimiter });
      const changeNumber = (delta) => {
        const current = Number(this.number);
        this.number = Math.min(9999, Math.max(0, (Number.isFinite(current) ? current : 0) + delta));
        this.numberInput.setValue(String(this.number));
        this.update();
      };
      numberRow.addText((input) => {
        this.numberInput = input;
        input.setValue(String(this.number));
        Object.assign(input.inputEl, { type: "number", min: "0", max: "9999", step: "1" });
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
    const actions = new import_obsidian2.Setting(this.contentEl);
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
    if (String(this.number) === "" || !Number.isInteger(Number(this.number)) || Number(this.number) < 0 || Number(this.number) > 9999) return "create.invalidNumber";
    const title = this.title.trim();
    if (!title) return "create.needTitle";
    if (/[\\/:*?"<>|\x00-\x1f]/.test(title)) return "create.invalidTitle";
    const segments = [...this.parent, Number(this.number)];
    const sets = occupiedNumbers(this.app.vault.getMarkdownFiles(), settings);
    if ((this.mode === "fill" ? sets.actual : sets.occupied).has(segments.join("/"))) return "create.conflict";
    const basename = noteBasename(title, segments, settings);
    if (/[\\/:*?"<>|\x00-\x1f]/.test(basename) || /[. ]$/.test(basename) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(basename)) return "create.invalidTitle";
    const parsed = parseFileName(basename, settings);
    if (!parsed.ok || parsed.parsed.title !== title || parsed.parsed.segments.join("/") !== segments.join("/")) return "create.invalidTitle";
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
    this.update();
    if (this.validate()) return;
    this.busy = true;
    this.service.creatingNote = true;
    this.update();
    try {
      const basename = noteBasename(this.title.trim(), [...this.parent, Number(this.number)], this.service.getSettings());
      const folder = this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path ?? "");
      const path = (!folder.path || folder.path === "/" ? "" : folder.path + "/") + basename + ".md";
      if (this.app.vault.getAbstractFileByPath(path)) throw new Error(t(this.app, "create.conflict"));
      const file = await this.app.vault.create(path, "");
      this.service.onCreate(file);
      await this.service.flush();
      await this.service.openFileByPath(file.path, { newTab: false });
      this.close();
    } catch (error) {
      this.error.textContent = `${t(this.app, "create.failed")}: ${error.message}`;
    } finally {
      this.service.creatingNote = false;
      this.busy = false;
      this.submitButton.setDisabled(false);
    }
  }
};

// src/view/OutlineView.js
var import_obsidian5 = require("obsidian");

// src/view/VirtualTree.js
var import_obsidian4 = require("obsidian");

// src/view/deleteNoteFile.js
var import_obsidian3 = require("obsidian");
async function deleteNoteFile(app, service, path) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!file || file.extension !== "md") return;
  try {
    await app.fileManager.trashFile(file);
    service.onDelete(file);
    await service.flush();
  } catch (error) {
    new import_obsidian3.Notice(t(app, "delete.failed"));
    console.error("Zettel Outline: could not trash note", error);
  }
}

// src/view/ListIndex.js
function buildListIndex(index, delimiter) {
  const idIndex = /* @__PURE__ */ new Map();
  for (const source of index.idIndex.values()) {
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

// src/view/VirtualTree.js
var VirtualTree = class {
  constructor(host, indexService, opts) {
    this.forest = !!opts?.forest;
    this.expanded = /* @__PURE__ */ new Set();
    this.rootKey = null;
    this.visible = [];
    this.activeId = null;
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
  }
  destroy() {
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
    this.activeId = this.forest && idKey ? this.indexService.getIndex()?.idIndex.get(idKey)?.segments.join(this.indexService.getSettings().idSegmentDelimiter) ?? idKey : idKey;
    if (idKey) this.pendingScrollToActive = true;
  }
  refresh() {
    this.computeVisibleRowsChunked();
  }
  scrollToActive() {
    if (!this.activeId) return;
    this.pendingScrollToActive = true;
    this.tryScrollToActive();
  }
  tryScrollToActive() {
    if (!this.activeId) return false;
    const idx = this.visible.findIndex((r) => r.idKey === this.activeId);
    if (idx < 0) return false;
    const h = this.indexService.getSettings().rowHeightPx;
    const top = idx * h;
    this.viewportEl.scrollTop = Math.max(0, top - h * 2);
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
    this.spacerEl.empty();
    for (let i = startRow; i < endRow; i++) {
      const r = this.visible[i];
      const node = index.idIndex.get(r.idKey);
      if (!node) continue;
      const rowEl = this.spacerEl.createDiv({ cls: "zettel-outline__tree-row" });
      const listStyle = settings.outlineStyle === "list";
      if (listStyle) rowEl.style.paddingLeft = `calc(16px + ${r.depth} * var(--zettel-outline-list-indent, 2em))`;
      if (this.forest) {
        for (let level = 0; level < r.depth; level++) {
          const guide = rowEl.createDiv({ cls: "zettel-outline__indent-guide" });
          guide.style.left = `calc(24px + ${level} * var(--zettel-outline-list-indent, 2em))`;
        }
        const toggle = rowEl.createEl("button", { cls: "zettel-outline__branch-toggle", text: r.hasChildren ? this.expanded.has(r.idKey) ? "\u25BE" : "\u25B8" : "" });
        toggle.style.left = `calc(-2px + ${r.depth} * var(--zettel-outline-list-indent, 2em))`;
        if (r.hasChildren) (0, import_obsidian4.setIcon)(toggle, this.expanded.has(r.idKey) ? "chevron-down" : "chevron-right");
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
      }
      rowEl.style.top = `${i * rowHeight}px`;
      rowEl.style.height = `${rowHeight}px`;
      if (this.activeId && this.activeId === r.idKey) rowEl.addClass("is-active");
      if (r.depth === 1) rowEl.addClass("is-level1");
      if (this.rootKey && node.idKey === this.rootKey) {
        rowEl.addClass("is-root");
      }
      if (listStyle || node.idKey !== this.rootKey) {
        const number = rowEl.createDiv({ cls: "zettel-outline__tree-number" });
        const parts = node.segments.slice(1);
        const text = listStyle ? `${node.segments.at(-1)}.` : parts.length === 1 ? `${parts[0]}.` : parts.join(".");
        number.setText(text);
      }
      const title = rowEl.createDiv({ cls: "zettel-outline__tree-title" });
      title.setText(node.title);
      if (this.forest) {
        if (!node.filePath) {
          const add = title.createEl("button", { cls: "clickable-icon zettel-outline__create-missing", attr: { "aria-label": t(this.indexService.deps.app, "create.fill"), title: t(this.indexService.deps.app, "create.fill") } });
          (0, import_obsidian4.setIcon)(add, "circle-plus");
          add.onclick = (event) => {
            event.stopPropagation();
            openNoteCreation(this.indexService.deps.app, this.indexService, "fill", node);
          };
        }
        const showMenu = (event) => {
          event.preventDefault();
          event.stopPropagation();
          const menu = new import_obsidian4.Menu();
          for (const mode of ["sibling", "child"]) menu.addItem((item) => item.setTitle(t(this.indexService.deps.app, `create.${mode}`)).setIcon("plus").onClick(() => openNoteCreation(this.indexService.deps.app, this.indexService, mode, node)));
          if (node.filePath) {
            menu.addSeparator();
            menu.addItem((item) => item.setTitle(t(this.indexService.deps.app, "delete.file")).setIcon("trash-2").onClick(() => deleteNoteFile(this.indexService.deps.app, this.indexService, node.filePath)));
          }
          menu.showAtMouseEvent(event);
        };
        rowEl.oncontextmenu = showMenu;
        const more = rowEl.createEl("button", { cls: "clickable-icon zettel-outline__row-menu", attr: { "aria-label": t(this.indexService.deps.app, "create.menu") } });
        (0, import_obsidian4.setIcon)(more, "ellipsis");
        more.onclick = showMenu;
      }
      rowEl.onclick = async (ev) => {
        if (!node.filePath) return;
        const mouse = ev;
        const newTab = mouse.metaKey || mouse.ctrlKey;
        await this.indexService.openFileByPath(node.filePath, { newTab });
      };
    }
    if (this.pendingScrollToActive && this.tryScrollToActive()) this.pendingScrollToActive = false;
  }
};

// src/view/OutlineView.js
var VIEW_TYPE_ZETTEL_OUTLINE = "zettel-outline-view";
var OutlineView = class extends import_obsidian5.ItemView {
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
    (0, import_obsidian5.setIcon)(headerCaret, this.rootsCollapsed ? "chevron-right" : "chevron-down");
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
    const add = this.rootsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t(this.app, "create.root"), title: t(this.app, "create.root") } });
    (0, import_obsidian5.setIcon)(add, "circle-plus");
    add.onclick = () => openNoteCreation(this.app, this.indexService, "root");
    for (const [icon, key, expand] of [["list-tree", "tree.expandAll", true], ["fold-vertical", "tree.collapseAll", false]]) {
      const button = this.rootsEl.createEl("button", { cls: "clickable-icon", attr: { "aria-label": t(this.app, key), title: t(this.app, key) } });
      (0, import_obsidian5.setIcon)(button, icon);
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
      new import_obsidian5.Notice(t(this.app, "notice.rootFileMissing", { rootKey }));
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
  overscanRows: 8,
  enableProfiler: false,
  treeRootTitleColor: "",
  treeLevel1TitleColor: ""
};

// src/main.js
var ZettelOutlinePlugin = class extends import_obsidian6.Plugin {
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
      onNotices: (messages) => messages.forEach((m) => new import_obsidian6.Notice(m))
    });
    this.registerView(VIEW_TYPE_ZETTEL_OUTLINE, (leaf) => new OutlineView(leaf, this.indexService));
    this.addCommand({
      id: "open-zettel-outline",
      name: t(this.app, "command.open"),
      callback: () => this.activateView()
    });
    this.addRibbonIcon("list-tree", t(this.app, "ribbon.tooltip"), () => this.activateView());
    this.settingsTab = new ZettelOutlineSettingTab(this.app, this);
    this.addSettingTab(this.settingsTab);
    await this.indexService.initialize();
    this.registerEvent(this.app.vault.on("create", (file) => this.indexService.onCreate(file)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.indexService.onDelete(file)));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.indexService.onRename(file, oldPath)));
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
    const isMobile = import_obsidian6.Platform.isMobileApp;
    const leaf = isMobile ? (_c = (_b = (_a = this.app.workspace).getRightLeaf) == null ? void 0 : _b.call(_a, false)) != null ? _c : this.app.workspace.getLeaf(true) : (_f = (_e = (_d = this.app.workspace).getRightLeaf) == null ? void 0 : _e.call(_d, false)) != null ? _f : this.app.workspace.getLeaf("tab");
    await (leaf == null ? void 0 : leaf.setViewState({ type: VIEW_TYPE_ZETTEL_OUTLINE, active: true }));
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }
  refreshViews() {
    this.settingsTab?.updateExample?.();
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZETTEL_OUTLINE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof OutlineView) view.refresh();
    }
  }
};
var ZettelOutlineSettingTab = class extends import_obsidian6.PluginSettingTab {
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
  display() {
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
    const updateExample = () => {
      const settings = this.plugin.settings;
      const index = this.plugin.indexService.index;
      const pending = !index || index.stale || index.settingsHash !== settingsHash(settings);
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
            new import_obsidian6.Notice(t(this.app, "settings.example.rebuildFailed"));
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
    new import_obsidian6.Setting(rulesSection).setName(t(this.app, "settings.idPosition.name")).addDropdown(
      (dd) => dd.addOption("prefix", t(this.app, "settings.idPosition.prefix")).addOption("suffix", t(this.app, "settings.idPosition.suffix")).setValue(this.plugin.settings.idPosition).onChange(async (value) => {
        this.plugin.settings.idPosition = value;
        updateExample();
        await this.plugin.saveSettings();
      })
    );
    const addDelimiterSetting = (key, otherKey) => {
      const setting = new import_obsidian6.Setting(rulesSection).setName(t(this.app, `settings.${key}.name`)).setDesc(t(this.app, `settings.${key}.desc`));
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
    new import_obsidian6.Setting(rulesSection).setName(t(this.app, "settings.allowTrim.name")).setDesc(t(this.app, "settings.allowTrim.desc")).addToggle(
      (tg) => (allowTrimToggle = tg).setValue(this.plugin.settings.allowTrimAroundDelimiter).onChange(async (value) => {
        if (this.plugin.settings.titleDelimiter === " " && value) {
          new import_obsidian6.Notice(t(this.app, "notice.trimNotAllowedWhenSpaceDelimiter"));
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
    new import_obsidian6.Setting(advancedSection).setName(t(this.app, "settings.trustCache.name")).setDesc(t(this.app, "settings.trustCache.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.trustCacheOnStartup).onChange(async (value) => {
        this.plugin.settings.trustCacheOnStartup = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian6.Setting(advancedSection).setName(t(this.app, "settings.showIgnoredSummary.name")).setDesc(t(this.app, "settings.showIgnoredSummary.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.showIgnoredSummaryNotice).onChange(async (value) => {
        this.plugin.settings.showIgnoredSummaryNotice = value;
        await this.plugin.saveSettings();
      })
    );
    const addNumberSetting = (section, label, key, min, step) => {
      const setting = new import_obsidian6.Setting(section).setName(t(this.app, `settings.${label}.name`)).setDesc(t(this.app, `settings.${label}.desc`));
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
    new import_obsidian6.Setting(uiSection).setName(t(this.app, "settings.outlineStyle.name")).addDropdown(
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
    new import_obsidian6.Setting(uiSection).setName(t(this.app, "settings.treeRootTitleColor.name")).setDesc(t(this.app, "settings.treeRootTitleColor.desc")).addColorPicker((cp) => {
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
    new import_obsidian6.Setting(uiSection).setName(t(this.app, "settings.treeLevel1TitleColor.name")).setDesc(t(this.app, "settings.treeLevel1TitleColor.desc")).addColorPicker((cp) => {
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
    new import_obsidian6.Setting(advancedSection).setName(t(this.app, "settings.profiler.name")).setDesc(t(this.app, "settings.profiler.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.enableProfiler).onChange(async (value) => {
        this.plugin.settings.enableProfiler = value;
        await this.plugin.saveSettings();
      })
    );
  }
};
var main_default = ZettelOutlinePlugin;
