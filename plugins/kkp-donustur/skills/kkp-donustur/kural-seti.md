# kkp/1 Hoca Kural Seti — yapay zekâ aracına verilecek üretim ve dönüşüm kuralları (v2.1, 27.09.2026)

> Bu belge **kendi kendine yeter**: yanında dosya, şablon ya da örnek paket yoktur; örnekler metnin içindedir. Hocanın kendi yapay
> zekâ aracına (ChatGPT, Claude, Gemini, bir kodlama agent'ı …) **olduğu gibi** verilir: sohbete yapıştırılır, proje / özel talimat
> alanına konur ya da bir agent'a "skill" olarak eklenir. Aracın görevi, elindeki kaynağı — Word, düz metin ya da **hazır etkileşimli bir
> HTML kitap** — Kitappta'ya doğrudan yüklenebilen **kkp/1 paketine** çevirmektir, **hiçbir etkileşimi kaybetmeden**.
>
> **Neden v2 (24–26.09.2026 vakası):** bir yapay zekâ, bu kuralların önceki sürümüyle hazır bir HTML kitabı pakete çevirdi. Metni korudu
> (580/600 paragraf, formüllerin tamamı), ama kitabın **42 laboratuvarını, dört bölüm testini, on üç dipnotun metnini, mini sitesini,
> 2 gömülü uygulamasını ve 40 stil dosyasını attı**; kalan tek script'te de yasak bir çağrı bırakıp paketi reddettirdi. Kurallar bunu
> istememişti, ama **yasaklamamıştı da**. v2 üç şey ekler: atmayı açıkça yasaklar (kural 2), her yasağın yerine ne konacağını söyler
> (kural 5–6) ve teslimden önce **kanıt** ister (envanter, öz-denetim, üretim notu — bölüm III).
>
> **Neden v2.1 (27.09.2026):** aynı kitabın "kayıpsız" sanılan ilk dönüşümü okuyucuda yine kayıplı çıktı: kart başlıkları, ikonlar ve
> aç/kapa düğmeleri kaynağın **statik HTML'inde değil, kabuk JS'inin sayfa açılırken ürettiği DOM'daydı**; CSS "kullanılmayan kural"
> mantığıyla budanmış ve dosya sırası bozulmuştu; modallar `document.body`'ye eklendiği için bölüme kapsanan CSS'ten pay alamadı;
> genişlik 64rem'e sabitlenmişti. v2.1 dört kural ekler: **pişirme** (kural 5, ilk satır), **CSS olduğu gibi** (kural 5 ve 12),
> **dialog bölüm içine** (kural 13), **genişlik serbest / iç kaydırma yok** (kural 12).
>
> Tam teknik spesifikasyon [kkp-v1.md](kkp-v1.md); bu belge onun yapay zekâya anlatılmış halidir ve onunla çelişmez.
>


---

## Bu belgeyi nasıl okuyacaksın

Üç bölüm var. **I. İş kuralları:** ne yapılır, ne asla yapılmaz (kural 1–7). **II. Biçim sözleşmesi:** paket nasıl görünür (kural 8–16).
**III. Kanıt:** öz-denetim, üretim notu, panel raporu, teslim (kural 17–20). Kuralların çoğunda **Neden** satırı vardır; kuralı anlamadan
uygulama — anladığın kural, listede olmayan durumda da doğru karar verdirir.

Terimler: **okuyucu** = Kitappta'nın kitabı gösteren uygulaması · **kabuk** = okuyucunun her kitapta aynı olan çerçevesi (menü, İçindekiler,
arama, not, tema …) · **doğrulayıcı** = yüklemede paketi denetleyip düzelten program · **envanter** = kaynaktaki etkileşimlerin listesi
(kural 3) · **üretim notu** = paketin yanında verdiğin rapor (kural 18).

Belirsiz kaldığın her yerde bu belgedeki **tek biçimi** kullan; kendi biçimini uydurma. Belgede olmayan bir durumla karşılaşırsan
**kural 2'yi uygula** (kaybetme, envantere yaz, sor).

---

## I. İş kuralları

### 1. Görev türünü belirle ve ilk mesajında söyle

| Yol | Girdi | Görevin |
|---|---|---|
| **A** | Word (.docx) ya da düz metin | Metinden kkp/1 paketi üret; etkileşimleri sen tasarlarsın (kural 13) ya da yazarın `[Etkileşim: …]` satırlarını gerçeklersin. |
| **B** | Hazır HTML kitap / site / zip (kendi okuyuculu tek sayfa, çok sayfalı site, PWA …) | **Dönüştür**: içeriği ve etkileşimin **her birini** bizim biçime taşı. "Dönüştürmek" yeniden yazmak, sadeleştirmek ya da "temiz bir sürüm çıkarmak" **değildir**. |
| **C** | Yalnız fikir / ders notu; "etkileşimli kitap yap" | Doğrudan kkp/1 biçiminde yaz; kendi okuyucu, site ya da tek sayfa uygulama **yapma** — onu sonra çevirmek zorunda kalırsın. |

Hangi yol olduğu belirsizse sor. B yolunda kaynağı önce **oku** (her dosyayı aç), sonra envanteri çıkar (kural 3), sonra dönüştür.

### 2. Kayıpsızlık — en üst kural

Kaynaktaki **her şey** pakete girer: metin blokları ve başlık hiyerarşisi, formüller, görseller (alt metinleriyle), tablolar, dipnotlar,
kaynakça, kutular/kartlar/akordeonlar **ve kitabın kendi etkileşimlerinin her biri**: kaydırıcılı laboratuvarlar, quiz / kavram kartı /
doğru-yanlış testleri, hesap makineleri, animasyonlar, akım şemaları, sözlükler, gömülü uygulamalar, mini siteler, dipnot ve görsel
pencereleri, denklem düzenleyen katmanlar, hepsi.

- Atılabilecek **tek** şey kabuktur ve kabuğun listesi kapalıdır (kural 4). Listede olmayan hiçbir şey "kabuk" sayılıp silinemez.
- Bir öğeyi taşıyamıyorsan **silme**: envanterde `taşınamadı` yaz (sebep + öneri) ve bana sor. Kararı ben veririm.
- Bir kural seni atmaya itiyorsa (örn. "postMessage yasak" ve kaynak postMessage kullanıyor) çözüm **kural 5–6'daki yerine-koyma**dır,
  özelliği kaldırmak değil.
- **Sayılar tutmalı:** kaynakta 42 laboratuvar varsa pakette 42; 13 dipnot varsa 13; 4 gömülü uygulama varsa 4. Envanter bunu kanıtlar.
- **Sessiz eksiltme en ağır ihlaldir.** Uyarılı ama kayıpsız paket, uyarısız ama kayıplı paketten iyidir; doğrulayıcı uyarıyı kabul
  eder, kaybı geri getiremez.

**Neden:** Öğrenci için laboratuvar, quiz ve dipnot kitabın kendisidir. Doğrulayıcı biçimi düzeltir; içeriği yerine koyamaz. Önceki
vakada atılan her şey, kurallara **uygun** biçimde taşınabilirdi — ve sonra taşındı.

### 3. Etkileşim envanteri — işe başlamadan çıkar, teslimde kanıtla

**İlk işin** kaynağı taramak ve envanter tablosunu çıkarmaktır. Tabloyu **bana göster ve onayımı bekle**; onaysız dönüştürmeye başlama.

| # | Ad | Kaynaktaki yeri | Tür | Hedef yerleşim | Durum |
|---|---|---|---|---|---|
| 1 | Üretim olanakları eğrisi laboratuvarı | `kitap.html` figür `mp-fig-001` + `interactions.js` | figür laboratuvarı (dialog, 3 kaydırıcı, SVG) | ortak.js, figüre `data-figure-id` ile bağlı | taşındı |
| 2 | 1. Bölüm pekiştirme (10 flash, 10 quiz, 10 D/Y) | `learning-data.js` + `learning-modals.js` | bölüm sonu test, dialog | ortak.js + `section.kt-tekrar` | taşındı |
| 3 | HDI laboratuvarı | `assets/interactive/hdi.html` | gömülü uygulama (ayrı sayfa) | `assets/embed/hdi.html` + kart içinde iframe | uyarlandı: postMessage yükseklik bildirimi silindi, yükseklik sabit |
| 4 | Dipnotlar (13) | `compat.js` FOOTNOTES nesnesi + `button.fn-ref` | dipnot penceresi | `section.kt-dipnotlar` (HTML), okuyucu balonu | taşındı |
| … | | | | | |

