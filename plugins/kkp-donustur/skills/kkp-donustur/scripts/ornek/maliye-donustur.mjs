// ÖRNEK — kitaba özel dönüşüm script'i: "Maliye Politikası" (Prof. Dr. Güner Tuncer, ChatGPT ile yapılmış tek sayfalık kitap, 2026).
// Kütüphane fonksiyonlarıyla (../kkp-araclar.mjs) kurulmuştur; kendi kitabın için kopyala ve KİTABA ÖZEL yerleri değiştir
// (bölüm sınırları, katman dosyaları, dipnot deseni, gömülü uygulamalar, kabuk davranışları). Sonuç: okuyucuda kaynakla eleman
// eleman eşit (1. bölüm 1754/1749), kkp-lint 0 hata.
//
//   node maliye-donustur.mjs <kaynak-dizin> <pismis-dizin> <cikti-dizin>
//   (önce: node ../pisir.mjs <kaynak-dizin> <pismis-dizin> --giris kitap.html --birim ".reading-unit"
//           --engelle "learning-modals|maliye-interactions|maliye-compat|maliye-blue-home|maliye-economic-actors|sw\.js"
//           --temizle ".chapter-learning-panel,.reader-note-anchor,[data-reference-return],[data-collapse-key],[data-ready]" --sinif-ekle active)
import fs from "node:fs";
import path from "node:path";
import { KITAPPTA_CSS_EK, basliklariNumarala, bodyEklemeDuzelt, bolumSayfasi, cssBirlestir, dipnotlariDonustur, embedDialog, embedTasi, icindekilerKur, idKucult, jsTara, kabukCekirdegi, kacir, kopyala, manifestKur, medyaReferanslari, oku, postMessageSil, referanslariGuncelle, satirIciScriptler, satirIciStiller, stilSirasi, yaz } from "../kkp-araclar.mjs";

const [, , KAYNAK, PISMIS, OUT] = process.argv;
if (!KAYNAK || !PISMIS || !OUT) { console.error("kullanım: node maliye-donustur.mjs <kaynak-dizin> <pismis-dizin> <cikti-dizin>"); process.exit(2); }
const rapor = [];
const not = (s) => { rapor.push(s); console.log("• " + s); };
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const kitapHtml = oku(path.join(KAYNAK, "kitap.html"));
const ozet = JSON.parse(oku(path.join(PISMIS, "_ozet.json")));
const basliklar = JSON.parse(oku(path.join(PISMIS, "_basliklar.json")));
const birimler = ozet.birimler.map((b) => ({ ...b, html: oku(path.join(PISMIS, b.dosya)) }));

/* ---- 1. bölümler (KİTABA ÖZEL: birim id'lerinden) ---- */
const bolumTanim = [
  { id: "b00", dosya: "00-onsoz.html", baslik: "Başlangıç", tur: "on", sec: (u) => u.id === "unit-intro", ekSinif: "preface-body-two-boxes" },
  { id: "b01", dosya: "01-makroekonomik-temel-bilgiler.html", baslik: "BİRİNCİ BÖLÜM – MAKROEKONOMİK TEMEL BİLGİLER", tur: "bolum", sec: (u) => /^unit-sec-1(-|$)/.test(u.id) },
  { id: "b02", dosya: "02-maliye-politikasina-giris.html", baslik: "İKİNCİ BÖLÜM – MALİYE POLİTİKASINA GİRİŞ", tur: "bolum", sec: (u) => /^unit-sec-2(-|$)/.test(u.id) },
  { id: "b03", dosya: "03-maliye-politikasinda-temel-bilgiler.html", baslik: "ÜÇÜNCÜ BÖLÜM – MALİYE POLİTİKASINDA TEMEL BİLGİLER", tur: "bolum", sec: (u) => /^unit-sec-3(-|$)/.test(u.id) },
  { id: "b04", dosya: "04-farkli-bir-bakis-acisi-gelistirmek.html", baslik: "DÖRDÜNCÜ BÖLÜM – FARKLI BİR BAKIŞ AÇISI GELİŞTİRMEK", tur: "bolum", sec: (u) => /^unit-sec-4(-|$)/.test(u.id) },
  { id: "b90", dosya: "90-kaynakca.html", baslik: "KAYNAKLAR", tur: "kaynakca", sec: (u) => u.id === "unit-references" },
];
const atanan = new Set();
for (const b of bolumTanim) { b.birimler = birimler.filter(b.sec); b.birimler.forEach((u) => atanan.add(u.id)); }
const disarida = birimler.filter((u) => !atanan.has(u.id)).map((u) => u.id);
if (disarida.some((id) => id !== "unit-home")) throw new Error("beklenmeyen birim dışarıda: " + disarida.join(","));
not(`bölümler: ${bolumTanim.map((b) => `${b.id}:${b.birimler.length}`).join(" ")} · atılan: unit-home (kabuğun kapak sayfası)`);

