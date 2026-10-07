#!/usr/bin/env node
// kkp/1 paketine Kitappta setinden görünüm uygular (Plan 35 — ortak tasarım seti). Font, CSS ve renk yalnız setten seçilir.
//
//   node scripts/kkp/gorunum-ekle.mjs <paket-dizin> [--takim x] [--yazi x] [--gorunum x] [--kart x] [--yogunluk x] [--renk x] [--matematik x] [--taslak]
//
// Seçim: takım önce uygulanır, tek tek verilen eksen onu ezer, verilmeyen eksen varsayılanını alır (bugünkü görünüm, dosyasız).
// Seçenekler sablon/katalog.json'dadır; bilinmeyen ya da henüz onaylanmamış (taslak) seçenek reddedilir ve geçerli adlar listelenir.
// --taslak yalnız önizleme ve test içindir. Önce HER ŞEY doğrulanır (hata → çıkış 1, liste stderr'e, hiçbir dosyaya dokunulmaz); sonra:
//   1  eski set dosyaları silinir: assets/css/set-<eksen>.css ve kataloğun bildiği fontlar (hocanın kendi fontuna dokunulmaz)
//   2  seçilen CSS'ler SABİT adlarla kopyalanır (assets/css/set-yazi.css …), fontlar assets/fonts/'a — içerik katalogdaki dosyayla aynı
//   3  manifest.ortak.css = önceki set-dışı girdiler (kitap.css …) + set dosyaları (sıra: yazı, görünüm, kart, yoğunluk, renk, matematik)
//   4  her bölüm sayfasının <head>'inde set bağları kitap.css bağından hemen sonra, aynı sırayla (çift tıklayınca açılan sayfa da setli)
//   5  seçim manifest.kitap.uretim.set'e yazılır ({ surum, takim, yazi, gorunum, kart, yogunluk, renk, matematik })
// Yeniden koşmak seçimi değiştirir; argümansız koşmak seti kaldırır (varsayılan görünüm). Bölüm içeriğine dokunulmaz.
// Şablon dizini KKP_SABLON ile değiştirilebilir (test). Çıkış: 0 başarı · 1 seçim/paket hatası · 2 kullanım hatası.
// stdout: "set: takım hukuk · yazı source-serif-inter · görünüm akademik · kart dolgulu · yoğunluk normal · renk bordo · matematik yok · font 6 dosya 412 KB".
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EKSENLER, katalogOku, secimCoz, setCssYolu } from "./lib/set.mjs";
import { manifestOku, manifestYaz } from "./lib/paket.mjs";

const KKP = path.dirname(fileURLToPath(import.meta.url));
const SABLON = process.env.KKP_SABLON ? path.resolve(process.env.KKP_SABLON) : path.join(KKP, "sablon");
const TABAN_CSS = "assets/css/kitap.css";
const KULLANIM = "kullanım: node scripts/kkp/gorunum-ekle.mjs <paket-dizin> [--takim x] [--yazi x] [--gorunum x] [--kart x] [--yogunluk x] [--renk x] [--matematik x]";

function hata(mesaj, kod = 1) { console.error(mesaj); process.exit(kod); }

// ───────────────────────── Argümanlar ─────────────────────────
const argv = process.argv.slice(2);
const istek = {};
let paket = null;
let taslakSerbest = false;
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--taslak") { taslakSerbest = true; continue; }
  if (a.startsWith("--")) {
    const ad = a.slice(2);
    if (ad !== "takim" && !EKSENLER.includes(ad)) hata(`Bilinmeyen seçenek ${a}\n${KULLANIM}`, 2);
    const deger = argv[++i];
    if (deger === undefined || deger.startsWith("--")) hata(`${a} bir değer ister\n${KULLANIM}`, 2);
    istek[ad] = deger;
    continue;
  }
  if (paket !== null) hata(`Fazla argüman: ${a}\n${KULLANIM}`, 2);
  paket = a;
}
if (!paket) hata(KULLANIM, 2);

// ───────────────────────── Doğrulama (dosyaya dokunmadan) ─────────────────────────
let katalog, manifest;
try { katalog = katalogOku(SABLON); ({ manifest } = manifestOku(paket)); } catch (e) { hata(e.message); }
const { secim, css, fontlar, hatalar } = secimCoz(katalog, istek, { taslakSerbest });
for (const d of [...css, ...fontlar]) if (!fs.existsSync(path.join(SABLON, d.kaynak))) hatalar.push(`set dosyası yok: ${d.kaynak}`);

