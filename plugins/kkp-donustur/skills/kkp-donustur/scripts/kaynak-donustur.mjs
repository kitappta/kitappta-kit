// pandoc HTML çıkarımı (docx-cikar.mjs çıktısı) → kkp/1 paket İSKELETİ — deterministik, mekanik dönüşüm (üretimin 2. adımı).
// Etkileşim (Bölüm Tekrar, lab kartları), kutu kapsamı ve alt metni gibi yargı isteyen işler 3. adımda (skill: .claude/skills/kkp-kitap-uret) yapılır.
//
//   node scripts/kkp/kaynak-donustur.mjs <cikarim-dizini> <paket-dizini> [--kitap "Ad"] [--kaynak-adi x.docx] [--arac "…"]
//        [--onceki <onceki-paket-dizini | onceki.zip>] [--bolum NN] [--tarih YYYY-MM-DD] [--zip <dosya.zip>] [--baslik-sezgisi]
//
// Yaptıkları (docs/standart/kkp-v1-uretim-talimati.md kural numaralarıyla):
//   3  h1 sınırından bölümlere böler; NN = başlıktaki numara (Önsöz/Sunuş → 00 tek dosya, Ek → 80+, Kaynakça → 90); NN-slug.html TAM SAYFA
//      NN "BİRİNCİ BÖLÜM" gibi sıra sözcüğünden de okunur; boş başlıklar (sayfa sonuna başlık stili) ve Word İçindekiler satırları (_Toc) düşer;
//      --baslik-sezgisi: stilsiz Word'de
//      "BİRİNCİ BÖLÜM …" / "1.1 …" / "1.1.1 …" / tümü büyük harf kalın paragraflar h1/h2/h3 olur (İçindekiler artıkları ayıklanır) — 05.09 e2e bulgusu
//      (sabit başlık + section.kt-bolum + script satırları — çift tıklayınca yerelde açılır, doğrulayıcı başlığı atar); manifest + icindekiler
//   4  her metin bloğuna kitap-genel {tur}{NNNN} id; kutu adayları (Örnek/Alıştırma/Uyarı… paragrafı) div.kt-kutu; "Eşitlik/Şekil/Tablo N.M" anmaları <a href="#id">
//   5  blok MathML → p.kt-esitlik; "(N.M)" numarası ayıklanıp data-kt-eq + span.kt-eq-no; tekrar basılan numara -oN; numarasız eqx
//   3  pandoc dipnotları → bölüm sonunda section.kt-dipnotlar > aside.kt-dipnot#notNNNN > p#pNNNN; referans sup > a.kt-notref
//   8  görseller assets/media/sekil-N-M.uz (başlık yazısından) ya da gorsel-NNNN.uz; width/height dosyadan; alt; desteklenmeyen biçim raporlanır
//   6/7 sablon/kitap.css → assets/css/kitap.css, sablon/ortak.js → assets/js/ortak.js (manifest.ortak)
//   4  --onceki: önceki baskının id'leri metin/başlık-yolu/benzerlikle korunur, silinenler emekli (yeniden verilmez), kt-tekrar + bolum css/js taşınır; eşleşme raporu
// Çıktı: paket dizini (kkp-lint'e hazır) + <cikarim>/donusum-raporu.md|json. Girdi salt okunur.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseFragment, serializeOuter } from "parse5";
import { IZINLI_GORSEL, KUTU_RE, baslikYazisi, benzerlik, esitlikNo, gorselBoyutu, kutuAnahtari, normalize, pad4, slugla } from "./lib/ortak.mjs";
import { dizinZiple, zipiAc } from "./lib/zip.mjs";
import { sozlukDogrula } from "./ses/lib/sozluk.mjs";

const SURUM = "1.0";
// ───────────────────────── Argümanlar ─────────────────────────
const argv = process.argv.slice(2);
const DEGERLI = new Set(["--kitap", "--kaynak-adi", "--arac", "--onceki", "--bolum", "--tarih", "--zip"]);
const secenek = {};
const konum = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (DEGERLI.has(a)) { secenek[a] = argv[++i]; if (secenek[a] === undefined) hata(`${a} değer ister`, 2); continue; }
  if (a === "--baslik-sezgisi") { secenek[a] = true; continue; }
  if (a.startsWith("--")) hata(`Bilinmeyen seçenek ${a}`, 2);
  konum.push(a);
}
const [cikarimArg, paketArg] = konum;
if (!cikarimArg || !paketArg || konum.length > 2) {
  console.error('Kullanım: node scripts/kkp/kaynak-donustur.mjs <cikarim-dizini> <paket-dizini> [--kitap "Ad"] [--kaynak-adi x.docx] [--arac "…"] [--onceki <dizin | onceki.zip>] [--bolum NN] [--tarih YYYY-MM-DD] [--zip <dosya.zip>] [--baslik-sezgisi]');
  process.exit(2);
}
function hata(m, kod = 1) { console.error("HATA: " + m); process.exit(kod); }
const CIKARIM = path.resolve(cikarimArg);
const PAKET = path.resolve(paketArg);
// Şablon dizini script'in yanındadır: repoda scripts/kkp/sablon, editör kitinde arac/sablon (fileURLToPath — Windows'ta `C:\C:\…` üretmez)
const SABLON = path.join(path.dirname(fileURLToPath(import.meta.url)), "sablon");
const kaynakHtmlYolu = path.join(CIKARIM, "kaynak.html");
if (!fs.existsSync(kaynakHtmlYolu)) hata(`${kaynakHtmlYolu} yok — önce docx-cikar.mjs koş.`);
const cikarim = fs.existsSync(path.join(CIKARIM, "cikarim.json")) ? JSON.parse(fs.readFileSync(path.join(CIKARIM, "cikarim.json"), "utf8")) : {};
const KITAP = secenek["--kitap"] ?? "";
const KAYNAK_ADI = secenek["--kaynak-adi"] ?? cikarim.kaynak ?? "kaynak.docx";
const ARAC = secenek["--arac"] ?? `kkp-kitap-uret (pandoc ${cikarim.pandoc ?? "?"} + kaynak-donustur.mjs ${SURUM})`;
const TARIH = secenek["--tarih"] ?? new Date().toISOString().slice(0, 10);
// --onceki: dizin ya da zip (panelden "Düzeltilmiş paketi indir"); zip <cikarim>/onceki/ dizinine açılır (önce silinir) — unzip ikilisi gerekmez
let ONCEKI = secenek["--onceki"] ? path.resolve(secenek["--onceki"]) : null;
if (ONCEKI && /\.zip$/i.test(ONCEKI)) {
  if (!fs.existsSync(ONCEKI)) hata(`--onceki zip'i yok: ${ONCEKI}`);
  const acilan = path.join(CIKARIM, "onceki");
  fs.rmSync(acilan, { recursive: true, force: true });
  try { zipiAc(ONCEKI, acilan); } catch (e) { hata(`--onceki zip'i açılamadı: ${e.message}`); }
  ONCEKI = acilan;
}
const BOLUM_ZORLA = secenek["--bolum"] ? Number(secenek["--bolum"]) : null;
if (BOLUM_ZORLA !== null && !(Number.isInteger(BOLUM_ZORLA) && BOLUM_ZORLA >= 1 && BOLUM_ZORLA <= 79)) hata("--bolum 1–79 arası tam sayı olmalı", 2);
if (ONCEKI && !fs.existsSync(path.join(ONCEKI, "manifest.json"))) hata(`--onceki dizininde manifest.json yok: ${ONCEKI}`);
if (PAKET === CIKARIM || PAKET.startsWith(CIKARIM + path.sep) || CIKARIM.startsWith(PAKET + path.sep)) hata("Paket dizini çıkarım dizininin içinde/dışında iç içe olamaz.");
if (fs.existsSync(PAKET)) {
  const icerik = fs.readdirSync(PAKET).filter((x) => x !== ".DS_Store");
  const kkpMi = icerik.every((x) => x === "manifest.json" || x === "assets" || /^\d{2}-[a-z0-9-]+\.html$/.test(x));
  if (icerik.length && !kkpMi) hata(`${PAKET} boş değil ve bir kkp çıktısı değil (manifest.json/NN-slug.html dışında dosya var) — yanlışlıkla silmemek için durduruldu.`);
  fs.rmSync(PAKET, { recursive: true, force: true });
}
fs.mkdirSync(PAKET, { recursive: true });
for (const d of ["assets/css", "assets/js", "assets/media"]) fs.mkdirSync(path.join(PAKET, d), { recursive: true });

