// Explicit manual CI quality probe: synthetic game inputs, max two provider
// calls TOTAL, stop immediately on 429. No deployment or credential output.
import fs from 'node:fs/promises';
import game from '../games/emmichy.js';
import {runChain} from '../src/index.js';
import {PROVIDERS} from '../src/providers.js';
import {selectKnowledge} from '../games/emmichy-fandom.js';
import {specialistPacket,noteSpecialistDelivery} from '../games/emmichy-specialist.js';
const env={GROQ_API_KEY:process.env.GROQ_API_KEY,GEMINI_API_KEY:process.env.GEMINI_API_KEY,
 GROQ_MODEL:'openai/gpt-oss-120b',GEMINI_MODEL:'gemini-flash-latest'};
const maxCalls=2,rawOutputs=[];
// The free Groq account has a small per-minute token bucket. A bounded QA
// probe can wait between its two requests; the game never adds this delay.
const probeGapMs=45000;
let calls=0,rateLimited=false;
for(const name of Object.keys(PROVIDERS)){
 const original=PROVIDERS[name];
 PROVIDERS[name]=async(...args)=>{
  if(rateLimited||calls>=maxCalls)throw Error('probe-budget');
  // No remote Workers binding is available or created by this check.
  if(name==='workers-ai')throw Error('no-binding');
  calls++;
  try{const raw=await original(...args);rawOutputs.push({provider:name,raw:String(raw).slice(0,4000)});return raw;}catch(error){if(error.message==='http-429')rateLimited=true;throw error;}
 };
}
const state={history:[],knowledge:{work:'chiikawa'},turn:0};
const evidence={mode:'real provider generation with candidate server prompt; synthetic inputs; no browser or human evaluation',commit:process.env.GITHUB_SHA||'local',at:new Date().toISOString(),limit:maxCalls,probeGapMs,turns:[]};
for(const input of ['セイレーンのデザインのモデルは？','犬張子と金魚の組み合わせ、えみちぃはどう思う？かわいいのにちょっと怖いよね。']){
 if(rateLimited||calls>=maxCalls)break;
 if(calls)await new Promise(resolve=>setTimeout(resolve,probeGapMs));
 if(/ちいかわ以外/.test(input))state.dialogueControl={concise:true,avoidFandom:true};
 const logs=[],start=Date.now(),rawStart=rawOutputs.length;
 const messages=await game.buildMessages({input,state,session:{turns:state.turn+1}});
 const result=await runChain(env,game,messages,entry=>logs.push(entry),{startedAt:start,stopOnRateLimit:true});
 evidence.turns.push({input,systemCharacters:messages[0].content.length,history:messages.slice(1,-1),wallMs:Date.now()-start,result,attempts:logs,rawOutputs:rawOutputs.slice(rawStart)});
 if(result?.error==='rate-limited'||!result?.text)break;
 state.history.push({role:'user',text:input},{role:'enny',text:result.text});
  state.knowledge=selectKnowledge(input,state).memory;state.turn++;
  state.specialist=noteSpecialistDelivery(specialistPacket(input,state).memory,result.text);
}
evidence.calls=calls;evidence.rateLimited=rateLimited;
await fs.mkdir('artifacts',{recursive:true});
await fs.writeFile('artifacts/emmichy-quality-check.json',JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({calls,rateLimited,replies:evidence.turns.filter(t=>t.result?.text).length}));
