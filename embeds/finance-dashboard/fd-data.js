/**
 * fd-data.js — Finance Dashboard data layer
 * © Union Innovation Hub.
 *
 * TODAY: deterministic mock data, generated identically on both surfaces.
 * That identical generation is load-bearing for navigation: the run list links
 * to `?BatchID=2064`, the run screen is a SEPARATE page load, and it has to
 * resolve that id to the same run. Same seed, same code, same result — so the
 * two surfaces agree without passing anything but the id.
 *
 * TOMORROW: this is the only file that changes to go live. Every view calls
 * `FDData.load()` / `FDData.loadRun()` / `FDData.loadTransactions()` and nothing
 * else, so swapping the mock generator for the CloudToolz fetches documented in
 * docs/DATA-REQUIREMENTS.md touches no view code. The async signatures below are
 * already the live shapes — mock mode just resolves immediately.
 *
 * Exposes a single global: `window.FDData`.
 */
window.FDData = (function () {
  "use strict";

  const C = window.FDConfig;
  const Core = window.FDCore;
  const { PAY_TYPES, DECLINE_REASONS } = Core;

  /* ═══════════════════════════════════════════════════════════
     MOCK DATA — deterministic pseudo-random so the prototype looks the same on
     every load, and identical across the two surfaces. "Today" is pinned.
     ═══════════════════════════════════════════════════════════ */
  const TODAY = new Date(2026, 6, 6); // 6 Jul 2026

  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  const rnd = mulberry32(20260706);
  const pick = arr => arr[Math.floor(rnd() * arr.length)];
  const between = (min, max) => min + rnd() * (max - min);
  const intBetween = (min, max) => Math.floor(between(min, max + 1));

  const RUN_TEMPLATES = [
    { id: "invoices", name: "Membership Dues — Invoices",  typeLabel: "Invoices", desc: "",               kind: "invoices", mix: { invoice: 1 },        areaMix: { dues: .90, ins: .06, addon: .04 },              size: [400, 900], avg: [60, 220] },
    { id: "daily",    name: "Membership Dues — Daily Run", typeLabel: "CC / DD",  desc: "iMIS Autopay",   kind: "dues",     mix: { dd: .62, cc: .38 },  areaMix: { dues: .93, ins: .04, addon: .03 },              size: [180, 420], avg: [18, 42]  },
    { id: "other",    name: "Membership Dues — Other",     typeLabel: "CC / DD",  desc: "adhoc payments", kind: "dues",     mix: { cc: .75, dd: .25 },  areaMix: { dues: .55, ins: .10, addon: .20, event: .15 }, size: [8, 60],    avg: [30, 160] },
    { id: "payroll",  name: "Payroll Deduction",           typeLabel: "PRD",      desc: "reconciliation", kind: "payroll",  mix: { pd: 1 },             areaMix: { dues: .95, ins: .05 },                          size: [60, 200],  avg: [15, 30]  },
    { id: "bpay",     name: "BPAY",                        typeLabel: "BPAY",     desc: "reconciliation", kind: "bpay",     mix: { bpay: 1 },           areaMix: { dues: .85, ins: .10, addon: .05 },              size: [40, 140],  avg: [40, 260] },
  ];

  const FIRST = ["Sarah","Michael","Emma","David","Jessica","Chris","Amanda","Daniel","Rachel","Mark","Lisa","Tom","Nicole","James","Karen","Peter","Megan","Andrew","Fiona","Luke","Hannah","Sean","Priya","Marco","Yuki","Aisha","Liam","Grace","Noah","Chloe"];
  const LAST  = ["Nguyen","Smith","Patel","Williams","Chen","Brown","Kelly","Taylor","Singh","Wilson","Martin","Lee","Anderson","Thompson","White","Walsh","Harris","King","Costa","Ryan","OBrien","Murphy","Zhang","Ali","Rossi","Kaur","Doyle","Webb","Hunt","Bell"];

  function weightedType(mix) {
    const r = rnd();
    let acc = 0;
    for (const [id, w] of Object.entries(mix)) { acc += w; if (r <= acc) return id; }
    return Object.keys(mix)[0];
  }

  function buildMockRuns() {
    let runSeq = 2040;
    const RUNS = [];
    for (let daysAgo = C.historyDays; daysAgo >= 0; daysAgo--) {
      const d = new Date(TODAY); d.setDate(d.getDate() - daysAgo);
      const dow = d.getDay();
      if (dow === 0 || dow === 6) continue;               // no weekend runs

      /* Scheduled runs for the day:
         - Daily Run fires every weekday, with a big volume spike on Thursdays
         - Other is a single ad hoc batch on most days (never more than one)
         - BPAY reconciliation file lands every weekday
         - Payroll Deduction lands weekly (Friday)
         - Invoices run lands once, on the first weekday of the month */
      const isFirstWeekdayOfMonth = (() => {
        const test = new Date(d.getFullYear(), d.getMonth(), 1);
        while (test.getDay() === 0 || test.getDay() === 6) test.setDate(test.getDate() + 1);
        return test.getDate() === d.getDate();
      })();
      const todaysTemplates = [{ tpl: RUN_TEMPLATES[1], sizeMult: dow === 4 ? 2.5 : 1 }];
      if (rnd() < 0.7) todaysTemplates.push({ tpl: RUN_TEMPLATES[2], sizeMult: 1 });
      todaysTemplates.push({ tpl: RUN_TEMPLATES[4], sizeMult: 1 });
      if (dow === 5) todaysTemplates.push({ tpl: RUN_TEMPLATES[3], sizeMult: 1 });
      if (isFirstWeekdayOfMonth) todaysTemplates.push({ tpl: RUN_TEMPLATES[0], sizeMult: 1 });

      for (const { tpl, sizeMult } of todaysTemplates) {

        const size = Math.max(1, Math.round(intBetween(tpl.size[0], tpl.size[1]) * sizeMult));
        const declineRate = between(0.015, 0.09);
        const txns = [];
        for (let t = 0; t < size; t++) {
          const method = weightedType(tpl.mix);
          const txn = {
            ref: "PMT-" + String(intBetween(100000, 999999)),
            member: pick(FIRST) + " " + pick(LAST),
            memberId: String(intBetween(10000, 89999)),
            type: method === "invoice" ? "inv" : method,
            method,
            area: weightedType(tpl.areaMix),
            amount: Math.round(between(tpl.avg[0], tpl.avg[1]) * 100) / 100,
            /* stillOwed — the decline's invoice is still open with a balance,
               i.e. it needs a human. Live mode supplies this as StillOwed
               (v1-payments.sql Q2). It replaced `processed`, which was a real
               Payments column but has nothing to do with declines. */
            status: "Cleared", reason: "", note: "", dueDays: 0, stillOwed: false,
          };
          if (method === "cc") {
            const declined = rnd() < declineRate;
            txn.status = declined ? "Declined" : "Cleared";
            txn.reason = declined ? pick(DECLINE_REASONS) : "";
            txn.stillOwed = declined ? rnd() < 0.55 : false;   // was processed < 0.45 (inverted)
            txn.note = "instant result";
          } else if (method === "dd") {
            /* most DD clear in 1–3 business days; some take up to a week, and a
               small share are held far longer (disputes / bank holds) */
            const roll = rnd();
            const settleDays = roll < .03 ? intBetween(12, 45) : roll < .15 ? intBetween(4, 7) : intBetween(1, 3);
            if (daysAgo >= settleDays) {
              const declined = rnd() < declineRate;
              txn.status = declined ? "Declined" : "Cleared";
              txn.reason = declined ? pick(DECLINE_REASONS) : "";
              txn.stillOwed = declined ? rnd() < 0.55 : false;  // was processed < 0.45 (inverted)
              txn.note = `settled after ${settleDays}d`;
            } else {
              txn.status = "Processing";
              txn.dueDays = settleDays - daysAgo;
              txn.note = `day ${daysAgo + 1} of ~${settleDays}`;
            }
          } else if (method === "invoice") {
            /* invoice generated by the run; member pays later via BPAY / EFT / CC */
            const payAfter = intBetween(1, 45);
            if (daysAgo >= payAfter) {
              txn.status = "Cleared";
              txn.type = pick(["bpay", "bpay", "eft", "cc"]);
              txn.note = `invoice paid after ${payAfter}d`;
            } else {
              txn.status = "Awaiting payment";
              txn.note = `invoice outstanding ${daysAgo}d`;
            }
          } else if (method === "pd") {
            /* payroll reconciliation file: payments, pending or processing — never declined */
            if (daysAgo <= 2) { txn.status = "Processing"; txn.note = `matching, day ${daysAgo + 1}`; }
            else { txn.status = "Reconciled"; txn.note = `received ${intBetween(1, 12)}d after payroll`; }
          } else if (method === "bpay") {
            /* BPAY reconciliation file: payments, pending or processing — never declined */
            if (daysAgo <= 2) { txn.status = "Processing"; txn.note = `matching, day ${daysAgo + 1}`; }
            else { txn.status = "Reconciled"; txn.note = `matched ${daysAgo}d after receipt`; }
          }
          txns.push(txn);
        }

        /* A run created today has been generated but not yet submitted to the
           bank — every payment sits Pending until the overnight submission. */
        if (daysAgo === 0) {
          txns.forEach(t => { t.status = "Pending"; t.reason = ""; t.stillOwed = false; t.note = "awaiting submission to bank"; });
        }

        RUNS.push({
          id: String(runSeq++),   // bare batch id, matching live
          name: tpl.name,
          kind: tpl.kind,
          typeLabel: tpl.typeLabel,
          desc: tpl.desc,
          date: new Date(d),
          time: pick(["06:00", "06:30", "09:15", "11:00", "14:30", "16:45"]),
          txns, daysAgo,
        });
      }
    }
    RUNS.sort((a, b) => b.date - a.date);

    /* A small, fixed set of runs flagged for manual review — this tracker
       should rarely have anything in it. Both sit inside the 30-day window but
       outside the 7-day window, so the 7-day view is clean. */
    const reviewCandidates = RUNS.filter(r => r.daysAgo >= 8 && r.daysAgo < 30 && r.name === "Membership Dues — Daily Run");
    [reviewCandidates[0], reviewCandidates[reviewCandidates.length - 1]]
      .filter(Boolean)
      .forEach(r => { r.needsReview = true; });

    return RUNS;
  }

  /* ═══════════════════════════════════════════════════════════
     PUBLIC API
     The signatures are the LIVE ones — async, id-addressed, paged — so the
     views are already written against the shape real data will arrive in.
     ═══════════════════════════════════════════════════════════ */

  let RUNS = null;

  function isLive() {
    if (C.mode === "live") return true;
    if (C.mode === "mock") return false;
    return Core.isInIMIS();
  }

  /* ═══════════════════════════════════════════════════════════
     LIVE — CloudToolz 3-step relay
     Transport lifted from HubReportBuilder's api.js → cloudToolzFetch; see
     ../ReportBuilder/docs/CLOUDTOOLZ-INTEGRATION.md §0. Only usable inside a
     logged-in iMIS page: it needs the session cookie, #__RequestVerificationToken
     and #__ClientContext, none of which exist standalone.
     ═══════════════════════════════════════════════════════════ */

  const CT = { baseUrl: null };   // resolved once per page, then cached

  const imisToken = () => document.getElementById("__RequestVerificationToken")?.value || "";

  function clientContext() {
    const parse = raw => (!raw ? null : typeof raw === "string" ? JSON.parse(raw) : raw);
    let ctx = null;
    try {
      const el = document.getElementById("__ClientContext");
      if (el) ctx = parse(el.value || el.getAttribute("value") || el.textContent);
    } catch { /* fall through */ }
    if (!ctx) { try { ctx = parse(window.__ClientContext || window.__clientContext); } catch { /* ignore */ } }
    return {
      loggedInPartyId: ctx ? String(ctx.loggedInPartyId ?? ctx.LoggedInPartyId ?? "") : "",
      selectedPartyId: ctx ? String(ctx.selectedPartyId ?? ctx.SelectedPartyId ?? "") : "",
    };
  }

  /* Step 1 — resolve the CloudToolz base URL from an IQA. Cached for the page. */
  async function ctBaseUrl() {
    if (CT.baseUrl) return CT.baseUrl;
    const qs = new URLSearchParams({ queryname: "$/ZENTSO/Security/CloudToolzUrl" });
    const res = await fetch("/api/iqa?" + qs, {
      headers: { Accept: "application/json", RequestVerificationToken: imisToken() },
      credentials: "include",
    });
    if (!res.ok) throw new Error("Could not resolve the CloudToolz URL (HTTP " + res.status + ")");
    const json = await res.json();
    let raw = json?.Items?.["$values"]?.[0]?.Properties?.["$values"]?.[0]?.Value;
    if (raw !== null && typeof raw === "object" && "$value" in raw) raw = raw["$value"];
    if (!raw || typeof raw !== "string" || !raw.trim()) throw new Error("CloudToolz URL not found");
    CT.baseUrl = raw.trim().replace(/\/+$/, "");
    return CT.baseUrl;
  }

  /* Step 2 — mint a relay token. NOT single-use and valid ≥5 min (measured
     2026-07-25), so one mint per page load is enough; the response is discarded
     because the CT call never carries the token value. */
  async function mintZenToken(partyIds) {
    const prop = (Name, Value) => ({
      "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts", Name, Value,
    });
    const body = {
      "$type": "Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts",
      "EntityTypeName": "ZenTokens",
      "Properties": {
        "$type": "Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts",
        "$values": [
          prop("PartyId", partyIds.loggedInPartyId),
          prop("ID", partyIds.loggedInPartyId),
          prop("SelectedPartyId", partyIds.selectedPartyId),
          prop("RequestVerificationToken", imisToken()),
          prop("UtcUnixTimeStamp", Date.now()),
        ],
      },
    };
    const res = await fetch("/api/ZenTokens", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json", RequestVerificationToken: imisToken() },
      credentials: "include",
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error("Could not authorise the data request (HTTP " + res.status + ")");
  }

  /* Step 3 — POST the endpoint and return the PARSED BODY, whatever its shape.
     Q1's endpoint sends a bare row array; the batch endpoint sends a composed
     object of five named sets. ctFetch() below narrows to an array for the
     former; callers wanting the object use this directly. */
  async function ctFetchRaw(endpoint, payload) {
    if (!endpoint) throw new Error("No CloudToolz endpoint configured for this surface — see FDConfig.endpoints.");
    const base = await ctBaseUrl();
    const ids  = clientContext();
    if (!imisToken() || !ids.loggedInPartyId) {
      throw new Error("Not signed in to iMIS, or this page is missing its client context.");
    }
    await mintZenToken(ids);

    const res = await fetch(base + "/" + String(endpoint).replace(/^\/+/, ""), {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        RequestVerificationToken: imisToken(),
        SelectedPartyId: ids.selectedPartyId,
        LoggedInPartyId: ids.loggedInPartyId,
        WebsiteKey: (typeof gWebsiteKey !== "undefined" ? gWebsiteKey : ""),
        HubReportMode: "report",
      },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) throw new Error("The payment data service returned HTTP " + res.status + ".");

    /* The endpoint sends text/plain, so parse the body ourselves rather than
       trusting res.json() to be handed the right content type. */
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); }
    catch { throw new Error("The payment data service returned a malformed response."); }

    return data;
  }

  /* Row-array narrowing, for endpoints that return one set (Q1's dashboard). */
  async function ctFetch(endpoint, payload) {
    const data = await ctFetchRaw(endpoint, payload);
    if (Array.isArray(data)) return data;
    for (const k of ["Data", "data", "Items", "items", "rows", "Rows", "Result", "result"]) {
      if (Array.isArray(data?.[k])) return data[k];
    }
    return [];
  }

  /* ── Q1 row → run object ──────────────────────────────────────────────────
     Builds `stats` in exactly the shape fd-core.js → runStats() returns, so
     runStats short-circuits on it (line ~88) and the trend, runs list, state
     pill and review chip need no changes at all.

     `waitCount`/`waitValue` are hard 0: "Awaiting payment" is the invoice
     world (Batch.Kind 1), which is v2. The KPI card reading them shows 0 by
     design.

     No `txns` — deliberately. Live mode never loads payment-grain data on this
     surface; anything still reducing over run.txns must be repointed at stats. */
  const num = v => (typeof v === "number" ? v : Number(v) || 0);

  function rowToRun(row) {
    const runDate = new Date(row.RunDate);
    const midnight = d => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const daysAgo = Math.round((midnight(new Date()) - midnight(runDate)) / 86400000);

    return {
      id:        String(row.BatchId),   // the URL key: ?BatchID=3837
      batchId:   row.BatchId,
      name:      row.BatchName || "Membership Dues",
      desc:      row.BatchDescription || "",
      typeLabel: num(row.DDCount) && num(row.CCCount) ? "CC / DD"
               : num(row.CCCount) ? "CC"
               : num(row.DDCount) ? "DD" : "",
      date: runDate,
      time: (row.RunTime || "").slice(0, 5),
      daysAgo,
      maxProcessingDays: row.MaxProcessingDays === null || row.MaxProcessingDays === undefined
        ? null : num(row.MaxProcessingDays),
      /* Per-method totals for the payments-by-type chart. */
      byType: {
        dd:  { count: num(row.DDCount),          value: num(row.DDValue) },
        cc:  { count: num(row.CCCount),          value: num(row.CCValue) },
        oth: { count: num(row.OtherMethodCount), value: num(row.OtherMethodValue) },
      },
      /* Statuses with no home in runStats, kept so nothing is silently lost. */
      errorCount: num(row.ErrorCount), errorValue: num(row.ErrorValue),
      otherCount: num(row.OtherCount), otherValue: num(row.OtherValue),

      stats: {
        count:      num(row.TotalCount),
        okCount:    num(row.ClearedCount),    okValue:   num(row.ClearedValue),
        procCount:  num(row.ProcessingCount), procValue: num(row.ProcessingValue),
        pendCount:  num(row.PendingCount),    pendValue: num(row.PendingValue),
        waitCount:  0,                        waitValue: 0,      // invoice world = v2
        badCount:   num(row.DeclinedCount),   badValue:  num(row.DeclinedValue),
        badUnprocessed: num(row.DeclinedUnprocessedCount),
        totalValue: num(row.TotalValue),
      },
    };
  }

  /* Every run in the history window, newest first. ONE call in live mode: the
     pre-aggregated batch summary (v1-payments.sql Q1). The 7/30/90 range picker
     then filters this in memory, so switching range costs no network. */
  async function load() {
    if (RUNS) return RUNS;

    if (!isLive()) { RUNS = buildMockRuns(); return RUNS; }

    const today = new Date();
    const iso = d => d.toISOString().slice(0, 10);
    const from = new Date(today); from.setDate(from.getDate() - C.historyDays);
    /* @ToDate is EXCLUSIVE and set to tomorrow, so today is included and
       future-dated runs (scheduled retries) are not — they are v2. */
    const to = new Date(today); to.setDate(to.getDate() + 1);

    const rows = await ctFetch(C.endpoints && C.endpoints.dashboard,
                               { FromDate: iso(from), ToDate: iso(to) });
    if (C.debug) console.log("[FinanceDashboard] Q1 returned", rows.length, "runs");

    RUNS = rows.map(rowToRun).sort((a, b) => b.date - a.date || b.batchId - a.batchId);
    return RUNS;
  }

  /* One run's header + roll-up. On the dedicated run page this is the FIRST
     call, and in live mode it is the same summary view filtered to one batch —
     one row, not a transaction scan. */
  /* ── Q2 row → transaction object ─────────────────────────────────────────
     StatusBucket already speaks the UI's vocabulary (Pending / Processing /
     Cleared / Declined), so no translation table is needed. It can also say
     "Error" or "Other", which are NOT in Core.STATUS_ORDER — they render in
     the table but have no filter chip and no Outcome row. That is the same
     gap as Q1's ErrorCount/OtherCount (TODO §3, "Errors are invisible").

     PaymentType is 'cc' | 'dd' | 'other'. There is no 'other' entry in
     Core.PAY_TYPES, so typeById() falls back to its 4th entry and such a row
     is LABELLED "EFT Transfer". Batch 3837 has none; add an `oth` PAY_TYPE
     if a real one ever appears.

     ChargeDate is kept as the raw string. It arrives with no timezone offset
     ("2026-09-02T07:14:18.41"), which new Date() reads as LOCAL time while
     the value is UTC — a 10-hour shift in AEST, enough to move a payment to
     the wrong day. Nothing on this surface renders it, so it is left unparsed
     rather than parsed wrongly. Parse it deliberately before displaying it. */
  function rowToTxn(row) {
    return {
      id:        row.SortKey,
      ref:       row.PaymentRef || "",
      member:    row.MemberName || "",
      memberId:  row.MemberId == null ? "" : String(row.MemberId),
      partyId:   row.PartyId,
      amount:    num(row.Amount),
      status:    row.StatusBucket || "Other",
      /* The raw Payments.Status int. Nothing renders it, but the CSV carries it
         so finance can reconcile against the source table without guessing
         which statuses a bucket collapsed (4+5 → Cleared, 6+15 → Declined). */
      statusRaw: row.StatusRaw,
      type:      row.PaymentType  || "other",
      reason:    row.DeclineReason || "",
      code:      row.DeclineCode   || "",
      stillOwed: num(row.StillOwed) > 0,
      processingDays: row.ProcessingDays == null ? null : num(row.ProcessingDays),
      chargeDate: row.ChargeDate || null,
    };
  }

  /* One batch's payload, cached per (runId, filter, search, page). The page-1
     unfiltered fetch is what loadRun() uses, so opening a run costs ONE call
     and the first table render reuses it rather than asking again. */
  /* A Map, and capped. The key includes the search string, so an un-capped
     cache gains a permanent entry for every distinct search a user types —
     each holding a page of rows plus the reasons and by-type sets. Map keeps
     insertion order, which makes evicting the oldest a one-liner. */
  const RUN_CACHE = new Map();
  const RUN_CACHE_MAX = 24;
  const DETAIL_RUNS = {};   // runId -> run, for findRun() on the run surface
  const cacheKey = (runId, status, search, page, type) =>
    [runId, status || "all", search || "", page || 1, type || "all"].join("");

  /* `mode` picks how much of the endpoint runs:
       full          Q2 + Q4 + Q5 + Q6 — the header and all three panels
       transactions  Q2 only — the table, plus the pager total Q2 carries
     A filter change, a search and a page change all leave the panels alone —
     they describe the whole run, not the filtered view — so they ask for
     `transactions` and the endpoint does not spend ~750ms redrawing data that
     did not change. Q4's EXISTS over every decline in the batch is most of it.

     The Flow defaults to `full` for an absent or unrecognised Mode, so this is
     safe to ship before the Flow knows about it: an old Flow ignores the field
     and returns everything — slower, still correct. */
  async function fetchRunPayload(runId, { status = "all", search = "", page = 1, type = "all",
                                          pageSize = C.txnPageSize, mode = "transactions",
                                          cache = true } = {}) {
    /* The key has no pageSize, so a payload fetched at a non-default size
       (the CSV export's pages) must bypass the cache in both directions. */
    const key = cacheKey(runId, status, search, page, type);
    const hit = cache ? RUN_CACHE.get(key) : null;
    /* A `full` payload satisfies either request; a lean one satisfies only
       `transactions`. Without this asymmetry the first table render could
       cache a lean payload under the key loadRun() wants, and loadRun would
       then read a payload with no BatchHeader — reporting a batch that exists
       as "not found". */
    if (hit && (hit.mode === "full" || mode === "transactions")) return hit;

    const body = {
      BatchId: Number(runId),
      Offset:  (Math.max(1, page) - 1) * pageSize,
      Fetch:   pageSize,
      /* Q2's server-side filters. `all` is normalised to null here AND in the
         SQL, so either end can be the one that gets it right. */
      Bucket:  status === "all" ? null : status,
      Search:  search || null,
      /* Payment-type chip: Q2's PaymentType values — cc / dd / other. */
      PaymentType: type === "all" ? null : type,
      Mode:    mode,
    };
    const data = await ctFetchRaw(C.endpoints && C.endpoints.run, body);

    const set = k => (Array.isArray(data?.[k]) ? data[k] : []);
    const txnRows = set("TransactionData");

    /* The pager total comes off Q2's own COUNT(*) OVER (), so it is computed
       over the SAME filtered set the rows came from and cannot disagree with
       them. `TransactionCount` is the pre-4-Sep-2026 Q3 set, kept only as a
       fallback for a Flow that has not dropped that activity yet — it is
       UNFILTERED, so it must never win when Q2 supplied a total.

       Zero rows is the one case Q2 cannot answer: no rows, no COUNT column.
       Zero is the right total for an empty filtered result, and the fallback
       is deliberately not consulted, because Q3's unfiltered 13,801 under an
       empty table is exactly the lie this change exists to remove. */
    const filtered = status !== "all" || type !== "all" || !!search;
    const total = txnRows.length ? num(txnRows[0].TxnTotal)
                : filtered       ? 0
                : num(set("TransactionCount")[0]?.TxnTotal);

    const payload = {
      mode,                                    // what this payload actually contains
      rows:     txnRows.map(rowToTxn),
      total,
      header:   set("BatchHeader")[0] || null, // null on a `transactions` payload
      reasons:  set("DeclineReasons"),
      byType:   set("PaymentByType"),
    };
    if (C.debug) {
      console.log("[FinanceDashboard] batch", runId, "(" + mode + ") →",
        payload.rows.length, "rows of", payload.total, "·",
        payload.reasons.length, "reasons ·", payload.byType.length, "type cells");
    }
    if (!cache) return payload;
    RUN_CACHE.set(key, payload);
    if (RUN_CACHE.size > RUN_CACHE_MAX) RUN_CACHE.delete(RUN_CACHE.keys().next().value);
    return payload;
  }

  /* One run's header + roll-up. In live mode this is ONE call to the batch
     endpoint — Q5 returns Q1's own shape for this batch, so rowToRun() maps it
     unchanged and runStats() short-circuits on `stats` exactly as it does for
     a run picked off the dashboard list.

     Replaces the old implementation, which ran Q1 across 365 days and searched
     the result to render one run's header. */
  async function loadRun(runId) {
    if (!isLive()) {
      const all = await load();
      return all.find(r => r.id === runId) || null;
    }

    /* `full`: this is the only call that needs the header and the panels. */
    const payload = await fetchRunPayload(runId, { mode: "full" });
    if (!payload.header) return null;          // no such batch → "not found"

    const run = rowToRun(payload.header);
    /* Q5 deliberately omits DeclinedUnprocessedCount: Q4 already counts the
       same declines per reason, so summing those costs nothing and saves a
       second EXISTS pass over every decline in the batch. */
    run.stats.badUnprocessed = payload.reasons.reduce((n, r) => n + num(r.UnprocessedCount), 0);
    /* Everything the detail panels need that the runs list does not. */
    run.detail = { reasons: payload.reasons, byType: payload.byType };

    /* Findable by the synchronous findRun() the renderers use — but kept OUT
       of RUNS, because load() short-circuits on `if (RUNS)` and seeding it
       with a single run would make the dashboard believe it had already
       fetched the whole history. */
    DETAIL_RUNS[run.id] = run;
    return run;
  }

  /* One page of a run's transactions. In live mode this is the only call that
     touches payment-grain data, and it is always bounded: one batch, one page.
     Returns { rows, total }.

     status and search are applied SERVER-SIDE (Q2's @Bucket / @Search), so
     `total` describes the filtered set, not the batch. Filtering here in the
     browser would describe the PAGE — "Declined (3)" out of a batch holding
     12,628 — which is why it is not done client-side on live at any point. */
  async function loadTransactions(runId, { status = "all", search = "", type = "all", page = 1,
                                          pageSize = C.txnPageSize, cache = true } = {}) {
    const filtered = status !== "all" || type !== "all" || !!search;
    if (isLive()) {
      const payload = await fetchRunPayload(runId, { status, search, type, page, pageSize, cache });
      return { rows: payload.rows, total: payload.total, filtersApplied: true, filtered };
    }

    const run = await loadRun(runId);
    if (!run) return { rows: [], total: 0, filtersApplied: true, filtered: false };
    const q = (search || "").toLowerCase();
    let rows = run.txns;
    if (status !== "all") rows = rows.filter(t => t.status === status);
    if (type !== "all")   rows = rows.filter(t => t.type === type);
    if (q) rows = rows.filter(t => (t.member + " " + t.ref + " " + t.memberId).toLowerCase().includes(q));
    const total = rows.length;
    const from = (Math.max(1, page) - 1) * pageSize;
    return { rows: rows.slice(from, from + pageSize), total, filtersApplied: true, filtered };
  }

  /* Every transaction in the current view, for the CSV export — fetched as a
     run of PAGED requests (C.csvPageSize rows each, one at a time) rather than
     one huge response, so the caller can show real progress and the endpoint
     never has to build a multi-megabyte payload in one go.

     onProgress(loaded, total) fires after every page; `total` is Q2's
     COUNT(*) OVER () from the first page. signal.aborted stops it between
     pages (the Cancel button). Returns { rows, total, truncated, cancelled }.
     `truncated` means the view is bigger than C.csvMaxRows, so the caller can
     say so instead of handing over a short file that looks complete.

     Pages are NOT cached: a one-off click, and 14 pages of 1,000 rows would
     evict every page the table has cached.

     Offset paging over live data: a payment that changes status mid-export can
     move in or out of a status-filtered view and shift later pages by a row.
     The ORDER BY (ChargeDate, Id) is stable, so an unfiltered export is exact. */
  async function loadAllTransactions(runId, { status = "all", search = "", type = "all" } = {},
                                     { onProgress, signal } = {}) {
    const cap      = C.csvMaxRows  || 25000;
    const pageSize = C.csvPageSize || 1000;
    const rows = [];
    let total = 0;
    for (let page = 1; ; page++) {
      if (signal && signal.aborted) return { rows, total, truncated: false, cancelled: true };
      const res = await loadTransactions(runId, { status, search, type, page, pageSize, cache: false });
      if (page === 1) total = res.total;
      rows.push(...res.rows);
      if (onProgress) onProgress(Math.min(rows.length, total), total);
      /* A short page is the end, whatever the total said — never loop on it. */
      if (res.rows.length < pageSize || rows.length >= total || rows.length >= cap) break;
    }
    const kept = rows.slice(0, cap);
    return { rows: kept, total, truncated: total > kept.length, cancelled: false };
  }

  const runsInRange = (rangeDays) => (RUNS || []).filter(r => r.daysAgo < rangeDays);
  const findRun = (runId) => DETAIL_RUNS[runId] || (RUNS || []).find(r => r.id === runId) || null;
  const all = () => RUNS || [];

  /* The date `daysAgo` is measured against. Mock mode pins "today" to 6 Jul 2026
     so the sample data is stable; live mode uses the real date. Anything that
     converts between a calendar date and daysAgo — the custom range picker in
     particular — must use THIS, or the two disagree by months in mock mode. */
  const today = () => (isLive() ? new Date() : new Date(TODAY));

  /* Oldest run currently loaded, as a Date. The custom-range picker uses it as
     its `min`: the window is filtered in memory out of one fetch, so offering
     an earlier date would silently return nothing. */
  function earliestLoaded() {
    const runs = all();
    if (!runs.length) return today();
    return runs.reduce((min, r) => (r.date < min ? r.date : min), runs[0].date);
  }

  return { load, loadRun, loadTransactions, loadAllTransactions, runsInRange, findRun, all, isLive,
           TODAY, today, earliestLoaded };
})();
