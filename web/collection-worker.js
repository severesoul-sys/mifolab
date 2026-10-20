importScripts('core.js','catalog.js','chronicle-data.js','spirit-search.js','collection-core.js');
self.onmessage=event=>{
  try{
    const iterator=MifoCollection.tournament(event.data.collection,MifoCatalog,event.data.options);let count=0;
    while(true){const next=iterator.next();if(next.done){self.postMessage({result:next.value});break;}if(++count%20===0)self.postMessage({progress:next.value});}
  }catch(error){self.postMessage({error:error.message});}
};
