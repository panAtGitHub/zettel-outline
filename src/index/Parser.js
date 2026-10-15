import { isSingleCharString, isDigitChar } from "../utils/sanitize.js";

function validateDelimiterConstraints(settings) {
  const idSeg = settings.idSegmentDelimiter;
  const titleDelim = settings.titleDelimiter;
  if (!isSingleCharString(idSeg) || !isSingleCharString(titleDelim)) return "delimiter_constraints";
  if (idSeg === titleDelim) return "delimiter_constraints";
  if (isDigitChar(idSeg) || isDigitChar(titleDelim)) return "delimiter_constraints";
  return null;
}
function parseFileName(basename, settings) {
  const constraint = validateDelimiterConstraints(settings);
  if (constraint) return { ok: false, reason: constraint };
  const delimiter = settings.titleDelimiter;
  const idSegmentDelimiter = settings.idSegmentDelimiter;
  const allowTrim = settings.titleDelimiter === " " ? false : settings.allowTrimAroundDelimiter;
  const split = splitTitleAndIdStrict(basename, settings.idPosition, delimiter, allowTrim);
  if (!split.ok) return split;
  const title = split.title;
  const idKey = split.idKey;
  if (!title) return { ok: false, reason: "empty_title" };
  if (!idKey) return { ok: false, reason: "empty_id" };
  const parsedId = parseIdKey(idKey, idSegmentDelimiter);
  if (!parsedId.ok) return parsedId;
  const segments = parsedId.segments;
  const rootKey = String(segments[0]);
  const normalizedIdKey = normalizeIdForCompare(segments, idSegmentDelimiter);
  return {
    ok: true,
    parsed: { idKey, title, segments, normalizedIdKey, rootKey }
  };
}
function splitTitleAndIdStrict(basename, idPosition, delimiter, allowTrimAroundDelimiter) {
  if (delimiter === " ") {
    const split = splitBySingleSpaceDelimiter(basename, idPosition);
    if (!split.ok) return split;
    return { ok: true, title: split.title, idKey: split.idKey };
  }
  const index = idPosition === "prefix" ? basename.indexOf(delimiter) : basename.lastIndexOf(delimiter);
  if (index < 0) return { ok: false, reason: "no_delimiter" };
  let left = basename.slice(0, index);
  let right = basename.slice(index + delimiter.length);
  if (allowTrimAroundDelimiter) {
    if (left.endsWith(" ")) left = left.slice(0, -1);
    if (right.startsWith(" ")) right = right.slice(1);
    if (left.endsWith(" ")) return { ok: false, reason: "no_delimiter" };
    if (right.startsWith(" ")) return { ok: false, reason: "no_delimiter" };
  }
  if (idPosition === "prefix") {
    return { ok: true, idKey: left, title: right };
  }
  return { ok: true, title: left, idKey: right };
}
function splitBySingleSpaceDelimiter(basename, idPosition) {
  if (!basename.includes(" ")) return { ok: false, reason: "no_delimiter" };
  if (idPosition === "prefix") {
    const idx2 = basename.indexOf(" ");
    if (idx2 < 0) return { ok: false, reason: "no_delimiter" };
    if (idx2 > 0 && basename[idx2 - 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
    if (idx2 + 1 < basename.length && basename[idx2 + 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
    return { ok: true, idKey: basename.slice(0, idx2), title: basename.slice(idx2 + 1) };
  }
  const idx = basename.lastIndexOf(" ");
  if (idx < 0) return { ok: false, reason: "no_delimiter" };
  if (idx > 0 && basename[idx - 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
  if (idx + 1 < basename.length && basename[idx + 1] === " ") return { ok: false, reason: "space_delimiter_not_exact_one" };
  return { ok: true, title: basename.slice(0, idx), idKey: basename.slice(idx + 1) };
}
function parseIdKey(idKey, idSegmentDelimiter) {
  if (!idKey) return { ok: false, reason: "empty_id" };
  const parts = idKey.split(idSegmentDelimiter);
  if (parts.length === 0) return { ok: false, reason: "invalid_id" };
  const segments = [];
  for (const part of parts) {
    if (!part) return { ok: false, reason: "invalid_id" };
    if (part.length > 4) return { ok: false, reason: "segment_too_long" };
    if (!/^\d+$/.test(part)) return { ok: false, reason: "invalid_id" };
    const value = Number(part);
    if (!Number.isFinite(value) || value < 0 || value > 9999) return { ok: false, reason: "invalid_id" };
    segments.push(value);
  }
  return { ok: true, segments };
}
function normalizeIdForCompare(segments, idSegmentDelimiter) {
  return segments.map((n) => String(n).padStart(4, "0")).join(idSegmentDelimiter);
}
function segmentsFromIdKey(idKey, idSegmentDelimiter) {
  const parsed = parseIdKey(idKey, idSegmentDelimiter);
  if (!parsed.ok) return null;
  return parsed.segments;
}

export { validateDelimiterConstraints, parseFileName, splitTitleAndIdStrict, splitBySingleSpaceDelimiter, parseIdKey, normalizeIdForCompare, segmentsFromIdKey };
