# User credentials

Status: merged into the theme on 27 September 2026 for testing in iMIS
(branch `theme/contact-page-v3`), not yet approved. Styles: `US-CREDENTIALS`
in `zUnionSuite.css` (dark icon variants in `zzDarkMode.css`); behaviour:
`US-CREDENTIALS` in `zUnionSuite.js`; usage guide section 06g. The
candidate stylesheet was removed at the merge. This README is the design
record. Contact page v3 shows it as item 35: a **Login Credentials** section
in the CCO rail, before Admin, replacing the mock Admin > Portal login tab.

## Problem

Staff manage a contact's iMIS login on the native **User credentials**
control: username, password, lockout, user class, password reset, account
dates, roles, security groups and, for staff users, access levels. It can't
be rebuilt, because it owns postbacks, the role and group pickers and the
password rules. Unstyled, it's a long run of loose headings on the page
background (see the owner's screenshot, 27 September 2026).

## iMIS configuration

One **Content Web User Control** iPart on the CCO tab's content page, with
no other configuration:

- **CSS class:** `us-credentials us-credentials--hide-contact` on the
  profile CCO. iMIS puts them on a div around the whole control (the dev
  tenant used `HubCredentials` while testing; change it). Leave the
  modifier off where the page is opened without a contact banner.
- **Display a border around this content:** leave unchecked.
- **Tab title:** Login Credentials (owner, 27 September 2026).

## How it's styled

From `.us-credentials`. Every control, postback and validator stays native.

| Native | Now |
| --- | --- |
| Contact information (ID, full name) | A card like the others; hidden with `us-credentials--hide-contact`, where the banner already shows both (owner, 27 September 2026: the page is not always opened from the profile CCO). |
| User credentials, User information, Staff access headings on the page background | Cards matching the page's other panels: bordered surface, tinted heading. Staff access keeps its native collapse, with a chevron. |
| Username, password, email and status fields floated at mixed widths | One label/value grid (fields 360px); every field is nested in the Username field, so nested fields use a subgrid. Read-only username and email look read-only. Locked out, Last sign in and Last active on sit under a divider as status. |
| Red cross image beside Username | A bordered trash icon button (the legacy image is moved out of view, as the IQA date buttons do). |
| Password Reset box below the fields | A tinted card beside the fields (below them under a 760px panel): description, website picker with an open-link button, Send Email. |
| Account, Roles, Security groups | Three equal cards; Add is a small outline button; roles and groups are compact lists with trash icon buttons. |
| Staff access selects in one column | A grid of labelled selects, four or five across. |
| Staff access always collapsed (no iPart setting) | Opened once per render by the script; a manual collapse holds until the next render. |
| Nothing in the Staff access heading | **Set all to** (owner request, 27 September 2026): one dropdown with no form name, so it is never posted, that sets every level and fires each native dropdown's change event. It shows the shared level or "Mixed levels", and hides while the panel is collapsed. |

Below a 520px panel, labels stack above their fields. Dark mode follows the
theme tokens; the three data-URI icons have dark variants (section 9).

## Preview

Start the `static-node` configuration (port 8778) and open
`http://localhost:8778/prototypes/wip/contact-page-v3/index.html#access`.
The toolbar's **Login: member / staff** switches the sample between a
member's login (Public user, RegisteredUser) and a staff login (Full staff
user, SysAdmin, Staff access shown).

The fixture in v3's `index.html` is the captured markup, anonymised, without
its inline postback handlers and calendar popups. `icon_delete.png` is a
data-URI stand-in (a red cross), so the preview shows that the legacy image
is hidden; the real path is kept in `data-cv3-src`.

## Open decisions

- **No credentials yet.** A contact without a login shows different markup
  (the control's `AddUser()` opens User.AuthUserCreate). Not captured; capture
  it and style it before promotion.
- **Locked out.** The locked state, and any unlock control, hasn't been
  captured.
- **Password meter.** The native script fills `#PasswordMeter .progress-bar`
  as a password is typed; its colours stay native until seen on the tenant.
- **Native copy.** "Password Reset", "Send Email", "Effective Date" and
  "Expiration Date" are title case, from the control; CSS can't change them.

## Collapsible panels (theme gap)

The shared theme styles no native collapsible panel: most iParts can be set
collapsible (and collapsed by default), and those headings keep Orion's
look. Staff access has its own chevron in `US-CREDENTIALS` for now; a
shared collapsible treatment in the panel card rules should replace it.