// ───────────────────────── DOM yardımcıları (parse5) ─────────────────────────
const NS = "http://www.w3.org/1999/xhtml";
const attr = (n, k) => (n.attrs || []).find((a) => a.name === k)?.value;
const setAttr = (n, k, v) => { const a = (n.attrs || []).find((x) => x.name === k); if (a) a.value = v; else (n.attrs ||= []).push({ name: k, value: v }); };
const delAttr = (n, k) => { if (n.attrs) n.attrs = n.attrs.filter((a) => a.name !== k); };
const isEl = (n) => !!n && typeof n.tagName === "string";
const classes = (n) => (attr(n, "class") || "").split(/\s+/).filter(Boolean);
const hasClass = (n, c) => classes(n).includes(c);
const addClass = (n, c) => { const cs = classes(n); if (!cs.includes(c)) setAttr(n, "class", [...cs, c].join(" ")); };
const kids = (n) => (n.childNodes || []).filter(isEl);
const walk = (n, f) => { f(n); for (const c of [...(n.childNodes || [])]) walk(c, f); };
const text = (n) => { let s = ""; walk(n, (x) => { if (x.nodeName === "#text") s += x.value; }); return s; };
const METIN_DISI = new Set(["annotation", "annotation-xml", "script", "style", "template"]);
/** Blok metni: TeX annotation/script/style dışarıda (doğrulayıcı ve runtime ile aynı kural). */
const blokMetni = (n) => { let s = ""; (function gez(x) { if (x.nodeName === "#text") { s += x.value; return; } if (isEl(x) && METIN_DISI.has(x.tagName)) return; for (const c of x.childNodes || []) gez(c); })(n); return s; };
const detach = (n) => { const p = n.parentNode; if (!p) return; p.childNodes = p.childNodes.filter((c) => c !== n); n.parentNode = null; };
const append = (p, n) => { detach(n); (p.childNodes ||= []).push(n); n.parentNode = p; };
const insertBefore = (p, n, ref) => { detach(n); const i = p.childNodes.indexOf(ref); if (i < 0) return append(p, n); p.childNodes.splice(i, 0, n); n.parentNode = p; };
const replaceWith = (eski, ...yeniler) => { const p = eski.parentNode; const i = p.childNodes.indexOf(eski); for (const y of yeniler) detach(y); p.childNodes.splice(i, 1, ...yeniler); for (const y of yeniler) y.parentNode = p; eski.parentNode = null; };
const unwrap = (n) => { const cocuklar = [...(n.childNodes || [])]; replaceWith(n, ...cocuklar); return cocuklar; };
const eleman = (tag, attrs = {}) => ({ nodeName: tag, tagName: tag, attrs: Object.entries(attrs).map(([name, value]) => ({ name, value })), namespaceURI: NS, childNodes: [], parentNode: null });
const metinDugumu = (s) => ({ nodeName: "#text", value: s, parentNode: null });
function kardes(n, yon) {
  const p = n.parentNode; if (!p) return null;
  let i = p.childNodes.indexOf(n) + yon;
  for (; i >= 0 && i < p.childNodes.length; i += yon) { const c = p.childNodes[i]; if (isEl(c)) return c; if (c.nodeName === "#text" && c.value.trim()) return null; }
  return null;
}
const sonrakiEl = (n) => kardes(n, 1);
const oncekiEl = (n) => kardes(n, -1);
const atali = (n, f) => { for (let p = n.parentNode; p; p = p.parentNode) if (isEl(p) && f(p)) return true; return false; };
const kisalt = (s, n = 60) => (s.length > n ? s.slice(0, n - 1) + "…" : s);

// ───────────────────────── Id havuzu ─────────────────────────
const METIN_BLOKLARI = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "figcaption", "blockquote", "dt", "dd", "summary", "pre"]);
const TUR_KODU = { h1: "h", h2: "h", h3: "h", h4: "h", h5: "h", h6: "h", p: "p", li: "li", td: "td", th: "th", blockquote: "bq", dt: "dt", dd: "dd", summary: "sum", pre: "pre" };
const TUR_RE = /^(notref|not|kutu|kart|sek|tab|kay|eqx|sum|pre|bq|dt|dd|td|th|li|h|p)(\d{4,9})(?:-alt)?$/;
const ID_RE = /^[a-z][a-z0-9-]*$/;
const kullanilan = new Set();
const sayac = new Map();
const idSayimi = {};
function idKaydet(id) { kullanilan.add(id); const m = TUR_RE.exec(id); if (m) sayac.set(m[1], Math.max(sayac.get(m[1]) ?? 0, +m[2])); }
function uret(tur) { let n = sayac.get(tur) ?? 0; let id; do { n++; id = tur + pad4(n); } while (kullanilan.has(id)); sayac.set(tur, n); kullanilan.add(id); return id; }
const say = (tur) => { idSayimi[tur] = (idSayimi[tur] ?? 0) + 1; };

// ───────────────────────── Rapor ─────────────────────────
const rapor = { surum: SURUM, tarih: TARIH, kaynak: KAYNAK_ADI, bolumler: [], idSayilari: idSayimi, esitlikler: { numarali: 0, numarasiz: 0, tekrar: [], gecersiz: [] }, sekiller: [], tablolar: [], dipnotlar: 0, kutular: [], etkilesimIstekleri: [], okunusSatirlari: [], linkler: { kurulan: 0, cozulemeyen: [], icLink: { yeniden: 0, cozulemeyen: [] } }, gorseller: { kopyalanan: [], desteklenmeyen: [], altEksik: [] }, uyarilar: [], eslesme: null };
const uyar = (m) => rapor.uyarilar.push(m);

// ───────────────────────── Önceki baskı ─────────────────────────
let onceki = null;
if (ONCEKI) {
  const man = JSON.parse(fs.readFileSync(path.join(ONCEKI, "manifest.json"), "utf8"));
  onceki = { bloklar: [], byText: new Map(), sekiller: new Map(), tablolar: new Map(), dipnotlar: [], kutular: new Map(), eqx: new Map(), kartlar: [], tekrar: new Map(), bolumDosya: new Map(), kullanilanEski: new Set(), toplam: 0, metinIdler: new Set() };
  for (const b of man.bolumler) {
    const dosya = path.join(ONCEKI, b.dosya);
    if (!fs.existsSync(dosya)) { uyar(`Önceki baskıda ${b.dosya} yok (manifest'te var) — atlandı`); continue; }
    onceki.bolumDosya.set(b.id, b);
    const frag = parseFragment(fs.readFileSync(dosya, "utf8"));
    let baslik = "", sira = 0;
    walk(frag, (n) => {
      if (!isEl(n)) return;
      const id = attr(n, "id"), tag = n.tagName;
      if (id) idKaydet(id);
      if (id && (METIN_BLOKLARI.has(tag) || (tag === "aside" && hasClass(n, "kt-dipnot")))) onceki.metinIdler.add(id); // oran paydası: not bağlanabilen bloklar
      if (tag === "section" && hasClass(n, "kt-tekrar")) { onceki.tekrar.set(b.id, n); return; }
      if (atali(n, (p) => p.tagName === "section" && hasClass(p, "kt-tekrar"))) return;
      if (/^h[1-6]$/.test(tag) && id) baslik = normalize(blokMetni(n));
      const m = id ? TUR_RE.exec(id) : null;
      if (m && !hasClass(n, "kt-esitlik") && !["sek", "tab", "not", "notref", "kutu", "kart"].includes(m[1])) {
        const kayit = { id, tur: m[1], norm: normalize(blokMetni(n)), bolum: b.id, baslik, sira: sira++ };
        onceki.bloklar.push(kayit);
        const k = kayit.tur + "|" + kayit.norm;
        if (!onceki.byText.has(k)) onceki.byText.set(k, []);
        onceki.byText.get(k).push(kayit);
        if (METIN_BLOKLARI.has(tag)) onceki.toplam++;
      }
      if (tag === "p" && hasClass(n, "kt-esitlik") && id) {
        if (METIN_BLOKLARI.has(tag)) onceki.toplam++;
        if (id.startsWith("eqx")) { const tex = normalize(text(n)); if (!onceki.eqx.has(tex)) onceki.eqx.set(tex, []); onceki.eqx.get(tex).push(id); }
      }
      if (tag === "figure" && id) { const fc = kids(n).find((c) => c.tagName === "figcaption"); const by = fc ? baslikYazisi(blokMetni(fc)) : null; if (by) onceki.sekiller.set(by.no, id); }
      if (tag === "table" && id) { const cap = kids(n).find((c) => c.tagName === "caption"); const by = cap ? baslikYazisi(blokMetni(cap)) : null; if (by) onceki.tablolar.set(by.no, id); }
      if (tag === "aside" && hasClass(n, "kt-dipnot") && id) onceki.dipnotlar.push({ id, norm: normalize(blokMetni(n)) });
      if (tag === "div" && hasClass(n, "kt-kutu") && id) { const ka = kutuAnahtari(blokMetni(n)); if (ka?.anahtar) onceki.kutular.set(ka.anahtar, id); }
      if (tag === "details" && hasClass(n, "kt-kart") && id) { const s = kids(n).find((c) => c.tagName === "summary"); onceki.kartlar.push({ id, bolum: b.id, baslik, ozet: kisalt(normalize(s ? blokMetni(s) : "")) }); }
    });
  }
  rapor.eslesme = { oncekiToplamMetinBlok: onceki.toplam, korunan: 0, yeni: 0, kararsiz: [], emekli: [], tasinanTekrar: [], tasinmayanKart: onceki.kartlar, tasinanDosya: [] };
}
function eslestir(tur, norm, bolum, baslikNorm) {
  if (!onceki) return null;
  const tamListe = onceki.byText.get(tur + "|" + norm) ?? [];
  const tam = tamListe.find((k) => !onceki.kullanilanEski.has(k.id) && k.bolum === bolum) ?? tamListe.find((k) => !onceki.kullanilanEski.has(k.id));
  if (tam) { onceki.kullanilanEski.add(tam.id); return tam.id; }
  if (!norm) return null;
  let enIyi = null, enIyiSkor = 0;
  for (const asama of [0, 1]) {
    for (const k of onceki.bloklar) {
      if (k.tur !== tur || onceki.kullanilanEski.has(k.id)) continue;
      if (asama === 0 ? k.baslik !== baslikNorm : k.bolum !== bolum) continue;
      const s = benzerlik(k.norm, norm);
      if (s > enIyiSkor) { enIyiSkor = s; enIyi = k; }
    }
    const esik = asama === 0 ? 0.5 : 0.75;
    if (enIyi && enIyiSkor >= esik) {
      onceki.kullanilanEski.add(enIyi.id);
      if (enIyiSkor < 0.75) rapor.eslesme.kararsiz.push({ id: enIyi.id, benzerlik: +enIyiSkor.toFixed(2), eski: kisalt(enIyi.norm), yeni: kisalt(norm) });
      return enIyi.id;
    }
    enIyi = null; enIyiSkor = 0;
  }
  return null;
}
function idVer(tur, el, ctx) {
  const norm = normalize(blokMetni(el));
  let id = eslestir(tur, norm, ctx.bolum, ctx.baslikNorm);
  if (id) rapor.eslesme.korunan++;
  else { id = uret(tur); if (onceki) rapor.eslesme.yeni++; }
  setAttr(el, "id", id);
  say(tur);
  return id;
}
function eskiIdAl(id) { if (!id || !onceki || onceki.kullanilanEski.has(id)) return null; onceki.kullanilanEski.add(id); rapor.eslesme.korunan++; return id; }

