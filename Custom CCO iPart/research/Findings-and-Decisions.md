# Consolidated findings and decisions

## Native loading

The supplied 2017 Asi.Web.iParts.Common.dll contains normal and Dynamic CCO classes. Both set AutoPostBack=true at runtime, register an AsyncPostBackTrigger, and their Tab_TabClick method calls Response.Redirect after constructing a selected-tab URL. This overrides AutoPostBack=false in ASCX. The current site's captured POST then GET agrees with this behaviour, but the 2017 implementation is not proof of every current detail.

Only selected content is populated; inactive panels are placeholders even though RenderSelectedPageOnly=false. RefreshTriggerClick updates refresh bookkeeping/UpdatePanel; it is not a discovered browser content-loading endpoint. Dynamic CCO means folder-generated tabs (and a default-folder fallback), not proven AJAX-only content switching.

## Key research

- Current test page: /i4u_Sandbox/Styling-Elements/CCO-Testing.aspx
- Containing ContentKey / DocumentVersionKey: da1c581c-8f06-40c2-9e5a-f995d99fef8c
- Directory ContentItemKey: a315d1c2-4e44-4c83-9d3a-ab96239bce65
- ContentHierarchyKey: 8a1ce598-194a-4c65-90ba-75609741745b
- Folder ContentFolderKey: 976ae937-b96d-484f-9861-a8bc87062520
- Configured URLKeyName: Directory. Current native clicks instead produced a315d1c24e44=2 plus its anchor. These are distinct observed behaviours; do not substitute the old implementation's parameter rules for current behaviour.
- gHKey was identified by the user as the last-clicked navigation item, not the page identity.
- PageInstanceKey is a runtime business-container identifier. The older DisplayPageBase reads posted/query values or generates a new GUID. No supported browser resolver from it to content identity was found.

The background discovery probe eventually succeeded after updating BOTH Telerik selected-index client states and using the exact captured server UniqueID. Its AJAX response contained pageRedirect with the stub. It did not navigate the visible page. It does run a server lifecycle and is not a harmless metadata GET. Subsequent SQL returned eight pages with identical full placement key, so this route cannot independently identify the page.

## ViewState correction

No live keys were extracted from ViewState. Older classes assign DocumentVersionKey (ContentTemplateArea), ContentRecordKey/ContentHierarchyKey (ContentRecordPage), and ContentKey/ContentItemKey (ContentItemDisplayBase). CCO also assigns folder key/path, settings and other options. The supplied live Base64 value decoded to 528 bytes and appeared encrypted; this was an inference, not a verified encryption format. Do not claim a browser-readable key inventory.

## Proven API chain

GET /api/ContentItem?ContentItemKey=...&ContentKey=... returned one matching item. Native CCO settings are direct properties under Items.$values[0].Data, not JsonSettings. UseContentFolder=true means ignore stale manual TabbedDialogSettings. The returned folder key works with Document/_execute FindDocumentsInFolder.

The exporter uses FindDocumentsInFolder for immediate children. The older CCO uses FindDescendantDocumentsInFolder internally. For nested folders, explicitly implement/test traversal or verify an exposed descendant operation; do not assume the two are interchangeable. Native code sorts by Name and uses AlternateName as caption. Confirm security/status filtering on current sessions; never let this become a draft-content bypass.

Full definitions: GET /api/Document/{DocumentId}, not DocumentVersionId. Data may be a base64 System.Byte[] wrapper. Listing already supplies DocumentVersionId, so do not fetch all definitions just to load frames.

## Confirmed test destinations

| Caption | DocumentVersionId |
|---|---|
| People search | db3c1d27-64f4-4fc3-a733-574e6121f885 |
| Overview | 3c14817d-43ac-4e27-8322-51b07abcf579 |
| About | 91e8d33b-da44-43eb-8374-0331e97157ab |
| Finance | cdc342af-d36b-41f4-b018-df6e4f9bcacd |
| Notes and Interactions | 82e89200-9ece-4f43-8451-bc14a7ca8f60 |
| Worksite Search | e811b19d-bd9d-445e-9830-18bd45651018 |

## Rendering and popups

Working route: /iMIS/ContentManagement/ContentPreview.aspx?iMode=Execute&iUniformKey={DocumentVersionId}&iOperation=Execute&TemplateType=E&DocumentTypeCode=CON&IsPopup=true. These preview URLs worked for staff tests, not yet accepted as a production route for all roles.

Loading the outer page with TemplateType=E removed site chrome but repeated the authored banner inside the CCO. Do not reuse that as a direct child-content URL. Hiding all outside-CCO content in a full-page iframe was proposed but not validated as the final route.

Retained frames keep search state; user confirmed popup save refreshed Jobs. Bridge child ShowDialog_NoReturnValue to parent helper while passing callback function objects unchanged so callback lexical context stays in the child. Forward using the parent window as this. Reinstall after frame navigation; handle partial helper replacement, nested dialogs, bridge cleanup and inaccessible frames explicitly. Only this helper path was tested; do not claim all popup helpers work.

Parent query parameters (e.g. ID) must reach children. Reserve renderer options, custom CCO selection parameters and internal bootstrap flags. Preserve repeated values. Parameter changes must invalidate affected frames: never show cached content for the wrong member.

## SQL research (not chosen bootstrap)

SELECT XML extraction via dbo.asi_getReadOnlyXmlFromBlob returns placements and a 12-hex prefix. The function re-reads Blob, strips illegal character sequences and TRY_CASTs to XML. It is lossy and must never be used to rewrite document blobs. Initial single-document actual plan: 8ms elapsed/CPU, index seek one document, 3 logical reads, two output placements; not a benchmark for whole-site discovery. XML estimates inflated output to ~190. No all-site performance acceptance occurred. Direct TRY_CAST fallback was proposed, not verified. The user can only issue custom SELECTs, not create views/CTEs/indexes. Do not make the new dedicated iPart depend on this scan.

## Content Display / core DLL

ContentDisplayConfigEdit stores selected DocumentVersionKey as ContentRecordKey. ContentDisplayControl passes resolved ContentKey to ContentTemplateArea.DocumentVersionKey. ContentTemplateArea is a server renderer, not a found client fetch API. ContentRecordPage creates edit/change-request links with keys, but server-side visibility depends on Easy Edit/permissions. No always-visible browser identity field was found in inspected classes. Download hidden fields contain download state, not placement identity. UrlRewriter was inspected only partially; URL-to-current-page resolution remains unproven.
