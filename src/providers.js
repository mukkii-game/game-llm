// AI の呼び先。どれも「text を返す / 失敗したら throw」に揃える。
const TIMEOUT_MS = 9000;
import {retrySeconds} from './provider-health.js';

function checked(response, opt) {
  if (response.ok) return;
  const error = new Error(`http-${response.status}`);
  if (response.status === 429) error.retryAfterSeconds = retrySeconds(response.headers.get('retry-after'));
  // Only numeric counters: no response body, credentials, account IDs or prompt.
  opt.onUsage?.(quotaCounters(response.headers));
  throw error;
}
function quotaCounters(headers) {
  const out = {};
  for (const [header, key] of [['x-ratelimit-limit-requests','requestLimit'],['x-ratelimit-remaining-requests','requestsRemaining'],['x-ratelimit-limit-tokens','tokenLimit'],['x-ratelimit-remaining-tokens','tokensRemaining']]) {
    const value = headers.get(header);
    if (value !== null && Number.isFinite(Number(value))) out[key] = Number(value);
  }
  return out;
}
function usageCounters(usage, inputKey, outputKey, totalKey) {
  const out = {};
  for (const [key, source] of [['inputTokens',inputKey],['outputTokens',outputKey],['totalTokens',totalKey]]) {
    if (Number.isFinite(usage?.[source])) out[key] = usage[source];
  }
  return out;
}

export async function groq(env, messages, opt) {
  if (!env.GROQ_API_KEY) throw new Error('no-key');
  const model=env.GROQ_MODEL || 'openai/gpt-oss-120b';
  const strictSchema=['openai/gpt-oss-120b','openai/gpt-oss-20b','qwen/qwen3.8-27b'].includes(model);
  const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${env.GROQ_API_KEY}` },
    body: JSON.stringify({
      model, temperature: opt.temperature, max_tokens: opt.maxTokens, messages,
      ...(opt.outputSchema?{response_format:strictSchema?{type:'json_schema',json_schema:{name:'game_reply',strict:true,schema:opt.outputSchema}}:{type:'json_object'}}:{}),
      // gpt-oss は答える前に考える型。会話では考える量を減らして速さを優先する
      ...((env.GROQ_MODEL || 'openai/gpt-oss-120b').includes('gpt-oss') ? { reasoning_effort: opt.reasoning || env.GROQ_REASONING || 'low' } : {}),
    }),
    signal: AbortSignal.timeout(opt.timeoutMs ?? TIMEOUT_MS),
  });
  checked(r, opt);
  const out = await r.json();
  opt.onUsage?.({...quotaCounters(r.headers), ...usageCounters(out.usage, 'prompt_tokens', 'completion_tokens', 'total_tokens')});
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
      generationConfig: { temperature: opt.temperature, maxOutputTokens: opt.maxTokens, ...(opt.outputSchema?{responseMimeType:'application/json'}:{}) },
    }),
    signal: AbortSignal.timeout(opt.timeoutMs ?? TIMEOUT_MS),
  });
  checked(r, opt);
  const out = await r.json();
  opt.onUsage?.(usageCounters(out.usageMetadata, 'promptTokenCount', 'candidatesTokenCount', 'totalTokenCount'));
  return (out.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

export async function workersAi(env, messages, opt) {
  if (!env.AI) throw new Error('no-binding');
  let timer;
  const timedOut=new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('timeout')),opt.timeoutMs??TIMEOUT_MS);});
  let out;
  try{out=await Promise.race([env.AI.run(env.CF_MODEL || '@cf/google/gemma-4-26b-a4b-it', {
    messages, temperature: opt.temperature, max_tokens: opt.maxTokens,
  }),timedOut]);}finally{clearTimeout(timer);}
  return out?.response ?? out?.result?.response ?? '';
}

export const PROVIDERS = { groq, gemini, 'workers-ai': workersAi };
export const DEFAULT_ORDER = ['groq', 'gemini', 'workers-ai'];
