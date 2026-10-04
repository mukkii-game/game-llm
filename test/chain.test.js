import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { runChain } from '../src/index.js';

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

test('Emmichy: 漢字・ひらがなの返事は不合格', async () => {
  const { GAMES } = await import('../games/index.js');
  assert.equal(GAMES.emmichy.validate('こんにちは'), null);
  assert.equal(GAMES.emmichy.validate('ハロー! ヨロシク ネ'), 'ハロー! ヨロシク ネ');
  const msgs = GAMES.emmichy.buildMessages({ input: 'ネコ', state: { history: [{ role: 'enny', text: 'ヤハ' }] } });
  assert.equal(msgs[0].role, 'system');
  assert.equal(msgs.at(-1).content, 'ネコ');
});
