// Stil pişirme: çalışma anında CSS üreten kütüphaneler (Tailwind Play CDN `cdn.tailwindcss.com`, JIT motorları) pakete giremez —
// CDN script'i allowlist dışıdır ve okuyucuda ağ yoktur. Sayfa tarayıcıda açılır, isteğe bağlı adımlar koşulur (sekme/tema/filtre:
// JS ile sonradan oluşan sınıflar da üretilsin), kaynak dosyada OLMAYAN <style> içerikleri toplanıp CSS dosyasına yazılır; bu CSS
// gömülü belgeye satır içi <style> olarak konur (embedTasi/kural: embed CSS'i satır içi). İlk vaka: Türk Dili I atlası (03.10.2026).
//
//   node stil-pisir.mjs <kaynak-dizin> <sayfa.html> <cikti.css> [--calistir "switchTab('quiz');;toggleTheme()"] [--tikla ".tab-btn,.filter-btn"]
//                       [--bekle 2500] [--genislik 1400] [--tarayici chrome]
// --calistir : ";;" ile ayrılmış JS ifadeleri sırayla page.evaluate ile koşulur (hata adımı atlar, raporlanır).
// --tikla    : virgülle seçici listesi; eşleşen HER eleman sırayla tıklanır.
// Çıktı: <cikti.css> + yanında <cikti>.json (eleman sayısı, style sayısı, hatalar, ağ hataları).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sun, tarayiciAc } from "./pisir.mjs";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  const sec = (ad, vars) => { const i = arg.indexOf(ad); return i >= 0 && arg[i + 1] !== undefined ? arg[i + 1] : vars; };
  const konum = arg.filter((a, i) => !a.startsWith("--") && (i === 0 || !arg[i - 1].startsWith("--")));
  const [KAYNAK, SAYFA, CIKTI] = konum;
  if (!KAYNAK || !SAYFA || !CIKTI) { console.error("kullanım: node stil-pisir.mjs <kaynak-dizin> <sayfa.html> <cikti.css> [--calistir \"a;;b\"] [--tikla sel,sel] [--bekle ms]"); process.exit(2); }
  const CALISTIR = sec("--calistir", "").split(";;").map((s) => s.trim()).filter(Boolean);
  const TIKLA = sec("--tikla", "").split(",").map((s) => s.trim()).filter(Boolean);
  const BEKLE = Number(sec("--bekle", "2500"));
  const kaynakHtml = fs.readFileSync(path.join(KAYNAK, SAYFA), "utf8");
  const kaynakStil = [...kaynakHtml.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1].trim().slice(0, 80));
  const { url, kapat } = await sun(KAYNAK);
  const { browser, ctx } = await tarayiciAc(sec("--tarayici", "chromium"), Number(sec("--genislik", "1400")), { swEngelle: false });
  const p = await ctx.newPage();
  const hatalar = [], agHatalari = [];
  p.on("pageerror", (e) => hatalar.push(String(e.message).slice(0, 200)));
  p.on("requestfailed", (r) => agHatalari.push(r.url().slice(0, 140)));
  await p.goto(`${url}/${encodeURI(SAYFA)}`, { waitUntil: "networkidle", timeout: 90000 });
  await p.waitForTimeout(BEKLE);
  for (const sel of TIKLA) {
    const n = await p.locator(sel).count();
    for (let i = 0; i < n; i++) { try { await p.locator(sel).nth(i).click({ timeout: 3000 }); await p.waitForTimeout(250); } catch (e) { hatalar.push(`tıkla ${sel}[${i}]: ${String(e.message).slice(0, 80)}`); } }
  }
  for (const js of CALISTIR) { try { await p.evaluate(js); await p.waitForTimeout(350); } catch (e) { hatalar.push(`çalıştır "${js.slice(0, 60)}": ${String(e.message).slice(0, 80)}`); } }
  await p.waitForTimeout(1000);
  const sonuc = await p.evaluate(() => ({
    stiller: [...document.querySelectorAll("style")].map((s) => ({ id: s.id || "", bas: (s.textContent || "").trim().slice(0, 80), css: s.textContent || "" })),
    el: document.querySelectorAll("*").length,
  }));
  await browser.close(); kapat();
  const uretilen = sonuc.stiller.filter((s) => s.css.trim() && !kaynakStil.includes(s.bas));
  fs.mkdirSync(path.dirname(path.resolve(CIKTI)), { recursive: true });
  fs.writeFileSync(CIKTI, uretilen.map((s) => `/* ${s.id || "tarayıcıda üretilmiş style"} */\n${s.css}`).join("\n"));
  const ozet = { sayfa: SAYFA, el: sonuc.el, styleToplam: sonuc.stiller.length, uretilen: uretilen.map((s) => ({ id: s.id, kb: Math.round(s.css.length / 1024) })), hatalar, agHatalari };
  fs.writeFileSync(CIKTI.replace(/\.css$/i, "") + ".json", JSON.stringify(ozet, null, 1));
  console.log(`stil pişirme: ${sonuc.el} eleman, ${sonuc.stiller.length} style, ${uretilen.length} üretilmiş (${Math.round(uretilen.reduce((a, s) => a + s.css.length, 0) / 1024)} KB) → ${CIKTI}; hata ${hatalar.length}, ağ hatası ${agHatalari.length}`);
  if (!uretilen.length) console.log("UYARI: tarayıcıda üretilmiş <style> bulunamadı — sayfa CSS'i dosyadan yüklüyor olabilir (o zaman bu araca gerek yok).");
  if (hatalar.length) console.log(hatalar.slice(0, 5).join("\n"));
}
