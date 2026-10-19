/* US-MARKDOWN-NOTE (candidate) — a Markdown note for bulletins and alerts.

   The stored value is plain text in a small Markdown subset:
     **bold**   _italic_   [link text](https://…)   - bullet
   A blank line starts a new paragraph; a single newline is a line break.
   Everything else is text. The editor strips HTML tags as it saves, and the
   renderer builds each element itself, so no stored value ever becomes markup.

   Editor: a textarea with data-us-markdown (or any textarea inside
   .us-markdown-fields) becomes a formatting toolbar, an editable area and a
   counter. The textarea stays in the form, hidden, holding the Markdown the
   area produces, so the form saves as before. Its maxlength is the limit.

   Display: an element with the us-markdown class whose text is the stored
   value (a Query Template's encoded {#query.Note}) is rendered in place.

   window.UnionSuiteMarkdown: parse(text) → blocks, render(text) → fragment,
   serialize(element) → text, stripHtml(text), enhance(textarea),
   renderAll(root). */
(function () {
  'use strict';
  if (window.UnionSuiteMarkdown) return;

  const ESCAPABLE = '\\*_[]()-+';
  const BULLET = /^[ \t]*[-*+][ \t]+(.*)$/;
  const BULLET_START = /^([ \t]*)([-+])(?=[ \t])/;
  const HTML_TAG = /<\/?[a-z][^<>]*>|<!--[\s\S]*?(?:-->|$)/gi;
  const DEFAULT_LIMIT = 3000;

  const isSpace = ch => !ch || /\s/.test(ch);
  const isWord = ch => !!ch && /[\p{L}\p{N}]/u.test(ch);
  const stripHtml = text => String(text ?? '').replace(HTML_TAG, '');

  // ── Links ──────────────────────────────────────────────────

  // The destinations a note may link to: a web address, an email address, a
  // path on this site or an anchor. Anything else is not a link.
  function safeHref(value) {
    const href = String(value ?? '').trim();
    if (/^https?:\/\/[^\s<>"]+$/i.test(href)) return href;
    if (/^mailto:[^\s<>"@]+@[^\s<>"]+$/i.test(href)) return href;
    if (/^\/(?!\/)[^\s<>"]*$/.test(href)) return href;
    if (/^#[^\s<>"]+$/.test(href)) return href;
    return '';
  }

  // Turns what someone typed into a destination: a bare domain gains https://
  // and an email address gains mailto:.
  function hrefFromInput(value) {
    const typed = String(value ?? '').trim();
    if (safeHref(typed)) return safeHref(typed);
    if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(typed)) return 'mailto:' + typed;
    if (/^(www\.)?[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(typed)) return 'https://' + typed;
    return '';
  }

  // Characters that would end the destination early are percent-encoded.
  const encodeHref = href => href.replace(/[()\s<>"]/g, ch => '%' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(2, '0'));

  // [label](destination) starting at source[start], or null.
  function matchLink(source, start) {
    let depth = 0;
    for (let i = start; i < source.length; i++) {
      const ch = source[i];
      if (ch === '\\') {
        i++;
        continue;
      }
      if (ch === '[') depth++;
      if (ch !== ']' || --depth > 0) continue;
      if (source[i + 1] !== '(') return null;
      const close = source.indexOf(')', i + 2);
      if (close < 0) return null;
      const label = source.slice(start + 1, i);
      const href = safeHref(source.slice(i + 2, close));
      return href && label.trim() ? {label, href, end: close + 1} : null;
    }
    return null;
  }

  // ── Parsing ────────────────────────────────────────────────

  // Inline nodes: {type: 'text', value}, {type: 'strong' | 'em', children} or
  // {type: 'a', href, children}. Links do not nest.
  function parseInline(source, allowLinks = true) {
    const tokens = [];
    let text = '';
    const flush = () => {
      if (text) tokens.push({type: 'text', value: text});
      text = '';
    };

    for (let i = 0; i < source.length; i++) {
      const ch = source[i];
      const before = source[i - 1];

      if (ch === '\\' && ESCAPABLE.includes(source[i + 1] ?? '\0')) {
        text += source[++i];
        continue;
      }
      if (ch === '[' && allowLinks) {
        const link = matchLink(source, i);
        if (link) {
          flush();
          tokens.push({type: 'a', href: link.href, children: parseInline(link.label, false)});
          i = link.end - 1;
          continue;
        }
      }
      if (ch === '*' && source[i + 1] === '*') {
        flush();
        const after = source[i + 2];
        tokens.push({type: 'delim', mark: 'strong', raw: '**', open: !isSpace(after), close: !isSpace(before)});
        i++;
        continue;
      }
      if (ch === '_') {
        // As CommonMark: an underscore inside a word (file_name) is text.
        flush();
        const after = source[i + 1];
        tokens.push({
          type: 'delim',
          mark: 'em',
          raw: '_',
          open: !isSpace(after) && !isWord(before),
          close: !isSpace(before) && !isWord(after)
        });
        continue;
      }
      text += ch;
    }
    flush();
    return pairDelimiters(tokens);
  }

  // Pairs each closing delimiter with the nearest open one of its kind.
  // Delimiters left unpaired are text.
  function pairDelimiters(tokens) {
    const stack = [{children: []}];
    const unwind = () => {
      const frame = stack.pop();
      stack.at(-1).children.push({type: 'text', value: frame.raw}, ...frame.children);
    };

    for (const token of tokens) {
      if (token.type !== 'delim') {
        stack.at(-1).children.push(token);
        continue;
      }
      const opener = token.close ? stack.findLastIndex(frame => frame.mark === token.mark) : -1;
      if (opener > 0) {
        while (stack.length - 1 > opener) unwind();
        const frame = stack.pop();
        stack.at(-1).children.push(frame.children.length
          ? {type: frame.mark, children: frame.children}
          : {type: 'text', value: frame.raw + token.raw});
      } else if (token.open) {
        stack.push({mark: token.mark, raw: token.raw, children: []});
      } else {
        stack.at(-1).children.push({type: 'text', value: token.raw});
      }
    }
    while (stack.length > 1) unwind();
    return mergeText(stack[0].children);
  }

  function mergeText(nodes) {
    return nodes.reduce((merged, node) => {
      const last = merged.at(-1);
      if (node.type === 'text' && last?.type === 'text') last.value += node.value;
      else merged.push(node.type === 'text' ? {...node} : node);
      return merged;
    }, []);
  }

  // Blocks: {type: 'p', children} or {type: 'ul', items: [children]}.
  function parse(source) {
    const blocks = [];
    let current = null;
    for (const line of String(source ?? '').replace(/\r\n?/g, '\n').split('\n')) {
      if (!line.trim()) {
        current = null;
        continue;
      }
      const bullet = line.match(BULLET);
      if (bullet) {
        if (current?.type !== 'ul') blocks.push(current = {type: 'ul', items: []});
        current.items.push(bullet[1]);
      } else {
        if (current?.type !== 'p') blocks.push(current = {type: 'p', lines: []});
        current.lines.push(line);
      }
    }
    return blocks.map(block => block.type === 'ul'
      ? {type: 'ul', items: block.items.map(item => parseInline(item))}
      : {type: 'p', children: parseInline(block.lines.join('\n'))});
  }

  // ── Rendering ──────────────────────────────────────────────

  function appendInline(parent, nodes) {
    const doc = parent.ownerDocument;
    for (const node of nodes) {
      if (node.type === 'text') {
        node.value.split('\n').forEach((part, index) => {
          if (index) parent.append(doc.createElement('br'));
          if (part) parent.append(part);
        });
        continue;
      }
      const element = doc.createElement(node.type);
      if (node.type === 'a') {
        element.setAttribute('href', node.href);
        if (/^https?:/i.test(node.href)) {
          element.target = '_blank';
          element.rel = 'noopener noreferrer';
        }
      }
      appendInline(element, node.children);
      parent.append(element);
    }
  }

  function render(source, doc = document) {
    const fragment = doc.createDocumentFragment();
    for (const block of parse(source)) {
      if (block.type === 'ul') {
        const list = doc.createElement('ul');
        for (const item of block.items) {
          const li = doc.createElement('li');
          appendInline(li, item);
          list.append(li);
        }
        fragment.append(list);
      } else {
        const paragraph = doc.createElement('p');
        appendInline(paragraph, block.children);
        fragment.append(paragraph);
      }
    }
    return fragment;
  }

  // The stored text inside a display element. A <br> counts as a newline, in
  // case the page turned the value's newlines into breaks.
  function sourceOf(element) {
    let text = '';
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) text += node.data;
      else if (node.nodeName === 'BR') text += '\n';
      else if (node.nodeType === Node.ELEMENT_NODE) text += sourceOf(node);
    }
    return text;
  }

  function renderAll(root = document) {
    const scope = root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_NODE ? root : document;
    const targets = [...scope.querySelectorAll('.us-markdown:not([data-us-markdown-rendered])')];
    if (scope.matches?.('.us-markdown:not([data-us-markdown-rendered])')) targets.unshift(scope);
    for (const element of targets) {
      const source = sourceOf(element).trim();
      element.replaceChildren(render(source, element.ownerDocument));
      element.setAttribute('data-us-markdown-rendered', '');
    }
  }

  // ── Serialising (editor → Markdown) ────────────────────────

  const BLOCK_TAGS = new Set([
    'ADDRESS', 'ARTICLE', 'ASIDE', 'BLOCKQUOTE', 'DD', 'DIV', 'DL', 'DT',
    'FIGURE', 'FOOTER', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HEADER', 'HR',
    'LI', 'MAIN', 'OL', 'P', 'PRE', 'SECTION', 'TABLE', 'TBODY', 'TD', 'TH',
    'THEAD', 'TR', 'UL'
  ]);
  const DROPPED_TAGS = new Set(['SCRIPT', 'STYLE', 'TEMPLATE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'SVG', 'IMG']);

  function markOf(element) {
    const tag = element.tagName;
    if (tag === 'B' || tag === 'STRONG') return 'strong';
    if (tag === 'I' || tag === 'EM') return 'em';
    const weight = element.style?.fontWeight;
    if (weight === 'bold' || Number(weight) >= 600) return 'strong';
    if (element.style?.fontStyle === 'italic') return 'em';
    return null;
  }

  function escapeText(text) {
    return text
      .replace(/ /g, ' ')
      .replace(/[\\*[\]]/g, '\\$&')
      .replace(/_/g, (ch, index, all) => (isWord(all[index - 1]) && isWord(all[index + 1]) ? ch : '\\_'));
  }

  // Wraps text in a mark, keeping its edge spaces outside: "**bold **" would
  // not read back as bold.
  function wrap(inner, symbol) {
    const [, lead, core, trail] = inner.match(/^(\s*)([\s\S]*?)(\s*)$/);
    return core ? lead + symbol + core + symbol + trail : inner;
  }

  // Each piece is {text}, or for italic also {inner, mark: 'em'} so a piece
  // inside a word can drop its underscores (they would not read back).
  function inlinePiece(node, marks) {
    if (node.nodeType === Node.TEXT_NODE) return {text: escapeText(node.data)};
    if (node.nodeType !== Node.ELEMENT_NODE || DROPPED_TAGS.has(node.tagName)) return {text: ''};
    if (node.tagName === 'BR') return {text: '\n'};

    const mark = markOf(node);
    const nested = mark && !marks.includes(mark) ? [...marks, mark] : marks;
    const inner = inlineText(node.childNodes, nested);

    if (node.tagName === 'A') {
      const href = safeHref(encodeHref((node.getAttribute('href') || '').trim()));
      return {text: href && inner.trim() ? `[${inner.replace(/\n/g, ' ')}](${href})` : inner};
    }
    if (mark === 'strong' && !marks.includes('strong')) return {text: wrap(inner, '**')};
    if (mark === 'em' && !marks.includes('em')) return {text: wrap(inner, '_'), inner, mark: 'em'};
    return {text: inner};
  }

  function inlineText(nodes, marks = []) {
    const pieces = [...nodes].map(node => inlinePiece(node, marks));
    return pieces.map((piece, index) => {
      if (piece.mark !== 'em') return piece.text;
      const before = pieces[index - 1]?.text.slice(-1);
      const after = pieces[index + 1]?.text[0];
      return isWord(before) || isWord(after) ? piece.inner : piece.text;
    }).join('');
  }

  // Splits a container into paragraphs and list items. Inline content that
  // sits between blocks (the first line typed, before any Enter) is its own
  // paragraph. Nested lists flatten into the one list.
  function collectBlocks(container, inList, blocks) {
    let run = [];
    const flush = () => {
      if (run.length) blocks.push({type: inList ? 'li' : 'p', text: inlineText(run)});
      run = [];
    };
    for (const node of container.childNodes) {
      if (node.nodeType === Node.ELEMENT_NODE && BLOCK_TAGS.has(node.tagName)) {
        flush();
        collectBlocks(node, inList || /^(UL|OL|LI)$/.test(node.tagName), blocks);
      } else {
        run.push(node);
      }
    }
    flush();
  }

  function serialize(element) {
    const blocks = [];
    collectBlocks(element, false, blocks);

    let markdown = '';
    let previous = null;
    for (const block of blocks) {
      let text = block.text.replace(/^\n+|\n+$/g, '');
      if (!text.trim()) continue;
      if (block.type === 'li') {
        text = '- ' + text.replace(/\s*\n\s*/g, ' ').trim();
      } else {
        // A line that starts like a bullet stays a line of text.
        text = text.split('\n').map(line => line.replace(BULLET_START, '$1\\$2')).join('\n');
      }
      if (previous) markdown += previous === 'li' && block.type === 'li' ? '\n' : '\n\n';
      markdown += text;
      previous = block.type;
    }
    return stripHtml(markdown).replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
  }

  // ── Editor ─────────────────────────────────────────────────

  const SELECTOR = 'textarea[data-us-markdown], .us-markdown-fields textarea';
  const editors = new WeakMap();
  let serial = 0;

  const TOOLS = [
    {command: 'bold', label: 'Bold', keys: 'Ctrl+B', icon: 'ti-bold'},
    {command: 'italic', label: 'Italic', keys: 'Ctrl+I', icon: 'ti-italic'},
    {command: 'link', label: 'Link', keys: 'Ctrl+K', icon: 'ti-link'},
    {command: 'insertUnorderedList', label: 'Bullet list', icon: 'ti-list'}
  ];

  // Input types the area refuses: underline and the rest have no Markdown.
  const REFUSED_INPUT = /^format(?!Bold$|Italic$)|^insertOrderedList$|^insertHorizontalRule$/;

  const numberText = value => value.toLocaleString('en-AU');

  function fold(element, open) {
    return window.UnionSuiteRecordCards?.fold
      ? window.UnionSuiteRecordCards.fold(element, open)
      : Promise.resolve(element.hidden = !open);
  }

  function enhance(textarea) {
    if (!(textarea instanceof HTMLTextAreaElement) || editors.has(textarea)) return editors.get(textarea);

    const id = 'us-md-' + ++serial;
    const limit = textarea.maxLength > 0 ? textarea.maxLength : DEFAULT_LIMIT;
    const label = textarea.id ? document.querySelector(`label[for="${CSS.escape(textarea.id)}"]`) : null;
    if (label && !label.id) label.id = id + '-label';

    const editor = document.createElement('div');
    editor.className = 'us-md-editor';
    editor.innerHTML = `
      <div class="us-md-editor__toolbar" role="toolbar" aria-label="Formatting" aria-controls="${id}-area">
        ${TOOLS.map((tool, index) => `
          <button type="button" class="us-md-editor__tool" data-command="${tool.command}"
            aria-label="${tool.label}" aria-pressed="false" tabindex="${index ? -1 : 0}"
            title="${tool.label}${tool.keys ? ' (' + tool.keys + ')' : ''}">
            <i class="ti ${tool.icon}" aria-hidden="true"></i>
          </button>`).join('')}
      </div>
      <div class="us-md-editor__link" hidden>
        <div class="us-md-editor__link-fields">
          <label class="us-md-editor__link-field">
            <span>Link text</span>
            <input type="text" data-link="text" autocomplete="off">
          </label>
          <label class="us-md-editor__link-field">
            <span>Web address</span>
            <input type="text" data-link="href" inputmode="url" autocomplete="off" placeholder="https://" aria-describedby="${id}-link-error">
          </label>
        </div>
        <p class="us-md-editor__link-error" id="${id}-link-error" role="alert"></p>
        <div class="us-md-editor__link-actions">
          <button type="button" class="TextButton PrimaryButton SmallButton" data-link="apply">Add link</button>
          <button type="button" class="TextButton us-outline-button SmallButton" data-link="remove" hidden>Remove link</button>
          <button type="button" class="TextButton us-outline-button SmallButton" data-link="cancel">Cancel</button>
        </div>
      </div>
      <div class="us-md-editor__area" id="${id}-area" contenteditable="true" role="textbox"
        aria-multiline="true" spellcheck="true" aria-describedby="${id}-count"></div>
      <div class="us-md-editor__footer">
        <span class="us-md-editor__hint">Shift+Enter starts a new line in the same paragraph.</span>
        <span class="us-md-editor__count" id="${id}-count"></span>
      </div>
      <span class="sr-only" aria-live="polite" data-announce></span>`;

    const area = editor.querySelector('.us-md-editor__area');
    const toolbar = editor.querySelector('.us-md-editor__toolbar');
    const tools = [...toolbar.querySelectorAll('.us-md-editor__tool')];
    const linkPanel = editor.querySelector('.us-md-editor__link');
    const linkText = linkPanel.querySelector('[data-link="text"]');
    const linkHref = linkPanel.querySelector('[data-link="href"]');
    const linkError = linkPanel.querySelector('.us-md-editor__link-error');
    const linkRemove = linkPanel.querySelector('[data-link="remove"]');
    const count = editor.querySelector('.us-md-editor__count');
    const announcer = editor.querySelector('[data-announce]');

    if (label) {
      area.setAttribute('aria-labelledby', label.id);
      label.addEventListener('click', () => area.focus());
    }
    if (textarea.required) area.setAttribute('aria-required', 'true');
    area.dataset.placeholder = textarea.placeholder || '';

    textarea.hidden = true;
    textarea.after(editor);
    document.execCommand('defaultParagraphSeparator', false, 'p');

    let savedRange = null;
    let editingLink = null;
    let lastState = '';

    const state = {
      get value() { return textarea.value; },
      get length() { return textarea.value.length; },
      limit,
      get over() { return textarea.value.length > limit; },
      focus: () => area.focus(),
      load
    };

    function load(markdown) {
      textarea.value = serialize(sanitizedArea(render(stripHtml(markdown))));
      area.replaceChildren(render(textarea.value));
      // Start in a paragraph, so the first line spaces as it will display.
      if (!area.firstChild) area.innerHTML = '<p><br></p>';
      refresh(false);
    }

    // A detached copy used to normalise a fragment through the serialiser.
    function sanitizedArea(fragment) {
      const holder = document.createElement('div');
      holder.append(fragment);
      return holder;
    }

    function announce(message) {
      announcer.textContent = '';
      requestAnimationFrame(() => announcer.textContent = message);
    }

    function refresh(notify = true) {
      const before = textarea.value;
      textarea.value = serialize(area);
      const length = textarea.value.length;
      const left = limit - length;

      editor.classList.toggle('is-empty', !area.textContent.trim() && !area.querySelector('li'));
      editor.classList.toggle('is-over', left < 0);
      editor.classList.toggle('is-near', left >= 0 && left <= 100);
      area.setAttribute('aria-invalid', left < 0 ? 'true' : 'false');
      count.textContent = left < 0
        ? `${numberText(-left)} characters over the ${numberText(limit)} limit`
        : `${numberText(length)} / ${numberText(limit)}`;

      // Speak only when the state changes, not on every keystroke.
      const stateNow = left < 0 ? 'over' : left <= 100 ? 'near' : 'ok';
      if (notify && stateNow !== lastState && stateNow !== 'ok') {
        announce(stateNow === 'over'
          ? `Note is over the ${numberText(limit)} character limit.`
          : `${numberText(left)} characters left.`);
      }
      lastState = stateNow;

      if (notify && textarea.value !== before) {
        textarea.dispatchEvent(new Event('input', {bubbles: true}));
        textarea.dispatchEvent(new Event('change', {bubbles: true}));
      }
    }

    function refreshTools() {
      const selection = document.getSelection();
      if (!selection.rangeCount || !area.contains(selection.anchorNode)) return;
      for (const tool of tools) {
        const command = tool.dataset.command;
        const pressed = command === 'link'
          ? !!anchorIn(selection.anchorNode)
          : document.queryCommandState(command);
        tool.setAttribute('aria-pressed', String(pressed));
      }
    }

    function anchorIn(node) {
      const element = node?.nodeType === Node.ELEMENT_NODE ? node : node?.parentElement;
      const anchor = element?.closest('a');
      return anchor && area.contains(anchor) ? anchor : null;
    }

    function rememberSelection() {
      const selection = document.getSelection();
      savedRange = selection.rangeCount && area.contains(selection.anchorNode)
        ? selection.getRangeAt(0).cloneRange()
        : null;
    }

    function restoreSelection() {
      area.focus();
      const selection = document.getSelection();
      selection.removeAllRanges();
      if (savedRange) {
        selection.addRange(savedRange);
      } else {
        const end = document.createRange();
        end.selectNodeContents(area);
        end.collapse(false);
        selection.addRange(end);
      }
    }

    function run(command) {
      if (command === 'link') return openLink();
      area.focus();
      document.execCommand('styleWithCSS', false, false);
      document.execCommand(command, false, null);
      refresh();
      refreshTools();
    }

    // ── Link panel ──

    function openLink() {
      rememberSelection();
      const selection = document.getSelection();
      editingLink = anchorIn(selection.anchorNode);
      if (editingLink) {
        linkText.value = editingLink.textContent;
        linkHref.value = editingLink.getAttribute('href') || '';
      } else {
        linkText.value = selection.rangeCount && area.contains(selection.anchorNode) ? selection.toString().trim() : '';
        linkHref.value = '';
      }
      linkRemove.hidden = !editingLink;
      linkPanel.querySelector('[data-link="apply"]').textContent = editingLink ? 'Update link' : 'Add link';
      showLinkError('');
      fold(linkPanel, true);
      (linkText.value ? linkHref : linkText).focus();
    }

    function closeLink(returnFocus = true) {
      fold(linkPanel, false);
      showLinkError('');
      if (returnFocus) restoreSelection();
      editingLink = null;
    }

    function showLinkError(message) {
      linkError.textContent = message;
      linkHref.setAttribute('aria-invalid', message ? 'true' : 'false');
    }

    function applyLink() {
      const href = hrefFromInput(linkHref.value);
      if (!href) {
        showLinkError('Enter a web address (https://…), a page on this site (/…) or an email address.');
        linkHref.focus();
        return;
      }
      const text = stripHtml(linkText.value).trim() || href.replace(/^mailto:/i, '');
      const anchor = editingLink;
      closeLink();
      if (anchor) {
        anchor.setAttribute('href', href);
        anchor.textContent = text;
      } else {
        const escape = value => value.replace(/[&<>"]/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'}[ch]));
        document.execCommand('insertHTML', false, `<a href="${escape(href)}">${escape(text)}</a>`);
        // insertHTML copies the surrounding colours onto the link as a style.
        area.querySelectorAll('[style]').forEach(element => element.removeAttribute('style'));
      }
      refresh();
      refreshTools();
    }

    function removeLink() {
      const anchor = editingLink;
      closeLink();
      anchor?.replaceWith(...anchor.childNodes);
      refresh();
      refreshTools();
    }

    linkPanel.addEventListener('click', event => {
      const action = event.target.closest('button')?.dataset.link;
      if (action === 'apply') applyLink();
      if (action === 'remove') removeLink();
      if (action === 'cancel') closeLink();
    });
    linkPanel.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input')) {
        event.preventDefault();
        applyLink();
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeLink();
      }
    });

    // ── Toolbar ──

    // Keep the area's selection while a tool is clicked.
    toolbar.addEventListener('mousedown', event => {
      if (event.target.closest('.us-md-editor__tool')) event.preventDefault();
    });
    toolbar.addEventListener('click', event => {
      const tool = event.target.closest('.us-md-editor__tool');
      if (tool) run(tool.dataset.command);
    });
    // One tab stop; the arrow keys move between tools.
    toolbar.addEventListener('keydown', event => {
      const index = tools.indexOf(document.activeElement);
      if (index < 0) return;
      const next = {
        ArrowRight: (index + 1) % tools.length,
        ArrowLeft: (index - 1 + tools.length) % tools.length,
        Home: 0,
        End: tools.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      tools.forEach((tool, i) => tool.tabIndex = i === next ? 0 : -1);
      tools[next].focus();
    });

    // ── Area ──

    area.addEventListener('beforeinput', event => {
      if (REFUSED_INPUT.test(event.inputType)) event.preventDefault();
    });
    area.addEventListener('keydown', event => {
      const key = event.key.toLowerCase();
      if ((event.ctrlKey || event.metaKey) && !event.altKey) {
        if (key === 'u') event.preventDefault();
        if (key === 'k') {
          event.preventDefault();
          openLink();
        }
      }
    });
    // Pasted and dropped content arrives as plain text, without its tags.
    area.addEventListener('paste', event => {
      event.preventDefault();
      const text = stripHtml(event.clipboardData?.getData('text/plain') || '');
      if (text) document.execCommand('insertText', false, text);
    });
    area.addEventListener('drop', event => {
      event.preventDefault();
      const text = stripHtml(event.dataTransfer?.getData('text/plain') || '');
      const range = document.caretRangeFromPoint?.(event.clientX, event.clientY);
      if (!text || !range) return;
      const selection = document.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, text);
    });
    // Links are edited, not followed, while writing.
    area.addEventListener('click', event => {
      if (event.target.closest('a')) event.preventDefault();
    });
    area.addEventListener('input', () => refresh());
    // Tags typed as text are gone from the stored value; show that.
    area.addEventListener('blur', () => {
      if (stripHtml(area.textContent) !== area.textContent) {
        area.replaceChildren(render(textarea.value));
        refresh(false);
        announce('HTML removed. Use the toolbar for formatting.');
      }
    });
    document.addEventListener('selectionchange', refreshTools);

    load(textarea.value);
    editors.set(textarea, state);
    textarea.dispatchEvent(new CustomEvent('us-markdown:ready', {bubbles: true, detail: state}));
    return state;
  }

  function enhanceAll(root = document) {
    const scope = root.querySelectorAll ? root : document;
    scope.querySelectorAll(SELECTOR).forEach(enhance);
    if (scope.matches?.(SELECTOR)) enhance(scope);
  }

  // Query Templates page and refresh in place, and panels open later.
  function watch() {
    let queued = false;
    new MutationObserver(() => {
      if (queued) return;
      queued = true;
      queueMicrotask(() => {
        queued = false;
        renderAll(document);
        enhanceAll(document);
      });
    }).observe(document.body, {childList: true, subtree: true});
  }

  function start() {
    renderAll(document);
    enhanceAll(document);
    watch();
  }

  window.UnionSuiteMarkdown = {
    parse,
    render,
    serialize,
    stripHtml,
    safeHref,
    hrefFromInput,
    renderAll,
    enhance,
    editorFor: textarea => editors.get(textarea)
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once: true});
  else start();
})();
