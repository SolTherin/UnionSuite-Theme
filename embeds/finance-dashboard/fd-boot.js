/**
 * fd-boot.js — Finance Dashboard bootstrap (loaded LAST)
 * © Union Innovation Hub.
 *
 * Licence gate, host-page defences, then boot whichever surface this document
 * is (window.FD_SURFACE, set by the shell).
 */
(function () {
  "use strict";

  const C    = window.FDConfig;
  const Core = window.FDCore;
  const Data = window.FDData;
  const FD   = window.FD = window.FD || {};

  const root = document.getElementById("fd-root");

  /* There is no host allow-list (removed 4 Sep 2026): the app runs on any iMIS
     instance with CloudToolz access. Who may SEE it is controlled by the RiSE
     page's role gating — these surfaces expose every member's payment detail,
     so that gating is not optional. See docs/DATA-REQUIREMENTS.md §9. */

  /* ── Static-markup event binding ──────────────────────────────────────────
     iMIS STRIPS EVERY on* ATTRIBUTE when a page is saved. Measured 4 Sep 2026
     against a published dashboard: all 11 inline handlers in the shell were
     gone from the served HTML. The filter is case-insensitive, survives
     whitespace variants (`onclick ="1"`) and decodes HTML entities before
     matching, so there is no escaping trick — the attribute cannot be used.
     `data-*` attributes pass through untouched, which is the supported way back.

     So the SHELL markup carries `data-fd-action` / `data-fd-arg` and the
     handlers are bound here instead. Markup generated at RUNTIME by the render
     functions is unaffected — it never passes through iMIS's save pipeline —
     which is why those still use inline onclick.

     ⚠ Do not add an on* attribute to any of the HTML shells. It will work on a
       dev server and vanish in iMIS. */
  function bindStaticHandlers() {
    if (!root) return;
    const act = e => e.target.closest("[data-fd-action]");

    root.addEventListener("click", function (e) {
      /* Run cards carry data-run rather than data-fd-action, because the
         keydown handler above already keys off it. */
      const card = e.target.closest("[data-run]");
      if (card && !e.target.closest("[data-fd-action]")) {
        if (FD.openRun) FD.openRun(card.dataset.run);
        return;
      }

      const el = act(e); if (!el) return;
      const arg = el.dataset.fdArg;
      const n   = el.dataset.fdCount;
      const plural = c => (Number(c) > 1 ? "s" : "");

      switch (el.dataset.fdAction) {
        /* dashboard shell */
        case "trend-metric":  FD.setTrendMetric && FD.setTrendMetric(arg, el); break;
        case "type-metric":   FD.setTypeMetric  && FD.setTypeMetric(arg, el);  break;
        case "run-filter":    FD.setRunFilter   && FD.setRunFilter(arg, el);   break;
        case "review-filter": FD.setReviewFilter&& FD.setReviewFilter(el);     break;

        /* dashboard, generated */
        case "kpi":
          if (arg === "long-processing" && FD.showLongProcessing) FD.showLongProcessing();
          break;
        case "clear-long-processing": FD.clearLongProcessing && FD.clearLongProcessing(); break;
        case "retry-run":                            // v2 — nothing renders this in v1
          e.stopPropagation();                       // don't also open the run
          FD.toast && FD.toast(`Retry batch created for ${n} payment${plural(n)} (mock)`, "success");
          break;

        /* run detail */
        case "back-dashboard": FD.backToDashboard && FD.backToDashboard(e); break;
        case "print":          window.print();                             break;
        case "export-csv":     FD.exportCsv    && FD.exportCsv();               break;
        case "detail-page":    FD.setDetailPage && FD.setDetailPage(arg);       break;
        case "retry-soft":                           // v2 — nothing renders this in v1
          FD.toast && FD.toast(`Retry batch created for ${n} unprocessed soft decline${plural(n)} (mock)`, "success");
          break;
        case "detail-filter":  FD.setDetailFilter && FD.setDetailFilter(arg, el); break;
        case "detail-type":    FD.setDetailType   && FD.setDetailType(arg, el);   break;
        case "export-cancel":  FD.cancelExport    && FD.cancelExport();           break;

        /* arrears (v2) */
        case "decline-reason": FD.setDeclineReason && FD.setDeclineReason(arg, el); break;
        case "open-run":       e.preventDefault(); FD.openRun && FD.openRun(arg);   break;
        case "retry-txn":      FD.toast && FD.toast(`Retry queued for ${arg} (mock)`); break;
        case "retry-all-declines":
          FD.toast && FD.toast(`Retry batch created for ${n} declined payments (mock)`);
          break;
      }
    });

    root.addEventListener("change", function (e) {
      const el = act(e); if (!el) return;
      switch (el.dataset.fdAction) {
        case "range":         FD.setRange         && FD.setRange(el.value);         break;
        case "arrears-range": FD.setArrearsRange  && FD.setArrearsRange(el.value);  break;
        case "custom-from":   FD.setCustomRange   && FD.setCustomRange("from", el.value); break;
        case "custom-to":     FD.setCustomRange   && FD.setCustomRange("to",   el.value); break;
      }
    });

    root.addEventListener("input", function (e) {
      const el = act(e); if (!el) return;
      switch (el.dataset.fdAction) {
        case "runs-search":     FD.renderRuns      && FD.renderRuns();               break;
        case "detail-search":   FD.setDetailSearch && FD.setDetailSearch(el.value);  break;
        case "declines-search":
          if (FD.declineState) FD.declineState.search = el.value;
          FD.renderDeclinesTable && FD.renderDeclinesTable();
          break;
      }
    });
  }

  /* ── Host-page defences (only matter inside iMIS) ─────────────────────────
     1. The app is inlined into iMIS's single ASP.NET <form>, so Enter in ANY
        input triggers a full-page postback and the user loses their place. A
        delegated keydown swallows it. This will NOT reproduce on a dev server —
        do not remove it because "it does nothing".
     2. 100vh is wrong once embedded: the app is only part of the RiSE page, so
        it gets an explicit pane height instead. */
  function harden() {
    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter") return;
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "SELECT")) {
        e.preventDefault();
        e.stopPropagation();
      }
    });

    if (Core.isInIMIS()) {
      root.style.setProperty("--fd-height", C.embedHeight || "780px");
    } else {
      /* Standalone / dev only. Set here rather than in fd-styles.css because a
         `body { margin: 0 }` rule in the stylesheet would restyle the iMIS page. */
      document.body.style.margin = "0";
      document.body.style.background = "#f4f6fa";
    }

    /* Keyboard parity for the run rows, which are clickable grid containers
       rather than links (in v2 they contain their own Retry button, so a real
       <a> would be invalid markup). */
    root.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      const card = e.target.closest && e.target.closest(".run-card-5c");
      if (!card || !card.dataset.run) return;
      e.preventDefault();
      FD.openRun(card.dataset.run);
    });
  }

  /* Anything that MEASURES laid-out elements has to wait for the stylesheet the
     shell injected at runtime — it doesn't block these scripts, so without this
     the first render can measure unstyled boxes. `__fdCssReady` resolves on the
     link's load/error and is timeout-capped, so a blocked CDN degrades to an
     unstyled render rather than a blank page. Falls back to resolved if the
     scripts were loaded some other way (static tags, a test harness). */
  async function stylesReady() {
    if (window.__fdCssReady) await window.__fdCssReady;
  }

  /* A webfont landing after first paint changes row heights too, so re-run the
     one measurement-dependent render. Cheap: it re-ranks six existing rows. */
  function relayoutWhenFontsSettle() {
    if (!document.fonts || !document.fonts.ready) return;
    document.fonts.ready.then(function () {
      if (FD.renderTypeBars) FD.renderTypeBars();
      Core.syncStuckTables();
    });
  }

  async function boot() {
    harden();
    bindStaticHandlers();
    Core.bindScrollSync();
    await stylesReady();

    const SURFACES = ["run", "arrears", "dashboard"];
    const surface = SURFACES.includes(window.FD_SURFACE) ? window.FD_SURFACE : "dashboard";
    Core.Nav.surface = surface;

    try {
      if (surface === "run") {
        await window.FDRun.boot();
        relayoutWhenFontsSettle();
        return;
      }

      if (surface === "arrears") {
        await window.FDArrears.boot();
        relayoutWhenFontsSettle();
        return;
      }

      Core.skeletonDashboard();
      await Data.load();
      FD.renderDashboard();
      Core.clearSkeleton();

      /* A ?BatchID= on the LIST page means either the in-page fallback is in play
         or someone bookmarked a deep link against this surface. Either way,
         honour it rather than showing the list they didn't ask for. */
      const deepRun = Core.Nav.runIdFromUrl();
      if (deepRun && window.FDRun) await window.FDRun.showInline(deepRun);

      relayoutWhenFontsSettle();

    } catch (err) {
      console.error("Finance Dashboard: boot failed", err);
      Core.clearSkeleton();
      const slot = document.getElementById("detail-content")
                || document.getElementById("arrears-content")
                || document.getElementById("runs-list");
      if (slot) {
        Core.notice(slot, "Could not load payment runs",
          err && err.message ? err.message : "An unexpected error occurred.");
      }
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
