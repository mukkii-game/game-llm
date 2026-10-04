// game-llm: 全作品で使い回す AI 会話の中継(Cloudflare Worker)。
// POST /api/chat/<game>  { input, state, session }  →  { text, provider }
// キャラ設定は games/<game>.js(サーバー側)だけに置く。クライアントからプロンプトは受け取らない。
import { GAMES } from '../games/index.js';
import { PROVIDERS, DEFAULT_ORDER } from './providers.js';

const BASE_ORIGINS = ['https://mukkii-game.github.io', 'http://localhost', 'http://127.0.0.1'];

function allowedOrigin(req, game) {
  const origin = req.headers.get('Origin') || '';
  const list = [...BASE_ORIGINS, ...(game?.origins ?? [])];
  const ok = list.some((o) => origin === o || (o.startsWith('http://') && origin.startsWith(o + ':')));
  return ok ? origin : '';
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
      ...(origin ? { 'access-control-allow-origin': origin, vary: 'Origin' } : {}),
    },
  });
}

// 成功するまで順番に試す。検証で落ちた返事も「失敗」として次へ進む。
export async function runChain(env, game, messages, log) {
  const order = (env.PROVIDERS ? env.PROVIDERS.split(',') : game.providers ?? DEFAULT_ORDER).map((s) => s.trim());
  const opt = { temperature: game.temperature ?? 0.9, maxTokens: game.maxTokens ?? 200 };
  for (const name of order) {
    const call = PROVIDERS[name];
    if (!call) continue;
    const t0 = Date.now();
    try {
      const text = game.validate(await call(env, messages, opt));
      log({ provider: name, ok: Boolean(text), reason: text ? '' : 'rejected', ms: Date.now() - t0 });
      if (text) return { text, provider: name };
    } catch (e) {
      log({ provider: name, ok: false, reason: String(e.message || e).slice(0, 40), ms: Date.now() - t0 });
    }
  }
  return null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') {
      return json({ ok: true, games: Object.keys(GAMES), providers: DEFAULT_ORDER.filter((p) =>
        p === 'groq' ? env.GROQ_API_KEY : p === 'gemini' ? env.GEMINI_API_KEY : env.AI) }, 200, allowedOrigin(req, null));
    }
    const m = url.pathname.match(/^\/api\/chat\/([a-z0-9-]+)$/);
    const game = m ? GAMES[m[1]] : null;
    const origin = allowedOrigin(req, game);

    if (req.method === 'OPTIONS') {
      if (!origin) return new Response(null, { status: 403 });
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' } });
    }
    if (!game || req.method !== 'POST') return json({ error: 'not-found' }, 404, origin);
    if (!origin) return json({ error: 'origin' }, 403, '');

    // 1 人あたりの回数制限(無料枠を他人に使い切られないため)
    if (env.RL) {
      const ip = req.headers.get('cf-connecting-ip') || 'x';
      const { success } = await env.RL.limit({ key: `${m[1]}:${ip}` });
      if (!success) return json({ error: 'rate-limited' }, 429, origin);
    }
    if (Number(req.headers.get('content-length') || 0) > 40000) return json({ error: 'too-large' }, 413, origin);

    let data;
    try { data = await req.json(); } catch { return json({ error: 'bad-json' }, 400, origin); }
    const max = game.maxInput ?? 200;
    if (typeof data.input !== 'string' || !data.input.trim() || data.input.length > max) return json({ error: 'bad-input' }, 400, origin);

    const messages = game.buildMessages(data);
    // 計測: プレイヤーの文章は記録しない。作品名・呼び先・成否・時間だけ。
    const log = (o) => console.log(JSON.stringify({ game: m[1], ...o }));
    const result = await runChain(env, game, messages, log);
    if (!result) return json({ error: 'unavailable' }, 502, origin);
    return json(result, 200, origin);
  },
};
