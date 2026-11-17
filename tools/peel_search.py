"""判断一个 quiver 是否 peelable（不加顶点能剥空），并给出步骤。

递归搜索：从 B 出发 BFS mutation 序列（深度有限，箭头重数有上限，按同构去重），
遇到某个顶点是 sink/source，就删掉它，递归判断剩下的 quiver。结果按同构类记忆。
搜索有深度限制，所以返回 None 只说明"在这个深度内没找到"。

用法（四穿孔球面加一个顶点）：python3 peel_search.py sphere [深度] [进程数]
"""
import itertools
import sys
from collections import deque
from surface import mutate


def canon2(B):
    """精确的同构类代表，同时返回顶点顺序 order：form 的第 a 个顶点是 B 的第 order[a] 个顶点。"""
    n = len(B)

    def refine(colors):
        while True:
            sig = [(colors[i], tuple(sorted((colors[j], B[i][j]) for j in range(n) if B[i][j]))) for i in range(n)]
            keys = sorted(set(sig))
            new = [keys.index(s) for s in sig]
            if len(set(new)) == len(set(colors)):
                return new
            colors = new

    best = [None, None]

    def search(colors):
        colors = refine(colors)
        if len(set(colors)) == n:
            order = sorted(range(n), key=lambda i: colors[i])
            form = tuple(B[i][j] for i in order for j in order)
            if best[0] is None or form < best[0]:
                best[0], best[1] = form, order
            return
        cnt = {}
        for c in colors:
            cnt[c] = cnt.get(c, 0) + 1
        c0 = min((c for c in cnt if cnt[c] > 1), key=lambda c: (cnt[c], c))
        for v in [i for i in range(n) if colors[i] == c0]:
            search([2 * c + (1 if (c == c0 and i != v) else 0) for i, c in enumerate(colors)])

    if n == 0:
        return (), []
    search([0] * n)
    return best[0], best[1]


def is_ss(B, s):
    n = len(B)
    return all(B[i][s] >= 0 for i in range(n)) or all(B[i][s] <= 0 for i in range(n))


def delete(B, s):
    return [[x for j, x in enumerate(r) if j != s] for i, r in enumerate(B) if i != s]


class Solver:
    def __init__(self, depth=lambda n: 6, cap=3):
        self.depth, self.cap, self.memo = depth, cap, {}

    def solve(self, B):
        """返回剥空 B 的步骤 [('mu'|'peel', B 的顶点下标)]，找不到返回 None。下标始终指 B 的顶点。"""
        n = len(B)
        if n == 0:
            return []
        c, order = canon2(B)
        if c in self.memo:
            m = self.memo[c]
            return None if m is None else [(op, order[a]) for op, a in m]
        self.memo[c] = None                       # 防止递归里重复进入
        res = self._search(B)
        inv = {v: a for a, v in enumerate(order)}
        self.memo[c] = None if res is None else [(op, inv[i]) for op, i in res]
        return res

    def _search(self, B):
        n = len(B)
        seen = {canon2(B)[0]}
        q = deque([(B, ())])
        D = self.depth(n)
        while q:
            M, path = q.popleft()
            for s in range(n):
                if is_ss(M, s):
                    sub = self.solve(delete(M, s))
                    if sub is not None:
                        return ([('mu', k) for k in path] + [('peel', s)] +
                                [(op, j if j < s else j + 1) for op, j in sub])
            if len(path) == D:
                continue
            for k in range(n):
                if path and path[-1] == k:
                    continue
                N = mutate(M, k)
                if any(abs(x) > self.cap for r in N for x in r):
                    continue
                cN = canon2(N)[0]
                if cN not in seen:
                    seen.add(cN)
                    q.append((N, path + (k,)))
        return None


def fmt(moves, labels):
    """把步骤写成 'mu 3, peel 5, ...'。步骤里的下标始终指 B 的顶点（删掉别的顶点后不变）。"""
    labels = list(labels)
    return ", ".join(f"{op} {labels[i]}" for op, i in moves)


SPHERE = [[0, 1, 1, -1, 0, -1], [-1, 0, -1, 0, 1, 1], [-1, 1, 0, 1, -1, 0],
          [1, 0, -1, 0, -1, 1], [0, -1, 1, 1, 0, -1], [1, -1, 0, -1, 1, 0]]   # 八面体，四穿孔球面


def _try(args):
    B, D = args
    C = Solver(depth=lambda n: D if n >= 6 else 6)
    r = C.solve(B)
    return B, r


if __name__ == "__main__":
    import multiprocessing as mp
    import time
    from small_classes import explore
    D = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    P = int(sys.argv[3]) if len(sys.argv) > 3 else 6
    members = list(explore(SPHERE)[0].values())
    starts, seen = [], set()
    for M in members:
        for col in sorted(itertools.product((-1, 0, 1), repeat=6), key=lambda c: sum(map(abs, c))):
            if not any(col):
                continue
            C = [r[:] + [col[i]] for i, r in enumerate(M)] + [[-x for x in col] + [0]]
            c = canon2(C)[0]
            if c not in seen:
                seen.add(c)
                starts.append(C)
    print(len(members), "members,", len(starts), "distinct one-node extensions; depth", D, flush=True)
    t, done = time.time(), 0
    with mp.Pool(P) as pool:
        for B, r in pool.imap_unordered(_try, [(B, D) for B in starts]):
            done += 1
            if r is not None:
                print(f"FOUND after {done} starts, {time.time() - t:.0f}s")
                print("B =", B)
                print(fmt(r, range(1, 8)), flush=True)
                pool.terminate()
                break
            if done % 50 == 0:
                print(f"{done}/{len(starts)} tried, {time.time() - t:.0f}s", flush=True)
        else:
            print("none found", flush=True)
