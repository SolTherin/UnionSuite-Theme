/* ============================================================================
   Finance Dashboard — PaymentBatch endpoint probe  (open item #8)
   ----------------------------------------------------------------------------
   Purpose: answer ONE question — when the Flow runs Q2 + Q3 + Q4, does the
   response hand back all three result sets, or does the relay silently keep
   only the first?  Everything else here exists to make that answer unambiguous.

   It also handles the case where the Flow collates in a JS activity and
   returns ONE composed object — see the "composed object" envelope below.

   Paste this whole file into the DevTools console of a LOGGED-IN iMIS page.
   Not the Cloudflare Pages standalone, not a blank tab — the relay needs the
   session cookie, #__RequestVerificationToken and #__ClientContext, and those
   only exist in an iMIS page's DOM.

   Transport is identical to ct-probe.browser.js / fd-data.js:
     1. GET  /api/iqa?queryname=$/ZENTSO/Security/CloudToolzUrl   -> CT base URL
     2. POST /api/ZenTokens                                       -> relay token
     3. POST {base}/{endpoint} with the party headers             -> the call

   Left on window.__fdb afterwards:
     __fdb.raw     response text          __fdb.sets   normalised result sets
     __fdb.data    parsed JSON            __fdb.q2/.q3/.q4  matched sets
     __fdb.base    resolved base URL      __fdb.verdict     one-line answer
   ========================================================================== */

