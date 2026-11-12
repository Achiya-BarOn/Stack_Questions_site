/*
 * Submissions review: reads Moodle's SCORM interactions report (downloaded as Excel, ODS
 * or text) for a quiz package made by this site, and shows every attempt – the quiz
 * layout, each submission (time, answer, mark), the attempt rendered in the player – with
 * manual mark changes and a grades file for Moodle's gradebook import.
 *
 * What the package reports is described in player/player.js ("reporting to Moodle").
 * Everything runs in the browser; nothing from the report leaves it.  Manual marks are
 * kept in localStorage.
 *
 * Package mode: every quiz package carries this page (review.html, with the quiz's
 * quiz.js; tools/build-scorm/build.py), opened by a teacher from inside Moodle
 * (player/teacher.js).  There the report is read from Moodle directly, the questions are
 * the package's own, and the package with manual marks is built from its own files.
 * It all stays in Moodle's site.
 */
(() => {
  "use strict";

  const PACKAGE = window.STACK_QUIZ || null;

  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const ltr = (s) => `<span dir="ltr">${s}</span>`;
  const fmt = (x, d = 2) => (x === null || x === undefined || Number.isNaN(x) ? "–" : (+x).toFixed(d).replace(/\.?0+$/, ""));

  const SUBMISSION_RE = /^q(\d+)_([^_\s]+)_v(\d+)_t(\d+)_d(\d{8})(?:T(\d{6}))?$/;
  const LAYOUT_RE = /^quiz_(\d+)of(\d+)_d(\d{8})T(\d{6})$/;
  const ENCODED_RE = /^B[A-Za-z0-9_-]+$/;
  const RESULT_RE = /^(-?\d+(\.\d+)?|neutral|correct|wrong|unanticipated)$/;
  const DEFAULT_BEHAVIOUR = "adaptivenopenalty";

  function setStatus(text, error) {
    const el = $("status");
    el.textContent = text;
    el.classList.toggle("error", !!error);
  }

  class ReportError extends Error {}

  // ------------------------------------------------------------------ reading the file

  function parseDelimited(text) {
    text = text.replace(/^﻿/, "");
    const firstLine = text.slice(0, text.indexOf("\n") >>> 0);
    const sep = firstLine.includes("\t") ? "\t" : firstLine.includes(";") && !firstLine.includes(",") ? ";" : ",";
    const rows = [];
    let row = [], cell = "", quoted = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (quoted) {
        if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
        else if (c === '"') quoted = false;
        else cell += c;
      } else if (c === '"' && cell === "") quoted = true;
      else if (c === sep) { row.push(cell); cell = ""; }
      else if (c === "\n" || c === "\r") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        row.push(cell); rows.push(row); row = []; cell = "";
      } else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }

  const looksLikeId = (c) => /^(q\d+_|quiz_\d+of)/.test(String(c).trim());

  // Every sheet; the used range is taken from the cells themselves, not from the file's
  // own "dimension", which some writers get wrong (columns beyond it would be lost).
  async function readTable(file) {
    if (/\.(txt|csv)$/i.test(file.name)) return parseDelimited(await file.text());
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    let first = null;
    for (const name of wb.SheetNames) {
      const ws = wb.Sheets[name];
      const cells = Object.keys(ws).filter((k) => k[0] !== "!");
      if (!cells.length) continue;
      const range = { s: { r: Infinity, c: Infinity }, e: { r: 0, c: 0 } };
      for (const k of cells) {
        const a = XLSX.utils.decode_cell(k);
        range.s.r = Math.min(range.s.r, a.r); range.s.c = Math.min(range.s.c, a.c);
        range.e.r = Math.max(range.e.r, a.r); range.e.c = Math.max(range.e.c, a.c);
      }
      ws["!ref"] = XLSX.utils.encode_range(range);
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).map((r) => r.map((c) => String(c ?? "")));
      if (rows.some((r) => r.some(looksLikeId))) return rows;
      first = first || rows;
    }
    return first || [];
  }

  // When the report cannot be read: its shape, without names or answers (letters become
  // "a", digits "9"), for sending to whoever maintains the page.
  function shapeOf(rows) {
    const mask = (c) => String(c).trim().replace(/[A-Za-z\u0590-\u05FF]/g, "a").replace(/\d/g, "9").slice(0, 24);
    const width = Math.max(0, ...rows.map((r) => r.length));
    const lines = [`שורות: ${rows.length}, עמודות: ${width}`, "כותרות: " + (rows[0] || []).map((h) => String(h).trim()).join(" | ")];
    rows.slice(1, 4).forEach((r, i) => lines.push(`שורה ${i + 1}: ` + r.map(mask).join(" | ")));
    return lines.join("\n");
  }

  // Moodle escapes HTML in the report (s()); the packages encode answers (safeEncode).
  function unescapeHtml(s) {
    return s.replace(/&(amp|lt|gt|quot|#0?39);/g, (_, e) => ({ amp: "&", lt: "<", gt: ">", quot: '"', "#039": "'", "#39": "'" })[e]);
  }
  function decode(value) {
    const v = String(value ?? "").trim();
    if (ENCODED_RE.test(v)) {
      try {
        const bin = atob(v.slice(1).replace(/-/g, "+").replace(/_/g, "/"));
        return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
      } catch (e) { /* not encoded after all */ }
    }
    return unescapeHtml(v);
  }

  // ------------------------------------------------------------------ understanding the report
  //
  // Columns (mod/scorm/report/interactions): name, the site's identity fields (email, ID
  // number, ...), attempt, started, last accessed, score, the SCO's score, and then for each
  // interaction: question (= interaction id), response, right answer, result – each only
  // when chosen in the report's settings.

  function analyse(rows) {
    const header = rows[0] || [];
    const data = rows.slice(1).filter((r) => r.some((c) => String(c).trim()));
    const isId = (c) => SUBMISSION_RE.test(String(c).trim()) || LAYOUT_RE.test(String(c).trim());
    let first = Infinity;
    for (const r of data) r.forEach((c, i) => { if (i < first && isId(c)) first = i; });
    if (first === Infinity) {
      throw new ReportError('בקובץ אין את מזהי ההגשות. בהגדרות של "דוח תת־פעילויות בלומדה" ב-Moodle צריך לסמן את "תקציר השאלה" (Summary of question), להציג את הדוח מחדש ולהוריד שוב. ' +
        "אם זה לא עוזר: ייתכן שהמבדק נוצר לפני שהחבילות התחילו לדווח על הגשות (9.10.2026).");
    }
    if (first < 6) throw new ReportError("מבנה הקובץ לא מוכר: חסרות העמודות של שם הסטודנט, הניסיון והציון.");

    // Columns per interaction: the header cells of the first interaction share its number.
    const numberOf = (h) => (String(h).match(/\d+/) || [null])[0];
    let stride = 1;
    const n0 = numberOf(header[first]);
    if (n0 !== null) while (first + stride < header.length && numberOf(header[first + stride]) === n0) stride++;
    if (stride === 1) {        // no usable header: the distance between interaction ids
      let best = Infinity;
      for (const r of data) {
        const at = r.map((c, i) => (i >= first && isId(c) ? i : -1)).filter((i) => i >= 0);
        for (let k = 1; k < at.length; k++) best = Math.min(best, at[k] - at[k - 1]);
      }
      stride = best < Infinity ? best : Math.max(1, header.length - first);
    }
    const columnValues = (k) => data.flatMap((r) => {
      const out = [];
      for (let c = first + k; c < r.length; c += stride) if (String(r[c]).trim()) out.push(String(r[c]).trim());
      return out;
    });
    let respOffset = null, resultOffset = null;
    for (let k = 1; k < stride; k++) {
      const vals = columnValues(k);
      if (respOffset === null && vals.some((v) => ENCODED_RE.test(v) || v.includes("="))) respOffset = k;
      else if (vals.length && vals.every((v) => RESULT_RE.test(v))) resultOffset = k;
    }
    if (respOffset === null) {
      throw new ReportError('בקובץ אין את התשובות של הסטודנטים. בהגדרות של "דוח תת־פעילויות בלומדה" ב-Moodle צריך לסמן גם את "תקציר התגובות" (Summary of responses), ולהוריד שוב.');
    }

    const identity = [];
    for (let c = 1; c <= first - 6; c++) identity.push({ col: c, label: String(header[c] || "").trim() || `שדה ${c}` });
    const col = { attempt: first - 5, start: first - 4, finish: first - 3, score: first - 2, sco: first - 1 };

    const attempts = [];
    data.forEach((r) => {
      const a = {
        name: String(r[0] || "").trim(),
        ids: identity.map((f) => String(r[f.col] || "").trim()),
        attempt: parseInt(r[col.attempt], 10) || 1,
        start: String(r[col.start] || "").trim(),
        finish: String(r[col.finish] || "").trim(),
        moodle: parseFloat(r[col.score]),
        sco: String(r[col.sco] || "").trim(),
        layoutParts: [],
        items: [],
      };
      const seen = new Set();
      for (let c = first; c < r.length; c += stride) {
        const id = String(r[c] || "").trim();
        // The package writes a submission again when its commit seemed to fail (player.js,
        // commit); if the first one arrived after all, it is here twice.
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const text = decode(r[c + respOffset]);
        let m;
        if ((m = LAYOUT_RE.exec(id))) {
          a.layoutParts.push({ k: +m[1], text, stamp: m[3] + m[4] });
          if (!a.stamp) a.stamp = m[3] + m[4];      // the attempt's start
        } else if ((m = SUBMISSION_RE.exec(id))) {
          const result = resultOffset !== null ? String(r[c + resultOffset] || "").trim() : "";
          a.items.push({
            pos: +m[1], qid: m[2], v: +m[3], t: +m[4], date: m[5], time: m[6] || "",
            text, clipped: text.endsWith("..."),
            result: result === "" || result === "neutral" ? null : parseFloat(result),
            neutral: result === "neutral",
          });
        }
      }
      // In the order they were made (a submission written again comes later in the report).
      a.items.sort((x, y) => (x.date + x.time).localeCompare(y.date + y.time) || (x.pos === y.pos ? x.t - y.t : 0));
      // The attempt's start (reported by the package): identifies it across downloads.
      if (!a.stamp && a.items.length) a.stamp = a.items[0].date + a.items[0].time;
      if (a.items.length || a.layoutParts.length) attempts.push(a);
    });
    if (!attempts.length) throw new ReportError("לא נמצאו בקובץ ניסיונות עם הגשות.");
    return { identity, attempts, hasResult: resultOffset !== null };
  }

  // The quiz layout of an attempt, from its quiz_ interactions; for packages made before
  // these were reported (October 2026), a best guess from the submissions.
  function layoutOf(a, report) {
    if (a.layoutParts.length) {
      // The package reports the layout again if it was replaced by one with other questions
      // during the attempt (player.js, adoptState): the latest layout counts.
      const latest = a.layoutParts.reduce((m, p) => (p.stamp > m ? p.stamp : m), "");
      const text = a.layoutParts.filter((p) => p.stamp === latest).sort((x, y) => x.k - y.k).map((p) => p.text).join(";");
      const L = { grade: 10, sumgrades: 0, behaviour: DEFAULT_BEHAVIOUR, questions: [], exact: true };
      let absent = [];
      for (const item of text.split(";")) {
        const eq = item.indexOf("=");
        const key = item.slice(0, eq), value = item.slice(eq + 1);
        if (key === "g") L.grade = parseFloat(value);
        else if (key === "s") L.sumgrades = parseFloat(value);
        else if (key === "b") L.behaviour = value;
        else if (key === "p") L.player = value;      // the player's version (packages from 28.10.2026)
        else if (key === "n") absent = value.split(",").map(Number);    // added after the attempt was submitted
        else if (/^\d+$/.test(key)) {
          const [qid, v, w, behaviour, tries] = value.split("/");
          L.questions[+key - 1] = { qid, v: +v, w: parseFloat(w), behaviour: behaviour || "", tries: tries ? +tries : 0 };
        }
      }
      // The variants it drew, in the package's order (absent questions included): the key
      // the package recognises the attempt by, when its start stamp is not available.
      L.variants = Array.from({ length: L.questions.length }, (_, i) => (L.questions[i] ? L.questions[i].v : 0));
      for (const pos of absent) L.questions[pos - 1] = null;
      return L;
    }
    const all = report.legacyPositions;
    const max = parseFloat((a.sco.split("/")[1] || "").trim());
    const L = { grade: max > 0 ? max : 10, sumgrades: all.length, behaviour: DEFAULT_BEHAVIOUR, questions: [], exact: false };
    all.forEach((qid, i) => {
      if (!qid) return;
      const mine = a.items.find((it) => it.pos === i + 1);
      L.questions[i] = { qid, v: mine ? mine.v : 1, w: 1, behaviour: "", tries: 0, guessed: !mine };
    });
    return L;
  }

  // ------------------------------------------------------------------ questions and regrading

  const templates = {};       // qid -> question.json (null: not in the bank)
  async function template(qid) {
    if (!(qid in templates)) {
      templates[qid] = PACKAGE
        ? Promise.resolve(PACKAGE.questions.find((q) => String(q.id) === String(qid)) || null)
        : fetch(`data/${encodeURIComponent(qid)}/question.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
    }
    return templates[qid];
  }

  const ALL = { attempt: true, correctness: true, marks: true, specificfeedback: true, generalfeedback: true, rightanswer: true };

  // A player quiz for a layout.  Questions missing from the bank are left out; qiOf maps
  // positions (1-based) to the player's question index.
  async function playerQuiz(L) {
    const questions = [], qiOf = {};
    for (let i = 0; i < L.questions.length; i++) {
      const q = L.questions[i];
      if (!q) continue;
      const t = await template(q.qid);
      if (!t || q.v > t.nvariants) continue;
      qiOf[i + 1] = questions.length;
      const out = Object.assign({}, t, { defaultgrade: q.w, page: 1, behaviour: q.behaviour || L.behaviour });
      if (q.tries) out.tries = q.tries;
      questions.push(out);
    }
    const quiz = {
      title: "", behaviour: L.behaviour, grade: L.grade, sumgrades: L.sumgrades, pages: 1, decimalpoints: 2,
      review: { during: ALL, after: ALL }, showseed: false, ephemeral: true, questions,
    };
    return { quiz, qiOf };
  }

  // Jobs for review-frame.html?job=<name>, which reads parent.reviewJobs[name].
  window.reviewJobs = {};
  let jobCounter = 0;
  function frameJob(job, frame) {
    const name = `job${++jobCounter}`;
    window.reviewJobs[name] = job;
    frame.src = `review-frame.html?job=${name}`;
    return name;
  }

  function regrade(quiz, jobs) {
    return new Promise((resolve) => {
      const frame = document.createElement("iframe");
      frame.hidden = true;
      document.body.appendChild(frame);
      const name = frameJob(Object.assign({}, quiz, { batch: jobs }), frame);
      window.reviewJobs[name].batchId = name;
      const onMessage = (e) => {
        if (e.origin !== location.origin || !e.data || e.data.type !== "stack-batch" || e.data.id !== name) return;
        window.removeEventListener("message", onMessage);
        delete window.reviewJobs[name];
        frame.remove();
        resolve(e.data.results);
      };
      window.addEventListener("message", onMessage);
    });
  }

  // ------------------------------------------------------------------ state

  let report = null;          // {identity, attempts, groups, file}
  const templateNow = {};     // qid -> the loaded question (null: not in the bank)
  const selected = new Set(); // attempts ticked in the table (for a regrade)
  let page = 1;               // the page of the attempts table
  // Manual marks, for all reports: "student#attempt start#position" -> mark.
  const STORE = "stack-review:marks";
  let overrides = {};

  const whoOf = (a) => {
    const email = a.ids.find((v) => v.includes("@"));
    return email || a.ids.find((v) => v) || a.name;
  };
  const overrideKey = (a, pos) => `${whoOf(a)}#${a.stamp || a.attempt}#${pos}`;

  function loadOverrides() {
    try { overrides = JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { overrides = {}; }
  }
  function saveOverrides() {
    try {
      if (Object.keys(overrides).length) localStorage.setItem(STORE, JSON.stringify(overrides));
      else localStorage.removeItem(STORE);
    } catch (e) { /* storage unavailable: changes last until the page is closed */ }
  }

  // Question marks changed on this page ("ניקוד" in the table by question), as after
  // changing a mark in Moodle's quiz editor: position -> mark, kept per quiz in localStorage.
  let weights = {};
  let weightsKey = "";
  function loadWeights() {
    try { weights = JSON.parse(localStorage.getItem(weightsKey)) || {}; } catch (e) { weights = {}; }
  }
  function saveWeights() {
    try {
      if (Object.keys(weights).length) localStorage.setItem(weightsKey, JSON.stringify(weights));
      else localStorage.removeItem(weightsKey);
    } catch (e) { /* storage unavailable */ }
  }
  // The mark of position pos in attempt a: changed here, or as in the quiz.
  const weightOf = (a, pos) => {
    const q = a.layout.questions[pos - 1];
    return !q ? 0 : pos in weights ? weights[pos] : q.w;
  };

  // Regrades the teacher applied ("ניקוד מחדש"), for all reports, as manual marks are:
  // "student#attempt start#position" -> fraction of the question's mark.
  const REGRADES = "stack-review:regrades";
  let regrades = {};
  function loadRegrades() {
    try { regrades = JSON.parse(localStorage.getItem(REGRADES)) || {}; } catch (e) { regrades = {}; }
  }
  function saveRegrades() {
    try {
      if (Object.keys(regrades).length) localStorage.setItem(REGRADES, JSON.stringify(regrades));
      else localStorage.removeItem(REGRADES);
    } catch (e) { /* storage unavailable */ }
  }

  // The question's mark as Moodle has it now: the results the package reported for each
  // submission when it was made (the report's "result" column), as the player adds them
  // up – the best try, less the penalties of the wrong tries before it (approximately: per
  // question, not per PRT).  null: the report has no results.
  function nowFraction(a, pos) {
    if (!report.hasResult) return null;
    const mine = a.items.filter((it) => it.pos === pos && it.result !== null);
    const q = a.layout.questions[pos - 1];
    const behaviour = (q && q.behaviour) || a.layout.behaviour;
    const t = q && templateNow[q.qid];
    const penalty = (behaviour === "adaptive" || behaviour === "interactive") && t ? +t.penalty || 0 : 0;
    let best = 0, wrong = 0;
    for (const it of mine) {
      best = Math.max(best, it.result - penalty * wrong);
      if (it.result < 1) wrong++;
    }
    return Math.min(1, Math.max(0, best));
  }

  // Mark of position pos (1-based) in attempt a, out of the question's mark (weightOf):
  //   manual   set by hand on this page
  //   regraded a regrade applied on this page ("ניקוד מחדש")
  //   moodle   what the package reported (nowFraction)
  // A regrade preview counts only when asked for (preview: true).
  function markOf(a, pos, withManual = true, preview = false) {
    const k = overrideKey(a, pos);
    if (withManual && k in overrides) return { mark: overrides[k], source: "manual" };
    const w = weightOf(a, pos);
    if (preview && a.preview && pos in a.preview.frac) return { mark: a.preview.frac[pos] * w, source: "preview" };
    if (k in regrades) return { mark: regrades[k] * w, source: "regraded" };
    const f = nowFraction(a, pos);
    return { mark: (f || 0) * w, source: f === null ? "unknown" : "moodle" };
  }

  // What the submissions in the report do not explain: Moodle's grade less the grade the
  // reported results add up to.  Usually 0; more when submissions are missing from the
  // report (the package kept them and graded them, but Moodle did not keep their record).
  // It stays as it is when marks change here, so that without changes the grade is Moodle's.
  function unexplained(a) {
    if (a.unexplained === undefined) {
      const L = a.layout;
      let sum = 0, out = 0;
      L.questions.forEach((q, i) => {
        if (!q) return;
        sum += (nowFraction(a, i + 1) || 0) * q.w;
        out += q.w;
      });
      const fromReport = out ? (sum / out) * L.grade : 0;
      a.unexplained = Number.isNaN(a.moodle) ? 0 : a.moodle - fromReport;
    }
    return a.unexplained;
  }
  const UNEXPLAINED = 0.01;

  function totalOf(a, withManual = true, preview = false) {
    const L = a.layout;
    let sum = 0, out = 0;
    L.questions.forEach((q, i) => {
      if (!q) return;
      sum += markOf(a, i + 1, withManual, preview).mark;
      out += weightOf(a, i + 1);
    });
    return out ? (sum / out) * L.grade + unexplained(a) : null;
  }
  // Differs from Moodle's grade without any manual change: an applied regrade, a changed mark.
  const differs = (a) => {
    const t = totalOf(a, false);
    return t !== null && !Number.isNaN(a.moodle) && Math.abs(t - a.moodle) > 0.005;
  };

  // ------------------------------------------------------------------ loading

  async function load(file) {
    $("overview").hidden = $("attempts").hidden = $("regrade").hidden = $("export").hidden = true;
    setStatus("קורא את הקובץ...");
    let rows;
    try {
      rows = await readTable(file);
    } catch (e) {
      console.error(e);
      return setStatus("לא ניתן לקרוא את הקובץ. הורידו את הדוח מ-Moodle כקובץ Excel, ‏ODS או טקסט.", true);
    }
    try {
      report = analyse(rows);
    } catch (e) {
      if (!(e instanceof ReportError)) console.error(e);
      setStatus(e instanceof ReportError ? e.message : "שגיאה בקריאת הדוח: " + e.message, true);
      const details = document.createElement("details");
      details.className = "shape";
      details.innerHTML = "<summary>פרטים טכניים (בלי שמות ותשובות)</summary><pre dir=\"ltr\"></pre>";
      details.querySelector("pre").textContent = `${file.name}\n${shapeOf(rows)}`;
      $("status").appendChild(details);
      return;
    }
    report.file = file.name;

    // Packages from before the layout was reported: question per position from all rows.
    report.legacyPositions = [];
    for (const a of report.attempts) for (const it of a.items) report.legacyPositions[it.pos - 1] ||= it.qid;

    setStatus("טוען את השאלות מהמאגר...");
    const groups = new Map();
    for (const a of report.attempts) {
      a.layout = layoutOf(a, report);
      // Submissions made before such a change: the question by its id, wherever it moved.
      for (const it of a.items) {
        const at = a.layout.questions[it.pos - 1];
        if (at && at.qid === it.qid) continue;
        const k = a.layout.questions.findIndex((q) => q && q.qid === it.qid);
        if (k >= 0) it.pos = k + 1;
        else it.removed = true;
      }
      a.items = a.items.filter((it) => !it.removed);
      const sig = JSON.stringify([a.layout.grade, a.layout.sumgrades, a.layout.behaviour,
        a.layout.questions.map((q) => q && [q.qid, q.w, q.behaviour, q.tries])]);
      if (!groups.has(sig)) groups.set(sig, { sig, attempts: [], layout: a.layout });
      groups.get(sig).attempts.push(a);
    }
    report.groups = [...groups.values()];
    loadOverrides();
    weightsKey = "stack-review:weights:" + report.groups[0].layout.questions.map((q) => (q ? q.qid : "")).join(",");
    loadWeights();

    loadRegrades();
    selected.clear();
    page = 1;
    updatesPage = 1;
    lastPreview = null;
    $("filter").value = "";

    // The questions, for their names and penalties, the attempt as the student sees it, and
    // a regrade when the teacher asks for one.  Nothing is graded again here: the marks are
    // Moodle's, as the package reported them.
    for (const g of report.groups) {
      const { quiz, qiOf } = await playerQuiz(g.layout);
      g.quiz = quiz;
      g.qiOf = qiOf;
      for (const a of g.attempts) {
        a.qiOf = qiOf;
        a.group = g;
        a.log = a.items.filter((it) => qiOf[it.pos] !== undefined);
        // Variants: the attempt's own layout (questions may repeat with different variants).
        const v = [];
        a.layout.questions.forEach((q, i) => { if (q && qiOf[i + 1] !== undefined) v[qiOf[i + 1]] = q.v; });
        a.variants = v;
      }
    }
    for (const [qid, p] of Object.entries(templates)) templateNow[qid] = await p;
    setStatus(`נטען: ${report.file}`);
    await showAll();
  }

  // Grade the submissions of the attempts again with the questions as they are now (the
  // website's in the website, the package's own inside Moodle): positions only (null: all).
  // Sets a.preview = {frac: {position: fraction}, tries: [result per submission]}.
  async function regradeAttempts(atts, positions, progress) {
    const CHUNK = 40;
    let done = 0;
    for (const g of report.groups) {
      const mine = atts.filter((a) => a.group === g);
      for (let s = 0; s < mine.length; s += CHUNK) {
        const part = mine.slice(s, s + CHUNK);
        const jobs = part.map((a) => ({
          v: a.variants,
          log: a.log.filter((it) => !positions || positions.has(it.pos)).map((it) => ({ qi: g.qiOf[it.pos], text: it.text })),
        }));
        progress(done, atts.length);
        const results = g.quiz.questions.length ? await regrade(g.quiz, jobs) : jobs.map(() => ({ error: "no questions" }));
        part.forEach((a, i) => {
          const r = results[i];
          a.preview = null;
          if (!r || r.error) { a.regradeError = r ? r.error : "unknown"; return; }
          a.regradeError = null;
          const frac = {};
          a.layout.questions.forEach((q, k) => {
            const pos = k + 1, qi = g.qiOf[pos];
            if (!q || qi === undefined || (positions && !positions.has(pos))) return;
            frac[pos] = q.w > 0 ? Math.min(1, Math.max(0, r.marks[qi] / q.w)) : 0;
          });
          const log = a.log.filter((it) => !positions || positions.has(it.pos));
          // As in the package: a mark goes only up (unless the quiz says regrade: "full"),
          // and a submission that was graded and is now invalid (2<x<18, before the player
          // rejected chained inequalities) never lowers it.
          const keep = (pos) => { if (pos in frac) frac[pos] = Math.max(frac[pos], nowFraction(a, pos) || 0); };
          if (g.quiz.regrade !== "full") Object.keys(frac).forEach(keep);
          log.forEach((it, k) => {
            if (it.result !== null && r.tries[k] && r.tries[k].kind === "invalid") keep(it.pos);
          });
          a.preview = { frac, tries: new Map(log.map((it, k) => [it, r.tries[k]])) };
        });
        done += part.length;
      }
    }
    progress(done, atts.length);
  }

  // ------------------------------------------------------------------ dates and times

  const MONTHS = {
    "ינואר": 0, "פברואר": 1, "מרץ": 2, "מרס": 2, "אפריל": 3, "מאי": 4, "יוני": 5, "יולי": 6, "אוגוסט": 7,
    "ספטמבר": 8, "אוקטובר": 9, "נובמבר": 10, "דצמבר": 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8,
    october: 9, november: 10, december: 11,
  };
  // Moodle's dates: "יום שישי, 9 אוקטובר 2026, 4:05 PM", "9 October 2026, 4:05 PM", ...
  // In Excel/ODS downloads (BGU, Hebrew): "11/10/2026, 09:54" (day/month/year).
  function parseMoodleDate(s) {
    const d = /(\d{1,2})[/.](\d{1,2})[/.](\d{4}),?\s+(\d{1,2}):(\d{2})/.exec(s || "");
    if (d) return new Date(+d[3], +d[2] - 1, +d[1], +d[4], +d[5]);
    const m = /(\d{1,2})\s+([^\s\d,]+)\s+(\d{4}),?\s+(\d{1,2}):(\d{2})\s*(\S*)/.exec(s || "");
    if (!m) return null;
    const month = MONTHS[m[2].toLowerCase()] ?? MONTHS[m[2].toLowerCase().slice(0, 3)];
    if (month === undefined) return null;
    let h = +m[4];
    const ampm = m[6] || "";
    if (/pm|אחה/i.test(ampm) && h < 12) h += 12;
    if (/am|לפנה/i.test(ampm) && h === 12) h = 0;
    return new Date(+m[3], month, +m[1], h, +m[5]);
  }
  function duration(a) {
    const s = parseMoodleDate(a.start), f = parseMoodleDate(a.finish);
    if (!s || !f) return "";
    const min = Math.round((f - s) / 60000);
    if (min < 0) return "";
    if (min < 60) return `${min} דק'`;
    return `${Math.floor(min / 60)} שע' ${min % 60} דק'`;
  }
  const itemTime = (it) => `${+it.date.slice(6, 8)}.${+it.date.slice(4, 6)}` +
    (it.time ? ` ${it.time.slice(0, 2)}:${it.time.slice(2, 4)}:${it.time.slice(4, 6)}` : "");

  // ------------------------------------------------------------------ display

  const cls = (mark, w) => (w > 0 ? (mark >= w - 1e-9 ? "full" : mark > 1e-9 ? "part" : "zero") : "");
  const triesOf = (a, pos) => a.items.filter((it) => it.pos === pos && !it.neutral).length;
  const positions = () => {
    const n = Math.max(...report.attempts.map((a) => a.layout.questions.length));
    return Array.from({ length: n }, (_, i) => i + 1);
  };
  const questionName = (pos) => {
    for (const a of report.attempts) {
      const q = a.layout.questions[pos - 1];
      if (q) return { qid: q.qid, w: q.w };
    }
    return null;
  };

  async function showAll() {
    for (const [qid, t] of Object.entries(templateNow)) if (t) names[qid] = t.name;
    showRegradeChoices();
    $("rg-result").innerHTML = "";
    setRegradeStatus("");
    refresh();
    $("overview").hidden = $("attempts").hidden = $("regrade").hidden = $("export").hidden = false;
  }

  const gapOf = (a) => (report.hasResult ? unexplained(a) : 0);

  function showOverview() {
    const atts = report.attempts;
    const students = new Set(atts.map(whoOf));
    const totals = atts.map((a) => totalOf(a)).filter((x) => x !== null);
    const avg = totals.length ? totals.reduce((s, x) => s + x, 0) / totals.length : null;
    const grade = atts[0].layout.grade;
    $("stats").innerHTML = [
      [students.size, "סטודנטים"], [atts.length, "ניסיונות"],
      [ltr(`${fmt(avg)} / ${fmt(grade)}`), "ציון ממוצע"],
      [atts.reduce((s, a) => s + a.items.filter((it) => !it.neutral).length, 0), "הגשות"],
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");

    const notes = [];
    if (!report.hasResult) {
      notes.push('<p class="warn">בדוח אין את התוצאה של כל הגשה, ולכן הציון של כל שאלה לא ידוע: מוצג רק הציון הכולל מ-Moodle. ' +
        'בהגדרות של "דוח תת־פעילויות בלומדה" ב-Moodle סמנו גם את <b>תקציר התוצאה</b> (Summary of result), הציגו את הדוח מחדש וטענו אותו שוב.</p>');
    }
    const higher = atts.filter((a) => gapOf(a) > UNEXPLAINED);
    if (higher.length) {
      notes.push(`<p class="warn">ב-${higher.length === 1 ? "ניסיון אחד" : higher.length + " ניסיונות"} הציון ב-Moodle גבוה מסכום ההגשות שבדוח (מסומנים ב-⚠ בטבלה). ` +
        "הציון ב-Moodle הוא הנכון: החבילה בדקה את ההגשות האלה ושמרה אותן, אבל חלק מהן לא נרשמו בדוח של Moodle. " +
        'כדי לראות רק אותם: "הצגה" ← "פער מול Moodle". <details class="why"><summary>למה זה קורה?</summary>' +
        "<p>כל הגשה נשלחת ל-Moodle ברגע שהסטודנט לוחץ \"בדיקה\". אם שליחה אחת נכשלה (למשל ניתוק רגעי של הרשת), ההגשה ההיא לא נרשמת בדוח. " +
        "בחבילות שנבנו לפני 25.10.2026 הייתה לזה גם השפעה מתמשכת: כשהסטודנט חזר למבדק בפעם אחרת, Moodle סירב לרשום את <b>כל</b> ההגשות שלו מאותו רגע ואילך. " +
        "הציון עצמו המשיך להתעדכן כרגיל, ולכן הוא נכון. בחבילות חדשות זה תוקן: אחרי שליחה שנכשלה, ההגשות הבאות נרשמות כרגיל.</p>" +
        "<p>סימן מזהה: בחלון של הניסיון, השעה של ההגשה האחרונה בדוח מוקדמת בהרבה מ\"גישה אחרונה\".</p></details></p>");
    }
    const lower = atts.filter((a) => gapOf(a) < -UNEXPLAINED);
    if (lower.length) {
      notes.push(`<p class="warn">ב-${lower.length === 1 ? "ניסיון אחד" : lower.length + " ניסיונות"} הציון ב-Moodle נמוך מסכום ההגשות שבדוח ` +
        "(למשל אחרי החלפת החבילה בחבילה עם שאלה מתוקנת, או בגלל קנסות על ניסיונות חוזרים, שהדף מחשב רק בקירוב). הציון שמוצג הוא זה שב-Moodle.</p>");
    }
    const changedMarks = Object.keys(weights);
    if (changedMarks.length) notes.push(`<p class="warn">הניקוד של ${changedMarks.length === 1 ? "שאלה" : "שאלות"} ${changedMarks.join(", ")} שונה בדף הזה, והציונים מחושבים לפיו. <button type="button" class="btn small" id="reset-weights">חזרה לניקוד המקורי</button></p>`);
    if (atts.some((a) => !a.layout.exact)) notes.push('<p class="warn">חלק מהניסיונות נעשו בחבילה ישנה, שלא דיווחה את מבנה המבדק. הציונים לכל שאלה בהם מחושבים בקירוב (כל שאלה שווה נקודה אחת), ושאלות שהסטודנט לא ענה עליהן מוצגות בגרסה 1.</p>');
    if (report.groups.length > 1) notes.push('<p class="warn">בדוח יש ניסיונות ממבדקים בהרכב שונה (למשל אחרי החלפת החבילה). כל ניסיון מחושב לפי המבדק שלו.</p>');
    $("notices").innerHTML = notes.join("");
    const reset = $("reset-weights");
    if (reset) reset.onclick = () => { weights = {}; saveWeights(); refresh(); };

    let html = '<thead><tr><th>#</th><th>שאלה</th><th title="כמו &quot;ניקוד מרבי&quot; בעורך המבדקים של Moodle. שינוי כאן מחשב מחדש את הציונים של כולם.">ניקוד</th><th>ענו</th><th>ציון ממוצע</th><th>ציון מלא</th><th>הגשות בממוצע</th></tr></thead><tbody>';
    for (const pos of positions()) {
      const info = questionName(pos);
      if (!info) continue;
      const rows = atts.filter((a) => a.layout.questions[pos - 1]);
      const answered = rows.filter((a) => a.items.some((it) => it.pos === pos));
      const marks = rows.map((a) => markOf(a, pos).mark);
      const w = pos in weights ? weights[pos] : info.w;
      const avgMark = marks.length && report.hasResult ? marks.reduce((s, x) => s + x, 0) / marks.length : null;
      const full = marks.filter((m) => m >= w - 1e-9).length;
      const tries = answered.length ? answered.reduce((s, a) => s + triesOf(a, pos), 0) / answered.length : null;
      html += `<tr><td>${pos}</td><td>${resolvedName(info.qid)}</td>` +
        `<td><input type="number" class="weight${pos in weights ? " changed" : ""}" data-pos="${pos}" min="0" step="any" value="${fmt(w, 4)}"></td>` +
        `<td>${ltr(`${answered.length}/${rows.length}`)}</td>` +
        `<td>${ltr(`${fmt(avgMark)} / ${fmt(w)}`)}</td><td>${rows.length && report.hasResult ? Math.round((100 * full) / rows.length) + "%" : "–"}</td><td>${fmt(tries, 1)}</td></tr>`;
    }
    $("byquestion").innerHTML = html + "</tbody>";
    $("byquestion").querySelectorAll("input.weight").forEach((input) => {
      input.onchange = () => {
        const pos = +input.dataset.pos, v = parseFloat(input.value);
        if (!(v >= 0)) return refresh();
        const info = questionName(pos);
        if (Math.abs(v - info.w) < 1e-12) delete weights[pos]; else weights[pos] = v;
        saveWeights();
        refresh();
      };
    });
  }

  function refresh() {
    showOverview();
    showAttempts();
    showRegradeCounts();
    showUpdates();
    showManual();
  }

  const names = {};           // qid -> question name (from the loaded templates)
  function resolvedName(qid) {
    const n = names[qid];
    if (n && PACKAGE) return `${esc(n)} <small>(${esc(qid)})</small>`;
    return n ? `<a href="preview.html?q=${encodeURIComponent(qid)}" target="_blank" rel="noopener">${esc(n)}</a> <small>(${esc(qid)})</small>`
      : `${esc(qid)} <small>(לא במאגר)</small>`;
  }

  // ------------------------------------------------------------------ pages of a long list

  const PAGESIZE = "stack-review:pagesize";
  let pageSize = 15;
  try { const s = parseInt(localStorage.getItem(PAGESIZE), 10); if (s >= 0) pageSize = s; } catch (e) { /* default */ }
  $("pagesize").value = String(pageSize);
  if ($("pagesize").value !== String(pageSize)) { pageSize = 15; $("pagesize").value = "15"; }

  // The rows of page p (size 0: all), and the page controls in the elements of class "pager"
  // inside box.  go(p) shows page p.
  function paged(rows, p, box, go) {
    const pages = pageSize ? Math.max(1, Math.ceil(rows.length / pageSize)) : 1;
    p = Math.min(Math.max(1, p), pages);
    const html = pages <= 1 ? "" :
      `<button type="button" class="btn small ghost" data-p="1"${p === 1 ? " disabled" : ""}>ראשון</button>` +
      `<button type="button" class="btn small" data-p="${p - 1}"${p === 1 ? " disabled" : ""}>הקודם</button>` +
      `<span>עמוד <select class="pageno">${Array.from({ length: pages }, (_, i) => `<option value="${i + 1}"${i + 1 === p ? " selected" : ""}>${i + 1}</option>`).join("")}</select> מתוך ${pages}</span>` +
      `<button type="button" class="btn small" data-p="${p + 1}"${p === pages ? " disabled" : ""}>הבא</button>` +
      `<button type="button" class="btn small ghost" data-p="${pages}"${p === pages ? " disabled" : ""}>אחרון</button>`;
    box.querySelectorAll(".pager").forEach((el) => {
      el.innerHTML = html;
      el.querySelectorAll("button[data-p]").forEach((b) => { b.onclick = () => go(+b.dataset.p); });
      const sel = el.querySelector("select.pageno");
      if (sel) sel.onchange = () => go(+sel.value);
    });
    return { p, rows: pageSize ? rows.slice((p - 1) * pageSize, p * pageSize) : rows };
  }

  // ------------------------------------------------------------------ the attempts table

  const manualIn = (a) => a.layout.questions.some((q, i) => q && overrideKey(a, i + 1) in overrides);
  const regradedIn = (a) => a.layout.questions.some((q, i) => q && overrideKey(a, i + 1) in regrades);

  // The attempts the filter and the "show" choice keep (indices into report.attempts).
  function filtered() {
    const filter = $("filter").value.trim().toLowerCase();
    const show = $("show").value;
    const out = [];
    report.attempts.forEach((a, i) => {
      if (filter && ![a.name, ...a.ids].some((v) => v.toLowerCase().includes(filter))) return;
      if (show === "changed" && !differs(a) && !manualIn(a)) return;
      if (show === "gap" && Math.abs(gapOf(a)) <= UNEXPLAINED) return;
      if (show === "selected" && !selected.has(i)) return;
      out.push(i);
    });
    return out;
  }

  function showAttempts() {
    const pos = positions();
    const idLabel = report.identity.length ? report.identity[0].label : "";
    const rows = filtered();
    const shown = paged(rows, page, $("attempts"), (p) => { page = p; showAttempts(); });
    page = shown.p;
    $("attemptcount").textContent = rows.length === report.attempts.length ? `${rows.length} ניסיונות`
      : `${rows.length} מתוך ${report.attempts.length} ניסיונות`;
    const allTicked = shown.rows.length && shown.rows.every((i) => selected.has(i));
    let html = `<thead><tr><th class="pick"><input type="checkbox" id="pickpage" title="סימון כל הניסיונות בעמוד"${allTicked ? " checked" : ""}></th>` +
      `<th>שם</th>${idLabel ? `<th>${esc(idLabel)}</th>` : ""}<th>ניסיון</th><th>התחלה</th><th>משך</th>` +
      `<th>ציון ב-Moodle</th><th>ציון</th>${pos.map((p) => `<th class="q">ש${p}</th>`).join("")}</tr></thead><tbody>`;
    for (const i of shown.rows) {
      const a = report.attempts[i];
      const total = totalOf(a);
      const changed = differs(a);
      const manual = manualIn(a);
      const gap = gapOf(a);
      const titles = [changed && "שונה מהציון ב-Moodle", manual && "כולל שינוי ידני",
        gap > UNEXPLAINED && `הציון ב-Moodle גבוה ב-${fmt(gap)} מסכום ההגשות שבדוח: חלק מההגשות לא נרשמו בדוח`].filter(Boolean).join(". ");
      html += `<tr data-i="${i}" tabindex="0"><td class="pick"><input type="checkbox" class="pick" data-i="${i}"${selected.has(i) ? " checked" : ""}></td>` +
        `<td>${esc(a.name)}</td>${idLabel ? `<td>${esc(a.ids[0])}</td>` : ""}` +
        `<td>${a.attempt}</td><td class="nowrap">${esc(a.start)}</td><td class="nowrap">${duration(a)}</td>` +
        `<td>${fmt(a.moodle)}${gap > UNEXPLAINED ? ' <span class="gap">⚠</span>' : ""}</td>` +
        `<td class="total${changed ? " changed" : ""}${manual ? " manual" : ""}" title="${esc(titles)}">${fmt(total)}</td>`;
      for (const p of pos) {
        const q = a.layout.questions[p - 1];
        if (!q) { html += "<td></td>"; continue; }
        const m = markOf(a, p);
        const n = triesOf(a, p);
        const ungraded = !n && a.items.some((it) => it.pos === p);    // only an invalid or incomplete answer
        const visible = (n || ungraded || m.source === "manual" || m.source === "regraded") && m.source !== "unknown";
        html += `<td class="q ${visible ? cls(m.mark, weightOf(a, p)) : "none"}${m.source === "manual" ? " manual" : m.source === "regraded" ? " regraded" : ""}"` +
          `${ungraded ? ' title="התשובה לא נבדקה: לא תקינה או לא שלמה"' : m.source === "regraded" ? ' title="אחרי ניקוד מחדש"' : ""}>${visible ? fmt(m.mark) : "–"}` +
          (n > 1 ? `<sup dir="ltr" title="${n} הגשות">×${n}</sup>` : "") + "</td>";
      }
      html += "</tr>";
    }
    if (!shown.rows.length) html += `<tr><td colspan="${8 + pos.length}" class="hint">אין ניסיונות להצגה.</td></tr>`;
    $("attemptlist").innerHTML = html + "</tbody>";
    $("attemptlist").querySelectorAll("tbody tr[data-i]").forEach((tr) => {
      const open = () => openAttempt(report.attempts[+tr.dataset.i]);
      tr.onclick = (e) => { if (!e.target.closest("td.pick")) open(); };
      tr.onkeydown = (e) => { if (e.key === "Enter" && !e.target.closest("td.pick")) open(); };
    });
    $("attemptlist").querySelectorAll("input.pick").forEach((box) => {
      box.onchange = () => {
        if (box.checked) selected.add(+box.dataset.i); else selected.delete(+box.dataset.i);
        showRegradeCounts();
        $("pickpage").checked = shown.rows.every((i) => selected.has(i));
      };
    });
    $("pickpage").onchange = () => {
      for (const i of shown.rows) { if ($("pickpage").checked) selected.add(i); else selected.delete(i); }
      showAttempts();
      showRegradeCounts();
    };
    $("selcount").textContent = selected.size ? `${selected.size} מסומנים` : "";
    $("unselect").hidden = !selected.size;
  }

  // ------------------------------------------------------------------ regrade
  //
  // As Moodle's "regrade" of a quiz: the submissions are graded again with the questions as
  // they are now – the website's version (on the website) or the package's own (inside
  // Moodle, which is what the students' package does by itself when it was replaced).
  // "Preview" (Moodle's dry run) only shows what would change; "regrade" keeps the new marks
  // on this page (localStorage), where they count in the grades to update in Moodle.

  let lastPreview = null;     // {sig, atts} of the preview on the screen

  function showRegradeChoices() {
    const box = $("rg-questions");
    box.innerHTML = positions().map((p) => {
      const info = questionName(p);
      if (!info) return "";
      const title = names[info.qid] ? `${names[info.qid]} (${info.qid})` : info.qid;
      return `<label class="rgq" title="${esc(title)}"><input type="checkbox" value="${p}" checked> ש${p}</label>`;
    }).join("");
    box.querySelectorAll("input").forEach((c) => { c.onchange = showRegradeCounts; });
    $("rg-allq").onclick = () => { box.querySelectorAll("input").forEach((c) => { c.checked = true; }); showRegradeCounts(); };
    $("rg-noq").onclick = () => { box.querySelectorAll("input").forEach((c) => { c.checked = false; }); showRegradeCounts(); };
  }

  function regradeChoice() {
    const positionsChosen = new Set([...$("rg-questions").querySelectorAll("input:checked")].map((c) => +c.value));
    const scope = document.querySelector('input[name="rg-scope"]:checked').value;
    const idx = scope === "selected" ? [...selected].sort((x, y) => x - y)
      : scope === "filter" ? filtered() : report.attempts.map((_, i) => i);
    return { positions: positionsChosen, idx, sig: JSON.stringify([[...positionsChosen], idx]) };
  }

  function showRegradeCounts() {
    if (!report) return;
    $("rg-nall").textContent = report.attempts.length;
    $("rg-nfilter").textContent = filtered().length;
    $("rg-nsel").textContent = selected.size;
    const n = report.attempts.filter(regradedIn).length;
    $("rg-undo").hidden = !n;
    $("rg-undo").textContent = `ביטול הניקוד מחדש (${n === 1 ? "ניסיון אחד" : n + " ניסיונות"})`;
  }

  function setRegradeStatus(text, error) {
    const el = $("rg-status");
    el.textContent = text;
    el.className = "status" + (error ? " error" : "");
  }

  async function regradeRun() {
    const choice = regradeChoice();
    if (!choice.positions.size) { setRegradeStatus("בחרו לפחות שאלה אחת.", true); return null; }
    if (!choice.idx.length) { setRegradeStatus("אין ניסיונות לבדיקה: בחרו ניסיונות.", true); return null; }
    const atts = choice.idx.map((i) => report.attempts[i]);
    for (const a of report.attempts) a.preview = null;
    $("rg-preview").disabled = $("rg-apply").disabled = true;
    try {
      await regradeAttempts(atts, choice.positions, (d, n) => setRegradeStatus(`בודק מחדש את ההגשות... (${d}/${n})`));
    } finally {
      $("rg-preview").disabled = $("rg-apply").disabled = false;
    }
    lastPreview = { sig: choice.sig, atts, positions: choice.positions };
    return lastPreview;
  }

  // What changes in an attempt with its preview: [{pos, from, to}] (marks of the question).
  function previewChanges(a) {
    if (!a.preview) return [];
    const out = [];
    for (const [p, f] of Object.entries(a.preview.frac)) {
      const pos = +p, w = weightOf(a, pos);
      const from = markOf(a, pos, false).mark, to = f * w;
      if (Math.abs(from - to) > 1e-6) out.push({ pos, from, to });
    }
    return out;
  }

  // Questions that cannot be graded again: not in the bank (or the package), or fewer variants.
  function notRegradable(atts, chosen) {
    const missing = new Set();
    for (const a of atts) {
      a.layout.questions.forEach((q, i) => {
        if (q && chosen.has(i + 1) && a.qiOf[i + 1] === undefined) missing.add(`ש${i + 1} (${q.qid})`);
      });
    }
    return [...missing];
  }

  let previewPage = 1;
  function showPreview(run, applied) {
    const changed = run.atts.filter((a) => previewChanges(a).length || (applied && a.appliedChanges && a.appliedChanges.length));
    const errors = run.atts.filter((a) => a.regradeError);
    const missing = notRegradable(run.atts, run.positions);
    const lines = [];
    lines.push(applied
      ? `✓ ניקוד מחדש בוצע: נבדקו ${run.atts.length} ניסיונות, ב-${changed.length} מהם השתנה הציון.`
      : `תצוגה מקדימה: נבדקו ${run.atts.length} ניסיונות, ב-${changed.length} מהם הציון ישתנה. שום דבר עוד לא נשמר.`);
    if (missing.length) lines.push(`<span class="warn">שאלות שאי אפשר לבדוק מחדש (אינן ${PACKAGE ? "בחבילה" : "במאגר באתר"}, או שמספר הגרסאות שלהן השתנה): ${missing.map(esc).join(", ")}. בהן הציון נשאר כפי שהוא.</span>`);
    if (errors.length) lines.push(`<span class="warn">${errors.length} ניסיונות לא נבדקו מחדש (שגיאה). בהם הציון נשאר כפי שהוא.</span>`);
    const box = $("rg-result");
    if (!changed.length) {
      box.innerHTML = `<p>${lines.join("<br>")}</p>`;
      return;
    }
    const idLabel = report.identity.length ? report.identity[0].label : "";
    box.innerHTML = `<p>${lines.join("<br>")}</p><div class="pager"></div><div class="tablewrap"><table class="grid clickable" id="rg-table"></table></div><div class="pager"></div>`;
    const draw = (p) => {
      const shown = paged(changed, p, box, draw);
      previewPage = shown.p;
      $("rg-table").innerHTML = `<thead><tr><th>שם</th>${idLabel ? `<th>${esc(idLabel)}</th>` : ""}<th>ניסיון</th>` +
        `<th>${applied ? "ציון לפני" : "ציון עכשיו"}</th><th>${applied ? "ציון אחרי" : "אחרי ניקוד מחדש"}</th><th>שאלות שהשתנו</th></tr></thead><tbody>` +
        shown.rows.map((a) => {
          const ch = applied ? a.appliedChanges : previewChanges(a);
          const before = applied ? a.appliedBefore : totalOf(a);
          const after = applied ? totalOf(a) : totalOf(a, true, true);
          return `<tr data-i="${report.attempts.indexOf(a)}" tabindex="0"><td>${esc(a.name)}</td>${idLabel ? `<td>${esc(a.ids[0])}</td>` : ""}<td>${a.attempt}</td>` +
            `<td>${fmt(before)}</td><td><b>${fmt(after)}</b></td>` +
            `<td>${ch.map((c) => `ש${c.pos}: ${ltr(`${fmt(c.from)} → ${fmt(c.to)}`)}`).join(", ")}</td></tr>`;
        }).join("") + "</tbody>";
      $("rg-table").querySelectorAll("tbody tr").forEach((tr) => {
        tr.onclick = () => openAttempt(report.attempts[+tr.dataset.i]);
        tr.onkeydown = (e) => { if (e.key === "Enter") tr.onclick(); };
      });
    };
    draw(1);
  }

  async function regradePreview() {
    const run = await regradeRun();
    if (!run) return;
    setRegradeStatus("");
    showPreview(run, false);
    showAttempts();
  }

  async function regradeApply() {
    const choice = regradeChoice();
    let run = lastPreview && lastPreview.sig === choice.sig && lastPreview.atts.some((a) => a.preview) ? lastPreview : null;
    if (!run) run = await regradeRun();
    if (!run) return;
    for (const a of run.atts) {
      a.appliedChanges = previewChanges(a);
      a.appliedBefore = totalOf(a);
      if (!a.preview) continue;
      for (const [p, f] of Object.entries(a.preview.frac)) {
        const k = overrideKey(a, +p), now = nowFraction(a, +p);
        if (now !== null && Math.abs(f - now) < 1e-9) delete regrades[k];
        else regrades[k] = Math.round(f * 1e6) / 1e6;
      }
      a.regradedTries = new Map([...(a.regradedTries || []), ...a.preview.tries]);
      a.preview = null;
    }
    saveRegrades();
    lastPreview = null;
    setRegradeStatus("");
    showPreview(run, true);
    refresh();
  }

  function regradeUndo() {
    if (!confirm("לבטל את הניקוד מחדש בכל הניסיונות בדוח הזה? הציונים יחזרו להיות כמו ב-Moodle (שינויים ידניים נשארים).")) return;
    for (const a of report.attempts) {
      a.layout.questions.forEach((q, i) => { if (q) delete regrades[overrideKey(a, i + 1)]; });
      a.regradedTries = null;
      a.preview = null;
    }
    saveRegrades();
    lastPreview = null;
    $("rg-result").innerHTML = "";
    setRegradeStatus("הניקוד מחדש בוטל.");
    refresh();
  }

  // ------------------------------------------------------------------ one attempt

  function openAttempt(a) {
    $("d-title").textContent = `${a.name} – ניסיון ${a.attempt}`;
    const total = totalOf(a);
    const last = a.items.length ? a.items[a.items.length - 1] : null;
    const gap = gapOf(a);
    $("d-meta").innerHTML = [
      a.ids.filter((v) => v).map(esc).join(" · "),
      `התחלה: ${esc(a.start)}`, `גישה אחרונה: ${esc(a.finish)}`, duration(a) && `משך: ${duration(a)}`,
      last && `הגשה אחרונה בדוח: ${ltr(itemTime(last))}`,
      `ציון ב-Moodle: ${fmt(a.moodle)}`, `ציון: ${ltr(`<b id="d-total">${fmt(total)}</b> / ${fmt(a.layout.grade)}`)}`,
      a.layout.player && `גרסת הנגן: ${ltr(esc(a.layout.player))}`,
    ].filter(Boolean).join(" &nbsp;|&nbsp; ") +
      (gap > UNEXPLAINED ? `<br><span class="gap">⚠ הציון ב-Moodle גבוה ב-${fmt(gap)} מסכום ההגשות שבדוח: חלק מההגשות של הניסיון הזה לא נרשמו בדוח של Moodle. הציון ב-Moodle הוא הנכון.</span>` : "");
    renderQuestions(a);
    const { quiz } = a.group;
    const frame = $("d-frame");
    if (quiz.questions.length) {
      $("d-framehint").hidden = false;
      $("d-framehint").textContent = PACKAGE
        ? "התשובות האחרונות של הסטודנט, עם המשוב והתשובות הנכונות, לפי השאלות שבחבילה. רק ההגשות שבדוח."
        : "התשובות האחרונות של הסטודנט, עם המשוב והתשובות הנכונות, לפי הגרסה של השאלות שבאתר היום (אם שאלה השתנתה מאז, המשוב כאן יכול להיות שונה ממה שהסטודנט קיבל). רק ההגשות שבדוח.";
      frame.hidden = false;
      frameJob(Object.assign({}, quiz, { replay: { v: a.variants, log: a.log.map((it) => ({ qi: a.qiOf[it.pos], text: it.text })) } }), frame);
    } else {
      frame.hidden = true;
      $("d-framehint").hidden = true;
    }
    if (!$("detail").open) $("detail").showModal();
  }

  const triedLabel = (r, w) => (r.kind === "graded" ? fmt(r.fraction * w) : r.kind === "invalid" ? "לא תקינה"
    : r.kind === "incomplete" ? "לא שלמה" : r.kind === "repeat" ? "זהה לקודמת" : "ריקה");

  function renderQuestions(a) {
    let html = "";
    a.layout.questions.forEach((q, i) => {
      if (!q) return;
      const pos = i + 1;
      const w = weightOf(a, pos);
      const items = a.items.filter((it) => it.pos === pos);
      const m = markOf(a, pos);
      const k = overrideKey(a, pos);
      const p = a.preview && pos in a.preview.frac ? a.preview.frac[pos] * w : null;
      const trial = (it) => (a.preview && a.preview.tries.get(it)) || (a.regradedTries && a.regradedTries.get(it)) || null;
      const anyTrial = items.some(trial);
      html += `<section class="qcard ${items.length && m.source !== "unknown" ? cls(m.mark, w) : "none"}" data-pos="${pos}">` +
        `<div class="qhead"><h3>שאלה ${pos}: ${resolvedName(q.qid)}</h3>` +
        `<span class="meta">גרסה ${q.v}${q.guessed ? " (משוערת)" : ""} · ${behaviourName(q.behaviour || a.layout.behaviour)}</span>` +
        `<label class="markfield">ציון <input type="number" class="mark" min="0" max="${w}" step="0.01" value="${m.source === "unknown" ? "" : fmt(m.mark, 4)}"> / ${fmt(w)}</label>` +
        (m.source === "regraded" ? '<span class="badge regraded">אחרי ניקוד מחדש</span>' : "") +
        (k in overrides ? `<span class="badge manual">ידני</span> <button type="button" class="btn small ghost reset">ביטול השינוי (${fmt(markOf(a, pos, false).mark)})</button>` : "") +
        (p !== null && Math.abs(p - markOf(a, pos, false).mark) > 1e-6 ? `<span class="badge preview">בתצוגה המקדימה: ${fmt(p)}</span>` : "") +
        "</div>";
      if (!items.length) html += '<p class="hint">אין הגשות של השאלה הזאת בדוח.</p>';
      else {
        html += '<table class="grid tries"><thead><tr><th>#</th><th>זמן</th><th>תשובה</th>' +
          (report.hasResult ? "<th>ציון ב-Moodle</th>" : "") + (anyTrial ? "<th>בניקוד מחדש</th>" : "") + "</tr></thead><tbody>";
        items.forEach((it, n) => {
          const r = trial(it);
          const shown = r && r.shown ? r.shown : it.text;
          html += `<tr><td>${n + 1}</td><td class="nowrap">${itemTime(it)}</td>` +
            `<td><code dir="ltr">${esc(shown)}</code>${it.clipped ? ' <span class="badge warn" title="התשובה ארוכה מ-255 תווים ונחתכה בדיווח">נחתכה</span>' : ""}</td>` +
            (report.hasResult ? `<td>${it.neutral ? "לא נבדקה" : it.result !== null ? fmt(it.result * w) : "–"}</td>` : "") +
            (anyTrial ? `<td>${r ? triedLabel(r, w) : "–"}</td>` : "") + "</tr>";
        });
        html += "</tbody></table>";
      }
      html += "</section>";
    });
    $("d-questions").innerHTML = html;
    $("d-questions").querySelectorAll(".qcard").forEach((card) => {
      const pos = +card.dataset.pos;
      const w = weightOf(a, pos);
      const input = card.querySelector("input.mark");
      input.onchange = () => {
        const v = parseFloat(input.value);
        if (Number.isNaN(v)) return;
        overrides[overrideKey(a, pos)] = Math.min(Math.max(v, 0), w);
        changed(a);
      };
      const reset = card.querySelector(".reset");
      if (reset) reset.onclick = () => { delete overrides[overrideKey(a, pos)]; changed(a); };
    });
  }

  function changed(a) {
    saveOverrides();
    renderQuestions(a);
    $("d-total").textContent = fmt(totalOf(a));
    refresh();
  }

  const BEHAVIOURS = {
    adaptivenopenalty: "מצב מסתגל ללא קנסות", adaptive: "מצב מסתגל", interactive: "אינטראקטיבי עם מספר ניסיונות",
    immediatefeedback: "משוב מיידי", deferredfeedback: "משוב מושהה",
  };
  const behaviourName = (b) => BEHAVIOURS[b] || b;

  // ------------------------------------------------------------------ manual marks in the package
  //
  // A manual mark reaches Moodle's gradebook the same way a corrected question does: it is
  // put into the package (QUIZ.marks), the teacher replaces the package in Moodle, and when
  // the student opens the quiz the package writes the new grade.  Nothing is typed into the
  // gradebook, so the grade is not marked "overridden" and later attempts still count.
  //
  // The package is downloaded by every student, so it names nobody:
  //   {"<key>": {"<position>:<question id>": fraction of the question's mark}}
  // The key is a hash of the attempt's start stamp, or of the variants it drew.
  // attemptKey must stay identical to the one in player/player.js.
  function attemptKey(text) {
    let a = 0x811c9dc5, b = 0x9e3779b9;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b + c + 1, 0x85ebca6b) >>> 0;
    }
    return a.toString(36) + "-" + b.toString(36);
  }
  // Only a stamp the package itself reported (not one guessed from the submission times),
  // as the player keeps it (state.ts: yyyymmddThhmmss; a.stamp has no "T").
  const stampKey = (a) => (a.layoutParts.length && a.stamp ? attemptKey("t" + a.stamp.slice(0, 8) + "T" + a.stamp.slice(8)) : null);
  const variantKey = (a) => (a.layout.exact && a.layout.variants ? attemptKey("v" + a.layout.variants.join(".")) : null);

  // {marks, done: attempts carried, missed: attempts that cannot be identified}
  function manualMarks() {
    const seen = new Map(), ambiguous = new Set();
    for (const a of report.attempts) {
      for (const k of [stampKey(a), variantKey(a)]) {
        if (!k) continue;
        if (seen.has(k) && seen.get(k) !== a) ambiguous.add(k);   // two attempts, one key: unusable
        else seen.set(k, a);
      }
    }
    const marks = {}, done = [], missed = [];
    for (const a of report.attempts) {
      const entries = {};
      a.layout.questions.forEach((q, i) => {
        if (!q) return;
        const k = overrideKey(a, i + 1);
        if (!(k in overrides)) return;
        const w = weightOf(a, i + 1);
        entries[`${i + 1}:${q.qid}`] = w > 0 ? Math.round((overrides[k] / w) * 1e6) / 1e6 : 0;
      });
      if (!Object.keys(entries).length) continue;
      const keys = [stampKey(a), variantKey(a)].filter((k) => k && !ambiguous.has(k));
      if (!keys.length) { missed.push(a); continue; }
      for (const k of keys) marks[k] = entries;
      done.push(a);
    }
    return { marks, done, missed };
  }

  // The package with the manual marks in it (a JSZip of a whole package).  fromSite: the
  // website's player and review page too, so that a package made before October 2026 reads
  // the marks and gets teacher mode; the questions, variants and settings stay as they are.
  async function withMarks(zip, fromSite) {
    const { marks, done, missed } = manualMarks();
    if (!done.length && !missed.length) throw new Error("אין שינויי ציון ידניים בדוח הזה.");
    const entry = zip.file(/(^|\/)quiz\.js$/)[0];
    if (!entry) throw new Error("זה לא נראה כמו קובץ מבדק: אין בו quiz.js.");
    const m = /^window\.STACK_QUIZ\s*=\s*([\s\S]*?);\s*$/.exec((await entry.async("string")).trim());
    let data;
    try { data = JSON.parse(m[1]); } catch (e) { throw new Error("לא הצלחתי לקרוא את המבדק שבחבילה."); }

    // Every mark must land on the question it was given to: same question, same position.
    const wrong = new Set();
    for (const entries of Object.values(marks)) {
      for (const key of Object.keys(entries)) {
        const [pos, qid] = key.split(":");
        const q = data.questions[+pos - 1];
        if (!q || String(q.id) !== qid) wrong.add(`שאלה ${pos}`);
      }
    }
    if (wrong.size) {
      throw new Error("החבילה הזאת לא מתאימה לדוח: השאלות בה אחרות (" + [...wrong].join(", ") +
        "). בחרו את קובץ ה-ZIP שממנו נבנה המבדק שהסטודנטים פתרו.");
    }
    data.marks = marks;
    const index = fromSite ? await fetch("index.json").then((r) => r.json()) : null;
    if (index && index.player) data.player = index.player;      // the site's player replaces the package's
    zip.file(entry.name, "window.STACK_QUIZ = " + JSON.stringify(data) + ";\n");
    const root = entry.name.slice(0, -"quiz.js".length);
    if (fromSite) {
      const review = new Set(["review.html", "review.js", "review.css", "app.css", "review-frame.html", "site-lib/jszip.min.js"]);
      for (const [src, dest] of index.package) {
        if (!src.startsWith("player/") && !review.has(dest)) continue;
        const r = await fetch(src);
        if (!r.ok) throw new Error(`לא הצלחתי להוריד את ${src} מהאתר.`);
        zip.file(root + dest, await r.arrayBuffer());
      }
      const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir && n.startsWith(root) && n !== root + "files.json")
        .map((n) => n.slice(root.length)).sort();
      zip.file(root + "files.json", JSON.stringify(names.concat("files.json")));
    }
    const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 6 } });
    return { blob, done, missed };
  }

  function saveBlob(blob, name) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // The ZIP the teacher dropped, with the manual marks.
  async function patchPackage(file) {
    let zip;
    try {
      zip = await JSZip.loadAsync(file);
    } catch (e) {
      throw new Error("הקובץ אינו חבילת ZIP תקינה.");
    }
    const { blob, done, missed } = await withMarks(zip, true);
    saveBlob(blob, file.name.replace(/\.zip$/i, "") + "-עם-ציונים-ידניים.zip");
    return { done, missed };
  }

  // Package mode: this package, from its own files in Moodle, with the manual marks.
  async function patchThisPackage(progress) {
    const files = await fetch("files.json").then((r) => {
      if (!r.ok) throw new Error("בחבילה הזאת אין רשימת קבצים.");
      return r.json();
    });
    const zip = new JSZip();
    const queue = files.filter((f) => f !== "files.json");
    let n = 0;
    const worker = async () => {
      for (let f; (f = queue.shift());) {
        const r = await fetch(f);
        if (!r.ok) throw new Error(`לא הצלחתי לקרוא את ${f} מהחבילה (${r.status}).`);
        zip.file(f, await r.arrayBuffer());
        if (++n % 25 === 0) progress(`קורא את קובצי החבילה... ${n}/${files.length - 1}`);
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    zip.file("files.json", JSON.stringify(files));
    progress("אורז...");
    return withMarks(zip, false);
  }

  // ------------------------------------------------------------------ grades file

  // One grade per student from the grades of the attempts, as the SCORM activity's
  // "grading method" for attempts: highest, last, first or average.
  function combine(values) {
    const method = $("method").value;
    const v = values.filter((x) => x !== null && !Number.isNaN(x));
    if (!v.length) return null;
    return method === "last" ? v[v.length - 1] : method === "first" ? v[0]
      : method === "average" ? v.reduce((s, x) => s + x, 0) / v.length : Math.max(...v);
  }
  const round2 = (x) => Math.round(x * 100) / 100;

  // [{a: first attempt, grade, moodle}] per student.
  function studentGrades() {
    const by = new Map();
    for (const a of report.attempts) {
      const k = whoOf(a);
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(a);
    }
    const out = [];
    for (const atts of by.values()) {
      atts.sort((x, y) => x.attempt - y.attempt);
      const grade = combine(atts.map((a) => totalOf(a)));
      if (grade === null) continue;
      out.push({ a: atts[0], grade: round2(grade), moodle: combine(atts.map((a) => a.moodle)) });
    }
    return out;
  }

  // The students whose grade differs from Moodle's, with the new grade to type in.
  let updatesPage = 1;
  const toUpdate = () => studentGrades().filter((r) => r.moodle === null || Math.abs(r.grade - round2(r.moodle)) > 0.005);
  function showUpdates() {
    const rows = toUpdate();
    $("download").disabled = !rows.length;
    $("download").textContent = rows.length ? `הורדת קובץ עם ${rows.length === 1 ? "הסטודנט" : rows.length + " הסטודנטים"} לעדכון` : "הורדת קובץ עם הסטודנטים לעדכון";
    const box = $("updates");
    if (!rows.length) {
      box.innerHTML = '<p class="hint">אין ציונים לעדכון: הציון של כל הסטודנטים זהה לציון ב-Moodle.</p>';
      return;
    }
    const idLabel = report.identity.length ? report.identity[0].label : "";
    box.innerHTML = `<p>${rows.length === 1 ? "סטודנט אחד" : rows.length + " סטודנטים"}.</p><div class="pager"></div><table class="grid"></table><div class="pager"></div>`;
    const shown = paged(rows, updatesPage, box, (p) => { updatesPage = p; showUpdates(); });
    updatesPage = shown.p;
    box.querySelector("table").innerHTML = `<thead><tr><th>שם</th>${idLabel ? `<th>${esc(idLabel)}</th>` : ""}` +
      "<th>ציון ב-Moodle</th><th>ציון חדש</th><th></th></tr></thead><tbody>" +
      shown.rows.map((r, i) => `<tr><td>${esc(r.a.name)}</td>${idLabel ? `<td>${esc(r.a.ids[0])}</td>` : ""}` +
        `<td>${fmt(r.moodle)}</td><td><b>${fmt(r.grade)}</b></td>` +
        `<td><button type="button" class="btn small" data-copy="${i}">העתקת הציון</button></td></tr>`).join("") +
      "</tbody>";
    box.querySelectorAll("button[data-copy]").forEach((b) => {
      b.onclick = async () => {
        const text = String(shown.rows[+b.dataset.copy].grade);
        try { await navigator.clipboard.writeText(text); b.textContent = "הועתק ✓"; } catch (e) { prompt("העתיקו את הציון:", text); }
      };
    });
  }

  // The block that puts the manual marks into the package: only when there are any.
  function showManual() {
    const { done, missed } = manualMarks();
    $("zipsave").hidden = true;          // a package made before this change is out of date
    $("manual").hidden = !done.length && !missed.length;
    if ($("manual").hidden) return;
    const n = done.length;
    $("manualcount").innerHTML = n
      ? `<b>${n === 1 ? "ניסיון אחד" : n + " ניסיונות"}</b> עם ציון שקבעתם ידנית ${n === 1 ? "מוכן" : "מוכנים"} להיכנס לחבילה.`
      : "";
    if (missed.length) {
      $("manualcount").innerHTML += `<br><span class="warn">${missed.length} ניסיונות לא ניתן לזהות בתוך החבילה ` +
        "(הם נעשו בגרסה ישנה של המבדק, או ששני ניסיונות יצאו זהים לגמרי). " +
        "את הציון שלהם צריך להקליד בגיליון הציונים או לייבא כקובץ.</span>";
    }
  }

  // Package mode: the hint and the button instead of dropping a ZIP.
  async function buildThisPackage() {
    const box = $("zipstatus");
    const save = $("zipsave");
    box.className = "status";
    save.hidden = true;
    $("zipbuild").disabled = true;
    try {
      const { blob, done, missed } = await patchThisPackage((t) => { box.textContent = t; });
      if (save.href) URL.revokeObjectURL(save.href);
      save.href = URL.createObjectURL(blob);
      save.download = (PACKAGE.title || "quiz").replace(/[\\/:*?"<>|]+/g, "-") + "-עם-ציונים-ידניים.zip";
      save.hidden = false;
      box.textContent = `✓ החבילה מוכנה, עם הציונים הידניים של ${done.length === 1 ? "ניסיון אחד" : done.length + " ניסיונות"}` +
        (missed.length ? ` (${missed.length} ללא זיהוי, ראו למעלה)` : "") +
        '. לחצו על "שמירת החבילה", ואז החליפו אותה בהגדרות המשאב.';
    } catch (e) {
      box.className = "status error";
      box.textContent = e.message || String(e);
    } finally {
      $("zipbuild").disabled = false;
    }
  }

  // Package mode: the report, straight from Moodle (same site, the teacher's own rights).
  async function loadFromMoodle() {
    const m = parent !== window && parent.STACK_ACTIVITY ? parent.STACK_ACTIVITY() : null;
    if (!m) return setStatus("הדף הזה נפתח מתוך המבדק ב-Moodle, בכפתור \"עיון בהגשות\".", true);
    $("reportlink").href = m.report;
    setStatus("קורא את הדוח מ-Moodle...");
    let text;
    try {
      const r = await fetch(m.report + "&download=CSV", { credentials: "same-origin" });
      if (!r.ok) throw new Error(String(r.status));
      text = await r.text();
    } catch (e) {
      return setStatus("לא הצלחתי לקרוא את הדוח מ-Moodle (" + e.message + ").", true);
    }
    await loadFile(new File([text], "moodle-report.txt", { type: "text/plain" }));
  }

  async function sendToPackage(file) {
    if (!file) return;
    const box = $("zipstatus");
    box.className = "status";
    box.textContent = "מכין את החבילה...";
    try {
      const { done, missed } = await patchPackage(file);
      box.textContent = `✓ החבילה הורדה, עם הציונים הידניים של ${done.length === 1 ? "ניסיון אחד" : done.length + " ניסיונות"}` +
        (missed.length ? ` (${missed.length} ללא זיהוי, ראו למעלה)` : "") + ". עכשיו מחליפים אותה ב-Moodle.";
    } catch (e) {
      box.className = "status error";
      box.textContent = e.message || String(e);
    }
  }

  // Moodle marks every imported grade "overridden", unchanged ones too (grade_item::
  // update_final_grade), so the file to import holds only the students to update; the file
  // of all students is for other uses.
  function gradesCsv(rows) {
    const quote = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const lines = [["שם", ...report.identity.map((f) => f.label), "ציון"].map(quote).join(",")];
    for (const r of rows) lines.push([r.a.name, ...r.a.ids, String(r.grade)].map(quote).join(","));
    return "\uFEFF" + lines.join("\r\n") + "\r\n";
  }

  function download(all) {
    const rows = all ? studentGrades() : toUpdate();
    const blob = new Blob([gradesCsv(rows)], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = report.file.replace(/\.[^.]+$/, "") + (all ? "-כל-הציונים.csv" : "-ציונים-לעדכון.csv");
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  // ------------------------------------------------------------------ wiring

  async function loadFile(file) {
    if (!file) return;
    try {
      await load(file);
    } catch (e) {
      console.error(e);
      setStatus("שגיאה: " + e.message, true);
    }
  }

  $("file").onchange = (e) => loadFile(e.target.files[0]);
  const drop = $("drop");
  drop.addEventListener("dragover", (e) => { e.preventDefault(); drop.classList.add("over"); });
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    loadFile(e.dataTransfer.files[0]);
  });
  $("filter").oninput = () => { page = 1; showAttempts(); showRegradeCounts(); };
  $("show").onchange = () => { page = 1; showAttempts(); showRegradeCounts(); };
  $("pagesize").onchange = () => {
    pageSize = parseInt($("pagesize").value, 10) || 0;
    try { localStorage.setItem(PAGESIZE, String(pageSize)); } catch (e) { /* this page only */ }
    page = 1;
    updatesPage = 1;
    if (report) { showAttempts(); showUpdates(); }
  };
  $("unselect").onclick = () => { selected.clear(); showAttempts(); showRegradeCounts(); };
  $("rg-preview").onclick = () => regradePreview().catch((e) => setRegradeStatus("שגיאה: " + e.message, true));
  $("rg-apply").onclick = () => regradeApply().catch((e) => setRegradeStatus("שגיאה: " + e.message, true));
  $("rg-undo").onclick = regradeUndo;
  document.querySelectorAll('input[name="rg-scope"]').forEach((r) => { r.onchange = showRegradeCounts; });
  $("download").onclick = () => download(false);
  $("downloadall").onclick = () => download(true);
  if (PACKAGE) {
    document.body.classList.add("inpackage");
    $("manual").querySelector(".hint").textContent = "החבילה של המבדק הזה, עם הציונים שקבעתם ידנית. מחליפים אותה בהגדרות המשאב, " +
      "וכשהסטודנט פותח את המבדק הציון שלו בגיליון מתעדכן לבד: בלי הקלדה בגיליון, ובלי שהציון יסומן \"נדרס\".";
    $("zipbuild").onclick = buildThisPackage;
    $("reload").onclick = loadFromMoodle;
    loadFromMoodle();
  }
  $("zipfile").onchange = (e) => { sendToPackage(e.target.files[0]); e.target.value = ""; };
  const zipdrop = $("zipdrop");
  zipdrop.addEventListener("dragover", (e) => { e.preventDefault(); zipdrop.classList.add("over"); });
  zipdrop.addEventListener("dragleave", () => zipdrop.classList.remove("over"));
  zipdrop.addEventListener("drop", (e) => {
    e.preventDefault();
    zipdrop.classList.remove("over");
    sendToPackage(e.dataTransfer.files[0]);
  });
  $("method").onchange = () => { updatesPage = 1; showUpdates(); };
  $("d-close").onclick = () => $("detail").close();
  $("detail").addEventListener("close", () => {
    const frame = $("d-frame");
    const job = /job=(\w+)/.exec(frame.src);
    if (job) delete window.reviewJobs[job[1]];
    frame.src = "about:blank";
  });
})();
