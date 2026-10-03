// JSON'dan Bölüm Tekrar (quiz + kavram kartı) — kkp/1 paketine section.kt-tekrar ekler / yeniler (üretimin 3. adımı, mekanik yarısı).
// Soru ve kart metnini Claude kaynağa bağlı yazar (tekrar/bNN.json); bu script id havuzundan id verir, sablon/tekrar-bNN.html yapısını
// programatik kurar (ortak.js motoru sınıf/öznitelik adlarına bağlıdır), manifest icindekiler'e "Bölüm Tekrar → Kavram kartları" işler.
// Quiz fieldset id'si / radio name / JSON "id" bölüm öneklidir (q-bNN-N) — id'ler paket genelinde benzersiz olmalı (kkp-lint KKP-ID-02).
//
//   node scripts/kkp/tekrar-ekle.mjs <paket-dizin> <bNN.json | dizin> [--rapor <dosya.md>] [--en-az-soru 5] [--en-az-kart 8]
//
// Girdi: { "bolum": "b02", "sorular": [{ "soru", "secenekler": [2–8], "dogru": 0-tabanlı, "aciklama"? }], "kartlar": [{ "on", "arka" }] }
// Doğrulama tüm dosyalar için yazmadan önce; hata → çıkış 1 (liste stderr), hiçbir dosya değişmez. Uyarı (yazılır, çıkış 0): soru/kart
// sayısı eşiğin altında; doğru şıkkın metni soru metninde geçiyor. Mevcut section.kt-tekrar yenilenir: aynı tür + aynı normalize metin
// eski id'sini korur, kullanılmayan eski id'ler emekli (havuzda kalır, yeniden verilmez). Yerleşim: section.kt-dipnotlar'dan önce, yoksa sona.
// stdout: "b02: 6 soru · 9 kart · korunan id 12 · yeni id 40 · uyarı 1"; --rapor aynı bilgiler + uyarılar markdown.
import fs from "node:fs";
import path from "node:path";
import { normalize } from "./lib/ortak.mjs";
import { append, attr, blokMetni, bul, bulHepsi, detach, eleman, hasClass, insertBefore, metinDugumu } from "./lib/dom.mjs";
import { bolumBul, bolumKaydet, bolumNo, bolumYukle, icindekilerEkle, icindekilerSil, idHavuzu, manifestOku, manifestYaz } from "./lib/paket.mjs";

// ───────────────────────── Argümanlar ─────────────────────────
const argv = process.argv.slice(2);
const DEGERLI = new Set(["--rapor", "--en-az-soru", "--en-az-kart"]);
const secenek = {};
const konum = [];
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (DEGERLI.has(a)) { secenek[a] = argv[++i]; if (secenek[a] === undefined) hata(`${a} değer ister`, 2); continue; }
  if (a.startsWith("--")) hata(`Bilinmeyen seçenek ${a}`, 2);
  konum.push(a);
}
const [paketArg, girdiArg] = konum;
if (!paketArg || !girdiArg || konum.length > 2) {
  console.error("Kullanım: node scripts/kkp/tekrar-ekle.mjs <paket-dizin> <bNN.json | dizin> [--rapor <dosya.md>] [--en-az-soru 5] [--en-az-kart 8]");
  process.exit(2);
}
function hata(m, kod = 1) { console.error("HATA: " + m); process.exit(kod); }
const PAKET = path.resolve(paketArg);
const GIRDI = path.resolve(girdiArg);
const EN_AZ_SORU = esik("--en-az-soru", 5);
const EN_AZ_KART = esik("--en-az-kart", 8);
function esik(ad, varsayilan) {
  if (secenek[ad] === undefined) return varsayilan;
  const n = Number(secenek[ad]);
  if (!Number.isInteger(n) || n < 0) hata(`${ad} 0 ya da pozitif tam sayı ister: ${secenek[ad]}`, 2);
  return n;
}

let manifest;
try { ({ manifest } = manifestOku(PAKET)); } catch (e) { hata(e.message); }

// ───────────────────────── Girdi dosyaları ─────────────────────────
if (!fs.existsSync(GIRDI)) hata(`girdi yok: ${GIRDI}`);
const dosyalar = fs.statSync(GIRDI).isDirectory()
  ? fs.readdirSync(GIRDI).filter((d) => /\.json$/i.test(d)).sort().map((d) => path.join(GIRDI, d))
  : [GIRDI];
if (!dosyalar.length) hata(`dizinde .json yok: ${GIRDI}`);

