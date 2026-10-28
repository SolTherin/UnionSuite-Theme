/* Preview chrome for the workplace reassignment prototype: fills the Query
   Template with a sample IQA row as iMIS would, and switches the theme CSS,
   colour scheme, sample row and panel width. Not part of the candidate. */
(function () {
  'use strict';

  const TEMPLATE = 'templates/Workplace-Reassign-Query-Template.html';

  const workplace = {
    CurrentRecord_ID: '204871',
    CurrentRecord: 'Westmead Hospital – Emergency Department',
    CurrentRecord_Address: 'Hawkesbury Road, Westmead NSW 2145'
  };

  const westernSydney = {
    Id: '100342',
    Name: 'Western Sydney Local Health District',
    Type: 'Public health',
    Address: 'Level 2, 5 Fleet Street, North Parramatta NSW 2151'
  };

  const healthscope = {
    Id: '118905',
    Name: 'Healthscope Hospitals Pty Ltd',
    Type: 'Private company',
    Address: 'Level 1, 312 St Kilda Road, Melbourne VIC 3004'
  };

  const blank = { Id: '', Name: '', Type: '', Address: '' };

  // Each row is what the IQA returns: blanks are empty strings, as iMIS
  // substitutes them.
  const rows = {
    move: row(westernSydney, healthscope, ''),
    none: row(blank, healthscope, ''),
    same: row(westernSydney, westernSydney, '1')
  };

  function row(from, to, same) {
    return Object.assign({}, workplace, {
      CurrentEmployer_ID: from.Id,
      CurrentEmployer: from.Name,
      CurrentEmployer_Type: from.Type,
      CurrentEmployer_Address: from.Address,
      NewEmployer_ID: to.Id,
      NewEmployer: to.Name,
      NewEmployer_EmployerType: to.Type,
      NewEmployer_Address: to.Address,
      SameEmployer: same
    });
  }

  function escape(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  const root = document.documentElement;
  const result = document.querySelector('[data-preview-result]');
  const frame = document.querySelector('[data-preview-frame]');
  const themeButton = document.querySelector('[data-preview-theme]');
  const schemeButton = document.querySelector('[data-preview-scheme]');
  const rowButtons = Array.from(document.querySelectorAll('[data-preview-row]'));
  const widthButtons = Array.from(document.querySelectorAll('[data-preview-width]'));
  let template = '';

  function render(name) {
    const values = rows[name];
    result.innerHTML = template.replace(/\{#query\.(\w+)\}/g, (match, field) =>
      field in values ? escape(values[field]) : match);
  }

  function press(buttons, active) {
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button === active)));
  }

  rowButtons.forEach(button => {
    button.addEventListener('click', () => {
      render(button.dataset.previewRow);
      press(rowButtons, button);
    });
  });

  widthButtons.forEach(button => {
    button.addEventListener('click', () => {
      frame.style.maxWidth = button.dataset.previewWidth;
      press(widthButtons, button);
    });
  });

  // Dark mode is the theme's: without its CSS there are no dark tokens.
  schemeButton.addEventListener('click', () => {
    const dark = root.getAttribute('data-us-color-scheme') !== 'dark';
    root.setAttribute('data-us-color-scheme', dark ? 'dark' : 'light');
    schemeButton.setAttribute('aria-pressed', String(dark));
    schemeButton.textContent = 'Mode: ' + (dark ? 'dark' : 'light');
  });

  // Theme off is a reload without the theme's CSS or JS (see index.html),
  // so nothing the theme script set up stays behind.
  if (window.previewThemeOff) {
    themeButton.setAttribute('aria-pressed', 'false');
    themeButton.textContent = 'Theme: off';
    schemeButton.disabled = true;
  }

  themeButton.addEventListener('click', () => {
    const url = new URL(location.href);
    if (window.previewThemeOff) url.searchParams.delete('theme');
    else url.searchParams.set('theme', 'off');
    location.href = url.href;
  });

  // Stand-ins for iMIS and the flow, so workplace-reassign.js runs here:
  // the CloudToolz URL query, the ZenToken POST, and the flow itself,
  // which answers after a pause (to show the busy state) with the reply
  // the bar selects. Every other request goes through. The flow sends its
  // snippet as a JSON string, as CloudToolz does (seen 28 October 2026).
  const flowButton = document.querySelector('[data-preview-flow]');
  const replies = {
    success: { status: 200, body: JSON.stringify('<div class="AsiSuccess AsiSuccessIcon">Parent Record Assigned Successfully</div>') },
    error: { status: 200, body: JSON.stringify('<div class="AsiError AsiErrorIcon">The flow could not find employer 118905.</div>') },
    failed: { status: 500, body: '' }
  };
  const order = Object.keys(replies);

  flowButton.addEventListener('click', () => {
    const next = order[(order.indexOf(flowButton.dataset.previewFlow) + 1) % order.length];
    flowButton.dataset.previewFlow = next;
    flowButton.textContent = 'Flow reply: ' + next;
  });

  const realFetch = window.fetch.bind(window);
  window.fetch = (url, options) => {
    const text = String(url);
    if (text.includes('/api/query?QueryName=')) {
      return Promise.resolve(Response.json({ Items: [{ CloudToolzUrl: 'https://cloudtoolz.example/' }] }));
    }
    if (text.endsWith('/api/ZenTokens')) {
      return Promise.resolve(new Response('{}', { status: 201 }));
    }
    if (text.startsWith('https://cloudtoolz.example/')) {
      console.info('[preview] flow called with', options.headers.PartyId, options.headers.ParentPartyId);
      const reply = replies[flowButton.dataset.previewFlow];
      return new Promise(resolve => setTimeout(() => resolve(new Response(reply.body, { status: reply.status })), 900));
    }
    return realFetch(url, options);
  };

  root.setAttribute('data-us-color-scheme', 'light');

  fetch(TEMPLATE)
    .then(response => response.text())
    .then(text => {
      template = text;
      render('move');
    });
})();
