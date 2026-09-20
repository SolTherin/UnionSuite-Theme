// LOCAL SAMPLE DATA ONLY: no iMIS calls, native postbacks, or persistence.
(() => {
  const tasks = {{TASK_DATA}};
  // The whole offline fixture uses this date, including the 30-day completion window.
  const previewDate = '{{PREVIEW_DATE}}';
  const completedSince = new Date(Date.parse(previewDate + 'T00:00:00Z') - 29 * 86400000).toISOString().slice(0,10);
  const queues = {{QUEUE_DATA}};
  const dialog = document.getElementById('home-dialog');
  const complete = document.getElementById('complete-task');
  const emptyButton = document.getElementById('empty-preview');
  const taskIpart = document.getElementById('home-task-ipart');
  const searchInput = () => taskIpart.querySelector('.us-query-search-field input');
  const completedToggle = () => taskIpart.querySelector('.us-task-completed-toggle');
  const showCompleted = () => completedToggle()?.getAttribute('aria-pressed') === 'true';
  const taskResults = document.getElementById('task-results');
  const taskList = document.getElementById('task-list');
  const leaving = new Map();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let empty = false, activeTask = null, statusTimer, summaryFrame;
  const taskFocusFallback = () => {
    const filters = taskIpart.querySelector('.us-query-search-controls');
    return filters && !filters.hidden && !filters.inert ? searchInput() : taskIpart.querySelector('.us-iqa-filter-toggle') || taskResults;
  };
  const escape = text => String(text).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const formatDate = date => new Intl.DateTimeFormat('en-AU', {day:'numeric', month:'short', year:'numeric', timeZone:'UTC'}).format(new Date(date + 'T00:00:00Z'));
  const taskDate = task => task.done ? `Actioned <time datetime="${escape(task.completedOn)}">${escape(formatDate(task.completedOn))}</time>` : escape(task.due);
  const row = task => `<section class="home-task-item${task.done ? ' is-complete' : ''}" data-task-row="${task.id}"><div class="QueryTemplateItem"><div class="home-task-row" data-us-task-completed="${!!task.done}"><button type="button" class="home-task-check" role="checkbox" aria-checked="${!!task.done}" aria-label="Complete task: ${escape(task.title)}" title="${task.done ? 'Reopen task' : 'Mark complete'}" data-task-toggle="${task.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg></button><button type="button" class="home-task-open" data-task="${task.id}"><span class="home-task-copy"><strong>${escape(task.title)}</strong><span>${escape(task.member)} · ${escape(task.memberId)}</span></span><span class="home-task-due ${task.done ? 'is-complete' : 'is-' + task.when}">${taskDate(task)}</span>{{CHEVRON}}</button></div></div></section>`;
  const scrollFrames = [...document.querySelectorAll('.home-scroll-frame')];
  function refreshScrollHints() {
    scrollFrames.forEach(frame => {
      const area = frame.querySelector(':scope > .home-scroll-area:not([hidden])');
      frame.classList.toggle('has-more-below', !!area && area.scrollHeight - area.clientHeight - area.scrollTop > 1);
    });
  }
  const scrollAreas = document.querySelectorAll('.home-scroll-area');
  scrollAreas.forEach(area => area.addEventListener('scroll', refreshScrollHints, {passive:true}));
  const scrollResize = new ResizeObserver(refreshScrollHints);
  scrollAreas.forEach(area => {
    scrollResize.observe(area);
    [...area.children].forEach(child => scrollResize.observe(child));
  });
  function render() {
    const pending = empty ? [] : tasks.filter(task => !task.done);
    const recentCompleted = tasks.filter(task => task.done && task.completedOn >= completedSince && task.completedOn <= previewDate);
    // Supply all eligible records. Shared query helpers own search and completion visibility.
    const available = [...pending, ...recentCompleted];
    // Leave animating rows in place until their exits finish. Preserve any other
    // focused task control when the list is finally regrouped.
    if (!leaving.size) {
      const focused = document.activeElement;
      const focusId = focused?.closest('[data-task-row]')?.dataset.taskRow;
      const focusAttribute = focused?.hasAttribute('data-task-toggle') ? 'data-task-toggle' : 'data-task';
      taskList.innerHTML = available.map(row).join('');
      if (focusId) (taskList.querySelector(`[${focusAttribute}="${focusId}"]`) || taskFocusFallback()).focus({preventScroll:true});
      window.UnionSuiteIqaFilters.refresh();
    } else {
      refreshTaskSummary();
    }
  }
  function refreshTaskSummary() {
    const query = searchInput()?.value.trim() || '';
    const visible = [...taskList.children].filter(item => !item.hidden && !item.hasAttribute('data-us-query-search-hidden'));
    const visiblePending = visible.map(item => tasks.find(task => task.id === item.dataset.taskRow)).filter(task => task && !task.done);
    document.getElementById('task-empty').hidden = visible.length > 0 || leaving.size > 0;
    document.getElementById('task-empty-icon').textContent = query ? '⌕' : '✓';
    document.getElementById('task-empty-title').textContent = query ? 'No matching tasks' : 'You’re all caught up.';
    document.getElementById('task-empty-description').textContent = query
      ? (showCompleted() ? 'Try a different task name, member name or member ID.' : 'Try another search or turn on Show completed.')
      : 'You have no outstanding tasks.';
    const overdue = visiblePending.filter(task => task.when === 'overdue').length;
    const count = document.getElementById('task-footer-count');
    const message = `${visiblePending.length} outstanding, ${overdue} overdue`;
    if (count.textContent !== message) count.textContent = message;
    refreshScrollHints();
  }
  // Listen to the shared helper's settled result visibility and reconciliation.
  // This adapter supplies only homepage counts, empty messages and scroll hints.
  new MutationObserver(() => {
    cancelAnimationFrame(summaryFrame);
    summaryFrame = requestAnimationFrame(refreshTaskSummary);
  }).observe(taskList, {childList:true, attributes:true, subtree:true, attributeFilter:['data-us-query-search-hidden']});
  document.addEventListener('us:panel-actions-ready', event => {
    if (event.detail.wrapper === taskIpart) refreshTaskSummary();
  });
  function cancelExits() {
    leaving.forEach(run => {
      run.animations.forEach(animation => animation.cancel());
      run.item.remove();
    });
    leaving.clear();
  }
  function filterChanged() {
    taskResults.scrollTop = 0;
    if (leaving.size) {cancelExits(); render();}
    else refreshTaskSummary();
  }
  taskIpart.addEventListener('input', event => {
    if (event.target.matches('.us-query-search-field input')) filterChanged();
  });
  taskIpart.addEventListener('click', event => {
    if (event.target.closest('.us-task-completed-toggle')) filterChanged();
  });
  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {cancelExits(); render();}
  });
  function announce(message) {
    const status = document.getElementById('home-status');
    status.textContent = message;
    clearTimeout(statusTimer);
    statusTimer = setTimeout(() => {status.textContent = '';}, 4500);
  }
  function moveFocusFrom(item) {
    if (!item.contains(document.activeElement)) return;
    const items = [...taskList.children], index = items.indexOf(item);
    const next = [...items.slice(index + 1), ...items.slice(0,index).reverse()].find(node => !leaving.has(node.dataset.taskRow) && !node.hasAttribute('data-us-query-search-hidden') && !node.hidden);
    (next?.querySelector('[data-task-toggle]') || taskFocusFallback()).focus({preventScroll:true});
  }
  function paintTask(item, task, exiting) {
    item.classList.toggle('is-complete', !!task.done);
    const checkbox = item.querySelector('[data-task-toggle]');
    checkbox.setAttribute('aria-checked', String(!!task.done));
    checkbox.title = task.done ? 'Reopen task' : 'Mark complete';
    // Keep its searchable text and completion marker stable through the exit.
    // The next render publishes the actioned date and true marker together.
    if (exiting) return;
    const date = item.querySelector('.home-task-due');
    date.className = `home-task-due ${task.done ? 'is-complete' : 'is-' + task.when}`;
    date.innerHTML = taskDate(task);
  }
  async function slideTaskOut(task, item) {
    const run = {item, animations:[]};
    leaving.set(task.id, run);
    moveFocusFrom(item);
    item.inert = true;
    item.classList.add('is-leaving');
    render();
    try {
      const slide = item.querySelector('.home-task-row').animate([
        {transform:'translateX(0)', opacity:1},
        {transform:'translateX(calc(-100% - 24px))', opacity:0}
      ], {duration:650, easing:'cubic-bezier(.4,0,.2,1)', fill:'forwards'});
      run.animations.push(slide);
      await slide.finished;
      if (leaving.get(task.id) !== run) return;
      const collapse = item.animate([
        {height:item.getBoundingClientRect().height + 'px'},
        {height:'0px'}
      ], {duration:250, easing:'ease-out', fill:'forwards'});
      run.animations.push(collapse);
      await collapse.finished;
    } catch (error) {
      if (error.name !== 'AbortError') console.warn('Task exit animation could not finish.', error);
    } finally {
      if (leaving.get(task.id) === run) {
        leaving.delete(task.id);
        item.remove();
        render();
      }
    }
  }
  function setTaskDone(task, done) {
    if (leaving.has(task.id) || !!task.done === done) return;
    task.done = done;
    if (done) task.completedOn = previewDate;
    else {
      delete task.completedOn;
      // Reopening a sample task also leaves the preview-only empty state.
      empty = false;
      emptyButton.setAttribute('aria-pressed', 'false');
      emptyButton.textContent = 'Preview empty tasks';
    }
    const item = taskList.querySelector(`[data-task-row="${task.id}"]`);
    const animateExit = done && item && !item.hasAttribute('data-us-query-search-hidden') && !reducedMotion.matches && typeof item.animate === 'function';
    if (item) paintTask(item, task, animateExit);
    announce(`${done ? 'Task completed' : 'Task reopened'}: ${task.title}`);
    if (animateExit) {
      void slideTaskOut(task, item);
    } else {
      if (done && item && !showCompleted()) moveFocusFrom(item);
      render();
    }
  }
  taskList.addEventListener('click', event => {
    const checkbox = event.target.closest('[data-task-toggle]');
    if (!checkbox) return;
    const task = tasks.find(item => item.id === checkbox.dataset.taskToggle);
    if (task) setTaskDone(task, !task.done);
  });
  function show(title, content, caption = 'Prototype · sample data', task = null) {
    activeTask = task;
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-caption').textContent = caption;
    document.getElementById('dialog-content').innerHTML = content;
    complete.hidden = !task;
    complete.textContent = task?.done ? 'Reopen task' : 'Mark complete';
    dialog.showModal();
  }
  document.querySelectorAll('.home-dialog-close').forEach(button => button.addEventListener('click', () => dialog.close()));
  document.addEventListener('click', event => {
    const taskButton = event.target.closest('[data-task]');
    if (taskButton) {
      const task = tasks.find(item => item.id === taskButton.dataset.task);
      show(task.title, `<p><strong>${escape(task.member)}</strong><br>Member ${escape(task.memberId)}</p><p>${escape(task.note)}</p><p><strong>${taskDate(task)}</strong> · Assigned to James</p><p class="home-dialog-note">You can complete or reopen this sample task. Changes reset when you reload.</p>`, 'My tasks', task);
    }
    const queue = event.target.closest('a.us-attention__card[href*="#attention-"]');
    if (queue) {
      event.preventDefault();
      const item = queues[new URL(queue.href).hash.replace('#attention-','')];
      if (!item) return;
      void window.UnionSuiteAttention.run(queue, async () => {
        // Preview-only wait so the shared click feedback can be inspected.
        await new Promise(resolve => setTimeout(resolve,700));
        if (!queue.isConnected) return;
        show(item.title, `<ul class="home-dialog-records">${item.records.map(record => `<li><strong>${escape(record[0])}</strong><span>${escape(record[1])}</span></li>`).join('')}</ul><p class="home-dialog-note">Illustrative queue. In iMIS, this tile would open the corresponding filtered report. Counts and access would come from the configured query.</p>`, 'Needs Attention');
      });
    }
    const manage = event.target.closest('a[href="/_i4u_/Core/Staff-Site-Layouts/Home-Dashboard/Staff-Bulletin.aspx"]');
    if (manage) {event.preventDefault();show('Manage Bulletin', '<p>This opens your existing Staff Bulletin management page in a new tab.</p><p class="home-dialog-note">This local preview leaves the live page unchanged. The approved header action keeps its existing destination.</p>', 'Staff Bulletin');}
    if (event.target.closest('a[href="#preview-fees"]')) {event.preventDefault();show('Latest Membership Fees','<p>This is the existing link within the bulletin body. In iMIS, it opens the fee schedule linked by the author.</p>','Staff Bulletin');}
  });
  complete.addEventListener('click', () => {
    if (!activeTask) return;
    dialog.close();
    setTaskDone(activeTask, !activeTask.done);
  });
  emptyButton.addEventListener('click', () => {
    cancelExits();
    empty = !empty; emptyButton.setAttribute('aria-pressed', String(empty));
    emptyButton.textContent = empty ? 'Restore sample tasks' : 'Preview empty tasks';
    const search = searchInput();
    if (search) {search.value = ''; search.dispatchEvent(new Event('input', {bubbles:true}));}
    if (showCompleted()) completedToggle().click();
    taskResults.scrollTop = 0;
    render();
  });
  document.getElementById('all-tasks').addEventListener('click', () => show('All my tasks', `<ul class="home-dialog-records">${tasks.map(task => `<li><strong>${escape(task.title)}</strong><span>${escape(task.member)} · ${taskDate(task)}</span></li>`).join('')}</ul><p class="home-dialog-note">The homepage shows a focused task list. This action would lead to your full task workspace in iMIS.</p>`,'My tasks'));
  window.UnionSuiteActions.define('home.add-task', {
    className:'us-action-home-add-task',owner:'preview',source:'home-preview.js',
    presentation:{label:'Add task',icon:'plus',default:'button'},context:{},
    action:{type:'function',run: () => show('Add task', '<p>Create a new task and assign a due date.</p><p class="home-dialog-note">The shared action opens this sample dialog. In iMIS, supply your verified task editor and assignee context; no task is saved from this preview.</p>', 'My tasks')}
  });
  window.UnionSuiteActions.configure('home.manage-bulletin',{
    className:'us-action-home-manage-bulletin',owner:'preview',source:'home-preview.js:bulletin',
    presentation:{label:'Manage bulletin',default:'button'},context:{},
    action:{type:'function',run:()=>show('Manage bulletin','<p>This sample represents the existing bulletin management page.</p>','Staff bulletin')}
  });
  render();
})();
