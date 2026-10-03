# Kitappta Kitap Paketi v1 — `kkp/1`

**Durum:** **v1 — donduruldu 02.09.2026** ([Plan 12](../plans/12-kitap-paketi-okuyucu.md) el sıkışmasıyla).
Değişiklik = `kkp/2`; v1 paketler okunmaya devam eder. Doğrulayıcı `packages/kkp` (`corepack pnpm kkp-lint ./paket` — Faz A'da yazılıyor) bu belgeyi uygular;
uymayan paket yüklenemez, rapor **hata kodu + dosya:satır + çözüm** verir.

## 1. İlke

Paket **yalnız içerik** taşır: metin, matematik, görsel, tablo ve kitabın kendi etkileşimleri (kart, quiz,
lab, canvas). Okuyucu araç çubuğu, İçindekiler paneli, tema/zoom/yer imi/not düğmeleri, kapak, logo,
künye, ilerleme çubuğu ve `localStorage` **platformundur** — pakette bulunamaz. Paket, `kitappta.com.tr`
uygulamasının ne olduğunu bilmez; `window.kt` dışında platform API'si yoktur.

## 2. Dizin düzeni (zip kökü)

```
manifest.json                  zorunlu
00-on-sayfalar.html            bölüm fragment'ları KÖKTE; ad = NN-slug.html (NN = kitaptaki bölüm numarası)
01-iktisatta-iliskiler.html
02-duragan-kismi-piyasa.html
…
90-kaynakca.html
assets/
  css/     kitap.css (zorunlu, ortak) · bolum-NN.css (opsiyonel)
  js/      bolum-NN.js (opsiyonel) · vendor/*.js (gömülü kütüphane)
  data/    *.json (quiz/flash/lab verisi; opsiyonel)
  media/   png jpg jpeg webp gif svg avif mp3 m4a ogg mp4 webm vtt
  fonts/   *.woff2 (toplam ≤ 2 MB)
  embed/   iframe ile gömülen kendi-kendine-yeten tam HTML belgeleri (3B şekil vb.)
```

- Dosya adı `^[a-z0-9][a-z0-9._-]*$` (ASCII küçük harf); derinlik ≤ 4; kökte `.html` + `manifest.json`
  dışında dosya yok; `_kt/`, `__kt/` önekleri rezerve; referanslarda `?v=` gibi sorgu eki yasak.
- Kök `ses/` **platform için rezerve** (25.09.2026, Plan 28): kitabın sesli sürümü bu isimde ama kkp/1 zip'inin
  DIŞINDA, ayrı bir yan pakette yaşar (`kkp-ses/1`, [kkp-ses-v1.md](kkp-ses-v1.md)) — kkp/1 zip'i içinde `ses/`
  adlı bir klasör/dosya olamaz; bu belge değişmez.
- `__MACOSX/`, `.DS_Store`, `Thumbs.db` sessizce atılır. Yinelenen girdi adı (büyük-küçük harf farkı dahil)
  → hata. İç içe `.zip` → hata.
- Kapak görseli, künye (ISBN, yayınevi, e-posta) ve logo pakette **yer almaz** — DB'den basılır.
- **Dipnotlar ayrı bölüm değildir**: her bölümün sonunda `section.kt-dipnotlar` içinde yaşar (bkz. §4).

## 3. `manifest.json`

```json
{
  "format": "kkp/1",
  "kitap": { "baslik": "Matematiksel İktisatta Temel Uygulamalar", "dil": "tr",
             "uretim": { "arac": "claude + kkp-lint 1.0", "tarih": "2026-09-01", "kaynak": "kaynak.docx" } },
  "bolumler": [
    { "id": "b00", "dosya": "00-on-sayfalar.html", "baslik": "Önsöz", "tur": "on" },
    { "id": "b01", "dosya": "01-iktisatta-iliskiler.html", "baslik": "1. İktisatta İlişkilerin Grafiğe Aktarılması",
      "tur": "bolum", "css": ["assets/css/bolum-01.css"], "js": ["assets/js/bolum-01.js"] },
    { "id": "b03", "dosya": "03-matrisler.html", "baslik": "3. Matrisler ile Piyasa Dengesi Analizi",
      "tur": "bolum", "css": ["assets/css/bolum-03.css"], "js": ["assets/js/bolum-03.js"],
      "veri": ["assets/data/bolum-03.quiz.json"] },
    { "id": "b90", "dosya": "90-kaynakca.html", "baslik": "Kaynakça", "tur": "kaynakca" }
  ],
  "ortak": { "css": ["assets/css/kitap.css"], "js": ["assets/js/ortak.js"] },
  "icindekiler": [
    { "baslik": "1. İktisatta İlişkilerin Grafiğe Aktarılması", "hedef": "h0001", "alt": [
      { "baslik": "1.1 Kümeler", "hedef": "h0002" },
      { "baslik": "1.2 Sıralı İkililer", "hedef": "h0007" } ] },
    { "baslik": "2. Durağan Kısmi Piyasa Denge Modeli", "hedef": "h0031" }
  ],
  "ozellikler": { "matematik": "mathml", "etkilesim": true, "gomulu": ["assets/embed/sekil-1-9-3b.html"] }
}
```

| Alan | Kural |
|---|---|
| `format` | tam olarak `"kkp/1"` |
| `bolumler[].id` | `^b\d{2}$`, benzersiz. **Yalnız bölüm kimliğidir; blok id'lerine önek OLMAZ** (bkz. §5) |
| `bolumler[].dosya` | kökte var; `NN-` öneki id'nin sayısıyla eşit ve **kitaptaki bölüm numarasıdır** (tek bölümlük paket de `02-…`/`b02`); okuma sırası dizi sırasından gelir; `bNN` kalıcıdır |
| `bolumler[].tur` | `on \| bolum \| ek \| kaynakca`; okuma sırası = dizi sırası; `on/kaynakca` ilerleme yüzdesinden düşer |
| `css/js/veri` | yalnız `assets/{css,js,data}/` altında, uzantı eşleşmeli, zip'te var |
| `icindekiler[].hedef` | **blok id** (`hNNNN`); dosya adı taşımaz — doğrulayıcı hangi bölümde olduğunu bulur; yoksa `h1/h2`'den üretir |
| Bölüm sayısı | 1–60 |

Doğrulayıcı manifest'i **zenginleştirip** DB'ye yazar (bölüm bayt/düğüm sayıları, dosya listesi + sha256,
blok→bölüm indeksi); üretici bunları vermez.

## 4. Bölüm dosyası — fragment (tam belge DEĞİL)

`<!doctype>`, `<html>`, `<head>`, `<body>` **yok**; kök **tek** `<section class="kt-bolum" data-kt-bolum="bNN" id="bNN">`.
Sarmalayıcıyı (head, tema, runtime, kabuk köprüsü) sunucu üretir.

> **Errata (05.09, üretim talimatı v1.3 — Hasan: "üretici yüklemeden önce çift tıklayıp kontrol edebilmeli"):** bölüm dosyası artık
> **sabit başlıklı tam sayfa** olarak üretilir (kural 3: `<head>` yalnız charset/viewport/title + `kitap.css`/bölüm css `<link>`'leri;
> `<body>` = tek `section.kt-bolum` + sondaki `ortak.js`/bölüm js `<script src>` satırları). Doğrulayıcı başlığı atar, bağlantıları manifest
> `ortak`/bölüm listeleriyle **tekilleştirir** (listedekiler sessizce düşer), S3'e yine yalnız `section.kt-bolum` yazılır. Fragment gelen
> paketler de geçerlidir. Yerel açılış için `kitap.css` token okumaları yedek değerli (`var(--kt-fg,#0b1e43)`); paket token TANIMLAMAZ.
>
> **Tolerans (Hasan 02.09 — "yüklenen düzgünce çalışmalı"):** tam HTML belgesi gelirse doğrulayıcı `<body>` içini
> alır, `<head>`'deki `<link rel=stylesheet>`'leri bölümün `css` listesine, inline `<style>/<script>`'leri
> dosyalara taşır ve rapora "düzeltildi" yazar. Kök `section.kt-bolum` yoksa sarar. Eksik blok id'lerini
> kendisi üretir (mevcutlar korunur, yeniler en büyük numaradan devam eder). Bilinen CDN'lerden gelen dosyalar
> indirilip pakete gömülür. **Reddedilen yalnız güvenlik ihlalleridir:** allowlist dışı ağ, sandbox kaçışı
> denemesi, zip-slip/bomba. Üretim talimatı yine temiz çıktı ister; tolerans emniyet kemeridir.

```html
<section class="kt-bolum" data-kt-bolum="b01" id="b01">
  <h1 id="h0001">1. İKTİSATTA İLİŞKİLERİN GRAFİĞE AKTARILMASI</h1>
  <p id="p0001">İktisat, kıt kaynakların …</p>
  <h2 id="h0002">1.1 Kümeler</h2>
  <p id="p0002">Bir küme, iyi tanımlanmış nesneler topluluğudur …</p>
  <p class="kt-esitlik" id="eq-1-1" data-kt-eq="1.1">
    <math display="block"><semantics><mrow>…</mrow><annotation encoding="application/x-tex">A=\{x \mid …\}</annotation></semantics></math>
    <span class="kt-eq-no">(1.1)</span>
  </p>
  <p id="p0003">Örneğin <a href="#sek0001">Şekil 1.1</a>'de ve <a href="#eq-2-2">Eşitlik 2.2</a>'de …<sup><a class="kt-notref" id="notref0004" href="#not0004">4</a></sup></p>
  <figure id="sek0001">
    <img src="assets/media/sekil-1-1.png" width="1200" height="800" alt="A kümesinin Venn şeması" loading="lazy" decoding="async">
    <figcaption id="sek0001-alt">Şekil 1.1: A Kümesinin Venn Şeması</figcaption>
  </figure>
  <details class="kt-kart" id="kart0001">
    <summary id="sum0001">Etkileşimli: Venn şemasını kendin kur</summary>
    <div class="kt-kart-govde" data-kt-dinamik><canvas id="canvas-venn" width="600" height="400"></canvas>…</div>
  </details>
  <section class="kt-tekrar" id="tekrar-b01">
    <h2 id="h0030">Bölüm Tekrar ve Değerlendirme</h2>
    <div class="kt-quiz" id="quiz-b01" data-kt-veri="assets/data/bolum-01.quiz.json"></div>
    <script type="application/json" id="flash-b01">[{"on":"Küme","arka":"…"}]</script>
  </section>
  <iframe src="assets/embed/sekil-1-9-3b.html" sandbox="allow-scripts" width="800" height="500" loading="lazy" title="3B koordinat"></iframe>
  <section class="kt-dipnotlar">
    <aside class="kt-dipnot" id="not0004"><p id="p0091">Dipnot metni …</p></aside><!-- numara ve ↩ geri-dön okunu runtime basar -->
  </section>
</section>
```

Zorunlu: tek kök `section.kt-bolum` (`data-kt-bolum` = manifest id); ilk çocuk `h1[id]`; dipnotlar
referans edildikleri bölümün `section.kt-dipnotlar`'ında (runtime bunları popover olarak da gösterir; dipnot
numarasını ve ↩ geri-dön okunu runtime basar, pakette bulunmaz). Numaralı eşitlikte numara `span.kt-eq-no`
içindedir ve `data-kt-eq` zorunludur (runtime git/geri dön ve numara basımı buna bakar).

