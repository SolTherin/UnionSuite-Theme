// Agreement communications candidate (decision 13; communications-compare.html).
// Nothing here is in the theme. Target when chosen: zUnionSuite.js, beside
// US-ACTIVITY-FEED.

/* US-ACTIVITY-RECIPIENTS:START — how a sent email went, inside an opened
   activity card, shown by the kind of send (owner, 4 October 2026).
   On a contact an email has one recipient, so its delivery history
   (US-ACTIVITY-EVENTS) says it all. An agreement sends two kinds of email or
   SMS, each its own source on the feed host, so the IQAs (not the card) decide
   which is which, from the tag a sent email carries (TODO.md: the send
   hook):
   - A group send (a contact group such as SBU, 10 to 15 people):
       <li data-source="emails-groups" data-query="Agreement Emails to Groups"
           data-recipients="Agreement Email Recipients" …></li>
     The recipients IQA runs for the email when its card first opens, one
     row per recipient, problems first: Recipient (required),
     RecipientGroup, Status. The card shows the send results (a summary
     bar and a count per state) and every recipient with their status; above
     data-recipients-shown (default 15) the rest slide in under "Show all".
     The group column shows only when the recipients span several groups.
   - A member send (every covered member, possibly thousands):
       <li data-source="emails-members" data-query="Agreement Emails to Members"
           data-delivery="Agreement Email Delivery" …></li>
     The delivery IQA returns one row of counts for the email: Recipients,
     Opened, Delivered, Pending, Failed. The card shows the summary bar
     and the counts; no recipient list (the send's own record has it).
   Both IQAs run from the core folder (data-us-activity-folder), filtered
   on the feed's record filter and ActivityKey. States: Opened (Opened,
   Clicked), Delivered (Delivered, Unsubscribed), Pending (Queued,
   Processed, Deferred, Pending, Sent, blank), Failed (Bounced, Dropped,
   Spam report, Failed, Undelivered; SMS has no Opened).
   The block sits between the details fields and the note. Loading and
   Retry work as the details do. */
