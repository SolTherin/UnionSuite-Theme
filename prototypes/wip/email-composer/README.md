# Email composer

**Problem.** Staff send record emails (case parties, agreement contacts and
members) through iMIS's Communication Creator iPart. It works, but it is a
general-purpose mail-merge tool, and it feels clunky for "email these people
about this case" (owner, 24 October 2026).

**Status.** Research. The native iPart was captured read-only on 24 October
2026 from `/_i4u_/Core/Cases/Layouts-v2/Popups/Send-Email-Parties.aspx` on the
dev tenant, with no recipients query in the address. The raw screenshots are in
the ignored `archive/email-composer-native/`. Nothing was saved or sent.

## The native Communication Creator, as captured

Heading: "New communication – Compose communication", with **Preview**,
**Open**, **Save As** and **Save** (primary). Below it are four tabs.
**Send Now** sits at the bottom right of each tab, under that tab's content.

1. **Header**
   - From: free text.
   - To: `{#party.Email};`, as free text.
   - Cc and Bcc: hidden behind two links (`ShowCcInput()`, `ShowBccInput()`).
   - Subject.
   - Type: a select of communication types: (None), Billing, Industrial News,
     Learning Opportunities, Marketing, Newsletter, Shipping, Volunteer
     Opportunities.
   - "Schedule this email": a checkbox. Ticking it shows Frequency
     (OneTime, …), Delivery date and time.
2. **Body**
   - A Telerik RadEditor with two rows of toolbar: cut, copy and paste, find,
     spelling, undo and redo, Font Name, Size, B/I/U, colours, alignment,
     indents, lists, tables, images, links, Paragraph, Apply CSS class,
     symbols, format stripper, **Insert field** and **Insert link**.
   - Insert field is a long, flat, scrolling list of raw names
     (`party.Address1`, `party.Address2`, `party.BirthDate`, `party.City`, …),
     with no labels, grouping or search.
   - The body starts as "Dear {#party.FirstName},".
   - A checkbox under the editor: "Pass query values to matching report
     parameters".
3. **Recipients**
   - A Query field holding a raw IQA path
     (`$/Communications/DefaultSystem/Queries/SelectedC…`, cut off) with a
     **Select** link.
   - One line of text: "The communication will be sent to the selected
     contact. Currently selected contact: <name>". With no query in the
     address, it falls back to the contact last selected elsewhere in iMIS.
4. **Data sources**
   - A grid of Query and Alias: Default → `party`, with edit and delete icons
     and an "Add data source" link. This is where the merge-field prefixes
     (`party.`, `recipient.`) come from.

Earlier probes (5 October 2026; see the agreement page work) add these
behaviours:

- The `query` in the address is a mail merge: one email per row, and each
  column becomes a `{#recipient.X}` field. A field the query lacks makes the
  send fail.
- To defaults to `{#party.Email}`, which needs an iMIS ID on every row.
- **Open** loads a template by reloading the page with `&CommunicationId=`.
- **Send Now** is a full postback, then a confirmation popup
  (`CommunicationConfirm.aspx`), then a reload with "Emails have been queued
  for processing". The browser never gets an ID for the sent email.
- With Advanced Email tracking on, a subject containing `[ ] < >` will not
  send.

## What the theme already adds

The capture above was taken before the browser had the latest theme, and
with no recipients in the address. Opened from a real case (C218, UTNewTheme
site, `?v=1.0.10`, 24 October 2026), the send page:

- shows the recipients box above the iPart: "7 recipients", with Show and
  Hide recipients;
- starts the subject with "Case C218 –";
- adds a « Back link above the heading;
- leaves only Preview and Open in the heading (Save and Save As are gone);
- hides "Schedule this email";
- makes Send Now the primary button;
- restyles the tabs and fields.

Still native: the four tabs, with Send Now on each; To as
`{#party.Email};`; the Type list; the full RadEditor toolbar and its raw
Insert field list. The Recipients tab now shows the query path and iMIS's
own "Viewing and selecting recipients is not available because the current
query contains filters" message.

