// 新作用のひな形。games/<作品名>.js にコピーして中身を書き、games/index.js に登録する。
export default {
  // origins: ['https://example.itch.zone'],   // GitHub Pages 以外で公開する時だけ
  maxInput: 200,      // プレイヤーの入力の上限(文字)
  maxTokens: 200,     // AI の返事の上限
  temperature: 0.8,
  // providers: ['groq', 'gemini', 'workers-ai'],  // 順番を変えたい時だけ
  buildMessages({ input, state }) {
    return [
      { role: 'system', content: 'あなたは〇〇。口調は〜。1〜2 文で返す。' },
      ...(Array.isArray(state?.history) ? state.history.slice(-8) : [])
        .filter((h) => typeof h?.text === 'string')
        .map((h) => ({ role: h.role === 'npc' ? 'assistant' : 'user', content: h.text.slice(0, 200) })),
      { role: 'user', content: input },
    ];
  },
  // 返事を検証する。だめなら null(次の AI に回る)。
  validate(text) {
    if (typeof text !== 'string') return null;
    const t = text.trim();
    return t.length >= 1 && t.length <= 300 ? t : null;
  },
};
