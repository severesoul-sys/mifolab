const fs=require('node:fs'),path=require('node:path'),ref=require('./reference-046.cjs');
const data=ref.load(),root=path.resolve(__dirname,'../web');
const metadata={version:'0.46',source:ref.URL,sha256:ref.SHA};
const catalog={...metadata,species:data.species,excluded:['izbushka'],retired:data.retired};
const raids={...metadata,guide:'https://mifozov.com/players#bosses',checkedAt:'2026-10-21',rules:data.rules.boss,battle:data.rules.battle,brew:data.rules.brew,retired:data.retired,catalog,
 bosses:data.rules.boss.tiers.flatMap((tier,index)=>tier.pool.map(id=>({id,stars:index+1,level:tier.level,hp:tier.hp})))};
const upgrades={...metadata,maxSpiritLevel:data.rules.maxSpiritLevel,maxPlayerLevel:data.rules.maxPlayerLevel,spiritLevelAbovePlayer:data.rules.spiritLevelAbovePlayer,playerXp:data.rules.player.levels,dust:data.rules.powerUp.dust,sparks:data.rules.powerUp.sparks,passes:{dailyFromOak:data.rules.boss.passFromOak,price:data.rules.ofenya.sells.boss_pass.price,perDay:data.rules.ofenya.sells.boss_pass.perDay}};
for(const [file,global,value] of [['catalog.js','MifoCatalog',catalog],['chronicle-data.js','MifoChronicle',{...metadata,entries:data.chronicle}],['raid-data.js','MifoRaidData',raids],['upgrade-data.js','MifoUpgradeData',upgrades]]){
 fs.writeFileSync(path.join(root,file),`// Generated from the reviewed public client by tools/extract-046.cjs.\n(function(root){const data=${JSON.stringify(value,null,2)};if(typeof module!=='undefined'&&module.exports)module.exports=data;root.${global}=data;})(typeof globalThis!=='undefined'?globalThis:this);\n`);
}
console.log('Updated 138 active spirits, 12 bosses, upgrade rules and raid potions for Mifozov 0.46');
