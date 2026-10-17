import { StructureHistoryModal } from "./StructureHistoryModal.js";
import { openNoteCreation } from "./NoteCreation.js";
import { ItemView, setIcon, addIcon, Notice } from "obsidian";
import { VirtualTree } from "./VirtualTree.js";
import { t } from "../i18n/i18n.js";

// Outward arrows between separated edges; inward arrows meeting one solid edge.
addIcon("zettel-outline-expand-all", '<path d="M18 16H82M18 84H82M50 42V25M40 35L50 25L60 35M50 58V75M40 65L50 75L60 65" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');
addIcon("zettel-outline-collapse-all", '<path d="M18 50H82" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="M50 10V34M40 24L50 34L60 24M50 90V66M40 76L50 66L60 76" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>');
var VIEW_TYPE_ZETTEL_OUTLINE = "zettel-outline-view";
var OutlineView = class extends ItemView {
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
      new Notice(t(this.app,"command.focusNeedsList"));
      return;
    }
    if (!this.virtualTree?.forest) this.refresh();
    const tree=this.virtualTree;
    if (!tree?.forest) return;
    if (tree.editing && tree.renameInput) {tree.renameInput.focus();return;}
    tree.viewportEl.focus({preventScroll:true});
    const id=tree.visible.some(row=>row.idKey===tree.selectedId) ? tree.selectedId
      : tree.visible.some(row=>row.idKey===tree.activeId) ? tree.activeId : tree.visible[0]?.idKey;
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
    if (this.indexService.getSettings().outlineStyle === "list") { this.renderList(); return; }
    this.rootsEl.removeClass("zettel-outline__list-toolbar");
    if (this.virtualTree?.forest) { this.virtualTree.destroy(); this.virtualTree = null; this.virtualTreeRootKey = null; }
    const index = this.indexService.getIndex();
    const viewState = this.indexService.getViewState();
    this.rootsEl.empty();
    const header = this.rootsEl.createDiv({ cls: "zettel-outline__roots-header" });
    const headerCaret = header.createDiv({ cls: "zettel-outline__roots-header-caret" });
    (0, setIcon)(headerCaret, this.rootsCollapsed ? "chevron-right" : "chevron-down");
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
      this.virtualTree = new VirtualTree(this.treeEl, this.indexService, {forest:true});
      this.virtualTreeRootKey = null;
    }
    const history = this.rootsEl.createEl("button",{cls:"clickable-icon",attr:{"aria-label":t(this.app,"archive.open"),title:t(this.app,"archive.open")}});
    setIcon(history,"history");history.onclick=()=>new StructureHistoryModal(this.app,this.indexService).open();
    const rebuild = this.rootsEl.createEl("button", {cls:"clickable-icon",attr:{"aria-label":t(this.app,"settings.rebuild.name"),title:t(this.app,"settings.rebuild.name")}});
    setIcon(rebuild,"refresh-cw");
    rebuild.disabled = this.indexService.isRebuilding() || !!this.indexService.editBatch || !!this.indexService.editHistory?.busy;
    rebuild.onclick = async () => {
      if(this.indexService.isRebuilding() || this.indexService.editBatch || this.indexService.editHistory?.busy)return;
      rebuild.disabled=true;
      try {await this.indexService.rebuild({reason:"manual"});}
      catch(error){new Notice(t(this.app,"settings.example.rebuildFailed"));console.error("Zettel Outline: rebuild failed",error);}
      finally {this.refresh();}
    };
    const add = this.rootsEl.createEl("button", {cls:"clickable-icon",attr:{"aria-label":t(this.app,"create.root"),title:t(this.app,"create.root")}});
    setIcon(add,"circle-plus");
    add.onclick = () => openNoteCreation(this.app,this.indexService,"root");
    for (const [icon,key,expand] of [["zettel-outline-expand-all","tree.expandAll",true],["zettel-outline-collapse-all","tree.collapseAll",false]]) {
      const button = this.rootsEl.createEl("button", {cls:"clickable-icon",attr:{"aria-label":t(this.app,key),title:t(this.app,key)}});
      setIcon(button,icon);
      button.disabled = !index || index.stale;
      button.onclick = () => {
        this.virtualTree.expanded = expand ? new Set(this.virtualTree.listIndex?.idIndex.keys() ?? []) : new Set();
        this.virtualTree.pendingScrollToActive = false;
        this.virtualTree.refresh();
      };
    }
    if (!index || index.stale) {
      this.virtualTree.destroy(); this.virtualTree = null;
      this.treeEl.createDiv({cls:"zettel-outline__tree-empty",text:t(this.app,index ? "tree.stale" : "tree.loading")});
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
      new Notice(t(this.app, "notice.rootFileMissing", { rootKey }));
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

export { VIEW_TYPE_ZETTEL_OUTLINE, OutlineView };
