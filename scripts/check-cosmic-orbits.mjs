import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { BODIES, TAU, periodDays, solveKepler, orbitalPosition, visualPosition } from '../pages/cosmic-explorer/orbits.mjs';
for (const file of ['earth-day.jpg', 'earth-night.png', 'moon.jpg']) assert(existsSync(new URL(`../pages/cosmic-explorer/assets/${file}`, import.meta.url)), `Missing planet texture: ${file}`);
for (const body of BODIES) {
  assert(body.a > 0 && body.e >= 0 && body.e < 1 && body.radius > 0 && body.day !== 0);
  const period = periodDays(body.a);
  for (const mean of [-100, -Math.PI, 0, .4, Math.PI, 100]) {
    const eccentric = solveKepler(mean, body.e);
    const residual = Math.atan2(Math.sin(eccentric - body.e * Math.sin(eccentric) - mean), Math.cos(eccentric - body.e * Math.sin(eccentric) - mean));
    assert(Math.abs(residual) < 1e-10, 'Kepler equation residual');
  }
  const initial = orbitalPosition(body, 0), repeated = orbitalPosition(body, period);
  assert(Math.hypot(...initial.map((value, i) => value - repeated[i])) < 1e-9, 'Orbit must close after a period');
  const perihelion = orbitalPosition({ ...body, phase: 0 }, 0);
  const aphelion = orbitalPosition({ ...body, phase: 0 }, period / 2);
  assert(Math.abs(Math.hypot(...perihelion) - body.a * (1 - body.e)) < 1e-10);
  assert(Math.abs(Math.hypot(...aphelion) - body.a * (1 + body.e)) < 1e-10);
  const energies = [], momenta = [], mu = TAU ** 2 / 365.256 ** 2;
  for (const time of [0, period * .17, period * .39, period * .72]) {
    const dt = period * 1e-6;
    const position = orbitalPosition(body, time), before = orbitalPosition(body, time - dt), after = orbitalPosition(body, time + dt);
    const velocity = after.map((value, i) => (value - before[i]) / (2 * dt));
    energies.push(velocity.reduce((sum, v) => sum + v * v, 0) / 2 - mu / Math.hypot(...position));
    const cross = [position[1] * velocity[2] - position[2] * velocity[1], position[2] * velocity[0] - position[0] * velocity[2], position[0] * velocity[1] - position[1] * velocity[0]];
    momenta.push(Math.hypot(...cross));
    assert(visualPosition(body, time).every(Number.isFinite));
  }
  assert(Math.max(...energies) - Math.min(...energies) < Math.abs(energies[0]) * 1e-6, 'Specific orbital energy must be conserved');
  assert(Math.max(...momenta) - Math.min(...momenta) < momenta[0] * 1e-6, 'Specific angular momentum must be conserved');
}
assert(Math.abs(periodDays(1) - 365.256) < 1e-10);
assert(periodDays(30.1104) > 60000);
console.log('Eight planet orbits passed: Kepler residual, period closure, peri/aphelion distances, energy and angular-momentum conservation.');
