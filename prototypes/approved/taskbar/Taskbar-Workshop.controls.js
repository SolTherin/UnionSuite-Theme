(function () {
  'use strict';
  const frames = [...document.querySelectorAll('iframe')];
  const proposal = document.querySelector('#proposal');
  let layout = 'hybrid';
  let scheme = 'light';
  function send(frame, values) {
    frame.contentWindow.postMessage({workshop:true, ...values}, '*');
  }
  function sendAll(values) {
    frames.forEach(frame => send(frame, values));
  }
  document.querySelectorAll('[data-layout]').forEach(button => button.addEventListener('click', () => {
    layout = button.dataset.layout;
    document.querySelectorAll('[data-layout]').forEach(node => node.setAttribute('aria-pressed', String(node === button)));
    document.querySelector('#proposal-title').textContent = layout === 'hybrid' ? 'C · Five favourites, more when you need them' : layout === 'inline' ? 'A · Everything in one row' : 'B · A little room for bookmarks';
    document.querySelector('#layout-description').textContent = layout === 'hybrid'
      ? 'Up to five bookmark icons stay in the main row. Toggle the labelled bar for all bookmarks and Recents. In the palette, bookmarks appear first; drag their handles to change the order.'
      : layout === 'inline'
      ? 'Personal bookmark icons take the place of the four fixed shortcuts. Go to… opens the palette; Recents sits beside it. Contact search stays familiar.'
      : 'A second row gives bookmarks readable labels and more space. The palette and Recents remain beside contact search. The trade-off is a taller header.';
    document.querySelector('.trial-label').textContent = layout === 'hybrid' ? 'Approved' : 'Historical alternative';
    send(proposal, {layout});
  }));
  document.querySelector('#preview-width').addEventListener('change', event => {
    document.documentElement.style.setProperty('--preview-width', event.target.value === 'fluid' ? '100%' : event.target.value + 'px');
  });
  document.querySelector('#preview-scheme').addEventListener('change', event => {
    scheme = event.target.value;
    sendAll({scheme});
  });
  document.querySelector('#preview-pins').addEventListener('change', event => send(proposal, {pins:event.target.value}));
  document.querySelectorAll('[data-try]').forEach(button => button.addEventListener('click', () => {
    proposal.scrollIntoView({block:'start', behavior:'smooth'});
    send(proposal, {open:button.dataset.try});
  }));
  document.querySelector('#reset-demo').addEventListener('click', () => {
    document.querySelector('#preview-pins').value = 'sample';
    send(proposal, {reset:true});
  });
  document.querySelector('#toggle-baseline').addEventListener('click', event => {
    const wrapper = document.querySelector('#baseline-wrap');
    wrapper.hidden = !wrapper.hidden;
    event.currentTarget.setAttribute('aria-expanded', String(!wrapper.hidden));
    event.currentTarget.textContent = wrapper.hidden ? 'Show baseline' : 'Hide baseline';
  });
  window.addEventListener('message', event => {
    const frame = frames.find(frame => frame.contentWindow === event.source);
    if (!frame || !event.data?.workshop) return;
    if (event.data.ready) send(frame, {scheme, ...(frame === proposal ? {layout, pins:document.querySelector('#preview-pins').value} : {})});
    if (event.data.height && frame.id === 'baseline') frame.style.height = event.data.height + 'px';
    if (event.data.scheme && event.data.scheme !== scheme) {
      scheme = event.data.scheme;
      document.querySelector('#preview-scheme').value = scheme;
      sendAll({scheme});
    }
  });
  document.addEventListener('keydown', event => {
    if (event.ctrlKey && event.code === 'Space' && !event.altKey && !event.shiftKey && !event.metaKey) {
      event.preventDefault();
      proposal.scrollIntoView({block:'start', behavior:'smooth'});
      send(proposal, {open:'palette'});
    }
  });
})();