(async () => {
  "use strict";

  // -- Edit these ------------------------------------------------------------
  const CFG = {
    endpoint: "UnionTemplate/UnionPay/FinanceDashboard/LoadData/PaymentBatch",
    method:   "POST",
    /* Parameter names must match what the Flow declares. If the Flow ignores
       them you get the unfiltered set back; if it requires one you did not
       send, expect an HTTP 400/500 with the name in the body. */
    body: {
      BatchId: 3837,   // <- a real Kind-2 batch, ideally one WITH declines
      Offset:  0,
      Fetch:   100,
    },
    mode: "report",        // sent as the HubReportMode header
    baseUrlOverride: null, // set a full https://... to skip step 1
  };
  // --------------------------------------------------------------------------

  /* What each query's first row should look like. Used to identify which set
     is which rather than trusting positional order — a relay is free to
     reorder, and Q3 (one row, one column) is easy to mistake for an error. */
  const SIGNATURES = [
    { key: "q2", label: "Q2 transactions",    need: ["PaymentRef", "StatusBucket", "Amount"] },
    { key: "q3", label: "Q3 pager total",     need: ["TxnTotal"] },
    { key: "q4", label: "Q4 decline reasons", need: ["Reason", "DeclineCount"] },
  ];

  const log  = (...a) => console.log("%c[fd-batch]", "color:#0a7", ...a);
  const warn = (...a) => console.warn("%c[fd-batch]", "color:#e90", ...a);
  const err  = (...a) => console.error("%c[fd-batch]", "color:#d33", ...a);

  window.__fdb = {};

  /* ---- 0. Preflight ------------------------------------------------------ */
  const token = document.getElementById("__RequestVerificationToken")?.value || "";

  const parseCtx = raw => (!raw ? null : (typeof raw === "string" ? JSON.parse(raw) : raw));
  let ctx = null;
  try {
    const el = document.getElementById("__ClientContext");
    if (el) ctx = parseCtx(el.value || el.getAttribute("value") || el.textContent);
  } catch { /* fall through */ }
  if (!ctx) {
    try { ctx = parseCtx(window.__ClientContext || window.__clientContext); } catch { /* ignore */ }
  }
  const loggedInPartyId = ctx ? String(ctx.loggedInPartyId ?? ctx.LoggedInPartyId ?? "") : "";
  const selectedPartyId = ctx ? String(ctx.selectedPartyId ?? ctx.SelectedPartyId ?? "") : "";
  const websiteKey      = (typeof gWebsiteKey !== "undefined" ? gWebsiteKey : "");

  console.group("%c[fd-batch] preflight", "color:#0a7;font-weight:bold");
  log("origin           ", window.location.origin);
  log("endpoint         ", CFG.endpoint);
  log("BatchId          ", CFG.body.BatchId);
  log("RequestVerifToken", token ? token.slice(0, 12) + "… (" + token.length + " chars)" : "(MISSING)");
  log("loggedInPartyId  ", loggedInPartyId || "(MISSING)");
  log("selectedPartyId  ", selectedPartyId || "(MISSING)");
  log("gWebsiteKey      ", websiteKey || "(missing — usually fine)");
  console.groupEnd();

  if (!token || !loggedInPartyId) {
    err("Not on a logged-in iMIS page — the relay cannot run here.");
    err("Open any RiSE page while signed in to iMIS and re-run this script.");
    return;
  }

  const imisHeaders = extra => Object.assign({
    "Accept": "application/json",
    "RequestVerificationToken": token,
  }, extra || {});

  try {
    /* ---- 1. Resolve the CloudToolz base URL ----------------------------- */
    let base = CFG.baseUrlOverride;
    if (!base) {
      log("step 1 — resolving CloudToolz base URL via IQA…");
      const qs = new URLSearchParams({ queryname: "$/ZENTSO/Security/CloudToolzUrl" });
      const r1 = await fetch("/api/iqa?" + qs, { headers: imisHeaders(), credentials: "include" });
      if (!r1.ok) throw new Error("IQA lookup failed: HTTP " + r1.status);
      const j1 = await r1.json();
      let raw = j1?.Items?.["$values"]?.[0]?.Properties?.["$values"]?.[0]?.Value;
      if (raw !== null && typeof raw === "object" && "$value" in raw) raw = raw["$value"];
      if (!raw || typeof raw !== "string" || !raw.trim()) {
        throw new Error("CloudToolz base URL not found in IQA response");
      }
      base = raw.trim().replace(/\/+$/, "");
    }
    window.__fdb.base = base;
    log("step 1 ✓ base URL:", base);

    /* ---- 2. Mint a ZenToken --------------------------------------------- */
    log("step 2 — minting ZenToken…");
    const prop = (Name, Value) => ({
      "$type": "Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts",
      Name, Value,
    });
    const mintBody = {
      "$type": "Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts",
      "EntityTypeName": "ZenTokens",
      "Properties": {
        "$type": "Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts",
        "$values": [
          prop("PartyId",                  loggedInPartyId),
          prop("ID",                       loggedInPartyId),
          prop("SelectedPartyId",          selectedPartyId),
          prop("RequestVerificationToken", token),
          prop("UtcUnixTimeStamp",         Date.now()),
        ],
      },
    };
    const r2 = await fetch("/api/ZenTokens", {
      method: "POST",
      headers: imisHeaders({ "Content-Type": "application/json" }),
      credentials: "include",
      body: JSON.stringify(mintBody),
    });
    if (!r2.ok) throw new Error("ZenToken mint failed: HTTP " + r2.status);
    log("step 2 ✓ minted (HTTP " + r2.status + ")");

    /* ---- 3. Call the endpoint ------------------------------------------- */
    const url = base + "/" + CFG.endpoint.replace(/^\/+/, "");
    log("step 3 —", CFG.method, url);
    if (CFG.method === "POST") log("request body:", CFG.body);

    const headers = {
      "Accept":                   "application/json",
      "RequestVerificationToken": token,
      "SelectedPartyId":          selectedPartyId,
      "LoggedInPartyId":          loggedInPartyId,
      "WebsiteKey":               websiteKey,
      "HubReportMode":            CFG.mode,
    };
    if (CFG.method === "POST") headers["Content-Type"] = "application/json";

    const t0 = performance.now();
    const res = await fetch(url, {
      method:  CFG.method,
      headers,
      body:    CFG.method === "POST" ? JSON.stringify(CFG.body ?? {}) : undefined,
    });
    const ms = Math.round(performance.now() - t0);

    const text = await res.text();
    window.__fdb.raw = text;

    console.group("%c[fd-batch] response", "color:#0a7;font-weight:bold");
    log("HTTP        ", res.status, res.statusText);
    log("time        ", ms + "ms   (expect seconds until IX_Payments_Batch_Charge exists)");
    log("content-type", res.headers.get("content-type"));
    log("size        ", text.length.toLocaleString() + " chars");
    console.groupEnd();

    if (!res.ok) {
      err("Endpoint returned HTTP " + res.status);
      err("Body:", text.slice(0, 4000));
      return;
    }

    let data;
    try { data = JSON.parse(text); }
    catch (e) {
      err("Response is not JSON. First 2000 chars:");
      console.log(text.slice(0, 2000));
      return;
    }
    window.__fdb.data = data;

    /* A relay that double-encodes hands back a JSON *string*. Unwrap once so
       everything below sees the same shape either way. */
    if (typeof data === "string") {
      const t = data.trim();
      if (t.startsWith("{") || t.startsWith("[")) {
        warn("Response was a JSON STRING, not an object — double-encoded. Unwrapping.");
        try { data = JSON.parse(t); window.__fdb.data = data; }
        catch (e) { err("Inner string did not parse: " + e.message); return; }
      }
    }

    /* ---- 4. Normalise into a list of result sets ------------------------
       Several envelopes are plausible and they are NOT distinguishable by a
       casual eye, so name the one that came back before counting anything.
       The dangerous case is a single set, looking perfectly healthy, with Q3
       and Q4 discarded upstream and nothing to indicate it happened.      */
    const isRowArray = v => Array.isArray(v) &&
      (v.length === 0 || (v[0] && typeof v[0] === "object" && !Array.isArray(v[0])));

    /* FOR JSON chunking: SQL Server splits long FOR JSON output across rows
       under the JSON_F52E2B61-... column name. A relay that forwards rows
       verbatim gives an array of {JSON_F...: "chunk"} that must be joined
       before it parses. Detect and reassemble rather than reporting garbage. */
    const forJsonCol = r => Object.keys(r).find(k => /^JSON_F52E2B61/i.test(k));
    if (Array.isArray(data) && data.length && data[0] && typeof data[0] === "object" && forJsonCol(data[0])) {
      const col = forJsonCol(data[0]);
      const joined = data.map(r => r[col]).join("");
      warn("FOR JSON chunked response detected (" + data.length + " chunks, column " + col + ").");
      warn("Reassembling. The relay is NOT doing this for you — endpoint B must.");
      try { data = JSON.parse(joined); window.__fdb.data = data; log("✓ reassembled and parsed"); }
      catch (e) { err("Chunks did not parse after joining: " + e.message); return; }
    }

    let envelope, sets;
    if (Array.isArray(data) && data.length > 0 && data.every(isRowArray)) {
      envelope = "array of arrays (multiple grids)";
      sets = data.map((rows, i) => ({ name: "set " + i, rows }));
    } else if (data && !Array.isArray(data) && typeof data === "object" &&
               Object.values(data).filter(isRowArray).length > 1) {
      envelope = "named tables / composed object";
      sets = Object.entries(data).filter(([, v]) => isRowArray(v)).map(([name, rows]) => ({ name, rows }));
    } else if (Array.isArray(data)) {
      envelope = "single bare array";
      sets = [{ name: "(response)", rows: data }];
    } else if (data && typeof data === "object") {
      const single = Object.entries(data).find(([, v]) => isRowArray(v));
      envelope = single ? "single wrapped array" : "object, no row array";
      sets = single ? [{ name: single[0], rows: single[1] }] : [];
    } else {
      envelope = typeof data;
      sets = [];
    }

    /* A JS-activity composed object may hold Q3's total as a SCALAR rather
       than a one-row grid ({ Total: 9 } not { Total: [{TxnTotal: 9}] }).
       Promote scalars so the Q3 signature can still match. */
    if (data && !Array.isArray(data) && typeof data === "object") {
      Object.entries(data).forEach(([k, v]) => {
        if (typeof v === "number" || (typeof v === "string" && v.trim() !== "" && !isNaN(Number(v)))) {
          sets.push({ name: k + " (scalar)", rows: [{ TxnTotal: v }], scalar: true });
        }
      });
    }
    window.__fdb.sets = sets;

    console.group("%c[fd-batch] envelope", "color:#0a7;font-weight:bold");
    log("shape      ", envelope);
    log("result sets", sets.length);
    if (data && !Array.isArray(data) && typeof data === "object") {
      log("top-level keys", Object.keys(data).join(", "));
    }
    sets.forEach(s => log("   " + s.name + ": " + s.rows.length + " rows — " +
      (s.rows[0] ? Object.keys(s.rows[0]).slice(0, 8).join(", ") : "(empty)")));
    console.groupEnd();

    /* ---- 5. Identify each set by its columns, not its position ---------- */
    const found = {};
    sets.forEach(s => {
      const keys = s.rows[0] ? Object.keys(s.rows[0]) : [];
      const hit = SIGNATURES.find(sig => sig.need.every(n => keys.includes(n)));
      if (hit && !found[hit.key]) { found[hit.key] = s; s.matched = hit; }
    });
    SIGNATURES.forEach(sig => { window.__fdb[sig.key] = found[sig.key] ? found[sig.key].rows : null; });

    const missing = SIGNATURES.filter(sig => !found[sig.key]);

    console.group("%c[fd-batch] OPEN ITEM #8 — verdict", "color:#0a7;font-weight:bold");
    let verdict;
    if (!missing.length) {
      verdict = "PASS — all three sets arrived (" + envelope + "). Endpoint B can return Q2+Q3+Q4 in one call.";
      log("✓ " + verdict);
      SIGNATURES.forEach(sig => log("   " + sig.label + " → " + found[sig.key].name +
        " (" + found[sig.key].rows.length + " rows)"));
    } else if (sets.length <= 1) {
      verdict = "FAIL — ONE result set only. The extras are being discarded silently. Collate in a JS activity, or compose with FOR JSON (SQL-DATASETS.md §8).";
      warn("✗ " + verdict);
      warn("Missing: " + missing.map(m => m.label).join(", "));
    } else {
      verdict = "PARTIAL — " + sets.length + " sets came back but not all three matched.";
      warn("⚠ " + verdict);
      warn("Missing: " + missing.map(m => m.label).join(", "));
      warn("Either the Flow does not run all three, or a column was renamed —");
      warn("compare the key lists above against v1-payments.sql before concluding.");
    }
    /* Q4 legitimately returns zero rows for a clean batch, which reads as a
       missing set. Say so, or you will chase a relay bug that is not there. */
    if (found.q4 && found.q4.rows.length === 0) {
      warn("Q4 matched but is EMPTY — expected if this batch had no declines.");
      warn("Re-run against a batch you know declined before trusting an empty panel.");
    }
    /* The whole point of merging Individuals into Payments in the Flow. */
    if (found.q2 && found.q2.rows.length) {
      const withName = found.q2.rows.filter(r => r.MemberName != null && r.MemberName !== "").length;
      if (!("MemberName" in found.q2.rows[0])) {
        warn("Q2 has no MemberName column — the Individuals merge is not in the response.");
      } else if (withName === 0) {
        warn("Q2 has MemberName on every row but ALL are blank — classic CrmId/ID");
        warn("type mismatch in the merge. String() both sides of the lookup key.");
      } else if (withName < found.q2.rows.length) {
        log("MemberName present on " + withName + "/" + found.q2.rows.length +
            " rows — partial misses are normal (orphaned CrmIds), all-blank is not.");
      }
    }
    window.__fdb.verdict = verdict;
    console.groupEnd();

    /* ---- 6. Numeric-as-string check, EVERY set -------------------------
       COUNT_BIG comes back as a string from several drivers, and Q3's
       TxnTotal is exactly that. A string total makes the pager compute
       plausible-looking wrong page counts instead of throwing.          */
    const stringy = [];
    sets.forEach(s => {
      if (!s.rows.length) return;
      const r0 = s.rows[0];
      const cols = Object.entries(r0).map(([k, v]) => {
        const looksNumeric = typeof v === "string" && v.trim() !== "" && !isNaN(Number(v));
        if (looksNumeric) stringy.push(s.name + "." + k);
        return {
          column: k,
          jsType: v === null ? "null" : Array.isArray(v) ? "array" : typeof v,
          flag:   looksNumeric ? "⚠ NUMERIC-AS-STRING" : "",
          sample: v === null ? "(null)" : String(v).slice(0, 40),
        };
      });
      console.group("%c[fd-batch] " + s.name + (s.matched ? "  — " + s.matched.label : "") +
                    "  (" + s.rows.length + " rows)", "color:#0a7;font-weight:bold");
      console.table(cols);
      if (s.rows.length > 1) console.table(s.rows.slice(0, 3));
      console.groupEnd();
    });

    if (stringy.length) {
      warn(stringy.length + " column(s) arrived as STRINGS that look numeric:");
      warn(stringy.join(", "));
      warn("CAST in SQL, or Number() them in fd-data.js — arithmetic silently concatenates otherwise.");
    } else {
      log("✓ No numeric-as-string columns.");
    }

    log("Done. Poke at window.__fdb (.raw / .data / .sets / .q2 / .q3 / .q4 / .verdict)");

  } catch (e) {
    err(e && e.message ? e.message : e);
    if (e instanceof TypeError && /fetch/i.test(String(e.message))) {
      err("A bare 'Failed to fetch' here is almost always CORS, not a bad URL —");
      err("the browser hides the real status. Check the Flow allows this origin (" +
          window.location.origin + "), and that the Flow is actually PUBLISHED.");
      err("A brand-new endpoint that was never published fails exactly like this.");
    }
    console.error(e);
  }
})();
