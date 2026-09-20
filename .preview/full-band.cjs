const fs=require('fs'),p='tools/build-tab-family-comparison.cjs';let s=fs.readFileSync(p,'utf8');
s=s.replace('const explorations=variations.map',`const fullBand='<section class="exploration selected-six full-band" id="six-full-band"><div class="caption"><small>Option 6B — banner variation</small><h2>Full-width darker tab area</h2><p>The same compact tabs, with the darker surface filling the entire area below the separator.</p></div>'+context('banner','six-band-banner')+'</section>';
const explorations=variations.map`);
s=s.replace(String.fromCharCode(36)+'{selectedSix}<details>',String.fromCharCode(36)+'{selectedSix}'+String.fromCharCode(36)+'{fullBand}<details>');
s=s.replace('Selected: option 6 in context</strong></a>','Selected: option 6 in context</strong></a> · <a href="#six-full-band">6B. Full-width tab area</a>');
fs.writeFileSync(p,s);
