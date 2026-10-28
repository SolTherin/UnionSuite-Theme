/* ============================================================================
   Finance Dashboard — CloudToolz endpoint probe
   ----------------------------------------------------------------------------
   Paste this whole file into the DevTools console of a LOGGED-IN iMIS page and
   press Enter.  It runs the 3-step CloudToolz relay and dumps everything the
   endpoint sends back, plus a type analysis of the first row.

   WHERE TO RUN IT:  an iMIS page on the iMIS origin — NOT the Cloudflare Pages
   standalone, and not a blank tab.  The relay needs three things that only
   exist in an iMIS page's DOM: the session cookie, #__RequestVerificationToken,
   and #__ClientContext.  Any RiSE page you can load while signed in will do.

   Transport is lifted from the working HubReportBuilder implementation
   (../ReportBuilder/api.js → cloudToolzFetch, docs/CLOUDTOOLZ-INTEGRATION.md §0):
     1. GET  /api/iqa?queryname=$/ZENTSO/Security/CloudToolzUrl   → CT base URL
     2. POST /api/ZenTokens                                       → mint relay token
     3. POST {base}/{endpoint} with the party headers             → the actual call

   Results are left on window.__fd for poking at afterwards:
     __fd.raw     the response text
     __fd.data    the parsed JSON
     __fd.rows    the detected row array
     __fd.base    the resolved CloudToolz base URL
   ========================================================================== */

