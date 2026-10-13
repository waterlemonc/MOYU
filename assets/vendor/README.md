# Three.js

Pinned version: **0.160.1**. These files are checked into the repository, so the page makes no runtime CDN requests.

- `three.module.mjs`: https://cdn.jsdelivr.net/npm/three@0.160.1/build/three.module.js
- `OrbitControls.mjs`: https://cdn.jsdelivr.net/npm/three@0.160.1/examples/jsm/controls/OrbitControls.js
- License: `THREE-LICENSE.txt` (MIT).

The filenames use `.mjs`; OrbitControls' `from 'three'` import is changed to the relative `./three.module.mjs` path. No other library code is modified.
