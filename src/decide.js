// 判定用の窓口: POST /api/decide/<game>/<set>  { state }  →  { answers, model }
// Cloudflare の Clef(判定専用モデル)で、選択肢ごとの確率を返す。文章は作らない。
// 質問と選択肢は games/<game>.js の decisions[<set>] にだけ置く(クライアントから受け取らない)。
export async function decide(env, set, state) {
  if (!env.AI) throw new Error('no-binding');
  const model = set.model || env.CLEF_MODEL || 'clef-flash';
  const out = await env.AI.run(`@cf/cloudflare/${model}`, { model, state, questions: set.questions });
  if (!out?.answers) throw new Error('no-answers');
  return { answers: out.answers, model };
}
