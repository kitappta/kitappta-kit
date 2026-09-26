# Kitappta kkp-donustur — hazır kitabınızı yapay zekâ agent'ıyla Kitappta'ya taşıyın

Bu paket, ChatGPT/Claude ile yaptığınız hazır etkileşimli kitabı (tek sayfalık kitap, kendi menülü site, zip) Kitappta'ya doğrudan
yüklenebilen **kkp/1 paketine** çevirmesi için **Claude Code**'a verilen bir "skill"dir: adım adım iş sırası + araçlar + kural seti.
Kitabınızın hiçbir etkileşimi atılmaz; atılan yalnız menü, arama, tema gibi Kitappta okuyucusunun zaten verdiği çerçevedir.
Sürüm: kural seti v2.1 · kit 27.09.2026.

## Gerekenler

- **Claude Code** (masaüstü uygulaması ya da terminal) ve bir Claude aboneliği (Pro ya da Max; ücretsiz plan Claude Code'u kullanamaz).
- **Node.js 20+** (https://nodejs.org, "LTS"). Skill'in araçları Node ile çalışır.
- İlk çalıştırmada araçlar bir Chromium indirir (kitabınızı "pişirmek" için tarayıcıda açar; ~150 MB, bir kez).
- **git** (GitHub'dan kurulum için). Zip ile kurulumda gerekmez.

## Kurulum — GitHub'dan (önerilen, güncellemeler kolay)

Claude Code'u açın, sohbete şu iki komutu yazın:

```
/plugin marketplace add kitappta/kitappta-kit
/plugin install kkp-donustur@kitappta-kit
```

Güncelleme: `/plugin` → **Installed** → **Update now** (ya da terminalde `claude plugin update kkp-donustur@kitappta-kit`).
Otomatik güncellemeyi `/plugin` → **Marketplaces** → **Enable auto-update** ile açabilirsiniz.

## Kurulum — zip ile (git yoksa)

Zip'i açın; içindeki `kkp-donustur` klasörünü (içinde `SKILL.md` var) `~/.claude/skills/` altına koyun
(Windows: `C:\Users\<siz>\.claude\skills\kkp-donustur`). Claude Code'u yeniden başlatın; `/kkp-donustur` artık vardır.
Güncelleme: yeni zip'i aynı yere açın.

## Kullanım

1. Kitabınızın klasörüne (ya da zip'inin yanına) gidin, Claude Code'u orada açın.
2. Yazın: `/kkp-donustur kitabim.zip` — ya da düz Türkçe: "kitabımı Kitappta paketine çevir".
3. Claude önce **etkileşim envanterini** çıkarır ve size gösterir: kaç laboratuvar, kaç test, kaç dipnot, kaç gömülü uygulama var.
   **Sayın**, eksik varsa söyleyin; onayınız olmadan üretime geçmez.
4. Claude kitabı tarayıcıda açıp "pişirir" (kabuğun ürettiği kart, ikon, düğmeleri de alır), paketi kurar, Kitappta'nın gerçek
   doğrulayıcısından geçirir (`kkp-lint`), kaynakla eleman eleman karşılaştırır (kanıt) ve size zip + üretim notu verir.
5. Zip'i Kitappta paneline yükleyin (**Kütüphane → Paket yükle**). Panel rapor verirse raporu Claude'a yapıştırın: "yalnız bu bulguları
   düzelt, içerik silme".

## Neyi yapmaz

- Kitabınızın içeriğini "iyileştirmez", yeni soru/formül üretmez; olanı taşır.
- Kitappta sunucusuna hiçbir şey göndermez; her şey sizin bilgisayarınızda olur. Zip'i siz yüklersiniz.

## Sorun olursa

`kanit` "eleman kaybı" derse Claude'a "atma, bul" deyin: kural seti ne yapılacağını söyler (`kural-seti.md`, kural 2 ve 5).
Kitappta ekibine ulaşın; üretim notunu ve `kkp-lint` çıktısını ekleyin.
