---
target: contacts-compare.html option 7 card hierarchy
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 1
timestamp: 2026-10-03T01-57-13Z
slug: rototypes-wip-agreement-page-contacts-compare-html
---
Method: dual-agent (A: design review sub-agent · B: detector/browser sub-agent)
Scope: option 7 card element hierarchy, and the owner's proposal to drop group from the card and put type with role on line 2.

| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | Text search leaves "15" in the title while chips show "6 of 15 · SBU" |
| 2 | Match system / real world | 3 | Group "External" beside type "External" reads "Consultant · External" |
| 3 | User control and freedom | 3 | Chips toggle, × clears |
| 4 | Consistency and standards | 3 | Search and chips drive the count differently |
| 5 | Error prevention | 3 | Blank copy buttons disabled; blank links plain |
| 6 | Recognition rather than recall | 3 | Avatar colour unlabelled when headings are absent |
| 7 | Flexibility and efficiency | 3 | Chips, suggestions, copy in place |
| 8 | Aesthetic and minimalist design | 2 | Group repeated on 15 cards under headings that say it |
| 9 | Error recovery | 3 | Copy flash; no-results message |
| 10 | Help and documentation | 2 | Nothing explains the dot or tint |
| Total | | 28/40 | Good |

Verdict on the proposal: do a variant. Saves 22.8px per card (124.8 to 102.0); 342px for 15 contacts in one column at 380px; 128 to 183px at the Overview width.
Variant: role first ("Lead · Staff"), role in base colour medium weight, type muted; drop group from the card only when headings are on the page (fallback when the set has no headings: 4 or fewer contacts, or every group a singleton); let the role line span the full card width so long roles do not wrap at 3 columns.

Priority issues:
- P1 Proposal as stated loses group entirely on small agreements (no headings, no chips at 4 or fewer, or all singletons). Fix: fallback above.
- P2 Role not emphasised; same 12px/colour as type. Fix: role weight and colour.
- P2 Title count ignores text search. Fix: search drives "N of 15".
- P2 Mostly-singleton headings on the 6-contact page (3 of 4 headings over one card, about 108px). Fix: skip headings unless at least 2 groups have 2 or more people.
- P3 Member avatar initials 4.3:1 (#3f7a2a on #e4ece1), below 4.5; disabled copy icon about 2.1:1; empty contact rows read as broken without a placeholder.

Detector: CLI clean (degraded regex mode). In-page: 6 low-contrast findings in option 7 (Member avatar initials), 7 line-length findings on the harness intro paragraphs (false positive for the UI).
