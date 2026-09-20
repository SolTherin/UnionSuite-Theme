import { collection, property, guid } from './contracts.js';
import { createApi } from './api.js';

// Named Query API filter and direct result fields, in the editor only.
export function installFolderSearch(win, mount, signal, isActive) {
  const input = mount.querySelector('[data-folder-search]');
  const results = mount.querySelector('[data-folder-search-results]');
  const status = mount.querySelector('[data-folder-search-status]');
  let request, timer, generation = 0;
  function cancel() { generation++; win.clearTimeout(timer); request?.abort(); }
  async function search() {
    cancel();
    if (!isActive()) return;
    const current = generation;
    request = new win.AbortController();
    results.replaceChildren(); status.textContent = 'Searching folders...';
    const query = new URLSearchParams({ queryname: '$/_i4u_/Core/Admin/CFL Search', limit: '20' });
    const term = input.value.trim();
    if (term) query.set('Path', term);
    try {
      const body = await createApi(win)('GET', `query?${query}`, undefined, request.signal);
      if (current !== generation || !isActive()) return;
      const rows = collection(body.Items, 'folder IQA');
      let count = 0, skipped = 0;
      for (const row of rows) {
        let key;
        try { key = guid(property(row, 'DocumentVersionKey'), 'Folder document-version key'); } catch { skipped++; continue; }
        const path = property(row, 'DocumentPath'), name = property(row, 'Name');
        if (typeof path !== 'string' || typeof name !== 'string') { skipped++; continue; }
        const item = win.document.createElement('li');
        const button = win.document.createElement('button'); button.type = 'button';
        button.textContent = `${name || 'Folder'} - ${path} (${key})`;
        button.addEventListener('click', () => {
          if (!isActive()) return;
          const keyField = mount.querySelector('[data-setting="folderDocumentVersionId"]');
          keyField.value = key;
          mount.querySelector('[data-setting="folderPathLabel"]').value = path;
          keyField.dispatchEvent(new win.Event('change', { bubbles: true }));
          cancel(); results.replaceChildren();
          status.textContent = `Selected ${name || path}. Use native Save to persist the folder.`;
          keyField.focus();
        }, { signal });
        item.append(button); results.append(item); count++;
      }
      status.textContent = `${count} folders shown.${rows.length >= 20 ? ' Refine the path to narrow the results.' : ''}${skipped ? ` ${skipped} invalid results omitted.` : ''}${!count ? ' Try another path or check IQA access.' : ''}`;
    } catch (error) {
      if (current === generation && isActive()) status.textContent = error.message || 'Folder search failed.';
    }
  }
  input.addEventListener('input', () => {
    cancel(); results.replaceChildren(); status.textContent = '';
    if (input.value.trim()) timer = win.setTimeout(search, 300);
  }, { signal });
  input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); search(); } }, { signal });
  mount.querySelector('[data-find-folders]').addEventListener('click', search, { signal });
  signal.addEventListener('abort', cancel, { once: true });
}
