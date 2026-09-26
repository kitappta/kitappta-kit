// kkp/1 paket dizini ↔ zip (saf JS; `zip`/`unzip` ikilisi gerekmez — Windows'ta da çalışır). Kit ve repo için aynı araç.
//
//   node scripts/kkp/paketle.mjs <paket-dizin> <cikti.zip>        dizin → zip (kökte manifest.json yoksa çıkış 1)
//   node scripts/kkp/paketle.mjs --ac <paket.zip> <dizin>         zip → dizin (zip kökünde manifest.json yoksa çıkış 1;
//                                                                 dizin doluysa ve manifest.json içermiyorsa dokunmaz, çıkış 1)
// Zip deterministiktir (aynı dizin → aynı bayt); .DS_Store / Thumbs.db girmez.
import fs from "node:fs";
import path from "node:path";
import { dizinZiple, dizineYaz, zipAc } from "./lib/zip.mjs";

const argv = process.argv.slice(2);
const hata = (m, kod = 1) => { console.error("HATA: " + m); process.exit(kod); };
const kullanim = () => { console.error("Kullanım: node scripts/kkp/paketle.mjs <paket-dizin> <cikti.zip>\n         node scripts/kkp/paketle.mjs --ac <paket.zip> <dizin>"); process.exit(2); };

if (argv[0] === "--ac") {
  const [, zipArg, dizinArg] = argv;
  if (!zipArg || !dizinArg || argv.length > 3) kullanim();
  const zip = path.resolve(zipArg);
  const dizin = path.resolve(dizinArg);
  if (!fs.existsSync(zip)) hata(`${zip} yok`);
  let dosyalar;
  try { dosyalar = zipAc(new Uint8Array(fs.readFileSync(zip))); } catch (e) { hata(e.message); }
  if (!dosyalar.has("manifest.json")) hata(`${zip} kökünde manifest.json yok — kkp/1 paketi değil (zip'in içinde bir üst klasör olabilir; paket dosyaları zip'in kökünde olmalı)`);
  if (fs.existsSync(dizin)) {
    const icerik = fs.readdirSync(dizin).filter((x) => x !== ".DS_Store");
    if (icerik.length && !icerik.includes("manifest.json")) hata(`${dizin} boş değil ve bir kkp paketi değil (manifest.json yok) — yanlışlıkla silmemek için durduruldu.`);
    fs.rmSync(dizin, { recursive: true, force: true });
  }
  dizineYaz(dosyalar, dizin);
  console.log(`Açıldı: ${dizin} (${dosyalar.size} dosya)`);
} else {
  const [dizinArg, zipArg] = argv;
  if (!dizinArg || !zipArg || argv.length > 2 || dizinArg.startsWith("--")) kullanim();
  const dizin = path.resolve(dizinArg);
  const zip = path.resolve(zipArg);
  if (!fs.existsSync(path.join(dizin, "manifest.json"))) hata(`${dizin} kökünde manifest.json yok — kkp/1 paket dizini değil.`);
  if (fs.existsSync(zip)) fs.rmSync(zip);
  const bayt = dizinZiple(dizin, zip);
  console.log(`zip: ${zip} (${(bayt / 1024).toFixed(0)} KB)`);
}
