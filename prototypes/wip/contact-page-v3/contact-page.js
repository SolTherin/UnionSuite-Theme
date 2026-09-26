// OFFLINE PROTOTYPE ONLY. Never installed in the theme.
// 1. Replaces fetch so the shared Needs Attention loader renders contact
//    trackers, and the activity feed (item 32) gets its five source IQAs.
// 2. Simulates native CCO tab selection (the real page posts back or uses the
//    theme's in-place CCO switch; neither can run from a local file).
// 3. Announces demo-only commands instead of running them.
// 4. Stands in for the Transaction detail popup page (invoices, payments).
(() => {
  // Contact-scoped tracker IQAs: Name, Count, Header, Label, Link.
  const trackers = [
    ['01 Open cases', 2, 'Open cases', '1 escalated', '#cases'],
    ['02 Overdue invoices', 1, 'Overdue invoices', '$185 since 01 Mar', '#finance'],
    ['03 Failed payments', 3, 'Failed payments', 'Last attempt 15 Mar', '#finance'],
    ['04 Pending requests', 1, 'Pending requests', 'Resignation submitted', '']
  ];
  // Toolbar "Trackers: all clear": every tracker IQA returns 0 (a member in
  // good standing), to show the us-attention--hide-zero all-clear line.
  let trackersAllClear = false;
  const folderId = '00000000-0000-4000-8000-000000000200';

  // Contact alerts IQA rows, newest first (AlertKey, Severity, Title, Message, AlertDate, Link).
  const alerts = [
    { AlertKey: 'A-1042', Severity: 'important', Title: 'Resignation request pending', Message: 'Submitted by the member: leaving nursing to travel.', AlertDate: '08 May 2026', Link: '' },
    { AlertKey: 'A-1017', Severity: 'warning', Title: 'Overdue payment', Message: '$185.00 outstanding after 3 failed direct debit attempts.', AlertDate: '15 Mar 2026', Link: '#finance' }
  ];
  // Counts are for things that need attention, not volume: a member can have
  // hundreds of activity records, and the number says nothing useful. The
  // Tab Counts IQA returns a row only for the tabs worth marking.
  const tabCounts = [
    { Tab: 'Finance', Count: 1, Tone: 'danger', Badge: '!' },
    { Tab: 'Cases', Count: 2, Tone: 'warning', Badge: '' }
  ];
  const sampleAlert = { AlertKey: 'A-1051', Severity: 'danger', Title: 'Email bounced', Message: 'Preferred email s.reynolds@metrohealth.gov.au bounced today.', AlertDate: 'Today', Link: '#profile' };
  const ids = trackers.map((_, index) => '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'));

  // Active and upcoming adjustments (item 33): pin "today" to the sample
  // page's 14 May 2026, so "5 months left" and "in 5 months" stay fixed.
  // Production uses the real date.
  window.UnionSuiteAdjustmentsConfig = { ...(window.UnionSuiteAdjustmentsConfig || {}), today: '2026-05-14' };

  // Activity feed source IQAs (item 32), one list per query name, in the
  // US-ACTIVITY-FEED field contract. The sample page's "today" is 14 May 2026.
  // Toolbar "Activity: one failing" makes the Meetings query return HTTP 500.
  const activityFolder = '$/_i4u_/SandBox/CRM Layouts/Contact_Page/Activity/';
  const activityRow = (ActivityKey, ActivityDate, StaffName, Subject, Summary, extra = {}) =>
    ({ ActivityKey, ActivityDate, StaffName, Subject, Summary, RecordUrl: '#activity-record', ...extra });
  const grievance = { CaseRef: 'WG-2026-041', CaseUrl: '#cases' };
  const entitlement = { CaseRef: 'MQ-2026-019', CaseUrl: '#cases' };
  const member = 's.reynolds@metrohealth.gov.au';
  const completed = { Outcome: 'Completed' };
  const leftMessage = { Outcome: 'Left message', OutcomeTone: 'warning' };
  const activity = {
    'Interactions': [
      activityRow('I-3107', '2026-05-08T16:20:00', 'Member portal', '', 'Submitted through the member portal: leaving nursing to travel from July.', { Outcome: 'Pending', OutcomeTone: 'warning', Detail: 'Resignation requested effective 30 June 2026. Reason given: leaving nursing to travel. Retention call to be made before processing.' }),
      activityRow('I-3094', '2026-04-30T11:05:00', 'M. Chen', '', 'Signed statement for the overtime grievance saved to Documents.', { ...grievance, AttachmentCount: 1 }),
      activityRow('I-3080', '2026-04-28T09:40:00', 'M. Chen', '', 'Employer did not respond within 14 days; escalated for a formal dispute notice.', { PriorityFlag: 'Urgent', ...grievance, Outcome: 'Escalated', OutcomeTone: 'danger' }),
      activityRow('I-3051', '2026-04-10T14:15:00', 'A. Smith', '', 'Member asked how clause 14.3 limits rostered overtime.', entitlement),
      activityRow('I-2988', '2026-03-15T14:34:00', 'J. Patel', '', 'Member is in financial difficulty after extended sick leave; will pay $185.00 by 30 March.', { Detail: 'Called member re overdue Q1 payment. Member advised she is experiencing financial difficulty following extended sick leave. Agreed to a payment arrangement – will pay by 30 March.' }),
      activityRow('I-2950', '2026-02-02T10:12:00', 'M. Chen', '', 'Manager rostering excessive overtime without consent; rights under EBA clause 14.3 explained.', { ...grievance, Detail: 'Initial intake call for workplace grievance. Member alleges manager has been rostering her for excessive overtime without consent. Advised member of rights under the EBA clause 14.3. Will escalate to industrial officer.' }),
      activityRow('I-2911', '2026-01-12T09:00:00', 'System', '', 'Opted out of the newsletter list through the member portal.'),
      activityRow('I-2702', '2025-10-21T13:30:00', 'A. Smith', '', 'Added to the shortlist for the next delegate training intake.'),
      activityRow('I-2455', '2025-06-02T10:00:00', 'System', '', 'Registration certificate for 2025–26 saved to Documents.', { AttachmentCount: 1 }),
      activityRow('I-2101', '2024-06-03T15:10:00', 'A. Smith', '', 'Resolved informally with the nurse unit manager; member satisfied.', { CaseRef: 'WG-2024-112', CaseUrl: '#cases', Outcome: 'Closed' })
    ],
    'Outbound Calls': [
      activityRow('C-5521', '2026-05-12T10:15:00', 'J. Patel', '', 'No answer; voicemail about the $185.00 still outstanding.', { PriorityFlag: 'High', ...leftMessage, With: 'Member', Duration: '1m 04s' }),
      activityRow('C-5498', '2026-05-09T15:30:00', 'A. Smith', '', 'Discussed leave without pay and retired membership instead of resigning.', { ...completed, With: 'Member', Duration: '14m 05s', Detail: 'Member plans to travel for 12 months and may return to nursing. Explained leave without pay (no fees, cover paused) and retired membership. Member will decide by 20 May.' }),
      activityRow('C-5460', '2026-04-29T12:10:00', 'M. Chen', '', 'Explained the escalation and the next steps with the employer.', { ...grievance, ...completed, With: 'Member', Duration: '9m 12s' }),
      activityRow('C-5433', '2026-04-14T11:00:00', 'A. Smith', '', 'Walked through the overtime limits and how to decline extra shifts.', { ...entitlement, ...completed, With: 'Member', Duration: '7m 30s' }),
      activityRow('C-5390', '2026-03-15T14:10:00', 'J. Patel', '', 'Member on reduced pay after sick leave; arrangement to pay by 30 March.', { ...completed, With: 'Member', Duration: '18m 02s' }),
      activityRow('C-5301', '2026-03-02T09:20:00', 'J. Patel', '', 'No answer; voicemail asking the member to call about the declined debit.', { ...leftMessage, With: 'Member', Duration: '0m 58s' }),
      activityRow('C-5102', '2025-11-18T16:45:00', 'A. Smith', '', 'Invited to the delegate training day; member accepted.', { ...completed, With: 'Member', Duration: '5m 10s' }),
      activityRow('C-4870', '2025-08-20T10:30:00', 'J. Patel', '', 'Confirmed the preferred email address and corrected a typo.', { ...completed, With: 'Member', Duration: '3m 22s' })
    ],
    'Outbound Emails': [
      activityRow('E-9921', '2026-05-10T08:00:00', 'System', 'Overdue payment reminder – Q1 2026', '$185.00 outstanding; pay online or call to arrange a payment plan.', { With: member }),
      activityRow('E-9905', '2026-05-09T16:02:00', 'A. Smith', 'Your resignation request', 'Acknowledged the request and set out the notice period and alternatives.', { With: member, AttachmentCount: 1, Outcome: 'Opened' }),
      activityRow('E-9870', '2026-05-04T07:30:00', 'System', 'Branch meeting — 20 May', 'Invitation to the Sydney Metro branch meeting.', { With: member }),
      activityRow('E-9844', '2026-04-30T11:20:00', 'M. Chen', 'WG-2026-041: statement received', 'Confirmed the signed statement and the next steps.', { ...grievance, With: member, Outcome: 'Opened' }),
      activityRow('E-9820', '2026-04-22T07:30:00', 'System', 'EBA bargaining update #4', 'Employer’s revised offer and the members’ response.', { With: member }),
      activityRow('E-9790', '2026-04-14T11:30:00', 'A. Smith', 'EBA entitlement: clause 14.3', 'Written summary of the overtime limits, with the clause attached.', { ...entitlement, With: member, AttachmentCount: 1, Outcome: 'Opened' }),
      activityRow('E-9760', '2026-04-08T07:30:00', 'System', 'EBA bargaining update #3', 'Progress on rostering and overtime claims.', { With: member }),
      activityRow('E-9731', '2026-03-25T07:30:00', 'System', 'EBA bargaining update #2', 'Summary of the second bargaining meeting.', { With: member }),
      activityRow('E-9702', '2026-03-16T09:05:00', 'J. Patel', 'Payment arrangement confirmation', 'Confirms payment of $185.00 by 30 March.', { With: member, Outcome: 'Opened' }),
      activityRow('E-9660', '2026-03-15T16:00:00', 'System', 'Direct debit suspended', 'Direct debit suspended after three declined attempts.', { With: member }),
      activityRow('E-9611', '2026-03-08T06:00:00', 'System', 'Direct debit declined (attempt 2)', 'Second attempt for invoice INV-2026-031 declined.', { With: member }),
      activityRow('E-9590', '2026-03-01T06:00:00', 'System', 'Direct debit declined (attempt 1)', 'First attempt for invoice INV-2026-031 declined.', { With: member }),
      activityRow('E-9540', '2026-02-15T06:00:00', 'System', 'Invoice INV-2026-031 – Q1 2026', 'Q1 2026 subscription, $185.00, due 01 March.', { With: member, AttachmentCount: 1 }),
      activityRow('E-9400', '2026-01-12T09:00:00', 'System', 'Annual renewal notice 2026', 'Renewal notice sent to the primary email address.', { With: member }),
      activityRow('E-9102', '2025-10-01T06:00:00', 'System', 'Receipt R-52611', 'Receipt for the Q3 2025 direct debit.', { With: member }),
      activityRow('E-8870', '2025-08-14T07:30:00', 'System', 'EBA ballot information', 'Ballot pack and voting instructions.', { With: 's.reynolds@metrohealth.gov.au', Outcome: 'Bounced', OutcomeTone: 'danger' }),
      activityRow('E-8600', '2025-06-20T12:05:00', 'System', 'Receipt R-51240', 'Receipt for the card payment taken by phone.', { With: member })
    ],
    'Inbound Emails': [
      activityRow('R-4410', '2026-05-08T16:25:00', 'Membership team', 'Resignation', 'Leaving nursing to travel from July; please confirm the next steps.', { With: member }),
      activityRow('R-4388', '2026-04-30T10:48:00', 'M. Chen', 'Signed statement', 'Signed grievance statement attached.', { ...grievance, With: member, AttachmentCount: 1 }),
      activityRow('R-4350', '2026-04-10T13:52:00', 'A. Smith', 'Question about the overtime clause', 'Can my manager roster overtime without asking me first?', { ...entitlement, With: member }),
      activityRow('R-4300', '2026-03-14T19:12:00', 'J. Patel', 'Can’t pay this week', 'On reduced pay after sick leave; asked for a call about the failed debits.', { With: member }),
      activityRow('R-4211', '2026-01-28T21:04:00', 'M. Chen', 'Overtime rosters', 'Rosters for the last six weeks showing unrequested overtime.', { ...grievance, With: member, AttachmentCount: 2 }),
      activityRow('R-4050', '2025-08-21T08:15:00', 'J. Patel', 'Re: email address', 'Confirmed the corrected email address.', { With: member })
    ],
    'Meetings': [
      activityRow('M-770', '2026-05-06T17:30:00', 'M. Chen', 'Grievance meeting with the employer', 'Employer agreed to review overtime rostering on the ward.', { ...grievance, With: 'Member, M. Chen, Metro Health HR', Duration: '60 min', Outcome: 'Follow-up booked', OutcomeTone: 'primary' }),
      activityRow('M-742', '2026-04-02T12:30:00', 'A. Smith', 'Ward delegate lunch', 'Rostering concerns raised by four members on the ward.', { With: 'Member, ward delegates', Duration: '45 min' }),
      activityRow('M-701', '2026-02-19T18:00:00', 'A. Smith', 'Branch meeting', 'Attended the Sydney Metro branch meeting; EBA claims endorsed.', { With: 'Branch members', Duration: '90 min' }),
      activityRow('M-640', '2025-09-10T14:00:00', 'A. Smith', 'Workplace visit — Ward 4B', 'Met members on the ward about staffing levels.', { With: 'Member, ward members', Duration: '40 min' })
    ]
  };
  let activityFailing = false;

  window.fetch = async (input, options = {}) => {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = new URL(input, 'https://example.invalid');
    let data;

    if (url.pathname.endsWith('/api/DocumentSummary/_execute')) {
      const request = JSON.parse(options.body);
      if (request.OperationName === 'FindByPath') {
        data = { Result: { DocumentId: folderId } };
      } else if (request.OperationName === 'FindDocumentsInFolder') {
        data = {
          Result: {
            $values: trackers.map((row, index) => ({ Name: row[0], DocumentTypeId: 'IQD', DocumentVersionId: ids[index] }))
          }
        };
      }
    } else if (url.pathname.endsWith('/api/query') && /Tab Counts$/.test(url.searchParams.get('QueryName') || '')) {
      // Contact tab counts IQA: Tab (exact label), Count, Tone, optional Badge.
      data = { TotalCount: tabCounts.length, Items: { $values: tabCounts } };
    } else if (url.pathname.endsWith('/api/query') && /Alerts$/.test(url.searchParams.get('QueryName') || '')) {
      const limit = Number(url.searchParams.get('limit')) || 100;
      data = { TotalCount: alerts.length, Items: { $values: alerts.slice(0, limit) } };
    } else if (url.pathname.endsWith('/api/query') && (url.searchParams.get('QueryName') || '').startsWith(activityFolder)) {
      // Activity sources: filtered on ID and StartDate, newest first, paged by
      // limit and offset, answering at slightly different speeds.
      const name = url.searchParams.get('QueryName').slice(activityFolder.length);
      await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 300));
      if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      if (activityFailing && name === 'Meetings') return { ok: false, status: 500, json: async () => ({}) };
      const start = url.searchParams.get('StartDate') || '';
      const rows = (url.searchParams.get('ID') === '004821' ? activity[name] || [] : [])
        .filter(row => row.ActivityDate.slice(0, 10) >= start)
        .sort((a, b) => b.ActivityDate.localeCompare(a.ActivityDate));
      const limit = Number(url.searchParams.get('limit')) || 100;
      const offset = Number(url.searchParams.get('offset')) || 0;
      const page = rows.slice(offset, offset + limit);
      data = { TotalCount: rows.length, Offset: offset, Limit: limit, Count: page.length, HasNext: offset + page.length < rows.length, Items: { $values: page } };
    } else if (url.pathname.endsWith('/api/iqa')) {
      const index = ids.indexOf(url.searchParams.get('QueryDocumentVersionKey'));
      if (index >= 0) {
        const values = ['Count', 'Header', 'Label', 'Link'].map((name, column) => ({
          Name: name,
          Value: name === 'Count' && trackersAllClear ? 0 : trackers[index][column + 1]
        }));
        data = { TotalCount: 1, Items: { $values: [{ Properties: { $values: values } }] } };
      }
    }

    if (!data) throw Error('No network requests are made by this offline prototype.');
    return { ok: true, status: 200, json: async () => data };
  };

  const toast = message => {
    const node = document.getElementById('cv2-toast');
    // An open modal dialog sits in the top layer; show the toast inside it.
    const host = document.querySelector('dialog[open]') || document.body;
    if (node.parentElement !== host) host.append(node);
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2400);
  };

  function selectView(key) {
    const cco = document.getElementById('cv2-cco');
    const link = cco?.querySelector(`a.rtsLink[data-view="${key}"]`);
    if (!link) return false;

    cco.querySelectorAll('a.rtsLink').forEach(item => {
      const selected = item === link;
      item.classList.toggle('rtsSelected', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    cco.querySelectorAll('.rmpView').forEach(view => {
      view.classList.toggle('rmpHidden', view.id !== 'view-' + key);
    });
    // Remember the tab in the URL where the page has one of its own. Viewers
    // that load the standalone file as srcdoc refuse any URL change.
    try {
      history.replaceState(null, '', '#' + key);
    } catch (error) { /* optional */ }
    return true;
  }

  // Reports measured button heights so the comparison is not by eye alone.
  function measureButtons() {
    const strip = document.getElementById('cv3-buttons');
    if (strip.hidden) return;
    const height = selector => Math.round(strip.querySelector(selector).getBoundingClientRect().height);
    const font = selector => getComputedStyle(strip.querySelector(selector)).fontSize;
    document.getElementById('cv3-button-sizes').textContent =
      'Measured: standard ' + height('.cv3-buttons__row:nth-child(1) .TextButton') + 'px / ' + font('.cv3-buttons__row:nth-child(1) .TextButton') +
      ' · small ' + height('.SmallButton') + 'px / ' + font('.SmallButton') +
      ' · alert ' + height('.us-alerts__actions .TextButton') + 'px / ' + font('.us-alerts__actions .TextButton') +
      ' · field ' + height('.cv3-buttons__set input') + 'px';
  }

  // Tab rail side: stands in for the CCO iPart's "Tab display style"
  // setting (Vertical right, the default here, or Vertical left), swapping
  // the classes iMIS renders for each. Remembered for this prototype only.
  // Theme layout adapters (sticky rail, section underline) measure on
  // resize, so a synthetic resize re-measures after the switch.
  function setRailSide(right, remember = true) {
    const cco = document.getElementById('cv2-cco');
    const strip = cco?.querySelector(':scope > .RadTabStripVertical');
    const button = document.getElementById('cv3-rail-side');
    cco?.classList.toggle('tabs-right', right);
    cco?.classList.toggle('tabs-left', !right);
    strip?.classList.toggle('RadTabStripRight', right);
    strip?.classList.toggle('RadTabStripRight_Orion', right);
    strip?.classList.toggle('RadTabStripLeft', !right);
    strip?.classList.toggle('RadTabStripLeft_Orion', !right);
    button.setAttribute('aria-pressed', String(right));
    button.textContent = right ? 'Tabs: right' : 'Tabs: left';
    if (remember) {
      try { localStorage.setItem('cv3TabsSide', right ? 'right' : 'left'); } catch (error) { /* optional */ }
    }
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  // Colour scheme: drives the theme's own UnionSuiteAppearance, so the choice is
  // the real site preference (localStorage 'union-suite:appearance:v1').
  function showColorScheme() {
    const button = document.getElementById('cv3-color-scheme');
    const dark = window.UnionSuiteAppearance?.getState().scheme === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.textContent = dark ? 'Mode: dark' : 'Mode: light';
  }
  window.addEventListener('unionsuite:appearancechange', showColorScheme);

  // Payment type and arrears. Members pay one of three ways, and only invoice
  // members have invoices:
  // - auto debit: card or bank account, charged automatically;
  // - invoice: an owed amount is sent to the member (BPAY or EFT);
  // - payroll: the employer deducts it from salary (pre-tax) and remits it.
  // The toolbar switches the type (Billing, Balance, Outstanding, payment
  // history) and the arrears (also the Summary alert, bell, Finance tab
  // badge, tracker and Financial status). Outstanding is removed when there
  // is nothing to list, as its iPart does not render an empty query.
  const owingRow = (ref, type, description, due, amount, [tone, text, title]) =>
    '<tr class="rgRow"><td><a href="#" class="us-action-finance-view-transaction" data-id="004821" data-transaction="' + ref + '">' + ref + '</a></td><td>' + type +
    '</td><td>' + description + '</td><td>' + due + '</td><td class="cv2-num">' + amount + '</td><td><span class="us-badge us-badge--icon us-badge--' + tone +
    '" title="' + title + '">' + text + '</span></td></tr>';
  const historyRow = (ref, date, [tone, text, icon], description, method, amount, index) =>
    '<tr class="' + (index % 2 ? 'rgAltRow' : 'rgRow') + '"><td><a href="#" class="us-action-finance-view-transaction" data-id="004821" data-transaction="' + ref + '">' + ref +
    '</a></td><td>' + date + '</td><td><span class="us-badge us-badge--icon' + (tone ? ' us-badge--' + tone : '') + '"' + (icon ? ' data-us-icon="' + icon + '"' : '') + '>' + text +
    '</span></td><td>' + description + '</td><td>' + method + '</td><td class="cv2-num">' + amount + '</td></tr>';
  const refundRow = ['PAY-8105', '12 Nov 2025', ['', 'Refunded', 'refund'], 'Delegate training day · cancelled, refunded to credit CR-0204', 'Credit card', '$25.00'];
  const paymentTypes = {
    auto: {
      label: 'auto debit',
      billing: ['Auto debit', 'Quarterly', '$165.00', 'Bank account · BSB 062-000 ••••4821', '01 Jul 2026'],
      owing: [['PAY-8654', 'Failed debit', 'Q1 2026 subscription · 3 attempts declined', '01 Mar 2026', '$185.00', ['danger', 'Overdue', '74 days overdue']]],
      current: [],
      totals: [['$185.00 · 74 days overdue', '$185.00 · 1 failed debit'], ['None', 'Nothing outstanding']],
      bell: '$185.00 outstanding after 3 failed direct debit attempts.',
      settled: [2, ['PAY-8870', '22 Mar 2026', ['success', 'Paid'], 'Q1 2026 subscription · paid by card after 3 declined debits', 'Credit card', '$185.00']],
      alert: '$185.00 outstanding since 01 Mar 2026 after 3 failed direct debit attempts. Membership may be suspended if not resolved within 14 days.',
      history: null
    },
    invoice: {
      label: 'invoice',
      billing: ['Invoice', 'Quarterly', '$165.00', 'BPAY or EFT · invoice emailed, ref 0048217', '01 Jul 2026'],
      owing: [
        ['INV-2026-031', 'Invoice', 'Q1 2026 subscription', '01 Mar 2026', '$185.00', ['danger', 'Overdue', '74 days overdue']],
        ['INV-2026-058', 'Invoice', 'Q3 2026 subscription', '01 Jul 2026', '$165.00', ['primary', 'Due', 'Due in 48 days']]
      ],
      current: [['INV-2026-058', 'Invoice', 'Q3 2026 subscription', '01 Jul 2026', '$165.00', ['primary', 'Due', 'Due in 48 days']]],
      totals: [['$185.00 · 74 days overdue', '$350.00 across 2 invoices'], ['None', '$165.00 · 1 invoice, due 01 Jul']],
      bell: 'Invoice INV-2026-031 ($185.00) is 74 days overdue.',
      settled: [1, ['PAY-8702', '27 Feb 2026', ['success', 'Paid'], 'Q1 2026 · invoice INV-2026-031', 'BPAY', '$185.00']],
      alert: '$185.00 outstanding since 01 Mar 2026: invoice INV-2026-031 is unpaid. Membership may be suspended if not resolved within 14 days.',
      history: [
        ['PAY-8830', '28 Mar 2026', ['success', 'Paid'], 'Q2 2026 · invoice INV-2026-044', 'BPAY', '$165.00'],
        ['PAY-8420', '04 Jan 2026', ['success', 'Paid'], 'Q4 2025 · invoice INV-2025-061', 'EFT', '$185.00'],
        refundRow,
        ['PAY-8012', '02 Oct 2025', ['success', 'Paid'], 'Q3 2025 · invoice INV-2025-048', 'BPAY', '$185.00']
      ]
    },
    payroll: {
      label: 'payroll',
      billing: ['Payroll deduction', 'Fortnightly', '$25.38', 'Metro Health Services payroll · employee no. 55821', '28 May 2026'],
      owing: [['RM-2026-10', 'Missed deduction', 'Pay periods 9–10 · not remitted by Metro Health Services', '14 May 2026', '$50.76', ['danger', 'Overdue', 'Remittance not received']]],
      current: [],
      totals: [['$50.76 · 2 pays not remitted', '$50.76 · 1 missed remittance'], ['None', 'Nothing outstanding']],
      bell: 'Metro Health Services did not remit $50.76 (pay periods 9–10).',
      settled: [0, ['RM-2026-11', '21 May 2026', ['success', 'Paid'], 'Pay periods 9–10 · late remittance received', 'Payroll', '$50.76']],
      alert: '$50.76 outstanding: Metro Health Services did not remit deductions for pay periods 9–10. Check the member is still on the employer’s payroll.',
      history: [
        ['RM-2026-10', '14 May 2026', ['warning', 'Not received'], 'Pay periods 9–10 · Metro Health Services remittance', 'Payroll', '$50.76'],
        ['RM-2026-08', '16 Apr 2026', ['success', 'Paid'], 'Pay periods 7–8 · Metro Health Services remittance', 'Payroll', '$50.76'],
        ['RM-2026-06', '19 Mar 2026', ['success', 'Paid'], 'Pay periods 5–6 · Metro Health Services remittance', 'Payroll', '$50.76'],
        refundRow
      ]
    }
  };
  const typeOrder = ['auto', 'invoice', 'payroll'];
  let paymentType = 'auto';
  let inArrears = true;
  let autoHistory = null;
  let adjustmentRows = null;

  const overdueAlert = alerts.find(alert => alert.AlertKey === 'A-1017');
  const financeCount = tabCounts.find(count => count.Tab === 'Finance');
  const overdueTracker = trackers[1];
  const notDueTracker = ['02 Overdue invoices', 0, 'Overdue invoices', 'Nothing overdue', '#finance'];

  const paintBadge = (badge, [tone, text, title]) => {
    badge.className = 'us-badge us-badge--' + tone;
    badge.textContent = text;
    badge.title = title;
  };
  const include = (list, item, wanted) => {
    const index = list.indexOf(item);
    if (wanted && index < 0) list.push(item);
    if (!wanted && index >= 0) list.splice(index, 1);
  };
  const setText = (id, text) => { const node = document.getElementById(id); if (node) node.textContent = text; };

  function applyFinanceState() {
    const type = paymentTypes[paymentType];
    ['cv3-bill-type', 'cv3-bill-frequency', 'cv3-bill-amount', 'cv3-bill-method', 'cv3-bill-next'].forEach((id, index) => setText(id, type.billing[index]));

    const rows = inArrears ? type.owing : type.current;
    const body = document.getElementById('cv3-outstanding-rows');
    if (body) body.innerHTML = rows.map(row => owingRow(...row)).join('');
    const outstanding = document.getElementById('cv3-outstanding');
    if (outstanding) outstanding.hidden = !rows.length;

    const [arrearsText, totalText] = type.totals[inArrears ? 0 : 1];
    const arrears = document.getElementById('cv3-arrears');
    if (arrears) paintBadge(arrears, inArrears ? ['danger', arrearsText, 'Oldest amount owing is overdue'] : ['success', arrearsText, 'Nothing is past its due date']);
    setText('cv3-outstanding-total', totalText);

    const history = document.getElementById('cv3-payment-rows');
    if (history) {
      autoHistory ??= history.innerHTML;
      history.innerHTML = type.history ? type.history.map((row, index) => historyRow(...row, index)).join('') : autoHistory;
      // Without arrears, the payment that settled the amount is in the history.
      if (!inArrears) {
        const [position, row] = type.settled;
        const template = document.createElement('tbody');
        template.innerHTML = historyRow(...row, position);
        history.insertBefore(template.firstElementChild, history.rows[position] || null);
      }
    }

    const financial = document.getElementById('cv3-financial-status');
    if (financial) paintBadge(financial, inArrears ? ['danger', 'Overdue', 'Payment overdue'] : ['success', 'Current', 'Nothing overdue']);
    const alert = document.getElementById('cv3-overdue-alert');
    if (alert) {
      alert.hidden = !inArrears;
      const text = alert.querySelector('p');
      if (text) text.innerHTML = '<strong>Overdue payment.</strong> ' + type.alert;
    }
    overdueAlert.Message = type.bell;
    include(alerts, overdueAlert, inArrears);
    include(tabCounts, financeCount, inArrears);
    trackers[1] = inArrears ? overdueTracker : notDueTracker;
    window.UnionSuiteBannerAlerts?.reload();
    window.UnionSuiteCcoSidebar?.reloadCounts();
    document.querySelectorAll('.cv2-trackers').forEach(root => window.UnionSuiteAttention?.reload(root));

    const arrearsButton = document.getElementById('cv3-invoice-state');
    arrearsButton.setAttribute('aria-pressed', String(inArrears));
    arrearsButton.textContent = inArrears ? 'Arrears: overdue' : 'Arrears: none';
    document.getElementById('cv3-payment-type').textContent = 'Pays by: ' + type.label;
  }

  // Transaction detail: sample data for the popup page that
  // us-action-finance-view-transaction opens (one page for invoices and
  // payments). fields: [label, value]; lines: [item, amount]; history:
  // [date, event, by]. Values may hold links to related transactions.
  const link = ref => '<a href="#" class="us-action-finance-view-transaction" data-id="004821" data-transaction="' + ref + '">' + ref + '</a>';
  const sent = 'Emailed to member';
  const transactions = {
    'INV-2026-031': {
      kind: 'invoice', status: ['danger', 'Overdue'], owing: true,
      fields: [['Description', 'Q1 2026 subscription'], ['Issued', '15 Feb 2026'], ['Due', '01 Mar 2026'], ['Amount', '$185.00'], ['Paid', '$0.00'], ['Owing', '$185.00'], ['Billing method', 'Direct debit · ••••4821 (suspended)'], ['Payments', link('PAY-8654') + ' · 3 declined attempts']],
      lines: [['Membership fee · Full Member – RN · Q1 2026', '$185.00']],
      history: [['15 Feb 2026', 'Invoice issued', 'System'], ['15 Feb 2026', sent, 'System'], ['01 Mar 2026', 'Direct debit attempt 1 declined · insufficient funds', 'System'], ['08 Mar 2026', 'Direct debit attempt 2 declined · insufficient funds', 'System'], ['15 Mar 2026', 'Direct debit attempt 3 declined; direct debit suspended', 'System'], ['15 Mar 2026', 'Payment arrangement agreed · pay by 30 Mar', 'J. Patel'], ['10 May 2026', 'Overdue reminder emailed', 'System']]
    },
    'INV-2026-058': {
      kind: 'invoice', status: ['primary', 'Due'], owing: true,
      fields: [['Description', 'Q3 2026 subscription'], ['Issued', '01 Jun 2026'], ['Due', '01 Jul 2026'], ['Amount', '$165.00'], ['Paid', '$0.00'], ['Owing', '$165.00'], ['Billing method', 'Direct debit · ••••4821'], ['Payments', link('PAY-8902') + ' · scheduled 01 Jul']],
      lines: [['Membership fee · Full Member – RN · Q3 2026', '$185.00'], ['Hardship waiver · flat $20.00 per quarter', '−$20.00']],
      history: [['01 Jun 2026', 'Invoice issued', 'System'], ['01 Jun 2026', sent, 'System'], ['01 Jun 2026', 'Direct debit scheduled for 01 Jul 2026', 'System']]
    },
    'PAY-8902': {
      kind: 'payment', status: ['primary', 'Scheduled'],
      fields: [['Date', '01 Jul 2026'], ['Method', 'Direct debit · BSB 062-000 ••••4821'], ['Amount', '$165.00'], ['Applied to', link('INV-2026-058')]],
      lines: [['INV-2026-058 · Q3 2026 subscription', '$165.00']],
      history: [['01 Jun 2026', 'Scheduled from the recurring payment plan', 'System']]
    },
    'PAY-8821': {
      kind: 'payment', status: ['success', 'Paid'],
      fields: [['Date', '01 Apr 2026'], ['Method', 'Direct debit · BSB 062-000 ••••4821'], ['Amount', '$165.00'], ['Applied to', 'INV-2026-044'], ['Batch', 'DD-2026-04-01'], ['Receipt', 'R-55120']],
      lines: [['Membership fee · Full Member – RN · Q2 2026', '$185.00'], ['Hardship waiver · flat $20.00 per quarter', '−$20.00']],
      history: [['01 Mar 2026', 'Scheduled from the recurring payment plan', 'System'], ['01 Apr 2026', 'Collected', 'System'], ['01 Apr 2026', 'Receipt R-55120 emailed to member', 'System']]
    },
    'PAY-8654': {
      kind: 'payment', status: ['danger', 'Declined'],
      fields: [['Date', '15 Mar 2026 (attempt 3)'], ['Method', 'Direct debit · BSB 062-000 ••••4821'], ['Amount', '$185.00'], ['Applied to', link('INV-2026-031')], ['Decline reason', 'Insufficient funds (bank code 51)'], ['Attempts', '3 of 3 · direct debit suspended']],
      lines: [['INV-2026-031 · Q1 2026 subscription', '$185.00']],
      history: [['01 Mar 2026', 'Attempt 1 declined · insufficient funds', 'System'], ['08 Mar 2026', 'Attempt 2 declined · insufficient funds', 'System'], ['15 Mar 2026', 'Attempt 3 declined · insufficient funds', 'System'], ['15 Mar 2026', 'Direct debit suspended after 3 attempts', 'System'], ['15 Mar 2026', 'Member notified by email', 'System']]
    },
    'PAY-8312': {
      kind: 'payment', status: ['success', 'Paid'],
      fields: [['Date', '01 Jan 2026'], ['Method', 'Direct debit · BSB 062-000 ••••4821'], ['Amount', '$185.00'], ['Applied to', 'INV-2025-061'], ['Batch', 'DD-2026-01-01'], ['Receipt', 'R-53988']],
      lines: [['Membership fee · Full Member – RN · Q4 2025', '$185.00']],
      history: [['01 Jan 2026', 'Collected', 'System'], ['01 Jan 2026', 'Receipt R-53988 emailed to member', 'System']]
    },
    'PAY-8105': {
      kind: 'payment', status: ['', 'Refunded'], icon: 'refund',
      fields: [['Date', '02 Oct 2025'], ['Method', 'Visa ••••3310'], ['Amount', '$25.00'], ['Applied to', 'EVT-2025-114 · Delegate training day'], ['Refunded', '12 Nov 2025 · to account credit CR-0204']],
      lines: [['Delegate training day · registration', '$25.00'], ['Refund to account credit CR-0204', '−$25.00']],
      history: [['02 Oct 2025', 'Paid by card', 'Member (portal)'], ['10 Nov 2025', 'Event cancelled', 'Events team'], ['12 Nov 2025', 'Refunded to account credit CR-0204', 'A. Nguyen']]
    },
    'PAY-7990': {
      kind: 'payment', status: ['success', 'Paid'],
      fields: [['Date', '01 Oct 2025'], ['Method', 'Direct debit · BSB 062-000 ••••4821'], ['Amount', '$185.00'], ['Applied to', 'INV-2025-048'], ['Batch', 'DD-2025-10-01'], ['Receipt', 'R-52611']],
      lines: [['Membership fee · Full Member – RN · Q3 2025', '$185.00']],
      history: [['01 Oct 2025', 'Collected', 'System'], ['01 Oct 2025', 'Receipt R-52611 emailed to member', 'System']]
    },
    'PAY-7412': {
      kind: 'payment', status: ['success', 'Paid'],
      fields: [['Date', '20 Jun 2025'], ['Method', 'Visa ••••3310 · by phone'], ['Amount', '$225.00'], ['Applied to', 'INV-2025-031 · $185.00'], ['Unallocated', '$40.00 · held as credit CR-0192'], ['Receipt', 'R-51240']],
      lines: [['Membership fee · Full Member – RN · Q2 2025', '$185.00'], ['Overpayment · held as account credit CR-0192', '$40.00']],
      history: [['20 Jun 2025', 'Card payment taken by phone', 'M. Chen'], ['20 Jun 2025', 'Overpayment of $40.00 moved to credit CR-0192', 'System'], ['20 Jun 2025', 'Receipt R-51240 emailed to member', 'System']]
    }
  };

  const escapeText = value => String(value).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  // Values are this file's own sample data; only link() output is markup.
  const cell = value => value.startsWith('<a ') ? value : escapeText(value);
  const readOnlyField = (label, value) =>
    '<div class="BreakWord col-md-4"><div class="ReadOnly PanelField Top"><div style="display:inline;"><span class="Label">' + escapeText(label) +
    '</span></div><br><div class="PanelFieldValue"><span>' + value + '</span></div></div></div>';

  // References without sample detail: the clicked row's own cells, header by
  // header, so any row still opens a believable popup.
  function fromRow(ref, trigger) {
    const row = trigger?.closest('tr');
    const heads = row ? Array.from(row.closest('table').tHead.rows[0].cells, cell => cell.textContent.trim()) : [];
    if (!row) return null;
    const badge = row.querySelector('.us-badge--icon');
    const tone = badge ? (badge.className.match(/us-badge--(success|danger|warning|primary)/) || [])[1] || '' : '';
    const values = Array.from(row.cells, (cell, index) => [heads[index], cell.textContent.trim(), cell]);
    const value = name => (values.find(([head]) => head === name) || [])[1] || '';
    return {
      kind: /^INV-/.test(ref) ? 'invoice' : 'payment',
      status: [tone, badge ? badge.textContent.trim() : 'Recorded'],
      icon: badge?.dataset.usIcon,
      owing: /^INV-/.test(ref) && tone !== 'success',
      fields: values.filter(([head, text, cell], index) => index > 0 && text && !cell.querySelector('.us-badge--icon')).map(([head, text]) => [head, text]),
      lines: [[value('Description'), value('Amount')]],
      history: [[value('Date') || value('Due'), 'Recorded', 'System']]
    };
  }

  function openTransaction(ref, trigger) {
    const data = transactions[ref] || fromRow(ref, trigger);
    const dialog = document.getElementById('cv3-transaction');
    if (!data || !dialog) return toast(ref + ' — no sample detail in this prototype.');
    const kind = data.kind === 'invoice' ? 'Invoice' : 'Payment';
    const [tone, label] = data.status;
    const badge = '<span class="us-badge us-badge--icon' + (tone ? ' us-badge--' + tone : '') + '"' +
      (data.icon ? ' data-us-icon="' + data.icon + '"' : '') + '>' + escapeText(label) + '</span>';
    dialog.dataset.kind = data.kind;
    dialog.dataset.owing = String(!!data.owing);
    dialog.dataset.transaction = ref;
    document.getElementById('cv3-transaction-title').textContent = kind + ' ' + ref;
    document.getElementById('cv3-tx-heading').textContent = kind + ' details';
    document.getElementById('cv3-tx-fields').innerHTML =
      readOnlyField('Status', badge) + data.fields.map(([name, value]) => readOnlyField(name, cell(value))).join('');
    document.getElementById('cv3-tx-lines').innerHTML = data.lines.map(([item, amount], index) =>
      '<tr class="' + (index % 2 ? 'rgAltRow' : 'rgRow') + '"><td>' + escapeText(item) + '</td><td class="cv2-num">' + escapeText(amount) + '</td></tr>').join('');
    document.getElementById('cv3-tx-history').innerHTML = data.history.map(([date, what, by], index) =>
      '<tr class="' + (index % 2 ? 'rgAltRow' : 'rgRow') + '"><td>' + escapeText(date) + '</td><td>' + escapeText(what) + '</td><td>' + escapeText(by) + '</td></tr>').join('');
    if (!dialog.open) dialog.showModal();
    dialog.querySelector('.cv3-popup__body').scrollTop = 0;
  }
  // Called by the finance.view-transaction fixture action.
  window.cv3OpenTransaction = openTransaction;

  document.addEventListener('click', event => {
    const clear = event.target.closest('#cv3-trackers-clear');
    if (clear) {
      trackersAllClear = clear.getAttribute('aria-pressed') !== 'true';
      clear.setAttribute('aria-pressed', String(trackersAllClear));
      clear.textContent = trackersAllClear ? 'Trackers: all clear' : 'Trackers: live';
      document.querySelectorAll('.cv2-trackers').forEach(root => window.UnionSuiteAttention?.reload(root));
      return;
    }

    const failing = event.target.closest('#cv3-activity-failing');
    if (failing) {
      activityFailing = failing.getAttribute('aria-pressed') !== 'true';
      failing.setAttribute('aria-pressed', String(activityFailing));
      failing.textContent = activityFailing ? 'Activity: one failing' : 'Activity: all sources';
      window.UnionSuiteActivityFeed?.reload();
      return;
    }

    // Activity feed links stand in for native record pages.
    const activityLink = event.target.closest('.us-record__more a, .us-activity__history, .us-activity__type-history');
    if (activityLink) {
      event.preventDefault();
      event.stopPropagation();
      const record = activityLink.closest('.us-record');
      const subject = record && (record.querySelector('.us-record__title').textContent || record.querySelector('.us-record__text').textContent.slice(0, 60));
      toast(activityLink.matches('.us-activity__type-history') ? activityLink.textContent + ': opens that IQA page — demo only.' :
        subject ? 'Opens the record for “' + subject + '” — demo only.' : 'Opens the full activity history page — demo only.');
      return;
    }

    const popup = document.getElementById('cv3-transaction');
    if (event.target.closest('.cv3-popup__close') || event.target === popup) {
      popup.close();
      return;
    }

    const send = event.target.closest(':is(button, a).us-action-finance-send-to-member');
    if (send) {
      event.preventDefault();
      event.stopPropagation();
      const ref = popup.dataset.transaction;
      toast((popup.dataset.kind === 'invoice' ? 'Invoice ' : 'Payment details for ') + ref + ' emailed to s.reynolds@metrohealth.gov.au — demo only.');
      return;
    }

    if (event.target.closest('#cv3-invoice-state')) {
      inArrears = !inArrears;
      applyFinanceState();
      return;
    }

    const adjustmentsButton = event.target.closest('#cv3-adjustments-state');
    if (adjustmentsButton) {
      const body = document.getElementById('cv3-adjustments-body');
      const active = adjustmentsButton.getAttribute('aria-pressed') !== 'true';
      // No results, as iMIS renders a Query Template Display: the result set
      // is omitted and the No results field's HTML takes its place.
      adjustmentRows ??= { set: body.querySelector('.QueryTemplateSet'), none: Object.assign(document.createElement('p'), { textContent: 'No active or upcoming adjustments.' }) };
      if (active) adjustmentRows.none.replaceWith(adjustmentRows.set);
      else adjustmentRows.set.replaceWith(adjustmentRows.none);
      window.UnionSuiteAdjustments?.refresh();
      adjustmentsButton.setAttribute('aria-pressed', String(active));
      adjustmentsButton.textContent = active ? 'Adjustments: active' : 'Adjustments: none';
      return;
    }

    if (event.target.closest('#cv3-payment-type')) {
      paymentType = typeOrder[(typeOrder.indexOf(paymentType) + 1) % typeOrder.length];
      applyFinanceState();
      return;
    }

    if (event.target.closest('#cv3-color-scheme')) {
      window.UnionSuiteAppearance?.toggle();
      return;
    }

    if (event.target.closest('#cv3-rail-side')) {
      setRailSide(document.getElementById('cv3-rail-side').getAttribute('aria-pressed') !== 'true');
      return;
    }

    // Contact kind: one query value fills the eyebrow and picks the avatar icon.
    const kind = event.target.closest('#cv3-contact-kind');
    if (kind) {
      const organisation = kind.getAttribute('aria-pressed') !== 'true';
      const value = organisation ? 'Organisation' : 'Individual';
      kind.setAttribute('aria-pressed', String(organisation));
      kind.textContent = 'Contact: ' + value.toLowerCase();
      document.querySelector('.us-banner__avatar')?.setAttribute('data-us-contact-kind', value);
      const label = document.getElementById('contact-banner-kind');
      if (label) label.textContent = value;
      return;
    }

    if (event.target.closest('#cv3-new-alert')) {
      if (!alerts.includes(sampleAlert)) alerts.unshift(sampleAlert);
      window.UnionSuiteBannerAlerts?.reload();
      toast('Sample alert raised — the bell re-checks its count.');
      return;
    }

    const strip = event.target.closest('#cv3-strip-toggle');
    if (strip) {
      const panel = document.getElementById('cv3-buttons');
      panel.hidden = !panel.hidden;
      strip.setAttribute('aria-expanded', String(!panel.hidden));
      requestAnimationFrame(measureButtons);
      return;
    }

    const tab = event.target.closest('#cv2-cco a.rtsLink');
    if (tab) {
      event.preventDefault();
      selectView(tab.dataset.view);
      return;
    }

    // Tracker cards link to the CCO tab that holds the detail.
    const tracker = event.target.closest('.cv2-trackers a.us-attention__card');
    if (tracker) {
      event.preventDefault();
      event.stopPropagation();
      selectView(new URL(tracker.href).hash.slice(1));
      document.getElementById('cv2-cco').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    // Fixture actions (finance-actions.fixture.js): buttons only, since the
    // panel iPart wrappers carry the same us-action-* classes.
    // View details runs through the action runtime (finance-actions.fixture.js).
    const command = event.target.closest('.cv2-demo, .us-actions__item, :is(button, a):is([class*="us-action-finance-"], [class*="us-action-membership-"]):not(.us-action-finance-view-transaction)');
    if (command) {
      event.preventDefault();
      event.stopPropagation();
      toast(command.textContent.trim() + ' — demo only; no action is run.');
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    selectView(location.hash.slice(1)) || selectView('summary');
    let side = 'right';
    try { side = localStorage.getItem('cv3TabsSide') || 'right'; } catch (error) { /* optional */ }
    if (side === 'left') setRailSide(false, false);
    showColorScheme();
  });
  window.addEventListener('hashchange', () => selectView(location.hash.slice(1)));
})();
