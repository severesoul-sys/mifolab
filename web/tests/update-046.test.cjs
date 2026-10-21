const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../core.js'),D=require('../raid-data.js'),R=require('../raid-core.js'),catalog=require('../catalog.js'),chronicle=require('../chronicle-data.js'),S=require('../spirit-search.js'),U=require('../upgrade-core.js'),O=require('../collection-core.js');
const reference=require('../../tools/reference-046.cjs'),hasReference=!!process.env.MIFOLAB_REFERENCE_046;

test('an interrupted worker startup returns a recoverable error instead of escaping uncaught',()=>{
 for(const name of ['rank-worker.js','raid-worker.js','collection-worker.js']){
  const messages=[],context=vm.createContext({self:{postMessage:message=>messages.push(message)},importScripts(){throw Error('private source path');}});
  vm.runInContext(fs.readFileSync(path.join(__dirname,'..',name),'utf8'),context);assert.equal(messages.length,0);
  context.self.onmessage({data:{}});assert.equal(messages.length,1);assert.ok(messages[0].error.includes('Повторите расчёт'));assert.ok(!messages[0].error.includes('private'));
 }
});

test('138 current spirits are searchable and usable in arena, raids and upgrades',()=>{
 assert.equal(catalog.version,'0.46');assert.deepEqual(catalog,D.catalog);assert.equal(chronicle.entries.length,138);
 assert.equal(new Set(catalog.species.map(s=>s.id)).size,148);assert.equal(catalog.retired.length,10);
 for(const row of chronicle.entries){
  const species=catalog.species.find(s=>s.id===row.speciesId);assert.ok(species);assert.ok(!catalog.retired.includes(species.id));
  assert.ok(S.matches(String(row.number),species.id,species.name));assert.ok(S.matches(species.name,species.id,species.name));
  const config=C.defaultConfig(species.id,20,8),member=C.fighter(config,catalog);assert.ok(member.power>0);
  assert.ok(R.solo([config],'rarog').damage>0);assert.ok(U.plan(config,catalog,40).powerGain>0);
 }
 assert.equal(S.label('chudo_yudo'),'№091');assert.equal(S.label('myandash'),'№138');
 const context={};vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../rankings.js'),'utf8'),context);
 const rank=context.MifoRankings;assert.equal(rank.speciesCount,138);assert.equal(rank.battles,604992);assert.equal(rank.sourceHash,catalog.sha256);
 assert.deepEqual([...rank.rows.map(s=>s.id)].sort(),chronicle.entries.map(s=>s.speciesId).sort());
});
test('new caught copies preserve exact stats, sparks and offline cache; old copies remain supported',()=>{
 const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/android-collection.json'),'utf8'));
 const input=structuredClone(fixture);input.gameVersion='0.46';input.spirits=input.spirits.slice(0,2);input.total=2;input.unavailable=[];
 const species=catalog.species.find(s=>s.id==='myandash');
 for(const [index,row]of input.spirits.entries()){
  row.speciesId=species.id;row.speciesName=species.name;row.name='Мяндаш '+(index+1);row.baseStats=species.base;row.rarity=species.rarity;row.elements=species.elements;row.guarding=false;row.buddy=false;
  const member=C.fighter({...C.defaultConfig(species.id,row.level),iv:row.iv,nature:row.nature},catalog);row.stats=member.stats;row.hp=row.hpMax=member.hpMax;row.health=100;
 }
 input.resources={playerXp:100000,dust:50000,sparks:{myandash:12}};
 const data=O.parse(input,catalog);assert.equal(data.spirits.length,2);assert.notEqual(data.spirits[0].id,data.spirits[1].id);assert.equal(data.resources.sparks.myandash,12);
 assert.deepEqual(O.parse(JSON.stringify(data),catalog),data);assert.equal(data.warnings.length,0);
 assert.equal(O.parse(fixture,catalog).spirits.length,9);assert.ok(O.parse(fixture,catalog).warnings.every(text=>!text.includes('другой версии')));
 assert.ok(C.fighter(C.defaultConfig('mora'),catalog).power>0,'archived caught species still calculable');
});
test('raid potions affect only the specified stats and preserve input teams',()=>{
 const team=[C.defaultConfig('chudo_yudo',30,7)],before=JSON.stringify(team);
 const plain=R.solo(team,'rarog',{seed:'potions',attack:0,defense:0},true),buff=R.solo(team,'rarog',{seed:'potions',attack:0,defense:0,silaPotion:true},true);
 assert.equal(buff.fighters[0].stats.sila,Math.round(plain.fighters[0].stats.sila*1.1));
 for(const stat of C.STATS.filter(s=>s!=='sila'))assert.equal(buff.fighters[0].stats[stat],plain.fighters[0].stats[stat]);
 assert.equal(R.damage(buff.fighters[0],buff.boss,true),R.damage(plain.fighters[0],plain.boss,true));assert.equal(JSON.stringify(team),before);
 assert.equal(R.settings().revives,0);assert.equal(R.settings().silaPotion,false);
 for(const value of [-1,3,1.5,NaN])assert.throws(()=>R.settings({revives:value}));assert.throws(()=>R.settings({silaPotion:'yes'}));
});
test('living water restores half HP, retains energy, respects two uses, time and group victory',()=>{
 const team=[C.defaultConfig('rosinka',1,0)],options={seed:'revivals',attack:0,defense:0,revives:2};
 const run=R.solo(team,'rarog',options,true);assert.equal(run.revivesUsed,2);assert.equal(run.reason,'fainted');
 const revivals=run.events.filter(e=>e.kind==='revive');assert.equal(revivals.length,2);
 for(const event of revivals){assert.equal(event.hp[0],Math.max(1,Math.round(run.fighters[0].hpMax*.5)));const preceding=run.events[run.events.indexOf(event)-1];assert.deepEqual(event.energy,preceding.energy);}
 assert.equal(R.solo(team,'rarog',{...options,swapMs:10000}).revivesUsed,0,'pick window ends before revive');
 const limited=R.solo(team,'rarog',{...options,durationMs:5000,swapMs:9000});assert.equal(limited.revivesUsed,0);
 const strong=Array.from({length:6},()=>C.defaultConfig('indrik'));
 const result=R.group([strong,strong,strong,strong,strong,strong],'volkodlak',{revives:2,silaPotion:true,attack:1,defense:1});assert.ok(result.won);assert.ok(result.players.every(p=>p.revivesUsed===0));
 assert.equal(result.players.reduce((sum,p)=>sum+p.damage,0),result.hpMax);
});
test('current catalogue, numbers, costs, bosses and runes match original 0.46',{skip:!hasReference},()=>{
 const ref=reference.load(),upgrade=require('../upgrade-data.js');assert.deepEqual(catalog.species,ref.species);assert.deepEqual(catalog.retired,ref.retired);assert.deepEqual(chronicle.entries,ref.chronicle);
 assert.deepEqual(D.rules,ref.rules.boss);assert.deepEqual(D.battle,ref.rules.battle);assert.deepEqual(D.brew,ref.rules.brew);assert.deepEqual(C.RUNES,ref.runes);
 assert.deepEqual(upgrade.dust,ref.rules.powerUp.dust);assert.deepEqual(upgrade.sparks,ref.rules.powerUp.sparks);assert.deepEqual(upgrade.playerXp,ref.rules.player.levels);
});
test('276 current client raid simulations match, including new spirits, strength potion and revivals',{skip:!hasReference},()=>{
 const ctx=reference.load().context(),random=C.rng('046-parity');let revived=0;
 const active=catalog.species.filter(s=>!catalog.retired.includes(s.id));
 for(let index=0;index<276;index++){
  const team=Array.from({length:1+index%6},(_,slot)=>{const config=C.defaultConfig(active[(index+slot)%active.length].id,1+Math.floor(random()*40),Math.floor(random()*16));config.health=15+Math.floor(random()*86);if(slot%2)config.nature={up:'sila',down:'stoikost'};return config;});
  const bossId=D.bosses[index%12].id,options=R.settings({seed:'046-'+index,attack:[0,.5,.8,1][index%4],defense:[0,.8,1][index%3],attackRuneMs:index%2?3000:900,defenseRuneMs:index%3?2500:500,swapMs:[0,500,9000,10000][index%4],durationMs:index%5?178000:10000,silaPotion:index%2===1,revives:index%3});
  ctx.data={team,definition:D.bosses[index%12],options};
  const expected=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
   const make=c=>{let f=fn(z(c.speciesId),c.level,c.iv,c.nature);f.hp=Math.max(1,Math.round(f.hpMax*c.health/100));return data.options.silaPotion?Yn(f):f;};
   const d=data.definition,enemy=fn(z(d.id),d.level,{zhivitsa:15,sila:15,stoikost:15,pryt:15,duh:15},null);enemy.hp=enemy.hpMax=d.hp;enemy.power=p.boss.attackK;
   const o=data.options,sim=new On([enemy],data.team.map(make),'x',o.revives);sim.rnd=be(o.seed);wn=()=>sim.rune.kind==='attack'?o.attack:o.defense;
   let limit=false;for(let count=0;count<20000&&!sim.over;count++){
    if(sim.rune){const until=sim.rune.start+(sim.rune.kind==='attack'?o.attackRuneMs:o.defenseRuneMs);if(until>o.durationMs){limit=true;break;}sim.runeDone(until,[]);continue;}
    if(sim.pickUntil){const until=sim.t+o.swapMs;if(until>o.durationMs){limit=true;break;}const alive=sim.squad.findIndex(f=>f.hp>0);if(alive<0)sim.revive(until,0);else sim.swap(until,alive);continue;}
    const next=xn(sim.me)?sim.t+100:Math.max(sim.t,sim.myNext),at=Math.min(next,sim.aiNext);if(at>o.durationMs){limit=true;break;}
    if(sim.aiNext<=next)sim.advance(sim.aiNext);else if(xn(sim.me))sim.ultra(next);else sim.tap(next);
   }
   return {time:limit?o.durationMs:sim.t,damage:d.hp-sim.enemy.hp,hp:sim.squad.map(f=>f.hp),energy:sim.squad.map(f=>f.energy),bossEnergy:sim.enemy.energy,used:sim.used,stats:sim.squad.map(f=>f.stats)};
  })())`,ctx,{timeout:2000}));
  const actual=R.solo(team,bossId,options);revived+=actual.revivesUsed;
  assert.deepEqual({time:actual.time,damage:actual.damage,hp:actual.fighters.map(f=>f.hp),energy:actual.fighters.map(f=>f.energy),bossEnergy:actual.boss.energy,used:actual.revivesUsed,stats:actual.fighters.map(f=>f.stats)},expected,'current fixture '+index);
 }
 assert.ok(revived>40,'exercise revivals, not only easy wins');
});
test('current client still grades all four rune traces identically',{skip:!hasReference},()=>{
 const context=reference.load().context(),random=C.rng('046-runes');
 for(const id of Object.keys(C.RUNES))for(let n=0;n<25;n++){
  const trace=C.resample(C.RUNES[id].points,.008).map(p=>p.map(v=>v+(random()-.5)*n*.02));context.trace=trace;context.runeId=id;
  const expected=vm.runInContext('wn(runeId,Dn(trace).map(p=>p.map(v=>v/100)))',context);assert.ok(Math.abs(C.scoreRune(id,trace)-expected)<1e-12);
 }
});
