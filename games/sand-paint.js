const canvas = document.getElementById("sand-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const raster = document.createElement("canvas");
const rasterCtx = raster.getContext("2d");
const panel = document.getElementById("tool-panel");
const panelToggle = document.getElementById("toggle-tools");
const pauseButton = document.getElementById("pause-button");
const colorPicker = document.getElementById("color-picker");
const rainbowToggle = document.getElementById("rainbow-toggle");
const brushSize = document.getElementById("brush-size");
const flowRate = document.getElementById("flow-rate");
const grainSize = document.getElementById("grain-size");
const gravitySpeed = document.getElementById("gravity-speed");
const background = document.getElementById("background");
const undoButton = document.getElementById("undo-button");
const status = document.getElementById("action-status");
const littleEndian = new Uint8Array(new Uint32Array([0x01020304]).buffer)[0] === 4;
let world, imageData, pixels, width = 0, height = 0, cellSize = 2;
let tool = "sand", paused = false, hue = 20, previousTime = 0, accumulator = 0;
let pointer = null;
let lastStats = 0;
const history = [];

function packedColor(hex) {
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
  return littleEndian ? ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0 : ((r << 24) | (g << 16) | (b << 8) | 255) >>> 0;
}
function rainbowColor() {
  const h = (hue % 360) / 60;
  const c = 0.68, x = c * (1 - Math.abs(h % 2 - 1)), m = 0.18;
  const [r, g, b] = h < 1 ? [c, x, 0] : h < 2 ? [x, c, 0] : h < 3 ? [0, c, x] : h < 4 ? [0, x, c] : h < 5 ? [x, 0, c] : [c, 0, x];
  return packedColor(`#${[r, g, b].map(value => Math.round((value + m) * 255).toString(16).padStart(2, "0")).join("")}`);
}
function remember() {
  history.push(world.snapshot());
  let bytes = history.reduce((sum, snapshot) => sum + snapshot.types.byteLength + snapshot.colors.byteLength, 0);
  while (history.length > 6 || (bytes > 24 * 1024 * 1024 && history.length > 1)) {
    const removed = history.shift();
    bytes -= removed.types.byteLength + removed.colors.byteLength;
  }
  undoButton.disabled = false;
}
function resize() {
  pointer = null;
  const saved = world?.snapshot();
  width = window.innerWidth;
  height = window.innerHeight;
  // Bound memory on large displays while retaining small grains on typical screens.
  cellSize = Math.max(Number(grainSize.value), Math.ceil(Math.sqrt(width * height / 1500000)));
  world = new window.SandWorld(Math.ceil(width / cellSize), Math.ceil(height / cellSize));
  if (saved) world.restore(saved);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  raster.width = world.cols;
  raster.height = world.rows;
  imageData = rasterCtx.createImageData(world.cols, world.rows);
  pixels = new Uint32Array(imageData.data.buffer);
  refreshLabels();
  draw();
}
function draw() {
  if (!world.dirty) return;
  const bg = packedColor(background.value);
  for (let i = 0; i < pixels.length; i++) pixels[i] = world.types[i] ? world.colors[i] : bg;
  rasterCtx.putImageData(imageData, 0, 0);
  ctx.fillStyle = background.value;
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(raster, 0, 0, world.cols * cellSize, world.rows * cellSize);
  world.dirty = false;
}
function paintDisk(px, py) {
  const radius = Number(brushSize.value) / 2;
  const color = rainbowToggle.checked ? rainbowColor() : packedColor(colorPicker.value);
  const left = Math.max(0, Math.floor((px - radius) / cellSize));
  const right = Math.min(world.cols - 1, Math.ceil((px + radius) / cellSize));
  const top = Math.max(0, Math.floor((py - radius) / cellSize));
  const bottom = Math.min(world.rows - 1, Math.ceil((py + radius) / cellSize));
  for (let y = top; y <= bottom; y++) {
    for (let x = left; x <= right; x++) {
      if (Math.hypot((x + 0.5) * cellSize - px, (y + 0.5) * cellSize - py) > Math.max(radius, cellSize)) continue;
      if (tool === "sand") { if (Math.random() * 100 < Number(flowRate.value)) world.pour(x, y, color); }
      else world.set(x, y, tool === "wall" ? 2 : 0, color);
    }
  }
}
function paintSegment(from, to) {
  const distance = Math.hypot(to.x - from.x, to.y - from.y);
  const steps = Math.max(1, Math.ceil(distance / Math.max(cellSize, Number(brushSize.value) / 4)));
  for (let i = 1; i <= steps; i++) paintDisk(from.x + (to.x - from.x) * i / steps, from.y + (to.y - from.y) * i / steps);
}
function refreshLabels() {
  document.getElementById("brush-value").textContent = `${brushSize.value} px`;
  document.getElementById("flow-value").textContent = `${flowRate.value}%`;
  document.getElementById("current-color").textContent = rainbowToggle.checked ? "彩虹" : colorPicker.value.toUpperCase();
  document.getElementById("tool-status").textContent = `${{sand: "落沙", wall: "固定画笔", erase: "橡皮擦"}[tool]} · ${cellSize} px${paused ? " · 已暂停" : ""}`;
  document.querySelectorAll("[data-tool]").forEach(button => button.setAttribute("aria-pressed", String(button.dataset.tool === tool)));
  document.querySelectorAll("[data-color]").forEach(button => button.setAttribute("aria-pressed", String(!rainbowToggle.checked && button.dataset.color === colorPicker.value)));
}
function togglePanel(show) {
  panel.hidden = !show;
  panelToggle.setAttribute("aria-expanded", String(show));
  panelToggle.textContent = show ? (window.innerWidth <= 600 ? "收起" : "收起工具") : (window.innerWidth <= 600 ? "工具" : "展开工具");
}
function stopDrawing(event) {
  if (!pointer || (event?.pointerId !== undefined && pointer.id !== event.pointerId)) return;
  pointer = null;
}
canvas.addEventListener("pointerdown", event => {
  if (pointer || (event.pointerType === "mouse" && event.button !== 0)) return;
  remember();
  status.textContent = "";
  canvas.setPointerCapture(event.pointerId);
  pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  paintDisk(pointer.x, pointer.y);
});
canvas.addEventListener("pointermove", event => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const samples = event.getCoalescedEvents?.() || [event];
  for (const sample of samples.length ? samples : [event]) {
    const next = { x: sample.clientX, y: sample.clientY };
    paintSegment(pointer, next);
    pointer.x = next.x; pointer.y = next.y;
  }
});
canvas.addEventListener("pointerup", stopDrawing);
canvas.addEventListener("pointercancel", stopDrawing);
canvas.addEventListener("lostpointercapture", stopDrawing);
window.addEventListener("blur", () => { pointer = null; });
panelToggle.addEventListener("click", () => togglePanel(panel.hidden));
document.getElementById("close-tools").addEventListener("click", () => togglePanel(false));
pauseButton.addEventListener("click", () => {
  paused = !paused;
  pauseButton.textContent = paused ? "继续流动" : "暂停流动";
  pauseButton.setAttribute("aria-pressed", String(paused));
  refreshLabels();
});
document.querySelectorAll("[data-tool]").forEach(button => button.addEventListener("click", () => { tool = button.dataset.tool; refreshLabels(); }));
document.querySelectorAll("[data-color]").forEach(button => button.addEventListener("click", () => { colorPicker.value = button.dataset.color; rainbowToggle.checked = false; refreshLabels(); }));
[rainbowToggle, brushSize, flowRate].forEach(input => input.addEventListener("input", refreshLabels));
colorPicker.addEventListener("input", () => { rainbowToggle.checked = false; refreshLabels(); });
grainSize.addEventListener("change", () => { remember(); resize(); status.textContent = "砂粒大小已调整，作品保留"; });
background.addEventListener("change", () => { world.dirty = true; draw(); });
undoButton.addEventListener("click", () => {
  if (!history.length) return;
  pointer = null;
  world.restore(history.pop());
  undoButton.disabled = history.length === 0;
  status.textContent = "已撤销上一步";
  draw();
});
document.getElementById("clear-button").addEventListener("click", () => {
  if (!world.sandCount && !world.wallCount) return;
  remember(); pointer = null; world.clear(); draw(); status.textContent = "画布已清空，可撤销";
});
document.getElementById("export-button").addEventListener("click", () => {
  draw();
  canvas.toBlob(blob => {
    if (!blob) { status.textContent = "图片生成失败，请重试"; return; }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = "MOYU-彩砂作品.png";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    status.textContent = "作品已导出";
  }, "image/png");
});
window.addEventListener("resize", resize);
function animate(time) {
  const elapsed = previousTime ? Math.min(50, time - previousTime) : 16.67;
  previousTime = time;
  accumulator += elapsed;
  while (accumulator >= 16.67) {
    accumulator -= 16.67;
    hue = (hue + 0.7) % 360;
    if (pointer && tool === "sand") paintDisk(pointer.x, pointer.y);
    if (!paused) for (let step = 0; step < Math.max(1, Math.round(Number(gravitySpeed.value) * 2 / cellSize)); step++) world.step();
  }
  draw();
  if (time - lastStats > 250) {
    document.getElementById("grain-count").textContent = `砂粒 ${world.sandCount.toLocaleString()}${world.wallCount ? ` · 固定笔迹 ${world.wallCount.toLocaleString()}` : ""}`;
    lastStats = time;
  }
  requestAnimationFrame(animate);
}
resize();
togglePanel(window.innerWidth > 600);
requestAnimationFrame(animate);
