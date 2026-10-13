const boardEl = document.getElementById("board");
const trayEl = document.getElementById("tray");
const boardCountEl = document.getElementById("board-count");
const trayCountEl = document.getElementById("tray-count");
const statusTextEl = document.getElementById("status-text");
const boardStatusEl = document.getElementById("board-status");
const trayStatusEl = document.getElementById("tray-status");
const levelLabelEl = document.getElementById("level-label");
const levelPillEl = document.getElementById("level-pill");
const timerTextEl = document.getElementById("timer-text");
const bestTimeEl = document.getElementById("best-time");
const restartButton = document.getElementById("restart-button");
const removeThreeButton = document.getElementById("remove-three-button");
const bombButton = document.getElementById("bomb-button");
const shuffleButton = document.getElementById("shuffle-button");
const unlockButton = document.getElementById("unlock-button");
const removeThreeCountEl = document.getElementById("remove-three-count");
const bombCountEl = document.getElementById("bomb-count");
const shuffleCountEl = document.getElementById("shuffle-count");
const unlockCountEl = document.getElementById("unlock-count");
const qrModal = document.getElementById("qr-modal");
const closeModalButton = document.getElementById("close-modal-button");
const confirmUnlockButton = document.getElementById("confirm-unlock-button");
const qrImage = document.getElementById("qr-image");
const qrFallback = document.getElementById("qr-fallback");

const BEST_TIME_STORAGE_KEY = "moyu-mahjong-best-run-ms-v1";
const TILE_WIDTH = 72;
const TILE_HEIGHT = 96;
const TILE_FACE_INSET = 14;
let timerIntervalId = null;

const tileDefs = [
  { key: "bamboo-1", name: "一索", image: "./assets/mahjong-tiles/Sou1.png" },
  { key: "bamboo-2", name: "三索", image: "./assets/mahjong-tiles/Sou3.png" },
  { key: "bamboo-3", name: "五索", image: "./assets/mahjong-tiles/Sou5.png" },
  { key: "bamboo-4", name: "七索", image: "./assets/mahjong-tiles/Sou7.png" },
  { key: "coin-1", name: "一筒", image: "./assets/mahjong-tiles/Pin1.png" },
  { key: "coin-2", name: "三筒", image: "./assets/mahjong-tiles/Pin3.png" },
  { key: "coin-3", name: "五筒", image: "./assets/mahjong-tiles/Pin5.png" },
  { key: "coin-4", name: "七筒", image: "./assets/mahjong-tiles/Pin7.png" },
  { key: "wind-1", name: "东风", image: "./assets/mahjong-tiles/Ton.png" },
  { key: "wind-2", name: "南风", image: "./assets/mahjong-tiles/Nan.png" },
  { key: "dragon-1", name: "红中", image: "./assets/mahjong-tiles/Chun.png" },
  { key: "dragon-2", name: "发财", image: "./assets/mahjong-tiles/Hatsu.png" },
];
const tileMap = Object.fromEntries(tileDefs.map((tile) => [tile.key, tile]));

function makeRow(startX, y, z, count, step = 86) {
  return Array.from({ length: count }, (_, index) => ({
    x: startX + index * step,
    y,
    z,
  }));
}