// ───────────────────────── Doğrulama (yazmadan önce, hepsi) ─────────────────────────
const metinMi = (s) => typeof s === "string" && s.trim().length > 0;
const duz = (s) => String(s).replace(/\s+/g, " ").trim();
const hatalar = [];
const isler = []; // { dosya, bolum, sorular, kartlar }
const gorulenBolum = new Map();
for (const dosya of dosyalar) {
  const ad = path.basename(dosya);
  const h = (m) => hatalar.push(`${ad}: ${m}`);
  let veri;
  try { veri = JSON.parse(fs.readFileSync(dosya, "utf8")); } catch (e) { h(`JSON okunamadı — ${e.message}`); continue; }
  if (!veri || typeof veri !== "object" || Array.isArray(veri)) { h("kök bir nesne olmalı"); continue; }
  const bolum = typeof veri.bolum === "string" ? bolumBul(manifest, veri.bolum) : null;
  if (!bolum) h(`"bolum" manifest'te yok: ${JSON.stringify(veri.bolum)}`);
  else if (bolum.tur !== "bolum") h(`"bolum" ${veri.bolum} tur "${bolum.tur}" — yalnız tur "bolum" tekrar alır`);
  else if (!fs.existsSync(path.join(PAKET, bolum.dosya))) h(`bölüm dosyası yok: ${bolum.dosya}`);
  else if (gorulenBolum.has(veri.bolum)) h(`"bolum" ${veri.bolum} ${gorulenBolum.get(veri.bolum)} dosyasında da var`);
  else gorulenBolum.set(veri.bolum, ad);
  const sorular = veri.sorular ?? [];
  const kartlar = veri.kartlar ?? [];
  if (!Array.isArray(sorular)) h('"sorular" dizi olmalı');
  if (!Array.isArray(kartlar)) h('"kartlar" dizi olmalı');
  if (Array.isArray(sorular) && Array.isArray(kartlar) && !sorular.length && !kartlar.length) h("en az bir soru ya da kart gerekli");
  if (Array.isArray(sorular)) sorular.forEach((s, i) => {
    const y = `soru ${i + 1}`;
    if (!s || typeof s !== "object") { h(`${y}: nesne olmalı`); return; }
    if (!metinMi(s.soru)) h(`${y}: "soru" boş`);
    const sec = s.secenekler;
    if (!Array.isArray(sec) || sec.length < 2 || sec.length > 8) h(`${y}: "secenekler" 2–8 metin olmalı`);
    else {
      if (!sec.every(metinMi)) h(`${y}: boş seçenek var`);
      else if (new Set(sec.map(normalize)).size !== sec.length) h(`${y}: seçenekler birbirinden farklı olmalı`);
      if (!Number.isInteger(s.dogru) || s.dogru < 0 || s.dogru >= sec.length) h(`${y}: "dogru" 0–${sec.length - 1} arası tam sayı olmalı: ${JSON.stringify(s.dogru)}`);
    }
    if (s.aciklama !== undefined && typeof s.aciklama !== "string") h(`${y}: "aciklama" metin olmalı`);
  });
  if (Array.isArray(kartlar)) kartlar.forEach((k, i) => {
    const y = `kart ${i + 1}`;
    if (!k || typeof k !== "object") { h(`${y}: nesne olmalı`); return; }
    if (!metinMi(k.on)) h(`${y}: "on" boş`);
    if (!metinMi(k.arka)) h(`${y}: "arka" boş`);
  });
  if (bolum && Array.isArray(sorular) && Array.isArray(kartlar)) {
    isler.push({
      dosya: ad, bolum,
      sorular: sorular.map((s) => ({ soru: duz(s.soru ?? ""), secenekler: (s.secenekler ?? []).map(duz), dogru: s.dogru, aciklama: metinMi(s.aciklama) ? duz(s.aciklama) : undefined })),
      kartlar: kartlar.map((k) => ({ on: duz(k.on ?? ""), arka: duz(k.arka ?? "") })),
    });
  }
}
if (hatalar.length) {
  console.error(`HATA: ${hatalar.length} sorun — hiçbir dosya yazılmadı`);
  for (const m of hatalar) console.error("  - " + m);
  process.exit(1);
}