/* ---- 2. dipnot metinleri JS'te (compat.js FOOTNOTES) — içerik JS'te kaybolamaz ---- */
const compat = oku(path.join(KAYNAK, "maliye-compat.v1.js"));
const FOOTNOTES = JSON.parse(compat.match(/const FOOTNOTES=(\{[\s\S]*?\});\n/)[1]);

/* ---- 3. gömülü uygulamalar (KİTABA ÖZEL): kaynakta modalda açılanlar modalda, satır içi olan satır içi ---- */
const EMBEDLER = [
  // yükseklikler ölçüldü: node ../embed-yukseklik.mjs <paket> assets/embed/… --genislik 1000
  { anahtar: "iktisadi-akim", fig: /aria-label="Şekil 1\.1 — Mal Piyasası ve Faktör Piyasası"/, src: "assets/embed/iktisadi-akim.html", baslik: "Şekil 1.1 — Mal Piyasası ve Faktör Piyasası", h: 882 },
  { anahtar: "mp-fig-047", fig: /data-figure-id="mp-fig-047"/, src: "assets/embed/bolgesel-gelismislik.html", baslik: "Görsel 3.2 — Bölgesel Gelişmişlik ve Maliye Politikası", h: 820 },
  { anahtar: "mp-fig-049", fig: /data-figure-id="mp-fig-049"/, src: "assets/embed/dunya-uretim-paylari.html", baslik: "Görsel 3.3 — 2014 Dünya Üretim Payları", h: 1216 },
];
// hocanın kendi modal sınıfları (mp-lab mp-lab-external) — CSS'i olduğu gibi çalışır
const dialogSecenek = { dialogSinif: "mp-lab mp-lab-external", basSinif: "mp-lab-head", govdeSinif: "mp-lab-external-body", iframeSinif: "mp-lab-external-frame", ustYazi: "ETKİLEŞİMLİ KEŞİF" };

