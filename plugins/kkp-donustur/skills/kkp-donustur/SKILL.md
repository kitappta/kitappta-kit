---
name: kkp-donustur
description: "Kitappta kkp/1 kitap paketi üretir. İki yol: (B) hazır etkileşimli HTML kitabı (ChatGPT/Claude ile yapılmış, kendi menülü tek sayfa ya da site) KAYIPSIZ çevirir: envanter → hoca onayı → pişirme (kabuk JS'inin ürettiği DOM tarayıcıdan alınır) → dönüşüm (CSS olduğu gibi, dialoglar bölüm içine, gömülü uygulamalar) → kkp-lint → kanıt → zip + üretim notu; (A) Word, ders notu ya da sıfırdan yazılan metinden yeni kitabı doğrudan kkp/1 biçiminde üretir: yalın HTML kaynak → iskelet (id'ler, bölümler, manifest) → Bölüm Tekrar (quiz + kavram kartı) ve lab kartları → kkp-lint → önizleme → zip. Kullan: kullanıcı 'kitabımı Kitappta'ya çevir', 'kkp paketi yap', 'kitabım yüklenmiyor', 'yeni kitap yazıyorum', 'Kitappta için kitap hazırla', 'Word'den paket üret' dediğinde."
allowed-tools: Bash(node *) Bash(npm *) Bash(npx *) Bash(python3 *) Bash(${CLAUDE_SKILL_DIR}/scripts/*) Read Write Edit Glob Grep
---
# kkp-donustur — hazır HTML kitabı Kitappta paketine kayıpsız çevir

Tek doğruluk kaynağı **[kural-seti.md](kural-seti.md)** (v2.4). Bu skill kuralları tekrar etmez; iş sırasını ve araçları verir.
Spesifikasyon [kkp-v1.md](kkp-v1.md). Kesin kapı **kkp-lint** (`${CLAUDE_SKILL_DIR}/scripts/kkp-lint.js` — Kitappta panelinin yüklemede
koşturduğu doğrulayıcının aynısı).

**İlke (Kitappta, 27.09.2026):** hocanın yaptığı her şey (içerik, etkileşim, açılır kutular, kartlar, modallar, gömülü uygulamalar)
**olduğu gibi** taşınır. Atılabilecek tek şey kural 4'teki kabuk listesidir (menü, arama, tema düğmesi, not, çevrimdışı). "Bunu
taşıyamıyorum" demek yasak değildir; **sessizce atmak** yasaktır: envantere "taşınamadı" yazılır ve hocaya sorulur.

**Önce yolu seç ve ilk mesajında söyle (kural 1):** kullanıcının elinde **hazır bir HTML kitap/site** varsa **Yol B** — aşağıdaki
0–7 adımları. Elinde **Word, ders notu, düz metin** varsa ya da kitabı **seninle sıfırdan yazacaksa** **Yol A** — en alttaki "Yol A" bölümü
(kitap doğrudan kkp/1 biçiminde kurulur; önce kendi okuyuculu bir HTML kitap yapıp sonra çevirmek yasaktır, kural 1 C). Kurulum
(adım 0) iki yolda da aynıdır.

## 0. Kurulum (ilk çalıştırmada bir kez)

```bash
cd "${CLAUDE_SKILL_DIR}/scripts" && npm install --omit=dev --no-audit --no-fund && npx playwright install chromium
```
Node 20+ gerekir. Chromium inmiyorsa makinedeki Chrome kullanılabilir: araçlara `--tarayici chrome` ver.

## 1. Girdi ve çalışma alanı

Kullanıcıdan al: kitabın zip'i ya da klasörü, kitap adı, (varsa) önceki Kitappta paketi (ikinci baskı — id koruma, kural 10).
Çalışma alanı: kullanıcının kitap klasörünün yanında `kkp-calisma/` (kaynak `kaynak/`, pişmiş `pismis/`, paket `paket/`, notlar).
Zip'i aç; kökte tek klasör varsa o kaynaktır. **Hiçbir şeyi kaynak klasöründe değiştirme.**

## 2. Envanter ve hoca onayı (kural 3) — üretimden ÖNCE

```bash
node "${CLAUDE_SKILL_DIR}/scripts/envanter.mjs" kaynak/ --json kkp-calisma/envanter.json
```
Çıktıyı oku. Sonra kaynağı tarayıcıda **gör** (pişirme, adım 3, ilk kez `--engelle` vermeden) ve etkileşim envanterini kural 3'ün
tablosuyla yaz: laboratuvar/simülasyon, quiz/kart, dipnot penceresi, gömülü uygulama, mini site, akordeon/kart aç-kapa, animasyon,
sesli anlatım… **Sayılarla** (42 lab, 4 test, 13 dipnot). Kullanıcıya göster, **onay al**; onaysız üretime geçme.

Kaynağı okurken şunlara karar ver (karar tablosunu üretim notuna yazacaksın):
- **Giriş sayfası** (envanter söyler) ve **bölüm birimi** seçicisi (`.reading-unit`, `section[id^=unit]`, `article` …; yoksa `<main>` tek birim,
  bölümler `h1`'den ayrılır).
- **Kabuk JS'i hangileri, çalışma-anı katmanı hangileri?** Kabuk (reader/app/site/nav/sw) DOM'u sayfa açılırken kurar → pişirilir, taşınmaz.
  Çalışma-anı katmanları (quiz/flash motoru, laboratuvar/dialog açan, tooltip/popover, mini site, etki akışı gibi **tıklamayla** çalışanlar)
  → pişirmede `--engelle` ile durdurulur, pakete `kitap.js` olarak girer. Tek-seferlik dönüştürücüler (denklem/tipografi düzenleyen,
  DOM'u yükleme anında değiştirip handler bırakmayan) → pişirilir, pakete GİRMEZ (iki kez koşarsa çift üretir). Emin değilsen: script'i
  oku; `addEventListener('click'` yoksa ve `DOMContentLoaded`'da DOM üretiyorsa "pişir"; click/keydown dinliyorsa "katman".
- **Dipnotlar nerede?** (HTML'de mi, JS'te bir sözlük mü) · **Gömülü uygulamalar** (iframe, `assets/interactive/*`) ve kaynakta nasıl açıldıkları
  (satır içi mi, modal mı — **aynısı** korunur) · **Modallar** nasıl açılıyor (div+sınıf mı, `<dialog>` mı).
- **Canlı servis var mı?** (TDK sözlüğü `sozluk.gov.tr`, hava durumu, döviz, harita karoları, herhangi bir API) → okuyucuda ağ yok
  (`connect-src 'none'`), `fetch` yasak. Veri paketlenebiliyorsa paketle (`veri-<ad>.js`); paketlenemiyorsa (bütün sözlük) **taşınamadı**:
  envantere yaz, hocaya sor, üretim notuna "Kitappta platform özelliği olarak önerilir" yaz. Kitaba özel taklit yazma. Harita karoları
  yerine **Kitappta altlığı** kullanılır (`scripts/sablon/set/harita/altlik-*.js`; kural setindeki "Harita karoları" satırı) — başka
  sınır verisi indirme: hazır dünya haritası paketleri Kırım'ı Rusya'da, Golan'ı İsrail'de çizer.
- **Sayfanın içindeki satır içi `<script>` katmanları** (A–Z akordeonu, "doğrusunu göster" gibi IIFE'ler): `--engelle` ile durdurulamaz
  (dosya değil). Pişirmede bıraktıkları "hazır" bayrağını `--temizle "[data-x-ready]"` ile sil; script'i `kitap.js`'e **idempotent** al
  (ikinci koşuda etiket/düğme çift eklemesin — `if(!el.querySelector('.etiket'))`), `kt:hazir`a bağla.
- **Başlıklarda id var mı?** Yoksa (İçindekiler `section` id'sine bağlıysa) `idsizBasliklar` ile `hNNNN` ver; İçindekiler'i kaynağın
  hiyerarşisiyle kur (section id derinliği `s-3-1-1-1` → 4. seviye; manifest `alt` sınırsız iç içe olabilir, okuyucu çizer).

## 3. Pişirme — kabuğun ürettiği son DOM'u al (kural 5, ilk satır)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/pisir.mjs" kaynak/ kkp-calisma/pismis --giris kitap.html --birim ".reading-unit" \
  --engelle "learning-modals|interactions|compat|home|economic-actors|sw\.js" \
  --temizle ".chapter-learning-panel,.reader-note-anchor,[data-collapse-key],[data-ready]" --sinif-ekle active
```
- Kontrol: `_ozet.json`'da birim sayısı, eleman sayısı; `_giris.json`'da stylesheet/script sırası; `_basliklar.json`'da başlıklar.
- Statik dosyadaki eleman sayısıyla karşılaştır: fark büyükse kabuk DOM üretiyordur — pişirme doğru karardır.
- `hatalar` doluysa kaynak zaten hatalı çalışıyor olabilir; not al, hocaya söyle.
- Kaynak birden çok HTML sayfaysa (bölüm başına dosya) her sayfayı ayrı pişir (`--giris`) ya da hepsini birleştiren bir giriş yoksa
  bölüm bölüm çalış.
- Gömülü uygulama **tarayıcıda CSS üreten** kütüphane kullanıyorsa (Tailwind Play CDN `cdn.tailwindcss.com`, JIT): CDN script'i pakete
  giremez. Üretilen CSS'i al: `node "${CLAUDE_SKILL_DIR}/scripts/stil-pisir.mjs" kaynak/ atlas/index.html kkp-calisma/atlas.css
  --calistir "switchTab('quiz');;toggleTheme()" --tikla ".tab-btn"` (arayüzü gezdir ki JS ile sonradan oluşan sınıflar da üretilsin), embed'e
  satır içi `<style>` olarak koy; CDN script'ini ve `tailwind.config` bloğunu sil.

## 4. Dönüşüm — kütüphaneyle kitaba özel script yaz

Mekanik işler `${CLAUDE_SKILL_DIR}/scripts/kkp-araclar.mjs`'te hazırdır; sen **kitaba özel** `kkp-calisma/donustur.mjs` yazarsın.
Başlangıç noktası çalışan gerçek örnek: **[scripts/ornek/maliye-donustur.mjs](scripts/ornek/maliye-donustur.mjs)** (Maliye Politikası,
42 lab + 4 test + 13 dipnot + 4 gömülü uygulama + mini site; okuyucuda kaynakla eleman eleman eşit). Onu kopyala, kitabına uyarla.

Sıra ve kütüphane fonksiyonları:
1. **Bölümleme:** pişmiş birimleri bölümlere grupla (`00-onsoz`, `01-…`, `90-kaynakca`; `bNN` id'leri). Kabuğun kapak/ana sayfa birimi atılır.
2. **Gövde:** birimlerin HTML'i; kabuk kalıntısı varsa sil (boş araç çubuğu, "tam ekranda aç ↗" dış bağlantısı).
   - Dipnot: `dipnotlariDonustur(html, {desen, metinler})` — metinler JS'teyse oradan çıkar (kural 5: **içerik JS'te kaybolamaz**).
   - Gömülü uygulama: `embedTasi(...)` → `assets/embed/<ad>.html`; kaynakta satır içiyse `<iframe class=… src="assets/embed/x.html"
     sandbox="allow-scripts" width height loading="lazy">`, modaldaysa `embedDialog({...})` statik dialog (kaynağın modal sınıflarıyla —
     CSS'i tutar) + tetikleyiciye `data-kt-embed-ac="<ad>"`. Yükseklik **ölçülür** (adım 5). Embed'in CSS'i **satır içi `<style>`**
     olur (`embedTasi` bunu yapar): doğrulayıcı `assets/css/*.css` dosyalarını bölüm CSS'i sayıp `.kt-bolum` altına önekler, embed'de
     `.kt-bolum` yoktur → `<link>`li embed stilsiz açılır. Vendor (Leaflet, Font Awesome, Chart.js) CDN'den indirilip pakete konur
     (JS `assets/js/embed-<ad>-*.js`, CSS satır içi, yazı tipi `assets/fonts/*.woff2`); vendor JS'te yasak kalıp çıkarsa
     (`document.defaultView` gibi) küçük yama, ya da CDN bağlantısını bırak (panel indirir, vendor olarak esnek tarar).
   - Id'ler: `idKucult` (büyük harf VE Türkçe harf: `az-Ç`→`az-cc`; doğrulayıcının `Ç→c` çevirisi mevcut `c` ile çakışır) →
     `basliklariNumarala(html, sayac, harita)` (paket geneli tek sayaç; başlıklarda id yoksa `idsizBasliklar`) → `referanslariGuncelle(html, harita)`.
   - Sayfa: `bolumSayfasi({...})` — kaynağın sarmalayıcıları (`div.reader > div.paper` gibi) `sarmalayiciAc/Kapa` ile **korunur**.
3. **Medya:** `medyaReferanslari(html)` → yalnız referans edilenleri kopyala (EMF girmez).
4. **CSS:** `cssBirlestir({dosyalar: stilSirasi(girisHtml), satirIci: satirIciStiller(girisHtml), idHaritasi: harita, idSecici: {paper:".paper", mainReader:".reader"},
   medyaKopyala, ek: KITAPPTA_CSS_EK(".paper") + …})` — kaynağın sırasıyla, **olduğu gibi**; rapor `atilanKural` yalnız kabuk imzasıdır.
5. **JS:** `kabukCekirdegi()` + kabuğun **davranışları** (kart/başlık aç-kapa gibi, ~40 satır, kendin yaz: kaynağın reader.js'inden ilgili
   fonksiyonları taşı, storage/kabuk bağımlılıklarını at) + çalışma-anı katmanları (kaynağın dosyaları, yamalarla: `bodyEklemeDuzelt`,
   `postMessageSil`, `open(`→`dersAc(`, dış dosya açan modal → `window.__ktEmbedAc`, `__ktDialogKoru`, `ktHazirEkle`). Sonda `jsTara`:
   yasak sıfır olmalı.
6. **Manifest:** `icindekilerKur` (başlıklar `_basliklar.json`, `harita`, başlık-dışı hedefler `ekHedefler` — kaynağın İçindekiler'inde varsa
   taşınır, MAN-W2 uyarısı kabul) + `manifestKur`.
7. **plan.json** (kanıt için): bölüm dosyası → pişmiş birim dosyaları.

## 5. Gömülü uygulama yüksekliği (iç kaydırma çıkmasın — kural 12)

```bash
node "${CLAUDE_SKILL_DIR}/scripts/embed-yukseklik.mjs" paket/ assets/embed/a.html assets/embed/b.html --genislik 1000
```
Değerleri iframe `height`'ına yaz (satır içi iframe için CSS'te de `height:<n>px!important`).

## 6. Doğrulama — sırayla, hepsi

```bash
node "${CLAUDE_SKILL_DIR}/scripts/kkp-lint.js" paket/ --ag-kapali          # hata 0 olana kadar; uyarıları üretim notuna
python3 "${CLAUDE_SKILL_DIR}/scripts/kkp-denetim.py" paket/                 # ikinci göz (kural 17)
node "${CLAUDE_SKILL_DIR}/scripts/kanit.mjs" --paket paket/ --pismis kkp-calisma/pismis --plan kkp-calisma/plan.json
```
`kanit`: bölüm başına eleman sayısı kaynakla ±%3 içinde, dialog düğmeleri açılıyor, konsol hatasız → GEÇTİ. Değilse **atma, bul**:
eksik kural (CSS `#id` seçicisi yeniden adlandırılan id'ye bağlı mı? `[data-kaynak-id]`e çevir), eksik katman, engellenmemiş script (çift).
Sonra `onizleme.html`'i (skill klasöründe) tarayıcıda açıp zip'i sürükle: gözle bak — modallar stilli mi, kartlar açılıyor mu, koyu temada?

Notlar: `--ag-kapali` allowlist CDN'leri de reddeder (NET-01); pakette CDN bağlantısı bırakıyorsan lint'i bir de `--ag-kapali`siz koş
(panel yüklemede indirir) — tercih yerel kopyadır. Yazı tipleri (`assets/fonts/*.woff2`) sandbox içinden CORS başlığıyla iner; kanıt
sunucusu da Kitappta gibi bu başlığı verir — `blocked by CORS` konsol hatası görürsen kit eski demektir, güncelle.

## 7. Teslim

```bash
node "${CLAUDE_SKILL_DIR}/scripts/paketle.mjs" paket/ kkp-calisma/<kitap-slug>-kkp.zip
```
+ `URETIM-NOTU.md` (kural 18 şablonu: envanter tablosu Durum'lu, taşınamayanlar, kabuk olarak atılanlar, kkp-lint/kanıt çıktıları,
uyarıların gerekçesi, elle yapılacaklar, sorular). Kullanıcıya: zip'i **Kitappta paneli → Kütüphane → Paket yükle** ile yükler; panel
raporu gelirse raporu sana yapıştırır: **yalnız bulguyu düzelt, içerik silme** (kural 19).

## Yol A — sıfırdan ya da Word'den yeni kitap

Yol B'nin envanter / pişirme / kanıt adımları burada yok (karşılaştırılacak kaynak yok); yerine **her bölümden sonra lint + önizleme**.
İş bölümü editör kitiyle aynı: **sen içeriği yazarsın, araçlar mekaniği kurar** (id'ler, bölüm dosyaları, manifest, standart quiz/kart/lab
yapısı). Id'leri asla elle uydurma; HTML'e elle blok ekleme. Kaynakta (hocanın metninde) olmayan içerik üretme (kural 16): formül,
örnek, sayı uydurma; soruları ve kartları yalnız bölümün kendi metninden yaz.

**A1. Girdi topla (sormadan varsayma):** kitap adı · bölüm planı (numaralı ana başlıklar; Önsöz/Kaynakça var mı) · kaynak metin —
Word varsa hoca metni `.txt`/`.md` olarak kaydeder ya da sohbete yapıştırır (pandoc kuruluysa `scripts/docx-cikar.mjs kaynak.docx
kkp-calisma/kaynak` çıkarımı doğrudan `kaynak.html` verir; pandoc kurulumunu sen yapma, mesajı ilet) · görseller (png/jpg/webp/svg;
`kkp-calisma/kaynak/media/`) · **etkileşim planı**: varsayılan her bölümde Bölüm Tekrar (≥ 5 soru + ≥ 8 kavram kartı), parametrik
model/formül olan bölümde 1 lab kartı; hoca "yalnız temel" derse lab yok · önceki baskı zip'i (ikinci baskı — id koruma, kural 10).

**A2. `kkp-calisma/kaynak/kaynak.html` yaz** — yalın HTML parçası (html/head/body yok, stil yok, script yok), şu biçimde:
- Bölüm = `<h1>` ve **numaralı**: `<h1>1. Giriş</h1>`; `<h1>Önsöz</h1>` → `00-onsoz`, `<h1>Kaynakça</h1>` → `90-kaynakca`, `<h1>Ek A …</h1>` → 80+.
  Alt başlıklar `<h2>1.1 …</h2>`, `<h3>1.1.1 …</h3>`. Tek bölümlük pakette `--bolum NN` ver.
- Metin `<p>`, listeler `<ul>/<ol>`, alıntı `<blockquote>`. **Kutu**: paragraf `<strong>Örnek 2.1:</strong>`, `Tanım 1.1:`, `Uyarı:`,
  `Not:`, `Teorem`, `Çözüm`, `Soru 2.1:` ile başlarsa `div.kt-kutu` olur (ilk paragraf; devam paragraflarını sonra elle kutuya taşı).
- **Formül** `<p><math display="block" xmlns="http://www.w3.org/1998/Math/MathML">…</math> (2.1)</p>` — numara parantezle paragraf
  sonunda; metinde "Eşitlik 2.1" yazınca bağlantı kendiliğinden kurulur. Satır içi formül `<math>` (display'siz). TeX yazma, MathML yaz.
- **Şekil** `<figure><img src="media/x.png" alt="betimleme"><figcaption>Şekil 2.1: Başlık</figcaption></figure>`; metinde "Şekil 2.1" bağlanır.
- **Tablo**: önce `<p>Tablo 2.1: Başlık</p>` sonra `<table><thead>…<tbody>…`.
- **Dipnot**: metinde `<sup><a href="#fn1" class="footnote-ref" id="fnref1" role="doc-noteref">1</a></sup>`, sonda
  `<section id="footnotes" class="footnotes"><ol><li id="fn1"><p>Metin<a href="#fnref1" class="footnote-back">↩︎</a></p></li></ol></section>`.
- **Lab isteği**: hocanın istediği yere `<p>[Etkileşim: arz-talep kaydırıcısı]</p>` — A4'te kart olur.
- Yazım hatasını bile düzeltme; hocanın cümlesi hocanındır (kural 16).

**A3. İskelet + ilk lint:**
```bash
node "${CLAUDE_SKILL_DIR}/scripts/kaynak-donustur.mjs" kkp-calisma/kaynak kkp-calisma/paket --kitap "<Kitap Adı>" --kaynak-adi kaynak.html \
  --arac "kkp-donustur Yol A" [--onceki kkp-calisma/onceki.zip] [--bolum NN]
node "${CLAUDE_SKILL_DIR}/scripts/kkp-lint.js" kkp-calisma/paket --ag-kapali
```
Araç bölümleri ayırır, her bloğa id verir (`h0001`, `p0012`, `eq-2-1`, `sek0001`, `tab0001`, `not0001`, `kutu0001`), dipnotları
`section.kt-dipnotlar`a, "Eşitlik/Şekil/Tablo N.M" anmalarını bağlantıya çevirir, görselleri `assets/media/`ya, şablon `kitap.css` +
`ortak.js`'i (quiz/kart motoru) pakete koyar, `manifest.json` + İçindekiler yazar; `kkp-calisma/kaynak/donusum-raporu.md`'yi oku
(etkileşim istekleri `kutuNNNN` id'leriyle, çözülemeyen anmalar, kutu adayları, ikinci baskıda id eşleşmeleri). Lint **hata 0** olmalı;
hata varsa `kaynak.html`'i düzelt, aracı değil.

**A4. Etkileşim — HTML değil düz metin oku, JSON yaz, araç eklesin:**
```bash
node "${CLAUDE_SKILL_DIR}/scripts/bolum-metni.mjs" kkp-calisma/paket kkp-calisma/metin          # bNN-metin.txt: "[id] metin" satırları
```
- **Bölüm Tekrar** → her `tur: bolum` bölüm için `kkp-calisma/tekrar/bNN.json`:
  `{ "bolum": "b02", "sorular": [{ "soru", "secenekler": [2–8], "dogru": 0-tabanlı, "aciklama" }], "kartlar": [{ "on", "arka" }] }`.
  Soru **numarasız**; şıkta doğru cevabı ele verme (en uzun şık doğru olmasın, "hepsi/hiçbiri" yok); **şık harfine ya da konumuna
  atıf yok** (soru, şık ve açıklamada — platform sırayı her açılışta karıştırır, kural 13); açıklama kaynağa atıf yapsın ("Eşitlik 2.3",
  "Örnek 2.1"); sayısal soruda cevabı kaynaktaki denklemle kendin doğrula; kart ön yüz terim, arka yüz kaynaktaki tanım.
  ```bash
  node "${CLAUDE_SKILL_DIR}/scripts/tekrar-ekle.mjs" kkp-calisma/paket kkp-calisma/tekrar --rapor kkp-calisma/tekrar/rapor.md
  ```
  Standart yapı (`div.kt-quiz` + `fieldset` + `script#quiz-bNN-veri`) **platformun yönettiği** quiz'dir: cevap anahtarı öğrenciye
  gitmez, sunucu puanlar, hoca panelde sonuçları görür. Elle yazılmış ya da başka motorlu quiz bunu alamaz. Aynı bölüme ikinci koşu
  güvenlidir (aynı metin id'sini korur).
- **Lab kartı** (parametrik model, kaydırıcı, çizim): `kkp-calisma/lab/bNN-<ad>.html` = `sablon/lab-kart.html`'deki
  `div.kt-kart-govde`'nin **içeriği** (details/summary yazma; `label` + `input[type=range]`, `canvas` + `aria-label`,
  `div.kt-sonuc[data-kt-dinamik]`; id'ler küçük harf kebab-case, pakette benzersiz; `<script>`, `<style>`, `on*=` yok); bölüm JS'i
  `kkp-calisma/lab/bolum-NN.js` = `sablon/bolum-NN.js` kalıbı (tek IIFE, `boot()` idempotent, `kt:hazir`, renkler `renk("--kt-fg")`
  token'dan — **bir bölümün bütün labları tek dosyada**); spec `kkp-calisma/lab/bNN-<ad>.json`:
  `{ "bolum": "b02", "yer": { "istek": "kutu0001" } | { "basliktanSonra": "h0004" } | { "sonra": "p0012" }, "ozet": "Deneyin: …", "govde": "b02-denge.html", "js": "bolum-02.js" }`.
  Kaydırıcı aralıklarını ve varsayılanları **kaynak metindeki örnek değerlerden** al.
  ```bash
  node "${CLAUDE_SKILL_DIR}/scripts/lab-ekle.mjs" kkp-calisma/paket kkp-calisma/lab
  ```
- **Kart türleri** (tanım, kural, uyarı, örnek, özet, sık yapılan hata…): dönüştürücü "Örnek 2.1:", "Uyarı:" diye başlayan paragrafları
  türüyle kutuya alır; kalanını `kkp-calisma/kutu/bNN.json` ile sen işaretlersin — yalnız metinde zaten o işlevi gören bloklar:
  `[ { "bolum": "b02", "bloklar": ["p0012", "p0013"], "tur": "tanim", "etiket": "Tanım" } ]` (`bloklar` ardışık blok id'leri ya da tek
  bir kutu id'si; türler: `tanim kural uyari not ornek ozet ipucu hata sonuc karsilastirma olay kazanim teorem alistirma cozum`;
  satır zaten "Örnek 3:" diye başlıyorsa `etiket` verme).
  ```bash
  node "${CLAUDE_SKILL_DIR}/scripts/kutu-isaretle.mjs" kkp-calisma/paket kkp-calisma/kutu
  ```
- **Harita kartı — yalnız Kitappta altlıklarıyla.** Metin bir coğrafyayı anlatıyorsa (yayılım alanı, ülkeler, iller, güzergâh) ve harita
  anlatımı kolaylaştırıyorsa ekle; süs için ekleme. Altlıklar: `dunya`, `avrasya` (Türk dünyası, Orta Doğu, Balkanlar; yakın plan),
  `turkiye-iller` (`--altliklar` listeler). Yer kodlarını tahmin etme: `--kodlar <altlık>` (ülkeler `TUR`, `AZE`…; KKTC `CYN`, Kosova `KOS`,
  Filistin `PSX`; iller `TR-06`). Spec `kkp-calisma/harita/bNN-<ad>.json`:
  `{ "bolum": "b04", "yer": { "sonra": "p0012" }, "baslik": "Harita 4.1: …", "altlik": "avrasya", "gruplar": [{ "ad": "oguz", "etiket": "Oğuz" }],
  "vurgu": [{ "k": ["TUR", "AZE"], "grup": "oguz" }], "isaretciler": [{ "ad": "Ankara", "konum": [39.93, 32.86], "metin": "…", "grup": "oguz" }],
  "alanlar": [{ "ad": "Yayılım alanı", "noktalar": [[41.5, 26], [56.5, 50], [43, 90]], "kesik": true }] }` — `konum` **[enlem, boylam]**;
  yalnız metinde adı geçen yerler; işaretçi metni kaynaktaki cümle.
  ```bash
  node "${CLAUDE_SKILL_DIR}/scripts/harita-ekle.mjs" kkp-calisma/paket kkp-calisma/harita
  ```
  Araç kartı kurar, işaretçileri metin listesi olarak da yazar, altlığı ve Leaflet'i pakete koyar; hatalı spec'te hiçbir dosyaya dokunmaz.
  `UYARI` satırı ters yazılmış konumu gösterir — düzelt. Kartı değiştirmek için spec'e çıktıdaki id'yi yaz (`"id": "sek0007"`) ve yeniden koş.
  Sınırlar ve yer adları altlıktan gelir (Türkiye'nin bakış açısıyla çizilmiştir), **değiştirilmez**; karo (sokak / uydu), dış harita
  servisi ve başka sınır verisi yok. Katalogda olmayan bir altlık gerekiyorsa (ilçeler, tarihî sınırlar) harita ekleme, üretim notuna yaz.
- **Görünüm — yalnız Kitappta setinden.** Yazı, renk ve kart biçimi `scripts/sablon/katalog.json`'daki seçeneklerden seçilir: hazır
  takımlar (`hukuk`, `dil`, `kart`, `teknik`, `sosyal`, `ozet`) ve altı eksen (yazı takımı, görünüm, kart biçimi, yoğunluk, renk ailesi,
  matematik yazısı). Kitabın türüne göre **bir takım öner, hocaya onaylat**; görmek isterse önizlemeyi üret:
  `node "${CLAUDE_SKILL_DIR}/scripts/set-onizleme.mjs" kkp-calisma/onizleme` (çift tıklanır, üç temada gösterir). Sonra:
  ```bash
  node "${CLAUDE_SKILL_DIR}/scripts/gorunum-ekle.mjs" kkp-calisma/paket --takim hukuk [--renk lacivert] [--yogunluk ferah]
  ```
  Araç bilinmeyen seçeneği reddeder ve geçerli adları listeler. Kendin CSS, font ya da renk yazma; CDN'den font çağırma; `kitap.css`
  ve `set-*.css` dosyalarını düzenleme (düzenlenen set dosyası doğrulayıcıda tanınmaz, tema uyarısı döner). Hoca "sade kalsın" derse
  adımı atla. İkinci baskıda `--onceki` aynı seçimi kendisi yeniden uygular.

**A5. Doğrulama:** `kkp-lint … --ag-kapali` hata 0 → `python3 "${CLAUDE_SKILL_DIR}/scripts/kkp-denetim.py" kkp-calisma/paket` →
`onizleme.html`'i tarayıcıda açıp zip'i sürükle ve **her bölümü gez**: başlıklar/İçindekiler, formüller, şekiller, kutular, quiz geri
bildirimi, kart çevirme, lab tuvali, koyu tema. Tipik hatalar: `KKP-ID-02` (elle eklenmiş blok), `KKP-JS-02` (bölüm JS'inde yasak dize —
yorumda bile), `KKP-LNK-01` (hedefsiz anma — kaynaktaki numarayı düzelt).

**A6. Teslim:** `scripts/paketle.mjs kkp-calisma/paket kkp-calisma/<kitap-slug>-kkp.zip` + `URETIM-NOTU.md` (`sablon/URETIM-NOTU.md`
şablonu: girdi, çıktı sayıları, öz-denetim, hocaya sorular, bilinen eksikler). Panel yüklemesi ve "Sürüm oluştur" hocanın/editörün işi.
**İkinci baskı:** panelden indirilen **düzeltilmiş** zip'i `--onceki` ile ver; id koruma oranı raporda — %80 altıysa teslim etme.

## Sık tuzaklar (hepsi yaşandı)

- Statik HTML'i okuyup "kart yok" demek → kartlar tarayıcıda üretiliyor (pişir).
- CSS'i "kullanılmayan kural" diye budamak, dosyaları alfabetik dizmek → düzen bozulur; olduğu gibi, yükleme sırasıyla.
- Dialogu `document.body`'ye eklemek → stilsiz açılır; `.kt-bolum` içine (`bodyEklemeDuzelt`). Okuyucu bugün taşıyor ama önizleme taşımaz.
- Başlık id'lerini değiştirip CSS'teki `#id` kurallarını unutmak → renk kaybı (`cssBirlestir` `idHaritasi` ile çevirir).
- `getElementById('camelCase')` → doğrulayıcı id'yi küçültür, bağ kopar; veri özniteliğiyle bağla.
- `open(` adlı fonksiyon/çağrı, `postMessage`, `location` kelimeleri yorumda bile → red. `jsTara` ile son kontrol.
- Kaynakta modal olan gömülü uygulamayı karta çevirmek (ya da tersi) → "neden farklı açılıyor?" Aynısını koru.
- Kaynağın İçindekiler maddelerini (pekiştirme paneli gibi) başlık değil diye atmak → taşı, uyarıyı kabul et.
- Türkçe harfli id'yi (`az-Ç`, `az-İ`) doğrulayıcıya bırakmak → `az-c`, `az-i` ile çakışır, "İ" paneli "i"yi yutar; `idKucult` benzersiz çevirir.
- Başlıklarda id yok diye İçindekiler'i boş bırakmak → `idsizBasliklar` + kaynağın hiyerarşisi (section id derinliği).
- Embed'in CSS'ini `assets/css/` dosyası olarak bağlamak → doğrulayıcı `.kt-bolum`a kapsar, embed stilsiz açılır; satır içi `<style>`.
- Tailwind CDN'li embed'i olduğu gibi taşımak → CDN reddedilir, çevrim dışı CSS yok; `stil-pisir.mjs` ile üretilen CSS'i al.
- Canlı servisi (TDK sözlüğü) "veri paketlensin" diye zorlamak ya da sessizce atmak → taşınamadı + hocaya soru + platform önerisi.
- Satır içi IIFE'nin "hazır" bayrağını pişmiş DOM'da bırakmak → script erken döner, akordeon/düğme çalışmaz (`--temizle "[data-x-ready]"`).
- `kanit`te küçük bölümde "+%40" farkı kayıp sanmak → kanıt yalnız eksilmeyi sayar; artış sarmalayıcı/section/dialog etiketleridir.
