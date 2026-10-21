(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('./core.js'):root.MifoCore,typeof module!=='undefined'&&module.exports?require('./upgrade-data.js'):root.MifoUpgradeData);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MifoUpgrade=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,D){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function integer(value,min,max,label){if(!Number.isSafeInteger(value)||value<min||value>max)throw Error(label+`: введите целое число от ${min} до ${max}`);return value;}
  const optionalCount=(value,label)=>value==null?null:integer(value,0,Number.MAX_SAFE_INTEGER,label);
  function playerLevel(xp){integer(xp,0,Number.MAX_SAFE_INTEGER,'Опыт игрока');let level=1;while(level<D.maxPlayerLevel&&xp>=D.playerXp[level])level++;return level;}
  function cap(level){return level==null?null:Math.min(D.maxSpiritLevel,integer(level,1,D.maxPlayerLevel,'Уровень игрока')+D.spiritLevelAbovePlayer);}
  function cost(from,to){integer(from,1,D.maxSpiritLevel,'Текущий уровень');integer(to,from,D.maxSpiritLevel,'Целевой уровень');let dust=0,sparks=0;for(let level=from;level<to;level++){dust+=D.dust[level-1];sparks+=D.sparks[level-1];}return {dust,sparks,levels:to-from};}
  function plan(config,catalog,target,budget={},guarding=false){
    const before=C.fighter(config,catalog),from=before.level;
    integer(target,from,D.maxSpiritLevel,'Целевой уровень');
    const dust=optionalCount(budget.dust,'Пыль'),sparks=optionalCount(budget.sparks,'Искры'),playerCap=cap(budget.playerLevel);
    const complete=dust!==null&&sparks!==null&&playerCap!==null;
    const upgraded=clone(config);upgraded.level=target;
    if(target>from){upgraded.manualStats=null;upgraded.snapshotStats=false;}
    upgraded.health=100;
    const after=target===from?before:C.fighter(upgraded,catalog),total=cost(from,target);
    let affordable=null;
    if(complete){affordable=from;if(!guarding){let d=0,s=0;for(let level=from;level<playerCap;level++){d+=D.dust[level-1];s+=D.sparks[level-1];if(d>dust||s>sparks)break;affordable=level+1;}}}
    const steps=[];let d=0,s=0;
    for(let level=from+1;level<=D.maxSpiritLevel;level++){
      d+=D.dust[level-2];s+=D.sparks[level-2];const fighter=C.fighter({...upgraded,level,manualStats:null,snapshotStats:false},catalog);
      steps.push({level,dust:D.dust[level-2],sparks:D.sparks[level-2],totalDust:d,totalSparks:s,power:fighter.power,hpMax:fighter.hpMax});
    }
    return {from,target,before,after,config:upgraded,total,playerCap,requiredPlayerLevel:Math.max(1,target-D.spiritLevelAbovePlayer),completeBudget:complete,affordableLevel:affordable,guarding:!!guarding,
      shortage:{dust:dust===null?null:Math.max(0,total.dust-dust),sparks:sparks===null?null:Math.max(0,total.sparks-sparks)},
      canReach:target===from?true:guarding?false:playerCap!==null&&target>playerCap?false:dust!==null&&total.dust>dust||sparks!==null&&total.sparks>sparks?false:complete?true:null,
      powerGain:after.power-before.power,powerPercent:before.power?(after.power/before.power-1)*100:0,steps};
  }
  return {playerLevel,cap,cost,plan};
});
