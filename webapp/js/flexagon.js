/*
 * Hexaflexagon model
 * ------------------
 * A flat state is a list of 6 "pats" (stacks of triangular leaves), listed
 * CLOCKWISE when seen from the top.  A pat is either a leaf or a pair {a, b}
 * where a lies on top of b (Sherman's pat notation).
 *
 * Every leaf carries its placement inside the sector as a role map
 *   m = { O: corner at centre, P: corner shared with previous pat,
 *         N: corner shared with next pat }        (corners are 0,1,2)
 * Leaf corners 0,1,2 are counter-clockwise when the FRONT side of the leaf is
 * viewed, so a leaf shows its front upward iff (m.O, m.N, m.P) is a cyclic
 * rotation of (0,1,2).
 *
 * Pinch flex (P) on even positions:
 *   [[a,b], c, [d,e], f, [g,h], i]  ->  [-a, [e,-c], -d, [h,-f], -g, [b,-i]]
 * with the corner roles changing as derived from the geometry of the flex.
 */
(function (root) {
  'use strict';

  // ---------- small helpers ----------
  const isLeaf = (p) => p.leaf !== undefined;
  const mkLeaf = (leaf, m) => ({ leaf, m });
  const mkPair = (a, b) => ({ a, b });

  function mapLeaves(p, f) {
    return isLeaf(p) ? f(p) : mkPair(mapLeaves(p.a, f), mapLeaves(p.b, f));
  }
  // physically turn a pat over: reverse stacking order recursively
  function reversePat(p) {
    return isLeaf(p) ? p : mkPair(reversePat(p.b), reversePat(p.a));
  }
  function leavesTopDown(p, out = []) {
    if (isLeaf(p)) out.push(p);
    else { leavesTopDown(p.a, out); leavesTopDown(p.b, out); }
    return out;
  }
  const topLeaf = (p) => (isLeaf(p) ? p : topLeaf(p.a));
  const bottomLeaf = (p) => (isLeaf(p) ? p : bottomLeaf(p.b));
  const frontUp = (m) => {
    const t = [m.O, m.N, m.P];
    return (t[0] === 0 && t[1] === 1) || (t[0] === 1 && t[1] === 2) || (t[0] === 2 && t[1] === 0);
  };
  const leafCount = (p) => (isLeaf(p) ? 1 : leafCount(p.a) + leafCount(p.b));

  // role permutations used by the flexes
  const permX = (m) => ({ O: m.N, N: m.O, P: m.P }); // stays, flipped
  const permY = (m) => ({ O: m.N, N: m.P, P: m.O }); // moves to previous pat, on top
  const permQ = (m) => ({ O: m.P, N: m.N, P: m.O }); // gets covered, flipped
  const permT = (m) => ({ O: m.O, N: m.P, P: m.N }); // turn over

  const applyPerm = (p, perm) => mapLeaves(p, (l) => mkLeaf(l.leaf, perm(l.m)));

  // ---------- flexes ----------
  function canPinch(state, parity) {
    for (let i = parity; i < 6; i += 2) if (isLeaf(state[i])) return false;
    return true;
  }
  function rotate(state, k) { // new[i] = old[i+k]
    const out = [];
    for (let i = 0; i < 6; i++) out.push(state[(((i + k) % 6) + 6) % 6]);
    return out;
  }
  function pinchEven(s) {
    const out = new Array(6);
    for (let i = 0; i < 6; i += 2) {
      const split = s[i];
      out[i] = reversePat(applyPerm(split.a, permX));
    }
    for (let i = 1; i < 6; i += 2) {
      const y = s[(i + 1) % 6].b;
      out[i] = mkPair(applyPerm(y, permY), reversePat(applyPerm(s[i], permQ)));
    }
    return out;
  }
  function pinch(state, parity) {
    if (!canPinch(state, parity)) return null;
    if (parity === 0) return pinchEven(state);
    return rotate(pinchEven(rotate(state, 1)), -1);
  }
  function turnOver(state) {
    const out = new Array(6);
    for (let i = 0; i < 6; i++) out[i] = reversePat(applyPerm(state[5 - i], permT));
    return out;
  }

  // ---------- serialisation / canonical keys ----------
  function patKey(p) {
    return isLeaf(p) ? `${p.leaf}:${p.m.O}${p.m.P}${p.m.N}` : `[${patKey(p.a)},${patKey(p.b)}]`;
  }
  const stateKey = (s) => s.map(patKey).join(' ');
  function canonicalKey(s) {
    let best = null;
    for (const t of [s, turnOver(s)]) {
      for (let k = 0; k < 6; k++) {
        const key = stateKey(rotate(t, k));
        if (best === null || key < best) best = key;
      }
    }
    return best;
  }
  function shapeKey(p) { return isLeaf(p) ? '-' : `[${shapeKey(p.a)} ${shapeKey(p.b)}]`; }

  // ---------- construction ----------
  /*
   * Build a flexagon from a generating sequence (after Sherman):
   *   'P*' : make even pats splittable (split single leaves) then pinch
   *   'P'  : pinch on even pats
   *   '>'  : rotate one step (next pat becomes first),  '<' the opposite
   *   '^'  : turn over
   * Starts from a plain hexagon of 6 leaves joined in a ring.
   */
  function build(sequence) {
    let nextId = 6;
    let state = [];
    const hinges = []; // {a:[leaf,cornerA1,cornerA2], b:[leaf,cornerB1,cornerB2]}
    for (let i = 0; i < 6; i++) state.push(mkLeaf(i, { O: 0, N: 1, P: 2 }));
    for (let i = 0; i < 6; i++) hinges.push({ a: [i, 0, 1], b: [(i + 1) % 6, 0, 2] });

    const tokens = sequence.match(/P\*|P|>|<|\^/g) || [];
    for (const tok of tokens) {
      if (tok === '>') state = rotate(state, 1);
      else if (tok === '<') state = rotate(state, -1);
      else if (tok === '^') state = turnOver(state);
      else {
        if (tok === 'P*') {
          for (let i = 0; i < 6; i += 2) {
            const p = state[i];
            if (!isLeaf(p)) continue;
            const id = p.leaf, m = p.m, nid = nextId++;
            const mb = { O: m.O, P: m.N, N: m.P };
            // the hinge to the previous pat moves from leaf id to the new leaf
            const roleOf = { [m.O]: 'O', [m.P]: 'P', [m.N]: 'N' };
            for (const h of hinges) {
              for (const side of ['a', 'b']) {
                const e = h[side];
                if (e[0] !== id) continue;
                const roles = [roleOf[e[1]], roleOf[e[2]]];
                if (roles.includes('P')) {
                  h[side] = [nid, mb[roles[0]], mb[roles[1]]];
                }
              }
            }
            // outer-edge hinge between the two halves
            hinges.push({ a: [id, m.P, m.N], b: [nid, mb.P, mb.N] });
            state[i] = mkPair(mkLeaf(id, m), mkLeaf(nid, mb));
          }
        }
        const t = pinch(state, 0);
        if (!t) throw new Error('pinch impossible in sequence ' + sequence);
        state = t;
      }
    }
    return { state, hinges, leafCount: nextId };
  }

  // positions/maps of all leaves in a state
  function leafPlacements(state) {
    const res = {};
    state.forEach((p, i) => {
      leavesTopDown(p).forEach((l, depth) => { res[l.leaf] = { pos: i, m: l.m, depth }; });
    });
    return res;
  }

  // verify that every hinge is geometrically consistent in a state
  function checkHinges(state, hinges) {
    const pl = leafPlacements(state);
    const role = (leaf, c) => { const m = pl[leaf].m; return m.O === c ? 'O' : m.P === c ? 'P' : 'N'; };
    for (const h of hinges) {
      const [la, a1, a2] = h.a, [lb, b1, b2] = h.b;
      const pa = pl[la].pos, pb = pl[lb].pos;
      const ra = [role(la, a1), role(la, a2)], rb = [role(lb, b1), role(lb, b2)];
      if (pa === pb) {
        if (ra[0] !== rb[0] || ra[1] !== rb[1]) return `folded hinge mismatch ${la}-${lb}`;
      } else {
        const swap = (r) => (r === 'N' ? 'P' : r === 'P' ? 'N' : 'O');
        if ((pa + 1) % 6 === pb) {
          // la edge must be (O,N) and lb edge (O,P), matched
          if (ra.includes('P') || rb.includes('N')) return `flat hinge edge ${la}-${lb}`;
          if (swap(ra[0]) !== rb[0] || swap(ra[1]) !== rb[1]) return `flat hinge match ${la}-${lb}`;
        } else if ((pb + 1) % 6 === pa) {
          if (rb.includes('P') || ra.includes('N')) return `flat hinge edge ${la}-${lb}`;
          if (swap(rb[0]) !== ra[0] || swap(rb[1]) !== ra[1]) return `flat hinge match ${la}-${lb}`;
        } else return `hinge across non-adjacent pats ${la}-${lb}`;
      }
    }
    return null;
  }

  // the strip: cyclic order of leaves following the hinges
  function stripOrder(hinges, nLeaves) {
    const adj = {};
    for (const h of hinges) {
      (adj[h.a[0]] = adj[h.a[0]] || []).push(h);
      (adj[h.b[0]] = adj[h.b[0]] || []).push(h);
    }
    for (let i = 0; i < nLeaves; i++) if (!adj[i] || adj[i].length !== 2) throw new Error('leaf ' + i + ' degree');
    const order = [0];
    const used = new Set();
    let cur = 0;
    while (true) {
      const h = adj[cur].find((x) => !used.has(x));
      if (!h) break;
      used.add(h);
      const nxt = h.a[0] === cur ? h.b[0] : h.a[0];
      if (nxt === 0) break;
      order.push(nxt);
      cur = nxt;
    }
    if (order.length !== nLeaves) throw new Error('strip is not a single loop');
    return order;
  }

  // ---------- exploration ----------
  function visibleSides(state) {
    // returns {top:[{leaf,side,pos,m}], bottom:[...]} ; side 'f' or 'b'
    const top = [], bottom = [];
    state.forEach((p, i) => {
      const t = topLeaf(p), b = bottomLeaf(p);
      top.push({ leaf: t.leaf, side: frontUp(t.m) ? 'f' : 'b', pos: i, m: t.m });
      bottom.push({ leaf: b.leaf, side: frontUp(b.m) ? 'b' : 'f', pos: i, m: b.m });
    });
    return { top, bottom };
  }
  const sideSetKey = (arr) => arr.map((x) => x.leaf + x.side).sort().join(',');

  /*
   * Explore all states reachable by pinch flexes (from either side).
   * Nodes are states up to rotation and turning over.
   */
  function explore(start) {
    const nodes = [];
    const index = new Map();
    const edges = [];
    const add = (s) => {
      const key = canonicalKey(s);
      if (index.has(key)) return index.get(key);
      const id = nodes.length;
      index.set(key, id);
      nodes.push({ id, state: s, key });
      return id;
    };
    add(start);
    for (let q = 0; q < nodes.length; q++) {
      const s = nodes[q].state;
      for (const side of [0, 1]) {
        const base = side ? turnOver(s) : s;
        for (const parity of [0, 1]) {
          const t = pinch(base, parity);
          if (!t) continue;
          const id = add(t);
          const a = Math.min(q, id), b = Math.max(q, id);
          if (!edges.some((e) => e.a === a && e.b === b)) edges.push({ a, b });
        }
      }
    }
    return { nodes, edges };
  }

  /*
   * Assign faces: sides that are seen together form a face.
   * Faces are numbered in order of discovery (BFS from the start state:
   * top of start = face 0, bottom = face 1, ...).
   */
  function computeFaces(graph, startNode = 0) {
    const sideFace = {};
    const faces = [];
    const order = [];
    // BFS order over nodes from 0
    const adj = graph.nodes.map(() => []);
    graph.edges.forEach((e) => { adj[e.a].push(e.b); adj[e.b].push(e.a); });
    const seen = new Set([startNode]);
    const queue = [startNode];
    while (queue.length) {
      const q = queue.shift();
      order.push(q);
      for (const r of adj[q]) if (!seen.has(r)) { seen.add(r); queue.push(r); }
    }
    for (const q of order) {
      const st = graph.nodes[q].state;
      const vis = visibleSides(st);
      for (const [which, arr] of [['top', vis.top], ['bottom', vis.bottom]]) {
        const key = sideSetKey(arr);
        let fid = sideFace[arr[0].leaf + arr[0].side];
        if (fid === undefined) {
          fid = faces.length;
          faces.push({ id: fid, key, home: q, homeSide: which });
          for (const s of arr) sideFace[s.leaf + s.side] = fid;
        } else if (faces[fid].key !== key) {
          throw new Error('inconsistent faces');
        }
      }
    }
    return { faces, sideFace };
  }

  root.Flexagon = {
    isLeaf, mkLeaf, mkPair, leavesTopDown, topLeaf, bottomLeaf, frontUp, leafCount,
    canPinch, pinch, turnOver, rotate, stateKey, canonicalKey, shapeKey,
    build, leafPlacements, checkHinges, stripOrder, visibleSides, explore, computeFaces,
  };
  if (typeof module !== 'undefined') module.exports = root.Flexagon;
})(typeof window !== 'undefined' ? window : globalThis);
