/* IQA "where used" drawer — mock-up behaviour.
   Fake index data and timings; no requests. The drawer markup lives in
   index.html, styles in where-used.css. Reveals use the theme's
   UnionSuiteRecordCards.fold from zUnionSuite.js. */
(function () {
  'use strict';

  /* ---------------------------------------------------------------------------
   * The six places the index reads, in display order. `readMs` is when each
   * finishes during a rebuild, after the dev tenant probes with system
   * content included and three sources read at a time.
   * ------------------------------------------------------------------------ */
  const SOURCES = [
    { id: 'CON', name: 'Content pages', icon: 'ti-file-text', readMs: 3500 },
    { id: 'BOD', name: 'Business object value lists', icon: 'ti-database', readMs: 9500 },
    { id: 'BOE', name: 'Panel source value lists', icon: 'ti-table', readMs: 5000 },
    { id: 'COM', name: 'Communication templates', icon: 'ti-mail', readMs: 4600 },
    { id: 'TASK', name: 'Alerts and Process Automation', icon: 'ti-bolt', readMs: 10200 },
    { id: 'IQD', name: 'Other IQAs', icon: 'ti-file-search', readMs: 12400 }
  ];

  // What the index says about Workbench List. `folder` marks a reference to a
  // folder that contains the IQA; `system` marks ASI-supplied content.
  const RESULTS = {
    CON: [
      { name: 'Workbench Dashboard', url: '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iOperation=Edit&iUniformKey=2aad5ea0-55eb-41ec-b8e4-3d8e3dc4e554', path: '@/_i4u_/Core/Membership/Workbenches/Workbench-Dashboard', how: 'Query Menu "WorkbenchList" uses this query', editor: 'the content page editor' },
      { name: 'Elements', url: '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iOperation=Edit&iUniformKey=ebc1039c-ddb4-4459-892b-34f7a4ecaef5', path: '@/i4u_Sandbox/Styling-Elements/Elements', how: 'Query Menu "WorkbenchList" uses this query', editor: 'the content page editor' },
      { name: 'Organiser Workbenches', url: '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iOperation=Edit&iUniformKey=5b1d0f6e-2f0b-4c55-9a51-0d6c0c2c7a10', path: '@/_i4u_/Core/Organiser Portal/Workbenches', how: 'Query Menu "Workbenches" lists every query in the folder', folder: '$/_i4u_/Core/Membership/Workbenches', editor: 'the content page editor' },
      { name: 'Staff dashboard sample', url: '/AsiCommon/Controls/ContentManagement/ContentDesigner/ContentRecordEdit.aspx?iMode=Edit&iOperation=Edit&iUniformKey=7c9e6a52-41d3-4f0a-8e8f-3a1f0b2d9c44', path: '@/iSamples/Staff/Dashboard', how: 'Query Menu "Lists" uses this query', system: true, editor: 'the content page editor' }
    ],
    BOD: [],
    BOE: [],
    COM: [],
    TASK: [
      { name: 'Workbench membership reminder', path: 'Process Automation task', how: 'Reads this query as its data source' }
    ],
    IQD: [
      { name: 'Workbench List - Export', url: '/iMIS/QueryBuilder/Design.aspx?iMode=Edit&iOperation=Edit&iUniformKey=0f4d2c6b-8a9e-4b1d-a3c5-6e7f8091a2b3', path: '$/_i4u_/Core/Membership/Workbenches/Workbench List - Export', how: 'Uses this query as a source', editor: 'the IQA designer' }
    ]
  };

  const BUILDER = 'HUBUSER';
  const FAILING_SOURCE = 'BOD';

  /* ---------------------------------------------------------------------------
   * State
   * ------------------------------------------------------------------------ */
  const state = {
    built: true,
    builtAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
    includeSystem: false,
    rebuilding: false,
    // Per source during a rebuild: 'reading', 'done' or 'failed'.
    progress: {},
    outcome: 'success',
    canEdit: true,
    saved: true,
    lastAttemptFailed: false
  };
  let timers = [];

  const drawer = document.getElementById('where-used');
  const button = document.getElementById('where-used-button');
  const title = document.getElementById('where-used-title');
  const summary = drawer.querySelector('.us-where-used__summary');
  const meta = drawer.querySelector('.us-where-used__meta');
  const body = drawer.querySelector('.us-where-used__body');
  const systemBox = document.getElementById('where-used-system');
  const helpToggle = drawer.querySelector('.us-where-used__help-toggle');
  const help = document.getElementById('where-used-help');
  const fold = (element, open) => window.UnionSuiteRecordCards?.fold
    ? window.UnionSuiteRecordCards.fold(element, open)
    : Promise.resolve(void (element.hidden = !open));

  /* ---------------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------------ */
  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function relativeTime(date) {
    const minutes = Math.round((Date.now() - date.getTime()) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return minutes + (minutes === 1 ? ' minute ago' : ' minutes ago');
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
    const days = Math.round(hours / 24);
    return days + (days === 1 ? ' day ago' : ' days ago');
  }

  const visible = item => state.includeSystem || !item.system;
  const visibleCount = id => RESULTS[id].filter(visible).length;
  const totalVisible = () => SOURCES.reduce((sum, source) => sum + visibleCount(source.id), 0);

  function toast(text) {
    let node = document.querySelector('.mock-toast');
    if (!node) {
      node = element('div', 'mock-toast');
      node.setAttribute('role', 'status');
      document.body.append(node);
    }
    node.textContent = text;
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.remove(), 2600);
  }

  /* ---------------------------------------------------------------------------
   * Rendering
   * ------------------------------------------------------------------------ */
  function renderCount(source) {
    const count = drawer.querySelector('[data-source="' + source.id + '"] .us-where-used__count');
    if (!count) return;
    const progress = state.progress[source.id];
    count.replaceChildren();
    if (progress === 'reading') {
      count.dataset.state = 'reading';
      const spinner = element('span', 'us-button-spinner');
      spinner.setAttribute('aria-hidden', 'true');
      count.append(spinner, document.createTextNode('Reading'));
      return;
    }
    if (progress === 'failed') {
      count.dataset.state = 'failed';
      count.textContent = "Couldn't read";
      return;
    }
    const found = visibleCount(source.id);
    count.dataset.state = found ? 'found' : 'none';
    count.textContent = found ? String(found) : 'None';
  }

  let pathCount = 0;

  function renderItem(item) {
    const row = element('li', 'us-where-used__item');
    if (item.system) row.dataset.system = '';
    const text = element('div', 'us-where-used__item-text');
    const name = element('span', 'us-where-used__name', item.name);
    if (item.system) {
      const tag = element('span', 'us-badge us-where-used__tag', 'ASI');
      name.append(tag);
    }
    const path = element('span', 'us-where-used__path', item.path);
    path.id = 'where-used-path-' + (++pathCount);
    text.append(name, path, element('span', 'us-where-used__how', item.how));
    row.append(text);

    const actions = element('div', 'us-where-used__actions');
    // Only document and content paths can be copied; a task has none.
    if (/^[$@]\//.test(item.path)) {
      const copy = element('button', 'us-copy');
      copy.type = 'button';
      copy.setAttribute('data-us-copy-target', path.id);
      copy.setAttribute('aria-label', 'Copy path of ' + item.name);
      copy.title = 'Copy path';
      actions.append(copy);
    }
    if (item.url) {
      const open = element('a', 'us-where-used__open-tab');
      open.href = item.url;
      open.target = '_blank';
      open.rel = 'noopener';
      open.setAttribute('aria-label', 'Open ' + item.name + ' in a new tab');
      open.title = 'Open in a new tab';
      const icon = element('i', 'ti ti-external-link');
      icon.setAttribute('aria-hidden', 'true');
      open.append(icon);
      // Mock-up only: the editors do not exist here.
      open.addEventListener('click', event => {
        event.preventDefault();
        toast('Would open ' + item.name + ' in ' + item.editor + ', in a new tab.');
      });
      actions.append(open);
    }
    if (actions.childElementCount) row.append(actions);
    row.hidden = !visible(item);
    return row;
  }

  function renderSource(source, withItems) {
    const section = element('section', 'us-where-used__source');
    section.dataset.source = source.id;
    const head = element('h3', 'us-where-used__source-head');
    const icon = element('i', 'ti ' + source.icon);
    icon.setAttribute('aria-hidden', 'true');
    head.append(icon, element('span', 'us-where-used__source-name', source.name), element('span', 'us-where-used__count'));
    section.append(head);

    const direct = RESULTS[source.id].filter(item => !item.folder);
    const viaFolder = RESULTS[source.id].filter(item => item.folder);
    const list = element('ul', 'us-where-used__items');
    direct.forEach(item => list.append(renderItem(item)));
    const folderGroup = element('div', 'us-where-used__folder-group');
    if (viaFolder.length) {
      const label = element('p', 'us-where-used__group-label', 'Uses the folder ');
      label.append(element('code', '', viaFolder[0].folder), document.createTextNode(', which contains this query'));
      const folderList = element('ul', 'us-where-used__items');
      viaFolder.forEach(item => folderList.append(renderItem(item)));
      folderGroup.append(label, folderList);
    }
    // A list with nothing to show stays closed, so a "None" row is one line.
    list.hidden = !withItems || !direct.some(visible);
    folderGroup.hidden = !withItems || !viaFolder.some(visible);
    section.append(list, folderGroup);
    return section;
  }

  function renderSources(withItems) {
    body.replaceChildren();
    SOURCES.forEach(source => body.append(renderSource(source, withItems)));
    const note = element('p', 'us-where-used__help', 'Not covered: Flowz workflows and theme script files.');
    note.style.margin = '12px 20px 0';
    body.append(note);
    SOURCES.forEach(renderCount);
  }

  function renderEmpty() {
    body.replaceChildren();
    const empty = element('div', 'us-where-used__empty');
    const icon = element('i', 'ti ti-sitemap');
    icon.setAttribute('aria-hidden', 'true');
    empty.append(icon, element('p', 'us-where-used__empty-title', 'No index yet'));
    if (state.canEdit) {
      empty.append(element('p', 'us-where-used__empty-text',
        'Build it once and everyone who opens an IQA can use it. It reads every page, value list, template, task and query, and takes about 15 seconds.'));
      const build = element('button', 'TextButton PrimaryButton', 'Build index');
      build.type = 'button';
      build.addEventListener('click', () => rebuild(true));
      empty.append(build);
    } else {
      empty.append(element('p', 'us-where-used__empty-text', 'Someone who can edit IQAs needs to build it first.'));
    }
    body.append(empty);
  }

  function rebuildButton(label) {
    const control = element('button', 'TextButton us-outline-button');
    control.type = 'button';
    const spinner = element('span', 'us-button-spinner');
    spinner.setAttribute('aria-hidden', 'true');
    spinner.hidden = !state.rebuilding;
    control.append(spinner, document.createTextNode(label));
    control.disabled = state.rebuilding;
    if (state.rebuilding) control.setAttribute('aria-busy', 'true');
    control.addEventListener('click', () => rebuild(!state.built));
    return control;
  }

  function renderStatus() {
    summary.removeAttribute('data-tone');
    meta.replaceChildren();
    const read = SOURCES.filter(source => ['done', 'failed'].includes(state.progress[source.id])).length;

    if (state.rebuilding) {
      summary.textContent = (state.built ? 'Rebuilding the index' : 'Building the index') + ' · ' + read + ' of ' + SOURCES.length + ' places read';
      meta.append(document.createTextNode('Results update as each place is read.'));
      return;
    }
    if (state.lastAttemptFailed) {
      summary.dataset.tone = 'warning';
      const failed = SOURCES.find(source => source.id === FAILING_SOURCE).name;
      summary.textContent = state.built
        ? 'Rebuild didn’t finish: ' + failed.toLowerCase() + ' couldn’t be read. The previous index is still in use.'
        : 'The index couldn’t be built: ' + failed.toLowerCase() + ' couldn’t be read. Nothing was saved.';
      if (state.built) meta.append(document.createTextNode('Index built ' + relativeTime(state.builtAt) + ' by ' + BUILDER));
      if (state.canEdit) meta.append(rebuildButton('Try again'));
      return;
    }
    if (!state.built) {
      summary.textContent = 'No index yet';
      return;
    }
    const total = totalVisible();
    summary.textContent = total
      ? 'Used in ' + total + (total === 1 ? ' place' : ' places')
      : 'No references found in the places checked';
    meta.append(document.createTextNode('Index built ' + relativeTime(state.builtAt) + ' by ' + BUILDER));
    if (state.canEdit) meta.append(rebuildButton('Rebuild'));
  }

  function render() {
    if (state.rebuilding) {
      // Reopened during a build: places already read show at once.
      renderSources(false);
      SOURCES.filter(source => state.progress[source.id] === 'done').forEach(source => revealSource(source.id, false));
    } else if (state.built) renderSources(true);
    else renderEmpty();
    renderStatus();
  }

  /* ---------------------------------------------------------------------------
   * Rebuild: the old results go at once (owner, 12 October 2026) and each
   * place refills as it is read.
   * ------------------------------------------------------------------------ */
  function hideResults() {
    body.querySelectorAll('.us-where-used__source > .us-where-used__items, .us-where-used__source > .us-where-used__folder-group')
      .forEach(group => { if (!group.hidden) fold(group, false); });
  }

  function rebuild(first) {
    if (state.rebuilding) return;
    timers.forEach(clearTimeout);
    timers = [];
    state.rebuilding = true;
    state.lastAttemptFailed = false;
    SOURCES.forEach(source => { state.progress[source.id] = 'reading'; });
    if (first) renderSources(false);
    else hideResults();
    SOURCES.forEach(renderCount);
    renderStatus();

    SOURCES.forEach(source => {
      timers.push(setTimeout(() => {
        const failed = state.outcome === 'fail' && source.id === FAILING_SOURCE;
        state.progress[source.id] = failed ? 'failed' : 'done';
        renderCount(source);
        if (!failed) revealSource(source.id);
        renderStatus();
        if (SOURCES.every(each => ['done', 'failed'].includes(state.progress[each.id]))) finishRebuild(first);
      }, source.readMs));
    });
  }

  function revealSource(id, animate = true) {
    const section = body.querySelector('[data-source="' + id + '"]');
    if (!section) return;
    const list = section.querySelector(':scope > .us-where-used__items');
    const folderGroup = section.querySelector(':scope > .us-where-used__folder-group');
    const show = node => (animate ? fold(node, true) : (node.hidden = false));
    if (list && RESULTS[id].some(item => !item.folder && visible(item))) show(list);
    if (folderGroup && RESULTS[id].some(item => item.folder && visible(item))) show(folderGroup);
  }

  function finishRebuild(first) {
    state.rebuilding = false;
    const failed = SOURCES.some(source => state.progress[source.id] === 'failed');
    state.lastAttemptFailed = failed;
    if (!failed) {
      state.built = true;
      state.builtAt = new Date();
      state.progress = {};
    } else if (!first) {
      // The previous index stays in use: the failed place shows its previous
      // results again, with its "Couldn't read" message.
      SOURCES.forEach(source => { if (state.progress[source.id] === 'done') delete state.progress[source.id]; });
      revealSource(FAILING_SOURCE);
    }
    SOURCES.forEach(renderCount);
    renderStatus();
  }

  /* ---------------------------------------------------------------------------
   * Drawer: an overlay from the right; it never moves the designer.
   * ------------------------------------------------------------------------ */
  function openDrawer() {
    if (button.getAttribute('aria-disabled') === 'true') return;
    if (!drawer.hasAttribute('data-closed')) return;
    render();
    drawer.removeAttribute('data-closed');
    button.setAttribute('aria-expanded', 'true');
    title.focus({ preventScroll: true });
  }

  function closeDrawer() {
    if (drawer.hasAttribute('data-closed')) return;
    const hadFocus = drawer.contains(document.activeElement);
    drawer.setAttribute('data-closed', '');
    button.setAttribute('aria-expanded', 'false');
    // A rebuild carries on while the drawer is closed; reopening shows it.
    if (hadFocus) button.focus({ preventScroll: true });
  }

  button.addEventListener('click', () => (drawer.hasAttribute('data-closed') ? openDrawer() : closeDrawer()));
  drawer.querySelector('.us-where-used__close').addEventListener('click', closeDrawer);
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !drawer.hasAttribute('data-closed')) {
      event.preventDefault();
      closeDrawer();
    }
  });

  systemBox.addEventListener('change', () => {
    state.includeSystem = systemBox.checked;
    // A filter over the stored index: no rebuild, just reveal or hide.
    drawer.querySelectorAll('.us-where-used__item[data-system]').forEach(row => fold(row, state.includeSystem));
    body.querySelectorAll('.us-where-used__items, .us-where-used__folder-group').forEach(group => {
      const rows = [...group.querySelectorAll('.us-where-used__item')];
      const shouldShow = (state.built || state.rebuilding) && rows.some(row => !row.dataset.system || state.includeSystem);
      if (group.hidden === shouldShow) fold(group, shouldShow);
    });
    SOURCES.forEach(renderCount);
    renderStatus();
  });

  helpToggle.addEventListener('click', () => {
    const open = helpToggle.getAttribute('aria-expanded') !== 'true';
    helpToggle.setAttribute('aria-expanded', String(open));
    fold(help, open);
  });

  // Keep "built 2 hours ago" honest while the drawer stays open.
  setInterval(() => { if (!drawer.hasAttribute('data-closed') && !state.rebuilding) renderStatus(); }, 30000);

  /* ---------------------------------------------------------------------------
   * Mock-up controls
   * ------------------------------------------------------------------------ */
  function applyControls() {
    timers.forEach(clearTimeout);
    timers = [];
    state.rebuilding = false;
    state.progress = {};
    state.lastAttemptFailed = false;
    state.built = document.getElementById('mock-index').value === 'built';
    state.builtAt = new Date(Date.now() - 2 * 60 * 60 * 1000);
    state.outcome = document.getElementById('mock-outcome').value;
    state.canEdit = document.getElementById('mock-user').value === 'editor';
    state.saved = document.getElementById('mock-saved').value === 'saved';

    // The designer's own Save decides who may rebuild.
    document.getElementById('save-group').hidden = !state.canEdit;
    if (state.saved) {
      button.removeAttribute('aria-disabled');
      button.removeAttribute('title');
    } else {
      closeDrawer();
      button.setAttribute('aria-disabled', 'true');
      button.title = 'Save the query first to check where it’s used.';
    }
    if (!drawer.hasAttribute('data-closed')) render();
  }

  ['mock-index', 'mock-outcome', 'mock-saved', 'mock-user'].forEach(id =>
    document.getElementById(id).addEventListener('change', applyControls));
  document.getElementById('mock-scheme').addEventListener('change', event =>
    document.documentElement.setAttribute('data-us-color-scheme', event.target.value));

  applyControls();
})();
