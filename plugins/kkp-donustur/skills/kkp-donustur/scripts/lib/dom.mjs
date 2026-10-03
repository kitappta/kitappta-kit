// parse5 düğüm yardımcıları — kaynak-donustur.mjs'dekilerin aynısı (o dosyaya dokunulmaz); tekrar-ekle / lab-ekle / bolum-metni paylaşır.
// Bağımlılık yok (parse5 ağaç biçimi: nodeName/tagName/attrs/childNodes/parentNode).

const NS = "http://www.w3.org/1999/xhtml";
export const attr = (n, k) => (n.attrs || []).find((a) => a.name === k)?.value;
export const setAttr = (n, k, v) => { const a = (n.attrs || []).find((x) => x.name === k); if (a) a.value = v; else (n.attrs ||= []).push({ name: k, value: v }); };
export const delAttr = (n, k) => { if (n.attrs) n.attrs = n.attrs.filter((a) => a.name !== k); };
export const isEl = (n) => !!n && typeof n.tagName === "string";
export const classes = (n) => (attr(n, "class") || "").split(/\s+/).filter(Boolean);
export const hasClass = (n, c) => classes(n).includes(c);
export const addClass = (n, c) => { const cs = classes(n); if (!cs.includes(c)) setAttr(n, "class", [...cs, c].join(" ")); };
export const kids = (n) => (n.childNodes || []).filter(isEl);
export const walk = (n, f) => { f(n); for (const c of [...(n.childNodes || [])]) walk(c, f); };
export const text = (n) => { let s = ""; walk(n, (x) => { if (x.nodeName === "#text") s += x.value; }); return s; };
export const METIN_DISI = new Set(["annotation", "annotation-xml", "script", "style", "template"]);
/** Blok metni: TeX annotation/script/style dışarıda (doğrulayıcı ve runtime ile aynı kural). */
export const blokMetni = (n) => { let s = ""; (function gez(x) { if (x.nodeName === "#text") { s += x.value; return; } if (isEl(x) && METIN_DISI.has(x.tagName)) return; for (const c of x.childNodes || []) gez(c); })(n); return s; };
/**
 * Elemanın blok sınıfı — bolum-metni.mjs'teki bolumSatirlari if-zincirinin (Plan 28 A1) AYNI sırayla taşınmış hali;
 * A6 (ses-metni) da bunu kullanır (Plan 28 A1 ↔ A6). Dönüş: sınıflanırsa "tekrar"|"kart"|"istek"|"kutu"|"dipnot"|
 * "esitlik"|"baslik"|"sekil"|"tablo"|"liste"|"metin"|"iframe"; sınıflanmazsa null (çağıran çocuklara iner).
 * METIN_DISI (annotation/script/style/template) atlaması burada DEĞİL, çağıranda kalır (bu fonksiyon yalnız sınıflar).
 */
export function blokSinifla(el) {
  if (!isEl(el)) return null;
  const tag = el.tagName;
  if (tag === "section" && hasClass(el, "kt-tekrar")) return "tekrar";
  if (tag === "details" && hasClass(el, "kt-kart")) return "kart";
  if (tag === "div" && hasClass(el, "kt-kutu") && hasClass(el, "kt-etkilesim-istegi")) return "istek";
  if (tag === "div" && hasClass(el, "kt-kutu")) return "kutu";
  if (tag === "aside" && hasClass(el, "kt-dipnot")) return "dipnot";
  if (tag === "p" && hasClass(el, "kt-esitlik")) return "esitlik";
  if (/^h[1-6]$/.test(tag)) return "baslik";
  if (tag === "figure") return "sekil";
  if (tag === "table") return "tablo";
  if (tag === "li") return "liste";
  if (["p", "blockquote", "pre", "dt", "dd", "summary"].includes(tag)) return "metin";
  if (tag === "iframe") return "iframe";
  return null;
}
export const detach = (n) => { const p = n.parentNode; if (!p) return; p.childNodes = p.childNodes.filter((c) => c !== n); n.parentNode = null; };
export const append = (p, n) => { detach(n); (p.childNodes ||= []).push(n); n.parentNode = p; };
export const insertBefore = (p, n, ref) => { detach(n); const i = p.childNodes.indexOf(ref); if (i < 0) return append(p, n); p.childNodes.splice(i, 0, n); n.parentNode = p; };
/** ref'in hemen ardına ekler (ref'in ebeveynine). */
export const insertAfter = (ref, n) => { const p = ref.parentNode; detach(n); const i = p.childNodes.indexOf(ref); p.childNodes.splice(i + 1, 0, n); n.parentNode = p; };
export const replaceWith = (eski, ...yeniler) => { const p = eski.parentNode; const i = p.childNodes.indexOf(eski); for (const y of yeniler) detach(y); p.childNodes.splice(i, 1, ...yeniler); for (const y of yeniler) y.parentNode = p; eski.parentNode = null; };
export const eleman = (tag, attrs = {}) => ({ nodeName: tag, tagName: tag, attrs: Object.entries(attrs).map(([name, value]) => ({ name, value })), namespaceURI: NS, childNodes: [], parentNode: null });
export const metinDugumu = (s) => ({ nodeName: "#text", value: s, parentNode: null });
function kardes(n, yon) {
  const p = n.parentNode; if (!p) return null;
  let i = p.childNodes.indexOf(n) + yon;
  for (; i >= 0 && i < p.childNodes.length; i += yon) { const c = p.childNodes[i]; if (isEl(c)) return c; if (c.nodeName === "#text" && c.value.trim()) return null; }
  return null;
}
export const sonrakiEl = (n) => kardes(n, 1);
export const oncekiEl = (n) => kardes(n, -1);
export const atali = (n, f) => { for (let p = n.parentNode; p; p = p.parentNode) if (isEl(p) && f(p)) return true; return false; };
/** İlk eşleşen eleman (belge sırası) | null. */
export function bul(kok, pred) {
  const yigin = [kok];
  while (yigin.length) {
    const n = yigin.shift();
    if (isEl(n) && pred(n)) return n;
    if (n.childNodes) yigin.unshift(...n.childNodes);
  }
  return null;
}
/** Eşleşen elemanların dizisi (belge sırası). */
export function bulHepsi(kok, pred) { const out = []; walk(kok, (n) => { if (isEl(n) && pred(n)) out.push(n); }); return out; }
export const byId = (kok, id) => bul(kok, (n) => attr(n, "id") === id);
/** & < > " kaçışı (öznitelik ve metin için). */
export const htmlKacis = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
