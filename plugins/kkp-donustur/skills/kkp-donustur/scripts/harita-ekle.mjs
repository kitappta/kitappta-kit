#!/usr/bin/env node
// kkp/1 paketine harita kartı (figure.kt-harita) ekler — 3. adım aracı (Plan 38). Altlık, Leaflet, motor ve stil YALNIZ Kitappta setinden
// gelir (sablon/set/harita/); karo ve ağ yoktur. Bölüm başına JS yazılmaz: kart bir JSON tanım taşır, motor (set-harita.js) kurar.
//
//   node scripts/kkp/harita-ekle.mjs <paket-dizin> <spec.json | dizin> [--taslak]
//   node scripts/kkp/harita-ekle.mjs --altliklar            katalogdaki altlıklar (ad, durum, ne zaman kullanılır)
//   node scripts/kkp/harita-ekle.mjs --kodlar <altlık>      altlıktaki yer kodları ve adları (TUR Türkiye … / TR-06 Ankara …)
//
// Spec (dizin verilirse *.json ad sırasıyla):
//   { "bolum": "b04",
//     "yer": { "sonra": "p0012" } | { "basliktanSonra": "h0004" } | { "istek": "kutu0003" },      // tam biri
//     "id": "sek0007",              // isteğe bağlı: bölümde bu id'li harita kartı varsa YERİNDE yenilenir (yer gerekmez); yoksa bu id verilir
//     "baslik": "Harita 4.1: Türk dilinin yayılım alanı",                                        // figcaption (zorunlu)
//     "aciklama": "Avrasya haritası: …",                                                         // ekran okuyucu tarifi (yoksa başlık)
//     "altlik": "avrasya",
//     "gorunum": { "merkez": [44, 60], "yakinlik": 3.5 } | { "odak": ["TUR", "AZE"] },            // yoksa vurgu + işaretçilere sığdırılır
//     "etiketler": "hepsi" | "vurgu" | "yok",                                                    // yer adları (varsayılan hepsi)
//     "gruplar": [{ "ad": "oguz", "etiket": "Oğuz" }],                                           // en çok 6; süzgeç düğmeleri ve renk
//     "vurgu": [{ "k": ["TUR", "AZE", "TKM"], "grup": "oguz" }],                                 // altlıktaki kodlar (--kodlar)
//     "isaretciler": [{ "ad": "Ankara", "konum": [39.93, 32.86], "metin": "…", "grup": "oguz" }], // konum = [enlem, boylam]
//     "alanlar": [{ "ad": "Yayılım alanı", "noktalar": [[41, 26], [56, 49], [43, 88]], "kesik": true, "grup": "oguz" }] }
//
// Önce TÜM spec'ler doğrulanır (hata → çıkış 1, liste stderr'e, hiçbir dosyaya dokunulmaz): bilinmeyen / taslak altlık, altlıkta olmayan
// kod, sınır dışı konum, tanımsız grup. Konum hiçbir yerin içinde değilken ters çevrilmişi bir yerin içindeyse UYARI basılır ([boylam, enlem]
// yazılmış olabilir; kıyı şehrinde sadeleştirme yüzünden yanlış alarm olabilir — konumu gözle doğrula). Sonra: kart kurulur (id'ler havuzdan; işaretçiler metin listesi olarak da
// yazılır — JS'siz ortamda ve sesli kitapta okunur, not alınabilir), set dosyaları SABİT adlarla pakete kopyalanır, bölümün manifest css/js
// listesi ve sayfa bağları kurulur. Hiçbir bölümün kullanmadığı altlık / motor dosyaları paketten silinir.
// Şablon dizini KKP_SABLON ile değiştirilebilir (test). Çıkış: 0 başarı · 1 doğrulama/paket hatası · 2 kullanım hatası.
// stdout: "b04: sek0007 (avrasya) — p0012 ardına · işaretçi 15 · vurgu 7 · alan 1 · grup 3".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { append, attr, bulHepsi, byId, eleman, hasClass, insertAfter, isEl, kids, metinDugumu, replaceWith, text } from "./lib/dom.mjs";
import { ALTLIK_YOLU_RE, HARITA_PAKET, altlikCokgenleri, altlikOku, haritaKatalogu, konumunYeri } from "./lib/harita.mjs";
import { bolumBul, bolumKaydet, bolumYukle, idHavuzu, manifestOku, manifestYaz } from "./lib/paket.mjs";
import { katalogOku } from "./lib/set.mjs";

