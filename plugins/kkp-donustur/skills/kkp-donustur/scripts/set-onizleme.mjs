#!/usr/bin/env node
// Ortak tasarım seti (Plan 35) — önizleme sayfası üretici. Seçenekleri eksen eksen ve okuyucunun üç temasında gösteren, sunucusuz açılan
// bir sayfa üretir; seçenekler burada görülüp onaylanır, editör de skill önerirken seçenekleri buradan görür.
//
//   node scripts/kkp/set-onizleme.mjs <cikti-dizin> [--tema-css <dosya>]
//
// Çıktı: index.html (seçiciler + örnek bölüm) · kitap.css · ortak.js · set/** (katalogdaki CSS'ler, fontlar, lisanslar — kaynağıyla bayt bayt aynı).
// Örnek bölüm sablon/set/onizleme-ornek.html'dir. Tema token'ları (--kt-*) üretim anında okuyucunun platform CSS'inden kopyalanır
// (packages/kkp/runtime/kitap.css — okuyucuya servis edilen dosyanın kaynağı; derleme çıktısı apps/web/public/_kt repoda yoktur);
// kitlerde üretici aynı dosyayı sablon/okuyucu-tema.css olarak koyar; başka yerde --tema-css ile verilir.
// Seçim adres çubuğunda tutulur (#takim=hukuk&renk=mor&tema=dark): takım + onu ezen eksenler — gorunum-ekle'nin argümanlarıyla aynı mantık.
// Şablon dizini KKP_SABLON ile değiştirilebilir (test). Çıkış: 0 başarı · 1 katalog/dosya hatası · 2 kullanım hatası.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { EKSENLER, katalogDenetle, katalogOku } from "./lib/set.mjs";

const KKP = path.dirname(fileURLToPath(import.meta.url));
const KOK = path.resolve(KKP, "..", "..");
const SABLON = process.env.KKP_SABLON ? path.resolve(process.env.KKP_SABLON) : path.join(KKP, "sablon");
const EKSEN_ETIKETI = { yazi: "Yazı takımı", gorunum: "Görünüm", kart: "Kart biçimi", yogunluk: "Yoğunluk", renk: "Renk ailesi", matematik: "Matematik yazısı" };
const TEMALAR = [["light", "Açık"], ["dark", "Koyu"], ["sepia", "Sepya"]];

function hata(mesaj, kod = 1) { console.error(mesaj); process.exit(kod); }
const kacis = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ───────────────────────── Argümanlar ─────────────────────────
const argv = process.argv.slice(2);
let cikti = null;
let temaCssYolu = null;
for (let i = 0; i < argv.length; i++) {
  if (argv[i] === "--tema-css") temaCssYolu = argv[++i] ?? hata("--tema-css bir dosya ister", 2);
  else if (argv[i].startsWith("--")) hata(`Bilinmeyen seçenek ${argv[i]}`, 2);
  else if (cikti === null) cikti = argv[i];
  else hata(`Fazla argüman: ${argv[i]}`, 2);
}
if (!cikti) hata("kullanım: node scripts/kkp/set-onizleme.mjs <cikti-dizin> [--tema-css <dosya>]", 2);

// ───────────────────────── Girdiler ─────────────────────────
let katalog;
try { katalog = katalogOku(SABLON); } catch (e) { hata(e.message); }
const katalogHatalari = katalogDenetle(katalog, SABLON);
if (katalogHatalari.length) hata("katalog geçersiz:\n  " + katalogHatalari.join("\n  "));

// Repoda platform CSS'inin kaynağı; kitte üreticinin şablon dizinine koyduğu kopyası (okuyucu-tema.css).
temaCssYolu ??= [path.join(KOK, "packages", "kkp", "runtime", "kitap.css"), path.join(SABLON, "okuyucu-tema.css")].find((a) => fs.existsSync(a));
if (!temaCssYolu || !fs.existsSync(temaCssYolu)) hata("okuyucu CSS'i bulunamadı; --tema-css <dosya> ile verin");

