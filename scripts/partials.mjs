// 全ページ共通のヘッダー・フッター（ビルド時に埋め込み）
export const SITE_NAME = process.env.SITE_NAME || "わんこ用品ナビ";
export const ROOM_URL = process.env.RAKUTEN_ROOM_URL || "";
export function roomLink(){
  return ROOM_URL ? `<a href="${ROOM_URL}" target="_blank" rel="noopener">楽天ROOMも見る</a>` : `<a href="#" onclick="alert('楽天ROOMは準備中です。');return false;">楽天ROOMも見る（準備中）</a>`;
}
export function head(title, desc, noindex=false){
  return `<!doctype html><html lang="ja"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
${noindex?'<meta name="robots" content="noindex,nofollow">':""}<title>${title}｜${SITE_NAME}</title><meta name="description" content="${desc}">
<link rel="stylesheet" href="assets/style.css"><link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🐾</text></svg>">
</head><body>`;
}
export function header(active){
  const on = (k) => active === k ? ' class="on"' : "";
  return `<div class="pr-bar">当サイトはアフィリエイト広告（楽天アフィリエイト・Amazonアソシエイト）を利用しています。<a href="privacy.html#ad">詳しく</a></div>
<header class="site"><div class="in"><a class="logo" href="index.html">🐾 <span>${SITE_NAME}</span></a>
<nav class="g"><a href="index.html"${on("diag")}>診断</a><a href="deals.html"${on("deals")}>セール速報</a>${ROOM_URL?`<a href="${ROOM_URL}" target="_blank" rel="noopener">楽天ROOM</a>`:""}<a href="privacy.html"${on("privacy")}>ポリシー</a></nav></div></header>`;
}
export function footer(){
  return `<footer class="site"><p><a href="privacy.html#ad">広告について</a><a href="privacy.html#privacy">プライバシーポリシー</a><a href="privacy.html#disclaimer">免責事項</a>${roomLink()}</p>
<p>Amazonのアソシエイトとして、${SITE_NAME}は適格販売により収入を得ています。当サイトは楽天アフィリエイトにも参加しています。</p>
<p>診断結果は一般的な情報にもとづく目安で、獣医師による診断の代わりにはなりません。体調の変化が気になる場合は動物病院にご相談ください。</p>
<p>© ${new Date().getFullYear()} ${SITE_NAME}</p></footer>`;
}
export function signupCta(){
  return `<section class="card" id="signup"><h2>📩 セール速報を受け取る</h2>
<p class="muted">ドッグフードやペットシーツの値下げ情報を、まとめてお届けする予定です。</p>
<div class="note">⚠️ <b>準備中：</b>配信機能はまだつながっていません。入力した内容はどこにも送信・保存されません。</div>
<a class="btn" href="#" aria-disabled="true" onclick="alert('LINE公式アカウントは準備中です。');return false;" style="background:#06c755">LINEで受け取る（準備中）</a>
<form onsubmit="alert('メール配信は準備中です。入力内容は送信されていません。');return false;" style="margin-top:12px">
<label for="em">メールで受け取る（準備中）</label><input id="em" type="email" placeholder="you@example.com" autocomplete="off">
<button class="btn sub" style="margin-top:10px">登録する（準備中）</button></form></section>`;
}