const levelConfigs = [
  {
    id: 1,
    title: "第 1 关",
    subtitle: "进阶局",
    intro: "第一关现在直接采用原来的加压布局，开局就需要认真拆层。",
    triples: [
      "coin-1",
      "coin-2",
      "coin-3",
      "coin-4",
      "bamboo-1",
      "bamboo-2",
      "bamboo-3",
      "bamboo-4",
      "wind-1",
      "wind-2",
      "dragon-1",
      "dragon-2",
    ],
    slots: [
      ...makeRow(34, 62, 0, 7),
      ...makeRow(76, 154, 0, 6),
      ...makeRow(34, 246, 0, 7),
      ...makeRow(76, 108, 1, 6),
      ...makeRow(118, 200, 1, 5),
      ...makeRow(160, 154, 2, 4),
      ...makeRow(289, 114, 3, 1),
    ],
  },
  {
    id: 2,
    title: "第 2 关",
    subtitle: "翻倍压场局",
    intro: "第二关牌量直接翻倍，层数更多，底层清理路线也更讲究。",
    triples: [
      "coin-1",
      "coin-1",
      "coin-2",
      "coin-2",
      "coin-3",
      "coin-3",
      "coin-4",
      "coin-4",
      "bamboo-1",
      "bamboo-1",
      "bamboo-2",
      "bamboo-2",
      "bamboo-3",
      "bamboo-3",
      "bamboo-4",
      "bamboo-4",
      "wind-1",
      "wind-1",
      "wind-2",
      "wind-2",
      "dragon-1",
      "dragon-1",
      "dragon-2",
    ],
    slots: [
      ...makeRow(24, 42, 0, 8),
      ...makeRow(24, 144, 0, 8),
      ...makeRow(24, 246, 0, 8),
      ...makeRow(24, 348, 0, 8),
      ...makeRow(68, 94, 1, 7),
      ...makeRow(68, 196, 1, 7),
      ...makeRow(68, 298, 1, 7),
      ...makeRow(112, 146, 2, 6),
      ...makeRow(112, 248, 2, 6),
      ...makeRow(156, 198, 3, 4),
      ...makeRow(242, 112, 4, 2),
      ...makeRow(328, 112, 4, 2),
    ],
  },
];

const levelCount = levelConfigs.length;

function createDefaultToolUses() {
  return {
    removeThree: 1,
    bomb: 1,
    shuffle: 1,
  };
}

