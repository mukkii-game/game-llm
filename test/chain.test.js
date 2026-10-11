import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { runChain } from '../src/index.js';
import { PROVIDERS } from '../src/providers.js';

const game = { validate: (t) => (t && t.length < 50 ? t : null), buildMessages: () => [] };
const ok = (text) => new Response(JSON.stringify({ choices: [{ message: { content: text } }] }));
const gem = (text) => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text }] } }] }));

test('Groq が成功すればそれを返す', async () => {
  globalThis.fetch = async () => ok('ヤハ');
  const r = await runChain({ GROQ_API_KEY: 'k' }, game, [], () => {});
  assert.deepEqual(r, { text: 'ヤハ', provider: 'groq' });
});

test('Groq が 429 なら Gemini へ', async () => {
  globalThis.fetch = async (u) => (String(u).includes('groq') ? new Response('', { status: 429 }) : gem('ウラ'));
  const r = await runChain({ GROQ_API_KEY: 'k', GEMINI_API_KEY: 'g' }, game, [], () => {});
  assert.deepEqual(r, { text: 'ウラ', provider: 'gemini' });
});

test('検証で落ちた返事も次へ回す(試作の不具合の再発防止)', async () => {
  globalThis.fetch = async (u) => (String(u).includes('groq') ? ok('x'.repeat(100)) : gem('OK'));
  const logs = [];
  const r = await runChain({ GROQ_API_KEY: 'k', GEMINI_API_KEY: 'g' }, game, [], (l) => logs.push(l));
  assert.equal(r.provider, 'gemini');
  assert.equal(logs[0].reason, 'rejected');
});

test('全部だめなら Workers AI、それもだめなら null', async () => {
  globalThis.fetch = async () => new Response('', { status: 500 });
  const env = { GROQ_API_KEY: 'k', GEMINI_API_KEY: 'g', AI: { run: async () => ({ response: 'ンショ' }) } };
  assert.equal((await runChain(env, game, [], () => {})).provider, 'workers-ai');
  env.AI.run = async () => { throw new Error('quota'); };
  assert.equal(await runChain(env, game, [], () => {}), null);
});

test('他サイトからの呼び出しは 403、未登録の作品は 404', async () => {
  const post = (path, origin) => new Request(`https://w.dev${path}`, {
    method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: '{"input":"ハロー"}' });
  assert.equal((await worker.fetch(post('/api/chat/emmichy', 'https://evil.example'), {})).status, 403);
  assert.equal((await worker.fetch(post('/api/chat/nope', 'https://mukkii-game.github.io'), {})).status, 404);
});

test('Emmichy: 短すぎる返事は不合格、自然な日本語と従来のカナは受理', async () => {
  const { GAMES } = await import('../games/index.js');
  assert.equal(GAMES.emmichy.validate('こんにちは'), null);
  assert.equal(GAMES.emmichy.validate('こんにちは！ 今日はどんな日だった？'), 'こんにちは！ 今日はどんな日だった？');
  assert.equal(GAMES.emmichy.validate('ハロー! ヨロシク ネ'), 'ハロー! ヨロシク ネ');
  const msgs = GAMES.emmichy.buildMessages({ input: 'ネコ', state: { history: [{ role: 'enny', text: 'ヤハ' }] } });
  assert.equal(msgs[0].role, 'system');
  assert.equal(msgs.at(-1).content, 'ネコ');
});
test('chat waits for asynchronous game-owned lookup before calling the provider',async()=>{
 const {GAMES}=await import('../games/index.js');const original=GAMES.emmichy.buildMessages;
 try{
  GAMES.emmichy.buildMessages=async()=>[{role:'system',content:'LOOKED_UP_CONTEXT'},{role:'user',content:'キャラ'}];
  globalThis.fetch=async(_url,opt)=>{const body=JSON.parse(opt.body);assert.equal(body.messages[0].content,'LOOKED_UP_CONTEXT');return ok('その作品のキャラのことね！ どの場面が好き？');};
  const request=new Request('https://w.dev/api/chat/emmichy',{method:'POST',headers:{Origin:'https://mukkii-game.github.io','content-type':'application/json','CF-Connecting-IP':'test-async'},body:JSON.stringify({input:'キャラ',state:{}})});
  const response=await worker.fetch(request,{GROQ_API_KEY:'k',PROVIDERS:'groq'});assert.equal(response.status,200);
  assert.deepEqual(await response.json(),{text:'その作品のキャラのことね！ どの場面が好き？',provider:'groq',source:'llm'});
 }finally{GAMES.emmichy.buildMessages=original;}
});
test('chain passes message context to validation before accepting a reply',async()=>{
 const original=globalThis.fetch;
 try{
  const messages=[{role:'user',content:'music only'}];
  const guarded={...game,validate:(text,context)=>{assert.equal(context.messages,messages);return text==='music'?text:null;}};
  globalThis.fetch=async u=>String(u).includes('groq')?ok('fan'):gem('music');
  assert.deepEqual(await runChain({GROQ_API_KEY:'test',GEMINI_API_KEY:'test'},guarded,messages,()=>{}),{text:'music',provider:'gemini'});
 }finally{globalThis.fetch=original;}
});

