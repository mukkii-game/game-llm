import test from 'node:test';
import assert from 'node:assert/strict';
import {groq,gemini,workersAi} from '../src/providers.js';
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
