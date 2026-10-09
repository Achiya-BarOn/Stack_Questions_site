/*
 * Submissions review: reads Moodle's SCORM interactions report (downloaded as Excel, ODS
 * or text) for a quiz package made by this site, and shows every attempt – the quiz
 * layout, each submission (time, answer, mark), the attempt rendered in the player – with
 * manual mark changes and a grades file for Moodle's gradebook import.
 *
 * What the package reports is described in player/player.js ("reporting to Moodle").
 * Everything runs in the browser; nothing from the report leaves it.  Manual marks are
 * kept in localStorage.
 */
(() => {
  "use strict";

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

  async function readTable(file) {
    if (/\.(txt|csv)$/i.test(file.name)) return parseDelimited(await file.text());
    const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }).map((r) => r.map((c) => String(c ?? "")));
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
      for (let c = first; c < r.length; c += stride) {
        const id = String(r[c] || "").trim();
        if (!id) continue;
        const text = decode(r[c + respOffset]);
        let m;
        if ((m = LAYOUT_RE.exec(id))) {
          a.layoutParts.push({ k: +m[1], text });
          a.stamp = m[3] + m[4];
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
      const text = a.layoutParts.sort((x, y) => x.k - y.k).map((p) => p.text).join(";");
      const L = { grade: 10, sumgrades: 0, behaviour: DEFAULT_BEHAVIOUR, questions: [], exact: true };
      for (const item of text.split(";")) {
        const eq = item.indexOf("=");
        const key = item.slice(0, eq), value = item.slice(eq + 1);
        if (key === "g") L.grade = parseFloat(value);
        else if (key === "s") L.sumgrades = parseFloat(value);
        else if (key === "b") L.behaviour = value;
        else if (/^\d+$/.test(key)) {
          const [qid, v, w, behaviour, tries] = value.split("/");
          L.questions[+key - 1] = { qid, v: +v, w: parseFloat(w), behaviour: behaviour || "", tries: tries ? +tries : 0 };
        }
      }
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
      templates[qid] = fetch(`data/${encodeURIComponent(qid)}/question.json`)
        .then((r) => (r.ok ? r.json() : null)).catch(() => null);
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

  // Mark of position pos (1-based) in attempt a: manual, regraded, or Moodle's last result.
  function markOf(a, pos) {
    const k = overrideKey(a, pos);
    if (k in overrides) return { mark: overrides[k], source: "manual" };
    const q = a.layout.questions[pos - 1];
    const qi = a.qiOf[pos];
    if (a.regraded && qi !== undefined) return { mark: a.regraded.marks[qi], source: "regraded" };
    const mine = a.items.filter((it) => it.pos === pos && it.result !== null);
    if (!mine.length) return { mark: 0, source: "none" };
    return { mark: Math.max(...mine.map((it) => it.result)) * (q ? q.w : 1), source: "moodle" };
  }

  function totalOf(a) {
    const L = a.layout;
    if (!L.sumgrades) return null;
    let sum = 0;
    L.questions.forEach((q, i) => { if (q) sum += markOf(a, i + 1).mark; });
    return (sum / L.sumgrades) * L.grade;
  }
  const regradedTotal = (a) => (a.regraded && !a.regraded.error ? a.regraded.grade : null);

  // ------------------------------------------------------------------ loading

  async function load(file) {
    $("overview").hidden = $("attempts").hidden = $("export").hidden = true;
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
      return setStatus(e instanceof ReportError ? e.message : "שגיאה בקריאת הדוח: " + e.message, true);
    }
    report.file = file.name;

    // Packages from before the layout was reported: question per position from all rows.
    report.legacyPositions = [];
    for (const a of report.attempts) for (const it of a.items) report.legacyPositions[it.pos - 1] ||= it.qid;

    setStatus("טוען את השאלות מהמאגר...");
    const groups = new Map();
    for (const a of report.attempts) {
      a.layout = layoutOf(a, report);
      const sig = JSON.stringify([a.layout.grade, a.layout.sumgrades, a.layout.behaviour,
        a.layout.questions.map((q) => q && [q.qid, q.w, q.behaviour, q.tries])]);
      if (!groups.has(sig)) groups.set(sig, { sig, attempts: [], layout: a.layout });
      groups.get(sig).attempts.push(a);
    }
    report.groups = [...groups.values()];
    loadOverrides();

    let done = 0;
    for (const g of report.groups) {
      const { quiz, qiOf } = await playerQuiz(g.layout);
      g.quiz = quiz;
      g.qiOf = qiOf;
      const jobs = g.attempts.map((a) => {
        a.qiOf = qiOf;
        a.group = g;
        a.log = a.items.filter((it) => qiOf[it.pos] !== undefined);
        // Variants: the attempt's own layout (questions may repeat with different variants).
        const v = [];
        a.layout.questions.forEach((q, i) => { if (q && qiOf[i + 1] !== undefined) v[qiOf[i + 1]] = q.v; });
        a.variants = v;
        return { v, log: a.log.map((it) => ({ qi: qiOf[it.pos], text: it.text })) };
      });
      setStatus(`בודק מחדש את ההגשות... (${done}/${report.attempts.length})`);
      const results = quiz.questions.length ? await regrade(quiz, jobs) : jobs.map(() => ({ error: "no questions" }));
      g.attempts.forEach((a, i) => {
        const r = results[i];
        if (r && !r.error) {
          a.regraded = r;
          a.log.forEach((it, k) => { it.regraded = r.tries[k]; });
        } else a.regradeError = r ? r.error : "unknown";
      });
      done += g.attempts.length;
    }
    setStatus(`נטען: ${report.file}`);
    await showAll();
  }

  // ------------------------------------------------------------------ dates and times

  const MONTHS = {
    "ינואר": 0, "פברואר": 1, "מרץ": 2, "מרס": 2, "אפריל": 3, "מאי": 4, "יוני": 5, "יולי": 6, "אוגוסט": 7,
    "ספטמבר": 8, "אוקטובר": 9, "נובמבר": 10, "דצמבר": 11,
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5, july: 6, august: 7, september: 8,
    october: 9, november: 10, december: 11,
  };
  // Moodle's dates: "יום שישי, 9 אוקטובר 2026, 4:05 PM", "9 October 2026, 4:05 PM", ...
  function parseMoodleDate(s) {
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
    for (const [qid, p] of Object.entries(templates)) {
      const t = await p;
      if (t) names[qid] = t.name;
    }
    showOverview();
    showAttempts();
    $("overview").hidden = $("attempts").hidden = $("export").hidden = false;
  }

  function showOverview() {
    const atts = report.attempts;
    const students = new Set(atts.map(whoOf));
    const totals = atts.map(totalOf).filter((x) => x !== null);
    const avg = totals.length ? totals.reduce((s, x) => s + x, 0) / totals.length : null;
    const grade = atts[0].layout.grade;
    $("stats").innerHTML = [
      [students.size, "סטודנטים"], [atts.length, "ניסיונות"],
      [ltr(`${fmt(avg)} / ${fmt(grade)}`), "ציון ממוצע"],
      [atts.reduce((s, a) => s + a.items.filter((it) => !it.neutral).length, 0), "הגשות"],
    ].map(([v, l]) => `<div class="stat"><b>${v}</b><span>${l}</span></div>`).join("");

    const notes = [];
    const changed = atts.filter((a) => {
      const r = regradedTotal(a);
      return r !== null && !Number.isNaN(a.moodle) && Math.abs(r - a.moodle) > 0.005;
    });
    if (changed.length) notes.push(`<p class="warn">ב-${changed.length} ניסיונות הציון בבדיקה מחדש שונה מהציון ב-Moodle (למשל כי שאלה תוקנה במאגר מאז). הם מסומנים בטבלה.</p>`);
    if (atts.some((a) => !a.layout.exact)) notes.push('<p class="warn">חלק מהניסיונות נעשו בחבילה ישנה, שלא דיווחה את מבנה המבדק. הציונים שלהם מחושבים בקירוב (כל שאלה שווה נקודה אחת), ושאלות שהסטודנט לא ענה עליהן מוצגות בגרסה 1.</p>');
    const missing = new Set();
    for (const a of atts) a.layout.questions.forEach((q, i) => { if (q && a.qiOf[i + 1] === undefined) missing.add(q.qid); });
    if (missing.size) notes.push(`<p class="warn">שאלות שאינן במאגר באתר, או שמספר הגרסאות שלהן השתנה: ${[...missing].map(esc).join(", ")}. בהן מוצג הציון המקורי מ-Moodle.</p>`);
    const errors = atts.filter((a) => a.regradeError);
    if (errors.length) notes.push(`<p class="warn">${errors.length} ניסיונות לא נבדקו מחדש (שגיאה). בהם מוצג הציון מ-Moodle.</p>`);
    if (report.groups.length > 1) notes.push('<p class="warn">בדוח יש ניסיונות ממבדקים בהרכב שונה (למשל אחרי החלפת החבילה). כל ניסיון מחושב לפי המבדק שלו.</p>');
    $("notices").innerHTML = notes.join("");

    let html = "<thead><tr><th>#</th><th>שאלה</th><th>ענו</th><th>ציון ממוצע</th><th>ציון מלא</th><th>הגשות בממוצע</th></tr></thead><tbody>";
    for (const pos of positions()) {
      const info = questionName(pos);
      if (!info) continue;
      const rows = atts.filter((a) => a.layout.questions[pos - 1]);
      const answered = rows.filter((a) => a.items.some((it) => it.pos === pos));
      const marks = rows.map((a) => markOf(a, pos).mark);
      const w = info.w;
      const avgMark = marks.length ? marks.reduce((s, x) => s + x, 0) / marks.length : null;
      const full = marks.filter((m) => m >= w - 1e-9).length;
      const tries = answered.length ? answered.reduce((s, a) => s + triesOf(a, pos), 0) / answered.length : null;
      html += `<tr><td>${pos}</td><td>${resolvedName(info.qid)}</td><td>${ltr(`${answered.length}/${rows.length}`)}</td>` +
        `<td>${ltr(`${fmt(avgMark)} / ${fmt(w)}`)}</td><td>${rows.length ? Math.round((100 * full) / rows.length) : 0}%</td><td>${fmt(tries, 1)}</td></tr>`;
    }
    $("byquestion").innerHTML = html + "</tbody>";
  }

  const names = {};           // qid -> question name (from the loaded templates)
  function resolvedName(qid) {
    const n = names[qid];
    return n ? `<a href="preview.html?q=${encodeURIComponent(qid)}" target="_blank" rel="noopener">${esc(n)}</a> <small>(${esc(qid)})</small>`
      : `${esc(qid)} <small>(לא במאגר)</small>`;
  }

  function showAttempts() {
    const pos = positions();
    const idLabel = report.identity.length ? report.identity[0].label : "";
    let html = `<thead><tr><th>שם</th>${idLabel ? `<th>${esc(idLabel)}</th>` : ""}<th>ניסיון</th><th>התחלה</th><th>משך</th>` +
      `<th>ציון ב-Moodle</th><th>ציון</th>${pos.map((p) => `<th class="q">ש${p}</th>`).join("")}</tr></thead><tbody>`;
    const filter = $("filter").value.trim().toLowerCase();
    report.attempts.forEach((a, i) => {
      if (filter && ![a.name, ...a.ids].some((v) => v.toLowerCase().includes(filter))) return;
      const total = totalOf(a);
      const r = regradedTotal(a);
      const changed = r !== null && !Number.isNaN(a.moodle) && Math.abs(r - a.moodle) > 0.005;
      const manual = pos.some((p) => overrideKey(a, p) in overrides);
      html += `<tr data-i="${i}" tabindex="0"><td>${esc(a.name)}</td>${idLabel ? `<td>${esc(a.ids[0])}</td>` : ""}` +
        `<td>${a.attempt}</td><td class="nowrap">${esc(a.start)}</td><td class="nowrap">${duration(a)}</td>` +
        `<td>${fmt(a.moodle)}</td><td class="total${changed ? " changed" : ""}${manual ? " manual" : ""}" title="${changed ? "שונה מהציון ב-Moodle" : ""}${manual ? " כולל שינוי ידני" : ""}">${fmt(total)}</td>`;
      for (const p of pos) {
        const q = a.layout.questions[p - 1];
        if (!q) { html += "<td></td>"; continue; }
        const m = markOf(a, p);
        const n = triesOf(a, p);
        const ungraded = !n && a.items.some((it) => it.pos === p);    // only an invalid or incomplete answer
        const shown = n || ungraded || m.source === "manual";
        html += `<td class="q ${shown ? cls(m.mark, q.w) : "none"}${m.source === "manual" ? " manual" : ""}"` +
          `${ungraded ? ' title="התשובה לא נבדקה: לא תקינה או לא שלמה"' : ""}>${shown ? fmt(m.mark) : "–"}` +
          (n > 1 ? `<sup dir="ltr" title="${n} הגשות">×${n}</sup>` : "") + "</td>";
      }
      html += "</tr>";
    });
    $("attemptlist").innerHTML = html + "</tbody>";
    $("attemptlist").querySelectorAll("tbody tr").forEach((tr) => {
      const open = () => openAttempt(report.attempts[+tr.dataset.i]);
      tr.onclick = open;
      tr.onkeydown = (e) => { if (e.key === "Enter") open(); };
    });
  }

  // ------------------------------------------------------------------ one attempt

  function openAttempt(a) {
    $("d-title").textContent = `${a.name} – ניסיון ${a.attempt}`;
    const total = totalOf(a);
    $("d-meta").innerHTML = [
      a.ids.filter((v) => v).map(esc).join(" · "),
      `התחלה: ${esc(a.start)}`, `גישה אחרונה: ${esc(a.finish)}`, duration(a) && `משך: ${duration(a)}`,
      `ציון ב-Moodle: ${fmt(a.moodle)}`, `ציון: ${ltr(`<b id="d-total">${fmt(total)}</b> / ${fmt(a.layout.grade)}`)}`,
    ].filter(Boolean).join(" &nbsp;|&nbsp; ");
    renderQuestions(a);
    const { quiz } = a.group;
    const frame = $("d-frame");
    if (quiz.questions.length) {
      $("d-framehint").hidden = false;
      frame.hidden = false;
      frameJob(Object.assign({}, quiz, { replay: { v: a.variants, log: a.log.map((it) => ({ qi: a.qiOf[it.pos], text: it.text })) } }), frame);
    } else {
      frame.hidden = true;
      $("d-framehint").hidden = true;
    }
    if (!$("detail").open) $("detail").showModal();
  }

  function renderQuestions(a) {
    let html = "";
    a.layout.questions.forEach((q, i) => {
      if (!q) return;
      const pos = i + 1;
      const items = a.items.filter((it) => it.pos === pos);
      const m = markOf(a, pos);
      const k = overrideKey(a, pos);
      const regradedMark = a.regraded && a.qiOf[pos] !== undefined ? a.regraded.marks[a.qiOf[pos]] : null;
      html += `<section class="qcard ${items.length ? cls(m.mark, q.w) : "none"}" data-pos="${pos}">` +
        `<div class="qhead"><h3>שאלה ${pos}: ${resolvedName(q.qid)}</h3>` +
        `<span class="meta">גרסה ${q.v}${q.guessed ? " (משוערת)" : ""} · ${behaviourName(q.behaviour || a.layout.behaviour)}</span>` +
        `<label class="markfield">ציון <input type="number" class="mark" min="0" max="${q.w}" step="0.01" value="${fmt(m.mark, 4)}"> / ${fmt(q.w)}</label>` +
        (k in overrides ? `<span class="badge manual">ידני</span> <button type="button" class="btn small ghost reset">ביטול השינוי${regradedMark !== null ? ` (${fmt(regradedMark)})` : ""}</button>` : "") +
        "</div>";
      if (!items.length) html += '<p class="hint">לא ענה על השאלה.</p>';
      else {
        html += '<table class="grid tries"><thead><tr><th>#</th><th>זמן</th><th>תשובה</th>' +
          (report.hasResult ? "<th>ציון ב-Moodle</th>" : "") + "<th>ציון בבדיקה</th></tr></thead><tbody>";
        items.forEach((it, n) => {
          const r = it.regraded;
          const shown = r && r.shown ? r.shown : it.text;
          let regr = "–";
          if (r) regr = r.kind === "graded" ? fmt(r.fraction * q.w) : r.kind === "invalid" ? "לא תקינה" : r.kind === "incomplete" ? "לא שלמה" : r.kind === "repeat" ? "זהה לקודמת" : "ריקה";
          html += `<tr><td>${n + 1}</td><td class="nowrap">${itemTime(it)}</td>` +
            `<td><code dir="ltr">${esc(shown)}</code>${it.clipped ? ' <span class="badge warn" title="התשובה ארוכה מ-255 תווים ונחתכה בדיווח">נחתכה</span>' : ""}</td>` +
            (report.hasResult ? `<td>${it.neutral ? "לא נבדקה" : it.result !== null ? fmt(it.result * q.w) : "–"}</td>` : "") +
            `<td>${regr}</td></tr>`;
        });
        html += "</tbody></table>";
      }
      html += "</section>";
    });
    $("d-questions").innerHTML = html;
    $("d-questions").querySelectorAll(".qcard").forEach((card) => {
      const pos = +card.dataset.pos;
      const w = a.layout.questions[pos - 1].w;
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
    showAttempts();
    showOverview();
  }

  const BEHAVIOURS = {
    adaptivenopenalty: "מצב מסתגל ללא קנסות", adaptive: "מצב מסתגל", interactive: "אינטראקטיבי עם מספר ניסיונות",
    immediatefeedback: "משוב מיידי", deferredfeedback: "משוב מושהה",
  };
  const behaviourName = (b) => BEHAVIOURS[b] || b;

  // ------------------------------------------------------------------ grades file

  function gradesCsv() {
    const method = $("method").value;
    const by = new Map();
    for (const a of report.attempts) {
      const k = whoOf(a);
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(a);
    }
    const quote = (v) => (/[",\n]/.test(String(v)) ? `"${String(v).replace(/"/g, '""')}"` : String(v));
    const lines = [["שם", ...report.identity.map((f) => f.label), "ציון"].map(quote).join(",")];
    for (const atts of by.values()) {
      atts.sort((x, y) => x.attempt - y.attempt);
      const totals = atts.map(totalOf).filter((x) => x !== null);
      if (!totals.length) continue;
      const g = method === "last" ? totals[totals.length - 1] : method === "first" ? totals[0]
        : method === "average" ? totals.reduce((s, x) => s + x, 0) / totals.length : Math.max(...totals);
      const a = atts[0];
      lines.push([a.name, ...a.ids, (Math.round(g * 100) / 100).toString()].map(quote).join(","));
    }
    return "﻿" + lines.join("\r\n") + "\r\n";
  }

  function download() {
    const blob = new Blob([gradesCsv()], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = report.file.replace(/\.[^.]+$/, "") + "-ציונים.csv";
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
  $("filter").oninput = () => showAttempts();
  $("download").onclick = download;
  $("d-close").onclick = () => $("detail").close();
  $("detail").addEventListener("close", () => {
    const frame = $("d-frame");
    const job = /job=(\w+)/.exec(frame.src);
    if (job) delete window.reviewJobs[job[1]];
    frame.src = "about:blank";
  });
})();
