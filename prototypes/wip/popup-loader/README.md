# Popup loader options

Status: option 6b (Rev and three staggered ripples) chosen and implemented in
the theme (7 October 2026): the rev and ripple CSS in US-SECTION-LOADING in
`zUnionSuite.css`, and the ripple elements added by US-NATIVE-LOADERS in
`zUnionSuite.js`, for popups only. The guide's "Native popup and panel
loading" section describes it. This comparison stays as the design reference.

A popup can sit on its spinner for several seconds while iMIS builds a page
whose cache has expired (about 6.3s measured, against about 0.5s once warm). The
theme shows the shared spinning circles throughout (US-NATIVE-LOADERS in
`zUnionSuite.js`, 7857b82). Over a long wait an unchanging spinner can start to
look stuck, so these options add an effect every two seconds, after a first
stretch of plain spinning, to hold the user's attention.

Maintained files: `index.html` (the comparison) and `loader-options.css` (the
options). The shared spinner, tokens and dark palette come from the theme's
`zUnionSuite.css` and `zzDarkMode.css`. Open `index.html` directly, or serve the
repository root (for example the `static-node` launch configuration, port 8778)
and visit `/prototypes/wip/popup-loader/`.

Options, each on the unchanged spinner:

1. **Current**, for comparison.
2. **Bloom** (the owner's starting idea): the rings spread apart, then spring
   back together, gathering a little tighter before they settle. The outer
   ring reaches 1.4×.
3. **Bloom, softer**: the same at 1.3×, so the outer line thickens less at the
   peak (Claude's recommendation).
4. **Bloom, softer, with words**: option 3, and "Still loading…" fades in under
   the spinner after 4 seconds. In the theme the line would be inserted into a
   status region then, so screen readers hear it.
5. **Bloom and ripple** (the owner's suggestion): option 3, and as the rings
   reach their widest an accent ring leaves the outer one and travels out
   across the window.
6. **Rev and ripples** (the owner's suggestion): Rev's extra turn drawn out to
   1.1s, and as the rings stretch three ripples leave together, each travelling
   a shorter way and fainter than the one before. The ripples are their own
   elements, drawn as outlines; in the theme the loader script would add them
   with the spinner.
   **6b. Rev and three staggered ripples** (the first version of option 7,
   restored at the owner's request): as the rings stretch, three ripples
   leave 180ms apart (at a 2s cycle), like a stone dropped in a pond. They
   travel the same distance and start fainter in turn (85%, 55%, 30%).
7. **Rev and staggered ripples** (the owner's suggestion): option 6's Rev
   with two ripples, one as it starts and a second, fainter one as it settles
   (85% then 55%; the second leaves 1s after the first at a 2s cycle). Each
   travels the same distance over 0.8s. It flows less well than the earlier
   180ms stagger: the ripples no longer overlap, and the first leaves before
   the Rev has any speed, so it has no visible cause.
   **7b. Rev, thrown and landed** (Claude's revision of 7): the first ripple
   leaves at the Rev's top speed as the rings stretch widest; the Rev lands
   with a small squash (0.94×) and a smaller, fainter second ripple leaves on
   it. Each lasts 1s, so the two overlap and read as one movement.
8. **Gather and pop**: Bloom in reverse; the rings draw in until they almost
   merge, then pop back out.
9. **Ripple**: a small beat and an accent ring that travels out across the
   window and fades.
10. **Rev**: the rings whirl an extra turn, the middle one against the others.
11. **Orbit**: the inner rings slip off-centre and swing round inside the outer
    ring, then drift back.
12. **Gyroscope**: each ring tumbles once on its own axis, one after another.

The owner chose option 5 (7 October 2026), then asked for options 6 and 7 to
compare before it goes into the theme.

Claude's view (7 October 2026): Bloom, softer, ideally with words. Orbit and
Gyroscope briefly look broken (off-centre, edge-on), Gather and pop's first
half reads as shutting down, and Rev reads as strain.

The page's controls apply to this preview only: restart, delay before the
first effect (none, 2s, 4s), slow motion (a 6s cycle) and dark mode.

How it would carry into the theme: every option is CSS only. Each adds an
effect animation beside the spin, using the individual `scale`, `rotate` and
`translate` properties (Ripple animates `box-shadow`, masked with
`--bg-surface`), so it composes with the spin's `transform`. The effect would
be scoped to the popup spinner, `.us-native-loader-host >
.us-native-section-spinner` inside `.rwWindowContent`, rather than every
section loader. Under reduced motion, the shared spinner already stops turning
and no effect would run.

Open decisions:

- Which option, if any.
- Delay before the first effect, and the time between effects (2s each in the
  mockup).
- Whether the effect belongs on popups only or on every long-running section
  loader.
- Whether a long wait should also show text, such as "Still loading…" after a
  few seconds, alongside or instead of an effect.
