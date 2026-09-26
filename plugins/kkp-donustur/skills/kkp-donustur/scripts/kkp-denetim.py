#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""kkp/1 öz-denetim — Kitappta doğrulayıcısının ön taraması (yalnız Python standart kütüphanesi; ağ yok).

Kullanım:  python3 kkp-denetim.py <paket-klasörü | paket.zip>
Çıkış kodu: 0 = HATA yok · 1 = HATA var · 2 = kullanım/açılış sorunu

Kesin karar Kitappta panelindeki doğrulayıcıdadır; bu script aynı hataları yüklemeden önce yakalamak içindir.
HATA satırları paketi reddettirir (sıfır olmalı); UYARI satırları kabul edilir ama üretim notunda gerekçelendirilir.
"""
import json, os, re, sys, tempfile, zipfile

KB = 1024
MB = 1024 * KB
IZINLI_HOST = ("cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "fonts.googleapis.com", "fonts.gstatic.com")
UZANTI = {
    "assets/css": {".css"}, "assets/js": {".js"}, "assets/js/vendor": {".js"}, "assets/data": {".json"},
    "assets/media": {".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".avif", ".mp3", ".m4a", ".ogg", ".mp4", ".webm", ".vtt"},
    "assets/fonts": {".woff2"}, "assets/embed": {".html"},
}
METIN_BLOK = r"p|h[1-6]|li|td|th|figcaption|blockquote|dt|dd|summary|pre"
ID_RE = re.compile(r"^[a-z][a-z0-9-]*$")
# Doğrulayıcının yasak API taramasının sadeleştirilmiş eşi (metin tarar: yorum ve dize dahil).
JS_YASAK = [
    (r"\bfetch\b", "fetch"), (r"\bnew\s+Image\s*\(", "new Image()"), (r"\bXMLHttpRequest\b", "XMLHttpRequest"),
    (r"\bWebSocket\b", "WebSocket"), (r"\bEventSource\b", "EventSource"), (r"\bsendBeacon\b", "sendBeacon"),
    (r"\bindexedDB\b", "indexedDB"), (r"document\s*\??\.\s*cookie\b", "document.cookie"), (r"\bserviceWorker\b", "serviceWorker"),
    (r"navigator\s*\??\.\s*clipboard\b", "navigator.clipboard"),
    (r"\b(?:window|self|globalThis|frames)\s*\??\.\s*(?:top|parent|open|name|opener|frameElement|location|history)\b", "window.top/parent/open/name/location/history"),
    (r"\bdocument\s*\??\.\s*(?:location|defaultView)\b", "document.location/defaultView"), (r"\bframeElement\b", "frameElement"),
    (r"\b(?:top|parent|opener)\s*\??\.\s*(?:location|document|postMessage|frames|history)\b", "parent/top üyesi"), (r"\bpostMessage\b", "postMessage"),
    (r"(?<![.\w$])location\s*(?:\??\.\s*[A-Za-z_$][\w$]*|\[)", "location"), (r"(?<![.\w$(])location\s*=(?!=)", "location ="),
    (r"(?<![.\w$])history\s*(?:\??\.\s*(?:pushState|replaceState|go|back|forward|state|length|scrollRestoration)\b|\[)", "history"),
    (r"\beval\b", "eval"), (r"(?<![.\w$])Function\s*\(", "Function("), (r"new\s+Function\s*\(", "new Function"),
    (r"\bnew\s+(?:Worker|SharedWorker|RTCPeerConnection|BroadcastChannel)\b", "Worker/RTC/BroadcastChannel"),
    (r"\bset(?:Timeout|Interval)\s*\(\s*['\"`]", "setTimeout(\"kod\")"), (r"\bimportScripts\b", "importScripts"),
    (r"\bimport\s*\(", "import()"), (r"document\s*\??\.\s*write(?:ln)?\s*\(", "document.write"),
    (r"createElement\s*\(\s*['\"](?:script|iframe|frame|link|object|embed)['\"]\s*\)", "createElement(script/iframe/…)"),
    (r"ownerDocument\s*\??\.\s*defaultView\b", "ownerDocument.defaultView"), (r"document\s*\??\.\s*open\s*\(", "document.open("),
]
BARE_OPEN = re.compile(r"(?<![.\w$])open\s*\(")

bulgular = []
def hata(dosya, mesaj): bulgular.append(("HATA", dosya, mesaj))
def uyari(dosya, mesaj): bulgular.append(("UYARI", dosya, mesaj))

def satir_no(metin, konum): return metin.count("\n", 0, konum) + 1

def ac(yol):
    """Zip ise geçici klasöre açar; klasörse doğrudan kullanır. Zip kökünde tek klasör varsa onu kök sayar (uyarır)."""
    if os.path.isdir(yol): return yol, None
    if not zipfile.is_zipfile(yol): print("Açılamadı: klasör ya da .zip verin →", yol); sys.exit(2)
    gecici = tempfile.mkdtemp(prefix="kkp-denetim-")
    with zipfile.ZipFile(yol) as z:
        for n in z.namelist():
            if n.startswith("/") or ".." in n.split("/"): hata("zip", "Tehlikeli yol: " + n); continue
        z.extractall(gecici)
    kok = gecici
    if not os.path.exists(os.path.join(kok, "manifest.json")):
        alt = [d for d in os.listdir(kok) if os.path.isdir(os.path.join(kok, d)) and not d.startswith("__")]
        if len(alt) == 1 and os.path.exists(os.path.join(kok, alt[0], "manifest.json")):
            uyari("zip", "manifest.json kökte değil, '%s/' klasörünün içinde — zip'i klasörün İÇİNDEKİLERDEN yapın (yüklemede düzeltilir)" % alt[0])
            kok = os.path.join(kok, alt[0])
    return kok, gecici

def dosyalar(kok):
    for d, _, fs in os.walk(kok):
        for f in fs:
            tam = os.path.join(d, f)
            yield os.path.relpath(tam, kok).replace(os.sep, "/"), tam

def ana(yol):
    kok, gecici = ac(yol)
    tum = dict(dosyalar(kok))
    def oku(rel):
        with open(os.path.join(kok, rel), "r", encoding="utf-8", errors="replace") as f: return f.read()
    def var(rel): return rel in tum

    # ---------- manifest ----------
    if not var("manifest.json"):
        hata("manifest.json", "Kökte manifest.json yok — bu bir kkp/1 paketi değil (KKP-MAN-01). Kural 8/14.")
        return bitir()
    try: m = json.loads(oku("manifest.json"))
    except Exception as e: hata("manifest.json", "Geçerli JSON değil: %s" % e); return bitir()
    if m.get("format") != "kkp/1": hata("manifest.json", "format 'kkp/1' olmalı, şu an: %r" % m.get("format"))
    kitap = m.get("kitap") or {}
    if not str(kitap.get("baslik", "")).strip(): hata("manifest.json", "kitap.baslik boş (KKP-MAN-02).")
    if not re.match(r"^[a-z]{2}(-[A-Z]{2})?$", str(kitap.get("dil", ""))): uyari("manifest.json", "kitap.dil 'tr' biçiminde olmalı.")
    bolumler = m.get("bolumler") or []
    if not bolumler: hata("manifest.json", "bolumler boş.")
    bolum_dosyalari = []
    js_listesi = set(); css_listesi = set()
    ortak = m.get("ortak") or {}
    for c in ortak.get("css", []) or []: css_listesi.add(c)
    for j in ortak.get("js", []) or []: js_listesi.add(j)
    for b in bolumler:
        bid, dosya = str(b.get("id", "")), str(b.get("dosya", ""))
        if not re.match(r"^b\d{2}$", bid): hata("manifest.json", "bölüm id '%s' bNN biçiminde değil." % bid)
        if not re.match(r"^\d{2}-[a-z0-9][a-z0-9._-]*\.html$", dosya): hata("manifest.json", "bölüm dosyası '%s' NN-slug.html biçiminde değil (ASCII küçük harf)." % dosya)
        elif dosya[:2] != bid[1:]: hata("manifest.json", "'%s' ile '%s' numaraları farklı." % (bid, dosya))
        if b.get("tur") not in ("on", "bolum", "ek", "kaynakca"): hata("manifest.json", "bölüm '%s' tur değeri on|bolum|ek|kaynakca olmalı." % bid)
        if not var(dosya): hata("manifest.json", "bölüm dosyası pakette yok: %s" % dosya)
        else: bolum_dosyalari.append((bid, dosya, b))
        for c in b.get("css", []) or []: css_listesi.add(c)
        for j in b.get("js", []) or []: js_listesi.add(j)
    for yol in list(css_listesi) + list(js_listesi):
        if not var(yol): hata("manifest.json", "listelenen dosya pakette yok: %s" % yol)
    if "assets/css/kitap.css" not in css_listesi: uyari("manifest.json", "ortak.css içinde assets/css/kitap.css yok (doğrulayıcı boş dosya üretir).")
    for g in (m.get("ozellikler") or {}).get("gomulu", []) or []:
        if not var(g): hata("manifest.json", "ozellikler.gomulu dosyası yok: %s" % g)

    # ---------- kök ve dizin düzeni ----------
    for rel, tam in tum.items():
        if "/" not in rel:
            if rel != "manifest.json" and rel not in [d for _, d, _ in bolum_dosyalari]:
                uyari(rel, "Kökte fazladan dosya (yüklemede düşer): yalnız manifest.json ve NN-slug.html olabilir.")
            continue
        dizin = rel.rsplit("/", 1)[0]
        uz = os.path.splitext(rel)[1].lower()
        if dizin not in UZANTI:
            uyari(rel, "İzinli dizin değil (assets/css|js|js/vendor|data|media|fonts|embed); yüklemede düşer.")
        elif uz not in UZANTI[dizin]:
            uyari(rel, "Bu dizinde izinsiz uzantı '%s'; yüklemede düşer." % uz)
        if not re.match(r"^[a-z0-9][a-z0-9._/-]*$", rel): uyari(rel, "Dosya adı ASCII küçük harf değil ya da boşluk/üst karakter içeriyor.")

    # ---------- referans yardımcıları ----------
    referanslanan = set(["manifest.json"])
    def referans_kontrol(dosya_rel, metin, taban):
        for mm in re.finditer(r"\b(?:src|href|poster|data-src)\s*=\s*[\"']([^\"']+)[\"']", metin):
            deger = mm.group(1).strip()
            if deger.startswith("#") or deger.startswith("mailto:"): continue
            if deger.startswith("data:"):
                if len(deger) >= 4 * KB: hata(dosya_rel, "satır %d: data: URI %d KB ≥ 4 KB — dosyaya çıkarın (assets/media/) (KKP-NET-01)." % (satir_no(metin, mm.start()), len(deger) // KB))
                continue
            if re.match(r"^https?://", deger):
                host = re.sub(r"^https?://([^/]+).*$", r"\1", deger)
                etiket = metin[metin.rfind("<", 0, mm.start()):mm.start()]
                if host in IZINLI_HOST: uyari(dosya_rel, "satır %d: izinli CDN adresi %s — yüklemede indirilip gömülür; tercihen pakete koyun." % (satir_no(metin, mm.start()), host))
                elif host in ("www.w3.org",): pass
                elif re.match(r"<a\b", etiket): uyari(dosya_rel, "satır %d: dış bağlantı <a href=%s> — kaynak yüklemez, red değil; sandbox gezinmeyi kısıtlar, düz metne çevirmeyi düşünün (KKP-LNK-W3)." % (satir_no(metin, mm.start()), deger[:60]))
                else: hata(dosya_rel, "satır %d: dış adres %s — dosyayı pakete koyun (KKP-NET-01)." % (satir_no(metin, mm.start()), deger[:80]))
                continue
            if "?" in deger: deger = deger.split("?")[0]; uyari(dosya_rel, "'%s' sorgu eki (?v=) taşıyor; kaldırın." % mm.group(1)[:60])
            hedef = os.path.normpath(os.path.join(taban, deger)).replace(os.sep, "/")
            if hedef.startswith("../") or hedef.startswith("/"): hata(dosya_rel, "kök dışına çıkan yol: %s" % deger); continue
            if not var(hedef): hata(dosya_rel, "satır %d: referans edilen dosya pakette yok: %s (KKP-REF-01)." % (satir_no(metin, mm.start()), deger))
            else: referanslanan.add(hedef)

    # ---------- bölüm dosyaları ----------
    tum_idler = {}
    toplam_js_sayfada = 0
    for bid, dosya, b in bolum_dosyalari:
        h = oku(dosya); boyut = len(h.encode("utf-8"))
        referanslanan.add(dosya)
        if boyut > int(1.5 * MB): hata(dosya, "Bölüm HTML %d KB > 1,5 MB — bölümü bölün (KKP-LIM-01)." % (boyut // KB))
        elif boyut >= 600 * KB: uyari(dosya, "Bölüm HTML %d KB ≥ 600 KB — bölmeyi düşünün." % (boyut // KB))
        kokler = re.findall(r"<section\b[^>]*class=[\"'][^\"']*\bkt-bolum\b[^\"']*[\"'][^>]*>", h)
        if len(kokler) != 1: hata(dosya, "Tam olarak bir <section class=\"kt-bolum\"> olmalı; bulunan: %d." % len(kokler))
        else:
            kokm = re.search(r"data-kt-bolum=[\"']([^\"']+)[\"']", kokler[0])
            if not kokm or kokm.group(1) != bid: hata(dosya, "section.kt-bolum data-kt-bolum='%s' olmalı." % bid)
            konum = h.find(kokler[0]) + len(kokler[0])
            ilk = re.search(r"<([a-z][a-z0-9]*)\b[^>]*>", h[konum:])
            if not ilk or ilk.group(1) != "h1": uyari(dosya, "Bölüm kökünün ilk çocuğu h1[id] olmalı (bulunan: <%s>)." % (ilk.group(1) if ilk else "?"))
            elif not re.search(r"(?<![\w-])id=", ilk.group(0)): uyari(dosya, "h1 başlığında id yok.")
        # yasak etiket / öznitelik
        for et in ("object", "embed", "applet", "base"):
            for mm in re.finditer(r"<%s\b" % et, h): hata(dosya, "satır %d: <%s> yasak (KKP-HTML-02)." % (satir_no(h, mm.start()), et))
        for mm in re.finditer(r"<form\b[^>]*\b(?:action|formaction)\s*=", h): hata(dosya, "satır %d: <form action> yasak; action'sız form + JS preventDefault." % satir_no(h, mm.start()))
        for mm in re.finditer(r"\bjavascript:", h): hata(dosya, "satır %d: javascript: bağlantısı yasak." % satir_no(h, mm.start()))
        for mm in re.finditer(r"\bsrcdoc\s*=", h): hata(dosya, "satır %d: iframe srcdoc yasak; embed dosya olarak (KKP-HTML-05)." % satir_no(h, mm.start()))
        for mm in re.finditer(r"<iframe\b[^>]*>", h):
            et = mm.group(0); s = re.search(r"\bsrc=[\"']([^\"']+)[\"']", et); sb = re.search(r"\bsandbox=[\"']([^\"']*)[\"']", et)
            if not s or not s.group(1).startswith("assets/embed/"): hata(dosya, "satır %d: iframe src yalnız assets/embed/*.html olabilir (KKP-EMB-01)." % satir_no(h, mm.start()))
            if not sb: uyari(dosya, "satır %d: iframe sandbox yok; sandbox=\"allow-scripts\" yazın (yüklemede eklenir)." % satir_no(h, mm.start()))
            elif re.search(r"allow-(?:same-origin|top-navigation|popups|downloads)", sb.group(1)): hata(dosya, "satır %d: iframe sandbox kaçış izni taşıyor (KKP-HTML-05)." % satir_no(h, mm.start()))
        for mm in re.finditer(r"\son[a-z]+\s*=", h): uyari(dosya, "satır %d: satır içi olay özniteliği (%s) — addEventListener kullanın (yüklemede çevrilir)." % (satir_no(h, mm.start()), mm.group(0).strip())); break
        govde = h.split("<body", 1)[1] if "<body" in h else h
        for mm in re.finditer(r"<script\b(?![^>]*type=[\"']application/json[\"'])(?![^>]*\bsrc=)[^>]*>", govde): uyari(dosya, "satır %d: satır içi <script> — assets/js/ dosyasına taşıyın (yüklemede taşınır)." % satir_no(h, h.find(mm.group(0)))); break
        if re.search(r"<style\b", govde): uyari(dosya, "gövdede satır içi <style> — kitap.css'e taşıyın (yüklemede taşınır).")
        if re.search(r"(?:id|class)=[\"'][^\"']*(?:reader-toolbar|reader-|probar)", h): hata(dosya, "Okuyucu kabuğu imzası (reader-*/probar) — kabuğu atın, yalnız içerik kalsın (KKP-CHR-01).")
        for mm in re.finditer(r"<(header|footer|nav|dialog)\b", govde):
            uyari(dosya, "satır %d: <%s> var — yalnız section.kt-bolum'un DOĞRUDAN çocuğuysa <div>'e çevrilir (iç içe ise sorun değil); dialog'u JS oluştursun." % (satir_no(h, h.find(mm.group(0))), mm.group(1))); break
        # id'ler
        idsiz = 0
        for mm in re.finditer(r"<(%s)\b([^>]*)>" % METIN_BLOK, h):
            if not re.search(r"(?<![\w-])id=", mm.group(2)): idsiz += 1
        if idsiz: uyari(dosya, "%d metin bloğu id'siz (yüklemede üretilir; öğrenci notu için id'yi siz verin)." % idsiz)
        for mm in re.finditer(r"(?<![\w-])id=[\"']([^\"']+)[\"']", h):
            i = mm.group(1)
            if not ID_RE.match(i): uyari(dosya, "satır %d: id '%s' biçime uymuyor (^[a-z][a-z0-9-]*$) — doğrulayıcı küçük harfe çevirir ama JS seçiciniz eşleşmez (KKP-ID-03)." % (satir_no(h, mm.start()), i))
            if i in tum_idler and tum_idler[i] != dosya: hata(dosya, "id '%s' başka bölümde de var (%s) — paket genelinde benzersiz olmalı (KKP-ID-02)." % (i, tum_idler[i]))
            elif i in tum_idler: hata(dosya, "id '%s' aynı dosyada iki kez." % i)
            tum_idler[i] = dosya
        for mm in re.finditer(r"(?:href|aria-labelledby|aria-controls|for)=[\"']#?([a-z][a-z0-9-]*)[\"']", h):
            pass  # hedef kontrolü aşağıda (tüm id'ler toplandıktan sonra)
        referans_kontrol(dosya, h, "")
        sayfa_js = re.findall(r"<script\b[^>]*\bsrc=[\"']([^\"']+)[\"']", h)
        toplam_js_sayfada += len(sayfa_js)
        for j in list(ortak.get("js", []) or []) + list(b.get("js", []) or []):
            if j not in sayfa_js: uyari(dosya, "manifest'te listelenen %s bu sayfanın sonunda <script src> olarak yok (kural 9)." % j)
        for c in list(ortak.get("css", []) or []) + list(b.get("css", []) or []):
            if c not in h: uyari(dosya, "manifest'te listelenen %s bu sayfada <link> olarak yok (kural 9)." % c)
    # kırık # hedefleri ve manifest içindekiler
    for bid, dosya, b in bolum_dosyalari:
        h = oku(dosya)
        for mm in re.finditer(r"\bhref=[\"']#([^\"']+)[\"']", h):
            if mm.group(1) not in tum_idler: uyari(dosya, "satır %d: href='#%s' hedefi pakette yok (yüklemede düz metne çevrilir)." % (satir_no(h, mm.start()), mm.group(1)))
        for mm in re.finditer(r"\baria-labelledby=[\"']([^\"']+)[\"']", h):
            if mm.group(1) not in tum_idler: uyari(dosya, "satır %d: aria-labelledby='%s' hedefi yok — yeni id'ye bağlayın ya da silin." % (satir_no(h, mm.start()), mm.group(1)))
    def toc(liste, derinlik=1):
        for md in liste or []:
            if md.get("hedef") not in tum_idler: uyari("manifest.json", "icindekiler hedefi pakette yok: %s (%s)" % (md.get("hedef"), md.get("baslik", "")))
            if derinlik > 3: uyari("manifest.json", "icindekiler 3 seviyeden derin: %s" % md.get("baslik", ""))
            toc(md.get("alt"), derinlik + 1)
    toc(m.get("icindekiler"))

    # ---------- embed'ler ----------
    for rel in [r for r in tum if r.startswith("assets/embed/") and r.endswith(".html")]:
        e = oku(rel); boyut = len(e.encode("utf-8"))
        if boyut > int(1.5 * MB): hata(rel, "Gömülü belge %d KB > 1,5 MB (KKP-LIM-01)." % (boyut // KB))
        if re.search(r"<iframe\b", e): hata(rel, "Embed içinde iframe olamaz (KKP-EMB-01).")
        for mm in re.finditer(r"<script\b(?![^>]*type=[\"']application/json[\"'])(?![^>]*\bsrc=)[^>]*>", e):
            uyari(rel, "satır %d: embed içi satır içi <script> — assets/js/embed-<ad>.js dosyasına taşıyın (yüklemede taşınır)." % satir_no(e, mm.start()))
            js_tara(rel, e[mm.end():e.find("</script>", mm.end())], satir_taban=satir_no(e, mm.end()) - 1); break
        referans_kontrol(rel, e, "assets/embed")

    # ---------- JS ----------
    toplam_js = 0
    for rel in [r for r in tum if r.endswith(".js")]:
        j = oku(rel); boyut = len(j.encode("utf-8")); toplam_js += boyut
        vendor = rel.startswith("assets/js/vendor/")
        if boyut > (int(1.5 * MB) if vendor else 1 * MB): hata(rel, "JS %d KB tek dosya sınırını aşıyor (KKP-LIM-01)." % (boyut // KB))
        js_tara(rel, j, vendor=vendor)
        if not vendor and not rel.startswith("assets/js/veri-") and not rel.startswith("assets/js/embed-") and "kt:hazir" not in j:
            uyari(rel, "kt:hazir olayı dinlenmiyor — kural 13 boot kalıbı (KKP-JS-W1).")
    if toplam_js > 5 * MB: hata("assets/js", "Toplam JS %d MB > 5 MB." % (toplam_js // MB))
    if (m.get("ozellikler") or {}).get("etkilesim") and not js_listesi and toplam_js_sayfada == 0:
        uyari("manifest.json", "ozellikler.etkilesim=true ama pakette hiç JS listelenmemiş — envanterle karşılaştırın: etkileşimler atıldı mı? (kural 2–3)")

    # ---------- CSS ----------
    for rel in [r for r in tum if r.endswith(".css")]:
        c = oku(rel); boyut = len(c.encode("utf-8"))
        if boyut > 1 * MB: hata(rel, "CSS %d KB > 1 MB (KKP-LIM-01)." % (boyut // KB))
        if c.count("{") != c.count("}"): hata(rel, "Süslü parantezler dengesiz (%d açılış, %d kapanış) — CSS ayrıştırılamaz (KKP-CSS-10)." % (c.count("{"), c.count("}")))
        for mm in re.finditer(r"url\(\s*[\"']?(https?://[^)\"']+)", c):
            host = re.sub(r"^https?://([^/]+).*$", r"\1", mm.group(1))
            if host in IZINLI_HOST: uyari(rel, "satır %d: izinli CDN url() — yüklemede gömülür." % satir_no(c, mm.start()))
            else: hata(rel, "satır %d: dış url(%s) yasak (KKP-CSS-08)." % (satir_no(c, mm.start()), mm.group(1)[:60]))
        for mm in re.finditer(r"url\(\s*[\"']?([^)\"'#][^)\"']*)", c):
            d = mm.group(1).strip()
            if re.match(r"^(https?:|data:)", d): continue
            hedef = os.path.normpath(os.path.join(rel.rsplit("/", 1)[0], d)).replace(os.sep, "/")
            if not var(hedef): hata(rel, "satır %d: url(%s) hedefi pakette yok (KKP-REF-01)." % (satir_no(c, mm.start()), d[:60]))
            else: referanslanan.add(hedef)
        if re.search(r"(^|[\s,}])(?:#reader-toolbar|\.reader-[a-z]|\.probar)", c): hata(rel, "Okuyucu kabuğu seçicisi (.reader-*/#reader-toolbar/.probar) — silin (KKP-CHR-01).")
        if re.search(r"@import\b", c): uyari(rel, "@import — içeriği dosyaya alın (yüklemede çevrilir).")
        n = len(re.findall(r"position\s*:\s*(?:fixed|sticky)", c))
        if n: uyari(rel, "%d bildirimde position:fixed/sticky — yüklemede silinir; modal için <dialog> kullanın." % n)
        if re.search(r"(^|[\s,}])(?:html|body|:root)\s*[{,]", c): uyari(rel, "html/body/:root seçicisi — .kt-bolum'a çevrilir; değişkenleri .kt-bolum'da tanımlayın.")
        if re.search(r"(^|[\s,}])(?:body|html)?\.(?:dark|sepia|light)\b|\[data-theme", c): uyari(rel, "Tema kancası (.dark/.sepia/[data-theme]) — okuyucu biçimine çevrilir (KKP-CSS-W3).")
        onem = c.count("!important")
        if onem > 500: uyari(rel, "!important %d > 500 (KKP-CSS-W2)." % onem)
        # v2.1: CSS'in #id seçicisi pakette olmayan bir id'ye bağlıysa kural boşa düşer (id yeniden adlandırıldıysa [data-kaynak-id] kullan)
        if not rel.startswith("assets/css/embed-"):
            kayip = []
            for sm in re.finditer(r"([^{}]+)\{", re.sub(r"/\*.*?\*/", "", c, flags=re.S)):
                sec = sm.group(1).strip()
                if sec.startswith("@"): continue
                for im in re.finditer(r"#([A-Za-z][\w-]*)", sec):
                    if im.group(1) not in tum_idler and im.group(1) not in kayip: kayip.append(im.group(1))
            if kayip: uyari(rel, "%d #id seçicisi pakette olmayan id'ye bağlı (kural boşa düşer; id'yi yeniden adlandırdıysanız [data-kaynak-id=\"…\"] yazın): %s" % (len(kayip), ", ".join(kayip[:6])))
        mm = re.search(r"\.kt-bolum\s*\{[^}]*max-width\s*:\s*(?!none)[^;}]+", c)
        if mm: uyari(rel, "satır %d: .kt-bolum'a max-width verilmiş — genişlik serbest bırakılır, sütunu okuyucu belirler (kural 12)." % satir_no(c, mm.start()))
        n = len(re.findall(r"max-height\s*:[^;}]+;[^}]*overflow(?:-y)?\s*:\s*(?:auto|scroll)|overflow(?:-y)?\s*:\s*(?:auto|scroll)\s*;[^}]*max-height\s*:", c))
        if n: uyari(rel, "%d kuralda max-height + overflow:auto (iç kaydırma kutusu) — laboratuvar/kart/gömülü uygulamada iç kaydırma istenmez; yalnız geniş tablo (kural 12)." % n)
        if c.count("{") > 0 and re.search(r"[{;]\s*color\s*:\s*#[0-9a-fA-F]{3,8}\b", c): uyari(rel, "Sabit metin rengi var — koyu temada bozuk görünebilir; mümkünse var(--kt-fg) (KKP-CSS-W4).")

    # ---------- medya ve öksüz dosyalar ----------
    for rel, tam in tum.items():
        if rel.startswith("assets/media/"):
            b = os.path.getsize(tam)
            if b > 4 * MB: hata(rel, "Medya %d MB > 4 MB (KKP-LIM-01)." % (b // MB))
            elif b >= 800 * KB: uyari(rel, "Medya %d KB ≥ 800 KB — webp'e çevirin (KKP-LIM-W1)." % (b // KB))
        if rel not in referanslanan and rel.startswith("assets/") and not rel.startswith("assets/js/vendor/"):
            if not any(rel in oku(o) for o in tum if o.endswith((".html", ".css", ".js")) and o != rel):
                uyari(rel, "Hiçbir yerden referans edilmiyor — yüklemede düşer (KKP-REF-W1).")
    return bitir(gecici)

def js_tara(rel, kod, vendor=False, satir_taban=0):
    for desen, ad in JS_YASAK:
        for mm in re.finditer(desen, kod, flags=re.I if "createElement" in desen else 0):
            s = satir_taban + satir_no(kod, mm.start())
            if vendor: uyari(rel, "satır %d: kütüphanede yasak API dizesi '%s' (KKP-JS-W3, uyarı)." % (s, ad))
            else: hata(rel, "satır %d: yasak API '%s' — kural 6 'yerine' sütunu (KKP-JS-02)." % (s, ad))
            break
    for mm in BARE_OPEN.finditer(kod):
        onceki = kod[max(0, mm.start() - 12):mm.start()]
        if re.search(r"function\s+$", onceki): continue
        s = satir_taban + satir_no(kod, mm.start())
        (uyari if vendor else hata)(rel, "satır %d: çıplak open( çağrısı — fonksiyona başka ad verin (kural 6)." % s); break
    if re.search(r"\b(?:localStorage|sessionStorage)\b", kod) and not vendor:
        uyari(rel, "localStorage/sessionStorage — okuyucuda oturum içi bellekle çalışır, kayıt kalıcı değil (KKP-JS-W4).")
    if not vendor and not rel.startswith("assets/js/embed-") and not rel.startswith("assets/embed/"):
        # v2.1: body'ye eklenen dialog/katman bölüme kapsanan CSS'ten pay alamaz; büyük harfli id doğrulayıcıda küçülür.
        # Embed script'i kendi belgesinde çalışır (kapsama ve id küçültme bölüm belgesine aittir) → muaf.
        mm = re.search(r"document\.body\.(?:append|appendChild|prepend|insertBefore)\s*\(", kod)
        if mm: uyari(rel, "satır %d: document.body'ye eleman ekleniyor — dialog/katmanı document.querySelector('.kt-bolum') içine ekleyin; CSS bölüme kapsanır, body'deki eleman stilsiz kalır (kural 13)." % (satir_taban + satir_no(kod, mm.start())))
        mm = re.search(r"getElementById\(\s*[\"']([^\"']*[A-Z][^\"']*)[\"']", kod)
        if mm: uyari(rel, "satır %d: getElementById('%s') — büyük harfli id doğrulayıcıda küçülür (KKP-ID-03), seçici boş döner; id'yi küçük harf-tire yapın ya da veri özniteliğiyle bağlayın (kural 5)." % (satir_taban + satir_no(kod, mm.start()), mm.group(1)[:40]))
    if re.search(r"^[ \t]*(?:import|export)\s+", kod, flags=re.M) and not vendor:
        hata(rel, "ES modül söz dizimi (import/export) — klasik script yazın; bare import yasak (KKP-JS-05).")

def bitir(gecici=None):
    if gecici:
        import shutil; shutil.rmtree(gecici, ignore_errors=True)
    h = [b for b in bulgular if b[0] == "HATA"]; u = [b for b in bulgular if b[0] == "UYARI"]
    for sev, dosya, mesaj in h + u: print("%-5s %s — %s" % (sev, dosya, mesaj))
    print("\nkkp-denetim — %s · HATA %d · UYARI %d" % ("REDDEDİLİR" if h else "GEÇER (panel kesin karar verir)", len(h), len(u)))
    sys.exit(1 if h else 0)

if __name__ == "__main__":
    if len(sys.argv) != 2: print(__doc__); sys.exit(2)
    ana(sys.argv[1])
