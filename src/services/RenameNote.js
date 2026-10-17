import { parseFileName } from "../index/Parser.js";
import { settingsHash } from "./IndexService.js";
import { EditHistory } from "./EditHistory.js";

export function historyFor(service) { return service.editHistory ??= new EditHistory(100,service.structureArchive); }
export function makeRenameCommand(app,service,path,title,selection) {
  if(service.editBatch)throw Error("history.busy");
  const settings=service.getSettings();
  const hash=settingsHash(settings);
  const file=app.vault.getAbstractFileByPath(path);
  if (!file || file.extension !== "md") throw new Error("edit.missing");
  const parsed=parseFileName(file.basename,settings);
  const clean=title.trim();
  if (!parsed.ok || !clean || /[\\/:*?"<>|\x00-\x1f]/.test(clean)) throw new Error("edit.invalid");
  const id=parsed.parsed.idKey;
  const basename=settings.idPosition === "prefix" ? `${id}${settings.titleDelimiter}${clean}` : `${clean}${settings.titleDelimiter}${id}`;
  const check=parseFileName(basename,settings);
  if (!check.ok || check.parsed.title !== clean || check.parsed.idKey !== id || /[. ]$/.test(basename) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(basename)) throw new Error("edit.invalid");
  const slash=path.lastIndexOf("/");
  const after=path.slice(0,slash+1)+basename+".md";
  if (after === path) return null;
  const apply=async (from,to) => {
    if (settingsHash(service.getSettings()) !== hash || service.getIndex()?.stale || service.isRebuilding()) throw new Error("edit.rules");
    if (app.vault.getAbstractFileByPath(from) !== file || file.path !== from) throw new Error("edit.changed");
    const target=app.vault.getAbstractFileByPath(to);
    if (target && target !== file) throw new Error("edit.conflict");
    await app.fileManager.renameFile(file,to);
    service.onRename(file,from);
    try { await service.flush(); }
    catch (error) {
      // Keep the operation out of history if indexing failed; restore its file path.
      await app.fileManager.renameFile(file,from);
      service.onRename(file,to);
      await service.flush();
      throw error;
    }
  };
  return {kind:"rename",selection, before:path, after, redo:()=>apply(path,after), undo:()=>apply(after,path)};
}
