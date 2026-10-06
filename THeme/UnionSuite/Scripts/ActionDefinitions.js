/* Standard Union Suite actions. Load once AFTER zUnionSuite.js and business
   dependencies, BEFORE UnionSuite-Client/Actions.js. Do not embed in iParts. */
(function () {
  'use strict';
  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before ActionDefinitions.js.');
  const party = {from:'query', parameter:'ID', required:true};
  const recordId = value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid record ID.';
  const row = {
    partyId:{from:'trigger',attribute:'data-id',required:true,validate:recordId},
    ordinal:{from:'trigger',attribute:'data-seqn',required:true,validate:value => /^\d+$/.test(String(value)) || 'Invalid job ordinal.'}
  };
  function define(key, options) {
    return actions.define(key, {className:'us-action-'+key.replace(/\./g,'-'),owner:'UnionSuite',source:'ActionDefinitions.js:'+key,...options});
  }
  function editor(path, values) {
    const url = new URL(path,location.origin);
    Object.entries(values).forEach(([name,value]) => url.searchParams.set(name,String(value)));
    url.searchParams.set('AllowEdit','True');
    return url.href;
  }
  // Client context published in the DOM. loggedInPartyId is who is signed in,
  // which is not the same as the contact being viewed.
  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); }
    catch (_) { return {}; }
  }
  async function refreshReport(env, selector) {
    if (env.origin.report || env.origin.ambiguous) return env.refresh.originReport();
    return env.refresh.iqa(selector,{scope:'page',match:'one'});
  }
  // These seven integrations retain their existing site-owned implementations.
  // Their popup/save/refresh behaviour remains in those helpers until ported.
  const legacy = [
    ['member.email','Email member','ti-mail','EmailMemberPopupFn'],
    ['member.sms','SMS member','ti-message','SMSMemberPopupFn'],
    ['member.add-note','Add note','plus','AddNotePopupFn'],
    ['member.create-case','Create case','plus','CreateCasePopupFn'],
    ['member.create-quick-case','Quick case','plus','CreateQuickCasePopupFn'],
    ['member.resolve-duplicate','Resolve duplicate','ti-users','ResolveDuplicatePopupFn'],
    ['member.assign-workbench','Assign workbench','ti-user-plus','AssignWorkbenchToStaffFn']
  ];
  legacy.forEach(([key,label,icon,helper]) => define(key,{
    presentation:{label,icon,default:'button',menu:'menu-item'},
    context:{partyId:party},
    action:{type:'function',requires:[helper],recordKey:['partyId'],run:() => window[helper]()}
  }));
  define('member.add-job',{
    presentation:{label:'Add job',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Jobs/Select-Workplace.aspx',{Ordinal:'',ID:context.partyId}),
      popup:{title:'Add new job',width:'90%',height:'90%'},
      refresh:{when:'close',run:env => refreshReport(env,'.JobsIQA')}
    }
  });
  define('member.add-address',{
    presentation:{label:'Add new address',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/iParts/Contact%20Management/ContactAddressEditor/ContactAddressEdit.aspx',{
        ContentItemKey:'5eaa38bb-f275-4f1d-98ed-94cc6ff1060a',SingleTextAddress:'False',CloseWindowOnCommit:'true',ID:context.partyId
      }),
      popup:{title:'Add address',width:'70%',height:'70%'},
      refresh:{when:'close',run:env => refreshReport(env,'.AddressIQA')}
    }
  });
  define('member.add-contact-method',{
    presentation:{label:'Add contact method',icon:'plus',default:'button',menu:'menu-item'},
    context:{partyId:{...party,validate:recordId}},
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Individual/Popups/Add-Contact-Method.aspx',{ID:context.partyId}),
      popup:{title:'Add contact method',width:'70%',height:'70%'},
      refresh:{when:'close',run:env => refreshReport(env,'.ContactDetailsIQA')}
    }
  });
  define('home.manage-bulletin',{
    presentation:{label:'Manage bulletin',default:'button',menu:'menu-item'},context:{},
    action:{type:'navigate',href:'/_i4u_/Core/Staff-Site-Layouts/Home-Dashboard/Staff-Bulletin.aspx',target:'_blank'}
  });
  define('home.add-task',{
    presentation:{label:'Add task',icon:'plus',default:'button',menu:'menu-item'},
    context:{
      // The signed-in staff member, not the selected contact. Anonymous
      // sessions resolve to null so the required check reports it rather
      // than opening the editor without an owner.
      partyId:{
        resolve:() => { const c = clientContext(); return c.isAnonymous === true ? null : c.loggedInPartyId ?? null; },
        required:true, validate:recordId
      }
    },
    action:{type:'popup',recordKey:['partyId'],
      href:({context}) => {
        const url = new URL('/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx',location.origin);
        url.searchParams.set('ID',context.partyId);
        return url.href;
      },
      popup:{title:'Add task',width:'70%',height:'70%',maxWidth:800},
      // Refresh the iPart the button belongs to, whichever report that is.
      refresh:{when:'close',targets:[{type:'origin-report'}]}
    }
  });
  define('home.open-task', {
    presentation: {label: 'Open task', useAuthoredLabel: true, default: 'link'},
    context: {
      taskUrl: {from: 'trigger', attribute: 'data-us-task-url', required: true}
    },
    action: {
      type: 'popup',
      recordKey: ['taskUrl'],
      href: ({context}) => context.taskUrl,
      popup: {title: 'Open task', width: '70%', height: '70%', maxWidth: 800},
      refresh: {when: 'close', targets: [{type: 'origin-report'}]}
    }
  });
  define('jobs.edit',{
    presentation:{label:'Edit job',icon:'pencil',default:'button',row:'icon',menu:'menu-item'},
    context:{...row,workplaceId:{from:'trigger',attribute:'data-workplace',required:true,validate:recordId}},
    action:{type:'popup',recordKey:['partyId','ordinal'],
      href:({context}) => editor('/_i4u_/Core/Staff-Site-Layouts/Contact-Layouts/Staff/EditJob.aspx',{ID:context.partyId,Ordinal:context.ordinal,Worksite:context.workplaceId}),
      popup:{title:'Edit job',width:'70%',height:'70%'},
      refresh:{when:'close',targets:[{type:'origin-report'}]}
    }
  });
  define('jobs.delete',{
    presentation:{label:'Delete job',icon:'trash',tone:'danger',default:'button',row:'icon',menu:'menu-item'},context:row,
    action:{type:'function',recordKey:['partyId','ordinal'],confirm:{message:'Are you sure you wish to delete this job?'},
      async run({context}) {
        const token = document.getElementById('__RequestVerificationToken')?.value;
        if (!token) throw new Error('The request verification token is unavailable.');
        const response = await fetch('/api/i4u_UT_Jobs/~'+encodeURIComponent(context.partyId)+'|'+encodeURIComponent(context.ordinal),{
          method:'DELETE',credentials:'same-origin',redirect:'error',headers:{RequestVerificationToken:token,Accept:'application/json'}
        });
        if (!response.ok) throw new Error('Job deletion failed (HTTP '+response.status+').');
        return {deleted:true};
      },
      refresh:{when:'success',targets:[{type:'origin-report'}]},successMessage:'Job deleted.'
    }
  });
})();