const tabanYolu = path.join(paket, TABAN_CSS);
if (css.length) {
  // Set dosyaları yalnız --kitap-* değişkeni ayarlar; onları okuyan taban kitap.css v1.1'dir.
  if (!fs.existsSync(tabanYolu)) hatalar.push(`${TABAN_CSS} yok: set, Kitappta şablonuyla üretilen pakete uygulanır`);
  else if (!fs.readFileSync(tabanYolu, "utf8").includes("var(--kitap-")) hatalar.push(`${TABAN_CSS} set değişkenlerini (--kitap-*) okumuyor: paket eski şablonla üretilmiş; önce şablondaki kitap.css ile güncelleyin`);
}
const bolumler = [];
for (const b of manifest.bolumler ?? []) {
  const yol = path.join(paket, b.dosya);
  if (!fs.existsSync(yol)) { hatalar.push(`bölüm dosyası yok: ${b.dosya}`); continue; }
  bolumler.push({ dosya: b.dosya, yol, metin: fs.readFileSync(yol, "utf8") });
}
if (hatalar.length) hata("gorunum-ekle: seçim uygulanmadı\n  " + hatalar.join("\n  "));

// ───────────────────────── 1–2. Dosyalar ─────────────────────────
const setCssleri = new Set(EKSENLER.map(setCssYolu));
const katalogFontlari = new Set(Object.values(katalog.fontlar ?? {}).flatMap((f) => f.dosyalar.map((d) => `assets/fonts/${path.posix.basename(d.dosya)}`)));
for (const goreli of [...setCssleri, ...katalogFontlari]) fs.rmSync(path.join(paket, goreli), { force: true });
for (const d of [...css, ...fontlar]) {
  const hedef = path.join(paket, d.hedef);
  fs.mkdirSync(path.dirname(hedef), { recursive: true });
  fs.copyFileSync(path.join(SABLON, d.kaynak), hedef);
}
const fontDizini = path.join(paket, "assets", "fonts");
if (fs.existsSync(fontDizini) && fs.readdirSync(fontDizini).length === 0) fs.rmdirSync(fontDizini);

// ───────────────────────── 3, 5. Manifest ─────────────────────────
const setListesi = css.map((c) => c.hedef);
manifest.ortak ??= {};
manifest.ortak.css = [...(manifest.ortak.css ?? []).filter((y) => !setCssleri.has(y)), ...setListesi];
manifest.kitap ??= {};
manifest.kitap.uretim = { ...(manifest.kitap.uretim ?? {}), set: { surum: 1, ...secim } };
manifestYaz(paket, manifest);

// ───────────────────────── 4. Bölüm sayfaları ─────────────────────────
// Yalnız <head> düzenlenir (dosyanın <section'dan önceki kısmı); bölüm içeriği bayt bayt aynı kalır. Fragment bölümde <head> yoktur.
const SET_BAGI_RE = /[ \t]*<link rel="stylesheet" href="assets\/css\/set-[a-z]+\.css">\r?\n?/g;
for (const b of bolumler) {
  const bas = b.metin.indexOf("<section");
  if (bas <= 0 || !/<head[\s>]/i.test(b.metin.slice(0, bas))) continue;
  const satirSonu = b.metin.includes("\r\n") ? "\r\n" : "\n";
  let on = b.metin.slice(0, bas).replace(SET_BAGI_RE, "");
  if (setListesi.length) {
    const satirlar = setListesi.map((y) => `<link rel="stylesheet" href="${y}">${satirSonu}`).join("");
    const taban = /<link rel="stylesheet" href="assets\/css\/kitap\.css">\r?\n?/.exec(on);
    const yer = taban ? taban.index + taban[0].length : on.search(/<\/head>/i);
    if (yer < 0) continue;
    on = on.slice(0, yer) + (taban && !/\n$/.test(taban[0]) ? satirSonu : "") + satirlar + on.slice(yer);
  }
  const yeni = on + b.metin.slice(bas);
  if (yeni !== b.metin) fs.writeFileSync(b.yol, yeni);
}

// ───────────────────────── Rapor ─────────────────────────
const fontBayt = fontlar.reduce((n, f) => n + f.bayt, 0);
console.log(`set: takım ${secim.takim ?? "—"} · yazı ${secim.yazi} · görünüm ${secim.gorunum} · kart ${secim.kart} · yoğunluk ${secim.yogunluk} · renk ${secim.renk} · matematik ${secim.matematik} · font ${fontlar.length ? `${fontlar.length} dosya ${Math.max(1, Math.round(fontBayt / 1024))} KB` : "yok"}`);
