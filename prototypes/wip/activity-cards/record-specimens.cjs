// Sample records for the activity cards workbench. One member (Sarah Reynolds,
// 004821, the contact page v3 sample), so every list tells the same story.
// Field names are the Query Template aliases each card template uses. A field
// left out renders blank, which is how an IQA returns an unused optional alias.

const grievance = { CaseRef: 'WG-2026-041', CaseUrl: '#case' };
const entitlement = { CaseRef: 'MQ-2026-019', CaseUrl: '#case' };
const member = 's.reynolds@metrohealth.gov.au';

// Activity: calls, emails, SMS, meetings and interactions share one card.
// ActivityType drives the icon and colour; TypeLabel is the visible type.
const activity = (ActivityKey, ActivityType, TypeLabel, DateShort, TimeText, Month, fields) => ({
  ActivityKey,
  ActivityType,
  TypeLabel,
  DateShort,
  TimeText,
  Month,
  RecordUrl: '#record',
  ...fields
});

const recentActivity = [
  activity('C-5521', 'call', 'Call', '12 May', '10:15 am', 'May 2026', { PriorityFlag: 'High', DirectionLabel: 'Outbound', Summary: 'No answer; voicemail about the $185.00 still outstanding.', StaffName: 'J. Patel', With: 'Member', Duration: '1m 04s', Outcome: 'Left message', OutcomeTone: 'warning' }),
  activity('E-9921', 'email', 'Email', '10 May', '8:00 am', 'May 2026', { DirectionLabel: 'Sent', Subject: 'Overdue payment reminder – Q1 2026', Summary: '$185.00 outstanding; pay online or call to arrange a payment plan.', StaffName: 'System', With: member }),
  activity('C-5498', 'call', 'Call', '9 May', '3:30 pm', 'May 2026', { DirectionLabel: 'Outbound', Summary: 'Discussed leave without pay and retired membership instead of resigning.', StaffName: 'A. Smith', With: 'Member', Duration: '14m 05s', Outcome: 'Completed', Detail: 'Member plans to travel for 12 months and may return to nursing. Explained leave without pay (no fees, cover paused) and retired membership. Member will decide by 20 May.' }),
  activity('I-3107', 'interaction', 'Interaction', '8 May', '4:20 pm', 'May 2026', { Summary: 'Submitted through the member portal: leaving nursing to travel from July.', StaffName: 'Member portal', Outcome: 'Pending', OutcomeTone: 'warning', Detail: 'Resignation requested effective 30 June 2026. Reason given: leaving nursing to travel. Retention call to be made before processing.' }),
  activity('M-770', 'meeting', 'Meeting', '6 May', '5:30 pm', 'May 2026', { ...grievance, Subject: 'Grievance meeting with the employer', Summary: 'Employer agreed to review overtime rostering on the ward.', StaffName: 'M. Chen', With: 'Member, M. Chen, Metro Health HR', Duration: '60 min', Outcome: 'Follow-up booked', OutcomeTone: 'primary', AttachmentLabel: '1 attachment · Meeting_Notes_06May.pdf' }),
  activity('R-4388', 'email', 'Email', '30 Apr', '10:48 am', 'April 2026', { ...grievance, DirectionLabel: 'Received', Subject: 'Signed statement', Summary: 'Signed grievance statement attached.', StaffName: 'M. Chen', With: member, AttachmentLabel: '1 attachment · Grievance_Statement_WG2026041.docx' }),
  activity('I-3080', 'interaction', 'Interaction', '28 Apr', '9:40 am', 'April 2026', { PriorityFlag: 'Urgent', ...grievance, Summary: 'Employer did not respond within 14 days; escalated for a formal dispute notice.', StaffName: 'M. Chen', Outcome: 'Escalated', OutcomeTone: 'danger' }),
  activity('S-221', 'sms', 'SMS', '22 Apr', '6:12 pm', 'April 2026', { DirectionLabel: 'Received', Summary: 'Incoming text asking for a callback this week.', StaffName: 'J. Patel', With: '0412 345 678' }),
  activity('C-5433', 'call', 'Call', '14 Apr', '11:00 am', 'April 2026', { ...entitlement, DirectionLabel: 'Outbound', Summary: 'Walked through the overtime limits and how to decline extra shifts.', StaffName: 'A. Smith', With: 'Member', Duration: '7m 30s', Outcome: 'Completed' })
];

