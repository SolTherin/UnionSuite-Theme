# Hub sign-in screen

Status: WIP. Concept A (card) is chosen and being trialled on the live Staff
Sign In page through `imis-head.html`. Not implemented in the shared theme.

## Problem

The old sign-in page faded a triangle pattern and the Hub title in, but the
animation was glitchy and jumpy, and the logo, tagline and form never lined up
well side by side. The redesign keeps the background (deep teal gradient and a
triangle mosaic dense on the left that dissolves to the right, now drawn on one
canvas) and puts the logo, tagline and form in a single glass card.

## Design (concept A)

- **Card:** one centred frosted panel with the logo, a free-text tagline, a
  fading divider, then the form. Alignment comes from the structure, so any
  logo shape works and the phone layout is the same design.
- **Tagline:** free text set per site (credit, slogan or empty). It wraps to
  at most two lines.
- **Credit:** "Powered by Union Innovation Hub" sits bottom-left, like a
  copyright line, inside the stage's bottom padding so it never overlaps.
- **Form:** visible labels, with the Forgot? link on the label row. The
  native placeholders are hidden.
- **Accent:** highlights (rim, glow, links, focus ring, button) use the
  theme's `--accent`, falling back to iMIS blue `#2563c4`. The button text
  switches to dark on light accents.

Card light, drawing on dark-glass, neon-edge and textured-glass references:

- **Glass:** clear frosted tint, backdrop blur, a top sheen and a faint
  tiled-SVG grain.
- **Rim:** a 1.5px masked ring with a glass edge. Two accent arcs travel
  around the border every 16s, driven by a registered `--rim-angle`.
- **Neon bloom:** the same arcs as a blurred ring over the edge. The blur is
  on the element and the mask on its pseudo-element, because an element's own
  filter runs before its mask.
- **Glow:** the arcs heavily blurred behind the card, blooming past its edges
  and showing through the glass.
- **Pointer:** the rim and surface nearest the pointer light up, fading out
  280px from the card.

Background:

- The triangles sweep in, breathe slowly and shimmer every 16s.
- They brighten near the pointer.
- Focusing a field or signing in sends a ripple through them.
- Only the canvas repaints. It draws at most 1.5× DPR and about 30fps when
  idle, and pauses while the tab is hidden.

Intro: the glass rises in, the logo un-blurs and settles, the tagline wipes in
from the left, the form rises, then the glow and neon bloom in. The intro waits
for web fonts and the logo image (capped at 1.2s).

Reduced motion keeps short fades, stops the travelling light and draws one
static frame of the field.

Backdrop blur over the animated field costs GPU time, so check it on low-end
hardware before production.

## iMIS embed

`imis-head.html` is a single `<script>` for the sign-in page's head content. It
injects its own `<style>` and Google Fonts, adds the canvas, neon element and
credit, and restyles the native page. Expected structure:

- one zone with CSS class `SignIn-Container`, holding in order:
  - the logo CCO: a logo image, then an optional content item with CSS class
    `Tagline`
  - the native Sign In iPart (`.SignInPage`)

Per site, change only the logo image and the Tagline text. Set `CREDIT_NAME` to
`""` to hide the credit (e.g. on the Hub's own site).

Implementation notes:

- **The zone is the card,** and its wrapper `.ContentItemContainer` is sized to
  it and carries the glow and neon.
- **The glass is `::before`, not the zone.** A backdrop filter on the zone
  would make it the containing block for the MFA modal inside the Sign In
  iPart.
- **The intro uses transitions.** Removing `hub-signin-intro` from `<html>`
  starts them, so the rim's travel animation is never restarted. A fail-safe
  removes the class after 6s.
- **Other rows (e.g. a JS_CSS row) are hidden.** The Sign In hooks are
  delegated, and the neon and credit are re-added after partial postbacks.
- **The layout depends on CSS `:has()`** and `color-mix()`.

Local check: `.preview/login-screen/fixture-card.html` (ignored capture) is a
trimmed copy of the live single-zone markup, with local copies of the live
theme CSS and logo. Add `?accent=orange` to simulate a theme `--accent`.
Regenerate `head.js` there with `sed '1d;$d' imis-head.html`. The preview pane
holds back animation frames while hidden, so screenshots taken straight after a
load can show the intro's hidden state.

## Maintained files

- `redesign/index.html`, `redesign/redesign.css`: the design mockup with
  concepts A–C (`#card`, `#split`, `#open`) and a Client brand switch
- `imis-head.html`: the iMIS embed of concept A
- `login.js`: the triangle field and interactions, shared by both mockups
- `client-logo-example.svg`: fictional client logo
- `index.html`, `login.css`: the first mockup (side-by-side layout with the
  angled rule), kept for reference until the card is approved

## Preview

Run the `static-node` launch configuration and open
`http://localhost:8778/prototypes/wip/login-screen/redesign/#card`.

## Open decisions

- Client logos must be a light or reversed version to read on the dark
  background. Decide whether to require one, or offer a plate behind
  full-colour logos.
- Whether the credit also shows on the Hub's own site.
- Whether this stays in the page's head content or moves to a page-specific
  stylesheet and script loaded by the theme.
- Retire the first mockup (`index.html`, `login.css`) to `archive/` once the
  card is approved.
