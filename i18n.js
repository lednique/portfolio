/* ==========================================================================
   LEDNIQUE – переключение языка и подстановка переводов.
   Словарь нужного языка грузится в <head> (lang/<code>.js) до отрисовки,
   здесь он применяется к тексту и атрибутам.
   ========================================================================== */
(() => {
  'use strict';
  const CODES = { ru: 'RU', en: 'EN', zh: '中文', ja: '日本語', pt: 'PT', fr: 'FR', ar: 'العربية' };
  const lang = document.documentElement.dataset.lang || 'ru';
  const dict = window.LEDNIQUE_DICT || null;

  const codeEl = document.querySelector('[data-lang-code]');
  if (codeEl) codeEl.textContent = CODES[lang] || lang.toUpperCase();

  /* ---------- выпадающий список языков в футере ---------- */
  const box = document.querySelector('[data-lang]');
  if (box) {
    const btn = box.querySelector('[data-lang-toggle]');
    const menu = box.querySelector('.lang__menu');
    const close = () => { if (menu) menu.hidden = true; if (btn) btn.setAttribute('aria-expanded', 'false'); };
    if (btn && menu) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const open = menu.hidden;
        menu.hidden = !open;
        btn.setAttribute('aria-expanded', String(open));
      });
      document.addEventListener('click', (e) => { if (!box.contains(e.target)) close(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
    box.querySelectorAll('[data-set-lang]').forEach((b) => {
      b.setAttribute('aria-selected', String(b.dataset.setLang === lang));
      b.addEventListener('click', () => {
        try { localStorage.setItem('lednique-lang', b.dataset.setLang); } catch (err) {}
        location.reload();
      });
    });
  }

  /* «понимаю английский» – только для языков, кроме русского и английского */
  const enNote = document.querySelector('[data-en-note]');
  if (enNote && (lang === 'ru' || lang === 'en')) enNote.remove();

  if (!dict || lang === 'ru') return;

  /* ключи сравниваем без лишних пробелов и переводов строк */
  const NORM = (s) => s.replace(/\s+/g, ' ').trim();
  const DICT = {};
  Object.keys(dict).forEach((k) => { DICT[NORM(k)] = dict[k]; });

  const T = (s) => {
    if (!s) return null;
    const k = NORM(s);
    if (!k) return null;
    const tr = DICT[k];
    return (typeof tr === 'string' && tr) ? tr : null;
  };

  /* ---------- текст ---------- */
  const nodes = [];
  const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walk.nextNode()) nodes.push(walk.currentNode);
  nodes.forEach((n) => {
    const t = n.nodeValue.trim();
    const tr = T(t);
    if (!tr || tr === t) return;
    n.nodeValue = n.nodeValue.replace(t, tr);
  });

  /* ---------- атрибуты ---------- */
  ['placeholder', 'aria-label', 'title', 'alt'].forEach((attr) => {
    document.querySelectorAll('[' + attr + ']').forEach((el) => {
      const tr = T(el.getAttribute(attr));
      if (tr) el.setAttribute(attr, tr);
    });
  });

  /* ---------- title страницы ---------- */
  const tt = T(document.title);
  if (tt) document.title = tt;

  /* ---------- строки, которые собирает app.js ---------- */
  window.LEDNIQUE_T = (s) => T(s) || s;
})();
