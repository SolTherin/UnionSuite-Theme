/**
 * fd-dashboard.js — Finance Dashboard: the run-list surface
 * © Union Innovation Hub.
 *
 * Two views live here: the dashboard (KPIs, daily-volume trend, payments by
 * type, the runs list grouped by date).
 *
 * The declines / arrears area is NOT here — it is its own surface
 * (arrears.html + fd-arrears.js) and is v2.
 *
 * Clicking a run calls FD.openRun(), which NAVIGATES to the dedicated payment
 * run page (payment-run.html / its RiSE page) rather than swapping a hidden div
 * into view. See fd-core.js → Nav for why that works inside an inlined iPart.
 *
 * Inline handlers are namespaced `FD.…` because this file is an IIFE — a bare
 * `onclick="setRange(…)"` has nothing to resolve against, and bare globals in a
 * live iMIS page risk colliding with iMIS's own scripts.
 */
(function () {
  "use strict";

  const C    = window.FDConfig;
  const Core = window.FDCore;
  const Data = window.FDData;
  const FD   = window.FD = window.FD || {};

  const { $, fmtMoney, fmtNum, fmtPct, fmtDateLong, fmtDateShort, esc,
          PAY_TYPES, typeById, isPaid, runStats, runState, isLongProcessingRun,
          txnBadge, runStatePill, toast, flashSwap } = Core;

  /* ═══════════════════════════════════════════════════════════
     STATE
     ═══════════════════════════════════════════════════════════ */
  /* `custom` is null for the presets, or { from, to } as Dates. */
  const state = { rangeDays: 30, custom: null, runFilter: "all", longProc: false };
  FD.state = state;

  const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const daysAgoOf = d => Math.round((midnight(Data.today()) - midnight(d)) / 86400000);
  const isoOf = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  /* Parse yyyy-mm-dd as LOCAL midnight. `new Date("2026-01-05")` is parsed as
     UTC and lands on the 4th in Australia — an off-by-one that would quietly
     drop a day's runs off either end of a custom range. */
  const parseISO = s => {
    const [y, m, d] = String(s).split("-").map(Number);
    return (y && m && d) ? new Date(y, m - 1, d) : null;
  };

  /* THE window, expressed in daysAgo — the one unit every downstream consumer
     already speaks (runs carry daysAgo; the trend buckets by it). Converting a
     custom date range here means the KPI roll-ups, the trend and the prior-period
     delta need no special casing at all.
       start = newest edge (0 = today), end = oldest edge, inclusive. */
  function windowRange() {
    if (state.custom) {
      const start = Math.max(0, daysAgoOf(state.custom.to));
      const end   = Math.max(start, daysAgoOf(state.custom.from));
      return { start, end, days: end - start + 1 };
    }
    return { start: 0, end: state.rangeDays - 1, days: state.rangeDays };
  }

  const runsInRange = () => {
    const w = windowRange();
    return Data.all().filter(r => r.daysAgo >= w.start && r.daysAgo <= w.end);
  };

  /* ── Roll-ups across a set of runs ────────────────────────────────────────
     Both go through runStats()/run.byType rather than reducing over run.txns.
     That is load-bearing: LIVE MODE HAS NO run.txns. Q1 returns one
     pre-aggregated row per run and never payment-grain data, so anything that
     reaches for .txns throws on the live shape (REVIEW-2026-07.md #1).
     runStats() short-circuits to run.stats when it is present, so these work
     unchanged in mock mode too — one code path, both modes. */
  function totals(runs) {
    const t = { count: 0, okCount: 0, okValue: 0, procCount: 0, procValue: 0,
                pendCount: 0, pendValue: 0, waitCount: 0, waitValue: 0,
                badCount: 0, badValue: 0, badUnprocessed: 0, totalValue: 0 };
    runs.forEach(r => {
      const s = runStats(r);
      for (const k in t) t[k] += s[k] || 0;
    });
    return t;
  }

  /* Per-payment-type totals. Live runs carry a pre-aggregated `byType`
     (dd / cc / oth); mock runs still have transactions, so fall back to those.
     NOTE: v1 is Kind 2 only, so live data populates dd and cc — the other four
     PAY_TYPES render as zero, which is correct. `byType.oth` has no matching
     PAY_TYPE and is therefore not charted; it should be 0 for Kind 2, and a
     non-zero OtherMethodCount in Q1 is the signal that something unexpected
     turned up. */
  function typeTotals(runs) {
    const out = {};
    PAY_TYPES.forEach(pt => { out[pt.id] = { count: 0, value: 0 }; });
    runs.forEach(r => {
      if (r.byType) {
        for (const id of ["dd", "cc"]) {
          if (out[id] && r.byType[id]) { out[id].count += r.byType[id].count; out[id].value += r.byType[id].value; }
        }
        return;
      }
      (r.txns || []).forEach(t => {
        const o = out[t.type];
        if (o) { o.count++; o.value += t.amount; }
      });
    });
    return out;
  }

  function setMetricActive(btn) {
    btn.parentNode.querySelectorAll("button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  }
  FD.setTrendMetric = (m, btn) => { state.trendMetric = m; setMetricActive(btn); renderTrend(); };
  FD.setTypeMetric  = (m, btn) => { state.typeMetric  = m; setMetricActive(btn); renderTypeBars(); };

  /* Heading text. A preset reads "Last 30 days"; a custom range names its dates,
     because "Last 47 days at a glance" tells the reader nothing about which. */
  function rangeLabel() {
    if (state.custom) {
      const { from, to } = state.custom;
      const sameYear = from.getFullYear() === to.getFullYear();
      const fromTxt = fmtDateShort(from) + (sameYear ? "" : ` ${from.getFullYear()}`);
      const toTxt   = `${fmtDateShort(to)} ${to.getFullYear()}`;
      return `${fromTxt} – ${toTxt} at a glance`;
    }
    if (state.rangeDays === 365) return "Last 12 months at a glance";
    return `Last ${state.rangeDays} days at a glance`;
  }

  function applyRange() {
    const el = $("kpi-range-label");
    if (el) el.textContent = rangeLabel();
    renderDashboard();
  }

  FD.setRange = function (value) {
    const picker = $("custom-range");

    if (value === "custom") {
      /* Seed the picker with the window that was already showing, so opening it
         is a starting point rather than a blank form. */
      const w = windowRange();
      const today = Data.today();
      const to   = state.custom ? state.custom.to   : today;
      const from = state.custom ? state.custom.from : new Date(midnight(today).getTime() - (w.days - 1) * 86400000);

      const fromEl = $("range-from"), toEl = $("range-to");
      /* max = today (no future ranges — future-dated runs are scheduled retries
         and are v2). min = the oldest run loaded, because the window is filtered
         out of one fetch and an earlier date would just come back empty. */
      const maxIso = isoOf(today), minIso = isoOf(Data.earliestLoaded());
      [fromEl, toEl].forEach(i => { i.max = maxIso; i.min = minIso; });
      fromEl.value = isoOf(from);
      toEl.value   = isoOf(to);

      state.custom = { from, to };
      if (picker) picker.hidden = false;
      applyRange();
      return;
    }

    state.custom = null;
    state.rangeDays = parseInt(value, 10) || 30;
    if (picker) picker.hidden = true;
    applyRange();
  };

  /* One handler for both inputs. Keeps from <= to by pushing the OTHER end,
     rather than rejecting the edit — picking a "from" after the current "to" is
     a normal way to move a window forward, not a mistake to refuse. */
  FD.setCustomRange = function (which, value) {
    const d = parseISO(value);
    if (!d || !state.custom) return;

    const today = Data.today();
    const clamp = x => (x > midnight(today) ? midnight(today) : x);

    if (which === "from") {
      state.custom.from = clamp(d);
      if (state.custom.from > state.custom.to) state.custom.to = state.custom.from;
    } else {
      state.custom.to = clamp(d);
      if (state.custom.to < state.custom.from) state.custom.from = state.custom.to;
    }
    $("range-from").value = isoOf(state.custom.from);
    $("range-to").value   = isoOf(state.custom.to);
    applyRange();
  };
  FD.setRunFilter = function (f, btn) {
    state.runFilter = f;
    state.longProc = false;
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c === btn));
    state.animateRuns = true;
    renderRuns();
  };
  FD.showLongProcessing = function () {
    if (!runsInRange().some(isLongProcessingRun)) return;
    state.longProc = true;
    const search = $("runs-search"); if (search) search.value = "";
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c.dataset.f === "review"));
    state.animateRuns = true;
    renderRuns();
    const ms = $("main-scroll"), el = $("runs-list");
    if (ms && el) ms.scrollTop += el.getBoundingClientRect().top - ms.getBoundingClientRect().top - 14;
  };
  FD.setReviewFilter = function (btn) {
    state.longProc = true;
    state.runFilter = "all";
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c === btn));
    state.animateRuns = true;
    renderRuns();
  };
  FD.clearLongProcessing = function () {
    state.longProc = false;
    state.runFilter = "all";
    document.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c.dataset.f === "all"));
    renderRuns();
  };

  /* ═══════════════════════════════════════════════════════════
     OPENING A RUN — the crossing point between the two surfaces
     ═══════════════════════════════════════════════════════════ */
  FD.openRun = function (runId) {
    /* Preferred path: a real navigation to the dedicated run page, so the run
       gets its own URL, its own history entry and a working browser Back. */
    if (Core.Nav.gotoRun(runId)) return;

    /* Fallback, when no run page is configured for this environment: render the
       run detail into this page's hidden container, the way the original
       single-file mockup did. */
    if (window.FDRun) window.FDRun.showInline(runId);
    else toast("No payment run page is configured for this site.", "");
  };

  FD.showDashboard = function () {
    const detail = $("view-detail");
    if (detail) detail.style.display = "none";
    $("view-dashboard").style.display = "";
    $("main-scroll").scrollTop = 0;
    const ctx = $("header-context");
    if (ctx) ctx.textContent = "Payment runs & settlement tracking";
  };

  /* ═══════════════════════════════════════════════════════════
     VIEW 1 — DASHBOARD
     ═══════════════════════════════════════════════════════════ */
  function renderDashboard() {
    renderKpis();
    renderTrend();
    renderTypeBars();
    renderRuns();
  }
  FD.renderDashboard = renderDashboard;

  function renderKpis() {
    const runs = runsInRange();
    const t = totals(runs);

    /* Previous period: the window of equal length immediately before this one.
       Works for a custom range too, since both are expressed in daysAgo. Needs
       2× the window loaded, which is why FDConfig.historyDays is 365 — at 90 the
       90-day range had no comparison at all. A 12-month range has none either,
       and correctly shows 0.0%: there is no prior year in the payload. */
    const w = windowRange();
    const prev = Data.all().filter(r => r.daysAgo > w.end && r.daysAgo <= w.end + w.days);
    const prevOkValue = totals(prev).okValue;
    const delta = prevOkValue ? (t.okValue - prevOkValue) / prevOkValue : 0;
    const deltaTxt = delta >= 0
      ? `<span class="up"><i class="fa-solid fa-caret-up"></i> ${fmtPct(Math.abs(delta))}</span> vs prior period`
      : `<span class="down"><i class="fa-solid fa-caret-down"></i> ${fmtPct(Math.abs(delta))}</span> vs prior period`;

    const kpis = [
      { label: "Total collected", value: fmtMoney(t.okValue), cls: "brand", sub: deltaTxt },
      { label: "Payments processed", value: fmtNum(t.count), sub: `across ${runs.length} payment runs` },
      { label: "Processing", value: fmtNum(t.procCount), cls: t.procCount ? "" : "pos", sub: `${fmtMoney(t.procValue)} awaiting DD result` },
      /* Always 0 in v1: "Awaiting payment" is the invoice world (Batch.Kind 1),
         which is v2. Kept deliberately — see README "Scope". */
      { label: "Invoices outstanding", value: fmtNum(t.waitCount), sub: `${fmtMoney(t.waitValue)} awaiting member payment` },
      /* No `action` in v1: the declines/arrears view is v2 (see README "Scope"),
         and this card was its only entry point. Restore
         action: "FD.showDeclines()", hint: "View declines ›"
         when #view-declines is built. */
      { label: "Declined", value: fmtNum(t.badCount), cls: t.badCount ? "neg" : "pos", sub: `${fmtMoney(t.badValue)} uncollected` },
    ];
    const reviewCount = runs.filter(isLongProcessingRun).length;
    const chip = $("chip-review");
    if (chip) {
      $("chip-review-count").textContent = fmtNum(reviewCount);
      chip.disabled = !reviewCount;
      chip.style.opacity = reviewCount ? "" : ".45";
      chip.style.cursor = reviewCount ? "" : "default";
    }
    kpis.push(reviewCount
      ? { label: "Runs to review", value: fmtNum(reviewCount), cls: "neg", sub: `processing longer than ${C.reviewProcessingDays} days`, action: "long-processing", hint: "View runs ›" }
      : { label: "Runs to review", value: "0", cls: "pos", sub: "nothing needs attention" });
    $("kpi-grid").innerHTML = kpis.map(k => `
      <div class="kpi-card${k.action ? " clickable" : ""}"${k.action ? ` data-fd-action="kpi" data-fd-arg="${k.action}" role="button" tabindex="0" title="${k.label}"` : ""}>
        <div class="kpi-label">${k.label}${k.hint ? `<span class="kpi-hint">${k.hint}</span>` : ""}</div>
        <div class="kpi-value ${k.cls || ""}">${k.value}</div>
        <div class="kpi-sub">${k.sub}</div>
      </div>`).join("");
  }

  function paintTrend(svg, geo) {
    geo.forEach((g, i) => {
      const ok  = svg.querySelector(`rect[data-b="ok"][data-i="${i}"]`);
      const bad = svg.querySelector(`rect[data-b="bad"][data-i="${i}"]`);
      if (ok) {
        ok.setAttribute("x", g.x); ok.setAttribute("width", g.w);
        ok.setAttribute("y", g.okH ? g.okY : 130); ok.setAttribute("height", g.okH);
        ok.setAttribute("opacity", g.okH ? "0.85" : "0");
        const t = ok.querySelector("title"); if (t) t.textContent = g.tip;
      }
      if (bad) {
        bad.setAttribute("x", g.x); bad.setAttribute("width", g.w);
        bad.setAttribute("y", g.badH ? g.badY : 130); bad.setAttribute("height", g.badH);
        bad.setAttribute("opacity", g.badH ? "0.8" : "0");
      }
    });
  }

  function renderTrend() {
    const byValue = (state.trendMetric || "value") === "value";
    const fmtM = byValue ? fmtMoney : fmtNum;
    const w = windowRange();
    const start = w.start;
    const end   = Math.min(w.end, C.historyDays - 1);
    const span  = end - start + 1;

    /* Days per bar. Over 90 days, one bar per day is sub-pixel: 365 days in a
       560-unit viewBox is a 1.15-unit bar, which merges into a band and makes
       the per-bar tooltip unhittable. Weekly keeps ~52 bars at ~10 units —
       the same visual language as the 30-day view. The panel title changes with
       it, so the axis never claims to be daily when it is not. */
    const BUCKET = span > 90 ? 7 : 1;
    const nBuckets = Math.ceil(span / BUCKET);

    /* Bucket b covers daysAgo [start + b*BUCKET, … + BUCKET-1]; b = 0 is the
       newest. Dates are derived arithmetically rather than taken from whichever
       run happens to fall in the bucket, so empty buckets still label correctly. */
    const dateFromDaysAgo = n => new Date(midnight(Data.today()).getTime() - n * 86400000);

    /* One pass over the runs — that inner filter would otherwise be
       O(buckets × runs), and it is the only hot loop here. */
    const buckets = new Map();
    for (const r of Data.all()) {
      if (r.daysAgo < start || r.daysAgo > end) continue;
      const idx = Math.floor((r.daysAgo - start) / BUCKET);
      let b = buckets.get(idx);
      if (!b) buckets.set(idx, b = { ok: 0, bad: 0 });
      const s = runStats(r);
      b.ok  += byValue ? s.okValue  : s.okCount;
      b.bad += byValue ? s.badValue : s.badCount;
    }

    /* Oldest bar first. */
    const byDay = [];
    for (let idx = nBuckets - 1; idx >= 0; idx--) {
      const b = buckets.get(idx);
      const oldestDaysAgo = Math.min(end, start + idx * BUCKET + BUCKET - 1);
      byDay.push({
        i: idx,
        ok: b ? b.ok : 0,
        bad: b ? b.bad : 0,
        date: dateFromDaysAgo(oldestDaysAgo),   // the bucket's FIRST day
      });
    }

    const W = 560, H = 130, PAD = 4;
    const max = Math.max(...byDay.map(d => d.ok), 1);
    const bw = (W - PAD * 2) / byDay.length;
    /* Geometry per day; both rects always exist so a metric switch morphs
       instead of redrawing */
    const geo = byDay.map((d, idx) => {
      const x = PAD + idx * bw;
      const okH  = (d.ok / max) * (H - 18);
      const badH = d.bad > 0 ? Math.max((d.bad / max) * (H - 18), 1.5) : 0;
      return {
        x: +(x + bw * 0.12).toFixed(1), w: +(bw * 0.76).toFixed(1),
        okY: +(H - okH).toFixed(1), okH: +okH.toFixed(1),
        badY: +(H - okH - badH - (badH ? 1 : 0)).toFixed(1), badH: +badH.toFixed(1),
        tip: `${BUCKET > 1 ? "Week of " : ""}${d.date ? fmtDateShort(d.date) : ""}: ${fmtM(d.ok)} collected${d.bad ? ", " + fmtM(d.bad) + " declined" : ""}`,
      };
    });
    const svg = $("trend-svg");
    if (svg.dataset.days !== String(geo.length)) {
      svg.dataset.days = String(geo.length);
      svg.innerHTML = `<line x1="0" y1="${H - 0.5}" x2="${W}" y2="${H - 0.5}" stroke="#d0d7e3" stroke-width="1"/>` +
        geo.map((g, i) => `<rect data-b="ok" data-i="${i}" x="${g.x}" y="${H}" width="${g.w}" height="0" rx="1.5" fill="#2563c4" opacity="0.85"><title></title></rect><rect data-b="bad" data-i="${i}" x="${g.x}" y="${H}" width="${g.w}" height="0" rx="1" fill="#dc2626" opacity="0.8"></rect>`).join("");
      requestAnimationFrame(() => paintTrend(svg, geo));
    } else {
      paintTrend(svg, geo);
    }

    /* Y-axis value labels (max → 0) and X-axis date labels across the range */
    $("trend-yaxis").innerHTML = `<span>${fmtM(max)}</span><span>${fmtM(byValue ? max / 2 : Math.round(max / 2))}</span><span>${byValue ? "$0" : "0"}</span>`;
    const title = $("trend-title");
    if (title) title.textContent = BUCKET > 1 ? "Weekly payment volume" : "Daily payment volume";
    $("trend-lg-ok").textContent  = byValue ? "Collected value" : "Collected payments";
    $("trend-lg-bad").textContent = byValue ? "Declined value"  : "Declined payments";
    flashSwap($("trend-yaxis"));
    flashSwap($("trend-lg-ok").closest(".trend-legend"));
    const N = byDay.length;
    /* Every bucket carries a date now — it is derived from daysAgo rather than
       borrowed from a run — so no scan for the nearest populated bar is needed. */
    const dateAt = idx => (byDay[idx] && byDay[idx].date) ? fmtDateShort(byDay[idx].date) : "";
    const xlabels = [0, 0.25, 0.5, 0.75, 1].map(f => dateAt(Math.round(f * (N - 1))));
    $("trend-xaxis").innerHTML = xlabels.map(l => `<span>${l}</span>`).join("");
  }

  function renderTypeBars() {
    const byType = typeTotals(runsInRange());
    /* Only types that actually occur. v1 is Kind 2 (dd + cc), so the other four
       would otherwise sit at a permanent zero — and even within a range, a type
       with no payments says nothing. Filtering on count OR value so a type is
       never dropped while it still holds money. */
    const rows = PAY_TYPES
      .map(pt => ({ pt, count: byType[pt.id].count, value: byType[pt.id].value }))
      .filter(r => r.count > 0 || r.value > 0);
    const byValue = (state.typeMetric || "count") === "value";
    const metric = r => byValue ? r.value : r.count;
    const max = Math.max(...rows.map(metric), 1);
    const cont = $("type-bars");

    if (!rows.length) {
      cont.innerHTML = `<div class="hbar-empty">No payments in this period.</div>`;
      FD.typeBarsPending = false;
      return;
    }

    /* Rows stay in a fixed DOM order and are re-ranked with translateY, so a
       metric switch animates (bar width + position) instead of redrawing.
       The count also changes when a type appears or disappears between ranges,
       which this same guard catches. */
    if (cont.childElementCount !== rows.length) {
      cont.innerHTML = rows.map(r => `
        <div class="hbar-row" data-t="${r.pt.id}">
          <div class="hbar-label" title="${esc(r.pt.label)}">${esc(r.pt.label)}</div>
          <div class="hbar-track"><div class="hbar-fill" style="width:0%;background:${r.pt.color}"></div></div>
          <div class="hbar-val"><span class="m">${fmtNum(r.count)}</span> · <span class="m">${fmtMoney(r.value)}</span></div>
        </div>`).join("");
    }
    const ranked = rows.slice().sort((a, b) => metric(b) - metric(a));

    /* Pitch = the real distance between two rows, read as an offsetTop delta.
       offsetTop is a LAYOUT position, so it ignores the transforms already
       applied by a previous render — which is what makes this safe to re-measure
       on every pass.

       It used to be `firstChild.offsetHeight + 8`, which had two problems. The 8
       silently duplicated `#type-bars`'s CSS `gap`, so changing the gap broke the
       chart. Worse, if the stylesheet has not applied yet the row measures its
       unstyled height (36px, because the label/track/value stack as blocks
       instead of laying out as a flex row) and every offset comes out ~1.7×
       too big — rows overlap above and leave a gap below. That is what Firefox
       showed on first load, where it lost the race against the runtime-injected
       fd-styles.css that Chromium happened to win; the real fix for that is in
       fd-boot.js, but this measurement should not have been fragile either. */
    const rowEls = Array.from(cont.children);
    const pitch = rowEls.length > 1 ? rowEls[1].offsetTop - rowEls[0].offsetTop : 0;

    /* Nothing sensible to measure (detached, display:none, stylesheet still
       pending). Render the bars and figures, but leave the rows in DOM order
       instead of scattering them at a guessed pitch. `typeBarsPending` tells the
       fonts/stylesheet-ready pass in fd-boot.js to come back once layout is real. */
    const rankable = pitch > 0;
    FD.typeBarsPending = !rankable;

    rows.forEach((r, domIdx) => {
      const el = cont.querySelector(`.hbar-row[data-t="${r.pt.id}"]`);
      if (!el) return;
      const rank = ranked.indexOf(r);
      el.style.transform = rankable ? `translateY(${(rank - domIdx) * pitch}px)` : "";
      el.style.zIndex = String(rows.length - rank);
      const val = el.querySelector(".hbar-val");
      /* Bold whichever figure the active toggle is ranking by */
      const html = `<span class="m${byValue ? "" : " on"}">${fmtNum(r.count)}</span> · <span class="m${byValue ? " on" : ""}">${fmtMoney(r.value)}</span>`;
      if (val.innerHTML !== html) { val.innerHTML = html; flashSwap(val); }
      requestAnimationFrame(() => {
        el.querySelector(".hbar-fill").style.width = (metric(r) / max * 100).toFixed(1) + "%";
      });
    });
  }

  /* Exposed so fd-boot.js can re-run the one measurement-dependent render once
     fonts settle — see FD.typeBarsPending above. */
  FD.renderTypeBars = renderTypeBars;

  /* ── Runs list grouped by date ───────────────────────────── */

  /* Staggered entrance for the runs list after a quick-filter change */
  function staggerRuns() {
    state.animateRuns = false;
    const list = $("runs-list");
    if (!list) return;
    list.classList.remove("runs-anim");
    void list.offsetWidth;
    list.classList.add("runs-anim");
    let i = 0;
    list.querySelectorAll(".run-card-5c, .runs-empty").forEach(el => {
      el.style.animationDelay = Math.min(i++ * 22, 260) + "ms";
    });
    list.addEventListener("animationend", function done(e) {
      if (e.target !== list) return;
      list.removeEventListener("animationend", done);
    });
  }

  function renderRuns() {
    const q = ($("runs-search").value || "").toLowerCase();
    let runs = state.longProc ? Data.all().filter(isLongProcessingRun) : runsInRange();
    if (!state.longProc && state.runFilter !== "all") runs = runs.filter(r => runState(r).key === state.runFilter);
    if (q) runs = runs.filter(r => (r.name + " " + r.id + " " + r.typeLabel + " " + fmtDateLong(r.date)).toLowerCase().includes(q));

    const badge = $("runs-count-badge");
    if (badge) badge.textContent = fmtNum(runs.length);

    const notice = state.longProc
      ? `<div class="filter-notice">Showing <strong>${fmtNum(runs.length)}</strong> run${runs.length === 1 ? "" : "s"} with payments processing longer than ${C.reviewProcessingDays} days — across all dates. <button type="button" data-fd-action="clear-long-processing">Clear filter</button></div>`
      : "";

    if (!runs.length) {
      $("runs-list").innerHTML = notice + `<div class="runs-empty">No payment runs match the current filters.</div>`;
      if (state.animateRuns) staggerRuns();
      return;
    }

    /* group by date */
    const groups = new Map();
    runs.forEach(r => {
      const key = r.date.toDateString();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(r);
    });

    let html = "";
    for (const [, dayRuns] of groups) {
      const d = dayRuns[0].date;
      const stats = dayRuns.map(runStats);
      const dayOkValue = stats.reduce((s, x) => s + x.okValue, 0);
      const dayCount   = stats.reduce((s, x) => s + x.count, 0);
      const dayBad     = stats.reduce((s, x) => s + x.badCount, 0);
      const dayProc    = stats.reduce((s, x) => s + x.procCount, 0);
      const dayPend    = stats.reduce((s, x) => s + x.pendCount, 0);
      html += `<div class="date-group">
        <div class="date-group-sticky">
        <div class="date-group-hd">
          <h3>${fmtDateLong(d)}</h3>
          <span class="date-group-meta">${dayRuns.length} run${dayRuns.length > 1 ? "s" : ""} · <strong>${fmtNum(dayCount)}</strong> payments · <strong>${fmtMoney(dayOkValue)}</strong> collected${dayPend ? ` · <span style="color:#5c6a79">${fmtNum(dayPend)} pending</span>` : ""}${dayProc ? ` · <span style="color:var(--uih-hub-blue)">${fmtNum(dayProc)} processing</span>` : ""}${dayBad ? ` · <span style="color:var(--danger)">${fmtNum(dayBad)} declined</span>` : ""}</span>
        </div>
        <div class="run-cols-hd">
          <div>Payment run</div>
          <div>Status</div>
          <div>Total amount</div>
          <div>Payments</div>
          <div>Pending</div>
          <div>Processing</div>
          <div>Declined</div>
          <div>Unprocessed</div>
          <div></div>
        </div>
        </div>`;
      for (const run of dayRuns) {
        const s = runStats(run);
        /* Unprocessed is a plain count in v1. The per-run "Retry · n" button is
           v2 (TODO.md §3); its handler and .retry-btn styles are parked. */
        html += `
        <div class="run-card-5c" data-run="${esc(run.id)}" role="button" tabindex="0" title="Open batch ${esc(run.id)} — view payments in this run">
          <div class="run-id-line">
            <div style="min-width:0;">
              <div class="run-name">${esc(run.name)}</div>
              <div class="run-sub">Batch ${esc(run.id)}${run.typeLabel ? " · " + esc(run.typeLabel) : ""}${run.desc ? " · " + esc(run.desc) : ""}</div>
            </div>
          </div>
          <div>${runStatePill(run)}</div>
          <div class="run-col-value amount" data-label="Total">${fmtMoney(s.totalValue)}</div>
          <div class="run-col-value" data-label="Payments">${fmtNum(s.count)}</div>
          <div class="run-col-value" data-label="Pending" style="color:${s.pendCount ? "#5c6a79" : "var(--text-muted)"}">${s.pendCount ? fmtNum(s.pendCount) : "—"}</div>
          <div class="run-col-value" data-label="Processing" style="color:${s.procCount ? "var(--uih-hub-blue)" : "var(--text-muted)"}">${s.procCount ? fmtNum(s.procCount) : "—"}</div>
          <div class="run-col-value" data-label="Declined" style="color:${s.badCount ? "var(--danger)" : "var(--text-muted)"}">${s.badCount ? fmtNum(s.badCount) : "—"}</div>
          <div class="run-col-value" data-label="Unprocessed" style="color:${s.badUnprocessed ? "var(--danger)" : "var(--text-muted)"}">${s.badUnprocessed ? fmtNum(s.badUnprocessed) : "—"}</div>
          <div class="run-chevron"><i class="fa-solid fa-chevron-right"></i></div>
        </div>`;
      }
      html += `</div>`;
    }
    $("runs-list").innerHTML = notice + html;
    if (state.animateRuns) staggerRuns();
    Core.watchStickyHeaders();
  }
  FD.renderRuns = renderRuns;

  /* The declines / arrears area used to live here as VIEW 3. It moved to its
     own surface on 3 Sep 2026 — arrears.html + fd-arrears.js — so this v1
     bundle no longer carries it. See README "Scope".                        */

  /* Exposed for inline handlers in the generated markup. */
  FD.toast = toast;
  FD.txnBadge = txnBadge;
})();
