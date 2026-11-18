// 挑战模式：随机生成有解的关卡。
// 曲面 S：亏格 g，b 个边界圆，每个边界圆上至少一个标记点，没有穿孔。这正是 Ice and mirrors 第二节
// 的假设 (surface-assumption)，Theorem (surface-quiver) 说这时 SL_n 的 Fock–Goncharov 箭图（任何种子）
// 都是 sub-peelable 的，所以每一关都有解（可能要加辅助顶点）。
// 做法：把 S 写成多边形粘合（和 tools/fg_surface.py 的 fg_polygon 一样），从 0 号角扇形剖分，
// 算出 FG 箭图（去掉边界上的 frozen 顶点），再随机突变几次打乱，最后用 stress 布局摆位置。
// 浏览器里挂在 window.PeelChallenge 上，node 里 require（测试用）。
(function (root) {
  'use strict';

  // 可复现的伪随机数（mulberry32）
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // 顶点数：内部弧 E = 6g+3b-6+M，三角形 T = 4g+2b-4+M，每条弧 n-1 个点，每个三角形 (n-1)(n-2)/2 个点
  function countVertices(g, ms, n) {
    const b = ms.length, M = ms.reduce((x, y) => x + y, 0);
    const E = 6 * g + 3 * b - 6 + M, T = 4 * g + 2 * b - 4 + M;
    return E * (n - 1) + T * (n - 1) * (n - 2) / 2;
  }

  // 多边形的边（逆时针）：同名的两条边反向粘合，null 是边界。
  //   每个柄: a b a b（即 a b a⁻¹ b⁻¹）；第 j ≥ 2 个边界圆: c_j, m_j 条边界边, c_j；最后 m_1 条边界边
  function polygonWord(g, ms) {
    const w = [];
    for (let h = 0; h < g; h++) w.push('a' + h, 'b' + h, 'a' + h, 'b' + h);
    for (let j = 1; j < ms.length; j++) { w.push('c' + j); for (let k = 0; k < ms[j]; k++) w.push(null); w.push('c' + j); }
    for (let k = 0; k < ms[0]; k++) w.push(null);
    return w;
  }

  // 多边形角粘合后的等价类都要碰到边界边（否则就是穿孔）
  function noPunctures(sides) {
    const m = sides.length, par = [...Array(m).keys()];
    const find = x => par[x] === x ? x : (par[x] = find(par[x]));
    const first = {};
    sides.forEach((s, i) => {
      if (s === null) return;
      if (!(s in first)) { first[s] = i; return; }
      const j = first[s];                              // 边 j: j→j+1 与边 i: i→i+1 反向粘合
      par[find(j)] = find((i + 1) % m);
      par[find((j + 1) % m)] = find(i);
    });
    const onBdry = new Set();
    sides.forEach((s, i) => { if (s === null) { onBdry.add(find(i)); onBdry.add(find((i + 1) % m)); } });
    return [...Array(m).keys()].every(i => onBdry.has(find(i)));
  }

  // tools/fg_surface.py 的 fg_polygon 的 JS 版本，返回 mutable 部分的反对称矩阵
  function fgPolygon(sides, n) {
    const m = sides.length, first = {};
    sides.forEach((s, i) => { if (s !== null && !(s in first)) first[s] = i; });
    function sideInfo(u, v) {
      if ((v - u + m) % m === 1) {
        const s = sides[u];
        return s === null ? null : [s, first[s] === u ? u : v];
      }
      if ((u - v + m) % m === 1) {
        const s = sides[v];
        return s === null ? null : [s, first[s] === v ? v : u];
      }
      return ['d' + Math.max(u, v), 0];
    }
    const verts = new Map(), arrows = new Map();
    const vid = k => { if (!verts.has(k)) verts.set(k, verts.size); return verts.get(k); };
    function point(Q, t, [a, b, c]) {
      if (Math.min(a, b, c) > 0) return `T${t},${a},${b},${c}`;
      if ([a, b, c].filter(x => x === 0).length >= 2) return null;     // 角
      let u, v, du;
      if (c === 0) [u, v, du] = [Q[0], Q[1], b];
      else if (a === 0) [u, v, du] = [Q[1], Q[2], c];
      else [u, v, du] = [Q[2], Q[0], a];
      const si = sideInfo(u, v);
      if (!si) return null;                                            // 边界上：frozen
      return `E${si[0]},${si[1] === u ? du : n - du}`;
    }
    for (let t = 1; t < m - 1; t++) {
      const Q = [0, t, t + 1];
      for (let a = 0; a <= n - 2; a++) for (let b = 0; a + b <= n - 2; b++) {
        const c = n - 2 - a - b;
        const P = point(Q, t, [a + 1, b + 1, c]), Qp = point(Q, t, [a, b + 1, c + 1]), R = point(Q, t, [a + 1, b, c + 1]);
        for (const [x, y] of [[P, Qp], [Qp, R], [R, P]]) {
          if (x === null || y === null) continue;
          const i = vid(x), j = vid(y), k1 = i + ',' + j, k2 = j + ',' + i;
          arrows.set(k1, (arrows.get(k1) || 0) + 1);
          arrows.set(k2, (arrows.get(k2) || 0) - 1);
        }
      }
    }
    const N = verts.size, B = Array.from({ length: N }, () => new Array(N).fill(0));
    for (const [k, v] of arrows) { const [i, j] = k.split(',').map(Number); B[i][j] += v; }
    return B;
  }

  function mutate(B, k) {
    return B.map((row, i) => row.map((x, j) =>
      i === k || j === k ? 0 - x : x + Math.sign(B[i][k]) * Math.max(B[i][k] * B[k][j], 0)));
  }
  const hasSinkSource = B => B.some((_, s) => B.every(r => r[s] >= 0) || B.every(r => r[s] <= 0));
  const maxMult = B => Math.max(0, ...B.map(r => Math.max(...r.map(Math.abs))));

  // stress 布局（Zheng–Pawar–Goodman 的 SGD）：让画面距离接近图距离
  function layoutStress(B, rand) {
    const N = B.length, INF = 1e9;
    const d = Array.from({ length: N }, () => new Array(N).fill(INF));
    for (let s = 0; s < N; s++) {
      d[s][s] = 0; const q = [s];
      while (q.length) {
        const u = q.shift();
        for (let v = 0; v < N; v++) if (B[u][v] !== 0 && d[s][v] === INF) { d[s][v] = d[s][u] + 1; q.push(v); }
      }
    }
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) if (d[i][j] === INF) d[i][j] = 3;
    const x = Array.from({ length: N }, (_, i) => [Math.cos(2 * Math.PI * i / N) * N / 3 + rand(), Math.sin(2 * Math.PI * i / N) * N / 3 + rand()]);
    const pairs = [];
    for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) pairs.push([i, j]);
    const dmax = Math.max(1, ...pairs.map(([i, j]) => d[i][j]));
    const etaMax = dmax * dmax, etaMin = 0.01, T = 60;
    for (let t = 0; t < T; t++) {
      const eta = etaMax * Math.exp(Math.log(etaMin / etaMax) * t / (T - 1));
      for (let k = pairs.length - 1; k > 0; k--) { const r = Math.floor(rand() * (k + 1)); [pairs[k], pairs[r]] = [pairs[r], pairs[k]]; }
      for (const [i, j] of pairs) {
        const dij = d[i][j], w = 1 / (dij * dij), mu = Math.min(1, eta * w);
        let dx = x[i][0] - x[j][0], dy = x[i][1] - x[j][1], len = Math.hypot(dx, dy);
        if (len < 1e-9) { dx = rand() - 0.5; dy = rand() - 0.5; len = Math.hypot(dx, dy); }
        const r = mu * (len - dij) / 2 / len;
        x[i][0] -= r * dx; x[i][1] -= r * dy; x[j][0] += r * dx; x[j][1] += r * dy;
      }
    }
    // 把靠得太近的顶点推开（图距离 1 的顶点相距约 1）
    for (let t = 0; t < 50; t++) {
      let moved = false;
      for (const [i, j] of pairs) {
        const dx = x[i][0] - x[j][0], dy = x[i][1] - x[j][1], len = Math.hypot(dx, dy) || 1e-6, MIN = 0.8;
        if (len >= MIN) continue;
        const r = (MIN - len) / 2 / len;
        x[i][0] += r * dx; x[i][1] += r * dy; x[j][0] -= r * dx; x[j][1] -= r * dy; moved = true;
      }
      if (!moved) break;
    }
    // 转到主轴水平（画布是横的）
    const cx = x.reduce((a, p) => a + p[0], 0) / N, cy = x.reduce((a, p) => a + p[1], 0) / N;
    let sxx = 0, syy = 0, sxy = 0;
    for (const p of x) { const u = p[0] - cx, v = p[1] - cy; sxx += u * u; syy += v * v; sxy += u * v; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(th), sn = Math.sin(th);
    return x.map(p => {
      const u = p[0] - cx, v = p[1] - cy;
      return [Math.round((c * u + sn * v) * 1000) / 1000, Math.round((-sn * u + c * v) * 1000) / 1000];
    });
  }

  // 所有可选的曲面：g ≤ 2，b ≤ 3，每个边界圆 1..4 个标记点，n = 2, 3, 4，顶点数 3..28。
  // 去掉 UNVERIFIED 里的曲面：对它们的三角剖分箭图，tools/solve_aux.py 的贪心求解器（BFS 深度 ≤ 5，限时）
  // 没找到不加顶点的剥法（例如 2:1:1 就是第 3 关，3:1:1 是第 5 关）。其余每种曲面的箭图都被求解器剥空过，
  // 而 peelable 在突变下不变，所以挑战模式的每一关都能不加辅助顶点剥完。键是 "n:g:各边界圆的标记点数"。
  const UNVERIFIED = new Set(('2:1:1 2:2:1 3:0:1-1-1 3:0:2-1-1 3:0:2-2-1 3:0:2-2-2 3:0:3-1-1 3:0:3-2-1 3:0:3-3 3:0:4-1-1 ' +
    '3:0:4-2 3:0:4-3 3:0:4-4 3:1:1 3:1:1-1 3:1:2 3:1:2-1 3:1:2-2 3:1:3 3:1:3-1 3:1:4 3:2:1 4:0:1-1 4:0:2-1 4:0:2-2 ' +
    '4:0:3-1 4:1:1 4:1:2').split(' '));
  const surfaceKey = s => `${s.n}:${s.g}:${s.ms.join('-')}`;
  const ALL_SURFACES = [], SURFACES = [];
  (function () {
    function parts(b, maxEach) {                       // 边界标记点数，按不增排列（交换边界圆是同一个曲面）
      const out = [];
      (function rec(pre, left, mx) {
        if (left === 0) { out.push(pre); return; }
        for (let k = mx; k >= 1; k--) rec(pre.concat([k]), left - 1, k);
      })([], b, maxEach);
      return out;
    }
    for (const n of [2, 3, 4]) for (let g = 0; g <= 2; g++) for (let b = 1; b <= 3; b++) {
      for (const ms of parts(b, g === 0 && b === 1 ? 9 : 4)) {
        const M = ms.reduce((x, y) => x + y, 0);
        if (g === 0 && b === 1 && M < 4) continue;    // 圆盘至少 4 个标记点才有内部弧
        const V = countVertices(g, ms, n);
        if (V < 3 || V > 28) continue;
        ALL_SURFACES.push({ g, ms, n, V });
        if (!UNVERIFIED.has(surfaceKey({ g, ms, n }))) SURFACES.push({ g, ms, n, V });
      }
    }
  })();

  // 第 round 关的顶点数范围：越往后越大
  function sizeRange(round) {
    const lo = Math.min(3 + Math.floor((round - 1) / 2), 18), hi = Math.min(5 + round + Math.floor(round / 3), 28);
    return [lo, hi];
  }

  function generate(round, seed) {
    const rand = rng(seed);
    const [lo, hi] = sizeRange(round);
    const pool = SURFACES.filter(s => s.V >= lo && s.V <= hi);
    const surf = pool[Math.floor(rand() * pool.length)];
    const sides = polygonWord(surf.g, surf.ms);
    let B = fgPolygon(sides, surf.n);
    // 随机突变打乱：箭头重数保持 ≤ 2，尽量停在没有汇点/源点的箭图上
    const want = B.length + Math.floor(rand() * B.length);
    let done = 0, tries = 0, last = -1;
    while ((done < want || hasSinkSource(B)) && tries < 40 * B.length) {
      tries++;
      const k = Math.floor(rand() * B.length);
      if (k === last) continue;
      const C = mutate(B, k);
      if (maxMult(C) > 2) continue;
      B = C; last = k; done++;
    }
    // 顶点编号打乱后从 1 开始
    const perm = [...Array(B.length).keys()];
    for (let k = perm.length - 1; k > 0; k--) { const r = Math.floor(rand() * (k + 1)); [perm[k], perm[r]] = [perm[r], perm[k]]; }
    B = perm.map(i => perm.map(j => B[i][j]));
    return {
      B, pos: layoutStress(B, rand), labels: B.map((_, i) => i + 1),
      surface: { g: surf.g, ms: surf.ms.slice(), n: surf.n }, mutations: done,
    };
  }

  // 曲面的文字描述
  const SUBN = { 2: '₂', 3: '₃', 4: '₄' };
  function describe(s, mutations, lang) {
    const b = s.ms.length, n = SUBN[s.n], ms = s.ms;
    if (lang === 'zh') {
      const NUM = ['零', '一', '两', '三', '四'];
      let surf;
      if (s.g === 0 && b === 1) surf = `圆盘，边界上有 ${ms[0]} 个标记点`;
      else {
        const base = s.g === 0 ? (b === 2 ? '圆环' : '挖掉三个圆盘的球面（裤衩）') : `挖掉${NUM[b]}个圆盘的${s.g === 1 ? '环面' : '亏格 2 曲面'}`;
        surf = b === 1 ? `${base}，边界上有 ${ms[0]} 个标记点` : `${base}，${b} 个边界圆上分别有 ${ms.join('、')} 个标记点`;
      }
      return `SL${n} 的 Fock–Goncharov 箭图${s.n === 2 ? '（也就是理想三角剖分的箭图）' : ''}，曲面是${surf}。` +
        `从一个三角剖分的箭图出发，随机突变了 ${mutations} 次。边界上的顶点是冻结的，这里去掉了。` +
        '所有标记点都在边界上、没有穿孔，所以由 Ice and mirrors 的 Theorem 2.1，这个箭图是子可剥的。挑战模式只用电脑验证过的曲面：它们的箭图不加辅助顶点就能剥完。';
    }
    const word = k => ['zero', 'one', 'two', 'three', 'four'][k];
    let surf;
    if (s.g === 0 && b === 1) surf = `a disk with ${ms[0]} marked points on its boundary`;
    else {
      const base = s.g === 0 ? (b === 2 ? 'an annulus' : 'a pair of pants (a sphere with three disks removed)')
        : `${s.g === 1 ? 'a torus' : 'a genus-2 surface'} with ${b === 1 ? 'a disk' : word(b) + ' disks'} removed`;
      surf = b === 1 ? `${base}, with ${ms[0]} marked point${ms[0] > 1 ? 's' : ''} on the boundary`
        : `${base}, with ${ms.join(', ').replace(/, (\d+)$/, ' and $1')} marked points on its ${b} boundary circles`;
    }
    return `The Fock–Goncharov quiver for SL${n}${s.n === 2 ? ' (the quiver of an ideal triangulation)' : ''} on ${surf}. ` +
      `Starting from the quiver of a triangulation, ${mutations} random mutations were applied. The vertices on the boundary are frozen and left out. ` +
      'Every marked point is on the boundary and there are no punctures, so by Theorem 2.1 of Ice and mirrors the quiver is sub-peelable. Challenge mode only uses surfaces checked by computer: their quivers can be peeled without auxiliary nodes.';
  }

  const api = { rng, countVertices, polygonWord, noPunctures, fgPolygon, ALL_SURFACES, SURFACES, surfaceKey, sizeRange, generate, describe };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.PeelChallenge = api;
})(typeof window !== 'undefined' ? window : globalThis);
