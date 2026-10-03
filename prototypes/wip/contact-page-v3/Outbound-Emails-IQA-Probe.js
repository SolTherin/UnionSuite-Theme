/* Outbound Emails IQA probe (read-only).

   Checks the five Outbound Emails IQAs against Outbound-Emails-Build.md and
   Activity-IQA-Specs.md by running them the way the Recent activity feed does
   (GET /api/query, named filters, limit/offset paging).

   How to run: open any page of the iMIS site signed in as staff, paste this
   whole file into the browser console and press Enter. Edit `config` first if
   needed. Run it again as an ordinary staff account (not SysAdmin) to check
   access.

   Output: a PASS / WARN / FAIL table in the console, plus everything it
   fetched in window.outboundEmailProbe. It only sends GET requests. */
(async () => {
  'use strict';

  const config = {
    // SandBox placeholders: update both for production.
    // Core and history IQAs:
    folder: '$/_i4u_/SandBox/CRM Layouts/Contact Profile/Activity/',
    // Client-editable details IQAs (the feed's data-us-activity-details-folder):
    detailsFolder: '$/_i4u_/SandBox/CRM Layouts/Contact Profile/Client Activities/',
    // A contact with sent emails and, ideally, a resend.
    id: '104203',
    // Used for the optional StartDate filter check (90 days ago by default).
    startDate: new Date(Date.now() - 90 * 864e5).toISOString().slice(0, 10),
    // Pages of 20 to read when checking keys, order and paging.
    pages: 5,
    // Sends whose delivery history is checked.
    historySamples: 5,
    // The known test send on contact 104203; set to null for another contact.
    testSend: {
      recipientKey: '01a0f508-7f6e-7764-8485-2cd894cf5688',
      events: ['Queued', 'Delivered'],
      resendTo: 'info@uhub.org.au'
    }
  };

  const iqa = {
    sends: 'Outbound Emails',
    sendDetails: 'Outbound Emails Details',
    resends: 'Outbound Email Resends',
    resendDetails: 'Outbound Email Resends Details',
    history: 'Outbound Emails History'
  };

  // Each core IQA returns exactly its type's columns (Activity-IQA-Specs.md 4.4).
  const coreColumns = {
    send: ['ActivityKey', 'ActivityDate', 'Subject', 'CreatedBy', 'RecordUrl'],
    resend: ['ActivityKey', 'ActivityDate', 'Subject', 'CreatedBy', 'Category', 'RecordUrl']
  };
  const expectedDetails = {
    [iqa.sendDetails]: ['To', 'Status', 'Type', 'Message type', 'Last event', 'Last event detail'],
    [iqa.resendDetails]: ['To', 'Original to']
  };
  const toneByEvent = {
    Dropped: 'danger', Bounce: 'danger', 'Spam Report': 'danger',
    Delivered: 'success', Open: 'success', Click: 'success',
    Deferred: 'warning', Unsubscribe: 'warning',
    Queued: '', Generated: '', Resent: ''
  };
  const unknownKey = '00000000-0000-0000-0000-000000000000';

  const token = document.querySelector('#__RequestVerificationToken')?.value;
  const results = [];
  const raw = {};

  // ---------------------------------------------------------------- helpers

  function record(status, query, check, detail = '') {
    results.push({ status, iqa: query, check, detail: String(detail).slice(0, 400) });
  }

  function expect(ok, query, check, detail = '', failure = 'FAIL') {
    record(ok ? 'PASS' : failure, query, check, detail);
    return ok;
  }

  const unwrap = value => (value && typeof value === 'object' && '$value' in value ? value.$value : value);
  const text = value => {
    const plain = unwrap(value);
    return plain == null ? '' : String(plain).trim();
  };

  // Rows as plain objects, whichever shape /api/query returns.
  function rowsOf(data) {
    const list = Array.isArray(data?.Items) ? data.Items : data?.Items?.$values ?? [];
    return list.map(row => Object.fromEntries(
      Object.entries(row).filter(([key]) => key !== '$type').map(([key, value]) => [key, unwrap(value)])
    ));
  }

  // The feed reads YYYY-MM-DD with an optional time; returns a sortable
  // "YYYY-MM-DDTHH:MM:SS" string, or null when the feed could not read it.
  function isoDate(value) {
    const match = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::(\d{2}))?)?/.exec(text(value));
    return match ? `${match[1]}T${match[2] || '00:00'}:${match[3] || '00'}` : null;
  }

  // Details IQAs live in the client folder; the rest in the core folder.
  const pathOf = query => (query.endsWith(' Details') ? config.detailsFolder : config.folder) + query;

  async function run(query, params = {}) {
    const search = new URLSearchParams({ QueryName: pathOf(query), ...params });
    const response = await fetch('/api/query?' + search, {
      headers: { Accept: 'application/json', RequestVerificationToken: token }
    });
    const body = await response.text();
    let data = null;
    try { data = JSON.parse(body); } catch (error) { /* not JSON: kept as text below */ }
    const result = {
      params,
      status: response.status,
      rows: data ? rowsOf(data) : [],
      total: data ? unwrap(data.TotalCount) : undefined,
      hasNext: data ? unwrap(data.HasNext) : undefined,
      message: data ? '' : body.replace(/\s+/g, ' ').slice(0, 200)
    };
    (raw[query] ||= []).push(result);
    return result;
  }

  async function definitions(query) {
    const response = await fetch('/api/QueryParameterDefinition?QueryPath=' + encodeURIComponent(pathOf(query)), {
      headers: { Accept: 'application/json', RequestVerificationToken: token }
    });
    let data = null;
    try { data = await response.json(); } catch (error) { /* reported below */ }
    const list = (data?.Items?.$values ?? data?.$values ?? (Array.isArray(data) ? data : []))
      .map(item => Object.fromEntries(Object.entries(item).filter(([key]) => key !== '$type').map(([key, value]) => [key, unwrap(value)])));
    (raw[query + ' (parameters)'] ||= []).push({ status: response.status, list });
    return { status: response.status, list };
  }

  const describe = result => `HTTP ${result.status}${result.message ? ' ' + result.message : ''}`;
  const looksLikeHtml = value => /<[a-z!/][^>]*>/i.test(text(value));
  const recordUrlPattern = /^\/iParts\/Common\/InteractionLog\/InteractionPreview\.aspx\?CommunicationLogId=([0-9a-f-]{36})&PartyId=([^&]+)&RecipientId=([0-9a-f-]{36})$/i;

  // ------------------------------------------------------------ the checks

  async function checkParameters(query, expectedNames) {
    const { status, list } = await definitions(query);
    if (!expect(status === 200, query, 'Parameter definitions load', `HTTP ${status}`, 'WARN')) return;
    const names = list.flatMap(item => [text(item.Prompt), text(item.PropertyName)]).filter(Boolean);
    record('INFO', query, 'Prompted filters', list.map(item => `${text(item.Prompt)} (${text(item.PropertyName)}, ${text(item.FilterType)})`).join('; ') || 'none');
    expectedNames.forEach(name => expect(
      names.some(found => found.toLowerCase() === name.toLowerCase()), query,
      `A filter is named ${name}`, `found: ${names.join(', ') || 'none'}`, 'WARN'));
  }

  // Core IQA: one row per card, newest first, optional StartDate.
  async function checkCore(query, kind) {
    await checkParameters(query, ['ID', 'StartDate']);

    const rows = [];
    const pageKeys = [];
    let first = null;
    for (let page = 0; page < config.pages; page++) {
      const result = await run(query, { ID: config.id, limit: '20', offset: String(page * 20) });
      if (page === 0) {
        first = result;
        if (!expect(result.status === 200, query, 'Runs without StartDate (All time)', describe(result))) return [];
        expect(result.total != null, query, 'Returns TotalCount (the type count)', `TotalCount ${result.total}`);
      }
      if (result.status !== 200) break;
      rows.push(...result.rows);
      pageKeys.push(result.rows.map(row => text(row.ActivityKey)));
      if (!result.rows.length || result.hasNext === false) break;
    }
    record('INFO', query, 'Rows read', `${rows.length} of TotalCount ${first.total}`);
    if (!rows.length) {
      record('WARN', query, 'Rows to check', `contact ${config.id} has none; pick a contact with sent emails`);
      return rows;
    }

    const columns = Object.keys(rows[0]);
    const expected = coreColumns[kind];
    const missing = expected.filter(column => !columns.includes(column));
    expect(!missing.length, query, 'Core columns present (a misspelt alias shows as missing)', missing.length ? 'missing: ' + missing.join(', ') : columns.join(', '));
    const extra = columns.filter(column => !expected.includes(column));
    expect(!extra.length, query, 'No extra or padding columns (each is sent on every row)', extra.join(', '), 'WARN');

    const keys = rows.map(row => text(row.ActivityKey));
    expect(keys.every(Boolean), query, 'Every ActivityKey has a value', `${keys.filter(key => !key).length} blank`);
    const duplicates = keys.filter((key, index) => key && keys.indexOf(key) !== index);
    expect(!duplicates.length, query, 'ActivityKey is unique', duplicates.slice(0, 5).join(', '));

    if (pageKeys.length > 1) {
      const overlap = pageKeys[1].filter(key => pageKeys[0].includes(key));
      expect(!overlap.length, query, 'Pages do not overlap (offset paging)', overlap.join(', '));
    } else {
      record('INFO', query, 'Pages do not overlap (offset paging)', 'only one page of rows; not tested');
    }
    if (first.hasNext === false || rows.length === first.total) {
      expect(rows.length === Number(first.total), query, 'TotalCount matches the rows', `${rows.length} rows, TotalCount ${first.total}`);
    }

    const dates = rows.map(row => isoDate(row.ActivityDate));
    expect(dates.every(Boolean), query, 'ActivityDate is a readable date (the feed skips others)',
      rows.filter((row, index) => !dates[index]).slice(0, 3).map(row => text(row.ActivityDate)).join(', '));
    const outOfOrder = dates.findIndex((date, index) => index > 0 && date && dates[index - 1] && date > dates[index - 1]);
    expect(outOfOrder < 0, query, 'Sorted newest first', outOfOrder < 0 ? '' : `row ${outOfOrder}: ${dates[outOfOrder - 1]} then ${dates[outOfOrder]}`);

    expect(rows.every(row => text(row.Subject) || text(row.Summary)), query, 'Each row has a Subject or Summary (the feed skips others)');
    expect(!rows.some(row => ['Subject', 'Summary', 'Detail'].some(column => looksLikeHtml(row[column]))), query, 'No HTML in Subject, Summary or Detail', '', 'WARN');
    expect(rows.every(row => text(row.CreatedBy)), query, 'CreatedBy (sender) has a value', `${rows.filter(row => !text(row.CreatedBy)).length} blank`, 'WARN');

    const category = kind === 'resend' ? 'Resend' : '';
    expect(rows.every(row => text(row.Category) === category), query, `Category is ${category ? "'Resend'" : 'blank'}`,
      [...new Set(rows.map(row => text(row.Category)))].join(', '));

    // Compares RecipientId with the key only when there is one, so a missing
    // ActivityKey is reported once (above), not again here.
    const urlProblems = rows.filter(row => {
      const match = recordUrlPattern.exec(text(row.RecordUrl));
      if (!match || match[2] !== config.id) return true;
      return kind === 'send' && text(row.ActivityKey) && match[3].toLowerCase() !== text(row.ActivityKey).toLowerCase();
    });
    expect(!urlProblems.length, query, 'RecordUrl is the native preview for this contact and recipient',
      urlProblems.slice(0, 2).map(row => text(row.RecordUrl) || '(blank)').join(' | '));

    const count = await run(query, { ID: config.id, limit: '1' });
    expect(count.status === 200 && Number(count.total) === Number(first.total), query, 'limit=1 returns the same TotalCount',
      `${describe(count)}, TotalCount ${count.total}`);

    const recent = await run(query, { ID: config.id, StartDate: config.startDate, limit: '20' });
    if (expect(recent.status === 200, query, 'StartDate filter accepted', describe(recent))) {
      const early = recent.rows.filter(row => (isoDate(row.ActivityDate) || '') < config.startDate);
      expect(!early.length, query, `StartDate ${config.startDate} drops older rows`, `${early.length} older rows returned`);
      expect(Number(recent.total) <= Number(first.total), query, 'StartDate narrows the count', `${recent.total} vs ${first.total} for All time`);
    }

    const noContact = await run(query, { limit: '1' });
    expect(noContact.status === 400, query, 'ID is required (HTTP 400 without it)', describe(noContact));
    const otherContact = await run(query, { ID: '0', limit: '1' });
    expect(otherContact.status === 200 && !otherContact.rows.length, query, 'ID filters the rows (none for ID 0)', `${describe(otherContact)}, ${otherContact.rows.length} rows`);

    return rows;
  }

  // Details IQA: one row of Additional-* columns per card.
  async function checkDetails(query, coreRows) {
    await checkParameters(query, ['ID', 'ActivityKey']);
    const samples = coreRows.filter(row => text(row.ActivityKey)).slice(0, 3);
    if (!samples.length) {
      record('WARN', query, 'Rows to check', 'skipped: no core rows with an ActivityKey to open (fix the core IQA first)');
      return [];
    }
    const detailRows = [];
    for (const row of samples) {
      const key = text(row.ActivityKey);
      const result = await run(query, { ID: config.id, ActivityKey: key, limit: '1' });
      if (!expect(result.status === 200, query, `Runs for ${key}`, describe(result))) continue;
      expect(result.rows.length === 1 && Number(result.total ?? 1) === 1, query, `One row for ${key}`, `${result.rows.length} rows, TotalCount ${result.total}`);
      if (result.rows[0]) detailRows.push({ key, row: result.rows[0] });
    }
    if (detailRows.length) {
      const columns = Object.keys(detailRows[0].row);
      const labels = columns.filter(column => /^Additional[-_]/.test(column)).map(column => column.replace(/^Additional[-_]/, ''));
      expect(labels.length > 0, query, 'Returns Additional-* columns', columns.join(', '));
      record('INFO', query, 'Field labels as returned (alias format, open question 1)', labels.join(' | '));
      const absent = expectedDetails[query].filter(label => !labels.includes(label));
      expect(!absent.length, query, 'Expected fields present', absent.length ? 'missing: ' + absent.join(', ') : labels.join(', '), 'WARN');
      const blankEverywhere = labels.filter(label => detailRows.every(({ row }) => !text(row['Additional-' + label] ?? row['Additional_' + label])));
      expect(!blankEverywhere.length, query, 'Each field has a value on at least one sampled card', blankEverywhere.join(', '), 'WARN');
    }

    const noKey = await run(query, { ID: config.id, limit: '1' });
    expect(noKey.status === 400, query, 'ActivityKey is required (HTTP 400 without it)', describe(noKey));
    const unknown = await run(query, { ID: config.id, ActivityKey: unknownKey, limit: '1' });
    expect(unknown.status === 200 && !unknown.rows.length, query, 'An unknown ActivityKey returns no row', `${describe(unknown)}, ${unknown.rows.length} rows`);
    const otherContact = await run(query, { ID: '0', ActivityKey: text(samples[0].ActivityKey), limit: '1' });
    expect(otherContact.status === 200 && !otherContact.rows.length, query, 'ID filters the row (none for ID 0)', `${describe(otherContact)}, ${otherContact.rows.length} rows`);
    return detailRows;
  }

  // History IQA: one row per delivery event of a send, oldest first.
  async function checkHistory(sendRows) {
    const query = iqa.history;
    await checkParameters(query, ['ID', 'ActivityKey']);
    const samples = sendRows.map(row => text(row.ActivityKey)).filter(Boolean).slice(0, config.historySamples);
    const testKey = config.testSend?.recipientKey;
    const testListed = testKey && sendRows.some(row => text(row.ActivityKey).toLowerCase() === testKey.toLowerCase());
    if (testListed && !samples.some(key => key.toLowerCase() === testKey.toLowerCase())) samples.push(testKey);
    if (!samples.length) {
      record('WARN', query, 'Rows to check', 'skipped: no sends with an ActivityKey to open (fix the core IQA first)');
      return;
    }

    for (const key of samples) {
      const result = await run(query, { ID: config.id, ActivityKey: key, limit: '50' });
      if (!expect(result.status === 200, query, `Runs for ${key}`, describe(result))) continue;
      const rows = result.rows;
      if (!rows.length) {
        record('WARN', query, `Events for ${key}`, 'none returned');
        continue;
      }
      const columns = Object.keys(rows[0]);
      const missing = ['EventDate', 'Event'].filter(column => !columns.includes(column));
      expect(!missing.length, query, `Columns for ${key}`, missing.length ? 'missing: ' + missing.join(', ') : columns.join(', '));
      const dates = rows.map(row => isoDate(row.EventDate));
      expect(dates.every(Boolean), query, `EventDate readable for ${key}`);
      const outOfOrder = dates.findIndex((date, index) => index > 0 && date && dates[index - 1] && date < dates[index - 1]);
      expect(outOfOrder < 0, query, `Oldest first for ${key}`, outOfOrder < 0 ? '' : `row ${outOfOrder}`);
      expect(rows.every(row => text(row.Event)), query, `Every event is named for ${key}`);
      expect(!rows.some(row => text(row.Event) === 'Resent'), query, `No Resent event (it is its own card) for ${key}`);
      const badTone = rows.filter(row => !['', 'danger', 'success', 'warning'].includes(text(row.EventTone)));
      expect(!badTone.length, query, `EventTone is danger, success, warning or blank for ${key}`, badTone.map(row => text(row.EventTone)).join(', '));
      const wrongTone = rows.filter(row => text(row.Event) in toneByEvent && toneByEvent[text(row.Event)] !== text(row.EventTone));
      expect(!wrongTone.length, query, `EventTone matches the event for ${key}`,
        wrongTone.map(row => `${text(row.Event)}=${text(row.EventTone) || 'blank'}`).join(', '), 'WARN');
      record('INFO', query, `Events for ${key}`, rows.map(row => `${isoDate(row.EventDate)} ${text(row.Event)}${text(row.EventDetail) ? ' (' + text(row.EventDetail) + ')' : ''}`).join(' → '));

      if (testKey && key.toLowerCase() === testKey.toLowerCase()) {
        const events = rows.map(row => text(row.Event));
        expect(JSON.stringify(events) === JSON.stringify(config.testSend.events), query, 'Test send history',
          `expected ${config.testSend.events.join(', ')}; got ${events.join(', ')}`);
      }
    }

    const noKey = await run(query, { ID: config.id, limit: '50' });
    expect(noKey.status === 400, query, 'ActivityKey is required (HTTP 400 without it)', describe(noKey));
    const otherContact = await run(query, { ID: '0', ActivityKey: samples[0], limit: '50' });
    expect(otherContact.status === 200 && !otherContact.rows.length, query, 'ID filters the events (none for ID 0)', `${describe(otherContact)}, ${otherContact.rows.length} rows`);
  }

  // Resend cards must point at a send that exists, and the test resend's details.
  function checkResendLinks(sendRows, resendRows, resendDetails) {
    const query = iqa.resends;
    if (!resendRows.length) {
      record('INFO', query, 'Resends to cross-check', 'none for this contact');
      return;
    }
    const sendKeys = new Set(sendRows.map(row => text(row.ActivityKey).toLowerCase()).filter(Boolean));
    if (!sendKeys.size) {
      record('WARN', query, 'Each resend belongs to a listed send', 'skipped: the sends have no ActivityKey');
      return;
    }
    const orphans = resendRows.filter(row => {
      const match = recordUrlPattern.exec(text(row.RecordUrl));
      return !match || !sendKeys.has(match[3].toLowerCase());
    });
    expect(!orphans.length, query, 'Each resend belongs to a listed send (RecipientId in RecordUrl)',
      orphans.length ? `${orphans.length} not matched; sends read may be incomplete (raise config.pages)` : '', 'WARN');

    if (config.testSend?.resendTo) {
      const match = resendDetails.find(({ row }) => text(row['Additional-To'] ?? row['Additional_To']).toLowerCase() === config.testSend.resendTo.toLowerCase());
      expect(Boolean(match), iqa.resendDetails, 'Test resend shows the address the copy went to',
        `expected ${config.testSend.resendTo}`, 'WARN');
    }
  }

  // ------------------------------------------------------------------- run

  if (!token) {
    console.error('No __RequestVerificationToken on this page: open an iMIS page while signed in, then run the probe again.');
    return;
  }
  console.log(`Outbound Emails IQA probe: contact ${config.id}, folders ${config.folder} and ${config.detailsFolder}`);

  const sendRows = await checkCore(iqa.sends, 'send');
  await checkDetails(iqa.sendDetails, sendRows);
  const resendRows = await checkCore(iqa.resends, 'resend');
  const resendDetails = await checkDetails(iqa.resendDetails, resendRows);
  await checkHistory(sendRows);
  checkResendLinks(sendRows, resendRows, resendDetails);

  const counts = results.reduce((totals, row) => ({ ...totals, [row.status]: (totals[row.status] || 0) + 1 }), {});
  console.table(results);
  console.log('Summary', counts);
  window.outboundEmailProbe = { config, results, raw, sendRows, resendRows };
  console.log('Everything fetched is in window.outboundEmailProbe.');
})();
