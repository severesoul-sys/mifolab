(function(root,factory){const api=factory(typeof module!=='undefined'&&module.exports?require('./core.js'):root.MifoCore,typeof module!=='undefined'&&module.exports?require('./spirit-search.js'):root.MifoSearch);if(typeof module!=='undefined'&&module.exports)module.exports=api;root.MifoCollection=api;})(typeof globalThis!=='undefined'?globalThis:this,function(C,S){
  'use strict';
  const FORMAT='mifolab-collection',MAX_SPIRITS=2000;
  // Preserve collections already saved on the device by earlier releases.
  const LEGACY_FORMAT='mifozov-observer-collection';
  const clone=value=>JSON.parse(JSON.stringify(value));
  function num(value,min,max,label,integer=false){if(typeof value!=='number'||!Number.isFinite(value)||value<min||value>max||(integer&&!Number.isInteger(value)))throw new Error('Неверный параметр: '+label);return value;}
  function text(value,label,max=200){if(typeof value!=='string'||!value.trim()||value.length>max)throw new Error('Неверный параметр: '+label);return value;}
  function stats(value,min,max,label){const out={};for(const key of C.STATS)out[key]=num(value?.[key],min,max,label+' '+C.STAT_NAMES[C.STATS.indexOf(key)],true);return out;}
  function flag(value,label){if(value!=null&&typeof value!=='boolean')throw new Error('Неверный флаг: '+label);return value===true;}
  function parse(input,catalog){
    let data=input;
    if(typeof input==='string'){if(input.length>12*1024*1024)throw new Error('Данные подворья слишком большие');try{data=JSON.parse(input.replace(/^\uFEFF/,''));}catch{throw new Error('Не удалось прочитать подворье. Получите духов заново.');}}
    if(!data||![FORMAT,LEGACY_FORMAT].includes(data.format)||data.version!==1)throw new Error('Не удалось прочитать подворье. Получите духов заново.');
    if(!Array.isArray(data.spirits)||data.spirits.length>MAX_SPIRITS)throw new Error('Поддерживается не больше 2000 духов');
    if(!Array.isArray(data.unavailable)||data.unavailable.length>MAX_SPIRITS)throw new Error('Неверный список неполных записей');
    const unavailable=data.unavailable.map(value=>S.issue(text(value,'неполная запись',1000)));
    const total=num(data.total,0,MAX_SPIRITS,'количество духов',true);
    if(total!==data.spirits.length+unavailable.length)throw new Error('Данные о количестве духов не совпадают');
    const seen=new Set(),warnings=[],spirits=[];
    for(const raw of data.spirits){
      const id=text(raw?.id,'запись духа',160);if(seen.has(id))throw new Error('В подворье повторяется одна и та же запись. Обновите список духов.');seen.add(id);
      const speciesId=text(raw.speciesId,'вид',100),species=catalog.species.find(item=>item.id===speciesId);
      if(!species||(catalog.excluded||[]).includes(speciesId)){unavailable.push('Вид этого духа пока отсутствует в каталоге.');continue;}
      const row={id,speciesId,speciesName:text(raw.speciesName,'имя вида'),name:text(raw.name,'имя духа',300),level:num(raw.level,1,40,'уровень',true),iv:stats(raw.iv,0,15,'IV'),baseStats:stats(raw.baseStats,1,10000,'база'),stats:stats(raw.stats,0,10000,'характеристики')};
      row.nature={up:raw.nature?.up,down:raw.nature?.down};
      if(typeof row.nature.up!=='string'||typeof row.nature.down!=='string'||((row.nature.up||row.nature.down)&&(!C.STATS.includes(row.nature.up)||!C.STATS.includes(row.nature.down)||row.nature.up===row.nature.down)))throw new Error('Не удалось прочитать нрав духа. Обновите подворье.');
      if(!Array.isArray(raw.elements)||raw.elements.length<1||raw.elements.length>2||!raw.elements.every(value=>C.TYPES.includes(value)))throw new Error('Неизвестная стихия духа. Обновите подворье.');
      row.elements=[...raw.elements];row.rarity=text(raw.rarity,'редкость',50);
      row.hpMax=num(raw.hpMax,10,40000,'максимальная Живица',true);row.hp=num(raw.hp,0,row.hpMax,'текущая Живица',true);row.health=num(raw.health,0,100,'Живица %');
      if(row.hpMax!==Math.max(10,row.stats.zhivitsa*4)||row.hp!==(row.health===0?0:Math.max(1,Math.round(row.hpMax*row.health/100))))throw new Error('Живица духа не совпадает с его характеристиками. Обновите подворье.');
      for(const key of ['shiny','favorite','guarding','buddy'])row[key]=flag(raw[key],key);
      row.ivPercent=Math.round(C.STATS.reduce((sum,key)=>sum+row.iv[key],0)/75*100);
      C.fighter(toConfig(row,false),catalog);spirits.push(row);
    }
    const gameVersion=text(data.gameVersion,'версия игры',50);
    if(gameVersion!==catalog.version&&!['0.37','0.42'].every(version=>[gameVersion,catalog.version].includes(version)))warnings.push('Подворье получено для другой версии игры. Прогноз боя может отличаться.');
    if(unavailable.length)warnings.push(`Не участвуют в боях: ${unavailable.length}. Причины показаны ниже.`);
    return {format:FORMAT,version:1,updatedAt:num(data.updatedAt??data.exportedAt,1,8640000000000000,'дата обновления',true),gameVersion,total,spirits,unavailable,warnings};
  }
  function toConfig(row,healed=true){return {speciesId:row.speciesId,level:row.level,iv:{...row.iv},nature:{...row.nature},health:healed?100:row.health,cheer:100,manualStats:{...row.stats},baseStatsOverride:{...row.baseStats},elementsOverride:[...row.elements],instanceId:row.id,displayName:row.name,source:'game',snapshotStats:true,shiny:row.shiny};}
  function options(input={}){
    const quality=input.quality==null?null:num(input.quality,0,1,'точность рун');
    return {...C.settings({mode:'fair',seed:input.seed??'my-spirits',probabilityMax:input.probabilityMax??.5,a:{attack:quality,defense:quality},b:{attack:quality,defense:quality}}),quality,trials:num(input.trials??4,1,32,'повторы',true),healed:input.healed!==false};
  }
  function* tournament(collection,catalog,input={}){
    const rules=options(input),entries=collection.spirits;
    if(entries.length<2)throw new Error('Для личного рейтинга нужны хотя бы два духа');
    const configs=entries.map(row=>toConfig(row,rules.healed));
    const rows=entries.map((row,index)=>({id:row.id,index,name:row.name,speciesId:row.speciesId,power:C.fighter(configs[index],catalog).power,wins:0,losses:0,draws:0,matches:0}));
    const matrix=Array.from({length:rows.length},()=>Array(rows.length).fill(.5));
    const total=rows.length*(rows.length-1)/2;let done=0;
    for(let left=0;left<rows.length;left++)for(let right=left+1;right<rows.length;right++){
      let points=0;
      for(let trial=0;trial<rules.trials;trial++)for(let mirror=0;mirror<2;mirror++){
        const first=mirror?right:left,second=mirror?left:right;
        const result=C.simulate([configs[first]],[configs[second]],catalog,{...rules,seed:`owned:${rules.seed}:${left}:${right}:${trial}`},false);
        rows[first].matches++;rows[second].matches++;
        if(result.winner==null){rows[first].draws++;rows[second].draws++;points+=.5;}
        else{const winner=result.winner===0?first:second,loser=winner===first?second:first;rows[winner].wins++;rows[loser].losses++;if(winner===left)points++;}
      }
      matrix[left][right]=points/(rules.trials*2);matrix[right][left]=1-matrix[left][right];yield {done:++done,total};
    }
    for(const row of rows){row.winRate=row.wins/row.matches;row.score=(row.wins+row.draws*.5)/row.matches;}
    const order=[...rows].sort((a,b)=>b.score-a.score||b.power-a.power||a.id.localeCompare(b.id));order.forEach((row,index)=>row.rank=index+1);
    return {options:rules,rows,matrix,order:order.map(row=>row.id),battles:total*rules.trials*2,createdAt:Date.now()};
  }
  function recommendTeam(collection,ranking,{freeOnly=true}={}){
    if(!ranking||ranking.rows.length!==collection.spirits.length||ranking.rows.some((row,i)=>row.id!==collection.spirits[i].id))throw new Error('Сначала рассчитайте рейтинг этой коллекции');
    const candidates=ranking.rows.filter(row=>{const entry=collection.spirits[row.index];return (!freeOnly||!entry.guarding)&&(ranking.options.healed||entry.hp>0);});
    if(!candidates.length)throw new Error('Нет доступных духов для команды');
    const selected=[],best=ranking.rows.map(()=>0),pool=[...candidates];let strength=0;
    while(selected.length<6&&pool.length){
      let choice=null,utility=-Infinity;
      for(const candidate of pool){
        const coverage=ranking.rows.reduce((sum,enemy)=>sum+Math.max(best[enemy.index],ranking.matrix[candidate.index][enemy.index]),0)/ranking.rows.length;
        const value=.82*coverage+.18*(strength+candidate.score)/(selected.length+1);
        if(value>utility+1e-12||(Math.abs(value-utility)<1e-12&&candidate.rank<(choice?.rank??Infinity))){utility=value;choice=candidate;}
      }
      selected.push(choice);strength+=choice.score;pool.splice(pool.indexOf(choice),1);
      best.forEach((value,index)=>best[index]=Math.max(value,ranking.matrix[choice.index][index]));
    }
    selected.sort((a,b)=>a.rank-b.rank);
    return {ids:selected.map(row=>row.id),coverage:best.reduce((sum,value)=>sum+value,0)/best.length,available:candidates.length,complete:selected.length===6,freeOnly,options:clone(ranking.options)};
  }
  return {FORMAT,MAX_SPIRITS,parse,toConfig,options,tournament,recommendTeam};
});
