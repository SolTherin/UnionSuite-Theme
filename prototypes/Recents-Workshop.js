(function () {
  'use strict';
  const query = selector => document.querySelector(selector);
  const icon = name => '<i class="ti ti-' + name + '" aria-hidden="true"></i>';
  const escape = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[character]));
  const toast = message => { query('#recents-status').textContent = message; };
  let scope = 'mine';
  let refreshTimer;
  const recentData = {
    iqa: ['Active members by branch', 'Renewal follow-up list', 'Member contact details', 'New applications this month', 'Overdue membership payments', 'Workplace representatives', 'Event attendance summary', 'Recent member activity', 'Contact email preferences', 'Annual membership snapshot'],
    content: ['Staff home', 'Membership overview', 'New member welcome', 'Contact profile', 'Staff bulletin', 'Renewal information', 'Upcoming events', 'Branch directory', 'Member resources', 'Committee overview']
  };
  function button(label, markup, className, callback) {
    const node = document.createElement('button');
    node.type = 'button';
    node.className = className;
    node.setAttribute('aria-label', label);
    node.title = label;
    node.innerHTML = markup;
    if (callback) node.addEventListener('click', callback);
    return node;
  }


  function setRecentsBusy(busy) {
    const control = query('#refresh-recents');
    control.disabled = busy;
    control.setAttribute('aria-busy', String(busy));
    control.querySelector('.us-button-spinner').hidden = !busy;
    control.querySelector('.ti').hidden = busy;
    query('#recents-results').setAttribute('aria-busy', String(busy));
  }

  function renderRecents() {
    const host = query('#recents-results');
    host.replaceChildren();
    const people = ['You', 'Alex Morgan', 'You', 'Sam Lee', 'You', 'Priya Shah', 'Alex Morgan', 'You', 'Sam Lee', 'You'];
    const times = ['12m ago', '38m ago', '1h ago', '2h ago', '3h ago', 'Yesterday', 'Yesterday', '2 days ago', '2 days ago', '3 days ago'];
    let count = 0;
    for (const [type, names] of Object.entries(recentData)) {
      const items = names.map((name, index) => ({name, person:people[index], time:times[index]})).filter(item => scope !== 'mine' || item.person === 'You');
      count += items.length;
      const column = document.createElement('section');
      column.className = 'ws-recents-column';
      column.innerHTML = '<h3>' + icon(type === 'iqa' ? 'file-search' : 'layout') + (type === 'iqa' ? 'IQAs' : 'Content') + ' <span>· ' + items.length + '</span></h3>';
      const list = document.createElement('div');
      list.className = 'ws-recents-list';
      for (const item of items) {
        list.append(button('Open ' + item.name, '<span>' + escape(item.name) + '<small>' + item.person + ' · ' + item.time + '</small></span>' + icon('arrow-up-right'), 'ws-recent-item', () => {
          toast('Would open ' + item.name + ' in the ' + (type === 'iqa' ? 'IQA' : 'content') + ' editor.');
        }));
      }
      column.append(list);
      host.append(column);
    }
    query('#recents-count').textContent = scope === 'mine' ? count + ' modified by you' : 'Last 10 of each type';
  }


  function close() {
    clearTimeout(refreshTimer);
    setRecentsBusy(false);
    renderRecents();
    query('#ws-recents').hidden = true;
    query('#reopen-recents').focus();
  }
  query('[data-close="recents"]').addEventListener('click', close);
  query('#reopen-recents').addEventListener('click', () => {
    query('#ws-recents').hidden = false;
    query('[data-close="recents"]').focus();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !query('#ws-recents').hidden) close();
  });
  query('#recents-scheme').addEventListener('change', event => {
    document.documentElement.dataset.usColorScheme = event.target.value;
  });
  query('#recents-width').addEventListener('change', event => {
    document.documentElement.style.setProperty('--recents-width', event.target.value + 'px');
  });
  document.querySelectorAll('[data-scope]').forEach(control => control.addEventListener('click', () => {
    scope = control.dataset.scope;
    document.querySelectorAll('[data-scope]').forEach(button => button.setAttribute('aria-pressed', String(button === control)));
    renderRecents();
  }));
  query('#refresh-recents').addEventListener('click', () => {
    setRecentsBusy(true);
    query('#recents-count').textContent = 'Refreshing…';
    refreshTimer = setTimeout(() => {
      setRecentsBusy(false);
      renderRecents();
      toast('Example recent items refreshed.');
    }, 450);
  });
  renderRecents();
})();
