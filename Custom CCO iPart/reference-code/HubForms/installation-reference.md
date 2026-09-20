# HubForms iMIS Content Type definitions (production)

This folder is the **authoritative definition** of how HubForms is embedded in iMIS. It replaces the
legacy iPart XML + `hubforms-config-standalone.html`, which are **retired, not copied** — they used
`i4u_UT_FormDefinition`, numeric `Ordinal` identifiers, an `<iframe>`, and a viewer-controlled
`?formId=` query parameter, none of which survive into the new build.

> **Why there is no `.xml` here.** The proven embedding (P1.5, live-verified 2026-08-09) is a **iMIS
> RiSE Client-based Content Type**, which is defined by **URLs configured in the iMIS Content Type
> admin UI**, not by an imported custom-iPart XML. This README *is* the definition: apply the field
> values below in iMIS. The two hosted assets it points at are versioned in this repo
> (`runner-config.html`) and in the runner Pages project (`/embed/`).

---

## 1. Runner Content Type (member-facing)

The lean member runtime. Two hosted surfaces, two hosts:

| iMIS Content Type field | Value |
|---|---|
| **URL to display items at runtime** | `https://hub-forms-runner.pages.dev/embed/?DoNotCache=1` |
| **URL to configure content items** | Direct R2 / custom-CDN object serving `runner-config.html?DoNotCache=1` |

### Runtime shell — `/embed/`
`display/public/embed/index.html` (in the `hub-forms-runner` Pages project) is the runtime shell. iMIS
substitutes `[x-contentItemKey]` / `[x-contentKey]` onto an instance-scoped `<hubforms-runner>`
element, which loads `runner.js` from the same origin, resolves the configured `FormID` from the
placement's `ContentItem`/`JsonSettings`, fetches the published release, and renders inside a Shadow
root. **Selection is config-only — there is no viewer-facing `?formId=`.**

