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
  // Single-record forms (notes, tasks, milestones, meetings) stop at 800px:
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
  popup('agreements.email-members', 'Email members', 'ti-mail',
    ({context}) => page('/Agreements_SMSContacts', {AgreementID: context.agreementId}), 'Email members');
  // Placeholder (owner, 3 October 2026): the send button in the Contacts
  // heading. It will start an "email contacts" action through
  // iMIS so the emails are tracked; the destination is not decided, so for
  // now it opens the same page as Email negotiating team. Icon only in the
  // heading, a labelled item in menus.
  define('agreements.email-contacts', {
    presentation: {label: 'Email contacts', icon: 'ti-send', default: 'button', header: 'icon', menu: 'menu-item'},
    context: {agreementId, agreementNum},
    action: {type: 'popup', recordKey: ['agreementId'],
      href: ({context, wrapper}) => {
        // With a filter on, email the contacts on screen. Rows carry
        // data-us-contact-id; hidden rows are the filtered-out ones. Without
        // ids or with nothing filtered, the whole list.
        const values = {AgreementID: context.agreementId};
        const rows = wrapper ? [...wrapper.querySelectorAll('.QueryTemplateSet > section')]
          .map(section => ({section, id: section.querySelector('[data-us-contact-id]')?.getAttribute('data-us-contact-id')?.trim()}))
          .filter(row => row.id) : [];
        const shown = rows.filter(row => !row.section.hidden && !row.section.hasAttribute('data-us-query-search-hidden'));
        if (shown.length && shown.length < rows.length) values.ContactIDs = shown.map(row => row.id).join(',');
        return page('/Agreements_EmailContacts', values);
      },
      popup: {title: 'Email contacts', width: '90%', height: '90%'}}
  });

  // ── Terms and coverage ──────────────────────────────────────
  popup('agreements.add-term', 'Add term', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum}),
    'Add term', refreshList('us-action-agreements-add-term'));
  // The page removes several terms at once (owner, 4 October 2026: "Bulk remove").
  popup('agreements.remove-terms', 'Bulk remove', 'trash',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Delete_Terms.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Remove terms', refreshList('us-action-agreements-add-term'));
  popup('agreements.edit-coverage', 'Update coverage', 'pencil',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Popups/Coverage.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Edit coverage rules', {when: 'close', targets: [{type: 'origin-report'}]});
  // Layout v2 (index-v2.html): the Add scheduled increase BeyondForm moves to a
  // popup page. PLACEHOLDER URL: the form needs its own page first.
  popup('agreements.add-increase', 'Add increase', 'plus',
    ({context}) => page('/_i4u_/Core/Collective_Agreements/v2/Add_Scheduled_Increase.aspx', {AgreementID: context.agreementId, AgreementNum: context.agreementNum}),
    'Add scheduled increase', {when: 'close', targets: [{type: 'origin-report'}]});

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
  rowPopup('agreements.view-note', 'Open note', openLink, noteDetails(''), 'Note', formWidth);
  // The eye button on a ledger note row (us-notes--ledger); same popup as Open note.
  rowPopup('agreements.preview-note', 'View note', {icon: 'ti-eye', default: 'button', row: 'icon'}, noteDetails(''), 'Note', formWidth);
  rowPopup('agreements.view-task', 'Open task', openLink, noteDetails('Task'), 'Task', formWidth);
  // The eye button at the end of a task row; same popup as the title link.
  rowPopup('agreements.preview-task', 'View task', {icon: 'ti-eye', default: 'button', row: 'icon'}, noteDetails('Task'), 'Task', formWidth);
  rowPopup('agreements.view-milestone', 'Open milestone', openLink, noteDetails('Milestones'), 'Milestone', formWidth);
  rowPopup('agreements.view-meeting', 'Open meeting', openLink,
    ({context}) => page('/Agreements_EditMeeting', {AgreementID: context.agreementId, AgreementOrdinal: context.agreementNum, MeetingOrdinal: context.ordinal}),
    'Edit meeting', formWidth);
  rowPopup('agreements.edit-contact', 'Edit contact', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Contact/Edit-Contact-Information.aspx', {ID: context.ordinal}),
    'Edit contact');
  rowPopup('agreements.edit-term', 'Edit term', editIcon,
    ({context}) => page('/_i4u_/Core/Collective_Agreements/Layouts/Popups/Add-or-Update-Term.aspx', {AgreementOrdinal: context.agreementNum, TermOrdinal: context.ordinal}),
    'Update term');

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

  window.UnionSuiteAgreements = Object.freeze({cloudToolz, saveItemStatus, version: '1.0'});

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
