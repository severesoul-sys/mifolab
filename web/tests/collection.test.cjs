const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('../core.js'),O=require('../collection-core.js'),catalog=require('../catalog.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/android-collection.json'),'utf8'));
const read=()=>O.parse(JSON.stringify(fixture),catalog);
const finish=generator=>{let result;do{result=generator.next();}while(!result.done);return result.value;};

test('saved collection upgrades without losing instances or requiring another fetch',()=>{
  const saved=read();assert.equal(saved.format,'mifolab-collection');assert.equal(saved.updatedAt,fixture.exportedAt);
  assert.deepEqual(saved.spirits.map(row=>[row.id,row.level,row.iv,row.stats,row.health]),fixture.spirits.map(row=>[row.id,row.level,row.iv,row.stats,row.health]));
  assert.ok(!('producer' in saved));assert.ok(!('observerVersion' in saved));assert.deepEqual(O.parse(JSON.stringify(saved),catalog),saved);
});

test('actual Android export imports each instance with exact stats IV nature HP and flags',()=>{
  const collection=read();assert.equal(collection.spirits.length,9);assert.equal(collection.total,10);assert.equal(collection.unavailable.length,1);
  for(const row of collection.spirits){const raw=fixture.spirits.find(item=>item.id===row.id),config=O.toConfig(row,false),fighter=C.fighter(config,catalog);
    assert.deepEqual(fighter.stats,raw.stats);assert.deepEqual(fighter.iv,raw.iv);assert.deepEqual(fighter.elements,raw.elements);assert.deepEqual(config.nature,raw.nature);
    assert.equal(fighter.hp,raw.hp);assert.equal(fighter.hpMax,raw.hpMax);assert.equal(fighter.level,raw.level);assert.equal(fighter.id,raw.id);assert.equal(fighter.name,raw.name);
    assert.equal(C.fighter(O.toConfig(row,true),catalog).hp,raw.hpMax);
    const recalculated=C.fighter({...config,manualStats:null},catalog);assert.deepEqual(recalculated.stats,raw.stats);
  }
  assert.equal(collection.spirits[1].health,50);assert.equal(collection.spirits[8].hp,0);assert.equal(collection.spirits[0].guarding,true);assert.equal(collection.spirits[2].shiny,true);assert.equal(collection.spirits[3].buddy,true);
  assert.equal(collection.spirits[1].speciesId,collection.spirits[8].speciesId);assert.notEqual(collection.spirits[1].id,collection.spirits[8].id);
});
test('import rejects corruption and duplicate instance IDs without inventing stats',()=>{
  const bad=change=>{const copy=structuredClone(fixture);change(copy);assert.throws(()=>O.parse(copy,catalog));};
  bad(data=>data.version=2);bad(data=>data.total++);bad(data=>data.spirits[1].id=data.spirits[0].id);
  bad(data=>delete data.spirits[0].iv.duh);bad(data=>data.spirits[0].hpMax++);bad(data=>data.spirits[0].health=101);
  bad(data=>data.spirits[0].elements=['unknown']);bad(data=>data.spirits[0].stats.sila=-1);bad(data=>data.spirits[0].level=41);
  bad(data=>data.spirits[0].nature={up:'duh',down:'duh'});bad(data=>data.spirits[0].favorite='false');bad(data=>data.exportedAt=NaN);
  assert.throws(()=>O.parse('{',catalog));assert.throws(()=>O.parse(C.exportState({}),catalog));
});
test('unknown species are disclosed and collection can be saved and loaded again',()=>{
  const data=structuredClone(fixture);data.spirits[0].speciesId='new-species';data.gameVersion='future';
  const collection=O.parse(data,catalog);assert.equal(collection.spirits.length,8);assert.equal(collection.unavailable.length,2);assert.ok(collection.warnings.length>=2);
  const restored=O.parse(JSON.stringify(collection),catalog);assert.deepEqual(restored,collection);
  const empty={...fixture,total:0,spirits:[],unavailable:[]};assert.equal(O.parse(empty,catalog).spirits.length,0);
});
test('personal round robin counts both sides, preserves duplicate species and is deterministic',()=>{
  const collection=read(),result=finish(O.tournament(collection,catalog,{trials:2,seed:'owned-test'})),again=finish(O.tournament(collection,catalog,{trials:2,seed:'owned-test'}));
  assert.equal(result.battles,144);assert.equal(result.rows.length,9);assert.equal(new Set(result.order).size,9);assert.deepEqual(result.matrix,again.matrix);
  assert.equal(result.rows.reduce((sum,row)=>sum+row.wins,0)+result.rows.reduce((sum,row)=>sum+row.draws,0)/2,result.battles);
  for(const row of result.rows){assert.equal(row.matches,32);assert.equal(row.wins+row.losses+row.draws,row.matches);assert.ok(Number.isFinite(row.score));}
  for(let i=0;i<9;i++)for(let j=0;j<9;j++)assert.equal(result.matrix[i][j]+result.matrix[j][i],1);
  assert.deepEqual(collection,read());
});
test('team selection returns six distinct available instances and handles insufficient candidates',()=>{
  const collection=read(),ranking=finish(O.tournament(collection,catalog,{trials:1,healed:false}));
  const plan=O.recommendTeam(collection,ranking);assert.equal(plan.ids.length,6);assert.equal(new Set(plan.ids).size,6);assert.equal(plan.complete,true);
  assert.ok(!plan.ids.includes('test-spirit-1'));assert.ok(!plan.ids.includes('test-spirit-9'));
  const short={...collection,spirits:collection.spirits.slice(0,3)},shortRank=finish(O.tournament(short,catalog,{trials:1}));
  const partial=O.recommendTeam(short,shortRank);assert.equal(partial.ids.length,2);assert.equal(partial.complete,false);
  assert.throws(()=>O.recommendTeam(short,ranking));
});
test('caught configurations roundtrip into arena, edit independently and cannot duplicate one instance in a team',()=>{
  const collection=read(),left=collection.spirits.slice(0,6).map(row=>O.toConfig(row)),right=collection.spirits.slice(3,9).map(row=>O.toConfig(row));
  const state={left,right,size:6,options:C.settings()},restored=C.importState(C.exportState(state),catalog);
  assert.deepEqual(restored,state);assert.ok([0,1,null].includes(C.simulate(left,right,catalog).winner));
  assert.throws(()=>C.simulate([left[0],left[0]],right,catalog),/экземпляр/);
  left[0].iv.duh=15;left[0].manualStats.sila=1;assert.notEqual(collection.spirits[0].stats.sila,1);
  const config=O.toConfig(collection.spirits[0]);config.level=1;config.manualStats=null;assert.ok(C.fighter(config,catalog).power<power(collection.spirits[0]));
  function power(row){return C.STATS.reduce((sum,key)=>sum+row.stats[key],0)*2;}
});
