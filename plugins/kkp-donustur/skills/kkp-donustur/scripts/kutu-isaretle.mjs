#!/usr/bin/env node
// kkp/1 paketinde blokları kart ailesinden bir kutuya sarar ya da mevcut kutunun türünü değiştirir — 3. adım aracı (Plan 35; skill:
// .claude/skills/kkp-kitap-uret). HTML elle yazılmaz: hangi blokların hangi tür kutu olacağını sen söylersin, sarmayı ve id'leri araç yapar.
//
//   node scripts/kkp/kutu-isaretle.mjs <paket-dizin> <spec.json | dizin>
//
// Dizin verilirse içindeki her *.json ad sırasıyla işlenir. Dosya tek spec ya da spec listesi taşır:
//   { "bolum": "b02",
//     "bloklar": ["p0012", "p0013"],   // ARDIŞIK bloklar (bölümün doğrudan çocukları; li/td id'si kendi listesine/tablosuna çıkar)
//                                      // ya da tek bir mevcut kutu/kart id'si: ["kutu0004"] → yalnız türü/etiketi değişir
//     "tur": "tanim",                  // tanim kural uyari not ornek ozet ipucu hata sonuc karsilastirma olay kazanim teorem alistirma cozum
//                                      // null → tür kalkar (türsüz kutu)
//     "etiket": "Tanım" }              // isteğe bağlı: kutunun başına gerçek metin olarak p.kt-kutu-etiket (varsa metni değişir).
//                                      // Kaynak zaten "Örnek 3:" diye başlıyorsa etiket VERME — o satır etikettir.
// Önce TÜM spec'ler bellekte uygulanır (hata → çıkış 1, liste stderr'e, hiçbir dosyaya dokunulmaz); sonra değişen bölümler yazılır.
// Yeni kutu: div.kt-kutu.kt-kutu--<tur>#kutuNNNN — id havuzdan; içine alınan blokların id'leri DEĞİŞMEZ (not ve yer imleri kopmaz).
// Yeniden koşmak güvenlidir: bloklar zaten aynı kutudaysa yeni kutu açılmaz, yalnız tür/etiket güncellenir.
// Başlık (h1–h6), Bölüm Tekrar ve dipnot bölümü kutuya alınmaz. Çıkış: 0 başarı · 1 doğrulama/paket hatası · 2 kullanım hatası.
// stdout: "b02: kutu0017 [tanim] yeni — p0012, p0013" · "b02: kutu0004 [uyari] güncellendi".
import fs from "node:fs";
import path from "node:path";
import { addClass, append, attr, byId, classes, eleman, hasClass, insertBefore, kids, metinDugumu, setAttr } from "./lib/dom.mjs";
import { bolumBul, bolumKaydet, bolumYukle, idHavuzu, manifestOku } from "./lib/paket.mjs";
import { KART_TURLERI } from "./lib/set.mjs";

const KULLANIM = "kullanım: node scripts/kkp/kutu-isaretle.mjs <paket-dizin> <spec.json | dizin>";
function hata(mesaj, kod = 1) { console.error(mesaj); process.exit(kod); }

const argv = process.argv.slice(2);
for (const a of argv) if (a.startsWith("--")) hata(`Bilinmeyen seçenek ${a}\n${KULLANIM}`, 2);
const [paket, specArg] = argv;
if (!paket || !specArg || argv.length > 2) hata(KULLANIM, 2);

// ───────────────────────── Girdi ─────────────────────────
let manifest;
try { ({ manifest } = manifestOku(paket)); } catch (e) { hata(e.message); }
if (!fs.existsSync(specArg)) hata(`spec yok: ${specArg}`);
const dosyalar = fs.statSync(specArg).isDirectory()
  ? fs.readdirSync(specArg).filter((a) => a.endsWith(".json")).sort().map((a) => path.join(specArg, a))
  : [specArg];
if (!dosyalar.length) hata(`dizinde *.json yok: ${specArg}`);
const specler = [];
for (const d of dosyalar) {
  let j;
  try { j = JSON.parse(fs.readFileSync(d, "utf8")); } catch (e) { hata(`${path.basename(d)}: JSON okunamadı (${e.message})`); }
  for (const s of Array.isArray(j) ? j : [j]) specler.push({ ...s, _dosya: path.basename(d) });
}

// ───────────────────────── Uygula (bellekte) ─────────────────────────
const havuz = idHavuzu(paket, manifest);
const yuklu = new Map(); // bölüm id → bolumYukle sonucu
const degisen = new Set();
const hatalar = [];
const satirlar = [];
const kutuMu = (n) => n.tagName === "div" && hasClass(n, "kt-kutu") && !hasClass(n, "kt-etkilesim-istegi");
const kartMi = (n) => n.tagName === "details" && hasClass(n, "kt-kart");
const etiketMi = (n) => n.tagName === "p" && hasClass(n, "kt-kutu-etiket");
const yasakMi = (n) => /^h[1-6]$/.test(n.tagName) || (n.tagName === "section" && (hasClass(n, "kt-tekrar") || hasClass(n, "kt-dipnotlar")));

