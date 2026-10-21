(function(){
  'use strict';
  const C=window.MifoCore,catalog=window.MifoCatalog,S=window.MifoSearch;
  const species=catalog.species.filter(item=>!catalog.excluded.includes(item.id));
  const byId=new Map(species.map(item=>[item.id,item]));
  const $=selector=>document.querySelector(selector);
  const escape=value=>String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const format=value=>new Intl.NumberFormat('ru-RU').format(value);
  const percent=value=>(value*100).toFixed(1).replace('.',',')+'%';
  const chips=types=>types.map(type=>`<span class="type-chip ${type}">${C.TYPE_NAMES[C.TYPES.indexOf(type)]}</span>`).join('');
  const initials=name=>name.split(/[ —-]+/).filter(Boolean).slice(0,2).map(word=>word[0]).join('');
  const recipes=[['indrik','rarog','bayun','shchuka','finist','kolobok'],['gorynych','zhar_ptitsa','drevlen','poloz','stratim','mora']];
  let state={size:1,left:recipes[0].map(id=>C.defaultConfig(id)),right:recipes[1].map(id=>C.defaultConfig(id)),options:C.settings()};
  try{const stored=localStorage.getItem('mifo-lab.config.v1');if(stored)state=C.importState(stored,catalog);}catch{}
  for(const key of ['left','right'])while(state[key].length<6)state[key].push(C.defaultConfig(recipes[key==='left'?0:1][state[key].length]));
  const selected={a:0,b:0};let ranking=window.MifoRankings||null,rankSort='wins',rankWorker=null,rankToken=0,live=null,liveToken=0,liveTimer=0,runeSession=null,runeFrame=0,practiceShape='square',toastTimer;
  function toast(message,error=false){const target=$('#toast');target.textContent=message;target.hidden=false;target.style.background=error?'#784932':'#213f2f';clearTimeout(toastTimer);toastTimer=setTimeout(()=>target.hidden=true,4200);}
  function notice(message,error=false){const target=$('#notice');target.textContent=message;target.classList.toggle('error',error);target.hidden=!message;}
  function save(){try{localStorage.setItem('mifo-lab.config.v1',C.exportState(state));}catch{}}
  function team(side){return state[side==='a'?'left':'right'];}
  function playing(side){return team(side).slice(0,state.size);}
  function config(side){return team(side)[selected[side]];}
  function setTab(name){
    if(!['battle','rankings','collection','raids','training','elements','upgrade'].includes(name))name='battle';
    if(live&&name!=='battle')stopLive();
    document.querySelectorAll('.page').forEach(page=>page.classList.toggle('active',page.id==='page-'+name));
    document.querySelectorAll('.nav-item').forEach(button=>button.classList.toggle('active',button.dataset.tab===(name==='upgrade'?'rankings':name)));
    const titles={battle:['Арена духов','Соберите отряды. Проверьте исход. Найдите своё преимущество.'],rankings:['Рейтинг духов','Круговой турнир и мощь каждого вида — в одной таблице.'],training:['Мастерская рун','Четыре узора из игры. Один росчерк, который меняет бой.'],elements:['Стихии и отряд','Посмотрите, кого ваши духи бьют сильнее и где им нужна поддержка.']};
    titles.collection=['Мои духи из игры','Сравните пойманных духов. Найдите сильнейших. Соберите свою команду.'];
    titles.raids=['Рейды на боссов','Выберите противника. Подготовьте отряды. Рассчитайте общий вклад.'];
    titles.upgrade=['Усиление духов','Рассчитайте затраты и сравните характеристики до и после усиления.'];
    $('#page-title').textContent=titles[name][0];$('#page-description').textContent=titles[name][1];
    if(location.hash!=='#'+name)history.replaceState(null,'','#'+name);
    if(name==='elements')renderCoverage();
    window.scrollTo(0,0);
    window.dispatchEvent(new CustomEvent('mifo-tab',{detail:name}));
  }
  function renderTeam(side){
    const current=config(side),member=C.fighter(current,catalog,selected[side],state.options.mode==='raid'&&side==='b'),types=member.elements;
    const label=state.options.mode==='raid'?(side==='a'?'НАПАДЕНИЕ':'ОХРАНА ДРЕВА'):'КОМАНДА '+side.toUpperCase();
    const selector=species.map(item=>`<option value="${item.id}" ${item.id===current.speciesId?'selected':''}>${escape(item.name)} · ${C.RARITIES[item.rarity]}</option>`).join('');
    const squad=state.size===6?`<div class="squad-strip" aria-label="Духи команды ${side.toUpperCase()}">${team(side).map((item,index)=>`<button class="squad-slot ${index===selected[side]?'selected':''}" data-slot="${index}" data-side="${side}" title="${escape(byId.get(item.speciesId).name)}" aria-label="Команда ${side.toUpperCase()}, место ${index+1}: ${escape(byId.get(item.speciesId).name)}"><strong>${initials(byId.get(item.speciesId).name)}</strong><span>${escape(byId.get(item.speciesId).name)}</span><small>${index+1} · ур. ${item.level}</small></button>`).join('')}</div><div class="slot-tools"><span>Редактируете место ${selected[side]+1} из 6</span><span><button data-move="-1" data-side="${side}" ${selected[side]===0?'disabled':''}>← Раньше</button> · <button data-move="1" data-side="${side}" ${selected[side]===5?'disabled':''}>Позже →</button></span></div>`:'';
    $('#team-'+side).innerHTML=`<div class="team-card-top"><div class="team-label"><span>${side.toUpperCase()}</span>${label}</div><span class="team-count">${state.size===1?'ОДИНОЧНЫЙ БОЙ':'ВЫХОД ПО ОЧЕРЕДИ'}</span></div><div class="team-body">${squad}<div class="fighter-identity"><div class="sigil">${initials(member.name)}</div><div class="identity-info"><div class="identity-metadata">${[S.label(current.speciesId),C.RARITIES[member.rarity]].filter(Boolean).join(' · ')} · ${member.elements.length===2?'две стихии':'одна стихия'}</div><h2>${escape(member.name)}</h2><div class="chips">${chips(types)}</div></div></div><label class="species-picker">Дух команды ${side.toUpperCase()}<select data-field="speciesId" data-side="${side}" aria-label="Дух команды ${side.toUpperCase()}">${selector}</select></label><div class="form-grid"><label>Уровень<input data-field="level" data-side="${side}" aria-label="Уровень ${side.toUpperCase()}" type="number" min="1" max="40" value="${current.level}"></label><label>Живица, %<input data-field="health" data-side="${side}" type="number" min="0" max="100" value="${current.health}" aria-label="Живица ${side.toUpperCase()}"></label><label>Все IV<input data-field="allIV" data-side="${side}" type="number" min="0" max="15" value="${C.STATS.every(stat=>current.iv[stat]===current.iv.zhivitsa)?current.iv.zhivitsa:''}" placeholder="разные" aria-label="Все IV ${side.toUpperCase()}"></label></div><div class="stat-summary">${C.STATS.map((stat,index)=>`<div><b>${member.stats[stat]}</b><small>${C.STAT_NAMES[index]}</small></div>`).join('')}</div><div class="team-power"><span>Живица ${member.hp} / ${member.hpMax}</span><strong>Мощь ${format(member.power)}</strong></div><details class="fighter-details"><summary>Индивидуальные IV, нрав и статы</summary><div class="iv-grid">${C.STATS.map((stat,index)=>`<label>${C.STAT_NAMES[index]}<input data-field="iv" data-stat="${stat}" data-side="${side}" type="number" min="0" max="15" value="${current.iv[stat]}" aria-label="IV ${C.STAT_NAMES[index]} ${side.toUpperCase()}"></label>`).join('')}</div><div class="nature-grid">${['up','down'].map(direction=>`<label>${direction==='up'?'Нрав ↑ +10%':'Нрав ↓ −10%'}<select data-field="nature" data-direction="${direction}" data-side="${side}" aria-label="Нрав ${direction==='up'?'повышает':'понижает'} ${side.toUpperCase()}"><option value="">Ровный</option>${C.STATS.map((stat,index)=>`<option value="${stat}" ${current.nature[direction]===stat?'selected':''}>${C.STAT_NAMES[index]}</option>`).join('')}</select></label>`).join('')}</div><label class="check-label"><input type="checkbox" data-field="manual" data-side="${side}" ${current.manualStats?'checked':''}> Редактировать итоговые характеристики вручную</label>${current.manualStats?`<div class="iv-grid">${C.STATS.map((stat,index)=>`<label>${C.STAT_NAMES[index]}<input data-field="manualStat" data-stat="${stat}" data-side="${side}" type="number" min="0" max="10000" value="${current.manualStats[stat]}" aria-label="Стат ${C.STAT_NAMES[index]} ${side.toUpperCase()}"></label>`).join('')}</div><p class="small-note">Ручные статы заменяют расчёт из IV и нрава. Уровень продолжает влиять на формулу урона.</p>`:''}${state.options.mode==='raid'&&side==='b'?`<label style="margin-top:12px">Бодрость охранника, %<input type="number" data-field="cheer" data-side="${side}" min="0" max="100" value="${current.cheer}"></label>`:''}<button class="text-button" data-reset="${side}" style="margin-top:12px">Сбросить параметры этого духа</button></details></div>`;
    window.MifoSpeciesPicker($('#team-'+side+' select[data-field="speciesId"]'));
    if(current.instanceId){
      $('#team-'+side+' .fighter-identity').insertAdjacentHTML('afterend',`<div class="owned-origin">Из подворья${current.shiny?' · светлый':''}<small>Характеристики из подворья. Изменение уровня, IV или нрава пересчитывает их.</small></div>`);
    }
    document.querySelectorAll('#team-'+side+' .squad-slot').forEach((button,index)=>{const item=team(side)[index],name=item.displayName||byId.get(item.speciesId).name;if(item.instanceId)button.querySelector('span').textContent=name;button.title=[S.label(item.speciesId),name,'ур. '+item.level].filter(Boolean).join(' · ');button.setAttribute('aria-label',`Команда ${side.toUpperCase()}, место ${index+1}: ${button.title}`);});
  }
  function renderPolicies(){
    $('#rune-policies').innerHTML=['a','b'].flatMap(side=>['attack','defense'].map(kind=>{const value=state.options[side][kind],disabled=state.options.mode==='raid'&&side==='b'&&kind==='defense';return `<label>${side.toUpperCase()} · ${kind==='attack'?'руна атаки':'руна защиты'}<select data-policy="${side}:${kind}" aria-label="Руна ${kind==='attack'?'атаки':'защиты'} ${side.toUpperCase()}" ${disabled?'disabled':''}><option value="random" ${value==null?'selected':''}>Случайно: 0% или 100%</option>${value!=null&&![0,.25,.5,.8,1].includes(value)?`<option value="${value}" selected>${Math.round(value*100)}% · своё значение</option>`:''}${[0,.25,.5,.8,1].map(accuracy=>`<option value="${accuracy}" ${value===accuracy?'selected':''}>${Math.round(accuracy*100)}% · ${kind==='attack'?'×'+(.3+1.2*accuracy).toFixed(2):'блок '+Math.round(accuracy*80)+'%'}</option>`).join('')}</select>${value!=null&&!disabled?`<input type="number" data-policy-value="${side}:${kind}" min="0" max="100" step="1" value="${Math.round(value*100)}" aria-label="Точность ${kind==='attack'?'атаки':'защиты'} ${side.toUpperCase()}, проценты">`:''}${disabled?'<small>Охранник в игре не рисует защиту</small>':''}</label>`;})).join('');
    $('#rune-probability').value=Math.round(state.options.probabilityMax*100);$('#battle-seed').value=state.options.seed;$('#battle-mode').value=state.options.mode;
    $('#mode-description').textContent=state.options.mode==='raid'?'Бой за Древо: игрок использует руны атаки и защиты, охранник — только атаки. У охранника более редкие обычные удары.':'Сравнение в равных условиях: одинаковый темп обеих сторон, обе используют руны атаки и защиты.';
  }
  function renderTeams(){clearResults();renderTeam('a');renderTeam('b');renderPolicies();document.querySelectorAll('[data-size]').forEach(button=>button.classList.toggle('selected',Number(button.dataset.size)===state.size));window.dispatchEvent(new Event('mifo-teams-changed'));}
  function clearResults(){$('#battle-result').hidden=true;$('#series-result').hidden=true;if(!live)$('#live-arena').hidden=true;}
  function updateConfig(target,redraw=true){
    const side=target.dataset.side,field=target.dataset.field;if(!side||!field)return;
    const updated=C.importState(C.exportState(state),catalog);const key=side==='a'?'left':'right',item=updated[key][selected[side]],details=target.closest('details')?.open;
    if(field==='speciesId'){item.speciesId=target.value;item.manualStats=null;for(const key of ['instanceId','displayName','source','snapshotStats','shiny','baseStatsOverride','elementsOverride'])delete item[key];}
    else if(field==='allIV'){const value=Number(target.value);if(target.value==='')throw new Error('Введите IV от 0 до 15');for(const stat of C.STATS)item.iv[stat]=value;}
    else if(field==='iv')item.iv[target.dataset.stat]=Number(target.value);
    else if(field==='nature'){
      const direction=target.dataset.direction,other=direction==='up'?'down':'up';item.nature[direction]=target.value;
      if(!target.value)item.nature={up:'',down:''};else if(!item.nature[other]||item.nature[other]===target.value)item.nature[other]=C.STATS.find(stat=>stat!==target.value);
    }else if(field==='manual')item.manualStats=target.checked?{...C.fighter(item,catalog).stats}:null;
    else if(field==='manualStat')item.manualStats[target.dataset.stat]=Number(target.value);
    else item[field]=Number(target.value);
    if(item.snapshotStats&&['level','allIV','iv','nature'].includes(field)){item.manualStats=null;item.snapshotStats=false;}
    if(['manual','manualStat'].includes(field))item.snapshotStats=false;
    const calculated=C.fighter(item,catalog,selected[side],state.options.mode==='raid'&&side==='b');state=updated;save();clearResults();if(redraw){renderTeam(side);if(details)$('#team-'+side+' details').open=true;}else{document.querySelectorAll('#team-'+side+' .stat-summary b').forEach((element,index)=>element.textContent=calculated.stats[C.STATS[index]]);$('#team-'+side+' .team-power').innerHTML=`<span>Живица ${calculated.hp} / ${calculated.hpMax}</span><strong>Мощь ${format(calculated.power)}</strong>`;}notice('');
  }
  function chart(result){
    const snapshots=result.events.filter(event=>event.hp),max=result.sides.map(team=>team.reduce((sum,member)=>sum+member.hpMax,0));
    const width=900,height=150,total=Math.max(1,result.time);
    const paths=[0,1].map(side=>snapshots.map((event,index)=>`${index?'L':'M'}${(event.time/total*width).toFixed(2)},${(height-event.hp[side].reduce((sum,value)=>sum+value,0)/max[side]*(height-12)).toFixed(2)}`).join(' '));
    return `<div class="legend"><span><i></i>Живица A</span><span><i class="enemy"></i>Живица B</span><span>0 → ${(result.time/1000).toFixed(1)} с</span></div><svg class="battle-chart" viewBox="0 0 900 165" preserveAspectRatio="none" role="img" aria-label="Изменение суммарной Живицы команд по времени"><path d="M0 45H900M0 95H900M0 145H900" stroke="#e1e6d5" fill="none"/><path d="${paths[0]}" fill="none" stroke="#64834c" stroke-width="2.7"/><path d="${paths[1]}" fill="none" stroke="#b97b4b" stroke-width="2.7"/></svg>`;
  }
  function logDescription(event){
    if(event.kind==='start')return 'Начало боя';if(event.kind==='end')return event.winner==null?'Бой завершён без победителя':'Победила сторона '+(event.winner===0?'A':'B');
    if(event.kind==='enter'||event.kind==='swap')return `${event.side===0?'A':'B'}: выходит ${event.name}`;
    if(event.kind==='rune')return `${event.side===0?'A':'B'}: руна «${C.RUNES[event.id].name}»`;
    return `${event.name} → ${event.target}: ${event.kind==='ultra'?'Ультра':'удар'} −${event.damage}${event.kind==='ultra'?` · атака ${Math.round(event.attack*100)}%, защита ${Math.round(event.defense*100)}%`:''}${event.fainted?' · дух выбыл':''}`;
  }
  function renderResult(result){
    $('#battle-result').hidden=false;const alive=result.sides.map(team=>team.filter(member=>member.hp>0).length);
    $('#battle-result').innerHTML=`<div class="result-heading"><div><div class="eyebrow">РЕЗУЛЬТАТ ОДНОГО ПОЕДИНКА</div><h2>${result.winner==null?'Победитель не определён':`Победила ${result.winner===0?'сторона A':'сторона B'}`}</h2><p class="result-subtitle">${state.options.mode==='raid'?'Бой за Древо':'Равные условия'} · код расчёта ${escape(state.options.seed)}. Один исход при случайных рунах — не вероятность победы.</p></div><span class="pill">${state.size} × ${state.size}</span></div><div class="result-metrics"><div class="metric"><b>${(result.time/1000).toFixed(1)} с</b><small>длительность</small></div><div class="metric"><b>${alive[0]} / ${alive[1]}</b><small>осталось A / B</small></div><div class="metric"><b>${result.ultras[0]} / ${result.ultras[1]}</b><small>Ультры A / B</small></div></div>${chart(result)}<details class="battle-log"><summary>Журнал поединка · ${result.events.length} событий</summary><table class="log-table">${result.events.slice(0,500).map(event=>`<tr><td>${(event.time/1000).toFixed(2)} с</td><td>${escape(logDescription(event))}</td></tr>`).join('')}</table>${result.events.length>500?'<p>Показаны первые 500 событий.</p>':''}</details>`;
  }
  function readSeed(){clearResults();state.options.seed=$('#battle-seed').value||'mifo-lab';save();}
  function runBattle(){readSeed();stopLive();try{renderResult(C.simulate(playing('a'),playing('b'),catalog,state.options));$('#series-result').hidden=true;}catch(error){notice(error.message,true);}}
  async function runSeries(){readSeed();stopLive();$('#run-series').disabled=true;await new Promise(resolve=>setTimeout(resolve,20));try{const result=C.series(playing('a'),playing('b'),catalog,state.options,100);$('#series-result').hidden=false;$('#series-result').innerHTML=`<div class="eyebrow">100 НЕЗАВИСИМЫХ ЗЁРЕН</div><h2>Как часто побеждает ваш отряд</h2><div class="series-bars"><span class="left" style="width:${result.wins[0]}%">${result.wins[0]||''}</span><span class="right" style="width:${result.wins[1]}%">${result.wins[1]||''}</span><span class="draw" style="width:${result.draws}%">${result.draws||''}</span></div><div class="legend"><span><i></i>A: ${result.wins[0]} побед</span><span><i class="enemy"></i>B: ${result.wins[1]} побед</span><span>Без исхода: ${result.draws}</span></div><p class="small-note">Средняя длительность ${result.averageSeconds.toFixed(1)} с. Отряды и параметры одинаковы во всей серии. Это оценка по 100 симуляциям, не гарантия исхода.</p>`;}catch(error){notice(error.message,true);}finally{$('#run-series').disabled=false;}}
  function stopLive(){liveToken++;clearTimeout(liveTimer);live=null;$('#stop-live').hidden=true;$('#run-live').hidden=false;document.querySelectorAll('[data-live-lock]').forEach(element=>{element.disabled=element.dataset.liveLock==='true';delete element.dataset.liveLock;});renderPolicies();if(runeSession?.mode==='live'){cancelAnimationFrame(runeFrame);runeSession=null;$('#rune-dialog').close();}}
  function liveRender(){if(!live)return;$('#live-clock').textContent=`${(live.time/1000).toFixed(1)} с`;$('#live-fighters').innerHTML=live.sides.map((members,side)=>{const member=live.member(side)||members[0];return `<div class="live-fighter"><div class="eyebrow">${side===0?'ВАШ ДУХ':'ПРОТИВНИК'} · ${live.active[side]+1}/${members.length}</div><h3>${escape(member.name)}</h3><div class="chips">${chips(member.elements)}</div><div class="hp-track"><i style="width:${member.hp/member.hpMax*100}%"></i></div><small>Живица ${member.hp} / ${member.hpMax}</small><div class="energy-track"><i style="width:${member.energy}%"></i></div><small>Энергия ${member.energy} / 100</small></div>`;}).join('');}
  function startLive(){
    readSeed();stopLive();try{live=new C.Battle(playing('a'),playing('b'),catalog,state.options);notice('');}catch(error){notice(error.message,true);return;}
    $('#battle-result').hidden=true;$('#series-result').hidden=true;$('#live-arena').hidden=false;$('#stop-live').hidden=false;$('#run-live').hidden=true;
    document.querySelectorAll('.team-card input,.team-card select,.team-card button,.battle-toolbar button,.battle-toolbar select,#rune-policies select,#rune-policies input,#rune-probability').forEach(element=>{element.dataset.liveLock=String(element.disabled);element.disabled=true;});
    liveRender();$('#live-message').textContent='Бой начинается. Приготовьтесь рисовать руны.';pumpLive(liveToken);
  }
  function pumpLive(token){
    if(!live||token!==liveToken)return;
    if(live.over){const result=live.result();liveRender();$('#live-message').textContent='Поединок завершён.';stopLive();renderResult(result);return;}
    const before=live.time,event=live.step();
    liveTimer=setTimeout(()=>{
      if(!live||token!==liveToken)return;liveRender();if(event)$('#live-message').textContent=logDescription(event);
      if(live.pending){const pending=live.pending;openRune(pending.id,pending.side===0?'attack':'defend','live',Math.min(pending.duration,pending.side===0?3000:2500),accuracy=>{
        if(!live||token!==liveToken)return;
        const outcome=live.resolveRune({...pending.side===0?{attack:accuracy.score}:{defense:accuracy.score},durationMs:accuracy.elapsed});
        liveRender();$('#live-message').textContent=logDescription(outcome);liveTimer=setTimeout(()=>pumpLive(token),80);
      });}else pumpLive(token);
    },Math.max(40,Math.min(2000,live.time-before)));
  }
  function runeShape(id){return C.RUNES[id].points.map(point=>point.map(value=>value*100).join(',')).join(' ');}
  function renderPractice(){
    $('#practice-shapes').innerHTML=Object.entries(C.RUNES).map(([id,rune])=>`<button data-shape="${id}" class="${id===practiceShape?'selected':''}"><svg viewBox="0 0 100 100" aria-hidden="true"><polyline points="${runeShape(id)}"/></svg>${rune.name}</button>`).join('');
  }
  function openRune(id,kind,mode,duration,callback){
    runeSession={id,kind,mode,duration,callback,points:[],start:performance.now(),drawing:false,pointer:null};
    $('#rune-kind-label').textContent=kind==='attack'?'УЛЬТРА · РУНА АТАКИ':'ВРАЖЕСКАЯ УЛЬТРА · РУНА ЗАЩИТЫ';$('#rune-title').textContent=C.RUNES[id].name;
    $('#rune-instruction').textContent=duration?`Обведите узор одним росчерком за ${duration/1000} с. Во время руны бой приостановлен.`:'Свободная практика без таймера. Обведите узор и отпустите указатель.';
    $('#rune-guide').setAttribute('points',runeShape(id));$('#rune-trace').setAttribute('points','');$('#rune-time-bar').style.width='100%';$('#rune-submit').textContent='Готово';$('#rune-close').setAttribute('aria-label',mode==='live'?'Пропустить руну':'Закрыть тренировку');
    $('#rune-dialog').showModal();cancelAnimationFrame(runeFrame);tickRune();
  }
  function tickRune(){
    if(!runeSession)return;const elapsed=performance.now()-runeSession.start,left=runeSession.duration?Math.max(0,runeSession.duration-elapsed):null;
    $('#rune-time-label').textContent=left==null?'Без ограничения времени':(left/1000).toFixed(1)+' с';$('#rune-time-bar').style.width=left==null?'100%':left/runeSession.duration*100+'%';
    if(left===0){finishRune();return;}runeFrame=requestAnimationFrame(tickRune);
  }
  function finishRune(skip=false){
    const session=runeSession;if(!session)return;runeSession=null;cancelAnimationFrame(runeFrame);$('#rune-dialog').close();
    const score=skip?0:C.scoreRune(session.id,session.points),elapsed=session.duration?Math.min(session.duration,performance.now()-session.start):performance.now()-session.start;
    session.callback({score,elapsed});
  }
  function startPractice(){
    const kind=$('#practice-kind').value,duration=$('#practice-unlimited').checked?0:kind==='attack'?3000:2500;
    openRune(practiceShape,kind,'practice',duration,result=>{
      let previous=0;try{previous=Number(sessionStorage.getItem('mifo-rune-'+practiceShape)||0);sessionStorage.setItem('mifo-rune-'+practiceShape,String(Math.max(previous,result.score)));}catch{}
      $('#practice-result').innerHTML=`<strong>${Math.round(result.score*100)}% точности</strong><p>${kind==='attack'?`Множитель Ультры ×${(.3+1.2*result.score).toFixed(2)}`:`Заблокировано ${Math.round(result.score*80)}% урона`} · ${(result.elapsed/1000).toFixed(2)} с</p><p>Лучший результат этой сессии: ${Math.round(Math.max(previous,result.score)*100)}%.</p>`;
    });
  }
  function point(event){const bounds=$('#rune-svg').getBoundingClientRect();return [(event.clientX-bounds.left)/bounds.width,(event.clientY-bounds.top)/bounds.height];}
  $('#rune-svg').addEventListener('pointerdown',event=>{if(!runeSession||runeSession.pointer!=null)return;event.preventDefault();runeSession.pointer=event.pointerId;runeSession.drawing=true;runeSession.points=[point(event)];event.currentTarget.setPointerCapture(event.pointerId);$('#rune-trace').setAttribute('points','');});
  $('#rune-svg').addEventListener('pointermove',event=>{if(!runeSession?.drawing||event.pointerId!==runeSession.pointer)return;event.preventDefault();for(const sample of event.getCoalescedEvents?.().length?event.getCoalescedEvents():[event])runeSession.points.push(point(sample));$('#rune-trace').setAttribute('points',runeSession.points.map(sample=>sample.map(value=>value*100).join(',')).join(' '));});
  $('#rune-svg').addEventListener('pointerup',event=>{if(!runeSession?.drawing||event.pointerId!==runeSession.pointer)return;runeSession.points.push(point(event));runeSession.drawing=false;runeSession.pointer=null;if(runeSession.points.length>=6)finishRune();});
  $('#rune-svg').addEventListener('pointercancel',()=>{if(runeSession){runeSession.drawing=false;runeSession.pointer=null;}});
  $('#rune-dialog').addEventListener('cancel',event=>{event.preventDefault();finishRune(true);});
  function renderRankings(){
    if(!ranking){$('#ranking-body').innerHTML='<tr><td colspan="6">Нажмите «Пересчитать рейтинг».</td></tr>';return;}
    const leader=ranking.rows.find(row=>row.id===ranking.order[0]);
    $('#ranking-hero').innerHTML=`<div class="sigil">${initials(leader.name)}</div><div><div class="eyebrow">ЛИДЕР РЕЙТИНГА</div><h2>${escape(leader.name)}</h2><small>${S.label(leader.id)}</small><div class="chips">${chips(leader.elements)}</div><div style="margin-top:14px"><strong>${percent(leader.winRate)}</strong><small>${format(leader.matches)} поединков · со сменой сторон</small></div></div>`;
    const options=ranking.options;
    $('#ranking-method').textContent=`Показан расчёт: ур. ${options.level}, все IV ${options.iv}, ровный нрав, полная Живица. ${options.trials} повторов × 2 стороны для каждой пары. ${options.mode==='fair'?'Равный темп обеих сторон.':'Режим Древа; результат усреднён по нападению и охране.'} ${options.a.attack==null?`Случайная точность 0% / 100%, вероятность максимума ${Math.round(options.probabilityMax*100)}%.`:`Фиксированные руны ${Math.round(options.a.attack*100)}%.`} Код расчёта: ${options.seed}.`;
    renderRankTable();
  }
  function renderRankTable(){
    if(!ranking)return;const query=$('#rank-search').value.toLocaleLowerCase('ru'),type=$('#rank-type').value,rarity=$('#rank-rarity').value;
    const sorted=[...ranking.rows].sort((left,right)=>rankSort==='wins'?left.rank-right.rank:right.power-left.power||left.rank-right.rank);
    const numbered=new Map(sorted.map((row,index)=>[row.id,index+1]));const rows=sorted.filter(row=>S.matches(query,row.id,row.name)&&(!type||row.elements.includes(type))&&(!rarity||row.rarity===rarity));
    $('#ranking-summary').textContent=`Показано ${rows.length} из ${ranking.speciesCount} духов · ${format(ranking.battles)} рассчитанных боёв. При сортировке по победам ничья даёт половину очка.`;
    $('#ranking-body').innerHTML=rows.length?rows.map(row=>`<tr><td><span class="rank-number">${String(numbered.get(row.id)).padStart(2,'0')}</span></td><td><div class="species-cell"><div class="mini-sigil">${initials(row.name)}</div><div><strong>${escape(row.name)}</strong><small class="chronicle-number">${S.label(row.id)}</small><div class="chips">${chips(row.elements)}</div></div></div></td><td class="win-cell"><strong>${percent(row.winRate)}</strong><div class="win-progress"><i style="width:${row.winRate*100}%"></i></div><small>${format(row.wins)} / ${format(row.matches)}</small></td><td>${format(row.power)}</td><td class="rank-roles">${percent(row.asARate)} / ${percent(row.asBRate)}</td><td><button class="rank-action" data-rank-id="${row.id}">Противостояния ↗</button></td></tr>`).join(''):'<tr><td colspan="6">По этому фильтру духов не найдено.</td></tr>';
  }
  function showMatchups(id){
    if(!ranking)return;const index=ranking.rows.findIndex(row=>row.id===id),row=ranking.rows[index];
    const matches=ranking.rows.map((enemy,enemyIndex)=>({enemy,rate:ranking.matrix[index][enemyIndex]})).filter(item=>item.rate!=null).sort((left,right)=>right.rate-left.rate);
    $('#rank-detail').hidden=false;$('#rank-detail').innerHTML=`<div class="section-head"><div><div class="eyebrow">ЛИЧНЫЕ ПРОТИВОСТОЯНИЯ</div><h2>${escape(row.name)}</h2><small>${S.label(row.id)}</small></div><span class="pill">Рейтинг № ${row.rank}</span></div><p class="small-note">Доля очков против конкретного вида при условиях текущего рейтинга. Нажмите имя соперника, чтобы перенести эту пару на арену.</p><div class="matchup-columns"><div><h3>Лучшие противостояния</h3>${matches.slice(0,8).map(item=>matchupHtml(id,item)).join('')}</div><div><h3>Самые трудные соперники</h3>${matches.slice(-8).reverse().map(item=>matchupHtml(id,item)).join('')}</div></div><div class="detail-actions"><button class="button primary" data-add-hero="${id}">Выбрать для стороны A →</button><button class="button quiet" id="close-matchups">Свернуть</button></div>`;
    if(S.number(id)!=null)$('#rank-detail .detail-actions').insertAdjacentHTML('afterbegin',`<button class="button secondary" data-upgrade-species="${escape(id)}">План усиления →</button>`);
    $('#rank-detail').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function matchupHtml(id,item){return `<div class="matchup-item"><button data-matchup="${id}:${item.enemy.id}">${escape(item.enemy.name)}</button><b>${percent(item.rate)}</b></div>`;}
  function applyMatchup(left,right){stopLive();state.size=1;selected.a=selected.b=0;state.left[0]=C.defaultConfig(left,ranking?.options.level||40,ranking?.options.iv??15);if(right)state.right[0]=C.defaultConfig(right,ranking?.options.level||40,ranking?.options.iv??15);if(ranking)state.options=C.settings(ranking.options);save();renderTeams();setTab('battle');window.scrollTo({top:0,behavior:'smooth'});}
  function rankInput(){const quality=$('#rank-rune').value==='random'?null:Number($('#rank-rune').value)/100;return {mode:$('#rank-mode').value,level:Number($('#rank-level').value),iv:Number($('#rank-iv').value),trials:Number($('#rank-trials').value),probabilityMax:Number($('#rank-probability').value)/100,seed:state.options.seed,a:{attack:quality,defense:quality},b:{attack:quality,defense:quality}};}
  function rankingProgress(progress){const ratio=progress.done/progress.total*100;$('#ranking-progress progress').value=ratio;$('#ranking-progress span').textContent=`${Math.round(ratio)}% · пары ${format(progress.done)} / ${format(progress.total)}`;}
  function finishRanking(data,token){if(token!==rankToken)return;ranking=data;$('#rank-detail').hidden=true;$('#ranking-progress').hidden=true;$('#recalculate-rankings').disabled=false;$('#cancel-ranking').hidden=true;if(rankWorker){rankWorker.terminate();rankWorker=null;}renderRankings();toast(`Готово: ${format(ranking.battles)} боёв`);}
  function cancelRanking(){rankToken++;if(rankWorker)rankWorker.terminate();rankWorker=null;$('#ranking-progress').hidden=true;$('#recalculate-rankings').disabled=false;$('#cancel-ranking').hidden=true;}
  async function recalculate(){
    cancelRanking();const token=rankToken;let options;
    try{options=rankInput();C.settings(options);C.fighter(C.defaultConfig(species[0].id,options.level,options.iv),catalog);if(!Number.isInteger(options.trials)||options.trials<1||options.trials>128)throw new Error('Неверное число повторов');}catch(error){toast(error.message,true);return;}
    $('#recalculate-rankings').disabled=true;$('#cancel-ranking').hidden=false;$('#ranking-progress').hidden=false;rankingProgress({done:0,total:1});
    if(location.protocol!=='file:')try{
      rankWorker=new Worker('rank-worker.js');rankWorker.onmessage=event=>{if(token!==rankToken)return;if(event.data.progress)rankingProgress(event.data.progress);else if(event.data.result)finishRanking(event.data.result,token);else if(event.data.error){cancelRanking();toast(event.data.error,true);}};
      rankWorker.onerror=()=>{cancelRanking();toast('Не удалось запустить расчёт. Откройте Mifo Lab заново и повторите.',true);};rankWorker.postMessage(options);return;
    }catch{}
    try{const iterator=C.tournament(catalog,options);let chunk=0;while(token===rankToken){const next=iterator.next();if(next.done){finishRanking(next.value,token);return;}if(++chunk%8===0){rankingProgress(next.value);await new Promise(resolve=>setTimeout(resolve,0));}}}catch(error){cancelRanking();toast(error.message,true);}
  }


  function renderCoverage(){
    $('#coverage').innerHTML=['a','b'].map(side=>`<div><h3>Команда ${side.toUpperCase()} · ${state.size} ${state.size===1?'дух':'духов'}</h3><div class="coverage-row head"><span>Стихия врага</span><span>Быстрый ×1,5</span><span>Ультра ×1,5</span><span>Уязвимы</span></div>${C.typeCoverage(playing(side),catalog).map(row=>`<div class="coverage-row"><span>${chips([row.type])}</span><strong>${row.fast}</strong><strong>${row.ultra}</strong><span>${row.weak}</span></div>`).join('')}</div>`).join('');
  }
  function renderTypes(){
    $('#rank-type').innerHTML='<option value="">Все стихии</option>'+C.TYPES.map((type,index)=>`<option value="${type}">${C.TYPE_NAMES[index]}</option>`).join('');
    $('#type-table').innerHTML=`<table class="type-matrix"><thead><tr><th>Бью ↓ / по →</th>${C.TYPES.map(type=>`<th>${chips([type])}</th>`).join('')}</tr></thead><tbody>${C.TYPES.map(attack=>`<tr><th>${chips([attack])}</th>${C.TYPES.map(defense=>{const value=C.element(attack,defense);return `<td class="${value>1?'strong':value<1?'weak':''}">×${String(value).replace('.',',')}</td>`;}).join('')}</tr>`).join('')}</tbody></table>`;
    $('#method-details').innerHTML=`<h3>Режимы боя</h3><p>«Равные условия» сравнивают духов при одинаковом темпе и доступных рунах. «Атака Древа» учитывает различия между нападающим и охраной.</p><h3>Характеристики и руны</h3><ul><li>Уровень, пять IV, нрав, Живица, скорость и стихии влияют на исход.</li><li>Живица определяет запас здоровья, Сила — обычный урон, Стойкость — защиту от него. Прыть влияет на частоту ударов, Дух — на Ультру и защиту от чужой Ультры.</li><li>Обычные удары дают энергию; после девяти ударов доступна Ультра.</li><li>Руна атаки усиливает Ультру. Точная руна защиты отводит до 80% урона.</li><li>Духи выходят по порядку отряда. Оставшиеся Живица и энергия сохраняются между соперниками.</li><li>Случайные руны получают точность 0% или 100% с выбранной вероятностью максимума.</li></ul><h3>Как читать результаты</h3><p>Мощь — общий показатель характеристик. Рейтинг побед дополнительно учитывает противостояния со всеми соперниками. Для проверки команды используйте серию боёв: один результат при случайных рунах не определяет вероятность победы.</p><p>Прогноз относится к выбранным условиям. В игре на результат также влияют действия участников и задержки.</p>`;
  }
  document.addEventListener('click',event=>{
    const button=event.target.closest('button,a');if(!button)return;
    if(button.dataset.tab){event.preventDefault();setTab(button.dataset.tab);}
    if(button.dataset.size){stopLive();state.size=Number(button.dataset.size);selected.a=selected.b=0;save();renderTeams();}
    if(button.dataset.slot){selected[button.dataset.side]=Number(button.dataset.slot);renderTeam(button.dataset.side);}
    if(button.dataset.move){const side=button.dataset.side,from=selected[side],to=from+Number(button.dataset.move);if(to>=0&&to<6){[team(side)[from],team(side)[to]]=[team(side)[to],team(side)[from]];selected[side]=to;save();renderTeam(side);}}
    if(button.dataset.reset){const side=button.dataset.reset;team(side)[selected[side]]=C.defaultConfig(config(side).speciesId);save();renderTeam(side);}
    if(button.dataset.rankSort){rankSort=button.dataset.rankSort;document.querySelectorAll('[data-rank-sort]').forEach(element=>element.classList.toggle('selected',element===button));renderRankTable();}
    if(button.dataset.rankId)showMatchups(button.dataset.rankId);
    if(button.dataset.matchup){const pair=button.dataset.matchup.split(':');applyMatchup(pair[0],pair[1]);}
    if(button.dataset.addHero)applyMatchup(button.dataset.addHero);
    if(button.dataset.shape){practiceShape=button.dataset.shape;renderPractice();}
    if(button.id==='close-matchups')$('#rank-detail').hidden=true;
  });
  document.addEventListener('input',event=>{const target=event.target;if(target.dataset.field&&target.type==='number'&&target.value!==''){try{updateConfig(target,false);}catch{}}if(target.dataset.policyValue&&target.value!==''){try{const [side,kind]=target.dataset.policyValue.split(':'),value=Number(target.value)/100;C.sampleRune(value,()=>0);state.options[side][kind]=value;const select=target.parentElement.querySelector('select');if(!Array.from(select.options).some(option=>option.value===String(value)))select.add(new Option(`${Math.round(value*100)}% · своё значение`,String(value)));select.value=String(value);save();clearResults();}catch{}}});
  document.addEventListener('change',event=>{try{if(event.target.dataset.field)updateConfig(event.target);if(event.target.dataset.policy){const [side,kind]=event.target.dataset.policy.split(':');state.options[side][kind]=event.target.value==='random'?null:Number(event.target.value);save();clearResults();renderPolicies();}if(event.target.dataset.policyValue){const [side,kind]=event.target.dataset.policyValue.split(':');const value=Number(event.target.value)/100;C.sampleRune(value,()=>0);state.options[side][kind]=value;save();clearResults();}}catch(error){notice(error.message,true);if(event.target.dataset.side)renderTeam(event.target.dataset.side);}});
  $('#battle-mode').addEventListener('change',()=>{const mode=$('#battle-mode').value;stopLive();state.options.mode=mode;save();renderTeams();});
  $('#rune-probability').addEventListener('change',()=>{try{state.options=C.settings({...state.options,probabilityMax:Number($('#rune-probability').value)/100});save();}catch(error){toast(error.message,true);renderPolicies();}});
  $('#rune-probability').addEventListener('input',()=>{const value=$('#rune-probability').value;if(value==='')return;try{state.options=C.settings({...state.options,probabilityMax:Number(value)/100});save();clearResults();}catch{}});
  $('#battle-seed').addEventListener('change',readSeed);$('#new-seed').addEventListener('click',()=>{$('#battle-seed').value=String(Date.now());readSeed();});
  $('#run-battle').addEventListener('click',runBattle);$('#run-series').addEventListener('click',runSeries);$('#run-live').addEventListener('click',startLive);$('#stop-live').addEventListener('click',stopLive);
  $('#mirror-teams').addEventListener('click',()=>{stopLive();[state.left,state.right]=[state.right,state.left];[state.options.a,state.options.b]=[state.options.b,state.options.a];save();renderTeams();});
  $('#practice-start').addEventListener('click',startPractice);$('#training-to-battle').addEventListener('click',()=>setTab('battle'));$('#rune-submit').addEventListener('click',()=>finishRune());$('#rune-close').addEventListener('click',()=>finishRune(true));
  $('#rank-search').addEventListener('input',renderRankTable);$('#rank-type').addEventListener('change',renderRankTable);$('#rank-rarity').addEventListener('change',renderRankTable);$('#recalculate-rankings').addEventListener('click',recalculate);$('#cancel-ranking').addEventListener('click',cancelRanking);
  $('.ranking-settings').addEventListener('change',()=>{if(ranking){renderRankings();$('#ranking-method').textContent+=' Параметры изменены — нажмите «Пересчитать рейтинг» для применения.';}});


  $('#method-link').addEventListener('click',event=>{event.preventDefault();setTab('elements');$('#method-card details').open=true;$('#method-card').scrollIntoView({behavior:'smooth'});});
  window.addEventListener('hashchange',()=>setTab(location.hash.slice(1)));window.addEventListener('beforeunload',()=>{cancelRanking();clearTimeout(liveTimer);cancelAnimationFrame(runeFrame);});
  window.MifoArena={
    toast,open:()=>setTab('battle'),navigate:setTab,pause:()=>{stopLive();if(runeSession)finishRune(true);},
    teams:()=>JSON.parse(JSON.stringify({left:state.left,right:state.right,size:state.size})),
    assign(side,configs,{size=1,slot=0,replace=false,options=null}={}){
      if(!['a','b'].includes(side)||![1,6].includes(size)||!Number.isInteger(slot)||slot<0||slot>=size)throw new Error('Неверное место в команде');
      configs.forEach(item=>C.fighter(item,catalog));
      if((replace&&configs.length!==6)||(!replace&&configs.length!==1))throw new Error('Неверное число духов для команды');
      if(new Set(configs.map(item=>item.instanceId)).size!==configs.length)throw new Error('В команде повторяется экземпляр');
      stopLive();const target=team(side),copies=JSON.parse(JSON.stringify(configs));
      if(replace)target.splice(0,6,...copies);
      else{const previous=target.findIndex(item=>item.instanceId&&item.instanceId===copies[0].instanceId);if(previous>=0&&previous!==slot)target[previous]=target[slot];target[slot]=copies[0];}
      state.size=size;selected[side]=slot;selected[side==='a'?'b':'a']=Math.min(selected[side==='a'?'b':'a'],size-1);
      if(options)state.options=C.settings(options);save();renderTeams();
    }
  };
  renderTeams();renderPractice();renderTypes();renderRankings();setTab(location.hash.slice(1)||'battle');
})();