const communications = [
  activity('E-9921', 'email', 'Email', '10 May', '8:00 am', 'May 2026', { DirectionLabel: 'Sent', Subject: 'Overdue payment reminder – Q1 2026', Summary: '$185.00 outstanding; pay online or call to arrange a payment plan.', StaffName: 'System', With: member }),
  activity('E-9905', 'email', 'Email', '9 May', '4:02 pm', 'May 2026', { DirectionLabel: 'Sent', Subject: 'Your resignation request', Summary: 'Acknowledged the request and set out the notice period and alternatives.', StaffName: 'A. Smith', With: member, Outcome: 'Opened', AttachmentLabel: '1 attachment · Resignation_Options.pdf' }),
  activity('R-4410', 'email', 'Email', '8 May', '4:25 pm', 'May 2026', { DirectionLabel: 'Received', Subject: 'Resignation', Summary: 'Leaving nursing to travel from July; please confirm the next steps.', StaffName: 'Membership team', With: member }),
  activity('S-221', 'sms', 'SMS', '22 Apr', '6:12 pm', 'April 2026', { DirectionLabel: 'Received', Summary: 'Incoming text asking for a callback this week.', StaffName: 'J. Patel', With: '0412 345 678' }),
  activity('E-8870', 'email', 'Email', '14 Aug 2025', '7:30 am', 'August 2025', { DirectionLabel: 'Sent', Subject: 'EBA ballot information', Summary: 'Ballot pack and voting instructions.', StaffName: 'System', With: member, Outcome: 'Bounced', OutcomeTone: 'danger', Detail: 'Delivery failed: mailbox not found. The preferred email address was corrected on 20 August 2025.' })
];

const notes = [
  { PriorityFlag: 'High', NoteType: 'Payment', AuthorName: 'J. Patel', DateShort: '15 Mar', TimeText: '2:34 pm', NoteTitle: '', NoteBody: 'Called member re overdue Q1 payment. Member advised she is experiencing financial difficulty following extended sick leave. Agreed to a payment arrangement – will pay by 30 March.', RecordUrl: '#note' },
  { NoteType: 'Casework', AuthorName: 'M. Chen', DateShort: '2 Feb', TimeText: '10:12 am', NoteTitle: '', NoteBody: 'Initial intake call for workplace grievance. Member alleges manager has been rostering her for excessive overtime without consent. Advised member of rights under the EBA clause 14.3. Will escalate to industrial officer.', ...grievance, RecordUrl: '#note' },
  { NoteType: 'Auto', AuthorName: 'System', DateShort: '12 Jan', TimeText: '9:00 am', NoteTitle: '', NoteBody: 'Renewal notice sent to primary email address. Member updated contact preferences via member portal – opted out of newsletter list.', RecordUrl: '#note' }
];

const cases = [
  { PriorityFlag: 'High', CaseRef: 'WG-2026-041', CaseType: 'Workplace grievance', Status: 'Escalated', StatusTone: 'danger', CaseTitle: 'Excessive overtime rostering', LastUpdate: 'Escalated for a formal dispute notice after the employer missed the 14-day deadline.', DateShort: '28 Apr', DateLabel: 'Updated', AssignedTo: 'M. Chen', Opened: '2 Feb 2026', Priority: 'High', NextStep: 'Dispute notice to Metro Health HR by 16 May', RecordUrl: '#case' },
  { CaseRef: 'MQ-2026-019', CaseType: 'Member query', Status: 'Pending', StatusTone: 'warning', CaseTitle: 'EBA entitlement clarification', LastUpdate: 'Clause 14.3 explained by phone; written summary emailed.', DateShort: '14 Apr', DateLabel: 'Updated', AssignedTo: 'Unassigned', Opened: '10 Apr 2026', Priority: 'Normal', NextStep: 'Close if no reply by 28 May', RecordUrl: '#case' },
  { CaseRef: 'WG-2024-112', CaseType: 'Workplace grievance', Status: 'Closed', StatusTone: '', CaseTitle: 'Bullying – resolved informally', LastUpdate: 'Resolved with the nurse unit manager; member satisfied.', DateShort: '3 Jun 2024', DateLabel: 'Closed', AssignedTo: 'A. Smith', Opened: '14 May 2024', Priority: 'Normal', NextStep: '', RecordUrl: '#case' }
];

