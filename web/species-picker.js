(function(){
  'use strict';
  const S=window.MifoSearch;

  // Enhance the existing select so selection, saving and battle settings keep
  // using the same change handler. Typing alone never changes the team.
  window.MifoSpeciesPicker=function(select){
    const side=select.dataset.side,id='species-search-'+side,label=select.getAttribute('aria-label');
    const groupLabel=side==='raid'?'Духи для рейда':'Духи команды '+side.toUpperCase();
    const showLabel=side==='raid'?'Показать всех духов для рейда':'Показать всех духов команды '+side.toUpperCase();
    const entries=Array.from(select.options,option=>{
      const [name,...detail]=option.textContent.split(' · ');
      return {value:option.value,name,detail:[S.label(option.value),...detail].filter(Boolean).join(' · ')};
    }).sort((a,b)=>a.name.localeCompare(b.name,'ru'));
    const root=document.createElement('div');
    root.className='species-picker searchable-picker';
    root.innerHTML=`<label for="${id}">${label}<span>Имя или номер летописи</span></label>
      <div class="species-search-control">
        <svg class="species-search-icon" viewBox="0 0 20 20" aria-hidden="true"><circle cx="8" cy="8" r="5.5"/><path d="m12 12 5 5"/></svg>
        <input id="${id}" type="text" role="combobox" aria-autocomplete="list" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-list" aria-describedby="${id}-hint" autocomplete="off" spellcheck="false" placeholder="Имя или № летописи…">
        <button type="button" class="species-toggle" tabindex="-1" aria-label="${showLabel}" title="Показать всех духов">⌄</button>
        <div class="species-popup" hidden><div id="${id}-list" class="species-results" role="listbox" aria-label="${groupLabel}"></div><div class="species-search-status" role="status" aria-live="polite" aria-atomic="true"></div></div>
      </div><small id="${id}-hint" class="species-search-hint">Введите имя или номер летописи · ↑↓ и Enter для выбора</small>`;
    select.closest('label').replaceWith(root);
    select.hidden=true;select.tabIndex=-1;root.append(select);
    const input=root.querySelector('input'),toggle=root.querySelector('.species-toggle'),popup=root.querySelector('.species-popup'),list=root.querySelector('.species-results'),status=root.querySelector('[role=status]');
    const currentName=()=>entries.find(entry=>entry.value===select.value)?.name||'';
    let matches=[],active=-1;
    input.value=currentName();input.disabled=toggle.disabled=select.disabled;

    function activate(index,scroll=false){
      active=index;
      Array.from(list.children).forEach((option,i)=>{option.classList.toggle('active',i===active);option.setAttribute('aria-selected',String(i===active));});
      const option=list.children[active];
      if(option){
        input.setAttribute('aria-activedescendant',option.id);
        if(scroll){
          const top=option.offsetTop,bottom=top+option.offsetHeight;
          if(top<list.scrollTop)list.scrollTop=top;
          else if(bottom>list.scrollTop+list.clientHeight)list.scrollTop=bottom-list.clientHeight;
        }
      }else input.removeAttribute('aria-activedescendant');
    }
    function open(query=''){
      if(input.disabled)return;
      const searched=String(query).trim().length>0;
      matches=entries.filter(entry=>entry.value?S.matches(query,entry.value,entry.name):!searched);
      list.replaceChildren();
      matches.forEach((entry,index)=>{
        const option=document.createElement('button');
        option.type='button';option.tabIndex=-1;option.className='species-option';option.id=id+'-option-'+index;
        option.setAttribute('role','option');option.classList.toggle('current',entry.value===select.value);
        const name=document.createElement('span'),detail=document.createElement('small');
        name.textContent=entry.name;detail.textContent=entry.detail;option.append(name,detail);
        option.addEventListener('click',()=>choose(index));list.append(option);
      });
      status.textContent=matches.length?`Найдено духов: ${matches.filter(entry=>entry.value).length} из ${entries.filter(entry=>entry.value).length}`:'Дух не найден. Проверьте имя или номер летописи.';
      popup.hidden=false;input.setAttribute('aria-expanded','true');
      activate(matches.length?(searched?0:Math.max(0,matches.findIndex(entry=>entry.value===select.value))):-1,true);
    }
    function close(){
      popup.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');input.value=currentName();
    }
    function choose(index){
      if(input.disabled||!matches[index])return;
      const changed=select.value!==matches[index].value;
      select.value=matches[index].value;close();
      if(changed)select.dispatchEvent(new Event('change',{bubbles:true}));
      // The change handler redraws the team card; keep keyboard focus on its
      // replacement without immediately reopening the suggestions.
      const replacement=document.getElementById(id);
      if(replacement){replacement.dataset.restoreFocus='true';replacement.focus({preventScroll:true});replacement.select();delete replacement.dataset.restoreFocus;}
    }
    input.addEventListener('focus',()=>{if(input.dataset.restoreFocus)return;open();input.select();});
    input.addEventListener('click',()=>{if(popup.hidden){open();input.select();}});
    input.addEventListener('input',()=>open(input.value));
    input.addEventListener('keydown',event=>{
      if(event.isComposing)return;
      if(event.key==='ArrowDown'||event.key==='ArrowUp'){
        event.preventDefault();
        if(popup.hidden){open();return;}
        if(matches.length)activate((active+(event.key==='ArrowDown'?1:-1)+matches.length)%matches.length,true);
      }else if(event.key==='Enter'&&!popup.hidden){event.preventDefault();choose(active);}
      else if(event.key==='Escape'&&!popup.hidden){event.preventDefault();close();input.select();}
      else if(event.key==='Tab')close();
    });
    // Keep input focus while clicking an option or the dropdown arrow.
    root.addEventListener('mousedown',event=>{if(event.target.closest('button'))event.preventDefault();});
    root.addEventListener('focusout',event=>{if(!root.contains(event.relatedTarget))close();});
    toggle.addEventListener('click',()=>{
      if(input.disabled)return;
      if(popup.hidden){input.dataset.restoreFocus='true';input.focus();delete input.dataset.restoreFocus;open();input.select();}
      else close();
    });
  };
})();
