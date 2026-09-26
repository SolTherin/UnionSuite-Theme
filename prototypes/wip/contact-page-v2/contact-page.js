// OFFLINE PROTOTYPE ONLY. Never installed in the theme.
// 1. Replaces fetch so the shared Needs Attention loader renders contact trackers.
// 2. Simulates native CCO tab selection (the real page posts back or uses the
//    theme's in-place CCO switch; neither can run from a local file).
// 3. Announces demo-only commands instead of running them.
(() => {
  // Contact-scoped tracker IQAs: Name, Count, Header, Label, Link.
  const trackers = [
    ['01 Open cases', 2, 'Open cases', '1 escalated', '#cases'],
    ['02 Overdue invoices', 1, 'Overdue invoices', '$185 since 01 Mar', '#finance'],
    ['03 Failed payments', 3, 'Failed payments', 'Last attempt 15 Mar', '#finance'],
    ['04 Pending requests', 1, 'Pending requests', 'Resignation submitted', '']
  ];
  const folderId = '00000000-0000-4000-8000-000000000200';
  const ids = trackers.map((_, index) => '00000000-0000-4000-8000-' + String(index + 1).padStart(12, '0'));

  window.fetch = async (input, options = {}) => {
    if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    const url = new URL(input, 'https://example.invalid');
    let data;

    if (url.pathname.endsWith('/api/DocumentSummary/_execute')) {
      const request = JSON.parse(options.body);
      if (request.OperationName === 'FindByPath') {
        data = { Result: { DocumentId: folderId } };
      } else if (request.OperationName === 'FindDocumentsInFolder') {
        data = {
          Result: {
            $values: trackers.map((row, index) => ({ Name: row[0], DocumentTypeId: 'IQD', DocumentVersionId: ids[index] }))
          }
        };
      }
    } else if (url.pathname.endsWith('/api/iqa')) {
      const index = ids.indexOf(url.searchParams.get('QueryDocumentVersionKey'));
      if (index >= 0) {
        const values = ['Count', 'Header', 'Label', 'Link'].map((name, column) => ({ Name: name, Value: trackers[index][column + 1] }));
        data = { TotalCount: 1, Items: { $values: [{ Properties: { $values: values } }] } };
      }
    }

    if (!data) throw Error('No network requests are made by this offline prototype.');
    return { ok: true, status: 200, json: async () => data };
  };

  const toast = message => {
    const node = document.getElementById('cv2-toast');
    node.textContent = message;
    node.classList.add('is-visible');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => node.classList.remove('is-visible'), 2400);
  };

  function selectView(key) {
    const cco = document.getElementById('cv2-cco');
    const link = cco?.querySelector(`a.rtsLink[data-view="${key}"]`);
    if (!link) return false;

    cco.querySelectorAll('a.rtsLink').forEach(item => {
      const selected = item === link;
      item.classList.toggle('rtsSelected', selected);
      item.setAttribute('aria-selected', String(selected));
    });
    cco.querySelectorAll('.rmpView').forEach(view => {
      view.classList.toggle('rmpHidden', view.id !== 'view-' + key);
    });
    history.replaceState(null, '', '#' + key);
    return true;
  }

  document.addEventListener('click', event => {
    const tab = event.target.closest('#cv2-cco a.rtsLink');
    if (tab) {
      event.preventDefault();
      selectView(tab.dataset.view);
      return;
    }

    // Tracker cards link to the CCO tab that holds the detail.
    const tracker = event.target.closest('.cv2-trackers a.us-attention__card');
    if (tracker) {
      event.preventDefault();
      event.stopPropagation();
      selectView(new URL(tracker.href).hash.slice(1));
      document.getElementById('cv2-cco').scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const command = event.target.closest('.cv2-demo, .us-actions__item');
    if (command) {
      event.preventDefault();
      event.stopPropagation();
      toast(command.textContent.trim() + ' — demo only; no action is run.');
    }
  }, true);

  document.addEventListener('DOMContentLoaded', () => {
    selectView(location.hash.slice(1)) || selectView('summary');
  });
  window.addEventListener('hashchange', () => selectView(location.hash.slice(1)));
})();
