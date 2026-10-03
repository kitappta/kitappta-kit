# Üretim notu — <kitap adı> — <baskı: 1 | 2 …> — <tarih>

Bu dosya pakete GİRMEZ; zip'in yanında teslim edilir (paneldeki yükleme raporuyla birlikte okunur).

## Girdi
- Kaynak: `<dosya.docx>` (Word) · pandoc <sürüm> · dönüştürücü `scripts/kkp/kaynak-donustur.mjs` <sürüm>
- Önceki baskı: `<yok | v1.zip>` · Yazar değişiklik notu: `<yok | özet>`

## Çıktı
- Bölümler: `<NN-slug.html …>` (adet) · id sayıları: h <n> · p <n> · li <n> · eq <n> (+eqx <n>) · sek <n> · tab <n> · not <n> · kutu <n> · kart <n>
- Etkileşim: her bölümde Bölüm Tekrar (quiz <n> soru, flash <n> kart); lab kartları: `<bNN kartXXXX: ne yapar>`
- Görseller: <n> adet, biçim <webp|png>, en büyük <KB>; dönüştürülemeyen: `<yok | liste>`

## Öz-denetim (kural 10)
(a) tek kök / ilk h1 / son kt-dipnotlar ☐ · (b) id benzersiz+biçim ☐ · (c) kırık # yok ☐ · (d) inline style/script yok ☐ · (e) dış URL yok ☐
(f) img width/height/alt ☐ · (g) CSS kapsam/tema/sabit renk ☐ · (h) JS yasak API yok ☐ · (i) referanssız dosya yok ☐ · (j) id koruma ≥ %80 ☐ (oran: <%>)
`kkp-lint`: hata 0 · uyarı <n> (`<kod: kısa açıklama>` …)

## Kararlar ve belirsizlikler (hocaya sorulacaklar)
- <örn. "Örnek 2.3" kutusunun kapsamı 3 paragraf mı 5 mi? (kutu0007)>
- <örn. Şekil 3.2 EMF geldi, PNG'ye elle çevrildi>

## Bilinen eksikler
- <…>

## Seslendirme
(isteğe bağlı — yapılmadıysa bu bölümü sil)
- Motor: `<ad>` sürüm `<sürüm>` · sözlük sürümleri: platform `<n>` · kitap `<n>`
- Atlanan bloklar (tür başına): `<tablo n · kart n · kaynakça n · …>`
- Toplam süre: `<sa:dk>` · toplam bayt: `<MB>`
- Kalan uyarılar: `<yok | liste>`
- Hocaya sorulacak okunuşlar: `<yok | sözlük notlar listesi>`
- Önbellekten gelen blok oranı: `<%>`
