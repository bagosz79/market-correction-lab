const {test}=require('node:test');const assert=require('node:assert/strict');
const E=require('../web/engine.js');
const mk=(close)=>close.map((c,i)=>({date:new Date(Date.UTC(2024,0,2+i)).toISOString().slice(0,10),close:c,volume:100}));
test('correction from peak to trough and recovery does not merge two episodes',()=>{
 const episodes=E.correctionEpisodes(mk([100,110,105,99,88,98,111,100,95,112]));
 assert.equal(episodes.length,2);assert.equal(episodes[1].peakPrice,110);assert.equal(episodes[1].troughPrice,88);assert.equal(episodes[1].recovered,true);
 assert.equal(episodes[0].peakPrice,111);assert.equal(episodes[0].troughPrice,95);
});
test('no recovery is fabricated at end',()=>{
 const arr=E.correctionEpisodes(mk([100,110,80,90]));assert.equal(arr.length,1);assert.equal(arr[0].recoveryDate,null);assert.equal(arr[0].recovered,false);assert.equal(arr[0].classification,'Bessa 20%+');
});
test('close based only: shallow drawdown 5% is included, 4% not',()=>{
 assert.equal(E.correctionEpisodes(mk([100,95,100])).length,1);
 assert.equal(E.correctionEpisodes(mk([100,96,100])).length,0);
});
test('CSV normalizes FRED, BOM, trailing newline and quotes',()=>{
 const rows=E.normalizeMarket(E.csvRecords('\ufeffDATE,NASDAQ100\n2024-01-02,123.4\n2024-01-03,"122.6"\n'));
 assert.equal(rows[1].close,122.6);assert.equal(rows[0].volume,null);
});
test('bad duplicate dates and future as-of never leak into earlier date',()=>{
 assert.throws(()=>E.normalizeMarket(E.csvRecords('Date,Close\n2024-01-02,100\n2024-01-02,101')),/Duplikat/);
 assert.equal(E.latestAsOf([{date:'2024-05-10',value:40}],'2024-05-09',4),null);
});
test('AAII requires published_at, not week-ending date',()=>{
 assert.throws(()=>E.normalizeAux(E.csvRecords('date,bullish,bearish\n2024-01-01,20,60'),'aaii'),/data ISO/);
 const out=E.normalizeAux(E.csvRecords('published_at,bullish,neutral,bearish\n2024-01-04,20,20,60'),'aaii');assert.equal(out[0].bearish,60);
});
test('RVOL uses preceding 20 sessions, without current volume in baseline',()=>{
 const rows=Array.from({length:21},(_,i)=>({close:100,date:new Date(Date.UTC(2024,0,1+i)).toISOString().slice(0,10),volume:i===20?300:100}));
 assert.equal(E.calcRvol(rows),3);
});
test('RSI all-flat is neutral and synthetic set is reproducible',()=>{
 assert.equal(E.rsi(mk(Array(20).fill(100))),50);
 assert.deepEqual(E.syntheticDemo(),E.syntheticDemo());
});

test('European semicolon CSV decimal comma and missing FRED rows',()=>{
 const x=E.normalizeMarket(E.csvRecords('Date;Close\n2024-01-02;100,50\n2024-01-03;99,75'));
 assert.equal(x[0].close,100.5);assert.equal(x[1].close,99.75);
 const y=E.normalizeMarket(E.csvRecords('DATE,NASDAQ100\n2024-01-02,123.4\n2024-01-03,.\n2024-01-04,122.9'));
 assert.equal(y.length,2);
});
