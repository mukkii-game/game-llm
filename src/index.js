// game-llm: 全作品で使い回す AI 会話の中継(Cloudflare Worker)。
// POST /api/chat/<game>  { input, state, session }  →  { text, provider }
// キャラ設定は games/<game>.js(サーバー側)だけに置く。クライアントからプロンプトは受け取らない。
import { GAMES } from '../games/index.js';
import { PROVIDERS, DEFAULT_ORDER } from './providers.js';
import { decide } from './decide.js';

const BASE_ORIGINS = ['https://mukkii-game.github.io', 'http://localhost', 'http://127.0.0.1'];
// 作品は Cloudflare Workers(静的配信)でも公開する(2026-10-12 Mukkii 決定)。<作品>.mucky-totoro.workers.dev を許す
const WORKERS_SUFFIX = '.mucky-totoro.workers.dev';

function allowedOrigin(req, game) {
  const origin = req.headers.get('Origin') || '';
  const list = [...BASE_ORIGINS, ...(game?.origins ?? [])];
  const ok = list.some((o) => origin === o || (o.startsWith('http://') && origin.startsWith(o + ':')))
    || (/^https:\/\/[a-z0-9-]+\.mucky-totoro\.workers\.dev$/.test(origin) && origin.endsWith(WORKERS_SUFFIX));
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
export async function runChain(env, game, messages, log, { startedAt } = {}) {
  const order = (env.PROVIDERS ? env.PROVIDERS.split(',') : game.providers ?? DEFAULT_ORDER).map((s) => s.trim());
  const opt = { temperature: game.temperature ?? 0.9, maxTokens: game.maxTokens ?? 200, timeoutMs: game.providerTimeoutMs ?? 9000 };
  const outputSchema = typeof game.outputSchema === 'function' ? game.outputSchema(messages) : null;
  if(outputSchema)opt.outputSchema=outputSchema;
  const deadline = game.requestBudgetMs == null ? null : (startedAt ?? Date.now()) + game.requestBudgetMs;
  for (const name of order) {
    const call = PROVIDERS[name];
    if (!call) continue;
    const t0 = Date.now();
    const remaining = deadline === null ? opt.timeoutMs : deadline - t0;
    if (deadline !== null && remaining <= 0) break;
    const attemptOpt = deadline === null ? opt : { ...opt, timeoutMs: Math.min(opt.timeoutMs, remaining) };
    try {
      const validated = game.validate(await call(env, messages, attemptOpt), {messages});
      const structured = validated !== null && typeof validated === 'object';
      const text = structured ? validated.text : validated;
      const source = structured && ['llm', 'mixed', 'authored'].includes(validated.source) ? validated.source : 'llm';
      const accepted = typeof text === 'string' && Boolean(text);
      log({ provider: name, source, ok: accepted, reason: structured && validated.reason ? String(validated.reason).slice(0, 40) : accepted ? '' : 'rejected', ms: Date.now() - t0 });
      if (accepted) return { text, provider: name, ...(structured || game.reportSource === true ? { source } : {}) };
    } catch (e) {
      log({ provider: name, source: 'llm', ok: false, reason: String(e.message || e).slice(0, 40), ms: Date.now() - t0 });
      if (game.stopOnRateLimit === true && e.message === 'http-429') return { error: 'rate-limited', provider: name };
    }
  }
  return null;
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') {
      return json({ ok: true, games: Object.keys(GAMES), decisions: Object.fromEntries(Object.entries(GAMES).map(([k, g]) => [k, Object.keys(g.decisions ?? {})])), providers: DEFAULT_ORDER.filter((p) =>
        p === 'groq' ? env.GROQ_API_KEY : p === 'gemini' ? env.GEMINI_API_KEY : env.AI) }, 200, allowedOrigin(req, null));
    }
    const d = url.pathname.match(/^\/api\/decide\/([a-z0-9-]+)\/([a-z0-9_-]+)$/);
    if (d) return handleDecide(req, env, d[1], d[2]);
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

    // Emmichy's request budget includes its potentially slow context lookup.
    const startedAt = m[1] === 'emmichy' && game.requestBudgetMs != null ? Date.now() : undefined;
    const messages = await game.buildMessages(data);
    // 計測: プレイヤーの文章は記録しない。作品名・呼び先・返事の出所・成否・理由・時間だけ。
    const log = (o) => console.log(JSON.stringify({ game: m[1], ...o }));
    const result = await runChain(env, game, messages, log, { startedAt });
    if (!result) return json({ error: 'unavailable' }, 502, origin);
    if (result.error === 'rate-limited') return json(result, 429, origin);
    return json(result, 200, origin);
  },
};

async function handleDecide(req, env, gameName, setName) {
  const game = GAMES[gameName];
  const set = game?.decisions?.[setName];
  const origin = allowedOrigin(req, game);
  if (req.method === 'OPTIONS') {
    if (!origin) return new Response(null, { status: 403 });
    return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': origin, 'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type', 'access-control-max-age': '86400', vary: 'Origin' } });
  }
  if (!set || req.method !== 'POST') return json({ error: 'not-found' }, 404, origin);
  if (!origin) return json({ error: 'origin' }, 403, '');
  if (env.RL) {
    const ip = req.headers.get('cf-connecting-ip') || 'x';
    const { success } = await env.RL.limit({ key: `${gameName}:${ip}` });
    if (!success) return json({ error: 'rate-limited' }, 429, origin);
  }
  if (Number(req.headers.get('content-length') || 0) > (set.maxBytes ?? 20000)) return json({ error: 'too-large' }, 413, origin);
  let data;
  try { data = await req.json(); } catch { return json({ error: 'bad-json' }, 400, origin); }
  if (data?.state === undefined) return json({ error: 'bad-input' }, 400, origin);
  const t0 = Date.now();
  try {
    const result = await decide(env, set, data.state);
    console.log(JSON.stringify({ game: gameName, decide: setName, ok: true, ms: Date.now() - t0 }));
    return json(result, 200, origin);
  } catch (e) {
    console.log(JSON.stringify({ game: gameName, decide: setName, ok: false, reason: String(e.message || e).slice(0, 40), ms: Date.now() - t0 }));
    return json({ error: 'unavailable' }, 502, origin);
  }
}
