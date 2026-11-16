// 游戏的数学部分：quiver 用反对称整数矩阵 B 存，B[i][j] > 0 表示有 B[i][j] 条箭头 i→j。
// 浏览器里挂在 window.QuiverCore 上，node 里用 require 引入（测试用）。
(function (root) {
  'use strict';

  // 在 k 处 mutate，公式和 Keller applet 一致：
  //   i=k 或 j=k: B'_ij = -B_ij
  //   否则:       B'_ij = B_ij + sgn(B_ik) * max(B_ik * B_kj, 0)
  function mutate(B, k) {
    const n = B.length;
    const C = B.map(row => row.slice());
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (i === k || j === k) {
          C[i][j] = 0 - B[i][j]; // 用 0 - x 避免 -0
        } else {
          C[i][j] = B[i][j] + Math.sign(B[i][k]) * Math.max(B[i][k] * B[k][j], 0);
        }
      }
    }
    return C;
  }

  // 约定：s 是 sink ⇔ 所有 B[i][s] >= 0；s 是 source ⇔ 所有 B[i][s] <= 0。
  function isSink(B, s) {
    return B.every(row => row[s] >= 0);
  }
  function isSource(B, s) {
    return B.every(row => row[s] <= 0);
  }

  function deleteVertex(B, s) {
    return B.filter((_, i) => i !== s).map(row => row.filter((_, j) => j !== s));
  }

  function addVertex(B) {
    const C = B.map(row => row.concat([0]));
    C.push(new Array(B.length + 1).fill(0));
    return C;
  }

  // 加一条箭头 i→j；如果原来有 j→i，就抵消掉一条（和 Keller 的 addarrow 一样）。
  function addArrow(B, i, j) {
    const C = B.map(row => row.slice());
    C[i][j] += 1;
    C[j][i] -= 1;
    return C;
  }

  const api = { mutate, isSink, isSource, deleteVertex, addVertex, addArrow };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.QuiverCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