/** Okuyucu CSS'inden üç temanın bildirim bloğunu ayıklar (yalnız --kt-* ve color-scheme). */
function temaBloklari(css) {
  const yorumsuz = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const bloklar = {};
  for (const m of yorumsuz.matchAll(/([^{}]*)\{([^{}]*)\}/g)) {
    for (const [tema] of TEMALAR) {
      if (!m[1].split(",").some((s) => s.trim() === `html[data-kt-theme="${tema}"]`)) continue;
      // aynı seçiciyle birden çok kural olabilir; bildirimler sırayla birikir
      const bildirimler = m[2].split(";").map((b) => b.trim()).filter((b) => /^(--kt-[a-z0-9-]+|color-scheme)\s*:/.test(b));
      if (bildirimler.length) bloklar[tema] = [bloklar[tema], ...bildirimler].filter(Boolean).join("; ");
    }
  }
  for (const [tema] of TEMALAR) if (!bloklar[tema]?.includes("--kt-bg")) hata(`${temaCssYolu}: html[data-kt-theme="${tema}"] bloğu okunamadı`);
  return bloklar;
}
const tema = temaBloklari(fs.readFileSync(temaCssYolu, "utf8"));

const ornekYolu = path.join(SABLON, "set", "onizleme-ornek.html");
if (!fs.existsSync(ornekYolu)) hata(`örnek bölüm yok: ${ornekYolu}`);
const ornek = fs.readFileSync(ornekYolu, "utf8").replace(/\r\n/g, "\n").replace(/^\s*<!--[\s\S]*?-->\s*/, "");

// ───────────────────────── Sayfa ─────────────────────────
const secenekler = (liste) => liste.map((s) => `<option value="${kacis(s.ad)}">${kacis(s.etiket)}${s.durum === "taslak" ? " (taslak)" : s.durum === "emekli" ? " (emekli)" : ""}</option>`).join("");
const eksenSecicileri = EKSENLER.map((e) =>
  `<label class="oz-alan">${EKSEN_ETIKETI[e]}<select id="oz-${e}" data-eksen="${e}">${secenekler(katalog.eksenler[e])}</select></label>`).join("\n    ");
const takimSecici = `<label class="oz-alan">Hazır takım<select id="oz-takim"><option value="">— takımsız —</option>${(katalog.takimlar ?? []).map((t) => `<option value="${kacis(t.ad)}">${kacis(t.etiket)}</option>`).join("")}</select></label>`;
const temaDugmeleri = TEMALAR.map(([ad, etiket]) => `<button type="button" data-tema="${ad}" aria-pressed="${ad === "light"}">${etiket}</button>`).join("");
// Sayfadaki betiğin kullandığı katalog özeti (</script> kaçışı: < → <).
const veri = JSON.stringify({ eksenSirasi: EKSENLER, eksenler: katalog.eksenler, takimlar: katalog.takimlar ?? [] }).replace(/</g, "\\u003c");

const ARAYUZ_CSS = `
html,body{margin:0;background:var(--kt-bg);color:var(--kt-fg)}
body{font-family:var(--kt-font-metin);line-height:1.6}
math{font-family:var(--kt-font-math)}
.oz-cubuk{position:sticky;top:0;z-index:10;padding:.6rem 1rem .7rem;background:var(--kt-surface);border-bottom:1px solid var(--kt-border);font:14px/1.4 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--kt-fg)}
.oz-satir{display:flex;flex-wrap:wrap;gap:.5rem .8rem;align-items:end}
.oz-ad{align-self:center;margin-inline-end:.3rem;font-weight:700}
.oz-alan{display:grid;gap:.15rem;font-size:12px;color:var(--kt-muted)}
.oz-alan select{font:inherit;font-size:14px;min-height:2.75rem;max-width:15rem;padding:.25rem .5rem;border:1px solid var(--kt-border);border-radius:.4rem;background:var(--kt-bg);color:var(--kt-fg);cursor:pointer}
.oz-tema{display:inline-flex;margin-inline-start:auto;border:1px solid var(--kt-border);border-radius:.4rem;overflow:hidden}
.oz-tema button{font:inherit;min-height:2.75rem;padding:.25rem .9rem;border:0;background:var(--kt-bg);color:var(--kt-fg);cursor:pointer}
.oz-tema button+button{border-inline-start:1px solid var(--kt-border)}
.oz-tema button[aria-pressed="true"]{background:var(--kt-accent);color:var(--kt-bg)}
.oz-cubuk select:focus-visible,.oz-cubuk button:focus-visible{outline:2px solid var(--kt-accent);outline-offset:2px}
.oz-alt{display:flex;flex-wrap:wrap;gap:.3rem 1.2rem;align-items:baseline;margin-top:.55rem}
.oz-bilgi{margin:0;color:var(--kt-muted)}
.oz-komut{font:12px/1.5 ui-monospace,SFMono-Regular,Consolas,monospace;color:var(--kt-fg);user-select:all;overflow-wrap:anywhere}
.oz-dipnot-no{font-weight:600}
`;

