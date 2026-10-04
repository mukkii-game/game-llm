# game-llm — ゲーム共通の AI 会話の中継

ブラウザゲーム(GitHub Pages 等)から AI と会話するための Cloudflare Worker。**全作品でこの 1 本を使う。**
鍵はブラウザに置かず、ここ(Cloudflare の secret)にだけ置く。

```
ゲーム ──POST /api/chat/<作品名>──▶ game-llm ──▶ Groq ─(失敗)▶ Gemini ─(失敗)▶ Workers AI
   ▲                                                                              │(全部失敗)
   └──────────────── 502 ならゲーム側のルール会話で返す ◀───────────────────────────┘
```

- 無料枠だけで動く(Groq: 1 日 1,000 回・全作品で共有 / Gemini Flash 無料枠 / Workers AI: 1 日 10,000 Neurons)。超えると止まるだけで請求は来ない(カード・支払い方法を登録しない)。
- **キャラ設定(プロンプト)は `games/<作品名>.js` に置く。クライアントからプロンプトは受け取らない**(受け取ると誰でも使える無料 AI 窓口になる)。
- 守り: 呼び出し元サイトの確認(Origin)+ 1 人×作品あたり 1 分 20 回まで。
- 記録するのは作品名・どの AI が答えたか・成否・時間だけ。**プレイヤーの文章は保存しない。**
- Gemini の無料枠は、送った内容が Google のサービス改善に使われることがある。ゲーム内に「会話は AI サービスに送られます」と書く。

## 新しい作品で使う
1. `games/_example.js` を `games/<作品名>.js` にコピーし、キャラ設定・返事の検証を書く。
2. `games/index.js` に 1 行登録する。
3. `npm test` が通ったら main に push(GitHub Actions が自動で公開)。
4. ゲーム側は `client/chat.js` をコピーして使う:
   ```js
   import { createChat } from './chat.js';
   const chat = createChat({ url: 'https://game-llm.mucky-totoro.workers.dev', game: '<作品名>' });
   const { text, provider } = await chat.say(input, state, { session, fallback: () => ruleReply(input) });
   ```
   `?auto=1` `?seed=` `?replay=` `?nollm=1` の時は AI を呼ばずルール会話(自動確認と再生を壊さない)。

GitHub Pages 以外(itch.io 等)で公開する時は、`games/<作品名>.js` の `origins` にそのサイトを足す。

## 初回の準備(人間)
repo の Settings → Secrets and variables → Actions に 4 つ:
`GROQ_API_KEY` / `GEMINI_API_KEY` / `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`。
入れたら Actions → deploy → Run workflow。

公開先: **https://game-llm.mucky-totoro.workers.dev**(確認: `/health`)

## 鍵の期限
Groq: 2027-10-01 / Cloudflare トークン: 2027-10-01 / Gemini: 期限なし(漏れたら AI Studio で削除して作り直す)。
期限は会議室 `knowledge/permissions-ledger.md` で管理し、週の見直しで 2 週間前に知らせる。