specler.forEach((s, sira) => {
  const yer = `${s._dosya} #${sira + 1}`;
  const sorun = (m) => { hatalar.push(`${yer}: ${m}`); };
  if (typeof s.bolum !== "string") return sorun('"bolum" zorunlu');
  const bolum = bolumBul(manifest, s.bolum);
  if (!bolum) return sorun(`bölüm '${s.bolum}' manifest'te yok`);
  if (!Array.isArray(s.bloklar) || !s.bloklar.length || s.bloklar.some((b) => typeof b !== "string")) return sorun('"bloklar" boş olmayan id listesi olmalı');
  if (s.tur !== null && !KART_TURLERI.includes(s.tur)) return sorun(`tür '${s.tur}' yok; türler: ${KART_TURLERI.join(", ")} (türü kaldırmak için null)`);
  if (s.etiket !== undefined && (typeof s.etiket !== "string" || !s.etiket.trim())) return sorun('"etiket" boş olmayan metin olmalı (istemiyorsan alanı yazma)');

  let y = yuklu.get(bolum.id);
  if (!y) {
    try { y = bolumYukle(paket, bolum); } catch (e) { return sorun(e.message); }
    yuklu.set(bolum.id, y);
  }
  const dugumler = [];
  for (const id of s.bloklar) {
    const n = byId(y.sec, id);
    if (!n) return sorun(`'${id}' ${bolum.id} bölümünde yok`);
    dugumler.push(n);
  }

  // hedef: mevcut kutu/kart ya da sarılacak ardışık bloklar
  let hedef = null;
  let yeni = false;
  if (dugumler.length === 1 && (kutuMu(dugumler[0]) || kartMi(dugumler[0]))) hedef = dugumler[0];
  else {
    const ust = dugumler.map((n) => { let x = n; while (x.parentNode && x.parentNode !== y.sec) x = x.parentNode; return x; });
    if (ust.some((x) => x.parentNode !== y.sec)) return sorun("bloklar bölümün içinde değil");
    const tekil = [...new Set(ust)];
    if (tekil.length === 1 && (kutuMu(tekil[0]) || kartMi(tekil[0])) && !dugumler.includes(tekil[0])) {
      // bloklar zaten bir kutunun içinde: yeniden koşu — kutunun (etiket dışındaki) bütün blokları verilmiş olmalı
      const kutu = tekil[0];
      const icerik = kids(kutu).filter((c) => !etiketMi(c));
      const verilen = new Set(dugumler.map((n) => { let x = n; while (x.parentNode !== kutu) x = x.parentNode; return x; }));
      if (icerik.length !== verilen.size || icerik.some((c) => !verilen.has(c))) return sorun(`bloklar ${attr(kutu, "id")} kutusunun içinde ama kutunun tamamı değil — kutunun id'sini ver`);
      hedef = kutu;
    } else {
      const kotu = tekil.find((x) => yasakMi(x) || kutuMu(x) || kartMi(x) || hasClass(x, "kt-etkilesim-istegi"));
      if (kotu) return sorun(`'${attr(kotu, "id") ?? kotu.tagName}' kutuya alınamaz (başlık, Bölüm Tekrar, dipnot ya da başka bir kutu/kart)`);
      const cocuklar = kids(y.sec);
      const dizinler = tekil.map((x) => cocuklar.indexOf(x)).sort((a, b) => a - b);
      for (let i = dizinler[0]; i <= dizinler[dizinler.length - 1]; i++) if (!tekil.includes(cocuklar[i])) return sorun(`bloklar ardışık değil: arada '${attr(cocuklar[i], "id") ?? cocuklar[i].tagName}' var`);
      hedef = eleman("div", { class: "kt-kutu", id: havuz.uret("kutu") });
      insertBefore(y.sec, hedef, cocuklar[dizinler[0]]);
      for (const i of dizinler) append(hedef, cocuklar[i]);
      yeni = true;
    }
  }
  if (s.etiket !== undefined && kartMi(hedef)) return sorun(`${attr(hedef, "id")} açılır karttır; etiketi özet satırıdır (summary) — "etiket" verme`);

  // tür
  setAttr(hedef, "class", classes(hedef).filter((c) => !c.startsWith("kt-kutu--")).join(" "));
  if (s.tur) addClass(hedef, `kt-kutu--${s.tur}`);
  // etiket
  if (s.etiket !== undefined) {
    let e = kids(hedef).find(etiketMi);
    if (!e) {
      e = eleman("p", { class: "kt-kutu-etiket", id: havuz.uret("p") });
      if (hedef.childNodes.length) insertBefore(hedef, e, hedef.childNodes[0]); else append(hedef, e);
    }
    e.childNodes = [];
    append(e, metinDugumu(s.etiket.trim()));
  }
  degisen.add(bolum.id);
  satirlar.push(`${bolum.id}: ${attr(hedef, "id")} [${s.tur ?? "türsüz"}] ${yeni ? `yeni — ${s.bloklar.join(", ")}` : "güncellendi"}`);
});

if (hatalar.length) hata("kutu-isaretle: hiçbir dosyaya dokunulmadı\n  " + hatalar.join("\n  "));

// ───────────────────────── Yaz ─────────────────────────
for (const id of degisen) bolumKaydet(yuklu.get(id));
console.log(satirlar.join("\n"));
