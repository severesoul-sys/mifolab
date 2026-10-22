const test=require('node:test'),assert=require('node:assert/strict');
const C=require('../core.js'),D=require('../raid-data.js'),R=require('../raid-core.js'),O=require('../collection-core.js'),U=require('../upgrade-core.js');
const fixture=require('./fixtures/android-collection.json');
function finish(iterator){let step;do{step=iterator.next();}while(!step.done);return step.value;}
function owned(resources){const collection=O.parse(fixture,D.catalog);collection.resources=resources;return {collection,rows:collection.spirits.filter(row=>!row.guarding&&row.hp>0).map(row=>O.toConfig(row,true))};}
function resources({playerXp=7253000,dust=50000,sparks=20}={}){return {playerXp,dust,sparks:Object.fromEntries(D.catalog.species.map(row=>[row.id,sparks]))};}

test('upgrade-aware raid selection spends a shared budget and never mutates the yard',()=>{
  const source=owned(resources()),before=JSON.stringify(source.collection),result=finish(R.recommendUpgraded(source.rows,'rarog',{seed:'upgrade-aware',attack:1,defense:1},source.collection.resources));
  assert.equal(result.team.length,6);assert.equal(JSON.stringify(source.collection),before);
  assert.ok(result.upgrade.plans.length>0);assert.ok(result.upgrade.spentDust>0&&result.upgrade.spentDust<=source.collection.resources.dust);
  assert.ok(Object.values(result.upgrade.spentSparks).every(value=>value>=0));
  assert.ok(result.team.every(config=>config.level>=source.rows.find(row=>row.instanceId===config.instanceId).level));
  assert.ok(result.upgrade.plans.every(plan=>plan.to>plan.from));
  assert.ok(result.upgrade.remainingDust>=0&&result.upgrade.remainingDust<10000);
});

test('upgrade-aware mode respects player cap, species sparks and exclusion rules',()=>{
  const source=owned(resources({playerXp:300000,dust:999999,sparks:0}));
  const budget=source.collection.resources,plan=R.upgradeCandidates(source.rows,'rarog',budget);
  const cap=U.cap(U.playerLevel(budget.playerXp));assert.ok(plan.plans.every(row=>row.to<=cap));assert.equal(plan.plans.length,0);
  const scarce=owned(resources({dust:1000,sparks:1})),result=R.upgradeCandidates(scarce.rows,'rarog',scarce.collection.resources);
  assert.ok(result.spentDust<=1000);assert.ok(Object.values(result.spentSparks).every(value=>value<=1));
  assert.throws(()=>R.upgradeCandidates(source.rows,'rarog',{playerXp:budget.playerXp,dust:10,sparks:null}));
});

test('upgrade-aware result keeps instance identity and reports only virtual changes',()=>{
  const source=owned(resources({dust:6500,sparks:5})),result=finish(R.recommendUpgraded(source.rows,'rarog',{seed:'identity',attack:1,defense:1},source.collection.resources));
  const ids=new Set(source.rows.map(row=>row.instanceId));assert.ok(result.team.every(row=>ids.has(row.instanceId)));assert.equal(new Set(result.team.map(row=>row.instanceId)).size,result.team.length);
  const byId=new Map(result.upgrade.plans.map(row=>[row.id,row]));for(const config of result.team){const plan=byId.get(config.instanceId);if(plan){assert.equal(config.level,plan.to);assert.equal(plan.spentDust,U.cost(plan.from,plan.to).dust);}}
  assert.ok(result.upgrade.heuristic);assert.equal(result.upgrade.available,source.rows.length);
});
