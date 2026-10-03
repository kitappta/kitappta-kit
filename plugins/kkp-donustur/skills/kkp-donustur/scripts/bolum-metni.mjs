// kkp/1 paketinden bölüm DÜZ METNİ — 3. adımda (Bölüm Tekrar, lab kartı) Claude'un HTML yerine okuyacağı küçük dosyalar.
//
//   node scripts/kkp/bolum-metni.mjs <paket-dizin> <cikti-dizin> [--bolum bNN] [--hepsi]
//
// Her `tur: "bolum"` bölüm için <cikti>/bNN-metin.txt + <cikti>/bolumler.json ([{id, dosya, baslik, blok, tekrarVar, kartlar:[{id, ozet}]}]).
// --bolum bNN yalnız o bölüm; --hepsi ön/kaynakça (tur ≠ bolum) bölümleri de yazar.
// Satır biçimi: "[id] metin" — başlık "# / ##", liste "- ", dipnot "^ ", eşitlik "(N.M) tex", şekil "başlık (alt: …)",
// tablo "başlık | h1 | h2 || c1 | c2", etkileşim isteği "[ETKİLEŞİM İSTEĞİ] …", lab kartı "(lab kartı) özet" (gövde yazılmaz),
// mevcut Bölüm Tekrar "(mevcut Bölüm Tekrar: N soru · M kart)" (içeriği yazılmaz). annotation/script/style/template metne girmez.
import fs from "node:fs";
import path from "node:path";
import { attr, blokMetni, blokSinifla, bul, bulHepsi, hasClass, isEl, kids, METIN_DISI, text } from "./lib/dom.mjs";
import { bolumYukle, manifestOku } from "./lib/paket.mjs";

const argv = process.argv.slice(2);
const secenek = {};
const konum = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === "--bolum") { secenek[a] = argv[++i]; if (secenek[a] === undefined) hata("--bolum değer ister", 2); continue; }
  if (a === "--hepsi") { secenek[a] = true; continue; }
  if (a.startsWith("--")) hata(`Bilinmeyen seçenek ${a}`, 2);
  konum.push(a);
}
const [paketArg, ciktiArg] = konum;
if (!paketArg || !ciktiArg || konum.length > 2) {
  console.error("Kullanım: node scripts/kkp/bolum-metni.mjs <paket-dizin> <cikti-dizin> [--bolum bNN] [--hepsi]");
  process.exit(2);
}
function hata(m, kod = 1) { console.error("HATA: " + m); process.exit(kod); }
const PAKET = path.resolve(paketArg);
const CIKTI = path.resolve(ciktiArg);

let manifest;
try { ({ manifest } = manifestOku(PAKET)); } catch (e) { hata(e.message); }
let bolumler = manifest.bolumler || [];
if (secenek["--bolum"]) {
  bolumler = bolumler.filter((b) => b.id === secenek["--bolum"]);
  if (!bolumler.length) hata(`manifest'te bölüm yok: ${secenek["--bolum"]}`);
} else if (!secenek["--hepsi"]) bolumler = bolumler.filter((b) => b.tur === "bolum");

const duz = (s) => s.replace(/\s+/g, " ").trim();

