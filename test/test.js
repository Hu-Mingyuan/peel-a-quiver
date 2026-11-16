// 运行：node test/test.js
const assert = require('assert');
const Q = require('../web/quiver.js');

// Keller applet 的原始写法（src/MutationApplet.js 里的 strangeprod），用来对照。
function kellerMutate(A, k) {
  const sign = p => Math.sign(p);
  const strangeprod = (p, q) => (sign(p) * sign(q) < 0 ? 0 : sign(p) > 0 ? p * q : -(p * q));
  return A.map((row, i) => row.map((a, j) => (i === k || j === k ? 0 - a : a + strangeprod(A[i][k], A[k][j]))));
}

function randomQuiver(n) {
  const B = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
    const v = Math.floor(Math.random() * 7) - 3;
    B[i][j] = v; B[j][i] = 0 - v;
  }
  return B;
}

// 1. 和 Keller 一致；mutation 是对合
for (let t = 0; t < 2000; t++) {
  const n = 1 + Math.floor(Math.random() * 7);
  const B = randomQuiver(n), k = Math.floor(Math.random() * n);
  assert.deepStrictEqual(Q.mutate(B, k), kellerMutate(B, k));
  assert.deepStrictEqual(Q.mutate(Q.mutate(B, k), k), B);
}

// 2. W 加顶点 5（4→5→3），mutate 5,3,1,2,5 得到 B_{R'}
const BW = [[0, 2, -1, -1], [-2, 0, 1, 1], [1, -1, 0, 1], [1, -1, -1, 0]];
let B = Q.addVertex(BW);
B = Q.addArrow(B, 3, 4); // 4→5
B = Q.addArrow(B, 4, 2); // 5→3
for (const k of [5, 3, 1, 2, 5]) B = Q.mutate(B, k - 1);
const BRp = [[0, 1, -2, 1, 0], [-1, 0, 1, 0, 1], [2, -1, 0, -1, 0], [-1, 0, 1, 0, 1], [0, -1, 0, -1, 0]];
assert.deepStrictEqual(B, BRp);
assert.ok(Q.isSink(B, 4));

// 3. 按这个解法把 W 整个剥完：删 5，mutate 2,4，再一路剥 sink/source
B = Q.deleteVertex(B, 4);
for (const k of [2, 4]) B = Q.mutate(B, k - 1);
let steps = 0;
while (B.length > 0) {
  const s = B.findIndex((_, i) => Q.isSink(B, i) || Q.isSource(B, i));
  assert.ok(s >= 0, 'acyclic quiver 一定有 sink');
  B = Q.deleteVertex(B, s);
  steps++;
}
assert.strictEqual(steps, 4);

// 4. W 本身没有 sink/source；mutate 一次后仍然没有
assert.ok(BW.every((_, i) => !Q.isSink(BW, i) && !Q.isSource(BW, i)));
for (let k = 0; k < 4; k++) {
  const M = Q.mutate(BW, k);
  assert.ok(M.every((_, i) => !Q.isSink(M, i) && !Q.isSource(M, i)));
}

// 5. 反向加箭头会抵消
assert.deepStrictEqual(Q.addArrow(Q.addArrow([[0, 0], [0, 0]], 0, 1), 1, 0), [[0, 0], [0, 0]]);

// 6. Markov quiver（Level ∞）：mutation 等价类只有它自己（反向），永远没有 sink/source
const BM = [[0, 2, -2], [-2, 0, 2], [2, -2, 0]];
const seen = new Set([JSON.stringify(BM)]), queue = [BM];
while (queue.length) {
  const M = queue.shift();
  assert.ok(M.every((_, i) => !Q.isSink(M, i) && !Q.isSource(M, i)));
  for (let k = 0; k < 3; k++) {
    const N = Q.mutate(M, k), key = JSON.stringify(N);
    if (!seen.has(key)) { seen.add(key); queue.push(N); }
  }
}
assert.strictEqual(seen.size, 2);

// 7. Level 0（定向三角形）：在任意顶点 mutate 一次后就是 acyclic，可以剥完
const B0 = [[0, 1, -1], [-1, 0, 1], [1, -1, 0]];
assert.ok(B0.every((_, i) => !Q.isSink(B0, i) && !Q.isSource(B0, i)));
for (let k = 0; k < 3; k++) {
  let M = Q.mutate(B0, k);
  while (M.length) {
    const s = M.findIndex((_, i) => Q.isSink(M, i) || Q.isSource(M, i));
    assert.ok(s >= 0);
    M = Q.deleteVertex(M, s);
  }
}

// 8. Level 1（FG SL_4 四边形）：和 tools/fg.js 生成的一致，并且按求解器找到的解能剥完
const { fgQuad } = require('../tools/fg.js');
const B2 = fgQuad(4).B;
function play(B, moves) {
  let labels = B.map((_, i) => i + 1);
  for (const mv of moves) {
    const [op, l] = mv.split(' '), i = labels.indexOf(Number(l));
    assert.ok(i >= 0, mv);
    if (op === 'mu') B = Q.mutate(B, i);
    else {
      assert.ok(Q.isSink(B, i) || Q.isSource(B, i), `${mv} 不是 sink/source`);
      B = Q.deleteVertex(B, i); labels = labels.filter((_, j) => j !== i);
    }
  }
  return B;
}
const sol2 = 'mu 1,mu 2,mu 4,mu 3,peel 7,peel 3,mu 4,mu 5,mu 2,mu 1,peel 4,peel 5,peel 1,mu 6,peel 2,peel 8,peel 6,peel 9'.split(',');
assert.strictEqual(play(B2, sol2).length, 0);

console.log('all tests passed');
