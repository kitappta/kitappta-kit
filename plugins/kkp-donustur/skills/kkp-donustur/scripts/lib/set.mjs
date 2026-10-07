// Ortak tasarım seti (Plan 35): sablon/katalog.json okuma, denetim ve seçim → dosya listesi. gorunum-ekle ve set-onizleme kullanır.
// Katalog: { surum, eksenler: { <eksen>: [{ ad, etiket, dosya | null, durum, neZaman, fontlar? }] }, fontlar: { <anahtar>: { aile, lisans,
// dosyalar: [{ dosya, ozet, bayt }] } }, takimlar: [{ ad, etiket, neZaman, secim: { <eksen>: <ad> } }] }. `dosya: null` = bugünkü görünüm
// (pakete dosya girmez); her eksende tam bir tane vardır ve o eksenin varsayılanıdır. Yollar şablon dizinine görelidir ("set/renk/bordo.css").
import fs from "node:fs";
import path from "node:path";

/** Eksen adları; paketteki set CSS'lerinin bağlanma sırası da budur (renk yazı ve görünümden sonra gelir). */
export const EKSENLER = ["yazi", "gorunum", "kart", "yogunluk", "renk", "matematik"];
export const setCssYolu = (eksen) => `assets/css/set-${eksen}.css`;
/** Kart ailesi: div.kt-kutu.kt-kutu--<tur> (taban kitap.css her tür için --kitap-tur atar; renk dosyaları --kitap-tur-<tur> verir). */
export const KART_TURLERI = ["tanim", "kural", "uyari", "not", "ornek", "ozet", "ipucu", "hata", "sonuc", "karsilastirma", "olay", "kazanim", "teorem", "alistirma", "cozum"];

const DURUMLAR = new Set(["taslak", "onayli", "emekli"]);
const AD_RE = /^[a-z0-9-]+$/;

export function katalogOku(sablonDizin) {
  const yol = path.join(sablonDizin, "katalog.json");
  if (!fs.existsSync(yol)) throw new Error(`katalog.json yok: ${yol}`);
  return JSON.parse(fs.readFileSync(yol, "utf8"));
}

/** Kataloğun kendi içinde ve diskle tutarlılığı. Boş dizi = geçerli. */
export function katalogDenetle(katalog, sablonDizin) {
  const h = [];
  const fontlar = katalog.fontlar ?? {};
  const varMi = (goreli) => fs.existsSync(path.join(sablonDizin, goreli));

  for (const eksen of EKSENLER) {
    const liste = katalog.eksenler?.[eksen];
    if (!Array.isArray(liste)) { h.push(`${eksen}: eksen katalogda yok`); continue; }
    const gorulen = new Set();
    for (const s of liste) {
      if (!AD_RE.test(String(s.ad))) h.push(`${eksen} '${s.ad}': ad biçimi (a-z, 0-9, tire)`);
      if (gorulen.has(s.ad)) h.push(`${eksen}: '${s.ad}' adı yineleniyor`);
      gorulen.add(s.ad);
      if (!DURUMLAR.has(s.durum)) h.push(`${eksen} '${s.ad}': durum '${s.durum}' (taslak | onayli | emekli)`);
      if (!s.etiket || !s.neZaman) h.push(`${eksen} '${s.ad}': etiket ve neZaman zorunlu`);
      if (s.dosya !== null) {
        if (typeof s.dosya !== "string" || !s.dosya.startsWith("set/")) h.push(`${eksen} '${s.ad}': dosya 'set/' altında olmalı`);
        else if (!varMi(s.dosya)) h.push(`${s.dosya} yok`);
      }
      for (const f of s.fontlar ?? []) if (!fontlar[f]) h.push(`${eksen} '${s.ad}': font '${f}' katalogda yok`);
    }
    const dosyasiz = liste.filter((s) => s.dosya === null).length;
    if (dosyasiz !== 1) h.push(`${eksen}: dosyasız varsayılan tam bir tane olmalı (${dosyasiz})`);
  }

  for (const [anahtar, f] of Object.entries(fontlar)) {
    if (!AD_RE.test(anahtar)) h.push(`font '${anahtar}': ad biçimi (a-z, 0-9, tire)`);
    if (!f.aile || !f.lisans) h.push(`font '${anahtar}': aile ve lisans zorunlu`);
    if (!Array.isArray(f.dosyalar) || f.dosyalar.length === 0) { h.push(`font '${anahtar}': dosya listesi boş`); continue; }
    for (const d of f.dosyalar) {
      if (!varMi(d.dosya)) { h.push(`${d.dosya} yok`); continue; }
      const bayt = fs.statSync(path.join(sablonDizin, d.dosya)).size;
      if (bayt !== d.bayt) h.push(`${d.dosya}: boyut ${bayt} ≠ kayıt ${d.bayt}`);
    }
  }

  const takimAdlari = new Set();
  for (const t of katalog.takimlar ?? []) {
    if (!AD_RE.test(String(t.ad))) h.push(`takım '${t.ad}': ad biçimi (a-z, 0-9, tire)`);
    if (takimAdlari.has(t.ad)) h.push(`takım '${t.ad}' adı yineleniyor`);
    takimAdlari.add(t.ad);
    if (!t.etiket || !t.neZaman) h.push(`takım '${t.ad}': etiket ve neZaman zorunlu`);
    for (const [eksen, ad] of Object.entries(t.secim ?? {})) {
      if (!EKSENLER.includes(eksen)) { h.push(`takım '${t.ad}': bilinmeyen eksen '${eksen}'`); continue; }
      if (!(katalog.eksenler?.[eksen] ?? []).some((s) => s.ad === ad)) h.push(`takım '${t.ad}': ${eksen} '${ad}' yok`);
    }
  }
  return h;
}

