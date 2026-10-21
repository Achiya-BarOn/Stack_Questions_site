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
    // trigsimp(fullratsimp(radcan(domain))) is the condition itself (2346775)
    const bare = (x) => (x.k === "paren" ? bare(x.arg)
      : x.k === "call" && M.SIMPLIFIERS.has(x.name) && x.args.length === 1 ? bare(x.args[0]) : x);
    if (isCondition(bare(sa)) && isCondition(bare(ta))) return conditionsEquiv(bare(sa), bare(ta));
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

  // ---- EqualComAss: equal up to commutativity and associativity of + and * (STACK's
  // equals_commute_associate, noun_simp.mac).  STACK calls it with simp:false, so the
  // student's answer is compared as typed and a question variable as Maxima stored it
  // (simplified).  We rebuild those forms: inputs -> the typed AST, question variables ->
  // their stored text, feedback variables -> their (computed) value.  Then, like STACK:
  // a-b = a+(-1)*b, -n = the integer -n, -x = UNARY_MINUS*x, a/b = a*UNARY_RECIP(b),
  // exp(x) = %e^x, nested + and * flattened, their operands (and those of = and sets)
  // sorted.  Two forms are equal when these trees are identical.
  function rawForm(text, sc) {
    const ALIAS = { i: "%i", pi: "%pi" };
    const sub = (n) => {
      if (!n || typeof n !== "object") return n;
      if (n.k === "id") {
        for (let i = sc.locals.length - 1; i >= 0; i--) {
          if (sc.locals[i].has(n.name)) return { k: "paren", arg: P.toAst(sc.locals[i].get(n.name)) };
        }
        if (sc.inputs[n.name]) return { k: "paren", arg: sub(sc.inputs[n.name]) };
        if (sc.vars[n.name] !== undefined) return { k: "paren", arg: sub(M.parse(String(sc.vars[n.name]), { teacher: true })) };
        return ALIAS[n.name] ? { k: "id", name: ALIAS[n.name] } : n;
      }
      const out = Array.isArray(n) ? [] : {};
      for (const k in n) {
        const c = n[k];
        out[k] = Array.isArray(c) ? c.map((x) => (x && x.k ? sub(x) : x)) : c && c.k ? sub(c) : c;
      }
      return out;
    };
    return sub(teacher(text));
  }

  const UM = { k: "id", name: "UNARY_MINUS" };
  const isInt = (n) => n.k === "num" && !n.isFloat && /^\d+$/.test(String(n.value));
  function nounForm(n) {
    const N = nounForm;
    const nary = (op, args) => {
      const flat = [];
      for (const a of args.map(N)) { if (a.k === "noun" && a.op === op) flat.push(...a.args); else flat.push(a); }
      return { k: "noun", op, args: flat.sort(cmpForm) };
    };
    switch (n.k) {
      case "paren": return N(n.arg);
      case "neg": {
        let a = n.arg;
        while (a.k === "paren") a = a.arg;
        if (isInt(a)) return { k: "num", value: "-" + a.value, isFloat: false };
        return nary("*", [UM, a]);
      }
      case "op":
        if (n.op === "+") return nary("+", n.args);
        if (n.op === "-" && n.args.length === 2) return nary("+", [n.args[0], { k: "neg", arg: n.args[1] }]);
        if (n.op === "*") return nary("*", n.args);
        if (n.op === "/") return nary("*", [n.args[0], { k: "call", name: "UNARY_RECIP", args: [n.args[1]] }]);
        if (n.op === "=") return { k: "noun", op: "=", args: n.args.map(N).sort(cmpForm) };
        return { k: "noun", op: n.op, args: n.args.map(N) };
      case "call":
        if (n.name === "exp" && n.args.length === 1) return { k: "noun", op: "^", args: [{ k: "id", name: "%e" }, N(n.args[0])] };
        return { k: "call", name: n.name, args: n.args.map(N) };
      case "list": return { k: "list", items: n.items.map(N) };
      case "set": return { k: "set", items: n.items.map(N).sort(cmpForm) };
      case "num": return { k: "num", value: String(n.value), isFloat: !!n.isFloat };
      default: return n;
    }
  }
  const keyOf = (f) => JSON.stringify(f);
  const cmpForm = (x, y) => { const a = keyOf(x), b = keyOf(y); return a < b ? -1 : a > b ? 1 : 0; };

  function equalComAss(a, b, node, sc) {
    if (!algEquiv(a, b, node, sc)) return false;
    return keyOf(nounForm(rawForm(node.sans, sc))) === keyOf(nounForm(rawForm(node.tans, sc)));
  }

  // ---- Expanded: STACK's expandp(sa) -- is the student's answer, simplified, equal to its
  // expand()?  Only the answer is looked at; the teacher's answer is a dummy.  Without a CAS
  // we look at the form: numeric parts are folded (Maxima simplifies 2*(3+4) to 14), then
  // the answer is not expanded when a sum is a factor of a product or of a numerator, or
  // is raised to a whole power other than -1 (x*(x+1), (x+1)/2, (1+%i)^2, 1/(x+1)^2).
  // A minus in front of a sum is fine: Maxima distributes it.  Checked against Maxima.
  function isExpanded(ast) {
    const plain = (n) => {
      if (!n || typeof n !== "object") return true;
      if (n.k === "id" || n.k === "call" || n.k === "str" || n.k === "list" || n.k === "set") return false;
      if (n.k === "num") return true;
      if (n.k === "paren" || n.k === "neg") return plain(n.arg);
      return n.k === "op" && ["+", "-", "*", "/", "^"].includes(n.op) && n.args.every(plain);
    };
    const strip = (n) => { while (n.k === "paren" || n.k === "neg") n = n.arg; return n; };
    const isSum = (n) => { n = strip(n); return !plain(n) && n.k === "op" && (n.op === "+" || n.op === "-"); };
    const factors = (n) => { n = strip(n); return n.k === "op" && n.op === "*" ? n.args.flatMap(factors) : [n]; };
    const wholePow = (n) => { const e = strip(n); return plain(e) && Number.isInteger(M.toNum(M.evaluate(n, {}))) ? M.toNum(M.evaluate(n, {})) : null; };
    const ok = (n) => {
      if (!n || typeof n !== "object" || plain(n)) return true;
      if (n.k === "op" && n.op === "*") {
        const fs = factors(n);
        if (fs.length > 1 && fs.some(isSum)) return false;
      }
      if (n.k === "op" && n.op === "/") {
        const num = factors(n.args[0]), den = factors(n.args[1]);
        if (num.some(isSum)) return false;
        if (den.length > 1 && den.some(isSum)) return false;
        if (den.some((f) => f.k === "op" && f.op === "^" && isSum(f.args[0]) && (wholePow(f.args[1]) || 0) >= 2)) return false;
      }
      if (n.k === "op" && n.op === "^" && isSum(n.args[0])) {
        const k = wholePow(n.args[1]);
        if (k !== null && k !== -1 && k !== 0 && k !== 1) return false;
      }
      for (const key in n) {
        const c = n[key];
        if (Array.isArray(c)) { if (!c.every((x) => !x || !x.k || ok(x))) return false; }
        else if (c && c.k && !ok(c)) return false;
      }
      return true;
    };
    return ok(ast);
  }

  // ---- SysEquiv: two lists of polynomial equations with the same solutions (STACK compares
  // Groebner bases, so: the same ideal).  Both lists must hold equations only, with the
  // same variables (as Maxima's listofvars after simplification: a variable whose
  // coefficient is 0 does not count).  Systems of linear equations are compared exactly:
  // the same row space of [A | b] (or both inconsistent).  Single equations of any degree:
  // the same polynomial up to a nonzero constant factor.  Larger nonlinear systems are not
  // supported (false, with a warning).
  function eqToF(ast) {          // a = b -> a - b; (e1) - (e2) of equations -> f1 - f2
    const has = (n) => n && typeof n === "object" && (n.k === "op" && n.op === "=" || ["paren", "neg"].includes(n.k) && has(n.arg) ||
      n.k === "op" && ["+", "-", "*"].includes(n.op) && n.args.some(has));
    if (!has(ast)) return null;
    const f = (n) => {
      if (n.k === "paren") return f(n.arg);
      if (n.k === "neg") return { k: "neg", arg: f(n.arg) };
      if (n.k === "op" && n.op === "=") return { k: "op", op: "-", args: [n.args[0], { k: "paren", arg: n.args[1] }] };
      if (n.k === "op" && ["+", "-", "*"].includes(n.op) && has(n)) {
        if (n.op === "*" && n.args.filter(has).length !== 1) throw new Error("product of equations");
        return { k: "op", op: n.op, args: n.args.map((a) => ({ k: "paren", arg: has(a) ? f(a) : a })) };
      }
      return n;
    };
    return f(ast);
  }

  function sysEquiv(a, b) {
    if (a.t !== "list" || b.t !== "list") return false;
    const fs = (l) => l.items.map((v) => (P.isExpr(v) ? eqToF(v.ast) : null));
    const F1 = fs(a), F2 = fs(b);
    if (F1.some((f) => !f) || F2.some((f) => !f)) return false;
    const at = (f, point) => M.evaluate(f, { point });
    const syms = new Set();
    for (const f of [...F1, ...F2]) for (const v of M.freeVariables(f, {})) syms.add(v);
    const all = [...syms].sort();
    const rnd = () => Object.fromEntries(all.map((v) => [v, M.F(0.3 + 2.1 * Math.random() * (Math.random() < 0.5 ? -1 : 1))]));
    const num = (f, p) => M.toNum(at(f, p));
    // the variables a system really depends on
    const varsOf = (F) => all.filter((v) => F.some((f) => [0, 1, 2].some(() => {
      const p = rnd(), y0 = num(f, p);
      p[v] = M.F(M.toNum(p[v]) + 1.37);
      return Math.abs(num(f, p) - y0) > 1e-9 * (1 + Math.abs(y0));
    })));
    const V1 = varsOf(F1), V2 = varsOf(F2);
    if (V1.join() !== V2.join()) return false;
    const vars = V2;
    // affine?  coefficients from exact values at 0 and at the unit vectors
    const zero = () => Object.fromEntries(all.map((v) => [v, M.Q(0n)]));
    const affine = (f) => {
      const c0 = at(f, zero());
      const cs = vars.map((v) => { const p = zero(); p[v] = M.Q(1n); return M.arith("-", at(f, p), c0); });
      for (let k = 0; k < 3; k++) {
        const p = rnd();
        let y = M.toNum(c0);
        vars.forEach((v, i) => { y += M.toNum(cs[i]) * M.toNum(p[v]); });
        const z = num(f, p);
        if (!(Math.abs(z - y) <= 1e-9 * (1 + Math.abs(z)))) return null;
      }
      return [...cs, M.arith("*", M.Q(-1n), c0)];
    };
    const rank = (rows) => (rows.length ? M.toNum(M.callValue("rank", [{ t: "matrix", rows }])) : 0);
    const R1 = F1.map(affine), R2 = F2.map(affine);
    if (R1.every(Boolean) && R2.every(Boolean)) {
      const A = (R) => R.map((r) => r.slice(0, -1));
      const bad1 = rank(A(R1)) < rank(R1), bad2 = rank(A(R2)) < rank(R2);
      if (bad1 || bad2) return bad1 && bad2;            // an inconsistent system: the ideal (1)
      const r1 = rank(R1), r2 = rank(R2);
      return r1 === r2 && rank([...R1, ...R2]) === r1;
    }
    if (F1.length === 1 && F2.length === 1) {
      let ratio = null, tested = 0;
      for (let k = 0; k < 40 && tested < 8; k++) {
        const p = rnd();
        const x = num(F1[0], p), y = num(F2[0], p);
        if (!isFinite(x) || !isFinite(y) || Math.abs(y) < 1e-9) continue;
        const r = x / y;
        if (Math.abs(r) < 1e-12) return false;
        if (ratio === null) ratio = r;
        else if (Math.abs(r - ratio) > 1e-8 * Math.abs(ratio)) return false;
        tested++;
      }
      return tested >= 4;
    }
    warn("SysEquiv: nonlinear systems of several equations are not supported");
    return false;
  }

  // ---- Int: STACK's ATInt (Intfun in stackmaxima.mac, the same in STACK 4.4 and 4.10).
  // The derivative of the student's answer must equal that of the teacher's, and the answer
  // needs a constant of integration (unless the options say NOCONST): a single new symbol,
  // to the first power.  log(x) for log(|x|) is wrong when the teacher used log(abs(...)).
  // STACK decides "constant" by simplifying sa - sb; here it is decided by the symbols the
  // student added (sa - sb is constant in the variable once the derivatives agree).
  const INT_FEEDBACK = {
    he: {
      const: "צריך להוסיף קבוע אינטגרציה. חוץ מזה התשובה נראית נכונה, כל הכבוד.",
      const_int: "צריך להוסיף קבוע אינטגרציה. הקבוע צריך להיות קבוע שרירותי, ולא מספר.",
      weirdconst: "הנגזרת של התשובה שלכם שווה לביטוי שהתבקשתם לבצע לו אינטגרציה, אבל קבוע האינטגרציה שלכם משונה. כדאי לשאול את המרצה.",
      formal: "הנגזרת של התשובה שלכם שווה לביטוי שהתבקשתם לבצע לו אינטגרציה, אבל התשובה שונה מהתשובה הנכונה באופן מהותי, ולא רק בקבוע אינטגרציה. כדאי לשאול את המרצה.",
      logabs: "ייתכן שהמרצה מצפה שתשתמשו בתוצאה \\(\\int\\frac{1}{x}\\,dx=\\ln|x|+c\\), ולא \\(\\int\\frac{1}{x}\\,dx=\\ln x+c\\). כדאי לשאול את המרצה.",
      logabs_inconsistent: "יש חוסר עקביות בשימוש שלכם ב-\\(\\ln(\\dots)\\) וב-\\(\\ln|\\dots|\\). כדאי לשאול את המרצה.",
      diff: "נראה שגזרתם במקום לבצע אינטגרציה!",
      generic: "הנגזרת של התשובה שלכם צריכה להיות שווה לביטוי שהתבקשתם לבצע לו אינטגרציה, והיא לא שווה לו.",
    },
    en: {
      const: "You need to add a constant of integration, otherwise this appears to be correct. Well done.",
      const_int: "You need to add a constant of integration. This should be an arbitrary constant, not a number.",
      weirdconst: "The formal derivative of your answer does equal the expression that you were asked to integrate. However, you have a strange constant of integration. Please ask your teacher about this.",
      formal: "The formal derivative of your answer does equal the expression that you were asked to integrate. However, your answer differs from the correct answer in a significant way, that is to say not just, e.g., a constant of integration. Please ask your teacher about this.",
      logabs: "Your teacher may expect you to use the result \\(\\int\\frac{1}{x} dx = \\log(|x|)+c\\), rather than \\(\\int\\frac{1}{x} dx = \\log(x)+c\\). Please ask your teacher about this.",
      logabs_inconsistent: "There appear to be strange inconsistencies between your use of \\(\\log(...)\\) and \\(\\log(|...|)\\). Please ask your teacher about this.",
      diff: "It looks like you have differentiated instead!",
      generic: "The derivative of your answer should be equal to the expression that you were asked to integrate, and it is not.",
    },
  };

  function intTest(a, b, opt, node, sc, q) {
    const msg = INT_FEEDBACK[/[֐-׿]/.test((q && q.questiontext) || "") ? "he" : "en"];
    const env = { get: () => undefined };
    let varVal = opt, constint = true, acceptformal = false;
    if (opt && opt.t === "list") {          // [x, NOCONST, FORMAL]
      varVal = opt.items[0];
      const flags = new Set(opt.items.slice(1).map((o) => { const t = P.toAst(o); return t.k === "id" ? t.name : ""; }));
      constint = !flags.has("NOCONST");
      acceptformal = flags.has("FORMAL");
    }
    const xa = varVal && P.toAst(varVal);
    if (!xa || xa.k !== "id") return false;
    const x = xa.name;
    if (["list", "set", "matrix"].includes(a.t)) return false;
    const strip = (e) => (e.k === "paren" ? strip(e.arg) : e);
    let sa = P.toAst(a);
    const sb = P.toAst(b);
    if (strip(sa).k === "op" && strip(sa).op === "=") return false;

    const kids = (e) => (e.k === "op" || e.k === "call" ? e.args : e.k === "neg" || e.k === "paren" ? [e.arg] : e.k === "list" ? e.items : []);
    const hasVar = (e) => M.identifiers(e).has(x);
    const isLog = (e) => e.k === "call" && (e.name === "log" || e.name === "ln");
    const anyLog = (e) => isLog(e) || kids(e).some(anyLog);
    // ATInt_var_in_abs_p / ATInt_logabs_p / ATInt_consistent_logabs_p
    const varInAbs = (e) => {
      e = strip(e);
      if (e.k === "id") return e.name !== x;
      if (e.k === "num") return true;
      if (!hasVar(e)) return false;
      if (e.k === "call" && e.name === "abs") return true;
      return kids(e).every(varInAbs);
    };
    const logAbsP = (e) => {
      if (e.k === "id" || e.k === "num") return true;
      if (isLog(e)) return e.args.every(varInAbs);
      return kids(e).every(logAbsP);
    };
    const logKinds = (e, out) => {
      if (isLog(e)) {
        if (e.args.every(varInAbs)) out.add("abs");
        else if (e.args.some(hasVar)) out.add("plain");
        return out;
      }
      kids(e).forEach((k) => logKinds(k, out));
      return out;
    };
    // log(abs(u)) -> log(u)
    const dropLogAbs = (e) => {
      if (isLog(e) && e.args.length === 1 && strip(e.args[0]).k === "call" && strip(e.args[0]).name === "abs") {
        return { k: "call", name: "log", args: strip(e.args[0]).args };
      }
      const c = { ...e };
      if (e.args) c.args = e.args.map(dropLogAbs);
      if (e.arg) c.arg = dropLogAbs(e.arg);
      if (e.items) c.items = e.items.map(dropLogAbs);
      return c;
    };
    // strip_int_const: drop the terms of a sum that are free of x and not numbers.
    const terms = (e, sign, out) => {
      e = strip(e);
      if (e.k === "op" && (e.op === "+" || e.op === "-")) {
        terms(e.args[0], sign, out);
        terms(e.args[1], e.op === "-" ? -sign : sign, out);
      } else if (e.k === "neg") terms(e.arg, -sign, out);
      else out.push(sign > 0 ? e : { k: "neg", arg: e });
      return out;
    };
    const stripConst = (e) => {
      const ts = terms(e, 1, []);
      if (ts.length < 2) return e;
      const keep = ts.filter((t) => hasVar(t) || !M.freeVariables(t, env).size);
      if (!keep.length) return { k: "num", value: "0", isFloat: false };
      return keep.reduce((s, t) => ({ k: "op", op: "+", args: [s, t] }));
    };
    const deriv = (e) => {
      const call = { k: "call", name: "diff", args: [e, { k: "id", name: x }] };
      return M.expandDiff(call) || call;
    };
    const equiv = (p, r) => { try { return M.algEquiv(p, r, env, {}); } catch (e) { return false; } };

    const sbUsedLogAbs = anyLog(sb) && logAbsP(sb);
    const saUsedLogAbs = logAbsP(sa);
    const kinds = logKinds(sa, new Set());
    const saConsistent = !(kinds.has("abs") && kinds.has("plain"));
    if (!sbUsedLogAbs) sa = dropLogAbs(sa);
    const sbs = stripConst(sb), saa = stripConst(sa);

    // The derivatives in x alone, at points on several scales: an integrand such as
    // 1/sqrt(1-81*x^2) is defined only for |x| < 1/9 (86342), where few random points land.
    const derivEquiv = (p, r) => {
      const vars = new Set([...M.freeVariables(p, env), ...M.freeVariables(r, env)]);
      if (vars.size !== 1 || !vars.has(x)) return equiv(p, r);
      let agree = 0;
      for (let i = 0; i < 600 && agree < 8; i++) {
        const t = (2 * Math.random() - 1) * [0.03, 0.3, 3, 20][i % 4];
        let pv, rv;
        try {
          pv = M.toNum(M.evaluate(p, { point: { [x]: M.F(t) } }));
          rv = M.toNum(M.evaluate(r, { point: { [x]: M.F(t) } }));
        } catch (e) { continue; }
        if (!isFinite(pv) || !isFinite(rv)) continue;
        const big = Math.max(1, Math.abs(pv), Math.abs(rv));
        if (Math.abs(pv - rv) <= 1e-7 * big) agree++;
        else if (big < 1e5) return false;     // near a pole: no verdict, as in Maxima.algEquiv
      }
      return agree >= 4 || equiv(p, r);
    };

    let ok = false, fb = "";
    const dA = deriv(sa), dB = deriv(sb);
    if (derivEquiv(dA, dB)) {
      const teacherSyms = M.freeVariables(sbs, env);
      const extra = [...M.freeVariables(sa, env)].filter((n) => n !== x && !teacherSyms.has(n));
      // ATIntWeirdConstp: one new symbol c with degree(ex, c) = hipow(expand(ex), c) = 1.
      // Like Maxima's hipow: c^2, c^3+c, 1/c are not 1; sin(c), exp(c), 2*c are.
      const weird = () => {
        if (extra.length !== 1) return true;
        const c = extra[0];
        const has = (e) => M.identifiers(e).has(c);
        const deg = (e) => {
          e = strip(e);
          if (!has(e)) return 0;
          if (e.k === "id") return 1;
          if (e.k === "neg") return deg(e.arg);
          if (e.k === "op" && (e.op === "+" || e.op === "-")) return Math.max(deg(e.args[0]), deg(e.args[1]));
          if (e.k === "op" && e.op === "*") return deg(e.args[0]) + deg(e.args[1]);
          if (e.k === "op" && e.op === "/") return deg(e.args[0]) - deg(e.args[1]);
          if (e.k === "op" && e.op === "^" && !has(e.args[1])) {
            let n;
            try { n = M.toNum(M.evaluate(e.args[1], {})); } catch (err) { return 1; }
            const b = strip(e.args[0]);
            return b.k === "id" || b.k === "op" ? n * deg(b) : 1;
          }
          return 1;     // c inside a function: sin(c), exp(c)
        };
        return deg(sa) !== 1;
      };
      if (!extra.length) {
        if (constint) fb = equiv(sa, sbs) ? msg.const : msg.const_int;
        ok = !constint;
      } else if (!(anyLog(sa) && anyLog(sb))) {
        if (weird()) fb = msg.weirdconst;
        else ok = true;
      } else if (equiv(saa, sbs) || !weird()) ok = true;
      else { ok = acceptformal; fb = msg.formal; }
    } else {
      const d2B = deriv(dB);
      fb = equiv(saa, d2B) ? msg.diff : msg.generic;
    }
    if (!saUsedLogAbs && sbUsedLogAbs) { ok = false; fb = msg.logabs; }
    if (!saConsistent) { ok = false; fb = msg.logabs_inconsistent; }
    return { result: ok, feedback: fb };
  }


  // ------------------------------------------------------------------ form tests
  // FacForm, SingleFrac, CompSquare and LowestTerms look at the form of the student's answer
  // as typed (STACK passes it unsimplified), following stackmaxima.mac / assessment.mac of
  // STACK 4.4.  Where STACK asks Maxima's factor(), the player decides with polynomial
  // arithmetic over the rationals: a sum is "factored" when its integer coefficients have no
  // common factor and it is irreducible.  Checked against Maxima (tests/maxima.test.js).

  // -- exact rationals [n, d] (BigInt, d > 0)
  const bgcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const R = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = bgcd(n, d) || 1n; return [n / g, d / g]; };
  const radd = (a, b) => R(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  const rmul = (a, b) => R(a[0] * b[0], a[1] * b[1]);
  const rzero = (a) => a[0] === 0n;
  const rdiv = (a, b) => R(a[0] * b[1], a[1] * b[0]);

  // -- polynomials: Map "x^2*y" -> rational, over named variables.  Function calls and
  // anything else that is not a polynomial are kernels (one variable each), as for factor().
  const unparen = (n) => { while (n && n.k === "paren") n = n.arg; return n; };
  const monoKey = (m) => Object.keys(m).sort().map((v) => (m[v] === 1 ? v : `${v}^${m[v]}`)).join("*");
  const parseKey = (k) => {
    const m = {};
    if (k) for (const f of k.split("*")) { const [v, e] = f.split("^"); m[v] = e ? +e : 1; }
    return m;
  };
  const pconst = (r) => (rzero(r) ? new Map() : new Map([["", r]]));
  const padd = (a, b, sign = 1n) => {
    const out = new Map(a);
    for (const [k, c] of b) {
      const s = radd(out.get(k) || [0n, 1n], [sign * c[0], c[1]]);
      if (rzero(s)) out.delete(k); else out.set(k, s);
    }
    return out;
  };
  const pmul = (a, b) => {
    let out = new Map();
    for (const [ka, ca] of a) for (const [kb, cb] of b) {
      const m = parseKey(ka);
      for (const [v, e] of Object.entries(parseKey(kb))) m[v] = (m[v] || 0) + e;
      out = padd(out, new Map([[monoKey(m), rmul(ca, cb)]]));
    }
    return out;
  };
  const kernelName = (n) => "§" + JSON.stringify(n);
  function poly(n) {
    n = unparen(n);
    switch (n.k) {
      case "num": {
        if (n.isFloat) return null;
        return pconst(R(BigInt(n.value)));
      }
      case "id": return new Map([[n.name, [1n, 1n]]]);
      case "neg": { const a = poly(n.arg); return a && padd(new Map(), a, -1n); }
      case "op": {
        const [x, y] = n.args;
        if (n.op === "+" || n.op === "-") {
          const a = poly(x), b = poly(y);
          return a && b && padd(a, b, n.op === "-" ? -1n : 1n);
        }
        if (n.op === "*") { const a = poly(x), b = poly(y); return a && b && pmul(a, b); }
        if (n.op === "/") {
          const a = poly(x), b = poly(y);
          if (!a || !b || b.size !== 1 || !b.has("")) return null;
          const inv = rdiv([1n, 1n], b.get(""));
          return pmul(a, pconst(inv));
        }
        if (n.op === "^") {
          const a = poly(x), e = unparen(y);
          if (!a || e.k !== "num" || e.isFloat || !/^\d+$/.test(e.value) || +e.value > 40) return null;
          let out = pconst([1n, 1n]);
          for (let i = 0; i < +e.value; i++) out = pmul(out, a);
          return out;
        }
        return null;
      }
      case "call": return new Map([[kernelName(n), [1n, 1n]]]);
      default: return null;
    }
  }
  const pvars = (p) => [...new Set([...p.keys()].flatMap((k) => Object.keys(parseKey(k))))];
  const degIn = (p, v) => Math.max(-1, ...[...p.keys()].map((k) => parseKey(k)[v] || 0));
  // p as a polynomial in v: coefficient polynomials (in the other variables) by power
  function coeffsIn(p, v) {
    const cs = [];
    for (const [k, c] of p) {
      const m = parseKey(k), e = m[v] || 0;
      delete m[v];
      cs[e] = padd(cs[e] || new Map(), new Map([[monoKey(m), c]]));
    }
    for (let i = 0; i < cs.length; i++) cs[i] = cs[i] || new Map();
    return cs;
  }
  const isConstPoly = (p) => p.size === 0 || (p.size === 1 && p.has(""));
  const constOf = (p) => (p.size === 0 ? [0n, 1n] : p.get(""));
  const intCoeffs = (p) => [...p.values()].every((c) => c[1] === 1n);
  const content = (p) => [...p.values()].reduce((g, c) => bgcd(g, c[0]), 0n);

  // -- univariate integer polynomials: coefficient arrays (BigInt), index = power
  const udeg = (f) => f.length - 1;
  function utrim(f) { while (f.length > 1 && f[f.length - 1] === 0n) f.pop(); return f; }
  // exact division over Z, or null
  function udivExact(f, g) {
    f = f.slice();
    const q = new Array(Math.max(1, f.length - g.length + 1)).fill(0n);
    const lg = g[g.length - 1];
    for (let i = f.length - g.length; i >= 0; i--) {
      const lead = f[i + g.length - 1];
      if (lead % lg !== 0n) return null;
      const c = lead / lg;
      q[i] = c;
      for (let j = 0; j < g.length; j++) f[i + j] -= c * g[j];
    }
    return f.every((c) => c === 0n) ? q : null;
  }
  // gcd over Q (monic, as rationals) – only its degree is needed
  function ugcdDeg(f, g) {
    let a = f.map((c) => R(c)), b = g.map((c) => R(c));
    const trim = (p) => { while (p.length > 1 && rzero(p[p.length - 1])) p.pop(); return p; };
    a = trim(a); b = trim(b);
    while (!(b.length === 1 && rzero(b[0]))) {
      const r = a.slice();
      while (r.length >= b.length && !(r.length === 1 && rzero(r[0]))) {
        const c = rdiv(r[r.length - 1], b[b.length - 1]), s = r.length - b.length;
        for (let j = 0; j < b.length; j++) r[s + j] = radd(r[s + j], rmul([-c[0], c[1]], b[j]));
        r.pop();
        trim(r);
        if (r.length < b.length) break;
      }
      a = b; b = r.length ? trim(r) : [[0n, 1n]];
    }
    return a.length - 1;
  }
  // complex roots (Durand–Kerner)
  function uroots(f) {
    const n = udeg(f), lc = Number(f[n]);
    const c = f.map((x) => Number(x) / lc);
    let z = Array.from({ length: n }, (_, k) => [Math.cos(2 * Math.PI * k / n + 0.4) * 1.3, Math.sin(2 * Math.PI * k / n + 0.4) * 1.3]);
    const mul = (a, b) => [a[0] * b[0] - a[1] * b[1], a[0] * b[1] + a[1] * b[0]];
    const div = (a, b) => { const d = b[0] * b[0] + b[1] * b[1]; return [(a[0] * b[0] + a[1] * b[1]) / d, (a[1] * b[0] - a[0] * b[1]) / d]; };
    const evalAt = (x) => { let r = [1, 0]; for (let i = n - 1; i >= 0; i--) { r = mul(r, x); r[0] += c[i]; } return r; };
    const scale = Math.max(1, ...c.map(Math.abs));
    z = z.map((w) => [w[0] * scale, w[1] * scale]);
    for (let it = 0; it < 2000; it++) {
      let moved = 0;
      z = z.map((zi, i) => {
        let den = [1, 0];
        z.forEach((zj, j) => { if (i !== j) den = mul(den, [zi[0] - zj[0], zi[1] - zj[1]]); });
        const step = div(evalAt(zi), den);
        moved = Math.max(moved, Math.hypot(step[0], step[1]) / Math.max(1, Math.hypot(zi[0], zi[1])));
        return [zi[0] - step[0], zi[1] - step[1]];
      });
      if (moved < 1e-14) break;
    }
    return z;
  }
  const divisors = (n) => {
    n = n < 0n ? -n : n;
    const out = [];
    for (let d = 1n; d * d <= n && d < 100000n; d++) if (n % d === 0n) { out.push(d); if (d * d !== n) out.push(n / d); }
    return out;
  };
  // Is the primitive integer polynomial f irreducible over Q?
  function uirreducible(f) {
    f = utrim(f.slice());
    const n = udeg(f);
    if (n <= 0) return false;
    if (n === 1) return true;
    const df = f.slice(1).map((c, i) => c * BigInt(i + 1));
    if (ugcdDeg(f, df) > 0) return false;             // a repeated factor
    if (n > 12) return true;                          // not expected here
    const roots = uroots(f), lcs = divisors(f[n]);
    const pick = (k, from, chosen) => {
      if (chosen.length === k) {
        let g = [[1, 0]];                            // monic product of (x - r), complex
        for (const r of chosen) {
          const next = Array.from({ length: g.length + 1 }, () => [0, 0]);
          g.forEach((c, i) => {
            next[i + 1][0] += c[0]; next[i + 1][1] += c[1];
            next[i][0] -= c[0] * r[0] - c[1] * r[1]; next[i][1] -= c[0] * r[1] + c[1] * r[0];
          });
          g = next;
        }
        for (const a of lcs) {
          const h = g.map((c) => [c[0] * Number(a), c[1] * Number(a)]);
          if (h.some((c) => Math.abs(c[1]) > 1e-6 * Math.max(1, Math.abs(c[0])) + 1e-6 ||
              Math.abs(c[0] - Math.round(c[0])) > 1e-6 * Math.max(1, Math.abs(c[0])) + 1e-6)) continue;
          const hz = h.map((c) => BigInt(Math.round(c[0])));
          if (udivExact(f, hz)) return true;
        }
        return false;
      }
      for (let i = from; i < roots.length; i++) if (pick(k, i + 1, chosen.concat([roots[i]]))) return true;
      return false;
    };
    for (let k = 1; k <= n / 2; k++) if (pick(k, 0, [])) return false;
    return true;
  }
  // Is the (multivariate) polynomial p, with integer coefficients and content 1, irreducible?
  // Other variables get random integer values: a factorisation survives that (a factor free
  // of the main variable shows as a common factor), and an irreducible polynomial nearly
  // always stays irreducible (Hilbert).  One irreducible specialisation decides.
  function irreducible(p) {
    const vs = pvars(p);
    if (!vs.length) return false;
    const v = vs.reduce((a, b) => (degIn(p, b) > degIn(p, a) ? b : a));
    const cs = coeffsIn(p, v), others = vs.filter((w) => w !== v);
    let seed = 12345;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return BigInt(2 + (seed % 37)) * (seed % 2 ? 1n : -1n); };
    for (let trial = 0; trial < (others.length ? 10 : 1); trial++) {
      const at = Object.fromEntries(others.map((w) => [w, rnd()]));
      const f = cs.map((c) => {
        let s = 0n;
        for (const [k, r] of c) {
          let t = r[0];
          for (const [w, e] of Object.entries(parseKey(k))) t *= at[w] ** BigInt(e);
          s += t;
        }
        return s;
      });
      if (f[f.length - 1] === 0n) continue;           // the degree dropped
      const g = f.reduce((a, b) => bgcd(a, b), 0n);
      if (g !== 1n) continue;
      if (uirreducible(f)) return true;
    }
    return false;
  }
  // gcd(p, q) of two polynomials: null when they share a polynomial factor, else the
  // common factor of their (rational) coefficients as [n, d] – [1n, 1n] when coprime.
  function polyGcd(p, q) {
    // Maxima: the rational contents' gcd, gcd(a/b, c/d) = gcd(a, c)/lcm(b, d) – so
    // gcd(x/10+1, 1) is 1/10
    const rcontent = (a) => [...a.values()].reduce((g, c) => [bgcd(g[0], c[0]), (g[1] * c[1]) / bgcd(g[1], c[1])], [0n, 1n]);
    const cp = rcontent(p), cq = rcontent(q);
    const cg = R(bgcd(cp[0], cq[0]), (cp[1] * cq[1]) / bgcd(cp[1], cq[1]));
    const scaleInt = (a) => {
      const l = [...a.values()].reduce((m, c) => (m * c[1]) / bgcd(m, c[1]), 1n);
      return pmul(a, pconst(R(l)));
    };
    p = scaleInt(p); q = scaleInt(q);
    if (!p.size || !q.size) return null;
    const vs = [...new Set([...pvars(p), ...pvars(q)])];
    let seed = 777;
    const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return BigInt(2 + (seed % 37)) * (seed % 2 ? 1n : -1n); };
    for (const v of vs) {
      if (degIn(p, v) <= 0 || degIn(q, v) <= 0) continue;
      const others = vs.filter((w) => w !== v);
      let shared = true;
      for (let trial = 0; trial < (others.length ? 8 : 1) && shared; trial++) {
        const at = Object.fromEntries(others.map((w) => [w, rnd()]));
        const spec = (a) => coeffsIn(a, v).map((c) => {
          let t0 = 0n;
          for (const [k, r] of c) { let t = r[0]; for (const [w, e] of Object.entries(parseKey(k))) t *= at[w] ** BigInt(e); t0 += t; }
          return t0;
        });
        const f = utrim(spec(p)), g = utrim(spec(q));
        if (udeg(f) !== degIn(p, v) || udeg(g) !== degIn(q, v)) continue;
        if (ugcdDeg(f, g) === 0) shared = false;
      }
      if (shared) return null;
    }
    return cg;
  }
  // What Maxima's simplifier does to a product or quotient (a PRT with simplification on
  // sees the student's answer simplified): numbers multiply out and equal factors combine,
  // so 2*y/(4*y^2) is 1/(2*y); sums stay as they are ((2*y+2)/4).
  function cancelForm(n) {
    let c = [1n, 1n];
    const fs = new Map();
    const add = (base, e) => {
      const key = keyOf(nounForm(base));
      const f = fs.get(key) || { base, e: 0 };
      f.e += e;
      fs.set(key, f);
    };
    const walk = (t, e) => {
      t = unparen(t);
      if (t.k === "neg") { c = rmul(c, [-1n, 1n]); return walk(t.arg, e); }
      if (t.k === "num" && !t.isFloat && /^\d+$/.test(t.value)) {
        const v = BigInt(t.value) ** BigInt(Math.abs(e));
        c = rmul(c, e >= 0 ? [v, 1n] : [1n, v]);
        return;
      }
      if (t.k === "op" && t.op === "*") { walk(t.args[0], e); walk(t.args[1], e); return; }
      if (t.k === "op" && t.op === "/") { walk(t.args[0], e); walk(t.args[1], -e); return; }
      if (t.k === "op" && t.op === "^") {
        let k = unparen(t.args[1]), sign = 1;
        if (k.k === "neg") { sign = -1; k = unparen(k.arg); }
        if (k.k === "num" && !k.isFloat && /^\d+$/.test(k.value)) return walk(t.args[0], e * sign * Number(k.value));
      }
      add(t, e);
    };
    // +0 / -0 terms go (Maxima drops them)
    for (;;) {
      const t = unparen(n), zero = (x) => { x = unparen(x); return x.k === "num" && Number(x.value) === 0; };
      if (t.k === "op" && (t.op === "+" || t.op === "-") && zero(t.args[1])) n = t.args[0];
      else if (t.k === "op" && t.op === "+" && zero(t.args[0])) n = t.args[1];
      else break;
    }
    if (isSumNode(unparen(n))) return n;
    walk(n, 1);
    const num = (v) => ({ k: "num", value: String(v), isFloat: false });
    const pow = (f, e) => (e === 1 ? f.base : { k: "op", op: "^", args: [{ k: "paren", arg: f.base }, num(e)] });
    const prod = (xs) => xs.reduce((a, b) => ({ k: "op", op: "*", args: [a, b] }));
    const top = [], bottom = [];
    if (c[0] < 0n ? -c[0] !== 1n : c[0] !== 1n) top.push(num(c[0] < 0n ? -c[0] : c[0]));
    if (c[1] !== 1n) bottom.push(num(c[1]));
    for (const f of fs.values()) {
      if (f.e > 0) top.push({ k: "paren", arg: pow(f, f.e) });
      if (f.e < 0) bottom.push({ k: "paren", arg: pow(f, -f.e) });
    }
    let out = top.length ? prod(top) : num(1);
    if (bottom.length) out = { k: "op", op: "/", args: [out, { k: "paren", arg: prod(bottom) }] };
    return c[0] < 0n ? { k: "neg", arg: out } : out;
  }
  global.StackForms = { poly, polyGcd, cancelForm };

  // a sum Maxima's factor() leaves as it is (up to sign): integer coefficients, no common
  // factor, irreducible
  function factoredSum(p) {
    return !!p && intCoeffs(p) && content(p) === 1n && irreducible(p);
  }

  const isPrime = (n) => { if (n < 2n) return false; for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false; return true; };
  const negStrip = (n) => { n = unparen(n); while (n.k === "neg") n = unparen(n.arg); return n; };
  const flatProduct = (n) => { n = unparen(n); return n.k === "op" && n.op === "*" ? n.args.flatMap(flatProduct) : [n]; };
  const isSumNode = (n) => n.k === "op" && (n.op === "+" || n.op === "-");
  const isAtomNode = (n) => n.k === "id" || (n.k === "num");

  // factorp of assessment.mac
  function factorp(n) {
    n = negStrip(n);
    if (n.k === "num") {
      if (n.isFloat || !/^\d+$/.test(n.value)) return true;
      const v = BigInt(n.value);
      return v <= 1n || isPrime(v);
    }
    if (n.k === "id" || n.k === "call") return true;
    if (n.k !== "op") return false;
    if (isSumNode(n)) {
      // Maxima simplifies first: (x+1)*(x-2)+0 is a product
      const zero = (t) => { t = negStrip(t); return t.k === "num" && Number(t.value) === 0; };
      if (zero(n.args[1])) return factorp(n.args[0]);
      if (zero(n.args[0]) && n.op === "+") return factorp(n.args[1]);
      return factoredSum(poly(n));
    }
    if (n.op === "^") { const b = negStrip(n.args[0]); return isAtomNode(b) || factorp(b); }
    if (n.op === "*") return flatProduct(n).every(factorp);
    // a factored numerator over a whole number is what factor() gives: -((y-2*x)*(y+2*x))/4
    if (n.op === "/") { const d = negStrip(n.args[1]); return factorp(n.args[0]) && (d.k === "num" || factorp(d)); }
    return false;
  }

  // coeff(p, v) as Maxima's bothcoef takes it from an unexpanded sum: the terms that are
  // v or (something free of v)*v; (x-9)*y+x-9 has coefficient 1 in x
  function syntacticCoeff(n, v) {
    const terms = [];
    const walk = (t, sign) => {
      t = unparen(t);
      if (t.k === "neg") return walk(t.arg, -sign);
      if (t.k === "op" && t.op === "+") { walk(t.args[0], sign); walk(t.args[1], sign); return; }
      if (t.k === "op" && t.op === "-" && t.args.length === 2) { walk(t.args[0], sign); walk(t.args[1], -sign); return; }
      terms.push([t, sign]);
    };
    walk(n, 1);
    let c = new Map();
    for (const [t, sign] of terms) {
      const fs = flatProduct(t).map(unparen);
      const at = fs.filter((f) => f.k === "id" && f.name === v);
      const rest = fs.filter((f) => !(f.k === "id" && f.name === v));
      if (at.length !== 1 || rest.some((f) => astVars(f).has(v))) continue;
      let k = pconst([BigInt(sign), 1n]);
      for (const f of rest) { const pf = poly(f); if (!pf) return null; k = pmul(k, pf); }
      c = padd(c, k);
    }
    return c;
  }

  // irred_Q(p, v) of stackmaxima.mac
  function irredQ(n, v) {
    const p = poly(n);
    if (!p) return false;
    // polynomial in v with coefficients free of v (a kernel holding v is not)
    if ([...p.keys()].some((k) => Object.keys(parseKey(k)).some((w) => w.startsWith("§") && w.includes(`"name":"${v}"`)))) return false;
    const deg = degIn(p, v), cs = coeffsIn(p, v);
    const cl = cs.filter((c) => c.size);
    const ci = cl.every((c) => isConstPoly(c) && constOf(c)[1] === 1n);
    let ret = factorp(n);
    if (deg <= 0) ret = true;
    const isOne = (c) => isConstPoly(c) && constOf(c)[0] === 1n && constOf(c)[1] === 1n;
    if (deg === 1) {
      const c1 = syntacticCoeff(n, v);
      if (c1 && (isOne(c1) || isOne(padd(p, pmul(c1, new Map([[v, [1n, 1n]]])), -1n)))) ret = true;
    }
    if (deg === 2) {
      const [c, b, a] = cs;
      const ratSqrt = (r) => {
        if (r[0] < 0n) return false;
        const sq = (x) => { const s = BigInt(Math.round(Math.sqrt(Number(x)))); for (const t of [s - 1n, s, s + 1n]) if (t >= 0n && t * t === x) return true; return false; };
        return sq(r[0]) && sq(r[1]);
      };
      if (!b.size && !c.size && isConstPoly(a) && (constOf(a)[0] > constOf(a)[1]) && ratSqrt(constOf(a))) ret = true;
      else if (!b.size && !c.size) ret = true;
      else if ([a, b, c].every(isConstPoly)) {
        const [A, B, C] = [constOf(a), constOf(b), constOf(c)];
        if (ratSqrt(radd(rmul(B, B), rmul([-4n, 1n], rmul(A, C))))) ret = false;
      }
    }
    if (cl.length > 1 && ci && cl.reduce((g, c) => bgcd(g, constOf(c)[0]), 0n) > 1n) ret = false;
    if (deg > 2) {
      let q = p;
      if (cl.length > 1 && ci) { const g = cl.reduce((g2, c) => bgcd(g2, constOf(c)[0]), 0n); q = pmul(p, pconst(R(1n, g))); }
      if (!factoredSum(q)) ret = false;
    }
    return ret;
  }

  // FacForm_UnPick: every factor, one level down, is an atom or (a power of) a sum that
  // irred_Q accepts
  function unpick(n, v) {
    n = negStrip(n);
    if (isAtomNode(n)) return true;
    if (isSumNode(n)) return irredQ(n, v);
    if (n.k === "op" && n.op === "^") return irredQ(n.args[0], v);
    if (n.k !== "op" || (n.op !== "*" && n.op !== "/")) return false;
    const parts = n.op === "*" ? flatProduct(n) : n.args;
    return parts.every((part) => {
      const s = negStrip(part);
      if (isAtomNode(s)) return true;
      if (isSumNode(s)) return irredQ(s, v);
      if (s.k === "op" && s.op === "^") return irredQ(s.args[0], v);
      return false;
    });
  }

  const FORM_FEEDBACK = {
    he: {
      isfactored: "התשובה שלכם מפורקת לגורמים, כל הכבוד. ",
      notfactored: "התשובה שלכם אינה מפורקת לגורמים. ",
      notalgequiv: "שימו לב: התשובה שלכם אינה שקולה אלגברית לתשובה הנכונה. כנראה נפלה טעות בדרך. ",
      sf_part: "התשובה צריכה להיות שבר יחיד מהצורה \\( \\frac{a}{b} \\). ",
      sf_div: "בתשובה שלכם יש שברים בתוך שברים. צריך לפשט אותם ולכתוב את התשובה כשבר יחיד. ",
      sf_ret: "התשובה שלכם אינה שקולה אלגברית לתשובה הנכונה. כנראה נפלה טעות בדרך. ",
      cs_notae: "התשובה שלכם נראית בצורה הנכונה, אבל אינה שקולה לתשובה הנכונה. ",
      cs_novar: (v) => `התשובה שלכם צריכה להיות תלויה במשתנה \\(${v}\\), אבל היא לא תלויה בו! `,
      lt_wrong: "צריך לצמצם את השברים בתשובה. ",
    },
    en: {
      isfactored: "Your answer is factored, well done. ",
      notfactored: "Your answer is not factored. ",
      notalgequiv: "Note that your answer is not algebraically equivalent to the correct answer.  You must have done something wrong. ",
      sf_part: "Your answer needs to be a single fraction of the form \\( {a}\\over{b} \\). ",
      sf_div: "Your answer contains fractions within fractions.  You need to clear these and write your answer as a single fraction.",
      sf_ret: "Your answer is not algebraically equivalent to the correct answer. You must have done something wrong. ",
      cs_notae: "Your answer appears to be in the correct form, but is not equivalent to the correct answer.",
      cs_novar: (v) => `Your answer should depend on the variable \\(${v}\\) but it does not! `,
      lt_wrong: "You need to cancel fractions within your answer. ",
    },
  };
  const formMsg = (q) => FORM_FEEDBACK[/[֐-׿]/.test((q && q.questiontext) || "") ? "he" : "en"];
  // the variable of the test options, as a name
  // the variable of the test options, as a name: the evaluated option (often a question
  // variable, v:rand([x,y,z]))
  const optVar = (opt) => {
    const o = opt ? unparen(P.toAst(opt)) : null;
    return o && o.k === "id" ? o.name : "x";
  };
  const astVars = (n, out = new Set()) => {
    if (!n || typeof n !== "object") return out;
    if (n.k === "id" && !n.name.startsWith("%")) out.add(n.name);
    for (const k in n) { const c = n[k]; if (Array.isArray(c)) c.forEach((x) => astVars(x, out)); else if (c && c.k) astVars(c, out); }
    return out;
  };

  function facFormTest(a, b, opt, node, sc, q) {
    const msg = formMsg(q), sa = rawForm(node.sans, sc), v = optVar(opt);
    const ae = algEquiv(a, b, node, sc);
    const s = unparen(sa);
    if (s.k === "num" && !s.isFloat && /^\d+$/.test(s.value)) return { result: ae, feedback: "" };
    const fp = factorp(sa);
    if (ae && fp) return { result: true, feedback: "" };
    let fb = "", ok = true;
    if (fp) fb += msg.isfactored;
    else if (!unpick(sa, v)) { ok = false; fb += msg.notfactored; }
    if (!ae) { ok = false; fb += msg.notalgequiv; }
    return { result: ok, feedback: fb };
  }

  function singleFracTest(a, b, opt, node, sc, q) {
    const msg = formMsg(q), ae = algEquiv(a, b, node, sc);
    let s = unparen(rawForm(node.sans, sc));
    if (isAtomNode(s)) return { result: ae, feedback: ae ? "" : msg.sf_ret };
    if (s.k === "neg") s = unparen(s.arg);
    const helper = (n) => {
      n = unparen(n);
      if (isAtomNode(n)) return false;
      if (n.k === "op" && n.op === "/") return true;
      if (n.k === "neg") return helper(n.arg);
      if (n.k === "op" && ["+", "-", "*"].includes(n.op)) return n.args.some(helper);
      return false;
    };
    let ok, fb;
    if (s.k === "op" && s.op === "/") {
      ok = !(helper(s.args[0]) || helper(s.args[1]));
      fb = ok ? "" : msg.sf_div;
    } else { ok = false; fb = msg.sf_part; }
    if (!ae) { ok = false; fb += msg.sf_ret; }
    return { result: ok, feedback: fb };
  }

  function compSquareTest(a, b, opt, node, sc, q) {
    const msg = formMsg(q), v = optVar(opt);
    let sa = unparen(rawForm(node.sans, sc));
    const tb = P.toAst(b), tbVars = astVars(tb);
    if (tbVars.has(v) && !astVars(sa).has(v)) return { result: false, feedback: msg.cs_novar(v) };
    const ae = algEquiv(a, b, node, sc);
    if (ae && !tbVars.has(v)) return { result: true, feedback: "" };
    const pb = poly(tb);
    if (ae && pb && degIn(pb, v) === 1) return { result: true, feedback: "" };
    if (sa.k === "neg") sa = unparen(sa.arg);
    const has = (n) => astVars(n).has(v);
    const square = (n) => { n = unparen(n); return n.k === "op" && n.op === "^" && unparen(n.args[1]).k === "num" && unparen(n.args[1]).value === "2"; };
    const kSquare = (n) => {
      n = unparen(n);
      if (square(n)) return true;
      if (n.k === "op" && n.op === "*") { const w = flatProduct(n).filter(has); return w.length === 1 && square(w[0]); }
      return false;
    };
    let cform = false;
    if (square(sa)) cform = true;
    else if (sa.k === "op" && sa.op === "*") cform = kSquare(sa);
    else if (sa.k === "op" && sa.op === "/") cform = !has(sa.args[1]) && square(sa.args[0]);
    else if (isSumNode(sa)) {
      const terms = [];
      const walk = (n) => { n = unparen(n); if (isSumNode(n)) { walk(n.args[0]); walk(n.args[1]); } else terms.push(n); };
      walk(sa);
      const w = terms.filter(has);
      if (w.length === 1) {
        let t = unparen(w[0]);
        if (t.k === "neg") t = unparen(t.arg);
        cform = kSquare(t);
      }
    }
    if (cform && ae) return { result: true, feedback: "" };
    if (cform) return { result: false, feedback: msg.cs_notae };
    return { result: false, feedback: "" };
  }

  function lowestTermsTest(a, b, opt, node, sc, q) {
    const sa = rawForm(node.sans, sc);
    let ok = true, irrational = false;
    const isNumber = (n) => { n = unparen(n); if (n.k === "neg") n = unparen(n.arg); return n.k === "num"; };
    const intOf = (n) => { n = unparen(n); let s = 1n; if (n.k === "neg") { s = -1n; n = unparen(n.arg); } return n.isFloat ? null : s * BigInt(n.value); };
    const negative = (n) => unparen(n).k === "neg";
    const walk = (n) => {
      n = unparen(n);
      if (!n || typeof n !== "object") return;
      if (n.k === "op" && n.op === "/") {
        if (isNumber(n.args[0]) && isNumber(n.args[1])) {
          const x = intOf(n.args[0]), y = intOf(n.args[1]);
          if ((negative(n.args[0]) && negative(n.args[1])) || (x !== null && y !== null && bgcd(x, y) !== 1n)) ok = false;
          return;
        }
        const den = JSON.stringify(n.args[1]);
        if (/"name":"(sqrt|%i)"|"op":"\^","args":\[[^\]]*\{"k":"op","op":"\/"/.test(den)) irrational = true;
      }
      for (const k in n) { const c = n[k]; if (Array.isArray(c)) c.forEach(walk); else if (c && c.k) walk(c); }
    };
    walk(sa);
    return { result: ok && !irrational, feedback: ok ? "" : formMsg(q).lt_wrong };
  }

  // ---- FacForm, SingleFrac and CompSquare as STACK runs them, quirks included (checked
  // against ATFacForm etc. in Maxima on 35,000 answers, tools/maxima/at_oracle.py).  They
  // replace the versions above for these three tests; LowestTerms, gcd and lowesttermsp
  // stay as above.  Kept in its own scope: its polynomial helpers have the same names.
  const STACK_FORMS = (() => {
    // ---- Form tests: FacForm, SingleFrac, CompSquare (stackmaxima.mac; the same in STACK 4.4
    // and 4.10).  They look at the answer as typed (simp:false), so the typed AST is turned
    // into Maxima's tree first: + and * n-ary (a-b = a+(-b), not through brackets), -x unary.
    function mx(n) {
      const chain = (op, x, out) => {
        if (x.k === "op" && x.op === op) { for (const a of x.args) chain(op, a, out); }
        else if (op === "+" && x.k === "op" && x.op === "-" && x.args.length === 2) {
          chain("+", x.args[0], out);
          out.push({ k: "op", op: "-", args: [mx(x.args[1])] });
        } else out.push(mx(x));
        return out;
      };
      switch (n.k) {
        case "paren": return mx(n.arg);
        case "num": return n.isFloat ? { k: "float", text: String(n.value) } : { k: "int", v: BigInt(n.value) };
        case "id": return { k: "sym", name: n.name };
        case "str": return { k: "str", v: n.value };
        case "neg": {
          // Maxima's unary minus binds tighter than * and /: -2*x = (-2)*x, -x*y = (-x)*y.
          if (n.arg.k === "op" && (n.arg.op === "*" || n.arg.op === "/")) {
            const [first, ...rest] = n.arg.args;
            return mx({ ...n.arg, args: [{ k: "neg", arg: first }, ...rest] });
          }
          return { k: "op", op: "-", args: [mx(n.arg)] };
        }
        case "op":
          if (n.op === "+" || (n.op === "-" && n.args.length === 2)) return { k: "op", op: "+", args: chain("+", n, []) };
          if (n.op === "*") return { k: "op", op: "*", args: chain("*", n, []) };
          return { k: "op", op: n.op, args: n.args.map(mx) };
        case "call": return { k: "op", op: n.name, call: true, args: n.args.map(mx) };
        case "list": return { k: "list", args: n.items.map(mx) };
        case "set": return { k: "set", args: n.items.map(mx) };
        default: return { k: "other" };
      }
    }
    const mxAtom = (t) => t.k === "int" || t.k === "float" || t.k === "sym" || t.k === "str";
    const mxIsOp = (t, op, n) => t.k === "op" && t.op === op && !t.call && (n === undefined || t.args.length === n);
    const stripMinus = (t) => (mxIsOp(t, "-", 1) ? t.args[0] : t);
    // Maxima's flatten(): nested applications of the same n-ary operator merged.
    function mxFlatten(t) {
      if (t.k !== "op") return t;
      const args = t.args.map(mxFlatten);
      if ((t.op === "+" || t.op === "*") && !t.call) {
        return { ...t, args: args.flatMap((a) => (mxIsOp(a, t.op) ? a.args : [a])) };
      }
      return { ...t, args };
    }
    function mxSyms(t, out = new Set()) {
      if (t.k === "sym") out.add(t.name);
      else if (t.args) t.args.forEach((a) => mxSyms(a, out));
      return out;
    }
    function mxToAst(t) {
      switch (t.k) {
        case "int": return t.v < 0n ? { k: "neg", arg: { k: "num", value: String(-t.v), isFloat: false } } : { k: "num", value: String(t.v), isFloat: false };
        case "float": return { k: "num", value: t.text, isFloat: true };
        case "sym": return { k: "id", name: t.name };
        case "str": return { k: "str", value: t.v };
        case "list": return { k: "list", items: t.args.map(mxToAst) };
        case "set": return { k: "set", items: t.args.map(mxToAst) };
        case "op": {
          const par = (a) => (a.k === "op" ? { k: "paren", arg: mxToAst(a) } : mxToAst(a));
          if (t.call) return { k: "call", name: t.op, args: t.args.map(mxToAst) };
          if (t.op === "-" && t.args.length === 1) return { k: "neg", arg: par(t.args[0]) };
          return t.args.slice(1).reduce((acc, a) => ({ k: "op", op: t.op, args: [acc, par(a)] }), par(t.args[0]));
        }
        default: return { k: "id", name: "?" };
      }
    }

    // Exact rationals (BigInt) and sparse polynomials: Map monomial -> rational, a monomial
    // being "name^e" parts joined by \u0001 (sorted), "" for the constant term.
    const babs = (a) => (a < 0n ? -a : a);
    const bgcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
    const R = (n, d = 1n) => {
      if (d < 0n) { n = -n; d = -d; }
      const g = bgcd(n, d);
      return g > 1n ? { n: n / g, d: d / g } : { n, d };
    };
    const radd = (a, b) => R(a.n * b.d + b.n * a.d, a.d * b.d);
    const rmul = (a, b) => R(a.n * b.n, a.d * b.d);
    const rdec = (text) => {          // a float as typed, exactly ("2.5" -> 5/2)
      const m = /^(\d*)\.?(\d*)(?:[eE]([-+]?\d+))?$/.exec(text);
      if (!m) return null;
      let r = R(BigInt((m[1] || "0") + (m[2] || "")), 10n ** BigInt((m[2] || "").length));
      const e = +(m[3] || 0);
      return e >= 0 ? rmul(r, R(10n ** BigInt(e))) : rmul(r, R(1n, 10n ** BigInt(-e)));
    };
    const monoParts = (k) => (k ? k.split("\u0001").map((p) => { const i = p.lastIndexOf("\u0002"); return [p.slice(0, i), +p.slice(i + 1)]; }) : []);
    const monoKey = (parts) => parts.filter(([, e]) => e).sort((x, y) => (x[0] < y[0] ? -1 : 1)).map(([n, e]) => `${n}\u0002${e}`).join("\u0001");
    function monoMul(a, b) {
      const m = new Map(monoParts(a));
      for (const [n, e] of monoParts(b)) m.set(n, (m.get(n) || 0) + e);
      return monoKey([...m]);
    }
    const pconst = (r) => (r.n === 0n ? new Map() : new Map([["", r]]));
    const pvar = (name) => new Map([[monoKey([[name, 1]]), R(1n)]]);
    function padd(a, b) {
      const out = new Map(a);
      for (const [k, c] of b) {
        const s = out.has(k) ? radd(out.get(k), c) : c;
        if (s.n === 0n) out.delete(k); else out.set(k, s);
      }
      return out;
    }
    const pscale = (a, r) => (r.n === 0n ? new Map() : new Map([...a].map(([k, c]) => [k, rmul(c, r)])));
    function pmul(a, b) {
      let out = new Map();
      for (const [k1, c1] of a) for (const [k2, c2] of b) out = padd(out, new Map([[monoMul(k1, k2), rmul(c1, c2)]]));
      return out;
    }
    function ppow(a, k) { let out = pconst(R(1n)); for (let i = 0; i < k; i++) out = pmul(out, a); return out; }
    const pIsConst = (a) => a.size === 0 || (a.size === 1 && a.has(""));
    const pConstVal = (a) => a.get("") || R(0n);
    const pVars = (a) => [...new Set([...a.keys()].flatMap((k) => monoParts(k).map(([n]) => n)))].sort();
    const pDeg = (a, v) => Math.max(0, ...[...a.keys()].map((k) => (monoParts(k).find(([n]) => n === v) || [0, 0])[1]));
    const pTotalDeg = (a) => Math.max(0, ...[...a.keys()].map((k) => monoParts(k).reduce((s, [, e]) => s + e, 0)));
    function pCoeffs(a, v) {          // exponent of v -> coefficient polynomial in the others
      const out = new Map();
      for (const [k, c] of a) {
        const parts = monoParts(k), e = (parts.find(([n]) => n === v) || [0, 0])[1];
        const rest = monoKey(parts.filter(([n]) => n !== v));
        out.set(e, padd(out.get(e) || new Map(), new Map([[rest, c]])));
      }
      return out;
    }
    function pSubst(a, v, r) {        // v := the rational r
      let out = new Map();
      for (const [k, c] of a) {
        const parts = monoParts(k), e = (parts.find(([n]) => n === v) || [0, 0])[1];
        const f = R(r.n ** BigInt(e), r.d ** BigInt(e));
        out = padd(out, new Map([[monoKey(parts.filter(([n]) => n !== v)), rmul(c, f)]]));
      }
      return out;
    }
    const pEq = (a, b) => padd(a, pscale(b, R(-1n))).size === 0;
    // gcd of the coefficients when all are integers, else null
    function pIntContent(a) {
      let g = 0n;
      for (const c of a.values()) { if (c.d !== 1n) return null; g = bgcd(g, c.n); }
      return g;
    }
    // Maxima's main variable is the greatest in its ordering: later names, kernels last.
    const varGreater = (x, y) => { const kx = x[0] === "\u00a7", ky = y[0] === "\u00a7"; return kx !== ky ? kx : x > y; };
    function pLeadSign(a) {
      if (pIsConst(a)) { const c = pConstVal(a).n; return c > 0n ? 1 : c < 0n ? -1 : 0; }
      const v = pVars(a).reduce((m, x) => (varGreater(x, m) ? x : m));
      const cs = pCoeffs(a, v);
      return pLeadSign(cs.get(Math.max(...cs.keys())));
    }

    // The typed tree as a polynomial, or null.  Subtrees that are not polynomial become
    // "kernels" (new variables, like Maxima's rat): function calls, and other powers and
    // quotients when they do not contain `free` (a variable the result must be polynomial
    // in) -- with free = null only function calls and numeric powers (sqrt(2)) do.
    function toPoly(t, free) {
      const kernel = () => pvar("\u00a7" + JSON.stringify(t, (k, x) => (typeof x === "bigint" ? String(x) : x)));
      const freeOk = () => (free ? !mxSyms(t).has(free) : mxSyms(t).size === 0);
      switch (t.k) {
        case "int": return pconst(R(t.v));
        case "float": { const r = rdec(t.text); return r ? pconst(r) : null; }
        case "sym": return pvar(t.name);
        case "op": {
          if (t.call) return free && mxSyms(t).has(free) ? null : kernel();
          const ps = t.args.map((a) => toPoly(a, free));
          if (t.op === "+") return ps.every(Boolean) ? ps.reduce(padd) : null;
          if (t.op === "-" && ps.length === 1) return ps[0] && pscale(ps[0], R(-1n));
          if (t.op === "*") return ps.every(Boolean) ? ps.reduce(pmul) : null;
          if (t.op === "/") {
            if (ps[0] && ps[1] && pIsConst(ps[1]) && pConstVal(ps[1]).n !== 0n) {
              const c = pConstVal(ps[1]);
              return pscale(ps[0], R(c.d, c.n));
            }
            return freeOk() ? kernel() : null;
          }
          if (t.op === "^") {
            const e = ps[1] && pIsConst(ps[1]) ? pConstVal(ps[1]) : null;
            if (ps[0] && e && e.d === 1n && e.n >= 0n && e.n <= 64n) return ppow(ps[0], Number(e.n));
            if (ps[0] && e && e.d === 1n && e.n < 0n && pIsConst(ps[0]) && pConstVal(ps[0]).n !== 0n) {
              const c = pConstVal(ps[0]);
              return pconst(R(c.d ** -e.n, c.n ** -e.n));
            }
            return freeOk() ? kernel() : null;
          }
          return null;
        }
        default: return null;
      }
    }

    // Irreducibility over Q.  One variable: square-free (gcd with the derivative), then the
    // complex roots (Aberth) grouped into candidate factors d*prod(x - r), d | leading
    // coefficient, each confirmed by exact division.  Several variables: images under
    // substitutions of the other variables (fixed pseudo-random integers); an image with
    // the full degree, content 1 and irreducible proves the polynomial irreducible.
    function uniRem(a, b) {           // remainder of rational coefficient lists (low -> high)
      a = a.slice();
      const lb = b[b.length - 1];
      while (a.length >= b.length && a.length) {
        const q = rmul(a[a.length - 1], R(lb.d, lb.n)), sh = a.length - b.length;
        for (let i = 0; i < b.length; i++) a[i + sh] = radd(a[i + sh], rmul(q, R(-b[i].n, b[i].d)));
        a.pop();
        while (a.length && a[a.length - 1].n === 0n) a.pop();
      }
      return a;
    }
    function uniSquarefree(c) {       // c: BigInt coefficients, low -> high
      let a = c.map((x) => R(x)), b = c.slice(1).map((x, i) => R(x * BigInt(i + 1)));
      while (b.length) { const r = uniRem(a, b); a = b; b = r; }
      return a.length <= 1;
    }
    function aberth(c) {              // complex roots of a polynomial with Number coefficients
      const n = c.length - 1, lc = c[n];
      const a = c.map((x) => x / lc);
      const R0 = 1 + Math.max(...a.slice(0, n).map(Math.abs));
      let z = [...Array(n).keys()].map((k) => [R0 * Math.cos(2 * Math.PI * k / n + 0.4), R0 * Math.sin(2 * Math.PI * k / n + 0.4)]);
      const cm = (x, y) => [x[0] * y[0] - x[1] * y[1], x[0] * y[1] + x[1] * y[0]];
      const cd = (x, y) => { const d = y[0] * y[0] + y[1] * y[1]; return [(x[0] * y[0] + x[1] * y[1]) / d, (x[1] * y[0] - x[0] * y[1]) / d]; };
      for (let it = 0; it < 500; it++) {
        let moved = 0;
        z = z.map((zi, i) => {
          let p = [1, 0], dp = [0, 0];
          for (let k = n - 1; k >= 0; k--) { dp = [dp[0] * zi[0] - dp[1] * zi[1] + p[0], dp[0] * zi[1] + dp[1] * zi[0] + p[1]]; p = cm(p, zi); p[0] += a[k]; }
          if (p[0] === 0 && p[1] === 0) return zi;
          const ratio = cd(p, dp);
          let s = [0, 0];
          z.forEach((zj, j) => { if (j !== i) { const d = cd([1, 0], [zi[0] - zj[0], zi[1] - zj[1]]); s = [s[0] + d[0], s[1] + d[1]]; } });
          const w = cd(ratio, [1 - (ratio[0] * s[0] - ratio[1] * s[1]), -(ratio[0] * s[1] + ratio[1] * s[0])]);
          moved = Math.max(moved, Math.hypot(w[0], w[1]) / (1 + Math.hypot(zi[0], zi[1])));
          return [zi[0] - w[0], zi[1] - w[1]];
        });
        if (moved < 1e-15) break;
      }
      return z;
    }
    function divisors(n) {
      n = babs(n);
      const out = [];
      for (let d = 1n; d * d <= n && d < 2000000n; d++) if (n % d === 0n) { out.push(d); if (d * d !== n) out.push(n / d); }
      return out;
    }
    function uniIrreducible(c) {      // BigInt coefficients, low -> high, degree >= 1
      const n = c.length - 1;
      if (n === 1) return true;
      if (c[0] === 0n) return false;
      if (!uniSquarefree(c)) return false;
      if (n > 14) { warn("FacForm: polynomial of degree", n, "assumed irreducible"); return true; }
      const roots = aberth(c.map(Number));
      const lcs = divisors(c[n]);
      const divides = (g) => {        // exact: does g (BigInt, low -> high) divide c over Z?
        const a = c.slice(), m = g.length - 1;
        for (let i = n; i >= m; i--) {
          if (a[i] % g[m] !== 0n) return false;
          const q = a[i] / g[m];
          for (let j = 0; j <= m; j++) a[i - m + j] -= q * g[j];
        }
        return a.every((x) => x === 0n);
      };
      const pick = (k, start, chosen) => {
        if (chosen.length === k) {
          let p = [[1, 0]];              // prod (x - r), low -> high, complex
          for (const r of chosen) {
            const q = [[0, 0], ...p];
            for (let i = 0; i < p.length; i++) q[i] = [q[i][0] - (p[i][0] * r[0] - p[i][1] * r[1]), q[i][1] - (p[i][0] * r[1] + p[i][1] * r[0])];
            p = q;
          }
          if (p.some(([re, im]) => Math.abs(im) > 1e-6 * (1 + Math.abs(re)))) return false;
          for (const d of lcs) {
            const g = p.map(([re]) => Number(d) * re);
            if (g.some((x) => Math.abs(x - Math.round(x)) > 1e-6 * (1 + Math.abs(x)))) continue;
            if (divides(g.map((x) => BigInt(Math.round(x))))) return true;
          }
          return false;
        }
        for (let i = start; i < roots.length; i++) if (pick(k, i + 1, [...chosen, roots[i]])) return true;
        return false;
      };
      for (let k = 1; k <= n / 2; k++) if (pick(k, 0, [])) return false;
      return true;
    }
    function pIrreducible(a) {
      const vars = pVars(a);
      if (!vars.length) return false;
      if (a.size === 1) return pTotalDeg(a) === 1;
      const keys = [...a.keys()];
      if (vars.some((v) => keys.every((k) => monoParts(k).some(([n]) => n === v)))) return false;   // a monomial factor
      const toInts = (p) => {          // rational polynomial -> integer coefficient list in v
        const cs = [...p];
        const l = cs.reduce((m, [, c]) => m / bgcd(m, c.d) * c.d, 1n);
        return cs.map(([k, c]) => [k, c.n * (l / c.d)]);
      };
      if (vars.length === 1) {
        const v = vars[0], out = Array(pDeg(a, v) + 1).fill(0n);
        for (const [k, c] of toInts(a)) out[(monoParts(k)[0] || [0, 0])[1]] += c;
        return uniIrreducible(out);
      }
      let seed = 0;
      for (const k of keys) for (let i = 0; i < k.length; i++) seed = (seed * 31 + k.charCodeAt(i)) >>> 0;
      const rnd = () => { seed = (seed * 1103515245 + 12345) >>> 0; return 11 + (seed >>> 8) % 390; };
      const ints = toInts(a);
      for (const v of vars) {
        const deg = pDeg(a, v);
        if (!deg) continue;
        for (let trial = 0; trial < 4; trial++) {
          const val = Object.fromEntries(vars.filter((x) => x !== v).map((x) => [x, BigInt(rnd())]));
          const img = Array(deg + 1).fill(0n);
          for (const [k, c] of ints) {
            let e = 0, t = c;
            for (const [n, p] of monoParts(k)) { if (n === v) e = p; else t *= val[n] ** BigInt(p); }
            img[e] += t;
          }
          if (img[deg] === 0n || img.reduce(bgcd, 0n) !== 1n) continue;
          if (uniIrreducible(img)) return true;
        }
      }
      return false;
    }

    const isPrime = (n) => {
      n = babs(n);
      if (n < 2n) return false;
      for (let d = 2n; d * d <= n; d++) if (n % d === 0n) return false;
      return true;
    };
    const unitOrPrime = (n) => babs(n) === 1n || isPrime(n);
    // A number as factor() leaves it: 0, 1, a prime (or a quotient of such).
    const numFactored = (r) => (r.n === 0n || unitOrPrime(r.n)) && (r.d === 1n || isPrime(r.d));
    // A sum as factor() returns it: integer coefficients without a common factor, leading
    // coefficient positive, irreducible.
    const ownFactor = (p) => !pIsConst(p) && pIntContent(p) === 1n && pLeadSign(p) > 0 && pIrreducible(p);
    // A sum typed out as Maxima keeps it: no term holds a sum (1+x*(x+1) is not).
    const flatSum = (t) => t.args.every(function plain(a) {
      a = stripMinus(a);
      if (mxAtom(a)) return true;
      const q = toPoly(a, null);            // simp folds numbers: t*(1+0) is t
      if (q && pIsConst(q)) return true;
      if (mxIsOp(a, "*") || mxIsOp(a, "/")) return a.args.every(plain);
      if (mxIsOp(a, "^")) return mxAtom(a.args[0]) || (a.args[0].k === "op" && a.args[0].call);
      return a.k === "op" && a.call;
    });

    // ev(t = factor(t), simp): t, simplified, is literally factor's result.  The product is
    // taken apart: one rational coefficient (factor keeps 6 in 6*(x+2)), and atoms, calls
    // and sums (each as factor returns it), with whole powers.
    function equalsFactor(t) {
      let coef = R(1n), ok = true;
      const bases = [];               // [poly or null, key, exponent]
      const add = (b, e) => {
        const p = b.k === "op" && mxIsOp(b, "+") ? toPoly(b, null) : null;
        const key = p ? null : JSON.stringify(b, (k, x) => (typeof x === "bigint" ? String(x) : x));
        const old = bases.find((x) => (p ? x[0] && pEq(x[0], p) : x[1] === key));
        if (old) old[2] += e; else bases.push([p, key, e, b]);
      };
      const walk = (u, e) => {
        if (!ok) return;
        if (u.k === "int") { coef = rmul(coef, e >= 0 ? R(u.v ** BigInt(e)) : R(1n, u.v ** BigInt(-e))); if (u.v === 0n && e < 0) ok = false; return; }
        if (u.k === "float" || u.k === "str") { ok = false; return; }
        if (mxIsOp(u, "-", 1)) { if (e % 2) coef = rmul(coef, R(-1n)); walk(u.args[0], e); return; }
        if (mxIsOp(u, "*")) { u.args.forEach((a) => walk(a, e)); return; }
        if (mxIsOp(u, "/")) { walk(u.args[0], e); walk(u.args[1], -e); return; }
        if (mxIsOp(u, "^")) {
          const ex = toPoly(u.args[1], null);
          if (ex && pIsConst(ex) && pConstVal(ex).d === 1n && pConstVal(ex).n !== 0n) {
            const k = Number(pConstVal(ex).n);
            if (toPoly(u.args[0], null) && pIsConst(toPoly(u.args[0], null))) {
              const c = pConstVal(toPoly(u.args[0], null));
              if (c.n === 0n && k * e < 0) { ok = false; return; }
              coef = rmul(coef, k * e >= 0 ? R(c.n ** BigInt(k * e), c.d ** BigInt(k * e)) : R(c.d ** BigInt(-k * e), c.n ** BigInt(-k * e)));
              return;
            }
            walk(u.args[0], e * k);
            return;
          }
          add(u, e);
          return;
        }
        if (u.k === "sym" || (u.k === "op" && u.call)) { add(u, e); return; }
        if (mxIsOp(u, "+")) {
          // simp drops zero terms (6*t*(t+3)+0*t) and folds a sum into a number or monomial
          const terms = u.args.filter((a) => { const q = toPoly(a, null); return !(q && q.size === 0); });
          if (terms.length === 1) { walk(terms[0], e); return; }
          const p = toPoly(u, null);
          if (!p) { ok = false; return; }
          const pw = (c, k) => (k >= 0 ? R(c.n ** BigInt(k), c.d ** BigInt(k)) : R(c.d ** BigInt(-k), c.n ** BigInt(-k)));
          if (pIsConst(p)) { coef = rmul(coef, pw(pConstVal(p), e)); return; }
          if (p.size === 1) {
            const [[k, c]] = [...p];
            const parts = monoParts(k);
            if (parts.some(([n]) => n[0] === "\u00a7")) { ok = false; return; }
            coef = rmul(coef, pw(c, e));
            for (const [n, x] of parts) add({ k: "sym", name: n }, x * e);
            return;
          }
          add(u, e);
          return;
        }
        ok = false;
      };
      walk(t, 1);
      if (!ok) return false;
      const left = bases.filter((b) => b[2] !== 0);
      if (!left.length) return numFactored(coef);
      return left.every(([p, , , b]) => !p || (flatSum(b) && ownFactor(p)));
    }

    // STACK's factorp (assessment.mac), on the typed tree.
    function factorp(t) {
      t = stripMinus(t);
      if (equalsFactor(t)) return true;
      if (t.k === "int") return false;
      if (mxAtom(t)) return true;
      // ev(-1*factor(t) = expand(-1*t), simp) with negdistrib:false (set by FacForm), so
      // -1*(x-1) stays -(x-1): true for a number, a monomial, and a single factor whose sign
      // factor() turned (1-x -> -(x-1)).
      const p = toPoly(t, null);
      if (p && (pIsConst(p) || p.size === 1 || (pIntContent(p) === 1n && pLeadSign(p) < 0 && pIrreducible(p)))) return true;
      if (mxIsOp(t, "^") && (mxAtom(t.args[0]) || factorp(t.args[0]))) return true;
      if (mxIsOp(t, "*")) return t.args.every(factorp);
      return false;
    }

    const FORM_FEEDBACK = {
      he: {
        isfactored: "התשובה שלכם מפורקת לגורמים, כל הכבוד. ",
        notfactored: "התשובה שלכם אינה מפורקת לגורמים. ",
        notalgequiv: "שימו לב שהתשובה שלכם אינה שקולה אלגברית לתשובה הנכונה. כנראה נפלה טעות בדרך. ",
        notpoly: "ביטוי זה אמור להיות פולינום, והוא אינו פולינום.",
        commonint: "צריך להוציא גורם משותף. ",
        optional: (m) => `אפשר לפרק עוד, כי \\(${m}\\) ניתן לפירוק נוסף. אבל זה לא הכרחי. `,
        morework: (m) => `אפשר לעבוד עוד על הביטוי \\(${m}\\). `,
        sf_part: "התשובה צריכה להיות שבר יחיד מהצורה \\( {a}\\over{b} \\). ",
        sf_div: "בתשובה שלכם יש שברים בתוך שברים. צריך לפשט אותם ולכתוב את התשובה כשבר יחיד.",
        sf_ret_exp: "התשובה שלכם אינה שקולה אלגברית לתשובה הנכונה. כנראה נפלה טעות בדרך. ",
        cs_not_algequiv: "נראה שהתשובה שלכם בצורה הנכונה, אבל היא אינה שקולה לתשובה הנכונה.",
        cs_no_summands: "השלמה לריבוע היא מהצורה \\( a(\\cdots\\cdots)^2 + b\\), כאשר \\(a\\) ו-\\(b\\) אינם תלויים במשתנה. נראה שיותר ממחובר אחד בתשובה שלכם תלוי במשתנה.",
        cs_not_depend: (m) => `התשובה שלכם צריכה להיות תלויה במשתנה \\(${m}\\), והיא לא!`,
      },
      en: {
        isfactored: "Your answer is factored, well done. ",
        notfactored: "Your answer is not factored. ",
        notalgequiv: "Note that your answer is not algebraically equivalent to the correct answer.  You must have done something wrong. ",
        notpoly: "This term is expected to be a polynomial, but is not.",
        commonint: "You need to take out a common factor. ",
        optional: (m) => `You could do more work, since \\(${m}\\) can be further factored.  However, you don't need to. `,
        morework: (m) => `You could still do some more work on the term \\(${m}\\). `,
        sf_part: "Your answer needs to be a single fraction of the form \\( {a}\\over{b} \\). ",
        sf_div: "Your answer contains fractions within fractions.  You need to clear these and write your answer as a single fraction.",
        sf_ret_exp: "Your answer is not algebraically equivalent to the correct answer. You must have done something wrong. ",
        cs_not_algequiv: "Your answer appears to be in the correct form, but is not equivalent to the correct answer.",
        cs_no_summands: "The completed square is of the form \\( a(\\cdots\\cdots)^2 + b\\) where \\(a\\) and \\(b\\) do not depend on your variable.  More than one of your summands appears to depend on the variable in your answer.",
        cs_not_depend: (m) => `Your answer should depend on the variable \\(${m}\\) but it does not!`,
      },
    };
    const formMsg = (q) => FORM_FEEDBACK[/[֐-׿]/.test((q && q.questiontext) || "") ? "he" : "en"];
    const mxLatex = (t) => M.latex(mxToAst(t));

    // The number of parts of a product or quotient once simplified, as Maxima displays it:
    // a negative coefficient makes it -(...), a denominator (or a fraction) a/b.
    function simpParts(t) {
      if (!(mxIsOp(t, "*") || mxIsOp(t, "/"))) return (t.args || []).length;
      let coef = R(1n), neg = false, ok = true;
      const bases = [];
      const add = (key, e) => { const o = bases.find((b) => b[0] === key); if (o) o[1] += e; else bases.push([key, e]); };
      const walk = (u, e) => {
        const p = toPoly(u, null);
        if (p && pIsConst(p)) {
          const c = pConstVal(p);
          if (c.n === 0n) { ok = false; return; }
          const k = BigInt(Math.abs(e));
          coef = rmul(coef, e >= 0 ? R(c.n ** k, c.d ** k) : R(c.d ** k, c.n ** k));
          return;
        }
        if (p && p.size === 1) {       // -1*t+0 is -t
          const [[k, c]] = [...p];
          const kk = BigInt(Math.abs(e));
          coef = rmul(coef, e >= 0 ? R(c.n ** kk, c.d ** kk) : R(c.d ** kk, c.n ** kk));
          for (const [n, x] of monoParts(k)) add(n, x * e);
          return;
        }
        if (mxIsOp(u, "-", 1)) { if (e % 2) neg = !neg; walk(u.args[0], e); return; }
        if (mxIsOp(u, "*")) { u.args.forEach((a) => walk(a, e)); return; }
        if (mxIsOp(u, "/")) { walk(u.args[0], e); walk(u.args[1], -e); return; }
        if (mxIsOp(u, "^")) {
          const ex = toPoly(u.args[1], null);
          if (ex && pIsConst(ex) && pConstVal(ex).d === 1n) { walk(u.args[0], e * Number(pConstVal(ex).n)); return; }
        }
        add(p ? [...p].map(([k, c]) => `${k}:${c.n}/${c.d}`).sort().join("|") : JSON.stringify(u, (k, x) => (typeof x === "bigint" ? String(x) : x)), e);
      };
      walk(t, 1);
      if (!ok) return 0;
      if (coef.n < 0n) neg = !neg;
      const left = bases.filter((b) => b[1] !== 0);
      if (neg) return 1;
      if (coef.d !== 1n || left.some((b) => b[1] < 0)) return 2;
      const n = (coef.n !== 1n ? 1 : 0) + left.length;
      return n === 1 && !(coef.n !== 1n) && left[0][1] !== 1 ? 2 : n;
    }

    // irred_Q(p, v) and FacForm_UnPick(SA, v) of stackmaxima.mac.
    function irredQ(p, v, msg) {
      const P = toPoly(p, v);
      if (!P) return { ok: false, fb: msg.notpoly };
      const cs = pCoeffs(P, v), deg = Math.max(0, ...cs.keys());
      const cl = [...cs.values()].filter((c) => c.size);
      const ci = cl.every((c) => pIsConst(c) && pConstVal(c).d === 1n);
      let ok = factorp(p), fb = "";
      const isOne = (c) => c && pIsConst(c) && pConstVal(c).n === 1n && pConstVal(c).d === 1n;
      if (deg === 0) ok = true;
      if (deg === 1) {
        // bothcoef(p, v) uses coeff, which does not expand: in (x-9)*y+x-9 the coefficient
        // of x is 1 (only the bare x), the rest (x-9)*y-9.
        let A = new Map();
        for (const term of mxIsOp(p, "+") ? p.args : [p]) {
          let t = term, sign = R(1n);
          if (mxIsOp(t, "-", 1)) { t = t.args[0]; sign = R(-1n); }
          // simp turns (t+0) into t, so a factor that simplifies to v counts as v
          const isV = (f) => { const q = toPoly(f, null); return !!q && pEq(q, pvar(v)); };
          if (isV(t)) { A = padd(A, pconst(sign)); continue; }
          if (mxIsOp(t, "*")) {
            const hits = t.args.filter(isV);
            const rest = t.args.filter((f) => !isV(f));
            if (hits.length === 1 && rest.every((f) => !mxSyms(f).has(v))) {
              const rp = rest.map((f) => toPoly(f, v));
              if (rp.every(Boolean)) A = padd(A, pscale(rp.reduce(pmul, pconst(R(1n))), sign));
            }
          }
        }
        const B = padd(P, pscale(pmul(A, pvar(v)), R(-1n)));
        if (isOne(A) || isOne(B)) ok = true;
      }
      if (deg === 2) {
        let a = cs.get(2), b = cs.get(1) || new Map(), c = cs.get(0) || new Map();
        // irred_Q's own locals a, b, c capture a variable of that name: once a (or b) holds
        // its coefficient, the next coeff(q, v, k) sees q and v with that number put in.
        if ((v === "a" || v === "b") && pIsConst(v === "a" ? a : b)) {
          const N = pConstVal(v === "a" ? a : b);
          const Q0 = pSubst(P, v, N);
          const nco = (k) => {        // Maxima's coeff(Q0, N, k) for a number N
            let out = new Map();
            for (const [key, co] of Q0) {
              const hit = co.n === N.n && co.d === N.d && (key === "" || !(N.n === 1n && N.d === 1n));
              if (k === 1 && hit) out = padd(out, new Map([[key, R(1n)]]));
              if (k === 0 && !hit) out = padd(out, new Map([[key, co]]));
            }
            return out;
          };
          if (v === "a") { b = nco(1); c = nco(0); } else c = nco(0);
        }
        const ratSquare = (r) => r.n >= 0n && [r.n, r.d].every((x) => { const s = BigInt(Math.round(Math.sqrt(Number(x)))); return [s - 1n, s, s + 1n].some((y) => y >= 0n && y * y === x); });
        if (!b.size && !c.size) {
          ok = true;
          if (pIsConst(a) && pConstVal(a).n > pConstVal(a).d && ratSquare(pConstVal(a))) fb = msg.optional(mxLatex(p));
        } else {
          const D = padd(pmul(b, b), pscale(pmul(a, c), R(-4n)));
          if (pIsConst(D) && ratSquare(pConstVal(D))) ok = false;
        }
      }
      const g = ci ? cl.reduce((m, c) => bgcd(m, pConstVal(c).n), 0n) : 1n;
      if (cl.length > 1 && ci && g > 1n) { ok = false; fb = msg.commonint; }
      if (deg > 2) {
        if (cl.length > 1 && ci) { if (!ownFactor(pscale(P, R(1n, g)))) ok = false; }
        else if (!equalsFactor(p)) ok = false;
      }
      return { ok, fb };
    }
    function unPick(sa, v, msg) {
      sa = stripMinus(sa);
      if (mxAtom(sa)) return { ok: true, fb: "" };
      if (mxIsOp(sa, "+")) return irredQ(sa, v, msg);
      if (mxIsOp(sa, "^")) return irredQ(sa.args[0], v, msg);
      let ok = true, fb = "";
      // STACK loops "while ev(part(SA, k), simp) # end": as many parts as the *simplified*
      // answer shows (-2*(8+4*x)*(x+1) is -(...): one part, so only -2 is looked at).
      for (const part of (sa.args || []).slice(0, simpParts(sa))) {
        const sb = stripMinus(part);
        const r = mxAtom(sb) ? { ok: true, fb: "" } : mxIsOp(sb, "+") ? irredQ(sb, v, msg)
          : mxIsOp(sb, "^") ? irredQ(sb.args[0], v, msg) : { ok: false, fb: "" };
        if (!r.ok) { ok = false; fb += msg.morework(mxLatex(part)) + r.fb; }
      }
      return { ok, fb };
    }
    const isExprValue = (v) => !(v && (v.t === "list" || v.t === "set" || v.t === "matrix"));
    const optName = (opt) => (opt && P.isExpr(opt) && opt.ast.k === "id" ? opt.ast.name : null);

    function facFormTest(a, b, opt, node, sc, q) {
      const msg = formMsg(q);
      if (!isExprValue(a)) return false;
      const v = optName(opt) || "x";
      const sa = mxFlatten(mx(rawForm(node.sans, sc)));
      const aequiv = algEquiv(a, b, node, sc);
      if (sa.k === "int") return !P.symbolic(b) && M.isScalar(b) && M.toNum(b) === Number(sa.v);
      if (aequiv && factorp(sa)) return { result: true, feedback: "" };
      let ok = true, fb = "";
      if (factorp(sa)) fb = msg.isfactored;
      else {
        const up = unPick(sa, v, msg);
        if (!up.ok) { ok = false; fb = msg.notfactored + up.fb; }
      }
      if (!aequiv) { ok = false; fb += msg.notalgequiv; }
      return { result: ok, feedback: fb };
    }

    function singleFracTest(a, b, opt, node, sc, q) {
      const msg = formMsg(q);
      if (!isExprValue(a)) return false;
      const sa = mx(rawForm(node.sans, sc));
      const aequiv = algEquiv(a, b, node, sc);
      if (mxAtom(sa)) return aequiv ? true : { result: false, feedback: msg.sf_ret_exp };
      const s = stripMinus(sa);
      const helper = (ex) => !mxAtom(ex) && (mxIsOp(ex, "/") || ((mxIsOp(ex, "+") || mxIsOp(ex, "*") || mxIsOp(ex, "-")) && ex.args.some(helper)));
      let ok = false, fb = "";
      if (mxIsOp(s, "/")) {
        ok = true;
        if (helper(s.args[0]) || helper(s.args[1])) { ok = false; fb = msg.sf_div; }
      } else fb = msg.sf_part;
      if (!aequiv) { ok = false; fb += msg.sf_ret_exp; }
      return { result: ok, feedback: fb };
    }

    function compSquareTest(a, b, opt, node, sc, q) {
      const msg = formMsg(q);
      if (!isExprValue(a)) return false;
      const wrt = optName(opt) || "x";
      let sa = mx(rawForm(node.sans, sc));
      const sbVars = new Set(P.isExpr(b) ? M.freeVariables(P.toAst(b), {}) : []);
      const dep = (t) => mxSyms(t).has(wrt);
      if (sbVars.has(wrt) && !dep(sa)) return { result: false, feedback: msg.cs_not_depend(wrt) };
      const ae = algEquiv(a, b, node, sc);
      const sbPoly = P.isExpr(b) ? toPoly(mx(P.toAst(b)), null) : null;
      if (ae && !sbVars.has(wrt)) return true;
      if (ae && sbPoly && pDeg(sbPoly, wrt) === 1) return true;
      if (mxIsOp(sa, "-", 1)) sa = sa.args[0];
      const sq = (t) => mxIsOp(t, "^", 2) && t.args[1].k === "int" && t.args[1].v === 2n;
      const prodSq = (t) => { const d = t.args.filter(dep); return d.length === 1 && sq(d[0]); };
      let cform = false, note = "";
      if (sq(sa)) cform = true;
      if (mxIsOp(sa, "*") && prodSq(sa)) cform = true;
      if (mxIsOp(sa, "/") && !dep(sa.args[1]) && sq(sa.args[0])) cform = true;
      if (mxIsOp(sa, "+")) {
        const d = sa.args.filter(dep);
        if (d.length > 1) note = "no_summands";
        else if (d.length === 1 && !mxAtom(d[0])) {
          const t = stripMinus(d[0]);
          if (sq(t)) cform = true;
          if (mxIsOp(t, "*") && prodSq(t)) cform = true;
        }
      }
      if (cform && ae) return true;
      if (cform) return { result: false, feedback: msg.cs_not_algequiv };
      if (!ae) return false;
      return { result: false, feedback: note ? msg.cs_no_summands : "" };
    }
    return { facFormTest, singleFracTest, compSquareTest };
  })();

  const ANSWER_TESTS = {
    FacForm: STACK_FORMS.facFormTest,
    SingleFrac: STACK_FORMS.singleFracTest,
    CompSquare: STACK_FORMS.compSquareTest,
    LowestTerms: lowestTermsTest,
    Int: intTest,
    SysEquiv: (a, b) => sysEquiv(a, b),
    Expanded: (a, b, opt, node, sc) => {
      if (a.t === "list" || a.t === "set" || a.t === "matrix") return false;
      return isExpanded(rawForm(node.sans, sc));
    },
    AlgEquiv: (a, b, opt, node, sc) => algEquiv(a, b, node, sc),
    EqualComAss: (a, b, opt, node, sc) => equalComAss(a, b, node, sc),
    CasEqual: (a, b, opt, node, sc) => algEquiv(a, b, node, sc),
    // STACK's SubstEquiv: AlgEquiv after renaming the student's variables (subst_equiv
    // tries the permutations), e.g. y*(y+3)=10 for x*(x+3)=10 (85846).
    SubstEquiv: (a, b, opt, node, sc) => {
      if (algEquiv(a, b, node, sc)) return true;
      const va = P.freeVars(a), vb = P.freeVars(b);
      if (va.length !== vb.length || !va.length || va.length > 5) return false;
      const perms = (xs) => (xs.length <= 1 ? [xs] : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((r) => [x, ...r])));
      return perms(vb).some((p) => {
        const map = new Map(va.map((n, i) => [n, { t: "expr", ast: { k: "id", name: p[i] } }]));
        return algEquiv(P.rename(a, map), b, node, sc);
      });
    },
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
    // The student's number rounded to n places equals the teacher's, and was written with
    // exactly n decimal places (read from what was typed when sans is an input).
    NumDecPlaces: (a, b, opt, node, sc) => {
      const n = opt ? Number(M.toNum(atPoint([opt])[0])) : NaN;
      if (!Number.isInteger(n) || n < 0) return false;
      const raw = typedNumber(node.sans, sc);
      if (raw !== null && (raw.split(".")[1] || "").length !== n) return false;
      const [x, y] = atPoint([a, b]).map(M.toNum);
      const r = (v) => Math.round(v * 10 ** n);
      return r(x) === r(y);
    },
    GT: (a, b) => { const [x, y] = atPoint([a, b]); return M.toNum(x) > M.toNum(y); },
    GTE: (a, b) => { const [x, y] = atPoint([a, b]); return M.toNum(x) >= M.toNum(y); },
  };

  // The number as the student typed it ("3.140"), when sans is just an input name.
  function typedNumber(sans, sc) {
    const name = String(sans).trim();
    let ast = sc && sc.inputs && sc.inputs[name];
    if (!ast) return null;
    if (ast.k === "neg") ast = ast.arg;
    return ast.k === "num" ? String(ast.value) : null;
  }

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
        try { q._functions[f.name] = { params: f.params, body: teacher(f.body), array: !!f.array }; }
        catch (e) { /* not parsable by the player: calls to it stay unsupported */ }
      }
    }
    return q._functions;
  }

  function newScope(q, v, inputAsts, prt) {
    return P.scope({ vars: v.vars, inputs: inputAsts, functions: questionFunctions(q),
                     simplify: !prt || prt.autosimplify !== false });
  }

  function runPrt(q, v, prt, inputAsts) {
    const sc = newScope(q, v, inputAsts, prt);
    // A feedback variable that fails (an index past the end of an empty list, say) stays
    // unset and the rest still run: the tree may not need it on this path.
    if (prt.feedbackvariables) {
      for (const st of teacher(prt.feedbackvariables, true)) {
        try { P.value(st, sc); } catch (e) { warn(`${q.id} ${prt.name} feedback variables:`, e.message); }
      }
    }
    let score = 0, penalty = null;
    const notes = [], feedback = [];
    let node = prt.nodes.find((n) => n.name === prt.firstnode);
    for (let guard = 0; node && guard < 100; guard++) {
      const test = ANSWER_TESTS[node.answertest];
      let result = false, testFeedback = "";
      // SAns/TAns that Maxima computed at build time (int(p,v)+c): that value, not the text.
      const expr = (k) => (v.pre && v.pre[`${prt.name}.${node.name}.${k}`]) || node[k];
      if (!test) warn("answer test not implemented:", node.answertest);
      else {
        try {
          const a = P.value(teacher(expr("sans")), sc), b = P.value(teacher(expr("tans")), sc);
          const opt = node.testoptions ? P.value(teacher(expr("testoptions")), sc) : null;
          result = test(a, b, opt, node, sc, q);
          // A test may also give its own feedback (STACK's answer-test feedback, e.g. Int's
          // "add a constant of integration"); shown unless the node is quiet.
          if (result && typeof result === "object") {
            if (!node.quiet || node.quiet === "0") testFeedback = result.feedback || "";
            result = result.result;
          }
        } catch (e) {
          warn(`${q.id} ${prt.name} node ${node.name}:`, e.message);
          result = false;
        }
      }
      const br = result ? node.on_true : node.on_false;
      // A score may be a CAS expression (a feedback variable, say): computed in the PRT's scope.
      let s = br.score ?? 0;
      if (typeof s === "string") {
        try { s = M.toNum(P.value(teacher(s), sc)); } catch (e) { warn(`${q.id} ${prt.name} node ${node.name} score:`, e.message); s = 0; }
      }
      if (br.scoremode === "+") score += s;
      else if (br.scoremode === "-") score -= s;
      else score = s;
      if (br.penalty !== undefined && br.penalty !== null) penalty = br.penalty;
      notes.push(br.answernote);
      if (testFeedback) feedback.push(testFeedback);
      if (br.feedback) feedback.push(fillRuntime(br.feedback, sc));
      node = br.nextnode === -1 || br.nextnode === undefined ? null : prt.nodes.find((n) => n.name === br.nextnode);
    }
    // 0.35 + 0.4 + 0.25 is 1, not 0.9999999999999999; and like Moodle, a fraction above
    // 0.999999 counts as fully right (3 × 0.3333333 in a question with three nodes).
    score = Math.max(0, Math.min(1, Math.round(score * 1e7) / 1e7));
    if (score > 0.999999) score = 1;
    // STACK: the question's penalty applies unless a node set its own; none when fully right.
    if (penalty === null) penalty = score >= 1 ? 0 : q.penalty;
    return { score, penalty, notes, feedback };
  }

  // {@expr@} / {#expr#} in node feedback that depend on the student's answer or on
  // feedback variables (the build leaves them in the text): computed here, in the
  // PRT's own scope.  Inside \( \) the LaTeX is inserted as is, elsewhere wrapped.
  function fillRuntime(html, sc) {
    // [[if test="..."]] on feedback variables: decided here; tests the build computed
    // ({{CT:i}}) are left for the variant (resolveIf, after the variant's values are in).
    html = html.replace(IF_TEST_RE, (whole, tag, q, expr) => {
      if (/^\s*\{\{CT:\d+\}\}\s*$/.test(expr)) return whole;
      let ok = false;
      try {
        const v = P.value(teacher(`is(${expr})`), sc);
        ok = v.t === "bool" && v.v === true;
      } catch (e) {
        warn("[[if]] test", expr, e.message);
      }
      return `[[${tag} test="${ok}"]]`;
    });
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

  const IF_TEST_RE = /\[\[\s*(if|elif)\s+test\s*=\s*(["'])([\s\S]*?)\2\s*\]\]/g;

  // STACK's [[if test="..."]] A [[elif test="..."]] B [[else]] C [[/if]] (nested blocks
  // too), once every test reads "true" or "false": only the branch that holds is kept.
  function resolveIf(html) {
    if (!html || !/\[\[\s*if\b/.test(html)) return html;
    const TOKEN = /\[\[\s*(?:(if|elif)\s+test\s*=\s*(["'])([\s\S]*?)\2|(else)|(\/\s*if))\s*\]\]/g;
    // A stack of open blocks; each keeps whether a branch was already taken, and
    // whether the current branch is shown.
    const stack = [];
    let out = "", last = 0, m;
    const shown = () => stack.every((b) => b.on);
    while ((m = TOKEN.exec(html))) {
      if (shown()) out += html.slice(last, m.index);
      last = TOKEN.lastIndex;
      const [, tag, , test, els, end] = m;
      const holds = () => String(test).trim() === "true";
      if (tag === "if") {
        const on = holds();
        stack.push({ on, taken: on });
      } else if (!stack.length) {
        continue;                            // a stray [[elif]]/[[else]]/[[/if]]: dropped
      } else if (tag === "elif") {
        const b = stack[stack.length - 1];
        b.on = !b.taken && holds();
        b.taken = b.taken || b.on;
      } else if (els) {
        const b = stack[stack.length - 1];
        b.on = !b.taken;
        b.taken = true;
      } else if (end) {
        stack.pop();
      }
    }
    if (shown()) out += html.slice(last);
    return out;
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

  global.StackEngine = { ANSWER_TESTS, runPrt, prtInputs, resolveIf };
})(typeof window !== "undefined" ? window : globalThis);
