/* fd-theme-series.js — Union Suite chart-series palette.
 * Live since 16 Oct 2026: every shell loads it after the views and before
 * fd-boot.js. The series colours live in fd-core.js, not CSS, so a stylesheet
 * cannot retheme them; if the theme is ever merged into the base files, these
 * lines replace PAY_TYPES/PAY_AREAS in fd-core.js directly and this file goes.
 * Hues are the theme's own ramps, kept maximally distinguishable:
 * brand teal, accent orange, bright cyan, neutral, deep accent, purple.
 */
(function () {
  var FD = window.FDCore;
  if (!FD || !FD.PAY_TYPES) return;
  var TYPE = {
    dd:   ["#006f94", "#e4f0f4"],  /* teal-600  — brand, the biggest series */
    cc:   ["#e07a1f", "#ffe8d6"],  /* accent-700 — readable orange on white */
    bpay: ["#3fb5d9", "#eef6f9"],  /* teal-400   — same family, lighter     */
    eft:  ["#6b7580", "#f1f3f5"],  /* neutral-500                            */
    inv:  ["#a35a00", "#fdefe0"],  /* status-amber                           */
    pd:   ["#413d6b", "#e6e5ef"],  /* status-purple                          */
  };
  FD.PAY_TYPES.forEach(function (t) {
    if (TYPE[t.id]) { t.color = TYPE[t.id][0]; t.pale = TYPE[t.id][1]; }
  });
  var AREA = { dues: "#00506a", ins: "#3fb5d9", event: "#413d6b", addon: "#ff9947" };
  FD.PAY_AREAS.forEach(function (a) { if (AREA[a.id]) a.color = AREA[a.id]; });
})();
