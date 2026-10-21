(function(){
  'use strict';
  const C=window.MifoCore,U=window.MifoUpgrade,D=window.MifoUpgradeData,O=window.MifoCollection,S=window.MifoSearch,A=window.MifoArena,catalog=window.MifoCatalog;
  const $=selector=>document.querySelector(selector),esc=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fmt=value=>new Intl.NumberFormat('ru-RU').format(value),signed=value=>(value>0?'+':'')+fmt(value);
  const playable=catalog.species.filter(row=>S.number(row.id)!=null),key='mifo-lab.upgrade.v1';
  let state={source:'catalog',config:C.defaultConfig('rarog',20,15),ownedId:'',target:40,fromYard:true,playerLevel:null,dust:null,sparks:{},returnTab:'rankings'},lastPlan=null;
  try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved){C.fighter(saved.config,catalog);if(S.number(saved.config.speciesId)!=null)state.config={...C.defaultConfig(saved.config.speciesId,saved.config.level),iv:{...saved.config.iv},nature:{...saved.config.nature}};if(['catalog','owned'].includes(saved.source))state.source=saved.source;if(typeof saved.ownedId==='string')state.ownedId=saved.ownedId;if(Number.isInteger(saved.target)&&saved.target>=1&&saved.target<=40)state.target=saved.target;state.fromYard=saved.fromYard!==false;state.playerLevel=validStored(saved.playerLevel,1,50);state.dust=validStored(saved.dust,0,Number.MAX_SAFE_INTEGER);for(const row of catalog.species){const value=validStored(saved.sparks?.[row.id],0,Number.MAX_SAFE_INTEGER);if(value!==null)state.sparks[row.id]=value;}}}catch{}
  let lastCatalog=JSON.parse(JSON.stringify(state.config));
  function validStored(value,min,max){return Number.isSafeInteger(value)&&value>=min&&value<=max?value:null;}
  function collection(){return window.MifoOwned.get();}
  function selectedRow(){return collection()?.spirits.find(row=>row.id===state.ownedId)||null;}
  function config(){const row=selectedRow();return state.source==='owned'?(row?O.toConfig(row):null):state.config;}
  function save(){try{localStorage.setItem(key,JSON.stringify(state));}catch{}}
  function input(value){return value==null?'':String(value);}
  function read(selector){const value=$(selector).value.trim();return value===''?null:Number(value);}
  function resources(){const data=collection(),r=data?.resources,selected=config();if(!selected)return {playerLevel:null,dust:null,sparks:null};if(state.fromYard&&r)return {playerLevel:r.playerXp==null?null:U.playerLevel(r.playerXp),dust:r.dust,sparks:r.sparks?.[selected.speciesId]??null};return {playerLevel:state.playerLevel,dust:state.dust,sparks:state.sparks[selected.speciesId]??null};}
  const page=$('#page-upgrade');
  page.innerHTML=`<div class="upgrade-toolbar"><button class="text-button" id="upgrade-back">← К рейтингу</button><span class="pill">Mifozov ${D.version}</span></div>
    <div class="segmented upgrade-sources" role="group" aria-label="Источник духов для усиления"><button data-upgrade-source="catalog">Летопись</button><button data-upgrade-source="owned">Мои духи</button></div>
    <p class="small-note upgrade-intro">Рассчитайте усиление, затем выполните его в Mifozov.</p>
    <div id="upgrade-empty" class="card" hidden><h2>Подворье ещё не получено</h2><p>Получите духов в разделе «Мои духи» или выберите вид из летописи.</p><button class="button secondary" data-tab="collection">Открыть моих духов</button></div>
    <div class="upgrade-layout" id="upgrade-content"><section class="card upgrade-controls">
      <div id="upgrade-picker"></div><div id="upgrade-identity" class="upgrade-identity"></div>
      <div class="form-grid upgrade-levels"><label>С уровня<input id="upgrade-from" type="number" min="1" max="40" step="1" aria-label="Текущий уровень духа"></label><label>До уровня<input id="upgrade-target" type="number" min="1" max="40" step="1" aria-label="Целевой уровень духа"></label><label id="upgrade-alliv-label">Все IV<input id="upgrade-alliv" type="number" min="0" max="15" step="1" placeholder="разные" aria-label="Все IV духа для усиления"></label></div>
      <div class="upgrade-costs" id="upgrade-costs"></div>
      <div class="upgrade-shortcuts"><button class="button quiet" id="upgrade-next">+1 уровень</button><button class="button secondary" id="upgrade-max">Максимум по запасам</button></div>
      <details class="fighter-details upgrade-traits"><summary>Индивидуальные IV и нрав</summary><div class="iv-grid">${C.STATS.map((stat,i)=>`<label>${C.STAT_NAMES[i]}<input type="number" data-upgrade-iv="${stat}" min="0" max="15" step="1" aria-label="IV ${C.STAT_NAMES[i]} для усиления"></label>`).join('')}</div><div class="nature-grid">${['up','down'].map(direction=>`<label>${direction==='up'?'Нрав ↑ +10%':'Нрав ↓ −10%'}<select data-upgrade-nature="${direction}" aria-label="Нрав ${direction==='up'?'повышает':'понижает'} для усиления"><option value="">Ровный</option>${C.STATS.map((stat,i)=>`<option value="${stat}">${C.STAT_NAMES[i]}</option>`).join('')}</select></label>`).join('')}</div></details>
      <details class="upgrade-budget" id="upgrade-budget"><summary>Мой уровень и запасы</summary><label class="check-label"><input type="checkbox" id="upgrade-use-yard"> Использовать данные подворья</label><p id="upgrade-budget-note" class="small-note"></p><div class="form-grid"><label>Уровень игрока<input id="upgrade-player" type="number" min="1" max="50" step="1" placeholder="Не указан"></label><label>Пыль<input id="upgrade-dust" type="number" min="0" step="1" placeholder="Не указана"></label><label>Искры этого вида<input id="upgrade-sparks" type="number" min="0" step="1" placeholder="Не указаны"></label></div><p class="small-note">Искры относятся к выбранному виду. Пустое поле означает, что запас неизвестен.</p></details>
    </section><section class="card upgrade-result" id="upgrade-result" aria-live="polite"></section></div>`;
  function renderPicker(){
    const data=collection(),rows=state.source==='owned'?data?.spirits||[]:playable;
    if(state.source==='owned'&&!rows.some(row=>row.id===state.ownedId))state.ownedId=rows[0]?.id||'';
    const options=rows.map((row,index)=>state.source==='owned'?`<option value="${esc(row.id)}" data-species="${esc(row.speciesId)}" ${row.id===state.ownedId?'selected':''}>${esc(row.name)} · ур. ${row.level} · IV ${row.ivPercent}% · экз. ${index+1}</option>`:`<option value="${esc(row.id)}" ${row.id===state.config.speciesId?'selected':''}>${esc(row.name)} · ${C.RARITIES[row.rarity]}</option>`).join('');
    $('#upgrade-picker').innerHTML=`<label class="species-picker">${state.source==='owned'?'Дух из подворья':'Дух из летописи'}<select data-side="upgrade" data-group-label="Духи для планирования усиления" data-show-label="Показать духов для усиления" aria-label="${state.source==='owned'?'Дух из подворья':'Дух из летописи'}">${options}</select></label>`;
    if(rows.length)window.MifoSpeciesPicker($('#upgrade-picker select'));
    $('#upgrade-content').hidden=!rows.length;$('#upgrade-empty').hidden=!!rows.length;
  }
  function fillBudget(){
    const data=collection(),available=!!data?.resources,use=state.fromYard&&available,b=resources();
    $('#upgrade-use-yard').checked=use;$('#upgrade-use-yard').disabled=!available;
    for(const [id,name]of [['player','playerLevel'],['dust','dust'],['sparks','sparks']]){$('#upgrade-'+id).value=input(b[name]);$('#upgrade-'+id).readOnly=use;}
    $('#upgrade-budget-note').textContent=use?'Запасы на '+new Date(data.updatedAt).toLocaleString('ru-RU')+'. Для свежих данных нажмите «Обновить духов» в подворье.':data&&!data.resources?'В сохранённом списке нет запасов. Обновите подворье по кнопке или укажите значения вручную.':'Укажите значения для проверки доступного уровня. Расчёт стоимости работает и без них.';
  }
  function render(){
    if(state.source==='catalog')try{C.fighter(state.config,catalog);}catch{state.config=JSON.parse(JSON.stringify(lastCatalog));}
    document.querySelectorAll('[data-upgrade-source]').forEach(button=>{const on=button.dataset.upgradeSource===state.source;button.classList.toggle('selected',on);button.setAttribute('aria-pressed',String(on));});
    $('#upgrade-back').textContent=state.returnTab==='collection'?'← К моим духам':'← К рейтингу';renderPicker();
    const current=config();if(!current){lastPlan=null;return;}const row=selectedRow(),member=C.fighter(current,catalog),own=state.source==='owned';
    state.target=Math.max(current.level,Math.min(40,state.target));
    $('#upgrade-from').value=current.level;$('#upgrade-from').readOnly=own;$('#upgrade-target').value=state.target;$('#upgrade-target').min=current.level;
    $('#upgrade-alliv-label').hidden=own;$('.upgrade-traits').hidden=own;
    $('#upgrade-alliv').value=C.STATS.every(stat=>current.iv[stat]===current.iv.zhivitsa)?current.iv.zhivitsa:'';
    for(const stat of C.STATS)page.querySelector(`[data-upgrade-iv="${stat}"]`).value=current.iv[stat];
    for(const direction of ['up','down'])page.querySelector(`[data-upgrade-nature="${direction}"]`).value=current.nature?.[direction]||'';
    const nature=current.nature?.up?'↑ '+C.STAT_NAMES[C.STATS.indexOf(current.nature.up)]+' · ↓ '+C.STAT_NAMES[C.STATS.indexOf(current.nature.down)]:'Ровный нрав';
    $('#upgrade-identity').innerHTML=`<div class="chips">${member.elements.map(type=>`<span class="type-chip ${type}">${C.TYPE_NAMES[C.TYPES.indexOf(type)]}</span>`).join('')}${own&&row.shiny?'<span class="owned-badge">✦ Светлый</span>':''}${own&&row.guarding?'<span class="owned-badge">В охране</span>':''}</div><small>${S.label(current.speciesId)} · ${C.RARITIES[member.rarity]}${own?' · IV '+row.ivPercent+'% · '+esc(nature):''}</small>`;
    fillBudget();renderResult();
  }
  function renderResult(){
    try{
      const current=config();if(!current)return;const row=state.source==='owned'?selectedRow():null;
      const result=U.plan(current,catalog,state.target,resources(),!!row?.guarding);lastPlan=result;if(state.source==='catalog')lastCatalog=JSON.parse(JSON.stringify(state.config));save();
      $('#upgrade-next').disabled=current.level>=40;$('#upgrade-max').disabled=result.affordableLevel===null||result.affordableLevel<=current.level;
      const messages=[];
      if(result.target===result.from)messages.push(result.from===40?'Дух уже на максимальном уровне.':'Выберите более высокий целевой уровень, чтобы увидеть стоимость.');
      if(result.guarding)messages.push('Этот дух в охране. Усиление в игре станет доступно после его возвращения.');
      if(result.playerCap===null)messages.push('Укажите уровень игрока, чтобы проверить предел усиления.');
      else if(result.target>result.playerCap&&result.target>result.from)messages.push(`Для уровня ${result.target} нужен игрок уровня ${result.requiredPlayerLevel}. Сейчас предел — ${result.playerCap}.`);
      else messages.push(`Предел по уровню игрока: ${result.playerCap}.`);
      if(result.shortage.dust>0)messages.push(`Не хватает Пыли: ${fmt(result.shortage.dust)}.`);
      if(result.shortage.sparks>0)messages.push(`Не хватает Искр этого вида: ${fmt(result.shortage.sparks)}.`);
      if(result.canReach===true&&result.target>result.from)messages.push('Уровень игрока и указанные запасы позволяют выполнить этот план.');
      if(result.shortage.dust===null||result.shortage.sparks===null)messages.push('Запасы указаны не полностью: доступность по ресурсам пока не проверена.');
      if(result.affordableLevel!==null&&!result.guarding)messages.push(`Максимум по указанным запасам и уровню игрока: ${result.affordableLevel}.`);
      const delta=(before,after)=>`<td>${fmt(before)}</td><td><strong>${fmt(after)}</strong></td><td class="upgrade-gain">${signed(after-before)}</td>`;
      $('#upgrade-costs').innerHTML=`<div><small>Пыль</small><strong id="upgrade-cost-dust">${fmt(result.total.dust)}</strong></div><div><small>Искры вида</small><strong id="upgrade-cost-sparks">${fmt(result.total.sparks)}</strong></div><div><small>Прирост мощи</small><strong>${signed(result.powerGain)}</strong><small>${result.powerPercent.toFixed(1).replace('.',',')}%</small></div>`;
      $('#upgrade-result').innerHTML=`<div class="section-head"><h2>Уровень ${result.from} → ${result.target}</h2><span class="pill">${result.total.levels?'+'+result.total.levels+' ур.':'Без усиления'}</span></div>
        <table class="upgrade-stats"><thead><tr><th>Параметр</th><th>Сейчас</th><th>После</th><th>Рост</th></tr></thead><tbody>${C.STATS.map((stat,i)=>`<tr><th>${C.STAT_NAMES[i]}</th>${delta(result.before.stats[stat],result.after.stats[stat])}</tr>`).join('')}<tr><th>Макс. Живица</th>${delta(result.before.hpMax,result.after.hpMax)}</tr><tr><th>Мощь</th>${delta(result.before.power,result.after.power)}</tr></tbody></table>
        <p class="small-note">Максимальная Живица указана для полностью здорового духа. IV и нрав при усилении сохраняются.</p><div id="upgrade-status" class="upgrade-status${result.canReach===false?' limited':''}" role="status">${messages.map(text=>`<p>${esc(text)}</p>`).join('')}</div>
        ${result.steps.length?`<details class="upgrade-steps"><summary>Стоимость и мощь на каждом уровне</summary><div class="table-wrap"><table class="upgrade-stats"><thead><tr><th>Ур.</th><th>Пыль за шаг / всего</th><th>Искры за шаг / всего</th><th>Мощь</th></tr></thead><tbody>${result.steps.map(step=>`<tr${step.level===result.target?' class="selected"':''}><th>${step.level}${step.level===result.target?' ←':''}</th><td>${fmt(step.dust)} / ${fmt(step.totalDust)}</td><td>${step.sparks} / ${step.totalSparks}</td><td>${fmt(step.power)}</td></tr>`).join('')}</tbody></table></div><p class="small-note">«Всего» — затраты от текущего уровня ${result.from}. Таблица показывает потенциал до 40-го уровня, даже если пока не хватает уровня игрока или ресурсов.</p></details>`:''}`;
    }catch(error){lastPlan=null;$('#upgrade-max').disabled=true;$('#upgrade-costs').innerHTML=`<p class="notice error" role="status">${esc(error.message)}</p>`;$('#upgrade-result').innerHTML=`<p class="notice error">Проверьте параметры усиления.</p>`;}
  }
  function updateInput(target){
    if(target.id==='upgrade-target')state.target=Number(target.value);
    if(target.id==='upgrade-from'&&state.source==='catalog'){state.config.level=Number(target.value);if(Number.isInteger(state.config.level)&&state.config.level>=1&&state.config.level<=40&&state.target<state.config.level){state.target=state.config.level;$('#upgrade-target').value=state.target;}$('#upgrade-target').min=state.config.level;}
    if(target.id==='upgrade-alliv'&&state.source==='catalog'){for(const stat of C.STATS){state.config.iv[stat]=target.value===''?NaN:Number(target.value);page.querySelector(`[data-upgrade-iv="${stat}"]`).value=target.value;}}
    if(target.dataset.upgradeIv&&state.source==='catalog'){state.config.iv[target.dataset.upgradeIv]=target.value===''?NaN:Number(target.value);$('#upgrade-alliv').value=C.STATS.every(stat=>state.config.iv[stat]===state.config.iv.zhivitsa)?input(state.config.iv.zhivitsa):'';}
    if(['upgrade-player','upgrade-dust','upgrade-sparks'].includes(target.id)&&!$('#upgrade-use-yard').checked){state.fromYard=false;state.playerLevel=read('#upgrade-player');state.dust=read('#upgrade-dust');const current=config();if(current)state.sparks[current.speciesId]=read('#upgrade-sparks');}
    renderResult();
  }
  page.addEventListener('input',event=>{if(event.target.type==='number')updateInput(event.target);});
  page.addEventListener('change',event=>{
    const target=event.target;
    if(target.closest('#upgrade-picker')&&target.tagName==='SELECT'){if(state.source==='owned')state.ownedId=target.value;else state.config.speciesId=target.value;render();}
    if(target.id==='upgrade-use-yard'){state.fromYard=target.checked;fillBudget();renderResult();}
    if(target.dataset.upgradeNature&&state.source==='catalog'){const direction=target.dataset.upgradeNature,other=direction==='up'?'down':'up';if(!target.value)state.config.nature={up:'',down:''};else{state.config.nature[direction]=target.value;if(!state.config.nature[other]||state.config.nature[other]===target.value)state.config.nature[other]=C.STATS.find(stat=>stat!==target.value);}for(const d of ['up','down'])page.querySelector(`[data-upgrade-nature="${d}"]`).value=state.config.nature[d];renderResult();}
  });
  page.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;
    if(button.dataset.upgradeSource){state.source=button.dataset.upgradeSource;render();}
    if(button.id==='upgrade-next'){state.target=Math.min(40,config().level+1);$('#upgrade-target').value=state.target;renderResult();}
    if(button.id==='upgrade-max'&&lastPlan?.affordableLevel!=null){state.target=lastPlan.affordableLevel;$('#upgrade-target').value=state.target;renderResult();}
    if(button.id==='upgrade-back')back();
  });
  function openCatalog(speciesId){if(speciesId&&playable.some(row=>row.id===speciesId))state.config.speciesId=speciesId;state.source='catalog';state.returnTab='rankings';A.navigate('upgrade');}
  function openOwned(id){if(id)state.ownedId=id;state.source='owned';state.returnTab='collection';A.navigate('upgrade');}
  function back(){A.navigate(state.returnTab==='collection'?'collection':'rankings');}
  $('#page-rankings').insertAdjacentHTML('afterbegin','<div class="upgrade-entry"><button class="button secondary" id="open-upgrade-catalog">Планировщик усиления →</button><span class="small-note">Стоимость и характеристики каждого духа</span></div>');
  $('#owned-content').insertAdjacentHTML('afterbegin','<div class="upgrade-entry"><button class="button secondary" id="open-upgrade-owned">Планировщик усиления →</button></div>');
  const passText=`Каждому участнику нужен 1 Пропуск для входа к боссу. Первый за сутки поклон любому Древу-хранителю даёт ${D.passes.dailyFromOak} Пропуск. У Офени он стоит ${D.passes.price} монет, купить можно до ${D.passes.perDay} за сутки.`;
  $('#method-card').insertAdjacentHTML('beforebegin',`<section class="card method-card" id="raid-pass-help"><h2>Пропуска на рейды</h2><p>${passText}</p><p>Один Пропуск позволяет повторять бой с тем же боссом до победы или его ухода. После победы повторно сражаться с этим боссом нельзя — нужно дождаться нового.</p><p>Выход из лобби не возвращает потраченный Пропуск. Бесплатный Пропуск даёт именно Древо-хранитель.</p><p>В Mifo Lab можно рассчитывать любое количество боёв. Пропуск потребуется при входе в настоящий рейд в Mifozov.</p><p><strong>Усиление духов.</strong> Планировщик открывается из «Рейтинга духов» или «Моих духов». Выберите целевой уровень, сравните характеристики и затраты. Предел усиления — уровень игрока + 2, максимум 40. Духа в охране можно усилить после возвращения.</p></section>`);
  $('.raid-boss-panel').insertAdjacentHTML('afterend',`<details class="card raid-pass-info"><summary>Пропуска на рейды</summary><p>${passText}</p><p>Повторные попытки с тем же боссом доступны до победы или его ухода. При выходе из лобби Пропуск не возвращается.</p><button class="text-button" id="raid-pass-guide">Подробнее в справке →</button></details>`);
  document.addEventListener('click',event=>{if(event.target.closest('#raid-pass-guide')){A.navigate('elements');$('#raid-pass-help').scrollIntoView({behavior:'smooth',block:'start'});}});
  document.addEventListener('click',event=>{const button=event.target.closest('button');if(!button)return;if(button.id==='open-upgrade-catalog'||button.dataset.upgradeSpecies)openCatalog(button.dataset.upgradeSpecies);if(button.id==='open-upgrade-owned'||button.dataset.ownedUpgrade)openOwned(button.dataset.ownedUpgrade);});
  window.addEventListener('mifo-tab',event=>{if(event.detail==='upgrade')render();});
  window.addEventListener('mifo-collection-changed',()=>{if(location.hash==='#upgrade')render();});
  window.MifoUpgradeUI={openCatalog,openOwned,back};render();
})();
