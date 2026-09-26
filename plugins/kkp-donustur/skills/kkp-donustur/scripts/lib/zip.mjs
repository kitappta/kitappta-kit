// Saf JS zip yazıcı + okuyucu (bağımlılık yok; node:zlib) — Windows'ta `zip`/`unzip` ikilisi olmadığı için (Plan 27 T1).
// Yazıcı apps/web/lib/kitap/zip-yaz.ts'in .mjs portudur: aynı girdi → bayt-bayt aynı zip (sabit tarih, sıralı yollar, UTF-8 ad bayrağı),
// dizin girdisi yazılmaz, ZIP64 yok (paket ≤ 2.000 dosya / ≤ 400 MB). Okuyucu merkezi dizinden gider; yöntem 0 (store) ve 8 (deflate).
//   zipYaz(Map<yol,Uint8Array>) → Uint8Array · zipAc(Uint8Array) → Map · dizinOku / dizineYaz / dizinZiple / zipiAc disk yardımcıları.
import fs from "node:fs";
import path from "node:path";
import { deflateRawSync, inflateRawSync } from "node:zlib";

/** Zaten sıkıştırılmış biçimler "store" ile yazılır (deflate kazanç getirmez, zaman yer). */
const STORE_UZANTILARI = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".mp3", ".m4a", ".ogg", ".mp4", ".webm", ".woff2", ".zip"]);
/** Sabit DOS tarihi: 2026-01-01 00:00:00 (deterministik çıktı; tarih bilgisi taşımak istemiyoruz). */
const DOS_TARIH = ((2026 - 1980) << 9) | (1 << 5) | 1;
const DOS_SAAT = 0;

const CRC_TABLO = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
export function crc32(veri) {
  let c = 0xffffffff;
  for (let i = 0; i < veri.length; i++) c = (CRC_TABLO[(c ^ veri[i]) & 0xff] ^ (c >>> 8)) >>> 0;
  return (c ^ 0xffffffff) >>> 0;
}

function u16(v) { return new Uint8Array([v & 0xff, (v >>> 8) & 0xff]); }
function u32(v) { return new Uint8Array([v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff]); }
function birlestir(parcalar) {
  const toplam = parcalar.reduce((a, p) => a + p.length, 0);
  const cikti = new Uint8Array(toplam);
  let k = 0;
  for (const p of parcalar) { cikti.set(p, k); k += p.length; }
  return cikti;
}

/**
 * Yol → içerik haritasından zip. Yollar paket-göreli (`manifest.json`, `assets/css/kitap.css`), sıralanır; UTF-8 ad bayrağı (bit 11)
 * konur. Dizin girdisi yazılmaz (unzip dizinleri dosyalardan türetir; doğrulayıcı da dizin girdisi beklemez).
 */
export function zipYaz(dosyalar) {
  const yollar = [...dosyalar.keys()].sort();
  const yerel = [];
  const merkez = [];
  let ofset = 0;
  const kodlayici = new TextEncoder();
  for (const yol of yollar) {
    const ham = dosyalar.get(yol);
    const ad = kodlayici.encode(yol);
    const i = yol.lastIndexOf(".");
    const uz = i === -1 ? "" : yol.slice(i).toLowerCase();
    let yontem = 8;
    let govde = STORE_UZANTILARI.has(uz) || ham.length === 0 ? ham : new Uint8Array(deflateRawSync(ham, { level: 6 }));
    if (govde.length >= ham.length) { yontem = 0; govde = ham; }
    const crc = crc32(ham);
    const bas = birlestir([u32(0x04034b50), u16(20), u16(0x0800), u16(yontem), u16(DOS_SAAT), u16(DOS_TARIH), u32(crc), u32(govde.length), u32(ham.length), u16(ad.length), u16(0), ad]);
    yerel.push(bas, govde);
    merkez.push(birlestir([u32(0x02014b50), u16(20), u16(20), u16(0x0800), u16(yontem), u16(DOS_SAAT), u16(DOS_TARIH), u32(crc), u32(govde.length), u32(ham.length), u16(ad.length), u16(0), u16(0), u16(0), u16(0), u32(0), u32(ofset), ad]));
    ofset += bas.length + govde.length;
  }
  const merkezVeri = birlestir(merkez);
  const son = birlestir([u32(0x06054b50), u16(0), u16(0), u16(yollar.length), u16(yollar.length), u32(merkezVeri.length), u32(ofset), u16(0)]);
  return birlestir([...yerel, merkezVeri, son]);
}

/** Girdi adının güvensiz olma nedeni (zip-slip, mutlak yol, ters bölü, sürücü harfi) ya da null. */
function guvensizNedeni(ad) {
  if (!ad) return "boş ad";
  if (ad.includes("\0")) return "NUL karakteri";
  if (ad.includes("\\")) return "ters bölü";
  if (ad.startsWith("/")) return "mutlak yol";
  if (/^[a-zA-Z]:/.test(ad)) return "sürücü harfi";
  if (ad.split("/").some((s) => s === "..")) return "'..' segmenti";
  return null;
}

