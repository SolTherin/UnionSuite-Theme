/* US-MILESTONE-TASKS (candidate) — tasks linked to milestones (stages) on a
   us-milestones--tasks list (owner, 6 October 2026; option 7 in
   milestones-compare.html, built on option 6).
   - Each stage says how far its tasks have got ("2 of 5 tasks · 1 overdue"),
     from the row's data-us-milestone-tasks, -tasks-done and -tasks-overdue.
   - Clicking the stage (anywhere but its status icon and pencil) opens its
     tasks under it. They load once, from the Milestone Tasks IQA through
     /api/query (named filter MilestoneOrdinal). No stage opens by itself:
     the full Tasks panel sits beside the list on the page.
   - Open tasks come first; done ones are grouped after them behind
     "n done" (folded when there are three or more). Ticking a task saves
     through /ca/complete-task, as on the Tasks panel, then moves it to the
     other group; the counts and the progress bar follow. A task past its
     due date says "Overdue". Each task has a pencil for the full task
     (agreements.edit-stage-task, NoteDetails).
   - When the last open task is ticked, the stage offers "Complete stage"
     (through UnionSuiteMilestones.setStatus, in the theme); it is never automatic.
   - The foot of the list adds a task to the stage: type and press Enter.
     The task shows at once and is saved through the proposed CloudToolz
     /ca/quick-add-task; a failed add takes it away and keeps the text.
     Opening a stage with no tasks puts the cursor there.
   - Reordering (US-MILESTONE-ORDER) closes the stages and waits.
   Load after zUnionSuite.js, ActionDefinitions.js and the other milestone
   candidates. Target in the theme: zUnionSuite.js beside US-MILESTONES. */
