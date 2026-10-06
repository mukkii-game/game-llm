import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import current from '../games/emmichy.js';
import {PROVIDERS} from '../src/providers.js';
const baseline=(await import(pathToFileURL(path.resolve('../baseline/games/emmichy.js')))).default;
const client=await import(pathToFileURL(path.resolve('../game/src/engine.js')));
const {advancePerformance}=await import(pathToFileURL(path.resolve('../game/src/performance.js')));
const {polishReply}=await import(pathToFileURL(path.resolve('../game/src/repertoire.js')));
const {finishSession}=await import(pathToFileURL(path.resolve('../game/src/session.js')));
const scenarios=JSON.parse(await fs.readFile(new URL('./emmichy-scenarios.json',import.meta.url),'utf8'));
let diagnostics=[];
const originalFetch=globalThis.fetch;
globalThis.fetch=async(...args)=>{
 const response=await originalFetch(...args);
 if(!response.ok){
  let message='';try{message=(await response.clone().json()).error?.message||'';}catch{}
  diagnostics.push({status:response.status,reason:/request too large/i.test(message)?'request-too-large':/tokens per minute/i.test(message)?'tokens-per-minute':/tokens per day/i.test(message)?'tokens-per-day':/requests per minute/i.test(message)?'requests-per-minute':'other',retryAfter:response.headers.get('retry-after'),tokenLimit:response.headers.get('x-ratelimit-limit-tokens'),tokenRemaining:response.headers.get('x-ratelimit-remaining-tokens'),tokenReset:response.headers.get('x-ratelimit-reset-tokens')});
 }
 return response;
};
const output=[];
const question=s=>/[?？]|教えて(?:くれる|ほしい|ね)|聞かせて/.test(s);
await fs.mkdir('artifacts',{recursive:true});
for(const scenario of scenarios.filter(s=>!process.env.AB_CASES||process.env.AB_CASES.split(',').includes(s.type))){
 const arms={baseline:{game:baseline,state:client.freshState(),rows:[]},candidate:{game:current,state:client.freshState(),rows:[]}};
 for(let i=0;i<Math.min(scenario.inputs.length,Number(process.env.AB_TURNS)||12);i++)for(const [arm,a] of (i%2===0?Object.entries(arms).reverse():Object.entries(arms))){
  diagnostics=[];let promptCharacters=0;
  const input=scenario.inputs[i],before=advancePerformance(a.state,input,i+1);
  const result=client.respond(input,a.state);const attempts=[];let answer=null,provider='rule-fallback';
  const started=Date.now();
  if(result.kind!=='bye'){
   const messages=await a.game.buildMessages({input,state:before,session:{turns:i+1}});
   promptCharacters=messages.reduce((n,m)=>n+m.content.length,0);
   for(const name of a.game.providers){
    if(name==='workers-ai'){attempts.push({provider:name,error:'not-tested-no-local-binding'});continue;}
    try{
     const value=await PROVIDERS[name](process.env,messages,a.game);
     answer=a.game.validate(value);
     if(answer){provider=name;attempts.push({provider:name,ok:true});break;}
     attempts.push({provider:name,error:'validation'});
    }catch(e){attempts.push({provider:name,error:/^(?:http-\d+|no-key)$/.test(e.message)?e.message:e.name==='TimeoutError'?'timeout':'request-failed'});}
   }
  }
  let text=polishReply(answer||result.text,input,before).text;
  a.state={...result.state,performance:before.performance,speechStyle:before.speechStyle};
  a.state.history.at(-1).text=text;
  if(result.kind==='bye'){
   const ending=finishSession({...a.state,history:a.state.history.slice(0,-1)},{turns:i+1,startedAt:Date.now()});
   a.state=ending.state;text=ending.text;provider='ending-bank';
  }
  const row={turn:i+1,input,raw:answer,text,provider,attempts,diagnostics,promptCharacters,ms:Date.now()-started,question:question(text),rawQuestion:answer?question(answer):null};
  a.rows.push(row);console.log(JSON.stringify({type:scenario.type,arm,...row}));
  const snapshot=[...output,{type:scenario.type,arms:Object.fromEntries(Object.entries(arms).map(([k,v])=>[k,v.rows]))}];
  await fs.writeFile('artifacts/emmichy-ab.json',JSON.stringify(snapshot,null,2));
  await new Promise(r=>setTimeout(r,Math.min(55000,Number(process.env.AB_WAIT_MS)||4000)));
 }
 output.push({type:scenario.type,arms:Object.fromEntries(Object.entries(arms).map(([k,v])=>[k,v.rows]))});
}
await fs.writeFile('artifacts/emmichy-ab.json',JSON.stringify(output,null,2));
