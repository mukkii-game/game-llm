import test from 'node:test';
import assert from 'node:assert/strict';
import worker,{runChain} from '../src/index.js';
import {PROVIDERS} from '../src/providers.js';
import {retrySeconds} from '../src/provider-health.js';
const game={providerCooldown:true,validate:t=>t};

test('cooldown skips a limited provider on subsequent requests, then allows recovery',async()=>{
 const originalNow=Date.now, originals={...PROVIDERS},env={},calls=[];
 let now=1000;
 try{
  Date.now=()=>now;
  PROVIDERS.groq=async()=>{calls.push('groq');if(now<121000)throw Object.assign(Error('http-429'),{retryAfterSeconds:120});return 'recovered';};
  PROVIDERS.gemini=async()=>{calls.push('gemini');return 'backup';};
  assert.equal((await runChain(env,game,[],()=>{})).provider,'gemini');
  now=120999;assert.equal((await runChain(env,game,[],()=>{})).provider,'gemini');
  now=121000;assert.equal((await runChain(env,game,[],()=>{})).provider,'groq');
  assert.deepEqual(calls,['groq','gemini','gemini','groq']);
 }finally{Date.now=originalNow;Object.assign(PROVIDERS,originals);}
});
test('three limited providers report earliest recovery and make no calls during cooldown',async()=>{
 const originals={...PROVIDERS},originalNow=Date.now,env={};let calls=0;
 try{
  Date.now=()=>1000;
  for(const [name,seconds] of [['groq',120],['gemini',60],['workers-ai',90]])PROVIDERS[name]=async()=>{calls++;throw Object.assign(Error('http-429'),{retryAfterSeconds:seconds});};
  assert.deepEqual(await runChain(env,game,[],()=>{}),{error:'rate-limited',retryAfterSeconds:60});
  assert.deepEqual(await runChain(env,game,[],()=>{}),{error:'rate-limited',retryAfterSeconds:60});assert.equal(calls,3);
 }finally{Date.now=originalNow;Object.assign(PROVIDERS,originals);}
});
test('bounded quality checks stop on the first 429 even when gameplay allows backups',async()=>{
 const originals={...PROVIDERS};let calls=0;
 try{
  for(const name of Object.keys(PROVIDERS))PROVIDERS[name]=async()=>{calls++;throw Error('http-429');};
  assert.deepEqual(await runChain({},game,[],()=>{},{stopOnRateLimit:true}),{error:'rate-limited',provider:'groq'});assert.equal(calls,1);
 }finally{Object.assign(PROVIDERS,originals);}
});
test('a normal failure still uses Workers AI after two rate limits',async()=>{
 const originals={...PROVIDERS},calls=[];
 try{
  for(const name of ['groq','gemini'])PROVIDERS[name]=async()=>{calls.push(name);throw Error('http-429');};
  PROVIDERS['workers-ai']=async()=>{calls.push('workers-ai');return 'third backup';};
  assert.equal((await runChain({},game,[],()=>{})).provider,'workers-ai');assert.deepEqual(calls,['groq','gemini','workers-ai']);
 }finally{Object.assign(PROVIDERS,originals);}
});
test('missing credentials do not mask the wait from the configured limited provider',async()=>{
 const originals={...PROVIDERS};
 try{
  PROVIDERS.groq=async()=>{throw Error('no-key');};PROVIDERS.gemini=async()=>{throw Error('http-429');};PROVIDERS['workers-ai']=async()=>{throw Error('no-binding');};
  const result=await runChain({},game,[],()=>{});assert.equal(result.error,'rate-limited');assert.equal(result.retryAfterSeconds,60);
 }finally{Object.assign(PROVIDERS,originals);}
});
test('IP rate limit exposes a finite browser-readable cooldown without invoking a model',async()=>{
 const request=new Request('https://w.dev/api/chat/emmichy',{method:'POST',headers:{Origin:'https://emmichy.mucky-totoro.workers.dev','content-type':'application/json'},body:JSON.stringify({input:'こんにちは'})});
 const response=await worker.fetch(request,{RL:{limit:async()=>({success:false})}});
 assert.equal(response.status,429);assert.equal(response.headers.get('retry-after'),'60');assert.equal(response.headers.get('access-control-expose-headers'),'Retry-After');
 assert.deepEqual(await response.json(),{error:'rate-limited',retryAfterSeconds:60});
});
test('retry parsing supports seconds and dates, with safe defaults and finite bounds',()=>{
 assert.equal(retrySeconds('1.3'),2);assert.equal(retrySeconds(null),60);assert.equal(retrySeconds('invalid'),60);assert.equal(retrySeconds('99999999'),86400);assert.equal(retrySeconds('-5'),1);
 assert.equal(retrySeconds(new Date(121000).toUTCString(),1000),120);
});
