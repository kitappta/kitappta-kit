// SAF sesli-kitap telaffuz sözlüğü kütüphanesi (Plan 28 A5). Hiçbir şey içe aktarmaz — şema `kkp-ses-sozluk/1`
// (bkz. task-A3-A5-brief.md §A5). sozlukOzeti (node:crypto gerektirir) kasıtlı olarak AYRI dosyada:
// sozluk-ozet.mjs.
//
// Kararlar:
//  - sozlukUygula eşleştirme modu: anahtar "akronim" ise (2+ büyük harf içeriyorsa — GSYİH, TCMB, IMF, AB gibi)
//    TAM eşleşme (büyük/küçük harf dahil birebir); değilse (Keynes, Marshall gibi özel adlar) yalnız İLK harf
//    tr-TR duyarsız (cümle başı/dışı biçim farkını tolere eder — "keynes"/"Keynes" ikisi de eşleşir), kalan
//    harfler TAM (case-sensitive) eşleşir — "KEYNES" (yalnız ilk harf değil TÜMÜ farklı) eşleşMEZ. Bu, brief'in
//    "tr-TR büyük/küçük duyarsız (ilk harf dışında)" ifadesinin en tutarlı okunuşu: "duyarsızlık YALNIZ ilk
//    harfe uygulanır" (kalanı duyarlı kalır).
//  - Kesme (') + ek: anahtar eşleşmesinden HEMEN sonra `'`/`’` + harf(ler) varsa, ek KARŞILIK DEĞERİNE bitişik
//    eklenir, kesme atılır ("Keynes'in" -> "Keynz" + "in" = "Keynzin").
//  - adayTara üç sınıfı BAĞIMSIZ değerlendirir (bir sözcük yalnız ilk uyan sınıfa göre işaretlenir); (iii)
//    sınıfının ">= 2 kez" eşiği yalnız o sınıftan gelen adaylara uygulanır — (i)/(ii) tek geçişte de aday olur
//    (brief bu ikisi için tekrar eşiği istemiyor, yalnız (iii) için "≥ 2 kez" diyor).
//  - sozluk.json harfleme (spelled-out) akronim okunuş kuralı (girdi değerleri elle yazılırken izlenen kural,
//    kodda uygulanmıyor — bkz. sozluk.json notlar._okuma_kurali): yabancı/uluslararası akronimler (MIT, KPI,
//    API ...) İNGİLİZCE harf adlarıyla, yerli/Türkçe kurum-terim akronimleri (AB, KDV, TCMB ...) TÜRKÇE harf
//    adlarıyla (kisaltma.mjs akronimOku tablosuyla aynı) okunur — TEK bir girdi içinde iki dili KARIŞTIRMAK
//    yasak (düzeltilen örnek: eski "KPI"="ke pi ay" -> "key pi ay"). Yerli grupta K->'ka' ve GSYİH/GSMH
//    sonundaki H->'ha' BİLİNÇLİ koloküyal istisnalardır (resmi tabloda 'ke'/'he' olsa da yerleşik söyleyiş
//    budur), hata değildir.

const TURKCE_ALFABE = new Set("abcçdefgğhıijklmnoöprsştuüvyz".split(""));
// Basit "Türkçe görünmüyor" sezgisi (brief §A5 (iii)): İngilizce/yabancı yazımda sık, Türkçede nadir ikilemeler.
const YABANCI_SEZGI = /th|sh|ch|ph|ck|ee|oo|ll|tt|ss/i;

/** Kalın (a ı o u) ve ince (e i ö ü) ünlü aynı sözcükte → Türkçe büyük ünlü uyumu bozuk (yabancı söz ipucu). */
function unluUyumuBozukMu(kelime) {
  const k = turkceKucuk(kelime);
  return /[aıou]/u.test(k) && /[eiöü]/u.test(k);
}

function turkceKucuk(s) {
  return String(s).toLocaleLowerCase("tr-TR");
}
function turkceBuyuk(s) {
  return String(s).toLocaleUpperCase("tr-TR");
}

