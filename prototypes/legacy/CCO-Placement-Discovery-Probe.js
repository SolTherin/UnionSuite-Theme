/*
 * Run in the published CCO test page's TOP FRAME console.
 * This diagnostic POST requests a different tab using the current form values.
 * It does not apply the response or navigate the visible page, but executes the
 * server page lifecycle. Use with no unsaved edits; reload after testing.
 * Change rootSelector for a different CCO. No configuration writes are made.
 */
(async () => {
  'use strict';

  const rootSelector = '#ste_container_ciDirectory';
  // __EVENTTARGET from the user's captured native POST on this test page.
  // For another placement, replace this with its captured __EVENTTARGET.
  const capturedEventTarget =
    'ctl01$TemplateBody$WebPartManager1$gwpciDirectory$ciDirectory$radTab_Top';
  if (window !== window.top) throw new Error('Run this in the top page frame.');

  const root = document.querySelector(rootSelector);
  const strip = root?.querySelector('.RadTabStrip');
  const form = strip?.closest('form');
  const control = strip && window.$find?.(strip.id);
  const selected = control?.get_selectedTab?.();
  if (!form || !control || !selected) {
    throw new Error('Open the published CCO page first; check rootSelector.');
  }

  const managers = [...form.elements].filter(el =>
    /(?:^|\$)ScriptManager\d*$/.test(el.name || '')
  );
  if (managers.length !== 1) {
    throw new Error('Could not identify one ScriptManager field.');
  }

  const tabCount = control.get_tabs().get_count();
  if (tabCount < 2) throw new Error('Discovery requires another tab.');
  const index = (selected.get_index() + 1) % tabCount;
  const nextTab = control.get_tabs().getTab(index);
  if (nextTab.get_enabled?.() === false || nextTab.get_visible?.() === false) {
    throw new Error('The next tab is disabled or hidden; select another starting tab.');
  }

  const managerName = managers[0].name;
  const stripStateField = document.getElementById(`${strip.id}_ClientState`);
  const multiPage = control.get_multiPage?.() || null;
  const multiPageElement = multiPage?.get_element?.() || root.querySelector('.RadMultiPage');
  const pageStateField = multiPageElement &&
    document.getElementById(`${multiPageElement.id}_ClientState`);
  if (!stripStateField?.name || !pageStateField?.name) {
    throw new Error('Could not locate both Telerik client-state fields.');
  }

  // Some Telerik versions expose neither a UniqueID getter nor a $-separated
  // state-field name. Use the observed POST target, not guessed underscore splits.
  const target = control.get_uniqueID?.() || capturedEventTarget;
  if (!target || target.replaceAll('$', '_') !== strip.id) {
    throw new Error('Server control ID does not match this tab strip. Update capturedEventTarget from its native POST.');
  }

  const body = new URLSearchParams();
  for (const [name, value] of new FormData(form)) {
    if (typeof value !== 'string') {
      throw new Error('The form contains a file input; use a page without uploads.');
    }
    body.append(name, value);
  }

  body.set(managerName, `${managerName}|${target}`);
  body.set('__EVENTTARGET', target);
  body.set('__EVENTARGUMENT', JSON.stringify({ type: 0, index: String(index) }));
  body.set('__ASYNCPOST', 'true');
  body.set('IsControlPostBack', '1');

  // Update request copies only; leave the actual hidden fields and controls alone.
  const stripState = JSON.parse(stripStateField.value || '{}');
  stripState.selectedIndexes = [String(index)];
  body.set(stripStateField.name, JSON.stringify(stripState));
  const pageState = JSON.parse(pageStateField.value || '{}');
  pageState.selectedIndex = index;
  body.set(pageStateField.name, JSON.stringify(pageState));

  const url = new URL(form.getAttribute('action') || location.href, location.href);
  url.hash = '';
  if (url.origin !== location.origin) throw new Error('Unexpected cross-origin action.');

  console.log('CCO probe request (state only):', {
    target,
    eventArgument: body.get('__EVENTARGUMENT'),
    stripState,
    pageState
  });

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'same-origin',
    redirect: 'follow',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Requested-With': 'XMLHttpRequest',
      'X-MicrosoftAjax': 'Delta=true'
    },
    body
  });
  const text = await response.text();

  function parseDelta(input) {
    const records = [];
    let position = 0;
    function field() {
      const end = input.indexOf('|', position);
      if (end < 0) throw new Error('Incomplete delta record');
      const value = input.slice(position, end);
      position = end + 1;
      return value;
    }
    while (position < input.length) {
      if (!input.slice(position).trim()) break;
      const lengthText = field();
      if (!/^\d+$/.test(lengthText)) throw new Error('Not a delta response');
      const length = Number(lengthText);
      const type = field();
      const id = field();
      const end = position + length;
      if (!Number.isSafeInteger(length) || end >= input.length || input[end] !== '|') {
        throw new Error('Invalid delta record length');
      }
      records.push({ type, id, content: input.slice(position, end) });
      position = end + 1;
    }
    return records;
  }

  let records = [];
  let parseError = null;
  try { records = parseDelta(text); }
  catch (error) { parseError = error.message; }

  const redirectRecord = records.find(r => r.type === 'pageRedirect');
  const errorRecord = records.find(r => r.type === 'error');
  let redirectUrl = null;
  if (redirectRecord) {
    let destination = redirectRecord.content;
    if (!/[/?]/.test(destination) && /%[0-9a-f]{2}/i.test(destination)) {
      destination = decodeURIComponent(destination);
    }
    redirectUrl = new URL(destination, url);
  } else if (response.redirected) {
    redirectUrl = new URL(response.url);
  }

  const candidates = redirectUrl
    ? [...redirectUrl.searchParams]
      .filter(([name]) => /^[0-9a-f]{12}$/i.test(name))
      .map(([name, value]) => ({ placementStub: name.toLowerCase(), selectedTab: value }))
    : [];

  console.log('Background CCO discovery:', {
    status: response.status,
    transportRedirected: response.redirected,
    ajaxRedirectFound: Boolean(redirectRecord),
    redirectUrl: redirectUrl?.href || null,
    ajaxError: errorRecord?.content || null,
    parseError,
    candidates
  });
  if (candidates.length) console.table(candidates);
  else console.log('No stub found. Response record types:', records.map(r => r.type));
})();
