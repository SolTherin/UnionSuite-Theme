# Agreement Management JS — Function Reference

Functions defined in `Agreement-Management-JS.html`.

---

## Utility

| Function | Summary |
|---|---|
| `parseDate(str)` | Parses a date string in `dd/MM/yyyy` or ISO format; returns a `Date` object or `null` if invalid. |
| `toast(msg)` | Displays a brief toast notification at the bottom of the page, auto-dismissing after ~2.2 seconds. |

---

## Panel / Accordion Navigation

| Function | Summary |
|---|---|
| `accOpen(panelId)` | Switches the active accordion panel and its corresponding tab content; saves the selection to `sessionStorage` and scrolls to top. |
| `scrollToSection(id)` | Smooth-scrolls to a named section anchor, accounting for the sticky banner height, then briefly flashes the section card. |
| `renderSideNav()` | Dynamically builds the sidebar accordion from `.section-anchor` elements found in the DOM, grouped by their parent tab panel. |

---

## Actions Dropdown

| Function | Summary |
|---|---|
| `toggleActions(e)` | Toggles the Actions dropdown menu open/closed; stops click propagation so the outside-click listener doesn't immediately close it. |

---

## Popup / Dialog Launchers

| Function | Summary |
|---|---|
| `CA_AddNotePopupFn()` | Opens the Add Note popup for the current agreement; refreshes the notes IQA grid on close. |
| `CA_AddAttachmentPopupFn()` | Opens the Add Attachment popup; refreshes the notes IQA grid on close. |
| `CA_AddContactsMemberPopupFn()` | Opens the Manage Contacts popup; calls `CA_syncContactCards()` on close to update the contact grid. |
| `CA_ScheduleMeetingPopupFn()` | Opens the Schedule Meeting popup; refreshes the meetings IQA grid on close. |
| `CA_AddTaskPopupFn()` | Opens the Add Task popup; refreshes the tasks IQA grid on close. |
| `CA_AddMilestonePopupFn()` | Opens the Add Milestone popup; calls `CA_reloadMilestones()` on close to rebuild the milestone log. |
| `CA_ViewMilestonePopupFn(noteOrdinal)` | Opens the Note Details popup in Milestones mode for a specific note ordinal; refreshes the notes IQA grid on close. |
| `CA_EditAgreementPopupFn(section)` | Opens the Edit Agreement Details popup; accepts an optional `section` parameter appended to the URL to target a specific section. |
| `CA_CloneAgreementFn()` | Navigates to the Create Agreement page pre-populated with the current `AgreementID` to clone the record. |
| `CA_EmailTeamPopupFn()` | Opens the Email Negotiating Team popup; refreshes the emails IQA grid on close. |
| `CA_EmailMembersPopupFn()` | Opens the Email Members popup; refreshes the emails IQA grid on close. |
| `CA_EditContactPopupFn(ordinal)` | Opens the Edit Contact popup for a contact by ordinal; calls `CA_reloadContactCard()` on close. |
| `CA_ViewNotePopupFn(noteOrdinal)` | Opens the Note Details popup for a specific note ordinal. |
| `CA_ViewTaskPopupFn(noteOrdinal)` | Opens the Note Details popup in Task mode for a specific task ordinal. |
| `CA_ViewMeetingPopupFn(meetingOrdinal)` | Opens the Edit Meeting popup for a specific meeting ordinal; refreshes the meetings IQA grid on close. |
| `CA_AddTermsPopupFn()` | Opens the Add Term popup; refreshes the terms IQA grid on close. |
| `CA_EditTermPopupFn(TermOrdinal)` | Opens the Update Term popup for a specific term ordinal; refreshes the terms IQA grid on close. |
| `CA_RemoveTermsPopupFn()` | Opens the Remove Terms popup; refreshes the terms IQA grid on close. |
| `CA_EditCoverageRules()` | Opens the Edit Coverage Rules popup; refreshes the covered members IQA grid on close. |

> **TODO:** A second implementation of `CA_ViewMilestonePopupFn` (opening `/Agreements_CreateTask` with `CA_updateMilestoneNoteCategory` + `CA_reloadMilestones` on close) has been commented out and preserved directly above the active definition for reference. Review whether the on-close behaviour from that version is still needed before removing it.

---

## API / Data Sync

