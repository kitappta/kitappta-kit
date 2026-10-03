// kkp/1 paket yardımcıları — 3. adım araçları (tekrar-ekle, lab-ekle, bolum-metni) paylaşır. Bağımlılık: parse5 + node:.
// Bölüm dosyası iki biçimde olabilir: TAM SAYFA (dönüştürücünün yazdığı: doctype + head + body > section.kt-bolum + script satırları)
// ya da FRAGMENT (dosya "<section" ile başlar). bolumYukle ikisini de yükler; bolumKaydet on + section + son olarak geri yazar.
import fs from "node:fs";
import path from "node:path";
import { parse, parseFragment, serializeOuter } from "parse5";
import { normalize, pad4 } from "./ortak.mjs";
import { atali, attr, bul, hasClass, htmlKacis, isEl, setAttr, walk } from "./dom.mjs";

export const TUR_RE = /^(notref|not|kutu|kart|sek|tab|kay|eqx|sum|pre|bq|dt|dd|td|th|li|h|p)(\d{4,9})(?:-alt)?$/;
export const METIN_BLOKLARI = new Set(["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "td", "th", "figcaption", "blockquote", "dt", "dd", "summary", "pre"]);
export const TUR_KODU = { h1: "h", h2: "h", h3: "h", h4: "h", h5: "h", h6: "h", p: "p", li: "li", td: "td", th: "th", blockquote: "bq", dt: "dt", dd: "dd", summary: "sum", pre: "pre" };

const SECTION_KAPANIS = "</section>";
const ktBolum = (n) => n.tagName === "section" && hasClass(n, "kt-bolum");

/** manifest.json'ı okur → { manifest, yol }; yoksa throw. */
export function manifestOku(paket) {
  const yol = path.join(paket, "manifest.json");
  if (!fs.existsSync(yol)) throw new Error(`manifest.json yok: ${yol}`);
  return { manifest: JSON.parse(fs.readFileSync(yol, "utf8")), yol };
}

export function manifestYaz(paket, manifest) {
  fs.writeFileSync(path.join(paket, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
}

export function bolumBul(manifest, bolumId) {
  return (manifest.bolumler || []).find((b) => b.id === bolumId) ?? null;
}

/** "b03" → "03"; id numarasız ise dosya önekinden ("07-ek.html" → "07"); ikisi de yoksa null. */
export function bolumNo(bolum) {
  const m = /^b(\d{2,})$/.exec(bolum.id ?? "");
  if (m) return m[1];
  const d = /^(\d{2,})-/.exec(bolum.dosya ?? "");
  return d ? d[1] : null;
}

/** Bölüm dosyasını yükler → { bolum, dosya, tamSayfa, on, sec, son }. sec = section.kt-bolum düğümü. */
export function bolumYukle(paket, bolum) {
  const dosya = path.join(paket, bolum.dosya);
  // CRLF (Windows checkout / hocanın editörü) → LF: on/son dizeleri ve serileştirme LF varsayar; doğrulayıcı da normalize eder.
  const metin = fs.readFileSync(dosya, "utf8").replace(/\r\n/g, "\n");
  const tamSayfa = !metin.trimStart().startsWith("<section");
  if (!tamSayfa) {
    const sec = bul(parseFragment(metin), ktBolum);
    if (!sec) throw new Error(`${bolum.dosya}: section.kt-bolum yok`);
    return { bolum, dosya, tamSayfa, on: "", sec, son: "\n" };
  }
  const bas = metin.indexOf("<section");
  if (bas < 0) throw new Error(`${bolum.dosya}: <section yok`);
  const sec = bul(parse(metin), ktBolum);
  if (!sec) throw new Error(`${bolum.dosya}: section.kt-bolum yok`);
  const on = metin.slice(0, bas);
  // son = ham metnin dış section kapanışından itibaren kalanı (script satırları, </body>, </html>) — hangi script
  // satırlarının bulunduğuna bakılmaz; ortak.js satırı olmayan sayfada da aradaki <script src> satırları korunur.
  const kapanis = metin.lastIndexOf(SECTION_KAPANIS);
  const govdeKapanis = metin.indexOf("</body>", bas);   // kapanış etiketi yazılmamış (parse5 kendisi kapatmış) sayfa için yedek
  const sonBas = kapanis >= 0 ? kapanis + SECTION_KAPANIS.length : govdeKapanis;
  const son = sonBas < 0 ? "\n" : metin.slice(sonBas);
  return { bolum, dosya, tamSayfa, on, sec, son };
}

/** on + serializeOuter(sec) + son → dosya. */
export function bolumKaydet(y) {
  fs.writeFileSync(y.dosya, y.on + serializeOuter(y.sec) + y.son);
}

/** Tüm bölüm dosyalarındaki id'leri tarar → { kullanilan:Set, sayac:Map, uret(tur), kaydet(id) }. uret: türün en büyük numarasından devam. */
export function idHavuzu(paket, manifest) {
  const kullanilan = new Set();
  const sayac = new Map();
  const kaydet = (id) => { kullanilan.add(id); const m = TUR_RE.exec(id); if (m) sayac.set(m[1], Math.max(sayac.get(m[1]) ?? 0, +m[2])); };
  for (const b of manifest.bolumler || []) {
    if (!fs.existsSync(path.join(paket, b.dosya))) continue;
    walk(bolumYukle(paket, b).sec, (n) => { if (isEl(n)) { const id = attr(n, "id"); if (id) kaydet(id); } });
  }
  const uret = (tur) => { let n = sayac.get(tur) ?? 0; let id; do { n++; id = tur + pad4(n); } while (kullanilan.has(id)); sayac.set(tur, n); kullanilan.add(id); return id; };
  return { kullanilan, sayac, uret, kaydet };
}

function kokMadde(manifest, bolum) {
  const hedef = normalize(bolum.baslik ?? "");
  return (manifest.icindekiler || []).find((m) => normalize(m.baslik ?? "") === hedef) ?? null;
}

/** Bölümün kök maddesinin alt[]'ına ekler; kök madde yoksa bölüm başlığından açılır (hedef: kokHedef ?? bölüm id'si), bölüm sırasına konur. */
export function icindekilerEkle(manifest, bolumId, madde, kokHedef) {
  const bolum = bolumBul(manifest, bolumId);
  if (!bolum) throw new Error(`manifest'te bölüm yok: ${bolumId}`);
  manifest.icindekiler ||= [];
  let kok = kokMadde(manifest, bolum);
  if (!kok) {
    kok = { baslik: bolum.baslik ?? bolumId, hedef: kokHedef ?? bolumId };
    let konum = 0;
    for (const b of manifest.bolumler) {
      if (b.id === bolumId) break;
      const k = kokMadde(manifest, b);
      if (k) konum = manifest.icindekiler.indexOf(k) + 1;
    }
    manifest.icindekiler.splice(konum, 0, kok);
  }
  (kok.alt ||= []).push(madde);
  return kok;
}

/** hedef id'li maddeyi (ve altlarını) her seviyeden siler; silinen madde sayısı (altlar sayılmaz). Boş kalan alt[] kaldırılır. */
export function icindekilerSil(manifest, hedefId) {
  let silinen = 0;
  const gez = (liste) => {
    for (let i = liste.length - 1; i >= 0; i--) {
      const m = liste[i];
      if (m.hedef === hedefId) { liste.splice(i, 1); silinen++; continue; }
      if (m.alt) { gez(m.alt); if (!m.alt.length) delete m.alt; }
    }
  };
  if (manifest.icindekiler) gez(manifest.icindekiler);
  return silinen;
}

/** Tam sayfada son'a `<script src="yol"></script>` (</body> öncesi); varsa dokunmaz. Fragment: no-op. Eklendi mi döner. */
export function sayfaScriptEkle(y, yol) {
  if (!y.tamSayfa) return false;
  const k = htmlKacis(yol);
  if (y.son.includes(`src="${k}"`)) return false;
  const satir = `<script src="${k}"></script>\n`;
  const i = y.son.indexOf("</body>");
  y.son = i < 0 ? y.son.replace(/\s*$/, "\n") + satir : y.son.slice(0, i) + satir + y.son.slice(i);
  return true;
}

/** Tam sayfada on'a `<link rel="stylesheet" href="yol">` (</head> öncesi); varsa dokunmaz. Fragment: no-op. */
export function sayfaLinkEkle(y, yol) {
  if (!y.tamSayfa) return false;
  const k = htmlKacis(yol);
  if (y.on.includes(`href="${k}"`)) return false;
  const satir = `<link rel="stylesheet" href="${k}">\n`;
  const i = y.on.indexOf("</head>");
  if (i < 0) return false;
  y.on = y.on.slice(0, i) + satir + y.on.slice(i);
  return true;
}

const IDLENECEK = new Set(["p", "li", "h4", "h5", "h6", "td", "th", "figcaption", "summary", "blockquote"]);
const dinamik = (n) => attr(n, "data-kt-dinamik") !== undefined;
/** kok altındaki id'siz metin bloklarına havuzdan id verir (figcaption → ebeveyn figure id + "-alt"; p.kt-esitlik → eqx); verilen id listesi.
 *  data-kt-dinamik taşıyan düğüm ve alt ağacı atlanır (kkp-lint dinamik içine id vermez; verilirse KKP-ID-W4 uyarır). */
export function metinBloklariniIdle(kok, havuz) {
  const verilen = [];
  walk(kok, (n) => {
    if (!isEl(n) || !IDLENECEK.has(n.tagName) || attr(n, "id")) return;
    if (dinamik(n) || atali(n, dinamik)) return;
    let id;
    if (n.tagName === "figcaption") {
      const p = n.parentNode;
      const pid = isEl(p) && p.tagName === "figure" ? attr(p, "id") : undefined;
      id = pid && /^sek\d+$/.test(pid) && !havuz.kullanilan.has(`${pid}-alt`) ? `${pid}-alt` : `${havuz.uret("sek")}-alt`;
      havuz.kaydet(id);
    } else if (n.tagName === "p" && hasClass(n, "kt-esitlik")) id = havuz.uret("eqx");
    else id = havuz.uret(TUR_KODU[n.tagName]);
    setAttr(n, "id", id);
    verilen.push(id);
  });
  return verilen;
}

/** bolumler[].css|js|veri dizisine yol ekler (yoksa açar, tekrar eklemez); eklendi mi döner. */
export function bolumEkDosya(manifest, bolumId, tur, yol) {
  if (!["css", "js", "veri"].includes(tur)) throw new Error(`bolumEkDosya: tür css|js|veri olmalı: ${tur}`);
  const bolum = bolumBul(manifest, bolumId);
  if (!bolum) throw new Error(`manifest'te bölüm yok: ${bolumId}`);
  bolum[tur] ||= [];
  if (bolum[tur].includes(yol)) return false;
  bolum[tur].push(yol);
  return true;
}
