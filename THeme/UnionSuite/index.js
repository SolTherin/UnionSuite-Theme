/* UnionSuite loader — TRIAL.

   One header include that resolves its own location and loads the theme's
   scripts as a dependency graph. Every file is preloaded at once so the
   downloads overlap, while execution still follows the dependency order.

   Header include, replacing the individual script includes. Deploy it once;
   it never needs changing again, so every later release ships in the theme
   folder alone.

     <script>
       // Optional, and must come before the loader.
       window.UnionSuiteTaskbarConfig = { pipGreeting: false };
       (function () {
         var s = document.createElement('script');
         // 20-minute bucket. iMIS serves App_Themes with
         // Cache-Control: public, max-age=604800, so a stable entry URL
         // would be cached for a week and no release could reach a
         // returning browser. The bucket caps that at 20 minutes while
         // still serving from cache in between.
         s.src = '/App_Themes/UnionSuite-Core/index.js?t=' + Math.floor(Date.now() / 1200000);
         s.async = true; // The loader touches no DOM; it need not wait for the parser.
         document.head.appendChild(s);
       })();
     </script>

   The ?t= parameter is ignored here: child paths resolve against this file's
   directory, which drops the query.

   This is a spike, not the planned loader. Context classification, the client
   folder and the remaining feature files in
   THEME-ENHANCEMENTS-INTEGRATION-PLAN.md are out of scope here.

   Read window.UnionSuiteLoader.status() in the console to see what happened. */
(function () {
  'use strict';

  // Applied to every child request. The children are cached for a week on
  // stable URLs, so this is what invalidates them. Bump it when a child file
  // changes; changing this loader alone does not need it, because the entry
  // URL refreshes itself. Bumping needlessly re-downloads every child.
  const RELEASE = '0.3.0-trial';
  const LOAD_TIMEOUT_MS = 20000;

  /* Load graph.

     after     ids that must register first. Absent means the module starts
               immediately, in parallel with the other roots.
     when      optional gate. A gated-out module is never preloaded or loaded.
     ready     registration check. Loading is not success: a file that parses
               and then throws still fires load. null means the file registers
               nothing, so loading is all that can be confirmed.
     critical  false keeps the module out of the ready promise. It still loads
               in dependency order; the page simply does not wait on it. */
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
      // Off the critical path: the taskbar is usable without it, and its own
      // settings request adds most of a second. It is still started as soon
      // as the taskbar registers, rather than parked on an idle callback,
      // because it replaces visible controls and a deliberate delay would
      // only widen the swap.
      critical: false,
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
        id: module.id, path: module.path, url: null, state: 'pending',
        detail: null, ms: null, critical: module.critical !== false
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

  /* Request every file this page will actually use, at once and up front.
     Without this the chain pays one round trip per step, and on iMIS a round
     trip costs about the same for a 6KB file as for a 286KB one. The preload
     href must match the eventual script src exactly, or the browser fetches
     the file twice. */
  function preload() {
    MODULES
      .filter(module => !(module.when && !module.when()))
      .filter(module => !module.ready?.())
      .forEach(module => {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'script';
        link.href = childUrl(module.path);
        document.head.append(link);
      });
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

      // With preloading this measures execution plus a cache hit, not the
      // download. Read the resource timings for actual transfer cost.
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

  function broken() {
    return [...records.values()].filter(row => row.state === 'failed' || row.state === 'blocked');
  }

  function report(label) {
    const rows = [...records.values()];
    const failures = broken();
    console[failures.length ? 'warn' : 'info'](
      '[UnionSuite loader] ' + RELEASE + ' — ' + label + ' — ' +
      (failures.length ? failures.length + ' module(s) did not load.' : 'all modules satisfied.')
    );
    console.table(rows.map(({ path, state, critical, ms, detail }) =>
      ({ path, state, critical, ms, detail })));
  }

  let ready;
  let complete;

  if (!base) {
    ready = Promise.resolve(false);
    complete = Promise.resolve(false);
  } else {
    preload();

    // Start everything. Dependencies resolve through the memoised graph, so
    // independent branches overlap instead of queueing behind each other.
    // Rejections are recorded on the entries, so they are swallowed here.
    const settled = new Map(MODULES.map(module => [module, run(module).catch(() => {})]));

    const isCritical = module => module.critical !== false;
    const failed = module => {
      const state = records.get(module.id)?.state;
      return state === 'failed' || state === 'blocked';
    };

    // ready settles once the critical modules are in place, and reports only
    // on those. Non-critical work continues behind it rather than holding
    // the page.
    ready = Promise.all([...settled].filter(([module]) => isCritical(module)).map(([, done]) => done))
      .then(() => {
        report('critical ready');
        return !MODULES.filter(isCritical).some(failed);
      });

    complete = Promise.all([...settled.values()]).then(() => {
      if (MODULES.some(module => !isCritical(module))) report('complete');
      return broken().length === 0;
    });
  }

  window.UnionSuiteLoader = Object.freeze({
    version: RELEASE,
    base: base?.href || null,
    ready,    // critical modules only
    complete, // every module, including non-critical ones
    status: () => [...records.values()].map(entry => ({ ...entry }))
  });
})();
