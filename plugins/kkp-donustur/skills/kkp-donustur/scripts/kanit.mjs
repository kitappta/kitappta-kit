// Kanıt: paketin bölüm sayfaları tarayıcıda açılır (kural 9: tam sayfa), bölüm başına eleman sayıları pişmiş kaynak birimleriyle
// karşılaştırılır; dialog açan düğmeler tıklanır (aria-haspopup="dialog" / .kt-lab / data-kt-embed-ac), açılan dialog sayılır;
// konsol hataları toplanır. Kayıpsızlık kanıtı budur (kural 2, üretim notu §1).
//   node kanit.mjs --paket <dizin> --pismis <dizin> --plan plan.json [--tikla 6] [--bekle 1500]
//   plan.json: { "01-bolum.html": ["unit-sec-1-1.html", "unit-sec-1-2.html"], "00-onsoz.html": ["unit-intro.html"] }
//              (bölüm dosyası → o bölüme giren pişmiş birim dosyaları; anahtarlar paket kökünde, değerler pişmiş dizininde)
// Çıkış kodu: 0 (fark ≤ %3 ve dialoglar açıldı) · 1 (fark büyük ya da dialog açılmadı ya da sayfa hatası)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sun, tarayiciAc } from "./pisir.mjs";

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv.slice(2);
  const sec = (ad, v) => { const i = arg.indexOf(ad); return i >= 0 ? arg[i + 1] : v; };
  const PAKET = sec("--paket"), PISMIS = sec("--pismis"), PLAN = sec("--plan");
  if (!PAKET || !PISMIS || !PLAN) { console.error("kullanım: node kanit.mjs --paket <dizin> --pismis <dizin> --plan plan.json [--tikla 6]"); process.exit(2); }
  const TIKLA = Number(sec("--tikla", "6")), BEKLE = Number(sec("--bekle", "1500"));
  const plan = JSON.parse(fs.readFileSync(PLAN, "utf8"));
  const SAYIM = `(root) => { const q = (s) => root.querySelectorAll(s).length; return { el: q("*"), baslik: q("h1,h2,h3,h4"), p: q("p"), li: q("li"), img: q("img"), svg: q("svg"), math: q("math"), table: q("table"), figure: q("figure"), button: q("button"), details: q("details"), iframe: q("iframe"), dialog: q("dialog") }; }`;
  const pismisSun = await sun(PISMIS);
  const paketSun = await sun(PAKET);
  const { browser, ctx } = await tarayiciAc(sec("--tarayici", "chromium"), 1440, { swEngelle: false });
  const p = await ctx.newPage();
  let kod = 0;
  const satirlar = ["| bölüm | kaynak el | paket el | fark | başlık | düğme | dialog açıldı/denendi | hata |", "|---|---|---|---|---|---|---|---|"];
  for (const [bolum, birimler] of Object.entries(plan)) {
    // kaynak: pişmiş birimler (statik dosya; kabuk JS'i zaten pişirilmiş)
    const kaynak = { el: 0, baslik: 0, button: 0, dialog: 0 };
    for (const b of birimler) {
      await p.goto(`${pismisSun.url}/${b}`, { waitUntil: "load", timeout: 60000 });
      const s = await p.evaluate(`(${SAYIM})(document.body)`);
      // pişmiş dosya birimin outerHTML'i → body'nin ilk çocuğu; body'nin kendisi sayılmasın
      kaynak.el += s.el - 1; kaynak.baslik += s.baslik; kaynak.button += s.button; kaynak.dialog += s.dialog;
    }
    const hatalar = [];
    const dinle = (e) => { const m = String(e.message || e); if (!/serviceWorker.*sandboxed/.test(m)) hatalar.push(m.slice(0, 120)); };
    // yalnız PAKET sunucusunun 404'leri (pişmiş birim sayfalarının medyası pişmiş dizinde yoktur, o 404'ler beklenir)
    const yanitDinle = (r) => { if (r.status() >= 400 && r.url().startsWith(paketSun.url + "/")) hatalar.push(`${r.status()} ${r.url().replace(paketSun.url + "/", "")}`.slice(0, 120)); };
    p.on("pageerror", dinle);
    p.on("response", yanitDinle);
    p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) hatalar.push("console: " + m.text().slice(0, 120)); });
    await p.goto(`${paketSun.url}/${bolum}`, { waitUntil: "load", timeout: 60000 });
    await p.waitForTimeout(BEKLE);
    const paket = await p.evaluate(`(${SAYIM})(document.querySelector(".kt-bolum") || document.body)`);
    // paket sayısına çalışma anında eklenenler de girer (pekiştirme paneli, lab düğmeleri, statik dialoglar) — fark pozitif olabilir
    const tik = await p.evaluate(async (n) => {
      const dugmeler = [...document.querySelectorAll('button[aria-haspopup="dialog"], [data-kt-embed-ac], .mp-interact, .learning-launch')].slice(0, n);
      let acilan = 0;
      for (const b of dugmeler) {
        b.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
        await new Promise((r) => setTimeout(r, 400));
        const d = document.querySelector("dialog[open]");
        if (d) { acilan++; const kapat = d.querySelector("[data-close], .learning-close, button[aria-label*='apat']"); if (kapat) kapat.click(); else d.close(); await new Promise((r) => setTimeout(r, 200)); }
        document.querySelectorAll("dialog[open]").forEach((x) => x.close());
      }
      return { denenen: dugmeler.length, acilan };
    }, TIKLA);
    p.off("pageerror", dinle);
    p.off("response", yanitDinle);
    const fark = kaynak.el ? ((paket.el - kaynak.el) / kaynak.el) * 100 : 0;
    // kayıp: %3'ten VE 8 elemandan fazla (küçük bölümde kabuk kalıntısı silmek birkaç eleman eksiltir, kayıp değildir)
    const kayip = kaynak.el - paket.el;
    const kotu = kayip > Math.max(8, kaynak.el * 0.03) || (tik.denenen && tik.acilan < tik.denenen) || hatalar.length;
    if (kotu) kod = 1;
    satirlar.push(`| ${bolum} | ${kaynak.el} | ${paket.el} | ${fark >= 0 ? "+" : ""}${fark.toFixed(1)}% | ${kaynak.baslik}→${paket.baslik} | ${kaynak.button}→${paket.button} | ${tik.acilan}/${tik.denenen} | ${hatalar.length ? hatalar[0] : "-"} |`);
  }
  await browser.close();
  pismisSun.kapat(); paketSun.kapat();
  console.log(satirlar.join("\n"));
  console.log(kod ? "\nkanıt: SORUN VAR — eleman kaybı (> %3 ve > 8), açılmayan dialog, eksik dosya (404) ya da sayfa hatası (yukarıda)" : "\nkanıt: GEÇTİ — eleman sayıları kaynakla uyumlu, dialoglar açılıyor, eksik dosya ve sayfa hatası yok");
  process.exit(kod);
}
