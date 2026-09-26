// Gömülü uygulamanın (assets/embed/*.html) gerçek yüksekliğini ölçer: belge 1000 px genişlikte tek başına açılır,
// documentElement.scrollHeight okunur (+pay). iframe'e bu değer yazılır — iç kaydırma çıkmasın (kural 5/12).
//   node embed-yukseklik.mjs <paket-dizin> assets/embed/a.html [assets/embed/b.html …] [--genislik 1000] [--pay 20] [--bekle 1500]
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sun, tarayiciAc } from "./pisir.mjs";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  const sec = (ad, v) => { const i = arg.indexOf(ad); return i >= 0 ? arg[i + 1] : v; };
  const konum = arg.filter((a, i) => !a.startsWith("--") && !(arg[i - 1] || "").startsWith("--"));
  const [PAKET, ...DOSYALAR] = konum;
  if (!PAKET || !DOSYALAR.length) { console.error("kullanım: node embed-yukseklik.mjs <paket-dizin> assets/embed/x.html … [--genislik 1000] [--pay 20]"); process.exit(2); }
  const GENISLIK = Number(sec("--genislik", "1000")), PAY = Number(sec("--pay", "20")), BEKLE = Number(sec("--bekle", "1500"));
  const { url, kapat } = await sun(PAKET);
  const { browser, ctx } = await tarayiciAc(sec("--tarayici", "chromium"), GENISLIK, { swEngelle: false });
  const p = await ctx.newPage();
  await p.setViewportSize({ width: GENISLIK, height: 800 });
  const sonuc = {};
  for (const d of DOSYALAR) {
    try {
      await p.goto(`${url}/${d}`, { waitUntil: "load", timeout: 60000 });
      await p.waitForTimeout(BEKLE);
      const r = await p.evaluate(() => ({ h: Math.max(document.documentElement.scrollHeight, document.body.scrollHeight), icKaydirma: [...document.querySelectorAll("*")].filter((e) => { const cs = getComputedStyle(e); return /(auto|scroll)/.test(cs.overflowY) && e.scrollHeight > e.clientHeight + 2 && e.clientHeight > 0; }).length }));
      sonuc[d] = { yukseklik: r.h + PAY, icKaydirmaKutusu: r.icKaydirma };
      console.log(`${d}: height="${r.h + PAY}"${r.icKaydirma ? ` (belgenin kendi içinde ${r.icKaydirma} kaydırma kutusu var — hocanın tasarımı)` : ""}`);
    } catch (e) { sonuc[d] = { hata: String(e.message).slice(0, 120) }; console.log(`${d}: HATA ${String(e.message).slice(0, 120)}`); }
  }
  await browser.close();
  kapat();
  console.log(JSON.stringify(sonuc));
}