**Nasıl taranır** (B yolunda hepsini yap): `<script src>` ve satır içi `<script>`'lerin her birini aç ve ne yaptığını yaz; JS'te
`addEventListener`, `showModal`, `dialog`, `canvas`, `svg`, `requestAnimationFrame`, `input[type=range]`, `<select>`, `<details>`,
`<iframe>`, `data-*` kancaları; **JS'in içine gömülü içerik** (`window.X = {...}` veri nesneleri, dipnot metinleri, soru bankası, sözlük);
CSS dosyalarının hangi bileşenleri stillediği (kart, akordeon, denklem kartı, akış şeması); `assets/` altındaki ayrı HTML uygulamaları;
kaynağın kendi raporları/notları (envantere ipucu verir, pakete girmez).

**Durum** değerleri: `taşındı` (birebir) · `uyarlandı` (işlev aynı, kod değişti — ne değişti yaz) · `kabuk` (kural 4 listesinden, atıldı) ·
`taşınamadı` (sebep + öneri; teslimden önce benim onayım gerekir). Teslimde bu tablo üretim notunun **ilk** bölümüdür.

### 4. Kabuk listesi — atılabilecek tek şey

Şunlar okuyucunundur, pakete girmez, kaynaktan **atılır**: araç çubuğu · İçindekiler paneli/menüsü · arama · yer imi · not, vurgu,
işaretleme · tema (açık/koyu/sepya) ve yazı boyutu düğmeleri · ilerleme çubuğu · önceki/sonraki bölüm, sayfa gezintisi · ana sayfa,
kapak, banner, logo, künye, ISBN sayfası · "kitabı yükle / çevrimdışı kullan" (service worker, `manifest.webmanifest`, uygulama
ikonları) · yazdır, paylaş, Word'a aktar · klavye kısayolu listesi · "kaynak sayfa / basılı sayfa" göstergeleri · üretim sırasında
yazılmış denetim/QA raporları, `README`, `.txt`, `.bat`, `.py`, `.json` ayar dosyaları.

**Kabuk olmayanlar (taşınır):** dipnot penceresi ve görsel büyütme → içeriği taşınır, pencereyi okuyucu verir (kural 5); akordeon,
kart, kutu, "Bu bölümde neler öğreneceksiniz" kutusu, bölüm sonu testi, laboratuvar düğmesi, mini site, animasyon, denklem
düzenleyen katman — hepsi kitabın parçasıdır.

**Kabuk JS'inin içerikten ürettiği DOM kabuk değildir.** Kaynağın `reader.js`'i sayfa açılırken paragrafları kartlara sarıyor,
numara ve ikon basıyor, başlıklara aç/kapa düğmesi ekliyor, tabloları kaydırma kutusuna alıyor olabilir. Statik HTML'e bakınca
görünmeyen bu yapı **kitabın görünümüdür**; kural 5'in ilk satırındaki gibi "pişirilerek" taşınır, atılmaz.

**Neden:** Okuyucu bu özellikleri her kitapta aynı biçimde verir; paketteki kopyası çalışmaz ve doğrulayıcı kabuk imzasını
(`.reader-*`, `#reader-toolbar`, `.probar`) reddeder. Ama liste bununla sınırlıdır — "kabuk" kelimesi başka şeyleri atmanın gerekçesi
yapılamaz.

### 5. Dönüşüm tarifleri — "kaynakta şu varsa, pakette böyle"

B yolunun çekirdeği. Her satır önceki vakada gerçekten karşılaşılan bir durumdur.

