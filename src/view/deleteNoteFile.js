import { Notice } from "obsidian";
import { t } from "../i18n/i18n.js";
// Trash only this file; descendants remain in the hierarchy.
export async function deleteNoteFile(app, service, path) {
  const file = app.vault.getAbstractFileByPath(path);
  if (!file || file.extension !== "md") return;
  try {
    await app.fileManager.trashFile(file);
    service.onDelete(file);
    await service.flush();
  } catch (error) {
    new Notice(t(app,"delete.failed"));
    console.error("Zettel Outline: could not trash note", error);
  }
}
