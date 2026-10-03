/* kkp/1 — Kitappta ortak etkileşim motoru: quiz + flash kart (scripts/kkp/sablon/ortak.js, v1.1 21.09.2026 — fieldset id bölüm önekli q-bNN-N, motor sorular[fieldset.id] ile eşler; JSON id = fieldset id).
   Her kitapta assets/js/ortak.js olarak aynen bulunur; manifest.ortak.js'e yazılır; okuyucu runtime'dan sonra, bölüm JS'inden önce yükler.
   Sözleşme (kkp-v1-uretim-talimati.md kural 7): quiz  = div.kt-quiz#quiz-bNN > fieldset#q-bNN-N > p.kt-soru + ul.kt-secenekler > li > label > input[type=radio][name=q-bNN-N][value=i]
                                                        + div.kt-geri-bildirim[data-kt-dinamik]; div.kt-quiz-kontrol[data-kt-dinamik] > button.kt-quiz-sifirla; p.kt-skor[data-kt-dinamik];
                                                        veri: script[type=application/json]#quiz-bNN-veri {"tur":"quiz","sorular":[{"id":"q-bNN-1","soru","secenekler":[],"dogru":0,"aciklama"}]}
                                                 flash = div.kt-flash#flash-bNN > ol.kt-flash-liste > li.kt-flash-kart > p.kt-flash-on + p.kt-flash-arka;
                                                        div.kt-flash-kontrol[data-kt-dinamik] > button.kt-flash-onceki/.kt-flash-cevir/.kt-flash-sonraki/.kt-flash-karistir + span.kt-flash-sayac
   Kurallar: metin YALNIZ [data-kt-dinamik] içine, textContent ile; statik bloklara (soru, şık, kart yüzü) dokunulmaz — yalnız sınıf değişir.
   Yasak API yok. Bölüm JS'inin data-kt-hazir bayrağına DOKUNMAZ (kendi bayrağı data-kt-motor, bileşen başına). */
(function () {
  "use strict";
  var HARF = "ABCDEFGHIJKLMNOP";

  function veriOku(kapsayici) {
    var el = document.getElementById(kapsayici.id + "-veri");
    if (!el) return null;
    try { return JSON.parse(el.textContent || ""); } catch (e) { return null; }
  }

  function quizKur(q) {
    if (q.getAttribute("data-kt-motor")) return;
    q.setAttribute("data-kt-motor", "1");
    var veri = veriOku(q), sorular = {};
    if (veri && veri.tur === "quiz" && Array.isArray(veri.sorular)) {
      veri.sorular.forEach(function (s) { if (s && s.id) sorular[s.id] = s; });
    }
    var alanlar = Array.prototype.slice.call(q.querySelectorAll("fieldset"));
    var skor = q.querySelector(".kt-skor");

    function skorYaz() {
      if (!skor) return;
      var dogru = 0, cevaplanan = 0;
      alanlar.forEach(function (f) {
        if (f.classList.contains("kt-dogru")) { dogru++; cevaplanan++; }
        else if (f.classList.contains("kt-yanlis")) cevaplanan++;
      });
      skor.textContent = cevaplanan ? "Doğru: " + dogru + " / " + alanlar.length + " (cevaplanan: " + cevaplanan + ")" : "";
    }

    alanlar.forEach(function (f) {
      var soru = sorular[f.id];
      var geri = f.querySelector(".kt-geri-bildirim");
      var liler = Array.prototype.slice.call(f.querySelectorAll(".kt-secenekler > li"));
      f.addEventListener("change", function (e) {
        var girdi = e.target;
        if (!girdi || girdi.type !== "radio") return;
        var secilen = Number(girdi.value);
        var dogruIdx = soru ? Number(soru.dogru) : -1;
        var dogruMu = soru ? secilen === dogruIdx : null;
        liler.forEach(function (li, i) {
          li.classList.toggle("kt-secili", i === secilen);
          li.classList.toggle("kt-dogru-secenek", i === dogruIdx);
        });
        f.classList.toggle("kt-dogru", dogruMu === true);
        f.classList.toggle("kt-yanlis", dogruMu === false);
        if (geri) {
          if (!soru) geri.textContent = "";
          else geri.textContent = (dogruMu ? "Doğru." : "Yanlış. Doğru cevap: " + (HARF.charAt(dogruIdx) || String(dogruIdx + 1)) + ".") + (soru.aciklama ? " " + soru.aciklama : "");
        }
        skorYaz();
      });
    });

    var sifirla = q.querySelector(".kt-quiz-sifirla");
    if (sifirla) sifirla.addEventListener("click", function () {
      alanlar.forEach(function (f) {
        f.classList.remove("kt-dogru", "kt-yanlis");
        Array.prototype.forEach.call(f.querySelectorAll("input[type=radio]"), function (r) { r.checked = false; });
        Array.prototype.forEach.call(f.querySelectorAll(".kt-secili, .kt-dogru-secenek"), function (li) { li.classList.remove("kt-secili", "kt-dogru-secenek"); });
        var g = f.querySelector(".kt-geri-bildirim");
        if (g) g.textContent = "";
      });
      skorYaz();
    });
  }

  function flashKur(k) {
    if (k.getAttribute("data-kt-motor")) return;
    var kartlar = Array.prototype.slice.call(k.querySelectorAll(".kt-flash-liste > .kt-flash-kart"));
    if (!kartlar.length) return;
    k.setAttribute("data-kt-motor", "1");
    var sira = kartlar.map(function (_, i) { return i; }), konum = 0;
    var sayac = k.querySelector(".kt-flash-sayac");

    function goster() {
      kartlar.forEach(function (c, i) {
        var aktif = i === sira[konum];
        c.classList.toggle("kt-aktif", aktif);
        if (!aktif) c.classList.remove("kt-cevrik");
        c.setAttribute("aria-hidden", aktif ? "false" : "true");
        c.setAttribute("tabindex", aktif ? "0" : "-1");
      });
      if (sayac) sayac.textContent = "Kart " + (konum + 1) + " / " + kartlar.length;
    }
    function cevir() { kartlar[sira[konum]].classList.toggle("kt-cevrik"); }
    function ileri() { konum = (konum + 1) % sira.length; goster(); }
    function geri() { konum = (konum - 1 + sira.length) % sira.length; goster(); }
    function karistir() {
      for (var i = sira.length - 1; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1)), t = sira[i];
        sira[i] = sira[j]; sira[j] = t;
      }
      konum = 0; goster();
    }
    function dugme(sinif, f) { var b = k.querySelector("." + sinif); if (b) b.addEventListener("click", f); }
    dugme("kt-flash-cevir", cevir); dugme("kt-flash-sonraki", ileri); dugme("kt-flash-onceki", geri); dugme("kt-flash-karistir", karistir);
    kartlar.forEach(function (c) {
      c.addEventListener("click", function (e) {
        if (e.target && e.target.closest && e.target.closest("a")) return;
        if (c.classList.contains("kt-aktif")) cevir();
      });
      c.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); cevir(); }
        else if (e.key === "ArrowRight") ileri();
        else if (e.key === "ArrowLeft") geri();
      });
    });
    k.classList.add("kt-flash-canli");
    goster();
  }

  function boot() {
    var kok = document.querySelector(".kt-bolum");
    if (!kok) return;
    Array.prototype.forEach.call(kok.querySelectorAll(".kt-quiz"), quizKur);
    Array.prototype.forEach.call(kok.querySelectorAll(".kt-flash"), flashKur);
  }
  if (document.readyState !== "loading") boot(); else document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("kt:hazir", boot);
})();
