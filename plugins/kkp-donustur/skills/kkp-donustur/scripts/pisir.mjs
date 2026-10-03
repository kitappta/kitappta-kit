// Pişirme: hazır HTML kitabı tarayıcıda açar, kabuk JS'inin sayfa açılırken ürettiği SON DOM'u birim birim diske yazar.
// Neden: kart sarmalayıcıları, ikonlar, numaralar, aç/kapa düğmeleri çoğu kitapta statik dosyada değil, çalışma anında üretilir
// (Maliye Politikası: statik 949 eleman, tarayıcıda 1749). Dosyayı okuyan hiç görmez; tarayıcı görür.
//
//   node pisir.mjs <kaynak-dizin> <cikti-dizin> --giris kitap.html [--birim ".reading-unit"] [--engelle "learning-modals|interactions"]
//                  [--temizle ".chapter-learning-panel,[data-collapse-key]"] [--sinif-ekle active] [--bekle 2500] [--genislik 1440] [--tarayici chrome]
//
// --birim   : bölüm birimi seçicisi; verilmezse (ya da eşleşmezse) <main> ya da <body> tek birim olarak alınır.
// --engelle : ÇALIŞMA ANINDA yeniden koşacak katmanlar (pekiştirme, laboratuvar, modal) — route ile engellenir, yoksa iki kez eklenir.
// --temizle : kabuk kalıntıları (virgülle seçici listesi) — kopyadan silinir. `[attr]` yazımı özniteliği siler.
// Çıktı: <cikti>/<birimId>.html · _ozet.json (birimler, eleman sayıları, kök/body sınıfları, engellenenler, konsol hataları)
//        · _basliklar.json (h1–h4 sırayla: id, level, title, birim) · _giris.json (stylesheet ve script sırası, satır içi style/script
//        id'leri) · _veri/<id>.json (type=application/json bloklar).
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const MIME = { ".html": "text/html; charset=utf-8", ".htm": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".gif": "image/gif", ".webp": "image/webp", ".svg": "image/svg+xml", ".woff": "font/woff", ".woff2": "font/woff2", ".ttf": "font/ttf", ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".webmanifest": "application/manifest+json" };
/** Kaynak dizini yerel sunar (127.0.0.1, rastgele port). Dosya dışına çıkılmaz. */
export function sun(dizin) {
  const kok = path.resolve(dizin);
  const sunucu = http.createServer((req, res) => {
    const yol = decodeURIComponent((req.url || "/").split("?")[0]);
    const tam = path.normalize(path.join(kok, yol.endsWith("/") ? yol + "index.html" : yol));
    if (!tam.startsWith(kok) || !fs.existsSync(tam) || fs.statSync(tam).isDirectory()) { res.writeHead(404); res.end("yok"); return; }
    // Access-Control-Allow-Origin: Kitappta içerik sunucusu varlıklara aynı başlığı verir (03.10.2026) — sandbox iframe (köken "null")
    // içindeki @font-face woff2 istekleri bunsuz CORS'a takılır; kanıt/yükseklik ölçümü platformla aynı davransın.
    res.writeHead(200, { "Content-Type": MIME[path.extname(tam).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" });
    fs.createReadStream(tam).pipe(res);
  });
  return new Promise((coz) => sunucu.listen(0, "127.0.0.1", () => coz({ url: `http://127.0.0.1:${sunucu.address().port}`, kapat: () => sunucu.close() })));
}

/** Playwright'ı bu script'in yanındaki node_modules'tan yükler; yoksa anlaşılır hata. */
export async function tarayiciAc(tur = "chromium", genislik = 1440, { swEngelle = true } = {}) {
  let pw;
  try { pw = await import("playwright"); } catch { throw new Error("playwright bulunamadı — scripts/ içinde `npm install` ve `npx playwright install chromium` çalıştırın."); }
  const secenek = { headless: true };
  if (tur === "chrome" || tur === "msedge") secenek.channel = tur;
  const browser = await pw.chromium.launch(secenek);
  // swEngelle: kaynak kitap service worker kaydediyorsa route() SW'nin arkasında kalır → pişirmede engellenir. Paket sayfalarında
  // (kanıt, yükseklik ölçümü) kapalı: Playwright'ın engelleme betiği sandbox iframe içinde `navigator.serviceWorker` okurken
  // SecurityError üretir (paketin hatası değil).
  const ctx = await browser.newContext({ ...(swEngelle ? { serviceWorkers: "block" } : {}), viewport: { width: genislik, height: 900 } });
  return { browser, ctx };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // argüman ayrıştırma yalnız doğrudan çalıştırmada (embed-yukseklik/kanit bu modülden sun/tarayiciAc alır)
  const arg = process.argv.slice(2);
  const sec = (ad, vars) => { const i = arg.indexOf(ad); return i >= 0 && arg[i + 1] !== undefined ? arg[i + 1] : vars; };
  const [KAYNAK, CIKTI] = arg.filter((a, i) => !a.startsWith("--") && (i === 0 || !arg[i - 1].startsWith("--")));
  if (!KAYNAK || !CIKTI) { console.error("kullanım: node pisir.mjs <kaynak-dizin> <cikti-dizin> --giris kitap.html [--birim sel] [--engelle regex] [--temizle sel,...] [--sinif-ekle x] [--bekle ms]"); process.exit(2); }
  const GIRIS = sec("--giris", "index.html");
  const BIRIM = sec("--birim", "");
  const ENGELLE = sec("--engelle", "");
  const TEMIZLE = sec("--temizle", "");
  const SINIF_EKLE = sec("--sinif-ekle", "");
  const BEKLE = Number(sec("--bekle", "2500"));
  const GENISLIK = Number(sec("--genislik", "1440"));
  const TARAYICI = sec("--tarayici", "chromium");
  const { url, kapat } = await sun(KAYNAK);
  const { browser, ctx } = await tarayiciAc(TARAYICI, GENISLIK);
  const engellenen = [], hatalar = [];
  const p = await ctx.newPage();
  if (ENGELLE) { const re = new RegExp(ENGELLE); await p.route("**/*", (route) => { const u = route.request().url(); if (re.test(u)) { engellenen.push(u.split("/").pop()); return route.abort(); } return route.continue(); }); }
  p.on("pageerror", (e) => hatalar.push(String(e.message).slice(0, 200)));
  // engellenen kaynakların "Failed to load resource: net::ERR_FAILED" satırları hata değildir (route.abort'un beklenen izi)
  p.on("console", (m) => { if (m.type() === "error" && !(ENGELLE && /net::ERR_FAILED/.test(m.text()))) hatalar.push("console: " + m.text().slice(0, 200)); });
  await p.goto(`${url}/${GIRIS}`, { waitUntil: "load", timeout: 90000 });
  await p.waitForTimeout(BEKLE);
  const sonuc = await p.evaluate(({ birim, temizle, sinifEkle }) => {
    const seciciler = temizle ? temizle.split(",").map((s) => s.trim()).filter(Boolean) : [];
    let birimler = birim ? [...document.querySelectorAll(birim)] : [];
    let tekBirim = false;
    if (!birimler.length) { tekBirim = true; birimler = [document.querySelector("main") || document.body]; }
    const basliklar = [];
    const cikti = [];
    birimler.forEach((u, i) => {
      const k = u.cloneNode(true);
      if (sinifEkle) k.classList.add(sinifEkle);
      for (const s of seciciler) {
        const m = /^\[([\w-]+)\]$/.exec(s);
        if (m) k.querySelectorAll(`[${m[1]}]`).forEach((e) => e.removeAttribute(m[1]));
        else k.querySelectorAll(s).forEach((e) => e.remove());
      }
      k.querySelectorAll("script").forEach((e) => e.remove());
      const id = u.id || `birim-${String(i + 1).padStart(3, "0")}`;
      u.querySelectorAll("h1,h2,h3,h4").forEach((h) => basliklar.push({ id: h.id || "", level: Number(h.tagName[1]), title: (h.textContent || "").replace(/\s+/g, " ").trim().slice(0, 200), birim: id }));
      cikti.push({ id, veri: { ...u.dataset }, sinif: u.className, el: k.querySelectorAll("*").length, html: tekBirim ? k.innerHTML : k.outerHTML });
    });
    const giris = {
      baslik: document.title,
      stiller: [...document.querySelectorAll('link[rel="stylesheet"]')].map((l) => (l.getAttribute("href") || "").split("?")[0]),
      scriptler: [...document.querySelectorAll("script[src]")].map((s) => (s.getAttribute("src") || "").split("?")[0]),
      satirIciStil: [...document.querySelectorAll("style")].map((s) => s.id || "(idsiz)"),
      satirIciScript: [...document.querySelectorAll("script:not([src])")].map((s) => (s.id || "(idsiz)") + (s.type ? ` [${s.type}]` : "")),
      kokSiniflar: document.documentElement.className,
      bodySiniflar: document.body.className,
      tekBirim,
    };
    const veri = {};
    document.querySelectorAll('script[type="application/json"]').forEach((s) => { if (s.id) veri[s.id] = s.textContent; });
    return { cikti, basliklar, giris, veri };
  }, { birim: BIRIM, temizle: TEMIZLE, sinifEkle: SINIF_EKLE });
  await browser.close();
  kapat();
  fs.rmSync(CIKTI, { recursive: true, force: true });
  fs.mkdirSync(path.join(CIKTI, "_veri"), { recursive: true });
  const ozet = { kaynak: path.resolve(KAYNAK), giris: GIRIS, birimSecici: BIRIM || "(main/body)", engellenen: [...new Set(engellenen)], hatalar, giris_bilgi: sonuc.giris, birimler: [] };
  for (const b of sonuc.cikti) {
    const ad = b.id.replace(/[^\w.-]+/g, "_") + ".html";
    fs.writeFileSync(path.join(CIKTI, ad), b.html);
    ozet.birimler.push({ id: b.id, dosya: ad, veri: b.veri, sinif: b.sinif, el: b.el, kb: Math.round(b.html.length / 1024) });
  }
  for (const [id, metin] of Object.entries(sonuc.veri)) fs.writeFileSync(path.join(CIKTI, "_veri", id.replace(/[^\w.-]+/g, "_") + ".json"), metin);
  fs.writeFileSync(path.join(CIKTI, "_ozet.json"), JSON.stringify(ozet, null, 1));
  fs.writeFileSync(path.join(CIKTI, "_basliklar.json"), JSON.stringify(sonuc.basliklar, null, 0));
  fs.writeFileSync(path.join(CIKTI, "_giris.json"), JSON.stringify(sonuc.giris, null, 1));
  const toplam = ozet.birimler.reduce((a, b) => a + b.el, 0);
  console.log(`pişirme: ${ozet.birimler.length} birim, ${toplam} eleman, ${sonuc.basliklar.length} başlık → ${CIKTI}`);
  if (ozet.engellenen.length) console.log(`engellenen: ${ozet.engellenen.join(", ")}`);
  if (hatalar.length) console.log(`sayfa hataları (${hatalar.length}): ${hatalar.slice(0, 3).join(" | ")}`);
  if (sonuc.giris.tekBirim) console.log("UYARI: birim seçicisi eşleşmedi; <main>/<body> tek birim olarak alındı — bölümleri başlıklardan ayıracaksın.");
}