(async () => {
  "use strict";

  // ── Edit these ────────────────────────────────────────────────────────────
  const CFG = {
    endpoint: "UnionTemplate/UnionPay/FinanceDashboard/LoadData/Dashboard",
    method:   "POST",
    // Whatever parameters the Flow expects. Adjust names to match the Flow —
    // if it ignores them entirely you'll just get the full unfiltered set back.
    body: {
      FromDate: "2026-01-01",
      ToDate:   "9999-12-31",
    },
    mode: "report",        // sent as the HubReportMode header
    baseUrlOverride: null, // set a full https://... to skip step 1
  };
  // ──────────────────────────────────────────────────────────────────────────

  const log  = (...a) => console.log("%c[fd-probe]", "color:#0a7", ...a);
  const warn = (...a) => console.warn("%c[fd-probe]", "color:#e90", ...a);
  const err  = (...a) => console.error("%c[fd-probe]", "color:#d33", ...a);

  window.__fd = {};

  /* ---- 0. Preflight ------------------------------------------------------ */
  const token = document.getElementById("__RequestVerificationToken")?.value || "";

  const parseCtx = raw => {
    if (!raw) return null;
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  };
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

  console.group("%c[fd-probe] preflight", "color:#0a7;font-weight:bold");
  log("origin           ", window.location.origin);
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
    window.__fd.base = base;
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
    window.__fd.raw = text;

    console.group("%c[fd-probe] response", "color:#0a7;font-weight:bold");
    log("HTTP        ", res.status, res.statusText);
    log("time        ", ms + "ms");
    log("content-type", res.headers.get("content-type"));
    log("size        ", text.length.toLocaleString() + " chars");
    console.groupEnd();

    if (!res.ok) {
      err("Endpoint returned HTTP " + res.status);
      err("Body:", text.slice(0, 4000));
      return;
    }

    /* ---- 4. Parse + analyse --------------------------------------------- */
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      err("Response is not JSON. First 2000 chars:");
      console.log(text.slice(0, 2000));
      return;
    }
    window.__fd.data = data;

    /* ---- 3b. MULTI-RESULT-SET detection --------------------------------
       Open item #8: does the relay preserve more than one result set?
       The dangerous case is SILENT TRUNCATION — a relay that reads only the
       first grid returns Q1's array unchanged, and everything below would
       report "success" while Q2/Q3 vanished.  So say explicitly what shape
       came back before analysing rows.                                   */
    const looksLikeRowArray = v => Array.isArray(v) && (v.length === 0 || (v[0] && typeof v[0] === "object" && !Array.isArray(v[0])));
    const arrayOfArrays = Array.isArray(data) && data.length > 0 && data.every(looksLikeRowArray);
    const namedTables   = data && !Array.isArray(data) && typeof data === "object"
      ? Object.entries(data).filter(([, v]) => looksLikeRowArray(v))
      : [];

    console.group("%c[fd-probe] result sets", "color:#0a7;font-weight:bold");
    if (arrayOfArrays) {
      log("✓ MULTIPLE result sets, as an array of arrays —", data.length);
      data.forEach((t, i) => log("   set " + i + ": " + t.length + " rows, keys: " +
        (t[0] ? Object.keys(t[0]).slice(0, 6).join(", ") : "(empty)")));
      window.__fd.sets = data;
    } else if (namedTables.length > 1) {
      log("✓ MULTIPLE result sets, as named tables —", namedTables.length);
      namedTables.forEach(([k, t]) => log("   " + k + ": " + t.length + " rows, keys: " +
        (t[0] ? Object.keys(t[0]).slice(0, 6).join(", ") : "(empty)")));
      window.__fd.sets = Object.fromEntries(namedTables);
    } else if (typeof data === "string" && data.trim().startsWith("{")) {
      warn("Response is a JSON STRING, not an object — likely a FOR JSON result.");
      warn("If it looks cut off around 2033 chars, that is the FOR JSON row-split");
      warn("gotcha: SQL Server chunks long FOR JSON output across rows and the");
      warn("relay must concatenate them. Check the tail of __fd.raw.");
    } else {
      warn("ONE result set only. If you sent 3 queries, the relay is discarding");
      warn("the extras — it is not an error, it just silently keeps the first.");
      warn("Fall back to a FOR JSON composed object (SQL-DATASETS.md §8).");
    }
    console.groupEnd();

    // Find the row array: the response itself, or a common wrapper path.
    let rows = null, rowsPath = "(response is the array)";
    if (arrayOfArrays) {
      rows = data[0];
      rowsPath = "set 0 of " + data.length + " (analysing the first only)";
    } else if (Array.isArray(data)) {
      rows = data;
    } else if (data && typeof data === "object") {
      for (const p of ["Data", "data", "Items", "items", "rows", "Rows",
                       "Result", "result", "Table", "recordset"]) {
        if (Array.isArray(data[p])) { rows = data[p]; rowsPath = p; break; }
      }
      if (!rows) {
        for (const [k, v] of Object.entries(data)) {
          if (Array.isArray(v)) { rows = v; rowsPath = k; break; }
        }
      }
    }
    window.__fd.rows = rows;

    if (!rows) {
      warn("No row array found. Top-level shape:");
      console.log(data && typeof data === "object" ? Object.keys(data) : typeof data);
      console.log(data);
      return;
    }

    console.group("%c[fd-probe] shape", "color:#0a7;font-weight:bold");
    log("rows at     ", rowsPath);
    log("row count   ", rows.length.toLocaleString());
    console.groupEnd();

    if (!rows.length) { warn("Zero rows returned — check the Flow's parameter names."); return; }

    /* ---- 5. Column + TYPE analysis --------------------------------------
       The point of this table: numbers that arrive as JS strings. bigint
       (COUNT_BIG) is serialised as a string by several drivers to avoid
       precision loss, and if that happens fd-core.js → runStats does string
       concatenation instead of addition — plausible-looking wrong numbers
       rather than an error.  Anything flagged NUMERIC-AS-STRING needs either a
       CAST in the SQL or a Number() coercion in fd-data.js.               */
    const r0 = rows[0];
    const analysis = Object.entries(r0).map(([k, v]) => {
      const jsType = v === null ? "null" : Array.isArray(v) ? "array" : typeof v;
      const looksNumeric = typeof v === "string" && v.trim() !== "" && !isNaN(Number(v));
      return {
        column: k,
        jsType,
        flag:   looksNumeric ? "⚠ NUMERIC-AS-STRING" : "",
        sample: v === null ? "(null)" : String(v).slice(0, 40),
      };
    });

    console.group("%c[fd-probe] row 1 — columns & types", "color:#0a7;font-weight:bold");
    console.table(analysis);
    console.groupEnd();

    const stringy = analysis.filter(a => a.flag);
    if (stringy.length) {
      warn(stringy.length + " column(s) came back as STRINGS that look numeric:");
      warn(stringy.map(s => s.column).join(", "));
      warn("Fix in SQL with CAST(... AS int), or coerce with Number() in fd-data.js.");
    } else {
      log("✓ No numeric-as-string columns — arithmetic in fd-core.js will work as-is.");
    }

    console.group("%c[fd-probe] first 3 rows", "color:#0a7;font-weight:bold");
    console.table(rows.slice(0, 3));
    console.groupEnd();

    log("Done. Poke at window.__fd (.raw / .data / .rows / .base)");

  } catch (e) {
    err(e && e.message ? e.message : e);
    if (e instanceof TypeError && /fetch/i.test(String(e.message))) {
      err("A bare 'Failed to fetch' here is almost always CORS, not a bad URL —");
      err("the browser hides the real status. Check that the CloudToolz Flow allows");
      err("this iMIS origin (" + window.location.origin + "), and confirm the Flow is");
      err("actually published. The Network tab will show the request as (failed)/CORS.");
    }
    console.error(e);
  }
})();
