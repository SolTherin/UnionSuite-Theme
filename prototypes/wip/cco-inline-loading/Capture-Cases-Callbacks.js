/* Paste into the same outer console after the native Cases v0.5.1 report.
 * Copies only the observed descriptor's event/reference arguments and short
 * related helper scripts. Does not execute source, read fields or start B.
 */
(() => {
  'use strict';
  if (window !== window.top) throw new Error('Use the outer page console.');
  const report = window.usCcoInline?.gridDiagnostics();
  if (!report || report.rendering !== 'native-dom') {
    throw new Error('Run on native Cases with the existing probe, before starting A or B.');
  }
  const descriptors = report.descriptors.filter(item =>
    item.constructor === 'Telerik.Web.UI.RadGrid' && item.target.id === report.gridId
  );
  if (descriptors.length !== 1) throw new Error('Expected one diagnosed Cases RadGrid descriptor.');
  const descriptor = descriptors[0];
  if (!descriptor.properties.supported || !descriptor.referencesSupported || descriptor.references.length) {
    throw new Error('The descriptor differs from the observed JSON-properties/empty-references contract.');
  }
  const scripts = [...document.scripts];
  const script = scripts[descriptor.scriptIndex];
  if (!script || script.hasAttribute('src')) throw new Error('The diagnosed inline script is no longer present.');
  const lines = script.textContent.split('\n');
  const source = lines.slice(descriptor.line - 1).join('\n');
  const prefix = /\$create\s*\(\s*Telerik\.Web\.UI\.RadGrid\s*,\s*/g;
  const candidates = [];
  for (const match of source.matchAll(prefix)) {
    // The diagnostic supplies the line of the actual call. Do not drift into
    // a later descriptor if the document changed after that observation.
    if (match.index >= lines[descriptor.line - 1].length) break;
    const start = match.index + match[0].length;
    if (source[start] !== '{') continue;
    let depth = 0, quoted = false, escaped = false, end = -1;
    for (let index = start; index < source.length; index++) {
      const char = source[index];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{') depth++;
      else if (char === '}' && --depth === 0) { end = index + 1; break; }
    }
    if (end < 0) continue;
    let properties;
    try { properties = JSON.parse(source.slice(start, end)); }
    catch { continue; }
    if (properties.ClientID !== report.gridId) continue;

    // Never include the properties: _clientKeyValues and serialized table data
    // can contain member rows. The supplied report confirmed empty references.
    const escapedId = report.gridId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const ending = new RegExp(',\\s*\\$get\\s*\\(\\s*([\'"])' + escapedId + '\\1\\s*\\)\\s*\\)\\s*;', 'g');
    const remainder = source.slice(end, end + 5000);
    const endings = [...remainder.matchAll(ending)];
    if (endings.length !== 1) throw new Error('Could not isolate one bounded Cases call ending.');
    const argumentsText = remainder.slice(0, endings[0].index);
    const argumentsMatch = argumentsText.match(/^\s*,\s*([\s\S]+),\s*(null|\{\s*\})\s*$/);
    if (!argumentsMatch || /\$create\s*\(/.test(argumentsMatch[1])) {
      throw new Error('Callback capture crossed an unexpected call or reference boundary.');
    }
    candidates.push({ eventsSource: argumentsMatch[1].trim(), referencesSource: argumentsMatch[2] });
  }
  if (candidates.length !== 1) throw new Error('Could not isolate exactly one matching Cases callback source.');

  const unsupported = new Set(report.unsupportedScripts.map(item => item.scriptIndex));
  const helpers = report.relatedScripts
    .filter(item => unsupported.has(item.scriptIndex) && item.characters <= 300)
    .map(item => {
      const helper = scripts[item.scriptIndex];
      if (!helper || helper.hasAttribute('src') || helper.textContent.length !== item.characters || !helper.textContent.includes(report.gridId)) {
        throw new Error('A short related helper changed; rerun the grid diagnostic.');
      }
      return { scriptIndex: item.scriptIndex, source: helper.textContent };
    });
  const result = {
    capture: 'native-cases-callback-source-v1',
    gridId: report.gridId,
    descriptorSource: { scriptIndex: descriptor.scriptIndex, line: descriptor.line },
    ...candidates[0],
    shortRelatedHelpers: helpers,
    scope: 'Exact bounded callback/helper source for manual inspection. Properties, row data and input values are not captured. Nothing is initialized or submitted.'
  };
  if (typeof copy === 'function') copy(JSON.stringify(result, null, 2));
  else console.info(JSON.stringify(result, null, 2));
  return result;
})();
