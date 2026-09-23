# Native CCO continuation — start here on desktop

Date: 23 September 2026. Implementation was stopped at the user's request so this handover could be prepared. No commit, push or deployment was performed.

## Update — 0.7.1 verified locally (23 September 2026, desktop session)

Steps 1–5 below are complete. `callArguments()` now converts nested scan errors to whole-script line and offset. Three new Cases regressions cover the helper filter and error positions. Syntax checks, all 34 Cases scenarios and all 70 general scenarios pass, and each new regression fails when its fix is removed. The WIP README records the verified state. The v0.5.1 diagnostic's offset 191 matches the helper's `//]]>` after `}`, so the helper is the likely cause. The v0.7.0 report gave no location, so this is still unproven. **Next: step 6, the live retry from About.** No commit, push or deployment.

## Exact stopping point (before the desktop session)

**The latest live trial failed before initialization. The current source contains an untested follow-up change.**

- Last user-run version: **0.7.0-probe**, started from the native **About** tab with a smaller Cases page size to expose pagination.
- Result: `status: "failed"`, `initializationAttempted: false`, error **`Ambiguous slash after a closing brace.`**
- The response contained both the expected Cases grid and its page-size dropdown. It was rejected before insertion/control creation. This is a probe parser failure, not evidence that Telerik initialization or server paging failed.
- Current maintained JavaScript says **0.7.1-probe**. A small change now excludes scripts containing neither a `$create(...)` candidate nor the Cases manager name from the initialization scan, and adds script/line/offset to errors in candidate setup scripts.
- **That 0.7.1 change has not had syntax checks, regression tests or a live retry.** Do not describe it as ready or fixed. The prior WIP README still describes the tested 0.7.0 work; this handover takes precedence for the current stopping point.

Read the [current findings](2026-09-23-Native-CCO-Findings.md) and [latest failure](evidence/probe-b-cases-trial-v0.7.0-failure.json). The [22 September handover](2026-09-22-Native-CCO-Handover.md) is historical and its v0.4.0 restart instructions are superseded.

## Workspace to resume

Repository root on the current machine:

`C:/Users/James/OneDrive - Union Innovation Hub/Claude/CRM Layouts`

| Maintained file | Purpose |
| --- | --- |
| [CCO-Inline-Probes.js](../../CCO-Inline-Probes.js) | Current 0.7.1 WIP; A/B loading, diagnostics, Cases grid/pager initializer and disposer |
| [test-cases-trial.cjs](../../test-cases-trial.cjs) | Cases contract, lifecycle, failure and capture tests; synthetic controls |
| [test-probes.cjs](../../test-probes.cjs) | 70 general probe/browser scenarios |
| [WIP README](../../README.md) | Maintained experiment documentation; last updated for 0.7.0 |
| [Capture-Cases-Pager.js](../../Capture-Cases-Pager.js) | Standalone read-only pager capture; latest requested capture is already supplied |
| [Capture-Cases-Callbacks.js](../../Capture-Cases-Callbacks.js) / [Capture-Cases-Manager.js](../../Capture-Cases-Manager.js) | Completed native source captures; retain for reference |
| [Evidence index](evidence/README.md) | User reports, provenance and interpretation |
| [Current file manifest](evidence/manifest-2026-09-23.json) | File hashes for checking the desktop copy; does not assert tests passed |

Both `prototypes/wip/cco-inline-loading/` and `Custom CCO iPart/handover/` are currently **untracked** in Git. Ensure those folders are present on the desktop through the shared workspace/file transfer; a Git checkout alone will not include them. No OneDrive synchronization or desktop availability has been verified. There are many unrelated theme/task changes in the workspace; preserve them.

Tests currently import Playwright from `.tmp-iqa-integration/node_modules/playwright` and launch installed Edge (`channel: 'msedge'`, headless). Check that dependency on the desktop before interpreting an environment failure as a probe failure.

## Next work, in order

1. Inspect the current 0.7.1 diff/implementation around `casesContract()` and `scanScript()`. It still uses a deliberately limited scanner, not a full JavaScript parser.
2. Add a regression for an unrelated grid-ID helper containing a slash after `}`: valid manager/pager/grid descriptors must still be collected, and no fetched helper may execute. Also verify that ambiguous syntax in an actual setup candidate still stops with useful location information. Existing general scanner tests intentionally retain rejection of ambiguous slash syntax.
3. Check position reporting. Errors thrown inside `callArguments()` can be relative to its sliced input; the current follow-up only appends existing `error.line`/`error.offset`, so normalize nested positions before treating them as whole-script coordinates.
4. Run appropriate local checks from repository root:

   ```powershell
   node --check prototypes/wip/cco-inline-loading/CCO-Inline-Probes.js
   node prototypes/wip/cco-inline-loading/test-cases-trial.cjs
   node prototypes/wip/cco-inline-loading/test-probes.cjs 'grid diagnostics'
   ```

   Run the full general suite if the shared scanner/loading behavior changes. Do not repeat unrelated theme/guide builds for this WIP.
5. Update the WIP README with the verified state. Only then give the user a fresh script to run. Do not ask them to repeat manager/pager source captures already supplied.
6. Retry live from **About**, with Easy Edit off, after a full reload. Keep the smaller Cases page-size configuration. Paste the verified full main script, then run:

   ```js
   await usCcoInline.startCasesTrial();
   copy(JSON.stringify(usCcoInline.casesReport(), null, 2));
   ```

7. First require a successful grid and pager registration/attachment report. Then test refresh, return to About/reselect Cases and Stop cleanup. Only after that, independently test a non-saving native sort/page operation twice, recording full navigation versus partial update and correct member/context.

If 0.7.1 still fails, use the new script location to identify the actual setup syntax. The focus helper is a plausible cause based on earlier evidence, **not a proven location for the latest failure**. Do not silence errors in scripts containing candidate initialization, replay full startup scripts or merge outer form state to make the trial appear to pass.

## User workflow and agreements

- The user runs console probes in their own signed-in sandbox. No connected sandbox browser session is assumed. No login or capture state survives a reload or move to the desktop.
- Use simple explanations and clear tab instructions. The standalone pager capture can run from any account tab; **the initialization trial must start from a reloaded non-Cases tab, specifically About in the tested workflow**.
- For asynchronous capture helpers, wait for completion, then copy `window.usCcoCasesPagerResult`. The console's `undefined` after `copy(...)` is its return value; the user should paste the clipboard into chat. That result is cleared by reloading. The required pager result is now preserved locally, so recovery of the old console Promise is no longer needed.
- Follow repository `AGENTS.md`. Confirm staged changes before committing, never add Co-Authored-By, and do not push unprompted. Keep literal underscores in iMIS paths/IDs.
- Keep this experiment in its WIP folder. Do not restart discovery, rewrite the existing custom iframe iPart or modify production theme/usage-guide sources for this parser correction.
