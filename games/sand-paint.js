const canvas = document.getElementById("sand-canvas");
const ctx = canvas.getContext("2d", { alpha: false });
const grainCountEl = document.getElementById("grain-count");
const pileCountEl = document.getElementById("pile-count");
const fpsCountEl = document.getElementById("fps-count");
const colorPicker = document.getElementById("color-picker");
const currentColorEl = document.getElementById("current-color");
const rainbowToggle = document.getElementById("rainbow-toggle");

const backgroundCanvas = document.createElement("canvas");
const backgroundCtx = backgroundCanvas.getContext("2d", { alpha: false });
const settledCanvas = document.createElement("canvas");
const settledCtx = settledCanvas.getContext("2d");

let width = 0;
let height = 0;
let dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));
let hueSeed = 12;
let settledCount = 0;
let lastTimestamp = 0;

const maxParticles = 1800;
const burstMin = 4;
const burstMax = 8;
const pileStep = 6;
let pileHeights = [];

const particles = [];
const brush = {
  rainbow: true,
  hex: "#ff8b5e",
  hue: 18,
  saturation: 100,
  lightness: 68,
};
const pointer = {
  active: false,
  x: 0,
  y: 0,
  prevX: 0,
  prevY: 0,
  hue: 0,
  stillness: 0,
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function hexToHsl(hex) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized.split("").map((part) => part + part).join("")
    : normalized;
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));

    switch (max) {
      case r:
        h = 60 * (((g - b) / delta) % 6);
        break;
      case g:
        h = 60 * ((b - r) / delta + 2);
        break;
      default:
        h = 60 * ((r - g) / delta + 4);
        break;
    }
  }

  return {
    hue: (h + 360) % 360,
    saturation: Math.round(s * 100),
    lightness: Math.round(l * 100),
  };
}

function updateBrushFromHex(hex) {
  brush.hex = hex;
  const hsl = hexToHsl(hex);
  brush.hue = hsl.hue;
  brush.saturation = Math.max(60, hsl.saturation);
  brush.lightness = Math.max(48, hsl.lightness);
}

function updateColorLabel() {
  currentColorEl.textContent = brush.rainbow ? "彩虹" : brush.hex.toUpperCase();
}

function resize() {
  width = window.innerWidth;
  height = window.innerHeight;
  dpr = Math.max(1, Math.min(window.devicePixelRatio || 1, 2));

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  backgroundCanvas.width = canvas.width;
  backgroundCanvas.height = canvas.height;
  settledCanvas.width = canvas.width;
  settledCanvas.height = canvas.height;

  canvas.style.width = width + "px";
  canvas.style.height = height + "px";

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  backgroundCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  settledCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

  pileHeights = new Array(Math.ceil(width / pileStep) + 2).fill(height - 10);
  settledCount = 0;
  particles.length = 0;
  renderBackground();
  settledCtx.clearRect(0, 0, width, height);
}

function renderBackground() {
  backgroundCtx.clearRect(0, 0, width, height);

  const sky = backgroundCtx.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, "#11213a");
  sky.addColorStop(0.58, "#181a2e");
  sky.addColorStop(1, "#2c1830");
  backgroundCtx.fillStyle = sky;
  backgroundCtx.fillRect(0, 0, width, height);

  const glowTop = backgroundCtx.createRadialGradient(
    width * 0.35,
    height * 0.18,
    20,
    width * 0.35,
    height * 0.18,
    width * 0.5
  );
  glowTop.addColorStop(0, "rgba(86, 172, 255, 0.22)");
  glowTop.addColorStop(1, "rgba(86, 172, 255, 0)");
  backgroundCtx.fillStyle = glowTop;
  backgroundCtx.fillRect(0, 0, width, height);

  const glowBottom = backgroundCtx.createRadialGradient(
    width * 0.78,
    height * 0.84,
    20,
    width * 0.78,
    height * 0.84,
    width * 0.32
  );
  glowBottom.addColorStop(0, "rgba(255, 123, 84, 0.12)");
  glowBottom.addColorStop(1, "rgba(255, 123, 84, 0)");
  backgroundCtx.fillStyle = glowBottom;
  backgroundCtx.fillRect(0, 0, width, height);
}

