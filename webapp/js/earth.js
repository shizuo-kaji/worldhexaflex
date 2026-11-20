/*
 * Earth faces: a cap of the globe is mapped conformally onto the hexagon.
 *
 *   sphere --(stereographic projection)--> unit disk --(Schwarz–Christoffel)--> hexagon
 *
 * Both steps preserve angles, so meridians and parallels still cross at right
 * angles and small circles stay circles (only their size changes).  The only
 * exceptions are the six corners of the hexagon.
 */
(function (root) {
  'use strict';
  const R = root.Render;
  const TEX = R.TEX, TR = R.TR;
  const DEG = Math.PI / 180;

  // ---------------------------------------------------------------- math
  function gamma(x) { // Lanczos approximation
    if (x < 0.5) return Math.PI / (Math.sin(Math.PI * x) * gamma(1 - x));
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
      -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    x -= 1;
    let a = c[0];
    const tt = x + g + 0.5;
    for (let i = 1; i < 9; i++) a += c[i] / (x + i);
    return Math.sqrt(2 * Math.PI) * Math.pow(tt, x + 0.5) * Math.exp(-tt) * a;
  }

  /*
   * Schwarz–Christoffel map of the unit disk:
   *   f(z) = ∫_0^z (1 - t^N)^(-beta) dt = z · Σ_k (beta)_k / k! · z^{Nk} / (Nk + 1)
   * normalised so that f(1) = 1.  beta = 2/N gives the regular N-gon whose
   * corners are at the N-th roots of unity (prevertex = vertex).
   */
  const normCache = new Map();
  function scNorm(N, beta) {
    const key = N + ':' + beta;
    if (!normCache.has(key)) normCache.set(key, gamma(1 / N) * gamma(1 - beta) / (N * gamma(1 / N + 1 - beta)));
    return normCache.get(key);
  }
  function scMap(x, y, N = 6, beta = 1 / 3, maxTerms = 6000) {
    const r = Math.hypot(x, y);
    if (r < 1e-12) return [x / scNorm(N, beta), y / scNorm(N, beta)];
    const th = Math.atan2(y, x);
    const rN = Math.pow(Math.min(r, 1), N), cN = Math.cos(N * th), sN = Math.sin(N * th);
    let a = 1, wr = 1, wi = 0, mag = 1, sr = 1, si = 0;
    for (let k = 1; k < maxTerms; k++) {
      a *= (k - 1 + beta) / k;
      const nr = (wr * cN - wi * sN) * rN, ni = (wr * sN + wi * cN) * rN;
      wr = nr; wi = ni; mag *= rN;
      const c = a / (N * k + 1);
      sr += c * wr; si += c * wi;
      if (c * mag < 1e-9) break;
    }
    const nm = scNorm(N, beta);
    return [(x * sr - y * si) / nm, (x * si + y * sr) / nm];
  }

  // hexagon of the texture: corners at 30° + 60°k  (rotate the N=6 map by 30°)
  const ROT30 = [Math.cos(30 * DEG), Math.sin(30 * DEG)];
  const rotC = (p, c, s) => [p[0] * c - p[1] * s, p[0] * s + p[1] * c];
  function diskToHex(z) {
    const z0 = rotC(z, ROT30[0], -ROT30[1]);
    return rotC(scMap(z0[0], z0[1]), ROT30[0], ROT30[1]);
  }
  // radius of the unit hexagon (corners at 30° + 60°k) in direction th
  function hexRadius(th) {
    let a = (((th / DEG) % 60) + 60) % 60; // distance from an edge midpoint (0°, 60°, ...)
    if (a > 30) a = 60 - a;
    return (Math.sqrt(3) / 2) / Math.cos(a * DEG);
  }

  // ------------------------------------------------- inverse map lookup table
  // LUT[pixel] = disk point z with diskToHex(z) = hexagon point of that pixel
  let LUT = null;
  function buildLUT() {
    if (LUT) return LUT;
    const zx = new Float32Array(TEX * TEX), zy = new Float32Array(TEX * TEX);
    const ok = new Uint8Array(TEX * TEX);
    // polar mesh of the sector 0..30° (between a corner and an edge midpoint)
    const NR = 170, NA = 36;
    const mz = [], mw = [];
    for (let j = 0; j <= NR; j++) {
      const s = j / NR;
      const r = 1 - (1 - s) * (1 - s); // denser near the rim
      const rowZ = [], rowW = [];
      for (let i = 0; i <= NA; i++) {
        const th = (i / NA) * 30 * DEG;
        const z = [r * Math.cos(th), r * Math.sin(th)];
        rowZ.push(z);
        rowW.push(r === 0 ? [0, 0] : scMap(z[0], z[1]));
      }
      mz.push(rowZ); mw.push(rowW);
    }
    const toPx = (w) => [TEX / 2 + w[0] * TR, TEX / 2 - w[1] * TR];
    function rasterTri(P, Z) {
      const x0 = Math.max(0, Math.floor(Math.min(P[0][0], P[1][0], P[2][0]))), x1 = Math.min(TEX - 1, Math.ceil(Math.max(P[0][0], P[1][0], P[2][0])));
      const y0 = Math.max(0, Math.floor(Math.min(P[0][1], P[1][1], P[2][1]))), y1 = Math.min(TEX - 1, Math.ceil(Math.max(P[0][1], P[1][1], P[2][1])));
      const den = (P[1][1] - P[2][1]) * (P[0][0] - P[2][0]) + (P[2][0] - P[1][0]) * (P[0][1] - P[2][1]);
      if (Math.abs(den) < 1e-12) return;
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
        const px = x + 0.5, py = y + 0.5;
        const l0 = ((P[1][1] - P[2][1]) * (px - P[2][0]) + (P[2][0] - P[1][0]) * (py - P[2][1])) / den;
        const l1 = ((P[2][1] - P[0][1]) * (px - P[2][0]) + (P[0][0] - P[2][0]) * (py - P[2][1])) / den;
        const l2 = 1 - l0 - l1;
        if (l0 < -1e-6 || l1 < -1e-6 || l2 < -1e-6) continue;
        const k = y * TEX + x;
        zx[k] = l0 * Z[0][0] + l1 * Z[1][0] + l2 * Z[2][0];
        zy[k] = l0 * Z[0][1] + l1 * Z[1][1] + l2 * Z[2][1];
        ok[k] = 1;
      }
    }
    // 12 symmetric copies: rotations by 60°k, with and without reflection
    for (let k = 0; k < 6; k++) for (const refl of [false, true]) {
      const a = (k * 60 + 30) * DEG, c = Math.cos(a), s = Math.sin(a);
      const T = (p) => { const q = refl ? [p[0], -p[1]] : p; return rotC(q, c, s); };
      for (let j = 0; j < NR; j++) for (let i = 0; i < NA; i++) {
        const quad = [[j, i], [j + 1, i], [j + 1, i + 1], [j, i + 1]];
        for (const tri of [[0, 1, 2], [0, 2, 3]]) {
          const P = tri.map((q) => toPx(T(mw[quad[q][0]][quad[q][1]])));
          const Z = tri.map((q) => T(mz[quad[q][0]][quad[q][1]]));
          rasterTri(P, Z);
        }
      }
    }
    // pixels outside the hexagon (used by the slightly enlarged triangle clips):
    // copy the value of the boundary point in the same direction
    for (let y = 0; y < TEX; y++) for (let x = 0; x < TEX; x++) {
      const k = y * TEX + x;
      if (ok[k]) continue;
      const u = (x + 0.5 - TEX / 2) / TR, v = -(y + 0.5 - TEX / 2) / TR;
      const th = Math.atan2(v, u);
      let rr = hexRadius(th) * 0.995;
      for (let it = 0; it < 40; it++, rr *= 0.995) {
        const bx = Math.round(TEX / 2 + rr * Math.cos(th) * TR - 0.5), by = Math.round(TEX / 2 - rr * Math.sin(th) * TR - 0.5);
        const kb = by * TEX + bx;
        if (bx >= 0 && by >= 0 && bx < TEX && by < TEX && ok[kb] === 1) { zx[k] = zx[kb]; zy[k] = zy[kb]; ok[k] = 2; break; }
      }
    }
    LUT = { zx, zy, ok };
    return LUT;
  }
  // hexagon point (unit coordinates) -> disk point (bilinear lookup)
  function hexToDisk(w) {
    const L = buildLUT();
    const fx = TEX / 2 + w[0] * TR - 0.5, fy = TEX / 2 - w[1] * TR - 0.5;
    const x0 = Math.max(0, Math.min(TEX - 2, Math.floor(fx))), y0 = Math.max(0, Math.min(TEX - 2, Math.floor(fy)));
    const ax = Math.min(1, Math.max(0, fx - x0)), ay = Math.min(1, Math.max(0, fy - y0));
    const k = y0 * TEX + x0;
    const bl = (A) => (A[k] * (1 - ax) + A[k + 1] * ax) * (1 - ay) + (A[k + TEX] * (1 - ax) + A[k + TEX + 1] * ax) * ay;
    return [bl(L.zx), bl(L.zy)];
  }

  // ---------------------------------------------------------- sphere <-> disk
  const vec = (lat, lon) => [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  function frame(spec) {
    const la = spec.lat * DEG, lo = spec.lon * DEG;
    return {
      c: vec(la, lo),
      e: [-Math.sin(lo), Math.cos(lo), 0],
      n: [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)],
      t: Math.tan(Math.min(179, Math.max(1, spec.R || 90)) * DEG / 2),
      cr: Math.cos(spec.rot || 0), sr: Math.sin(spec.rot || 0),
    };
  }
  // disk point -> unit vector (inverse stereographic projection from the antipode)
  function diskToSphere(z, F) {
    const x = z[0] * F.cr + z[1] * F.sr, y = -z[0] * F.sr + z[1] * F.cr; // undo the rotation
    const s2 = F.t * F.t * (x * x + y * y), k = 1 / (1 + s2), q = 2 * F.t * k, p0 = (1 - s2) * k;
    return [p0 * F.c[0] + q * (x * F.e[0] + y * F.n[0]), p0 * F.c[1] + q * (x * F.e[1] + y * F.n[1]), p0 * F.c[2] + q * (x * F.e[2] + y * F.n[2])];
  }
  function sphereToDisk(p, F) {
    const pc = p[0] * F.c[0] + p[1] * F.c[1] + p[2] * F.c[2];
    const a = p[0] * F.e[0] + p[1] * F.e[1] + p[2] * F.e[2];
    const b = p[0] * F.n[0] + p[1] * F.n[1] + p[2] * F.n[2];
    const d = (1 + pc) * F.t;
    if (d < 1e-9) return null; // the antipode
    const x = a / d, y = b / d;
    return [x * F.cr - y * F.sr, x * F.sr + y * F.cr];
  }
  const toLatLon = (p) => [Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG, Math.atan2(p[1], p[0]) / DEG];

  // ------------------------------------------------------------- world map
  const W = 4096, H = 2048;
  let world = null; // {mask: Uint8Array} or {rgba: Uint32Array}
  let custom = null;
  function buildWorld() {
    if (world) return world;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    const data = root.WORLD_RINGS;
    const q = data.q;
    const X = (lon) => ((lon + 180) / 360) * W, Y = (lat) => ((90 - lat) / 180) * H;
    const decode = (rg) => {
      const p = rg.p, pts = [];
      let x = p[0], y = p[1];
      pts.push([x * q, y * q]);
      for (let i = 2; i < p.length; i += 2) { x += p[i]; y += p[i + 1]; pts.push([x * q, y * q]); }
      return pts;
    };
    const normal = new Path2D(), polar = new Path2D();
    for (const rg of data.rings) {
      const pts = decode(rg);
      for (const off of [-360, 0, 360]) {
        let mn = Infinity, mx = -Infinity;
        for (const p of pts) { mn = Math.min(mn, p[0] + off); mx = Math.max(mx, p[0] + off); }
        if (mx < -180 || mn > 180) continue;
        const path = rg.polar ? polar : normal;
        path.moveTo(X(pts[0][0] + off), Y(pts[0][1]));
        for (let i = 1; i < pts.length; i++) path.lineTo(X(pts[i][0] + off), Y(pts[i][1]));
        if (rg.polar) {
          const pole = rg.polar > 0 ? 90 : -90;
          path.lineTo(X(pts[pts.length - 1][0] + off), Y(pole));
          path.lineTo(X(pts[0][0] + off), Y(pole));
        }
        path.closePath();
      }
    }
    g.fillStyle = '#fff';
    g.fill(normal, 'evenodd');
    g.fill(polar, 'nonzero');
    const img = g.getImageData(0, 0, W, H).data;
    const mask = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) mask[i] = img[i * 4] > 127 ? 1 : 0;
    world = { mask };
    return world;
  }
  // colours of the built-in map
  const mix = (a, b, s) => a.map((v, i) => Math.round(v + (b[i] - v) * s));
  const OCEAN_EQ = [52, 132, 190], OCEAN_POLE = [38, 92, 142];
  const LAND = [[0, [96, 156, 84]], [18, [140, 162, 92]], [28, [184, 170, 112]], [38, [124, 160, 92]], [55, [104, 140, 92]], [66, [128, 146, 112]], [74, [176, 186, 176]], [82, [236, 240, 242]], [91, [244, 247, 249]]];
  const oceanLUT = [], landLUT = [];
  for (let a = 0; a <= 90; a++) {
    oceanLUT.push(mix(OCEAN_EQ, OCEAN_POLE, Math.pow(a / 90, 1.5)));
    let k = 0;
    while (LAND[k + 1][0] <= a) k++;
    const [a0, c0] = LAND[k], [a1, c1] = LAND[k + 1];
    landLUT.push(mix(c0, c1, (a - a0) / (a1 - a0)));
  }
  const ICE = [242, 245, 247];
  function landColor(lat, lon) {
    if (lat < -60) return ICE;
    if (lat > 59 && lon > -74 && lon < -11) return ICE; // Greenland
    return landLUT[Math.min(90, Math.round(Math.abs(lat)))];
  }

  function setCustomMap(canvas) {
    if (!canvas) { custom = null; return; }
    const c = document.createElement('canvas');
    c.width = W / 2; c.height = H / 2;
    const g = c.getContext('2d');
    g.imageSmoothingQuality = 'high';
    g.drawImage(canvas, 0, 0, c.width, c.height);
    custom = { w: c.width, h: c.height, rgba: new Uint32Array(g.getImageData(0, 0, c.width, c.height).data.buffer.slice(0)) };
  }

  // sample colour [r,g,b] and land flag at lat/lon (degrees)
  function sample(lat, lon) {
    if (custom) {
      let x = Math.floor(((lon + 180) / 360) * custom.w), y = Math.floor(((90 - lat) / 180) * custom.h);
      x = ((x % custom.w) + custom.w) % custom.w; y = Math.max(0, Math.min(custom.h - 1, y));
      const v = custom.rgba[y * custom.w + x];
      return [[v & 255, (v >> 8) & 255, (v >> 16) & 255], -1];
    }
    const wd = buildWorld();
    let x = Math.floor(((lon + 180) / 360) * W), y = Math.floor(((90 - lat) / 180) * H);
    x = ((x % W) + W) % W; y = Math.max(0, Math.min(H - 1, y));
    const land = wd.mask[y * W + x];
    return [land ? landColor(lat, lon) : oceanLUT[Math.min(90, Math.round(Math.abs(lat)))], land];
  }

  function gridStep(Rdeg) {
    const want = (2 * Math.min(Rdeg, 120)) / 8;
    for (const s of [1, 2, 5, 10, 15, 30]) if (s >= want) return s;
    return 30;
  }

  /*
   * Render lat/lon arrays into an RGBA buffer with graticule and coastlines.
   * lat/lon: Float32Array (NaN = background), w × h.
   */
  function paint(buf, lat, lon, w, h, opts) {
    const land = new Int8Array(w * h);
    for (let i = 0; i < w * h; i++) {
      if (Number.isNaN(lat[i])) { land[i] = -2; continue; }
      const [col, l] = sample(lat[i], lon[i]);
      land[i] = l;
      buf[i * 4] = col[0]; buf[i * 4 + 1] = col[1]; buf[i * 4 + 2] = col[2]; buf[i * 4 + 3] = 255;
    }
    const step = opts.step || 15;
    const blend = (i, c, a) => {
      buf[i * 4] += (c[0] - buf[i * 4]) * a; buf[i * 4 + 1] += (c[1] - buf[i * 4 + 1]) * a; buf[i * 4 + 2] += (c[2] - buf[i * 4 + 2]) * a;
    };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (land[i] === -2) continue;
      const nb = [];
      if (x + 1 < w && land[i + 1] !== -2) nb.push(i + 1);
      if (y + 1 < h && land[i + w] !== -2) nb.push(i + w);
      if (opts.coast !== false && land[i] >= 0) {
        for (const j of nb) if (land[j] !== land[i]) { blend(land[i] ? i : j, [40, 60, 50], 0.55); }
      }
      if (opts.grid !== false) {
        const a0 = Math.floor(lat[i] / step), b0 = Math.floor(lon[i] / step);
        for (const j of nb) {
          const la = Math.floor(lat[j] / step), lb = Math.floor(lon[j] / step);
          if (a0 !== la) {
            const eq = Math.max(a0, la) === 0; // the equator in red
            blend(i, eq ? [255, 110, 100] : [255, 255, 255], eq ? 0.8 : 0.45);
          } else if (b0 !== lb && Math.abs(lat[i]) < 88) blend(i, [255, 255, 255], 0.45);
        }
      }
    }
  }

  // ------------------------------------------------------------ face render
  function renderFace(canvas, spec, size = TEX) {
    const Lt = buildLUT();
    canvas.width = TEX; canvas.height = TEX;
    const g = canvas.getContext('2d');
    const F = frame(spec);
    const step = size < TEX ? 2 : 1; // coarse preview while dragging
    const w = TEX / step, h = TEX / step;
    const lat = new Float32Array(w * h), lon = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const k = (y * step) * TEX + x * step;
      const p = diskToSphere([Lt.zx[k], Lt.zy[k]], F);
      const i = y * w + x;
      lat[i] = Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG;
      lon[i] = Math.atan2(p[1], p[0]) / DEG;
    }
    const img = g.createImageData(w, h);
    paint(img.data, lat, lon, w, h, { grid: spec.grid !== false, step: gridStep(spec.R || 90), coast: true });
    if (step === 1) g.putImageData(img, 0, 0);
    else {
      const tmp = document.createElement('canvas');
      tmp.width = w; tmp.height = h;
      tmp.getContext('2d').putImageData(img, 0, 0);
      g.imageSmoothingEnabled = true;
      g.drawImage(tmp, 0, 0, TEX, TEX);
    }
    if (spec.mark !== false) {
      g.beginPath(); g.arc(TEX / 2, TEX / 2, TEX * 0.014, 0, 2 * Math.PI);
      g.fillStyle = '#e0242b'; g.fill();
      g.lineWidth = TEX * 0.006; g.strokeStyle = '#fff'; g.stroke();
    }
    return canvas;
  }

  // the hexagon outline of a face, as lat/lon points (for footprints on maps)
  function faceOutline(spec, per = 24) {
    const F = frame(spec);
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a0 = (90 - 60 * i) * DEG, a1 = (90 - 60 * (i + 1)) * DEG;
      for (let j = 0; j < per; j++) {
        const s = j / per;
        const w = [(Math.cos(a0) * (1 - s) + Math.cos(a1) * s) * 0.995, (Math.sin(a0) * (1 - s) + Math.sin(a1) * s) * 0.995];
        out.push(toLatLon(diskToSphere(hexToDisk(w), F)));
      }
    }
    return out;
  }

  // equirectangular picture of the map (for the place picker)
  function renderMap(w, h) {
    const lat = new Float32Array(w * h), lon = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      lat[y * w + x] = 90 - ((y + 0.5) / h) * 180;
      lon[y * w + x] = -180 + ((x + 0.5) / w) * 360;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d');
    const img = g.createImageData(w, h);
    paint(img.data, lat, lon, w, h, { grid: true, step: 30, coast: true });
    g.putImageData(img, 0, 0);
    return c;
  }

  // orthographic globe picture centred at spec (w × w pixels)
  function renderGlobe(w, spec, opts = {}) {
    const F = frame(spec);
    const lat = new Float32Array(w * w).fill(NaN), lon = new Float32Array(w * w).fill(NaN);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const X0 = ((x + 0.5) / w) * 2 - 1, Y0 = 1 - ((y + 0.5) / w) * 2;
      const r2 = X0 * X0 + Y0 * Y0;
      if (r2 >= 1) continue;
      const X = X0 * F.cr + Y0 * F.sr, Y = -X0 * F.sr + Y0 * F.cr; // same rotation as the face
      const Z = Math.sqrt(1 - r2);
      const p = [Z * F.c[0] + X * F.e[0] + Y * F.n[0], Z * F.c[1] + X * F.e[1] + Y * F.n[1], Z * F.c[2] + X * F.e[2] + Y * F.n[2]];
      lat[y * w + x] = Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG;
      lon[y * w + x] = Math.atan2(p[1], p[0]) / DEG;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = w;
    const g = c.getContext('2d');
    const img = g.createImageData(w, w);
    paint(img.data, lat, lon, w, w, { grid: opts.grid !== false, step: opts.step || 15, coast: true });
    // simple shading towards the limb
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const X = ((x + 0.5) / w) * 2 - 1, Y = 1 - ((y + 0.5) / w) * 2, r2 = X * X + Y * Y;
      if (r2 >= 1) continue;
      const k = 0.55 + 0.45 * Math.sqrt(1 - r2), i = (y * w + x) * 4;
      img.data[i] *= k; img.data[i + 1] *= k; img.data[i + 2] *= k;
    }
    g.putImageData(img, 0, 0);
    return c;
  }
  // stereographic disk picture (w × w), the unit disk fills the canvas
  function renderDisk(w, spec, opts = {}) {
    const F = frame(spec);
    const lat = new Float32Array(w * w).fill(NaN), lon = new Float32Array(w * w).fill(NaN);
    for (let y = 0; y < w; y++) for (let x = 0; x < w; x++) {
      const X = ((x + 0.5) / w) * 2 - 1, Y = 1 - ((y + 0.5) / w) * 2;
      if (X * X + Y * Y >= 1) continue;
      const p = diskToSphere([X, Y], F);
      lat[y * w + x] = Math.asin(Math.max(-1, Math.min(1, p[2]))) / DEG;
      lon[y * w + x] = Math.atan2(p[1], p[0]) / DEG;
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = w;
    const g = c.getContext('2d');
    const img = g.createImageData(w, w);
    paint(img.data, lat, lon, w, w, { grid: opts.grid !== false, step: gridStep(spec.R || 90), coast: true });
    g.putImageData(img, 0, 0);
    return c;
  }

  // ------------------------------------------------------------ places
  // [id, ja, en, lat, lon]
  const PLACES = [
    ['kyoto', '京都', 'Kyoto', 35.01, 135.77], ['tokyo', '東京', 'Tokyo', 35.68, 139.69], ['sapporo', '札幌', 'Sapporo', 43.06, 141.35],
    ['naha', '那覇', 'Naha', 26.21, 127.68], ['seoul', 'ソウル', 'Seoul', 37.57, 126.98], ['beijing', '北京', 'Beijing', 39.9, 116.4],
    ['shanghai', '上海', 'Shanghai', 31.23, 121.47], ['taipei', '台北', 'Taipei', 25.03, 121.57], ['hongkong', '香港', 'Hong Kong', 22.32, 114.17],
    ['singapore', 'シンガポール', 'Singapore', 1.35, 103.82], ['bangkok', 'バンコク', 'Bangkok', 13.76, 100.5], ['delhi', 'デリー', 'Delhi', 28.61, 77.21],
    ['everest', 'エベレスト', 'Mount Everest', 27.99, 86.93], ['dubai', 'ドバイ', 'Dubai', 25.2, 55.27], ['istanbul', 'イスタンブール', 'Istanbul', 41.01, 28.98],
    ['moscow', 'モスクワ', 'Moscow', 55.76, 37.62], ['cairo', 'カイロ', 'Cairo', 30.04, 31.24], ['nairobi', 'ナイロビ', 'Nairobi', -1.29, 36.82],
    ['capetown', 'ケープタウン', 'Cape Town', -33.92, 18.42], ['lagos', 'ラゴス', 'Lagos', 6.52, 3.38], ['paris', 'パリ', 'Paris', 48.86, 2.35],
    ['london', 'ロンドン', 'London', 51.51, -0.13], ['berlin', 'ベルリン', 'Berlin', 52.52, 13.4], ['rome', 'ローマ', 'Rome', 41.9, 12.5],
    ['madrid', 'マドリード', 'Madrid', 40.42, -3.7], ['reykjavik', 'レイキャビク', 'Reykjavik', 64.15, -21.94], ['newyork', 'ニューヨーク', 'New York', 40.71, -74.01],
    ['chicago', 'シカゴ', 'Chicago', 41.88, -87.63], ['losangeles', 'ロサンゼルス', 'Los Angeles', 34.05, -118.24], ['sanfrancisco', 'サンフランシスコ', 'San Francisco', 37.77, -122.42],
    ['vancouver', 'バンクーバー', 'Vancouver', 49.28, -123.12], ['mexicocity', 'メキシコシティ', 'Mexico City', 19.43, -99.13], ['honolulu', 'ホノルル', 'Honolulu', 21.31, -157.86],
    ['anchorage', 'アンカレッジ', 'Anchorage', 61.22, -149.9], ['rio', 'リオデジャネイロ', 'Rio de Janeiro', -22.91, -43.17], ['buenosaires', 'ブエノスアイレス', 'Buenos Aires', -34.6, -58.38],
    ['lima', 'リマ', 'Lima', -12.05, -77.04], ['galapagos', 'ガラパゴス諸島', 'Galápagos Islands', -0.74, -90.31], ['sydney', 'シドニー', 'Sydney', -33.87, 151.21],
    ['auckland', 'オークランド', 'Auckland', -36.85, 174.76], ['northpole', '北極点', 'North Pole', 90, 0], ['southpole', '南極点', 'South Pole', -90, 0],
  ];
  // regions used when the whole flexagon is turned into a globe (in this order)
  const REGIONS = [
    ['asia', 'アジア', 'Asia', 38, 100], ['africa', 'アフリカ', 'Africa', 3, 20], ['namerica', '北アメリカ', 'North America', 45, -100],
    ['samerica', '南アメリカ', 'South America', -15, -60], ['oceania', 'オセアニア', 'Oceania', -25, 140], ['antarctica', '南極', 'Antarctica', -90, 0],
    ['europe', 'ヨーロッパ', 'Europe', 52, 15], ['arctic', '北極', 'Arctic', 90, 0], ['pacific', '太平洋', 'Pacific Ocean', 0, -165],
    ['atlantic', '大西洋', 'Atlantic Ocean', 5, -30], ['indian', 'インド洋', 'Indian Ocean', -20, 80], ['japan', '日本', 'Japan', 36, 138],
  ];
  // n points spread evenly over the sphere (golden spiral, then a few repulsion steps)
  function spread(n, lat0 = 35, lon0 = 135.8) {
    let P = [];
    for (let i = 0; i < n; i++) {
      const z = 1 - (2 * (i + 0.5)) / n, r = Math.sqrt(1 - z * z), a = i * Math.PI * (3 - Math.sqrt(5));
      P.push([r * Math.cos(a), r * Math.sin(a), z]);
    }
    for (let it = 0; it < 1500; it++) {
      const step = (0.15 / n) * (1 - it / 1500) + 0.002 / n;
      P = P.map((p, i) => {
        const f = [0, 0, 0];
        P.forEach((q, j) => {
          if (i === j) return;
          const d = [p[0] - q[0], p[1] - q[1], p[2] - q[2]], L = Math.hypot(...d) + 1e-9, s = 1 / (L * L * L);
          f[0] += d[0] * s; f[1] += d[1] * s; f[2] += d[2] * s;
        });
        const np = [p[0] + step * f[0], p[1] + step * f[1], p[2] + step * f[2]], L = Math.hypot(...np);
        return np.map((v) => v / L);
      });
    }
    // rotate so that the first point is at (lat0, lon0)
    const target = vec(lat0 * DEG, lon0 * DEG), a = P[0];
    const ax = [a[1] * target[2] - a[2] * target[1], a[2] * target[0] - a[0] * target[2], a[0] * target[1] - a[1] * target[0]];
    const s = Math.hypot(...ax), c = a[0] * target[0] + a[1] * target[1] + a[2] * target[2];
    const k = s > 1e-9 ? ax.map((v) => v / s) : [1, 0, 0];
    const rotv = (v) => { // Rodrigues
      const kv = [k[1] * v[2] - k[2] * v[1], k[2] * v[0] - k[0] * v[2], k[0] * v[1] - k[1] * v[0]];
      const kd = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
      return [0, 1, 2].map((i) => v[i] * c + kv[i] * s + k[i] * kd * (1 - c));
    };
    return P.map((p) => toLatLon(rotv(p)));
  }

  root.Earth = {
    scMap, scNorm, gamma, diskToHex, hexToDisk, hexRadius, buildLUT, frame, diskToSphere, sphereToDisk, toLatLon, vec,
    renderFace, renderMap, renderGlobe, renderDisk, faceOutline, setCustomMap, hasCustom: () => !!custom, gridStep,
    PLACES, REGIONS, spread,
  };
})(window);
