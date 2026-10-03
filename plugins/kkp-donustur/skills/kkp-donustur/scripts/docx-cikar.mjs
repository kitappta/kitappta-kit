// Word (.docx) → pandoc HTML5 + MathML çıkarımı — kkp/1 üretiminin 1. adımı (2. adım: scripts/kkp/kaynak-donustur.mjs).
//
//   node scripts/kkp/docx-cikar.mjs <kaynak.docx> <cikti-dizini> [--pandoc <yol>]
//
// Çıktı (cikti-dizini): kaynak.html (fragment; formüller MathML + TeX annotation; görseller ./media/…), media/, cikarim.json
// (kaynak adı, pandoc sürümü, tarih, pandoc uyarıları), yapi.md (başlık ağacı, sayımlar, görsel listesi, uyarılar — plan için okunur).
// pandoc: --pandoc, PANDOC ortam değişkeni, PATH, ya da script dizinine göre ../pandoc/pandoc(.exe) (editör kiti `pandoc/`, repoda
// `scripts/pandoc/`) ve ./pandoc/pandoc(.exe). Kurulum: Windows `winget install --id JohnMacFarlane.Pandoc`, macOS `brew install pandoc`,
// ya da github.com/jgm/pandoc/releases.
// Girdi salt okunur; çıktı dizini boşsa ya da önceki bir çıkarımsa (kaynak.html var) sıfırdan yazılır, yoksa durur.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { IZINLI_GORSEL, entityCoz, gorselBoyutu } from "./lib/ortak.mjs";

const argv = process.argv.slice(2);
const pandocArg = argv.includes("--pandoc") ? argv[argv.indexOf("--pandoc") + 1] : undefined;
const konum = argv.filter((a, i) => a !== "--pandoc" && !(i > 0 && argv[i - 1] === "--pandoc"));
const [docxArg, ciktiArg] = konum;
if (!docxArg || !ciktiArg || konum.length > 2) {
  console.error("Kullanım: node scripts/kkp/docx-cikar.mjs <kaynak.docx> <cikti-dizini> [--pandoc <yol>]");
  process.exit(2);
}
const hata = (m, kod = 1) => { console.error("HATA: " + m); process.exit(kod); };
const DOCX = path.resolve(docxArg);
const CIKTI = path.resolve(ciktiArg);
if (!fs.existsSync(DOCX)) hata(`${DOCX} bulunamadı.`);
if (!/\.docx$/i.test(DOCX)) hata("Girdi .docx olmalı (.doc ise Word'de .docx olarak kaydet).");

// ── pandoc ──
function pandocBul() {
  const scriptDizini = path.dirname(fileURLToPath(import.meta.url));
  const exe = process.platform === "win32" ? "pandoc.exe" : "pandoc";
  // Kit: <kit>/pandoc/pandoc(.exe) (script arac/ altında → ../pandoc); repo: scripts/pandoc/ (.gitignore). Ayrıca script yanı ./pandoc/.
  const yerel = [path.join(scriptDizini, "..", "pandoc", exe), path.join(scriptDizini, "pandoc", exe)].filter((p) => fs.existsSync(p));
  const adaylar = [pandocArg, process.env.PANDOC, ...yerel, "pandoc", "/opt/homebrew/bin/pandoc", "/usr/local/bin/pandoc"].filter(Boolean);
  for (const a of adaylar) {
    const r = spawnSync(a, ["--version"], { encoding: "utf8" });
    if (r.status === 0) return { yol: a, surum: /pandoc\s+([\d.]+)/.exec(r.stdout)?.[1] ?? "?" };
  }
  return null;
}
const pandoc = pandocBul();
if (!pandoc) {
  const arananYol = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "pandoc", process.platform === "win32" ? "pandoc.exe" : "pandoc");
  hata(process.platform === "win32"
    ? `pandoc bulunamadı. Kurulum: \`winget install --id JohnMacFarlane.Pandoc\` (sonra terminali yeniden aç) ya da https://github.com/jgm/pandoc/releases zip'inden pandoc.exe'yi \`pandoc/\` klasörüne koy (aranan yol: ${arananYol}); ya da \`--pandoc <yol>\` ver.`
    : `pandoc bulunamadı. Kurulum: \`brew install pandoc\` ya da https://github.com/jgm/pandoc/releases (zip → bin/pandoc) → \`pandoc/\` klasörüne koy (aranan yol: ${arananYol}) ya da \`--pandoc <yol>\` ver.`, 2);
}

// ── çıktı dizini ──
if (fs.existsSync(CIKTI)) {
  const icerik = fs.readdirSync(CIKTI).filter((x) => x !== ".DS_Store");
  if (icerik.length && !icerik.includes("kaynak.html")) hata(`${CIKTI} boş değil ve önceki bir çıkarım değil (kaynak.html yok) — yanlışlıkla silmemek için durduruldu.`);
  fs.rmSync(CIKTI, { recursive: true, force: true });
}
fs.mkdirSync(CIKTI, { recursive: true });

const r = spawnSync(pandoc.yol, [DOCX, "-f", "docx", "-t", "html5", "--math-method=mathml", "--wrap=none", "--extract-media=.", "-o", "kaynak.html"], { cwd: CIKTI, encoding: "utf8" });
if (r.status !== 0) hata(`pandoc başarısız (çıkış ${r.status}):\n${r.stderr}`);
const pandocUyarilari = (r.stderr || "").split("\n").map((s) => s.trim()).filter(Boolean);

const html = fs.readFileSync(path.join(CIKTI, "kaynak.html"), "utf8");
const strip = (s) => entityCoz(s.replace(/<[^>]+>/g, "")).replace(/\s+/g, " ").trim();

