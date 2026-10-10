/* US-INLINE-COMPOSER (C40, candidate; owner, 10 October 2026: "apply the
   same format to all add functions within the cases page ... then wrap that
   style into the theme"). Target: zUnionSuite.js, a new block after the
   action engine; its CSS (composer.candidate.css) in zUnionSuite.css.

   One way to add a record in place. UnionSuiteComposers.define(key, spec)
   defines two actions:

   - key: the section's add button. A toggle: it opens the composer at the
     top of the section it was pressed in (above a list's search, otherwise
     at the top of the body, above a feed's filters), shows pressed while the
     composer is open, and puts it away when pressed again, keeping what was
     written for the next time it opens. A composer only ever opens in the
     section whose button was pressed (owner, 10 October 2026).
   - key + '-form': the full form, a popup. It is the composer's More
     options, and the button to use outside a section (the banner's Actions
     menu: "the banner actions should just open the popup"). It keeps the
     authored label, so one action serves both.

   A composer is the main field, then one line of the other fields, a
   message, More options, Cancel and Save. Ctrl+Enter saves (Enter in a
   one-line field); Escape and Cancel close it. After a save it closes, or
   with keepOpen clears and keeps the cursor for the next one. As it does,
   a holding row (what was typed, a drawn tick and "Saved", then a shimmer)
   opens in the list where the spec's arrive says the entry lands; when the
   page has the entry, the real row takes the holding row's place (owner,
   10 October 2026: "save data, row slides down. no report reloading. no
   flashes"): the page is read quietly, the section's Query Template rows
   compared with it by record, and only the new row goes in. Nothing else
   in the section changes; the other lists the spec names refresh as usual.
   A feed, or a page that cannot be read, refreshes as usual instead.
   A composer whose button hides while its section shows (a feed's type
   filter moving off its type) closes and is kept as it was until the
   button opens it again. Cancel, Escape and a save clear it.

   spec: {
     label, icon                 the add button (icon: plus by default)
     context, recordKey          as any action; the save receives the context
     owner, source               the actions' metadata
     form: {label, href, title, maxWidth}
                                 the full form: label is the banner's text
     lists(values)               classes of the iParts the save changes: the
                                 composer's own gets the new row, the others
                                 refresh (and all refresh when the form
                                 closes, with no values)
     feed                        the timeline types (data-type) the record
                                 shows as, for a feed's quiet reload
                                 (default: the composer's kind)
     arrive                      where the holding row opens: 'top' (the
                                 default), 'bottom' (of the rows showing) or
                                 {field, attribute, order} (among them by a
                                 value); the report still places the row
     composer: {
       kind                      the modifier class (us-composer--KIND)
       label                     the group's accessible name
       save                      the Save button's text
       keepOpen                  clear and stay open after a save
       main, fields              the main field, then the bar's fields
       confirm(values)           a question to ask before saving, or none: the
                                 first Save shows it and becomes "Save
                                 anyway"; changing anything withdraws it
       submit(values, context)   resolves once saved, with the new record's
                                 {Ordinal} (or {Ordinals}); throws on failure
       saved(values) or text     announced after a save
       failed                    shown when the save fails
     }
   }
   field: {type, name, label, placeholder, required (its message), shownBy
   (a checkbox's name: shown, and required, only while it is ticked),
   width ('grow'), options (select), search({term, wrapper}) and empty(term)
   (combobox: resolves [{value, name, meta, disabled}]), avatars (combobox)}.
   Types: textarea, text, date, time, select, checkbox, files, combobox. A
   combobox's value is the option picked, never typed text. */
