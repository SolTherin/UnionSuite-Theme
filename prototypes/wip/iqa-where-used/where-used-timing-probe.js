/* =============================================================================
 * IQA "where used" probe, v3 — read-only.
 * -----------------------------------------------------------------------------
 * Times finding everything that refers to one IQA, source by source, and
 * records exactly which properties hold IQA references in each source. The
 * reference contract is the transferable part: the content deployment
 * project's reference checks need the same map.
 *
 * Run it in the DevTools console of a signed-in iMIS staff page on the same
 * site. It only reads: GET collections, and FindByPath / FindById /
 * FindDocumentsInFolder / FindDescendantDocumentsInFolder lookups. It never
 * saves, publishes or runs a query.
 *
 * Sources (CONFIG.sources)
 *   CON                 content pages: iParts, dashboards, Content HTML
 *   IQD                 IQAs used as a source by another IQA, two ways:
 *                         queryDefinition — QueryDefinition/_execute FindById
 *                                           per IQA (structured), sampled
 *                         blob            — FindDescendantDocumentsInFolder,
 *                                           NRBF blobs, text and binary keys
 *   BOD                 business object value lists (msprop:ValueListQuery)
 *   COM                 communication templates
 *   BOEntityDefinition  panel sources' value-list rules (not every business
 *                       object; business objects are BOD)
 *   TaskDefinition      alerts and Process Automation tasks
 *
 * ASI's own top-level folders are skipped (CONFIG.systemFolders) unless
 * includeSystemFolders is true: stock content cannot refer to your IQAs.
 *
 * Usage
 *   window.WHERE_USED_PROBE_CONFIG = { target: '$/_i4u_/…/My IQA', mode: 'lazy' };  // or 'analysis'
 *   …paste this file…
 *   await window.whereUsedProbe.done;
 *   window.whereUsedProbe.abort();
 *   copy(JSON.stringify(window.whereUsedProbe.result, null, 2));
 * ========================================================================== */
