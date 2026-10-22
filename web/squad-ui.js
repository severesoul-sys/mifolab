(function(){
  'use strict';
  const S=MifoSquads,C=MifoCatalog,A=MifoArena,$=x=>document.querySelector(x),esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let entries=[],target='a',loadError=false;
  try{entries=S.parse(localStorage.getItem(S.key),C);}catch{loadError=true;}
  const dialog=document.createElement('dialog');dialog.id='squad-dialog';dialog.className='squad-library';
  dialog.innerHTML='<div class="section-head"><h2 id="squad-heading">Мои отряды</h2><button class="text-button" id="squad-close" aria-label="Закрыть отряды">Закрыть ×</button></div><p class="small-note">Составы и характеристики сохраняются на этом устройстве. Снимок отряда не обновляется вместе с подворьем.</p><form id="squad-save-form"><label>Название нового отряда<input id="squad-name" maxlength="60" required placeholder="Например, против Рарога"></label><button class="button primary" type="submit">Сохранить текущий</button></form><p id="squad-message" role="status"></p><div id="squad-list"></div>';
  document.body.append(dialog);
  function message(text){$('#squad-message').textContent=text;}
  function render(){
    $('#squad-heading').textContent='Отряды · '+(target==='raid'?'рейд':target==='a'?'команда А':'команда Б');
    $('#squad-list').innerHTML=entries.map(row=>`<article><strong>${esc(row.name)}</strong><p>${row.slots.map((item,i)=>`${i+1}. ${item?esc(item.displayName||C.species.find(s=>s.id===item.speciesId).name)+' · ур. '+item.level:'—'}`).join('<br>')}</p><div class="squad-actions"><button class="button primary" data-squad-load="${esc(row.id)}">Выбрать</button><button class="button quiet" data-squad-update="${esc(row.id)}">Заменить текущим</button><button class="text-button" data-squad-delete="${esc(row.id)}">Удалить</button></div></article>`).join('')||'<p>Сохранённых отрядов пока нет.</p>';
  }
  function current(){if(target==='raid')return MifoRaidUI.currentTeam();const state=A.teams();return state[target==='a'?'left':'right'].slice(0,state.size);}
  function store(next){if(loadError)throw Error('Сохранённые отряды повреждены. Они оставлены без изменений.');S.write(localStorage,next);entries=next;render();}
  function open(which){target=which;render();message(loadError?'Не удалось прочитать сохранённые отряды. Сохранение отключено, чтобы не затереть их.':'');$('#squad-name').value='';dialog.showModal();}
  const arenaTools=document.createElement('div');arenaTools.className='squad-library-buttons';arenaTools.innerHTML='<button class="button quiet" data-open-squads="a">Отряды А</button><button class="button quiet" data-open-squads="b">Отряды Б</button>';
  $('.battle-toolbar').after(arenaTools);
  $('#raid-open-owned').insertAdjacentHTML('beforebegin','<button class="button quiet" data-open-squads="raid">Мои отряды</button>');
  $('#page-elements').insertAdjacentHTML('beforeend','<section class="card method-card"><h2>Дружба и Подворье</h2><p>За гостинец — 1 очко дружбы, за общую победу над боссом — 2. Знакомый: 0 очков и без бонуса; Приятель: от 7 очков, +1%; Друг: от 30, +3%; Побратим: от 90, +5%. Общий бонус к урону босса — до 15%.</p><p>В рейдах можно задать оценочный процент вручную. Фактический бонус определяется друзьями в лобби; в одиночном рейде его нет.</p><p>В Подворье и Котомке сначала 250 мест. Расширения по 50 мест покупаются в игре за монеты, до 500 мест; первое расширение стоит 300 монет.</p><p>Мои отряды сохраняют состав и характеристики на этом устройстве. После усиления духа обновите подворье по кнопке и при необходимости замените сохранённый состав. В Android кнопка ⛶ вверху включает полный экран; повторное нажатие возвращает обычный режим.</p></section>');
  document.addEventListener('click',event=>{const button=event.target.closest('[data-open-squads]');if(button)open(button.dataset.openSquads);});
  $('#squad-close').addEventListener('click',()=>dialog.close());
  $('#squad-save-form').addEventListener('submit',event=>{event.preventDefault();try{store(S.put(entries,$('#squad-name').value,current(),C));message('Отряд сохранён.');$('#squad-name').value='';}catch(error){message(error.message);}});
  dialog.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button)return;
    try{
      const id=button.dataset.squadLoad||button.dataset.squadUpdate||button.dataset.squadDelete,row=entries.find(x=>x.id===id);if(!row)return;
      if(button.dataset.squadDelete){store(entries.filter(x=>x.id!==id));message('Отряд удалён.');}
      if(button.dataset.squadUpdate){store(S.put(entries,row.name,current(),C,row.id));message('Состав и характеристики обновлены.');}
      if(button.dataset.squadLoad){
        if(target==='raid')MifoRaidUI.loadTeam(row.slots);
        else{const members=row.slots.filter(Boolean);if(members.length!==1&&members.length!==6)throw Error('Для арены сохраните отряд из одного или шести духов. Этот состав можно выбрать в рейде.');A.assign(target,members,{size:members.length===1?1:6,replace:members.length===6});}
        dialog.close();A.toast('Выбран отряд «'+row.name+'».');
      }
    }catch(error){message(error.message);}
  });
})();
