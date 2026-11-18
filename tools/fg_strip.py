"""SL_n Fock–Goncharov quiver of the strip in Section 2 (Proposition strip), drawn in the plane.

Top points T_0..T_N, bottom points B_0..B_N; arcs e_{2i} = T_i B_i, e_{2i+1} = T_{i+1} B_i.
The strip sides are boundary (frozen, dropped). Vertices on e_0 and e_{2N} are kept but locked:
they may not be mutated or deleted. The goal is to delete every vertex on the middle arc l = e_N.
Same lattice convention as fg_surface.py: triangle (Q0,Q1,Q2) counterclockwise, point (a,b,c) with
a+b+c=n sits at (a Q0 + b Q1 + c Q2)/n, and each small upward triangle gives the cycle
(a+1,b+1,c) -> (a,b+1,c+1) -> (a+1,b,c+1) -> (a+1,b+1,c).
"""


def strip(n, N, w=1.6):
    T = [(w * i, 1.0) for i in range(N + 1)]
    Bt = [(w * i, 0.0) for i in range(N + 1)]
    pts = {('T', i): T[i] for i in range(N + 1)}
    pts.update({('B', i): Bt[i] for i in range(N + 1)})
    arcs = {}                                   # frozenset of corners -> arc index
    for i in range(N + 1):
        arcs[frozenset([('T', i), ('B', i)])] = 2 * i
    for i in range(N):
        arcs[frozenset([('T', i + 1), ('B', i)])] = 2 * i + 1
    tris = []
    for i in range(N):
        tris.append((('T', i), ('B', i), ('T', i + 1)))       # bounded by e_{2i}, e_{2i+1}, top side
        tris.append((('B', i), ('B', i + 1), ('T', i + 1)))   # bounded by e_{2i+1}, e_{2i+2}, bottom side
    verts, pos, info = {}, [], []
    arrows = {}

    def point(t, abc):
        a, b, c = abc
        Q = tris[t]
        if min(abc) > 0:
            key = ('tri', t, a, b, c)
        else:
            if sorted(abc)[1] == 0:
                return None                                   # corner
            if c == 0:
                u, v, du = Q[0], Q[1], b
            elif a == 0:
                u, v, du = Q[1], Q[2], c
            else:
                u, v, du = Q[2], Q[0], a
            e = arcs.get(frozenset([u, v]))
            if e is None:
                return None                                   # strip side: frozen, dropped
            start = min(u, v)
            d = du if start == u else n - du
            key = ('arc', e, d)
        if key not in verts:
            verts[key] = len(verts)
            P = [pts[q] for q in Q]
            pos.append(((a * P[0][0] + b * P[1][0] + c * P[2][0]) / n, (a * P[0][1] + b * P[1][1] + c * P[2][1]) / n))
            info.append(key)
        return verts[key]

    for t in range(len(tris)):
        for a in range(n - 1):
            for b in range(n - 1 - a):
                c = n - 2 - a - b
                cyc = [point(t, (a + 1, b + 1, c)), point(t, (a, b + 1, c + 1)), point(t, (a + 1, b, c + 1))]
                for x, y in zip(cyc, cyc[1:] + cyc[:1]):
                    if x is None or y is None:
                        continue
                    arrows[(x, y)] = arrows.get((x, y), 0) + 1
                    arrows[(y, x)] = arrows.get((y, x), 0) - 1
    m = len(verts)
    B = [[0] * m for _ in range(m)]
    for (i, j), v in arrows.items():
        B[i][j] += v
    locked = [i for i, k in enumerate(info) if k[0] == 'arc' and k[1] in (0, 2 * N)]
    goal = [i for i, k in enumerate(info) if k[0] == 'arc' and k[1] == N]
    segs = [(T[0], T[N]), (Bt[0], Bt[N])] + [(pts[tuple(sorted(e, key=lambda q: q[0] != 'T'))[0]], pts[tuple(sorted(e, key=lambda q: q[0] != 'T'))[1]]) for e in arcs]
    return B, pos, info, locked, goal, segs


if __name__ == '__main__':
    B, pos, info, locked, goal, segs = strip(4, 2)
    print(len(B), 'vertices; locked', len(locked), '; goal', len(goal))
    print('max |entry|', max(abs(x) for r in B for x in r))
