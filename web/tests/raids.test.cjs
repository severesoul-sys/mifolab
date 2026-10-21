const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../core.js'),D=require('../raid-data.js'),R=require('../raid-core.js'),O=require('../collection-core.js');
const sourcePath=process.env.MIFOLAB_REFERENCE_042||path.resolve(__dirname,'../../.local/reference/client-0.42.js');
const finish=iterator=>{let step;do{step=iterator.next();}while(!step.done);return step.value;};
function reference(){
  const source=fs.readFileSync(sourcePath,'utf8'),slice=(start,end)=>{const a=source.indexOf(start),b=source.indexOf(end,a);assert.ok(a>=0&&b>a);return source.slice(a,b);};
  const context=vm.createContext({random:C.rng});
  vm.runInContext(slice('var p={','function S(').split(',m={')[0]+';'+slice('var De=[',',Fe={')+';var b=["zhivitsa","sila","stoikost","pryt","duh"];var '+slice('h={voda:','var b=')+slice('function S(','var E=')+'function He(){return 0;}function ye(seed){return random(seed);}'+slice('var wt=[',',Gt=e=>')+';',context,{timeout:1000});
  return context;
}
test('current client and guide define 12 bosses, three tiers and unchanged combat stats',()=>{
  assert.equal(D.bosses.length,12);assert.equal(D.rules.maxPlayers,6);assert.equal(D.rules.fightSec,180);assert.equal(D.rules.attackK,2.5);
  assert.deepEqual(D.rules.tiers.map(row=>[row.level,row.hp]),[[20,2000],[25,4000],[30,7500]]);
  const old=require('../catalog.js');for(const row of D.catalog.species){assert.deepEqual(row.base,old.species.find(x=>x.id===row.id).base);}
  for(const row of D.bosses){const boss=R.boss(row.id);assert.equal(boss.hp,row.hp);assert.equal(boss.level,row.level);assert.ok(C.STATS.every(stat=>boss.iv[stat]===15));}
});
test('120 boss fights match current original client damage, HP, energy and exact timings',{skip:!fs.existsSync(sourcePath)},()=>{
  const ctx=reference(),random=C.rng('boss-parity'),legacyIds=JSON.parse(vm.runInContext('JSON.stringify(Me.map(s=>s.id))',ctx)),species=D.catalog.species.filter(row=>!D.retired.includes(row.id)&&legacyIds.includes(row.id));
  for(let index=0;index<120;index++){
    const team=Array.from({length:1+index%6},()=>{const config=C.defaultConfig(species[Math.floor(random()*species.length)].id,1+Math.floor(random()*40),Math.floor(random()*16));config.health=10+Math.floor(random()*91);return config;});
    const bossId=D.bosses[index%12].id,options=R.settings({seed:'parity-'+index,attack:[0,.5,.8,1][index%4],defense:[0,.8,1][index%3],attackRuneMs:index%2?3000:900,defenseRuneMs:index%3?2500:500,swapMs:[0,500,10000][index%3],durationMs:index%5?178000:10000});
    ctx.data={team,definition:D.bosses[index%12],options};
    const expected=JSON.parse(vm.runInContext(`JSON.stringify((()=>{
      const make=c=>{const f=Ot(z(c.speciesId),c.level,c.iv,c.nature);f.hp=Math.max(1,Math.round(f.hpMax*c.health/100));return f;};
      const d=data.definition,enemy=Ot(z(d.id),d.level,{zhivitsa:15,sila:15,stoikost:15,pryt:15,duh:15},null);enemy.hp=enemy.hpMax=d.hp;enemy.power=p.boss.attackK;
      const sim=new Wt([enemy],data.team.map(make),'x'),o=data.options;sim.rnd=random(o.seed);Bt=()=>sim.rune.kind==='attack'?o.attack:o.defense;
      let limit=false;for(let count=0;count<20000&&!sim.over;count++){
        if(sim.rune){const until=sim.rune.start+(sim.rune.kind==='attack'?o.attackRuneMs:o.defenseRuneMs);if(until>o.durationMs){limit=true;break;}sim.runeDone(until,[]);continue;}
        if(sim.pickUntil){const until=sim.t+o.swapMs;if(until>o.durationMs){limit=true;break;}sim.swap(until,sim.squad.findIndex(f=>f.hp>0));continue;}
        const next=Lt(sim.me)?sim.t+100:Math.max(sim.t,sim.myNext),at=Math.min(next,sim.aiNext);if(at>o.durationMs){limit=true;break;}
        if(sim.aiNext<=next)sim.advance(sim.aiNext);else if(Lt(sim.me))sim.ultra(next);else sim.tap(next);
      }
      return {time:limit?o.durationMs:sim.t,damage:d.hp-sim.enemy.hp,hp:sim.squad.map(f=>f.hp),energy:sim.squad.map(f=>f.energy),bossEnergy:sim.enemy.energy};
    })())`,ctx,{timeout:2000}));
    const result=R.solo(team,bossId,options);
    assert.deepEqual({time:result.time,damage:result.damage,hp:result.fighters.map(f=>f.hp),energy:result.fighters.map(f=>f.energy),bossEnergy:result.boss.energy},expected,'boss '+bossId+' fixture '+index);
  }
});
test('shared HP merges independent player damage in time, caps credit and stops at victory',()=>{
  const team=Array.from({length:6},()=>C.defaultConfig('indrik',35,15)),options={seed:'party',attack:.8,defense:.8};
  const one=R.group([team],'rarog',options),three=R.group([team,team,team],'rarog',options);
  assert.ok(three.won);assert.equal(three.hp,0);assert.equal(three.players.reduce((sum,row)=>sum+row.damage,0),7500);
  assert.ok(!one.won||three.time<=one.time);assert.ok(three.players.every(row=>row.events.every(event=>event.time<=three.time)));
  assert.ok(three.timeline.every((row,index,all)=>!index||row.hp<=all[index-1].hp));assert.equal(three.timeline.at(-1).hp,0);
});
test('rune at deadline cannot deal damage after expiry and death prevents further attacks',()=>{
  const options={durationMs:5000,attackRuneMs:3000,attack:1,defense:1};const result=R.solo([C.defaultConfig('indrik')],'volkodlak',options,true);
  assert.ok(result.hits.every(hit=>hit.time<=5000));assert.equal(result.time,5000);assert.ok(!result.events.some(e=>e.kind==='ultra'));
  const dead=C.defaultConfig('indrik');dead.health=0;const stopped=R.solo([dead],'volkodlak');assert.equal(stopped.damage,0);assert.equal(stopped.time,0);assert.equal(stopped.reason,'fainted');
});
test('counts agree with series and are monotonic for cumulative players',()=>{
  const team=Array.from({length:6},()=>C.defaultConfig('rosinka',25,8)),teams=Array.from({length:6},()=>team),options={seed:'counts'};
  const counts=finish(R.playerCounts(teams,'rarog',options,12));for(const row of counts.rows){const series=finish(R.series(teams.slice(0,row.players),'rarog',options,12));assert.equal(series.wins,row.wins);}
  assert.ok(counts.rows.every((row,i,rows)=>i===0||row.wins>=rows[i-1].wins));
});
test('personal boss recommendation keeps exact stats and chooses unique available instances',()=>{
  const collection=O.parse(fs.readFileSync(path.join(__dirname,'fixtures/android-collection.json'),'utf8'),D.catalog);
  const configs=collection.spirits.filter(row=>!row.guarding&&row.hp>0).map(row=>O.toConfig(row,false));
  const plan=finish(R.recommend(configs,'finist',{seed:'recommend'}));assert.equal(plan.team.length,6);assert.equal(new Set(plan.team.map(c=>c.instanceId)).size,6);
  assert.ok(!plan.team.some(c=>['test-spirit-1','test-spirit-9'].includes(c.instanceId)));
  for(const config of plan.team){assert.deepEqual(config,configs.find(c=>c.instanceId===config.instanceId));}
  const short=finish(R.recommend(configs.slice(0,2),'finist'));assert.equal(short.complete,false);assert.equal(short.team.length,2);
});
test('raid inputs are validated and calculations do not mutate teams',()=>{
  const config=C.defaultConfig('rarog');config.instanceId='unique';const team=[config],before=JSON.stringify(team);R.group([team],'rarog');assert.equal(JSON.stringify(team),before);
  assert.throws(()=>R.group([], 'rarog'));assert.throws(()=>R.solo([config,config],'rarog'));assert.throws(()=>R.boss('gorynych'));assert.throws(()=>R.settings({durationMs:NaN}));assert.throws(()=>R.settings({swapMs:-1}));
});