/* Agreement page actions (3 October 2026).

   Replaces the CA_* popup launchers that the old page delivered through an
   IQA iPart. One definition, several placements (the class does the placing):
   - Panel headings: the class in the panel iPart's CSS class field.
   - Banner Actions menu: <button class="us-actions__item us-action-…">.
   - Rows: a link or button with the class and the row's data-* attributes.

   Refresh replaces the old reload helpers (CA_reloadList, CA_syncContactCards,
   CA_reloadContactCard, CA_reloadMilestones): the theme re-renders the iPart
   the action started from, or the named list when it started in the banner.

   Also registers the agreement task saver (US-TASK-ROWS defineSaver) and
   the shared CloudToolz call used by tasks, milestones and attachments. */
(function () {
  'use strict';

  const actions = window.UnionSuiteActions;
  if (!actions?.define) throw new Error('Load the current zUnionSuite.js before ActionDefinitions.js.');

  const agreementId = {from: 'query', parameter: 'AgreementID', required: true, validate: value => /^[A-Za-z0-9_-]+$/.test(String(value)) || 'Invalid agreement ID.'};
  const agreementNum = {from: 'query', parameter: 'AgreementNum', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid agreement number.'};
  const rowOrdinal = {from: 'trigger', attribute: 'data-ordinal', required: true, validate: value => /^\d+$/.test(String(value)) || 'Invalid record ordinal.'};

  function define(key, options) {
    return actions.define(key, {
      className: 'us-action-' + key.replace(/\./g, '-'),
      owner: 'UnionSuite',
      source: 'ActionDefinitions.js:' + key,
      ...options
    });
  }

  function page(path, values) {
    const url = new URL(path, location.origin);
    Object.entries(values).forEach(([name, value]) => url.searchParams.set(name, String(value)));
    return url.href;
  }

  // The iPart that owns a list carries its add action's class, so the class
  // also finds the list when the action starts somewhere else (the banner).
  function refreshList(listClass) {
    return {
      when: 'close',
      run: env => (env.origin.template || env.origin.report)
        ? env.refresh.originReport()
        : env.refresh.queryTemplate('.us-query-template.' + listClass)
    };
  }

  // sizing: optional popup size options (maxWidth, maxHeight) over the 90%.
  function popup(key, label, icon, href, title, refresh, sizing) {
    define(key, {
      presentation: {label, ...(icon ? {icon} : {}), default: 'button', menu: 'menu-item'},
      context: {agreementId, agreementNum},
      action: {type: 'popup', recordKey: ['agreementId'], href, popup: {title, width: '90%', height: '90%', ...sizing}, ...(refresh ? {refresh} : {})}
    });
  }

  // ── Add entry ───────────────────────────────────────────────
  // Single-record forms (notes, tasks, milestones, meetings, terms, contacts)
  // stop at 800px:
  // 90% of a large screen stretched their narrow fields (owner, 5 October
  // 2026). A smaller window keeps the 90%.
  const formWidth = {maxWidth: 800};
  popup('agreements.add-note', 'Add note', 'plus',
    ({context}) => page('/Agreements_CreateNote', {AgreementID: context.agreementId}),
    'Add note', refreshList('us-action-agreements-add-note'), formWidth);
  popup('agreements.upload-attachment', 'Upload', 'ti-upload',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Add-Attachment.aspx', {AgreementID: context.agreementId}),
    'Add attachment', refreshList('us-action-agreements-upload-attachment'), {maxWidth: 960});
  popup('agreements.add-contact', 'Add contact', 'plus',
    ({context}) => page('/Agreements_ManageContacts', {AgreementID: context.agreementId}),
    'Manage contacts', refreshList('us-action-agreements-add-contact'));
  popup('agreements.add-meeting', 'Add meeting', 'plus',
    ({context}) => page('/Agreements_CreateMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum}),
    'Schedule meeting', refreshList('us-action-agreements-add-meeting'), formWidth);
  popup('agreements.add-task', 'Add task', 'plus',
    ({context}) => page('/Agreements_CreateTask', {Task: 'true', AgreementID: context.agreementId}),
    'Add task', refreshList('us-action-agreements-add-task'), formWidth);
  popup('agreements.add-milestone', 'Add milestone', 'plus',
    ({context}) => page('/Agreements_CreateTask', {Milestones: 'true', AgreementID: context.agreementId}),
    'Add milestone', refreshList('us-action-agreements-add-milestone'), formWidth);

  // ── Agreement details ───────────────────────────────────────
  // One editor with a Section parameter; a heading button cannot carry data
  // attributes, so each section is its own action. The panels it edits read
  // their IQAs through /api/query (US-FIELD-GROUPS, and US-BANNER-FACTS for
  // the banner's second row), so closing the editor runs those calls again
  // instead of reloading the page. Every field panel shown on the page is
  // refetched, because one edit can change several. Panels on other CCO tabs
  // are skipped: they are not on the page (or are hidden), and a tab loads
  // its panels fresh when it opens.
  // The agreement editor's sections stop at 1060px wide (owner, 5 October
  // 2026); a smaller window keeps the 90%.
  const editorWidth = {maxWidth: 1060};
  const reload = {when: 'close', run: () => {
    document.querySelectorAll('.us-field-groups[data-us-fields-query]').forEach(root => {
      if (root.getClientRects().length) window.UnionSuiteFieldGroups?.reload(root);
    });
    window.UnionSuiteBannerFacts?.reload?.();
  }};
  popup('agreements.edit', 'Update details', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'Details'}),
    'Edit agreement details', reload, editorWidth);
  popup('agreements.edit-key-dates', 'Update key dates', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'KeyDates'}),
    'Edit key dates', reload, editorWidth);
  popup('agreements.record-resolution', 'Record resolution', 'pencil',
    ({context}) => page('/Agreements_EditAgreement', {AgreementID: context.agreementId, Section: 'Resolution'}),
    'Record resolution', reload);
  define('agreements.clone', {
    presentation: {label: 'Clone agreement', icon: 'ti-copy', default: 'button', menu: 'menu-item'},
    context: {agreementId},
    action: {type: 'navigate', href: ({context}) => page('/_i4u_/Core/Collective_Agreements/Navigation/Create-Agreement.aspx', {AgreementID: context.agreementId})}
  });

  // ── Communication ───────────────────────────────────────────
  popup('agreements.email-team', 'Email negotiating team', 'ti-mail',
    ({context}) => page('/Agreements_EmailContacts', {AgreementID: context.agreementId}), 'Email negotiating team');
  // The send button in the Contacts heading (owner, 5 October 2026). It hands
  // the contacts on screen to a copy of iMIS's Create communication page (the
  // Communication Creator iPart), as the Email button under a Query Menu
  // report does with the original, so the send is tracked:
  //   <website>/<send page>?query=<IQA path>
  //     &queryparams=[{"Item1":"<filter>","Item2":"<value>"}, …]
  //     &ReturnUrl=<this page>
  // The IQA is API - Communication Recipient List - Contacts (owner, 6 October
  // 2026; before it, API - Communication Recipient List):
  // one prompt, Ordinal (the agreement contact rows to email), and a hidden
  // AgreementOrdinal = @url:AgreementNum filter. Several ordinals go in one
  // value, each in double quotes: "177","183","214" (iMIS's form for a list
  // in an Equals prompt). With a group, role or search filter on, Ordinal
  // carries the rows still shown; with nothing filtered it is blank, so the
  // whole agreement is emailed, including rows past the first page. The
  // hidden filter's value goes in queryparams as "@url:AgreementNum", as a
  // Query Menu's own Email button sends it: the Communication Creator runs
  // the query on the server, not from this page's address.
  // AgreementID goes too: the send page (us-agreement-comms on its
  // Communication Creator iPart) puts "Agreement A107 –" at the start
  // of the subject, where staff cannot remove it (US-SUBJECT-TAG). So do
  // AgreementNum, Audience=Staff and CommunicationType=Email: after the send
  // the page links the log row to the agreement with them (US-COMMS-LOG).
  // It navigates rather than opening a popup, although the page sits in the
  // Popups folder: the Communication Creator returns to ReturnUrl when it
  // finishes, which would load this page inside a popup.
  // Icon only in the heading, a labelled item in menus.
  const emailContacts = {
    // The send page, under the current website (owner, 5 October 2026).
    page: '/_i4u_/Core/Collective_Agreements/v2/Popups/Send-Email-Contacts.aspx',
    query: '$/_i4u_/Core/CA/v2/API - Communication Recipient List - Contacts',
    ordinalFilter: 'Ordinal',
    agreementFilter: '@url:AgreementNum'
  };
  // The tiles' ordinals, all of them and those the filters leave shown.
  // A tile without its ordinal (a template from before data-us-contact-
  // ordinal) cannot be sent, so a list missing any ordinal stops the send.
  function contactOrdinals(wrapper) {
    const rows = wrapper ? [...wrapper.querySelectorAll('.QueryTemplateSet > section')]
      .map(section => ({section, ordinal: section.querySelector('[data-us-contact-ordinal]')?.getAttribute('data-us-contact-ordinal')?.trim()})) : [];
    if (rows.some(row => !row.ordinal)) {
      throw new Error('The contacts list does not mark each contact\'s ordinal (data-us-contact-ordinal in its Query Template), so the email cannot be limited to the contacts shown.');
    }
    const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));
    return {total: rows.length, shown: shown.map(row => row.ordinal)};
  }
  // The current website's path (/UTNewTheme), as the native Email button
  // uses. gWebRoot is the virtual directory (usually blank), not the website.
  function websitePath(path) {
    const site = window.gWebSiteRoot || clientContext().websiteRoot || '';
    const root = site ? new URL(String(site), location.origin).pathname.replace(/\/+$/, '') : '';
    return new URL(root + path, location.origin);
  }
  // The send page's address: the record (AgreementID for the subject tag,
  // AgreementNum for the log row), audience and channel (US-COMMS-LOG), the
  // recipients query and its filters, and where to come back to.
  function sendPage(target, context, audience, filters) {
    const url = websitePath(target.page);
    url.searchParams.set('AgreementID', context.agreementId);
    url.searchParams.set('AgreementNum', context.agreementNum);
    url.searchParams.set('Audience', audience);
    url.searchParams.set('CommunicationType', 'Email');
    url.searchParams.set('query', target.query);
    url.searchParams.set('queryparams', JSON.stringify(filters));
    url.searchParams.set('ReturnUrl', location.pathname + location.search);
    return url.href;
  }
  define('agreements.email-contacts', {
    presentation: {label: 'Email contacts', icon: 'ti-send', default: 'button', header: 'icon', menu: 'menu-item'},
    context: {agreementId, agreementNum},
    action: {type: 'function', recordKey: ['agreementId'],
      // Read the rows when the button is pressed, not when it is drawn: the
      // filters change without the action being checked again.
      run: ({context, wrapper}) => {
        const {total, shown} = contactOrdinals(wrapper);
        if (!total) throw new Error('This agreement has no contacts to email.');
        // Every row filtered out: nothing on screen to email, and a blank
        // Ordinal would mean the whole agreement.
        if (!shown.length) throw new Error('No contacts are shown to email. Clear the filter and try again.');
        const ordinals = shown.length < total ? shown : [];
        location.assign(sendPage(emailContacts, context, 'Staff', [
          {Item1: emailContacts.ordinalFilter, Item2: ordinals.map(ordinal => '"' + ordinal + '"').join(',')},
          {Item1: emailContacts.agreementFilter, Item2: String(context.agreementNum)}
        ]));
      }}
  });

  // Email members (owner, 6 October 2026): every member the agreement
  // covers, through the member send page, as Email contacts does for the
  // contacts. The page's Communication Creator iPart carries
  // us-agreement-comms us-agreement-comms--members (the subject tag, and the
  // log row's Audience=Members), and a Content HTML iPart above it shows the
  // count only (us-send-recipients--summary) with a link back to the
  // agreement's Coverage tab. The IQA, API - Communication Recipient List -
  // Members, takes the agreement's ordinal directly in its AgreementOrdinal
  // filter: queryparams=[{"Item1":"AgreementOrdinal","Item2":"123"}]. A
  // value passed through @url:AgreementNum did not filter reliably (owner,
  // 6 October 2026).
  // A labelled button, send icon and "Email Members", in the Covered Members
  // report's heading, and a labelled item in the banner's Actions menu
  // (owner, 6 October 2026). It emails every covered member, whatever the
  // report's own filters show, so it is drawn in the danger tone (red) to
  // say it matters and needs care.
  const emailMembers = {
    page: '/_i4u_/Core/Collective_Agreements/v2/Popups/SendEmail-Members.aspx',
    query: '$/_i4u_/Core/CA/v2/API - Communication Recipient List - Members',
    agreementFilter: 'AgreementOrdinal'
  };
  define('agreements.email-members', {
    presentation: {label: 'Email Members', icon: 'ti-send', default: 'button', header: 'button', menu: 'menu-item', tone: 'danger'},
    context: {agreementId, agreementNum},
    action: {type: 'function', recordKey: ['agreementId'],
      run: ({context}) => location.assign(sendPage(emailMembers, context, 'Members', [
        {Item1: emailMembers.agreementFilter, Item2: String(context.agreementNum)}
      ]))}
  });

  // ── Terms and coverage ──────────────────────────────────────
  popup('agreements.add-term', 'Add term', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum}),
    'Add term', refreshList('us-action-agreements-add-term'), formWidth);
  // The page removes several terms at once (owner, 4 October 2026: "Bulk remove").
  popup('agreements.remove-terms', 'Bulk remove', 'trash',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Delete_Terms.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Remove terms', refreshList('us-action-agreements-add-term'));
  popup('agreements.edit-coverage', 'Update coverage', 'pencil',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Coverage.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Edit coverage rules', {when: 'close', targets: [{type: 'origin-report'}]});
  // Layout v2 (index-v2.html): the Add scheduled increase BeyondForm, on its
  // own popup page (owner, 5 October 2026).
  popup('agreements.add-increase', 'Add increase', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Add-Scheduled-Increase.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Add scheduled increase', {when: 'close', targets: [{type: 'origin-report'}]}, formWidth);

  // ── Row actions (read the record from the row's data-ordinal) ─
  // Open actions sit on the row's own title, which keeps its text as a link
  // (as home.open-task does). Edit actions are icon buttons.
  const openLink = {useAuthoredLabel: true, default: 'link'};
  const editIcon = {icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'};
  // Closing a row's popup refreshes only that row (owner, 3 October 2026, as
  // the old page did for contact cards). A row whose template names its own
  // API IQA (data-us-row-query, as the contact tiles do) is patched from one
  // /api/query call; any other row is swapped from a fetch of the list.
  function refreshRow(env) {
    const row = env.trigger?.closest('[data-us-row-query]');
    if (row && window.UnionSuiteRowPatch) return window.UnionSuiteRowPatch.refresh(row);
    return env.refresh.originReport({row: '[data-ordinal="' + env.context.ordinal + '"]'});
  }
  // sizing: optional popup size options (maxWidth, maxHeight) over the 90%.
  function rowPopup(key, label, presentation, href, title, sizing) {
    define(key, {
      presentation: {label, ...presentation},
      context: {agreementId, agreementNum, ordinal: rowOrdinal},
      action: {type: 'popup', recordKey: ['agreementId', 'ordinal'], href, popup: {title, width: '90%', height: '90%', ...sizing},
        refresh: {when: 'close', run: refreshRow}}
    });
  }
  const noteDetails = mode => ({context}) => page('/_i4u_/Core/Zidebar/NoteDetails.aspx', {
    NoteOrdinal: context.ordinal, AgreementID: context.agreementId, ...(mode ? {[mode]: 'true'} : {})
  });
  // A row's edit is a pencil at its end everywhere on the page, and task,
  // milestone and meeting titles are plain text (owner, 6 and 7 October
  // 2026): these popups open forms that change the record. The open-link
  // actions remain for the earlier templates' title links.
  rowPopup('agreements.view-note', 'Open note', openLink, noteDetails(''), 'Note', formWidth);
  // The button on a ledger or reading note row (us-notes--ledger,
  // us-notes--reading); it was an eye. Its key stays, so the templates need
  // no change.
  rowPopup('agreements.preview-note', 'Edit note', editIcon, noteDetails(''), 'Note', formWidth);
  rowPopup('agreements.view-task', 'Open task', openLink, noteDetails('Task'), 'Task', formWidth);
  rowPopup('agreements.edit-task', 'Edit task', editIcon, noteDetails('Task'), 'Task', formWidth);
  // The earlier task template's eye button, a pencil now too.
  rowPopup('agreements.preview-task', 'Edit task', editIcon, noteDetails('Task'), 'Task', formWidth);
  rowPopup('agreements.view-milestone', 'Open milestone', openLink, noteDetails('Milestones'), 'Milestone', formWidth);
  rowPopup('agreements.edit-milestone', 'Edit milestone', editIcon, noteDetails('Milestones'), 'Milestone', formWidth);
  const meetingForm = ({context}) => page('/Agreements_EditMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum, MeetingOrdinal: context.ordinal});
  rowPopup('agreements.view-meeting', 'Open meeting', openLink, meetingForm, 'Edit meeting', formWidth);
  rowPopup('agreements.edit-meeting', 'Edit meeting', editIcon, meetingForm, 'Edit meeting', formWidth);
  rowPopup('agreements.edit-contact', 'Edit contact', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Contact/Edit-Contact-Information.aspx', {ID: context.ordinal}),
    'Edit contact', formWidth);
  rowPopup('agreements.edit-term', 'Edit term', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum, TermOrdinal: context.ordinal}),
    'Update term', formWidth);
  // The increase row's pencil (owner, 5 October 2026). An edit can change
  // the group totals, so closing it refreshes the whole list, as Add
  // increase does, rather than the one row.
  define('agreements.edit-increase', {
    presentation: {label: 'Edit increase', ...editIcon},
    context: {agreementId, agreementNum, ordinal: rowOrdinal},
    action: {type: 'popup', recordKey: ['agreementId', 'ordinal'],
      href: ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Edit-Scheduled-Increase.aspx', {AgreementNum: context.agreementNum, IncreaseOrdinal: context.ordinal}),
      popup: {title: 'Edit scheduled increase', width: '90%', height: '90%', ...formWidth},
      refresh: {when: 'close', targets: [{type: 'origin-report'}]}}
  });

  // ── CloudToolz ──────────────────────────────────────────────
  // Every CloudToolz call stores a short-lived ZenToken in iMIS first; CloudToolz
  // reads it back to verify the request. The base URL is read once per page.
  let cloudToolzUrl = null;

  function token() {
    const value = document.getElementById('__RequestVerificationToken')?.value;
    if (!value) throw new Error('The request verification token is unavailable.');
    return value;
  }

  function clientContext() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); }
    catch (_) { return {}; }
  }

  // /api/query rows are flat alias-keyed objects; older endpoints return
  // Name/Value property lists. Read either, ignoring case.
  function propertyValue(item, name) {
    const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
    const properties = unwrap(item?.Properties)?.$values;
    if (Array.isArray(properties)) {
      const match = properties.find(entry => String(entry.Name).toLowerCase() === name.toLowerCase());
      return match ? unwrap(match.Value) : undefined;
    }
    const key = Object.keys(item || {}).find(entry => entry.toLowerCase() === name.toLowerCase());
    return key ? unwrap(item[key]) : undefined;
  }

  async function baseUrl() {
    if (cloudToolzUrl) return cloudToolzUrl;
    const params = new URLSearchParams({QueryName: '$/ZENTSO/Security/CloudToolzUrl'});
    const response = await fetch('/api/query?' + params, {credentials: 'same-origin', headers: {RequestVerificationToken: token()}});
    if (!response.ok) throw new Error('The CloudToolz URL query failed (HTTP ' + response.status + ').');
    const data = await response.json();
    const url = propertyValue(data?.Items?.$values?.[0], 'Description');
    if (!url) throw new Error('The CloudToolz URL is not configured in iMIS.');
    cloudToolzUrl = String(url).replace(/\/$/, '');
    return cloudToolzUrl;
  }

  async function storeZenToken(context) {
    const property = (name, value) => ({$type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value});
    const response = await fetch('/api/ZenTokens', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Content-Type': 'application/json', RequestVerificationToken: token()},
      body: JSON.stringify({
        $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
        EntityTypeName: 'ZenTokens',
        Properties: {$type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts', $values: [
          property('PartyId', context.loggedInPartyId),
          property('ID', context.loggedInPartyId),
          property('SelectedPartyId', context.selectedPartyId),
          property('RequestVerificationToken', token()),
          property('UtcUnixTimeStamp', Date.now())
        ]}
      })
    });
    if (!response.ok) throw new Error('The ZenToken could not be stored (HTTP ' + response.status + ').');
  }

  async function cloudToolz(path, init = {}) {
    const context = clientContext();
    const url = await baseUrl();
    await storeZenToken(context);
    const response = await fetch(url + path, {
      ...init,
      headers: {
        ...(init.body ? {'Content-Type': 'application/json'} : {}),
        RequestVerificationToken: token(),
        SelectedPartyId: context.selectedPartyId,
        LoggedInPartyId: context.loggedInPartyId,
        WebsiteKey: window.gWebsiteKey || ''
      }
    });
    if (!response.ok) throw new Error('CloudToolz ' + path.split('?')[0] + ' failed (HTTP ' + response.status + ').');
    return response;
  }

  // Status for a task or milestone note. action: Complete | In Progress | Not Complete.
  function saveItemStatus(ordinal, action, noteType) {
    return cloudToolz('/ca/complete-task', {method: 'POST', body: JSON.stringify({TaskID: ordinal, Action: action, NoteType: noteType})});
  }

  // Whether the signed-in user may read a restricted note (owner, 6 October
  // 2026). CloudToolz knows the user from the call, as for complete-task,
  // checks the note's access (Open, Individual, Team) and answers
  // {Access: 'Granted' | 'Restricted', Note}; the text comes only when granted.
  async function noteAccess(ordinal) {
    const response = await cloudToolz('/ca/note-access', {method: 'POST', body: JSON.stringify({NoteOrdinal: ordinal})});
    return response.json();
  }

  // A term's status from the row's quick edit (us-term__status-button;
  // owner, 6 October 2026), as complete-task saves a task's. Action is the
  // status as shown: Negotiating | Included | Not Included.
  function saveTermStatus(ordinal, action) {
    return cloudToolz('/ca/quick-edit-term', {method: 'POST', body: JSON.stringify({TermID: ordinal, Action: action})});
  }

  // One term deleted from its row's bin (owner, 6 October 2026), as the
  // status quick edit saves. The heading's Bulk remove keeps the
  // Delete_Terms.aspx popup for several terms.
  function deleteTerm(ordinal) {
    return cloudToolz('/ca/quick-delete-term', {method: 'POST', body: JSON.stringify({TermID: ordinal})});
  }

  // The agreement's milestones in their new order (US-MILESTONE-ORDER;
  // owner, 7 October 2026), each with its Sequence, 1 for the first. The
  // Milestones IQA sorts on Sequence. Proposed endpoint: not built yet.
  function saveMilestoneOrder(ordinals) {
    const agreementId = new URLSearchParams(location.search).get('AgreementID') || '';
    return cloudToolz('/ca/reorder-milestones', {
      method: 'POST',
      body: JSON.stringify({AgreementID: agreementId, Milestones: ordinals.map((Ordinal, index) => ({Ordinal, Sequence: index + 1}))})
    });
  }

  window.UnionSuiteAgreements = Object.freeze({cloudToolz, saveItemStatus, saveTermStatus, deleteTerm, saveMilestoneOrder, noteAccess, version: '1.0'});

  // The bin in an open term row: asks first, deletes, then refreshes the
  // terms list it sits in. A failed delete leaves the row and says so.
  // Once deleted, the row's words fly into the bin (US-TERM-DELETE, the word
  // vacuum; owner, 6 October 2026) before the list refreshes.
  define('agreements.delete-term', {
    presentation: {label: 'Delete term', icon: 'trash', tone: 'danger', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {agreementId, agreementNum, ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['agreementId', 'ordinal'],
      confirm: {message: 'Delete this term? This cannot be undone.'},
      run: async ({context, trigger}) => {
        await deleteTerm(context.ordinal);
        // The term is gone by now, so a failed animation only logs.
        const section = trigger?.closest('.QueryTemplateSet > section');
        try {
          if (section) await window.UnionSuiteTermDelete?.play(section, trigger);
        } catch (error) {
          console.warn('[agreements.delete-term] The delete animation failed:', error);
        }
        return {deleted: true};
      },
      refresh: {when: 'success', targets: [{type: 'origin-report'}]},
      successMessage: 'Term deleted.'}
  });

  // US-TERMS in zUnionSuite.js: a status change shows at once and reverts
  // with "Not saved" if this throws (an HTTP error from CloudToolz does).
  window.UnionSuiteTermStatus?.defineSaver?.(({ordinal, label}) => saveTermStatus(ordinal, label));

  // US-MILESTONE-ORDER in zUnionSuite.js: Save order keeps the new order
  // and says "Order not saved" if this throws.
  window.UnionSuiteMilestoneOrder?.defineSaver?.(({ordinals}) => saveMilestoneOrder(ordinals));

  // Show note on a restricted note (US-NOTES-RESTRICTED in zUnionSuite.js).
  // Granted shows the text; Restricted reads as denied ("You don't have
  // permission…"); any other answer reads as a failed check.
  window.UnionSuiteRestrictedNotes?.defineLoader?.(async ({ordinal}) => {
    const data = await noteAccess(ordinal);
    const access = String(propertyValue(data, 'Access') ?? '').trim().toLowerCase();
    if (access === 'granted') return String(propertyValue(data, 'Note') ?? '');
    if (access === 'restricted') {
      const denied = new Error('Access to this note is restricted.');
      denied.denied = true;
      throw denied;
    }
    throw new Error('The note access check gave no answer (Access was "' + access + '").');
  });

  // Agreement task rows carry data-us-task-save="agreements.item-status".
  window.UnionSuiteTaskRows?.defineSaver?.('agreements.item-status', async ({root, done}) => {
    const ordinal = (root.getAttribute('data-us-task-ordinal') || '').trim();
    if (!/^\d+$/.test(ordinal)) throw new Error('The agreement task has no ordinal.');
    await saveItemStatus(ordinal, done ? 'Complete' : 'Not Complete', root.getAttribute('data-us-task-note-type') || 'Task');
  });

  // ── Attachments ─────────────────────────────────────────────
  const attachmentRow = {
    ordinal: rowOrdinal,
    uniqueId: {from: 'closest', selector: '.us-attachment', attribute: 'data-us-file-id', required: true},
    branch: {from: 'closest', selector: '.us-attachment', attribute: 'data-us-file-branch', required: true},
    fileName: {from: 'closest', selector: '.us-attachment', attribute: 'data-us-file-name'}
  };

  async function downloadFile(context) {
    const query = new URLSearchParams({uniqueid: context.uniqueId, branch: context.branch, delordinal: context.ordinal});
    const response = await cloudToolz('/flowz/sharepoint/download?' + query, {method: 'GET'});
    const data = await response.json();
    if (!data?.Base64string) throw new Error('The download returned no file.');
    // A data: URL, not a blob: URL — Firefox ignores download on blob: URLs.
    const link = document.createElement('a');
    link.href = 'data:application/octet-stream;base64,' + data.Base64string;
    link.download = data.FileName || context.fileName || 'file';
    document.body.append(link);
    link.click();
    link.remove();
    return {downloaded: link.download};
  }

  define('agreements.download-attachment', {
    presentation: {label: 'Download', icon: 'ti-download', default: 'button', row: 'icon', menu: 'menu-item'},
    context: attachmentRow,
    action: {type: 'function', recordKey: ['ordinal'], run: ({context}) => downloadFile(context), successMessage: 'Download started.'}
  });

  // Viewing opens the file through the same download until a CloudToolz view
  // endpoint exists (the old page's view modal was a placeholder).
  define('agreements.view-attachment', {
    presentation: {label: 'View', icon: 'ti-eye', default: 'button', row: 'icon', menu: 'menu-item'},
    context: attachmentRow,
    action: {type: 'function', recordKey: ['ordinal'], run: ({context}) => downloadFile(context)}
  });

  // Inline name/tag editing is US-ATTACHMENTS in zUnionSuite.js;
  // this action opens the editor on the row and saves through CloudToolz.
  define('agreements.edit-attachment', {
    presentation: {label: 'Edit name and tags', icon: 'pencil', default: 'button', row: 'icon', menu: 'menu-item'},
    context: {ordinal: rowOrdinal},
    action: {type: 'function', recordKey: ['ordinal'], run: ({trigger}) => window.UnionSuiteAttachments.edit(trigger.closest('.us-attachment'))}
  });
})();
