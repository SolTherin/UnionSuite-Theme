/* Native partial-postback tab switching trial — 23 September 2026.
 *
 * v0.1.0 showed that fetched Cases content can use iMIS's own partial
 * postbacks once the page's form state describes the fetched page. v0.2.0
 * intercepts every CCO tab click and applies the same approach to any tab:
 *
 *   1. fetch the tab's page (the URL the native redirect would load);
 *   2. dispose the leaving tab's components and clear its view;
 *   3. insert the fetched view and switch page-level form state to it;
 *   4. register the fetched page's update panels with PageRequestManager;
 *   5. run the view's own inline scripts, then the server's $create blocks
 *      for controls inside the view (outside report listers);
 *   6. refresh each report lister natively, so iMIS initializes its grid.
 *
 * v0.3.0: natively a tab's controls are never disposed without a page reload,
 * and some leave Sys.Application load handlers behind when disposed. Handlers
 * that a view's scripts and $create blocks register are now tracked and
 * removed when the view is left. One lister refresh updates every lister on
 * the tab, so already initialized listers are skipped.
 *
 * v0.4.0: loading indicators replicate the custom CCO iPart. The clicked tab
 * is selected immediately and shows the theme's tab spinner; the CCO content
 * is dimmed under the theme's section spinner until the tab is ready.
 *
 * v0.6.0: CCOs nested inside a tab are switched the same way. A nested CCO's
 * URL key is unknown in advance, so its first switch asks the server, as a
 * native tab click does, and reads the key from the redirect it returns.
 *
 * v0.5.0: the content is fully covered while loading. The spinner stays in view
 * when the page is scrolled, and the theme's report-refresh overlay is hidden
 * during the trial's internal refreshes. Page-level grid script managers
 * (window['<id>_jsmanager']) are replayed for grids outside listers.
 *
 * Start on a freshly reloaded account page with Easy Edit off, run
 * usCcoPartial.start(), then click tabs. Reload the page to end the trial.
 * Reports omit ViewState, tokens, row data and URL values other than the tab.
 */
