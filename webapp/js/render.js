/* Rendering helpers: face textures, textured triangles, a tiny 3D camera */
(function (root) {
  'use strict';

  const TEX = 512;            // face texture size (px)
  const TR = TEX / 2 - 1;     // hexagon radius inside the texture (px)
  const PALETTE = [
    '#e4572e', '#2e86ab', '#f3a712', '#4caf50', '#8e44ad', '#ef476f',
    '#17a398', '#ff8c42', '#3d5a80', '#c0ca33', '#9c6644', '#5c6bc0',
  ];

  const uvPx = (uv) => [TEX / 2 + uv[0] * TR, TEX / 2 - uv[1] * TR];

  function hexPath(ctx, cx, cy, r, keep) {
    if (!keep) ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = ((90 - 60 * i) * Math.PI) / 180;
      const x = cx + r * Math.cos(a), y = cy - r * Math.sin(a);
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  // default numbered pattern for a face
  function drawPattern(ctx, idx) {
    const c = PALETTE[idx % PALETTE.length];
    const g = ctx.createRadialGradient(TEX / 2, TEX / 2, 10, TEX / 2, TEX / 2, TEX / 2);
    g.addColorStop(0, shade(c, 0.45));
    g.addColorStop(1, c);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TEX, TEX);
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 6;
    for (let r = 0.25; r < 1; r += 0.25) { hexPath(ctx, TEX / 2, TEX / 2, TR * r); ctx.stroke(); }
    // radial stripes in alternating sectors so rearranged pieces are visible
    for (let i = 0; i < 6; i++) {
      const a0 = ((90 - 60 * i) * Math.PI) / 180;
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.06)';
      ctx.beginPath();
      ctx.moveTo(TEX / 2, TEX / 2);
      ctx.lineTo(TEX / 2 + TR * Math.cos(a0), TEX / 2 - TR * Math.sin(a0));
      const a1 = a0 - Math.PI / 3;
      ctx.lineTo(TEX / 2 + TR * Math.cos(a1), TEX / 2 - TR * Math.sin(a1));
      ctx.fill();
    }
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${TEX * 0.36}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 12;
    ctx.fillText(String(idx + 1), TEX / 2, TEX / 2 + TEX * 0.02);
    ctx.shadowBlur = 0;
    // small marks near the corners
    ctx.font = `bold ${TEX * 0.075}px system-ui, sans-serif`;
    for (let i = 0; i < 6; i++) {
      const a = ((90 - 60 * i) * Math.PI) / 180;
      ctx.fillText('★', TEX / 2 + TR * 0.72 * Math.cos(a), TEX / 2 - TR * 0.72 * Math.sin(a));
    }
  }
  function shade(hex, t) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    r = Math.round(r + (255 - r) * t); g = Math.round(g + (255 - g) * t); b = Math.round(b + (255 - b) * t);
    return `rgb(${r},${g},${b})`;
  }

  // face spec: {img, cx, cy, radius (image px of hexagon radius), rot (rad)}
  function renderFace(canvas, spec, idx) {
    if (spec && spec.earth && root.Earth) return root.Earth.renderFace(canvas, spec, spec.preview ? TEX / 2 : TEX);
    canvas.width = TEX; canvas.height = TEX;
    const ctx = canvas.getContext('2d');
    ctx.save();
    if (spec && spec.img) {
      ctx.fillStyle = '#ddd';
      ctx.fillRect(0, 0, TEX, TEX);
      ctx.translate(TEX / 2, TEX / 2);
      ctx.rotate(-spec.rot);
      const s = TR / spec.radius;
      ctx.scale(s, s);
      ctx.translate(-spec.cx, -spec.cy);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(spec.img, 0, 0);
    } else {
      drawPattern(ctx, idx);
    }
    ctx.restore();
    return canvas;
  }

  // draw texture triangle (src: 3 px points in the image) to dst (3 points)
  function texTri(ctx, img, src, dst, alpha) {
    const [s0, s1, s2] = src, [d0, d1, d2] = dst;
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    if (Math.abs(den) < 1e-9) return;
    // solve affine: d = M s + t
    const ax = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den;
    const bx = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const ay = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den;
    const by = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    const tx = d0[0] - ax * s0[0] - bx * s0[1];
    const ty = d0[1] - ay * s0[0] - by * s0[1];
    // slightly enlarged clip to hide seams
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3;
    const grow = (p) => {
      const dx = p[0] - cx, dy = p[1] - cy, L = Math.hypot(dx, dy) || 1;
      return [p[0] + (dx / L) * 0.6, p[1] + (dy / L) * 0.6];
    };
    const g0 = grow(d0), g1 = grow(d1), g2 = grow(d2);
    ctx.save();
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(g0[0], g0[1]); ctx.lineTo(g1[0], g1[1]); ctx.lineTo(g2[0], g2[1]);
    ctx.closePath();
    ctx.clip();
    ctx.transform(ax, ay, bx, by, tx, ty);
    ctx.drawImage(img, 0, 0);
    ctx.restore();
  }

  function triPath(ctx, p) {
    ctx.beginPath();
    ctx.moveTo(p[0][0], p[0][1]); ctx.lineTo(p[1][0], p[1][1]); ctx.lineTo(p[2][0], p[2][1]);
    ctx.closePath();
  }

  // glue pattern
  let gluePat = null;
  function glueFill(ctx) {
    if (!gluePat) {
      const c = document.createElement('canvas');
      c.width = c.height = 12;
      const g = c.getContext('2d');
      g.fillStyle = '#e6e6e6'; g.fillRect(0, 0, 12, 12);
      g.strokeStyle = '#b5b5b5'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(0, 12); g.lineTo(12, 0); g.stroke();
      gluePat = c;
    }
    return ctx.createPattern(gluePat, 'repeat');
  }

  /*
   * Camera: world z is up (towards viewer), hexagon/strip in the xy plane.
   * tilt rotates around the x axis so the scene is seen slightly from the front.
   */
  function makeCamera(opts) {
    const tilt = opts.tilt || 0;
    const D = opts.dist || 8;
    const ct = Math.cos(tilt), st = Math.sin(tilt);
    const f = opts.scale;
    const cx = opts.cx, cy = opts.cy;
    const ox = opts.ox || 0, oy = opts.oy || 0;
    function toCam(p) {
      const x = p[0] - ox, y = p[1] - oy, z = p[2] || 0;
      return [x, y * ct + z * st, -y * st + z * ct];
    }
    function project(p) {
      const c = toCam(p);
      const depth = D - c[2];
      const k = D / depth;
      return [cx + f * c[0] * k, cy - f * c[1] * k, depth];
    }
    // is the normal of triangle (a,b,c) facing the camera?
    function facing(a, b, c) {
      const A = toCam(a), B = toCam(b), C = toCam(c);
      const u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]];
      const v = [C[0] - A[0], C[1] - A[1], C[2] - A[2]];
      const nrm = [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
      const cam = [-A[0], -A[1], D - A[2]];
      return nrm[0] * cam[0] + nrm[1] * cam[1] + nrm[2] * cam[2] > 0;
    }
    return { project, facing, toCam, D };
  }

  /*
   * Draw a list of 3D triangles.  Each item:
   *  {pts:[a,b,c] (3D), front: content, back: content, order (painter key),
   *   outline, highlight}
   * content = {img, uv:[[px],[px],[px]]} | {glue:true} | {color}
   */
  function drawScene(ctx, cam, items, opts = {}) {
    const proj = items.map((it) => {
      const P = it.pts.map((p) => cam.project(p));
      const depth = (P[0][2] + P[1][2] + P[2][2]) / 3;
      return { it, P, depth };
    });
    if (opts.sortByDepth) proj.sort((a, b) => b.depth - a.depth || (a.it.order || 0) - (b.it.order || 0));
    else proj.sort((a, b) => (a.it.order || 0) - (b.it.order || 0));
    for (const { it, P } of proj) {
      const pts2 = P.map((p) => [p[0], p[1]]);
      const showFront = cam.facing(it.pts[0], it.pts[1], it.pts[2]);
      const content = showFront ? it.front : it.back;
      paintContent(ctx, content, pts2);
      if (it.shade) {
        triPath(ctx, pts2);
        ctx.fillStyle = it.shade;
        ctx.fill();
      }
      if (it.outline !== false) {
        triPath(ctx, pts2);
        ctx.strokeStyle = it.outlineColor || 'rgba(0,0,0,0.35)';
        ctx.lineWidth = it.outlineWidth || 1;
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
      if (it.label && opts.labels) {
        const c = [(pts2[0][0] + pts2[1][0] + pts2[2][0]) / 3, (pts2[0][1] + pts2[1][1] + pts2[2][1]) / 3];
        const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
        const size = Math.max(9 * dpr, Math.min(17 * dpr, Math.hypot(pts2[1][0] - pts2[0][0], pts2[1][1] - pts2[0][1]) * 0.24));
        ctx.font = `bold ${size}px system-ui, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3 * dpr; ctx.strokeStyle = 'rgba(255,255,255,0.9)';
        ctx.strokeText(it.label, c[0], c[1]);
        ctx.fillStyle = '#222';
        ctx.fillText(it.label, c[0], c[1]);
      }
    }
    return proj;
  }

  function paintContent(ctx, content, pts2) {
    if (!content) return;
    if (content.img) {
      texTri(ctx, content.img, content.uv, pts2);
    } else if (content.glue) {
      triPath(ctx, pts2);
      ctx.fillStyle = glueFill(ctx);
      ctx.fill();
    } else if (content.color) {
      triPath(ctx, pts2);
      ctx.fillStyle = content.color;
      ctx.fill();
    }
  }

  root.Render = { TEX, TR, PALETTE, uvPx, hexPath, renderFace, texTri, triPath, glueFill, makeCamera, drawScene, paintContent };
})(window);
