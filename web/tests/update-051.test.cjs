const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../core.js'),D=require('../catalog.js'),R=require('../raid-core.js'),S=require('../squads.js'),O=require('../collection-core.js');
const finish=it=>{let n;do{n=it.next();}while(!n.done);return n.value;};
test('friendship scenario affects only outgoing raid damage and keeps zero-bonus compatibility',()=>{
  const team=[C.defaultConfig('kolobok',12,10)],opts={seed:'bonus',attack:.8,defense:.8,durationMs:5000};
  const base=R.solo(team,'rarog',opts,true),boost=R.solo(team,'rarog',{...opts,friendBonus:.15},true);
  assert.equal(boost.damage,base.damage*1.15);assert.deepEqual(boost.fighters,base.fighters);
  assert.deepEqual(boost.events.filter(e=>e.side===1).map(e=>e.amount),base.events.filter(e=>e.side===1).map(e=>e.amount));
  assert.ok(Math.abs(boost.baseDamage+boost.friendDamage-boost.damage)<1e-8);
  assert.deepEqual(base,R.solo(team,'rarog',{...opts,friendBonus:0},true));
  for(const friendBonus of [-.01,.151,NaN,Infinity,'15'])assert.throws(()=>R.settings({friendBonus}));
});
test('solo group has no friendship, shared victory caps bonus credit and counts use matching scenarios',()=>{
  const team=Array.from({length:6},()=>C.defaultConfig('indrik',30,15)),options={seed:'friend-group',attack:1,defense:1,friendBonus:.15};
  assert.equal(R.group([team],'rarog',options).options.friendBonus,0);
  const group=R.group([team,team],'rarog',options);
  assert.ok(group.won);assert.equal(group.hp,0);assert.equal(group.damage,group.hpMax);
  assert.ok(Math.abs(group.players.reduce((n,p)=>n+p.baseDamage+p.friendDamage,0)-group.damage)<1e-8);
  const teams=Array.from({length:6},()=>team),counts=finish(R.playerCounts(teams,'rarog',options,5));
  for(let n=1;n<=6;n++){const series=finish(R.series(teams.slice(0,n),'rarog',options,5));assert.equal(counts.rows[n-1].wins,series.wins);assert.ok(Math.abs(counts.rows[n-1].averageDamage-series.averageDamage)<1e-8);}
});
test('named squads preserve slot gaps, caught copies, manual stats and offline storage',()=>{
  const a=C.defaultConfig('rarog',25,12),b=C.defaultConfig('rarog',26,10);a.instanceId='one';b.instanceId='two';a.manualStats={zhivitsa:155,sila:200,stoikost:170,pryt:190,duh:140};
  const original=JSON.stringify([a,null,b]),entries=S.put([],'  Рейд  ',[a,null,b],D,'test');
  let saved;S.write({setItem:(key,value)=>{assert.equal(key,S.key);saved=value;}},entries);
  const read=S.parse(saved,D);assert.equal(read[0].name,'Рейд');assert.equal(read[0].slots[1],null);assert.deepEqual(read[0].slots[0].manualStats,a.manualStats);assert.equal(JSON.stringify([a,null,b]),original);
  read[0].slots[0].level=40;assert.equal(a.level,25);
  assert.throws(()=>S.put(entries,'','',D));assert.throws(()=>S.slots([a,a],D));
  assert.doesNotThrow(()=>S.slots([C.defaultConfig('rarog'),C.defaultConfig('rarog')],D));
  assert.throws(()=>S.parse('{bad',D));assert.throws(()=>S.write({setItem(){throw Error('quota');}},entries));
  const full=Array.from({length:30},(_,i)=>({...entries[0],id:String(i)}));assert.throws(()=>S.put(full,'new',[a],D));assert.equal(S.put(full,'updated',[b],D,'1').length,30);
});
test('yard capacity is optional in old snapshots and never replaces actual population',()=>{
  const fixture=require('./fixtures/android-collection.json'),old=O.parse(fixture,D);assert.equal(old.yard,null);
  const value={...fixture,yard:{used:999,capacity:500,maximum:2000}},parsed=O.parse(value,D);
  assert.deepEqual(parsed.yard,{used:fixture.total,capacity:500,maximum:500});
  assert.deepEqual(O.parse(JSON.stringify(parsed),D).yard,parsed.yard);
  assert.equal(O.parse({...fixture,yard:{capacity:2000}},D).yard,null);
});