(function () {
  'use strict';

  if (window.UnionSuiteActivityRecipients) return;

  const STATES = [
    {key: 'opened', label: 'Opened', statuses: ['opened', 'clicked']},
    {key: 'delivered', label: 'Delivered', statuses: ['delivered', 'unsubscribed']},
    {key: 'pending', label: 'Pending', statuses: ['queued', 'processed', 'deferred', 'pending', 'sent', '']},
    {key: 'failed', label: 'Failed', statuses: ['bounced', 'bounce', 'dropped', 'spam report', 'failed', 'undelivered']}
  ];
  const loaded = new Map();

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const text = value => value == null ? '' : String(unwrap(value)).trim();
  const number = value => Math.max(0, Number(text(value).replace(/,/g, '')) || 0);
  const format = value => value.toLocaleString('en-AU');

  function el(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function field(row, name) {
    const key = Object.keys(row || {}).find(item => item.toLowerCase() === name.toLowerCase());
    return key ? unwrap(row[key]) : undefined;
  }

  function stateOf(status) {
    const value = status.toLowerCase();
    return (STATES.find(state => state.statuses.includes(value)) || STATES[2]).key;
  }

  // The card's feed, its source and record key, and which view it takes.
  function context(record) {
    const feed = record.closest('.us-activity-feed');
    const [sourceKey, ...rest] = (record.dataset.usActivityId || '').split(':');
    const source = feed?.querySelector(`.us-activity__sources > li[data-source="${CSS.escape(sourceKey)}"]`);
    if (!feed || !source || !rest.length) return null;
    const delivery = text(source.dataset.delivery);
    const recipients = text(source.dataset.recipients);
    if (!delivery && !recipients) return null;
    return {
      feed,
      id: record.dataset.usActivityId,
      key: rest.join(':'),
      view: delivery ? 'summary' : 'list',
      query: delivery || recipients,
      shown: Number(source.dataset.recipientsShown) || 15
    };
  }

  async function query(ctx, limit) {
    const {feed} = ctx;
    const folder = text(feed.dataset.usActivityFolder).replace(/\/+$/, '');
    const params = new URLSearchParams({QueryName: folder + '/' + ctx.query, limit: String(limit), offset: '0'});
    params.set(text(feed.dataset.usActivityFilter) || 'ID', text(feed.dataset.usActivityValue));
    params.set('ActivityKey', ctx.key);
    const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
    const response = await fetch('/api/query?' + params, {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}
    });
    if (!response.ok) throw Error('HTTP ' + response.status);
    const data = await response.json();
    const rows = unwrap(data.Items)?.$values ?? unwrap(data.Items);
    if (!Array.isArray(rows)) throw Error('Unexpected response');
    return rows;
  }

  // A member send: one row of counts.
  async function loadSummary(ctx) {
    const [row] = await query(ctx, 1);
    if (!row) return {total: 0, counts: null};
    const counts = Object.fromEntries(STATES.map(state => [state.key, number(field(row, state.label))]));
    const counted = Object.values(counts).reduce((sum, value) => sum + value, 0);
    return {total: number(field(row, 'Recipients')) || counted, counts};
  }

  // A group send: every recipient (a group is small; 200 is a safe cap).
  async function loadList(ctx) {
    const rows = (await query(ctx, 200)).map(row => {
      const status = text(field(row, 'Status')) || 'Queued';
      return {name: text(field(row, 'Recipient')), group: text(field(row, 'RecipientGroup')), status, state: stateOf(status)};
    }).filter(row => row.name);
    const counts = Object.fromEntries(STATES.map(state => [state.key, rows.filter(row => row.state === state.key).length]));
    return {total: rows.length, counts, rows};
  }

  // The send results: a count per state, as one quiet line.
  function legend(counts) {
    const list = el('ul', 'us-record__delivery-legend');
    STATES.forEach(state => {
      if (!counts[state.key]) return;
      const item = el('li', '');
      item.dataset.usRecipientState = state.key;
      item.append(el('span', 'us-record__delivery-count', format(counts[state.key])), ' ' + state.label);
      list.append(item);
    });
    return list;
  }

  function bar(counts) {
    const node = el('div', 'us-record__delivery-bar');
    node.setAttribute('aria-hidden', 'true');
    STATES.forEach(state => {
      if (!counts[state.key]) return;
      const segment = el('span', 'us-record__delivery-segment');
      segment.dataset.usRecipientState = state.key;
      segment.style.flexGrow = String(counts[state.key]);
      node.append(segment);
    });
    return node;
  }

  function recipientList(rows, withGroup, className) {
    const list = el('ul', 'us-record__recipient-list' + (withGroup ? '' : ' us-record__recipient-list--one-group') + (className ? ' ' + className : ''));
    rows.forEach(row => {
      const item = el('li', 'us-record__recipient');
      item.dataset.usRecipientState = row.state;
      item.append(el('span', 'us-record__recipient-name', row.name));
      if (withGroup) item.append(el('span', 'us-record__recipient-group', row.group));
      item.append(el('span', 'us-record__recipient-status', row.status));
      list.append(item);
    });
    return list;
  }

  const moreLabel = entry => entry.expanded ? 'Show fewer' : 'Show all ' + format(entry.total) + ' recipients';

  function fill(block, ctx) {
    const entry = loaded.get(ctx.id);
    block.replaceChildren();
    block.dataset.usRecipientsView = ctx.view;
    if (entry.status === 'loading') {
      const status = el('p', 'us-record__extra-status', ctx.view === 'summary' ? 'Loading delivery…' : 'Loading recipients…');
      status.setAttribute('role', 'status');
      block.append(status);
    } else if (entry.status === 'failed') {
      const status = el('p', 'us-record__extra-status', (ctx.view === 'summary' ? 'Delivery' : 'Recipients') + ' could not be loaded. ');
      status.setAttribute('role', 'status');
      const again = el('button', 'TextButton SmallButton us-record__recipients-retry', 'Retry');
      again.type = 'button';
      status.append(again);
      block.append(status);
    } else if (entry.total && entry.counts) {
      const label = el('p', 'us-record__note-label', ctx.view === 'summary' ? 'Delivery to ' : 'Recipients ');
      label.append(el('span', 'us-record__recipients-total', ctx.view === 'summary' ? format(entry.total) + ' members' : format(entry.total)));
      block.append(label);
      // The send results: a summary bar and a count per state, on both.
      const results = el('div', 'us-record__delivery');
      results.append(bar(entry.counts), legend(entry.counts));
      block.append(results);
      if (ctx.view === 'list') {
        const withGroup = new Set(entry.rows.map(row => row.group)).size > 1;
        block.append(recipientList(entry.rows.slice(0, ctx.shown), withGroup));
        if (entry.rows.length > ctx.shown) {
          const rest = recipientList(entry.rows.slice(ctx.shown), withGroup, 'us-record__recipient-list--rest');
          rest.hidden = !entry.expanded;
          const more = el('button', 'TextButton SmallButton us-outline-button us-record__recipients-more', moreLabel(entry));
          more.type = 'button';
          more.setAttribute('aria-expanded', String(Boolean(entry.expanded)));
          block.append(rest, more);
        }
      }
    }
    block.hidden = !block.childElementCount;
  }

  function paint(ctx) {
    ctx.feed.querySelectorAll(`.us-record[data-us-activity-id="${CSS.escape(ctx.id)}"]`).forEach(record => {
      const block = record.querySelector('.us-record__recipients');
      if (block) fill(block, ctx);
    });
  }

  function load(ctx) {
    const current = loaded.get(ctx.id);
    if (current && current.status !== 'failed') return;
    const entry = {status: 'loading', total: 0, counts: null, rows: [], expanded: false};
    loaded.set(ctx.id, entry);
    paint(ctx);
    (ctx.view === 'summary' ? loadSummary(ctx) : loadList(ctx)).then(result => {
      entry.status = 'ready';
      Object.assign(entry, result);
    }, error => {
      entry.status = 'failed';
      console.warn('[US-ACTIVITY-RECIPIENTS] Did not load:', ctx.query, ctx.key, error);
    }).then(() => {
      if (loaded.get(ctx.id) === entry) paint(ctx);
    });
  }

  // Slides the rest of a group's list in or out; the button follows.
  function toggleRest(record, ctx, button) {
    const entry = loaded.get(ctx.id);
    const rest = record.querySelector('.us-record__recipient-list--rest');
    if (!entry || !rest) return;
    entry.expanded = !entry.expanded;
    button.setAttribute('aria-expanded', String(entry.expanded));
    button.textContent = moreLabel(entry);
    const fold = window.UnionSuiteRecordCards?.fold;
    if (fold) fold(rest, entry.expanded);
    else rest.hidden = !entry.expanded;
  }

  // After the details fields and any delivery history, so the card's fold
  // measures it.
  function attach(record) {
    const ctx = context(record);
    const detail = record.querySelector('.us-record__detail');
    if (!ctx || !detail || detail.querySelector('.us-record__recipients')) return ctx;
    const block = el('div', 'us-record__recipients');
    block.hidden = true;
    const after = detail.querySelector('.us-record__events') || detail.querySelector('.us-record__extra');
    detail.insertBefore(block, after ? after.nextSibling : detail.firstChild);
    if (loaded.has(ctx.id)) fill(block, ctx);
    return ctx;
  }

  // Capture phase: before the card opens, so the loading line is part of
  // the height it folds open to.
  document.addEventListener('click', event => {
    const record = event.target.closest('.us-activity-feed .us-record');
    if (!record) return;
    if (event.target.closest('.us-record__recipients-retry')) {
      const ctx = context(record);
      if (ctx) load(ctx);
      return;
    }
    const more = event.target.closest('.us-record__recipients-more');
    if (more) {
      const ctx = context(record);
      if (ctx) toggleRest(record, ctx, more);
      return;
    }
    const onToggle = event.target.closest('.us-record__toggle') ||
      (event.target.closest('.us-record__head') && !event.target.closest('a, button, input, select, textarea'));
    if (!onToggle || record.querySelector('.us-record__toggle')?.getAttribute('aria-expanded') === 'true') return;
    const ctx = attach(record);
    if (ctx) load(ctx);
  }, true);

  // Cards redrawn already open (a reload, a range change) get their block.
  new MutationObserver(() => {
    document.querySelectorAll('.us-activity-feed .us-record.is-expanded').forEach(attach);
  }).observe(document.documentElement, {subtree: true, childList: true});

  window.UnionSuiteActivityRecipients = {version: '0.2'};
})();
/* US-ACTIVITY-RECIPIENTS:END */
