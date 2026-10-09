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
    if (a.t !== b.t && !(M.isScalar(a) && M.isScalar(b))) return false;
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
      functions: Object.assign({}, opts.functions || {}), cache: new Map() };
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

  function assign(name, v, s) { s.locals[s.locals.length - 1].set(name, v); }

  // ------------------------------------------------------------------ evaluation

  // Rebuild a node from already evaluated children, folding when everything is concrete.
  function rebuild(ast, parts, fold) {
    if (parts.every((p) => !symbolic(p))) {
      try { return fold(parts); } catch (e) { if (e.code === "unbound" || e.code === "unknown") { /* keep residual */ } else throw e; }
    }
    return { t: "expr", ast: ast(parts.map(toAst)) };
  }

  function value(ast, s) {
    const V = (a) => value(a, s);
    switch (ast.k) {
      case "num": return M.evaluate(ast, {});
      case "str": return { t: "str", v: ast.value };
      case "paren": return V(ast.arg);
      case "id": {
        const v = lookup(ast.name, s);
        return v === undefined ? sym(ast.name) : v;
      }
      case "neg": return rebuild(([a]) => ({ k: "neg", arg: a }), [V(ast.arg)], ([a]) => M.arith("*", Q(-1n), a));
      case "not": return rebuild(([a]) => ({ k: "not", arg: a }), [V(ast.arg)], ([a]) => bool(!truth(a)));
      case "list": return listOf(ast.items.map(V), "list");
      case "set": return listOf(ast.items.map(V), "set");
      case "seq": { let r = FALSE; for (const a of ast.items) r = V(a); return r; }
      case "index": {
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
        const c = V(ast.cond);
        if (!isExpr(c)) return truth(c) ? V(ast.then) : V(ast.else);
        return { t: "expr", ast: { k: "if", cond: toAst(c), then: toAst(V(ast.then)), else: toAst(V(ast.else)) } };
      }
      case "for": runFor(ast, s); return { t: "str", v: "done" };
      case "op": return op(ast, s);
      case "call": return call(ast, s);
    }
    throw new E("type", "Cannot evaluate " + ast.k);
  }

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
      if (a.k === "index") throw new E("type", "Indexed assignment not supported");
    }
    if (ast.op === ":=") {
      if (a.k === "call") { s.functions[a.name] = { params: a.args.map((p) => p.name), body: b }; return { t: "str", v: a.name }; }
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
        return { t: "expr", ast: mk([toAst(A), toAst(B)]) };
      }
      case "=": case "#":
        // is(a=b) on concrete values; with free variables decided at sample points.
        return rebuild(mk, [A, B], ([x, y]) => bool(ast.op === "=" ? same(x, y) : !same(x, y)));
      case "<": case ">": case "<=": case ">=":
        return rebuild(mk, [A, B], ([x, y]) => {
          const p = M.toNum(x), q = M.toNum(y);
          return bool(ast.op === "<" ? p < q : ast.op === ">" ? p > q : ast.op === "<=" ? p <= q : p >= q);
        });
      default:
        return rebuild(mk, [A, B], ([x, y]) => M.evaluate({ k: "op", op: ast.op, args: [toAst(x), toAst(y)] }, {}));
    }
  }

  // ---- function calls

  function call(ast, s) {
    const name = ast.name;
    const args = ast.args;
    const V = (a) => value(a, s);
    const special = SPECIAL[name];
    if (special) return special(args, s, ast);
    if (s.functions[name]) return applyUser(s.functions[name], args.map(V), s);
    const vals = args.map(V);
    // A function value (lambda) stored in a variable.
    const fv = lookup(name, s);
    if (fv && fv.t === "lambda") return applyLambda(fv, vals, s);
    if (STRUCT[name] && vals.every((v) => !isExpr(v) || STRUCT_OK_EXPR.has(name))) {
      try { return STRUCT[name](vals, s); } catch (e) { if (!vals.some(isExpr)) throw e; }
    }
    return rebuild((parts) => ({ k: "call", name, args: parts }), vals, (parts) => M.evaluate({ k: "call", name, args: parts.map(toAst) }, {}));
  }

  function applyUser(fn, vals, s) {
    const frame = new Map();
    fn.params.forEach((p, i) => frame.set(p, vals[i] === undefined ? sym(p) : vals[i]));
    const inner = { ...s, locals: [...s.locals, frame] };
    return value(fn.body, inner);
  }

  function applyLambda(fn, vals, s) {
    return applyUser({ params: fn.params, body: fn.body }, vals, { ...s, locals: fn.locals || s.locals });
  }

  // Substitute identifiers in a residual expression: ev(e, x=a, y=b) / subst.
  function substitute(v, pairs, s) {
    if (!isExpr(v)) return v;
    const map = new Map(pairs);
    const rep = (node) => {
      if (node.k === "id" && map.has(node.name)) return toAst(map.get(node.name));
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

  // Plain substitution of identifiers in an AST (no evaluation).
  function substituteAst(ast, map) {
    const rep = (node) => {
      if (node.k === "id" && map.has(node.name)) return toAst(map.get(node.name));
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
    if (ast.k === "id") {
      const v = lookup(ast.name, s);
      if (v === undefined || (isExpr(v) && v.ast.k === "id")) return v ? v.ast.name : ast.name;
    }
    const v = value(ast, s);
    if (isExpr(v) && v.ast.k === "id") return v.ast.name;
    return null;
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
    throw new E("type", `${what} needs a list`);
  };

  // Functions with special evaluation of their arguments.
  const SPECIAL = {
    listofvars: ([e], s) => ({ t: "list", items: freeVars(value(e, s)).map(sym) }),
    ev: ([e, ...rest], s) => {
      let v = value(e, s);
      const pairs = [];
      for (const r of rest) {
        if (r.k === "op" && r.op === "=") {
          const name = symName(r.args[0], s);
          if (name) pairs.push([name, value(r.args[1], s)]);
        } else if (r.k === "id" && r.name === "numer" && !isExpr(v)) {
          v = M.F(M.toNum(v));
        }
        // other flags (simp, nouns, expand, ...) do not change a value numerically
      }
      return pairs.length ? substitute(v, pairs, s) : v;
    },
    subst: (args, s) => {
      if (args.length === 2) {           // subst(x=a, e) or subst([x=a, y=b], e)
        const eqs = args[0].k === "list" ? args[0].items : [args[0]];
        const pairs = eqs.filter((q) => q.k === "op" && q.op === "=").map((q) => [symName(q.args[0], s), value(q.args[1], s)]);
        return substitute(value(args[1], s), pairs.filter((p) => p[0]), s);
      }
      const name = symName(args[1], s);  // subst(a, x, e)
      return substitute(value(args[2], s), [[name, value(args[0], s)]], s);
    },
    if: (args, s) => value({ k: "if", cond: args[0], then: args[1], else: args[2] || { k: "id", name: "false" } }, s),
    lambda: ([params, body], s) => ({ t: "lambda", params: (params.items || []).map((p) => p.name), body, locals: s.locals.slice() }),
    block: (args, s) => {
      const [locals, ...body] = args[0] && args[0].k === "list" ? args : [{ k: "list", items: [] }, ...args];
      const frame = new Map();
      for (const l of locals.items) {
        if (l.k === "id") frame.set(l.name, sym(l.name));
        else if (l.k === "op" && l.op === ":") frame.set(l.args[0].name, value(l.args[1], s));
      }
      const inner = { ...s, locals: [...s.locals, frame] };
      let r = FALSE;
      for (const st of body) r = value(st, inner);
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
      return isExpr(v) ? { t: "expr", ast: { k: "call", name: "is", args: [v.ast] } } : v;
    },
    diff: (args, s, ast) => {
      const e = value(args[0], s);
      if (args[2] && M.toNum(value(args[2], s)) === 0) return e;      // diff(f, x, 0) = f
      if (!isExpr(e)) return Q(0n);
      const name = args[1] ? symName(args[1], s) : null;
      if (name && !freeVars(e).includes(name)) return Q(0n);
      const call = { k: "call", name: "diff", args: [e.ast, ...args.slice(1).map((a) => toAst(value(a, s)))] };
      // Exact by the rules where possible (then evaluated numerically), numeric otherwise.
      const exact = M.expandDiff(call);
      return exact ? value(exact, s) : { t: "expr", ast: call };
    },
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
    apply: ([f, l], s) => {
      const list = value(l, s);
      return f.k === "id" ? call({ k: "call", name: f.name, args: items(list, "apply").map(toAst) }, s)
        : callFn(value(f, s), items(list, "apply"), s);
    },
  };

  function atCall(test, a, b, s) {
    const fn = global.StackEngine && global.StackEngine.ANSWER_TESTS[test];
    if (!fn) throw new E("unknownfunction", "Unknown function", "AT" + test);
    const ok = fn(value(a, s), value(b, s), null, {}, s);
    return { t: "list", items: [TRUE, bool(ok), { t: "str", v: "" }, { t: "str", v: "" }] };
  }

  function callFn(fn, vals, s) {
    if (fn.t === "lambda") return applyLambda(fn, vals, s);
    if (isExpr(fn) && fn.ast.k === "id") return call({ k: "call", name: fn.ast.name, args: vals.map(toAst) }, s);
    throw new E("type", "Not a function");
  }

  // makelist(e, i, a, b) / sum(e, i, a, b) / makelist(e, x, list)
  function iterate([e, v, a, b], s) {
    const name = v.name;
    const out = [];
    const frame = new Map();
    const inner = { ...s, locals: [...s.locals, frame] };
    if (b === undefined) {
      for (const x of items(value(a, s), "makelist")) { frame.set(name, x); out.push(value(e, inner)); }
      return out;
    }
    const lo = Number(M.toNum(value(a, s))), hi = Number(M.toNum(value(b, s)));
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

  // Structural functions on concrete arguments (lists, sets, symbols).
  const STRUCT_OK_EXPR = new Set(["delete", "member", "length", "first", "second", "third", "last", "rest",
    "append", "cons", "endcons", "reverse", "listp", "setp", "emptyp", "elementp", "atom", "symbolp", "numberp",
    "integerp", "stringp", "freeof", "lmax", "lmin"]);
  const STRUCT = {
    delete: ([x, l]) => ({ t: l.t, items: items(l, "delete").filter((y) => !same(x, y)) }),
    member: ([x, l]) => bool(items(l, "member").some((y) => same(x, y))),
    elementp: ([x, l]) => bool(items(l, "elementp").some((y) => same(x, y))),
    length: ([l]) => {
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
    rest: ([l, n]) => ({ t: "list", items: items(l, "rest").slice(n ? Number(M.toNum(n)) : 1) }),
    reverse: ([l]) => ({ t: "list", items: items(l, "reverse").slice().reverse() }),
    append: (ls) => ({ t: "list", items: ls.flatMap((l) => items(l, "append")) }),
    cons: ([x, l]) => ({ t: "list", items: [x, ...items(l, "cons")] }),
    endcons: ([x, l]) => ({ t: "list", items: [...items(l, "endcons"), x] }),
    setify: ([l]) => makeSet(items(l, "setify")),
    listify: ([l]) => ({ t: "list", items: items(l, "listify").slice() }),
    sort: ([l]) => ({ t: "list", items: items(l, "sort").slice().sort(M.compareValues) }),
    unique: ([l]) => ({ t: "list", items: makeSet(items(l, "unique")).items }),
    union: (ls) => makeSet(ls.flatMap((l) => items(l, "union"))),
    intersection: ([a, ...ls]) => makeSet(items(a, "intersection").filter((x) => ls.every((l) => items(l, "intersection").some((y) => same(x, y))))),
    setdifference: ([a, b]) => makeSet(items(a, "setdifference").filter((x) => !items(b, "setdifference").some((y) => same(x, y)))),
    subsetp: ([a, b]) => bool(items(a, "subsetp").every((x) => items(b, "subsetp").some((y) => same(x, y)))),
    listp: ([l]) => bool(l.t === "list"),
    setp: ([l]) => bool(l.t === "set"),
    emptyp: ([l]) => bool((l.items || []).length === 0),
    lmax: ([l]) => items(l, "lmax").reduce((a, b) => (M.toNum(b) > M.toNum(a) ? b : a)),
    lmin: ([l]) => items(l, "lmin").reduce((a, b) => (M.toNum(b) < M.toNum(a) ? b : a)),
    numberp: ([x]) => bool(M.isScalar(x)),
    integerp: ([x]) => bool(x.t === "q" && x.d === 1n),
    stringp: ([x]) => bool(x.t === "str"),
    symbolp: ([x]) => bool(isExpr(x) && x.ast.k === "id"),
    atom: ([x]) => bool(!isExpr(x) ? x.t !== "list" && x.t !== "set" && x.t !== "matrix" : x.ast.k === "id"),
    freeof: ([x, e]) => bool(!isExpr(e) || !(isExpr(x) && x.ast.k === "id" && freeVars(e).includes(x.ast.name))),
    num: ([x]) => (x.t === "q" ? Q(x.n) : x),
    denom: ([x]) => (x.t === "q" ? Q(x.d) : Q(1n)),
  };

  function runFor(loop, s) {
    const frame = s.locals[s.locals.length - 1];
    const setVar = (v) => frame.set(loop.var, v);
    const ok = () => (!loop.while || truth(value(loop.while, s))) && (!loop.unless || !truth(value(loop.unless, s)));
    if (loop.in) {
      for (const x of items(value(loop.in, s), "for ... in")) { setVar(x); if (!ok()) break; value(loop.body, s); }
      return;
    }
    let i = loop.from ? value(loop.from, s) : Q(1n);
    const step = loop.step ? value(loop.step, s) : Q(1n);
    const thru = loop.thru ? value(loop.thru, s) : null;
    for (let guard = 0; guard < 10000; guard++) {
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

  global.Peval = { scope, value, exec, toAst, same, isExpr, symbolic, freeVars };
})(typeof window !== "undefined" ? window : globalThis);
