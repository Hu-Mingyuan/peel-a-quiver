# Peel a quiver

A browser puzzle about peelable and sub-peelable quivers.
Mutate, peel sinks and sources, and add auxiliary nodes until the quiver is empty.
Based on Bernhard Keller's [quiver mutation applet](https://webusers.imj-prg.fr/~bernhard.keller/quivermutation/).

- `web/index.html`, `web/quiver.js` — the game (static files, no build step)
- `test/test.js` — `node test/test.js`
- `tools/fg.js` — generates Fock–Goncharov SL_n quivers on a quadrilateral; `tools/solve.js` — a small search for peeling sequences
- `tools/surface.py` — triangulation quivers of a genus-g surface with one boundary marked point, and mutation-class enumeration; `tools/solve_aux.py` — peeling after adding one auxiliary node

Play online: https://hu-mingyuan.github.io/peel-a-quiver/

Run locally: `python3 -m http.server 8080 --directory web`, then open http://localhost:8080/.
