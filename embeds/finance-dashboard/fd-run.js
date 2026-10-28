/**
 * fd-run.js — Finance Dashboard: the dedicated payment-run surface
 * © Union Innovation Hub.
 *
 * Renders one payment run in full: header, KPI row, by-type / outcome / decline
 * breakdowns, and the transactions table.
 *
 * It serves two callers, and the only difference between them is how you get
 * back to the run list:
 *   • payment-run.html — its OWN page. `?BatchID=<id>` names the run, and "Back to
 *     dashboard" in the header navigates to the run-list page. Browser Back
 *     works too, because getting here was a real navigation.
 *   • index.html fallback — when no run page is configured for this
 *     environment, FD.openRun() calls showInline() and this renders into the
 *     dashboard page's hidden #view-detail container, with an in-page back
 *     button. That is the original single-file mockup's behaviour.
 *
 * Exposes `window.FDRun`, and its UI callbacks on the shared `window.FD`.
 */
window.FDRun = (function () {
  "use strict";

  const C    = window.FDConfig;
  const Core = window.FDCore;
  const Data = window.FDData;
  const FD   = window.FD = window.FD || {};

  const { $, fmtMoney, fmtNum, fmtDateLong, esc, PAY_TYPES, typeById, isPaid,
          declineKind, STATUS_ORDER, runStats, runStatePill, txnBadge, toast } = Core;

  const detailState = { runId: null, filter: "all", type: "all", search: "", page: 1 };
  FD.detailState = detailState;

  /* ═══════════════════════════════════════════════════════════
     ENTRY POINTS
     ═══════════════════════════════════════════════════════════ */

  /* Boot the dedicated run page from the URL. */
  async function boot() {
    Core.Nav.surface = "run";
    let runId = Core.Nav.runIdFromUrl();
    const container = $("detail-content");

    /* Sample data only: with no ?BatchID= (a file previewer, which has no
       query string to give), show the newest sample run rather than an empty
       page, so the screen can be reviewed on its own. Live keeps the notice —
       guessing a real batch would be wrong. */
    if (!runId && !Data.isLive()) {
      await Data.load();
      const newest = Data.all().slice().sort((a, b) => b.date - a.date)[0];
      if (newest) runId = newest.id;
    }

    /* Before anything can fail: the way out belongs in the header even on the
       error paths, or a stale link strands the user on a dead page. */
    renderBackAffordance();

    if (!runId) {
      Core.notice(container, "No payment run selected",
        "This page shows one payment run. Open it from the payment-runs dashboard, " +
        "or add ?" + C.runParam + "=<run id> to the address.", "Go to the dashboard");
      return;
    }

    /* No Data.load() here: loadRun() fetches this ONE batch. Calling load()
       first would run Q1 across 365 days just to render one run's header. */
    Core.skeletonRun(container);
    const run = await Data.loadRun(runId);
    if (!run) {
      Core.clearSkeleton();
      Core.notice(container, "Payment run not found",
        `No payment run matching “${runId}” is available. ` +
        "It may have been archived, or the link may be stale.", "Back to all payment runs");
      return;
    }

    detailState.runId = runId;
    detailState.filter = "all";
    detailState.type = "all";
    detailState.search = "";
    detailState.page = 1;
    await renderDetail();
    Core.clearSkeleton();
  }

  /* Fallback path: render into the dashboard page without a navigation. */
  async function showInline(runId) {
    detailState.runId = runId;
    detailState.filter = "all";
    detailState.type = "all";
    detailState.search = "";
    detailState.page = 1;
    $("view-dashboard").style.display = "none";
    /* #view-declines left this page with the arrears split (3 Sep 2026). */
    if ($("view-declines")) $("view-declines").style.display = "none";
    $("view-detail").style.display = "";
    $("main-scroll").scrollTop = 0;
    renderBackAffordance();
    await renderDetail();
  }

  /* The way back differs per caller, so it is decided once, here.
     On its own page the header carries the link (it survives every re-render of
     #detail-content); inline, an in-page button above the content is right,
     because the header belongs to the dashboard. */
  function renderBackAffordance() {
    const headerSlot = $("header-back-slot");
    const inlineSlot = $("detail-back-slot");
    const dedicated = Core.Nav.surface === "run";

    if (headerSlot) {
      headerSlot.innerHTML = dedicated
        ? `<a class="header-back" href="${esc(Core.Nav.urlFor("dashboard") || "#")}" data-fd-action="back-dashboard"><i class="fa-solid fa-arrow-left"></i> Back to dashboard</a>`
        : "";
    }
    if (inlineSlot) {
      inlineSlot.innerHTML = dedicated
        ? ""
        : `<button type="button" class="back-btn" data-fd-action="back-dashboard"><i class="fa-solid fa-arrow-left"></i> Back to all payment runs</button>`;
    }
    const ctx = $("header-context");
    if (ctx && dedicated) ctx.textContent = "Payment run detail";
  }

  /* One handler for both shapes. As an <a> it has a real href, so middle-click
     and "open in new tab" work; the click handler keeps the in-page fallback and
     avoids a pointless reload when navigation isn't configured. */
  FD.backToDashboard = function (event) {
    if (Core.Nav.gotoDashboard()) return true;      // let the <a> / assign() run
    if (event) event.preventDefault();
    if (window.FD.showDashboard) window.FD.showDashboard();
    else window.history.back();
    return false;
  };

  /* Status and payment type are two independent chip groups that combine
     (Declined + Credit Card), so each chip only toggles within its own group. */
  function activateChip(btn) {
    const group = btn.closest(".chip-group") || btn.parentElement;
    group.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c === btn));
  }
  FD.setDetailFilter = function (f, btn) {
    detailState.filter = f;
    detailState.page = 1;
    activateChip(btn);
    renderDetailTable();
  };
  FD.setDetailType = function (t, btn) {
    detailState.type = t;
    detailState.page = 1;
    activateChip(btn);
    renderDetailTable();
  };
  /* Search is a SERVER round trip now (Q2's @Search), and the boot dispatcher
     fires this on every `input` event. Un-debounced, typing "Bennett" is seven
     requests, each scanning the batch — and the last one to arrive wins, which
     is not necessarily the last one sent. Debounce here rather than in
     fd-boot.js so the dashboard's own searches, which are still in-memory,
     keep responding on every keystroke. */
  const SEARCH_DEBOUNCE_MS = 300;
  let searchTimer = null;
  FD.setDetailSearch = function (v) {
    detailState.search = v;
    detailState.page = 1;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderDetailTable, SEARCH_DEBOUNCE_MS);
  };

  /* Page changes are a server round trip (Offset/Fetch), so the last known
     page count is kept here to clamp against — a click on "next" past the end
     would otherwise fetch an empty page and strand the user on it. Set by
     renderDetailTable from the total Q2 returns. */
  let lastPageCount = 1;

  FD.setDetailPage = function (n) {
    const page = Math.min(Math.max(1, Number(n) || 1), Math.max(1, lastPageCount));
    if (page === detailState.page) return;
    detailState.page = page;
    renderDetailTable();
    /* Jump back to the top of the table, not the top of the page: the header
       and panels have not changed and scrolling past them again is a nuisance. */
    const anchor = $("txn-table-slot");
    if (anchor && anchor.scrollIntoView) anchor.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  /* ═══════════════════════════════════════════════════════════
     CSV EXPORT
     ═══════════════════════════════════════════════════════════ */

  /* One CSV field.

     Two separate concerns, both required:

     1. CSV quoting — a value containing a comma, a quote or a newline must be
        wrapped in quotes with its own quotes doubled, or the row splits into
        the wrong number of columns. Member names carry commas ("Smith, John").

     2. FORMULA INJECTION — Excel and Sheets execute a cell beginning with
        = + - or @. A decline reason or a member name starting with one of
        those would run on open, and this file is destined for finance staff.
        Prefixing a tab neutralises it while still displaying the original
        text. This is a spreadsheet-safety measure, not cosmetic; do not
        "tidy" it away. */
  function csvField(v) {
    if (v === null || v === undefined) return "";
    let s = String(v);
    if (/^[=+\-@]/.test(s)) s = "\t" + s;
    return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }

  const CSV_COLUMNS = [
    ["Reference",       t => t.ref],
    ["Member ID",       t => t.memberId],
    ["Member name",     t => t.member],
    ["Party ID",        t => t.partyId],
    ["Payment type",    t => typeById(t.type).label],
    ["Amount",          t => t.amount],          // raw number, not fmtMoney: this is for arithmetic
    ["Status",          t => t.status],
    ["Status code",     t => t.statusRaw],
    ["Result / note",   t => t.reason],
    ["Response code",   t => t.code],
    ["Still owed",      t => (t.stillOwed ? "Yes" : "No")],
    ["Processing days", t => t.processingDays],
    ["Charge date",     t => t.chargeDate],      // raw SQL string; see rowToTxn on the missing offset
  ];

  function buildCsv(rows) {
    const lines = [CSV_COLUMNS.map(c => csvField(c[0])).join(",")];
    for (const t of rows) lines.push(CSV_COLUMNS.map(c => csvField(c[1](t))).join(","));
    /* CRLF and a UTF-8 BOM: without the BOM Excel reads the file as the system
       codepage and mangles any non-ASCII member name. */
    return "﻿" + lines.join("\r\n") + "\r\n";
  }

  function downloadCsv(filename, text) {
    const blob = new Blob([text], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.style.display = "none";
    document.body.appendChild(a);
    a.click();
    /* Revoke on a later tick — Safari cancels the download if the object URL
       dies in the same one. */
    setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 1000);
  }

  /* Progress for the paged export, shown in the toast stack: a label, a bar
     and a Cancel button. Between pages the bar moves by csvPageSize rows. */
  function exportProgress() {
    const host = $("toast-container");
    if (!host) return { update() {}, close() {} };
    const el = document.createElement("div");
    el.className = "toast csv-progress";
    el.innerHTML = `
      <div class="csv-progress-row">
        <span class="csv-progress-label" role="status">Preparing CSV…</span>
        <button type="button" class="csv-progress-cancel" data-fd-action="export-cancel">Cancel</button>
      </div>
      <div class="csv-progress-track" role="progressbar" aria-label="CSV export progress"
           aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><div class="csv-progress-bar"></div></div>`;
    host.appendChild(el);
    const label = el.querySelector(".csv-progress-label");
    const track = el.querySelector(".csv-progress-track");
    const bar   = el.querySelector(".csv-progress-bar");
    return {
      update(loaded, total) {
        const pct = total ? Math.min(100, Math.round(loaded / total * 100)) : 100;
        label.textContent = `Exporting ${fmtNum(loaded)} of ${fmtNum(total)} (${pct}%)`;
        bar.style.width = pct + "%";
        track.setAttribute("aria-valuenow", String(pct));
      },
      close() { el.remove(); },
    };
  }

  let exportAbort = null;          // non-null while an export is running

  FD.cancelExport = function () { if (exportAbort) exportAbort.abort(); };

  /* Exports the CURRENT VIEW — whatever the chips and the search box are set
     to, which is the whole run when nothing is filtered. Least surprising, and
     the filename says which so a file on someone's desktop is self-describing.
     Fetched page by page (Data.loadAllTransactions) behind a progress bar; the
     row cap is C.csvMaxRows, and past it the user is told the file is short. */
  FD.exportCsv = async function () {
    if (exportAbort) return;                     // a second click while fetching
    const run = Data.findRun(detailState.runId);
    if (!run) return;

    const ctl = exportAbort = new AbortController();
    const btn = document.querySelector('.fd-root [data-fd-action="export-csv"]');
    if (btn) btn.disabled = true;
    const progress = exportProgress();
    try {
      const { rows, total, truncated, cancelled } = await Data.loadAllTransactions(detailState.runId, {
        status: detailState.filter,
        search: detailState.search,
        type:   detailState.type,
      }, { signal: ctl.signal, onProgress: progress.update });

      if (cancelled) { toast("Export cancelled."); return; }
      if (!rows.length) { toast("Nothing to export for the current filter."); return; }

      const bits = ["payment-run", String(run.id)];
      if (detailState.type !== "all") bits.push(typeById(detailState.type).label.replace(/\s+/g, "-").toLowerCase());
      if (detailState.filter !== "all") bits.push(detailState.filter.replace(/\s+/g, "-").toLowerCase());
      if (detailState.search) bits.push("search");
      downloadCsv(bits.join("-") + ".csv", buildCsv(rows));

      toast(truncated
        ? `Exported the first ${fmtNum(rows.length)} of ${fmtNum(total)} — file is truncated.`
        : `Exported ${fmtNum(rows.length)} transaction${rows.length === 1 ? "" : "s"}.`,
        truncated ? "" : "success");
    } catch (err) {
      toast("Could not build the CSV: " + (err && err.message ? err.message : err));
    } finally {
      progress.close();
      exportAbort = null;
      if (btn) btn.disabled = false;
    }
  };

  /* ═══════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════ */
  async function renderDetail() {
    const run = Data.findRun(detailState.runId);
    if (!run) return;
    const s = runStats(run);

    /* All three panels below are built from PRE-AGGREGATED data, never from
       run.txns: the browser holds one page of up to 13,801 payments, so any
       reduce over transactions would silently describe the page rather than
       the run. `run.detail` is supplied by FDData.loadRun() (Q4 + Q6); mock
       mode has no detail and falls back to the transactions it does hold. */
    const d = run.detail || null;
    const n = v => (typeof v === "number" ? v : Number(v) || 0);

    /* by-type summary — Q6's (method x status) cells pivoted to one row per
       method. Q5's CCCount/DDCount give only the margins, not these cells. */
    let typeRows;
    if (d) {
      const acc = {};
      d.byType.forEach(c => {
        const k = c.PaymentType || "other";
        const e = acc[k] || (acc[k] = { count: 0, okCount: 0, pendCount: 0, badCount: 0, okValue: 0 });
        const cnt = n(c.Cnt), val = n(c.Val);
        e.count += cnt;
        if (c.StatusBucket === "Cleared" || c.StatusBucket === "Reconciled") { e.okCount += cnt; e.okValue += val; }
        else if (c.StatusBucket === "Declined") e.badCount += cnt;
        else if (c.StatusBucket === "Pending" || c.StatusBucket === "Processing" || c.StatusBucket === "Awaiting payment") e.pendCount += cnt;
      });
      typeRows = PAY_TYPES.filter(pt => acc[pt.id])
        .map(pt => Object.assign({ pt }, acc[pt.id]))
        .sort((a, b) => b.count - a.count);
    } else {
      typeRows = PAY_TYPES.map(pt => {
        const mine = run.txns.filter(t => t.type === pt.id);
        if (!mine.length) return null;
        const ok = mine.filter(isPaid);
        return {
          pt, count: mine.length,
          okCount: ok.length,
          pendCount: mine.filter(t => t.status === "Processing" || t.status === "Awaiting payment" || t.status === "Pending").length,
          badCount: mine.filter(t => t.status === "Declined").length,
          okValue: ok.reduce((x, t) => x + t.amount, 0),
        };
      }).filter(Boolean).sort((a, b) => b.count - a.count);
    }

    /* outcome rows — straight off the run's own roll-up, which is where every
       other surface gets these numbers, so they cannot disagree. */
    const statusRows = d
      ? [
          { status: "Pending",          count: s.pendCount, value: s.pendValue },
          { status: "Processing",       count: s.procCount, value: s.procValue },
          { status: "Awaiting payment", count: s.waitCount, value: s.waitValue },
          { status: "Cleared",          count: s.okCount,   value: s.okValue },
          { status: "Declined",         count: s.badCount,  value: s.badValue },
        ].filter(r => r.count)
      : STATUS_ORDER.map(status => {
          const mine = run.txns.filter(t => t.status === status);
          return mine.length ? { status, count: mine.length, value: mine.reduce((x, t) => x + t.amount, 0) } : null;
        }).filter(Boolean);

    /* decline reasons — Q4, already ordered by count. `unproc` is Q4's
       UnprocessedCount (the decline's invoice is still open with a balance),
       NOT the Payments.Processed column the old code counted. */
    const reasons = d
      ? d.reasons.map(r => [String(r.Reason || "(no reason given)"),
                            { count: n(r.DeclineCount), value: n(r.DeclineValue), unproc: n(r.UnprocessedCount) }])
      : (() => {
          const acc = {};
          run.txns.filter(t => t.status === "Declined").forEach(t => {
            acc[t.reason] = acc[t.reason] || { count: 0, value: 0, unproc: 0 };
            acc[t.reason].count++;
            acc[t.reason].value += t.amount;
            if (t.stillOwed) acc[t.reason].unproc++;
          });
          return Object.entries(acc).sort((a, b) => b[1].count - a[1].count);
        })();
    /* Feeds the reasons panel's Unproc. total. It also sized the header's
       "Retry declines (n)" button, removed from v1 on 16 Oct 2026 — retry is
       not ready (TODO.md §3); its retry-soft handler in fd-boot.js is parked. */
    const softUnproc = reasons.filter(([r]) => declineKind(r) === "Soft").reduce((x, [, r]) => x + r.unproc, 0);

    $("detail-content").innerHTML = `
      <div class="detail-hd">
        <div>
          <h2>${esc(run.name)}<span class="detail-hd-date">${fmtDateLong(run.date)}<span class="time">${esc(run.time)}</span></span></h2>
          <div class="detail-hd-meta">${runStatePill(run)}<span>Batch ${esc(run.id)}${run.typeLabel ? " · " + esc(run.typeLabel) : ""}${run.desc ? " · " + esc(run.desc) : ""}</span></div>
        </div>
        <span class="spacer"></span>
        <button type="button" class="detail-action" data-fd-action="print"><i class="fa-solid fa-print"></i> Print</button>
        <button type="button" class="detail-action" data-fd-action="export-csv"><i class="fa-solid fa-download"></i> Export CSV</button>
      </div>

      <div class="kpi-grid" style="margin-top:14px;">
        <div class="kpi-card"><div class="kpi-label">Payments in run</div><div class="kpi-value">${fmtNum(s.count)}</div><div class="kpi-sub">${typeRows.length} payment type${typeRows.length > 1 ? "s" : ""}</div></div>
        <div class="kpi-card"><div class="kpi-label">Collected</div><div class="kpi-value brand">${fmtMoney(s.okValue)}</div><div class="kpi-sub">${fmtNum(s.okCount)} payments cleared</div></div>
        <div class="kpi-card"><div class="kpi-label">Processing</div><div class="kpi-value ${s.procCount ? "" : "pos"}">${fmtNum(s.procCount)}</div><div class="kpi-sub">${fmtMoney(s.procValue)} awaiting DD result</div></div>
        <div class="kpi-card"><div class="kpi-label">Invoices outstanding</div><div class="kpi-value">${fmtNum(s.waitCount)}</div><div class="kpi-sub">${fmtMoney(s.waitValue)} awaiting payment</div></div>
        <div class="kpi-card"><div class="kpi-label">Declined</div><div class="kpi-value ${s.badCount ? "neg" : "pos"}">${fmtNum(s.badCount)}</div><div class="kpi-sub">${fmtMoney(s.badValue)} uncollected</div></div>
        <div class="kpi-card"><div class="kpi-label">Average payment</div><div class="kpi-value">${fmtMoney(s.okCount ? s.okValue / s.okCount : 0)}</div><div class="kpi-sub">collected payments only</div></div>
      </div>

      <div class="detail-panels">
        <div class="panel">
          <div class="panel-title">Payment type</div>
          <table class="mini-table">
            <thead><tr><th>Type</th><th class="num">Count</th><th class="num">OK</th><th class="num">Pend.</th><th class="num">Dec.</th><th class="num">Collected</th></tr></thead>
            <tbody>
              ${typeRows.map(r => `<tr>
                <td>${esc(r.pt.label)}</td>
                <td class="num">${fmtNum(r.count)}</td>
                <td class="num">${fmtNum(r.okCount)}</td>
                <td class="num">${fmtNum(r.pendCount)}</td>
                <td class="num">${fmtNum(r.badCount)}</td>
                <td class="num">${fmtMoney(r.okValue)}</td>
              </tr>`).join("")}
            </tbody>
            <tfoot><tr><td>Total</td><td class="num">${fmtNum(s.count)}</td><td class="num">${fmtNum(s.okCount)}</td><td class="num">${fmtNum(s.pendCount + s.procCount + s.waitCount)}</td><td class="num">${fmtNum(s.badCount)}</td><td class="num">${fmtMoney(s.okValue)}</td></tr></tfoot>
          </table>
        </div>

        <div class="panel">
          <div class="panel-title">Outcome</div>
          <table class="mini-table">
            <thead><tr><th>Outcome</th><th class="num">Count</th><th class="num">Value</th></tr></thead>
            <tbody>
              ${statusRows.map(r => `<tr>
                <td>${esc(r.status)}</td>
                <td class="num">${fmtNum(r.count)}</td>
                <td class="num">${fmtMoney(r.value)}</td>
              </tr>`).join("")}
            </tbody>
            <tfoot><tr><td>Total</td><td class="num">${fmtNum(s.count)}</td><td class="num">${fmtMoney(statusRows.reduce((x, r) => x + r.value, 0))}</td></tr></tfoot>
          </table>
        </div>

        <div class="panel">
          <div class="panel-title">Decline reasons</div>
          ${reasons.length ? `
          <table class="mini-table">
            <thead><tr><th>Reason</th><th>Type</th><th class="num">Count</th><th class="num">Unproc.</th></tr></thead>
            <tbody>
              ${reasons.map(([reason, r]) => {
                const kind = declineKind(reason);
                return `<tr>
                <td>${esc(reason)}</td>
                <td>${kind}</td>
                <td class="num">${fmtNum(r.count)}</td>
                <td class="num">${kind === "Soft" ? fmtNum(r.unproc) : "—"}</td>
              </tr>`;
              }).join("")}
            </tbody>
            <tfoot><tr><td>Total</td><td></td><td class="num">${fmtNum(s.badCount)}</td><td class="num">${fmtNum(softUnproc)}</td></tr></tfoot>
          </table>` : `<div style="font-size:12px;color:var(--text-muted);font-style:italic;padding:6px 0;">No declined payments in this run.</div>`}
        </div>
      </div>

      <div class="section-title" style="margin-top:24px;">Transactions <span class="count-badge" id="txn-count-badge">${fmtNum(s.count)}</span></div>
      <div class="runs-toolbar">
        <input type="text" class="runs-search" id="txn-search" placeholder="Search member, reference…" data-fd-action="detail-search">
        <span style="flex:1"></span>
        ${typeRows.length > 1 ? `<span class="chip-group" role="group" aria-label="Payment type">
          <button type="button" class="filter-chip active" data-fd-action="detail-type" data-fd-arg="all">All types</button>
          ${typeRows.map(r => `<button type="button" class="filter-chip" data-fd-action="detail-type" data-fd-arg="${esc(r.pt.id)}">${esc(r.pt.label)}</button>`).join("")}
        </span>` : ""}
        <span class="chip-group" role="group" aria-label="Status">
          <button type="button" class="filter-chip active" data-fd-action="detail-filter" data-fd-arg="all">All</button>
          <button type="button" class="filter-chip" data-fd-action="detail-filter" data-fd-arg="Pending">Pending</button>
          <button type="button" class="filter-chip" data-fd-action="detail-filter" data-fd-arg="Cleared">Cleared</button>
          <button type="button" class="filter-chip" data-fd-action="detail-filter" data-fd-arg="Processing">Processing</button>
          <button type="button" class="filter-chip" data-fd-action="detail-filter" data-fd-arg="Awaiting payment">Awaiting</button>
          <button type="button" class="filter-chip" data-fd-action="detail-filter" data-fd-arg="Declined">Declined</button>
        </span>
      </div>
      <div id="txn-table-slot"></div>`;

    await renderDetailTable();
  }

  /* The pager. Rendered inside #txn-table-slot with the table, so it is
     replaced on every page change and never shows a stale position.

     Page numbers are windowed: 13,801 rows is 139 pages, and 139 buttons is
     not a control. First/last are always reachable, the current page keeps
     two neighbours, and the gaps become ellipses. */
  function pageWindow(current, count) {
    const out = [];
    const want = new Set([1, count, current, current - 1, current + 1, current - 2, current + 2]);
    for (let p = 1; p <= count; p++) if (want.has(p)) out.push(p);
    const withGaps = [];
    out.forEach((p, i) => {
      if (i && p - out[i - 1] > 1) withGaps.push("…");
      withGaps.push(p);
    });
    return withGaps;
  }

  function pager(total, shown, filtered) {
    const size  = C.txnPageSize;
    const count = Math.max(1, Math.ceil(total / size));
    lastPageCount = count;
    if (total <= size) {
      return shown
        ? `<p class="more-note">${fmtNum(total)}${filtered ? " matching" : ""} transaction${total === 1 ? "" : "s"}.</p>`
        : "";
    }

    const cur   = Math.min(detailState.page, count);
    const from  = (cur - 1) * size + 1;
    const to    = Math.min(cur * size, total);
    const btn   = (label, page, opts) => {
      const o = opts || {};
      if (o.gap) return `<span class="pager-gap">…</span>`;
      return `<button type="button" class="pager-btn${o.active ? " active" : ""}"`
           + `${o.disabled ? " disabled" : ""} data-fd-action="detail-page" data-fd-arg="${page}"`
           + `${o.label ? ` aria-label="${esc(o.label)}"` : ""}>${label}</button>`;
    };

    return `
      <div class="pager">
        <span class="pager-count">${fmtNum(from)}–${fmtNum(to)} of ${fmtNum(total)}${filtered ? " matching" : ""}</span>
        <span class="pager-controls">
          ${btn(`<i class="fa-solid fa-angle-left"></i>`, cur - 1, { disabled: cur === 1, label: "Previous page" })}
          ${pageWindow(cur, count).map(p =>
              p === "…" ? btn("", 0, { gap: true }) : btn(fmtNum(p), p, { active: p === cur })
            ).join("")}
          ${btn(`<i class="fa-solid fa-angle-right"></i>`, cur + 1, { disabled: cur === count, label: "Next page" })}
        </span>
      </div>`;
  }

  /* Every table render is now an async fetch, so two can be in flight at once
     — a debounced search landing while a filter chip's request is still open.
     Responses are not guaranteed to arrive in the order they were sent, so a
     slow earlier one could paint over a newer result. Stamp each render and
     drop anything that is no longer the latest. */
  let renderSeq = 0;

  async function renderDetailTable() {
    if (!detailState.runId) return;
    const seq = ++renderSeq;
    const { rows, total, filtered } = await Data.loadTransactions(detailState.runId, {
      status: detailState.filter,
      search: detailState.search,
      type:   detailState.type,
      page: detailState.page,
      pageSize: C.txnPageSize,
    });
    if (seq !== renderSeq) return;      // superseded while we were waiting

    /* Self-correct a page past the end of the result.

       Q2 computes the total with COUNT(*) OVER (), so an out-of-range page
       returns NO ROWS AND THEREFORE NO TOTAL — `total` reads 0, the pager
       renders nothing, and the user is stranded on a blank table with no
       control to get back. That is indistinguishable here from a genuinely
       empty result, so the only safe move is to retry at page 1, which has
       rows whenever any exist and re-establishes the real total.

       Terminates: the retry sets page to 1, and page 1 cannot satisfy this
       condition. */
    if (!rows.length && detailState.page > 1) {
      detailState.page = 1;
      return renderDetailTable();
    }

    const badge = $("txn-count-badge");
    if (badge) badge.textContent = fmtNum(total);

    const slot = $("txn-table-slot");
    if (!slot) return;

    slot.innerHTML = `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr>
            <th>Reference</th><th>Member</th><th>Member ID</th><th>Payment type</th>
            <th class="num">Amount</th><th>Status</th><th>Result / note</th>
          </tr></thead>
          <tbody>
            ${rows.map(t => {
              const pt = typeById(t.type);
              return `<tr>
                <td class="cell-muted">${esc(t.ref)}</td>
                <td class="cell-strong">${esc(t.member)}</td>
                <td class="cell-muted">${esc(t.memberId)}</td>
                <td>${esc(pt.label)}</td>
                <td class="num cell-amount ${t.status === "Declined" ? "neg" : ""}">${fmtMoney(t.amount)}</td>
                <td>${txnBadge(t.status)}</td>
                <td class="cell-muted">${esc(t.reason) || esc(t.note) || "—"}</td>
              </tr>`;
            }).join("")}
            ${!rows.length ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);font-style:italic;">No transactions match the current filters.</td></tr>` : ""}
          </tbody>
        </table>
      </div>
      ${pager(total, rows.length, filtered)}`;
    Core.syncStuckTables();
  }

  FD.toast = FD.toast || toast;

  return { boot, showInline, renderDetail, renderDetailTable };
})();
