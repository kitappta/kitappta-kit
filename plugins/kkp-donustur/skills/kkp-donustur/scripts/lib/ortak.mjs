// scripts/kkp ortak yardımcıları — docx-cikar.mjs ve kaynak-donustur.mjs paylaşır. Bağımlılık yok.

/** Görsel boyutu: dosya başlığından (png/jpeg/gif/webp/svg). Okunamazsa null. (packages/kkp/src/gorsel.ts ile aynı yaklaşım) */
export function gorselBoyutu(veri) {
  const dv = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  const ascii = (a, b) => String.fromCharCode(...veri.subarray(a, b));
  if (veri.length >= 24 && ascii(1, 4) === "PNG") return { width: dv.getUint32(16), height: dv.getUint32(20) };
  if (veri.length >= 10 && ascii(0, 3) === "GIF") return { width: dv.getUint16(6, true), height: dv.getUint16(8, true) };
  if (veri[0] === 0xff && veri[1] === 0xd8) {
    let i = 2;
    while (i + 9 < veri.length) {
      if (veri[i] !== 0xff) return null;
      const m = veri[i + 1];
      if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
      const len = dv.getUint16(i + 2);
      if ((m >= 0xc0 && m <= 0xcf) && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { height: dv.getUint16(i + 5), width: dv.getUint16(i + 7) };
      i += 2 + len;
    }
    return null;
  }
  if (veri.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") {
    const t = ascii(12, 16);
    if (t === "VP8 ") return { width: dv.getUint16(26, true) & 0x3fff, height: dv.getUint16(28, true) & 0x3fff };
    if (t === "VP8L") { const b = dv.getUint32(21, true); return { width: (b & 0x3fff) + 1, height: ((b >> 14) & 0x3fff) + 1 }; }
    if (t === "VP8X") return { width: (veri[24] | (veri[25] << 8) | (veri[26] << 16)) + 1, height: (veri[27] | (veri[28] << 8) | (veri[29] << 16)) + 1 };
  }
  const bas = ascii(0, Math.min(veri.length, 2048));
  if (/<svg[\s>]/i.test(bas)) {
    const oz = /<svg\b([^>]*)>/i.exec(bas)?.[1] ?? "";
    const w = /\bwidth\s*=\s*["']?\s*([\d.]+)(px)?\s*["']?/i.exec(oz);
    const h = /\bheight\s*=\s*["']?\s*([\d.]+)(px)?\s*["']?/i.exec(oz);
    if (w && h) return { width: Math.round(+w[1]), height: Math.round(+h[1]) };
    const vb = /\bviewBox\s*=\s*["']\s*[\d.-]+[\s,]+[\d.-]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(oz);
    if (vb) return { width: Math.round(+vb[1]), height: Math.round(+vb[2]) };
  }
  return null;
}

/** Standart §2 medya uzantıları (görsel). */
export const IZINLI_GORSEL = new Set(["png", "jpg", "jpeg", "webp", "gif", "svg", "avif"]);

const TR = { ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", I: "i", İ: "i", ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u", â: "a", î: "i", û: "u" };
/** ASCII küçük harf slug (kural 3): Türkçe harfler çevrilir, baştaki bölüm numarası atılır, ≤ 60 karakter. */
export function slugla(metin, maks = 60) {
  let s = String(metin).replace(/^\s*\d+[\s.:)-]*/, "");
  s = s.replace(/[çÇğĞıIİöÖşŞüÜâîû]/g, (c) => TR[c] ?? c).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  s = s.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (s.length > maks) s = s.slice(0, maks).replace(/-+$/, "");
  return s || "bolum";
}

/** Eşleştirme/benzerlik için metin normalizasyonu: NFC, küçük harf, boşluk sıkıştırma. */
export function normalize(s) {
  return String(s).normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
}

export function tokenler(s) {
  return normalize(s).split(/[^\p{L}\p{N}]+/u).filter(Boolean);
}

/** Dice benzerliği (token kümeleri), 0–1. */
export function benzerlik(a, b) {
  const A = new Set(tokenler(a)), B = new Set(tokenler(b));
  if (!A.size && !B.size) return 1;
  if (!A.size || !B.size) return 0;
  let ortak = 0;
  for (const t of A) if (B.has(t)) ortak++;
  return (2 * ortak) / (A.size + B.size);
}

export const pad4 = (n) => String(n).padStart(4, "0");

/** Sayı biçimi "2.1" / "2,1" → "2.1"; harf ekli ("2.7a") ya da tek parça ise null. */
export function esitlikNo(s) {
  const m = /^\(?\s*(\d+)\s*[.,]\s*(\d+)\s*\)?$/.exec(String(s).trim());
  return m ? `${+m[1]}.${+m[2]}` : null;
}

/** Şekil/Tablo/Örnek başlık yazısı: "Şekil 1.1: …" → { tur: "şekil", no: "1.1" } */
/** Sayıdan sonra ayraç (: . -), satır sonu ya da büyük harfle başlayan söz gelmeli — "Şekil 1.1'de …" / "Tablo 1.1 iki malın …" cümleleri başlık yazısı DEĞİLDİR. */
export const BASLIK_YAZISI_RE = /^\s*(Şekil|Sekil|Grafik|Tablo|Çizelge|Cizelge)\s+(\d+)\s*[.,]\s*(\d+)(?:\s*[:.\-–—]\s*|\s*$|\s+(?=\p{Lu}))/u;
export function baslikYazisi(metin) {
  const m = BASLIK_YAZISI_RE.exec(metin);
  if (!m) return null;
  const tur = /^(Şekil|Sekil|Grafik)$/u.test(m[1]) ? "sekil" : "tablo";
  return { tur, no: `${+m[2]}.${+m[3]}` };
}

/** Daima açık kutu adayı: "Örnek 1.1:", "Alıştırma 2:", "Uyarı:" … */
export const KUTU_RE = /^\s*(Örnek|Ornek|Alıştırma|Alistirma|Uyarı|Uyari|Not|Tanım|Tanim|Teorem|Sonuç|Sonuc|Özet|Ozet|Çözüm|Cozum|Ödev|Odev|Soru|Hatırlatma|Hatirlatma)\s*(\d+(?:\s*[.,]\s*\d+)?)?\s*[:.\-–—]\s*/u;
/** Kutu sözcüğü → kart ailesi türü (kt-kutu--<tur>, Plan 35). Ödev ve Soru alıştırmadır, Hatırlatma nottur. */
export const KUTU_KART_TURU = { ornek: "ornek", alistirma: "alistirma", odev: "alistirma", soru: "alistirma", uyari: "uyari", not: "not", hatirlatma: "not", tanim: "tanim", teorem: "teorem", sonuc: "sonuc", ozet: "ozet", cozum: "cozum" };
export function kutuAnahtari(metin) {
  const m = KUTU_RE.exec(metin);
  if (!m) return null;
  const tur = m[1].normalize("NFC").toLowerCase().replace(/[çÇğĞıIİöÖşŞüÜ]/g, (c) => TR[c] ?? c);
  const no = m[2] ? m[2].replace(/\s+/g, "").replace(",", ".") : "";
  return { tur, no, anahtar: no ? `${tur} ${no}` : null, kart: KUTU_KART_TURU[tur] ?? null };
}

/** Basit HTML entity çözümü (yapi.md için). */
export function entityCoz(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, " ");
}
