/* kkp/1 — bölüm JS şablonu (scripts/kkp/sablon/bolum-NN.js). Kopyala: assets/js/bolum-NN.js; manifest bolumler[].js'e ekle.
   Kural 7: tek IIFE; boot() idempotent (section.kt-bolum[data-kt-hazir]); readyState + DOMContentLoaded + kt:hazir; her querySelector
   null kontrollü; metin YALNIZ [data-kt-dinamik] içine (textContent); kural 1'deki yasak API'lerden hiçbiri kullanılmaz.
   Renkler --kt-* token'larından okunur ve tema/ölçek değişince yeniden çizilir (koyu temada tuval bozulmasın). */
(function () {
  "use strict";
  var kok = document.querySelector(".kt-bolum");
  if (!kok) return;

  /** Token değeri (okuyucu verir); okuyucu dışında yedek. */
  function renk(ad, yedek) { var v = getComputedStyle(kok).getPropertyValue(ad).trim(); return v || yedek; }
  /** Tema ya da ölçek değişince cb çağrılır (okuyucu html[data-kt-theme]/[data-kt-olcek] yazar). */
  function temaIzle(cb) {
    if (!("MutationObserver" in window)) return;
    new MutationObserver(cb).observe(document.documentElement, { attributes: true, attributeFilter: ["data-kt-theme", "data-kt-olcek"] });
  }
  function $(sec, kapsam) { return (kapsam || kok).querySelector(sec); }
  function sayi(n) { return Number.isFinite(n) ? Number(n.toFixed(2)).toLocaleString("tr-TR") : "—"; }

  function boot() {
    if (kok.dataset.ktHazir) return;
    kok.dataset.ktHazir = "1";

    /* ── Örnek lab: doğrusal arz-talep dengesi (sablon/lab-kart.html ile eşleşir). Kendi labını aynı kalıpla yaz;
          kullanmıyorsan bu bloğu sil. Kaynak bölüm metnindeki değerler/denklemler dışına çıkma. ── */
    var tuval = $("#lab-denge-tuval"), gA = $("#lab-denge-a"), gB = $("#lab-denge-b"), gC = $("#lab-denge-c"), gD = $("#lab-denge-d"), sonuc = $("#lab-denge-sonuc");
    if (tuval && gA && gB && gC && gD && sonuc && tuval.getContext) {
      var ctx = tuval.getContext("2d");
      var degerler = { a: $("#lab-denge-a-deger"), b: $("#lab-denge-b-deger"), c: $("#lab-denge-c-deger"), d: $("#lab-denge-d-deger") };
      function ciz() {
        var a = +gA.value, b = +gB.value, c = +gC.value, d = +gD.value;
        if (degerler.a) degerler.a.textContent = String(a);
        if (degerler.b) degerler.b.textContent = String(b);
        if (degerler.c) degerler.c.textContent = String(c);
        if (degerler.d) degerler.d.textContent = String(d);
        var pe = (a - c) / (b + d), qe = (a * d + b * c) / (b + d);
        sonuc.textContent = "P* = " + sayi(pe) + ", Q* = " + sayi(qe);
        var w = tuval.width, h = tuval.height, pad = 44;
        var xmax = Math.max(a / b, pe, 1) * 1.2, ymax = Math.max(a, c + d * xmax, 1) * 1.1;
        var X = function (x) { return pad + (x / xmax) * (w - 2 * pad); }, Y = function (y) { return h - pad - (y / ymax) * (h - 2 * pad); };
        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = renk("--kt-bg", "#fff"); ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = renk("--kt-border", "#ccc"); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(pad, pad); ctx.lineTo(pad, h - pad); ctx.lineTo(w - pad, h - pad); ctx.stroke();
        ctx.fillStyle = renk("--kt-muted", "#666"); ctx.font = "12px system-ui, sans-serif";
        ctx.fillText("P", w - pad + 8, h - pad + 4); ctx.fillText("Q", pad - 4, pad - 8);
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = renk("--kt-accent", "#0b66f6");
        ctx.beginPath(); ctx.moveTo(X(0), Y(a)); ctx.lineTo(X(a / b), Y(0)); ctx.stroke();
        ctx.strokeStyle = renk("--kt-fg", "#111");
        ctx.beginPath(); ctx.moveTo(X(0), Y(c)); ctx.lineTo(X(xmax), Y(c + d * xmax)); ctx.stroke();
        if (pe > 0 && qe > 0) {
          ctx.fillStyle = renk("--kt-accent", "#0b66f6");
          ctx.beginPath(); ctx.arc(X(pe), Y(qe), 5, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = renk("--kt-fg", "#111");
          ctx.fillText("D (" + sayi(pe) + ", " + sayi(qe) + ")", X(pe) + 8, Y(qe) - 8);
        }
      }
      [gA, gB, gC, gD].forEach(function (g) { g.addEventListener("input", ciz); });
      temaIzle(ciz);
      ciz();
    }
  }
  if (document.readyState !== "loading") boot(); else document.addEventListener("DOMContentLoaded", boot);
  document.addEventListener("kt:hazir", boot);
})();
