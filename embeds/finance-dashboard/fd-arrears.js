/**
 * fd-arrears.js — Finance Dashboard, SURFACE 3: declines / arrears.
 *
 * V2. Not deployed in v1 — see README "Scope". Split out of fd-dashboard.js
 * on 3 Sep 2026 so each surface is a self-contained page: the v1 dashboard
 * bundle no longer carries this code at all.
 *
 * Self-contained means self-contained: this page owns its own range state and
 * loads its own data. Nothing is shared with the dashboard, and navigating
 * here re-fetches — a deliberate choice (no sessionStorage cache).
 *
 * Inline handlers are namespaced `FD.…` because this file is an IIFE.
 *
 * ⚠ LIVE-DATA REWRITE STILL REQUIRED. Every function below reduces over
 *   `run.txns` — i.e. it expects every declined transaction in the window to
 *   be sitting in the browser. That does not survive real volumes (one test
 *   batch alone held 12,628 declines). v2-declines.sql already pushes the
 *   reason roll-up, search, filter and paging into SQL (Q4/Q5/Q6); this file
 *   must be repointed at those before it can run on live data.
 */
(function () {
  "use strict";

  const C    = window.FDConfig;
  const Core = window.FDCore;
  const Data = window.FDData;
  const FD   = window.FD = window.FD || {};

  const { $, fmtMoney, fmtNum, fmtDateShort, esc, typeById, toast } = Core;

  /* This surface's own state — it does not read the dashboard's. */
  const state = { rangeDays: 30, search: "", reason: "all" };
  FD.arrearsState = state;
  FD.declineState = state;          // legacy alias: the generated markup uses it

  const runsInRange = () => Data.runsInRange(state.rangeDays);

  FD.setArrearsRange = function (days) {
    state.rangeDays = Number(days) || 30;
    state.search = "";
    state.reason = "all";
    render();
  };

  FD.setDeclineReason = function (r, btn) {
    state.reason = r;
    btn.parentElement.querySelectorAll(".filter-chip").forEach(c => c.classList.toggle("active", c === btn));
    renderTable();
  };

  function declinesInRange() {
    const rows = [];
    runsInRange().forEach(run => {
      run.txns.filter(t => t.status === "Declined").forEach(t => rows.push({ t, run }));
    });
    return rows;
  }

  function render() {
    const rows = declinesInRange();
    const totalValue = rows.reduce((s, r) => s + r.t.amount, 0);
    const affectedRuns = new Set(rows.map(r => r.run.id)).size;

    const reasonCounts = {};
    rows.forEach(r => {
      reasonCounts[r.t.reason] = reasonCounts[r.t.reason] || { count: 0, value: 0 };
      reasonCounts[r.t.reason].count++;
      reasonCounts[r.t.reason].value += r.t.amount;
    });
    const reasons = Object.entries(reasonCounts).sort((a, b) => b[1].count - a[1].count);
    const maxReason = Math.max(...reasons.map(([, r]) => r.count), 1);

    $("arrears-content").innerHTML = `
      <div class="detail-hd">
        <div>
          <h2>Declined payments</h2>
          <div class="detail-hd-meta">Last <span>${state.rangeDays}</span> days · across ${fmtNum(affectedRuns)} payment run${affectedRuns === 1 ? "" : "s"}</div>
        </div>
        <span class="spacer"></span>
        ${rows.length ? `<button type="button" class="detail-action primary" data-fd-action="retry-all-declines" data-fd-count="${rows.length}"><i class="fa-solid fa-rotate-right"></i> Retry all declined (${fmtNum(rows.length)})</button>` : ""}
      </div>

      <div class="kpi-grid" style="margin-top:14px;">
        <div class="kpi-card"><div class="kpi-label">Declined payments</div><div class="kpi-value neg">${fmtNum(rows.length)}</div><div class="kpi-sub">in the current period</div></div>
        <div class="kpi-card"><div class="kpi-label">Value uncollected</div><div class="kpi-value neg">${fmtMoney(totalValue)}</div><div class="kpi-sub">potentially recoverable on retry</div></div>
        <div class="kpi-card"><div class="kpi-label">Distinct reasons</div><div class="kpi-value">${fmtNum(reasons.length)}</div><div class="kpi-sub">decline categories</div></div>
        <div class="kpi-card"><div class="kpi-label">Runs affected</div><div class="kpi-value">${fmtNum(affectedRuns)}</div><div class="kpi-sub">payment runs with declines</div></div>
      </div>

      ${reasons.length ? `
      <div class="panel" style="margin-top:18px;">
        <div class="panel-title">Declines by reason</div>
        <div id="decline-reason-bars">${reasons.map(([reason, r]) => `
          <div class="hbar-row">
            <div class="hbar-label" title="${esc(reason)}">${esc(reason)}</div>
            <div class="hbar-track"><div class="hbar-fill" style="width:${(r.count / maxReason * 100).toFixed(1)}%;background:var(--danger)"></div></div>
            <div class="hbar-val"><span class="m">${fmtNum(r.count)}</span> · <span class="m">${fmtMoney(r.value)}</span></div>
          </div>`).join("")}</div>
      </div>` : ""}

      <div class="section-title" style="margin-top:24px;">Declined transactions <span class="count-badge" id="declines-count-badge">${fmtNum(rows.length)}</span></div>
      <div class="runs-toolbar">
        <input type="text" class="runs-search" id="declines-search" placeholder="Search member, reference, run…" data-fd-action="declines-search">
        <span style="flex:1"></span>
        <button type="button" class="filter-chip active" data-fd-action="decline-reason" data-fd-arg="all">All reasons</button>
        ${reasons.map(([reason]) => `<button type="button" class="filter-chip" data-fd-action="decline-reason" data-fd-arg="${esc(reason)}">${esc(reason)}</button>`).join("")}
      </div>
      <div id="declines-table-slot"></div>`;

    renderTable();
  }
  FD.renderArrears = render;

  function renderTable() {
    let rows = declinesInRange();
    const q = (state.search || "").toLowerCase();
    if (state.reason !== "all") rows = rows.filter(r => r.t.reason === state.reason);
    if (q) rows = rows.filter(r => (r.t.member + " " + r.t.ref + " " + r.t.memberId + " " + r.run.name + " " + r.run.id).toLowerCase().includes(q));
    rows.sort((a, b) => b.run.date - a.run.date);

    $("declines-count-badge").textContent = fmtNum(rows.length);

    const CAP = C.txnPageSize;
    const shown = rows.slice(0, CAP);
    $("declines-table-slot").innerHTML = `
      <div class="table-wrap">
        <table class="report-table">
          <thead><tr>
            <th>Reference</th><th>Member</th><th>Payment run</th><th>Payment type</th>
            <th class="num">Amount</th><th>Decline reason</th><th></th>
          </tr></thead>
          <tbody>
            ${shown.map(({ t, run }) => {
              const pt = typeById(t.type);
              return `<tr>
                <td class="cell-muted">${esc(t.ref)}</td>
                <td class="cell-strong">${esc(t.member)}<div class="run-sub">ID ${esc(t.memberId)}</div></td>
                <td><a href="#" data-fd-action="open-run" data-fd-arg="${esc(run.id)}" style="color:var(--brand-light);text-decoration:none;font-weight:600;">${esc(run.name)}</a><div class="run-sub">${fmtDateShort(run.date)} · Batch ${esc(run.id)}</div></td>
                <td><span class="type-chip" style="background:${pt.pale};color:${pt.color}">${esc(pt.label)}</span></td>
                <td class="num cell-amount neg">${fmtMoney(t.amount)}</td>
                <td class="cell-strong" style="color:var(--danger)">${esc(t.reason)}</td>
                <td><button type="button" class="filter-chip" data-fd-action="retry-txn" data-fd-arg="${esc(t.ref)}">Retry</button></td>
              </tr>`;
            }).join("")}
            ${!shown.length ? `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);font-style:italic;padding:18px;">No declined payments match the current filters.</td></tr>` : ""}
          </tbody>
        </table>
      </div>
      ${rows.length > CAP ? `<p class="more-note">Showing first ${CAP} of ${fmtNum(rows.length)} declined payments.</p>` : ""}`;
    Core.syncStuckTables();
  }
  FD.renderDeclinesTable = renderTable;

  /* Opening a run from here navigates to the run surface, exactly as the
     dashboard does. Falls back to history if the run page is unconfigured —
     there is no in-page detail container on this shell to swap into. */
  FD.openRun = function (runId) {
    if (!Core.Nav.gotoRun(runId)) {
      console.warn("[FinanceDashboard] FDConfig.imisPages.run is not set — cannot open", runId);
    }
  };

  FD.toast = toast;

  /* Boot entry point, called by fd-boot.js for FD_SURFACE === "arrears". */
  window.FDArrears = {
    async boot() {
      await Data.load();
      render();
    },
  };
})();
