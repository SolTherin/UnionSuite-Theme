# Bulletin and alert notes in Markdown

Status: WIP mockup (16 October 2026). Not yet in the shared theme.

## Problem

Staff Bulletin posts and sitewide alerts come from a UD table
(`i4u_UT_SystemAlerts`). Authors need simple formatting in the message (bold,
italic, links and bullet points) without being given HTML. The value is stored
in a varchar column and displayed through a Query Template and the System
Notification alert.

## Decisions so far (owner, 16 October 2026)

- **Store Markdown, not HTML.** The column holds plain text in a small subset:
  `**bold**`, `_italic_`, `[link text](https://…)` and `- bullet` lines. A blank
  line starts a paragraph and a single newline is a line break. Everything else
  is text.
- **No underline.** Markdown has none, and underlined text reads as a link.
  Ctrl+U is refused in the editor.
- **Note limit: 3,000 characters**, counted on the stored Markdown (the
  formatting marks count), with a counter under the editor.
- **No HTML.** Pasted and dropped content arrives as plain text; tags typed as
  text are removed from the stored value (and from the editor when it loses
  focus). The display builds every element itself, so a stored value can never
  become markup.
- **Form fields:** Title, Note, Start date, End date, System alert (checkbox),
  Bulletin (checkbox).

## Files

- `markdown-note.candidate.js` — the candidate theme feature
  (`window.UnionSuiteMarkdown`): parser, renderer, serialiser, the editor and
  the display renderer. Would move into `zUnionSuite.js` on approval.
- `markdown-note.candidate.css` — editor and display styles. Would move into
  `zUnionSuite.css`.
- `index.html`, `mockup.css`, `mockup.js` — prototype only: the post form, the
  System Notification panel and the Staff Bulletin, with seed posts and a
  simulated save. The "What is stored" panel shows the Note exactly as it would
  reach the column.
- `test-markdown-note.cjs` — parsing, rendering, serialising, round trips, HTML
  stripping, the counter and a typed post through the editor.

## Preview and test

From the repository root, start a static server (the `static-node` launch
configuration, port 8778) and open `/prototypes/wip/bulletin-markdown/`.
Opening `index.html` directly also works.

```bash
node prototypes/wip/bulletin-markdown/test-markdown-note.cjs
```

The test uses the Playwright install in `.tmp-iqa-integration/`, as the
`tools/test-*.cjs` scripts do.

## How it would install

**Editor.** A textarea with `data-us-markdown`, or any textarea inside an
element with `us-markdown-fields`, becomes a toolbar (Bold, Italic, Link,
Bullet list), an editable area and a counter. The textarea stays in the form,
hidden, and always holds the Markdown, so a panel's own Save or an API post
sends it unchanged. The limit comes from the textarea's `maxlength` (3,000
here). Shortcuts: Ctrl+B, Ctrl+I, Ctrl+K (link). Enter starts a paragraph,
Shift+Enter a line break. The link panel accepts a web address (a bare domain
gains `https://`), a site path starting with `/`, an `#anchor` or an email
address (gains `mailto:`).

**Bulletin display.** Print the Note encoded (no `noencode`) inside an element
with `us-markdown`; the theme renders it in place, also after paging and
partial refresh:

```html
<div class="BulletinCard">
  <h3>{#query.Title}</h3>
  <em>{#query.StartDate}</em>
  <div class="us-list__body us-markdown">{#query.Note}</div>
</div>
```

Before the theme runs (or if it never does) the raw text shows with its line
breaks, so it stays readable.

**System alert.** The same class inside the alert message:

```html
<div class="uhubAlert IsSystem">
  <strong>{#SystemAlerts.Title}</strong>
  <span class="us-markdown">{#SystemAlerts.Note}</span>
</div>
```

In the alert, paragraphs run on as one line; a bullet list still drops below.

## Open questions

1. **Attaching the editor to a native panel.** An iPart CSS class is not
   present in the panel's edit popup, so `us-markdown-fields` cannot reach it
   there. Options: match the textarea by its property name in the popup, or
   post from a custom form (as this mockup) through the API. To check in iMIS.
2. **How the Query Template prints newlines** in an encoded value: kept as
   newline characters or turned into `<br>`. The renderer handles both, but
   confirm on the live page.
3. **Process Automation alert output.** The guide says the alert message keeps
   HTML (`System-Alert-Message.html`). With Markdown stored, nothing the editor
   saves contains a tag. A value written another way (API, import, SQL) that
   contains `<b` or similar would still be read as HTML by the alert, so keep
   write access to staff, as today.
4. **Columns.** Today's table has `Alert`, `Link` and `LinkText`. Decide whether
   Note replaces Alert (and whether Link/LinkText stay now that links can sit in
   the text), and add Title.
5. **What the alert shows**: Title and the whole Note (as mocked), or the Title
   with a link to the bulletin post.
6. **External links open in a new tab** (`target="_blank"` with
   `rel="noopener noreferrer"`); site paths and anchors open in place. Confirm.
7. **Characters outside the column's code page** (emoji, for example) may
   become `?` in a varchar column. Curly quotes and dashes are fine in the
   usual Latin1 collation. Decide whether the editor should warn.

## Known limits

- Italic must cover whole words: `_` inside a word is text (as in CommonMark,
  so `file_name` stays as written). Italicising part of a word drops the
  italic.
- Nested lists flatten into one list; numbered lists, headings and underline
  are not offered and are stored as plain text.
- The editor uses the browser's built-in editing commands (`execCommand`),
  which are deprecated on paper but supported in every current browser and
  have no replacement yet.