/**
 * Zip'i bellekte açar: merkezi dizin (ad, yöntem, boyutlar, yerel başlık konumu) → yerel başlıktan veri. Dizin girdileri atlanır;
 * güvensiz ad ya da 0/8 dışı yöntem → throw. CRC uyuşmazlığı da throw (bozuk dosya sessizce geçmesin).
 */
export function zipAc(veri) {
  const dv = new DataView(veri.buffer, veri.byteOffset, veri.byteLength);
  let eocd = -1;
  for (let i = veri.length - 22; i >= 0 && i >= veri.length - 22 - 0xffff; i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error("zip: merkezi dizin sonu bulunamadı (geçerli bir zip değil)");
  const adet = dv.getUint16(eocd + 10, true);
  const merkezBoyut = dv.getUint32(eocd + 12, true);
  let k = dv.getUint32(eocd + 16, true);
  if (k + merkezBoyut > eocd) throw new Error("zip: merkezi dizin sınırların dışında");
  const cozucu = new TextDecoder();
  const sonuc = new Map();
  for (let g = 0; g < adet; g++) {
    if (k + 46 > veri.length || dv.getUint32(k, true) !== 0x02014b50) throw new Error("zip: merkezi dizin girdisi bozuk");
    const yontem = dv.getUint16(k + 10, true);
    const crc = dv.getUint32(k + 16, true);
    const sikisik = dv.getUint32(k + 20, true);
    const acik = dv.getUint32(k + 24, true);
    const adUz = dv.getUint16(k + 28, true), ekUz = dv.getUint16(k + 30, true), yorumUz = dv.getUint16(k + 32, true);
    const yerel = dv.getUint32(k + 42, true);
    const ad = cozucu.decode(veri.subarray(k + 46, k + 46 + adUz)).normalize("NFC");
    k += 46 + adUz + ekUz + yorumUz;
    if (ad.endsWith("/")) continue;
    const neden = guvensizNedeni(ad);
    if (neden) throw new Error(`zip: güvensiz yol "${ad}" (${neden})`);
    if (yontem !== 0 && yontem !== 8) throw new Error(`zip: desteklenmeyen sıkıştırma yöntemi ${yontem} (${ad}) — yalnız store ve deflate`);
    if (yerel + 30 > veri.length || dv.getUint32(yerel, true) !== 0x04034b50) throw new Error(`zip: yerel başlık bozuk (${ad})`);
    const veriBas = yerel + 30 + dv.getUint16(yerel + 26, true) + dv.getUint16(yerel + 28, true);
    if (veriBas + sikisik > veri.length) throw new Error(`zip: girdi verisi sınırların dışında (${ad})`);
    const ham = veri.subarray(veriBas, veriBas + sikisik);
    const icerik = yontem === 0 ? new Uint8Array(ham) : new Uint8Array(inflateRawSync(ham));
    if (icerik.length !== acik) throw new Error(`zip: ${ad} açılmış boyutu bildirilenden farklı (${icerik.length} ≠ ${acik})`);
    if (crc32(icerik) !== crc) throw new Error(`zip: ${ad} CRC uyuşmuyor (bozuk dosya)`);
    sonuc.set(ad, icerik);
  }
  return sonuc;
}

/** Dizini okur → Map; yollar posix, dizine göreli; alt dizinler özyinelemeli; `atla` adları (.DS_Store, Thumbs.db) düşer. */
export function dizinOku(dizin, atla = [".DS_Store", "Thumbs.db"]) {
  const atlaKume = new Set(atla);
  const sonuc = new Map();
  const gez = (d, gorel) => {
    const girdiler = fs.readdirSync(d, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
    for (const g of girdiler) {
      if (atlaKume.has(g.name)) continue;
      const yol = gorel ? `${gorel}/${g.name}` : g.name;
      if (g.isDirectory()) gez(path.join(d, g.name), yol);
      else if (g.isFile()) sonuc.set(yol.normalize("NFC"), new Uint8Array(fs.readFileSync(path.join(d, g.name))));
    }
  };
  gez(dizin, "");
  return sonuc;
}

/** Map'i dizine yazar (mkdir -p). Yollar posix; ".." içeren ad reddedilir. */
export function dizineYaz(dosyalar, dizin) {
  for (const [yol, veri] of dosyalar) {
    const neden = guvensizNedeni(yol);
    if (neden) throw new Error(`zip: güvensiz yol "${yol}" (${neden})`);
    const hedef = path.join(dizin, ...yol.split("/"));
    fs.mkdirSync(path.dirname(hedef), { recursive: true });
    fs.writeFileSync(hedef, veri);
  }
}

/** Dizini zip dosyasına yazar; bayt sayısı döner. */
export function dizinZiple(dizin, zipYolu) {
  const zip = zipYaz(dizinOku(dizin));
  fs.mkdirSync(path.dirname(zipYolu), { recursive: true });
  fs.writeFileSync(zipYolu, zip);
  return zip.length;
}

/** Zip dosyasını dizine açar; dosya sayısı döner. */
export function zipiAc(zipYolu, dizin) {
  const dosyalar = zipAc(new Uint8Array(fs.readFileSync(zipYolu)));
  dizineYaz(dosyalar, dizin);
  return dosyalar.size;
}