// ───────────────────────── Mekanik ─────────────────────────
const havuz = idHavuzu(PAKET, manifest);
const ktTekrar = (n) => n.tagName === "section" && hasClass(n, "kt-tekrar");
const bosluk = (n) => n?.nodeName === "#text" && !n.value.trim();
/** Eski section'lardan tür|metin → id kuyruğu (aynı metin iki kez geçerse sırayla). Soru p'sinin "N. " öneki bir kez atılır. */
function eskiHarita(eskiler) {
  const harita = new Map();
  const koy = (tur, metin, id) => { if (!id) return; const k = `${tur}|${normalize(metin)}`; (harita.get(k) ?? harita.set(k, []).get(k)).push(id); };
  for (const e of eskiler) {
    for (const n of bulHepsi(e, (x) => x.tagName === "h2" || x.tagName === "h3")) koy("h", blokMetni(n), attr(n, "id"));
    for (const n of bulHepsi(e, (x) => x.tagName === "p" && hasClass(x, "kt-soru"))) koy("p", blokMetni(n).replace(/^\s*\d+\.\s+/, ""), attr(n, "id"));
    for (const n of bulHepsi(e, (x) => x.tagName === "li" && x.parentNode && hasClass(x.parentNode, "kt-secenekler"))) koy("li", blokMetni(n), attr(n, "id"));
    for (const n of bulHepsi(e, (x) => x.tagName === "li" && hasClass(x, "kt-flash-kart"))) {
      const on = bul(n, (x) => x.tagName === "p" && hasClass(x, "kt-flash-on")), arka = bul(n, (x) => x.tagName === "p" && hasClass(x, "kt-flash-arka"));
      koy("li", `${on ? blokMetni(on) : ""} ${arka ? blokMetni(arka) : ""}`, attr(n, "id")); // yeni tarafın anahtarı: `${on} ${arka}`
    }
    for (const n of bulHepsi(e, (x) => x.tagName === "p" && (hasClass(x, "kt-flash-on") || hasClass(x, "kt-flash-arka")))) koy("p", blokMetni(n), attr(n, "id"));
  }
  return harita;
}

