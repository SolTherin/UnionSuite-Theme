/* UnionSuite loader — TRIAL.

   One header include that resolves its own location and loads the theme's
   scripts as a small dependency graph. Independent branches start together;
   only real dependencies are serialised.

   Header include, replacing the individual script includes:
     <script src="/App_Themes/UnionSuite-Core/index.js" defer></script>

   Inline configuration still belongs in the header, before this file:
     <script>window.UnionSuiteTaskbarConfig = { pipGreeting: false };</script>

   This is a spike, not the planned loader. Context classification, the client
   folder and the remaining feature files in
   THEME-ENHANCEMENTS-INTEGRATION-PLAN.md are out of scope here.

   Read window.UnionSuiteLoader.status() in the console to see what happened. */
(function () {
  'use strict';

  // Applied to every child request so a release can be published without
  // editing the header include. Bump this when child files change.
  const RELEASE = '0.2.0-trial';
  const LOAD_TIMEOUT_MS = 20000;

  /* Load graph.

     after   ids that must register first. Absent means the module starts
             immediately, in parallel with the other roots.
     when    optional gate. A gated-out module is never downloaded.
     ready   registration check. Loading is not success: a file that parses
             and then throws still fires load. null means the file registers
             nothing, so loading is all that can be confirmed. */
  const MODULES = [
    {
      id: 'core',
      path: 'zUnionSuite.js',
      ready: () => typeof window.UnionSuiteActions?.define === 'function'
    },
    {
      id: 'actions',
      path: 'Scripts/ActionDefinitions.js',
      after: ['core'], // Throws without the shared action runtime.
      ready: () => window.UnionSuiteActions?.has?.('home.manage-bulletin') === true
    },
    {
      id: 'taskbar',
      path: 'Scripts/UnionSuiteTaskbar.js',
      // Reads window.UnionSuiteAppearance from zUnionSuite.js to build its
      // appearance switch, and mounts immediately when injected after
      // DOMContentLoaded, so the edge has to be honoured here.
      after: ['core'],
      ready: () => typeof window.UnionSuiteTaskbar?.initialise === 'function'
    },
    {
      id: 'bookmarks',
      path: 'Scripts/UnionSuiteTaskbar-Bookmarks.js',
      after: ['taskbar'], // Replaces the taskbar's own quick-links region.
      ready: () => typeof window.UnionSuiteTaskbarBookmarks?.initialise === 'function'
    },
    {
      id: 'iqa',
      path: 'Scripts/IQA-Enhancements.js',
      // 230KB, and the file already returns early on any other page. Matching
      // its own guard keeps it off every unrelated page's network.
      when: () => /\/QueryBuilder\/Design\.aspx$/i.test(location.pathname),
      ready: null // Registers no global; its window.* names are native page functions.
    }
  ];

  if (window.UnionSuiteLoader) return; // One loader per document.

  const records = new Map();
  const started = new Map();

  function record(module) {
    if (!records.has(module.id)) {
      records.set(module.id, {
        id: module.id, path: module.path, url: null, state: 'pending', detail: null, ms: null
      });
    }
    return records.get(module.id);
  }

  // Resolve child files against this file's own URL, never against the iMIS
  // page: the page can live anywhere in the site tree, and the theme folder
  // name differs between tenants.
  function resolveBase() {
    const own = document.currentScript?.src || [...document.scripts]
      .map(script => script.src)
      .filter(Boolean)
      .find(src => /\/index\.js(?:[?#]|$)/i.test(src));
    return own ? new URL('./', own) : null;
  }

  const base = resolveBase();

  if (!base) {
    console.error('[UnionSuite loader] Could not determine the loader URL. An inline or rewritten include cannot resolve theme paths.');
  }

  function childUrl(path) {
    const url = new URL(path, base);
    url.searchParams.set('v', RELEASE);
    return url.href;
  }

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      let settled = false;
      let executionError = null;

      // A child that parses but throws still fires load, so capture its error
      // to tell "file did not arrive" apart from "file ran and failed".
      const onWindowError = event => {
        if (event.filename === url) executionError = event.message;
      };
      window.addEventListener('error', onWindowError);

      const finish = (ok, detail) => {
        if (settled) return;
        settled = true;
        window.removeEventListener('error', onWindowError);
        clearTimeout(timer);
        ok ? resolve() : reject(new Error(detail));
      };

      const timer = setTimeout(
        () => finish(false, 'Timed out after ' + LOAD_TIMEOUT_MS + 'ms.'),
        LOAD_TIMEOUT_MS
      );

      const script = document.createElement('script');
      script.src = url;
      script.async = false; // Preserve insertion order.
      script.addEventListener('load', () => finish(
        !executionError,
        'The file loaded but threw during execution: ' + executionError
      ));
      script.addEventListener('error', () => finish(
        false,
        'The file could not be loaded. Check that it is uploaded and served from the theme folder.'
      ));
      document.head.append(script);
    });
  }

  const moduleById = id => MODULES.find(module => module.id === id);

  // Memoised per module, so a shared dependency is requested once and
  // independent branches overlap instead of queueing.
  function run(module) {
    if (started.has(module.id)) return started.get(module.id);

    const entry = record(module);

    const promise = (async () => {
      if (module.when && !module.when()) {
        entry.state = 'gated';
        entry.detail = 'Not required on this page.';
        return;
      }

      const dependencies = (module.after || []).map(moduleById);
      const outcomes = await Promise.allSettled(dependencies.map(run));
      const unmet = dependencies.filter((dependency, index) =>
        outcomes[index].status === 'rejected' || record(dependency).state === 'gated');

      if (unmet.length) {
        entry.state = 'blocked';
        entry.detail = 'Dependency unavailable: ' + unmet.map(item => item.path).join(', ');
        throw new Error(entry.detail);
      }

      if (module.ready?.()) {
        entry.state = 'skipped';
        entry.detail = 'Already present — an existing include supplied this file.';
        return;
      }

      entry.url = childUrl(module.path);
      const begun = performance.now();

      try {
        await loadScript(entry.url);
      } catch (error) {
        entry.state = 'failed';
        entry.detail = error.message;
        entry.ms = Math.round(performance.now() - begun);
        throw error;
      }

      entry.ms = Math.round(performance.now() - begun);

      if (module.ready && !module.ready()) {
        entry.state = 'failed';
        entry.detail = 'The file loaded but did not register as expected.';
        throw new Error(entry.detail);
      }

      entry.state = 'loaded';
      if (!module.ready) {
        entry.detail = 'Loaded. This file registers no global, so execution is unverified.';
      }
    })();

    started.set(module.id, promise);
    return promise;
  }

  async function bootstrap() {
    if (!base) return false;
    await Promise.allSettled(MODULES.map(run));
    return [...records.values()].every(entry => entry.state !== 'failed' && entry.state !== 'blocked');
  }

  // One startup promise per document, so a repeated include cannot start twice.
  const ready = bootstrap().then(ok => {
    const rows = [...records.values()];
    const broken = rows.filter(row => row.state === 'failed' || row.state === 'blocked');
    console[broken.length ? 'warn' : 'info'](
      '[UnionSuite loader] ' + RELEASE + ' — ' +
      (broken.length ? broken.length + ' module(s) did not load.' : 'all modules satisfied.')
    );
    console.table(rows.map(({ path, state, ms, detail }) => ({ path, state, ms, detail })));
    return ok;
  });

  window.UnionSuiteLoader = Object.freeze({
    version: RELEASE,
    base: base?.href || null,
    ready,
    status: () => [...records.values()].map(entry => ({ ...entry }))
  });
})();
