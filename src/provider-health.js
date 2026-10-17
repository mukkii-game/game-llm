// Best-effort per-isolate circuit breaker, not an account-wide usage meter.
// Keep credentials scoped to the env object; never serialize keys or player text.
const health = new WeakMap();
export function retrySeconds(value, now = Date.now()) {
  if (value == null || value === '') return 60;
  const seconds = Number(value);
  const wait = Number.isFinite(seconds) ? seconds : (Date.parse(value) - now) / 1000;
  return Number.isFinite(wait) ? Math.max(1, Math.min(86400, Math.ceil(wait))) : 60;
}
function entry(env, name) {
  let entries = health.get(env);
  if (!entries) { entries = new Map(); health.set(env, entries); }
  const model = name === 'groq' ? env.GROQ_MODEL : name === 'gemini' ? env.GEMINI_MODEL : env.CF_MODEL;
  const key = `${name}:${model || 'default'}`;
  return {entries, key};
}
export function providerRetryAt(env, name) {
  const {entries, key} = entry(env, name);
  return entries.get(key) || 0;
}
export function coolProvider(env, name, seconds, now = Date.now()) {
  const {entries, key} = entry(env, name);
  const until = now + retrySeconds(seconds, now) * 1000;
  entries.set(key, until);
  return until;
}
