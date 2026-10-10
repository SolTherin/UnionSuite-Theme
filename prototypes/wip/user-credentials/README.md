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
| Account, Roles, Security groups | Three equal cards; roles and groups are compact lists with trash icon buttons. Revised 8 October 2026 (owner): each list is one box whose grey header bar is the native title row ("Roles", Add on the right); the card label and the one-column head are gone. |
| Add opens the native Select Role / Select Group popup: a paged checklist in a dialog | **Add picker** (owner, 8 October 2026, option A of two; B, a chip field, was not taken): Add opens a checklist inside the list's box, under its header bar, with search, Assigned entries ticked and disabled, a count, and Cancel / Add *n* roles. The choices come from the popup's own page (`UserRoleSelect.aspx`, `UserGroupSelect.aspx`) loaded in a hidden frame, with its own Show all run, so iMIS still decides what the user may assign (SysAdmin, for one). The URL is the one `AddRole()` / `AddGroup()` would open, caught with a stand-in `ShowDialog`. Apply does what `RoleSelectCallback` / `GroupSelectCallback` do: the keys go in `AddedRoles` (replaced) or `AddedGroups` (appended), then the hidden `AddRoleButton` / `AddGroupButton` posts back. Choices load once per page. If the page cannot be read within 15 seconds, or a field or button is missing, the native popup opens instead. Keys: arrows move, Space ticks, Enter adds, Esc closes. While the choices load, the status row shows the theme spinner, small, before "Loading roles…" (as the taskbar search's "Searching…"). Apply puts the shared button spinner on "Add *n* roles" until iMIS's postback ends. |
| Role rows show only the name | An info button (`ti-info-circle`) left of each row's delete opens the role's description under its name, in the name cell (the grid deletes rows on the client, so no row is added) (owner, 8 October 2026). Descriptions come from `GET /api/Role` (`RoleKey`, `RoleName`, `Description`), fetched once on first use, with the small spinner while loading; rows match by the RoleKey in their hidden cell, or by name. A blank description reads "No description." Only assigned roles are looked up, so the picker's permission filtering is unaffected. |
| Nothing says role and group changes wait for Save | A native warning message (`AsiWarning`) at the top of User information, "Changes to roles and security groups take effect when you save." (owner, 8 October 2026; removals wait for Save too, confirmed by the owner). It appears when a hidden Add button posts (the picker or the native popup) or a row's delete button is clicked, stays through the list postbacks, and goes on Save or Cancel or any full page load. |
| Account card: a loose title and fields | The same box as Roles and Security groups (owner, 8 October 2026): the panel body is the box, its title row the grey header bar, the fields inset below. |
| Nothing marks a login that cannot sign in | Disabled ticked, or an expiration date before today: the Account box takes the danger tone (`data-us-account-blocked`; the panel tones' `--danger-bg` bar and danger-mixed borders) with a badge per reason, "Disabled" and "Expired 8/10/2020" (owner, 8 October 2026). It follows the fields as they are edited. Lockout is the third reason; see the next row. |
| A blocked login is only visible in the fields | **Can't sign in** (owner, 8 October 2026): a native error message (`AsiError`) above the control's cards, "This user can't sign in.", listing each reason: locked out after too many failed sign-in attempts (with the time from the native status), disabled, expired (with the date). It follows Disabled and the expiration date as they are edited. A lockout adds **Unlock account**, which clicks the native unlock (`…_ClearLockoutStatus`, unlocking immediately; owner) with the shared button spinner; the native pencil is hidden and the Locked out status reads in the danger colour. |
| Password and Confirm password offered the browser's saved password | `autocomplete="new-password"` on both (owner, 8 October 2026), plus the skip attributes common password-manager extensions honour (`data-lpignore`, `data-1p-ignore`, `data-bwignore`, `data-form-type="other"`). Browsers treat this as a request: they stop filling a saved password but may still offer to generate one. |
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
- **Password meter.** The native script fills `#PasswordMeter .progress-bar`
  as a password is typed; its colours stay native until seen on the tenant.
- **Native copy.** "Password Reset", "Send Email", "Effective Date" and
  "Expiration Date" are title case, from the control; CSS can't change them.

## Collapsible panels (theme gap)

The shared theme styles no native collapsible panel: most iParts can be set
collapsible (and collapsed by default), and those headings keep Orion's
look. Staff access has its own chevron in `US-CREDENTIALS` for now; a
shared collapsible treatment in the panel card rules should replace it.
