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

// 9. Level 4（亏格 2，一个 marked point）：加顶点 11（4→11→10）后按这条解能剥完
const B3 = [[0, 0, 1, 0, -2, 1, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0, -1, 1, -1, 1], [-1, 0, 0, 0, 1, -1, 1, 0, 0, 0],
  [0, 0, 0, 0, 0, 0, 0, -1, 1, -1], [2, 0, -1, 0, 0, -1, 0, 0, 0, 0], [-1, 0, 1, 0, 1, 0, -1, 0, 0, 0],
  [0, 1, -1, 0, 0, 1, 0, -1, 0, 0], [0, -1, 0, 1, 0, 0, 1, 0, -1, 0], [0, 1, 0, -1, 0, 0, 0, 1, 0, -1],
  [0, -1, 0, 1, 0, 0, 0, 0, 1, 0]];
assert.ok(B3.every((_, i) => !Q.isSink(B3, i) && !Q.isSource(B3, i)));
let B3e = Q.addVertex(B3);
B3e = Q.addArrow(B3e, 3, 10); // 4 -> 11
B3e = Q.addArrow(B3e, 10, 9); // 11 -> 10
const sol3 = ('mu 11,mu 4,mu 9,mu 10,peel 4,mu 2,mu 8,mu 10,peel 11,peel 8,peel 10,mu 2,peel 9,peel 2,' +
  'mu 7,mu 3,mu 1,mu 5,peel 7,mu 5,mu 6,peel 1,peel 3,peel 5,peel 6').split(',');
assert.strictEqual(play(B3e, sol3).length, 0);

// 10. Level 2（FG SL_3 annulus）：和 tools/fg_surface.py 一致（见注释），没有 sink/source，按这条 6 次 mutation 的解能剥完
const B1 = [[0, 1, -1, -1, 1, 0], [-1, 0, 1, 0, 0, 1], [1, -1, 0, 0, 0, -1],
  [1, 0, 0, 0, 1, -1], [-1, 0, 0, -1, 0, 1], [0, -1, 1, 1, -1, 0]];
assert.ok(B1.every((_, i) => !Q.isSink(B1, i) && !Q.isSource(B1, i)));
const sol1 = 'mu 1,mu 4,peel 2,mu 4,mu 5,peel 3,mu 1,mu 6,peel 4,peel 1,peel 5,peel 6'.split(',');
assert.strictEqual(play(B1, sol1).length, 0);

// 关卡数据直接从 web/index.html 里读，保证测的就是游戏里的关卡
const html = require('fs').readFileSync(require('path').join(__dirname, '../web/index.html'), 'utf8');
const LEVELS = new Function('return ' + html.match(/const LEVELS = (\[[\s\S]*?\n  \]);/)[1])();
const lvById = id => LEVELS.find(lv => lv.id === id);
for (const lv of LEVELS) {
  assert.strictEqual(lv.B.length, lv.labels.length, lv.id);
  assert.strictEqual(lv.pos.length, lv.labels.length, lv.id);
  lv.B.forEach((r, i) => r.forEach((x, j) => assert.strictEqual(x, 0 - lv.B[j][i], lv.id)));
}

// 11. Level 5（FG SL_3，挖掉一个圆盘的环面）：11 个顶点，一开始没有 sink/source
const B5 = lvById('level-5').B;
assert.strictEqual(B5.length, 11);
assert.ok(B5.every((_, i) => !Q.isSink(B5, i) && !Q.isSource(B5, i)));

