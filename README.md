# Union Suite CRM layouts and theme

Reusable iMIS staff-site components, layouts and integration references for
Union Innovation Hub. Start with the
[standalone Theme Usage Guide](THeme/UnionSuite/Usage-Guide.html) for authoring
instructions, branding, class placement, templates and troubleshooting.
It opens directly in a browser and can be shared as one offline HTML file.

## Current feature status

| Feature | Status | Maintained source |
|---|---|---|
| Five brand seeds, palette ramps, semantic tokens and live editor | Theme tokens; guide editor updates every preview, with hex input/reset/CSS download | `THeme/UnionSuite/zUnionSuite.css`; client overrides in `zzClientSpecific.css` |
| Existing native buttons (`TextButton`, `btn` and native variants) | Token colour mapping in shared theme; native layout and handlers retained | `zUnionSuite.css`; inventory and limits in `THEME-BUTTONS.md` |
| Action icons and compact row actions | Tabler children on native buttons; optional `us-icon-button` modifier and hover/focus tooltips | `zUnionSuite.css` and `zUnionSuite.js`; recipes in the usage guide |
| Visual author handbook | 20 native-button recipes, 25 action meanings, banner previews and dummy IQA; click-to-copy classes and exact placement | `THeme/UnionSuite/Usage-Guide.html`; maintained sources in `docs/` and `tools/` |
| IQA Query Menu presentation, filter disclosure, native Export and expanded view | In shared theme; deployment must be verified on the target site | `THeme/UnionSuite/zUnionSuite.css` and `zUnionSuite.js` |
| Static and current-record banner styling | In shared theme, with separate page-layout and component sections | `THeme/UnionSuite/zUnionSuite.css` |
| Sticky/condensing banner behaviour and Actions disclosure | In shared theme JS | `THeme/UnionSuite/zUnionSuite.js`; generated legacy fallbacks remain in `prototypes/` |
| Banner tabs row | Visual template available; switcher deferred for a later session. Direct zone switching first, CCO separately | `prototypes/Banner-Template.html`, `Banner-Tabs-Plan.md` and `TODO.md` |
| Report action slot and button/text-link styling | In shared theme | `zUnionSuite.js` and `zUnionSuite.css` |
| Named business-action registry and combined activity feed | Planned | `THEME-PANEL-ACTIONS.md` and `THEME-ACTIVITY-FEED.md` |

Use the `us-` class prefix for custom components; native buttons keep their existing names. Page classes control page layout; iPart classes
enable components; `us-banner__*` classes describe slots inside authored HTML.
For example, `us-banner-collapsible` includes sticky behaviour, while
`us-banner-page` supplies only full-width layout with native row gutters.
The guide records the exact combinations and their prerequisites.

## Documentation map

The [native button inventory](THEME-BUTTONS.md) records existing iMIS classes,
colour tokens, size/group utilities, specialised controls and known gaps.

| Document | Audience and purpose |
|---|---|
| [Project TODO](TODO.md) | Deferred work, agreed scope and implementation checklist for the next session |
| [Theme Usage Guide](THeme/UnionSuite/Usage-Guide.html) | Content authors: visual examples, click-to-copy classes, exact placement, branding preview, templates, dummy IQA and troubleshooting |
| [Theme README](THeme/UnionSuite/README.md) | Implementers: shared assets, deployment and report APIs |
| [Guide maintenance](THeme/UnionSuite/docs/README.md) | Maintainers: source files, generation and verification |
| [Product context](PRODUCT.md) | Project scope, users, constraints and current artifacts |
| [iMIS CMS structure](IMIS-CMS-STRUCTURE.md) | Verified page/zone/iPart wrappers, native configuration and HTML entry points |
| [Theme inventory](THEME-INVENTORY.md) | Native component families and implementation status |
| [Theme findings](THEME-FINDINGS.md) | Historical measured cascade findings and integration pitfalls |
| [Staff styling consolidation](UTSTAFF-CONSOLIDATION.md) | Legacy component duplication and migration work |
| [Banner guide](prototypes/Banner-README.md) | Banner installation, modes, slots, tokens and lifecycle |
| [Banner tab plan](prototypes/Banner-Tabs-Plan.md) | Preferred page-zone adapter for lightweight dashboards and separate CCO option |
| [Panel actions and IQA reports](THEME-PANEL-ACTIONS.md) | Implemented report utilities plus the planned business-action registry |
| [Activity-feed plan](THEME-ACTIVITY-FEED.md) | Proposed source grouping, metadata and assembly |
| [Enhancement integration plan](THEME-ENHANCEMENTS-INTEGRATION-PLAN.md) | Approved Option C taskbar/bookmarks/palette/Recents design, proposed single script loader and feature/file ownership; production integration is planned |

## Templates and previews

- [Static dashboard banner](prototypes/Banner-Dashboard-Template.html) — Content HTML.
- [Contact banner](prototypes/Banner-Contact-Template.html) — one current-record Query Template Display result; replace bracketed placeholders with actual fields.
- [Complete banner template](prototypes/Banner-Template.html) — adaptable to Agreement, Contact or Staff; removable Actions and tabs divs.
- [Banner preview](references/Banner-Preview.html) — generated local example with scrolling and optional-block controls.
- [Contact prototype](prototypes/crm-contact-Prototype.html), [staff dashboard prototype](prototypes/Staff-Task-Dashboard.html), and [agreement prototype](prototypes/Agreement%20Management/Agreement-Management-Prototype.html) — design references, not automatically installed theme features.

The HTML guide embeds banner snippets, button/action recipes and icon assets.
Visual controls have no business handlers; copied command templates and banner
tabs stay disabled until their real integrations exist. The dummy IQA has local
sample-only filtering/sorting/paging/export and uses real shared Filters/Expand.
No replacement grid HTML is needed for reports: configure the native Query
Menu and apply its documented iPart classes.

## Keeping documentation current

Update the guide and relevant implementation notes in the same change as a
feature, class, template, token or installation change. Edit
`THeme/UnionSuite/docs/Usage-Guide.source.html` for prose; the generator imports
tokens and banner code from their maintained sources. Do not hand-edit the
generated guide or banner preview.

From the project root:

```text
node tools/build-theme-usage.cjs
node tools/build-theme-usage.cjs --check
```

When banner assets or the complete banner template change, first run
`node .preview/build-banner-preview.cjs` to update the preview and synchronize
the generated compatibility files from shared theme JS. These are maintainer-only generation commands;
opening the guide and deploying the finished theme assets need no build tools.

Banner page-layout and component CSS now live in separate shared-theme sections.
Banner behaviour now lives in `zUnionSuite.js` too. After deploying and loading
the updated shared assets, remove old standalone banner embeds/includes, keep
the content HTML, and verify scrolling, Actions and a real partial update.
Local browser checks do not establish deployment or replace testing a real
iMIS/Telerik partial refresh.

Native XML Import now shares Theme Upload’s compact filename/Select/Remove row, independent secondary-button states and file-drop highlight. Deploy zUnionSuite.css and zUnionSuite.js together. The initial Upload action also uses the shared busy ring; native XML validation and disabled-button logic remain authoritative. See Native-Form-Integration.html for the offline Import example. Live selection/drop/removal and upload verification remains required.

Current status and outstanding work are reconciled in [THEME-INVENTORY.md](THEME-INVENTORY.md) and [TODO.md](TODO.md). Latest IQA/calendar fixes are locally checked and await live confirmation; taskbar redesign and banner zone switching remain parked.