Found on the case: every recipient reads "(no name)". The Parties IQA's
columns are `ContactName`, `ContactEmail`, `ContactId` and `ContactRole`, but
the recipients box reads the aliases `Name`, `Email`, `ID` and `Role`. So
names do not show, and the no-email and no-iMIS-ID checks never run.

The theme's pieces:

- **US-SEND-RECIPIENTS:** a recipients summary above the iPart, with a count,
  problems and a Show recipients table.
- **US-SUBJECT-TAG:** puts "Case C217 – " or "Agreement A107 – " at the start
  of the subject, where staff cannot remove it.
- **US-COMMS-LOG:** links the sent email to the record afterwards, with a
  status line.

## UX problems seen in the capture

- **Four tabs for one task.** Recipients, subject and body are split across
  tabs, and Send Now is reachable from every tab, so it can be pressed before
  the body has been seen.
- **Internals on show.** Raw IQA paths, data source aliases, merge-field
  syntax, `{#party.Email};` in To, and "Pass query values to matching report
  parameters" are all shown to staff who only want to write an email.
- **Recipients hidden and misleading.** Who it goes to is on the third tab.
  With no query it silently falls back to "the selected contact" from
  elsewhere in iMIS.
- **Fields that do not apply.** Type lists generic iMIS categories (Billing,
  Shipping) that do not apply to a case email.
- **Unhelpful merge fields.** Insert field is a long list of raw names that
  can include fields the recipient query lacks, which breaks the send.
- **Save and Save As are the primary buttons.** They save a template, which
  is the rarer action, while sending is secondary in each tab's corner.
- **Heavy editor.** Two rows of Word-style toolbar, aimed at newsletters, not
  correspondence.
- **Clumsy send.** A full postback, a separate confirmation popup and a
  reload, with no preview of what one recipient will receive.

## Built into the theme (24 October 2026)

- **Default template:** Email parties opens the send page with
  `CommunicationId` = "Generic Case Email" (`ActionDefinitions.js`).
- **Open** lists `$/Common/Communications/Templates/i4u/Cases`
  (US-COMMS-TEMPLATES).
- **Basic mode and the Advanced switch, with the trimmed toolbar and the
  friendly Insert field** (US-COMMS-BASIC; items 1 and 2 of the build plan).
  Guide `#comms-basic`.

- **Locked header and footer, and Review and send** (items 3 and 4; guide
  `#comms-basic-lock`, `#comms-basic-review`), built after the probes below.

Tested on the dev tenant by injecting the new code into the live send page;
nothing was saved or sent. Not uploaded yet.

### Probes (24 October 2026, dev tenant, nothing sent)

- **Editor:** it keeps HTML comments, so the template's MESSAGE START and
  MESSAGE END find the message rows. It runs in `designMode`, which ignores
  `contenteditable="false"`, so the lock cancels edits instead. The editor
  handles Delete after select all itself (no `beforeinput`), so editing keys
  are stopped at keydown too. Its table resize handles are `.rrHandle`
  elements in the editor document.
- **iMIS Preview:** on this page it fails with "Service Error" and "There are
  no previews to display… recipient contacts could not be identified". The
  theme draws its own preview.
- **Send Now** posts the page back, then opens
  `CommunicationConfirm.aspx`: "You are about to send an email campaign
  called "…" to N recipient(s)", with Yes, Send Now
  (`ctl00_TemplateBody_ButtonSend`) and No, Go Back
  (`ctl00_TemplateBody_CancelButton`).
- **Wrong recipients:** that confirmation showed **224** recipients for the
  case's 7, and **151** for an agreement's 1. iMIS's send ignored the
  `@url:CaseNum` and `@url:AgreementNum` filters that `/api/query` accepted.
  With the IQAs' own prompt names (`CaseOrdinal`, `AgreementOrdinal`) it
  counted 7 and 1. Fixed in `ActionDefinitions.js` (Email parties, Email
  contacts; Email members already used `AgreementOrdinal`).
- **Party record:** `/api/Party/{ID}` gives PersonName (FirstName,
  LastName, InformalName, FullName), Name and Emails for `{#party.X}`.
