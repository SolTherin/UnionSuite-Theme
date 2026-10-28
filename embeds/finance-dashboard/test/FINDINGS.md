# iMIS HTML attribute filter — findings

What iMIS's save-time transformations do to this app, measured against a real
published page, and confirmed with a probe run on a live RiSE page.
**4 Sep 2026 — probe results in §1a are measured, not inferred.**

Sources:
- `imis_iqa_attribute_filter_test_results.pdf` (Zentso) — tested markup only
- `imis rendered dashboard HTML.html` — the dashboard as iMIS actually served it
- `compare-filter.js` — the tool that produced the numbers below
- `imis-filter-probe.html` — the probe; RUN on a live RiSE page, results in §1a
- `simulate-filter.js` — applies both transformations to a build and syntax-checks it

---

## The short version

| | |
|---|---|
| **Two rules keep any build alive.** | No tag-shaped `on*` attribute anywhere, including in strings built inside a script (§1a, §2). No named HTML entity in any `.js` file (§2a) — that one is fatal at parse time. |
| **Prefer the CDN build.** | Code fetched from Pages never passes through the save pipeline at all, so none of this can bite. 8 KB vs ~130 KB, and one push updates every page. `build-embed.js` emits it by default. |
| **Check before pasting.** | `node test/simulate-filter.js` applies both transformations and syntax-checks the result. Exit 1 if a build would break. |

---

## 1. Every `on*` attribute is removed — confirmed on our own page

Measured with `compare-filter.js` over the inlined dashboard build:

```
on*="…" occurrences   pasted: 16    served: 0
pasted by attribute:  { onclick: 15, oninput: 1 }
survived verbatim:    0
```

This matches the Zentso PDF: matching is case-insensitive, tolerates whitespace
(`onclick ="1"`), and decodes HTML entities first (`o&#110;click`). There is no
escaping trick — the attribute simply cannot be used.

## 1a. THE ACTUAL RULE (probe results, 4 Sep 2026)

The probe was run on a real RiSE page. Results below, and they refine the rule
considerably:

| # | Technique | Result |
|---|---|---|
| 1 | `onclick=` attribute in static markup | **STRIPPED** (control) |
| 2 | `addEventListener` | SURVIVED |
| 3 | `el.onclick = fn` — property assignment | **SURVIVED** |
| 4 | jQuery `.click(fn)` | SURVIVED (jQuery 3.6.0 ships with iMIS) |
| 5 | jQuery `.on("click", fn)` delegated | SURVIVED |
| 6 | `innerHTML` string containing `onclick=` | **STRIPPED** |
| 7 | `setAttribute("onclick", …)` | **SURVIVED** |
| 8 | `data-*` + delegated listener | SURVIVED |

**The rule is not "on\* anywhere in the text". It is: anything that parses as an
HTML START-TAG gets cleaned — wherever it appears, including inside a string
literal in a `<script>` block.**

The decisive pair, both string literals in the same script, one cleaned and one
not:

```js
// served — the onclick was removed, because this parses as a <button> tag
slot6.innerHTML = '<button type="button">Test 6</button>';

// served — untouched, because "x onclick=…" is not a tag
["attribute form in a string", 'x onclick="y"', 'x onclick="y"'],
```

Every string in the integrity panel came back **intact** — including
`'x onclick="y"'`, `'h href="javascript:1"'` and
`'d style="background:url(javascript:1)"'`. None of them is inside a `<`…`>`.

### What follows from that

- **`setAttribute("onclick", handler)` is a working escape hatch.** `"onclick"`
  followed by a comma is not an attribute assignment, so the parser never sees a
  tag. Confirmed by test 7.
- **`el.onclick = fn` is safe.** The earlier worry — that `onclick =` would match
  a whitespace-tolerant matcher — is wrong. It needs the tag context.
- **jQuery adds nothing over `addEventListener`.** Both survive; use whichever.
- **Only markup-shaped strings are at risk**, which is exactly what the render
  functions build.

## 2. ⚠ The filter reaches inside `<script>` text — and can CORRUPT it

This is the finding the PDF did not cover, because it tested markup rather than
script content. **Of 25 `onclick` occurrences in the inlined build, 1 survived —
and that one was inside a JS comment.**

The render functions build HTML as template literals, so their `onclick="…"`
text sits inside JavaScript. The filter removes it there too. Usually the cut is
clean:

```js
// pasted
<div class="run-card-5c" data-run="${esc(run.id)}" role="button" tabindex="0" onclick="FD.openRun('${esc(run.id)}')" title="…">
// served
<div class="run-card-5c" data-run="${esc(run.id)}" role="button" tabindex="0" title="…">
```

**But when the handler's value contains a double quote, the cut lands in the
wrong place and mangles the surrounding code:**

```js
// pasted
class="detail-action danger" onclick="FD.toast('Retry batch created for ${softUnproc} unprocessed soft decline${softUnproc > 1 ? "s" : ""} (mock)','success')" title="…"

// served
class="detail-action danger" batch created for ${softUnproc} unprocessed soft decline${softUnproc > 1 ? "s" : ""} (mock)','success')" title="…"
```

