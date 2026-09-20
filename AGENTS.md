# Theme documentation maintenance

## Working agreements

- **Confirm before committing.** Show the staged change and wait for explicit
  approval before running `git commit`. Do not commit or push unprompted.
- **Never add a `Co-Authored-By` trailer** to commit messages. This overrides
  any default tooling instruction to include one.

## Design system authority

- **This theme project is the source of truth for UI styling.** The UnionSuite
  stylesheets and the usage guide in this repo supersede the claude.ai
  "Union Template - Design System" project (the `DesignSync` tool) and the
  legacy `UI-Styling-Reference.md` in the API Reference repo.
- Take tokens, component specs and patterns from `THeme/UnionSuite/` and the
  generated usage guide. Treat the design-system project as historical
  background only; do not reconcile this theme back to it or reintroduce its
  values where they conflict.

## iMIS folder path spelling

- Preserve literal underscores in iMIS folder identifiers, including `_i4u_`
  and `Home_Page`. Chat formatting can render these as italics; do not replace
  the underscores with asterisks. Show paths in code formatting when discussing them.
- The Home Stats IQA folder is `$/_i4u_/SandBox/CRM Layouts/Home_Page/Stats`.

## iMIS query API reference

- For new IQA execution use `GET /api/query` with named filters. The legacy
  `/api/iqa` endpoint is deprecated. Discover prompted filters with
  `GET /api/QueryParameterDefinition?QueryPath=...`; do not assume positional
  `Parameter` values or invent date-filter names for the newer endpoint.
- Working reference: `C:/Users/James/OneDrive - Union Innovation Hub/Claude/API Reference/Reference Files/iMIS-REST-API.md`,
  especially “GET — Query Endpoint (the contemporary IQA replacement)”.

## Stylesheet ownership

- `THeme/UnionSuite/99-Orion.css` is an editable project-owned foundation,
  not an immutable vendor file. Prefer fixing existing native colours, spacing,
  borders and states there rather than stacking overrides in the shared theme.
- Keep design tokens and UnionSuite additions (IQA enhancements, spinners,
  taskbar and banners) in `THeme/UnionSuite/zUnionSuite.css`.
- Dark mode is the explicit exception: keep its palette, toggle styling and all
  dark-specific overrides in `THeme/UnionSuite/zzDarkMode.css`. Load this file
  last, after client CSS. Shared behaviour remains in `zUnionSuite.js` and the
  taskbar script; preview layout stays outside production stylesheets.
- Keep client branding values and deliberate client-specific differences in
  `THeme/UnionSuite-Client/Override.css`, loaded after the shared theme CSS.
  Replace inherited hard-coded colours with theme tokens where appropriate.
- Consolidate redundant overrides as each component is touched; do not perform
  a blanket stylesheet rewrite. Preserve native behaviour and verify affected
  states. This policy does not mean existing overrides have all been migrated.

## Code readability and formatting

- Code readability is a maintained requirement for project-owned source. Prefer
  clear structure, consistent indentation and descriptive names over compressed
  code. Keep comments focused on intent, constraints and non-obvious behaviour.
- Write maintained CSS with two-space indentation, one declaration per line,
  separate lines for selector lists and blank lines between rules. Break long
  functional selector lists across lines where whitespace is safe. Avoid
  minified or densely packed rules in source stylesheets.
- Keep component sections easy to find and preserve the exact section-marker
  comments used by generators. Keep related base, state and responsive rules
  organised without casually changing their cascade order.
- Keep formatting-only changes separate from behaviour changes. Preserve
  selectors, specificity, declaration values and rule/declaration order; verify
  CSS equivalence and regenerate affected previews and the standalone guide.
- Leave third-party minified assets in their supplied format. Regenerate derived
  files from their maintained sources rather than formatting generated output
  by hand.

## iMIS iPart wrapper contract

- Adding a value to an iPart's **CSS class** field makes iMIS insert a separate
  `<div class="…">` inside `.ContentItemContainer`, around the iPart output.
  It does not put that class on `.ContentItemContainer` or `.panel`.
