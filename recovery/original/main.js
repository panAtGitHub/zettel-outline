/*
This is a generated bundle from zettel-outline v1.0.0.
*/
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

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => ZettelOutlinePlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian3 = require("obsidian");

// src/view/OutlineView.ts
var import_obsidian = require("obsidian");

// src/view/VirtualTree.ts
var VirtualTree = class {
  constructor(host, indexService, opts) {
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
    this.activeId = idKey;
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
    const index = this.indexService.getIndex();
    const viewState = this.indexService.getViewState();
    if (!index || !this.rootKey) {
      this.visible = [];
      this.renderWindow(true);
      return;
    }
    const rootNode = index.idIndex.get(this.rootKey);
    if (!rootNode) {
      this.visible = [];
      this.renderWindow(true);
      return;
    }
    const token = this.buildToken += 1;
    if (this.pendingBuildTimer) window.clearTimeout(this.pendingBuildTimer);
    this.isBuilding = true;
    const expanded = viewState.expandedNodes;
    const rows = [];
    const stack = [{ idKey: this.rootKey, depth: 0 }];
    const timeBudgetMs = 8;
    const step = () => {
      var _a, _b, _c, _d, _e, _f;
      if (token !== this.buildToken) return;
      const start = (_c = (_b = (_a = globalThis.performance) == null ? void 0 : _a.now) == null ? void 0 : _b.call(_a)) != null ? _c : Date.now();
      while (stack.length) {
        const item = stack.pop();
        const children = this.indexService.getChildrenForRender(item.idKey, this.rootKey);
        rows.push({ idKey: item.idKey, depth: item.depth, hasChildren: children.length > 0 });
        const isExpanded = item.idKey === this.rootKey || this.expandedMode === "all" || expanded.has(item.idKey);
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
    const index = this.indexService.getIndex();
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
      rowEl.style.top = `${i * rowHeight}px`;
      rowEl.style.height = `${rowHeight}px`;
      if (this.activeId && this.activeId === r.idKey) rowEl.addClass("is-active");
      if (r.depth === 1) rowEl.addClass("is-level1");
      if (this.rootKey && node.idKey === this.rootKey) {
        rowEl.addClass("is-root");
      } else {
        const number = rowEl.createDiv({ cls: "zettel-outline__tree-number" });
        const parts = node.segments.slice(1);
        const text = parts.length === 1 ? `${parts[0]}.` : parts.join(".");
        number.setText(text);
      }
      const title = rowEl.createDiv({ cls: "zettel-outline__tree-title" });
      title.setText(node.title);
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

// src/i18n/i18n.ts
var dict = {
  en: {
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
    "plugin.name": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "command.open": "\u6253\u5F00\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "ribbon.tooltip": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "view.title": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "roots.header": "Root ({count})",
    "roots.stale": "\u7D22\u5F15\u5DF2\u8FC7\u671F\uFF0C\u9700\u8981\u91CD\u5EFA\uFF08Settings \u2192 Rebuild\uFF09",
    "tree.loading": "\u52A0\u8F7D\u4E2D\u2026",
    "tree.stale": "\u7D22\u5F15\u5DF2\u8FC7\u671F\u3002\u8BF7\u5230 Settings \u70B9\u51FB Rebuild \u91CD\u65B0\u626B\u63CF\u3002",
    "tree.hint.collapsed": "\u6253\u5F00\u4E00\u4E2A\u201C\u5728\u7B14\u8BB0\u4F53\u7CFB\u5185\u201D\u7684\u7B14\u8BB0\u4EE5\u663E\u793A\u666E\u901A\u6811",
    "tree.hint.fileNotInIndex": "\u8BE5\u7B14\u8BB0\u4E0D\u5728\u7B14\u8BB0\u4F53\u7CFB\u5185",
    "settings.title": "\u6570\u5B57\u5C42\u7EA7\u5927\u7EB2",
    "settings.section.rules": "\u89E3\u6790\u89C4\u5219",
    "settings.section.ui": "\u754C\u9762",
    "settings.section.index": "\u7D22\u5F15",
    "settings.section.advanced": "\u9AD8\u7EA7",
    "settings.idPosition.name": "ID \u4F4D\u7F6E",
    "settings.idPosition.desc": "\u53EA\u80FD\u4E8C\u9009\u4E00\uFF1AID \u5728\u524D\uFF08prefix\uFF09\u6216 ID \u5728\u540E\uFF08suffix\uFF09\u3002",
    "settings.idPosition.prefix": "prefix\uFF08ID + \u5206\u5272\u7B26 + \u6807\u9898\uFF09",
    "settings.idPosition.suffix": "suffix\uFF08\u6807\u9898 + \u5206\u5272\u7B26 + ID\uFF09",
    "settings.idSegmentDelimiter.name": "\u6570\u5B57\u5206\u5272\u7B26",
    "settings.idSegmentDelimiter.desc": "\u5355\u5B57\u7B26\u3001\u4E0D\u80FD\u662F\u6570\u5B57\u3001\u4E14\u4E0D\u80FD\u4E0E\u6807\u9898\u5206\u5272\u7B26\u76F8\u540C\u3002",
    "settings.titleDelimiter.name": "\u6807\u9898\u5206\u5272\u7B26",
    "settings.titleDelimiter.desc": "\u6807\u9898\u4E0E ID \u7684\u5206\u9694\u7B26\u3002\u5141\u8BB8\u7A7A\u683C\uFF08\u4E14\u5FC5\u987B\u6070\u597D 1 \u4E2A\u7A7A\u683C\u4F5C\u4E3A\u5206\u9694\uFF09\u3002",
    "settings.allowTrim.name": "\u5141\u8BB8\u5206\u5272\u7B26\u4E24\u4FA7 trim",
    "settings.allowTrim.desc": "\u5F00\u542F\u540E\u5141\u8BB8\u6807\u9898\u5206\u5272\u7B26\u4E24\u4FA7\u5404\u6700\u591A 1 \u4E2A\u7A7A\u683C\uFF08\u517C\u5BB9 `100 +\u6807\u9898`\uFF09\u3002\u6807\u9898\u5206\u5272\u7B26\u4E3A\u7A7A\u683C\u65F6\u5F3A\u5236\u5173\u95ED\u3002",
    "settings.manualRebuild.name": "\u89C4\u5219\u53D8\u66F4\u540E\u624B\u52A8\u91CD\u5EFA",
    "settings.manualRebuild.desc": "\u5F00\u542F\u540E\uFF0C\u89C4\u5219\u53D8\u66F4\u4F1A\u628A\u7D22\u5F15\u6807\u8BB0\u4E3A\u8FC7\u671F\uFF0C\u9700\u8981\u624B\u52A8\u70B9\u51FB\u91CD\u5EFA\u3002",
    "settings.trustCache.name": "\u542F\u52A8\u5148\u4FE1\u4EFB\u7F13\u5B58",
    "settings.trustCache.desc": "settingsHash \u5339\u914D\u65F6\u5148\u7528\u7F13\u5B58\u6E32\u67D3\uFF0C\u518D\u540E\u53F0\u6821\u9A8C\u3002",
    "settings.showIgnoredSummary.name": "\u663E\u793A\u5FFD\u7565\u7EDF\u8BA1\u63D0\u793A",
    "settings.showIgnoredSummary.desc": "\u91CD\u5EFA/\u626B\u63CF\u5B8C\u6210\u540E\u5F39\u51FA\u4E00\u6B21\u201C\u5FFD\u7565\u539F\u56E0\u7EDF\u8BA1\u201D\uFF08\u53EF\u5173\u95ED\uFF09\u3002",
    "settings.debounce.name": "\u9632\u6296\uFF08\u6BEB\u79D2\uFF09",
    "settings.debounce.desc": "\u589E\u91CF\u66F4\u65B0\u7684\u9632\u6296\u65F6\u95F4\u3002",
    "settings.rowHeight.name": "\u884C\u9AD8\uFF08\u50CF\u7D20\uFF09",
    "settings.rowHeight.desc": "\u865A\u62DF\u6811\u884C\u9AD8\u3002",
    "settings.overscan.name": "\u9884\u6E32\u67D3\u884C\u6570",
    "settings.overscan.desc": "\u89C6\u53E3\u4E0A\u4E0B\u989D\u5916\u6E32\u67D3\u7684\u884C\u6570\u3002",
    "settings.profiler.name": "\u5F00\u542F\u6027\u80FD\u65E5\u5FD7",
    "settings.profiler.desc": "\u8F93\u51FA\u8017\u65F6\u5230\u63A7\u5236\u53F0\u3002",
    "settings.treeRootTitleColor.name": "\u6839\u8282\u70B9\u6807\u9898\u989C\u8272",
    "settings.treeRootTitleColor.desc": "\u4F5C\u7528\u4E8E\u6839\u8282\u70B9\u6807\u9898\u884C\uFF08\u9ED8\u8BA4\u8DDF\u968F\u4E3B\u9898\u8272\uFF09\u3002",
    "settings.treeLevel1TitleColor.name": "\u4E00\u7EA7\u6807\u9898\u989C\u8272",
    "settings.treeLevel1TitleColor.desc": "\u4F5C\u7528\u4E8E\u4E00\u7EA7\u6807\u9898\uFF08\u5982 1. \u6559\u7A0B\uFF09\uFF08\u9ED8\u8BA4\u8DDF\u968F\u4E3B\u9898\uFF09\u3002",
    "settings.color.reset": "\u91CD\u7F6E\u4E3A\u4E3B\u9898\u9ED8\u8BA4",
    "settings.rebuild.name": "\u91CD\u5EFA\u7D22\u5F15",
    "settings.rebuild.desc": "\u91CD\u65B0\u626B\u63CF\u5E76\u91CD\u5EFA\u7D22\u5F15\uFF08\u7D22\u5F15\u8FC7\u671F\u65F6\u9700\u8981\uFF09\u3002",
    "settings.rebuild.button": "\u91CD\u5EFA",
    "notice.delimiterDigitNotAllowed": "\u5206\u5272\u7B26\u4E0D\u80FD\u662F\u6570\u5B57\u5B57\u7B26",
    "notice.delimiterSameNotAllowed": "\u6570\u5B57\u5206\u5272\u7B26\u4E0D\u80FD\u4E0E\u6807\u9898\u5206\u5272\u7B26\u76F8\u540C",
    "notice.trimNotAllowedWhenSpaceDelimiter": "\u5F53\u6807\u9898\u5206\u5272\u7B26\u4E3A\u7A7A\u683C\u65F6\uFF0C\u4E0D\u5141\u8BB8\u5F00\u542F trim \u517C\u5BB9\u6A21\u5F0F",
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

// src/view/OutlineView.ts
var VIEW_TYPE_ZETTEL_OUTLINE = "zettel-outline-view";
var OutlineView = class extends import_obsidian.ItemView {
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
      const rootTitleColor = ((_a = settings.treeRootTitleColor) != null ? _a : "").trim();
      const level1Color = ((_b = settings.treeLevel1TitleColor) != null ? _b : "").trim();
      this.rootEl.style.setProperty("--zettel-outline-row-height", `${settings.rowHeightPx}px`);
      if (rootTitleColor) this.rootEl.style.setProperty("--zettel-outline-root-title-color", rootTitleColor);
      else this.rootEl.style.removeProperty("--zettel-outline-root-title-color");
      if (level1Color) this.rootEl.style.setProperty("--zettel-outline-level1-title-color", level1Color);
      else this.rootEl.style.removeProperty("--zettel-outline-level1-title-color");
    }
    const index = this.indexService.getIndex();
    const viewState = this.indexService.getViewState();
    this.rootsEl.empty();
    const header = this.rootsEl.createDiv({ cls: "zettel-outline__roots-header" });
    const headerCaret = header.createDiv({ cls: "zettel-outline__roots-header-caret" });
    (0, import_obsidian.setIcon)(headerCaret, this.rootsCollapsed ? "chevron-right" : "chevron-down");
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
  onRootRowClick(rootKey, ev) {
    const index = this.indexService.getIndex();
    if (!index) return;
    if (index.stale) {
      return;
    }
    const meta = index.rootMeta.get(rootKey);
    const rootFilePath = meta == null ? void 0 : meta.rootFilePath;
    if (!rootFilePath) {
      new import_obsidian.Notice(t(this.app, "notice.rootFileMissing", { rootKey }));
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

// src/settings/Settings.ts
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
  overscanRows: 8,
  enableProfiler: false,
  treeRootTitleColor: "",
  treeLevel1TitleColor: ""
};

// src/services/IndexService.ts
var import_obsidian2 = require("obsidian");

// src/utils/sanitize.ts
function isSingleCharString(value) {
  return typeof value === "string" && value.length === 1;
}
function isDigitChar(ch) {
  return ch.length === 1 && ch >= "0" && ch <= "9";
}

// src/index/Parser.ts
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

// src/utils/hash.ts
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

// src/perf/Profiler.ts
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

// src/services/IndexService.ts
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
    if (leaf.view instanceof import_obsidian2.MarkdownView) this.lastMarkdownLeaf = leaf;
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
    if (file && file instanceof import_obsidian2.TFile) {
      const isMobile = import_obsidian2.Platform.isMobileApp;
      const wantNewTab = !!(opts == null ? void 0 : opts.newTab) && !isMobile;
      if (wantNewTab) {
        await this.deps.app.workspace.getLeaf("tab").openFile(file, { active: true });
        return;
      }
      const markdownLeaf = (_b = (_a = this.lastMarkdownLeaf) != null ? _a : this.deps.app.workspace.getLeavesOfType("markdown").find((leaf) => leaf.view instanceof import_obsidian2.MarkdownView)) != null ? _b : null;
      if (markdownLeaf && markdownLeaf.view instanceof import_obsidian2.MarkdownView) {
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

// src/main.ts
var ZettelOutlinePlugin = class extends import_obsidian3.Plugin {
  constructor() {
    super(...arguments);
    this.settingsTab = null;
  }
  async onload() {
    var _a;
    const data = await this.loadData();
    const storedSettings = (_a = data == null ? void 0 : data.settings) != null ? _a : data && !("version" in data) ? data : null;
    this.settings = Object.assign({}, defaultSettings, storedSettings != null ? storedSettings : {});
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
      onNotices: (messages) => messages.forEach((m) => new import_obsidian3.Notice(m))
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
    const isMobile = import_obsidian3.Platform.isMobileApp;
    const leaf = isMobile ? (_c = (_b = (_a = this.app.workspace).getRightLeaf) == null ? void 0 : _b.call(_a, false)) != null ? _c : this.app.workspace.getLeaf(true) : (_f = (_e = (_d = this.app.workspace).getRightLeaf) == null ? void 0 : _e.call(_d, false)) != null ? _f : this.app.workspace.getLeaf("tab");
    await (leaf == null ? void 0 : leaf.setViewState({ type: VIEW_TYPE_ZETTEL_OUTLINE, active: true }));
    if (leaf) this.app.workspace.revealLeaf(leaf);
  }
  refreshViews() {
    const leaves = this.app.workspace.getLeavesOfType(VIEW_TYPE_ZETTEL_OUTLINE);
    for (const leaf of leaves) {
      const view = leaf.view;
      if (view instanceof OutlineView) view.refresh();
    }
  }
};
var ZettelOutlineSettingTab = class extends import_obsidian3.PluginSettingTab {
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
    const uiSection = createSection("ui", t(this.app, "settings.section.ui"), { defaultOpen: false });
    const indexSection = createSection("index", t(this.app, "settings.section.index"), { defaultOpen: false });
    const advancedSection = createSection("advanced", t(this.app, "settings.section.advanced"), { defaultOpen: false });
    new import_obsidian3.Setting(rulesSection).setName(t(this.app, "settings.idPosition.name")).setDesc(t(this.app, "settings.idPosition.desc")).addDropdown(
      (dd) => dd.addOption("prefix", t(this.app, "settings.idPosition.prefix")).addOption("suffix", t(this.app, "settings.idPosition.suffix")).setValue(this.plugin.settings.idPosition).onChange(async (value) => {
        this.plugin.settings.idPosition = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(rulesSection).setName(t(this.app, "settings.idSegmentDelimiter.name")).setDesc(t(this.app, "settings.idSegmentDelimiter.desc")).addText(
      (t2) => t2.setValue(this.plugin.settings.idSegmentDelimiter).onChange(async (value) => {
        var _a;
        const v = (_a = value == null ? void 0 : value.slice(0, 1)) != null ? _a : "";
        if (!v) return;
        if (v >= "0" && v <= "9") {
          new import_obsidian3.Notice(t2(this.app, "notice.delimiterDigitNotAllowed"));
          return;
        }
        if (v === this.plugin.settings.titleDelimiter) {
          new import_obsidian3.Notice(t2(this.app, "notice.delimiterSameNotAllowed"));
          return;
        }
        this.plugin.settings.idSegmentDelimiter = v;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(rulesSection).setName(t(this.app, "settings.titleDelimiter.name")).setDesc(t(this.app, "settings.titleDelimiter.desc")).addText(
      (t2) => t2.setValue(this.plugin.settings.titleDelimiter).onChange(async (value) => {
        var _a;
        const v = value === " " ? " " : (_a = value == null ? void 0 : value.slice(0, 1)) != null ? _a : "";
        if (!v) return;
        if (v !== " " && v >= "0" && v <= "9") {
          new import_obsidian3.Notice(t2(this.app, "notice.delimiterDigitNotAllowed"));
          return;
        }
        if (v === this.plugin.settings.idSegmentDelimiter) {
          new import_obsidian3.Notice(t2(this.app, "notice.delimiterSameNotAllowed"));
          return;
        }
        this.plugin.settings.titleDelimiter = v;
        await this.plugin.saveSettings();
      })
    );
    let allowTrimToggle = null;
    new import_obsidian3.Setting(rulesSection).setName(t(this.app, "settings.allowTrim.name")).setDesc(t(this.app, "settings.allowTrim.desc")).addToggle(
      (tg) => (allowTrimToggle = tg).setValue(this.plugin.settings.allowTrimAroundDelimiter).onChange(async (value) => {
        if (this.plugin.settings.titleDelimiter === " " && value) {
          new import_obsidian3.Notice(t(this.app, "notice.trimNotAllowedWhenSpaceDelimiter"));
          return;
        }
        this.plugin.settings.allowTrimAroundDelimiter = value;
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
    new import_obsidian3.Setting(indexSection).setName(t(this.app, "settings.manualRebuild.name")).setDesc(t(this.app, "settings.manualRebuild.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.requireManualRebuildOnRuleChange).onChange(async (value) => {
        this.plugin.settings.requireManualRebuildOnRuleChange = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(advancedSection).setName(t(this.app, "settings.trustCache.name")).setDesc(t(this.app, "settings.trustCache.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.trustCacheOnStartup).onChange(async (value) => {
        this.plugin.settings.trustCacheOnStartup = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(advancedSection).setName(t(this.app, "settings.showIgnoredSummary.name")).setDesc(t(this.app, "settings.showIgnoredSummary.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.showIgnoredSummaryNotice).onChange(async (value) => {
        this.plugin.settings.showIgnoredSummaryNotice = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(advancedSection).setName(t(this.app, "settings.debounce.name")).setDesc(t(this.app, "settings.debounce.desc")).addText(
      (t2) => t2.setValue(String(this.plugin.settings.debounceMs)).onChange(async (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return;
        this.plugin.settings.debounceMs = n;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(uiSection).setName(t(this.app, "settings.rowHeight.name")).setDesc(t(this.app, "settings.rowHeight.desc")).addText(
      (t2) => t2.setValue(String(this.plugin.settings.rowHeightPx)).onChange(async (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 12) return;
        this.plugin.settings.rowHeightPx = n;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(uiSection).setName(t(this.app, "settings.overscan.name")).setDesc(t(this.app, "settings.overscan.desc")).addText(
      (t2) => t2.setValue(String(this.plugin.settings.overscanRows)).onChange(async (value) => {
        const n = Number(value);
        if (!Number.isFinite(n) || n < 0) return;
        this.plugin.settings.overscanRows = n;
        await this.plugin.saveSettings();
      })
    );
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
      await this.plugin.saveSettings();
    };
    new import_obsidian3.Setting(uiSection).setName(t(this.app, "settings.treeRootTitleColor.name")).setDesc(t(this.app, "settings.treeRootTitleColor.desc")).addColorPicker((cp) => {
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
    new import_obsidian3.Setting(uiSection).setName(t(this.app, "settings.treeLevel1TitleColor.name")).setDesc(t(this.app, "settings.treeLevel1TitleColor.desc")).addColorPicker((cp) => {
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
    new import_obsidian3.Setting(advancedSection).setName(t(this.app, "settings.profiler.name")).setDesc(t(this.app, "settings.profiler.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.enableProfiler).onChange(async (value) => {
        this.plugin.settings.enableProfiler = value;
        await this.plugin.saveSettings();
      })
    );
    new import_obsidian3.Setting(indexSection).setName(t(this.app, "settings.rebuild.name")).setDesc(t(this.app, "settings.rebuild.desc")).addButton(
      (btn) => btn.setButtonText(t(this.app, "settings.rebuild.button")).setCta().onClick(async () => {
        await this.plugin.indexService.rebuild({ reason: "manual" });
        this.plugin.refreshViews();
      })
    );
  }
};
