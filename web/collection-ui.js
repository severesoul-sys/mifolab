(function(){
  'use strict';
  const C=window.MifoCore,O=window.MifoCollection,catalog=window.MifoCatalog,arena=window.MifoArena,S=window.MifoSearch;
  const $=selector=>document.querySelector(selector),escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const number=value=>new Intl.NumberFormat('ru-RU').format(value),pct=value=>(value*100).toFixed(1).replace('.',',')+'%';
  const normalize=value=>String(value).toLocaleLowerCase('ru').replace(/ё/g,'е').trim();
  const storeKey='mifo-lab.collection.v1';
  let collection=null,ranking=null,plan=null,worker=null,token=0,page=0,buildAfter=false,busy=false;
  function message(text,error=false){$('#owned-message').textContent=text;$('#owned-message').hidden=!text;$('#owned-message').classList.toggle('error',error);}
  function rules(){return O.options({healed:$('#owned-health').value==='full',quality:$('#owned-rune').value==='random'?null:Number($('#owned-rune').value)/100,probabilityMax:Number($('#owned-probability').value)/100,trials:Number($('#owned-trials').value),seed:$('#owned-seed').value});}
  function badges(row){return [row.shiny?'✦ Светлый':'',row.favorite?'★ Избранный':'',row.guarding?'В охране':'',row.buddy?'Спутник':''].filter(Boolean).map(value=>`<span class="owned-badge">${value}</span>`).join('');}
  function elements(row){return row.elements.map(type=>`<span class="type-chip ${type}">${C.TYPE_NAMES[C.TYPES.indexOf(type)]}</span>`).join('');}
  function power(row){return C.STATS.reduce((sum,stat)=>sum+row.stats[stat],0)*2;}
  const spiritLabel=row=>[S.label(row.speciesId),'ур. '+row.level,'IV '+row.ivPercent+'%'].filter(Boolean).join(' · ');
  function rowById(id){const row=collection?.spirits.find(item=>item.id===id);if(!row)throw new Error('Дух отсутствует в загруженной коллекции');return row;}
  function renderSummary(){
    $('#owned-content').hidden=!collection;$('#owned-empty').hidden=!!collection;if(!collection)return;
    const species=new Set(collection.spirits.map(row=>row.speciesId)).size;
    $('#owned-summary').innerHTML=`<div><b>${number(collection.spirits.length)}</b><span>пойманных духов</span></div><div><b>${species}</b><span>разных видов</span></div><div><b>${collection.spirits.filter(row=>row.shiny).length}</b><span>светлых</span></div><div><b>${new Date(collection.updatedAt).toLocaleString('ru-RU')}</b><span>последнее обновление подворья</span></div>`;
    $('#owned-warnings').hidden=!collection.warnings.length;
    $('#owned-warnings>div').innerHTML=collection.warnings.map(value=>`<p>${escape(value)}</p>`).join('')+(collection.unavailable.length?`<ul>${collection.unavailable.map(value=>`<li>${escape(value)}</li>`).join('')}</ul>`:'');
    $('#owned-rank').disabled=busy||collection.spirits.length<2;$('#owned-build').disabled=busy||collection.spirits.length<2;
    renderTable();renderTargets();
  }
  function renderTable(){
    if(!collection)return;
    const ranks=new Map((ranking?.rows||[]).map(row=>[row.id,row])),search=normalize($('#owned-search').value),sort=$('#owned-sort').value;
    const rows=collection.spirits.filter(row=>S.matches(search,row.speciesId,row.name,row.speciesName));
    rows.sort((a,b)=>sort==='level'?b.level-a.level||power(b)-power(a):sort==='iv'?b.ivPercent-a.ivPercent||power(b)-power(a):sort==='rank'&&ranking?ranks.get(a.id).rank-ranks.get(b.id).rank:power(b)-power(a)||a.id.localeCompare(b.id));
    const pages=Math.max(1,Math.ceil(rows.length/40));page=Math.min(page,pages-1);
    $('#owned-count').textContent=`${rows.length} из ${collection.spirits.length}`;$('#owned-page').textContent=`${page+1} / ${pages}`;$('#owned-prev').disabled=page===0;$('#owned-next').disabled=page+1>=pages;
    $('#owned-body').innerHTML=rows.slice(page*40,page*40+40).map(row=>{
      const rank=ranks.get(row.id);
      return `<tr><td class="rank-number">${rank?rank.rank:'—'}</td><td><button class="owned-name" data-owned-detail="${escape(row.id)}">${escape(row.name)}</button><small class="owned-description">${S.label(row.speciesId)?'Летопись '+S.label(row.speciesId):''}</small><div class="chips">${elements(row)}${badges(row)}</div></td><td><strong>${row.level}</strong> / ${row.ivPercent}%</td><td class="owned-stats">${C.STATS.map(stat=>row.stats[stat]).join(' · ')}</td><td>${row.hp} / ${row.hpMax}</td><td class="win-cell">${rank?`<strong>${pct(rank.winRate)}</strong><small>${number(rank.wins)} / ${number(rank.matches)}${rank.draws?' · ничьи: '+rank.draws:''}</small>`:'<small>Не рассчитан</small>'}</td><td>${number(power(row))}</td><td><div class="owned-row-actions"><button class="rank-action" data-owned-add="a" data-owned-id="${escape(row.id)}">В A</button><button class="rank-action" data-owned-add="b" data-owned-id="${escape(row.id)}">В B</button><button class="rank-action" data-owned-raid="${escape(row.id)}">В рейд</button></div></td></tr>`;
    }).join('')||'<tr><td colspan="8">По этому имени или номеру летописи духов не найдено.</td></tr>';
  }
  function showDetail(id){
    const row=rowById(id),rank=ranking?.rows.find(item=>item.id===id),nature=row.nature.up?'↑ '+C.STAT_NAMES[C.STATS.indexOf(row.nature.up)]+' / ↓ '+C.STAT_NAMES[C.STATS.indexOf(row.nature.down)]:'Ровный нрав';
    let matchups='';
    if(rank){
      const sorted=ranking.rows.filter(enemy=>enemy.id!==id).map(enemy=>({enemy,score:ranking.matrix[rank.index][enemy.index]})).sort((a,b)=>b.score-a.score);
      const show=items=>items.map(item=>`<div class="matchup-item"><span>${escape(item.enemy.name)} <small>${spiritLabel(rowById(item.enemy.id))}</small></span><b>${pct(item.score)}</b><button class="rank-action" data-owned-pair="${escape(item.enemy.id)}" data-owned-id="${escape(id)}">Бой</button></div>`).join('');
      matchups=`<div class="matchup-columns"><div><h3>Удачные противостояния</h3>${show(sorted.slice(0,3))}</div><div><h3>Сложные противостояния</h3>${show(sorted.slice(-3).reverse())}</div></div><p class="small-note">Доля очков: победа = 1, ничья = 0,5. «Бой» переносит эту пару на арену.</p>`;
    }
    $('#owned-detail').innerHTML=`<div class="section-head"><div><div class="eyebrow">ЭКЗЕМПЛЯР ИЗ ПОДВОРЬЯ</div><h2>${escape(row.name)}</h2></div><button class="text-button" id="owned-close-detail">Закрыть ×</button></div><p>${S.label(row.speciesId)?'Летопись '+S.label(row.speciesId)+' · ':''}${escape(C.RARITIES[row.rarity]||row.rarity)} · уровень ${row.level} · ${nature}</p><div class="chips">${elements(row)}${badges(row)}</div><div class="table-wrap"><table class="log-table"><thead><tr><th>Параметр</th><th>База вида</th><th>IV</th><th>Итог</th></tr></thead><tbody>${C.STATS.map((stat,index)=>`<tr><td>${C.STAT_NAMES[index]}</td><td>${row.baseStats[stat]}</td><td>${row.iv[stat]} / 15</td><td>${row.stats[stat]}</td></tr>`).join('')}</tbody></table></div><p class="small-note">Живица в снимке: ${row.hp} / ${row.hpMax}. ${$('#owned-health').value==='full'?'В симуляции используется полная Живица.':'В симуляции используется Живица на момент обновления подворья.'}</p>${matchups}`;
    $('#owned-detail').hidden=false;$('#owned-detail').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function renderTargets(){
    const teams=arena.teams(),size=Number($('#owned-size').value);
    for(const side of ['a','b']){
      const select=$('#owned-slot-'+side),previous=Math.min(Number(select.value)||0,size-1);
      select.innerHTML=Array.from({length:size},(_,index)=>`<option value="${index}">Место ${index+1}</option>`).join('');select.value=String(previous);select.disabled=size===1;
    }
    $('#owned-arena-teams').innerHTML=['left','right'].map((key,index)=>`<div><strong>Сторона ${index===0?'A':'B'}</strong><ol>${teams[key].slice(0,size).map(config=>`<li>${escape(config.displayName||catalog.species.find(row=>row.id===config.speciesId).name)} <small>${[S.label(config.speciesId),config.instanceId?'из подворья':'из каталога'].filter(Boolean).join(' · ')}</small></li>`).join('')}</ol></div>`).join('');
  }
  function add(id,side){
    const row=rowById(id),size=Number($('#owned-size').value),slot=Number($('#owned-slot-'+side).value),settings=rules();
    arena.assign(side,[O.toConfig(row,settings.healed)],{size,slot,options:settings});
    message(`${row.name} → команда ${side.toUpperCase()}, место ${slot+1}. Можно выбрать соперника или открыть арену.`);
    if(size===6)$('#owned-slot-'+side).value=String(Math.min(5,slot+1));
  }
  function createPlan(){
    try{
      plan=O.recommendTeam(collection,ranking,{freeOnly:$('#owned-free').checked});
      const rows=plan.ids.map(rowById);
      $('#owned-team').hidden=false;
      $('#owned-team').innerHTML=`<div class="owned-squad">${rows.map((row,index)=>`<div><small>${index+1} · ур. ${row.level} · IV ${row.ivPercent}%</small><strong>${escape(row.name)}</strong><span>${S.label(row.speciesId)}</span><div class="chips">${elements(row)}</div></div>`).join('')}</div><p>${plan.complete?'Предложены шесть разных экземпляров.':`Подходящих духов только ${plan.ids.length} из необходимых 6.`}</p><p class="small-note">Выбор дополняет сильные противостояния команды, затем учитывает средние результаты. Порядок — по личному рейтингу. Это рекомендуемый набор, не гарантия лучшей команды или победы над любым соперником.</p><div class="owned-actions"><button class="button primary" data-owned-team="a" ${plan.complete?'':'disabled'}>В команду A</button><button class="button secondary" data-owned-team="b" ${plan.complete?'':'disabled'}>В команду B</button></div>`;
    }catch(error){message(error.message,true);}
  }
  function progress(value){const percent=value.total?value.done/value.total*100:0;$('#owned-progress progress').value=percent;$('#owned-progress span').textContent=`${Math.round(percent)}% · пары ${number(value.done)} / ${number(value.total)}`;}
  function cancel(){token++;worker?.terminate();worker=null;busy=false;buildAfter=false;$('#owned-cancel').hidden=true;$('#owned-progress').hidden=true;if(collection){$('#owned-rank').disabled=collection.spirits.length<2;$('#owned-build').disabled=collection.spirits.length<2;}}
  function finish(data,job){
    if(job!==token)return;const makeTeam=buildAfter;cancel();ranking=data;
    $('#owned-ranking-status').textContent=`${number(data.battles)} боёв · ${data.options.trials} повтора в каждую сторону · ${data.options.healed?'полная Живица':'Живица из снимка'}. Уровни и IV сохранены. Сортировка учитывает половину очка за ничью.`;
    renderTable();if(makeTeam)createPlan();message(`Личный рейтинг готов: ${collection.spirits.length} духов, ${number(data.battles)} боёв.`);
  }
  async function calculate(makeTeam=false){
    cancel();const job=token;let settings;
    try{if(!collection||collection.spirits.length<2)throw new Error('Для рейтинга нужны хотя бы два духа');settings=rules();}catch(error){message(error.message,true);return;}
    ranking=null;plan=null;$('#owned-team').hidden=true;$('#owned-detail').hidden=true;renderTable();busy=true;buildAfter=makeTeam;
    $('#owned-rank').disabled=true;$('#owned-build').disabled=true;$('#owned-cancel').hidden=false;$('#owned-progress').hidden=false;
    progress({done:0,total:collection.spirits.length*(collection.spirits.length-1)/2});$('#owned-ranking-status').textContent='Расчёт выполняется. Можно продолжать пользоваться симулятором.';message('');
    if(location.protocol!=='file:')try{
      worker=new Worker('collection-worker.js');
      worker.onmessage=event=>{if(job!==token)return;if(event.data.progress)progress(event.data.progress);else if(event.data.result)finish(event.data.result,job);else if(event.data.error){cancel();message(event.data.error,true);}};
      worker.onerror=()=>{if(job!==token)return;cancel();message('Не удалось завершить расчёт. Повторите или откройте Mifo Lab заново.',true);};
      worker.postMessage({collection,options:settings});return;
    }catch{worker?.terminate();worker=null;}
    try{
      const iterator=O.tournament(collection,catalog,settings);let start=performance.now();
      while(job===token){const next=iterator.next();if(next.done){finish(next.value,job);return;}if(performance.now()-start>12){progress(next.value);await new Promise(resolve=>setTimeout(resolve,0));start=performance.now();}}
    }catch(error){if(job===token){cancel();message(error.message,true);}}
  }
  function loadCollection(input,{calculateNow=true}={}){
    const next=O.parse(input,catalog);cancel();collection=next;ranking=null;plan=null;page=0;$('#owned-search').value='';$('#owned-detail').hidden=true;$('#owned-team').hidden=true;
    let saved=true;try{localStorage.setItem(storeKey,JSON.stringify(collection));}catch{saved=false;}
    renderSummary();window.dispatchEvent(new Event('mifo-collection-changed'));
    if(collection.spirits.length>=2&&calculateNow)calculate();else $('#owned-ranking-status').textContent=collection.spirits.length>=2?'Подворье обновлено. Рассчитайте рейтинг или подберите команду.':'Для кругового рейтинга нужны хотя бы два духа. Можно перенести загруженного духа на арену.';
    message(`Загружено ${collection.spirits.length} из ${collection.total} духов.${!saved?' Не удалось сохранить копию: после закрытия страницы потребуется обновить данные.':''}`);
    return collection.spirits.length;
  }
  function clearCollection(){cancel();collection=null;ranking=null;plan=null;localStorage.removeItem(storeKey);$('#owned-detail').hidden=true;$('#owned-team').hidden=true;renderSummary();message('');window.dispatchEvent(new Event('mifo-collection-changed'));}
  $('#owned-rank').addEventListener('click',()=>calculate());$('#owned-cancel').addEventListener('click',()=>{cancel();$('#owned-ranking-status').textContent='Расчёт отменён. Можно запустить заново.';});
  $('#owned-build').addEventListener('click',()=>ranking?createPlan():calculate(true));
  $('#owned-free').addEventListener('change',()=>{if(plan)createPlan();});
  $('.owned-settings').addEventListener('change',()=>{cancel();ranking=null;plan=null;$('#owned-team').hidden=true;$('#owned-detail').hidden=true;renderTable();$('#owned-ranking-status').textContent='Условия изменены — пересчитайте рейтинг. Они также применяются при переносе духов на арену.';});
  $('#owned-search').addEventListener('input',()=>{page=0;renderTable();});$('#owned-sort').addEventListener('change',()=>{page=0;renderTable();});
  $('#owned-prev').addEventListener('click',()=>{page--;renderTable();});$('#owned-next').addEventListener('click',()=>{page++;renderTable();});
  $('#owned-size').addEventListener('change',renderTargets);$('#owned-open-arena').addEventListener('click',arena.open);
  window.addEventListener('mifo-teams-changed',renderTargets);
  $('#page-collection').addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    try{
      if(button.dataset.ownedDetail)showDetail(button.dataset.ownedDetail);
      if(button.dataset.ownedRaid){const player=Number($('#owned-raid-player').value),slot=Number($('#owned-raid-slot').value);window.MifoRaidUI.assignOwned(rowById(button.dataset.ownedRaid),player,slot);message(`${rowById(button.dataset.ownedRaid).name} → рейд, игрок ${player+1}, место ${slot+1}.`);$('#owned-raid-slot').value=String(Math.min(5,slot+1));}
      if(button.dataset.ownedAdd)add(button.dataset.ownedId,button.dataset.ownedAdd);
      if(button.dataset.ownedPair){const settings=ranking?.options||rules();arena.assign('a',[O.toConfig(rowById(button.dataset.ownedId),settings.healed)],{size:1,options:settings});arena.assign('b',[O.toConfig(rowById(button.dataset.ownedPair),settings.healed)],{size:1,options:settings});$('#owned-size').value='1';renderTargets();arena.open();}
      if(button.dataset.ownedTeam&&plan?.complete){const side=button.dataset.ownedTeam;arena.assign(side,plan.ids.map(id=>O.toConfig(rowById(id),plan.options.healed)),{size:6,replace:true,options:plan.options});$('#owned-size').value='6';renderTargets();message(`Команда из шести перенесена на сторону ${side.toUpperCase()}. Выберите соперников и откройте арену.`);}
      if(button.id==='owned-close-detail')$('#owned-detail').hidden=true;
    }catch(error){message(error.message,true);}
  });
  window.addEventListener('beforeunload',()=>worker?.terminate());
  window.MifoOwned={get:()=>collection?JSON.parse(JSON.stringify(collection)):null,load:loadCollection,clear:clearCollection};
  $('#owned-open-raids').addEventListener('click',()=>arena.navigate('raids'));
  $('#owned-raid-pick').addEventListener('click',()=>{arena.navigate('raids');window.MifoRaidUI.pick(Number($('#owned-raid-player').value));});
  try{const saved=localStorage.getItem(storeKey);if(saved){collection=O.parse(saved,catalog);$('#owned-ranking-status').textContent='Коллекция восстановлена. Нажмите «Рассчитать рейтинг» или «Сформировать команду из 6».';}}catch{message('Сохранённую коллекцию не удалось прочитать. Получите подворье заново в «Моих духах».',true);}
  renderSummary();renderTargets();
})();
