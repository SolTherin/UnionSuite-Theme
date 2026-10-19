/* Tags IQA probe (19 October 2026): what the Parent Tags and Child Tags
   IQAs return, for the Add note form's Tags and Subtags.

   Read-only: GET /api/query only. Run it in the browser console on any
   signed-in page of the iMIS site (it needs the page's
   __RequestVerificationToken). The full results stay in
   window.__tagsProbe and are copied to the clipboard as JSON (DevTools'
   copy()); paste them back into the session.

   It:
   1. Reads every Parent Tags row (all pages) and lists its columns.
   2. Picks the parents' ID column (PARENT_KEY, or a guess) and sends those
      IDs to Child Tags as ParentTag="32","58",… (the format to test).
   3. If that returns nothing, tries one parent alone, to tell a filter that
      is empty from a multi-value format iMIS does not accept.
   4. Lists the child columns, finds the one that points back at a parent,
      and groups the children under their parents. */
(async () => {
  'use strict';

  const PARENT_QUERY = '$/_i4u_/SandBox/CRM Layouts/Parent Tags';
  const CHILD_QUERY = '$/_i4u_/SandBox/CRM Layouts/Child Tags';
  const CHILD_PARAMETER = 'ParentTag';
  const PARENT_KEY = null;     // e.g. 'Ordinal'; null guesses the ID column
  const MAX_PARENTS = null;    // e.g. 5 to send only the first five; null sends all
  const PAGE_SIZE = 500;

  const token = document.getElementById('__RequestVerificationToken')?.value;
  if (!token) {
    console.error('[Tags probe] No __RequestVerificationToken on this page. Open a signed-in iMIS page and run it again.');
    return;
  }

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;

  // /api/query rows are flat alias-keyed objects; older shapes are
  // Name/Value property lists. Give back a plain {column: value} either way.
  function flatten(item) {
    const properties = unwrap(item?.Properties)?.$values;
    if (Array.isArray(properties)) {
      return Object.fromEntries(properties.map(entry => [entry.Name, unwrap(entry.Value)]));
    }
    return Object.fromEntries(Object.entries(item || {})
      .filter(([key]) => !key.startsWith('$'))
      .map(([key, value]) => [key, unwrap(value)]));
  }

  async function readAll(queryName, filters = {}) {
    const rows = [];
    const pages = [];
    let offset = 0;
    for (let page = 0; page < 50; page += 1) {
      const params = new URLSearchParams({QueryName: queryName, limit: String(PAGE_SIZE), offset: String(offset), ...filters});
      const url = '/api/query?' + params;
      const started = performance.now();
      const response = await fetch(url, {credentials: 'same-origin', headers: {RequestVerificationToken: token, Accept: 'application/json'}});
      const ms = Math.round(performance.now() - started);
      const textBody = await response.text();
      let data = null;
      try { data = JSON.parse(textBody); } catch (_) { /* not JSON */ }
      pages.push({url, status: response.status, ms, count: data?.Count, totalCount: data?.TotalCount, hasNext: data?.HasNext, nextOffset: data?.NextOffset});
      if (!response.ok || !data) {
        return {ok: false, status: response.status, error: textBody.slice(0, 1000), rows, pages};
      }
      const items = data?.Items?.$values || [];
      if (page === 0) pages[0].rawFirstItem = items[0] ?? null;
      rows.push(...items.map(flatten));
      if (!data.HasNext || !items.length) break;
      offset = Number(data.NextOffset ?? offset + items.length);
    }
    return {ok: true, rows, pages};
  }

  const columnsOf = rows => [...new Set(rows.flatMap(row => Object.keys(row)))];

  function guessIdColumn(rows, columns) {
    const numeric = column => rows.length && rows.every(row => /^\d+$/.test(String(row[column] ?? '').trim()));
    return columns.find(column => /ordinal/i.test(column) && numeric(column))
      || columns.find(column => /(^|_)id$|id$/i.test(column) && numeric(column))
      || columns.find(numeric)
      || columns[0];
  }

  const result = {ranAt: new Date().toISOString(), page: location.pathname};

  // ── 1. Parent Tags ──────────────────────────────────────────
  console.groupCollapsed('%c[Tags probe] 1. ' + PARENT_QUERY, 'font-weight:bold');
  const parents = await readAll(PARENT_QUERY);
  result.parent = {query: PARENT_QUERY, ...parents, columns: columnsOf(parents.rows)};
  if (!parents.ok) {
    console.error('Parent Tags failed', parents.status, parents.error);
    console.groupEnd();
    window.__tagsProbe = result;
    return;
  }
  console.log('Columns:', result.parent.columns);
  console.log('Rows:', parents.rows.length, '· pages:', parents.pages);
  console.log('Raw first item (shape check):', parents.pages[0].rawFirstItem);
  console.table(parents.rows);
  console.groupEnd();

  // ── 2. Child Tags for those parents ─────────────────────────
  const parentKey = PARENT_KEY || guessIdColumn(parents.rows, result.parent.columns);
  let ids = [...new Set(parents.rows.map(row => String(row[parentKey] ?? '').trim()).filter(Boolean))];
  if (MAX_PARENTS) ids = ids.slice(0, MAX_PARENTS);
  const parameterValue = ids.map(id => '"' + id + '"').join(',');
  result.parentKey = parentKey;
  result.childParameter = {name: CHILD_PARAMETER, value: parameterValue, parents: ids.length};

  console.groupCollapsed('%c[Tags probe] 2. ' + CHILD_QUERY + ' · ' + CHILD_PARAMETER + ' = ' + ids.length + ' parents (from ' + parentKey + ')', 'font-weight:bold');
  const children = await readAll(CHILD_QUERY, {[CHILD_PARAMETER]: parameterValue});
  result.child = {query: CHILD_QUERY, ...children, columns: columnsOf(children.rows)};
  if (children.pages[0]?.url.length > 2000) {
    console.warn('The request address is ' + children.pages[0].url.length + ' characters. Long addresses can be cut off; set MAX_PARENTS or send fewer parents per call.');
  }
  if (!children.ok) console.error('Child Tags failed', children.status, children.error);
  console.log('Request:', children.pages[0]?.url);
  console.log('Columns:', result.child.columns);
  console.log('Rows:', children.rows.length, '· pages:', children.pages);
  console.log('Raw first item (shape check):', children.pages[0]?.rawFirstItem);
  console.table(children.rows);
  console.groupEnd();

  // ── 3. Nothing back: try one parent alone ───────────────────
  if (children.ok && !children.rows.length && ids.length) {
    console.groupCollapsed('%c[Tags probe] 3. No children for the list; trying each format with one parent', 'font-weight:bold');
    const one = ids[0];
    result.singleParentChecks = [];
    for (const value of ['"' + one + '"', one]) {
      const check = await readAll(CHILD_QUERY, {[CHILD_PARAMETER]: value});
      result.singleParentChecks.push({value, ok: check.ok, status: check.pages[0]?.status, rows: check.rows.length, url: check.pages[0]?.url});
      console.log(CHILD_PARAMETER + '=' + value + ' →', check.ok ? check.rows.length + ' rows' : 'HTTP ' + check.pages[0]?.status);
    }
    console.groupEnd();
  }

  // ── 4. Which child column points at the parent ──────────────
  const idSet = new Set(ids);
  const linkColumn = result.child.columns.find(column =>
    children.rows.length && children.rows.every(row => idSet.has(String(row[column] ?? '').trim())));
  result.childLinkColumn = linkColumn || null;

  const nameColumn = rows => columnsOf(rows).find(column => /name|description|tag/i.test(column) && rows.some(row => /\D/.test(String(row[column] ?? ''))));
  const parentName = nameColumn(parents.rows);
  const childName = nameColumn(children.rows);
  result.nameColumns = {parent: parentName || null, child: childName || null};

  if (linkColumn) {
    result.grouped = parents.rows
      .filter(row => idSet.has(String(row[parentKey] ?? '').trim()))
      .map(row => {
        const id = String(row[parentKey]).trim();
        const kids = children.rows.filter(child => String(child[linkColumn]).trim() === id);
        return {parent: id, name: parentName ? row[parentName] : undefined, children: kids.length, childNames: childName ? kids.map(kid => kid[childName]) : undefined};
      });
    console.groupCollapsed('%c[Tags probe] 4. Children per parent (child column ' + linkColumn + ')', 'font-weight:bold');
    console.table(result.grouped.map(({parent, name, children: count}) => ({parent, name, children: count})));
    console.groupEnd();
  } else if (children.rows.length) {
    console.warn('[Tags probe] No child column holds only the parent IDs sent, so children cannot be grouped. Check the Child Tags columns above.');
  }

  // ── Summary ─────────────────────────────────────────────────
  const summary = {
    parentRows: parents.rows.length,
    parentColumns: result.parent.columns.join(', '),
    parentKey,
    parentsSent: ids.length,
    childStatus: children.pages[0]?.status,
    childRows: children.rows.length,
    childColumns: result.child.columns.join(', '),
    childLinkColumn: result.childLinkColumn,
    parentNameColumn: result.nameColumns.parent,
    childNameColumn: result.nameColumns.child
  };
  result.summary = summary;
  window.__tagsProbe = result;
  console.log('%c[Tags probe] Summary', 'font-weight:bold');
  console.table(summary);

  try {
    if (typeof copy === 'function') {
      copy(JSON.stringify(result, null, 2));
      console.log('[Tags probe] Results copied to the clipboard (also in window.__tagsProbe).');
    } else {
      console.log('[Tags probe] Results are in window.__tagsProbe. Run copy(JSON.stringify(window.__tagsProbe, null, 2)) to copy them.');
    }
  } catch (_) {
    console.log('[Tags probe] Results are in window.__tagsProbe. Run copy(JSON.stringify(window.__tagsProbe, null, 2)) to copy them.');
  }
})();
