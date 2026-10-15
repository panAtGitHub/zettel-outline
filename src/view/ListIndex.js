// A view-only hierarchy: missing ancestors never create files or change the shared index.
export function buildListIndex(index, delimiter) {
  const idIndex = new Map();
  for (const source of index.idIndex.values()) {
    for (let depth = 1; depth <= source.segments.length; depth++) {
      const segments = source.segments.slice(0, depth);
      const idKey = segments.join(delimiter);
      if (!idIndex.has(idKey)) idIndex.set(idKey, { idKey, segments, rootKey: String(segments[0]), title: "", filePath: null });
      if (depth === source.segments.length) idIndex.set(idKey, { ...source, idKey, title: source.filePath ? source.title : "" });
    }
  }
  const childrenIndex = new Map();
  const roots = [];
  const sorted = [...idIndex.values()].sort((a,b) => {
    for (let i=0;i<Math.min(a.segments.length,b.segments.length);i++) {
      if (a.segments[i] !== b.segments[i]) return a.segments[i] - b.segments[i];
    }
    return a.segments.length - b.segments.length;
  });
  for (const node of sorted) {
    if (node.segments.length === 1) roots.push(node.idKey);
    else {
      const parent = node.segments.slice(0,-1).join(delimiter);
      if (!childrenIndex.has(parent)) childrenIndex.set(parent, []);
      childrenIndex.get(parent).push(node.idKey);
    }
  }
  return { ...index, idIndex, childrenIndex, roots };
}
