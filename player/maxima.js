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

  const OPERATORS = ["**", "<=", ">=", ":=", "^", "*", "/", "+", "-", "(", ")", "[", "]", "{", "}",
                     ",", ":", "=", "#", "<", ">", ";", "$", "!", ".", "'"];

  function tokenize(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      const c = text[i];
      if (/\s/.test(c)) {
        // Remember whitespace: "2 x" is an error unless insertstars allows spaces.
        if (tokens.length) tokens[tokens.length - 1].spaceAfter = true;
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
    "^": [140, 139, "right"],
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
        if (isOp(peek(), "(") && !t.spaceAfter) { next(); return { k: "call", name: t.value, args: list(")") }; }
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
      if (isOp(t, "'")) return prefix();          // quote ('diff): same expression for us
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
    "+": 100, "-": 100, neg: 100, "*": 120, "/": 120, ".": 130, "^": 140 };

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

  function parseNumber(text) {
    if (/^\d+$/.test(text)) return Q(BigInt(text));
    return F(parseFloat(text));
  }

  function arith(op, a, b) {
    if (a.t === "list" || b.t === "list") return listArith(op, a, b);
    if (a.t === "matrix" || b.t === "matrix") return matrixArith(op, a, b);
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

  function matmul(a, b) {
    if (a.t !== "matrix" || b.t !== "matrix" || a.rows[0].length !== b.rows.length)
      throw new MaximaError("type", "Bad matrix product");
    return { t: "matrix", rows: a.rows.map((r) => b.rows[0].map((_, j) =>
      r.reduce((s, x, k) => arith("+", s, arith("*", x, b.rows[k][j])), Q(0n)))) };
  }

  const REAL_FUNCS = {
    sin: Math.sin, cos: Math.cos, tan: Math.tan, asin: Math.asin, acos: Math.acos, atan: Math.atan,
    sec: (x) => 1 / Math.cos(x), csc: (x) => 1 / Math.sin(x), cot: (x) => 1 / Math.tan(x),
    sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, asinh: Math.asinh, acosh: Math.acosh, atanh: Math.atanh,
    exp: Math.exp, log: Math.log, abs: Math.abs, floor: Math.floor, ceiling: Math.ceil,
    signum: Math.sign, unit_step: (x) => (x > 0 ? 1 : 0), heaviside: (x) => (x > 0 ? 1 : x < 0 ? 0 : 0.5),
  };

  function callValue(name, args) {
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
    if (name === "float") return F(toNum(args[0]));
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

  const CONSTANTS = { "%pi": F(Math.PI), "%e": F(Math.E), "true": { t: "bool", v: true }, "false": { t: "bool", v: false } };

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
        if (SIMPLIFIERS.has(ast.name) && ast.args.length >= 1) return E(ast.args[0]);
        return callValue(ast.name, ast.args.map(E));
      }
      case "not": return { t: "bool", v: !truthy(E(ast.arg)) };
      case "op": {
        const [a, b] = ast.args;
        switch (ast.op) {
          case "and": return { t: "bool", v: truthy(E(a)) && truthy(E(b)) };
          case "or": return { t: "bool", v: truthy(E(a)) || truthy(E(b)) };
          case "=": case "#": {
            const eq = valuesEqual(E(a), E(b), EQ_TOL);
            return { t: "bool", v: ast.op === "=" ? eq : !eq };
          }
          case "<": case ">": case "<=": case ">=": {
            unknownIfSymbolic(ast, env);
            const x = toNum(E(a)), y = toNum(E(b));
            return { t: "bool", v: ast.op === "<" ? x < y : ast.op === ">" ? x > y : ast.op === "<=" ? x <= y : x >= y };
          }
          case ".": return matmul(E(a), E(b));
          case ":": throw new MaximaError("type", "Assignment inside expression");
          default: return arith(ast.op, E(a), E(b));
        }
      }
    }
    throw new MaximaError("type", "Cannot evaluate");
  }

  // Maxima's simplification functions do not change a value, so numerically they are the identity.
  const SIMPLIFIERS = new Set(["expand", "ratsimp", "fullratsimp", "factor", "simplify", "trigsimp",
    "trigexpand", "trigreduce", "radcan", "rat", "ratexpand", "logcontract", "expandall", "ev", "rectform"]);
  const EQ_TOL = 1e-9;

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
  function algEquiv(sa, ta, env, opts) {
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
      return valuesEqual(a, b, 1e-9);
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

  // NaN/Infinity (e.g. log of a negative number) counts as "outside the domain".
  function finite(v) {
    const ok = (x) => (x.t === "list" ? x.items.every(ok) : x.t === "matrix" ? x.rows.every((r) => r.every(ok))
      : x.t === "f" ? isFinite(x.v) : true);
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
    symDiff, expandDiff,
    makeSet, compareValues, isScalar, arith, callValue, CONSTANTS, SIMPLIFIERS, EQ_TOL, numericDiff, unknownIfSymbolic,
    MaximaError, tokenize, parse, latex, evaluate, evaluateShape, algEquiv, sameShape, valuesEqual,
    identifiers, functionsUsed, hasFloat, studentNormalise, freeVariables, Q, F, toNum,
  };
})(typeof window !== "undefined" ? window : globalThis);
