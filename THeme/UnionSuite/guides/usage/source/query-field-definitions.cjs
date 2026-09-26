// Author documentation only. Required means a nonempty value for this recipe;
// every field still referenced in HTML must be selected, including optional ones.
const required = (description, example, token) => ({required:true, description, example, ...(token ? {token} : {})});
const optional = (description, example, token) => ({required:false, description, example, ...(token ? {token} : {})});
const bulletin = {
  DocumentName:required('Announcement title.', 'Updated membership fees'),
  FirstName:optional('Author’s first name. If omitting authors, remove both name tokens from the metadata line and adjust its separator.', 'Peter'),
  LastName:optional('Author’s last name. May be blank for a single-name author.', 'Williams'),
  CreatedOn:required('Publication date formatted for display by the query.', '14 September 2026'),
  DocumentBody:required('Existing rich HTML announcement body. This supplied field uses noencode inside a div; retain encoding on ordinary text fields.', '<p>The updated fee schedule is now available.</p>')
};
const notes = {
  NoteTitle:required('Note subject.', 'Renewal options discussed'),
  AuthorName:required('Staff member who wrote the note.', 'Sam Taylor'),
  CreatedOn:required('Note date and time formatted for display by the query.', '14 September 2026 · 10:15 am'),
  NoteBody:required('Plain-text note content. Keep the substitution HTML-encoded.', 'Sent the fee schedule and agreed to follow up next week.'),
  ContactMethod:optional('How the contact occurred. Remove the whole us-list__footer block if unused; a blank value alone can leave footer spacing.', 'Phone call')
};
const taskTitle = required('Task subject, also used in the checkbox’s accessible label. Do not map a status code such as N or IP here.', 'Call Alex about renewal');
const memberName = optional('Related member’s display name. Remove its span if the task has no member context.', 'Alex Morgan');
const contacts = {
  ContactName:required('Contact display name.', 'Adam Phillips'),
  ContactId:optional('Searchable contact ID. It is in the HTML but is not displayed. Remove its data-us-search token if unused.', '101000'),
  ContactUrl:optional('Contact profile destination. Blank leaves a plain-text name. Example path is illustrative; use your actual iMIS destination.', '/contacts/101000'),
  RoleLabel:optional('Badge text in sentence case. Blank hides the badge.', 'Delegate'),
  RoleColour:optional('Badge background as #RGB or #RRGGBB, including #. Text automatically uses black or white. Blank/invalid colours use the neutral theme badge. Previous backgrounds with current branding: Delegate/coordinator #F0F3F7; Region #D1DCE6; General #F3F3F4. These are query values; there are no role-name CSS rules.', '#F0F3F7'),
  WorkplaceName:optional('Workplace display name. Blank hides the whole workplace row.', 'Stark Enterprise - Melbourne'),
  WorkplaceUrl:optional('Workplace profile destination. Blank leaves plain text. Example path is illustrative.', '/workplaces/200100'),
  Email:optional('Email address without mailto:; the template adds it. Blank hides the entire email row.', 'adam@example.com'),
  Phone:optional('Phone number without tel:; the template adds it. Blank hides the entire phone row.', '0400 123 456')
};
module.exports = {
  'Bulletin-Query-Template.html':bulletin,
  'Bulletin-Linked-Query-Template.html':{
    ...bulletin,
    AlertUrl:optional('Trimmed destination URL. Blank hides the Read more link and whole-card click target. Use a verified http(s) URL, root-relative path or nonempty #anchor; this example path is illustrative.', '/staff/announcements/membership-fees')
  },
  'Member-Notes-Query-Template.html':notes,
  'Recent-History-Query-Template.html':{
    ActivityTitle:required('Activity summary.', 'Membership renewed'),
    AuthorName:required('Person or team responsible.', 'Member Services'),
    ActivityDate:required('Activity date and time formatted for display by the query.', '14 September 2026 · 9:40 am'),
    ActivityDetail:optional('Plain-text supporting detail. Remove its complete us-list__body block if unused to avoid empty body spacing.', 'Membership extended to 30 September 2027.')
  },
  'Tasks-Query-Template.html':{
    TaskTitle:taskTitle, MemberName:memberName,
    DueDate:optional('Formatted due date without the Due prefix (the template adds it). For undated tasks, supply a display value such as Not set or remove the entire date span; a blank value alone leaves Due visible.', '18 September 2026')
  },
  'Tasks-Completion-Query-Template.html':{
    TaskTitle:taskTitle, MemberName:memberName,
    IsCompleted:required('Explicit completion flag: true or 1 for completed; false or 0 for outstanding. Do not infer completion from status wording.', 'false'),
    TaskDateLabel:optional('Complete display label: Due plus a due date for outstanding tasks; Actioned plus an actioned date for completed tasks. Blank leaves no date text.', 'Actioned 14 September 2026')
  },
  'Tasks-Detail-Query-Template.html':{
    TaskTitle:taskTitle,
    TaskUrl:required('Verified task editor URL, including the parameters identifying this task. Used in both href and data-us-task-url. Opens in the native iMIS popup; fragments are not supported. Blank disables the action. Select this alias even when values are blank, or replace the entire anchor with plain title text.', '/i4u_Sandbox/Styling-Elements/Home-Dashboard/Add-Task.aspx?ID=104019&Ordinal=219'),
    TaskNote:optional('Plain-text task note. One line is displayed and the rest is clipped by CSS, so the full note stays searchable. Blank removes the line and the row closes up.', 'Discuss the membership options sent earlier this week.'),
    MemberName:memberName,
    MemberUrl:optional('Related member’s record. Blank leaves a plain-text name; a blank MemberName hides the icon and name together. Example path is illustrative.', '/Party.aspx?ID=101000'),
    MemberId:optional('Party ID represented by MemberName and MemberUrl. Used in the member link data-id; when it matches __ClientContext.loggedInPartyId, the name becomes Personal Task and the link is disabled. Blank leaves the authored name and link. Compare IDs as strings, preserving leading zeroes.', '104203'),
    IsCompleted:required('Explicit completion flag: true or 1 for completed; false or 0 for outstanding. Do not infer completion from status wording.', 'false'),
    DueState:optional('Urgency for the date: overdue, today, soon or none. Only overdue is coloured, and the label below must carry the word as well, so the state never relies on colour alone. Not updated after a staff member ticks the row.', 'overdue'),
    TaskDateLabel:optional('Complete display label: Overdue or Due plus a due date for outstanding tasks; Actioned plus an actioned date for completed tasks. Blank leaves no date text.', 'Overdue 10 September 2026'),
    DueLabel:optional('Original due label, restored if a completed row is reopened. Usually the same value as TaskDateLabel for an outstanding task.', 'Overdue 10 September 2026'),
    TaskPartyId:optional('ID of the i4u_UT_Interactions row: the party the interaction belongs to. Supplied with TaskOrdinal, ticking the checkbox saves FollowUpActioned; without both the checkbox stays local and nothing is written.', '104019'),
    TaskOrdinal:optional('Ordinal of the i4u_UT_Interactions row, which identifies it within that party. Whole number. Supplied with TaskPartyId to enable saving.', '219')
  },
  'Tasks-Query-Footer.html':{},
  'Contacts-Query-Template.html':contacts,
  'query-search-template':{TaskTitle:taskTitle, MemberName:memberName},
  'explicit-query-search':{ContactName:contacts.ContactName, ContactId:contacts.ContactId},
  'Banner-Contact-Template.html':{
    ContactId:required('Contact identifier in the eyebrow, copied by its copy button. Also the filter value for the optional positions, tab counts and alerts blocks.', '101000', '[Contact ID]'),
    ContactType:required('Display text for the contact type, in the eyebrow and on the avatar. Organisation, Organization or Company show a building; any other value a person. Derive it from the same COMPANY_RECORD flag the taskbar quick search uses.', 'Individual', '[Contact type]'),
    ContactName:required('Full contact name.', 'Adam Phillips', '[Full name]'),
    MemberType:optional('Membership category. If unused, remove this token and the adjoining separator from the subtitle.', 'Full member', '[Member type]'),
    JoinDate:optional('Formatted membership join date. If unused, remove Member since and this token from the subtitle.', '1 July 2021', '[Join date]'),
    StatusDescription:optional('Plain-text member status from the existing status mapping. Blank uses Status unavailable.', 'Financial member'),
    StatusColour:optional('Six-digit hex including # from the existing status lookup. The helper adjusts its display colour for white-text contrast; blank/invalid values use the neutral fallback.', '#23845B'),
    Email:optional('Email address shown as text. Remove the entire Email fact if unused.', 'adam@example.com', '[Email address]'),
    Mobile:optional('Mobile number shown as text. Remove the entire Mobile fact if unused.', '0400 123 456', '[Mobile number]'),
    EmployerName:optional('Employer display name. Remove the entire Employer fact if unused.', 'Stark Enterprise', '[Employer name]'),
    BranchName:optional('Branch display name. Remove the entire Branch fact if unused.', 'Melbourne', '[Branch name]'),
    OrganiserName:optional('Assigned organiser’s display name. Remove the entire Organiser fact if unused.', 'Sam Taylor', '[Organiser name]')
  },
  'Banner-Template.html':{
    RecordType:required('Record category; may be authored literal text instead of a query field.', 'Agreement', '[Record type]'),
    RecordId:required('Record identifier.', 'AGR-2026-014', '[Record ID]'),
    RecordName:required('Record display name.', 'Stark Enterprise agreement', '[Record name]'),
    RecordSubtitle:optional('Supporting summary. Remove the entire subtitle paragraph if unused.', 'Melbourne workplaces', '[Supporting record information]'),
    RecordStatus:optional('Plain-text badge label. Remove its badge/status block if unused.', 'Current', '[Record status]'),
    ...Object.fromEntries([1,2,3,4].flatMap((n)=>[
      ['FactLabel'+n, optional('Label for optional fact '+n+'. Usually authored literal text; remove its whole fact block when unused.', ['Start date','End date','Owner','Branch'][n-1], '[Fact label '+n+']')],
      ['FactValue'+n, optional('Display value for optional fact '+n+'. Remove its whole fact block when unused.', ['1 July 2026','30 June 2029','Sam Taylor','Melbourne'][n-1], '[Fact value '+n+']')]
    ]))
  },
  'Banner-Dashboard-Template.html':{},
  'Welcome-Content.html':{}
};
