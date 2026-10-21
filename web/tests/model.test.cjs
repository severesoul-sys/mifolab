const test=require('node:test');
const assert=require('node:assert/strict');
const C=require('../core.js');
const catalog=require('../catalog.js');
const config=(id,level=40,iv=15)=>C.defaultConfig(id,level,iv);
const fixed={mode:'raid',seed:'verify',a:{attack:1,defense:1},b:{attack:.65,defense:0}};

test('all playable catalog entries have valid combat stats',()=>{
  const rows=catalog.species.filter(row=>!catalog.excluded.includes(row.id)&&!catalog.retired.includes(row.id));assert.equal(rows.length,138);
  for(const row of rows){const spirit=C.fighter(config(row.id),catalog);assert.ok(spirit.hpMax>=10);assert.equal(spirit.power,C.STATS.reduce((total,stat)=>total+spirit.stats[stat],0)*2);assert.ok(spirit.elements.every(type=>C.TYPES.includes(type)));}
});
test('element wheel, light/dark and dual defenses follow client',()=>{
  for(let index=0;index<5;index++){assert.equal(C.element(C.TYPES[index],C.TYPES[(index+1)%5]),1.5);assert.equal(C.element(C.TYPES[(index+1)%5],C.TYPES[index]),.67);}
  assert.equal(C.element('yav','nav'),1.5);assert.equal(C.element('nav','yav'),1.5);
  const water=C.fighter(config('rosinka'),catalog),rarog=C.fighter(config('rarog'),catalog);assert.ok(Math.abs(C.effect(water,rarog)-1.005)<1e-9);assert.equal(C.effect(rarog,water),.67);assert.equal(C.effect(rarog,water,true),1.5);
});
test('IV level nature manual stats and cheer are applied',()=>{
  const data=config('rarog');data.nature={up:'duh',down:'sila'};
  let fighter=C.fighter(data,catalog);assert.equal(fighter.stats.duh,Math.floor(175*1.1));assert.equal(fighter.stats.sila,Math.floor(195*.9));
  data.level=1;fighter=C.fighter(data,catalog);assert.equal(fighter.stats.duh,Math.floor(175*.1*1.1));
  data.manualStats=Object.fromEntries(C.STATS.map(stat=>[stat,100]));data.health=50;data.cheer=20;fighter=C.fighter(data,catalog,0,true);assert.equal(fighter.hpMax,240);assert.equal(fighter.hp,120);
});
test('invalid parameters and files are rejected before battle',()=>{
  for(const bad of [NaN,Infinity,-1,41]){const data=config('auka');data.level=bad;assert.throws(()=>C.fighter(data,catalog));}
  const data=config('auka');data.iv.duh=16;assert.throws(()=>C.fighter(data,catalog));
  assert.throws(()=>C.importState('{broken',catalog));assert.throws(()=>C.importState(JSON.stringify({app:'other'}),catalog));assert.throws(()=>C.simulate([],[],catalog));
});
test('random rules select only extrema and respect probability',()=>{
  const random=C.rng(417);let maximum=0;
  for(let index=0;index<10000;index++){const value=C.sampleRune(null,random,.7);assert.ok(value===0||value===1);maximum+=value;}
  assert.ok(maximum>6800&&maximum<7200);assert.equal(C.sampleRune(null,C.rng(1),0),0);assert.equal(C.sampleRune(null,C.rng(1),1),1);assert.equal(C.sampleRune(.37,C.rng(1)),.37);
});
test('identical seed makes exact replay and does not mutate teams',()=>{
  const left=[config('indrik')],right=[config('gorynych')],before=JSON.stringify([left,right]);
  const first=C.simulate(left,right,catalog,{seed:'same'}),second=C.simulate(left,right,catalog,{seed:'same'});
  assert.deepEqual(first,second);assert.equal(JSON.stringify([left,right]),before);
});
test('all four real rune traces score nearly perfectly; scribbles fail',()=>{
  for(const [id,rune] of Object.entries(C.RUNES)){assert.ok(C.scoreRune(id,C.resample(rune.points,.01))>.97,id);assert.equal(C.scoreRune(id,[]),0);assert.ok(C.scoreRune(id,[[0,0],[.02,.01],[0,.02]])<.1);}
  assert.ok(C.compressTrace(Array.from({length:1000},(_,index)=>[index/1000,index/1000])).length<=48);
});
test('rune accuracy changes actual damage and shield reaches eighty percent',()=>{
  const attacker=C.fighter(config('indrik'),catalog),defender=C.fighter(config('rarog'),catalog);
  const perfect=C.ultraDamage(attacker,defender,1,0),poor=C.ultraDamage(attacker,defender,0,0),blocked=C.ultraDamage(attacker,defender,1,1);
  assert.ok(perfect>poor*4);assert.ok(blocked<=perfect*.21+1);
});
test('battle energy charges on ninth hit and interactive rune drives combat',()=>{
  const left=config('auka'),right=config('indrik');left.manualStats={zhivitsa:1000,sila:10,stoikost:1000,pryt:300,duh:500};right.manualStats={zhivitsa:1000,sila:10,stoikost:1000,pryt:100,duh:100};
  const battle=new C.Battle([left],[right],catalog,fixed);while(!battle.pending&&!battle.over)battle.step();assert.equal(battle.pending.side,0);assert.equal(battle.member(0).energy,100);assert.equal(battle.events.filter(event=>event.kind==='hit'&&event.side===0).length,9);
  const before=battle.member(1).hp;const event=battle.resolveRune({attack:0,durationMs:1000});assert.equal(event.attack,0);assert.equal(battle.member(1).hp,before-event.damage);assert.equal(battle.member(0).energy,0);
});
test('six on six preserves health and energy between successive enemies',()=>{
  const left=Array.from({length:6},()=>config('indrik')),right=Array.from({length:6},()=>config('anchutka',5,1));
  const result=C.simulate(left,right,catalog,fixed);assert.equal(result.winner,0);assert.equal(result.sides[1].filter(member=>member.hp===0).length,6);
  const hits=result.events.filter(event=>event.kind==='hit'&&event.side===0);assert.ok(hits.length>=6);assert.ok(result.sides[0][0].energy>=72||result.ultras[0]>0);
});
test('manual swap respects cooldown and dead units cannot enter',()=>{
  const battle=new C.Battle([config('rarog'),config('auka')],[config('indrik')],catalog,fixed);assert.equal(battle.swap(0,1),true);assert.equal(battle.swap(0,0),false);battle.time=60001;assert.equal(battle.swap(0,0),true);battle.sides[0][1].hp=0;assert.equal(battle.swap(0,1),false);
});
test('round robin counts mirrored roles and complementary pair scores',()=>{
  const small={...catalog,species:catalog.species.filter(row=>['rarog','indrik','gorynych'].includes(row.id))},generator=C.tournament(small,{trials:4,mode:'fair',seed:'test'});let result;
  while(true){const next=generator.next();if(next.done){result=next.value;break;}}
  assert.equal(result.battles,24);assert.equal(result.rows.length,3);
  for(let index=0;index<3;index++){assert.equal(result.rows[index].matches,16);for(let other=0;other<3;other++)if(index!==other)assert.ok(Math.abs(result.matrix[index][other]+result.matrix[other][index]-1)<1e-9);}
  assert.equal(result.rows.reduce((sum,row)=>sum+row.wins,0),24);
});
test('JSON export roundtrips custom team and rules',()=>{
  const state={left:[config('rarog',21,8)],right:[config('indrik',32,12)],size:1,options:C.settings({mode:'raid',probabilityMax:.82})};assert.deepEqual(C.importState(C.exportState(state),catalog),state);
});