(function () {
  'use strict';
  if (window.UnionSuiteComposers) return;

  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const specs = new Map();
  const drafts = new WeakMap();
  const contexts = new WeakMap();
  const searches = new WeakMap();
  const homes = new Map();
  let serial = 0;

  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[char]));
  const actionClass = key => 'us-action-' + key.replace(/\./g, '-');
  const sectionOf = node => node?.closest('.ContentItemContainer > div');
  const panelBody = wrapper => wrapper?.querySelector(':scope > .panel > .panel-body-container > .panel-body');
  const buttonFor = (wrapper, key) => wrapper?.querySelector(':scope > .panel > .panel-heading .' + actionClass(key));
  const fieldsOf = spec => [spec.composer.main, ...(spec.composer.fields || [])];
  const fieldNamed = (composer, name) => composer.querySelector(`.us-composer__field[data-name="${CSS.escape(name)}"]`);
  const specFor = composer => specs.get(composer.dataset.key);

  function openIn(wrapper, key) {
    const open = wrapper?.querySelectorAll(':scope > .panel > .us-composer, :scope > .panel > .panel-body-container > .panel-body > .us-composer') || [];
    return [...open].find(composer => !composer.hasAttribute('data-closing') && (!key || composer.dataset.key === key));
  }

  function draftsFor(wrapper) {
    if (!drafts.has(wrapper)) drafts.set(wrapper, {});
    return drafts.get(wrapper);
  }

  // ── Building ────────────────────────────────────────────────────
  function fieldHtml(field, id, main) {
    const classes = 'us-composer__field us-composer__field--' + field.type + (field.width === 'grow' ? ' us-composer__field--grow' : '');
    const shown = field.shownBy ? ` data-shown-by="${escape(field.shownBy)}" hidden` : '';
    const attributes = `id="${id}" data-name="${escape(field.name)}" aria-label="${escape(field.label)}"${shown}` +
      (field.placeholder ? ` placeholder="${escape(field.placeholder)}"` : '');
    const mainClass = main ? ' us-composer__main' : '';
    switch (field.type) {
      case 'textarea':
        return `<textarea class="${classes + mainClass}" ${attributes} rows="3"></textarea>`;
      case 'select':
        return `<select class="${classes + mainClass}" ${attributes}>${field.options.map(option => `<option>${escape(option)}</option>`).join('')}</select>`;
      case 'checkbox':
        return `<label class="us-composer__check"><input type="checkbox" class="${classes}" id="${id}" data-name="${escape(field.name)}"> ${escape(field.label)}</label>`;
      case 'files':
        return `<label class="us-composer__drop${mainClass}" for="${id}">` +
          `<input type="file" class="${classes}" ${attributes} multiple>` +
          '<i class="ti ti-upload" aria-hidden="true"></i>' +
          '<span>Drop files here or <span class="us-composer__browse">choose files</span></span></label>' +
          `<ul class="us-composer__files" aria-label="${escape(field.label)} to upload" hidden></ul>`;
      case 'combobox':
        return `<span class="us-composer__combo${mainClass}">` +
          `<input type="text" class="${classes}" ${attributes} role="combobox" aria-autocomplete="list" aria-expanded="false" aria-controls="${id}-list" autocomplete="off">` +
          `<ul class="us-composer__options" id="${id}-list" role="listbox" aria-label="${escape(field.label)}" hidden></ul></span>`;
      default:
        return `<input type="${field.type}" class="${classes + mainClass}" ${attributes} autocomplete="off">`;
    }
  }

  function build(key, spec, context) {
    const composer = document.createElement('div');
    const id = 'us-composer-' + (++serial);
    const config = spec.composer;
    composer.className = 'us-composer us-composer--' + (config.kind || key.split('.').pop());
    composer.dataset.key = key;
    composer.setAttribute('role', 'group');
    composer.setAttribute('aria-label', config.label);
    composer.innerHTML = fieldHtml(config.main, id, true) +
      '<div class="us-composer__bar">' +
      (config.fields || []).map((field, index) => fieldHtml(field, id + '-' + index, false)).join('') +
      '<p class="us-composer__message" role="status"></p>' +
      `<button type="button" class="TextButton us-outline-button us-composer__more ${actionClass(key + '-form')}">More options</button>` +
      '<button type="button" class="TextButton us-outline-button us-composer__cancel">Cancel</button>' +
      `<button type="button" class="TextButton PrimaryButton us-composer__save">${escape(config.save)}</button>` +
      '</div>';
    contexts.set(composer, context || {});
    return composer;
  }

  // First in the section's content: above a list's search (US-QUERY-SEARCH
  // puts it between the heading and the body), otherwise at the top of the
  // body, above a feed's filters.
  function place(wrapper, composer) {
    homes.set(composer, wrapper.parentElement);
    const search = wrapper.querySelector(':scope > .panel > .us-query-search-controls');
    composer.classList.toggle('us-composer--above-search', Boolean(search));
    if (search) search.before(composer);
    else panelBody(wrapper).prepend(composer);
  }

  // Reopening a closing composer stops its fold, so it stays.
  function fold(element, open) {
    element.getAnimations?.().forEach(animation => animation.cancel());
    if (still() || !element.animate) {
      if (!open) element.remove();
      return;
    }
    const height = element.getBoundingClientRect().height;
    const frames = [{height: '0px', opacity: 0}, {height: height + 'px', opacity: 1}];
    element.style.overflow = 'hidden';
    element.animate(open ? frames : frames.reverse(), {duration: 200, easing: EASE}).finished.then(() => {
      element.style.removeProperty('overflow');
      if (!open) element.remove();
    }, () => {});
  }

  const focusMain = (composer, preventScroll) => composer.querySelector('.us-composer__field')?.focus({preventScroll});

  // ── Opening and closing ─────────────────────────────────────────
  function open(trigger, key, context) {
    const spec = specs.get(key);
    const wrapper = sectionOf(trigger);
    if (!spec || !panelBody(wrapper)) return false;
    const kept = draftsFor(wrapper);
    const current = openIn(wrapper);
    // Pressed again, the button puts the composer away with what was
    // written (owner, 10 October 2026); Cancel and Escape discard it.
    if (current?.dataset.key === key) {
      kept[key] = current;
      close(current, true);
      return true;
    }
    if (current) {
      kept[current.dataset.key] = current;
      close(current, false);
    }
    const composer = kept[key] || build(key, spec, context);
    delete kept[key];
    composer.removeAttribute('data-closing');
    place(wrapper, composer);
    buttonFor(wrapper, key)?.setAttribute('aria-pressed', 'true');
    fold(composer, true);
    focusMain(composer, false);
    window.UnionSuiteActions?.refresh();
    return true;
  }

  function close(composer, returnFocus, instant) {
    closeOptions(composer);
    const button = buttonFor(sectionOf(composer), composer.dataset.key);
    button?.setAttribute('aria-pressed', 'false');
    composer.setAttribute('data-closing', '');
    homes.delete(composer);
    if (instant) composer.remove();
    else fold(composer, false);
    if (returnFocus) button?.focus({preventScroll: true});
  }

  function discard(composer, returnFocus, instant) {
    delete draftsFor(sectionOf(composer))[composer.dataset.key];
    close(composer, returnFocus, instant);
  }

  function clear(composer) {
    composer.querySelectorAll('.us-composer__field').forEach(field => {
      if (field.type === 'checkbox') field.checked = false;
      else if (field.type === 'file') setFiles(field, []);
      else if (field.tagName === 'SELECT') field.selectedIndex = 0;
      else field.value = '';
      delete field.dataset.value;
      if (field.dataset.shownBy) field.hidden = true;
    });
    composer.querySelector('.us-composer__message').textContent = '';
    withdraw(composer);
  }

  // ── Saving ──────────────────────────────────────────────────────
  function valuesOf(composer) {
    const values = {};
    composer.querySelectorAll('.us-composer__field').forEach(field => {
      const name = field.dataset.name;
      if (field.type === 'checkbox') values[name] = field.checked;
      else if (field.hidden) values[name] = '';
      else if (field.type === 'file') values[name] = [...field.files];
      else if (field.getAttribute('role') === 'combobox') values[name] = field.dataset.value || '';
      else values[name] = field.value.trim();
    });
    return values;
  }

  function problemIn(composer, values) {
    for (const field of fieldsOf(specFor(composer))) {
      const element = fieldNamed(composer, field.name);
      if (!field.required || !element || element.hidden) continue;
      const value = values[field.name];
      if (Array.isArray(value) ? !value.length : !value) return {element, message: field.required};
    }
    return null;
  }

  function refreshLists(classes) {
    const selector = (classes || []).map(name => '.ContentItemContainer > .' + name).join(', ');
    if (!selector || !document.querySelector(selector)) return Promise.resolve();
    return window.UnionSuiteRefresh?.queryTemplate(selector, {match: 'all'});
  }

  function announce(text) {
    if (!text) return;
    let live = document.getElementById('us-composer-live');
    if (!live) {
      live = document.createElement('p');
      live.id = 'us-composer-live';
      live.className = 'sr-only';
      live.setAttribute('role', 'status');
      live.setAttribute('aria-live', 'polite');
      document.body.append(live);
    }
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  }

  function busy(button, on) {
    button.disabled = on;
    if (on) {
      button.setAttribute('aria-busy', 'true');
      button.insertAdjacentHTML('afterbegin', '<span class="us-button-spinner" aria-hidden="true"></span>');
    } else {
      button.removeAttribute('aria-busy');
      button.querySelector('.us-button-spinner')?.remove();
    }
  }

  // A question the composer asked, withdrawn: the message clears and Save
  // has its own text again.
  function withdraw(composer) {
    if (!composer.hasAttribute('data-confirming')) return;
    composer.removeAttribute('data-confirming');
    const message = composer.querySelector('.us-composer__message');
    message.textContent = '';
    message.classList.remove('is-warning');
    composer.querySelector('.us-composer__save').textContent = specFor(composer).composer.save;
  }

  async function save(composer) {
    const spec = specFor(composer);
    const config = spec.composer;
    const message = composer.querySelector('.us-composer__message');
    const button = composer.querySelector('.us-composer__save');
    if (button.getAttribute('aria-busy') === 'true') return;
    message.textContent = '';
    const values = valuesOf(composer);
    const problem = problemIn(composer, values);
    if (problem) {
      message.textContent = problem.message;
      problem.element.focus();
      return;
    }
    // "Are you sure": the first Save asks, the second saves.
    const question = config.confirm?.(values);
    if (question && !composer.hasAttribute('data-confirming')) {
      composer.setAttribute('data-confirming', '');
      message.textContent = question;
      message.classList.add('is-warning');
      button.textContent = 'Save anyway';
      return;
    }
    withdraw(composer);
    busy(button, true);
    let result;
    try {
      result = await config.submit(values, contexts.get(composer));
    } catch (error) {
      busy(button, false);
      message.textContent = config.failed || 'This could not be saved. Try again.';
      console.warn('[US-INLINE-COMPOSER]', error?.message);
      return;
    }
    announce(typeof config.saved === 'function' ? config.saved(values) : config.saved);
    // Saved: the holding rows open in the list as the composer clears (or
    // folds away), so something always shows the entry is on its way.
    const container = sectionOf(composer)?.parentElement;
    const holds = hold(container, spec, holdTitles(composer, values), idsOf(result), values);
    busy(button, false);
    if (config.keepOpen) {
      clear(composer);
      focusMain(composer, true);
    } else {
      discard(composer, true);
    }
    await settle(container, spec.lists(values), holds, spec.feed || [config.kind]);
  }

  // ── The new entry ───────────────────────────────────────────────
  // At once, a holding row where the spec's arrive says the entry lands:
  // what was typed, a spinner and "Adding…" (owner, 10 October 2026). Then
  // the page is read quietly, as the theme's Query Template refresh reads
  // it, and the section's rows compared with it by record: each new row
  // takes its holding row's place (matched by the ID the save returned,
  // otherwise in order), or opens where the report puts it while the
  // holding row closes. Nothing else in the section changes; the other
  // lists the spec names refresh as usual. A feed (the timeline), or a page
  // that cannot be read, refreshes as usual instead.
  const setOf = container => container?.querySelector(':scope > div > .panel > .panel-body-container > .panel-body > .QueryTemplateSet');
  const rowsOf = set => [...(set?.children || [])].filter(child => child.matches('section[data-item]'));
  const queryTemplateOf = container => container?.id && !container.querySelector('.us-activity-feed') ? setOf(container) : null;

  // A row is known by its record's ordinal, otherwise by its text.
  function rowKey(row) {
    const marked = row.querySelector('[data-us-task-ordinal], [data-us-contact-ordinal], [data-ordinal]');
    return marked?.getAttribute('data-us-task-ordinal') || marked?.getAttribute('data-us-contact-ordinal') || marked?.getAttribute('data-ordinal')
      || row.textContent.replace(/\s+/g, ' ').trim();
  }

  // The save's answer: the new record's ID (Ordinal), or several (Ordinals).
  function idsOf(result) {
    const ids = Array.isArray(result?.Ordinals) ? result.Ordinals : result?.Ordinal != null ? [result.Ordinal] : [];
    return ids.map(String);
  }

  // One holding row per entry: the main field's text, the person picked, or
  // each file chosen.
  function holdTitles(composer, values) {
    const main = specFor(composer).composer.main;
    if (main.type === 'files') return values[main.name].map(file => file.name);
    const text = main.type === 'combobox' ? fieldNamed(composer, main.name).value : String(values[main.name] ?? '');
    return [text.split('\n')[0]];
  }

  // A feed's newest cards (US-ACTIVITY-FEED): the first month's list, where
  // a record just added lands.
  const feedOf = container => container?.querySelector('.us-activity-feed');
  const feedListOf = container => feedOf(container)?.querySelector('.us-records__items');

  function hold(container, spec, titles, ids, values) {
    const set = queryTemplateOf(container);
    const feedList = set ? null : feedListOf(container);
    if (!set && !feedList) return [];
    // It is saved: a tick that draws itself and "Saved" (the save's own
    // announcement speaks for it), then a shimmer until the row arrives. In
    // a feed it is a record card (US-RECORD-CARDS): the tick in the
    // timeline's node, what was typed in the card.
    const tick = '<svg class="us-composer-holding__tick" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      '<circle cx="12" cy="12" r="9" pathLength="1"></circle><path d="m8 12.5 2.8 2.8L16.2 9.6" pathLength="1"></path></svg>';
    const text = '<span class="us-composer-holding__title"></span><span class="us-composer-holding__meta">Saved</span>';
    const holds = titles.map((title, index) => {
      const row = document.createElement(feedList ? 'li' : 'div');
      if (feedList) {
        row.className = 'us-composer-holding-card';
        row.innerHTML = `<article class="us-record"><span class="us-record__node">${tick}</span>` +
          `<div class="us-record__card us-composer-holding">${text}</div></article>`;
      } else {
        row.className = 'us-composer-holding';
        row.innerHTML = tick + text;
      }
      if (ids[index]) row.setAttribute('data-us-composer-id', ids[index]);
      row.querySelector('.us-composer-holding__title').textContent = title;
      return row;
    });
    if (!holds.length) return [];
    if (feedList) {
      // A feed is newest first: the card waits at the top.
      feedList.prepend(...holds);
    } else {
      // An empty list's No results content gives way to the first entry.
      if (!rowsOf(set).length) set.replaceChildren();
      putHolds(set, holds, spec.arrive || 'top', values);
    }
    holds.forEach(row => {
      Object.assign(row.style, {height: '0px', overflow: 'hidden', opacity: '0'});
      requestAnimationFrame(() => unfold(row));
    });
    return holds;
  }

  // The rows showing, and the holding rows already waiting (so quick
  // entries keep their order): top, bottom, or among them by a value (the
  // composer's field against each row's attribute).
  function putHolds(set, holds, arrive, values) {
    const showing = [...set.children].filter(child => (child.matches('section[data-item]') || child.matches('.us-composer-holding')) && child.getClientRects().length);
    const put = anchor => anchor ? anchor.before(...holds) : set.append(...holds);
    if (arrive === 'bottom') {
      const last = showing[showing.length - 1];
      return last ? last.after(...holds) : put(null);
    }
    if (arrive === 'top' || typeof arrive !== 'object') return put(showing[0] || set.firstElementChild);
    const {field, attribute, order = 'ascending'} = arrive;
    const value = String(values[field] ?? '');
    const read = row => row.getAttribute('data-us-composer-value') ?? (row.matches(`[${attribute}]`) ? row : row.querySelector(`[${attribute}]`))?.getAttribute(attribute);
    const sign = order === 'descending' ? -1 : 1;
    holds.forEach(row => row.setAttribute('data-us-composer-value', value));
    const next = showing.find(row => read(row) != null && sign * read(row).localeCompare(value) > 0);
    if (next) return put(next);
    const last = showing[showing.length - 1];
    return last ? last.after(...holds) : put(null);
  }

  // A feed asks its sources of the record's types for their newest rows
  // (UnionSuiteActivityFeed.reload, quiet) and folds in only the new cards;
  // a Query Template list reads the page quietly. Either way nothing else
  // in the section changes. The other lists the save changes follow: feeds
  // quietly, Query Templates by refresh.
  async function settle(container, classes, holds, types) {
    const feeds = window.UnionSuiteActivityFeed;
    let settled = false;
    try {
      if (feedOf(container) && feeds?.reload) {
        await feeds.reload(feedOf(container), {quiet: true, types});
        holds.forEach(row => fold(row, false));
        settled = true;
      } else {
        settled = await insertNew(container, holds);
      }
    } catch (error) {
      console.warn('[US-INLINE-COMPOSER] Falling back to a refresh:', error?.message);
    }
    if (!settled) {
      holds.forEach(row => fold(row, false));
      await refreshLists(classes);
      return;
    }
    const others = listContainers(classes).filter(other => other !== container);
    const templates = others.filter(other => !feedOf(other));
    await Promise.all([
      ...others.filter(feedOf).map(other => feeds?.reload?.(feedOf(other), {quiet: true, types})),
      templates.length ? window.UnionSuiteRefresh?.queryTemplate(templates.map(other => '#' + CSS.escape(other.id)).join(', '), {match: 'all'}) : null
    ]);
  }

  function listContainers(classes) {
    const selector = (classes || []).map(name => '.ContentItemContainer > .' + name).join(', ');
    return selector ? [...new Set([...document.querySelectorAll(selector)].map(node => node.parentElement))].filter(node => node.id) : [];
  }

  // The page as the theme's Query Template refresh reads it (its URL, with
  // a CCO tab's query string), parsed but not shown.
  async function freshSet(container) {
    const query = location.search.length > 1 ? location.search : location.hash.includes('?') ? location.hash.slice(location.hash.indexOf('?')) : '';
    const response = await fetch(location.origin + location.pathname + query, {credentials: 'same-origin', cache: 'no-store', redirect: 'error'});
    if (!response.ok || !/\btext\/html\b/i.test(response.headers.get('content-type') || '')) throw new Error('The page could not be read (HTTP ' + response.status + ').');
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    if (doc.querySelector('input.SignInButton')) throw new Error('Sign in again to see the new entry.');
    return setOf(doc.getElementById(container.id));
  }

  // The rows the page has and the section does not go in where the page
  // has them (before the next row both have, or last), collapsed; rows the
  // page no longer has (a list of the newest few) close. Once the theme has
  // dressed the new rows, each one takes over its holding row. True when
  // the section is settled.
  async function insertNew(container, holds) {
    if (!queryTemplateOf(container)) return false;
    const fresh = await freshSet(container);
    const set = setOf(container);
    if (!fresh || !set) return false;
    const incoming = rowsOf(fresh);
    const incomingKeys = new Set(incoming.map(rowKey));
    const known = new Set(rowsOf(set).map(rowKey));
    const item = rowsOf(set)[0]?.getAttribute('data-item') || set.id;
    const nodes = [];
    incoming.filter(row => !known.has(rowKey(row))).forEach(row => {
      const node = document.importNode(row, true);
      node.setAttribute('data-item', item);
      Object.assign(node.style, {height: '0px', overflow: 'hidden', opacity: '0'});
      const following = incoming.slice(incoming.indexOf(row) + 1).map(rowKey);
      const next = rowsOf(set).find(existing => !nodes.includes(existing) && following.includes(rowKey(existing)));
      if (next) next.before(node);
      else set.append(node);
      nodes.push(node);
    });
    const gone = rowsOf(set).filter(row => !nodes.includes(row) && !incomingKeys.has(rowKey(row)));
    // Rows that stay keep everything the browser has done to them; only the
    // parts their template marks data-us-live (a count, such as View all
    // attachments (7)) take the page's new text.
    const freshByKey = new Map(incoming.map(row => [rowKey(row), row]));
    const live = rowsOf(set).filter(row => !nodes.includes(row) && freshByKey.has(rowKey(row))).flatMap(row => {
      const next = freshByKey.get(rowKey(row)).querySelectorAll('[data-us-live]');
      return [...row.querySelectorAll('[data-us-live]')].map((node, index) => [node, next[index]?.textContent]);
    }).filter(([node, text]) => text != null && node.textContent !== text);
    // Each new row's holding row: by ID, then the rest in order.
    const waiting = [...holds];
    const take = test => {
      const index = waiting.findIndex(test);
      return index < 0 ? null : waiting.splice(index, 1)[0];
    };
    const pairs = nodes.map(node => [node, take(row => row.getAttribute('data-us-composer-id') === rowKey(node))]);
    pairs.forEach(pair => { pair[1] ||= take(row => !row.hasAttribute('data-us-composer-id')); });
    dress(container);
    requestAnimationFrame(() => {
      // Where each pair stands is read before any of them moves.
      const skip = new Set([...holds, ...nodes]);
      pairs.map(([node, held]) => [node, held, Boolean(held?.isConnected) && nextRow(held, skip) === nextRow(node, skip)])
        .forEach(([node, held, same]) => land(node, held, same));
      // Holding rows with no row to become (a filter or search hides it, or
      // the report does not have it) close.
      waiting.forEach(row => fold(row, false));
      gone.forEach(row => fold(row, false));
      live.forEach(([node, text]) => { node.textContent = text; });
    });
    return true;
  }

  // The theme's pass over refreshed rows (US-ACTION-REFRESH): task states,
  // the completed filter and search counts, action buttons and menus.
  function dress(container) {
    window.UnionSuiteIqaFilters?.refreshQueryTemplates?.();
    window.UnionSuiteActions?.refresh?.();
    window.UnionSuiteTaskRows?.refresh?.();
    window.UnionSuiteActionMenus?.refresh?.();
    container.dispatchEvent(new CustomEvent('us:query-template-refreshed', {bubbles: true, detail: {container, inserted: true}}));
  }

  // A new row and its holding row. In the same place, the row takes over:
  // from the holding row's height to its own, its contents fading in. In
  // another place (the report sorts it elsewhere), the holding row closes
  // as the row opens. A row the theme hides (a filter) is left hidden.
  function land(node, held, same) {
    const reset = () => ['height', 'overflow', 'opacity'].forEach(name => node.style.removeProperty(name));
    if (held && !same) fold(held, false);
    if (!node.getClientRects().length) {
      reset();
      if (held && same) fold(held, false);
      return;
    }
    const height = node.scrollHeight;
    const from = same ? held.getBoundingClientRect().height : 0;
    if (same) held.remove();
    if (still() || !node.animate) {
      reset();
      return;
    }
    node.animate([
      {height: from + 'px', opacity: 0},
      {height: height + 'px', opacity: 1}
    ], {duration: same ? 220 : 280, easing: EASE}).finished.catch(() => {}).then(reset);
    node.style.removeProperty('opacity');
    node.style.removeProperty('height');
  }

  // The first row after a row that was there before (holding rows and new
  // rows skipped): two rows with the same one are in the same place.
  function nextRow(row, skip) {
    let next = row.nextElementSibling;
    while (next && skip.has(next)) next = next.nextElementSibling;
    return next;
  }

  // From nothing to its full height, the rows below making room.
  function unfold(row) {
    const reset = () => ['height', 'overflow', 'opacity'].forEach(name => row.style.removeProperty(name));
    const height = row.scrollHeight;
    if (still() || !row.animate || !height || !row.isConnected) {
      reset();
      return;
    }
    row.animate([
      {height: '0px', opacity: 0},
      {height: height + 'px', opacity: 1}
    ], {duration: 260, easing: EASE}).finished.catch(() => {}).then(reset);
    row.style.removeProperty('opacity');
    row.style.removeProperty('height');
  }

  // ── Files ───────────────────────────────────────────────────────
  function setFiles(input, files) {
    const transfer = new DataTransfer();
    files.forEach(file => transfer.items.add(file));
    input.files = transfer.files;
    const list = input.closest('.us-composer__drop').nextElementSibling;
    list.replaceChildren(...files.map((file, index) => {
      const item = document.createElement('li');
      const size = file.size < 1048576 ? Math.max(1, Math.round(file.size / 1024)) + ' KB' : (file.size / 1048576).toFixed(1) + ' MB';
      item.innerHTML = '<i class="ti ti-file" aria-hidden="true"></i><span class="us-composer__file-name"></span>' +
        `<span class="us-composer__file-size">${size}</span>` +
        `<button type="button" class="us-composer__remove" data-index="${index}"><i class="ti ti-x" aria-hidden="true"></i><span class="sr-only"></span></button>`;
      item.querySelector('.us-composer__file-name').textContent = file.name;
      item.querySelector('.sr-only').textContent = 'Remove ' + file.name;
      return item;
    }));
    list.hidden = !files.length;
  }

  // ── Combobox ────────────────────────────────────────────────────
  // The options open under the field, or over it when the window has no
  // room below and more above, as a native dropdown does.
  const listOf = input => document.getElementById(input.getAttribute('aria-controls'));
  const fieldSpec = input => fieldsOf(specFor(input.closest('.us-composer'))).find(field => field.name === input.dataset.name);

  function searchSoon(input) {
    clearTimeout(searches.get(input));
    searches.set(input, setTimeout(() => void search(input), 150));
  }

  async function search(input) {
    const field = fieldSpec(input);
    const term = input.value.trim();
    let options;
    try {
      options = await field.search({term, wrapper: sectionOf(input)});
    } catch (error) {
      console.warn('[US-INLINE-COMPOSER] Search failed:', error?.message);
      showOptions(input, [], 'The list could not load.');
      return;
    }
    if (input.value.trim() !== term || !input.isConnected) return;
    showOptions(input, options || [], field.empty ? field.empty(term) : 'No matches.');
  }

  function showOptions(input, options, emptyText) {
    const list = listOf(input);
    const avatars = fieldSpec(input)?.avatars;
    list.replaceChildren();
    if (!options.length) {
      const empty = document.createElement('li');
      empty.className = 'us-composer__option is-empty';
      empty.setAttribute('role', 'option');
      empty.setAttribute('aria-disabled', 'true');
      empty.textContent = emptyText;
      list.append(empty);
    }
    options.forEach((option, index) => {
      const item = document.createElement('li');
      item.className = 'us-composer__option' + (avatars ? '' : ' us-composer__option--plain');
      item.id = list.id + '-' + index;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      item.dataset.value = option.value;
      item.dataset.name = option.name;
      if (option.disabled) item.setAttribute('aria-disabled', 'true');
      if (avatars) {
        const avatar = document.createElement('span');
        avatar.className = 'us-avatar us-avatar--sm';
        avatar.setAttribute('data-us-avatar-name', option.name);
        avatar.setAttribute('aria-hidden', 'true');
        item.append(avatar);
      }
      const name = document.createElement('span');
      name.className = 'us-composer__option-name';
      name.textContent = option.name;
      const meta = document.createElement('span');
      meta.className = 'us-composer__option-meta';
      meta.textContent = option.meta || '';
      item.append(name, meta);
      list.append(item);
    });
    list.hidden = false;
    list.classList.remove('is-above');
    const box = list.parentElement.getBoundingClientRect();
    const below = window.innerHeight - box.bottom;
    if (below < Math.min(list.scrollHeight, 264) + 12 && box.top > below) list.classList.add('is-above');
    input.setAttribute('aria-expanded', 'true');
    input.removeAttribute('aria-activedescendant');
  }

  function closeOptions(scope) {
    scope.querySelectorAll?.('.us-composer__field[role="combobox"][aria-expanded="true"]').forEach(input => {
      listOf(input).hidden = true;
      input.setAttribute('aria-expanded', 'false');
      input.removeAttribute('aria-activedescendant');
    });
  }

  function choose(input, option) {
    if (!option || option.getAttribute('aria-disabled') === 'true') return;
    input.value = option.dataset.name;
    input.dataset.value = option.dataset.value;
    input.closest('.us-composer').querySelector('.us-composer__message').textContent = '';
    closeOptions(input.parentElement);
  }

  function moveActive(input, step) {
    const options = [...listOf(input).querySelectorAll('.us-composer__option:not([aria-disabled="true"])')];
    if (!options.length) return;
    const current = options.findIndex(option => option.id === input.getAttribute('aria-activedescendant'));
    const next = options[(current + step + options.length) % options.length] || options[0];
    options.forEach(option => option.setAttribute('aria-selected', String(option === next)));
    input.setAttribute('aria-activedescendant', next.id);
    next.scrollIntoView({block: 'nearest'});
  }

  // Arrow keys move through the options, Enter picks, Escape closes the
  // list; returns true when the key was the list's.
  function comboKey(input, event) {
    const open = !listOf(input).hidden;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      if (open) moveActive(input, step);
      else void search(input).then(() => moveActive(input, step));
      return true;
    }
    if (event.key === 'Escape' && open) {
      event.preventDefault();
      closeOptions(input.parentElement);
      return true;
    }
    if (event.key === 'Enter' && open) {
      const active = document.getElementById(input.getAttribute('aria-activedescendant') || '');
      if (active) {
        event.preventDefault();
        choose(input, active);
        return true;
      }
    }
    if (event.key === 'Tab') closeOptions(input.parentElement);
    return false;
  }

  // ── Events ──────────────────────────────────────────────────────
  document.addEventListener('click', event => {
    const composer = event.target.closest('.us-composer');
    if (!composer) return;
    const remove = event.target.closest('.us-composer__remove');
    if (remove) {
      const input = composer.querySelector('.us-composer__field--files');
      setFiles(input, [...input.files].filter((file, index) => index !== Number(remove.dataset.index)));
      input.focus();
    } else if (event.target.closest('.us-composer__save')) void save(composer);
    else if (event.target.closest('.us-composer__cancel')) discard(composer, true);
    else if (event.target.closest('.us-composer__more')) setTimeout(() => discard(composer, false), 0);
  });

  document.addEventListener('input', event => {
    const composer = event.target.closest?.('.us-composer');
    if (composer) withdraw(composer);
    const input = event.target.closest?.('.us-composer__field[role="combobox"]');
    if (!input) return;
    // Typing again lets go of the pick: only a pick counts.
    delete input.dataset.value;
    searchSoon(input);
  });

  document.addEventListener('change', event => {
    const field = event.target.closest?.('.us-composer__field');
    const composer = field?.closest('.us-composer');
    if (!composer) return;
    withdraw(composer);
    if (field.type === 'file') {
      setFiles(field, [...field.files]);
      composer.querySelector('.us-composer__message').textContent = '';
    } else if (field.type === 'checkbox') {
      const revealed = [...composer.querySelectorAll(`[data-shown-by="${CSS.escape(field.dataset.name)}"]`)];
      revealed.forEach(element => { element.hidden = !field.checked; });
      if (field.checked) revealed[0]?.focus();
    }
  });

  // Files dropped on the drop zone join those already chosen.
  document.addEventListener('dragover', event => {
    const drop = event.target.closest?.('.us-composer__drop');
    if (!drop) return;
    event.preventDefault();
    drop.classList.add('is-over');
  });
  document.addEventListener('dragleave', event => {
    const drop = event.target.closest?.('.us-composer__drop');
    if (drop && !drop.contains(event.relatedTarget)) drop.classList.remove('is-over');
  });
  document.addEventListener('drop', event => {
    const drop = event.target.closest?.('.us-composer__drop');
    if (!drop) return;
    event.preventDefault();
    drop.classList.remove('is-over');
    const input = drop.querySelector('.us-composer__field--files');
    setFiles(input, [...input.files, ...event.dataTransfer.files]);
  });

  document.addEventListener('keydown', event => {
    const composer = event.target.closest?.('.us-composer');
    if (!composer) return;
    if (event.target.getAttribute('role') === 'combobox' && comboKey(event.target, event)) return;
    const oneLine = event.target.matches('input:not([type="checkbox"], [type="file"])');
    if (event.key === 'Escape') {
      event.preventDefault();
      discard(composer, true);
    } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey || oneLine)) {
      event.preventDefault();
      void save(composer);
    }
  });

  // Pressing an option keeps the cursor in the field.
  document.addEventListener('mousedown', event => {
    const option = event.target.closest('.us-composer__option');
    if (!option) return;
    event.preventDefault();
    choose(option.closest('.us-composer__combo').querySelector('input'), option);
  });

  document.addEventListener('focusin', event => {
    const input = event.target.closest?.('.us-composer__field[role="combobox"]');
    if (input && !input.dataset.value) void search(input);
  });

  document.addEventListener('focusout', event => {
    const combo = event.target.closest?.('.us-composer__combo');
    if (combo && !combo.contains(event.relatedTarget)) closeOptions(combo);
  });

  // ── Keeping up with the page ────────────────────────────────────
  // The add buttons are toggles from the start, and stay pressed when a
  // refresh redraws the heading under an open composer.
  let queued = false;
  function sync() {
    queued = false;
    homes.forEach((container, composer) => {
      if (composer.isConnected) return;
      const wrapper = container.isConnected && container.querySelector(':scope > div');
      if (!panelBody(wrapper)) return;
      place(wrapper, composer);
      if (document.activeElement === document.body) focusMain(composer, true);
    });
    specs.forEach((spec, key) => {
      document.querySelectorAll('.panel-heading .' + actionClass(key)).forEach(button => {
        button.classList.add('us-composer-toggle');
        const pressed = String(Boolean(openIn(sectionOf(button), key)));
        if (button.getAttribute('aria-pressed') !== pressed) button.setAttribute('aria-pressed', pressed);
      });
    });
  }
  new MutationObserver(() => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(sync);
  }).observe(document.documentElement, {subtree: true, childList: true});

  // A feed's type filter moved off the composer's type: its button hides
  // while the section still shows, so the composer closes and is kept.
  new MutationObserver(records => {
    new Set(records.map(record => sectionOf(record.target) || record.target)).forEach(wrapper => {
      const composer = openIn(wrapper);
      const button = composer && buttonFor(wrapper, composer.dataset.key);
      if (!button || button.getClientRects().length || !wrapper.getClientRects().length) return;
      draftsFor(wrapper)[composer.dataset.key] = composer;
      close(composer, false);
    });
  }).observe(document.body, {subtree: true, attributes: true, attributeFilter: ['data-us-activity-type', 'hidden']});

  function define(key, spec) {
    const actions = window.UnionSuiteActions;
    if (!actions?.define) throw new Error('Load the action engine before US-INLINE-COMPOSER.');
    specs.set(key, spec);
    const shared = {owner: spec.owner || 'UnionSuite', context: spec.context || {}};
    const recordKey = spec.recordKey ? {recordKey: spec.recordKey} : {};
    const source = spec.source || 'US-INLINE-COMPOSER:' + key;
    actions.define(key, {
      ...shared, className: actionClass(key), source,
      presentation: {label: spec.label, icon: spec.icon || 'plus', default: 'button', menu: 'menu-item'},
      action: {type: 'function', ...recordKey, run: env => ({opened: open(env.trigger, key, env.context)})}
    });
    actions.define(key + '-form', {
      ...shared, className: actionClass(key + '-form'), source: source + '-form',
      presentation: {label: spec.form.label || spec.label, useAuthoredLabel: true, default: 'button', menu: 'menu-item'},
      action: {type: 'popup', ...recordKey, href: spec.form.href,
        popup: {title: spec.form.title || spec.label, width: '90%', height: '90%', maxWidth: spec.form.maxWidth || 800},
        refresh: {when: 'close', run: () => refreshLists(spec.lists({}))}}
    });
    sync();
  }

  window.UnionSuiteComposers = Object.freeze({version: '0.1', define, open, refresh: sync});
})();
