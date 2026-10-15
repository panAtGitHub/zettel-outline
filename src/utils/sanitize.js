

function isSingleCharString(value) {
  return typeof value === "string" && value.length === 1;
}
function isDigitChar(ch) {
  return ch.length === 1 && ch >= "0" && ch <= "9";
}

export { isSingleCharString, isDigitChar };
