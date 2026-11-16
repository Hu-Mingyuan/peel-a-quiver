"""曲面三角剖分的 quiver（SL_2，无 puncture）。

亏格 g、一个边界分支、边界上一个 marked point 的曲面，可以由 (4g+1) 边形粘出来：
边按 a1 b1 a1' b1' ... ag bg ag' bg' e 排列（x' 表示和 x 反向粘合），最后一条边 e 是边界，
所有顶点粘成同一个点（就是那个 marked point）。从 0 号顶点做扇形剖分。
quiver：每个三角形里，沿逆时针相邻的两条（非边界）边之间连一条箭头，再把所有三角形加起来。
"""
import itertools


def polygon_quiver(g):
    m = 4 * g + 1                      # 多边形边数
    # 边 s_i 连接顶点 i 和 i+1；给每条边一个 arc 名字
    names = []
    for k in range(g):
        a, b = f"a{k+1}", f"b{k+1}"
        names += [a, b, a, b]          # a b a' b'：同名即粘在一起
    names.append(None)                 # e：边界
    diag = {i: f"d{i}" for i in range(2, m - 1)}   # 0 号顶点到 i 号顶点的对角线
    arcs = sorted(set(n for n in names if n)) + [diag[i] for i in sorted(diag)]
    idx = {a: i for i, a in enumerate(arcs)}
    n = len(arcs)
    B = [[0] * n for _ in range(n)]

    def side(u, v):                    # 多边形里 u->v 这条线段对应的 arc（None 表示边界）
        if v == u + 1:
            return names[u]
        if u == 0 and v == m - 1 or u == m - 1 and v == 0:
            return names[m - 1]
        if u == 0:
            return diag[v]
        if v == 0:
            return diag[u]
        raise ValueError

    for i in range(1, m - 1):          # 三角形 (0, i, i+1)，逆时针
        sides = [side(0, i), side(i, i + 1), side(i + 1, 0)]
        for x, y in [(0, 1), (1, 2), (2, 0)]:
            p, q = sides[x], sides[y]
            if p is None or q is None or p == q:
                continue
            B[idx[p]][idx[q]] += 1
            B[idx[q]][idx[p]] -= 1
    return arcs, B


def mutate(B, k):
    n = len(B)
    C = [row[:] for row in B]
    for i in range(n):
        for j in range(n):
            if i == k or j == k:
                C[i][j] = -B[i][j]
            else:
                s = (B[i][k] > 0) - (B[i][k] < 0)
                C[i][j] = B[i][j] + s * max(B[i][k] * B[k][j], 0)
    return C


def has_sink_or_source(B):
    n = len(B)
    return any(all(B[i][s] >= 0 for i in range(n)) or all(B[i][s] <= 0 for i in range(n)) for s in range(n))


def canon(B):
    """精确的同构类代表：颜色细化 + 在并列的类里逐个个体化（小图够用）。"""
    n = len(B)

    def refine(colors):
        while True:
            sig = [(colors[i], tuple(sorted((colors[j], B[i][j]) for j in range(n) if B[i][j]))) for i in range(n)]
            keys = sorted(set(sig))
            new = [keys.index(s) for s in sig]
            if len(set(new)) == len(set(colors)):
                return new
            colors = new

    best = None

    def search(colors):
        nonlocal best
        colors = refine(colors)
        if len(set(colors)) == n:
            order = sorted(range(n), key=lambda i: colors[i])
            form = tuple(B[i][j] for i in order for j in order)
            if best is None or form < best:
                best = form
            return
        # 找最小的非平凡颜色类，逐个个体化
        cnt = {}
        for c in colors:
            cnt[c] = cnt.get(c, 0) + 1
        c0 = min((c for c in cnt if cnt[c] > 1), key=lambda c: (cnt[c], c))
        for v in [i for i in range(n) if colors[i] == c0]:
            new = [2 * c + (1 if (c == c0 and i != v) else 0) for i, c in enumerate(colors)]
            search(new)

    search([0] * n)
    return best


def mutation_class(B, limit=10 ** 6):
    """穷举 mutation 等价类（同构意义下）。返回 (类的大小, 是否有成员带 sink/source)。"""
    start = canon(B)
    seen = {start}
    stack = [B]
    found = has_sink_or_source(B)
    while stack:
        M = stack.pop()
        for k in range(len(M)):
            N = mutate(M, k)
            c = canon(N)
            if c not in seen:
                seen.add(c)
                if has_sink_or_source(N):
                    found = True
                stack.append(N)
                if len(seen) > limit:
                    raise RuntimeError("class too large")
    return len(seen), found


if __name__ == "__main__":
    import sys
    g = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    arcs, B = polygon_quiver(g)
    print(arcs)
    for r in B:
        print(r)
