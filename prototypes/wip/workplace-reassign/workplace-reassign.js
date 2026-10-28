/* US-REASSIGN — Confirm and Cancel on the reassign workplace screen
   (templates/Workplace-Reassign-Query-Template.html).

   Confirm sends the workplace (the button's data-workplace-id) and the new
   employer (data-to-id) to the AllocateToParent Elsa flow in CloudToolz, as
   the PartyId and ParentPartyId headers, and shows the flow's AsiSuccess or
   AsiError reply in the screen's result area. Cancel closes the iMIS popup.

   Both IDs come from the IQA row, so nothing is read from the page URL.
   Clicks are delegated from the document, so it works whenever the Query
   Template renders, and the guard stops a second copy attaching twice.

   Standalone: it needs no UnionSuite theme file, only the iMIS page fields
   (__RequestVerificationToken, __ClientContext). The busy spinner and the
   reply messages use theme class names (us-button-spinner, AsiSuccess,
   AsiError), so the theme styles them when it is loaded; the embed's own
   CSS styles them when it is not. */
(function () {
  'use strict';

  if (window.UnionSuiteReassign) return;
  window.UnionSuiteReassign = true;

  const CLOUDTOOLZ_QUERY = '$/ZENTSO/Security/CloudToolzUrl';
  const ENDPOINT = 'api/UnionTemplate/AllocateToParent/Allocate';
  const LOG_PREFIX = '[Reassign]';

  const log = (...args) => console.log(LOG_PREFIX, ...args);
  const warn = (...args) => console.warn(LOG_PREFIX, ...args);
  const logError = (...args) => console.error(LOG_PREFIX, ...args);

  // Slide an element in or out (height, padding and fade) on the theme's
  // timing, without needing the theme's own helper. The final state stays
  // in `hidden`. Instant with reduced motion.
  function fold(element, open) {
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !element.animate) {
      element.hidden = !open;
      return Promise.resolve();
    }

    element.hidden = false;
    const style = getComputedStyle(element);
    const shown = {
      height: element.offsetHeight + 'px',
      paddingTop: style.paddingTop,
      paddingBottom: style.paddingBottom,
      borderTopWidth: style.borderTopWidth,
      opacity: 1
    };
    const folded = { height: '0px', paddingTop: '0px', paddingBottom: '0px', borderTopWidth: '0px', opacity: 0 };

    element.style.overflow = 'hidden';
    const animation = element.animate(open ? [folded, shown] : [shown, folded], {
      duration: 220,
      easing: 'cubic-bezier(.2, 0, 0, 1)'
    });
    return animation.finished.then(() => {
      element.style.overflow = '';
      element.hidden = !open;
    });
  }

  function getToken() {
    const input = document.getElementById('__RequestVerificationToken') ||
      document.querySelector('input[name="__RequestVerificationToken"]');
    return input?.value || '';
  }

  function getClientContext() {
    try {
      return JSON.parse(document.getElementById('__ClientContext')?.value || '{}');
    } catch (err) {
      warn('Could not parse __ClientContext', err);
      return {};
    }
  }

  async function imisFetch(method, path, body, extraHeaders) {
    const headers = { Accept: 'application/json', RequestVerificationToken: getToken(), ...extraHeaders };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    const res = await fetch(location.origin + path, {
      method,
      credentials: 'same-origin',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      logError(method, path, 'failed', res.status, res.statusText, detail);
      throw new Error(method + ' ' + path + ' failed (HTTP ' + res.status + ')');
    }
    return res;
  }

  // 1. The CloudToolz base URL, from the first column of the IQA's first
  //    row. Asked once per page; a failure is not cached, so a retry asks
  //    again.
  let cloudToolzUrl = null;

  function getCloudToolzUrl() {
    cloudToolzUrl ??= (async () => {
      const res = await imisFetch('GET', '/api/query?QueryName=' + encodeURIComponent(CLOUDTOOLZ_QUERY) + '&limit=1',
        undefined, { 'X-TypeNameHandling': 'false' });
      const data = await res.json();
      const items = Array.isArray(data.Items) ? data.Items : data.Items?.$values ?? [];
      // Skip $type in case the server ignores X-TypeNameHandling.
      const value = Object.entries(items[0] || {})
        .find(([key, v]) => !key.startsWith('$') && typeof v === 'string' && v)?.[1];
      if (!value) throw new Error('CloudToolz URL not found (' + CLOUDTOOLZ_QUERY + ' returned no value)');
      log('CloudToolz URL:', value);
      return value.replace(/\/+$/, '');
    })().catch(err => {
      cloudToolzUrl = null;
      throw err;
    });
    return cloudToolzUrl;
  }

  // 2. Register a ZenToken in iMIS so CloudToolz can validate the caller.
  async function registerZenToken(token, ctx) {
    const prop = (Name, Value) => ({ $type: 'Asi.Soa.Core.DataContracts.GenericPropertyData,Asi.Contracts', Name, Value });
    await imisFetch('POST', '/api/ZenTokens', {
      $type: 'Asi.Soa.Core.DataContracts.GenericEntityData,Asi.Contracts',
      EntityTypeName: 'ZenTokens',
      Properties: {
        $type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection,Asi.Contracts',
        $values: [
          prop('PartyId', ctx.loggedInPartyId),
          prop('ID', ctx.loggedInPartyId),
          prop('SelectedPartyId', ctx.selectedPartyId),
          prop('RequestVerificationToken', token),
          prop('UtcUnixTimeStamp', Date.now())
        ]
      }
    });
  }

  // 3. POST to the CloudToolz flow.
  async function postToCloudToolz(endpointPath, extraHeaders) {
    const token = getToken();
    if (!token) throw new Error('No RequestVerificationToken: not on an authenticated iMIS page');

    const ctx = getClientContext();
    const base = await getCloudToolzUrl();
    await registerZenToken(token, ctx);

    const url = base + '/' + endpointPath.replace(/^\/+/, '');
    log('POST', url, extraHeaders);
    return fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        RequestVerificationToken: token,
        SelectedPartyId: String(ctx.selectedPartyId ?? ''),
        LoggedInPartyId: String(ctx.loggedInPartyId ?? ''),
        WebsiteKey: typeof window.gWebsiteKey === 'string' ? window.gWebsiteKey : '',
        ...extraHeaders
      },
      body: '{}'
    });
  }

  // The flow replies with an AsiSuccess / AsiError snippet, sent as a JSON
  // string: "<div class=\"AsiSuccess …\">…</div>", quotes escaped. Decode
  // it; a plain HTML reply is used as it is.
  async function readReply(res) {
    const text = (await res.text()).trim();
    if (!text.startsWith('"')) return text;
    try {
      const decoded = JSON.parse(text);
      return typeof decoded === 'string' ? decoded.trim() : text;
    } catch {
      return text;
    }
  }

  function getResult(screen) {
    let result = screen.querySelector('.us-reassign__result');
    if (!result) {
      // An editor can drop the template's empty result box; put it back.
      warn('No .us-reassign__result in the template: adding one');
      result = document.createElement('div');
      result.className = 'us-reassign__result';
      result.setAttribute('role', 'status');
      result.hidden = true;
      screen.append(result);
    }
    return result;
  }

  // The reply is trusted markup from our own flow. Messages written here
  // are text. Returns whether anything visible landed: innerText leaves out
  // what the page's CSS hides, as well as empty or comment-only replies.
  function showResult(screen, html) {
    const result = getResult(screen);
    result.innerHTML = html;
    if (result.hidden) fold(result, true);
    return result.innerText.trim() !== '';
  }

  function showMessage(screen, className, text) {
    const message = document.createElement('div');
    message.className = className;
    message.textContent = text;
    showResult(screen, message.outerHTML);
  }

  // Close the iMIS (Telerik RadWindow) popup this page is shown in: its
  // API first, then the close button of the RadWindow hosting this frame,
  // then a close button in this page, then the parent page's only one.
  function closePopup() {
    const selector = '.rwCloseButton';

    try {
      const radWindow = window.radWindow || window.frameElement?.radWindow;
      if (radWindow?.close) {
        radWindow.close();
        return true;
      }
    } catch (err) {
      warn('radWindow.close() failed', err);
    }

    const candidates = [
      () => window.frameElement?.closest('.RadWindow, .rwWindow, [class*="RadWindow"]')?.querySelector(selector),
      () => document.querySelector(selector),
      () => {
        const buttons = window.parent !== window ? window.parent.document.querySelectorAll(selector) : [];
        if (buttons.length > 1) warn('Several popups open: not sure which to close');
        return buttons.length === 1 ? buttons[0] : null;
      }
    ];

    for (const find of candidates) {
      try {
        const button = find();
        if (button) {
          pressButton(button);
          return true;
        }
      } catch (err) {
        warn('Cannot reach the popup frame', err);
      }
    }

    logError('Could not close the popup: no radWindow or ' + selector + ' found');
    return false;
  }

  // Telerik buttons often listen for mousedown/mouseup rather than click.
  function pressButton(button) {
    const view = button.ownerDocument.defaultView;
    for (const type of ['mousedown', 'mouseup', 'click']) {
      button.dispatchEvent(new view.MouseEvent(type, { bubbles: true, cancelable: true, view, button: 0 }));
    }
  }

  // The theme's approved button busy state: a spinner in the button, which
  // stays disabled (with Cancel) until the flow answers.
  function setBusy(screen, confirm, busy) {
    screen.querySelectorAll('.us-reassign__actions button').forEach(button => { button.disabled = busy; });
    confirm.setAttribute('aria-busy', String(busy));
    let spinner = confirm.querySelector('.us-button-spinner');
    if (busy && !spinner) {
      spinner = document.createElement('span');
      spinner.className = 'us-button-spinner';
      spinner.setAttribute('aria-hidden', 'true');
      confirm.prepend(spinner);
    }
    if (spinner) spinner.hidden = !busy;
  }

  // An unfilled placeholder means the IQA does not select that alias.
  const filled = value => Boolean(value) && !value.includes('{#query.');

  async function confirmReassign(confirm) {
    const screen = confirm.closest('.us-reassign');
    if (confirm.getAttribute('aria-busy') === 'true') return;
    if (screen.dataset.same === '1') return;

    const workplaceId = confirm.dataset.workplaceId || '';
    const employerId = confirm.dataset.toId || '';
    const employerName = screen.querySelector('.us-reassign__employer--to .us-reassign__name')?.textContent.trim();
    log('Confirm', { workplaceId, employerId });

    if (!filled(workplaceId) || !filled(employerId)) {
      logError('Missing IDs: workplace', workplaceId || '(empty)', 'employer', employerId || '(empty)');
      showMessage(screen, 'AsiError AsiErrorIcon', 'The workplace or the new employer is missing, so nothing was changed.');
      return;
    }

    setBusy(screen, confirm, true);
    try {
      const res = await postToCloudToolz(ENDPOINT, { PartyId: workplaceId, ParentPartyId: employerId });
      const html = await readReply(res);
      // The flow can answer 200 with an AsiError snippet: that is a failure
      // too, and the buttons stay for another try.
      const succeeded = res.ok && !/\bAsiError\b/.test(html);

      if (succeeded) log('Flow replied', res.status, html || '(empty)');
      else logError('Flow failed: HTTP', res.status, res.statusText, html);

      // Always say what happened, even when the reply shows nothing.
      if (!showResult(screen, html)) {
        if (succeeded) showMessage(screen, 'AsiSuccess AsiSuccessIcon', 'Workplace reassigned to ' + (employerName || 'the new employer') + '.');
        else showMessage(screen, 'AsiError AsiErrorIcon', 'The reassignment failed (HTTP ' + res.status + ').');
      }

      // Done: remove Confirm and Cancel so it cannot be sent twice.
      if (succeeded) {
        fold(screen.querySelector('.us-reassign__actions'), false);
        return;
      }
    } catch (err) {
      logError('Reassign failed:', err);
      showMessage(screen, 'AsiError AsiErrorIcon', 'Could not reassign the workplace: ' + err.message);
    }
    setBusy(screen, confirm, false);
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('.us-reassign__confirm, .us-reassign__cancel');
    if (!button) return;
    event.preventDefault();
    if (button.classList.contains('us-reassign__cancel')) closePopup();
    else confirmReassign(button);
  });
})();
