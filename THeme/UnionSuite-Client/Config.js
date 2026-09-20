// Load before Scripts/UnionSuiteTaskbar.js, then reload the page after changes.
// The legacy pipGreeting name now controls Biscuit; existing settings still work.
window.UnionSuiteTaskbarConfig = {
  ...window.UnionSuiteTaskbarConfig,
  pipGreeting: true // true = daily greeting; false = no Biscuit or reserved space.
};
