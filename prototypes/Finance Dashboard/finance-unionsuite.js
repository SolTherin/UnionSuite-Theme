/* Finance trial. Fictional data adapted from Payment Run Screen.html.
   Theme components come from the shared files; this file owns local demo behaviour only. */
(function () {
"use strict";

/* ═══════════════════════════════════════════════════════════
   MOCK DATA — deterministic pseudo-random so the prototype
   looks the same on every load. "Today" is pinned.
   ═══════════════════════════════════════════════════════════ */
const TODAY = new Date(2026, 6, 6); // 6 Jul 2026

function mulberry32(a) {
  return function() {
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

const PAY_TYPES = [
  { id: "dd",   label: "Direct Debit", color: "var(--brand-600)", pale: "var(--brand-50)" },
  { id: "cc",   label: "Credit Card",  color: "var(--accent)", pale: "var(--accent-100)" },
  { id: "bpay", label: "BPAY",         color: "var(--brand-500)", pale: "var(--brand-50)" },
  { id: "eft",  label: "EFT Transfer", color: "var(--neutral-500)", pale: "var(--bg-sunken)" },
  { id: "inv",  label: "Invoice",      color: "var(--warning)", pale: "var(--warning-bg)" },
  { id: "pd",   label: "Payroll",      color: "var(--status-purple)", pale: "var(--status-purple-bg)" },
];
const typeById = id => PAY_TYPES.find(t => t.id === id);

const PAY_AREAS = [
  { id: "dues", label: "Membership Dues", color: "var(--brand-800)" },
  { id: "ins",  label: "Insurance",       color: "var(--brand-500)" },
  { id: "event",label: "Event income",     color: "var(--status-purple)" },
  { id: "addon",label: "Other add ons",   color: "var(--accent)" },
];

const RUN_TEMPLATES = [
  { id: "invoices", name: "Membership Dues — Invoices", typeLabel: "Invoices", desc: "",              kind: "invoices", mix: { invoice: 1 },              areaMix: { dues: .90, ins: .06, addon: .04 },              size: [400, 900], avg: [60, 220] },
  { id: "daily",    name: "Membership Dues — Daily Run", typeLabel: "CC / DD", desc: "iMIS Autopay",   kind: "dues",     mix: { dd: .62, cc: .38 },         areaMix: { dues: .93, ins: .04, addon: .03 },              size: [180, 420], avg: [18, 42]  },
  { id: "other",    name: "Membership Dues — Other", typeLabel: "CC / DD", desc: "adhoc payments",        kind: "dues",     mix: { cc: .75, dd: .25 },         areaMix: { dues: .55, ins: .10, addon: .20, event: .15 }, size: [8, 60],    avg: [30, 160] },
  { id: "payroll",  name: "Payroll Deduction", typeLabel: "PRD", desc: "reconciliation",                  kind: "payroll",  mix: { pd: 1 },                    areaMix: { dues: .95, ins: .05 },                          size: [60, 200],  avg: [15, 30]  },
  { id: "bpay",     name: "BPAY", typeLabel: "BPAY", desc: "reconciliation",                                kind: "bpay",     mix: { bpay: 1 },                  areaMix: { dues: .85, ins: .10, addon: .05 },              size: [40, 140],  avg: [40, 260] },
];

const DECLINE_REASONS = [
  "Insufficient funds", "Expired card", "Invalid account number",
  "Payment cancelled by member", "Bank rejected transaction", "Card reported lost/stolen",
];
/* Soft = may succeed on retry; hard = will never succeed, needs new payment details */
const DECLINE_KIND = {
  "Insufficient funds": "Soft",
  "Bank rejected transaction": "Soft",
  "Expired card": "Hard",
  "Invalid account number": "Hard",
  "Payment cancelled by member": "Hard",
  "Card reported lost/stolen": "Hard",
};
const declineKind = reason => DECLINE_KIND[reason] || "Soft";

const FIRST = ["Sarah","Michael","Emma","David","Jessica","Chris","Amanda","Daniel","Rachel","Mark","Lisa","Tom","Nicole","James","Karen","Peter","Megan","Andrew","Fiona","Luke","Hannah","Sean","Priya","Marco","Yuki","Aisha","Liam","Grace","Noah","Chloe"];
const LAST  = ["Nguyen","Smith","Patel","Williams","Chen","Brown","Kelly","Taylor","Singh","Wilson","Martin","Lee","Anderson","Thompson","White","Walsh","Harris","King","Costa","Ryan","OBrien","Murphy","Zhang","Ali","Rossi","Kaur","Doyle","Webb","Hunt","Bell"];

function weightedType(mix) {
  const r = rnd();
  let acc = 0;
  for (const [id, w] of Object.entries(mix)) { acc += w; if (r <= acc) return id; }
  return Object.keys(mix)[0];
}

/* Build ~90 days of runs so range switching works */
let runSeq = 2040;
const RUNS = [];
for (let daysAgo = 90; daysAgo >= 0; daysAgo--) {
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
        status: "Cleared", reason: "", note: "", dueDays: 0, processed: false,
      };
      if (method === "cc") {
        const declined = rnd() < declineRate;
        txn.status = declined ? "Declined" : "Cleared";
        txn.reason = declined ? pick(DECLINE_REASONS) : "";
        txn.processed = declined ? rnd() < 0.45 : false;
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
          txn.processed = declined ? rnd() < 0.45 : false;
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

    /* A run created today has been generated but not yet submitted to the bank —
       every payment sits Pending until the overnight submission. */
    if (daysAgo === 0) {
      txns.forEach(t => { t.status = "Pending"; t.reason = ""; t.processed = false; t.note = "awaiting submission to bank"; });
    }

    RUNS.push({
      id: "RUN-" + (runSeq++),
      name: tpl.name,
      kind: tpl.kind,
      typeLabel: tpl.typeLabel,
      desc: tpl.desc,
      date: new Date(d),
      time: pick(["06:00","06:30","09:15","11:00","14:30","16:45"]),
      txns, daysAgo,
    });
  }
}
RUNS.sort((a, b) => b.date - a.date);

/* A small, fixed set of runs flagged for manual review — this tracker should
   rarely have anything in it. Both sit inside the 30-day window but
   outside the 7-day window, so the 7-day view is clean. */
const reviewCandidates = RUNS.filter(r => r.daysAgo >= 8 && r.daysAgo < 30 && r.name === "Membership Dues — Daily Run");
[reviewCandidates[0], reviewCandidates[reviewCandidates.length - 1]]
  .filter(Boolean)
  .forEach(r => { r.needsReview = true; });

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
const $ = id => document.getElementById(id);
const fmtMoney = n => n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: n >= 10000 ? 0 : 2 });
const fmtNum = n => n.toLocaleString("en-AU");
const fmtPct = n => (n * 100).toFixed(1) + "%";
const DOW = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MON = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDateLong = d => `${DOW[d.getDay()]} ${d.getDate()} ${MON[d.getMonth()]} ${d.getFullYear()}`;
const fmtDateShort = d => `${d.getDate()} ${MON[d.getMonth()]}`;
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;" }[c]));

const PAID = ["Cleared", "Reconciled"];
const isPaid = t => PAID.includes(t.status);

function runStats(run) {
  const val = a => a.reduce((s, t) => s + t.amount, 0);
  const paid = run.txns.filter(isPaid);
  const proc = run.txns.filter(t => t.status === "Processing");
  const pend = run.txns.filter(t => t.status === "Pending");
  const wait = run.txns.filter(t => t.status === "Awaiting payment");
  const bad  = run.txns.filter(t => t.status === "Declined");
  return {
    count: run.txns.length,
    okCount: paid.length,   okValue: val(paid),
    procCount: proc.length, procValue: val(proc),
    pendCount: pend.length, pendValue: val(pend),
    waitCount: wait.length, waitValue: val(wait),
    badCount: bad.length,   badValue: val(bad),
    badUnprocessed: bad.filter(t => !t.processed).length,
    totalValue: val(run.txns),
  };
}

/* The run itself has no stored status — its state is derived from its payments.
   Lifecycle: Generated (created, not yet sent to bank) → Processing (sent,
   awaiting bank results) → Finalised (no payments remain processing). */
function runState(run) {
  const s = runStats(run);
  if (s.pendCount)            return { key: "generated",  label: "Generated",  cls: "generated" };
  if (s.procCount)            return { key: "processing", label: `Processing · ${fmtNum(s.procCount)}`, cls: "processing" };
  return { key: "finalised", label: "Finalised", cls: "completed" };
}


// Finance page state is local to this prototype; nothing is submitted or persisted.
const state = { view:"overview", range:30, runId:null, runFilter:"all", runSearch:"", runPage:1,
  txnFilter:"all", txnSearch:"", txnPage:1, reason:"all", sort:"original", descending:false,
  trendMetric:"value", typeMetric:"count" };
const PAGE_SIZE = 25;
const money = n => n.toLocaleString("en-AU", { style:"currency", currency:"AUD", minimumFractionDigits:2, maximumFractionDigits:2 });
const sum = rows => rows.reduce((total,t) => total + t.amount,0);
const inRange = () => RUNS.filter(r => r.daysAgo < state.range);
const reviewRun = r => Boolean(r.needsReview && runStats(r).procCount);
const eligible = t => t.status === "Declined" && declineKind(t.reason) === "Soft" && !t.processed;
const eligibleIn = rows => rows.filter(eligible);
const icon = name => `<i class="ti ti-${name}" aria-hidden="true"></i>`;
const badge = (label,variant="") => `<span class="us-badge${variant ? ` us-badge--${variant}` : ""}">${esc(label)}</span>`;
const statusVariant = status => ({Cleared:"success",Reconciled:"success",Processing:"primary","Awaiting payment":"warning",Declined:"danger"}[status] || "");
const paymentBadge = t => badge(t.status,statusVariant(t.status));
const runBadge = r => { const s=runState(r); return badge(s.label,{generated:"",processing:"primary",finalised:"success"}[s.key]); };
const typeLabel = id => { const t=typeById(id); return `<span class="us-finance-type"><span style="background:${t.color}" aria-hidden="true"></span>${esc(t.label)}</span>`; };
const txnsForRange = () => inRange().flatMap(run=>run.txns.map((txn,index)=>({run,txn,index})));
const batchEligible = () => transactionRows().filter(r=>eligible(r.txn));
let toastTimer;

function notify(message) {
  clearTimeout(toastTimer);
  $("finance-notice").innerHTML = `${esc(message)}<button type="button" data-action="dismiss" aria-label="Dismiss notification">${icon("x")}</button>`;
  $("finance-notice").hidden = false;
  toastTimer=setTimeout(()=>{$("finance-notice").hidden=true;},8000);
}
function periodControl() {
  return `<label class="us-finance-period">Period <select aria-label="Reporting period" data-change="range">${[7,30,90].map(n=>`<option value="${n}"${state.range===n?" selected":""}>Last ${n} days</option>`).join("")}</select></label>`;
}
function banner({eyebrow,title,subtitle,actions="",facts=""}) {
  return `<section class="us-banner" aria-label="${esc(title)}"><header class="us-banner__surface">
    <div class="us-banner__summary"><div class="us-banner__identity"><span class="us-banner__eyebrow">${eyebrow}</span><h1 class="us-banner__title" tabindex="-1">${esc(title)}</h1><p class="us-banner__subtitle">${subtitle}</p></div>
    <div class="us-banner__actions">${actions}</div></div>${facts?`<div class="us-banner__details"><dl class="us-banner__facts">${facts}</dl></div>`:""}
  </header></section>`;
}
function bannerButton(action,label,glyph,primary=false,disabled=false) {
  return `<button type="button" class="us-banner__action${primary?" us-banner__action--primary":""}" data-action="${action}"${disabled?" disabled":""}>${icon(glyph)} ${label}</button>`;
}
function kpi(label,value,sub,{action="",tone=""}={}) {
  const tag=action?"button":"article";
  return `<${tag} class="us-finance-kpi"${action?` type="button" data-action="${action}"`:""}><span class="us-finance-kpi-label">${label}${action?icon("arrow-up-right"):""}</span><strong class="us-finance-kpi-value${tone?` us-finance-${tone}`:""}">${value}</strong><span class="us-finance-kpi-sub">${sub}</span></${tag}>`;
}
function search(id,placeholder,value) {
  return `<label class="us-finance-search"><span class="us-finance-sr">${placeholder}</span>${icon("search")}<input id="${id}" data-search="${id}" type="search" placeholder="${placeholder}" value="${esc(value)}" autocomplete="off"></label>`;
}
function filters(kind,items,current) {
  return `<div class="us-finance-filters" role="group" aria-label="${kind==="run"?"Payment run":"Transaction"} status filters">${items.map(([value,label])=>`<button type="button" class="us-finance-filter" data-filter="${kind}" data-value="${esc(value)}" aria-pressed="${current===value}">${label}</button>`).join("")}</div>`;
}
function metricControls(kind,current) {
  return `<div class="us-finance-segments" role="group" aria-label="${kind==="trend"?"Daily volume":"Payment type"} metric">${["count","value"].map(m=>`<button type="button" data-metric="${kind}" data-value="${m}" aria-pressed="${current===m}">${m==="count"?"Count":"$ value"}</button>`).join("")}</div>`;
}
function reportShell(title,toolbar,id,exportAction="export") {
  return `<section class="us-finance-panel us-finance-report" aria-label="${title}"><div class="us-finance-panel-heading"><h2>${title} <span id="${id}-count" class="us-badge"></span></h2><button type="button" class="TextButton LinkButton" data-action="${exportAction}">${icon("download")} Export CSV</button></div><div class="us-finance-toolbar">${toolbar}</div><div class="us-finance-report-scroll" id="${id}-scroll" role="region" aria-label="${title} table; scroll for more columns and rows" tabindex="0"><div id="${id}-rows"></div></div><div id="${id}-pager" class="us-finance-pager" aria-label="${title} pagination"></div></section>`;
}

function renderOverview() {
  const runs=inRange(),txns=runs.flatMap(r=>r.txns),paid=txns.filter(isPaid),proc=txns.filter(t=>t.status==="Processing"),wait=txns.filter(t=>t.status==="Awaiting payment"),bad=txns.filter(t=>t.status==="Declined");
  const reviews=RUNS.filter(reviewRun).length;
  const prior=RUNS.filter(r=>r.daysAgo>=state.range&&r.daysAgo<state.range*2).flatMap(r=>r.txns).filter(isPaid);
  const priorValue=sum(prior),delta=priorValue?(sum(paid)-priorValue)/priorValue:0;
  const comparison=state.range===90?"All collected payments in this period":priorValue?`${icon(delta>=0?"trending-up":"trending-down")} ${fmtPct(Math.abs(delta))} ${delta>=0?"up":"down"} on prior period`:"No prior-period comparison";
  $("finance-main").innerHTML = banner({eyebrow:"Finance · Payments & settlement",title:"Finance Dashboard",subtitle:"Track collections, review payment runs and follow up outstanding payments.",actions:periodControl()})+
    `<h2 class="us-finance-section-title">Last ${state.range} days at a glance</h2><div class="us-finance-kpis">`+
    kpi("Total collected",fmtMoney(sum(paid)),comparison,{tone:"brand"})+
    kpi("Payments processed",fmtNum(txns.length),`Across ${runs.length} payment runs`)+
    kpi("Processing",fmtNum(proc.length),`${fmtMoney(sum(proc))} awaiting a result`)+
    kpi("Invoices outstanding",fmtNum(wait.length),`${fmtMoney(sum(wait))} awaiting payment`)+
    kpi("Declined",fmtNum(bad.length),`${fmtMoney(sum(bad))} uncollected`,{action:"declines",tone:bad.length?"negative":""})+
    kpi("Runs to review",fmtNum(reviews),"Processing longer than 5 days · All dates",{action:"review",tone:reviews?"negative":""})+
    `</div><div class="us-finance-charts" id="finance-charts"></div><div id="finance-review-note"></div>`+
    reportShell("Payment runs",search("runs-search","Search run title, ID or date…",state.runSearch)+filters("run",[["all","All"],["generated","Generated"],["processing","Processing"],["finalised","Finalised"],["review",`To review (${reviews})`]],state.runFilter),"runs","export-runs");
  renderCharts(); renderRuns();
}
function renderCharts() {
  const byValue=state.trendMetric==="value",daily=[];
  for(let ago=state.range-1;ago>=0;ago--) {
    const txns=RUNS.filter(r=>r.daysAgo===ago).flatMap(r=>r.txns),paid=txns.filter(isPaid),bad=txns.filter(t=>t.status==="Declined");
    const date=new Date(TODAY);date.setDate(date.getDate()-ago);
    daily.push({date,ok:byValue?sum(paid):paid.length,bad:byValue?sum(bad):bad.length});
  }
  const max=Math.max(...daily.map(d=>d.ok+d.bad),1),w=560,h=160,bw=w/daily.length;
  const bars=daily.map((d,i)=>{
    const oh=d.ok/max*144,bh=d.bad/max*144,x=i*bw+bw*.14;
    const tip=`${fmtDateShort(d.date)}: ${byValue?money(d.ok):fmtNum(d.ok)} collected; ${byValue?money(d.bad):fmtNum(d.bad)} declined`;
    return `<g><title>${esc(tip)}</title><rect x="${x}" y="${h-oh}" width="${bw*.72}" height="${oh}" rx="1.5" fill="var(--brand-600)"/><rect x="${x}" y="${h-oh-bh}" width="${bw*.72}" height="${bh}" rx="1" fill="var(--danger)"/></g>`;
  }).join("");
  const txns=inRange().flatMap(r=>r.txns);
  const types=PAY_TYPES.map(t=>{const list=txns.filter(x=>x.type===t.id);return {t,count:list.length,value:sum(list)};}).sort((a,b)=>b[state.typeMetric]-a[state.typeMetric]);
  const peak=Math.max(...types.map(t=>t[state.typeMetric]),1);
  $("finance-charts").innerHTML=`<section class="us-finance-panel" aria-label="Daily payment volume"><div class="us-finance-panel-heading"><h2>Daily payment volume</h2>${metricControls("trend",state.trendMetric)}</div><div class="us-finance-panel-body"><div class="us-finance-trend"><div class="us-finance-axis-y" aria-hidden="true"><span>${byValue?fmtMoney(max):fmtNum(max)}</span><span>${byValue?fmtMoney(max/2):fmtNum(Math.round(max/2))}</span><span>0</span></div><svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Daily ${byValue?"payment value":"payment count"} over the last ${state.range} days. ${byValue?money(daily.reduce((n,d)=>n+d.ok,0)):fmtNum(daily.reduce((n,d)=>n+d.ok,0))} collected; ${byValue?money(daily.reduce((n,d)=>n+d.bad,0)):fmtNum(daily.reduce((n,d)=>n+d.bad,0))} declined."><line x1="0" y1="80" x2="560" y2="80" stroke="var(--border)" stroke-dasharray="3 5"/>${bars}</svg><div class="us-finance-axis-x">${[0,.25,.5,.75,1].map(f=>`<span>${fmtDateShort(daily[Math.round(f*(daily.length-1))].date)}</span>`).join("")}</div></div><div class="us-finance-legend"><span><span class="us-finance-dot"></span>Collected ${byValue?"value":"payments"}</span><span><span class="us-finance-dot us-finance-dot--danger"></span>Declined ${byValue?"value":"payments"}</span></div></div></section>
  <section class="us-finance-panel" aria-label="Payments by type"><div class="us-finance-panel-heading"><h2>Payments by type</h2>${metricControls("type",state.typeMetric)}</div><div class="us-finance-panel-body us-finance-bars">${types.map(({t,count,value})=>`<div class="us-finance-bar-row"><span class="us-finance-bar-label">${esc(t.label)}</span><div class="us-finance-bar-track" aria-hidden="true"><div class="us-finance-bar-fill" style="width:${(state.typeMetric==="count"?count:value)/peak*100}%;background:${t.color}"></div></div><span class="us-finance-bar-value">${state.typeMetric==="count"?`<strong>${fmtNum(count)}</strong> · ${fmtMoney(value)}`:`${fmtNum(count)} · <strong>${fmtMoney(value)}</strong>`}</span></div>`).join("")}</div></section>`;
}
function filteredRuns() {
  let runs=state.runFilter==="review"?RUNS.filter(reviewRun):inRange();
  if(!["all","review"].includes(state.runFilter))runs=runs.filter(r=>runState(r).key===state.runFilter);
  const q=state.runSearch.toLowerCase().trim();
  return q?runs.filter(r=>`${r.name} ${r.id} ${r.typeLabel} ${fmtDateLong(r.date)}`.toLowerCase().includes(q)):runs;
}
function pager(id,total,page) {
  const pages=Math.max(1,Math.ceil(total/PAGE_SIZE));
  $(id+"-pager").innerHTML=`<span role="status">${total?`${fmtNum((page-1)*PAGE_SIZE+1)}–${fmtNum(Math.min(page*PAGE_SIZE,total))} of ${fmtNum(total)}`:"0 results"}</span><span>Page ${page} of ${pages}</span><button type="button" data-page="${id}" data-value="${page-1}" aria-label="Previous page"${page<=1?" disabled":""}>${icon("chevron-left")}</button><button type="button" data-page="${id}" data-value="${page+1}" aria-label="Next page"${page>=pages?" disabled":""}>${icon("chevron-right")}</button>`;
}
function renderRuns() {
  const runs=filteredRuns();state.runPage=Math.min(state.runPage,Math.max(1,Math.ceil(runs.length/PAGE_SIZE)));
  $("runs-count").textContent=fmtNum(runs.length);
  $("finance-review-note").innerHTML=state.runFilter==="review"?`<div class="us-finance-alert">${icon("alert-triangle")}<span>Showing flagged runs with payments processing longer than 5 days, across all dates.</span><button type="button" class="TextButton LinkButton" data-filter="run" data-value="all">Clear filter</button></div>`:"";
  let date="",html="";
  const shown=runs.slice((state.runPage-1)*PAGE_SIZE,state.runPage*PAGE_SIZE);
  for(const run of shown) {
    const key=fmtDateLong(run.date),s=runStats(run),retry=eligibleIn(run.txns).length;
    if(date!==key) {const day=runs.filter(r=>fmtDateLong(r.date)===key);html+=`<tr class="us-finance-date-row"><th colspan="9" scope="rowgroup">${key}<span>${day.length} runs · ${fmtMoney(day.reduce((n,r)=>n+runStats(r).okValue,0))} collected</span></th></tr>`;date=key;}
    html+=`<tr><td><a class="us-finance-run-link" href="#run/${run.id}">${esc(run.name)}</a><span class="us-finance-sub">${run.id} · ${esc(run.typeLabel)}${run.desc?` · ${esc(run.desc)}`:""}</span></td><td>${runBadge(run)}</td><td class="us-finance-num">${money(s.totalValue)}</td><td class="us-finance-num">${fmtNum(s.count)}</td><td class="us-finance-num">${s.pendCount||"—"}</td><td class="us-finance-num">${s.procCount||"—"}</td><td class="us-finance-num${s.badCount?" us-finance-negative":""}">${s.badCount||"—"}</td><td>${retry?`<button type="button" class="TextButton LinkButton" data-action="retry-run" data-run="${run.id}" aria-label="Retry ${retry} eligible declines in ${run.id}">${icon("rotate-clockwise")} Retry (${retry})</button>`:`<span class="us-finance-sub">${run.txns.some(t=>t.retryQueued)?"Retry queued":"—"}</span>`}</td><td><a href="#run/${run.id}" aria-label="Open ${run.id}">${icon("chevron-right")}</a></td></tr>`;
  }
  $("runs-rows").innerHTML=`<table class="us-finance-table"><caption>Payment runs grouped by run date</caption><thead><tr>${["Payment run","Status","Total amount","Payments","Pending","Processing","Declined","Eligible to retry",""] .map((h,i)=>`<th scope="col"${i>=2&&i<=6?' class="us-finance-num"':""}>${h||'<span class="us-finance-sr">Open run</span>'}</th>`).join("")}</tr></thead><tbody>${html||`<tr><td colspan="9" class="us-finance-empty"><strong>No payment runs found</strong>Try another search or clear the status filter.</td></tr>`}</tbody></table>`;
  pager("runs",runs.length,state.runPage); syncFilters();
}
function summaryPanel(title,heads,rows,foot="") {
  return `<section class="us-finance-panel"><div class="us-finance-panel-heading"><h2>${title}</h2></div><div class="us-finance-panel-body"><table><caption>${title} summary</caption><thead><tr>${heads.map((h,i)=>`<th scope="col"${i?' class="us-finance-num"':""}>${h}</th>`).join("")}</tr></thead><tbody>${rows||`<tr><td colspan="${heads.length}" class="us-finance-empty">No declined payments in this run.</td></tr>`}</tbody>${foot?`<tfoot>${foot}</tfoot>`:""}</table></div></section>`;
}
function summaryRow(cells) {return `<tr>${cells.map((c,i)=>`<td${i?' class="us-finance-num"':""}>${c}</td>`).join("")}</tr>`;}
function renderDetail() {
  const run=RUNS.find(r=>r.id===state.runId);if(!run)return navigate("overview");
  const s=runStats(run),retry=eligibleIn(run.txns).length,types=PAY_TYPES.filter(t=>run.txns.some(x=>x.type===t.id));
  const facts=[["Run ID",run.id],["Run date",`${fmtDateLong(run.date)} · ${run.time}`],["Payment method",esc(run.typeLabel)],["Run status",runBadge(run)]].map(([k,v])=>`<div class="us-banner__fact"><dt>${k}</dt><dd>${v}</dd></div>`).join("");
  $("finance-main").innerHTML=banner({eyebrow:"Finance · Payment run",title:run.name,subtitle:"Review payment outcomes and follow up eligible declines.",facts,actions:bannerButton("print","Print","printer")+bannerButton("export","Export CSV","download")+bannerButton("retry-batch",`Retry declines (${retry})`,"rotate-clockwise",true,!retry)})+
  `<div class="us-finance-kpis">${kpi("Payments in run",fmtNum(s.count),`${types.length} payment types`)+kpi("Collected",fmtMoney(s.okValue),`${fmtNum(s.okCount)} payments cleared`,{tone:"brand"})+kpi("Processing",fmtNum(s.procCount),`${fmtMoney(s.procValue)} awaiting a result`)+kpi("Invoices outstanding",fmtNum(s.waitCount),`${fmtMoney(s.waitValue)} awaiting payment`)+kpi("Declined",fmtNum(s.badCount),`${fmtMoney(s.badValue)} uncollected`,{action:"filter-declined",tone:s.badCount?"negative":""})+kpi("Average payment",money(s.okCount?s.okValue/s.okCount:0),"Collected payments only")}</div>`;
  const typeRows=types.map(pt=>{const a=run.txns.filter(t=>t.type===pt.id),ok=a.filter(isPaid);return summaryRow([typeLabel(pt.id),fmtNum(a.length),fmtNum(ok.length),money(sum(ok))]);}).join("");
  const statuses=["Pending","Processing","Awaiting payment","Cleared","Reconciled","Declined"];
  const outcomes=statuses.map(status=>{const a=run.txns.filter(t=>t.status===status);return a.length?summaryRow([badge(status,statusVariant(status)),fmtNum(a.length),money(sum(a))]):"";}).join("");
  const reasons=DECLINE_REASONS.map(reason=>{const a=run.txns.filter(t=>t.reason===reason&&t.status==="Declined");return a.length?summaryRow([esc(reason),declineKind(reason),fmtNum(a.length),declineKind(reason)==="Soft"?fmtNum(eligibleIn(a).length):"—"]):"";}).join("");
  $("finance-main").insertAdjacentHTML("beforeend",`<div class="us-finance-summary">${summaryPanel("Payment type",["Type","Count","Cleared","Collected"],typeRows,summaryRow(["Total",fmtNum(s.count),fmtNum(s.okCount),money(s.okValue)]))+summaryPanel("Outcome",["Status","Count","Value"],outcomes,summaryRow(["Total",fmtNum(s.count),money(s.totalValue)]))+summaryPanel("Decline reasons",["Reason","Type","Count","To retry"],reasons,reasons?summaryRow(["Total","",fmtNum(s.badCount),fmtNum(retry)]):"")}</div>`+
    reportShell("Transactions",search("txn-search","Search member, reference or ID…",state.txnSearch)+filters("txn",[["all","All"],...statuses.map(s=>[s,s==="Awaiting payment"?"Awaiting":s])],state.txnFilter),"txns"));
  renderTransactions();
}
function renderDeclines() {
  const rows=txnsForRange().filter(r=>r.txn.status==="Declined"),soft=rows.filter(r=>declineKind(r.txn.reason)==="Soft"),retry=rows.filter(r=>eligible(r.txn));
  $("finance-main").innerHTML=banner({eyebrow:"Finance · Payment follow-up",title:"Declined payments",subtitle:"Review decline reasons and retry eligible payments across the selected period.",actions:periodControl()+bannerButton("retry-batch",`Retry eligible (${retry.length})`,"rotate-clockwise",true,!retry.length)})+
  `<div class="us-finance-kpis">${kpi("Declined payments",fmtNum(rows.length),`Across the last ${state.range} days`,{tone:"negative"})+kpi("Uncollected value",fmtMoney(sum(rows.map(r=>r.txn))),"Total declined payment value")+kpi("Soft declines",fmtNum(soft.length),"May succeed on retry")+kpi("Hard declines",fmtNum(rows.length-soft.length),"Payment details need attention")+kpi("Eligible to retry",fmtNum(retry.length),"Soft declines not previously retried")+kpi("Retry queued",fmtNum(rows.filter(r=>r.txn.retryQueued).length),"Simulated in this session")}</div>`+
  reportShell("Declined transactions",search("txn-search","Search member, reference or run…",state.txnSearch)+`<label class="us-finance-period">Reason <select data-change="reason" aria-label="Decline reason"><option value="all">All reasons</option>${DECLINE_REASONS.map(r=>`<option${state.reason===r?" selected":""}>${esc(r)}</option>`).join("")}</select></label>`,"txns");
  renderTransactions();
}
function transactionRows() {
  let rows=state.view==="detail"?(RUNS.find(r=>r.id===state.runId)?.txns||[]).map((txn,index)=>({run:RUNS.find(r=>r.id===state.runId),txn,index})):txnsForRange().filter(r=>r.txn.status==="Declined");
  if(state.view==="detail"&&state.txnFilter!=="all")rows=rows.filter(r=>r.txn.status===state.txnFilter);
  if(state.view==="declines"&&state.reason!=="all")rows=rows.filter(r=>r.txn.reason===state.reason);
  const q=state.txnSearch.toLowerCase().trim();
  if(q)rows=rows.filter(({txn:t,run:r})=>`${t.member} ${t.memberId} ${t.ref} ${r.id} ${r.name}`.toLowerCase().includes(q));
  if(state.sort!=="original")rows=rows.slice().sort((a,b)=>{const x=a.txn[state.sort],y=b.txn[state.sort];return (typeof x==="number"?x-y:String(x).localeCompare(String(y)))*(state.descending?-1:1);});
  return rows;
}
function sortHead(label,key,num=false) {
  return `<th scope="col"${num?' class="us-finance-num"':""} aria-sort="${state.sort===key?(state.descending?"descending":"ascending"):"none"}"><button type="button" class="us-finance-sort" data-sort="${key}">${label}${icon(state.sort===key?(state.descending?"sort-descending":"sort-ascending"):"arrows-sort")}</button></th>`;
}
function renderTransactions() {
  const rows=transactionRows(),declines=state.view==="declines";
  state.txnPage=Math.min(state.txnPage,Math.max(1,Math.ceil(rows.length/PAGE_SIZE)));
  $("txns-count").textContent=fmtNum(rows.length);
  const shown=rows.slice((state.txnPage-1)*PAGE_SIZE,state.txnPage*PAGE_SIZE);
  $("txns-rows").innerHTML=`<table class="us-finance-table"><caption>${declines?"Declined payments across the selected period":"Transactions in the selected payment run"}</caption><thead><tr>${sortHead("Reference","ref")}${sortHead("Member","member")}<th scope="col">${declines?"Payment run":"Member ID"}</th><th scope="col">Payment type</th>${sortHead("Amount","amount",true)}<th scope="col">Status</th><th scope="col">${declines?"Decline reason":"Result / note"}</th>${declines?'<th scope="col">Follow-up</th>':""}</tr></thead><tbody>${shown.map(({txn:t,run:r,index})=>`<tr><td>${esc(t.ref)}</td><td><strong>${esc(t.member)}</strong></td><td>${declines?`<a class="us-finance-run-link" href="#run/${r.id}">${r.id}</a><span class="us-finance-sub">${fmtDateShort(r.date)}</span>`:esc(t.memberId)}</td><td>${typeLabel(t.type)}</td><td class="us-finance-num${t.status==="Declined"?" us-finance-negative":""}">${money(t.amount)}</td><td>${paymentBadge(t)}</td><td>${esc(t.reason||t.note||"—")}${t.retryQueued?'<span class="us-finance-sub">Retry queued · Sample only</span>':t.status==="Declined"&&t.processed?'<span class="us-finance-sub">Previously retried</span>':""}</td>${declines?`<td>${eligible(t)?`<button type="button" class="TextButton LinkButton" data-action="retry-one" data-run="${r.id}" data-index="${index}">${icon("rotate-clockwise")} Retry</button>`:`<span class="us-finance-sub">${declineKind(t.reason)==="Hard"?"Update payment details":t.retryQueued?"Retry queued":"Previously retried"}</span>`}</td>`:""}</tr>`).join("")||`<tr><td colspan="${declines?8:7}" class="us-finance-empty"><strong>No matching transactions</strong>Try another search or filter.</td></tr>`}</tbody></table>`;
  pager("txns",rows.length,state.txnPage); syncFilters();
  const button=document.querySelector('[data-action="retry-batch"]'),n=batchEligible().length;
  if(button) {button.disabled=!n;button.innerHTML=`${icon("rotate-clockwise")} ${declines?"Retry eligible":"Retry declines"} (${n})`;}
}
function syncFilters() {
  document.querySelectorAll("[data-filter]").forEach(b=>{if(b.classList.contains("us-finance-filter"))b.setAttribute("aria-pressed",String((b.dataset.filter==="run"?state.runFilter:state.txnFilter)===b.dataset.value));});
}
function render() {
  const focus=document.activeElement,action=focus?.dataset?.action,scroll=window.scrollY;
  $("finance-context").textContent=state.view==="overview"?"Overview":state.view==="detail"?state.runId:"Declined payments";
  if(state.view==="overview")renderOverview();else if(state.view==="detail")renderDetail();else renderDeclines();
  if(action)document.querySelector(`[data-action="${action}"]`)?.focus({preventScroll:true});
  window.scrollTo({top:scroll,behavior:"instant"});
}
function route() {
  const hash=location.hash.slice(1),detail=hash.startsWith("run/")&&RUNS.some(r=>r.id===hash.slice(4));
  state.view=detail?"detail":hash==="declines"?"declines":"overview";state.runId=detail?hash.slice(4):null;
  state.txnFilter="all";state.txnSearch="";state.txnPage=1;state.reason="all";state.sort="original";
  render();window.scrollTo(0,0);document.querySelector("h1")?.focus({preventScroll:true});
}
function navigate(view) {const hash=view==="overview"?"overview":view; if(location.hash==="#"+hash)route();else location.hash=hash;}
function queueRetry(rows) {
  const txns=rows.filter(eligible); if(!txns.length)return;
  txns.forEach(t=>{t.processed=true;t.retryQueued=true;});
  render();notify(`Sample retry queued for ${fmtNum(txns.length)} payment${txns.length===1?"":"s"}. No payment was sent. Reload resets the demo.`);
}
function downloadCsv(runs=false) {
  let rows,filename;
  if(runs) {rows=[["Run ID","Run name","Date","Status","Total amount","Payments","Declined","Eligible to retry"],...filteredRuns().map(r=>{const s=runStats(r);return [r.id,r.name,fmtDateLong(r.date),runState(r).label,s.totalValue.toFixed(2),s.count,s.badCount,eligibleIn(r.txns).length];})];filename="sample-payment-runs.csv";}
  else {rows=[["Reference","Member","Member ID","Run ID","Payment type","Amount","Status","Reason / note","Retry queued"],...transactionRows().map(({txn:t,run:r})=>[t.ref,t.member,t.memberId,r.id,typeById(t.type).label,t.amount.toFixed(2),t.status,t.reason||t.note,t.retryQueued?"Yes":"No"])];filename="sample-"+(state.view==="detail"?state.runId:"declined-payments")+".csv";}
  const cell=value=>{let s=String(value);if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';};
  const blob=new Blob(["\ufeff"+rows.map(r=>r.map(cell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);notify(`Exported ${fmtNum(rows.length-1)} filtered sample records.`);
}
document.addEventListener("click",e=>{
  if(e.target.closest(".us-finance-skip")) {e.preventDefault();$("finance-main").focus();return;}
  const b=e.target.closest("button");if(!b||b.disabled)return;
  if(b.dataset.filter) {state[b.dataset.filter==="run"?"runFilter":"txnFilter"]=b.dataset.value;state[b.dataset.filter==="run"?"runPage":"txnPage"]=1;if(b.dataset.filter==="run")renderRuns();else renderTransactions();}
  if(b.dataset.metric) {state[b.dataset.metric==="trend"?"trendMetric":"typeMetric"]=b.dataset.value;renderCharts();document.querySelector(`[data-metric="${b.dataset.metric}"][data-value="${b.dataset.value}"]`)?.focus({preventScroll:true});}
  if(b.dataset.page) {state[b.dataset.page==="runs"?"runPage":"txnPage"]=Number(b.dataset.value);if(b.dataset.page==="runs")renderRuns();else renderTransactions();$(b.dataset.page+"-scroll").scrollTop=0;$(b.dataset.page+"-scroll").focus({preventScroll:true});}
  if(b.dataset.sort) {state.descending=state.sort===b.dataset.sort?!state.descending:false;state.sort=b.dataset.sort;state.txnPage=1;renderTransactions();document.querySelector(`[data-sort="${b.dataset.sort}"]`)?.focus({preventScroll:true});}
  switch(b.dataset.action) {
    case "overview": navigate("overview");break;
    case "declines": navigate("declines");break;
    case "review":state.runFilter="review";state.runPage=1;renderRuns();document.querySelector('[data-filter="run"][data-value="review"]')?.focus();break;
    case "filter-declined":state.txnFilter="Declined";state.txnPage=1;renderTransactions();document.querySelector('[data-filter="txn"][data-value="Declined"]')?.focus();break;
    case "retry-run":queueRetry(RUNS.find(r=>r.id===b.dataset.run).txns);break;
    case "retry-one":queueRetry([RUNS.find(r=>r.id===b.dataset.run).txns[Number(b.dataset.index)]]);break;
    case "retry-batch":queueRetry(batchEligible().map(r=>r.txn));break;
    case "export-runs":downloadCsv(true);break;
    case "export":downloadCsv();break;
    case "print":window.print();break;
    case "dismiss":$("finance-notice").hidden=true;break;
  }
});
document.addEventListener("input",e=>{if(e.target.dataset.search){if(e.target.dataset.search==="runs-search"){state.runSearch=e.target.value;state.runPage=1;renderRuns();}else {state.txnSearch=e.target.value;state.txnPage=1;renderTransactions();}}});
document.addEventListener("change",e=>{if(e.target.dataset.change==="range"){state.range=Number(e.target.value);state.runPage=1;state.txnPage=1;render();document.querySelector('[data-change="range"]')?.focus({preventScroll:true});}if(e.target.dataset.change==="reason"){state.reason=e.target.value;state.txnPage=1;renderTransactions();}});
window.addEventListener("hashchange",route);
route();
})();
