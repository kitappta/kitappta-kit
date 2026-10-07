/* Kitappta harita motoru (Plan 38, v1). figure.kt-harita içindeki JSON tanımı okur, altlığı (window.__ktAltlik) ve Leaflet'i (window.L)
   kullanarak haritayı kurar. Karo yok, ağ yok: sınırlar pakette, renkler CSS sınıflarından (tema değişince kendiliğinden uyar).
   Tanım (harita-ekle.mjs üretir): { altlik, gorunum?: { merkez:[enlem,boylam], yakinlik } | { odak:["TUR",…] }, etiketler?: "hepsi"|"vurgu"|"yok",
   gruplar?: [{ ad, etiket }], vurgu?: [{ k:["TUR",…], grup? }], isaretciler?: [{ ad, konum:[enlem,boylam], metin?, grup?, yer? }],
   alanlar?: [{ ad, noktalar:[[enlem,boylam],…], grup?, kesik? }] }
   JS ya da altlık yoksa kart figcaption ve yer listesiyle okunur (tuval boş kalır, CSS gizler). */
(function () {
  "use strict";
  var GRUP_SAYISI = 6;

  /** TopoJSON katmanını GeoJSON özelliklerine çevirir (delta + ölçek çözülür; ters yay ~i). */
  function topoCoz(topo, katman) {
    var tr = topo.transform, yaylar = topo.arcs.map(function (yay) {
      var x = 0, y = 0;
      return yay.map(function (n) {
        if (!tr) return [n[0], n[1]];
        x += n[0]; y += n[1];
        return [x * tr.scale[0] + tr.translate[0], y * tr.scale[1] + tr.translate[1]];
      });
    });
    function halka(idler) {
      var h = [];
      idler.forEach(function (i, sira) {
        var yay = i < 0 ? yaylar[~i].slice().reverse() : yaylar[i];
        h = h.concat(sira ? yay.slice(1) : yay);
      });
      return h;
    }
    return topo.objects[katman].geometries.map(function (g) {
      var geo = null;
      if (g.type === "Polygon") geo = { type: "Polygon", coordinates: g.arcs.map(halka) };
      else if (g.type === "MultiPolygon") geo = { type: "MultiPolygon", coordinates: g.arcs.map(function (p) { return p.map(halka); }) };
      return { type: "Feature", properties: g.properties || {}, geometry: geo };
    }).filter(function (f) { return f.geometry; });
  }

  /** Özelliğin ANA parçasının sınırı: en büyük çokgen. Denizaşırı toprağı olan ülkede (Fransa → Guyana) odak bütün dünyaya yayılmasın. */
  function anaSinir(L, f) {
    var polis = f.geometry.type === "Polygon" ? [f.geometry.coordinates] : f.geometry.coordinates, enIyi = null, enAlan = -1;
    polis.forEach(function (p) {
      var b = [90, 180, -90, -180];
      p[0].forEach(function (n) { if (n[1] < b[0]) b[0] = n[1]; if (n[0] < b[1]) b[1] = n[0]; if (n[1] > b[2]) b[2] = n[1]; if (n[0] > b[3]) b[3] = n[0]; });
      var alan = (b[2] - b[0]) * (b[3] - b[1]);
      if (alan > enAlan) { enAlan = alan; enIyi = b; }
    });
    return L.latLngBounds([enIyi[0], enIyi[1]], [enIyi[2], enIyi[3]]);
  }

  function el(etiket, sinif, metin) {
    var e = document.createElement(etiket);
    if (sinif) e.className = sinif;
    if (metin != null) e.textContent = metin;
    return e;
  }

  function kur(kart) {
    var L = window.L, tuval = kart.querySelector(".kt-harita-tuval"), veriEl = kart.querySelector("script.kt-harita-veri");
    if (!tuval || !veriEl || kart.getAttribute("data-kt-hazir")) return;
    var tanim;
    try { tanim = JSON.parse(veriEl.textContent); } catch (e) { kart.setAttribute("data-kt-harita-durum", "tanim-bozuk"); return; }
    var altlik = (window.__ktAltlik || {})[tanim.altlik];
    if (!L || !altlik) { kart.setAttribute("data-kt-harita-durum", L ? "altlik-yok" : "leaflet-yok"); return; }
    kart.setAttribute("data-kt-hazir", "1");

    var gruplar = (tanim.gruplar || []).slice(0, GRUP_SAYISI);
    function grupSinifi(ad) {
      for (var i = 0; i < gruplar.length; i++) if (gruplar[i].ad === ad) return " kt-harita-g" + (i + 1);
      return "";
    }
    var vurgu = {}; // kod → grup adı ("" = grupsuz vurgu)
    (tanim.vurgu || []).forEach(function (v) { (v.k || []).forEach(function (k) { vurgu[k] = v.grup || ""; }); });
    var etiketModu = tanim.etiketler || "hepsi";

    var harita = L.map(tuval, {
      scrollWheelZoom: false, attributionControl: false, zoomSnap: 0.25, zoomDelta: 0.5, dragging: !L.Browser.mobile, tap: false,
      minZoom: altlik.yakinlik[0], maxZoom: altlik.yakinlik[1], maxBounds: altlik.sinir, maxBoundsViscosity: 0.8, keyboard: true,
    });
    harita.setView(altlik.gorunum.merkez, altlik.gorunum.yakinlik); // katmanlardan önce: görünümsüz haritaya eklenen vektör çizilemez

    // Altlık katmanları: ilk katman asıl (ülkeler / iller), "cevre" bağlamdır (soluk, etiketsiz, tıklanmaz).
    var ozellikler = [], kodKatmani = {}, kodSiniri = {};
    altlik.katmanlar.forEach(function (ad) {
      var cevre = ad === "cevre";
      L.geoJSON(topoCoz(altlik.topo, ad), {
        interactive: false,
        style: function (f) {
          var k = f.properties.k, g = vurgu[k];
          return { className: cevre ? "kt-harita-cevre" : "kt-harita-yer" + (g !== undefined ? " kt-harita-vurgu" + grupSinifi(g) : "") };
        },
        onEachFeature: function (f, katman) {
          if (cevre) return;
          ozellikler.push(f); kodKatmani[f.properties.k] = katman; kodSiniri[f.properties.k] = anaSinir(L, f);
        },
      }).addTo(harita);
    });

    // Alanlar (yayılım alanı, bölge çerçevesi) ve işaretçiler.
    var grupOgeleri = []; // { grup, katman | eleman }
    (tanim.alanlar || []).forEach(function (a) {
      var katman = L.polygon(a.noktalar, { interactive: false, className: "kt-harita-alan" + (a.kesik ? " kt-harita-kesik" : "") + grupSinifi(a.grup) }).addTo(harita);
      grupOgeleri.push({ grup: a.grup || "", katman: katman });
    });
    var isaretciler = [];
    (tanim.isaretciler || []).forEach(function (n, sira) {
      var katman = L.circleMarker(n.konum, { radius: 7, className: "kt-harita-nokta" + grupSinifi(n.grup), bubblingMouseEvents: false }).addTo(harita);
      var balon = el("div", "kt-harita-balon");
      balon.appendChild(el("strong", null, n.ad));
      if (n.metin) balon.appendChild(el("p", null, n.metin));
      katman.bindPopup(balon, { maxWidth: 260, autoPanPadding: [16, 16] });
      katman.bindTooltip(n.ad, { direction: "top", offset: [0, -6] });
      isaretciler.push({ veri: n, katman: katman, sira: sira });
      grupOgeleri.push({ grup: n.grup || "", katman: katman });
    });

    // Görünüm: tanımdaki merkez / odak, yoksa vurgu + işaretçiler, o da yoksa altlığın varsayılanı.
    function hedefSinir() {
      var g = tanim.gorunum || {}, s = null;
      function kat(b) { s = s ? s.extend(b) : L.latLngBounds(b.getSouthWest(), b.getNorthEast()); }
      var kodlar = g.odak || (g.merkez ? [] : Object.keys(vurgu));
      kodlar.forEach(function (k) { if (kodSiniri[k]) kat(kodSiniri[k]); });
      if (!g.merkez && !g.odak) {
        isaretciler.forEach(function (i) { var p = L.latLng(i.veri.konum); kat(L.latLngBounds(p, p)); });
        (tanim.alanlar || []).forEach(function (a) { kat(L.latLngBounds(a.noktalar)); });
      }
      return s;
    }
    function odakla(canli) {
      var g = tanim.gorunum || {}, s = hedefSinir();
      if (g.merkez) harita.setView(g.merkez, g.yakinlik != null ? g.yakinlik : altlik.gorunum.yakinlik, { animate: !!canli });
      else if (s && s.isValid()) harita.fitBounds(s.pad(0.12), { animate: !!canli, maxZoom: altlik.yakinlik[1] - 1 });
      else harita.setView(altlik.gorunum.merkez, altlik.gorunum.yakinlik, { animate: !!canli });
    }

    // Yer adları: öncelik sırasıyla yerleştirilir, bir öncekine binen ad o yakınlıkta atlanır.
    var adKatmani = L.layerGroup().addTo(harita);
    function adlariCiz() {
      adKatmani.clearLayers();
      if (etiketModu === "yok") return;
      var z = harita.getZoom(), gorus = harita.getBounds().pad(0.05), kutular = [];
      var adaylar = ozellikler.filter(function (f) {
        var p = f.properties, vurgulu = vurgu[p.k] !== undefined;
        if (etiketModu === "vurgu" && !vurgulu) return false;
        return p.ad && (vurgulu || p.z <= z + 0.75) && gorus.contains([p.ey, p.ex]);
      }).sort(function (a, b) {
        var va = vurgu[a.properties.k] !== undefined ? 0 : 1, vb = vurgu[b.properties.k] !== undefined ? 0 : 1;
        return va - vb || a.properties.z - b.properties.z;
      });
      adaylar.forEach(function (f) {
        var p = f.properties, n = harita.latLngToContainerPoint([p.ey, p.ex]), en = p.ad.length * 6.6 + 8, kutu = [n.x - en / 2, n.y - 8, n.x + en / 2, n.y + 8];
        for (var i = 0; i < kutular.length; i++) { var k = kutular[i]; if (kutu[0] < k[2] && kutu[2] > k[0] && kutu[1] < k[3] && kutu[3] > k[1]) return; }
        kutular.push(kutu);
        L.marker([p.ey, p.ex], { interactive: false, keyboard: false, icon: L.divIcon({ className: "kt-harita-ad" + (vurgu[p.k] !== undefined ? " kt-harita-ad-vurgu" : ""), html: "", iconSize: [en, 16] }) })
          .addTo(adKatmani).getElement().textContent = p.ad;
      });
    }
    harita.on("zoomend moveend", adlariCiz);

    // Grup süzgeci: "Tümü" + grup başına bir düğme; seçili grubun dışındaki işaretçi, alan ve vurgular gizlenir.
    function grubuGoster(ad) {
      grupOgeleri.forEach(function (o) { var gorunur = !ad || o.grup === ad; if (gorunur) o.katman.addTo(harita); else o.katman.remove(); });
      Object.keys(kodKatmani).forEach(function (k) {
        if (vurgu[k] === undefined) return;
        var yol = kodKatmani[k].getElement && kodKatmani[k].getElement();
        if (yol) yol.classList.toggle("kt-harita-sonuk", !!ad && vurgu[k] !== ad);
      });
      kart.querySelectorAll(".kt-harita-yerler [data-kt-grup]").forEach(function (li) { li.hidden = !!ad && li.getAttribute("data-kt-grup") !== ad; });
    }
    if (gruplar.length) {
      var suzgec = el("div", "kt-harita-suzgec");
      suzgec.setAttribute("role", "group");
      suzgec.setAttribute("aria-label", "Haritayı gruba göre süz");
      [{ ad: "", etiket: "Tümü" }].concat(gruplar).forEach(function (g, i) {
        var d = el("button", "kt-harita-dugme" + (i ? " kt-harita-g" + i : ""), g.etiket || g.ad);
        d.type = "button";
        d.setAttribute("aria-pressed", i ? "false" : "true");
        d.addEventListener("click", function () {
          suzgec.querySelectorAll("button").forEach(function (b) { b.setAttribute("aria-pressed", b === d ? "true" : "false"); });
          grubuGoster(g.ad);
        });
        suzgec.appendChild(d);
      });
      kart.insertBefore(suzgec, tuval);
    }

    // "Odakla" düğmesi (yakınlaştırma düğmelerinin altında).
    var Odak = L.Control.extend({
      options: { position: "topleft" },
      onAdd: function () {
        var kap = el("div", "leaflet-bar kt-harita-odak"), d = el("button", null, "⤢");
        d.type = "button"; d.title = "Haritayı odakla"; d.setAttribute("aria-label", "Haritayı odakla");
        L.DomEvent.disableClickPropagation(kap);
        d.addEventListener("click", function () { harita.closePopup(); odakla(true); });
        kap.appendChild(d);
        return kap;
      },
    });
    harita.addControl(new Odak());

    // Yer listesi (metin olarak her zaman okunur): maddeye tıklamak ya da Enter, haritada o yere gider ve balonunu açar.
    kart.querySelectorAll(".kt-harita-yerler [data-kt-yer]").forEach(function (li) {
      var i = isaretciler[Number(li.getAttribute("data-kt-yer"))];
      if (!i) return;
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      function git() { if (!harita.hasLayer(i.katman)) return; harita.setView(i.veri.konum, Math.max(harita.getZoom(), altlik.gorunum.yakinlik + 1), { animate: true }); i.katman.openPopup(); }
      li.addEventListener("click", function (e) { if (!window.getSelection || !String(window.getSelection())) git(); });
      li.addEventListener("keydown", function (e) { if (e.key === "Enter") { e.preventDefault(); git(); } });
    });

    // Boyut: tuval kapalı bir kartın içindeyken 0×0 olur; görünür olunca (ve ölçek / genişlik değişince) yeniden ölçülür.
    var ilkOdak = false;
    function olc() {
      if (!tuval.clientWidth || !tuval.clientHeight) return;
      harita.invalidateSize({ animate: false });
      if (!ilkOdak) { ilkOdak = true; odakla(false); }
      adlariCiz();
    }
    if (window.ResizeObserver) new ResizeObserver(olc).observe(tuval);
    else window.addEventListener("resize", olc);
    olc();
    harita.on("popupopen", function (e) { kart.setAttribute("data-kt-harita-balon", (e.popup.getElement().querySelector("strong") || {}).textContent || ""); });
    harita.on("zoomend", function () { kart.setAttribute("data-kt-harita-yakinlik", String(harita.getZoom())); });
    kart.setAttribute("data-kt-harita-durum", "hazir");
  }

  window.__ktHarita = { surum: 1, topoCoz: topoCoz }; // test ve tanılama için

  function boot() {
    var kartlar = document.querySelectorAll("figure.kt-harita");
    for (var i = 0; i < kartlar.length; i++) kur(kartlar[i]);
  }
  if (document.readyState !== "loading") boot();
  document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("kt:hazir", boot);
})();
