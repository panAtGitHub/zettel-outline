import {ShortcutHelpModal} from "./ShortcutHelpModal.js";
import {StructureHistoryModal} from "./StructureHistoryModal.js";
import { makePositionCommand } from "../services/PositionBranch.js";
import { bindBranchDrag } from "./dragBranch.js";
import { makeMoveCommand } from "../services/MoveBranch.js";
import { shortcutAction } from "../settings/Shortcuts.js";
import { captureOutlineKeys } from "./outlineKeys.js";
import { historyFor, makeRenameCommand } from "../services/RenameNote.js";
import { Menu, setIcon, Notice } from "obsidian";
import { openNoteCreation } from "./NoteCreation.js";
import { deleteNoteFile } from "./deleteNoteFile.js";
import { t } from "../i18n/i18n.js";
import { buildListIndex } from "./ListIndex.js";
let panelLabelSequence = 0;
var VirtualTree = class {
  constructor(host, indexService, opts) {
    this.forest = !!opts?.forest;
    this.expanded = new Set();
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
      // Obsidian turns aria-label into a hover tooltip over the whole viewport.
      // Label the tree by reference to retain its accessible name without that tooltip.
      this.panelLabel = host.createDiv({text:t(this.indexService.deps.app,"view.title"),attr:{id:`zettel-outline-label-${++panelLabelSequence}`,hidden:""}});
      this.viewportEl.setAttribute("aria-labelledby",this.panelLabel.id);
      if (this.viewportEl.ownerDocument) this.releaseDrag = bindBranchDrag(this,(id,parent)=>this.moveBranchTo(id,parent),"",target=>{
        const app=this.indexService.deps.app;
        const node=this.listIndex?.idIndex.get(target.id);
        return t(app,`move.drop.${target.where}`,{title:node?.title || target.id});
      });
      this.releaseKeys = captureOutlineKeys(this.viewportEl, event => this.onKeyDown(event), () => this.indexService.getSettings());
      this.viewportEl.addEventListener("keydown", event => this.onKeyDown(event));
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
      if (node) for (let i=1;i<node.segments.length;i++) this.expanded.add(node.segments.slice(0,i).join(this.indexService.getSettings().idSegmentDelimiter));
    }
    const previousActive = this.activeId;
    this.activeId = this.forest && idKey ? (this.indexService.getIndex()?.idIndex.get(idKey)?.segments.join(this.indexService.getSettings().idSegmentDelimiter) ?? idKey) : idKey;
    if (this.forest && this.activeId && this.activeId !== previousActive) this.selectedId = this.activeId;
    if (idKey) this.pendingScrollToActive = true;
  }
  selectRow(idKey) {
    if (!idKey) return;
    this.selectedId = idKey;
    const position = this.visible.findIndex(row => row.idKey === idKey);
    if (position >= 0) {
      const height = this.indexService.getSettings().rowHeightPx;
      const top = position * height;
      const viewport = this.viewportEl;
      if (top < viewport.scrollTop) viewport.scrollTop = top;
      else if (top + height > viewport.scrollTop + viewport.clientHeight) viewport.scrollTop = Math.max(0,top + height - viewport.clientHeight);
    }
    this.renderWindow();
  }
  async onKeyDown(event) {
    if (!this.forest || event.target !== this.viewportEl || event.isComposing) return;
    const action=shortcutAction(event,this.indexService.getSettings());
    if (!action) return;
    if (["undo","redo","redoAlt"].includes(action)) {
      event.preventDefault();event.stopPropagation();
      try {
        const history=historyFor(this.indexService);
        const command=await (action === "undo" ? history.undo() : history.redo());
        if(command){
          const id=action === "undo" ? command.beforeSelection ?? command.selection : command.afterSelection ?? command.selection;
          this.revealSelection(id);
        }
      } catch(error){new Notice(t(this.indexService.deps.app,error.message));}
      return;
    }
    if(['help','history','newRoot','expandAll','collapseAll'].includes(action)){
      event.preventDefault();event.stopPropagation();
      const app=this.indexService.deps.app;
      if(event.repeat)return;
      if(action==='help')new ShortcutHelpModal(app,this.indexService).open();
      else if(action==='history')new StructureHistoryModal(app,this.indexService).open();
      else if(action==='newRoot'){if(!event.repeat)openNoteCreation(app,this.indexService,'root');}
      else {this.expanded=action==='expandAll'?new Set(this.listIndex?.idIndex.keys()??[]):new Set();this.pendingScrollToActive=false;this.refresh();}
      return;
    }
    if (!this.visible.length) return;
    event.preventDefault(); event.stopPropagation();
    let position = this.visible.findIndex(row => row.idKey === this.selectedId);
    if (position < 0) { this.selectRow(this.visible[0].idKey); return; }
    const row = this.visible[position];
    if(action === "moveUp" || action === "moveDown") {
      const node=this.listIndex.idIndex.get(row.idKey);
      const siblings=node.segments.length===1?this.listIndex.roots:this.listIndex.childrenIndex.get(node.segments.slice(0,-1).join(this.indexService.getSettings().idSegmentDelimiter));
      const index=siblings.indexOf(row.idKey),other=siblings[index+(action==="moveUp"?-1:1)];
      if(other)await this.moveBranchTo(row.idKey,{target:other,where:action==="moveUp"?"before":"after"});
    }
    else if (action === "indent" || action === "outdent") {
      try {
        const command=makeMoveCommand(this.indexService.deps.app,this.indexService,row.idKey,action);
        if(command){await historyFor(this.indexService).execute(command);
        this.revealSelection(command.afterSelection);}
      } catch(error){new Notice(t(this.indexService.deps.app,error.message));}
    }
    else if (["newSibling","newChild","newParent","deleteFile"].includes(action)) {
      if(event.repeat || this.indexService.editBatch || this.indexService.editHistory?.busy)return;
      const node=this.listIndex?.idIndex.get(row.idKey);
      if(!node)return;
      const app=this.indexService.deps.app;
      if(action === "deleteFile") {
        if(node.filePath)await deleteNoteFile(app,this.indexService,node.filePath);
      } else openNoteCreation(app,this.indexService,action === "newSibling" ? "sibling" : action === "newParent" ? "parent" : "child",node);
    }
    else if (action === "rename") this.startRename(row.idKey);
    else if (action === "up") this.selectRow(this.visible[Math.max(0,position-1)].idKey);
    else if (action === "down") this.selectRow(this.visible[Math.min(this.visible.length-1,position+1)].idKey);
    else if (action === "first") this.selectRow(this.visible[0].idKey);
    else if (action === "last") this.selectRow(this.visible.at(-1).idKey);
    else if (action === "right") {
      if (row.hasChildren && !this.expanded.has(row.idKey)) { this.expanded.add(row.idKey); this.pendingScrollToActive=false; this.refresh(); }
      else if (row.hasChildren && this.visible[position+1]) this.selectRow(this.visible[position+1].idKey);
    } else if (action === "left") {
      if (row.hasChildren && this.expanded.has(row.idKey)) { this.expanded.delete(row.idKey); this.pendingScrollToActive=false; this.refresh(); }
      else for (let i=position-1;i>=0;i--) if (this.visible[i].depth < row.depth) {this.selectRow(this.visible[i].idKey);break;}
    } else if (action === "open") {
      const node = this.listIndex?.idIndex.get(row.idKey);
      if (node?.filePath) {
        await this.indexService.openFileByPath(node.filePath,{newTab:false});
        if (this.viewportEl.isConnected) this.viewportEl.focus({preventScroll:true});
      } else if (node) openNoteCreation(this.indexService.deps.app,this.indexService,"fill",node);
    }
  }
  async moveBranchTo(id,parent) {
    try {
      const command=parent && !Array.isArray(parent) ? makePositionCommand(this.indexService.deps.app,this.indexService,id,parent.target,parent.where) : makeMoveCommand(this.indexService.deps.app,this.indexService,id,parent);
      if(!command)return;
      await historyFor(this.indexService).execute(command);
      this.revealSelection(command.afterSelection);
    } catch(error){new Notice(t(this.indexService.deps.app,error.message));}
  }
  revealSelection(id) {
    if (!id) {this.refresh();return;}
    const parts=id.split(this.indexService.getSettings().idSegmentDelimiter);
    for(let i=1;i<parts.length;i++)this.expanded.add(parts.slice(0,i).join(this.indexService.getSettings().idSegmentDelimiter));
    this.selectedId=id;this.pendingScrollToActive=false;this.refresh();this.selectRow(id);
    if(this.viewportEl.isConnected)this.viewportEl.focus({preventScroll:true});
  }
  startRename(id) {
    if (this.editing) return;
    const node=this.listIndex?.idIndex.get(id);
    if (!node) return;
    const app=this.indexService.deps.app;
    if (!node.filePath) {openNoteCreation(app,this.indexService,"fill",node);return;}
    this.editing={id,path:node.filePath,title:node.title};
    this.renderWindow();
    this.renameInput?.focus();this.renameInput?.select();
  }
  async finishRename(commit) {
    const edit=this.editing;
    if (!edit || edit.busy) return;
    if (!commit) {this.editing=null;this.renderWindow();this.viewportEl.focus();return;}
    edit.busy=true;
    if (this.renameInput) this.renameInput.disabled=true;
    try {
      const app=this.indexService.deps.app;
      const command=makeRenameCommand(app,this.indexService,edit.path,edit.title,edit.id);
      if (command) await historyFor(this.indexService).execute(command);
      this.editing=null;this.refresh();this.viewportEl.focus({preventScroll:true});
    } catch(error) {
      this.renameInput?.remove();
      edit.busy=false;
      new Notice(t(this.indexService.deps.app,error.message));
      this.renderWindow();this.renameInput?.focus();
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
      viewport.scrollTop = Math.max(0,top + h - viewport.clientHeight);
    }
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
      if (this.forest && !stack.length && !rows.some(row => row.idKey === this.selectedId)) {
        const segments = this.listIndex.idIndex.get(this.selectedId)?.segments ?? [];
        this.selectedId = rows.findLast(row => {
          const candidate = this.listIndex.idIndex.get(row.idKey)?.segments ?? [];
          return candidate.length < segments.length && candidate.every((part,i) => part === segments[i]);
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
          const guide = rowEl.createDiv({cls:"zettel-outline__indent-guide"});
          guide.style.left = `calc(var(--zettel-outline-list-start, 1em) + ${level} * var(--zettel-outline-list-indent, 2em) + var(--zettel-outline-guide-offset, 0.5em))`;
        }
      }
      const addToggle = anchor => {
        const toggle = anchor.createEl("button", {cls:"zettel-outline__branch-toggle", text:r.hasChildren ? (this.expanded.has(r.idKey) ? "\u25be" : "\u25b8") : ""});
        if (!listStyle) toggle.style.left = `calc(-2px + ${r.depth} * var(--zettel-outline-list-indent, 2em))`;
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
      };
      if (this.forest && !listStyle) addToggle(rowEl);
      rowEl.style.top = `${i * rowHeight}px`;
      rowEl.style.height = `${rowHeight}px`;
      if (this.activeId && this.activeId === r.idKey) rowEl.addClass("is-active");
      if (this.forest) {
        rowEl.draggable = false;
        rowEl.setAttribute("data-outline-id",r.idKey);
        rowEl.id = `zettel-outline-row-${encodeURIComponent(r.idKey)}`;
        rowEl.setAttribute("role","treeitem");
        rowEl.setAttribute("aria-level",String(r.depth+1));
        rowEl.setAttribute("aria-selected",String(this.selectedId === r.idKey));
        if (r.hasChildren) rowEl.setAttribute("aria-expanded",String(this.expanded.has(r.idKey)));
        if (this.selectedId === r.idKey) {
          rowEl.addClass("is-selected");
          this.viewportEl.setAttribute("aria-activedescendant",rowEl.id);
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
        const input=title.createEl("input",{cls:"zettel-outline__rename-input",attr:{type:"text","aria-label":t(this.indexService.deps.app,"create.title")}});
        this.renameInput=input;input.value=this.editing.title;input.disabled=!!this.editing.busy;
        input.addEventListener("input",()=>{if(this.editing)this.editing.title=input.value;});
        input.addEventListener("click",event=>event.stopPropagation());
        input.addEventListener("keydown",event=>{
          event.stopPropagation();if(event.isComposing)return;
          if(event.key === "Enter" || event.key === "Escape") {event.preventDefault();this.finishRename(event.key === "Enter");}
        });
        input.addEventListener("blur",()=>{if(this.editing && !this.editing.busy)this.finishRename(false);});
      }
      if (this.forest) {
        if (!node.filePath) {
          const add = title.createEl("button", {cls:"clickable-icon zettel-outline__create-missing",attr:{"aria-label":t(this.indexService.deps.app,"create.fill"),title:t(this.indexService.deps.app,"create.fill")}});
          setIcon(add,"circle-plus");
          add.onclick = event => {event.stopPropagation();openNoteCreation(this.indexService.deps.app,this.indexService,"fill",node);};
        }
        const showMenu = event => {
          event.preventDefault();event.stopPropagation();
          const menu = new Menu();
          for (const mode of ["sibling","child","parent"]) menu.addItem(item => item.setTitle(t(this.indexService.deps.app,`create.${mode}`)).setIcon("plus").onClick(() => openNoteCreation(this.indexService.deps.app,this.indexService,mode,node)));
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
        if (this.forest) { this.selectedId = r.idKey; this.viewportEl.focus?.({preventScroll:true}); }
        if (!node.filePath) return;
        const mouse = ev;
        const newTab = mouse.metaKey || mouse.ctrlKey;
        await this.indexService.openFileByPath(node.filePath, { newTab });
        if (this.forest && !newTab && this.viewportEl.isConnected) this.viewportEl.focus({preventScroll:true});
      };
    }
    if (this.pendingScrollToActive && this.tryScrollToActive()) this.pendingScrollToActive = false;
  }
};


export { VirtualTree };
