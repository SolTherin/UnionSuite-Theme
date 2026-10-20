/* US-RESTRICTED-ATTACHMENTS (C33, candidate) — sensitive documents (owner,
   9 October 2026: "sometimes files are restricted as well"). Target:
   US-ATTACHMENTS in zUnionSuite.js, beside US-NOTES-RESTRICTED, with the
   check in Scripts/ActionDefinitions.js. Split from case-actions.candidate.js
   when the case actions moved into ActionDefinitions.js (20 October 2026).

   A row whose IQA returns AccessClass "restricted" (data-us-attachment-access)
   keeps its View, Download and Edit hidden; an Unlock button with the
   notes' padlock stands at the right in their place. Pressing it asks
   CloudToolz (/cases/attachment-access, proposed: AttachmentOrdinal in, Access
   Granted | Restricted out) whether this user may open the file.
   Granted: the padlock opens and turns green, the button closes up around
   it, and the padlock slides left to the start of the actions while View,
   Download and Edit fade in after it; the open padlock stays, so the row
   still says the file is restricted. Restricted: the button shakes and
   the row says so for a few seconds. Reduced motion swaps at once. The
   check is per row and per page load. */
(function () {
  'use strict';
  if (window.UnionSuiteRestrictedAttachments) return;

  const ROWS = '.us-attachment[data-us-attachment-access="restricted" i]:not([data-us-attachment-unlocked])';
  const SVG = 'http://www.w3.org/2000/svg';
  const EASE = 'cubic-bezier(.2, 0, 0, 1)';
  const MESSAGE_MS = 4000;
  const still = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let queued = false;

  function padlock() {
    const svg = document.createElementNS(SVG, 'svg');
    svg.setAttribute('class', 'us-attachment__lock');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    const shackle = document.createElementNS(SVG, 'path');
    shackle.setAttribute('class', 'us-attachment__shackle');
    shackle.setAttribute('d', 'M8 11V7a4 4 0 0 1 8 0v4');
    const body = document.createElementNS(SVG, 'rect');
    Object.entries({x: 5, y: 11, width: 14, height: 10, rx: 2}).forEach(([name, value]) => body.setAttribute(name, value));
    svg.append(shackle, body);
    return svg;
  }

  function enhance(row) {
    const actions = row.querySelector('.us-attachment__actions');
    if (!actions || actions.querySelector(':scope > .us-attachment__unlock')) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'us-attachment__unlock';
    button.title = 'Restricted attachment: check access to open it';
    const label = document.createElement('span');
    label.className = 'us-attachment__unlock-label';
    label.textContent = 'Unlock';
    button.append(padlock(), label);
    actions.append(button);
  }

  // Refused: the button shakes (again on a repeat press) and the reason
  // shows beside it, to its left (owner, 9 October 2026), fading out after
  // MESSAGE_MS.
  const timers = new WeakMap();
  function deny(row, button, text) {
    clearTimeout(timers.get(row));
    button.parentElement.querySelector(':scope > .us-attachment__unlock-message')?.remove();
    button.classList.remove('is-denied');
    void button.offsetWidth;
    button.classList.add('is-denied');
    const message = document.createElement('span');
    message.className = 'us-attachment__unlock-message';
    message.setAttribute('role', 'status');
    message.textContent = text;
    button.before(message);
    timers.set(row, setTimeout(() => {
      message.setAttribute('data-us-leaving', '');
      timers.set(row, setTimeout(() => {
        message.remove();
        button.classList.remove('is-denied');
      }, still() ? 0 : 180));
    }, MESSAGE_MS));
  }

  // Granted: open the padlock, then let the button close round it while it
  // slides to the start of the actions and the actions fade in after it.
  async function open(row, button) {
    const lock = button.querySelector('.us-attachment__lock');
    const label = button.querySelector('.us-attachment__unlock-label');
    const actions = row.querySelector('.us-attachment__actions');
    button.classList.add('is-unlocked');
    if (!still()) {
      await new Promise(resolve => setTimeout(resolve, 240));
      await label.animate([{opacity: 1}, {opacity: 0}], {duration: 120, easing: EASE, fill: 'forwards'}).finished;
    }
    const from = lock.getBoundingClientRect();
    // The open padlock stays, as a mark, ahead of the actions.
    const mark = document.createElement('span');
    mark.className = 'us-attachment__lock-mark';
    mark.setAttribute('role', 'img');
    mark.setAttribute('aria-label', 'Restricted attachment, unlocked');
    mark.title = 'Restricted attachment, unlocked';
    mark.append(lock);
    const focused = document.activeElement === button;
    button.replaceWith(mark);
    actions.prepend(mark);
    row.setAttribute('data-us-attachment-unlocked', '');
    const shown = [...actions.children].filter(child => child !== mark && child.getClientRects().length);
    if (focused) shown[0]?.focus({preventScroll: true});
    if (still()) return;
    const to = lock.getBoundingClientRect();
    mark.animate([{transform: `translateX(${from.left - to.left}px)`}, {transform: 'none'}], {duration: 240, easing: EASE});
    shown.forEach((child, index) => child.animate(
      [{opacity: 0, transform: 'translateX(8px)'}, {opacity: 1, transform: 'none'}],
      {duration: 200, delay: 80 + index * 40, easing: EASE, fill: 'backwards'}
    ));
  }

  async function unlock(button) {
    const row = button.closest('.us-attachment');
    if (!row || button.getAttribute('aria-busy') === 'true') return;
    const ordinal = (row.getAttribute('data-ordinal') || '').trim();
    button.setAttribute('aria-busy', 'true');
    try {
      const cloudToolz = window.UnionSuiteAgreements?.cloudToolz;
      if (!cloudToolz) throw new Error('Load ActionDefinitions.js before restricted-attachments.candidate.js.');
      if (!/^\d+$/.test(ordinal)) throw new Error('The file has no ordinal.');
      const response = await cloudToolz('/cases/attachment-access', {method: 'POST', body: JSON.stringify({AttachmentOrdinal: ordinal})});
      const data = await response.json();
      const access = String(data?.Access ?? '').trim().toLowerCase();
      button.removeAttribute('aria-busy');
      if (access === 'granted') return open(row, button);
      deny(row, button, access === 'restricted'
        ? 'You don’t have permission to open this attachment.'
        : 'The attachment could not be checked. Try again.');
    } catch (error) {
      button.removeAttribute('aria-busy');
      console.warn(error?.message);
      deny(row, button, 'The attachment could not be checked. Try again.');
    }
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('.us-attachment .us-attachment__unlock');
    if (button) void unlock(button);
  });

  function refresh() {
    queued = false;
    document.querySelectorAll(ROWS).forEach(enhance);
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(refresh);
  }

  new MutationObserver(records => {
    if (records.some(record => record.type === 'childList')) schedule();
  }).observe(document.documentElement, {subtree: true, childList: true});

  window.UnionSuiteRestrictedAttachments = Object.freeze({refresh});

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh);
  else refresh();
})();