/** Bölüm section'ını satırlara döker → { satirlar, kartlar, tekrarVar, blok }. */
function bolumSatirlari(sec) {
  const c = { satirlar: [], kartlar: [], tekrarVar: false, blok: 0 };
  const yaz = (id, s) => { c.satirlar.push(`[${id ?? "?"}] ${s}`); c.blok++; };
  function gez(n) {
    if (!isEl(n)) return;
    const tag = n.tagName, id = attr(n, "id");
    if (METIN_DISI.has(tag)) return;
    switch (blokSinifla(n)) {
      case "tekrar": {
        const soru = bulHepsi(n, (x) => x.tagName === "p" && hasClass(x, "kt-soru")).length;
        const kart = bulHepsi(n, (x) => x.tagName === "li" && hasClass(x, "kt-flash-kart")).length;
        c.satirlar.push(`(mevcut Bölüm Tekrar: ${soru} soru · ${kart} kart)`);
        c.tekrarVar = true;
        return;
      }
      case "kart": {
        const sum = bul(n, (x) => x.tagName === "summary");
        const ozet = sum ? duz(blokMetni(sum)) : "";
        yaz(id, `(lab kartı) ${ozet}`);
        c.kartlar.push({ id: id ?? null, ozet });
        return;
      }
      case "istek":
        yaz(id, `[ETKİLEŞİM İSTEĞİ] ${duz(blokMetni(n))}`);
        return;
      case "kutu":
        yaz(id, "[KUTU]");
        for (const k of n.childNodes || []) gez(k);
        return;
      case "dipnot":
        yaz(id, `^ ${duz(blokMetni(n))}`);
        return;
      case "esitlik": {
        const no = attr(n, "data-kt-eq");
        const ann = bul(n, (x) => x.tagName === "annotation" && attr(x, "encoding") === "application/x-tex");
        const math = bul(n, (x) => x.tagName === "math");
        const govde = ann ? duz(text(ann)) : duz(blokMetni(math ?? n));
        yaz(id, no ? `(${no}) ${govde}` : govde);
        return;
      }
      case "baslik":
        yaz(id, `${"#".repeat(+tag[1])} ${duz(blokMetni(n))}`);
        return;
      case "sekil": {
        const fc = bul(n, (x) => x.tagName === "figcaption");
        const img = bul(n, (x) => x.tagName === "img");
        const alt = img ? attr(img, "alt") : undefined;
        yaz(id, `${fc ? duz(blokMetni(fc)) : "(başlıksız şekil)"}${alt ? ` (alt: ${duz(alt)})` : ""}`);
        return;
      }
      case "tablo": {
        const cap = kids(n).find((x) => x.tagName === "caption");
        const satirlar = bulHepsi(n, (x) => x.tagName === "tr").map((tr) => kids(tr).filter((h) => h.tagName === "th" || h.tagName === "td").map((h) => duz(blokMetni(h))).join(" | "));
        yaz(id, (cap ? duz(blokMetni(cap)) + " | " : "") + satirlar.join(" || "));
        return;
      }
      case "liste": {
        let oz = "";
        for (const k of n.childNodes || []) { if (isEl(k) && (k.tagName === "ul" || k.tagName === "ol")) continue; oz += k.nodeName === "#text" ? k.value : blokMetni(k); }
        yaz(id, `- ${duz(oz)}`);
        for (const k of kids(n)) if (k.tagName === "ul" || k.tagName === "ol") gez(k);
        return;
      }
      case "metin":
        yaz(id, duz(blokMetni(n)));
        return;
      case "iframe":
        c.satirlar.push(`(gömülü: ${attr(n, "src") ?? "?"})`);
        return;
      default:
        for (const k of n.childNodes || []) gez(k);
    }
  }
  for (const k of sec.childNodes || []) gez(k);
  return c;
}

fs.mkdirSync(CIKTI, { recursive: true });
const liste = [];
for (const b of bolumler) {
  if (!fs.existsSync(path.join(PAKET, b.dosya))) hata(`${b.dosya} yok (manifest'te var)`);
  const { sec } = bolumYukle(PAKET, b);
  const c = bolumSatirlari(sec);
  const baslik = duz(b.baslik ?? "");
  fs.writeFileSync(path.join(CIKTI, `${b.id}-metin.txt`), [`# ${b.id} · ${b.dosya} · ${baslik}`, ...c.satirlar].join("\n") + "\n");
  liste.push({ id: b.id, dosya: b.dosya, baslik, blok: c.blok, tekrarVar: c.tekrarVar, kartlar: c.kartlar });
  console.log(`${b.id}: ${c.blok} blok · ${c.kartlar.length} kart · ${c.tekrarVar ? "Bölüm Tekrar var" : "tekrar yok"} → ${b.id}-metin.txt`);
}
fs.writeFileSync(path.join(CIKTI, "bolumler.json"), JSON.stringify(liste, null, 2) + "\n");
