(function(){
  'use strict';
  const native=window.MifoNative,owned=window.MifoOwned,arena=window.MifoArena,$=selector=>document.querySelector(selector);
  if(!native)return;
  document.documentElement.classList.add('android-app');
  const gameIcon=kind=>`<span class="game-icon${kind==='yard'?' game-icon-yard':''}" aria-hidden="true"><img src="icon-${kind}.${kind==='yard'?'svg':'png'}" alt="" draggable="false"></span>`;
  const header=document.createElement('header');header.className='mobile-header';header.innerHTML=`<a href="#battle" aria-label="Mifo Lab — на арену">MIFO <span>LAB</span></a><button id="mobile-account" aria-label="Мои духи и подключение аккаунта">${gameIcon('yard')}<span>Мои духи</span></button>`;document.body.prepend(header);
  $('#mobile-account').addEventListener('click',()=>arena.navigate('collection'));
  const names={battle:['⚔','Арена'],rankings:['▥','Рейтинг'],raids:[gameIcon('raids'),'Рейды'],training:['◇','Руны'],elements:['✳','Справка'],collection:[gameIcon('yard'),'Мои духи']};
  const nav=$('.sidebar nav');for(const [id,[icon,label]] of Object.entries(names)){const button=nav.querySelector(`[data-tab="${id}"]`);button.setAttribute('aria-label',id==='elements'?'Стихии и отряд':id==='training'?'Тренировка рун':id==='rankings'?'Рейтинг духов':label);button.innerHTML=`<span class="nav-icon" aria-hidden="true">${icon}</span><span>${label}</span>`;nav.append(button);}
  function selected(tab){document.documentElement.dataset.section=tab;header.querySelector('a').textContent=$('#page-title').textContent;nav.querySelectorAll('button').forEach(button=>button.setAttribute('aria-current',button.dataset.tab===(tab==='upgrade'?'rankings':tab)?'page':'false'));}
  window.addEventListener('mifo-tab',event=>selected(event.detail));selected(location.hash.slice(1)||'battle');

  function disclosure(title,className){
    const details=document.createElement('details'),summary=document.createElement('summary');
    details.className=className;summary.textContent=title;details.append(summary);return details;
  }
  function foldSection(selector,title){
    const section=$(selector);if(!section)return;
    const fold=disclosure(title,'mobile-fold'),body=document.createElement('div');body.className='mobile-fold-body';
    body.append(...section.childNodes);fold.append(body);section.append(fold);return body;
  }
  const arenaRules=foldSection('.rune-settings','Правила боя и руны');
  arenaRules.prepend($('.battle-toolbar .inline-field'),$('#mode-description'));
  arenaRules.append($('.run-bar .seed-field'));
  const extraActions=document.createElement('div');extraActions.className='mobile-extra-actions';extraActions.append($('#run-series'),$('#run-live'));arenaRules.append(extraActions);
  $('.run-bar').after($('.rune-settings'));
  foldSection('.ranking-settings','Условия рейтинга');
  foldSection('.raid-runes','Руны и темп рейда');
  function groupOwned(selectors,title){
    const sections=selectors.map(selector=>$(selector)),fold=disclosure(title,'card mobile-fold owned-tools');
    sections[0].before(fold);fold.append(...sections);
  }
  groupOwned(['.owned-settings','.owned-builder'],'Рейтинг и подбор команды');
  groupOwned(['.owned-arena','.owned-raid-target'],'Выбрать духов для арены или рейда');
  const raidHelp=disclosure('Как сражаются участники','mobile-help');
  const explanation=$('.raid-party-panel>p:last-child');explanation.before(raidHelp);raidHelp.append(explanation);
  const collectionRules=disclosure('Настроить подбор из подворья','mobile-help'),raidCollection=$('.raid-collection-options');
  raidCollection.before(collectionRules);collectionRules.append(raidCollection);
  $('.training-main h2').textContent='Выберите руну';
  $('.training-main>p').textContent='Обведите узор одним движением. Начните без таймера или тренируйтесь на время.';
  function compactTeam(card){
    const metadata=card.querySelector('.identity-metadata');
    if(metadata)metadata.textContent=metadata.textContent.replace(/ · (одна стихия|две стихии)$/,'');
    const health=card.querySelector('[data-field="health"]');
    if(health)health.parentElement.firstChild.textContent='Жив., %';
    const summary=card.querySelector('.fighter-details>summary');if(summary)summary.textContent='IV, нрав и параметры';
    const slotTools=card.querySelector('.team-body>.slot-tools');if(slotTools)card.querySelector('.fighter-details').append(slotTools);
  }
  for(const card of document.querySelectorAll('.team-card')){compactTeam(card);new MutationObserver(()=>compactTeam(card)).observe(card,{childList:true});}

  const panel=document.createElement('section');panel.className='card mobile-account-panel';panel.innerHTML=`<div class="eyebrow">ПОДВОРЬЕ ИЗ ИГРЫ</div><h2>Ваши духи — сразу здесь</h2><p>Откройте профиль в Mifozov → «Код для входа в приложение». Введите полученный код один раз.</p><form id="mobile-connect-form"><label for="mobile-code">Код из игры</label><div class="mobile-code-row"><input id="mobile-code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="10" placeholder="000 000" aria-label="Код для входа в Mifozov"><button class="button primary" type="submit" id="mobile-connect">Подключить</button></div></form><div class="mobile-connected" hidden><div class="mobile-account-actions"><button class="button primary" id="mobile-refresh">Получить духов из подворья</button><button class="button quiet" id="mobile-disconnect">Отключить</button></div></div><p class="mobile-account-state" id="mobile-account-state" role="status">Аккаунт не подключён. Остальные разделы доступны без входа.</p><small id="mobile-last-sync"></small><p class="small-note">Подворье загружается только по кнопке. При открытии приложения используется сохранённый список; все расчёты работают офлайн.</p>`;
  $('#page-collection').prepend(panel);
  panel.querySelector('h2').textContent='Подворье';
  panel.querySelector('p').classList.add('mobile-login-help');
  const accountHelp=disclosure('Обновление и работа офлайн','mobile-help'),offlineNote=panel.querySelector('p.small-note');
  offlineNote.before(accountHelp);accountHelp.append(offlineNote);
  accountHelp.querySelector('summary').after($('#mobile-last-sync'));
  $('.desktop-collection-info')?.remove();
  $('#owned-empty h2').textContent='Подключите подворье';$('#owned-empty p').textContent='Войдите по коду и нажмите «Получить духов из подворья». Затем можно сравнивать духов, собирать отряды и готовиться к рейдам.';
  $('#mobile-connect-form').addEventListener('submit',event=>{event.preventDefault();const code=$('#mobile-code').value.replace(/\s+/g,'');if(!/^\d{6}$/.test(code)){status('Введите шестизначный код из игры',true);return;}$('#mobile-code').value='';busy(true);native.connect(code);});
  $('#mobile-refresh').addEventListener('click',()=>{busy(true);native.refresh();});
  $('#mobile-disconnect').addEventListener('click',()=>native.logout());
  function status(message,error){$('#mobile-account-state').textContent=message;$('#mobile-account-state').classList.toggle('error',!!error);}
  function busy(value){panel.classList.toggle('busy',!!value);$('#mobile-connect').disabled=$('#mobile-refresh').disabled=!!value;$('#mobile-code').disabled=!!value;}
  window.MifoAndroid={
    receive(event){

      busy(event.busy);panel.classList.toggle('connected',!!event.connected);$('#mobile-connect-form').hidden=event.connected;$('.mobile-connected').hidden=!event.connected;
      if(event.clearCollection)owned.clear();
      if(event.collection){try{owned.load(event.collection,{calculateNow:false});status(`Подворье загружено: ${event.collection.spirits.length} духов`,false);}catch(error){status('Не удалось прочитать подворье: '+error.message,true);}}
      else status(event.message||(event.connected?'Аккаунт подключён':'Аккаунт не подключён. Остальные разделы доступны без входа.'),event.error);
      const snapshot=owned.get();$('#mobile-last-sync').textContent=snapshot?'Последнее обновление: '+new Date(snapshot.updatedAt).toLocaleString('ru-RU'):'';
      $('#mobile-refresh').textContent=snapshot?'Обновить духов':'Получить духов из подворья';
      $('#mobile-account').classList.toggle('connected',!!event.connected);
    },

    back(){if($('#rune-dialog').open){$('#rune-close').click();return true;}if(location.hash==='#upgrade'){window.MifoUpgradeUI.back();return true;}if(location.hash!=='#battle'){arena.navigate('battle');return true;}return false;}
  };
  document.addEventListener('visibilitychange',()=>{if(document.hidden)arena.pause();});
  native.ready();
})();
