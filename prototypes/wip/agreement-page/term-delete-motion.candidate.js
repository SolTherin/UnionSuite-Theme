/* US-TERM-DELETE (candidate; owner, 6 October 2026): what a deleted term row
   does on its way out. term-delete-compare.html shows the options; nothing
   here is in the theme yet.

     UnionSuiteTermDelete.play(section, bin, style, {force}) → Promise

   section is the row's result section (.QueryTemplateSet > section) and bin
   its delete button. The row is hidden in place and a copy of it, the
   ghost, plays the style over the list beside a copy of the bin whose lid
   opens; then the real row slides shut. The caller removes the row (or
   refreshes the list) when the promise settles. Reduced motion skips the
   show unless force is set (the comparison page's override).

   Styles:
     fold        the theme's usual motion: slide aside, fade, close (baseline)
     black-hole  the row spirals into a swirl that opens behind the bin
     crumple     the row scrunches into a paper ball and arcs into the bin
     shredder    the row is cut into strips that fall into a rattling bin
     vacuum      the words fly into the bin one by one, nearest first

   Everything is placed inside the row's .QueryTemplateSet, which the terms
   CSS makes a container (so it holds absolutely placed children), and the
   copies keep the .us-terms styles because they stay inside the panel. */
(function () {
  'use strict';
  if (window.UnionSuiteTermDelete) return;

  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  let speed = 1;
  const ms = value => value * speed;
  const reducedMotion = () => Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);

  function el(tag, className) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.setAttribute('aria-hidden', 'true');
    return node;
  }

  // A box relative to the list (frame), with its centre.
  function box(node, frame) {
    const rect = node.getBoundingClientRect();
    const outer = frame.getBoundingClientRect();
    const x = rect.left - outer.left - frame.clientLeft + frame.scrollLeft;
    const y = rect.top - outer.top - frame.clientTop + frame.scrollTop;
    return {x, y, w: rect.width, h: rect.height, cx: x + rect.width / 2, cy: y + rect.height / 2};
  }

  function place(node, b) {
    Object.assign(node.style, {left: b.x + 'px', top: b.y + 'px', width: b.w + 'px', height: b.h + 'px'});
  }

  // The row's copy. Its own bin stays hidden: the bin copy plays instead.
  function ghostOf(section, frame) {
    const item = section.querySelector('.QueryTemplateItem') || section.firstElementChild || section;
    const ghost = el('div', 'us-term-ghost');
    ghost.append(item.cloneNode(true));
    ghost.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'));
    ghost.querySelectorAll('.us-term__delete').forEach(node => { node.style.visibility = 'hidden'; });
    place(ghost, box(item, frame));
    frame.append(ghost);
    return ghost;
  }

  const BIN_SVG = '<svg viewBox="0 0 24 24" focusable="false">' +
    '<g class="us-term-bin__lid"><path d="M3 6h18"/><path d="M9 6V3.5h6V6"/></g>' +
    '<path d="M5 6l1 15h12l1-15"/><path d="M10 11v6M14 11v6"/></svg>';

  function binOf(bin, frame) {
    const b = box(bin, frame);
    const node = el('span', 'us-term-bin');
    node.innerHTML = BIN_SVG;
    place(node, b);
    frame.append(node);
    return {node, lid: node.querySelector('.us-term-bin__lid'), b};
  }

  // The lid hinges at its right end.
  const openLid = can => can.lid.animate(
    [{transform: 'none'}, {transform: 'translate(1px, -1.5px) rotate(-32deg)'}],
    {duration: ms(180), easing: EASE, fill: 'forwards'}).finished;

  const closeLid = can => can.lid.animate(
    [{transform: 'translate(1px, -1.5px) rotate(-32deg)'}, {transform: 'rotate(6deg)', offset: .55},
      {transform: 'rotate(-3deg)', offset: .8}, {transform: 'none'}],
    {duration: ms(320), easing: 'ease-out', fill: 'forwards'}).finished;

  // A satisfied swallow.
  const gulp = can => can.node.animate(
    [{transform: 'none'}, {transform: 'scale(1.3, .78)', offset: .3}, {transform: 'scale(.9, 1.12)', offset: .65}, {transform: 'none'}],
    {duration: ms(360), easing: 'ease-out'}).finished;

  /* ── Styles ───────────────────────────────────────────────── */

  async function fold(ghost) {
    await ghost.animate(
      [{opacity: 1, transform: 'none'}, {opacity: 0, transform: 'translateX(28px)'}],
      {duration: ms(200), easing: EASE, fill: 'forwards'}).finished;
  }

  async function blackHole(ghost, can, frame) {
    const g = box(ghost, frame);
    // Everything is pulled toward the bin.
    ghost.style.transformOrigin = (can.b.cx - g.x) + 'px ' + (can.b.cy - g.y) + 'px';
    const hole = el('span', 'us-term-hole');
    Object.assign(hole.style, {left: can.b.cx + 'px', top: can.b.cy + 'px'});
    frame.insertBefore(hole, ghost);
    await openLid(can);
    const swirl = hole.animate([
      {transform: 'translate(-50%, -50%) scale(0) rotate(0deg)', opacity: 0},
      {transform: 'translate(-50%, -50%) scale(1) rotate(160deg)', opacity: 1, offset: .3},
      {transform: 'translate(-50%, -50%) scale(1.1) rotate(520deg)', opacity: 1, offset: .75},
      {transform: 'translate(-50%, -50%) scale(0) rotate(760deg)', opacity: 0}
    ], {duration: ms(1100), easing: 'linear', fill: 'forwards'}).finished;
    await ghost.animate([
      {transform: 'none', filter: 'blur(0px)', opacity: 1},
      // A brief lean away before the pull wins.
      {transform: 'scale(1.03, .96) rotate(1.5deg)', offset: .16},
      {transform: 'scale(.4) rotate(-110deg)', filter: 'blur(.5px)', opacity: 1, offset: .68},
      {transform: 'scale(0) rotate(-240deg)', filter: 'blur(3px)', opacity: 0}
    ], {duration: ms(820), easing: 'cubic-bezier(.55, 0, .9, .35)', fill: 'forwards'}).finished;
    await Promise.all([closeLid(can), gulp(can), swirl]);
    hole.remove();
  }

  async function crumple(ghost, can, frame) {
    const g = box(ghost, frame);
    const size = 30;
    const ball = el('span', 'us-term-ball');
    Object.assign(ball.style, {left: g.cx + 'px', top: g.cy + 'px', width: size + 'px', height: size + 'px'});
    frame.insertBefore(ball, can.node);
    // Scrunch: squeeze, then fold into a ball as the paper ball takes over.
    const sx = size / g.w;
    const sy = size / g.h;
    const scrunch = ghost.animate([
      {transform: 'none', borderRadius: '0px', opacity: 1},
      {transform: 'scale(.94, .82) rotate(-1.5deg)', borderRadius: '8px', offset: .3},
      {transform: `scale(${sx * 2.2}, ${sy * 1.6}) rotate(10deg)`, borderRadius: '40%', opacity: .5, offset: .78},
      {transform: `scale(${sx}, ${sy}) rotate(24deg)`, borderRadius: '50%', opacity: 0}
    ], {duration: ms(460), easing: 'cubic-bezier(.6, 0, .4, 1)', fill: 'forwards'}).finished;
    await ball.animate(
      [{opacity: 0, transform: 'translate(-50%, -50%) scale(1.7) rotate(0deg)'}, {opacity: 1, transform: 'translate(-50%, -50%) scale(1) rotate(40deg)'}],
      {duration: ms(220), delay: ms(270), easing: EASE, fill: 'forwards'}).finished;
    await scrunch;
    // The toss: a parabola to just above the bin, spinning, dropping in.
    const lid = openLid(can);
    const dx = can.b.cx - g.cx;
    const dy = can.b.cy - 6 - g.cy;
    const peak = Math.max(70, Math.abs(dx) * .3);
    const steps = 16;
    const frames = Array.from({length: steps + 1}, (_, i) => {
      const t = i / steps;
      return {
        offset: t,
        transform: `translate(${dx * t}px, ${dy * t - peak * 4 * t * (1 - t)}px) translate(-50%, -50%) rotate(${40 + 600 * t}deg) scale(${1 - .5 * t * t})`,
        opacity: t > .88 ? (1 - t) / .12 : 1
      };
    });
    await ball.animate(frames, {duration: ms(640), easing: 'linear', fill: 'forwards'}).finished;
    await lid;
    // Swish: the lid snaps shut and the bin rocks.
    await Promise.all([
      closeLid(can),
      can.node.animate(
        [{transform: 'none'}, {transform: 'rotate(-14deg)'}, {transform: 'rotate(10deg)'}, {transform: 'rotate(-5deg)'}, {transform: 'none'}],
        {duration: ms(480), easing: 'ease-out'}).finished
    ]);
    ball.remove();
  }

  async function shredder(ghost, can, frame) {
    const g = box(ghost, frame);
    const count = 10;
    const rattle = can.node.animate(
      [{transform: 'none'}, {transform: 'translate(-1px, .5px) rotate(-3deg)'}, {transform: 'translate(1px, -.5px) rotate(3deg)'}, {transform: 'none'}],
      {duration: ms(110), iterations: Infinity});
    await openLid(can);
    // Fed in: a nudge down as the blades catch it.
    await ghost.animate([{transform: 'none'}, {transform: 'translateY(5px)'}], {duration: ms(140), easing: EASE, fill: 'forwards'}).finished;
    const strips = Array.from({length: count}, (_, i) => {
      const strip = ghost.cloneNode(true);
      const left = i * 100 / count;
      const right = 100 - (i + 1) * 100 / count;
      strip.style.clipPath = `inset(0 ${right}% 0 ${left}%)`;
      const centre = g.w * (i + .5) / count;
      strip.style.transformOrigin = centre + 'px 50%';
      frame.insertBefore(strip, can.node);
      return {strip, centre};
    });
    ghost.style.visibility = 'hidden';
    await Promise.all(strips.map(({strip, centre}, i) => {
      const dx = can.b.cx - (g.x + centre);
      const dy = can.b.cy - (g.cy + 5);
      const turn = (i % 2 ? 1 : -1) * (12 + (i * 7) % 18);
      return strip.animate([
        {transform: 'translateY(5px)'},
        {transform: `translate(${dx * .12}px, ${i % 2 ? 16 : 4}px) rotate(${turn * .35}deg)`, offset: .3},
        {transform: `translate(${dx}px, ${dy}px) rotate(${turn}deg) scale(.06, .35)`, opacity: 0}
      ], {duration: ms(640), delay: ms(i * 48), easing: 'cubic-bezier(.5, 0, .75, 0)', fill: 'forwards'}).finished;
    }));
    rattle.cancel();
    strips.forEach(({strip}) => strip.remove());
    await Promise.all([closeLid(can), gulp(can)]);
  }

  // Each word in its own inline box, so it can fly on its own.
  function splitWords(root) {
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode: node => node.data.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP
    });
    const texts = [];
    while (walker.nextNode()) texts.push(walker.currentNode);
    texts.forEach(text => {
      const parts = text.data.split(/(\s+)/);
      const fragment = document.createDocumentFragment();
      parts.forEach(part => {
        if (!part) return;
        if (/^\s+$/.test(part)) {
          fragment.append(part);
          return;
        }
        const word = document.createElement('span');
        word.className = 'us-term-ghost__word';
        word.textContent = part;
        fragment.append(word);
      });
      text.replaceWith(fragment);
    });
    return [...root.querySelectorAll('.us-term-ghost__word')];
  }

  async function vacuum(ghost, can, frame) {
    const words = splitWords(ghost)
      .filter(word => word.getClientRects().length)
      .map(word => {
        const b = box(word, frame);
        return {word, dx: can.b.cx - b.cx, dy: can.b.cy - b.cy};
      })
      .sort((a, b) => Math.hypot(a.dx, a.dy) - Math.hypot(b.dx, b.dy));
    const gap = Math.min(30, 560 / Math.max(1, words.length));
    await openLid(can);
    // The bin breathes in while it works; the row's surface fades as its words leave.
    const inhale = can.node.animate(
      [{transform: 'none'}, {transform: 'scale(1.14)'}, {transform: 'none'}],
      {duration: ms(260), iterations: Infinity, easing: 'ease-in-out'});
    const total = ms(gap * words.length + 440);
    ghost.animate([{backgroundColor: getComputedStyle(ghost).backgroundColor}, {backgroundColor: 'transparent'}],
      {duration: total, easing: 'ease-in', fill: 'forwards'});
    ghost.querySelectorAll('.us-term__status-button, .us-term__chevron, .us-term__edit, .us-badge, .QueryTemplateItem').forEach(part => {
      part.animate([{borderColor: getComputedStyle(part).borderColor, backgroundColor: getComputedStyle(part).backgroundColor, opacity: 1},
        {borderColor: 'transparent', backgroundColor: 'transparent', opacity: part.matches('.us-badge, .QueryTemplateItem') ? 1 : 0}],
        {duration: ms(360), fill: 'forwards'});
    });
    await Promise.all(words.map(({word, dx, dy}, i) => {
      const turn = (i % 3 - 1) * 25;
      return word.animate([
        {transform: 'none', opacity: 1},
        {transform: `translate(${dx * .18}px, ${dy * .18 - 8}px) rotate(${turn * .4}deg) scale(1.08)`, offset: .3},
        {transform: `translate(${dx}px, ${dy}px) rotate(${turn * 3}deg) scale(.1)`, opacity: 0}
      ], {duration: ms(440), delay: ms(i * gap), easing: 'cubic-bezier(.55, 0, .85, .3)', fill: 'forwards'}).finished;
    }));
    inhale.cancel();
    await Promise.all([closeLid(can), gulp(can)]);
  }

  const STYLES = {fold, 'black-hole': blackHole, crumple, shredder, vacuum};

  // The real row closes once the show is over.
  function collapse(section) {
    const height = section.getBoundingClientRect().height;
    section.style.overflow = 'hidden';
    return section.animate([{height: height + 'px'}, {height: '0px'}],
      {duration: ms(220), easing: EASE, fill: 'forwards'}).finished;
  }

  async function play(section, bin, style, options = {}) {
    const frame = section?.parentElement;
    const run = STYLES[style] || fold;
    if (!frame || !bin || !section.animate || (reducedMotion() && !options.force)) return;
    frame.classList.add('us-term-deleting');
    const ghost = ghostOf(section, frame);
    const can = style === 'fold' ? null : binOf(bin, frame);
    section.style.visibility = 'hidden';
    try {
      await run(ghost, can, frame);
      await Promise.all([
        collapse(section),
        can ? can.node.animate([{opacity: 1}, {opacity: 0, transform: 'scale(.6)'}], {duration: ms(200), fill: 'forwards'}).finished : null
      ]);
    } finally {
      ghost.remove();
      can?.node.remove();
      if (!frame.querySelector(':scope > .us-term-ghost')) frame.classList.remove('us-term-deleting');
    }
  }

  window.UnionSuiteTermDelete = Object.freeze({
    play,
    styles: Object.keys(STYLES),
    setSpeed: factor => { speed = Number(factor) > 0 ? Number(factor) : 1; },
    version: '0.1'
  });
})();
