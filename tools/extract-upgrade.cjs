const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),crypto=require('node:crypto');
const file=process.env.MIFOLAB_REFERENCE_044;if(!file)throw Error('Set MIFOLAB_REFERENCE_044 to a local Mifozov 0.44 client');
const source=fs.readFileSync(file,'utf8'),start=source.indexOf('{maxPlayerLevel:'),end=source.indexOf(',m=[',start);
if(start<0||end<0)throw Error('Game configuration needs review');
const rules=vm.runInNewContext('('+source.slice(start,end)+')',{}, {timeout:1000});
if(rules.powerUp.dust.length!==39||rules.powerUp.sparks.length!==39||rules.player.levels.length!==50)throw Error('Unexpected progression tables');
const data={version:'0.44',source:'https://mifozov.com/assets/index-DYBdSEdw.js',sha256:crypto.createHash('sha256').update(source).digest('hex'),maxSpiritLevel:rules.maxSpiritLevel,maxPlayerLevel:rules.maxPlayerLevel,spiritLevelAbovePlayer:rules.spiritLevelAbovePlayer,playerXp:rules.player.levels,dust:rules.powerUp.dust,sparks:rules.powerUp.sparks,passes:{dailyFromOak:rules.boss.passFromOak,price:rules.ofenya.sells.boss_pass.price,perDay:rules.ofenya.sells.boss_pass.perDay}};
fs.writeFileSync(path.resolve(__dirname,'../web/upgrade-data.js'),'(function(root){const data='+JSON.stringify(data,null,2)+';if(typeof module!=="undefined"&&module.exports)module.exports=data;root.MifoUpgradeData=data;})(typeof globalThis!=="undefined"?globalThis:this);\n');
console.log('Saved upgrade costs for levels 1–40 and player progression 1–50');
