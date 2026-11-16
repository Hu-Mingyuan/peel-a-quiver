"""任意曲面（由多边形粘合给出）的 Fock–Goncharov SL_n quiver，只保留 mutable 顶点。

多边形的边按逆时针给出名字：同名的两条边反向粘合，None 表示边界。
从 0 号角做扇形剖分。每个三角形 (Q0,Q1,Q2) 逆时针，格点 (a,b,c), a+b+c=n，
对每个 a+b+c=n-2 加定向圈 (a+1,b+1,c) -> (a,b+1,c+1) -> (a+1,b,c+1) -> (a+1,b+1,c)。
边上的格点按"到这条 arc 的规范起点的距离"认同；边界上的格点是 frozen，去掉。
"""


def fg_polygon(sides, n):
    m = len(sides)
    first = {}
    for i, s in enumerate(sides):
        if s is not None:
            first.setdefault(s, i)
    # 每条多边形边：arc 名字和规范起点所在的角
    def side_info(u, v):
        """多边形里 u->v 线段（逆时针方向，或对角线）的 (arc, 起点角)；边界返回 (None, None)。"""
        if (v - u) % m == 1:
            s = sides[u]
            if s is None:
                return None, None
            return s, (u if first[s] == u else v)       # 第二次出现时方向相反
        if (u - v) % m == 1:
            s = sides[v]
            if s is None:
                return None, None
            return s, (v if first[s] == v else u)
        a, b = min(u, v), max(u, v)
        assert a == 0
        return f"d{b}", 0

    verts = {}
    arrows = {}

    def vid(key):
        if key not in verts:
            verts[key] = len(verts)
        return verts[key]

    def point(tri, t, abc):
        a, b, c = abc
        Q = tri
        if min(abc) > 0:
            return ("T", t, a, b, c)
        if sorted(abc)[1] == 0:                           # 角
            return None
        # 在哪条边上：c=0 是 Q0Q1，a=0 是 Q1Q2，b=0 是 Q2Q0
        if c == 0:
            u, v, du = Q[0], Q[1], b                       # 到 Q0 的距离是 b
        elif a == 0:
            u, v, du = Q[1], Q[2], c
        else:
            u, v, du = Q[2], Q[0], a
        arc, start = side_info(u, v)
        if arc is None:
            return None                                    # frozen
        d = du if start == u else n - du
        return ("E", arc, d)

    for t in range(1, m - 1):
        tri = (0, t, t + 1)
        for a in range(n - 1):
            for b in range(n - 1 - a):
                c = n - 2 - a - b
                P = point(tri, t, (a + 1, b + 1, c))
                Qp = point(tri, t, (a, b + 1, c + 1))
                R = point(tri, t, (a + 1, b, c + 1))
                for x, y in [(P, Qp), (Qp, R), (R, P)]:
                    if x is None or y is None:
                        continue
                    i, j = vid(x), vid(y)
                    arrows[(i, j)] = arrows.get((i, j), 0) + 1
                    arrows[(j, i)] = arrows.get((j, i), 0) - 1
    N = len(verts)
    B = [[0] * N for _ in range(N)]
    for (i, j), v in arrows.items():
        B[i][j] += v
    labels = [None] * N
    for k, i in verts.items():
        labels[i] = "T%d" % k[1] if k[0] == "T" and n == 3 else "_".join(map(str, k))
    return labels, B


def annulus(p, q, n):
    """外边界 p 个 marked point，内边界 q 个。arc x 连接两个边界。"""
    sides = [None] * p + ["x"] + [None] * q + ["x"]
    return fg_polygon(sides, n)
