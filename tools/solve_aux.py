"""给"加一个耳朵顶点"之后的曲面 quiver 找剥完的步骤。

贪心：从当前 quiver 出发做 BFS（mutation 序列，深度有限），找让某个顶点变成
sink/source 的最短序列，做完 mutation 后剥掉它，重复直到剥空。
"""
from collections import deque
from surface import polygon_quiver, mutate


def is_ss(B, s):
    n = len(B)
    return all(B[i][s] >= 0 for i in range(n)) or all(B[i][s] <= 0 for i in range(n))


def delete(B, s):
    return [[x for j, x in enumerate(r) if j != s] for i, r in enumerate(B) if i != s]


def find_move(B, depth):
    """BFS 找最短的 mutation 序列 w，使某个顶点变成 sink/source。"""
    start = tuple(map(tuple, B))
    q = deque([(B, ())])
    seen = {start}
    while q:
        M, w = q.popleft()
        for s in range(len(M)):
            if is_ss(M, s):
                return w, s
        if len(w) == depth:
            continue
        for k in range(len(M)):
            if w and w[-1] == k:
                continue
            N = mutate(M, k)
            key = tuple(map(tuple, N))
            if key not in seen:
                seen.add(key)
                q.append((N, w + (k,)))
    return None


def solve(B, labels, depth=6):
    moves = []
    while B:
        r = find_move(B, depth)
        if r is None:
            return None, B, labels
        w, s = r
        for k in w:
            B = mutate(B, k)
            moves.append(f"mu {labels[k]}")
        moves.append(f"peel {labels[s]}")
        B = delete(B, s)
        labels = [l for i, l in enumerate(labels) if i != s]
    return moves, B, labels


def with_ear(g):
    """亏格 g 的曲面 quiver 加一个耳朵顶点 f：最后一个三角形 (0, m-2, m-1) 的边界边 e 变成 mutable。"""
    arcs, B = polygon_quiver(g)
    m = 4 * g + 1
    names = []
    for k in range(g):
        names += [f"a{k+1}", f"b{k+1}", f"a{k+1}", f"b{k+1}"]
    u, v = f"d{m-2}", names[m - 2]                # 三角形的边按逆时针：u -> v -> e -> u
    n = len(arcs)
    C = [r + [0] for r in B] + [[0] * (n + 1)]
    iu, iv = arcs.index(u), arcs.index(v)
    C[iv][n] += 1; C[n][iv] -= 1                   # v -> f
    C[n][iu] += 1; C[iu][n] -= 1                   # f -> u
    return arcs + ["f"], C, (v, u)


if __name__ == "__main__":
    import sys, time
    g = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    depth = int(sys.argv[2]) if len(sys.argv) > 2 else 6
    arcs, C, (v, u) = with_ear(g)
    print("arcs", arcs, f"ear: {v} -> f -> {u}")
    t = time.time()
    moves, rest, labels = solve(C, arcs, depth)
    if moves is None:
        print("stuck with", labels)
    else:
        nm = sum(1 for x in moves if x.startswith("mu"))
        print(f"solved: {nm} mutations, {len(moves) - nm} peels, {time.time() - t:.1f}s")
        print("  ".join(moves))