- **Case number:** the Parties IQA's `CaseID` column is empty for the case's
  parties, so `{#recipient.CaseID}` in the template prints nothing. The
  review step now warns about blank fields like this one.

## Proposed design: basic mode, advanced mode and review (mockup)

Owner's direction (24 October 2026): a default template for case emails
presets From, To, Subject, Type and the email body's header and footer.
Staff edit only the subject and the message. Advanced mode shows every
field as editable.

**Mockup:** `index.html`, with the proposed styling in
`email-composer.candidate.css` and its behaviour in
`email-composer.candidate.js`. The native classes and the theme CSS are
real. The email's own HTML (header, message and footer, inline styles, for
the default Case email template's Body) is
`templates/Case-Email-Template.html`. It needs a `CaseID` column on the
Parties IQA. Preview: start `static-node` from `.claude/launch.json` and open
`http://localhost:8778/prototypes/wip/email-composer/`. Sample data only.

- **Basic mode (the default):** one section, no tabs.
  - The template's presets (From, To as "Each party's own email · 7 emails",
    Type) appear as quiet, read-only lines, with the template's name and
    "Change in Advanced".
  - Subject: the fixed "Case C218 –" tag, then the staff member's text.
  - Message: a trimmed toolbar (bold, italic, underline, lists, link and
    Insert field) over the email as the template frames it. The header and
    footer are marked "Template" and cannot be edited. The message
    between them can.
  - Insert field offers only the recipient query's own columns, by
    friendly name (First name, Full name, Role on the case, Email), and adds
    each as a chip.
- **Open (both modes, owner 24 October 2026):** opens a picker of the case
  templates folder only (placeholder `$/_i4u_/Core/Cases/Email Templates`),
  with search and a one-line summary of each template. Choosing one sets the
  subject and the message, and its sender, type, header and footer. The
  picker says this replaces the subject and message. In Advanced mode it
  also offers "Browse all folders", which opens iMIS's own Document
  Browser.
- **Advanced mode (the switch in the heading):** iMIS's own tabs with every
  field editable. The switch is remembered for each person in the browser.
- **Review and send (both modes):** replaces the composer in place. It
  shows From, To (the party's own name and email) and Subject, and the
  email with every merge field filled in for that party. Staff step
  through the parties with ‹ › or the list. "Send to 7 parties" is
  disabled until there is a subject. "Back to editing" returns to the
  composer unchanged.

## Open decisions

- **Template.** Where the case email templates live, the folder's real
  path, and who maintains them. The default (Case email) would load on
  arrival in basic mode.
- **Listing the folder.** Native Open calls
  `LoadCommunication(null, null, null, 'Document Browser')`, which opens
  the Document Browser with no folder chosen. Needs a probe: can that
  browser start in a folder, or can the theme list the folder's
  communications itself (through the REST API, or an IQA on the document
  tables)? Opening the chosen template is known to work: iMIS reloads the
  page with `&CommunicationId=<key>` and keeps the address's parameters.
- **Bracketed placeholders.** The sample templates use `[date]` in the
  message only. Square brackets in a subject stop the send (Advanced Email
  tracking), so a template's subject must not contain them.
- **Locked header and footer.** In iMIS the body is one RadEditor document.
  To keep the template's header and footer uneditable, the template could
  mark them non-editable, or the theme could join them to the message
  only at send. Needs a probe of the editor.
- **Trimmed editor.** Whether basic mode hides RadEditor's tools or draws
  its own toolbar over the editor's commands. The editor can also size
  itself wrongly when it starts hidden in a tab; check this when the
  section merges the Header and Body tabs.
- **Review step and iMIS's confirmation.** The review is drawn by the
  theme. iMIS's own Preview and its send confirmation popup
  (`CommunicationConfirm.aspx`) still need probing: whether the review can
  reuse the native preview, and whether the popup can be confirmed for
  staff or must appear as a second step.
- **Type.** Hidden in basic mode. The template must set a type that suits
  opt-out preferences and reporting, rather than leaving it at (None).
- **Advanced on narrow screens.** The wider header fields (720px,
  US-AGREEMENT-COMMS-PAGE) overflow a phone-width column in the mockup.
  Check this on the live page.