- **Trailing slash is mandatory:** use `/embed/`, never `/embed/index.html` (a Pages canonical
  redirect breaks iMIS's server-side fetch — see `project_imis_ipart_runtime_url_trailing_slash`).
- **`?DoNotCache=1`** is appended so iMIS does not serve a stale server-side copy.
- **Clear the iMIS cache** after changing either URL.

### Configure page — `runner-config.html`
The staff form-selector, hosted on an **iMIS-server-reachable CDN (R2 or equivalent)** — *not* Pages,
because the iMIS configuration fetch must reach it directly. It:

- lists `i4u_UT_Form` rows that are `Status='Active'` **and** carry a `CurrentReleaseVersionID` (a
  published release), client-deduped on `FormID` (the #24 guard — iMIS ignores filters it doesn't
  honour and returns all rows);
- stores **only the stable `FormID` GUID** into iMIS `#JsonSettings` (never the form name — names
  change; never the whole definition — the runner fetches it fresh);
- hooks the iMIS `ctl01_SaveButton` / `ctl01_SaveAndCloseButton` so the selection persists on save.

It is self-contained (no external `<script>`/`<link>`, no `pages.dev` hardcoding — it calls the
relative `/api/i4u_UT_Form` in the iMIS page context). Behaviour is pinned by
`runner-config.test.ts`.

### Cache headers
Served by the runner Pages `_headers` (`display/public/_headers`, template mirror
`infra/headers/runner._headers`): **no-cache** on `/`, `/index.html`, `/embed/`, `/embed/index.html`,
`/runner.js`, `/runner.css`, `/imis-test.js`; **immutable** on hashed assets once a manifest/version
step lands (they revalidate for now). Rationale: `project_hubforms_headers_stale_chunk`.

### CORS / Turnstile
- The `hub-forms-runner.pages.dev` origin (and any inline iMIS origin) must be in **iMIS CORS**
  (named origins only — SECURITY #11). Verified 2026-08-08.
- If captcha is used, add the iMIS origin to the Turnstile verifier allow-list
  (`TURNSTILE_ALLOWED_ORIGINS`, `infra/functions/api/verify-turnstile.ts` — fail-closed, SECURITY #9).

### Permissions
The runner renders whatever form its placement is configured with; it **enforces nothing itself**
(treat every definition as trusted-but-not-privileged). Identity is gated *inside* the runner:
member = session `loggedInPartyId`; the placement page's own iMIS permissions decide who can reach it.

---

## 2. Builder + management Content Type (staff-facing)

The Angular authoring console (management catalog + builder editor + analytics) deploys to the
`hub-forms` Pages project and embeds on **staff-only** iMIS pages.

Use an iMIS HTML/content placement containing the same mount-and-script pattern as the legacy
deployer:

```html
<style>
  #hub-forms-mount {
    display: block;
    width: 100%;
    min-height: 640px;
  }
</style>
<div id="hub-forms-mount"></div>
<script data-cfasync="false" src="https://hub-forms.pages.dev/embed.js"></script>
```

The build generates `/embed.js` with references to the current content-hashed Angular assets and
the deploy-time SurveyJS licence. The loader executes in the enclosing iMIS document and mounts the
console inside a Shadow DOM for CSS isolation. Consequently, relative `/api/...` calls use the iMIS
origin and the shared client reads `__RequestVerificationToken` from the same document. There is no
iframe and no API `postMessage` proxy. `embed.js` is served no-cache; its hashed JavaScript and CSS
dependencies are immutable (`builder/public/_headers`, mirrored in `infra/headers/builder._headers`).
The loader also sizes the mount to the full available viewport height from its rendered top position
to the bottom of the browser and recalculates it on resize, with a 640px minimum.

An optional `data-target="#another-id"` attribute may select a different mount element. Only one
builder console is supported per page.

> **Do not embed `https://hub-forms.pages.dev/` in an iframe.** That document runs at the Pages
> origin, cannot safely read the iMIS verification token, and resolves relative API calls to
> `https://hub-forms.pages.dev/api/...`. The Pages root remains a standalone diagnostic surface,
> not the production iMIS authoring integration.

> ⛔ **Deploy precondition (P4.8, SECURITY #17):** the iMIS content page(s) hosting the
> builder/management placement **must** be restricted to the trusted-internal-staff role *before*
> deploy — a member session must get access-denied. This Content Type is **not** finalised until
> Phase 4 (the Angular app is moved into `builder/` in P4.1); the definition is recorded here so the
> permission lock is not forgotten at deploy time.

---

## 3. Install & verify (runner)

1. Upload `runner-config.html` to R2 / the custom CDN; note its direct object URL.
2. In iMIS, create/edit the runner Client-based Content Type:
   - runtime URL → `https://hub-forms-runner.pages.dev/embed/?DoNotCache=1`
   - configure URL → the R2 object URL (append `?DoNotCache=1` while testing).
3. Clear the iMIS cache.
4. Add the Content Type to a staff sandbox page, open its settings, pick a published `[TEST]` form,
   save.
5. Reload; confirm the real SurveyJS form renders.

**Expected console evidence**

- `[HubForms config] stored selection` with the selected GUID (configure step).
- `[HubForms runner] rendered published form` with `formId`, `formVersionId`, release number.

**Two-instance test:** add and configure the Content Type twice on one page. Both runners keep
distinct `ContentItemKey` values, render independently, keep SurveyJS styles inside their own Shadow
roots, and emit their own `hubforms:complete` events. All runner-owned buttons (incl. dynamically
created SurveyJS controls) are forced to `type="button"` so they can't submit the host iMIS form.

---

## 4. Provenance

Embedding + CSS isolation were decided on live evidence in **P1.5** and the full runner slice through
**P2.3** was live-verified on `uhubemsdev.imiscloud.com` (2026-08-09): two configured iParts rendered
distinct published releases on one page, and a mapped submit wrote a real datasource field plus an
`i4u_UT_FormResponse` row. The `infra/shims/` folder retains the original P1.5 diagnostic probes and
the recorded live findings.