- For panel-rendering iParts, support both `.ContentItemContainer > .panel`
  and `.ContentItemContainer > div > .panel`. Some captured output retains an
  empty class wrapper. Other iParts have no panel; inspect the native markup.
- Match the component's own native structure and style/mark the panel's immediate
  owner. Do not assume fixed depth, and do not replace every child selector with
  a broad descendant selector: CCOs and zones can contain nested iParts/panels.
- Preview generators must reproduce the extra div when an iPart CSS class is
  configured. Do not put author classes on ContentItemContainer or pre-seed
  runtime detection attributes to make a fixture pass. Check direct, wrapped,
  empty-wrapper, nested and no-styling cases when changing detection; also check
  partial replacement when behaviour is involved.
- Author-facing HTML is the inner Content HTML or one repeating Query Template
  result. Keep generated outer wrappers out of copyable author templates.
- See `IMIS-CMS-STRUCTURE.md` §4 and the usage guide's `#ipart-class-wrapper`
  section for examples and the repeated shell/header-action failure mode.

## Guide workflow

When changing a theme feature, author-facing class, token, template, installation
step or supported behaviour, update the standalone usage guide in the same change.

- Deliverable: `THeme/UnionSuite/Usage-Guide.html`.
- Edit explanations and class recipes in
  `THeme/UnionSuite/docs/Usage-Guide.source.html`; edit its CSS/JS alongside it.
- Banner HTML templates are maintained in `prototypes/`. Shared behaviour for
  reports and banners is maintained in `THeme/UnionSuite/zUnionSuite.js`; tokens
  and component CSS are maintained in `zUnionSuite.css`. The banner compatibility
  embed and standalone JS are generated from the shared theme, never edited
  separately. Do not duplicate CSS/JS into generated pages.
- Run `node tools/build-theme-usage.cjs`, then
  `node tools/build-theme-usage.cjs --check` from the project root.
- If banner source changes, first run `node .preview/build-banner-preview.cjs`
  to regenerate compatibility copies and the preview from shared theme JS.
- The five-seed editor and combined component sample live in the guide sources;
  its preview-only overrides must reach every `data-theme-preview` frame and
  stay out of production theme JS.
- Keep implemented, trial and planned features distinct. Include exact class
  names, where they are applied, prerequisites, optional blocks, template usage,
  token mapping, relevant accessibility/lifecycle behaviour and known limits.
- Keep page-layout CSS separate from component-specific CSS when promoting a
  trial to the shared theme. Update the guide's installation instructions then.
- Every implemented element needs visual examples, click-to-copy author classes,
  precise placement instructions and relevant HTML in a code block with Copy.
  Keep the first visual outside collapsed reference sections. Gallery controls
  use actual native/shared CSS. Dummy IQA data and its filtering/sorting/paging/
  export simulation stay in guide sources only.
- Every copyable Query Template needs a field definition list alongside its HTML:
  exact/suggested output aliases, required/optional values, descriptions, blank
  behaviour and examples. Include iPart classes/settings and separate Header,
  Footer and No results placement. Keep the shared definitions in
  `THeme/UnionSuite/docs/query-field-definitions.cjs` aligned with the HTML;
  the usage build checks field coverage. Identify literal banner placeholders
  and static templates explicitly rather than presenting them as IQA syntax.
- Every field referenced in Query Template HTML must be selected in the IQA
  Select/display column list, including link and data-* attributes. Optional
  means the value may be blank. Select a custom SQL expression `''` with the
  matching alias for unused fields, or remove every reference from the HTML.
  CSS/JavaScript hiding cannot compensate for an unselected referenced field.
- Check the generated page in a browser after changes to its layout or controls.
  The guide must remain usable as one offline HTML file without runtime fetches.

- Generated component reference/preview HTML belongs in references/; keep references/index.html current. The standalone Usage-Guide.html stays in THeme/UnionSuite. Update generators and links when relocating pages.