## 5. Id kuralları

**Şema `{tur}{sıra}` — paket genelinde benzersiz, bölüm öneki YOK.** Gerekçe: bölümler sonraki sürümde
bölünebilir/birleşebilir (doğrulayıcı 20.000 düğümde "böl" uyarısı verir); id'ye bölüm gömülürse her bölme
öğrenci notlarını koparır. Bölüm üyeliği dosyadan gelir; doğrulayıcı blok→bölüm indeksini üretir.
Hocanın üretim aracı zaten kitap-genel numaralıyor (`paragraf-0001`) — bu, o alışkanlığın resmileşmesidir.

| Öğe | Kod | Örnek |
|---|---|---|
| `h1–h4` | `h` | `h0012` (seviyeden bağımsız tek sayaç; İçindekiler hedefi) |
| `p` | `p` | `p0412` |
| `li` | `li` | `li0088` |
| `blockquote`, `dt`, `dd`, `td`, `th`, `summary`, `pre` | `bq`, `dt`, `dd`, `td`, `th`, `sum`, `pre` | `td0007` |
| Denklem (`p.kt-esitlik`) | `eq-<bölüm>-<no>[-o<tekrar>]` | `eq-2-2-o2` — aynı numaranın ikinci basımı, hatırlatma ve **başka bölümden alıntı** `-oN` alır; `<math>` id taşımaz. Eski-biçim dönüşümden gelen `eq-2-2-1` (`-k`) deseni kalıcılık için korunur; doğrulayıcı iki deseni de kabul eder |
| Numarasız blok denklem | `eqx` | `eqx0001` (`data-kt-eq`/`.kt-eq-no` yok) |
| Daima açık kutu (`div.kt-kutu`) | `kutu` | `kutu0001` |
| `figure` / `figcaption` | `sek` / `sek…-alt` | `sek0001`, `sek0001-alt` |
| `table` | `tab` | `tab0002` |
| `details.kt-kart` | `kart` | `kart0007` |
| Dipnot / referansı | `not` / `notref` | `not0004`, `notref0004` |
| Kaynakça maddesi | `kay` | `kay0021` |
| JS'in bağlandığı diğer elemanlar (canvas, button, input) | serbest, ASCII, benzersiz | `ml2-run` |