const meetings = [
  { MeetingTitle: 'Grievance meeting with the employer', MeetingSummary: 'Employer agreed to review overtime rostering on the ward.', DateShort: '6 May', TimeText: '5:30 pm', Duration: '60 min', Location: 'Metro Health HR, Level 3', Attendees: 'Member, M. Chen, Metro Health HR', Organiser: 'M. Chen', Outcome: 'Follow-up booked', OutcomeTone: 'primary', ...grievance, RecordUrl: '#meeting' },
  { MeetingTitle: 'Ward delegate lunch', MeetingSummary: 'Rostering concerns raised by four members on the ward.', DateShort: '2 Apr', TimeText: '12:30 pm', Duration: '45 min', Location: 'Ward 4B tea room', Attendees: 'Member, ward delegates', Organiser: 'A. Smith', RecordUrl: '#meeting' },
  { MeetingTitle: 'Branch meeting', MeetingSummary: 'Attended the Sydney Metro branch meeting; EBA claims endorsed.', DateShort: '19 Feb', TimeText: '6:00 pm', Duration: '90 min', Location: 'Sydney Metro branch office', Attendees: 'Branch members', Organiser: 'A. Smith', RecordUrl: '#meeting' }
];

// Third value: the type's IQA page, behind the "View all …" link shown while
// that type is chosen.
const feedFilters = [
  ['all', 'All'],
  ['interaction', 'Interactions', '#iqa-interactions'],
  ['call', 'Calls', '#iqa-calls'],
  ['email', 'Emails', '#iqa-emails'],
  ['sms', 'SMS', '#iqa-sms'],
  ['meeting', 'Meetings', '#iqa-meetings']
];

module.exports = [
  {
    id: 'recent-activity',
    kind: 'feed',
    title: 'Recent activity (mixed sources)',
    note: 'The combined feed: the real US-ACTIVITY-FEED module (contact page v3 item 32) merging one IQA per type, answered here from the sample records. Type filters, the "View all" link, search, the date range and Show more all work; on a wide feed search and range share the filters\' line, and on a narrow one they fold behind the heading\'s filter button.',
    panelTitle: 'Recent activity',
    template: 'templates/Activity-Card.html',
    records: recentActivity,
    filters: feedFilters
  },
  {
    id: 'notes',
    kind: 'list',
    title: 'Notes',
    note: 'A Query Template Display with the note card template (Display in cards: off; iPart CSS class us-records). Notes show their author on the tag line, as they do today.',
    panelTitle: 'Notes',
    template: 'templates/Note-Card.html',
    records: notes
  },
  {
    id: 'cases',
    kind: 'list',
    title: 'Cases',
    note: 'The same card for cases: reference and type on the tag line, status as the status badge, last update as the preview. The date at the top left is when the case last changed.',
    panelTitle: 'Cases',
    template: 'templates/Case-Card.html',
    records: cases
  },
  {
    id: 'meetings',
    kind: 'list',
    title: 'Meetings',
    note: 'Meetings on their own: location and attendees move into the details.',
    panelTitle: 'Meetings',
    template: 'templates/Meeting-Card.html',
    records: meetings
  },
  {
    id: 'communications',
    kind: 'list',
    title: 'Communications (emails and SMS)',
    note: 'The activity card template in an ordinary Query Template Display, for a list that does not need the combined feed.',
    panelTitle: 'Communications',
    template: 'templates/Activity-Card.html',
    records: communications
  }
];
