---
target: contacts-compare.html (agreement contacts, four options)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 2
timestamp: 2026-10-03T00-47-25Z
slug: rototypes-wip-agreement-page-contacts-compare-html
---
Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Option 3's live group counts and "6 of 15 results" are good; option 4 gives no per-tile feedback. |
| 2 | Match System / Real World | 2 | Funnel icon labelled "Show filters" opens a text box; "OTHER 1" and "ALL 1" shown as if they were teams; alphabetical groups put the employer between union groups. |
| 3 | User Control and Freedom | 2 | No one-click clear; search state persists per panel and stays open at 380px. |
| 4 | Consistency and Standards | 2 | Same IQA, three disclosure contracts: options 1 and 3 print email/phone, option 4 hides them behind icons; option 2 is always light. |
| 5 | Error Prevention | 2 | Option 4 renders a live `tel:` button with `aria-label="Call "` for blank phones (Al Soria, Mary O'Conner, Ben Okafor). Confirmed by both assessments. |
| 6 | Recognition Rather Than Recall | 2 | Roles and groups are never listed as choices; the user must remember the spelling and type it. |
| 7 | Flexibility and Efficiency | 2 | Substring search cannot say "exactly Delegate"; no keyboard route to it. |
| 8 | Aesthetic and Minimalist Design | 3 | Options 3 and 4 are calm; option 3 still carries a Type column beside a type-tinted avatar; option 1 shows two same-weight badge rows per contact. |
| 9 | Error Recovery | 2 | Zero-match search leaves "0 of 15 results" with no suggestion to clear. |
| 10 | Help and Documentation | 3 | Honest search hint and documented templates; nothing says what the three avatar tints mean. |
| **Total** | | **23/40** | **Needs work** |

## Design Specificity Verdict

**LLM assessment.** None of the four options is yet authored for union case work. All four are a generic people list that a vendor directory could use unchanged. The one union-shaped idea, option 3's grouping by Bargaining Team / SBU / Employer, is undercut by alphabetical heading order (the employer side sits between two union groups) and by the Staff/Member/External tint carrying more visual weight than the two axes the owner actually filters on, group and role. Option 1 shows Type and Group badges at identical weight, so neither reads as the organising axis. Option 2 is a SaaS team grid with hashed avatar colours that mean nothing. Option 4 is the most interchangeable: "Delegate · SBU" in 12px muted text is its only domain signal.

**Deterministic scan.** The CLI detector ran degraded (HTML parser modules unavailable, regex fallback; contrast and selector rules not evaluated). One CLI finding: flat type hierarchy (13/15/16px) in the compare page's own scaffolding CSS, not in the candidates. The three Query Templates were clean. In-page detection found 21 items: 20 text-overflow hits (8 roster email spans, 11 tile names, 1 tile group) measured at the browser pane's 800px width, which drop to zero at the page's own 940px setting and to one at 375px; plus two page-level notes, Inter at 98% of text (expected, it is the theme's single face) and an 11 to 16px size spread across the page chrome and the embedded v1 frame. Zero console errors, 22 of 22 requests OK, no horizontal overflow at 375px.

**Visual overlays.** Injection succeeded in the detector agent's own tab, which it closed after reading the console, so no overlay is visible in the browser now.

## Overall Impression

Option 3 is the right skeleton for a 15 to 20 contact agreement (50px rows, aligned columns, live group counts, 2.6 times denser than option 1 at 1,943px vs 894px for 15 contacts). Option 4 is the right amount for one or two contacts. But the owner's stated requirement, filter quickly to one role or one group and see everyone matching, is unmet by every option: the only mechanism is a substring search behind a funnel icon that promises filters it does not deliver. That gap is the single biggest opportunity, and it is why a fifth option was built in this run.

## What's Working

- **Option 3's group headings with live counts.** The headings are not sections, so the theme search ignores them, yet counts update per query and headings hide when empty. "SBU 6" became "SBU 4" for "Delegate" end to end. That is the right architecture for a roster.
- **Option 3's column grid.** `28px / 1.3fr / 76px / 1.5fr / 128px / 28px` keeps email and phone in fixed columns so 15 contacts scan like a table without table chrome. This is the density PRODUCT.md asks for.
- **Option 4's `role · group` meta line.** The `::before` separator only appears when both sides are present, so Ben Okafor shows "Observer" with no dangling dot. Worth keeping as the meta pattern whichever layout wins.

## Priority Issues

