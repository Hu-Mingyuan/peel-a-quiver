// 简单求解器：迭代加深搜索 mutation 序列；每步之后把能剥的 sink/source 全部剥掉。
// 只用 mutation 和剥 sink/source（不加顶点）。用法：node tools/solve.js（默认解 FG SL_4 四边形）
'use strict';
const Q = require('../web/quiver.js');

function peelAll(B, labels, log) {
  let changed = true;
  while (changed && B.length) {
    changed = false;
    for (let i = 0; i < B.length; i++) {
      if (Q.isSink(B, i) || Q.isSource(B, i)) {
        log.push(`peel ${labels[i]}`);
        B = Q.deleteVertex(B, i); labels = labels.filter((_, j) => j !== i);
        changed = true; break;
      }
    }
  }
  return [B, labels];
}

function solve(B0, labels0, maxDepth = 12) {
  for (let depth = 0; depth <= maxDepth; depth++) {
    const seen = new Map();
    const res = dfs(B0, labels0, depth, [], seen);
    if (res) return res;
  }
  return null;
}

function dfs(B, labels, depth, log, seen) {
  [B, labels] = peelAll(B, labels, log = log.slice());
  if (B.length === 0) return log;
  if (depth === 0) return null;
  const key = JSON.stringify([labels, B]);
  if ((seen.get(key) ?? -1) >= depth) return null;
  seen.set(key, depth);
  for (let k = 0; k < B.length; k++) {
    if (log.length && log[log.length - 1] === `μ${labels[k]}`) continue; // 连续两次同一点等于没做
    const r = dfs(Q.mutate(B, k), labels, depth - 1, log.concat(`μ${labels[k]}`), seen);
    if (r) return r;
  }
  return null;
}

if (require.main === module) {
  const { fgQuad, name } = require('./fg.js');
  const n = parseInt(process.argv[2] || '4', 10);
  const { pos, B } = fgQuad(n);
  const labels = pos.map(name);
  const t = Date.now();
  const sol = solve(B, labels);
  console.log(sol ? `solution (${sol.filter(s => s.startsWith('μ')).length} mutations): ${sol.join('  ')}` : 'no solution found', `${Date.now() - t}ms`);
}
module.exports = { solve };