| Function | Summary |
|---|---|
| `CA_reloadList(queryId, targetSelector, postReloadFn)` | Generic async reload: (1) fetches the HTML template definition from the Config IQA by DocumentVersionKey, (2) resolves the IQA data path via the DocumentSummary API, (3) fetches live data using `AgreementNum`, (4) renders each row by substituting `{#query.FieldName}` tokens with HTML-escaped, date-formatted values. Calls optional `postReloadFn` on completion. Used as the foundation for `renderTasks()` and future list reloads. |
| `CA_saveItemStatus(id, action, noteType)` | Three-step generic function: (1) resolves the CloudToolz base URL from an iMIS IQA, (2) stores a short-lived `ZenToken` in iMIS, (3) POSTs the status change to `CloudToolz /ca/complete-task`. Used by tasks and milestones. |
| `CA_updateMilestoneNoteCategory(milestoneOrdinal)` | PUTs to the `Zen_CloudFiles_Notes` API to set `Category = 'Milestones'` on the note record linked to a milestone. ⚠️ Currently unreferenced — its only caller is the commented-out `CA_ViewMilestonePopupFn` implementation. |
| `CA_reloadMilestones(milestoneOrdinal)` | Fetches the latest milestone data from an IQA API endpoint and rebuilds the `#milestone-log` DOM. Pass `milestoneOrdinal` to reload a single milestone, or omit to reload all. Waits 1 s before fetching to allow DB changes to propagate. |
| `CA_syncContactCards()` | Fetches all contacts for the current agreement via the `i4u_UT_CA_Contacts` API, removes cards no longer returned, and appends cards for new contacts. Waits 1 s before fetching. |
| `CA_reloadContactCard(ordinal)` | Fetches fresh data for a single contact from the API and updates that card's displayed name, role, type, group, phone, and email in-place. Waits 1 s before fetching. |

---

## Tasks

| Function | Summary |
|---|---|
| `toggleTask(el)` | Marks a task complete or incomplete: toggles CSS classes, triggers confetti on completion, fades out if hiding-completed mode is active, shows a toast, and calls `CA_saveItemStatus()`. |
| `toggleCompleted()` | Toggles the visibility of all completed task items and updates the button label between "Show completed" / "Hide completed". |
| `filterTasks(query)` | Filters the task list to show items matching assignee name or priority; shows a "no results" message and triggers `buildTaskSuggestions()`. |
| `updateTaskCount()` | Recounts completed vs total tasks and updates the count label and progress bar percentage. |

---

## Milestones

| Function | Summary |
|---|---|
| `CA_setMilestoneStatus(id, newStatus)` | Optimistically updates a milestone's dot, select, and label styles; triggers confetti and fade-out on completion; calls `CA_saveItemStatus()` to persist the change. |
| `animateMilestoneNode(id)` | Triggers the `node-complete` CSS animation on the matching node in the milestone progress rail. |
| `toggleMsDone()` | Toggles the visibility of completed milestones and updates the button label. |
| `refreshMilestoneStats()` | Rebuilds the milestone node rail, updates the progress bar width, completion count label, and nav count badge. |
| `openMilestoneModal()` | Resets and opens the Add Milestone modal form. |
| `closeMilestoneModal(e)` | Closes the milestone modal; only acts if the click target is the modal backdrop itself. |
| `saveMilestone()` | Validates the milestone modal form (name and date required), closes the modal, then opens `CA_AddMilestonePopupFn()` to handle the actual save. |

---

## Meetings

| Function | Summary |
|---|---|
| `applyMeetingFilter()` | Classifies each `.meeting-item` as past or future based on its `data-date` attribute and shows/hides past items according to the current `hidingPastMeetings` state. |
| `togglePastMeetings()` | Toggles `hidingPastMeetings` and re-applies the meeting filter; updates the button label. |

---

## Search & Filter

| Function | Summary |
|---|---|
| `buildTaskSuggestions(query)` | Builds an autocomplete dropdown of assignee and priority suggestions from task items, de-duplicated, prefixed "Assignee" or "Priority". |
| `applyTaskSuggestion(label)` | Populates the task search input with a selected suggestion label and triggers `filterTasks()`. |
| `filterHistory(query)` | Filters history list items by free-text query and type dropdown; shows a "no results" message when nothing matches. |
| `filterNotes(query)` | Filters note cards by matching the query against their full text content. |
| `filterContacts(query)` | Filters contact cards by name, type, role, and group; shows a "no results" message and triggers `buildContactSuggestions()`. |
| `buildContactSuggestions(query)` | Builds an autocomplete dropdown of name/type/role/group suggestions from visible contact cards, de-duplicated. Creates the dropdown element on first call. |
| `applyContactSuggestion(label)` | Populates the contact search input with a selected suggestion label and triggers `filterContacts()`. |
| `filterAttachments(query)` | Filters attachment items by filename and tags; shows a "no results" message and triggers `buildAttachmentSuggestions()`. |
| `buildAttachmentSuggestions(query)` | Builds an autocomplete dropdown of file name and tag suggestions from visible attachment items, de-duplicated, prefixed with "File" or "Tag". |
| `applyAttachmentSuggestion(label)` | Populates the attachment search input with a selected suggestion label and triggers `filterAttachments()`. |
| `filterTerms(query)` | Filters term items by term name, category, status, and details; supports prefixed queries (`term:`, `category:`, `status:`); shows a "no results" message and triggers `buildTermSuggestions()`. |
| `buildTermSuggestions(query)` | Builds an autocomplete dropdown of term/category/status suggestions from `.terms-list` items, de-duplicated, prefixed "Term", "Category", or "Status". |
| `applyTermSuggestion(label)` | Populates the term search input with a selected suggestion label and triggers `filterTerms()`. |

---

## Attachments

