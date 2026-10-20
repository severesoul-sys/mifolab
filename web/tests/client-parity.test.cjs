const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const C=require('../core.js'),catalog=require('../catalog.js');
const sourcePath=process.env.MIFOLAB_REFERENCE_037||path.resolve(__dirname,'../../.local/reference/client-0.37.js');
function reference(){
 const source=fs.readFileSync(sourcePath,'utf8');
 const slice=(begin,end)=>{const from=source.indexOf(begin),until=source.indexOf(end,from);assert.ok(from>=0&&until>=0);return source.slice(from,until);};
 const battle=slice('battle:{','},release:').slice(7)+'}';
 const types='var '+slice('h={voda:','var b=');
 const scaling=slice('function S(e)','var E=');
 const scoring=slice('function Re(e,t)','function He(');
 const combat=slice('function Et(e)','},Wt=')+'};';
 const context=vm.createContext({});vm.runInContext(`var p={maxSpiritLevel:40,natureUp:.1,natureDown:.1,battle:${battle}},b=['zhivitsa','sila','stoikost','pryt','duh'];var Tt=Object.fromEntries(['voda','ogon','drevo','zemlya','veter','yav','nav'].map(type=>[type,{fast:type,ultra:type}]));function ve(){return ()=>.5;}${types}${scaling}${scoring}${combat}`,context,{timeout:1000});return context;
}
test('100 raid simulations match the original client outcome, time, HP and energy',{skip:!fs.existsSync(sourcePath)},()=>{
 const context=reference(),random=C.rng('client-fixtures'),playable=catalog.species.filter(row=>!catalog.excluded.includes(row.id));
 for(let index=0;index<100;index++){
  const make=()=>{const config=C.defaultConfig(playable[Math.floor(random()*playable.length)].id,1+Math.floor(random()*40),Math.floor(random()*16));config.health=20+Math.floor(random()*81);return config;};
  const left=Array.from({length:1+Math.floor(random()*6)},make),right=Array.from({length:1+Math.floor(random()*6)},make);
  const attack=index%2?1:.3,defense=index%3?.8:0;
  const options={mode:'raid',a:{attack,defense},b:{attack:.65,defense:0}};
  context.data={left,right,attack,defense,catalog:catalog.species};
  const expected=JSON.parse(vm.runInContext(`JSON.stringify((()=>{const make=config=>{const species=data.catalog.find(row=>row.id===config.speciesId);const fighter=Dt(species,config.level,config.iv,config.nature);fighter.hp=Math.max(1,Math.round(fighter.hpMax*config.health/100));return fighter;};let sim=new Ut(data.right.map(make),data.left.map(make),'x');sim.rnd=()=>.5;zt=()=>sim.rune.kind==='attack'?data.attack:data.defense;for(let count=0;count<20000&&!sim.over;count++){if(sim.rune){sim.runeDone(sim.rune.until,[]);continue;}if(sim.pickUntil){sim.swap(sim.t+500,sim.squad.findIndex(member=>member.hp>0));continue;}const next=It(sim.me)?sim.t+100:Math.max(sim.t,sim.myNext);if(sim.aiNext<=next)sim.advance(sim.aiNext);else if(It(sim.me))sim.ultra(next);else sim.tap(next);}return {winner:sim.won?0:1,time:sim.t,hp:[sim.squad.map(member=>member.hp),sim.enemies.map(member=>member.hp)],energy:[sim.squad.map(member=>member.energy),sim.enemies.map(member=>member.energy)]};})())`,context,{timeout:2000}));
  const result=C.simulate(left,right,catalog,options,false);
  assert.deepEqual({winner:result.winner,time:result.time,hp:result.sides.map(team=>team.map(member=>member.hp)),energy:result.sides.map(team=>team.map(member=>member.energy))},expected,'fixture '+index);
 }
});
test('trace compression and rune grading match the actual client',{skip:!fs.existsSync(sourcePath)},()=>{
 const context=reference(),random=C.rng('traces');
 for(const id of Object.keys(C.RUNES))for(let attempt=0;attempt<25;attempt++){
  const trace=C.resample(C.RUNES[id].points,.008).map(point=>point.map(value=>value+(random()-.5)*attempt*.02));context.trace=trace;context.runeId=id;
  const expected=vm.runInContext('zt(runeId,Ht(trace).map(point=>point.map(value=>value/100)))',context,{timeout:1000});
  assert.ok(Math.abs(C.scoreRune(id,trace)-expected)<1e-12,id+' '+attempt);
 }
});