/** obj bir kkp-ses-sozluk/1 nesnesi mi? -> {gecerli, hatalar[]}. */
export function sozlukDogrula(obj) {
  const hatalar = [];
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
    return { gecerli: false, hatalar: ["kök nesne değil"] };
  }
  if (obj.format !== "kkp-ses-sozluk/1") hatalar.push(`format 'kkp-ses-sozluk/1' olmalı, alınan: ${JSON.stringify(obj.format)}`);
  if (!Number.isInteger(obj.surum) || obj.surum < 1) hatalar.push(`surum pozitif tam sayı olmalı, alınan: ${JSON.stringify(obj.surum)}`);

  const sozlukAlaniDogrula = (ad, deger) => {
    if (deger === undefined) return;
    if (deger === null || typeof deger !== "object" || Array.isArray(deger)) {
      hatalar.push(`${ad} bir nesne olmalı`);
      return;
    }
    for (const [k, v] of Object.entries(deger)) {
      if (typeof v !== "string") hatalar.push(`${ad}.${k} dize olmalı`);
    }
  };
  sozlukAlaniDogrula("girdiler", obj.girdiler);
  sozlukAlaniDogrula("bloklar", obj.bloklar);
  sozlukAlaniDogrula("notlar", obj.notlar);

  if (obj.desenler !== undefined) {
    if (!Array.isArray(obj.desenler)) {
      hatalar.push("desenler bir dizi olmalı");
    } else {
      obj.desenler.forEach((d, i) => {
        if (!d || typeof d.ara !== "string" || typeof d.yaz !== "string") {
          hatalar.push(`desenler[${i}] {ara, yaz} biçiminde olmalı`);
          return;
        }
        try {
          // eslint-disable-next-line no-new
          new RegExp(d.ara, "gu");
        } catch (e) {
          hatalar.push(`desenler[${i}].ara derlenemedi: ${e.message}`);
        }
      });
    }
  }

  return { gecerli: hatalar.length === 0, hatalar };
}

/** Platform + kitap sözlüğünü birleştirir — kitap üstün (girdiler/desenler birleşir kitap kazanır; bloklar yalnız kitaptan). */
export function sozlukBirlestir(platform, kitap) {
  const p = platform ?? {};
  const k = kitap ?? {};

  const girdiler = { ...(p.girdiler ?? {}), ...(k.girdiler ?? {}) };

  const desenler = [...(p.desenler ?? [])];
  for (const kd of k.desenler ?? []) {
    const i = desenler.findIndex((pd) => pd.ara === kd.ara);
    if (i >= 0) desenler[i] = kd;
    else desenler.push(kd);
  }

  const notlar = { ...(p.notlar ?? {}), ...(k.notlar ?? {}) };
  const bloklar = { ...(k.bloklar ?? {}) };

  return {
    format: "kkp-ses-sozluk/1",
    surum: k.surum ?? p.surum ?? 1,
    girdiler,
    desenler,
    bloklar,
    notlar,
  };
}

