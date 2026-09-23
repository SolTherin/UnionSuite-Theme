# Hub Widgets / CCO save compatibility

Follow-up: the user confirms this update works; page persistence is resolved and live tabs render. The individual cause cannot be isolated because multiple compatibility fixes were applied together. The remaining text records the investigation and test boundaries at the time of the fix.

Compared the supplied `ZIPs/hub-widgets.zip` and Content Type export with the CCO source and the local `../../Hub Widgets/public/v1/hub-config.js`, `hub-runtime.js` and `docs/PLAN.md`. The Hub Widgets ZIP contains shims pointing to external bundles; their deployed bytes were not verified against the local implementation.

The user confirms the configuration popup saves/closes, but saving the containing page loses the new CCO. The console log does not show the page-save response or a CCO exception. Its failing URL is Application Insights telemetry; the other messages concern frame-header precedence, early layout, jQuery Migrate and an unsupported unload feature. Those messages alone do not establish a cause.

| Area | Hub Widgets reference | Previous CCO | Current compatibility update |
|---|---|---|---|
| Settings sync | On input/change, with save fallback | On change and document Save hooks | On input/change with scoped fallback |
| Native content-item name | Populates native name field | No native-name population | Fill only an empty native name from caption; preserve author name |
| Validation | Chains RunAllValidators | Cancels document-wide submits and matching Save clicks | Chain native validator, scoped Save fallback; no global submit cancellation |
| Enter in config inputs | Prevents accidental postback | No Enter guard | Scoped Enter guard |
| Editor DOM isolation | ng-non-bindable in supplied shims | Missing | Added to runtime and configuration mounts |
| Loading | ZIP shims fetch external bundles | Self-contained inline upload variant | Retained self-contained variant; still a relevant difference if failures continue |
| Runtime identity | Local implementation accepts a placement-key lookup | Verifies containing and placement keys | Pair validation retained; never weaken it to copy the older behaviour |

These differences are not proof of the reported root cause. In particular, if the configuration popup has its own iframe document, its listeners do not intercept the outer page's Save. The scoped-handler correction is defensive; it must not be presented as a confirmed explanation of this user's failure.

## Local validation and live follow-up

`node tests/editor-save.cjs` tests valid input syncing before blur, empty/author-supplied native names, preservation of native validation failures, invalid config blocking, Enter, unrelated form submits, hidden-editor Save and validator restoration on disposal. The existing 21 browser scenarios also pass. These are simulated hosts, not a reproduction of iMIS server persistence.

Replacement package: `upload/UnionSuite-CCO.zip`. Keep the user-confirmed nested display/configure paths. Retest adding a fresh CCO, configuring, saving the popup, then saving/reopening the containing page. Do not mark this issue resolved until that succeeds.

If it fails, capture the actual containing-page Save request's status/response and check the resulting exported page for the placement's ContentItemKey plus containing ContentKey. `diagnostics/Page-Save-Trace.js` supplies supplementary click/submit cancellation and ASP.NET lifecycle counts without printing form values or sending requests. Stop it with `window.usCcoSaveTrace.dispose()`.
