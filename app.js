/*
 * Quiz builder website.  Reads index.json (built by tools/site/build_site.py), lets a
 * lecturer pick questions and settings, and assembles the SCORM package in the browser
 * with JSZip.  The package is the same as tools/build-scorm/build.py produces – keep
 * makeQuizData() in step with build.py.
 *
 * A quiz is a list of items: questions {id, behaviour?, tries?} and page breaks
 * {break: true}, as in Moodle's quiz editor.
 */
(function () {
  "use strict";

  const BEHAVIOURS = {
    adaptivenopenalty: "מצב מסתגל (ללא קנסות)",
    adaptive: "מצב מסתגל",
    interactive: "אינטראקטיבי עם ניסיונות מרובים",
    immediatefeedback: "משוב מיידי",
    deferredfeedback: "משוב מושהה",
  };
  const REVIEW = {
    attempt: "הניסיון עצמו (השאלות והתשובות)",
    correctness: "האם התשובה נכונה",
    marks: "ציונים",
    specificfeedback: "משוב לתשובה",
    generalfeedback: "משוב כללי (פתרון)",
    rightanswer: "התשובה הנכונה",
  };
  const DRAFT_KEY = "stack-site:draft";
  const SAVED_KEY = "stack-site:saved";      // [{id, updated, quiz}]; the folder is quiz.folder
  const FOLDERS_KEY = "stack-site:folders";  // folder names (so empty folders survive)
  const NO_FOLDER = "";

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  let INDEX;          // index.json
  let BYID = {};      // question id -> index entry
  let quiz;           // the quiz being edited
  const picked = new Set();        // selected items of the quiz list (item objects)
  const pickedSaved = new Set();   // selected saved quizzes (ids)

  // MultiDrag keeps its own list of selected elements; it must be cleared before a list
  // is redrawn and filled again afterwards.
  const SELECTED = "sortable-selected";
  let syncing = false;   // programmatic (de)selection: do not touch picked/pickedSaved
  function unselectAll(container) {
    syncing = true;
    container.querySelectorAll(`.${SELECTED}`).forEach((el) => Sortable.utils.deselect(el));
    syncing = false;
  }
  function selectEl(el, on) {
    syncing = true;
    if (on) Sortable.utils.select(el); else Sortable.utils.deselect(el);
    syncing = false;
  }

  // ------------------------------------------------------------------ storage

  function load(key, fallback) {
    try { const v = JSON.parse(localStorage.getItem(key)); return v ?? fallback; } catch (e) { return fallback; }
  }
  function store(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* private mode */ }
  }
  const savedList = () => load(SAVED_KEY, []);
  const folderList = () => {
    const names = new Set(load(FOLDERS_KEY, []));
    for (const s of savedList()) if (s.quiz.folder) names.add(s.quiz.folder);
    return [...names].sort((a, b) => a.localeCompare(b, "he"));
  };

  function emptyQuiz() {
    const d = INDEX.defaults;
    return {
      title: "",
      folder: NO_FOLDER,
      grade: 10,
      behaviour: d.behaviour,
      questionsperpage: d.questionsperpage,
      review: { during: Object.assign({}, d.review), after: Object.assign({}, d.review) },
      items: [],
    };
  }

  // Bring a stored/shared definition to the current shape: items with page breaks
  // (older versions had questions[] with a pagebreak flag), known questions only.
  function normalise(def) {
    def = def || {};
    const q = Object.assign(emptyQuiz(), def);
    q.review = {
      during: Object.assign({}, INDEX.defaults.review, (def.review && def.review.during) || {}),
      after: Object.assign({}, INDEX.defaults.review, (def.review && def.review.after) || {}),
    };
    if (!Array.isArray(def.items) && Array.isArray(def.questions)) {
      const manual = def.questions.some((e, i) => i > 0 && e.pagebreak);
      const per = +def.questionsperpage || 0;
      q.items = [];
      def.questions.forEach((e, i) => {
        if (i > 0 && (manual ? e.pagebreak : per && i % per === 0)) q.items.push({ break: true });
        const item = Object.assign({}, e);
        delete item.pagebreak;
        q.items.push(item);
      });
    }
    delete q.questions;
    const missing = q.items.filter((e) => !e.break && !BYID[e.id]).map((e) => e.id);
    q.items = tidyBreaks(q.items.filter((e) => e.break || BYID[e.id]));
    if (missing.length) setStatus(`שאלות שכבר לא קיימות במאגר הוסרו: ${missing.join(", ")}`, true);
    return q;
  }

  const saveDraft = () => store(DRAFT_KEY, quiz);

  // ------------------------------------------------------------------ layout (pages)

  // No empty pages: no break first, last, or twice in a row.
  function tidyBreaks(items) {
    const out = [];
    for (const e of items) {
      if (e.break && (!out.length || out[out.length - 1].break)) continue;
      out.push(e);
    }
    while (out.length && out[out.length - 1].break) out.pop();
    return out;
  }

  const questionsOf = (q) => q.items.filter((e) => !e.break);

  // Page number of every question (in question order).
  function pagesOf(q) {
    const pages = [];
    let page = 1;
    for (const e of q.items) {
      if (e.break) page++;
      else pages.push(page);
    }
    return pages;
  }

  function lastPageSize(items) {
    let n = 0;
    for (const e of items) n = e.break ? 0 : n + 1;
    return n;
  }

  // Default layout: "questionsperpage" questions on a page.
  function paginate(items, per) {
    const qs = items.filter((e) => !e.break);
    const out = [];
    qs.forEach((e, i) => {
      if (per > 0 && i > 0 && i % per === 0) out.push({ break: true });
      out.push(e);
    });
    return out;
  }

  // ------------------------------------------------------------------ question bank

  const normaliseText = (s) => (s || "").toLowerCase().replace(/[֑-ׇ]/g, "");
  const countInQuiz = () => questionsOf(quiz).reduce((c, e) => ((c[e.id] = (c[e.id] || 0) + 1), c), {});

  // ---- The bank as a tree of categories (the folders under questions/).  Only the
  // categories are shown at first; [+] opens one to show its subcategories and questions.

  const TREE_OPEN_KEY = "stack-site:tree-open";
  const TREE_SEL_KEY = "stack-site:tree-selected";
  const SUBCATS_KEY = "stack-site:subcats";
  const treeOpen = new Set(load(TREE_OPEN_KEY, []));
  let selectedCat = load(TREE_SEL_KEY, "");      // "" = the whole bank
  let TREE;                                      // {name, path, children: Map, questions: []}

  function buildTree() {
    const root = { name: "", path: "", children: new Map(), questions: [] };
    for (const q of INDEX.questions) {
      let node = root;
      for (const part of q.category.split("/").filter(Boolean)) {
        if (!node.children.has(part)) {
          node.children.set(part, { name: part, path: node.path ? `${node.path}/${part}` : part, children: new Map(), questions: [] });
        }
        node = node.children.get(part);
      }
      node.questions.push(q);
    }
    const sortNode = (n) => {
      n.children = new Map([...n.children.entries()].sort((a, b) => a[0].localeCompare(b[0], "he")));
      n.questions.sort((a, b) => a.name.localeCompare(b.name, "he"));
      n.children.forEach(sortNode);
    };
    sortNode(root);
    return root;
  }

  function findNode(path) {
    let n = TREE;
    for (const part of path.split("/").filter(Boolean)) {
      n = n.children.get(part);
      if (!n) return null;
    }
    return n;
  }

  const allQuestions = (n) => [...n.questions, ...[...n.children.values()].flatMap(allQuestions)];

  function highlight(text, words) {
    let html = esc(text);
    for (const w of words) {
      if (!w) continue;
      const re = new RegExp(esc(w).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      html = html.replace(re, (m) => `<mark>${m}</mark>`);
    }
    return html;
  }

  /*
   * Left: the category tree (names only; +/- opens, a click on the name selects).
   * Right: the questions of the selected category – optionally with its subcategories.
   * The search filters the list; in the tree, categories show how many questions match.
   */
  function renderResults() {
    const words = normaliseText($("search").value).split(/\s+/).filter(Boolean);
    const readyOnly = $("readyonly").checked;
    const searching = words.length > 0;
    const withSub = $("subcats").checked;
    const times = countInQuiz();
    const match = (q) => (!readyOnly || q.status === "ready") &&
      words.every((w) => normaliseText(`${q.name} ${q.text} ${q.id} ${q.category}`).includes(w));

    if (selectedCat && !findNode(selectedCat)) selectedCat = "";
    const counts = new Map();
    const count = (n) => {
      let total = 0, hits = 0, ready = 0;
      for (const q of n.questions) { total++; if (q.status === "ready") ready++; if (match(q)) hits++; }
      for (const ch of n.children.values()) { const c = count(ch); total += c.total; hits += c.hits; ready += c.ready; }
      const c = { total, hits, ready };
      counts.set(n, c);
      return c;
    };
    const all = count(TREE);

    // The tree: while searching, only categories with matches (opened).
    const nodeHtml = (n) => {
      const c = counts.get(n);
      if (searching && !c.hits) return "";
      const kids = [...n.children.values()];
      const open = kids.length && (treeOpen.has(n.path) || (searching && kids.some((k) => counts.get(k).hits)));
      const label = searching ? `${c.hits}` : `${c.total}`;
      const title = searching ? `${c.hits} שאלות מתאימות מתוך ${c.total}`
        : `${c.total} שאלות · ${c.ready === c.total ? "כולן מוכנות" : c.ready ? `${c.ready} מוכנות` : "אף אחת לא מוכנה"}`;
      return `<li class="cat${open ? " open" : ""}${n.path === selectedCat ? " selected" : ""}">
        <div class="catrow" data-select="${esc(n.path)}" title="${esc(title)}">
          ${kids.length ? `<button type="button" class="toggle" data-toggle="${esc(n.path)}" aria-expanded="${!!open}"
            aria-label="${open ? "סגירה" : "פתיחה"}">${open ? "−" : "+"}</button>` : '<span class="toggle none"></span>'}
          <span class="folder" aria-hidden="true">${n.path === selectedCat || open ? "📂" : "📁"}</span>
          <span class="cname">${highlight(n.name, words)}</span>
          <span class="ccount${c.ready < c.total && !searching ? " partial" : ""}">${label}</span>
        </div>
        ${open ? `<ul class="tree">${kids.map(nodeHtml).join("")}</ul>` : ""}
      </li>`;
    };
    $("tree").innerHTML = `<ul class="tree root">
      <li class="cat${selectedCat === "" ? " selected" : ""}">
        <div class="catrow" data-select="" title="כל השאלות במאגר">
          <span class="toggle none"></span><span class="folder" aria-hidden="true">🗂</span>
          <span class="cname">כל המאגר</span><span class="ccount">${searching ? all.hits : all.total}</span>
        </div>
      </li>${[...TREE.children.values()].map(nodeHtml).join("")}</ul>`;

    // The list.
    const node = findNode(selectedCat) || TREE;
    const pool = selectedCat === "" || withSub ? allQuestions(node) : node.questions;
    const list = pool.filter(match);
    const showPath = selectedCat === "" || withSub;
    $("scope").innerHTML = selectedCat ? `📂 <b>${esc(node.name)}</b>` : "🗂 <b>כל המאגר</b>";
    $("subcats").parentElement.hidden = selectedCat === "" || !node.children.size;
    const inSub = selectedCat && !withSub ? allQuestions(node).filter(match).length - list.length : 0;
    $("count").textContent = `${list.length} ${list.length === 1 ? "שאלה" : "שאלות"}` +
      (searching ? " מתאימות" : "") + (inSub > 0 ? ` (ועוד ${inSub} בתתי-הקטגוריות)` : "");
    const rel = (q) => {
      const p = q.category.slice(selectedCat ? selectedCat.length + 1 : 0);
      return p ? p.split("/").join(" › ") : "";
    };
    const ready = (q) => q.status === "ready";
    const row = (q) => `
      <li class="qrow ${q.status}${pickedBank.has(q.id) ? " picked" : ""}" data-id="${esc(q.id)}" draggable="${ready(q)}"
        title="${ready(q) ? "אפשר לגרור לאזור המבדק" : esc("לא נתמך עדיין: " + q.reasons.join(" · "))}">
        <input type="checkbox" class="pick" data-bankpick="${esc(q.id)}" ${ready(q) ? "" : "disabled"}
          ${pickedBank.has(q.id) ? "checked" : ""} title="סימון (להוספה או לגרירה של כמה שאלות יחד)">
        <span class="dot" aria-label="${ready(q) ? "מוכנה" : "דורשת תרגום"}"></span>
        <span class="qmain">
          <button type="button" class="qname" data-preview="${esc(q.id)}" title="תצוגה מקדימה">${highlight(q.name, words)}</button>
          ${showPath && rel(q) ? `<span class="qpath">${esc(rel(q))}</span>` : ""}
        </span>
        ${q.translated ? '<span class="tag tr" title="לבדיקה יש תרגום ידני ל-JS">מתורגמת</span>' : ""}
        ${q.status !== "ready" ? '<span class="tag warn">דורשת תרגום</span>' : ""}
        ${times[q.id] ? `<span class="tag in">במבדק${times[q.id] > 1 ? ` ×${times[q.id]}` : ""}</span>` : ""}
        <span class="qmeta">${q.nvariants} גרסאות · <span dir="ltr">#${esc(q.id)}</span></span>
        <button type="button" class="iconbtn" data-preview="${esc(q.id)}" title="תצוגה מקדימה">👁</button>
        <button type="button" class="iconbtn add" data-add="${esc(q.id)}" ${q.status !== "ready" ? "disabled" : ""}
          title="${times[q.id] ? "הוספה פעם נוספת למבדק" : "הוספה למבדק"}">＋</button>
      </li>`;
    const MAX = 300;
    shownBank = list.slice(0, MAX).filter(ready).map((q) => q.id);
    $("b-pickall").checked = shownBank.length > 0 && shownBank.every((id) => pickedBank.has(id));
    $("b-pickall").disabled = shownBank.length === 0;
    renderBankBar();
    $("results").innerHTML = list.length
      ? `<ul class="qlist">${list.slice(0, MAX).map(row).join("")}</ul>` +
        (list.length > MAX ? `<p class="count">מוצגות ${MAX} הראשונות – צמצמו בחיפוש או בחרו קטגוריה.</p>` : "")
      : `<p class="empty">${inSub > 0 ? 'אין שאלות בקטגוריה עצמה – סמנו "כולל תתי-קטגוריות".' : "אין שאלות מתאימות."}</p>`;
  }

  function toggleNode(path) {
    if (treeOpen.has(path)) {
      // Closing a category also closes everything below it.
      for (const p of [...treeOpen]) if (p === path || p.startsWith(path + "/")) treeOpen.delete(p);
    } else treeOpen.add(path);
    store(TREE_OPEN_KEY, [...treeOpen]);
    renderResults();
  }

  function selectCategory(path) {
    selectedCat = path;
    store(TREE_SEL_KEY, path);
    if (path) treeOpen.add(path);              // show its subcategories too
    store(TREE_OPEN_KEY, [...treeOpen]);
    renderResults();
  }

  function collapseAll() {
    treeOpen.clear();
    store(TREE_OPEN_KEY, []);
    renderResults();
  }

  // New questions go to the last page; a new page starts when it is full.
  // A question may be added more than once (instead of Moodle's "X-copy" questions).
  function addQuestion(id) {
    addQuestions([id]);
  }

  // Add at the end (new pages as "questions per page" says), or before quiz item `at`.
  function addQuestions(ids, at) {
    ids = ids.filter((id) => BYID[id] && BYID[id].status === "ready");
    if (!ids.length) return;
    if (at === undefined || at >= quiz.items.length) {
      const per = +quiz.questionsperpage || 0;
      for (const id of ids) {
        if (per > 0 && quiz.items.length && lastPageSize(quiz.items) >= per) quiz.items.push({ break: true });
        quiz.items.push({ id });
      }
    } else {
      quiz.items.splice(at, 0, ...ids.map((id) => ({ id })));
    }
    changed();
    setStatus(ids.length === 1 ? `"${BYID[ids[0]].name}" נוספה למבדק.` : `נוספו ${ids.length} שאלות למבדק.`);
  }

  // ---- Several questions from the bank: checkboxes, "add" bar, drag into the quiz.
  const pickedBank = new Set();
  let shownBank = [];          // ready questions currently listed (for "select all")

  function renderBankBar() {
    const n = pickedBank.size;
    $("b-selbar").hidden = n === 0;
    $("b-selcount").textContent = `${n} ${n === 1 ? "שאלה מסומנת" : "שאלות מסומנות"}`;
  }

  // Bank questions in the order they are listed (selection may span categories).
  const pickedInOrder = () => {
    const order = INDEX.questions.map((q) => q.id);
    return [...pickedBank].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  };

  function bindBankSelection() {
    $("results").addEventListener("change", (ev) => {
      const id = ev.target.dataset.bankpick;
      if (!id) return;
      if (ev.target.checked) pickedBank.add(id); else pickedBank.delete(id);
      ev.target.closest("li").classList.toggle("picked", ev.target.checked);
      $("b-pickall").checked = shownBank.length > 0 && shownBank.every((x) => pickedBank.has(x));
      renderBankBar();
    });
    $("b-pickall").addEventListener("change", (ev) => {
      for (const id of shownBank) if (ev.target.checked) pickedBank.add(id); else pickedBank.delete(id);
      renderResults();
    });
    $("b-sel-add").addEventListener("click", () => {
      addQuestions(pickedInOrder());
      pickedBank.clear();
      renderResults();
    });
    $("b-sel-clear").addEventListener("click", () => { pickedBank.clear(); renderResults(); });
  }

  // Drag from the bank (native drag and drop) into the quiz list, at the drop position.
  const DRAG_TYPE = "application/x-stack-questions";
  let bankDrag = null;           // ids being dragged

  function bindBankDrag() {
    $("results").addEventListener("dragstart", (ev) => {
      const li = ev.target.closest && ev.target.closest("li.qrow[data-id]");
      if (!li || li.getAttribute("draggable") !== "true") return;
      const id = li.dataset.id;
      bankDrag = pickedBank.has(id) && pickedBank.size > 1 ? pickedInOrder() : [id];
      ev.dataTransfer.effectAllowed = "copy";
      ev.dataTransfer.setData(DRAG_TYPE, JSON.stringify(bankDrag));
      ev.dataTransfer.setData("text/plain", bankDrag.map((x) => BYID[x].name).join("\n"));
      document.body.classList.add("bankdragging");
    });
    $("results").addEventListener("dragend", () => {
      bankDrag = null;
      document.body.classList.remove("bankdragging");
      showDropMark(null);
    });
    const zone = document.querySelector(".quiz");
    zone.addEventListener("dragover", (ev) => {
      if (!bankDrag) return;
      ev.preventDefault();
      ev.dataTransfer.dropEffect = "copy";
      showDropMark(dropIndex(ev.clientY));
    });
    zone.addEventListener("dragleave", (ev) => {
      if (bankDrag && !zone.contains(ev.relatedTarget)) showDropMark(null);
    });
    zone.addEventListener("drop", (ev) => {
      if (!bankDrag) return;
      ev.preventDefault();
      const at = dropIndex(ev.clientY);
      const ids = bankDrag;
      showDropMark(null);
      addQuestions(ids, at);
      for (const id of ids) pickedBank.delete(id);
      renderResults();
    });
  }

  // Position in quiz.items for a drop at height y: before the first item below it.
  function dropIndex(y) {
    for (const li of $("selected").querySelectorAll("li.qitem, li.pbreak")) {
      const r = li.getBoundingClientRect();
      if (y < r.top + r.height / 2) return +li.dataset.k;
    }
    return quiz.items.length;
  }

  function showDropMark(index) {
    document.querySelectorAll(".dropmark").forEach((m) => m.remove());
    $("selected").classList.toggle("droptarget", index !== null);
    if (index === null) return;
    const mark = document.createElement("li");
    mark.className = "dropmark";
    mark.textContent = bankDrag && bankDrag.length > 1 ? `כאן יתווספו ${bankDrag.length} שאלות` : "כאן תתווסף השאלה";
    let before = $("selected").querySelector(`:scope > li[data-k="${index}"]`);
    // Above the "+ new page here" button that belongs to that question, not between them.
    if (before && before.previousElementSibling && before.previousElementSibling.classList.contains("insert")) {
      before = before.previousElementSibling;
    }
    if (before) $("selected").insertBefore(mark, before);
    else $("selected").appendChild(mark);
  }

  // ------------------------------------------------------------------ quiz panel

  const behaviourOptions = (sel) => `<option value="">לפי המבדק</option>` +
    Object.entries(BEHAVIOURS).map(([k, v]) => `<option value="${k}"${sel === k ? " selected" : ""}>${v}</option>`).join("");

  function renderQuiz() {
    $("q-title").value = quiz.title;
    $("q-grade").value = quiz.grade;
    $("q-behaviour").value = quiz.behaviour;
    $("q-perpage").value = quiz.questionsperpage;
    renderFolderSelect();
    for (const when of ["during", "after"]) {
      for (const k of Object.keys(REVIEW)) {
        const box = document.querySelector(`#review-${when} input[data-k="${k}"]`);
        if (box) box.checked = !!quiz.review[when][k];
      }
    }

    const pages = pagesOf(quiz);
    const perPageCount = pages.reduce((c, p) => ((c[p] = (c[p] || 0) + 1), c), {});
    const pageHead = (p, k) => `${p === 1 ? '<li class="pagehead first">' : `<li class="pagehead pbreak" data-k="${k}">`}` +
      `${p > 1 ? '<span class="drag" title="גררו כדי להזיז את מעבר העמוד" aria-hidden="true">⠿</span>' : ""}` +
      `<span>עמוד ${p} <small>(${perPageCount[p]} ${perPageCount[p] === 1 ? "שאלה" : "שאלות"})</small></span>` +
      `${p > 1 ? '<button type="button" class="btn small ghost" data-act="unbreak" title="ביטול מעבר העמוד (מיזוג עם העמוד הקודם)">✕</button>' : ""}</li>`;

    for (const e of [...picked]) if (!quiz.items.includes(e)) picked.delete(e);
    unselectAll($("selected"));
    const totals = countInQuiz(), copies = {};
    let html = "", page = 1, qi = 0;
    if (quiz.items.length) html += pageHead(1);
    quiz.items.forEach((e, k) => {
      if (e.break) { page++; html += pageHead(page, k); return; }
      const prev = quiz.items[k - 1];
      if (prev && !prev.break) {
        html += `<li class="insert"><button type="button" data-act="break" data-k="${k}">+ עמוד חדש כאן</button></li>`;
      }
      const q = BYID[e.id];
      const effective = e.behaviour || quiz.behaviour;
      copies[e.id] = (copies[e.id] || 0) + 1;
      const copy = totals[e.id] > 1 ? `<span class="copy">עותק ${copies[e.id]}</span>` : "";
      html += `<li class="qitem" data-k="${k}">
        <div class="row1">
          <input type="checkbox" class="pick" data-act="pick" title="סימון (לגרירה או להסרה של כמה שאלות יחד)" ${picked.has(e) ? "checked" : ""}>
          <span class="drag" title="גררו כדי לשנות את הסדר" aria-hidden="true">⠿</span>
          <span class="num">${++qi}.</span>
          <span class="name" title="${esc(q.name)}">${esc(q.name)}</span>${copy}
          <button type="button" class="btn small ghost" data-act="preview" title="תצוגה מקדימה">👁</button>
          <button type="button" class="btn small ghost" data-act="duplicate" title="הוספת עותק של השאלה">⧉</button>
          <button type="button" class="btn small ghost" data-act="remove" title="הסרה">✕</button>
        </div>
        <div class="row2">
          <select data-act="behaviour" aria-label="התנהגות">${behaviourOptions(e.behaviour || "")}</select>
          ${effective === "interactive" ? `<label>ניסיונות <input type="number" min="1" data-act="tries" value="${e.tries || 3}"></label>` : ""}
        </div>
      </li>`;
    });
    $("selected").innerHTML = html;
    $("selected").querySelectorAll("li[data-k]").forEach((li) => {
      if (picked.has(quiz.items[+li.dataset.k])) selectEl(li, true);
    });
    renderPickBar();
    const n = questionsOf(quiz).length;
    $("selected-empty").hidden = n > 0;
    $("drag-hint").hidden = n === 0;
    $("make-zip").disabled = n === 0;
    renderNameWarning();
    renderSaved();
  }

  function changed() {
    quiz.items = tidyBreaks(quiz.items);
    saveDraft();
    renderQuiz();
    renderResults();
  }

  function renderPickBar() {
    const n = picked.size;
    $("q-selbar").hidden = n === 0;
    $("q-selcount").textContent = `${n} ${n === 1 ? "פריט מסומן" : "פריטים מסומנים"}`;
  }

  // MultiDrag has one selection for the whole page, so the quiz list and the saved
  // quizzes must not have selected items at the same time.
  function clearPickedSaved() {
    if (!pickedSaved.size) return;
    pickedSaved.clear();
    unselectAll($("saved"));
    $("saved").querySelectorAll("input.pick").forEach((b) => { b.checked = false; });
    renderSavedPickBar();
  }
  function clearPicked() {
    if (!picked.size) return;
    picked.clear();
    unselectAll($("selected"));
    $("selected").querySelectorAll("input.pick").forEach((b) => { b.checked = false; });
    renderPickBar();
  }

  function setPicked(li, on) {
    const item = quiz.items[+li.dataset.k];
    if (!item) return;
    if (on) clearPickedSaved();
    if (on) picked.add(item); else picked.delete(item);
    const box = li.querySelector("input.pick");
    if (box) box.checked = on;
    renderPickBar();
  }

  function onSelectedEvent(ev) {
    const act = ev.target.dataset.act;
    if (!act) return;
    if (act === "pick") {
      if (ev.type !== "change") return;
      const li = ev.target.closest("li[data-k]");
      selectEl(li, ev.target.checked);
      return setPicked(li, ev.target.checked);
    }
    if (act === "break" && ev.type === "click") {
      quiz.items.splice(+ev.target.dataset.k, 0, { break: true });
      return changed();
    }
    const li = ev.target.closest("li[data-k]");
    if (!li) return;
    const k = +li.dataset.k;
    const item = quiz.items[k];
    // An action on a selected question applies to every selected question.
    const targets = picked.has(item) ? quiz.items.filter((e) => picked.has(e) && !e.break) : [item];
    const many = targets.length > 1;
    if (ev.type === "click") {
      if (act === "unbreak") quiz.items.splice(k, 1);
      else if (act === "remove") {
        if (many && !confirm(`להסיר את ${targets.length} השאלות המסומנות?`)) return;
        quiz.items = quiz.items.filter((e) => !targets.includes(e));
        targets.forEach((e) => picked.delete(e));
        if (many) setStatus(`הוסרו ${targets.length} שאלות.`);
      } else if (act === "duplicate") {
        for (const e of targets.slice().reverse()) quiz.items.splice(quiz.items.indexOf(e) + 1, 0, { id: e.id });
        if (many) setStatus(`נוספו עותקים של ${targets.length} שאלות.`);
      } else if (act === "preview") return openPreview(item.id);
      else return;
    } else if (ev.type === "change") {
      if (act === "behaviour") {
        for (const e of targets) {
          if (ev.target.value) e.behaviour = ev.target.value; else delete e.behaviour;
          if ((e.behaviour || quiz.behaviour) === "interactive" && !e.tries) e.tries = 3;
        }
        if (many) setStatus(`ההתנהגות שונתה ל-${targets.length} שאלות: ${ev.target.value ? BEHAVIOURS[ev.target.value] : "לפי המבדק"}.`);
      } else if (act === "tries") {
        const n = Math.max(1, +ev.target.value || 1);
        for (const e of targets) if ((e.behaviour || quiz.behaviour) === "interactive") e.tries = n;
      } else return;
    }
    changed();
  }

  // Shared SortableJS options: several items can be dragged together (MultiDrag);
  // select with the checkbox or Ctrl/Cmd+click.
  const DRAG = {
    filter: "button, select, input",
    preventOnFilter: false,
    animation: 150,
    multiDrag: true,
    selectedClass: SELECTED,
    multiDragKey: "CTRL",
    avoidImplicitDeselect: true,
  };

  // Drag and drop of questions and page breaks; the order is read back after a drop.
  function bindDragAndDrop() {
    Sortable.create($("selected"), Object.assign({}, DRAG, {
      draggable: "li.qitem, li.pbreak",
      handle: ".row1, .pbreak",
      onSelect: (evt) => { if (!syncing) setPicked(evt.item, true); },
      onDeselect: (evt) => { if (!syncing) setPicked(evt.item, false); },
      onEnd() {
        quiz.items = [...$("selected").querySelectorAll("li.qitem, li.pbreak")].map((li) => quiz.items[+li.dataset.k]);
        changed();
      },
    }));
    $("q-sel-remove").addEventListener("click", () => {
      quiz.items = quiz.items.filter((e) => !picked.has(e));
      setStatus(`הוסרו ${picked.size} פריטים.`);
      picked.clear();
      changed();
    });
    $("q-sel-clear").addEventListener("click", () => { picked.clear(); renderQuiz(); });
  }

  function bindSettings() {
    $("q-behaviour").innerHTML = Object.entries(BEHAVIOURS).map(([k, v]) => `<option value="${k}">${v}</option>`).join("");
    for (const when of ["during", "after"]) {
      $(`review-${when}`).innerHTML = Object.entries(REVIEW)
        .filter(([k]) => when === "after" || k !== "attempt")
        .map(([k, v]) => `<label class="check"><input type="checkbox" data-k="${k}"> ${v}</label>`).join("");
      $(`review-${when}`).addEventListener("change", (ev) => {
        quiz.review[when][ev.target.dataset.k] = ev.target.checked;
        saveDraft();
        renderSaved();
      });
    }
    $("q-title").addEventListener("input", (ev) => {
      quiz.title = ev.target.value;
      saveDraft();
      renderNameWarning();
      renderSaved();
    });
    // Folder: a search field over the existing folders; a new name creates the folder on save.
    $("q-folder").addEventListener("input", (ev) => {
      quiz.folder = resolveFolder(ev.target.value).name;
      saveDraft();
      renderFolderHint();
      renderSaved();
    });
    $("q-folder").addEventListener("change", (ev) => {
      quiz.folder = resolveFolder(ev.target.value).name;
      ev.target.value = quiz.folder;
      saveDraft();
      renderFolderHint();
      renderSaved();
    });
    // Settings do not change the question list, so it is not redrawn: a "change" fired by
    // leaving the field must not swallow a click on a result card.
    const setting = () => { saveDraft(); renderQuiz(); };
    $("q-grade").addEventListener("change", (ev) => { quiz.grade = Math.max(1, +ev.target.value || 10); setting(); });
    $("q-behaviour").addEventListener("change", (ev) => { quiz.behaviour = ev.target.value; setting(); });
    $("q-perpage").addEventListener("change", (ev) => { quiz.questionsperpage = Math.max(0, +ev.target.value || 0); setting(); });
    $("repaginate").addEventListener("click", () => {
      const per = +quiz.questionsperpage || 0;
      if (quiz.items.some((e) => e.break) &&
          !confirm(`לסדר את כל המבדק מחדש, ${per ? `${per} שאלות בכל עמוד` : "הכול בעמוד אחד"}? מעברי העמוד הנוכחיים יימחקו.`)) return;
      quiz.items = paginate(quiz.items, per);
      changed();
    });
  }

  // ------------------------------------------------------------------ names and folders

  const sameName = (a, b) => normaliseText(a).trim() === normaliseText(b).trim();

  // Another saved quiz with this name (names are unique, ignoring case and spaces at the ends).
  const nameOwner = (title, exceptId) => savedList().find((s) => s.id !== exceptId && sameName(s.quiz.title, title));

  function uniqueName(base, exceptId) {
    if (!nameOwner(base, exceptId)) return base;
    for (let i = 2; ; i++) if (!nameOwner(`${base} (${i})`, exceptId)) return `${base} (${i})`;
  }

  function renderNameWarning() {
    const owner = quiz.title.trim() && nameOwner(quiz.title, quiz.savedId);
    $("namewarn").hidden = !owner;
    if (owner) $("namewarn").textContent = `⚠ כבר יש מבדק שמור בשם "${owner.quiz.title}". בחרו שם אחר לפני השמירה.`;
  }

  function askFolderName(message, current) {
    const name = (prompt(message, current || "") || "").trim();
    if (!name) return null;
    if (sameName(name, NO_FOLDER_LABEL)) { alert(`"${NO_FOLDER_LABEL}" שמור למבדקים שאינם בתיקייה. בחרו שם אחר.`); return null; }
    if (folderList().some((f) => sameName(f, name) && f !== current)) {
      alert(`כבר יש תיקייה בשם "${name}".`);
      return null;
    }
    store(FOLDERS_KEY, [...new Set([...load(FOLDERS_KEY, []), name])]);
    return name;
  }

  function renderFolderSelect() {
    $("folder-options").innerHTML = `<option value="${NO_FOLDER_LABEL}"></option>` +
      folderList().map((f) => `<option value="${esc(f)}"></option>`).join("");
    if (document.activeElement !== $("q-folder")) $("q-folder").value = quiz.folder || "";
    renderFolderHint();
  }

  const NO_FOLDER_LABEL = "ללא תיקייה";

  // Text typed in a folder field -> {name, isNew}.  Empty or "ללא תיקייה" = no folder.
  function resolveFolder(text) {
    const t = (text || "").trim();
    if (!t || sameName(t, NO_FOLDER_LABEL)) return { name: NO_FOLDER, isNew: false };
    const existing = folderList().find((f) => sameName(f, t));
    return existing ? { name: existing, isNew: false } : { name: t, isNew: true };
  }

  function createFolder(name) {
    store(FOLDERS_KEY, [...new Set([...load(FOLDERS_KEY, []), name])]);
  }

  // Move saved quizzes to a folder typed in a search field; a new name is created after confirmation.
  function moveSaved(ids, text) {
    const target = resolveFolder(text);
    if (target.isNew && !confirm(`אין תיקייה בשם "${target.name}". ליצור אותה ולהעביר אליה ${ids.length === 1 ? "את המבדק" : `${ids.length} מבדקים`}?`)) return false;
    if (target.isNew) createFolder(target.name);
    const saved = savedList();
    for (const s of saved) if (ids.includes(s.id)) s.quiz.folder = target.name;
    store(SAVED_KEY, saved);
    if (ids.includes(quiz.savedId)) { quiz.folder = target.name; saveDraft(); }
    openFolders.add(target.name);
    store("stack-site:open-folders", [...openFolders]);
    ids.forEach((id) => pickedSaved.delete(id));
    renderQuiz();
    setStatus(`${ids.length === 1 ? "המבדק הועבר" : `${ids.length} מבדקים הועברו`} ל${target.name ? `תיקייה ${target.isNew ? "החדשה " : ""}"${target.name}"` : '"ללא תיקייה"'}.`);
    return true;
  }

  const isNewFolder = (name) => resolveFolder(name).isNew;

  function renderFolderHint() {
    const name = (quiz.folder || "").trim();
    $("folderhint").hidden = !isNewFolder(name);
    if (isNewFolder(name)) $("folderhint").textContent = `📁 תיקייה חדשה בשם "${name}" תיווצר כשתשמרו את המבדק.`;
  }

  // Saved quizzes from older versions may share a name: rename the later ones once.
  function fixDuplicateNames() {
    const saved = savedList();
    const seen = [];
    const renamed = [];
    for (const s of saved.slice().reverse()) {          // oldest keeps its name
      let title = (s.quiz.title || "").trim() || "ללא שם";
      if (seen.some((t) => sameName(t, title))) {
        let i = 2;
        while (seen.some((t) => sameName(t, `${title} (${i})`))) i++;
        title = `${title} (${i})`;
        renamed.push(title);
      }
      s.quiz.title = title;
      seen.push(title);
    }
    if (renamed.length) {
      store(SAVED_KEY, saved);
      setStatus(`היו מבדקים שמורים עם אותו שם. הם קיבלו שמות ייחודיים: ${renamed.join(", ")}`);
    }
  }

  // ------------------------------------------------------------------ saved quizzes

  const definition = (q) => { const d = JSON.parse(JSON.stringify(q)); delete d.savedId; return d; };

  function isDirty() {
    if (!quiz.savedId) return questionsOf(quiz).length > 0;
    const entry = savedList().find((s) => s.id === quiz.savedId);
    return !entry || JSON.stringify(definition(normalise(entry.quiz))) !== JSON.stringify(definition(quiz));
  }

  const openFolders = new Set(load("stack-site:open-folders", [""]));

  function renderSaved() {
    const saved = savedList();
    const words = normaliseText($("saved-search").value).split(/\s+/).filter(Boolean);
    const matches = (s) => {
      const qs = (s.quiz.items || s.quiz.questions || []).filter((e) => !e.break);
      const hay = normaliseText(`${s.quiz.title} ${qs.map((e) => (BYID[e.id] || {}).name || e.id).join(" ")}`);
      return words.every((w) => hay.includes(w));
    };
    const groups = [NO_FOLDER, ...folderList()];
    let html = "";
    for (const folder of groups) {
      const all = saved.filter((s) => (s.quiz.folder || NO_FOLDER) === folder);
      // A folder whose name matches is shown with all its quizzes.
      const folderMatch = folder && words.length && words.every((w) => normaliseText(folder).includes(w));
      const shown = folderMatch ? all : all.filter(matches);
      if (words.length && !shown.length && !folderMatch) continue;
      const open = words.length || openFolders.has(folder);
      html += `<details class="folder${folderMatch ? " match" : ""}" data-folder="${esc(folder)}"${open ? " open" : ""}>
        <summary><span class="fname">${folder ? "📁 " + esc(folder) : "ללא תיקייה"}</span> <small>(${all.length})</small>
          ${folder ? `<button type="button" class="btn small ghost" data-act="rename-folder" title="שינוי שם התיקייה">✎</button>
          <button type="button" class="btn small ghost" data-act="delete-folder" title="מחיקת התיקייה">🗑</button>` : ""}
        </summary>
        <ul data-folder="${esc(folder)}">${shown.map(savedRow).join("") || '<li class="empty">התיקייה ריקה – אפשר לגרור לכאן מבדקים</li>'}</ul>
      </details>`;
    }
    const nothing = !saved.length && !folderList().length;
    for (const id of [...pickedSaved]) if (!saved.some((s) => s.id === id)) pickedSaved.delete(id);
    unselectAll($("saved"));
    $("saved").innerHTML = nothing ? "" : html;
    $("saved-empty").hidden = !nothing;
    $("saved-hint").hidden = saved.length < 2 && !folderList().length;
    bindSavedDrag(words.length > 0);
    $("saved").querySelectorAll("li[data-id]").forEach((li) => { if (pickedSaved.has(li.dataset.id)) selectEl(li, true); });
    renderSavedPickBar();
    $("saved-search").hidden = saved.length < 2;

    // Which quiz is being edited, and whether it has unsaved changes.
    const entry = saved.find((s) => s.id === quiz.savedId);
    const dirty = isDirty();
    $("editing").innerHTML = entry
      ? `עורכים את המבדק השמור "${esc(entry.quiz.title || "ללא שם")}"${dirty ? ' · <b class="dirty">יש שינויים שלא נשמרו</b>' : " · שמור"}`
      : questionsOf(quiz).length ? '<b class="dirty">מבדק חדש שעוד לא נשמר</b>' : "";
    $("save").textContent = entry ? "שמירת השינויים" : "שמירה";
    $("save-copy").hidden = !entry;
  }

  function savedRow(s) {
    const current = s.id === quiz.savedId;
    const n = (s.quiz.items || s.quiz.questions || []).filter((e) => !e.break).length;
    return `<li data-id="${esc(s.id)}" class="${current ? "current" : ""}">
      <input type="checkbox" class="pick" data-act="pick" title="סימון (לגרירה, העברה או מחיקה של כמה מבדקים יחד)" ${pickedSaved.has(s.id) ? "checked" : ""}>
      <span class="drag" title="גררו לתיקייה (לכותרת שלה) או למקום אחר ברשימה" aria-hidden="true">⠿</span>
      <span class="sname">${esc(s.quiz.title || "ללא שם")} <small>(${n} שאלות)</small>
        ${current ? '<span class="badge editing">פתוח לעריכה</span>' : ""}</span>
      <span class="sdate">${new Date(s.updated).toLocaleString("he-IL", { dateStyle: "short", timeStyle: "short" })}</span>
      <input type="search" class="moveto" data-act="move" list="folder-options" autocomplete="off"
        value="${esc(s.quiz.folder || "")}" placeholder="${NO_FOLDER_LABEL}"
        title="העברה לתיקייה – הקלידו לחיפוש" aria-label="העברה לתיקייה">
      <button type="button" class="btn small" data-act="open" ${current ? "disabled" : ""}
        title="טעינת המבדק לאזור 'המבדק שלי' כדי לערוך אותו או ליצור ממנו ZIP">עריכה</button>
      <button type="button" class="btn small ghost" data-act="delete" title="מחיקה">🗑</button>
    </li>`;
  }

  // Drag saved quizzes within and between folders (one SortableJS list per folder).
  // Off while searching, because hidden quizzes would lose their place.
  let savedSortables = [];
  let draggingSaved = false;
  function bindSavedDrag(searching) {
    savedSortables.forEach((s) => s.destroy());
    savedSortables = [...$("saved").querySelectorAll("details.folder > ul")].map((ul) => Sortable.create(ul, Object.assign({}, DRAG, {
      group: "saved",
      draggable: "li[data-id]",
      disabled: searching,
      onSelect: (evt) => { if (!syncing) setPickedSaved(evt.item, true); },
      onDeselect: (evt) => { if (!syncing) setPickedSaved(evt.item, false); },
      onStart: () => { draggingSaved = true; },
      onEnd: (evt) => {
        draggingSaved = false;
        const target = dropFolder;
        setDropFolder(null);
        const saved = savedList();
        const byId = Object.fromEntries(saved.map((s) => [s.id, s]));
        if (target) {
          // Dropped on a folder title: everything dragged goes into that folder.
          // MultiDrag's selection is page-wide: keep only saved quizzes.
          const ids = (evt.items && evt.items.length ? evt.items : [evt.item])
            .map((li) => li.dataset && li.dataset.id).filter((id) => id && byId[id]);
          for (const id of ids) byId[id].quiz.folder = target.dataset.folder;
          store(SAVED_KEY, saved);
          if (ids.includes(quiz.savedId)) { quiz.folder = target.dataset.folder; saveDraft(); }
          openFolders.add(target.dataset.folder);
          store("stack-site:open-folders", [...openFolders]);
          renderQuiz();
          return setStatus(`${ids.length === 1 ? "המבדק הועבר" : `${ids.length} מבדקים הועברו`} ל${target.dataset.folder ? `תיקייה "${target.dataset.folder}"` : '"ללא תיקייה"'}.`);
        }
        const order = [];
        for (const list of $("saved").querySelectorAll("details.folder > ul")) {
          for (const li of list.querySelectorAll("li[data-id]")) {
            const entry = byId[li.dataset.id];
            entry.quiz.folder = list.dataset.folder;
            order.push(entry);
          }
        }
        for (const s of saved) if (!order.includes(s)) order.push(s);
        store(SAVED_KEY, order);
        const mine = byId[quiz.savedId];
        if (mine) { quiz.folder = mine.quiz.folder; saveDraft(); }
        renderQuiz();
      },
    })));
  }

  // While dragging saved quizzes, a folder title under the pointer is a drop target.
  let dropFolder = null;
  function setDropFolder(det) {
    if (dropFolder === det) return;
    if (dropFolder) dropFolder.classList.remove("droptarget");
    dropFolder = det;
    if (det) det.classList.add("droptarget");
  }
  function onDragOverFolder(ev) {
    if (!draggingSaved) return;
    const summary = ev.target.closest && ev.target.closest("#saved details.folder > summary");
    setDropFolder(summary ? summary.parentElement : null);
    if (summary) ev.preventDefault();      // allow dropping here
  }

  function renderSavedPickBar() {
    const n = pickedSaved.size;
    $("s-selbar").hidden = n === 0;
    $("s-selcount").textContent = `${n} ${n === 1 ? "מבדק מסומן" : "מבדקים מסומנים"}`;
    if (!n) $("s-sel-move").value = "";
  }

  function setPickedSaved(li, on) {
    if (on) clearPicked();
    if (on) pickedSaved.add(li.dataset.id); else pickedSaved.delete(li.dataset.id);
    const box = li.querySelector("input.pick");
    if (box) box.checked = on;
    renderSavedPickBar();
  }

  function bindSavedSelection() {
    const go = () => {
      if (!pickedSaved.size) return;
      if (!$("s-sel-move").value.trim()) return setStatus('הקלידו או בחרו תיקייה (או "ללא תיקייה").', true);
      if (moveSaved([...pickedSaved], $("s-sel-move").value)) $("s-sel-move").value = "";
    };
    $("s-sel-move-go").addEventListener("click", go);
    $("s-sel-move").addEventListener("keydown", (ev) => { if (ev.key === "Enter") go(); });
    $("s-sel-delete").addEventListener("click", () => {
      const n = pickedSaved.size;
      if (!confirm(`למחוק ${n} מבדקים שמורים? אי אפשר לבטל את המחיקה.`)) return;
      store(SAVED_KEY, savedList().filter((s) => !pickedSaved.has(s.id)));
      if (pickedSaved.has(quiz.savedId)) { delete quiz.savedId; saveDraft(); }
      pickedSaved.clear();
      renderQuiz();
      setStatus(`${n} מבדקים נמחקו.`);
    });
    $("s-sel-clear").addEventListener("click", () => { pickedSaved.clear(); renderSaved(); });
  }

  function saveQuiz(asNew) {
    if (!questionsOf(quiz).length) return setStatus("אין מה לשמור – המבדק ריק.", true);
    if (!quiz.title.trim()) {
      $("q-title").focus();
      return setStatus("תנו שם למבדק לפני השמירה.", true);
    }
    const saved = savedList();
    if (asNew) {
      quiz.title = uniqueName(`${quiz.title.trim().replace(/ \(עותק\)( \(\d+\))?$/, "")} (עותק)`);
      quiz.savedId = null;
    } else if (nameOwner(quiz.title, quiz.savedId)) {
      $("q-title").focus();
      return setStatus(`כבר יש מבדק שמור בשם "${quiz.title.trim()}". בחרו שם אחר.`, true);
    }
    quiz.title = quiz.title.trim();
    const target = resolveFolder(quiz.folder);
    const created = target.isNew ? target.name : null;
    quiz.folder = target.name;
    if (created) createFolder(created);
    quiz.savedId = quiz.savedId || `q${Date.now().toString(36)}`;
    const entry = { id: quiz.savedId, updated: Date.now(), quiz: JSON.parse(JSON.stringify(quiz)) };
    const i = saved.findIndex((s) => s.id === quiz.savedId);
    if (i >= 0) saved[i] = entry; else saved.unshift(entry);
    store(SAVED_KEY, saved);
    openFolders.add(quiz.folder || NO_FOLDER);
    store("stack-site:open-folders", [...openFolders]);
    saveDraft();
    renderQuiz();
    setStatus(`המבדק "${quiz.title}" נשמר${quiz.folder ? ` בתיקייה ${created ? "החדשה " : ""}"${quiz.folder}"` : ""}.`);
  }

  function onSavedEvent(ev) {
    const act = ev.target.dataset.act;
    const folderEl = ev.target.closest("details.folder");
    if (act === "rename-folder" || act === "delete-folder") {
      ev.preventDefault();                       // do not toggle the <details>
      const old = folderEl.dataset.folder;
      if (act === "rename-folder") {
        const name = askFolderName("שם חדש לתיקייה:", old);
        if (name === null || name === old) return;
        store(FOLDERS_KEY, load(FOLDERS_KEY, []).filter((f) => f !== old));
        store(SAVED_KEY, savedList().map((s) => (s.quiz.folder === old ? (s.quiz.folder = name, s) : s)));
        if (quiz.folder === old) quiz.folder = name;
        setStatus(`התיקייה "${old}" נקראת עכשיו "${name}".`);
      } else {
        const n = savedList().filter((s) => s.quiz.folder === old).length;
        if (!confirm(`למחוק את התיקייה "${old}"?${n ? ` ${n} המבדקים שבה יעברו ל"ללא תיקייה" (הם לא יימחקו).` : ""}`)) return;
        store(FOLDERS_KEY, load(FOLDERS_KEY, []).filter((f) => f !== old));
        store(SAVED_KEY, savedList().map((s) => (s.quiz.folder === old ? (s.quiz.folder = NO_FOLDER, s) : s)));
        if (quiz.folder === old) quiz.folder = NO_FOLDER;
        setStatus(`התיקייה "${old}" נמחקה.`);
      }
      saveDraft();
      return renderQuiz();
    }
    if (ev.type === "toggle" && folderEl && ev.target === folderEl) {
      if (folderEl.open) openFolders.add(folderEl.dataset.folder); else openFolders.delete(folderEl.dataset.folder);
      store("stack-site:open-folders", [...openFolders]);
      return;
    }
    const li = ev.target.closest("li[data-id]");
    if (!li || !act) return;
    if (act === "pick") {
      if (ev.type !== "change") return;
      selectEl(li, ev.target.checked);
      return setPickedSaved(li, ev.target.checked);
    }
    const saved = savedList();
    const entry = saved.find((s) => s.id === li.dataset.id);
    if (!entry) return;
    // Move/delete on a selected quiz applies to every selected quiz.
    const ids = pickedSaved.has(entry.id) ? [...pickedSaved] : [entry.id];
    if (act === "move" && ev.type === "change") {
      if (resolveFolder(ev.target.value).name === (entry.quiz.folder || NO_FOLDER)) {
        ev.target.value = entry.quiz.folder || "";
        return;
      }
      if (!moveSaved(ids, ev.target.value)) ev.target.value = entry.quiz.folder || "";
    } else if (act === "delete" && ev.type === "click") {
      const what = ids.length === 1 ? `את המבדק "${entry.quiz.title || "ללא שם"}"` : `${ids.length} מבדקים מסומנים`;
      if (!confirm(`למחוק ${what}? אי אפשר לבטל את המחיקה.`)) return;
      store(SAVED_KEY, saved.filter((s) => !ids.includes(s.id)));
      if (ids.includes(quiz.savedId)) delete quiz.savedId;
      ids.forEach((id) => pickedSaved.delete(id));
      saveDraft();
      renderQuiz();
      setStatus(ids.length === 1 ? "המבדק נמחק." : `${ids.length} מבדקים נמחקו.`);
    } else if (act === "open" && ev.type === "click") {
      if (isDirty() && questionsOf(quiz).length && !confirm("למבדק הנוכחי יש שינויים שלא נשמרו. לפתוח את המבדק השמור במקומו?")) return;
      quiz = normalise(entry.quiz);
      quiz.savedId = entry.id;
      changed();
      $("quiz-title").scrollIntoView({ behavior: "smooth", block: "start" });
      setStatus(`המבדק "${quiz.title || "ללא שם"}" נטען לעריכה.`);
    }
  }

  // ------------------------------------------------------------------ share link

  // The definition (no answers) in the URL fragment.
  function shareLink() {
    if (!questionsOf(quiz).length) return setStatus("אין מה לשתף – המבדק ריק.", true);
    const def = definition(quiz);
    delete def.folder;
    const bytes = new TextEncoder().encode(JSON.stringify(def));
    const b64 = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const url = `${location.origin}${location.pathname}#quiz=${b64}`;
    const done = () => setStatus("הקישור הועתק. מי שיפתח אותו יקבל עותק של המבדק.");
    if (navigator.clipboard) navigator.clipboard.writeText(url).then(done, () => prompt("העתיקו את הקישור:", url));
    else prompt("העתיקו את הקישור:", url);
  }

  function loadFromHash() {
    const m = /#quiz=([A-Za-z0-9_-]+)/.exec(location.hash);
    if (!m) return false;
    try {
      const b64 = m[1].replace(/-/g, "+").replace(/_/g, "/");
      const bin = atob(b64 + "===".slice((b64.length + 3) % 4));
      const def = JSON.parse(new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0))));
      quiz = normalise(def);
      delete quiz.savedId;
      quiz.folder = NO_FOLDER;
      history.replaceState(null, "", location.pathname);
      setStatus(`נטען מבדק משותף: "${quiz.title || "ללא שם"}". אפשר לשמור אותו אצלכם.`);
      return true;
    } catch (e) {
      setStatus("הקישור לשיתוף אינו תקין.", true);
      return false;
    }
  }

  // ------------------------------------------------------------------ SCORM package

  function makeQuizData(templates) {
    const qs = questionsOf(quiz);
    const pages = pagesOf(quiz);
    return {
      title: quiz.title || "מבדק",
      behaviour: quiz.behaviour,
      grade: +quiz.grade,
      sumgrades: templates.reduce((s, t) => s + t.defaultgrade, 0),
      pages: Math.max(1, ...pages),
      decimalpoints: 2,
      review: quiz.review,
      showseed: false,
      questions: templates.map((t, i) => {
        const e = qs[i];
        const out = Object.assign({}, t, { behaviour: e.behaviour || quiz.behaviour, page: pages[i] });
        if ((e.behaviour || quiz.behaviour) === "interactive" && e.tries) out.tries = e.tries;
        return out;
      }),
    };
  }

  function manifest(ident, title) {
    const t = esc(title);
    return `<?xml version="1.0" encoding="UTF-8"?>
<manifest identifier="${ident}" version="1.0"
  xmlns="http://www.imsproject.org/xsd/imscp_rootv1p1p2"
  xmlns:adlcp="http://www.adlnet.org/xsd/adlcp_rootv1p2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.imsproject.org/xsd/imscp_rootv1p1p2 imscp_rootv1p1p2.xsd http://www.adlnet.org/xsd/adlcp_rootv1p2 adlcp_rootv1p2.xsd">
  <metadata>
    <schema>ADL SCORM</schema>
    <schemaversion>1.2</schemaversion>
  </metadata>
  <organizations default="org">
    <organization identifier="org">
      <title>${t}</title>
      <item identifier="item" identifierref="sco" isvisible="true">
        <title>${t}</title>
      </item>
    </organization>
  </organizations>
  <resources>
    <resource identifier="sco" type="webcontent" adlcp:scormtype="sco" href="index.html">
      <file href="index.html"/>
    </resource>
  </resources>
</manifest>
`;
  }

  async function makeZip() {
    const qs = questionsOf(quiz);
    if (!qs.length) return;
    const btn = $("make-zip");
    btn.disabled = true;
    try {
      setStatus("מכין את החבילה...");
      const templates = await Promise.all(qs.map((e) =>
        fetch(`data/${encodeURIComponent(e.id)}/question.json`).then((r) => r.json())));
      const quizData = makeQuizData(templates);
      const zip = new JSZip();
      zip.file("quiz.js", "window.STACK_QUIZ = " + JSON.stringify(quizData) + ";\n");
      zip.file("imsmanifest.xml", manifest(`stack-${Date.now().toString(36)}`, quizData.title));
      zip.file("quiz-definition.json", JSON.stringify(definition(quiz), null, 1));

      const files = INDEX.package.slice();
      for (const id of new Set(qs.map((e) => e.id))) for (const f of BYID[id].files) files.push([f, f]);
      let done = 0;
      const queue = files.slice();
      const worker = async () => {
        for (let item; (item = queue.shift());) {
          const r = await fetch(item[0]);
          if (!r.ok) throw new Error(`${item[0]}: ${r.status}`);
          zip.file(item[1], await r.arrayBuffer());
          if (++done % 20 === 0) setStatus(`מוריד קבצים... ${done}/${files.length}`);
        }
      };
      await Promise.all(Array.from({ length: 8 }, worker));
      setStatus("אורז...");
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(quizData.title || "quiz").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-")}.zip`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
      setStatus(`החבילה נוצרה (${(blob.size / 1e6).toFixed(1)}MB, ${qs.length} שאלות).`);
      $("help-grade").textContent = quizData.grade;
      $("moodle-help").hidden = false;
    } catch (e) {
      console.error(e);
      setStatus("יצירת החבילה נכשלה: " + e.message, true);
    } finally {
      btn.disabled = questionsOf(quiz).length === 0;
    }
  }

  // ------------------------------------------------------------------ preview

  let previewId = null;

  function openPreview(id, variant) {
    previewId = id;
    const q = BYID[id];
    $("preview-title").textContent = q.name;
    $("preview-variant").textContent = "";
    $("preview-add").disabled = q.status !== "ready";
    $("preview-add").textContent = countInQuiz()[id] ? "הוספה פעם נוספת" : "הוספה למבדק";
    $("preview-frame").src = `preview.html?q=${encodeURIComponent(id)}${variant ? `&v=${variant}` : ""}&r=${Date.now()}`;
    if (!$("preview").open) $("preview").showModal();
  }

  window.addEventListener("message", (ev) => {
    const d = ev.data;
    if (d && d.type === "stack-preview" && d.q === previewId) {
      $("preview-variant").textContent = `גרסה ${d.v} מתוך ${d.n}`;
    }
  });

  // ------------------------------------------------------------------ misc

  function setStatus(text, error) {
    const el = $("status");
    el.textContent = text;
    el.classList.toggle("error", !!error);
  }

  async function init() {
    INDEX = await (await fetch("index.json")).json();
    BYID = Object.fromEntries(INDEX.questions.map((q) => [q.id, q]));
    $("built").textContent = `${INDEX.questions.length} שאלות · עודכן ${new Date(INDEX.built).toLocaleDateString("he-IL")}`;
    TREE = buildTree();

    fixDuplicateNames();
    bindSettings();
    bindDragAndDrop();
    bindBankSelection();
    bindBankDrag();
    if (!loadFromHash()) quiz = normalise(load(DRAFT_KEY, null));
    saveDraft();
    renderQuiz();
    renderResults();

    $("search").addEventListener("input", renderResults);
    $("collapse-all").addEventListener("click", collapseAll);
    $("subcats").checked = !!load(SUBCATS_KEY, false);
    $("subcats").addEventListener("change", () => { store(SUBCATS_KEY, $("subcats").checked); renderResults(); });
    $("tree").addEventListener("click", (ev) => {
      const t = ev.target.closest("[data-toggle], [data-select]");
      if (!t) return;
      if (t.dataset.toggle !== undefined) toggleNode(t.dataset.toggle);
      else selectCategory(t.dataset.select);
    });
    $("readyonly").addEventListener("change", renderResults);
    $("results").addEventListener("click", (ev) => {
      const t = ev.target.closest("[data-add], [data-preview]");
      if (!t) return;
      if (t.dataset.add) addQuestion(t.dataset.add);
      else if (t.dataset.preview) openPreview(t.dataset.preview);
    });
    $("selected").addEventListener("click", onSelectedEvent);
    $("selected").addEventListener("change", onSelectedEvent);
    $("saved").addEventListener("click", onSavedEvent);
    $("saved").addEventListener("change", onSavedEvent);
    $("saved").addEventListener("toggle", onSavedEvent, true);
    $("saved-search").addEventListener("input", renderSaved);
    document.addEventListener("focusin", (ev) => {
      if (ev.target.matches && ev.target.matches('input[list="folder-options"]')) ev.target.select();
    });
    document.addEventListener("dragover", onDragOverFolder, true);
    document.addEventListener("drop", (ev) => { if (dropFolder) ev.preventDefault(); }, true);
    bindSavedSelection();
    $("new-folder").addEventListener("click", () => {
      const name = askFolderName("שם התיקייה החדשה:");
      if (name === null) return;
      openFolders.add(name);
      store("stack-site:open-folders", [...openFolders]);
      renderQuiz();
      setStatus(`נוצרה התיקייה "${name}". אפשר לשמור אליה מבדק (בחירה ליד שם המבדק) או להעביר אליה מבדקים מהרשימה.`);
    });
    $("make-zip").addEventListener("click", makeZip);
    $("save").addEventListener("click", () => saveQuiz(false));
    $("save-copy").addEventListener("click", () => saveQuiz(true));
    $("share").addEventListener("click", shareLink);
    $("new").addEventListener("click", () => {
      if (isDirty() && questionsOf(quiz).length && !confirm("להתחיל מבדק חדש? שינויים שלא נשמרו יאבדו.")) return;
      quiz = emptyQuiz();
      changed();
      setStatus("");
    });
    $("preview-close").addEventListener("click", () => { $("preview").close(); $("preview-frame").src = "about:blank"; });
    $("preview-other").addEventListener("click", () => openPreview(previewId));
    $("preview-add").addEventListener("click", () => {
      addQuestion(previewId);
      $("preview-add").textContent = "הוספה פעם נוספת";
    });
  }

  init().catch((e) => {
    console.error(e);
    setStatus("טעינת המאגר נכשלה: " + e.message, true);
  });
})();
