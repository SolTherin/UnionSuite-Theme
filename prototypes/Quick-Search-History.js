// Inserted into the taskbar mount only by the comparison builder.
// All stored data belongs to this preview and its fictional signed-in user.
const historyKey = 'union-suite:preview:quick-search-history:' + String(ctx.loggedInPartyId);
let searchHistory = [];
let historyPersistent = true;
try {
  const saved = JSON.parse(localStorage.getItem(historyKey) || '[]');
  if (Array.isArray(saved)) searchHistory = saved.filter(s => typeof s === 'string' && s.trim().length >= 3).slice(0, 5);
} catch { historyPersistent = false; }
function storeSearchHistory() {
  try { localStorage.setItem(historyKey, JSON.stringify(searchHistory)); }
  catch { historyPersistent = false; }
}
let lastHistorySearch = null;
let replacementTerm = null;
let confirmedHistoryTerm = null;
function resetHistoryWindow() {
  lastHistorySearch = null;
  replacementTerm = null;
  confirmedHistoryTerm = null;
}
function editHistoryTerm(value) {
  if (!value.trim()) { resetHistoryWindow(); return; }
  confirmedHistoryTerm = null;
  // Capture eligibility on edit, independently of response latency.
  if (!replacementTerm && lastHistorySearch) {
    if (Date.now() - lastHistorySearch.at <= 2000) replacementTerm = lastHistorySearch.term;
    else lastHistorySearch = null;
  }
}
function rememberSearch(term) {
  term = term.trim();
  if (term.length < settings.minimumSearchLength) return;
  searchHistory = [term, ...searchHistory.filter(s => s.toLowerCase() !== term.toLowerCase() && (!replacementTerm || s.toLowerCase() !== replacementTerm.toLowerCase()))].slice(0, 5);
  replacementTerm = null;
  lastHistorySearch = confirmedHistoryTerm === term ? null : {term, at: Date.now()};
  storeSearchHistory();
}
function confirmHistorySearch(term) {
  rememberSearch(term);
  resetHistoryWindow();
  confirmedHistoryTerm = term.trim();
}
function appendSearchHistory(frag) {
  const heading = createElement('div', 'tb-dd-section');
  heading.classList.add('preview-history-heading');
  heading.appendChild(createElement('span', '', 'Recent searches'));
  if (searchHistory.length) {
    const clear = createElement('button', '', 'Clear history');
    clear.type = 'button';
    clear.addEventListener('click', () => {
      searchHistory = []; resetHistoryWindow(); storeSearchHistory(); showHint();
      searchInput.focus();
    });
    heading.appendChild(clear);
  }
  frag.appendChild(heading);
  if (!searchHistory.length) frag.appendChild(createElement('div', 'tb-dd-msg', 'Completed searches appear here.'));
  searchHistory.forEach(term => {
    const row = createElement('div', 'preview-history-row');
    const rerun = createElement('a', 'preview-history-term');
    rerun.href = '#';
    const clock = createElement('span', 'preview-history-clock');
    clock.setAttribute('aria-hidden', 'true');
    clock.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
    rerun.append(clock, document.createTextNode(term));
    rerun.addEventListener('click', event => {
      event.preventDefault();
      resetHistoryWindow();
      searchInput.value = mobileSearchInput.value = term;
      searchInput.focus(); scheduleSearch(term);
    });
    const remove = createElement('button', 'preview-history-remove', '×');
    remove.type = 'button';
    remove.setAttribute('aria-label', 'Remove search: ' + term);
    remove.addEventListener('click', () => {
      searchHistory = searchHistory.filter(s => s !== term);
      resetHistoryWindow();
      storeSearchHistory(); showHint(); searchInput.focus();
    });
    row.append(rerun, remove); frag.appendChild(row);
  });
  if (!historyPersistent) frag.appendChild(createElement('div', 'tb-dd-msg', 'Browser storage is unavailable; history lasts for this page only.'));
}
