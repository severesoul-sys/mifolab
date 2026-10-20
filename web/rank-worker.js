importScripts('core.js','catalog.js');
self.onmessage=event=>{
  try{
    const generator=MifoCore.tournament(MifoCatalog,event.data);let count=0;
    while(true){const next=generator.next();if(next.done){self.postMessage({result:next.value});break;}if(++count%20===0)self.postMessage({progress:next.value});}
  }catch(error){self.postMessage({error:error.message});}
};
