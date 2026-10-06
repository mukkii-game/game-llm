import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/index.js';

const post = (path, origin, body) => new Request(`https://w.dev${path}`, {
  method: 'POST', headers: { Origin: origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
const ok = 'https://mukkii-game.github.io';

test('判定: サーバー側の質問で Clef を呼び、answers を返す', async () => {
  let called;
  const env = { AI: { run: async (m, input) => { called = { m, input }; return { answers: { intent: { choice: 'joke' } } }; } } };
  const r = await worker.fetch(post('/api/decide/emmichy/talk', ok, { state: { last: 'ヤハ' } }), env);
  assert.equal(r.status, 200);
  assert.equal(called.m, '@cf/cloudflare/clef-flash');
  assert.ok(called.input.questions.intent, '質問はサーバー側のもの');
  assert.deepEqual((await r.json()).answers.intent, { choice: 'joke' });
});

test('判定: 未登録の組は 404、他サイトは 403、失敗は 502', async () => {
  const env = { AI: { run: async () => { throw new Error('quota'); } } };
  assert.equal((await worker.fetch(post('/api/decide/emmichy/nope', ok, { state: 1 }), env)).status, 404);
  assert.equal((await worker.fetch(post('/api/decide/emmichy/talk', 'https://evil.example', { state: 1 }), env)).status, 403);
  assert.equal((await worker.fetch(post('/api/decide/emmichy/talk', ok, { state: 1 }), env)).status, 502);
});
