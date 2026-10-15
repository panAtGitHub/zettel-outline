import { Plugin, Notice, Platform, PluginSettingTab, Setting } from "obsidian";
import { VIEW_TYPE_ZETTEL_OUTLINE, OutlineView } from "./view/OutlineView.js";
import { t } from "./i18n/i18n.js";
import { defaultSettings } from "./settings/Settings.js";
import { settingsHash, IndexService } from "./services/IndexService.js";
import { parseFileName } from "./index/Parser.js";

var ZettelOutlinePlugin = class extends Plugin {
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
      onNotices: (messages) => messages.forEach((m) => new Notice(m))
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
    const isMobile = Platform.isMobileApp;
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
var ZettelOutlineSettingTab = class extends PluginSettingTab {
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
          new Notice(t(this.app, "settings.example.rebuildFailed"));
          console.error("Zettel Outline: rebuild failed", error);
        } finally {
          this.rebuildingExample = false;
          updateExample();
        }
      });
      }
      example.createEl("code", { text: `${basename}.md` });
      if (result.ok) {
        example.createDiv({ text: `${t(this.app, "settings.example.number")}: ${result.parsed.idKey}　${t(this.app, "settings.example.levels")}: ${result.parsed.segments.join(" → ")}` });
      }
      if (pending) example.createDiv({ cls: "setting-item-description", text: t(this.app, "settings.example.pending") });
    };
    this.updateExample = updateExample;
    updateExample();
    const uiSection = createSection("ui", t(this.app, "settings.section.ui"), { defaultOpen: false });
    const advancedSection = createSection("advanced", t(this.app, "settings.section.advanced"), { defaultOpen: false });
    new Setting(rulesSection).setName(t(this.app, "settings.idPosition.name")).addDropdown(
      (dd) => dd.addOption("prefix", t(this.app, "settings.idPosition.prefix")).addOption("suffix", t(this.app, "settings.idPosition.suffix")).setValue(this.plugin.settings.idPosition).onChange(async (value) => {
        this.plugin.settings.idPosition = value;
        updateExample();
        await this.plugin.saveSettings();
      })
    );
    const addDelimiterSetting = (key, otherKey) => {
      const setting = new Setting(rulesSection).setName(t(this.app, `settings.${key}.name`)).setDesc(t(this.app, `settings.${key}.desc`));
      const error = setting.infoEl.createDiv({ cls: "zettel-outline-settings__error", attr: { "aria-live": "polite" } });
      setting.addText((input) => input.setValue(this.plugin.settings[key]).onChange(async (value) => {
        const message = value.length !== 1 || /^[0-9]$/.test(value)
          ? t(this.app, "notice.delimiterDigitNotAllowed")
          : value === this.plugin.settings[otherKey] ? t(this.app, "notice.delimiterSameNotAllowed") : "";
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
    new Setting(rulesSection).setName(t(this.app, "settings.allowTrim.name")).setDesc(t(this.app, "settings.allowTrim.desc")).addToggle(
      (tg) => (allowTrimToggle = tg).setValue(this.plugin.settings.allowTrimAroundDelimiter).onChange(async (value) => {
        if (this.plugin.settings.titleDelimiter === " " && value) {
          new Notice(t(this.app, "notice.trimNotAllowedWhenSpaceDelimiter"));
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
    new Setting(advancedSection).setName(t(this.app, "settings.trustCache.name")).setDesc(t(this.app, "settings.trustCache.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.trustCacheOnStartup).onChange(async (value) => {
        this.plugin.settings.trustCacheOnStartup = value;
        await this.plugin.saveSettings();
      })
    );
    new Setting(advancedSection).setName(t(this.app, "settings.showIgnoredSummary.name")).setDesc(t(this.app, "settings.showIgnoredSummary.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.showIgnoredSummaryNotice).onChange(async (value) => {
        this.plugin.settings.showIgnoredSummaryNotice = value;
        await this.plugin.saveSettings();
      })
    );
    const addNumberSetting = (section, label, key, min, step) => {
      const setting = new Setting(section).setName(t(this.app, `settings.${label}.name`)).setDesc(t(this.app, `settings.${label}.desc`));
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
        button.setButtonText("−").setTooltip(t(this.app, "settings.number.decrease")).setDisabled(this.plugin.settings[key] <= min).onClick(() => update(String(Math.max(min, this.plugin.settings[key] - step))));
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
        button.setButtonText("＋").setTooltip(t(this.app, "settings.number.increase")).onClick(() => update(String(this.plugin.settings[key] + step)));
        button.buttonEl.setAttribute("aria-label", `${t(this.app, "settings.number.increase")} ${t(this.app, `settings.${label}.name`)}`);
      });
    };
    uiSection.createDiv({ cls: "setting-item-description", text: t(this.app, "settings.ui.live") });
    new Setting(uiSection).setName(t(this.app, "settings.outlineStyle.name")).addDropdown((dropdown) =>
      dropdown.addOption("classic", t(this.app, "settings.outlineStyle.classic"))
        .addOption("list", t(this.app, "settings.outlineStyle.list"))
        .setValue(this.plugin.settings.outlineStyle)
        .onChange(async (value) => {
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
    new Setting(uiSection).setName(t(this.app, "settings.treeRootTitleColor.name")).setDesc(t(this.app, "settings.treeRootTitleColor.desc")).addColorPicker((cp) => {
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
    new Setting(uiSection).setName(t(this.app, "settings.treeLevel1TitleColor.name")).setDesc(t(this.app, "settings.treeLevel1TitleColor.desc")).addColorPicker((cp) => {
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
    new Setting(advancedSection).setName(t(this.app, "settings.profiler.name")).setDesc(t(this.app, "settings.profiler.desc")).addToggle(
      (tg) => tg.setValue(this.plugin.settings.enableProfiler).onChange(async (value) => {
        this.plugin.settings.enableProfiler = value;
        await this.plugin.saveSettings();
      })
    );

  }
};

export { ZettelOutlinePlugin, ZettelOutlineSettingTab };
export default ZettelOutlinePlugin;