(() => {
  const version = '0.6.1-trial';
  // Pasting the script again must not leave an earlier copy handling tab
  // clicks: its capture handler would run first and stop this one's.
  const replaced = window.usCcoPartial?.version || null;
  if (typeof window.usCcoPartial?.stop === 'function') window.usCcoPartial.stop();
  const base = 'ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_';
  const tabKey = 'b511e4d055d8';
  const ids = { tabStrip: base + 'radTab_Top', multiPage: base + 'radPage' };

  // Page-level state that must describe the displayed tab for server postbacks.
  // Script/stylesheet manager fields stay live: they describe what this browser
  // has already loaded, so the server sends any missing resources.
  const stateFields = ['__VIEWSTATE', '__VIEWSTATEGENERATOR', '__EVENTVALIDATION', '__RequestVerificationToken', 'PageInstanceKey'];
  const log = [];
  // tabStrip, multiPage and outer describe the account page's own CCO.
  let prm = null, form = null, tabStrip = null, multiPage = null, outer = null;
  // URL query key selecting each CCO's tab, by tab strip ID.
  const urlKeys = new Map([[ids.tabStrip, tabKey]]);
  let running = false, busy = false, hooked = false, pendingEnd = null;
  // Times the page was restored from the back-forward cache while running.
  let restorations = 0;
  // Event handlers registered while each view was initialized, by view ID.
  const viewHandlers = new Map();

  const elapsed = () => Math.round(performance.now());
  const brief = value => String(value && value.message || value).slice(0, 200);
  const typeName = component => {
    try {
      return typeof component.getType === 'function' ? component.getType().getName() : component.constructor?.name || 'unknown';
    } catch {
      return 'unknown';
    }
  };

  // ---------------------------------------------------------------------------
  // Reporting

  // Entries of an MS AJAX delta: "length|type|id|content|" repeated.
  function deltaEntries(text) {
    const entries = [];
    let index = 0;
    while (index < text.length) {
      const lengthEnd = text.indexOf('|', index);
      const length = Number.parseInt(text.slice(index, lengthEnd), 10);
      if (lengthEnd < 0 || Number.isNaN(length)) {
        entries.push({ type: 'unparsed', id: '', content: '' });
        break;
      }
      const typeEnd = text.indexOf('|', lengthEnd + 1);
      const idEnd = text.indexOf('|', typeEnd + 1);
      entries.push({ type: text.slice(lengthEnd + 1, typeEnd), id: text.slice(typeEnd + 1, idEnd), content: text.substr(idEnd + 1, length) });
      index = idEnd + 1 + length + 1;
    }
    return entries;
  }

  // Summarize a delta without its content.
  function deltaSummary(text) {
    const summary = { updatedPanels: [], counts: {}, redirect: null, error: null };
    for (const { type, id, content } of deltaEntries(text)) {
      summary.counts[type] = (summary.counts[type] || 0) + 1;
      if (type === 'updatePanel') summary.updatedPanels.push(id);
      if (type === 'error') summary.error = { status: id, message: content.slice(0, 300) };
      if (type === 'pageRedirect') {
        try {
          const target = new URL(decodeURIComponent(content), location.href);
          summary.redirect = { path: target.pathname, tab: target.searchParams.get(tabKey), parameters: [...target.searchParams.keys()] };
        } catch {
          summary.redirect = { path: 'unparsed' };
        }
      }
    }
    return summary;
  }

  function isPartialRequest(request) {
    return request.get_headers()['X-MicrosoftAjax'] === 'Delta=true';
  }

  function hook() {
    if (hooked) return;
    hooked = true;
    Sys.Net.WebRequestManager.add_invokingRequest((sender, args) => {
      const request = args.get_webRequest();
      if (!isPartialRequest(request)) return;
      const body = new URLSearchParams(request.get_body() || '');
      log.push({
        event: 'request',
        at: elapsed(),
        urlTab: new URL(request.get_url(), location.href).searchParams.get(tabKey),
        panelAndTarget: body.get('ctl01$ScriptManager1'),
        eventTarget: body.get('__EVENTTARGET'),
        eventArgument: body.get('__EVENTARGUMENT'),
        tabClientState: body.get(ids.tabStrip + '_ClientState'),
        viewStatePosted: body.has('__VIEWSTATE')
      });
    });
    Sys.Net.WebRequestManager.add_completedRequest(executor => {
      const request = executor.get_webRequest();
      if (!isPartialRequest(request)) return;
      const available = executor.get_responseAvailable();
      log.push({
        event: 'response',
        at: elapsed(),
        status: available ? executor.get_statusCode() : null,
        timedOut: executor.get_timedOut(),
        aborted: executor.get_aborted(),
        delta: available ? deltaSummary(executor.get_responseData()) : null
      });
    });
    prm.add_endRequest((sender, args) => {
      const error = args.get_error();
      // Record the failure here instead of letting it surface as an alert.
      if (error) args.set_errorHandled(true);
      log.push({ event: 'end', at: elapsed(), error: error ? error.name + ': ' + error.message : null });
      if (pendingEnd) {
        const resolve = pendingEnd;
        pendingEnd = null;
        resolve(error);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Tab and view helpers

  // A CCO is a tab strip and multipage sharing an ID prefix. A tab's view can
  // contain another CCO; each has its own views, links and URL key.
  function ccoFor(strip) {
    const prefix = strip.id.slice(0, -'radTab_Top'.length);
    const pages = document.getElementById(prefix + 'radPage');
    return pages ? { prefix, strip, multiPage: pages, nested: strip !== tabStrip } : null;
  }

  const views = cco => [...cco.multiPage.children].filter(view => view.classList.contains('rmpView'));
  const tabLinks = cco => [...cco.strip.querySelectorAll('a.rtsLink')];
  const displayedIndex = cco => views(cco).findIndex(view => !view.classList.contains('rmpHidden'));
  const tabValue = (cco, index) => views(cco)[index]?.id.match(/_Page_(\d+)$/)?.[1] || null;
  const caption = (cco, index) => tabLinks(cco)[index]?.textContent.trim() || String(index);

  function tabUrl(key, value) {
    const url = new URL(location.href);
    url.hash = '';
    url.searchParams.set(key, value);
    return url;
  }

  function setTabAppearance(cco, index) {
    tabLinks(cco).forEach((link, position) => {
      link.classList.toggle('rtsSelected', position === index);
      link.classList.toggle('rtsBefore', position === index - 1);
      link.classList.toggle('rtsAfter', position === index + 1);
    });
  }

  function placeholder() {
    const info = document.createElement('span');
    info.className = 'Info';
    info.textContent = 'Loading...';
    return info;
  }

  // ---------------------------------------------------------------------------
  // Loading indicators

  // Layout is set directly on the elements. On the live page an injected
  // <style> element did not take effect (the cover rendered unstyled below the
  // content), so nothing here depends on one. The cover is opaque and carries
  // the theme's section spinner 180 px down, as in the custom CCO iPart, kept
  // in view when the page is scrolled. The spinner, tab spinner and status
  // classes come from the installed theme.
  const overlayStyle = {
    position: 'absolute',
    inset: '0',
    zIndex: '1000',
    background: 'var(--bg-surface, #fff)',
    pointerEvents: 'none'
  };
  const loaderStyle = {
    display: 'block',
    position: 'sticky',
    top: 'min(180px, calc(50vh - 24px))',
    margin: '180px auto 0'
  };
  const statusStyle = {
    position: 'absolute',
    width: '1px',
    height: '1px',
    margin: '-1px',
    padding: '0',
    border: '0',
    clipPath: 'inset(50%)',
    overflow: 'hidden',
    whiteSpace: 'nowrap'
  };
  // Applied to the CCO multipage while a switch runs; previous values restored.
  // Isolation keeps the content's own stacking below the cover.
  const busyStyle = { position: 'relative', isolation: 'isolate', pointerEvents: 'none' };
  const loadingStyle = { minHeight: '260px' };
  // The theme's report-refresh overlays react to the trial's internal lister
  // refreshes; they are hidden while a switch runs.
  const themeOverlaySelector = '.us-iqa-refresh-overlay, .us-iqa-find-overlay, .us-iqa-refresh-status:not(.us-cco-partial__status)';

  function applyStyle(element, style) {
    const previous = {};
    for (const [name, value] of Object.entries(style)) {
      previous[name] = element.style[name];
      element.style[name] = value;
    }
    return () => Object.assign(element.style, previous);
  }

  // Diagnostic: whether an injected <style> element applies on this page.
  function styleElementsApply() {
    const style = document.createElement('style');
    style.textContent = '#us-cco-partial-probe { width: 7px !important; }';
    const probe = document.createElement('span');
    probe.id = 'us-cco-partial-probe';
    probe.style.cssText = 'position:absolute;display:block;visibility:hidden';
    document.head.append(style);
    document.body.append(probe);
    const applied = getComputedStyle(probe).width === '7px';
    probe.remove();
    style.remove();
    return applied;
  }

  // Report whether the theme's spinner styles are present on this page.
  function themeStyles() {
    const probe = className => {
      const node = document.createElement('span');
      node.className = className;
      node.style.position = 'absolute';
      node.style.visibility = 'hidden';
      tabStrip.append(node);
      const animated = getComputedStyle(node).animationName !== 'none';
      node.remove();
      return animated;
    };
    return {
      sectionSpinner: probe('section-loader-spinning-circles'),
      tabSpinner: probe('us-tab-loading-spinner')
    };
  }

  const describe = node => node ? node.tagName.toLowerCase() + (node.id ? '#' + node.id : '') + [...node.classList].slice(0, 2).map(name => '.' + name).join('') : null;

  // Same appearance and 150 ms delay as the theme's native tab indicator, with
  // independent ownership: the trial's own lister postbacks would otherwise
  // clear the theme's indicator. Also covers the CCO content with the theme's
  // section spinner, and hides native update-progress images the trial's
  // internal refreshes would show.
  function indicate(cco, link, label) {
    const multiPage = cco.multiPage;
    const spinner = document.createElement('span');
    spinner.className = 'us-tab-loading-spinner';
    spinner.setAttribute('aria-hidden', 'true');
    const overlay = document.createElement('div');
    overlay.className = 'us-cco-partial__overlay';
    overlay.setAttribute('aria-hidden', 'true');
    applyStyle(overlay, overlayStyle);
    const loader = document.createElement('span');
    loader.className = 'section-loader-spinning-circles';
    applyStyle(loader, loaderStyle);
    overlay.append(loader);
    const status = document.createElement('span');
    status.className = 'us-iqa-refresh-status us-cco-partial__status';
    status.setAttribute('role', 'status');
    applyStyle(status, statusStyle);
    const previousBusy = link.getAttribute('aria-busy');
    const replaced = [], restores = [];
    // Diagnostic: whether the spinner was on screen and on top when shown.
    let sample = null;
    link.setAttribute('aria-busy', 'true');
    multiPage.setAttribute('aria-busy', 'true');
    restores.push(applyStyle(multiPage, busyStyle));
    // The theme appends its report-refresh overlays to the body.
    const hidden = new Map();
    const hideThemeOverlays = () => {
      for (const node of document.querySelectorAll(themeOverlaySelector)) {
        if (!hidden.has(node)) hidden.set(node, node.style.display);
        node.style.setProperty('display', 'none', 'important');
      }
    };
    const observer = new MutationObserver(hideThemeOverlays);
    observer.observe(document.body, { childList: true });
    const timer = setTimeout(() => {
      link.setAttribute('data-us-tab-loading', '');
      link.append(spinner);
      restores.push(applyStyle(multiPage, loadingStyle));
      multiPage.append(overlay);
      document.body.append(status);
      status.textContent = 'Loading ' + label;
      requestAnimationFrame(() => {
        const box = loader.getBoundingClientRect(), area = multiPage.getBoundingClientRect();
        const x = box.left + box.width / 2, y = box.top + box.height / 2;
        overlay.style.pointerEvents = 'auto';
        const top = y >= 0 && y < innerHeight ? document.elementFromPoint(x, y) : null;
        overlay.style.pointerEvents = 'none';
        sample = {
          inViewport: y >= 0 && y < innerHeight,
          onTop: !!top && overlay.contains(top),
          topElement: describe(top),
          insideContent: box.top >= area.top && box.bottom <= area.bottom,
          overlayPosition: getComputedStyle(overlay).position,
          // Whether the inline layout is on the elements, and the computed result.
          overlayInline: overlay.style.position,
          loaderPosition: getComputedStyle(loader).position,
          contentPosition: getComputedStyle(multiPage).position,
          restoredFromHistory: restorations > 0
        };
      });
    }, 150);
    return {
      get sample() {
        return sample;
      },
      suppressProgress(view) {
        for (const progress of view.querySelectorAll('[id$="_UpdateProgress1"]:not([data-us-iqa-progress-replaced])')) {
          progress.setAttribute('data-us-iqa-progress-replaced', '');
          // The theme rule for this marker may not apply either.
          replaced.push([progress, progress.style.display]);
          progress.style.setProperty('display', 'none', 'important');
        }
      },
      clear() {
        clearTimeout(timer);
        observer.disconnect();
        spinner.remove();
        overlay.remove();
        status.remove();
        for (const [node, display] of hidden) {
          node.style.removeProperty('display');
          if (display) node.style.display = display;
        }
        link.removeAttribute('data-us-tab-loading');
        if (previousBusy === null) link.removeAttribute('aria-busy');
        else link.setAttribute('aria-busy', previousBusy);
        multiPage.removeAttribute('aria-busy');
        restores.reverse().forEach(restore => restore());
        for (const [progress, display] of replaced) {
          progress.removeAttribute('data-us-iqa-progress-replaced');
          progress.style.removeProperty('display');
          if (display) progress.style.display = display;
        }
      }
    };
  }

  // Dispose components inside a view before its markup is discarded, the same
  // way PageRequestManager does before replacing an update panel.
  function disposeTree(element) {
    const before = Sys.Application.getComponents().length;
    if (typeof prm._destroyTree === 'function') prm._destroyTree(element);
    for (const component of Sys.Application.getComponents()) {
      const node = typeof component.get_element === 'function' ? component.get_element() : null;
      if (node && element.contains(node)) component.dispose();
    }
    return before - Sys.Application.getComponents().length;
  }

  // ---------------------------------------------------------------------------
  // Form state and PageRequestManager registration

  function setField(name, source) {
    const live = [...form.querySelectorAll(`input[name="${name}"]`)];
    if (source && live.length) {
      live.forEach(input => { input.value = source.value; });
      return 'changed';
    }
    if (source) {
      const input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      input.id = source.id;
      input.value = source.value;
      form.append(input);
      return 'added';
    }
    if (live.length) {
      live.forEach(input => input.remove());
      return 'removed';
    }
    return 'absent';
  }

  function switchFormState(fetchedForm, cco, index) {
    const fields = {};
    for (const name of stateFields) {
      fields[name] = setField(name, fetchedForm.querySelector(`input[name="${name}"]`));
    }
    const tabState = form.querySelector(`input[name="${cco.strip.id}_ClientState"]`);
    if (tabState) tabState.value = JSON.stringify({ selectedIndexes: [String(index)], logEntries: [], scrollState: {} });
    const pageState = form.querySelector(`input[name="${cco.multiPage.id}_ClientState"]`);
    if (pageState) pageState.value = '';
    form.setAttribute('action', fetchedForm.getAttribute('action'));
    // Keep PageRequestManager from treating the new action as a cross-page post.
    form._initialAction = form.action;
    return fields;
  }

  // Read the fetched page's PageRequestManager._initialize(...) arrays.
  function parseInitialize(doc) {
    const script = [...doc.scripts].find(node => node.textContent.includes('PageRequestManager._initialize('));
    const call = script?.textContent.match(/PageRequestManager\._initialize\(([\s\S]*?)\);/)?.[1];
    if (!call) return null;
    const arrays = [...call.matchAll(/\[([^\]]*)\]/g)].map(match => [...match[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map(item => item[1]));
    const timeout = Number(call.slice(call.lastIndexOf(']') + 1).match(/\d+/)?.[0] || 90);
    return arrays.length === 3 ? { panels: arrays[0], async: arrays[1], postBack: arrays[2], timeout } : null;
  }

  // Arrays use the ASP.NET 4 format: server ID then client ID ('' = derived);
  // update panel server IDs carry a 't'/'f' children-as-triggers prefix.
  function registerPanels(parsed) {
    const pairs = list => list.filter((item, position) => position % 2 === 0).map((id, position) => ({ id, client: list[position * 2 + 1] }));
    const clientId = id => typeof prm._uniqueIDToClientID === 'function' ? prm._uniqueIDToClientID(id) : id.replaceAll('$', '_');
    const panels = pairs(parsed.panels).map(({ id, client }) => ({ id: id.slice(1), client: client || clientId(id.slice(1)), triggers: id.charAt(0) === 't' }));
    const expected = panels.map(panel => panel.id);
    if (typeof prm._updateControls === 'function') {
      prm._updateControls(parsed.panels, parsed.async, parsed.postBack, parsed.timeout, true);
      if (JSON.stringify(prm._updatePanelIDs) === JSON.stringify(expected)) return { path: 'native', panels: expected.length };
    }
    prm._updatePanelIDs = expected;
    prm._updatePanelClientIDs = panels.map(panel => panel.client);
    prm._updatePanelHasChildrenAsTriggers = panels.map(panel => panel.triggers);
    prm._asyncPostBackControlIDs = pairs(parsed.async).map(item => item.id);
    prm._asyncPostBackControlClientIDs = pairs(parsed.async).map(item => item.client || clientId(item.id));
    prm._postBackControlIDs = pairs(parsed.postBack).map(item => item.id);
    prm._postBackControlClientIDs = pairs(parsed.postBack).map(item => item.client || clientId(item.id));
    return { path: 'manual', panels: expected.length };
  }

  // ---------------------------------------------------------------------------
  // Initialization of the inserted view

  // Execute server-provided script text in global scope, as the page would,
  // capturing errors without changing its semantics.
  function execute(code) {
    const errors = [];
    const capture = event => {
      errors.push(brief(event.error || event.message));
      event.preventDefault();
    };
    window.addEventListener('error', capture);
    const script = document.createElement('script');
    script.textContent = code;
    document.head.append(script);
    script.remove();
    window.removeEventListener('error', capture);
    return errors;
  }

  function loadScript(src) {
    return new Promise(resolve => {
      const script = document.createElement('script');
      const done = result => { clearTimeout(timer); resolve(result); };
      const timer = setTimeout(() => done('timeout'), 15000);
      script.src = src;
      script.onload = () => done('loaded');
      script.onerror = () => done('failed');
      document.head.append(script);
    });
  }

  // Only types the browser itself would execute; JSON and template blocks stay inert.
  const isJavaScript = script => !script.type || /^(?:text|application)\/(?:x-)?(?:java|ecma)script$|^text\/jscript$/i.test(script.type.trim());

  async function runViewScripts(scripts) {
    const result = { inline: 0, loaded: 0, present: 0, skipped: 0, errors: [] };
    const present = new Set([...document.scripts].map(node => node.src).filter(Boolean));
    for (const script of scripts) {
      if (!isJavaScript(script)) {
        result.skipped++;
      } else if (script.src) {
        const src = new URL(script.getAttribute('src'), location.href).href;
        if (present.has(src)) { result.present++; continue; }
        const status = await loadScript(src);
        present.add(src);
        if (status === 'loaded') result.loaded++;
        else result.errors.push({ script: new URL(src).pathname, message: status });
      } else {
        result.inline++;
        for (const message of execute(script.textContent)) result.errors.push({ script: 'inline ' + result.inline, message });
      }
    }
    return result;
  }

  // Server $create blocks: Sys.Application.add_init(function() { $create(...$get("id")); });
  // A match may not run into the next add_init block.
  const createPattern = /Sys\.Application\.add_init\(function\(\)\s*\{\s*(\$create\((?:(?!Sys\.Application\.add_init)[\s\S])*?\$get\("([^"]+)"\)\))\s*;\s*\}\);/g;

  function createBlocks(doc, fetchedView) {
    const blocks = [];
    for (const script of doc.scripts) {
      if (fetchedView.contains(script)) continue;
      for (const match of script.textContent.matchAll(createPattern)) {
        blocks.push({ code: match[1], target: match[2], type: match[1].match(/^\$create\(([\w$.]+)/)?.[1] || 'unknown' });
      }
    }
    return blocks;
  }

  // Page-level script managers, emitted outside the $create blocks, e.g.
  // window['<gridId>_jsmanager']=new Asi_Web_BusinessDataGrid2({...});
  // A grid's $create events reference its manager, so it must exist first.
  const managerPattern = /window\[\s*'([\w$]+)_jsmanager'\s*\]\s*=\s*(new\s+[\w$.]+\s*)\(/g;

  // Index of the parenthesis closing the call opened at text[open].
  function callEnd(text, open) {
    let depth = 0, quote = null;
    for (let index = open; index < text.length; index++) {
      const char = text[index];
      if (quote) {
        if (char === '\\') index++;
        else if (char === quote) quote = null;
      } else if (char === '"' || char === "'" || char === '`') {
        quote = char;
      } else if (char === '(') {
        depth++;
      } else if (char === ')' && --depth === 0) {
        return index;
      }
    }
    return -1;
  }

  function managerStatements(doc, fetchedView) {
    const statements = [];
    for (const script of doc.scripts) {
      if (fetchedView.contains(script)) continue;
      const text = script.textContent;
      for (const match of text.matchAll(managerPattern)) {
        const open = match.index + match[0].length - 1;
        const end = callEnd(text, open);
        if (end < 0) continue;
        statements.push({
          owner: match[1],
          type: match[2].replace(/^new\s+/, '').trim(),
          code: `window['${match[1]}_jsmanager'] = ${match[2]}${text.slice(open, end + 1)};`
        });
      }
    }
    return statements;
  }

  // Replay managers whose owning element is in the view, outside listers
  // (native lister refreshes emit their own).
  function replayManagers(statements, view, listers) {
    const result = { run: 0, errors: [] };
    for (const statement of statements) {
      const element = document.getElementById(statement.owner);
      if (!element || !view.contains(element) || listers.some(lister => lister.contains(element))) continue;
      result.run++;
      for (const message of execute(statement.code)) {
        result.errors.push({ type: statement.type, owner: statement.owner, message });
      }
    }
    return result;
  }

  function replayCreates(blocks, view, listers) {
    const result = { run: 0, skippedInListers: 0, errors: [] };
    for (const block of blocks) {
      const element = document.getElementById(block.target);
      if (!element || !view.contains(element)) continue;
      if (listers.some(lister => lister.contains(element))) { result.skippedInListers++; continue; }
      if ($find(block.target)) continue;
      result.run++;
      for (const message of execute('Sys.Application.add_init(function() {\n' + block.code + ';\n});')) {
        result.errors.push({ type: block.type, target: block.target, message });
      }
    }
    return result;
  }

  // Resolves on endRequest. If a page script throws while PageRequestManager
  // is completing the update, endRequest never fires; report that instead of
  // waiting for the full timeout.
  function nativePostBack(target) {
    return new Promise(resolve => {
      let done = false, started = false, idleSince = 0;
      const finish = result => {
        if (done) return;
        done = true;
        clearTimeout(timer);
        clearInterval(poll);
        if (pendingEnd === onEnd) pendingEnd = null;
        resolve(result);
      };
      const onEnd = error => finish(error ? brief(error) : null);
      const timer = setTimeout(() => finish('timeout'), 15000);
      const poll = setInterval(() => {
        if (prm.get_isInAsyncPostBack()) {
          started = true;
          idleSince = 0;
        } else if (started) {
          idleSince = idleSince || performance.now();
          if (performance.now() - idleSince > 700) finish('endRequest was not raised (page script error?)');
        }
      }, 200);
      pendingEnd = onEnd;
      window.__doPostBack(target, '');
    });
  }

  const gridReady = lister => {
    const grid = lister.querySelector('.RadGrid[id]');
    return !!(grid && $find(grid.id));
  };

  // Each report lister has a hidden native refresh button inside its update
  // panel; its partial response initializes the grid with iMIS's own scripts.
  // One refresh can update every lister on the tab, so skip those already done.
  async function refreshListers(listers) {
    const results = [];
    for (const lister of listers) {
      if (gridReady(lister)) {
        results.push({ lister: lister.id, ms: 0, error: null, gridRegistered: true, skipped: 'already initialized' });
        continue;
      }
      const button = lister.querySelector('input[id$="_ResultsGrid_RefreshButton"]');
      const began = performance.now();
      const error = await nativePostBack(button.name);
      results.push({ lister: lister.id, ms: Math.round(performance.now() - began), error, gridRegistered: gridReady(lister) });
    }
    return results;
  }

  function uninitialized(view) {
    return [...view.querySelectorAll('[id][class*="Rad"]')]
      .filter(node => /(^|\s)Rad[A-Z]\w*(\s|$)/.test(node.className) && !/(^|\s)Rad\w+(DropDown|Slide)\b/.test(node.className) && !$find(node.id))
      // A RadAjaxPanel wrapper holds the registered component on its child.
      .filter(node => !(node.classList.contains('RadAjaxPanel') && node.firstElementChild && $find(node.firstElementChild.id)))
      .slice(0, 30)
      .map(node => ({ id: node.id, type: node.className.match(/(^|\s)(Rad[A-Z]\w*)/)[2] }));
  }

  // Components still registered whose element has left the document.
  function orphans() {
    return Sys.Application.getComponents()
      .filter(component => typeof component.get_element === 'function' && component.get_element() && !document.contains(component.get_element()))
      .slice(0, 20)
      .map(component => ({ id: component.get_id?.() || null, type: typeName(component) }));
  }

  // ---------------------------------------------------------------------------
  // Event handler tracking

  const trackedEvents = () => [
    [Sys.Application, 'load'],
    [prm, 'initializeRequest'],
    [prm, 'beginRequest'],
    [prm, 'pageLoading'],
    [prm, 'pageLoaded'],
    [prm, 'endRequest']
  ];

  // Record handlers added through the MS AJAX add_<event> methods while run()
  // executes, so they can be removed with the view.
  async function tracking(run) {
    const added = [];
    const patched = [];
    for (const [owner, name] of trackedEvents()) {
      const method = 'add_' + name;
      if (typeof owner[method] !== 'function') continue;
      const own = Object.prototype.hasOwnProperty.call(owner, method);
      const original = owner[method];
      patched.push({ owner, method, own, original });
      owner[method] = function (handler) {
        added.push({ owner, name, handler });
        return original.call(this, handler);
      };
    }
    try {
      return { result: await run(), added };
    } finally {
      for (const { owner, method, own, original } of patched) {
        if (own) owner[method] = original;
        else delete owner[method];
      }
    }
  }

  function releaseHandlers(view) {
    const handlers = viewHandlers.get(view.id) || [];
    for (const { owner, name, handler } of handlers) {
      if (typeof owner['remove_' + name] === 'function') owner['remove_' + name](handler);
    }
    viewHandlers.delete(view.id);
    return handlers.length;
  }

  // A nested CCO's URL key is unknown in advance. Ask the server as a native
  // tab click does: an async postback of the tab strip returns a redirect to
  // the tab's URL. Nothing is applied to the page. The key is cached when the
  // redirect's changed parameter carries the tab's value.
  async function discoverTabUrl(cco, index, value) {
    const reference = $find(cco.strip.id)?._postBackReference || '';
    // The strip's own ID segment keeps its underscore: ...$ciAccountpagetabs$radTab_Top.
    const uniqueId = reference.match(/__doPostBack\('([^']+)'/)?.[1] || cco.prefix.replaceAll('_', '$') + 'radTab_Top';
    const body = new URLSearchParams();
    for (const [name, field] of new FormData(form)) {
      if (typeof field === 'string') body.append(name, field);
    }
    body.set('ctl01$ScriptManager1', 'ctl01$ScriptManager1|' + uniqueId);
    body.set('__EVENTTARGET', uniqueId);
    body.set('__EVENTARGUMENT', JSON.stringify({ type: 0, index: String(index) }));
    body.set(cco.strip.id + '_ClientState', JSON.stringify({ selectedIndexes: [String(index)], logEntries: [], scrollState: {} }));
    body.set('__ASYNCPOST', 'true');
    const response = await fetch(form.action, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-MicrosoftAjax': 'Delta=true',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
      },
      body
    });
    const entries = deltaEntries(await response.text());
    const redirect = entries.find(entry => entry.type === 'pageRedirect');
    if (!redirect) {
      const error = entries.find(entry => entry.type === 'error');
      throw new Error('The nested CCO did not return a tab URL' + (error ? ': ' + error.content.slice(0, 200) : '') + '. Nothing was changed.');
    }
    const url = new URL(decodeURIComponent(redirect.content), location.href);
    url.hash = '';
    const current = new URL(location.href);
    const key = [...url.searchParams.keys()].find(name => url.searchParams.get(name) === value && current.searchParams.get(name) !== value) || null;
    if (key) urlKeys.set(cco.strip.id, key);
    return { url, key };
  }

  // ---------------------------------------------------------------------------
  // Tab switching

  async function show(cco, index) {
    if (!running) throw new Error('Run usCcoPartial.start() first.');
    if (busy) {
      log.push({ event: 'ignored', at: elapsed(), tab: caption(cco, index), reason: 'switch in progress' });
      return;
    }
    const value = tabValue(cco, index);
    const target = views(cco)[index];
    const leaving = views(cco)[displayedIndex(cco)];
    if (!value || !target || target === leaving) return;
    if (prm.get_isInAsyncPostBack()) {
      log.push({ event: 'ignored', at: elapsed(), tab: caption(cco, index), reason: 'native postback in progress' });
      return;
    }
    busy = true;
    const previous = views(cco).indexOf(leaving);
    let changed = false;
    // Select the clicked tab straight away, as a native click does, and keep
    // the content unusable until its controls are ready.
    setTabAppearance(cco, index);
    const indicator = indicate(cco, tabLinks(cco)[index], caption(cco, index));
    const began = performance.now();
    const entry = { event: 'switch', at: elapsed(), cco: cco.nested ? cco.prefix : 'account', tab: caption(cco, index), index, from: caption(cco, previous), pageErrors: [] };
    const recordError = event => { if (entry.pageErrors.length < 10) entry.pageErrors.push(brief(event.error || event.message)); };
    window.addEventListener('error', recordError);
    try {
      let url;
      const key = urlKeys.get(cco.strip.id);
      if (key) {
        url = tabUrl(key, value);
      } else {
        const discovering = performance.now();
        const discovered = await discoverTabUrl(cco, index, value);
        url = discovered.url;
        entry.discovery = { key: discovered.key, ms: Math.round(performance.now() - discovering) };
      }
      const response = await fetch(url, { credentials: 'same-origin', headers: { Accept: 'text/html' } });
      if (!response.ok || new URL(response.url).pathname !== location.pathname) {
        throw new Error('Unexpected tab response (' + response.status + '). Nothing was changed.');
      }
      const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
      const fetchedForm = doc.getElementById('aspnetForm');
      const fetchedView = doc.getElementById(target.id);
      const parsed = parseInitialize(doc);
      if (!fetchedForm || !fetchedView || !parsed) throw new Error('The fetched page lacks the form, tab view or panel registry. Nothing was changed.');
      entry.fetchMs = Math.round(performance.now() - began);

      changed = true;
      entry.releasedHandlers = releaseHandlers(leaving);
      entry.disposedComponents = disposeTree(leaving);
      leaving.replaceChildren(placeholder());
      leaving.classList.add('rmpHidden');

      const content = document.importNode(fetchedView, true);
      const scripts = [...content.querySelectorAll('script')];
      scripts.forEach(script => script.remove());
      target.replaceChildren(...content.childNodes);
      target.classList.remove('rmpHidden');
      indicator.suppressProgress(target);

      entry.fields = switchFormState(fetchedForm, cco, index);
      entry.registration = registerPanels(parsed);
      history.replaceState(history.state, '', url);

      const initializing = performance.now();
      const listers = [...target.querySelectorAll('[id$="_ListerPanel"]')].filter(lister => lister.querySelector('input[id$="_ResultsGrid_RefreshButton"][name]'));
      // Native lister refreshes are left untracked: PageRequestManager
      // disposes the controls in panels it replaces.
      const tracked = await tracking(async () => {
        entry.scripts = await runViewScripts(scripts);
        entry.managers = replayManagers(managerStatements(doc, fetchedView), target, listers);
        entry.creates = replayCreates(createBlocks(doc, fetchedView), target, listers);
      });
      viewHandlers.set(target.id, tracked.added);
      entry.trackedHandlers = tracked.added.length;
      entry.listers = await refreshListers(listers);
      entry.initMs = Math.round(performance.now() - initializing);
      entry.uninitialized = uninitialized(target);
      entry.orphans = orphans();
      entry.status = 'shown';
    } catch (error) {
      entry.status = 'failed';
      entry.error = brief(error);
      // Before any change the original tab is still displayed and current.
      if (!changed) setTabAppearance(cco, previous);
    } finally {
      window.removeEventListener('error', recordError);
      entry.totalMs = Math.round(performance.now() - began);
      entry.indicator = indicator.sample;
      log.push(entry);
      indicator.clear();
      busy = false;
    }
    return entry.status;
  }

  // Capture-phase document handler: runs before Telerik's own click handling,
  // which would post back and redirect. Covers the account CCO and any CCO
  // nested in its content, including ones inserted by a switch.
  function onTabClick(event) {
    const link = event.target.closest?.('a.rtsLink');
    const strip = link?.closest('[id$="_radTab_Top"]');
    if (!strip || (strip !== tabStrip && !multiPage.contains(strip))) return;
    const cco = ccoFor(strip);
    if (!cco || !tabLinks(cco).includes(link)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const index = tabLinks(cco).indexOf(link);
    if (index !== displayedIndex(cco)) show(cco, index);
  }

  function start() {
    if (running) return 'usCcoPartial ' + version + ' is already running.';
    prm = window.Sys?.WebForms?.PageRequestManager?.getInstance();
    if (!prm || ![prm._updatePanelIDs, prm._updatePanelClientIDs, prm._updatePanelHasChildrenAsTriggers].every(Array.isArray)) {
      throw new Error('The native PageRequestManager panel registry was not found.');
    }
    form = document.getElementById('aspnetForm');
    tabStrip = document.getElementById(ids.tabStrip);
    multiPage = document.getElementById(ids.multiPage);
    outer = tabStrip && multiPage ? ccoFor(tabStrip) : null;
    if (!form || !outer || displayedIndex(outer) < 0) throw new Error('Account page CCO elements were not found.');
    hook();
    document.addEventListener('click', onTabClick, true);
    window.addEventListener('pagehide', keepReport);
    window.addEventListener('pageshow', onPageShow);
    running = true;
    log.push({ event: 'started', at: elapsed(), displayed: caption(outer, displayedIndex(outer)), themeStyles: themeStyles(), styleElementsApply: styleElementsApply(), replacedInstance: replaced });
    return 'usCcoPartial ' + version + ' running. Click CCO tabs, then run: copy(JSON.stringify(usCcoPartial.report(), null, 2))';
  }

  // Later tab clicks use the native post-and-redirect path again.
  function stop() {
    document.removeEventListener('click', onTabClick, true);
    window.removeEventListener('pagehide', keepReport);
    window.removeEventListener('pageshow', onPageShow);
    running = false;
    log.push({ event: 'stopped', at: elapsed() });
    return 'Stopped. Native tab clicks resume; reload for a clean page.';
  }

  function report() {
    const action = form ? new URL(form.action, location.href).searchParams.get(tabKey) : null;
    return {
      version,
      running,
      displayed: outer ? caption(outer, displayedIndex(outer)) : null,
      urlKeys: Object.fromEntries(urlKeys),
      formActionTab: action,
      registeredPanels: prm ? prm._updatePanelIDs.length : null,
      inAsyncPostBack: prm ? prm.get_isInAsyncPostBack() : null,
      orphans: prm ? orphans() : [],
      log
    };
  }

  // A full postback or redirect reloads the page and ends the trial. Keep the
  // report, and what caused the unload, for the next paste on this tab.
  const storageKey = 'usCcoPartial:lastReport';
  function keepReport() {
    const target = form?.querySelector('input[name="__EVENTTARGET"]')?.value || null;
    log.push({
      event: 'unload',
      at: elapsed(),
      // __doPostBack sets the event target before a full-page submit.
      fullPostBackTarget: target,
      eventArgument: target ? form.querySelector('input[name="__EVENTARGUMENT"]')?.value || '' : null,
      formActionTab: form ? new URL(form.action, location.href).searchParams.get(tabKey) : null,
      inAsyncPostBack: prm ? prm.get_isInAsyncPostBack() : null,
      busy
    });
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(report()));
    } catch {
      // Storage may be unavailable; the report is then lost with the page.
    }
  }

  // Returning with Back can restore this page, with the trial still running,
  // from the back-forward cache. Record it, with the displayed tab's state.
  function onPageShow(event) {
    if (!event.persisted) return;
    restorations++;
    log.push({
      event: 'restored',
      at: elapsed(),
      displayed: caption(outer, displayedIndex(outer)),
      formActionTab: new URL(form.action, location.href).searchParams.get(tabKey),
      locationTab: new URL(location.href).searchParams.get(tabKey),
      busy,
      inAsyncPostBack: prm.get_isInAsyncPostBack(),
      contentStyle: multiPage.getAttribute('style') || null
    });
  }

  function previousReport() {
    try {
      return JSON.parse(sessionStorage.getItem(storageKey) || 'null');
    } catch {
      return null;
    }
  }

  // show(index) switches the account CCO; pass a nested tab strip element too.
  const showTab = (index, strip) => show(strip ? ccoFor(strip) : outer, index);
  window.usCcoPartial = { version, start, stop, show: showTab, report, previousReport, deltaSummary, get running() { return running; } };
  const kept = previousReport() ? ' A report from before the last reload is kept: copy(JSON.stringify(usCcoPartial.previousReport(), null, 2))' : '';
  return 'usCcoPartial ' + version + ' ready. Run: usCcoPartial.start()' + kept;
})();
