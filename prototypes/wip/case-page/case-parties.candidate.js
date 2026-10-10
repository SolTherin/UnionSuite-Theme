/* US-CASE-PARTIES (C7, candidate) — the Parties tab as a list and
   a preview (owner, 8 October 2026). Target: zUnionSuite.js, a new block
   after US-CONTACT-TILES.

   On a Query Template Display with us-parties (the us-case-parties
   preset), each row (templates/Case-Parties-Query-Template.html) is a
   selectable card (.us-party__select) with its preview hidden inside
   it (.us-party__detail). This script:
   - adds the preview pane beside the list, inside the panel body, which
     becomes the grid (us-parties__columns; its container,
     us-parties__layout, sizes it). The list itself is not moved: the
     theme finds a Query Template's rows directly in the panel body, and
     its search and actions stop working if they are wrapped;
   - shows the chosen row's detail in the pane, moving it there and back,
     so each row's details (US-FIELD-GROUPS) load once and stay loaded;
   - chooses the primary party first (data-us-contact-lead), or else
     the first row;
   - puts a toolbar at the top of the list column (owner, 8 October 2026:
     the search and the email act on the list, so they sit over it, not in
     the panel heading over the preview): the theme's search field, always
     showing (moved from its folded filter area, as US-QUERY-SEARCH-HEADER
     does), the Email parties button (cases.email-parties), and a
     line saying who it emails: "4 parties · Email sends to all", or
     "1 of 4 shown · Email sends to those shown";
   - adds a Select toggle (an icon, as is the email) to that toolbar (owner, 8 October 2026): while it
     is on, each card has a checkbox, the line counts the ticked ("2 of 4
     selected") with Select all and Clear, and Email parties sends to
     exactly the ticked ("2 of 4 selected"). Ticking does not change the preview; turning the
     toggle off clears the ticks;
   - marks the chosen card aria-pressed="true" and names the pane after the
     person, so a screen reader hears what changed;
   - keeps a choice the search hides until another is made, and picks again
     when an in-place refresh replaces the rows.
   Without the script every row stays a plain card and the details stay
   hidden. */
