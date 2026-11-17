"""穷举小 rank 的 mutation-finite 类，找出整个类里都没有 sink/source 的（这样的 quiver 不加顶点一定剥不完）。

rank 3 及以上的连通 quiver 是 mutation-finite 当且仅当类里所有箭头重数都 <= 2。
mutation-finite quiver 的满子 quiver 也是 mutation-finite，所以 rank r+1 的候选
从 rank r 的每个 mutation-finite quiver 加一个顶点（重数 -2..2）得到。
用法：python3 small_classes.py [最大 rank]
"""
import itertools
import sys
from surface import mutate, canon, has_sink_or_source


def connected(B):
    n = len(B)
    seen, st = {0}, [0]
    while st:
        i = st.pop()
        for j in range(n):
            if B[i][j] and j not in seen:
                seen.add(j); st.append(j)
    return len(seen) == n


def explore(B, cap=20000):
    """BFS 整个 mutation 类。返回 (类里的代表集合, 是否 mutation-finite, 是否有 sink/source)。"""
    start = canon(B)
    seen = {start: B}
    st = [B]
    ss = has_sink_or_source(B)
    while st:
        M = st.pop()
        for k in range(len(M)):
            N = mutate(M, k)
            if any(abs(x) > 2 for r in N for x in r):
                return seen, False, ss
            c = canon(N)
            if c not in seen:
                seen[c] = N
                ss = ss or has_sink_or_source(N)
                st.append(N)
                if len(seen) > cap:
                    return seen, False, ss
    return seen, True, ss


def extend(B):
    n = len(B)
    for col in itertools.product(range(-2, 3), repeat=n):
        if not any(col):
            continue
        C = [r[:] + [col[i]] for i, r in enumerate(B)] + [[-x for x in col] + [0]]
        yield C


def main(rmax):
    # rank 2：所有连通的 (0,b),(−b,0)，b = 1, 2
    layer = {}
    for b in (1, 2):
        B = [[0, b], [-b, 0]]
        layer[canon(B)] = B
    print("rank 2:", len(layer), "connected mutation-finite quivers (|b|<=2)")
    for r in range(3, rmax + 1):
        new, classes, bad = {}, [], set()
        for B in layer.values():
            for C in extend(B):
                c = canon(C)
                if c in new or c in bad:
                    continue
                members, finite, ss = explore(C)
                if finite:
                    new.update({k: v for k, v in members.items()})
                    classes.append((len(members), ss, C))
                else:
                    bad.add(c)
        layer = new
        print(f"rank {r}: {len(layer)} quivers in {len(classes)} mutation-finite classes")
        for size, ss, C in classes:
            if not ss:
                print(f"  NO sink/source: class size {size}, B = {C}")
        sys.stdout.flush()


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 5)
