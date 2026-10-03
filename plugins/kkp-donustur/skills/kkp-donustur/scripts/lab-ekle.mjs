// kkp/1 paketine lab kartı (details.kt-kart) + bölüm JS/CSS bağı ekler — 3. adım aracı (skill: .claude/skills/kkp-kitap-uret).
//
//   node scripts/kkp/lab-ekle.mjs <paket-dizin> <spec.json | dizin>
//
// Dizin verilirse içindeki her *.json ad sırasıyla işlenir. Spec (dosya yolları spec dosyasının dizinine göre):
//   { "bolum": "b02",
//     "yer": { "istek": "kutu0001" } | { "sonra": "p0003" } | { "basliktanSonra": "h0004" },   // tam biri
//     "id": "kart0007",                       // isteğe bağlı: ikinci baskıda aynı id; kullanımdaysa hata
//     "ozet": "Deneyin: …",                   // summary metni
//     "govde": "b02-denge.html" | "govdeHtml": "<div …>",   // details.kt-kart-govde İÇERİĞİ (biri)
//     "js": "bolum-02.js",                    // isteğe bağlı: bölümün TAM JS'i → assets/js/bolum-NN.js (üstüne yazar)
//     "css": "bolum-02.css" }                 // isteğe bağlı → assets/css/bolum-NN.css
// Önce TÜM spec'ler doğrulanır (hata → çıkış 1, liste stderr'e, hiçbir dosyaya dokunulmaz); sonra yazılır.
// Kart: details.kt-kart#kartNNNN > summary#sumNNNN + div.kt-kart-govde; id'ler havuzdan (elle uydurulmaz); gövdedeki id'siz metin
// blokları da havuzdan id alır. "istek" kutusu (div.kt-kutu.kt-etkilesim-istegi) kartla değiştirilir; kutunun ve p'sinin id'leri emekli olur.
// Çıkış: 0 başarı · 1 doğrulama/paket hatası · 2 kullanım hatası. stdout: "b02: kart0002 (sum0002) — kutu0001 yerine · js assets/js/bolum-02.js".
import fs from "node:fs";
import path from "node:path";
import { parseFragment } from "parse5";
import { append, attr, byId, eleman, hasClass, insertAfter, isEl, metinDugumu, replaceWith, walk } from "./lib/dom.mjs";
import { bolumBul, bolumEkDosya, bolumKaydet, bolumNo, bolumYukle, idHavuzu, manifestOku, manifestYaz, metinBloklariniIdle, sayfaLinkEkle, sayfaScriptEkle } from "./lib/paket.mjs";

// ───────────────────────── Argümanlar ─────────────────────────
const argv = process.argv.slice(2);
const konum = [];
for (const a of argv) {
  if (a.startsWith("--")) hata(`Bilinmeyen seçenek ${a}`, 2);
  konum.push(a);
}
const [paketArg, specArg] = konum;
if (!paketArg || !specArg || konum.length > 2) {
  console.error("Kullanım: node scripts/kkp/lab-ekle.mjs <paket-dizin> <spec.json | dizin>");
  process.exit(2);
}
function hata(m, kod = 1) { console.error("HATA: " + m); process.exit(kod); }
const PAKET = path.resolve(paketArg);
const SPEC = path.resolve(specArg);
if (!fs.existsSync(SPEC)) hata(`spec yok: ${SPEC}`);

// ───────────────────────── Sabitler ─────────────────────────
const ID_RE = /^[a-z][a-z0-9-]*$/;
const KART_ID_RE = /^kart\d{4,9}$/;
const YER_TURLERI = ["istek", "sonra", "basliktanSonra"];
const LAB_YASAK_TUR = new Set(["on", "kaynakca"]);   // ön sayfa / kaynakça bölümüne lab eklenmez
const YASAK_ETIKET = new Set(["script", "style", "details"]);
const YASAK_JS = ["window.top", "window.parent", "window.open", "fetch(", "XMLHttpRequest", "eval(", "localStorage", "document.cookie"];
const BASLIK_RE = /^h[1-6]$/;
const istekKutusu = (n) => n.tagName === "div" && hasClass(n, "kt-kutu") && hasClass(n, "kt-etkilesim-istegi");
const bolumSonu = (n) => n.tagName === "section" && (hasClass(n, "kt-dipnotlar") || hasClass(n, "kt-tekrar"));