// ───────────────────────── Kaynağı oku, dipnotları ve bölümleri ayır ─────────────────────────
const frag = parseFragment(fs.readFileSync(kaynakHtmlYolu, "utf8"));

// ── Ön işlem 1 (her zaman): boş başlıklar. Word'de sayfa sonu/boş satıra başlık stili verilmiş olur (Türkiye Ekonomisi: 119 boş h1) →
//    İçindekiler'e boş satır sızar (KKP-MAN-02). Metinsiz başlık düşer; içinde görsel varsa paragraf olur.
const buyukTr = (t) => t.toLocaleUpperCase("tr-TR");
{
  let bos = 0;
  walk(frag, (n) => {
    if (!isEl(n) || !/^h[1-6]$/.test(n.tagName) || text(n).trim()) return;
    let gorsel = false; walk(n, (x) => { if (isEl(x) && (x.tagName === "img" || x.tagName === "math")) gorsel = true; });
    if (gorsel) n.tagName = n.nodeName = "p"; else detach(n);
    bos++;
  });
  if (bos) uyar(`${bos} boş başlık düşürüldü (Word'de sayfa sonu/boş satıra başlık stili verilmiş; görsel taşıyanlar paragraf oldu)`);
  // Word İçindekiler'i: metni tümüyle `_Toc…` hedefli bağlantı olan paragraflar (pandoc TOC alanını böyle basar; kırık alan file:///…#_Toc olur).
  // İçindekiler'i okuyucu manifest'ten basar (kural 1) — kaynaktaki tablo düşer.
  let toc = 0;
  for (const n of [...frag.childNodes]) {
    if (!isEl(n) || n.tagName !== "p") continue;
    const linkler = []; walk(n, (x) => { if (isEl(x) && x.tagName === "a" && /_Toc\d+/.test(attr(x, "href") || "")) linkler.push(x); });
    if (!linkler.length) continue;
    const linkMetni = linkler.map((a) => text(a)).join("").replace(/\s+/g, "");
    if (linkMetni && linkMetni === text(n).replace(/\s+/g, "")) { detach(n); toc++; }
  }
  if (toc) uyar(`${toc} Word İçindekiler satırı düşürüldü (_Toc bağlantılı paragraflar; İçindekiler'i okuyucu basar)`);
}
// ── Türkçe sıra sözcüğü → bölüm numarası ("BİRİNCİ BÖLÜM – …" → 1, "ON İKİNCİ BÖLÜM" → 12)
const SIRA_SOZ = { BİRİNCİ: 1, İKİNCİ: 2, ÜÇÜNCÜ: 3, DÖRDÜNCÜ: 4, BEŞİNCİ: 5, ALTINCI: 6, YEDİNCİ: 7, SEKİZİNCİ: 8, DOKUZUNCU: 9, ONUNCU: 10, ONBİRİNCİ: 11, ONİKİNCİ: 12, ONÜÇÜNCÜ: 13, ONDÖRDÜNCÜ: 14, ONBEŞİNCİ: 15, ONALTINCI: 16, ONYEDİNCİ: 17, ONSEKİZİNCİ: 18, ONDOKUZUNCU: 19, YİRMİNCİ: 20 };
function siraSozNo(t) {
  const m = /^(\p{Lu}+(?:\s+\p{Lu}+)?)\s*BÖLÜM(?![\p{L}\p{N}])/u.exec(buyukTr(t).replace(/\s+/g, " ").trim());
  return m ? (SIRA_SOZ[m[1].replace(/\s+/g, "")] ?? null) : null;
}
// ── Ön işlem 2 (--baslik-sezgisi): stilsiz Word. Kalın (tümü strong) kısa paragraflar: "BİRİNCİ BÖLÜM …"/"N. BÖLÜM" → h1 (numara),
//    tümü BÜYÜK harf rakamsız kısa → h1 yalnız İçindekiler'de yankısı varsa (aynı metin daha önce kalın paragraf) ve ≥ 15 blok taşıyorsa
//    (KAYNAKÇA/KAYNAKLAR ≥ 5); "1.1 …" → h2, "1.1.1 …" → h3. İçindekiler tuzağı: aday, sonraki aynı/üst seviye adaya ya da mevcut h1'e
//    kadar yeterli blok taşımıyorsa (h1 ≥ 5, h2/h3 ≥ 2) paragraf kalır. Word alan kodu
//    artıkları (PAGEREF _Toc / TOC \o — .doc→.docx dönüşümünde açığa çıkar) düşer. "BİRİNCİ BÖLÜM" + hemen ardından BÜYÜK başlık → tek h1.
const SEZGI = !!secenek["--baslik-sezgisi"];
if (SEZGI) {
  const kalinMi = (el) => { let ok = true, dolu = false; (function gez(x, k) { if (x.nodeName === "#text") { if (x.value.trim()) { dolu = true; if (!k) ok = false; } return; } if (!isEl(x)) return; const kk = k || x.tagName === "strong" || x.tagName === "b"; for (const c of x.childNodes || []) gez(c, kk); })(el, false); return dolu && ok; };
  const kalinAc = (el) => { const yeni = []; (function gez(x) { for (const c of [...(x.childNodes || [])]) { if (isEl(c) && (c.tagName === "strong" || c.tagName === "b")) gez(c); else yeni.push(c); } })(el); el.childNodes = yeni; for (const c of yeni) c.parentNode = el; };
  let toc = 0;
  for (const n of [...frag.childNodes]) { if (isEl(n) && (n.tagName === "p" || n.tagName === "blockquote") && /PAGEREF\s+_Toc|^\s*TOC\s+\\o/.test(text(n))) { detach(n); toc++; } }
  const blok = [...frag.childNodes].filter(isEl);
  const adaylar = [];
  for (let i = 0; i < blok.length; i++) {
    const n = blok[i]; if (n.tagName !== "p" || !kalinMi(n)) continue;
    const t = text(n).replace(/\s+/g, " ").trim(); if (!t || t.length > 120) continue;
    const dm = /^(\d{1,2})\.?\s*BÖLÜM(?![\p{L}\p{N}])/u.exec(buyukTr(t));
    const nn = siraSozNo(t) ?? (dm ? +dm[1] : null);
    if (nn !== null) { adaylar.push({ i, el: n, seviye: 1, nn, metin: t }); continue; }
    if (/^\d{1,2}\.\d{1,2}\.\d{1,2}\.?\s*\S/.test(t)) { adaylar.push({ i, el: n, seviye: 3, metin: t }); continue; }
    if (/^\d{1,2}\.\d{1,2}\.?\s*\S/.test(t)) { adaylar.push({ i, el: n, seviye: 2, metin: t }); continue; }
    if (t.length <= 80 && /\p{L}/u.test(t) && t === buyukTr(t) && !/\p{N}/u.test(t)) {
      const onceki = blok[i - 1];
      if (onceki && /^h[1-6]$/.test(onceki.tagName) && text(onceki).replace(/\s+/g, " ").trim() === t) continue;   // başlığın hemen altındaki tekrar satırı
      const kaynakca = /^(KAYNAKÇA|KAYNAKLAR|BİBLİYOGRAFYA)$/u.test(t);
      const yanki = adaylar.some((b) => b.buyuk && b.metin === t);   // İçindekiler'de geçen bölüm adı: gövdede yeniden görülünce güçlü aday
      adaylar.push({ i, el: n, seviye: 1, nn: null, metin: t, buyuk: true, esik: kaynakca ? 5 : yanki ? 15 : Infinity });
    }
  }
  // "BİRİNCİ BÖLÜM" + hemen ardından BÜYÜK başlık → birleştir
  for (let k = 0; k < adaylar.length - 1; k++) {
    const a = adaylar[k], b = adaylar[k + 1];
    if (a.seviye === 1 && a.nn !== null && !/BÖLÜM\s*\S/u.test(buyukTr(a.metin).replace(/\s+/g, " ")) && b.buyuk && b.i === a.i + 1) {
      a.metin = `${a.metin} – ${b.metin}`; a.birlesik = b.el; adaylar.splice(k + 1, 1);
    }
  }
  const h1Konum = new Set(blok.map((n, i) => (n.tagName === "h1" ? i : -1)).filter((i) => i >= 0));
  const kabul = [];
  for (const a of adaylar) {
    let son = blok.length;
    for (let j = a.i + 1; j < blok.length; j++) { if (h1Konum.has(j) || adaylar.some((b) => b.i === j && b.seviye <= a.seviye)) { son = j; break; } }
    const icerik = son - a.i - 1 - (a.birlesik ? 1 : 0);
    if (icerik >= (a.esik ?? (a.seviye === 1 ? 5 : 2))) kabul.push(a);
  }
  const sayim = { h1: 0, h2: 0, h3: 0 };
  for (const a of kabul) {
    a.el.tagName = a.el.nodeName = "h" + a.seviye; kalinAc(a.el);
    if (a.birlesik) { a.el.childNodes = [metinDugumu(a.metin)]; a.el.childNodes[0].parentNode = a.el; detach(a.birlesik); }
    sayim["h" + a.seviye]++;
  }
  rapor.sezgi = { tocArtigi: toc, aday: adaylar.length, kabul: kabul.length, ...sayim, h1ler: kabul.filter((a) => a.seviye === 1).map((a) => a.metin) };
  uyar(`Başlık sezgisi: ${toc} İçindekiler artığı düşürüldü; ${adaylar.length} kalın paragraf adayından ${kabul.length} başlık oldu (h1 ${sayim.h1} · h2 ${sayim.h2} · h3 ${sayim.h3}); h1: ${rapor.sezgi.h1ler.map((x) => `"${kisalt(x, 50)}"`).join(", ") || "(yok)"} — kaynak Word'e başlık stili verilirse bu seçeneğe gerek kalmaz`);
}
const pandocIdler = new Map();
walk(frag, (n) => { if (isEl(n)) { const id = attr(n, "id"); if (id) pandocIdler.set(id, n); } });
const fnMap = new Map();
for (const n of kids(frag)) {
  if (n.tagName === "section" && (attr(n, "id") === "footnotes" || hasClass(n, "footnotes"))) {
    walk(n, (x) => { if (isEl(x) && x.tagName === "li" && /^fn\d+$/.test(attr(x, "id") || "")) fnMap.set(attr(x, "id"), x); });
    detach(n);
  }
}
const gruplar = [];
let grup = { baslik: null, dugumler: [] };
for (const n of [...frag.childNodes]) {
  if (isEl(n) && n.tagName === "h1") { gruplar.push(grup); grup = { baslik: n, dugumler: [] }; }
  else grup.dugumler.push(n);
}
gruplar.push(grup);