(function () {
  'use strict';
  if (window.UnionSuiteCaseParties) return;

  const SELECTOR = '.us-parties';
  const states = new Map();
  let queued = false;

  function rows(set) {
    return [...set.querySelectorAll(':scope > section .us-party')];
  }

  // The detail goes back into its own row, hidden, before another is shown.
  function release(state) {
    const shown = state.shown;
    if (!shown) return;
    shown.detail.hidden = true;
    if (shown.row.isConnected) shown.row.append(shown.detail);
    else shown.detail.remove();
    shown.button.setAttribute('aria-pressed', 'false');
    state.shown = null;
  }

  function choose(state, row) {
    if (state.shown?.row === row) return;
    release(state);
    const button = row.querySelector('.us-party__select');
    const detail = row.querySelector('.us-party__detail');
    if (!button || !detail) return;
    detail.hidden = false;
    state.pane.replaceChildren(detail);
    // The theme's lead crown sits on avatars inside [data-us-contact-lead].
    // The row's lead and type travel with its detail: the theme's lead crown
    // and avatar colour, and which of crown or Make primary party shows.
    state.pane.setAttribute('data-us-contact-lead', row.getAttribute('data-us-contact-lead') || '');
    state.pane.setAttribute('data-us-contact-type', row.getAttribute('data-us-contact-type') || '');
    const name = row.querySelector('.us-party__name')?.textContent.trim();
    state.pane.setAttribute('aria-label', name ? 'Details for ' + name : 'Party details');
    button.setAttribute('aria-pressed', 'true');
    state.shown = {row, button, detail};
  }

  function firstChoice(set) {
    const list = rows(set);
    return list.find(row => /^(true|1)$/i.test(row.getAttribute('data-us-contact-lead') || '')) || list[0];
  }

  function attach(wrapper) {
    const body = wrapper.querySelector(':scope > .panel > .panel-body-container > .panel-body');
    const set = body?.querySelector(':scope > .QueryTemplateSet');
    if (!set) return;
    let state = states.get(wrapper);
    if (!state || !state.pane.isConnected || state.pane.parentElement !== body) {
      const pane = document.createElement('section');
      pane.className = 'us-parties__preview';
      pane.setAttribute('aria-live', 'polite');
      body.append(pane);
      state = {body, pane, set, shown: null, selecting: false, selected: new Set()};
      states.set(wrapper, state);
    }
    toolbar(state, wrapper, body, set);
    body.classList.add('us-parties__columns');
    body.parentElement.classList.add('us-parties__layout');
    // Rows replaced by a refresh: the shown detail belongs to a row that
    // is gone, so choose again.
    state.set = set;
    if (state.shown && !set.contains(state.shown.row)) {
      release(state);
      state.pane.replaceChildren();
    }
    if (!state.shown) {
      const row = firstChoice(set);
      if (row) choose(state, row);
    }
    state.pane.hidden = !rows(set).length;
    syncChecks(state);
    scope(state);
  }

  // The list's toolbar, above the rows: search, send, and who it sends to.
  function toolbar(state, wrapper, body, set) {
    if (!state.toolbar || !state.toolbar.isConnected) {
      const bar = document.createElement('div');
      bar.className = 'us-parties__toolbar';
      const send = document.createElement('button');
      send.type = 'button';
      send.className = 'us-parties__send us-action-cases-email-parties';
      const pick = document.createElement('button');
      pick.type = 'button';
      // An icon button, as the theme draws the toolbar's email icon.
      pick.className = 'TextButton us-icon-button us-parties__pick';
      pick.setAttribute('aria-pressed', 'false');
      pick.setAttribute('aria-label', 'Select parties to email');
      pick.title = 'Select parties to email';
      pick.innerHTML = '<i class="ti ti-checkbox" aria-hidden="true"></i>';
      // The line under the toolbar: its text, and, while selecting, Select
      // all and Clear. Built once; later only its text and buttons change.
      const note = document.createElement('p');
      note.className = 'us-parties__scope';
      const text = document.createElement('span');
      text.setAttribute('aria-live', 'polite');
      const all = document.createElement('button');
      all.type = 'button';
      all.className = 'us-parties__scope-action';
      all.dataset.usPick = 'all';
      all.textContent = 'Select all';
      const none = document.createElement('button');
      none.type = 'button';
      none.className = 'us-parties__scope-action';
      none.dataset.usPick = 'none';
      none.textContent = 'Clear';
      note.append(text, all, none);
      bar.append(pick, send);
      state.toolbar = bar;
      state.note = note;
      state.noteText = text;
      state.pick = pick;
      state.pickAll = all;
      state.pickNone = none;
    }
    if (state.toolbar.nextElementSibling !== state.note || state.note.nextElementSibling !== set) {
      body.insertBefore(state.toolbar, set);
      body.insertBefore(state.note, set);
    }
    // The theme builds its search after the rows arrive, folded behind the
    // heading's funnel; the field comes here, before the send button.
    const field = wrapper.querySelector(':scope > .panel > .us-query-search-controls .us-query-search-field');
    if (field) {
      state.toolbar.querySelectorAll(':scope > .us-query-search-field').forEach(old => old.remove());
      state.toolbar.prepend(field);
    }
    // The search marks the rows it hides; follow it for the scope line.
    if (state.watched !== set) {
      state.watcher?.disconnect();
      state.watcher = new MutationObserver(() => scope(state));
      state.watcher.observe(set, {subtree: true, attributes: true, attributeFilter: ['data-us-query-search-hidden', 'hidden']});
      state.watched = set;
    }
  }

  const ordinalOf = row => (row.getAttribute('data-us-contact-ordinal') || '').trim();
  const shownRows = state => rows(state.set).filter(row => {
    const section = row.closest('section');
    return !section.hidden && !section.hasAttribute('data-us-query-search-hidden');
  });

  function scope(state) {
    if (!state.note) return;
    const total = rows(state.set).length;
    const shown = shownRows(state).length;
    let text;
    if (!total) text = '';
    else if (state.selecting) {
      const count = state.selected.size;
      text = count ? count + ' of ' + total + ' selected' : 'Tick who to email';
    } else if (shown === total) {
      text = total + (total === 1 ? ' party' : ' parties') + ' · Email sends to ' + (total === 1 ? 'them' : 'all');
    } else {
      text = shown + ' of ' + total + ' shown · Email sends to ' + (shown === 1 ? 'the one shown' : 'those shown');
    }
    if (state.noteText.textContent !== text) state.noteText.textContent = text;
    state.pickAll.hidden = !state.selecting || shownRows(state).every(row => state.selected.has(ordinalOf(row)));
    state.pickNone.hidden = !state.selecting || !state.selected.size;
  }

  // While selecting, a checkbox on each card, ticked from the selection.
  // Rows replaced by a refresh get theirs again; a ticked ordinal no longer
  // on the case leaves the selection.
  function syncChecks(state) {
    state.body.classList.toggle('us-parties--selecting', state.selecting);
    const present = new Set();
    rows(state.set).forEach(row => {
      const ordinal = ordinalOf(row);
      present.add(ordinal);
      let box = row.querySelector(':scope > .us-party__check');
      if (!state.selecting) {
        box?.remove();
        return;
      }
      if (!box) {
        box = document.createElement('input');
        box.type = 'checkbox';
        box.className = 'us-party__check';
        const name = row.querySelector('.us-party__name')?.textContent.trim() || 'party';
        box.setAttribute('aria-label', 'Select ' + name);
        row.prepend(box);
      }
      box.checked = state.selected.has(ordinal);
    });
    state.selected.forEach(ordinal => { if (!present.has(ordinal)) state.selected.delete(ordinal); });
  }

  function setSelecting(state, on) {
    state.selecting = on;
    if (!on) state.selected.clear();
    state.pick.setAttribute('aria-pressed', String(on));
    syncChecks(state);
    scope(state);
  }


  function refresh() {
    queued = false;
    document.querySelectorAll(SELECTOR).forEach(attach);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  document.addEventListener('click', event => {
    const pick = event.target.closest('.us-parties__pick, .us-parties__scope-action');
    const pickState = pick && states.get(pick.closest(SELECTOR));
    if (pickState) {
      if (pick.classList.contains('us-parties__pick')) setSelecting(pickState, !pickState.selecting);
      else {
        if (pick.dataset.usPick === 'all') shownRows(pickState).forEach(row => pickState.selected.add(ordinalOf(row)));
        else pickState.selected.clear();
        syncChecks(pickState);
        scope(pickState);
      }
      return;
    }
    const button = event.target.closest('.us-party__select');
    const wrapper = button?.closest(SELECTOR);
    const state = wrapper && states.get(wrapper);
    if (!state) return;
    choose(state, button.closest('.us-party'));
    // Stacked (a narrow panel), the card is under the list and may be out
    // of sight, so a press brings it into view.
    const pane = state.pane.getBoundingClientRect();
    const stacked = pane.top >= state.set.getBoundingClientRect().bottom;
    if (stacked && (pane.top < 0 || pane.top > window.innerHeight * .6)) {
      state.pane.scrollIntoView({block: 'start', behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'});
    }
  });

  document.addEventListener('change', event => {
    const box = event.target.closest('.us-party__check');
    const state = box && states.get(box.closest(SELECTOR));
    if (!state) return;
    const ordinal = ordinalOf(box.closest('.us-party'));
    if (box.checked) state.selected.add(ordinal);
    else state.selected.delete(ordinal);
    scope(state);
  });

  // Rows arrive with the page and again with an in-place refresh. Changes
  // inside the preview (the details loading) are its own and are ignored.
  new MutationObserver(records => {
    if (records.some(record => !record.target.closest?.('.us-parties__preview') &&
      [...record.addedNodes].some(node => node.nodeType === 1))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});

  window.UnionSuiteCaseParties = Object.freeze({refresh});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
