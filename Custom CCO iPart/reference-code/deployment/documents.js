// iMIS Document API helpers.
//
// Confirmed behaviour (SurveyJS-Formbuilder docs/FORMS-STORAGE-IMIS-DOCUMENT.md +
// General/Claude Reference Files/iMIS-REST-API.md → "POST — Document/_execute"):
//  - POST /api/Document returns 500 even on success (iMIS serialisation bug) —
//    confirm the save by re-querying afterwards. AlternateName is NOT unique.
//  - GET/PUT/DELETE /api/Document/{DocumentId} — DocumentId GUID, not DocumentVersionId.
//    PUT updates in place, same DocumentVersionId.
//  - Document/_execute FindDocumentsInFolder needs a real System.String[] type
//    filter ({"$type":"System.String[], mscorlib","$values":[...]}) — bare array → 500.

import { request } from './imis-client.js';

export const byteArray = (base64) => ({ $type: 'System.Byte[], mscorlib', $value: base64 });
export const encodeText = (text) => byteArray(Buffer.from(text, 'utf8').toString('base64'));
export const decodeData = (data) => Buffer.from(data?.$value ?? '', 'base64').toString('utf8');

/** Generic Document/_execute caller — values/typeNames are positional, 1:1. */
export function execDocument(env, operation, values, typeNames) {
  return request(env, 'POST', 'Document/_execute', {
    $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
    OperationName: operation,
    EntityTypeName: 'Document',
    Parameters: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
      $values: values,
    },
    ParameterTypeName: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
      $values: typeNames,
    },
  });
}

/** Responses nest under Result.$values (list) or Result (single object).
 *  NB: "not found" is HTTP 200 with a ServiceResponse envelope whose Result is null
 *  and Message is "NotFound" — never treat the bare envelope as a hit. */
export const unwrap = (d) => {
  if (d && 'Result' in d && d.Result == null) return null;
  return d?.Result?.['$values'] ?? d?.Result ?? d?.['$values'] ?? d;
};

/** Resolve a $/... or @/... path → document/folder metadata (or null if not found). */
export async function findByPath(env, path) {
  try {
    const result = unwrap(await execDocument(env, 'FindByPath', [path], ['System.String']));
    return result && typeof result === 'object' ? result : null;
  } catch (err) {
    if (/404|not found/i.test(err.message)) return null;
    throw err;
  }
}

/** List documents directly inside a folder, filtered by DocumentTypeId(s). */
export async function findDocumentsInFolder(env, folderId, types = ['IQD']) {
  const typeArr = { $type: 'System.String[], mscorlib', $values: types };
  const flag = { $type: 'System.Boolean', $value: true };
  const resp = await execDocument(
    env,
    'FindDocumentsInFolder',
    [folderId, typeArr, flag],
    ['System.String', 'System.String[]', 'System.Boolean']
  );
  let docs = unwrap(resp);
  if (!Array.isArray(docs)) docs = docs ? [docs] : [];
  return docs;
}

/**
 * Existence check that sees ALL statuses. FindByPath and FindDocumentsInFolder are
 * blind to Working (unpublished) documents (verified on dev 2026-07-11 — created CON
 * duplicates because of this). GET /api/DocumentSummary?Name= sees Working docs;
 * its Path query param 404s, so filter by path client-side.
 */
export async function findDocumentAnyStatus(env, name, path) {
  const r = await request(env, 'GET', `DocumentSummary?Name=${encodeURIComponent(name)}&limit=100`);
  const items = r?.Items?.['$values'] ?? [];
  const wantName = String(name).toLowerCase();
  const wantFolder = normalizeFolder(parentPath(path));

  return items.find((d) => {
    const folder = d.FolderPath || parentPath(d.Path || '');
    return String(d.Name || '').toLowerCase() === wantName
      && normalizeFolder(folder) === wantFolder
      && !/archived/i.test(statusText(d.Status));
  }) ?? null;
}

const parentPath = (path) => String(path || '').replace(/\/[^/]+$/, '');
const normalizeFolder = (path) => String(path || '').replace(/\/+$/, '').toLowerCase();
const statusText = (status) => {
  if (status == null) return '';
  if (typeof status === 'object') {
    return status.Name || status.Description || status.$value || '';
  }
  return String(status);
};

export const getDocument = (env, documentId) => request(env, 'GET', `Document/${documentId}`);
export const putDocument = (env, documentId, body) => request(env, 'PUT', `Document/${documentId}`, body);
export const deleteDocument = (env, documentId) => request(env, 'DELETE', `Document/${documentId}`);

/**
 * Create a document inside folderPath. Verified on dev (2026-07-10):
 *  - `Path` in the POST body must be the PARENT FOLDER path — iMIS appends Name
 *    and fills FolderPath itself. Passing the full intended path nests the doc
 *    one level too deep; passing FolderPath instead of Path is a genuine 500.
 *  - A 500 is NOT always the fake serialisation-bug 500 — always re-query by
 *    path to find out whether the save actually happened.
 * @returns {Promise<{doc: object|null, via: 'response'|'requery', raw?: any}>}
 */
export async function createDocument(env, { name, alternateName, documentTypeId = 'TXT', folderPath, data }) {
  const body = {
    $type: 'Asi.Soa.Core.DataContracts.DocumentData, Asi.Contracts',
    Name: name,
    AlternateName: alternateName ?? name,
    DocumentTypeId: documentTypeId,
    Path: folderPath,
    Data: data,
  };

  try {
    const created = await request(env, 'POST', 'Document', body);
    return { doc: created, via: 'response' };
  } catch (err) {
    if (!/failed: 500/.test(err.message)) throw err;
    const doc = await findByPath(env, `${folderPath}/${name}`);
    return { doc, via: 'requery', raw: err.message };
  }
}
