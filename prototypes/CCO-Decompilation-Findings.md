# CCO decompilation findings — 12 September 2026

Inspected user-supplied 2017 Asi.Web.iParts.Common.dll using ILSpy CLI 9.1.0.7988. The V10 assembly has no matching CCO type definitions. Decompiled six relevant classes to .tmp-cco-decompiled/ for local investigation. Missing dependencies cause unresolved types in some reconstructed C#; these files are evidence, not buildable replacement source. The supplied binaries were not executed.

## Confirmed in this older implementation

- Both ContentCollectionOrganizerDisplay and DynamicContentCollectionOrganizerDisplay configure AutoPostBack=true outside design mode, attach Tab_TabClick, and add an AsyncPostBackTrigger for that event.
- Both Tab_TabClick handlers build a URL using the selected tab value and URLKeyName, append the tab anchor, and call Response.Redirect. Normal CCO additionally removes OrderLineId when present. This supports the observed POST followed by full-page GET on the current site, without proving identical current code.
- RefreshTriggerClick resets refresh bookkeeping and calls updatePanel.Update(). It is not an exposed child-content fetch endpoint.
- Normal CCO creates placeholder panels, then renders the selected tab via CommonCode.RenderContentRecordDisplay. RenderSelectedPageOnly=false does not mean every tab has actual content loaded.
- Normal CCO folder mode calls GenerateDynamicTabSettings(ContentFolderKey, Guid.Empty, DocumentService).
- GenerateDynamicTabSettings uses FindDescendantDocumentsInFolder(folderKey, "CON", true), orders by Name, uses AlternateName for captions and DocumentVersionId for destination keys. Dynamic CCO falls back to its default folder when the source yields no documents.
- Normal CCO stores TabbedDialogSettings and ContentFolderKey in server control ViewState. This is a lead, not proof those values are available in browser-visible ViewState on the current site; persistence and encryption have not been checked. Do not deserialize untrusted ViewState with server object deserializers.
- Dynamic CCO ContentTypeKey in this build: abf56a5e-97e1-4bba-a4ed-e2eb28d355a0. Verify before any current-site use.

## Evidence locations (decompiled line numbers)

- ContentCollectionOrganizerDisplay.cs:516 — Tab_TabClick; 574 — RefreshTriggerClick; 721–747 — runtime event setup; 361–369 — selected content rendering; 184–203 — settings getter/setter.
- DynamicContentCollectionOrganizerDisplay.cs:245 — Tab_TabClick; 280 — RefreshTriggerClick; 347–367 — runtime event setup.
- Common.CommonCode.cs:872–915 — folder enumeration and document-version mapping.

## Implication for the trial

The hidden Dynamic CCO is not a demonstrated no-reload alternative: its older tab handler also redirects. No reusable browser-facing tab-content endpoint was found in these classes. Keep current theme/native code unchanged. The key-free retained iframe trial remains viable: navigate each background frame to the selected native tab and isolate the CCO visually while preserving its document and form state. Direct child-page frames are more targeted if configuration keys can be resolved. Verify current-site behaviour; do not deploy or replace old vendor binaries.
