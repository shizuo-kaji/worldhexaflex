/*
 * "How the map works" tab: a visual explanation of conformal maps,
 * the stereographic projection and the Schwarz–Christoffel map.
 */
(function (root) {
  'use strict';
  const E = root.Earth, I = root.I18N;
  const DEG = Math.PI / 180;
  const t = (k, v) => I.t(k, v);
  const $ = (id) => document.getElementById(id);

  root.makeExplain = function (ctx) {
    const { App, specFor, fitCanvas, eventPos, earthLabel } = ctx;

    // ---------------------------------------------------------- geometry
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const crossv = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const norm = (a) => { const L = Math.hypot(a[0], a[1], a[2]); return [a[0] / L, a[1] / L, a[2] / L]; };
    // circle of angular radius al around unit vector u
    function sphCircle(u, al, n = 48) {
      const a = norm(Math.abs(u[2]) < 0.9 ? crossv(u, [0, 0, 1]) : crossv(u, [1, 0, 0])), b = crossv(u, a);
      const out = [];
      for (let k = 0; k <= n; k++) {
        const th = (k / n) * 2 * Math.PI, c = Math.cos(th), s = Math.sin(th);
        out.push([0, 1, 2].map((i) => Math.cos(al) * u[i] + Math.sin(al) * (c * a[i] + s * b[i])));
      }
      return out;
    }
    // short arcs through p towards north and east (to show right angles)
    function sphCross(p, len, n = 16) {
      const ll = E.toLatLon(p), la = ll[0] * DEG, lo = ll[1] * DEG;
      const nd = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)], ed = [-Math.sin(lo), Math.cos(lo), 0];
      return [nd, ed].map((d) => {
        const arc = [];
        for (let k = 0; k <= n; k++) { const s = ((k / n) * 2 - 1) * len; arc.push([0, 1, 2].map((i) => Math.cos(s) * p[i] + Math.sin(s) * d[i])); }
        return arc;
      });
    }

    // the three panels: pixel <-> point on the sphere
    function panels(F) {
      const globe = {
        id: 'exGlobe',
        toS(u, v) { // u, v in [-1, 1], y up
          const r2 = u * u + v * v;
          if (r2 >= 1) return null;
          const x = u * F.cr + v * F.sr, y = -u * F.sr + v * F.cr, z = Math.sqrt(1 - r2);
          return [0, 1, 2].map((i) => z * F.c[i] + x * F.e[i] + y * F.n[i]);
        },
        fromS(p) {
          if (dot(p, F.c) < 0) return null;
          const x = dot(p, F.e), y = dot(p, F.n);
          return [x * F.cr - y * F.sr, x * F.sr + y * F.cr];
        },
      };
      const disk = {
        id: 'exDisk',
        toS(u, v) { return u * u + v * v < 1 ? E.diskToSphere([u, v], F) : null; },
        fromS(p) { const z = E.sphereToDisk(p, F); return z && z[0] * z[0] + z[1] * z[1] <= 1.0001 ? z : null; },
      };
      const hex = {
        id: 'exHex',
        toS(u, v) {
          const th = Math.atan2(v, u);
          if (Math.hypot(u, v) > E.hexRadius(th)) return null;
          return E.diskToSphere(E.hexToDisk([u, v]), F);
        },
        fromS(p) { const z = disk.fromS(p); return z ? E.diskToHex(z) : null; },
      };
      return [globe, disk, hex];
    }

    // ---------------------------------------------------------- state
    const Ex = {
      dirty: true, spec: null, choice: '', hover: null, tissot: true, base: {},
      invalidate() { this.dirty = true; this.base = {}; if (App.tab === 'explain') this.render(); },
      // the place shown: a face of the flexagon or a preset place
      pickSpec() {
        const v = this.choice;
        if (v.startsWith('face')) {
          const i = +v.slice(4), sp = App.specs[i];
          if (sp && sp.earth && i < App.n) return { ...sp };
        }
        if (v.startsWith('place:')) {
          const r = E.PLACES.concat(E.REGIONS).find((x) => x[0] === v.slice(6));
          if (r) return { earth: true, lat: r[3], lon: r[4], R: +$('exR').value, rot: 0, place: r[0] };
        }
        // default: the selected face if it is a globe, else the first globe face, else Kyoto
        const order = [App.sel].concat([...Array(App.n).keys()]);
        for (const i of order) { const sp = App.specs[i]; if (sp && sp.earth) { this.choice = 'face' + i; return { ...sp }; } }
        this.choice = 'place:kyoto';
        return { earth: true, lat: 35.01, lon: 135.77, R: 90, rot: 0, place: 'kyoto' };
      },
      fillSelect() {
        const sel = $('exPlace');
        sel.innerHTML = '';
        for (let i = 0; i < App.n; i++) {
          const sp = App.specs[i];
          if (!sp || !sp.earth) continue;
          const o = document.createElement('option');
          o.value = 'face' + i; o.textContent = t('faceN', { n: i + 1 }) + ' — ' + earthLabel(sp);
          sel.appendChild(o);
        }
        if (this.choice === 'custom' && this.spec) {
          const o = document.createElement('option');
          o.value = 'custom'; o.textContent = earthLabel(this.spec) + ` (${Math.round(this.spec.R)}°)`;
          sel.appendChild(o);
        }
        const og = document.createElement('optgroup');
        og.label = t('cities');
        for (const r of E.REGIONS.concat(E.PLACES)) {
          const o = document.createElement('option');
          o.value = 'place:' + r[0]; o.textContent = I.lang === 'ja' ? r[1] : r[2];
          og.appendChild(o);
        }
        sel.appendChild(og);
        sel.value = this.choice;
      },
      render() {
        if (App.tab !== 'explain') return;
        this.spec = this.pickSpec();
        this.fillSelect();
        $('exR').value = Math.round(this.spec.R);
        $('exRval').textContent = Math.round(this.spec.R) + '°';
        this.F = E.frame(this.spec);
        this.P = panels(this.F);
        this.drawPanels();
        SC.draw();
        this.dirty = false;
      },
      baseImage(id, w) {
        const key = id + ':' + w + ':' + JSON.stringify([this.spec.lat, this.spec.lon, this.spec.R, this.spec.rot, App.earthOpts.grid]);
        if (this.base[id] && this.base[id].key === key) return this.base[id].img;
        let img;
        if (id === 'exGlobe') img = E.renderGlobe(w, this.spec, { step: 15, grid: App.earthOpts.grid });
        else if (id === 'exDisk') img = E.renderDisk(w, { ...this.spec, grid: App.earthOpts.grid });
        else { img = document.createElement('canvas'); E.renderFace(img, { ...this.spec, grid: App.earthOpts.grid, mark: false }); }
        this.base[id] = { key, img };
        return img;
      },
      drawPanels() {
        this.layers = this.layers || {};
        for (const P of this.P) {
          const c = $(P.id);
          if (!fitCanvas(c)) continue;
          const W = c.width, rad = W * 0.46, cx = W / 2, cy = W / 2;
          const dpr = W / c.getBoundingClientRect().width;
          // static layer (picture, outlines, small circles) is cached; the pointer is drawn on top
          const lkey = [W, this.tissot, this.spec.lat, this.spec.lon, this.spec.R, this.spec.rot, App.earthOpts.grid].join(':');
          let L = this.layers[P.id];
          const fresh = !L || L.key !== lkey;
          if (fresh) { L = this.layers[P.id] = { key: lkey, c: document.createElement('canvas') }; L.c.width = L.c.height = W; }
          const out = c.getContext('2d');
          const g = fresh ? L.c.getContext('2d') : out;
          if (fresh) {
          g.clearRect(0, 0, W, W);
          const img = this.baseImage(P.id, Math.round(rad * 2));
          if (P.id === 'exHex') {
            g.save(); root.Render.hexPath(g, cx, cy, rad); g.clip();
            const s = rad / root.Render.TR;
            g.drawImage(img, cx - (root.Render.TEX / 2) * s, cy - (root.Render.TEX / 2) * s, root.Render.TEX * s, root.Render.TEX * s);
            g.restore();
          } else {
            g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 2 * Math.PI); g.clip();
            g.drawImage(img, cx - rad, cy - rad, rad * 2, rad * 2);
            g.restore();
          }
          const toPx = (q) => [cx + q[0] * rad, cy - q[1] * rad];
          const poly = (pts, style, width, dash, fill) => {
            g.save();
            g.strokeStyle = style; g.lineWidth = width * dpr; g.setLineDash((dash || []).map((d) => d * dpr)); g.lineJoin = 'round';
            g.beginPath();
            let pen = false;
            for (const p of pts) {
              const q = P.fromS(p);
              if (!q) { pen = false; continue; }
              const X = toPx(q);
              if (pen) g.lineTo(X[0], X[1]); else g.moveTo(X[0], X[1]);
              pen = true;
            }
            if (fill) { g.fillStyle = fill; g.fill(); }
            g.stroke();
            g.restore();
          };
          // outline of the region that becomes the hexagon, its corners and cut lines
          const F = this.F;
          const rim = [], cuts = [[], [], []];
          for (let k = 0; k <= 144; k++) { const a = (k / 144) * 2 * Math.PI; rim.push(E.diskToSphere([Math.cos(a) * 0.9995, Math.sin(a) * 0.9995], F)); }
          for (let j = 0; j < 3; j++) {
            const a = (90 - 60 * j) * DEG;
            for (let k = 0; k <= 40; k++) { const s = (k / 40) * 2 - 1; cuts[j].push(E.diskToSphere([s * Math.cos(a) * 0.999, s * Math.sin(a) * 0.999], F)); }
          }
          for (const cl of cuts) poly(cl, 'rgba(255,255,255,0.85)', 1.2, [5, 4]);
          poly(rim, '#ffcf33', 2.2);
          for (let k = 0; k < 6; k++) {
            const a = (90 - 60 * k) * DEG;
            const q = P.fromS(E.diskToSphere([Math.cos(a) * 0.9995, Math.sin(a) * 0.9995], F));
            if (!q) continue;
            const X = toPx(q);
            g.beginPath(); g.arc(X[0], X[1], 4.5 * dpr, 0, 2 * Math.PI);
            g.fillStyle = '#e0242b'; g.fill(); g.lineWidth = 1.5 * dpr; g.strokeStyle = '#fff'; g.stroke();
          }
          if (P.id === 'exGlobe') { g.beginPath(); g.arc(cx, cy, rad, 0, 2 * Math.PI); g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = dpr; g.stroke(); }
          // small circles spread over the globe (Tissot's indicatrix)
          if (this.tissot) {
            const al = (this.spec.R / 90) * 4.5 * DEG;
            for (let la = -75; la <= 75; la += 30) {
              const n = Math.max(1, Math.round(12 * Math.cos(la * DEG)));
              for (let k = 0; k < n; k++) {
                const lo = -180 + (k + 0.5) * (360 / n);
                const u = E.vec(la * DEG, lo * DEG);
                if (dot(u, F.c) < Math.cos(Math.min(this.spec.R * 0.97, 175) * DEG) && P.id !== 'exGlobe') continue;
                poly(sphCircle(u, al, 32), 'rgba(255,80,40,0.95)', 1.4, null, 'rgba(255,120,60,0.35)');
              }
            }
          }
          }
          out.clearRect(0, 0, W, W);
          out.drawImage(L.c, 0, 0);
          // the point under the pointer, in all three panels
          if (this.hover) {
            const p = this.hover, al = (this.spec.R / 90) * 7 * DEG;
            const poly = (pts, style, width) => {
              out.save();
              out.strokeStyle = style; out.lineWidth = width * dpr; out.lineJoin = 'round';
              out.beginPath();
              let pen = false;
              for (const q0 of pts) {
                const q = P.fromS(q0);
                if (!q) { pen = false; continue; }
                const X = [cx + q[0] * rad, cy - q[1] * rad];
                if (pen) out.lineTo(X[0], X[1]); else out.moveTo(X[0], X[1]);
                pen = true;
              }
              out.stroke();
              out.restore();
            };
            poly(sphCircle(p, al, 48), '#fff', 3.2);
            poly(sphCircle(p, al, 48), '#7a3cff', 2);
            for (const arc of sphCross(p, al * 1.6)) { poly(arc, '#fff', 3.6); poly(arc, '#111', 1.8); }
          }
        }
        const lbl = $('exHoverInfo');
        if (this.hover) {
          const ll = E.toLatLon(this.hover);
          lbl.textContent = t('exHere', { p: (Math.abs(ll[0]).toFixed(1) + (ll[0] >= 0 ? '°N ' : '°S ') + Math.abs(ll[1]).toFixed(1) + (ll[1] >= 0 ? '°E' : '°W')) });
        } else lbl.textContent = t('exHover');
      },
      pointer(id, e) {
        const P = this.P && this.P.find((x) => x.id === id);
        if (!P) return;
        const c = $(id), p = eventPos(c, e), W = c.width, rad = W * 0.46;
        this.hover = P.toS((p[0] - W / 2) / rad, -(p[1] - W / 2) / rad);
        this.drawPanels();
      },
      init() {
        for (const id of ['exGlobe', 'exDisk', 'exHex']) {
          const c = $(id);
          c.addEventListener('pointermove', (e) => this.pointer(id, e));
          c.addEventListener('pointerdown', (e) => this.pointer(id, e));
          c.addEventListener('pointerleave', () => { this.hover = null; if (this.P) this.drawPanels(); });
        }
        $('exPlace').onchange = (e) => { this.choice = e.target.value; this.base = {}; this.render(); };
        $('exR').oninput = (e) => {
          // a preset place gets its own range; a face keeps its own setting
          if (!this.choice.startsWith('place:')) {
            const sp = this.spec;
            this.choice = 'custom';
            this.spec = { ...sp, R: +e.target.value };
          } else this.spec.R = +e.target.value;
          $('exRval').textContent = e.target.value + '°';
          this.F = E.frame(this.spec); this.P = panels(this.F);
          this.drawPanels();
        };
        $('exTissot').onchange = (e) => { this.tissot = e.target.checked; this.drawPanels(); };
        SC.init();
      },
    };
    // keep a custom range for a face without touching the face itself
    const pick0 = Ex.pickSpec.bind(Ex);
    Ex.pickSpec = function () { return this.choice === 'custom' && this.spec ? this.spec : pick0(); };

    // ---------------------------------------------------------- SC playground
    const SC = {
      N: 6, bend: 1, cache: new Map(), hover: null, anim: null,
      beta() { return (this.bend * 2) / this.N; },
      f(z) { return E.scMap(z[0], z[1], this.N, Math.min(0.95, this.beta()), 4000); },
      // inverse by Newton's method (for pointing at the right picture)
      finv(w) {
        const N = this.N, b = Math.min(0.95, this.beta()), nm = E.scNorm(N, b);
        let z = [w[0] * 0.9, w[1] * 0.9];
        for (let it = 0; it < 60; it++) {
          const fz = this.f(z);
          // f'(z) = (1 - z^N)^(-b) / nm
          const r = Math.hypot(z[0], z[1]), th = Math.atan2(z[1], z[0]);
          const zn = [Math.pow(r, N) * Math.cos(N * th), Math.pow(r, N) * Math.sin(N * th)];
          const one = [1 - zn[0], -zn[1]], m = Math.pow(Math.hypot(one[0], one[1]), -b) / nm, a = -b * Math.atan2(one[1], one[0]);
          const d = [m * Math.cos(a), m * Math.sin(a)];
          const e = [fz[0] - w[0], fz[1] - w[1]];
          const dd = d[0] * d[0] + d[1] * d[1];
          let step = [(e[0] * d[0] + e[1] * d[1]) / dd, (e[1] * d[0] - e[0] * d[1]) / dd];
          const sl = Math.hypot(step[0], step[1]);
          if (sl > 0.2) step = [step[0] * 0.2 / sl, step[1] * 0.2 / sl];
          z = [z[0] - step[0], z[1] - step[1]];
          const rz = Math.hypot(z[0], z[1]);
          if (rz > 0.999) z = [z[0] * 0.999 / rz, z[1] * 0.999 / rz];
          if (Math.hypot(e[0], e[1]) < 1e-7) break;
        }
        return Math.hypot(this.f(z)[0] - w[0], this.f(z)[1] - w[1]) < 1e-3 ? z : null;
      },
      cells() {
        const key = this.N + ':' + this.bend.toFixed(3);
        if (this.cache.has(key)) return this.cache.get(key);
        // log-polar grid: every cell is a little "square", so the picture shows
        // that small squares stay squares under a conformal map
        const NS = 4 * this.N, q = Math.exp((-2 * Math.PI) / NS), sub = 6, out = [];
        let NRg = 0;
        while (Math.pow(q, NRg) > 0.06) NRg++;
        for (let i = 0; i < NRg; i++) for (let j = 0; j < NS; j++) {
          const r1 = Math.min(0.999, Math.pow(q, NRg - 1 - i)), r0 = i === 0 ? 0 : Math.pow(q, NRg - i), a0 = (j / NS) * 2 * Math.PI, a1 = ((j + 1) / NS) * 2 * Math.PI;
          const z = [];
          for (let k = 0; k <= sub; k++) { const a = a0 + (a1 - a0) * (k / sub); z.push([r1 * Math.cos(a), r1 * Math.sin(a)]); }
          for (let k = sub; k >= 0; k--) { const a = a0 + (a1 - a0) * (k / sub); z.push([r0 * Math.cos(a), r0 * Math.sin(a)]); }
          out.push({ i, j, z, w: z.map((p) => this.f(p)) });
        }
        if (this.cache.size > 60) this.cache.clear();
        this.cache.set(key, out);
        return out;
      },
      draw() {
        const cells = this.cells();
        for (const id of ['scDisk', 'scImg']) {
          const c = $(id);
          if (!fitCanvas(c)) continue;
          const g = c.getContext('2d');
          const W = c.width, rad = W * 0.43, cx = W / 2, cy = W / 2, dpr = W / c.getBoundingClientRect().width;
          g.clearRect(0, 0, W, W);
          const tp = (q) => [cx + q[0] * rad, cy - q[1] * rad];
          for (const cell of cells) {
            const pts = (id === 'scDisk' ? cell.z : cell.w).map(tp);
            g.beginPath();
            pts.forEach((p, k) => (k ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])));
            g.closePath();
            const odd = (cell.i + cell.j) % 2;
            const lt = 60 + cell.i * 1.6;
            g.fillStyle = odd ? `hsl(205, 60%, ${lt - 18}%)` : `hsl(38, 90%, ${lt}%)`;
            g.fill();
          }
          // corners (prevertices / vertices)
          for (let k = 0; k < this.N; k++) {
            const a = (k / this.N) * 2 * Math.PI, z = [Math.cos(a), Math.sin(a)];
            const p = tp(id === 'scDisk' ? z : this.f([z[0] * 0.9999, z[1] * 0.9999]));
            g.beginPath(); g.arc(p[0], p[1], 4.5 * dpr, 0, 2 * Math.PI);
            g.fillStyle = '#e0242b'; g.fill(); g.lineWidth = 1.5 * dpr; g.strokeStyle = '#fff'; g.stroke();
          }
          if (this.hover) {
            const z = this.hover, rr = 0.07;
            const circ = [], c1 = [], c2 = [];
            for (let k = 0; k <= 40; k++) { const a = (k / 40) * 2 * Math.PI; circ.push([z[0] + rr * Math.cos(a), z[1] + rr * Math.sin(a)]); }
            for (let k = -8; k <= 8; k++) { c1.push([z[0] + (k / 8) * rr * 1.5, z[1]]); c2.push([z[0], z[1] + (k / 8) * rr * 1.5]); }
            const map = (L) => (id === 'scDisk' ? L : L.map((p) => (Math.hypot(p[0], p[1]) < 0.9995 ? this.f(p) : null)));
            const line = (L, col, w) => {
              g.beginPath(); let pen = false;
              for (const q of map(L)) { if (!q) { pen = false; continue; } const p = tp(q); if (pen) g.lineTo(p[0], p[1]); else g.moveTo(p[0], p[1]); pen = true; }
              g.strokeStyle = col; g.lineWidth = w * dpr; g.stroke();
            };
            line(circ, '#fff', 4); line(circ, '#7a3cff', 2.2);
            for (const L of [c1, c2]) { line(L, '#fff', 3.6); line(L, '#111', 1.8); }
          }
        }
        const b = this.beta();
        $('scInfo').innerHTML = t('scInfo', { b: b.toFixed(3), a: Math.round((1 - b) * 180) });
        $('scFormula').innerHTML = `f(z) = ∫<sub>0</sub><sup>z</sup> (1 − t<sup>${this.N}</sup>)<sup>−${b.toFixed(3)}</sup> dt`;
        $('scNval').textContent = this.N;
      },
      pointer(id, e) {
        const c = $(id), p = eventPos(c, e), W = c.width, rad = W * 0.43;
        const q = [(p[0] - W / 2) / rad, -(p[1] - W / 2) / rad];
        if (id === 'scDisk') this.hover = Math.hypot(q[0], q[1]) < 0.995 ? q : null;
        else this.hover = this.finv(q);
        this.draw();
      },
      init() {
        for (const id of ['scDisk', 'scImg']) {
          const c = $(id);
          c.addEventListener('pointermove', (e) => this.pointer(id, e));
          c.addEventListener('pointerdown', (e) => this.pointer(id, e));
          c.addEventListener('pointerleave', () => { this.hover = null; this.draw(); });
        }
        // keep beta <= 0.75: beyond that the star's arms only reach their tips in the limit
        const capBend = () => {
          const mx = Math.min(1.4, (0.75 * this.N) / 2);
          $('scBend').max = mx;
          if (this.bend > mx) { this.bend = mx; $('scBend').value = mx; }
        };
        $('scN').oninput = (e) => { this.N = +e.target.value; capBend(); this.draw(); };
        $('scBend').oninput = (e) => { this.bend = +e.target.value; this.draw(); };
        $('scPlay').onclick = () => {
          const t0 = performance.now();
          cancelAnimationFrame(this.anim);
          const step = (now) => {
            const u = Math.min(1, (now - t0) / 2600);
            this.bend = Math.round(u * 100) / 100;
            $('scBend').value = this.bend;
            this.draw();
            if (u < 1) this.anim = requestAnimationFrame(step);
          };
          this.anim = requestAnimationFrame(step);
        };
      },
    };

    Ex.init();
    return {
      invalidate: () => Ex.invalidate(),
      show: () => { Ex.dirty = true; Ex.render(); },
      resize: () => { if (App.tab === 'explain') { Ex.drawPanels(); SC.draw(); } },
    };
  };
})(window);
