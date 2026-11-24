(() => {
  "use strict";
  const app = document.getElementById("app");
  if (!app) return;
  const reduced = () => window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const easing = "cubic-bezier(.22,1,.36,1)", panels = /* @__PURE__ */ new WeakMap();
  let previous = null;
  const kind = (main) => main.classList.contains("chat-page") ? "chat" : main.querySelector("#config-form") ? "settings" : main.querySelector(".workflow") ? "skills" : main.querySelector("#back-history") ? "document" : "history";
  function enter(element, distance = 5, duration = 240) {
    if (!element || !element.animate || reduced()) return;
    element.animate([{ opacity: 0.25, transform: "translateY(".concat(distance, "px)") }, { opacity: 1, transform: "translateY(0)" }], { duration, easing });
  }
  function changed() {
    var _a;
    const main = app.querySelector("main");
    if (!main) return;
    const page = kind(main), entries = [...main.querySelectorAll("[data-chat-entry]")], ids = entries.map((e) => e.getAttribute("data-chat-entry"));
    const active = main.querySelector("[data-active-chat]"), activeText = ((_a = active == null ? void 0 : active.querySelector(".chat-user")) == null ? void 0 : _a.textContent) || "";
    const attachments = [...main.querySelectorAll("#attachments .attachment")];
    if (!previous || previous.page !== page) enter(main, 5, 260);
    else if (page === "chat") {
      if (activeText && activeText !== previous.activeText) {
        enter(active.querySelector(".chat-user-row"), 7, 220);
        enter(active.querySelector(".chat-ai-row"), 5, 260);
      } else if (ids.some((id) => !previous.ids.includes(id))) {
        const newest = entries[entries.length - 1];
        enter(newest == null ? void 0 : newest.querySelector(".chat-ai .result"), 5, 260);
        enter(newest == null ? void 0 : newest.querySelector(".export-row"), 4, 240);
      }
      if (attachments.length > previous.attachments) enter(attachments[attachments.length - 1], 4, 200);
    }
    previous = { page, ids, activeText, attachments: attachments.length };
  }
  document.addEventListener("click", (event) => {
    const summary = event.target.closest && event.target.closest("summary");
    if (!summary || !app.contains(summary) || reduced()) return;
    const detail = summary.parentElement;
    if (!detail || detail.tagName !== "DETAILS" || !detail.animate) return;
    event.preventDefault();
    const prior = panels.get(detail), opening = !(prior ? prior.opening : detail.open), from = detail.getBoundingClientRect().height;
    if (prior) prior.animation.cancel();
    detail.style.height = "auto";
    detail.style.overflow = "";
    detail.open = opening;
    const to = detail.getBoundingClientRect().height;
    detail.open = true;
    detail.style.height = from + "px";
    detail.style.overflow = "hidden";
    const animation = detail.animate([{ height: from + "px" }, { height: to + "px" }], { duration: 240, easing, fill: "forwards" });
    panels.set(detail, { animation, opening });
    animation.onfinish = () => {
      var _a;
      if (((_a = panels.get(detail)) == null ? void 0 : _a.animation) !== animation) return;
      detail.open = opening;
      detail.style.height = "";
      detail.style.overflow = "";
      panels.delete(detail);
      animation.cancel();
    };
  }, true);
  new MutationObserver(changed).observe(app, { childList: true });
  changed();
})();
