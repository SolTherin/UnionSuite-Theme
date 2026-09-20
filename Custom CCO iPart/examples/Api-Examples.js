// Read-only API reference helpers. NOT a production runtime or an auto-run probe.
// Run in the authenticated iMIS document context. Never hard-code cookies/tokens.
async function ccoApi(method, path, payload) {
  const token = document.querySelector('input[name="__RequestVerificationToken"], input#__RequestVerificationToken')?.value;
  const response = await fetch(`${window.gWebRoot || ''}/api/${path}`, {
    method, credentials: 'same-origin',
    headers: { Accept: 'application/json', ...(token ? { RequestVerificationToken: token } : {}), ...(payload === undefined ? {} : { 'Content-Type': 'application/json' }) },
    ...(payload === undefined ? {} : { body: JSON.stringify(payload) })
  });
  if (!response.ok) throw new Error(`iMIS HTTP ${response.status}`);
  const result = await response.json();
  if (result?.IsSuccessStatusCode === false) throw new Error(result.Message || 'iMIS operation failed');
  return result;
}

function ccoPlacement(contentItemKey, contentKey) {
  return ccoApi('GET', `ContentItem?${new URLSearchParams({ ContentItemKey: contentItemKey, ContentKey: contentKey })}`);
  // Native CCO properties live under Items.$values[n].Data.
  // Dedicated client iPart configuration uses Settings/JsonSettings.
  // Caller MUST verify both returned identity keys and uniqueness before use.
}

async function ccoFolderChildren(folderVersionKey) {
  const response = await ccoApi('POST', 'Document/_execute', {
    $type: 'Asi.Soa.Core.DataContracts.GenericExecuteRequest, Asi.Contracts',
    OperationName: 'FindDocumentsInFolder', EntityTypeName: 'Document',
    Parameters: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.Object, mscorlib]], mscorlib',
      $values: [folderVersionKey, { $type: 'System.String[], mscorlib', $values: ['CON', 'CFL'] }, { $type: 'System.Boolean', $value: true }]
    },
    ParameterTypeName: {
      $type: 'System.Collections.ObjectModel.Collection`1[[System.String, mscorlib]], mscorlib',
      $values: ['System.String', 'System.String[]', 'System.Boolean']
    }
  });
  const rows = response.Result?.$values ?? response.Result ?? response.$values ?? [];
  if (!Array.isArray(rows)) throw new Error('Unexpected folder response');
  return rows; // Immediate children. Verify permissions/status and recurse if required.
}

function ccoDocumentDefinition(documentId) {
  return ccoApi('GET', `Document/${encodeURIComponent(documentId)}`);
  // Use DocumentId, NOT DocumentVersionId. Data contains the definition blob.
}

function ccoPreviewUrl(documentVersionId) {
  const url = new URL(`${window.gWebRoot || ''}/iMIS/ContentManagement/ContentPreview.aspx`, location.origin);
  url.search = new URLSearchParams({ iMode: 'Execute', iUniformKey: documentVersionId, iOperation: 'Execute', TemplateType: 'E', DocumentTypeCode: 'CON', IsPopup: 'true' });
  return url;
  // Reference route verified in staff trials. Context forwarding is omitted here;
  // implement reserved parameter handling and role/publication checks before release.
}
