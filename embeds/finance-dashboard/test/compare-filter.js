#!/usr/bin/env node
/**
 * compare-filter.js — diff what you PASTED into iMIS against what it SERVED.
 *
 *   node test/compare-filter.js <pasted-file> <served-file>
 *   node test/compare-filter.js dist/dashboard-embed-inline.html "test/imis rendered dashboard HTML.html"
 *
 * Reports every on* attribute, dangerous-scheme href/style and event-binding
 * API in each file, and lists which occurrences disappeared.
 *
 * ⚠ ONLY MEANINGFUL IF THE TWO FILES ARE THE SAME BUILD. If you edited the
 *   source between pasting and comparing, differences will include YOUR changes
 *   and the tool cannot tell them apart from the filter's. It warns when the
 *   counts look like drift rather than filtering.
 */
"use strict";
const fs = require("fs");

const [, , pastedPath, servedPath] = process.argv;
if (!pastedPath || !servedPath) {
  console.error("usage: node test/compare-filter.js <pasted-file> <served-file>");
  process.exit(1);
}
const pasted = fs.readFileSync(pastedPath, "utf8");
const served = fs.readFileSync(servedPath, "utf8");

const rule = s => "─".repeat(s);
const count = (hay, needle) => hay.split(needle).length - 1;

/* ── 1. on* attributes ──────────────────────────────────────────────────── */
const ON_ATTR = /\son[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*')/g;
const pHits = [...pasted.matchAll(ON_ATTR)].map(m => m[0]);
const sHits = [...served.matchAll(ON_ATTR)].map(m => m[0]);

console.log("\n" + rule(72));
console.log("on*=\"…\" ATTRIBUTE OCCURRENCES");
console.log(rule(72));
console.log("pasted:", pHits.length, "   served:", sHits.length);

const byAttr = list => list.reduce((a, h) => {
  const k = h.trim().split(/\s*=/)[0].toLowerCase();
  a[k] = (a[k] || 0) + 1; return a;
}, {});
console.log("pasted by attribute:", JSON.stringify(byAttr(pHits)));
console.log("served by attribute:", JSON.stringify(byAttr(sHits)));

const survivors = pHits.filter(h => served.includes(h));
console.log("\nsurvived verbatim:", survivors.length);
survivors.slice(0, 10).forEach(h => console.log("   SURVIVED  " + h.trim().slice(0, 88)));
if (!survivors.length) console.log("   (none — every on* attribute was removed)");

/* Show a few before/after pairs, using surrounding context as the anchor. */
console.log("\nBEFORE / AFTER (first 5 removed):");
let shown = 0;
for (const h of pHits) {
  if (shown >= 5 || served.includes(h)) continue;
  const i = pasted.indexOf(h);
  const before = pasted.slice(Math.max(0, i - 55), i + h.length + 45).replace(/\s+/g, " ");
  const anchor = pasted.slice(Math.max(0, i - 40), i).replace(/\s+/g, " ").trim();
  const j = served.indexOf(anchor);
  const after = j < 0 ? "(anchor not found — line may have changed for other reasons)"
                      : served.slice(j, j + 100).replace(/\s+/g, " ");
  console.log("\n  - pasted: …" + before + "…");
  console.log("    served: …" + after + "…");
  shown++;
}

/* ── 2. dangerous URI schemes ───────────────────────────────────────────── */
console.log("\n" + rule(72));
console.log("DANGEROUS URI SCHEMES in href/style");
console.log(rule(72));
for (const s of ["javascript:", "data:text/html", "vbscript:"]) {
  console.log(`${s.padEnd(18)} pasted=${String(count(pasted, s)).padEnd(5)} served=${count(served, s)}`);
}

/* ── 3. binding APIs that should be untouched ───────────────────────────── */
console.log("\n" + rule(72));
console.log("EVENT-BINDING APIs  (these are JS calls, not attributes —");
console.log("a drop here means build drift, NOT the filter)");
console.log(rule(72));
const apis = ["addEventListener", ".click(", ".on(", "setAttribute", "dataset.", "data-"];
let suspectDrift = false;
for (const a of apis) {
  const p = count(pasted, a), s = count(served, a);
  if (p !== s) suspectDrift = true;
  console.log(`${a.padEnd(20)} pasted=${String(p).padEnd(5)} served=${String(s).padEnd(5)} ${p === s ? "" : "  ← DIFFERS"}`);
}

console.log("\n" + rule(72));
if (suspectDrift) {
  console.log("⚠ One or more binding APIs differ in count. The filter does not touch");
  console.log("  these, so the two files are probably NOT the same build. Re-export the");
  console.log("  pasted build from the exact commit you published before trusting any");
  console.log("  of the numbers above.");
} else {
  console.log("✓ Binding APIs match — the two files look like the same build, so the");
  console.log("  on* differences above can be attributed to the filter.");
}
console.log(rule(72) + "\n");