Kurallar: (1) **her metin bloğu id taşır** (`p, h1–h6, li, td, th, figcaption, blockquote, dt, dd, summary,
pre`) — eksikse doğrulayıcı üretir ve uyarır (`KKP-ID-01`; üretilen id'ler sonraki sürümde korunmalı); (2) paket genelinde benzersiz → `KKP-ID-02`; (3) regex `^[a-z][a-z0-9-]*$`,
sıra en az 4 hane → `KKP-ID-03`; (4) Türkçe karakter/büyük harf/boşluk yasak; (5) **kalıcılık:** yeni
sürümde mevcut id'ler korunur, yeni blok en büyük sıradan devam eder, silinen id yeniden kullanılmaz —
id kimliktir, konum değil; (6) iç ve çapraz link tek biçim `href="#id"` — dosya adı taşıyan `href` yasak
(`KKP-LNK-02`); hedef paket içinde yoksa uyarı (`KKP-LNK-01`; K26 — link kalır, okuyucu "hedef bulunamadı" der); (7) `data-kt-dinamik` kapsayıcısı içindeki
metin JS ile yeniden yazılabilir; buraya id verilmez, highlight yapılamaz; statik blokların `innerHTML`
ile yeniden yazılması yasak.

## 6. İzinler / yasaklar

| Konu | Karar | Kod |
|---|---|---|
| Inline yürütülebilir `<script>` (type yok / `text/javascript` / `module`) | **Düzeltilir:** doğrulayıcı `assets/js/inline-NN.js`'e taşır, rapora yazar (içerik yine `KKP-JS-02` taramasından geçer) | `KKP-JS-01` (uyarı) |
| `<script type="application/json">` veri bloğu | Serbest (çalışmaz, CSP'ye takılmaz) | — |
| Inline `<style>` bloğu | **Düzeltilir:** `assets/css/inline-NN.css`'e taşınır, rapora yazar | `KKP-CSS-01` (uyarı) |
| `style=""` özniteliği | Serbest; > 1.000 uyarı | `KKP-CSS-W1` |
| `javascript:`, `<base>`, `<meta>`, `<link>`, `<form action>`, `target=_top/_parent/_blank`, `<object>/<embed>/<applet>`, `<template>` içi script | Yasak | `KKP-HTML-0x` |
| `on*=` satır içi olay yöneticisi (`onclick="…"`) | **Düzeltilir (05.09):** öznitelik atılır, elemana `data-kt-olay="N"` verilir, bölüm/embed başına `assets/js/olay-NN.js` (embed: `embed-inline-<slug>-olay.js`) dosyasında `addEventListener` ile bağlanır (`this` = eleman, `event`, `return false` → preventDefault); dosya JS taramasından geçer | `KKP-HTML-03` (düzeltildi) |
| Chrome imzası: kökte `header/footer/nav/aside/dialog` ile birlikte `#reader-toolbar`, `.probar`, `.reader-*`, `reader*.js`, `pro-reader*`, `localStorage` kullanan kabuk kodu | Yasak | `KKP-CHR-01` |
| CSS'te `#book` seçicisi (eski okuyucu kökü) | **Düzeltilir:** `.kt-bolum`'a çevrilir (`KKP-CSS-09`); HTML'de `id="book"` serbesttir | `KKP-CSS-09` |
| Dış URL — bilinen CDN allowlist'i (`cdn.jsdelivr.net`, `unpkg.com`, `cdnjs.cloudflare.com`, `fonts.googleapis.com`, `fonts.gstatic.com`) | **İndirilir:** doğrulayıcı yükleme anında dosyayı çeker, `assets/vendor/`'a koyar, referansı yeniden yazar, rapora yazar (tek dosya ≤ 5 MB, toplam ≤ 30 MB; ESM importmap grafiği esbuild ile tek dosyaya paketlenir) | `KKP-NET-W1` |
| Dış URL — allowlist dışı host, indirilemeyen dosya, `data:` ≥ 4 KB, çalışma zamanında ağ isteyen kod (`fetch` vb.) | **Red**; tek istisna MathML `xmlns` | `KKP-NET-01` |
| `<iframe>` | Yalnız `src="assets/embed/*.html"` + `sandbox` özniteliği zorunlu; embed **tam belge**dir ve kendi `<meta>`, `html/body` seçicili inline `<style>`, `position:absolute/fixed` kullanabilir (ayrı belge — fragment kuralları uygulanmaz); JS/ağ kuralları aynen geçerli; importmap yalnız göreli | `KKP-EMB-01` |
| ES modülleri | `<script type="module" src="assets/js/…">` ve göreli `import` serbest; bare specifier yalnız embed içi göreli importmap | `KKP-JS-05` |
| JS API'leri: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource`, `sendBeacon`, `indexedDB`, `document.cookie`, `serviceWorker`, `window.top/parent/open`, `postMessage`, `location.*`, `history.*`, `eval`, `new Function`, `importScripts`, `import(`, `document.write`, `window.name` | Bölüm/embed JS'inde **hata** (regex; asıl kilit sandbox+CSP, lint hijyen); `assets/js/vendor/` kütüphanelerinde yalnız **uyarı** (`KKP-JS-W3` — kütüphane içindeki dize çalışma zamanında CSP'ye takılır, paket reddedilmez) | `KKP-JS-02` / `KKP-JS-W3` |
| `localStorage` / `sessionStorage` | **Uyarı (05.09):** sandbox'ta (opak origin) erişim SecurityError fırlatır; okuyucu runtime'ı (`runtime/bellek.ts`) bölüm belgesinde, doğrulayıcının enjekte ettiği `assets/js/kt-bellek.js` embed belgesinde (yalnız embed JS'i depo kullanıyorsa, `<head>`'in ilk script'i) **oturum içi bellek taklidi** verir — kayıt sayfa yenilenince silinir. Vendor'da sessiz | `KKP-JS-W4` |
| `document.querySelector/getElementById`, `DOMContentLoaded`, document-level delegasyon, `window.*` global | Serbest (tek belge = tek bölüm) | — |
| `<canvas>`, inline `<svg>` (script'siz), `<details>`, `<dialog>`, paket içi `<audio>/<video>` | Serbest | — |
| MathML + `<annotation encoding="application/x-tex">` | Korunmalı; annotation yoksa uyarı | `KKP-MATH-W1` |
| `<img>` | `width`, `height`, `alt` zorunlu | `KKP-IMG-01` |
| CSS: `html/body/:root` seçicisi, `@import`, `position:fixed|sticky`, `zoom`, `content-visibility`, `scroll-behavior`, dış `url()` | Yasak | `KKP-CSS-02..08` |
| CSS kapsam | Tüm seçiciler `.kt-bolum` altında; `#book` yok | `KKP-CSS-09` |
| **Tema — PLATFORMUNDUR (Hasan 02.09).** Paket tema kuralı YAZMAZ (`body.dark`, `.sepia`, `.reader-theme-*`, `[data-theme]`, `prefers-color-scheme`, `html[data-kt-theme]` kuralı yok); renk/zemin/çizgi için yalnız platform token'ları `--kt-bg --kt-fg --kt-muted --kt-surface --kt-border --kt-accent --kt-font-metin --kt-font-baslik --kt-font-math --kt-olcek` (light/dark/sepia değerlerini okuyucu verir; `--kt-olcek`'i okuyucu kök `font-size`'a uygular, paket CSS'i kullanmaz) | Tema kuralı gelirse doğrulayıcı `html[data-kt-theme=…]` biçimine çevirip **uyarır**; token yerine sabit renk (`#fff`, `rgb()`, `white`…) **uyarı** (koyu temada bozuk görünebilir) | `KKP-CSS-W3` / `KKP-CSS-W4` |
| `!important` | > 500 uyarı | `KKP-CSS-W2` |
| Fontlar | `assets/fonts/*.woff2` + göreli `@font-face`; Google Fonts referansı indirilir, başka dış font red | `KKP-NET-W1` / `KKP-NET-01` |
| Üretim meta artığı (`data-source`, `data-legacy-id`, `data-editorial-review`, `data-equation-duplicate-status`, boş `section-marker`) | Uyarı | `KKP-META-W1` |
| Sınıf önekleri `kt-kabuk-*`, `kt-rt-*` | Rezerve | `KKP-HTML-09` |

## 7. JS sözleşmesi (bilinçli minimal)

- Bölüm JS'i klasik IIFE; `boot()` idempotent (`data-kt-hazir` bayrağı), `readyState` kontrolü +
  `DOMContentLoaded` + `kt:hazir` üçüyle tetiklenir (okuyucu fragment'ı sonradan takabilir); her
  `querySelector` sonucu null-guard'lı. `window.kt` yalnız okuyucuda vardır — `if (window.kt)` ile korunur.
- Platform runtime'ı bölüm JS'inden **önce** yüklenir ve `window.kt = { git(id), bolum, tema, olcek }`
  sağlar. Navigasyon `kt.git("eq-2-2")` ya da `<a href="#eq-2-2">` — ikisini de runtime çözer (hedef
  başka bölümdeyse kabuk bölümü değiştirir).
- Runtime'ın sağladığı ortak davranışlar paket tarafından **yeniden yazılmaz**: denklem-ref git/geri dön,
  dipnot popover + gidiş-dönüş, `figure img` lightbox, `details.kt-kart` dış-tık kapanışı, tema/ölçek.
- Paket JS'inin `document.body`'ye eklediği eleman (dialog, katman) runtime tarafından `section.kt-bolum` içine
  yönlendirilir (27.09.2026, `runtime/katman.ts`): CSS bölüme kapsandığından body'deki eleman stilsiz kalırdı. Paket
  yine de dialog'u doğrudan `.kt-bolum` içine eklemelidir (önizleme ve başka ortamlar); `kt-rt-*` sınıflı ve
  `data-kt-rt` işaretli elemanlar runtime'ındır, body'de kalır.
- Veri: `assets/data/*.json` (`data-kt-veri`) ya da inline `type="application/json"`. Önerilen şemalar:
  quiz `{"tur":"quiz","sorular":[{"id","soru","secenekler":[],"dogru":0,"aciklama"}]}`,
  flash `{"tur":"flash","kartlar":[{"id","on","arka"}]}` — v1'de motor kitap JS'inde; platform modülü Faz C.
  **Errata (05.09):** paket JS'i ağ isteği yapamadığından `data-kt-veri` dosyasını bugün hiçbir motor okuyamaz — veri
  inline JSON bloğunda taşınır; `data-kt-veri`/manifest `veri` Faz C platform motoru için rezerve. Motor paketin kendisindedir
  (talimat v1.6: üretici kendi quiz/kart motorunu yazar; şart olanlar üretim talimatı kural 7'nin beş maddesi). Kitappta'nın kendi
  aracı `scripts/kkp/sablon/ortak.js` + `kitap.css` şablonlarını kullanır (skill kuralı, standart dayatmaz). Okuma sütunu paketindir
  (`kitap.css` kök kuralı `.kt-bolum{max-width}`).
- **Platform notu (01.10.2026, [Plan 32](../plans/32-quiz-izleme.md)) — paket biçimi değişmedi, v1 paketler aynen yüklenir.** Kitappta şablon
  yapısındaki quiz'i platform yönetir: `script#<quiz>-veri` servis anında belgeden çıkarılır (cevap anahtarı okuyucuya gitmez; puanlamayı
  sunucu yapar, doğru şık + açıklama öğrenci cevabını gönderdikten sonra döner), `div.kt-quiz` `data-kt-motor` + `data-kt-quiz` alır; paket
  motoru `data-kt-motor` bayrağına uymalıdır (bayrağı görünce o bileşeni kurmaz — şablon motoru böyledir). Koşullar: fieldset'ler
  `div.kt-quiz`'in doğrudan ve bitişik çocukları, quiz başına ≤ 200 soru (bölümde toplam ≤ 500), soru başına 2–16 şık, her
  `ul.kt-secenekler > li` içinde tek radio ve `value` = şık indeksi (0'dan), JSON `sorular[].id` = `fieldset` id'si, `data-kt-veri` yok.
  Koşulları sağlamayan quiz yönetilmez: paketin kendi motoruyla eskisi gibi çalışır. Soru ve şık sırası her açılışta karışır — soru, şık
  ve açıklama metninde şık harfine ya da konumuna atıf yapılmaz (üretim talimatı kural 7). `data-kt-quiz` platformundur; pakette yazılmışsa
  servis anında silinir. Kavram kartı motoru pakette kalır; platform yalnız `li.kt-flash-kart[id]` üzerindeki `kt-aktif` / `kt-cevrik`
  sınıf değişimini gözler (kart `p.kt-flash-on` + `p.kt-flash-arka` taşımalıdır).

## 8. Sınırlar (`packages/contracts` `PAKET_*` sabitleri)

| Sınır | Değer |
|---|---|
| Zip | ≤ 100 MB (öneri ≤ 60 MB, görseller webp) |
| Açılmış toplam | ≤ 400 MB; sıkıştırma oranı toplam > 200:1 ya da tek dosya > 100:1 → red |
| Dosya sayısı | ≤ 2.000; bölüm ≤ 60; iç içe zip yasak |
| Bölüm HTML | ≤ 1,5 MB (uyarı ≥ 600 KB); DOM ≤ 40.000 düğüm (uyarı ≥ 20.000 → "bölümü ikiye böl") |
| Tek medya | ≤ 4 MB (uyarı ≥ 800 KB); toplam medya ≤ 300 MB |
| JS | tek ≤ 1 MB (vendor ≤ 1,5 MB), toplam ≤ 5 MB; CSS toplam ≤ 1 MB |
| Öksüz dosya | uyarı; S3'e yazılmaz |

## 9. Doğrulama hata kodları

| Kod | Anlam | Çözüm ipucu |
|---|---|---|
| `KKP-ZIP-01..04` | zip-slip yolu / yinelenen ad / iç içe zip / oran-boyut-adet aşımı | adı düzelt, kopyayı sil, medyayı küçült |
| `KKP-MAN-01..05` | manifest yok / şema / bölüm dosyası yok / id tekrarı / icindekiler hedefi yok (05: düzeltildi + uyarı — madde düşürülür, alt maddeleri bir seviye yukarı alınır; hiç madde kalmazsa `KKP-MAN-W3` ile h1/h2'den üretilir) | manifest'i şemaya göre düzelt |
| `KKP-HTML-01..09` | kök tek `section.kt-bolum` değil / yasak etiket / yasak öznitelik / `data-kt-bolum` ≠ manifest / iframe kuralı / rezerve sınıf | fragment'a çevir, etiketi kaldır |
| `KKP-ID-01/02/03` | blok id eksik / tekrar / biçim | `{tur}{NNNN}` ver |
| `KKP-LNK-01/02` | `#hedef` yok (uyarı; dosya adlı `href`'in hedefi çözülemiyorsa da uyarı, bağlantı yeniden yazılmaz) / dosya adlı href (düzeltildi) | id'ye göre bağla |
| `KKP-JS-01/02/05` | inline script / yasak API / bare import | dosyaya taşı, API'yi kaldır |
| `KKP-CSS-01..09` | inline style bloğu / yasak seçici-özellik / kapsam dışı | `assets/css/`'e taşı, `.kt-bolum` altına al |
| `KKP-CSS-W3` / `KKP-CSS-W4` | paket tema kuralı taşıyor (çevrildi) / token yerine sabit renk | tema yazma; `var(--kt-*)` kullan |
| `KKP-NET-01` / `KKP-NET-W1` | allowlist dışı dış URL (red) / bilinen CDN indirildi (uyarı) | kütüphaneyi `assets/js/vendor/`'a göm ya da bilinen CDN kullan |
| `KKP-IMG-01` | width/height/alt eksik | dosyadan oku, alt yaz |
| `KKP-EMB-01` | embed dışı iframe / sandbox yok | `assets/embed/` + `sandbox="allow-scripts"` |
| `KKP-REF-01` | referans edilen dosya zip'te yok | dosyayı ekle |
| `KKP-*-W*` | uyarılar: öksüz dosya, `!important`, `style=""` sayısı, DOM boyutu, meta artığı, annotation eksik, id koruma oranı < %80 | rapor; yükleme engellenmez |
| `KKP-ZIP-05` / `KKP-ZIP-06` | dosya adı/yerleşim düzeltildi (ASCII küçük harf, derinlik > 4 düzleştirme, `assets/` dizin↔uzantı taşıma) / yerleştirilemeyen dosya (izinsiz uzantı `ttf/otf/pdf`, kökte yabancı dosya) **uyarı**: dosya pakete yazılmaz, referanslıysa `KKP-REF-01` | woff2 kullan, dosyayı `assets/` altına koy |
| `KKP-JS-W4` | bölüm/embed JS'i `localStorage`/`sessionStorage` kullanıyor — oturum içi bellek taklidi (kalıcı değil) | kalıcı kayıt gerekmiyorsa değişkende tut |
| `KKP-JS-W3` | `assets/js/vendor/` kütüphanesinde yasak API dizesi (`fetch`, `Function(` …) — uyarı; bölüm/embed JS'inde aynı şey `KKP-JS-02` hatadır | kütüphanenin ağsız alt kümesini paketle (tree-shake) ya da uyarıyı kabul et |
| SVG dosyaları | `assets/media/*.svg` **XML** olarak taranır (saxes): `DOCTYPE`/DTD/işleme yönergesi, iyi biçimsiz XML, her namespace'te `script`/`foreignObject`, XHTML elemanı → `KKP-HTML-02`; `on*`/`javascript:`/dış `href` → `KKP-HTML-03`/`KKP-NET-01`; `<style>` ve `style=""` CSS kurallarından geçer | SVG'yi temiz vektör olarak dışa aktar |
| `KKP-LIM-01` / `KKP-LIM-W1` | §8 sınırı aşıldı (bölüm/medya/JS/CSS/embed boyutu, DOM derinliği > 1.024 → parse edilmez) / uyarı eşiği (≥ 600 KB, ≥ 20.000 düğüm) | bölümü böl, medyayı küçült |
| `KKP-CSS-10` | CSS ayrıştırılamadı (söz dizimi hatası) — kapsam/ağ kuralları uygulanamadığından dosya reddedilir (tarayıcı hataya toleranslıdır, doğrulayıcı değil) | CSS'i düzelt (`postcss` ile ayrıştırılabilir olmalı) |
| `KKP-LNK-W3` | `<a href>` dış bağlantı (kaynakça DOI/URL) — kaynak yüklemez, sandbox tıklamayı kısıtlar | serbest; yalnız uyarı |
| `KKP-HTML-05` | iframe sandbox kaçışı (`allow-same-origin`, `allow-top-navigation`, `allow-popups`, `srcdoc`) | `sandbox="allow-scripts"` |

**Doğrulayıcı uygulama notları (02.09, `packages/kkp`):** (a) `<script type>` değeri tarayıcının JS saydığı her tip
(`text/jscript`, `application/x-javascript`, parametreli/bilinmeyen tip …) çalışır sayılır → taşınır + taranır; yalnız bilinen
veri blokları (`application/json`, `application/ld+json`, `text/plain` …) yerinde kalır. (b) Kök `header/footer/nav/aside`
chrome imzası (`KKP-CHR-01`) yalnız kabuk id/sınıflarıyla (`#reader-toolbar`, `.reader-*`, dosya adı `reader*.js` /
`pro-reader*`) birlikte hata sayılır; `screenreader.js` gibi adlar ve içerikte meşru `<aside class="kt-dipnot">` serbesttir;
CSS `#book` → `.kt-bolum` (`KKP-CSS-09` düzeltildi), HTML `id="book"` serbest. (e) K26 gereği kırık iç link (`KKP-LNK-01`)
**uyarıdır** (link kalır, okuyucu hedef bulamazsa "hedef bulunamadı" der); İçindekiler hedefi yoksa madde düşürülür
(`KKP-MAN-05` düzeltildi + uyarı). Bilinen CDN'den inen ESM modül (bölümde ve embed'de) esbuild ile IIFE'ye paketlenir; göreli kardeş import'lar CDN'e
göre çözülür, allowlist dışına çıkan kardeş `KKP-NET-01` (istek atılmaz); pakete gelen `assets/js/vendor/` ESM'i yalnız manifest
listesindeyse paketlenir. (f) `KKP-JS-02` köşeli erişim `top/parent/opener['location'|'document'|'postMessage'|'frames'|'history']`
biçimlerini de yakalar. (g) `data:` URI gövdesi tarayıcı gibi çözülür (yüzde-çözüm → boşluk atma → base64 alfabe denetimi);
tarayıcının yüklemeyeceği gövde "çözülemedi" sayılır. (h) CLI'ya birden fazla paket verilirse kullanım hatası, çıkış 2. (c) `assets/js/vendor/` dosyaları da §6 JS API taramasından
geçer ama isabet **uyarıdır** (`KKP-JS-W3`, 02.09 kararı); bölüm/embed JS'inde hata. (d) Sınırlar (`PAKET_SINIRLARI`):
parse öncesi derinlik kestirimi ≤ 1.024, kapanmamış biçimlendirme elemanı ≤ 300, parse sırasında eleman ≤ 40.000,
manifest iç içe derinlik ≤ 32 / anahtar ≤ 5.000, CDN indirme ≤ 200 istek (≤ 10 başarısız), CSS `@import` zinciri ≤ 8.

## 10. `sample_book` → kkp/1 dönüşümü (ilk paketi biz üretiriz — `scripts/kkp/sample-donustur.mjs`)

Ölçülen gerçek (02.09): `index.html` 2,8 MB / 12.685 satır; 2.461 `<p>` (1.227'si `paragraf-NNNN`, gerisi
başka id şemaları ya da id'siz), 61 `<style>`, 31 `<script>`, 6 `h1.kt-chapter-title`, 21 `<article>`,
1 iframe (3B şekil, `cdn.jsdelivr` importmap'li three.js), 6 JSON quiz/flash bloğu, 0 dış font.

1. **Kes:** `main#book` içi → 6 `h1.kt-chapter-title` sınırından 6 bölüm + ön sayfalar (kapak/künye/logo/
   `nav.toc` hariç) + `section#kaynakca` = 8 fragment. `chapter-divider-title`, boş `section-marker`,
   `chapter-route-v13` atılır. `section#footnotes` dağıtılır: her dipnot referans edildiği bölümün
   `section.kt-dipnotlar`'ına.
2. **Chrome at:** `header#reader-toolbar`, toast/backdrop/sidebar/dialog'lar/`#selectionGoogle`/footer/
   `#settingsPopupFinal`/page-float, `#legacyCompatOnly`; `reader.js`, `pro-reader.js`,
   `reader-chrome-autohide.js`, `enhance.css`; inline `v245-*`, `optimizedReaderBehaviorFinal`,
   `hoverTocBehaviorFinal`, `kitapptaImageRuntimeV4`, `kitapptaFastNavZoomV5`, `v145/v146 toc-sync`.
3. **Id yeniden yaz:** `paragraf-NNNN` → `pNNNN` (paket-genel, sıralı), Türkçe başlık slug'ları → `hNNNN`,
   `sekil-N` → `figure#sekNNNN` + `-alt`, `eq-N-N(-k)` korunur, `kart-NNN` → `kartNNNN`,
   `fnN/fnrefN` → `notNNNN/notrefNNNN`; id'siz `<p>`'ler ve lab `h3`'leri id alır; tüm `href="#…"`,
   `data-target-id`, `data-book-target` haritayla güncellenir; üretim meta öznitelikleri silinir.
4. **CSS topla:** `book-design-system` + `professional-typesetting` + `interactive-vibrant-v299` +
   `responsive-universal`'ın `#book` kısmı + `pro-reader.css`'in tipografi kuralları + içerik inline
   blokları → `assets/css/kitap.css`; `chapterN-*.css` → `bolum-0N.css`. Sed: `#book` → `.kt-bolum`;
   `body.dark|body.reader-theme-dark` → `html[data-kt-theme="dark"]`; `.sepia` → `…="sepia"`; (`:is(...)` içindeki tema sınıfları tema başına çoğaltılır — eski-biçim paket için TOLERANS; yeni kitaplarda tema kuralı olmaz, renkler token'dır);
   `.kt-ux-v278|.kt-ui-v279` gate'leri silinir; `html/body/:root`, `position:fixed`, `content-visibility`,
   `scroll-behavior` satırları silinir; `--top-h/--bottom-h` bağımlılıkları kaldırılır (paket CSS'i `--kt-olcek` KULLANMAZ — ölçeği okuyucu kök `font-size`'a uygular; `px` boyutlar `rem`'e çevrilir).
5. **JS topla:** `chapterN-interactions.js` + `chapter4-complete.js` + `chapter4-review-standard.js` +
   inline lab motorları → `assets/js/bolum-0N.js` (bölüm başına tek IIFE, her `$()` null-guard'lı);
   `history.replaceState` silinir; `.kt-review-link[data-book-target]` → `<a class="kt-git" href="#hNNNN">`;
   `auto-close-cards-v92`, `equation-navigation-v96`, `interactive-stability-v299.js` atılır (runtime sağlar).
6. **Veri:** JSON quiz/flash blokları yerinde kalır (serbest).
7. **3B şekil:** `sekil_1_9_3b_koordinat.html` → `assets/embed/sekil-1-9-3b.html`; three.js ESM-only →
   `esbuild --bundle` ile `assets/js/vendor/three-sekil19.js` (~650 KB) **ya da** MVP'de PNG
   (`verified/figure_1_9.png` pakette var, bugün referanssız) — Hasan kararı (Plan 12 soru 6).
8. **Görseller:** `width/height` dosyadan, eksik `alt`'lar; `alt`'taki bing URL'leri (23) temizlenir;
   logo (523 KB) ve referanssız `figure_1_10.png`/`sekil_1_10_dinamik_grafikler.html` atılır.
9. **manifest.json** üret (8 bölüm; icindekiler `nav.toc` linklerinden); `kkp-lint` → 0 hata; zip;
   test S3'e `kitaplar/_referans/` altına referans paket olarak yükle. `sample_book/` git'e girmez.

Üretim talimatı (hocanın AI'ına verilecek metin): [kkp-v1-uretim-talimati.md](kkp-v1-uretim-talimati.md).
