/* Version shown at the top of the site. It matches the lecturer guide (docs/lecturer-guide.html,
 * sent as PDF): raise both whenever the guide changes, so a copy can be checked against the site. */
window.SITE_VERSION = { n: 1, date: "28.10.2026" };
document.addEventListener("DOMContentLoaded", () => {
  for (const el of document.querySelectorAll(".siteversion")) el.textContent = window.SITE_VERSION.n;
  for (const el of document.querySelectorAll(".sitedate")) el.textContent = window.SITE_VERSION.date;
});