function kacan(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buyukHarfSayisi(s) {
  return (s.match(/\p{Lu}/gu) ?? []).length;
}

/** brief §A5: "akronimse (birden çok büyük harf)" — 2+ büyük harf içeren anahtarlar tam eşleşme gerektirir. */
function akronimAnahtarMi(anahtar) {
  return buyukHarfSayisi(anahtar) >= 2;
}

function anahtarDeseniOlustur(anahtar) {
  if (akronimAnahtarMi(anahtar)) return kacan(anahtar);
  const ilk = anahtar[0];
  const kalan = anahtar.slice(1);
  const ilkKucuk = turkceKucuk(ilk);
  const ilkBuyuk = turkceBuyuk(ilk);
  const ilkSinifi = ilkKucuk === ilkBuyuk ? kacan(ilk) : `[${kacan(ilkKucuk)}${kacan(ilkBuyuk)}]`;
  return ilkSinifi + kacan(kalan);
}

/** Metne sözlüğü (girdiler sonra desenler, en uzun anahtar önce) uygular -> {metin, isabetler}. */
export function sozlukUygula(metin, sozluk) {
  let s = String(metin);
  const isabetler = new Map();

  const anahtarlar = Object.keys(sozluk?.girdiler ?? {}).sort((a, b) => b.length - a.length);
  for (const anahtar of anahtarlar) {
    const deger = sozluk.girdiler[anahtar];
    const desen = new RegExp(`(?<![\\p{L}\\p{N}])(${anahtarDeseniOlustur(anahtar)})(?:['’](\\p{L}*))?(?![\\p{L}\\p{N}])`, "gu");
    s = s.replace(desen, (_tam, _eslesen, ek) => {
      isabetler.set(anahtar, (isabetler.get(anahtar) ?? 0) + 1);
      return deger + (ek ?? "");
    });
  }

  for (const { ara, yaz } of sozluk?.desenler ?? []) {
    const desen = new RegExp(ara, "gu");
    const eslesmeSayisi = (s.match(desen) ?? []).length;
    if (eslesmeSayisi > 0) isabetler.set(ara, (isabetler.get(ara) ?? 0) + eslesmeSayisi);
    s = s.replace(new RegExp(ara, "gu"), yaz);
  }

  return { metin: s, isabetler: [...isabetler.entries()].map(([anahtar, sayi]) => ({ anahtar, sayi })) };
}

/** blokların metnindeki telaffuz-şüpheli sözcük adaylarını üç sınıfa göre tarar (bkz. dosya başı karar notu). */
export function adayTara(bloklar, sozluk) {
  const girdilerKucuk = new Set(Object.keys(sozluk?.girdiler ?? {}).map(turkceKucuk));
  const sonuc = new Map(); // sozcuk -> { sayi, ornekler: Set, sinif3Mi }

  const ekle = (sozcuk, blokId, sinif3Mi) => {
    if (girdilerKucuk.has(turkceKucuk(sozcuk))) return;
    const kayit = sonuc.get(sozcuk) ?? { sayi: 0, ornekler: new Set(), yalnizSinif3: true };
    kayit.sayi++;
    kayit.ornekler.add(blokId);
    if (!sinif3Mi) kayit.yalnizSinif3 = false;
    sonuc.set(sozcuk, kayit);
  };

  for (const { id, metin } of bloklar ?? []) {
    // (v) 25.09.2026: alt çizgili / eğik çizgili / noktalı virgüllü birleşik terimler BÜTÜN olarak aday
    // ("JV_default_PCE", "A/B/X", "DMF;DMSO"); içlerindeki parçalar ayrıca aday yapılmaz. İki Türkçe sözcük
    // arasındaki eğik çizgi ("eksik/aralık") aday değildir: parçalardan biri büyük harf içeren kısa bir simge olmalı.
    const birlesikAraliklar = [];
    for (const b of metin.matchAll(/[\p{L}\p{N}]+(?:[_/;-][\p{L}\p{N}]+)+/gu)) {
      const parcalar = b[0].split(/[_/;-]/);
      const simgeVar = parcalar.some((p) => /\p{Lu}/u.test(p) && p.length <= 4);
      if (b[0].includes("_") || simgeVar) {
        ekle(b[0], id, false);
        birlesikAraliklar.push([b.index, b.index + b[0].length]);
      }
    }
    for (const m of metin.matchAll(/\p{L}[\p{L}\p{N}]*/gu)) {
      const kelime = m[0];
      if (birlesikAraliklar.some(([bas, son]) => m.index >= bas && m.index < son)) continue;
      const oncesi = metin.slice(0, m.index);
      const cumleBasiMi = /^\s*$/.test(oncesi) || /[.!?:]\s*$/.test(oncesi);

      // (iv) 25.09.2026: CamelCase ("CatBoost") ve cümle ortasındaki 2-3 harfli büyük+küçük simgeler ("Voc", "Pb")
      if (/\p{Ll}\p{Lu}/u.test(kelime) || (!cumleBasiMi && /^\p{Lu}\p{Ll}{1,2}$/u.test(kelime))) {
        ekle(kelime, id, false);
        continue;
      }

      // (i) Türk alfabesi dışı harf içeren sözcük (w x q é è ß ñ …)
      const turkceDegil = [...turkceKucuk(kelime)].some((h) => /\p{L}/u.test(h) && !TURKCE_ALFABE.has(h));
      if (turkceDegil) {
        ekle(kelime, id, false);
        continue;
      }

      // (ii) sözlükte olmayan 2-6 harf akronim
      if (/^[A-ZÇĞİÖŞÜ]{2,6}$/.test(kelime)) {
        ekle(kelime, id, false);
        continue;
      }

      // (iii) cümle ortasında büyük harfle başlayan, Türkçe görünmeyen, ≥ 2 kez geçen sözcük
      const ilkHarfBuyukMu = kelime[0] === turkceBuyuk(kelime[0]) && kelime[0] !== turkceKucuk(kelime[0]);
      if (ilkHarfBuyukMu && !cumleBasiMi && YABANCI_SEZGI.test(kelime)) {
        ekle(kelime, id, true);
        continue;
      }
      // (vi) 25.09.2026: cümle ortasında büyük harfle başlayan ≥ 4 harfli sözcük ünlü uyumuna uymuyorsa (kalın ve ince
      // ünlü birlikte: "Forest", "Database", "Perovskite") TEK geçişte de aday. Türkçe özel adların çoğu uyumludur
      // ("Ankara", "Türkiye"); uyumsuz Türkçe ad ("İstanbul") listeye düşebilir — editör "değişiklik yok" der.
      if (ilkHarfBuyukMu && !cumleBasiMi && kelime.length >= 4 && unluUyumuBozukMu(kelime)) ekle(kelime, id, false);
    }
  }

  return [...sonuc.entries()]
    .filter(([, kayit]) => !kayit.yalnizSinif3 || kayit.sayi >= 2)
    .map(([sozcuk, kayit]) => ({ sozcuk, sayi: kayit.sayi, ornekler: [...kayit.ornekler] }));
}
