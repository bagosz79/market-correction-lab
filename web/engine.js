/* Market Correction Lab v0.1. Pure calculation engine; no look-ahead. */
(function (root) {
  'use strict';
  const DATE = /^\d{4}-\d{2}-\d{2}$/;
  const iso = s => {
    const v = String(s ?? '').trim().slice(0, 10);
    if (!DATE.test(v) || Number.isNaN(Date.parse(v + 'T00:00:00Z')) || new Date(v+'T00:00:00Z').toISOString().slice(0,10) !== v) throw Error('Niepoprawna data ISO YYYY-MM-DD: ' + s);
    return v;
  };
  const number = x => {
    if (x === '' || x == null || x === '.' || x === 'null') return null;
    let s=String(x).trim().replace(/\s/g, '');
    if (s.includes(',') && s.includes('.')) {
      // 1,234.56 (US) or 1.234,56 (EU): detect last decimal mark.
      s=s.lastIndexOf(',')>s.lastIndexOf('.') ? s.replace(/\./g,'').replace(',', '.') : s.replace(/,/g,'');
    } else if (s.includes(',')) {
      // Decimal comma is common in semicolon-delimited European CSV.
      if ((s.match(/,/g)||[]).length!==1) return null;
      s=s.replace(',', '.');
    }
    if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(s)) return null;
    const n=Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const key = s => String(s).toLowerCase().replace(/[\s_()\-./]/g, '');
  function csvRecords(text) {
    const raw = String(text).replace(/^\uFEFF/, '');
    const first = raw.split(/\r?\n/)[0] || '';
    const delim = (first.match(/;/g)||[]).length > (first.match(/,/g)||[]).length ? ';' : ',';
    const rows=[]; let row=[],field='',quoted=false;
    for(let i=0;i<raw.length;i++){
      const c=raw[i];
      if(c==='"') { if(quoted && raw[i+1]==='"'){field+='"';i++;}else quoted=!quoted; }
      else if(c===delim && !quoted) { row.push(field);field=''; }
      else if((c==='\n'||c==='\r') && !quoted){if(c==='\r'&&raw[i+1]==='\n')i++;row.push(field);if(row.some(x=>x.trim()!==''))rows.push(row);row=[];field='';}
      else field+=c;
    }
    if(quoted)throw Error('Niedomknięty cudzysłów w CSV');
    row.push(field);if(row.some(x=>x.trim()!==''))rows.push(row);
    if(rows.length<2)throw Error('CSV musi mieć nagłówek i przynajmniej jeden wiersz danych');
    const header=rows[0].map(key);
    return rows.slice(1).map((r,i)=>{const o={};header.forEach((h,j)=>{o[h]=(r[j]||'').trim();});o.__line=i+2;return o;});
  }
  function field(o,names){for(const n of names){const k=key(n);if(Object.prototype.hasOwnProperty.call(o,k))return o[k];}return undefined;}
  function normalizeMarket(rows) {
    const mapped = rows.map((o, i) => {
      const rawPrice=field(o,['close','Adj Close','adj_close','NASDAQ100','SP500','DJIA','value','price']);
      if(String(rawPrice??'').trim()==='.')return null; // FRED missing observation; never interpolate
      const date=iso(field(o,['Date','DATE','observation_date','timestamp']));
      const value=number(rawPrice);
      if(value===null||value<=0)throw Error(`Brak dodatniej ceny zamknięcia w wierszu ${o.__line||i+1}`);
      const v=number(field(o,['volume','vol']));
      return {date,close:value,volume:v!==null&&v>0?v:null};
    }).filter(Boolean).sort((a,b)=>a.date.localeCompare(b.date));
    if(!mapped.length)throw Error('Brak wierszy cenowych');
    for(let i=1;i<mapped.length;i++)if(mapped[i].date===mapped[i-1].date)throw Error('Duplikat daty: '+mapped[i].date);
    return mapped;
  }
  function normalizeAux(rows, type) {
    const data=rows.map((o,i)=>{
      const date=iso(field(o, type==='aaii'?['published_at','publication_date']:['date','DATE','observation_date']));
      if(type==='aaii'){
        const bearish=number(field(o,['bearish'])),bullish=number(field(o,['bullish'])),neutral=number(field(o,['neutral']));
        if(bearish===null||bullish===null||bearish<0||bullish<0||bearish>100||bullish>100)throw Error('Niepoprawne odczyty AAII — wiersz '+(o.__line||i+1));
        if(neutral!==null&&(neutral<0||neutral>100))throw Error('Niepoprawne AAII neutral');
        return {date,bearish,bullish,neutral};
      }
      const v=number(field(o, type==='vix'?['vix','value','close','VIXCLS']:['ratio','put_call','pcr','value']));
      if(v===null||v<0)throw Error('Niepoprawna wartość '+type+' — wiersz '+(o.__line||i+1));
      return {date,value:v};
    }).sort((a,b)=>a.date.localeCompare(b.date));
    for(let i=1;i<data.length;i++)if(data[i].date===data[i-1].date)throw Error('Duplikat daty '+type+' '+data[i].date);
    return data;
  }
  function latestAsOf(series, date, maxAgeDays){
    if(!Array.isArray(series) || !series.length)return null;
    let l=0,r=series.length;
    while(l<r){const mid=(l+r)>>1; if(series[mid].date<=date)l=mid+1;else r=mid;}
    const v=series[l-1];if(!v)return null;
    const gap=(Date.parse(date+'T00:00:00Z')-Date.parse(v.date+'T00:00:00Z'))/86400000;
    return gap>=0&&gap<=maxAgeDays?v:null;
  }
  function rsi(rows,end=rows.length-1,period=14){
    if(end<period)return null;
    let gain=0,loss=0;
    for(let i=1;i<=period;i++){const d=rows[i].close-rows[i-1].close;gain+=Math.max(0,d);loss+=Math.max(0,-d);}
    gain/=period;loss/=period;
    for(let i=period+1;i<=end;i++){const d=rows[i].close-rows[i-1].close;gain=(gain*(period-1)+Math.max(0,d))/period;loss=(loss*(period-1)+Math.max(0,-d))/period;}
    if(loss===0&&gain===0)return 50;
    if(loss===0)return 100;
    return 100-(100/(1+gain/loss));
  }
  function drawdowns(rows){
    if(!rows.length)return [];
    let peak=rows[0].close;
    return rows.map(r=>{peak=Math.max(peak,r.close);return {...r,peak,ddPct:(r.close/peak-1)*100};});
  }
  function correctionEpisodes(rows,minDrawdown=5){
    if(!rows.length)return [];
    const episodes=[];
    let peakI=0,peak=rows[0].close,troughI=0,active=false;
    function complete(recoveryI){
      const depth=(rows[troughI].close/peak-1)*100;
      if(depth<=-minDrawdown){
        episodes.push({peakDate:rows[peakI].date,peakPrice:peak,troughDate:rows[troughI].date,troughPrice:rows[troughI].close,depthPct:depth,recovered:recoveryI!==null,recoveryDate:recoveryI===null?null:rows[recoveryI].date,fallSessions:troughI-peakI,recoverySessions:recoveryI===null?null:recoveryI-troughI,totalSessions:recoveryI===null?rows.length-1-peakI:recoveryI-peakI,classification:depth<=-20?'Bessa 20%+':depth<=-10?'Korekta 10–20%':'Cofnięcie 5–10%'});
      }
    }
    for(let i=1;i<rows.length;i++){
      const p=rows[i].close;
      if(p>=peak){if(active)complete(i);peakI=i;peak=p;troughI=i;active=false;}
      else {if(!active){active=true;troughI=i;} if(p<rows[troughI].close)troughI=i;}
    }
    if(active)complete(null);
    return episodes.reverse();
  }
  function calcRvol(rows,index=rows.length-1,period=20){
    if(index<period||rows[index].volume==null)return null;
    const prior=rows.slice(index-period,index).map(r=>r.volume);
    if(prior.some(v=>v===null))return null;
    const avg=prior.reduce((a,b)=>a+b,0)/period;return avg>0?rows[index].volume/avg:null;
  }
  function classifySignal(name,value,threshold,comparison,source,asOf){
    return {name,value,threshold,active:value===null?null:comparison==='gte'?value>=threshold:value<=threshold,source,asOf:asOf||null};
  }
  function capitulation(rows,extra={}){
    if(!rows.length)return [];
    const latest=rows[rows.length-1],dd=drawdowns(rows).at(-1).ddPct;
    const vd=latestAsOf(extra.vix||[],latest.date,4), aa=latestAsOf(extra.aaii||[],latest.date,14), pc=latestAsOf(extra.pcr||[],latest.date,4);
    return [
      classifySignal('RSI (14)',rsi(rows),30,'lte','Ceny zamknięcia',latest.date),
      classifySignal('Spadek od szczytu',dd,-10,'lte','Ceny zamknięcia',latest.date),
      classifySignal('RVOL (20)',calcRvol(rows),2,'gte','Wolumen 20 poprzednich sesji',latest.date),
      classifySignal('VIX',vd?vd.value:null,30,'gte','Import VIX',vd?.date),
      classifySignal('AAII Bearish',aa?aa.bearish:null,50,'gte','Data publikacji AAII',aa?.date),
      classifySignal('Put/Call',pc?pc.value:null,1.2,'gte','Import Put/Call',pc?.date)
    ];
  }
  function syntheticDemo() {
    let seed=13451; const rand=()=>{seed=(1664525*seed+1013904223)>>>0;return seed/4294967296;};
    let price=100, i=0,day=new Date('2024-04-01T00:00:00Z');const rows=[];
    while(rows.length<670){const dow=day.getUTCDay();if(dow!==0&&dow!==6){
      const slump=(i>115&&i<145?-.012:i>325&&i<380?-.008:i>540&&i<580?-.011:0);
      const surge=(i>145&&i<200?.006:i>380&&i<450?.004:0);
      price=Math.max(5,price*(1+.0007+slump+surge+(rand()-.5)*.027));
      rows.push({date:day.toISOString().slice(0,10),close:+price.toFixed(3),volume:Math.round(1800000*(.7+rand()))});i++;
    }day.setUTCDate(day.getUTCDate()+1);}
    return rows;
  }
  const API={iso,csvRecords,normalizeMarket,normalizeAux,latestAsOf,rsi,drawdowns,correctionEpisodes,calcRvol,capitulation,syntheticDemo};
  root.MCL=API;
  if(typeof module!=='undefined'&&module.exports)module.exports=API;
})(typeof window!=='undefined'?window:globalThis);
