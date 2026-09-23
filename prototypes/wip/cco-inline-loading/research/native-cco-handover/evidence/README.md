# Evidence provenance

Latest continuation: [23 September handover](../2026-09-23-Native-CCO-Handover.md), [current findings](../2026-09-23-Native-CCO-Findings.md) and [current source/evidence manifest](manifest-2026-09-23.json). The original manifest remains historical.

Snapshot: 22 September 2026. These files preserve user-supplied diagnostic output. They are not independent live requests made by the assistant, synthetic fixtures or a substitute for testing native actions.

| File | Source and contents |
| --- | --- |
| [probe-a-report.json](probe-a-report.json) | Exact copy of attachment `32213f2c-4c7a-49a8-a11d-a3574528cf53/Pasted text.txt`; 12 child-mode insertions across 10 tabs after the pagination/sign-in fixes |
| [probe-b-report.json](probe-b-report.json) | Exact copy of attachment `0bc6527a-f59e-4966-9d45-92e984da34d5/Pasted text.txt`; six parent-mode insertions following caption-routing instructions |
| [probe-a-grid-registry.json](probe-a-grid-registry.json) | Transcribed from the user's direct chat reply; presentation HTML entities/backslash escapes removed, diagnostic values unchanged; three Notes grids are unregistered |
| [native-cases-grid-baseline.json](native-cases-grid-baseline.json) | Resumed-task user report from v0.5.0: selected-field transcription confirming native Cases registration/attachment, two hidden fields and the diagnostic's script-scan failure; resource URLs/query keys are summarized rather than reconstructed from chat formatting |
| [native-cases-grid-descriptor-v0.5.1.json](native-cases-grid-descriptor-v0.5.1.json) | Exact copy of attachment `4b08dd80-9a50-4f28-af78-f5c58ce71588/pasted-text.txt`; one native Cases RadGrid descriptor with JSON property shapes and empty references, but unsupported events; script 16 remains unparsed. SHA-256: `8f51827b717929705a15101fe115c5f4d1de62576a42b18853a9be86a3581efc` |
| [native-cases-callback-source.json](native-cases-callback-source.json) | Transcribed user reply from the bounded callback capture; chat entities/escaping normalized. Four events reference the same grid-specific `_jsmanager`; the short helper focuses its master table. Manager initialization and real actions are still unverified. |
| [native-cases-manager-source.json](native-cases-manager-source.json) | Exact copy of attachment `0c107039-b5f3-499b-87ad-7f7c99493aa0/pasted-text.txt`; native manager method/constructor source and one setup line. SHA-256: `67271f5a147642ace13f6fdf0d085adfaecc02cc47ce534937744b14822e7744`. Source and preserved-copy hashes match. |
| [probe-b-cases-trial-v0.6.0-failure.json](probe-b-cases-trial-v0.6.0-failure.json) | Transcribed user reports: Cases-only trial started from About, stopped at the additional-control check. General report identifies a native `PageSizeComboBox`. The user confirmed reducing the report page size to expose pagination since the earlier captures. No grid initialization was attempted. |
| [cases-pager-source.json](cases-pager-source.json) | Transcribed user capture; chat indentation entities and escaped underscores normalized. One pager descriptor at script 37 line 54 precedes the grid at line 57; exact named Telerik event handlers, property shapes and hidden-field identities supplied. No live initialization or paging action is established by this capture. |
| [probe-b-cases-trial-v0.7.0-failure.json](probe-b-cases-trial-v0.7.0-failure.json) | Latest user report, normalized transcription: About to Cases, both native controls inventoried, `initializationAttempted: false`, `Ambiguous slash after a closing brace.` No script location was supplied; no native control was initialized. |
| [probe-a-discovery-console.txt](probe-a-discovery-console.txt) | Exact copy of attachment `854b74c4-13e9-4c03-960c-8e6abefa9aca/Pasted text.txt`; explicit-DVK startup, primary-folder lookup, 15 tab mappings and collapsed insertion logs |
| [manifest.json](manifest.json) | SHA-256 provenance for preserved source copies and the current maintained probe/test source at handover creation |

Attachment files originally live under `C:/Users/James/.codex/attachments/`. Exact copies above remove the handover's dependency on those temporary chat paths for its latest A/B results.

Other evidence retained at original locations and summarized in the findings:

- Export: `C:/Users/James/Downloads/Account_Page_Staff_2026-09-22T15_39_43.xml`.
- Published Document response: `C:/Users/James/.codex/attachments/75c83f17-f24c-4e42-b34c-f0115c91ea19/Pasted text.txt`.
- Earlier collapsed A console log: `C:/Users/James/.codex/attachments/8131662f-07a7-47f7-8d02-98a26a5640db/Pasted text.txt`.
- First expanded A report, paired ContentItem response, numeric/name tab URLs and canonical-link example: direct user messages in this investigation. The key contracts, values, initial timings and corrected assumptions are transcribed in the findings; they are not fabricated as original files.
- Prior canonical-path research: sibling `iMIS Enhanced/probes/content-page-metadata-recon-probe.js` and `CONTENT-METADATA-RECON.md`. The current probe has no runtime dependency on those files.

The export and full Document blob have not been duplicated here; the relevant configuration and identities are documented. These report files contain control identifiers and diagnostic counts, not fetched member result HTML or session tokens. Console telemetry errors are preserved as supplied, without treating them as proven causes of CCO behaviour.

`existingComponentIds` is a pre-insertion check. Empty `initializationErrors` and an `inserted` status do not prove native grid functionality. Elapsed timings are individual observations, not controlled benchmarks.

The new Cases baseline is later evidence and is not included in the original handover manifest. Its `insideSource: true` script flags refer to the whole live document, since it was captured before either probe started; they do not place startup scripts inside the Cases iPart. No script bodies or working native grid action were supplied. v0.5.0 stopped on unsupported syntax in scripts 16 and 37, so the empty descriptor list is a diagnostic limitation. The exact triggering syntax is not yet known.

The v0.5.1 attachment is also later evidence. Its source and preserved copy hashes match. The main RadGrid descriptor is now found at script 37, line 52, while its event source is still omitted (`eventsSupported: false`). Script 16 remains unsupported at offset 191, line 3. Property shapes include row key fields, but their values and serialized table data were not exported. No B-inserted registration, callback source, scoped initializer or real sort/page operation is established by this native report.

The subsequent callback capture supplies the previously omitted event expressions: `window['<actualGridId>_jsmanager'].OnGridCreated`, `.OnRowCreated`, `.OnRowDeselected` and `.OnRowSelected`. The fourth descriptor argument is `null`, which does not remove those event dependencies. The normalized focus helper is exactly 197 characters and passes the local scanner; its earlier reported slash error is not reproduced. v0.5.2 recognizes these static event expressions, with synthetic coverage only. The local decompiled `ContentItemDisplayBase` mentions a different download manager; it is not evidence of the Cases manager's implementation.

The later manager capture identifies `Asi_Web_BusinessDataGrid2`, configured with `IsMultiSelect`, `TrackItemSelectionAcrossPostbacks` and `IsSelectedByDefault` false, empty `DeltaKeys`, and null custom row callbacks. Its four own event methods retain the grid on creation but do no selection work with these flags. No lifecycle/dispose method is present. Its inherited constructor source is 2,172 characters. The script 37 line 31 capture includes unrelated Listers/chosen setup and an opening IIFE; none of those surrounding statements belong to the scoped manager trial. The constructor's internal dynamic callback helper is unreachable with the captured null custom callbacks.

This manager file is later evidence and is not included in the historical handover manifest. v0.6.0 uses its contract for a Cases-only initializer/disposer and uses its function body as a local test fixture with a synthetic grid. The first live trial subsequently stopped at contract validation because the newly exposed page-size dropdown was unsupported. No live B-inserted registration, cleanup or server action has been supplied yet. Follow the maintained WIP README for the focused pager-source capture and next live trial.

The later pager capture now resolves that missing setup: `RadComboBox` uses `Grid.ChangePageSizeComboHandler` and `Grid.ChangingPageSizeComboHandler`, has null component references, and is emitted before the grid. The state names use literal underscores. The v0.7.0 trial implements this bounded contract; native registration and server actions remain outstanding. This normalized capture is later evidence outside the historical manifest.

The latest v0.7.0 trial still failed before initialization, now in the limited script scanner. The exact script responsible is unknown: the report omitted its location. A separate focus helper is a plausible source based on earlier evidence, but its supplied normalized body passes local scanning. A subsequent 0.7.1 edit narrows the initialization scan to candidate setup scripts and adds error coordinates; the user stopped implementation before any validation or live retry. The current manifest records this untested source, not a successful build or acceptance result.