(function () {
  'use strict';
  if (window.UnionSuiteMilestoneTasks) return;

  const wrapperSelector = '.us-milestones.us-milestones--tasks';
  // Proposed path; a data-us-milestone-tasks-query on the iPart wrapper or
  // the page overrides it.
  const DEFAULT_QUERY = '$/_i4u_/Core/CA/v2/Milestone Tasks';
  // Done tasks start folded from this many.
  const FOLD_DONE_FROM = 3;
  const easing = 'cubic-bezier(.2, 0, 0, 1)';
  const tick = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="m5 12 4 4L19 6"/></svg>';
  const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  const loaded = new WeakMap();
  let sequence = 0;

  const fold = (element, open) => window.UnionSuiteRecordCards?.fold
    ? window.UnionSuiteRecordCards.fold(element, open)
    : (element.hidden = !open, Promise.resolve());
  const token = () => document.getElementById('__RequestVerificationToken')?.value || '';
  const titleOf = milestone => milestone.querySelector('.us-milestone__title')?.textContent.trim() || 'Milestone';
  const ordinalOf = milestone => (milestone.getAttribute('data-us-milestone-ordinal') || '').trim();
  const statusOf = milestone => (milestone.getAttribute('data-us-milestone-status') || '').trim();
  const numberOf = (milestone, name) => Math.max(0, Number(milestone.getAttribute(name)) || 0);
  const subOf = milestone => milestone.nextElementSibling?.matches('.us-milestone__subtasks') ? milestone.nextElementSibling : null;
  const stageOf = sub => sub.previousElementSibling;
  const reordering = element => Boolean(element.closest('[data-us-milestones-reordering]'));
  const plural = (count, word) => count + ' ' + word + (count === 1 ? '' : 's');

  // /api/query rows are flat alias-keyed objects; older answers wrap them
  // in Properties.
  function field(row, name) {
    if (row && name in row) return row[name];
    const property = row?.Properties?.$values?.find(item => item.Name === name);
    return property?.Value?.$value ?? property?.Value ?? '';
  }

  // ── Due dates ──────────────────────────────────────────────────
  // Task dates come as the IQA shows them (dd/mm/yyyy). Today is the
  // page's, or the theme's fixed date in a preview.

  function parseDate(text) {
    const match = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(text || '').trim());
    return match ? new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1])) : null;
  }

  function today() {
    const fixed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(window.UnionSuiteQueryStatesConfig?.today || '');
    const date = fixed ? new Date(Number(fixed[1]), Number(fixed[2]) - 1, Number(fixed[3])) : new Date();
    date.setHours(0, 0, 0, 0);
    return date;
  }

  function isOverdue(item) {
    if (item.getAttribute('data-done') === 'true') return false;
    const due = parseDate(item.getAttribute('data-deadline'));
    return Boolean(due && due < today());
  }

  // ── Counts ─────────────────────────────────────────────────────

  function showCounts(milestone) {
    const total = numberOf(milestone, 'data-us-milestone-tasks');
    const done = Math.min(total, numberOf(milestone, 'data-us-milestone-tasks-done'));
    const overdue = numberOf(milestone, 'data-us-milestone-tasks-overdue');
    const text = milestone.querySelector('.us-milestone__tasks');
    if (!text) return;
    text.textContent = total ? done + ' of ' + plural(total, 'task') : 'No tasks';
    let late = milestone.querySelector('.us-milestone__overdue');
    if (!late) {
      late = document.createElement('span');
      late.className = 'us-milestone__overdue';
      text.after(late);
    }
    late.textContent = overdue ? overdue + ' overdue' : '';
  }

  // Once a stage's tasks are loaded they are the truth, and the row's
  // counts are taken from them.
  function recount(milestone) {
    const sub = subOf(milestone);
    if (sub && loaded.has(milestone)) {
      const items = [...sub.querySelectorAll('.us-milestone-task:not([data-us-leaving])')];
      milestone.setAttribute('data-us-milestone-tasks', String(items.length));
      milestone.setAttribute('data-us-milestone-tasks-done', String(items.filter(item => item.getAttribute('data-done') === 'true').length));
      milestone.setAttribute('data-us-milestone-tasks-overdue', String(items.filter(isOverdue).length));
      syncGroups(sub);
      showPrompt(milestone);
    }
    showCounts(milestone);
    // The progress bar's in-progress segment fills with the stage's tasks.
    window.UnionSuiteMilestones?.refresh();
  }

  // ── The task list under a stage ────────────────────────────────

  function buildSub(milestone) {
    const id = 'us-milestone-tasks-' + (++sequence);
    const sub = document.createElement('div');
    sub.className = 'us-milestone__subtasks';
    sub.id = id;
    sub.hidden = true;
    sub.setAttribute('role', 'region');
    sub.setAttribute('aria-label', 'Tasks for ' + titleOf(milestone));
    sub.innerHTML =
      '<ul class="us-milestone__task-list us-milestone__task-list--open"></ul>' +
      '<div class="us-milestone__done-group" hidden>' +
        '<button type="button" class="us-milestone__done-toggle" aria-expanded="true">' +
          '<span class="us-milestone__done-icon" aria-hidden="true"></span>' +
          '<span class="us-milestone__done-text"></span>' +
          '<span class="us-milestone__done-action"></span>' +
        '</button>' +
        '<ul class="us-milestone__task-list us-milestone__task-list--done"></ul>' +
      '</div>' +
      '<p class="us-milestone__task-state" role="status"></p>' +
      '<div class="us-milestone__complete-prompt" hidden>' +
        '<span class="us-milestone__complete-text">All tasks done.</span>' +
        '<button type="button" class="TextButton us-milestone__complete-button">Complete stage</button>' +
      '</div>' +
      '<form class="us-milestone__quick-add" novalidate>' +
        '<span class="us-milestone__quick-add-icon" aria-hidden="true"></span>' +
        '<input type="text" class="us-milestone__quick-add-input" autocomplete="off" maxlength="250">' +
        '<button type="submit" class="TextButton us-outline-button us-milestone__quick-add-button" disabled>Add</button>' +
      '</form>';
    const input = sub.querySelector('input');
    input.placeholder = 'Add a task to ' + titleOf(milestone);
    input.setAttribute('aria-label', 'New task for ' + titleOf(milestone));
    sub.querySelector('.us-milestone__done-toggle').setAttribute('aria-controls', id + '-done');
    sub.querySelector('.us-milestone__task-list--done').id = id + '-done';
    sub.querySelector('.us-milestone__complete-button').setAttribute('aria-label', 'Complete stage: ' + titleOf(milestone));
    milestone.after(sub);
    milestone.querySelector('.us-milestone__expand')?.setAttribute('aria-controls', id);
    return sub;
  }

  function say(sub, message, {error = false, retry = false} = {}) {
    const state = sub.querySelector('.us-milestone__task-state');
    state.replaceChildren(message);
    state.toggleAttribute('data-us-error', error);
    if (retry) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'us-milestone__task-retry';
      button.textContent = 'Try again';
      state.append(' ', button);
    }
  }

  function writeMeta(item) {
    const meta = item.querySelector('.us-milestone-task__meta');
    meta.replaceChildren();
    const assignedTo = item.getAttribute('data-assigned-to');
    const deadline = item.getAttribute('data-deadline');
    const parts = [];
    if (assignedTo) parts.push(document.createTextNode(assignedTo));
    if (deadline) {
      const date = document.createElement('span');
      date.className = 'us-milestone-task__date';
      date.textContent = deadline;
      parts.push(date);
    }
    parts.forEach((part, index) => {
      if (index) meta.append(' · ');
      meta.append(part);
    });
    // "Overdue" in words, so it does not rest on the red alone.
    if (isOverdue(item)) {
      const late = document.createElement('span');
      late.className = 'us-milestone-task__overdue';
      late.textContent = 'Overdue';
      meta.append(' · ', late);
    }
    item.toggleAttribute('data-overdue', isOverdue(item));
    meta.hidden = !meta.childNodes.length;
  }

  function taskRow({ordinal, note, done, assignedTo, deadline}) {
    const item = document.createElement('li');
    item.className = 'us-milestone-task';
    item.setAttribute('data-ordinal', ordinal);
    item.setAttribute('data-done', String(done));
    item.setAttribute('data-assigned-to', String(assignedTo || '').trim());
    item.setAttribute('data-deadline', String(deadline || '').trim());
    const check = document.createElement('button');
    check.type = 'button';
    check.className = 'us-milestone-task__check';
    check.setAttribute('role', 'checkbox');
    check.setAttribute('aria-checked', String(done));
    check.setAttribute('aria-label', 'Complete task: ' + note);
    check.innerHTML = tick;
    const copy = document.createElement('span');
    copy.className = 'us-milestone-task__copy';
    const title = document.createElement('span');
    title.className = 'us-milestone-task__title';
    title.textContent = note;
    const meta = document.createElement('span');
    meta.className = 'us-milestone-task__meta';
    copy.append(title, meta);
    // The pencil opens the full task, as everywhere on the page.
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'us-action-agreements-edit-stage-task us-milestone-task__edit';
    edit.setAttribute('data-ordinal', ordinal);
    item.append(check, copy, edit);
    writeMeta(item);
    return item;
  }

  // The done group: "3 done", with Show or Hide.
  function syncGroups(sub) {
    const group = sub.querySelector('.us-milestone__done-group');
    const toggle = group.querySelector('.us-milestone__done-toggle');
    const count = group.querySelectorAll('.us-milestone-task:not([data-us-leaving])').length;
    const open = toggle.getAttribute('aria-expanded') === 'true';
    group.hidden = !count;
    group.querySelector('.us-milestone__done-text').textContent = count + ' done';
    group.querySelector('.us-milestone__done-action').textContent = open ? 'Hide' : 'Show';
  }

  async function setDoneOpen(sub, open) {
    const toggle = sub.querySelector('.us-milestone__done-toggle');
    toggle.setAttribute('aria-expanded', String(open));
    syncGroups(sub);
    await fold(sub.querySelector('.us-milestone__task-list--done'), open);
  }

  async function load(milestone, sub, {focusEmpty = false} = {}) {
    const openList = sub.querySelector('.us-milestone__task-list--open');
    const doneList = sub.querySelector('.us-milestone__task-list--done');
    say(sub, 'Loading tasks…');
    sub.setAttribute('aria-busy', 'true');
    try {
      const query = milestone.closest('[data-us-milestone-tasks-query]')?.getAttribute('data-us-milestone-tasks-query') || DEFAULT_QUERY;
      const params = new URLSearchParams({QueryName: query, limit: '100', offset: '0'});
      params.set('MilestoneOrdinal', ordinalOf(milestone));
      const response = await fetch('/api/query?' + params, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {Accept: 'application/json', RequestVerificationToken: token()}
      });
      if (!response.ok) throw new Error('The stage\'s tasks could not be loaded (HTTP ' + response.status + ').');
      const data = await response.json();
      const rows = data?.Items?.$values ?? data?.Items ?? [];
      const items = rows.map(row => taskRow({
        ordinal: String(field(row, 'Ordinal')),
        note: String(field(row, 'Note')),
        done: /^(1|true|done|complete)$/i.test(String(field(row, 'Done')).trim()),
        assignedTo: field(row, 'AssignedTo'),
        deadline: field(row, 'Deadline')
      }));
      // Open tasks first, done ones after, each in the IQA's order.
      openList.replaceChildren(...items.filter(item => item.getAttribute('data-done') !== 'true'));
      doneList.replaceChildren(...items.filter(item => item.getAttribute('data-done') === 'true'));
      const foldDone = doneList.children.length >= FOLD_DONE_FROM;
      sub.querySelector('.us-milestone__done-toggle').setAttribute('aria-expanded', String(!foldDone));
      doneList.hidden = foldDone;
      loaded.set(milestone, true);
      recount(milestone);
      say(sub, items.length ? '' : 'No tasks for this stage yet.');
      if (focusEmpty && !items.length) sub.querySelector('.us-milestone__quick-add-input').focus({preventScroll: true});
    } catch (error) {
      console.warn(error.message);
      say(sub, 'Tasks could not be loaded.', {error: true, retry: true});
    } finally {
      sub.removeAttribute('aria-busy');
    }
  }

  async function setOpen(milestone, open, {focusEmpty = false} = {}) {
    const button = milestone.querySelector('.us-milestone__expand');
    if (!button) return;
    const sub = subOf(milestone) || (open ? buildSub(milestone) : null);
    button.setAttribute('aria-expanded', String(open));
    if (!sub) return;
    if (open && !loaded.has(milestone)) {
      if (sub.getAttribute('aria-busy') !== 'true') void load(milestone, sub, {focusEmpty});
    } else if (open && focusEmpty && !sub.querySelector('.us-milestone-task')) {
      sub.querySelector('.us-milestone__quick-add-input').focus({preventScroll: true});
    }
    await fold(sub, open);
  }

  // ── The completion prompt ──────────────────────────────────────
  // Shown while every task is done and the stage is not complete.

  function showPrompt(milestone) {
    const sub = subOf(milestone);
    if (!sub || !loaded.has(milestone)) return;
    const prompt = sub.querySelector('.us-milestone__complete-prompt');
    const total = numberOf(milestone, 'data-us-milestone-tasks');
    const allDone = total > 0 && numberOf(milestone, 'data-us-milestone-tasks-done') >= total;
    const wanted = allDone && statusOf(milestone).toLowerCase() !== 'complete';
    if (prompt.hidden === !wanted) return;
    void fold(prompt, wanted);
  }

  // ── Ticking a task ─────────────────────────────────────────────

  // Moves a task to the other group. With the done group folded, a done
  // task folds away into it; otherwise every task slides to its new place.
  async function regroup(item, done) {
    const sub = item.closest('.us-milestone__subtasks');
    const target = sub.querySelector(done ? '.us-milestone__task-list--done' : '.us-milestone__task-list--open');
    if (item.parentElement === target) return;
    const doneOpen = sub.querySelector('.us-milestone__done-toggle').getAttribute('aria-expanded') === 'true';
    if (done && !doneOpen) {
      item.setAttribute('data-us-leaving', '');
      syncGroups(sub);
      await fold(item, false);
      item.removeAttribute('data-us-leaving');
      target.prepend(item);
      item.hidden = false;
      syncGroups(sub);
      return;
    }
    const moving = [...sub.querySelectorAll('.us-milestone-task, .us-milestone__done-toggle')];
    const before = new Map(moving.map(node => [node, node.getBoundingClientRect().top]));
    if (done) target.prepend(item);
    else target.append(item);
    syncGroups(sub);
    if (reducedMotion()) return;
    moving.forEach(node => {
      const delta = before.get(node) - node.getBoundingClientRect().top;
      if (Math.abs(delta) >= 1 && node.animate && node.getClientRects().length) {
        node.animate([{transform: `translateY(${delta}px)`}, {transform: 'none'}], {duration: 260, easing});
      }
    });
  }

  async function toggleTask(check) {
    const item = check.closest('.us-milestone-task');
    const sub = item.closest('.us-milestone__subtasks');
    const milestone = stageOf(sub);
    if (item.getAttribute('aria-busy') === 'true') return;
    const done = item.getAttribute('data-done') !== 'true';
    const ordinal = item.getAttribute('data-ordinal');
    item.setAttribute('aria-busy', 'true');
    item.setAttribute('data-done', String(done));
    check.setAttribute('aria-checked', String(done));
    writeMeta(item);
    recount(milestone);
    const celebration = done ? window.UnionSuiteTaskRows?.celebrate?.(check) : null;
    let saved = true;
    try {
      if (!/^\d+$/.test(ordinal)) throw new Error('The task has not been saved yet.');
      await window.UnionSuiteAgreements.saveItemStatus(ordinal, done ? 'Complete' : 'Not Complete', 'Task');
    } catch (error) {
      saved = false;
      console.warn(error.message);
    }
    await celebration;
    item.removeAttribute('aria-busy');
    if (!saved) {
      item.setAttribute('data-done', String(!done));
      check.setAttribute('aria-checked', String(!done));
      writeMeta(item);
      recount(milestone);
      say(sub, 'Not saved. Try again.', {error: true});
      return;
    }
    await regroup(item, done);
    recount(milestone);
  }

  // ── Adding a task ──────────────────────────────────────────────

  async function addTask(form) {
    const sub = form.closest('.us-milestone__subtasks');
    const milestone = stageOf(sub);
    const input = form.querySelector('input');
    const button = form.querySelector('button');
    const note = input.value.replace(/\s+/g, ' ').trim();
    if (!note) return;
    const list = sub.querySelector('.us-milestone__task-list--open');
    const item = taskRow({ordinal: 'new-' + (++sequence), note, done: false});
    item.setAttribute('aria-busy', 'true');
    item.hidden = true;
    list.append(item);
    void fold(item, true);
    input.value = '';
    button.disabled = true;
    say(sub, '');
    recount(milestone);
    try {
      if (!window.UnionSuiteAgreements?.cloudToolz) throw new Error('The agreement actions are not loaded.');
      const agreementId = new URLSearchParams(location.search).get('AgreementID') || '';
      const response = await window.UnionSuiteAgreements.cloudToolz('/ca/quick-add-task', {
        method: 'POST',
        body: JSON.stringify({AgreementID: agreementId, MilestoneOrdinal: ordinalOf(milestone), Note: note})
      });
      const data = await response.json().catch(() => ({}));
      if (data?.Ordinal) {
        item.setAttribute('data-ordinal', String(data.Ordinal));
        item.querySelector('.us-milestone-task__edit').setAttribute('data-ordinal', String(data.Ordinal));
      }
      item.removeAttribute('aria-busy');
      say(sub, 'Task added.');
      setTimeout(() => {
        if (sub.querySelector('.us-milestone__task-state').textContent === 'Task added.') say(sub, '');
      }, 4000);
    } catch (error) {
      console.warn(error.message);
      item.setAttribute('data-us-leaving', '');
      recount(milestone);
      await fold(item, false);
      item.remove();
      // The text comes back so nothing typed is lost.
      if (!input.value) input.value = note;
      button.disabled = !input.value.trim();
      say(sub, 'Not added. Try again.', {error: true});
    }
  }

  // ── The task pencil ────────────────────────────────────────────
  // The full task in NoteDetails, as the Tasks panel opens it; closing it
  // reloads the stage's tasks, since the task may have changed.
  const actions = window.UnionSuiteActions;
  if (actions?.define) {
    const agreementId = {from: 'query', parameter: 'AgreementID', required: true, validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid agreement ID.'};
    const rowOrdinal = {from: 'trigger', attribute: 'data-ordinal', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid record ordinal.'};
    try {
      actions.define('agreements.edit-stage-task', {
        className: 'us-action-agreements-edit-stage-task',
        owner: 'UnionSuite',
        source: 'milestone-tasks.candidate.js:agreements.edit-stage-task',
        presentation: {label: 'Edit task', icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'},
        context: {agreementId, ordinal: rowOrdinal},
        action: {
          type: 'popup',
          recordKey: ['agreementId', 'ordinal'],
          href: ({context}) => {
            const url = new URL('/_i4u_/Core/Zidebar/NoteDetails.aspx', location.origin);
            url.searchParams.set('NoteOrdinal', context.ordinal);
            url.searchParams.set('AgreementID', context.agreementId);
            url.searchParams.set('Task', 'true');
            return url.href;
          },
          popup: {title: 'Task', width: '90%', height: '90%', maxWidth: 800},
          refresh: {when: 'close', run: env => {
            const sub = env.trigger?.closest('.us-milestone__subtasks');
            if (sub) return load(stageOf(sub), sub);
          }}
        }
      });
    } catch (error) {
      console.warn('agreements.edit-stage-task is already defined.');
    }
  }

  // ── Events ─────────────────────────────────────────────────────

  document.addEventListener('click', event => {
    const retry = event.target.closest(wrapperSelector + ' .us-milestone__task-retry');
    if (retry) {
      const sub = retry.closest('.us-milestone__subtasks');
      void load(stageOf(sub), sub);
      return;
    }
    const check = event.target.closest(wrapperSelector + ' .us-milestone-task__check');
    if (check) {
      void toggleTask(check);
      return;
    }
    const doneToggle = event.target.closest(wrapperSelector + ' .us-milestone__done-toggle');
    if (doneToggle) {
      void setDoneOpen(doneToggle.closest('.us-milestone__subtasks'), doneToggle.getAttribute('aria-expanded') !== 'true');
      return;
    }
    const complete = event.target.closest(wrapperSelector + ' .us-milestone__complete-button');
    if (complete) {
      const milestone = stageOf(complete.closest('.us-milestone__subtasks'));
      complete.disabled = true;
      Promise.resolve(window.UnionSuiteMilestones?.setStatus?.(milestone, 'Complete', complete))
        .finally(() => { complete.disabled = false; });
      return;
    }
    // The whole stage opens its tasks, except its own controls.
    const milestone = event.target.closest(wrapperSelector + ' .us-milestone');
    if (!milestone || reordering(milestone) || milestone.closest('.us-report-no-styling')) return;
    if (event.target.closest('button:not(.us-milestone__expand), a, input, select')) return;
    const button = milestone.querySelector('.us-milestone__expand');
    if (button) void setOpen(milestone, button.getAttribute('aria-expanded') !== 'true', {focusEmpty: true});
  });

  document.addEventListener('submit', event => {
    const form = event.target.closest?.(wrapperSelector + ' .us-milestone__quick-add');
    if (!form) return;
    event.preventDefault();
    void addTask(form);
  });

  document.addEventListener('input', event => {
    const input = event.target.closest?.(wrapperSelector + ' .us-milestone__quick-add-input');
    if (input) input.form.querySelector('button').disabled = !input.value.trim();
  });

  document.addEventListener('keydown', event => {
    const input = event.target.closest?.(wrapperSelector + ' .us-milestone__quick-add-input');
    if (input && event.key === 'Escape' && input.value) {
      event.preventDefault();
      input.value = '';
      input.form.querySelector('button').disabled = true;
    }
  });

  // Reordering closes every open stage and keeps them shut until it ends;
  // a stage's status changing shows or hides its completion prompt.
  new MutationObserver(records => records.forEach(record => {
    const target = record.target;
    if (record.attributeName === 'data-us-milestone-status') {
      if (target.matches?.(wrapperSelector + ' .us-milestone')) showPrompt(target);
      return;
    }
    if (!target.matches?.(wrapperSelector)) return;
    const on = target.hasAttribute('data-us-milestones-reordering');
    target.querySelectorAll('.us-milestone').forEach(milestone => {
      const button = milestone.querySelector('.us-milestone__expand');
      if (!button) return;
      button.inert = on;
      if (on && button.getAttribute('aria-expanded') === 'true') void setOpen(milestone, false);
    });
  })).observe(document.documentElement, {subtree: true, attributes: true, attributeFilter: ['data-us-milestones-reordering', 'data-us-milestone-status']});

  // ── Option 7's additions to the theme's bar and status menu ──────
  // The theme (US-MILESTONES) knows nothing of tasks. Here the bar's
  // in-progress segment fills with its stage's tasks (--us-segment-fill),
  // and the status menu says "n tasks still open" under Complete: a
  // nudge, not a block. Both follow the theme's own redraws.

  function fillBar(wrapper) {
    const rows = [...wrapper.querySelectorAll('.QueryTemplateSet .us-milestone')];
    wrapper.querySelectorAll('.us-milestones__segment').forEach(segment => {
      const row = rows[Number(segment.getAttribute('data-us-milestone-index'))];
      const total = row ? numberOf(row, 'data-us-milestone-tasks') : 0;
      const done = row ? Math.min(total, numberOf(row, 'data-us-milestone-tasks-done')) : 0;
      if (total > 0) segment.style.setProperty('--us-segment-fill', Math.round(done / total * 100) + '%');
      else segment.style.removeProperty('--us-segment-fill');
    });
  }

  function noteMenu(menu) {
    if (menu.hidden) return;
    const button = document.querySelector(wrapperSelector + ' .us-milestone__status-button[aria-expanded="true"]');
    const complete = menu.querySelector('.us-term-status-menu__item[data-us-milestone-status="Complete" i]');
    let note = menu.querySelector('.us-milestone-status-menu__note');
    if (!button || !complete) {
      if (note) note.hidden = true;
      return;
    }
    if (!note) {
      note = document.createElement('div');
      note.className = 'us-milestone-status-menu__note';
      note.id = 'us-milestone-status-note';
      complete.after(note);
      complete.setAttribute('aria-describedby', note.id);
    }
    const milestone = button.closest('.us-milestone');
    const stillOpen = Math.max(0, numberOf(milestone, 'data-us-milestone-tasks') - numberOf(milestone, 'data-us-milestone-tasks-done'));
    note.hidden = !stillOpen || statusOf(milestone).toLowerCase() === 'complete';
    note.textContent = plural(stillOpen, 'task') + ' still open';
  }

  new MutationObserver(records => {
    const wrappers = new Set();
    records.forEach(record => {
      const target = record.target;
      if (record.type === 'attributes' && record.attributeName === 'hidden' && target.matches?.('.us-milestone-status-menu')) {
        noteMenu(target);
        return;
      }
      if (target.matches?.('.us-milestones__segment, .us-milestones__segments')) {
        const wrapper = target.closest(wrapperSelector);
        if (wrapper) wrappers.add(wrapper);
      }
    });
    wrappers.forEach(fillBar);
  }).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'data-us-milestone-index']});

  // Counts on rows as they arrive (first load, a CCO tab, a refresh).
  // Stages open only when clicked (owner, 6 October 2026: the full Tasks
  // panel sits beside Milestones on the page, so none opens by itself).
  function syncAll() {
    document.querySelectorAll(wrapperSelector + ' .us-milestone').forEach(showCounts);
  }

  // On the first load the rows can arrive before the section preset
  // (us-agreement-milestones) adds us-milestones; us:panel-actions-ready
  // follows that expansion.
  document.addEventListener('us:panel-actions-ready', () => schedule());
  let scheduled = false;
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      syncAll();
    });
  }
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 &&
      (node.matches('.us-milestone') || node.querySelector('.us-milestone'))))) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', schedule, {once: true});
  else schedule();

  window.UnionSuiteMilestoneTasks = Object.freeze({version: '0.2-candidate'});
})();