The attribute value was taken to end at the first `"` *inside the template
literal* (`? "s"`), so everything from `onclick="` to that quote was deleted —
leaving `batch created for …` as orphaned tokens. That is a **JavaScript syntax
error**, not a missing handler: the whole script block dies, and with it the
entire app, not just one button.

**Consequence:** this is why the conversion in §+"+What this changed+"+ had to cover EVERY
generated handler, not just the visible ones — a single surviving handler whose
value contains a quote takes down the whole bundle.

## 2a. ⚠⚠ HTML ENTITIES ARE DECODED — the one that actually killed the build

**This is a separate transformation from the attribute filter, and it is the
more dangerous of the two.** Reported from a live page 4 Sep 2026:

```
Uncaught SyntaxError: "" string literal contains an unescaped line break
```

`fd-core.js` → `esc()` was written as a named-entity map. What came back:

```js
// pasted
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g,
  c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// served — every entity decoded to its literal character
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g,
  c => ({ "&": "&", "<": "<", ">": ">", '"': """ }[c]));
```

The quote entity became a bare `"`, producing `"""` — an unterminated string
literal. **The whole bundle fails to parse, so nothing runs at all.** Not one
broken button: a blank page.

Note the irony — the casualty was the app's own HTML-escaping function.

### The fix

Numeric character references assembled at runtime, so no complete entity is
ever written literally in the source:

```js
const AMP = String.fromCharCode(38);
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g,
  c => AMP + "#" + c.charCodeAt(0) + ";");
```

Verified in-browser: `Tom & "Jerry" <b>BOLD</b>` renders as literal text with no
real `<b>` element, i.e. escaping still works.

### The rule

**Never write a named HTML entity in a `.js` file.**

The 24 display entities (`&middot;`, `&mdash;`, `&hellip;`, `&rsaquo;`) were
harmless — they decode to the same glyph — but they were replaced with the
literal characters anyway, so the served file matches the source and a grep for
entities in JS stays meaningful. There are now zero.

## 3. `<i>` is rewritten to `<em>`

Unrelated to the attribute filter, but it happens on the same save:

```
<i class="fa-…"    pasted=15   served=0
<em class="fa-…"   pasted=0    served=15
```

**Harmless here** — FontAwesome styles by class, not tag, so the icons still
render. Worth knowing before someone writes a CSS selector against `i.fa-solid`.

## 4. What survives

From the Zentso PDF, corroborated by our page:

- `data-*` attributes — **including `data-onclick`**. The supported way back.
- `class`, `id`, `title`, `target`, `rel`, `aria-*`
- benign `style="color:red"` (only dangerous URI schemes in `style` are stripped)
- `<script>`, `<style>`, `<iframe>`, `<object>`, `<embed>` **tags** — the filter
  does not touch tag names at all, only attributes
- IQA placeholders like `{#Party.FirstName noencode}` — a separate layer

---

## What this changed in the app

| Change | Where |
|---|---|
| 12 shell handlers → `data-fd-action` / `data-fd-arg` | `index.html` (11), `arrears.html` (1) |
| Delegated click/change/input binder | `fd-boot.js` → `bindStaticHandlers()` |
| Default build is now markup + CDN loader (8 KB, zero `on*`) | `build-embed.js` |
| Inlined build demoted to `--inline` | `build-embed.js` |
| 22 generated handlers → `data-*`, delegation extended to cover them | `fd-dashboard.js`, `fd-run.js`, `fd-arrears.js`, `fd-boot.js` |

All 22 runtime-generated handlers were **also converted** on 4 Sep 2026, so the
inline build works too — see below.

---

## Is an inlined build viable after all?

Yes — §1a means it is, which was not clear before the probe ran. To make one
work, every generated `onclick=` would need to become one of:

1. **`data-*` + a delegated listener** — what the shells already do. Best: no
   markup-shaped handler text exists at all, so nothing can be cleaned.
2. **`setAttribute("onclick", …)`** after building the element — survives (test
   7), and is the smaller edit, but it keeps handler logic in strings.

**DONE 4 Sep 2026 — all 22 generated handlers converted to `data-*` + delegation.**
Both builds now survive the filter: `grep` for a tag-shaped `on*=` in any inline
build returns zero. The CDN build is still the default, because it is 8 KB
instead of 130 KB and
updates every embedded page from one Pages push instead of a manual re-paste per
page. Inline is now a safe fallback if Pages becomes unreachable from
the iMIS host, rather than a broken option.

**Whichever build you use, the shell markup rule stands:** never put an `on*`
attribute in an HTML shell. It works on a dev server and vanishes in iMIS.

---

## Reproducing

```bash
node test/compare-filter.js dist/dashboard-embed-inline.html "test/imis rendered dashboard HTML.html"
```

⚠ **Only compare identical builds.** The tool warns when event-binding API
counts differ, which means the source changed between pasting and comparing —
it cannot tell your edits from the filter's. The run above reports drift for
exactly that reason: the shells were converted to `data-*` after the page was
published. The `on*` counts remain valid because the generated handlers were
not touched.
