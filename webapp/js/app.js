/* Hexaflexagon Studio – UI controller */
(function () {
  'use strict';
  const F = window.Flexagon, D = window.FlexDesign, R = window.Render, I = window.I18N, E = window.Earth;
  const t = (k, v) => I.t(k, v);
  const $ = (id) => document.getElementById(id);
  const DEG = Math.PI / 180;
  const ease = (x) => (x <= 0 ? 0 : x >= 1 ? 1 : x * x * (3 - 2 * x));
  const ROOT3 = Math.sqrt(3);

  const App = {
    n: 6, variantId: '6', A: null, sides: null, nodeIndex: null,
    images: [], nextImageId: 1,
    specs: [], faceCanvas: [], sel: 0, tab: 'images',
    earthOpts: { grid: true, mark: true }, lastEarth: [],
  };
  try {
    const o = JSON.parse(localStorage.getItem('hexaflex-earth-opts') || 'null');
    if (o) Object.assign(App.earthOpts, o);
    const saved = JSON.parse(localStorage.getItem('hexaflex-earth') || '[]');
    saved.forEach((sp, i) => { if (sp) App.specs[i] = { ...sp, earth: true }; });
  } catch (e) { /* ignore */ }
  function saveEarth() {
    try {
      localStorage.setItem('hexaflex-earth', JSON.stringify(App.specs.map((sp) => (sp && sp.earth ? { lat: sp.lat, lon: sp.lon, R: sp.R, rot: sp.rot, place: sp.place } : null))));
      localStorage.setItem('hexaflex-earth-opts', JSON.stringify(App.earthOpts));
    } catch (e) { /* ignore */ }
  }
  // name of a preset place / region in the current language
  function placeName(id) {
    const rec = E.PLACES.concat(E.REGIONS).find((x) => x[0] === id);
    return rec ? (I.lang === 'ja' ? rec[1] : rec[2]) : '';
  }
  function fmtLatLon(lat, lon) {
    const a = Math.abs(lat).toFixed(1) + (lat >= 0 ? '°N' : '°S'), b = Math.abs(lon).toFixed(1) + (lon >= 0 ? '°E' : '°W');
    return a + ' ' + b;
  }
  function earthLabel(sp) { return sp.place ? placeName(sp.place) : fmtLatLon(sp.lat, sp.lon); }
  const cache = {};

  // ------------------------------------------------------------------
  // canvas sizing (crisp on high-DPI screens)
  function fitCanvas(c) {
    const r = c.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    const w = Math.round(r.width * dpr), h = Math.round(r.height * dpr);
    if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    return true;
  }
  function eventPos(c, e) {
    const r = c.getBoundingClientRect();
    return [((e.clientX - r.left) * c.width) / r.width, ((e.clientY - r.top) * c.height) / r.height];
  }

  // ------------------------------------------------------------------
  // textures
  function specFor(i) {
    const s = App.specs[i];
    if (!s) return null;
    if (s.earth) return { ...s, grid: App.earthOpts.grid, mark: App.earthOpts.mark, preview: Editor.preview && i === App.sel };
    const im = App.images.find((x) => x.id === s.imageId);
    return im ? { ...s, img: im.src } : null;
  }
  function rebuildFaceCanvases() {
    App.faceCanvas = [];
    for (let i = 0; i < App.n; i++) {
      const c = document.createElement('canvas');
      App.faceCanvas.push(c);
      R.renderFace(c, specFor(i), i);
    }
  }
  function updateFace(i) {
    R.renderFace(App.faceCanvas[i], specFor(i), i);
    drawFaceCard(i);
    redrawAll();
  }
  // content for a leaf side, uv listed in the given corner order
  function content(key, corners = [0, 1, 2]) {
    const tx = App.A.tex[key];
    if (!tx) return { color: '#bbb' };
    return { img: App.faceCanvas[tx.face], uv: corners.map((c) => R.uvPx(tx.uv[c])), face: tx.face };
  }
  function paperContent(side) {
    if (!side) return null;
    if (side.glue) return { glue: true };
    return content(side.tex);
  }
  function drawHexThumb(ctx, faceIdx, cx, cy, r) {
    ctx.save();
    R.hexPath(ctx, cx, cy, r);
    ctx.clip();
    const s = r / R.TR;
    ctx.drawImage(App.faceCanvas[faceIdx], cx - (R.TEX / 2) * s, cy - (R.TEX / 2) * s, R.TEX * s, R.TEX * s);
    ctx.restore();
    R.hexPath(ctx, cx, cy, r);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.lineWidth = Math.max(1, r * 0.04);
    ctx.stroke();
  }
  function faceThumbCanvas(faceIdx, size = 44) {
    const c = document.createElement('canvas');
    c.width = c.height = size * 2;
    drawHexThumb(c.getContext('2d'), faceIdx, size, size, size * 0.96);
    return c;
  }

  let redrawPending = false;
  function redrawAll() {
    if (redrawPending) return;
    redrawPending = true;
    requestAnimationFrame(() => {
      redrawPending = false;
      Editor.draw();
      Sim.dirty = true;
      Steps.dirty = true;
      Print.invalidate();
    });
  }

  // ------------------------------------------------------------------
  // variant handling
  function buildFaceCountSelect() {
    const sel = $('faceCount');
    sel.innerHTML = '';
    for (const n of Object.keys(D.PRESETS).map(Number).sort((a, b) => a - b)) {
      const o = document.createElement('option');
      o.value = n; o.textContent = n;
      sel.appendChild(o);
    }
    sel.value = App.n;
  }
  function buildVariantSelect() {
    const list = D.PRESETS[App.n];
    const sel = $('variant');
    sel.innerHTML = '';
    list.forEach((p, i) => {
      const o = document.createElement('option');
      o.value = p.id;
      let label = t('variantN') + ' ' + String.fromCharCode(65 + i);
      const A = cache[p.id];
      if (A && A.plan && A.plan.width < 0.3) label += t('straight');
      o.textContent = label;
      sel.appendChild(o);
    });
    sel.value = App.variantId;
    $('variantWrap').classList.toggle('hidden', list.length < 2);
  }
  function loadVariant(n, vid) {
    const list = D.PRESETS[n];
    const preset = list.find((p) => p.id === vid) || list[0];
    App.n = n; App.variantId = preset.id;
    for (const p of list) if (!cache[p.id]) cache[p.id] = D.analyse(p.seq);
    App.A = cache[preset.id];
    App.sides = D.netSides(App.A);
    App.nodeIndex = new Map(App.A.graph.nodes.map((nd) => [nd.key, nd.id]));
    while (App.specs.length < n) App.specs.push(null);
    if (App.sel >= n) App.sel = 0;
    rebuildFaceCanvases();
    buildVariantSelect();
    renderFaceGrid();
    Editor.select(App.sel);
    renderGallery();
    Sim.reset();
    Steps.build();
    Print.invalidate();
    try { localStorage.setItem('hexaflex-variant', JSON.stringify({ n, vid: preset.id })); } catch (e) { /* ignore */ }
  }

  // ------------------------------------------------------------------
  // images
  // decode an uploaded file without blob URLs, so canvases stay origin-clean
  // (printing/saving works even when the page is opened as a local file)
  async function loadImageFile(file) {
    let src;
    try {
      src = await createImageBitmap(file);
    } catch (e) {
      src = await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error('decode'));
          img.src = fr.result;
        };
        fr.onerror = () => reject(new Error('read'));
        fr.readAsDataURL(file);
      });
    }
    const w0 = src.naturalWidth || src.width, h0 = src.naturalHeight || src.height;
    const s = Math.min(1, 2048 / Math.max(w0, h0));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w0 * s));
    c.height = Math.max(1, Math.round(h0 * s));
    c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
    if (src.close) src.close();
    return c;
  }
  function fitSpec(im) {
    return { imageId: im.id, cx: im.src.width / 2, cy: im.src.height / 2, radius: Math.min(im.src.width / ROOT3, im.src.height / 2), rot: 0 };
  }
  async function addFiles(files) {
    const added = [];
    for (const f of files) {
      if (!f.type || !f.type.startsWith('image/')) continue;
      try {
        const src = await loadImageFile(f);
        const im = { id: App.nextImageId++, name: f.name, src };
        App.images.push(im);
        added.push(im);
      } catch (e) { /* unsupported image */ }
    }
    // fill empty faces in order
    let k = 0;
    for (let i = 0; i < App.n && k < added.length; i++) {
      if (!specFor(i)) { App.specs[i] = fitSpec(added[k++]); R.renderFace(App.faceCanvas[i], specFor(i), i); }
    }
    renderGallery();
    renderFaceGrid();
    Editor.select(App.sel);
    redrawAll();
  }
  function autoAssign() {
    let k = 0;
    const used = new Set(App.specs.slice(0, App.n).filter(Boolean).map((s) => s.imageId));
    const free = App.images.filter((im) => !used.has(im.id));
    const pool = free.length ? free : App.images;
    if (!pool.length) return;
    for (let i = 0; i < App.n; i++) {
      if (!specFor(i)) {
        App.specs[i] = fitSpec(pool[k % pool.length]);
        k++;
        R.renderFace(App.faceCanvas[i], specFor(i), i);
      }
    }
    renderFaceGrid();
    Editor.select(App.sel);
    renderGallery();
    redrawAll();
  }
  function removeImage(id) {
    App.images = App.images.filter((x) => x.id !== id);
    App.specs = App.specs.map((s) => (s && s.imageId === id ? null : s));
    rebuildFaceCanvases();
    renderGallery();
    renderFaceGrid();
    Editor.select(App.sel);
    redrawAll();
  }
  function thumbFor(im, size) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const s = Math.max(size / im.src.width, size / im.src.height);
    g.drawImage(im.src, (size - im.src.width * s) / 2, (size - im.src.height * s) / 2, im.src.width * s, im.src.height * s);
    return c;
  }
  function renderGallery() {
    const gal = $('gallery');
    gal.innerHTML = '';
    for (const im of App.images) {
      const b = document.createElement('div');
      b.className = 'thumb';
      b.title = im.name;
      b.appendChild(thumbFor(im, 148));
      const del = document.createElement('button');
      del.className = 'del'; del.type = 'button'; del.textContent = '×'; del.title = t('remove');
      del.onclick = (e) => { e.stopPropagation(); removeImage(im.id); };
      b.appendChild(del);
      b.onclick = () => { rememberEarth(App.sel); App.specs[App.sel] = fitSpec(im); updateFace(App.sel); Editor.select(App.sel); };
      gal.appendChild(b);
    }
    $('galleryEmpty').classList.toggle('hidden', App.images.length > 0);
    renderChoice();
  }
  function renderChoice() {
    const box = $('imgChoice');
    box.innerHTML = '';
    const cur = specFor(App.sel);
    const pat = document.createElement('button');
    pat.type = 'button';
    pat.className = 'thumb pattern-thumb' + (cur ? '' : ' sel');
    pat.style.background = R.PALETTE[App.sel % R.PALETTE.length];
    pat.textContent = t('pattern');
    pat.onclick = () => { rememberEarth(App.sel); App.specs[App.sel] = null; updateFace(App.sel); Editor.select(App.sel); };
    box.appendChild(pat);
    const eb = document.createElement('button');
    eb.type = 'button';
    eb.className = 'thumb' + (cur && cur.earth ? ' sel' : '');
    eb.title = t('earth');
    eb.appendChild(globeIcon());
    const cap = document.createElement('span');
    cap.className = 'cap'; cap.textContent = t('earth');
    eb.appendChild(cap);
    eb.onclick = () => { if (!(cur && cur.earth)) useEarth(App.sel); };
    box.appendChild(eb);
    for (const im of App.images) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb' + (cur && cur.imageId === im.id ? ' sel' : '');
      b.appendChild(thumbFor(im, 120));
      b.onclick = () => { rememberEarth(App.sel); App.specs[App.sel] = fitSpec(im); updateFace(App.sel); Editor.select(App.sel); };
      box.appendChild(b);
    }
  }
  // ---- earth faces
  let globeIconCanvas = null;
  function globeIcon() {
    if (!globeIconCanvas) globeIconCanvas = E.renderGlobe(120, { lat: 25, lon: 20, R: 90 }, { step: 30 });
    const c = document.createElement('canvas');
    c.width = c.height = 120;
    c.getContext('2d').drawImage(globeIconCanvas, 0, 0);
    return c;
  }
  function rememberEarth(i) { const s = App.specs[i]; if (s && s.earth) App.lastEarth[i] = { ...s }; }
  function earthSpec(lat, lon, place, prev) {
    return { earth: true, lat, lon, place: place || null, R: prev && prev.earth ? prev.R : 90, rot: prev && prev.earth ? prev.rot : 0 };
  }
  // the region not yet used by another face, in a fixed order
  function freeRegion() {
    const used = new Set(App.specs.slice(0, App.n).filter((s) => s && s.earth).map((s) => s.place));
    return E.REGIONS.find((r) => !used.has(r[0])) || E.REGIONS[0];
  }
  function useEarth(i) {
    const prev = App.lastEarth[i];
    if (prev) App.specs[i] = { ...prev };
    else { const r = freeRegion(); App.specs[i] = earthSpec(r[3], r[4], r[0]); }
    earthChanged(i);
    Editor.select(i);
  }
  function setEarthPlace(i, lat, lon, place) {
    App.specs[i] = earthSpec(lat, lon, place, App.specs[i]);
    earthChanged(i);
    if (i === App.sel) Editor.select(i);
  }
  function earthChanged(i) {
    R.renderFace(App.faceCanvas[i], specFor(i), i);
    drawFaceCard(i);
    const card = document.querySelector(`.face-card[data-face="${i}"] .meta`);
    if (card) card.textContent = faceMeta(i);
    saveEarth();
    EarthUI.draw();
    Explain.invalidate();
    redrawAll();
  }
  function rerenderEarthFaces() {
    for (let i = 0; i < App.n; i++) if (App.specs[i] && App.specs[i].earth) { R.renderFace(App.faceCanvas[i], specFor(i), i); drawFaceCard(i); }
    if (App.tab === 'images') renderChoice();
    EarthUI.draw();
    Explain.invalidate();
    redrawAll();
  }
  function faceMeta(i) {
    const s = App.specs[i];
    return s && s.earth ? earthLabel(s) : t('appears', { d: App.A.faces[i].degree });
  }
  function renderFaceGrid() {
    const grid = $('faceGrid');
    grid.innerHTML = '';
    for (let i = 0; i < App.n; i++) {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'face-card' + (i === App.sel ? ' sel' : '');
      card.dataset.face = i;
      const c = document.createElement('canvas');
      c.width = c.height = 200;
      card.appendChild(c);
      const l = document.createElement('div');
      l.className = 'lbl'; l.textContent = t('faceN', { n: i + 1 });
      card.appendChild(l);
      const m = document.createElement('div');
      m.className = 'meta'; m.textContent = faceMeta(i);
      card.appendChild(m);
      card.onclick = () => Editor.select(i);
      grid.appendChild(card);
      drawFaceCard(i);
    }
  }
  function drawFaceCard(i) {
    const card = document.querySelector(`.face-card[data-face="${i}"] canvas`);
    if (!card) return;
    const g = card.getContext('2d');
    g.clearRect(0, 0, 200, 200);
    drawHexThumb(g, i, 100, 100, 96);
  }

  // ------------------------------------------------------------------
  // crop editor
  const Editor = {
    canvas: null, pointers: new Map(), gesture: null, preview: false,
    HR() { return this.canvas.width * 0.42; },
    select(i) {
      App.sel = i;
      document.querySelectorAll('.face-card').forEach((c) => c.classList.toggle('sel', +c.dataset.face === i));
      $('editorTitle').textContent = t('editorTitle', { n: i + 1 });
      renderChoice();
      this.syncSliders();
      this.draw();
      EarthUI.draw();
    },
    spec() { return specFor(App.sel); },
    syncSliders() {
      const s = this.spec();
      const on = !!s;
      $('zoomSlider').disabled = !on; $('rotSlider').disabled = !on;
      ['rotL', 'rotR', 'fitBtn'].forEach((id) => { $(id).disabled = !on; });
      if (!s) return;
      if (s.earth) $('zoomSlider').value = -Math.log2(Math.tan((s.R * DEG) / 2));
      else $('zoomSlider').value = Math.log2(Math.min(s.img.width / ROOT3, s.img.height / 2) / s.radius);
      let d = (s.rot / DEG) % 360; if (d > 180) d -= 360; if (d < -180) d += 360;
      $('rotSlider').value = Math.round(d);
    },
    draw() {
      const c = this.canvas;
      if (!c) return;
      fitCanvas(c);
      const g = c.getContext('2d');
      const W = c.width, H = c.height, cx = W / 2, cy = H / 2, HR = this.HR();
      g.clearRect(0, 0, W, H);
      const s = this.spec();
      if (s && !s.earth) {
        g.save();
        g.translate(cx, cy); g.rotate(-s.rot);
        const k = HR / s.radius;
        g.scale(k, k); g.translate(-s.cx, -s.cy);
        g.imageSmoothingQuality = 'high';
        g.drawImage(s.img, 0, 0);
        g.restore();
        g.save();
        g.beginPath(); g.rect(0, 0, W, H);
        R.hexPath(g, cx, cy, HR, true);
        g.fillStyle = 'rgba(15,18,28,0.58)';
        g.fill('evenodd');
        g.restore();
      } else {
        drawHexThumb(g, App.sel, cx, cy, HR);
      }
      // outline and cut lines
      g.save();
      R.hexPath(g, cx, cy, HR);
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, W / 200); g.stroke();
      g.setLineDash([W / 80, W / 80]);
      g.lineWidth = Math.max(1, W / 400);
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 3; i++) {
        const a = (90 - 60 * i) * DEG;
        g.beginPath();
        g.moveTo(cx + HR * Math.cos(a), cy - HR * Math.sin(a));
        g.lineTo(cx - HR * Math.cos(a), cy + HR * Math.sin(a));
        g.stroke();
      }
      g.restore();
    },
    rotMat(rot) { // canvas rotation matrix R_c(rot)
      return [Math.cos(rot), -Math.sin(rot), Math.sin(rot), Math.cos(rot)];
    },
    raw() { return App.specs[App.sel]; },
    pan(dx, dy) {
      const s = this.raw(); if (!s) return;
      if (s.earth) {
        // drag the globe: move the centre opposite to the drag (near the centre hex ≈ disk / C)
        const k = E.scNorm(6, 1 / 3) / this.HR();
        const ll = E.toLatLon(E.diskToSphere([-dx * k, dy * k], E.frame(s)));
        s.lat = ll[0]; s.lon = ll[1]; s.place = null;
        this.changed();
        return;
      }
      const m = this.rotMat(s.rot), k = s.radius / this.HR();
      s.cx -= (m[0] * dx + m[1] * dy) * k;
      s.cy -= (m[2] * dx + m[3] * dy) * k;
      this.changed();
    },
    zoomAt(factor, p) {
      const s = this.raw(); if (!s) return;
      if (s.earth) {
        s.R = Math.max(8, Math.min(170, (2 * Math.atan(Math.tan((s.R * DEG) / 2) * factor)) / DEG));
        this.changed();
        return;
      }
      const c = this.canvas, cx = c.width / 2, cy = c.height / 2;
      const m = this.rotMat(s.rot);
      const vx = p[0] - cx, vy = p[1] - cy;
      const k0 = s.radius / this.HR();
      const qx = s.cx + (m[0] * vx + m[1] * vy) * k0, qy = s.cy + (m[2] * vx + m[3] * vy) * k0;
      s.radius = Math.max(4, s.radius * factor);
      const k1 = s.radius / this.HR();
      s.cx = qx - (m[0] * vx + m[1] * vy) * k1;
      s.cy = qy - (m[2] * vx + m[3] * vy) * k1;
      this.changed();
    },
    rotateBy(a) { const s = this.raw(); if (!s) return; s.rot += a; this.changed(); },
    changed() {
      const sp = App.specs[App.sel];
      if (sp && sp.earth) { earthChanged(App.sel); this.syncSliders(); return; }
      R.renderFace(App.faceCanvas[App.sel], specFor(App.sel), App.sel);
      drawFaceCard(App.sel);
      this.syncSliders();
      redrawAll();
    },
    init() {
      const c = this.canvas = $('editorCanvas');
      c.addEventListener('pointerdown', (e) => {
        if (!this.raw()) return;
        c.setPointerCapture(e.pointerId);
        this.pointers.set(e.pointerId, eventPos(c, e));
        c.classList.add('dragging');
        if (this.raw().earth) this.preview = true;
        this.gesture = null;
      });
      c.addEventListener('pointermove', (e) => {
        if (!this.pointers.has(e.pointerId)) return;
        const p = eventPos(c, e);
        if (this.pointers.size === 1) {
          const q = this.pointers.get(e.pointerId);
          this.pan(p[0] - q[0], p[1] - q[1]);
          this.pointers.set(e.pointerId, p);
        } else if (this.pointers.size === 2) {
          this.pointers.set(e.pointerId, p);
          const [a, b] = [...this.pointers.values()];
          const d = Math.hypot(b[0] - a[0], b[1] - a[1]);
          const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
          const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
          if (this.gesture) {
            this.zoomAt(this.gesture.d / d, mid);
            this.rotateBy(-(ang - this.gesture.ang));
          }
          this.gesture = { d, ang };
        }
      });
      const up = (e) => {
        this.pointers.delete(e.pointerId);
        this.gesture = null;
        if (!this.pointers.size) {
          c.classList.remove('dragging');
          if (this.preview) { this.preview = false; this.changed(); }
        }
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      c.addEventListener('wheel', (e) => {
        if (!this.raw()) return;
        e.preventDefault();
        this.zoomAt(Math.exp(e.deltaY * 0.0015), eventPos(c, e));
      }, { passive: false });
      $('zoomSlider').addEventListener('input', (e) => {
        const s = this.raw(); if (!s) return;
        if (s.earth) { s.R = Math.min(170, (2 * Math.atan(Math.pow(2, -e.target.value))) / DEG); this.changed(); return; }
        const im = this.spec().img;
        const fitR = Math.min(im.width / ROOT3, im.height / 2);
        s.radius = fitR / Math.pow(2, +e.target.value);
        this.changed();
      });
      $('rotSlider').addEventListener('input', (e) => {
        const s = this.raw(); if (!s) return;
        s.rot = +e.target.value * DEG;
        this.changed();
      });
      $('rotL').onclick = () => this.rotateBy(60 * DEG);
      $('rotR').onclick = () => this.rotateBy(-60 * DEG);
      $('fitBtn').onclick = () => {
        const s = this.raw(); if (!s) return;
        if (s.earth) { s.R = 90; s.rot = 0; this.changed(); return; }
        const im = App.images.find((x) => x.id === s.imageId);
        App.specs[App.sel] = { ...fitSpec(im), rot: s.rot };
        this.changed();
      };
      $('prevFace').onclick = () => this.select((App.sel + App.n - 1) % App.n);
      $('nextFace').onclick = () => this.select((App.sel + 1) % App.n);
    },
  };

  // ------------------------------------------------------------------
  // place picker: a world map with one marker per earth face
  const EarthUI = {
    canvas: null, base: null, drag: -1,
    ll2px(lat, lon) { const c = this.canvas; return [((lon + 180) / 360) * c.width, ((90 - lat) / 180) * c.height]; },
    px2ll(p) { const c = this.canvas; return [90 - (p[1] / c.height) * 180, ((((p[0] / c.width) * 360) % 360) + 360) % 360 - 180]; },
    draw() {
      const c = this.canvas;
      if (!c || App.tab !== 'images' || !fitCanvas(c)) return;
      if (!this.base) this.base = E.renderMap(1024, 512);
      const g = c.getContext('2d');
      const W = c.width, H = c.height, dpr = W / c.getBoundingClientRect().width;
      g.drawImage(this.base, 0, 0, W, H);
      // footprint of the selected face
      const cur = App.specs[App.sel];
      if (cur && cur.earth) {
        const pts = E.faceOutline(cur, 20).map(([la, lo]) => this.ll2px(la, lo));
        g.save();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.strokeStyle = '#ffcf33'; g.lineWidth = 2 * dpr;
        for (const off of [-W, 0, W]) {
          g.beginPath();
          let prev = null, x0 = 0;
          pts.forEach((p, k) => {
            let x = p[0];
            if (prev) { while (x - prev > W / 2) x -= W; while (x - prev < -W / 2) x += W; }
            if (k === 0) { g.moveTo(x + off, p[1]); x0 = x; } else g.lineTo(x + off, p[1]);
            prev = x;
          });
          // a cap around a pole wraps once around: close along the top / bottom edge
          if (Math.abs(prev - x0) > W / 2) { const yy = cur.lat > 0 ? 0 : H; g.lineTo(prev + off, yy); g.lineTo(x0 + off, yy); }
          g.closePath(); g.fill(); g.stroke();
        }
        g.restore();
      }
      // markers
      for (let i = 0; i < App.n; i++) {
        const sp = App.specs[i];
        if (!sp || !sp.earth) continue;
        const r = (i === App.sel ? 11 : 8.5) * dpr;
        let [x, y] = this.ll2px(sp.lat, sp.lon);
        y = Math.max(r + dpr, Math.min(H - r - dpr, y)); // keep pole markers visible
        g.beginPath(); g.arc(x, y, r, 0, 2 * Math.PI);
        g.fillStyle = i === App.sel ? '#e4572e' : 'rgba(30,30,40,0.8)'; g.fill();
        g.lineWidth = 2 * dpr; g.strokeStyle = '#fff'; g.stroke();
        g.fillStyle = '#fff'; g.font = `bold ${r * 1.15}px system-ui, sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(i + 1), x, y + r * 0.05);
      }
      this.syncInputs();
    },
    syncInputs() {
      const sp = App.specs[App.sel];
      const on = !!(sp && sp.earth);
      if (document.activeElement !== $('latIn')) $('latIn').value = on ? sp.lat.toFixed(2) : '';
      if (document.activeElement !== $('lonIn')) $('lonIn').value = on ? sp.lon.toFixed(2) : '';
      $('earthNow').textContent = on ? t('earthNow', { n: App.sel + 1, p: earthLabel(sp) }) : t('earthNone', { n: App.sel + 1 });
      $('mapReset').classList.toggle('hidden', !E.hasCustom());
    },
    hit(p) {
      const dpr = this.canvas.width / this.canvas.getBoundingClientRect().width;
      let best = -1, bd = 14 * dpr;
      for (let i = 0; i < App.n; i++) {
        const sp = App.specs[i];
        if (!sp || !sp.earth) continue;
        const q = this.ll2px(sp.lat, sp.lon);
        q[1] = Math.max(10 * dpr, Math.min(this.canvas.height - 10 * dpr, q[1]));
        const d = Math.hypot(q[0] - p[0], q[1] - p[1]);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    },
    fillPlaces() {
      const sel = $('placeSel');
      sel.innerHTML = '';
      const o0 = document.createElement('option');
      o0.value = ''; o0.textContent = t('placePick');
      sel.appendChild(o0);
      const group = (label, list) => {
        const og = document.createElement('optgroup');
        og.label = label;
        for (const r of list) { const o = document.createElement('option'); o.value = r[0]; o.textContent = I.lang === 'ja' ? r[1] : r[2]; og.appendChild(o); }
        sel.appendChild(og);
      };
      group(t('regions'), E.REGIONS);
      group(t('cities'), E.PLACES);
      const m = $('earthAllMode');
      const v = m.value || 'regions';
      m.innerHTML = '';
      for (const k of ['regions', 'spread']) { const o = document.createElement('option'); o.value = k; o.textContent = t(k === 'regions' ? 'allRegions' : 'allSpread'); m.appendChild(o); }
      m.value = v;
    },
    allEarth() {
      const mode = $('earthAllMode').value;
      const pts = mode === 'spread' ? E.spread(App.n) : E.REGIONS.slice(0, App.n).map((r) => [r[3], r[4], r[0]]);
      for (let i = 0; i < App.n; i++) {
        const p = pts[i % pts.length];
        App.specs[i] = earthSpec(p[0], p[1], p[2] || null, App.specs[i]);
        R.renderFace(App.faceCanvas[i], specFor(i), i);
      }
      saveEarth();
      renderFaceGrid();
      Editor.select(App.sel);
      EarthUI.draw();
      Explain.invalidate();
      redrawAll();
    },
    init() {
      const c = this.canvas = $('worldCanvas');
      c.addEventListener('pointerdown', (e) => {
        const p = eventPos(c, e);
        let i = this.hit(p);
        if (i < 0) { i = App.sel; const ll = this.px2ll(p); setEarthPlace(i, ll[0], ll[1], null); }
        else if (i !== App.sel) Editor.select(i);
        this.drag = i;
        Editor.preview = true;
        c.setPointerCapture(e.pointerId);
      });
      c.addEventListener('pointermove', (e) => {
        if (this.drag < 0) { c.style.cursor = this.hit(eventPos(c, e)) >= 0 ? 'grab' : 'crosshair'; return; }
        const ll = this.px2ll(eventPos(c, e));
        const sp = App.specs[this.drag];
        sp.lat = Math.max(-90, Math.min(90, ll[0])); sp.lon = ll[1]; sp.place = null;
        earthChanged(this.drag);
        Editor.draw();
      });
      const up = () => {
        if (this.drag < 0) return;
        const i = this.drag;
        this.drag = -1;
        Editor.preview = false;
        earthChanged(i);
        Editor.select(i);
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', up);
      $('placeSel').onchange = (e) => {
        const id = e.target.value;
        if (!id) return;
        const r = E.PLACES.concat(E.REGIONS).find((x) => x[0] === id);
        setEarthPlace(App.sel, r[3], r[4], r[0]);
        e.target.value = '';
      };
      const fromInputs = () => {
        const la = parseFloat($('latIn').value), lo = parseFloat($('lonIn').value);
        if (!Number.isFinite(la) || !Number.isFinite(lo)) return;
        setEarthPlace(App.sel, Math.max(-90, Math.min(90, la)), ((((lo + 180) % 360) + 360) % 360) - 180, null);
      };
      $('latIn').onchange = fromInputs;
      $('lonIn').onchange = fromInputs;
      $('earthAll').onclick = () => this.allEarth();
      $('earthGrid').checked = App.earthOpts.grid;
      $('earthMark').checked = App.earthOpts.mark;
      $('earthGrid').onchange = (e) => { App.earthOpts.grid = e.target.checked; saveEarth(); rerenderEarthFaces(); };
      $('earthMark').onchange = (e) => { App.earthOpts.mark = e.target.checked; saveEarth(); rerenderEarthFaces(); };
      $('mapBtn').onclick = () => $('mapFile').click();
      $('mapFile').onchange = async () => {
        const f = $('mapFile').files[0];
        $('mapFile').value = '';
        if (!f) return;
        try { E.setCustomMap(await loadImageFile(f)); } catch (err) { return; }
        this.base = null; globeIconCanvas = null;
        rerenderEarthFaces();
      };
      $('mapReset').onclick = () => { E.setCustomMap(null); this.base = null; globeIconCanvas = null; rerenderEarthFaces(); };
    },
  };

  // ------------------------------------------------------------------
  // print
  const Print = {
    dirty: true, pages: [],
    invalidate() { this.dirty = true; if (App.tab === 'print') this.render(); },
    mode: (() => { try { return localStorage.getItem('hexaflex-printmode') === 'duplex' ? 'duplex' : 'fold'; } catch (e) { return 'fold'; } })(),
    cache: new Map(),
    // mode 'fold': single-sided, the back is printed mirrored next to the front
    // and folded over; 'duplex': separate front and back sheets
    layout(mode = this.mode) {
      const L = Math.max(10, +$('triSize').value || 40);
      const key = L + ':' + App.variantId + ':' + mode;
      if (this.cache.has(key)) return this.cache.get(key);
      const PW = 210, PH = 297, M = 10, GAP = 4;
      const AW = PW - 2 * M, AH = PH - 2 * M;
      const fold = mode === 'fold';
      let best = null;
      const n = App.sides.n;
      for (const prefer of fold ? ['contact', 'compact'] : [null]) {
        let fewest = Infinity;
        for (let maxLen = n; maxLen >= 2; maxLen--) {
          const pieces = D.splitPieces(App.sides, AW / L, AH / L, maxLen, { fold, prefer });
          if (!pieces) break;
          const pages = this.pack(pieces, L, AW, AH, M, GAP);
          const tilted = pieces.filter((pc) => Math.abs(Math.round(pc.fit.ang / (Math.PI / 6)) - pc.fit.ang / (Math.PI / 6)) > 1e-6).length;
          const score = pages.length * 1000 + pieces.length * 10 + tilted + (prefer === 'compact' ? 1 : 0);
          if (!best || score < best.score) best = { score, pieces, pages };
          fewest = Math.min(fewest, pieces.length);
          if (pieces.length > fewest + 4) break;
        }
      }
      const lay = best ? { L, PW, PH, fold, pieces: best.pieces, pages: best.pages } : null;
      this.cache.set(key, lay);
      return lay;
    },
    setMode(m) {
      this.mode = m;
      try { localStorage.setItem('hexaflex-printmode', m); } catch (e) { /* ignore */ }
      this.dirty = true;
      Steps.build();
      if (App.tab === 'print') this.render();
    },
    sheets(lay) { return lay.fold ? [false] : [false, true]; },
    sheetName(lay, back) { return lay.fold ? t('sheetFold') : back ? t('backSheet') : t('frontSheet'); },
    // shelf packing; a piece may be turned by 90 degrees
    pack(pieces, L, AW, AH, M, GAP) {
      const items = pieces.map((p, i) => {
        let { w, h } = p.fit;
        let ang = p.fit.ang, turned = false;
        // stand long pieces upright (portrait page)
        if (w > h && w * L > AW) { turned = true; }
        else if (w > h && h * L <= AW && w * L <= AH) { turned = true; }
        if (turned) { const t2 = w; w = h; h = t2; }
        return { p, i, w: w * L, h: h * L, turned, ang };
      });
      const pages = [];
      let page = null, x = 0, y = 0, rowH = 0;
      for (const it of items.slice().sort((a, b) => b.h - a.h)) {
        if (!page) { page = []; pages.push(page); x = 0; y = 0; rowH = 0; }
        if (x + it.w > AW + 1e-6) { x = 0; y += rowH + GAP; rowH = 0; }
        if (y + it.h > AH + 1e-6) { page = []; pages.push(page); x = 0; y = 0; rowH = 0; }
        page.push({ ...it, x: M + x, y: M + y });
        x += it.w + GAP; rowH = Math.max(rowH, it.h);
      }
      return pages;
    },
    drawPage(lay, page, back, dpi) {
      const pxmm = dpi / 25.4;
      const c = document.createElement('canvas');
      c.width = Math.round(lay.PW * pxmm); c.height = Math.round(lay.PH * pxmm);
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      const showNum = $('showNumbers').checked, showFold = $('showFolds').checked;
      const foldMap = new Map();
      const ek = (a, b) => {
        const k1 = Math.round(a[0] * 1000) + ',' + Math.round(a[1] * 1000);
        const k2 = Math.round(b[0] * 1000) + ',' + Math.round(b[1] * 1000);
        return k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
      };
      for (const f of App.sides.folds) foldMap.set(ek(f.a, f.b), f.valleyOnFront);
      for (const it of page) {
        const { fit } = it.p;
        const cs = Math.cos(fit.ang), sn = Math.sin(fit.ang);
        const toPage = (p) => {
          const x = p[0] * cs - p[1] * sn, y = p[0] * sn + p[1] * cs;
          let u = (x - fit.x0) * lay.L, v = (fit.h - (y - fit.y0)) * lay.L; // mm inside the piece box
          if (it.turned) { const t2 = u; u = fit.h * lay.L - v; v = t2; } // quarter turn
          let X = (it.x + u) * pxmm;
          const Y = (it.y + v) * pxmm;
          if (back) X = c.width - X;
          return [X, Y];
        };
        // single-sided: the back half is the mirror image across the fold line
        const FL = lay.fold ? fit.fold : null;
        const halves = FL ? [false, true] : [back];
        const onFold = (a, b) => FL && FL.segs.some(([p, q]) => ek(p, q) === ek(a, b));
        for (const mirrored of halves) {
          const tr = FL && mirrored ? (p) => toPage(D.reflect(p, FL.a, FL.b)) : toPage;
          this.drawHalf(g, lay, it.p.tris, tr, mirrored, { pxmm, showNum, showFold, foldMap, ek, onFold });
        }
        if (FL) {
          // fold line (dash-dot blue) with short marks beyond the outline
          const blue = '#1f6fd1';
          g.save();
          g.strokeStyle = blue; g.lineWidth = 0.45 * pxmm; g.lineCap = 'butt';
          g.setLineDash([4 * pxmm, 1.2 * pxmm, 0.8 * pxmm, 1.2 * pxmm]);
          for (const [p, q] of FL.segs) {
            const A = toPage(p), B = toPage(q);
            g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]); g.stroke();
          }
          g.setLineDash([]);
          const E0 = toPage(FL.ends[0]), E1 = toPage(FL.ends[1]);
          const dl = Math.hypot(E1[0] - E0[0], E1[1] - E0[1]) || 1;
          const ux = (E1[0] - E0[0]) / dl, uy = (E1[1] - E0[1]) / dl;
          const g0 = 1.2 * pxmm, g1 = 6 * pxmm;
          g.lineWidth = 0.6 * pxmm;
          g.beginPath();
          g.moveTo(E0[0] - ux * g0, E0[1] - uy * g0); g.lineTo(E0[0] - ux * g1, E0[1] - uy * g1);
          g.moveTo(E1[0] + ux * g0, E1[1] + uy * g0); g.lineTo(E1[0] + ux * g1, E1[1] + uy * g1);
          g.stroke();
          g.restore();
        }
      }
      // caption
      g.fillStyle = '#999';
      g.font = `${3 * pxmm}px system-ui, sans-serif`;
      g.textAlign = back ? 'right' : 'left';
      g.textBaseline = 'bottom';
      const cap = `${t('title')} · ${App.n} ${t('faces')} · ${this.sheetName(lay, back)}`;
      g.fillText(cap, back ? c.width - 10 * pxmm : 10 * pxmm, c.height - 4 * pxmm);
      return c;
    },
    // draw one side of a piece: images, numbers, cut / fold / crease lines
    drawHalf(g, lay, tris, tr, back, o) {
      const { pxmm, showNum, showFold, foldMap, ek, onFold } = o;
      {
        const edges = new Map();
        for (const tri of tris) {
          const P = tri.pts.map(tr);
          const cont = paperContent(back ? tri.back : tri.front);
          R.paintContent(g, cont, P);
          if (cont && cont.glue) {
            const cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cy = (P[0][1] + P[1][1] + P[2][1]) / 3;
            g.fillStyle = '#888';
            g.font = `${lay.L * 0.13 * pxmm}px system-ui, sans-serif`;
            g.textAlign = 'center'; g.textBaseline = 'middle';
            g.fillText(t('glue'), cx, cy);
          } else if (showNum && !tri.isJoin && !tri.isTab) {
            const cx = (P[0][0] + P[1][0] + P[2][0]) / 3, cy = (P[0][1] + P[1][1] + P[2][1]) / 3;
            const fs = lay.L * 0.12 * pxmm;
            g.font = `bold ${fs}px system-ui, sans-serif`;
            g.textAlign = 'center'; g.textBaseline = 'middle';
            const label = String(tri.k + 1);
            const w = g.measureText(label).width + fs * 0.5;
            g.fillStyle = 'rgba(255,255,255,0.75)';
            g.beginPath();
            if (g.roundRect) g.roundRect(cx - w / 2, cy - fs * 0.62, w, fs * 1.24, fs * 0.3); else g.rect(cx - w / 2, cy - fs * 0.62, w, fs * 1.24);
            g.fill();
            g.fillStyle = '#333';
            g.fillText(label, cx, cy + fs * 0.04);
          }
          for (let e = 0; e < 3; e++) {
            const a = tri.pts[e], b = tri.pts[(e + 1) % 3];
            const key = ek(a, b);
            const rec = edges.get(key);
            if (rec) rec.count++; else edges.set(key, { a, b, count: 1 });
          }
        }
        for (const [key, ed] of edges) {
          const A = tr(ed.a), B = tr(ed.b);
          g.beginPath(); g.moveTo(A[0], A[1]); g.lineTo(B[0], B[1]);
          g.setLineDash([]);
          if (ed.count === 1 && onFold(ed.a, ed.b)) continue; // drawn as the fold line
          if (ed.count === 1) {
            g.strokeStyle = '#111'; g.lineWidth = 0.3 * pxmm;
          } else if (showFold && foldMap.has(key)) {
            const valley = foldMap.get(key) !== back;
            g.strokeStyle = '#e0242b'; g.lineWidth = 0.45 * pxmm;
            if (valley) g.setLineDash([2.2 * pxmm, 1.4 * pxmm]);
          } else {
            g.strokeStyle = 'rgba(90,90,90,0.75)'; g.lineWidth = 0.2 * pxmm;
          }
          g.stroke();
        }
        g.setLineDash([]);
      }
    },
    // printing-method selector, with the piece / page count of each method
    renderModes() {
      const sel = $('printMode');
      sel.innerHTML = '';
      for (const m of ['fold', 'duplex']) {
        const l2 = this.layout(m);
        const o = document.createElement('option');
        o.value = m;
        o.textContent = t(m === 'fold' ? 'modeFold' : 'modeDuplex') +
          (l2 ? ' — ' + t(m === 'fold' ? 'modeStatsFold' : 'modeStatsDuplex', { p: l2.pieces.length, q: l2.pages.length }) : '');
        sel.appendChild(o);
      }
      sel.value = this.mode;
    },
    render() {
      if (!this.dirty) return;
      this.dirty = false;
      const lay = this.layout();
      const box = $('pages');
      box.innerHTML = '';
      if (!lay) { $('pieceInfo').textContent = t('tooBig'); this.renderModes(); this.pages = []; return; }
      $('pieceInfo').textContent = lay.fold
        ? t('piecesFold', { p: lay.pieces.length, q: lay.pages.length })
        : t('pieces', { p: lay.pieces.length, q: lay.pages.length, r: lay.pages.length * 2 });
      this.renderModes();
      $('printHint').textContent = t(lay.fold ? 'printHintFold' : 'printHint');
      this.pages = [];
      lay.pages.forEach((pg, i) => {
        for (const back of this.sheets(lay)) {
          const c = this.drawPage(lay, pg, back, 150);
          const url = c.toDataURL('image/png');
          this.pages.push({ url, back, i });
          const wrap = document.createElement('div');
          wrap.className = 'page-box';
          const img = document.createElement('img');
          img.src = url;
          img.alt = this.sheetName(lay, back) + ' ' + (i + 1);
          wrap.appendChild(img);
          const row = document.createElement('div');
          row.className = 'row';
          const cap = document.createElement('span');
          cap.className = 'cap';
          cap.textContent = `${this.sheetName(lay, back)} — ${t('page')} ${i + 1}`;
          row.appendChild(cap);
          const dl = document.createElement('button');
          dl.className = 'btn small ghost'; dl.type = 'button'; dl.textContent = t('download');
          dl.onclick = () => {
            const hi = this.drawPage(lay, pg, back, 300);
            hi.toBlob((blob) => {
              const a = document.createElement('a');
              a.href = URL.createObjectURL(blob);
              a.download = `hexaflexagon-${App.n}-${lay.fold ? 'single' : back ? 'back' : 'front'}-${i + 1}.png`;
              a.click();
              setTimeout(() => URL.revokeObjectURL(a.href), 2000);
            });
          };
          row.appendChild(dl);
          wrap.appendChild(row);
          box.appendChild(wrap);
        }
      });
    },
    print() {
      const lay = this.layout();
      if (!lay) return;
      const area = $('printArea');
      area.innerHTML = '';
      const imgs = [];
      lay.pages.forEach((pg) => {
        for (const back of this.sheets(lay)) {
          const c = this.drawPage(lay, pg, back, 220);
          const d = document.createElement('div');
          d.className = 'pp';
          const img = document.createElement('img');
          img.src = c.toDataURL('image/png');
          d.appendChild(img);
          area.appendChild(d);
          imgs.push(img);
        }
      });
      Promise.all(imgs.map((im) => (im.complete ? 0 : new Promise((r) => { im.onload = r; })))).then(() => window.print());
    },
  };

  // ------------------------------------------------------------------
  // shared geometry for the flexagon view
  const theta = (j) => (90 - 60 * j) * DEG;
  function vert(j, el, z0 = 0, down = false) {
    const c = Math.cos(el);
    return [c * Math.cos(theta(j)), c * Math.sin(theta(j)), z0 + (down ? -1 : 1) * Math.sin(el)];
  }
  function gammaOf(al) {
    const A = Math.sin(al), B = Math.cos(al) / 2;
    const Rr = Math.hypot(A, B);
    return Math.asin(Math.min(1, 1 / (2 * Rr))) - Math.atan2(B, A);
  }
  // items (two-sided triangles) for a state, with vertex positions verts[j], centre O
  function stateItems(state, O, verts) {
    const items = [];
    for (let i = 0; i < 6; i++) {
      const p = state[i];
      const tl = F.topLeaf(p), bl = F.bottomLeaf(p);
      const tk = tl.leaf + (F.frontUp(tl.m) ? 'f' : 'b');
      const bk = bl.leaf + (F.frontUp(bl.m) ? 'b' : 'f');
      items.push({
        pts: [O, verts[(i + 1) % 6], verts[i]],
        front: content(tk, [tl.m.O, tl.m.N, tl.m.P]),
        back: content(bk, [bl.m.O, bl.m.N, bl.m.P]),
        pos: i,
      });
    }
    return items;
  }
  function flatVerts(z0 = 0) { return [0, 1, 2, 3, 4, 5].map((j) => vert(j, 0, z0)); }
  function addShading(items) {
    for (const it of items) {
      const [a, b, c] = it.pts;
      const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
      const n = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const L = Math.hypot(...n) || 1;
      const k = 1 - Math.abs(n[2] / L);
      if (k > 0.02) it.shade = `rgba(0,0,0,${(0.3 * k).toFixed(3)})`;
    }
    return items;
  }
  function facesOf(state) {
    const v = F.visibleSides(state);
    return [App.A.sideFace[v.top[0].leaf + v.top[0].side], App.A.sideFace[v.bottom[0].leaf + v.bottom[0].side]];
  }

  // ------------------------------------------------------------------
  // simulator
  const Sim = {
    state: null, hist: [], anim: null, queue: [], visits: new Map(), auto: false, dirty: true,
    markers: [], lastParity: 0,
    reset() {
      const node = App.A.plan ? App.A.plan.targetNode : 0;
      this.state = App.A.graph.nodes[node].state;
      this.hist = []; this.queue = []; this.anim = null; this.auto = false;
      this.visits = new Map();
      this.visit();
      this.dirty = true;
      this.updateUI();
    },
    nodeOf(st) { return App.nodeIndex.get(F.canonicalKey(st)); },
    visit() { const id = this.nodeOf(this.state); this.visits.set(id, (this.visits.get(id) || 0) + 1); },
    speed() { return +$('speed').value || 1; },
    move(m) {
      if (this.anim) { this.queue.push(m); return; }
      let to;
      if (m.type === 'pinch') { to = F.pinch(this.state, m.parity); if (!to) return; this.lastParity = m.parity; }
      else to = F.turnOver(this.state);
      const dur = (m.type === 'pinch' ? 1500 : 900) / this.speed();
      this.anim = { m, from: this.state, to, t0: performance.now(), dur };
      this.dirty = true;
    },
    finish() {
      this.hist.push(this.anim.from);
      this.state = this.anim.to;
      this.anim = null;
      this.visit();
      this.updateUI();
      if (this.queue.length) this.move(this.queue.shift());
      else if (this.auto) setTimeout(() => { if (this.auto && !this.anim) this.autoStep(); }, 250 / this.speed());
    },
    undo() {
      if (this.anim || !this.hist.length) return;
      this.state = this.hist.pop();
      this.dirty = true;
      this.updateUI();
    },
    options(st) {
      const out = [];
      for (const par of [0, 1]) {
        const r = F.pinch(st, par);
        if (r) out.push({ moves: [{ type: 'pinch', parity: par }], to: r });
      }
      const tt = F.turnOver(st);
      for (const par of [0, 1]) {
        const r = F.pinch(tt, par);
        if (r) out.push({ moves: [{ type: 'turn' }, { type: 'pinch', parity: par }], to: r });
      }
      return out;
    },
    autoStep() {
      const opts = this.options(this.state);
      if (!opts.length) return;
      let best = null, bestScore = Infinity;
      for (const o of opts) {
        const id = this.nodeOf(o.to);
        let sc = (this.visits.get(id) || 0) * 10 + o.moves.length + Math.random() * 0.5;
        if (o.moves.length === 1 && o.moves[0].parity === this.lastParity) sc -= 0.3;
        if (sc < bestScore) { bestScore = sc; best = o; }
      }
      for (const m of best.moves) this.move(m);
    },
    navigateTo(target) {
      if (this.anim) return;
      // BFS over concrete states
      const startKey = F.stateKey(this.state);
      const prev = new Map([[startKey, null]]);
      const q = [this.state];
      let found = null;
      while (q.length && !found) {
        const s = q.shift();
        const sk = F.stateKey(s);
        if (this.nodeOf(s) === target) { found = sk; break; }
        const nexts = [];
        for (const par of [0, 1]) { const r = F.pinch(s, par); if (r) nexts.push([r, { type: 'pinch', parity: par }]); }
        nexts.push([F.turnOver(s), { type: 'turn' }]);
        for (const [r, m] of nexts) {
          const k = F.stateKey(r);
          if (prev.has(k)) continue;
          prev.set(k, { from: sk, m });
          if (this.nodeOf(r) === target) { found = k; q.length = 0; break; }
          q.push(r);
        }
      }
      if (!found) return;
      const moves = [];
      let k = found;
      while (prev.get(k)) { const e = prev.get(k); moves.unshift(e.m); k = e.from; }
      this.auto = false;
      $('autoBtn').textContent = t('autoplay');
      for (const m of moves) this.move(m);
    },
    setReference() {
      if (this.anim) return;
      const vis = F.visibleSides(this.state).top;
      for (const s of vis) {
        const old = App.A.tex[s.leaf + s.side];
        const uv = [];
        uv[s.m.O] = [0, 0]; uv[s.m.P] = D.vP(s.pos); uv[s.m.N] = D.vN(s.pos);
        App.A.tex[s.leaf + s.side] = { face: old.face, uv };
      }
      redrawAll();
      this.updateUI();
    },
    isIntact(st) {
      const vis = F.visibleSides(st).top;
      const f = App.A.sideFace[vis[0].leaf + vis[0].side];
      // the picture is intact if every visible piece sits at the place its uv says (up to a global rotation)
      let rotOk = null;
      for (const s of vis) {
        const tx = App.A.tex[s.leaf + s.side];
        if (Math.hypot(...tx.uv[s.m.O]) > 1e-6) return { f, ok: false };
        const p = tx.uv[s.m.P];
        const homePos = Math.round(((90 - Math.atan2(p[1], p[0]) / DEG) / 60 + 12) % 6) % 6;
        const d = (homePos - s.pos + 6) % 6;
        if (rotOk === null) rotOk = d; else if (rotOk !== d) return { f, ok: false };
      }
      return { f, ok: true };
    },
    updateUI() {
      if (!this.state) return;
      const [top, bot] = facesOf(this.state);
      for (const [id, par, key] of [['flexA', 0, 'flexA'], ['flexB', 1, 'flexB']]) {
        const r = F.pinch(this.state, par);
        const b = $(id);
        b.disabled = !r;
        b.textContent = t(key) + ' ' + (r ? t('flexTo', { n: facesOf(r)[0] + 1 }) : t('cannot'));
      }
      $('undoBtn').disabled = !this.hist.length;
      const info = $('simInfo');
      info.innerHTML = '';
      const pill = (label, f, cls) => {
        const s = document.createElement('span');
        s.className = 'pill' + (cls ? ' ' + cls : '');
        if (f !== null) s.appendChild(faceThumbCanvas(f, 22));
        const tx = document.createElement('span');
        tx.textContent = label;
        s.appendChild(tx);
        info.appendChild(s);
      };
      pill(`${t('topFace')}: ${t('faceN', { n: top + 1 })}`, top);
      pill(`${t('bottomFace')}: ${t('faceN', { n: bot + 1 })}`, bot);
      const it = this.isIntact(this.state);
      const k = App.A.faces[top].arrangements;
      if (it.ok) pill('✓ ' + t('intact'), null, 'ok');
      else pill('↻ ' + t('scrambled', { k }), null, 'warn');
      $('refBtn').disabled = it.ok;
      $('visited').textContent = t('visited', { v: this.visits.size, n: App.A.graph.nodes.length });
      $('patNotation').textContent = patNotation(this.state);
      Graph.draw();
      this.dirty = true;
    },
    camera(c) {
      const W = c.width, H = c.height;
      return R.makeCamera({ tilt: 0.42, dist: 7, scale: Math.min(W, H) * 0.36, cx: W / 2, cy: H * 0.5 });
    },
    frameItems(now) {
      if (!this.anim) {
        return addShading(stateItems(this.state, [0, 0, 0], flatVerts()));
      }
      const a = this.anim;
      const u = Math.min(1, (now - a.t0) / a.dur);
      if (a.m.type === 'turn') {
        const ph = Math.PI * ease(u);
        const lift = 0.35 * Math.sin(Math.PI * u);
        const rot = (p) => [p[0] * Math.cos(ph) + p[2] * Math.sin(ph), p[1], -p[0] * Math.sin(ph) + p[2] * Math.cos(ph) + lift];
        const items = stateItems(a.from, [0, 0, 0], flatVerts());
        for (const it of items) it.pts = it.pts.map(rot);
        return addShading(items);
      }
      const e = a.m.parity;
      const isSpine = (j) => j % 2 === (e + 1) % 2;
      if (u < 0.5) {
        const s = ease(u * 2);
        const al = s * 90 * DEG, ga = gammaOf(al);
        const verts = [0, 1, 2, 3, 4, 5].map((j) => vert(j, isSpine(j) ? al : ga, -u));
        return addShading(stateItems(a.from, [0, 0, -u], verts));
      }
      const s = ease((1 - u) * 2);
      const al = s * 90 * DEG, ga = gammaOf(al);
      const verts = [0, 1, 2, 3, 4, 5].map((j) => vert(j, isSpine(j) ? al : ga, 1 - u, true));
      return addShading(stateItems(a.to, [0, 0, 1 - u], verts));
    },
    draw(now) {
      if (!this.anim && !this.dirty) return;
      const c = $('simCanvas');
      if (!fitCanvas(c)) return;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      const cam = this.camera(c);
      // soft shadow
      g.save();
      g.fillStyle = 'rgba(0,0,0,0.10)';
      const sh = cam.project([0, -0.08, -0.04]);
      g.beginPath();
      g.ellipse(sh[0], sh[1] + c.height * 0.02, cam.project([1, 0, 0])[0] - cam.project([0, 0, 0])[0], (cam.project([1, 0, 0])[0] - cam.project([0, 0, 0])[0]) * 0.75, 0, 0, Math.PI * 2);
      g.fill();
      g.restore();
      const items = this.frameItems(now);
      R.drawScene(g, cam, items, { sortByDepth: true });
      this.markers = [];
      if (!this.anim) {
        // pinch markers
        for (const par of [0, 1]) {
          const ok = F.canPinch(this.state, par);
          for (let j = par; j < 6; j += 2) {
            const p = cam.project(vert(j, 0, 0).map((x, i) => (i < 2 ? x * 1.09 : x)));
            g.beginPath();
            g.arc(p[0], p[1], c.width * (ok ? 0.017 : 0.008), 0, Math.PI * 2);
            g.fillStyle = ok ? (par ? '#1a9e8f' : '#f28c28') : 'rgba(128,128,128,0.35)';
            g.fill();
            if (ok) { g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke(); this.markers.push({ p, par }); }
          }
        }
      }
      this.drawBack();
      this.dirty = false;
      if (this.anim && now - this.anim.t0 >= this.anim.dur) this.finish();
    },
    drawBack() {
      const c = $('backCanvas');
      if (!fitCanvas(c)) return;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      const st = this.anim ? this.anim.from : this.state;
      const cam = R.makeCamera({ tilt: 0, dist: 50, scale: c.width * 0.45, cx: c.width / 2, cy: c.height / 2 });
      R.drawScene(g, cam, stateItems(F.turnOver(st), [0, 0, 0], flatVerts()), {});
    },
    init() {
      const c = $('simCanvas');
      c.addEventListener('click', (e) => {
        const p = eventPos(c, e);
        let best = null, bd = Infinity;
        for (const m of this.markers) {
          const d = Math.hypot(m.p[0] - p[0], m.p[1] - p[1]);
          if (d < bd) { bd = d; best = m; }
        }
        if (best && bd < c.width * 0.06) this.move({ type: 'pinch', parity: best.par });
      });
      $('flexA').onclick = () => this.move({ type: 'pinch', parity: 0 });
      $('flexB').onclick = () => this.move({ type: 'pinch', parity: 1 });
      $('turnBtn').onclick = () => this.move({ type: 'turn' });
      $('undoBtn').onclick = () => this.undo();
      $('resetBtn').onclick = () => this.reset();
      $('refBtn').onclick = () => this.setReference();
      $('autoBtn').onclick = () => {
        this.auto = !this.auto;
        $('autoBtn').textContent = this.auto ? t('stop') : t('autoplay');
        if (this.auto && !this.anim) this.autoStep();
      };
    },
  };

  function patNotation(st) {
    const f = (p) => (F.isLeaf(p) ? (F.frontUp(p.m) ? '' : '−') + (p.leaf + 1) : `[${f(p.a)}, ${f(p.b)}]`);
    return '[' + st.map(f).join(', ') + ']';
  }

  // ------------------------------------------------------------------
  // transition graph (triangulated face polygon)
  const Graph = {
    nodesPx: [], hover: -1,
    layout(c) {
      const A = App.A;
      const W = c.width, H = c.height;
      const Rr = Math.min(W, H) * 0.31;
      const cx = W / 2, cy = H / 2;
      const pos = {};
      A.polygon.forEach((f, i) => {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / A.polygon.length;
        pos[f] = [cx + Rr * Math.cos(a), cy + Rr * Math.sin(a)];
      });
      return { pos, Rr, cx, cy };
    },
    draw() {
      const c = $('graphCanvas');
      if (!fitCanvas(c) || !Sim.state) return;
      const g = c.getContext('2d');
      const A = App.A;
      g.clearRect(0, 0, c.width, c.height);
      const { pos, Rr } = this.layout(c);
      const dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const ink = dark ? '#e9ebf0' : '#1f2430';
      // triangles of the map
      g.lineWidth = 1;
      for (const tri of A.triangles) {
        g.beginPath();
        tri.forEach((f, i) => { const p = pos[f]; if (i) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); });
        g.closePath();
        g.fillStyle = dark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.025)';
        g.fill();
        g.strokeStyle = dark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.16)';
        g.stroke();
      }
      // nodes at chord midpoints
      const cur = Sim.nodeOf(Sim.state);
      const [top, bot] = facesOf(Sim.state);
      this.nodesPx = A.graph.nodes.map((nd) => {
        const [a, b] = nd.faces;
        return [(pos[a][0] + pos[b][0]) / 2, (pos[a][1] + pos[b][1]) / 2];
      });
      // edges
      g.lineWidth = Math.max(1.5, c.width * 0.004);
      g.strokeStyle = dark ? 'rgba(233,235,240,0.55)' : 'rgba(31,36,48,0.55)';
      for (const e of A.graph.edges) {
        const p = this.nodesPx[e.a], q = this.nodesPx[e.b];
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.stroke();
      }
      // current chord
      g.save();
      g.strokeStyle = '#e4572e';
      g.lineWidth = Math.max(3, c.width * 0.009);
      g.lineCap = 'round';
      g.beginPath(); g.moveTo(pos[top][0], pos[top][1]); g.lineTo(pos[bot][0], pos[bot][1]); g.stroke();
      g.restore();
      // node dots
      const r = Math.max(5, c.width * 0.016);
      A.graph.nodes.forEach((nd, i) => {
        const p = this.nodesPx[i];
        const seen = Sim.visits.has(i);
        g.beginPath();
        g.arc(p[0], p[1], i === cur ? r * 1.5 : r, 0, Math.PI * 2);
        g.fillStyle = i === cur ? '#e4572e' : seen ? ink : dark ? '#1e2128' : '#fff';
        g.fill();
        g.lineWidth = 2;
        g.strokeStyle = i === this.hover ? '#e4572e' : ink;
        g.stroke();
      });
      // faces
      const fr = Math.min(Rr * 0.26, c.width * 0.068);
      for (let f = 0; f < A.nFaces; f++) {
        const p = pos[f];
        const dir = [p[0] - c.width / 2, p[1] - c.height / 2];
        const L = Math.hypot(...dir) || 1;
        const q = [p[0] + (dir[0] / L) * fr * 1.25, p[1] + (dir[1] / L) * fr * 1.25];
        drawHexThumb(g, f, q[0], q[1], fr);
        if (f === top || f === bot) {
          R.hexPath(g, q[0], q[1], fr * 1.12);
          g.strokeStyle = '#e4572e'; g.lineWidth = f === top ? 4 : 2;
          g.setLineDash(f === top ? [] : [4, 3]);
          g.stroke();
          g.setLineDash([]);
        }
        g.font = `bold ${Math.max(11, fr * 0.42)}px system-ui, sans-serif`;
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.lineWidth = 3; g.strokeStyle = dark ? '#1e2128' : '#fff';
        g.strokeText(String(f + 1), q[0] + fr * 0.8, q[1] - fr * 0.8);
        g.fillStyle = ink;
        g.fillText(String(f + 1), q[0] + fr * 0.8, q[1] - fr * 0.8);
      }
      // hover label
      if (this.hover >= 0) {
        const nd = A.graph.nodes[this.hover];
        const p = this.nodesPx[this.hover];
        const txt = t('stateLabel', { a: nd.faces[0] + 1, b: nd.faces[1] + 1 });
        g.font = `${Math.max(12, c.width * 0.028)}px system-ui, sans-serif`;
        const w = g.measureText(txt).width + 12;
        g.fillStyle = dark ? '#000c' : '#fffd';
        g.fillRect(p[0] - w / 2, p[1] - r * 4.2, w, r * 2.4);
        g.fillStyle = ink;
        g.fillText(txt, p[0], p[1] - r * 3);
      }
    },
    pick(e) {
      const c = $('graphCanvas');
      const p = eventPos(c, e);
      let best = -1, bd = Infinity;
      this.nodesPx.forEach((q, i) => { const d = Math.hypot(q[0] - p[0], q[1] - p[1]); if (d < bd) { bd = d; best = i; } });
      return bd < c.width * 0.04 ? best : -1;
    },
    init() {
      const c = $('graphCanvas');
      c.addEventListener('mousemove', (e) => { const h = this.pick(e); if (h !== this.hover) { this.hover = h; this.draw(); } });
      c.addEventListener('mouseleave', () => { this.hover = -1; this.draw(); });
      c.addEventListener('click', (e) => { const h = this.pick(e); if (h >= 0) Sim.navigateTo(h); });
    },
  };

  // ------------------------------------------------------------------
  // folding steps
  const Steps = {
    list: [], i: 0, t0: 0, playing: false, dirty: true, rot: 0, center: [0, 0], auto: false,
    build() {
      const A = App.A, plan = A.plan;
      this.list = [];
      if (!plan) return;
      const lay = Print.layout();
      const nPieces = lay ? lay.pieces.length : 1;
      this.nPieces = nPieces;
      this.fold = !!(lay && lay.fold);
      this.pieceView = this.fold ? this.buildPieceView(lay) : null;
      this.list.push({ kind: 'print' });
      this.list.push({ kind: 'glue', anim: this.fold ? 2200 : 1800 });
      if (nPieces > 1) this.list.push({ kind: 'join' });
      this.list.push({ kind: 'crease' });
      plan.steps.forEach((s, i) => this.list.push({ kind: 'fold', i, anim: 1400 }));
      this.list.push({ kind: 'tab' });
      if (plan.finalMirrored) this.list.push({ kind: 'flip', anim: 1400 });
      this.list.push({ kind: 'done' });
      // orientation of the strip: principal axis horizontal
      const cents = plan.net.map(D.centroid);
      const mx = cents.reduce((s, c) => s + c[0], 0) / cents.length;
      const my = cents.reduce((s, c) => s + c[1], 0) / cents.length;
      let sxx = 0, syy = 0, sxy = 0;
      for (const c of cents) { sxx += (c[0] - mx) ** 2; syy += (c[1] - my) ** 2; sxy += (c[0] - mx) * (c[1] - my); }
      this.rot = -0.5 * Math.atan2(2 * sxy, sxx - syy);
      this.center = [mx, my];
      // make the first triangle appear on the left
      const p0 = this.rp(cents[0]), p1 = this.rp(cents[cents.length - 1]);
      if (p0[0] > p1[0]) this.rot += Math.PI;
      $('stepRange').max = this.list.length - 1;
      this.renderList();
      this.go(Math.min(this.i, this.list.length - 1), false);
    },
    /*
     * Single-sided print: every cut-out piece in its own frame, fold line
     * vertical, front half on its right and the mirrored back half on its left.
     * Pieces are placed side by side.
     */
    buildPieceView(lay) {
      const out = [];
      let x = 0;
      for (const pc of lay.pieces) {
        const FL = pc.fit.fold;
        let ang = Math.PI / 2 - Math.atan2(FL.b[1] - FL.a[1], FL.b[0] - FL.a[0]);
        const rot = (p) => {
          const c = Math.cos(ang), sn = Math.sin(ang), dx = p[0] - FL.a[0], dy = p[1] - FL.a[1];
          return [dx * c - dy * sn, dx * sn + dy * c];
        };
        if (pc.tris.some((t2) => t2.pts.some((p) => rot(p)[0] < -1e-6))) ang += Math.PI;
        const tris = pc.tris.map((t2) => ({ tri: t2, pts: t2.pts.map(rot) }));
        const segs = FL.segs.map((sg) => sg.map(rot));
        let y0 = Infinity, y1 = -Infinity, w = 0;
        for (const t2 of tris) for (const p of t2.pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); w = Math.max(w, p[0]); }
        const dx = x + w, dy = -(y0 + y1) / 2;
        const mv = (p) => [p[0] + dx, p[1] + dy];
        for (const t2 of tris) t2.pts = t2.pts.map(mv);
        out.push({ tris, segs: segs.map((sg) => sg.map(mv)), x0: dx });
        x = dx + w + 0.5;
      }
      return out;
    },
    // items of the piece view with the back halves turned by th (0 = flat, PI = folded under)
    pieceItems(th) {
      const blank = { glue: true };
      const sgn = (q) => Math.sign(D.cross(q[0], q[1], q[2]));
      const items = [];
      for (const pv of this.pieceView) {
        for (const { tri, pts } of pv.tris) {
          const label = tri.isJoin || tri.isTab ? '' : String(tri.k + 1);
          const pf = paperContent(tri.front), pb = paperContent(tri.back);
          const s1 = sgn(pts);
          items.push({ pts: pts.map((p) => [p[0], p[1], 0]), front: s1 > 0 ? pf : blank, back: s1 > 0 ? blank : pf, label, order: 1 });
          const x0 = pv.x0;
          const m = pts.map((p) => [2 * x0 - p[0], p[1]]);
          const s2 = sgn(m);
          items.push({
            pts: m.map((p) => [x0 + (p[0] - x0) * Math.cos(th), p[1], (p[0] - x0) * Math.sin(th) - 0.004 * (th / Math.PI)]),
            front: s2 > 0 ? pb : blank, back: s2 > 0 ? blank : pb, label: Math.cos(th) > 0.45 ? label : '', order: 0,
          });
        }
      }
      return items;
    },
    pieceLines(lw) {
      const L = [];
      for (const pv of this.pieceView) for (const [a, b] of pv.segs) L.push([a, b, '#1f6fd1', [lw * 4, lw * 1.5, lw, lw * 1.5], lw * 1.3]);
      return L;
    },
    rp(p) { // rotate plane point
      const x = p[0] - this.center[0], y = p[1] - this.center[1];
      const c = Math.cos(this.rot), s = Math.sin(this.rot);
      return [x * c - y * s, x * s + y * c];
    },
    renderList() {
      const ol = $('stepList');
      ol.innerHTML = '';
      this.list.forEach((st, i) => {
        const li = document.createElement('li');
        li.textContent = this.title(st);
        li.onclick = () => this.go(i, true);
        ol.appendChild(li);
      });
    },
    title(st) {
      const nf = App.A.plan.steps.length;
      switch (st.kind) {
        case 'print': return t('s_print_t');
        case 'glue': return t(this.fold ? 's_glue_t_fold' : 's_glue_t');
        case 'join': return t('s_join_t');
        case 'crease': return t('s_crease_t');
        case 'fold': return t('s_fold_t', { i: st.i + 1, n: nf });
        case 'tab': return t('s_tab_t');
        case 'flip': return t('s_flip_t');
        default: return t('s_done_t');
      }
    },
    desc(st) {
      const plan = App.A.plan;
      switch (st.kind) {
        case 'print': return t(this.fold ? 's_print_d_fold' : 's_print_d', { p: this.nPieces });
        case 'glue': return t(this.fold ? 's_glue_d_fold' : 's_glue_d');
        case 'join': return t('s_join_d');
        case 'crease': return t('s_crease_d');
        case 'fold': {
          const s = plan.steps[st.i];
          const k = s.hinge;
          const b = k + 2 > plan.order.length ? t('glue') : k + 2;
          // relation after fold in the viewer's frame
          const pos = s.up ? t('above') : t('below');
          return t(s.up ? 's_fold_valley' : 's_fold_mountain', { a: k + 1, b, pos });
        }
        case 'tab': return t('s_tab_d', { pos: plan.tabAbove ? t('tabAboveTxt') : t('tabBelowTxt') });
        case 'flip': return t('s_flip_d');
        default: {
          const fs = App.A.graph.nodes[plan.targetNode].faces;
          return t('s_done_d', { a: fs[0] + 1, b: fs[1] + 1 });
        }
      }
    },
    go(i, animate) {
      this.i = Math.max(0, Math.min(this.list.length - 1, i));
      const st = this.list[this.i];
      $('stepRange').value = this.i;
      $('stepCounter').textContent = t('stepOf', { i: this.i + 1, n: this.list.length });
      $('stepTitle').textContent = this.title(st);
      $('stepDesc').innerHTML = this.desc(st);
      $('goSim').classList.toggle('hidden', st.kind !== 'done');
      document.querySelectorAll('#stepList li').forEach((li, k) => li.classList.toggle('cur', k === this.i));
      const ol = $('stepList'), cur = ol.querySelector('li.cur');
      if (cur) ol.scrollTop += cur.getBoundingClientRect().top - ol.getBoundingClientRect().top - ol.clientHeight / 2 + cur.clientHeight / 2;
      $('stepPrev').disabled = this.i === 0;
      $('stepNext').disabled = this.i === this.list.length - 1;
      this.t0 = animate && st.anim ? performance.now() : -1e9;
      this.dirty = true;
    },
    // build triangle items for a configuration
    items(cfg, opt = {}) {
      const plan = App.A.plan;
      const sides = App.sides;
      const N = cfg.length;
      const out = [];
      for (let k = 0; k < N; k++) {
        const tri = sides.tris[k];
        const netSign = Math.sign(D.cross(...plan.net[k]));
        const pf = paperContent(tri.front), pb = paperContent(tri.back);
        const pts = cfg[k].map((p) => (p.length === 3 ? p : [p[0], p[1], 0]));
        out.push({
          k, pts, front: netSign > 0 ? pf : pb, back: netSign > 0 ? pb : pf,
          label: tri.isTab ? '' : String(k + 1),
        });
      }
      return out;
    },
    order(above, N) { // topological order bottom -> top
      const indeg = new Array(N).fill(0);
      for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (above[i] && above[i][j]) indeg[i]++;
      const res = [], used = new Array(N).fill(false);
      for (let step = 0; step < N; step++) {
        let pick = -1;
        for (let i = 0; i < N; i++) if (!used[i] && indeg[i] === 0) { pick = i; break; }
        if (pick < 0) pick = used.indexOf(false);
        used[pick] = true; res.push(pick);
        for (let i = 0; i < N; i++) if (above[i] && above[i][pick]) indeg[i]--;
      }
      const rank = new Array(N);
      res.forEach((k, r) => { rank[k] = r; });
      return rank;
    },
    tf(cfg) { // rotate configuration into view frame
      return cfg.map((q) => q.map((p) => { const r = this.rp(p); return p.length === 3 ? [r[0], r[1], p[2]] : [r[0], r[1], 0]; }));
    },
    frame(now) {
      const st = this.list[this.i];
      const plan = App.A.plan;
      const u = st.anim ? Math.min(1, (now - this.t0) / st.anim) : 1;
      const N = plan.order.length + 1;
      let cfg, rank, highlight = null, hinge = null, fitCfgs, extra = {};
      const zeroAbove = Array.from({ length: N }, () => new Array(N).fill(0));
      const netCfg = plan.net;
      if (this.fold && (st.kind === 'print' || st.kind === 'glue')) {
        // single-sided: show the cut-out pieces, then fold their back halves under
        const th = st.kind === 'glue' ? Math.PI * ease(u) : 0;
        const toCfg = (its) => its.map((it) => it.pts);
        const fitCfgs2 = [toCfg(this.pieceItems(0)), toCfg(this.pieceItems(Math.PI / 2))];
        const items = this.pieceItems(th);
        this.drawCfg(null, null, fitCfgs2, null, null, { items, sortDepth: th > 0, pieceLines: true }, st);
        return u < 1;
      }
      switch (st.kind) {
        case 'print': case 'join': case 'crease': {
          cfg = this.tf(netCfg); rank = this.order(zeroAbove, N); fitCfgs = [cfg];
          if (st.kind === 'crease') extra.creases = true;
          if (st.kind === 'join') extra.joins = true;
          if (st.kind === 'print') extra.cuts = true;
          break;
        }
        case 'glue': {
          const base = this.tf(netCfg);
          const ph = Math.PI * ease(u <= 0.5 ? u * 2 : 2 - u * 2);
          cfg = base.map((q) => q.map((p) => [p[0], p[1] * Math.cos(ph), p[1] * Math.sin(ph) * -1 + 0]));
          rank = this.order(zeroAbove, N); fitCfgs = [base];
          extra.sortDepth = true;
          break;
        }
        case 'fold': {
          const s = plan.steps[st.i];
          const before = this.tf(s.before), after = this.tf(s.after);
          const A = this.rp(s.A), B = this.rp(s.B);
          const dx = B[0] - A[0], dy = B[1] - A[1], L = Math.hypot(dx, dy);
          const d = [dx / L, dy / L];
          const ph = Math.PI * ease(u);
          const sgn = s.up ? 1 : -1;
          cfg = before.map((q, j) => (j <= s.hinge ? q : q.map((p) => {
            const w = [p[0] - A[0], p[1] - A[1]];
            const al = w[0] * d[0] + w[1] * d[1];
            const v = [w[0] - al * d[0], w[1] - al * d[1]];
            const vl = Math.hypot(v[0], v[1]);
            return [A[0] + al * d[0] + v[0] * Math.cos(ph), A[1] + al * d[1] + v[1] * Math.cos(ph), sgn * vl * Math.sin(ph)];
          })));
          if (u >= 1) { cfg = after; rank = this.order(s.aboveAfter, N); }
          else {
            const r0 = this.order(s.aboveBefore, N);
            rank = r0.map((r, j) => (j <= s.hinge ? r : (s.up ? 1000 : -1000) + (u > 0.5 ? -r : r)));
          }
          highlight = (j) => j > s.hinge;
          hinge = [A, B, s.up];
          const mid = before.map((q, j) => (j <= s.hinge ? q : q.map((p) => {
            const w = [p[0] - A[0], p[1] - A[1]];
            const al = w[0] * d[0] + w[1] * d[1];
            const v = [w[0] - al * d[0], w[1] - al * d[1]];
            return [A[0] + al * d[0], A[1] + al * d[1], sgn * Math.hypot(v[0], v[1])];
          })));
          fitCfgs = [before, after, mid];
          break;
        }
        case 'tab': case 'flip': {
          const fin = this.tf(plan.final);
          rank = this.order(plan.finalAbove, N);
          fitCfgs = [fin];
          if (st.kind === 'flip') {
            const cx = fin.reduce((s2, q) => s2 + q[0][0] + q[1][0] + q[2][0], 0) / (3 * N);
            const ph = Math.PI * ease(u);
            const lift = 0.5 * Math.sin(Math.PI * u);
            cfg = fin.map((q) => q.map((p) => [cx + (p[0] - cx) * Math.cos(ph), p[1], -(p[0] - cx) * Math.sin(ph) + lift]));
            extra.sortDepth = u > 0 && u < 1;
            if (u >= 1) { rank = rank.map((r) => -r); cfg = fin.map((q) => q.map((p) => [2 * cx - p[0], p[1], 0])); }
          } else {
            cfg = fin;
            highlight = (j) => j === N - 1 || j === 0;
          }
          break;
        }
        default: {
          // finished flexagon: draw the target state
          return this.drawDone();
        }
      }
      this.drawCfg(cfg, rank, fitCfgs, highlight, hinge, extra, st);
      if (st.anim && u >= 1 && this.playing) {
        this.playing = false;
      }
      return u < 1;
    },
    drawCfg(cfg, rank, fitCfgs, highlight, hinge, extra, st) {
      const c = $('stepCanvas');
      if (!fitCanvas(c)) return;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      // fit: project with a unit camera, then scale/translate the screen bbox into the canvas
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const cf of fitCfgs) for (const q of cf) for (const p of q) {
        x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]);
      }
      let tilt = (+$('stepTilt').value || 0) * DEG;
      const base = { tilt, dist: 40, ox: (x0 + x1) / 2, oy: (y0 + y1) / 2 };
      const cam0 = R.makeCamera({ ...base, scale: 1, cx: 0, cy: 0 });
      let sx0 = Infinity, sx1 = -Infinity, sy0 = Infinity, sy1 = -Infinity;
      for (const cf of fitCfgs) for (const q of cf) for (const p of q) {
        const P = cam0.project(p.length === 3 ? p : [p[0], p[1], 0]);
        sx0 = Math.min(sx0, P[0]); sx1 = Math.max(sx1, P[0]); sy0 = Math.min(sy0, P[1]); sy1 = Math.max(sy1, P[1]);
      }
      const scale = Math.min(c.width / (sx1 - sx0 + 0.8), c.height / (sy1 - sy0 + 0.8), c.width / 4.5);
      const cam = R.makeCamera({ ...base, scale, cx: c.width / 2 - scale * (sx0 + sx1) / 2, cy: c.height / 2 - scale * (sy0 + sy1) / 2 });
      const items = extra.items || this.items(cfg);
      if (!extra.items) items.forEach((it, j) => {
        it.order = rank[j];
        if (highlight && highlight(j)) { it.shade = 'rgba(255,196,0,0.28)'; it.outlineColor = '#d18b00'; it.outlineWidth = 2; }
      });
      if (extra.sortDepth) addShading(items);
      R.drawScene(g, cam, items, { labels: true, sortByDepth: !!extra.sortDepth });
      const plan = App.A.plan;
      const line = (a, b, color, dash, width) => {
        const P = cam.project(a.length === 3 ? a : [a[0], a[1], 0]), Q = cam.project(b.length === 3 ? b : [b[0], b[1], 0]);
        g.save();
        g.beginPath(); g.moveTo(P[0], P[1]); g.lineTo(Q[0], Q[1]);
        g.strokeStyle = color; g.lineWidth = width; g.setLineDash(dash); g.lineCap = 'round';
        g.stroke(); g.restore();
      };
      const lw = Math.max(2, c.width * 0.004);
      if (extra.pieceLines) for (const [a, b, col, dash, w] of this.pieceLines(lw)) line(a, b, col, dash, w);
      if (hinge) {
        const [A, B, up] = hinge;
        const ext = (p, q, s) => [p[0] + (p[0] - q[0]) * s, p[1] + (p[1] - q[1]) * s];
        line(ext(A, B, 0.12), ext(B, A, 0.12), '#e0242b', up ? [lw * 3, lw * 2] : [], lw * 1.4);
      }
      if (extra.creases) {
        const foldSet = new Map(App.sides.folds.map((f) => [f.k, f.valleyOnFront]));
        for (const cr of App.sides.creases) {
          const A = this.rp(cr.a), B = this.rp(cr.b);
          if (foldSet.has(cr.k)) line(A, B, '#e0242b', foldSet.get(cr.k) ? [lw * 3, lw * 2] : [], lw);
          else line(A, B, 'rgba(60,60,60,0.8)', [], lw * 0.6);
        }
      }
      if (extra.joins && App.sides) {
        const pieces = (Print.layout() || { pieces: [] }).pieces;
        for (const pc of pieces.slice(0, -1)) {
          const k = pc.to;
          const cr = App.sides.creases[k];
          line(this.rp(cr.a), this.rp(cr.b), '#f3a712', [], lw * 2.2);
        }
      }
      if (extra.cuts) {
        const pieces = (Print.layout() || { pieces: [] }).pieces;
        for (const pc of pieces.slice(0, -1)) {
          const cr = App.sides.creases[pc.to];
          line(this.rp(cr.a), this.rp(cr.b), '#111', [lw * 1.2, lw * 1.2], lw * 1.2);
        }
      }
      void plan; void st;
    },
    drawDone() {
      const c = $('stepCanvas');
      if (!fitCanvas(c)) return false;
      const g = c.getContext('2d');
      g.clearRect(0, 0, c.width, c.height);
      const cam = R.makeCamera({ tilt: 0.42, dist: 7, scale: Math.min(c.width, c.height) * 0.38, cx: c.width / 2, cy: c.height / 2 });
      const st = App.A.graph.nodes[App.A.plan.targetNode].state;
      R.drawScene(g, cam, addShading(stateItems(st, [0, 0, 0], flatVerts())), { sortByDepth: true });
      return false;
    },
    draw(now) {
      const st = this.list[this.i];
      if (!st) return;
      const animating = st.anim && now - this.t0 < st.anim + 50;
      if (!animating && !this.dirty) return;
      this.dirty = false;
      this.frame(now);
      if (st.anim && now - this.t0 >= st.anim && this.auto) {
        this.auto = false;
        setTimeout(() => { if (this.i < this.list.length - 1) this.go(this.i + 1, true); }, 500);
      }
    },
    init() {
      $('stepPrev').onclick = () => this.go(this.i - 1, false);
      $('stepNext').onclick = () => this.go(this.i + 1, true);
      $('stepPlay').onclick = () => this.go(this.i, true);
      $('stepRange').oninput = (e) => this.go(+e.target.value, false);
      $('stepTilt').oninput = () => { this.dirty = true; };
      $('goSim').onclick = () => setTab('sim');
      document.addEventListener('keydown', (e) => {
        if (App.tab !== 'steps' || e.target.tagName === 'INPUT') return;
        if (e.key === 'ArrowRight') this.go(this.i + 1, true);
        if (e.key === 'ArrowLeft') this.go(this.i - 1, false);
      });
    },
  };

  // ------------------------------------------------------------------
  // tabs, language, main loop
  function setTab(name) {
    App.tab = name;
    document.querySelectorAll('.tabs button').forEach((b) => b.classList.toggle('active', b.dataset.tab === name));
    document.querySelectorAll('.tab-panel').forEach((p) => p.classList.toggle('active', p.id === 'tab-' + name));
    if (name === 'print') Print.render();
    if (name === 'images') { Editor.draw(); EarthUI.draw(); }
    if (name === 'explain') Explain.show();
    Sim.dirty = true; Steps.dirty = true;
    if (name === 'sim') { Sim.updateUI(); }
  }
  function applyLang() {
    I.setLang(I.lang);
    $('langBtn').textContent = I.lang === 'ja' ? 'English' : '日本語';
    buildVariantSelect();
    renderFaceGrid();
    EarthUI.fillPlaces();
    Editor.select(App.sel);
    renderGallery();
    Explain.invalidate();
    Steps.renderList();
    Steps.go(Steps.i, false);
    Sim.updateUI();
    Print.dirty = true;
    if (App.tab === 'print') Print.render();
  }

  function loop(now) {
    if (App.tab === 'sim') Sim.draw(now);
    if (App.tab === 'steps') Steps.draw(now);
    requestAnimationFrame(loop);
  }

  const Explain = window.makeExplain({ App, specFor, fitCanvas, eventPos, earthLabel });

  function init() {
    let n = 6, vid = '6';
    try {
      const saved = JSON.parse(localStorage.getItem('hexaflex-variant') || 'null');
      if (saved && D.PRESETS[saved.n]) { n = saved.n; vid = saved.vid; }
    } catch (e) { /* ignore */ }
    App.n = n;
    buildFaceCountSelect();
    Editor.init();
    EarthUI.init();
    EarthUI.fillPlaces();
    Sim.init();
    Graph.init();
    Steps.init();
    $('faceCount').onchange = (e) => { const n2 = +e.target.value; loadVariant(n2, D.PRESETS[n2][0].id); applyLang(); };
    $('variant').onchange = (e) => { loadVariant(App.n, e.target.value); };
    $('langBtn').onclick = () => { I.setLang(I.lang === 'ja' ? 'en' : 'ja'); applyLang(); };
    document.querySelectorAll('.tabs button').forEach((b) => { b.onclick = () => setTab(b.dataset.tab); });
    const fi = $('fileInput');
    fi.onchange = () => { addFiles([...fi.files]); fi.value = ''; };
    const dz = $('dropZone');
    ['dragenter', 'dragover'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.add('over'); }));
    ['dragleave', 'drop'].forEach((ev) => dz.addEventListener(ev, (e) => { e.preventDefault(); dz.classList.remove('over'); }));
    dz.addEventListener('drop', (e) => { addFiles([...e.dataTransfer.files]); });
    document.addEventListener('paste', (e) => {
      const files = [...(e.clipboardData ? e.clipboardData.files : [])];
      if (files.length) addFiles(files);
    });
    $('autoAssign').onclick = autoAssign;
    ['triSize', 'showNumbers', 'showFolds'].forEach((id) => $(id).addEventListener('change', () => {
      Print.invalidate();
      if (id === 'triSize') Steps.build();
    }));
    $('printBtn').onclick = () => Print.print();
    $('printMode').onchange = (e) => Print.setMode(e.target.value);
    window.addEventListener('resize', () => { Editor.draw(); EarthUI.draw(); Explain.resize(); Sim.dirty = true; Steps.dirty = true; Graph.draw(); });
    loadVariant(n, vid);
    $('faceCount').value = App.n;
    applyLang();
    requestAnimationFrame(loop);
    window.HexApp = { App, Sim, Steps, Print, Graph, Editor, EarthUI, Explain };
  }
  init();
})();
