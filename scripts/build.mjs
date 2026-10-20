// 使い方: node scripts/build.mjs
// 環境変数: RAKUTEN_APP_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID / AMAZON_ASSOCIATE_TAG / RAKUTEN_ROOM_URL / SITE_URL / SITE_NAME
// 毎日1回（GitHub Actions / cron）実行すると、セール速報・ROOM投稿用リストを再生成します。
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { head, header, footer, signupCta, SITE_NAME } from "./partials.mjs";
import { rakutenProvider, amazonProvider, sampleProvider, DEAL_QUERIES } from "./providers.mjs";
import renderIndex from "./index.template.mjs";
import renderPrivacy from "./privacy.template.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUB = path.join(ROOT, "public");
const HIST = path.join(ROOT, "data", "price-history.json");
const ROOM_SLUG = process.env.ROOM_PAGE_SLUG || "room-posts";
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
const yen = n => "¥" + Number(n).toLocaleString("ja-JP");
const rakutenAff = url => {
  const id = process.env.RAKUTEN_AFFILIATE_ID; if (!id || !url || url.includes("hb.afl.rakuten")) return url;
  const u = encodeURIComponent(url); return `https://hb.afl.rakuten.co.jp/hgc/${id}/?pc=${u}&m=${u}`;
};
const rakutenSearch = kw => rakutenAff("https://search.rakuten.co.jp/search/mall/" + encodeURIComponent(kw) + "/");
const amazonSearch = kw => "https://www.amazon.co.jp/s?k=" + encodeURIComponent(kw) + (process.env.AMAZON_ASSOCIATE_TAG ? "&tag=" + encodeURIComponent(process.env.AMAZON_ASSOCIATE_TAG) : "");
// 商品名から Amazon 検索用のキーワードを作る（【】や送料無料などの装飾を除く）
const toKeyword = name => String(name).replace(/【[^】]*】|\[[^\]]*\]|送料無料|ポイント\d+倍|クーポン|あす楽|\d+%OFF/gi, " ").replace(/\s+/g, " ").trim().split(" ").slice(0, 4).join(" ");

async function collect(){
  const items = []; const used = [];
  for (const p of [rakutenProvider, amazonProvider]){
    if (!p.enabled()) continue;
    try { const r = await p.fetch(); items.push(...r); used.push(p.name); console.log(`[${p.name}] ${r.length}件`); }
    catch(e){ console.error(`[${p.name}] 取得失敗:`, e.message); }
  }
  if (!items.length){ items.push(...await sampleProvider.fetch()); used.push("sample"); }
  return { items, used };
}

function score(items){
  const hist = fs.existsSync(HIST) ? JSON.parse(fs.readFileSync(HIST, "utf8")) : {};
  const today = new Date().toISOString().slice(0, 10);
  for (const it of items){
    if (it.sample) { it.score = 0; continue; }
    const h = hist[it.id] || { prices: {} };
    const past = Object.entries(h.prices).filter(([d]) => d < today).map(([, v]) => v);
    const ref = past.length ? Math.max(...past.slice(-30)) : null;     // 直近30回の最高値
    it.dropPct = ref && it.price < ref ? Math.round((1 - it.price / ref) * 100) : 0;
    it.refPrice = it.dropPct ? ref : null;
    const saleWord = /SALE|セール|OFF|半額|クーポン|特価|値下げ/i.test(it.name);
    it.tags = [];
    if (it.dropPct >= 3) it.tags.push(`前回比 ${it.dropPct}%ダウン`);
    if (it.pointRate >= 2) it.tags.push(`ポイント${it.pointRate}倍`);
    if (saleWord) it.tags.push("セール・クーポン表記あり");
    it.score = it.dropPct * 3 + (it.pointRate - 1) * 4 + (saleWord ? 5 : 0) + Math.min(it.reviewCount, 2000) / 400 + (it.review || 0);
    h.prices[today] = it.price; h.name = it.name;
    const keep = Object.keys(h.prices).sort().slice(-60); h.prices = Object.fromEntries(keep.map(k => [k, h.prices[k]]));
    hist[it.id] = h;
  }
  if (items.some(i => !i.sample)) { fs.mkdirSync(path.dirname(HIST), { recursive: true }); fs.writeFileSync(HIST, JSON.stringify(hist)); }
  return items;
}

