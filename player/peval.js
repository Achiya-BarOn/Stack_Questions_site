/*
 * Partial evaluation of Maxima code, the way STACK runs feedback variables and PRT
 * expressions: statements are executed in order and every value is computed as far as
 * possible.  A value is either concrete (number, list, set, string, boolean, ...) or,
 * when it depends on free variables (x, or symbols in the student's answer), a residual
 * expression {t: "expr", ast}.  Residual expressions are later compared numerically at
 * random points (Maxima.algEquiv), so we need no real CAS – only Maxima's structural
 * functions (listofvars, delete, setify, if, for, ev, subst, ...) on top.
 *
 *   const run = Peval.scope({vars, inputs, functions});   // question vars, student answers
 *   Peval.exec(statementsAst, run);                       // feedback variables
 *   Peval.value(ast, run)                                  // -> concrete value or {t:"expr"}
 *   Peval.toAst(value)                                     // -> AST for Maxima.algEquiv
 */
(function (global) {
  "use strict";

  const M = global.Maxima;
  const E = M.MaximaError;
  const Q = M.Q, F = M.F;

  const isExpr = (v) => v && v.t === "expr";
  // return(x): unwinds to the nearest block or loop around it, also across function calls.
  class ReturnSignal { constructor(value) { this.value = value; } }
  const TRUE = { t: "bool", v: true }, FALSE = { t: "bool", v: false };
  const bool = (b) => (b ? TRUE : FALSE);
  const sym = (name) => ({ t: "expr", ast: { k: "id", name } });

  // ------------------------------------------------------------------ values <-> AST

  function toAst(v) {
    switch (v.t) {
      case "expr": return v.ast;
      case "q": {
        const n = { k: "num", value: (v.n < 0n ? -v.n : v.n).toString(), isFloat: false };
        const body = v.d === 1n ? n : { k: "op", op: "/", args: [n, { k: "num", value: v.d.toString(), isFloat: false }] };
        return v.n < 0n ? { k: "neg", arg: body } : body;
      }
      case "f": {
        const n = { k: "num", value: String(Math.abs(v.v)), isFloat: true };
        if (!isFinite(v.v)) throw new E("domain", "Not finite");
        return v.v < 0 ? { k: "neg", arg: n } : n;
      }
      case "c": {             // re + im*%i (3-2*%i, %i, -%i)
        const I = { k: "id", name: "%i" };
        const neg = (v.im.t === "q" && v.im.n < 0n) || (v.im.t === "f" && v.im.v < 0);
        const mag = neg ? M.arith("*", Q(-1n), v.im) : v.im;
        const im = mag.t === "q" && mag.n === 1n && mag.d === 1n ? I : { k: "op", op: "*", args: [toAst(mag), I] };
        if (v.re.t === "q" && v.re.n === 0n) return neg ? { k: "neg", arg: im } : im;
        return { k: "op", op: neg ? "-" : "+", args: [toAst(v.re), im] };
      }
      case "bool": return { k: "id", name: v.v ? "true" : "false" };
      case "str": return { k: "str", value: v.v };
      case "list": return { k: "list", items: v.items.map(toAst) };
      case "set": return { k: "set", items: v.items.map(toAst) };
      case "matrix": return { k: "call", name: "matrix", args: v.rows.map((r) => ({ k: "list", items: r.map(toAst) })) };
    }
    throw new E("type", "Cannot represent value");
  }

  // Same value: concrete values numerically, residual expressions structurally.
  function same(a, b) {
    if (isExpr(a) || isExpr(b)) {
      if (!isExpr(a) || !isExpr(b)) return false;
      return JSON.stringify(a.ast) === JSON.stringify(b.ast);
    }
    if ((a.t === "list" || a.t === "set") && a.t === b.t) {
      return a.items.length === b.items.length && a.items.every((x, i) => same(x, b.items[i]));
    }
    if (a.t !== b.t && !(M.isNumber(a) && M.isNumber(b))) return false;
    return M.valuesEqual(a, b, 1e-12);
  }

  // Does a value contain residual (symbolic) parts?
  const symbolic = (v) => isExpr(v) || ((v.t === "list" || v.t === "set") && v.items.some(symbolic)) ||
    (v.t === "matrix" && v.rows.some((r) => r.some(symbolic)));

  // ------------------------------------------------------------------ scopes

  /*
   * vars: {name: "maxima text"} (question variables of the variant, parsed lazily),
   * inputs: {name: AST} (student answers), functions: {name: {params, body AST}}.
   */
  function scope(opts) {
    const s = { locals: [new Map()], vars: opts.vars || {}, inputs: opts.inputs || {},
      functions: Object.assign({}, opts.functions || {}), cache: new Map(),
      work: { n: 0 },      // loop steps so far (shared by inner scopes): a bound on the work
      simplify: opts.simplify !== false };   // the PRT's simplification (for rawOf)
    return s;
  }

  function lookup(name, s) {
    for (let i = s.locals.length - 1; i >= 0; i--) if (s.locals[i].has(name)) return s.locals[i].get(name);
    if (s.inputs[name]) return value(s.inputs[name], { ...s, locals: [new Map()] });
    if (s.cache.has(name)) return s.cache.get(name);
    if (s.vars[name] !== undefined) {
      let v;
      try { v = value(M.parse(String(s.vars[name]), { teacher: true }), { ...s, locals: [new Map()] }); }
      catch (e) { v = sym(name); }
      s.cache.set(name, v);
      return v;
    }
    if (name in M.CONSTANTS) return M.CONSTANTS[name];
    return undefined;
  }

  // As in Maxima: into the innermost block that declares the name (block([hit:false], ...)),
  // otherwise a global -- also from inside a block or function (3295625: cfound:adjoin(i, cfound)).
  function assign(name, v, s) {
    for (let i = s.locals.length - 1; i > 0; i--) if (s.locals[i].has(name)) return void s.locals[i].set(name, v);
    s.locals[0].set(name, v);
  }

  // ------------------------------------------------------------------ evaluation

  // Rebuild a node from already evaluated children, folding when everything is concrete.
  function rebuild(ast, parts, fold) {
    if (parts.every((p) => !symbolic(p))) {
      try { return fold(parts); } catch (e) { if (e.code === "unbound" || e.code === "unknown") { /* keep residual */ } else throw e; }
    }
    return { t: "expr", ast: ast(parts.map(toAst)) };
  }

  // Simplifications after which Maxima's expression shows its real dependence.
  const CANONICAL = new Set(["ratsimp", "fullratsimp", "radcan", "trigsimp", "trigrat", "factor", "rat", "logcontract"]);

  // Does the expression change with v?  At random points, with the other variables fixed.
  function dependsOn(ast, v, vars) {
    let tested = 0;
    for (let attempt = 0; attempt < 40 && tested < 6; attempt++) {
      const point = {};
      for (const w of vars) point[w] = M.F(-2.7 + 5.8 * M.random());
      const other = Object.assign({}, point, { [v]: M.F(-2.7 + 5.8 * M.random()) });
      let a, b;
      try { a = M.evaluate(ast, { point }); b = M.evaluate(ast, { point: other }); } catch (err) { continue; }
      if (!M.isNumber(a) || !M.isNumber(b)) return true;
      const x = M.toNum(a), y = M.toNum(b);
      if (!isFinite(x) || !isFinite(y)) continue;
      if (Math.abs(x - y) > 1e-9 * Math.max(Math.abs(x), Math.abs(y))) return true;     // relative: e^(-e^x) is tiny but not constant
      tested++;
    }
    return tested < 3;       // too few points to tell: keep it, as before
  }

  const PREBOUND = { e: "%e", pi: "%pi", Pi: "%pi", PI: "%pi" };

  function value(ast, s) {
    const V = (a) => value(a, s);
    switch (ast.k) {
      case "num": return M.evaluate(ast, {});
      case "str": return { t: "str", v: ast.value };
      case "paren": return V(ast.arg);
      case "id": {
        const v = lookup(ast.name, s);
        // STACK binds e and pi before the question variables (e: %e, pi: %pi); a question
        // that assigns them has its own value in the variant.
        if (v === undefined && PREBOUND[ast.name]) return sym(PREBOUND[ast.name]);
        return v === undefined ? sym(ast.name) : v;
      }
      case "neg": return rebuild(([a]) => ({ k: "neg", arg: a }), [V(ast.arg)], ([a]) => M.arith("*", Q(-1n), a));
      case "not": return rebuild(([a]) => ({ k: "not", arg: a }), [V(ast.arg)], ([a]) => bool(!truth(a)));
      case "list": return listOf(ast.items.map(V), "list");
      case "set": return listOf(ast.items.map(V), "set");
      case "seq": { let r = FALSE; for (const a of ast.items) r = V(a); return r; }
      case "index": {
        // rowMinor[1] with rowMinor[i] := ... in the question variables
        if (ast.target.k === "id" && s.functions[ast.target.name] && s.functions[ast.target.name].array &&
            lookup(ast.target.name, s) === undefined) {
          return applyUser(s.functions[ast.target.name], ast.indices.map(V), s);
        }
        const target = V(ast.target), idx = ast.indices.map(V);
        if (isExpr(target) || idx.some(isExpr)) {
          return { t: "expr", ast: { k: "index", target: toAst(target), indices: idx.map(toAst) } };
        }
        let v = target;
        for (const i of idx) {
          const n = Number(M.toNum(i));
          const arr = v.t === "list" || v.t === "set" ? v.items : v.t === "matrix" ? v.rows.map((r) => ({ t: "list", items: r })) : null;
          if (!arr || n < 1 || n > arr.length) throw new E("index", "Bad index");
          v = arr[n - 1];
        }
        return v;
      }
      case "if": {
        let c = V(ast.cond);
        if (isExpr(c)) c = decide(c);      // if is(p=0) then ... with p a polynomial in x
        if (!isExpr(c)) return truth(c) ? V(ast.then) : V(ast.else);
        return { t: "expr", ast: { k: "if", cond: toAst(c), then: toAst(V(ast.then)), else: toAst(V(ast.else)) } };
      }
      case "for": return runFor(ast, s);
      case "op": return op(ast, s);
      case "call": return call(ast, s);
    }
    throw new E("type", "Cannot evaluate " + ast.k);
  }

  // A symbolic condition, decided at random points when it has the same value at all of
  // them (is(p=0) for a p that is 0 for every x).  Signs of free variables stay unknown,
  // as in Maxima (is(x<0) throws "unknown" at a point), and so does a mixed result.
  function decide(c) {
    // is(a = b), is(equal(a, b)): the two sides compared as AlgEquiv does, at points of
    // ordinary size (unit_step(t-3)*f against 2*unit_step(t-3)*f is 0 = 0 at every t < 3,
    // and a test at t in [-3.3, 3.3] passed it now and then, 3067307).
    const strip = (a) => (a.k === "paren" ? strip(a.arg) : a.k === "call" && a.name === "is" && a.args.length === 1 ? strip(a.args[0]) : a);
    const top = strip(c.ast);
    const sides = top.k === "op" && (top.op === "=" || top.op === "#") ? top.args
      : top.k === "call" && (top.name === "equal" || top.name === "notequal") && top.args.length === 2 ? top.args : null;
    // ...when they can be computed: length(a) of a symbol stays unknown, as below (288416)
    const computable = () => {
      for (let k = 0; k < 8; k++) {
        const point = {};
        for (const v of freeVars(c)) point[v] = M.F(0.37 + 2.9 * M.random() * (k % 2 ? -1 : 1));
        try { M.evaluate(c.ast, { point }); return true; } catch (e) { if (e.code !== "domain") return false; }
      }
      return false;
    };
    if (sides && sides.every((x) => !hasBool(x)) && computable()) {
      try {
        const same = M.algEquiv(sides[0], sides[1], { get: () => undefined });
        return bool((top.op === "#" || top.name === "notequal") ? !same : same);
      } catch (e) { /* the points below */ }
    }
    const vars = freeVars(c);
    let seen = null, n = 0;
    // a point outside the domain (sqrt(sin(2*theta)) at theta<0, 3326527) is skipped
    // 12 points, not 8: log(e^(45x+81)+1) = 45x+81 to 1e-9 for x > -1.4 (1791463), so a
    // wrong answer is caught only by the negative points (one in three).
    for (let k = 0; k < 60 && n < 12; k++) {
      const point = {};
      for (const v of vars) point[v] = M.F(0.37 + 2.9 * M.random() * (k % 2 ? -1 : 1));
      let r;
      try { r = M.evaluate(c.ast, { point }); } catch (e) { if (e.code === "domain") continue; return c; }
      if (r.t !== "bool") return c;
      if (seen !== null && seen !== r.v) {
        // is(a = b) / is(a # b) are syntactic in Maxima: not equal at every point means not
        // the same expression (e^(log(abs(y))/3-3*y^2) # 0 although it is ~1e-13 at y=3, 2707417)
        if (top.k === "op" && (top.op === "=" || top.op === "#")) return bool(top.op === "#");
        return c;
      }
      seen = r.v;
      n++;
    }
    return n >= 5 ? bool(seen) : c;
  }

  // A relation or logic inside (is((x>1) = true)): such sides are left to the points.
  const hasBool = (a) => !!a && typeof a === "object" && ((a.k === "op" && ["<", ">", "<=", ">=", "=", "#", "and", "or"].includes(a.op))
    || a.k === "not" || Object.values(a).some((x) => (Array.isArray(x) ? x.some(hasBool) : x && x.k && hasBool(x))));

  // Lists keep symbolic items as values, so length/delete/indexing still work on [x, 3].
  function listOf(items, kind) {
    return kind === "set" ? makeSet(items) : { t: "list", items };
  }

  function makeSet(list) {
    if (!list.some(symbolic)) return M.makeSet(list);
    const out = [];
    for (const x of list) if (!out.some((y) => same(x, y))) out.push(x);
    return { t: "set", items: out.sort(M.compareValues) };
  }

  function truth(v) {
    if (v.t === "bool") return v.v;
    throw new E("type", "Not a boolean");
  }

  function op(ast, s) {
    const [a, b] = ast.args;
    if (ast.op === ":") {
      if (a.k === "id") { const v = value(b, s); assign(a.name, v, s); return v; }
      if (a.k === "index" && a.target.k === "id") {   // l[i]: v, m[i,j]: v (a changed copy)
        const v = value(b, s);
        const idx = a.indices.map((i) => Number(M.toNum(value(i, s))));
        const set = (x, [i, ...more]) => {
          if (x.t === "list") {
            if (i < 1 || i > x.items.length) throw new E("index", "Bad index");
            const items = x.items.slice();
            items[i - 1] = more.length ? set(items[i - 1], more) : v;
            return { ...x, items };
          }
          if (x.t === "matrix") {
            if (i < 1 || i > x.rows.length) throw new E("index", "Bad index");
            const rows = x.rows.slice();
            const row = { t: "list", items: rows[i - 1] };
            rows[i - 1] = (more.length ? set(row, more) : v).items;
            return { t: "matrix", rows };
          }
          throw new E("type", "Indexed assignment needs a list or a matrix");
        };
        const target = lookup(a.target.name, s);
        if (!target || isExpr(target)) throw new E("type", "Indexed assignment to an unknown list");
        assign(a.target.name, set(target, idx), s);
        return v;
      }
      if (a.k === "index") throw new E("type", "Indexed assignment not supported");
    }
    if (ast.op === ":=") {
      if (a.k === "call") { s.functions[a.name] = { params: a.args.map((p) => p.name), body: b }; return { t: "str", v: a.name }; }
      if (a.k === "index" && a.target.k === "id") {      // f[i] := ...
        s.functions[a.target.name] = { params: a.indices.map((p) => p.name), body: b, array: true };
        return { t: "str", v: a.target.name };
      }
    }
    const A = value(a, s), B = value(b, s);
    const mk = ([x, y]) => ({ k: "op", op: ast.op, args: [x, y] });
    switch (ast.op) {
      case "and": case "or": {
        if (!isExpr(A) && !isExpr(B)) return bool(ast.op === "and" ? truth(A) && truth(B) : truth(A) || truth(B));
        if (!isExpr(A)) {          // short-circuit with one concrete side
          if (ast.op === "and" && !truth(A)) return FALSE;
          if (ast.op === "or" && truth(A)) return TRUE;
          return B;
        }
        if (!isExpr(B)) {
          if (ast.op === "and" && !truth(B)) return FALSE;
          if (ast.op === "or" && truth(B)) return TRUE;
          return A;
        }
        return { t: "expr", ast: mk([toAst(A), toAst(B)]) };
      }
      case "=": case "#": {
        // is(a=b) on concrete values; with free variables decided at sample points.
        // Identical structures are equal also when symbolic: listofvars(p) = [x].
        if ((symbolic(A) || symbolic(B)) && same(A, B)) return bool(ast.op === "=");
        // Lists of different lengths (or a list and a non-list) are never equal.
        if ((A.t === "list" || B.t === "list") && (A.t !== B.t || A.items.length !== B.items.length)) return bool(ast.op === "#");
        return rebuild(mk, [A, B], ([x, y]) => bool(ast.op === "=" ? same(x, y) : !same(x, y)));
      }
      case "<": case ">": case "<=": case ">=":
        return rebuild(mk, [A, B], ([x, y]) => {
          const p = M.toNum(x), q = M.toNum(y);
          return bool(ast.op === "<" ? p < q : ast.op === ">" ? p > q : ast.op === "<=" ? p <= q : p >= q);
        });
      default: {
        const fold = ([x, y]) => M.evaluate({ k: "op", op: ast.op, args: [toAst(x), toAst(y)] }, {});
        if (!"+-*/^".includes(ast.op) || !(symbolic(A) || symbolic(B))) return rebuild(mk, [A, B], fold);
        // Arithmetic on lists with symbolic items is element by element, as in Maxima
        // (listarith): 0*[1,0,0*t+4] is [0,0,0], so it can be compared with a list.
        const scalar = (v) => v.t !== "list" && v.t !== "set" && v.t !== "matrix";
        const arith = (x, y) =>
          x.t === "list" && y.t === "list" && x.items.length === y.items.length ? listOf(x.items.map((u, i) => arith(u, y.items[i])), "list")
          : x.t === "list" && scalar(y) ? listOf(x.items.map((u) => arith(u, y)), "list")
          : y.t === "list" && scalar(x) ? listOf(y.items.map((u) => arith(x, u)), "list")
          : rebuild(mk, [x, y], fold);
        return arith(A, B);
      }
    }
  }

  // ---- function calls

  function call(ast, s) {
    const name = ast.name;
    const args = ast.args;
    const V = (a) => value(a, s);
    // 'diff(y,x,1): a noun stays as it is (its arguments evaluated) until ev(..., nouns)
    if (ast.noun) return { t: "expr", ast: { k: "call", name, noun: true, args: args.map((a) => toAst(V(a))) } };
    const special = SPECIAL[name];
    if (special) return special(args, s, ast);
    if (s.functions[name]) return applyUser(s.functions[name], args.map(V), s);
    const vals = args.map(V);
    // A function value (lambda) stored in a variable.
    const fv = lookup(name, s);
    if (fv && fv.t === "lambda") return applyLambda(fv, vals, s);
    // a parameter holding a function's name: alltrue(pred, lst) := ... pred(x) ...
    if (fv && isExpr(fv) && fv.ast.k === "id" && fv.ast.name !== name) return call({ k: "call", name: fv.ast.name, args: vals.map(toAst) }, s);
    // Matrix functions that only move entries around work also when the entries are
    // symbolic (transpose of a student's matrix with m in it).
    if (MOVE_ENTRIES.has(name) && vals.some(symbolic) && !vals.some(isExpr)) {
      try { return M.callValue(name, vals); } catch (e) { /* residual below */ }
    }
    if (STRUCT[name] && vals.every((v) => !isExpr(v) || STRUCT_OK_EXPR.has(name))) {
      try { return STRUCT[name](vals, s); } catch (e) { if (!vals.some(isExpr)) throw e; }
    }
    return rebuild((parts) => ({ k: "call", name, args: parts }), vals, (parts) => M.evaluate({ k: "call", name, args: parts.map(toAst) }, {}));
  }

  function applyUser(fn, vals, s) {
    const frame = new Map();
    fn.params.forEach((p, i) => frame.set(p, vals[i] === undefined ? sym(p) : vals[i]));
    const inner = { ...s, locals: [...s.locals, frame] };
    // No catch for return() here: as in Maxima, return() in a function body that is not
    // a block leaves the caller's loop or block (checked against Maxima 5.47).
    return value(fn.body, inner);
  }

  function applyLambda(fn, vals, s) {
    return applyUser({ params: fn.params, body: fn.body }, vals, { ...s, locals: fn.locals || s.locals });
  }

  // ev(e, nouns): the nouns in e ('diff(...)) evaluated, inside lists and matrices too.
  function evalNouns(v, s) {
    if (v.t === "list" || v.t === "set") return listOf(v.items.map((x) => evalNouns(x, s)), v.t);
    if (v.t === "matrix") return { t: "matrix", rows: v.rows.map((r) => r.map((x) => evalNouns(x, s))) };
    if (!isExpr(v)) return v;
    let found = false;
    const strip = (node) => {
      if (!node || typeof node !== "object") return node;
      if (Array.isArray(node)) return node.map(strip);
      const out = {};
      for (const k in node) out[k] = k === "noun" ? undefined : strip(node[k]);
      if (node.noun) { found = true; delete out.noun; }
      return out;
    };
    const ast = strip(v.ast);
    return found ? value(ast, s) : v;
  }

  // Substitute identifiers in a residual expression: ev(e, x=a, y=b) / subst.
  function substitute(v, pairs, s) {
    // subst(matrix=set, M): an operator replaced by another -- the rows of M become the
    // elements of a set (86297).  Also list<->set.
    const HEADS = ["matrix", "list", "set"];
    const heads = pairs.filter(([n, x]) => HEADS.includes(n) && isExpr(x) && x.ast.k === "id" && HEADS.includes(x.ast.name));
    if (heads.length) {
      pairs = pairs.filter((p) => !heads.includes(p));
      for (const [from, x] of heads) v = changeHead(v, from, x.ast.name);
      if (!pairs.length) return v;
    }
    // into lists, sets and matrices with symbolic entries too (subst(x=1, matrix([x],[2*x])))
    if (v.t === "list" || v.t === "set") return listOf(v.items.map((x) => substitute(x, pairs, s)), v.t);
    if (v.t === "matrix") return { t: "matrix", rows: v.rows.map((r) => r.map((x) => substitute(x, pairs, s))) };
    if (!isExpr(v)) return v;
    const map = new Map(pairs);
    const rep = (node) => {
      if (node.k === "id" && map.has(node.name)) return toAst(map.get(node.name));
      if (node.k === "index" && map.has(indexKey(node))) return toAst(map.get(indexKey(node)));
      if (node.k === "call" && map.has(callKey(node))) return toAst(map.get(callKey(node)));
      // subst(x=0.7, diff(e, x)): the derivative at that point, not diff(e, 0.7).
      if (node.k === "call" && node.name === "diff" && node.args[1] && node.args[1].k === "id" && map.has(node.args[1].name)) {
        const name = node.args[1].name, at = map.get(name);
        if (!symbolic(at) && M.isScalar(at)) {
          const inner = new Map(map);
          inner.delete(name);
          const e = inner.size ? substituteAst(node.args[0], inner) : node.args[0];
          const d = { k: "call", name: "diff", args: [e, ...node.args.slice(1)] };
          if (M.freeVariables(d, {}).size <= 1) return toAst(M.evaluate(d, { point: { [name]: M.F(M.toNum(at)) } }));
        }
      }
      const out = Array.isArray(node) ? [] : {};
      for (const k in node) {
        const c = node[k];
        out[k] = Array.isArray(c) ? c.map((x) => (x && x.k ? rep(x) : x)) : c && c.k ? rep(c) : c;
      }
      return out;
    };
    return value(rep(v.ast), s);    // fold what became concrete
  }

  function changeHead(v, from, to) {
    const make = (items) => (to === "set" ? makeSet(items) : to === "list" ? { t: "list", items }
      : items.every((r) => r.t === "list") ? { t: "matrix", rows: items.map((r) => r.items) } : null);
    if (v.t === "matrix") {
      const rows = v.rows.map((r) => changeHead({ t: "list", items: r }, from, to));
      if (from !== "matrix") return rows.every((r) => r.t === "list") ? { t: "matrix", rows: rows.map((r) => r.items) } : v;
      return make(rows) || v;
    }
    if (v.t === "list" || v.t === "set") {
      const items = v.items.map((x) => changeHead(x, from, to));
      return v.t === from ? make(items) || v : { t: v.t, items: v.t === "set" ? makeSet(items).items : items };
    }
    return v;
  }

  // Plain substitution of identifiers in an AST (no evaluation).
  function substituteAst(ast, map) {
    const rep = (node) => {
      if (node.k === "id" && map.has(node.name)) return toAst(map.get(node.name));
      if (node.k === "index" && map.has(indexKey(node))) return toAst(map.get(indexKey(node)));
      if (node.k === "call" && map.has(callKey(node))) return toAst(map.get(callKey(node)));
      const out = {};
      for (const k in node) {
        const c = node[k];
        out[k] = Array.isArray(c) ? c.map((x) => (x && x.k ? rep(x) : x)) : c && c.k ? rep(c) : c;
      }
      return out;
    };
    return rep(ast);
  }

  // Symbol name of an argument that should be a variable (x in ev(e, x=1), diff(e, x), ...).
  function symName(ast, s) {
    if (ast.k === "call" && callKey(ast) && !(ast.name in SPECIAL) && !s.functions[ast.name] && !M.isKnownFunction(ast.name)) return callKey(ast);
    if (ast.k === "id") {
      const v = lookup(ast.name, s);
      if (v === undefined || (isExpr(v) && v.ast.k === "id")) return v ? v.ast.name : ast.name;
    }
    const v = value(ast, s);
    if (isExpr(v) && v.ast.k === "id") return v.ast.name;
    if (isExpr(v)) return indexKey(v.ast);
    return null;
  }

  // y(t) as a name for subst/ev: "y(t)" (a call of an undefined function on variables:
  // ev(ode, y(t)=ans1, nouns), 126620), else null.
  function callKey(ast) {
    if (!ast || ast.k !== "call" || !ast.args.length || !ast.args.every((a) => a.k === "id")) return null;
    return ast.name + "(" + ast.args.map((a) => a.name).join(",") + ")";
  }

  // y[1] as a name for subst/ev: "y[1]" (a symbol with whole-number indices), else null.
  function indexKey(ast) {
    if (!ast || ast.k !== "index" || ast.target.k !== "id" || !ast.indices.every((i) => i.k === "num")) return null;
    return ast.target.name + "[" + ast.indices.map((i) => i.value).join(",") + "]";
  }

  function freeVars(v) {
    if (!isExpr(v)) return [];
    const out = [];
    const seen = new Set();
    const walk = (n, fnHead) => {
      if (!n || typeof n !== "object") return;
      if (n.k === "id" && !fnHead && !(n.name in M.CONSTANTS) && !seen.has(n.name)) { seen.add(n.name); out.push(n.name); }
      for (const k in n) {
        const c = n[k];
        if (Array.isArray(c)) c.forEach((x) => walk(x, false));
        else if (c && c.k) walk(c, false);
      }
    };
    walk(v.ast, false);
    return out.sort();
  }

  const items = (v, what) => {
    if (v.t === "list" || v.t === "set") return v.items;
    // first(M), rest(M), ... on a matrix work on its rows, as in Maxima
    if (v.t === "matrix" && ["first", "second", "third", "last", "rest", "reverse", "length"].includes(what)) {
      return v.rows.map((r) => ({ t: "list", items: r }));
    }
    throw new E("type", `${what} needs a list`);
  };

  // Functions with special evaluation of their arguments.
  const unparenAst = (n) => { while (n && n.k === "paren") n = n.arg; return n; };
  // the expression as typed: an input's own AST; num/denom of one taken from its form
  function rawOf(ast, s) {
    ast = unparenAst(ast);
    if (ast.k === "id" && s.inputs[ast.name] && !s.locals.some((l) => l.has(ast.name))) {
      const raw = unparenAst(s.inputs[ast.name]);
      return s.simplify && global.StackForms ? unparenAst(global.StackForms.cancelForm(raw)) : raw;
    }
    if (ast.k === "call" && (ast.name === "num" || ast.name === "denom") && ast.args.length === 1) {
      let r = rawOf(ast.args[0], s), neg = false;
      if (r.k === "neg") { neg = true; r = unparenAst(r.arg); }
      if (r.k === "op" && r.op === "*" && global.StackForms) r = unparenAst(global.StackForms.cancelForm(r));
      if (r.k === "neg") { neg = !neg; r = unparenAst(r.arg); }
      if (r.k === "op" && r.op === "/") { const part = r.args[ast.name === "num" ? 0 : 1]; return neg && ast.name === "num" ? { k: "neg", arg: part } : unparenAst(part); }
      return ast.name === "num" ? (neg ? { k: "neg", arg: r } : r) : { k: "num", value: "1", isFloat: false };
    }
    return toAst(value(ast, s));
  }
  // gcd of two typed polynomials: [n, d] (the coefficients' common factor), or null
  function rawGcd(a, b) {
    const F = global.StackForms;
    const pa = F && F.poly(a), pb = F && F.poly(b);
    if (!pa || !pb) throw new E("unknown", "gcd of non-polynomials");
    return F.polyGcd(pa, pb);
  }
  const SPECIAL = {
    listofvars: ([e], s) => {
      const v = value(e, s);
      // of a list, set or matrix: the variables of all the entries (85896)
      const entries = v.t === "list" || v.t === "set" ? v.items : v.t === "matrix" ? v.rows.flat() : null;
      if (entries) {
        const names = [...new Set(entries.flatMap((x) => items(SPECIAL.listofvars([toAst(x)], s), "listofvars").map((y) => y.ast.name)))];
        return { t: "list", items: names.map(sym) };
      }
      let vars = freeVars(v);
      // listofvars(radcan(ans1/U)): after Maxima's simplification only the variables the
      // value depends on are left (ans1/U is 1 when ans1 = U).  Checked numerically.
      const strip = (a) => (a.k === "paren" ? strip(a.arg) : a);
      // (the simplification kept as a call in the value: CsDivC: trigsimp(...), then listofvars(CsDivC))
      const top = isExpr(v) ? strip(v.ast) : null;
      if (top && top.k === "call" && CANONICAL.has(top.name)) vars = vars.filter((x) => dependsOn(v.ast, x, vars));
      return { t: "list", items: vars.map(sym) };
    },
    // STACK's exdowncase: every variable to lower case (subst over listofvars), 85917.
    exdowncase: ([e], s) => {
      const down = (v) => {
        if (v.t === "list" || v.t === "set") return v.t === "set" ? makeSet(v.items.map(down)) : listOf(v.items.map(down), v.t);
        if (v.t === "matrix") return { t: "matrix", rows: v.rows.map((r) => r.map(down)) };
        if (!isExpr(v)) return v;
        const map = new Map(freeVars(v).filter((n) => n.toLowerCase() !== n).map((n) => [n, sym(n.toLowerCase())]));
        return map.size ? value(substituteAst(v.ast, map), s) : v;
      };
      return down(value(e, s));
    },
    ev: ([e, ...rest], s) => {
      let v = value(e, s);
      const pairs = [];
      for (const r of rest) {
        if (r.k === "op" && r.op === "=") {
          const name = symName(r.args[0], s);
          if (name) pairs.push([name, value(r.args[1], s)]);
        } else if (r.k === "id" && r.name === "numer" && !isExpr(v)) {
          // a complex number keeps its parts (86300: ev(z^5, numer, expand))
          if (v.t === "c") v = { t: "c", re: M.F(M.toNum(v.re)), im: M.F(M.toNum(v.im)) };
          else if (M.isNumber(v)) v = M.F(M.toNum(v));
        }
        // other flags (simp, expand, ...) do not change a value numerically
      }
      if (pairs.length) v = substitute(v, pairs, s);
      // nouns: 'diff(...) is now carried out (sa: ev(subst(y=ans1, ode), nouns))
      if (rest.some((r) => r.k === "id" && r.name === "nouns")) v = evalNouns(v, s);
      return v;
    },
    subst: (args, s) => {
      if (args.length === 2) {           // subst(x=a, e) or subst([x=a, y=b], e)
        let pairs;
        if (args[0].k === "list" || (args[0].k === "op" && args[0].op === "=")) {
          const eqs = args[0].k === "list" ? args[0].items : [args[0]];
          pairs = eqs.filter((q) => q.k === "op" && q.op === "=").map((q) => [symName(q.args[0], s), value(q.args[1], s)]);
        } else {
          // the equations computed: subst(makelist(yys[i]=funcs[i], i, 1, n), eqsM)
          const v = value(args[0], s);
          const eqs = v.t === "list" ? v.items : [v];
          pairs = eqs.filter((q) => isExpr(q) && q.ast.k === "op" && q.ast.op === "=")
            .map((q) => [q.ast.args[0].k === "id" ? q.ast.args[0].name : indexKey(q.ast.args[0]), value(q.ast.args[1], s)]);
        }
        return substitute(value(args[1], s), pairs.filter((p) => p[0]), s);
      }
      const name = symName(args[1], s);  // subst(a, x, e)
      return substitute(value(args[2], s), [[name, value(args[0], s)]], s);
    },
    if: (args, s) => value({ k: "if", cond: args[0], then: args[1], else: args[2] || { k: "id", name: "false" } }, s),
    lambda: ([params, body], s) => ({ t: "lambda", params: (params.items || []).map((p) => p.name), body, locals: s.locals.slice() }),
    return: ([e], s) => { throw new ReturnSignal(e ? value(e, s) : FALSE); },
    block: (args, s) => {
      const [locals, ...body] = args[0] && args[0].k === "list" ? args : [{ k: "list", items: [] }, ...args];
      const frame = new Map();
      for (const l of locals.items) {
        if (l.k === "id") frame.set(l.name, sym(l.name));
        else if (l.k === "op" && l.op === ":") frame.set(l.args[0].name, value(l.args[1], s));
      }
      const inner = { ...s, locals: [...s.locals, frame] };
      let r = FALSE;
      try {
        for (const st of body) r = value(st, inner);
      } catch (e) {
        if (e instanceof ReturnSignal) return e.value;
        throw e;
      }
      return r;
    },
    // is(x<0) with a free x stays is(...): "unknown" in Maxima, so not true at any point.
    // STACK's own answer-test functions, called directly in feedback variables:
    // ATAlgEquiv(sa, ta) -> [valid, result, answernote, feedback].
    ATAlgEquiv: ([a, b], s) => atCall("AlgEquiv", a, b, s),
    ATEqualComAss: ([a, b], s) => atCall("AlgEquiv", a, b, s),
    ATCASEqual: ([a, b], s) => atCall("CasEqual", a, b, s),
    ATSets: ([a, b], s) => atCall("Sets", a, b, s),
    // Assumptions about signs change symbolic simplification in Maxima, not values.
    assume: () => TRUE,
    forget: () => TRUE,
    declare: () => TRUE,
    // Prepares an inequality for comparison; the value is the same inequality.
    ineqprepare: ([e], s) => value(e, s),
    is: ([e], s) => {
      const v = value(e, s);
      if (!isExpr(v)) return v;
      const c = { t: "expr", ast: { k: "call", name: "is", args: [v.ast] } };
      // is(a # b), is(a = b): decided now at random points (see decide), not later at the
      // node's points where a tiny value may look like 0 (2707417)
      if (v.ast.k === "op" && (v.ast.op === "#" || v.ast.op === "=")) return decide(c);
      if (v.ast.k === "call" && (v.ast.name === "equal" || v.ast.name === "notequal") && v.ast.args.length === 2) {
        const d = decide(c);
        if (!isExpr(d)) return d;
      }
      return c;
    },
    diff: (args, s, ast) => {
      const e = value(args[0], s);
      if (args[2] && M.toNum(value(args[2], s)) === 0) return e;      // diff(f, x, 0) = f
      // diff of a list or matrix: entry by entry (139681: the direction of [2*t-2, 0, 3*t-2])
      if (e.t === "list" || e.t === "matrix") {
        const d = (x) => SPECIAL.diff([toAst(x), ...args.slice(1)], s);
        return e.t === "list" ? { t: "list", items: e.items.map(d) } : { t: "matrix", rows: e.rows.map((r) => r.map(d)) };
      }
      if (!isExpr(e)) return Q(0n);
      const name = args[1] ? symName(args[1], s) : null;
      if (name && !freeVars(e).includes(name)) return Q(0n);
      const call = { k: "call", name: "diff", args: [e.ast, ...args.slice(1).map((a) => toAst(value(a, s)))] };
      // Exact by the rules where possible (then evaluated numerically), numeric otherwise.
      const exact = M.expandDiff(call);
      return exact ? value(exact, s) : { t: "expr", ast: call };
    },
    // limit(e, x, a[, plus|minus]): numerically (Maxima.numericLimit), exact when the values
    // settle on a simple fraction; inf/minf/und as symbols.  With other free variables the
    // limit is taken at each sample point.
    limit: (args, s) => {
      const e = value(args[0], s), name = symName(args[1], s);
      const pt = value(args[2], s), dirName = args[3] ? symName(args[3], s) : null;
      if (!isExpr(e)) return e;
      const ptInf = isExpr(pt) && pt.ast.k === "id" && (pt.ast.name === "inf" || pt.ast.name === "minf") ? pt.ast.name : null;
      if (isExpr(pt) && !ptInf) throw new E("unknown", "Symbolic limit point");
      if (freeVars(e).some((n) => n !== name)) {
        return { t: "expr", ast: { k: "call", name: "limit", args: [e.ast, { k: "id", name }, toAst(pt), ...(dirName ? [{ k: "id", name: dirName }] : [])] } };
      }
      const a = ptInf ? (ptInf === "inf" ? Infinity : -Infinity) : M.toNum(pt);
      const f = (x) => M.toNum(M.evaluate(e.ast, { point: { [name]: M.F(x) } }));
      const r = M.numericLimit(f, a, dirName === "plus" ? 1 : dirName === "minus" ? -1 : 0);
      if (!r) throw new E("unknown", "The limit does not settle");
      if (r.kind !== "num") return sym(r.kind);
      if (r.exactAt && !ptInf) {     // continuous: the value at the point, exact where it can be
        try { const v = M.evaluate(e.ast, { point: { [name]: pt } }); if (M.isNumber(v)) return v; } catch (err) { /* float below */ }
      }
      return r.frac ? M.arith("/", Q(BigInt(r.frac[0])), Q(BigInt(r.frac[1]))) : M.F(r.v);
    },
    // STACK's continuousp(ex, v, xp): the limits from both sides are finite and equal (the
    // value at xp is not looked at); diffp(ex, v, xp[, n]): continuousp of the derivative.
    continuousp: ([e, x, a], s) => {
      const v = value(e, s), name = symName(x, s), pt = value(a, s);
      if (!isExpr(v)) return bool(true);
      if (freeVars(v).some((n) => n !== name) || isExpr(pt)) throw new E("unknown", "continuousp of a symbolic expression");
      const f = (t) => M.toNum(M.evaluate(v.ast, { point: { [name]: M.F(t) } }));
      const a0 = M.toNum(pt), lo = M.numericLimit(f, a0, -1), hi = M.numericLimit(f, a0, 1);
      if (!lo || !hi) throw new E("unknown", "The limits do not settle");
      return bool(lo.kind === "num" && hi.kind === "num" && Math.abs(lo.v - hi.v) <= 1e-7 * Math.max(1, Math.abs(lo.v)));
    },
    diffp: ([e, x, a, n], s) => {
      const v = value(e, s);
      if (!isExpr(v)) return bool(true);
      const call = { k: "call", name: "diff", args: [v.ast, toAst(value(x, s)), ...(n ? [toAst(value(n, s))] : [])] };
      const d = M.expandDiff(call);
      if (!d) throw new E("unknown", "diffp: no derivative by the rules");
      return SPECIAL.continuousp([d, x, a], s);
    },
    // set(a, b): the set {a, b} (also with symbols: setdifference(l, set(t)), 126620)
    set: (args, s) => makeSet(args.map((a) => value(a, s))),
    makelist: (args, s) => {
      if (args.length === 2) {           // makelist(e, n)
        const n = Number(M.toNum(value(args[1], s)));
        return { t: "list", items: Array.from({ length: n }, () => value(args[0], s)) };
      }
      return { t: "list", items: iterate(args, s) };
    },
    sum: (args, s) => fold(iterate(args, s), "+", Q(0n)),
    product: (args, s) => fold(iterate(args, s), "*", Q(1n)),
    sublist: ([l, f], s) => {
      const list = value(l, s), fn = value(f, s);
      return { t: "list", items: items(list, "sublist").filter((x) => truth(callFn(fn, [x], s))) };
    },
    map: ([f, l], s) => {
      const fn = value(f, s), list = value(l, s);
      return { t: list.t === "set" ? "set" : "list", items: items(list, "map").map((x) => callFn(fn, [x], s)) };
    },
    maplist: (args, s) => SPECIAL.map(args, s),
    // STACK's systems of equations (stackmaxima.mac), 85896.  stack_eval_assignments puts
    // the assignments (d = 90, also 90 = d) into the other equations and drops them;
    // stack_eqnprepare is rhs - lhs (STACK simplifies it and clears denominators, which
    // eqncompare does here); stack_eqncompare compares the ideals: reduced Groebner bases.
    stack_eval_assignments: ([e], s) => {
      const v = value(e, s);
      if (v.t !== "list") return v;
      const isNum = (a) => { const x = value(a, s); return !symbolic(x) && M.isNumber(x); };
      const eqs = v.items.map((x) => {
        if (!isExpr(x) || x.ast.k !== "op" || x.ast.op !== "=") return x;
        const [l, r] = x.ast.args;
        return isNum(l) && !isNum(r) ? { t: "expr", ast: { k: "op", op: "=", args: [r, l] } } : x;
      });
      const isAssign = (x) => isExpr(x) && x.ast.k === "op" && x.ast.op === "=" && x.ast.args[0].k === "id" && isNum(x.ast.args[1]);
      const asl = eqs.filter(isAssign);
      if (!asl.length) return { t: "list", items: eqs };
      const pairs = asl.map((x) => [x.ast.args[0].name, value(x.ast.args[1], s)]);
      const rest = eqs.filter((x, i) => !isAssign(x) && !eqs.slice(0, i).some((y) => same(x, y)));
      return { t: "list", items: rest.map((x) => substitute(x, pairs, s)) };
    },
    stack_eqnprepare: ([e], s) => {
      const v = value(e, s);
      if (!isExpr(v) || v.ast.k !== "op" || v.ast.op !== "=") return v;
      return value({ k: "op", op: "-", args: [v.ast.args[1], { k: "paren", arg: v.ast.args[0] }] }, s);
    },
    stack_eqncompare: ([a, b], s) => {
      const A = items(value(a, s), "stack_eqncompare"), B = items(value(b, s), "stack_eqncompare");
      return bool(sameIdeal(A.map(toAst), B.map(toAst)));
    },
    // coeff(p, x, n) / hipow(p, x) of a polynomial in x, from its values at whole x:
    // Newton differences give the coefficients (exact with rationals).  Like coeff on
    // expand(p) in Maxima; Maxima itself does not expand, so this is a little more lenient.
    coeff: ([e, x, n], s) => {
      // coeff(p, x^2) is coeff(p, x, 2) (245777)
      if (x && !n && x.k === "op" && x.op === "^" && x.args[1].k === "num") [x, n] = x.args;
      const c = polyCoeffs(value(e, s), x ? symName(x, s) : null, s);
      const k = n ? Number(M.toNum(value(n, s))) : 1;
      return c[k] || Q(0n);
    },
    // degree(p, x): for a polynomial, the highest power (Maxima's degree is hipow of the expanded form)
    degree: ([e, x], s) => SPECIAL.hipow([e, x], s),
    // at(e, x=a) / at(e, [x=a, y=b]): for these questions the same as subst
    at: ([e, eqs], s) => SPECIAL.subst([eqs, e], s),
    hipow: ([e, x], s) => Q(BigInt(Math.max(0, polyCoeffs(value(e, s), symName(x, s), s).length - 1))),
    // STACK's coeff_list(p, x) = [c0, c1, ..., cn] and coeff_list_nz(p, x) = [[k, ck], ...] (ck # 0)
    coeff_list: ([e, x], s) => ({ t: "list", items: polyCoeffs(value(e, s), symName(x, s), s) }),
    coeff_list_nz: ([e, x], s) => ({ t: "list", items: polyCoeffs(value(e, s), symName(x, s), s)
      .map((c, k) => [k, c]).filter(([, c]) => !(c.t === "q" && c.n === 0n))
      .map(([k, c]) => ({ t: "list", items: [Q(BigInt(k)), c] })) }),
    // quotient(p, q[, x]): the quotient of polynomial division in x (245777: quotient(p, x^4) = 0
    // tells a polynomial of degree < 4).  Without x, the one variable of p and q.
    quotient: ([p, q, x], s) => {
      const P = value(p, s), D = value(q, s);
      let name = x ? symName(x, s) : null;
      if (!name) {
        const vars = [...new Set([...(isExpr(P) ? freeVars(P) : []), ...(isExpr(D) ? freeVars(D) : [])])];
        if (vars.length > 1) throw new E("unknown", "quotient needs a variable");
        name = vars[0] || null;
      }
      if (!name) return M.arith("/", P, D);
      const a = polyCoeffs(P, name, s), b = polyCoeffs(D, name, s);
      if ([...a, ...b].some(isExpr)) throw new E("unknown", "quotient with symbolic coefficients");
      const m = b.length - 1, r = a.slice(), out = [];
      for (let k = a.length - 1 - m; k >= 0; k--) {
        out[k] = M.arith("/", r[k + m], b[m]);
        b.forEach((bj, j) => { r[k + j] = M.arith("-", r[k + j], M.arith("*", out[k], bj)); });
      }
      return polyValue(out, name, s);
    },
    // showratvars(e): the "variables" of e as a rational expression -- symbols, and every
    // part that is not rational in them (sin(x), sqrt(x), %pi).  [] for a number.
    showratvars: ([e], s) => {
      const v = value(e, s);
      if (!isExpr(v)) return { t: "list", items: [] };
      const kernels = [];
      const add = (n) => { if (!kernels.some((k) => same(k, n))) kernels.push(n); };
      const walk = (n) => {
        if (n.k === "num") return;
        if (n.k === "paren" || n.k === "neg") return walk(n.arg);
        if (n.k === "op" && ["+", "-", "*", "/"].includes(n.op)) return n.args.forEach(walk);
        if (n.k === "op" && n.op === "^" && n.args[1].k === "num" && !n.args[1].isFloat && !String(n.args[1].value).includes(".")) return walk(n.args[0]);
        if (n.k === "op" && n.op === "^" && n.args[1].k === "neg" && n.args[1].arg.k === "num") return walk(n.args[0]);
        add({ t: "expr", ast: n });
      };
      walk(v.ast);
      return { t: "list", items: kernels.sort(M.compareValues) };
    },
    solve: (args, s) => solveSystem(args, s),
    charfun: ([c], s) => {
      let v = value(c, s);
      if (isExpr(v)) v = decide(v);
      return isExpr(v) ? { t: "expr", ast: { k: "call", name: "charfun", args: [v.ast] } } : Q(truth(v) ? 1n : 0n);
    },
    // integrate(e, x, a, b) with numeric bounds: adaptive Simpson (an inner product
    // integrate(u*v, x, -1, 1) of polynomials, say).  Indefinite integrals are not supported.
    // lowesttermsp(ex), gcd(p, q), num/denom of the student's answer as typed (STACK runs
    // them unsimplified): a fraction is in lowest terms when numerator and denominator share
    // no factor.  The polynomial arithmetic is in engine.js (StackForms).
    lowesttermsp: ([e], s) => {
      let r = rawOf(e, s);
      if (r.k !== "op" || r.op !== "/") return bool(true);
      const [a, b] = r.args.map(unparenAst);
      if (a.k === "neg" && b.k === "neg") return bool(false);
      const g = rawGcd(a, b);
      return bool(!!g && g[0] === 1n && g[1] === 1n);
    },
    gcd: ([a, b], s) => {
      const va = value(a, s), vb = value(b, s);
      if (va.t === "q" && vb.t === "q" && va.d === 1n && vb.d === 1n) {
        let x = va.n < 0n ? -va.n : va.n, y = vb.n < 0n ? -vb.n : vb.n;
        while (y) [x, y] = [y, x % y];
        return Q(x);
      }
      const g = rawGcd(rawOf(a, s), rawOf(b, s));
      if (g === null || g === undefined) throw new E("unknown", "gcd of polynomials with a common factor");
      return M.arith("/", Q(g[0]), Q(g[1]));
    },
    integrate: ([e, x, a, b], s) => {
      if (!b) throw new E("unknownfunction", "Unknown function", "integrate");
      const v = value(e, s), lo = value(a, s), hi = value(b, s), name = symName(x, s);
      if (!isExpr(v) && !isExpr(lo) && !isExpr(hi)) return M.arith("*", v, M.arith("-", hi, lo));
      // symbolic bounds or integrand (a convolution up to t): computed at the sample points
      if (isExpr(lo) || isExpr(hi) || freeVars(v).some((n) => n !== name))
        return { t: "expr", ast: { k: "call", name: "integrate", args: [toAst(v), { k: "id", name }, toAst(lo), toAst(hi)] } };
      const f = (t) => M.toNum(M.evaluate(v.ast, { point: { [name]: M.F(t) } }));
      return M.F(simpson(f, M.toNum(lo), M.toNum(hi)));
    },
    // defint(e, x, a, b): Maxima's definite integral, the same as integrate(e, x, a, b)
    defint: (args, s) => SPECIAL.integrate(args, s),
    // STACK's int is integrate: definite with bounds; indefinite only from the build (variant "pre")
    int: (args, s) => SPECIAL.integrate(args, s),
    // charpoly(M, x) = determinant(M - x*ident(n)), as a polynomial in x
    charpoly: ([m, x], s) => {
      const mv = value(m, s), name = symName(x, s);
      if (mv.t !== "matrix") throw new E("type", "charpoly needs a matrix");
      const c = M.charCoeffs(mv);              // det(x*I - M), low to high
      const sign = mv.rows.length % 2 ? -1n : 1n;
      const terms = c.map((ck, k) => ({ k: "op", op: "*", args: [P_toAst(M.arith("*", ck, Q(sign))), { k: "op", op: "^", args: [{ k: "id", name }, { k: "num", value: String(k), isFloat: false }] }] }));
      return { t: "expr", ast: terms.reduce((acc, t) => ({ k: "op", op: "+", args: [acc, t] })) };
    },
    lreduce: ([f, l, init], s) => {
      const fn = value(f, s), list = items(value(l, s), "lreduce").slice();
      let acc = init ? value(init, s) : list.shift();
      for (const x of list) acc = callFn(fn, [acc, x], s);
      return acc;
    },
    lsum: ([e, v, l], s) => fold(iterate([e, v, l], s), "+", Q(0n)),
    // setelmx(x, i, j, M): M with entry (i, j) set to x; Maxima changes M itself.
    setelmx: ([x, i, j, m], s) => {
      const target = m.k === "id" ? { k: "index", target: m, indices: [i, j] } : null;
      if (target) { value({ k: "op", op: ":", args: [target, x] }, s); return value(m, s); }
      const mv = value(m, s);
      if (mv.t !== "matrix") throw new E("type", "setelmx needs a matrix");
      const r = Number(M.toNum(value(i, s))) - 1, c = Number(M.toNum(value(j, s))) - 1;
      const rows = mv.rows.map((row) => row.slice());
      rows[r][c] = value(x, s);
      return { t: "matrix", rows };
    },
    apply: ([f, l], s) => {
      const list = value(l, s);
      if (f.k === "str" && ["+", "*"].includes(f.value)) return fold(items(list, "apply"), f.value, Q(f.value === "+" ? 0n : 1n));
      return f.k === "id" ? call({ k: "call", name: f.name, args: items(list, "apply").map(toAst) }, s)
        : callFn(value(f, s), items(list, "apply"), s);
    },
  };

  const P_toAst = (v) => toAst(v);

  /*
   * Ideals of polynomials with rational coefficients (stack_eqncompare): each expression
   * (rhs - lhs of an equation) as a fraction of polynomials, its numerator a generator;
   * the two lists generate the same ideal when their reduced Groebner bases (grevlex,
   * Buchberger) are equal.  Floats count as the decimals typed (0.25 = 1/4).  Expressions
   * that are not rational functions throw (as poly_buchberger does in Maxima).
   */
  const bgcd = (x, y) => { x = x < 0n ? -x : x; y = y < 0n ? -y : y; while (y) [x, y] = [y, x % y]; return x; };
  const rat = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = bgcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const radd = (a, b) => rat(a.n * b.d + b.n * a.d, a.d * b.d);
  const rmul = (a, b) => rat(a.n * b.n, a.d * b.d);
  const rdiv = (a, b) => rat(a.n * b.d, a.d * b.n);

  function sameIdeal(As, Bs) {
    const names = [...new Set([...As, ...Bs].flatMap((a) => [...M.freeVariables(a, {})]))].sort();
    const nv = names.length;
    const key = (e) => e.join(",");
    const unkey = (k) => (k === "" ? [] : k.split(",").map(Number));
    const one = () => new Map([[key(Array(nv).fill(0)), rat(1n)]]);
    const add = (p, q, c = rat(1n)) => {
      const out = new Map(p);
      for (const [k, x] of q) {
        const y = out.has(k) ? radd(out.get(k), rmul(c, x)) : rmul(c, x);
        if (y.n === 0n) out.delete(k); else out.set(k, y);
      }
      return out;
    };
    const mulTerm = (p, e, c) => {
      const out = new Map();
      for (const [k, x] of p) out.set(key(unkey(k).map((a, i) => a + e[i])), rmul(x, c));
      return out;
    };
    const mul = (p, q) => { let out = new Map(); for (const [k, x] of q) out = add(out, mulTerm(p, unkey(k), x)); return out; };
    const same = (p, q) => add(p, q, rat(-1n)).size === 0;
    // rational functions {n, d}; common denominators are kept (a/b - c/b, not (ab - cb)/b^2)
    const frac = (ast) => {
      switch (ast.k) {
        case "paren": return frac(ast.arg);
        case "num": {
          const m = /^(\d*)\.?(\d*)(?:[eE]([-+]?\d+))?$/.exec(String(ast.value));
          if (!m) throw new E("unknown", "not a polynomial");
          let r = rat(BigInt((m[1] || "0") + (m[2] || "")), 10n ** BigInt((m[2] || "").length));
          const x = +(m[3] || 0);
          r = x >= 0 ? rmul(r, rat(10n ** BigInt(x))) : rmul(r, rat(1n, 10n ** BigInt(-x)));
          return { n: r.n ? new Map([[key(Array(nv).fill(0)), r]]) : new Map(), d: one() };
        }
        case "id": {
          const i = names.indexOf(ast.name);
          if (i < 0) throw new E("unknown", "not a polynomial");
          const e = Array(nv).fill(0); e[i] = 1;
          return { n: new Map([[key(e), rat(1n)]]), d: one() };
        }
        case "neg": { const f = frac(ast.arg); return { n: mulTerm(f.n, Array(nv).fill(0), rat(-1n)), d: f.d }; }
        case "op": {
          const fs = ast.args.map(frac);
          if (ast.op === "-" && fs.length === 1) return { n: mulTerm(fs[0].n, Array(nv).fill(0), rat(-1n)), d: fs[0].d };
          if (ast.op === "+" || ast.op === "-") {
            return fs.reduce((x, y) => {
              const c = rat(ast.op === "-" ? -1n : 1n);
              if (same(x.d, y.d)) return { n: add(x.n, y.n, c), d: x.d };
              return { n: add(mul(x.n, y.d), mul(y.n, x.d), c), d: mul(x.d, y.d) };
            });
          }
          if (ast.op === "*") return fs.reduce((x, y) => ({ n: mul(x.n, y.n), d: mul(x.d, y.d) }));
          if (ast.op === "/") {
            if (!fs[1].n.size) throw new E("domain", "division by zero");
            return { n: mul(fs[0].n, fs[1].d), d: mul(fs[0].d, fs[1].n) };
          }
          if (ast.op === "^" && ast.args[1].k === "num" && /^\d+$/.test(ast.args[1].value) && +ast.args[1].value <= 32) {
            let out = { n: one(), d: one() };
            for (let k = 0; k < +ast.args[1].value; k++) out = { n: mul(out.n, fs[0].n), d: mul(out.d, fs[0].d) };
            return out;
          }
        }
      }
      throw new E("unknown", "not a polynomial");
    };
    // grevlex: total degree, then the smaller exponent of the last variable wins
    const cmp = (a, b) => {
      const da = a.reduce((x, y) => x + y, 0), db = b.reduce((x, y) => x + y, 0);
      if (da !== db) return da - db;
      for (let i = nv - 1; i >= 0; i--) if (a[i] !== b[i]) return b[i] - a[i];
      return 0;
    };
    const lead = (p) => { let best = null; for (const k of p.keys()) { const e = unkey(k); if (!best || cmp(e, best) > 0) best = e; } return best; };
    const divides = (a, b) => a.every((x, i) => x <= b[i]);
    const monic = (p) => { const c = p.get(key(lead(p))); return mulTerm(p, Array(nv).fill(0), rdiv(rat(1n), c)); };
    const reduce = (p, G) => {           // full reduction of p by G
      let r = new Map(), q = new Map(p);
      while (q.size) {
        const e = lead(q), c = q.get(key(e));
        const g = G.find((h) => divides(lead(h), e));
        if (g) {
          const lg = lead(g);
          q = add(q, mulTerm(g, e.map((x, i) => x - lg[i]), rdiv(c, g.get(key(lg)))), rat(-1n));
        } else {
          r.set(key(e), c);
          q.delete(key(e));
        }
      }
      return r;
    };
    const groebner = (F) => {
      let G = F.filter((p) => p.size).map(monic);
      const pairs = [];
      for (let i = 0; i < G.length; i++) for (let j = 0; j < i; j++) pairs.push([i, j]);
      let work = 0;
      while (pairs.length) {
        if (++work > 2000) throw new E("unknown", "Groebner basis too large");
        const [i, j] = pairs.shift();
        const a = lead(G[i]), b = lead(G[j]);
        const l = a.map((x, k) => Math.max(x, b[k]));
        if (l.every((x, k) => x === a[k] + b[k])) continue;          // coprime leading terms
        const sp = add(mulTerm(G[i], l.map((x, k) => x - a[k]), rat(1n)), mulTerm(G[j], l.map((x, k) => x - b[k]), rat(1n)), rat(-1n));
        const r = reduce(sp, G);
        if (r.size) {
          G.push(monic(r));
          for (let k = 0; k < G.length - 1; k++) pairs.push([G.length - 1, k]);
        }
      }
      // reduced basis: drop redundant leading terms, then reduce each by the others
      G = G.filter((g, i) => !G.some((h, j) => j !== i && divides(lead(h), lead(g)) && (key(lead(h)) !== key(lead(g)) || j < i)));
      return G.map((g, i) => monic(reduce(g, G.filter((_, j) => j !== i)))).sort((x, y) => cmp(lead(x), lead(y)));
    };
    const G1 = groebner(As.map((a) => frac(a).n)), G2 = groebner(Bs.map((b) => frac(b).n));
    return G1.length === G2.length && G1.every((g, i) => same(g, G2[i]));
  }

  /*
   * solve(eqs, vars) for what the questions need (check_point: is the point a solution of
   * the plane's equation?), with Maxima's results:
   *  - every variable given by an equation x = c: the other equations are checked at that
   *    point -> [[x = c, ...]] when they hold, [] when not.  A leftover symbol (a typo like
   *    stdplane) is an equation stdplane = 0 that does not hold: [] as in Maxima.
   *  - linear equations with numeric coefficients: Gauss elimination; one solution or [].
   * Otherwise (parametric or nonlinear solutions) solve(...) stays unevaluated.
   */
  function solveSystem(args, s) {
    const residual = () => ({ t: "expr", ast: { k: "call", name: "solve", args: args.map((a) => toAst(value(a, s))) } });
    if (args.length !== 2) return residual();
    const vl = value(args[1], s);
    const vars = (vl.t === "list" ? vl.items : [vl]).map((v) => (isExpr(v) && v.ast.k === "id" ? v.ast.name : null));
    if (vars.some((v) => !v)) return residual();
    const eqAsts = args[0].k === "list" ? args[0].items : null;
    const eqVals = eqAsts ? eqAsts.map((a) => value(a, s)) : (() => { const l = value(args[0], s); return l.t === "list" ? l.items : [l]; })();
    // each equation as lhs - rhs (an AST), or true/false when it was decided already
    const fs = [];
    for (let i = 0; i < eqVals.length; i++) {
      const src = eqAsts && eqAsts[i].k === "op" && eqAsts[i].op === "=" ? eqAsts[i] : null;
      let v = eqVals[i];
      if (src) v = { t: "expr", ast: { k: "op", op: "=", args: [toAst(value(src.args[0], s)), toAst(value(src.args[1], s))] } };
      if (v.t === "bool") { if (!v.v) return { t: "list", items: [] }; continue; }
      const ast = toAst(v);
      fs.push(ast.k === "op" && ast.op === "=" ? { k: "op", op: "-", args: [ast.args[0], { k: "paren", arg: ast.args[1] }] } : ast);
    }
    const free = (a) => [...M.freeVariables(a, {})];
    const answer = (vals) => {
      const eqs = vars.map((x, i) => ({ t: "expr", ast: { k: "op", op: "=", args: [{ k: "id", name: x }, toAst(vals[i])] } }));
      return { t: "list", items: vars.length === 1 ? eqs : [{ t: "list", items: eqs }] };
    };
    const isZeroEverywhere = (f, point) => {
      const others = free(f).filter((n) => !(n in point));
      for (let k = 0; k < (others.length ? 6 : 1); k++) {
        const p = { ...point };
        for (const n of others) p[n] = M.F(0.37 + 2.3 * M.random() * (k % 2 ? -1 : 1));
        let y;
        try { y = M.toNum(M.evaluate(f, { point: p })); } catch (e) { return false; }
        if (!(Math.abs(y) < 1e-9)) return false;
      }
      return true;
    };
    // 1. every variable given as x = c
    const given = {};
    for (const f of fs) {
      if (f.k === "op" && f.op === "-" && f.args[0].k === "id" && vars.includes(f.args[0].name) && !(f.args[0].name in given)) {
        const c = f.args[1];
        if (!free(c).some((n) => vars.includes(n))) given[f.args[0].name] = c;
      }
    }
    if (vars.every((x) => x in given) && vars.every((x) => !free(given[x]).length)) {
      const vals = vars.map((x) => M.evaluate(given[x], {}));
      const point = Object.fromEntries(vars.map((x, i) => [x, vals[i]]));
      return fs.every((f) => isZeroEverywhere(f, point)) ? answer(vals) : { t: "list", items: [] };
    }
    // 2. a linear system with numeric coefficients
    if (fs.some((f) => free(f).some((n) => !vars.includes(n)))) return residual();
    const at = (f, p) => M.evaluate(f, { point: p });
    const zero = () => Object.fromEntries(vars.map((x) => [x, Q(0n)]));
    const rows = [];
    for (const f of fs) {
      let c0, cs;
      try {
        c0 = at(f, zero());
        cs = vars.map((x) => { const p = zero(); p[x] = Q(1n); return M.arith("-", at(f, p), c0); });
        for (let k = 0; k < 3; k++) {
          const p = Object.fromEntries(vars.map((x) => [x, F(0.3 + 2.1 * M.random())]));
          let y = M.toNum(c0);
          vars.forEach((x, i) => { y += M.toNum(cs[i]) * M.toNum(p[x]); });
          const z = M.toNum(at(f, p));
          if (!(Math.abs(z - y) <= 1e-9 * (1 + Math.abs(z)))) return residual();
        }
      } catch (e) { return residual(); }
      rows.push([...cs, M.arith("*", Q(-1n), c0)]);
    }
    if (!rows.length) return residual();
    const n = vars.length;
    const red = M.callValue("rref", [{ t: "matrix", rows }]);
    const nz = red.rows.filter((r) => r.some((x) => M.toNum(x) !== 0));
    if (nz.some((r) => r.slice(0, n).every((x) => M.toNum(x) === 0))) return { t: "list", items: [] };
    if (nz.length < n) return residual();               // a family of solutions (%r1, ...)
    return answer(nz.map((r) => r[n]));
  }

  const simpson = M.simpson;

  // Coefficients [c0, c1, ...] of a value that is a polynomial in x.
  function polyCoeffs(v, x, s) {
    if (!isExpr(v)) return [v];
    const free = freeVars(v);
    if (!x) throw new E("unknown", "coeff of a non-polynomial");
    if (free.some((n) => n !== x)) return symbolicCoeffs(v, x, free.filter((n) => n !== x), s);
    if (!free.length) return [M.evaluate(v.ast, {})];
    const N = 16;
    const ys = [];
    for (let k = 0; k <= N; k++) ys.push(M.evaluate(v.ast, { point: { [x]: Q(BigInt(k)) } }));
    const scale = Math.max(1, ...ys.map((y) => Math.abs(M.toNum(y))));
    const zero = (y) => (y.t === "q" ? y.n === 0n : Math.abs(y.v) <= 1e-9 * scale);
    // forward differences: d[j] = Δ^j y(0)
    const d = [];
    let row = ys.slice();
    for (let j = 0; j <= N; j++) { d.push(row[0]); row = row.slice(1).map((y, i) => M.arith("-", y, row[i])); }
    let deg = N;
    while (deg > 0 && zero(d[deg])) deg--;
    if (deg > N - 4) throw new E("unknown", "Not a polynomial");
    // p(x) = Σ d[j] * C(x, j); expand the falling factorials into powers of x
    let coeffs = [Q(0n)];
    let basis = [Q(1n)];                       // x(x-1)...(x-j+1) / j!
    for (let j = 0; j <= deg; j++) {
      if (j > 0) {
        const next = new Array(basis.length + 1).fill(Q(0n));
        basis.forEach((b, i) => {
          next[i + 1] = M.arith("+", next[i + 1], M.arith("/", b, Q(BigInt(j))));
          next[i] = M.arith("-", next[i], M.arith("/", M.arith("*", b, Q(BigInt(j - 1))), Q(BigInt(j))));
        });
        basis = next;
      }
      while (coeffs.length < basis.length) coeffs.push(Q(0n));
      basis.forEach((b, i) => { coeffs[i] = M.arith("+", coeffs[i], M.arith("*", d[j], b)); });
    }
    coeffs = coeffs.map((c) => (zero(c) ? Q(0n) : c));
    while (coeffs.length > 1 && coeffs[coeffs.length - 1].t === "q" && coeffs[coeffs.length - 1].n === 0n) coeffs.pop();
    return coeffs;
  }

  // The polynomial c0 + c1*x + ... as a value (a number when it is constant).
  function polyValue(c, x, s) {
    const nz = c.map((ck, k) => [ck, k]).filter(([ck]) => !(ck.t === "q" && ck.n === 0n));
    if (!nz.some(([, k]) => k > 0)) return nz.length ? nz[0][0] : Q(0n);
    const pow = (k) => (k === 1 ? { k: "id", name: x } : { k: "op", op: "^", args: [{ k: "id", name: x }, { k: "num", value: String(k), isFloat: false }] });
    const terms = nz.map(([ck, k]) => (k === 0 ? toAst(ck) : { k: "op", op: "*", args: [toAst(ck), pow(k)] }));
    return value(terms.reduce((acc, t) => ({ k: "op", op: "+", args: [acc, t] })), s);
  }

  // Coefficients of a polynomial in x whose coefficients hold other variables (a*x+b*x^2):
  // the degree from a few numeric values of the others, then each coefficient as the exact
  // combination of p(0), p(1), ..., p(deg) that interpolation gives (1823769).
  function symbolicCoeffs(v, x, others, s) {
    let deg = 0;
    for (const vals of [[2n, 3n, 5n, 7n], [11n, -13n, 17n, -19n], [-23n, 29n, 31n, 37n]]) {
      const at = substitute(v, others.map((n, i) => [n, Q(vals[i % vals.length] + BigInt(i))]), s);
      deg = Math.max(deg, polyCoeffs(at, x, s).length - 1);
    }
    const ys = [];
    for (let m = 0; m <= deg; m++) ys.push(substitute(v, [[x, Q(BigInt(m))]], s));
    // weights: the power coefficients of the polynomial through (m, [m = j]) for each j
    const coeffs = [];
    for (let j = 0; j <= deg; j++) {
      const w = interpolate(ys.map((_, m) => Q(m === j ? 1n : 0n)));
      w.forEach((c, i) => {
        if (c.n === 0n) return;
        const term = { k: "op", op: "*", args: [toAst(c), toAst(ys[j])] };
        coeffs[i] = coeffs[i] ? { k: "op", op: "+", args: [coeffs[i], term] } : term;
      });
    }
    return Array.from({ length: deg + 1 }, (_, i) => (coeffs[i] ? { t: "expr", ast: coeffs[i] } : Q(0n)));
  }

  // The power coefficients of the polynomial of degree < n through (0, ys[0]) ... (n-1, ys[n-1]).
  function interpolate(ys) {
    const d = [];
    let row = ys.slice();
    for (let j = 0; j < ys.length; j++) { d.push(row[0]); row = row.slice(1).map((y, i) => M.arith("-", y, row[i])); }
    const coeffs = new Array(ys.length).fill(Q(0n));
    let basis = [Q(1n)];
    d.forEach((dj, j) => {
      if (j > 0) {
        const next = new Array(basis.length + 1).fill(Q(0n));
        basis.forEach((b, i) => {
          next[i + 1] = M.arith("+", next[i + 1], M.arith("/", b, Q(BigInt(j))));
          next[i] = M.arith("-", next[i], M.arith("/", M.arith("*", b, Q(BigInt(j - 1))), Q(BigInt(j))));
        });
        basis = next;
      }
      basis.forEach((b, i) => { coeffs[i] = M.arith("+", coeffs[i], M.arith("*", dj, b)); });
    });
    return coeffs;
  }

  function atCall(test, a, b, s) {
    const fn = global.StackEngine && global.StackEngine.ANSWER_TESTS[test];
    if (!fn) throw new E("unknownfunction", "Unknown function", "AT" + test);
    const ok = fn(value(a, s), value(b, s), null, {}, s);
    return { t: "list", items: [TRUE, bool(ok), { t: "str", v: "" }, { t: "str", v: "" }] };
  }

  function callFn(fn, vals, s) {
    if (fn.t === "lambda") return applyLambda(fn, vals, s);
    // apply("+", list), map("*", ...): an operator given by its name
    if (fn.t === "str" && ["+", "*"].includes(fn.v)) return fold(vals, fn.v, Q(fn.v === "+" ? 0n : 1n));
    if (fn.t === "str" && /^[A-Za-z_]\w*$/.test(fn.v)) return call({ k: "call", name: fn.v, args: vals.map(toAst) }, s);
    if (isExpr(fn) && fn.ast.k === "id") return call({ k: "call", name: fn.ast.name, args: vals.map(toAst) }, s);
    throw new E("type", "Not a function");
  }

  // makelist(e, i, a, b) / sum(e, i, a, b) / makelist(e, x, list)
  function iterate([e, v, a, b], s) {
    const name = v.name;
    const out = [];
    const frame = new Map();
    const inner = { ...s, locals: [...s.locals, frame] };
    let lo, hi;
    if (b === undefined) {
      const l = value(a, s);
      if (M.isScalar(l)) { lo = 1; hi = Number(M.toNum(l)); }     // makelist(e, i, n): i = 1..n
      else {
        for (const x of items(l, "makelist")) { frame.set(name, x); out.push(value(e, inner)); }
        return out;
      }
    } else {
      lo = Number(M.toNum(value(a, s))); hi = Number(M.toNum(value(b, s)));
    }
    if (!(hi - lo < 10000)) throw new E("type", "Too many terms");
    for (let i = lo; i <= hi; i++) { frame.set(name, Q(BigInt(i))); out.push(value(e, inner)); }
    return out;
  }

  function fold(vals, opName, start) {
    if (vals.some(isExpr)) {
      return { t: "expr", ast: vals.map(toAst).reduce((x, y) => ({ k: "op", op: opName, args: [x, y] })) };
    }
    return vals.reduce((x, y) => M.arith(opName, x, y), start);
  }

  const MOVE_ENTRIES = new Set(["transpose", "addcol", "addrow", "col", "row", "submatrix", "matrix", "args",
    "flatten", "list_matrix_entries", "matrix_size", "copymatrix", "matrixp"]);

  // Structural functions on concrete arguments (lists, sets, symbols).
  const STRUCT_OK_EXPR = new Set(["delete", "member", "length", "first", "second", "third", "last", "rest",
    "append", "cons", "endcons", "reverse", "listp", "setp", "emptyp", "elementp", "atom", "symbolp", "numberp",
    "integerp", "stringp", "freeof", "lmax", "lmin", "matrixp"]);
  const STRUCT = {
    delete: ([x, l]) => ({ t: l.t, items: items(l, "delete").filter((y) => !same(x, y)) }),
    // a matrix is its rows here, as in Maxima (member([x, y, c], class) with class a matrix, 156083)
    member: ([x, l]) => bool((l.t === "matrix" ? l.rows.map((r) => ({ t: "list", items: r })) : items(l, "member")).some((y) => same(x, y))),
    elementp: ([x, l]) => bool(items(l, "elementp").some((y) => same(x, y))),
    length: ([l]) => {
      if (isExpr(l)) {          // length(3*x^2+x-1) = 3: the top-level operands, as in Maxima
        const a = l.ast.k === "paren" ? l.ast.arg : l.ast;
        const count = (n, ops) => (n.k === "op" && ops.includes(n.op) ? count(n.args[0], ops) + count(n.args[1], ops) : 1);
        if (a.k === "op" && (a.op === "+" || a.op === "-")) return Q(BigInt(count(a, ["+", "-"])));
        if (a.k === "op") return Q(BigInt(a.op === "*" ? count(a, ["*"]) : 2));
        if (a.k === "neg") return Q(1n);
        throw new E("type", "length of an atom");
      }
      if (l.t === "list" || l.t === "set") return Q(BigInt(l.items.length));
      if (l.t === "matrix") return Q(BigInt(l.rows.length));
      if (l.t === "str") return Q(BigInt(l.v.length));
      throw new E("type", "length");
    },
    cardinality: ([l]) => Q(BigInt(items(l, "cardinality").length)),
    first: ([l]) => items(l, "first")[0],
    second: ([l]) => items(l, "second")[1],
    third: ([l]) => items(l, "third")[2],
    last: ([l]) => { const a = items(l, "last"); return a[a.length - 1]; },
    rest: ([l, n]) => {        // rest(l, k) drops the first k, rest(l, -k) the last k
      const k = n ? Number(M.toNum(n)) : 1;
      const a = items(l, "rest");
      return { t: "list", items: k >= 0 ? a.slice(k) : a.slice(0, a.length + k) };
    },
    reverse: ([l]) => ({ t: "list", items: items(l, "reverse").slice().reverse() }),
    append: (ls) => ({ t: "list", items: ls.flatMap((l) => items(l, "append")) }),
    cons: ([x, l]) => ({ t: "list", items: [x, ...items(l, "cons")] }),
    // scalarp: a number or constant expression (not a list, set or matrix, no free symbols)
    scalarp: ([x]) => bool(x.t !== "list" && x.t !== "set" && x.t !== "matrix" && (!isExpr(x) || !freeVars(x).length)),
    // sconcat/concat of strings and numbers (feedback text: "Point 1 is a critical point")
    sconcat: (xs) => ({ t: "str", v: xs.map(plainText).join("") }),
    concat: (xs) => ({ t: "str", v: xs.map(plainText).join("") }),
    adjoin: ([x, l]) => makeSet([...items(l, "adjoin"), x]),
    endcons: ([x, l]) => ({ t: "list", items: [...items(l, "endcons"), x] }),
    set: (xs) => makeSet(xs),               // set(a, b) = {a, b} (1725658)
    setify: ([l]) => makeSet(items(l, "setify")),
    listify: ([l]) => ({ t: "list", items: items(l, "listify").slice() }),
    sort: ([l]) => ({ t: "list", items: items(l, "sort").slice().sort(M.compareValues) }),
    unique: ([l]) => (l.t === "matrix" ? l : { t: "list", items: makeSet(items(l, "unique")).items }),   // Maxima leaves a matrix as it is
    union: (ls) => makeSet(ls.flatMap((l) => items(l, "union"))),
    intersection: ([a, ...ls]) => makeSet(items(a, "intersection").filter((x) => ls.every((l) => items(l, "intersection").some((y) => same(x, y))))),
    setdifference: ([a, b]) => makeSet(items(a, "setdifference").filter((x) => !items(b, "setdifference").some((y) => same(x, y)))),
    setequalp: ([a, b]) => bool(items(a, "setequalp").length === items(b, "setequalp").length && items(a, "setequalp").every((x) => items(b, "setequalp").some((y) => same(x, y)))),
    subsetp: ([a, b]) => bool(items(a, "subsetp").every((x) => items(b, "subsetp").some((y) => same(x, y)))),
    listp: ([l]) => bool(l.t === "list"),
    setp: ([l]) => bool(l.t === "set"),
    emptyp: ([l]) => bool((l.items || []).length === 0),
    lmax: ([l]) => items(l, "lmax").reduce((a, b) => (M.toNum(b) > M.toNum(a) ? b : a)),
    lmin: ([l]) => items(l, "lmin").reduce((a, b) => (M.toNum(b) < M.toNum(a) ? b : a)),
    numberp: ([x]) => bool(M.isNumber(x)),
    integerp: ([x]) => bool(x.t === "q" && x.d === 1n),
    stringp: ([x]) => bool(x.t === "str"),
    symbolp: ([x]) => bool(isExpr(x) && x.ast.k === "id"),
    atom: ([x]) => bool(!isExpr(x) ? x.t !== "list" && x.t !== "set" && x.t !== "matrix" : x.ast.k === "id"),
    freeof: ([x, e]) => {
      if (!isExpr(e) || !(isExpr(x) && x.ast.k === "id")) return bool(true);
      const vars = freeVars(e);
      if (!vars.includes(x.ast.name)) return bool(true);
      // after Maxima's simplification (radcan(t-t) is 0): the real dependence, as in listofvars
      const strip = (a) => (a.k === "paren" ? strip(a.arg) : a);
      const top = strip(e.ast);
      return bool(top.k === "call" && CANONICAL.has(top.name) && !dependsOn(e.ast, x.ast.name, vars));
    },
    matrixp: ([x]) => bool(x.t === "matrix"),
    // STACK: the values of the correct options of an MCQ teacher's answer [[v, true], ...]
    mcq_correct: ([l]) => ({ t: "list", items: items(l, "mcq_correct").filter((o) => o.t === "list" && o.items[1] && o.items[1].t === "bool" && o.items[1].v).map((o) => o.items[0]) }),
    num: ([x]) => (x.t === "q" ? Q(x.n) : x),
    denom: ([x]) => (x.t === "q" ? Q(x.d) : Q(1n)),
  };

  // A loop's value is "done", or what return(x) inside it gives (return leaves the loop).
  function runFor(loop, s) {
    try { loopBody(loop, s); } catch (e) {
      if (e instanceof ReturnSignal) return e.value;
      throw e;
    }
    return { t: "str", v: "done" };
  }

  function loopBody(loop, s) {
    const frame = s.locals[s.locals.length - 1];
    const setVar = (v) => frame.set(loop.var, v);
    const ok = () => (!loop.while || truth(value(loop.while, s))) && (!loop.unless || !truth(value(loop.unless, s)));
    if (loop.in) {
      for (const x of items(value(loop.in, s), "for ... in")) {
        if (++s.work.n > 200000) throw new E("type", "Loop too long");
        setVar(x); if (!ok()) break; value(loop.body, s);
      }
      return;
    }
    let i = loop.from ? value(loop.from, s) : Q(1n);
    const step = loop.step ? value(loop.step, s) : Q(1n);
    const thru = loop.thru ? value(loop.thru, s) : null;
    // Bounds that are not numbers (a student's answer of the wrong kind) would loop forever.
    const num = (x) => { const n = isExpr(x) ? NaN : M.toNum(x); if (!isFinite(n)) throw new E("type", "Loop bound is not a number"); return n; };
    if (thru) num(thru);
    num(i); num(step);
    for (let guard = 0; ; guard++) {
      if (guard >= 10000 || ++s.work.n > 200000) throw new E("type", "Loop too long");
      setVar(i);
      if (thru && M.toNum(i) > M.toNum(thru)) break;
      if (!ok()) break;
      value(loop.body, s);
      i = M.arith("+", frame.get(loop.var), step);
    }
  }

  // Run statements (feedback variables) in order.
  function exec(statements, s) {
    let r = FALSE;
    for (const st of statements) r = value(st, s);
    return r;
  }

  // A string or number as Maxima's string() writes it (sconcat).
  function plainText(v) {
    if (v.t === "str") return v.v;
    if (v.t === "q") return v.d === 1n ? v.n.toString() : v.n.toString() + "/" + v.d.toString();
    if (v.t === "f") return String(v.v);
    if (v.t === "bool") return String(v.v);
    if (isExpr(v) && v.ast.k === "id") return v.ast.name;
    throw new E("unknown", "sconcat of an expression");
  }

  // A value with some symbols renamed (no evaluation): SubstEquiv in engine.js.
  const rename = (v, map) => (v.t === "list" || v.t === "set" ? { t: v.t, items: v.items.map((x) => rename(x, map)) }
    : v.t === "matrix" ? { t: "matrix", rows: v.rows.map((r) => r.map((x) => rename(x, map))) }
    : isExpr(v) ? { t: "expr", ast: substituteAst(v.ast, map) } : v);
  global.Peval = { scope, value, exec, toAst, same, isExpr, symbolic, freeVars, rename };
})(typeof window !== "undefined" ? window : globalThis);
