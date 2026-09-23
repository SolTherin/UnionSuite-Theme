/* Paste on the same native Cases page. Works with the installed v0.5.1 probe.
 * Inspects the manager identified by the supplied event callbacks. It does not
 * invoke its methods, create controls, fetch resources or submit grid actions.
 */
(() => {
  'use strict';
  if (window !== window.top) throw new Error('Use the outer page console.');
  const report = window.usCcoInline?.gridDiagnostics();
  if (!report || report.rendering !== 'native-dom' || !report.attachedToCurrentElement) {
    throw new Error('Run on the registered native Cases grid before starting A or B.');
  }
  const managerName = report.gridId + '_jsmanager';
  const globalProperty = Object.getOwnPropertyDescriptor(window, managerName);
  const manager = globalProperty && 'value' in globalProperty ? globalProperty.value : null;
  const managerAvailable = manager !== null && ['object', 'function'].includes(typeof manager);
  const fields = new Map();
  let current = managerAvailable ? manager : null;
  for (let depth = 0; current && current !== Object.prototype && depth < 8; depth++) {
    for (const name of Object.getOwnPropertyNames(current)) {
      if (fields.has(name) || fields.size >= 120) continue;
      const property = Object.getOwnPropertyDescriptor(current, name);
      fields.set(name, { property, depth });
    }
    current = Object.getPrototypeOf(current);
  }
  const eventMethods = ['OnGridCreated', 'OnRowCreated', 'OnRowDeselected', 'OnRowSelected'];
  const lifecycleMethods = ['OnLoad', 'OnUnload', 'Initialize', 'initialize', 'Dispose', 'dispose', 'destroy'];
  const functionNames = [...fields].filter(([, item]) => typeof item.property.value === 'function').map(([name]) => name);
  const selectedMethods = [...new Set([...eventMethods, ...lifecycleMethods, ...functionNames])].slice(0, 24);
  let remainingMethodCharacters = 18000;
  const methods = selectedMethods.map(name => {
    const item = fields.get(name);
    if (!item) return { name, available: false };
    if (!('value' in item.property)) return { name, available: false, reason: 'Accessor not invoked.' };
    if (typeof item.property.value !== 'function') return { name, available: false, type: typeof item.property.value };
    const source = Function.prototype.toString.call(item.property.value);
    const metadata = { name, available: true, prototypeDepth: item.depth, characters: source.length };
    if (/\[native code\]/.test(source)) return { ...metadata, sourceOmitted: 'Native or bound function.' };
    if (source.length > 8000 || source.length > remainingMethodCharacters) return { ...metadata, sourceOmitted: 'Source length limit.' };
    remainingMethodCharacters -= source.length;
    return { ...metadata, source };
  });
  const startupLines = [], skippedLines = [];
  let remainingStartupCharacters = 8000;
  for (const [scriptIndex, script] of [...document.scripts].entries()) {
    if (script.hasAttribute('src')) continue;
    for (const [index, text] of script.textContent.split('\n').entries()) {
      if (!text.includes(managerName)) continue;
      const location = { scriptIndex, line: index + 1, characters: text.length };
      // In particular, omit the large RadGrid descriptor that contains row keys.
      if (/\$create\s*\(|_clientKeyValues|_gridTableViewsData|__VIEWSTATE|__EVENTVALIDATION|__RequestVerificationToken/.test(text)) {
        skippedLines.push({ ...location, reason: 'Grid descriptor or page-state line omitted.' });
      } else if (text.length > 2500 || startupLines.length >= 20 || text.length > remainingStartupCharacters) {
        skippedLines.push({ ...location, reason: 'Source length limit.' });
      } else {
        remainingStartupCharacters -= text.length;
        startupLines.push({ ...location, source: text });
      }
    }
  }
  const result = {
    capture: 'native-cases-manager-source-v1',
    gridId: report.gridId,
    managerName,
    managerAvailable,
    managerAccessorSkipped: Boolean(globalProperty && !('value' in globalProperty)),
    fields: [...fields].map(([name, item]) => ({
      name, prototypeDepth: item.depth,
      type: 'value' in item.property ? typeof item.property.value : 'accessor'
    })),
    methods, startupLines, skippedLines,
    scope: 'Bounded manager method/setup source for manual inspection. Runtime field values and full grid properties are omitted. No manager method, captured script or grid action was executed.'
  };
  if (typeof copy === 'function') copy(JSON.stringify(result, null, 2));
  else console.info(JSON.stringify(result, null, 2));
  return result;
})();
