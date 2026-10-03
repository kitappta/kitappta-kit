---
name: kkp-donustur
description: "Hazır etkileşimli HTML kitabı (ChatGPT/Claude ile yapılmış, kendi menülü tek sayfa ya da site) Kitappta'nın kkp/1 paketine KAYIPSIZ çevirir: envanter → hoca onayı → pişirme (kabuk JS'inin ürettiği DOM tarayıcıdan alınır) → dönüşüm (CSS olduğu gibi, dialoglar bölüm içine, gömülü uygulamalar) → kkp-lint → kanıt → zip + üretim notu. Kullan: kullanıcı 'kitabımı Kitappta'ya çevir', 'kkp paketi yap', 'kitabım yüklenmiyor' dediğinde."
allowed-tools: Bash(node *) Bash(npm *) Bash(npx *) Bash(python3 *) Bash(${CLAUDE_SKILL_DIR}/scripts/*) Read Write Edit Glob Grep
---
# kkp-donustur — hazır HTML kitabı Kitappta paketine kayıpsız çevir

Tek doğruluk kaynağı **[kural-seti.md](kural-seti.md)** (v2.3). Bu skill kuralları tekrar etmez; iş sırasını ve araçları verir.
Spesifikasyon [kkp-v1.md](kkp-v1.md). Kesin kapı **kkp-lint** (`${CLAUDE_SKILL_DIR}/scripts/kkp-lint.js` — Kitappta panelinin yüklemede
koşturduğu doğrulayıcının aynısı).

**İlke (Kitappta, 27.09.2026):** hocanın yaptığı her şey (içerik, etkileşim, açılır kutular, kartlar, modallar, gömülü uygulamalar)
**olduğu gibi** taşınır. Atılabilecek tek şey kural 4'teki kabuk listesidir (menü, arama, tema düğmesi, not, çevrimdışı). "Bunu
taşıyamıyorum" demek yasak değildir; **sessizce atmak** yasaktır: envantere "taşınamadı" yazılır ve hocaya sorulur.

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
  yerine paketlenebilir temel katman (ülke sınırları) olur.
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
(panel yüklemede indirir) — tercih yerel kopyadır. `kanit`te embed'e ait yazı tipi için `blocked by CORS` konsol hatası görürsen paketin
hatası değildir: sandbox iframe'in kökeni "null"dür, yerel sunucu CORS başlığı vermez (platform tarafında açık madde); üretim notuna yaz.

## 7. Teslim

```bash
node "${CLAUDE_SKILL_DIR}/scripts/paketle.mjs" paket/ kkp-calisma/<kitap-slug>-kkp.zip
```
+ `URETIM-NOTU.md` (kural 18 şablonu: envanter tablosu Durum'lu, taşınamayanlar, kabuk olarak atılanlar, kkp-lint/kanıt çıktıları,
uyarıların gerekçesi, elle yapılacaklar, sorular). Kullanıcıya: zip'i **Kitappta paneli → Kütüphane → Paket yükle** ile yükler; panel
raporu gelirse raporu sana yapıştırır: **yalnız bulguyu düzelt, içerik silme** (kural 19).

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
