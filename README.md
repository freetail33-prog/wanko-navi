# わんこ用品ナビ（試作）

犬のフード・用品診断 ＋ 犬用品セール速報（毎日自動更新）＋ 楽天ROOM投稿用リスト。

## 構成
- `public/` … 公開される静的サイト（`index.html` 診断／`deals.html` セール速報／`privacy.html` 広告表記・ポリシー／`room-posts.html` ROOM投稿用・noindex）
- `public/assets/diagnosis.js` … 診断ロジック（ルールベース）。`window.DIAG_PROVIDER` を差し替えればLLM診断に切り替え可能
- `public/assets/catalog.js` … おすすめカテゴリと検索キーワード
- `scripts/build.mjs` … セール取得 → 値下げ判定（`data/price-history.json`）→ 全ページ再生成
- `scripts/providers.mjs` … 楽天API（実装済み）／Amazon PA-API・Creators API（スタブ）／サンプルデータ

## ローカル実行
```
cp .env.example .env   # 値を入れる
set -a; . ./.env; set +a
node scripts/build.mjs && npm run serve   # http://localhost:8787
```
キー未設定の場合は「サンプルデータ」と明記したダミーを表示します。

## 本番公開（GitHub Pages・おすすめ）
1. GitHubにこのフォルダをpush（ブランチ `main`）
2. Settings → Pages → Source を **GitHub Actions** に
3. Settings → Secrets and variables → Actions
   - Secrets: `RAKUTEN_APP_ID` `RAKUTEN_ACCESS_KEY` `RAKUTEN_AFFILIATE_ID`
   - Variables: `AMAZON_ASSOCIATE_TAG` `RAKUTEN_ROOM_URL` `SITE_URL` `SITE_NAME`
4. 以降は毎日7:00（日本時間）に自動で更新・公開されます（`.github/workflows/daily.yml`）

Netlify / Vercel / Cloudflare Pages の場合：ビルドコマンド `node scripts/build.mjs`、公開ディレクトリ `public`（`netlify.toml` / `vercel.json` 同梱）。毎日の更新はビルドフックをcronで叩くか、GitHub Actionsを併用してください。

## 楽天ROOM
公式の投稿APIがなく自動投稿は規約違反のおそれがあるため、自動化していません。`room-posts.html`（または `data/room-posts.json`）の紹介文をコピーして手動で投稿してください。