const KKP = path.dirname(fileURLToPath(import.meta.url));
const SABLON = process.env.KKP_SABLON ? path.resolve(process.env.KKP_SABLON) : path.join(KKP, "sablon");
const KULLANIM = "kullanım: node scripts/kkp/harita-ekle.mjs <paket-dizin> <spec.json | dizin> [--taslak]\n          node scripts/kkp/harita-ekle.mjs --altliklar | --kodlar <altlık>";
const SINIR = { isaretci: 60, grup: 6, alan: 12, alanNokta: 200, ad: 80, metin: 400, baslik: 200 };
const ID_RE = /^sek\d{4,9}$/;
const GRUP_RE = /^[a-z][a-z0-9-]*$/;
const YER_TURLERI = ["istek", "sonra", "basliktanSonra"];
const BASLIK_RE = /^h[1-6]$/;

function hata(mesaj, kod = 1) { console.error(mesaj); process.exit(kod); }
const haritaKarti = (n) => n.tagName === "figure" && hasClass(n, "kt-harita");

// ───────────────────────── Argümanlar ─────────────────────────
const argv = process.argv.slice(2);
let katalog;
try { katalog = haritaKatalogu(katalogOku(SABLON)); } catch (e) { hata("HATA: " + e.message); }
const altlikBul = (ad) => katalog.altliklar.find((a) => a.ad === ad);
if (argv[0] === "--altliklar") {
  for (const a of katalog.altliklar) console.log(`${a.ad}\t${a.durum}\t${a.etiket} — ${a.neZaman}`);
  process.exit(0);
}
if (argv[0] === "--kodlar") {
  const a = altlikBul(argv[1]);
  if (!a) hata(`altlık '${argv[1] ?? ""}' yok; seçenekler: ${katalog.altliklar.map((x) => x.ad).join(", ")}`);
  for (const [k, ad] of [...altlikOku(SABLON, a).kodlar].sort((x, y) => x[1].localeCompare(y[1], "tr"))) console.log(`${k}\t${ad}`);
  process.exit(0);
}
const taslakSerbest = argv.includes("--taslak");
const konum = argv.filter((a) => a !== "--taslak");
for (const a of konum) if (a.startsWith("--")) hata(`Bilinmeyen seçenek ${a}\n${KULLANIM}`, 2);
if (konum.length !== 2) hata(KULLANIM, 2);
const PAKET = path.resolve(konum[0]);
const SPEC = path.resolve(konum[1]);
if (!fs.existsSync(SPEC)) hata(`HATA: spec yok: ${SPEC}`);
const specDosyalari = fs.statSync(SPEC).isDirectory()
  ? fs.readdirSync(SPEC).filter((a) => /\.json$/i.test(a)).sort().map((a) => path.join(SPEC, a))
  : [SPEC];
if (!specDosyalari.length) hata(`HATA: dizinde *.json yok: ${SPEC}`);

let manifest;
try { ({ manifest } = manifestOku(PAKET)); } catch (e) { hata("HATA: " + e.message); }
const havuz = idHavuzu(PAKET, manifest);
const yuklu = new Map(); // bölüm id → bolumYukle sonucu
const yukle = (bolum) => { if (!yuklu.has(bolum.id)) yuklu.set(bolum.id, bolumYukle(PAKET, bolum)); return yuklu.get(bolum.id); };
const altlikOnbellek = new Map();
const altlikVerisi = (a) => {
  if (!altlikOnbellek.has(a.ad)) { const o = altlikOku(SABLON, a); altlikOnbellek.set(a.ad, { ...o, cokgenler: altlikCokgenleri(o.veri) }); }
  return altlikOnbellek.get(a.ad);
};

