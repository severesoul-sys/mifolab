(function(root,factory){const api=factory();if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MifoCore=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const STATS=['zhivitsa','sila','stoikost','pryt','duh'];
  const STAT_NAMES=['Живица','Сила','Стойкость','Прыть','Дух'];
  const TYPES=['voda','ogon','drevo','zemlya','veter','yav','nav'];
  const TYPE_NAMES=['Вода','Огонь','Древо','Земля','Ветер','Явь','Навь'];
  const RARITIES={common:'Обычный',uncommon:'Необычный',rare:'Редкий',legendary:'Легендарный'};
  const RUNES={
    square:{name:'Квадрат',points:[[.1,.1],[.9,.1],[.9,.9],[.1,.9],[.1,.1]]},
    circle:{name:'Круг',points:Array.from({length:33},(_,index)=>{const angle=index/32*Math.PI*2-Math.PI/2;return [.5+Math.cos(angle)*.4,.5+Math.sin(angle)*.4];})},
    bolt:{name:'Молния',points:[[.64,.06],[.3,.52],[.66,.48],[.36,.94]]},
    rhombus:{name:'Ромб',points:[[.5,.02],[.8,.5],[.5,.98],[.2,.5],[.5,.02]]}
  };
  const clamp=(value,low,high)=>Math.max(low,Math.min(high,value));
  const copy=value=>JSON.parse(JSON.stringify(value));
  function number(value,low,high,label){if(typeof value!=='number'||!Number.isFinite(value)||value<low||value>high)throw new Error(`${label}: допустимо от ${low} до ${high}`);return value;}
  function integer(value,low,high,label){number(value,low,high,label);if(!Number.isInteger(value))throw new Error(`${label}: нужно целое число`);return value;}
  function rng(seed){let state=2166136261;for(const char of String(seed)){state^=char.charCodeAt(0);state=Math.imul(state,16777619);}return ()=>{state=state+1831565813>>>0;let value=state;value=Math.imul(value^value>>>15,value|1);value^=value+Math.imul(value^value>>>7,value|61);return ((value^value>>>14)>>>0)/4294967296;};}
  const levelScale=level=>.1+.9*(clamp(level,1,40)-1)/39;
  function defaultConfig(speciesId,level=40,iv=15){return {speciesId,level,iv:Object.fromEntries(STATS.map(stat=>[stat,iv])),nature:{up:'',down:''},health:100,cheer:100,manualStats:null};}
  function fighter(config,catalog,slot=0,guard=false){
    if(!config||typeof config!=='object')throw new Error('Не задан дух');
    const species=catalog.species.find(item=>item.id===config.speciesId);
    if(!species||(catalog.excluded||[]).includes(species.id))throw new Error('Вид отсутствует в игровом каталоге');
    const level=integer(config.level,1,40,'Уровень');
    const iv={};for(const stat of STATS)iv[stat]=integer(config.iv?.[stat],0,15,'IV');
    const nature=config.nature||{up:'',down:''};
    if((nature.up||nature.down)&&(!STATS.includes(nature.up)||!STATS.includes(nature.down)||nature.up===nature.down))throw new Error('Для нрава выберите две разные характеристики');
    const base=config.baseStatsOverride||species.base;
    if(config.baseStatsOverride)for(const stat of STATS)integer(base[stat],1,10000,'Базовая характеристика');
    const stats={};for(const stat of STATS){stats[stat]=config.manualStats?integer(config.manualStats[stat],0,10000,STAT_NAMES[STATS.indexOf(stat)]):Math.floor((base[stat]+iv[stat])*levelScale(level)*(nature.up===stat?1.1:nature.down===stat?.9:1));}
    const elements=config.elementsOverride||species.elements;
    if(!Array.isArray(elements)||elements.length<1||elements.length>2||!elements.every(type=>TYPES.includes(type)))throw new Error('Неизвестные стихии');
    if(config.instanceId!=null&&(typeof config.instanceId!=='string'||!config.instanceId.length||config.instanceId.length>160))throw new Error('Неверные данные выбранного духа');
    if(config.displayName!=null&&(typeof config.displayName!=='string'||!config.displayName.trim()||config.displayName.length>300))throw new Error('Неверное имя духа');
    const health=number(config.health??100,0,100,'Живица');
    const cheer=number(config.cheer??100,0,100,'Бодрость');
    let hpMax=Math.max(10,Math.round(stats.zhivitsa*4));if(guard)hpMax=Math.max(1,Math.round(hpMax*(.5+.5*cheer/100)));
    return {id:config.instanceId||species.id,speciesId:species.id,slot,name:config.displayName||species.name,rarity:species.rarity,elements:[...elements],level,iv,stats,hpMax,hp:health===0?0:Math.max(1,Math.round(hpMax*health/100)),energy:0,power:2*STATS.reduce((sum,stat)=>sum+stats[stat],0),config:copy(config)};
  }
  function element(attack,defense){const left=TYPES.indexOf(attack),right=TYPES.indexOf(defense);if(left<0||right<0)throw new Error('Неизвестная стихия');if(left>=5||right>=5)return left>=5&&right>=5&&left!==right?1.5:1;if((left+1)%5===right)return 1.5;return (right+1)%5===left?.67:1;}
  function effect(attacker,defender,ultra=false){const type=attacker.elements[ultra&&attacker.elements.length>1?1:0];return defender.elements.reduce((result,defense)=>result*element(type,defense),1);}
  function fastDamage(attacker,defender){return Math.floor(16*Math.max(1,attacker.stats.sila)/Math.max(1,defender.stats.stoikost)*levelScale(attacker.level)*effect(attacker,defender))+1;}
  function ultraDamage(attacker,defender,attack=1,defense=0){return Math.floor(135*Math.max(1,attacker.stats.duh)/Math.max(1,defender.stats.duh)*levelScale(attacker.level)*effect(attacker,defender,true)*(.3+1.2*clamp(attack,0,1))*(1-.8*clamp(defense,0,1)))+1;}
  function interval(attacker,defender,base=520){return Math.round(base*clamp(Math.sqrt(Math.max(1,defender.stats.pryt)/Math.max(1,attacker.stats.pryt)),.75,1.35));}
  function sampleRune(value,random,probability=.5){if(value==null)return random()<probability?1:0;return number(value,0,1,'Точность руны');}
  function settings(input={}){const rule=value=>value==null?null:number(value,0,1,'Точность руны');return {mode:input.mode==='raid'?'raid':'fair',seed:String(input.seed??'mifo-lab'),probabilityMax:number(input.probabilityMax??.5,0,1,'Вероятность максимума'),a:{attack:rule(input.a?.attack),defense:rule(input.a?.defense)},b:{attack:rule(input.b?.attack),defense:rule(input.b?.defense)}};}
  function compressTrace(trace){
    const valid=trace.filter(point=>Array.isArray(point)&&point.length===2&&point.every(Number.isFinite));
    const stride=Math.max(1,Math.ceil(valid.length/48));let points=valid.filter((_,index)=>index%stride===0||index===valid.length-1);
    if(points.length>48)points=[...points.slice(0,47),points[points.length-1]];
    return points.map(point=>point.map(value=>Math.round(clamp(value,-.5,1.5)*100)/100));
  }
  function resample(points,step=.02){const result=[];for(let index=1;index<points.length;index++){const from=points[index-1],to=points[index],count=Math.max(1,Math.ceil(Math.hypot(to[0]-from[0],to[1]-from[1])/step));for(let part=0;part<count;part++)result.push([from[0]+(to[0]-from[0])*part/count,from[1]+(to[1]-from[1])*part/count]);}if(points.length)result.push(points[points.length-1]);return result;}
  function lineDistance(point,line){let result=Infinity;for(let index=1;index<line.length;index++){const from=line[index-1],to=line[index],dx=to[0]-from[0],dy=to[1]-from[1],position=clamp(((point[0]-from[0])*dx+(point[1]-from[1])*dy)/(dx*dx+dy*dy||1),0,1);result=Math.min(result,Math.hypot(point[0]-from[0]-position*dx,point[1]-from[1]-position*dy));}return result;}
  function scoreRune(id,trace){
    if(!RUNES[id])throw new Error('Неизвестная руна');
    const points=compressTrace(trace);if(points.length<2)return 0;
    const reference=RUNES[id].points,ideal=resample(reference),drawn=resample(points);
    return ideal.filter(point=>lineDistance(point,points)<=.07).length/ideal.length*drawn.filter(point=>lineDistance(point,reference)<=.07).length/drawn.length;
  }
  class Battle {
    constructor(left,right,catalog,options={},capture=true){
      if(!Array.isArray(left)||!Array.isArray(right)||!left.length||!right.length||left.length>6||right.length>6)throw new Error('Нужны отряды от 1 до 6 духов');
      for(const team of [left,right]){const ids=team.filter(config=>config?.instanceId).map(config=>config.instanceId);if(new Set(ids).size!==ids.length)throw new Error('Один пойманный экземпляр не может занимать два места в одной команде');}
      this.options=settings(options);this.random=rng(this.options.seed);this.capture=capture;this.events=[];this.time=0;this.pending=null;this.over=false;this.winner=null;this.steps=0;this.lastRune=null;this.turnPriority=this.random()<.5?0:1;
      this.sides=[left.map((config,index)=>fighter(config,catalog,index)),right.map((config,index)=>fighter(config,catalog,index,this.options.mode==='raid'))];
      this.active=this.sides.map(team=>team.findIndex(member=>member.hp>0));this.nextAt=[0,this.options.mode==='raid'?1500:0];this.swapAt=[0,0];this.replacement=null;this.ultras=[0,0];
      if(this.active.includes(-1)){this.over=true;this.winner=this.active[0]<0?(this.active[1]<0?null:1):0;}
      this.emit({kind:'start'});
    }
    member(side){return this.sides[side][this.active[side]];}
    emit(event){event.time=this.time;if(this.capture){event.hp=this.sides.map(team=>team.map(member=>member.hp));event.active=[...this.active];event.energy=this.active.map((_,side)=>this.member(side)?.energy||0);this.events.push(event);}return event;}
    finish(winner,reason='complete'){this.over=true;this.winner=winner;this.pending=null;this.reason=reason;return this.emit({kind:'end',winner,reason});}
    defeated(side){
      if(!this.sides[side].some(member=>member.hp>0))return this.finish(1-side);
      this.replacement=side;return null;
    }
    step(){
      if(this.over)return null;if(this.pending)return this.pending;
      if(++this.steps>20000||this.time>3600000)return this.finish(null,'limit');
      if(this.replacement!=null){
        const side=this.replacement;this.replacement=null;
        this.active[side]=this.sides[side].findIndex(member=>member.hp>0);
        if(this.options.mode==='raid'&&side===1){this.nextAt=[this.time+600,this.time+1500];}
        else{this.time+=500;this.nextAt[side]=this.time+400;this.nextAt[1-side]=Math.max(this.nextAt[1-side],this.time+800);}
        return this.emit({kind:'enter',side,name:this.member(side).name});
      }
      const due=this.active.map((_,side)=>this.member(side).energy>=100&&!(this.options.mode==='raid'&&side===1)?this.time+100:Math.max(this.time,this.nextAt[side]));
      let side=due[0]===due[1]?(this.options.mode==='raid'?1:this.turnPriority):due[0]<due[1]?0:1;
      this.turnPriority=1-side;this.time=due[side];const attacker=this.member(side),defender=this.member(1-side);
      if(attacker.energy>=100){
        const pool=Object.keys(RUNES).filter(id=>id!==this.lastRune),id=pool[Math.floor(this.random()*pool.length)];this.lastRune=id;
        const duration=this.options.mode==='raid'&&side===1?2500:3000;
        this.pending={kind:'rune',side,id,time:this.time,duration,until:this.time+duration};
        this.emit({...this.pending});return this.pending;
      }
      const damage=fastDamage(attacker,defender);defender.hp=Math.max(0,defender.hp-damage);attacker.energy=Math.min(100,attacker.energy+12);
      this.nextAt[side]=this.time+interval(attacker,defender,this.options.mode==='raid'&&side===1?1150:520);
      const event=this.emit({kind:'hit',side,damage,effect:effect(attacker,defender),name:attacker.name,target:defender.name,fainted:defender.hp===0});
      if(defender.hp===0)this.defeated(1-side);return event;
    }
    resolveRune(overrides={}){
      const pending=this.pending;if(!pending||this.over)return null;
      const side=pending.side,attacker=this.member(side),defender=this.member(1-side),keys=['a','b'];
      const attack=overrides.attack??sampleRune(this.options[keys[side]].attack,this.random,this.options.probabilityMax);
      const defense=this.options.mode==='raid'&&side===0?0:(overrides.defense??sampleRune(this.options[keys[1-side]].defense,this.random,this.options.probabilityMax));
      number(attack,0,1,'Точность атаки');number(defense,0,1,'Точность защиты');
      const elapsed=clamp(overrides.durationMs??pending.duration,0,pending.duration);this.time=pending.time+Math.round(elapsed);this.pending=null;
      const damage=ultraDamage(attacker,defender,attack,defense);defender.hp=Math.max(0,defender.hp-damage);attacker.energy=0;this.ultras[side]++;
      this.nextAt=this.options.mode==='raid'?[this.time+300,this.time+1200]:[this.time+300,this.time+300];
      const event=this.emit({kind:'ultra',side,damage,attack,defense,id:pending.id,effect:effect(attacker,defender,true),name:attacker.name,target:defender.name,fainted:defender.hp===0});
      if(defender.hp===0)this.defeated(1-side);return event;
    }
    swap(side,index){
      if(this.over||this.pending||this.replacement!=null||this.time<this.swapAt[side]||index===this.active[side]||!this.sides[side][index]||this.sides[side][index].hp<=0)return false;
      this.active[side]=index;this.swapAt[side]=this.time+60000;this.nextAt[side]=this.time+400;this.nextAt[1-side]=Math.max(this.nextAt[1-side],this.time+800);this.emit({kind:'swap',side,name:this.member(side).name});return true;
    }
    run(){while(!this.over){if(this.pending)this.resolveRune();else this.step();}return this.result();}
    result(){return {winner:this.winner,time:this.time,reason:this.reason||'complete',sides:this.sides,active:this.active,events:this.events,ultras:this.ultras};}
  }
  function simulate(left,right,catalog,options={},capture=true){return new Battle(left,right,catalog,options,capture).run();}
  function series(left,right,catalog,options={},count=100){integer(count,1,10000,'Число поединков');const wins=[0,0];let draws=0,time=0;for(let index=0;index<count;index++){const result=simulate(left,right,catalog,{...options,seed:`${options.seed??'series'}:${index}`},false);if(result.winner==null)draws++;else wins[result.winner]++;time+=result.time;}return {wins,draws,count,averageSeconds:time/count/1000};}
  function* tournament(catalog,input={}){
    const options=settings(input),level=integer(input.level??40,1,40,'Уровень'),iv=integer(input.iv??15,0,15,'IV'),trials=integer(input.trials??32,1,128,'Повторы');
    const species=catalog.species.filter(item=>!(catalog.excluded||[]).includes(item.id)&&!(catalog.retired||[]).includes(item.id));
    const configs=species.map(item=>defaultConfig(item.id,level,iv));
    const rows=species.map((item,index)=>({id:item.id,name:item.name,elements:item.elements,rarity:item.rarity,wins:0,losses:0,draws:0,asA:0,asB:0,matches:0,power:fighter(configs[index],catalog).power}));
    const matrix=Array.from({length:rows.length},()=>Array(rows.length).fill(null));let pairs=0;const total=rows.length*(rows.length-1)/2;
    for(let left=0;left<rows.length;left++)for(let right=left+1;right<rows.length;right++){
      let points=0;
      for(let trial=0;trial<trials;trial++)for(let mirror=0;mirror<2;mirror++){
        const first=mirror?right:left,second=mirror?left:right;
        const result=simulate([configs[first]],[configs[second]],catalog,{...options,seed:`rank:${options.seed}:${left}:${right}:${trial}`},false);
        rows[first].matches++;rows[second].matches++;
        if(result.winner==null){rows[first].draws++;rows[second].draws++;points+=.5;}
        else{const winner=result.winner===0?first:second,loser=winner===first?second:first;rows[winner].wins++;rows[loser].losses++;rows[winner][result.winner===0?'asA':'asB']++;if(winner===left)points++;}
      }
      matrix[left][right]=points/(trials*2);matrix[right][left]=1-matrix[left][right];yield {done:++pairs,total};
    }
    for(const row of rows){row.winRate=row.wins/row.matches;row.score=(row.wins+.5*row.draws)/row.matches;row.asARate=row.asA/(row.matches/2);row.asBRate=row.asB/(row.matches/2);}
    const order=[...rows].sort((left,right)=>right.score-left.score||right.power-left.power||left.id.localeCompare(right.id));
    order.forEach((row,index)=>row.rank=index+1);
    return {version:1,sourceVersion:catalog.version,sourceHash:catalog.sha256,options:{...options,level,iv,trials},createdAt:new Date().toISOString(),speciesCount:rows.length,battles:total*trials*2,rows,order:order.map(row=>row.id),matrix};
  }
  function typeCoverage(configs,catalog){const team=configs.map(config=>fighter(config,catalog));return TYPES.map(type=>({type,fast:team.filter(member=>element(member.elements[0],type)>1).length,ultra:team.filter(member=>element(member.elements[1]||member.elements[0],type)>1).length,weak:team.filter(member=>member.elements.reduce((value,target)=>value*element(type,target),1)>1.01).length}));}
  function exportState(state){return JSON.stringify({app:'mifozov-battle-lab',version:1,...state},null,2);}
  function importState(text,catalog){let state;try{state=JSON.parse(text);}catch{throw new Error('Не удалось прочитать сохранённые настройки');}if(state.app!=='mifozov-battle-lab'||state.version!==1)throw new Error('Неверный формат сохранённого отряда');for(const key of ['left','right']){if(!Array.isArray(state[key])||state[key].length<1||state[key].length>6)throw new Error('В отряде должно быть от 1 до 6 духов');state[key].forEach(config=>fighter(config,catalog));}return {left:state.left,right:state.right,options:settings(state.options),size:state.size===6?6:1};}
  return {STATS,STAT_NAMES,TYPES,TYPE_NAMES,RARITIES,RUNES,clamp,rng,levelScale,defaultConfig,fighter,element,effect,fastDamage,ultraDamage,interval,settings,sampleRune,compressTrace,resample,lineDistance,scoreRune,Battle,simulate,series,tournament,typeCoverage,exportState,importState};
});
