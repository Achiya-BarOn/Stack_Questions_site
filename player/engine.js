/*
 * PRT engine: answer tests and potential-response-tree evaluation for one question
 * variant.  Used by the player in the browser and by tests/selfcheck.js in Node, so
 * both run exactly the same code.
 *
 *   StackEngine.runPrt(question, variant, prt, inputAsts) -> {score, penalty, notes, feedback}
 *   StackEngine.prtInputs(question, prt)                 -> input names the PRT reads
 *
 * Feedback variables and node expressions are run by the partial evaluator (peval.js),
 * in order, like STACK does in Maxima.  Values that still depend on free variables are
 * compared numerically at random points (Maxima.algEquiv).
 */
(function (global) {
  "use strict";

  const M = global.Maxima;
  const P = global.Peval;
  const warn = (...a) => { if (global.console) console.warn(...a); };
  const teacher = (text, multiple) => M.parse(String(text), { teacher: true, multiple });

  // ------------------------------------------------------------------ answer tests
  // Each test gets the evaluated student and teacher values, the evaluated test options,
  // the node and the scope.

  function algEquiv(a, b, node, sc) {
    if (!P.symbolic(a) && !P.symbolic(b)) {
      if (!M.sameShape(a, b)) return false;
      return M.valuesEqual(a, b, 1e-12);
    }
    const sa = P.toAst(a), ta = P.toAst(b);
    if (isCondition(sa) && isCondition(ta)) return conditionsEquiv(sa, ta);
    const env = { get: () => undefined };
    const x = M.evaluateShape(sa, env), y = M.evaluateShape(ta, env);
    if (x && y && !M.sameShape(x, y)) return false;
    return M.algEquiv(sa, ta, env, { ranges: nodeRanges(node, sc), points: node.ranges ? 12 : 8 });
  }

  // ---- Conditions such as "x <= -3 or x >= 3" (domains, solution sets of inequalities).
  // STACK compares them as sets of x.  We test both at the numbers that appear in the
  // conditions, a hair either side of them, between them and far away, so "<" and "<="
  // are told apart.  is(...) is not a condition here (it stays "unknown", as in Maxima).
  const RELATIONS = new Set(["<", ">", "<=", ">=", "=", "#"]);
  function isCondition(ast) {
    if (ast.k === "paren") return isCondition(ast.arg);
    if (ast.k === "not") return isCondition(ast.arg);
    if (ast.k === "op" && (ast.op === "and" || ast.op === "or")) return ast.args.every(isConditionOrBool);
    return ast.k === "op" && RELATIONS.has(ast.op) && ast.op !== "=";
  }
  const isConditionOrBool = (a) => isCondition(a) || (a.k === "id" && (a.name === "true" || a.name === "false"));

  function conditionsEquiv(sa, ta) {
    const env = { get: () => undefined };
    const vars = [...new Set([...M.freeVariables(sa, env), ...M.freeVariables(ta, env)])];
    if (vars.length !== 1) return M.algEquiv(sa, ta, { get: env.get, compare: true });
    const v = vars[0];
    const marks = [];
    const collect = (ast) => {
      if (ast.k === "op" && RELATIONS.has(ast.op)) {
        for (const side of ast.args) {
          if (!M.freeVariables(side, env).size) {
            try { marks.push(M.toNum(M.evaluate(side, {}))); } catch (e) { /* not a number */ }
          }
        }
      }
      for (const key in ast) {
        const c = ast[key];
        if (Array.isArray(c)) c.forEach((x) => x && x.k && collect(x));
        else if (c && c.k) collect(c);
      }
    };
    collect(sa); collect(ta);
    const cs = [...new Set(marks.filter(isFinite))].sort((x, y) => x - y);
    const pts = [];
    for (const c of cs) pts.push(c, c - 1e-7 * Math.max(1, Math.abs(c)), c + 1e-7 * Math.max(1, Math.abs(c)));
    for (let i = 0; i + 1 < cs.length; i++) pts.push((cs[i] + cs[i + 1]) / 2);
    const lo = cs.length ? cs[0] : -5, hi = cs.length ? cs[cs.length - 1] : 5;
    pts.push(lo - 10, hi + 10, lo - 1000, hi + 1000);
    for (let i = 0; i < 12; i++) pts.push(lo - 3 + (hi - lo + 6) * Math.random());
    let tested = 0;
    for (const x of pts) {
      const e = { point: { [v]: M.F(x) }, compare: true };
      let p, q;
      try { p = M.evaluate(sa, e); } catch (err) { p = null; }
      try { q = M.evaluate(ta, e); } catch (err) { q = null; }
      if (p === null || q === null) { if (p !== q) return false; continue; }
      if (p.t !== "bool" || q.t !== "bool" || p.v !== q.v) return false;
      tested++;
    }
    return tested > 0;
  }

  // Values at one random point (for tests that need numbers or concrete sets).
  function atPoint(vals) {
    const asts = vals.map(P.toAst);
    const vars = new Set();
    for (const a of asts) for (const v of M.freeVariables(a, {})) vars.add(v);
    const point = {};
    for (const v of vars) point[v] = M.F(0.37 + 1.7 * Math.random());
    return asts.map((a) => M.evaluate(a, { point }));
  }

  function asSet(v) {
    if (v.t === "set" || v.t === "list") return M.makeSet(v.items);
    return M.makeSet([v]);
  }

  const ANSWER_TESTS = {
    AlgEquiv: (a, b, opt, node, sc) => algEquiv(a, b, node, sc),
    CasEqual: (a, b, opt, node, sc) => algEquiv(a, b, node, sc),
    // STACK's Diff/Int/PartFrac also check the *form* of the answer and give notes; the
    // value check below is what decides full marks for a correct answer.
    Diff: (a, b, opt, node, sc) => algEquiv(a, b, node, sc),
    PartFrac: (a, b, opt, node, sc) => algEquiv(a, b, node, sc),
    Sets: (a, b) => {
      for (let i = 0; i < 3; i++) {
        const [x, y] = atPoint([a, b]);
        if (!M.valuesEqual(asSet(x), asSet(y), 1e-9)) return false;
        if (!P.symbolic(a) && !P.symbolic(b)) break;
      }
      return true;
    },
    String: (a, b) => stringOf(a) === stringOf(b),
    StringSloppy: (a, b) => stringOf(a).replace(/\s+/g, "").toLowerCase() === stringOf(b).replace(/\s+/g, "").toLowerCase(),
    NumRelative: (a, b, opt) => numTest(a, b, opt, true),
    NumAbsolute: (a, b, opt) => numTest(a, b, opt, false),
    GT: (a, b) => { const [x, y] = atPoint([a, b]); return M.toNum(x) > M.toNum(y); },
    GTE: (a, b) => { const [x, y] = atPoint([a, b]); return M.toNum(x) >= M.toNum(y); },
  };

  // Sampling ranges from the question's player translation, e.g. {x: ["0.05", "2*bt+2"]}.
  function nodeRanges(node, sc) {
    if (!node.ranges) return undefined;
    const out = {};
    for (const [v, [lo, hi]] of Object.entries(node.ranges)) {
      out[v] = [M.toNum(P.value(teacher(lo), sc)), M.toNum(P.value(teacher(hi), sc))];
    }
    return out;
  }

  function stringOf(v) {
    return v.t === "str" ? v.v : JSON.stringify(v, (k, x) => (typeof x === "bigint" ? x.toString() : x));
  }

  function numTest(a, b, opt, relative) {
    const [x, y] = atPoint([a, b]).map(M.toNum);
    const tol = opt ? M.toNum(atPoint([opt])[0]) : 0.05;
    return relative ? Math.abs(x - y) <= tol * Math.abs(y) : Math.abs(x - y) <= tol;
  }

  // ------------------------------------------------------------------ PRTs

  // Functions defined in the question variables (f(x):=...), parsed once per question.
  function questionFunctions(q) {
    if (!q._functions) {
      q._functions = {};
      for (const f of q.functions || []) {
        try { q._functions[f.name] = { params: f.params, body: teacher(f.body) }; }
        catch (e) { /* not parsable by the player: calls to it stay unsupported */ }
      }
    }
    return q._functions;
  }

  function newScope(q, v, inputAsts) {
    return P.scope({ vars: v.vars, inputs: inputAsts, functions: questionFunctions(q) });
  }

  function runPrt(q, v, prt, inputAsts) {
    const sc = newScope(q, v, inputAsts);
    if (prt.feedbackvariables) P.exec(teacher(prt.feedbackvariables, true), sc);
    let score = 0, penalty = null;
    const notes = [], feedback = [];
    let node = prt.nodes.find((n) => n.name === prt.firstnode);
    for (let guard = 0; node && guard < 100; guard++) {
      const test = ANSWER_TESTS[node.answertest];
      let result = false;
      if (!test) warn("answer test not implemented:", node.answertest);
      else {
        try {
          const a = P.value(teacher(node.sans), sc), b = P.value(teacher(node.tans), sc);
          const opt = node.testoptions ? P.value(teacher(node.testoptions), sc) : null;
          result = test(a, b, opt, node, sc);
        } catch (e) {
          warn(`${q.id} ${prt.name} node ${node.name}:`, e.message);
          result = false;
        }
      }
      const br = result ? node.on_true : node.on_false;
      const s = br.score ?? 0;
      if (br.scoremode === "+") score += s;
      else if (br.scoremode === "-") score -= s;
      else score = s;
      if (br.penalty !== undefined && br.penalty !== null) penalty = br.penalty;
      notes.push(br.answernote);
      if (br.feedback) feedback.push(fillRuntime(br.feedback, sc));
      node = br.nextnode === -1 || br.nextnode === undefined ? null : prt.nodes.find((n) => n.name === br.nextnode);
    }
    score = Math.max(0, Math.min(1, score));
    // STACK: the question's penalty applies unless a node set its own; none when fully right.
    if (penalty === null) penalty = score >= 1 ? 0 : q.penalty;
    return { score, penalty, notes, feedback };
  }

  // {@expr@} / {#expr#} in node feedback that depend on the student's answer or on
  // feedback variables (the build leaves them in the text): computed here, in the
  // PRT's own scope.  Inside \( \) the LaTeX is inserted as is, elsewhere wrapped.
  function fillRuntime(html, sc) {
    if (!/\{[@#]/.test(html)) return html;
    return html.replace(/\{([@#])([\s\S]*?)\1\}/g, (whole, kind, expr, pos) => {
      try {
        const v = P.value(teacher(expr), sc);
        const tex = M.latex(P.toAst(v), {});
        if (kind === "#") return v.t === "str" ? v.v : tex;
        return inMath(html, pos) ? `{${tex}}` : `\\(${tex}\\)`;
      } catch (e) {
        warn("feedback expression", expr, e.message);
        return "?";
      }
    });
  }

  function inMath(text, pos) {
    let inside = false;
    for (const m of text.slice(0, pos).matchAll(/\\\(|\\\)|\\\[|\\\]/g)) inside = m[0] === "\\(" || m[0] === "\\[";
    return inside;
  }

  function prtInputs(q, prt) {
    const names = new Set(q.inputs.map((i) => i.name));
    const used = new Set();
    const scan = (text) => { if (text) for (const id of (String(text).match(/[A-Za-z_%][A-Za-z0-9_%]*/g) || [])) if (names.has(id)) used.add(id); };
    scan(prt.feedbackvariables);
    for (const n of prt.nodes) { scan(n.sans); scan(n.tans); scan(n.testoptions); }
    return [...used];
  }

  global.StackEngine = { ANSWER_TESTS, runPrt, prtInputs };
})(typeof window !== "undefined" ? window : globalThis);
