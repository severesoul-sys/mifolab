'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const catalog=require('../catalog.js'),chronicle=require('../chronicle-data.js'),S=require('../spirit-search.js');
const C=require('../core.js'),O=require('../collection-core.js'),U=require('../upgrade-core.js'),R=require('../raid-core.js'),D=require('../raid-data.js');
const reference=require('../../tools/update-catalog-067.cjs');

// The two species arrived in 0.62; the catalogue was checked again against 0.67.
const additions=[
  {id:'mizgir',name:'Мизгирь',rarity:'rare',elements:['nav'],base:{zhivitsa:140,sila:125,stoikost:130,pryt:165,duh:215}},
  {id:'mara',name:'Мара',rarity:'rare',elements:['nav'],base:{zhivitsa:150,sila:135,stoikost:140,pryt:175,duh:235}}
];

test('Mizgir and Mara have the reviewed combat stats in both arena and raid catalogues',()=>{
  for(const expected of additions){
    assert.deepEqual(catalog.species.find(row=>row.id===expected.id),expected);
    assert.deepEqual(D.catalog.species.find(row=>row.id===expected.id),expected);
    const fighter=C.fighter(C.defaultConfig(expected.id,40,15),catalog);
    for(const stat of C.STATS)assert.equal(fighter.stats[stat],expected.base[stat]+15);
    assert.equal(fighter.hpMax,(expected.base.zhivitsa+15)*4);
  }
  assert.deepEqual(D.catalog,catalog);
  assert.deepEqual(D.retired,catalog.retired);
  assert.equal(catalog.species.length,150);
  assert.equal(new Set(catalog.species.map(row=>row.id)).size,150);
  assert.equal(chronicle.entries.length,141);
  assert.equal(catalog.retired.length,9);
});

test('current chronicle numbers find the new spirits and the restored Medunitsa',()=>{
  for(const [id,name,number] of [['medunitsa','Медуница',80],['myandash','Мяндаш',139],['mizgir','Мизгирь',140],['mara','Мара',141]]){
    assert.equal(S.number(id),number);
    assert.equal(S.label(id),'№'+String(number).padStart(3,'0'));
    for(const query of [name,name.slice(0,3),String(number),'№'+number,'№'+number+' '+name])assert.ok(S.matches(query,id,name),query);
    assert.ok(!S.matches(String(number+1),id,name));
    assert.ok(!catalog.retired.includes(id));
  }
  assert.ok(!S.matches('Мара','mora','Мора'),'Mara must not be confused with the archived Mora');
  assert.ok(!S.matches('mizgir','mizgir','Мизгирь'),'internal identifiers stay hidden from search');
  assert.deepEqual(chronicle.entries.map(row=>row.number),Array.from({length:141},(_,i)=>i+1));
  assert.deepEqual(chronicle.entries.map(row=>row.speciesId),catalog.species.filter(row=>!catalog.retired.includes(row.id)).map(row=>row.id));
});

function caughtCollection(){
  return {format:'mifolab-collection',version:1,updatedAt:1794744000000,gameVersion:'0.67',total:2,unavailable:[],
    resources:{playerXp:100000000,dust:1000000,sparks:{mizgir:1000,mara:1000}},
    spirits:additions.map((species,index)=>{
      const config=C.defaultConfig(species.id,20+index,7+index);
      config.nature={up:'duh',down:'sila'};
      const fighter=C.fighter(config,catalog);
      return {id:'new-species-caught-'+index,speciesId:species.id,speciesName:species.name,name:species.name+' из подворья',
        rarity:species.rarity,elements:species.elements,baseStats:species.base,level:config.level,iv:config.iv,nature:config.nature,
        stats:fighter.stats,hpMax:fighter.hpMax,hp:fighter.hpMax,health:100,shiny:index===1,favorite:false,guarding:false,buddy:false};
    })};
}

test('new caught spirits keep their exact characteristics offline and can fight and be strengthened',()=>{
  const input=caughtCollection(),snapshot=JSON.stringify(input),collection=O.parse(input,catalog);
  assert.equal(collection.unavailable.length,0);
  assert.equal(collection.warnings.length,0);
  assert.deepEqual(O.parse(JSON.stringify(collection),catalog),collection);
  const configs=collection.spirits.map(row=>O.toConfig(row));
  for(const [index,row] of collection.spirits.entries()){
    const fighter=C.fighter(configs[index],catalog);
    assert.deepEqual(fighter.stats,input.spirits[index].stats);
    assert.deepEqual(fighter.iv,input.spirits[index].iv);
    assert.deepEqual(fighter.elements,['nav']);
    assert.equal(row.shiny,input.spirits[index].shiny);
    assert.equal(collection.resources.sparks[row.speciesId],1000);
    const strengthened=U.plan(configs[index],catalog,40,{playerLevel:50,dust:1000000,sparks:1000});
    assert.equal(strengthened.canReach,true);
    assert.ok(strengthened.powerGain>0);
    assert.equal(strengthened.config.instanceId,row.id);
    assert.deepEqual(strengthened.after.iv,row.iv);
    assert.ok(R.solo([configs[index]],'rarog',{seed:'new-catalog'}).damage>0);
    assert.ok(S.matches(String(140+index),row.speciesId,row.name,row.speciesName));
  }
  assert.ok([0,1,null].includes(C.simulate([configs[0]],[configs[1]],catalog,{seed:'new-catalog'}).winner));
  let result;const tournament=O.tournament(collection,catalog,{trials:1,seed:'new-catalog'});
  do{result=tournament.next();}while(!result.done);
  assert.equal(result.value.rows.length,2);
  assert.equal(result.value.battles,2);
  assert.equal(JSON.stringify(input),snapshot);
});

test('complete catalogue and numbering match the reviewed current client',{skip:!process.env.MIFOLAB_REFERENCE_067},()=>{
  const data=reference.load(process.env.MIFOLAB_REFERENCE_067);
  assert.equal(catalog.sha256,reference.SHA);
  assert.equal(catalog.version,'0.67');
  assert.deepEqual(catalog.species,data.species);
  assert.deepEqual(catalog.retired,data.retired);
  assert.deepEqual(chronicle.entries,data.entries);
});
