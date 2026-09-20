# CRM Layouts / UnionSuite Theme

Project instructions live in [`AGENTS.md`](AGENTS.md). **Read it before making
any change** to theme CSS, iPart markup, Query Templates or the usage guide.

It covers:

- iMIS folder path spelling (preserve literal underscores, e.g. `_i4u_`)
- The iMIS query API to use (`GET /api/query`, not the deprecated `/api/iqa`)
- Stylesheet ownership across `99-Orion.css`, `zUnionSuite.css`,
  `zzDarkMode.css` and the client `Override.css`
- Code readability and CSS formatting requirements for project-owned source
- The iPart wrapper contract (an iPart CSS class inserts an extra `<div>`)
- The guide workflow — feature changes must update the usage guide in the
  same change, via `node tools/build-theme-usage.cjs`
