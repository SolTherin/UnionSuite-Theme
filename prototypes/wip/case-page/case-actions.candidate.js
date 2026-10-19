/* Case page actions (candidate). Target: a Cases section in
   THeme/UnionSuite/Scripts/ActionDefinitions.js, beside the agreement actions.

   The live case page is /Cases_ManageCase?CaseID=C202&CaseNum=198 (the case
   reference and the i4u_UT_Cases Ordinal), as the contact page's case links
   already build it. Every action reads both from the page URL.

   POPUP PAGES ARE PLACEHOLDERS. The Cases_* shortcuts below follow the
   agreement pattern (Agreements_CreateNote and friends) and have not been
   checked against the live site. Confirm each one before this leaves the
   prototype.

   Reused from the agreement actions, unchanged (ActionDefinitions.js):
   - CloudToolz (window.UnionSuiteAgreements): case notes and tasks live in
     the same Zen_CloudFiles_Notes table as agreement notes, so the task tick
     saves through /ca/complete-task by note ordinal. To confirm.
   - The restricted note loader (/ca/note-access), defined once for the page.
   - Attachment View, Download and Edit: they read only the row, so the case
     template keeps the agreements.*-attachment classes. Promotion decides
     whether they become shared (records.*) actions.

   Load after ActionDefinitions.js. */