const satirlar = [];
const raporSatirlari = [];
for (const is of isler) {
  const { bolum, sorular, kartlar } = is;
  const NN = bolumNo(bolum) ?? bolum.id.replace(/^b/, "");
  const y = bolumYukle(PAKET, bolum);
  const sec = y.sec;

  // (2) eski section: id haritası, silme, manifest'ten eski hedefler
  const eskiler = bulHepsi(sec, ktTekrar);
  const harita = eskiHarita(eskiler);
  for (const e of eskiler) {
    for (const b of bulHepsi(e, (x) => x.tagName === "h2" || x.tagName === "h3")) { const id = attr(b, "id"); if (id) icindekilerSil(manifest, id); }
    const p = e.parentNode;
    const sonraki = p.childNodes[p.childNodes.indexOf(e) + 1];
    if (bosluk(sonraki)) detach(sonraki);
    detach(e);
  }
  let korunan = 0, yeni = 0;
  const idVer = (tur, metin) => {
    const k = `${tur}|${normalize(metin)}`;
    const kuyruk = harita.get(k);
    if (kuyruk?.length) { korunan++; return kuyruk.shift(); }
    yeni++;
    return havuz.uret(tur);
  };
  const el = (tag, attrs, ...cocuklar) => { const n = eleman(tag, attrs); for (const c of cocuklar) append(n, typeof c === "string" ? metinDugumu(c) : c); return n; };
  const satirli = (kap, ...cocuklar) => { for (const c of cocuklar) { append(kap, c); append(kap, metinDugumu("\n")); } return kap; };

  // (3) yeni section — sablon/tekrar-bNN.html yapısı
  const tekrar = el("section", { class: "kt-tekrar", id: `tekrar-b${NN}` });
  append(tekrar, metinDugumu("\n"));
  const h2id = idVer("h", "Bölüm Tekrar");
  satirli(tekrar, el("h2", { id: h2id }, "Bölüm Tekrar"));
  if (sorular.length) {
    const quiz = el("div", { class: "kt-quiz", id: `quiz-b${NN}` });
    append(quiz, metinDugumu("\n"));
    const veri = { tur: "quiz", sorular: [] };
    sorular.forEach((s, i) => {
      const qid = `q-b${NN}-${i + 1}`; // bölüm önekli: id paket genelinde benzersiz (KKP-ID-02); ortak.js sorular[f.id] ile eşler, radio name de aynı
      const fs_ = el("fieldset", { id: qid });
      append(fs_, metinDugumu("\n"));
      satirli(fs_, el("p", { id: idVer("p", s.soru), class: "kt-soru" }, `${i + 1}. ${s.soru}`));
      const ul = el("ul", { class: "kt-secenekler" });
      append(ul, metinDugumu("\n"));
      s.secenekler.forEach((m, j) => satirli(ul, el("li", { id: idVer("li", m) }, el("label", {}, el("input", { type: "radio", name: qid, value: String(j) }), ` ${m}`))));
      satirli(fs_, ul, el("div", { class: "kt-geri-bildirim", "data-kt-dinamik": "" }));
      satirli(quiz, fs_);
      const v = { id: qid, soru: s.soru, secenekler: s.secenekler, dogru: s.dogru };
      if (s.aciklama) v.aciklama = s.aciklama;
      veri.sorular.push(v);
    });
    satirli(quiz,
      el("div", { class: "kt-quiz-kontrol", "data-kt-dinamik": "" }, el("button", { type: "button", class: "kt-quiz-sifirla" }, "Cevapları sıfırla")),
      el("p", { class: "kt-skor", "data-kt-dinamik": "" }));
    satirli(tekrar, quiz, el("script", { type: "application/json", id: `quiz-b${NN}-veri` }, "\n" + JSON.stringify(veri).replace(/</g, "\\u003c") + "\n"));
  }
  let h3id = null;
  if (kartlar.length) {
    h3id = idVer("h", "Kavram kartları");
    satirli(tekrar, el("h3", { id: h3id }, "Kavram kartları"));
    const flash = el("div", { class: "kt-flash", id: `flash-b${NN}` });
    append(flash, metinDugumu("\n"));
    const ol = el("ol", { class: "kt-flash-liste" });
    append(ol, metinDugumu("\n"));
    for (const k of kartlar) {
      satirli(ol, el("li", { class: "kt-flash-kart", id: idVer("li", `${k.on} ${k.arka}`) },
        el("p", { class: "kt-flash-on", id: idVer("p", k.on) }, k.on),
        el("p", { class: "kt-flash-arka", id: idVer("p", k.arka) }, k.arka)));
    }
    const kontrol = el("div", { class: "kt-flash-kontrol", "data-kt-dinamik": "" });
    append(kontrol, metinDugumu("\n"));
    satirli(kontrol,
      el("button", { type: "button", class: "kt-flash-onceki" }, "Önceki"),
      el("button", { type: "button", class: "kt-flash-cevir kt-birincil" }, "Çevir"),
      el("button", { type: "button", class: "kt-flash-sonraki" }, "Sonraki"),
      el("button", { type: "button", class: "kt-flash-karistir" }, "Karıştır"),
      el("span", { class: "kt-flash-sayac" }));
    satirli(flash, ol, kontrol);
    satirli(tekrar, flash);
  }

  // (4) yerleşim: kt-dipnotlar'dan önce, yoksa sona
  const dipnot = bul(sec, (n) => n.tagName === "section" && hasClass(n, "kt-dipnotlar"));
  if (dipnot) { insertBefore(dipnot.parentNode, tekrar, dipnot); insertBefore(dipnot.parentNode, metinDugumu("\n"), dipnot); }
  else { if (!bosluk(sec.childNodes.at(-1))) append(sec, metinDugumu("\n")); append(sec, tekrar); append(sec, metinDugumu("\n")); }

  // (5) manifest icindekiler
  const madde = { baslik: "Bölüm Tekrar", hedef: h2id };
  if (h3id) madde.alt = [{ baslik: "Kavram kartları", hedef: h3id }];
  const h1 = bul(sec, (n) => n.tagName === "h1");
  icindekilerEkle(manifest, bolum.id, madde, h1 ? attr(h1, "id") : undefined);

  // (6) yaz
  bolumKaydet(y);

  // (7) uyarılar + özet
  const uyarilar = [];
  if (sorular.length < EN_AZ_SORU) uyarilar.push(`soru sayısı ${sorular.length} < ${EN_AZ_SORU}`);
  if (kartlar.length < EN_AZ_KART) uyarilar.push(`kart sayısı ${kartlar.length} < ${EN_AZ_KART}`);
  sorular.forEach((s, i) => {
    const d = normalize(s.secenekler[s.dogru]);
    if (normalize(s.soru).includes(d)) uyarilar.push(`soru ${i + 1}: doğru şıkkın metni ("${s.secenekler[s.dogru]}") soru metninde geçiyor`);
  });
  const ozet = `${bolum.id}: ${sorular.length} soru · ${kartlar.length} kart · korunan id ${korunan} · yeni id ${yeni} · uyarı ${uyarilar.length}`;
  satirlar.push({ ozet, uyarilar });
  raporSatirlari.push(`- **${ozet}** (${is.dosya} → ${bolum.dosya})`);
  for (const u of uyarilar) raporSatirlari.push(`  - uyarı: ${u}`);
}
manifestYaz(PAKET, manifest);

for (const s of satirlar) {
  console.log(s.ozet);
  for (const u of s.uyarilar) console.log(`  uyarı: ${u}`);
}
if (secenek["--rapor"]) {
  const rapor = path.resolve(secenek["--rapor"]);
  fs.mkdirSync(path.dirname(rapor), { recursive: true });
  fs.writeFileSync(rapor, `# Bölüm Tekrar raporu\n\nPaket: ${PAKET}\nGirdi: ${GIRDI}\n\n${raporSatirlari.join("\n")}\n`);
  console.log(`rapor: ${rapor}`);
}