function readBestTimeMs() {
  try {
    const raw = window.localStorage.getItem(BEST_TIME_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    const parsed = Number(raw);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function writeBestTimeMs(value) {
  try {
    window.localStorage.setItem(BEST_TIME_STORAGE_KEY, String(value));
  } catch {
    // Ignore storage failures in static-page contexts.
  }
}

function formatDuration(ms) {
  if (!Number.isFinite(ms) || ms < 0) {
    return "--";
  }

  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function shuffle(list) {
  const arr = [...list];
  for (let index = arr.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [arr[index], arr[swapIndex]] = [arr[swapIndex], arr[index]];
  }
  return arr;
}

function getCurrentLevel() {
  return levelConfigs[state.currentLevelIndex];
}

function createLevelTiles(levelConfig) {
  const deck = levelConfig.triples.flatMap((key, tripleIndex) =>
    Array.from({ length: 3 }, (_, copyIndex) => ({
      ...tileMap[key],
      id: `${levelConfig.id}-${key}-${tripleIndex}-${copyIndex + 1}`,
    }))
  );

  return shuffle(deck).map((tile, slotId) => ({
    ...tile,
    slotId,
  }));
}

function createBaseState() {
  return {
    boardTiles: [],
    trayTiles: [],
    trayLimit: 7,
    unlockedExtraSlot: false,
    toolUses: createDefaultToolUses(),
    gameOver: false,
    runComplete: false,
    bombMode: false,
    message: "选一张没有被压住的麻将开始摸鱼。",
    currentLevelIndex: 0,
    runStartAt: Date.now(),
    finalElapsedMs: null,
    bestTimeMs: readBestTimeMs(),
  };
}

let state = createBaseState();

function updateTimerUi() {
  timerTextEl.textContent = formatDuration(getElapsedMs());
  bestTimeEl.textContent = state.bestTimeMs ? formatDuration(state.bestTimeMs) : "--";
}

function startTimer() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
  }
  updateTimerUi();
  timerIntervalId = window.setInterval(updateTimerUi, 200);
}

function stopTimer() {
  if (timerIntervalId) {
    window.clearInterval(timerIntervalId);
    timerIntervalId = null;
  }
  updateTimerUi();
}

function getElapsedMs() {
  if (state.finalElapsedMs !== null) {
    return state.finalElapsedMs;
  }
  return Date.now() - state.runStartAt;
}

function getSlot(tile) {
  return getCurrentLevel().slots[tile.slotId];
}

function getTileRect(tile) {
  const slot = getSlot(tile);
  return {
    left: slot.x,
    top: slot.y - slot.z * 10,
    right: slot.x + TILE_WIDTH,
    bottom: slot.y - slot.z * 10 + TILE_HEIGHT,
  };
}

function getTileFaceRect(tile) {
  const rect = getTileRect(tile);
  return {
    left: rect.left + TILE_FACE_INSET,
    top: rect.top + TILE_FACE_INSET,
    right: rect.right - TILE_FACE_INSET,
    bottom: rect.bottom - TILE_FACE_INSET,
  };
}

function isCovered(tile) {
  const faceRect = getTileFaceRect(tile);
  const testPoints = [
    {
      x: (faceRect.left + faceRect.right) / 2,
      y: faceRect.top + (faceRect.bottom - faceRect.top) * 0.36,
    },
    {
      x: (faceRect.left + faceRect.right) / 2,
      y: faceRect.top + (faceRect.bottom - faceRect.top) * 0.56,
    },
  ];

  return state.boardTiles.some((other) => {
    if (other.id === tile.id) {
      return false;
    }

    const tileSlot = getSlot(tile);
    const otherSlot = getSlot(other);
    if (otherSlot.z <= tileSlot.z) {
      return false;
    }

    const otherFaceRect = getTileFaceRect(other);
    return testPoints.some(
      (point) =>
        point.x > otherFaceRect.left + 4 &&
        point.x < otherFaceRect.right - 4 &&
        point.y > otherFaceRect.top + 4 &&
        point.y < otherFaceRect.bottom - 4
    );
  });
}

function setMessage(text, success = false) {
  state.message = text;
  statusTextEl.textContent = text;
  boardStatusEl.textContent = text;
  statusTextEl.style.color = success ? "var(--good)" : "var(--ink)";
}

function removeTrayTriples() {
  let removedSomething = false;

  while (true) {
    const counts = new Map();
    state.trayTiles.forEach((tile) => {
      counts.set(tile.key, (counts.get(tile.key) || 0) + 1);
    });

    const tripleKey = [...counts.entries()].find((entry) => entry[1] >= 3)?.[0];
    if (!tripleKey) {
      break;
    }

    let removed = 0;
    state.trayTiles = state.trayTiles.filter((tile) => {
      if (tile.key === tripleKey && removed < 3) {
        removed += 1;
        removedSomething = true;
        return false;
      }
      return true;
    });
  }

  return removedSomething;
}

function failRun(reason) {
  state.gameOver = true;
  state.runComplete = true;
  state.finalElapsedMs = getElapsedMs();
  setMessage(`${reason} 本次总用时 ${formatDuration(state.finalElapsedMs)}。`);
  stopTimer();
}

function completeRun() {
  state.gameOver = true;
  state.runComplete = true;
  state.finalElapsedMs = getElapsedMs();

  if (!state.bestTimeMs || state.finalElapsedMs < state.bestTimeMs) {
    state.bestTimeMs = state.finalElapsedMs;
    writeBestTimeMs(state.bestTimeMs);
    setMessage(`两关通关成功，用时 ${formatDuration(state.finalElapsedMs)}，刷新了最佳记录。`, true);
  } else {
    setMessage(`两关通关成功，用时 ${formatDuration(state.finalElapsedMs)}。`, true);
  }

  stopTimer();
}

function loadLevel(levelIndex, openingMessage) {
  state.currentLevelIndex = levelIndex;
  state.boardTiles = createLevelTiles(getCurrentLevel());
  state.trayTiles = [];
  state.trayLimit = state.unlockedExtraSlot ? 8 : 7;
  state.toolUses = createDefaultToolUses();
  state.gameOver = false;
  state.bombMode = false;
  setMessage(openingMessage ?? getCurrentLevel().intro);
  render();
}

function advanceLevel() {
  if (state.currentLevelIndex >= levelCount - 1) {
    completeRun();
    render();
    return;
  }

  state.gameOver = true;
  const currentLevel = getCurrentLevel();
  setMessage(`${currentLevel.title} 已完成，累计用时 ${formatDuration(getElapsedMs())}，准备进入下一关。`, true);
  render();

  window.setTimeout(() => {
    loadLevel(state.currentLevelIndex + 1, `${getCurrentLevel().title} 开始了，牌会更密，遮挡也更复杂。`);
  }, 700);
}

function checkEndState() {
  if (state.gameOver) {
    return;
  }

  if (state.boardTiles.length === 0) {
    advanceLevel();
    return;
  }

  if (state.trayTiles.length >= state.trayLimit) {
    failRun(`手牌区已经满了，止步于 ${getCurrentLevel().title}。`);
    render();
  }
}

function placeTileIntoTray(tileId) {
  if (state.gameOver) {
    return;
  }

  const tile = state.boardTiles.find((item) => item.id === tileId);
  if (!tile) {
    return;
  }

  if (isCovered(tile)) {
    setMessage("这张麻将还被上层压着，先换一张。");
    render();
    return;
  }

  state.boardTiles = state.boardTiles.filter((item) => item.id !== tileId);
  state.trayTiles.push({ ...tile });

  const removed = removeTrayTriples();
  if (removed) {
    setMessage(`凑齐了 3 张 ${tile.name}，已经自动消除。`);
  } else {
    setMessage(`已将 ${tile.name} 放入手牌区。`);
  }

  checkEndState();
  render();
}

function useRemoveThree() {
  if (state.gameOver || state.toolUses.removeThree <= 0) {
    return;
  }

  if (state.trayTiles.length < 3) {
    setMessage("手牌区不足 3 张，暂时没法退回。");
    render();
    return;
  }

  const returning = state.trayTiles.splice(0, 3);
  const occupiedSlotIds = new Set(state.boardTiles.map((tile) => tile.slotId));
  const freeSlotIds = getCurrentLevel()
    .slots.map((_, slotId) => slotId)
    .filter((slotId) => !occupiedSlotIds.has(slotId))
    .sort((leftId, rightId) => {
      const leftSlot = getCurrentLevel().slots[leftId];
      const rightSlot = getCurrentLevel().slots[rightId];
      return rightSlot.z - leftSlot.z || leftSlot.y - rightSlot.y || leftSlot.x - rightSlot.x;
    });

  returning.forEach((tile, index) => {
    const slotId = freeSlotIds[index] ?? freeSlotIds[0] ?? index;
    state.boardTiles.push({ ...tile, slotId });
  });

  state.toolUses.removeThree -= 1;
  setMessage("手牌区前 3 张已经退回桌面。");
  render();
}

function activateBomb() {
  if (state.gameOver || state.toolUses.bomb <= 0) {
    return;
  }

  state.bombMode = true;
  setMessage("炸弹已启动，点一张桌面麻将直接炸掉 3 张同类。");
  render();
}

function useBomb(tileId) {
  const sourceTile = state.boardTiles.find((tile) => tile.id === tileId);
  if (!sourceTile) {
    return;
  }

  const matches = state.boardTiles.filter((tile) => tile.key === sourceTile.key).slice(0, 3);
  if (matches.length < 3) {
    state.bombMode = false;
    setMessage("桌面上不足 3 张同类麻将，炸弹没能生效。");
    render();
    return;
  }

  const ids = new Set(matches.map((tile) => tile.id));
  state.boardTiles = state.boardTiles.filter((tile) => !ids.has(tile.id));
  state.toolUses.bomb -= 1;
  state.bombMode = false;
  setMessage(`炸弹生效，直接清掉了 3 张 ${sourceTile.name}。`);
  checkEndState();
  render();
}

function useShuffle() {
  if (state.gameOver || state.toolUses.shuffle <= 0) {
    return;
  }

  const occupiedSlotIds = shuffle(state.boardTiles.map((tile) => tile.slotId));
  state.boardTiles = shuffle(state.boardTiles).map((tile, index) => ({
    ...tile,
    slotId: occupiedSlotIds[index],
  }));
  state.toolUses.shuffle -= 1;
  setMessage("桌面麻将已经重新打乱。");
  render();
}

function openUnlockModal() {
  if (state.unlockedExtraSlot) {
    setMessage("第 8 格已经解锁了。");
    render();
    return;
  }

  qrModal.classList.add("open");
  qrModal.setAttribute("aria-hidden", "false");
}

function closeUnlockModal() {
  qrModal.classList.remove("open");
  qrModal.setAttribute("aria-hidden", "true");
}

function setupQrAsset() {
  qrImage.addEventListener("load", () => {
    qrImage.classList.add("ready");
    qrFallback.classList.add("hidden");
  });

  qrImage.addEventListener("error", () => {
    qrImage.classList.remove("ready");
    qrFallback.classList.remove("hidden");
  });
}

function confirmUnlock() {
  state.unlockedExtraSlot = true;
  state.trayLimit = 8;
  closeUnlockModal();
  setMessage("第 8 格已解锁，本次挑战后续都将按 8 格计算。");
  render();
}

function renderBoard() {
  boardEl.innerHTML = "";

  const tiles = [...state.boardTiles].sort((leftTile, rightTile) => {
    const leftSlot = getSlot(leftTile);
    const rightSlot = getSlot(rightTile);
    return leftSlot.z - rightSlot.z || leftSlot.y - rightSlot.y || leftSlot.x - rightSlot.x;
  });

  tiles.forEach((tile) => {
    const slot = getSlot(tile);
    const covered = isCovered(tile);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile";
    if (covered) {
      button.classList.add("covered");
    } else {
      button.classList.add("available");
    }
    if (state.bombMode) {
      button.classList.add("bomb-target");
    }
    button.style.left = `${slot.x}px`;
    button.style.top = `${slot.y - slot.z * 10}px`;
    button.style.zIndex = String(slot.z * 100 + Math.floor(slot.y));
    button.ariaLabel = `${tile.name}${covered ? "，当前被上层压住" : "，可点击"}`;
    button.innerHTML = `
      <span class="tile-face">
        <img class="tile-image" src="${tile.image}" alt="${tile.name}" />
      </span>
    `;
    button.addEventListener("click", () => {
      if (state.gameOver) {
        return;
      }
      if (state.bombMode) {
        useBomb(tile.id);
      } else {
        placeTileIntoTray(tile.id);
      }
    });
    boardEl.appendChild(button);
  });
}

function renderTray() {
  trayEl.innerHTML = "";

  for (let index = 0; index < 8; index += 1) {
    const slot = document.createElement("div");
    slot.className = "tray-slot";

    if (index === 7 && !state.unlockedExtraSlot) {
      slot.classList.add("locked-slot");
      slot.innerHTML = "<strong>🔒</strong>";
      trayEl.appendChild(slot);
      continue;
    }

    const tile = state.trayTiles[index];
    if (tile) {
      slot.classList.add("filled");
      slot.innerHTML = `
        <div class="tray-tile">
          <img class="tray-image" src="${tile.image}" alt="${tile.name}" />
        </div>
      `;
    }

    trayEl.appendChild(slot);
  }
}

function renderSidebar() {
  const currentLevel = getCurrentLevel();
  boardCountEl.textContent = String(state.boardTiles.length);
  trayCountEl.textContent = `${state.trayTiles.length} / ${state.trayLimit}`;
  trayStatusEl.textContent = `当前上限 ${state.trayLimit} 格`;
  levelLabelEl.textContent = `${currentLevel.title} / 共 ${levelCount} 关`;
  levelPillEl.textContent = `${currentLevel.title} · ${currentLevel.subtitle}`;
  removeThreeCountEl.textContent = String(state.toolUses.removeThree);
  bombCountEl.textContent = String(state.toolUses.bomb);
  shuffleCountEl.textContent = String(state.toolUses.shuffle);
  unlockCountEl.textContent = state.unlockedExtraSlot ? "开" : "锁";

  removeThreeButton.disabled = state.toolUses.removeThree <= 0 || state.trayTiles.length < 3 || state.gameOver;
  bombButton.disabled = state.toolUses.bomb <= 0 || state.gameOver;
  shuffleButton.disabled = state.toolUses.shuffle <= 0 || state.gameOver;
  unlockButton.disabled = state.unlockedExtraSlot;

  updateTimerUi();
}

function render() {
  renderBoard();
  renderTray();
  renderSidebar();
}

function startNewRun() {
  state = createBaseState();
  state.runStartAt = Date.now();
  loadLevel(0, "第一关开始，先把最上层和最边缘的牌清出来。");
  startTimer();
}

restartButton.addEventListener("click", startNewRun);
removeThreeButton.addEventListener("click", useRemoveThree);
bombButton.addEventListener("click", activateBomb);
shuffleButton.addEventListener("click", useShuffle);
unlockButton.addEventListener("click", openUnlockModal);
closeModalButton.addEventListener("click", closeUnlockModal);
confirmUnlockButton.addEventListener("click", confirmUnlock);
qrModal.addEventListener("click", (event) => {
  if (event.target === qrModal) {
    closeUnlockModal();
  }
});

setupQrAsset();
startNewRun();
