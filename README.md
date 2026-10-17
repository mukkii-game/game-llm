# game-llm — ゲーム共通の AI 会話の中継

ブラウザゲーム(GitHub Pages 等)から AI と会話するための Cloudflare Worker。**全作品でこの 1 本を使う。**
鍵はブラウザに置かず、ここ(Cloudflare の secret)にだけ置く。

```
ゲーム ──POST /api/chat/<作品名>──▶ game-llm ──▶ Groq ─(失敗)▶ Gemini ─(失敗)▶ Workers AI
   ▲                                                                              │(全部失敗)
   └──────────────── 502 ならゲーム側のルール会話で返す ◀───────────────────────────┘
```

- 無料枠を使う構成。Groq/Gemini/Workers AI の枠は全プレイヤー・同じアカウントの他作品とも共有する。**回数だけで利用人数は決まらない**。下記のトークン制限と実使用量も確認する。
- Workers AI は無料プランなら枠超過で停止するが、Workers 有料プランでは無料分の超過に従量課金がある。ここでは契約・課金設定を変更しない。実アカウントのプランを確認せず「請求されない」とは保証しない。
- **キャラ設定(プロンプト)は `games/<作品名>.js` に置く。クライアントからプロンプトは受け取らない**(受け取ると誰でも使える無料 AI 窓口になる)。
- 守り: 呼び出し元サイトの確認(Origin)+ 1 人×作品あたり 1 分 20 回まで。
- 記録するのは作品名・呼び先・返事の出所・成否・時間と、APIが返した数値のトークン使用量／残量。**通常の運用ログにプレイヤーの文章は保存しない。**
- Gemini の無料枠は、送った内容が Google のサービス改善に使われることがある。ゲーム内に「会話は AI サービスに送られます」と書く。

## 無料枠と429（2026-10-17確認）

| 接続先／現在のモデル | 公開されている無料枠 | 注意 |
|---|---|---|
| Groq / openai/gpt-oss-120b | 30回/分、1,000回/日、8,000 tokens/分、200,000 tokens/日 | 組織で共有。最初に達した制限で429。正確な契約枠は管理画面と応答ヘッダー |
| Gemini / gemini-flash-latest | プロジェクト・モデル・利用tierにより異なる | 固定の日回数を推測しない。AI Studioの有効なrate limitsを確認。日回数は太平洋時間午前0時リセット |
| Workers AI / @cf/google/gemma-4-26b-a4b-it | アカウントで10,000 neurons/日 | UTC0時＝日本時間9時リセット。入力100万tokensあたり9,091 neurons、出力は27,273 |

例としてGroqが1返答で計4,000 tokensを消費するなら、日token枠は約50返答分。1プレイ10返答なら約5プレイ分で、1,000回/日だけから100プレイ可能とは言えない。これは計算例で、実測ではない。キャッシュや思考tokens、他作品の利用でも変わる。Workers AIは入力4,000/出力200 tokensという仮定で約239返答/日だが、これも現在の実消費量ではない。

通常のEmmichyは429で次の接続先へ進む。制限中の接続先はRetry-After（なければ60秒、1秒〜24時間）だけ休ませる。これはWorkerインスタンス/env内の一時的な回路遮断で、全拠点に共通の厳密な残量管理や課金上限ではない。全接続先が休止中なら429と最短のRetry-Afterを返す。ブラウザもその期限後、次のプレイヤー入力時に再び通信できる。自動的な生成ループは行わない。

**品質試験は別**：`emmichy-quality-check.mjs`は計2 provider callsまで、最初の429で終了する。通常プレイのfallback修正を理由に、試験で429後の追加生成をしない。期限は全体7.2秒／各接続先最大3.5秒を維持。

出典：[Groq](https://console.groq.com/docs/rate-limits)、[Gemini](https://ai.google.dev/gemini-api/docs/rate-limits)、[Workers AI](https://developers.cloudflare.com/workers-ai/platform/pricing/)。

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

## 判定(Clef)
文章ではなく「選択肢のどれか」を決めたい時(敵の行動、bot の戦術、会話の意図の分類)。Cloudflare の判定専用モデル Clef-flash を使い、選択肢ごとの確率が返る。
- `games/<作品名>.js` の `decisions` に、名前ごとに質問と選択肢を書く(例は `_example.js`)。**質問はサーバー側にだけ置く。**
- ゲーム側: `decideWith({ url, game, set, state })`(`client/chat.js`)。失敗したら null → 自前のルールで決める。
- 会話と同じ Workers AI の無料枠を分け合う。毎フレーム呼ばない(状況が変わった時だけ)。

GitHub Pages 以外(itch.io 等)で公開する時は、`games/<作品名>.js` の `origins` にそのサイトを足す。

## 初回の準備(人間)
repo の Settings → Secrets and variables → Actions に 4 つ:
`GROQ_API_KEY` / `GEMINI_API_KEY` / `CLOUDFLARE_API_TOKEN` / `CLOUDFLARE_ACCOUNT_ID`。
入れたら Actions → deploy → Run workflow。

公開先: **https://game-llm.mucky-totoro.workers.dev**(確認: `/health`)

## 鍵の期限
Groq: 2027-10-01 / Cloudflare トークン: 2027-10-01 / Gemini: 期限なし(漏れたら AI Studio で削除して作り直す)。
期限は会議室 `knowledge/permissions-ledger.md` で管理し、週の見直しで 2 週間前に知らせる。