/* ---- 4. bölüm HTML'leri ---- */
const sayac = { n: 0 }, harita = new Map(), idHaritasi = new Map(), medya = new Set(), bolumHtml = new Map(), plan = {};
let dipnotToplam = 0, embedSayisi = 0;
for (const b of bolumTanim) {
  let govde = b.birimler.map((u) => u.html).join("\n");
  // kabuk kalıntıları: boş kaynakça araç çubuğu, dış "tam ekranda aç" bağlantısı
  govde = govde.replace(/<div class="reference-catalog-tools">[\s\S]*?<\/div><\/div>/g, "").replace(/<div class="reference-catalog"><\/div>/g, "");
  govde = govde.replace(/<a href="assets\/interactive\/[^"]*"[^>]*target="_blank"[^>]*>[^<]*<\/a>/g, "");
  // dipnot: <button class="fn-ref" data-footnote="N">N</button> → kkp dipnotu
  const dn = dipnotlariDonustur(govde, { desen: /<button aria-label="Dipnot (\d+)" class="fn-ref" data-footnote="\d+" type="button">\d+<\/button>/g, metinler: FOOTNOTES });
  govde = dn.html; dipnotToplam += dn.nolar.length;
  // HDI: kaynakta satır içi iframe → assets/embed/hdi.html (yükseklik embed-yukseklik.mjs ile ölçüldü: 820)
  govde = govde.replace(/<iframe class="interactive-frame"[^>]*src="assets\/interactive\/human-development\/hdi\.html"[^>]*title="([^"]*)"[^>]*><\/iframe>/g, (_, t) => { embedSayisi++; return `<iframe class="interactive-frame" src="assets/embed/hdi.html" sandbox="allow-scripts" width="960" height="820" loading="lazy" title="${t}"></iframe>`; });
  // modalda açılan üç uygulama: statik dialog figürün hemen ardına
  for (const e of EMBEDLER) {
    const m = e.fig.exec(govde); if (!m) continue;
    const j = govde.indexOf("</figure>", m.index); if (j < 0) throw new Error("figure kapanışı yok: " + e.anahtar);
    govde = govde.slice(0, j + 9) + embedDialog({ anahtar: e.anahtar, baslik: e.baslik, src: e.src, yukseklik: e.h, ...dialogSecenek }) + govde.slice(j + 9);
    embedSayisi++;
  }
  if (/assets\/interactive\//.test(govde)) throw new Error("assets/interactive kalıntısı: " + b.dosya);
  // id'ler: küçük harf, başlıklar hNNNN, referanslar güncel; hocanın Şekil 1.1 düğmesi kartı/dialogu açar (id küçüldü → veri özniteliği)
  govde = idKucult(govde);
  const bn = basliklariNumarala(govde, sayac, harita); govde = referanslariGuncelle(bn.html, harita);
  govde = govde.replace(/<button([^>]*)id="openeconomicactorsinteractive"/, '<button$1data-kt-embed-ac="iktisadi-akim" id="openeconomicactorsinteractive"');
  if (b.id === "b01" && !/data-kt-embed-ac="iktisadi-akim"/.test(govde)) throw new Error("Şekil 1.1 etkileşim düğmesi bulunamadı");
  for (const r of medyaReferanslari(govde)) medya.add(r);
  for (const m of govde.matchAll(/ id="([^"]+)"/g)) idHaritasi.set(m[1], idHaritasi.has(m[1]) ? "ÇİFT" : b.dosya);
  bolumHtml.set(b.dosya, { govde, dipnotlar: dn.dipnotlar });
  plan[b.dosya] = b.birimler.map((u) => u.dosya);
}
for (const b of bolumTanim) {
  const { govde, dipnotlar } = bolumHtml.get(b.dosya);
  const h = govde.replace(/href="#([^"]+)"/g, (t, id) => { const d = idHaritasi.get(id); return !d || d === b.dosya || d === "ÇİFT" ? t : `href="${d}#${id}"`; });
  yaz(path.join(OUT, b.dosya), bolumSayfasi({ id: b.id, baslik: b.baslik, kitapAdi: "Maliye Politikası", govde: h, dipnotlar, sarmalayiciAc: '<div class="reader"><div class="paper">', sarmalayiciKapa: "</div></div>", ekSinif: b.ekSinif || "" }));
}
not(`bölüm dosyaları: ${bolumTanim.length} · dipnot ${dipnotToplam} · gömülü ${embedSayisi} · başlık ${sayac.n} (hNNNN)`);

/* ---- 5. medya (yalnız referans edilenler) ---- */
let n = 0;
for (const ref of medya) { const k = path.join(KAYNAK, ref); if (fs.existsSync(k)) { kopyala(k, path.join(OUT, ref)); n++; } else not(`UYARI medya yok: ${ref}`); }
not(`medya: ${n} dosya`);

/* ---- 6. gömülü belgeler: kaynağın assets/interactive/* uygulamaları ---- */
const e1 = embedTasi({ kaynakHtmlYolu: path.join(KAYNAK, "assets/interactive/human-development/hdi.html"), ad: "hdi", paketDizin: OUT });
const e2 = embedTasi({ kaynakHtmlYolu: path.join(KAYNAK, "assets/interactive/economic-actors/economic-actors.html"), ad: "iktisadi-akim", paketDizin: OUT });
const e3 = embedTasi({ kaynakHtmlYolu: path.join(KAYNAK, "assets/interactive/04_turkiye_bolgesel_gelismislik_maliye_politikasi.html"), ad: "bolgesel-gelismislik", paketDizin: OUT });
const e4 = embedTasi({ kaynakHtmlYolu: path.join(KAYNAK, "assets/interactive/05_dunya_gsyh_paylari.html"), ad: "dunya-uretim-paylari", paketDizin: OUT });
for (const e of [e1, e2, e3, e4]) for (const r of e.rapor) { if (r.yasak.length) not(`UYARI ${r.dosya}: yasak API ${r.yasak.slice(0, 3).join("; ")}`); if (r.sozdizimi) throw new Error(`${r.dosya}: söz dizimi hatası — ${r.sozdizimi}`); }
not(`gömülü belgeler: hdi (${e1.rapor.length} dosya), iktisadi-akim (${e2.rapor.length}), bolgesel-gelismislik (${e3.n} görsel dışa), dunya-uretim-paylari (${e4.n} görsel dışa)`);

