export const TAU = Math.PI * 2;
export const BODIES = [
  { id: 'mercury', name: '水星', english: 'MERCURY', a: .3871, e: .2056, inclination: 7.005, node: 48.331, perihelion: 29.124, phase: 175, radius: .35, diameter: 4879, day: 58.646, tilt: .034, color: '#aca89f', kind: 'rock', info: '离太阳最近的岩石世界。布满撞击坑的地表，在漫长白昼与黑夜间经历剧烈温差。' },
  { id: 'venus', name: '金星', english: 'VENUS', a: .7233, e: .0068, inclination: 3.395, node: 76.68, perihelion: 54.884, phase: 80, radius: .72, diameter: 12104, day: -243.025, tilt: 2.64, color: '#d9ba8b', kind: 'cloud', info: '厚重云层遮住了地表。金星缓慢逆向自转，浓厚的二氧化碳大气使这里成为炽热的世界。' },
  { id: 'earth', name: '地球', english: 'EARTH', a: 1, e: .0167, inclination: .001, node: 0, perihelion: 102.937, phase: 30, radius: .78, diameter: 12742, day: .99727, tilt: 23.44, color: '#79b5ea', kind: 'earth', info: '蓝色海洋、白色云带与大陆共同构成我们的家园。转动视角，观察晨昏线与夜半球的城市灯光。' },
  { id: 'mars', name: '火星', english: 'MARS', a: 1.5237, e: .0934, inclination: 1.85, node: 49.558, perihelion: 286.502, phase: 250, radius: .53, diameter: 6779, day: 1.02596, tilt: 25.19, color: '#ca8567', kind: 'rock', info: '铁氧化物染红的沙漠星球。暗色岩地与明亮极冠，诉说着曾经拥有水的过去。' },
  { id: 'jupiter', name: '木星', english: 'JUPITER', a: 5.2026, e: .0485, inclination: 1.303, node: 100.464, perihelion: 273.867, phase: 150, radius: 1.8, diameter: 139820, day: .41354, tilt: 3.13, color: '#d5b698', kind: 'gas', info: '太阳系最大的行星。快速自转卷起明暗交错的云带，大红斑是一场持续了数百年的风暴。' },
  { id: 'saturn', name: '土星', english: 'SATURN', a: 9.5549, e: .0555, inclination: 2.489, node: 113.665, perihelion: 339.392, phase: 305, radius: 1.5, diameter: 116460, day: .444, tilt: 26.73, color: '#dbcea8', kind: 'gas', info: '由冰与岩石颗粒组成的环围绕着这颗气态巨行星。倾斜的自转轴，使星环在不同视角下呈现不同轮廓。' },
  { id: 'uranus', name: '天王星', english: 'URANUS', a: 19.2184, e: .0463, inclination: .773, node: 74.006, perihelion: 96.998, phase: 220, radius: 1.04, diameter: 50724, day: .71833, tilt: 97.77, color: '#9fd5d5', kind: 'ice', info: '一颗近乎侧躺着自转的冰巨星。大气中的甲烷吸收红光，留下宁静的蓝绿色。' },
  { id: 'neptune', name: '海王星', english: 'NEPTUNE', a: 30.1104, e: .0095, inclination: 1.77, node: 131.784, perihelion: 273.187, phase: 15, radius: 1.02, diameter: 49244, day: .67125, tilt: 28.32, color: '#537dcc', kind: 'ice', info: '遥远而深蓝的世界。猛烈的大气运动形成风暴和明亮云带，绕太阳一周需要约 165 年。' },
];
export function periodDays(a) { return 365.256 * a ** 1.5; }
export function solveKepler(meanAnomaly, e) {
  const mean = ((meanAnomaly + Math.PI) % TAU + TAU) % TAU - Math.PI;
  let eccentric = e < .8 ? mean : Math.PI;
  for (let i = 0; i < 12; i++) {
    const delta = (eccentric - e * Math.sin(eccentric) - mean) / (1 - e * Math.cos(eccentric));
    eccentric -= delta;
    if (Math.abs(delta) < 1e-12) break;
  }
  return eccentric;
}
export function orbitalPosition(body, days) {
  const mean = (body.phase || 0) * Math.PI / 180 + TAU * days / periodDays(body.a);
  const eccentric = solveKepler(mean, body.e);
  const x = body.a * (Math.cos(eccentric) - body.e);
  const z = body.a * Math.sqrt(1 - body.e * body.e) * Math.sin(eccentric);
  const w = (body.perihelion || 0) * Math.PI / 180;
  const i = (body.inclination || 0) * Math.PI / 180;
  const node = (body.node || 0) * Math.PI / 180;
  const px = x * Math.cos(w) - z * Math.sin(w);
  const pz = x * Math.sin(w) + z * Math.cos(w);
  return [px * Math.cos(node) - pz * Math.cos(i) * Math.sin(node), pz * Math.sin(i), px * Math.sin(node) + pz * Math.cos(i) * Math.cos(node)];
}
// Radial compression retains orbital angles and each planet's peri/aphelion variation.
export function visualPosition(body, days) {
  const position = orbitalPosition(body, days);
  const scale = 12 * body.a ** .58 / body.a;
  return position.map(value => value * scale);
}
