const fs=require('fs'),p='tools/build-tab-family-comparison.cjs';let s=fs.readFileSync(p,'utf8');
const extra=`
const variations=[
 ['soft','Soft inset','Closest to #6: a softly rounded track and a raised white selection. The banner uses the same rounded rectangle.'],
 ['pill','Rounded capsule','A more rounded shape at both levels, with a small accent marker. Friendly, but more prominent.'],
 ['line','Crisp segmented','Tighter corners and an outlined selection, with less shadow. A more restrained option for dense screens.']
];
function subTabs(id){
 const labels=['Contact details','Addresses','Employment'];
 return '<div class="sub-nav" role="tablist" aria-label="Profile subsections">'+labels.map((n,i)=>'<button class="sub-tab'+(i===0?' is-active':'')+'" type="button" role="tab" id="'+id+'-tab-'+i+'" aria-controls="'+id+'-panel" aria-selected="'+(i===0)+'" tabindex="'+(i===0?0:-1)+'">'+n+'</button>').join('')+'</div><div class="sub-content" role="tabpanel" id="'+id+'-panel" aria-labelledby="'+id+'-tab-0" tabindex="0"><h3>Contact details</h3><p>Preferred contact information for this member.</p><div class="sample-facts"><span>Email<strong>tony@example.org</strong></span><span>Mobile<strong>0400 123 777</strong></span></div></div>';
}
function context(kind,id){
 const inner='<div class="context-body" id="'+id+'-panel" role="tabpanel" aria-labelledby="'+id+'-tab-0" tabindex="0"><h3>Overview</h3><p class="context-note">Member sections above · subsections below</p>'+subTabs(id+'-sub')+'</div>';
 if(kind==='banner')return '<div class="context banner-context"><p class="context-label">Under banner tabs · proposed matching shape</p><div class="ContentItemContainer"><div class="us-banner"><header class="us-banner__surface us-banner__surface--member" style="--member-status-colour:#23845B"><div class="us-banner__summary"><div class="us-banner__identity"><span class="us-banner__eyebrow">Member · 103885</span><h2 class="us-banner__title">Tony Fin Stark</h2></div><span class="us-banner__badge us-banner__badge--member-status">Financial member</span></div><div class="us-banner__nav"><div class="us-banner__tabs" role="tablist" aria-label="Member sections">'+buttons(id,'us-banner__tab')+'</div></div></header></div></div>'+inner+'</div>';
 return '<div class="context"><p class="context-label">Under '+(kind==='vertical'?'vertical':'horizontal')+' CCO · current parent styling</p><div class="tabs-wrapper '+(kind==='vertical'?'tabs-vertical':'')+'">'+native(id,kind==='vertical')+'<div class="RadMultiPage">'+inner+'</div></div></div>';
}
const explorations=variations.map(([key,title,note],i)=>'<section class="exploration '+key+'" id="option-'+(i+7)+'"><div class="caption"><small>Option '+(i+7)+' — submenu direction</small><h2>'+(i+7)+'. '+title+'</h2><p>'+note+'</p></div><div class="contexts">'+context('banner',key+'-banner')+context('horizontal',key+'-h')+context('vertical',key+'-v')+'</div></section>').join('');
`;
s=s.replace("fs.writeFileSync('references/Tab-Family-Comparison.html'",extra+"\nfs.writeFileSync('references/Tab-Family-Comparison.html'");
s=s.replace('<div class="comparison">','<p class="jump"><a href="#option-7">7. Soft inset</a> · <a href="#option-8">8. Rounded capsule</a> · <a href="#option-9">9. Crisp segmented</a></p><div class="comparison">');
s=s.replace('</div><aside><h2>What we’re choosing','</div>'+String.fromCharCode(36)+'{explorations}<aside><h2>What we’re choosing');
fs.writeFileSync(p,s);