function pick(items){
  const byCat = {};
  for (const it of items.sort((a, b) => b.score - a.score)){
    (byCat[it.cat] ||= []); if (byCat[it.cat].length < 8 && !byCat[it.cat].some(x => x.name === it.name)) byCat[it.cat].push(it);
  }
  return byCat;
}

function dealCard(it){
  const kw = it.sample ? it.keyword : toKeyword(it.name);
  const rUrl = it.sample ? rakutenSearch(kw) : rakutenAff(it.url);
  const img = it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" referrerpolicy="no-referrer">` : `<div class="noimg">🐾</div>`;
  const price = it.sample ? `<div class="meta">価格：サンプルのため表示していません</div>` :
    `<div class="p">${yen(it.price)}${it.refPrice ? ` <span class="meta" style="text-decoration:line-through">${yen(it.refPrice)}</span>` : ""}</div>`;
  return `<div class="deal" data-cat="${it.cat}">${img}<div style="flex:1;min-width:0">
${it.sample ? '<span class="badge sample">サンプルデータ</span> ' : ""}${(it.tags || []).map(t => `<span class="badge hot">${esc(t)}</span>`).join(" ")}
<div class="t">${esc(it.name)}</div>${price}<div class="meta">${esc(it.shop)}${it.reviewCount ? ` ／ ★${it.review}（${it.reviewCount}件）` : ""}</div>
<div class="links" style="display:flex;gap:6px;margin-top:6px;flex-wrap:wrap"><a class="btn sm" rel="sponsored noopener" target="_blank" href="${esc(rUrl)}">楽天で見る</a><a class="btn sm sub" rel="sponsored noopener" target="_blank" href="${esc(amazonSearch(kw))}">Amazonで見る</a></div>
</div></div>`;
}

function renderDeals(byCat, used, updated){
  const isSample = used.includes("sample");
  const cats = DEAL_QUERIES.filter(q => byCat[q.cat]?.length);
  return `${head("今日の犬用品セール速報", "ドッグフード・ペットシーツ・おやつの値下げ・ポイントアップ情報を毎日自動で更新。")}
${header("deals")}<main>
<section class="hero"><h1>🔥 今日の犬用品セール速報 <span class="badge pr">PR</span></h1>
<p>ドッグフード・ペットシーツ・おやつなど、多頭飼いでよく使う消耗品の値下げやポイントアップを毎日自動でチェックしています。</p>
<p class="muted">最終更新：${updated}（日本時間）／価格・ポイントは取得した時点のものです。購入前に必ずリンク先でご確認ください。</p></section>
${isSample ? `<div class="note">⚠️ <b>これはサンプルデータです。</b>楽天APIのキーがまだ設定されていないため、表示テスト用のダミーを並べています。実在の商品・価格ではありません。</div>` : ""}
<div class="tabs" id="tabs"><button class="on" data-c="">すべて</button>${cats.map(q => `<button data-c="${q.cat}">${q.label}</button>`).join("")}</div>
<div class="deals">${cats.flatMap(q => byCat[q.cat]).map(dealCard).join("\n")}</div>
<p class="muted" style="margin-top:12px">※「前回比」は当サイトが毎日記録している価格と比べた値です。楽天市場・Amazonのリンクから購入されると、当サイトに紹介料が入ることがあります。</p>
${signupCta()}</main>${footer()}
<script>document.getElementById("tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;document.querySelectorAll("#tabs button").forEach(x=>x.classList.toggle("on",x===b));document.querySelectorAll(".deal").forEach(d=>d.style.display=!b.dataset.c||d.dataset.cat===b.dataset.c?"":"none");});</script>
</body></html>`;
}

