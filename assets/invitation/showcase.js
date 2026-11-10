(function () {
  const host = document.querySelector('[data-invitation-demo]');
  if (!host) return;
  fetch('assets/invitation/showcase.html?v=20261110e').then(function (response) {
    if (!response.ok) throw new Error('Invitation showcase failed to load');
    return response.text();
  }).then(function (html) {
    host.attachShadow({mode:'open'}).innerHTML = html;

/* ============================================================
   Сайт-открытка – логика
   ------------------------------------------------------------
   • открытка = ДВЕ ПЛОСКИЕ плоскости на маленьком расстоянии
     (лицо z = 0, изнанка z = -THICK), без изгибов
   • обе плоскости рисуются каждый кадр, перекрытие решает
     Z-буфер, а видимость грани – отсечение (без блендинга
     двух текстур друг на друге → никаких «конфликтов»)
   • крутится только по Y: тянешь – крутится, тап – переворот
   ============================================================ */
(function () {
  'use strict';

  const host = document.querySelector('[data-invitation-demo]');
  if (!host) return;
  const shadow = host.shadowRoot;
  const body = shadow.querySelector('.demo-root');
  const stage = shadow.getElementById('cardStage');
  const canvas  = shadow.getElementById('cardCanvas');
  const fbRoot  = shadow.getElementById('cardFallback');
  const fbInner = shadow.getElementById('fbInner');
  const boxEl   = shadow.getElementById('postbox');
  const input   = shadow.getElementById('code');
  const goBtn   = shadow.getElementById('go');
  const backBtn = shadow.getElementById('back');
  const hintEl  = shadow.getElementById('hint');
  const errorEl = shadow.getElementById('fieldError');
  const CELLS = { a5: {} };

  const AR        = 1078 / 1460;   // высота / ширина открытки
  const CARD_BOTTOM = (1049 - 1078 / 2) / 1078; // видимый низ текстуры (прозрачные поля ~29 px снизу)
  const THICK     = 0.005;         // расстояние между плоскостями (доля ширины)
  const OPEN_MS   = 1650;
  const CLOSE_MS  = 1000;

  /* ------------------------------------------------------------
     состояние
     ------------------------------------------------------------ */
  const S = {
    open: false,
    phase: 'idle',      // idle | opening | open | closing
    t: 0,
    animStart: 0,
    animDur: 0,

    angle: 0,           // поворот по Y, градусы
    angleVel: 0,
    angleTarget: 0,
    dragTarget: 0,

    tilt: 0,            // наклон вверх-вниз, градусы
    tiltTarget: 0,

    zoom: 1,            // мобильное увеличение оборотной стороны
    zoomTarget: 1,

    dragging: false,
    hintDone: false
  };

  const G = { cx: 0, cy: 0, w: 100 };   // геометрия карточки на экране

  let startX = 0, startY = 0, prevX = 0, prevT = 0, baseAngle = 0, moved = 0, pxVel = 0;
  let openTimer = 0, errorTimer = 0, backZoomTimer = 0, closeTimer = 0;
  const activeTouchPoints = new Set();

  /* ------------------------------------------------------------
     WebGL
     ------------------------------------------------------------ */
  let gl = null, prog = null;
  let bufPos = null, idxFront = null, faceCount = 0;
  let texFront = null, texBack = null;
  let glReady = false;
  let fbMode = false;   // резервный рендер без WebGL
  const U = {}, A = {};

  const COLS = 24, ROWS = 18;   // плоскости плоские – крупная сетка не нужна

  const VERT = [
    'attribute vec2 aPos;',
    'uniform float uAngleY;',
    'uniform float uAngleX;',
    'uniform float uPersp;',
    'uniform float uAR;',
    'uniform float uZOff;',
    'uniform vec2 uCenter;',
    'uniform vec2 uScale;',
    'varying vec2 vUV;',
    '',
    'void main(){',
    /* плоскость: лицо в z = 0, изнанка сдвинута назад */
    '  vec3 p = vec3(aPos, -uZOff);',
    '',
    '  float cy = cos(uAngleY), sy = sin(uAngleY);',
    '  vec3 r = vec3(cy * p.x + sy * p.z, p.y, -sy * p.x + cy * p.z);',
    /* лёгкий наклон вверх-вниз */
    '  float cx = cos(uAngleX), sx = sin(uAngleX);',
    '  vec3 r2 = vec3(r.x, cx * r.y - sx * r.z, sx * r.y + cx * r.z);',
    '',
    '  float k = uPersp / max(uPersp - r2.z, 0.35);',
    /* классическая перспектива: w = 1, ближе к камере – больше k */
    '  gl_Position = vec4(uCenter.x + r2.x * k * uScale.x,',
    '                     uCenter.y + r2.y * k * uScale.y,',
    '                     -r2.z * 1.5, 1.0);',
    '  vUV = vec2(aPos.x + 0.5, aPos.y / uAR + 0.5);',
    '}'
  ].join('\n');

  const FRAG = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform sampler2D uTex;',
    'uniform float uFlip;',
    'uniform float uShade;',
    'varying vec2 vUV;',
    '',
    'void main(){',
    '  vec2 uv = (uFlip > 0.5) ? vec2(1.0 - vUV.x, vUV.y) : vUV;',
    '  vec4 c = texture2D(uTex, uv);',
    /* полностью прозрачные пиксели не рисуем и не пишем в Z-буфер */
    '  if (c.a < 0.004) discard;',
    /* чуть темнее, когда карточка стоит боком – чтобы читался объём */
    '  vec3 warm = c.rgb * vec3(1.0, 0.955, 0.880);',
    '  vec3 col = mix(c.rgb, warm, uShade);',
    '  gl_FragColor = vec4(col, c.a);',
    '}'
  ].join('\n');

  function compile(type, src) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(sh));
    return sh;
  }

  function buildMesh() {
    const pos = [];
    for (let j = 0; j <= ROWS; j++) {
      for (let i = 0; i <= COLS; i++) {
        pos.push(-0.5 + i / COLS, (-0.5 + j / ROWS) * AR);
      }
    }
    /* обход вершин не важен: отсечение граней выключено (cull = Both) */
    const fwd = [];
    for (let j = 0; j < ROWS; j++) {
      for (let i = 0; i < COLS; i++) {
        const a = j * (COLS + 1) + i, b = a + 1, c = a + COLS + 1, d = c + 1;
        fwd.push(a, c, b, b, c, d);
      }
    }
    bufPos = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(pos), gl.STATIC_DRAW);

    idxFront = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxFront);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(fwd), gl.STATIC_DRAW);

    faceCount = fwd.length;
  }

  function loadTexture(src, cb) {
    const img = new Image();
    img.onload = function () {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      cb(t);
    };
    img.onerror = function () { cb(null); };
    img.src = src;
  }

  function initGL() {
    const opts = {
      alpha: true, antialias: true, premultipliedAlpha: true,
      depth: true, stencil: false, powerPreference: 'default'
    };
    gl = canvas.getContext('webgl', opts) || canvas.getContext('experimental-webgl', opts);
    if (!gl) return false;

    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return false;

    prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(prog));
      return false;
    }

    A.aPos = gl.getAttribLocation(prog, 'aPos');
    ['uAngleY','uAngleX','uPersp','uAR','uZOff','uCenter','uScale',
     'uTex','uFlip','uShade'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    buildMesh();

    /* перекрытие плоскостей решает Z-буфер, а не порядок отрисовки */
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LESS);

    /* CULL MODE = BOTH: грани не отсекаются, плоскости видны с двух сторон */
    gl.disable(gl.CULL_FACE);

    /* сглаженные края бумаги: премультиплированный альфа-блендинг */
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);

    gl.clearColor(0, 0, 0, 0);
    gl.clearDepth(1);

    glReady = true;
    return true;
  }

  /* ------------------------------------------------------------
     холст на весь экран
     ------------------------------------------------------------ */
  function sizeCanvas() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = Math.max(1, Math.round(stage.clientWidth * dpr));
    const h = Math.max(1, Math.round(stage.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  /* ------------------------------------------------------------
     раскладка
     ------------------------------------------------------------ */
  const L = {};

  function measure() {
    const vw = stage.clientWidth, vh = stage.clientHeight;
    const boxW = boxEl.offsetWidth || vw * 0.3;
    const boxH = boxEl.offsetHeight || boxW * 1.4;

    L.idleW  = boxW * 0.7;                 // 70% ширины ящика
    L.idleCx = vw / 2;
    L.idleCy = vh / 2;

    const bodyBottom = (1317 - 1615 / 2) / 1615;
    L.downCy = L.idleCy + boxH * bodyBottom + (L.idleW * AR) / 2 + boxH * 0.02;

    L.fullW  = Math.min(vw * 0.864, (vh * 0.696) / AR, 624);
    L.fullCx = vw / 2;
    L.fullCy = vh / 2;

    L.yOut = L.downCy - L.idleCy;
    sizeCanvas();

    /* Подсказка «потяни» живёт под открыткой, а не у нижнего края экрана:
       запоминаем низ видимой карточки, CSS добавляет к нему 20 px. */
    if (hintEl) {
      const cardBottom = L.fullCy + L.fullW * AR * CARD_BOTTOM;
      hintEl.style.setProperty('--card-bottom', cardBottom.toFixed(1) + 'px');
    }
  }

  const easeInOut = function (p) {
    return p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  };
  const easeOut = function (p) { return 1 - Math.pow(1 - p, 3); };

  function geometryAt(t) {
    const A1 = 0.14, B1 = 0.44, C1 = 0.93;
    let cx, cy, w;

    if (t <= A1) {
      cx = L.idleCx; cy = L.idleCy; w = L.idleW;
    } else if (t <= B1) {
      const p = easeInOut((t - A1) / (B1 - A1));
      cx = L.idleCx;
      cy = L.idleCy + L.yOut * p;
      w = L.idleW;
    } else if (t <= C1) {
      const p = easeOut((t - B1) / (C1 - B1));
      cx = L.idleCx + (L.fullCx - L.idleCx) * p;
      cy = (L.idleCy + L.yOut) + (L.fullCy - (L.idleCy + L.yOut)) * p;
      w = L.idleW + (L.fullW - L.idleW) * p;
    } else {
      const p = easeInOut((t - C1) / (1 - C1));
      cx = L.fullCx; cy = L.fullCy;
      w = L.fullW;
    }

    return { cx: cx, cy: cy, w: w };
  }

  /* ------------------------------------------------------------
     отрисовка
     ------------------------------------------------------------ */
  function draw() {
    const g = (S.phase === 'idle' || (!S.open && S.t <= 0))
      ? { cx: L.idleCx, cy: L.idleCy, w: L.idleW }
      : geometryAt(S.t);

    /* Масштабируем саму геометрию, поэтому WebGL и CSS-фолбэк
       увеличиваются одинаково и сохраняют общий центр. */
    g.w *= S.zoom;
    G.cx = g.cx; G.cy = g.cy; G.w = g.w;

    if (fbMode) { drawFallback(g); return; }
    if (!glReady || !gl) return;

    const vw = stage.clientWidth, vh = stage.clientHeight;

    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(prog);

    gl.bindBuffer(gl.ARRAY_BUFFER, bufPos);
    gl.enableVertexAttribArray(A.aPos);
    gl.vertexAttribPointer(A.aPos, 2, gl.FLOAT, false, 0, 0);

    gl.uniform1f(U.uAngleY, S.angle * Math.PI / 180);
    gl.uniform1f(U.uAngleX, S.tilt * Math.PI / 180);
    gl.uniform1f(U.uPersp, 1.6);
    gl.uniform1f(U.uAR, AR);
    gl.uniform2f(U.uCenter, (g.cx / vw) * 2 - 1, 1 - (g.cy / vh) * 2);
    gl.uniform2f(U.uScale, g.w / (vw / 2), g.w / (vh / 2));

    /* затенение по косинусу: фронтально 0, в профиль сильнее */
    const c = Math.abs(Math.cos(S.angle * Math.PI / 180));
    const shade = (1 - c) * 0.22;

    /* Обе плоскости рисуются каждый кадр и с обеих сторон (cull = Both).
       Порядок: сначала дальняя по Z (изнанка), потом ближняя (лицо) –
       так прозрачные края мягко ложатся друг на друга, а перекрытие
       решает Z-буфер. Никакого «появления» второй стороны нет. */

    /* 1. изнанка (z = -THICK), текстура зеркалится по X */
    gl.uniform1f(U.uZOff, THICK);
    gl.uniform1f(U.uFlip, 1);
    gl.uniform1f(U.uShade, shade);
    if (texBack) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texBack);
      gl.uniform1i(U.uTex, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxFront);
      gl.drawElements(gl.TRIANGLES, faceCount, gl.UNSIGNED_SHORT, 0);
    }

    /* 2. лицо (z = 0) */
    gl.uniform1f(U.uZOff, 0);
    gl.uniform1f(U.uFlip, 0);
    gl.uniform1f(U.uShade, shade);
    if (texFront) {
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, texFront);
      gl.uniform1i(U.uTex, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, idxFront);
      gl.drawElements(gl.TRIANGLES, faceCount, gl.UNSIGNED_SHORT, 0);
    }
  }

  /* ------------------------------------------------------------
     резервный рендер (CSS 3D), если WebGL недоступен
     ------------------------------------------------------------ */
  function drawFallback(g) {
    if (!fbRoot) return;
    const h = g.w * AR;
    fbRoot.style.width  = g.w.toFixed(1) + 'px';
    fbRoot.style.height = h.toFixed(1) + 'px';
    fbRoot.style.left   = g.cx.toFixed(1) + 'px';
    fbRoot.style.top    = g.cy.toFixed(1) + 'px';
    fbInner.style.transform =
      'rotateY(' + S.angle.toFixed(2) + 'deg) rotateX(' + S.tilt.toFixed(2) + 'deg)';
  }

  function useFallback() {
    if (fbMode) return;
    fbMode = true;
    glReady = false;
    if (fbRoot) fbRoot.hidden = false;
    canvas.style.opacity = '0';   // прозрачный, но продолжает ловить касания
    console.warn('Открытка: включён резервный рендер (без WebGL)');
    draw();
  }

  /* ------------------------------------------------------------
     цикл
     ------------------------------------------------------------ */
  let rafId = 0;
  function kick() { if (!rafId) rafId = requestAnimationFrame(loop); }

  function loop(now) {
    rafId = 0;
    let moving = false;

    if (S.phase === 'opening' || S.phase === 'closing') {
      const p = Math.min(1, Math.max(0, (now - S.animStart) / S.animDur));
      S.t = (S.phase === 'opening') ? p : 1 - p;
      if (p >= 1) {
        S.phase = (S.phase === 'opening') ? 'open' : 'idle';
        S.t = (S.phase === 'open') ? 1 : 0;
      }
      moving = true;
    }

    if (S.dragging) {
      const d = S.dragTarget - S.angle;
      S.angleVel = d * 0.16;
      S.angle += S.angleVel;
      if (Math.abs(d) > 0.015) moving = true;
    } else {
      /* доводка: жёсткость и «отскок» вдвое слабее */
      S.angleVel += (S.angleTarget - S.angle) * 0.031;
      S.angleVel *= 0.935;
      S.angle += S.angleVel;
      if (Math.abs(S.angleTarget - S.angle) < 0.02 && Math.abs(S.angleVel) < 0.02) {
        S.angle = S.angleTarget; S.angleVel = 0;
      } else { moving = true; }
    }

    /* наклон вверх-вниз плавно догоняет цель и сам возвращается в 0 */
    if (Math.abs(S.tiltTarget - S.tilt) > 0.02) {
      S.tilt += (S.tiltTarget - S.tilt) * 0.14;
      moving = true;
    } else {
      S.tilt = S.tiltTarget;
    }

    /* Плавное увеличение запускается отдельным таймером после отпускания. */
    if (Math.abs(S.zoomTarget - S.zoom) > 0.001) {
      S.zoom += (S.zoomTarget - S.zoom) * 0.12;
      moving = true;
    } else {
      S.zoom = S.zoomTarget;
    }

    draw();
    if (moving) rafId = requestAnimationFrame(loop);
  }

  /* ------------------------------------------------------------
     открытие / закрытие
     ------------------------------------------------------------ */
  function openCard() {
    if (S.open) return;
    S.open = true;

    S.angle = 0; S.angleVel = 0; S.angleTarget = 0; S.dragTarget = 0;
    S.tilt = 0; S.tiltTarget = 0;
    clearBackZoomTimer();
    S.zoom = 1; S.zoomTarget = 1;
    

    body.classList.remove('is-closing', 'is-error');
    body.classList.add('is-open');

    S.phase = 'opening';
    S.animStart = performance.now();
    S.animDur = OPEN_MS;

    
    kick();
  }

  function closeCard() {
    if (!S.open) return;
    S.open = false;
    clearBackZoomTimer();
    S.zoom = 1; S.zoomTarget = 1;
    
    body.classList.add('is-closing');
    body.classList.remove('is-open');

    S.phase = 'closing';
    S.animStart = performance.now();
    S.animDur = CLOSE_MS;
    kick();

    clearTimeout(closeTimer);
    closeTimer = window.setTimeout(function () {
      body.classList.remove('is-closing');
      S.phase = 'idle';
      S.t = 0;
      S.angle = 0; S.angleVel = 0; S.angleTarget = 0; S.dragTarget = 0;
      S.tilt = 0; S.tiltTarget = 0;
      S.zoom = 1; S.zoomTarget = 1;
      input.value = '';
      body.classList.remove('is-error');
      S.hintDone = false;
      if (hintEl) hintEl.classList.remove('hint--off');
      kick();
    }, CLOSE_MS + 120);
  }

  /* ------------------------------------------------------------
     поле ввода
     ------------------------------------------------------------ */
  function sanitize(raw) {
    const lower = String(raw).toLowerCase();
    let out = '';
    for (let i = 0; i < lower.length && out.length < 3; i++) {
      const ch = lower[i];
      if (/[a-zа-я]/.test(ch)) { if (!/[a-zа-я]/.test(out)) out = ch + out; }
      else if (/\d/.test(ch)) { if ((out.match(/\d/g) || []).length < 2) out += ch; }
    }
    return out;
  }

  function showError(msg) {
    if (errorEl) errorEl.textContent = msg;
    body.classList.add('is-error');
    clearTimeout(errorTimer);
    errorTimer = setTimeout(function () { body.classList.remove('is-error'); }, 2800);
  }

  function submit() {
    const value = sanitize(input.value);
    input.value = value;

    if (!/^[a-zа-я]\d{1,2}$/.test(value)) {
      showError('формат: буква и цифра – например A5');
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(CELLS, value)) {
      showError('ячейки «' + value.toUpperCase() + '» нет в базе');
      return false;
    }

    body.classList.remove('is-error');
    clearTimeout(openTimer);
    openTimer = setTimeout(openCard, 180);
    return true;
  }

  input.addEventListener('input', function () {
    const cleaned = sanitize(input.value);
    if (cleaned !== input.value) input.value = cleaned;
    body.classList.remove('is-error');
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
  });
  goBtn.addEventListener('click', function () { if (!submit()) input.focus(); });
  backBtn.addEventListener('click', closeCard);
  shadow.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && S.open) closeCard();
  });

  /* ------------------------------------------------------------
     вращение: только по Y
     ------------------------------------------------------------ */
  function mobileBackZoomEnabled() {
    return stage.clientWidth <= 600 ||
      (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
  }

  function isBackSide(angle) {
    return Math.abs(Math.round(angle / 180) % 2) === 1;
  }

  function clearBackZoomTimer() {
    window.clearTimeout(backZoomTimer);
    backZoomTimer = 0;
  }

  function resetBackZoom() {
    clearBackZoomTimer();
    S.zoomTarget = 1;
    kick();
  }

  function scheduleBackZoom() {
    clearBackZoomTimer();
    if (!mobileBackZoomEnabled() || S.phase !== 'open' || S.dragging ||
        activeTouchPoints.size || !isBackSide(S.angleTarget) || window.scrollY > 4) return;

    /* Ровно секунда без касания; новое касание отменяет этот таймер. */
    backZoomTimer = window.setTimeout(function () {
      backZoomTimer = 0;
      if (!mobileBackZoomEnabled() || S.phase !== 'open' || S.dragging ||
          activeTouchPoints.size || !isBackSide(S.angleTarget) || window.scrollY > 4) return;
      S.zoomTarget = 2;
      kick();
    }, 1000);
  }

  /* ------------------------------------------------------------ */
  let rt = 0;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    if (!mobileBackZoomEnabled()) resetBackZoom();
    rt = setTimeout(function () { measure(); kick(); }, 100);
  });
  window.addEventListener('orientationchange', function () {
    setTimeout(function () { measure(); kick(); }, 240);
  });

  /* ------------------------------------------------------------
     старт
     ------------------------------------------------------------ */
  function boot() {
    measure();
    draw();
    body.classList.remove('preload');

  }

  if (!initGL()) {
    useFallback();
  }

  if (glReady) {
    loadTexture('assets/invitation/image-01f1d595ce8c.webp', function (t) {
      texFront = t;
      if (!t) useFallback(); else draw();
    });
    loadTexture('assets/invitation/image-829c1d479c8f.webp', function (t) {
      texBack = t;
      if (!t) useFallback(); else draw();
    });
    /* страховка: если текстуры так и не появились – переключаемся */
    setTimeout(function () { if (!texFront || !texBack) useFallback(); }, 3000);
  }

  measure();

  const imgs = Array.prototype.slice.call(shadow.querySelectorAll("img"));
  let left = imgs.filter(function (i) { return !i.complete; }).length;

  function ready() { setTimeout(boot, 30); }

  if (!left) {
    ready();
  } else {
    imgs.forEach(function (img) {
      if (img.complete) return;
      const done = function () {
        img.removeEventListener('load', done);
        img.removeEventListener('error', done);
        if (--left <= 0) ready();
      };
      img.addEventListener('load', done);
      img.addEventListener('error', done);
    });
    setTimeout(ready, 2200);
  }

  window.addEventListener('load', function () { measure(); kick(); });

  // The scene starts when its centre reaches the middle of the viewport.
  let demoTimer = 0, generation = 0, active = false, played = false;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  function later(fn, ms, run) {
    demoTimer = setTimeout(function () { if (active && generation === run) fn(); }, ms);
  }
  function startDemo() {
    if (played) return;
    played = true;
    const run = ++generation;
    later(function () {
      input.value = 'A';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      later(function () {
        input.value = 'A5';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        later(function () {
          goBtn.classList.add('demo-pressed');
          later(function () {
            goBtn.classList.remove('demo-pressed');
            goBtn.click();
            if (!reduce.matches) later(function () {
              S.angleTarget = 180; kick();
              later(function () { S.angleTarget = 360; kick(); }, 4200, run);
            }, OPEN_MS + 2800, run);
          }, 200, run);
        }, 700, run);
      }, 500, run);
    }, 500, run);
  }
  // Once opened, users can turn the card themselves without blocking vertical scrolling.
  let pointer = null;
  canvas.addEventListener('pointerdown', function (event) {
    if (S.phase !== 'open' || (event.pointerType === 'mouse' && event.button !== 0)) return;
    const rect = canvas.getBoundingClientRect();
    const scale = rect.width / stage.clientWidth || 1;
    const x = (event.clientX - rect.left) / scale;
    const y = (event.clientY - rect.top) / scale;
    if (Math.abs(x - G.cx) > G.w / 2 || Math.abs(y - G.cy) > G.w * AR / 2) return;
    clearTimeout(demoTimer); // User input takes precedence over the automatic flip.
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY, angle: S.angle, horizontal: false };
  });
  canvas.addEventListener('pointermove', function (event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (!pointer.horizontal && Math.abs(dy) > 8 && Math.abs(dy) > Math.abs(dx)) { pointer = null; return; }
    if (!pointer.horizontal && Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
      pointer.horizontal = true;
      S.dragging = true;
      canvas.setPointerCapture(event.pointerId);
    }
    if (pointer.horizontal) {
      S.dragTarget = pointer.angle + dx * 0.8;
      kick();
    }
  });
  function finishPointer(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dragged = pointer.horizontal;
    const distance = event.clientX - pointer.x;
    const startingFace = Math.round(pointer.angle / 180) * 180;
    pointer = null;
    S.dragging = false;
    S.angleTarget = dragged && Math.abs(distance) > 35
      ? startingFace + (distance > 0 ? 180 : -180)
      : dragged ? Math.round(S.dragTarget / 180) * 180 : startingFace + 180;
    kick();
  }
  canvas.addEventListener('pointerup', finishPointer);
  canvas.addEventListener('pointercancel', function (event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    pointer = null; S.dragging = false;
    S.angleTarget = Math.round(S.angle / 180) * 180; kick();
  });
  canvas.addEventListener('keydown', function (event) {
    if (S.phase !== 'open' || !['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    clearTimeout(demoTimer);
    S.angleTarget = Math.round(S.angle / 180) * 180 + (event.key === 'ArrowLeft' ? -180 : 180);
    kick();
  });
  function checkVisibility() {
    const rect = stage.getBoundingClientRect();
    const centre = rect.top + rect.height / 2;
    active = !document.hidden && centre >= 0 && centre <= window.innerHeight;
    if (active && centre >= window.innerHeight * .35 && centre <= window.innerHeight * .65) startDemo();
    // Allow a fresh demonstration when the visitor leaves and later returns.
    if (!active && played) {
      ++generation; played = false;
      clearTimeout(demoTimer); clearTimeout(openTimer); clearTimeout(closeTimer);
      clearBackZoomTimer();
      pointer = null; S.dragging = false;
      S.open = false; S.phase = 'idle'; S.t = 0;
      S.angle = 0; S.angleVel = 0; S.angleTarget = 0; S.dragTarget = 0;
      S.tilt = 0; S.tiltTarget = 0; S.zoom = 1; S.zoomTarget = 1;
      input.value = ''; goBtn.classList.remove('demo-pressed');
      body.classList.remove('is-open', 'is-closing', 'is-error');
      kick();
    }
  }
  window.addEventListener('scroll', checkVisibility, { passive: true });
  window.addEventListener('resize', checkVisibility);
  if ('ResizeObserver' in window) new ResizeObserver(function () { measure(); kick(); checkVisibility(); }).observe(stage);
  document.addEventListener('visibilitychange', checkVisibility);
  checkVisibility();


})();


  }).catch(function (error) { console.error(error); });
})();
