# CRM Layouts / UnionSuite Theme

Project instructions live in [`AGENTS.md`](AGENTS.md). **Read it before making
any change** to theme CSS, iPart markup, Query Templates or the usage guide.

It covers:

- Working agreements — confirm before committing; no `Co-Authored-By` trailer
- Design system authority — this theme supersedes the claude.ai
  "Union Template - Design System" and the legacy `UI-Styling-Reference.md`
- iMIS folder path spelling (preserve literal underscores, e.g. `_i4u_`)
- The iMIS query API to use (`GET /api/query`, not the deprecated `/api/iqa`)
- Stylesheet ownership across `99-Orion.css`, `zUnionSuite.css`,
  `zzDarkMode.css` and the client `Override.css`
- Code readability and CSS formatting requirements for project-owned source
- The iPart wrapper contract (an iPart CSS class inserts an extra `<div>`)
- The guide workflow — `THeme/UnionSuite/guides/usage/` is the documentation
  source of truth; update it alongside features and rebuild with
  `node tools/build-theme-usage.cjs`, then run its `--check` and
  `node tools/check-usage-sources.cjs`
- The design lifecycle — tracked WIP, tracked approved designs, implemented
  theme/guide sources, and ignored archives only after useful content is retained
- Generated outputs are rebuilt locally; Git tracks maintained sources
