/* Email composer mockup behaviour (owner, 24 October 2026). Mockup only:
   when approved, the basic mode, the trimmed editor and the review step move
   into zUnionSuite.js, driving iMIS's own Communication Creator fields
   rather than these stand-ins. Sample data; nothing is sent. */
(function () {
  'use strict';

  // The recipients query's rows (Name, Email, ID, Role), as the Parties IQA
  // returns them; FirstName is a column the template's greeting needs.
  const PARTIES = [
    {Name: 'Alex Chen', FirstName: 'Alex', Role: 'Member', Email: 'alex.chen@example.org'},
    {Name: 'Priya Nair', FirstName: 'Priya', Role: 'Delegate', Email: 'priya.nair@example.org'},
    {Name: 'Sam Okafor', FirstName: 'Sam', Role: 'Employer representative', Email: 'sam.okafor@example.com'},
    {Name: 'Jordan Lee', FirstName: 'Jordan', Role: 'Witness', Email: 'jordan.lee@example.net'},
    {Name: 'Maria Rossi', FirstName: 'Maria', Role: 'Organiser', Email: 'maria.rossi@hubunion.example'},
    {Name: 'Tom Walsh', FirstName: 'Tom', Role: 'Member', Email: 'tom.walsh@example.org'},
    {Name: 'Chloe Martin', FirstName: 'Chloe', Role: 'Legal adviser', Email: 'chloe.martin@example.com'}
  ];

  // Insert field offers only the query's own columns, by a friendly name,
  // so a field the recipients lack (which fails the send) cannot be added.
  const FIELDS = [
    {key: 'FirstName', label: 'First name'},
    {key: 'Name', label: 'Full name'},
    {key: 'Role', label: 'Role on the case'},
    {key: 'Email', label: 'Email'}
  ];

  // The case templates folder's communications, as the theme would list
  // them for Open in basic mode. Each sets the subject and the message;
  // the header, footer, sender and type are the template's too.
  const TEMPLATES = [
    {name: 'Case email', summary: 'A blank update to the parties (the default).', subject: '',
      message: '<p>Dear {FirstName},</p><p></p>'},
    {name: 'Hearing date set', summary: 'The date, time and place of a hearing.', subject: 'Hearing date',
      message: '<p>Dear {FirstName},</p><p>A hearing for case C218 has been set for [date] at [time], at [place]. Please let us know by [date] if you cannot attend.</p>'},
    {name: 'Documents requested', summary: 'Asks a party for documents by a date.', subject: 'Documents we need from you',
      message: '<p>Dear {FirstName},</p><p>To progress case C218 we need the following documents from you by [date]:</p><ul><li>[document]</li></ul>'},
    {name: 'Meeting invitation', summary: 'Invites the parties to a case meeting.', subject: 'Case meeting',
      message: '<p>Dear {FirstName},</p><p>You are invited, as {Role}, to a meeting about case C218 on [date] at [time].</p>'},
    {name: 'Case closed', summary: 'Tells the parties the case is closed.', subject: 'Your case has been closed',
      message: '<p>Dear {FirstName},</p><p>Case C218 has now been closed. Thank you for your help throughout.</p>'}
  ];
  let template = TEMPLATES[0];

  const PREFIX = 'Case C218 – ';
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ── Recipients box ─────────────────────────────────────────────
  function fillRecipients() {
    $('#ec-recipient-rows').replaceChildren(...PARTIES.map(party => {
      const row = document.createElement('tr');
      [party.Name, party.Role, party.Email].forEach(text => {
        const cell = document.createElement('td');
        cell.textContent = text;
        row.append(cell);
      });
      const status = document.createElement('td');
      status.innerHTML = '<span class="us-send-recipients__ok"><i class="ti ti-check" aria-hidden="true"></i>Will receive</span>';
      row.append(status);
      return row;
    }));
    const toggle = $('.us-send-recipients__toggle');
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.textContent = open ? 'Hide recipients' : 'Show recipients';
      $('#ec-recipients').hidden = !open;
    });
  }

  // ── Basic and Advanced ─────────────────────────────────────────
  function setAdvanced(advanced) {
    const subject = advanced ? $('#ec-subject').value : $('#ec-subject-adv').value;
    $('#ec-subject').value = subject;
    $('#ec-subject-adv').value = subject;
    $('#ec-mode').setAttribute('aria-checked', String(advanced));
    $('#ec-composer').classList.toggle('us-comms-basic', !advanced);
    $$('[data-ec-basic-only]').forEach(node => { node.hidden = advanced; });
    $$('[data-ec-advanced-only]').forEach(node => { node.hidden = !advanced; });
    try { localStorage.setItem('ec-advanced', advanced ? '1' : ''); } catch (_) { /* per-viewer only */ }
  }

  function bindTabs() {
    $$('[data-ec-tab]').forEach(tab => tab.addEventListener('click', event => {
      event.preventDefault();
      $$('[data-ec-tab]').forEach(other => {
        const selected = other === tab;
        other.classList.toggle('rtsSelected', selected);
        other.setAttribute('aria-selected', String(selected));
      });
      $$('[data-ec-page]').forEach(page => { page.hidden = page.dataset.ecPage !== tab.dataset.ecTab; });
    }));
  }

  // ── Trimmed editor ─────────────────────────────────────────────
  let caret = null;

  function rememberCaret() {
    const selection = getSelection();
    if (selection.rangeCount && $('#ec-message').contains(selection.anchorNode)) caret = selection.getRangeAt(0).cloneRange();
  }

  function restoreCaret() {
    $('#ec-message').focus();
    if (!caret) return;
    const selection = getSelection();
    selection.removeAllRanges();
    selection.addRange(caret);
  }

  function mergeChip(field) {
    const chip = document.createElement('span');
    chip.className = 'us-merge-field';
    chip.contentEditable = 'false';
    chip.dataset.ecField = field.key;
    chip.textContent = field.label;
    return chip;
  }

  function bindEditor() {
    const message = $('#ec-message');
    ['keyup', 'mouseup', 'input'].forEach(type => message.addEventListener(type, rememberCaret));

    $$('[data-ec-command]').forEach(tool => tool.addEventListener('mousedown', event => {
      event.preventDefault();
      restoreCaret();
      const command = tool.dataset.ecCommand;
      const value = command === 'createLink' ? prompt('Link address') : null;
      if (command === 'createLink' && !value) return;
      document.execCommand(command, false, value);
      rememberCaret();
    }));

    const insert = $('#ec-insert');
    const menu = $('#ec-fields');
    menu.append(...FIELDS.map(field => {
      const item = document.createElement('li');
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = field.label + ' <span>' + PARTIES[0][field.key] + '</span>';
      button.addEventListener('mousedown', event => {
        event.preventDefault();
        restoreCaret();
        const range = getSelection().rangeCount ? getSelection().getRangeAt(0) : null;
        const chip = mergeChip(field);
        if (range && message.contains(range.startContainer)) {
          range.deleteContents();
          range.insertNode(chip);
          range.setStartAfter(chip);
          range.collapse(true);
        } else {
          message.lastElementChild.append(' ', chip);
        }
        rememberCaret();
        closeMenu();
      });
      item.append(button);
      return item;
    }));

    function closeMenu() {
      menu.hidden = true;
      insert.setAttribute('aria-expanded', 'false');
    }

    insert.addEventListener('mousedown', event => event.preventDefault());
    insert.addEventListener('click', () => {
      const open = menu.hidden;
      menu.hidden = !open;
      insert.setAttribute('aria-expanded', String(open));
      menu.style.left = insert.offsetLeft + 'px';
      if (open) menu.querySelector('button').focus();
    });
    document.addEventListener('click', event => {
      if (!menu.hidden && !menu.contains(event.target) && !insert.contains(event.target)) closeMenu();
    });
    menu.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        closeMenu();
        insert.focus();
      }
    });
  }

  // ── Open: the case templates folder ────────────────────────────
  // Live, choosing one would reload the page with &CommunicationId=<key>,
  // as iMIS's own Open does; here it fills the composer in place.
  function applyTemplate(chosen) {
    template = chosen;
    $('#ec-template-name').textContent = chosen.name;
    $('#ec-subject').value = chosen.subject || $('#ec-subject').value;
    $('#ec-subject-adv').value = $('#ec-subject').value;
    const message = $('#ec-message');
    message.innerHTML = chosen.message.replace(/\{(\w+)\}/g, (_, key) => {
      const field = FIELDS.find(entry => entry.key === key);
      return field ? mergeChip(field).outerHTML : '';
    });
    caret = null;
  }

  function bindTemplates() {
    const dialog = $('#ec-templates');
    const list = $('#ec-template-list');
    const search = $('#ec-template-search');

    function render() {
      const term = search.value.trim().toLowerCase();
      const shownTemplates = TEMPLATES.filter(entry => !term || (entry.name + ' ' + entry.summary).toLowerCase().includes(term));
      list.replaceChildren(...shownTemplates.map(entry => {
        const item = document.createElement('li');
        const option = document.createElement('button');
        option.type = 'button';
        option.className = 'us-comms-templates__option';
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(entry === template));
        option.innerHTML = '<strong></strong><span></span>';
        option.querySelector('strong').textContent = entry.name;
        option.querySelector('span').textContent = entry.summary;
        option.addEventListener('click', () => {
          applyTemplate(entry);
          // After the dialog closes: closing returns focus to Open.
          close(() => $('#ec-subject').focus());
        });
        item.append(option);
        return item;
      }));
      if (!shownTemplates.length) {
        const empty = document.createElement('li');
        empty.className = 'us-comms-templates__empty';
        empty.textContent = 'No case templates match.';
        list.append(empty);
      }
    }

    function close(then) {
      const done = () => {
        dialog.close();
        if (then) then();
      };
      if (reduced()) return done();
      dialog.removeAttribute('data-us-shown');
      setTimeout(done, 200);
    }

    $('#ec-open').addEventListener('click', () => {
      search.value = '';
      render();
      // Advanced keeps a way to iMIS's own Document Browser, any folder.
      $('#ec-browse-all').hidden = $('#ec-mode').getAttribute('aria-checked') !== 'true';
      dialog.showModal();
      requestAnimationFrame(() => dialog.setAttribute('data-us-shown', ''));
      search.focus();
    });
    search.addEventListener('input', render);
    dialog.addEventListener('cancel', event => {
      event.preventDefault();
      close();
    });
    dialog.querySelector('.us-comms-templates__close').addEventListener('click', event => {
      event.preventDefault();
      close();
    });
    dialog.addEventListener('click', event => {
      if (event.target === dialog) close();
    });
    $('#ec-browse-all').addEventListener('click', () => {
      $('.us-comms-templates__note').firstChild.textContent = 'Mockup: iMIS\'s own Document Browser would open here, at any folder. ';
    });
  }

  // ── Review ─────────────────────────────────────────────────────
  let shown = 0;

  function renderPreview() {
    const party = PARTIES[shown];
    const subject = $('#ec-subject').value.trim();
    $('#ec-r-from').textContent = $('#ec-from').value;
    $('#ec-r-to').textContent = party.Name + ' <' + party.Email + '>';
    $('#ec-r-subject').textContent = PREFIX + (subject || '(no subject)');

    // The email as sent: the template's header and footer around the
    // message, each merge field replaced with this party's value.
    const sheet = $('.us-comms-editor .us-comms-email__sheet').cloneNode(true);
    sheet.querySelectorAll('.us-comms-email__locked').forEach(part => part.removeAttribute('data-us-locked-label'));
    const body = sheet.querySelector('.us-comms-email__message');
    body.removeAttribute('contenteditable');
    body.removeAttribute('role');
    body.removeAttribute('id');
    body.removeAttribute('aria-multiline');
    body.removeAttribute('aria-labelledby');
    body.querySelectorAll('[data-ec-field]').forEach(chip => chip.replaceWith(party[chip.dataset.ecField] || ''));
    $('#ec-r-sheet').replaceChildren(...sheet.childNodes);

    $('#ec-as').value = String(shown);
    $('#ec-prev').disabled = shown === 0;
    $('#ec-next').disabled = shown === PARTIES.length - 1;
    $('#ec-r-note').textContent = subject ? 'Each party gets their own copy.' : 'Add a subject before sending.';
    $('#ec-send').disabled = !subject;
  }

  // Swap one view for the other: the leaving view fades down, then the
  // arriving one fades in. Instant with reduced motion.
  function swap(from, to, focus) {
    const finish = () => {
      from.hidden = true;
      from.removeAttribute('data-us-leaving');
      to.setAttribute('data-us-leaving', '');
      to.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => to.removeAttribute('data-us-leaving')));
      focus.focus({preventScroll: true});
      to.scrollIntoView({block: 'nearest'});
    };
    if (reduced()) {
      from.hidden = true;
      to.hidden = false;
      focus.focus({preventScroll: true});
      return;
    }
    from.setAttribute('data-us-leaving', '');
    setTimeout(finish, 220);
  }

  function bindReview() {
    $('#ec-as').replaceChildren(...PARTIES.map((party, index) => new Option(
      'Previewing as ' + party.Name + ' (' + (index + 1) + ' of ' + PARTIES.length + ')', String(index))));
    $('#ec-as').addEventListener('change', event => {
      shown = Number(event.target.value);
      renderPreview();
    });
    $('#ec-prev').addEventListener('click', () => { shown = Math.max(0, shown - 1); renderPreview(); });
    $('#ec-next').addEventListener('click', () => { shown = Math.min(PARTIES.length - 1, shown + 1); renderPreview(); });

    $('#ec-review').addEventListener('click', () => {
      if (!$('[data-ec-advanced-only]').hidden) $('#ec-subject').value = $('#ec-subject-adv').value;
      shown = 0;
      renderPreview();
      swap($('#ec-compose'), $('#ec-review-view'), $('#ec-review-view'));
    });
    $('#ec-edit').addEventListener('click', () => {
      swap($('#ec-review-view'), $('#ec-compose'), $('#ec-review'));
    });
    $('#ec-send').addEventListener('click', () => {
      $('#ec-r-note').textContent = 'Mockup: iMIS would now queue 7 emails, log them to the case, and return to the case page.';
    });
  }

  // ── Mockup toolbar ─────────────────────────────────────────────
  function bindToolbar() {
    $('#ec-width').addEventListener('change', event => {
      document.documentElement.style.setProperty('--ec-width', event.target.value);
    });
    $('#ec-scheme').addEventListener('click', event => {
      const dark = document.documentElement.getAttribute('data-us-color-scheme') !== 'dark';
      if (dark) document.documentElement.setAttribute('data-us-color-scheme', 'dark');
      else document.documentElement.removeAttribute('data-us-color-scheme');
      event.currentTarget.setAttribute('aria-pressed', String(dark));
      event.currentTarget.textContent = 'Mode: ' + (dark ? 'dark' : 'light');
    });
    $('#ec-reset').addEventListener('click', () => {
      try { localStorage.removeItem('ec-advanced'); } catch (_) { /* per-viewer only */ }
      location.reload();
    });
  }

  fillRecipients();
  bindTabs();
  bindEditor();
  bindTemplates();
  bindReview();
  bindToolbar();
  $('#ec-mode').addEventListener('click', () => setAdvanced($('#ec-mode').getAttribute('aria-checked') !== 'true'));
  $$('[data-ec-show-advanced]').forEach(link => link.addEventListener('click', () => setAdvanced(true)));
  let remembered = false;
  try { remembered = localStorage.getItem('ec-advanced') === '1'; } catch (_) { /* per-viewer only */ }
  setAdvanced(remembered);
})();