(function () {
  'use strict';

  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before case-actions.candidate.js.');

  const caseId = {from: 'query', parameter: 'CaseID', required: true, validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid case ID.'};
  const caseNum = {from: 'query', parameter: 'CaseNum', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid case number.'};
  const rowOrdinal = {from: 'trigger', attribute: 'data-ordinal', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid record ordinal.'};

  function define(key, options) {
    return actions.define(key, {
      className: 'us-action-' + key.replace(/\./g, '-'),
      owner: 'UnionSuite',
      source: 'case-actions.candidate.js:' + key,
      ...options
    });
  }

  function page(path, values) {
    const url = new URL(path, location.origin);
    Object.entries(values).forEach(([name, value]) => url.searchParams.set(name, String(value)));
    return url.href;
  }

  // The iPart that owns a list carries its add action's class, so the class
  // also finds the list when the action starts in the banner.
  function refreshList(listClass) {
    return {
      when: 'close',
      run: env => (env.origin.template || env.origin.report)
        ? env.refresh.originReport()
        : env.refresh.queryTemplate('.us-query-template.' + listClass)
    };
  }

  function popup(key, label, icon, href, title, refresh, sizing) {
    define(key, {
      presentation: {label, ...(icon ? {icon} : {}), default: 'button', menu: 'menu-item'},
      context: {caseId, caseNum},
      action: {type: 'popup', recordKey: ['caseId'], href, popup: {title, width: '90%', height: '90%', ...sizing}, ...(refresh ? {refresh} : {})}
    });
  }

  const formWidth = {maxWidth: 800};

  // ── Add entry: composers (C40) ──────────────────────────────
  // Every add on the page opens a composer in the section it was pressed
  // in (US-INLINE-COMPOSER; owner, 10 October 2026: "apply the same format
  // to all add functions within the cases page"), and each composer's More
  // options is the full form (KEY-form), which the banner's Actions menu
  // opens directly. The saves are proposed CloudToolz endpoints.
  const composers = window.UnionSuiteComposers;
  if (!composers?.define) throw new Error('Load zUnionSuite.js (US-INLINE-COMPOSER) before case-actions.candidate.js.');

  // The endpoint's answer: the new record's {Ordinal} (or {Ordinals}).
  async function send(path, body) {
    const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
    if (!cloudToolz) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
    const response = await cloudToolz(path, {method: 'POST', body: JSON.stringify(body)});
    return response.json().catch(() => ({}));
  }

  // A proposed search IQA, through GET /api/query (at most 8 rows unless
  // the caller says otherwise; extra parameters go with Search).
  async function lookup(name, term, extra = {}) {
    const params = new URLSearchParams({QueryName: name, Search: term, limit: '8', offset: '0', ...extra});
    const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
    const response = await fetch('/api/query?' + params, {credentials: 'same-origin', headers: {Accept: 'application/json', ...(token ? {RequestVerificationToken: token} : {})}});
    if (!response.ok) throw new Error('HTTP ' + response.status);
    return (await response.json())?.Items?.$values || [];
  }

  // People already in the section show in the list but cannot be picked.
  const onCase = wrapper => new Set([...(wrapper?.querySelectorAll('[data-us-contact-id]') || [])].map(node => node.getAttribute('data-us-contact-id')));

  function base64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  // Today as YYYY-MM-DD: the date previews pin (UnionSuiteQueryStatesConfig,
  // which also decides which meetings are past), otherwise the local date.
  function today() {
    const pinned = window.UnionSuiteQueryStatesConfig?.today;
    if (pinned) return String(pinned).slice(0, 10);
    const now = new Date();
    return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
  }

  function composer(key, spec) {
    composers.define(key, {context: {caseId, caseNum}, recordKey: ['caseId'], owner: 'UnionSuite', source: 'case-actions.candidate.js:' + key, ...spec});
  }

  // Placeholder lists until the Note category and case staff Role value
  // lists are read from iMIS.
  const CATEGORIES = ['Case', 'Employer', 'Membership', 'Intake', 'Meeting'];
  const ROLES = ['Support', 'Assisting', 'Case manager', 'Legal advice'];

  // Notes (C34): a follow-up note is also a task (owner, 9 October 2026).
  composer('cases.add-note', {
    label: 'Add note',
    form: {href: ({context}) => page('/Cases_CreateNote', {CaseID: context.caseId}), title: 'Add note'},
    lists: values => values.FollowUp ? ['us-action-cases-add-note', 'us-action-cases-add-task'] : ['us-action-cases-add-note'],
    arrive: 'top',
    composer: {
      kind: 'note', label: 'New note', save: 'Save note',
      main: {type: 'textarea', name: 'Note', label: 'Note', placeholder: 'Write a note…', required: 'Write the note first.'},
      fields: [
        {type: 'select', name: 'Category', label: 'Category', options: CATEGORIES},
        {type: 'checkbox', name: 'FollowUp', label: 'Follow up'},
        {type: 'date', name: 'FollowUpDate', label: 'Follow-up date', shownBy: 'FollowUp', required: 'Choose a follow-up date.'}
      ],
      submit: (values, context) => send('/cases/add-note', {CaseID: context.caseId, Note: values.Note, Category: values.Category,
        FollowUpDate: values.FollowUp ? values.FollowUpDate : ''}),
      saved: values => values.FollowUp ? 'Note saved, with a follow-up task.' : 'Note saved.',
      failed: 'The note could not be saved. Try again.'
    }
  });

  // Tasks (C40): stays open for the next one; the server assigns the lead
  // staff member.
  composer('cases.add-task', {
    label: 'Add task',
    form: {href: ({context}) => page('/Cases_CreateTask', {Task: 'true', CaseID: context.caseId}), title: 'Add task'},
    lists: () => ['us-action-cases-add-task', 'us-action-cases-add-note'],
    // Oldest outstanding first: a new task is the last of them.
    arrive: 'bottom',
    // In the timeline a task shows as its note.
    feed: ['note'],
    composer: {
      kind: 'task', label: 'New task', save: 'Save task', keepOpen: true,
      main: {type: 'text', name: 'Task', label: 'Task', placeholder: 'What needs doing…', required: 'Write the task first.'},
      fields: [{type: 'date', name: 'DueDate', label: 'Due date'}],
      submit: (values, context) => send('/cases/add-task', {CaseID: context.caseId, Task: values.Task, DueDate: values.DueDate}),
      saved: 'Task added.', failed: 'The task could not be added. Try again.'
    }
  });

  // Meetings (C39): attendees and the agenda are More options.
  composer('cases.add-meeting', {
    label: 'Add meeting',
    form: {href: ({context}) => page('/Cases_CreateMeeting', {CaseID: context.caseId, CaseOrdinal: context.caseNum}), title: 'Schedule meeting'},
    lists: () => ['us-action-cases-add-meeting'],
    arrive: {field: 'Date', attribute: 'data-us-meeting-date', order: 'ascending'},
    composer: {
      kind: 'meeting', label: 'New meeting', save: 'Save meeting',
      main: {type: 'text', name: 'Title', label: 'Meeting title', placeholder: 'Meeting title…', required: 'Give the meeting a title.'},
      fields: [
        {type: 'date', name: 'Date', label: 'Meeting date', required: 'Choose the meeting date.'},
        {type: 'time', name: 'Time', label: 'Start time'},
        {type: 'text', name: 'Location', label: 'Location', placeholder: 'Location', width: 'grow'}
      ],
      // A date before today is usually a slip (owner, 10 October 2026: "an
      // are you sure"), but past meetings are recorded too, so it asks.
      confirm: values => values.Date && values.Date < today()
        ? 'That date has passed. Save the meeting anyway?' : null,
      submit: (values, context) => send('/cases/add-meeting', {CaseID: context.caseId, Title: values.Title, Date: values.Date,
        Time: values.Time, Location: values.Location}),
      saved: 'Meeting saved.', failed: 'The meeting could not be saved. Try again.'
    }
  });

  // Attachments (C39): files dropped or chosen, and whether they are
  // sensitive (C33); tags are More options. The files go as Base64, as
  // CloudToolz downloads return them (its helper sends JSON).
  composer('cases.add-attachment', {
    label: 'Upload', icon: 'ti-upload',
    form: {label: 'Upload attachment', href: ({context}) => page('/Cases_AddAttachment', {CaseID: context.caseId}), title: 'Add attachment', maxWidth: 960},
    lists: () => ['us-action-cases-add-attachment'],
    arrive: 'top',
    composer: {
      kind: 'attachment', label: 'New attachment', save: 'Upload',
      main: {type: 'files', name: 'Files', label: 'Files', required: 'Choose a file first.'},
      fields: [{type: 'checkbox', name: 'Restricted', label: 'Sensitive'}],
      submit: async (values, context) => send('/cases/add-attachment', {CaseID: context.caseId, Restricted: values.Restricted,
        Files: await Promise.all(values.Files.map(async file => ({FileName: file.name, Base64string: await base64(file)})))}),
      saved: values => values.Files.length > 1 ? 'Attachments uploaded.' : 'Attachment uploaded.',
      failed: 'The upload failed. Try again.'
    }
  });

  // Staff (C38, C40): a person from the staff and delegates list, never
  // free text, and their role on the case; their type is the person's.
  // The proposed Staff Search IQA: Search (part of a name or position) in;
  // ContactId, ContactName, Position and Group out.
  composer('cases.add-staff', {
    label: 'Add staff',
    form: {href: ({context}) => page('/Cases_ManageStaff', {CaseID: context.caseId}), title: 'Add staff'},
    lists: () => ['us-action-cases-add-staff'],
    // The end of the team (owner, 10 October 2026: groups do not matter).
    arrive: 'bottom',
    composer: {
      kind: 'staff', label: 'New staff member', save: 'Add', keepOpen: true,
      main: {type: 'combobox', name: 'StaffID', label: 'Staff member', placeholder: 'Search staff and delegates…', avatars: true,
        required: 'Choose someone from the list.',
        search: async ({term, wrapper}) => {
          const taken = onCase(wrapper);
          return (await lookup('$/_i4u_/Core/Cases/API - Staff Search', term)).map(person => {
            const disabled = taken.has(String(person.ContactId));
            return {value: person.ContactId, name: person.ContactName, meta: [person.Position, disabled ? 'On the case' : ''].filter(Boolean).join(' · '), disabled};
          });
        },
        empty: term => term ? 'No staff match “' + term + '”.' : 'No staff to show.'},
      fields: [{type: 'select', name: 'Role', label: 'Role on the case', options: ROLES}],
      submit: (values, context) => send('/cases/add-staff', {CaseID: context.caseId, StaffID: values.StaffID, Role: values.Role}),
      saved: 'Staff member added.', failed: 'The staff member could not be added. Try again.'
    }
  });

  // Parties (C40): usually one member, sometimes several, sometimes an
  // employer (owner, 8 October 2026). The quick add lists the members at
  // the primary party's workplace, the usual co-complainants; More options
  // is the full form, which searches every contact (owner, 10 October
  // 2026). The proposed Workplace Members IQA: CaseNum (the case's primary
  // party gives the workplace) and Search (part of a name or number) in;
  // ContactId, ContactName, Number and Classification out, the primary
  // party left out, at most 20.
  composer('cases.add-party', {
    label: 'Add party',
    form: {href: ({context}) => page('/Cases_ManageContacts', {CaseID: context.caseId}), title: 'Add party'},
    lists: () => ['us-action-cases-add-party', 'us-action-cases-view-member'],
    arrive: 'bottom',
    composer: {
      kind: 'party', label: 'New party', save: 'Add', keepOpen: true,
      main: {type: 'combobox', name: 'ContactID', label: 'Member at the workplace', placeholder: 'Members at the primary party’s workplace…', avatars: true,
        required: 'Choose a member from the list, or use More options to search everyone.',
        search: async ({term, wrapper}) => {
          const taken = onCase(wrapper);
          const caseNum = new URLSearchParams(location.search).get('CaseNum') || '';
          return (await lookup('$/_i4u_/Core/Cases/API - Workplace Members', term, {CaseNum: caseNum, limit: '20'})).map(contact => {
            const disabled = taken.has(String(contact.ContactId));
            return {value: contact.ContactId, name: contact.ContactName,
              meta: [contact.Number, contact.Classification, disabled ? 'On the case' : ''].filter(Boolean).join(' · '), disabled};
          });
        },
        empty: term => (term ? 'No members at this workplace match “' + term + '”.' : 'No other members at this workplace.') + ' More options searches everyone.'},
      fields: [],
      submit: (values, context) => send('/cases/add-party', {CaseID: context.caseId, ContactID: values.ContactID}),
      saved: 'Party added.', failed: 'The party could not be added. Try again.'
    }
  });

  // Several parties are handled by designating one the primary
  // party (owner, 8 October 2026). The Parties tab's preview
  // carries this button for any member who is not already primary (the
  // template's CSS hides it for the primary and for employers). After the
  // save nothing reloads on the tab (owner, 9 October 2026): the button
  // turns into the crown (promoteButton, below), the new primary's row
  // slides to the top of the list as a new lead staff card does
  // (slideToTop), the banner's member line names them (above), and the
  // Overview's member card refreshes out of sight on its own tab.
  // Proposed CloudToolz endpoint, not built yet.
  // The banner's member line (C9) names the primary party. The banner
  // cannot be re-rendered in place (its iPart sits in a zone without a
  // stable ID), so the line is rewritten from the chosen party's row,
  // which holds the same values, and fades in. A reload shows the IQA's.
  function chosenParty(trigger) {
    const wrapper = trigger?.closest('.us-parties');
    const row = wrapper?.querySelector('.us-party__select[aria-pressed="true"]')?.closest('.us-party');
    const card = trigger?.closest('.us-case-member');
    // The name is plain text; View profile carries the link (owner, 9 October 2026).
    const name = card?.querySelector('.us-case-member__name-text');
    const link = card?.querySelector('.us-case-member__profile');
    if (!row || !name) return null;
    const badge = row.querySelector('.us-party__standing');
    return {
      name: name.textContent.trim(),
      href: link?.getAttribute('href') || '',
      line: card.querySelector('.us-case-member__meta')?.textContent.trim() || '',
      standing: badge?.textContent.trim() || '',
      tone: [...(badge?.classList || [])].find(name => /^us-badge--(danger|warning|success|info)$/.test(name))?.slice('us-badge--'.length) || ''
    };
  }

  function showBannerMember(member) {
    const line = document.querySelector('.us-banner .us-banner__member');
    if (!member || !line) return;
    const name = line.querySelector('.us-banner__member-name');
    const number = line.querySelector('.us-banner__member-line');
    const badge = line.querySelector('.us-banner__badge');
    if (name) {
      name.textContent = member.name;
      name.setAttribute('href', member.href);
    }
    if (number) number.textContent = member.line;
    if (badge) {
      badge.textContent = member.standing;
      badge.className = 'us-banner__badge' + (member.tone ? ' us-banner__badge--' + member.tone : '');
    }
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      line.animate([{opacity: 0}, {opacity: 1}], {duration: 180, easing: 'cubic-bezier(.2, 0, 0, 1)'});
    }
  }

  define('cases.set-primary-party', {
    presentation: {label: 'Make primary party', icon: 'ti-crown', default: 'icon', row: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum, ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['caseId', 'ordinal'],
      run: ({context}) => {
        const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
        if (!cloudToolz) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
        return cloudToolz('/cases/set-primary-party', {method: 'POST', body: JSON.stringify({CaseID: context.caseId, PartyOrdinal: context.ordinal})});
      },
      refresh: {when: 'success', run: async env => {
        const member = chosenParty(env.trigger);
        if (!await promoteParty(env.trigger)) await env.refresh.originReport();
        showBannerMember(member);
        if (document.querySelector('[data-us-case-member]')) await env.refresh.queryTemplate('[data-us-case-member]');
      }},
      successMessage: 'Primary party updated.'}
  });

  // The new primary party, in place (owner, 9 October 2026). The quiet
  // crown beside the name becomes the primary's amber crown where it sits,
  // popping in as a new lead staff member's does (C8), while the person's
  // row slides to the top of the list (slideToTop) and the old primary's
  // row gives up its lead. Reduced motion swaps at once. Returns false when
  // the preview or row is missing, so the caller refreshes.
  async function promoteParty(trigger) {
    const pane = trigger?.closest('.us-parties__preview');
    const wrapper = trigger?.closest('.us-parties');
    const row = wrapper?.querySelector('.us-party__select[aria-pressed="true"]')?.closest('.us-party');
    const section = row?.closest('.QueryTemplateSet > section');
    if (!pane || !row || !section) return false;
    const button = pane.querySelector('.us-party__make-primary');
    // Pressed from the keyboard: focus moves on to View profile.
    const keyboard = button?.matches(':focus-visible');
    slideToTop(section);
    takeLead(pane, row, section);
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      pane.setAttribute('data-us-lead-arrived', '');
      setTimeout(() => pane.removeAttribute('data-us-lead-arrived'), 440);
    }
    if (keyboard) pane.querySelector('.us-case-member__profile')?.focus({preventScroll: true});
    else if (document.activeElement === button) button.blur();
    return true;
  }

  // The lead marks: the row's (its avatar and screen reader role) and the
  // preview's (crown, not the button).
  function takeLead(pane, row, section) {
    section.parentElement.querySelectorAll('.us-party[data-us-contact-lead]').forEach(other => {
      const lead = other === row;
      const role = other.querySelector('.us-party__select .sr-only');
      if (role) role.textContent = lead ? ', Primary party' : ', Party';
    });
    pane.setAttribute('data-us-contact-lead', 'true');
  }

  // ── Case details ────────────────────────────────────────────
  // The field panels and the banner's second row read their IQAs through
  // /api/query, so closing the editor reruns those calls instead of
  // reloading the page (as the agreement editor does).
  const editorWidth = {maxWidth: 1060};
  const reload = {when: 'close', run: () => {
    document.querySelectorAll('.us-field-groups[data-us-fields-query]').forEach(root => {
      if (root.getClientRects().length) window.UnionSuiteFieldGroups?.reload(root);
    });
    window.UnionSuiteBannerFacts?.reload?.();
  }};
  // View profile in the Member panel's heading (owner, 9 October 2026), with
  // the other panels' actions: the member card is one person, so opening
  // their profile is the panel's action. The URL is the card's, so it
  // follows the primary party when that changes.
  define('cases.view-member', {
    presentation: {label: 'View profile', icon: 'ti-id', default: 'button', header: 'button'},
    context: {memberUrl: {required: true, resolve: ({owner}) =>
      owner?.querySelector('[data-us-case-member]')?.getAttribute('data-us-member-url') || null}},
    action: {type: 'navigate', href: ({context}) => context.memberUrl}
  });

  popup('cases.edit', 'Update case details', 'pencil',
    ({context}) => page('/Cases_EditCase', {CaseID: context.caseId, Section: 'Details'}),
    'Edit case details', reload, editorWidth);
  // ── Resolving and closing (C16) ─────────────────────────────
  // Recording the resolution and closing the case are one step (owner,
  // 8 October 2026: "essentially the same thing"):
  //   Open case    Resolve case: a check for open tasks, then one form
  //                (outcome type, outcome, amount, closed date) whose save
  //                records the resolution and closes the case.
  //   Closed case  Edit resolution (the same form, the case stays closed)
  //                and Reopen case (back to Open; the resolution stays in
  //                the case history).
  // Each action shows only in the state it belongs to, wherever it sits
  // (banner Actions, the Resolution panel's heading). The status is the
  // banner's (data-us-record-status). The theme hides an action only for
  // access, so the state check is an access check with denied: 'hide'.
  // Resolving and reopening change the status, the banner, the Overview
  // and which actions show, so the page reloads after either.
  const CLOSED = /^(closed|resolved)$/i;
  const caseStatus = () => document.querySelector('.us-banner__surface[data-us-record-status]')?.getAttribute('data-us-record-status') || '';
  const whenOpen = {check: () => !CLOSED.test(caseStatus()) || 'This case is already closed.', denied: 'hide'};
  const whenClosed = {check: () => CLOSED.test(caseStatus()) || 'This case is open.', denied: 'hide'};
  const reloadPage = {when: 'close', run: () => location.reload()};

  // Outstanding tasks on the page (the Overview's Tasks list). A tab that
  // is not loaded cannot be counted, so the check is skipped there.
  function openTasks() {
    const list = document.querySelector('.us-case-tasks');
    if (!list) return 0;
    return [...list.querySelectorAll('.us-task')].filter(task => task.getAttribute('data-us-task-completed') !== 'true').length;
  }

  define('cases.resolve', {
    presentation: {label: 'Resolve case', icon: 'ti-circle-check', default: 'button', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'popup', recordKey: ['caseId'], access: whenOpen,
      confirm: () => {
        const count = openTasks();
        if (!count) return true;
        return window.confirm(count + (count === 1 ? ' task is' : ' tasks are') + ' still open. They stay open after the case closes.\n\nResolve the case anyway?');
      },
      href: ({context}) => page('/Cases_ResolveCase', {CaseID: context.caseId, CaseNum: context.caseNum}),
      popup: {title: 'Resolve case', width: '90%', height: '90%', ...formWidth},
      refresh: reloadPage}
  });

  define('cases.edit-resolution', {
    presentation: {label: 'Edit resolution', icon: 'pencil', default: 'button', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'popup', recordKey: ['caseId'], access: whenClosed,
      href: ({context}) => page('/Cases_ResolveCase', {CaseID: context.caseId, CaseNum: context.caseNum, Edit: 'true'}),
      popup: {title: 'Edit resolution', width: '90%', height: '90%', ...formWidth},
      refresh: reload}
  });

  define('cases.reopen', {
    presentation: {label: 'Reopen case', icon: 'ti-lock-open', default: 'button', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'function', recordKey: ['caseId'], access: whenClosed,
      confirm: {message: 'Reopen this case? It goes back to Open; its resolution stays in the case history.'},
      run: ({context}) => {
        const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
        if (!cloudToolz) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
        return cloudToolz('/cases/reopen', {method: 'POST', body: JSON.stringify({CaseID: context.caseId})});
      },
      refresh: {when: 'success', run: () => location.reload()}}
  });

  // ── Quick status change (C23) ───────────────────────────────
  // The banner's status pill opens a menu of the open statuses (owner,
  // 9 October 2026: "click the status in the banner to quick update").
  // Choosing one shows it at once (the pill's text, and the banner's tone
  // and rail, which follow data-us-record-status), saves it, and puts the
  // old status back if the save fails, when the action notice says so.
  // Closing is not a status here: the menu's Resolve case records the
  // resolution and closes (C16), and a closed case offers Edit resolution
  // and Reopen case instead of the statuses. Proposed CloudToolz endpoint.
  const statusSurface = () => document.querySelector('.us-banner__surface[data-us-record-status]');

  function showStatus(status) {
    const surface = statusSurface();
    if (!surface) return;
    surface.setAttribute('data-us-record-status', status);
    const pill = surface.querySelector('.us-case-status > .us-actions__toggle');
    if (pill) pill.textContent = status;
    markCurrentStatus();
  }

  // The current status is ticked in the menu.
  function markCurrentStatus() {
    const current = (statusSurface()?.getAttribute('data-us-record-status') || '').toLowerCase();
    document.querySelectorAll('.us-case-status [data-us-case-status]').forEach(item => {
      const on = item.getAttribute('data-us-case-status').toLowerCase() === current;
      if (on) item.setAttribute('aria-current', 'true');
      else item.removeAttribute('aria-current');
    });
  }

  define('cases.set-status', {
    presentation: {label: 'Set status', useAuthoredLabel: true, default: 'menu-item', menu: 'menu-item'},
    context: {caseId, caseNum, status: {from: 'trigger', attribute: 'data-us-case-status', required: true}},
    action: {type: 'function', recordKey: ['caseId', 'status'], access: whenOpen,
      run: async ({context}) => {
        const previous = statusSurface()?.getAttribute('data-us-record-status') || '';
        if (previous.toLowerCase() === context.status.toLowerCase()) return {unchanged: true};
        showStatus(context.status);
        try {
          const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
          if (!cloudToolz) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
          await cloudToolz('/cases/set-status', {method: 'POST', body: JSON.stringify({CaseID: context.caseId, Status: context.status})});
        } catch (error) {
          showStatus(previous);
          throw error;
        }
        return {status: context.status};
      },
      successMessage: 'Status updated.'}
  });

  // The banner arrives with the page, or later in the offline prototype.
  markCurrentStatus();
  new MutationObserver(records => {
    if (records.some(record => [...record.addedNodes].some(node => node.nodeType === 1 && (node.matches('.us-case-status, .us-banner__surface') || node.querySelector?.('.us-case-status'))))) markCurrentStatus();
  }).observe(document.documentElement, {subtree: true, childList: true});

  // ── Emailing parties (C17) ─────────────────────────────
  // Email all of a case's parties, or a subset (owner, 8 October 2026),
  // as the agreement's Email contacts does: narrow the Parties list
  // with its search, or tick them with the list's Select toggle, then the
  // list toolbar's send button emails the parties shown (or ticked); with nothing narrowed (or from the banner's Actions
  // menu, or with the list not on the page), every party. It opens a
  // copy of iMIS's Create communication page (the Communication Creator
  // iPart) with the recipients query, so the send is tracked:
  //   <website>/<send page>?query=<IQA path>
  //     &queryparams=[{"Item1":"Ordinal","Item2":"\"611\",\"612\""},
  //                   {"Item1":"@url:CaseNum","Item2":"214"}]
  //     &CaseID=C217&CaseNum=214&Audience=Parties&CommunicationType=Email
  //     &ReturnUrl=<this page>
  // The send page's Communication Creator iPart carries us-case-comms: the
  // subject starts "Case C217 – " (US-SUBJECT-TAG) and the send is linked to
  // the case afterwards (US-COMMS-LOG). Both need a us-case-comms entry in
  // the theme; see README C17. Send page and IQA are placeholders.
  const emailParties = {
    page: '/_i4u_/Core/Cases/Popups/Send-Email-Parties.aspx',
    query: '$/_i4u_/Core/Cases/API - Communication Recipient List - Parties',
    ordinalFilter: 'Ordinal',
    caseFilter: '@url:CaseNum'
  };

  function clientRoot() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}').websiteRoot || ''; }
    catch (_) { return ''; }
  }

  // The current website's path, as the native Email button uses.
  function websitePath(path) {
    const site = window.gWebSiteRoot || clientRoot();
    const root = site ? new URL(String(site), location.origin).pathname.replace(/\/+$/, '') : '';
    return new URL(root + path, location.origin);
  }

  // The parties list's ordinals, all of them and those still shown.
  function partyOrdinals() {
    const rows = [...document.querySelectorAll('.us-parties .QueryTemplateSet > section')].map(section => ({
      section,
      ordinal: section.querySelector('[data-us-contact-ordinal]')?.getAttribute('data-us-contact-ordinal')?.trim()
    }));
    if (rows.some(row => !row.ordinal)) {
      throw new Error('The parties list does not mark each party\'s ordinal (data-us-contact-ordinal in its Query Template), so the email cannot be limited to those shown.');
    }
    // Selecting (the list's Select toggle): exactly the ticked parties.
    if (document.querySelector('.us-parties .us-parties--selecting')) {
      const ticked = rows.filter(row => row.section.querySelector('.us-party__check')?.checked);
      if (!ticked.length) throw new Error('Tick the parties to email, or turn off Select to email those shown.');
      return {total: rows.length, shown: ticked.map(row => row.ordinal), selected: true};
    }
    const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));
    return {total: rows.length, shown: shown.map(row => row.ordinal)};
  }

  define('cases.email-parties', {
    // An icon beside the search in the list's toolbar (owner, 8 October
    // 2026); a labelled item in the banner's Actions menu.
    presentation: {label: 'Email parties', icon: 'ti-send', default: 'icon', header: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum},
    action: {type: 'function', recordKey: ['caseId'],
      // Read the rows when pressed: the search changes without the action
      // being checked again.
      run: ({context, wrapper}) => {
        const fromList = !!wrapper?.closest('.us-parties') || !!wrapper?.matches?.('.us-parties');
        const {total, shown, selected} = fromList ? partyOrdinals() : {total: 0, shown: []};
        if (fromList && !total) throw new Error('This case has no parties to email.');
        if (fromList && !shown.length) throw new Error('No parties are shown to email. Clear the search and try again.');
        // Ticked parties are always named, even when all are ticked.
        const ordinals = fromList && (selected || shown.length < total) ? shown : [];
        const url = websitePath(emailParties.page);
        url.searchParams.set('CaseID', context.caseId);
        url.searchParams.set('CaseNum', context.caseNum);
        url.searchParams.set('Audience', 'Parties');
        url.searchParams.set('CommunicationType', 'Email');
        url.searchParams.set('query', emailParties.query);
        url.searchParams.set('queryparams', JSON.stringify([
          {Item1: emailParties.ordinalFilter, Item2: ordinals.map(ordinal => '"' + ordinal + '"').join(',')},
          {Item1: emailParties.caseFilter, Item2: String(context.caseNum)}
        ]));
        url.searchParams.set('ReturnUrl', location.pathname + location.search);
        // The offline prototype answers the navigation itself (preview only).
        (window.UnionSuiteCasePreview?.navigate || (href => location.assign(href)))(url.href);
      }}
  });

  // ── Row actions (read the record from the row's data-ordinal) ─
  const editIcon = {icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'};
  function refreshRow(env) {
    const row = env.trigger?.closest('[data-us-row-query]');
    if (row && window.UnionSuiteRowPatch) return window.UnionSuiteRowPatch.refresh(row);
    return env.refresh.originReport({row: '[data-ordinal="' + env.context.ordinal + '"]'});
  }
  function rowPopup(key, label, href, title) {
    define(key, {
      presentation: {label, ...editIcon},
      context: {caseId, caseNum, ordinal: rowOrdinal},
      action: {type: 'popup', recordKey: ['caseId', 'ordinal'], href, popup: {title, width: '90%', height: '90%', ...formWidth},
        refresh: {when: 'close', run: refreshRow}}
    });
  }
  // The shared note details popup the agreement page uses, with CaseID.
  const noteDetails = mode => ({context}) => page('/_i4u_/Core/Zidebar/NoteDetails.aspx', {
    NoteOrdinal: context.ordinal, CaseID: context.caseId, ...(mode ? {[mode]: 'true'} : {})
  });
  rowPopup('cases.edit-note', 'Edit note', noteDetails(''), 'Note');
  rowPopup('cases.edit-task', 'Edit task', noteDetails('Task'), 'Task');
  rowPopup('cases.edit-meeting', 'Edit meeting',
    ({context}) => page('/Cases_EditMeeting', {CaseID: context.caseId, CaseOrdinal: context.caseNum, MeetingOrdinal: context.ordinal}),
    'Edit meeting');
  rowPopup('cases.edit-staff', 'Edit staff',
    ({context}) => page('/Cases_EditStaff', {CaseID: context.caseId, ID: context.ordinal}),
    'Edit staff');

  // After the save, the new lead's card slides to the top of the list and
  // the others move down to make room (owner, 8 October 2026), rather than
  // the list re-rendering in its new order. The cards are moved in place,
  // in the order the IQA would now return (lead first), and each one
  // animates from where it was (FLIP). Reduced motion moves them at once.
  // Returns false when the card is not in a list, so the caller refreshes.
  // Used for lead staff and for the primary party's row.
  const SLIDE = {duration: 240, easing: 'cubic-bezier(.2, 0, 0, 1)'};
  function slideLeadToTop(trigger) {
    return slideToTop(trigger?.closest('.QueryTemplateSet > section'));
  }

  function slideToTop(section) {
    const set = section?.parentElement;
    if (!set?.matches('.QueryTemplateSet')) return false;
    const items = [...set.children];
    const before = new Map(items.map(item => [item, item.getBoundingClientRect().top]));
    set.prepend(section);
    // Moving a card drops its style, so a colour change made before the
    // move would snap. Read the moved card's avatar style first, then swap
    // the leads, so both initials circles transition (C8 CSS).
    const tile = section.querySelector('[data-us-contact-lead]');
    const avatar = tile?.querySelector('.us-avatar');
    if (avatar) getComputedStyle(avatar).backgroundColor;
    set.querySelectorAll('[data-us-contact-lead]').forEach(other => other.setAttribute('data-us-contact-lead', 'false'));
    tile?.setAttribute('data-us-contact-lead', 'true');
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
    // The crown's arrival (C8 CSS) plays while this attribute is on.
    tile?.setAttribute('data-us-lead-arrived', '');
    setTimeout(() => tile?.removeAttribute('data-us-lead-arrived'), SLIDE.duration + 200);
    items.forEach(item => {
      const shift = before.get(item) - item.getBoundingClientRect().top;
      if (!shift) return;
      const rising = item === section;
      // The rising card passes over the others.
      if (rising) {
        item.style.position = 'relative';
        item.style.zIndex = '1';
      }
      item.animate([{transform: `translateY(${shift}px)`}, {transform: 'none'}], SLIDE).finished.finally(() => {
        if (!rising) return;
        item.style.removeProperty('position');
        item.style.removeProperty('z-index');
      });
    });
    return true;
  }

  // The crown on a staff card that is not the lead (C8; owner, 8 October
  // 2026): makes that person the case's lead staff member. Their card then
  // slides to the top (above) and the banner's Lead staff fact reloads.
  // Proposed CloudToolz endpoint, not built yet.
  define('cases.set-lead-staff', {
    presentation: {label: 'Make lead staff', icon: 'ti-crown', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {caseId, caseNum, ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['caseId', 'ordinal'],
      run: ({context}) => {
        const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
        if (!cloudToolz) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
        return cloudToolz('/cases/set-lead-staff', {method: 'POST', body: JSON.stringify({CaseID: context.caseId, StaffOrdinal: context.ordinal})});
      },
      refresh: {when: 'success', run: env => {
        window.UnionSuiteBannerFacts?.reload?.();
        if (!slideLeadToTop(env.trigger)) return env.refresh.originReport();
      }},
      successMessage: 'Lead staff updated.'}
  });

  // Case task rows carry data-us-task-save="cases.item-status".
  window.UnionSuiteTaskRows?.defineSaver?.('cases.item-status', async ({root, done}) => {
    const ordinal = (root.getAttribute('data-us-task-ordinal') || '').trim();
    if (!/^\d+$/.test(ordinal)) throw new Error('The case task has no ordinal.');
    const save = window.UnionSuiteAgreements?.saveItemStatus;
    if (!save) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
    await save(ordinal, done ? 'Complete' : 'Not Complete', root.getAttribute('data-us-task-note-type') || 'Task');
  });
})();

