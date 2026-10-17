import { parseIndexedFile, normalizeExcludedFolders } from "../index/Exclusions.js";
import { MarkdownView, TFile, Platform } from "obsidian";
import { t } from "../i18n/i18n.js";
import { validateDelimiterConstraints, parseFileName, normalizeIdForCompare, segmentsFromIdKey } from "../index/Parser.js";
import { fnv1a32, fnv1a32Parts } from "../utils/hash.js";
import { profilerFromSettings } from "../perf/Profiler.js";

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
  const folders=normalizeExcludedFolders(settings.excludedFolders);
  if (folders.length) normalized.excludedFolders=folders;
  if (settings.excludeDateIds) normalized.excludeDateIds=true;
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
    if (leaf.view instanceof MarkdownView) this.lastMarkdownLeaf = leaf;
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
    if (file && file instanceof TFile) {
      const isMobile = Platform.isMobileApp;
      const wantNewTab = !!(opts == null ? void 0 : opts.newTab) && !isMobile;
      if (wantNewTab) {
        await this.deps.app.workspace.getLeaf("tab").openFile(file, { active: true });
        return;
      }
      const markdownLeaf = (_b = (_a = this.lastMarkdownLeaf) != null ? _a : this.deps.app.workspace.getLeavesOfType("markdown").find((leaf) => leaf.view instanceof MarkdownView)) != null ? _b : null;
      if (markdownLeaf && markdownLeaf.view instanceof MarkdownView) {
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

export { emptyIgnoredStats, addIgnored, settingsHash, snapshotFromFiles, isMarkdownFile, IndexService };
