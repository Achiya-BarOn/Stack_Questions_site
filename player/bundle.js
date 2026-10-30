// ---- lz-string.min.js
var LZString=function(){var r=String.fromCharCode,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",n="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$",e={};function t(r,o){if(!e[r]){e[r]={};for(var n=0;n<r.length;n++)e[r][r.charAt(n)]=n}return e[r][o]}var i={compressToBase64:function(r){if(null==r)return"";var n=i._compress(r,6,function(r){return o.charAt(r)});switch(n.length%4){default:case 0:return n;case 1:return n+"===";case 2:return n+"==";case 3:return n+"="}},decompressFromBase64:function(r){return null==r?"":""==r?null:i._decompress(r.length,32,function(n){return t(o,r.charAt(n))})},compressToUTF16:function(o){return null==o?"":i._compress(o,15,function(o){return r(o+32)})+" "},decompressFromUTF16:function(r){return null==r?"":""==r?null:i._decompress(r.length,16384,function(o){return r.charCodeAt(o)-32})},compressToUint8Array:function(r){for(var o=i.compress(r),n=new Uint8Array(2*o.length),e=0,t=o.length;e<t;e++){var s=o.charCodeAt(e);n[2*e]=s>>>8,n[2*e+1]=s%256}return n},decompressFromUint8Array:function(o){if(null==o)return i.decompress(o);for(var n=new Array(o.length/2),e=0,t=n.length;e<t;e++)n[e]=256*o[2*e]+o[2*e+1];var s=[];return n.forEach(function(o){s.push(r(o))}),i.decompress(s.join(""))},compressToEncodedURIComponent:function(r){return null==r?"":i._compress(r,6,function(r){return n.charAt(r)})},decompressFromEncodedURIComponent:function(r){return null==r?"":""==r?null:(r=r.replace(/ /g,"+"),i._decompress(r.length,32,function(o){return t(n,r.charAt(o))}))},compress:function(o){return i._compress(o,16,function(o){return r(o)})},_compress:function(r,o,n){if(null==r)return"";var e,t,i,s={},u={},a="",p="",c="",l=2,f=3,h=2,d=[],m=0,v=0;for(i=0;i<r.length;i+=1)if(a=r.charAt(i),Object.prototype.hasOwnProperty.call(s,a)||(s[a]=f++,u[a]=!0),p=c+a,Object.prototype.hasOwnProperty.call(s,p))c=p;else{if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++),s[p]=f++,c=String(a)}if(""!==c){if(Object.prototype.hasOwnProperty.call(u,c)){if(c.charCodeAt(0)<256){for(e=0;e<h;e++)m<<=1,v==o-1?(v=0,d.push(n(m)),m=0):v++;for(t=c.charCodeAt(0),e=0;e<8;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}else{for(t=1,e=0;e<h;e++)m=m<<1|t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t=0;for(t=c.charCodeAt(0),e=0;e<16;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1}0==--l&&(l=Math.pow(2,h),h++),delete u[c]}else for(t=s[c],e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;0==--l&&(l=Math.pow(2,h),h++)}for(t=2,e=0;e<h;e++)m=m<<1|1&t,v==o-1?(v=0,d.push(n(m)),m=0):v++,t>>=1;for(;;){if(m<<=1,v==o-1){d.push(n(m));break}v++}return d.join("")},decompress:function(r){return null==r?"":""==r?null:i._decompress(r.length,32768,function(o){return r.charCodeAt(o)})},_decompress:function(o,n,e){var t,i,s,u,a,p,c,l=[],f=4,h=4,d=3,m="",v=[],g={val:e(0),position:n,index:1};for(t=0;t<3;t+=1)l[t]=t;for(s=0,a=Math.pow(2,2),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;c=r(s);break;case 2:return""}for(l[3]=c,i=c,v.push(c);;){if(g.index>o)return"";for(s=0,a=Math.pow(2,d),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;switch(c=s){case 0:for(s=0,a=Math.pow(2,8),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 1:for(s=0,a=Math.pow(2,16),p=1;p!=a;)u=g.val&g.position,g.position>>=1,0==g.position&&(g.position=n,g.val=e(g.index++)),s|=(u>0?1:0)*p,p<<=1;l[h++]=r(s),c=h-1,f--;break;case 2:return v.join("")}if(0==f&&(f=Math.pow(2,d),d++),l[c])m=l[c];else{if(c!==h)return null;m=i+i.charAt(0)}v.push(m),l[h++]=i+m.charAt(0),i=m,0==--f&&(f=Math.pow(2,d),d++)}}};return i}();"function"==typeof define&&define.amd?define(function(){return LZString}):"undefined"!=typeof module&&null!=module?module.exports=LZString:"undefined"!=typeof angular&&null!=angular&&angular.module("LZString",[]).factory("LZString",function(){return LZString});
;
// ---- maxima.js
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

  // ------------------------------------------------------------------ random points
  // The random points of the numeric tests come from here, not from random: the
  // engine seeds it (seedRandom) before each PRT, from the question, the variant and the
  // answers, so the same answer always gets the same verdict.  Before this, a review
  // that checks an attempt again could give it another mark (an answer near the edge
  // of a test, such as 2<X<18 against x>2 and x<18, passed 1 time in 5).
  let rstate = 0x9e3779b9;
  function seedRandom(text) {
    let h = 2166136261;
    const str = String(text);
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
    rstate = h || 1;
  }
  function random() {       // mulberry32
    rstate = (rstate + 0x6d2b79f5) >>> 0;
    let t = rstate;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

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
      for (const v of vars) point[v] = F(-2.7 + 5.8 * random());
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
    const rnd = opts.random || random;
    const range = opts.range || [-2.7, 3.1];
    const need = Math.min(4, opts.points || 8);
    let tested = 0, strong = 0;
    // One comparison at a point: true/false, or null outside the domain of either side
    // (e.g. log(x) for x<0, which a CAS would still simplify).
    const compareAt = (point) => {
      const penv = { get: env.get, point, compare: env.compare };
      let a, b;
      try { a = finite(evaluate(sa, penv)); } catch (e) { a = null; }
      try { b = finite(evaluate(ta, penv)); } catch (e) { b = null; }
      if (a === null || b === null) return null;
      const agree = () => (informative(a) || informative(b) ? "strong" : "weak");
      if (valuesEqual(a, b, 1e-9)) return agree();
      // A sum of large terms that cancel (x*diff(y,x)-6*y+... = 0 with terms ~1e4) leaves
      // round-off far above 1e-9: compared relative to the size of its terms.  A wrong
      // answer leaves a difference of the size of the terms themselves.
      if (isScalar(a) && isScalar(b) && a.t !== "c" && b.t !== "c") {
        const sc = Math.max(termScale(sa, penv), termScale(ta, penv));
        // weak: with terms of 1e12, a wrong answer's difference of 50 passes as round-off (126649)
        if (sc > 1 && Math.abs(toNum(a) - toNum(b)) <= 1e-9 * sc) return "weak";
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
    // A point where both values are 0, tiny or huge tells little: 2*x^100 and x^100 agree
    // to 1e-9 at |x| < 0.8, e^(45x+81)+1 and e^(45x+81) at x > -1, and unit_step(t-3)*f and
    // 2*unit_step(t-3)*f at every t < 3 (all of the usual range).  So we look on (wider
    // range, whole numbers) until two points of ordinary size agree too.  If there are
    // none (a function that is 0 everywhere), the other points decide, as before.
    for (const next of passes) {
      for (let attempt = 0; attempt < 60 && (tested < (opts.points || 8) || strong < 2); attempt++) {
        const r = compareAt(next());
        if (r === null) continue;
        if (!r) return false;
        tested++;
        if (r === "strong") strong++;
      }
      if ((tested >= need && strong >= 2) || opts.ranges) break;      // given ranges: do not look elsewhere
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

  // A value of ordinary size (not 0, not below 1e-6, not above 1e8), somewhere in it.
  const informative = (v) => (v.t === "list" || v.t === "set" ? v.items.some(informative)
    : v.t === "matrix" ? v.rows.flat().some(informative)
    : v.t === "q" || v.t === "f" || v.t === "c" ? ((m) => m >= 1e-6 && m <= 1e8)(v.t === "c" ? cabs(v) : Math.abs(toNum(v)))
    : true);

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
    for (const v of freeVariables(ast, env)) point[v] = F(0.5 + random());
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

  // a<b<c as typed (no brackets): STACK rejects it as invalid ("chained inequalities"),
  // since Maxima reads it as (a<b)<c.
  const CHAIN = new Set(["<", ">", "<=", ">="]);
  function hasChainedRelation(ast) {
    if (!ast || typeof ast !== "object") return false;
    if (ast.k === "op" && CHAIN.has(ast.op) && ast.args.some((a) => a.k === "op" && CHAIN.has(a.op))) return true;
    for (const key in ast) {
      const c = ast[key];
      if (Array.isArray(c) ? c.some((x) => x && x.k && hasChainedRelation(x)) : c && c.k && hasChainedRelation(c)) return true;
    }
    return false;
  }

  global.Maxima = {
    symDiff, expandDiff, charCoeffs, polyRoots,
    makeSet, compareValues, isScalar, arith, callValue, CONSTANTS, SIMPLIFIERS, EQ_TOL, numericDiff, simpson, numericLimit, unknownIfSymbolic,
    isKnownFunction: (n) => n in REAL_FUNCS || n in LINALG || ["matrix", "sqrt", "length", "first", "second", "float", "gamma", "gamma_incomplete", "diff", "integrate", "limit"].includes(n),
    random, seedRandom, hasChainedRelation,
    MaximaError, tokenize, parse, latex, evaluate, evaluateShape, algEquiv, sameShape, valuesEqual,
    identifiers, functionsUsed, hasFloat, studentNormalise, freeVariables, Q, F, C, toNum, isNumber,
  };
})(typeof window !== "undefined" ? window : globalThis);
;
// ---- peval.js
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
;
// ---- engine.js
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
    const vs = M.freeVariables(sa, env), vt = M.freeVariables(ta, env);
    // X>2 and X<18 is not x>2 and x<18 (Maxima is case sensitive): different variables
    // are different sets.  Random points used to let such an answer pass now and then.
    if (vs.size !== vt.size || [...vs].some((x) => !vt.has(x))) return false;
    const vars = [...vt];
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
    for (let i = 0; i < 12; i++) pts.push(lo - 3 + (hi - lo + 6) * M.random());
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
    for (const v of vars) point[v] = M.F(0.37 + 1.7 * M.random());
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
    const rnd = () => Object.fromEntries(all.map((v) => [v, M.F(0.3 + 2.1 * M.random() * (M.random() < 0.5 ? -1 : 1))]));
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
        const t = (2 * M.random() - 1) * [0.03, 0.3, 3, 20][i % 4];
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
    M.seedRandom(`${q.id}|${v.seed}|${prt.name}|${JSON.stringify(inputAsts)}`);
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
;
// ---- scorm.js
/*
 * Minimal SCORM 1.2 wrapper.  Finds the LMS "API" object in parent frames / opener
 * (Moodle's SCORM player provides it).  Without an LMS (local preview) it falls back
 * to localStorage, so the package can be tested by opening index.html directly.
 */
(function (global) {
  "use strict";

  function findAPI(win) {
    for (let i = 0; win && i < 10; i++) {
      try {
        if (win.API) return win.API;
      } catch (e) { /* cross-origin frame */ }
      if (win.parent === win) break;
      win = win.parent;
    }
    return null;
  }

  const api = findAPI(global) || (global.opener && findAPI(global.opener));

  // Local stand-in for previews outside an LMS.
  const local = {
    key: "stack-scorm-preview:" + location.pathname,
    data: null,
    load() {
      if (this.data) return;
      try { this.data = JSON.parse(localStorage.getItem(this.key)) || {}; } catch (e) { this.data = {}; }
    },
    LMSInitialize() { this.load(); return "true"; },
    LMSGetValue(k) { this.load(); return this.data[k] ?? ""; },
    LMSSetValue(k, v) { this.load(); this.data[k] = String(v); return "true"; },
    LMSCommit() { try { localStorage.setItem(this.key, JSON.stringify(this.data)); } catch (e) {} return "true"; },
    LMSFinish() { return this.LMSCommit(); },
    LMSGetLastError() { return "0"; },
  };

  const lms = api || local;
  let initialised = false;
  let finished = false;

  const Scorm = {
    connected: !!api,
    init() {
      if (!initialised) {
        const r = lms.LMSInitialize("");
        initialised = r === "true" || r === true;
      }
      return initialised;
    },
    get(key) { return String(lms.LMSGetValue(key) ?? ""); },
    set(key, value) { return lms.LMSSetValue(key, String(value)); },
    commit() { return lms.LMSCommit(""); },
    finish() {
      if (finished) return;
      finished = true;
      lms.LMSFinish("");
    },
    // Reset the local preview (no effect inside an LMS).
    resetPreview() {
      if (api) return;
      try { localStorage.removeItem(local.key); } catch (e) {}
      local.data = {};
    },
  };

  global.addEventListener("beforeunload", () => {
    if (initialised && !finished) {
      if (Scorm.onLeave) Scorm.onLeave();
      Scorm.commit();
      Scorm.finish();
    }
  });

  global.Scorm = Scorm;
})(window);
;
// ---- player.js
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
;
// ---- teacher.js
/*
 * Teacher mode: "עיון בהגשות" inside Moodle.
 *
 * Moodle serves the package itself (pluginfile.php), so the package may read Moodle pages
 * with the rights of whoever opened it.  For a teacher it shows a button that opens the
 * review page packed with it (review.html, the website's page in "package" mode) over the
 * quiz.  That page reads the activity's interactions report from Moodle and regrades with
 * the questions of this package.  Everything stays in Moodle's site: nothing is sent
 * anywhere, and nothing is written to Moodle.  For a student Moodle refuses the report,
 * and no button is shown.
 */
(function () {
  "use strict";

  const QUIZ = window.STACK_QUIZ;
  if (!QUIZ || QUIZ.replay || QUIZ.batch || QUIZ.ephemeral) return;

  // "#stackdebug" at the end of Moodle's address (then reload): a panel with each step of
  // the check, for when the button does not show.  No names, no session data.
  const debug = (() => { try { return /stackdebug/.test(window.top.location.hash); } catch (e) { return /stackdebug/.test(location.hash); } })();
  const steps = [];
  const step = (ok, text) => { steps.push(`${ok === true ? "✅" : ok === false ? "❌" : "ℹ️"} ${text}`); };
  function showSteps() {
    if (!debug) return;
    const box = document.createElement("div");
    box.id = "teacherdebug";
    box.style.cssText = "border:2px solid #6f42c1;border-radius:8px;padding:8px 12px;margin:0 0 10px;background:#faf7fc;font-size:.85rem";
    box.innerHTML = "<b>בדיקת כפתור המורה</b><ol style='margin:.3rem 0 0;padding-inline-start:1.4rem'>" +
      steps.map((t) => `<li>${t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c])}</li>`).join("") + "</ol>";
    document.body.insertBefore(box, document.body.firstChild);
  }

  // The SCORM activity around the package: Moodle's page, same site.  Also used by
  // review.js (window.STACK_ACTIVITY of its parent).
  function activity() {
    try {
      const top = window.top;
      const cfg = top.M && top.M.cfg;
      step(!!cfg, `עמוד Moodle מסביב: ${cfg ? "נמצא" : "לא נמצא"}, כתובת ${top.location.pathname}`);
      if (!cfg || !cfg.wwwroot || !/\/mod\/scorm\//.test(top.location.pathname)) return null;
      // In the SCORM player the page's context is the activity; otherwise its "cm" in the
      // address, or the activity's own tabs (Reports, the activity page) in the page.
      const fromLink = (sel) => {
        const a = top.document.querySelector(sel);
        const m = a && /[?&]id=(\d+)/.exec(a.getAttribute("href"));
        return m ? +m[1] : 0;
      };
      const cmid = +cfg.contextInstanceId || +new URLSearchParams(top.location.search).get("cm") ||
        fromLink('a[href*="/mod/scorm/report.php?id="]') || fromLink('.secondary-navigation a[href*="/mod/scorm/view.php?id="]');
      step(cmid > 0, `מספר המשאב: ${cmid > 0 ? cmid : "לא נמצא"} (contextInstanceId: ${cfg.contextInstanceId ?? "אין"})`);
      if (!(cmid > 0)) return null;
      // Who is looking: the login (sesskey changes with each login) and whether the role is
      // switched ("Return to my normal role" in the user menu).  The answer of isTeacher is
      // kept per tab, so it must not outlive a "switch role" or a login as another user.
      const switched = !!top.document.querySelector('a[href*="switchrole=0"]');
      const who = `${cfg.sesskey || ""}:${switched ? "switched" : "own"}`;
      step(null, `תפקיד: ${switched ? "מוחלף (תצוגה כסטודנט)" : "רגיל"}`);
      return { base: cfg.wwwroot, cmid, who, report: `${cfg.wwwroot}/mod/scorm/report.php?id=${cmid}&mode=interactions` };
    } catch (e) {
      step(false, "אין גישה לעמוד Moodle שמסביב (אתר אחר)");
      return null;                              // another site: not inside Moodle
    }
  }
  window.STACK_ACTIVITY = activity;

  // Whether this user may see the activity's reports: asked once per tab, login and role.
  async function isTeacher(m) {
    const key = `stack-teacher:${m.cmid}:${m.who}`;
    try {
      const known = sessionStorage.getItem(key);
      if (known && !debug) return known === "1";
    } catch (e) { /* storage unavailable */ }
    let ok = false;
    try {
      const r = await fetch(m.report, { credentials: "same-origin" });
      const doc = new DOMParser().parseFromString(await r.text(), "text/html");
      ok = r.ok && !!doc.querySelector('table#attempts, input[name="qtext"]');
      step(ok, `דוח תת־פעילויות: סטטוס ${r.status}, עמוד "${doc.title}", ${new URL(r.url).pathname}, ` +
        `טבלה ${doc.querySelector("table#attempts") ? "נמצאה" : "לא נמצאה"}, טופס ${doc.querySelector('input[name="qtext"]') ? "נמצא" : "לא נמצא"}, ` +
        `טבלאות בעמוד: ${[...doc.querySelectorAll("table")].map((t) => t.id || t.className.split(" ")[0] || "?").slice(0, 5).join(", ") || "אין"}`);
    } catch (e) {
      step(false, "דוח תת־פעילויות: שגיאה " + e.message);
    }
    try { sessionStorage.setItem(key, ok ? "1" : "0"); } catch (e) { /* storage unavailable */ }
    return ok;
  }

  let overlay = null;
  function openReview() {
    document.body.classList.add("reviewopen");
    if (overlay) { overlay.hidden = false; return; }
    overlay = document.createElement("div");
    overlay.id = "reviewoverlay";
    overlay.innerHTML = '<div class="bar"><b>עיון בהגשות</b>' +
      '<button type="button" class="btn">חזרה למבדק ✕</button></div><iframe title="עיון בהגשות"></iframe>';
    overlay.querySelector("button").onclick = () => {
      overlay.hidden = true;
      document.body.classList.remove("reviewopen");
    };
    document.body.appendChild(overlay);
    overlay.querySelector("iframe").src = "review.html";
  }

  async function start() {
    step(null, "גרסת הכפתור: 2026-10-15");
    const m = activity();
    if (!m || !(await isTeacher(m))) return showSteps();
    showSteps();
    const bar = document.createElement("div");
    bar.id = "teacherbar";
    bar.innerHTML = '<button type="button" class="btn">📋 עיון בהגשות (למורה)</button>';
    bar.querySelector("button").onclick = openReview;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
;