// 12. 特殊关（SL_5 长条，N=2）：按论文 Proposition (strip) 的顺序做 deletion move（每次剥完再把 mutation 倒回去），
//     从不 mutate 或剥锁住的顶点，最后 ℓ 上的顶点全部剥掉
const SP = lvById('level-special');
assert.deepStrictEqual(SP.locked, [1,  2,  3,  4,  41,  42,  43,  44]);
assert.deepStrictEqual(SP.goal, [21,  22,  23,  24]);
const solSP = ('mu 17,mu 14,mu 11,mu 13,mu 10,mu 9,mu 7,mu 6,mu 5,peel 8,mu 5,mu 6,mu 7,mu 9,mu 10,mu 13,mu 11,' +
  'mu 14,mu 17,mu 11,mu 14,mu 12,mu 15,mu 16,mu 18,mu 19,mu 20,peel 17,mu 20,mu 19,mu 18,mu 16,' +
  'mu 15,mu 12,mu 14,mu 11,mu 24,mu 23,mu 22,mu 20,mu 19,mu 16,mu 18,mu 15,mu 12,peel 21,mu 12,' +
  'mu 15,mu 18,mu 16,mu 19,mu 20,mu 22,mu 23,mu 24,mu 22,mu 23,mu 25,mu 26,mu 29,mu 27,mu 30,mu 33,' +
  'peel 24,mu 33,mu 30,mu 27,mu 29,mu 26,mu 25,mu 23,mu 22,mu 37,mu 34,mu 31,mu 33,mu 30,mu 29,' +
  'mu 27,mu 26,mu 25,peel 28,mu 25,mu 26,mu 27,mu 29,mu 30,mu 33,mu 31,mu 34,mu 37,mu 31,mu 34,' +
  'mu 32,mu 35,mu 36,mu 38,mu 39,mu 40,peel 37,mu 40,mu 39,mu 38,mu 36,mu 35,mu 32,mu 34,mu 31,' +
  'mu 18,mu 19,peel 20,mu 19,mu 18,mu 18,mu 15,peel 12,mu 15,mu 18,mu 27,mu 30,peel 33,mu 30,mu 27,' +
  'mu 27,mu 26,peel 25,mu 26,mu 27,mu 23,mu 19,mu 16,peel 22,mu 16,mu 19,mu 23,mu 26,mu 29,peel 23,' +
  'mu 29,mu 26').split(',');
let BS = SP.B, labS = SP.labels.slice();
for (const mv of solSP) {
  const [op, l] = mv.split(' '), i = labS.indexOf(Number(l));
  assert.ok(i >= 0 && !SP.locked.includes(Number(l)), mv);
  if (op === 'mu') BS = Q.mutate(BS, i);
  else {
    assert.ok(Q.isSink(BS, i) || Q.isSource(BS, i), `${mv} 不是 sink/source`);
    BS = Q.deleteVertex(BS, i); labS = labS.filter((_, j) => j !== i);
  }
}
assert.ok(SP.goal.every(g => !labS.includes(g)));
assert.ok(SP.locked.every(g => labS.includes(g)));

// 13. 论文演示（n=6、N=3 的长条，web/demo-strip.js）：每个 deletion move 的突变序列做完后目标是 sink/source，
//     从不碰锁住的顶点；剥掉后倒回去；最后 ℓ 上的顶点全部剥掉
{
  global.window = {};
  require('../web/demo-strip.js');
  const DS = global.window.DEMO_STRIP, V = DS.pos.length;
  assert.strictEqual(V, 95);
  let M = Array.from({ length: V }, () => new Array(V).fill(0));
  for (const [i, j, v] of DS.arrows) { M[i][j] = v; M[j][i] = 0 - v; }
  const alive = new Set(DS.pos.map((_, i) => i)), lockedD = new Set(DS.locked);
  const ss = s => [...alive].every(i => M[i][s] >= 0) || [...alive].every(i => M[i][s] <= 0);
  let muts = 0;
  for (const st of DS.steps) {
    for (const k of st.word) { assert.ok(alive.has(k) && !lockedD.has(k) && k !== st.target); M = Q.mutate(M, k); muts++; }
    assert.ok(alive.has(st.target) && !lockedD.has(st.target) && ss(st.target), `demo move at ${st.target} 不是 sink/source`);
    for (let i = 0; i < V; i++) { M[i][st.target] = 0; M[st.target][i] = 0; }
    alive.delete(st.target);
    for (const k of [...st.word].reverse()) { M = Q.mutate(M, k); muts++; }
  }
  assert.ok(DS.goal.every(g => !alive.has(g)));
  assert.strictEqual(muts, 428);
}

console.log('all tests passed');