function drawSettledGrain(x, y, radius, color) {
  settledCtx.globalAlpha = 0.92;
  settledCtx.fillStyle = color;
  settledCtx.beginPath();
  settledCtx.arc(x, y, radius, 0, Math.PI * 2);
  settledCtx.fill();

  settledCtx.globalAlpha = 0.22;
  settledCtx.fillStyle = "#fff7ea";
  settledCtx.beginPath();
  settledCtx.arc(x - radius * 0.18, y - radius * 0.18, Math.max(0.6, radius * 0.42), 0, Math.PI * 2);
  settledCtx.fill();
  settledCtx.globalAlpha = 1;
}

function addPile(x, radius, color) {
  const centerIndex = clamp(Math.floor(x / pileStep), 0, pileHeights.length - 1);
  const baseY = pileHeights[centerIndex] || (height - 10);
  const y = baseY - radius * 0.15;
  const spread = Math.max(2, Math.ceil(radius * 1.25));

  drawSettledGrain(x, y, radius, color);
  settledCount += 1;

  for (let offset = -spread; offset <= spread; offset += 1) {
    const column = centerIndex + offset;
    if (column < 0 || column >= pileHeights.length) {
      continue;
    }

    const influence = 1 - Math.abs(offset) / (spread + 1);
    pileHeights[column] -= Math.max(0.14, radius * 0.34 * influence);
    pileHeights[column] = Math.max(height * 0.28, pileHeights[column]);
  }
}

function spawnParticle(x, y, dx, dy, strength) {
  if (particles.length >= maxParticles) {
    return false;
  }

  const angleJitter = (Math.random() - 0.5) * 0.8;
  const speed = 0.5 + Math.random() * 1.6 + strength * 0.025;
  const verticalBonus = ((height - y) / Math.max(height, 1)) * 90;
  const hue = brush.rainbow
    ? (pointer.hue + Math.random() * 34) % 360
    : (brush.hue + (Math.random() - 0.5) * 12 + 360) % 360;
  const saturation = brush.rainbow ? 92 : clamp(brush.saturation + 8, 70, 100);
  const lightness = brush.rainbow
    ? 60 + Math.random() * 12
    : clamp(brush.lightness + Math.random() * 8 - 4, 48, 76);

  particles.push({
    x,
    y,
    prevX: x,
    prevY: y,
    vx: dx * (0.05 + Math.random() * 0.02) + Math.cos(angleJitter) * speed,
    vy: dy * (0.04 + Math.random() * 0.02) - 0.8 + Math.sin(angleJitter) * speed,
    radius: 1.5 + Math.random() * 2.1,
    life: 120 + verticalBonus + Math.random() * 50,
    color: `hsl(${hue} ${saturation}% ${lightness}%)`,
  });

  return true;
}

function spawnBurst(x, y, movementX, movementY, distance) {
  const loadFactor = particles.length / maxParticles;
  const densityFactor = loadFactor > 0.88 ? 0.45 : loadFactor > 0.72 ? 0.7 : 1;
  const speedBonus = Math.min(10, Math.floor(distance / 10));
  const burst = Math.max(
    2,
    Math.round((burstMin + Math.min(burstMax + speedBonus, Math.floor(distance / 12))) * densityFactor)
  );

  for (let i = 0; i < burst; i += 1) {
    const created = spawnParticle(x, y, movementX, movementY, distance);
    if (!created) {
      break;
    }
  }
}

function paintRibbon() {
  if (!pointer.active) {
    return;
  }

  const dx = pointer.x - pointer.prevX;
  const dy = pointer.y - pointer.prevY;
  const distance = Math.hypot(dx, dy);

  if (distance < 0.8) {
    pointer.stillness += 1;
    if (pointer.stillness % 5 === 0) {
      spawnBurst(pointer.x, pointer.y, 0, 0, 20);
    }
    return;
  }

  pointer.stillness = 0;

  const steps = Math.max(1, Math.ceil(distance / 10));
  for (let step = 0; step <= steps; step += 1) {
    const t = step / steps;
    const px = pointer.prevX + dx * t;
    const py = pointer.prevY + dy * t;
    spawnBurst(px, py, dx, dy, distance);
  }

  pointer.prevX = pointer.x;
  pointer.prevY = pointer.y;
}

