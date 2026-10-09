/*
 * STACK quiz player for SCORM packages.
 *
 * Data (written by tools/build-scorm/build.py):
 *   window.STACK_QUIZ                 quiz settings + question templates (no answers)
 *   data/<qid>/<n>.js                 one variant: STACK_VARIANT(qid, n, "<obfuscated JSON>")
 *
 * Question behaviours, as in Moodle (set per quiz, overridable per question):
 *   adaptive           "Check" button, unlimited tries, penalty per wrong try
 *   adaptivenopenalty  the same without penalties (default)
 *   interactive        "Check", then "Try again", limited tries, penalty per wrong try
 *   immediatefeedback  one "Check" per question
 *   deferredfeedback   everything is graded when the attempt is submitted
 */
(function () {
  "use strict";

  const QUIZ = window.STACK_QUIZ;
  const M = window.Maxima;
  const Scorm = window.Scorm;

  const T = {
    question: "שאלה",
    notyetanswered: "טרם נענתה",
    answersaved: "התשובה נשמרה",
    notanswered: "לא נענתה",
    invalid: "התשובה אינה תקינה",
    incomplete: "התשובה אינה שלמה",
    markedoutof: (m) => `ניקוד מרבי ${m}`,
    mark: (a, b) => `ציון ${a} מתוך ${b}`,
    correct: "נכון",
    incorrect: "שגוי",
    partiallycorrect: "נכון חלקית",
    check: "בדיקה",
    tryagain: "נסו שוב",
    triesleft: (n) => (n === 1 ? "נותר לכם ניסיון אחד." : `נותרו לכם ${n} ניסיונות.`),
    submissionmark: (a, b) => `ציון להגשה זו: ${a} מתוך ${b}.`,
    withpenalty: (a, b) => `בהתחשב בניסיונות הקודמים, הציון הוא ${a} מתוך ${b}.`,
    penaltynote: (p) => `הגשה זו קיבלה קנס של ${p}.`,
    invalidsubmission: "התשובה אינה תקינה ולכן לא נבדקה. תקנו אותה ונסו שוב (ללא קנס).",
    incompletesubmission: "התשובה אינה שלמה ולכן לא נבדקה. השלימו את כל הסעיפים ונסו שוב (ללא קנס).",
    finish: "סיום ניסיון...",
    nextpage: "הדף הבא",
    prevpage: "הדף הקודם",
    navigation: "ניווט במבדק",
    page: (p) => `עמוד ${p}`,
    confirmfinish: "לאחר ההגשה לא ניתן יהיה לשנות את התשובות. להגיש את המבדק?",
    submitted: "המבדק הוגש.",
    backtocourse: "חזרה לקורס",
    backhint: "כדי לחזור לקורס, השתמשו בקישור לקורס בראש העמוד של Moodle.",
    grade: (a, b) => `הציון שלך: ${a} מתוך ${b}`,
    interpreted: "התשובה שלך פוענחה כ:",
    variables: "המשתנים שמופיעים בתשובה שלך:",
    rightanswer: "תשובה נכונה היא",
    typedas: "שניתן להקליד כך:",
    nochoice: "(ללא תשובה)",
    true: "נכון",
    false: "לא נכון",
    preview: "תצוגה מקדימה מקומית (לא מחובר ל-Moodle)",
    resetpreview: "ניסיון חדש",
    errors: {
      syntax: "בתשובה יש שגיאת תחביר.",
      badchar: (c) => `התו "${c}" אינו חוקי בתשובה.`,
      unclosedstring: "יש מרכאות שלא נסגרו.",
      missingstars: (d) => `נראה שחסר סימן כפל (*) בין התווים: <code>${esc(d)}</code>.`,
      spaces: (d) => `יש רווח לא חוקי בתשובה: <code>${esc(d)}</code>. אולי חסר סימן כפל (*)?`,
      float: "אין להשתמש במספרים עשרוניים בתשובה זו. השתמשו בשברים, למשל <code>1/3</code>.",
      forbidden: (w) => `השימוש ב-<code>${esc(w)}</code> אסור בתשובה זו.`,
      unknownfunction: (f) => `הפונקציה <code>${esc(f)}</code> אינה מוכרת.`,
      matrixblank: "יש תאים ריקים במטריצה.",
    },
    prtdefault: {
      correct: '<span class="correct">תשובה נכונה, כל הכבוד.</span>',
      partially: '<span class="partially">התשובה נכונה חלקית.</span>',
      incorrect: '<span class="incorrect">תשובה שגויה.</span>',
    },
  };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  }
  const fmt = (x) => Number(x).toFixed(QUIZ.decimalpoints ?? 2);
  const $ = (id) => document.getElementById(id);

  const PENALTY_BEHAVIOURS = new Set(["adaptive", "interactive"]);
  const behaviourOf = (q) => q.behaviour || QUIZ.behaviour || "adaptivenopenalty";

  // ------------------------------------------------------------------ variant loading

  // A question can appear more than once in a quiz, so variants are stored by
  // "qid:n" and looked up by position (variantOf(qi)).
  const variants = {};          // "qid:n" -> decoded variant
  const waiting = {};           // "qid:n" -> resolvers

  function deobfuscate(qid, payload) {
    const bin = atob(payload);
    const bytes = new Uint8Array(bin.length);
    let x = seedFrom("stack-question:" + qid);   // same key as build.py (OBFUSCATION_PREFIX)
    for (let i = 0; i < bin.length; i++) {
      x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0;
      bytes[i] = bin.charCodeAt(i) ^ (x & 0xff);
    }
    return JSON.parse(new TextDecoder().decode(bytes));
  }

  function seedFrom(text) {
    let h = 2166136261;
    for (const ch of new TextEncoder().encode(text)) { h ^= ch; h = Math.imul(h, 16777619) >>> 0; }
    return h || 1;
  }

  window.STACK_VARIANT = function (qid, n, payload) {
    const key = `${qid}:${n}`;
    variants[key] = deobfuscate(qid, payload);
    (waiting[key] || []).forEach((resolve) => resolve());
    delete waiting[key];
  };

  function loadVariant(q, n) {
    const key = `${q.id}:${n}`;
    if (variants[key]) return Promise.resolve();
    return new Promise((resolve, reject) => {
      if (waiting[key]) { waiting[key].push(resolve); return; }
      waiting[key] = [resolve];
      const s = document.createElement("script");
      s.src = `data/${q.id}/${n}.js`;
      s.onerror = () => reject(new Error("variant load failed: " + s.src));
      document.head.appendChild(s);
    });
  }

  const variantOf = (qi) => variants[`${QUIZ.questions[qi].id}:${state.v[qi]}`];

  // ------------------------------------------------------------------ state
  //
  // suspend_data (SCORM 1.2 allows ~4096 characters):
  //   v: variant number per question       a: answers {"qi:input": text | [cells] | option}
  //   f: attempt submitted                 m: final marks per question       pg: current page
  //   q: per question {b: best fraction per PRT, p: penalised tries per PRT,
  //                    l: last checked answers, r: its raw fraction, t: tries, x: closed}

  let state;

  function saveState() {
    const data = safeEncode(JSON.stringify(state));
    if (data.length > 4000) console.warn("suspend_data is long:", data.length);
    Scorm.set("cmi.suspend_data", data);
    Scorm.commit();
  }

  // Random variant per question; copies of the same question get different variants
  // while there are enough of them.
  function drawVariants() {
    const used = {};
    return QUIZ.questions.map((q, qi) => {
      if (QUIZ.variants && QUIZ.variants[qi]) return QUIZ.variants[qi];
      const taken = used[q.id] || (used[q.id] = new Set());
      const free = [];
      for (let n = 1; n <= q.nvariants; n++) if (!taken.has(n)) free.push(n);
      const n = free.length ? free[Math.floor(Math.random() * free.length)] : 1 + Math.floor(Math.random() * q.nvariants);
      taken.add(n);
      return n;
    });
  }

  function newState() {
    return {
      // QUIZ.variants: fixed variant numbers (website preview); otherwise drawn at random.
      v: drawVariants(),
      a: {},
      q: QUIZ.questions.map(() => ({ b: {}, p: {}, t: 0 })),
      f: 0,
    };
  }

  const answerKey = (qi, name) => `${qi}:${name}`;
  const answersSignature = (qi) => JSON.stringify(QUIZ.questions[qi].inputs.map((i) => state.a[answerKey(qi, i.name)] ?? ""));

  // ------------------------------------------------------------------ rendering

  const ctFill = (text, v) => (text || "").replace(/\{\{CT:(\d+)\}\}/g, (_, i) => v.ct[+i] ?? "");

  function inputHtml(qi, inp) {
    const id = `q${qi}-${inp.name}`;
    const q = QUIZ.questions[qi];
    const v = variantOf(qi);
    const value = state.a[answerKey(qi, inp.name)];
    const attrs = `data-q="${qi}" data-input="${esc(inp.name)}" dir="ltr" autocapitalize="none" spellcheck="false"`;
    const width = (inp.boxsize || 15) * 0.9 + 0.1;

    if (inp.type === "matrix") {
      const [rows, cols] = matrixSize(v.tans[inp.name].value);
      const cells = Array.isArray(value) ? value : [];
      // An inline grid, not a <table>: the input usually sits inside a <p>.
      let html = `<span class="matrixinput" id="${id}" dir="ltr"><span class="matrixbracket left"></span>` +
        `<span class="matrixcells" style="grid-template-columns:repeat(${cols},auto)">`;
      for (let k = 0; k < rows * cols; k++) {
        html += `<input type="text" class="matrixcell" id="${id}-${k}" data-cell="${k}" ${attrs}` +
          ` size="${inp.boxsize}" value="${esc(cells[k] ?? "")}">`;
      }
      return html + `</span><span class="matrixbracket right"></span></span>`;
    }

    if (inp.type === "boolean") {
      const opt = (v, label) => `<option value="${v}"${value === v ? " selected" : ""}>${label}</option>`;
      return `<select id="${id}" class="dropdown boolean" ${attrs}>${opt("", T.nochoice)}${opt("true", T.true)}${opt("false", T.false)}</select>`;
    }

    if (inp.type === "dropdown") {
      const opts = dropdownOptions(qi, inp);
      return `<select id="${id}" class="dropdown" ${attrs}><option value="">${T.nochoice}</option>` +
        opts.map((o, k) => `<option value="${k + 1}"${String(value) === String(k + 1) ? " selected" : ""}>${o.display}</option>`).join("") +
        "</select>";
    }

    if (!["algebraic", "numerical", "units", "string", "singlechar"].includes(inp.type)) {
      return `<span class="stack-unsupported">[input type ${esc(inp.type)} not supported yet]</span>`;
    }
    const hint = inp.syntaxhint && inp.syntaxattribute === 1 ? ` placeholder="${esc(inp.syntaxhint)}"` : "";
    const initial = value ?? (inp.syntaxhint && inp.syntaxattribute !== 1 ? inp.syntaxhint : "");
    return `<input type="text" class="algebraic" id="${id}" ${attrs} size="${inp.boxsize}"` +
      ` style="width:${width}em" value="${esc(initial)}"${hint}>`;
  }

  function matrixSize(tans) {
    const ast = M.parse(tans);
    if (ast.k !== "call" || ast.name !== "matrix") throw new Error("matrix input: teacher answer is not a matrix");
    return [ast.args.length, ast.args[0].k === "list" ? ast.args[0].items.length : 1];
  }

  // Dropdown options from the teacher's answer: [[value, correct, display?], ...]
  function dropdownOptions(qi, inp) {
    const q = QUIZ.questions[qi];
    const ast = M.parse(variantOf(qi).tans[inp.name].value);
    return ast.items.map((item) => {
      const [val, correct, display] = item.items;
      const shown = display ? (display.k === "str" ? esc(display.value) : `\\(${M.latex(display, q.options)}\\)`)
        : val.k === "str" ? esc(val.value) : `\\(${M.latex(val, q.options)}\\)`;
      return { value: val, correct: correct.k === "id" && correct.name === "true", display: shown };
    });
  }

  function renderText(qi, q, v, html, jsx) {
    html = ctFill(html, v);
    html = html.replace(/\[\[jsxgraph([^\]]*)\]\]([\s\S]*?)\[\[\/jsxgraph\]\]/g, (_, attrs, code) => {
      const id = `q${qi}-jsx${jsx.length}-${Math.random().toString(36).slice(2, 7)}`;
      const w = /width\s*=\s*['"]([^'"]+)/.exec(attrs), h = /height\s*=\s*['"]([^'"]+)/.exec(attrs);
      jsx.push({ id, code });
      return `<div class="stack-jsxgraph" style="width:${w ? w[1] : "500px"};height:${h ? h[1] : "400px"}">` +
        `<div class="jxgbox" id="${id}" style="width:100%;height:100%"></div></div>`;
    });
    html = html.replace(/\[\[comment\]\][\s\S]*?\[\[\/comment\]\]/g, "");
    html = html.replace(/\[\[input:(\w+)\]\]/g, (_, name) => {
      const inp = q.inputs.find((i) => i.name === name);
      return inp ? inputHtml(qi, inp) : "";
    });
    html = html.replace(/\[\[validation:(\w+)\]\]/g, (_, name) =>
      `<span class="stackinputfeedback" id="q${qi}-val-${name}"></span>`);
    html = html.replace(/\[\[feedback:(\w+)\]\]/g, (_, name) =>
      `<div class="stackprtfeedback" id="q${qi}-prt-${name}"></div>`);
    return html;
  }

  function renderQuestion(qi) {
    const q = QUIZ.questions[qi];
    const v = variantOf(qi);
    const jsx = [];
    const el = document.createElement("div");
    const behaviour = behaviourOf(q);
    el.className = `que stack ${behaviour}`;
    el.id = `q${qi}`;
    // Specific feedback holds the [[feedback:prtN]] that the question text does not show itself.
    const sf = q.prts.some((p) => !q.questiontext.includes(`[[feedback:${p.name}]]`)) ? q.specificfeedback : "";
    const checkBtn = behaviour === "deferredfeedback" ? "" :
      `<div class="im-controls"><button type="button" class="btn check" id="q${qi}-check">${T.check}</button>` +
      `<button type="button" class="btn tryagain" id="q${qi}-tryagain" hidden>${T.tryagain}</button></div>`;
    el.innerHTML = `
      <div class="info">
        <h3 class="no">${T.question} <span class="qno">${qi + 1}</span></h3>
        <div class="state" id="q${qi}-state">${T.notyetanswered}</div>
        <div class="grade" id="q${qi}-grade">${T.markedoutof(fmt(q.defaultgrade))}</div>
        ${QUIZ.showseed ? `<div class="seed" dir="ltr">seed ${v.seed}</div>` : ""}
      </div>
      <div class="content">
        <div class="formulation">${renderText(qi, q, v, q.questiontext, jsx)}${checkBtn}</div>
        <div class="outcome" id="q${qi}-outcome" hidden>
          <div class="specificfeedback" id="q${qi}-specific">${renderText(qi, q, v, sf, jsx)}</div>
          <div class="generalfeedback" id="q${qi}-general"></div>
          <div class="rightanswer" id="q${qi}-right"></div>
          <div class="gradingdetails" id="q${qi}-details"></div>
        </div>
      </div>`;
    return { el, jsx };
  }

  function runJsxGraph(jsx) {
    for (const { id, code } of jsx) {
      try {
        // STACK exposes the board container id as both divid and BOARDID.
        new Function("divid", "BOARDID", code)(id, id);
      } catch (e) {
        console.error("JSXGraph code failed", e);
        $(id).textContent = "JSXGraph: " + e.message;
      }
    }
  }

  function typeset(elements) {
    if (!window.MathJax || !MathJax.typesetPromise) return Promise.resolve();
    if (MathJax.typesetClear) MathJax.typesetClear(elements);
    return MathJax.typesetPromise(elements).catch((e) => console.error(e));
  }

  // ------------------------------------------------------------------ input validation

  const KNOWN_FUNCTIONS = new Set(["sin", "cos", "tan", "sec", "csc", "cot", "asin", "acos", "atan", "atan2",
    "sinh", "cosh", "tanh", "asinh", "acosh", "atanh", "exp", "log", "ln", "sqrt", "abs", "floor", "ceiling",
    "signum", "unit_step", "heaviside", "matrix", "min", "max", "factorial"]);

  const splitWords = (s) => (s || "").split(",").map((w) => w.trim()).filter((w) => w && !w.startsWith("[["));

  function parseStudent(qi, inp, text) {
    const q = QUIZ.questions[qi];
    let ast;
    try {
      ast = M.studentNormalise(M.parse(text, { insertstars: inp.insertstars }));
    } catch (e) {
      const f = T.errors[e.code];
      return { error: typeof f === "function" ? f(e.detail || "") : f || T.errors.syntax };
    }
    if (inp.forbidfloat && M.hasFloat(ast)) return { error: T.errors.float };
    const allowed = new Set(splitWords(inp.allowwords));
    const forbidden = new Set([...q.qvnames, ...splitWords(inp.forbidwords)]);
    for (const w of [...M.identifiers(ast), ...M.functionsUsed(ast)]) {
      if (forbidden.has(w) && !allowed.has(w)) return { error: T.errors.forbidden(w) };
    }
    for (const fn of M.functionsUsed(ast)) {
      if (!KNOWN_FUNCTIONS.has(fn) && !allowed.has(fn)) return { error: T.errors.unknownfunction(fn) };
    }
    return { ast };
  }

  // -> {status: "blank" | "invalid" | "valid", ast, error}
  function validate(qi, inp) {
    const value = state.a[answerKey(qi, inp.name)];
    if (inp.type === "boolean") {
      if (value !== "true" && value !== "false") return { status: "blank" };
      return { status: "valid", ast: { k: "id", name: value } };
    }
    if (inp.type === "dropdown") {
      if (!value) return { status: "blank" };
      const opt = dropdownOptions(qi, inp)[+value - 1];
      return opt ? { status: "valid", ast: opt.value, display: opt.display } : { status: "blank" };
    }
    if (inp.type === "matrix") {
      const cells = Array.isArray(value) ? value : [];
      const [rows, cols] = matrixSize(variantOf(qi).tans[inp.name].value);
      const filled = cells.filter((c) => (c || "").trim()).length;
      if (!filled) return { status: "blank" };
      if (filled < rows * cols) return { status: "invalid", error: T.errors.matrixblank };
      const rowAsts = [];
      for (let r = 0; r < rows; r++) {
        const items = [];
        for (let c = 0; c < cols; c++) {
          const res = parseStudent(qi, inp, cells[r * cols + c].trim());
          if (res.error) return { status: "invalid", error: res.error };
          items.push(res.ast);
        }
        rowAsts.push({ k: "list", items });
      }
      return { status: "valid", ast: { k: "call", name: "matrix", args: rowAsts } };
    }
    const text = (value ?? "").toString().trim();
    if (!text) return { status: "blank" };
    const res = parseStudent(qi, inp, text);
    return res.error ? { status: "invalid", error: res.error } : { status: "valid", ast: res.ast };
  }

  function showValidation(qi, inp, result) {
    const box = $(`q${qi}-val-${inp.name}`);
    const input = $(`q${qi}-${inp.name}`);
    if (input) input.classList.toggle("invalid", result.status === "invalid");
    if (!box || inp.type === "dropdown" || inp.type === "boolean") return;
    const mode = inp.showvalidation ?? 1;
    if (result.status === "blank" || mode === 0) { box.innerHTML = ""; box.className = "stackinputfeedback"; return; }
    if (result.status === "invalid") {
      box.className = "stackinputfeedback stackinputerror";
      box.innerHTML = `<span class="stackinputerror">${result.error}</span>`;
    } else {
      const q = QUIZ.questions[qi];
      const tex = M.latex(result.ast, q.options);
      if (mode === 3) {
        box.className = "stackinputfeedback compact";
        box.innerHTML = `<span class="filter_mathjaxloader_equation">\\(${tex}\\)</span>`;
      } else {
        box.className = "stackinputfeedback standard";
        let html = `<p>${T.interpreted}</p><div class="filter_mathjaxloader_equation" dir="ltr">\\[ ${tex} \\]</div>`;
        const vars = [...M.freeVariables(result.ast, {})];
        if (mode === 1 && vars.length) html += `<p>${T.variables} <span dir="ltr">\\( \\left[ ${vars.join(" , ")} \\right] \\)</span></p>`;
        box.innerHTML = html;
      }
    }
    typeset([box]);
  }

  function readInput(qi, inp) {
    const id = `q${qi}-${inp.name}`;
    if (inp.type === "matrix") {
      return [...document.querySelectorAll(`#${id} input.matrixcell`)].map((c) => c.value);
    }
    const el = $(id);
    return el ? el.value : "";
  }

  function attachInputs(qi) {
    const q = QUIZ.questions[qi];
    for (const inp of q.inputs) {
      const container = $(`q${qi}-${inp.name}`);
      if (!container) continue;
      let timer;
      const update = () => {
        state.a[answerKey(qi, inp.name)] = readInput(qi, inp);
        showValidation(qi, inp, validate(qi, inp));
        updateAnsweredState(qi);
        updateNav(qi);
        saveState();
      };
      container.addEventListener("input", () => { clearTimeout(timer); timer = setTimeout(update, 500); });
      container.addEventListener("change", () => { clearTimeout(timer); update(); });
      if (state.a[answerKey(qi, inp.name)] !== undefined) showValidation(qi, inp, validate(qi, inp));
    }
    const check = $(`q${qi}-check`);
    if (check) check.onclick = () => { flushInputs(qi); checkQuestion(qi); };
    const again = $(`q${qi}-tryagain`);
    if (again) again.onclick = () => tryAgain(qi);
    updateAnsweredState(qi);
  }

  function flushInputs(qi) {
    for (const inp of QUIZ.questions[qi].inputs) {
      if ($(`q${qi}-${inp.name}`)) state.a[answerKey(qi, inp.name)] = readInput(qi, inp);
    }
  }

  function setReadOnly(qi, ro) {
    document.querySelectorAll(`#q${qi} .formulation input, #q${qi} .formulation select`).forEach((el) => {
      if (el.tagName === "SELECT") el.disabled = ro; else el.readOnly = ro;
    });
  }

  function updateAnsweredState(qi) {
    const q = QUIZ.questions[qi];
    const qs = state.q[qi];
    if (state.f || qs.l !== undefined) return;    // a graded state is shown instead
    const any = q.inputs.some((i) => validate(qi, i).status !== "blank");
    $(`q${qi}-state`).textContent = any ? T.answersaved : T.notyetanswered;
  }

  // ------------------------------------------------------------------ grading (PRTs)

  // Answer tests and PRT evaluation live in engine.js (shared with tests/selfcheck.js).
  const E = window.StackEngine;
  const runPrt = (qi, prt, asts) => E.runPrt(QUIZ.questions[qi], variantOf(qi), prt, asts);
  const prtInputs = E.prtInputs;

  // Evaluate the PRTs on the current answers. {prts: {name: result|null}, invalid, blank}
  function evaluateQuestion(qi) {
    const q = QUIZ.questions[qi];
    const asts = {}, status = {};
    for (const inp of q.inputs) {
      const r = validate(qi, inp);
      status[inp.name] = r.status;
      if (r.status === "valid") asts[inp.name] = r.ast;
    }
    const prts = {};
    for (const prt of q.prts) {
      const needs = prtInputs(q, prt);
      if (!needs.every((n) => status[n] === "valid")) { prts[prt.name] = null; continue; }
      try {
        prts[prt.name] = runPrt(qi, prt, asts);
      } catch (e) {
        console.error(e);
        prts[prt.name] = { score: 0, penalty: q.penalty, notes: ["error"], feedback: [] };
      }
    }
    const values = Object.values(status);
    return { prts, invalid: values.includes("invalid"), blank: values.every((s) => s === "blank") };
  }

  const weightedFraction = (q, byPrt) => {
    const total = q.prts.reduce((s, p) => s + p.value, 0);
    return total ? q.prts.reduce((s, p) => s + p.value * (byPrt[p.name] || 0), 0) / total : 0;
  };

  const questionMark = (qi) => weightedFraction(QUIZ.questions[qi], state.q[qi].b) * QUIZ.questions[qi].defaultgrade;

  function quizGrade() {
    const sum = QUIZ.questions.reduce((s, _, qi) => s + questionMark(qi), 0);
    return QUIZ.sumgrades ? (sum / QUIZ.sumgrades) * QUIZ.grade : 0;
  }

  // Record one graded submission of question qi. Returns what to display.
  function submitQuestion(qi) {
    const q = QUIZ.questions[qi];
    const qs = state.q[qi];
    const behaviour = behaviourOf(q);
    const ev = evaluateQuestion(qi);
    const sig = answersSignature(qi);
    if (ev.blank) return { ev, kind: "blank" };
    // As in STACK: a PRT whose inputs are not all valid is not evaluated; with none evaluated
    // the submission is not a try at all.
    if (Object.values(ev.prts).every((r) => r === null)) return { ev, kind: ev.invalid ? "invalid" : "incomplete" };
    if (qs.l === sig) return { ev, kind: "repeat" };   // unchanged answer: no new try, no penalty

    const usePenalty = PENALTY_BEHAVIOURS.has(behaviour);
    const raw = {};
    let penaltyThisTry = 0;
    for (const prt of q.prts) {
      const r = ev.prts[prt.name];
      if (!r) continue;
      raw[prt.name] = r.score;
      const accrued = usePenalty ? (qs.p[prt.name] || 0) : 0;
      const adjusted = Math.max(0, r.score - accrued);
      qs.b[prt.name] = Math.round(Math.max(qs.b[prt.name] || 0, adjusted) * 1e4) / 1e4;
      if (usePenalty && r.score < 1) {
        qs.p[prt.name] = Math.round(((qs.p[prt.name] || 0) + r.penalty) * 1e4) / 1e4;
        penaltyThisTry = Math.max(penaltyThisTry, r.penalty);
      }
    }
    qs.l = sig;
    qs.t = (qs.t || 0) + 1;
    const rawFraction = weightedFraction(q, raw);
    qs.r = Math.round(rawFraction * 1e4) / 1e4;   // correctness shown is that of the last submission
    logInteraction(qi, rawFraction);
    if (behaviour === "immediatefeedback") qs.x = 1;
    if (behaviour === "interactive" && (rawFraction >= 1 || qs.t >= maxTries(q))) qs.x = 1;
    return { ev, kind: "graded", rawFraction, penaltyThisTry };
  }

  const maxTries = (q) => q.tries || (q.nhints || 0) + 1;

  // ------------------------------------------------------------------ reporting to Moodle
  //
  // Every graded submission is reported as a SCORM interaction, which Moodle shows in the
  // SCORM activity's interactions report ("דוח תת־פעילויות בלומדה") and lets the teacher
  // download.  The review page of the website (site/review.js) reads that download.
  //   id               q<position>_<question id>_v<variant>_t<try>_d<yyyymmdd>T<hhmmss>
  //   student_response ans1=...; ans2=...  (what the student typed; matrix(...) for a matrix,
  //                    #k for the k-th dropdown option), encoded (safeEncode)
  //   result           mark of this submission, 0..1 ("neutral": not gradable);   weighting   the question's mark
  //   time / latency   clock time, and time since the previous submission of the question
  // When an attempt starts, the quiz itself is reported too, so that the review page can
  // show every question in the student's variant and regrade the attempt:
  //   id               quiz_<part>of<parts>_d<yyyymmdd>T<hhmmss>
  //   student_response g=<grade>;s=<sum of marks>;b=<behaviour>;<position>=<question id>/<variant>/<mark>[/<behaviour>[/<tries>]];...
  // SCORM 1.2 limits responses to 255 characters.

  const sessionStart = Date.now();
  const lastTouch = {};            // qi -> ms of the previous submission (or session start)

  const pad = (n, w = 2) => String(n).padStart(w, "0");
  // Values sent to Moodle hold only letters, digits, "-" and "_" (base64url of the UTF-8
  // text, marked by a leading "B"): firewalls in front of Moodle (e.g. BGU's) may block
  // requests whose data looks like code, and STACK answers are full of ( ) ; = ^ < >.
  function safeEncode(text) {
    const bytes = new TextEncoder().encode(text);
    let bin = "";
    for (const b of bytes) bin += String.fromCharCode(b);
    return "B" + btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  }
  function safeDecode(data) {
    if (!data || data[0] !== "B") return data;
    const bin = atob(data.slice(1).replace(/-/g, "+").replace(/_/g, "/"));
    return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  }
  // At most 255 characters after encoding (CMIString255).
  function safeClip(text) {
    let chars = Array.from(text), out = safeEncode(text);
    while (out.length > 255) {
      chars = chars.slice(0, Math.floor(chars.length * 0.9) - 1);
      out = safeEncode(chars.join("") + "...");
    }
    return out;
  }
  // CMITimespan HHHH:MM:SS.SS
  function timespan(ms) {
    const t = Math.max(0, ms) / 1000;
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), sec = t % 60;
    return `${pad(Math.min(h, 9999), 4)}:${pad(m)}:${sec.toFixed(2).padStart(5, "0")}`;
  }

  // shown: for people (dropdown option text), otherwise as reported (#k).
  function responseText(qi, shown) {
    const q = QUIZ.questions[qi];
    return q.inputs.map((inp) => {
      let v = state.a[answerKey(qi, inp.name)];
      if (inp.type === "matrix" && Array.isArray(v)) {
        const [rows, cols] = matrixSize(variantOf(qi).tans[inp.name].value);
        v = "matrix(" + Array.from({ length: rows }, (_, r) => "[" + v.slice(r * cols, r * cols + cols).join(",") + "]").join(",") + ")";
      } else if (inp.type === "dropdown" && v) {
        const opt = shown && dropdownOptions(qi, inp)[+v - 1];
        v = opt ? M.latex(opt.value).replace(/\\mbox\{([^}]*)\}/g, "$1") : "#" + v;
      }
      return `${inp.name}=${(v ?? "").toString().trim()}`;
    }).join("; ");
  }


  const stamp = (t) => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  const logging = () => (Scorm.connected || QUIZ.logLocally) && !QUIZ.replay;

  function nextInteraction() {
    let n = parseInt(Scorm.get("cmi.interactions._count"), 10);
    if (!(n >= 0)) n = 0;
    n = Math.max(n, state.ni || 0);
    state.ni = n + 1;
    return n;
  }

  // The quiz layout (questions, variants, marks, behaviours), once per attempt.
  function logQuizLayout() {
    if (!logging() || state.h) return;
    const items = [`g=${QUIZ.grade}`, `s=${QUIZ.sumgrades}`, `b=${QUIZ.behaviour || "adaptivenopenalty"}`];
    QUIZ.questions.forEach((q, qi) => {
      let item = `${qi + 1}=${q.id}/${state.v[qi]}/${q.defaultgrade}`;
      if (q.behaviour && q.behaviour !== QUIZ.behaviour) item += `/${q.behaviour}` + (q.tries ? `/${q.tries}` : "");
      else if (q.tries) item += `//${q.tries}`;
      items.push(item);
    });
    // Parts of at most 180 characters, 241 after encoding.
    const parts = [];
    for (const item of items) {
      if (parts.length && parts[parts.length - 1].length + item.length + 1 <= 180) parts[parts.length - 1] += ";" + item;
      else parts.push(item);
    }
    const now = new Date();
    parts.forEach((text, k) => {
      const base = `cmi.interactions.${nextInteraction()}.`;
      Scorm.set(base + "id", `quiz_${k + 1}of${parts.length}_d${stamp(now)}`);
      Scorm.set(base + "type", "fill-in");
      Scorm.set(base + "student_response", safeClip(text));
      Scorm.set(base + "result", "neutral");
      Scorm.set(base + "time", `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    });
    state.h = 1;
  }

  function logInteraction(qi, fraction) {
    if (!logging()) return;
    const q = QUIZ.questions[qi];
    const now = new Date();
    const n = nextInteraction();
    const base = `cmi.interactions.${n}.`;
    Scorm.set(base + "id", `q${qi + 1}_${q.id}_v${state.v[qi]}_t${state.q[qi].t}_d${stamp(now)}`);
    Scorm.set(base + "type", "fill-in");
    // The correct answer is not sent: the review page computes it from the variant.
    Scorm.set(base + "student_response", safeClip(responseText(qi)));
    // "neutral": submitted but not graded (invalid or incomplete answer).
    Scorm.set(base + "result", fraction === null ? "neutral" : String(Math.round(fraction * 1000) / 1000));
    Scorm.set(base + "weighting", String(q.defaultgrade));
    Scorm.set(base + "time", `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`);
    Scorm.set(base + "latency", timespan(now - (lastTouch[qi] || sessionStart)));
    lastTouch[qi] = now.getTime();
  }

  // Time spent in this session; Moodle adds it up into the attempt's total time.
  function reportSessionTime() {
    Scorm.set("cmi.core.session_time", timespan(Date.now() - sessionStart));
  }
  Scorm.onLeave = reportSessionTime;      // leaving without submitting (scorm.js, beforeunload)

  // ------------------------------------------------------------------ replay (website review page)
  //
  // QUIZ.replay: {v: [variant per question], log: [{qi, text}]} – one attempt rebuilt from
  // the reported submissions (text: the decoded student_response) and shown as a review.
  // QUIZ.batch: [{v, log}, ...] – attempts only regraded, without display; the results
  // are posted to the parent page.  Each submission is graded again with the current
  // version of the question, in the order the student made them.

  // Split at top-level separators (not inside brackets or strings).
  function splitTop(text, sep) {
    const out = [];
    let depth = 0, quote = false, start = 0;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') quote = !quote;
      else if (quote) continue;
      else if ("([{".includes(c)) depth++;
      else if (")]}".includes(c)) depth--;
      else if (depth === 0 && text.startsWith(sep, i)) { out.push(text.slice(start, i)); start = i + sep.length; i += sep.length - 1; }
    }
    out.push(text.slice(start));
    return out;
  }

  // "ans1=...; ans2=..." -> answers of question qi, as the inputs keep them.
  function parseResponse(qi, text) {
    const q = QUIZ.questions[qi];
    const found = {};
    const names = q.inputs.map((i) => i.name.replace(/[^\w]/g, ""));
    const re = new RegExp(`(?:^|; )(${names.join("|")})=`, "g");
    const marks = [...text.matchAll(re)];
    marks.forEach((m, k) => {
      const end = k + 1 < marks.length ? marks[k + 1].index : text.length;
      found[m[1]] = text.slice(m.index + m[0].length, end);
    });
    const answers = {};
    for (const inp of q.inputs) {
      let v = (found[inp.name] ?? "").trim();
      if (inp.type === "matrix") {
        const inner = /^matrix\((.*)\)$/.exec(v);
        v = inner ? splitTop(inner[1], ",").flatMap((row) => splitTop(row.trim().replace(/^\[|\]$/g, ""), ",").map((c) => c.trim())) : [];
      } else if (inp.type === "dropdown") {
        if (/^#\d+$/.test(v)) v = v.slice(1);
        else if (v) {       // packages before October 2026 reported the option's text
          const k = dropdownOptions(qi, inp).findIndex((o) => M.latex(o.value).replace(/\\mbox\{([^}]*)\}/g, "$1") === v);
          v = k >= 0 ? String(k + 1) : "";
        }
      }
      answers[answerKey(qi, inp.name)] = v;
    }
    return answers;
  }

  async function replayAttempt(job) {
    state = { v: job.v, a: {}, q: QUIZ.questions.map(() => ({ b: {}, p: {}, t: 0 })), f: 0 };
    await Promise.all(QUIZ.questions.map((q, qi) => loadVariant(q, state.v[qi])));
    const tries = job.log.map(({ qi, text }) => {
      Object.assign(state.a, parseResponse(qi, text));
      const sub = submitQuestion(qi);
      return { kind: sub.kind, fraction: sub.rawFraction ?? null, shown: responseText(qi, true) };
    });
    QUIZ.questions.forEach((_, qi) => { state.q[qi].x = 1; });
    state.f = 1;
    return { tries, marks: QUIZ.questions.map((_, qi) => questionMark(qi)), grade: quizGrade() };
  }

  async function runBatch() {
    const results = [];
    for (const job of QUIZ.batch) {
      try { results.push(await replayAttempt(job)); } catch (e) { results.push({ error: e.message }); }
    }
    parent.postMessage({ type: "stack-batch", id: QUIZ.batchId, results }, location.origin);
  }

  // ------------------------------------------------------------------ feedback display

  function prtFeedbackHtml(qi, prt, res) {
    const q = QUIZ.questions[qi];
    const v = variantOf(qi);
    if (!res) return "";
    let html = "";
    if (prt.feedbackstyle !== 0) {
      const std = res.score >= 1 ? (q.prtcorrect || T.prtdefault.correct)
        : res.score <= 0 ? (q.prtincorrect || T.prtdefault.incorrect)
        : (q.prtpartiallycorrect || T.prtdefault.partially);
      html += ctFill(std, v);
    }
    html += res.feedback.map((f) => ctFill(f, v)).join(" ");
    return html;
  }

  /*
   * Show the outcome of question qi.  opts: {R: review options, ev, sub (submitQuestion result),
   * closed}.  Returns the elements to typeset and JSXGraph boards to draw.
   */
  function showOutcome(qi, opts) {
    const q = QUIZ.questions[qi];
    const v = variantOf(qi);
    const R = opts.R;
    const ev = opts.ev;
    const qs = state.q[qi];
    const que = $(`q${qi}`);
    const jsx = [];
    const graded = ev && Object.values(ev.prts).some((r) => r);
    const fraction = weightedFraction(q, qs.b);
    const rawFraction = opts.sub && opts.sub.rawFraction !== undefined ? opts.sub.rawFraction : qs.r ?? fraction;

    que.classList.remove("correct", "incorrect", "partiallycorrect", "notanswered");
    let word = !graded ? (ev && ev.invalid ? T.invalid : ev && !ev.blank ? T.incomplete : T.notanswered)
      : rawFraction >= 1 ? T.correct : rawFraction <= 0 ? T.incorrect : T.partiallycorrect;
    if (R.correctness && graded) que.classList.add(rawFraction >= 1 ? "correct" : rawFraction <= 0 ? "incorrect" : "partiallycorrect");
    $(`q${qi}-state`).textContent = R.correctness || !graded ? word : T.answersaved;
    $(`q${qi}-grade`).textContent = R.marks && graded ? T.mark(fmt(fraction * q.defaultgrade), fmt(q.defaultgrade))
      : T.markedoutof(fmt(q.defaultgrade));

    let show = false;
    const specific = $(`q${qi}-specific`);
    for (const prt of q.prts) {
      const box = $(`q${qi}-prt-${prt.name}`);
      if (box) box.innerHTML = R.specificfeedback && ev ? prtFeedbackHtml(qi, prt, ev.prts[prt.name]) : "";
    }
    // PRT feedback placed in the specific feedback (not inline in the question text) needs the outcome box.
    if ([...specific.querySelectorAll(".stackprtfeedback")].some((b) => b.innerHTML)) show = true;
    specific.hidden = !R.specificfeedback;

    const general = $(`q${qi}-general`);
    general.innerHTML = R.generalfeedback && opts.closed && q.generalfeedback ? renderText(qi, q, v, q.generalfeedback, jsx) : "";
    if (general.innerHTML) show = true;

    const right = $(`q${qi}-right`);
    right.innerHTML = R.rightanswer && opts.closed ? q.inputs.map((inp) => rightAnswerHtml(qi, inp)).join("") : "";
    if (right.innerHTML) show = true;

    const details = $(`q${qi}-details`);
    details.innerHTML = "";
    if (opts.sub && opts.sub.kind === "invalid") details.innerHTML = `<p>${T.invalidsubmission}</p>`;
    else if (opts.sub && opts.sub.kind === "incomplete") details.innerHTML = `<p>${T.incompletesubmission}</p>`;
    else if (R.marks && opts.sub && opts.sub.kind === "graded" && behaviourOf(q) !== "deferredfeedback") {
      const g = fmt(q.defaultgrade);
      let html = `<p>${T.submissionmark(fmt(rawFraction * q.defaultgrade), g)}`;
      if (Math.abs(fraction - rawFraction) > 1e-9) html += ` ${T.withpenalty(fmt(fraction * q.defaultgrade), g)}`;
      if (opts.sub.penaltyThisTry > 0) html += ` ${T.penaltynote(fmt(opts.sub.penaltyThisTry))}`;
      details.innerHTML = html + "</p>";
    }
    if (behaviourOf(q) === "interactive" && opts.sub && opts.sub.kind === "graded" && !opts.closed) {
      details.innerHTML += `<p>${T.triesleft(maxTries(q) - qs.t)}</p>`;
    }
    if (details.innerHTML) show = true;

    $(`q${qi}-outcome`).hidden = !show;
    return { elements: [que], jsx };
  }

  function rightAnswerHtml(qi, inp) {
    const q = QUIZ.questions[qi];
    const t = variantOf(qi).tans[inp.name] || {};
    if (inp.type === "dropdown") {
      const correct = dropdownOptions(qi, inp).filter((o) => o.correct).map((o) => o.display).join(", ");
      return `<p>${T.rightanswer}: ${correct}</p>`;
    }
    if (inp.type === "boolean") return `<p>${T.rightanswer}: ${t.value === "true" ? T.true : T.false}</p>`;
    return `<p>${T.rightanswer} <span dir="ltr">\\( ${t.latex || ""} \\)</span>, ${T.typedas} <code dir="ltr">${esc(t.value || "")}</code></p>`;
  }

  // ------------------------------------------------------------------ immediate behaviours

  function reportProgress() {
    Scorm.set("cmi.core.score.min", 0);
    Scorm.set("cmi.core.score.max", QUIZ.grade);
    Scorm.set("cmi.core.score.raw", Math.round(quizGrade() * 100) / 100);
  }

  function checkQuestion(qi) {
    const q = QUIZ.questions[qi];
    const qs = state.q[qi];
    if (qs.x || state.f) return;
    const sub = submitQuestion(qi);
    if (sub.kind === "blank") return;
    const closed = !!qs.x;
    const out = showOutcome(qi, { R: QUIZ.review.during, ev: sub.ev, sub, closed: closed || adaptiveDone(qi) });
    if (behaviourOf(q) === "interactive" && !closed && sub.kind === "graded") {
      setReadOnly(qi, true);
      $(`q${qi}-check`).hidden = true;
      $(`q${qi}-tryagain`).hidden = false;
    }
    if (closed) closeQuestion(qi);
    updateNav(qi);
    reportProgress();
    saveState();
    typeset(out.elements).then(() => runJsxGraph(out.jsx));
  }

  const adaptiveDone = (qi) => weightedFraction(QUIZ.questions[qi], state.q[qi].b) >= 1;

  function tryAgain(qi) {
    setReadOnly(qi, false);
    $(`q${qi}-check`).hidden = false;
    $(`q${qi}-tryagain`).hidden = true;
    for (const prt of QUIZ.questions[qi].prts) { const b = $(`q${qi}-prt-${prt.name}`); if (b) b.innerHTML = ""; }
    $(`q${qi}-outcome`).hidden = true;
  }

  function closeQuestion(qi) {
    setReadOnly(qi, true);
    const c = $(`q${qi}-check`), a = $(`q${qi}-tryagain`);
    if (c) c.hidden = true;
    if (a) a.hidden = true;
  }

  // ------------------------------------------------------------------ finishing and review

  function finishAttempt() {
    if (!confirm(T.confirmfinish)) return;
    QUIZ.questions.forEach((q, qi) => {
      flushInputs(qi);
      const qs = state.q[qi];
      // Like Moodle's "submit all and finish": grade answers not yet checked.  Answers that
      // cannot be graded (invalid, incomplete) are still reported, so the teacher sees them.
      if (!qs.x && qs.l !== answersSignature(qi)) {
        const sub = submitQuestion(qi);
        if (sub.kind === "invalid" || sub.kind === "incomplete") logInteraction(qi, null);
      }
      qs.x = 1;
    });
    state.f = 1;
    state.m = QUIZ.questions.map((_, qi) => Math.round(questionMark(qi) * 1e4) / 1e4);
    reportProgress();
    reportSessionTime();
    Scorm.set("cmi.core.lesson_status", "completed");
    Scorm.set("cmi.core.exit", "");
    saveState();
    Scorm.finish();
    showReview();
  }

  function showReview() {
    const R = QUIZ.review.after;
    const summary = $("summary");
    summary.hidden = false;
    summary.innerHTML = `<p>${T.submitted}</p>` + (R.marks ? `<p class="grade">${T.grade(fmt(quizGrade()), fmt(QUIZ.grade))}</p>` : "");
    if (Scorm.connected) summary.appendChild(backToCourseButton());
    for (const id of ["finish", "nextpage", "prevpage", "quiznav"]) $(id).hidden = true;
    if (!R.attempt) { $("quiz").hidden = true; return; }
    buildNav(true);
    // The review can be long: the same button again below the questions.
    if (Scorm.connected) document.querySelector(".submitbtns").appendChild(backToCourseButton());
    // The review shows all questions on one page.
    document.querySelectorAll(".quizpage").forEach((el) => { el.hidden = false; });
    for (let p = 1; p <= npages(); p++) preparePage(p);
    const elements = [], jsx = [];
    QUIZ.questions.forEach((_, qi) => {
      closeQuestion(qi);
      const out = showOutcome(qi, { R, ev: evaluateQuestion(qi), closed: true });
      elements.push(...out.elements);
      jsx.push(...out.jsx);
    });
    typeset(elements).then(() => runJsxGraph(jsx));
  }

  // Moodle's SCORM player shows the package in a frame of the same site, so the course
  // address can be read from the Moodle page around it (M.cfg, or the breadcrumb link).
  function courseUrl() {
    try {
      const top = window.top;
      const cfg = top.M && top.M.cfg;
      if (cfg && cfg.wwwroot && cfg.courseId > 1) return `${cfg.wwwroot}/course/view.php?id=${cfg.courseId}`;
      const a = top.document.querySelector('a[href*="/course/view.php?id="]');
      if (a) return a.href;
    } catch (e) { /* another site, or no access */ }
    return null;
  }

  function backToCourseButton() {
    const p = document.createElement("p");
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = T.backtocourse;
    b.onclick = () => {
      const url = courseUrl();
      if (url) { window.top.location.href = url; return; }
      b.disabled = true;
      p.appendChild(document.createTextNode(" " + T.backhint));
    };
    p.appendChild(b);
    return p;
  }

  // After a reload: show the last checked state again.
  function restoreQuestion(qi) {
    const qs = state.q[qi];
    if (qs.l === undefined) return null;
    if (qs.x) closeQuestion(qi);
    if (qs.l !== answersSignature(qi)) return null;
    return showOutcome(qi, { R: QUIZ.review.during, ev: evaluateQuestion(qi), closed: !!qs.x || adaptiveDone(qi) });
  }

  // ------------------------------------------------------------------ pages and navigation

  const pageReady = {};      // page -> rendered (MathJax + JSXGraph done)
  const pendingJsx = {};     // qi -> JSXGraph boards to draw when its page is first shown
  const pageOf = (qi) => QUIZ.questions[qi].page || 1;
  const npages = () => QUIZ.pages || 1;

  // Pages are rendered lazily: JSXGraph cannot draw into a hidden container.
  function preparePage(p) {
    if (pageReady[p]) return Promise.resolve();
    pageReady[p] = true;
    const el = document.querySelector(`.quizpage[data-page="${p}"]`);
    const jsx = QUIZ.questions.flatMap((_, qi) => (pageOf(qi) === p ? pendingJsx[qi] || [] : []));
    return typeset([el]).then(() => runJsxGraph(jsx));
  }

  function showPage(p, scrollTo) {
    p = Math.min(Math.max(1, p), npages());
    document.querySelectorAll(".quizpage").forEach((el) => { el.hidden = +el.dataset.page !== p; });
    state.pg = p;
    $("prevpage").hidden = p <= 1;
    $("nextpage").hidden = p >= npages();
    $("finish").hidden = p < npages();
    document.querySelectorAll("#quiznav .qnbutton").forEach((b) => b.classList.toggle("thispage", pageOf(+b.dataset.q) === p));
    document.querySelectorAll("#quiznav .navpage").forEach((g) => g.classList.toggle("current", +g.dataset.page === p));
    return preparePage(p).then(() => {
      const target = scrollTo !== undefined ? $(`q${scrollTo}`) : $("title");
      if (target) target.scrollIntoView({ block: "start" });
    });
  }

  // Like Moodle's "Quiz navigation" block, kept at the top of the window while scrolling.
  // During the attempt: question buttons grouped by page (the page title jumps to the
  // page).  In the review all questions are on one page and the buttons scroll to them.
  function buildNav(review) {
    const nav = $("quiznav");
    nav.hidden = false;
    nav.classList.toggle("review", !!review);
    const button = (qi) => `<button type="button" class="qnbutton" data-q="${qi}">${qi + 1}</button>`;
    const all = QUIZ.questions.map((_, qi) => qi);
    let groups = "";
    if (review || npages() <= 1) {
      groups = `<div class="qnbuttons">${all.map(button).join("")}</div>`;
    } else {
      for (let p = 1; p <= npages(); p++) {
        groups += `<div class="navpage" data-page="${p}">` +
          `<button type="button" class="pagelink" data-page="${p}">${T.page(p)}</button><div class="qnbuttons">` +
          all.filter((qi) => pageOf(qi) === p).map(button).join("") + "</div></div>";
      }
      groups = `<div class="navpages">${groups}</div>`;
    }
    nav.innerHTML = `<h3>${T.navigation}</h3>${groups}` +
      (review ? "" : `<button type="button" class="finishlink">${T.finish}</button>`);
    nav.querySelectorAll(".qnbutton").forEach((b) => {
      const qi = +b.dataset.q;
      b.onclick = () => {
        if (review) $(`q${qi}`).scrollIntoView({ block: "start" });
        else if (!state.f) { showPage(pageOf(qi), qi); saveState(); }
      };
    });
    nav.querySelectorAll(".pagelink").forEach((b) => {
      b.onclick = () => { if (!state.f) { showPage(+b.dataset.page); saveState(); } };
    });
    if (!review) nav.querySelector(".finishlink").onclick = () => finishAttempt();
    QUIZ.questions.forEach((_, qi) => updateNav(qi));
    navHeight();
  }

  // Questions scrolled to stop below the navigation bar, not under it.
  function navHeight() {
    const nav = $("quiznav");
    document.documentElement.style.setProperty("--navh", nav.hidden ? "0px" : `${nav.offsetHeight + 8}px`);
  }
  window.addEventListener("resize", navHeight);

  function updateNav(qi) {
    const b = document.querySelector(`#quiznav .qnbutton[data-q="${qi}"]`);
    if (!b) return;
    const q = QUIZ.questions[qi];
    const qs = state.q[qi];
    b.classList.remove("answered", "correct", "incorrect", "partiallycorrect");
    const R = state.f ? QUIZ.review.after : QUIZ.review.during;
    if (qs.r !== undefined && R.correctness) {
      b.classList.add(qs.r >= 1 ? "correct" : qs.r <= 0 ? "incorrect" : "partiallycorrect");
    } else if (q.inputs.some((i) => validate(qi, i).status !== "blank")) {
      b.classList.add("answered");
    }
  }

  // ------------------------------------------------------------------ start

  async function start() {
    document.title = QUIZ.title;
    $("title").textContent = QUIZ.title;
    if (QUIZ.batch) return runBatch();
    if (QUIZ.replay) await replayAttempt(QUIZ.replay);
    else await startAttempt();
    await render();
  }

  async function startAttempt() {
    Scorm.init();
    if (!Scorm.connected && !QUIZ.ephemeral) {
      const bar = $("previewbar");
      bar.hidden = false;
      bar.querySelector("span").textContent = T.preview;
      const reset = bar.querySelector("button");
      reset.textContent = T.resetpreview;
      reset.onclick = () => { Scorm.resetPreview(); location.reload(); };
    }
    // QUIZ.ephemeral (website preview): always a fresh attempt, nothing restored.
    try { state = QUIZ.ephemeral ? null : JSON.parse(safeDecode(Scorm.get("cmi.suspend_data"))); } catch (e) { state = null; }
    if (!state || !Array.isArray(state.v) || state.v.length !== QUIZ.questions.length) {
      state = newState();
    }
    if (!state.q) state.q = QUIZ.questions.map(() => ({ b: {}, p: {}, t: 0 }));
    logQuizLayout();
    saveState();
    if (Scorm.get("cmi.core.lesson_status") === "not attempted" || !Scorm.get("cmi.core.lesson_status")) {
      Scorm.set("cmi.core.lesson_status", "incomplete");
    }
    if (!state.f) Scorm.set("cmi.core.exit", "suspend");
    Scorm.commit();

    await Promise.all(QUIZ.questions.map((q, qi) => loadVariant(q, state.v[qi])));
  }

  async function render() {
    const main = $("quiz");
    main.innerHTML = "";
    for (let p = 1; p <= npages(); p++) {
      const page = document.createElement("div");
      page.className = "quizpage";
      page.dataset.page = p;
      page.hidden = true;
      main.appendChild(page);
    }
    QUIZ.questions.forEach((q, qi) => {
      const r = renderQuestion(qi);
      main.querySelector(`.quizpage[data-page="${pageOf(qi)}"]`).appendChild(r.el);
      pendingJsx[qi] = r.jsx;
    });
    QUIZ.questions.forEach((_, qi) => attachInputs(qi));
    if (!state.f) {
      QUIZ.questions.forEach((_, qi) => {
        const out = restoreQuestion(qi);
        if (out) pendingJsx[qi].push(...out.jsx);
      });
    }

    const finish = $("finish");
    finish.textContent = T.finish;
    finish.onclick = finishAttempt;
    $("nextpage").textContent = T.nextpage;
    $("prevpage").textContent = T.prevpage;
    $("nextpage").onclick = () => { showPage(state.pg + 1); saveState(); };
    $("prevpage").onclick = () => { showPage(state.pg - 1); saveState(); };
    buildNav();

    if (state.f) showReview();
    else await showPage(state.pg || 1);
  }

  function run() {
    start().catch((e) => {
      console.error(e);
      $("quiz").textContent = "שגיאה בטעינת המבדק: " + e.message;
    });
  }
  // The website preview injects the player after the page has loaded.
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run);
})();
