let loaded=false;
self.onmessage=event=>{
  try{
    if(!loaded){importScripts('core.js','raid-data.js','raid-core.js');loaded=true;}
    const iterator=MifoRaids.job(event.data.type,event.data.payload);let last=0;
    while(true){const next=iterator.next();if(next.done){self.postMessage({result:next.value});break;}if(performance.now()-last>70){self.postMessage({progress:next.value});last=performance.now();}}
  }catch(error){self.postMessage({error:loaded?error.message:'Не удалось загрузить данные расчёта. Повторите расчёт.'});}
};
