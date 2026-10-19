// Checks the Markdown note candidate in the mockup page: parsing, safe
// rendering, serialising editor HTML, round trips, HTML stripping and the
// counter. Run from the repository root:
//   node prototypes/wip/bulletin-markdown/test-markdown-note.cjs
// Uses the Playwright install the tools/ tests use (Edge, headless).
const assert = require('node:assert/strict');
const path = require('node:path');
const {pathToFileURL} = require('node:url');
const {chromium} = require('../../../.tmp-iqa-integration/node_modules/playwright');

const PAGE = pathToFileURL(path.join(__dirname, 'index.html')).href;

// [stored Markdown, rendered HTML]
const RENDER = [
  ['**bold** and _it_', '<p><strong>bold</strong> and <em>it</em></p>'],
  ['file_name_here stays', '<p>file_name_here stays</p>'],
  ['5 * 3 ** 2', '<p>5 * 3 ** 2</p>'],
  ['**a _b_ c**', '<p><strong>a <em>b</em> c</strong></p>'],
  ['[x](javascript:alert(1))', '<p>[x](javascript:alert(1))</p>'],
  ['[site](/staff) [mail](mailto:a@b.org)', '<p><a href="/staff">site</a> <a href="mailto:a@b.org">mail</a></p>'],
  ['<img src=x onerror=alert(1)>', '<p>&lt;img src=x onerror=alert(1)&gt;</p>'],
  ['line one\nline two\n\n- a\n- b\npara', '<p>line one<br>line two</p><ul><li>a</li><li>b</li></ul><p>para</p>'],
  ['\\*not\\* \\_em\\_', '<p>*not* _em_</p>'],
  ['**[link](https://x.org)**', '<p><strong><a href="https://x.org" target="_blank" rel="noopener noreferrer">link</a></strong></p>']
];

// [editor HTML, stored Markdown]
const SERIALIZE = [
  ['<p><b>bold</b> <i>it</i></p>', '**bold** _it_'],
  ['<p><b>bold </b>next</p>', '**bold** next'],
  ['<p>un<i>believ</i>able</p>', 'unbelievable'],
  ['<p>a * b [c] file_name _x</p>', 'a \\* b \\[c\\] file_name \\_x'],
  ['<p>- not a bullet</p>', '\\- not a bullet'],
  ['<ul><li>one</li><li>two<ul><li>nested</li></ul></li></ul>', '- one\n- two\n- nested'],
  ['<p>text <span style="font-weight:700">heavy</span> <u>under</u> <font color=red>red</font></p>', 'text **heavy** under red'],
  ['<p>pay &lt;b&gt;now&lt;/b&gt; &lt;script&gt;x&lt;/script&gt;</p>', 'pay now x'],
  ['first line<p>second</p><p><br></p><p>third<br>fourth</p>', 'first line\n\nsecond\n\nthird\nfourth'],
  ['<p><a href="javascript:x">bad</a> <a href="https://a.org/x (1)">ok</a></p>', 'bad [ok](https://a.org/x%20%281%29)'],
  ['<p><img src=x onerror="alert(1)">kept <script>alert(1)</script></p>', 'kept']
];

const ROUND_TRIP = [
  '**bold** _it_ [l](https://a.org)\nnext line\n\n- a **b**\n- c',
  'The **2027 fee schedule** is now.\n\n- x\n- y\n\nSee [fees](/staff/fees).',
  'a \\* b file_name \\[c\\]'
];

