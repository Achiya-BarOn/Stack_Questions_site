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
    checked: "✓ התשובה נבדקה ונשמרה",
    repeated: "התשובה לא השתנתה מאז הבדיקה הקודמת",
    notchecked: "התשובה לא נבדקה: ראו את ההודעה למטה",
    limitbig: "בדיקת מקום: Moodle שומר יותר מ-4,096 תווים (ברירת המחדל). יש מקום לכל הניסיונות.",
    limitsmall: "בדיקת מקום: Moodle מוגבל ל-4,096 תווים (מצב תקן SCORM).",
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
      chained: "נראה שכתבתם אי-שוויון משורשר, כמו <code>a&lt;b&lt;c</code>. יש לחבר אי-שוויונות בודדים בעזרת <code>and</code> או <code>or</code>, למשל <code>x&gt;2 and x&lt;18</code>.",
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
    return JSON.parse(tidyLogic(new TextDecoder().decode(bytes)));
  }

  // With logicsymbol "lang", Maxima's LaTeX has !AND!, !OR!, !NOT!: STACK replaces them
  // with the words (equiv_AND...), and so do we.
  const tidyLogic = (text) => text.replace(/!(AND|OR|NOT|NAND|NOR|XOR|XNOR|IMPLIES)!/g, (_, w) => w.toLowerCase())
    .replace(/!BOOL(TRUE|FALSE)!/g, (_, w) => (w === "TRUE" ? "True" : "False"));

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
  //   q: per question {b: best fraction per PRT, p: penalised tries per PRT, s: last score per PRT,
  //                    l: fingerprint of the last checked answers, r: its raw fraction, t: tries,
  //                    x: closed, h: the answers of every graded try (to regrade a corrected question)}
  //   hx: the tries were dropped, because Moodle refused the data as too long
  //   ids: question id per position, to match the attempt to a replaced package (adoptState)
  //   q[i].n: question i was added after the attempt was submitted: not part of it

  let state;

  // Moodle keeps up to 64,000 characters, or 4,096 in "SCORM standard mode" (an admin
  // setting; BGU uses it).  The data is compressed (LZString, about 2.7 times smaller:
  // 20 questions with 2 inputs and 5 tries each take about 3,000 characters), as "Z" and
  // base64url, so it stays letters and digits.  If it is refused as too long anyway, the
  // history of tries is dropped.
  const packState = (json) => (window.LZString
    ? "Z" + LZString.compressToBase64(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")
    : safeEncode(json));
  function unpackState(data) {
    if (data && data[0] === "Z") return LZString.decompressFromBase64(data.slice(1).replace(/-/g, "+").replace(/_/g, "/"));
    return safeDecode(data);
  }

  function saveState() {
    let ok = Scorm.set("cmi.suspend_data", packState(JSON.stringify(state)));
    if (String(ok) === "false" && !state.hx) {
      state.hx = 1;
      state.q.forEach((qs) => { delete qs.h; });
      ok = Scorm.set("cmi.suspend_data", packState(JSON.stringify(state)));
    }
    if (String(ok) === "false") console.warn("suspend_data refused by the LMS");
    commit();
  }

  // Random variant per question; copies of the same question get different variants
  // while there are enough of them.
  function drawVariant(q, taken) {
    const free = [];
    for (let n = 1; n <= q.nvariants; n++) if (!taken.has(n)) free.push(n);
    const n = free.length ? free[Math.floor(Math.random() * free.length)] : 1 + Math.floor(Math.random() * q.nvariants);
    taken.add(n);
    return n;
  }

  function drawVariants() {
    const used = {};
    return QUIZ.questions.map((q, qi) => {
      if (QUIZ.variants && QUIZ.variants[qi]) return QUIZ.variants[qi];
      return drawVariant(q, used[q.id] || (used[q.id] = new Set()));
    });
  }

  // Test packages ("checklimit: true"): how much suspend_data this Moodle keeps.  The real
  // data is saved right after, over the test value.
  function checkLimit() {
    if (!Scorm.connected) return;
    const big = String(Scorm.set("cmi.suspend_data", "B" + "A".repeat(6000))) !== "false";
    const line = document.createElement("p");
    line.className = "limitcheck";
    line.textContent = big ? T.limitbig : T.limitsmall;
    document.body.insertBefore(line, document.body.firstChild);
  }

  function newState() {
    return {
      // QUIZ.variants: fixed variant numbers (website preview); otherwise drawn at random.
      v: drawVariants(),
      a: {},
      q: QUIZ.questions.map(() => ({ b: {}, p: {}, t: 0 })),
      f: 0,
      ids: QUIZ.questions.map((q) => String(q.id)),
      ts: stamp(new Date()),              // the attempt's start: reported with the layout, and QUIZ.marks
    };
  }

  // The package may be replaced in Moodle while attempts exist: a corrected question, a
  // changed mark, rarely questions added, removed or reordered.  The saved attempt is
  // matched to the quiz by question id (ids): a question keeps its variant, answers and
  // tries wherever it moved; a new question is drawn; a removed one is dropped.  A submitted
  // attempt keeps its questions: a question added after it is not part of it (n) – not
  // shown and not counted, so the grade does not drop.  A variant number beyond the question's variants
  // (fewer after a correction) wraps around.
  function adoptState(old) {
    const ids = QUIZ.questions.map((q) => String(q.id));
    if (!old || !Array.isArray(old.v)) return newState();
    // Saved before October 2026: no ids, the same questions if the number matches.
    const oldIds = old.ids || (old.v.length === ids.length ? ids : null);
    if (!oldIds) {
      const st = newState();
      if (old.f) { st.f = 1; st.q.forEach((qs) => { qs.x = 1; }); }
      return st;
    }
    const oldQ = old.q || old.v.map(() => ({ b: {}, p: {}, t: 0 }));
    const fits = (n, q) => n >= 1 && n <= q.nvariants;
    if (oldIds.length === ids.length && oldIds.every((id, i) => id === ids[i]) &&
        QUIZ.questions.every((q, i) => fits(old.v[i], q))) {
      return Object.assign(old, { q: oldQ, ids });
    }
    const st = Object.assign({}, old, { v: [], a: {}, q: [], ids, h: 0 });   // h: 0 reports the new layout
    if (old.m) st.m = [];
    const used = new Set(), taken = {};
    QUIZ.questions.forEach((q, i) => {
      const t = taken[q.id] || (taken[q.id] = new Set());
      const j = oldIds.findIndex((id, k) => id === ids[i] && !used.has(k));
      if (j >= 0) {
        used.add(j);
        st.v[i] = ((old.v[j] - 1) % q.nvariants) + 1;
        t.add(st.v[i]);
        st.q[i] = oldQ[j] || { b: {}, p: {}, t: 0 };
        for (const inp of q.inputs) {
          const a = old.a && old.a[`${j}:${inp.name}`];
          if (a !== undefined) st.a[answerKey(i, inp.name)] = a;
        }
        if (st.m) st.m[i] = old.m[j] || 0;
      } else {
        st.v[i] = drawVariant(q, t);
        st.q[i] = old.f ? { b: {}, p: {}, t: 0, x: 1, n: 1 } : { b: {}, p: {}, t: 0 };
        if (st.m) st.m[i] = 0;
      }
    });
    if (!(st.pg <= (QUIZ.pages || 1))) st.pg = 1;
    return st;
  }

  const answerKey = (qi, name) => `${qi}:${name}`;
  const answersOf = (qi) => QUIZ.questions[qi].inputs.map((i) => state.a[answerKey(qi, i.name)] ?? "");
  // The answers last checked are kept as a short fingerprint: suspend_data is small.
  const fingerprint = (text) => seedFrom(text).toString(36);
  const answersSignature = (qi) => fingerprint(JSON.stringify(answersOf(qi)));

  // ------------------------------------------------------------------ rendering

  // The variant's values into the text, then the [[if]] blocks they decide.
  const ctFill = (text, v) => window.StackEngine.resolveIf(
    (text || "").replace(/\{\{CT:(\d+)\}\}/g, (_, i) => v.ct[+i] ?? ""));

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

    // radio: one option; checkbox: any number of them ("1,3" in the state).
    if (inp.type === "radio" || inp.type === "checkbox") {
      const opts = dropdownOptions(qi, inp);
      const chosen = new Set(String(value ?? "").split(",").filter(Boolean));
      return `<span class="mcq ${inp.type}" id="${id}">` + opts.map((o, k) =>
        `<label class="mcqoption"><input type="${inp.type}" name="${id}" value="${k + 1}" ${attrs}` +
        `${chosen.has(String(k + 1)) ? " checked" : ""}> <span class="mcqlabel">${o.display}</span></label>`).join("") +
        "</span>";
    }

    // textarea: one expression per line; the answer is the list of the lines (STACK's
    // textarea input).  The teacher's answer is a list.
    if (inp.type === "textarea") {
      const initial = value ?? (inp.syntaxhint && inp.syntaxattribute !== 1 ? inp.syntaxhint : "");
      const hint = inp.syntaxhint && inp.syntaxattribute === 1 ? ` placeholder="${esc(inp.syntaxhint)}"` : "";
      const lines = Math.max(textareaLines(v.tans[inp.name].value).length + 1, String(initial).split("\n").length + 1, 3);
      return `<textarea class="algebraic textarea" id="${id}" ${attrs} rows="${lines}"` +
        ` style="width:${Math.max(width, 20)}em"${hint}>${esc(initial)}</textarea>`;
    }

    if (!["algebraic", "numerical", "units", "string", "singlechar"].includes(inp.type)) {
      return `<span class="stack-unsupported">[input type ${esc(inp.type)} not supported yet]</span>`;
    }
    const hint = inp.syntaxhint && inp.syntaxattribute === 1 ? ` placeholder="${esc(inp.syntaxhint)}"` : "";
    const initial = value ?? (inp.syntaxhint && inp.syntaxattribute !== 1 ? inp.syntaxhint : "");
    return `<input type="text" class="algebraic" id="${id}" ${attrs} size="${inp.boxsize}"` +
      ` style="width:${width}em" value="${esc(initial)}"${hint}>`;
  }

  // The lines of a textarea answer given as a list ("[a=1,b=2]" -> ["a=1", "b=2"]).
  function textareaLines(list) {
    const t = String(list ?? "").trim();
    return /^\[.*\]$/s.test(t) ? splitTop(t.slice(1, -1), ",").map((l) => l.trim()).filter(Boolean) : t ? [t] : [];
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
      const shown = display ? (display.k === "str" ? esc(display.value) : `\\(${esc(M.latex(display, q.options))}\\)`)
        : val.k === "str" ? esc(val.value) : `\\(${esc(M.latex(val, q.options))}\\)`;
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
    // [[reveal input="ans1" value="false"]] ... [[/reveal]]: shown while the input has that value
    html = html.replace(/\[\[reveal\s+input="(\w+)"\s+value="([^"]*)"\s*\]\]([\s\S]*?)\[\[\/reveal\]\]/g,
      (_, name, value, body) => `<div class="stack-reveal" data-reveal-input="${esc(name)}" data-reveal-value="${esc(value)}" hidden>${body}</div>`);
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
    el.hidden = !inAttempt(qi);
    // Specific feedback holds the [[feedback:prtN]] that the question text does not show itself.
    const sf = q.prts.some((p) => !q.questiontext.includes(`[[feedback:${p.name}]]`)) ? q.specificfeedback : "";
    const checkBtn = behaviour === "deferredfeedback" ? "" :
      `<div class="im-controls"><button type="button" class="btn check" id="q${qi}-check">${T.check}</button>` +
      `<button type="button" class="btn tryagain" id="q${qi}-tryagain" hidden>${T.tryagain}</button>` +
      `<span class="checkstatus" id="q${qi}-checkstatus" role="status" aria-live="polite"></span></div>`;
    el.innerHTML = `
      <div class="info">
        <h3 class="no">${T.question} <span class="qno">${shownNumber(qi)}</span></h3>
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
    "signum", "unit_step", "heaviside", "delta", "matrix", "min", "max", "factorial"]);

  const splitWords = (s) => (s || "").split(",").map((w) => w.trim()).filter((w) => w && !w.startsWith("[["));

  function parseStudent(qi, inp, text) {
    const q = QUIZ.questions[qi];
    let ast;
    try {
      const raw = M.parse(text, { insertstars: inp.insertstars });
      if (M.hasChainedRelation(raw)) return { error: T.errors.chained };
      ast = M.studentNormalise(raw);
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
    if (inp.type === "checkbox") {
      const opts = dropdownOptions(qi, inp);
      const picked = String(value ?? "").split(",").filter(Boolean).map((k) => opts[+k - 1]).filter(Boolean);
      if (!picked.length) return { status: "blank" };
      return { status: "valid", ast: { k: "list", items: picked.map((o) => o.value) }, display: picked.map((o) => o.display).join(", ") };
    }
    if (inp.type === "dropdown" || inp.type === "radio") {
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
    if (inp.type === "textarea") {
      const lines = String(value ?? "").split("\n").map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return { status: "blank" };
      const asts = [];
      for (const line of lines) {
        const res = parseStudent(qi, inp, line);
        if (res.error) return { status: "invalid", error: res.error };
        asts.push(res.ast);
      }
      return { status: "valid", ast: { k: "list", items: asts } };
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
    if (!box || ["dropdown", "boolean", "radio", "checkbox"].includes(inp.type)) return;
    const mode = inp.showvalidation ?? 1;
    if (result.status === "blank" || mode === 0) { box.innerHTML = ""; box.className = "stackinputfeedback"; return; }
    if (result.status === "invalid") {
      box.className = "stackinputfeedback stackinputerror";
      box.innerHTML = `<span class="stackinputerror">${result.error}</span>`;
    } else {
      const q = QUIZ.questions[qi];
      const tex = inp.type === "textarea"
        ? "\\begin{array}{l} " + result.ast.items.map((a) => M.latex(a, q.options)).join(" \\\\ ") + " \\end{array}"
        : M.latex(result.ast, q.options);
      if (mode === 3) {
        box.className = "stackinputfeedback compact";
        box.innerHTML = `<span class="filter_mathjaxloader_equation">\\(${esc(tex)}\\)</span>`;
      } else {
        box.className = "stackinputfeedback standard";
        let html = `<p>${T.interpreted}</p><div class="filter_mathjaxloader_equation" dir="ltr">\\[ ${esc(tex)} \\]</div>`;
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
    if (inp.type === "radio" || inp.type === "checkbox") {
      return [...document.querySelectorAll(`#${id} input:checked`)].map((c) => c.value).join(",");
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
        updateReveals(qi);
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
    updateReveals(qi);
  }

  function flushInputs(qi) {
    for (const inp of QUIZ.questions[qi].inputs) {
      if ($(`q${qi}-${inp.name}`)) state.a[answerKey(qi, inp.name)] = readInput(qi, inp);
    }
  }

  // The raw value of an input as STACK's [[reveal]] compares it (the DOM value of the
  // input): "true"/"false", the chosen option's number (1, 2, ...; not its value, see
  // dropdown.class.php), or the typed text.
  function rawValue(qi, inp) {
    const value = state.a[answerKey(qi, inp.name)];
    if (inp.type === "dropdown" || inp.type === "radio") {
      return value && dropdownOptions(qi, inp)[+value - 1] ? String(+value) : "";
    }
    return Array.isArray(value) ? "" : String(value ?? "").trim();
  }

  function updateReveals(qi) {
    const q = QUIZ.questions[qi];
    document.querySelectorAll(`#q${qi} .stack-reveal`).forEach((el) => {
      const inp = q.inputs.find((i) => i.name === el.dataset.revealInput);
      el.hidden = !inp || rawValue(qi, inp) !== el.dataset.revealValue;
    });
  }

  function setReadOnly(qi, ro) {
    document.querySelectorAll(`#q${qi} .formulation input, #q${qi} .formulation select, #q${qi} .formulation textarea`).forEach((el) => {
      if (el.tagName === "SELECT" || el.type === "radio" || el.type === "checkbox") el.disabled = ro; else el.readOnly = ro;
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

  // ---------------------------------------------------------------- the teacher's marks
  //
  // QUIZ.marks: marks the teacher set by hand in the review page of the website, carried in
  // the package.  They reach Moodle's gradebook the same way a corrected question does: the
  // student opens the quiz, the package writes the grade, and Moodle recomputes it (showReview).
  //
  // The package is downloaded by every student, so it names nobody: an attempt recognises
  // itself by a hash of its own start stamp, or of the variants it drew.  The value is a
  // fraction of the question's mark, so it does not depend on the marks of the quiz.
  //   QUIZ.marks = {"<key>": {"<position>:<question id>": fraction}}
  //
  // attemptKey must stay identical to the one in site/review.js.
  function attemptKey(text) {
    let a = 0x811c9dc5, b = 0x9e3779b9;
    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      a = Math.imul(a ^ c, 0x01000193) >>> 0;
      b = Math.imul(b + c + 1, 0x85ebca6b) >>> 0;
    }
    return a.toString(36) + "-" + b.toString(36);
  }
  // The variants only for an attempt without its start stamp (before October 2026): another
  // attempt may draw the same variants (always, in a quiz without random parameters).
  const attemptKeys = () => [state.ts ? attemptKey("t" + state.ts) : attemptKey("v" + state.v.join("."))];

  let teacherMarks;         // undefined: not looked up yet; null: none for this attempt
  function marksOfAttempt() {
    // Only a submitted attempt, and never while the review page regrades an attempt of its own.
    if (!QUIZ.marks || QUIZ.replay || QUIZ.batch || !state.f) return null;
    for (const key of attemptKeys()) if (QUIZ.marks[key]) return QUIZ.marks[key];
    return null;
  }
  function teacherFraction(qi) {
    if (teacherMarks === undefined) teacherMarks = marksOfAttempt();
    if (!teacherMarks) return null;
    const v = teacherMarks[`${qi + 1}:${QUIZ.questions[qi].id}`];
    return typeof v === "number" ? v : null;
  }

  function questionMark(qi) {
    const q = QUIZ.questions[qi];
    const given = teacherFraction(qi);
    return (given === null ? weightedFraction(q, state.q[qi].b) : given) * q.defaultgrade;
  }

  const inAttempt = (qi) => !state.q[qi].n;
  // Out of the marks of the questions in the attempt (all of them, unless some were added
  // after it was submitted).
  const sumGrades = () => QUIZ.questions.reduce((s, q, qi) => s + (inAttempt(qi) ? q.defaultgrade : 0), 0);
  // Question numbers as the student sees them (questions not in the attempt are skipped).
  const shownNumber = (qi) => QUIZ.questions.slice(0, qi + 1).filter((_, k) => inAttempt(k)).length;

  function quizGrade() {
    const sum = QUIZ.questions.reduce((s, _, qi) => s + (inAttempt(qi) ? questionMark(qi) : 0), 0);
    const total = sumGrades();
    return total ? (sum / total) * QUIZ.grade : 0;
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
      (qs.s || (qs.s = {}))[prt.name] = Math.round(r.score * 1e4) / 1e4;
      if (usePenalty && r.score < 1) {
        qs.p[prt.name] = Math.round(((qs.p[prt.name] || 0) + r.penalty) * 1e4) / 1e4;
        penaltyThisTry = Math.max(penaltyThisTry, r.penalty);
      }
    }
    qs.l = sig;
    qs.t = (qs.t || 0) + 1;
    if (!state.hx) (qs.h || (qs.h = [])).push(answersOf(qi));
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
  //                    #k for the k-th dropdown/radio option, #j,k for checkboxes), encoded (safeEncode)
  //   result           mark of this submission, 0..1 ("neutral": not gradable)
  // Only these three fields (28.10.2026; before: also type, weighting, time, latency): each
  // field is a row in Moodle's database.  The time is in the id, the marks in the quiz layout.
  // When an attempt starts, the quiz itself is reported too, so that the review page can
  // show every question in the student's variant and regrade the attempt:
  //   id               quiz_<part>of<parts>_d<yyyymmdd>T<hhmmss>
  //   student_response g=<grade>;s=<sum of marks>;b=<behaviour>[;n=<positions not in the attempt>][;p=<player version>];
  //                    <position>=<question id>/<variant>/<mark>[/<behaviour>[/<tries>]];...
  // SCORM 1.2 limits responses to 255 characters.

  const sessionStart = Date.now();

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
      } else if (inp.type === "textarea" && v) {
        v = "[" + String(v).split("\n").map((l) => l.trim()).filter(Boolean).join(",") + "]";
      } else if ((inp.type === "dropdown" || inp.type === "radio" || inp.type === "checkbox") && v) {
        const opts = dropdownOptions(qi, inp);
        const ks = String(v).split(",");
        v = shown ? ks.map((k) => (opts[+k - 1] ? M.latex(opts[+k - 1].value).replace(/\\mbox\{([^}]*)\}/g, "$1") : "#" + k)).join(", ")
          : "#" + ks.join(",");
      }
      return `${inp.name}=${(v ?? "").toString().trim()}`;
    }).join("; ");
  }


  const stamp = (t) => `${t.getFullYear()}${pad(t.getMonth() + 1)}${pad(t.getDate())}T${pad(t.getHours())}${pad(t.getMinutes())}${pad(t.getSeconds())}`;
  let replaying = false;          // regrading the kept tries in the review: nothing is reported
  const logging = () => (Scorm.connected || QUIZ.logLocally) && !QUIZ.replay && !replaying;

  // Moodle refuses an interaction beyond cmi.interactions._count (error 201), and its count
  // is that of the interactions it kept.  When a commit was lost (a network failure), the
  // interactions in it are missing and the count, when the student comes back, is below
  // ours (ni): every later interaction of the attempt would be refused, while the grade is
  // still kept.  So the count is moved up to ours first, by a field that no interaction
  // of ours uses (a correct response), without overwriting an interaction Moodle kept.
  function nextInteraction() {
    const count = () => parseInt(Scorm.get("cmi.interactions._count"), 10);
    let n = count();
    if (n >= 0 && Scorm.connected) {
      while (n < (state.ni || 0)) {
        Scorm.set(`cmi.interactions.${n}.correct_responses.0.pattern`, "");
        const m = count();
        if (!(m > n)) break;
        n = m;
      }
    }
    if (!(n >= 0)) n = 0;
    n = Math.max(n, state.ni || 0);
    state.ni = n + 1;
    return n;
  }

  // The quiz layout (questions, variants, marks, behaviours), once per attempt.
  function logQuizLayout() {
    if (!logging() || state.h) return;
    const items = [`g=${QUIZ.grade}`, `s=${sumGrades()}`, `b=${QUIZ.behaviour || "adaptivenopenalty"}`];
    const absent = QUIZ.questions.map((_, qi) => qi).filter((qi) => !inAttempt(qi)).map((qi) => qi + 1);
    if (absent.length) items.push(`n=${absent.join(",")}`);
    if (QUIZ.player) items.push(`p=${QUIZ.player}`);      // the player's version (build.py, player_version)
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
    // The attempt's start, as the review page reads it (a.stamp) and QUIZ.marks is keyed by.
    if (!state.ts) state.ts = stamp(new Date());
    parts.forEach((text, k) => {
      writeInteraction([
        ["id", `quiz_${k + 1}of${parts.length}_d${state.ts}`],
        ["student_response", safeClip(text)],
        ["result", "neutral"],
      ]);
    });
    state.h = 1;
  }

  function logInteraction(qi, fraction) {
    if (!logging()) return;
    const q = QUIZ.questions[qi];
    writeInteraction([
      ["id", `q${qi + 1}_${q.id}_v${state.v[qi]}_t${state.q[qi].t}_d${stamp(new Date())}`],
      // The correct answer is not sent: the review page computes it from the variant.
      ["student_response", safeClip(responseText(qi))],
      // "neutral": submitted but not graded (invalid or incomplete answer).
      ["result", fraction === null ? "neutral" : String(Math.round(fraction * 1000) / 1000)],
    ]);
  }

  // Interactions that may not have reached Moodle.  Moodle's API sends only what changed
  // since its last commit and counts a value as sent even when the request failed (a
  // network failure): an interaction in a failed commit is never sent again by itself,
  // and is missing from the report while the grade (sent again at the next check) is not.
  // So the interactions of a failed commit are written again, at new positions, before the
  // next commit (the review page skips an id it already has, if both arrived after all).
  // Kept in memory only: they are lost if the student leaves before a commit succeeds.
  let sentPending = [];       // written since the last commit that reached Moodle
  let unsent = [];            // in a commit that failed: to write again
  function writeInteraction(fields) {
    const base = `cmi.interactions.${nextInteraction()}.`;
    for (const [k, v] of fields) Scorm.set(base + k, v);
    sentPending.push(fields);
  }
  function commit() {
    if (unsent.length) {
      const again = unsent;
      unsent = [];
      again.forEach(writeInteraction);
    }
    const ok = String(Scorm.commit()) !== "false";
    if (ok) sentPending = [];
    else if (Scorm.connected) {
      unsent = sentPending;
      sentPending = [];
    }
    return ok;
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
      } else if (inp.type === "textarea") {
        v = textareaLines(v).join("\n");
      } else if (inp.type === "radio" || inp.type === "checkbox") {
        v = /^#[\d,]+$/.test(v) ? v.slice(1) : "";
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
    $(`q${qi}-grade`).textContent = R.marks && (graded || teacherFraction(qi) !== null)
      ? T.mark(fmt(questionMark(qi)), fmt(q.defaultgrade)) : T.markedoutof(fmt(q.defaultgrade));

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

  // An input inside [[reveal input="X" value="V"]] that the correct answer of X keeps hidden
  // (a counterexample box when the statement is true) has no right answer to show.
  function hiddenByCorrectAnswer(qi, inp) {
    const q = QUIZ.questions[qi];
    const re = /\[\[reveal\s+input="(\w+)"\s+value="([^"]*)"\s*\]\]([\s\S]*?)\[\[\/reveal\]\]/g;
    for (const m of String(q.questiontext || "").matchAll(re)) {
      if (!m[3].includes(`[[input:${inp.name}]]`)) continue;
      const by = q.inputs.find((i) => i.name === m[1]);
      if (!by) continue;
      const t = variantOf(qi).tans[by.name] || {};
      let right = String(t.value ?? "");
      if (by.type === "dropdown" || by.type === "radio") {
        const k = dropdownOptions(qi, by).findIndex((o) => o.correct);
        right = k >= 0 ? String(k + 1) : "";
      }
      if (right !== m[2]) return true;
    }
    return false;
  }

  function rightAnswerHtml(qi, inp) {
    const q = QUIZ.questions[qi];
    if (hiddenByCorrectAnswer(qi, inp)) return "";
    const t = variantOf(qi).tans[inp.name] || {};
    if (inp.type === "dropdown" || inp.type === "radio" || inp.type === "checkbox") {
      const correct = dropdownOptions(qi, inp).filter((o) => o.correct).map((o) => o.display).join(", ");
      return `<p>${T.rightanswer}: ${correct}</p>`;
    }
    if (inp.type === "boolean") return `<p>${T.rightanswer}: ${t.value === "true" ? T.true : T.false}</p>`;
    if (inp.type === "textarea") {
      return `<p>${T.rightanswer} <span dir="ltr">\\( ${esc(t.latex || "")} \\)</span>, ${T.typedas}</p>` +
        `<pre dir="ltr" class="typedas">${esc(textareaLines(t.value).join("\n"))}</pre>`;
    }
    return `<p>${T.rightanswer} <span dir="ltr">\\( ${esc(t.latex || "")} \\)</span>, ${T.typedas} <code dir="ltr">${esc(t.value || "")}</code></p>`;
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
    checkStatus(qi, sub.kind);
    updateNav(qi);
    reportProgress();
    saveState();
    typeset(out.elements).then(() => runJsxGraph(out.jsx));
  }

  const adaptiveDone = (qi) => weightedFraction(QUIZ.questions[qi], state.q[qi].b) >= 1;

  // A short note beside the button, so that a check is seen even when the review options
  // show no feedback, or the feedback looks the same as before.
  const statusTimers = {};
  function checkStatus(qi, kind) {
    const el = $(`q${qi}-checkstatus`);
    if (!el) return;
    el.textContent = kind === "graded" ? T.checked : kind === "repeat" ? T.repeated : T.notchecked;
    el.className = `checkstatus ${kind === "graded" ? "ok" : "note"}`;
    clearTimeout(statusTimers[qi]);
    statusTimers[qi] = setTimeout(() => { el.textContent = ""; el.className = "checkstatus"; }, 6000);
  }

  function tryAgain(qi) {
    clearTimeout(statusTimers[qi]);
    $(`q${qi}-checkstatus`).textContent = "";
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
    teacherMarks = undefined;
    state.m = QUIZ.questions.map((_, qi) => Math.round(questionMark(qi) * 1e4) / 1e4);
    reportProgress();
    reportSessionTime();
    Scorm.set("cmi.core.lesson_status", "completed");
    Scorm.set("cmi.core.exit", "");
    saveState();
    Scorm.finish();
    showReview();
    // The confirmation is at the top: show it (in Moodle's frame, the page around it scrolls too).
    $("summary").scrollIntoView({ block: "start" });
    $("summary").classList.add("just");
  }

  // The package was replaced by one with a corrected question (SCORM settings in Moodle):
  // the review grades the student's tries again, like Moodle's "regrade".  With the tries
  // kept (h), all of them are graded again in order; without them (dropped, or an attempt
  // from an older package), the last answer is, less the penalties of the tries before it.
  // This is what the student sees: Moodle's grade changes when the teacher updates it.
  // Returns "exact", "approximate" or "" (no change).
  function regradeAfterFix(qi) {
    const q = QUIZ.questions[qi];
    const old = state.q[qi];
    if (old.l === undefined) return "";
    const same = (b) => q.prts.every((p) => Math.abs((b[p.name] || 0) - (old.b[p.name] || 0)) < 1e-6);
    if (old.h && old.h.length && !state.hx) {
      const final = q.inputs.map((inp) => state.a[answerKey(qi, inp.name)]);
      const fresh = { b: {}, p: {}, t: 0 };
      state.q[qi] = fresh;
      replaying = true;
      let nowInvalid = false;
      try {
        for (const answers of old.h) {
          q.inputs.forEach((inp, k) => { state.a[answerKey(qi, inp.name)] = answers[k]; });
          if (submitQuestion(qi).ev.invalid) nowInvalid = true;
        }
      } finally {
        replaying = false;
        q.inputs.forEach((inp, k) => { state.a[answerKey(qi, inp.name)] = final[k]; });
      }
      Object.assign(fresh, { h: old.h, l: old.l, x: old.x });
      if (same(fresh.b) && Math.abs((fresh.r ?? 0) - (old.r ?? 0)) < 1e-6) { state.q[qi] = old; return ""; }
      // The mark of a question never goes down here (keepMark).  An answer the corrected
      // package finds invalid (2<x<18, graded before the player rejected chained
      // inequalities) keeps its mark even in a full regrade: the student was never told to
      // correct it (the user's decisions, 30.10.2026).
      if ((keepMark(q) || nowInvalid) && weightedFraction(q, fresh.b) < weightedFraction(q, old.b) - 1e-6) { state.q[qi] = old; return ""; }
      return "exact";
    }
    if (old.l !== answersSignature(qi)) return "";
    const ev = evaluateQuestion(qi);
    if (ev.invalid) return "";      // the same rule, for the last answer
    const raw = {};
    for (const prt of q.prts) if (ev.prts[prt.name]) raw[prt.name] = ev.prts[prt.name].score;
    const fraction = Math.round(weightedFraction(q, raw) * 1e4) / 1e4;
    if (Math.abs(fraction - (old.r ?? 0)) < 1e-6) return "";
    const usePenalty = PENALTY_BEHAVIOURS.has(behaviourOf(q));
    const b = {};
    for (const prt of q.prts) {
      const r = ev.prts[prt.name];
      let before = 0;
      if (usePenalty && r) {
        const last = old.s && prt.name in old.s ? old.s[prt.name] : old.r >= 1 ? 1 : 0;
        before = Math.max(0, (old.p[prt.name] || 0) - (last < 1 ? r.penalty : 0));
      }
      b[prt.name] = Math.round(Math.max(0, (raw[prt.name] || 0) - before) * 1e4) / 1e4;
    }
    if (keepMark(q) && weightedFraction(q, b) < weightedFraction(q, old.b) - 1e-6) return "";
    Object.assign(old.b, b);
    old.r = fraction;
    return "approximate";
  }

  // After the package is replaced, a question's mark goes only up ("only in the student's
  // favour", the user's decision, 30.10.2026): a fix that rejects a wrong answer accepted
  // by mistake, a draw that changed (variant 7 has other numbers now), all keep the mark
  // given.  QUIZ.regrade = "full" regrades as Moodle does, down too.
  const keepMark = () => QUIZ.regrade !== "full";

  function showReview() {
    const R = QUIZ.review.after;
    // Silently: most students' marks do not change, and a note on every question would worry them.
    // The same for a mark the teacher set by hand in the review page (QUIZ.marks).
    // A changed mark is reported to Moodle: every cmi.core.score.raw the package writes makes
    // Moodle recompute the activity's grade for this student (scorm_insert_track), so a
    // corrected question reaches the gradebook by itself when the student opens the quiz.
    // Only the student's own session can write their grade, so nothing happens until they do.
    if (!QUIZ.replay) {
      QUIZ.questions.forEach((_, qi) => regradeAfterFix(qi));
      const marks = QUIZ.questions.map((_, qi) => Math.round(questionMark(qi) * 1e4) / 1e4);
      const before = state.m || [];
      if (marks.some((m, qi) => Math.abs(m - (before[qi] || 0)) > 1e-6)) {
        state.m = marks;
        reportProgress();
        saveState();
      }
    }
    const summary = $("summary");
    summary.hidden = false;
    summary.innerHTML = `<p class="done">✓ ${T.submitted}</p>` + (R.marks ? `<p class="grade">${T.grade(fmt(quizGrade()), fmt(QUIZ.grade))}</p>` : "");
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
      // A page from its top, with the "back to course" bar above the title.
      if (scrollTo === undefined) window.scrollTo(0, 0);
      else if ($(`q${scrollTo}`)) $(`q${scrollTo}`).scrollIntoView({ block: "start" });
    });
  }

  // Like Moodle's "Quiz navigation" block, kept at the top of the window while scrolling.
  // During the attempt: question buttons grouped by page (the page title jumps to the
  // page).  In the review all questions are on one page and the buttons scroll to them.
  function buildNav(review) {
    const nav = $("quiznav");
    nav.hidden = false;
    nav.classList.toggle("review", !!review);
    const button = (qi) => `<button type="button" class="qnbutton" data-q="${qi}">${shownNumber(qi)}</button>`;
    const all = QUIZ.questions.map((_, qi) => qi).filter(inAttempt);
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
    // "Back to course" at the top all the time (the answers are saved on leaving), and
    // again below the questions in the review.
    if (Scorm.connected) {
      const bar = document.createElement("div");
      bar.className = "coursebar";
      bar.appendChild(backToCourseButton());
      document.body.insertBefore(bar, $("title"));
    }
    if (!Scorm.connected && !QUIZ.ephemeral) {
      const bar = $("previewbar");
      bar.hidden = false;
      bar.querySelector("span").textContent = T.preview;
      const reset = bar.querySelector("button");
      reset.textContent = T.resetpreview;
      reset.onclick = () => { Scorm.resetPreview(); location.reload(); };
    }
    // QUIZ.ephemeral (website preview): always a fresh attempt, nothing restored.
    try { state = QUIZ.ephemeral ? null : JSON.parse(unpackState(Scorm.get("cmi.suspend_data"))); } catch (e) { state = null; }
    state = adoptState(state);
    // Packages before October 2026 kept the answers themselves as "l".
    state.q.forEach((qs) => { if (typeof qs.l === "string" && qs.l.startsWith("[")) qs.l = fingerprint(qs.l); });
    if (QUIZ.checklimit) checkLimit();
    logQuizLayout();
    saveState();
    if (Scorm.get("cmi.core.lesson_status") === "not attempted" || !Scorm.get("cmi.core.lesson_status")) {
      Scorm.set("cmi.core.lesson_status", "incomplete");
    }
    if (!state.f) Scorm.set("cmi.core.exit", "suspend");
    commit();

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
    start().then(() => {
      // Packages built with "teacherprobe: true": a read-only check for teacher mode.
      if (QUIZ.teacherprobe && Scorm.connected) {
        const s = document.createElement("script");
        s.src = "player/teacher-probe.js";
        document.body.appendChild(s);
      }
    }).catch((e) => {
      console.error(e);
      $("quiz").textContent = "שגיאה בטעינת המבדק: " + e.message;
    });
  }
  // The website preview injects the player after the page has loaded.
  if (document.readyState === "complete") run();
  else window.addEventListener("load", run);
})();