// ───────────────────────── Doğrulama ─────────────────────────
const hatalar = [];
const uyarilar = [];
const isler = [];
const metinMi = (v, enCok) => typeof v === "string" && v.trim().length > 0 && v.length <= enCok;
const sayiMi = (v) => typeof v === "number" && Number.isFinite(v);

for (const dosya of specDosyalari) {
  const ad = path.basename(dosya);
  const h = (m) => hatalar.push(`${ad}: ${m}`);
  let s;
  try { s = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch (e) { h(`JSON okunamadı: ${e.message}`); continue; }
  const bolum = bolumBul(manifest, s.bolum);
  if (!bolum) { h(`bölüm '${s.bolum}' manifest'te yok`); continue; }
  let y;
  try { y = yukle(bolum); } catch (e) { h(e.message); continue; }
  if (!metinMi(s.baslik, SINIR.baslik)) h(`baslik zorunlu (≤ ${SINIR.baslik} karakter)`);
  if (s.aciklama !== undefined && !metinMi(s.aciklama, SINIR.metin)) h(`aciklama boş ya da çok uzun (≤ ${SINIR.metin})`);

  // Yer: mevcut kart (id) yerinde yenilenir; yoksa yer zorunlu.
  let mevcut = null, yerTuru = null, hedef = null;
  if (s.id !== undefined) {
    if (!ID_RE.test(String(s.id))) h(`id '${s.id}' sekNNNN biçiminde olmalı`);
    else {
      const n = byId(y.sec, s.id);
      if (n && !haritaKarti(n)) h(`id '${s.id}' bölümde var ama harita kartı değil`);
      else if (n) mevcut = n;
      else if (havuz.kullanilan.has(s.id)) h(`id '${s.id}' başka bir bölümde kullanılıyor`);
    }
  }
  if (!mevcut) {
    const turler = YER_TURLERI.filter((t) => s.yer && s.yer[t] !== undefined);
    if (turler.length !== 1) h(`yer: tam biri verilmeli (${YER_TURLERI.join(" | ")})`);
    else {
      yerTuru = turler[0];
      hedef = byId(y.sec, s.yer[yerTuru]);
      if (!hedef) h(`yer.${yerTuru} hedefi bölümde yok: ${s.yer[yerTuru]}`);
      else if (yerTuru === "istek" && !(hedef.tagName === "div" && hasClass(hedef, "kt-kutu") && hasClass(hedef, "kt-etkilesim-istegi"))) h(`yer.istek hedefi div.kt-kutu.kt-etkilesim-istegi olmalı: ${s.yer.istek}`);
      else if (yerTuru === "basliktanSonra" && !BASLIK_RE.test(hedef.tagName)) h(`yer.basliktanSonra hedefi başlık (h1–h6) olmalı: ${s.yer.basliktanSonra}`);
    }
  }

  // Altlık
  const altlik = altlikBul(s.altlik);
  if (!altlik) { h(`altlık '${s.altlik}' yok; seçenekler: ${katalog.altliklar.map((a) => a.ad).join(", ")}`); continue; }
  if (altlik.durum === "taslak" && !taslakSerbest) { h(`altlık '${altlik.ad}' henüz onaylı değil (taslak); onaylılar: ${katalog.altliklar.filter((a) => a.durum !== "taslak").map((a) => a.ad).join(", ") || "(yok)"}`); continue; }
  const { veri, kodlar, cokgenler } = altlikVerisi(altlik);
  const [[gEn, bBoy], [kEn, dBoy]] = veri.sinir;
  const konumDenetle = (k, yer) => {
    if (!Array.isArray(k) || k.length !== 2 || !sayiMi(k[0]) || !sayiMi(k[1])) return h(`${yer}: konum [enlem, boylam] olmalı`);
    if (k[0] < gEn || k[0] > kEn || k[1] < bBoy || k[1] > dBoy) {
      const ters = k[1] >= gEn && k[1] <= kEn && k[0] >= bBoy && k[0] <= dBoy;
      h(`${yer}: [${k}] '${altlik.ad}' altlığının dışında (enlem ${gEn}…${kEn}, boylam ${bBoy}…${dBoy})${ters ? " — sıra [enlem, boylam]; ters yazılmış görünüyor" : ""}`);
    }
  };
  const kodDenetle = (k, yer) => { if (!kodlar.has(k)) h(`${yer}: '${k}' '${altlik.ad}' altlığında yok (kodlar: node harita-ekle.mjs --kodlar ${altlik.ad})`); };

  // Gruplar
  const gruplar = s.gruplar ?? [];
  if (!Array.isArray(gruplar) || gruplar.length > SINIR.grup) h(`gruplar: en çok ${SINIR.grup}`);
  const grupAdlari = new Set();
  for (const g of Array.isArray(gruplar) ? gruplar : []) {
    if (!GRUP_RE.test(String(g?.ad))) h(`grup adı '${g?.ad}' (a-z, 0-9, tire; harfle başlar)`);
    else if (grupAdlari.has(g.ad)) h(`grup '${g.ad}' yineleniyor`);
    else grupAdlari.add(g.ad);
    if (!metinMi(g?.etiket, SINIR.ad)) h(`grup '${g?.ad}': etiket zorunlu`);
  }
  const grupDenetle = (g, yer) => { if (g != null && !grupAdlari.has(g)) h(`${yer}: grup '${g}' tanımlı değil (gruplar: ${[...grupAdlari].join(", ") || "yok"})`); };

  // Vurgu, işaretçi, alan
  for (const [i, v] of (s.vurgu ?? []).entries()) {
    if (!Array.isArray(v?.k) || !v.k.length) { h(`vurgu[${i}]: k (kod listesi) zorunlu`); continue; }
    for (const k of v.k) kodDenetle(k, `vurgu[${i}]`);
    grupDenetle(v.grup, `vurgu[${i}]`);
  }
  const isaretciler = s.isaretciler ?? [];
  if (!Array.isArray(isaretciler) || isaretciler.length > SINIR.isaretci) h(`isaretciler: en çok ${SINIR.isaretci}`);
  for (const [i, n] of (Array.isArray(isaretciler) ? isaretciler : []).entries()) {
    const yer = `isaretciler[${i}]${n?.ad ? ` (${n.ad})` : ""}`;
    if (!metinMi(n?.ad, SINIR.ad)) h(`${yer}: ad zorunlu (≤ ${SINIR.ad})`);
    if (n?.metin !== undefined && !metinMi(n.metin, SINIR.metin)) h(`${yer}: metin boş ya da çok uzun (≤ ${SINIR.metin})`);
    konumDenetle(n?.konum, yer);
    grupDenetle(n?.grup, yer);
    if (Array.isArray(n?.konum) && sayiMi(n.konum[0]) && sayiMi(n.konum[1]) && !konumunYeri(cokgenler, n.konum)) {
      const ters = konumunYeri(cokgenler, [n.konum[1], n.konum[0]]);
      if (ters) uyarilar.push(`${ad}: ${yer}: [${n.konum}] hiçbir yerin içinde değil, ters çevrilmişi ${kodlar.get(ters)} içinde — sıra [enlem, boylam] olmalı; konumu doğrula`);
    }
  }
  const alanlar = s.alanlar ?? [];
  if (!Array.isArray(alanlar) || alanlar.length > SINIR.alan) h(`alanlar: en çok ${SINIR.alan}`);
  for (const [i, a] of (Array.isArray(alanlar) ? alanlar : []).entries()) {
    const yer = `alanlar[${i}]${a?.ad ? ` (${a.ad})` : ""}`;
    if (!metinMi(a?.ad, SINIR.ad)) h(`${yer}: ad zorunlu`);
    if (!Array.isArray(a?.noktalar) || a.noktalar.length < 3 || a.noktalar.length > SINIR.alanNokta) h(`${yer}: noktalar 3…${SINIR.alanNokta} köşe olmalı`);
    else for (const [j, n] of a.noktalar.entries()) konumDenetle(n, `${yer}.noktalar[${j}]`);
    grupDenetle(a?.grup, yer);
  }

  // Görünüm
  const g = s.gorunum;
  if (g !== undefined) {
    if (g?.merkez !== undefined) {
      konumDenetle(g.merkez, "gorunum.merkez");
      if (g.yakinlik !== undefined && (!sayiMi(g.yakinlik) || g.yakinlik < veri.yakinlik[0] || g.yakinlik > veri.yakinlik[1])) h(`gorunum.yakinlik ${veri.yakinlik[0]}…${veri.yakinlik[1]} arasında olmalı`);
    } else if (Array.isArray(g?.odak) && g.odak.length) for (const k of g.odak) kodDenetle(k, "gorunum.odak");
    else h("gorunum: { merkez, yakinlik } ya da { odak: [kod, …] }");
  }
  if (s.etiketler !== undefined && !["hepsi", "vurgu", "yok"].includes(s.etiketler)) h("etiketler: hepsi | vurgu | yok");

  isler.push({ ad, s, bolum, y, mevcut, yerTuru, hedef, altlik });
}
// Aynı koşuda iki spec aynı id'yi / aynı hedefi isteyemez.
const gorulenId = new Set();
for (const is of isler) {
  if (is.s.id === undefined) continue;
  if (gorulenId.has(is.s.id)) hatalar.push(`${is.ad}: id '${is.s.id}' bu koşuda iki kez`);
  gorulenId.add(is.s.id);
}
if (hatalar.length) hata("HATA (pakete dokunulmadı):\n  " + hatalar.join("\n  "));
for (const u of uyarilar) console.error("UYARI: " + u);

// ───────────────────────── Kart ─────────────────────────
const temiz = (v) => String(v).replace(/\s+/g, " ").trim();
function basliktanSonrakiP(baslik) {
  for (const k of kids(baslik.parentNode).slice(kids(baslik.parentNode).indexOf(baslik) + 1)) {
    if (BASLIK_RE.test(k.tagName)) return null;
    if (k.tagName === "p") return k;
  }
  return null;
}
function satirla(ebeveyn, ...cocuklar) { for (const c of cocuklar) { append(ebeveyn, metinDugumu("\n")); append(ebeveyn, c); } append(ebeveyn, metinDugumu("\n")); }

for (const is of isler) {
  const { s, y, altlik } = is;
  const gruplar = (s.gruplar ?? []).map((g) => ({ ad: g.ad, etiket: temiz(g.etiket) }));
  const grupSirasi = (g) => gruplar.findIndex((x) => x.ad === g) + 1;
  const isaretciler = (s.isaretciler ?? []).map((n) => ({ ad: temiz(n.ad), konum: n.konum, ...(n.metin ? { metin: temiz(n.metin) } : {}), ...(n.grup ? { grup: n.grup } : {}) }));
  const tanim = {
    altlik: altlik.ad,
    ...(s.gorunum ? { gorunum: s.gorunum } : {}),
    ...(s.etiketler ? { etiketler: s.etiketler } : {}),
    ...(gruplar.length ? { gruplar } : {}),
    ...(s.vurgu?.length ? { vurgu: s.vurgu.map((v) => ({ k: v.k, ...(v.grup ? { grup: v.grup } : {}) })) } : {}),
    ...(isaretciler.length ? { isaretciler } : {}),
    ...(s.alanlar?.length ? { alanlar: s.alanlar.map((a) => ({ ad: temiz(a.ad), noktalar: a.noktalar, ...(a.kesik ? { kesik: true } : {}), ...(a.grup ? { grup: a.grup } : {}) })) } : {}),
  };

  // Yenilemede eski madde id'leri ada göre korunur (öğrencinin notu kopmasın).
  const eskiMaddeler = new Map();
  let eskiAltId = null;
  if (is.mevcut) {
    for (const li of bulHepsi(is.mevcut, (n) => n.tagName === "li" && attr(n, "id"))) {
      const guclu = kids(li).find((c) => c.tagName === "strong");
      if (guclu) eskiMaddeler.set(temiz(text(guclu)), attr(li, "id"));
    }
    eskiAltId = attr(kids(is.mevcut).find((c) => c.tagName === "figcaption") ?? {}, "id") ?? null;
  }
  const kartId = is.mevcut ? attr(is.mevcut, "id") : (s.id ?? havuz.uret("sek"));
  havuz.kaydet(kartId);

  const kart = eleman("figure", { class: "kt-harita", id: kartId, "data-kt-harita": altlik.ad });
  const tuval = eleman("div", { class: "kt-harita-tuval", role: "application", "aria-label": temiz(s.aciklama ?? s.baslik) });
  const veriEl = eleman("script", { type: "application/json", class: "kt-harita-veri" });
  append(veriEl, metinDugumu("\n" + JSON.stringify(tanim).replace(/</g, "\\u003c") + "\n"));
  const parcalar = [tuval, veriEl];
  if (isaretciler.length) {
    const liste = eleman("ul", { class: "kt-harita-yerler" });
    const maddeler = isaretciler.map((n, i) => {
      const id = eskiMaddeler.get(n.ad) ?? havuz.uret("li");
      eskiMaddeler.delete(n.ad);
      const li = eleman("li", { id, "data-kt-yer": String(i), ...(n.grup ? { "data-kt-grup": n.grup, class: `kt-harita-g${grupSirasi(n.grup)}` } : {}) });
      const guclu = eleman("strong");
      append(guclu, metinDugumu(n.ad));
      append(li, guclu);
      if (n.metin) append(li, metinDugumu(" — " + n.metin));
      return li;
    });
    satirla(liste, ...maddeler);
    parcalar.push(liste);
  }
  const alt = eleman("figcaption", { id: eskiAltId ?? `${kartId}-alt` });
  havuz.kaydet(attr(alt, "id"));
  append(alt, metinDugumu(temiz(s.baslik)));
  parcalar.push(alt);
  satirla(kart, ...parcalar);

  let yerMetni;
  if (is.mevcut) { replaceWith(is.mevcut, kart); yerMetni = "yerinde yenilendi"; }
  else if (is.yerTuru === "istek") { replaceWith(is.hedef, kart); yerMetni = `${attr(is.hedef, "id")} yerine`; }
  else {
    const ref = is.yerTuru === "sonra" ? is.hedef : (basliktanSonrakiP(is.hedef) ?? is.hedef);
    const nl = metinDugumu("\n");
    insertAfter(ref, nl); insertAfter(nl, kart);
    yerMetni = `${attr(ref, "id")} ardına`;
  }
  const vurguSayisi = (s.vurgu ?? []).reduce((a, v) => a + v.k.length, 0);
  console.log(`${is.bolum.id}: ${kartId} (${altlik.ad}) — ${yerMetni} · işaretçi ${isaretciler.length} · vurgu ${vurguSayisi} · alan ${(s.alanlar ?? []).length} · grup ${gruplar.length}`);
}

// ───────────────────────── Set dosyaları, manifest, sayfa bağları ─────────────────────────
const setYoluMu = (yol) => yol === HARITA_PAKET.leaflet || yol === HARITA_PAKET.motor || yol === HARITA_PAKET.stil || ALTLIK_YOLU_RE.test(yol);
const kopyala = (goreli, hedef) => { const h = path.join(PAKET, ...hedef.split("/")); fs.mkdirSync(path.dirname(h), { recursive: true }); fs.copyFileSync(path.join(SABLON, goreli), h); };
const kullanilan = new Set(); // paket genelinde gereken set yolları
for (const bolum of manifest.bolumler) {
  if (!fs.existsSync(path.join(PAKET, bolum.dosya))) continue;
  const y = yukle(bolum);
  const altliklar = [...new Set(bulHepsi(y.sec, (n) => isEl(n) && haritaKarti(n)).map((n) => attr(n, "data-kt-harita")))].filter(Boolean).sort();
  const js = altliklar.length ? [HARITA_PAKET.leaflet, ...altliklar.map(HARITA_PAKET.altlik), HARITA_PAKET.motor] : [];
  const css = altliklar.length ? [HARITA_PAKET.stil] : [];
  const onceJs = bolum.js ?? [], onceCss = bolum.css ?? [];
  const yeniJs = [...onceJs.filter((x) => !setYoluMu(x)), ...js];
  const yeniCss = [...onceCss.filter((x) => !setYoluMu(x)), ...css];
  const degisti = JSON.stringify(yeniJs) !== JSON.stringify(onceJs) || JSON.stringify(yeniCss) !== JSON.stringify(onceCss);
  if (yeniJs.length) bolum.js = yeniJs; else delete bolum.js;
  if (yeniCss.length) bolum.css = yeniCss; else delete bolum.css;
  for (const yol of [...js, ...css]) kullanilan.add(yol);
  if (y.tamSayfa && (degisti || isler.some((is) => is.bolum.id === bolum.id))) {
    // Sayfa bağları: set satırları silinir, güncel blok yeniden yazılır (link </head> öncesi, script </body> öncesi).
    y.on = y.on.replace(/^<link rel="stylesheet" href="([^"]+)">\n/gm, (satir, yol) => (setYoluMu(yol) ? "" : satir));
    y.son = y.son.replace(/^<script src="([^"]+)"><\/script>\n/gm, (satir, yol) => (setYoluMu(yol) ? "" : satir));
    const bas = y.on.indexOf("</head>");
    if (bas >= 0) y.on = y.on.slice(0, bas) + css.map((yol) => `<link rel="stylesheet" href="${yol}">\n`).join("") + y.on.slice(bas);
    const govde = y.son.indexOf("</body>");
    const blok = js.map((yol) => `<script src="${yol}"></script>\n`).join("");
    y.son = govde >= 0 ? y.son.slice(0, govde) + blok + y.son.slice(govde) : y.son.replace(/\s*$/, "\n") + blok;
    yuklu.set(bolum.id, y);
  }
  if (degisti || isler.some((is) => is.bolum.id === bolum.id)) bolumKaydet(y);
}
for (const yol of kullanilan) {
  const m = ALTLIK_YOLU_RE.exec(yol);
  if (m) kopyala(altlikBul(m[1])?.dosya ?? hata(`HATA: bölümdeki altlık '${m[1]}' katalogda yok`), yol);
  else kopyala(yol === HARITA_PAKET.leaflet ? katalog.dosyalar.leaflet : yol === HARITA_PAKET.motor ? katalog.dosyalar.motor : katalog.dosyalar.stil, yol);
}
// Artık kullanılmayan set dosyaları (kart kaldırılmış / altlığı değişmiş).
for (const goreli of [HARITA_PAKET.leaflet, HARITA_PAKET.motor, HARITA_PAKET.stil, ...(fs.existsSync(path.join(PAKET, "assets", "js")) ? fs.readdirSync(path.join(PAKET, "assets", "js")).map((a) => `assets/js/${a}`).filter((x) => ALTLIK_YOLU_RE.test(x)) : [])]) {
  if (!kullanilan.has(goreli)) fs.rmSync(path.join(PAKET, ...goreli.split("/")), { force: true });
}
manifest.ozellikler = { ...(manifest.ozellikler ?? {}), etkilesim: true };
manifestYaz(PAKET, manifest);
