(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('./core.js'):root.MifoCore,typeof module!=='undefined'&&module.exports?require('./raid-data.js'):root.MifoRaidData,typeof module!=='undefined'&&module.exports?require('./upgrade-core.js'):root.MifoUpgrade);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MifoRaids=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,D,U){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value)),catalog=D.catalog;
  function num(value,min,max,label,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw Error(label+`: допустимо ${min}–${max}`);return value;}
  function settings(input={}){
    const accuracy=(value,label)=>value==null?null:num(value,0,1,label);
    const friendBonus=num(input.friendBonus??0,0,.15,'Бонус дружбы');
    if(input.silaPotion!=null&&typeof input.silaPotion!=='boolean')throw Error('Выберите, использовать ли Отвар силы');
    return {friendBonus,seed:String(input.seed??'mifo-raids').slice(0,100),attack:accuracy(input.attack,'Руна атаки'),defense:accuracy(input.defense,'Руна защиты'),probabilityMax:num(input.probabilityMax??.5,0,1,'Вероятность максимума'),bossAccuracy:input.bossAccuracy==null?null:num(input.bossAccuracy,0,1,'Руна босса'),durationMs:num(input.durationMs??178000,5000,D.rules.fightSec*1000,'Время боя, мс',true),attackRuneMs:num(input.attackRuneMs??3000,100,3000,'Время атаки, мс',true),defenseRuneMs:num(input.defenseRuneMs??2500,100,2500,'Время защиты, мс',true),swapMs:num(input.swapMs??500,0,10000,'Смена духа, мс',true),silaPotion:input.silaPotion??false,revives:num(input.revives??0,0,D.brew.livePerFight,'Живая вода на игрока',true)};
  }
  function boss(id){
    const definition=D.bosses.find(row=>row.id===id);if(!definition)throw Error('Босс отсутствует в текущем списке игры');
    const fighter=C.fighter(C.defaultConfig(id,definition.level,15),catalog);
    return {...fighter,...definition,hpMax:definition.hp,attackMultiplier:D.rules.attackK};
  }
  function upgradeBudget(input={}){
    const value=input&&typeof input==='object'?input:{};
    const playerLevel=Number.isSafeInteger(value.playerLevel)?value.playerLevel:(Number.isSafeInteger(value.playerXp)?U.playerLevel(value.playerXp):null);
    if(playerLevel==null||playerLevel<1)throw Error('Уровень игрока для виртуальной прокачки неизвестен. Обновите Подворье.');
    if(!Number.isSafeInteger(value.dust)||value.dust<0)throw Error('Запас Пыли для виртуальной прокачки неизвестен. Обновите Подворье.');
    if(!value.sparks||typeof value.sparks!=='object'||Array.isArray(value.sparks))throw Error('Запасы Искр для виртуальной прокачки неизвестны. Обновите Подворье.');
    const sparks={};for(const [speciesId,amount] of Object.entries(value.sparks)){if(!Number.isSafeInteger(amount)||amount<0)throw Error('Повреждён запас Искр. Обновите Подворье.');sparks[speciesId]=amount;}
    return {playerLevel,dust:value.dust,sparks,cap:U.cap(playerLevel)};
  }
  function upgradePotential(config,bossId){
    const fighter=C.fighter(config,catalog),enemy=boss(bossId);
    const fast=C.fastDamage(fighter,enemy),ultra=C.ultraDamage(fighter,enemy,1,0);
    const tempo=1000/Math.max(1,C.interval(fighter,enemy,520));
    return (fast+ultra*.55)*tempo*(1+Math.max(0,fighter.stats.pryt-enemy.stats.pryt)/1000);
  }
  function upgradeCandidates(configs,bossId,input={}){
    const budget=upgradeBudget(input),rows=[];
    for(const config of configs){
      const from=C.fighter(config,catalog).level,sparks=budget.sparks[config.speciesId]??0;
      const maxPlan=from>=budget.cap?{affordableLevel:from,config:clone(config)}:U.plan(config,catalog,budget.cap,{playerLevel:budget.playerLevel,dust:budget.dust,sparks},false);
      const target=maxPlan.affordableLevel??from;
      const maxConfig=target===from?clone(config):maxPlan.config;
      rows.push({id:config.instanceId||config.speciesId,speciesId:config.speciesId,from,target,config:clone(config),working:clone(config),maxConfig,potential:upgradePotential(maxConfig,bossId),currentPotential:upgradePotential(config,bossId),spentDust:0,spentSparks:0});
    }
    // Keep a broad pool so a weak, under-levelled spirit can enter after
    // virtual strengthening, while avoiding thousands of expensive simulations.
    rows.sort((a,b)=>b.potential-a.potential||b.currentPotential-a.currentPotential||String(a.id).localeCompare(String(b.id)));
    const pool=rows.slice(0,Math.min(128,rows.length));
    let dust=budget.dust;const sparks={...budget.sparks};
    for(const row of pool){row.target=Math.min(row.target,budget.cap);}
    while(true){
      let best=null,bestValue=-Infinity;
      for(const row of pool){
        const level=C.fighter(row.working,catalog).level;if(level>=row.target)continue;
        const dustCost=U.cost(level,level+1).dust,sparkCost=U.cost(level,level+1).sparks,available=sparks[row.speciesId]??0;
        if(dustCost>dust||sparkCost>available)continue;
        const next=U.plan(row.working,catalog,level+1,{playerLevel:budget.playerLevel,dust:dustCost,sparks:sparkCost},false).config;
        const gain=upgradePotential(next,bossId)-upgradePotential(row.working,bossId),value=gain/Math.max(1,dustCost);
        if(value>bestValue+1e-12||(Math.abs(value-bestValue)<1e-12&&gain>(best?.gain??-Infinity))){best={row,next,dustCost,sparkCost,gain};bestValue=value;}
      }
      if(!best)break;
      best.row.working=best.next;best.row.spentDust+=best.dustCost;best.row.spentSparks+=best.sparkCost;dust-=best.dustCost;sparks[best.row.speciesId]=(sparks[best.row.speciesId]??0)-best.sparkCost;
    }
    const byId=new Map(pool.map(row=>{const fighter=C.fighter(row.working,catalog);return [row.id,{...row,config:row.working,level:fighter.level,power:fighter.power}];}));
    const upgradedConfigs=configs.map(config=>byId.get(config.instanceId||config.speciesId)?.config||clone(config));
    const plans=pool.map(row=>{const before=C.fighter(row.config,catalog),after=C.fighter(row.working,catalog);return {id:row.id,speciesId:row.speciesId,name:after.name,from:before.level,to:after.level,spentDust:row.spentDust,spentSparks:row.spentSparks,powerBefore:before.power,powerAfter:after.power};}).filter(row=>row.to>row.from);
    const spentDust=plans.reduce((sum,row)=>sum+row.spentDust,0),spentSparks={};for(const row of plans)spentSparks[row.speciesId]=(spentSparks[row.speciesId]??0)+row.spentSparks;
    return {configs:upgradedConfigs,plans,spentDust,spentSparks,remainingDust:dust,remainingSparks:sparks,playerLevel:budget.playerLevel,cap:budget.cap,available:configs.length,shortlisted:pool.length,heuristic:true};
  }
  function validateTeam(team){
    if(!Array.isArray(team)||!team.length||team.length>6)throw Error('Выберите от 1 до 6 духов');
    const ids=team.filter(Boolean).map(row=>row.instanceId).filter(Boolean);if(new Set(ids).size!==ids.length)throw Error('Один пойманный дух не может занимать два места в отряде');
    return team.map((config,index)=>C.fighter(config,catalog,index));
  }
  function damage(attacker,defender,ultra=false,accuracy=1,defense=0,multiplier=1){
    const ratio=ultra?Math.max(1,attacker.stats.duh)/Math.max(1,defender.stats.duh):Math.max(1,attacker.stats.sila)/Math.max(1,defender.stats.stoikost);
    return Math.floor((ultra?135:16)*ratio*C.levelScale(attacker.level)*C.effect(attacker,defender,ultra)*(ultra?(.3+1.2*accuracy)*(1-.8*defense):1)*multiplier)+1;
  }
  // One client fight. Every player has their own boss energy, attacks and rune
  // pauses; only damage to the boss is shared by the room.
  function solo(team,bossId,input={},capture=false){
    const options=settings(input),fighters=validateTeam(team),enemy=boss(bossId),random=C.rng(options.seed),runes=C.rng(options.seed+':runes');
    if(options.silaPotion)for(const member of fighters)member.stats.sila=Math.round(member.stats.sila*(1+D.brew.silaBuff));
    let revivesLeft=options.revives;const revivals=[];
    let active=fighters.findIndex(member=>member.hp>0),time=0,myNext=0,aiNext=1500,pending=null,replaceAt=null,lastRune=null,done=active<0,reason=done?'fainted':'time',dealt=0,steps=0;
    const hits=[],events=[],bySlot=fighters.map(()=>({damage:0,fast:0,ultra:0}));
    function record(kind,extra={}){if(capture)events.push({time,kind,active,hp:fighters.map(row=>row.hp),energy:fighters.map(row=>row.energy),bossHp:enemy.hp,bossEnergy:enemy.energy,...extra});}
    function faint(){if(fighters.some(row=>row.hp>0)||revivesLeft>0)replaceAt=time+options.swapMs;else{done=true;reason='fainted';}}
    function hit(side,ultra,accuracy=1,defense=0){
      const me=fighters[active],attacker=side?enemy:me,target=side?me:enemy;
      const base=damage(attacker,target,ultra,accuracy,defense,side?enemy.attackMultiplier:1);
      // Scenario estimate: preserve fractional bonus credit instead of inventing
      // a server rounding rule. No friendship bonus affects incoming attacks.
      const raw=base*(side?1:1+options.friendBonus),amount=Math.min(target.hp,raw);target.hp-=amount;
      attacker.energy=ultra?0:Math.min(100,attacker.energy+12);
      if(!side){dealt+=amount;bySlot[active].damage+=amount;bySlot[active][ultra?'ultra':'fast']++;hits.push({time,amount,baseAmount:amount/(1+options.friendBonus),slot:active});}
      record(ultra?'ultra':'hit',{side,amount,raw,attack:accuracy,defense,slot:active});
      if(enemy.hp<=0){done=true;reason='won';}else if(me.hp===0)faint();
    }
    record('start');
    while(!done&&steps++<20000){
      if(replaceAt!=null){
        if(replaceAt>options.durationMs)break;time=replaceAt;replaceAt=null;active=fighters.findIndex(row=>row.hp>0);
        if(active<0){
          // The game ends the pick window at 10 seconds before accepting a revive.
          if(revivesLeft<=0||options.swapMs>=D.battle.faintPickMs){done=true;reason='fainted';break;}
          active=0;revivesLeft--;fighters[active].hp=Math.max(1,Math.round(fighters[active].hpMax*D.brew.liveHp));
          revivals.push({time,slot:active});record('revive',{slot:active});
        }
        myNext=time+400;aiNext=Math.max(aiNext,time+800);record('swap');continue;
      }
      if(pending){
        const duration=pending.side?options.defenseRuneMs:options.attackRuneMs;
        if(time+duration>options.durationMs)break;time+=duration;
        const attack=pending.side?(options.bossAccuracy??(.45+random()*.4)):C.sampleRune(options.attack,runes,options.probabilityMax);
        const defense=pending.side?C.sampleRune(options.defense,runes,options.probabilityMax):0;
        myNext=time+300;aiNext=time+1200;const side=pending.side;pending=null;hit(side,true,attack,defense);continue;
      }
      const playerAt=fighters[active].energy>=100?time+100:Math.max(time,myNext),side=aiNext<=playerAt?1:0,next=side?aiNext:playerAt;
      if(next>options.durationMs)break;time=next;
      const attacker=side?enemy:fighters[active],target=side?fighters[active]:enemy;
      if(attacker.energy>=100){const shapes=Object.keys(C.RUNES).filter(id=>id!==lastRune);lastRune=shapes[Math.floor(random()*shapes.length)];pending={side};record('rune',{side,id:lastRune});continue;}
      if(side)aiNext=time+C.interval(attacker,target,1150);else myNext=time+C.interval(attacker,target,520);
      hit(side,false);
    }
    if(!done){time=options.durationMs;reason=steps>=20000?'limit':'time';}
    record('end',{reason});
    return {won:reason==='won',reason,time,damage:dealt,baseDamage:dealt/(1+options.friendBonus),friendDamage:dealt-dealt/(1+options.friendBonus),hits,events,bySlot,fighters,boss:enemy,options,active,revivals,revivesUsed:revivals.length,revivesRemaining:revivesLeft};
  }
  function group(teams,bossId,input={},capture=true){
    if(!Array.isArray(teams)||!teams.length||teams.length>D.rules.maxPlayers)throw Error('В рейде от 1 до 6 игроков');
    const options=settings({...input,friendBonus:teams.length===1?0:input.friendBonus}),enemy=boss(bossId),runs=teams.map((team,index)=>solo(team,bossId,{...options,seed:options.seed+':player:'+index},capture));
    const hits=runs.flatMap((run,player)=>run.hits.map((hit,index)=>({...hit,player,index}))).sort((a,b)=>a.time-b.time||a.player-b.player||a.index-b.index);
    const contributions=teams.map(()=>0),timeline=[{time:0,hp:enemy.hp}],slotDamage=teams.map(team=>team.map(()=>0));let remaining=enemy.hp,winAt=null;
    for(const hit of hits){const amount=Math.min(remaining,hit.amount);remaining-=amount;contributions[hit.player]+=amount;slotDamage[hit.player][hit.slot]+=amount;if(capture)timeline.push({time:hit.time,hp:remaining});if(!remaining){winAt=hit.time;break;}}
    const time=winAt??Math.max(...runs.map(run=>run.time));
    const players=runs.map((run,index)=>{
      const latest=capture?[...run.events].reverse().find(event=>event.time<=time):null;
      const hp=latest?.hp||run.fighters.map(row=>row.hp);
      const revivesUsed=run.revivals.filter(event=>event.time<=time).length;
      return {player:index,damage:contributions[index],baseDamage:contributions[index]/(1+options.friendBonus),friendDamage:contributions[index]-contributions[index]/(1+options.friendBonus),potentialDamage:run.damage,slotDamage:slotDamage[index],hp,alive:hp.filter(value=>value>0).length,revivesUsed,revivesRemaining:options.revives-revivesUsed,reason:winAt!=null?'group-win':run.reason,time:Math.min(run.time,time),events:capture?run.events.filter(event=>event.time<=time):[]};
    });
    const damage=enemy.hpMax-remaining,baseDamage=damage/(1+options.friendBonus);
    return {won:winAt!=null,time,hp:remaining,hpMax:enemy.hpMax,damage,baseDamage,friendDamage:damage-baseDamage,players,timeline,options,bossId};
  }
  function* series(teams,bossId,input={},trials=100){
    num(trials,1,200,'Число повторов',true);let wins=0,damage=0,wonTime=0;
    const contributions=teams.map(()=>0),options=settings(input);
    for(let trial=0;trial<trials;trial++){
      const result=group(teams,bossId,{...options,seed:options.seed+':trial:'+trial},false);wins+=Number(result.won);damage+=result.damage;if(result.won)wonTime+=result.time;result.players.forEach((row,i)=>contributions[i]+=row.damage);yield {done:trial+1,total:trials};
    }
    return {wins,trials,winRate:wins/trials,averageDamage:damage/trials,averageWinTime:wins?wonTime/wins:null,contributions:contributions.map(value=>value/trials)};
  }
  function* playerCounts(teams,bossId,input={},trials=50){
    if(teams.length!==6)throw Error('Для сравнения 1–6 игроков задайте шесть команд');num(trials,1,200,'Число повторов',true);
    const options=settings(input),hp=boss(bossId).hpMax,rows=teams.map((_,index)=>({players:index+1,wins:0,damage:0}));
    for(let trial=0;trial<trials;trial++){
      let damage=0;
      for(let player=0;player<6;player++){
        damage+=solo(teams[player],bossId,{...options,seed:`${options.seed}:trial:${trial}:player:${player}`}).damage;
        const credited=player===0&&options.friendBonus?solo(teams[0],bossId,{...options,friendBonus:0,seed:`${options.seed}:trial:${trial}:player:0`}).damage:damage;
        rows[player].wins+=Number(credited>=hp);rows[player].damage+=Math.min(hp,credited);
      }
      yield {done:trial+1,total:trials};
    }
    rows.forEach(row=>{row.trials=trials;row.winRate=row.wins/trials;row.averageDamage=row.damage/trials;});
    return {rows,threshold:.8,minimum:rows.find(row=>row.winRate>=.8)?.players??null};
  }
  function* attackers(configs,bossId,input={},trials=16){
    num(trials,1,64,'Повторы рейтинга',true);if(!Array.isArray(configs)||configs.length>2000)throw Error('Не больше 2000 кандидатов');
    const options=settings(input),rows=[];
    for(let index=0;index<configs.length;index++){
      const config=configs[index],fighter=C.fighter(config,catalog);let total=0,duration=0,win=0;
      for(let trial=0;trial<trials;trial++){const result=solo([config],bossId,{...options,seed:options.seed+':rank:'+trial});total+=result.damage;duration+=result.time;win+=Number(result.won);}
      rows.push({index,id:config.instanceId||config.speciesId,name:fighter.name,speciesId:config.speciesId,level:fighter.level,damage:total/trials,dps:duration?total/duration*1000:0,time:duration/trials,winRate:win/trials,fast:C.effect(fighter,boss(bossId)),ultra:C.effect(fighter,boss(bossId),true),config:clone(config)});
      yield {done:index+1,total:configs.length};
    }
    rows.sort((a,b)=>b.damage-a.damage||b.dps-a.dps||a.id.localeCompare(b.id));rows.forEach((row,i)=>row.rank=i+1);return rows;
  }
  function* recommend(configs,bossId,input={}){
    const options=settings(input),ranker=attackers(configs,bossId,options,8);let next;
    do{next=ranker.next();if(!next.done)yield {stage:'rank',...next.value};}while(!next.done);
    const ranked=next.value;if(!ranked.length)throw Error('Нет доступных духов для рейда');
    // Shortlist balances total damage and speed, followed by actual sequence
    // simulations. Instances are unique; a catalog entry is not fabricated.
    const byDamage=ranked.slice(0,24),bySpeed=[...ranked].sort((a,b)=>b.dps-a.dps).slice(0,12),pool=[...new Map([...byDamage,...bySpeed].map(row=>[row.id,row])).values()];
    const hp=boss(bossId).hpMax,selected=[];let tested=0;
    function score(rows){let score=0;for(let trial=0;trial<4;trial++){const result=solo(rows.map(row=>row.config),bossId,{...options,seed:options.seed+':pick:'+trial});score+=result.damage/hp+(result.won?.2*(1-result.time/options.durationMs):0);}return score/4;}
    while(selected.length<6&&selected.length<pool.length){
      let best=null,bestScore=-Infinity;
      for(const row of pool){if(selected.some(item=>item.id===row.id))continue;const value=score([...selected,row]);if(value>bestScore+1e-10||(Math.abs(value-bestScore)<1e-10&&row.rank<(best?.rank??Infinity))){best=row;bestScore=value;}yield {stage:'pick',done:++tested,total:6*pool.length};}
      selected.push(best);
    }
    let bestScore=score(selected);
    for(let pass=0;pass<2;pass++)for(let a=0;a<selected.length;a++)for(let b=a+1;b<selected.length;b++){
      const swapped=[...selected];[swapped[a],swapped[b]]=[swapped[b],swapped[a]];const value=score(swapped);if(value>bestScore+1e-10){selected.splice(0,selected.length,...swapped);bestScore=value;}
    }
    return {team:selected.map(row=>clone(row.config)),available:ranked.length,shortlist:pool.length,complete:selected.length===6,ranked,score:bestScore};
  }
  function* recommendUpgraded(configs,bossId,input={},budget={}){
    const upgrade=upgradeCandidates(configs,bossId,budget);yield {stage:'upgrade',done:upgrade.plans.length,total:upgrade.shortlisted};
    const picker=recommend(upgrade.configs,bossId,input);let next;
    do{next=picker.next();if(!next.done)yield {stage:next.value.stage||'pick',done:next.value.done,total:next.value.total};}while(!next.done);
    return {...next.value,upgrade};
  }
  function* job(type,payload){
    if(type==='rank')return yield* attackers(payload.configs,payload.bossId,payload.options,payload.trials);
    if(type==='pick')return yield* recommend(payload.configs,payload.bossId,payload.options);
    if(type==='pick-upgraded')return yield* recommendUpgraded(payload.configs,payload.bossId,payload.options,payload.upgrade);
    if(type==='counts')return yield* playerCounts(payload.teams,payload.bossId,payload.options,payload.trials);
    if(type==='series')return yield* series(payload.teams,payload.bossId,payload.options,payload.trials);
    throw Error('Неизвестный расчёт');
  }
  return {catalog,settings,boss,validateTeam,damage,solo,group,series,playerCounts,attackers,recommend,recommendUpgraded,upgradeBudget,upgradeCandidates,job};
});
