/* Supported offline simulation of the case member card (US-CASE-MEMBER)
   and its workplace choice (US-CASE-WORKPLACE). The card, its details
   layout and the jobs menu are the theme's own code; only the sample rows,
   the two IQAs (GET /api/query) and the CloudToolz save are stand-ins.
   Runs before zUnionSuite.js, so the fetch stub is in place when the theme
   starts. */
(function () {
  'use strict';

  // Case - Primary Member: one row per card, the same member on three
  // cases: one about a current job, one about a former job, one with none
  // chosen yet.
  const member = {MemberId: '20544', MemberName: 'Priya Natarajan', MemberUrl: '#party-20544', MemberLine: 'Member 20544 · Full member', OtherParties: ''};
  const cards = [
    {label: 'A current job', row: {...member, CaseNum: '214', CaseWorkplaceID: '4101', OtherParties: 'Also on this case: Josh Kemp.'}},
    {label: 'A former job', row: {...member, CaseNum: '216', CaseWorkplaceID: '3907'}},
    {label: 'None chosen yet', row: {...member, CaseNum: '215', CaseWorkplaceID: ''}}
  ];

  // API - Manage Case - Member Workplaces: the member's jobs, current and
  // former, with their dates and the Work-* columns that fill the card on
  // a pick.
  const jobs = [
    {WorkplaceID: '4101', WorkplaceName: 'Dandenong DC – night shift', WorkplaceLine: 'Northside Distribution Pty Ltd · Storeperson Grade 2',
      WorkplaceStatus: 'Current', WorkplaceStart: '2020-03-02T00:00:00', WorkplaceEnd: '',
      'Work-Employer': 'Northside Distribution Pty Ltd', 'Work-Workplace': 'Dandenong DC – night shift', 'Work-Classification': 'Storeperson Grade 2', 'Work-Delegate': 'Alex Keaton'},
    {WorkplaceID: '4188', WorkplaceName: 'Frankston Hospital – catering', WorkplaceLine: 'Bayside Health · Food services assistant',
      WorkplaceStatus: 'Current', WorkplaceStart: '2023-08-14T00:00:00', WorkplaceEnd: '',
      'Work-Employer': 'Bayside Health', 'Work-Workplace': 'Frankston Hospital – catering', 'Work-Classification': 'Food services assistant', 'Work-Delegate': 'Tom Becker'},
    {WorkplaceID: '3907', WorkplaceName: 'Westgate Cold Storage – Laverton', WorkplaceLine: 'Westgate Logistics Pty Ltd · Storeperson Grade 1',
      WorkplaceStatus: 'Former', WorkplaceStart: '2016-03-07T00:00:00', WorkplaceEnd: '2019-01-25T00:00:00',
      'Work-Employer': 'Westgate Logistics Pty Ltd', 'Work-Workplace': 'Westgate Cold Storage – Laverton', 'Work-Classification': 'Storeperson Grade 1', 'Work-Delegate': 'Dana Whitfield'}
  ];

  // Case - Member Details, filtered on CaseNum: the case's job in the
  // Work-* columns (joined on PrimaryContactWorkplaceID), blank while none
  // is chosen.
  const details = {'Alert-Title': 'Unfinancial', 'Alert-Message': 'Paid to 30 Jun 2026. Check eligibility before providing assistance.', 'Alert-Tone': 'danger',
    'Contact-Mobile': '0412 555 019', 'Contact-Email': 'priya.n@example.com', 'Membership-Paid to': '2026-06-30T00:00:00', 'Membership-Joined': '2019-02-11T00:00:00'};
  const blankWork = {'Work-Employer': '', 'Work-Workplace': '', 'Work-Classification': '', 'Work-Delegate': ''};
  const workOf = id => {
    const job = jobs.find(entry => entry.WorkplaceID === id);
    return job ? Object.fromEntries(Object.entries(job).filter(([name]) => name.startsWith('Work-'))) : blankWork;
  };
  const chosen = Object.fromEntries(cards.map(({row}) => [row.CaseNum, row.CaseWorkplaceID]));
  // Only the details read follows the case: the page's CaseNum, which the
  // jobs read and the save send, is blank in an example frame.

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[c]));
  const fill = (template, row) => template.replace(/\{#query\.(\w+)\}/g, (_, field) => escapeHtml(row[field]));

  // Each card as iMIS renders a Query Template Display: the iPart CSS class
  // div, the panel, and the one result.
  const template = window.caseMemberTemplate.replace(/<!--[\s\S]*?-->/g, '').trim();
  document.getElementById('member-demo').innerHTML = cards.map(({label, row}) =>
    '<div><p class="demo-label">' + escapeHtml(label) + '</p>' +
    '<div class="ContentItemContainer"><div class="us-query-template"><div class="panel">' +
    '<div class="panel-heading"><h2 class="panel-title">Member</h2></div>' +
    '<div class="panel-body-container"><div class="panel-body"><div class="QueryTemplateSet">' +
    '<section><div class="QueryTemplateItem">' + fill(template, row) + '</div></section>' +
    '</div></div></div></div></div></div></div>').join('');

  const status = text => { document.getElementById('demo-status').textContent = text; };
  const reply = (rows, delay) => new Promise(resolve => setTimeout(() =>
    resolve(new Response(JSON.stringify({Items: {$values: rows}}), {status: 200, headers: {'Content-Type': 'application/json'}})), delay));
  const nativeFetch = window.fetch.bind(window);
  window.fetch = (input, init) => {
    // A srcdoc frame's own address is about:srcdoc, which cannot resolve a path.
    const url = new URL(String(input?.url || input), 'https://guide.example/');
    if (!url.pathname.endsWith('/api/query')) return nativeFetch(input, init);
    const query = url.searchParams.get('QueryName') || '';
    if (query.endsWith('/API - Manage Case - Member Workplaces')) return reply(jobs, 250);
    const caseNum = url.searchParams.get('CaseNum');
    return reply(caseNum in chosen ? [{...details, ...workOf(chosen[caseNum])}] : [], 250);
  };

  // The theme saves through CloudToolz (UnionSuiteAgreements.cloudToolz in
  // Scripts/ActionDefinitions.js); the example answers in its place and
  // reports what would be saved.
  document.addEventListener('DOMContentLoaded', () => {
    window.UnionSuiteAgreements = Object.freeze({...window.UnionSuiteAgreements, cloudToolz: () =>
      new Promise(resolve => setTimeout(() => resolve(new Response('{}', {status: 200})), 300))});
  });
  document.addEventListener('us:case-workplace-changed', event => {
    const job = event.detail.job;
    status('Saved (simulated): ' + (job ? 'this case is now about ' + job.WorkplaceName + '.' : 'this case isn’t about a workplace.') + ' Nothing is sent.');
  });
})();