| Function | Summary |
|---|---|
| `downloadAttachment(btn)` | Reads `data-uniqueid` and `data-name` from the containing `.attachment-item` and calls `downloadAttachmentById()`. |
| `downloadAttachmentById(uniqueId, name)` | Three-step CloudToolz download: (1) resolves CloudToolz base URL from IQA, (2) stores a ZenToken in iMIS, (3) POSTs to `/flowz/sharepoint/download?uniqueid=…`. Opens the returned URL in a new tab on success. |
| `viewAttachment(btn)` | Opens the attachment view modal for the item containing `btn`; populates icon, name, meta, and tags. Modal download button is wired to `downloadAttachmentById()`. |
| `closeAttachModal(e)` | Closes the attachment view modal; only acts if the click target is the modal backdrop itself. |
| `loadAttachmentTags()` | Fetches all available tags from the `ZenFileTags` IQA; caches the result so subsequent calls skip the network. Returns a promise resolving to a string array. ⚠️ TODO: move IQA path to correct folder when finalising this module. |
| `wireTagSuggestions(tagsEl, input)` | Attaches an autocomplete dropdown to the tag editor input; calls `loadAttachmentTags()` on first keystroke (deferred to avoid an eager fetch on edit-open), filters results against the typed query, excludes already-added chips, and shows up to 8 matches. |
| `pickTagSuggestion(el, tag)` | Called `onmousedown` from a tag suggestion item; adds the chosen tag as a chip, clears the input, and closes the dropdown. |
| `editAttachment(btn)` | Switches an attachment item into inline-edit mode: replaces the name with a text input and renders a chip-based tag editor; hides action buttons; calls `loadAttachmentTags()` to wire autocomplete. |
| `buildTagEditor(tags)` | Returns HTML string for a chip-based tag editor pre-populated with `tags`. |
| `addTagChip(tagsEl, value)` | Inserts a new tag chip before the `tag-add-input` inside an open tag editor. |
| `saveAttachment(btn)` | Reads the edited name and tag chips, writes them back to `data-name`/`data-tags`, calls `exitAttachmentEdit()`, and shows a toast. ⚠️ TODO: wire up to flowz. |
| `cancelAttachment(btn)` | Discards edits and calls `exitAttachmentEdit()` with the original values. |
| `exitAttachmentEdit(item, name, tags)` | Restores an attachment item from editing mode back to read mode; re-renders tags, removes the action row, and re-shows hidden buttons. |

---

## Terms

| Function | Summary |
|---|---|
| `editTerm(btn)` | Switches a term item into inline-edit mode: replaces title/category/details with inputs, appends an amount + status row and Save/Cancel buttons; hides the status and amount badges. |
| `saveTerm(btn)` | Reads edited values, persists to data attributes, calls `exitTermEdit()`, re-runs `filterTerms()`, and shows a toast. |
| `cancelTerm(btn)` | Discards edits and calls `exitTermEdit()` with the original data attribute values. |
| `exitTermEdit(item, term, category, amount, status, details)` | Restores a term item from editing mode back to read mode; updates all display elements and conditionally shows/hides the amount badge. |

---

## Render / Transform Functions

These functions move data from hidden raw-template elements in the DOM into their styled target containers.

| Function | Summary |
|---|---|
| `renderTasks()` | Clones task HTML from `.RawTemplate.Tasks` into `#taskList`. |
| `renderTerms()` | Clones term HTML from `.RawTemplate.Terms` into `.terms-list`. |
| `renderNotes()` | Clones note HTML from `.RawTemplate.Notes` into `.card-body .note-list`. |
| `renderMeetings()` | Clones meeting HTML from `.RawTemplate.Meetings` into `.card-body .meeting-list`. |
| `renderAttachments()` | Clones attachment HTML from `.RawTemplate.Attachments` into `.card-body .attachment-list`; then splits each item's `data-tags` CSV value into individual `<span class="a-tag">` elements. |
| `renderContacts()` | Moves individual contact cards from `.RawTemplate.Contacts` into `#contactGrid`. |
| `renderMilestonesFromTemplate()` | Clones milestone HTML from `.RawTemplate.Milestones` into `#milestone-log`, syncs each status select, then calls `refreshMilestoneStats()`. |
| `renderKeyDates(sourceSelector, targetSelector)` | Reads `.summary-display-item` fields from the source element, classifies each date as past/current/future, and renders a styled dot-list into the target. |
| `renderResolution(sourceSelector, targetSelector)` | Reads resolution fields from the source, renders a status banner (complete / active / neutral) and a field grid into the target. |
| `renderAgreementDetails(sourceSelector, targetSelector)` | Reads agreement detail fields from the source and renders a field grid into the target. |

---

## Initialisation

| Function | Summary |
|---|---|
| `initDOM()` | Main entry point, called on `DOMContentLoaded`. Assigns DOM references, restores the last active panel from `sessionStorage`, builds the sidebar nav, attaches scroll and click listeners, creates the contact, attachment, task, and term suggestion dropdowns, wires Escape to close the milestone and attachment modals, and runs all render functions in sequence. |
