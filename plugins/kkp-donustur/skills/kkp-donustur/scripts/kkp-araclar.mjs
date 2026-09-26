// Hoca agent kiti — hazır HTML kitabı kkp/1 paketine "kayıpsız" çevirmenin mekanik parçaları (kütüphane).
// Kaynak: Maliye Politikası dönüşümü (26–27.09.2026, docs/DEV_NOTES.md). Yargı isteyen kararlar (hangi script çalışma-anı katmanı,
// hangi figüre hangi gömülü uygulama, bölüm sınırları) agent'a kalır; buradaki fonksiyonlar o kararları uygular.
// Saf Node (fs/path); tarayıcı gerektiren işler pisir.mjs / embed-yukseklik.mjs / kanit.mjs'te.
import fs from "node:fs";
import path from "node:path";

/* ---------------- genel ---------------- */

export const pad4 = (n) => String(n).padStart(4, "0");
export const kacir = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const oku = (p) => fs.readFileSync(p, "utf8");
export const yaz = (p, s) => { fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, s); };
export const kopyala = (a, b) => { fs.mkdirSync(path.dirname(b), { recursive: true }); fs.copyFileSync(a, b); };

/** Doğrulayıcının reddettiği kabuk imzası (KKP-CHR-01). Bunlar dışında hiçbir CSS kuralı atılmaz. */
export const CHR_RE = /#reader-toolbar(?![\w-])|\.probar(?![\w-])|\.reader-[\w-]+/;

