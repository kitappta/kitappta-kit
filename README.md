# kitappta-kit — Kitappta yapay zekâ kitleri (Claude Code plugin marketplace)

Hocaların ve editörlerin kendi Claude Code'larına kurduğu Kitappta araçları.

| Plugin | Ne yapar | Kur |
|---|---|---|
| **kkp-donustur** | Hazır etkileşimli HTML kitabı (ChatGPT/Claude ile yapılmış) Kitappta **kkp/1** paketine kayıpsız çevirir: envanter → onay → pişirme → dönüşüm → doğrulama → kanıt → zip. Word, ders notu ya da sıfırdan yazılan metinden **yeni kitabı** da doğrudan kkp/1 biçiminde üretir (iskelet → Bölüm Tekrar + lab kartı → doğrulama → zip) | `/plugin marketplace add kitappta/kitappta-kit` · `/plugin install kkp-donustur@kitappta-kit` |

Ayrıntı: [plugins/kkp-donustur/README.md](plugins/kkp-donustur/README.md). Kural seti (yapay zekâya verilen tam metin):
[plugins/kkp-donustur/skills/kkp-donustur/kural-seti.md](plugins/kkp-donustur/skills/kkp-donustur/kural-seti.md).

Gereksinim: Claude Code (Pro/Max), Node.js 20+. Kaynak: Kitappta monorepo (`scripts/kkp/hoca-agent-kiti-uret.mjs` üretir; burada elle düzenlenmez).
