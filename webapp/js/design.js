/*
 * Design layer: turns a generating sequence into everything the app needs
 *  - states / transition graph / faces / triangulated face map
 *  - texture coordinates of every leaf side
 *  - the printable strip (net), cut into pieces that fit the paper
 *  - a physically valid folding sequence (simple folds of the strip end)
 */
(function (root) {
  'use strict';
  const F = root.Flexagon || (typeof require !== 'undefined' ? require('./flexagon.js') : null);

  const S3 = Math.sqrt(3) / 2;
  const deg = (a) => (a * Math.PI) / 180;
  // sector i (clockwise list): vertex shared with previous pat at 90-60i deg,
  // vertex shared with next pat at 30-60i deg (y up)
  const vP = (i) => [Math.cos(deg(90 - 60 * i)), Math.sin(deg(90 - 60 * i))];
  const vN = (i) => [Math.cos(deg(30 - 60 * i)), Math.sin(deg(30 - 60 * i))];

  // Presets: generating sequences (Sherman-style) for n faces
  const PRESETS = {
    3: [{ id: '3', seq: 'P*' }],
    4: [{ id: '4', seq: 'P*P*' }],
    5: [{ id: '5', seq: 'P*P*P*' }],
    6: [{ id: '6', seq: 'P*P*P*>P*>P*PP*' }],
    7: [
      { id: '7a', seq: 'P*P*P*>PP*P*' },
      { id: '7b', seq: 'P*P*P*P*^P*^>P*P*^P*' },
      { id: '7c', seq: 'P*P*P*P*>PP*' },
    ],
    8: [
      { id: '8a', seq: 'P*P*P*P*^P*^>P*P*P*' },
      { id: '8b', seq: 'P*P*P*>P*P*^>P*P*' },
      { id: '8c', seq: 'P*P*P*P*P*^P*P*^>P*P*' },
    ],
    9: [
      { id: '9a', seq: 'P*P*P*>^>P*^>P*P*P*P*>^>P*^>P*P*' },
      { id: '9b', seq: 'P*P*P*^>P*P*>^>P*P*P*^>P*P*' },
    ],
    10: [{ id: '10', seq: 'P*P*P*P*P*>^>P*^>P*P*^>P*P*' }],
    11: [{ id: '11', seq: 'P*P*^>P*^>P*P*^>P*^>P*^>P*P*' }],
    12: [{ id: '12', seq: 'P*P*^>P*^>P*^>P*P*^>P*^>P*^>P*P*' }],
  };


  // ---------- geometry helpers ----------
  function reflect(C, A, B) {
    const dx = B[0] - A[0], dy = B[1] - A[1];
    const t = ((C[0] - A[0]) * dx + (C[1] - A[1]) * dy) / (dx * dx + dy * dy);
    const fx = A[0] + t * dx, fy = A[1] + t * dy;
    return [2 * fx - C[0], 2 * fy - C[1]];
  }
  const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const centroid = (q) => [(q[0][0] + q[1][0] + q[2][0]) / 3, (q[0][1] + q[1][1] + q[2][1]) / 3];
  const cellKey = (q) => { const c = centroid(q); return Math.round(c[0] * 12) + ',' + Math.round(c[1] * 12); };
  const third = (a, b) => [0, 1, 2].find((c) => c !== a && c !== b);

  function hingeBetween(hinges, x, y) {
    const h = hinges.find((h) => (h.a[0] === x && h.b[0] === y) || (h.a[0] === y && h.b[0] === x));
    if (!h) return null;
    return h.a[0] === x ? { x: h.a, y: h.b } : { x: h.b, y: h.a };
  }

  // lay out the strip (leaves in `order`) flat, plus a tab after the last leaf
  // returns pts[k] = corner coordinates (indexed by local corner) of order[k]
  function layoutStrip(order, hinges, closeTo) {
    const pts = [[[0, 0], [1, 0], [0.5, S3]]];
    const n = order.length;
    for (let k = 1; k <= n; k++) {
      const prev = order[k - 1];
      const cur = k < n ? order[k] : closeTo; // tab = copy of first leaf
      const h = hingeBetween(hinges, prev, cur);
      const P = pts[k - 1];
      const A = P[h.x[1]], B = P[h.x[2]], C = P[third(h.x[1], h.x[2])];
      const q = [];
      q[h.y[1]] = A; q[h.y[2]] = B; q[third(h.y[1], h.y[2])] = reflect(C, A, B);
      pts.push(q);
    }
    return pts;
  }

  // ---------- main analysis ----------
  function analyse(seq) {
    const b = F.build(seq);
    const graph = F.explore(b.state);
    const nLeaves = b.leafCount;
    const order = F.stripOrder(b.hinges, nLeaves);
    const plan = planFolding(b, graph, order, nLeaves);
    const startNode = plan ? plan.targetNode : 0;
    // faces are discovered from the state the finished model starts in
    const { faces, sideFace } = F.computeFaces(graph, startNode);
    const nFaces = faces.length;

    const faceOf = (st) => {
      const v = F.visibleSides(st);
      return [sideFace[v.top[0].leaf + v.top[0].side], sideFace[v.bottom[0].leaf + v.bottom[0].side]];
    };
    graph.nodes.forEach((n) => { n.faces = faceOf(n.state); });

    // texture coordinates (unit hexagon, y up) for every leaf side
    const tex = {}; // key leaf+side -> {face, uv:[[x,y] per corner]}
    for (const f of faces) {
      let st = graph.nodes[f.home].state;
      if (f.homeSide === 'bottom') st = F.turnOver(st);
      const vis = F.visibleSides(st).top;
      for (const s of vis) {
        const uv = [];
        uv[s.m.O] = [0, 0]; uv[s.m.P] = vP(s.pos); uv[s.m.N] = vN(s.pos);
        tex[s.leaf + s.side] = { face: f.id, uv };
      }
    }

    // triangulated face map: triangles {a,b,c}
    const tris = new Map();
    const transitions = []; // {from,to,newFace}
    graph.nodes.forEach((n) => {
      for (const side of [0, 1]) {
        const base = side ? F.turnOver(n.state) : n.state;
        const [a, bb] = faceOf(base);
        for (const par of [0, 1]) {
          const t = F.pinch(base, par);
          if (!t) continue;
          const c = faceOf(t)[0];
          const key = [a, bb, c].sort((x, y) => x - y).join('-');
          tris.set(key, [a, bb, c].sort((x, y) => x - y));
        }
      }
    });
    let triangles = [...tris.values()];
    let polygon = boundaryCycle(triangles, nFaces);

    // renumber faces along the polygon, starting with the top and bottom
    // faces of the start state (faces 0 and 1 by construction of computeFaces)
    let cycle = polygon.slice();
    const i0 = cycle.indexOf(0);
    cycle = cycle.slice(i0).concat(cycle.slice(0, i0));
    if (cycle[1] !== 1 && cycle[cycle.length - 1] === 1) cycle = [cycle[0]].concat(cycle.slice(1).reverse());
    {
      const map = {};
      cycle.forEach((f, i) => { map[f] = i; });
      const nf = [];
      faces.forEach((f) => { nf[map[f.id]] = { ...f, id: map[f.id] }; });
      faces.length = 0; nf.forEach((f) => faces.push(f));
      for (const k in sideFace) sideFace[k] = map[sideFace[k]];
      for (const k in tex) tex[k].face = map[tex[k].face];
      graph.nodes.forEach((n) => { n.faces = n.faces.map((f) => map[f]); });
      triangles = triangles.map((tr) => tr.map((f) => map[f]).sort((x, y) => x - y));
      polygon = cycle.map((f) => map[f]);
    }

    // count distinct arrangements of each face
    const arrangements = faces.map(() => new Set());
    graph.nodes.forEach((n) => {
      for (const side of [0, 1]) {
        const st = side ? F.turnOver(n.state) : n.state;
        const vis = F.visibleSides(st).top;
        const f = sideFace[vis[0].leaf + vis[0].side];
        // signature: for each pos, (leaf side, corner at centre); minimise over rotation
        const sig = vis.map((s) => s.leaf + s.side + s.m.O);
        let best = null;
        for (let k = 0; k < 6; k++) {
          const r = sig.slice(k).concat(sig.slice(0, k)).join('|');
          if (best === null || r < best) best = r;
        }
        arrangements[f].add(best);
      }
    });
    faces.forEach((f, i) => { f.arrangements = arrangements[i].size; f.degree = 0; });
    graph.edges.forEach(() => {});
    graph.nodes.forEach((n) => { faces[n.faces[0]].degree++; faces[n.faces[1]].degree++; });

    return { seq, build: b, graph, faces, sideFace, tex, nFaces, nLeaves, triangles, polygon, plan };
  }

  // order faces around the polygon of the triangulated map
  function boundaryCycle(triangles, n) {
    if (n === 3) return triangles[0].slice();
    const cnt = new Map();
    for (const t of triangles) {
      for (const [a, b] of [[t[0], t[1]], [t[1], t[2]], [t[0], t[2]]]) {
        const k = a + '-' + b;
        cnt.set(k, (cnt.get(k) || 0) + 1);
      }
    }
    const adj = {};
    for (const [k, c] of cnt) {
      if (c !== 1) continue;
      const [a, b] = k.split('-').map(Number);
      (adj[a] = adj[a] || []).push(b);
      (adj[b] = adj[b] || []).push(a);
    }
    const cyc = [0];
    let prev = -1, cur = 0;
    while (cyc.length < n) {
      const nx = adj[cur].find((x) => x !== prev && !cyc.includes(x));
      if (nx === undefined) break;
      cyc.push(nx); prev = cur; cur = nx;
    }
    return cyc;
  }

  // ---------- folding plan ----------
  /*
   * Try cut positions / directions / target states; fold the strip from its
   * free end (simple folds), keep layer constraints only between overlapping
   * leaves, and accept a plan whose final stacking equals the target state and
   * whose glue tab ends adjacent to the first leaf.
   */
  /*
   * Folding plan.  The strip starts at a single-leaf pat (leaf 0) and ends with
   * a glue tab that lands on leaf 0.  Every pat is a contiguous piece of the
   * strip; it is folded into its stack by following its pat tree (fold the two
   * sub-stacks, then the hinge between them).  Pats are processed from the far
   * end of the strip, so the moving part is always the already folded tail.
   */
  function planFolding(b, graph, cyc, nLeaves) {
    let best = null;
    for (const node of graph.nodes) {
      const st = node.state;
      for (let pos = 0; pos < 6; pos++) {
        if (!F.isLeaf(st[pos])) continue;
        const startLeaf = st[pos].leaf;
        const ci = cyc.indexOf(startLeaf);
        for (const dir of [1, -1]) {
          const order = [];
          for (let k = 0; k < nLeaves; k++) order.push(cyc[(((ci + dir * k) % nLeaves) + nLeaves) % nLeaves]);
          const net = layoutStrip(order, b.hinges, order[0]);
          const keys = new Set();
          let ok = true;
          for (const q of net) { const k = cellKey(q); if (keys.has(k)) { ok = false; break; } keys.add(k); }
          if (!ok) continue;
          const res = foldByPats(b, st, order, net);
          if (!res) continue;
          res.targetNode = node.id;
          res.width = stripWidth(net);
          res.score = res.violations * 100 + res.width + (node.id === 0 ? 0 : 0.5);
          if (!best || res.score < best.score) best = res;
        }
      }
      if (best && best.violations === 0 && node.id === 0) break;
    }
    return best;
  }

  function stripWidth(net) {
    const cents = net.map(centroid);
    let width = 1e9;
    for (let a = 0; a < 12; a++) {
      const th = (a * Math.PI) / 6;
      const ys = cents.map((c) => c[0] * Math.sin(th) + c[1] * Math.cos(th));
      width = Math.min(width, Math.max(...ys) - Math.min(...ys));
    }
    return width;
  }

  function targetTriangles(state) {
    const pl = F.leafPlacements(state);
    const out = {};
    for (const leaf in pl) {
      const { pos, m, depth } = pl[leaf];
      const q = [];
      q[m.O] = [0, 0]; q[m.P] = vP(pos); q[m.N] = vN(pos);
      out[leaf] = { q, pos, depth };
    }
    return out;
  }

  function foldByPats(b, target, order, net) {
    const n = order.length;
    const N = n + 1; // index n = glue tab
    const T = targetTriangles(target);
    const idx = {};
    order.forEach((l, k) => { idx[l] = k; });
    const leafOf = (k) => (k === n ? order[0] : order[k]);
    const sT = (k) => Math.sign(cross(...T[leafOf(k)].q));
    const want = (i, j) => sT(i) * (T[leafOf(i)].depth < T[leafOf(j)].depth ? 1 : -1);

    // fold order from the pat trees
    const foldOrder = [];
    function rangeOf(p) {
      const ks = F.leavesTopDown(p).map((l) => idx[l.leaf]);
      return [Math.min(...ks), Math.max(...ks), ks.length];
    }
    function visit(p) {
      if (F.isLeaf(p)) return true;
      const ra = rangeOf(p.a), rb = rangeOf(p.b);
      if (ra[1] - ra[0] + 1 !== ra[2] || rb[1] - rb[0] + 1 !== rb[2]) return false;
      const [lo, hi] = ra[0] < rb[0] ? [p.a, p.b] : [p.b, p.a];
      if (!visit(hi)) return false;
      if (!visit(lo)) return false;
      foldOrder.push(Math.max(ra[0] < rb[0] ? ra[1] : rb[1]));
      return true;
    }
    // pats sorted by their position along the strip, far end first
    const pats = target.map((p) => ({ p, r: rangeOf(p) })).sort((x, y) => y.r[0] - x.r[0]);
    for (const { p, r } of pats) {
      if (r[1] - r[0] + 1 !== r[2]) return null; // pat must be contiguous
      if (!visit(p)) return null;
    }

    let cur = net.map((q) => q.map((pt) => pt.slice()));
    let above = Array.from({ length: N }, () => new Array(N).fill(0));
    let stamp = 0;
    const steps = [];
    let violations = 0;
    for (const k of foldOrder) {
      const h = hingeBetween(b.hinges, order[k], leafOf(k + 1));
      const A = cur[k][h.x[1]], B = cur[k][h.x[2]];
      const oriY = -Math.sign(cross(...cur[k + 1]));
      const up = oriY * want(k + 1, k) > 0;
      for (let i = k + 1; i < N; i++) for (let j = 0; j <= k; j++) {
        if ((up && above[j][i]) || (!up && above[i][j])) violations++;
      }
      const nc = cur.map((q, j) => (j > k ? q.map((pt) => reflect(pt, A, B)) : q));
      const na = above.map((row) => row.slice());
      for (let i = k + 1; i < N; i++) for (let j = i + 1; j < N; j++) {
        const t = na[i][j]; na[i][j] = na[j][i]; na[j][i] = t;
      }
      const keys = nc.map(cellKey);
      for (let i = k + 1; i < N; i++) for (let j = 0; j <= k; j++) {
        if (keys[i] === keys[j]) { na[i][j] = up ? 1 : 0; na[j][i] = up ? 0 : 1; }
        else { na[i][j] = 0; na[j][i] = 0; }
      }
      steps.push({ hinge: k, A: A.slice(), B: B.slice(), up, before: cur, after: nc, aboveBefore: above, aboveAfter: na });
      cur = nc; above = na; stamp++;
    }
    // final verification
    const keys = cur.map(cellKey);
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      if (keys[i] !== keys[j]) continue;
      if (T[leafOf(i)].pos !== T[leafOf(j)].pos) return null;
      const val = Math.sign(cross(...cur[i])) * (above[i][j] ? 1 : -1);
      if (val !== want(i, j)) return null;
    }
    if (keys[n] !== keys[0]) return null;
    const tabAbove = !!above[n][0];
    const finalMirrored = Math.sign(cross(...cur[0])) !== sT(0);
    return { order, net, steps, final: cur, finalAbove: above, finalMirrored, tabAbove, target, violations };
  }

  // ---------- paper sides of the net ----------
  /*
   * For every triangle of the strip (index 0..n-1 = leaves, n = closing tab)
   * decide what is printed on the paper front and back:
   *   {tex: 'leaf+side'} or {glue: true}
   * and the fold type of every construction fold as seen on the front.
   */
  function netSides(A) {
    const plan = A.plan;
    const { order, net, final } = plan;
    const n = order.length;
    const sign = (q) => Math.sign(cross(...q));
    const other = (s) => (s === 'f' ? 'b' : 'f');
    const tris = [];
    for (let k = 0; k <= n; k++) {
      const leaf = k === n ? order[0] : order[k];
      const frontLocal = sign(net[k]) > 0 ? 'f' : 'b';
      tris.push({ k, leaf, pts: net[k], frontLocal, front: { tex: leaf + frontLocal }, back: { tex: leaf + other(frontLocal) } });
    }
    // closing tab
    const up0 = sign(final[0]) > 0 ? 'f' : 'b';
    const covered = plan.tabAbove ? up0 : other(up0);
    const t0 = tris[0], tab = tris[n];
    if (t0.frontLocal === covered) t0.front = { glue: true }; else t0.back = { glue: true };
    if (tab.frontLocal === covered) { tab.front = { tex: order[0] + covered }; tab.back = { glue: true }; }
    else { tab.back = { tex: order[0] + covered }; tab.front = { glue: true }; }
    tab.isTab = true;
    // fold types
    const folds = plan.steps.map((st) => {
      const k = st.hinge;
      const h = hingeBetween(A.build.hinges, order[k], k + 1 < n ? order[k + 1] : order[0]);
      const frontUpNow = sign(st.before[k]) === sign(net[k]);
      const valleyOnFront = frontUpNow ? st.up : !st.up;
      return { k, a: net[k][h.x[1]], b: net[k][h.x[2]], valleyOnFront };
    });
    // all hinge lines (creases)
    const creases = [];
    for (let k = 0; k < n; k++) {
      const h = hingeBetween(A.build.hinges, order[k], k + 1 < n ? order[k + 1] : order[0]);
      creases.push({ k, a: net[k][h.x[1]], b: net[k][h.x[2]] });
    }
    return { tris, folds, creases, n };
  }

  /*
   * Split the strip into pieces that fit a printable area (units: triangle
   * side = 1).  Returns pieces with their triangles, a rotation and a size.
   */
  /*
   * opts.fold: single-sided mode.  The back of every piece is printed next to
   * it, mirrored across a straight boundary line of the piece (the fold line).
   * Folding along that line puts the back exactly behind the front.
   * opts.prefer: 'contact' (longest fold line first) or 'compact' (smallest box).
   */
  function splitPieces(sides, maxW, maxH, maxLen = Infinity, opts = {}) {
    const { tris, n } = sides;
    const pieces = [];
    function boxFit(pts) {
      // try rotations by 15 deg; return best {ang, w, h, x0, y0, key}
      let best = null;
      for (let a = 0; a < 24; a++) {
        const th = (a * Math.PI) / 12;
        const c = Math.cos(th), sn = Math.sin(th);
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        for (const p of pts) {
          const x = p[0] * c - p[1] * sn, y = p[0] * sn + p[1] * c;
          x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
        }
        const w = x1 - x0, h = y1 - y0;
        const ok = (w <= maxW && h <= maxH) || (h <= maxW && w <= maxH);
        if (!ok) continue;
        // prefer the slimmest bounding box (pieces pack better side by side)
        const key = Math.min(w, h) * 1000 + w * h;
        if (!best || key < best.key - 1e-9) best = { ang: th, w, h, x0, y0, key };
      }
      return best;
    }
    function fit(list) {
      const pts = [];
      for (const t of list) for (const p of t.pts) pts.push(p);
      if (!opts.fold) return boxFit(pts);
      let best = null;
      for (const L of foldLines(list)) {
        const all = pts.concat(pts.map((p) => reflect(p, L.a, L.b)));
        const f = boxFit(all);
        if (!f) continue;
        const key = opts.prefer === 'compact' ? f.key - L.contact * 1e-3 : -L.contact * 1e6 + f.key;
        if (!best || key < best.rank - 1e-9) best = { ...f, rank: key, fold: L };
      }
      return best;
    }
    let s = 0;
    while (s < n) {
      let e = s, bestFit = null, bestList = null;
      for (let t = s; t < n && t - s < maxLen; t++) {
        const list = tris.slice(s, t + 1).map((x) => ({ ...x }));
        if (t === n - 1) list.push({ ...tris[n] });
        else list.push(joinTab(tris, t)); // join tab hanging on leaf t
        const f = fit(list);
        if (!f) break;
        e = t; bestFit = f; bestList = list;
      }
      if (!bestFit) return null; // a single triangle does not fit
      pieces.push({ from: s, to: e, tris: bestList, fit: bestFit });
      s = e + 1;
    }
    // the first leaf of every later piece gets a glue area on its back
    for (let i = 1; i < pieces.length; i++) {
      const first = pieces[i].tris[0];
      first.back = { glue: true, join: true };
    }
    return pieces;
  }

  /*
   * Straight lines that touch a piece along at least one outer edge while the
   * whole piece lies on one side: candidate fold lines for single-sided print.
   * Returns [{a, b, contact, segs:[[p,q],...]}] (a, b: extreme contact points).
   */
  function foldLines(list) {
    const EPS = 1e-6;
    const vk = (p) => Math.round(p[0] * 1e4) + ',' + Math.round(p[1] * 1e4);
    const edges = new Map();
    for (const t of list) for (let e = 0; e < 3; e++) {
      const a = t.pts[e], b = t.pts[(e + 1) % 3];
      const k1 = vk(a), k2 = vk(b), key = k1 < k2 ? k1 + '|' + k2 : k2 + '|' + k1;
      const r = edges.get(key);
      if (r) r.count++; else edges.set(key, { a, b, count: 1 });
    }
    const outer = [...edges.values()].filter((e) => e.count === 1);
    const pts = [];
    for (const t of list) for (const p of t.pts) pts.push(p);
    const seen = new Set(), out = [];
    for (const e of outer) {
      const d = [e.b[0] - e.a[0], e.b[1] - e.a[1]], len = Math.hypot(d[0], d[1]);
      const u = [d[0] / len, d[1] / len];
      const dist = (p) => (p[0] - e.a[0]) * -u[1] + (p[1] - e.a[1]) * u[0];
      let lo = Infinity, hi = -Infinity;
      for (const p of pts) { const s = dist(p); lo = Math.min(lo, s); hi = Math.max(hi, s); }
      if (lo < -EPS && hi > EPS) continue; // piece on both sides
      const segs = outer.filter((f) => Math.abs(dist(f.a)) < EPS && Math.abs(dist(f.b)) < EPS);
      const along = (p) => (p[0] - e.a[0]) * u[0] + (p[1] - e.a[1]) * u[1];
      let s0 = Infinity, s1 = -Infinity, A = null, B = null;
      for (const f of segs) for (const p of [f.a, f.b]) {
        const s = along(p);
        if (s < s0) { s0 = s; A = p; }
        if (s > s1) { s1 = s; B = p; }
      }
      const key = vk(A) + '|' + vk(B);
      if (seen.has(key)) continue;
      seen.add(key);
      // extent of the piece along the line (for marks drawn outside the cut line)
      let e0 = s0, e1 = s1;
      for (const p of pts) if (Math.abs(dist(p)) < EPS) { const s = along(p); e0 = Math.min(e0, s); e1 = Math.max(e1, s); }
      const at = (s) => [e.a[0] + u[0] * s, e.a[1] + u[1] * s];
      out.push({ a: A, b: B, contact: segs.length, segs: segs.map((f) => [f.a, f.b]), ends: [at(e0), at(e1)] });
    }
    return out;
  }

  function joinTab(tris, t) {
    const nx = tris[t + 1];
    return { k: t + 0.5, leaf: nx.leaf, pts: nx.pts, isJoin: true, frontLocal: nx.frontLocal,
      front: { glue: true }, back: nx.back.glue ? { glue: true } : nx.back };
  }

  root.FlexDesign = { PRESETS, analyse, netSides, splitPieces, foldLines, layoutStrip, vP, vN, S3, reflect, cross, centroid, cellKey };
  if (typeof module !== 'undefined') module.exports = root.FlexDesign;
})(typeof window !== 'undefined' ? window : globalThis);
