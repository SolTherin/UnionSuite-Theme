const fs=require('fs'),p='tools/build-tab-family-comparison.cjs';let s=fs.readFileSync(p,'utf8');
s=s.replace("const explorations=variations.map",`variations.push(
 ['accent-line','Accent underline','Option #6 shape, with a longer accent underline. White selection stays quiet; the colour carries the emphasis.'],
 ['accent-tint','Accent tint','Option #6 shape, with a pale accent fill and a fine accent outline. Stronger selection without a solid block of colour.'],
 ['accent-solid','Solid accent','Option #6 shape, filled with the theme accent. The strongest selection signal at both navigation levels.']
);
const explorations=variations.map`);
s=s.replace('<p class="jump">','<p class="jump"><strong>Accent exploration:</strong> <a href="#option-10">10. Underline</a> · <a href="#option-11">11. Tint</a> · <a href="#option-12">12. Solid</a><br>');
fs.writeFileSync(p,s);
