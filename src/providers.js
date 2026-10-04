// AI の呼び先。どれも「text を返す / 失敗したら throw」に揃える。
const TIMEOUT_MS = 9000;

export async function groq(env, messages, opt) {
  if (!env.GROQ_API_KEY) throw new Error('no-key');
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({ model: env.GROQ_MODEL || 'openai/gpt-oss-120b', temperature: opt.temperature, max_tokens: opt.maxTokens, messages }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`http-${r.status}`);
  const out = await r.json();
  return out.choices?.[0]?.message?.content ?? '';
}

export async function gemini(env, messages, opt) {
  if (!env.GEMINI_API_KEY) throw new Error('no-key');
  const model = env.GEMINI_MODEL || 'gemini-flash-latest';
  const system = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n');
  const contents = messages.filter((m) => m.role !== 'system').map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': env.GEMINI_API_KEY },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: opt.temperature, maxOutputTokens: opt.maxTokens },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!r.ok) throw new Error(`http-${r.status}`);
  const out = await r.json();
  return (out.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

export async function workersAi(env, messages, opt) {
  if (!env.AI) throw new Error('no-binding');
  const out = await env.AI.run(env.CF_MODEL || '@cf/google/gemma-4-26b-a4b-it', {
    messages, temperature: opt.temperature, max_tokens: opt.maxTokens,
  });
  return out?.response ?? out?.result?.response ?? '';
}

export const PROVIDERS = { groq, gemini, 'workers-ai': workersAi };
export const DEFAULT_ORDER = ['groq', 'gemini', 'workers-ai'];