test('structured replies report provenance and metadata without dialogue text', async () => {
 const original = globalThis.fetch;
 try {
  globalThis.fetch = async () => ok('provider dialogue');
  for (const source of ['llm', 'mixed', 'authored']) {
   const logs = [];
   const structured = {...game, validate: () => ({text:'accepted dialogue', source, reason:'validated'})};
   assert.deepEqual(await runChain({GROQ_API_KEY:'test', PROVIDERS:'groq'}, structured, [], item => logs.push(item)), {text:'accepted dialogue', provider:'groq', source});
   assert.equal(logs[0].source, source);
   assert.equal(logs[0].reason, 'validated');
   assert.equal(logs[0].ok, true);
   assert.equal(JSON.stringify(logs).includes('dialogue'), false);
  }
 } finally { globalThis.fetch = original; }
});

test('structured rejected replies advance to the next provider and preserve rejection metadata', async () => {
 const original = globalThis.fetch;
 try {
  globalThis.fetch = async url => String(url).includes('groq') ? ok('reject') : gem('accept');
  const logs = [];
  const structured = {...game, validate: text => text === 'reject' ? {text:null, source:'mixed', reason:'topic-mismatch'} : {text, source:'llm'}};
  assert.deepEqual(await runChain({GROQ_API_KEY:'test', GEMINI_API_KEY:'test'}, structured, [], item => logs.push(item)), {text:'accept', provider:'gemini', source:'llm'});
  assert.equal(logs[0].ok, false);
  assert.equal(logs[0].source, 'mixed');
  assert.equal(logs[0].reason, 'topic-mismatch');
 } finally { globalThis.fetch = original; }
});

test('legacy validators retain response shape unless source reporting is enabled', async () => {
 const original = globalThis.fetch;
 try {
  globalThis.fetch = async () => ok('legacy');
  const env = {GROQ_API_KEY:'test', PROVIDERS:'groq'};
  assert.deepEqual(await runChain(env, game, [], () => {}), {text:'legacy', provider:'groq'});
  assert.deepEqual(await runChain(env, {...game, reportSource:true}, [], () => {}), {text:'legacy', provider:'groq', source:'llm'});
  assert.equal(await runChain(env, {...game, validate:() => null}, [], () => {}), null);
 } finally { globalThis.fetch = original; }
});

test('opted-in provider rate limits stop the chain immediately', async () => {
 const original = globalThis.fetch;
 try {
  const calls = [];
  globalThis.fetch = async url => { calls.push(String(url)); return new Response('', {status:429}); };
  let workersCalled = false;
  const logs = [];
  const env = {GROQ_API_KEY:'test', GEMINI_API_KEY:'test', AI:{run:async () => { workersCalled = true; return {response:'unused'}; }}};
  assert.deepEqual(await runChain(env, {...game, stopOnRateLimit:true}, [], item => logs.push(item)), {error:'rate-limited', provider:'groq'});
  assert.equal(calls.length, 1);
  assert.equal(workersCalled, false);
  assert.equal(logs[0].reason, 'http-429');
 } finally { globalThis.fetch = original; }
});