/* ---- 7. CSS: kaynağın 39 dosyası + satır içi mp318 stili, yükleme sırasıyla, OLDUĞU GİBİ ---- */
{
  const medyaKopyala = (ref) => { const ad = ref.replace(/^(\.\.\/|\.\/)*/, "").replace(/^assets\/media\//, ""); const k = path.join(KAYNAK, "assets/media", ad); if (!fs.existsSync(k)) return null; kopyala(k, path.join(OUT, "assets/media", ad)); return `../media/${ad}`; };
  const ek = KITAPPTA_CSS_EK(".paper") + `
.reader{margin:0!important;max-width:none!important;min-width:0}
.reading-unit{display:block!important}
.interactive-frame{height:820px!important;transition:none!important}
dialog.mp-lab-external:not([open]){display:none}
.mp318-site-dialog{padding:0;border:0;background:transparent;width:min(1220px,96vw);max-width:96vw;height:min(840px,92vh);max-height:92vh;overflow:hidden}
.mp318-site-dialog::backdrop{background:rgba(7,14,24,.86)}
.mp318-site-dialog .mp318-site-shell{height:100%;width:100%}
.mp318-site-modal{display:none}
.chapter-learning-panel{margin:2rem 0}
`;
  const { css, rapor: r } = cssBirlestir({ kaynakDizin: KAYNAK, dosyalar: stilSirasi(kitapHtml), satirIci: satirIciStiller(kitapHtml).filter((s) => s.ad === "mp318-site-styles"), idHaritasi: harita, idSecici: { paper: ".paper", mainReader: ".reader" }, medyaKopyala, ek });
  yaz(path.join(OUT, "assets/css/kitap.css"), css);
  not(`kitap.css ${(css.length / 1024).toFixed(0)} KB — ${r.dosya} dosya + satır içi; atılan yalnız kabuk imzalı ${r.atilanKural}; #id seçicisi yeniden ${r.idSeciciYeniden}; url ${r.yenidenYazilanUrl} yerel / ${r.atilanUrl} dış`);
}

/* ---- 8. JS: çekirdek + kabuk davranışları + çalışma-anı katmanları (yamalı) ---- */
{
  const al = (ad) => oku(path.join(KAYNAK, ad));
  const parca = [kabukCekirdegi()];
  // kabuk davranışları (kaynağın reader.v52.js'inden içerik kısmı; storage/kabuk bağımlılıkları atıldı)
  parca.push(`/* Kabuk davranışları: kart aç/kapa, başlık aç/kapa, pedagojik not */
(function(){'use strict';
  var kok=window.__ktKok();kok.classList.add(typeof window.MathMLElement!=='undefined'?'mp-has-mathml':'mp-no-mathml');
  function headingLevel(h){return +h.tagName.slice(1);}
  function setCardCollapsed(c,collapsed){if(!c)return;c.classList.toggle('is-collapsed',!!collapsed);var b=c.querySelector('.object-card-toggle');if(b){b.textContent=collapsed?'▸ Kapalı':'▾ Açık';}var h=c.querySelector('.object-card-head');if(h){h.setAttribute('aria-expanded',collapsed?'false':'true');h.setAttribute('data-open-state',collapsed?'closed':'open');}}
  function toggleCard(c){if(c)setCardCollapsed(c,!c.classList.contains('is-collapsed'));}
  function cardClickIsInteractive(target){var interactive='a,button,input,select,textarea,label,summary,details,iframe,video,audio,[contenteditable="true"],[role="link"],.reference-inline,.interactive-viz,.interactive-embed,.learning-panel,.learning-modal';if(target.closest(interactive)&&!target.closest('.object-card-head'))return true;var sel=window.getSelection?window.getSelection():null;return !!(sel&&!sel.isCollapsed&&String(sel).trim());}
  function toggleHeading(h){var level=headingLevel(h),hide=h.dataset.collapsed!=='1';h.dataset.collapsed=hide?'1':'0';var btn=h.querySelector('.section-toggle');if(btn){btn.textContent=hide?'⌄':'⌃';btn.setAttribute('aria-expanded',hide?'false':'true');}var n=h.nextElementSibling;while(n){if(/^H[1-4]$/.test(n.tagName)&&headingLevel(n)<=level)break;n.classList.toggle('section-collapsed',hide);n=n.nextElementSibling;}}
  function setNoteCollapsed(card,collapsed){card.classList.toggle('is-collapsed',!!collapsed);var head=card.querySelector('.concept-explanation-head,.editorial-correction-head');if(head){head.setAttribute('aria-expanded',collapsed?'false':'true');head.setAttribute('data-open-state',collapsed?'closed':'open');}var ind=head&&head.querySelector('.note-state-indicator');if(ind)ind.textContent=collapsed?'▸ Kapalı':'▾ Açık';}
  document.addEventListener('click',function(e){
    var st=e.target.closest('.section-toggle');if(st){e.preventDefault();e.stopPropagation();toggleHeading(st.closest('h1,h2,h3,h4'));return;}
    var nh=e.target.closest('.concept-explanation-head,.editorial-correction-head');if(nh){var nc=nh.closest('.concept-explanation-card,.editorial-correction-card');if(nc){e.preventDefault();e.stopPropagation();setNoteCollapsed(nc,!nc.classList.contains('is-collapsed'));return;}}
    var head=e.target.closest('.object-card-head');if(head){var card=head.closest('.content-card');if(card&&!cardClickIsInteractive(e.target)){e.preventDefault();e.stopPropagation();toggleCard(card);}}
  });
  document.addEventListener('keydown',function(e){var head=e.target.closest?e.target.closest('.object-card-head[role="button"]'):null;if(!head)return;if(e.key==='Enter'||e.key===' '){var card=head.closest('.content-card');if(card){e.preventDefault();toggleCard(card);}}});
})();
`);
  // pekiştirme (flash/quiz/doğru-yanlış): panel bölüm sonuna, dialog bölüm içine, kt:hazir
  parca.push(al("learning-data.v201.js").trim() + "\n");
  let lm = al("learning-modals.v201.js");
  const yamala = (kaynakAdi, metin, a, b) => { const var_ = a instanceof RegExp ? a.test(metin) : metin.includes(a); if (!var_) throw new Error(`${kaynakAdi} yaması bulunamadı: ${String(a).slice(0, 60)}`); return metin.replace(a, b); };
  lm = yamala("learning-modals", lm, /function injectPanels\(\)\{[\s\S]*?\n(?=\s*document\.readyState)/, `function injectPanels(){const kok=window.__ktKok();const b=kok.getAttribute('data-kt-bolum')||'';const n=parseInt(b.replace(/^b0?/,''),10);const sectionId='review-ch'+n;if(!DATA[sectionId])return;if(document.getElementById('learning-'+sectionId))return;const anchor=kok.querySelector('.chapter-learning-anchor');const panel=makePanel(sectionId);if(!panel)return;if(anchor)anchor.insertAdjacentElement('afterend',panel);else{const dip=kok.querySelector('.kt-dipnotlar');if(dip)dip.insertAdjacentElement('beforebegin',panel);else kok.append(panel);}}\n`);
  lm = bodyEklemeDuzelt(lm).js.replace("window.__ktKok().appendChild(d);\n", "window.__ktKok().appendChild(d);window.__ktDialogKoru(d);\n");
  lm = yamala("learning-modals", lm, "document.readyState!=='loading'?setTimeout(injectPanels,60):document.addEventListener('DOMContentLoaded',()=>setTimeout(injectPanels,60));", "if(document.readyState!=='loading')injectPanels();else document.addEventListener('DOMContentLoaded',injectPanels,{once:true});document.addEventListener('kt:hazir',injectPanels);");
  parca.push(lm.trim() + "\n");
  // figür laboratuvarları (42 model): figür data-figure-id ile bulunur, dış dosya modalı statik dialogu açar, open( → dersAc(
  parca.push(al("maliye-interactions.v155.data.js").trim() + "\n");
  let it = al("maliye-interactions.v155.js");
  it = yamala("interactions", it, "const lessons=window.MP_LESSONS;let active=null;", "const lessons=window.MP_LESSONS;let active=null;const figurBul=id=>document.querySelector('[data-figure-id=\"'+id+'\"]')||document.getElementById(id);");
  it = yamala("interactions", it, "const source=document.getElementById(id);const dialog=document.createElement('dialog')", "const source=figurBul(id);const dialog=document.createElement('dialog')");
  it = yamala("interactions", it, "Object.entries(lessons).forEach(([id,sp])=>{const f=document.getElementById(id);", "Object.entries(lessons).forEach(([id,sp])=>{const f=figurBul(id);");
  const oef = it.indexOf("function openExternalFile("), oefSon = it.indexOf("\nfunction open(", oef);
  if (oef < 0 || oefSon < 0) throw new Error("openExternalFile bulunamadı");
  it = it.slice(0, oef) + "function kartaGit(id,trigger){if(active)active.close();window.__ktEmbedAc(id,trigger);}" + it.slice(oefSon);
  it = yamala("interactions", it, /function open\(id,trigger\)\{if\(id==='mp-fig-049'\)return openExternalFile\(id,trigger,'[^']+'\);if\(id==='mp-fig-047'\)return openExternalFile\(id,trigger,'[^']+'\);/, "function dersAc(id,trigger){if(id==='mp-fig-049'||id==='mp-fig-047')return kartaGit(id,trigger);");
  it = yamala("interactions", it, "b.addEventListener('click',e=>{e.stopPropagation();open(id,b)})", "b.addEventListener('click',e=>{e.stopPropagation();dersAc(id,b)})");
  it = yamala("interactions", it, "window.MP_INTERACTIVE={open,model,controls,lessons,close:()=>active?.close()};", "window.MP_INTERACTIVE={dersAc,model,controls,lessons,close:()=>active?.close()};");
  it = bodyEklemeDuzelt(it).js;
  it = yamala("interactions", it, "active={close,dialog};dialog.showModal();", "active={close,dialog};window.__ktDialogKoru(dialog);dialog.showModal();");
  it = yamala("interactions", it, "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(init),{once:true});else requestAnimationFrame(init);", "if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>requestAnimationFrame(init),{once:true});else requestAnimationFrame(init);document.addEventListener('kt:hazir',init);");
  parca.push(it.trim() + "\n");
  // compat: görsel büyütme dialogu (dipnot dalı boşta kalır — dipnotlar kkp'ye çevrildi)
  parca.push(bodyEklemeDuzelt(compat).js.trim() + "\n");
  // 3.18 "Dönemleri Keşfet" mini sitesi: satır içi script → dosya, div modal → <dialog>, id'ler → sınıf seçicileri
  {
    let mp = satirIciScriptler(kitapHtml).find((s) => s.ad === "mp318-site-script")?.js;
    if (!mp) throw new Error("mp318-site-script yok");
    const d = (a, b) => { mp = yamala("mp318", mp, a, b); };
    d("const modal=document.getElementById('mp318-site-modal'), openBtn=document.getElementById('mp318-open-site'), closeBtn=document.getElementById('mp318-close-site');\n if(!modal||!openBtn||modal.dataset.ready==='1') return; modal.dataset.ready='1';",
      "const sarma=document.querySelector('.mp318-site-modal'), openBtn=document.getElementById('mp318-open-site'), closeBtn=document.getElementById('mp318-close-site');\n if(!sarma||!openBtn||!closeBtn||sarma.dataset.ready==='1') return; sarma.dataset.ready='1';\n const kabuk=sarma.querySelector('.mp318-site-shell'); const modal=document.createElement('dialog'); modal.className='mp318-site-dialog'; modal.setAttribute('aria-label','Dönemleri Keşfet'); if(kabuk){kabuk.removeAttribute('role');kabuk.removeAttribute('aria-modal');modal.append(kabuk);} sarma.replaceWith(modal); window.__ktDialogKoru(modal); modal.addEventListener('cancel',e=>{e.preventDefault();kapat();});");
    d("function open(){modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); document.body.style.overflow='hidden'; closeBtn.focus();}", "function ac(){if(!modal.open)modal.showModal(); document.body.style.overflow='hidden'; closeBtn.focus();}");
    d("function close(){modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); document.body.style.overflow=''; openBtn.focus();}", "function kapat(){if(modal.open)modal.close(); document.body.style.overflow=''; openBtn.focus();}");
    d("openBtn.addEventListener('click',open); closeBtn.addEventListener('click',close); modal.addEventListener('click',e=>{if(e.target===modal)close();}); document.addEventListener('keydown',e=>{if(e.key==='Escape'&&modal.classList.contains('is-open'))close();});", "openBtn.addEventListener('click',ac); closeBtn.addEventListener('click',kapat); modal.addEventListener('click',e=>{if(e.target===modal)kapat();});");
    d("pbar=document.getElementById('mp318-site-progressbar'), plabel=document.getElementById('mp318-site-progresslabel');", "pbar=modal.querySelector('.mp318-site-progress i'), plabel=modal.querySelector('.mp318-site-progress b');");
    d("const grid=document.getElementById('mp318-period-grid'), detail=document.getElementById('mp318-detail-panel');", "const grid=modal.querySelector('.mp318-period-grid'), detail=modal.querySelector('.mp318-detail-panel');");
    d("const a=document.getElementById('mp318-site-a'),b=document.getElementById('mp318-site-b'),board=document.getElementById('mp318-site-compare');", "const secler=modal.querySelectorAll('.mp318-compare-controls select'),a=secler[0],b=secler[1],board=modal.querySelector('.mp318-compare-board');");
    d("const qel=document.getElementById('mp318-site-q'),opts=document.getElementById('mp318-site-options'),fb=document.getElementById('mp318-site-feedback'),count=document.getElementById('mp318-site-qcount'),scoreEl=document.getElementById('mp318-site-score'),next=document.getElementById('mp318-site-next');", "const meta=modal.querySelectorAll('.mp318-quiz-meta span'),qel=modal.querySelector('.mp318-quiz-card h4'),opts=modal.querySelector('.mp318-site-options'),fb=modal.querySelector('.mp318-site-feedback'),count=meta[0],scoreEl=meta[1],next=document.getElementById('mp318-site-next');");
    mp = mp.trim();
    if (!mp.startsWith("(function(){") || !mp.endsWith("})();")) throw new Error("mp318 IIFE biçimi beklenmedik");
    mp = "function mp318Boot(){" + mp.slice("(function(){".length, -"})();".length) + "}\nif(document.readyState!=='loading')mp318Boot();else document.addEventListener('DOMContentLoaded',mp318Boot,{once:true});document.addEventListener('kt:hazir',mp318Boot);";
    parca.push("/* 3.18 Dönemleri Keşfet */\n" + mp + "\n");
  }
  const js = parca.join("\n");
  const t = jsTara(js);
  if (t.yasak.length) throw new Error("kitap.js yasak API: " + t.yasak.slice(0, 5).map((y) => `${y.satir}: ${y.ad}`).join("; "));
  yaz(path.join(OUT, "assets/js/kitap.js"), js);
  not(`kitap.js ${(js.length / 1024).toFixed(0)} KB — çekirdek + kabuk davranışları + pekiştirme + 42 lab + görsel büyütme + 3.18; yasak API 0, uyarı ${t.uyari.length}`);
}

/* ---- 9. manifest + plan.json ---- */
{
  const icindekiler = bolumTanim.map((b) => {
    const h = oku(path.join(OUT, b.dosya));
    const idVar = (id) => h.includes(` id="${id}"`);
    const ekHedefler = new Set([...h.matchAll(/ id="(review-ch\d)"/g)].map((m) => m[1]));
    const ilkH1 = /<h1\b[^>]*\sid="(h\d{4,})"/.exec(h)?.[1];
    const kokBaslik = basliklar.find((t) => t.level === 1 && harita.has(t.id) && idVar(harita.get(t.id)));
    return icindekilerKur({ baslik: b.baslik, kokHedef: (kokBaslik && harita.get(kokBaslik.id)) || ilkH1 || b.id, basliklar: basliklar.filter((t) => b.birimler.some((u) => u.id === t.birim)), harita, idVar, ekHedefler });
  });
  const m = manifestKur({ kitap: { baslik: "Maliye Politikası", dil: "tr" }, bolumler: bolumTanim, icindekiler, gomulu: ["assets/embed/hdi.html", "assets/embed/iktisadi-akim.html", "assets/embed/bolgesel-gelismislik.html", "assets/embed/dunya-uretim-paylari.html"], uretim: { kaynak: "Maliye_Politikasi_SADE.zip — hocanın SADE kitabı, kabuğuyla pişirildi" } });
  yaz(path.join(OUT, "manifest.json"), JSON.stringify(m, null, 2) + "\n");
  yaz(path.join(path.dirname(OUT), "plan.json"), JSON.stringify(plan, null, 1));
  not(`manifest: ${m.bolumler.length} bölüm, içindekiler kökleri ${icindekiler.length}, gömülü 4 · plan.json yazıldı (kanit.mjs için)`);
}
yaz(path.join(path.dirname(OUT), path.basename(OUT) + "-RAPOR.txt"), rapor.join("\n") + "\n");
console.log("\nbitti →", OUT);