// ───────────────────────── Spec dosyaları ─────────────────────────
const specDosyalari = fs.statSync(SPEC).isDirectory()
  ? fs.readdirSync(SPEC).filter((a) => /\.json$/i.test(a)).sort().map((a) => path.join(SPEC, a))
  : [SPEC];
if (!specDosyalari.length) hata(`dizinde *.json yok: ${SPEC}`);

let manifest;
try { ({ manifest } = manifestOku(PAKET)); } catch (e) { hata(e.message); }
const havuz = idHavuzu(PAKET, manifest);

// ───────────────────────── Doğrulama (hiçbir şey yazılmadan) ─────────────────────────
const hatalar = [];
const yuklu = new Map();               // bolumId → bolumYukle sonucu (doğrulama ve yazma aynı ağaç)
const tuketilenIstek = new Set();      // aynı kutu iki spec'te hedeflenemez
const buKosuIdleri = new Set();        // spec'lerin gövde id'leri + verilen kart id'leri (spec'ler arası çakışma)
const isler = [];

function bolumYukleOnbellek(bolum) {
  if (!yuklu.has(bolum.id)) yuklu.set(bolum.id, bolumYukle(PAKET, bolum));
  return yuklu.get(bolum.id);
}

/** Gövde HTML'ini ayrıştırır ve güvenlik/id kurallarını denetler; { govde, idler } ya da hatalar listesine yazar. */
function govdeDenetle(html, ad, h) {
  const govde = parseFragment(html);
  const idler = [];
  walk(govde, (n) => {
    if (!isEl(n)) return;
    if (YASAK_ETIKET.has(n.tagName)) h(`gövdede <${n.tagName}> yasak${n.tagName === "details" ? " (iç içe kart)" : ""}`);
    for (const a of n.attrs || []) {
      if (/^on\w+$/i.test(a.name)) h(`gövdede satır içi olay özniteliği yasak: <${n.tagName} ${a.name}=…> (davranışı bölüm JS'inde addEventListener ile bağla)`);
      if ((a.name === "src" || a.name === "href") && /^\s*https?:\/\//i.test(a.value)) h(`gövdede dış bağlantı yasak: <${n.tagName} ${a.name}="${a.value}"> (http(s):// — dosyayı assets/ altına koy)`);
    }
    const id = attr(n, "id");
    if (id === undefined) return;
    if (!ID_RE.test(id)) h(`gövde id'si küçük harf kebab-case olmalı (^[a-z][a-z0-9-]*$): "${id}"`);
    else if (idler.includes(id)) h(`gövde id'si gövdede tekrar ediyor: "${id}"`);
    else if (buKosuIdleri.has(id)) h(`gövde id'si başka bir spec'te de var: "${id}"`);
    else if (havuz.kullanilan.has(id)) h(`gövde id'si pakette kullanımda: "${id}"`);
    else idler.push(id);
  });
  return { govde, idler };
}
/** Bu koşuda alınan id'yi hem spec'ler arası çakışma kümesine hem havuza yazar: sonraki spec'lerin havuz.uret / metinBloklariniIdle
 *  çağrıları aynı numarayı üretemez (BULGU: id'siz spec önce işlenince kart0002'yi üretiyor, id'li spec de kart0002 alıyordu).
 *  Hata çıkışında dosya yazılmadığından rezervasyon zararsızdır. */
function idRezerve(id) { buKosuIdleri.add(id); havuz.kaydet(id); }

for (const specYolu of specDosyalari) {
  const ad = path.relative(process.cwd(), specYolu) || specYolu;
  const h = (m) => hatalar.push(`${ad}: ${m}`);
  let spec;
  try { spec = JSON.parse(fs.readFileSync(specYolu, "utf8")); } catch (e) { h(`JSON okunamadı: ${e.message}`); continue; }
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) { h("spec bir nesne olmalı"); continue; }
  const specDizin = path.dirname(specYolu);
  const is = { ad, spec, specDizin };

  // bölüm
  const bolum = typeof spec.bolum === "string" ? bolumBul(manifest, spec.bolum) : null;
  if (!bolum) { h(`manifest'te bölüm yok: ${spec.bolum ?? "(bolum verilmedi)"}`); continue; }
  if (LAB_YASAK_TUR.has(bolum.tur)) { h(`ön sayfa/kaynakçaya lab eklenmez: ${bolum.id} (tur: ${bolum.tur})`); continue; }
  if (!fs.existsSync(path.join(PAKET, bolum.dosya))) { h(`${bolum.dosya} yok (manifest'te var)`); continue; }
  let y;
  try { y = bolumYukleOnbellek(bolum); } catch (e) { h(e.message); continue; }
  is.bolum = bolum; is.y = y;

  // yer
  const yer = spec.yer && typeof spec.yer === "object" ? spec.yer : null;
  const yerAnahtarlari = yer ? Object.keys(yer).filter((k) => YER_TURLERI.includes(k)) : [];
  if (!yer || yerAnahtarlari.length !== 1 || Object.keys(yer).length !== 1 || typeof yer[yerAnahtarlari[0]] !== "string") {
    h(`yer tam bir seçenek olmalı: {"istek": id} | {"sonra": id} | {"basliktanSonra": id}`);
  } else {
    const tur = yerAnahtarlari[0], hedefId = yer[tur];
    const hedef = byId(y.sec, hedefId);
    if (!hedef) h(`yer hedefi bölümde yok: ${hedefId}`);
    else if (tur === "istek" && !istekKutusu(hedef)) h(`yer.istek hedefi div.kt-kutu.kt-etkilesim-istegi olmalı: ${hedefId}`);
    else if (tur === "istek" && tuketilenIstek.has(hedefId)) h(`istek kutusu başka bir spec'te de hedeflenmiş: ${hedefId}`);
    else if (tur === "basliktanSonra" && !BASLIK_RE.test(hedef.tagName)) h(`yer.basliktanSonra hedefi başlık (h1–h6) olmalı: ${hedefId}`);
    else { is.yerTuru = tur; is.hedef = hedef; if (tur === "istek") tuketilenIstek.add(hedefId); }
  }

  // kart id
  if (spec.id !== undefined) {
    if (typeof spec.id !== "string" || !KART_ID_RE.test(spec.id)) h(`id kart\\d{4,9} biçiminde olmalı: "${spec.id}"`);
    else if (buKosuIdleri.has(spec.id)) h(`id başka bir spec'te de verilmiş: "${spec.id}"`);
    else if (havuz.kullanilan.has(spec.id)) h(`id pakette kullanımda: "${spec.id}"`);
    else { is.kartId = spec.id; idRezerve(spec.id); }
  }

  // özet
  if (typeof spec.ozet !== "string" || !spec.ozet.trim()) h("ozet boş olamaz");
  else is.ozet = spec.ozet.replace(/\s+/g, " ").trim();

  // gövde
  const govdeVar = spec.govde !== undefined, govdeHtmlVar = spec.govdeHtml !== undefined;
  if (govdeVar === govdeHtmlVar) h("govde (dosya) ya da govdeHtml (dize) — tam biri verilmeli");
  else {
    let html = null;
    if (govdeHtmlVar) { if (typeof spec.govdeHtml === "string") html = spec.govdeHtml; else h("govdeHtml dize olmalı"); }
    else if (typeof spec.govde !== "string") h("govde dosya yolu (dize) olmalı");
    else {
      const govdeYolu = path.resolve(specDizin, spec.govde);
      if (!fs.existsSync(govdeYolu)) h(`govde dosyası yok: ${spec.govde} (${govdeYolu})`);
      else html = fs.readFileSync(govdeYolu, "utf8");
    }
    if (html !== null) {
      const { govde, idler } = govdeDenetle(html, ad, h);
      is.govde = govde;
      for (const id of idler) idRezerve(id);
    }
  }

  // js / css
  const no = bolumNo(bolum);
  for (const tur of ["js", "css"]) {
    if (spec[tur] === undefined) continue;
    if (typeof spec[tur] !== "string" || !spec[tur].trim()) { h(`${tur} dosya yolu (dize) olmalı`); continue; }
    const yol = path.resolve(specDizin, spec[tur]);
    if (!fs.existsSync(yol)) { h(`${tur} dosyası yok: ${spec[tur]} (${yol})`); continue; }
    if (!no) { h(`bölüm numarası çözülemedi (${bolum.id} / ${bolum.dosya}); ${tur} hedef adı bolum-NN.${tur} kurulamıyor`); continue; }
    if (tur === "js") {
      const kaynak = fs.readFileSync(yol, "utf8");
      const yasak = YASAK_JS.filter((d) => kaynak.includes(d));
      if (yasak.length) { h(`js dosyasında yasak dize: ${yasak.join(", ")} (${spec.js}; yorum satırı bile olsa kaldır)`); continue; }
    }
    is[tur] = { kaynak: yol, hedef: `assets/${tur}/bolum-${no}.${tur}` };
  }

  isler.push(is);
}