const durum = { ek: 0, sonNN: 0 };
function siniflandir(g, bolumGoruldu) {
  if (!g.baslik) return { tur: "on", nn: 0 };
  const t = text(g.baslik).trim();
  const T = buyukTr(t).replace(/\s+/g, " ");   // /iu Türkçe İ'yi eşlemez (basit case folding) — büyük harfe çevirip karşılaştır
  let m = /^(\d{1,2})(?:\s*[.:)\-–—]\s*|\s+)/.exec(t);
  if (m) return { tur: "bolum", nn: +m[1] };
  const so = siraSozNo(t);
  if (so !== null) return { tur: "bolum", nn: so };
  if (/^(KAYNAKÇA|KAYNAKLAR|BİBLİYOGRAFYA|REFERENCES)(?![\p{L}\p{N}])/u.test(T)) return { tur: "kaynakca", nn: 90 };
  if (/^(EK|EKLER|APPENDIX)(?![\p{L}\p{N}])/u.test(T)) return { tur: "ek", nn: 80 + durum.ek++ };
  if (/^(ÖNSÖZ|ÖN SÖZ|SUNUŞ|TEŞEKKÜR|İÇİNDEKİLER|ÖNSÖZ VE TEŞEKKÜR)(?![\p{L}\p{N}])/u.test(T)) return { tur: "on", nn: 0 };
  if (!bolumGoruldu && /^GİRİŞ$/u.test(T)) return { tur: "on", nn: 0 };   // ilk bölümden önceki "Giriş" ön sayfadır; bölüm içindeki GİRİŞ'e dokunulmaz
  return { tur: "bolum", nn: null };
}
const bolumler = [];
const onGruplar = [];
let bolumGoruldu = false;
for (const g of gruplar) {
  const s = siniflandir(g, bolumGoruldu);
  if (s.tur !== "on") bolumGoruldu = true;
  if (s.tur === "on") { if (g.baslik || g.dugumler.some((n) => isEl(n) || (n.nodeName === "#text" && n.value.trim()))) onGruplar.push(g); continue; }
  bolumler.push({ ...s, grup: g, baslikMetni: text(g.baslik).trim() });
}
if (BOLUM_ZORLA !== null) {   // tek bölümlük pakette --bolum kesindir: başlıktaki sayı ("19. Yüzyıl Osmanlı Ekonomisi") bölüm numarası değildir
  const tekler = bolumler.filter((b) => b.tur === "bolum");
  if (tekler.length !== 1) hata(`--bolum yalnız tek bölümlük pakette kullanılır (kaynakta ${tekler.length} bölüm var)`);
  if (tekler[0].nn !== null && tekler[0].nn !== BOLUM_ZORLA) uyar(`Başlıktaki sayı (${tekler[0].nn}) yerine --bolum ${BOLUM_ZORLA} kullanıldı`);
  tekler[0].nn = BOLUM_ZORLA;
}
let sonNN = 0;
for (const b of bolumler) {
  if (b.tur !== "bolum") continue;
  if (b.nn === null) { b.nn = sonNN + 1; uyar(`"${kisalt(b.baslikMetni)}" başlığında bölüm numarası yok — ${pad4(b.nn).slice(2)} verildi (kaynakta numara varsa başlığa yaz ya da tek bölümde --bolum NN kullan)`); }
  sonNN = Math.max(sonNN, b.nn);
}
if (onGruplar.length) {
  const ilk = onGruplar.find((g) => g.baslik);
  const dugumler = [];
  for (const g of onGruplar) {
    if (g.baslik && g !== ilk) { g.baslik.tagName = g.baslik.nodeName = "h2"; dugumler.push(g.baslik); uyar(`Ön sayfalarda ikinci h1 "${kisalt(text(g.baslik).trim())}" h2'ye indirildi (00-on-sayfalar tek h1 taşır)`); }
    dugumler.push(...g.dugumler);
  }
  let baslik = ilk?.baslik;
  if (!baslik) { baslik = eleman("h1"); append(baslik, metinDugumu("Ön Sayfalar")); uyar("Ön sayfalar başlıksız — sentetik h1 \"Ön Sayfalar\" eklendi"); }
  bolumler.unshift({ tur: "on", nn: 0, grup: { baslik, dugumler }, baslikMetni: text(baslik).trim() });
}
{
  const gorulen = new Map();
  for (const b of bolumler) {
    if (gorulen.has(b.nn)) hata(`İki bölüm aynı numarayı taşıyor (${b.nn}): "${kisalt(gorulen.get(b.nn))}" ve "${kisalt(b.baslikMetni)}" — kaynaktaki numaralandırmayı düzelt.`);
    gorulen.set(b.nn, b.baslikMetni);
  }
}
bolumler.sort((a, b) => a.nn - b.nn);
for (const b of bolumler) {
  const nn = pad4(b.nn).slice(2);
  b.id = "b" + nn;
  b.slug = b.tur === "on" ? "on-sayfalar" : b.tur === "kaynakca" ? "kaynakca" : slugla(b.baslikMetni);
  b.dosya = `${nn}-${b.slug}.html`;
  kullanilan.add(b.id);
}

// ───────────────────────── Dönüşüm ─────────────────────────
const esitlikler = [];
const sekMap = new Map(), tabMap = new Map(), kutuMap = new Map();
const gorselHedefleri = new Map();
const hedefAdlari = new Set();
let gorselSayac = 0;
// Görev A11 (Plan 28): "[Okunuş: X = Y]" satırlarından toplanan ses sözlüğü taslağı girdileri (anahtar → okunuş).
const sesSozlukGirdileri = {};
const sesSozlukNotlar = {};

function baslikIsle(h, ctx) {
  const seviye = +h.tagName[1];
  const id = idVer("h", h, ctx);
  ctx.baslikNorm = normalize(blokMetni(h));
  const madde = { baslik: text(h).replace(/\s+/g, " ").trim(), hedef: id };
  if (seviye === 1) { ctx.toc = madde; ctx.sonH2 = null; }
  else if (seviye === 2 && ctx.toc) { (ctx.toc.alt ||= []).push(madde); ctx.sonH2 = madde; }
  else if (seviye === 3 && ctx.toc) { const ebeveyn = ctx.sonH2 ?? ctx.toc; (ebeveyn.alt ||= []).push(madde); }
}

function esitlikIsle(p, math, duzMetin, ctx) {
  let numara = duzMetin ? esitlikNo(duzMetin) : null;
  if (duzMetin && !numara) rapor.esitlikler.gecersiz.push(`${ctx.bolum}: "${duzMetin}" numara olarak çözülemedi (harf ekli/tek parça) → eqx`);
  // Sayı MathML'in içindeyse (Word: "…\quad(2.1)"): sondaki mspace* mo( mn mo) düğümleri ayıklanır
  const semantics = kids(math).find((c) => c.tagName === "semantics");
  const govde = semantics ? kids(semantics).find((c) => c.tagName !== "annotation" && c.tagName !== "annotation-xml") : kids(math)[0];
  if (!numara && govde) {
    const cocuk = kids(govde);
    const n = cocuk.length;
    if (n >= 3 && cocuk[n - 1].tagName === "mo" && text(cocuk[n - 1]).trim() === ")" && cocuk[n - 2].tagName === "mn" && cocuk[n - 3].tagName === "mo" && text(cocuk[n - 3]).trim() === "(") {
      const aday = esitlikNo(text(cocuk[n - 2]));
      if (aday) {
        numara = aday;
        let sil = 3;
        while (n - sil - 1 >= 0 && cocuk[n - sil - 1].tagName === "mspace") sil++;
        for (const c of cocuk.slice(n - sil)) detach(c);
        const ann = semantics ? kids(semantics).find((c) => c.tagName === "annotation") : null;
        if (ann) for (const t of ann.childNodes) if (t.nodeName === "#text") t.value = t.value.replace(/(?:\\(?:quad|qquad|;|,|:|!|hspace\{[^}]*\})|\s|~)*\(\s*\d+\s*[.,]\s*\d+\s*\)\s*$/, "");
      }
    }
  }
  for (const c of [...p.childNodes]) if (c !== math) detach(c);
  setAttr(p, "class", "kt-esitlik");
  delAttr(p, "id");
  if (numara) { const span = eleman("span", { class: "kt-eq-no" }); append(span, metinDugumu(`(${numara})`)); append(p, metinDugumu(" ")); append(p, span); }
  esitlikler.push({ p, numara, ctx, sira: esitlikler.length });
}

