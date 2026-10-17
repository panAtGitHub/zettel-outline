import { parseFileName } from "./Parser.js";

export function normalizeExcludedFolders(value) {
  const values = Array.isArray(value) ? value : String(value ?? "").split(/\r?\n/);
  return [...new Set(values.map(path => String(path).trim().replace(/\\/g,"/").replace(/^\/+|\/+$/g,"")).filter(path => path && !path.split("/").some(part => part === ".." || part === ".")))].sort();
}
export function isDateId(id) {
  const match=/^(\d{4})-(\d{2})-(\d{2})$/.exec(id);
  if (!match) return false;
  const [,year,month,day]=match.map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const leap=year%4 === 0 && (year%100 !== 0 || year%400 === 0);
  return day <= [31,leap?29:28,31,30,31,30,31,31,30,31,30,31][month-1];
}
export function exclusionReason(file,settings,parsed) {
  const path=String(file.path ?? "").replace(/\\/g,"/");
  if (normalizeExcludedFolders(settings.excludedFolders).some(folder => path.startsWith(folder+"/"))) return "excluded_folder";
  if (settings.excludeDateIds && parsed?.ok && isDateId(parsed.parsed.idKey)) return "excluded_date";
  return null;
}
export function parseIndexedFile(file,settings) {
  const parsed=parseFileName(file.basename,settings);
  const reason=exclusionReason(file,settings,parsed);
  return reason ? {ok:false,reason} : parsed;
}
