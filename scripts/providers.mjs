// セール情報の取得プロバイダー。新しいショップ（Yahoo!ショッピング等）を足す場合もここに追加します。
import https from "node:https";

export const DEAL_QUERIES = [
  { cat: "food",   label: "ドッグフード",   keyword: "ドッグフード" },
  { cat: "sheet",  label: "ペットシーツ",   keyword: "ペットシーツ 犬" },
  { cat: "snack",  label: "おやつ",         keyword: "犬 おやつ 無添加" },
  { cat: "care",   label: "ケア用品",       keyword: "犬 サプリ" },
  { cat: "goods",  label: "グッズ",         keyword: "犬 ベッド" }
];

function getJson(url, headers){
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers, timeout: 20000 }, res => {
      let body = ""; res.setEncoding("utf8");
      res.on("data", d => body += d);
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) return reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0,300)}`));
        try { resolve(JSON.parse(body)); } catch(e){ reject(e); }
      });
    });
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ---- 楽天市場 商品検索API（version 2026-07-01, openapi.rakuten.co.jp） ----
export const rakutenProvider = {
  name: "rakuten",
  enabled: () => !!(process.env.RAKUTEN_APP_ID && process.env.RAKUTEN_ACCESS_KEY),
  async fetch(){
    const site = process.env.SITE_URL || "https://example.com";
    const out = [];
    for (const q of DEAL_QUERIES){
      const params = new URLSearchParams({
        applicationId: process.env.RAKUTEN_APP_ID,
        accessKey: process.env.RAKUTEN_ACCESS_KEY,
        format: "json", formatVersion: "2",
        keyword: q.keyword, hits: "30", sort: "-reviewCount",
        availability: "1", imageFlag: "1", pointRateFlag: "0",
        elements: "itemName,itemPrice,itemUrl,affiliateUrl,mediumImageUrls,shopName,pointRate,reviewAverage,reviewCount,itemCode"
      });
      if (process.env.RAKUTEN_AFFILIATE_ID) params.set("affiliateId", process.env.RAKUTEN_AFFILIATE_ID);
      const url = "https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701?" + params;
      const data = await getJson(url, { accessKey: process.env.RAKUTEN_ACCESS_KEY, Origin: site, Referer: site, "User-Agent": "dog-affiliate-bot/1.0" });
      const items = data.Items || data.items || [];
      for (const raw of items){
        const it = raw.Item || raw.item || raw;
        const img = (it.mediumImageUrls || [])[0];
        out.push({
          source: "rakuten", cat: q.cat, catLabel: q.label, id: "r:" + it.itemCode,
          name: it.itemName, price: it.itemPrice, shop: it.shopName,
          pointRate: it.pointRate || 1, review: it.reviewAverage || 0, reviewCount: it.reviewCount || 0,
          image: typeof img === "string" ? img : img?.imageUrl || "",
          url: it.affiliateUrl || it.itemUrl, itemUrl: it.itemUrl, sample: false
        });
      }
      await sleep(1100); // 楽天APIは1秒1リクエスト程度に抑える
    }
    return out;
  }
};

// ---- Amazon（PA-API 5.0 / Creators API）: 売上実績ができてから有効化 ----
// 現時点では検索リンクのみ使用。キーが揃ったらここに実装を足すだけでセール速報にAmazon商品が並びます。
export const amazonProvider = {
  name: "amazon",
  enabled: () => !!(process.env.AMAZON_ACCESS_KEY && process.env.AMAZON_SECRET_KEY && process.env.AMAZON_ASSOCIATE_TAG),
  async fetch(){
    console.warn("[amazon] APIキーは設定されていますが、PA-API/Creators APIの取得処理は未実装です（スタブ）。");
    // TODO: SearchItems（Keywords=DEAL_QUERIES, Offers.Listings.Price / SavingBasis）で値引き率を取得して
    // { source:"amazon", cat, catLabel, id:"a:"+ASIN, name, price, image, url:DetailPageURL, ... } を返す
    return [];
  }
};

// ---- キー未設定時の表示用サンプル（実在の商品・価格ではありません） ----
export const sampleProvider = {
  name: "sample",
  enabled: () => true,
  async fetch(){
    return DEAL_QUERIES.flatMap(q => [1,2].map(n => ({
      source: "sample", cat: q.cat, catLabel: q.label, id: `s:${q.cat}${n}`,
      name: `【サンプル】${q.label}の表示例 ${n}（実在の商品ではありません）`,
      price: null, shop: "サンプルショップ", pointRate: 1, review: 0, reviewCount: 0, image: "",
      url: "", itemUrl: "", keyword: q.keyword, sample: true
    })));
  }
};