(async () => {
  const browser = await chromium.launch({channel: 'msedge', headless: true});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(PAGE);
    await page.waitForFunction(() => window.UnionSuiteMarkdown?.editorFor(document.getElementById('mdn-note')));

    const results = await page.evaluate(({RENDER, SERIALIZE, ROUND_TRIP}) => {
      const M = window.UnionSuiteMarkdown;
      const html = markdown => {
        const holder = document.createElement('div');
        holder.append(M.render(markdown));
        return holder.innerHTML;
      };
      const markdownOf = source => {
        const holder = document.createElement('div');
        holder.innerHTML = source;
        return M.serialize(holder);
      };
      return {
        render: RENDER.map(([markdown]) => html(markdown)),
        serialize: SERIALIZE.map(([source]) => markdownOf(source)),
        roundTrip: ROUND_TRIP.map(markdown => markdownOf(html(markdown)))
      };
    }, {RENDER, SERIALIZE, ROUND_TRIP});

    RENDER.forEach(([markdown, expected], i) => assert.equal(results.render[i], expected, `render ${JSON.stringify(markdown)}`));
    SERIALIZE.forEach(([source, expected], i) => assert.equal(results.serialize[i], expected, `serialize ${source}`));
    ROUND_TRIP.forEach((markdown, i) => assert.equal(results.roundTrip[i], markdown, `round trip ${JSON.stringify(markdown)}`));

    // Typing and the toolbar produce Markdown in the hidden textarea.
    const area = page.locator('.us-md-editor__area');
    await area.click();
    await page.keyboard.type('Closed ');
    await page.keyboard.press('Control+B');
    await page.keyboard.type('all week');
    await page.keyboard.press('Control+B');
    await page.keyboard.press('Enter');
    await page.getByRole('button', {name: 'Bullet list'}).click();
    await page.keyboard.type('Bring your pass');
    await page.keyboard.press('Enter');
    await page.keyboard.press('Enter');
    await page.keyboard.type('See ');
    await page.keyboard.press('Control+K');
    await page.keyboard.type('the notice');
    await page.keyboard.press('Tab');
    await page.keyboard.type('example.org/notice');
    await page.keyboard.press('Enter');
    assert.equal(await page.inputValue('#mdn-note'),
      'Closed **all week**\n\n- Bring your pass\n\nSee [the notice](https://example.org/notice)');

    // Underline is refused.
    await page.keyboard.press('Control+U');
    await page.keyboard.type(' plain');
    assert.ok((await page.inputValue('#mdn-note')).endsWith(') plain'));

    // Pasted HTML arrives as text without its tags.
    await page.evaluate(() => {
      const dt = new DataTransfer();
      dt.setData('text/html', '<h1>Big</h1>');
      dt.setData('text/plain', ' <b>pasted</b> <img src=x onerror=alert(1)>text');
      document.querySelector('.us-md-editor__area')
        .dispatchEvent(new ClipboardEvent('paste', {clipboardData: dt, bubbles: true, cancelable: true}));
    });
    assert.ok((await page.inputValue('#mdn-note')).endsWith(') plain pasted text'));

    // The counter: near the limit, then over it; Save is refused.
    const counter = page.locator('.us-md-editor__count');
    await page.evaluate(() => window.UnionSuiteMarkdown.editorFor(document.getElementById('mdn-note')).load('x'.repeat(2950)));
    assert.equal(await counter.textContent(), '2,950 / 3,000');
    await page.evaluate(() => window.UnionSuiteMarkdown.editorFor(document.getElementById('mdn-note')).load('**' + 'y'.repeat(3000) + '**'));
    assert.equal(await counter.textContent(), '4 characters over the 3,000 limit');
    await page.fill('#mdn-title', 'Too long');
    await page.click('button[type=submit]');
    assert.match(await page.textContent('#mdn-note-error'), /Shorten the note/);

    // A saved post renders on the bulletin from its stored text.
    await page.evaluate(() => window.UnionSuiteMarkdown.editorFor(document.getElementById('mdn-note')).load('Short **note**'));
    await page.click('button[type=submit]');
    assert.equal(await page.locator('#mdn-bulletin-list .us-markdown').first().innerHTML(), '<p>Short <strong>note</strong></p>');

    assert.deepEqual(errors, []);
    console.log(`Markdown note: ${RENDER.length + SERIALIZE.length + ROUND_TRIP.length} cases and the editor checks passed.`);
  } finally {
    await browser.close();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
