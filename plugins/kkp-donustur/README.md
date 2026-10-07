# kkp-donustur — hazır kitabınızı Claude Code ile Kitappta'ya taşıyın

ChatGPT ya da Claude ile hazırladığınız etkileşimli kitabı, Kitappta'ya yüklenebilen pakete (kkp/1) kendi bilgisayarınızda çevirirsiniz;
işi **Claude Code** adlı yapay zekâ aracı yapar, siz yönlendirir ve onaylarsınız. Kitabınızın hiçbir etkileşimi atılmaz (laboratuvar, test,
kart, dipnot penceresi, gömülü uygulama); çıkan tek şey menü, arama, tema düğmesi gibi Kitappta okuyucusunun zaten verdiği çerçevedir.
Word dosyası vermek isterseniz Kitappta editörü paketi sizin yerinize üretir; bu kite gerek kalmaz. Sürüm: kural seti v2.4 · kit 07.10.2026 (v0.5.0).

## Gerekenler

| Ne | Neden | Nereden |
|---|---|---|
| Claude aboneliği (Pro ya da Max) | Claude Code ücretsiz planla çalışmaz | claude.ai → hesap ayarları |
| Claude Code | Kitabı çeviren yapay zekâ aracı | claude.ai/code ya da aşağıdaki komut |
| Node.js 20 ya da üstü (LTS) | Çevirme araçları Node ile çalışır | nodejs.org → "LTS" |
| git | Kiti GitHub'dan kurmak ve güncellemek için | Mac: Terminal'de `git` yazınca kurulumu önerir; Windows: git-scm.com |

İlk çalıştırmada araçlar bir Chromium indirir (yaklaşık 150 MB, bir kez). Bir kitap 10–40 dakika sürer. Windows'ta klasör yolunda
Türkçe karakter ve boşluk olmasın (örnek `C:\Kitappta\maliye`).

## Kurulum (bir kez)

1. **Node.js:** nodejs.org'dan LTS kurun. Kontrol: terminalde `node --version` → `v20` ya da üstü.
2. **git:** Mac'te `git --version` (yoksa çıkan pencereden kurun); Windows'ta git-scm.com.
3. **Claude Code:** Mac'te `curl -fsSL https://claude.ai/install.sh | bash`; Windows PowerShell'de `irm https://claude.ai/install.ps1 | iex`.
   Kontrol: yeni terminalde `claude --version`.
4. **Giriş:** terminale `claude` yazın, tarayıcıda claude.ai hesabınızla giriş yapın.
5. **Kit:** Claude Code sohbetine sırayla:
   ```
   /plugin marketplace add kitappta/kitappta-kit
   /plugin install kkp-donustur@kitappta-kit
   ```
   İkisi de "Successfully" ile bitmeli; Claude Code'u kapatıp yeniden açın.
6. **Kontrol:** `/plugin` → **Installed** → `kkp-donustur@kitappta-kit` listede. Artık `/kkp-donustur` komutu vardır.

