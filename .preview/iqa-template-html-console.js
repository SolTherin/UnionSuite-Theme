/* IQA Template HTML editor: console test.
   Paste into DevTools on the IQA Template tab (Design.aspx) with Enhance on.
   Runs only the Template module beside the deployed IQA-Enhancements.js.
   Pasting again replaces the previous test copy. Reload the page to remove it. */
(() => {
  window.__iqaTemplateHtmlTest?.teardown();
  function createTemplateHtmlEditor() {
    const VOID = new Set('area base br col embed hr img input keygen link meta param source track wbr'.split(' '));
    const INLINE = new Set(('a abbr acronym b bdi bdo big br button cite code data dfn em font i img input kbd label '
      + 'mark meter output progress q ruby s samp select small span strike strong sub sup time tt u var wbr').split(' '));
    // Content inside these is kept exactly as written.
    const RAW = new Set(['script', 'style', 'pre', 'textarea']);
    // HTML lets these be left open, so an open one is not reported.
    const OPTIONAL_CLOSE = new Set('body caption colgroup dd dt head html li optgroup option p rp rt tbody td tfoot th thead tr'.split(' '));
    const TAG = /<(\/?)([A-Za-z!?][^\s\/>]*)/y;
    const ATTRIBUTE_PART = /(\s+)|("[^"]*"?|'[^']*'?)|(=)|([^\s"'=<>\/]+)|([\s\S])/y;

    /* ---- highlighting ---------------------------------------------------- */
    // Placeholders are marked wherever they appear, including inside attribute
    // values such as href="mailto:{#query.PreferredEmail}".
    function splitText(text, type, out) {
      const pattern = type === 'value'
        ? /\{#[\w.]*\}?/g
        : /\{#[\w.]*\}?|&(?:#\d+|#x[\da-f]+|[a-z][a-z\d]*);/gi;
      let at = 0;
      for (const match of text.matchAll(pattern)) {
        if (match.index > at) out.push({ text: text.slice(at, match.index), type });
        out.push({ text: match[0], type: match[0][0] === '&' ? 'entity' : 'placeholder' });
        at = match.index + match[0].length;
      }
      if (at < text.length) out.push({ text: text.slice(at), type });
    }

    function tokens(src) {
      const out = [];
      const lower = src.toLowerCase();
      let i = 0;
      while (i < src.length) {
        if (src.startsWith('<!--', i)) {
          const end = src.indexOf('-->', i + 4);
          const next = end < 0 ? src.length : end + 3;
          out.push({ text: src.slice(i, next), type: 'comment' });
          i = next;
          continue;
        }
        TAG.lastIndex = i;
        const tag = TAG.exec(src);
        if (tag) {
          out.push({ text: '<' + tag[1], type: 'punct' }, { text: tag[2], type: 'tag' });
          i = TAG.lastIndex;
          let afterEquals = false;
          while (i < src.length && src[i] !== '>' && !src.startsWith('/>', i)) {
            ATTRIBUTE_PART.lastIndex = i;
            const [part, space, quoted, equals, word] = ATTRIBUTE_PART.exec(src);
            if (space) out.push({ text: part, type: '' });
            else if (quoted) { splitText(part, 'value', out); afterEquals = false; }
            else if (equals) { out.push({ text: part, type: 'punct' }); afterEquals = true; }
            else if (word) { out.push({ text: part, type: afterEquals ? 'value' : 'attr' }); afterEquals = false; }
            else out.push({ text: part, type: 'punct' });
            i += part.length;
          }
          if (src.startsWith('/>', i)) { out.push({ text: '/>', type: 'punct' }); i += 2; }
          else if (src[i] === '>') { out.push({ text: '>', type: 'punct' }); i++; }
          const name = tag[2].toLowerCase();
          if (!tag[1] && (name === 'script' || name === 'style')) {
            const close = lower.indexOf('</' + name, i);
            const stop = close < 0 ? src.length : close;
            if (stop > i) out.push({ text: src.slice(i, stop), type: '' });
            i = stop;
          }
          continue;
        }
        const next = src.indexOf('<', i + 1);
        const stop = next < 0 ? src.length : next;
        splitText(src.slice(i, stop), '', out);
        i = stop;
      }
      return out;
    }

    /* ---- formatting ------------------------------------------------------ */
    /* Re-indents without re-parsing into a DOM: tags and attributes stay as
       written (whitespace between attributes aside), no missing end tags are
       added and nothing is reordered. Only whitespace between elements changes,
       which does not alter how the template renders outside RAW elements. */
    function tagEnd(src, i) {
      let quote = '';
      for (let j = i + 1; j < src.length; j++) {
        const c = src[j];
        if (quote) { if (c === quote) quote = ''; }
        else if (c === '"' || c === "'") quote = c;
        else if (c === '>') return j + 1;
      }
      return src.length;
    }

    function normaliseTag(text) {
      let out = '', quote = '', space = false;
      for (const c of text) {
        if (quote) { out += c; if (c === quote) quote = ''; continue; }
        if (/\s/.test(c)) { space = true; continue; }
        if (space && c !== '>') out += ' ';
        space = false;
        out += c;
        if (c === '"' || c === "'") quote = c;
      }
      return out;
    }

    function parts(src) {
      const out = [];
      const lower = src.toLowerCase();
      let i = 0;
      while (i < src.length) {
        if (src.startsWith('<!--', i)) {
          const end = src.indexOf('-->', i + 4);
          const next = end < 0 ? src.length : end + 3;
          out.push({ kind: 'comment', text: src.slice(i, next), start: i, end: next });
          i = next;
          continue;
        }
        TAG.lastIndex = i;
        const tag = TAG.exec(src);
        if (tag) {
          const end = tagEnd(src, i);
          const at = { start: i, end };
          const text = normaliseTag(src.slice(i, end));
          const name = tag[2].toLowerCase();
          if (tag[1]) out.push({ kind: 'close', name, text, ...at });
          else if (/^[!?]/.test(name)) out.push({ kind: 'decl', name, text, ...at });
          else if (VOID.has(name) || text.endsWith('/>')) out.push({ kind: 'void', name, text, ...at });
          else {
            out.push({ kind: 'open', name, text, ...at });
            if (RAW.has(name)) {
              const close = lower.indexOf('</' + name, end);
              const stop = close < 0 ? src.length : close;
              out.push({ kind: 'raw', text: src.slice(end, stop), start: end, end: stop });
              i = stop;
              continue;
            }
          }
          i = end;
          continue;
        }
        const next = src.indexOf('<', i + 1);
        const stop = next < 0 ? src.length : next;
        out.push({ kind: 'text', text: src.slice(i, stop), start: i, end: stop });
        i = stop;
      }
      return out;
    }

    // An end tag closes the nearest open element of the same name, as a browser
    // would. One with no open match is kept where it was.
    function tree(list) {
      const root = { kind: 'root', children: [] };
      const stack = [root];
      for (const part of list) {
        const parent = stack[stack.length - 1];
        if (part.kind === 'open') {
          const node = { ...part, children: [], close: null };
          parent.children.push(node);
          stack.push(node);
        } else if (part.kind === 'close') {
          let depth = stack.length - 1;
          while (depth > 0 && stack[depth].name !== part.name) depth--;
          if (depth > 0) { stack[depth].close = part.text; stack.length = depth; }
          else parent.children.push({ kind: 'stray', name: part.name, text: part.text });
        } else parent.children.push(part);
      }
      return root;
    }

    function isInline(node) {
      if (node.kind === 'text' || node.kind === 'comment') return true;
      // An unmatched block end tag such as a spare </div> gets its own line,
      // where it is easy to see, instead of joining the text around it.
      if (node.kind === 'void' || node.kind === 'stray') return INLINE.has(node.name);
      return node.kind === 'open' && INLINE.has(node.name) && !RAW.has(node.name) && node.children.every(isInline);
    }

    function inlineText(node) {
      if (node.kind === 'text') return node.text.replace(/\s+/g, ' ');
      if (node.kind === 'open') return node.text + node.children.map(inlineText).join('') + (node.close || '');
      return node.text;
    }

    function renderList(nodes, depth, settings, lines) {
      let run = '';
      const flush = () => {
        const text = run.trim();
        if (text) lines.push(settings.indent.repeat(depth) + text);
        run = '';
      };
      for (const node of nodes) {
        if (isInline(node)) { run += inlineText(node); continue; }
        flush();
        renderBlock(node, depth, settings, lines);
      }
      flush();
    }

    function renderBlock(node, depth, settings, lines) {
      const indent = settings.indent.repeat(depth);
      if (node.kind !== 'open') { lines.push(indent + node.text); return; }
      if (RAW.has(node.name)) {
        lines.push(indent + node.text + node.children.map(child => child.text).join('') + (node.close || ''));
        return;
      }
      if (node.children.every(isInline)) {
        const inner = node.children.map(inlineText).join('').trim();
        const line = indent + node.text + inner + (node.close || '');
        if (!inner || line.length <= settings.width) { lines.push(line); return; }
      }
      lines.push(indent + node.text);
      renderList(node.children, depth + 1, settings, lines);
      if (node.close) lines.push(indent + node.close);
    }

    function format(src, options = {}) {
      const settings = { indent: '  ', width: 120, ...options };
      const lines = [];
      renderList(tree(parts(src)).children, 0, settings, lines);
      return lines.join('\n');
    }

    /* ---- tag pairs ------------------------------------------------------- */
    /* Pairs each end tag with the nearest open element of the same name, as a
       browser does, and reports what that leaves unpaired: an end tag with
       nothing to close, or an element that is never closed (other than one
       whose end tag HTML allows to be left out). Void elements have no pair.
       Offsets are into the source; pair is the index of the partner or -1. */
    function tagPairs(src) {
      const tags = [];
      const stack = [];
      const unclosed = index => { if (!OPTIONAL_CLOSE.has(tags[index].name)) tags[index].problem = 'unclosed'; };
      for (const part of parts(src)) {
        if (part.kind !== 'open' && part.kind !== 'close') continue;
        const index = tags.push({ kind: part.kind, name: part.name, start: part.start, end: part.end, pair: -1, problem: '' }) - 1;
        if (part.kind === 'open') { stack.push(index); continue; }
        let depth = stack.length - 1;
        while (depth >= 0 && tags[stack[depth]].name !== part.name) depth--;
        if (depth < 0) { tags[index].problem = 'unopened'; continue; }
        stack.splice(depth + 1).forEach(unclosed);
        const open = stack.pop();
        tags[open].pair = index;
        tags[index].pair = open;
      }
      stack.forEach(unclosed);
      return tags;
    }

    const lineOf = (src, index) => src.slice(0, index).split('\n').length;

    function describeProblem(src, tag) {
      const line = lineOf(src, tag.start);
      return tag.problem === 'unclosed'
        ? '<' + tag.name + '> on line ' + line + ' is not closed'
        : '</' + tag.name + '> on line ' + line + ' has no opening tag';
    }

    /* ---- data source fields ---------------------------------------------- */
    function fieldsFrom(items) {
      if (!Array.isArray(items)) return [];
      return items
        .filter(item => Array.isArray(item) && typeof item[0] === 'string' && /^\{#[\w.]+\}$/.test(item[0]))
        .map(([insert, label]) => {
          const path = insert.slice(2, -1);
          return { insert, label: typeof label === 'string' && label ? label : path, name: path.replace(/^query\./i, '') };
        });
    }

    function findTool(value) {
      if (Array.isArray(value)) {
        for (const entry of value) { const found = findTool(entry); if (found) return found; }
      } else if (value && typeof value === 'object') {
        if (value.name === 'QueryTemplateInsertField' && Array.isArray(value.items)) return value.items;
        return findTool(value.tools);
      }
      return null;
    }

    // Reads the tool's items from the RadEditor $create(...) configuration.
    function itemsFromScript(text) {
      const at = text.indexOf('"name":"QueryTemplateInsertField"');
      if (at < 0) return null;
      const key = text.indexOf('"items":', at);
      const nextTool = text.indexOf('"name":', at + 1);
      if (key < 0 || (nextTool >= 0 && nextTool < key)) return null;
      const start = text.indexOf('[', key);
      let depth = 0, quoted = false;
      for (let j = start; j >= 0 && j < text.length; j++) {
        const c = text[j];
        if (quoted) { if (c === '\\') j++; else if (c === '"') quoted = false; continue; }
        if (c === '"') quoted = true;
        else if (c === '[') depth++;
        else if (c === ']' && --depth === 0) {
          try { return JSON.parse(text.slice(start, j + 1)); } catch (_) { return null; }
        }
      }
      return null;
    }

    function rank(fields, search) {
      const needle = search.toLowerCase();
      return fields
        .filter(field => field.name.toLowerCase().includes(needle))
        .sort((a, b) => b.name.toLowerCase().startsWith(needle) - a.name.toLowerCase().startsWith(needle));
    }

    // Suggestions while typing: only after "{#", so ordinary HTML stays quiet.
    function suggest(before, fields) {
      const match = /\{#([\w.]*)$/.exec(before);
      if (!match) return null;
      const typed = match[1];
      const search = /^query\./i.test(typed) ? typed.slice(6) : 'query.'.startsWith(typed.toLowerCase()) ? '' : typed;
      return { start: match.index, options: rank(fields, search) };
    }

    // Ctrl+Space: the same list, or every field matching the word at the caret.
    function listAt(before, fields) {
      const placeholder = suggest(before, fields);
      if (placeholder) return placeholder;
      const word = /[\w]*$/.exec(before)[0];
      return { start: before.length - word.length, options: rank(fields, word) };
    }

    // Case is ignored, so only a missing column is reported, never a spelling
    // the query may still resolve.
    function unknownPlaceholders(src, fields) {
      if (!fields.length) return [];
      const known = new Set(fields.map(field => field.insert.toLowerCase()));
      const unknown = new Set();
      for (const match of src.matchAll(/\{#query\.[\w.]*\}/gi)) {
        if (!known.has(match[0].toLowerCase())) unknown.add(match[0]);
      }
      return [...unknown];
    }

    if (typeof document === 'undefined') {
      return { tokens, format, tagPairs, describeProblem, suggest, listAt, unknownPlaceholders, fieldsFrom, findTool, itemsFromScript };
    }

    /* ---- editor ---------------------------------------------------------- */
    const FIELD_ICON = '<svg viewBox="4 0 10 18"><rect x="5" y="1.5" width="8" height="15" fill="none" stroke="currentColor"/>'
      + '<rect x="5.5" y="2" width="7" height="3.5" fill="#9aa2ac"/><path d="M5 5.5h8M5 9.17h8M5 12.83h8" fill="none" stroke="currentColor"/></svg>';
    const editors = new Map();
    const fieldCache = new WeakMap();

    function readFields(editorEl) {
      if (fieldCache.has(editorEl)) return fieldCache.get(editorEl);
      let items = null;
      try {
        const editor = window.$find?.(editorEl.id);
        items = findTool(editor?.get_toolJSON?.() || editor?._toolJSON);
      } catch (_) { /* fall back to the page script */ }
      if (!items) {
        for (const script of document.scripts) {
          if (script.src || !script.text.includes('QueryTemplateInsertField')) continue;
          items = itemsFromScript(script.text);
          if (items) break;
        }
      }
      const fields = fieldsFrom(items);
      // Cache only a successful read so a late editor configuration is retried.
      if (items) fieldCache.set(editorEl, fields);
      return fields;
    }

    function injectCss() {
      if (document.getElementById('iqaTemplateHtmlCss')) return;
      const style = document.createElement('style');
      style.id = 'iqaTemplateHtmlCss';
      style.textContent = `
        .iqa-html-content {
          position: relative;
          --iqa-html-text: var(--text-strong, #172b4d);
          --iqa-html-punct: #6b7785;
          --iqa-html-tag: #7141ac;
          --iqa-html-attr: #066c91;
          --iqa-html-value: #9c3425;
          --iqa-html-comment: #587747;
          --iqa-html-placeholder: #005a9c;
          --iqa-html-placeholder-bg: rgba(0, 90, 156, .09);
          --iqa-html-error: #a12622;
          --iqa-html-error-bg: rgba(161, 38, 34, .08);
          --iqa-html-pair-bg: rgba(113, 65, 172, .16);
        }

        body.iqa-enhanced .iqa-html-content > textarea.iqa-html-input,
        .iqa-html-highlight {
          font: 13px/1.6 Consolas, "Courier New", monospace !important;
          letter-spacing: normal !important;
          tab-size: 2;
          white-space: pre-wrap !important;
          overflow-wrap: break-word;
          word-break: normal;
          padding: 8px 10px !important;
          margin: 0 !important;
          border: 0 !important;
          box-sizing: border-box !important;
          text-align: left;
        }

        body.iqa-enhanced .iqa-html-content > textarea.iqa-html-input {
          position: relative;
          z-index: 1;
          background: transparent !important;
          color: transparent !important;
          -webkit-text-fill-color: transparent;
          caret-color: var(--iqa-html-text);
        }

        body.iqa-enhanced .iqa-html-content > textarea.iqa-html-input::selection {
          background: rgba(0, 111, 148, .25);
        }

        .iqa-html-highlight {
          position: absolute;
          z-index: 0;
          pointer-events: none;
          overflow: hidden;
          background: var(--bg-surface, #fff);
          color: var(--iqa-html-text);
        }

        .iqa-html-highlight[hidden],
        .iqa-html-tools[hidden] {
          display: none !important;
        }

        .iqa-html-punct { color: var(--iqa-html-punct); }
        .iqa-html-tag { color: var(--iqa-html-tag); }
        .iqa-html-attr { color: var(--iqa-html-attr); }
        .iqa-html-value { color: var(--iqa-html-value); }
        .iqa-html-comment { color: var(--iqa-html-comment); }
        .iqa-html-entity { color: var(--iqa-html-attr); }

        .iqa-html-placeholder {
          color: var(--iqa-html-placeholder);
          background: var(--iqa-html-placeholder-bg);
          border-radius: 2px;
        }

        /* Background only: a border or padding would move the text out of
           line with the textarea above it. */
        .iqa-html-tag.is-paired {
          background: var(--iqa-html-pair-bg);
          border-radius: 2px;
        }

        .iqa-html-tag.is-unmatched {
          color: var(--iqa-html-error);
          background: var(--iqa-html-error-bg);
          text-decoration: underline wavy var(--iqa-html-error);
          text-decoration-skip-ink: none;
        }

        .iqa-html-placeholder.is-unknown {
          color: var(--iqa-html-error);
          text-decoration: underline wavy var(--iqa-html-error);
          text-decoration-skip-ink: none;
        }

        .iqa-html-tools {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--space-2, 8px) var(--space-3, 12px);
          margin: var(--space-2, 8px) 0 0;
        }

        .iqa-html-tools > button {
          margin: 0;
        }

        .iqa-html-status {
          color: var(--text-muted, #545962);
          font-size: var(--fs-xs, 12px);
        }

        .iqa-html-status[data-error="true"] {
          color: var(--iqa-html-error, #a12622);
        }

        .iqa-html-complete-query {
          color: #7b8794;
        }

        @media (forced-colors: active) {
          .iqa-html-highlight { display: none; }
          body.iqa-enhanced .iqa-html-content > textarea.iqa-html-input {
            color: CanvasText !important;
            -webkit-text-fill-color: CanvasText;
            caret-color: auto;
          }
        }
      `;
      document.head.appendChild(style);
    }

    function dispose(ta, item) {
      item.abort.abort();
      item.observers.forEach(observer => observer.disconnect());
      clearTimeout(item.timer);
      item.pre.remove();
      item.menu.remove();
      item.tools.remove();
      item.content.classList.remove('iqa-html-content');
      ta.classList.remove('iqa-html-input');
      for (const [name, value] of Object.entries(item.attributes)) {
        if (value === null) ta.removeAttribute(name); else ta.setAttribute(name, value);
      }
      editors.delete(ta);
    }

    function attach(ta) {
      const editorEl = ta.closest('.RadEditor');
      const content = ta.parentElement;
      if (!editorEl || !content) return;

      const abort = new AbortController();
      const on = (target, type, handler, options = {}) => target?.addEventListener(type, handler, { ...options, signal: abort.signal });
      const attributes = Object.fromEntries(['role', 'aria-autocomplete', 'aria-expanded', 'aria-controls',
        'aria-activedescendant', 'aria-describedby', 'spellcheck'].map(name => [name, ta.getAttribute(name)]));

      const pre = document.createElement('pre');
      pre.className = 'iqa-html-highlight';
      pre.setAttribute('aria-hidden', 'true');
      pre.hidden = true;
      content.classList.add('iqa-html-content');
      ta.before(pre);

      const menu = document.createElement('div');
      menu.className = 'iqa-sql-complete iqa-html-complete';
      menu.id = 'iqaHtmlComplete-' + Math.random().toString(36).slice(2);
      menu.setAttribute('role', 'listbox');
      menu.setAttribute('aria-label', 'Data source fields');
      menu.hidden = true;
      document.body.appendChild(menu);

      const tools = document.createElement('div');
      tools.className = 'iqa-html-tools';
      tools.hidden = true;
      const formatButton = document.createElement('button');
      formatButton.type = 'button';
      formatButton.className = 'TextButton us-outline-button';
      formatButton.textContent = 'Format HTML';
      formatButton.title = 'Format HTML (Shift+Alt+F)';
      formatButton.setAttribute('aria-keyshortcuts', 'Shift+Alt+F');
      const problemButton = document.createElement('button');
      problemButton.type = 'button';
      problemButton.className = 'TextButton us-outline-button';
      problemButton.textContent = 'Go to problem';
      problemButton.title = 'Select the next unpaired tag';
      problemButton.hidden = true;
      const status = document.createElement('span');
      status.className = 'iqa-html-status';
      status.id = menu.id + '-status';
      status.setAttribute('role', 'status');
      tools.append(formatButton, problemButton, status);
      editorEl.after(tools);

      ta.spellcheck = false;
      ta.setAttribute('role', 'combobox');
      ta.setAttribute('aria-autocomplete', 'list');
      ta.setAttribute('aria-controls', menu.id);
      ta.setAttribute('aria-expanded', 'false');
      ta.setAttribute('aria-describedby', [attributes['aria-describedby'], status.id].filter(Boolean).join(' '));

      const item = { pre, menu, tools, content, abort, attributes, observers: [], timer: 0, painted: null,
        tags: [], tagSpans: [], paired: [], problemAt: -1 };
      const active = () => ta.getClientRects().length > 0;

      const sync = () => {
        pre.style.top = ta.offsetTop + 'px';
        pre.style.left = ta.offsetLeft + 'px';
        pre.style.width = ta.clientWidth + 'px';
        pre.style.height = ta.clientHeight + 'px';
        pre.scrollTop = ta.scrollTop;
        pre.scrollLeft = ta.scrollLeft;
      };

      const report = (fields, message) => {
        const unknown = unknownPlaceholders(ta.value, fields);
        const problems = item.tags.filter(tag => tag.problem);
        problemButton.hidden = !problems.length;
        status.dataset.error = String(!message && (unknown.length > 0 || problems.length > 0));
        if (message) status.textContent = message;
        else if (problems.length || unknown.length) {
          const notes = [];
          if (problems.length) {
            const shown = problems.slice(0, 3).map(tag => describeProblem(ta.value, tag));
            notes.push((problems.length === 1 ? 'Unpaired tag: ' : problems.length + ' unpaired tags: ') + shown.join('; ')
              + (problems.length > shown.length ? '; and ' + (problems.length - shown.length) + ' more' : '') + '.');
          }
          if (unknown.length) {
            notes.push((unknown.length === 1 ? 'Not a Display column: ' : 'Not Display columns: ')
              + unknown.join(', ') + '. Add it on the Display tab, or correct the alias.');
          }
          status.textContent = notes.join(' ');
        } else if (fields.length) {
          status.textContent = fields.length + (fields.length === 1 ? ' data source field' : ' data source fields')
            + '. Type {# for suggestions, or press Ctrl+Space.';
        } else status.textContent = 'No data source fields were found. Add columns on the Display tab.';
      };

      const paint = () => {
        item.painted = ta.value;
        const fields = readFields(editorEl);
        const known = new Set(fields.map(field => field.insert.toLowerCase()));
        item.tags = tagPairs(ta.value);
        item.tagSpans = [];
        item.paired = [];
        const tagAt = new Map(item.tags.map((tag, index) => [tag.start, index]));
        const fragment = document.createDocumentFragment();
        let offset = 0, pending = -1;
        for (const token of tokens(ta.value)) {
          const at = offset;
          offset += token.text.length;
          // The "<" or "</" before a name marks where the paired tag starts.
          if (token.type === 'punct' && token.text[0] === '<') pending = tagAt.has(at) ? tagAt.get(at) : -1;
          if (!token.type) { fragment.appendChild(document.createTextNode(token.text)); continue; }
          const span = document.createElement('span');
          span.className = 'iqa-html-' + token.type;
          span.textContent = token.text;
          if (token.type === 'tag' && pending >= 0) {
            item.tagSpans[pending] = span;
            if (item.tags[pending].problem) span.classList.add('is-unmatched');
            pending = -1;
          }
          if (token.type === 'placeholder' && fields.length && /^\{#query\.[\w.]*\}$/i.test(token.text)
            && !known.has(token.text.toLowerCase())) span.classList.add('is-unknown');
          fragment.appendChild(span);
        }
        // A trailing newline keeps the last line's height equal to the textarea's.
        fragment.appendChild(document.createTextNode('\n'));
        pre.replaceChildren(fragment);
        sync();
        report(fields);
        showPair();
      };

      // Highlights the tag under the caret and its partner.
      const showPair = () => {
        item.paired.forEach(span => span.classList.remove('is-paired'));
        item.paired = [];
        if (!active() || ta.selectionStart !== ta.selectionEnd) return;
        const caret = ta.selectionStart;
        const index = item.tags.findIndex(tag => caret > tag.start && caret <= tag.end);
        const tag = item.tags[index];
        if (!tag || tag.pair < 0) return;
        item.paired = [item.tagSpans[index], item.tagSpans[tag.pair]].filter(Boolean);
        item.paired.forEach(span => span.classList.add('is-paired'));
      };

      // Scrolls the textarea so an offset is in view, using the same hidden copy
      // of the text that places the suggestion list.
      const scrollToOffset = index => {
        const mirror = document.createElement('div');
        const marker = document.createElement('span');
        const style = getComputedStyle(ta);
        Object.assign(mirror.style, {
          position: 'absolute', visibility: 'hidden', top: '0', left: '0', width: ta.clientWidth + 'px',
          boxSizing: 'border-box', font: style.font, padding: style.padding, whiteSpace: 'pre-wrap',
          overflowWrap: 'break-word', tabSize: '2'
        });
        mirror.textContent = ta.value.slice(0, index);
        marker.textContent = '\u200b';
        mirror.appendChild(marker);
        document.body.appendChild(mirror);
        const top = marker.offsetTop;
        mirror.remove();
        ta.scrollTop = Math.max(0, top - ta.clientHeight / 3);
        sync();
      };

      const nextProblem = () => {
        const problems = item.tags.filter(tag => tag.problem);
        if (!problems.length) return;
        item.problemAt = (item.problemAt + 1) % problems.length;
        const tag = problems[item.problemAt];
        ta.focus();
        ta.setSelectionRange(tag.start, tag.end);
        scrollToOffset(tag.start);
        report(readFields(editorEl), 'Problem ' + (item.problemAt + 1) + ' of ' + problems.length + ': '
          + describeProblem(ta.value, tag) + '.');
        clearTimeout(item.timer);
        item.timer = setTimeout(() => report(readFields(editorEl)), 4000);
      };

      const refresh = () => {
        const shown = active();
        ta.classList.toggle('iqa-html-input', shown);
        pre.hidden = !shown;
        tools.hidden = !shown;
        if (!shown) { close(); return; }
        paint();
        // RadEditor can fill the textarea just after showing it on a mode change.
        requestAnimationFrame(() => { if (active() && ta.value !== item.painted) paint(); });
      };

      // insertText keeps each change on the textarea's own undo stack.
      const replaceText = (start, end, text) => {
        ta.focus();
        ta.setSelectionRange(start, end);
        let done = false;
        try { done = document.execCommand('insertText', false, text); } catch (_) { /* unsupported */ }
        if (!done) {
          ta.setRangeText(text, start, end, 'end');
          ta.dispatchEvent(new Event('input', { bubbles: true }));
        }
      };

      const formatNow = () => {
        const next = format(ta.value);
        clearTimeout(item.timer);
        if (next === ta.value) {
          report(readFields(editorEl), 'The HTML is already formatted.');
        } else {
          const scroll = ta.scrollTop;
          replaceText(0, ta.value.length, next);
          ta.setSelectionRange(0, 0);
          ta.scrollTop = scroll;
          sync();
          report(readFields(editorEl), 'HTML formatted. Undo with Ctrl+Z.');
        }
        item.timer = setTimeout(() => report(readFields(editorEl)), 2500);
      };

      let suggestions = null, current = 0;
      const close = () => {
        menu.hidden = true;
        suggestions = null;
        ta.setAttribute('aria-expanded', 'false');
        ta.removeAttribute('aria-activedescendant');
      };
      const select = () => {
        [...menu.children].forEach((node, index) => node.setAttribute('aria-selected', String(index === current)));
        const node = menu.children[current];
        if (!node) return;
        ta.setAttribute('aria-activedescendant', node.id);
        if (node.offsetTop < menu.scrollTop) menu.scrollTop = node.offsetTop;
        else if (node.offsetTop + node.offsetHeight > menu.scrollTop + menu.clientHeight) {
          menu.scrollTop = node.offsetTop + node.offsetHeight - menu.clientHeight;
        }
      };
      // Places the list under the caret using a hidden copy of the text.
      const position = () => {
        const mirror = document.createElement('div');
        const caret = document.createElement('span');
        const style = getComputedStyle(ta);
        Object.assign(mirror.style, {
          position: 'fixed', visibility: 'hidden', width: ta.clientWidth + 'px', boxSizing: 'border-box',
          font: style.font, padding: style.padding, whiteSpace: 'pre-wrap', overflowWrap: 'break-word', tabSize: '2'
        });
        mirror.textContent = ta.value.slice(0, ta.selectionStart);
        caret.textContent = '​';
        mirror.appendChild(caret);
        document.body.appendChild(mirror);
        const origin = mirror.getBoundingClientRect(), point = caret.getBoundingClientRect(), box = ta.getBoundingClientRect();
        mirror.remove();
        const left = box.left + point.left - origin.left - ta.scrollLeft;
        const top = box.top + point.top - origin.top - ta.scrollTop + 22;
        menu.style.left = Math.max(8, Math.min(left, window.innerWidth - menu.offsetWidth - 8)) + 'px';
        menu.style.top = Math.max(8, Math.min(top, window.innerHeight - menu.offsetHeight - 8)) + 'px';
      };
      const accept = () => {
        const option = suggestions?.options[current];
        if (!option) return;
        const start = suggestions.start, end = ta.selectionEnd;
        // Replace the rest of a placeholder being edited rather than doubling it.
        const rest = /^[\w.]*\}?/.exec(ta.value.slice(end))[0];
        close();
        replaceText(start, end + rest.length, option.insert);
      };
      const openList = (requested) => {
        if (ta.selectionStart !== ta.selectionEnd) return close();
        const before = ta.value.slice(0, ta.selectionStart);
        const fields = readFields(editorEl);
        suggestions = requested ? listAt(before, fields) : suggest(before, fields);
        if (!suggestions?.options.length) {
          if (requested) report(fields, fields.length ? 'No data source field matches.' : undefined);
          return close();
        }
        current = 0;
        menu.replaceChildren();
        suggestions.options.forEach((option, index) => {
          const node = document.createElement('div');
          node.id = menu.id + '-' + index;
          node.setAttribute('role', 'option');
          node.setAttribute('aria-label', option.insert);
          const icon = document.createElement('span');
          icon.className = 'iqa-sql-complete-icon';
          icon.dataset.kind = 'field';
          icon.setAttribute('aria-hidden', 'true');
          icon.innerHTML = FIELD_ICON;
          const label = document.createElement('span');
          label.className = 'iqa-sql-complete-label';
          const prefix = document.createElement('span');
          prefix.className = 'iqa-html-complete-query';
          prefix.textContent = option.label.slice(0, option.label.length - option.name.length);
          label.append(prefix, option.name);
          node.append(icon, label);
          node.addEventListener('pointerdown', event => { event.preventDefault(); current = index; accept(); });
          menu.appendChild(node);
        });
        menu.hidden = false;
        ta.setAttribute('aria-expanded', 'true');
        select();
        position();
      };

      on(formatButton, 'click', formatNow);
      on(problemButton, 'click', nextProblem);
      on(ta, 'keyup', showPair);
      on(ta, 'mouseup', showPair);
      on(document, 'selectionchange', () => { if (document.activeElement === ta) showPair(); });
      on(ta, 'input', event => { paint(); if (event.isComposing) close(); else openList(false); });
      on(ta, 'scroll', () => { sync(); close(); });
      on(ta, 'focus', () => { if (ta.value !== item.painted) paint(); });
      on(ta, 'blur', close);
      on(ta, 'click', close);
      on(window, 'resize', close);
      // Captured so RadEditor's own Escape/Tab handling does not also run while
      // the list is open.
      on(ta, 'keydown', event => {
        if (event.isComposing) return;
        if (event.ctrlKey && !event.altKey && !event.metaKey && event.code === 'Space') {
          event.preventDefault();
          openList(true);
          return;
        }
        if (event.shiftKey && event.altKey && !event.ctrlKey && !event.metaKey && event.code === 'KeyF') {
          event.preventDefault();
          close();
          formatNow();
          return;
        }
        if (event.ctrlKey || event.altKey || event.metaKey) return;
        if (menu.hidden) {
          if (event.key === 'Tab' && !event.shiftKey) {
            event.preventDefault();
            replaceText(ta.selectionStart, ta.selectionEnd, '  ');
          }
          return;
        }
        const handled = () => { event.preventDefault(); event.stopImmediatePropagation(); };
        if (event.key === 'Escape') { handled(); close(); }
        else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          handled();
          const count = suggestions.options.length;
          current = (current + (event.key === 'ArrowDown' ? 1 : -1) + count) % count;
          select();
        } else if (!event.shiftKey && (event.key === 'Enter' || event.key === 'Tab')) { handled(); accept(); }
        else if (['ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) close();
      }, { capture: true });

      // Mode changes show or hide the textarea (or an ancestor); both change its
      // size, so one observer covers Design, HTML and Preview switches.
      if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(() => { if (active() !== !pre.hidden) refresh(); else if (active()) sync(); });
        observer.observe(ta);
        item.observers.push(observer);
      }
      on(editorEl.querySelector('.reModes'), 'click', () => setTimeout(refresh));

      editors.set(ta, item);
      refresh();
    }

    function mount() {
      for (const [ta, item] of editors) if (!ta.isConnected) dispose(ta, item);
      const textareas = document.querySelectorAll('[id$="_TemplatePanel_Body"] .RadEditor textarea.reTextArea');
      if (!textareas.length) return;
      injectCss();
      textareas.forEach(ta => { if (!editors.has(ta)) attach(ta); });
    }

    function teardown() {
      for (const [ta, item] of editors) dispose(ta, item);
    }

    return { mount, teardown };
  }
  const TemplateHtml = createTemplateHtmlEditor();
  TemplateHtml.mount();
  window.__iqaTemplateHtmlTest = TemplateHtml;
  const found = document.querySelectorAll('[id$="_TemplatePanel_Body"] .RadEditor textarea.reTextArea').length;
  console.log(found
    ? '[IQA template test] Mounted. Switch the editor to HTML to try it.'
    : '[IQA template test] No Template tab editor found on this page.');
  if (!document.body.classList.contains('iqa-enhanced')) {
    console.warn('[IQA template test] Turn Enhance on: the styles apply only while it is on.');
  }
})();