// ── yapı özeti ──
const basliklar = [];
for (const m of html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/g)) basliklar.push({ seviye: +m[1], metin: strip(m[2]) });
const say = (re) => (html.match(re) || []).length;
const sayimlar = {
  h1: basliklar.filter((b) => b.seviye === 1).length,
  h2: basliklar.filter((b) => b.seviye === 2).length,
  h3: basliklar.filter((b) => b.seviye === 3).length,
  paragraf: say(/<p\b/g),
  liste_maddesi: say(/<li\b(?![^>]*id="fn)/g),
  tablo: say(/<table\b/g),
  gorsel: say(/<img\b/g),
  blok_formul: say(/<math\b[^>]*display="block"/g),
  satir_ici_formul: say(/<math\b[^>]*display="inline"/g),
  dipnot: say(/<li\b[^>]*id="fn\d+"/g),
  alinti: say(/<blockquote\b/g),
};
const gorseller = [];
for (const m of html.matchAll(/<img\b[^>]*\bsrc="([^"]+)"/g)) {
  const src = entityCoz(m[1]);
  const dosya = path.resolve(CIKTI, src);
  const uz = path.extname(dosya).slice(1).toLowerCase();
  let boyut = null, bayt = 0;
  if (fs.existsSync(dosya)) { const v = fs.readFileSync(dosya); bayt = v.length; boyut = gorselBoyutu(new Uint8Array(v)); }
  gorseller.push({ src, uzanti: uz, bayt, boyut, durum: !fs.existsSync(dosya) ? "dosya yok" : !IZINLI_GORSEL.has(uz) ? "desteklenmiyor → PNG/SVG'ye çevir" : !boyut ? "boyut okunamadı" : bayt > 800 * 1024 ? "büyük (> 800 KB) → küçült/webp" : "uygun" });
}
const uyarilar = [];
if (!sayimlar.h1) uyarilar.push("Belgede Başlık 1 (h1) yok — bölüm ayrımı yapılamaz. Word'de bölüm başlıklarına 'Başlık 1' stili uygula ya da tek bölüm için --bolum NN ile ilerle.");
if (sayimlar.h1 && !sayimlar.h2) uyarilar.push("Başlık 2 yok — İçindekiler yalnız bölüm başlıklarından oluşur.");
for (const g of gorseller) if (g.durum !== "uygun") uyarilar.push(`Görsel ${g.src}: ${g.durum}`);
const numarasiz = basliklar.filter((b) => b.seviye === 1 && !/^\s*\d+/.test(b.metin) && !/^(önsöz|sunuş|teşekkür|giriş|içindekiler|kaynakça|kaynaklar|bibliyografya|ek\b)/iu.test(b.metin));
if (numarasiz.length) uyarilar.push(`Numarasız bölüm başlığı: ${numarasiz.map((b) => `"${b.metin}"`).join(", ")} — NN sıradan verilir; kaynakta numara varsa başlığa yaz.`);
for (const u of pandocUyarilari) uyarilar.push(`pandoc: ${u}`);

const cikarim = { kaynak: path.basename(DOCX), pandoc: pandoc.surum, tarih: new Date().toISOString().slice(0, 10), sayimlar, gorseller, uyarilar };
fs.writeFileSync(path.join(CIKTI, "cikarim.json"), JSON.stringify(cikarim, null, 2) + "\n");

const md = [];
md.push(`# Çıkarım özeti — ${cikarim.kaynak}`, "", `pandoc ${pandoc.surum} · ${cikarim.tarih} · \`${path.relative(process.cwd(), path.join(CIKTI, "kaynak.html"))}\``, "");
md.push("## Başlık ağacı (h1 → bölüm, h2/h3 → İçindekiler)", "");
for (const b of basliklar.filter((x) => x.seviye <= 3)) md.push(`${"  ".repeat(b.seviye - 1)}- ${b.seviye === 1 ? "**" : ""}${b.metin}${b.seviye === 1 ? "**" : ""}`);
if (!basliklar.length) md.push("- (başlık yok)");
md.push("", "## Sayımlar", "", "| Öğe | Adet |", "|---|---:|");
for (const [k, v] of Object.entries(sayimlar)) md.push(`| ${k.replace(/_/g, " ")} | ${v} |`);
md.push("", "## Görseller", "");
if (gorseller.length) {
  md.push("| Dosya | Biçim | Boyut | Bayt | Durum |", "|---|---|---|---:|---|");
  for (const g of gorseller) md.push(`| ${g.src} | ${g.uzanti} | ${g.boyut ? `${g.boyut.width}×${g.boyut.height}` : "?"} | ${g.bayt} | ${g.durum} |`);
} else md.push("- (görsel yok)");
md.push("", "## Uyarılar", "");
md.push(...(uyarilar.length ? uyarilar.map((u) => `- ${u}`) : ["- (yok)"]));
md.push("", "Sonraki adım: `node scripts/kkp/kaynak-donustur.mjs <bu-dizin> <paket-dizini> --kitap \"<ad>\"` (ikinci baskıda `--onceki <önceki-paket-dizini>`).", "");
fs.writeFileSync(path.join(CIKTI, "yapi.md"), md.join("\n"));
console.log(`Çıkarım tamam: ${CIKTI}\n  kaynak.html · media/ (${gorseller.length} görsel) · yapi.md · cikarim.json\n  h1 ${sayimlar.h1} · h2 ${sayimlar.h2} · p ${sayimlar.paragraf} · formül ${sayimlar.blok_formul} blok / ${sayimlar.satir_ici_formul} satır içi · tablo ${sayimlar.tablo} · dipnot ${sayimlar.dipnot}${uyarilar.length ? `\n  UYARI ${uyarilar.length} (yapi.md)` : ""}`);
