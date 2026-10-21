/*
 * A small subset of Maxima, as STACK uses it on student answers:
 *   parse(text, opts)  -> AST            (STACK input syntax: insertstars, floats, lists, ...)
 *   latex(ast, opts)   -> LaTeX string   (validation display, simp:false style)
 *   evaluate(ast, env) -> value          (exact rationals where possible, otherwise floats)
 *   algEquiv(a, b, env)                  (STACK's AlgEquiv: exact for constants,
 *                                         random points for expressions with variables)
 *
 * This is not a CAS.  Answer tests that need real symbolic work on the student's
 * answer get a per-question JS function instead (see CLAUDE.md).
 */
(function (global) {
  "use strict";

  // ------------------------------------------------------------------ errors

  class MaximaError extends Error {
    constructor(code, message, detail) {
      super(message);
      this.code = code;       // machine-readable reason (used for Hebrew messages)
      this.detail = detail;   // e.g. the offending token
    }
  }

  // ------------------------------------------------------------------ tokenizer

  const OPERATORS = ["**", "^^", "<=", ">=", ":=", "^", "*", "/", "+", "-", "(", ")", "[", "]", "{", "}",
                     ",", ":", "=", "#", "<", ">", ";", "$", "!", ".", "'"];

  function tokenize(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (/\s/.test(c)) {
        // Remember whitespace: "2 x" is an error unless insertstars allows spaces.
        if (tokens.length) {
          tokens[tokens.length - 1].spaceAfter = true;
          if (c === "\n") tokens[tokens.length - 1].newlineAfter = true;
        }
        i++;
        continue;
      }
      if (text.startsWith("/*", i)) {          // comment (teacher code)
        const end = text.indexOf("*/", i + 2);
        i = end < 0 ? text.length : end + 2;
        continue;
      }
      let m;
      const rest = text.slice(i);
      if ((m = /^(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/.exec(rest)) && !/^\.\D/.test(rest)) {
        const t = m[0];
        tokens.push({ type: "num", value: t, isFloat: /[.eE]/.test(t), pos: i });
        i += t.length;
        continue;
      }
      if ((m = /^[A-Za-z%_Ͱ-Ͽ][A-Za-z0-9_%Ͱ-Ͽ]*/.exec(rest))) {
        tokens.push({ type: "id", value: m[0], pos: i });
        i += m[0].length;
        continue;
      }
      if (c === '"') {
        let j = i + 1, s = "";
        while (j < text.length && text[j] !== '"') {
          if (text[j] === "\\" && j + 1 < text.length) j++;
          s += text[j++];
        }
        if (j >= text.length) throw new MaximaError("unclosedstring", "Unclosed string");
        tokens.push({ type: "str", value: s, pos: i });
        i = j + 1;
        continue;
      }
      const op = OPERATORS.find((o) => rest.startsWith(o));
      if (op) {
        tokens.push({ type: "op", value: op === "**" ? "^" : op, pos: i });
        i += op.length;
        continue;
      }
      throw new MaximaError("badchar", "Unexpected character", c);
    }
    return tokens;
  }

  // Implied multiplication: "2x", "2(x+1)", "(a)(b)", "(a)x", "x y" ...
  function insertStars(tokens, insertstars) {
    const out = [];
    const allowSpaces = insertstars >= 3;
    const allowStars = insertstars === 1 || insertstars === 2 || insertstars >= 4;
    // Words that are operators, never operands: "x>=2 and x<=5" is not "2*and".
    const KEYWORD = new Set(["and", "or", "not", "then", "else", "elseif", "if", "do", "for", "in", "thru", "step", "while", "unless"]);
    const operand = (t) => t.type === "id" && !KEYWORD.has(t.value);
    for (let k = 0; k < tokens.length; k++) {
      const t = tokens[k];
      const prev = out[out.length - 1];
      if (prev) {
        const endsOperand = prev.type === "num" || operand(prev) || prev.type === "str" ||
          (prev.type === "op" && (prev.value === ")" || prev.value === "]" || prev.value === "!"));
        const startsOperand = t.type === "num" || operand(t) || t.type === "str" ||
          (t.type === "op" && t.value === "(");
        // id followed directly by "(" is a function call, not a product.
        const isCall = prev.type === "id" && t.type === "op" && t.value === "(" && !prev.spaceAfter;
        if (endsOperand && startsOperand && !isCall) {
          if (prev.spaceAfter) {
            if (!allowSpaces) throw new MaximaError("spaces", "Illegal spaces", prev.value + " " + t.value);
          } else if (!allowStars) {
            throw new MaximaError("missingstars", "Missing *", prev.value + t.value);
          }
          out.push({ type: "op", value: "*", pos: t.pos, implied: true });
        }
      }
      out.push(t);
    }
    return out;
  }

  // ------------------------------------------------------------------ parser (Pratt)

  // Binding powers follow Maxima's operator precedences.
  const INFIX = {
    ":": [180, 20, "right"], ":=": [180, 20, "right"],
    or: [60, 60], and: [65, 65],
    "=": [80, 80], "#": [80, 80], "<": [80, 80], ">": [80, 80], "<=": [80, 80], ">=": [80, 80],
    "+": [100, 100], "-": [100, 100],
    "*": [120, 120], "/": [120, 120], ".": [130, 129],
    "^": [140, 139, "right"], "^^": [140, 139, "right"],
  };

  function parse(text, opts) {
    opts = opts || {};
    let tokens = tokenize(text);
    if (!tokens.length) throw new MaximaError("empty", "Empty");
    // Teacher code (question variables, PRTs) is plain Maxima: no implied multiplication.
    if (!opts.teacher) tokens = insertStars(tokens, opts.insertstars ?? 1);
    let p = 0;
    const peek = () => tokens[p];
    const next = () => tokens[p++];
    const isOp = (t, v) => t && t.type === "op" && t.value === v;
    const isWord = (t, v) => t && t.type === "id" && t.value === v;
    const expectWord = (v) => {
      const t = next();
      if (!isWord(t, v)) throw new MaximaError("syntax", "Expected " + v, t ? t.value : "end");
    };

    // if c then a elseif c2 then b else d   (no else: false, as in Maxima)
    function parseIf() {
      const cond = expr(0);
      expectWord("then");
      const then = expr(0);
      let otherwise = { k: "id", name: "false" };
      if (isWord(peek(), "elseif")) { next(); otherwise = parseIf(); }
      else if (isWord(peek(), "else")) { next(); otherwise = expr(0); }
      return { k: "if", cond, then, else: otherwise };
    }

    // for i:a [step s] [thru b] [while c] [unless c] do body   |   for x in list do body
    function parseFor() {
      const v = next();
      if (!v || v.type !== "id") throw new MaximaError("syntax", "Expected a loop variable");
      const loop = { k: "for", var: v.value };
      if (isOp(peek(), ":")) { next(); loop.from = expr(0); }
      else if (isWord(peek(), "in")) { next(); loop.in = expr(0); }
      for (let t; (t = peek()) && t.type === "id" && ["step", "thru", "while", "unless"].includes(t.value);) {
        next();
        loop[t.value] = expr(0);
      }
      expectWord("do");
      loop.body = expr(0);
      return loop;
    }

    function expect(v) {
      const t = next();
      if (!isOp(t, v)) throw new MaximaError("syntax", "Expected " + v, t ? t.value : "end");
    }

    function list(close) {
      const items = [];
      if (isOp(peek(), close)) { next(); return items; }
      for (;;) {
        items.push(expr(0));
        const t = next();
        if (isOp(t, close)) return items;
        if (!isOp(t, ",")) throw new MaximaError("syntax", "Expected , or " + close, t ? t.value : "end");
      }
    }

    function prefix() {
      const t = next();
      if (!t) throw new MaximaError("syntax", "Unexpected end");
      if (t.type === "num") return { k: "num", value: t.value, isFloat: t.isFloat };
      if (t.type === "str") return { k: "str", value: t.value };
      if (t.type === "id") {
        if (t.value === "not") return { k: "not", arg: expr(70) };
        if (t.value === "if" && opts.teacher) return parseIf();
        if (t.value === "for" && opts.teacher) return parseFor();
        // Teacher code is plain Maxima, where "is (x)" is a call too.
        if (isOp(peek(), "(") && (!t.spaceAfter || opts.teacher)) { next(); return { k: "call", name: t.value, args: list(")") }; }
        return { k: "id", name: t.value };
      }
      if (isOp(t, "-")) return { k: "neg", arg: expr(100) };
      if (isOp(t, "+")) return expr(100);
      if (isOp(t, "(")) {
        const items = list(")");
        if (!items.length) throw new MaximaError("syntax", "Empty parentheses");
        return items.length === 1 ? { k: "paren", arg: items[0] } : { k: "seq", items };   // (a, b, c)
      }
      if (isOp(t, "[")) return { k: "list", items: list("]") };
      if (isOp(t, "{")) return { k: "set", items: list("}") };
      // quote: 'diff(y,x) is a noun, kept unevaluated until ev(..., nouns) (peval.js);
      // numerically it is the same expression
      if (isOp(t, "'")) { const e = prefix(); return e.k === "call" ? { ...e, noun: true } : e; }
      throw new MaximaError("syntax", "Unexpected " + t.value, t.value);
    }

    function expr(minbp) {
      let left = prefix();
      for (;;) {
        const t = peek();
        if (!t) break;
        if (isOp(t, "[")) {          // indexing a[i] / a[i,j]
          next();
          left = { k: "index", target: left, indices: list("]") };
          continue;
        }
        if (isOp(t, "!")) {
          if (160 < minbp) break;
          next();
          left = { k: "call", name: "factorial", args: [left] };
          continue;
        }
        const name = t.type === "op" ? t.value : (isWord(t, "and") || isWord(t, "or") ? t.value : null);
        const info = name && INFIX[name];
        if (!info || info[0] < minbp || (info[0] === minbp && info[2] !== "right")) break;
        next();
        let right;
        if (name === "^" && isOp(peek(), "-")) { next(); right = { k: "neg", arg: expr(info[1]) }; }
        else right = expr(info[2] === "right" ? info[1] : info[0] + 1);
        left = { k: "op", op: name, args: [left, right] };
      }
      return left;
    }

    const statements = [];
    while (p < tokens.length) {
      statements.push(expr(0));
      if (p < tokens.length) {
        // A statement that ends a line without ";" (feedback variables that work in STACK).
        if (opts.multiple && opts.teacher && tokens[p - 1].newlineAfter && !isOp(peek(), ";") && !isOp(peek(), "$")) continue;
        const t = next();
        if (!isOp(t, ";") && !isOp(t, "$")) throw new MaximaError("syntax", "Unexpected " + t.value, t.value);
      }
    }
    if (opts.multiple) return statements;
    if (statements.length !== 1) throw new MaximaError("syntax", "Expected one expression");
    return statements[0];
  }

  // ------------------------------------------------------------------ AST helpers

  // Visit every node: children are AST objects (with .k) or arrays of them.
  function walk(ast, fn) {
    fn(ast);
    for (const key in ast) {
      const v = ast[key];
      if (Array.isArray(v)) v.forEach((a) => { if (a && a.k) walk(a, fn); });
      else if (v && typeof v === "object" && v.k) walk(v, fn);
    }
  }

  function identifiers(ast) {
    const out = new Set();
    walk(ast, (n) => { if (n.k === "id") out.add(n.name); });
    return out;
  }

  function hasFloat(ast) {
    let found = false;
    walk(ast, (n) => { if (n.k === "num" && n.isFloat) found = true; });
    return found;
  }

  function functionsUsed(ast) {
    const out = new Set();
    walk(ast, (n) => { if (n.k === "call") out.add(n.name); });
    return out;
  }

  // Student input conventions in STACK: pi -> %pi, e -> %e, i -> %i, ln -> log.
  function studentNormalise(ast) {
    const ALIAS = { pi: "%pi", e: "%e", i: "%i" };
    walk(ast, (n) => {
      if (n.k === "id" && ALIAS[n.name]) n.name = ALIAS[n.name];
      if (n.k === "call" && n.name === "ln") n.name = "log";
    });
    return ast;
  }

  // ------------------------------------------------------------------ LaTeX

  const GREEK = new Set(["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota",
    "kappa", "lambda", "mu", "nu", "xi", "rho", "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega",
    "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega"]);
  const TEX_FUNCS = new Set(["sin", "cos", "tan", "sec", "csc", "cot", "sinh", "cosh", "tanh", "coth",
    "exp", "log", "ln", "arg", "det", "min", "max", "gcd"]);
  const PREC = { ":": 20, or: 60, and: 65, "=": 80, "#": 80, "<": 80, ">": 80, "<=": 80, ">=": 80,
    "+": 100, "-": 100, neg: 100, "*": 120, "/": 120, ".": 130, "^": 140, "^^": 140 };

  function precOf(ast) {
    if (ast.k === "op") return PREC[ast.op];
    if (ast.k === "neg") return PREC.neg;
    if (ast.k === "num" && ast.value.startsWith("-")) return PREC.neg;
    return 1000;
  }

  function idLatex(name, opts) {
    if (name === "%pi") return "\\pi ";
    if (name === "%e") return "e";
    if (name === "%i") return opts.complexno === "j" ? "\\mathrm{j}" : "\\mathrm{i}";
    if (name === "inf") return "\\infty ";
    if (GREEK.has(name)) return "\\" + name + " ";
    const m = /^([A-Za-z]+)_?(\d+)$/.exec(name);
    if (m) return idLatex(m[1], opts) + "_{" + m[2] + "}";
    if (name.length === 1) return name;
    return "{\\it " + name.replace(/_/g, "\\_") + "}";
  }

  function latex(ast, opts) {
    opts = opts || {};
    const L = (a) => latex(a, opts);
    const wrap = (a, prec) => (precOf(a) < prec ? "\\left(" + L(a) + "\\right)" : L(a));
    switch (ast.k) {
      case "num": return ast.value;
      case "str": return "\\mbox{" + ast.value + "}";
      case "id": return idLatex(ast.name, opts);
      case "paren": return "\\left(" + L(ast.arg) + "\\right)";
      case "neg": return "-" + wrap(ast.arg, PREC.neg + 1);
      case "not": return "\\neg " + wrap(ast.arg, 70);
      case "list": return "\\left[ " + ast.items.map(L).join(" , ") + " \\right] ";
      case "set": return "\\left \\{" + ast.items.map(L).join(" , ") + "\\right \\}";
      case "seq": return "\\left(" + ast.items.map(L).join(" , ") + "\\right)";
      case "index": return wrap(ast.target, 1000) + "_{" + ast.indices.map(L).join(",") + "}";
      case "call": return callLatex(ast, opts);
      case "op": {
        const [a, b] = ast.args;
        const p = PREC[ast.op];
        switch (ast.op) {
          case "/": return "\\frac{" + L(stripParen(a)) + "}{" + L(stripParen(b)) + "}";
          case "^": return "{" + wrap(a, p + 1) + "}^{" + L(stripParen(b)) + "}";
          case "^^": return "{" + wrap(a, p + 1) + "}^{\\langle " + L(stripParen(b)) + "\\rangle}";
          case "*": return wrap(a, p) + mulSign(a, b, opts) + wrap(b, p + 1);
          case "+": return wrap(a, p) + "+" + wrap(b, p + 1);
          case "-": return wrap(a, p) + "-" + wrap(b, p + 1);
          case ".": return wrap(a, p) + "\\cdot " + wrap(b, p + 1);
          case "<=": return wrap(a, p + 1) + "\\leq " + wrap(b, p + 1);
          case ">=": return wrap(a, p + 1) + "\\geq " + wrap(b, p + 1);
          case "#": return wrap(a, p + 1) + "\\neq " + wrap(b, p + 1);
          case "and": return wrap(a, p) + "\\,{\\mbox{ and }}\\, " + wrap(b, p + 1);
          case "or": return wrap(a, p) + "\\,{\\mbox{ or }}\\, " + wrap(b, p + 1);
          default: return wrap(a, p + 1) + ast.op + wrap(b, p + 1);
        }
      }
    }
    return "?";
  }

  function stripParen(a) { return a.k === "paren" ? a.arg : a; }

  function mulSign(a, b, opts) {
    const numeric = (x) => x.k === "num" || (x.k === "op" && x.op === "^" && x.args[0].k === "num");
    const sign = opts.multiplicationsign || "dot";
    if (sign === "cross") return "\\times ";
    if (sign === "dot" || numeric(b) || (numeric(a) && b.k === "neg")) return "\\cdot ";
    if (sign === "onum") return numeric(a) ? "\\," : "\\cdot ";
    return "\\,";
  }

  function callLatex(ast, opts) {
    const L = (a) => latex(a, opts);
    const args = ast.args;
    // STACK's intervals: oo(a,b) is (a,b), cc [a,b], oc (a,b], co [a,b)
    const BRACKETS = { oo: ["(", ")"], cc: ["[", "]"], oc: ["(", "]"], co: ["[", ")"] };
    if (BRACKETS[ast.name] && args.length === 2) {
      const [l, r] = BRACKETS[ast.name];
      return "\\left" + l + " " + L(args[0]) + ",\\, " + L(args[1]) + "\\right" + r;
    }
    const user = opts.texput && opts.texput[ast.name];
    if (user) return typeof user === "function" ? user(args.map(L))
      : args.map(L).reduce((t, a, i) => t.split("{" + i + "}").join(a), user);
    switch (ast.name) {
      case "sqrt": return "\\sqrt{" + L(args[0]) + "}";
      case "abs": return "\\left| " + L(args[0]) + "\\right| ";
      case "exp": return "e^{" + L(args[0]) + "}";
      case "log": return "\\ln \\left( " + L(args[0]) + "\\right)";
      case "factorial": return L(args[0]) + "!";
      case "matrix": {
        const open = { "[": "\\left[", "(": "\\left(", "{": "\\left\\{", "|": "\\left|", "": "\\left." }[opts.matrixparens ?? "["];
        const close = { "[": "\\right]", "(": "\\right)", "{": "\\right\\}", "|": "\\right|", "": "\\right." }[opts.matrixparens ?? "["];
        const rows = args.map((r) => (r.k === "list" ? r.items : [r]).map(L).join(" & "));
        return open + "\\begin{array}{" + "c".repeat(Math.max(1, ...args.map((r) => (r.items || [r]).length))) + "} " +
          rows.join(" \\\\ ") + " \\end{array}" + close;
      }
    }
    const inv = /^a(sin|cos|tan|sec|csc|cot|sinh|cosh|tanh)$/.exec(ast.name);
    if (inv) return "\\" + inv[1] + "^{-1}\\left( " + args.map(L).join(" , ") + "\\right)";
    const head = TEX_FUNCS.has(ast.name) ? "\\" + ast.name + " " : idLatex(ast.name, opts);
    return head + "\\left( " + args.map(L).join(" , ") + "\\right)";
  }

  // ------------------------------------------------------------------ values

  // Exact rationals with BigInt; floats as numbers.
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  function Q(n, d = 1n) {
    if (d === 0n) throw new MaximaError("divzero", "Division by zero");
    if (d < 0n) { n = -n; d = -d; }
    const g = gcd(n, d) || 1n;
    return { t: "q", n: n / g, d: d / g };
  }
  const F = (v) => ({ t: "f", v });
  const toNum = (x) => (x.t === "q" ? Number(x.n) / Number(x.d) : x.t === "f" ? x.v : NaN);
  const isScalar = (x) => x.t === "q" || x.t === "f";

  // Complex numbers {t: "c", re, im} with real parts (exact rationals or floats); an exactly
  // zero imaginary part gives the real number back.  Only %i (the student's i) makes them:
  // real functions stay real (sqrt(-1) is not a number), so real questions are unchanged.
  const isZeroQ = (x) => x.t === "q" && x.n === 0n;
  const C = (re, im) => (isZeroQ(im) || (im.t === "f" && im.v === 0) ? re : { t: "c", re, im });
  const isNumber = (x) => isScalar(x) || x.t === "c";
  const reOf = (x) => (x.t === "c" ? x.re : x);
  const imOf = (x) => (x.t === "c" ? x.im : Q(0n));
  const cabs = (x) => Math.hypot(toNum(reOf(x)), toNum(imOf(x)));

  function complexArith(op, a, b) {
    const ar = reOf(a), ai = imOf(a), br = reOf(b), bi = imOf(b);
    const A = (o, x, y) => arith(o, x, y);
    switch (op) {
      case "+": case "-": return C(A(op, ar, br), A(op, ai, bi));
      case "*": return C(A("-", A("*", ar, br), A("*", ai, bi)), A("+", A("*", ar, bi), A("*", ai, br)));
      case "/": {
        const d = A("+", A("*", br, br), A("*", bi, bi));
        if (isZeroQ(d) || (d.t === "f" && d.v === 0)) throw new MaximaError("divzero", "Division by zero");
        return C(A("/", A("+", A("*", ar, br), A("*", ai, bi)), d), A("/", A("-", A("*", ai, br), A("*", ar, bi)), d));
      }
      case "^": {
        if (b.t === "q" && b.d === 1n && (b.n < 0n ? -b.n : b.n) <= 1000n) {     // exact by squaring
          let e = b.n < 0n ? -b.n : b.n, r = Q(1n), base = a;
          while (e > 0n) { if (e & 1n) r = complexArith("*", r, base); base = complexArith("*", base, base); e >>= 1n; }
          return b.n < 0n ? complexArith("/", Q(1n), r) : r;
        }
        // principal value: exp(b log a)
        const m = cabs(a), th = Math.atan2(toNum(ai), toNum(ar));
        if (m === 0) return F(0);
        const lr = Math.log(m), x = toNum(br), y = toNum(bi);
        const R = Math.exp(x * lr - y * th), T = y * lr + x * th;
        return C(F(R * Math.cos(T)), F(R * Math.sin(T)));
      }
    }
    throw new MaximaError("type", "Unknown operator " + op);
  }

  function parseNumber(text) {
    if (/^\d+$/.test(text)) return Q(BigInt(text));
    return F(parseFloat(text));
  }

  function arith(op, a, b) {
    if (a.t === "list" || b.t === "list") return listArith(op, a, b);
    if (a.t === "matrix" || b.t === "matrix") return matrixArith(op, a, b);
    if ((a.t === "c" || b.t === "c") && isNumber(a) && isNumber(b)) return complexArith(op, a, b);
    if (!isScalar(a) || !isScalar(b)) throw new MaximaError("type", "Not a number");
    if (a.t === "q" && b.t === "q") {
      switch (op) {
        case "+": return Q(a.n * b.d + b.n * a.d, a.d * b.d);
        case "-": return Q(a.n * b.d - b.n * a.d, a.d * b.d);
        case "*": return Q(a.n * b.n, a.d * b.d);
        case "/": return Q(a.n * b.d, a.d * b.n);
        case "^":
          if (b.d === 1n && (b.n < 0n ? -b.n : b.n) <= 1000n) {
            const e = b.n < 0n ? -b.n : b.n;
            const r = Q(a.n ** e, a.d ** e);
            return b.n < 0n ? Q(r.d, r.n) : r;
          }
      }
    }
    const x = toNum(a), y = toNum(b);
    // Real odd roots, as in Maxima: (-8)^(1/3) = -2, (-8)^(2/3) = 4.
    if (op === "^" && x < 0 && b.t === "q" && b.d % 2n === 1n) {
      const r = Math.pow(-x, Number(b.n) / Number(b.d));
      return F(b.n % 2n === 0n ? r : -r);
    }
    switch (op) {
      case "+": return F(x + y);
      case "-": return F(x - y);
      case "*": return F(x * y);
      case "/": if (y === 0) throw new MaximaError("divzero", "Division by zero"); return F(x / y);
      case "^": return F(Math.pow(x, y));
    }
    throw new MaximaError("type", "Unknown operator " + op);
  }

  function listArith(op, a, b) {
    if (a.t === "list" && b.t === "list") {
      if (a.items.length !== b.items.length) throw new MaximaError("type", "List lengths differ");
      return { t: "list", items: a.items.map((x, i) => arith(op, x, b.items[i])) };
    }
    if (a.t === "list") return { t: "list", items: a.items.map((x) => arith(op, x, b)) };
    return { t: "list", items: b.items.map((y) => arith(op, a, y)) };
  }

  function matrixArith(op, a, b) {
    if (a.t === "matrix" && b.t === "matrix") {
      if (a.rows.length !== b.rows.length || a.rows[0].length !== b.rows[0].length)
        throw new MaximaError("type", "Matrix sizes differ");
      return { t: "matrix", rows: a.rows.map((r, i) => r.map((x, j) => arith(op, x, b.rows[i][j]))) };
    }
    if (a.t === "matrix") return { t: "matrix", rows: a.rows.map((r) => r.map((x) => arith(op, x, b))) };
    return { t: "matrix", rows: b.rows.map((r) => r.map((y) => arith(op, a, y))) };
  }

  // Maxima's ".": matrix product; a list is a row on the left and a column on the right,
  // and list.list is the dot product.  With a scalar it is ordinary multiplication.
  function matmul(a, b) {
    if (isNumber(a) || isNumber(b)) return arith("*", a, b);
    if (a.t === "list" && b.t === "list") {
      if (a.items.length !== b.items.length) throw new MaximaError("type", "Bad dot product");
      return a.items.reduce((s, x, i) => arith("+", s, arith("*", x, b.items[i])), Q(0n));
    }
    if (a.t === "list") a = { t: "matrix", rows: [a.items] };
    if (b.t === "list") b = { t: "matrix", rows: b.items.map((x) => [x]) };
    // Two columns (or two rows) of the same length: Maxima takes the dot product.
    if (a.t === "matrix" && b.t === "matrix" && a.rows.length === b.rows.length && a.rows[0].length === b.rows[0].length
        && (a.rows[0].length === 1 || a.rows.length === 1) && a.rows.flat().length > 1) {
      const x = a.rows.flat(), y = b.rows.flat();
      return x.reduce((acc, xi, i) => arith("+", acc, arith("*", xi, y[i])), Q(0n));
    }
    if (a.t !== "matrix" || b.t !== "matrix" || a.rows[0].length !== b.rows.length)
      throw new MaximaError("type", "Bad matrix product");
    const rows = a.rows.map((r) => b.rows[0].map((_, j) =>
      r.reduce((s, x, k) => arith("+", s, arith("*", x, b.rows[k][j])), Q(0n))));
    // Maxima's scalarmatrixp (true by default): a 1×1 product is a scalar.
    return rows.length === 1 && rows[0].length === 1 ? rows[0][0] : { t: "matrix", rows };
  }

  // a^^n: non-commutative power (repeated "."), a^^0 is the identity.
  function matpow(a, n) {
    if (a.t !== "matrix") return arith("^", a, n);
    if (n.t !== "q" || n.d !== 1n) throw new MaximaError("type", "Matrix power needs a whole number");
    let k = n.n;
    if (k < 0n) { a = callValue("invert", [a]); k = -k; }
    let r = callValue("ident", [Q(BigInt(a.rows.length))]);
    for (let i = 0n; i < k; i++) r = matmul(r, a);
    return r;
  }

  const REAL_FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    sech: (x) => 1 / Math.cosh(x), csch: (x) => 1 / Math.sinh(x), coth: (x) => 1 / Math.tanh(x),
    exp: Math.exp, log: Math.log, abs: Math.abs, floor: Math.floor, ceiling: Math.ceil,
    signum: Math.sign, unit_step: (x) => (x > 0 ? 1 : 0), heaviside: (x) => (x > 0 ? 1 : x < 0 ? 0 : 0.5),
  };

  // Γ(x) (Lanczos, g=7) and the upper incomplete gamma Γ(a,z): a closed form for whole
  // a ≥ 1, otherwise the series / continued fraction of Numerical Recipes (gser, gcf).
  const LANCZOS = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  function gammaFn(x) {
    if (Number.isInteger(x) && x >= 1 && x <= 171) { let r = 1; for (let k = 2; k < x; k++) r *= k; return r; }
    if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gammaFn(1 - x));
    x -= 1;
    let a = LANCZOS[0];
    const t = x + 7.5;
    for (let i = 1; i < 9; i++) a += LANCZOS[i] / (x + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(t, x + 0.5) * Math.exp(-t) * a;
  }
  function upperGamma(a, z) {
    if (Number.isInteger(a) && a >= 1) {
      let term = 1, sum = 1;
      for (let k = 1; k < a; k++) { term *= z / k; sum += term; }
      return gammaFn(a) * Math.exp(-z) * sum;
    }
    if (!(a > 0) || !(z >= 0)) return NaN;
    const front = Math.exp(-z + a * Math.log(z));
    if (z < a + 1) {
      let ap = a, del = 1 / a, sum = del;
      for (let n = 0; n < 1000 && Math.abs(del) > Math.abs(sum) * 1e-16; n++) { ap += 1; del *= z / ap; sum += del; }
      return gammaFn(a) - sum * front;
    }
    let b = z + 1 - a, c = 1e300, d = 1 / b, h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-16) break;
    }
    return front * h;
  }

  // ------------------------------------------------------------------ linear algebra
  // Maxima's matrix functions on concrete matrices: exact with rationals, with a
  // tolerance when there are floats.  A list stands for a column where Maxima would
  // take a column (addcol(M, [1,2]), apply(addcol, [[1,2],[3,4]])).

  const isMatrix = (m) => m && m.t === "matrix";
  const asMatrix = (m, what) => {
    if (isMatrix(m)) return m;
    throw new MaximaError("type", `${what} needs a matrix`);
  };
  const asColumn = (v) => (v.t === "list" ? { t: "matrix", rows: v.items.map((x) => [x]) } : v);
  const asRow = (v) => (v.t === "list" ? { t: "matrix", rows: [v.items.slice()] } : v);
  const intArg = (x, what) => {
    if (x.t !== "q" || x.d !== 1n) throw new MaximaError("type", `${what} needs a whole number`);
    return Number(x.n);
  };
  const ZERO_Q = Q(0n), ONE_Q = Q(1n);
  const filled = (m, n, f) => ({ t: "matrix", rows: Array.from({ length: m }, (_, i) => Array.from({ length: n }, (_, j) => f(i, j))) });

  // Is x zero?  Exact for rationals; floats relative to the size of the matrix entries.
  function nearZero(x, scale) {
    if (x.t === "q") return x.n === 0n;
    if (x.t === "f") return Math.abs(x.v) <= 1e-9 * Math.max(1, scale);
    if (x.t === "c") return nearZero(x.re, scale) && nearZero(x.im, scale);
    throw new MaximaError("unknown", "Not a number");
  }
  const scaleOf = (rows) => Math.max(0, ...rows.flat().map((x) => (x.t === "c" ? cabs(x) : Math.abs(toNum(x)))));
  const exactNum = (x) => x.t === "q" || (x.t === "c" && x.re.t === "q" && x.im.t === "q");

  // Gaussian elimination.  mode "echelon": leading 1s, zeros below (Maxima's echelon);
  // "rref": also zeros above.  -> {rows, pivots (column of each pivot row), det}
  function rowReduce(m, mode) {
    const rows = m.rows.map((r) => r.slice());
    const nr = rows.length, nc = nr ? rows[0].length : 0;
    const scale = scaleOf(rows);
    const exact = rows.every((r) => r.every(exactNum));
    const pivots = [];
    let det = ONE_Q, r = 0;
    for (let c = 0; c < nc && r < nr; c++) {
      let p = -1;
      for (let i = r; i < nr; i++) {
        if (nearZero(rows[i][c], scale)) continue;
        if (p < 0 || (!exact && cabs(rows[i][c]) > cabs(rows[p][c]))) p = i;
        if (exact) break;
      }
      if (p < 0) { det = ZERO_Q; continue; }
      if (p !== r) { [rows[p], rows[r]] = [rows[r], rows[p]]; det = arith("*", det, Q(-1n)); }
      const lead = rows[r][c];
      det = arith("*", det, lead);
      rows[r] = rows[r].map((x) => arith("/", x, lead));
      for (let i = mode === "rref" ? 0 : r + 1; i < nr; i++) {
        if (i === r || nearZero(rows[i][c], scale)) continue;
        const f = rows[i][c];
        rows[i] = rows[i].map((x, j) => arith("-", x, arith("*", f, rows[r][j])));
        if (!exact) rows[i][c] = F(0);
      }
      pivots.push(c);
      r++;
    }
    if (r < nr) det = ZERO_Q;
    return { rows, pivots, det };
  }

  function determinant(m) {
    if (m.rows.length !== m.rows[0].length) throw new MaximaError("type", "determinant needs a square matrix");
    if (m.rows.every((r) => r.every(exactNum))) return rowReduce(m, "echelon").det;
    // Floats: each column scaled to entries of size 1 first.  Columns of very different
    // sizes (a Wronskian of e^(4x), e^(-4x), 1 at x=3: 1.6e5 and 6e-6) would otherwise
    // fall under the zero threshold of the largest entry, and the determinant came out 0.
    const n = m.rows.length;
    const sizes = Array.from({ length: n }, (_, j) => Math.max(...m.rows.map((r) => (r[j].t === "c" ? cabs(r[j]) : Math.abs(toNum(r[j]))))));
    if (sizes.some((x) => !(x > 0) || !isFinite(x))) return rowReduce(m, "echelon").det;
    const scaled = { t: "matrix", rows: m.rows.map((r) => r.map((x, j) => arith("/", x, F(sizes[j])))) };
    return arith("*", rowReduce(scaled, "echelon").det, F(sizes.reduce((a, b) => a * b, 1)));
  }

  // Characteristic polynomial det(x*I - M) as coefficients [c0, c1, ..., cn = 1]
  // (Faddeev–LeVerrier, exact with rationals).
  function charCoeffs(m) {
    const n = m.rows.length;
    if (n !== m.rows[0].length) throw new MaximaError("type", "Needs a square matrix");
    const I = filled(n, n, (i, j) => (i === j ? ONE_Q : ZERO_Q));
    const c = new Array(n + 1);
    c[n] = ONE_Q;
    let Mk = filled(n, n, () => ZERO_Q);
    for (let k = 1; k <= n; k++) {
      Mk = matrixArith("+", matmul(m, Mk), matrixArith("*", I, c[n - k + 1]));
      const AM = matmul(m, Mk);
      let tr = ZERO_Q;
      for (let i = 0; i < n; i++) tr = arith("+", tr, AM.rows[i][i]);
      c[n - k] = arith("/", tr, Q(BigInt(-k)));
    }
    return c;
  }

  // Real roots of a polynomial (coefficients low to high) with multiplicities: rational
  // roots exactly, a remaining quadratic by the formula, anything else is unsupported.
  function polyRoots(coeffs) {
    let p = coeffs.slice();
    const roots = [];
    const evalAt = (poly, x) => poly.reduceRight((acc, a) => arith("+", arith("*", acc, x), a), ZERO_Q);
    const divide = (poly, x) => {       // synthetic division by (t - x)
      const out = new Array(poly.length - 1);
      let acc = ZERO_Q;
      for (let i = poly.length - 1; i > 0; i--) { acc = arith("+", arith("*", acc, x), poly[i]); out[i - 1] = acc; }
      return out;
    };
    const add = (x) => {
      const k = roots.findIndex((r) => valuesEqual(r.value, x, 1e-9));
      if (k >= 0) roots[k].mult++; else roots.push({ value: x, mult: 1 });
    };
    while (p.length > 1 && nearZero(p[0], 1)) { add(ZERO_Q); p = p.slice(1); }
    if (p.every((x) => x.t === "q")) {
      // integer coefficients, then candidates ±(divisor of a0)/(divisor of an)
      const l = p.reduce((acc, x) => { const g = gcd(acc, x.d); return acc / g * x.d; }, 1n);
      const ints = p.map((x) => x.n * (l / x.d));
      const divisors = (n) => {
        n = n < 0n ? -n : n;
        if (n > 10n ** 12n) return [];
        const out = [];
        for (let d = 1n; d * d <= n; d++) if (n % d === 0n) { out.push(d); if (d * d !== n) out.push(n / d); }
        return out;
      };
      const cands = [];
      for (const a of divisors(ints[0])) for (const b of divisors(ints[ints.length - 1])) cands.push(Q(a, b), Q(-a, b));
      for (const x of cands) {
        while (p.length > 1 && nearZero(evalAt(p, x), 1)) { add(x); p = divide(p, x); }
      }
    }
    if (p.length === 2) add(arith("/", arith("*", Q(-1n), p[0]), p[1]));
    else if (p.length === 3) {
      const [c0, b, a] = p;
      const Dv = arith("-", arith("*", b, b), arith("*", Q(4n), arith("*", a, c0)));
      if ([a, b, c0].some((x) => x.t === "c")) {         // complex coefficients: principal sqrt
        const s = complexArith("^", Dv, Q(1n, 2n)), den = arith("*", Q(2n), a), mb = arith("*", Q(-1n), b);
        add(arith("/", arith("-", mb, s), den)); add(arith("/", arith("+", mb, s), den));
      } else {
        const D = toNum(Dv), A = toNum(a), B = toNum(b);
        // a conjugate pair; exact when the discriminant is a square times -1 (λ = 1 ± 2i)
        const s = D < -1e-12 ? C(Q(0n), callValue("sqrt", [arith("*", Q(-1n), Dv)])) : D <= 1e-12 ? Q(0n) : callValue("sqrt", [Dv]);
        const mb = arith("*", Q(-1n), b), den = arith("*", Q(2n), a);
        if (s.t === "f" && !(D < -1e-12)) { add(F((-B - s.v) / (2 * A))); add(F((-B + s.v) / (2 * A))); }
        else { add(arith("/", arith("-", mb, s), den)); add(arith("/", arith("+", mb, s), den)); }
      }
    } else if (p.length > 3) throw new MaximaError("unknown", "Cannot solve the characteristic polynomial");
    return roots;
  }

  // nullspace(M): span(v1, ...) as a list marked span; vectors from the free columns of
  // the reduced form, scaled to whole numbers as Maxima does.
  function nullspace(m) {
    const { rows, pivots } = rowReduce(m, "rref");
    const nc = m.rows[0].length;
    const vecs = [];
    for (let f = 0; f < nc; f++) {
      if (pivots.includes(f)) continue;
      let v = new Array(nc).fill(ZERO_Q);
      v[f] = ONE_Q;
      pivots.forEach((c, i) => { v[c] = arith("*", Q(-1n), rows[i][f]); });
      if (v.every((x) => x.t === "q")) {
        const l = v.reduce((acc, x) => { const g = gcd(acc, x.d); return acc / g * x.d; }, 1n);
        v = v.map((x) => arith("*", x, Q(l)));
      }
      vecs.push({ t: "matrix", rows: v.map((x) => [x]) });
    }
    return { t: "list", head: "span", items: vecs };
  }

  const flattenItems = (v) => (v.t === "list" || v.t === "set" ? v.items.flatMap(flattenItems) : [v]);
  const mapEntries = (v, f) => (v.t === "matrix" ? { t: "matrix", rows: v.rows.map((r) => r.map((x) => mapEntries(x, f))) }
    : v.t === "list" || v.t === "set" ? { ...v, items: v.items.map((x) => mapEntries(x, f)) } : f(v));
  const realOnly2 = (x) => { if (!isNumber(x)) throw new MaximaError("type", "Not a number"); return x; };
  const realOnly = (x) => { if (!isScalar(x) && x.t !== "bool" && x.t !== "str") throw new MaximaError("type", "Not a number"); return x; };

  const LINALG = {
    matrixp: ([m]) => ({ t: "bool", v: isMatrix(m) }),
    rank: ([m]) => {
      m = asMatrix(asColumn(m), "rank");
      // A row whose entries are lists or matrices (matrix([n, v]) with n a list, 126590):
      // Maxima says rank 1, whatever the entries, even zero ones.  Checked in Maxima 5.47.
      if (m.rows.some((r) => r.some((x) => x.t === "list" || x.t === "matrix" || x.t === "set"))) {
        if (m.rows.length === 1) return Q(1n);
        throw new MaximaError("type", "rank of a matrix of lists");
      }
      return Q(BigInt(rowReduce(m, "echelon").pivots.length));
    },
    addcol: ([m, ...cols]) => {
      let out = asMatrix(asColumn(m), "addcol");
      for (const c of cols) {
        const cm = asMatrix(asColumn(c), "addcol");
        // matrix([]) has no columns: addcol(matrix([]), v) is v (the "matrify" idiom).
        if (out.rows.every((r) => !r.length)) { out = cm; continue; }
        if (cm.rows.length !== out.rows.length) throw new MaximaError("type", "addcol: sizes differ");
        out = { t: "matrix", rows: out.rows.map((r, i) => r.concat(cm.rows[i])) };
      }
      return out;
    },
    addrow: ([m, ...rws]) => {
      let out = asMatrix(asRow(m), "addrow");
      for (const r of rws) {
        const rm = asMatrix(asRow(r), "addrow");
        if (out.rows.every((row) => !row.length)) { out = rm; continue; }
        if (rm.rows[0].length !== out.rows[0].length) throw new MaximaError("type", "addrow: sizes differ");
        out = { t: "matrix", rows: out.rows.concat(rm.rows) };
      }
      return out;
    },
    col: ([m, i]) => {
      m = asMatrix(m, "col");
      const j = intArg(i, "col") - 1;
      if (j < 0 || j >= m.rows[0].length) throw new MaximaError("index", "Bad column");
      return { t: "matrix", rows: m.rows.map((r) => [r[j]]) };
    },
    row: ([m, i]) => {
      m = asMatrix(m, "row");
      const k = intArg(i, "row") - 1;
      if (k < 0 || k >= m.rows.length) throw new MaximaError("index", "Bad row");
      return { t: "matrix", rows: [m.rows[k].slice()] };
    },
    ident: ([n]) => { const k = intArg(n, "ident"); return filled(k, k, (i, j) => (i === j ? ONE_Q : ZERO_Q)); },
    zeromatrix: ([m, n]) => filled(intArg(m, "zeromatrix"), intArg(n, "zeromatrix"), () => ZERO_Q),
    diagmatrix: ([n, x]) => { const k = intArg(n, "diagmatrix"); return filled(k, k, (i, j) => (i === j ? x : ZERO_Q)); },
    // zerofor(M): a zero matrix of the same size (a zero for a list or number)
    zerofor: ([m]) => (isMatrix(m) ? filled(m.rows.length, m.rows[0] ? m.rows[0].length : 0, () => ZERO_Q)
      : m.t === "list" ? { t: "list", items: m.items.map(() => ZERO_Q) } : ZERO_Q),
    zeromatrixp: ([m]) => ({ t: "bool", v: isMatrix(m) && m.rows.every((r) => r.every((x) => nearZero(x, 1))) }),
    determinant: ([m]) => determinant(asMatrix(m, "determinant")),
    invert: ([m]) => {
      m = asMatrix(m, "invert");
      const n = m.rows.length;
      if (n !== m.rows[0].length) throw new MaximaError("type", "invert needs a square matrix");
      const aug = { t: "matrix", rows: m.rows.map((r, i) => r.concat(Array.from({ length: n }, (_, j) => (i === j ? ONE_Q : ZERO_Q)))) };
      const { rows, pivots } = rowReduce(aug, "rref");
      if (pivots.length < n || pivots[n - 1] >= n) throw new MaximaError("divzero", "Singular matrix");
      return { t: "matrix", rows: rows.map((r) => r.slice(n)) };
    },
    echelon: ([m]) => ({ t: "matrix", rows: rowReduce(asMatrix(m, "echelon"), "echelon").rows }),
    rref: ([m]) => ({ t: "matrix", rows: rowReduce(asMatrix(m, "rref"), "rref").rows }),
    triangularize: ([m]) => ({ t: "matrix", rows: rowReduce(asMatrix(m, "triangularize"), "echelon").rows }),
    nullspace: ([m]) => nullspace(asMatrix(m, "nullspace")),
    nullity: ([m]) => Q(BigInt(nullspace(asMatrix(m, "nullity")).items.length)),
    columnspace: ([m]) => {      // span of the pivot columns of M
      m = asMatrix(m, "columnspace");
      const { pivots } = rowReduce(m, "echelon");
      return { t: "list", head: "span", items: pivots.map((c) => ({ t: "matrix", rows: m.rows.map((r) => [r[c]]) })) };
    },
    // [[values], [multiplicities]]
    eigenvalues: ([m]) => {
      const roots = polyRoots(charCoeffs(asMatrix(m, "eigenvalues")));
      return { t: "list", items: [{ t: "list", items: roots.map((r) => r.value) },
        { t: "list", items: roots.map((r) => Q(BigInt(r.mult))) }] };
    },
    eivals: (a) => LINALG.eigenvalues(a),
    // [[values, multiplicities], [[v1, v2, ...] for each value]], vectors as lists
    eigenvectors: ([m]) => {
      m = asMatrix(m, "eigenvectors");
      const roots = polyRoots(charCoeffs(m));
      const n = m.rows.length;
      const vecs = roots.map((r) => {
        const shifted = filled(n, n, (i, j) => (i === j ? arith("-", m.rows[i][j], r.value) : m.rows[i][j]));
        return { t: "list", items: nullspace(shifted).items.map((v) => ({ t: "list", items: v.rows.map((row) => row[0]) })) };
      });
      return { t: "list", items: [LINALG.eigenvalues([m]), { t: "list", items: vecs }] };
    },
    eivects: (a) => LINALG.eigenvectors(a),
    submatrix: (args) => {
      const k = args.findIndex(isMatrix);
      if (k < 0) throw new MaximaError("type", "submatrix needs a matrix");
      const m = args[k];
      const dropR = new Set(args.slice(0, k).map((x) => intArg(x, "submatrix") - 1));
      const dropC = new Set(args.slice(k + 1).map((x) => intArg(x, "submatrix") - 1));
      return { t: "matrix", rows: m.rows.filter((_, i) => !dropR.has(i)).map((r) => r.filter((_, j) => !dropC.has(j))) };
    },
    matrix_size: ([m]) => { m = asMatrix(m, "matrix_size"); return { t: "list", items: [Q(BigInt(m.rows.length)), Q(BigInt(m.rows[0].length))] }; },
    mat_trace: ([m]) => asMatrix(m, "mat_trace").rows.reduce((s, r, i) => arith("+", s, r[i]), ZERO_Q),
    args: ([v]) => {
      if (isMatrix(v)) return { t: "list", items: v.rows.map((r) => ({ t: "list", items: r.slice() })) };
      if (v.t === "list" || v.t === "set") return { t: "list", items: v.items.slice() };
      throw new MaximaError("unknown", "args of an atom");
    },
    flatten: ([v]) => ({ t: "list", items: flattenItems(v) }),
    list_matrix_entries: ([m]) => ({ t: "list", items: asMatrix(m, "list_matrix_entries").rows.flat() }),
    conjugate: ([v]) => mapEntries(v, (x) => (x.t === "c" ? C(x.re, arith("*", Q(-1n), x.im)) : realOnly(x))),
    realpart: ([v]) => mapEntries(v, (x) => (x.t === "c" ? x.re : realOnly(x))),
    imagpart: ([v]) => mapEntries(v, (x) => (x.t === "c" ? x.im : (realOnly(x), Q(0n)))),
    cabs: ([v]) => mapEntries(v, (x) => callValue("abs", [x])),
    carg: ([v]) => mapEntries(v, (x) => F(Math.atan2(toNum(imOf(realOnly2(x))), toNum(reOf(x))))),
    copymatrix: ([m]) => ({ t: "matrix", rows: asMatrix(m, "copymatrix").rows.map((r) => r.slice()) }),
    copy: ([v]) => v,
    real_numberp: ([x]) => ({ t: "bool", v: isScalar(x) }),
  };

  function callValue(name, args) {
    if (LINALG[name]) return LINALG[name](args);
    // STACK's intervals oo(a,b), cc, oc, co: compared as their kind and end points
    // (the options of a checkbox, 2818350).
    if (INTERVALS.has(name) && args.length === 2) return { t: "list", items: [{ t: "str", v: name }, ...args] };
    if (name === "matrix") {
      const rows = args.map((r) => (r.t === "list" ? r.items : [r]));
      return { t: "matrix", rows };
    }
    if (name === "sqrt") {
      const x = args[0];
      if (x.t === "q" && x.n >= 0n) {
        const rn = bigSqrt(x.n), rd = bigSqrt(x.d);
        if (rn * rn === x.n && rd * rd === x.d) return Q(rn, rd);
      }
      return F(Math.sqrt(toNum(x)));
    }
    if (name === "factorial" || name === "binomial") {
      const fact = (v) => {
        if (v.t !== "q" || v.d !== 1n || v.n < 0n || v.n > 500n) throw new MaximaError("type", "factorial of a non-integer");
        let r = 1n;
        for (let i = 2n; i <= v.n; i++) r *= i;
        return r;
      };
      if (name === "factorial") return Q(fact(args[0]));
      const [n, k] = args;
      if (k.t === "q" && n.t === "q" && (k.n < 0n || k.n > n.n)) return Q(0n);
      return Q(fact(n), fact(k) * fact(Q(n.n - k.n)));
    }
    if (name === "abs" && args[0].t === "c") {     // |a+bi|, exact when a^2+b^2 is a square
      const x = args[0];
      return callValue("sqrt", [arith("+", arith("*", x.re, x.re), arith("*", x.im, x.im))]);
    }
    if (name === "sqrt" && args[0].t === "c") return complexArith("^", args[0], Q(1n, 2n));
    if (name === "exp" && args[0].t === "c") {
      const r = Math.exp(toNum(args[0].re)), y = toNum(args[0].im);
      return C(F(r * Math.cos(y)), F(r * Math.sin(y)));
    }
    if (name === "abs" && args[0].t === "q") return Q(args[0].n < 0n ? -args[0].n : args[0].n, args[0].d);
    if (name === "atan2") return F(Math.atan2(toNum(args[0]), toNum(args[1])));
    if (name === "min" || name === "max") {
      const nums = args.map(toNum);
      const k = nums.indexOf(Math[name](...nums));
      return args[k];
    }
    if (name === "is") {
      if (args[0].t !== "bool") throw new MaximaError("unknown", "is() of a non-boolean");
      return args[0];
    }
    if (name === "equal" || name === "notequal") {
      // a side that is not a number here: outside the domain, no verdict (as "=" above)
      const nan = (v) => (v.t === "matrix" ? v.rows.some((r) => r.some(nan)) : v.t === "list" ? v.items.some(nan)
        : isScalar(v) && v.t !== "c" && !isFinite(toNum(v)));
      if (nan(args[0]) || nan(args[1])) throw new MaximaError("domain", "Not finite");
      const eq = valuesEqual(args[0], args[1], EQ_TOL);
      return { t: "bool", v: name === "equal" ? eq : !eq };
    }
    if (name === "transpose") {
      const m = args[0];
      if (m.t === "list") return { t: "matrix", rows: m.items.map((x) => [x]) };
      if (m.t === "matrix") return { t: "matrix", rows: m.rows[0].map((_, j) => m.rows.map((r) => r[j])) };
      return m;
    }
    if (name === "length") return Q(BigInt((args[0].items || args[0].rows).length));
    if (name === "first") return args[0].items[0];
    if (name === "second") return args[0].items[1];
    if (name === "float") return args[0].t === "c" ? C(F(toNum(args[0].re)), F(toNum(args[0].im))) : F(toNum(args[0]));
    // Maxima leaves some integrals as gamma functions (int(x^2*e^(-x),x,u,inf) is
    // gamma_incomplete(3,u)).
    if (name === "gamma_incomplete" && args.length === 2) return F(upperGamma(toNum(args[0]), toNum(args[1])));
    if (name === "gamma" && args.length === 1) return F(gammaFn(toNum(args[0])));
    const f = REAL_FUNCS[name];
    if (!f) throw new MaximaError("unknownfunction", "Unknown function", name);
    if (args.length !== 1 || !isScalar(args[0])) throw new MaximaError("type", "Bad argument for " + name);
    return F(f(toNum(args[0])));
  }

  function bigSqrt(n) {
    if (n < 2n) return n;
    let x = BigInt(Math.floor(Math.sqrt(Number(n))));
    while (x * x > n) x--;
    while ((x + 1n) * (x + 1n) <= n) x++;
    return x;
  }

  const CONSTANTS = { "%pi": F(Math.PI), "%e": F(Math.E), "%i": { t: "c", re: Q(0n), im: Q(1n) }, "true": { t: "bool", v: true }, "false": { t: "bool", v: false } };

  /*
   * env.get(name) returns an AST (question/feedback variables are kept as
   * expressions, so values with free variables like x keep working), and
   * env.point maps free variables to numbers for numeric comparison.
   */
  function evaluate(ast, env, depth) {
    depth = (depth || 0) + 1;
    if (depth > 200) throw new MaximaError("recursion", "Too deep");
    const E = (a) => evaluate(a, env, depth);
    switch (ast.k) {
      case "num": return parseNumber(ast.value);
      case "str": return { t: "str", v: ast.value };
      case "paren": return E(ast.arg);
      case "neg": return arith("*", Q(-1n), E(ast.arg));
      case "list": return { t: "list", items: ast.items.map(E) };
      case "set": return makeSet(ast.items.map(E));
      case "seq": { let r; for (const a of ast.items) r = E(a); return r; }
      case "if": return truthy(E(ast.cond)) ? E(ast.then) : E(ast.else);
      case "id": {
        if (env.point && Object.prototype.hasOwnProperty.call(env.point, ast.name)) return env.point[ast.name];
        const bound = env.get && env.get(ast.name);
        if (bound) return E(bound);
        if (CONSTANTS[ast.name]) return CONSTANTS[ast.name];
        throw new MaximaError("unbound", "Unbound variable", ast.name);
      }
      case "index": {
        const target = E(ast.target);
        const idx = ast.indices.map((i) => Number(toNum(E(i))));
        let v = target;
        for (const i of idx) {
          const arr = v.t === "list" ? v.items : v.t === "matrix" ? v.rows.map((r) => ({ t: "list", items: r })) : null;
          if (!arr || i < 1 || i > arr.length) throw new MaximaError("index", "Bad index");
          v = arr[i - 1];
        }
        return v;
      }
      case "call": {
        if (ast.name === "diff") return numericDiff(ast, env, depth);
        if (["integrate", "defint", "int"].includes(ast.name) && ast.args.length === 4) return numericIntegral(ast, env, depth);
        if (ast.name === "limit" && ast.args.length >= 3) return limitAtPoint(ast, env, depth);
        if (SIMPLIFIERS.has(ast.name) && ast.args.length >= 1) return E(ast.args[0]);
        if (ast.name === "zeromatrixp" && ast.args.length === 1 && env.point) return zeroMatrixAt(ast.args[0], env, depth);
        return callValue(ast.name, ast.args.map(E));
      }
      case "not": return { t: "bool", v: !truthy(E(ast.arg)) };
      case "op": {
        const [a, b] = ast.args;
        switch (ast.op) {
          case "and": return { t: "bool", v: truthy(E(a)) && truthy(E(b)) };
          case "or": return { t: "bool", v: truthy(E(a)) || truthy(E(b)) };
          case "=": case "#": {
            const va = E(a), vb = E(b);
            // a side that is not a number here (x^(3/2) at x<0): outside the domain, no
            // verdict at this point -- not "false"
            const nan = (v) => isScalar(v) && v.t !== "c" && !isFinite(toNum(v));
            if (nan(va) || nan(vb)) throw new MaximaError("domain", "Not finite");
            let eq = valuesEqual(va, vb, EQ_TOL);
            // matrices: each entry equal up to rounding relative to the size of its terms
            if (!eq && isMatrix(va) && isMatrix(vb) && va.rows.length === vb.rows.length &&
                va.rows.every((r, i) => r.length === vb.rows[i].length)) {
              const sa = matrixTermScale(a, va, env, depth), sb = matrixTermScale(b, vb, env, depth);
              eq = va.rows.every((r, i) => r.every((x, j) => {
                const y = vb.rows[i][j];
                if (!isScalar(x) || !isScalar(y) || x.t === "c" || y.t === "c") return valuesEqual(x, y, EQ_TOL);
                return Math.abs(toNum(x) - toNum(y)) <= EQ_TOL * Math.max(1, sa[i][j] + sb[i][j]);
              }));
            }
            // a sum of large terms that cancel (an ODE residual with e^(-3*x) at x=-3, 2938758):
            // equal up to rounding relative to the size of the terms
            if (!eq && isScalar(va) && isScalar(vb) && va.t !== "c" && vb.t !== "c") {
              const scale = termSize(a, env, depth) + termSize(b, env, depth);
              eq = Math.abs(toNum(va) - toNum(vb)) <= EQ_TOL * Math.max(1, scale);
            }
            return { t: "bool", v: ast.op === "=" ? eq : !eq };
          }
          case "<": case ">": case "<=": case ">=": {
            unknownIfSymbolic(ast, env);
            const x = toNum(E(a)), y = toNum(E(b));
            return { t: "bool", v: ast.op === "<" ? x < y : ast.op === ">" ? x > y : ast.op === "<=" ? x <= y : x >= y };
          }
          case ".": return matmul(E(a), E(b));
          case "^^": return matpow(E(a), E(b));
          case ":": throw new MaximaError("type", "Assignment inside expression");
          default: return arith(ast.op, E(a), E(b));
        }
      }
    }
    throw new MaximaError("type", "Cannot evaluate");
  }

  // The size of the terms of a sum at the current point (|t1| + |t2| + ...), for comparisons
  // that should be relative to them; through simplifier calls and brackets.
  function termSize(ast, env, depth) {
    const terms = [];
    const walkSum = (n, d) => {
      if (d > 30) return terms.push(n);
      if (n.k === "paren") return walkSum(n.arg, d + 1);
      if (n.k === "neg") return walkSum(n.arg, d + 1);
      if (n.k === "call" && SIMPLIFIERS.has(n.name) && n.args.length === 1) return walkSum(n.args[0], d + 1);
      if (n.k === "op" && (n.op === "+" || n.op === "-")) return n.args.forEach((x) => walkSum(x, d + 1));
      terms.push(n);
    };
    walkSum(ast, 0);
    let total = 0;
    for (const t of terms) {
      try { const v = evaluate(t, env, depth); if (isScalar(v) && v.t !== "c") total += Math.abs(toNum(v)); } catch (e) { /* skip */ }
    }
    return Number.isFinite(total) ? total : 0;
  }

  // The size of the terms of each entry of a matrix expression at the current point: the
  // terms of the matrix sum and, in a literal matrix, of each entry's sum.  For comparisons
  // relative to them (an ODE system residual diff(Y,x) - A.Y with 17*e^(4*x) at x = 2,
  // 2702347, 3061922).
  function matrixTermScale(arg, m, env, depth) {
    const scale = m.rows.map((r) => r.map(() => 0));
    const walk = (n, d) => {
      if (d < 30 && (n.k === "paren" || n.k === "neg")) return walk(n.arg, d + 1);
      if (d < 30 && n.k === "call" && SIMPLIFIERS.has(n.name) && n.args.length === 1) return walk(n.args[0], d + 1);
      if (d < 30 && n.k === "op" && (n.op === "+" || n.op === "-")) return n.args.forEach((x) => walk(x, d + 1));
      const literal = n.k === "call" && n.name === "matrix" && n.args.length === m.rows.length && n.args.every((r) => r.k === "list") ? n.args : null;
      if (literal) {
        literal.forEach((r, i) => r.items.forEach((e, j) => { if (i < scale.length && j < scale[i].length) scale[i][j] += termSize(e, env, depth); }));
        return;
      }
      try {
        const v = evaluate(n, env, depth);
        if (isMatrix(v)) v.rows.forEach((r, i) => r.forEach((x, j) => {
          if (i < scale.length && j < scale[i].length && isScalar(x) && x.t !== "c") scale[i][j] += Math.abs(toNum(x));
        }));
      } catch (e) { /* no scale from this term */ }
    };
    walk(arg, 0);
    return scale.map((r) => r.map((x) => (Number.isFinite(x) ? x : 0)));
  }

  // zeromatrixp at a sample point: each entry zero up to rounding relative to its terms.
  function zeroMatrixAt(arg, env, depth) {
    const m = evaluate(arg, env, depth);
    if (!isMatrix(m)) return { t: "bool", v: false };
    const scale = matrixTermScale(arg, m, env, depth);
    return { t: "bool", v: m.rows.every((r, i) => r.every((x, j) => nearZero(x, scale[i][j] || 1))) };
  }

  // Maxima's simplification functions do not change a value, so numerically they are the identity.
  const SIMPLIFIERS = new Set(["expand", "ratsimp", "fullratsimp", "factor", "simplify", "trigsimp", "trigrat",
    "trigexpand", "trigreduce", "radcan", "rat", "ratexpand", "logcontract", "expandall", "ev", "rectform",
    "rootscontract", "exponentialize", "demoivre"]);
  const EQ_TOL = 1e-9;
  const INTERVALS = new Set(["oo", "cc", "oc", "co"]);

  // A comparison like x<0 with a symbolic x is "unknown" in Maxima, so is(...) fails.
  function unknownIfSymbolic(ast, env) {
    if (!env.point || env.compare) return;     // env.compare: comparing conditions on purpose
    for (const v of freeVariables(ast, env)) {
      if (Object.prototype.hasOwnProperty.call(env.point, v)) throw new MaximaError("unknown", "Unknown sign");
    }
  }

  // diff(expr, var) at the current sample point: central differences + Richardson extrapolation.
  function numericDiff(ast, env, depth) {
    const [e, v, n] = ast.args;
    if (!v || v.k !== "id") throw new MaximaError("type", "diff needs a variable");
    const order = n ? toNum(evaluate(n, env, depth)) : 1;
    if (!Number.isInteger(order) || order < 0 || order > 4) throw new MaximaError("type", "Unsupported derivative order");
    if (order === 0) return evaluate(e, env, depth);
    if (order > 1) {          // diff(e, x, k) = diff(diff(e, x, k-1), x)
      const inner = { k: "call", name: "diff", args: [e, v, { k: "num", value: String(order - 1), isFloat: false }] };
      return numericDiff({ k: "call", name: "diff", args: [inner, v] }, env, depth);
    }
    if (!freeVariables(e, env).has(v.name)) return Q(0n);
    if (!env.point || !(v.name in env.point)) throw new MaximaError("unknown", "Symbolic derivative");
    const x0 = toNum(env.point[v.name]);
    const f = (x) => toNum(evaluate(e, { get: env.get, point: Object.assign({}, env.point, { [v.name]: F(x) }) }, depth));
    return F(ridders(f, x0));
  }

  // integrate(e, v, a, b) at the current sample point, with bounds that may depend on it
  // (a convolution integrate(f(u)*g(t-u), u, 0, t)): adaptive Simpson in v.
  function numericIntegral(ast, env, depth) {
    const [e, v, a, b] = ast.args;
    if (!v || v.k !== "id") throw new MaximaError("type", "integrate needs a variable");
    const lo = toNum(evaluate(a, env, depth)), hi = toNum(evaluate(b, env, depth));
    const at = (ex, x) => toNum(evaluate(ex, { get: env.get, point: Object.assign({}, env.point, { [v.name]: F(x) }) }, depth));
    // delta(v-c) factors (a delta in a convolution, 3072809): the sifting property, with
    // both bounds included, as Laplace's 0^- convention and delta(t)*f = f need
    const { smooth, deltas } = splitDeltas(e);
    let total = smooth ? simpson((x) => at(smooth, x), lo, hi, true) : 0;
    for (const d of deltas) {
      const h0 = at(d.arg, 0), slope = at(d.arg, 1) - h0;
      if (!slope || !Number.isFinite(slope)) throw new MaximaError("unknown", "delta of a non-linear argument");
      const x0 = -h0 / slope;
      if (x0 >= lo - 1e-12 && x0 <= hi + 1e-12) total += at(d.coef, x0) / Math.abs(slope);
    }
    return F(total);
  }

  // limit(e, v, a[, plus|minus]) at the current sample point (e depends on other variables too).
  function limitAtPoint(ast, env, depth) {
    const [e, v, a, d] = ast.args;
    if (!v || v.k !== "id") throw new MaximaError("type", "limit needs a variable");
    const at = (x) => toNum(evaluate(e, { get: env.get, point: Object.assign({}, env.point, { [v.name]: F(x) }) }, depth));
    const pt = a.k === "id" && (a.name === "inf" || a.name === "minf") ? (a.name === "inf" ? Infinity : -Infinity) : toNum(evaluate(a, env, depth));
    const r = numericLimit(at, pt, d && d.k === "id" ? (d.name === "plus" ? 1 : d.name === "minus" ? -1 : 0) : 0);
    if (!r || r.kind !== "num") throw new MaximaError("unknown", "No finite limit");
    return F(r.v);
  }

  // A limit from values approaching the point: Richardson extrapolation of f(a + h), h
  // halving (an error in whole powers of h, as at a removable singularity or a pole).
  // Returns {kind: "num", v}, {kind: "inf"} / "minf" / "und" (the sides differ), or null
  // when the values do not settle.  dir: 1 from above, -1 from below, 0 both sides.
  function numericLimit(f, a, dir) {
    const safe = (x) => { try { const y = f(x); return Number.isFinite(y) ? y : NaN; } catch (e) { return NaN; } };
    const side = (s) => {
      const pts = [];
      for (let k = 0; k <= 26; k++) {
        const h = 0.125 / 2 ** k;
        pts.push(safe(Number.isFinite(a) ? a + s * h : s / h));
      }
      const tail = pts.slice(-8);
      if (tail.every((y) => Number.isFinite(y))) {        // growing without bound: +-inf
        const grows = tail.every((y, i) => i === 0 || Math.abs(y) > Math.abs(tail[i - 1]) * 1.2);
        if (grows && Math.abs(tail[7]) > 1e6 && tail.every((y) => Math.sign(y) === Math.sign(tail[7]))) return { kind: tail[7] > 0 ? "inf" : "minf" };
      }
      // Richardson table over the first 14 points (h down to ~1e-5, before rounding wins)
      let best = null, prev = null, R = [];
      for (let k = 0; k < 14; k++) {
        if (!Number.isFinite(pts[k])) { R = []; prev = null; continue; }
        const row = [pts[k]];
        for (let j = 1; j <= R.length && j <= 6; j++) row.push((2 ** j * row[j - 1] - R[j - 1]) / (2 ** j - 1));
        const est = row[row.length - 1];
        if (prev !== null) {
          const err = Math.abs(est - prev);
          if (!best || err < best.err) best = { v: est, err };
        }
        prev = est;
        R = row;
      }
      if (!best || !(best.err <= 1e-8 * Math.max(1, Math.abs(best.v)))) return null;
      const frac = snapRational(best.v);
      return frac ? { kind: "num", v: frac[0] / frac[1], frac } : { kind: "num", v: best.v };
    };
    if (Number.isFinite(a) && dir === 0) {
      // continuous at a: the value there
      const y0 = safe(a), y1 = safe(a + 1e-7), y2 = safe(a - 1e-7);
      if (Number.isFinite(y0) && Math.abs(y1 - y0) <= 1e-5 * Math.max(1, Math.abs(y0)) && Math.abs(y2 - y0) <= 1e-5 * Math.max(1, Math.abs(y0))) return { kind: "num", v: y0, exactAt: true };
    }
    if (!Number.isFinite(a)) return side(a > 0 ? 1 : -1);
    if (dir) return side(dir);
    const up = side(1), down = side(-1);
    if (!up || !down) return null;
    if (up.kind !== down.kind) return { kind: "und" };
    if (up.kind === "num" && Math.abs(up.v - down.v) > 1e-7 * Math.max(1, Math.abs(up.v))) return { kind: "und" };
    return up;
  }

  // A value within 1e-8 of a fraction with a small denominator is that fraction: [p, q],
  // or null.
  function snapRational(x) {
    let h0 = 0, h1 = 1, k0 = 1, k1 = 0, y = x;
    for (let i = 0; i < 20; i++) {
      const c = Math.floor(y);
      [h0, h1] = [h1, c * h1 + h0];
      [k0, k1] = [k1, c * k1 + k0];
      if (k1 > 1000) break;
      if (Math.abs(x - h1 / k1) <= 1e-8 * Math.max(1, Math.abs(x))) return k1 < 0 ? [-h1, -k1] : [h1, k1];
      if (y === c) break;
      y = 1 / (y - c);
    }
    return null;
  }

  // e = smooth + sum of coef*delta(arg), for the sifting property in integrals.
  function splitDeltas(e) {
    const ONE = { k: "num", value: "1", isFloat: false };
    const mul = (a, b) => ({ k: "op", op: "*", args: [a, b] });
    const hasDelta = (a) => functionsUsed(a).has("delta");
    const go = (a) => {
      if (!hasDelta(a)) return { smooth: a, deltas: [] };
      if (a.k === "paren") return go(a.arg);
      if (a.k === "call" && a.name === "delta" && a.args.length === 1 && !hasDelta(a.args[0])) return { smooth: null, deltas: [{ coef: ONE, arg: a.args[0] }] };
      if (a.k === "neg") {
        const r = go(a.arg);
        return { smooth: r.smooth && { k: "neg", arg: r.smooth }, deltas: r.deltas.map((d) => ({ coef: { k: "neg", arg: d.coef }, arg: d.arg })) };
      }
      if (a.k === "op" && (a.op === "+" || a.op === "-")) {
        const [l, r] = a.args.map(go);
        const rd = a.op === "-" ? r.deltas.map((d) => ({ coef: { k: "neg", arg: d.coef }, arg: d.arg })) : r.deltas;
        const sm = l.smooth && r.smooth ? { k: "op", op: a.op, args: [l.smooth, r.smooth] }
          : l.smooth || (r.smooth && (a.op === "-" ? { k: "neg", arg: r.smooth } : r.smooth));
        return { smooth: sm, deltas: l.deltas.concat(rd) };
      }
      if (a.k === "op" && (a.op === "*" || a.op === "/")) {
        const [x, y] = a.args;
        if (!hasDelta(y)) {
          const r = go(x), op = (c) => ({ k: "op", op: a.op, args: [c, y] });
          return { smooth: r.smooth && op(r.smooth), deltas: r.deltas.map((d) => ({ coef: op(d.coef), arg: d.arg })) };
        }
        if (a.op === "*" && !hasDelta(x)) {
          const r = go(y);
          return { smooth: r.smooth && mul(x, r.smooth), deltas: r.deltas.map((d) => ({ coef: mul(x, d.coef), arg: d.arg })) };
        }
      }
      throw new MaximaError("unknown", "Unsupported delta in an integral");
    };
    return go(e);
  }

  // Adaptive Simpson.  A value that is not a number (sqrt of a negative, a pole) never meets
  // the tolerance: without this check the recursion would make 2^40 calls (152920, a wrong
  // bound).  A slowly converging integrand (sqrt(1-x^2) up to 1, 152912) stops refining after
  // a budget of calls, with the estimate it has.
  // relative: the tolerance scales with the integral (a convolution of exponentials).
  function simpson(f, a, b, relative) {
    let calls = 0;
    const g = (t) => {
      const y = f(t);
      if (!Number.isFinite(y)) throw new MaximaError("unknown", "Integrand not finite");
      calls++;
      return y;
    };
    const whole = (l, r, fl, fm, fr) => (r - l) / 6 * (fl + 4 * fm + fr);
    const rec = (l, r, fl, fm, fr, est, tol, depth) => {
      const m = (l + r) / 2, lm = (l + m) / 2, rm = (m + r) / 2;
      const flm = g(lm), frm = g(rm);
      const left = whole(l, m, fl, flm, fm), right = whole(m, r, fm, frm, fr);
      if (depth > 40 || calls > 200000 || Math.abs(left + right - est) <= 15 * tol) return left + right + (left + right - est) / 15;
      return rec(l, m, fl, flm, fm, left, tol / 2, depth + 1) + rec(m, r, fm, frm, fr, right, tol / 2, depth + 1);
    };
    const fa = g(a), fb = g(b), fm = g((a + b) / 2), est = whole(a, b, fa, fm, fb);
    const scale = relative ? Math.max(1, Math.abs(est), (Math.abs(fa) + Math.abs(fm) + Math.abs(fb)) * Math.abs(b - a) / 3) : 1;
    return rec(a, b, fa, fm, fb, est, 1e-12 * scale, 0);
  }

  // Ridders' method (Numerical Recipes "dfridr"): central differences with shrinking steps
  // and Richardson extrapolation, keeping the estimate with the smallest error.  Accurate
  // also for fast-growing functions such as exp(x^4), where a fixed step is not.
  function ridders(f, x0) {
    // Retry from smaller starting steps while the error estimate is large (steep
    // functions like exp(4x^5) need a step far below the default).
    let best = NaN, bestRel = Infinity;
    for (let k = 0; k < 7 && bestRel > 1e-11; k++) {
      const r = riddersFrom(f, x0, 0.01 * Math.max(1, Math.abs(x0)) * Math.pow(10, -k));
      if (!isFinite(r.value)) continue;
      const rel = r.err / Math.max(1e-300, Math.abs(r.value), 1);
      if (rel < bestRel) { bestRel = rel; best = r.value; }
    }
    if (!isFinite(best) || bestRel > 1e-6) throw new MaximaError("domain", "Derivative not computable");
    return best;
  }

  function riddersFrom(f, x0, h) {
    const CON = 1.4, CON2 = CON * CON, NTAB = 30, SAFE = 2;
    let prev = null, best = NaN, err = Infinity;
    for (let i = 0; i < NTAB; i++, h /= CON) {
      const row = [(f(x0 + h) - f(x0 - h)) / (2 * h)];
      if (!isFinite(row[0])) { prev = null; continue; }     // overflow: restart the table
      let fac = CON2;
      for (let j = 1; prev && j <= i && prev[j - 1] !== undefined; j++) {
        row[j] = (row[j - 1] * fac - prev[j - 1]) / (fac - 1);
        fac *= CON2;
        const errt = Math.max(Math.abs(row[j] - row[j - 1]), Math.abs(row[j] - prev[j - 1]));
        if (errt <= err) { err = errt; best = row[j]; }
      }
      if (prev && row.length > 1 && prev.length >= row.length - 1 &&
          Math.abs(row[row.length - 1] - prev[prev.length - 1]) >= SAFE * err) break;
      prev = row;
    }
    return { value: best, err };
  }

  // A set: duplicates (up to rounding) removed, sorted like Maxima (numbers first).
  function makeSet(items) {
    const out = [];
    for (const x of items) if (!out.some((y) => valuesEqual(x, y, 1e-12))) out.push(x);
    out.sort(compareValues);
    return { t: "set", items: out };
  }

  function compareValues(a, b) {
    const na = isScalar(a), nb = isScalar(b);
    if (na && nb) return toNum(a) - toNum(b);
    if (na !== nb) return na ? -1 : 1;
    return JSON.stringify(a, big).localeCompare(JSON.stringify(b, big));
  }
  const big = (k, x) => (typeof x === "bigint" ? x.toString() : x);

  function truthy(v) {
    if (v.t !== "bool") throw new MaximaError("type", "Not a boolean");
    return v.v;
  }

  function valuesEqual(a, b, tol) {
    if (a.t === "list" || b.t === "list" || a.t === "set" || b.t === "set") {
      return a.t === b.t && a.items.length === b.items.length && a.items.every((x, i) => valuesEqual(x, b.items[i], tol));
    }
    if (a.t === "matrix" || b.t === "matrix") {
      return a.t === b.t && a.rows.length === b.rows.length &&
        a.rows.every((r, i) => r.length === b.rows[i].length && r.every((x, j) => valuesEqual(x, b.rows[i][j], tol)));
    }
    if (a.t === "str" || b.t === "str" || a.t === "bool" || b.t === "bool") return a.t === b.t && a.v === b.v;
    if (a.t === "q" && b.t === "q") return a.n === b.n && a.d === b.d;
    if (a.t === "c" || b.t === "c") {
      if (!isNumber(a) || !isNumber(b)) return false;
      const scale = Math.max(1, cabs(a), cabs(b));
      const d = Math.hypot(toNum(reOf(a)) - toNum(reOf(b)), toNum(imOf(a)) - toNum(imOf(b)));
      return isFinite(d) && d <= tol * scale;
    }
    const x = toNum(a), y = toNum(b);
    if (!isFinite(x) || !isFinite(y)) return false;
    return Math.abs(x - y) <= tol * Math.max(1, Math.abs(x), Math.abs(y));
  }

  // ------------------------------------------------------------------ answer tests

  // Free variables of an expression, following env bindings.
  function freeVariables(ast, env, seen) {
    seen = seen || new Set();
    const out = new Set();
    for (const name of identifiers(ast)) {
      if (CONSTANTS[name] || seen.has(name)) continue;
      const bound = env.get && env.get(name);
      if (bound) {
        seen.add(name);
        for (const v of freeVariables(bound, env, seen)) out.add(v);
        seen.delete(name);
      } else out.add(name);
    }
    return out;
  }

  /*
   * AlgEquiv.  Constant expressions are compared exactly (rationals) or to 1e-12
   * relative; expressions with variables are compared at random points.
   */
  // STACK's AlgEquiv: equations are compared as equations (ATEquation: the same solutions),
  // lists of them item by item; everything else by its values at random points.
  function algEquiv(sa, ta, env, opts) {
    const strip = (a) => (a.k === "paren" ? strip(a.arg) : a);
    const isEq = (a) => a.k === "op" && a.op === "=";
    const s = strip(sa), t = strip(ta);
    if (isEq(t)) return isEq(s) && equationsEquiv(s, t, env, opts);
    if (s.k === "list" && t.k === "list" && t.items.some((i) => isEq(strip(i)))) {
      return s.items.length === t.items.length && s.items.every((x, i) => algEquiv(x, t.items[i], env, opts));
    }
    return algEquivPoints(sa, ta, env, opts);
  }

  // ATEquation, numerically: an equation true for all values only matches another one;
  // the same two sides (also swapped) match; otherwise lhs-rhs of the two must have a
  // constant non-zero ratio (2x=2 is x=1, but x+1=0 is not x=0).
  function equationsEquiv(sa, ta, env, opts) {
    const ZERO_AST = { k: "num", value: "0", isFloat: false };
    const diff = (e) => ({ k: "op", op: "-", args: [e.args[0], { k: "paren", arg: e.args[1] }] });
    const same = (a, b) => algEquivPoints(a, b, env, opts);
    const dA = diff(sa), dB = diff(ta);
    if (same(dB, ZERO_AST)) return same(dA, ZERO_AST);
    if (same(dA, ZERO_AST)) return false;
    if (same(sa.args[0], ta.args[0])) return same(sa.args[1], ta.args[1]);
    if (same(sa.args[0], ta.args[1]) && same(sa.args[1], ta.args[0])) return true;
    const vars = [...new Set([...freeVariables(dA, env), ...freeVariables(dB, env)])];
    const ratios = [];
    for (let attempt = 0; attempt < 80 && ratios.length < 8; attempt++) {
      const point = {};
      for (const v of vars) point[v] = F(-2.7 + 5.8 * Math.random());
      let a, b;
      try { a = toNum(evaluate(dA, { get: env.get, point })); b = toNum(evaluate(dB, { get: env.get, point })); }
      catch (e) { continue; }
      if (!isFinite(a) || !isFinite(b) || Math.abs(b) < 1e-9) continue;
      ratios.push(a / b);
    }
    if (ratios.length < 4 || Math.abs(ratios[0]) < 1e-12) return false;
    return ratios.every((r) => Math.abs(r - ratios[0]) <= 1e-7 * Math.max(1, Math.abs(ratios[0])));
  }

  function algEquivPoints(sa, ta, env, opts) {
    opts = opts || {};
    const vars = [...new Set([...freeVariables(sa, env), ...freeVariables(ta, env)])];
    if (!vars.length) {
      return valuesEqual(evaluate(sa, env), evaluate(ta, env), 1e-12);
    }
    const rnd = opts.random || Math.random;
    const range = opts.range || [-2.7, 3.1];
    const need = Math.min(4, opts.points || 8);
    let tested = 0;
    // One comparison at a point: true/false, or null outside the domain of either side
    // (e.g. log(x) for x<0, which a CAS would still simplify).
    const compareAt = (point) => {
      const penv = { get: env.get, point, compare: env.compare };
      let a, b;
      try { a = finite(evaluate(sa, penv)); } catch (e) { a = null; }
      try { b = finite(evaluate(ta, penv)); } catch (e) { b = null; }
      if (a === null || b === null) return null;
      if (valuesEqual(a, b, 1e-9)) return true;
      // A sum of large terms that cancel (x*diff(y,x)-6*y+... = 0 with terms ~1e4) leaves
      // round-off far above 1e-9: compared relative to the size of its terms.  A wrong
      // answer leaves a difference of the size of the terms themselves.
      if (isScalar(a) && isScalar(b) && a.t !== "c" && b.t !== "c") {
        const sc = Math.max(termScale(sa, penv), termScale(ta, penv));
        if (sc > 1 && Math.abs(toNum(a) - toNum(b)) <= 1e-9 * sc) return true;
      }
      // Close to a pole (e.g. x = 2.0008 for 1/(x-2)^2, values ~1e7 and more) the two forms
      // of the same function differ by round-off of 1e-8 relative and more: no verdict there,
      // another point.  "No verdict" never passes an answer: it needs enough points that agree.
      if (Math.max(magnitude(a), magnitude(b)) > 1e5) return null;
      return false;
    };
    // Points: random in the usual range; if too few lie in the domain (sqrt(-x-4) lives
    // at x <= -4), a wide range; then whole numbers (a sequence 5*(-4)^(n-1) is only real
    // at integer n).
    const passes = [
      () => { const p = {}; for (const v of vars) { const r = (opts.ranges && opts.ranges[v]) || range; p[v] = F(r[0] + (r[1] - r[0]) * rnd()); } return p; },
      () => { const p = {}; for (const v of vars) { const r = (opts.ranges && opts.ranges[v]) || [-50, 50]; p[v] = F(r[0] + (r[1] - r[0]) * rnd()); } return p; },
      () => { const p = {}; for (const v of vars) p[v] = Q(BigInt(Math.floor(rnd() * 41) - 10)); return p; },
    ];
    for (const next of passes) {
      for (let attempt = 0; attempt < 60 && tested < (opts.points || 8); attempt++) {
        const r = compareAt(next());
        if (r === null) continue;
        if (!r) return false;
        tested++;
      }
      if (tested >= need || opts.ranges) break;      // given ranges: do not look elsewhere
    }
    return tested >= need;
  }

  // The sum of the sizes of the terms of a sum at a point (the scale of its round-off).
  function termScale(ast, env) {
    try {
      if (ast.k === "paren") return termScale(ast.arg, env);
      if (ast.k === "neg") return termScale(ast.arg, env);
      if (ast.k === "call" && SIMPLIFIERS.has(ast.name) && ast.args.length >= 1) return termScale(ast.args[0], env);
      if (ast.k === "op" && (ast.op === "+" || ast.op === "-")) return termScale(ast.args[0], env) + termScale(ast.args[1], env);
      if (ast.k === "id" && env.get) { const b = env.get(ast.name); if (b) return termScale(b, env); }
      const x = Math.abs(toNum(evaluate(ast, env)));
      return isFinite(x) ? x : 0;
    } catch (e) { return 0; }
  }

  const magnitude = (v) => (v.t === "list" || v.t === "set" ? Math.max(0, ...v.items.map(magnitude))
    : v.t === "matrix" ? Math.max(0, ...v.rows.flat().map(magnitude))
    : v.t === "q" || v.t === "f" ? Math.abs(toNum(v)) : v.t === "c" ? cabs(v) : 0);

  // NaN/Infinity (e.g. log of a negative number) counts as "outside the domain".
  function finite(v) {
    const ok = (x) => (x.t === "list" ? x.items.every(ok) : x.t === "matrix" ? x.rows.every((r) => r.every(ok))
      : x.t === "f" ? isFinite(x.v) : x.t === "c" ? ok(x.re) && ok(x.im) : true);
    if (!ok(v)) throw new MaximaError("domain", "Not finite");
    return v;
  }

  // Type check used before AlgEquiv: list vs scalar, list length, matrix size.
  function sameShape(a, b) {
    if (a.t === "list" || b.t === "list") return a.t === b.t && a.items.length === b.items.length;
    if (a.t === "matrix" || b.t === "matrix") return a.t === b.t && a.rows.length === b.rows.length && a.rows[0].length === b.rows[0].length;
    return true;
  }

  // Evaluate at one random point (if there are free variables) to learn the shape
  // (scalar / list / matrix) of an expression.  null if it cannot be evaluated.
  function evaluateShape(ast, env) {
    const point = {};
    for (const v of freeVariables(ast, env)) point[v] = F(0.5 + Math.random());
    try { return evaluate(ast, { get: env.get, point }); } catch (e) { return null; }
  }

  // ------------------------------------------------------------------ symbolic derivative
  // d/dx of an AST by the usual rules (the result is not simplified – it is only
  // evaluated numerically).  null when a function has no rule here; callers then fall
  // back to the numeric derivative.
  const num = (n) => ({ k: "num", value: String(n), isFloat: false });
  const opn = (o, a, b) => ({ k: "op", op: o, args: [a, b] });
  const fn = (name, ...args) => ({ k: "call", name, args });
  const ZERO = num(0), ONE = num(1);

  function symDiff(ast, x) {
    const D = (a) => symDiff(a, x);
    const free = (a) => !identifiers(a).has(x);
    if (free(ast)) return ZERO;
    switch (ast.k) {
      case "id": return ast.name === x ? ONE : ZERO;
      case "paren": return D(ast.arg);
      case "neg": { const d = D(ast.arg); return d && { k: "neg", arg: d }; }
      case "op": {
        const [u, v] = ast.args;
        const du = D(u), dv = D(v);
        if (du === null || dv === null) return null;
        switch (ast.op) {
          case "+": return opn("+", du, dv);
          case "-": return opn("-", du, dv);
          case "*": return opn("+", opn("*", du, v), opn("*", u, dv));
          case "/": return opn("/", opn("-", opn("*", du, v), opn("*", u, dv)), opn("^", v, num(2)));
          case "^":
            if (free(v)) return opn("*", opn("*", v, opn("^", u, opn("-", v, ONE))), du);
            if (free(u)) return opn("*", opn("*", ast, fn("log", u)), dv);
            return opn("*", ast, opn("+", opn("*", dv, fn("log", u)), opn("/", opn("*", v, du), u)));
        }
        return null;
      }
      case "call": {
        if (ast.name === "diff") {          // diff(e, x, n) inside: differentiate its result
          const inner = expandDiff(ast);
          return inner && D(inner);
        }
        // expand(u), ratsimp(u)...: the same function, so the derivative of u (126640)
        if (SIMPLIFIERS.has(ast.name) && ast.args.length === 1) return D(ast.args[0]);
        if (ast.args.length !== 1) return null;
        const u = ast.args[0], du = D(u);
        if (du === null) return null;
        const outer = DERIV[ast.name];
        return outer ? opn("*", outer(u), du) : null;
      }
    }
    return null;
  }

  // f'(u) for f(u)
  const DERIV = {
    sin: (u) => fn("cos", u),
    cos: (u) => ({ k: "neg", arg: fn("sin", u) }),
    tan: (u) => opn("^", fn("sec", u), num(2)),
    sec: (u) => opn("*", fn("sec", u), fn("tan", u)),
    csc: (u) => ({ k: "neg", arg: opn("*", fn("csc", u), fn("cot", u)) }),
    cot: (u) => ({ k: "neg", arg: opn("^", fn("csc", u), num(2)) }),
    exp: (u) => fn("exp", u),
    log: (u) => opn("/", ONE, u),
    ln: (u) => opn("/", ONE, u),
    sqrt: (u) => opn("/", ONE, opn("*", num(2), fn("sqrt", u))),
    asin: (u) => opn("/", ONE, fn("sqrt", opn("-", ONE, opn("^", u, num(2))))),
    acos: (u) => ({ k: "neg", arg: opn("/", ONE, fn("sqrt", opn("-", ONE, opn("^", u, num(2))))) }),
    atan: (u) => opn("/", ONE, opn("+", ONE, opn("^", u, num(2)))),
    sinh: (u) => fn("cosh", u),
    cosh: (u) => fn("sinh", u),
    tanh: (u) => opn("^", opn("/", ONE, fn("cosh", u)), num(2)),
    asinh: (u) => opn("/", ONE, fn("sqrt", opn("+", opn("^", u, num(2)), ONE))),
    acosh: (u) => opn("/", ONE, fn("sqrt", opn("-", opn("^", u, num(2)), ONE))),
    atanh: (u) => opn("/", ONE, opn("-", ONE, opn("^", u, num(2)))),
    abs: (u) => fn("signum", u),
    unit_step: () => ZERO,      // almost everywhere
    heaviside: () => ZERO,
    signum: () => ZERO,
  };

  // diff(e, x, n) -> the n-th derivative as an AST (null if a rule is missing).
  function expandDiff(ast) {
    const [e, v, n] = ast.args;
    if (!v || v.k !== "id") return null;
    let order = 1;
    if (n) {
      if (n.k !== "num" || n.isFloat) return null;
      order = +n.value;
    }
    let r = e;
    for (let i = 0; i < order && r; i++) r = symDiff(r, v.name);
    return r;
  }

  global.Maxima = {
    symDiff, expandDiff, charCoeffs, polyRoots,
    makeSet, compareValues, isScalar, arith, callValue, CONSTANTS, SIMPLIFIERS, EQ_TOL, numericDiff, simpson, numericLimit, unknownIfSymbolic,
    isKnownFunction: (n) => n in REAL_FUNCS || n in LINALG || ["matrix", "sqrt", "length", "first", "second", "float", "gamma", "gamma_incomplete", "diff", "integrate", "limit"].includes(n),
    MaximaError, tokenize, parse, latex, evaluate, evaluateShape, algEquiv, sameShape, valuesEqual,
    identifiers, functionsUsed, hasFloat, studentNormalise, freeVariables, Q, F, C, toNum, isNumber,
  };
})(typeof window !== "undefined" ? window : globalThis);
