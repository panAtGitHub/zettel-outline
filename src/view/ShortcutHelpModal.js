import {Modal} from "obsidian";
import {effectiveShortcuts,shortcutLabel} from "../settings/Shortcuts.js";
import {t} from "../i18n/i18n.js";
export class ShortcutHelpModal extends Modal {
  constructor(app,service){super(app);this.service=service;}
  onOpen(){
    this.contentEl.createEl('h3',{text:t(this.app,'shortcuts.title')});
    this.contentEl.createDiv({cls:'setting-item-description',text:t(this.app,'shortcuts.scope')});
    const bindings=effectiveShortcuts(this.service.getSettings());
    for(const [action,binding] of Object.entries(bindings)){
      const row=this.contentEl.createDiv({cls:'zettel-outline-shortcut-help__row'});
      row.createSpan({text:t(this.app,'shortcuts.'+action)});row.createEl('kbd',{text:binding?shortcutLabel(binding):t(this.app,'shortcuts.unbound')});
    }
  }
}