if (hatalar.length) {
  console.error(`HATA: ${hatalar.length} doğrulama hatası — hiçbir dosyaya dokunulmadı:`);
  for (const m of hatalar) console.error("  - " + m);
  process.exit(1);
}

// ───────────────────────── Yazma ─────────────────────────
/** Başlığı izleyen ilk p (bir sonraki başlığa / dipnot-tekrar section'ına kadar); yoksa null. */
function basliktanSonrakiP(baslik) {
  const kardesler = baslik.parentNode.childNodes;
  for (let i = kardesler.indexOf(baslik) + 1; i < kardesler.length; i++) {
    const k = kardesler[i];
    if (!isEl(k)) continue;
    if (BASLIK_RE.test(k.tagName) || bolumSonu(k)) return null;
    if (k.tagName === "p") return k;
  }
  return null;
}
/** ref'in ardına satır sonu + düğüm (dosya satır düzeni korunsun). */
function satirlaEkle(ref, n) { const nl = metinDugumu("\n"); insertAfter(ref, nl); insertAfter(nl, n); }

const degisenBolumler = new Set();
const buKosudaYazilan = new Set();      // js/css hedef yolları — aynı koşuda ikinci spec aynı dosyayı gösterince "üstüne yazıldı" notu basılmaz
for (const is of isler) {
  const { bolum, y, govde } = is;
  const kartId = is.kartId ?? havuz.uret("kart");   // verilen id doğrulamada rezerve edildi (idRezerve)
  const sumId = havuz.uret("sum");
  const kart = eleman("details", { class: "kt-kart", id: kartId });
  const sum = eleman("summary", { id: sumId });
  append(sum, metinDugumu(is.ozet));
  append(kart, sum);
  const govdeDiv = eleman("div", { class: "kt-kart-govde" });
  for (const c of [...(govde.childNodes || [])]) append(govdeDiv, c);
  append(kart, govdeDiv);
  const verilen = metinBloklariniIdle(govdeDiv, havuz);   // gövdenin kendi id'leri doğrulamada rezerve edildi

  let yerMetni;
  if (is.yerTuru === "istek") { replaceWith(is.hedef, kart); yerMetni = `${attr(is.hedef, "id")} yerine`; }
  else if (is.yerTuru === "sonra") { satirlaEkle(is.hedef, kart); yerMetni = `${attr(is.hedef, "id")} ardına`; }
  else {
    const p = basliktanSonrakiP(is.hedef);
    satirlaEkle(p ?? is.hedef, kart);
    yerMetni = `${attr(is.hedef, "id")} başlığından sonra (${p ? `${attr(p, "id")} ardına` : "izleyen p yok, başlığın ardına"})`;
  }

  const ekler = [];
  const notlar = [];
  for (const tur of ["js", "css"]) {
    if (!is[tur]) continue;
    const hedefYolu = path.join(PAKET, ...is[tur].hedef.split("/"));
    const vardi = !buKosudaYazilan.has(hedefYolu) && fs.existsSync(hedefYolu);   // yalnız koşu ÖNCESİ var olan dosya için not
    buKosudaYazilan.add(hedefYolu);
    fs.mkdirSync(path.dirname(hedefYolu), { recursive: true });
    fs.copyFileSync(is[tur].kaynak, hedefYolu);
    if (tur === "js") sayfaScriptEkle(y, is[tur].hedef); else sayfaLinkEkle(y, is[tur].hedef);
    bolumEkDosya(manifest, bolum.id, tur, is[tur].hedef);
    ekler.push(`${tur} ${is[tur].hedef}`);
    if (vardi) notlar.push(`${is[tur].hedef} vardı, üstüne yazıldı (bölümün bütün lablarını tek ${tur === "js" ? "JS" : "CSS"} taşımalı)`);
  }
  degisenBolumler.add(bolum.id);
  console.log(`${bolum.id}: ${kartId} (${sumId}) — ${yerMetni}${ekler.length ? " · " + ekler.join(" · ") : ""}${verilen.length ? ` · gövde id ${verilen.length}` : ""}`);
  for (const n of notlar) console.log(`  not: ${n}`);
}
for (const id of degisenBolumler) bolumKaydet(yuklu.get(id));
manifestYaz(PAKET, manifest);