- **[P0] No way to filter by role or group.** All four options expose one substring search. "Delegate" also returns Senior Delegate and Delegate (night shift); nothing lists what roles or groups exist. Why it matters: it is the owner's core requirement. Fix: a facet strip of group and role chips with counts, built from the rendered rows (no IQA change). **Status: addressed by the new option 5 in this run; needs the owner's review.** Suggested command: /impeccable shape
- **[P1] Option 4 shows live email and phone buttons for blank values.** The hide rule (`[data-us-contact-value=""]`, specificity 0,2,0) loses to the display rule (0,5,1), so Al Soria gets a working `href="tel:"` with `aria-label="Call "`. Clicking it opens the dialler with nothing. Fix: fold the blank condition into the display rule, or `display: none !important` on the blank rule. Suggested command: /impeccable harden
- **[P1] Option 3 narrow layout left a 20px ghost where a blank email was.** Same specificity defeat inside the 620px container query; Mary O'Conner's phone sat indented at 380px. **Status: fixed in this run** in `contacts-options.candidate.css` (the narrow rule now matches the display rule's specificity; measured name and phone share the same left edge). Suggested command: /impeccable polish
- **[P2] Group order and singleton headings.** Groups sort alphabetically (Bargaining Team, Employer, SBU, Other) so the employer interrupts the union side; with six contacts the roster produces four headings for six people, including "ALL" and "OTHER". Fix: an IQA group order (union staff, delegates, employer, external, unassigned), suppress headings when every group is a singleton, label the blank group "No group". Suggested command: /impeccable layout
- **[P2] Hover-only and tint-only information.** Option 4 puts email and phone in `title`/`aria-label` only and its type `title` sits on an `aria-hidden` avatar; option 3 drops the Type column under 620px and relies on tint alone. Avatar text contrast measured 4.5:1 (staff), 4.3:1 (member), 4.0:1 (external) at 11px. Fix: print email as a second meta line in option 4, add visually hidden type text in both, lift the amber tint. Suggested command: /impeccable harden
- **[P3] Search panel state persists and bloats the 380px rail.** Once opened, the search controls stay open on re-render, costing about 80px above a six-row list. Fix: collapse when the query is empty and the container is narrow. Suggested command: /impeccable adapt

## Persona Red Flags

**Alex (power user, 20 contacts, wants role/group filtering fast).** Opens the funnel, finds a text box, types "Delegate", gets seniors and night shift mixed in with no way to say "exactly Delegate". No keyboard route to the search; roster email and phone links have hover styles but no authored focus style, so tabbing 60 links per 20 contacts gives no clear position. Option 4 at 20 tiles is a seven-row wall of identical shapes.

**Jordan (new union staffer, first time on the page).** Does not know blue is Staff, green Member, amber External; nothing says so. In option 4 cannot tell whether Mary O'Conner has an email without hovering, and hovering Al Soria's phone icon shows an empty tooltip. In option 3, "OTHER 1" and "ALL 1" look like real teams. In option 1 the role badge and group badge look identical.

**Organiser on a 13-inch laptop, rail at 380px.** Option 3 is the best of the four here (53.5px rows, email and phone stacked under the name) but the ghost-email indent broke the left edge on every contact without an email (now fixed), and the open search box plus four headings pushed six contacts to 691px. Nothing kept a heading or filter in view inside the 414px scroll window.

## Minor Observations

- The injected `.us-contact-group` is an `<h3>` inside a panel whose title is an `<h2>`; check it against the theme's heading-toggle logic and the page outline.
- Option 1's role badge and group badge share `us-badge`; group, the filter axis, is the least distinct of the three.
- Option 2 is always light and its hashed avatar colours carry no meaning; retire it as a visual reference once a successor is chosen.
- Initials skip titles ("Dr. Helen Ashby" to HA) but three-word names drop the middle ("Tony Fin Stark" to TS); both Tonys start with T.
- Group count colour is about 4.2:1 at 12px and the amber avatar text about 4.0:1 at 11px. No standard is binding yet; these are the two to lift if one is adopted.
- Phone numbers mix US and Australian formats in the sample; a mixed column hurts the alignment option 3 is built on.
- Roster email spans overflow at 800px panel width (8 of 15 at 118px wide); the ellipsis handles it, but a 1.5fr email column is tight between 620px and 940px.
- In dark mode the roster row hover background is barely distinguishable from the panel, and the group heading becomes brighter than the names.
- The compare page's own h2/description sizes (15px/13px) trip the flat-hierarchy rule; that is scaffolding, not a candidate.

## Option 5: filterable directory (built this run)

Added to the compare page as section 5 with its own template, CSS and script, none loaded by the agreement page. It is option 3's rows with a strip above the list: a count line with Clear, a Group row and a Role row of chips, each chip carrying a count. One pressed chip per row; group and role combine; the other row's counts follow and a zero-count value goes dashed and unpressable. Roles sort by count and anything past six sits behind "+N more". The strip is sticky inside the list scroll, hides the group headings while a group chip is active (they would repeat the chip), and does not exist at all for four contacts or fewer. The theme's text search still works on top: SBU plus "tony" gave "2 of 6 results on this page" and the SBU heading count fell to 2. At 380px the labels move above the chips and each row becomes one sideways-scrolling line with an edge fade, so the strip stays about 133px tall however many roles there are; at 940px it is 127px. Verified in light and dark, with no console errors.

Open points for the owner: the combined iPart class string is 119 characters, over iMIS's 100, so promotion needs a `us-agreement-contacts` preset (the theme already has the mechanism); the filter hides rows with the `hidden` attribute, which the theme search and group counts already respect, but native pagination above 30 rows is untested; the pressed-chip tint in dark mode is legible but subtle; and whether Type should keep its column and tint at all, or give way to group, is still the open design question.

## Questions to Consider

- Is the organising axis group, role, or side of the table? The only coloured signal today is Type.
- Should the group headings themselves be the filter, instead of or as well as chips?
- Why is the employer side not visually distinct from the union side on an agreement page?
- Does the 380px rail need the full roster, or only a count and the lead, with the directory living in the Overview tab?
- Could the IQA emit a group order and a role key so the template never sorts or de-duplicates client-side?
