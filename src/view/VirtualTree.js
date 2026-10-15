import { Menu, setIcon } from "obsidian";
import { openNoteCreation } from "./NoteCreation.js";
import { deleteNoteFile } from "./deleteNoteFile.js";
import { t } from "../i18n/i18n.js";
import { buildListIndex } from "./ListIndex.js";
var VirtualTree = class {
  constructor(host, indexService, opts) {
    this.forest = !!opts?.forest;
    this.expanded = new Set();
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
      if (node) for (let i=1;i<node.segments.length;i++) this.expanded.add(node.segments.slice(0,i).join(this.indexService.getSettings().idSegmentDelimiter));
    }
    this.activeId = this.forest && idKey ? (this.indexService.getIndex()?.idIndex.get(idKey)?.segments.join(this.indexService.getSettings().idSegmentDelimiter) ?? idKey) : idKey;
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
    if (!index || (!this.forest && !this.rootKey)) {
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
    const stack = this.forest ? [...index.roots].reverse().map(idKey => ({idKey,depth:0})) : [{ idKey: this.rootKey, depth: 0 }];
    const timeBudgetMs = 8;
    const step = () => {
      var _a, _b, _c, _d, _e, _f;
      if (token !== this.buildToken) return;
      const start = (_c = (_b = (_a = globalThis.performance) == null ? void 0 : _a.now) == null ? void 0 : _b.call(_a)) != null ? _c : Date.now();
      while (stack.length) {
        const item = stack.pop();
        const children = this.forest ? (index.childrenIndex.get(item.idKey) ?? []) : this.indexService.getChildrenForRender(item.idKey, this.rootKey);
        rows.push({ idKey: item.idKey, depth: item.depth, hasChildren: children.length > 0 });
        const isExpanded = (!this.forest && (item.idKey === this.rootKey || this.expandedMode === "all")) || expanded.has(item.idKey);
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
          const guide = rowEl.createDiv({cls:"zettel-outline__indent-guide"});
          guide.style.left = `calc(24px + ${level} * var(--zettel-outline-list-indent, 2em))`;
        }
        const toggle = rowEl.createEl("button", {cls:"zettel-outline__branch-toggle", text:r.hasChildren ? (this.expanded.has(r.idKey) ? "\u25be" : "\u25b8") : ""});
        toggle.style.left = `calc(-2px + ${r.depth} * var(--zettel-outline-list-indent, 2em))`;
        if (r.hasChildren) setIcon(toggle, this.expanded.has(r.idKey) ? "chevron-down" : "chevron-right");
        toggle.disabled = !r.hasChildren;
        if (r.hasChildren && !this.expanded.has(r.idKey)) toggle.addClass("is-collapsed");
        toggle.setAttribute("aria-label", node.title);
        if (r.hasChildren) toggle.setAttribute("aria-expanded", String(this.expanded.has(r.idKey)));
        toggle.onclick = event => {
          event.stopPropagation();
          if (this.expanded.has(r.idKey)) this.expanded.delete(r.idKey); else this.expanded.add(r.idKey);
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
          const add = title.createEl("button", {cls:"clickable-icon zettel-outline__create-missing",attr:{"aria-label":t(this.indexService.deps.app,"create.fill"),title:t(this.indexService.deps.app,"create.fill")}});
          setIcon(add,"circle-plus");
          add.onclick = event => {event.stopPropagation();openNoteCreation(this.indexService.deps.app,this.indexService,"fill",node);};
        }
        const showMenu = event => {
          event.preventDefault();event.stopPropagation();
          const menu = new Menu();
          for (const mode of ["sibling","child"]) menu.addItem(item => item.setTitle(t(this.indexService.deps.app,`create.${mode}`)).setIcon("plus").onClick(() => openNoteCreation(this.indexService.deps.app,this.indexService,mode,node)));
          if (node.filePath) {
            menu.addSeparator();
            menu.addItem(item => item.setTitle(t(this.indexService.deps.app,"delete.file")).setIcon("trash-2").onClick(() => deleteNoteFile(this.indexService.deps.app,this.indexService,node.filePath)));
          }
          menu.showAtMouseEvent(event);
        };
        rowEl.oncontextmenu = showMenu;
        const more = rowEl.createEl("button",{cls:"clickable-icon zettel-outline__row-menu",attr:{"aria-label":t(this.indexService.deps.app,"create.menu")}});
        setIcon(more,"ellipsis");more.onclick = showMenu;
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


export { VirtualTree };
