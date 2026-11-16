// 生成两个三角形拼成的四边形上的 Fock–Goncharov SL_n quiver（只保留 mutable 顶点）。
// 坐标约定照论文 eq (grid-labels)：正方形 [0,n]^2，对角线 (0,0)-(n,n)。
//   x 三角形: x(a,b,c) = (b+c, c)，边界边 c=0（底边）
//   y 三角形: y(a,b,c) = (b, b+c)，边界边 a=0（顶边）
// 每个三角形里，对每个 a+b+c=n-2 加定向圈
//   (a+1,b+1,c) -> (a,b+1,c+1) -> (a+1,b,c+1) -> (a+1,b+1,c)
// 两个三角形的箭头相加（自动抵消反向箭头）。四边形的四条边都是边界，上面的顶点 frozen，去掉。
// 用法：node tools/fg.js [n]
'use strict';

function fgQuad(n) {
  const arrows = new Map(); // "p|q" -> 条数（p->q 为正）
  const key = (p, q) => `${p[0]},${p[1]}|${q[0]},${q[1]}`;
  function add(p, q) {
    const k = key(p, q), kr = key(q, p);
    if (arrows.has(kr)) {
      const v = arrows.get(kr) - 1;
      if (v === 0) arrows.delete(kr); else arrows.set(kr, v);
    } else arrows.set(k, (arrows.get(k) || 0) + 1);
  }
  const maps = [
    ([a, b, c]) => [b + c, c],      // x
    ([a, b, c]) => [b, b + c],      // y
  ];
  for (const m of maps) {
    for (let a = 0; a <= n - 2; a++) for (let b = 0; a + b <= n - 2; b++) {
      const c = n - 2 - a - b;
      const P = m([a + 1, b + 1, c]), Qp = m([a, b + 1, c + 1]), R = m([a + 1, b, c + 1]);
      add(P, Qp); add(Qp, R); add(R, P);
    }
  }
  // mutable 顶点：不在正方形四条边上，且不是角
  const onBoundary = ([i, j]) => i === 0 || j === 0 || i === n || j === n;
  const verts = new Map();
  for (const k of arrows.keys()) for (const s of k.split('|')) {
    const p = s.split(',').map(Number);
    if (!onBoundary(p)) verts.set(s, p);
  }
  const list = [...verts.values()].sort((u, v) => u[1] - v[1] || u[0] - v[0]);
  const idx = new Map(list.map((p, i) => [`${p[0]},${p[1]}`, i]));
  const B = list.map(() => new Array(list.length).fill(0));
  for (const [k, m] of arrows) {
    const [s, t] = k.split('|');
    if (idx.has(s) && idx.has(t)) { B[idx.get(s)][idx.get(t)] += m; B[idx.get(t)][idx.get(s)] -= m; }
  }
  return { pos: list, B, allArrows: arrows };
}

function name([i, j]) {
  if (i === j) return `D${i}`;
  return i > j ? `X${i},${j}` : `Y${i},${j}`;
}

if (require.main === module) {
  const n = parseInt(process.argv[2] || '4', 10);
  const { pos, B } = fgQuad(n);
  console.log(`n=${n}: ${pos.length} mutable vertices`);
  pos.forEach((p, i) => {
    const out = B[i].map((v, j) => (v > 0 ? `${name(pos[j])}${v > 1 ? '×' + v : ''}` : null)).filter(Boolean);
    console.log(`  ${name(p)} (${p}) -> ${out.join(', ')}`);
  });
}

module.exports = { fgQuad, name };