/**
 * İstenen seçimi kopyalanacak dosyalara çevirir. Takım önce uygulanır, tek tek verilen eksen onu ezer; verilmeyen eksen varsayılanını
 * (dosyasız seçenek) alır. `taslak` seçenek yalnız `taslakSerbest` ile geçer (önizleme, test); `emekli` geçerlidir (ikinci baskı).
 */
export function secimCoz(katalog, istek, { taslakSerbest = false } = {}) {
  const hatalar = [];
  const secim = { takim: null };
  for (const eksen of EKSENLER) secim[eksen] = katalog.eksenler[eksen].find((s) => s.dosya === null)?.ad ?? null;

  if (istek.takim != null) {
    const takim = (katalog.takimlar ?? []).find((t) => t.ad === istek.takim);
    if (!takim) hatalar.push(`takım '${istek.takim}' yok; seçenekler: ${(katalog.takimlar ?? []).map((t) => t.ad).join(", ") || "(tanımlı takım yok)"}`);
    else { secim.takim = takim.ad; Object.assign(secim, takim.secim); }
  }
  for (const eksen of EKSENLER) if (istek[eksen] != null) secim[eksen] = istek[eksen];

  const css = [];
  const fontlar = [];
  const eklenenFont = new Set();
  for (const eksen of EKSENLER) {
    const liste = katalog.eksenler[eksen];
    const s = liste.find((x) => x.ad === secim[eksen]);
    if (!s) { hatalar.push(`${eksen} '${secim[eksen]}' yok; seçenekler: ${liste.map((x) => x.ad).join(", ")}`); continue; }
    if (s.durum === "taslak" && !taslakSerbest) {
      hatalar.push(`${eksen} '${s.ad}' henüz onaylı değil (taslak); onaylılar: ${liste.filter((x) => x.durum !== "taslak").map((x) => x.ad).join(", ")}`);
      continue;
    }
    if (s.dosya !== null) css.push({ eksen, kaynak: s.dosya, hedef: setCssYolu(eksen) });
    for (const anahtar of s.fontlar ?? []) {
      const f = katalog.fontlar?.[anahtar];
      if (!f) { hatalar.push(`${eksen} '${s.ad}': font '${anahtar}' katalogda yok`); continue; }
      for (const d of f.dosyalar) {
        if (eklenenFont.has(d.dosya)) continue;
        eklenenFont.add(d.dosya);
        fontlar.push({ kaynak: d.dosya, hedef: `assets/fonts/${path.posix.basename(d.dosya)}`, bayt: d.bayt });
      }
    }
  }
  return { secim, css, fontlar, hatalar };
}
