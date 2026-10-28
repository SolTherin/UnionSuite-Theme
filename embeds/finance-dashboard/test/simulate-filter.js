#!/usr/bin/env node
/**
 * simulate-filter.js — will this survive iMIS's save pipeline?
 *
 *   node test/simulate-filter.js dist/dashboard-embed-inline.html
 *   node test/simulate-filter.js                    # checks every dist/*.html
 *
 * Applies the two transformations iMIS is known to perform on saved content,
 * then syntax-checks every script block in the result. Run this before pasting
 * anything into a RiSE content record.
 *
 * The transformations (measured 4 Sep 2026 — see FINDINGS.md):
 *   1. HTML entities are DECODED — everywhere, including inside script text.
 *      A named quote entity becomes a bare `"`, which inside a double-quoted
 *      JS string is an unescaped-line-break SyntaxError that kills the bundle.
 *   2. on* attributes are STRIPPED from anything that parses as a start-tag —
 *      again including tag-shaped strings inside script text.
 *
 * Exit code 1 if any block would stop parsing, so this can gate a build.
 */
"use strict";
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const DIR = path.join(__dirname, "..");

/* Entities the filter is known to decode. Only the ones that matter need to be
   exact — the point is to catch a decode that breaks JS, not to be a full
   HTML5 entity table. */
const NAMED = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  middot: "·", mdash: "—", ndash: "–", hellip: "…",
  rsaquo: "›", lsaquo: "‹", times: "×", copy: "©",
};

function applyImisFilter(html) {
  return html
    /* 1. decode entities */
    .replace(/&([a-zA-Z]+);/g, (m, n) => (NAMED[n] !== undefined ? NAMED[n] : m))
    .replace(/&#(\d+);/g, (m, d) => String.fromCharCode(Number(d)))
    /* 2. strip on* from anything tag-shaped */
    .replace(/<[a-zA-Z][^>]*>/g, tag =>
      tag.replace(/\s+on[a-zA-Z]+\s*=\s*("[^"]*"|'[^']*')/g, ""));
}

/* Script blocks, ignoring HTML comments — a comment mentioning a script tag is
   not a script block, and treating it as one produces a false failure. */
function scriptBlocks(html) {
  const noComments = html.replace(/<!--[\s\S]*?-->/g, "");
  return [...noComments.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);
}

function check(file) {
  const raw = fs.readFileSync(file, "utf8");
  const filtered = applyImisFilter(raw);
  const rel = path.relative(DIR, file);

  const problems = [];

  /* Named entities anywhere in a script block are a latent hazard even if this
     particular one happens to survive — flag them. */
  scriptBlocks(raw).forEach((src, i) => {
    const ents = [...src.matchAll(/&[a-zA-Z]+;/g)].map(m => m[0]);
    if (ents.length) {
      problems.push(`block ${i}: named HTML entities in script text: ${[...new Set(ents)].join(" ")}`);
    }
  });

  /* Tag-shaped on* handlers — these get stripped, silently disabling controls. */
  const onAttrs = [...raw.matchAll(/<[a-zA-Z][^>]{0,300}?\son([a-zA-Z]+)\s*=\s*("[^"]*"|'[^']*')/g)];
  if (onAttrs.length) {
    problems.push(`${onAttrs.length} tag-shaped on* attribute(s) — these will be removed`);
  }

  /* The real test: does it still parse afterwards? */
  const after = scriptBlocks(filtered);
  after.forEach((src, i) => {
    try { new vm.Script(src); }
    catch (e) { problems.push(`block ${i}: WOULD NOT PARSE — ${e.message.split("\n")[0]}`); }
  });

  const ok = problems.length === 0;
  console.log(`${ok ? "✓" : "✗"} ${rel}  (${after.length} script block${after.length === 1 ? "" : "s"})`);
  problems.forEach(p => console.log(`    ${p}`));
  return ok;
}

const args = process.argv.slice(2);
const files = args.length
  ? args
  : fs.readdirSync(path.join(DIR, "dist")).filter(f => f.endsWith(".html")).map(f => path.join(DIR, "dist", f));

if (!files.length) { console.error("nothing to check — run build-embed.js first"); process.exit(1); }
console.log("Simulating iMIS save-time filtering…\n");
const allOk = files.map(check).every(Boolean);
console.log(allOk ? "\nAll builds survive the filter." : "\nAt least one build would break — do not paste it.");
process.exit(allOk ? 0 : 1);
