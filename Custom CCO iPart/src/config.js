import { objectValue, mergeConfig, validateConfig } from './contracts.js';
import { createApi } from './api.js';
import { folderRequest, folderPages } from './documents.js';
import { installFolderSearch } from './folder-search.js';

export function installEditor(win) {
  if (win.UnionSuiteCCOEditor) { win.UnionSuiteCCOEditor.scan(); return; }
  const doc = win.document, entries = new Map();
  function attach(mount) {
    const events = new win.AbortController();
    const status = mount.querySelector('[data-config-status]');
    const fields = [...mount.querySelectorAll('[data-setting]')];
    let request, loadedField, loadedValue, originalValidator, validator, invalid = false, disposed = false;
    const nativeNameId = 'ctl01_TemplateBody_ContentEditorChildControl_ContentItemName_TextField';
    function active() {
      // A closed/removed editor must not intercept the containing page's Save.
      if (disposed || !mount.isConnected || !mount.getClientRects().length) return false;
      const native = doc.getElementById('JsonSettings');
      return !!native && native === loadedField && native.form === mount.closest('form');
    }
    function ensureNativeName() {
      const name = doc.getElementById(nativeNameId);
      if (!name || name.value.trim()) return; // Keep any author-supplied native name.
      name.value = fields.find(input => input.dataset.setting === 'caption')?.value.trim() || 'UnionSuite CCO';
      name.dispatchEvent(new win.Event('input', { bubbles: true }));
      name.dispatchEvent(new win.Event('change', { bubbles: true }));
    }
    function message(text, error = false) { if (status.textContent !== text) status.textContent = text; status.classList.toggle('us-cco__error', error); }
    function field() {
      const matches = doc.querySelectorAll('#JsonSettings');
      if (matches.length !== 1 || !('value' in matches[0])) throw new Error('The native JsonSettings editor field is missing or ambiguous. Open this through the iMIS Content Type editor.');
      return matches[0];
    }
    function read(native) { return native.value ? objectValue(native.value, 'Existing JsonSettings') : {}; }
    function hydrate() {
      try {
        const native = field();
        if (native === loadedField && native.value === loadedValue) return;
        const saved = read(native);
        if (saved.schemaVersion !== undefined && saved.schemaVersion !== 1) throw new Error('This configuration uses an unsupported schemaVersion. It was not overwritten.');
        for (const input of fields) {
          const value = saved[input.dataset.setting];
          if (input.type === 'checkbox') input.checked = value === true;
          else input.value = value ?? (input.dataset.setting === 'urlValue' ? 'name' : input.dataset.setting === 'orientation' ? 'vertical' : input.dataset.setting === 'preload' ? 'off' : input.dataset.setting === 'caption' ? 'Content pages' : '');
        }
        loadedField = native; loadedValue = native.value; invalid = false;
        ensureNativeName();
        message('Settings load from this placement. Use the native Save or Save & Close button to persist them.');
      } catch (error) { invalid = true; message(error.message, true); }
    }
    function edits() {
      return Object.fromEntries(fields.map(input => [input.dataset.setting, input.type === 'checkbox' ? input.checked : input.value.trim()]));
    }
    function store(report = true) {
      try {
        if (invalid) throw new Error('Existing settings could not be read safely. Reopen the editor before saving.');
        const native = field();
        const value = mergeConfig(read(native), edits()); // Preserve unrelated settings, including last-minute native edits.
        native.value = JSON.stringify(value);
        loadedField = native; loadedValue = native.value;
        ensureNativeName();
        if (report) message('Settings prepared. Use native Save or Save & Close to persist them in iMIS.');
        return true;
      } catch (error) { message(error.message, true); return false; }
    }
    function guardSave(event) {
      if (!active()) return;
      if (!store() && event) { event.preventDefault(); event.stopImmediatePropagation(); fields.find(input => input.dataset.setting === 'folderDocumentVersionId')?.focus(); }
    }
    function installValidator() {
      const current = win.RunAllValidators;
      if (typeof current !== 'function' || current === validator) return;
      originalValidator = current;
      const previous = current;
      validator = function (...args) {
        const valid = !active() || store(false);
        return previous.apply(this, args) !== false && valid;
      };
      win.RunAllValidators = validator;
    }
    doc.addEventListener('click', event => {
      if (event.target.closest?.('#ctl01_SaveButton, #ctl01_SaveAndCloseButton')) guardSave(event);
    }, { capture: true, signal: events.signal });
    // Hub Widgets auto-syncs before the native save callback reads JsonSettings.
    // No document-wide submit cancellation: it can block unrelated page saves.
    mount.addEventListener('input', () => store(false), { signal: events.signal });
    mount.addEventListener('change', () => store(), { signal: events.signal });
    mount.addEventListener('keydown', event => {
      if (event.key === 'Enter' && event.target.matches('input, select')) event.preventDefault();
    }, { signal: events.signal });
    mount.querySelector('[data-check-folder]').addEventListener('click', async () => {
      request?.abort(); request = new win.AbortController();
      const list = mount.querySelector('[data-folder-results]');
      list.replaceChildren();
      try {
        const config = validateConfig({ ...edits(), schemaVersion: 1 });
        message('Checking immediate folder children...');
        const result = folderPages(await createApi(win)('POST', 'Document/_execute', folderRequest(config.folderDocumentVersionId), request.signal));
        if (!mount.isConnected) return;
        for (const page of result.pages) {
          const li = doc.createElement('li'); li.textContent = `${page.caption} - ${page.id}`; list.append(li);
        }
        message(`${result.pages.length} content pages returned; ${result.folders} nested folders omitted; ${result.excluded} unavailable pages omitted. This does not verify access for other roles.`);
      } catch (error) { if (error.name !== 'AbortError') message(error.message, true); }
    }, { signal: events.signal });
    hydrate();
    installFolderSearch(win, mount, events.signal, active);
    installValidator();
    return { hydrate() { hydrate(); installValidator(); }, dispose() {
      disposed = true; request?.abort(); events.abort();
      if (validator && win.RunAllValidators === validator) win.RunAllValidators = originalValidator;
    } };
  }
  function scan() {
    for (const [mount, entry] of entries) if (!mount.isConnected) { entry.dispose(); entries.delete(mount); }
    for (const mount of doc.querySelectorAll('[data-us-cco-config]')) if (!entries.has(mount)) {
      if (entries.size) { const text = 'Only one CCO configuration editor can use the native JsonSettings field at a time.'; if (mount.textContent !== text) mount.textContent = text; continue; }
      entries.set(mount, attach(mount));
    }
    for (const entry of entries.values()) entry.hydrate();
  }
  const observer = new win.MutationObserver(scan);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  const app = win.Sys?.Application;
  app?.add_load?.(scan);
  win.UnionSuiteCCOEditor = { scan, dispose() { observer.disconnect(); app?.remove_load?.(scan); for (const entry of entries.values()) entry.dispose(); entries.clear(); delete win.UnionSuiteCCOEditor; } };
  scan();
}
