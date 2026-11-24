/* Draggable dividers: tree | question list | "my quiz". Dragging a divider widens one pane at the
 * expense of its neighbour; arrow keys move it by 20px, double-click restores the default.
 * Widths are remembered in this browser (localStorage). */
(() => {
  const KEY = "stack-bank-panes";
  const root = document.documentElement;
  const state = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } })();
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* private mode */ } };

  // splitter id -> the pane it sizes, the CSS variable, and the minimum widths of both sides
  const SPEC = {
    "split-tree": { pane: ".treepane", box: ".bankgrid", prop: "--tree-w", min: 150, rest: 260 },
    "split-quiz": { pane: ".quiz", box: ".layout", prop: "--quiz-w", min: 260, rest: 600 },
  };

  function apply(id) {
    const s = SPEC[id], w = state[id];
    if (w == null) { root.style.removeProperty(s.prop); return; }
    root.style.setProperty(s.prop, clamp(id, w) + "px");
  }
  function clamp(id, w) {
    const s = SPEC[id], box = document.querySelector(s.box);
    const max = box ? box.clientWidth - s.rest : w;
    return Math.round(Math.max(s.min, Math.min(w, Math.max(s.min, max))));
  }
  // New width from the pointer position: measured from the pane's far edge, so it works in RTL and LTR.
  function widthAt(id, x) {
    const r = document.querySelector(SPEC[id].pane).getBoundingClientRect();
    const sp = document.getElementById(id).getBoundingClientRect();
    return (r.left + r.right) / 2 > (sp.left + sp.right) / 2 ? r.right - x : x - r.left;
  }
  function set(id, w) { state[id] = clamp(id, w); applyAll(); save(); }
  // the tree width is re-clamped whenever the quiz pane changes the space left for the bank
  function applyAll() { apply("split-quiz"); apply("split-tree"); }

  for (const id of Object.keys(SPEC)) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      el.setPointerCapture(ev.pointerId);
      el.classList.add("active");
      document.body.classList.add("resizing");
      const move = (e) => set(id, widthAt(id, e.clientX));
      const up = () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerup", up);
        el.removeEventListener("pointercancel", up);
        el.classList.remove("active");
        document.body.classList.remove("resizing");
      };
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerup", up);
      el.addEventListener("pointercancel", up);
    });
    el.addEventListener("dblclick", () => { delete state[id]; applyAll(); save(); });
    el.addEventListener("keydown", (ev) => {
      if (ev.key !== "ArrowLeft" && ev.key !== "ArrowRight") return;
      ev.preventDefault();
      const pane = document.querySelector(SPEC[id].pane);
      const r = pane.getBoundingClientRect(), sp = el.getBoundingClientRect();
      const paneOnRight = (r.left + r.right) / 2 > (sp.left + sp.right) / 2;
      // moving the divider toward the pane shrinks it
      const towardPane = (ev.key === "ArrowRight") === paneOnRight;
      set(id, r.width + (towardPane ? -20 : 20));
    });
  }
  applyAll();
  window.addEventListener("resize", applyAll);
})();
