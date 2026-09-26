// Kaynak envanteri (tarayıcısız, statik): hazır HTML kitabın dosyaları, giriş sayfası, yükleme sırası, kabuk imzaları, JS'teki yasak
// API'ler, satır içi script/style, base64 görseller, dış adresler, gömülü belgeler, dipnot/modal/detay izleri. Etkileşim envanterini
// (kural 3) hocayla doldurmadan önce agent'ın gerçekleri görmesi için. Çıktı: markdown (stdout) + <kaynak>/../envanter.json.
//   node envanter.mjs <kaynak-dizin> [--giris kitap.html] [--json cikti.json]
import fs from "node:fs";
import path from "node:path";
import { jsTara, CHR_RE, stilSirasi, scriptSirasi, satirIciStiller, satirIciScriptler } from "./kkp-araclar.mjs";

const arg = process.argv.slice(2);
const KAYNAK = arg.find((a) => !a.startsWith("--") && !arg[arg.indexOf(a) - 1]?.startsWith("--"));
if (!KAYNAK) { console.error("kullanım: node envanter.mjs <kaynak-dizin> [--giris kitap.html] [--json cikti.json]"); process.exit(2); }
const sec = (ad) => { const i = arg.indexOf(ad); return i >= 0 ? arg[i + 1] : undefined; };
const KOK = path.resolve(KAYNAK);

function gez(d, liste = []) { for (const ad of fs.readdirSync(d)) { const t = path.join(d, ad); const st = fs.statSync(t); if (st.isDirectory()) { if (ad !== "node_modules" && ad !== ".git") gez(t, liste); } else liste.push({ rel: path.relative(KOK, t).split(path.sep).join("/"), boyut: st.size }); } return liste; }
const dosyalar = gez(KOK);
const uz = (r) => path.extname(r).toLowerCase();
const KB = 1024;
const grup = {};
for (const d of dosyalar) (grup[uz(d.rel) || "(uzantısız)"] ??= { n: 0, boyut: 0 }).n++, (grup[uz(d.rel) || "(uzantısız)"].boyut += d.boyut);

// giriş sayfası: verilen ya da en çok <link rel=stylesheet> taşıyan kök HTML
const htmlDosyalari = dosyalar.filter((d) => /\.html?$/i.test(d.rel));
let giris = sec("--giris");
if (!giris) { let enIyi = null, enCok = -1; for (const d of htmlDosyalari.filter((x) => !x.rel.includes("/"))) { const n = stilSirasi(fs.readFileSync(path.join(KOK, d.rel), "utf8")).length; if (n > enCok) { enCok = n; enIyi = d.rel; } } giris = enIyi || htmlDosyalari[0]?.rel; }
const girisHtml = giris && fs.existsSync(path.join(KOK, giris)) ? fs.readFileSync(path.join(KOK, giris), "utf8") : "";
const say = (re, s) => (s.match(re) || []).length;

