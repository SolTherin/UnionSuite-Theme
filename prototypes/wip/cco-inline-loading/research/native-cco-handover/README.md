# Native CCO inline-loading handover

> **Relocated (23 September 2026):** this handover moved from `Custom CCO iPart/handover/` to the feature's research folder when the custom iPart was archived. It is a dated record; the feature's current state is in the [WIP README](../../README.md).

Updated: **23 September 2026 (desktop session)**. No commit, push or deployment.

**Current direction: native partial postbacks — feasibility established.** Maintained trial: [Native-Partial-Postback-Trial.js](../../Native-Partial-Postback-Trial.js) **v0.3.0**, with local checks in `test-partial-postback-trial.cjs`. It intercepts CCO tab clicks and fetches the tab's page. It inserts the view, switches page-level form state to the fetched page, registers its update panels, runs the view's scripts and in-view `$create` blocks, and refreshes report listers natively. The following all worked live on switched tabs:

- tab switching across Cases, About and Finance;
- lister sort, paging and page size;
- panel editor open/cancel.

See the [v0.3.0 evidence](evidence/partial-postback-trial-v0.3.0-success.json) and the latest sections of the [current findings](2026-09-23-Native-CCO-Findings.md). Native tab switching itself cannot be made partial: the server redirects. Next untested areas: saves, popups, row-level entry buttons, repeated switching, back/forward, and prefetch with a native timing comparison.

The **Cases hand-built grid initializer** (`CCO-Inline-Probes.js` `startCasesTrial`, v0.7.x) is superseded for lister tabs and paused. Its history remains below and in the [23 September handover](2026-09-23-Native-CCO-Handover.md).

Read in this order:

1. [Current handover and desktop restart](2026-09-23-Native-CCO-Handover.md) — stopping point, files, untested work, local checks and subsequent live commands.
2. [Current findings](2026-09-23-Native-CCO-Findings.md) — grid/manager/pager contracts, latest failure, parser hypothesis and acceptance status.
3. [Evidence index](evidence/README.md) — preserved user reports and their provenance.
4. [Current manifest](evidence/manifest-2026-09-23.json) — source/evidence hashes for checking the desktop copy.
5. Historical [22 September handover](2026-09-22-Native-CCO-Handover.md) and [findings](2026-09-22-Native-CCO-Findings.md) — earlier discovery, API evidence, A/B results and timings. Their v0.4.0 instructions are superseded.

Maintained implementation:

- [Native-Partial-Postback-Trial.js](../../Native-Partial-Postback-Trial.js) and [test-partial-postback-trial.cjs](../../test-partial-postback-trial.cjs) — current direction
- [CCO-Inline-Probes.js](../../CCO-Inline-Probes.js) — earlier A/B probes and the paused Cases initializer
- [Probe run instructions and current limits](../../README.md)
- [Synthetic browser checks](../../test-probes.cjs)

The maintained probe lives at repository-root `prototypes/wip/cco-inline-loading/`; it is not duplicated here. Both that folder and this handover folder are currently untracked in Git, so ensure the shared files reach the desktop. The WIP README now records the verified 0.7.1 state.

The older [custom iframe iPart](../custom-iframe-ipart/README.md), [creation plan](../custom-iframe-ipart/Creation-Plan.md) and [live acceptance record](../custom-iframe-ipart/Live-Verification.md) remain separate. The new investigation revisits the loading approach; it does not retire that implementation or pass its outstanding acceptance gates. The older prompt to build the initial iframe vertical slice is historical and should not restart that work for this investigation.

No files were committed, pushed or deployed as part of this handover. Follow repository `AGENTS.md`; show staged changes and obtain explicit approval before committing.
