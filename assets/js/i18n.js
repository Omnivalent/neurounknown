// NeuroUnknown page translation (v2.15). The English page is the reference; every other language is applied in the browser
// from a dictionary (assets/i18n/<lang>.json) built from the site's own text. The main app page also exists per language
// (index.<lang>.html) with the atlas data already translated, and the questions come from quiz.<lang>.json.
// How it works: each element whose own text is a sentence (with links or bold words inside) is looked up as one unit, so the
// word order can change between languages; numbers are kept and written the local way; text that the app builds from
// pieces is matched by patterns. Gene symbols, protein names from HGNC, database disease labels and paper titles are
// identifiers and stay as published. Language choice is stored on this device only.
(function () {
  'use strict';
  var LANGS = { en: 'English', de: 'Deutsch', fr: 'Français', es: 'Español', it: 'Italiano', ar: 'العربية', zh: '中文' };
  var root = document.documentElement;
  var pageLang = root.getAttribute('data-page-lang');           // set on index.html (en) and index.<lang>.html
  var lang = 'en';
  try { lang = localStorage.getItem('nu-lang') || 'en'; } catch (e) {}
  if (pageLang) lang = pageLang;
  if (!LANGS[lang]) lang = 'en';
  try { localStorage.setItem('nu-lang', lang); } catch (e) {}

  var INLINE = { A: 1, B: 1, STRONG: 1, EM: 1, I: 1, SPAN: 1, CODE: 1, SMALL: 1, SUP: 1, SUB: 1, ABBR: 1, MARK: 1, U: 1, BR: 1, KBD: 1,
    TIME: 1, CITE: 1, Q: 1, S: 1, VAR: 1, TSPAN: 1, WBR: 1, DFN: 1, INS: 1, DEL: 1, BUTTON: 1 };
  var SKIP = { SCRIPT: 1, STYLE: 1, NOSCRIPT: 1, TEXTAREA: 1, TEMPLATE: 1, CANVAS: 1, IFRAME: 1 };
  var ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  // a number standing alone (not part of 5-HT1A, A1, 22q11.2, v2.15, 60-80); ISO dates count as one number and keep their form
  var NUM = /\d{4}-\d{2}-\d{2}|(?<![\w.\-+\/<])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w\-+\/>]|\.\d)|(?<![\w.\-+\/<])\d+(?:\.\d+)?(?![\w\-+\/>]|\.\d)/g;

  // an English month name next to a number is kept apart as {M} and written in the page language
  var MON = /\b(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b(?=\s+\d)|(?<=\d\s)(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sept|Sep|Oct|Nov|Dec)\b/g;
  var MIDX = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Sept: 8, Oct: 9, Nov: 10, Dec: 11 };
  var MONTHS = {
    de: [['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'], ['Jan.', 'Feb.', 'März', 'Apr.', 'Mai', 'Juni', 'Juli', 'Aug.', 'Sept.', 'Okt.', 'Nov.', 'Dez.']],
    fr: [['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'], ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']],
    es: [['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'], ['ene.', 'feb.', 'mar.', 'abr.', 'may.', 'jun.', 'jul.', 'ago.', 'sept.', 'oct.', 'nov.', 'dic.']],
    it: [['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'], ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic']],
    ar: [['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'], null],
    zh: [['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], null] };
  function monL(m) { var T = MONTHS[lang]; if (!T || !m) return m || ''; var i = MIDX[m.slice(0, 3)]; return m.length > 4 || !T[1] ? T[0][i] : T[1][i]; }
  function ws(s) { return s.replace(/\s+/g, ' ').trim(); }
  function keyOf(s) {
    var nums = [], mons = [], i = 0;
    var k = ws(s).replace(MON, function (m) { mons.push(m); return '{M}'; }).replace(NUM, function (m) { nums.push(m); return '{' + (++i) + '}'; });
    return { k: k, n: nums, m: mons };
  }
  function fmtNum(m) {
    if (lang === 'en' || lang === 'zh' || lang === 'ar' || /^\d{4}-\d{2}-\d{2}$/.test(m)) return m;
    var grouped = m.indexOf(',') >= 0, p = m.replace(/,/g, '').split('.'), int = p[0], dec = p[1];
    var sep = { de: '.', it: '.', fr: ' ', es: ' ' }[lang];
    if (grouped && !(lang === 'es' && int.length < 5)) int = int.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
    return dec != null ? int + ',' + dec : int;
  }
  function fill(t, nums, mons) { var q = 0; return t.replace(/\{(\d+)\}/g, function (_, j) { var v = nums[+j - 1]; return v == null ? '' : fmtNum(v); }).replace(/\{M\}/g, function () { return monL((mons || [])[q++]); }); }

  var D = null, PAT = [];                   // D.t: key -> translation; D.p: patterns with {s} -> translation
  function esc(s) { return s.replace(/[.*+?^$()|[\]\\{}]/g, '\\$&'); }
  function compile() {
    PAT = [];
    Object.keys(D.p || {}).forEach(function (k) {
      PAT.push([new RegExp('^' + k.split('{s}').map(esc).join('(.+?)') + '$'), D.p[k], k.length]);
    });
    PAT.sort(function (a, b) { return b[2] - a[2]; });   // longest (most specific) pattern first
  }
  // translate a key (numbers already replaced by {i}); returns null if unknown
  // look up a captured piece of a pattern; its number markers are renumbered from {1} for the lookup and mapped back
  function sub(g) {
    var map = [], k = ws(g).replace(/\{(\d+)\}/g, function (_, j) { map.push(j); return '{' + map.length + '}'; });
    var x = D.t[k];
    if (x == null) return g;
    return x.replace(/\{(\d+)\}/g, function (_, j) { return '{' + (map[+j - 1] || j) + '}'; });
  }
  function look(k) {
    if (!D) return null;
    var v = D.t[k];
    if (v != null) return v;
    for (var i = 0; i < PAT.length; i++) {
      var m = PAT[i][0].exec(k);
      if (m) { var j = 0; return PAT[i][1].replace(/\{s\}/g, function () { j++; return sub(m[j] || ''); }); }
    }
    return null;
  }
  function tr(s) {          // public: translate a plain string (used by the app for canvas text, alerts and the score card)
    if (lang === 'en' || !D || !s) return s;
    var o = keyOf(s), v = look(o.k);
    return v == null ? s : fill(v, o.n, o.m);
  }

  var MISS = Object.create(null), collecting = false;
  function miss(k) { if (collecting && /[A-Za-z]{2}/.test(k)) MISS[k] = (MISS[k] || 0) + 1; }
  var DONE = new WeakMap();                  // element -> text we wrote (skip if unchanged)
  function skipEl(el) {
    if (SKIP[el.tagName]) return true;
    if (el.getAttribute && (el.getAttribute('translate') === 'no' || (el.classList && el.classList.contains('notranslate')))) return true;
    if (el.isContentEditable) return true;
    return false;
  }
  function onlyInline(el) {
    for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 1 && !INLINE[c.tagName.toUpperCase()]) return false;
    return true;
  }
  function ownText(el) { for (var c = el.firstChild; c; c = c.nextSibling) if (c.nodeType === 3 && /[A-Za-z]/.test(c.nodeValue)) return true; return false; }
  function doEl(el) {
    if (!ownText(el)) return;
    if (onlyInline(el)) {
      var els = [], raw = '';
      for (var c = el.firstChild; c; c = c.nextSibling) {
        if (c.nodeType === 3) raw += c.nodeValue;
        else if (c.nodeType === 1) { els.push(c); raw += '<' + els.length + '>'; }
      }
      if (DONE.get(el) === raw) return;
      var o = keyOf(raw), v = look(o.k);
      if (v == null) { miss(o.k); return; }
      var out = fill(v, o.n, o.m), lead = /^\s/.test(raw) ? ' ' : '', tail = /\s$/.test(raw) ? ' ' : '';
      var pieces = out.split(/<(\d+)>/), frag = document.createDocumentFragment(), used = {};
      for (var i = 0; i < pieces.length; i++) {
        if (i % 2 === 0) { var t = (i === 0 ? lead : '') + pieces[i] + (i === pieces.length - 1 ? tail : ''); if (t) frag.appendChild(document.createTextNode(t)); }
        else { var e = els[+pieces[i] - 1]; if (e && !used[pieces[i]]) { frag.appendChild(e); used[pieces[i]] = 1; } }
      }
      els.forEach(function (e, j) { if (!used[j + 1]) frag.appendChild(e); });   // never lose a link or control
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(frag);
      var now = '', n2 = 0;
      for (var c2 = el.firstChild; c2; c2 = c2.nextSibling) now += c2.nodeType === 3 ? c2.nodeValue : '<' + (++n2) + '>';
      DONE.set(el, now);
      return;
    }
    for (var c3 = el.firstChild; c3; c3 = c3.nextSibling) {           // block children: each loose text run on its own
      if (c3.nodeType !== 3 || !/[A-Za-z]/.test(c3.nodeValue)) continue;
      var o3 = keyOf(c3.nodeValue), v3 = look(o3.k);
      if (v3 == null) { miss(o3.k); continue; }
      var l3 = /^\s/.test(c3.nodeValue) ? ' ' : '', t3 = /\s$/.test(c3.nodeValue) ? ' ' : '';
      c3.nodeValue = l3 + fill(v3, o3.n, o3.m) + t3;
    }
  }
  function doAttrs(el) {
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i], v = el.getAttribute(a);
      if (!v || !/[A-Za-z]/.test(v)) continue;
      var mark = '_i18n_' + a;
      if (el[mark] === v) continue;
      var o = keyOf(v), t = look(o.k);
      if (t == null) { miss(o.k); continue; }
      var out = fill(t, o.n, o.m); el.setAttribute(a, out); el[mark] = out;
    }
    if (el.tagName === 'INPUT' && /^(button|submit|reset)$/i.test(el.type) && el.value) {
      var o2 = keyOf(el.value), t2 = look(o2.k); if (t2 != null) el.value = fill(t2, o2.n, o2.m); else miss(o2.k);
    }
    if (el.tagName === 'A' && lang !== 'en') {                // stay in the same language on the main app page
      var h = el.getAttribute('href');
      if (h && /^index\.html(#|$)/.test(h)) el.setAttribute('href', 'index.' + lang + '.html' + h.slice(10));
    }
  }
  function walk(node) {
    if (node.nodeType === 3) { if (node.parentElement) walk(node.parentElement); return; }
    if (node.nodeType !== 1) return;
    for (var p = node; p && p !== root; p = p.parentElement) if (skipEl(p)) return;
    var it = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT, { acceptNode: function (e) { return skipEl(e) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    var e = node;
    while (e) { doAttrs(e); doEl(e); e = it.nextNode(); }
  }
  function doTitle() {
    var t = document.title; if (!t || doTitle.last === t) return;
    var o = keyOf(t), v = look(o.k);
    if (v == null) { miss(o.k); return; }
    document.title = doTitle.last = fill(v, o.n, o.m);
  }

  var obs = null, OPT = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ATTRS.concat(['href']) };
  function observe() {
    obs = new MutationObserver(function (recs) {
      obs.disconnect();
      var seen = new Set();
      recs.forEach(function (r) {
        if (r.type === 'childList') r.addedNodes.forEach(function (a) { if (a.nodeType === 1) seen.add(a); else if (a.parentElement) seen.add(a.parentElement); });
        var n = r.type === 'characterData' ? r.target.parentElement : r.target;
        if (n && n.nodeType === 1) seen.add(n);
      });
      seen.forEach(function (n) { if (n.isConnected) walk(n); });
      doTitle();
      obs.observe(root, OPT);
    });
    obs.observe(root, OPT);
  }
  function note() {
    if (lang === 'en' || document.getElementById('i18nNote')) return;
    var n = document.createElement('div'); n.id = 'i18nNote'; n.className = 'i18n-note';
    n.textContent = 'Translated with AI from the English reference version; not yet reviewed by native-speaker clinicians. Gene symbols, protein names, database disease labels and paper titles stay as published.';
    var m = document.querySelector('main') || document.body; m.insertBefore(n, m.firstChild);
  }
  function selector() {
    var tools = document.querySelector('header.site .hdr-tools');
    if (!tools || document.getElementById('langSel')) return;
    var s = document.createElement('select'); s.id = 'langSel'; s.className = 'lang-sel notranslate'; s.setAttribute('aria-label', 'Language');
    Object.keys(LANGS).forEach(function (k) { var o = document.createElement('option'); o.value = k; o.textContent = LANGS[k]; s.appendChild(o); });
    s.value = lang;
    s.addEventListener('change', function () {
      var v = s.value; try { localStorage.setItem('nu-lang', v); } catch (e) {}
      if (pageLang) location.href = (v === 'en' ? 'index.html' : 'index.' + v + '.html') + location.hash;
      else location.reload();
    });
    tools.insertBefore(s, tools.firstChild);
  }
  function show() { root.classList.remove('i18n-wait'); }
  function start() {
    selector();
    if (lang === 'en') { show(); return; }
    note();
    var x = new XMLHttpRequest();
    x.open('GET', 'assets/i18n/' + lang + '.json');
    x.onload = function () {
      try { D = JSON.parse(x.responseText); compile(); } catch (e) { D = null; }
      if (D) { walk(document.body); doTitle(); observe(); }
      show();
    };
    x.onerror = show;
    x.send();
    setTimeout(show, 4000);
  }
  // for the build's checks: walk the page and return every text key that has no translation (keys(): as if nothing were translated)
  window.NUi18n = { lang: lang, t: tr, ready: function () { return !!D || lang === 'en'; },
    collect: function () { collecting = true; MISS = Object.create(null); DONE = new WeakMap(); walk(document.body); doTitle.last = null; doTitle(); collecting = false; return MISS; },
    keys: function () {
      var d0 = D; D = { t: {}, p: {} }; PAT = []; collecting = true; MISS = Object.create(null); DONE = new WeakMap();
      walk(document.body); doTitle.last = null; doTitle(); collecting = false; D = d0; if (D) compile(); return MISS; } };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
