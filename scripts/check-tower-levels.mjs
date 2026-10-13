import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const context = { window: {} };
vm.runInNewContext(readFileSync(new URL("../games/stick-tower-hero/maps.js", import.meta.url), "utf8"), context);
vm.runInNewContext(readFileSync(new URL("../games/stick-tower-hero/levels.js", import.meta.url), "utf8"), context);
const levels = context.window.STICK_TOWER_LEVELS;
assert.equal(levels.length, 24);
const layouts = new Set();
const distributions = new Set();
const allowedTypes = new Set(["start", "boss", "enemy", "treasure", "key", "lock", "trap"]);
const reports = [];

for (const [index, level] of levels.entries()) {
  assert.equal(level.id, index + 1);
  assert(level.chapter && level.tip && level.mapName);
  assert(Number.isFinite(level.theme.hue));
  assert.equal(Object.keys(context.window.STICK_TOWER_MAPS[index].positions).length, level.rooms.length);
  assert(level.requiredRooms.every(id => level.rooms.some(room => room.id === id && room.goal)));
  assert.equal(level.requiredRooms.length, level.rooms.filter(room => room.goal).length);
  assert(level.rooms.length < 31, "Room count exceeds the game's bitmask capacity");
  const rooms = new Map(level.rooms.map(room => [room.id, room]));
  assert.equal(rooms.size, level.rooms.length);
  assert.equal(rooms.get(level.playerStart)?.type, "start");
  assert.equal(rooms.get(level.winRoom)?.type, "boss");
  assert.equal(level.rooms.filter(room => room.type === "boss").length, 1);
  const positions = new Set();
  for (const room of level.rooms) {
    assert(allowedTypes.has(room.type));
    assert(Number.isInteger(room.x) && Number.isInteger(room.y));
    const position = `${room.x},${room.y}`;
    assert(!positions.has(position), `Level ${level.id}: duplicate room position`);
    positions.add(position);
    if (room.type !== "start") assert(Number.isInteger(room.value) && room.value > 0);
  }
  const adjacency = new Map(level.rooms.map(room => [room.id, []]));
  const edges = new Set();
  for (const [a, b] of level.links) {
    assert(rooms.has(a) && rooms.has(b) && a !== b);
    const key = [a, b].sort((a, b) => a - b).join(",");
    assert(!edges.has(key));
    edges.add(key);
    adjacency.get(a).push(b);
    adjacency.get(b).push(a);
  }
  const seen = new Set([level.playerStart]);
  const queue = [level.playerStart];
  for (const id of queue) for (const next of adjacency.get(id)) if (!seen.has(next)) { seen.add(next); queue.push(next); }
  assert.equal(seen.size, rooms.size, `Level ${level.id}: disconnected rooms`);
  let wins = 0, blocked = 0, minMoves = Infinity, maxMoves = 0, doubleDoorWins = 0;
  function visit(id, power, keys, visited, usedDoubleDoor) {
    if (id === level.winRoom) {
      if (level.requiredRooms.some(target => !visited.has(target))) return;
      wins++; minMoves = Math.min(minMoves, visited.size - 1); maxMoves = Math.max(maxMoves, visited.size - 1);
      if (usedDoubleDoor) doubleDoorWins++;
      return;
    }
    for (const next of adjacency.get(id)) {
      if (visited.has(next)) continue;
      const room = rooms.get(next);
      let nextPower = power, nextKeys = keys;
      if (room.type === "enemy" || room.type === "boss") { if (power <= room.value) { blocked++; continue; } nextPower += room.value; }
      if (room.type === "treasure") nextPower += room.value;
      if (room.type === "key") nextKeys += room.value;
      if (room.type === "lock") { if (keys < room.value) { blocked++; continue; } nextKeys -= room.value; }
      if (room.type === "trap") { nextPower -= room.value; if (nextPower <= 0) { blocked++; continue; } }
      visit(next, nextPower, nextKeys, new Set([...visited, next]), usedDoubleDoor || (room.type === "lock" && room.value === 2));
    }
  }
  visit(level.playerStart, level.playerPower, 0, new Set([level.playerStart]), false);
  assert(wins > 0, `Level ${level.id} has no winning path`);
  if (level.rooms.some(room => room.type === "lock" && room.value === 2)) assert(doubleDoorWins > 0, `Level ${level.id}: double door has no usable winning route`);
  const layout = JSON.stringify({ positions: level.rooms.map(({ x, y }) => [x, y]), edges: [...edges].sort() });
  assert(!layouts.has(layout), `Level ${level.id}: repeated floor layout and links`);
  layouts.add(layout);
  const distribution = JSON.stringify(level.rooms.map(({ x, y, type }) => [x, y, type]));
  assert(!distributions.has(distribution), `Level ${level.id}: repeated room placement`);
  distributions.add(distribution);
  reports.push({ level: level.id, rooms: rooms.size, links: edges.size, wins, moves: `${minMoves}–${maxMoves}`, blocked });
}
console.table(reports);
console.log("24 levels passed: distinct layouts/items, connected graphs, legal room data, solvable routes and usable double-key gates.");
