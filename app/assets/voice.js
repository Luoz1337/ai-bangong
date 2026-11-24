(function(root) {
  "use strict";
  function appendDraft(draft, spoken) {
    const base = String(draft || ""), text = typeof spoken === "string" ? spoken.trim() : "";
    if (!text) return { text: base, added: false, truncated: false };
    const separator = base && !/\s$/.test(base) ? "\n" : "";
    const full = base + separator + text;
    let next = full.slice(0, 12e3);
    if (/[\uD800-\uDBFF]$/.test(next)) next = next.slice(0, -1);
    if (next.length <= base.length + separator.length) next = base;
    return { text: next, added: next !== base, truncated: full.length > 12e3 };
  }
  const api = { appendDraft };
  if (typeof module !== "undefined") module.exports = api;
  else root.WorkVoice = api;
})(typeof window !== "undefined" ? window : globalThis);
