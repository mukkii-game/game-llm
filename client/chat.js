// ゲーム側の部品(素の JS。TypeScript からもそのまま import できる)。
// AI が使えない時は必ず fallback(ルール会話)を返す。ゲームは止めない。
//
//   import { createChat } from './chat.js';
//   const chat = createChat({ url: 'https://game-llm.<sub>.workers.dev', game: 'emmichy' });
//   const { text, provider } = await chat.say(input, state, { session, fallback: () => ruleReply(input) });
//
// ?auto=1 / ?seed= / ?replay= / ?nollm=1 の時は AI を呼ばない(自動確認と再生を壊さないため)。
export function createChat({ url, game, timeoutMs = 15000 }) {
  const q = typeof location !== 'undefined' ? new URLSearchParams(location.search) : new URLSearchParams();
  const offline = !url || ['auto', 'seed', 'replay', 'nollm'].some((k) => q.has(k));
  let healthy = !offline;

  return {
    get enabled() { return healthy; },
    async say(input, state, { session, fallback } = {}) {
      if (healthy) {
        try {
          const r = await fetch(`${url}/api/chat/${game}`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ input, state, session }),
            signal: AbortSignal.timeout(timeoutMs),
          });
          if (r.ok) {
            const d = await r.json();
            if (d.text) return { text: d.text, provider: d.provider };
          }
          if (r.status === 404) healthy = false; // 作品が未登録なら以後呼ばない
        } catch { /* 通信失敗はルール会話へ */ }
      }
      const text = typeof fallback === 'function' ? await fallback() : '';
      return { text, provider: 'rule' };
    },
  };
}