// ---- 楽天ROOM 投稿用リスト（自動投稿はしない。コピーして手動で投稿する） ----
const ROOM_TAGS = { food: "#ドッグフード", sheet: "#ペットシーツ", snack: "#犬のおやつ", care: "#犬の健康", goods: "#犬グッズ" };
function roomPosts(byCat){
  const top = Object.values(byCat).flatMap(a => a.slice(0, 2)).sort((a, b) => b.score - a.score).slice(0, 10);
  return top.map(it => {
    const hook = it.dropPct >= 3 ? `いつもより${it.dropPct}%安くなっていました！` : it.pointRate >= 2 ? `今ならポイント${it.pointRate}倍です。` : "レビューの多い定番アイテムです。";
    const text = `3匹と暮らすわが家の消耗品チェック🐾\n${it.catLabel}をお得に買うチャンス。${hook}\n多頭飼いだとすぐなくなるので、まとめ買いのタイミングにおすすめです。\n※価格・ポイントは投稿時点のものです\n${ROOM_TAGS[it.cat] || ""} #多頭飼い #犬のいる暮らし #犬用品 #楽天お買い物マラソン`;
    return { id: it.id, sample: !!it.sample, name: it.name, itemUrl: it.sample ? "" : it.itemUrl, text };
  });
}
function renderRoom(posts, updated){
  return `${head("楽天ROOM 投稿用リスト（管理者用）", "管理者用", true)}${header("")}<main>
<section class="hero"><h1>📝 楽天ROOM 投稿用リスト</h1><p class="muted">管理者用・検索エンジン非表示（noindex）／最終更新：${updated}（日本時間）</p></section>
<div class="note">楽天ROOMには公式の投稿APIがなく、自動投稿は規約違反になるおそれがあるため、<b>投稿は手動</b>で行ってください。手順：①「商品ページを開く」→ ROOMアプリやブラウザで「ROOMに投稿」②「紹介文をコピー」→ 貼り付けて投稿。</div>
${posts.map((p, i) => `<section class="card"><h3>${i + 1}. ${p.sample ? '<span class="badge sample">サンプル</span> ' : ""}${esc(p.name)}</h3>
${p.itemUrl ? `<p class="muted" style="word-break:break-all">${esc(p.itemUrl)}</p><a class="btn sm sub" target="_blank" rel="noopener" href="${esc(p.itemUrl)}">商品ページを開く</a>` : `<p class="muted">サンプルのため商品URLはありません</p>`}
<textarea id="t${i}" rows="6" style="width:100%;margin-top:10px;font-size:14px;padding:10px;border:1px solid #d9cbb9;border-radius:10px">${esc(p.text)}</textarea>
<button class="btn sm" onclick="navigator.clipboard.writeText(document.getElementById('t${i}').value).then(()=>{this.textContent='コピーしました ✓'})">紹介文をコピー</button></section>`).join("")}
</main>${footer()}</body></html>`;
}

const now = new Date();
const updated = now.toLocaleString("ja-JP", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" });
const { items, used } = await collect();
const byCat = pick(score(items));
const posts = roomPosts(byCat);
fs.mkdirSync(path.join(PUB, "data"), { recursive: true });
fs.writeFileSync(path.join(PUB, "assets", "config.js"), `window.SITE_CONFIG=${JSON.stringify({ siteName: SITE_NAME, rakutenAffiliateId: process.env.RAKUTEN_AFFILIATE_ID || "", amazonTag: process.env.AMAZON_ASSOCIATE_TAG || "", roomUrl: process.env.RAKUTEN_ROOM_URL || "" })};\n`);
fs.writeFileSync(path.join(PUB, "index.html"), renderIndex());
fs.writeFileSync(path.join(PUB, "privacy.html"), renderPrivacy());
fs.writeFileSync(path.join(PUB, "deals.html"), renderDeals(byCat, used, updated));
fs.writeFileSync(path.join(PUB, `${ROOM_SLUG}.html`), renderRoom(posts, updated));
fs.writeFileSync(path.join(PUB, "data", "deals.json"), JSON.stringify({ updated: now.toISOString(), sources: used, deals: byCat }, null, 1));
fs.writeFileSync(path.join(ROOT, "data", "room-posts.json"), JSON.stringify({ updated: now.toISOString(), posts }, null, 1));
fs.writeFileSync(path.join(PUB, "robots.txt"), `User-agent: *\nDisallow: /${ROOM_SLUG}.html\nDisallow: /data/\n`);
console.log(`完了: sources=${used.join(",")} / deals=${Object.values(byCat).flat().length}件 / ROOM投稿候補=${posts.length}件`);
