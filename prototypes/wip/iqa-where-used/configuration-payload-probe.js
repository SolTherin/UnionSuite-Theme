/* =============================================================================
 * i4u_UT_Configuration Payload probe — WRITES ONE TEST ROW, then deletes it.
 * -----------------------------------------------------------------------------
 * Proves the shared where-used index can live in i4u_UT_Configuration.Payload
 * (varbinary(MAX)) before anything depends on it:
 *   1. How rows and the Payload field come back from GET.
 *   2. Creating a standalone row (no contact) with a gzip payload.
 *   3. Updating it with larger payloads and reading each back byte for byte.
 *   4. Deleting the test row (unless cleanup is false).
 *
 * The test row is Module System / Category IQA / Code WhereUsedProbe, with a
 * description saying it is safe to delete. No other row is touched.
 *
 * Run it in the DevTools console of a signed-in iMIS staff page:
 *   window.CONFIG_PAYLOAD_PROBE = { cleanup: true };   // optional
 *   …paste this file…
 *   await window.configPayloadProbe.done;
 *   copy(JSON.stringify(window.configPayloadProbe.result, null, 2));
 * ========================================================================== */
(function () {
  'use strict';

  const CONFIG = Object.assign({
    entity: 'i4u_UT_Configuration',
    module: 'System',
    category: 'IQA',
    code: 'WhereUsedProbe',
    // Compressed payload sizes to round-trip, in bytes. The real index is
    // expected to be 50–150 KB compressed.
    sizes: [1024, 150 * 1024, 1024 * 1024],
    cleanup: true
  }, window.CONFIG_PAYLOAD_PROBE || {});

  const LOG = '[payload probe]';
  const now = () => performance.now();
  const round = value => Math.round(value);

  function token() {
    const field = document.getElementById('__RequestVerificationToken') ||
      document.querySelector('input[name="__RequestVerificationToken"]');
    return field ? field.value : '';
  }

  async function api(method, path, body) {
    const started = now();
    const response = await fetch(location.origin + '/api/' + path, {
      method,
      credentials: 'same-origin',
      headers: Object.assign(
        { Accept: 'application/json', RequestVerificationToken: token() },
        body === undefined ? {} : { 'Content-Type': 'application/json' }
      ),
      body: body === undefined ? undefined : JSON.stringify(body)
    });
    const text = await response.text();
    let data = null;
    try { data = text ? JSON.parse(text) : null; } catch { data = text; }
    return { ok: response.ok, status: response.status, ms: round(now() - started), bytes: text.length, data };
  }

  /* ---------------------------------------------------------------------------
   * Rows (same GenericEntityData shape as the taskbar's i4u_UT_UserSettings)
   * ------------------------------------------------------------------------ */
  const property = (name, value) => ({ $type: 'Asi.Soa.Core.DataContracts.GenericPropertyData, Asi.Contracts', Name: name, Value: value });

  function readProperty(row, name) {
    const values = row?.Properties?.$values;
    const found = Array.isArray(values) ? values.find(entry => entry && entry.Name === name) : null;
    return found ? found.Value : row ? row[name] : undefined;
  }

  const scalar = value => value && typeof value === 'object' && '$value' in value ? value.$value : value;

  // Byte[] arrives as a typed wrapper or, from some endpoints, a bare string.
  function readBase64(value) {
    if (value == null) return '';
    if (typeof value === 'string') return value;
    if (typeof value === 'object' && typeof value.$value === 'string') return value.$value;
    return '';
  }

  function context() {
    try { return JSON.parse(document.getElementById('__ClientContext')?.value || '{}'); } catch { return {}; }
  }

  function rowBody(fields, ordinal) {
    const values = [
      property('Module', CONFIG.module),
      property('Category', CONFIG.category),
      property('Code', CONFIG.code),
      property('Description', 'Test row from the where-used payload probe. Safe to delete.'),
      property('Value', fields.value),
      property('ValueType', 'String'),
      property('UpdatedBy', fields.updatedBy),
      property('LastUpdated', { $type: 'System.DateTime', $value: new Date().toISOString() }),
      property('Payload', { $type: 'System.Byte[], mscorlib', $value: fields.payload })
    ];
    const body = {
      $type: 'Asi.Soa.Core.DataContracts.GenericEntityData, Asi.Contracts',
      EntityTypeName: CONFIG.entity,
      Properties: { $type: 'Asi.Soa.Core.DataContracts.GenericPropertyDataCollection, Asi.Contracts', $values: values }
    };
    if (ordinal != null) {
      // The row key must appear in Identity and in Properties.
      body.Identity = {
        $type: 'Asi.Soa.Core.DataContracts.IdentityData, Asi.Contracts',
        EntityTypeName: CONFIG.entity,
        IdentityElements: {
          $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
          $values: [String(ordinal)]
        }
      };
      values.push(property('Ordinal', { $type: 'System.Int32', $value: Number(ordinal) }));
    }
    return body;
  }

  /* ---------------------------------------------------------------------------
   * Payloads: gzip-compressed JSON padded with random text, so the compressed
   * size is close to the size asked for.
   * ------------------------------------------------------------------------ */
  function randomText(length) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    // getRandomValues fills at most 65,536 bytes per call.
    const bytes = new Uint8Array(length);
    for (let index = 0; index < length; index += 65536) crypto.getRandomValues(bytes.subarray(index, index + 65536));
    let text = '';
    for (const byte of bytes) text += alphabet[byte % alphabet.length];
    return text;
  }

  async function gzip(text) {
    const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
    return new Uint8Array(await new Response(stream).arrayBuffer());
  }

  async function gunzip(bytes) {
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    return new Response(stream).text();
  }

  function toBase64(bytes) {
    let binary = '';
    for (let index = 0; index < bytes.length; index += 0x8000) binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
    return btoa(binary);
  }

  function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
    return bytes;
  }

  async function makePayload(size) {
    // Random base-62 text compresses to about 75%, so pad a little over.
    const json = JSON.stringify({ format: 'where-used-probe', version: 1, size, filler: randomText(Math.ceil(size / 0.74)) });
    const bytes = await gzip(json);
    return { json, base64: toBase64(bytes), compressedBytes: bytes.length };
  }

  /* ---------------------------------------------------------------------------
   * Steps
   * ------------------------------------------------------------------------ */
  async function readRow(ordinal) {
    const response = await api('GET', CONFIG.entity + '/' + encodeURIComponent(ordinal));
    return { response, row: response.ok ? response.data : null };
  }

  async function roundTrip(step, ordinal, payload) {
    const read = await readRow(ordinal);
    const base64 = readBase64(readProperty(read.row, 'Payload'));
    let decompressed = false;
    try { decompressed = (await gunzip(fromBase64(base64))) === payload.json; } catch { decompressed = false; }
    return {
      step,
      compressedKB: Math.round(payload.compressedBytes / 1024),
      readStatus: read.response.status,
      readMs: read.response.ms,
      readResponseKB: Math.round(read.response.bytes / 1024),
      payloadWrapper: (() => { const value = readProperty(read.row, 'Payload'); return value && typeof value === 'object' ? value.$type || 'object' : typeof value; })(),
      bytesIdentical: base64 === payload.base64,
      decompressesToSameJson: decompressed,
      lastUpdated: scalar(readProperty(read.row, 'LastUpdated')),
      updatedBy: scalar(readProperty(read.row, 'UpdatedBy'))
    };
  }

  async function main() {
    const result = { site: location.origin, startedAt: new Date().toISOString(), config: CONFIG, steps: [] };
    const ctx = context();
    result.clientContextKeys = Object.keys(ctx);
    const updatedBy = String(ctx.loggedInPartyId || '');

    // 1. Shapes: one existing row, and whether filters work.
    const sample = await api('GET', CONFIG.entity + '?Limit=1');
    const sampleRow = sample.data?.Items?.$values?.[0];
    result.sampleRow = {
      status: sample.status,
      ms: sample.ms,
      properties: (sampleRow?.Properties?.$values || []).map(entry => ({
        name: entry.Name,
        valueType: entry.Value && typeof entry.Value === 'object' ? entry.Value.$type || 'object' : typeof entry.Value
      })),
      identity: sampleRow?.Identity?.IdentityElements?.$values || null,
      primaryParent: sampleRow?.PrimaryParentEntityTypeName || null
    };
    const filtered = await api('GET', CONFIG.entity + '?Module=' + encodeURIComponent(CONFIG.module) +
      '&Category=' + encodeURIComponent(CONFIG.category) + '&Code=' + encodeURIComponent(CONFIG.code) + '&Limit=10');
    result.filterBeforeCreate = { status: filtered.status, ms: filtered.ms, rows: filtered.data?.Items?.$values?.length ?? null };
    console.log(LOG, 'Sample row', result.sampleRow, 'filter', result.filterBeforeCreate);

    // 2. Create with the smallest payload.
    const sizes = CONFIG.sizes.slice();
    let payload = await makePayload(sizes.shift());
    const created = await api('POST', CONFIG.entity, rowBody({ value: 'probe', updatedBy, payload: payload.base64 }));
    let ordinal = Number(scalar(readProperty(created.data, 'Ordinal')));
    // If the create response carries no Ordinal, find the new row by its code.
    if (created.ok && !Number.isFinite(ordinal)) {
      const found = await api('GET', CONFIG.entity + '?Code=' + encodeURIComponent(CONFIG.code) + '&Limit=10');
      const ordinals = (found.data?.Items?.$values || []).map(row => Number(scalar(readProperty(row, 'Ordinal')))).filter(Number.isFinite);
      ordinal = ordinals.length ? Math.max(...ordinals) : NaN;
    }
    result.create = { status: created.status, ms: created.ms, ordinal: Number.isFinite(ordinal) ? ordinal : null, error: created.ok ? null : String(JSON.stringify(created.data)).slice(0, 600) };
    console.log(LOG, 'Create', result.create);
    if (!created.ok || !Number.isFinite(ordinal)) return result;
    result.steps.push(await roundTrip('create', ordinal, payload));

    // 3. Update with each larger payload.
    for (const size of sizes) {
      payload = await makePayload(size);
      const updated = await api('PUT', CONFIG.entity + '/' + encodeURIComponent(ordinal), rowBody({ value: 'probe ' + size, updatedBy, payload: payload.base64 }, ordinal));
      if (!updated.ok) {
        result.steps.push({ step: 'update', compressedKB: Math.round(payload.compressedBytes / 1024), writeStatus: updated.status, writeMs: updated.ms, error: String(JSON.stringify(updated.data)).slice(0, 600) });
        continue;
      }
      const check = await roundTrip('update', ordinal, payload);
      check.writeMs = updated.ms;
      result.steps.push(check);
    }
    console.table(result.steps);

    // The filter should now find the test row.
    const after = await api('GET', CONFIG.entity + '?Module=' + encodeURIComponent(CONFIG.module) +
      '&Category=' + encodeURIComponent(CONFIG.category) + '&Code=' + encodeURIComponent(CONFIG.code) + '&Limit=10');
    const afterRows = after.data?.Items?.$values || [];
    result.filterAfterCreate = {
      status: after.status,
      ms: after.ms,
      rows: afterRows.length,
      responseKB: Math.round(after.bytes / 1024),
      // Whether a filtered list carries the payload (it should not need to).
      listIncludesPayload: afterRows.some(row => readBase64(readProperty(row, 'Payload')).length > 0)
    };

    // 4. Delete the test row.
    if (CONFIG.cleanup) {
      const removed = await api('DELETE', CONFIG.entity + '/' + encodeURIComponent(ordinal));
      const gone = await readRow(ordinal);
      result.cleanup = { deleteStatus: removed.status, readAfterDeleteStatus: gone.response.status, rowStillThere: Boolean(gone.row && readProperty(gone.row, 'Code')) };
    } else {
      result.cleanup = { skipped: true, ordinal };
    }

    result.finishedAt = new Date().toISOString();
    console.log(LOG, 'Done', result);
    return result;
  }

  const probe = { config: CONFIG, result: null, done: null };
  probe.done = main().then(
    result => { probe.result = result; return result; },
    error => { console.error(LOG, error); probe.result = { error: error.message }; return probe.result; }
  );
  window.configPayloadProbe = probe;
})();