/** Doğrulayıcının JS'te METİN olarak taradığı yasak API'ler (KKP-JS-02) — yorumda/dizede geçse bile hata. */
export const JS_YASAK = [
  [/\bfetch\b/, "fetch"], [/\bnew\s+Image\s*\(/, "new Image()"], [/\bXMLHttpRequest\b/, "XMLHttpRequest"], [/\bWebSocket\b/, "WebSocket"],
  [/\bEventSource\b/, "EventSource"], [/\bsendBeacon\b/, "sendBeacon"], [/\bindexedDB\b/, "indexedDB"], [/document\s*\??\.\s*cookie\b/, "document.cookie"],
  [/\bserviceWorker\b/, "serviceWorker"], [/navigator\s*\??\.\s*clipboard\b/, "navigator.clipboard"],
  [/\b(?:window|self|globalThis|frames)\s*\??\.\s*(?:top|parent|open|name|opener|frameElement|location|history)\b/, "window.top/parent/open/name/location/history"],
  [/\bdocument\s*\??\.\s*(?:location|defaultView)\b/, "document.location/defaultView"], [/\bframeElement\b/, "frameElement"],
  [/\b(?:top|parent|opener)\s*\??\.\s*(?:location|document|postMessage|frames|history)\b/, "parent/top üyesi"], [/\bpostMessage\b/, "postMessage"],
  [/(?<![.\w$])location\s*(?:\??\.\s*[A-Za-z_$][\w$]*|\[)/, "location"], [/(?<![.\w$(])location\s*=(?!=)/, "location ="],
  [/(?<![.\w$])history\s*(?:\??\.\s*(?:pushState|replaceState|go|back|forward|state|length|scrollRestoration)\b|\[)/, "history"],
  [/\beval\b/, "eval"], [/(?<![.\w$])Function\s*\(/, "Function("], [/new\s+Function\s*\(/, "new Function"],
  [/\bnew\s+(?:Worker|SharedWorker|RTCPeerConnection|BroadcastChannel)\b/, "Worker/RTC/BroadcastChannel"],
  [/\bset(?:Timeout|Interval)\s*\(\s*['"`]/, "setTimeout(\"kod\")"], [/\bimportScripts\b/, "importScripts"], [/\bimport\s*\(/, "import()"],
  [/document\s*\??\.\s*write(?:ln)?\s*\(/, "document.write"],
  [/createElement\s*\(\s*['"](?:[sS][cC][rR][iI][pP][tT]|[iI][fF][rR][aA][mM][eE]|[fF][rR][aA][mM][eE]|[lL][iI][nN][kK]|[oO][bB][jJ][eE][cC][tT]|[eE][mM][bB][eE][dD])['"]\s*\)/, "createElement(script/iframe/…)"],
  [/ownerDocument\s*\??\.\s*defaultView\b/, "ownerDocument.defaultView"], [/document\s*\??\.\s*open\s*\(/, "document.open("],
  [/(?<![.\w$])(?<!function\s)open\s*\(/, "çıplak open( çağrısı"],
];
/** Yalnız UYARI veren kalıplar (paket reddedilmez ama davranış değişir). */
export const JS_UYARI = [
  [/\b(?:localStorage|sessionStorage)\b/, "localStorage/sessionStorage — okuyucuda oturum içi bellek, kalıcı değil"],
  [/document\.body\.(?:append|appendChild|prepend|insertBefore)\s*\(/, "document.body'ye ekleme — dialog/katman .kt-bolum içine (okuyucu taşır ama kural kalır)"],
  [/getElementById\(\s*['"][^'"]*[A-Z][^'"]*['"]/, "büyük harfli id ile getElementById — doğrulayıcı id'yi küçültür"],
];

/** JS metnini satır satır tarar → [{satir, ad, parca}] (yasak) ve uyarılar. */
export function jsTara(js) {
  const satirlar = js.split("\n");
  const yasak = [], uyari = [];
  satirlar.forEach((s, i) => {
    for (const [re, ad] of JS_YASAK) { const m = re.exec(s); if (m) yasak.push({ satir: i + 1, ad, parca: s.slice(Math.max(0, m.index - 30), m.index + 50).trim() }); }
    for (const [re, ad] of JS_UYARI) { const m = re.exec(s); if (m) uyari.push({ satir: i + 1, ad, parca: s.slice(Math.max(0, m.index - 30), m.index + 50).trim() }); }
  });
  return { yasak, uyari };
}

/* ---------------- id'ler ---------------- */

const ID_OZNITELIK_RE = /(?<![\w-])(id|for|aria-labelledby|aria-describedby|aria-controls|data-card-target|data-figure-target|data-heading-id)="([^"]*)"/g;

/** Büyük harfli id ve id referanslarını küçültür (doğrulayıcı KKP-ID-03 aynı şeyi yapar; biz yaparsak JS/CSS bağları da tutar). */
export function idKucult(html) {
  return html
    .replace(ID_OZNITELIK_RE, (t, a, v) => (/[A-Z]/.test(v) ? `${a}="${v.toLowerCase()}"` : t))
    .replace(/href="#([^"]*[A-Z][^"]*)"/g, (m, v) => `href="#${v.toLowerCase()}"`);
}

/**
 * h1–h4 id'lerini hNNNN yapar (İçindekiler hedefi başlık id'si olmalı, KKP-MAN-W2), kaynak id'yi data-kaynak-id'de saklar.
 * `sayac` {n} paket genelinde ortak tutulur. Dönen harita: eskiId → yeniId (CSS/JS/İçindekiler için).
 */
export function basliklariNumarala(html, sayac, harita = new Map()) {
  const out = html.replace(/<(h[1-4])\b([^>]*)\sid="([^"]+)"/g, (t, etiket, on, eski) => {
    if (/^h\d{4,}$/.test(eski)) return t;
    const yeni = "h" + pad4(++sayac.n);
    harita.set(eski, yeni);
    return `<${etiket}${on} id="${yeni}" data-kaynak-id="${eski}"`;
  });
  return { html: out, harita };
}

/** href="#eski", aria-*, for, data-* hedeflerini haritaya göre günceller. */
export function referanslariGuncelle(html, harita) {
  return html
    .replace(/href="#([^"]+)"/g, (t, id) => (harita.has(id) ? `href="#${harita.get(id)}"` : t))
    .replace(/\b(aria-labelledby|aria-describedby|aria-controls|data-card-target|data-figure-target|data-heading-id)="([^"]*)"/g, (t, a, v) => `${a}="${v.split(/\s+/).map((x) => harita.get(x) || x).join(" ")}"`);
}

/* ---------------- dipnotlar ---------------- */

/**
 * Kaynağın dipnot düğmelerini kkp dipnotuna çevirir. `desen`: numarayı 1. yakalama grubunda veren regex (g bayrağı);
 * `metinler`: {"1": "…"} (kaynağın JS'inden çıkarılmış). Dönen: {html, dipnotlar (section.kt-dipnotlar ya da ""), nolar}.
 */
export function dipnotlariDonustur(html, { desen, metinler, notNo = 9000 }) {
  const nolar = [];
  const out = html.replace(desen, (_, n) => { nolar.push(n); return `<sup><a class="kt-notref" id="notref${pad4(n)}" href="#not${pad4(n)}">${n}</a></sup>`; });
  const dipnotlar = nolar.length
    ? `<section class="kt-dipnotlar">${nolar.map((n) => `<aside class="kt-dipnot" id="not${pad4(n)}"><p id="p${notNo + Number(n)}">${kacir(metinler[n] || "Dipnot metni bulunamadı.")}</p></aside>`).join("")}</section>`
    : "";
  return { html: out, dipnotlar, nolar };
}

/* ---------------- bölüm sayfası ---------------- */

/**
 * Bölüm dosyası (kural 9: çift tıklayınca açılan tam sayfa; doğrulayıcı <head>'i atar). Kaynağın sarmalayıcıları
 * (`sarmalayiciAc`/`sarmalayiciKapa`, ör. `<div class="reader"><div class="paper">`) korunur: CSS onlara göre yazılmıştır.
 */
export function bolumSayfasi({ id, baslik, kitapAdi, govde, dipnotlar = "", sarmalayiciAc = "", sarmalayiciKapa = "", ekSinif = "", cssYolu = "assets/css/kitap.css", jsYollari = ["assets/js/kitap.js"] }) {
  const scriptler = jsYollari.map((j) => `<script src="${j}"></script>`).join("\n");
  return `<!doctype html>\n<html lang="tr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>${kacir(baslik)} — ${kacir(kitapAdi)}</title>\n<link rel="stylesheet" href="${cssYolu}">\n</head>\n<body>\n<section class="kt-bolum${ekSinif ? " " + ekSinif : ""}" id="${id}" data-kt-bolum="${id}">\n${sarmalayiciAc}\n${govde}\n${sarmalayiciKapa}\n${dipnotlar}\n</section>\n${scriptler}\n</body>\n</html>\n`;
}

/** HTML'deki yerel medya referansları (src/data-lightbox/poster + srcset adayları). */
export function medyaReferanslari(html) {
  const set = new Set();
  for (const m of html.matchAll(/(?:src|data-lightbox|poster)="([^"]+)"/g)) { const v = m[1]; if (!/^(https?:|data:|#|\/\/)/i.test(v) && !/\.html?(\?|$)/i.test(v)) set.add(v.split("?")[0]); }
  for (const m of html.matchAll(/srcset="([^"]+)"/g)) for (const aday of m[1].split(",")) { const v = aday.trim().split(/\s+/)[0]; if (v && !/^(https?:|data:)/i.test(v)) set.add(v.split("?")[0]); }
  return set;
}

/** data:image;base64 (≥ esik) görsellerini dosyaya çıkarır; embed içinden `../media/<ad>` yoluyla referanslar. */
export function base64Cikar(html, onek, mediaDizin, { esik = 3000, goreliOnek = "../media/" } = {}) {
  let n = 0;
  const cikti = html.replace(/data:image\/(png|jpeg|jpg|webp|gif);base64,([A-Za-z0-9+/=]+)/g, (tum, tur, b64) => {
    if (b64.length < esik) return tum;
    n++; const uz = tur === "jpeg" ? "jpg" : tur; const ad = `${onek}-${n}.${uz}`;
    yaz(path.join(mediaDizin, ad), Buffer.from(b64, "base64"));
    return goreliOnek + ad;
  });
  return { html: cikti, n };
}

/* ---------------- CSS ---------------- */

/** Kural düzeyinde CSS ayrıştırıcı ({} dengeli; @media/@supports iç içe). */
export function kurallar(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const ac = css.indexOf("{", i); if (ac < 0) break;
    const secici = css.slice(i, ac).trim();
    let d = 1, j = ac + 1;
    while (j < css.length && d) { if (css[j] === "{") d++; else if (css[j] === "}") d--; j++; }
    out.push({ secici, govde: css.slice(ac + 1, j - 1) });
    i = j;
  }
  return out;
}
/** Seçici listesini yalnız parantez derinliği 0'daki virgüllerden böler (:is(.a,.b) bozulmasın). */
export const seciciListesi = (s) => { const out = []; let d = 0, b = ""; for (const ch of s) { if (ch === "(") d++; else if (ch === ")") d--; if (ch === "," && d === 0) { out.push(b); b = ""; } else b += ch; } if (b.trim()) out.push(b); return out; };

/** Okuyucu uyarlaması: genişlik serbest (Hasan 27.09), kaynağın okuma sütunu sınırı açılır, birimler görünür. */
export const KITAPPTA_CSS_EK = (sutunSecici = ".paper") => `
/* ===== Kitappta uyarlaması ===== */
.kt-bolum{max-width:none!important;margin:0!important;padding:0!important}
${sutunSecici}{max-width:none!important;width:auto!important;margin:0!important;padding:24px clamp(16px,3vw,56px) 56px!important}
`;

/**
 * Kaynağın CSS dosyalarını yükleme sırasıyla OLDUĞU GİBİ birleştirir. Atılan tek şey: KKP-CHR-01 seçicili kurallar ve @import.
 * Yeniden yazılan: `#id` seçicileri (idHaritasi → [data-kaynak-id], büyük harf → küçük), `#paper`/`#mainReader` gibi sarmalayıcı
 * id'leri (`idSecici` haritası), yerel url() → medyaKopyala(ref) (dönen yeni göreli yol ya da null=at), dış url() atılır.
 */
export function cssBirlestir({ kaynakDizin, dosyalar, satirIci = [], idHaritasi = new Map(), idSecici = {}, medyaKopyala = () => null, ek = "" }) {
  const rapor = { dosya: dosyalar.length, atilanKural: 0, atilanUrl: 0, yenidenYazilanUrl: 0, idSeciciYeniden: 0 };
  const govdeIsle = (g) => g.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^"')\s]+))\s*\)/g, (tum, a, b2, c) => {
    const ref = (a ?? b2 ?? c ?? "").trim();
    if (/^(https?:)?\/\//i.test(ref) || (/^data:/i.test(ref) && ref.length > 4000)) { rapor.atilanUrl++; return "url(__SIL__)"; }
    if (/^data:|^#/i.test(ref)) return tum;
    const yeni = medyaKopyala(ref);
    if (yeni) { rapor.yenidenYazilanUrl++; return `url("${yeni}")`; }
    rapor.atilanUrl++; return "url(__SIL__)";
  }).split(";").filter((d) => !/__SIL__/.test(d)).join(";");
  const seciciIsle = (s) => {
    let t = s;
    for (const [eski, yeni] of Object.entries(idSecici)) t = t.replace(new RegExp(`#${eski}(?![\\w-])`, "g"), yeni);
    return t.replace(/#([A-Za-z][\w-]*)/g, (tum, id) => {
      if (idHaritasi.has(id)) { rapor.idSeciciYeniden++; return `[data-kaynak-id="${id}"]`; }
      if (/[A-Z]/.test(id)) { rapor.idSeciciYeniden++; return "#" + id.toLowerCase(); }
      return tum;
    });
  };
  function isle(css) {
    css = css.replace(/\/\*[\s\S]*?\*\//g, "");
    const cikti = [];
    for (const r of kurallar(css)) {
      if (/^@import/.test(r.secici)) { rapor.atilanKural++; continue; }
      if (/^@(media|supports|container|layer)/.test(r.secici)) { const ic = isle(r.govde); if (ic.trim()) cikti.push(`${r.secici}{${ic}}`); continue; }
      if (/^@/.test(r.secici)) { cikti.push(`${r.secici}{${r.govde}}`); continue; }
      const secler = seciciListesi(r.secici).map((s) => s.trim()).filter((s) => s && !CHR_RE.test(s)).map(seciciIsle);
      if (!secler.length) { rapor.atilanKural++; continue; }
      const g = govdeIsle(r.govde).trim();
      if (!g) { rapor.atilanKural++; continue; }
      cikti.push(`${secler.join(",")}{${g}}`);
    }
    return cikti.join("\n");
  }
  let birlesik = "";
  for (const f of dosyalar) birlesik += `\n/* ${f} */\n` + isle(oku(path.join(kaynakDizin, f)));
  for (const { ad, css } of satirIci) birlesik += `\n/* ${ad} (satır içi) */\n` + isle(css);
  return { css: birlesik + ek, rapor };
}

/** Kaynak HTML'den <link rel=stylesheet> sırası (?v= ekleri düşer). */
export function stilSirasi(html) {
  return [...html.matchAll(/<link[^>]*>/g)].map((m) => m[0]).filter((l) => /rel="stylesheet"/.test(l)).map((l) => /href="([^"?]+)/.exec(l)?.[1]).filter(Boolean);
}
/** Kaynak HTML'den <script src> sırası. */
export function scriptSirasi(html) {
  return [...html.matchAll(/<script[^>]*\bsrc="([^"?]+)/g)].map((m) => m[1]);
}
/** Kaynak HTML'den <style id="x"> içerikleri. */
export function satirIciStiller(html) {
  return [...html.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/g)].map((m) => ({ ad: /id="([^"]+)"/.exec(m[1])?.[1] || "style", css: m[2] }));
}
/** Kaynak HTML'den <script id="x">…</script> (src'siz) gövdeleri. */
export function satirIciScriptler(html) {
  return [...html.matchAll(/<script\b(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => ({ ad: /id="([^"]+)"/.exec(m[1])?.[1] || "script", tip: /type="([^"]+)"/.exec(m[1])?.[1] || "", js: m[2] }));
}

/* ---------------- JS ---------------- */

/** Paketin her JS'inin başına konan çekirdek: bölüm kökü, dialog tuş koruması, statik gömülü-uygulama dialogunu açma. */
export function kabukCekirdegi(tarih = new Date().toISOString().slice(0, 10)) {
  return `/* Kitappta uyarlaması (${tarih}) — çekirdek: bölüm kökü, dialog tuş koruması, gömülü uygulama dialogu. */
(function(){'use strict';
  window.__ktKok=function(){return document.querySelector('.kt-bolum')||document.body;};
  // Okuyucu ←/→/Boşluk tuşlarını bölüm geçişine bağlar; açık dialog içinde tuş dialogda kalsın.
  window.__ktDialogKoru=function(d){if(d.dataset.ktKoru)return;d.dataset.ktKoru='1';d.addEventListener('keydown',function(e){if(['ArrowLeft','ArrowRight',' ','PageDown','PageUp','Escape','Home','End'].indexOf(e.key)>=0)e.stopPropagation();});};
  // Statik dialog[data-kt-embed-icin] (içinde sandbox iframe): aç/kapat, dış tık, Tab tuzağı, odak dönüşü
  window.__ktEmbedAc=function(anahtar,trigger){var d=document.querySelector('dialog[data-kt-embed-icin="'+anahtar+'"]');if(!d)return false;
    if(!d.dataset.ktHazir){d.dataset.ktHazir='1';window.__ktDialogKoru(d);
      var kapat=function(){if(!d.open)return;d.close();document.body.style.overflow=d.dataset.ktOverflow||'';var t=d._ktTrigger;if(t&&t.focus)t.focus({preventScroll:true});};
      d.addEventListener('cancel',function(e){e.preventDefault();kapat();});
      d.addEventListener('click',function(e){var b=e.target.closest('button');if(b&&b.hasAttribute('data-close')){kapat();return;}if(e.target===d){var r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)kapat();}});
      d.addEventListener('keydown',function(e){if(e.key!=='Tab')return;var f=[].slice.call(d.querySelectorAll('button,iframe,[tabindex="0"]')).filter(function(x){return !x.disabled&&x.getClientRects().length;}),first=f[0],last=f[f.length-1];if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}});}
    d._ktTrigger=trigger||null;d.dataset.ktOverflow=document.body.style.overflow;document.body.style.overflow='hidden';
    if(!d.open)d.showModal();var c=d.querySelector('[data-close]');if(c)c.focus();return true;};
  document.addEventListener('click',function(e){var ea=e.target.closest('[data-kt-embed-ac]');if(ea){e.preventDefault();e.stopPropagation();window.__ktEmbedAc(ea.getAttribute('data-kt-embed-ac'),ea);}});
})();
`;
}

/** document.body.append(...) → window.__ktKok().append(...) (dialog/katman bölüm içine). */
export function bodyEklemeDuzelt(js) {
  let n = 0;
  const out = js.replace(/document\.body\.(append|appendChild|prepend)\s*\(/g, (m, f) => { n++; return `window.__ktKok().${f}(`; });
  return { js: out, sayi: n };
}
/** parent/top.postMessage(…) çağrılarını (parantez dengeli, dizeler atlanır) `void 0` ifadesine çevirir — iframe yüksekliği sabit verilir. */
export function postMessageSil(js) {
  let n = 0, out = "", i = 0;
  const re = /(?:window\.)?(?:parent|top)\.postMessage\(/g;
  let m;
  while ((m = re.exec(js))) {
    let j = m.index + m[0].length, d = 1, dize = null;
    while (j < js.length && d) {
      const c = js[j];
      if (dize) { if (c === "\\") j++; else if (c === dize) dize = null; }
      else if (c === '"' || c === "'" || c === "`") dize = c;
      else if (c === "(") d++;
      else if (c === ")") d--;
      j++;
    }
    out += js.slice(i, m.index) + "void 0";
    i = j; re.lastIndex = j; n++;
  }
  return { js: out + js.slice(i), sayi: n };
}
/** Söz dizimi kontrolü (yalnız ayrıştırma; kod çalışmaz). Hata varsa mesaj, yoksa null. */
export function sozdizimiHatasi(js) {
  try { new Function(js); return null; } catch (e) { return String(e.message).slice(0, 160); }
}
/** `if(readyState…)init()` kalıbının sonuna kt:hazir dinleyicisi ekler (okuyucu bölümü sonradan takabilir). */
export function ktHazirEkle(js, initAdi) {
  return js + `\ndocument.addEventListener('kt:hazir',function(){try{${initAdi}();}catch(e){}});\n`;
}

/** Gömülü uygulama modalı (statik <dialog> + sandbox iframe). Sınıflar kaynağın modal sınıfları olabilir (CSS'i tutsun). */
export function embedDialog({ anahtar, baslik, src, yukseklik, dialogSinif = "kt-embed-dialog", basSinif = "kt-embed-head", govdeSinif = "kt-embed-body", iframeSinif = "kt-embed-frame", ustYazi = "ETKİLEŞİMLİ İÇERİK" }) {
  return `<dialog class="${dialogSinif}" id="emb-${anahtar}" data-kt-embed-icin="${anahtar}" aria-label="${kacir(baslik)}"><header class="${basSinif}"><div><span>${ustYazi}</span><h2>${kacir(baslik)}</h2></div><button type="button" data-close="" aria-label="Etkileşimi kapat">← Kitaba dön</button></header><div class="${govdeSinif}"><iframe class="${iframeSinif}" src="${src}" sandbox="allow-scripts" width="960" height="${yukseklik}" loading="lazy" title="${kacir(baslik)} — etkileşimli içerik"></iframe></div></dialog>`;
}
/** Kaynakta modal sınıfı yoksa gömülü dialog için yalın CSS. */
export const EMBED_DIALOG_CSS = `
.kt-embed-dialog{padding:0;border:1px solid #94a3b8;border-radius:18px;width:min(1360px,calc(100vw - 24px));max-width:calc(100vw - 24px);height:min(940px,calc(100dvh - 24px));max-height:calc(100dvh - 24px);display:flex;flex-direction:column;overflow:hidden;background:#fff}
.kt-embed-dialog:not([open]){display:none}
.kt-embed-dialog::backdrop{background:rgba(7,14,24,.72)}
.kt-embed-head{display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:.9rem 1.2rem;border-bottom:1px solid #e2e8f0;font-family:system-ui,sans-serif}
.kt-embed-head span{font-size:.72rem;letter-spacing:.08em;color:#2563eb;font-weight:700}
.kt-embed-head h2{margin:.15rem 0 0;font-size:1.15rem}
.kt-embed-head button{border:1px solid #cbd5e1;border-radius:10px;background:#fff;padding:.5rem .9rem;cursor:pointer}
.kt-embed-body{flex:1;min-height:0;background:#fff}
.kt-embed-frame{display:block;width:100%;height:100%;border:0}
`;

/* ---------------- gömülü belge taşıma ---------------- */

/**
 * Kaynağın ayrı HTML uygulamasını (assets/interactive/x/y.html) kkp embed'ine taşır: assets/embed/<ad>.html; bağlı css/js
 * dosyaları assets/css/embed-<ad>*.css ve assets/js/embed-<ad>*.js olarak kopyalanır (JS'te parent.postMessage silinir,
 * yasak API raporlanır), ≥ 4 KB base64 görseller assets/media'ya çıkar, dış <a target=_blank> bağlantıları düz metne döner.
 * Dönen: { rapor: [{dosya, yasak:[…]}], n: base64 sayısı }.
 */
export function embedTasi({ kaynakHtmlYolu, ad, paketDizin }) {
  let html = oku(kaynakHtmlYolu);
  const kaynakDizin = path.dirname(kaynakHtmlYolu);
  const rapor = [];
  let sira = 0;
  html = html.replace(/<(link|script)\b([^>]*)\b(href|src)="([^"]+)"([^>]*)>/g, (tum, etiket, on, oz, ref, son) => {
    if (/^(https?:|\/\/|data:)/i.test(ref)) return tum;
    const kaynak = path.resolve(kaynakDizin, ref.split("?")[0]);
    if (!fs.existsSync(kaynak)) return tum;
    const uz = path.extname(kaynak).toLowerCase();
    if (etiket === "link" && uz !== ".css") return tum;
    const yeniAd = `embed-${ad}${sira ? "-" + sira : ""}${uz}`; sira++;
    const hedef = uz === ".css" ? path.join(paketDizin, "assets/css", yeniAd) : path.join(paketDizin, "assets/js", yeniAd);
    let icerik = oku(kaynak);
    if (uz === ".js") { const pm = postMessageSil(icerik); icerik = pm.js; const t = jsTara(icerik); rapor.push({ dosya: `assets/js/${yeniAd}`, postMessageSilindi: pm.sayi, yasak: t.yasak.map((y) => `${y.satir}: ${y.ad}`), sozdizimi: sozdizimiHatasi(icerik) }); }
    yaz(hedef, icerik);
    return `<${etiket}${on}${oz}="${uz === ".css" ? "../css/" : "../js/"}${yeniAd}"${son}>`;
  });
  // satır içi <script> gövdeleri (doğrulayıcı dosyaya taşır ama METNİNİ tarar): postMessage sil, yasak raporla
  let satirIci = 0;
  html = html.replace(/(<script\b(?![^>]*\bsrc=)(?![^>]*type="application\/json")[^>]*>)([\s\S]*?)(<\/script>)/g, (tum, ac, govde, kapa) => {
    const pm = postMessageSil(govde); satirIci++;
    const t = jsTara(pm.js);
    rapor.push({ dosya: `assets/embed/${ad}.html <script> #${satirIci}`, postMessageSilindi: pm.sayi, yasak: t.yasak.map((y) => `${y.satir}: ${y.ad}`), sozdizimi: sozdizimiHatasi(pm.js) });
    return ac + pm.js + kapa;
  });
  html = html.replace(/<a\b[^>]*href="https?:[^"]*"[^>]*>([\s\S]*?)<\/a>/g, "$1");
  const b64 = base64Cikar(html, `embed-${ad}`, path.join(paketDizin, "assets/media"));
  yaz(path.join(paketDizin, "assets/embed", `${ad}.html`), b64.html);
  return { rapor, n: b64.n };
}

/* ---------------- manifest ---------------- */

/**
 * İçindekiler ağacı: bölüm başına {baslik, hedef, alt}. `basliklar`: pisir'in _basliklar.json'ından (id, level, title), harita ile
 * yeni id'ye çevrilir; başlık olmayan hedefler (`ekHedefler`: id → true, ör. pekiştirme çapası) uyarıyla taşınır (KKP-MAN-W2).
 */
export function icindekilerKur({ baslik, kokHedef, basliklar, harita, idVar, ekHedefler = new Set() }) {
  const hedefi = (t) => (harita.has(t.id) ? harita.get(t.id) : ekHedefler.has(t.id) ? t.id : null);
  const girdiler = basliklar.filter((t) => hedefi(t) && idVar(hedefi(t)) && t.level >= 1 && t.level <= 3);
  const kok = { baslik, hedef: kokHedef, alt: [] };
  let son2 = null;
  for (const t of girdiler) {
    if (t.level === 1) continue;
    const m = { baslik: t.title, hedef: hedefi(t) };
    if (t.level === 2) { kok.alt.push(m); son2 = m; } else if (son2) (son2.alt = son2.alt || []).push(m); else kok.alt.push(m);
  }
  if (!kok.alt.length) delete kok.alt;
  return kok;
}

export function manifestKur({ kitap, bolumler, icindekiler, gomulu = [], css = ["assets/css/kitap.css"], js = ["assets/js/kitap.js"], matematik = "mathml", uretim }) {
  return {
    format: "kkp/1",
    kitap: { ...kitap, uretim: { arac: "Kitappta hoca agent kiti (kkp-donustur)", tarih: new Date().toISOString().slice(0, 10), ...uretim } },
    bolumler: bolumler.map((b) => ({ id: b.id, dosya: b.dosya, baslik: b.baslik, tur: b.tur })),
    ortak: { css, js },
    icindekiler,
    ozellikler: { matematik, etkilesim: true, ...(gomulu.length ? { gomulu } : {}) },
  };
}
