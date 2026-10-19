// Prototype only: seed posts, the simulated save and the two display
// surfaces. The surfaces are built the way the live templates would print
// them (the Note encoded as text inside .us-markdown), then the candidate
// renders them, so this is the same path a live page takes.
(() => {
  'use strict';

  const form = document.getElementById('mdn-form');
  const note = document.getElementById('mdn-note');
  const fields = {
    title: document.getElementById('mdn-title'),
    start: document.getElementById('mdn-start'),
    end: document.getElementById('mdn-end'),
    alert: document.getElementById('mdn-alert'),
    bulletin: document.getElementById('mdn-bulletin')
  };
  const status = document.getElementById('mdn-status');
  const storedValue = document.getElementById('mdn-stored-value');
  const storedCount = document.getElementById('mdn-stored-count');
  const payload = document.getElementById('mdn-payload');

  const isoDay = offset => {
    const day = new Date();
    day.setDate(day.getDate() + offset);
    return [day.getFullYear(), String(day.getMonth() + 1).padStart(2, '0'), String(day.getDate()).padStart(2, '0')].join('-');
  };
  const today = isoDay(0);
  const longDate = iso => new Date(iso + 'T00:00').toLocaleDateString('en-AU', {day: 'numeric', month: 'long', year: 'numeric'});
  const encode = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));

  const SEED = () => [
    {
      Title: 'Hotfix tonight',
      Note: 'A hotfix will be deployed at **6 pm tonight**. Save your work before then. See the [hotfix notes](https://example.org/hotfix) for details.',
      StartDate: isoDay(0),
      EndDate: isoDay(0),
      SitewideAlert: true,
      Bulletin: false
    },
    {
      Title: 'Membership fees updated',
      Note: 'The **2027 fee schedule** is now available. Please use it for all renewal enquiries from _1 November_.\n\n'
        + '- Full-time: no change\n- Part-time: **$4.20** a fortnight\n- Apprentices: free for the first year\n\n'
        + 'The full schedule is on the [fees page](/staff/fees).',
      StartDate: isoDay(-2),
      EndDate: isoDay(28),
      SitewideAlert: false,
      Bulletin: true
    },
    {
      Title: 'Welcome to our new team members',
      Note: 'Please welcome **Raphael Chambers** and **Heinrich Reimer** to Member Services.\nSay hello at morning tea on Friday.',
      StartDate: isoDay(-5),
      EndDate: isoDay(9),
      SitewideAlert: false,
      Bulletin: true
    }
  ];

  const EXAMPLE = {
    Title: 'Office closure on Melbourne Cup day',
    Note: 'The **Melbourne office** is closed on _Tuesday 3 November_.\n\n'
      + '- Phones divert to the Sydney team\n- Urgent cases: call the duty organiser\n\n'
      + 'Read the [closure notice](https://example.org/closure) before then.',
    StartDate: isoDay(0),
    EndDate: isoDay(18),
    SitewideAlert: true,
    Bulletin: true
  };

  let posts = SEED();

  // The candidate enhances on DOMContentLoaded; asking first is the same editor.
  const editor = () => window.UnionSuiteMarkdown.enhance(note);

  // ── Surfaces ──

  const showing = post => post.StartDate <= today && post.EndDate >= today;

  function drawSurfaces() {
    const alerts = posts.filter(post => post.SitewideAlert && showing(post));
    document.getElementById('mdn-alerts').innerHTML = alerts.map(post => `
      <li class="AlertItem"><div class="uhubAlert">
        <strong>${encode(post.Title)}</strong>
        <span class="us-markdown">${encode(post.Note)}</span>
      </div></li>`).join('');
    document.getElementById('mdn-alerts-empty').hidden = alerts.length > 0;

    const bulletin = posts.filter(post => post.Bulletin && showing(post));
    document.getElementById('mdn-bulletin-list').innerHTML = bulletin.map(post => `
      <section class="mb-3"><div class="card QueryTemplateItem"><div class="card-body">
        <div class="BulletinCard">
          <h3>${encode(post.Title)}</h3>
          <em>${encode(longDate(post.StartDate))}</em>
          <div class="us-list__body us-markdown">${encode(post.Note)}</div>
        </div>
      </div></div></section>`).join('');
    document.getElementById('mdn-bulletin-empty').hidden = bulletin.length > 0;

    window.UnionSuiteMarkdown.renderAll(document);
  }

  // ── Stored value ──

  function showStored() {
    const noteEditor = editor();
    storedValue.textContent = note.value || ' ';
    storedCount.textContent = `${note.value.length.toLocaleString('en-AU')} / ${(noteEditor?.limit ?? 3000).toLocaleString('en-AU')} characters`;
    storedCount.classList.toggle('is-over', !!noteEditor?.over);
  }

  // ── Form ──

  function setError(field, message) {
    const error = document.getElementById(field.id + '-error');
    error.textContent = message;
    error.hidden = !message;
    const target = field === note ? note.nextElementSibling?.querySelector('.us-md-editor__area') : field;
    target?.setAttribute('aria-invalid', message ? 'true' : 'false');
    const described = (target?.getAttribute('aria-describedby') || '').split(' ').filter(id => id && id !== error.id);
    target?.setAttribute('aria-describedby', [...described, ...(message ? [error.id] : [])].join(' '));
    return !message;
  }

  function validate() {
    const noteEditor = editor();
    const results = [
      setError(fields.title, fields.title.value.trim() ? '' : 'Enter a title.'),
      setError(note, !note.value.trim()
        ? 'Write the note.'
        : noteEditor.over ? `Shorten the note to ${noteEditor.limit.toLocaleString('en-AU')} characters or fewer.` : ''),
      setError(fields.start, fields.start.value ? '' : 'Choose a start date.'),
      setError(fields.end, !fields.end.value
        ? 'Choose an end date.'
        : fields.start.value && fields.end.value < fields.start.value ? 'End on or after the start date.' : '')
    ];
    const firstInvalid = [fields.title, note, fields.start, fields.end][results.indexOf(false)];
    if (firstInvalid === note) noteEditor.focus();
    else firstInvalid?.focus();
    return results.every(Boolean);
  }

  function fill(post) {
    fields.title.value = post.Title;
    fields.start.value = post.StartDate;
    fields.end.value = post.EndDate;
    fields.alert.checked = post.SitewideAlert;
    fields.bulletin.checked = post.Bulletin;
    editor().load(post.Note);
    showStored();
  }

  function clearForm() {
    fields.title.value = '';
    fields.start.value = today;
    fields.end.value = isoDay(7);
    fields.alert.checked = false;
    fields.bulletin.checked = true;
    editor().load('');
    [fields.title, note, fields.start, fields.end].forEach(field => setError(field, ''));
    showStored();
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    status.textContent = '';
    if (!validate()) return;

    const post = {
      Title: fields.title.value.trim(),
      Note: note.value,
      StartDate: fields.start.value,
      EndDate: fields.end.value,
      SitewideAlert: fields.alert.checked,
      Bulletin: fields.bulletin.checked
    };
    posts.unshift(post);
    payload.textContent = JSON.stringify(post, null, 2);
    drawSurfaces();

    const where = [post.Bulletin && 'on the Staff Bulletin', post.SitewideAlert && 'as a system alert'].filter(Boolean);
    status.textContent = where.length
      ? `Saved. Shows ${where.join(' and ')} from ${longDate(post.StartDate)} to ${longDate(post.EndDate)}.`
      : 'Saved. It is not shown anywhere until System alert or Bulletin is ticked.';
    clearForm();
  });

  form.addEventListener('reset', event => {
    event.preventDefault();
    status.textContent = '';
    clearForm();
  });

  note.addEventListener('input', showStored);

  // ── Prototype controls ──

  document.getElementById('mdn-example').addEventListener('click', () => fill(EXAMPLE));
  document.getElementById('mdn-reset').addEventListener('click', () => {
    posts = SEED();
    payload.textContent = 'Nothing saved yet.';
    drawSurfaces();
  });
  document.getElementById('mdn-color-scheme').addEventListener('click', event => {
    const dark = document.documentElement.getAttribute('data-us-color-scheme') !== 'dark';
    document.documentElement.setAttribute('data-us-color-scheme', dark ? 'dark' : 'light');
    event.currentTarget.setAttribute('aria-pressed', String(dark));
    event.currentTarget.textContent = dark ? 'Mode: dark' : 'Mode: light';
  });

  clearForm();
  drawSurfaces();
})();
