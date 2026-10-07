// Harita kartı (Plan 38): katalogdaki harita bölümünü ve altlık dosyalarını okur; harita-ekle ve testler kullanır.
// katalog.harita = { surum, dosyalar: { leaflet, motor, stil }, lisanslar: [{ ad, lisans, dosya }],
//                    altliklar: [{ ad, etiket, dosya, durum, neZaman }] } — yollar şablon dizinine görelidir ("set/harita/altlik-dunya.js").
import fs from "node:fs";
import path from "node:path";

/** Set dosyalarının paketteki SABİT yolları (içerik katalogdaki dosyayla bayt bayt aynıdır; doğrulayıcı özetinden tanır). */
export const HARITA_PAKET = {
  leaflet: "assets/js/vendor/leaflet.js",
  motor: "assets/js/set-harita.js",
  stil: "assets/css/set-harita.css",
  altlik: (ad) => `assets/js/set-altlik-${ad}.js`,
};
export const ALTLIK_YOLU_RE = /^assets\/js\/set-altlik-([a-z0-9-]+)\.js$/;
const DURUMLAR = new Set(["taslak", "onayli", "emekli"]);
const AD_RE = /^[a-z0-9-]+$/;

export function haritaKatalogu(katalog) {
  if (!katalog.harita) throw new Error("katalog.json'da 'harita' bölümü yok");
  return katalog.harita;
}

/** Altlık dosyasını okur: `(window.__ktAltlik = …)["ad"] = {…};` satırındaki nesne. → { veri, kodlar: Map<kod, ad> (asıl katman) }. */
export function altlikOku(sablonDizin, altlik) {
  const metin = fs.readFileSync(path.join(sablonDizin, altlik.dosya), "utf8");
  const bas = metin.indexOf("] = {");
  const son = metin.lastIndexOf("};");
  if (bas < 0 || son < 0) throw new Error(`${altlik.dosya}: altlık biçimi tanınmadı`);
  const veri = JSON.parse(metin.slice(bas + 4, son + 1));
  const kodlar = new Map();
  for (const g of veri.topo.objects[veri.katmanlar[0]].geometries) kodlar.set(g.properties.k, g.properties.ad);
  return { veri, kodlar };
}

/** Altlığın asıl katmanını çokgenlere çözer (TopoJSON: delta + ölçek; ters yay ~i) → [{ k, cokgenler: [[dış halka, delik…]…] }], nokta [boylam, enlem]. */
export function altlikCokgenleri(veri) {
  const { topo } = veri, tr = topo.transform;
  const yaylar = topo.arcs.map((yay) => { let x = 0, y = 0; return yay.map((n) => (tr ? [(x += n[0]) * tr.scale[0] + tr.translate[0], (y += n[1]) * tr.scale[1] + tr.translate[1]] : n)); });
  const halka = (idler) => idler.flatMap((i, sira) => { const yay = i < 0 ? yaylar[~i].slice().reverse() : yaylar[i]; return sira ? yay.slice(1) : yay; });
  return topo.objects[veri.katmanlar[0]].geometries.filter((g) => g.arcs).map((g) => ({ k: g.properties.k, cokgenler: (g.type === "Polygon" ? [g.arcs] : g.arcs).map((p) => p.map(halka)) }));
}
function halkada([x, y], h) {
  let ic = false;
  for (let i = 0, j = h.length - 1; i < h.length; j = i++) {
    const [x1, y1] = h[i], [x2, y2] = h[j];
    if ((y1 > y) !== (y2 > y) && x < ((x2 - x1) * (y - y1)) / (y2 - y1) + x1) ic = !ic;
  }
  return ic;
}
/** [enlem, boylam] konumunu içeren yerin kodu (asıl katmanda); hiçbirinde değilse null. */
export function konumunYeri(cokgenler, [enlem, boylam]) {
  const n = [boylam, enlem];
  return cokgenler.find((f) => f.cokgenler.some((p) => halkada(n, p[0]) && !p.slice(1).some((d) => halkada(n, d))))?.k ?? null;
}

/** Kataloğun harita bölümü kendi içinde ve diskle tutarlı mı. Boş dizi = geçerli. */
export function haritaKataloguDenetle(katalog, sablonDizin) {
  const h = [];
  const k = katalog.harita;
  if (!k) return ["katalog.json'da 'harita' bölümü yok"];
  const varMi = (goreli) => typeof goreli === "string" && goreli.startsWith("set/harita/") && fs.existsSync(path.join(sablonDizin, goreli));
  for (const anahtar of ["leaflet", "motor", "stil"]) if (!varMi(k.dosyalar?.[anahtar])) h.push(`harita.dosyalar.${anahtar}: ${k.dosyalar?.[anahtar]} yok`);
  for (const l of k.lisanslar ?? []) if (!varMi(l.dosya)) h.push(`harita lisansı ${l.ad}: ${l.dosya} yok`);
  const gorulen = new Set();
  for (const a of k.altliklar ?? []) {
    if (!AD_RE.test(String(a.ad))) h.push(`altlık '${a.ad}': ad biçimi (a-z, 0-9, tire)`);
    if (gorulen.has(a.ad)) h.push(`altlık '${a.ad}' adı yineleniyor`);
    gorulen.add(a.ad);
    if (!DURUMLAR.has(a.durum)) h.push(`altlık '${a.ad}': durum '${a.durum}' (taslak | onayli | emekli)`);
    if (!a.etiket || !a.neZaman) h.push(`altlık '${a.ad}': etiket ve neZaman zorunlu`);
    if (!varMi(a.dosya)) { h.push(`altlık '${a.ad}': ${a.dosya} yok`); continue; }
    try {
      const { veri, kodlar } = altlikOku(sablonDizin, a);
      if (veri.ad !== a.ad) h.push(`altlık '${a.ad}': dosyadaki ad '${veri.ad}'`);
      if (!kodlar.size) h.push(`altlık '${a.ad}': asıl katman boş`);
    } catch (e) { h.push(`altlık '${a.ad}': ${e.message}`); }
  }
  if (!(k.altliklar ?? []).length) h.push("harita.altliklar boş");
  return h;
}
