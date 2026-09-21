// Specimen content for the task row workbench. Data only.
//
// Each scenario renders twice: the current supported template from
// THeme/UnionSuite/guides/usage/templates/List-Templates/, and the proposed
// template in this folder, so the two layouts can be compared on one page at the
// same container width.
//
// Fictional records. Dates and labels are literal display strings, exactly as a
// query returns them; the proposed rows add the fields that template needs.

const current = 'Tasks-Completion-Query-Template.html';
const proposed = 'Task-Rows.proposed-template.html';

// Shared record shape. The current template reads TaskTitle, MemberName,
// IsCompleted and TaskDateLabel and ignores the rest.
const everydayRecords = [
  {
    TaskTitle:'Call Alex about renewal', MemberName:'Alex Morgan', MemberUrl:'#member-1', IsCompleted:'false',
    TaskDateLabel:'Due 10 September 2026', DueState:'overdue', DueLabel:'Due 10 September 2026',
    CreatedLabel:'Created 2 Sep by Jane Smith', TaskUrl:'#task-1',
    TaskNote:'Discuss the membership options sent earlier this week and confirm which tier he wants before the renewal lapses.'
  },
  {
    TaskTitle:'Confirm updated workplace details', MemberName:'Jordan Lee', MemberUrl:'#member-2', IsCompleted:'false',
    TaskDateLabel:'Due today', DueState:'today', DueLabel:'Due today',
    CreatedLabel:'Created 8 Sep by Priya Raman', TaskUrl:'#task-2',
    TaskNote:'New site address supplied by the delegate; check it against the employer record.'
  },
  {
    TaskTitle:'Follow up membership application', MemberName:'Taylor Smith', MemberUrl:'#member-3', IsCompleted:'false',
    TaskDateLabel:'Due 18 September 2026', DueState:'soon', DueLabel:'Due 18 September 2026',
    CreatedLabel:'Created 8 Sep by Jane Smith', TaskUrl:'#task-3',
    TaskNote:'Waiting on payroll deduction confirmation from the employer.'
  },
  {
    TaskTitle:'Send Alex the renewal summary', MemberName:'Alex Morgan', MemberUrl:'#member-1', IsCompleted:'true',
    TaskDateLabel:'Actioned 11 September 2026', DueState:'none', DueLabel:'Due 9 September 2026',
    CreatedLabel:'Created 1 Sep by Jane Smith', TaskUrl:'#task-4',
    TaskNote:'Summary emailed with the fee schedule attached.'
  }
];

// The display has to survive whatever the query returns, including values no
// design mock contains. Each row here answers a question about the layout.
const extremeRecords = [
  {
    TaskTitle:'Review and confirm the updated enterprise agreement coverage for every member at the Northern Rivers depot before the ballot closes',
    MemberName:'Alexandra Constantinou-Whitfield', MemberUrl:'#member-4', IsCompleted:'false',
    TaskDateLabel:'Due 30 September 2026', DueState:'soon', DueLabel:'Due 30 September 2026',
    CreatedLabel:'Created 14 August by Alexandra Constantinou-Whitfield', TaskUrl:'#task-5',
    TaskNote:'Coverage schedule needs checking against the 2024 classification changes, the depot roster and the three labour-hire arrangements the organiser flagged after the site visit last month.'
  },
  {
    TaskTitle:'Ring back', MemberName:'Jo Ng', MemberUrl:'#member-5', IsCompleted:'false',
    TaskDateLabel:'Due today', DueState:'today', DueLabel:'Due today',
    CreatedLabel:'Created today by Jo Ng', TaskUrl:'#task-6', TaskNote:''
  },
  {
    TaskTitle:'Undated follow-up', MemberName:'Taylor Smith', MemberUrl:'#member-3', IsCompleted:'false',
    TaskDateLabel:'', DueState:'none', DueLabel:'',
    CreatedLabel:'', TaskUrl:'#task-7',
    TaskNote:'No due date set by the assigning organiser.'
  },
  {
    TaskTitle:'Chase outstanding delegate nomination paperwork', MemberName:'Kerry O’Sullivan', MemberUrl:'#member-6', IsCompleted:'true',
    TaskDateLabel:'Actioned 3 September 2026', DueState:'none', DueLabel:'Due 1 September 2026',
    CreatedLabel:'Created 20 August by Member Services', TaskUrl:'#task-8',
    TaskNote:'Signed nomination received and filed.'
  },
  {
    TaskTitle:'Email workplace-entry notice', MemberName:'', MemberUrl:'', IsCompleted:'false',
    TaskDateLabel:'Due 21 September 2026', DueState:'soon', DueLabel:'Due 21 September 2026',
    CreatedLabel:'Created 15 Sep by Jane Smith', TaskUrl:'#task-9', TaskNote:''
  }
];

const singleRecords = [everydayRecords[0]];

module.exports = [
  {
    id: 'everyday',
    title: 'Everyday list',
    note: 'The normal case. The current row shows title, member and date; the proposed row adds a one-line note, the member as a linked name with a person icon, the task’s origin and a due state on the date. Search, Show completed and the footer come from the real query display controller.',
    panelTitle: 'My tasks',
    classes: 'us-query-search us-task-completed-filter',
    footer: 'Tasks-Query-Footer.html',
    records: everydayRecords,
    variants: [{id:'current', label:'Current', template:current}, {id:'proposed', label:'Proposed', template:proposed}]
  },
  {
    id: 'extremes',
    title: 'Content extremes',
    note: 'Long titles, a long member name, a blank member, a missing origin, an undated task and an actioned row. Completed rows are visible here because this stage has no completion filter.',
    panelTitle: 'Content extremes',
    classes: 'us-query-template',
    records: extremeRecords,
    variants: [{id:'current', label:'Current', template:current}, {id:'proposed', label:'Proposed', template:proposed}]
  },
  {
    id: 'single',
    title: 'Single row',
    note: 'One result, to read the row’s own padding and height without neighbours or dividers.',
    panelTitle: 'One task',
    classes: 'us-query-template',
    records: singleRecords,
    variants: [{id:'current', label:'Current', template:current}, {id:'proposed', label:'Proposed', template:proposed}]
  },
  {
    id: 'outstanding',
    title: 'Outstanding-only template (current only)',
    note: 'The simpler supported template, where the row supplies the Due prefix and the query supplies only the date. No proposed equivalent yet: the proposal carries its own date label.',
    panelTitle: 'My outstanding tasks',
    classes: 'us-query-template',
    records: [
      {TaskTitle:'Call Alex about renewal', MemberName:'Alex Morgan', DueDate:'10 September 2026'},
      {TaskTitle:'Confirm updated workplace details', MemberName:'Jordan Lee', DueDate:'14 September 2026'},
      {TaskTitle:'Follow up membership application', MemberName:'Taylor Smith', DueDate:'Not set'}
    ],
    variants: [{id:'current', label:'Current', template:'Tasks-Query-Template.html'}]
  }
];
