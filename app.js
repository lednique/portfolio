/* ==========================================================================
   LEDNIQUE – app.js (v2)
   карусели (один движок, бесконечный режим) · AR-видео по очереди ·
   герои: фон ×3, рыбы + инерция · pinned-шаги · форма → письмо · футер
   ========================================================================== */
(() => {
  'use strict';
  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const small = () => matchMedia('(max-width:720px)').matches;
  const MAIL_TO = 'lednique1@ya.ru';
  /* перевод строк, которые скрипт создаёт уже после i18n.js */
  const TR = (str, vars) => {
    let out = (typeof window.LEDNIQUE_T === 'function' ? window.LEDNIQUE_T(str) : str) || str;
    if (vars) Object.keys(vars).forEach((k) => { out = out.split('{' + k + '}').join(vars[k]); });
    return out;
  };
  document.documentElement.classList.add('js');

  /* ---------- шапка ---------- */
  /* масштаб страницы (html{zoom:.85}) и высота окна в «внутренних» px */
  const getZ = () => innerWidth / (document.documentElement.offsetWidth || innerWidth) || 1;
  const setVh = () => document.documentElement.style.setProperty('--vh', (innerHeight / getZ()).toFixed(1) + 'px');
  setVh();

  /* ---------- SVG-фильтр «искривление» для стекла (Glisse Bend на максимум) ---------- */
  (() => {
    if (document.getElementById('glisse-bend')) return;
    const NS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.setAttribute('aria-hidden', 'true');
    svg.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';
    svg.innerHTML = '<defs><filter id="glisse-bend" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">' +
      '<feTurbulence type="fractalNoise" baseFrequency="0.012 0.018" numOctaves="3" seed="9" result="n"/>' +
      '<feDisplacementMap in="SourceGraphic" in2="n" scale="34" xChannelSelector="R" yChannelSelector="G"/>' +
      '</filter></defs>';
    document.body.appendChild(svg);
  })();

  const nav = $('#nav');
  /* шапка: градиент при прокрутке (мобила) и появление направлений
     после героя на главной (аватарка + заголовок + иконки софта) */
  (() => {
    if (!nav) return;
    const hero = $('.home-hero');
    const isHome = document.body.classList.contains('page-home');
    const upd = () => {
      nav.classList.toggle('is-scrolled', scrollY > 8);
      if (isHome && hero) nav.classList.toggle('is-hero-passed', hero.getBoundingClientRect().bottom < 80);
    };
    addEventListener('scroll', upd, { passive: true });
    addEventListener('resize', upd); addEventListener('load', upd); upd();
    /* меню не влезает в строку – показываем градиент у обрезанного края */
    const links = $('.nav__links');
    if (links) {
      const cut = () => {
        const max = links.scrollWidth - links.clientWidth;
        links.classList.toggle('is-cut-l', links.scrollLeft > 4);
        links.classList.toggle('is-cut-r', max > 4 && links.scrollLeft < max - 4);
      };
      links.addEventListener('scroll', cut, { passive: true });
      addEventListener('resize', cut); addEventListener('load', cut); cut();
      if ('ResizeObserver' in window) new ResizeObserver(cut).observe(links);
      document.addEventListener('lednique:lang', cut);
      setTimeout(cut, 300);
      /* мобильное меню: сразу проматываем к активной кнопке (страница, где находимся) */
      const act = links.querySelector('.is-active');
      const toActive = () => {
        if (!act) return;
        const max = links.scrollWidth - links.clientWidth;
        if (max <= 4) return;
        const r = act.getBoundingClientRect(), lr = links.getBoundingClientRect();
        links.scrollLeft = Math.max(0, Math.min(max, links.scrollLeft + (r.left - lr.left) - (links.clientWidth - r.width) / 2));
        cut();
      };
      toActive(); addEventListener('load', toActive);
      document.addEventListener('lednique:lang', toActive);
      setTimeout(toActive, 350);
    }
  })();
  /* меню прячется, когда долистали до футера */
  (() => {
    const f = $('.foot'); if (!f || !nav) return;
    const upd = () => nav.classList.toggle('is-away', f.getBoundingClientRect().top < innerHeight * .5 && !small());
    addEventListener('scroll', upd, { passive: true }); addEventListener('resize', upd); upd();
  })();
  /* подсветка пунктов #process / #about на главной */
  if (document.body.classList.contains('page-home')) {
    const links = $$('[data-nav*="#"]');
    const setActive = (id) => $$('[data-nav]').forEach(a => a.classList.toggle('is-active', a.dataset.nav === (id ? 'index.html#' + id : 'index.html')));
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach(e => {
        if (e.isIntersecting) setActive(e.target.id); else if (location.hash === '' ) { /* оставляем */ }
      }), { rootMargin: '-45% 0px -45% 0px' });
      ['process', 'about'].forEach(id => { const s = document.getElementById(id); s && io.observe(s); });
      const out = new IntersectionObserver((es) => es.forEach(e => { if (e.isIntersecting) setActive(null); }), { rootMargin: '-45% 0px -45% 0px' });
      ['services', 'request'].forEach(id => { const s = document.getElementById(id); s && out.observe(s); });
      const h = $('.home-hero'); h && out.observe(h);
    }
  }

  /* ---------- иконки софта: мягкий свет под курсором ---------- */
  $$('.stack-line').forEach((line) => {
    const icos = $$('.ico', line);
    const clear = () => icos.forEach(i => i.classList.remove('is-lit'));
    line.addEventListener('pointermove', (e) => {
      icos.forEach((ico) => {
        const r = ico.getBoundingClientRect();
        const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
        ico.classList.toggle('is-lit', inside);
        if (inside) {
          ico.style.setProperty('--mx', ((e.clientX - r.left) / (r.width || 1) * 100).toFixed(1) + '%');
          ico.style.setProperty('--my', ((e.clientY - r.top) / (r.height || 1) * 100).toFixed(1) + '%');
        }
      });
    });
    line.addEventListener('pointerleave', clear);
  });

  /* ---------- появление блоков ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver((es) => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
    $$('.reveal').forEach(el => io.observe(el));
  } else $$('.reveal').forEach(el => el.classList.add('is-in'));

  /* ---------- заголовки: ширина = доля ширины родителя ---------- */
  const fitH1 = () => {
    $$('[data-fit]').forEach((h) => {
      const sp = h.firstElementChild;
      if (small()) { h.style.fontSize = ''; return; }
      h.style.fontSize = '100px';
      const pw = h.clientWidth, sw = sp.offsetWidth || 1;
      h.style.fontSize = (100 * parseFloat(h.dataset.fit) * pw / sw).toFixed(2) + 'px';
    });
  };
  (document.fonts?.ready || Promise.resolve()).then(fitH1); fitH1(); addEventListener('resize', fitH1);

  /* ---------- центральное изображение/галерея героя вписывается до блока «перечень работ» ---------- */
  const fitBoxes = () => {
    setVh();
    $$('[data-hero]').forEach((hero) => {
      const box = $('[data-fitbox]', hero);
      if (!box) return;
      /* фиксированная ширина + адаптивная высота (например, главное изображение «Графики») */
      if (box.hasAttribute('data-fixed')) { box.style.height = ''; box.style.minHeight = ''; return; }
      if (small()) { box.style.height = ''; box.style.minHeight = ''; hero.style.minHeight = ''; return; }
      const LH = innerHeight / getZ();
      hero.style.minHeight = '0px'; box.style.minHeight = '0px'; box.style.height = '0px';
      const used = hero.offsetHeight;
      box.style.height = Math.max(box.classList.contains('car') ? 300 : 140, LH - used) + 'px';
      hero.style.minHeight = LH + 'px';
    });
  };
  const snapSections = () => {};
  const relayout = () => { fitH1(); fitBoxes(); snapSections(); };
  (document.fonts?.ready || Promise.resolve()).then(relayout);
  addEventListener('load', relayout); addEventListener('resize', relayout);
  setTimeout(relayout, 0);

  /* ---------- «доводчик»: недолистанный блок сам довинчивается до экрана ---------- */
  (() => {
    if (reduce) return;
    let timer = 0, raf = 0, busy = false;
    const pages = () => [...$$('main > *'), $('.foot')].filter(Boolean);
    const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } busy = false; };
    const pick = () => {
      const H = innerHeight;
      let best = null;
      pages().forEach((p) => {
        const r = p.getBoundingClientRect(), h = r.height;
        if (r.bottom < -H || r.top > 2 * H) return;
        const cands = [];
        if (h <= H) cands.push(r.top - (H - h) / 2);                            // блок помещается – по центру экрана
        else {                                                                   // длинный блок – только у краёв
          if (Math.abs(r.top) < H * .45) cands.push(r.top);
          if (Math.abs(r.bottom - H) < H * .45) cands.push(r.bottom - H);
        }
        cands.forEach((d) => { if (!best || Math.abs(d) < Math.abs(best)) best = d; });
      });
      return best;
    };
    const run = () => {
      if (small() || busy) return;
      let d = pick();
      if (d == null || Math.abs(d) < 2 || Math.abs(d) > innerHeight * .55) return;
      const maxY = document.documentElement.scrollHeight - innerHeight;
      busy = true;
      const y0 = scrollY, t0 = performance.now(), dur = clamp(Math.abs(d) * 1.1 + 260, 320, 700);
      let target = y0 + d;
      const step = (t) => {
        const k = clamp((t - t0) / dur, 0, 1), e = 1 - Math.pow(1 - k, 3);
        scrollTo({ top: y0 + (target - y0) * e, behavior: 'instant' });
        if (k < 1) raf = requestAnimationFrame(step);
        else { raf = 0; busy = false; }
      };
      raf = requestAnimationFrame(step);
    };
    const arm = () => { if (busy) return; clearTimeout(timer); timer = setTimeout(run, 140); };
    addEventListener('scroll', arm, { passive: true });
    ['wheel', 'touchstart', 'keydown', 'pointerdown'].forEach((ev) => addEventListener(ev, () => { clearTimeout(timer); stop(); }, { passive: true }));
    addEventListener('touchend', arm, { passive: true });
    addEventListener('load', () => setTimeout(run, 600));
  })();

  /* ==========================================================================
     КАРУСЕЛИ – один движок
     режимы: data-loop (бесконечная, клоны ×3) · car--center · по умолчанию «старт»
     ========================================================================== */
  const cars = new Map();

  /* ==========================================================================
     ГАЛЕРЕИ: непрерывное линейное движение справа налево (transform, 60 fps,
     не зависит от прокрутки страницы). Стрелки/точки/перетаскивание – поверх.
     ========================================================================== */
  function initFlow(root) {
    const sc = $('.car__scroller', root);
    const center = root.classList.contains('car--center');
    const orig = [...sc.children], n = orig.length;
    root.classList.add('car--flow');
    const mk = () => orig.map(el => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); return c; });
    const track = document.createElement('div'); track.className = 'car__track';
    [...mk(), ...orig, ...mk()].forEach(el => track.appendChild(el));
    sc.appendChild(track);
    const all = [...track.children];
    $$('img', track).forEach(i => { i.loading = 'eager'; i.draggable = false; });
    const countEl = $('[data-count]', root), dotsEl = $('[data-dots]', root);
    const prevB = $('[data-prev]', root), nextB = $('[data-next]', root);
    const SPEED = 40;                                   /* px/с */
    let T = [], x = 0, last = 0, onScreen = false, drag = null, anim = null, cur = -1, suppress = false;
    const padL = () => parseFloat(getComputedStyle(sc).paddingLeft) || 0;
    const measure = () => {
      const P = padL(), W = sc.clientWidth;
      T = all.map(el => center ? P + el.offsetLeft - (W - el.offsetWidth) / 2 : el.offsetLeft);
    };
    const start = n + parseInt(root.dataset.start || '0', 10);
    const dots = [];
    if (dotsEl) orig.forEach((_, i) => {
      const b = document.createElement('button'); b.className = 'car__dot'; b.type = 'button'; b.setAttribute('aria-label', TR('Слайд {n}', { n: i + 1 }));
      b.addEventListener('click', () => animTo(T[n + i])); dotsEl.appendChild(b); dots.push(b);
    });
    const nearest = () => { let b = 0, bd = 1e9; for (let i = 0; i < T.length; i++) { const d = Math.abs(T[i] - x); if (d < bd) { bd = d; b = i; } } return b; };
    const paint = () => {
      const i = nearest(); if (i === cur) return; cur = i;
      const r = ((i % n) + n) % n;
      if (countEl) countEl.textContent = `${r + 1} / ${n}`;
      dots.forEach((d, k) => d.classList.toggle('is-on', k === r));
    };
    const wrap = () => { const lo = T[n], hi = T[2 * n]; if (hi > lo) { if (x >= hi) x -= hi - lo; else if (x < lo) x += hi - lo; } };
    const animTo = (x1) => { anim = { x0: x, x1, t0: performance.now(), d: 700 }; };
    prevB && prevB.addEventListener('click', () => { const i = nearest(); animTo(T[i - 1]); });
    nextB && nextB.addEventListener('click', () => { const i = nearest(); animTo(T[i + 1]); });

    sc.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      anim = null; drag = { x: e.clientX, x0: x, moved: false };
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = (e.clientX - drag.x) / getZ();
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; sc.classList.add('is-drag'); }
      if (drag.moved) { x = drag.x0 - dx; wrap(); }
    });
    const up = () => { if (!drag) return; if (drag.moved) { suppress = true; setTimeout(() => suppress = false, 0); } sc.classList.remove('is-drag'); drag = null; };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    sc.addEventListener('click', (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
    sc.addEventListener('dragstart', e => e.preventDefault());

    const init = () => { measure(); if (!last) x = T[start]; paint(); };
    init(); addEventListener('load', init);
    (document.fonts?.ready || Promise.resolve()).then(init);
    if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => { const k = ((cur % n) + n) % n; const frac = x - (T[cur] ?? x); measure(); if (cur >= 0) x = T[n + k] + frac; }); ro.observe(sc); ro.observe(all[0]); }
    if ('IntersectionObserver' in window) new IntersectionObserver((es) => es.forEach(e => { onScreen = e.isIntersecting; }), { threshold: .1 }).observe(root);
    else onScreen = true;

    const tick = (t) => {
      const dt = Math.min(64, t - (last || t)); last = t;
      if (T.length && onScreen && !document.hidden) {
        if (anim) {
          const k = clamp((t - anim.t0) / anim.d, 0, 1), e = k < .5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
          x = anim.x0 + (anim.x1 - anim.x0) * e;
          if (k >= 1) { anim = null; wrap(); }
        } else if (!drag && !reduce) { x += SPEED * dt / 1000; wrap(); }
        track.style.transform = `translate3d(${(-x).toFixed(2)}px,0,0)`;
        paint();
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    const api = { arm() {}, root };
    cars.set(root, api);
    return api;
  }
  function initCar(root) {
    if (!root.hasAttribute('data-vcar')) return initFlow(root);
    const sc = $('.car__scroller', root);
    const flow = !root.hasAttribute('data-vcar');          // галереи: непрерывное медленное движение справа налево
    const loop = root.hasAttribute('data-loop') || flow;
    if (flow) root.classList.add('car--flow');
    const center = root.classList.contains('car--center');
    const orig = [...sc.children];
    const n = orig.length;
    if (loop) {
      const mk = () => orig.map(el => { const c = el.cloneNode(true); c.setAttribute('aria-hidden', 'true'); c.dataset.clone = '1'; return c; });
      const before = mk(), after = mk();
      const first = sc.firstChild;
      before.forEach(c => sc.insertBefore(c, first));
      after.forEach(c => sc.appendChild(c));
    }
    const all = [...sc.children];
    const base = loop ? n : 0;
    const countEl = $('[data-count]', root), dotsEl = $('[data-dots]', root);
    const prevB = $('[data-prev]', root), nextB = $('[data-next]', root);
    const AUTO_MS = 7000;
    let hold = 0, idx = base, lastProg = 0, hooks = {}, autoT = 0, onScreen = false, dragging = false;

    const padL = () => parseFloat(getComputedStyle(sc).paddingLeft) || 0;
    const target = (i) => center
      ? all[i].offsetLeft - (sc.clientWidth - all[i].offsetWidth) / 2
      : all[i].offsetLeft - padL();
    const maxL = () => sc.scrollWidth - sc.clientWidth;
    const nearest = () => {
      if (!loop && maxL() > 0 && sc.scrollLeft >= maxL() - 3) return all.length - 1;
      let best = 0, bd = 1e9;
      all.forEach((_, i) => { const d = Math.abs(target(i) - sc.scrollLeft); if (d < bd) { bd = d; best = i; } });
      return best;
    };
    const dots = [];
    if (dotsEl) orig.forEach((_, i) => {
      const b = document.createElement('button');
      b.className = 'car__dot'; b.type = 'button'; b.setAttribute('aria-label', TR('Слайд {n}', { n: i + 1 }));
      b.addEventListener('click', () => api.userGo(loop ? Math.floor(idx / n) * n + i : i));
      dotsEl.appendChild(b); dots.push(b);
    });
    const paint = (i) => {
      idx = i;
      const r = loop ? ((i % n) + n) % n : i;
      if (countEl) countEl.textContent = `${r + 1} / ${n}`;
      dots.forEach((d, k) => d.classList.toggle('is-on', k === r));
      if (!loop && prevB) prevB.disabled = i <= 0;
    };
    const own = root.hasAttribute('data-vcar');          // видео-карусель ведёт свой таймер
    const arm = () => {
      clearTimeout(autoT);
      if (own || flow || !onScreen || reduce) return;
      autoT = setTimeout(() => {
        if (dragging) return arm();
        const i = idx + 1;
        api.go(!loop && i > all.length - 1 ? 0 : i);
      }, AUTO_MS);
    };
    const api = {
      arm, root, n, all, loop, nearest, get idx() { return idx; }, get base() { return base; },
      real: (i) => ((i % n) + n) % n,
      scrollTo(i, smooth = true) {
        lastProg = performance.now(); hold = lastProg + 1100;
        sc.scrollTo({ left: clamp(target(i), 0, Math.max(0, maxL())), behavior: smooth && !reduce ? 'smooth' : 'auto' });
      },
      go(i, smooth = true) { i = loop ? i : clamp(i, 0, all.length - 1); paint(i); api.scrollTo(i, smooth); hooks.go && hooks.go(i); arm(); },
      userGo(i) { hooks.user ? hooks.user(i) : api.go(i); },
      next() { const i = idx + 1; if (!loop && i > all.length - 1) return api.userGo(0); api.userGo(i); },
      prev() { api.userGo(loop ? idx - 1 : Math.max(0, idx - 1)); },
      hook(h) { Object.assign(hooks, h); }
    };
    prevB && prevB.addEventListener('click', () => api.prev());
    nextB && nextB.addEventListener('click', () => api.next());

    /* прокрутка: обновление индекса + «тихий» ре-центр после остановки */
    let ticking = false, idle = 0;
    const settle = () => {
      let i = nearest();
      if (loop && (i < n || i >= 2 * n)) {
        const delta = i < n ? n : -n;
        const stride = all[n].offsetLeft - all[0].offsetLeft;
        sc.classList.add('no-snap');
        sc.scrollLeft += Math.sign(delta) * stride;
        sc.classList.remove('no-snap');
        i += delta; paint(i);
        hooks.shift && hooks.shift(delta);
      }
      hooks.settle && hooks.settle(i, performance.now() - lastProg > 900);
      arm();
    };
    sc.addEventListener('scroll', () => {
      clearTimeout(idle); idle = setTimeout(settle, 120);
      if (ticking) return; ticking = true;
      requestAnimationFrame(() => { ticking = false; if (performance.now() > hold) paint(nearest()); });
    }, { passive: true });

    /* перетаскивание мышью */
    let drag = null, suppress = false;
    sc.addEventListener('pointerdown', (e) => {
      hold = 0; lastProg = 0;
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, l: sc.scrollLeft, moved: false, i: nearest() }; dragging = true;
    });
    addEventListener('pointermove', (e) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      if (!drag.moved && Math.abs(dx) > 5) { drag.moved = true; sc.classList.add('is-drag'); }
      if (drag.moved) sc.scrollLeft = drag.l - dx;
    });
    addEventListener('pointerup', (e) => {
      if (!drag) return;
      const d = drag; drag = null; dragging = false;
      if (d.moved) {
        suppress = true; setTimeout(() => suppress = false, 0);
        const dx = e.clientX - d.x;
        sc.classList.remove('is-drag');
        let i = nearest();
        if (Math.abs(dx) > 40 && i === d.i) i = d.i + (dx < 0 ? 1 : -1);
        if (!loop) i = clamp(i, 0, all.length - 1);
        paint(i);
        if (flow) { hold = performance.now() + 250; }
        else hooks.user ? hooks.user(i) : api.scrollTo(i);
      }
    });
    sc.addEventListener('click', (e) => { if (suppress) { e.preventDefault(); e.stopPropagation(); } }, true);
    sc.addEventListener('dragstart', e => e.preventDefault());

    const start = base + parseInt(root.dataset.start || '0', 10);
    const init = () => { paint(start); sc.classList.add('no-snap'); sc.scrollLeft = clamp(target(start), 0, Math.max(0, maxL())); sc.classList.remove('no-snap'); };
    init();
    addEventListener('load', () => api.scrollTo(idx, false));
    addEventListener('resize', () => api.scrollTo(idx, false));
    if ('ResizeObserver' in window) new ResizeObserver(() => { if (!dragging) api.scrollTo(idx, false); }).observe(all[base]);
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach(e => { onScreen = e.isIntersecting; arm(); }), { threshold: .35 }).observe(root);
    }
    /* непрерывное линейное движение (≈40 px/с), бесшовная петля */
    if (flow && !reduce) {
      const SPEED = 40;
      let last = 0, pos = 0;
      const stride = () => all[n].offsetLeft - all[0].offsetLeft;
      const tick = (t) => {
        const dt = Math.min(64, t - (last || t)); last = t;
        const now = performance.now();
        if (onScreen && !dragging && now > hold && !document.hidden) {
          if (Math.abs(pos - sc.scrollLeft) > 2.5) pos = sc.scrollLeft;
          pos += SPEED * dt / 1000;
          const s = stride();
          if (pos >= target(2 * n)) pos -= s;
          else if (pos < target(0)) pos += s;
          sc.scrollLeft = pos;
        } else pos = sc.scrollLeft;
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
    cars.set(root, api);
    return api;
  }
  $$('[data-car]').forEach(initCar);

  /* ---------- AR: видео из Kinescope – активный слайд проигрывает, остальные держат постер ---------- */
  $$('[data-vcar]').forEach((root) => {
    const car = cars.get(root), all = car.all, n = car.n;
    const frames = all.map(it => $('[data-frame]', it));
    const bars = all.map(it => $('.car__progress', it));
    const AUTO_MS = 8000;
    let cur = -1, visible = false, timer = 0, manual = false;

    const at = (i) => ((i % all.length) + all.length) % all.length;
    /* кадр Kinescope грузится только у активного слайда */
    const mount = (k) => {
      const f = frames[k];
      if (!f || f.dataset.live === '1') return;
      const src = f.dataset.frame; if (!src) return;
      const fr = document.createElement('iframe');
      fr.src = src;
      fr.setAttribute('frameborder', '0');
      fr.setAttribute('allowfullscreen', '');
      fr.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;');
      fr.setAttribute('title', 'AR-видео');
      f.appendChild(fr);
      f.dataset.live = '1'; f.classList.add('is-live');
    };
    const unmount = (k) => {
      const f = frames[k]; if (!f) return;
      $$('iframe', f).forEach(x => x.remove());
      f.dataset.live = ''; f.classList.remove('is-live');
    };
    const stopBar = (k) => {
      const b = bars[k]; if (!b) return;
      b.style.transition = 'none'; b.style.width = '0';
    };
    const runBar = (k) => {
      const b = bars[k]; if (!b) return;
      b.style.transition = 'none'; b.style.width = '0';
      void b.offsetWidth;
      b.style.transition = `width ${AUTO_MS}ms linear`; b.style.width = '100%';
    };

    function play(i, isManual) {
      i = car.loop ? i : at(i);
      clearTimeout(timer);
      const wasPlaying = cur >= 0;
      if (cur >= 0 && at(cur) !== at(i)) { unmount(at(cur)); stopBar(at(cur)); }
      cur = i; manual = !!isManual;
      all.forEach((it, k) => it.classList.toggle('is-active', k === i));
      mount(at(i)); runBar(at(i));
      car.go(i, wasPlaying);
      arm();
    }
    const arm = () => {
      clearTimeout(timer);
      if (!manual && visible) timer = setTimeout(() => play(cur + 1, false), AUTO_MS);
    };
    all.forEach((it, k) => it.addEventListener('click', () => { if (k !== cur) play(k, true); }));
    car.hook({
      user: (i) => play(i, true),
      settle: (i, user) => { if (i !== cur) play(i, !!user); },   /* играет всегда тот слайд, что в центре */
      shift: (delta) => {                       /* бесшовный ре-центр: тот же слайд в другом клоне */
        if (cur < 0) return;
        const o = cur, nn = cur + delta;
        unmount(at(o)); stopBar(at(o));
        all[o].classList.remove('is-active'); all[nn].classList.add('is-active');
        cur = nn; mount(at(nn)); runBar(at(nn));
      }
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver((es) => es.forEach(e => {
        visible = e.isIntersecting;
        if (visible) {
          if (cur < 0) {
            play(car.base + parseInt(root.dataset.start || '0', 10), false);
            /* после доводки скролла включаем именно центральный слайд */
            setTimeout(() => { const nn = car.nearest ? car.nearest() : cur; if (nn !== cur) play(nn, false); }, 520);
            setTimeout(() => { const nn = car.nearest ? car.nearest() : cur; if (nn !== cur) play(nn, false); }, 1200);
          }
          else { mount(at(cur)); runBar(at(cur)); arm(); }
        } else { clearTimeout(timer); }
      }), { threshold: .25 }).observe(root);
    } else { visible = true; play(car.base, false); }
  });

  /* ==========================================================================
     ГЕРОИ: фон ×3 при прокрутке · рыбы за мышью · покачивание от скорости
     ========================================================================== */
  const heroes = $$('[data-hero]').map((el) => ({ el, bg: $('[data-bg]', el) }));
  const fishes = $$('[data-depth]').map((el) => ({
    el, d: parseFloat(el.dataset.depth), o: 0, w: 0,
    ph: Math.random() * 6.28, sp: .8 + Math.random() * .5, hero: el.closest('[data-hero]')
  }));
  const zoomBg = () => heroes.forEach((h) => {
    if (!h.bg) return;
    const r = h.el.getBoundingClientRect();
    const p = clamp(-r.top / r.height, 0, 1);               // 0 → 1, пока герой не пролистан полностью
    h.bg.style.transform = `scale(${(1 + 2 * p).toFixed(4)})`;
  });
  if (heroes.length) {
    if (reduce) { addEventListener('scroll', zoomBg, { passive: true }); }
    else {
      let mx = 0, my = 0, cx = 0, cy = 0, lastY = scrollY, energy = 0, pmx = 0, pmy = 0, last = performance.now();
      addEventListener('pointermove', (e) => { mx = (e.clientX / innerWidth - .5) * 2; my = (e.clientY / innerHeight - .5) * 2; }, { passive: true });
      const tick = (now) => {
        const dt = Math.min(48, now - last) / 16.67; last = now;
        const y = scrollY, v = clamp(y - lastY, -90, 90); lastY = y;
        cx += (mx - cx) * .06 * dt; cy += (my - cy) * .06 * dt;
        const mv = Math.hypot(cx - pmx, cy - pmy) * 14; pmx = cx; pmy = cy;
        const sp = Math.abs(v) / 24 + mv;
        energy += (sp - energy) * (sp > energy ? .12 : .025) * dt;
        energy = clamp(energy, 0, 2.2);
        zoomBg();
        fishes.forEach((f) => {
          const r = f.el.getBoundingClientRect();
          if (r.bottom < -200 || r.top > innerHeight + 200) return;
          f.w += -v * f.d * .32; f.w += -f.o * .07; f.w *= .84;
          f.o = clamp(f.o + f.w, -140, 140);
          f.ph += dt * .035 * f.sp * (1 + energy * 2.6);
          const rot = Math.sin(f.ph) * (1.4 + energy * 6) + cx * f.d * 2;
          const sx  = Math.sin(f.ph * .8 + 1.3) * (3 + energy * 9);
          const sy  = Math.cos(f.ph * 1.1) * (2 + energy * 6);
          f.el.style.translate = `${(cx * f.d * 46 + sx).toFixed(2)}px ${(cy * f.d * 28 + f.o + sy).toFixed(2)}px`;
          f.el.style.rotate = `${rot.toFixed(2)}deg`;
        });
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  /* ==========================================================================
     PINNED-шаги
     ========================================================================== */
  $$('[data-pin]').forEach((pin) => {
    const steps = $$('.step', pin), imgs = $$('.pin__img', pin);
    const cap = $('.pin__cap', pin), num = $('[data-num]', pin);
    const list = $('.pin__list', pin), box = $('.pin__steps', pin);
    const sec = pin.closest('section');
    const wrap = pin.closest('[data-pinwrap]');
    const bgs = sec ? $$('.dark__bg i', sec) : [];
    let cur = -1;
    const set = (i) => {
      if (i === cur) return; cur = i;
      steps.forEach((s, k) => s.classList.toggle('is-on', k === i));
      imgs.forEach((m, k) => m.classList.toggle('is-on', k === i));
      bgs.forEach((m, k) => m.classList.toggle('is-on', k === i));
      const s = steps[i];
      if (cap && s.dataset.cap != null) cap.innerHTML = s.dataset.cap;
      if (num) num.textContent = '0' + (i + 1);
    };
    bgs.forEach((b, k) => { if (imgs[k]) b.style.backgroundImage = `url("${imgs[k].getAttribute('src')}")`; });
    set(0);
    /* мобильный режим: обычный список, активный пункт – по центру экрана */
    if ('IntersectionObserver' in window) {
      const io = new IntersectionObserver((es) => es.forEach(e => { if (small() && e.isIntersecting) set(steps.indexOf(e.target)); }),
        { rootMargin: '-46% 0px -46% 0px' });
      steps.forEach(s => io.observe(s));
    }
    /* десктоп: сцена закреплена, двигаются только карточки-пункты, пока не выделится последний */
    const update = () => {
      if (small() || !wrap) { list.style.transform = ''; return; }
      const z = getZ(), stage = wrap.firstElementChild;
      const range = Math.max(1, wrap.offsetHeight - stage.offsetHeight);
      const p = clamp((-wrap.getBoundingClientRect().top / z) / range, 0, 1);
      const ch = box.clientHeight;
      const c = steps.map(s => s.offsetTop + s.offsetHeight / 2);
      const mid = c[0] + p * (c[c.length - 1] - c[0]);
      list.style.transform = `translateY(${(ch / 2 - mid).toFixed(1)}px)`;
      let best = 0, bd = 1e9;
      c.forEach((v, k) => { const d = Math.abs(v - mid); if (d < bd) { bd = d; best = k; } });
      set(best);
    };
    addEventListener('scroll', update, { passive: true }); addEventListener('resize', update);
    addEventListener('load', update); update();
  });

  /* ==========================================================================
     ФОРМА ЗАЯВКИ → готовое письмо на lednique1@ya.ru
     ========================================================================== */
  const mail = document.createElement('div');
  mail.className = 'mail'; mail.setAttribute('role', 'dialog'); mail.setAttribute('aria-modal', 'true');
  mail.innerHTML = `
    <div class="mail__box">
      <div class="mail__top"><h3 class="h3">${TR('Письмо составлено')}</h3><button class="btn btn--ink btn--round" type="button" data-x aria-label="${TR('Закрыть')}">✕</button></div>
      <div class="mail__meta"><span>${TR('Кому')}</span><b data-to></b><span>${TR('Тема')}</span><b data-subj></b></div>
      <textarea data-body readonly></textarea>
      <div class="mail__btns">
        <a class="btn btn--lime btn--lg" data-mailto href="#">${TR('Открыть в почте')}</a>
        <a class="btn btn--ink btn--lg" data-ya target="_blank" rel="noopener" href="#">${TR('Яндекс Почта')}</a>
        <a class="btn btn--ink btn--lg" data-gm target="_blank" rel="noopener" href="#">Gmail</a>
        <button class="btn btn--ink btn--lg" type="button" data-copy>${TR('Скопировать')}</button>
      </div>
      <p class="mail__note">${TR('Если почтовая программа не открылась сама – выберите вариант выше или скопируйте текст и отправьте на {mail}.', { mail: MAIL_TO })}</p>
    </div>`;
  document.body.appendChild(mail);
  const closeMail = () => mail.classList.remove('is-open');
  mail.addEventListener('click', (e) => { if (e.target === mail || e.target.closest('[data-x]')) closeMail(); });
  addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMail(); });
  $('[data-copy]', mail).addEventListener('click', async (e) => {
    const t = $('[data-body]', mail).value, b = e.currentTarget;
    try { await navigator.clipboard.writeText(t); } catch (err) { $('[data-body]', mail).select(); document.execCommand('copy'); }
    b.textContent = TR('Скопировано ✓'); setTimeout(() => b.textContent = TR('Скопировать'), 1800);
  });

  const fmtDate = (v) => { const [y, m, d] = v.split('-'); return `${d}.${m}.${y}`; };
  $$('[data-form]').forEach((form) => {
    $$('.opts', form).forEach((g) => {
      const multi = g.hasAttribute('data-multi');
      const date = $('input[type=date]', g);
      g.addEventListener('click', (e) => {
        const b = e.target.closest('.opt'); if (!b) return;
        if (b.tagName === 'INPUT') return;                 // дата живёт своими событиями
        if (b.hasAttribute('data-none')) {
          b.classList.toggle('is-on');
          if (date && b.classList.contains('is-on')) { date.value = ''; date.classList.remove('is-on'); }
          return;
        }
        if (multi) b.classList.toggle('is-on');
        else { const was = b.classList.contains('is-on'); $$('.opt', g).forEach(x => x.classList.remove('is-on')); b.classList.toggle('is-on', !was); }
      });
      /* «Срок выполнения»: выбрана дата → кнопка активна (#CAF865), иначе – как неактивная */
      if (date) {
        const sync = () => date.classList.toggle('is-on', !!date.value);
        ['input', 'change'].forEach(ev => date.addEventListener(ev, () => {
          sync();
          const nb = $('[data-none]', g); if (date.value && nb) nb.classList.remove('is-on');
        }));
        sync();
      }
    });
    $$('input,textarea', form).forEach(i => i.addEventListener('input', () => i.closest('.row')?.classList.remove('is-err')));
    /* «Бюджет» принимает только цифры */
    $$('input[data-num]', form).forEach(inp => inp.addEventListener('input', () => {
      const v = inp.value.replace(/\D/g, '');
      if (v !== inp.value) inp.value = v;
    }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const read = (row) => {
        if (row.dataset.type === 'opts') return $$('.opt.is-on', row).map(b => b.textContent.trim()).join(', ');
        if (row.dataset.type === 'date') {
          const d = $('input[type=date]', row).value;
          return d ? fmtDate(d) : ($('[data-none].is-on', row) ? TR('без жёстких сроков') : '');
        }
        const f = $('input,textarea', row);
        if (!f) return '';
        const v = f.value.trim();
        /* бюджет – только цифры, в письме подставляем валюту */
        if (row.dataset.key === 'budget') { const n = v.replace(/\D/g, ''); return n ? '$' + n : ''; }
        return v;
      };
      let bad = null;
      const data = { project: [], contact: [], comment: '' };
      $$('[data-field]', form).forEach((row) => {
        const val = read(row), label = row.dataset.label, grp = row.dataset.group || 'project';
        if (row.hasAttribute('data-required') && !val) { row.classList.add('is-err'); bad = bad || row; }
        if (!val) return;
        if (grp === 'comment') data.comment = val;
        else data[grp === 'contact' ? 'contact' : 'project'].push(`– ${label}${row.dataset.key === 'budget' ? '' : ''}: ${val}`);
      });
      if (bad) { bad.scrollIntoView({ behavior: 'smooth', block: 'center' }); const f = $('input,textarea', bad); f && f.focus({ preventScroll: true }); return; }

      const topic = form.dataset.topic, page = form.dataset.page || document.title;
      const nameRow = $('[data-key=name]', form);
      const name = nameRow ? read(nameRow) : '';
      const subject = TR('Заявка с сайта: {topic} – {name}', { topic, name });
      const body = [
        TR('Здравствуйте, Виктор!'), '',
        TR('Хочу обсудить проект: {topic}.', { topic }), '',
        TR('ДАННЫЕ ЗАЯВКИ'),
        ...(data.project.length ? data.project : [TR('– не указаны (обсудим в переписке)')]), '',
        TR('ОСОБЫЕ ПОЖЕЛАНИЯ'),
        data.comment || TR('– нет'), '',
        TR('КОНТАКТЫ'),
        ...data.contact, '',
        TR('Письмо составлено автоматически формой на сайте lednique.ru (страница: {page}).', { page })
      ].join('\n');
      const q = (s) => encodeURIComponent(s).replace(/%0A/g, '%0D%0A');
      const mailto = `mailto:${MAIL_TO}?subject=${q(subject)}&body=${q(body)}`;
      $('[data-to]', mail).textContent = MAIL_TO;
      $('[data-subj]', mail).textContent = subject;
      $('[data-body]', mail).value = body;
      $('[data-mailto]', mail).href = mailto;
      $('[data-ya]', mail).href = `https://mail.yandex.ru/compose?to=${MAIL_TO}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      $('[data-gm]', mail).href = `https://mail.google.com/mail/?view=cm&fs=1&to=${MAIL_TO}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      mail.classList.add('is-open');
      window.location.href = mailto;
    });
  });


  /* ==========================================================================
     ЛАЙТБОКС: клик по крайней работе открывает превью (roll.jpg)
     ========================================================================== */
  (() => {
    const lb = $('#lb'); if (!lb) return;
    const img = $('.lb__img', lb), scroll = $('[data-lb-scroll]', lb);
    const open = (src, alt) => {
      if (src) img.src = src;
      img.alt = alt || '';
      lb.hidden = false; document.body.classList.add('lb-open');
      if (scroll) scroll.scrollTop = 0;
      const c = $('[data-lb-close]', lb); c && c.focus({ preventScroll: true });
    };
    const close = () => { lb.hidden = true; document.body.classList.remove('lb-open'); };
    document.addEventListener('click', (e) => {
      const trg = e.target.closest('[data-lb]');
      if (trg) { e.preventDefault(); open(trg.dataset.lb || trg.getAttribute('href'), trg.dataset.lbAlt); return; }
      if (e.target.closest('[data-lb-close]') || e.target === lb || e.target.classList.contains('lb__scroll')) close();
    });
    addEventListener('keydown', (e) => { if (e.key === 'Escape' && !lb.hidden) close(); });
  })();


  /* ---------- стекло: внутрь кладём искажённую копию того, что за блоком ---------- */
  (() => {
    const pick = (el) => el && el.src;
    const pinOn = () => { const a = $('.pin__img.is-on'); return pick(a); };
    const vidOn = () => { const a = $('.car--video .car__item.is-active > img'); return pick(a); };
    const map = [];
    $$('.sec--dark .step').forEach(el => map.push({ el, src: pinOn }));
    $$('.aboutglass').forEach(el => map.push({ el, src: vidOn }));
    if (!map.length) return;
    map.forEach(({ el }) => {
      let i = [...el.children].find(x => x.classList && x.classList.contains('bendfx'));
      if (!i) { i = document.createElement('i'); i.className = 'bendfx'; i.setAttribute('aria-hidden', 'true'); el.prepend(i); }
    });
    const sync = () => map.forEach(({ el, src }) => {
      const s = src(); if (!s) return;
      const v = 'url("' + s + '")';
      if (el.style.getPropertyValue('--bend') !== v) el.style.setProperty('--bend', v);
    });
    sync(); setInterval(sync, 900);
  })();

  /* ==========================================================================
     ФУТЕР: «lednique» на всю ширину + рыбка
     десктоп: плывёт за курсором · мобила: плавает сама, по тапу – к месту нажатия
     ========================================================================== */
  const foot = $('.foot');
  if (foot) {
    const zone = $('.foot__word', foot), word = $('.fw-word', zone) || $('b', zone), fish = $('.foot__fish', zone);
    const fit = () => {
      zone.style.setProperty('--fw', '200px');
      const w = word.offsetWidth || 1;
      zone.style.setProperty('--fw', (200 * (zone.clientWidth / w) * .985).toFixed(1) + 'px');
    };
    (document.fonts?.ready || Promise.resolve()).then(fit); fit(); addEventListener('resize', fit);

    if (!reduce && zone && fish) {
      /* координаты – в локальной системе зоны (учитывает zoom страницы) */
      const local = (e) => {
        const r = zone.getBoundingClientRect(), k = (r.width / zone.offsetWidth) || 1;
        return [(e.clientX - r.left) / k, (e.clientY - r.top) / k];
      };
      const fw = () => fish.offsetWidth, fh = () => fish.offsetHeight;
      const SPEED_DESK = 9, SPEED_MOB = 2.3;   // на мобиле – вдвое быстрее к месту тапа   // px за кадр при 60 fps
      let x = 0, y = 0, tx = 0, ty = 0, face = 1, ph = 0, last = performance.now();
      let active = false, inside = false, mobInit = false, wander = 0;

      /* случайная точка в пределах зоны */
      const pickWander = () => {
        const W = Math.max(0, zone.clientWidth - fw()), H = Math.max(0, zone.clientHeight - fh());
        tx = 10 + Math.random() * Math.max(10, W - 20);
        ty = Math.random() * Math.max(10, H);
        wander = 140 + Math.random() * 120;
      };

      const loop = (now) => {
        const dt = Math.min(48, now - last) / 16.67; last = now;
        const mob = matchMedia('(max-width:720px)').matches;
        let dx = 0, dy = 0;
        if (mob) {
          if (!mobInit) { mobInit = true; x = zone.clientWidth * .18; y = zone.clientHeight * .38; fish.style.opacity = 1; pickWander(); }
          if (--wander <= 0) pickWander();
          const ax = tx - x, ay = ty - y, d = Math.hypot(ax, ay);
          if (d > 2) { dx = ax / d * SPEED_MOB * dt; dy = ay / d * SPEED_MOB * dt; }
          else pickWander();
          x = clamp(x + dx, 0, Math.max(0, zone.clientWidth - fw()));
          y = clamp(y + dy, 0, Math.max(0, zone.clientHeight - fh()));
        } else if (active) {
          if (inside) {
            const ax = tx - x, ay = ty - y, d = Math.hypot(ax, ay);
            const step = Math.min(d, SPEED_DESK * dt);
            if (d > .5) { dx = ax / d * step; dy = ay / d * step; }
          } else { dx = SPEED_DESK * dt; }        // курсора нет – уплывает вправо
          x += dx; y += dy;
          if (!inside && x > zone.clientWidth + fw() * .2) { active = false; fish.style.opacity = 0; }
        }
        if (Math.abs(dx) > .15) face = dx > 0 ? 1 : -1;
        ph += dt * (.08 + Math.hypot(dx, dy) * .012);
        const wob = Math.sin(ph) * 5 + clamp(dy * .9, -14, 14) * face;
        fish.style.transform = `translate3d(${x.toFixed(1)}px,${(y + Math.sin(ph * .7) * 3).toFixed(1)}px,0) scaleX(${face}) rotate(${wob.toFixed(2)}deg)`;
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);

      const pos = (e) => {
        const [lx, ly] = local(e);
        tx = lx - fw() / 2;
        ty = clamp(ly - fh() / 2, -fh() * .2, zone.clientHeight - fh() * .8);
      };
      zone.addEventListener('pointerenter', (e) => {
        if (matchMedia('(max-width:720px)').matches) return;
        pos(e); inside = true;
        if (!active) { x = -fw() * 1.2; y = ty; face = 1; active = true; fish.style.opacity = 1; }
      });
      zone.addEventListener('pointermove', (e) => { if (!matchMedia('(max-width:720px)').matches) pos(e); });
      zone.addEventListener('pointerleave', () => { inside = false; });
      /* мобила: тап – рыбка плывёт к месту нажатия */
      zone.addEventListener('pointerdown', (e) => {
        if (!matchMedia('(max-width:720px)').matches) return;
        const [lx, ly] = local(e);
        tx = clamp(lx - fw() / 2, 0, Math.max(0, zone.clientWidth - fw()));
        ty = clamp(ly - fh() / 2, 0, Math.max(0, zone.clientHeight - fh()));
        wander = 240;
        fish.style.opacity = 1;
      });
    }
  }
})();
