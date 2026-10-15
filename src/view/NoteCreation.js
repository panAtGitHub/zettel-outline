import { resizeNumberInput, bindImmediateHint } from "./createControls.js";
import { Modal, Setting, Notice, setIcon } from "obsidian";
import { parseFileName } from "../index/Parser.js";
import { settingsHash } from "../services/IndexService.js";
import { t } from "../i18n/i18n.js";

export function occupiedNumbers(files, settings) {
  const occupied = new Set();
  const actual = new Set();
  for (const file of files) {
    const parsed = parseFileName(file.basename, settings);
    if (!parsed.ok) continue;
    const segments = parsed.parsed.segments;
    actual.add(segments.join("/"));
    for (let i=1;i<=segments.length;i++) occupied.add(segments.slice(0,i).join("/"));
  }
  return {occupied, actual};
}
export function suggestNumber(occupied, parent) {
  let max = 0;
  for (const key of occupied) {
    const parts = key.split("/").map(Number);
    if (parts.length === parent.length + 1 && parent.every((n,i) => n === parts[i])) max = Math.max(max, parts.at(-1));
  }
  return max + 1;
}
export function noteBasename(title, segments, settings) {
  const id = segments.join(settings.idSegmentDelimiter);
  return settings.idPosition === "prefix" ? `${id}${settings.titleDelimiter}${title}` : `${title}${settings.titleDelimiter}${id}`;
}
export function openNoteCreation(app, service, mode, node) {
  const settings = service.getSettings();
  if (!service.getIndex() || service.getIndex().stale || service.getIndex().settingsHash !== settingsHash(settings) || service.isRebuilding()) {
    new Notice(t(app,"create.rebuild")); return;
  }
  new CreateNoteModal(app, service, mode, node).open();
}
class CreateNoteModal extends Modal {
  constructor(app, service, mode, node) {
    super(app); this.service = service; this.mode = mode;
    this.parent = mode === "child" ? node.segments : mode === "sibling" ? node.segments.slice(0,-1) : [];
    const settings = service.getSettings();
    this.ruleHash = settingsHash(settings);
    this.number = mode === "fill" ? node.segments.at(-1) : suggestNumber(occupiedNumbers(app.vault.getMarkdownFiles(),settings).occupied,this.parent);
    if (mode === "fill") this.parent = node.segments.slice(0,-1);
    this.title = "";
  }
  onOpen() {
    this.modalEl.addClass("zettel-outline-create-modal");
    this.contentEl.createDiv({cls:"zettel-outline-create__heading",text:t(this.app,`create.${this.mode}`)});
    this.preview = this.contentEl.createEl("div", {cls:"zettel-outline-create__preview",attr:{"aria-live":"polite"}});
    const nameRow = new Setting(this.contentEl).setName(t(this.app,"create.title"));
    nameRow.settingEl.addClass("zettel-outline-create__row");
    nameRow.addText(input => {
      this.titleInput = input;
      input.setPlaceholder(t(this.app,"create.titlePlaceholder"));
      input.inputEl.setAttribute("aria-label",t(this.app,"create.title"));
      input.onChange(value => {this.title=value;this.update();});
      input.inputEl.addEventListener("keydown",event => {if(event.key === "Enter" && !event.isComposing) {event.preventDefault();this.submit();}});
    });
    const numberRow = new Setting(this.contentEl).setName(t(this.app,"create.number"));
    numberRow.settingEl.addClass("zettel-outline-create__row");
    numberRow.controlEl.addClass("zettel-outline-create__number");
    if (this.mode !== "fill") {
      const hint = numberRow.nameEl.createEl("button", {cls:"zettel-outline-create__number-hint",attr:{type:"button","aria-label":t(this.app,"create.numberHint")}});
      setIcon(hint,"circle-alert");
      const tooltip = this.modalEl.createDiv({cls:"zettel-outline-create__instant-hint",text:t(this.app,"create.numberHint"),attr:{role:"tooltip"}});
      tooltip.id = "zettel-outline-number-hint";
      hint.setAttribute("aria-describedby",tooltip.id);
      bindImmediateHint(hint,tooltip);
    }
    if (this.mode === "fill") {
      numberRow.controlEl.createSpan({text:[...this.parent,this.number].join(this.service.getSettings().idSegmentDelimiter)});
    } else {
      if (this.parent.length) numberRow.controlEl.createSpan({cls:"zettel-outline-create__parent",text:this.parent.join(this.service.getSettings().idSegmentDelimiter) + this.service.getSettings().idSegmentDelimiter});
      const changeNumber = delta => {
        const current = Number(this.number);
        this.number = Math.min(9999,Math.max(0,(Number.isFinite(current) ? current : 0) + delta));
        this.numberInput.setValue(String(this.number));
        this.update();
      };
      numberRow.addText(input => {
        this.numberInput = input;
        input.setValue(String(this.number));
        Object.assign(input.inputEl,{type:"number",min:"0",max:"9999",step:"1"});
        input.inputEl.setAttribute("aria-label",t(this.app,"create.number"));
        input.onChange(value => {this.number=value;this.update();});
        input.inputEl.addEventListener("keydown",event => {
          if (event.key === "ArrowUp" || event.key === "ArrowDown") {
            event.preventDefault(); changeNumber(event.key === "ArrowUp" ? 1 : -1);
          }
        });
      });

    }
    this.error = this.contentEl.createDiv({cls:"zettel-outline-settings__error",attr:{"aria-live":"polite"}});
    const actions = new Setting(this.contentEl);
    actions.settingEl.addClass("zettel-outline-create__actions");
    actions.addButton(button => {button.buttonEl.addClass("zettel-outline-create__cancel");button.setButtonText(t(this.app,"create.cancel")).onClick(() => this.close());});
    actions.addButton(button => {this.submitButton = button;button.setButtonText(t(this.app,"create.submit")).setCta().onClick(() => this.submit());});
    this.update(); this.titleInput.inputEl.focus();
  }
  validate() {
    const settings = this.service.getSettings();
    if (this.service.getIndex()?.stale || this.service.isRebuilding() || settingsHash(settings) !== this.ruleHash) return "create.rebuild";
    if (String(this.number) === "" || !Number.isInteger(Number(this.number)) || Number(this.number)<0 || Number(this.number)>9999) return "create.invalidNumber";
    const title = this.title.trim();
    if (!title) return "create.needTitle";
    if (/[\\/:*?"<>|\x00-\x1f]/.test(title)) return "create.invalidTitle";
    const segments = [...this.parent,Number(this.number)];
    const sets = occupiedNumbers(this.app.vault.getMarkdownFiles(),settings);
    if ((this.mode === "fill" ? sets.actual : sets.occupied).has(segments.join("/"))) return "create.conflict";
    const basename = noteBasename(title,segments,settings);
    if (/[\\/:*?"<>|\x00-\x1f]/.test(basename) || /[. ]$/.test(basename) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(basename)) return "create.invalidTitle";
    const parsed = parseFileName(basename,settings);
    if (!parsed.ok || parsed.parsed.title !== title || parsed.parsed.segments.join("/") !== segments.join("/")) return "create.invalidTitle";
    return null;
  }
  update() {
    if (this.numberInput) resizeNumberInput(this.numberInput.inputEl,this.number);
    this.preview.textContent = noteBasename((this.title.trim() || t(this.app,"create.title")),[...this.parent,this.number],this.service.getSettings()) + ".md";
    this.preview.classList.toggle("is-placeholder", !this.title.trim());

    const error = this.validate();
    this.error.textContent = error && error !== "create.needTitle" ? t(this.app,error) : "";
    this.submitButton.setDisabled(!!error || this.busy);
  }
  async submit() {
    if (this.busy || this.service.creatingNote) return;
    this.update(); if (this.validate()) return;
    this.busy=true; this.service.creatingNote=true; this.update();
    try {
      const basename = noteBasename(this.title.trim(),[...this.parent,Number(this.number)],this.service.getSettings());
      const folder = this.app.fileManager.getNewFileParent(this.app.workspace.getActiveFile()?.path ?? "");
      const path = (!folder.path || folder.path === "/" ? "" : folder.path + "/") + basename + ".md";
      if (this.app.vault.getAbstractFileByPath(path)) throw new Error(t(this.app,"create.conflict"));
      const file = await this.app.vault.create(path, "");
      this.service.onCreate(file);
      await this.service.flush();
      await this.service.openFileByPath(file.path, {newTab:false});
      this.close();
    } catch(error) { this.error.textContent = `${t(this.app,"create.failed")}: ${error.message}`; }
    finally {this.service.creatingNote=false;this.busy=false;this.submitButton.setDisabled(false);}
  }
}
