"""Deletion moves of Proposition (strip) (Section 2 of Ice and mirrors), written out for one strip.

    python3 tools/strip_demo.py [n] [N] [out.js]      (default: 6 3 web/demo-strip.js)

Builds the SL_n strip quiver of tools/fg_strip.py and follows the proof:
  round p = 0, 1, ..., floor(n/2)-1:
    if p >= 1: Lemma triangle-shell in tau_{p+1}, ..., tau_{2N-p}  (delete C_{p+1} minus C_p)
    Lemma edge-layer on e_{p+1}, ..., e_{2N-p-1}                   (delete the common edge to depth p+1)
The mutation words are the ones in the proof (pruned-word and triangle-word). Labels of the paper
(D_k, X_{i,j}, (a,b,c)) are placed on the strip by matching positions; the two triangles of a pair
can be matched in two ways (they differ by the 180 degree rotation of the proof), and every move is
checked: after the word the target must be a sink or source of the current quiver. Each deletion
move is: the word, peel the target, the word in reverse.
Writes a JS data file for the step-through demo in web/index.html.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fg_strip import strip            # noqa: E402
from surface import mutate            # noqa: E402

n = int(sys.argv[1]) if len(sys.argv) > 1 else 6
N = int(sys.argv[2]) if len(sys.argv) > 2 else 3
OUT = sys.argv[3] if len(sys.argv) > 3 else os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'web', 'demo-strip.js')
W = 1.6
B0, pos, info, locked, goal, segs = strip(n, N, W)
V = len(B0)
locked = set(locked)

# corners and triangles exactly as in fg_strip.strip
P = {('T', i): (W * i, 1.0) for i in range(N + 1)}
P.update({('B', i): (W * i, 0.0) for i in range(N + 1)})
tris = []
for i in range(N):
    tris.append((('T', i), ('B', i), ('T', i + 1)))       # tau_{2i+1}: strip side T_i T_{i+1} (b = 0)
    tris.append((('B', i), ('B', i + 1), ('T', i + 1)))   # tau_{2i+2}: strip side B_i B_{i+1} (c = 0)
key = lambda p: (round(p[0] * 1e6), round(p[1] * 1e6))
at = {key(p): i for i, p in enumerate(pos)}


def vert(corners, abc):
    """Vertex at lattice point abc of the triangle with corners (Q0,Q1,Q2), or None (corner / frozen)."""
    q = [P[c] for c in corners]
    x = sum(abc[k] * q[k][0] for k in range(3)) / n
    y = sum(abc[k] * q[k][1] for k in range(3)) / n
    return at.get(key((x, y)))


M = [r[:] for r in B0]
alive = set(range(V))
steps = []        # deletion moves: dict(round, lemma, where, target, tname, word, wnames)


def is_ss(s):
    return all(M[i][s] >= 0 for i in alive) or all(M[i][s] <= 0 for i in alive)


def try_move(s, word):
    """Apply word, check s is a sink/source; on failure restore and return False."""
    if s is None or s not in alive or any(k is None or k not in alive or k in locked or k == s for k in word):
        return False
    saved = [r[:] for r in M]
    for k in word:
        M[:] = mutate(M, k)
    if is_ss(s):
        return True
    M[:] = saved
    return False


def commit(s, word, meta):
    for i in range(V):
        M[i][s] = 0
        M[s][i] = 0
    alive.discard(s)
    for k in reversed(word):
        M[:] = mutate(M, k)
    steps.append(dict(meta, target=s, word=list(word)))


def pair_labels(j, swap):
    """Paper labels for the pair tau_j, tau_{j+1} around e_j (1-based). Returns functions D(k), X(i,jj)."""
    left, right = tris[j - 1], tris[j]
    common = [c for c in left if c in right]
    def on_side(t):                                     # the strip side of triangle t
        return [c for c in t if c[0] == ('T' if t[0][0] == 'T' else 'B')]
    xt, yt = (right, left) if swap else (left, right)
    xq0 = [c for c in common if c in on_side(xt)][0]
    xq2 = [c for c in common if c != xq0][0]
    xq1 = [c for c in xt if c not in common][0]
    X = (xq0, xq1, xq2)
    D = lambda k: vert(X, (n - k, 0, k))
    Xl = lambda i, jj: vert(X, (n - i, i - jj, jj))
    return D, Xl


def edge_layer(p, j, rnd):
    t_, r_ = n - p - 1, p + 2
    meta = dict(round=rnd, lemma='edge', where=f'e{j}')
    if n == 2 * p + 2:                                   # D_{p+1} alone: no mutations
        for swap in (False, True):
            D, _ = pair_labels(j, swap)
            s = D(p + 1)
            if try_move(s, []):
                commit(s, [], dict(meta, tname=f'D{p + 1}', wnames=[]))
                return
        raise SystemExit(f'round {rnd}: e_{j} middle vertex is not a sink/source')
    for swap in (False, True):
        D, Xl = pair_labels(j, swap)
        names = [f'D{k}' for k in range(p + 1, t_)] + [f'X{i},{jj}' for i in range(r_, t_ + 1) for jj in range(i - 1, 0, -1)]
        word = [D(k) for k in range(p + 1, t_)] + [Xl(i, jj) for i in range(r_, t_ + 1) for jj in range(i - 1, 0, -1)]
        s = D(t_)
        if not try_move(s, word):
            continue
        commit(s, word, dict(meta, tname=f'D{t_}', wnames=names))
        # the other end: rotate the square (= the other matching) and omit the first mutation
        D2, X2 = pair_labels(j, not swap)
        s2 = D2(t_)
        if try_move(s2, word2 := [D2(k) for k in range(p + 2, t_)] + [X2(i, jj) for i in range(r_, t_ + 1) for jj in range(i - 1, 0, -1)]):
            commit(s2, word2, dict(meta, tname=f'D{p + 1}', wnames=[nm + '′' for nm in names[1:]]))   # ′: labels of the rotated square
            return
        raise SystemExit(f'round {rnd}: e_{j} second deletion move failed')
    raise SystemExit(f'round {rnd}: e_{j} first deletion move failed')


def triangle_shell(p, t, rnd):
    """Lemma triangle-shell in tau_{t+1}: delete the interior points with a+c = p+1, then b+c = p+1."""
    corners = tris[t]
    bdry = 1 if t % 2 == 0 else 2                       # which of my coordinates vanishes on the strip side
    others = [k for k in range(3) if k != bdry]
    b0 = n - p - 1
    meta = dict(round=rnd, lemma='tri', where=f't{t + 1}')
    for order in (others, others[::-1]):
        def mine(a, b, c):                              # paper (a,b,c) with c on the strip side
            v = [0, 0, 0]
            v[order[0]], v[order[1]], v[bdry] = a, b, c
            return vert(corners, tuple(v))
        saved_M, saved_alive, saved_steps = [r[:] for r in M], set(alive), list(steps)
        ok = True
        for half in (0, 1):
            for a in range(p, 0, -1):
                if half == 1 and b0 == p and a == p:
                    continue
                pt = (a, b0, p + 1 - a) if half == 0 else (b0, a, p + 1 - a)
                s = mine(*pt)
                vs = [(a, b, n - a - b) if half == 0 else (b, a, n - a - b) for b in range(1, b0)]
                word = [mine(*v) for v in vs]
                if not try_move(s, word):
                    ok = False
                    break
                commit(s, word, dict(meta, tname='({},{},{})'.format(*pt), wnames=['({},{},{})'.format(*v) for v in vs]))
            if not ok:
                break
        if ok:
            return
        M[:] = saved_M
        steps[:] = saved_steps
        alive.clear()
        alive.update(saved_alive)
    raise SystemExit(f'round {rnd}: triangle tau_{t + 1} failed')


for p in range(n // 2):
    rnd = p + 1
    if p >= 1:
        for i in range(p + 1, 2 * N - p + 1):
            triangle_shell(p, i - 1, rnd)
    for j in range(p + 1, 2 * N - p):
        edge_layer(p, j, rnd)

goal_left = [g for g in goal if g in alive]
muts = sum(2 * len(s['word']) for s in steps)
print(f'n={n} N={N}: {V} vertices, {len(locked)} locked, {len(steps)} deletion moves, {muts} mutations; '
      f'goal cleared: {not goal_left}')
assert not goal_left

# names shown on hover
names = []
for k in info:
    if k[0] == 'arc':
        names.append(f'e{k[1]}, {k[2]}')
    else:
        names.append(f't{k[1] + 1} ({k[2]},{k[3]},{k[4]})')
arrows = [[i, j, B0[i][j]] for i in range(V) for j in range(i + 1, V) if B0[i][j]]
data = dict(n=n, N=N, pos=[[round(x, 4), round(y, 4)] for x, y in pos], arrows=arrows,
            locked=sorted(locked), goal=sorted(goal), names=names,
            bg=[{'a': list(a), 'b': list(b)} for a, b in segs], W=W,
            steps=steps)
with open(OUT, 'w', encoding='utf-8') as f:
    f.write('// 由 tools/strip_demo.py 生成：论文 Proposition (strip) 的 deletion move，n=%d, N=%d\n' % (n, N))
    f.write('window.DEMO_STRIP = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
print('wrote', OUT, os.path.getsize(OUT), 'bytes')
