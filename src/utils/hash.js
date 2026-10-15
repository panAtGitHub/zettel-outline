

function fnv1a32(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}
function fnv1a32Parts(parts, separator = "\0") {
  let hash = 2166136261;
  const mix = (str) => {
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
  };
  for (let i = 0; i < parts.length; i++) {
    if (i > 0) mix(separator);
    mix(parts[i]);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export { fnv1a32, fnv1a32Parts };