(function () {
  'use strict';

  const CONFIG = Object.assign({
    target: '$/_i4u_/Core/Membership/Workbenches/Workbench List',
    // 'lazy'     — what a "Check where used" option would do for one IQA:
    //              no catalogue, no gap analysis, sources overlapping.
    // 'analysis' — one source at a time, with the IQA catalogue, so the
    //              reference contract names every IQA (for the deployer).
    mode: 'lazy',
    lazyParallelSources: 3,
    // Optional: an IQA whose sources to show first (path). inspectOnly stops there.
    inspect: '',
    inspectOnly: false,
    sources: ['CON', 'IQD', 'BOD', 'COM', 'BOEntityDefinition', 'TaskDefinition'],
    // 'queryDefinition' (analysis only) reads one IQA per request; v2 put all
    // of them at about 49 s against 4.3 s for the blobs.
    iqdMethods: ['blob'],
    // IQAs read through QueryDefinition, spread evenly across the catalogue.
    // The time for all of them is extrapolated. Infinity reads every one.
    queryDefinitionSample: 300,
    queryDefinitionConcurrency: 8,
    // Top-level folders supplied by ASI. Compared case-insensitively.
    systemFolders: ['$/Samples', '$/Common', '$/ContactManagement', '$/Fundraising', '@/iCore', '@/iSamples'],
    includeSystemFolders: false,
    // Lists the content pages the folder-by-folder read misses, and why.
    conGapAnalysis: true,
    documentStatus: 40,
    pageSize: 100,
    concurrency: 4
  }, window.WHERE_USED_PROBE_CONFIG || {});

  const abort = new AbortController();
  const LOG = '[where-used probe]';
  const now = () => performance.now();
  const round = value => Math.round(value);
  const seconds = ms => Math.round(ms / 100) / 10;
  const mb = bytes => Math.round(bytes / 1048576 * 100) / 100;
  const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const NULL_GUID = '00000000-0000-0000-0000-000000000000';

  /* ---------------------------------------------------------------------------
   * Requests
   * ------------------------------------------------------------------------ */
  function token() {
    const field = document.getElementById('__RequestVerificationToken') ||
      document.querySelector('input[name="__RequestVerificationToken"]');
    return field ? field.value : '';
  }

  // Every call is measured into the meter it is given.
  async function api(meter, method, path, body) {
    const started = now();
    const response = await fetch(location.origin + '/api/' + path, {
      method,
      credentials: 'same-origin',
      signal: abort.signal,
      headers: Object.assign(
        { Accept: 'application/json', RequestVerificationToken: token() },
        body === undefined ? {} : { 'Content-Type': 'application/json' }
      ),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    if (meter) {
      meter.requests++;
      meter.bytes += text.length;
      meter.networkMs += now() - started;
    }
    if (!response.ok) throw new Error(method + ' /api/' + path + ' → HTTP ' + response.status + ' ' + text.slice(0, 200));
    return text ? JSON.parse(text) : null;
  }

  // Same envelope as the deployer's execDocument (iMIS Content Deployment).
  function execute(meter, entity, operation, values, typeNames) {
    return api(meter, 'POST', entity + '/_execute', {
      $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
      OperationName: operation,
      EntityTypeName: entity,
      Parameters: {
        $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
        $values: values
      },
      ParameterTypeName: {
        $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
        $values: typeNames
      },
      UseJson: false
    });
  }

  // "Not found" is HTTP 200 with Result null; never treat the envelope as a hit.
  function unwrap(data) {
    if (data && 'Result' in data && data.Result == null) return null;
    return data?.Result?.$values ?? data?.Result ?? data?.$values ?? data;
  }

  const asList = value => Array.isArray(value) ? value : value ? [value] : [];
  const published = { $type: 'System.Boolean', $value: true };

  // Runs tasks with a fixed number in flight; results keep their order.
  async function pool(items, limit, task) {
    const results = new Array(items.length);
    let next = 0;
    async function worker() {
      while (next < items.length) {
        if (abort.signal.aborted) throw new DOMException('Aborted', 'AbortError');
        const index = next++;
        results[index] = await task(items[index], index);
      }
    }
    await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
    return results;
  }

  // Reads a whole paged collection: one request for the count, then the rest
  // in parallel. Each page's items go to onItems as they arrive.
  // BOEntityDefinition reports TotalCount as the size of the page it returned,
  // with HasNext false and NextOffset 0, even when more follow (100 then 69 on
  // the dev tenant). A full page whose TotalCount is no larger than itself is
  // therefore followed page by page until a short page.
  async function readPaged(meter, base, onItems) {
    const join = base.includes('?') ? '&' : '?';
    const page = offset => api(meter, 'GET', base + join + 'Limit=' + CONFIG.pageSize + '&Offset=' + offset);
    const first = await page(0);
    const firstItems = first?.Items?.$values || [];
    const total = first?.TotalCount ?? 0;
    onItems(firstItems);
    if (total <= firstItems.length && (first?.HasNext || firstItems.length >= CONFIG.pageSize)) {
      let read = firstItems.length;
      for (;;) {
        const items = (await page(read))?.Items?.$values || [];
        if (!items.length) break;
        read += items.length;
        onItems(items);
        if (items.length < CONFIG.pageSize) break;
      }
      return read;
    }
    const offsets = [];
    for (let offset = CONFIG.pageSize; offset < total; offset += CONFIG.pageSize) offsets.push(offset);
    await pool(offsets, CONFIG.concurrency, async offset => onItems((await page(offset))?.Items?.$values || []));
    return total;
  }

  /* ---------------------------------------------------------------------------
   * Document fields (defensive: summaries and documents name them differently)
   * ------------------------------------------------------------------------ */
  const field = (doc, ...names) => {
    for (const name of names) {
      const value = doc?.[name];
      if (value != null && value !== '') return typeof value === 'object' && '$value' in value ? value.$value : value;
    }
    return '';
  };
  const typeOf = doc => String(field(doc, 'DocumentTypeId', 'DocumentTypeCode')).toUpperCase();
  const nameOf = doc => String(field(doc, 'AlternateName', 'Name', 'DocumentName'));
  const versionKeyOf = doc => String(field(doc, 'DocumentVersionId', 'DocumentVersionKey')).toLowerCase();
  const documentKeyOf = doc => String(field(doc, 'DocumentId', 'DocumentKey')).toLowerCase();
  const blobOf = doc => String(doc?.Data?.$value ?? doc?.Blob ?? '');
  const statusOf = doc => {
    const status = doc?.Status;
    return typeof status === 'object' && status ? String(status.Name || status.Description || status.$value || '') : String(status ?? '');
  };
  const retired = doc => /archiv|recycl|delet/i.test(statusOf(doc));

  // Working documents report a truncated Path (folder and trailing slash).
  function pathOf(doc) {
    const path = String(field(doc, 'Path', 'FullPath'));
    if (path && !path.endsWith('/')) return path;
    const folder = String(field(doc, 'FolderPath') || path).replace(/\/+$/, '');
    const name = String(field(doc, 'Name'));
    return folder && name ? folder + '/' + name : path;
  }

  const normalPath = value => String(value || '').trim().replace(/\/+$/, '').toLowerCase();
  const systemFolders = new Set(CONFIG.systemFolders.map(normalPath));
  function isSystemPath(path) {
    if (CONFIG.includeSystemFolders) return false;
    const lower = normalPath(path);
    for (const folder of systemFolders) if (lower === folder || lower.startsWith(folder + '/')) return true;
    return false;
  }

  /* ---------------------------------------------------------------------------
   * Reference extraction — the part to port to the deployer's reference checks.
   * Each extractor visits every candidate value with the property holding it:
   * XML text-only elements and attributes, or JSON strings with a key path.
   * ------------------------------------------------------------------------ */
  const TEXT_ELEMENT = /<(?:[A-Za-z_][\w.-]*:)?([A-Za-z_][\w.-]*)\b[^>]*>([^<]+)<\/(?:[A-Za-z_][\w.-]*:)?\1\s*>/g;
  const ATTRIBUTE = /\s((?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*)\s*=\s*(["'])([^"']*)\2/g;
  const CONTENT_ITEM_OPEN = /<(?:[A-Za-z_][\w.-]*:)?ContentItem\b[^>]*>/gi;

  const xmlUnescape = value => String(value || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
  const localName = tag => String(tag || '').replace(/^[A-Za-z_][\w.-]*:/, '');

  // Serialised arrays name their items generically (<string>); the parent
  // element is what says what they are. v2 reported COM paths as "string".
  const GENERIC_ELEMENT = /^(string|anyType|guid|Value|Item)$/i;

  function parentElement(xml, index) {
    const before = xml.slice(Math.max(0, index - 4000), index);
    const tags = before.match(/<\/?(?:[A-Za-z_][\w.-]*:)?[A-Za-z_][\w.-]*\b[^>]*>/g) || [];
    const stack = [];
    for (const tag of tags) {
      if (/\/\s*>$/.test(tag)) continue;
      const name = localName(tag.match(/^<\/?([^\s>/]+)/)[1]);
      if (tag[1] === '/') {
        const open = stack.lastIndexOf(name);
        if (open !== -1) stack.length = open;
      } else {
        stack.push(name);
      }
    }
    return stack.length ? stack[stack.length - 1] : '?';
  }

  function xmlValues(xml, visit) {
    let match;
    TEXT_ELEMENT.lastIndex = 0;
    while ((match = TEXT_ELEMENT.exec(xml))) {
      const name = localName(match[1]);
      const value = xmlUnescape(match[2]).trim();
      const candidate = value.startsWith('$/') || GUID.test(value);
      visit(candidate && GENERIC_ELEMENT.test(name) ? parentElement(xml, match.index) + '/' + name : name, value, match.index);
    }
    ATTRIBUTE.lastIndex = 0;
    while ((match = ATTRIBUTE.exec(xml))) {
      if (/^xmlns\b/i.test(match[1])) continue;
      visit('@' + match[1], xmlUnescape(match[3]).trim(), match.index);
    }
  }

  // NRBF (IQA blobs) stores each string as a 7-bit length then UTF-8 bytes,
  // with no property names, so whole $/ paths and 36-character key strings
  // are read by their length prefix. Keys stored as binary Guids are only
  // found by the target's needles.
  function nrbfValues(binary, visit) {
    let at = binary.indexOf('$/');
    while (at !== -1) {
      let length = 0;
      if (at >= 2 && (binary.charCodeAt(at - 2) & 0x80)) length = (binary.charCodeAt(at - 2) & 0x7f) | (binary.charCodeAt(at - 1) << 7);
      else if (at >= 1) length = binary.charCodeAt(at - 1);
      if (length > 2 && length < 2048) visit('NRBF string', utf8(binary.slice(at, at + length)).trim(), -1);
      at = binary.indexOf('$/', at + 2);
    }
    const keys = /\x24([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/g;
    let match;
    while ((match = keys.exec(binary))) visit('NRBF key string', match[1], -1);
  }

  // Key paths drop the $values/$value wrappers: Properties.Rule.Query.Criteria.Values
  function jsonValues(value, visit, path) {
    if (typeof value === 'string') { visit(path || '(value)', value.trim(), -1); return; }
    if (Array.isArray(value)) { value.forEach(item => jsonValues(item, visit, path)); return; }
    if (!value || typeof value !== 'object') return;
    for (const [key, child] of Object.entries(value)) {
      if (key === '$type') continue;
      // Embedded blobs are searched as blobs, not walked as strings.
      if (child && typeof child === 'object' && /Byte\[\]/.test(String(child.$type || ''))) continue;
      const next = key === '$values' || key === '$value' ? path : (path ? path + '.' + key : key);
      jsonValues(child, visit, next);
    }
  }

  // Content-item ownership for a hit, as the deployer's conPathReferences does.
  function contentItemAt(xml, index) {
    let owner = '', match;
    CONTENT_ITEM_OPEN.lastIndex = 0;
    while ((match = CONTENT_ITEM_OPEN.exec(xml)) && match.index <= index) {
      if (/\/\s*>$/.test(match[0])) continue;
      const named = xml.slice(match.index, match.index + 4000).match(/<(?:[A-Za-z_][\w.-]*:)?ContentItemName\b[^>]*>([^<]*)</i);
      owner = named ? xmlUnescape(named[1]).trim() : '';
    }
    return owner;
  }

  /* ---------------------------------------------------------------------------
   * Target, its folders and the IQA catalogue
   * ------------------------------------------------------------------------ */
  const state = {
    target: null,
    targetPath: '',
    targetKeys: new Set(),
    ancestors: new Set(),
    iqaByPath: new Map(),
    iqaByKey: new Map(),
    needles: { text: [], binary: [] }
  };

  // Classifies one candidate value. Keys only count when they belong to an IQA.
  function classify(value) {
    if (!value) return null;
    if (/^\$\/\S/.test(value)) {
      const lower = normalPath(value);
      return {
        kind: 'path',
        resolves: state.iqaByPath.has(lower) ? 'IQA' : 'folder or missing IQA',
        target: lower === state.targetPath,
        viaFolder: state.ancestors.has(lower),
        iqa: state.iqaByPath.get(lower)?.path || ''
      };
    }
    if (GUID.test(value) && value.toLowerCase() !== NULL_GUID) {
      const lower = value.toLowerCase();
      const iqa = state.iqaByKey.get(lower);
      if (!iqa && !state.targetKeys.has(lower)) return null;
      return { kind: 'key', resolves: 'IQA', target: state.targetKeys.has(lower), viaFolder: false, iqa: iqa ? iqa.path : state.target.path };
    }
    return null;
  }

  async function resolveTarget(meter) {
    const found = unwrap(await execute(meter, 'Document', 'FindByPath', [CONFIG.target], ['System.String']));
    if (!found || Array.isArray(found)) throw new Error('Target not found (published IQA expected): ' + CONFIG.target);
    const path = pathOf(found) || CONFIG.target;
    state.target = { path, type: typeOf(found), versionKey: versionKeyOf(found), documentKey: documentKeyOf(found) };
    state.targetPath = normalPath(path);
    [state.target.versionKey, state.target.documentKey].filter(Boolean).forEach(key => state.targetKeys.add(key));
    const parts = path.split('/');
    for (let length = parts.length - 1; length > 1; length--) state.ancestors.add(normalPath(parts.slice(0, length).join('/')));
    state.needles = buildNeedles(path, state.target.versionKey, state.target.documentKey);
  }

  // Every IQA with its path and keys, so key references can be named.
  async function loadCatalogue(meter) {
    const started = now();
    const rows = [];
    const total = await readPaged(meter, 'DocumentSummary?DocumentTypeId=IQD', items => rows.push(...items));
    let live = 0, system = 0;
    for (const row of rows) {
      if (retired(row)) continue;
      const entry = { path: pathOf(row), versionKey: versionKeyOf(row), documentKey: documentKeyOf(row), name: nameOf(row) };
      entry.system = isSystemPath(entry.path);
      live++;
      if (entry.system) system++;
      state.iqaByPath.set(normalPath(entry.path), entry);
      if (entry.versionKey) state.iqaByKey.set(entry.versionKey, entry);
      if (entry.documentKey) state.iqaByKey.set(entry.documentKey, entry);
    }
    return { totalCount: total, liveIqas: live, inSystemFolders: system, wallSeconds: seconds(now() - started) };
  }

  /* ---------------------------------------------------------------------------
   * Needles: raw text and binary search, for what structure cannot see
   * (encoded paths inside Content HTML, keys inside NRBF blobs).
   * ------------------------------------------------------------------------ */
  function guidBytes(guid) {
    const hex = String(guid).replace(/-/g, '');
    if (!/^[0-9a-f]{32}$/i.test(hex)) return '';
    const bytes = hex.match(/../g).map(pair => parseInt(pair, 16));
    return [3, 2, 1, 0, 5, 4, 7, 6, 8, 9, 10, 11, 12, 13, 14, 15].map(index => String.fromCharCode(bytes[index])).join('');
  }

  const utf8Binary = text => unescape(encodeURIComponent(text));

  function buildNeedles(path, versionKey, documentKey) {
    const text = new Map();
    const add = (label, value) => {
      const key = value ? utf8Binary(value).toLowerCase() : '';
      if (key && !text.has(key)) text.set(key, label);
    };
    add('path', path);
    add('path (XML-escaped)', path.replace(/&/g, '&amp;').replace(/'/g, '&#39;'));
    add('path (URL-encoded)', encodeURIComponent(path));
    add('path (URI-encoded)', encodeURI(path));
    add('path (spaces as +)', encodeURIComponent(path).replace(/%20/g, '+'));
    add('DocumentVersionKey', versionKey);
    add('DocumentKey', documentKey);
    const binary = [
      { label: 'DocumentVersionKey (binary Guid)', value: guidBytes(versionKey) },
      { label: 'DocumentKey (binary Guid)', value: guidBytes(documentKey) }
    ].filter(needle => needle.value);
    return { text: [...text].map(([value, label]) => ({ value, label })), binary };
  }

  function needleMatches(binary) {
    const lower = binary.toLowerCase();
    const found = state.needles.text.filter(needle => lower.includes(needle.value)).map(needle => needle.label);
    state.needles.binary.forEach(needle => { if (binary.includes(needle.value)) found.push(needle.label); });
    return found;
  }

  function formatOf(binary) {
    const first = binary.charCodeAt(0);
    if (binary.startsWith('ï»¿<') || first === 0x3c) return 'xml';
    if (first === 0x7b || first === 0x5b) return 'json';
    if (binary.startsWith('ÿþ') || binary.startsWith('þÿ')) return 'utf-16';
    if (first === 0x1f && binary.charCodeAt(1) === 0x8b) return 'gzip';
    if (first === 0x00 && binary.charCodeAt(1) === 0x01 && binary.charCodeAt(5) === 0xff) return 'nrbf';
    return binary.length ? 'other' : 'empty';
  }

  function utf8(binary) {
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return new TextDecoder('utf-8', { ignoreBOM: true }).decode(bytes);
  }

  /* ---------------------------------------------------------------------------
   * One source's findings
   * ------------------------------------------------------------------------ */
  function report(source, method) {
    return {
      source,
      method,
      meter: { requests: 0, bytes: 0, networkMs: 0 },
      started: now(),
      items: 0,
      skippedSystem: 0,
      processMs: 0,
      formats: {},
      contract: new Map(),
      indexed: new Set(),
      hits: [],
      notes: [],
      seen: new Set()
    };
  }

  // Records one candidate value against the contract, the index and the hits.
  function record(findings, property, value, hit) {
    const found = classify(value);
    if (!found) return;
    // An IQA's own definition names itself; that is not a reference.
    if (found.iqa && found.iqa.toLowerCase() === findings.self) return;
    const key = property + '|' + found.kind + '|' + found.resolves;
    const entry = findings.contract.get(key) || { property, kind: found.kind, resolves: found.resolves, count: 0, sample: value };
    entry.count++;
    findings.contract.set(key, entry);
    if (found.iqa) findings.indexed.add(found.iqa.toLowerCase());
    if (found.target || found.viaFolder) hit(property, found);
  }

  // Scans one document or entity. `content` is either a blob (base64) or an
  // object (JSON entity), `label` names it in the hits.
  function scanItem(findings, label, content, versionKey) {
    if (versionKey) {
      if (findings.seen.has(versionKey)) return;
      findings.seen.add(versionKey);
    }
    findings.items++;
    findings.self = versionKey ? (state.iqaByKey.get(versionKey)?.path || '').toLowerCase() : '';
    const started = now();
    const places = [];
    let xml = null;
    const hit = (property, found, index) => {
      const owner = index >= 0 && xml ? contentItemAt(xml, index) : '';
      places.push((owner ? owner + ' · ' : '') + property + (found.viaFolder ? ' (via folder)' : ''));
    };

    let matched = [];
    if (typeof content === 'string') {
      let binary = '';
      try { binary = content ? atob(content.replace(/\s+/g, '')) : ''; } catch { binary = ''; }
      const format = formatOf(binary);
      findings.formats[format] = (findings.formats[format] || 0) + 1;
      if (binary) {
        matched = needleMatches(binary);
        if (format === 'xml') {
          xml = utf8(binary);
          xmlValues(xml, (property, value, index) => record(findings, property, value, (p, f) => hit(p, f, index)));
        } else if (format === 'json') {
          try { jsonValues(JSON.parse(utf8(binary)), (property, value) => record(findings, property, value, (p, f) => hit(p, f, -1))); }
          catch { findings.formats['json (unparsed)'] = (findings.formats['json (unparsed)'] || 0) + 1; }
        } else if (format === 'nrbf') {
          nrbfValues(binary, (property, value) => record(findings, property, value, (p, f) => hit(p, f, -1)));
        }
      }
    } else if (content) {
      const text = JSON.stringify(content);
      matched = state.needles.text.filter(needle => text.toLowerCase().includes(needle.value)).map(needle => needle.label);
      jsonValues(content, (property, value) => record(findings, property, value, (p, f) => hit(p, f, -1)));
    }

    const isSelf = versionKey && versionKey === state.target.versionKey;
    if ((matched.length || places.length) && !isSelf) {
      findings.hits.push({
        label: label.label,
        name: label.name,
        matchedBy: matched.join(', ') || 'structure only',
        where: [...new Set(places)].join('; ') || '(text match only)',
        versionKey: versionKey || ''
      });
    }
    findings.processMs += now() - started;
  }

  const indexedBySource = new Map();

  // Value-list IQAs named by business objects (BOD) and by panel sources
  // (BOEntityDefinition). They are different objects, but a panel source also
  // generates a vBo_ business object, so some overlap is expected.
  function valueListOverlap() {
    const documents = indexedBySource.get('BOD'), entities = indexedBySource.get('BOEntityDefinition');
    if (!documents || !entities) return null;
    return {
      inBoth: [...documents].filter(path => entities.has(path)).length,
      onlyInBOD: [...documents].filter(path => !entities.has(path)),
      onlyInBOEntityDefinition: [...entities].filter(path => !documents.has(path))
    };
  }

  function summarise(findings) {
    indexedBySource.set(findings.source, findings.indexed);
    const contract = [...findings.contract.values()].sort((a, b) => b.count - a.count);
    return {
      source: findings.source,
      method: findings.method,
      wallSeconds: seconds(now() - findings.started),
      requests: findings.meter.requests,
      items: findings.items,
      skippedSystem: findings.skippedSystem,
      responseMB: mb(findings.meter.bytes),
      // Summed per request; concurrent requests overlap, so this can exceed wall time.
      networkMsSummed: round(findings.meter.networkMs),
      processMs: round(findings.processMs),
      distinctIqasReferenced: findings.indexed.size,
      hits: findings.hits,
      contract: contract.slice(0, 40),
      formats: findings.formats,
      notes: findings.notes
    };
  }

  /* ---------------------------------------------------------------------------
   * Sources
   * ------------------------------------------------------------------------ */
  // Documents of one type by folder, skipping system top-level folders.
  async function scanByFolder(findings, type, rootPath) {
    const root = unwrap(await execute(findings.meter, 'Document', 'FindByPath', [rootPath], ['System.String']));
    const rootId = field(root, 'DocumentId', 'DocumentVersionId');
    if (!rootId) throw new Error('FindByPath("' + rootPath + '") did not resolve the root folder');
    const folderType = type === 'CON' ? 'CFL' : 'FOL';
    const children = asList(unwrap(await execute(findings.meter, 'Document', 'FindDocumentsInFolder',
      [rootId, { $type: 'System.String[], mscorlib', $values: [type, folderType] }, published],
      ['System.String', 'System.String[]', 'System.Boolean'])));
    const keys = new Set();
    const scanDoc = doc => {
      keys.add(versionKeyOf(doc));
      scanItem(findings, { label: pathOf(doc), name: nameOf(doc) }, blobOf(doc), versionKeyOf(doc));
    };
    children.filter(doc => typeOf(doc) === type).forEach(scanDoc);
    const folders = children.filter(doc => typeOf(doc) === folderType);
    const read = folders.filter(folder => {
      if (!isSystemPath(pathOf(folder))) return true;
      findings.notes.push('Skipped system folder ' + pathOf(folder));
      return false;
    });
    findings.skippedSystem = folders.length - read.length;
    await pool(read, CONFIG.concurrency, async folder => {
      try {
        const docs = asList(unwrap(await execute(findings.meter, 'Document', 'FindDescendantDocumentsInFolder',
          [field(folder, 'DocumentId', 'DocumentVersionId'), type, published], ['System.String', 'System.String', 'System.Boolean'])));
        docs.filter(doc => !typeOf(doc) || typeOf(doc) === type).forEach(scanDoc);
      } catch (error) {
        findings.notes.push('Folder ' + pathOf(folder) + ': ' + error.message);
      }
    });
    return keys;
  }

  // Documents of one type in pages; Path is not returned this way.
  async function scanPaged(findings, type) {
    let status = CONFIG.documentStatus;
    const base = () => 'Document?DocumentTypeId=' + encodeURIComponent(type) + (status == null ? '' : '&DocumentStatusID=' + status);
    const first = await api(findings.meter, 'GET', base() + '&Limit=1&Offset=0');
    if (!first?.TotalCount && status != null) {
      findings.notes.push('No ' + type + ' at DocumentStatusID=' + status + '; read without a status filter instead.');
      status = null;
    }
    const keys = new Set();
    const total = await readPaged(findings.meter, base(), items => {
      const strays = items.filter(doc => typeOf(doc) && typeOf(doc) !== type);
      if (strays.length) throw new Error('DocumentTypeId=' + type + ' was not honoured (got ' + typeOf(strays[0]) + ')');
      items.forEach(doc => {
        keys.add(versionKeyOf(doc));
        scanItem(findings, { label: type + ' ' + versionKeyOf(doc), name: nameOf(doc) }, blobOf(doc), versionKeyOf(doc));
      });
    });
    findings.notes.push('TotalCount ' + total + (status == null ? ' (all statuses)' : ' (status ' + status + ')'));
    return keys;
  }

  // Names paged hits, since paged documents carry no Path.
  async function nameHits(findings) {
    await pool(findings.hits.filter(hit => hit.versionKey && /^[A-Z]{3} /.test(hit.label)), CONFIG.concurrency, async hit => {
      try {
        const data = await api(findings.meter, 'GET', 'DocumentSummary?DocumentVersionId=' + encodeURIComponent(hit.versionKey) + '&Limit=5');
        const row = (data?.Items?.$values || []).find(item => !retired(item)) || data?.Items?.$values?.[0];
        if (row) hit.label = pathOf(row);
      } catch { /* keep the key as the label */ }
    });
  }

  async function sourceCON() {
    const findings = report('CON', 'by folder');
    const folderKeys = await scanByFolder(findings, 'CON', '@/');
    const result = summarise(findings);
    if (CONFIG.conGapAnalysis && CONFIG.mode === 'analysis') result.gap = await conGap(folderKeys);
    return result;
  }

  // Which published pages the folder read misses, and where they live.
  async function conGap(folderKeys) {
    const meter = { requests: 0, bytes: 0, networkMs: 0 };
    const started = now();
    const paged = new Map();
    await readPaged(meter, 'Document?DocumentTypeId=CON&DocumentStatusID=' + CONFIG.documentStatus,
      items => items.forEach(doc => paged.set(versionKeyOf(doc), doc)));
    const missing = [...paged.keys()].filter(key => !folderKeys.has(key));
    const sample = missing.slice(0, 25);
    const rows = await pool(sample, CONFIG.concurrency, async key => {
      try {
        const data = await api(meter, 'GET', 'DocumentSummary?DocumentVersionId=' + encodeURIComponent(key) + '&Limit=5');
        const row = data?.Items?.$values?.[0];
        return { name: nameOf(paged.get(key)), path: row ? pathOf(row) : '', status: row ? statusOf(row) : '', system: row ? isSystemPath(pathOf(row)) : null };
      } catch (error) {
        return { name: nameOf(paged.get(key)), error: error.message };
      }
    });
    const topFolders = {};
    rows.forEach(row => {
      const top = String(row.path || '').split('/').slice(0, 2).join('/') || '(unknown)';
      topFolders[top] = (topFolders[top] || 0) + 1;
    });
    return {
      publishedPaged: paged.size,
      readByFolder: folderKeys.size,
      // Includes pages in skipped system folders; the sample marks them.
      notReadByFolder: missing.length,
      onlyInFolderRead: [...folderKeys].filter(key => key && !paged.has(key)).length,
      sampleTopFolders: topFolders,
      sample: rows,
      seconds: seconds(now() - started),
      responseMB: mb(meter.bytes)
    };
  }

  async function sourceIQDBlob() {
    const findings = report('IQD', 'blob by folder');
    await scanByFolder(findings, 'IQD', '$/');
    return summarise(findings);
  }

  // Structured definitions, one request per IQA, sampled evenly. v2 used
  // FindById with the key as System.Object and got no definition for any of
  // 300 IQAs; FindByPath with a System.String path is the documented,
  // confirmed form.
  async function sourceIQDQueryDefinition() {
    const findings = report('IQD', 'QueryDefinition FindByPath');
    const candidates = [...new Map([...state.iqaByPath.values()].map(entry => [entry.versionKey, entry])).values()]
      .filter(entry => entry.versionKey && entry.versionKey !== state.target.versionKey && !entry.system);
    const sampleSize = Math.min(CONFIG.queryDefinitionSample, candidates.length);
    const step = candidates.length / Math.max(sampleSize, 1);
    const sample = Array.from({ length: sampleSize }, (_, index) => candidates[Math.floor(index * step)]);
    const shapes = new Set();
    await pool(sample, CONFIG.queryDefinitionConcurrency, async entry => {
      try {
        const data = await execute(findings.meter, 'QueryDefinition', 'FindByPath',
          [{ $type: 'System.String', $value: entry.path }], ['System.String']);
        const result = unwrap(data);
        if (!result || typeof result !== 'object') { findings.notes.push('No definition for ' + entry.path); return; }
        (result.Sources?.$values || []).forEach(source => shapes.add(Object.keys(source).filter(key => key !== '$type').join(',')));
        scanItem(findings, { label: entry.path, name: entry.name }, result, entry.versionKey);
      } catch (error) {
        findings.notes.push(entry.path + ': ' + error.message);
      }
    });
    const result = summarise(findings);
    const wall = now() - findings.started;
    result.sampled = sampleSize;
    result.eligibleIqas = candidates.length;
    result.estimatedSecondsForAll = sampleSize ? seconds(wall * candidates.length / sampleSize) : null;
    result.sourceFieldShapes = [...shapes];
    return result;
  }

  async function sourceDocumentsPaged(type) {
    const findings = report(type, 'paged documents');
    await scanPaged(findings, type);
    await nameHits(findings);
    return summarise(findings);
  }

  // A REST entity collection, read whole; the first item's shape is reported.
  async function sourceEntity(entity) {
    const findings = report(entity, 'GET collection');
    let shape = null;
    await readPaged(findings.meter, entity, items => {
      if (!shape && items[0]) shape = { $type: items[0].$type, keys: Object.keys(items[0]).filter(key => key !== '$type') };
      items.forEach(item => {
        const label = String(field(item, 'Name', 'EntityTypeName', 'TaskDefinitionId', 'Description') || entity);
        const id = String(field(item, 'TaskDefinitionId', 'EntityTypeName', 'Id') || '').toLowerCase();
        scanItem(findings, { label: entity + ': ' + label, name: label }, item, id ? entity + ':' + id : '');
      });
    });
    const result = summarise(findings);
    result.shape = shape;
    return result;
  }

  // Shows how one IQA records its sources: the structured QueryDefinition view
  // and the paths and key strings inside its NRBF blob. Used to learn how an
  // IQA-as-source is stored, and which IQA to target to find it.
  async function inspectQuery(path) {
    const inspected = { path };
    try {
      const definition = unwrap(await execute(null, 'QueryDefinition', 'FindByPath',
        [{ $type: 'System.String', $value: path }], ['System.String']));
      inspected.sources = (definition?.Sources?.$values || []).map(source => {
        const { $type, ...rest } = source;
        return rest;
      });
    } catch (error) {
      inspected.sourcesError = error.message;
    }
    try {
      const doc = unwrap(await execute(null, 'Document', 'FindByPath', [path], ['System.String']));
      const binary = atob(blobOf(doc).replace(/\s+/g, ''));
      const strings = [];
      nrbfValues(binary, (property, value) => strings.push({ property, value }));
      inspected.blobStrings = strings;
    } catch (error) {
      inspected.blobError = error.message;
    }
    return inspected;
  }

  /* ---------------------------------------------------------------------------
   * Run
   * ------------------------------------------------------------------------ */
  async function main() {
    if (!token()) console.warn(LOG, 'No RequestVerificationToken on this page; requests may be refused.');
    const started = now();
    const result = { site: location.origin, startedAt: new Date().toISOString(), config: CONFIG, sources: [] };

    if (CONFIG.inspect) {
      result.inspected = await inspectQuery(CONFIG.inspect);
      console.log(LOG, 'Inspected', CONFIG.inspect);
      if (result.inspected.sources) console.table(result.inspected.sources);
      if (result.inspected.blobStrings) console.table(result.inspected.blobStrings);
      if (result.inspected.sourcesError || result.inspected.blobError) console.warn(LOG, result.inspected.sourcesError, result.inspected.blobError);
      if (CONFIG.inspectOnly) return result;
    }

    const setup = { requests: 0, bytes: 0, networkMs: 0 };
    await resolveTarget(setup);
    result.target = Object.assign({ folders: [...state.ancestors] }, state.target);
    console.log(LOG, 'Mode:', CONFIG.mode, '· target', result.target);

    // The catalogue only names keys for the contract. A lazy check knows its
    // own IQA's keys, so it skips the catalogue (11.7 s in v2).
    if (CONFIG.mode === 'analysis') {
      console.log(LOG, 'Loading the IQA catalogue…');
      result.catalogue = await loadCatalogue(setup);
      console.log(LOG, 'Catalogue', result.catalogue);
    }

    const runs = [];
    for (const source of CONFIG.sources) {
      if (source === 'CON') runs.push(['CON', sourceCON]);
      else if (source === 'IQD') {
        if (CONFIG.iqdMethods.includes('blob')) runs.push(['IQD via blobs', sourceIQDBlob]);
        if (CONFIG.iqdMethods.includes('queryDefinition') && CONFIG.mode === 'analysis') runs.push(['IQD via QueryDefinition', sourceIQDQueryDefinition]);
      } else if (source === 'BOD' || source === 'COM') runs.push([source, () => sourceDocumentsPaged(source)]);
      else runs.push([source, () => sourceEntity(source)]);
    }

    async function runOne([name, run]) {
      console.log(LOG, 'Source:', name, '…');
      try {
        const outcome = await run();
        // When it finished, counted from the start of the check: the moment a
        // lazy check could show this source's results.
        outcome.finishedAfterSeconds = seconds(now() - started);
        result.sources.push(outcome);
        const { hits, contract, formats, notes, gap, shape, sourceFieldShapes, ...summary } = outcome;
        console.table([summary]);
        if (hits.length) console.table(hits.map(({ versionKey: _, ...hit }) => hit));
        else console.log(LOG, name, 'found no references to the target.');
        if (CONFIG.mode === 'analysis' && contract.length) console.table(contract);
        if (gap) console.log(LOG, 'CON gap', gap);
        if (shape) console.log(LOG, name, 'shape', shape);
        if (sourceFieldShapes) console.log(LOG, name, 'source field shapes', sourceFieldShapes);
        if (notes.length) console.log(LOG, name, 'notes', notes);
      } catch (error) {
        if (error.name === 'AbortError') throw error;
        console.error(LOG, name, 'failed', error);
        result.sources.push({ source: name, error: error.message, finishedAfterSeconds: seconds(now() - started) });
      }
    }

    // Lazy: sources overlap, as the real check would. Analysis: one at a time,
    // so each source's timing is its own.
    await pool(runs, CONFIG.mode === 'lazy' ? CONFIG.lazyParallelSources : 1, runOne);

    if (CONFIG.mode === 'analysis') result.valueListOverlap = valueListOverlap(result.sources);

    result.totalSeconds = seconds(now() - started);
    result.finishedAt = new Date().toISOString();
    console.table(result.sources.map(source => ({
      source: source.source,
      method: source.method || '',
      finishedAfter: source.finishedAfterSeconds ?? '',
      seconds: source.wallSeconds ?? '',
      items: source.items ?? '',
      MB: source.responseMB ?? '',
      hits: source.hits ? source.hits.length : '',
      error: source.error || ''
    })));
    if (result.valueListOverlap) console.log(LOG, 'Value-list IQAs, BOD v BOEntityDefinition', result.valueListOverlap);
    console.log(LOG, 'Done in', result.totalSeconds, 's. Full result: window.whereUsedProbe.result');
    return result;
  }

  const probe = { config: CONFIG, result: null, abort: () => abort.abort(), done: null };
  probe.done = main().then(
    result => { probe.result = result; return result; },
    error => {
      console.error(LOG, error.name === 'AbortError' ? 'Aborted.' : error);
      probe.result = { error: error.message };
      return probe.result;
    }
  );
  window.whereUsedProbe = probe;
})();
