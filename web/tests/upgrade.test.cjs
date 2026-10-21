const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../core.js'),U=require('../upgrade-core.js'),D=require('../upgrade-data.js'),O=require('../collection-core.js'),catalog=require('../catalog.js');
const fixture=JSON.parse(fs.readFileSync(path.join(__dirname,'fixtures/android-collection.json'),'utf8'));
test('upgrade costs use the paid transition from each current level',()=>{
 assert.deepEqual(U.cost(1,2),{dust:200,sparks:1,levels:1});
 assert.deepEqual(U.cost(20,40),{dust:127000,sparks:109,levels:20});
 assert.deepEqual(U.cost(39,40),{dust:10000,sparks:10,levels:1});
 assert.deepEqual(U.cost(40,40),{dust:0,sparks:0,levels:0});
 assert.equal(D.dust.length,39);assert.equal(D.sparks.length,39);
 assert.throws(()=>U.cost(20,19));assert.throws(()=>U.cost(1,41));assert.throws(()=>U.cost(1.5,3));
});
test('player XP and the level cap match game progression boundaries',()=>{
 assert.equal(U.playerLevel(0),1);assert.equal(U.playerLevel(2499),1);assert.equal(U.playerLevel(2500),2);
 for(let i=0;i<D.playerXp.length;i++)assert.equal(U.playerLevel(D.playerXp[i]),i+1);
 assert.equal(U.playerLevel(Number.MAX_SAFE_INTEGER),50);
 assert.equal(U.cap(1),3);assert.equal(U.cap(38),40);assert.equal(U.cap(50),40);assert.equal(U.cap(null),null);
 assert.throws(()=>U.playerLevel(-1));assert.throws(()=>U.cap(51));
});
test('affordability respects both resources, the player cap, and exact boundaries',()=>{
 const config=C.defaultConfig('rarog',20,15),budget={playerLevel:20,dust:6500,sparks:5};
 const enough=U.plan(config,catalog,22,budget);assert.equal(enough.affordableLevel,22);assert.equal(enough.canReach,true);
 const higher=U.plan(config,catalog,23,budget);assert.equal(higher.canReach,false);assert.equal(higher.playerCap,22);assert.deepEqual(higher.shortage,{dust:3700,sparks:3});
 assert.equal(U.plan(config,catalog,22,{...budget,dust:6499}).affordableLevel,21);
 assert.equal(U.plan(config,catalog,22,{...budget,sparks:4}).affordableLevel,21);
 assert.equal(U.plan(config,catalog,22,{...budget,playerLevel:18}).affordableLevel,20);
 assert.throws(()=>U.plan(config,catalog,22,{...budget,dust:-1}));
});
test('unknown budgets are not treated as zero or unlimited confirmed resources',()=>{
 const config=C.defaultConfig('rarog',20);
 const unknown=U.plan(config,catalog,40);assert.equal(unknown.canReach,null);assert.equal(unknown.affordableLevel,null);assert.deepEqual(unknown.shortage,{dust:null,sparks:null});
 assert.equal(U.plan(config,catalog,21,{dust:0}).canReach,false);
 assert.equal(U.plan(config,catalog,21,{playerLevel:50,dust:1000000,sparks:null}).affordableLevel,null);
});
test('caught spirits retain exact initial stats and recompute future levels without mutating the yard',()=>{
 const collection=O.parse(fixture,catalog),row=collection.spirits[1],snapshot=JSON.stringify(collection),config=O.toConfig(row),before=JSON.stringify(config);
 const plan=U.plan(config,catalog,40,{playerLevel:50,dust:1000000,sparks:1000});
 assert.deepEqual(plan.before.stats,row.stats);assert.deepEqual(plan.after.iv,row.iv);assert.deepEqual(plan.config.nature,row.nature);
 assert.deepEqual(plan.after.stats,C.fighter({...config,level:40,manualStats:null},catalog).stats);
 assert.equal(plan.config.instanceId,row.id);assert.equal(plan.config.snapshotStats,false);assert.equal(plan.config.manualStats,null);
 assert.equal(JSON.stringify(collection),snapshot);assert.equal(JSON.stringify(config),before);
 const same=U.plan({...config,manualStats:{...row.stats,sila:999}},catalog,row.level);assert.equal(same.after.stats.sila,999);assert.equal(same.powerGain,0);
});
test('guarding and maximum-level spirits are handled without proposing invalid upgrades',()=>{
 const rich={playerLevel:50,dust:1e9,sparks:1e6};
 const guard=U.plan(C.defaultConfig('rarog',20),catalog,30,rich,true);assert.equal(guard.canReach,false);assert.equal(guard.affordableLevel,20);assert.ok(guard.total.dust>0);
 const high=U.plan(C.defaultConfig('rarog',30),catalog,31,{...rich,playerLevel:10});assert.equal(high.affordableLevel,30);assert.equal(high.canReach,false);
 const max=U.plan(C.defaultConfig('rarog',40),catalog,40,rich);assert.equal(max.canReach,true);assert.equal(max.steps.length,0);
});
test('different caught copies stay separate while sparks belong to their shared species',()=>{
 const collection=O.parse(fixture,catalog),copies=collection.spirits.filter(row=>row.speciesId==='rarog');assert.equal(copies.length,2);
 const plans=copies.map(row=>U.plan(O.toConfig(row),catalog,40,{playerLevel:50,dust:1e6,sparks:109}));
 assert.notEqual(plans[0].config.instanceId,plans[1].config.instanceId);assert.notEqual(plans[0].total.dust,plans[1].total.dust);assert.notDeepEqual(plans[0].after.stats,plans[1].after.stats);
});
test('optional resource snapshots survive offline reload and strip unrelated account fields',()=>{
 const input=structuredClone(fixture);input.gameVersion='0.44';input.resources={playerXp:2500,dust:6500,sparks:{rarog:5,indrik:null,unknown:999},token:'PRIVATE',account:'PRIVATE'};
 const read=O.parse(input,catalog);assert.equal(read.resources.playerXp,2500);assert.equal(read.resources.dust,6500);assert.equal(read.resources.sparks.rarog,5);assert.equal(read.resources.sparks.indrik,null);assert.equal(read.resources.sparks.bayun,0);
 assert.equal(read.resources.sparks.unknown,undefined);assert.equal(JSON.stringify(read).includes('PRIVATE'),false);assert.deepEqual(O.parse(JSON.stringify(read),catalog),read);
 assert.equal(O.parse(fixture,catalog).resources,null);
 input.resources={playerXp:-1,dust:'6500',sparks:[]};assert.deepEqual(O.parse(input,catalog).resources,{playerXp:null,dust:null,sparks:null});
});
test('bundled upgrade and pass rules match the locally provided 0.44 reference',{skip:!process.env.MIFOLAB_REFERENCE_044},()=>{
 const source=fs.readFileSync(process.env.MIFOLAB_REFERENCE_044,'utf8'),start=source.indexOf('{maxPlayerLevel:'),end=source.indexOf(',m=[',start);
 assert.ok(start>=0&&end>start);const rules=JSON.parse(JSON.stringify(vm.runInNewContext('('+source.slice(start,end)+')',{}, {timeout:1000})));
 assert.deepEqual(D.dust,rules.powerUp.dust);assert.deepEqual(D.sparks,rules.powerUp.sparks);assert.deepEqual(D.playerXp,rules.player.levels);
 assert.equal(D.spiritLevelAbovePlayer,rules.spiritLevelAbovePlayer);assert.equal(D.passes.dailyFromOak,1);assert.equal(D.passes.price,rules.ofenya.sells.boss_pass.price);assert.equal(D.passes.perDay,3);
});
