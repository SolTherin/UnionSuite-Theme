# Source map and package contents

## New isolated implementation

- `src/`, `runtime-shell.html`, `config.html` — new dedicated component sources, adapting the referenced request/editor/bridge contracts.
- `tools/build.mjs` — deterministic local runtime/editor build; defaults to a non-resolving host and never publishes.
- `tests/contracts.test.mjs`, `tests/browser.cjs`, `tests/fixtures.cjs` — new synthetic tests, independent of historical hard-coded live mappings.
- `README-installation.md`, `Live-Verification.md` — implemented contract and explicit remaining live gates.
- `docs/Usage-Guide.source.html`, `tools/build-guide.mjs`, `references/Usage-Guide.html` — generated standalone trial documentation; shared production theme documentation is unchanged pending phase 6.
- `references/test-output/` — local fixture screenshots and browser results; no captured iMIS sessions or member HTML.

## Local authoritative projects

- C:/Dev/HubForms/display/src/content-item.ts — runtime config lookup and wrong-row guard. Copied reference verifies placement key only; NEW CCO must additionally verify containing ContentKey because duplicates were observed.
- C:/Dev/HubForms/display/public/embed/index.html — substitution-token runtime mount and bootstrap.
- C:/Dev/HubForms/infra/iparts/runner-config.html — native JsonSettings save integration. Copied file is a working HubForms form selector, not ready-to-use CCO config.
- C:/Dev/HubForms/infra/iparts/README.md and infra/shims/README.md — installation and live acceptance evidence.
- C:/Dev/HubForms/shared/src/imis/client.ts — request authentication helper; copied file has imports and is not standalone.
- C:/Users/James/OneDrive - Union Innovation Hub/Claude/iMIS Content Deployment/exporter/package-exporter.html — executeDocument/findChildren around lines 439–454; packageDocument around 1067; exact identity guard for DocumentSummary filters around 704–739.
- Same project's src/documents.js copied under reference-code/deployment. Node-oriented reference, not directly browser-compatible.
- Parent CRM Layouts/prototypes and tools/test-cco-retained-trial.cjs — originals of copied trials. Harness relies on parent workspace dependencies/paths; copied test is not a standalone runnable test package.

## User-supplied originals

- C:/Users/James/Downloads/asi net bin 2017/ — four DLLs copied to legacy/binaries.
- C:/Users/James/Downloads/ContentCollectionOrganizer/ and Content Display/ — control markup/help copied to legacy/controls.
- C:/Users/James/Downloads/CCO_Testing_2026-09-12T12_42_38.xml — parent page export.
- C:/Users/James/Downloads/CCO_Tabs_2026-09-12T12_45_21.xml — folder/page export establishing six destinations.
- C:/Users/James/Downloads/test_page_2026-09-10T15_52_51.xml — earlier Content Display experiment.
- C:/Users/James/Downloads/Content Collection Organizer_2026-09-12T14_15_50.xml — native content-type registration.

Full live HTML/network captures are deliberately referenced rather than copied: they contained session/token material or unrelated member data. The consolidated findings retain relevant identifiers and request contracts. Do not paste cookies or verification tokens into new code.

## Historical probes

- CCO-Retained-Tabs-Trial.js: six hard-coded page keys; selected native tab remains native; fixed frame sizing and lifecycle limitations. Useful prototype, not dedicated runtime.
- CCO-Background-Trial.js: older four-tab setup, superseded. Do not use its mappings for the current test.
- CCO-Placement-Discovery-Probe.js: successful background redirect/stub extraction, but cannot identify parent page uniquely. Do not promote to dedicated runtime.
- CCO-Decompilation-Findings.md and UnionSuite-CCO-iPart-Handover.md: earlier snapshots. Their recommendations may predate duplicate placement-key discovery. New consolidated documents govern.
- config.example.json and Api-Examples.js: proposed contract/reference helpers, not validated custom iPart implementation.

## Public technical references consulted

- https://developer.mozilla.org/en-US/docs/Web/API/Request/credentials — browser credentials/cookies.
- https://developer.mozilla.org/en-US/docs/Glossary/Forbidden_request_header — browser-controlled request headers.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Set-Cookie — response cookies and frontend visibility.
- https://learn.microsoft.com/en-us/archive/msdn-magazine/2010/july/security-briefs-view-state-security — encoded vs encrypted ViewState.
- https://learn.microsoft.com/en-us/sql/relational-databases/user-defined-functions/scalar-udf-inlining — UDF performance/parallelism limits.
- https://www.imis.com/SupportPortal/SupportPortal/SupportResources/Service_Packs.aspx — historical Dynamic CCO staff-account translation fix; NOT evidence of AJAX-only loading.

## Decompilation provenance

ILSpy CLI 9.1.0.7988 installed in the parent workspace's .tmp-cco-tools. Sources reconstructed from older user-supplied DLLs, not executed. Missing dependent assemblies produced unresolved-type comments in some files. Do not treat these as clean buildable source or current iMIS source. Binary SHA256 hashes and package file sizes are listed in manifest.csv.