function gorselIsle(img, no, altAday, ctx) {
  img._islendi = true;
  const src = attr(img, "src") || "";
  const kaynak = path.resolve(CIKARIM, src);
  const var_ = !!src && fs.existsSync(kaynak);
  const uz = path.extname(kaynak).slice(1).toLowerCase();
  const izinli = IZINLI_GORSEL.has(uz);
  let hedef = gorselHedefleri.get(kaynak);
  if (!hedef) {
    let ad = no ? `sekil-${no.replace(".", "-")}` : `gorsel-${pad4(++gorselSayac)}`;
    const uzHedef = izinli ? (uz === "jpeg" ? "jpg" : uz) : "png";
    let deneme = `assets/media/${ad}.${uzHedef}`;
    for (let i = 2; hedefAdlari.has(deneme); i++) deneme = `assets/media/${ad}-${i}.${uzHedef}`;
    hedef = deneme;
    hedefAdlari.add(hedef);
    gorselHedefleri.set(kaynak, hedef);
    if (var_ && izinli) { fs.copyFileSync(kaynak, path.join(PAKET, hedef)); rapor.gorseller.kopyalanan.push(`${src} → ${hedef}`); }
    else rapor.gorseller.desteklenmeyen.push(`${ctx.bolum}: ${src || "(src yok)"} → ${hedef} — ${!var_ ? "dosya yok" : `${uz} desteklenmiyor`}; elle PNG/SVG/WebP'ye çevirip bu yola koy`);
  }
  setAttr(img, "src", hedef);
  delAttr(img, "style");
  const dosya = path.join(PAKET, hedef);
  const boyut = fs.existsSync(dosya) ? gorselBoyutu(new Uint8Array(fs.readFileSync(dosya))) : null;
  if (boyut) { setAttr(img, "width", String(boyut.width)); setAttr(img, "height", String(boyut.height)); }
  else if (!attr(img, "width") || !attr(img, "height")) { setAttr(img, "width", "800"); setAttr(img, "height", "600"); uyar(`${ctx.bolum}: ${hedef} boyutu okunamadı — 800×600 yazıldı, gerçek boyutla değiştir`); }
  let alt = (attr(img, "alt") || "").trim();
  if (!alt || /^(https?:|[\w-]+\.(png|jpe?g|gif|webp|svg))/i.test(alt)) alt = "";
  if (!alt) { alt = (altAday || "").replace(/\s+/g, " ").trim(); if (alt) rapor.gorseller.altEksik.push(`${hedef}: alt başlık yazısından alındı — gerçek betimleme yaz`); }
  if (!alt) { alt = no ? `Şekil ${no}` : "Görsel"; rapor.gorseller.altEksik.push(`${hedef}: alt yok — betimleme yaz`); }
  setAttr(img, "alt", alt);
  setAttr(img, "loading", "lazy");
  setAttr(img, "decoding", "async");
}

function figureTamamla(fig, img, capNodes, ctx) {
  const capText = capNodes ? capNodes.map(text).join("").replace(/\s+/g, " ").trim() : "";
  const by = capText ? baslikYazisi(capText) : null;
  const no = by?.no ?? null;
  let id = no ? eskiIdAl(onceki?.sekiller.get(no)) : null;
  if (!id) { id = uret("sek"); if (onceki) rapor.eslesme.yeni++; }
  say("sek");
  setAttr(fig, "id", id);
  idKaydet(id + "-alt");
  if (onceki?.kullanilanEski.has(id)) onceki.kullanilanEski.add(id + "-alt");   // figcaption id'si oran paydasındadır; şekil korununca o da korunmuş sayılır
  if (no) { if (sekMap.has(no)) uyar(`${ctx.bolum}: Şekil ${no} ikinci kez basılmış (${sekMap.get(no)}, ${id}) — anmalar ilkine gider`); else sekMap.set(no, id); }
  if (capNodes) { const fc = eleman("figcaption", { id: id + "-alt" }); for (const n of capNodes) append(fc, n); if (img) append(fig, fc); else insertBefore(fig, fc, null); }
  if (img) gorselIsle(img, no, capText, ctx);
  rapor.sekiller.push(`${ctx.bolum}: ${id}${no ? ` (Şekil ${no})` : " (numarasız)"}${capNodes ? "" : " — başlık yazısı yok"}`);
}
function baslikParagrafiMi(p, tur) { const by = p && p.tagName === "p" && !attr(p, "id") && !p._kullanildi ? baslikYazisi(text(p)) : null; return by && by.tur === tur ? p : null; }
function gorselParagrafi(p, img, ctx) {
  const fig = eleman("figure");
  replaceWith(p, fig);
  append(fig, img);
  const cap = baslikParagrafiMi(sonrakiEl(fig), "sekil") ?? baslikParagrafiMi(oncekiEl(fig), "sekil");
  let capNodes = null;
  if (cap) { cap._kullanildi = true; capNodes = [...cap.childNodes]; detach(cap); }
  figureTamamla(fig, img, capNodes, ctx);
}
function figureIsle(fig, ctx) {
  const img = kids(fig).find((c) => c.tagName === "img") ?? (function () { let b = null; walk(fig, (n) => { if (!b && isEl(n) && n.tagName === "img") b = n; }); return b; })();
  const fc = kids(fig).find((c) => c.tagName === "figcaption");
  let capNodes = null;
  if (fc) { for (const c of kids(fc)) if (c.tagName === "p") unwrap(c); capNodes = [...fc.childNodes]; detach(fc); }
  else { const cap = baslikParagrafiMi(sonrakiEl(fig), "sekil") ?? baslikParagrafiMi(oncekiEl(fig), "sekil"); if (cap) { cap._kullanildi = true; capNodes = [...cap.childNodes]; detach(cap); } }
  for (const a of [...(fig.attrs || [])]) delAttr(fig, a.name);
  figureTamamla(fig, img, capNodes, ctx);
  if (!img) uyar(`${ctx.bolum}: figure içinde img yok (${attr(fig, "id")})`);
  else for (const c of [...fig.childNodes]) if (isEl(c) && c.tagName === "p" && text(c).trim() === "") detach(c);
}

function tabloIsle(tb, ctx) {
  let cap = kids(tb).find((c) => c.tagName === "caption");
  let capNodes = null;
  if (cap) { for (const c of kids(cap)) if (c.tagName === "p") unwrap(c); capNodes = [...cap.childNodes]; detach(cap); }
  else { const aday = baslikParagrafiMi(oncekiEl(tb), "tablo") ?? baslikParagrafiMi(sonrakiEl(tb), "tablo"); if (aday) { aday._kullanildi = true; capNodes = [...aday.childNodes]; detach(aday); } }
  const capText = capNodes ? capNodes.map(text).join("").replace(/\s+/g, " ").trim() : "";
  const no = capText ? baslikYazisi(capText)?.no ?? null : null;
  let id = no ? eskiIdAl(onceki?.tablolar.get(no)) : null;
  if (!id) { id = uret("tab"); if (onceki) rapor.eslesme.yeni++; }
  say("tab");
  setAttr(tb, "id", id);
  if (no) { if (tabMap.has(no)) uyar(`${ctx.bolum}: Tablo ${no} ikinci kez basılmış`); else tabMap.set(no, id); }
  if (capNodes) { const c = eleman("caption"); for (const n of capNodes) append(c, n); insertBefore(tb, c, tb.childNodes[0]); }
  delAttr(tb, "style");
  walk(tb, (n) => { if (isEl(n) && (n.tagName === "td" || n.tagName === "th")) { idVer(n.tagName, n, ctx); isleCocuklar(n, ctx); } });
  const sarmal = eleman("div", { class: "kt-tablo" });
  insertBefore(tb.parentNode, sarmal, tb);
  append(sarmal, tb);
  rapor.tablolar.push(`${ctx.bolum}: ${id}${no ? ` (Tablo ${no})` : " (numarasız)"}`);
}

