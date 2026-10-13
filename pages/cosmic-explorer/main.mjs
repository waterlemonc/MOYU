import * as THREE from '../../assets/vendor/three.module.mjs';
import { OrbitControls } from '../../assets/vendor/OrbitControls.mjs';
import { BODIES, TAU, periodDays, visualPosition, orbitalPosition, solveKepler } from './orbits.mjs';

const host = document.getElementById('universe');
const loading = document.getElementById('loading');
const fallback = document.getElementById('fallback');
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
} catch {
  loading.hidden = true;
  fallback.hidden = false;
}
if (renderer) start().catch(error => { console.error(error); loading.hidden = true; fallback.hidden = false; });

async function start() {
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(innerWidth, innerHeight);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  host.append(renderer.domElement);
  let contextLost = false;
  renderer.domElement.addEventListener('webglcontextlost', event => { event.preventDefault(); contextLost = true; fallback.hidden = false; });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, innerWidth / innerHeight, .02, 10000);
  camera.position.set(45, 26, 50);
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = .065;
  controls.minDistance = 1.6;
  controls.maxDistance = 800;
  controls.enablePan = false;
  const light = new THREE.PointLight(0xfff2d7, 2200, 0, 2);
  scene.add(light, new THREE.AmbientLight(0x627fa5, .16));
  const geometry = new THREE.SphereGeometry(1, 64, 40);
  let simulatedDays = 0, speed = 10 ** -1.3, paused = false, selected = null, follow = true, travelling = false;
  let lastTime = 0, lastUi = 0;
  const travelOffset = new THREE.Vector3();
  const previousFocus = new THREE.Vector3();
  const bodies = [];
  const orbitGroup = new THREE.Group();
  scene.add(orbitGroup);
  const loader = new THREE.TextureLoader();
  const assets = await Promise.allSettled(['earth-day.jpg', 'earth-night.png', 'moon.jpg'].map(file => loader.loadAsync(new URL(`assets/${file}`, import.meta.url).href)));
  const loaded = assets.map(result => result.status === 'fulfilled' ? result.value : null);
  for (const texture of loaded.filter(Boolean)) texture.colorSpace = THREE.SRGBColorSpace;

  function hash(x, y) { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); }
  function noise(x, y) {
    const ix = Math.floor(x), iy = Math.floor(y), fx = x - ix, fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iy), hash(ix + 1, iy), sx), THREE.MathUtils.lerp(hash(ix, iy + 1), hash(ix + 1, iy + 1), sx), sy);
  }
  function fbm(x, y) { return noise(x, y) * .55 + noise(x * 2.1, y * 2.1) * .28 + noise(x * 4.3, y * 4.3) * .17; }
  function surface(body) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d'), image = ctx.createImageData(512, 256);
    const base = new THREE.Color(body.color).convertLinearToSRGB();
    for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
      const u = x / 512, v = y / 256;
      const sx = Math.cos(u * TAU) * Math.sin(v * Math.PI), sy = Math.sin(u * TAU) * Math.sin(v * Math.PI), sz = Math.cos(v * Math.PI);
      const n = (fbm(sx * 10 + body.a, sy * 10 + sz * 6) + fbm(sy * 8, sz * 8)) / 2;
      let r = base.r, g = base.g, b = base.b, strength = .62 + n * .48;
      if (body.kind === 'gas') {
        const belt = Math.sin(v * 85 + noise(Math.cos(u * TAU) * 4 + v * 2, Math.sin(u * TAU) * 4 + v * 12) * 4) * .1 + Math.sin(v * 37) * .08;
        strength = .68 + belt + n * .22;
        if (body.id === 'jupiter') {
          const spot = Math.exp(-(((u - .65) * 17) ** 2 + ((v - .61) * 36) ** 2));
          r = r * (1 - spot) + .66 * spot; g = g * (1 - spot) + .29 * spot; b = b * (1 - spot) + .19 * spot;
        }
      } else if (body.kind === 'cloud') strength = .72 + fbm(sx * 8 + Math.sin(v * 20), sy * 8 + sz * 10) * .28;
      else if (body.kind === 'ice') strength = .76 + Math.sin(v * 36 + n * 2) * .035 + n * .08;
      else if (body.id === 'mars') {
        strength = .48 + n * .6;
        if (v < .055 || v > .95) { r = .82; g = .83; b = .76; strength = .82 + n * .12; }
      } else if (body.kind === 'earth') {
        const land = n > .59; r = land ? .21 : .035; g = land ? .36 : .18; b = land ? .16 : .39;
      }
      const index = (y * 512 + x) * 4;
      image.data[index] = r * strength * 255; image.data[index + 1] = g * strength * 255; image.data[index + 2] = b * strength * 255; image.data[index + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    if (body.id === 'mercury') for (let i = 0; i < 230; i++) {
      const x = hash(i, 3) * 512, y = hash(i, 9) * 256, radius = 1.5 + hash(i, 8) * 10;
      const gradient = ctx.createRadialGradient(x - radius * .2, y - radius * .2, 0, x, y, radius);
      gradient.addColorStop(0, '#29282488'); gradient.addColorStop(.7, '#31312e33'); gradient.addColorStop(.84, '#e4e0cd55'); gradient.addColorStop(1, '#a4a29700');
      ctx.fillStyle = gradient; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
  }
  const starsGeometry = new THREE.BufferGeometry();
  const starPositions = [], starColors = [];
  for (let i = 0; i < 6500; i++) {
    const z = Math.random() * 2 - 1, angle = Math.random() * TAU, radius = 1200 + Math.random() * 1200;
    const circle = Math.sqrt(1 - z * z);
    starPositions.push(Math.cos(angle) * circle * radius, z * radius, Math.sin(angle) * circle * radius);
    const brightness = .15 + Math.random() ** 3 * .8;
    const tint = new THREE.Color().setHSL(.55 + Math.random() * .13, .08 + Math.random() * .3, brightness);
    starColors.push(tint.r, tint.g, tint.b);
  }
  starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  scene.add(new THREE.Points(starsGeometry, new THREE.PointsMaterial({ size: 1.25, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: .9, depthWrite: false })));
  const skyCanvas = document.createElement('canvas'); skyCanvas.width = 512; skyCanvas.height = 256;
  const skyCtx = skyCanvas.getContext('2d'), sky = skyCtx.createImageData(512, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
    const band = Math.exp(-(((y / 256 - .46 - Math.sin(x / 512 * TAU) * .2) / .065) ** 2));
    const dust = fbm(x / 25, y / 18) * band, index = (y * 512 + x) * 4;
    sky.data[index] = 3 + dust * 12; sky.data[index + 1] = 5 + dust * 13; sky.data[index + 2] = 11 + dust * 21; sky.data[index + 3] = 255;
  }
  skyCtx.putImageData(sky, 0, 0);
  const skyTexture = new THREE.CanvasTexture(skyCanvas); skyTexture.mapping = THREE.EquirectangularReflectionMapping; skyTexture.colorSpace = THREE.SRGBColorSpace;
  scene.background = skyTexture;
  const sunTexture = surface({ a: 3, color: '#ffc663', kind: 'rock' });
  const sun = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ map: sunTexture, color: 0xffb955 })); sun.scale.setScalar(2.4); scene.add(sun);
  const glowCanvas = document.createElement('canvas'); glowCanvas.width = glowCanvas.height = 256;
  const glowCtx = glowCanvas.getContext('2d'), glow = glowCtx.createRadialGradient(128, 128, 4, 128, 128, 128);
  glow.addColorStop(0, '#ffd790cc'); glow.addColorStop(.27, '#ffb95577'); glow.addColorStop(.5, '#ff983c1c'); glow.addColorStop(1, '#ff983c00');
  glowCtx.fillStyle = glow; glowCtx.fillRect(0, 0, 256, 256);
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(glowCanvas), blending: THREE.AdditiveBlending, transparent: true, depthWrite: false })); halo.scale.set(15, 15, 1); scene.add(halo);

  const earthMaterial = new THREE.ShaderMaterial({
    uniforms: { dayMap: { value: loaded[0] || surface(BODIES[2]) }, nightMap: { value: loaded[1] || surface({ ...BODIES[2], color: '#040710', kind: 'ice' }) } },
    vertexShader: `varying vec2 vUv; varying vec3 vNormal; varying vec3 vWorld; void main(){vUv=uv;vNormal=normalize(mat3(modelMatrix)*normal);vWorld=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.0);}`,
    fragmentShader: `uniform sampler2D dayMap;uniform sampler2D nightMap;varying vec2 vUv;varying vec3 vNormal;varying vec3 vWorld;
      void main(){vec3 day=texture2D(dayMap,vUv).rgb;vec3 night=texture2D(nightMap,vUv).rgb;vec3 N=normalize(vNormal);vec3 L=normalize(-vWorld);float diffuse=max(dot(N,L),0.0);float terminator=smoothstep(-0.12,0.18,dot(N,L));vec3 V=normalize(cameraPosition-vWorld);float ocean=smoothstep(0.03,0.22,day.b-day.r);float specular=pow(max(dot(N,normalize(L+V)),0.0),65.0)*ocean*diffuse;vec3 color=day*(0.035+diffuse*.95)+night*(1.0-terminator)*1.6+vec3(.2,.3,.4)*specular;gl_FragColor=vec4(color,1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
      }`,
  });
  function atmosphere(radius, color) {
    return new THREE.Mesh(new THREE.SphereGeometry(radius * 1.05, 48, 32), new THREE.ShaderMaterial({
      uniforms: { tint: { value: new THREE.Color(color) } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `varying vec3 n;varying vec3 p;void main(){n=normalize(mat3(modelMatrix)*normal);p=(modelMatrix*vec4(position,1.0)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(p,1.0);}`,
      fragmentShader: `uniform vec3 tint;varying vec3 n;varying vec3 p;void main(){float rim=pow(1.0-max(dot(normalize(n),normalize(cameraPosition-p)),0.0),3.5);float lit=.08+.9*max(dot(normalize(n),normalize(-p)),0.0);gl_FragColor=vec4(tint*lit,rim*.62);}`,
    }));
  }
  const cloudCanvas = document.createElement('canvas'); cloudCanvas.width = 512; cloudCanvas.height = 256;
  const cloudCtx = cloudCanvas.getContext('2d'), cloudImage = cloudCtx.createImageData(512, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 512; x++) {
    const n = fbm(x / 26 + Math.sin(y / 20), y / 18), index = (y * 512 + x) * 4;
    cloudImage.data[index] = cloudImage.data[index + 1] = cloudImage.data[index + 2] = 255; cloudImage.data[index + 3] = Math.max(0, (n - .58) * 720);
  }
  cloudCtx.putImageData(cloudImage, 0, 0);
  const cloudTexture = new THREE.CanvasTexture(cloudCanvas); cloudTexture.colorSpace = THREE.SRGBColorSpace;
  for (const data of BODIES) {
    const root = new THREE.Group(); root.position.fromArray(visualPosition(data, 0)); scene.add(root);
    const tilt = new THREE.Group(); tilt.rotation.z = THREE.MathUtils.degToRad(data.tilt); root.add(tilt);
    const mesh = new THREE.Mesh(geometry, data.id === 'earth' ? earthMaterial : new THREE.MeshStandardMaterial({ map: surface(data), roughness: data.kind === 'rock' ? .92 : .82, metalness: 0 }));
    mesh.scale.setScalar(data.radius); tilt.add(mesh); mesh.userData.body = data.id;
    let clouds = null;
    if (data.id === 'earth') { clouds = new THREE.Mesh(new THREE.SphereGeometry(data.radius * 1.012, 64, 40), new THREE.MeshPhongMaterial({ map: cloudTexture, transparent: true, opacity: .72, depthWrite: false })); tilt.add(clouds); root.add(atmosphere(data.radius, '#58a9f5')); }
    if (data.kind === 'ice' || data.id === 'venus') root.add(atmosphere(data.radius, data.color));
    if (data.id === 'saturn') {
      const ringCanvas = document.createElement('canvas'); ringCanvas.width = ringCanvas.height = 512;
      const ringCtx = ringCanvas.getContext('2d'), ringImage = ringCtx.createImageData(512, 512);
      for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
        const r = Math.hypot(x - 256, y - 256) / 256, index = (y * 512 + x) * 4;
        const stripe = .6 + Math.sin(r * 430) * .12 + Math.sin(r * 73) * .17;
        ringImage.data[index] = 203 * stripe; ringImage.data[index + 1] = 187 * stripe; ringImage.data[index + 2] = 151 * stripe;
        ringImage.data[index + 3] = r > .53 && r < .99 && !(r > .74 && r < .77) ? 210 * stripe : 0;
      }
      ringCtx.putImageData(ringImage, 0, 0);
      const texture = new THREE.CanvasTexture(ringCanvas); texture.colorSpace = THREE.SRGBColorSpace;
      const ring = new THREE.Mesh(new THREE.RingGeometry(data.radius * 1.35, data.radius * 2.55, 128), new THREE.MeshStandardMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, roughness: .95, depthWrite: false })); ring.rotation.x = -Math.PI / 2; tilt.add(ring);
    }
    const points = [];
    for (let i = 0; i <= 256; i++) points.push(new THREE.Vector3().fromArray(visualPosition(data, periodDays(data.a) * i / 256)));
    const orbit = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: data.color, transparent: true, opacity: .16, depthWrite: false })); orbitGroup.add(orbit);
    bodies.push({ data, root, mesh, clouds });
    const button = document.createElement('button'); button.type = 'button'; button.className = 'planet-button'; button.dataset.body = data.id; button.setAttribute('aria-pressed', 'false');
    const dot = document.createElement('span'); dot.className = `planet-dot ${data.id === 'saturn' ? 'ringed' : ''}`; dot.style.setProperty('--planet-color', data.color); dot.setAttribute('aria-hidden', 'true');
    const label = document.createElement('span'), title = document.createElement('strong'), english = document.createElement('small'); title.textContent = data.name; english.textContent = data.english; label.append(title, english); button.append(dot, label);
    button.addEventListener('click', () => select(data.id)); document.getElementById('planet-strip').append(button);
  }
  const earth = bodies.find(body => body.data.id === 'earth');
  const moon = new THREE.Mesh(new THREE.SphereGeometry(.16, 40, 28), new THREE.MeshStandardMaterial({ map: loaded[2] || surface(BODIES[0]), roughness: 1 })); scene.add(moon);
  const beltPositions = [];
  for (let i = 0; i < 1300; i++) { const angle = Math.random() * TAU, radius = 12 * (2.2 + Math.random() * 1.2) ** .58; beltPositions.push(Math.cos(angle) * radius, (Math.random() - .5) * .7, Math.sin(angle) * radius); }
  const belt = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(beltPositions, 3)), new THREE.PointsMaterial({ color: 0x8b8272, size: .06, transparent: true, opacity: .46, depthWrite: false })); scene.add(belt);

  function fact(index, label, value, unit = '') {
    const row = document.querySelectorAll('.planet-facts > div')[index]; row.querySelector('dt').textContent = label; row.querySelector('dd').replaceChildren(document.createTextNode(value + ' '));
    const small = document.createElement('small'); small.textContent = unit; row.querySelector('dd').append(small);
  }
  function select(id, close = false) {
    selected = bodies.find(body => body.data.id === id); follow = true; travelling = true;
    const data = selected.data;
    previousFocus.copy(selected.root.position);
    travelOffset.copy(selected.root.position).multiplyScalar(-1).normalize().add(new THREE.Vector3(.18, .4, .12)).normalize().multiplyScalar((data.id === 'saturn' ? 11 : data.radius * (close ? 4 : 6)));
    controls.minDistance = data.radius * 1.55;
    document.getElementById('planet-name').textContent = data.name; document.getElementById('planet-english').textContent = data.english;
    document.getElementById('planet-subtitle').textContent = {earth:'我们的蓝色家园',mercury:'太阳身边的岩石世界',venus:'云层之下，炽热的秘密',mars:'红色沙漠，遥远的回声',jupiter:'风暴永不停息',saturn:'冰与光组成的星环',uranus:'侧躺着自转的冰巨星',neptune:'太阳系边缘的深蓝'}[id];
    document.getElementById('planet-description').textContent = data.info; document.getElementById('body-index').textContent = `${String(BODIES.indexOf(data) + 1).padStart(2, '0')} / 08`;
    fact(0, '直径', data.diameter.toLocaleString(), 'km'); fact(1, '公转周期', periodDays(data.a).toFixed(1), '天'); fact(2, '自转周期', (Math.abs(data.day) * 24).toFixed(1), '小时');
    document.getElementById('view-label').textContent = `${data.name}轨道`;
    document.querySelectorAll('[data-body]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.body === id)));
    document.getElementById('follow').setAttribute('aria-pressed', 'true'); document.getElementById('follow').textContent = '跟随星球 ✓';
  }
  function overview() {
    selected = null; follow = false; travelling = true; previousFocus.set(0, 0, 0); travelOffset.set(75, 95, 120); controls.minDistance = 3;
    document.getElementById('view-label').textContent = '太阳系总览'; document.getElementById('planet-name').textContent = '太阳系'; document.getElementById('planet-english').textContent = 'SOLAR SYSTEM'; document.getElementById('planet-subtitle').textContent = '一颗恒星，八个世界'; document.getElementById('body-index').textContent = '00 / 08';
    document.getElementById('planet-description').textContent = '从炽热的岩石世界，到遥远的冰巨星。沿着轨道寻找目标，点击星球或下方导航，开始你的下一段旅程。';
    fact(0, '恒星直径', '1,392,700', 'km'); fact(1, '行星数量', '8', '颗'); fact(2, '太阳自转', '25.4', '天'); fact(3, '最远行星', '30.1', 'AU');
    document.querySelectorAll('[data-body]').forEach(button => button.setAttribute('aria-pressed', 'false')); document.getElementById('follow').setAttribute('aria-pressed', 'false'); document.getElementById('follow').textContent = '选择星球跟随';
  }
  controls.addEventListener('start', () => { travelling = false; });
  document.getElementById('overview').addEventListener('click', overview);
  document.getElementById('close-up').addEventListener('click', () => { if (selected) select(selected.data.id, true); else select('earth', true); });
  document.getElementById('follow').addEventListener('click', () => {
    if (!selected) return;
    follow = !follow; previousFocus.copy(selected.root.position); document.getElementById('follow').setAttribute('aria-pressed', String(follow)); document.getElementById('follow').textContent = follow ? '跟随星球 ✓' : '自由观察';
  });
  document.getElementById('pause').addEventListener('click', event => { paused = !paused; event.currentTarget.setAttribute('aria-pressed', String(paused)); event.currentTarget.textContent = paused ? '▶ 继续' : 'Ⅱ 暂停'; });
  document.getElementById('speed').addEventListener('input', event => {
    speed = 10 ** Number(event.target.value);
    document.getElementById('speed-label').textContent = speed >= 1 ? `${speed.toFixed(1)} 天 / 秒` : speed * 24 >= 1 ? `${(speed * 24).toFixed(1)} 小时 / 秒` : `${Math.max(1, Math.round(speed * 1440))} 分钟 / 秒`;
  });
  document.getElementById('show-orbits').addEventListener('change', event => { orbitGroup.visible = event.target.checked; });
  document.getElementById('reset').addEventListener('click', () => {
    simulatedDays = 0; paused = false; speed = 10 ** -1.3;
    document.getElementById('pause').setAttribute('aria-pressed', 'false'); document.getElementById('pause').textContent = 'Ⅱ 暂停';
    document.getElementById('speed').value = '-1.3'; document.getElementById('speed-label').textContent = '72 分钟 / 秒';
    document.getElementById('show-orbits').checked = true; orbitGroup.visible = true;
    for (const body of bodies) body.root.position.fromArray(visualPosition(body.data, 0));
    select('earth');
  });
  const info = document.getElementById('planet-info'), toggleInfo = document.getElementById('toggle-info');
  function setInfo(show) { info.hidden = !show; toggleInfo.setAttribute('aria-expanded', String(show)); toggleInfo.textContent = show ? '隐藏面板' : '星球资料'; }
  toggleInfo.addEventListener('click', () => setInfo(info.hidden)); setInfo(innerWidth > 700);
  const raycaster = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
  renderer.domElement.addEventListener('pointerdown', event => { down = event.isPrimary ? {x:event.clientX,y:event.clientY,id:event.pointerId} : null; });
  renderer.domElement.addEventListener('pointercancel', () => { down = null; });
  renderer.domElement.addEventListener('pointerup', event => {
    if (!down || event.pointerId !== down.id || Math.hypot(event.clientX - down.x, event.clientY - down.y) > 7) { down = null; return; }
    down = null; mouse.set(event.clientX / innerWidth * 2 - 1, 1 - event.clientY / innerHeight * 2); raycaster.setFromCamera(mouse, camera);
    const hit = raycaster.intersectObjects(bodies.map(body => body.mesh))[0]; if (hit) select(hit.object.userData.body);
  });
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5)); renderer.setSize(innerWidth, innerHeight); });
  select('earth');
  camera.position.copy(earth.root.position).add(travelOffset.clone().multiplyScalar(1.8)); controls.target.copy(earth.root.position);
  loading.hidden = true;
  let initialDistance = null;
  function animate(time) {
    if (contextLost) return;
    const delta = lastTime ? Math.min((time - lastTime) / 1000, .1) : 0; lastTime = time;
    if (!paused && !document.hidden) simulatedDays += delta * speed;
    for (const body of bodies) {
      body.root.position.fromArray(visualPosition(body.data, simulatedDays));
      body.mesh.rotation.y = (TAU * simulatedDays / body.data.day) % TAU;
      if (body.clouds) body.clouds.rotation.y = TAU * simulatedDays / 1.07;
    }
    const moonEccentric = solveKepler(TAU * simulatedDays / 27.3217, .0549);
    const mx = 1.9 * (Math.cos(moonEccentric) - .0549), mz = 1.9 * Math.sqrt(1 - .0549 ** 2) * Math.sin(moonEccentric);
    moon.position.copy(earth.root.position).add(new THREE.Vector3(mx, mz * Math.sin(.0898), mz * Math.cos(.0898))); moon.rotation.y = -Math.atan2(mz, mx);
    sun.rotation.y = TAU * simulatedDays / 25.4;
    const focus = selected ? selected.root.position : new THREE.Vector3();
    if (selected && follow) { const shift = focus.clone().sub(previousFocus); camera.position.add(shift); controls.target.add(shift); }
    previousFocus.copy(focus);
    if (travelling) {
      const desired = focus.clone().add(travelOffset);
      camera.position.lerp(desired, 1 - Math.exp(-delta * 3)); controls.target.lerp(focus, 1 - Math.exp(-delta * 4));
      if (camera.position.distanceTo(desired) < .025) travelling = false;
    }
    controls.update(); renderer.render(scene, camera);
    if (time - lastUi > 200) {
      document.getElementById('elapsed').textContent = `${simulatedDays.toFixed(2)} 天`;
      if (selected) {
        const actual = orbitalPosition(selected.data, simulatedDays); const distance = Math.hypot(...actual);
        if (distance !== initialDistance) fact(3, '距太阳', distance.toFixed(3), 'AU'); initialDistance = distance;
      }
      lastUi = time;
    }
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}
