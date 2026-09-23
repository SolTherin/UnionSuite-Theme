/* Console experiment: paste once in the OUTER published page, then use
 * usCcoInline.discover(), .startChild() or .startParent(). See README.md.
 * No automatic startup, configuration writes, script replay or ViewState merge.
 */
(() => {
  'use strict';
  if (window !== window.top) throw new Error('Use the outer page console.');
  if (window.usCcoInline) throw new Error('Probe already installed. Use stop(), or reload before repasting.');

  const unwrap = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;
  const list = value => {
    const result = unwrap(value)?.$values ?? unwrap(value);
    if (!Array.isArray(result)) throw new Error('Unexpected iMIS collection shape.');
    return result;
  };
  const object = value => {
    const result = typeof unwrap(value) === 'string' ? JSON.parse(unwrap(value)) : unwrap(value);
    if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('Expected an iMIS object.');
    return result;
  };
  function values(record, name) {
    const props = record.Properties?.$values ?? record.Properties;
    return [unwrap(record[name]), ...(Array.isArray(props) ? props.filter(p => p.Name === name).map(p => unwrap(p.Value)) : [])]
      .filter(value => value !== undefined);
  }
  const property = (record, name) => values(record, name)[0];
  function guid(value, label = 'Key') {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value) || /^0{8}(?:-0{4}){3}-0{12}$/.test(value)) {
      throw new Error(label + ' must be a non-zero GUID.');
    }
    return value.toLowerCase();
  }
  function sameOrigin(value, base = location.href) {
    const url = new URL(value, base);
    if (url.origin !== location.origin || url.username || url.password || !/^https?:$/.test(url.protocol)) {
      throw new Error('Only same-origin HTTP(S) URLs are supported.');
    }
    return url;
  }
  function appRoot(options) {
    const url = sameOrigin(options.appRoot ?? window.gWebRoot ?? '/', location.origin);
    if (url.search || url.hash) throw new Error('appRoot must be an application path.');
    return url.pathname.replace(/\/+$/, '');
  }
  async function request(url, options = {}) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const timer = setTimeout(abort, 30000);
    try {
      const response = await fetch(sameOrigin(url), {
        ...options, credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: controller.signal
      });
      if (!response.ok) throw new Error('Request failed: HTTP ' + response.status);
      // Read the body inside the timeout, not just the response headers.
      return { text: await response.text(), type: response.headers.get('content-type') || '' };
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }
  async function api(path, options, payload) {
    const token = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
    const response = await request(appRoot(options) + '/api/' + path, {
      method: payload === undefined ? 'GET' : 'POST',
      signal: options.signal,
      headers: {
        Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}),
        ...(payload === undefined ? {} : { 'Content-Type': 'application/json' })
      },
      ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
    });
    if (!/\bjson\b/i.test(response.type)) throw new Error('API returned non-JSON; check the session.');
    const result = JSON.parse(response.text);
    if (unwrap(result.IsSuccessStatusCode) === false || unwrap(result.IsValid) === false) throw new Error('iMIS rejected the lookup.');
    return result;
  }

  function one(scope, selector, label) {
    const nodes = [...scope.querySelectorAll(selector)];
    if (nodes.length !== 1) throw new Error(label + ': expected one match, found ' + nodes.length + '.');
    return nodes[0];
  }
  function rootSelector(explicit) {
    if (explicit) return explicit;
    const owners = [...new Set([...document.querySelectorAll('.cco')].map(node => node.closest('.ContentItemContainer')).filter(Boolean))];
    console.table(owners.map(node => ({ containerId: node.id })));
    if (owners.length !== 1 || !owners[0].id) throw new Error('Supply rootSelector using the intended native CCO container ID in the table.');
    return '#' + CSS.escape(owners[0].id);
  }
  function structure(scope, selector) {
    const root = one(scope, selector, 'CCO container');
    const ccos = [...root.querySelectorAll('.cco')].filter(node => node.closest('.ContentItemContainer') === root);
    if (ccos.length !== 1) throw new Error('Expected one native .cco owned by this ContentItemContainer.');
    const cco = ccos[0];
    const strips = [...cco.querySelectorAll('.RadTabStrip, .RadTabStripVertical')].filter(node => node.closest('.cco') === cco);
    const multis = [...cco.querySelectorAll('.RadMultiPage')].filter(node => node.closest('.cco') === cco);
    if (!strips.length || multis.length !== 1) throw new Error('Native tab strip/multipage structure not recognised.');
    const rows = strips.map(strip => [...strip.querySelectorAll('.rtsLink')].filter(link => link.closest('.RadTabStrip, .RadTabStripVertical') === strip));
    const names = rows[0].map(link => (link.querySelector('.rtsTxt') || link).textContent.trim());
    if (!names.length || new Set(names).size !== names.length || rows.some(row => row.length !== names.length || row.some((link, i) => (link.querySelector('.rtsTxt') || link).textContent.trim() !== names[i]))) {
      throw new Error('Tab captions must be unique and agree across top/bottom strips.');
    }
    const selected = rows[0].flatMap((link, i) => link.classList.contains('rtsSelected') ? [i] : []);
    if (selected.length !== 1) throw new Error('Expected one selected native tab.');
    return { root, cco, strips, rows, names, multi: multis[0], initial: selected[0] };
  }

  function completeRows(body, label) {
    const rows = list(body.Items ?? body);
    if (Number(unwrap(body.TotalCount)) > rows.length || unwrap(body.HasNext) === true || body.NextPageLink) {
      throw new Error(label + ' result is unexpectedly paged.');
    }
    return rows;
  }
  function contentPath(value) {
    if (typeof value !== 'string' || !value.startsWith('@/') || /[?#\\\x00-\x1f]/.test(value)) {
      throw new Error('Page path must be an explicit @/ content path.');
    }
    const parts = value.slice(2).split('/');
    if (parts.some(part => !part || part === '.' || part === '..')) throw new Error('Invalid content page path.');
    return value;
  }
  async function pageIdentity(options) {
    if (options.parentDvk !== undefined) {
      return { parentDvk: guid(options.parentDvk, 'Parent DVK'), path: null, source: 'explicit-parentDvk' };
    }
    const initialHref = location.href;
    const canonical = [...document.querySelectorAll('link[rel~="canonical"]')].map(node => node.getAttribute('href'));
    const canonicalSignature = JSON.stringify(canonical);
    const unchanged = () => {
      if (options.signal?.aborted) throw new Error('Page identity discovery was cancelled.');
      if (location.href !== initialHref || JSON.stringify([...document.querySelectorAll('link[rel~="canonical"]')].map(node => node.getAttribute('href'))) !== canonicalSignature) {
        throw new Error('Page changed during identity discovery.');
      }
    };
    const current = new URL(initialHref);
    if (!options.pagePath && /\/iMIS\/ContentManagement\/ContentPreview\.aspx$/i.test(current.pathname)) {
      const keys = current.searchParams.getAll('iUniformKey');
      if (keys.length !== 1 || current.searchParams.get('DocumentTypeCode') !== 'CON') {
        throw new Error('ContentPreview URL has no unambiguous content-page identity.');
      }
      return { parentDvk: guid(keys[0], 'Preview DVK'), path: null, source: 'native-preview-url' };
    }
    let path, source;
    if (options.pagePath !== undefined) {
      path = contentPath(options.pagePath);
      source = 'explicit-pagePath';
    } else {
      if (canonical.length > 1) throw new Error('Multiple canonical links; supply parentDvk or pagePath explicitly.');
      if (canonical.length && !canonical[0]) throw new Error('Canonical link is empty.');
      const url = canonical.length ? sameOrigin(canonical[0], initialHref) : current;
      let pathname = decodeURIComponent(url.pathname);
      // Only strip the native website/application roots. Do not progressively
      // remove path segments until an unrelated document happens to match.
      const roots = [window.gWebSiteRoot, appRoot(options)].filter(value => typeof value === 'string' && value);
      const prefixes = roots.map(value => decodeURIComponent(sameOrigin(value, location.origin).pathname).replace(/\/+$/, ''))
        .filter(value => value && pathname.toLowerCase().startsWith(value.toLowerCase() + '/'))
        .sort((left, right) => right.length - left.length);
      if (prefixes.length) pathname = pathname.slice(prefixes[0].length);
      path = contentPath('@/' + pathname.replace(/^\/+/, '').replace(/\.aspx$/i, ''));
      source = canonical.length ? 'canonical-path' : 'current-path';
    }
    const response = await api('Document/_execute', options, {
      $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
      OperationName: 'FindByPath', EntityTypeName: 'Document',
      Parameters: {
        $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
        $values: [{ $type: 'System.String', $value: path }]
      },
      ParameterTypeName: {
        $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
        $values: ['System.String']
      },
      UseJson: false
    });
    unchanged();
    const result = unwrap(response.Result);
    if (!result) throw new Error('FindByPath did not resolve ' + path + '. Supply parentDvk or pagePath explicitly.');
    let rows;
    if (result.Documents !== undefined) rows = completeRows({ ...result, Items: result.Documents }, 'FindByPath');
    else if (result.Items !== undefined) rows = completeRows(result, 'FindByPath');
    else if (Array.isArray(result) || result.$values !== undefined) rows = list(result);
    else rows = [result];
    if (rows.length !== 1) throw new Error('FindByPath must return exactly one content document.');
    const record = object(rows[0]);
    const type = property(record, 'DocumentTypeId');
    if (type !== undefined && type !== 'CON') throw new Error('FindByPath returned a non-content document.');
    const returnedPath = property(record, 'Path');
    if (returnedPath && contentPath(returnedPath).toLowerCase() !== path.toLowerCase()) {
      throw new Error('FindByPath returned a different content path.');
    }
    return { parentDvk: guid(property(record, 'DocumentVersionId'), 'Resolved page DVK'), path, source };
  }
  function contentItemsFromBlob(record) {
    const data = record.Data;
    if (data?.$type !== 'System.Byte[], mscorlib' || typeof data.$value !== 'string' || !data.$value) {
      throw new Error('Published Document has no supported Base64 content blob.');
    }
    const bytes = Uint8Array.from(atob(data.$value), char => char.charCodeAt(0));
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (/<!DOCTYPE|<!ENTITY/i.test(text)) throw new Error('Content blob contains an unsupported XML declaration.');
    const xml = new DOMParser().parseFromString(text, 'application/xml');
    if (xml.getElementsByTagName('parsererror').length || xml.getElementsByTagNameNS('*', 'parsererror').length) {
      throw new Error('Content blob is not valid XML.');
    }
    const contentNs = 'http://schemas.imis.com/2008/01/DataContracts/Content';
    const itemNs = 'http://schemas.imis.com/2008/01/DataContracts/ContentItem';
    const ccoNs = 'http://schemas.datacontract.org/2004/07/Asi.Web.iParts.Common.ContentCollectionOrganizer';
    const xsi = 'http://www.w3.org/2001/XMLSchema-instance';
    if (xml.documentElement.localName !== 'Content' || xml.documentElement.namespaceURI !== contentNs) {
      throw new Error('Document blob is not a native content-page definition.');
    }
    const collections = [...xml.documentElement.children].filter(node => node.localName === 'ContentItems' && node.namespaceURI === contentNs);
    if (collections.length !== 1) throw new Error('Content blob has no unique ContentItems collection.');
    const identityFields = ['ContentKey', 'ContentItemKey', 'ContentItemName', 'ContentTypeKey'];
    const configFields = ['SourceKey', 'SourceFolder', 'DefaultSourceKey', 'DefaultSourceFolder', 'UseContentFolder', 'ContentFolderKey', 'ContentFolder', 'URLKeyName', 'WizardMode', 'TabbedDialogSettings'];
    const rows = [];
    for (const item of collections[0].children) {
      if (item.localName !== 'ContentItem' || item.namespaceURI !== itemNs) continue;
      const type = item.getAttributeNS(xsi, 'type') || '';
      const parts = type.split(':');
      const name = parts.at(-1), namespace = item.lookupNamespaceURI(parts.length === 2 ? parts[0] : null);
      if (namespace !== ccoNs || !['ContentCollectionOrganizer', 'DynamicContentCollectionOrganizer'].includes(name)) continue;
      // Normalize only known scalar fields into the same internal adapter shape
      // as ContentItem.Data. No blob HTML/scripts are inserted or evaluated.
      const mapped = { $type: 'Asi.Web.iParts.Common.ContentCollectionOrganizer.' + name + 'Common, Asi.Web.iParts' };
      for (const field of [...identityFields, ...configFields]) {
        const fieldNs = identityFields.includes(field) ? itemNs : ccoNs;
        const matches = [...item.children].filter(node => node.localName === field && node.namespaceURI === fieldNs);
        if (matches.length > 1) throw new Error('Duplicate field in CCO XML: ' + field);
        if (matches.length && matches[0].getAttributeNS(xsi, 'nil') !== 'true') mapped[field] = matches[0].textContent;
      }
      rows.push({ Data: mapped });
    }
    return rows;
  }
  async function configurationRows(parentDvk, options) {
    const source = options.configSource || 'document';
    if (source === 'content-item') {
      if (!options.contentItemKey) throw new Error('ContentItem requires both parentDvk and contentItemKey; either key alone returns 404 on this tenant.');
      const filter = new URLSearchParams({ ContentKey: parentDvk, ContentItemKey: guid(options.contentItemKey, 'CCO placement key') });
      return completeRows(await api('ContentItem?' + filter, options), 'ContentItem');
    }
    if (source !== 'document') throw new Error('configSource must be document or content-item.');
    const filter = new URLSearchParams({ DocumentVersionID: parentDvk, DocumentStatusID: '40' });
    const rows = completeRows(await api('Document?' + filter, options), 'Published Document');
    if (rows.length !== 1) throw new Error('Expected exactly one published parent Document; received ' + rows.length + '.');
    const record = object(rows[0]);
    if (guid(property(record, 'DocumentVersionId'), 'Returned DocumentVersionId') !== parentDvk) throw new Error('Document API ignored the DVK filter.');
    const status = property(record, 'Status');
    if (property(record, 'DocumentTypeId') !== 'CON' || unwrap(status?.Name ?? status?.Description ?? status) !== 'Published') {
      throw new Error('Document API did not return a published content page.');
    }
    return contentItemsFromBlob(record);
  }
  async function discover(options = {}) {
    const identity = await pageIdentity(options);
    const parentDvk = identity.parentDvk;
    console.info('[CCO inline] Page identity', identity);
    const contentItemKey = options.contentItemKey ? guid(options.contentItemKey, 'CCO placement key') : null;
    const rows = await configurationRows(parentDvk, options);
    const candidates = [];
    for (const raw of rows) {
      const row = object(raw), data = object(row.Data ?? {});
      const get = name => property(data, name) ?? property(row, name);
      const dynamic = /(?:^|\.)DynamicContentCollectionOrganizerCommon(?:,|$)/.test(data.$type || '');
      if (!dynamic && (get('UseContentFolder') === undefined || get('TabbedDialogSettings') === undefined)) continue;
      const parents = [...values(row, 'ContentKey'), ...values(data, 'ContentKey')];
      if (!parents.length || parents.some(value => guid(value) !== parentDvk)) throw new Error('Returned CCO has a different/missing parent ContentKey.');
      const keys = [...values(row, 'ContentItemKey'), ...values(data, 'ContentItemKey')].map(value => guid(value));
      if (!keys.length || new Set(keys).size !== 1) throw new Error('Returned CCO placement identity is missing/conflicting.');
      if (contentItemKey && keys[0] !== contentItemKey) {
        if (options.configSource === 'content-item') throw new Error('API ignored the placement filter.');
        continue;
      }
      candidates.push({
        contentKey: parentDvk, contentItemKey: keys[0], name: get('ContentItemName') || '', dynamic,
        folderMode: dynamic ? true : get('UseContentFolder'),
        folderKey: get(dynamic ? 'SourceKey' : 'ContentFolderKey') || '',
        folderPath: get(dynamic ? 'SourceFolder' : 'ContentFolder') || '',
        defaultFolderKey: dynamic ? get('DefaultSourceKey') || '' : '',
        defaultFolderPath: dynamic ? get('DefaultSourceFolder') || '' : '',
        parameter: get('URLKeyName') || '',
        wizard: get('WizardMode'), settings: get('TabbedDialogSettings')
      });
    }
    console.table(candidates.map(({ settings, ...row }) => row));
    if (candidates.length !== 1) throw new Error('Found ' + candidates.length + ' matching CCO configurations. For multiple CCOs, supply contentItemKey from the table and the corresponding rootSelector.');
    const config = candidates[0];
    if (config.wizard === true || config.wizard === 'true') throw new Error('Wizard/step CCOs are outside this tab probe.');
    async function folderDocuments(key) {
      const result = await api('Document/_execute', options, {
        $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
        OperationName: 'FindDocumentsInFolder', EntityTypeName: 'Document',
        Parameters: {
          $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
          $values: [guid(key, 'Folder key'), { $type: 'System.String[], mscorlib', $values: ['CON', 'CFL'] }, { $type: 'System.Boolean', $value: true }]
        },
        ParameterTypeName: { $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib', $values: ['System.String', 'System.String[]', 'System.Boolean'] }
      });
      return list(result.Result ?? result);
    }
    let pages;
    if (config.folderMode === true || config.folderMode === 'true') {
      const absent = key => !key || key === '00000000-0000-0000-0000-000000000000';
      let documents;
      if (config.dynamic && absent(config.folderKey)) documents = [];
      else documents = await folderDocuments(config.folderKey);
      config.resolvedFolderKey = config.folderKey;
      config.fallbackUsed = false;
      // Historical native code falls back when the source yields no documents.
      // Do not hide API errors, nested-folder limits or a caption mismatch by
      // trying the default folder. Live parity still needs verification.
      if (config.dynamic && !documents.length && !absent(config.defaultFolderKey)) {
        documents = await folderDocuments(config.defaultFolderKey);
        config.resolvedFolderKey = config.defaultFolderKey;
        config.fallbackUsed = true;
      }
      console.info('[CCO inline] Folder lookup', { key: config.resolvedFolderKey, fallbackUsed: config.fallbackUsed });
      if (documents.some(row => property(row, 'DocumentTypeId') === 'CFL')) {
        throw new Error('Folder contains nested folders. This probe only resolves immediate children; no guessed tab mapping was installed.');
      }
      pages = documents.filter(row => {
        if (property(row, 'DocumentTypeId') !== 'CON') throw new Error('Unexpected folder document type.');
        const status = property(row, 'Status');
        const name = unwrap(status?.Name ?? status?.Description ?? status);
        return ![false].includes(property(row, 'IsPublished')) && property(row, 'IsAuthorized') !== false && property(row, 'IsDeleted') !== true && (!name || name === 'Published');
      }).map(row => ({
        id: guid(property(row, 'DocumentVersionId'), 'Child DVK'),
        name: property(row, 'Name'), caption: property(row, 'AlternateName') || property(row, 'Name')
      }));
    } else if (config.folderMode === false || config.folderMode === 'false') {
      // Older native serializer: BEL-separated rows, newline-separated values.
      // Refuse shortcuts/unknown layouts instead of resolving a guessed destination.
      pages = String(config.settings).split('\x07').filter(Boolean).flatMap(row => {
        const fields = row.replace(/\r/g, '').split('\n');
        if (fields.length < 3 || !/^[01]$/.test(fields[0]) || (fields[6] || '').trim()) throw new Error('Manual settings contain an unsupported layout or shortcut.');
        if (fields.length >= 6 && fields[3] === '1') return [];
        return [{ id: guid(fields[1].trim(), 'Manual child DVK'), caption: fields[2], name: '' }];
      });
    } else throw new Error('Unrecognised UseContentFolder value.');
    pages = pages.map(page => ({ ...page, caption: String(page.caption || '').trim() }));
    if (!pages.length || pages.some(page => !page.caption)) throw new Error('No named child pages resolved.');
    console.table(pages);
    const keys = {
      parentDvk, contentKey: config.contentKey, contentItemKey: config.contentItemKey,
      pagePath: identity.path, identitySource: identity.source,
      childPages: pages.map(page => ({ tab: page.caption, contentKey: page.id }))
    };
    return { parentDvk, identity, keys, config, pages, appRoot: appRoot(options) };
  }

  let active = null, starting = false, startup = null;
  let casesTrial = null;

  // Diagnostic token scanning only; fetched JavaScript is never evaluated.
  // Slash tokens need expression context so a regex cannot expose a fake
  // $create call, and ordinary division does not hide later descriptors.
  function scanScript(text, visit) {
    const parentheses = [];
    let expressionExpected = true, previousToken = '';
    const fail = (message, offset) => {
      const error = new Error(message);
      error.offset = offset;
      error.line = text.slice(0, offset).split('\n').length;
      throw error;
    };
    for (let index = 0; index < text.length; index++) {
      const char = text[index];
      if (/\s/.test(char)) continue;
      if (char === '"' || char === "'") {
        const quote = char;
        const start = index;
        let closed = false;
        while (++index < text.length) {
          if (text[index] === '\\') index++;
          else if (text[index] === quote) { closed = true; break; }
        }
        if (!closed) fail('Unterminated string.', start);
        expressionExpected = false; previousToken = 'literal';
      } else if (text.startsWith('//', index) || text.startsWith('<!--', index) ||
          text.startsWith('-->', index) && /^\s*$/.test(text.slice(text.lastIndexOf('\n', index - 1) + 1, index))) {
        // Classic WebForms script blocks can use legacy HTML line comments.
        const end = text.indexOf('\n', index + 2);
        index = end < 0 ? text.length : end;
      } else if (text.startsWith('/*', index)) {
        const end = text.indexOf('*/', index + 2);
        if (end < 0) fail('Unterminated comment.', index);
        index = end + 1;
      } else if (char === '`') {
        fail('Template literal syntax is outside the diagnostic scanner.', index);
      } else if (char === '/') {
        // A closing brace can end an object or a statement. Do not guess its
        // slash context without a full JavaScript parser.
        if (previousToken === '}') fail('Ambiguous slash after a closing brace.', index);
        if (expressionExpected) {
          const start = index;
          let characterClass = false, closed = false;
          while (++index < text.length) {
            const next = text[index];
            if (next === '\n' || next === '\r') fail('Unterminated regex literal.', start);
            if (next === '\\') index++;
            else if (next === '[') characterClass = true;
            else if (next === ']') characterClass = false;
            else if (next === '/' && !characterClass) { closed = true; break; }
          }
          if (!closed) fail('Unterminated regex literal.', start);
          while (/[A-Za-z]/.test(text[index + 1] || '')) index++;
          expressionExpected = false; previousToken = 'literal';
        } else {
          if (text[index + 1] === '=') index++;
          expressionExpected = true; previousToken = '/';
        }
      } else {
        const next = visit(char, index);
        if (next === false) return;
        if (Number.isInteger(next)) {
          index = next;
          expressionExpected = false; previousToken = ')';
          continue;
        }
        const identifier = text.slice(index).match(/^[A-Za-z_$][\w$]*/)?.[0];
        if (identifier) {
          index += identifier.length - 1;
          expressionExpected = previousToken !== '.' && /^(?:return|throw|case|delete|void|typeof|new|in|instanceof|yield|await|else|do)$/.test(identifier);
          previousToken = previousToken === '.' ? '.' + identifier : identifier;
        } else if (/[0-9]/.test(char)) {
          const number = text.slice(index).match(/^(?:0[xob][\da-f_]+|(?:\d[\d_]*\.?[\d_]*)(?:e[+-]?\d[\d_]*)?n?)/i)?.[0] || char;
          index += number.length - 1;
          expressionExpected = false; previousToken = 'literal';
        } else if (char === '(') {
          parentheses.push(/^(?:if|while|for|with|switch|catch)$/.test(previousToken));
          expressionExpected = true; previousToken = char;
        } else if (char === ')') {
          expressionExpected = parentheses.pop() === true; previousToken = char;
        } else if ((char === '+' || char === '-') && text[index + 1] === char) {
          index++;
          // Both prefix and postfix preserve the preceding expression context.
          previousToken = char + char;
        } else {
          expressionExpected = !/[\]}.]/.test(char);
          previousToken = char;
        }
      }
    }
  }

  function splitArguments(text) {
    const stack = [], parts = [];
    let start = 0;
    scanScript(text, (char, index) => {
      if ('([{'.includes(char)) stack.push(char);
      else if (')]}'.includes(char)) {
        if (stack.pop() !== { ')': '(', ']': '[', '}': '{' }[char]) throw new Error('Unbalanced expression.');
      } else if (char === ',' && !stack.length) {
        parts.push(text.slice(start, index).trim()); start = index + 1;
      }
    });
    if (stack.length) throw new Error('Unbalanced expression.');
    parts.push(text.slice(start).trim());
    return parts;
  }

  function functionReferenceParts(name) {
    if (/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(name)) return name.split('.');
    const bracket = name.match(/^window\s*\[\s*(['"])([A-Za-z_$][\w$]*)\1\s*\]\s*\.\s*([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)$/);
    return bracket ? [bracket[2], ...bracket[3].split('.')] : null;
  }

  function namedFunction(name) {
    const parts = functionReferenceParts(name);
    if (!parts) return false;
    let owner = window;
    for (const part of parts) {
      if (!owner || !['object', 'function'].includes(typeof owner)) return false;
      // Manager methods may be inherited. Inspect descriptors without calling
      // accessors or evaluating the emitted window['literal'].Method expression.
      let current = owner, property;
      for (let depth = 0; current && depth < 32; depth++) {
        property = Object.getOwnPropertyDescriptor(current, part);
        if (property) break;
        current = Object.getPrototypeOf(current);
      }
      if (!property || !('value' in property)) return false;
      owner = property.value;
    }
    return typeof owner === 'function';
  }

  function gridDiagnostics(options = {}) {
    const selector = options.selector || '#ste_container_ciAccountpagetabs #ste_container_Cases .RadGrid';
    const grid = one(document, selector, 'Diagnostic grid');
    if (!grid.id || !grid.classList.contains('RadGrid')) throw new Error('Select exactly one RadGrid with an ID.');
    if (document.querySelectorAll('#' + CSS.escape(grid.id)).length !== 1) throw new Error('Grid ID is duplicated in the live document.');
    const captured = active?.diagnosticSource(grid);
    const doc = captured?.doc || document;
    const source = captured?.source || document;
    const sourceGrid = one(doc, '#' + CSS.escape(grid.id), 'Source grid');
    if (!source.contains(sourceGrid)) throw new Error('Grid is outside the captured tab source.');
    const locate = id => {
      const sourceElements = [...doc.querySelectorAll('#' + CSS.escape(id))];
      const liveElements = [...document.querySelectorAll('#' + CSS.escape(id))];
      return {
        id, sourceCount: sourceElements.length, liveCount: liveElements.length,
        insideSource: sourceElements.length === 1 && source.contains(sourceElements[0]),
        sourceHidden: sourceElements.length === 1 && sourceElements[0].matches('input[type="hidden"]')
      };
    };
    const control = typeof window.$find === 'function' ? window.$find(grid.id) : null;
    const descriptors = [], unsupportedScripts = [], relatedScripts = [];
    const scripts = [...doc.scripts];
    const idLiteral = text => text.match(/^(['"])([A-Za-z_][\w:.-]*)\1$/)?.[2];
    const shape = (value, key = '', depth = 0) => {
      if (value === null) return { type: 'null' };
      if (Array.isArray(value)) return { type: 'array', length: value.length };
      if (typeof value === 'object') {
        if (depth >= 8) return { type: 'object', truncated: true };
        return { type: 'object', fields: Object.fromEntries(Object.entries(value).slice(0, 100).map(([name, child]) => [name, shape(child, name, depth + 1)])), truncated: Object.keys(value).length > 100 };
      }
      if (typeof value === 'string' && /(?:id|element|field)$/i.test(key) && /^[A-Za-z_][\w$:.\-]*$/.test(value)) {
        // Keep only control identifiers: never arbitrary strings, row data,
        // state values, URLs or settings containing member/filter values.
        const element = doc.getElementById(value);
        if (element || /uniqueID$/i.test(key) && value.replaceAll('$', '_') === grid.id) return { type: 'identifier', ...locate(value) };
      }
      return { type: typeof value };
    };
    const literalShape = text => {
      try { return { supported: true, ...shape(JSON.parse(text)) }; }
      catch { return { supported: false, reason: 'Expected strict JSON; expression omitted.' }; }
    };
    for (const [scriptIndex, script] of scripts.entries()) {
      if (script.src || !script.textContent.includes(grid.id)) continue;
      const text = script.textContent;
      relatedScripts.push({ scriptIndex, characters: text.length, insideSource: source.contains(script) });
      try {
        scanScript(text, (char, index) => {
          if (char !== '$' || /[\w$.]/.test(text[index - 1] || '') || !/^\$create\s*\(/.test(text.slice(index))) return;
          const open = text.indexOf('(', index);
          let depth = 1, end = -1;
          try {
            scanScript(text.slice(open + 1), (next, offset) => {
              if (next === '(') depth++;
              if (next === ')' && --depth === 0) { end = open + 1 + offset; return false; }
            });
          } catch (error) {
            if (Number.isInteger(error.offset)) {
              error.offset += open + 1;
              error.line = text.slice(0, error.offset).split('\n').length;
            }
            throw error;
          }
          if (end < 0) throw new Error('Unterminated $create call.');
          const args = splitArguments(text.slice(open + 1, end));
          const target = args[4]?.match(/^\$get\s*\(\s*((?:"[^"\r\n]*"|'[^'\r\n]*'))\s*\)$/);
          const targetId = target && idLiteral(target[1]);
          if (!targetId) {
            unsupportedScripts.push({ scriptIndex, line: text.slice(0, index).split('\n').length, offset: index, reason: 'Unsupported $create target; expected literal $get(id). Continuing after this call.' });
            return end;
          }
          if (targetId !== grid.id) return end;
          if (args.length !== 5 || !/^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*$/.test(args[0])) throw new Error('Unsupported $create signature.');
          const events = [];
          let eventsSupported = true;
          if (args[2] !== 'null') {
            if (!/^\{[\s\S]*\}$/.test(args[2])) eventsSupported = false;
            else for (const entry of splitArguments(args[2].slice(1, -1)).filter(Boolean)) {
              const event = entry.match(/^\s*(?:"([\w$]+)"|'([\w$]+)'|([\w$]+))\s*:\s*([\s\S]+?)\s*$/);
              if (!event || !functionReferenceParts(event[4])) { eventsSupported = false; continue; }
              events.push({ name: event[1] || event[2] || event[3], callback: event[4], available: namedFunction(event[4]) });
            }
          }
          const references = [];
          let referencesSupported = true;
          try {
            const values = JSON.parse(args[3]);
            if (values !== null && (typeof values !== 'object' || Array.isArray(values))) throw new Error();
            for (const [name, value] of Object.entries(values || {})) {
              if (typeof value !== 'string' || !/^[A-Za-z_][\w:.-]*$/.test(value)) { referencesSupported = false; continue; }
              const registered = typeof window.$find === 'function' && Boolean(window.$find(value));
              if (!doc.getElementById(value) && !registered) {
                references.push({ name, unresolved: true, identifierOmitted: true });
              } else references.push({ name, ...locate(value), registered });
            }
          } catch { referencesSupported = false; }
          descriptors.push({
            scriptIndex, line: text.slice(0, index).split('\n').length,
            constructor: args[0], constructorAvailable: namedFunction(args[0]),
            target: locate(targetId), properties: literalShape(args[1]),
            eventsSupported, events, referencesSupported, references
          });
          return end;
        });
      } catch (error) {
        unsupportedScripts.push({ scriptIndex, reason: error.message, ...(Number.isInteger(error.offset) ? { offset: error.offset, line: error.line } : {}) });
      }
    }
    const owner = sourceGrid.closest('.ContentItemContainer') || sourceGrid;
    const hiddenInputs = [...owner.querySelectorAll('input[type="hidden"][id]')].map(node => locate(node.id));
    const resourceBase = new URL(doc.querySelector('base[href]')?.getAttribute('href') || captured?.url || location.href, captured?.url || location.href);
    const resources = scripts.filter(script => script.hasAttribute('src')).map(script => {
      const raw = script.getAttribute('src');
      let url;
      try { url = new URL(raw, resourceBase); }
      catch { return { urlOmitted: true, reason: 'Invalid resource URL.' }; }
      if (!/^https?:$/.test(url.protocol) || url.username || url.password) return { urlOmitted: true, reason: 'Non-HTTP or credential-bearing resource URL.' };
      return {
        path: url.origin + url.pathname,
        queryKeys: [...new Set(url.searchParams.keys())],
        exactUrlPresentInLiveDocument: [...document.scripts].some(live => live.src === url.href)
      };
    });
    return {
      version: '0.7.2-probe', selector, gridId: grid.id,
      rendering: captured ? captured.mode + '-inserted' : 'native-dom',
      sourceEvidence: captured ? 'original response for the current insertion' : 'scripts currently present in live DOM; partial-postback scripts may be absent',
      registryAvailable: typeof window.$find === 'function',
      registered: Boolean(control), attachedToCurrentElement: Boolean(control?.get_element?.() === grid),
      radGridTypeAvailable: namedFunction('Telerik.Web.UI.RadGrid'),
      relatedScripts, descriptors, unsupportedScripts, hiddenInputs,
      resources, resourcesScope: 'whole source document; presence does not prove dependency or execution',
      limitation: 'Read-only inventory. Property values are omitted except verified DOM/control identifiers. No control creation or server-operation acceptance.'
    };
  }

  // This adapter is deliberately tied to the user-captured Cases contract.
  // It reads literals from the response; no fetched script is evaluated.
  const casesId = 'ctl01_TemplateBody_WebPartManager1_gwpciAccountpagetabs_ciAccountpagetabs_Cases_ResultsGrid_Grid1';
  const casesManager = casesId + '_jsmanager';
  const casesPagerId = casesId + '_ctl00_ctl03_ctl01_PageSizeComboBox';
  const casesPagerEvents = { selectedIndexChanged: 'ChangePageSizeComboHandler', selectedIndexChanging: 'ChangingPageSizeComboHandler' };
  const casesEvents = { gridCreated: 'OnGridCreated', rowCreated: 'OnRowCreated', rowDeselected: 'OnRowDeselected', rowSelected: 'OnRowSelected' };

  function callArguments(text, open) {
    let depth = 1, end = -1;
    // Nested scans see a slice. Report their positions against the whole
    // script so a live failure identifies the actual setup source.
    const locate = error => {
      if (Number.isInteger(error.offset) && !error.located) {
        error.offset += open + 1;
        error.line = text.slice(0, error.offset).split('\n').length;
        error.located = true;
      }
      throw error;
    };
    try {
      scanScript(text.slice(open + 1), (char, offset) => {
        if (char === '(') depth++;
        if (char === ')' && --depth === 0) { end = open + 1 + offset; return false; }
      });
    } catch (error) { locate(error); }
    if (end < 0) throw new Error('Unterminated Cases setup call.');
    try { return { args: splitArguments(text.slice(open + 1, end)), end }; }
    catch (error) { locate(error); }
  }

  function casesContract(doc, source, box) {
    const fail = message => { throw new Error('Cases contract: ' + message); };
    const grid = one(box, '.RadGrid', 'Cases grid');
    if (grid.id !== casesId || !grid.closest('#ste_container_Cases')) fail('unexpected grid identity.');
    const combos = [...box.querySelectorAll('.RadComboBox')];
    const pager = combos[0] || null;
    if (box.querySelector('.RadTabStrip, .RadMultiPage, .RadEditor') || combos.length > 1 || pager && (pager.id !== casesPagerId || !pager.classList.contains('PageSizeDropDown') || !grid.contains(pager))) fail('additional native controls need inspection.');
    const descriptors = [], pagerDescriptors = [], managers = [], creationOrder = [];
    for (const [scriptIndex, script] of [...doc.scripts].entries()) {
      if (script.src || !script.textContent.includes(casesId)) continue;
      const text = script.textContent;
      // Native focus-only helpers also mention the grid ID. They are not part
      // of the creation contract and must not gate it on unrelated syntax.
      if (!/\$create\s*\(/.test(text) && !text.includes(casesManager)) continue;
      const scanSetup = () => scanScript(text, (char, index) => {
        if (/[\w$.]/.test(text[index - 1] || '')) return;
        if (char === '$' && /^\$create\s*\(/.test(text.slice(index))) {
          const call = callArguments(text, text.indexOf('(', index));
          const target = call.args[4]?.match(/^\$get\s*\(\s*(['"])([\w:.-]+)\1\s*\)$/)?.[2];
          if (target === casesId) { descriptors.push(call.args); creationOrder.push(target); }
          else if (pager && target === pager.id) { pagerDescriptors.push(call.args); creationOrder.push(target); }
          else if (target && box.querySelector('#' + CSS.escape(target))) {
            // Name the unexpected control so its contract can be inspected.
            // Only the constructor, identifier and element class are reported.
            const element = box.querySelector('#' + CSS.escape(target));
            const type = /^[\w$.]+$/.test(call.args[0] || '') ? call.args[0] : 'unrecognized constructor';
            fail('another component descriptor targets the imported fragment: ' + type + ' -> ' + target + ' (' + element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).trim().split(/\s+/).join('.') : '') + ').');
          }
          return call.end;
        }
        if (char === 'w') {
          const assignment = text.slice(index).match(/^window\s*\[\s*(['"])([\w$]+)\1\s*\]\s*=\s*new\s+([\w$.]+)\s*\(/);
          if (!assignment || assignment[2] !== casesManager) return;
          if (assignment[3] !== 'Asi_Web_BusinessDataGrid2') fail('manager constructor changed.');
          const call = callArguments(text, index + assignment[0].length - 1);
          if (call.args.length !== 1 || !/^\s*;/.test(text.slice(call.end + 1))) fail('manager setup is not a standalone literal assignment.');
          managers.push(call.args[0]);
          return call.end;
        }
      });
      try { scanSetup(); }
      catch (error) {
        error.message += ' [script ' + scriptIndex + (Number.isInteger(error.line) ? ', line ' + error.line : '') + (Number.isInteger(error.offset) ? ', offset ' + error.offset : '') + ']';
        throw error;
      }
    }
    if (descriptors.length !== 1 || managers.length !== 1) fail('expected exactly one grid descriptor and one manager setup.');
    const args = descriptors[0];
    if (args.length !== 5 || args[0] !== 'Telerik.Web.UI.RadGrid' || args[3] !== 'null') fail('grid constructor/references changed.');
    const json = text => {
      try {
        return JSON.parse(text, (key, value) => {
          if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error();
          return value;
        });
      } catch { fail('setup must contain plain JSON.'); }
    };
    const config = json(managers[0]);
    const expected = { GridClientId: casesId, IsMultiSelect: false, TrackItemSelectionAcrossPostbacks: false, IsSelectedByDefault: false, DeltaKeys: '', ClientOnRowSelected: null, ClientOnRowDeselected: null };
    if (!config || Object.keys(config).length !== Object.keys(expected).length || Object.entries(expected).some(([key, value]) => config[key] !== value)) fail('manager flags or custom callbacks changed.');
    if (!/^\{[\s\S]*\}$/.test(args[2])) fail('event map changed.');
    const seen = new Set();
    for (const entry of splitArguments(args[2].slice(1, -1))) {
      const match = entry.match(/^\s*(?:"([\w$]+)"|'([\w$]+)'|([\w$]+))\s*:\s*([\s\S]+?)\s*$/);
      const name = match && (match[1] || match[2] || match[3]);
      const parts = match && functionReferenceParts(match[4]);
      if (!Object.hasOwn(casesEvents, name) || seen.has(name) || !parts || parts.length !== 2 || parts[0] !== casesManager || parts[1] !== casesEvents[name]) fail('event callback changed.');
      seen.add(name);
    }
    if (seen.size !== 4) fail('expected four manager event callbacks.');
    const properties = json(args[1]);
    const keys = new Set(['ClientID', 'ClientSettings', 'Skin', 'SortingSettings', 'UniqueID', '_activeRowIndex', '_clientKeyValues', '_controlToFocus', '_currentPageIndex', '_defaultDateTimeFormat', '_editIndexes', '_embeddedSkin', '_enableAriaSupport', '_freezeText', '_gridTableViewsData', '_masterClientID', '_shouldFocusOnPage', '_unfreezeText', 'allowMultiRowSelection', 'clientStateFieldID', 'expandItems', 'renderMode']);
    if (!properties || Array.isArray(properties) || Object.keys(properties).some(key => !keys.has(key))) fail('unknown grid properties.');
    if (properties.ClientID !== casesId || properties.UniqueID !== casesId.replaceAll('_', '$') || properties._masterClientID !== casesId + '_ctl00' || properties.clientStateFieldID !== casesId + '_ClientState') fail('grid/table/state identifiers changed.');
    const table = one(box, '#' + CSS.escape(properties._masterClientID), 'Cases master table');
    if (!grid.contains(table) || table.tagName !== 'TABLE') fail('master table is outside the grid.');
    const state = one(doc, '#' + CSS.escape(properties.clientStateFieldID), 'Cases client state');
    if (!source.contains(state) || !state.matches('input[type="hidden"]') || ![state.id, properties.UniqueID + '_ClientState'].includes(state.name)) fail('client-state field identity changed.');
    if (document.getElementById(state.id) && !active?.ownsCasesState(state.name)) fail('client-state ID already exists.');
    if (document.getElementsByName(state.name).length && !active?.ownsCasesState(state.name)) fail('client-state name already exists.');
    let pagerContract = null;
    if (pager) {
      if (pagerDescriptors.length !== 1 || creationOrder[0] !== pager.id) fail('expected one pager descriptor before the grid.');
      const pagerArgs = pagerDescriptors[0];
      if (pagerArgs.length !== 5 || pagerArgs[0] !== 'Telerik.Web.UI.RadComboBox' || pagerArgs[3] !== 'null') fail('pager constructor/references changed.');
      const settings = json(pagerArgs[1]);
      const pagerKeys = ['_dropDownWidth', '_height', '_skin', '_text', '_uniqueId', '_value', 'clientStateFieldID', 'collapseAnimation', 'enableAriaSupport', 'expandAnimation', 'itemData', 'localization', 'selectedIndex'];
      if (!settings || Object.keys(settings).length !== pagerKeys.length || Object.keys(settings).some(key => !pagerKeys.includes(key))) fail('pager properties changed.');
      if (settings._uniqueId !== pager.id.replaceAll('_', '$') || settings.clientStateFieldID !== pager.id + '_ClientState' || !Array.isArray(settings.itemData) || !Number.isInteger(settings.selectedIndex)) fail('pager identifiers or item settings changed.');
      if (!/^\{[\s\S]*\}$/.test(pagerArgs[2])) fail('pager event map changed.');
      const eventsSeen = new Set();
      for (const entry of splitArguments(pagerArgs[2].slice(1, -1))) {
        const match = entry.match(/^\s*(?:"([\w$]+)"|'([\w$]+)'|([\w$]+))\s*:\s*([\s\S]+?)\s*$/);
        const name = match && (match[1] || match[2] || match[3]);
        if (!Object.hasOwn(casesPagerEvents, name) || eventsSeen.has(name) || match[4] !== 'Telerik.Web.UI.Grid.' + casesPagerEvents[name]) fail('pager callback changed.');
        eventsSeen.add(name);
      }
      if (eventsSeen.size !== 2) fail('expected both native pager callbacks.');
      for (const name of ['Telerik.Web.UI.RadComboBox', ...Object.values(casesPagerEvents).map(method => 'Telerik.Web.UI.Grid.' + method)]) {
        if (!namedFunction(name)) fail('required native pager resource is missing: ' + name);
      }
      const pagerState = one(doc, '#' + CSS.escape(settings.clientStateFieldID), 'Cases pager client state');
      const sourceGrid = one(source, '#' + CSS.escape(casesId), 'Source Cases grid');
      if (!sourceGrid.contains(pagerState) || !pagerState.matches('input[type="hidden"]') || pagerState.name !== pagerState.id) fail('pager client-state identity changed.');
      if ((document.getElementById(pagerState.id) || document.getElementsByName(pagerState.name).length) && !active?.ownsCasesState(pagerState.name)) fail('pager client state already exists.');
      pagerContract = { element: pager, properties: settings, state: pagerState };
    }
    return { properties, config, state, grid, pager: pagerContract, stateInsideGrid: doc.getElementById(casesId).contains(state) };
  }

  function casesPrerequisites() {
    if (!namedFunction('$create') || !namedFunction('$find') || !namedFunction('Telerik.Web.UI.RadGrid') || !namedFunction('Asi_Web_BusinessDataGrid2') || !namedFunction('Sys.Application.getComponents')) {
      throw new Error('Cases requires the existing ASP.NET AJAX, RadGrid and Asi_Web_BusinessDataGrid2 resources. Reload; missing resources are not fetched by this trial.');
    }
    if (window.Sys.Application.get_isCreatingComponents?.()) throw new Error('Wait for native component initialization to finish.');
  }

  function initializeCases(host, contract, cycle) {
    casesPrerequisites();
    if (window.$find(casesId) || casesManager in window) throw new Error('Cases grid/manager already exists; reload on a non-Cases native tab.');
    const { grid, properties, config, state, pager } = contract;
    if (pager && window.$find(pager.element.id)) throw new Error('A pager component already exists; reload before continuing.');
    const before = new Set(window.Sys.Application.getComponents());
    const owned = new Set();
    let manager = null, control = null, pagerControl = null, closed = false;
    const hiddenFields = [];
    const restoreState = (input, owner, inside) => {
      const hidden = document.createElement('input');
      hidden.type = 'hidden'; hidden.id = input.id; hidden.name = input.name; hidden.value = input.value;
      if (inside) owner.append(hidden); else owner.after(hidden);
      hiddenFields.push(hidden);
    };
    restoreState(state, grid, contract.stateInsideGrid);
    if (pager) restoreState(pager.state, pager.element, false);
    const collect = () => {
      for (const candidate of [...window.Sys.Application.getComponents(), ...[grid, ...grid.querySelectorAll('*')].map(node => node.control), control]) {
        if (!candidate || before.has(candidate)) continue;
        const element = candidate.get_element?.();
        if (element === grid || grid.contains(element)) owned.add(candidate);
      }
    };
    const dispose = () => {
      if (closed) return;
      closed = true;
      const errors = [];
      const replacementElements = [...owned].flatMap(candidate => {
        const id = candidate.get_id?.(), registered = id && window.$find(id);
        if (!registered || registered === candidate) return [];
        return [registered.get_element?.(), document.getElementById(id)].filter(Boolean);
      });
      // The root normally disposes its table/row children. Re-check the live
      // registry/element before each child so it is not disposed twice.
      const ordered = [...owned].sort((left, right) => Number(right.get_element?.() === grid) - Number(left.get_element?.() === grid));
      for (const candidate of ordered) {
        const id = candidate.get_id?.(), element = candidate.get_element?.();
        const registered = id ? window.$find(id) : null;
        if (registered && registered !== candidate) { errors.push('A native replacement owns a control ID; reload to release the old instance.'); continue; }
        // Native parent disposal may traverse children. Do not let it dispose a
        // later native replacement living inside the grid we originally created.
        if (element && replacementElements.some(replacement => element.contains(replacement))) { errors.push('An owned parent contains a native replacement; reload required for cleanup.'); continue; }
        if (registered !== candidate && element?.control !== candidate) continue;
        try { candidate.dispose(); }
        catch { errors.push('Native control disposal failed; reload required.'); }
        if (id && window.$find(id) === candidate) errors.push('Owned component remains registered; reload required.');
      }
      if (manager && Object.getOwnPropertyDescriptor(window, casesManager)?.value === manager) delete window[casesManager];
      hiddenFields.forEach(hidden => hidden.remove());
      cycle.cleanup = { status: errors.length ? 'incomplete' : 'disposed', errors };
      if (errors.length) throw new Error(errors.join(' '));
    };
    try {
      manager = new window.Asi_Web_BusinessDataGrid2(config);
      Object.defineProperty(window, casesManager, { configurable: true, writable: true, value: manager });
      const events = {};
      for (const [event, method] of Object.entries(casesEvents)) {
        if (typeof manager[method] !== 'function') throw new Error('Native manager callback missing.');
        events[event] = manager[method];
      }
      if (pager) {
        const pagerEvents = Object.fromEntries(Object.entries(casesPagerEvents).map(([event, method]) => [event, window.Telerik.Web.UI.Grid[method]]));
        try { pagerControl = window.$create(window.Telerik.Web.UI.RadComboBox, pager.properties, pagerEvents, null, pager.element); }
        catch { throw new Error('Native pager creation failed; reload before continuing.'); }
        collect();
        if (!pagerControl || window.$find(pager.element.id) !== pagerControl || pagerControl.get_element?.() !== pager.element) throw new Error('Created pager is not registered on the inserted element.');
      }
      try { control = window.$create(window.Telerik.Web.UI.RadGrid, properties, events, null, grid); }
      catch { throw new Error('Native RadGrid creation failed; reload before continuing.'); }
      collect();
      if (!control || window.$find(casesId) !== control || control.get_element?.() !== grid) throw new Error('Created grid is not registered on the inserted element.');
      const table = control.get_masterTableView?.();
      if (!table || table.get_element?.() !== grid.querySelector('#' + CSS.escape(properties._masterClientID))) throw new Error('Created grid has no attached master table.');
      cycle.registration = { registered: true, attachedToCurrentElement: true, masterTableAttached: true, managerCallbacks: 4, restoredClientState: true };
      cycle.pager = pager ? { id: pager.element.id, registered: window.$find(pager.element.id) === pagerControl, attachedToCurrentElement: pagerControl.get_element?.() === pager.element, initializedBeforeGrid: true, nativeCallbacks: 2, restoredClientState: true } : { present: false };
      if (pager && (!cycle.pager.registered || !cycle.pager.attachedToCurrentElement)) throw new Error('Pager attachment changed during grid initialization.');
      cycle.status = 'initialized';
      return { dispose, control, manager, grid, pager: pager?.element, hiddenFields, ownsControl: candidate => owned.has(candidate) };
    } catch (error) {
      collect();
      cycle.status = 'failed'; cycle.error = error.message;
      try { dispose(); } catch (cleanupError) { cycle.cleanupError = cleanupError.message; }
      throw error;
    }
  }

  async function startCasesTrial() {
    if (active || starting) throw new Error('Stop the current probe and reload on a native non-Cases tab first.');
    if (!/\/_i4u_\/Core\/Staff-Site-Layouts\/Contact-Layouts\/Individual\/Account_Page_Staff\.aspx$/i.test(location.pathname)) throw new Error('Use the verified Account Page Staff page.');
    const selector = '#ste_container_ciAccountpagetabs';
    const shape = structure(document, selector), index = shape.names.indexOf('Cases');
    if (index < 0 || shape.initial === index || shape.multi.querySelector('#' + casesId)) throw new Error('Reload on Overview or another native non-Cases tab first.');
    casesPrerequisites();
    if (window.$find(casesId) || casesManager in window) throw new Error('A Cases grid/manager is retained; reload on a native non-Cases tab.');
    const tabUrls = Object.fromEntries(shape.names.map(name => {
      const url = new URL(location.href); url.searchParams.set('b511e4d055d8', name);
      return [name, url.href];
    }));
    casesTrial = { version: '0.7.2-probe', mode: 'parent', initialTab: shape.names[shape.initial], status: 'starting', cycles: [], limitation: 'Client initialization trial only. Native sorting/paging and server-state compatibility are unverified. Reload after native actions or failed initialization.' };
    try {
      await start('parent', { rootSelector: selector, tabUrls, selectionParameters: ['b511e4d055d8'], casesOnly: true, pagination: false });
      casesTrial.status = 'active';
      await active.select(index);
    } catch (error) { casesTrial.status = 'failed'; casesTrial.error = error.message; throw error; }
    return casesReport();
  }

  function casesReport() {
    return casesTrial ? structuredClone(casesTrial) : { status: 'not-started' };
  }

  function inventory(fragment, doc) {
    const scripts = [...doc.scripts];
    return {
      iparts: [...fragment.querySelectorAll('.ContentItemContainer')].map(node => node.id),
      nativeControls: [...fragment.querySelectorAll('.RadGrid, .RadComboBox, .RadTabStrip, .RadMultiPage, .RadEditor')].map(node => ({ id: node.id, type: node.className })),
      scriptsInFragment: fragment.querySelectorAll('script').length,
      documentScriptsNotReplayed: scripts.length,
      componentInitializers: scripts.filter(node => /\$create\s*\(|Sys\.Application|\.initialize\s*\(/.test(node.textContent)).length,
      inlineHandlers: [...fragment.querySelectorAll('*')].reduce((total, node) => total + [...node.attributes].filter(attr => /^on/i.test(attr.name)).length, 0),
      stylesInHeadNotImported: doc.head.querySelectorAll('style, link[rel="stylesheet"]').length
    };
  }
  function prepare(source, doc, url) {
    const box = document.createElement('div');
    box.append(...[...source.childNodes].map(node => document.importNode(node, true)));
    const details = inventory(box, doc);
    details.removedHiddenInputs = box.querySelectorAll('input[type="hidden"]').length;
    details.removedNestedDocuments = box.querySelectorAll('iframe, object, embed').length;
    // Detached parsing is not a sandbox. Do not reconnect script elements,
    // nested documents, global styles or another document's hidden form state.
    box.querySelectorAll('script, style, link, base, meta, iframe, object, embed, input[type="hidden"]').forEach(node => node.remove());
    if (box.querySelector('form')) throw new Error('Extraction includes a form. Choose a narrower childSelector.');
    const base = sameOrigin(doc.querySelector('base[href]')?.getAttribute('href') || url.href, url.href);
    for (const node of box.querySelectorAll('[href], [src], [action], [poster]')) {
      for (const attr of ['href', 'src', 'action', 'poster']) {
        const value = node.getAttribute(attr);
        if (value && !/^(?:#|javascript:|data:|mailto:|tel:)/i.test(value)) node.setAttribute(attr, new URL(value, base).href);
      }
    }
    return { box, details };
  }
  function refreshTheme(errors) {
    const controls = [
      ['UnionSuiteIqaFilters', 'refreshQueryTemplates'],
      ['UnionSuiteActions', 'refresh'],
      ['UnionSuiteTaskRows', 'refresh'],
      ['UnionSuiteBanners', 'refresh'],
      ['UnionSuiteActionMenus', 'refresh']
    ];
    for (const [owner, method] of controls) {
      try { window[owner]?.[method]?.(); }
      catch (error) { errors.push({ stage: owner, error: error.message }); }
    }
  }
  function paginate(source, destination) {
    const result = { count: 0, skipped: [], errors: [] };
    for (const script of source.querySelectorAll('script:not([src])')) {
      const text = script.textContent;
      if (!/\.simplePaginate\s*\(/.test(text)) continue;
      const read = name => text.match(new RegExp('\\bvar\\s+' + name + '\\s*=\\s*([\'"])([^\'"\\r\\n]*)\\1\\s*;'))?.[2];
      const id = read('contentItemId'), size = read('resultsPerPage'), hide = read('hidePageNumbers'), element = read('pageElement');
      try {
        if (!id?.startsWith('#') || !/^\d+$/.test(size || '') || Number(size) < 1 || !/^(true|false)$/i.test(hide || '') || !/^(section|li|div)$/.test(element || '') || !/jQuery\(contentItemId\)\.simplePaginate\s*\(/.test(text)) {
          throw new Error('Unsupported pagination initializer; nothing was evaluated.');
        }
        const selector = '#' + CSS.escape(id.slice(1));
        if (!source.matches(selector) && !source.querySelector(selector)) {
          // Native output may retain an initializer without its results node.
          // Do not manufacture a target or mistake this for a transplant loss.
          const elsewhere = source.ownerDocument.querySelector(selector);
          result.skipped.push({ target: id, reason: elsewhere ? 'outside-extracted-content' : 'absent-from-response' });
          continue;
        }
        const node = one(destination, selector, 'Pagination target ' + id);
        if (!window.jQuery?.fn?.simplePaginate) throw new Error('Native simplePaginate plugin is absent from the parent page.');
        window.jQuery(node).simplePaginate({ paginateElement: element, elementsPerPage: Number(size), firstButton: false, lastButton: false, prevButtonText: '&laquo;', nextButtonText: '&raquo;', hidePaginationNumbers: hide.toLowerCase(), uniqueId: node.id, pagerLocation: 'justify-content-center' });
        result.count++;
      } catch (error) {
        result.errors.push({ stage: 'pagination', target: id || null, error: error.message });
      }
    }
    return result;
  }

  async function start(mode, options = {}) {
    if (active || starting) throw new Error('A probe is already active/starting. Use stop() before switching.');
    starting = true;
    startup = new AbortController();
    const initialHref = location.href;
    try {
      if (window.gIsEasyEditEnabled === true) throw new Error('Turn Easy Edit off before running this content-loading trial.');
      const selector = rootSelector(options.rootSelector);
      const shape = structure(document, selector);
      const { root, cco, multi, rows, names, initial } = shape;
      let resolved = null;
      if (mode === 'child') resolved = await discover({ ...options, signal: startup.signal });
      if (startup.signal.aborted) throw new Error('Probe startup was cancelled.');
      if (location.href !== initialHref || !root.isConnected || !multi.isConnected) throw new Error('Page changed during discovery.');
      // Display names can contain spaces and are not guaranteed DOM ID suffixes.
      // The document/optional placement key selects configuration; native captions below
      // must independently match its destinations before interception is installed.
      const urls = [], pageMap = [];
      const reserved = new Set(['templatetype', 'imode', 'iuniformkey', 'ioperation', 'documenttypecode', 'dialogcacheparam', 'ispopup', 'popup', 'pageinstancekey', ...(options.selectionParameters || []).map(name => name.toLowerCase())]);
      if (resolved) {
        if (resolved.config.parameter) reserved.add(resolved.config.parameter.toLowerCase());
        // Remove the known native placement stub from CHILD requests only;
        // its value is never used to guess parent-tab routing.
        reserved.add(resolved.config.contentItemKey.replaceAll('-', '').slice(0, 12));
      }
      for (const [i, name] of names.entries()) {
        if (mode === 'child') {
          const matches = resolved.pages.filter(page => page.caption === name);
          if (matches.length !== 1) throw new Error('No unique child DVK for native caption: ' + name);
          const page = matches[0];
          const url = sameOrigin(resolved.appRoot + '/iMIS/ContentManagement/ContentPreview.aspx');
          new URL(initialHref).searchParams.forEach((value, key) => {
            if (!reserved.has(key.toLowerCase()) && !key.startsWith('__')) url.searchParams.append(key, value);
          });
          for (const [key, value] of Object.entries({ iMode: 'Execute', iUniformKey: page.id, iOperation: 'Execute', TemplateType: 'E', DocumentTypeCode: 'CON', IsPopup: 'true' })) url.searchParams.set(key, value);
          urls.push(url); pageMap.push({ tab: name, dvk: page.id });
        } else {
          const control = window.$find?.(shape.strips[0].id);
          const nativeUrl = control?.get_tabs?.().getTab(i)?.get_navigateUrl?.() || rows[0][i].getAttribute('href');
          const value = options.tabUrls?.[name] || (nativeUrl && !/^(?:#|javascript:)/i.test(nativeUrl) ? nativeUrl : null);
          if (!value && i !== initial) throw new Error('Supply the captured native URL in tabUrls for: ' + name);
          const url = sameOrigin(value || initialHref);
          const current = new URL(initialHref);
          if (url.pathname !== current.pathname) throw new Error('Parent mode must fetch the current parent pathname.');
          // Explicit/captured URLs supply routing; all other context comes from
          // the live page, so a pasted URL cannot silently switch member ID.
          const selection = new Set((options.selectionParameters || []).map(key => key.toLowerCase()));
          const context = candidate => {
            const params = new URLSearchParams([...candidate.searchParams].filter(([key]) => !selection.has(key.toLowerCase())));
            params.sort();
            return [...params];
          };
          if (JSON.stringify(context(url)) !== JSON.stringify(context(current))) throw new Error('Tab URL changes context. List only verified tab-routing keys in selectionParameters and retain current filters/ID.');
          urls.push(url); pageMap.push({ tab: name, path: url.pathname });
        }
      }
      console.table(pageMap);
      const host = document.createElement('div');
      host.className = 'rmpView us-cco-inline-probe';
      host.style.cssText = 'position:relative;min-width:0';
      const status = document.createElement('div');
      status.setAttribute('role', 'status');
      status.style.cssText = 'padding:8px;border:1px solid currentColor;margin-bottom:8px';
      const note = document.createElement('span');
      const restore = document.createElement('button');
      restore.type = 'button'; restore.textContent = 'Stop probe / restore';
      restore.style.marginLeft = '12px';
      status.append(note, restore);
      const overlay = document.createElement('div');
      overlay.textContent = 'Loading tab content…';
      overlay.style.cssText = 'position:absolute;inset:0;z-index:2;display:grid;place-items:center;background:rgba(255,255,255,.65);color:#111';
      overlay.setAttribute('role', 'status');
      // Keep the native multipage owner and put the loaded fragment inside it.
      // Original nodes are detached only once a validated response is ready.
      cco.insertBefore(status, multi);
      const originalNodes = [...multi.childNodes];
      const originalAttributes = rows.flat().map(link => [link, ['class', 'aria-selected', 'tabindex'].map(name => [name, link.getAttribute(name)])]);
      const originalBusy = multi.getAttribute('aria-busy');
      let selected = initial, controller = null, generation = 0, stopped = false;
      let currentUrl = initialHref, initializing = false, cleanup = null, diagnosticSource = null;
      let casesOwned = null;
      const reports = [];
      const events = new AbortController();
      function label(index) {
        rows.forEach(row => row.forEach((link, n) => {
          link.classList.toggle('rtsSelected', n === index);
          link.setAttribute('aria-selected', String(n === index));
          link.tabIndex = n === index ? 0 : -1;
        }));
      }
      function busy(on) {
        host.inert = on;
        if (on) {
          host.append(overlay); multi.setAttribute('aria-busy', 'true');
        } else {
          overlay.remove();
          if (originalBusy === null) multi.removeAttribute('aria-busy'); else multi.setAttribute('aria-busy', originalBusy);
        }
      }
      function resetContent() {
        diagnosticSource = null;
        const dispose = cleanup; cleanup = null;
        try { dispose?.(); }
        finally {
          casesOwned = null;
          multi.replaceChildren(...originalNodes);
          currentUrl = initialHref; selected = initial;
          label(initial);
        }
      }
      function stop(reason = 'Stopped; original native content restored.', restoreOriginal = true) {
        if (stopped) return;
        stopped = true; diagnosticSource = null; generation++; controller?.abort(); events.abort(); observer.disconnect();
        try { if (restoreOriginal && multi.isConnected) resetContent(); else { cleanup?.(); cleanup = null; casesOwned = null; } }
        catch (error) {
          if (!options.casesOnly) throw error;
          casesTrial.cleanupError = error.message;
          console.warn('[CCO inline]', error.message);
        }
        finally {
          if (options.casesOnly) { casesTrial.status = 'stopped'; casesTrial.stopReason = reason; }
          busy(false); status.remove();
          for (const [link, attrs] of originalAttributes) for (const [name, value] of attrs) {
            if (value === null) link.removeAttribute(name); else link.setAttribute(name, value);
          }
          active = null;
          console.info('[CCO inline]', reason);
        }
      }
      async function select(index, force = false) {
        if (stopped) throw new Error('Probe is stopped.');
        if (initializing) throw new Error('Wait for the current initializer to finish.');
        if (!Number.isInteger(index) || !names[index]) throw new Error('Use a zero-based native tab index.');
        if (options.casesOnly && (names[index] !== 'Cases' && (index !== initial || force))) throw new Error('This trial supports Cases and return to the original native tab only.');
        if (options.casesOnly && casesTrial.status === 'failed') throw new Error('The Cases trial failed. Stop and reload before continuing.');
        const link = rows[0][index];
        if (link.classList.contains('rtsDisabled') || link.getAttribute('aria-disabled') === 'true') return;
        if (location.href !== initialHref) { stop('URL/context changed; probe stopped.'); return; }
        controller?.abort(); controller = new AbortController();
        const signal = controller.signal, run = ++generation;
        if (index === initial && !force) { resetContent(); busy(false); note.textContent = 'Original native content.'; return; }
        const url = new URL(urls[index]); url.hash = '';
        const started = performance.now();
        // Overlay the existing content without hiding its results.
        if (!host.isConnected) {
          host.replaceChildren(...multi.childNodes);
          multi.append(host);
        }
        busy(true); note.textContent = 'Loading ' + names[index] + '…';
        const report = { mode, tab: names[index], index, status: 'loading' };
        const cycle = options.casesOnly ? { status: 'loading', initializationAttempted: false } : null;
        if (cycle) casesTrial.cycles.push(cycle);
        try {
          const response = await request(url, { signal });
          if (!/\btext\/html\b/i.test(response.type)) throw new Error('Content request did not return HTML.');
          const doc = new DOMParser().parseFromString(response.text, 'text/html');
          // Account Security pages legitimately contain password inputs. A
          // password field alone does not identify an authentication response.
          // Match the same native sign-in marker as Query Template refresh;
          // redirects and missing content shells are rejected independently.
          if (doc.querySelector('input.SignInButton')) throw new Error('Response contains the native sign-in control.');
          let source;
          if (mode === 'parent') {
            const fresh = structure(doc, selector);
            if (fresh.names.join('\n') !== names.join('\n') || fresh.initial !== index) throw new Error('Response did not select the requested native tab. Check its captured URL.');
            const views = [...fresh.multi.children].filter(node => node.classList.contains('rmpView'));
            if (views.length !== names.length) throw new Error('Native page-view count differs from the tab count; mapping needs inspection.');
            source = views[index];
            if (!source || source.hidden || source.style.display === 'none') throw new Error('Expected the selected visible direct .rmpView.');
          } else {
            source = one(doc, options.childSelector || '#MainPanel .EmptyMasterContentPanel', 'Child content shell');
          }
          if (!source.textContent.trim() && !source.querySelector('.ContentItemContainer, img, input')) throw new Error('Selected content is empty.');
          const prepared = prepare(source, doc, url);
          Object.assign(report, prepared.details);
          const ids = new Set();
          for (const node of prepared.box.querySelectorAll('[id]')) {
            if (ids.has(node.id)) throw new Error('Duplicate ID inside returned content: ' + node.id);
            ids.add(node.id);
            if ([...document.querySelectorAll('#' + CSS.escape(node.id))].some(existing => !multi.contains(existing))) throw new Error('Returned ID collides outside the CCO: ' + node.id);
          }
          report.existingComponentIds = [...ids].filter(id => window.$find?.(id));
          if (signal.aborted || stopped || run !== generation) return;
          if (location.href !== initialHref || !root.isConnected || !multi.isConnected) { stop('Page changed during fetch.'); return; }
          let contract = null;
          if (options.casesOnly) {
            casesPrerequisites();
            if (report.existingComponentIds.some(id => !casesOwned?.ownsControl(window.$find(id)))) throw new Error('An existing component owns an imported Cases ID.');
            if (casesManager in window && Object.getOwnPropertyDescriptor(window, casesManager)?.value !== casesOwned?.manager) throw new Error('An existing Cases manager is not owned by this trial.');
            contract = casesContract(doc, source, prepared.box);
          }
          cleanup?.(); cleanup = null;
          casesOwned = null;
          host.replaceChildren(...prepared.box.childNodes);
          multi.replaceChildren(host);
          // Retain only the current detached response for explicit diagnostics;
          // never reconnect its scripts/state or add a second timed fetch.
          diagnosticSource = { doc, source, url: url.href, mode, grids: new Set(host.querySelectorAll('.RadGrid')) };
          selected = index; currentUrl = url.href; label(index);
          report.status = 'inserted';
          report.initializationErrors = [];
          initializing = true;
          try {
            if (contract) {
              cycle.initializationAttempted = true;
              casesOwned = initializeCases(host, contract, cycle);
              cleanup = casesOwned.dispose;
            }
            if (options.pagination !== false) {
              const pagination = paginate(source, host);
              report.paginationInitialized = pagination.count;
              report.paginationSkipped = pagination.skipped;
              report.initializationErrors.push(...pagination.errors);
            }
            refreshTheme(report.initializationErrors);
            if (options.initialize) {
              const dispose = await options.initialize(host, { mode, index, url: url.href, signal });
              if (dispose != null && typeof dispose !== 'function') throw new Error('initialize must return a cleanup function or nothing.');
              if (stopped || run !== generation) dispose?.(); else cleanup = dispose;
            }
          } catch (error) {
            report.initializationErrors.push({ stage: 'initialize', error: error.message });
            if (cycle) { cycle.status = 'failed'; cycle.error = error.message; casesTrial.status = 'failed'; }
          } finally { initializing = false; }
          if (report.initializationErrors.length) {
            report.status = 'inserted-initialization-incomplete';
            report.initializationError = report.initializationErrors.map(item => item.error).join('; ');
          }
          report.ms = Math.round(performance.now() - started);
          reports.push(report);
          if (!stopped && run === generation) note.textContent = names[index] + ' — ' + report.status + ' (' + report.ms + ' ms). See report().';
          console.info('[CCO inline]', report);
        } catch (error) {
          if (stopped || run !== generation) return;
          report.status = 'failed'; report.error = error.message;
          if (cycle) { cycle.status = 'failed'; cycle.error = error.message; casesTrial.status = 'failed'; }
          reports.push(report); note.textContent = 'Not replaced: ' + error.message;
          console.warn('[CCO inline]', report);
        } finally {
          if (cycle?.status === 'loading') { cycle.status = 'cancelled'; report.status = 'cancelled'; }
          // Validation failures still have a useful inventory. Keep it in the
          // copyable Cases report, not only the collapsed console/general log.
          if (cycle) cycle.insertion = structuredClone(report);
          if (!stopped && run === generation) busy(false);
        }
      }
      const activate = index => select(index).catch(error => { note.textContent = error.message; console.warn('[CCO inline]', error.message); });
      // Capture is intentional for this experiment: cancels native postback even
      // on an already-selected Telerik tab, without changing its server state.
      window.addEventListener('click', event => {
        const row = rows.find(items => items.some(link => link.contains(event.target)));
        if (!row) return;
        const index = row.findIndex(link => link.contains(event.target));
        event.preventDefault(); event.stopImmediatePropagation(); activate(index);
      }, { capture: true, signal: events.signal });
      window.addEventListener('keydown', event => {
        const row = rows.find(items => items.includes(event.target));
        if (!row) return;
        const index = row.indexOf(event.target);
        if (['Enter', ' '].includes(event.key)) {
          event.preventDefault(); event.stopImmediatePropagation(); activate(index);
        } else if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
          const enabled = row.filter(link => !link.classList.contains('rtsDisabled') && link.getAttribute('aria-disabled') !== 'true');
          const at = enabled.indexOf(event.target), delta = ['ArrowLeft', 'ArrowUp'].includes(event.key) ? -1 : 1;
          const next = event.key === 'Home' ? enabled[0] : event.key === 'End' ? enabled.at(-1) : enabled[(at + delta + enabled.length) % enabled.length];
          event.preventDefault(); event.stopImmediatePropagation(); next?.focus();
        }
      }, { capture: true, signal: events.signal });
      restore.addEventListener('click', () => stop(), { signal: events.signal });
      window.addEventListener('pagehide', () => stop(), { once: true, signal: events.signal });
      window.addEventListener('popstate', () => stop('History changed; probe stopped.'), { signal: events.signal });
      const observer = new MutationObserver(() => {
        if (!root.isConnected || !multi.isConnected || shape.strips.some(strip => !strip.isConnected)) stop('Native CCO was replaced; probe stopped.', !options.casesOnly);
        else if (casesOwned && (!host.contains(casesOwned.grid) || casesOwned.pager && !casesOwned.grid.contains(casesOwned.pager))) stop('Cases content was replaced externally; trial stopped. Reload before another trial.', false);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      note.textContent = mode + ' probe ready. Click the native tabs.';
      active = {
        select, stop, report: () => structuredClone(reports),
        ownsCasesState: name => casesOwned?.hiddenFields.some(hidden => hidden.name === name && hidden.isConnected),
        diagnosticSource: grid => {
          if (!host.contains(grid)) return null;
          if (initializing || multi.getAttribute('aria-busy') === 'true') throw new Error('Wait for the tab request/initializer to finish before diagnosing.');
          if (!diagnosticSource) return null;
          if (!diagnosticSource.grids.has(grid)) throw new Error('Grid was replaced after insertion. Refresh the tab before diagnosing its source.');
          return diagnosticSource;
        },
        get currentUrl() { return currentUrl; },
        get currentIndex() { return selected; },
        refresh: () => select(selected, true),
        refreshQueryTemplate: (selector, settings = {}) => {
          if (!window.UnionSuiteRefresh) throw new Error('UnionSuiteRefresh is not installed.');
          return window.UnionSuiteRefresh.queryTemplate(selector, { ...settings, url: currentUrl });
        }
      };
      return { mode, tabs: pageMap, ...(resolved ? { keys: resolved.keys } : {}), message: 'Installed; initial content is still native.' };
    } finally { starting = false; startup = null; }
  }
  window.usCcoInline = {
    version: '0.7.2-probe', discover, gridDiagnostics, startCasesTrial, casesReport,
    keys: async options => (await discover(options)).keys,
    inspect: selector => {
      const shape = structure(document, rootSelector(selector));
      const rows = shape.names.map((name, index) => ({ index, name, selected: index === shape.initial, href: shape.rows[0][index].getAttribute('href') }));
      console.table(rows); return rows;
    },
    startChild: options => start('child', options),
    startParent: options => start('parent', options),
    stop: () => { startup?.abort(); active?.stop(); },
    select: index => active?.select(index),
    refresh: () => active?.refresh(),
    refreshQueryTemplate: (selector, options) => active?.refreshQueryTemplate(selector, options),
    report: () => active?.report() || [],
    get currentUrl() { return active?.currentUrl || null; }
  };
  console.info('[CCO inline] Loaded. Use inspect(), keys(), discover(), startChild() or startParent(options).');
})();