| Kaynakta | Pakette |
|---|---|
| **Kabuk JS'i sayfa açılırken DOM'u kuruyor** (statik HTML'de 950 eleman, tarayıcıda 1750: kart sarmalayıcıları, numaralar, SVG ikonlar, aç/kapa düğmeleri, tablo kaydırma kutuları, denklem katmanları) | Kaynak dosyayı okuyup çevirme; **kitabı tarayıcıda aç, kabuğun ürettiği son DOM'u al** ("pişirme"): her bölüm birimini (`section.reading-unit`) `outerHTML` olarak kaydet, paket bunlardan kurulur. Yalnız çalışma anında **tekrar** koşacak katmanları (pekiştirme, laboratuvar, modal) pişirme sırasında engelle, yoksa ikişer kez eklenir. Kabuğun **davranışları** (kart aç/kapa, başlık aç/kapa, not aç/kapa) ~40 satırlık küçük bir modül olarak `ortak.js`'e yazılır — kabuk dosyasının kendisi taşınmaz. Kanıt: bölüm başına eleman sayısı kaynakla aynı olmalı (`querySelectorAll('*').length`). |
| Tek HTML'de bütün kitap; alt bölümler `section` başına | **Bölüm başına bir dosya** (`01-…html`); bölüm sınırı kitabın "Bölüm" başlığıdır (`h1`), alt başlıklar aynı dosyada `h2/h3`. Önsöz `00-onsoz.html`, kaynakça `90-kaynakca.html`. Ana sayfa / "unit-home" atılır (kabuk). Kaynağın **sarmalayıcıları korunur** (`div.reader > div.paper > section.reading-unit.active > div.source-content`): CSS onlara göre yazılmıştır, kaldırırsan özgüllük ve sıra bozulur. |
| Kendi okuyucu kabuğu (`masthead`, `toc-panel`, `readerbar`, `reader.js`, `sw.js`, `manifest.webmanifest`, ikonlar) | Atılır — yalnız kural 4 listesindekiler. |
| Bölüm sonu öğrenme paneli: flash kart + quiz + doğru/yanlış, modal pencerede; veri ayrı JS'te | JS `assets/js/ortak.js`'e taşınır (veri nesnesi dahil); panel bölüm dosyasında bölümün sonuna, dipnotlardan önce; modal `<dialog>` olarak **JS'in oluşturduğu** eleman (`showModal()`), **`.kt-bolum` içine eklenir** (`document.body`'ye değil — kural 13); bölüm kimliği `section.kt-bolum[data-kt-bolum]`'dan okunur (`b01` → 1. bölümün verisi). Soru/kart metinleri kural 13'ün beş maddesine uydurulur ya da olduğu gibi (`uyarlandı` yazılır). |
| Figüre bağlı laboratuvar: figürün üstünde "Etkileşim" düğmesi → dialog, kaydırıcılar, SVG/canvas çizim, "kendini sına" | JS `assets/js/ortak.js`'e taşınır. Figürün `id`'si kkp id'sine döner (`sek0001`), ama kaynağın kimliği **öznitelikte korunur** (`data-figure-id="mp-fig-001"`) ve JS bu özniteliğe bağlanır: `document.querySelector('[data-figure-id="mp-fig-001"]')` — `getElementById` **değil**. |
| Ayrı HTML uygulaması (`assets/interactive/hdi.html`; içinde kendi `<style>`, `<script>`, veri) | `assets/embed/<ad>.html` **tam belge** olarak; bölümde ilgili figürün hemen altına `details.kt-kart` içinde `<iframe src="assets/embed/<ad>.html" sandbox="allow-scripts" width="960" height="…" loading="lazy" title="…">`. Uygulamanın script'i `assets/js/embed-<ad>.js` dosyasına, veri `assets/js/veri-<ad>.js`'e; base64 görseli `assets/media/`'ya (aşağıda). |
| Modal olarak açılan gömülü uygulama (`economicActorsModal`, `frame.src` tıklayınca) | Aynı embed; modal yerine kart içinde satır içi iframe ya da JS'in oluşturduğu `<dialog>` içinde iframe — ikisi de olur, kart daha basittir. |
| `parent.postMessage({type:'…-height', height})` — iframe yüksekliği bildirimi | Çağrı **silinir**, iframe'e sabit `height` verilir. Yüksekliği **ölç**, tahmin etme: embed belgesini 1000 px genişlikte tek başına açıp `document.documentElement.scrollHeight` oku, +20 px ver (önceki vakada 720–1290 px). Yükseklik içerikten kısa kalırsa iframe'de **iç kaydırma** çıkar; bu kabul edilmez. `window.addEventListener('message', …)` dinleyicileri de silinir. |
| `div.modal` + `position:fixed` + `.is-open` sınıfı | `<dialog>` + `showModal()` / `close()`; CSS'te `position:fixed` ve `display:none/.is-open` çifti yerine `dialog{…}` ve `dialog::backdrop{…}`. Sabit konumlamayı doğrulayıcı zaten siler; dialog'a gerek yok. Dialog **`.kt-bolum` içine** eklenir (kural 13). |
| `localStorage` / `sessionStorage` ile ilerleme, skor, tema | Değişkende tut (bellek). Kalıcılık yok; üretim notuna yaz. Tema zaten okuyucunundur, tema kaydı silinir. |
| **JS'in içine gömülü içerik**: dipnot metinleri (`FOOTNOTES={…}`), sözlük, soru bankası, kart metinleri | **İçerik JS'te kaybolamaz.** Dipnot → `section.kt-dipnotlar` içinde `aside.kt-dipnot > p` (kural 11); sözlük/soru/kart → HTML'de statik id'li metin (kural 13) ya da `assets/js/veri-<ad>.js`. |
| `<button class="fn-ref" data-footnote="4">4</button>` + JS dipnot penceresi | `<sup><a class="kt-notref" id="notref0004" href="#not0004">4</a></sup>` + bölüm sonunda `aside.kt-dipnot#not0004`; pencereyi okuyucu verir, JS silinir. |
| Görsel büyütme (lightbox) JS'i, `button.image-button` sarmalayıcı | `figure > img` yeter; büyütmeyi okuyucu verir. Sarmalayıcı düğme kaldırılır, `img` kalır. |
| Onlarca CSS dosyası (`maliye-*.v118.css` …), satır içi `<style>` | **Tek `assets/css/kitap.css`'e, kaynağın `<link>` sırasıyla, OLDUĞU GİBİ** birleştir. Kural eleme yok: "kullanılmayan sınıf" budaması yapma (`*{box-sizing}`, `p`, `li`, `button` gibi yalın seçiciler ve `@media` blokları düzeni taşır; sonradan gelen `fixes.v167.css` eskiyi ezer — alfabetik sıralarsan ezme yönü tersine döner). Atılacak tek şey doğrulayıcının **reddettiği** kabuk imzası: `.reader-*`, `#reader-toolbar`, `.probar` seçicili kurallar ve `@import`. Sarmalayıcı seçicilere dokunma (sarmalayıcılar HTML'de korunur). `body.dark …` tema kuralları ve `:root{--vars}` **kalır**: doğrulayıcı tema kancasını okuyucu biçimine çevirir, `:root`u `.kt-bolum`a taşır, `position:fixed/sticky`yi siler — bunlar red değil düzeltmedir. Dış adrese `url(…)` yapan bildirim silinir; pakete kopyalanan dosyaya `url(../media/…)` yazılır. Sona **yalnız** okuyucu uyarlaması eklenir: `.kt-bolum{max-width:none}`, `.paper{max-width:none;width:auto}`, `.reading-unit{display:block}`, gömülü kart ve dialog kuralları. |
| `<img src="data:image/png;base64,…">` (≥ 4 KB) | Dosyaya çıkar: `assets/media/<ad>.png`, `src` göreli yola. Embed içinden `../media/<ad>.png`. |
| Dosya adında büyük harf, boşluk, `?v=201` sürüm eki | ASCII küçük harf, tire; `?v=` yok. `<link href="a.css?v=3">` → `assets/css/kitap.css`. |
| Kaynağın id'leri (`MP-P-000041`, `unit-sec-1-3`) | kkp id şemasına (`p0041`, `h0012` …; kural 10). Kaynak kimliğini `data-kaynak-id="MP-P-000041"` olarak **sakla** (sonraki baskıda eşleştirme). `href="#…"`, `aria-labelledby`, `for`, `aria-controls` hedeflerini **yeni id'lere güncelle**; hedefi kalmayan özniteliği sil. En azından **başlıklar** `hNNNN` olmalı: İçindekiler hedefi başlık id'si değilse uyarı verir (`KKP-MAN-W2`; kaynağın İçindekiler'inde başlık olmayan bir madde varsa — "Bölümü pekiştir" çapası gibi — maddeyi taşı, uyarıyı kabul et). **CSS'in `#id` seçicilerini de güncelle:** `#preface{color:…}` gibi bir kural id değişince boşa düşer → `[data-kaynak-id="preface"]{…}` yaz (önceki vakada önsöz başlığının rengi böyle kaybolmuştu). |
| JS'in `getElementById('openEconomicActors')` gibi **büyük harfli** id'lere bağlandığı düğme, modal | Doğrulayıcı id'leri küçük harfe çevirir (`KKP-ID-03`) ve JS'in bağı kopar. Elemanı bir **veri özniteliğiyle** işaretle (`data-kt-embed-ac="iktisadi-akim"`) ve JS'i `querySelector('[data-kt-embed-ac]')` ile bağla; ya da id'yi baştan küçük harf-tire yaz ve JS'i de değiştir. |
| Satır içi `<script>` (ör. mini sitenin 7 KB'lık script'i) | `assets/js/<ad>.js` dosyasına; bölüm sayfasının sonunda `<script src>`; manifest `js` listesine. JSON veri bloğu (`type="application/json"`) satır içinde kalabilir. |
| Yapay zekâ üretim artıkları: `data-eb-object-id`, `data-source-id`, sürüm numaralı sınıflar (`mp-…-v143`) | Sınıflar kalır (CSS'e bağlı). Kaynak kimliği tek öznitelikte (`data-kaynak-id`) saklanır, diğer iz öznitelikleri silinir. |
| EMF/WMF görsel, `.docx`/`.md`/`.txt` yardımcı dosyalar, `denetim/` raporları | Pakete girmez; PNG kopyası varsa o kullanılır; yoksa üretim notuna "ELLE" yazılır. |

### 6. Yasak → yerine ne konur

Doğrulayıcı JS dosyalarını **metin olarak** tarar: aşağıdaki kelimeler **yorumda ya da dizede geçse bile** hata sayılır. Kaldırmak yetmez,
işlevi yerine koy:

| Yasak (hata, paket reddedilir) | Yerine |
|---|---|
| `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon` | Veri pakete girer: `assets/js/veri-<ad>.js` içinde `window.ktVeri_<ad> = {…}`; küçük veri satır içi `<script type="application/json">`. Canlı veri yoktur. |
| `postMessage`, `window.parent`, `window.top`, `parent.*`, `top.*`, `frameElement`, `window.opener` | Sil. iframe yüksekliği sabit `height`. Embed ile bölüm arasında iletişim yoktur; gerekiyorsa embed kendi içinde çözer. |
| `location`, `history`, `window.open`, `window.name`, `document.open` | Bölüm içi hedef için `<a href="#id">`; okuyucu gezinir. Sayfa yenileme, yönlendirme, yeni sekme yok. |
| `eval`, `new Function`, `setTimeout("kod")`, `import()`, `importScripts`, `document.write` | Statik kod; `setTimeout(fn, ms)`; klasik `<script src>`; DOM API. |
| `document.cookie`, `indexedDB`, `serviceWorker`, `navigator.clipboard`, `new Image()` ön yükleme, `new Worker` | Sil (kopyalama ve depolama platformundur); görsel ön yükleme yerine `<img loading="lazy">`. |
| `createElement('script'|'iframe'|'link'|'object'|'embed')` | Statik HTML'e yaz; iframe yalnız `assets/embed/` (kural 11). |
| Çıplak `open(…)` çağrısı (`open(id, b)`) | Fonksiyonu **başka adla** tanımla ve çağır (`dersAc(id, b)`); `function open(){}` tanımı da kafa karıştırır, adı değiştir. |
| Dış URL: `<img src="https://…">`, `@import url(https://…)`, `url(https://…)`, `<script src="https://…">` | Dosyayı pakete koy. İstisna: `cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com` — bunlar yüklemede indirilip gömülür (uyarı). Başka her adres red. |
| `data:` URI ≥ 4 KB | Dosya (`assets/media/`). |
| `<object>`, `<embed>`, `<applet>`, `<form action=…>`, `javascript:` bağlantı, `<base>`, `<template>` içinde script, `srcdoc` | Sil / statik HTML. Form yalnız `action`sız ve JS `preventDefault` ile. |
| iframe `sandbox`'ta `allow-same-origin`, `allow-top-navigation`, `allow-popups`; `src` `assets/embed/` dışında | `sandbox="allow-scripts"` (gerekirse `allow-forms allow-modals`); yalnız `assets/embed/*.html`. |
| Okuyucu kabuğu imzası: `#reader-toolbar`, `.reader-*`, `.probar`, `reader*.js`, kökün doğrudan çocuğu `nav.toc` | Sil (kural 4). |
| MathJax / KaTeX / Plotly | Formül MathML (kural 11); grafik canvas, SVG ya da Chart.js (pakete gömülü, ≤ 1 MB). |
| Kökün doğrudan çocuğu `header`, `footer`, `nav`, `aside`, `dialog` | `div`; dialog'u JS oluşturur; `aside` yalnız `section.kt-dipnotlar` içinde. |

**Neden:** Kitap okuyucuda **sandbox iframe** içinde çalışır (`allow-scripts allow-forms allow-modals`; ağ tamamen kapalı, çerez ve depo
yok, üst pencereye erişim yok). Bu API'ler zaten çalışmaz; doğrulayıcı reddetmekle seni erken uyarır.

### 7. Düzeltilir ve uyarı — korkma, atma

Şunları yazmamaya çalış, ama **yazılmışsa doğrulayıcı düzeltir, paket reddedilmez**. Bunlardan kaçınmak için içeriği atma:

| Doğrulayıcının düzelttiği | Ne yapar |
|---|---|
| `onclick="…"` ve diğer `on*=` öznitelikleri | `addEventListener` dosyasına çevirir (`KKP-HTML-03`). |
| Satır içi `<script>` / `<style>` | Dosyaya taşır (`KKP-JS-01`, `KKP-CSS-01`). |
| `html`, `body`, `:root` seçicileri; `.kt-bolum` altında olmayan seçiciler | `.kt-bolum`a taşır / önekler (`KKP-CSS-02/09`). |
| `body.dark`, `.sepia`, `[data-theme]`, `prefers-color-scheme` | Okuyucu tema kancasına çevirir (`KKP-CSS-W3`). |
| `position:fixed/sticky`, `@import`, `zoom`, `scroll-behavior` | Siler / çevirir (`KKP-CSS-03..07`). |
| Tam sayfa bölüm dosyası (`<head>`, `<link>`, `<script>`) | Başlığı atar, sunucuya yalnız `section.kt-bolum` gider (`KKP-HTML-01`). |
| Eksik id, kırık `#href` hedefi, kökteki fazladan dosya, dosya adında `?v=` | Id verir, linki düz metne çevirir, dosyayı düşürür ya da taşır (`KKP-ID-01`, `KKP-LNK-*`, `KKP-ZIP-05/06`). |
| Bilinen CDN'den dosya | İndirir, pakete gömer (`KKP-NET-W1`). |

**Yalnız uyarı (kabul edilir):** sabit renk (`#fff`; koyu temada bozuk görünebilir) · `!important` çokluğu · `localStorage` (oturum içi
bellekle çalışır, sayfa yenilenince silinir) · 800 KB'tan büyük görsel · `kt:hazir` dinlenmiyor · tema kuralı çevrildi.

**Neden:** Önceki vakada CSS'in tamamı bu uyarılardan kaçınmak için atıldı. Uyarı içeriğe zarar vermez; kayıp verir.

---

## II. Biçim sözleşmesi (kkp/1)

### 8. Paket düzeni

```
manifest.json
00-onsoz.html             ← ön sayfalar (varsa)
01-<slug>.html            ← her bölüm için bir dosya; NN = bölümün kitaptaki numarası
02-<slug>.html
90-kaynakca.html          ← kaynakça (varsa)
assets/css/kitap.css      ← kitabın ortak CSS'i (zorunlu ad)
assets/css/bolum-02.css   ← bölüme özgü CSS (varsa)
assets/js/ortak.js        ← kitap geneli JS: test motoru, laboratuvarlar, denklem katmanları (varsa)
assets/js/bolum-02.js     ← bölüme özgü JS (varsa)
assets/js/veri-<ad>.js    ← büyük veri (varsa)
assets/js/embed-<ad>.js   ← gömülü uygulamanın script'i (varsa)
assets/js/vendor/         ← kütüphaneler (varsa; tek dosya ≤ 1 MB)
assets/media/             ← png jpg webp gif svg avif mp3 m4a ogg mp4 webm vtt
assets/fonts/             ← woff2 (varsa)
assets/embed/             ← iframe ile gömülen tam HTML belgeleri (varsa)
assets/data/              ← json (bugün okunmaz — boş bırak)
```

Başka dizin ve dosya yok. Zip **klasörün içindekilerden** yapılır: açıldığında `manifest.json` doğrudan kökte görünmeli, bir klasörün
içinde değil. Referans almayan dosya bırakma. Dosya adları ASCII küçük harf, tire; Türkçe karakter, boşluk, `?v=` yok. Zip ≤ 60 MB
(üst sınır 100 MB); bölüm HTML ≤ 1,5 MB (600 KB üstü uyarı); tek görsel ≤ 4 MB (800 KB üstü uyarı); tek JS ≤ 1 MB, toplam JS ≤ 5 MB;
CSS ≤ 1 MB; gömülü belge ≤ 1,5 MB.

### 9. Bölüm dosyası — çift tıklayınca açılan tam sayfa

```html
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>2. Bölüm başlığı</title>
<link rel="stylesheet" href="assets/css/kitap.css">
<link rel="stylesheet" href="assets/css/bolum-02.css">   <!-- yalnız bölümün kendi CSS'i varsa -->
</head>
<body>
<section class="kt-bolum" data-kt-bolum="b02" id="b02">…</section>
<script src="assets/js/ortak.js"></script>                <!-- manifest ortak.js ile aynı -->
<script src="assets/js/bolum-02.js"></script>            <!-- manifest bölüm js ile aynı -->
</body>
</html>
```

- `<body>` içinde **yalnız** tek `section.kt-bolum` ve sondaki script satırları. Başka `<meta>`, `<link>`, `<base>`, satır içi
  `<style>`/`<script>` yok. Bu satırlar manifest'teki `ortak` ve bölüm `css/js` listeleriyle **aynı** olur.
- Bölümün ilk çocuğu `h1[id]` (bölümde tek). Word Başlık 1 → `h1`, Başlık 2 → `h2`, Başlık 3 → `h3`; İçindekiler'e `h2/h3` girer.
  Bölüm özet kutusu `h1`'den sonra `div.kt-kutu`.
- Dipnotlar bölümün **son çocuğu** `section.kt-dipnotlar` içinde (kural 11). Bölüm sonu testi (`section.kt-tekrar`) dipnotlardan önce.
- `NN` = bölümün kitaptaki kalıcı numarası (paket tek bölümlük olsa bile); ön sayfalar `00`, ekler `80–89`, kaynakça `90`.
  Okuma sırası `manifest.bolumler` dizisinden gelir. `bNN` kalıcıdır, sonraki baskıda değişmez.
- Bölüm 20.000 DOM düğümünü aşarsa ikiye böl (id'ler değişmez).

**Neden tam sayfa:** üretici yüklemeden önce dosyaya çift tıklayıp yerelde kontrol edebilir. Okuyucu yüklemede başlığı atar.

### 10. Id'ler — kimliktir, konum değil

- Her `p, h1–h6, li, td, th, figcaption, blockquote, dt, dd, summary, pre` öğesine **kitap genelinde benzersiz** id: `h0001` başlık
  (seviyeden bağımsız tek sayaç) · `p0001` · `li0001` · `td0001` · `th0001` · `bq0001` · `dt0001`/`dd0001` · `sum0001` · `pre0001` ·
  `tab0001` table · `sek0001` figure + `sek0001-alt` figcaption · `kart0001` details.kt-kart · `kutu0001` div.kt-kutu ·
  `not0001`/`notref0001` dipnot · `kay0001` kaynakça maddesi · denklem `eq-<bölüm>-<no>` (kural 11). Sıra en az 4 hane, her tür kendi
  sayacı. `caption`, `ul/ol`, `tr`, `thead/tbody` id almaz.
- Biçim `^[a-z][a-z0-9-]*$` — küçük harf kebab-case. Bölüm numarasını id'ye **gömme** (`b03-p0412` değil `p0412`). JS'in bağlandığı
  başka öğeler (canvas, button, input) aynı biçimde serbest.
- **Kaynak kimliğini sakla:** B yolunda kaynağın id'si `data-kaynak-id` özniteliğine; laboratuvar kancaları `data-figure-id` gibi
  kaynak özniteliğinde kalır ve JS **özniteliğe** bağlanır. İd değişince `href="#…"`, `aria-labelledby`, `aria-controls`, `for`
  hedeflerini güncelle; hedefi kalmayanı sil.
- **Kart:** `<details class="kt-kart" id="kart0001"><summary id="sum0001">…</summary><div class="kt-kart-govde">…</div></details>` —
  `div`/`aside` ile kart yapma. Daima açık kutu: `<div class="kt-kutu" id="kutu0001">`.
- **Sonraki baskı:** önceki baskının **Kitappta panelinden indirilen düzeltilmiş paketi** başlangıç noktasıdır; konumu ve işlevi korunan
  blok metni değişse de **aynı bloktur, id'sini korur**. Yalnız gerçekten silinen blokların id'si emekli olur ve yeniden kullanılmaz;
  yeni bloklar en büyük numaradan devam eder. Kararsızsan id'yi koru. Oran ≥ %80 (hedef %100), üretim notuna yaz.
- **Tek bölüm revizyonu:** sana yalnız bir bölüm dosyası verildiyse dosya adı ve `data-kt-bolum` sabit kalır; var olan id'lere dokunma;
  yeni bloklar sana verilen "sonraki boş id'ler" listesinden başlar (verilmediyse iste, tahmin etme). Başlık eklediysen `manifest.json`
  `icindekiler`'i de güncelle ve teslim et. Çıktın yalnız değişen dosyalardır.

**Neden:** Öğrencinin notu bloğun id'sine bağlıdır; id değişirse not kopar. `getElementById` yerine öznitelik kullanmanın sebebi de bu:
id'ler kkp şemasına dönüştüğünde JS kopmasın.

### 11. İçerik biçimleri

- **Denklem:** MathML, `<math display="block"><semantics><mrow>…</mrow><annotation encoding="application/x-tex">…</annotation></semantics></math>`;
  annotation daima son çocuk; `<math>` id taşımaz; satır içinde `display` yazma. Numaralı blok:
  `<p class="kt-esitlik" id="eq-2-2" data-kt-eq="2.2"><math display="block">…</math> <span class="kt-eq-no">(2.2)</span></p>`. Aynı numara
  ikinci kez basılıyorsa `eq-2-2-o2`. Numarasız: `<p class="kt-esitlik" id="eqx0001">…</p>`. MathJax/KaTeX yok.
- **Görsel:** `<figure id="sek0003"><img src="assets/media/sekil-2-1.png" width="800" height="480" alt="…anlamlı açıklama…"
  loading="lazy"><figcaption id="sek0003-alt">Şekil 2.1: …</figcaption></figure>`. Her `img`de `width/height/alt`. Tercihen webp ≤ 800 KB.
- **Tablo:** `<table id="tab0001"><caption>…</caption>…` hücreler `td0001`/`th0001`. Sarmalayıcı `div` serbest.
- **Dipnot:** metinde `<sup><a class="kt-notref" id="notref0004" href="#not0004">4</a></sup>`; bölüm sonunda
  `<section class="kt-dipnotlar"><aside class="kt-dipnot" id="not0004"><p id="p0491">metin</p></aside></section>`. Numarayı ve ↩ okunu
  okuyucu basar.
- **Anmalar:** her "Eşitlik 2.5", "Şekil 2.1", "Tablo 2.1" → `<a href="#id">`; hedef yoksa düz metin. Dosya adlı `href` yok.
- **Gömülü belge (embed):** `assets/embed/<ad>.html` tam HTML; kendi `<style>`'ı olabilir; script'i `assets/js/embed-<ad>.js`
  (`<script src="../js/embed-<ad>.js">`), görselleri `../media/…`. Embed **okuyucu temasını almaz**; açık zeminde tasarla. Embed
  içinde iframe olmaz. Bölümde: `details.kt-kart` içinde `<iframe src="assets/embed/<ad>.html" sandbox="allow-scripts" width="960"
  height="760" loading="lazy" title="…">`; manifest `ozellikler.gomulu` listesine ekle.
- **Kart mı, embed mi?** Bölüm akışına giren etkileşim (kaydırıcılı grafik, mini hesap, quiz, figür laboratuvarı dialog'u) → bölüm
  JS'i + kart/dialog. Kendi başına uygulama gibi olan (çok panelli simülasyon, veri karşılaştırıcı, harita) → embed.

### 12. CSS

- Yalnız `assets/css/kitap.css` (ortak, adı sabit) + gerekirse `assets/css/bolum-NN.css`. Satır içi `<style>` yok; `style=""` az.
- Tüm seçiciler `.kt-bolum` altında; `html`, `body`, `:root`, `#book` yok (yazılmışsa çevrilir).
- **Genişlik serbest, iç kaydırma yok (27.09.2026).** `.kt-bolum`'a `max-width` **koyma**; okuyucu içeriği kendi sütununda (iframe) gösterir,
  o sütunun genişliği okuyucunundur. Kaynağın `.paper{max-width:980px}` gibi sınırı `max-width:none;width:auto` ile açılır; kenar boşluğu
  `padding: 24px clamp(16px,3vw,56px)`. `max-height + overflow:auto` ile **iç kaydırma kutusu** yapma (laboratuvar, kart, gömülü uygulama
  dahil); yalnız geniş tablo yatay kaydırabilir. Gömülü iframe'in yüksekliği içeriğe göre ölçülür (kural 5).
- **Tema yazma;** renkleri okuyucu değişkenlerinden **yedekli** oku: `var(--kt-bg,#ffffff)` zemin · `var(--kt-fg,#0b1e43)` metin ·
  `var(--kt-muted,#5e6d88)` · `var(--kt-surface,#f7f9fd)` kutu · `var(--kt-border,#dce5f3)` · `var(--kt-accent,#0b66f6)` ·
  `var(--kt-font-metin,Georgia,serif)` · `var(--kt-font-baslik,Georgia,serif)` · `var(--kt-font-math,"Cambria Math","STIX Two Math",serif)`.
  Token'ı **tanımlama**; `--kt-olcek` kullanma (boyutlar `em/rem`); `--kt-not-*`, `--kt-rt-*`, `.kt-rt-*`, `.kt-kabuk-*` rezerve.
- B yolunda kaynağın CSS'i **taşınır** (kural 5). Sabit renkler uyarıdır; koyu temada bozulanı görürsen token'a çevir, göremezsen bırak.
- `position:fixed/sticky`, `@import`, `zoom`, `content-visibility`, `scroll-behavior`, dış `url()` yok. `!important`'ı azalt.
- Canvas/SVG'de renk: çizim anında `getComputedStyle(kok).getPropertyValue('--kt-accent')` ile oku; tema değişince yeniden çiz
  (`MutationObserver`, `html[data-kt-theme]`). İçeriğin anlamı gerektiren renk (eğri rengi) sabit kalabilir.

### 13. JavaScript

- Dosyalar: `assets/js/ortak.js` (kitap geneli: test motoru, figür laboratuvarları, denklem katmanları), `assets/js/bolum-NN.js`,
  `assets/js/veri-<ad>.js`, `assets/js/embed-<ad>.js`, `assets/js/vendor/*.js`. Satır içi `<script>` yok; istisna
  `<script type="application/json">` veri bloğu.
- Okuyucu bölümü sayfa yüklendikten sonra takabilir; **her dosya bu kalıpla başlar** ve `boot()` idempotenttir:
  ```js
  (function () {
    var kok = document.querySelector('.kt-bolum'); if (!kok) return;
    function boot() { if (kok.dataset.ktHazirX) return; /* … */ kok.dataset.ktHazirX = '1'; }
    if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
    document.addEventListener('kt:hazir', boot);
  })();
  ```
  Birden çok dosya varsa her biri **kendi** bayrağını kullanır. Her `querySelector` sonucu null kontrollü.
- **Dialog ve JS'in ürettiği her katman `.kt-bolum` içine eklenir**, `document.body`'ye değil:
  `document.querySelector('.kt-bolum').append(dialog)`. Neden: doğrulayıcı bütün CSS'i `.kt-bolum` altına kapsar; `body`'ye eklenen
  dialog hiçbir kuraldan pay alamaz ve tarayıcı varsayılanıyla (siyah çerçeve, stilsiz) açılır — önceki vakada "modalların CSS'i gitmiş"
  şikâyetinin nedeni buydu. `showModal()` dialogu üst katmana taşır; DOM'daki yerinin görünüme etkisi yoktur. (Okuyucu 27.09.2026'dan
  itibaren `body`'ye eklenen paket katmanını kendisi bölüme taşır; kural yine geçerlidir — önizlemede ve başka okuyucularda da doğru
  çalışsın.)
- JS'in bağlandığı id'ler **küçük harf-tire** olmalı (`mp318-open-site`); `openEconomicActors` gibi id'leri doğrulayıcı küçültür ve
  `getElementById` boş döner — veri özniteliğiyle bağla (kural 5).
- Okuyucu ←/→ ve Boşluk tuşlarını bölüm geçişine bağlar. Açık bir `<dialog>` içinde bu tuşlar dialogda kalsın:
  `dialog.addEventListener('keydown', e => { if (['ArrowLeft','ArrowRight',' ','PageUp','PageDown','Escape'].includes(e.key)) e.stopPropagation(); })`.
- Okuyucu şunları sağlar, **yazma**: `#id` gezinme ve geri dön, dipnot balonu, `figure img` büyütme, `details.kt-kart` dışa tık kapanışı,
  ilerleme, arama, not, yer imi, tema. `window.kt` (`{git(id), bolum, tema, olcek}`) yalnız okuyucuda vardır; `if (window.kt)` ile koru.
- `data-kt-dinamik`: JS'in **metnini** yeniden yazdığı en küçük kapsayıcıya (geri bildirim, skor, canvas); içine id koyma.
- **Test motorunu (quiz / kart / doğru-yanlış) sen yazarsın** ya da kaynaktakini taşırsın. Beş dikkat: (1) soru, şık, açıklama ve kart
  metinleri HTML'de **statik ve id'li** durur, JS bunları üretmez; (2) JS'in yazdığı metin yalnız `[data-kt-dinamik]` alanda, `textContent`
  ile; (3) veri satır içi `<script type="application/json" id="quiz-bNN-veri">` ya da `veri-<ad>.js`; (4) JS çalışmazsa içerik yine
  okunur; (5) sınıf adları `kt-` ile başlar. B yolunda kaynağın motoru dialog içinde metin üretiyorsa (önceki vakadaki gibi) **olduğu
  gibi taşı** ve envantere `uyarlandı: metin dialogda üretiliyor, not alınamaz` yaz — atma.
- Veri: büyük veri `assets/js/veri-<ad>.js` içinde `window.ktVeri_<ad> = {…}` (≤ 1 MB, gerekirse böl); `fetch` yok.

### 14. `manifest.json`

```json
{ "format": "kkp/1",
  "kitap": { "baslik": "Maliye Politikası", "dil": "tr",
             "uretim": { "arac": "<aracın adı ve sürümü>", "tarih": "YYYY-MM-DD", "kaynak": "<kaynak dosya adı>" } },
  "bolumler": [
    { "id": "b00", "dosya": "00-onsoz.html", "baslik": "Önsöz", "tur": "on" },
    { "id": "b01", "dosya": "01-makroekonomik-temel-bilgiler.html", "baslik": "1. Makroekonomik Temel Bilgiler", "tur": "bolum",
      "css": [], "js": ["assets/js/bolum-01.js"], "veri": [] },
    { "id": "b90", "dosya": "90-kaynakca.html", "baslik": "Kaynaklar", "tur": "kaynakca" } ],
  "ortak": { "css": ["assets/css/kitap.css"], "js": ["assets/js/ortak.js"] },
  "icindekiler": [ { "baslik": "1. Makroekonomik Temel Bilgiler", "hedef": "h0002",
                     "alt": [ { "baslik": "1.1 İktisadın Temel Bilgileri", "hedef": "h0003" } ] } ],
  "ozellikler": { "matematik": "mathml", "etkilesim": true,
                  "gomulu": ["assets/embed/hdi.html", "assets/embed/iktisadi-akim.html"] } }
```

- `kitap.baslik` **zorunlu** (boşsa `KKP-MAN-02` red). `tur`: `on | bolum | ek | kaynakca`. `id` `^b\d\d$`, `dosya` `^\d\d-slug.html$`,
  ikisinde NN aynı.
- `ortak.js` ve bölüm `js` listeleri **taşınan her JS dosyasını** içerir. Etkileşimli bir kaynakta bu listelerin hepsinin boş kalması
  envanterle çelişir — öz-denetim bunu uyarır.
- `icindekiler`: bölümlerin `h1–h3` başlıkları, en fazla 3 seviye, `hedef` başlık id'si. `ozellikler.gomulu`: her embed. Şemada olmayan
  alan ekleme.

### 15. Sese uygun içerik

Kitabın sesli sürümü bu paketten ayrı üretilir ama kaynağı sensin: her şekle `figcaption` + anlamlı `alt`; her denkleme eksiksiz TeX
annotation; karmaşık formülü çevredeki metinde bir cümleyle anlat; görsel içine gömülü metin yok; kısaltmayı ilk geçişte aç; tablolara
kısa `caption`; başlıkları TAMAMI BÜYÜK yazma. Okunuşu yazıldığı gibi olmayan sözcükleri üretim notunda listele.

### 16. Kaynağa sadakat

Kaynakta olmayan içerik üretme: yeni formül, yeni bölüm, "iyileştirilmiş" cümle yok; yazım hatasını bile düzeltme, üretim notuna yaz.
Etkileşimler kaynaktaki model, parametre ve sayılara bağlı kalır. Yazarın `[Etkileşim: …]` isteğini gerçekle, istek paragrafını pakete
koyma. Değişiklik notları pakete girmez.

---

## III. Kanıt

### 17. Öz-denetim — teslimden önce, mutlaka

Kesin karar Kitappta panelinin doğrulayıcısındadır; ama aynı hataları önceden yakalamak için **şu script'i paketin üzerinde koş** ve
çıktısını üretim notuna aynen yaz. Script yalnız Python standart kütüphanesi kullanır; dosya yazabilen bir araçsan
`python3 kkp-denetim.py <paket-klasörü | paket.zip>` ile koş; koşamıyorsan (yalnız sohbet) aynı denetimleri **elle** yap ve her maddeyi
"kontrol ettim: …" diye raporla. Çıkış: `HATA` satırları paketi reddettirir (sıfır olmalı), `UYARI` satırları kabul edilir ama
gerekçelendirilir.

`scripts/kkp-denetim.py` (bu skill'in yanında; `python3 scripts/kkp-denetim.py <paket>`). Kesin karar `scripts/kkp-lint.js`'tir.

Script'in denetlediği (elle yaparken de bu liste): manifest var, geçerli JSON, `format`, `kitap.baslik`, bölüm id/dosya eşleşmesi ·
her bölümde tek `section.kt-bolum`, ilk çocuk `h1[id]` · id biçimi ve paket genelinde teklik · id'siz metin bloğu sayısı · kökte
fazladan dosya, izinsiz uzantı · her `src/href` hedefinin pakette olması · dış URL · `data:` ≥ 4 KB · satır içi script/style ·
`on*=` · JS yasak kelimeleri (satır numarasıyla) · `localStorage` · `kt:hazir` dinleyicisi · CSS `@import`, dış `url()`, kabuk
seçicisi, `fixed/sticky` · iframe kuralı · manifest `css/js` dosyalarının varlığı ve sayfada bağlı olması · İçindekiler hedefleri ·
boyut sınırları · **`etkilesim: true` iken hiç JS taşınmaması** (envanterle çelişki).

### 18. Üretim notu — pakete girmez, paketle birlikte verilir

```
# Üretim notu — <kitap adı> — <tarih> — <araç>
## 1. Etkileşim envanteri            ← kural 3 tablosu, Durum doldurulmuş; sayılar: kaynak N / paket N
## 2. Taşınamayanlar ve uyarlamalar  ← her satır: ne, neden, ne yapıldı / öneri
## 3. Kabuk olarak atılanlar         ← yalnız kural 4 listesinden; başka bir şey yoksa "yok"
## 4. Öz-denetim çıktısı             ← kural 17 script çıktısı aynen (HATA 0 · UYARI n) ya da elle kontrol listesi
## 5. Uyarıların gerekçesi           ← sabit renk, büyük görsel, localStorage … neden bırakıldı
## 6. İkinci baskıda id koruma oranı ← varsa
## 7. Sorular                        ← hocaya / editöre
## 8. Elle yapılacaklar              ← Word'den çıkarılacak görseller, EMF yer tutucuları …
```

### 19. Panel raporu — düzeltme döngüsü

Yükleme **202** ise paket taslaktır (uyarılar raporda). **422** ise rapor her bulguda `kod · dosya · yer · mesaj · çözüm` taşır ve
sana aynen yapıştırılır. O zaman kuralın: **yalnız rapordaki bulguları düzelt; başka hiçbir şeyi değiştirme; envanteri koru.** Bir bulguyu
gidermek için içerik silmek yasaktır (kural 2); yerine-koyma tablosuna (kural 6) bak. Düzelttiğin her bulguyu üretim notuna işle.

En sık kodlar: `KKP-MAN-01/02` manifest yok / başlık boş · `KKP-JS-02` yasak API (kural 6) · `KKP-NET-01` dış URL ya da `data:` ≥ 4 KB ·
`KKP-HTML-02/05` yasak etiket / iframe sandbox kaçışı · `KKP-EMB-01` iframe `assets/embed/` dışında ya da sandbox yok · `KKP-REF-01`
referans edilen dosya yok · `KKP-CHR-01` kabuk imzası · `KKP-ID-02` id çakışması · `KKP-LIM-01` boyut sınırı · `KKP-CSS-10` CSS
ayrıştırılamadı (parantez) · `KKP-ZIP-01..04` zip kökü/yol sorunları. Uyarılar (`-W`): `KKP-CSS-W3/W4/W2` tema, sabit renk, `!important` ·
`KKP-JS-W1/W4` boot kalıbı, depo · `KKP-LIM-W1` büyük görsel · `KKP-LNK-W1` kırık `aria-labelledby`.

### 20. Teslim

- Dosya yazabilen araç: klasörü üret, **öz-denetimi koş**, zip'le (kök = klasörün içi), zip + üretim notunu ver.
- Yalnız sohbet edebilen araç: her dosyayı **ayrı kod bloğu** olarak ver, bloğun üstünde paket içi yol (`assets/js/ortak.js`); sıra
  `manifest.json` → bölüm dosyaları → css → js → embed. İkili dosyaları üretemezsin: hedef adla referansla ve üretim notu §8'de
  "kaynaktaki şu dosyayı bu adla `assets/media/` altına koy" listesi ver.
- Teslim mesajında: yol (A/B/C), envanter sayıları (kaynak N / paket N), taşınamayan sayısı, öz-denetim özeti (`HATA 0 · UYARI n`),
  zip yolu, üretim notu.

---

## Örnekler

**En küçük tam paket** (üç dosya + bir görsel): kaynak → paket dönüşümünü gösterir; her şey birbirine bağlıdır.

`manifest.json`
```json
{ "format": "kkp/1",
  "kitap": { "baslik": "Örnek Kitap", "dil": "tr", "uretim": { "arac": "ChatGPT", "tarih": "2026-09-27", "kaynak": "ornek-kitap.zip" } },
  "bolumler": [ { "id": "b01", "dosya": "01-denge.html", "baslik": "1. Piyasa Dengesi", "tur": "bolum", "css": [], "js": [], "veri": [] } ],
  "ortak": { "css": ["assets/css/kitap.css"], "js": ["assets/js/ortak.js"] },
  "icindekiler": [ { "baslik": "1. Piyasa Dengesi", "hedef": "h0001", "alt": [ { "baslik": "1.1 Talep", "hedef": "h0002" } ] } ],
  "ozellikler": { "matematik": "mathml", "etkilesim": true, "gomulu": ["assets/embed/akim.html"] } }
```

`01-denge.html`
```html
<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>1. Piyasa Dengesi</title>
<link rel="stylesheet" href="assets/css/kitap.css">
</head>
<body>
<section class="kt-bolum" data-kt-bolum="b01" id="b01">
  <h1 id="h0001">1. Piyasa Dengesi</h1>
  <h2 id="h0002">1.1 Talep</h2>
  <p id="p0001" data-kaynak-id="MP-P-000041">Talep fonksiyonu <a href="#eq-1-1">Eşitlik 1.1</a>'de verilir<sup><a class="kt-notref" id="notref0001" href="#not0001">1</a></sup>.</p>
  <p class="kt-esitlik" id="eq-1-1" data-kt-eq="1.1">
    <math display="block"><semantics><mrow><msub><mi>Q</mi><mi>d</mi></msub><mo>=</mo><mi>a</mi><mo>−</mo><mi>b</mi><mi>P</mi></mrow>
    <annotation encoding="application/x-tex">Q_d = a - bP</annotation></semantics></math>
    <span class="kt-eq-no">(1.1)</span></p>
  <figure id="sek0001" data-figure-id="mp-fig-001">   <!-- laboratuvar JS'i data-figure-id ile bağlanır -->
    <img src="assets/media/sekil-1-1.png" width="800" height="480" alt="Talep ve arz doğrularının kesiştiği denge noktası" loading="lazy">
    <figcaption id="sek0001-alt">Şekil 1.1: Piyasa dengesi</figcaption></figure>
  <details class="kt-kart" id="kart0001"><summary id="sum0001">Etkileşimli: İktisadi akım şeması</summary>
    <div class="kt-kart-govde"><iframe src="assets/embed/akim.html" sandbox="allow-scripts" width="960" height="600" loading="lazy" title="İktisadi akım şeması"></iframe></div></details>
  <section class="kt-tekrar" id="tekrar-b01">
    <h2 id="h0003">Bölüm Tekrar</h2>
    <div class="chapter-learning-anchor"></div>   <!-- test motoru paneli buraya ekler -->
  </section>
  <section class="kt-dipnotlar">
    <aside class="kt-dipnot" id="not0001"><p id="p0002">Bu bilgiler Quick Study Macroeconomics'ten derlenmiştir.</p></aside>
  </section>
</section>
<script src="assets/js/ortak.js"></script>
</body>
</html>
```

`assets/js/ortak.js` — iki bağımsız katman, her biri kendi boot bayrağıyla; laboratuvar figüre **özniteliğiyle** bağlanır, dialog'u JS
oluşturur, tuşları dialogda tutar:
```js
(function () {
  var kok = document.querySelector('.kt-bolum'); if (!kok) return;
  var dersler = { 'mp-fig-001': { baslik: 'Talep kayması', min: -20, max: 20 } };   // kaynakta ayrı veri dosyasıysa veri-<ad>.js'e
  function tusKoru(d) { d.addEventListener('keydown', function (e) { if (['ArrowLeft','ArrowRight',' ','PageUp','PageDown','Escape'].indexOf(e.key) >= 0) e.stopPropagation(); }); }
  function dersAc(id) {                                   // "open" adı kullanılmaz (kural 6)
    var sp = dersler[id]; if (!sp) return;
    var d = document.createElement('dialog'); d.className = 'mp-lab';
    d.innerHTML = '<h2>' + sp.baslik + '</h2><label>Kayma <input type="range" min="' + sp.min + '" max="' + sp.max + '" value="0"></label>' +
                  '<p data-kt-dinamik></p><button type="button" data-kapat>Kitaba dön</button>';
    var out = d.querySelector('p'), r = d.querySelector('input');
    function ciz() { out.textContent = 'Kayma: ' + r.value; } ciz();
    r.addEventListener('input', ciz);
    d.querySelector('[data-kapat]').addEventListener('click', function () { d.close(); d.remove(); });
    document.body.append(d); tusKoru(d); d.showModal();
  }
  function boot() {
    if (kok.dataset.ktLab) return; kok.dataset.ktLab = '1';
    Object.keys(dersler).forEach(function (id) {
      var f = kok.querySelector('[data-figure-id="' + id + '"]'); if (!f) return;
      var b = document.createElement('button'); b.type = 'button'; b.className = 'mp-interact'; b.textContent = 'Etkileşim ↗';
      b.addEventListener('click', function () { dersAc(id); }); f.prepend(b);
    });
  }
  if (document.readyState !== 'loading') boot(); else document.addEventListener('DOMContentLoaded', boot);
  document.addEventListener('kt:hazir', boot);
})();
```

`assets/embed/akim.html` — tam belge; script'i dosyada, görseli `../media/`:
```html
<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>İktisadi akım şeması</title>
<style>body{margin:0;font:15px/1.5 system-ui;background:#fff;color:#0b1e43}</style></head>
<body><canvas id="sahne" width="960" height="560"></canvas>
<script src="../js/embed-akim.js"></script></body></html>
```

**Dönüşüm örneği — dipnot:** kaynakta `<button class="fn-ref" data-footnote="1">1</button>` ve JS'te `FOOTNOTES={"1":"…"}` → pakette
metinde `<sup><a class="kt-notref" id="notref0001" href="#not0001">1</a></sup>`, bölüm sonunda `aside.kt-dipnot#not0001 > p#p0002`;
dipnot JS'i ve dialog'u silinir (okuyucu balonu verir), FOOTNOTES nesnesi silinir çünkü **metni HTML'e taşındı**.

**Dönüşüm örneği — yükseklik bildirimi:** kaynakta `function resize(){ parent.postMessage({type:'height', height: h}, '*') }` →
pakette `function resize(){ /* iframe yüksekliği kartta sabit */ }` ve iframe'e `height="760"`.

**Dönüşüm örneği — modal:** kaynakta `<div class="site-modal" aria-hidden="true"><div class="site-shell">…</div></div>` + `.site-modal
{position:fixed;display:none} .site-modal.is-open{display:flex}` + `modal.classList.add('is-open')` → pakette HTML aynen kalır; JS
açılışta `shell`i yeni bir `<dialog class="site-dialog">` içine alır, `showModal()`/`close()`; CSS'e `dialog.site-dialog{padding:0;border:0}
dialog.site-dialog::backdrop{background:rgba(7,14,24,.86)}` eklenir.

---

**Sürüm notları**
- v2.1 (27.09.2026, aynı gece) — Hasan okuyucuda v2.0 dönüşümünü inceledi: "çok fazla kayıp; modalların CSS'i gitmiş; para türleri
  bozuk; içerik full width olsun; iç scroll olmasın; hocanın yaptığı her şey olduğu gibi yüklensin, biz yalnız kendi sağladığımız
  özellikleri engelleyelim." Dört kök neden bulundu ve kurala bağlandı: kabuk JS'inin ürettiği DOM statik dosyada yok →
  **pişirme** (kural 4 ek, kural 5 ilk satır); CSS budaması ve alfabetik sıra → **CSS olduğu gibi, yükleme sırasıyla** (kural 5, 12);
  `document.body`'ye eklenen dialog kapsanan CSS'ten pay alamaz → **dialog `.kt-bolum` içine** (kural 5, 13); `max-width:64rem` ve
  sabit iframe yükseklikleri → **genişlik serbest, iç kaydırma yok, yükseklik ölçülür** (kural 5, 12). Ek: başlıklar `hNNNN` (İçindekiler
  hedefi), büyük harfli id'ye bağlı JS → veri özniteliği (kural 5, 13). Öz-denetim script'ine beş uyarı eklendi (body'ye ekleme,
  büyük harfli `getElementById`, `.kt-bolum max-width`, `max-height+overflow`, pakette olmayan id'ye bağlı CSS `#id` seçicisi).
  2. tur (aynı gece): CSS'in `#id` seçicileri yeniden adlandırılan id'lere `[data-kaynak-id]` ile bağlanır (Önsöz başlığının rengi
  `#preface` kuralında kaybolmuştu; 104 seçici); kaynağın modalda açtığı gömülü uygulama modalda kalır (statik `<dialog>`, kural 5);
  kaynağın İçindekiler'indeki başlık-dışı maddeler (pekiştirme çapası) taşınır, MAN-W2 kabul edilir. Kanıt: aynı kitap v2.1 kurallarıyla test okuyucusunda
  bölüm başına eleman sayısı kaynağın kendisiyle aynı (1. bölüm 1754/1749), 0 hata 27 uyarı.
- v2.0 (27.09.2026) — Hasan: "kurallar sert olsun ama öğretici olsun; yapay zekâ hata yapamasın." 24–26.09 vakasından (hazır HTML kitap
  → kural setiyle dönüşüm: metin korundu, 42 lab + 4 test + 13 dipnot + mini site + 2 embed + 40 CSS atıldı, yine de red) sonra belge
  yeniden yapılandırıldı: **I. İş kuralları** (görev yolu A/B/C; **kayıpsızlık** en üst kural; **envanter + onay** zorunlu; kapalı
  **kabuk listesi**; 20 satırlık **dönüşüm tarifleri**; **yasak → yerine** tablosu; **düzeltilir/uyarı** tablosu "korkma, atma"),
  **II. Biçim sözleşmesi** (v1.9'un kural 0–12'si sıkıştırıldı; `data-kaynak-id`/`data-figure-id` ile kaynak kimliği saklama; dialog
  tuş koruması; `open(` adı yasağı), **III. Kanıt** (öz-denetim **Python script'i** belgede gömülü; üretim notu şablonu; panel raporu
  döngüsü "yalnız bulguyu düzelt, içerik silme"; teslim). Örnekler: en küçük tam paket + üç dönüşüm örneği. Biçim sözleşmesi kkp/1
  standardıyla ve editör kitinin kural setiyle aynıdır.
- v1.9 ve öncesi: Word→kkp/1 kural seti (`kkp-v1-uretim-talimati.md`); tarihçe orada.