/* US-RESTRICTED-ATTACHMENTS (C33, candidate) — sensitive documents (owner,
   9 October 2026: "sometimes files are restricted as well"). Target:
   US-ATTACHMENTS in zUnionSuite.js, beside US-NOTES-RESTRICTED, with the
   check in Scripts/ActionDefinitions.js.

   A row whose IQA returns AccessClass "restricted" (data-us-attachment-access)
   keeps its View, Download and Edit hidden; an Unlock button with the
   notes' padlock stands at the right in their place. Pressing it asks
   CloudToolz (/cases/attachment-access, proposed: AttachmentOrdinal in, Access
   Granted | Restricted out) whether this user may open the file.
   Granted: the padlock opens and turns green, the button closes up around
   it, and the padlock slides left to the start of the actions while View,
   Download and Edit fade in after it; the open padlock stays, so the row
   still says the file is restricted. Restricted: the button shakes and
   the row says so for a few seconds. Reduced motion swaps at once. The
   check is per row and per page load. */
(function () {
  'use strict';
  if (window.UnionSuiteRestrictedAttachments) return;

  const ROWS = '.us-attachment[data-us-attachment-access="restricted" i]:not([data-us-attachment-unlocked])';
  const SVG = 'http://www.w3.org/2000/svg';
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const MESSAGE_MS = 4000;
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;

  function padlock() {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'us-attachment__lock');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const shackle = document.createElementNS(SVG, 'path');
    shackle.setAttribute('class', 'us-attachment__shackle');
    shackle.setAttribute('d', 'M8 11V7a4 4 0 0 1 8 0v4');
    const body = document.createElementNS(SVG, 'rect');
    Object.entries({x: 5, y: 11, width: 14, height: 10, rx: 2}).forEach(([name, value]) => body.setAttribute(name, value));
    svg.append(shackle, body);
    return svg;
  }

  function enhance(row) {
    const actions = row.querySelector('.us-attachment__actions');
    if (!actions || actions.querySelector(':scope > .us-attachment__unlock')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-attachment__unlock';
    button.title = 'Restricted attachment: check access to open it';
    const label = document.createElement('span');
    label.className = 'us-attachment__unlock-label';
    label.textContent = 'Unlock';
    button.append(padlock(), label);
    actions.append(button);
  }

  // Refused: the button shakes (again on a repeat press) and the reason
  // shows beside it, to its left (owner, 9 October 2026), fading out after
  // MESSAGE_MS.
  const timers = new WeakMap();
  function deny(row, button, text) {
    clearTimeout(timers.get(row));
    button.parentElement.querySelector(':scope > .us-attachment__unlock-message')?.remove();
    button.classList.remove('is-denied');
    void button.offsetWidth;
    button.classList.add('is-denied');
    const message = document.createElement('span');
    message.className = 'us-attachment__unlock-message';
    message.setAttribute('role', 'status');
    message.textContent = text;
    button.before(message);
    timers.set(row, setTimeout(() => {
      message.setAttribute('data-us-leaving', '');
      timers.set(row, setTimeout(() => {
        message.remove();
        button.classList.remove('is-denied');
      }, still() ? 0 : 180));
    }, MESSAGE_MS));
  }

  // Granted: open the padlock, then let the button close round it while it
  // slides to the start of the actions and the actions fade in after it.
  async function open(row, button) {
    const lock = button.querySelector('.us-attachment__lock');
    const label = button.querySelector('.us-attachment__unlock-label');
    const actions = row.querySelector('.us-attachment__actions');
    button.classList.add('is-unlocked');
    if (!still()) {
      await new Promise(resolve => setTimeout(resolve, 240));
      await label.animate([{opacity: 1}, {opacity: 0}], {duration: 120, easing: EASE, fill: 'forwards'}).finished;
    }
    const from = lock.getBoundingClientRect();
    // The open padlock stays, as a mark, ahead of the actions.
    const mark = document.createElement('span');
    mark.className = 'us-attachment__lock-mark';
    mark.setAttribute('role', 'img');
    mark.setAttribute('aria-label', 'Restricted attachment, unlocked');
    mark.title = 'Restricted attachment, unlocked';
    mark.append(lock);
    const focused = document.activeElement === button;
    button.replaceWith(mark);
    actions.prepend(mark);
    row.setAttribute('data-us-attachment-unlocked', '');
    const shown = [...actions.children].filter(child => child !== mark && child.getClientRects().length);
    if (focused) shown[0]?.focus({preventScroll: true});
    if (still()) return;
    const to = lock.getBoundingClientRect();
    mark.animate([{transform: `translateX(${from.left - to.left}px)`}, {transform: 'none'}], {duration: 240, easing: EASE});
    shown.forEach((child, index) => child.animate(
      [{opacity: 0, transform: 'translateX(8px)'}, {opacity: 1, transform: 'none'}],
      {duration: 200, delay: 80 + index * 40, easing: EASE, fill: 'backwards'}
    ));
  }

  async function unlock(button) {
    const row = button.closest('.us-attachment');
    if (!row || button.getAttribute('aria-busy') === 'true') return;
    const ordinal = (row.getAttribute('data-ordinal') || '').trim();
    button.setAttribute('aria-busy', 'true');
    try {
      const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
      if (!cloudToolz) throw new Error('Load ActionDefinitions.js before case-actions.candidate.js.');
      if (!/^\d+$/.test(ordinal)) throw new Error('The file has no ordinal.');
      const response = await cloudToolz('/cases/attachment-access', {method: 'POST', body: JSON.stringify({AttachmentOrdinal: ordinal})});
      const data = await response.json();
      const access = String(data?.Access ?? '').trim().toLowerCase();
      button.removeAttribute('aria-busy');
      if (access === 'granted') return open(row, button);
      deny(row, button, access === 'restricted'
        ? 'You don’t have permission to open this attachment.'
        : 'The attachment could not be checked. Try again.');
    } catch (error) {
      button.removeAttribute('aria-busy');
      console.warn(error?.message);
      deny(row, button, 'The attachment could not be checked. Try again.');
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.us-attachment .us-attachment__unlock');
    if (button) void unlock(button);
  });

  function refresh() {
    queued = false;
    document.querySelectorAll(ROWS).forEach(enhance);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});

  window.UnionSuiteRestrictedAttachments = Object.freeze({refresh});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