const BETIK = `
(function () {
  var K = JSON.parse(document.getElementById("oz-katalog").textContent);
  var EKSENLER = K.eksenSirasi;
  var TEMALAR = ["light", "dark", "sepia"];
  var varsayilan = {};
  EKSENLER.forEach(function (e) { varsayilan[e] = K.eksenler[e].filter(function (s) { return s.dosya === null; })[0].ad; });
  var durum = { takim: "", tema: "light", ozel: {} };
  var takimSec = document.getElementById("oz-takim");
  var bul = function (liste, ad) { return liste.filter(function (x) { return x.ad === ad; })[0] || null; };

  // Set bağları kitap.css'ten sonra, paketteki sırayla (yazı, görünüm, kart, yoğunluk, renk, matematik).
  var bag = {};
  EKSENLER.forEach(function (e) { var l = document.createElement("link"); l.rel = "stylesheet"; l.id = "set-" + e; document.head.appendChild(l); bag[e] = l; });

  /** Takımın (ya da varsayılanların) verdiği seçim — eksen ezmeleri hariç. */
  function taban() {
    var s = {}; EKSENLER.forEach(function (e) { s[e] = varsayilan[e]; });
    var t = bul(K.takimlar, durum.takim);
    if (t) Object.keys(t.secim).forEach(function (e) { s[e] = t.secim[e]; });
    return s;
  }
  function secim() { var s = taban(); Object.keys(durum.ozel).forEach(function (e) { s[e] = durum.ozel[e]; }); return s; }

  function uygula() {
    var s = secim();
    var taslak = [];
    EKSENLER.forEach(function (e) {
      var o = bul(K.eksenler[e], s[e]);
      document.getElementById("oz-" + e).value = s[e];
      if (o.dosya) bag[e].href = o.dosya; else bag[e].removeAttribute("href");
      if (o.durum === "taslak") taslak.push(o.etiket);
    });
    takimSec.value = durum.takim;
    document.documentElement.setAttribute("data-kt-theme", durum.tema);
    Array.prototype.forEach.call(document.querySelectorAll(".oz-tema button"), function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-tema") === durum.tema)); });

    var t = bul(K.takimlar, durum.takim);
    document.getElementById("oz-bilgi").textContent = (t ? t.etiket + ": " + t.neZaman : "Hazır bir takımla başlayın ya da eksenleri tek tek seçin.")
      + (taslak.length ? " Taslak (henüz onaylanmadı): " + taslak.join(", ") + "." : "");
    var komut = "node scripts/kkp/gorunum-ekle.mjs <paket>" + (durum.takim ? " --takim " + durum.takim : "");
    EKSENLER.forEach(function (e) { if (durum.ozel[e] !== undefined) komut += " --" + e + " " + durum.ozel[e]; });
    document.getElementById("oz-komut").textContent = komut;

    var parca = [];
    if (durum.takim) parca.push("takim=" + durum.takim);
    EKSENLER.forEach(function (e) { if (durum.ozel[e] !== undefined) parca.push(e + "=" + durum.ozel[e]); });
    if (durum.tema !== "light") parca.push("tema=" + durum.tema);
    history.replaceState(null, "", parca.length ? "#" + parca.join("&") : location.pathname + location.search);
  }

  function adrestenOku() {
    durum = { takim: "", tema: "light", ozel: {} };
    location.hash.replace(/^#/, "").split("&").forEach(function (p) {
      var i = p.indexOf("="); if (i < 0) return;
      var a = p.slice(0, i), d = decodeURIComponent(p.slice(i + 1));
      if (a === "takim" && bul(K.takimlar, d)) durum.takim = d;
      else if (a === "tema" && TEMALAR.indexOf(d) >= 0) durum.tema = d;
      else if (EKSENLER.indexOf(a) >= 0 && bul(K.eksenler[a], d)) durum.ozel[a] = d;
    });
    var t = taban();
    Object.keys(durum.ozel).forEach(function (e) { if (durum.ozel[e] === t[e]) delete durum.ozel[e]; });
  }

  takimSec.addEventListener("change", function () { durum.takim = takimSec.value; durum.ozel = {}; uygula(); });
  EKSENLER.forEach(function (e) {
    document.getElementById("oz-" + e).addEventListener("change", function (olay) {
      if (olay.target.value === taban()[e]) delete durum.ozel[e]; else durum.ozel[e] = olay.target.value;
      uygula();
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(".oz-tema button"), function (b) {
    b.addEventListener("click", function () { durum.tema = b.getAttribute("data-tema"); uygula(); });
  });
  window.addEventListener("hashchange", function () { adrestenOku(); uygula(); });

  // Dipnot numarasını okuyucu basar; önizlemede yerine burada yazılır.
  Array.prototype.forEach.call(document.querySelectorAll(".kt-dipnot"), function (not, i) {
    var p = not.querySelector("p"); if (!p) return;
    var no = document.createElement("span"); no.className = "oz-dipnot-no"; no.textContent = (i + 1) + ". "; p.insertBefore(no, p.firstChild);
  });

  adrestenOku();
  uygula();
})();
`;

