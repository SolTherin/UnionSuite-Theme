/* Shared preview controls for the status comparison and final member banner. */
const samples = [
  ['Financial member', '#23845B'],
  ['Overdue member', '#D58A10'],
  ['Former member', '#BD454B'],
  ['Non member', '#596579']
];

const label = document.getElementById('label');
const hex = document.getElementById('hex');
const colour = document.getElementById('colour');
const feedback = document.getElementById('feedback');

function luminance(value) {
  const channels = value.slice(1).match(/../g)
    .map(channel => parseInt(channel, 16) / 255)
    .map(channel => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}

function whiteTextColour(input) {
  if (window.UnionSuiteMemberStatus) return window.UnionSuiteMemberStatus.displayColour(input);
  if (1.05 / (luminance(input) + .05) >= 4.5) return input.toUpperCase();

  const channels = input.slice(1).match(/../g).map(value => parseInt(value, 16));
  const shade = factor => '#' + channels
    .map(value => Math.floor(value * factor).toString(16).padStart(2, '0'))
    .join('').toUpperCase();

  let low = 0;
  let high = 1;
  for (let index = 0; index < 24; index++) {
    const middle = (low + high) / 2;
    if (1.05 / (luminance(shade(middle)) + .05) >= 4.5) low = middle;
    else high = middle;
  }
  return shade(low);
}

function update() {
  if (!/^#[0-9a-f]{6}$/i.test(hex.value)) {
    feedback.textContent = 'Enter a six-digit hex colour, for example #23845B.';
    return;
  }

  const source = hex.value.toUpperCase();
  const display = whiteTextColour(source);
  document.documentElement.style.setProperty('--status', display);
  document.documentElement.style.setProperty('--status-readable', display);

  document.querySelectorAll('.us-banner__surface--member').forEach(surface => {
    surface.setAttribute('data-us-status-colour', source);
  });
  window.UnionSuiteMemberStatus?.refresh();

  colour.value = source;
  document.querySelectorAll('.status-label').forEach(node => {
    node.textContent = label.value || 'Status not supplied';
  });
  feedback.textContent = 'Client colour ' + source + ' · Display colour ' + display
    + (source !== display ? ' (darkened for white text).' : '.')
    + ' Status text has at least 4.5:1 contrast.';
}

document.getElementById('preset').addEventListener('change', event => {
  [label.value, hex.value] = samples[event.target.value];
  update();
});
label.addEventListener('input', update);
hex.addEventListener('input', update);
colour.addEventListener('input', () => {
  hex.value = colour.value;
  update();
});
document.querySelector('form.controls').addEventListener('submit', event => event.preventDefault());
update();
