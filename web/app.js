/* Market Correction Lab UI. No user file is uploaded; session-only import. */
(function(){
'use strict';
const E=window.MCL;
const state={rows:E.syntheticDemo(),label:'DEMO / INDEX',source:'Dane syntetyczne',isDemo:true,period:'ALL',extra:{vix:[],aaii:[],pcr:[]},build:null};
const $=s=>document.querySelector(s);
const all=s=>Array.from(document.querySelectorAll(s));
const fmt=(x,p=2)=>x==null?'—':Number(x).toLocaleString('pl-PL',{minimumFractionDigits:p,maximumFractionDigits:p});
const pct=(x)=>x==null?'—':fmt(x,2)+'%';
const node=(tag,attrs={})=>{const x=document.createElementNS('http://www.w3.org/2000/svg',tag);Object.entries(attrs).forEach(([k,v])=>x.setAttribute(k,v));return x;};
let toastTimeout;
function toast(message,error=false){const t=$('#toast');t.textContent=message;t.className='toast show'+(error?' error':'');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>t.className='toast',5200);}
function setText(sel,s){const v=$(sel);if(v)v.textContent=s;}
function setTab(id){
 all('.navitem').forEach(x=>x.classList.toggle('active',x.dataset.tab===id));
 all('.page').forEach(x=>x.classList.toggle('visible',x.id===id));
 const names={overview:['PRZEGLĄD','Analiza korekt rynkowych','Odkrywaj historyczne spadki, ich głębokość, czas trwania i powroty do szczytów.'],capitulation:['KAPITULACJA','Analiza kapitulacji','Zbadaj występowanie skrajnych warunków sprzedażowych bez zgadywania dna rynku.'],data:['ŹRÓDŁA','Dane i wiarygodność','Kontrola pochodzenia danych, import dodatkowych wskaźników i jawne ograniczenia.']};
 setText('#sectionName',names[id][0]);$('#pageHeading').innerHTML='';$('#pageHeading').append(document.createTextNode(names[id][1]));const dot=document.createElement('span');dot.textContent='.';$('#pageHeading').append(dot);setText('#pageSubtitle',names[id][2]);
 if(id==='overview')requestAnimationFrame(drawCharts);
}
function render(){
 const rows=state.rows;if(!rows.length)return;
 const dd=E.drawdowns(rows),last=rows[rows.length-1],episodes=E.correctionEpisodes(rows),peak=rows.reduce((m,r)=>Math.max(m,r.close),0);
 const curr=dd[dd.length-1].ddPct, worst=dd.reduce((m,r)=>Math.min(m,r.ddPct),0);
 const b=$('#statusBanner');
 b.className='banner '+(state.isDemo?'demo':'real');
 b.querySelector('strong').textContent=state.isDemo?'TRYB DEMONSTRACYJNY':'DANE UŻYTKOWNIKA / UPRAWNIONE ŹRÓDŁO';
 b.querySelector('span').textContent=state.isDemo?'Przykładowe ceny są syntetyczne. Nie są notowaniami giełdowymi ani wynikami rzeczywistego backtestu.':'Analiza na załadowanych danych. Sprawdź ich pochodzenie i kompletność przed wykorzystaniem wyników.';
 setText('#symbolLabel',state.label);setText('#sourceLabel',state.source);
 setText('#marketRange',rows[0].date+' → '+last.date+' · '+rows.length+' sesji');
 setText('#kpiClose',fmt(last.close));setText('#kpiDrawdown',pct(curr));setText('#kpiMax',pct(worst));
 setText('#peakCaption','Szczyt: '+fmt(peak));setText('#kpiCount',episodes.filter(e=>e.depthPct<=-10).length);
 setText('#lastDate',last.date);setText('#episodeTotal',episodes.length+' epizod(y) ≥ 5%');
 setText('#marketState',state.isDemo?'DEMO':'ZAŁADOWANO');
 for(const selector of ['#kpiDrawdown','#kpiMax'])$(selector).classList.toggle('negative',true);
 const body=$('#episodesBody');body.replaceChildren();
 if(!episodes.length){const tr=document.createElement('tr');const td=document.createElement('td');td.colSpan=6;td.className='no-data';td.textContent='Brak spadków ≥ 5% w dostarczonej historii';tr.append(td);body.append(tr);}
 episodes.forEach(ep=>{
 const tr=document.createElement('tr');
 const text=(s,cl)=>{const td=document.createElement('td');td.textContent=s;if(cl)td.className=cl;tr.append(td);return td;};
 text(ep.peakDate);text(ep.troughDate);text(pct(ep.depthPct),'depth');
 const typ=document.createElement('td'),pill=document.createElement('span');pill.className='class-pill '+(ep.depthPct<=-20?'bear':ep.depthPct>-10?'pull':'');pill.textContent=ep.classification;typ.append(pill);tr.append(typ);
 text(String(ep.fallSessions));text(ep.recovered?ep.recoveryDate+' ('+ep.recoverySessions+' sesji)':'NIE — epizod otwarty');body.append(tr);
 });
 renderSignals();drawCharts();
}
function renderSignals(){
 const sig=E.capitulation(state.rows,state.isDemo?{}:state.extra),available=sig.filter(s=>s.active!==null),active=sig.filter(s=>s.active===true);
 setText('#signalCount',active.length+' / '+available.length);
 setText('#signalAvailable',available.length+' z 6 dostępnych wskaźników');
 setText('#analysisAsOf','Dane cenowe do '+state.rows.at(-1).date);
 const area=$('#signalRows');area.replaceChildren();
 sig.forEach(s=>{
  const div=document.createElement('div');div.className='signal';
  const head=document.createElement('div');head.className='signal-head';
  const label=document.createElement('div');label.className='signal-title';label.textContent=s.name;
  const status=document.createElement('span');status.className='signal-status '+(s.active===true?'on':s.active===false?'off':'');status.textContent=s.active===null?'BRAK DANYCH':s.active?'WARUNEK SPEŁNIONY':'NIESPEŁNIONY';head.append(label,status);
  const val=document.createElement('div');val.className='signal-value';
  const perc=s.name==='RSI (14)'||s.name==='RVOL (20)'||s.name==='VIX'||s.name==='Put/Call'? '': s.name==='AAII Bearish'?'%':'%';
  val.textContent=s.value===null?'—':fmt(s.value,2)+perc;
  const note=document.createElement('div');note.className='signal-note';
  const operator=s.name==='RSI (14)'||s.name==='Spadek od szczytu'?'≤':'≥';
  note.textContent='Próg '+operator+' '+s.threshold+(perc?'%':'')+' · '+s.source+(s.asOf?' · '+s.asOf:'');
  div.append(head,val,note);area.append(div);
 });
}
function filteredRows(){
 const rows=state.rows;if(state.period==='ALL')return rows;
 const days=state.period==='6M'?183:state.period==='1Y'?366:1096;
 const cutoff=Date.parse(rows.at(-1).date+'T00:00:00Z')-days*86400000;
 return rows.filter(x=>Date.parse(x.date+'T00:00:00Z')>=cutoff);
}
function drawCharts(){
 if(!$('#overview').classList.contains('visible'))return;
 const original=state.rows;const sliced=filteredRows();
 // Drawdown must use the entire earlier history for peak baseline, not reset at visible filter.
 const dAll=E.drawdowns(original),ref=new Map(dAll.map(r=>[r.date,r]));
 buildChart($('#priceChart'),sliced.map(r=>({date:r.date,v:r.close})),false);
 buildChart($('#ddChart'),sliced.map(r=>({date:r.date,v:ref.get(r.date).ddPct})),true);
}
function buildChart(container,data,isDrawdown){
 container.replaceChildren();if(!data.length)return;
 const w=Math.max(400,container.clientWidth||750),h=container.clientHeight||(isDrawdown?165:295);
 const m={top:15,bottom:28,left:58,right:13},plotw=w-m.left-m.right,ploth=h-m.top-m.bottom;
 const values=data.map(r=>r.v);let min=values.reduce((m,v)=>Math.min(m,v),Infinity),max=values.reduce((m,v)=>Math.max(m,v),-Infinity);
 if(isDrawdown)max=0;else {const pad=(max-min||1)*.12;min-=pad;max+=pad;}
 if(max-min<.0001){min-=1;max+=1;}
 const X=i=>m.left+i/Math.max(1,data.length-1)*plotw;
 const Y=v=>m.top+(max-v)/(max-min)*ploth;
 const svg=node('svg',{viewBox:`0 0 ${w} ${h}`,preserveAspectRatio:'none'});
 const defs=node('defs');const grad=node('linearGradient',{id:isDrawdown?'ddgradient':'pricegradient',x1:'0',y1:'0',x2:'0',y2:'1'});grad.append(node('stop',{offset:'0%','stop-color':isDrawdown?'#f5877b':'#62e6db','stop-opacity':'.18'}),node('stop',{offset:'100%','stop-color':isDrawdown?'#f5877b':'#62e6db','stop-opacity':'0'}));defs.append(grad);svg.append(defs);
 for(let i=0;i<=4;i++){const v=max-(max-min)*i/4,y=Y(v);svg.append(node('line',{x1:m.left,y1:y,x2:w-m.right,y2:y,class:'gridline'}));const tx=node('text',{x:5,y:y+4});tx.textContent=isDrawdown?fmt(v,1)+'%':fmt(v,0);svg.append(tx);}
 for(let i=0;i<=4;i++){const n=Math.round((data.length-1)*i/4);const tx=node('text',{x:X(n),y:h-7,'text-anchor':i===0?'start':i===4?'end':'middle'});tx.textContent=data[n].date.slice(0,7);svg.append(tx);}
 const points=data.map((r,i)=>[X(i),Y(r.v)]),line=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
 const area=line+` L ${X(data.length-1).toFixed(1)} ${(h-m.bottom).toFixed(1)} L ${X(0).toFixed(1)} ${(h-m.bottom).toFixed(1)} Z`;
 svg.append(node('path',{d:area,fill:`url(#${isDrawdown?'ddgradient':'pricegradient'})`}));
 svg.append(node('path',{d:line,class:isDrawdown?'dd':'series'}));
 const cross=node('line',{class:'cross',x1:0,y1:m.top,x2:0,y2:h-m.bottom,visibility:'hidden'});const point=node('circle',{r:4.5,fill:isDrawdown?'#f5877b':'#62e6db',stroke:'#0b1625','stroke-width':2,visibility:'hidden'});svg.append(cross,point);
 const overlay=node('rect',{x:m.left,y:m.top,width:plotw,height:ploth,fill:'transparent',style:'cursor:crosshair'});
 overlay.addEventListener('mousemove',ev=>{
 const bounds=svg.getBoundingClientRect(),xp=(ev.clientX-bounds.left)*w/bounds.width;
 const idx=Math.min(data.length-1,Math.max(0,Math.round((xp-m.left)/plotw*(data.length-1))));
 cross.setAttribute('x1',X(idx));cross.setAttribute('x2',X(idx));cross.setAttribute('visibility','visible');point.setAttribute('cx',X(idx));point.setAttribute('cy',Y(data[idx].v));point.setAttribute('visibility','visible');
 if(!isDrawdown)setText('#chartHover',data[idx].date+' · '+fmt(data[idx].v));
 });
 overlay.addEventListener('mouseleave',()=>{cross.setAttribute('visibility','hidden');point.setAttribute('visibility','hidden');if(!isDrawdown)setText('#chartHover','Najedź na wykres, aby zobaczyć wartość');});
 svg.append(overlay);container.append(svg);
}
async function importFile(type,file){
 if(!file)return;
 try{if(file.size>10*1024*1024)throw Error('Maksymalny rozmiar CSV: 10 MB');
  const records=E.csvRecords(await file.text());
  if(type==='market'){const rows=E.normalizeMarket(records);if(rows.length<2)throw Error('Potrzebne są minimum 2 sesje');state.rows=rows;state.label=String(file.name).replace(/\.csv$/i,'').slice(0,28).toUpperCase();state.source='Import lokalny: '+file.name;state.isDemo=false;state.period='ALL';}
  else {state.extra[type]=E.normalizeAux(records,type);}
  render();toast('Zaimportowano '+file.name+' · '+(type==='market'?state.rows.length:state.extra[type].length)+' rekordów. Dane pozostają w pamięci tej karty.');
 }catch(err){toast('Nie udało się wczytać CSV: '+err.message,true);}
}
async function tryLoadPublished(){
 if(location.protocol==='file:')return;
 try{
 const resp=await fetch('./data/market.json',{cache:'no-store'});if(!resp.ok)return;
 const payload=await resp.json();if(!payload||!Array.isArray(payload.rows)||!payload.rows.length)return;
 const rows=E.normalizeMarket(payload.rows);
 state.rows=rows;state.label=String(payload.symbol||'MARKET INDEX').slice(0,28);state.source=payload.source||'Dane projektu';state.isDemo=false;
 }catch(err){console.warn('Brak opublikowanej serii cenowej:',err.message);}
}
async function tryLoadBls(){
 if(location.protocol==='file:')return;
 try{const r=await fetch('./data/macro.json',{cache:'no-store'});if(!r.ok)return;const data=await r.json();if(!data||!data.observations?.length)return;
 const v=data.observations.at(-1);setText('#blsState','AKTUALIZOWANO');
 setText('#macroBox','USA — stopa bezrobocia (BLS): '+fmt(v.value,1)+'% za '+v.period+' · najnowsza obserwacja źródłowa '+v.period+' · ostatnia próba pobrania '+(data.fetched_at||'nieznana')+'. Dane miesięczne, mogą podlegać rewizjom.');
 }catch(err){console.warn('BLS niedostępny:',err.message);}
}
async function loadBuildStatus(){if(location.protocol==='file:')return;try{const r=await fetch('./data/status.json',{cache:'no-store'});if(r.ok){const d=await r.json();setText('#buildDate','BUILD: '+(d.built_at||'—').slice(0,16).replace('T',' '));}}catch(_){}}
all('.navitem').forEach(x=>x.addEventListener('click',()=>setTab(x.dataset.tab)));
all('#periodButtons button').forEach(x=>x.addEventListener('click',()=>{state.period=x.dataset.period;all('#periodButtons button').forEach(b=>b.classList.toggle('selected',b===x));drawCharts();}));
$('#uploadMarket').addEventListener('click',()=>$('#marketFile').click());
$('#marketFile').addEventListener('change',e=>{importFile('market',e.target.files[0]);e.target.value='';});
for(const k of ['vix','aaii','pcr']){$('#'+k+'Btn').addEventListener('click',()=>$('#'+k+'File').click());$('#'+k+'File').addEventListener('change',e=>{importFile(k,e.target.files[0]);e.target.value='';});}
$('#loadDemo').addEventListener('click',()=>{state.rows=E.syntheticDemo();state.extra={vix:[],aaii:[],pcr:[]};state.label='DEMO / INDEX';state.source='Dane syntetyczne';state.isDemo=true;state.period='ALL';all('#periodButtons button').forEach(b=>b.classList.toggle('selected',b.dataset.period==='ALL'));render();toast('Przywrócono wyraźnie oznaczone dane demonstracyjne.');});
window.addEventListener('resize',()=>{if($('#overview').classList.contains('visible'))drawCharts();});
(async()=>{await tryLoadPublished();await Promise.all([tryLoadBls(),loadBuildStatus()]);render();})();
})();
