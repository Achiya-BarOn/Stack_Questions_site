/*
 * Minimal SCORM 1.2 wrapper.  Finds the LMS "API" object in parent frames / opener
 * (Moodle's SCORM player provides it).  Without an LMS (local preview) it falls back
 * to localStorage, so the package can be tested by opening index.html directly.
 */
(function (global) {
  "use strict";

  function findAPI(win) {
    for (let i = 0; win && i < 10; i++) {
      try {
        if (win.API) return win.API;
      } catch (e) { /* cross-origin frame */ }
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }

  const api = findAPI(global) || (global.opener && findAPI(global.opener));

  // Local stand-in for previews outside an LMS.
  const local = {
    key: "stack-scorm-preview:" + location.pathname,
    data: null,
    load() {
      if (this.data) return;
      try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; }
    },
    LMSInitialize() { this.load(); return "true"; },
    LMSGetValue(k) { this.load(); return this.data[k] ?? ""; },
    LMSSetValue(k, v) { this.load(); this.data[k] = String(v); return "true"; },
    LMSCommit() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} return "true"; },
    LMSFinish() { return this.LMSCommit(); },
    LMSGetLastError() { return "0"; },
  };

  const lms = api || local;
  let initialised = false;
  let finished = false;

  const Scorm = {
    connected: !!api,
    init() {
      if (!initialised) {
        const r = lms.LMSInitialize("");
        initialised = r === "true" || r === true;
      }
      return initialised;
    },
    get(key) { return String(lms.LMSGetValue(key) ?? ""); },
    set(key, value) { return lms.LMSSetValue(key, String(value)); },
    commit() { return lms.LMSCommit(""); },
    finish() {
      if (finished) return;
      finished = true;
      lms.LMSFinish("");
    },
    // Reset the local preview (no effect inside an LMS).
    resetPreview() {
      if (api) return;
      try { localStorage.removeItem(local.key); } catch (e) {}
      local.data = {};
    },
  };

  global.addEventListener("beforeunload", () => {
    if (initialised && !finished) {
      if (Scorm.onLeave) Scorm.onLeave();
      Scorm.commit();
      Scorm.finish();
    }
  });

  global.Scorm = Scorm;
})(window);