const html = `<!doctype html>
<html lang="tr" data-kt-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Kitappta seti — önizleme</title>
<style>
/* Okuyucunun tema token'ları — platform ${path.basename(temaCssYolu)} dosyasından kopyalandı (elle düzenlenmez). */
:root,html[data-kt-theme="light"]{${tema.light}}
html[data-kt-theme="dark"]{${tema.dark}}
html[data-kt-theme="sepia"]{${tema.sepia}}
/* Önizleme arayüzü (pakete girmez). */${ARAYUZ_CSS}</style>
<link rel="stylesheet" href="kitap.css">
</head>
<body>
<header class="oz-cubuk">
  <div class="oz-satir">
    <strong class="oz-ad">Kitappta seti</strong>
    ${takimSecici}
    ${eksenSecicileri}
    <div class="oz-tema" role="group" aria-label="Tema">${temaDugmeleri}</div>
  </div>
  <div class="oz-alt"><p class="oz-bilgi" id="oz-bilgi"></p><code class="oz-komut" id="oz-komut"></code></div>
</header>
<main>
${ornek.trimEnd()}
</main>
<script type="application/json" id="oz-katalog">${veri}</script>
<script src="ortak.js"></script>
<script>${BETIK}</script>
</body>
</html>
`;

// ───────────────────────── Yaz ─────────────────────────
fs.mkdirSync(cikti, { recursive: true });
fs.writeFileSync(path.join(cikti, "index.html"), html);
for (const ad of ["kitap.css", "ortak.js"]) fs.copyFileSync(path.join(SABLON, ad), path.join(cikti, ad));
fs.rmSync(path.join(cikti, "set"), { recursive: true, force: true });
let kopyalanan = 0;
(function kopyala(kaynak, hedef) {
  for (const e of fs.readdirSync(kaynak, { withFileTypes: true })) {
    if (e.isDirectory()) { kopyala(path.join(kaynak, e.name), path.join(hedef, e.name)); continue; }
    if (e.name === "onizleme-ornek.html") continue;
    fs.mkdirSync(hedef, { recursive: true });
    fs.copyFileSync(path.join(kaynak, e.name), path.join(hedef, e.name));
    kopyalanan++;
  }
})(path.join(SABLON, "set"), path.join(cikti, "set"));

const secenekSayisi = EKSENLER.reduce((n, e) => n + katalog.eksenler[e].length, 0);
console.log(`önizleme: ${path.join(cikti, "index.html")} — ${secenekSayisi} seçenek, ${(katalog.takimlar ?? []).length} takım, ${kopyalanan} set dosyası`);