function pIsle(p, ctx, zorla) {
  if (attr(p, "id") && kullanilan.has(attr(p, "id"))) return;
  const cocukEl = kids(p);
  const mathBlok = cocukEl.filter((c) => c.tagName === "math" && attr(c, "display") === "block");
  const duz = p.childNodes.filter((c) => c.nodeName === "#text").map((c) => c.value).join("").trim();
  if (mathBlok.length === 1 && cocukEl.length === 1 && (duz === "" || /^\(?\s*\d+\s*[.,]\s*\d+[a-z]?\s*\)?$/.test(duz))) return esitlikIsle(p, mathBlok[0], duz, ctx);
  if (cocukEl.length === 1 && cocukEl[0].tagName === "img" && text(p).trim() === "") return gorselParagrafi(p, cocukEl[0], ctx);
  const t = blokMetni(p).trim();
  if (!zorla) {
    const by = baslikYazisi(t);
    if (by?.tur === "tablo" && sonrakiEl(p)?.tagName === "table") return;
    const sonraki = sonrakiEl(p);
    if (by?.tur === "sekil" && sonraki && (sonraki.tagName === "figure" || (sonraki.tagName === "p" && kids(sonraki).length === 1 && kids(sonraki)[0].tagName === "img" && text(sonraki).trim() === ""))) return;
  }
  // Görev A11 (Plan 28): Word'deki "[Okunuş: X = Y]" (";" ile birden çok çift) işareti → ses sözlüğü taslağına
  // düşer, paragraf PAKETE GİRMEZ (kaynaktan düşer) — kural 11'in tersine kutu olarak korunmaz.
  const okunusM = /^\[Okunu[şs]\s*[:：]\s*(.+)\]$/iu.exec(t);
  if (okunusM) {
    const ciftler = okunusM[1].split(";").map((s) => s.trim()).filter(Boolean);
    if (!ciftler.length) uyar(`${ctx.bolum}: [Okunuş] satırı boş: "${t}"`);
    for (const cift of ciftler) {
      const esM = /^(.+?)\s*=\s*(.+)$/u.exec(cift);
      if (!esM) { uyar(`${ctx.bolum}: [Okunuş] çifti "X = Y" biçiminde değil: "${cift}"`); continue; }
      const anahtar = esM[1].trim(), karsilik = esM[2].trim();
      if (!anahtar || !karsilik) { uyar(`${ctx.bolum}: [Okunuş] çifti eksik: "${cift}"`); continue; }
      if (Object.prototype.hasOwnProperty.call(sesSozlukGirdileri, anahtar) && sesSozlukGirdileri[anahtar] !== karsilik) {
        uyar(`${ctx.bolum}: [Okunuş] anahtarı "${anahtar}" ikinci kez farklı okunuşla verilmiş ("${sesSozlukGirdileri[anahtar]}" → "${karsilik}") — ikincisi kazandı`);
      }
      sesSozlukGirdileri[anahtar] = karsilik;
      sesSozlukNotlar[anahtar] = `hoca: [Okunuş] satırı, bölüm ${ctx.bolum}`;
    }
    rapor.okunusSatirlari.push(`${ctx.bolum}: ${t}`);
    detach(p);
    return;
  }
  // Kural 11: Word'deki "[Etkileşim: …]" isteği → işaretli kutu (3. adımda kart/embed olarak gerçeklenir ve kutu silinir)
  if (/^\s*\[?\s*(Etkileşim|Etkilesim|İnteraktif|Interaktif)\s*[:：]/u.test(t) && !atali(p, (a) => a.tagName === "div" && hasClass(a, "kt-kutu"))) {
    const kutu = eleman("div", { class: "kt-kutu kt-etkilesim-istegi" });
    const id = uret("kutu");
    say("kutu");
    setAttr(kutu, "id", id);
    insertBefore(p.parentNode, kutu, p);
    append(kutu, p);
    idVer("p", p, ctx);
    rapor.etkilesimIstekleri.push(`${ctx.bolum}: ${id} (${ctx.baslikNorm ? kisalt(ctx.baslikNorm, 40) : "başlıksız"}) "${kisalt(t, 140)}"`);
    return;
  }
  const ka = kutuAnahtari(t);
  if (ka && !atali(p, (a) => a.tagName === "div" && hasClass(a, "kt-kutu")) && !atali(p, (a) => a.tagName === "li" || a.tagName === "td" || a.tagName === "th" || a.tagName === "blockquote")) {
    const kutu = eleman("div", { class: "kt-kutu" });
    let id = ka.anahtar ? eskiIdAl(onceki?.kutular.get(ka.anahtar)) : null;
    if (!id) { id = uret("kutu"); if (onceki) rapor.eslesme.yeni++; }
    say("kutu");
    setAttr(kutu, "id", id);
    insertBefore(p.parentNode, kutu, p);
    append(kutu, p);
    if (ka.anahtar) { if (!kutuMap.has(ka.anahtar)) kutuMap.set(ka.anahtar, id); }
    rapor.kutular.push(`${ctx.bolum}: ${id} "${kisalt(t, 50)}" — kapsam tek paragraf; devamı varsa kutuya al`);
  }
  idVer("p", p, ctx);
  isleCocuklar(p, ctx);
}

function isleEleman(n, ctx) {
  const tag = n.tagName;
  if (/^h[1-6]$/.test(tag)) return baslikIsle(n, ctx);
  switch (tag) {
    case "p": return pIsle(n, ctx, false);
    case "figure": return figureIsle(n, ctx);
    case "table": return tabloIsle(n, ctx);
    case "li": case "blockquote": case "dt": case "dd": case "pre": idVer(TUR_KODU[tag], n, ctx); return isleCocuklar(n, ctx);
    case "hr": return detach(n);
    case "img": if (!n._islendi) gorselIsle(n, null, "", ctx); return;
    default: return isleCocuklar(n, ctx);
  }
}
function isleCocuklar(parent, ctx) {
  for (const n of [...parent.childNodes]) if (isEl(n) && n.parentNode === parent) isleEleman(n, ctx);
  for (const n of [...parent.childNodes]) if (isEl(n) && n.parentNode === parent && n.tagName === "p" && !attr(n, "id") && !hasClass(n, "kt-esitlik")) pIsle(n, ctx, true);
}

function dipnotIsle(sec, ctx) {
  const refler = [];
  walk(sec, (n) => { if (isEl(n) && n.tagName === "a" && hasClass(n, "footnote-ref")) refler.push(n); });
  for (const a of refler) {
    const fnId = (attr(a, "href") || "").slice(1);
    const li = fnMap.get(fnId);
    const numara = text(a).trim() || String(ctx.dipnotlar.length + 1);
    if (!li) { uyar(`${ctx.bolum}: dipnot ${fnId} bulunamadı — referans düz metne çevrildi`); replaceWith(a, metinDugumu(numara)); continue; }
    for (const g of [...li.childNodes]) walk(g, (x) => { if (isEl(x) && x.tagName === "a" && hasClass(x, "footnote-back")) detach(x); });
    const norm = normalize(blokMetni(li));
    let notId = null;
    if (onceki) { const e = onceki.dipnotlar.find((d) => d.norm === norm && !onceki.kullanilanEski.has(d.id)) ?? onceki.dipnotlar.filter((d) => !onceki.kullanilanEski.has(d.id)).map((d) => ({ d, s: benzerlik(d.norm, norm) })).filter((x) => x.s >= 0.75).sort((x, y) => y.s - x.s)[0]?.d; if (e) { notId = eskiIdAl(e.id); kullanilan.add("notref" + notId.slice(3)); } }
    if (!notId) { notId = uret("not"); kullanilan.add("notref" + notId.slice(3)); sayac.set("notref", Math.max(sayac.get("notref") ?? 0, +notId.slice(3))); if (onceki) rapor.eslesme.yeni++; }
    say("not");
    const refId = "notref" + notId.slice(3);
    const sup = eleman("sup");
    const yeni = eleman("a", { class: "kt-notref", id: refId, href: "#" + notId });
    yeni._kt = true;
    append(yeni, metinDugumu(numara));
    append(sup, yeni);
    if (a.parentNode && a.parentNode.tagName === "sup") replaceWith(a.parentNode, sup); else replaceWith(a, sup);
    ctx.dipnotlar.push({ id: notId, li });
  }
  if (!ctx.dipnotlar.length) return;
  const bolumu = eleman("section", { class: "kt-dipnotlar" });
  for (const { id, li } of ctx.dipnotlar) {
    const aside = eleman("aside", { class: "kt-dipnot", id });
    let serbest = [];
    const bosalt = () => { if (serbest.some((x) => x.nodeName !== "#text" || x.value.trim())) { const p = eleman("p"); for (const x of serbest) append(p, x); append(aside, p); } serbest = []; };
    for (const c of [...li.childNodes]) {
      if (isEl(c) && ["p", "ul", "ol", "blockquote", "table", "pre", "figure"].includes(c.tagName)) { bosalt(); append(aside, c); }
      else serbest.push(c);
    }
    bosalt();
    if (!kids(aside).length) { const p = eleman("p"); append(aside, p); }
    append(bolumu, aside);
    isleCocuklar(aside, ctx);
    rapor.dipnotlar++;
  }
  append(sec, metinDugumu("\n"));
  append(sec, bolumu);
}

// ── bölümleri kur ──
const sections = [];
for (const b of bolumler) {
  const sec = eleman("section", { class: "kt-bolum", "data-kt-bolum": b.id, id: b.id });
  const ctx = { bolum: b.id, no: b.nn, tur: b.tur, baslikNorm: "", dipnotlar: [], toc: null, sonH2: null };
  append(sec, b.grup.baslik);
  for (const n of b.grup.dugumler) append(sec, n);
  isleCocuklar(sec, ctx);
  if (b.tur === "kaynakca") {
    for (const c of [...sec.childNodes]) if (isEl(c) && c.tagName === "p" && !hasClass(c, "kt-esitlik")) {
      const norm = normalize(blokMetni(c));
      let id = eslestir("kay", norm, b.id, ctx.baslikNorm);
      if (id) rapor.eslesme.korunan++; else { id = uret("kay"); if (onceki) rapor.eslesme.yeni++; }
      say("kay");
      const art = eleman("article", { class: "kt-kaynak", id });
      insertBefore(sec, art, c);
      append(art, c);
    }
  }
  b.ctx = ctx;
  sections.push({ b, sec, ctx });
}

// ── denklem id'leri (kitap-genel, iki geçiş) ──
{
  const gruplarEq = new Map();
  for (const e of esitlikler) if (e.numara) { if (!gruplarEq.has(e.numara)) gruplarEq.set(e.numara, []); gruplarEq.get(e.numara).push(e); }
  for (const [num, liste] of gruplarEq) {
    const [bn, en] = num.split(".");
    const asil = liste.find((e) => String(e.ctx.no) === bn) ?? liste[0];
    asil.id = `eq-${bn}-${en}`;
    let o = 1;
    for (const e of liste) if (e !== asil) { e.id = `${asil.id}-o${++o}`; rapor.esitlikler.tekrar.push(`${e.ctx.bolum}: (${num}) tekrar → ${e.id} (asıl ${asil.ctx.bolum} ${asil.id})`); }
  }
  for (const e of esitlikler) {
    if (!e.numara) {
      const tex = normalize(text(e.p));
      const eski = onceki?.eqx.get(tex)?.find((id) => !onceki.kullanilanEski.has(id));
      e.id = eski ? eskiIdAl(eski) : uret("eqx");
      if (!eski && onceki) rapor.eslesme.yeni++;
      rapor.esitlikler.numarasiz++;
      say("eqx");
    } else { rapor.esitlikler.numarali++; say("eq"); if (onceki) { if (kullanilan.has(e.id)) { rapor.eslesme.korunan++; onceki.kullanilanEski.add(e.id); } else rapor.eslesme.yeni++; } }   // eq-N-M deterministiktir; korunan sayılınca oran payına da girer
    kullanilan.add(e.id);
    setAttr(e.p, "id", e.id);
    if (e.numara) setAttr(e.p, "data-kt-eq", e.numara);
  }
}
const eqBare = new Map();
for (const e of esitlikler) if (e.numara && !e.id.includes("-o")) eqBare.set(e.numara, e.id);

// ── çapraz anma linkleri ──
const REF_RE = /(Eşitlik|Esitlik|Denklem|Şekil|Sekil|Grafik|Tablo|Çizelge|Cizelge|Alıştırma|Alistirma|Örnek|Ornek)(\s+)(\d+)([.,])(\d+)(?![.,]?\d)((?:\s*(?:ve|,|ile|–|—|-)\s*\d+[.,]\d+(?![.,]?\d))*)/gu;
function refHedefi(kelime, no) {
  const k = kelime.normalize("NFC").toLowerCase();
  if (/^(eşitlik|esitlik|denklem)$/.test(k)) return eqBare.get(no) ?? null;
  if (/^(şekil|sekil|grafik)$/.test(k)) return sekMap.get(no) ?? null;
  if (/^(tablo|çizelge|cizelge)$/.test(k)) return tabMap.get(no) ?? null;
  const tur = k.replace(/[çğıöşü]/g, (c) => ({ ç: "c", ğ: "g", ı: "i", ö: "o", ş: "s", ü: "u" })[c]);
  return kutuMap.get(`${tur} ${no}`) ?? null;
}
function linkle(dugum, ctx) {
  const s = dugum.value;
  REF_RE.lastIndex = 0;
  const parcalar = [];
  let son = 0, m;
  let kutuIlkP = false;
  { let p = dugum.parentNode; while (p && isEl(p) && p.tagName !== "p") p = p.parentNode;
    const kutu = p && p.parentNode;
    if (p && kutu && isEl(kutu) && hasClass(kutu, "kt-kutu") && kids(kutu)[0] === p) { let ilk = null; walk(p, (x) => { if (!ilk && x.nodeName === "#text" && x.value.trim()) ilk = x; }); kutuIlkP = ilk === dugum; } }
  while ((m = REF_RE.exec(s))) {
    if (kutuIlkP && m.index === 0) continue;
    const no = `${+m[3]}.${+m[5]}`;
    const hedef = refHedefi(m[1], no);
    if (!hedef) { rapor.linkler.cozulemeyen.push(`${ctx.bolum}: ${m[1]} ${no}`); continue; }
    parcalar.push(metinDugumu(s.slice(son, m.index)));
    const bas = m[1].length + m[2].length + m[3].length + 1 + m[5].length;
    const a = eleman("a", { href: "#" + hedef }); a._kt = true;
    append(a, metinDugumu(s.slice(m.index, m.index + bas)));
    parcalar.push(a);
    rapor.linkler.kurulan++;
    let kuyruk = m[6] || "";
    const KUYRUK_RE = /(\s*(?:ve|,|ile|–|—|-)\s*)(\d+)[.,](\d+)/gu;
    let km, kson = 0;
    while ((km = KUYRUK_RE.exec(kuyruk))) {
      const kno = `${+km[2]}.${+km[3]}`;
      const kh = refHedefi(m[1], kno);
      parcalar.push(metinDugumu(kuyruk.slice(kson, km.index) + km[1]));
      const sayiMetni = kuyruk.slice(km.index + km[1].length, km.index + km[0].length);
      if (kh) { const a2 = eleman("a", { href: "#" + kh }); a2._kt = true; append(a2, metinDugumu(sayiMetni)); parcalar.push(a2); rapor.linkler.kurulan++; }
      else { parcalar.push(metinDugumu(sayiMetni)); rapor.linkler.cozulemeyen.push(`${ctx.bolum}: ${m[1]} ${kno}`); }
      kson = km.index + km[0].length;
    }
    parcalar.push(metinDugumu(kuyruk.slice(kson)));
    son = m.index + m[0].length;
  }
  if (!parcalar.length) return;
  parcalar.push(metinDugumu(s.slice(son)));
  replaceWith(dugum, ...parcalar.filter((x) => x.nodeName !== "#text" || x.value !== ""));
}
const ATLA_LINK = new Set(["a", "math", "script", "style", "figcaption", "caption", "h1", "h2", "h3", "h4", "h5", "h6", "template"]);
for (const { sec, ctx } of sections) {
  dipnotIsle(sec, ctx);
  const metinler = [];
  walk(sec, (n) => { if (n.nodeName === "#text" && n.value && /\d/.test(n.value) && !atali(n, (p) => ATLA_LINK.has(p.tagName))) metinler.push(n); });
  for (const t of metinler) linkle(t, ctx);
  // pandoc/Word iç linkleri (#kümeler, #_Toc…) → bizim id'ler; yabancı id'ler temizlenir
  walk(sec, (n) => {
    if (!isEl(n)) return;
    if (n.tagName === "a" && !n._kt) {
      const href = attr(n, "href") || "";
      if (href.startsWith("#")) {
        let hedef = decodeURIComponent(href.slice(1));
        if (kullanilan.has(hedef)) return;
        let dugum = pandocIdler.get(hedef);
        while (dugum && !(attr(dugum, "id") && kullanilan.has(attr(dugum, "id")))) dugum = dugum.parentNode && isEl(dugum.parentNode) ? dugum.parentNode : null;
        if (dugum) { setAttr(n, "href", "#" + attr(dugum, "id")); rapor.linkler.icLink.yeniden++; }
        else { rapor.linkler.icLink.cozulemeyen.push(`${ctx.bolum}: ${href}`); unwrap(n); }
      }
    }
    for (const k of ["role", "aria-hidden"]) if (attr(n, k) !== undefined && n.tagName !== "canvas") delAttr(n, k);
  });
  walk(sec, (n) => { if (isEl(n)) { const id = attr(n, "id"); if (id && !kullanilan.has(id)) delAttr(n, "id"); if (n.tagName === "img" && !n._islendi) gorselIsle(n, null, "", ctx); } });
  if (hasClass(sec, "kt-bolum") && kids(sec)[0]?.tagName !== "h1") uyar(`${ctx.bolum}: ilk çocuk h1 değil`);
}

// ── önceki baskıdan taşınanlar: kt-tekrar + bolum css/js ──
const bolumDosyaEkleri = new Map();
if (onceki) {
  for (const { b, sec, ctx } of sections) {
    const tekrar = onceki.tekrar.get(b.id);
    if (tekrar) {
      const dipnotlar = kids(sec).find((c) => c.tagName === "section" && hasClass(c, "kt-dipnotlar"));
      if (dipnotlar) { insertBefore(sec, metinDugumu("\n"), dipnotlar); insertBefore(sec, tekrar, dipnotlar); } else { append(sec, metinDugumu("\n")); append(sec, tekrar); }
      walk(tekrar, (n) => { if (isEl(n) && attr(n, "id")) onceki.kullanilanEski.add(attr(n, "id")); });
      rapor.eslesme.tasinanTekrar.push(b.id);
    }
    const eski = onceki.bolumDosya.get(b.id);
    if (eski) {
      const ekler = { css: [], js: [], veri: [] };
      for (const k of ["css", "js", "veri"]) for (const y of eski[k] ?? []) {
        const kaynak = path.join(ONCEKI, y);
        if (!fs.existsSync(kaynak)) { uyar(`Önceki baskı dosyası yok: ${y}`); continue; }
        fs.mkdirSync(path.dirname(path.join(PAKET, y)), { recursive: true });
        fs.copyFileSync(kaynak, path.join(PAKET, y));
        ekler[k].push(y);
        rapor.eslesme.tasinanDosya.push(y);
      }
      bolumDosyaEkleri.set(b.id, ekler);
    }
  }
  const eskiIdler = new Set([...onceki.bloklar.map((k) => k.id), ...onceki.dipnotlar.map((d) => d.id), ...onceki.sekiller.values(), ...onceki.tablolar.values(), ...onceki.kutular.values(), ...[...onceki.eqx.values()].flat()]);
  for (const id of eskiIdler) if (!onceki.kullanilanEski.has(id)) rapor.eslesme.emekli.push(id);
  const korunanMetin = [...onceki.metinIdler].filter((id) => onceki.kullanilanEski.has(id)).length;
  rapor.eslesme.oncekiToplamMetinBlok = onceki.metinIdler.size;
  rapor.eslesme.korunanMetinBlok = korunanMetin;
  rapor.eslesme.oran = onceki.metinIdler.size ? +(korunanMetin / onceki.metinIdler.size).toFixed(3) : null;
}

// ───────────────────────── Yaz ─────────────────────────
for (const { b, sec } of sections) {
  const cocuklar = [...sec.childNodes];
  sec.childNodes = [];
  for (const c of cocuklar) { if (c.nodeName === "#text" && !c.value.trim()) continue; append(sec, c); append(sec, metinDugumu("\n")); }
  const html = serializeOuter(sec);
  // Kural 3 (v1.3): bölüm dosyası çift tıklayınca açılan TAM SAYFA — sabit başlık (stil bağlantıları) + içerik + sabit script satırları.
  // Doğrulayıcı yüklemede başlığı atar, bağlantıları manifest listesiyle tekilleştirir; sunucuya yalnız section.kt-bolum gider.
  const ekler = bolumDosyaEkleri.get(b.id) ?? { css: [], js: [], veri: [] };
  const htmlKacis = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
  const bas = ['<!doctype html>', '<html lang="tr">', '<head>', '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${htmlKacis(b.baslikMetni.replace(/\s+/g, " "))}</title>`, '<link rel="stylesheet" href="assets/css/kitap.css">',
    ...ekler.css.map((y) => `<link rel="stylesheet" href="${htmlKacis(y)}">`), '</head>', '<body>'].join("\n");
  const son = ['<script src="assets/js/ortak.js"></script>', ...ekler.js.map((y) => `<script src="${htmlKacis(y)}"></script>`), '</body>', '</html>'].join("\n");
  fs.writeFileSync(path.join(PAKET, b.dosya), bas + "\n" + html + "\n" + son + "\n");
  const dugum = (function () { let n = 0; walk(sec, () => n++); return n; })();
  rapor.bolumler.push({ id: b.id, dosya: b.dosya, tur: b.tur, baslik: b.baslikMetni, bayt: Buffer.byteLength(html), dugum, dipnot: b.ctx.dipnotlar.length });
  if (dugum > 20000) uyar(`${b.id}: ${dugum} düğüm > 20.000 — bölümü ikiye böl (id'ler değişmez)`);
}
fs.copyFileSync(path.join(SABLON, "kitap.css"), path.join(PAKET, "assets/css/kitap.css"));
fs.copyFileSync(path.join(SABLON, "ortak.js"), path.join(PAKET, "assets/js/ortak.js"));
const manifest = {
  format: "kkp/1",
  kitap: { baslik: KITAP, dil: "tr", uretim: { arac: ARAC, tarih: TARIH, kaynak: KAYNAK_ADI } },
  bolumler: sections.map(({ b }) => { const m = { id: b.id, dosya: b.dosya, baslik: b.baslikMetni.replace(/\s+/g, " "), tur: b.tur }; const e = bolumDosyaEkleri.get(b.id); if (e) for (const k of ["css", "js", "veri"]) if (e[k].length) m[k] = e[k]; return m; }),
  ortak: { css: ["assets/css/kitap.css"], js: ["assets/js/ortak.js"] },
  icindekiler: sections.filter(({ ctx }) => ctx.toc).map(({ ctx }) => ctx.toc),
  ozellikler: { matematik: "mathml", etkilesim: true, gomulu: [] },
};
fs.writeFileSync(path.join(PAKET, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
if (fs.existsSync(path.join(PAKET, "assets/media")) && !fs.readdirSync(path.join(PAKET, "assets/media")).length) fs.rmdirSync(path.join(PAKET, "assets/media"));

// ── ses sözlüğü taslağı (Görev A11, Plan 28) — hiç [Okunuş: …] işareti yoksa dosya hiç yazılmaz ──
if (Object.keys(sesSozlukGirdileri).length) {
  const sozlukTaslak = { format: "kkp-ses-sozluk/1", surum: 1, girdiler: sesSozlukGirdileri, notlar: sesSozlukNotlar };
  const dogrulama = sozlukDogrula(sozlukTaslak);
  if (!dogrulama.gecerli) hata(`Ses sözlüğü taslağı şemaya uymuyor (kkp-ses-sozluk/1): ${dogrulama.hatalar.join("; ")}`);
  fs.writeFileSync(path.join(CIKARIM, "ses-sozluk-taslak.json"), JSON.stringify(sozlukTaslak, null, 2) + "\n");
}

// ── rapor ──
fs.writeFileSync(path.join(CIKARIM, "donusum-raporu.json"), JSON.stringify(rapor, null, 2) + "\n");
const md = [];
md.push(`# Dönüşüm raporu — ${KAYNAK_ADI} → ${path.basename(PAKET)}`, "", `kaynak-donustur.mjs ${SURUM} · ${TARIH}${ONCEKI ? ` · önceki baskı: ${ONCEKI}` : ""}`, "");
md.push("## Bölümler", "", "| id | dosya | tür | başlık | bayt | düğüm | dipnot |", "|---|---|---|---|---:|---:|---:|");
for (const b of rapor.bolumler) md.push(`| ${b.id} | ${b.dosya} | ${b.tur} | ${kisalt(b.baslik, 50)} | ${b.bayt} | ${b.dugum} | ${b.dipnot} |`);
md.push("", "## Id sayıları", "", Object.entries(idSayimi).map(([k, v]) => `${k} ${v}`).join(" · ") || "(yok)");
md.push("", "## Denklemler", "", `numaralı ${rapor.esitlikler.numarali} · numarasız (eqx) ${rapor.esitlikler.numarasiz}`);
for (const t of rapor.esitlikler.tekrar) md.push(`- tekrar: ${t}`);
for (const t of rapor.esitlikler.gecersiz) md.push(`- geçersiz numara: ${t}`);
md.push("", "## Şekiller ve tablolar", "", ...(rapor.sekiller.length || rapor.tablolar.length ? [...rapor.sekiller, ...rapor.tablolar].map((s) => `- ${s}`) : ["- (yok)"]));
md.push("", "## Görseller", "", `kopyalanan ${rapor.gorseller.kopyalanan.length}`);
for (const g of rapor.gorseller.desteklenmeyen) md.push(`- **ELLE:** ${g}`);
for (const g of rapor.gorseller.altEksik) md.push(`- alt: ${g}`);
md.push("", "## Etkileşim istekleri (kural 11 — kart/embed olarak gerçekle, kutuyu sil)", "", ...(rapor.etkilesimIstekleri.length ? rapor.etkilesimIstekleri.map((k) => `- ${k}`) : ["- (yok)"]));
md.push("", `## Okunuş satırları: ${rapor.okunusSatirlari.length}`, "", ...(rapor.okunusSatirlari.length ? rapor.okunusSatirlari.map((k) => `- ${k}`) : ["- (yok)"]));
md.push("", "## Kutu adayları (kapsamı gözden geçir)", "", ...(rapor.kutular.length ? rapor.kutular.map((k) => `- ${k}`) : ["- (yok)"]));
md.push("", "## Çapraz anmalar", "", `kurulan link ${rapor.linkler.kurulan} · iç link yeniden yazılan ${rapor.linkler.icLink.yeniden}`);
if (rapor.linkler.cozulemeyen.length) { const say_ = new Map(); for (const c of rapor.linkler.cozulemeyen) say_.set(c, (say_.get(c) ?? 0) + 1); for (const [c, n] of say_) md.push(`- çözülemeyen (düz metin bırakıldı): ${c}${n > 1 ? ` ×${n}` : ""}`); }
for (const c of rapor.linkler.icLink.cozulemeyen) md.push(`- iç link hedefi yok (link kaldırıldı): ${c}`);
if (rapor.eslesme) {
  const e = rapor.eslesme;
  md.push("", "## İkinci baskı eşleşmesi (kural 4)", "", `önceki metin bloğu ${e.oncekiToplamMetinBlok} · korunan metin bloğu ${e.korunanMetinBlok} · **id koruma oranı ${e.oran === null ? "?" : Math.round(e.oran * 100) + "%"}** (hedef %100, alt sınır %80) · tüm türlerde korunan ${e.korunan} / yeni ${e.yeni} / emekli ${e.emekli.length}`);
  md.push(`taşınan Bölüm Tekrar: ${e.tasinanTekrar.join(", ") || "(yok)"} · taşınan dosya: ${e.tasinanDosya.join(", ") || "(yok)"}`);
  if (e.kararsiz.length) { md.push("", "Kararsız eşleşmeler (benzerlik 0,50–0,74 — doğruysa bırak, yanlışsa yeni id ver ve eskiyi emekli et):"); for (const k of e.kararsiz) md.push(`- ${k.id} (${k.benzerlik}): "${k.eski}" → "${k.yeni}"`); }
  if (e.tasinmayanKart.length) { md.push("", "Önceki baskının lab kartları TAŞINMADI — aynı id ile yerine koy:"); for (const k of e.tasinmayanKart) md.push(`- ${k.id} (${k.bolum}, "${k.baslik}" altında): ${k.ozet}`); }
  if (e.emekli.length) md.push("", `Emekli id'ler (yeniden verilmez): ${e.emekli.slice(0, 40).join(", ")}${e.emekli.length > 40 ? " …" : ""}`);
}
if (rapor.sezgi) md.push("", "## Başlık sezgisi (--baslik-sezgisi)", "", `İçindekiler artığı ${rapor.sezgi.tocArtigi} · aday ${rapor.sezgi.aday} · başlık ${rapor.sezgi.kabul} (h1 ${rapor.sezgi.h1} · h2 ${rapor.sezgi.h2} · h3 ${rapor.sezgi.h3})`, "", ...rapor.sezgi.h1ler.map((x) => `- h1: ${x}`));
md.push("", "## Uyarılar", "", ...(rapor.uyarilar.length ? rapor.uyarilar.map((u) => `- ${u}`) : ["- (yok)"]));
md.push("", "Sonraki adım: kkp-lint → hata 0; sonra Bölüm Tekrar (bolum-metni → tekrar-ekle) ve lab kartları (lab-ekle); skill 3. adım.", "");
fs.writeFileSync(path.join(CIKARIM, "donusum-raporu.md"), md.join("\n"));

if (secenek["--zip"]) {
  const zip = path.resolve(secenek["--zip"]);
  if (fs.existsSync(zip)) fs.rmSync(zip);
  const bayt = dizinZiple(PAKET, zip);
  console.log(`zip: ${zip} (${(bayt / 1024).toFixed(0)} KB)`);
}
console.log(`Paket iskeleti: ${PAKET}\n  bölüm ${sections.length} · id ${Object.values(idSayimi).reduce((a, b) => a + b, 0)} · denklem ${rapor.esitlikler.numarali}+${rapor.esitlikler.numarasiz} · şekil ${rapor.sekiller.length} · tablo ${rapor.tablolar.length} · dipnot ${rapor.dipnotlar} · link ${rapor.linkler.kurulan}${rapor.eslesme ? ` · id koruma ${rapor.eslesme.oran === null ? "?" : Math.round(rapor.eslesme.oran * 100) + "%"}` : ""}\n  rapor: ${path.join(CIKARIM, "donusum-raporu.md")}${rapor.uyarilar.length ? `\n  UYARI ${rapor.uyarilar.length}` : ""}`);