function updateParticles(deltaFactor) {
  for (let i = particles.length - 1; i >= 0; i -= 1) {
    const particle = particles[i];
    particle.prevX = particle.x;
    particle.prevY = particle.y;

    particle.vx *= 0.992;
    particle.vy += 0.09 * deltaFactor;
    particle.x += particle.vx * deltaFactor;
    particle.y += particle.vy * deltaFactor;
    if (particle.y > height * 0.72) {
      particle.life -= 0.45 * deltaFactor;
    } else {
      particle.life -= 0.12 * deltaFactor;
    }

    if (particle.x < 0 || particle.x > width) {
      particle.vx *= -0.68;
      particle.x = clamp(particle.x, 0, width);
    }

    const column = clamp(Math.floor(particle.x / pileStep), 0, pileHeights.length - 1);
    const floorY = pileHeights[column];

    if (particle.y + particle.radius >= floorY) {
      addPile(particle.x, particle.radius, particle.color);
      particles.splice(i, 1);
      continue;
    }

    if (particle.life <= 0 || particle.y > height + 30) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles() {
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  for (let i = 0; i < particles.length; i += 1) {
    const particle = particles[i];
    const alpha = Math.max(0.12, particle.life / 100);

    ctx.globalAlpha = alpha * 0.55;
    ctx.strokeStyle = particle.color;
    ctx.lineWidth = Math.max(1, particle.radius * 0.85);
    ctx.beginPath();
    ctx.moveTo(particle.prevX, particle.prevY);
    ctx.lineTo(particle.x, particle.y);
    ctx.stroke();

    ctx.globalAlpha = alpha;
    ctx.fillStyle = particle.color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
}

function updateStats(frameTime) {
  grainCountEl.textContent = `活跃粒子 ${particles.length}`;
  pileCountEl.textContent = `堆积沙粒 ${settledCount}`;
  fpsCountEl.textContent = frameTime < 18 ? "渲染状态 流畅" : frameTime < 28 ? "渲染状态 正常" : "渲染状态 繁忙";
}

function animate(timestamp) {
  requestAnimationFrame(animate);

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const frameTime = timestamp - lastTimestamp;
  const deltaFactor = clamp(frameTime / 16.67, 0.75, 1.8);
  lastTimestamp = timestamp;

  hueSeed = (hueSeed + 0.65) % 360;
  pointer.hue = hueSeed;

  if (pointer.active) {
    paintRibbon();
  }

  updateParticles(deltaFactor);

  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(backgroundCanvas, 0, 0, width, height);
  ctx.drawImage(settledCanvas, 0, 0, width, height);
  drawParticles();
  updateStats(frameTime);
}

function setPointerPosition(clientX, clientY) {
  pointer.x = clientX;
  pointer.y = clientY;
}

function pointerDown(clientX, clientY) {
  pointer.active = true;
  pointer.prevX = clientX;
  pointer.prevY = clientY;
  pointer.stillness = 0;
  setPointerPosition(clientX, clientY);
  spawnBurst(clientX, clientY, 0, 0, 34);
}

function pointerMove(clientX, clientY) {
  if (!pointer.active) {
    pointer.prevX = clientX;
    pointer.prevY = clientY;
  }
  setPointerPosition(clientX, clientY);
}

colorPicker.addEventListener("input", (event) => {
  updateBrushFromHex(event.target.value);
  updateColorLabel();
});

rainbowToggle.addEventListener("change", (event) => {
  brush.rainbow = event.target.checked;
  updateColorLabel();
});

window.addEventListener("resize", resize);

canvas.addEventListener("pointerdown", (event) => {
  if (event.pointerType === "mouse" && event.button !== 0) {
    return;
  }
  canvas.setPointerCapture(event.pointerId);
  pointerDown(event.clientX, event.clientY);
});

canvas.addEventListener("pointermove", (event) => {
  pointerMove(event.clientX, event.clientY);
});

canvas.addEventListener("pointerup", () => {
  pointer.active = false;
  pointer.stillness = 0;
});

canvas.addEventListener("pointercancel", () => {
  pointer.active = false;
  pointer.stillness = 0;
});

canvas.addEventListener("pointerleave", () => {
  if (!pointer.active) {
    return;
  }
  pointer.active = false;
  pointer.stillness = 0;
});

resize();
updateBrushFromHex(colorPicker.value);
updateColorLabel();
animate(0);