Git kuramadıysanız: Kitappta ekibinden `kkp-donustur.zip` isteyin, içindeki `kkp-donustur` klasörünü `~/.claude/skills/` altına
(Windows: `C:\Users\<adınız>\.claude\skills\`) koyun, Claude Code'u yeniden açın. Güncellemeleri de zip olarak alırsınız.

## Kitabınızı çevirme

1. Boş bir klasör açın (örnek `Kitappta/maliye`), kitabınızın zip'ini ya da klasörünü içine koyun.
2. Terminalde o klasöre girin, `claude` yazın.
3. Sohbete `/kkp-donustur kitabim.zip` yazın. İlk seferde araçlar kurulur.
4. **Envanteri onaylayın:** Claude etkileşimleri sayıp tablo gösterir (kaç laboratuvar, test, dipnot, gömülü uygulama, kart).
   Sayıları kontrol edin; eksik varsa "şu da var, ekle" deyin; doğruysa "onaylıyorum". Onaysız üretime geçmez.
5. Claude kitabı tarayıcıda açıp son halini alır, paketi kurar, Kitappta'nın doğrulayıcısından geçirir, kaynakla karşılaştırır.
   Bir şeyi taşıyamazsa silmez, sorar; "kaybı kabul et" değil "bul ve taşı" deyin.
6. Çıktı `kkp-calisma/` altında: `<kitap>-kkp.zip` ve `URETIM-NOTU.md` (envanter, taşınamayanlar, doğrulayıcı çıktısı, sorular).

Yüklemeden önce kendiniz de gezebilirsiniz: Claude'a "önizlemeyi masaüstüne kopyala" deyin, `onizleme.html`'i çift tıklayıp zip'i
sürükleyin; laboratuvar, test, kart ve koyu temayı deneyin; Sorunlar şeridi boş olmalı.

## Yeni kitap yazıyorsanız (Word, ders notu ya da sıfırdan)

Hazır bir HTML kitabınız yoksa aynı komut kitabı **doğrudan Kitappta biçiminde** kurar; çevirme adımı olmaz, kayıp da olmaz.
1. Boş bir klasörde `claude` açın; metniniz Word'deyse `.txt` olarak kaydedip klasöre koyun ya da sohbete yapıştırın; görselleri de koyun.
2. `/kkp-donustur yeni kitap: <kitap adı>` yazın ve bölüm planınızı söyleyin. Claude metni yalın HTML'e döker, kit araçları bölümleri,
   kimlikleri ve İçindekiler'i kurar.
3. Claude her bölüm için **Bölüm Tekrar** (en az 5 soru + 8 kavram kartı) ve istediğiniz yerlere **laboratuvar kartı** (kaydırıcılı
   çizim) hazırlar. Sorular Kitappta'nın standart yapısında çıkar: cevap anahtarı öğrenciye gitmez, puanı sunucu verir, sonuçları
   panelde görürsünüz. İstemediğiniz etkileşimi "yalnız temel" diyerek kapatın.
4. Çıktı yine `kkp-calisma/` altında: `<kitap>-kkp.zip` + `URETIM-NOTU.md`; `onizleme.html` ile bölüm bölüm gezin.
5. İkinci baskıda panelden indirdiğiniz önceki paketi Claude'a verin; öğrenci notları yerinde kalır.

Metninizde olmayan hiçbir şey eklenmez: Claude formül, örnek ya da sayı uydurmaz; sorular yalnızca bölümün kendi metninden yazılır.

## Kitappta'ya yükleme

1. Panel → **Kütüphane** → kitabınız → **Paket yükle** → `<kitap>-kkp.zip`.
2. **Taslak oluştu:** kabul edildi; raporda uyarılar olabilir, red değildir.
3. **Reddedildi + rapor:** raporu olduğu gibi Claude'a yapıştırın ve ekleyin: "Panel raporu bu. Yalnız bu bulguları düzelt; başka hiçbir
   şeyi değiştirme; envanteri koru; bir bulguyu gidermek için içerik silme." Yeni zip'i yeniden yükleyin.
4. Editör paketi inceler, sürüm oluşturur, yayına alır. Yayından önce okuyucuda bir bölümü deneyin.

**Yeni baskı:** önceki paketi panelden indirip ("Düzeltilmiş paketi indir") yeni kaynağınızla Claude'a verin: "ikinci baskı, önceki paket
ekte". Paragraf kimlikleri korunur, öğrenci notları yerinde kalır.

## Güncelleme ve sorun giderme

- Güncelleme: `claude plugin update kkp-donustur@kitappta-kit`, sonra Claude Code'u yeniden açın. Otomatik güncelleme: `/plugin` →
  **Marketplaces** → kitappta-kit → **Enable auto-update**.

| Belirti | Ne yapmalı |
|---|---|
| `/kkp-donustur` yok | Claude Code'u kapatıp açın; `/plugin` → Installed'da yoksa kurulum 5. adımı tekrarlayın |
| "node bulunamadı" | Node.js LTS kurun, terminali kapatıp açın |
| Chromium inmiyor | Claude'a "makinedeki Chrome'u kullan" deyin (araçlar `--tarayici chrome` ile çalışır) |
| Claude "kayıp var / taşıyamadım" diyor | "Atma, bul" deyin; çözülmezse üretim notuyla Kitappta ekibine yazın |
| Panel yine reddetti | Raporu tam yapıştırın, "içerik silme" deyin; envanteri önceki notla karşılaştırın |
| Çok uzun sürüyor | Büyük kitapta normaldir; 40 dakikayı geçerse "nerede kaldın" diye sorun |

## Gizlilik ve destek

Kitabınızın dosyaları bilgisayarınızda kalır; Kitappta sunucusuna yalnız sizin yüklediğiniz zip gider. Claude Code, kitabı okuyup
çevirmek için metni Anthropic'in Claude servisine gönderir (aboneliğinizin koşullarına tabidir). Kit hiçbir şeyi otomatik yüklemez,
hesap bilgisi istemez; kaynak klasörünüz değiştirilmez, her şey `kkp-calisma/` altına yazılır. Destek: sorunuzu, `URETIM-NOTU.md`
dosyasını ve varsa panel raporunu ekleyerek Kitappta ekibine yazın.
