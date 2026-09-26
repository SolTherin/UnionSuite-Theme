// Load before Scripts/UnionSuiteTaskbar.js, then reload the page after changes.
// The legacy pipGreeting name now controls Biscuit; existing settings still work.
window.UnionSuiteTaskbarConfig = {
  ...window.UnionSuiteTaskbarConfig,
  pipGreeting: true // true = daily greeting; false = no Biscuit or reserved space.
};

// Read at each CCO tab click, so this file may load before or after zUnionSuite.js.
window.UnionSuiteCcoSwitchConfig = {
  ...window.UnionSuiteCcoSwitchConfig,
  enabled: true // true = CCO tabs switch in place; false = every CCO uses native page reloads.
};
