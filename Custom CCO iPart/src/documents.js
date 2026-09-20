import { collection, guid, objectValue, property, unwrap } from './contracts.js';

export function folderRequest(folderVersionKey) {
  return {
    $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
    OperationName: 'FindDocumentsInFolder', EntityTypeName: 'Document',
    Parameters: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
      $values: [guid(folderVersionKey, 'Folder document-version key'), { $type: 'System.String[], mscorlib', $values: ['CON', 'CFL'] }, { $type: 'System.Boolean', $value: true }]
    },
    ParameterTypeName: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
      $values: ['System.String', 'System.String[]', 'System.Boolean']
    }
  };
}

export function folderPages(body) {
  if (unwrap(body?.IsSuccessStatusCode) === false) throw new Error('iMIS could not list this folder.');
  const rows = collection(body?.Result !== undefined ? body.Result : body, 'folder');
  const pages = [], seen = new Set();
  let folders = 0, excluded = 0;
  for (const value of rows) {
    const row = objectValue(value, 'Folder row');
    const type = property(row, 'DocumentTypeId');
    if (type === 'CFL') { folders++; continue; } // Deliberately no traversal; cycles cannot recurse.
    if (type !== 'CON') throw new Error('Folder listing contains an unexpected document type.');
    const id = guid(property(row, 'DocumentVersionId'), 'Page document-version key');
    if (seen.has(id)) throw new Error('Folder listing contains duplicate page document-version keys.');
    seen.add(id);
    const name = property(row, 'Name'), alternate = property(row, 'AlternateName');
    if (typeof name !== 'string' || !name.trim() || (alternate != null && typeof alternate !== 'string')) throw new Error('Folder listing contains an invalid page name.');
    const statusValue = property(row, 'Status');
    const status = unwrap(statusValue?.Name ?? statusValue?.Description ?? statusValue);
    // Known explicit non-published records fail closed. Unknown status shapes need a live contract.
    if (status !== undefined && status !== null && status !== '' && status !== 'Published') { excluded++; continue; }
    if (property(row, 'IsPublished') === false || property(row, 'IsDeleted') === true || property(row, 'IsAuthorized') === false) { excluded++; continue; }
    pages.push({ id, name: name.trim(), caption: alternate?.trim() || name.trim() });
  }
  pages.sort((a, b) => a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }) || a.id.localeCompare(b.id));
  return { pages, folders, excluded };
}
