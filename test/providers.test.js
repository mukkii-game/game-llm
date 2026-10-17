import test from 'node:test';
import assert from 'node:assert/strict';
import {groq,gemini,workersAi} from '../src/providers.js';

test('HTTP 429 preserves finite Retry-After without leaking the upstream body',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async()=>new Response('private upstream error',{status:429,headers:{'retry-after':'120'}});
  for(const provider of [groq,gemini])await assert.rejects(provider({GROQ_API_KEY:'test',GEMINI_API_KEY:'test'},[],{}),e=>e.message==='http-429'&&e.retryAfterSeconds===120&&!String(e).includes('private'));
 }finally{globalThis.fetch=original;}
});
test('safe usage telemetry retains numeric counters only and does not change the reply',async()=>{
 const original=globalThis.fetch,logs=[];
 try{
  globalThis.fetch=async url=>String(url).includes('groq')?Response.json({choices:[{message:{content:'hello'}}],usage:{prompt_tokens:100,completion_tokens:20,total_tokens:120,private:'secret'}},{headers:{'x-ratelimit-remaining-requests':'999','x-ratelimit-limit-tokens':'8000'}}):Response.json({candidates:[{content:{parts:[{text:'hello'}]}}],usageMetadata:{promptTokenCount:110,candidatesTokenCount:25,totalTokenCount:135}});
  for(const provider of [groq,gemini])assert.equal(await provider({GROQ_API_KEY:'test',GEMINI_API_KEY:'test'},[],{onUsage:o=>logs.push(o)}),'hello');
  assert.deepEqual(logs,[{requestsRemaining:999,tokenLimit:8000,inputTokens:100,outputTokens:20,totalTokens:120},{inputTokens:110,outputTokens:25,totalTokens:135}]);
 }finally{globalThis.fetch=original;}
});
test('HTTP providers honor a per-game abort deadline',async()=>{
 const original=globalThis.fetch;
 try{
  globalThis.fetch=async(_url,{signal})=>{
   await new Promise((resolve,reject)=>{signal.addEventListener('abort',()=>reject(signal.reason),{once:true});setTimeout(resolve,100);});
   throw new Error('deadline not observed');
  };
  for(const provider of [groq,gemini])await assert.rejects(provider({GROQ_API_KEY:'test',GEMINI_API_KEY:'test'},[],{timeoutMs:10}),{name:'TimeoutError'});
 }finally{globalThis.fetch=original;}
});
test('Workers AI no longer waits indefinitely for a stuck binding',async()=>{
 await assert.rejects(workersAi({AI:{run:()=>new Promise(()=>{})}},[],{timeoutMs:10}),/timeout/);
 assert.equal(await workersAi({AI:{run:async()=>({response:'ちゃんと返ったよ。'})}},[],{timeoutMs:50}),'ちゃんと返ったよ。');
});
test('structured replies use supported provider formats and ordinary chat stays text',async()=>{
 const original=globalThis.fetch,bodies=[],schema={type:'object',properties:{beats:{type:'array',items:{type:'string'}}},required:['beats'],additionalProperties:false};
 try{
  globalThis.fetch=async(url,options)=>{bodies.push(JSON.parse(options.body));return Response.json(String(url).includes('groq')?{choices:[{message:{content:'{"beats":[]}'}}]}:{candidates:[{content:{parts:[{text:'{"beats":[]}' }]}}]});};
  const opt={temperature:.45,maxTokens:1024,outputSchema:schema};
  await groq({GROQ_API_KEY:'test'},[],opt);assert.equal(bodies.at(-1).response_format.type,'json_schema');assert.equal(bodies.at(-1).response_format.json_schema.strict,true);assert.deepEqual(bodies.at(-1).response_format.json_schema.schema,schema);
  await groq({GROQ_API_KEY:'test',GROQ_MODEL:'qwen/qwen3.8-27b'},[],opt);assert.equal(bodies.at(-1).response_format.type,'json_schema');
  await groq({GROQ_API_KEY:'test',GROQ_MODEL:'another-model'},[],opt);assert.deepEqual(bodies.at(-1).response_format,{type:'json_object'});
  await gemini({GEMINI_API_KEY:'test'},[],opt);assert.equal(bodies.at(-1).generationConfig.responseMimeType,'application/json');
  await groq({GROQ_API_KEY:'test'},[],{maxTokens:100});assert.equal(bodies.at(-1).response_format,undefined);
  await gemini({GEMINI_API_KEY:'test'},[],{maxTokens:100});assert.equal(bodies.at(-1).generationConfig.responseMimeType,undefined);
 }finally{globalThis.fetch=original;}
});
