
document.querySelectorAll('.card').forEach(card=>{
 let year=2026,month=8,selected=null,pickMonth=8,pickYear=2026;
 const today=new Date(2026,8,8),table=card.querySelector('tbody'),title=card.querySelector('.rcTitle'),status=card.querySelector('.status');
 function draw(){
 title.textContent=new Date(year,month,1).toLocaleDateString('en-AU',{month:'long',year:'numeric'});
 table.replaceChildren();const first=new Date(year,month,1),offset=(first.getDay()+6)%7;
 for(let w=0;w<6;w++){const row=document.createElement('tr');for(let d=0;d<7;d++){
 const date=new Date(year,month,1-offset+w*7+d),td=document.createElement('td'),b=document.createElement('button');
 b.type='button';b.textContent=date.getDate();b.setAttribute('aria-label',date.toLocaleDateString('en-AU',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
 if(date.getMonth()!==month)td.classList.add('rcOtherMonth');
 if(+date===+today){td.classList.add('rcFocus');b.setAttribute('aria-current','date')}
 if(selected===+date){td.classList.add('rcSelected');b.setAttribute('aria-pressed','true')}else b.setAttribute('aria-pressed','false');
 b.onclick=()=>{selected=+date;status.textContent='Selected '+b.getAttribute('aria-label');draw()};
 b.onkeydown=e=>{const delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7}[e.key];if(delta){e.preventDefault();const cells=[...table.querySelectorAll('button')],i=cells.indexOf(b);cells[i+delta]?.focus()}};td.append(b);row.append(td)}table.append(row)}
 }
 card.querySelectorAll('[data-step]').forEach(b=>b.onclick=()=>{const dt=new Date(year,month+Number(b.dataset.step),1);year=dt.getFullYear();month=dt.getMonth();draw()});
 function picker(){for(const [cls,values,value] of [['months',Array.from({length:12},(_,i)=>i),pickMonth],['years',Array.from({length:10},(_,i)=>2022+i),pickYear]]){const wrap=card.querySelector('.'+cls);wrap.replaceChildren();values.forEach(v=>{const b=document.createElement('button');b.textContent=cls==='months'?new Date(2026,v,1).toLocaleDateString('en',{month:'short'}):v;b.classList.toggle('selected',v===value);b.setAttribute('aria-pressed',String(v===value));b.onclick=()=>{if(cls==='months')pickMonth=v;else pickYear=v;picker()};wrap.append(b)})}}
 title.onclick=()=>{pickMonth=month;pickYear=year;picker();card.querySelector('.picker button').focus()};
 card.querySelector('.ok').onclick=()=>{month=pickMonth;year=pickYear;draw();status.textContent='Showing '+title.textContent};
 card.querySelector('.cancel').onclick=()=>{pickMonth=month;pickYear=year;picker();status.textContent='Month/year changes cancelled'};
 card.querySelectorAll('.today').forEach(b=>b.onclick=()=>{year=2026;month=8;pickMonth=8;pickYear=2026;selected=+today;draw();picker();status.textContent='Selected demo today: 8 September 2026'});
 draw();picker();
});
