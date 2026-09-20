// Preview-only seed editor. Uses the theme's existing seed -> brand token mapping.
const seedPicker = document.getElementById('focus-seed');
const seedValue = document.getElementById('focus-seed-value');
const defaultSeed = getComputedStyle(document.documentElement).getPropertyValue('--seed-primary').trim();
seedPicker.value = defaultSeed;
seedValue.textContent = defaultSeed;
seedPicker.addEventListener('input', () => {
  document.documentElement.style.setProperty('--seed-primary', seedPicker.value);
  seedValue.textContent = seedPicker.value;
});
document.getElementById('focus-seed-reset').addEventListener('click', () => {
  document.documentElement.style.removeProperty('--seed-primary');
  seedPicker.value = defaultSeed;
  seedValue.textContent = defaultSeed;
});

document.getElementById('focus-override').addEventListener('change', event => {
  if (event.target.checked) document.documentElement.style.setProperty('--field-focus-colour', '#006f94');
  else document.documentElement.style.removeProperty('--field-focus-colour');
});