test('chat returns provider rate limits as HTTP 429 for opted-in games', async () => {
 const {GAMES} = await import('../games/index.js');
 const original = globalThis.fetch;
 GAMES['rate-limit-test'] = {...game, stopOnRateLimit:true};
 try {
  let calls = 0;
  globalThis.fetch = async () => { calls++; return new Response('', {status:429}); };
  const request = new Request('https://w.dev/api/chat/rate-limit-test', {method:'POST', headers:{Origin:'https://mukkii-game.github.io', 'content-type':'application/json'}, body:JSON.stringify({input:'hello'})});
  const response = await worker.fetch(request, {GROQ_API_KEY:'test', GEMINI_API_KEY:'test'});
  assert.equal(response.status, 429);
  assert.deepEqual(await response.json(), {error:'rate-limited', provider:'groq'});
  assert.equal(response.headers.get('access-control-allow-origin'), 'https://mukkii-game.github.io');
  assert.equal(calls, 1);
 } finally { globalThis.fetch = original; delete GAMES['rate-limit-test']; }
});

test('overall provider budget caps the second timeout and stops later calls at the deadline', async () => {
 const originalNow = Date.now;
 const originals = {...PROVIDERS};
 let now = 1000;
 const attempts = [];
 try {
  Date.now = () => now;
  PROVIDERS.groq = async (_env, _messages, opt) => {attempts.push(['groq', opt.timeoutMs]); now += 60; throw new Error('timeout');};
  PROVIDERS.gemini = async (_env, _messages, opt) => {attempts.push(['gemini', opt.timeoutMs]); now += opt.timeoutMs; throw new Error('timeout');};
  PROVIDERS['workers-ai'] = async () => {assert.fail('exhausted request must not call another provider');};
  const result = await runChain({}, {...game, requestBudgetMs:100, providerTimeoutMs:80}, [], () => {});
  assert.equal(result, null);
  assert.deepEqual(attempts, [['groq', 80], ['gemini', 40]]);
  assert.equal(now, 1100);
 } finally {Date.now = originalNow; Object.assign(PROVIDERS, originals);}
});

test('unset overall budget preserves full timeout for later providers', async () => {
 const originalNow = Date.now;
 const originals = {...PROVIDERS};
 let now = 1000;
 const attempts = [];
 try {
  Date.now = () => now;
  PROVIDERS.groq = async (_env, _messages, opt) => {attempts.push(opt.timeoutMs); now += opt.timeoutMs; throw new Error('timeout');};
  PROVIDERS.gemini = async (_env, _messages, opt) => {attempts.push(opt.timeoutMs); return 'accepted';};
  assert.deepEqual(await runChain({}, {...game, providerTimeoutMs:3500}, [], () => {}), {text:'accepted', provider:'gemini'});
  assert.deepEqual(attempts, [3500, 3500]);
 } finally {Date.now = originalNow; Object.assign(PROVIDERS, originals);}
});

test('zero overall budget skips all provider calls', async () => {
 const originals = {...PROVIDERS};
 try {
  for (const name of Object.keys(PROVIDERS)) PROVIDERS[name] = async () => {assert.fail('provider called with no remaining budget');};
  assert.equal(await runChain({}, {...game, requestBudgetMs:0}, [], () => {}), null);
 } finally {Object.assign(PROVIDERS, originals);}
});

test('Emmichy message construction time is included in the provider budget', async () => {
 const originalNow = Date.now;
 const originals = {...PROVIDERS};
 const {GAMES} = await import('../games/index.js');
 const originalGame = GAMES.emmichy;
 let now = 1000;
 Date.now = () => now;
 GAMES.emmichy = {...originalGame, requestBudgetMs:100, providerTimeoutMs:80,
  buildMessages:async()=>{now += 60; return [];}};
 let timeout;
 try {
  PROVIDERS.groq = async (_env, _messages, opt) => {timeout=opt.timeoutMs;return 'こんにちは！ 今日はどんな日だった？';};
  const request = new Request('https://w.dev/api/chat/emmichy', {method:'POST',
   headers:{Origin:'https://mukkii-game.github.io','content-type':'application/json'},
   body:JSON.stringify({input:'hello'})});
  const response = await worker.fetch(request, {GROQ_API_KEY:'test',PROVIDERS:'groq'});
  assert.equal(response.status,200);
  assert.equal(timeout,40);
 } finally {
  Date.now = originalNow;
  Object.assign(PROVIDERS, originals);
  GAMES.emmichy = originalGame;
 }
});