const rapor = {
  kaynak: KOK, dosyaSayisi: dosyalar.length, toplamKB: Math.round(dosyalar.reduce((a, b) => a + b.boyut, 0) / KB),
  uzantilar: Object.fromEntries(Object.entries(grup).map(([k, v]) => [k, { n: v.n, kb: Math.round(v.boyut / KB) }])),
  giris, girisKB: Math.round(girisHtml.length / KB),
  stilSirasi: stilSirasi(girisHtml), scriptSirasi: scriptSirasi(girisHtml),
  satirIciStil: satirIciStiller(girisHtml).map((s) => ({ ad: s.ad, kb: Math.round(s.css.length / KB) })),
  satirIciScript: satirIciScriptler(girisHtml).map((s) => ({ ad: s.ad, tip: s.tip, kb: Math.round(s.js.length / KB) })),
  kabuk: { serviceWorker: dosyalar.some((d) => /(^|\/)sw\.js$/.test(d.rel)), webmanifest: dosyalar.some((d) => /\.webmanifest$/.test(d.rel)), chrImzasiCss: 0, chrImzasiHtml: say(/class="[^"]*\breader-[\w-]+/g, girisHtml) },
  html: {
    birimAdaylari: Object.entries({ ".reading-unit": say(/class="[^"]*\breading-unit\b/g, girisHtml), "section[id]": say(/<section\b[^>]*\bid="/g, girisHtml), "article": say(/<article\b/g, girisHtml), "main": say(/<main\b/g, girisHtml), "h1": say(/<h1\b/g, girisHtml), "h2": say(/<h2\b/g, girisHtml) }).filter(([, n]) => n > 0),
    math: say(/<math\b/g, girisHtml), img: say(/<img\b/g, girisHtml), figure: say(/<figure\b/g, girisHtml), table: say(/<table\b/g, girisHtml), details: say(/<details\b/g, girisHtml), dialog: say(/<dialog\b/g, girisHtml), iframe: say(/<iframe\b/g, girisHtml), svg: say(/<svg\b/g, girisHtml),
    dipnotIzi: say(/data-footnote=|class="[^"]*\bfn-ref\b|class="[^"]*\bfootnote/g, girisHtml), modalIzi: say(/class="[^"]*\b(?:modal|overlay|lightbox)\b/g, girisHtml),
    base64Buyuk: (girisHtml.match(/data:image\/[a-z]+;base64,[A-Za-z0-9+/=]{5400,}/g) || []).length,
    disAdres: [...new Set([...girisHtml.matchAll(/(?:src|href)="(https?:\/\/[^"/]+)/g)].map((m) => m[1]))].slice(0, 20),
    onOlay: say(/\son[a-z]+="/g, girisHtml), buyukHarfId: say(/(?<![\w-])id="[^"]*[A-Z]/g, girisHtml),
    iframeSrc: [...girisHtml.matchAll(/<iframe[^>]*\b(?:src|data-src)="([^"]+)"/g)].map((m) => m[1]).slice(0, 20),
  },
  js: [], css: [], medya: { emf: dosyalar.filter((d) => /\.(emf|wmf)$/i.test(d.rel)).length, buyuk: dosyalar.filter((d) => /\.(png|jpe?g|gif|webp|svg)$/i.test(d.rel) && d.boyut >= 800 * KB).map((d) => `${d.rel} (${Math.round(d.boyut / KB)} KB)`) },
};
for (const d of dosyalar.filter((x) => /\.(m?js)$/i.test(x.rel))) {
  const js = fs.readFileSync(path.join(KOK, d.rel), "utf8");
  const t = jsTara(js);
  const sayim = {}; for (const y of t.yasak) sayim[y.ad] = (sayim[y.ad] || 0) + 1;
  rapor.js.push({ dosya: d.rel, kb: Math.round(d.boyut / KB), yasak: sayim, uyari: [...new Set(t.uyari.map((u) => u.ad.split(" — ")[0]))], bodyEkleme: (js.match(/document\.body\.(?:append|appendChild|prepend)/g) || []).length, dialog: (js.match(/createElement\(['"]dialog['"]\)|showModal\(/g) || []).length, domContentLoaded: /DOMContentLoaded/.test(js), clickHandler: (js.match(/addEventListener\(['"]click['"]/g) || []).length });
}
for (const d of dosyalar.filter((x) => /\.css$/i.test(x.rel))) {
  const css = fs.readFileSync(path.join(KOK, d.rel), "utf8");
  const chr = (css.match(/[^{}]+\{/g) || []).filter((s) => CHR_RE.test(s)).length;
  rapor.kabuk.chrImzasiCss += chr;
  rapor.css.push({ dosya: d.rel, kb: Math.round(d.boyut / KB), kural: (css.match(/\{/g) || []).length, media: (css.match(/@media/g) || []).length, fixed: (css.match(/position\s*:\s*(?:fixed|sticky)/g) || []).length, important: (css.match(/!important/g) || []).length, idSecici: (css.match(/(?:^|[\s,>+~])#[A-Za-z][\w-]*/g) || []).length, tema: (css.match(/body\.dark|\[data-theme|body\.sepia|prefers-color-scheme/g) || []).length, chr, disUrl: (css.match(/url\(\s*["']?https?:/g) || []).length });
}

const jsonYolu = sec("--json") || path.join(path.dirname(KOK), path.basename(KOK) + "-envanter.json");
fs.writeFileSync(jsonYolu, JSON.stringify(rapor, null, 1));

const md = [];
md.push(`# Kaynak envanteri — ${path.basename(KOK)}`, "", `Dosya: ${rapor.dosyaSayisi} (${rapor.toplamKB} KB) · uzantılar: ${Object.entries(rapor.uzantilar).map(([k, v]) => `${k} ${v.n}`).join(", ")}`, "");
md.push(`## Giriş sayfası: \`${giris || "(bulunamadı)"}\` (${rapor.girisKB} KB)`, `- stylesheet sırası (${rapor.stilSirasi.length}): ${rapor.stilSirasi.join(", ") || "-"}`, `- script sırası (${rapor.scriptSirasi.length}): ${rapor.scriptSirasi.join(", ") || "-"}`, `- satır içi style: ${rapor.satirIciStil.map((s) => `${s.ad} ${s.kb} KB`).join(", ") || "yok"} · satır içi script: ${rapor.satirIciScript.map((s) => `${s.ad}${s.tip ? " [" + s.tip + "]" : ""} ${s.kb} KB`).join(", ") || "yok"}`, "");
md.push("## Kabuk izleri (kural 4)", `- service worker: ${rapor.kabuk.serviceWorker ? "VAR (sw.js — pakete girmez)" : "yok"} · webmanifest: ${rapor.kabuk.webmanifest ? "VAR (girmez)" : "yok"} · CSS'te kabuk imzalı kural (.reader-*/#reader-toolbar/.probar): ${rapor.kabuk.chrImzasiCss} · HTML'de .reader-* sınıfı: ${rapor.kabuk.chrImzasiHtml}`, "");
md.push("## HTML (giriş sayfası, statik — tarayıcıdaki DOM farklı olabilir → pişirme)", `- birim adayları: ${rapor.html.birimAdaylari.map(([s, n]) => `${s}: ${n}`).join(" · ") || "-"}`, `- math ${rapor.html.math} · img ${rapor.html.img} · figure ${rapor.html.figure} · table ${rapor.html.table} · details ${rapor.html.details} · dialog ${rapor.html.dialog} · iframe ${rapor.html.iframe} · svg ${rapor.html.svg}`, `- dipnot izi: ${rapor.html.dipnotIzi} · modal/overlay izi: ${rapor.html.modalIzi} · base64 görsel ≥ 4 KB: ${rapor.html.base64Buyuk} · on*= olay özniteliği: ${rapor.html.onOlay} · büyük harfli id: ${rapor.html.buyukHarfId}`, `- iframe src: ${rapor.html.iframeSrc.join(", ") || "-"} · dış adres: ${rapor.html.disAdres.join(", ") || "-"}`, "");
md.push("## JS dosyaları (doğrulayıcı METİN tarar: yorum/dize dahil)", "| dosya | KB | yasak API (KKP-JS-02) | uyarı | body'ye ekleme | dialog | click |", "|---|---|---|---|---|---|---|");
for (const j of rapor.js) md.push(`| ${j.dosya} | ${j.kb} | ${Object.entries(j.yasak).map(([k, v]) => `${k}×${v}`).join(", ") || "temiz"} | ${j.uyari.join("; ") || "-"} | ${j.bodyEkleme} | ${j.dialog} | ${j.clickHandler} |`);
md.push("", "## CSS dosyaları", "| dosya | KB | kural | @media | fixed/sticky | !important | #id seçici | tema kancası | kabuk imzası | dış url |", "|---|---|---|---|---|---|---|---|---|---|");
for (const c of rapor.css) md.push(`| ${c.dosya} | ${c.kb} | ${c.kural} | ${c.media} | ${c.fixed} | ${c.important} | ${c.idSecici} | ${c.tema} | ${c.chr} | ${c.disUrl} |`);
md.push("", `## Medya: EMF/WMF ${rapor.medya.emf} (pakete girmez) · ≥ 800 KB görsel: ${rapor.medya.buyuk.join(", ") || "yok"}`, "", `JSON: ${jsonYolu}`);
console.log(md.join("\n"));
