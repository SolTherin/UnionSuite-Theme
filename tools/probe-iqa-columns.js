// Paste into the live iMIS page's browser console. Read-only: no refresh,
// requests, handler changes, or result-row values are collected.
(() => {
  const scope = ':is([data-us-iqa-native],.us-report,.SearchContactsClass):not(.us-report-no-styling) [data-gridid] .RadGrid > table.rgMasterTable';
  const round = n => Math.round(n * 100) / 100;
  const style = el => {
    if (!el) return null;
    const s = getComputedStyle(el), r = el.getBoundingClientRect();
    return {width: round(r.width), display: s.display, visibility: s.visibility,
      whiteSpace: s.whiteSpace, wordBreak: s.wordBreak, overflowWrap: s.overflowWrap,
      minWidth: s.minWidth, inlineWidth: el.style.width};
  };
  const css = {resizeRule: false, idRule: false, unreadableSheets: 0};
  function scan(rules) {
    for (const rule of rules) {
      if (rule.selectorText?.includes('.us-iqa-column-resizer')) css.resizeRule = true;
      if (rule.selectorText?.includes('[data-us-iqa-id-cell]')) css.idRule = true;
      if (rule.cssRules) scan(rule.cssRules);
    }
  }
  for (const sheet of document.styleSheets) { try { scan(sheet.cssRules); } catch { css.unreadableSheets++; } }
  const report = {
    adapterLoaded: typeof window.UnionSuiteIqaColumns?.refresh === 'function',
    adapterVersion: window.UnionSuiteIqaColumns?.version || 'unversioned (before hidden-column fix)',
    reportAdapterLoaded: typeof window.UnionSuiteIqaFilters?.refresh === 'function',
    readyState: document.readyState, insideFrame: window !== window.top,
    css,
    tables: Array.from(document.querySelectorAll('.rgMasterTable')).map((table, index) => {
      const grid = table.closest('.RadGrid');
      const headRows = Array.from(table.tHead?.rows || []);
      const headers = Array.from(headRows[0]?.cells || []);
      const rows = Array.from(table.tBodies).flatMap(b => Array.from(b.rows)).filter(r => r.matches('.rgRow,.rgAltRow'));
      const cols = Array.from(table.querySelectorAll(':scope > colgroup > col'));
      const columns = headers.map((h, i) => ({index: i, title: h.textContent.replace(/\s+/g, ' ').trim(),
        colSpan: h.colSpan, rowSpan: h.rowSpan, header: style(h),
        detectedAsId: /(^|[\s_-])ids?($|[\s_-])/i.test(h.textContent.trim()),
        idMarked: h.hasAttribute('data-us-iqa-id-cell'),
        resizeHandle: !!h.querySelector('.us-iqa-column-resizer'),
        resizeCursor: h.querySelector('.us-iqa-column-resizer') ? getComputedStyle(h.querySelector('.us-iqa-column-resizer')).cursor : null,
        firstCell: style(rows.find(r => r.cells.length === headers.length)?.cells[i])}));
      const blockers = [];
      if (!table.matches(scope)) blockers.push('Not matched by the column adapter selector');
      if (table.closest('.us-report-no-styling')) blockers.push('us-report-no-styling is present');
      if (headRows.length !== 1) blockers.push('Header must have exactly one row');
      if (!headers.length) blockers.push('No header cells');
      if (columns.length && columns.every(c => !c.header.width)) blockers.push('All headers have zero width: table is not measurable');
      else if (columns.some(c => !c.header.width) && !window.UnionSuiteIqaColumns?.version) blockers.push('Old adapter skips the whole table when a header is hidden; update shared JS');
      if (headers.some(h => h.colSpan !== 1 || h.rowSpan !== 1)) blockers.push('Spanning header cells');
      if (rows.some(r => r.cells.length !== headers.length || Array.from(r.cells).some(c => c.colSpan !== 1 || c.rowSpan !== 1))) blockers.push('Result row spans or cell count mismatch');
      if (cols.length && (cols.length !== headers.length || cols.some(c => c.span !== 1))) blockers.push('Colgroup mismatch or spanning col');
      if (grid?.querySelector('.rgResizeCol,[class*="rgResizeHandle"]')) blockers.push('Native resize marker detected');
      return {index, gridId: grid?.id, tableId: table.id,
        matchesAdapter: table.matches(scope), initialized: table.hasAttribute('data-us-iqa-column-table'),
        nativeWrapperDetected: !!table.closest('[data-us-iqa-native]'),
        tableLayout: getComputedStyle(table).tableLayout, table: style(table),
        headerRowCount: headRows.length, renderedRowCount: rows.length, colgroupColumns: cols.length,
        blockers, columns};
    })
  };
  console.log('IQA COLUMN PROBE — copy the JSON below');
  console.log(JSON.stringify(report, null, 2));
  return report;
})();
