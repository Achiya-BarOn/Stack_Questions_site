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
