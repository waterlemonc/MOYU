(function () {
  const LEVELS = window.STICK_TOWER_LEVELS || [];
  const STORAGE_KEY = "moyu-stick-tower-progress-v3";
  const LEGACY_STORAGE_KEY = "moyu-stick-tower-progress-v1";
  const MESSAGE_COLORS = {
    info: "#16304f",
    good: "#1f7b4f",
    warn: "#b66a22",
    danger: "#a73438"
  };

  const canvas = document.getElementById("game-canvas");
  const ctx = canvas.getContext("2d");
  const mapFrame = document.querySelector(".canvas-frame");
  const zoomButton = document.getElementById("map-zoom");

  const ui = {
    levelName: document.getElementById("level-name"),
    chapterName: document.getElementById("chapter-name"),
    levelPicker: document.getElementById("level-picker"),
    levelIndexLabel: document.getElementById("level-index-label"),
    powerValue: document.getElementById("power-value"),
    keyValue: document.getElementById("key-value"),
    scoreValue: document.getElementById("score-value"),
    timeValue: document.getElementById("time-value"),
    bestValue: document.getElementById("best-value"),
    unlockValue: document.getElementById("unlock-value"),
    statusMessage: document.getElementById("status-message"),
    prevLevel: document.getElementById("prev-level"),
    restartLevel: document.getElementById("restart-level"),
    hintLevel: document.getElementById("hint-level"),
    nextLevel: document.getElementById("next-level"),
    resultModal: document.getElementById("result-modal"),
    modalTitle: document.getElementById("modal-title"),
    modalText: document.getElementById("modal-text"),
    modalTime: document.getElementById("modal-time"),
    modalScore: document.getElementById("modal-score"),
    modalBest: document.getElementById("modal-best"),
    modalPrimary: document.getElementById("modal-primary"),
    modalSecondary: document.getElementById("modal-secondary")
  };

  const mobileStats = document.querySelector(".mobile-stats");
  const mobileValues = [];
  for (const [label, source] of [["战力", ui.powerValue], ["钥匙", ui.keyValue], ["分数", ui.scoreValue], ["用时", ui.timeValue]]) {
    const stat = document.createElement("div");
    stat.className = "mobile-stat";
    const caption = document.createElement("span");
    caption.textContent = label;
    const value = document.createElement("strong");
    stat.append(caption, value);
    mobileStats.append(stat);
    mobileValues.push({ source, value });
  }
  if (window.matchMedia("(max-width: 700px)").matches) document.querySelector(".guide").open = false;
  let modalReturnFocus = null;
  let chapterGroup = null;
  for (const [index, level] of LEVELS.entries()) {
    if (!chapterGroup || chapterGroup.label !== level.chapter) {
      chapterGroup = document.createElement("optgroup");
      chapterGroup.label = level.chapter;
      ui.levelPicker.append(chapterGroup);
    }
    const option = document.createElement("option");
    option.value = index;
    option.textContent = `${index + 1}. ${level.shortName}`;
    chapterGroup.append(option);
  }

  const state = {
    overview: true,
    progress: loadProgress(),
    levelIndex: 0,
    level: null,
    levelMeta: null,
    roomMap: new Map(),
    adjacency: new Map(),
    player: {
      roomId: null,
      power: 0,
      keys: 0
    },
    layout: {
      width: 0,
      height: 0,
      roomWidth: 76,
      roomHeight: 66,
      roomRects: new Map(),
      centers: new Map()
    },
    canvasWidth: canvas.clientWidth || 432,
    canvasHeight: canvas.clientHeight || 768,
    clearedRooms: 0,
    visitedRoomIds: new Set(),
    visitedMask: 0,
    hoverRoomId: null,
    invalidRoomId: null,
    invalidUntil: 0,
    hintRoomId: null,
    hintUntil: 0,
    effects: [],
    moveAnimation: null,
    isLevelWon: false,
    isLevelLost: false,
    shakeUntil: 0,
    levelStartedAt: 0,
    levelEndedAt: 0,
    baseMessage: "准备爬塔。",
    baseMessageType: "info",
    transientMessage: "",
    transientType: "info",
    transientUntil: 0,
    modalActions: {
      primary: null,
      secondary: null
    }
  };

  if (!LEVELS.length) {
    ui.statusMessage.textContent = "关卡数据没有加载成功。";
    return;
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatTime(ms) {
    const totalSeconds = Math.max(0, Math.round(ms / 1000));
    const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
    const seconds = String(totalSeconds % 60).padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  function getElapsedMs() {
    if (!state.levelStartedAt) {
      return 0;
    }

    if (state.levelEndedAt) {
      return state.levelEndedAt - state.levelStartedAt;
    }

    return performance.now() - state.levelStartedAt;
  }

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const legacyRaw = raw ? null : (window.localStorage.getItem("moyu-stick-tower-progress-v2") || window.localStorage.getItem(LEGACY_STORAGE_KEY));
      if (!raw && legacyRaw) {
        const legacy = JSON.parse(legacyRaw);
        return { unlocked: clamp(Number(legacy.unlocked) || 0, 0, LEVELS.length - 1), bestTimes: {}, bestScores: {} };
      }
      if (!raw) {
        return {
          unlocked: 0,
          bestTimes: {},
          bestScores: {}
        };
      }

      const parsed = JSON.parse(raw);
      return {
        unlocked: clamp(Number(parsed.unlocked) || 0, 0, LEVELS.length - 1),
        bestTimes: parsed.bestTimes && typeof parsed.bestTimes === "object" ? parsed.bestTimes : {},
        bestScores: parsed.bestScores && typeof parsed.bestScores === "object" ? parsed.bestScores : {}
      };
    } catch (error) {
      return {
        unlocked: 0,
        bestTimes: {},
        bestScores: {}
      };
    }
  }

  function saveProgress() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
    } catch { /* Progress remains playable in this session when storage is unavailable. */ }
  }

  function cloneLevel(level) {
    return {
      id: level.id,
      name: level.name,
      shortName: level.shortName,
      chapter: level.chapter,
      mapName: level.mapName,
      theme: level.theme,
      requiredRooms: level.requiredRooms,
      playerPower: level.playerPower,
      playerStart: level.playerStart,
      winRoom: level.winRoom,
      tip: level.tip,
      rooms: level.rooms.map((room) => ({
        ...room,
        baseType: room.type,
        cleared: false
      })),
      links: level.links.map((pair) => [pair[0], pair[1]])
    };
  }

  function buildLevelMeta(level) {
    const roomMap = new Map();
    const adjacency = new Map();
    const mutableBits = new Map();
    const roomBits = new Map();
    let bitIndex = 0;

    for (const room of level.rooms) {
      roomMap.set(room.id, room);
      adjacency.set(room.id, []);
      roomBits.set(room.id, bitIndex);
      bitIndex += 1;

      if (room.baseType !== "start" && room.baseType !== "empty") {
        mutableBits.set(room.id, roomBits.get(room.id));
      }
    }

    for (const [left, right] of level.links) {
      adjacency.get(left).push(right);
      adjacency.get(right).push(left);
    }

    return {
      level,
      roomMap,
      adjacency,
      mutableBits,
      roomBits
    };
  }

  function setBaseMessage(text, type = "info") {
    state.baseMessage = text;
    state.baseMessageType = type;
    refreshMessageView(performance.now());
  }

  function showMessage(text, type = "info", duration = 1800) {
    state.transientMessage = text;
    state.transientType = type;
    state.transientUntil = performance.now() + duration;
    refreshMessageView(performance.now());
  }

  function refreshMessageView(now) {
    const usingTransient = state.transientUntil > now;
    ui.statusMessage.textContent = usingTransient ? state.transientMessage : state.baseMessage;
    ui.statusMessage.style.color = MESSAGE_COLORS[usingTransient ? state.transientType : state.baseMessageType] || MESSAGE_COLORS.info;
  }

  function getBestTimeForLevel(levelId) {
    return Number(state.progress.bestTimes[levelId]) || 0;
  }

  function getBestScoreForLevel(levelId) {
    return Number(state.progress.bestScores[levelId]) || 0;
  }

  function formatBestRecord(levelId) {
    const bestTime = getBestTimeForLevel(levelId);
    const bestScore = getBestScoreForLevel(levelId);

    if (!bestTime && !bestScore) {
      return "未通关";
    }

    const parts = [];
    if (bestTime) {
      parts.push(formatTime(bestTime));
    }
    if (bestScore) {
      parts.push(`${bestScore} 分`);
    }

    return parts.join(" / ");
  }

  function updateHUD() {
    const levelId = String(state.level.id);
    const unlockedCount = state.progress.unlocked + 1;
    const canGoNext = state.levelIndex < Math.min(state.progress.unlocked, LEVELS.length - 1);

    ui.levelName.textContent = state.level.name;
    ui.chapterName.textContent = state.level.chapter;
    const targets = state.level.requiredRooms;
    const completed = targets.filter(id => hasVisitedRoom(id)).length;
    document.getElementById("map-mission").textContent = targets.length ? `本关目标：先完成 ★ 房间（${completed}/${targets.length}），再挑战 Boss。` : "本关目标：沿连线规划路线，积累战力击败 Boss。";
    ui.levelPicker.value = String(state.levelIndex);
    for (const option of ui.levelPicker.options) option.disabled = Number(option.value) > state.progress.unlocked;
    ui.levelIndexLabel.textContent = `第 ${state.levelIndex + 1} / ${LEVELS.length} 关`;
    ui.powerValue.textContent = String(state.player.power);
    ui.keyValue.textContent = String(state.player.keys);
    ui.scoreValue.textContent = String(calculateScore());
    ui.timeValue.textContent = formatTime(getElapsedMs());
    ui.bestValue.textContent = formatBestRecord(levelId);
    ui.unlockValue.textContent = `已解锁 ${unlockedCount} / ${LEVELS.length} 关`;

    ui.prevLevel.disabled = state.levelIndex === 0;
    ui.nextLevel.disabled = !canGoNext;
    document.getElementById("progress-fill").style.width = `${unlockedCount / LEVELS.length * 100}%`;
    for (const { source, value } of mobileValues) value.textContent = source.textContent;
  }

  function calculateScore() {
    return state.player.power * 10 + state.player.keys * 20 + state.clearedRooms * 12 + (state.isLevelWon ? 100 : 0);
  }

  function resizeCanvas() {
    if (!state.level) return;
    const xs = state.level.rooms.map(room => room.x);
    const ys = state.level.rooms.map(room => room.y);
    const worldWidth = (Math.max(...xs) - Math.min(...xs)) * 104 + 120;
    const worldHeight = (Math.max(...ys) - Math.min(...ys)) * 104 + 120;
    const viewWidth = mapFrame.clientWidth - 2;
    const viewHeight = Math.min(window.innerHeight * 0.6, 560);
    const scale = state.overview ? Math.min(viewWidth / worldWidth, viewHeight / worldHeight, 1) : 1;
    state.layout.mapScale = scale;
    canvas.style.width = `${Math.max(viewWidth, worldWidth * scale)}px`;
    canvas.style.height = `${Math.max(260, worldHeight * scale)}px`;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    state.canvasWidth = rect.width;
    state.canvasHeight = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    zoomButton.textContent = state.overview ? "放大地图" : "查看全图";
    zoomButton.setAttribute("aria-pressed", String(!state.overview));
    refreshLayout();
  }

  function locatePlayer() {
    const center = state.layout.centers.get(state.player.roomId);
    if (center) mapFrame.scrollTo({ left: center.x - mapFrame.clientWidth / 2, top: center.y - mapFrame.clientHeight / 2, behavior: "instant" });
  }

  function refreshLayout() {
    if (!state.level) {
      return;
    }

    const rooms = state.level.rooms;
    const xs = rooms.map((room) => room.x);
    const ys = rooms.map((room) => room.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rawSpanX = maxX - minX;
    const rawSpanY = maxY - minY;
    const pitch = 104 * state.layout.mapScale;
    const paddingX = (state.canvasWidth - rawSpanX * pitch) / 2;
    const paddingTop = (state.canvasHeight - rawSpanY * pitch) / 2;
    const stepX = pitch;
    const stepY = pitch;
    const roomWidth = 78 * state.layout.mapScale;
    const roomHeight = 88 * state.layout.mapScale;

    state.layout.roomWidth = roomWidth;
    state.layout.roomHeight = roomHeight;
    state.layout.roomRects = new Map();
    state.layout.centers = new Map();
    state.layout.width = state.canvasWidth;
    state.layout.height = state.canvasHeight;

    for (const room of rooms) {
      const centerX = rawSpanX === 0 ? state.canvasWidth / 2 : paddingX + (room.x - minX) * stepX;
      const centerY = rawSpanY === 0 ? state.canvasHeight / 2 : paddingTop + (room.y - minY) * stepY;
      const rect = {
        x: centerX - roomWidth / 2,
        y: centerY - roomHeight / 2,
        width: roomWidth,
        height: roomHeight
      };

      state.layout.centers.set(room.id, { x: centerX, y: centerY });
      state.layout.roomRects.set(room.id, rect);
    }
  }

  function loadLevel(index) {
    state.levelIndex = clamp(index, 0, LEVELS.length - 1);
    state.level = cloneLevel(LEVELS[state.levelIndex]);
    state.levelMeta = buildLevelMeta(state.level);
    document.getElementById("map-name").textContent = `${state.level.mapName} · 沿连线探索`;
    document.querySelector(".game-shell").style.setProperty("--map-hue", state.level.theme.hue);
    state.roomMap = state.levelMeta.roomMap;
    state.adjacency = state.levelMeta.adjacency;
    state.player.roomId = state.level.playerStart;
    state.player.power = state.level.playerPower;
    state.player.keys = 0;
    state.clearedRooms = 0;
    state.visitedRoomIds = new Set([state.player.roomId]);
    state.visitedMask = getRoomMaskBit(state.player.roomId);
    state.hoverRoomId = null;
    state.invalidRoomId = null;
    state.invalidUntil = 0;
    state.hintRoomId = null;
    state.hintUntil = 0;
    state.effects = [];
    state.moveAnimation = null;
    state.isLevelWon = false;
    state.isLevelLost = false;
    state.shakeUntil = 0;
    state.levelStartedAt = performance.now();
    state.levelEndedAt = 0;
    hideModal();
    resizeCanvas();
    locatePlayer();
    setBaseMessage(state.level.tip, "info");
    showMessage(`已进入 ${state.level.shortName}。`, "info", 1200);
    updateHUD();
  }

  function getRoomCenter(roomId) {
    return state.layout.centers.get(roomId);
  }

  function getRoomMaskBit(roomId) {
    const bit = state.levelMeta.roomBits.get(roomId);
    return bit === undefined ? 0 : 1 << bit;
  }

  function hasVisitedRoom(roomId) {
    return state.visitedRoomIds.has(roomId);
  }

  function markRoomVisited(roomId) {
    state.visitedRoomIds.add(roomId);
    state.visitedMask |= getRoomMaskBit(roomId);
  }

  function getReachableRoomIds() {
    if (state.moveAnimation || state.isLevelWon || state.isLevelLost) {
      return new Set();
    }

    return new Set((state.adjacency.get(state.player.roomId) || []).filter((roomId) => !hasVisitedRoom(roomId)));
  }

  function getRoomAtPosition(x, y) {
    const rooms = state.level.rooms;

    for (let index = rooms.length - 1; index >= 0; index -= 1) {
      const room = rooms[index];
      const rect = state.layout.roomRects.get(room.id);

      if (
        rect &&
        x >= rect.x - 6 &&
        x <= rect.x + rect.width + 6 &&
        y >= rect.y - 6 &&
        y <= rect.y + rect.height + 6
      ) {
        return room;
      }
    }

    return null;
  }

  function isConnected(leftId, rightId) {
    return (state.adjacency.get(leftId) || []).includes(rightId);
  }

  function markInvalid(roomId, message) {
    state.invalidRoomId = roomId;
    state.invalidUntil = performance.now() + 450;
    showMessage(message, "warn", 1600);
  }

  function pushEffect(roomId, type) {
    state.effects.push({
      roomId,
      type,
      startedAt: performance.now(),
      duration: 460
    });
  }

  function getEffectForRoom(roomId, now) {
    for (const effect of state.effects) {
      if (effect.roomId === roomId && effect.startedAt + effect.duration > now) {
        return effect;
      }
    }

    return null;
  }

  function markRoomCleared(room) {
    if (!room.cleared && room.baseType !== "empty" && room.baseType !== "start") {
      room.cleared = true;
      state.clearedRooms += 1;
    }

    room.type = "empty";
  }

  function movePlayerToRoom(room) {
    state.hoverRoomId = room.id;
    state.moveAnimation = {
      fromId: state.player.roomId,
      toId: room.id,
      startedAt: performance.now(),
      duration: 280
    };
  }

  function handleCanvasPointerDown(event) {
    if (state.moveAnimation || !ui.resultModal.classList.contains("hidden")) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = state.canvasWidth / rect.width;
    const scaleY = state.canvasHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const room = getRoomAtPosition(x, y);

    if (!room) {
      return;
    }

    if (room.id === state.player.roomId) {
      showMessage("你已经站在这里了。", "info", 1200);
      return;
    }

    if (hasVisitedRoom(room.id)) {
      markInvalid(room.id, "走过的格子不能回头，必须继续往前推。");
      return;
    }

    if (!isConnected(state.player.roomId, room.id)) {
      markInvalid(room.id, "道路不通。只能去相邻且连通的房间。");
      return;
    }

    if (room.type === "lock" && state.player.keys < (room.value || 1)) {
      markInvalid(room.id, "需要钥匙。先去找一把绿色钥匙。");
      return;
    }

    if (room.id === state.level.winRoom && state.level.requiredRooms.some(id => !hasVisitedRoom(id))) {
      markInvalid(room.id, "目标未完成：先经过所有 ★ 标记房间，再挑战 Boss。");
      return;
    }
    movePlayerToRoom(room);
  }

  function handleCanvasPointerMove(event) {
    if (state.moveAnimation || !ui.resultModal.classList.contains("hidden")) {
      canvas.style.cursor = "default";
      state.hoverRoomId = null;
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = state.canvasWidth / rect.width;
    const scaleY = state.canvasHeight / rect.height;
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;
    const room = getRoomAtPosition(x, y);
    const reachable = getReachableRoomIds();

    state.hoverRoomId = room ? room.id : null;

    if (event.pointerType === "mouse") {
      if (!room) {
        canvas.style.cursor = "default";
      } else if (reachable.has(room.id)) {
        canvas.style.cursor = "pointer";
      } else {
        canvas.style.cursor = "not-allowed";
      }
    }
  }

  function updateMoveAnimation(now) {
    if (!state.moveAnimation) {
      return;
    }

    const progress = (now - state.moveAnimation.startedAt) / state.moveAnimation.duration;
    if (progress < 1) {
      return;
    }

    state.player.roomId = state.moveAnimation.toId;
    markRoomVisited(state.player.roomId);
    state.moveAnimation = null;
    triggerRoomEvent(state.roomMap.get(state.player.roomId));
    updateHUD();
  }

  function fightEnemy(room) {
    if (state.player.power > room.value) {
      state.player.power += room.value;
      markRoomCleared(room);
      pushEffect(room.id, "enemy");
      showMessage(`击败守卫，吸收 ${room.value} 战力。当前战力 ${state.player.power}。`, "good", 1800);
      return;
    }

    pushEffect(room.id, "danger");
    gameOver("挑战失败，你的战力不足，重新规划路线。");
  }

  function fightBoss(room) {
    if (state.player.power > room.value) {
      state.player.power += room.value;
      markRoomCleared(room);
      pushEffect(room.id, "boss");
      winGame();
      return;
    }

    pushEffect(room.id, "danger");
    gameOver("挑战失败，你的战力不足，重新规划路线。");
  }

  function collectTreasure(room) {
    state.player.power += room.value;
    markRoomCleared(room);
    pushEffect(room.id, "treasure");
    showMessage(`打开宝箱，战力 +${room.value}。当前战力 ${state.player.power}。`, "good", 1700);
  }

  function collectKey(room) {
    const amount = room.value || 1;
    state.player.keys += amount;
    markRoomCleared(room);
    pushEffect(room.id, "key");
    showMessage(`拿到钥匙 x${amount}。锁门可以开了。`, "good", 1700);
  }

  function openLock(room) {
    const cost = room.value || 1;
    if (state.player.keys >= cost) {
      state.player.keys -= cost;
      markRoomCleared(room);
      pushEffect(room.id, "lock");
      showMessage(`打开锁门，消耗钥匙 x${cost}。`, "info", 1500);
      return;
    }

    gameOver("你闯进锁门前却没有钥匙，这局路线已经断了。");
  }

  function triggerTrap(room) {
    state.player.power -= room.value;
    markRoomCleared(room);
    pushEffect(room.id, "trap");

    if (state.player.power <= 0) {
      gameOver("你踩中了高伤陷阱，战力见底了。");
      return;
    }

    showMessage(`踩中陷阱，战力 -${room.value}。当前战力 ${state.player.power}。`, "warn", 1700);
  }

  function triggerRoomEvent(room) {
    if (!room || state.isLevelWon || state.isLevelLost) {
      return;
    }

    switch (room.type) {
      case "enemy":
        fightEnemy(room);
        break;
      case "boss":
        fightBoss(room);
        break;
      case "treasure":
        collectTreasure(room);
        break;
      case "key":
        collectKey(room);
        break;
      case "lock":
        openLock(room);
        break;
      case "trap":
        triggerTrap(room);
        break;
      default:
        if (room.id === state.level.winRoom) {
          winGame();
        } else {
          showMessage("继续向上，找一条更赚的路线。", "info", 1200);
        }
        break;
    }
  }

  function gameOver(message) {
    state.isLevelLost = true;
    state.levelEndedAt = performance.now();
    state.shakeUntil = state.levelEndedAt + 460;
    setBaseMessage(message, "danger");
    updateHUD();
    showModal({
      title: "挑战失败",
      text: message,
      primaryText: state.levelIndex < state.progress.unlocked ? "换一关" : "重新挑战",
      secondaryText: "再来一次",
      primaryAction: () => {
        if (state.levelIndex < state.progress.unlocked) {
          nextLevel();
        } else {
          restartLevel();
        }
      },
      secondaryAction: () => {
        restartLevel();
      }
    });
  }

  function winGame() {
    state.isLevelWon = true;
    state.levelEndedAt = performance.now();
    const elapsed = getElapsedMs();
    const score = calculateScore();
    const levelId = String(state.level.id);
    const previousBestTime = getBestTimeForLevel(levelId);
    const previousBestScore = getBestScoreForLevel(levelId);
    let hasRecordUpdate = false;

    if (!previousBestTime || elapsed < previousBestTime) {
      state.progress.bestTimes[levelId] = Math.round(elapsed);
      hasRecordUpdate = true;
    }

    if (!previousBestScore || score > previousBestScore) {
      state.progress.bestScores[levelId] = score;
      hasRecordUpdate = true;
    }

    if (state.levelIndex < LEVELS.length - 1) {
      state.progress.unlocked = Math.max(state.progress.unlocked, state.levelIndex + 1);
    }

    saveProgress();
    updateHUD();

    const allCleared = state.levelIndex === LEVELS.length - 1;
    const bestText = formatBestRecord(levelId);

    setBaseMessage(
      allCleared
        ? `全部通关。最终用时 ${formatTime(elapsed)}，可以继续回主页炫耀了。`
        : `通关成功。用时 ${formatTime(elapsed)}，准备冲下一关。`,
      "good"
    );

    showModal({
      title: allCleared ? "全部通关" : "通关成功",
      text: hasRecordUpdate
        ? `这次发挥不错，记录已经刷新。${allCleared ? "六个阶段全部完成。" : "现在可以继续挑战更高一层。"}`
        : `${allCleared ? "六个阶段全部完成。" : "这关已经拿下，继续往上爬。"} `,
      primaryText: allCleared ? "返回摸鱼指挥部" : "下一关",
      secondaryText: "重玩本关",
      primaryAction: () => {
        if (allCleared) {
          window.location.href = "../../index.html";
        } else {
          nextLevel();
        }
      },
      secondaryAction: () => {
        restartLevel();
      }
    });

    ui.modalTime.textContent = formatTime(elapsed);
    ui.modalScore.textContent = `${score} 分`;
    ui.modalBest.textContent = bestText;
  }

  function showModal(options) {
    modalReturnFocus = document.activeElement;
    ui.resultModal.classList.remove("hidden");
    ui.modalTitle.textContent = options.title;
    ui.modalText.textContent = options.text;
    ui.modalPrimary.textContent = options.primaryText;
    ui.modalSecondary.textContent = options.secondaryText;
    ui.modalTime.textContent = formatTime(getElapsedMs());
    ui.modalScore.textContent = `${calculateScore()} 分`;
    ui.modalBest.textContent = formatBestRecord(String(state.level.id));
    state.modalActions.primary = options.primaryAction || null;
    state.modalActions.secondary = options.secondaryAction || null;
    ui.modalPrimary.focus();
  }

  function hideModal() {
    const wasOpen = !ui.resultModal.classList.contains("hidden");
    ui.resultModal.classList.add("hidden");
    if (wasOpen && modalReturnFocus) modalReturnFocus.focus();
    state.modalActions.primary = null;
    state.modalActions.secondary = null;
  }

  function restartLevel() {
    loadLevel(state.levelIndex);
  }

  function prevLevel() {
    if (state.levelIndex > 0) {
      loadLevel(state.levelIndex - 1);
    }
  }

  function nextLevel() {
    const maxReachableIndex = Math.min(state.progress.unlocked, LEVELS.length - 1);
    if (state.levelIndex < maxReachableIndex) {
      loadLevel(state.levelIndex + 1);
      return;
    }

    showMessage("下一关还没解锁，先把当前能打的都拿下。", "warn", 1800);
  }

  function getCurrentSolverMask() {
    let mask = 0;

    for (const room of state.level.rooms) {
      const bit = state.levelMeta.mutableBits.get(room.id);
      if (bit === undefined) {
        continue;
      }

      if (room.type !== room.baseType) {
        mask |= 1 << bit;
      }
    }

    return mask;
  }

  function getRoomTypeInSolver(roomId, mask, meta) {
    const room = meta.roomMap.get(roomId);
    const bit = meta.mutableBits.get(roomId);

    if (bit !== undefined && (mask & (1 << bit)) !== 0) {
      return "empty";
    }

    return room.baseType || room.type;
  }

  function simulateSolverMove(node, targetRoomId, meta) {
    const room = meta.roomMap.get(targetRoomId);
    if (targetRoomId === meta.level.winRoom && meta.level.requiredRooms.some(id => (node.visitedMask & (1 << meta.roomBits.get(id))) === 0)) return null;
    const type = getRoomTypeInSolver(targetRoomId, node.mask, meta);
    const roomMaskBit = meta.roomBits.get(targetRoomId);
    const next = {
      roomId: targetRoomId,
      power: node.power,
      keys: node.keys,
      mask: node.mask,
      visitedMask: node.visitedMask,
      won: false
    };
    const bit = meta.mutableBits.get(targetRoomId);

    if (!room) {
      return null;
    }

    if (roomMaskBit !== undefined && (next.visitedMask & (1 << roomMaskBit)) !== 0) {
      return null;
    }

    if (roomMaskBit !== undefined) {
      next.visitedMask |= 1 << roomMaskBit;
    }

    switch (type) {
      case "enemy":
      case "boss":
        if (next.power <= room.value) {
          return null;
        }
        next.power += room.value;
        if (bit !== undefined) {
          next.mask |= 1 << bit;
        }
        if (type === "boss" && targetRoomId === meta.level.winRoom) {
          next.won = true;
        }
        break;
      case "treasure":
        next.power += room.value;
        if (bit !== undefined) {
          next.mask |= 1 << bit;
        }
        break;
      case "key":
        next.keys += room.value || 1;
        if (bit !== undefined) {
          next.mask |= 1 << bit;
        }
        break;
      case "lock":
        if (next.keys < (room.value || 1)) {
          return null;
        }
        next.keys -= room.value || 1;
        if (bit !== undefined) {
          next.mask |= 1 << bit;
        }
        break;
      case "trap":
        next.power -= room.value;
        if (next.power <= 0) {
          return null;
        }
        if (bit !== undefined) {
          next.mask |= 1 << bit;
        }
        break;
      default:
        if (targetRoomId === meta.level.winRoom) {
          next.won = true;
        }
        break;
    }

    return next;
  }

  function makeSolverSignature(node) {
    return `${node.roomId}|${node.power}|${node.keys}|${node.mask}|${node.visitedMask}`;
  }

  function findWinningPath(meta, startNode) {
    const queue = [{ ...startNode, path: [startNode.roomId] }];
    const visited = new Set([makeSolverSignature(startNode)]);

    while (queue.length) {
      const current = queue.shift();
      const neighbors = meta.adjacency.get(current.roomId) || [];

      for (const nextRoomId of neighbors) {
        const nextNode = simulateSolverMove(current, nextRoomId, meta);

        if (!nextNode) {
          continue;
        }

        const nextPath = current.path.concat(nextRoomId);
        if (nextNode.won) {
          return nextPath;
        }

        const signature = makeSolverSignature(nextNode);
        if (visited.has(signature)) {
          continue;
        }

        visited.add(signature);
        queue.push({
          ...nextNode,
          path: nextPath
        });
      }
    }

    return null;
  }

  function showHint() {
    if (state.moveAnimation) {
      return;
    }

    const path = findWinningPath(state.levelMeta, {
      roomId: state.player.roomId,
      power: state.player.power,
      keys: state.player.keys,
      mask: getCurrentSolverMask(),
      visitedMask: state.visitedMask
    });

    if (!path || path.length < 2) {
      showMessage("这条线已经被你走死了，建议直接重开本关。", "warn", 2200);
      return;
    }

    const nextRoomId = path[1];
    const nextRoom = state.roomMap.get(nextRoomId);
    const roomLabel = describeRoom(nextRoom);

    state.hintRoomId = nextRoomId;
    state.hintUntil = performance.now() + 2200;
    showMessage(`提示路线：下一步先去 ${roomLabel}。`, "good", 2200);
  }

  function describeRoom(room) {
    if (!room) {
      return "未知房间";
    }

    const type = room.type === "empty" ? room.baseType : room.type;
    switch (type) {
      case "enemy":
        return `守卫房（${room.value}）`;
      case "boss":
        return `Boss 房（${room.value}）`;
      case "treasure":
        return `宝箱房（+${room.value}）`;
      case "key":
        return "钥匙房";
      case "lock":
        return "锁门房";
      case "trap":
        return `陷阱房（-${room.value}）`;
      case "start":
        return "起点";
      default:
        return "空房间";
    }
  }

  function roundedRectPath(context, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    context.beginPath();
    context.moveTo(x + r, y);
    context.lineTo(x + width - r, y);
    context.quadraticCurveTo(x + width, y, x + width, y + r);
    context.lineTo(x + width, y + height - r);
    context.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
    context.lineTo(x + r, y + height);
    context.quadraticCurveTo(x, y + height, x, y + height - r);
    context.lineTo(x, y + r);
    context.quadraticCurveTo(x, y, x + r, y);
    context.closePath();
  }

  function drawBadge(x, y, text, fillStyle, textStyle) {
    ctx.save();
    ctx.font = "bold 14px 'Trebuchet MS', 'PingFang SC', sans-serif";
    const width = Math.max(32, ctx.measureText(text).width + 16);
    const height = 22;
    roundedRectPath(ctx, x - width / 2, y - height / 2, width, height, 11);
    ctx.fillStyle = fillStyle;
    ctx.fill();
    ctx.fillStyle = textStyle;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, x, y + 0.5);
    ctx.restore();
  }

  function drawStickman(x, y, color, value, options = {}) {
    const scale = options.scale || 1;
    const headRadius = 8 * scale;
    const bodyTop = y - 14 * scale;
    const bodyBottom = y + 12 * scale;
    const armY = y - 3 * scale;
    const legY = y + 27 * scale;
    const lineWidth = options.boss ? 4 * scale : 3.2 * scale;

    ctx.save();
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = "round";

    ctx.beginPath();
    ctx.arc(x, y - 23 * scale, headRadius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, bodyTop);
    ctx.lineTo(x, bodyBottom);
    ctx.moveTo(x, armY);
    ctx.lineTo(x - 14 * scale, armY + 8 * scale);
    ctx.moveTo(x, armY);
    ctx.lineTo(x + 14 * scale, armY + 8 * scale);
    ctx.moveTo(x, bodyBottom);
    ctx.lineTo(x - 12 * scale, legY);
    ctx.moveTo(x, bodyBottom);
    ctx.lineTo(x + 12 * scale, legY);
    ctx.stroke();

    if (options.boss) {
      ctx.fillStyle = "#f1b032";
      ctx.beginPath();
      ctx.moveTo(x - 12 * scale, y - 34 * scale);
      ctx.lineTo(x - 6 * scale, y - 46 * scale);
      ctx.lineTo(x, y - 38 * scale);
      ctx.lineTo(x + 6 * scale, y - 46 * scale);
      ctx.lineTo(x + 12 * scale, y - 34 * scale);
      ctx.closePath();
      ctx.fill();
    }

    drawBadge(
      x,
      y + 39 * scale,
      String(value),
      options.player ? "#dce8ff" : options.boss ? "#f7dbdb" : "#ffe5e2",
      options.player ? "#163eae" : options.boss ? "#821c1d" : "#b73830"
    );

    ctx.restore();
  }

  function drawTreasure(x, y, value) {
    ctx.save();
    ctx.fillStyle = "#f6c44b";
    ctx.strokeStyle = "#bc7b17";
    ctx.lineWidth = 3;

    roundedRectPath(ctx, x - 18, y - 8, 36, 24, 6);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x - 18, y - 2);
    ctx.quadraticCurveTo(x, y - 16, x + 18, y - 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x, y - 8);
    ctx.lineTo(x, y + 16);
    ctx.stroke();

    drawBadge(x, y + 28, `+${value}`, "#fff0c9", "#9b5c00");
    ctx.restore();
  }

  function drawKey(x, y, value) {
    ctx.save();
    ctx.strokeStyle = "#2b9f60";
    ctx.fillStyle = "#2b9f60";
    ctx.lineWidth = 4;

    ctx.beginPath();
    ctx.arc(x - 6, y, 9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x + 2, y);
    ctx.lineTo(x + 20, y);
    ctx.lineTo(x + 20, y + 7);
    ctx.moveTo(x + 12, y);
    ctx.lineTo(x + 12, y + 7);
    ctx.stroke();

    drawBadge(x, y + 28, `+${value}`, "#dff7ea", "#187848");
    ctx.restore();
  }

  function drawLock(x, y, cost) {
    ctx.save();
    ctx.fillStyle = "#f0aa2d";
    ctx.strokeStyle = "#a56d14";
    ctx.lineWidth = 3;

    roundedRectPath(ctx, x - 16, y - 2, 32, 24, 8);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y - 8, 10, Math.PI, 0);
    ctx.stroke();

    ctx.fillStyle = "#8a5b11";
    ctx.beginPath();
    ctx.arc(x, y + 8, 3, 0, Math.PI * 2);
    ctx.fill();

    drawBadge(x, y + 32, `钥匙 ${cost}`, "#fff2d6", "#8a5b11");
    ctx.restore();
  }

  function drawTrap(x, y, value) {
    ctx.save();
    ctx.fillStyle = "#7f8b9d";

    for (let index = -2; index <= 2; index += 1) {
      ctx.beginPath();
      ctx.moveTo(x + index * 8 - 3, y + 14);
      ctx.lineTo(x + index * 8 + 1, y - 10);
      ctx.lineTo(x + index * 8 + 6, y + 14);
      ctx.closePath();
      ctx.fill();
    }

    drawBadge(x, y + 28, `-${value}`, "#edf1f5", "#556171");
    ctx.restore();
  }

  function drawStartMarker(x, y) {
    ctx.save();
    ctx.fillStyle = "#dce8ff";
    ctx.strokeStyle = "#2f67ff";
    ctx.lineWidth = 3;

    ctx.beginPath();
    ctx.arc(x, y + 5, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(x + 2, y + 14);
    ctx.lineTo(x + 2, y - 16);
    ctx.lineTo(x + 18, y - 8);
    ctx.lineTo(x + 2, y - 2);
    ctx.stroke();
    ctx.restore();
  }

  function drawRoom(room, now, reachableIds) {
    const rect = state.layout.roomRects.get(room.id);
    const center = state.layout.centers.get(room.id);
    const isCurrent = !state.moveAnimation && state.player.roomId === room.id;
    const isVisited = !isCurrent && hasVisitedRoom(room.id);
    const isReachable = reachableIds.has(room.id);
    const isHovered = state.hoverRoomId === room.id;
    const isInvalid = state.invalidRoomId === room.id && state.invalidUntil > now;
    const isHinted = state.hintRoomId === room.id && state.hintUntil > now;
    const accent = getRoomAccent(room, isVisited);
    ctx.save();
    ctx.translate(center.x, center.y);
    if (isCurrent || isHinted || isReachable || isInvalid) {
      roundedRectPath(ctx, -rect.width / 2 - 4, -rect.height / 2 - 4, rect.width + 8, rect.height + 8, 17);
      ctx.fillStyle = isInvalid ? "#f5dedb" : isHinted ? "#f5e8c6" : isCurrent ? "#e1eafa" : "#e6efdf";
      ctx.fill();
    }
    ctx.shadowColor = "rgba(40, 60, 45, 0.06)";
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    roundedRectPath(ctx, -rect.width / 2, -rect.height / 2, rect.width, rect.height, 13);
    ctx.fillStyle = isVisited ? "#f0f2ed" : "#ffffff";
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.lineWidth = isCurrent || isHinted || isHovered ? 2 : 1.2;
    ctx.strokeStyle = isInvalid ? "#bc6b63" : isHinted ? "#c9a253" : isCurrent ? "#4775d1" : isReachable ? "#86ae77" : "#d7dfd1";
    ctx.stroke();
    roundedRectPath(ctx, -rect.width / 2 + 5, -rect.height / 2 + 5, rect.width - 10, 15, 5);
    ctx.fillStyle = isCurrent ? "#eaf0fc" : room.goal && !isVisited ? "#f7e9ba" : accent;
    ctx.fill();
    ctx.fillStyle = isVisited ? "#899386" : "#52614f";
    ctx.font = "600 10px 'Segoe UI', 'PingFang SC', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(isCurrent ? "你的位置" : isHinted ? "下一步" : `${room.goal && !isVisited ? "★ " : ""}${roomTitle(room)}`, 0, -rect.height / 2 + 13, rect.width - 10);
    ctx.restore();

    const contentScale = Math.min(rect.width / 92, rect.height / 104);
    ctx.save();
    ctx.translate(center.x, center.y + 5);
    ctx.scale(contentScale, contentScale);
    switch (room.type) {
      case "enemy": drawStickman(0, 0, "#c66b61", room.value, { scale: 0.78 }); break;
      case "boss": drawStickman(0, 4, "#a54c49", room.value, { scale: 0.82, boss: true }); break;
      case "treasure": drawTreasure(0, 0, room.value); break;
      case "key": drawKey(0, 0, room.value || 1); break;
      case "lock": drawLock(0, 0, room.value || 1); break;
      case "trap": drawTrap(0, 0, room.value); break;
      case "start": if (!isCurrent) drawStartMarker(0, 0); break;
      default:
        if (!isCurrent) {
          ctx.fillStyle = "#a0aa9a";
          ctx.font = "12px 'Segoe UI', 'PingFang SC', sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(isVisited ? "已走过" : "已清空", 0, 4);
        }
    }
    ctx.restore();
  }

  function roomTitle(room) {
    switch (room.type) {
      case "enemy":
        return "守卫";
      case "boss":
        return "Boss";
      case "treasure":
        return "宝箱";
      case "key":
        return "钥匙";
      case "lock":
        return "锁门";
      case "trap":
        return "陷阱";
      case "start":
        return "起点";
      default:
        return room.baseType !== "empty" && room.baseType !== "start" ? "已走过" : "空房";
    }
  }

  function getRoomAccent(room, isVisited) {
    if (isVisited) {
      return "#dde2ea";
    }

    switch (room.type) {
      case "enemy":
        return "#ffe3e0";
      case "boss":
        return "#f8d4d4";
      case "treasure":
        return "#fff0c8";
      case "key":
        return "#def7e7";
      case "lock":
        return "#ffe8bf";
      case "trap":
        return "#e7ebf0";
      case "start":
        return "#dde7ff";
      default:
        return "#eef2f7";
    }
  }

  function drawLinks() {
    ctx.save();
    ctx.lineCap = "round";
    for (const [leftId, rightId] of state.level.links) {
      const left = getRoomCenter(leftId);
      const right = getRoomCenter(rightId);
      const currentLink = leftId === state.player.roomId || rightId === state.player.roomId;
      const visitedLink = hasVisitedRoom(leftId) && hasVisitedRoom(rightId);
      ctx.beginPath();
      ctx.strokeStyle = visitedLink ? "#e6ebe1" : currentLink ? "#a2baa0" : "#d9e1d2";
      ctx.lineWidth = currentLink ? 3 : 2;
      ctx.moveTo(left.x, left.y);
      ctx.lineTo(right.x, right.y);
      ctx.stroke();
    }
    ctx.restore();
  }

  function drawPlayer(now) {
    let position = getRoomCenter(state.player.roomId);

    if (state.moveAnimation) {
      const from = getRoomCenter(state.moveAnimation.fromId);
      const to = getRoomCenter(state.moveAnimation.toId);
      const t = clamp((now - state.moveAnimation.startedAt) / state.moveAnimation.duration, 0, 1);
      const eased = 1 - (1 - t) * (1 - t);
      position = {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased
      };
    }

    ctx.save();
    ctx.translate(position.x, position.y + 5);
    const scale = Math.min(state.layout.roomWidth / 92, state.layout.roomHeight / 104);
    ctx.scale(scale, scale);
    drawStickman(0, 0, "#4775d1", state.player.power, { scale: 0.78, player: true });
    ctx.restore();
  }

  function drawCanvasScene(now) {
    ctx.clearRect(0, 0, state.canvasWidth, state.canvasHeight);

    const shakeOffset = state.shakeUntil > now ? Math.sin(now / 18) * 5 : 0;
    ctx.save();
    ctx.translate(shakeOffset, 0);

    const { hue, pattern } = state.level.theme;
    ctx.fillStyle = `hsl(${hue} 28% 96%)`;
    ctx.fillRect(0, 0, state.canvasWidth, state.canvasHeight);
    ctx.strokeStyle = `hsl(${hue} 25% 87% / .55)`;
    ctx.fillStyle = `hsl(${hue} 28% 88% / .35)`;
    ctx.lineWidth = 1;
    if (pattern === "rings" || pattern === "diamonds") {
      const cx = state.canvasWidth / 2, cy = state.canvasHeight / 2;
      for (let r = 48; r < Math.max(cx, cy) * 1.5; r += 62) {
        ctx.beginPath();
        if (pattern === "rings") ctx.arc(cx, cy, r, 0, Math.PI * 2);
        else { ctx.moveTo(cx, cy - r); ctx.lineTo(cx + r, cy); ctx.lineTo(cx, cy + r); ctx.lineTo(cx - r, cy); ctx.closePath(); }
        ctx.stroke();
      }
    } else if (pattern === "islands" || pattern === "towers") {
      for (const center of state.layout.centers.values()) {
        if (pattern === "islands") { ctx.beginPath(); ctx.ellipse(center.x, center.y + 16, state.layout.roomWidth * .85, state.layout.roomHeight * .65, 0, 0, Math.PI * 2); ctx.fill(); }
        else { ctx.fillRect(center.x - 8, 0, 16, state.canvasHeight); }
      }
    } else {
      for (let x = 18; x < state.canvasWidth; x += 28) {
        for (let y = 18; y < state.canvasHeight; y += 28) {
          if (pattern === "circuit") { ctx.beginPath(); ctx.moveTo(x - 3, y); ctx.lineTo(x + 3, y); ctx.moveTo(x, y - 3); ctx.lineTo(x, y + 3); ctx.stroke(); }
          else { ctx.beginPath(); ctx.arc(x, y, 1, 0, Math.PI * 2); ctx.fill(); }
        }
      }
    }
    drawLinks();

    const reachableIds = getReachableRoomIds();
    const rooms = state.level.rooms.slice().sort((left, right) => left.y - right.y || left.x - right.x);

    for (const room of rooms) {
      drawRoom(room, now, reachableIds);
    }

    drawPlayer(now);
    ctx.restore();
  }

  function updateEffects(now) {
    state.effects = state.effects.filter((effect) => effect.startedAt + effect.duration > now);

    if (state.transientUntil <= now) {
      refreshMessageView(now);
    }

    if (state.invalidUntil <= now) {
      state.invalidRoomId = null;
    }

    if (state.hintUntil <= now) {
      state.hintRoomId = null;
    }
  }

  function render(now) {
    updateMoveAnimation(now);
    updateEffects(now);
    drawCanvasScene(now);
    updateHUD();
    requestAnimationFrame(render);
  }

  function validateLevels() {
    for (const rawLevel of LEVELS) {
      const level = cloneLevel(rawLevel);
      const meta = buildLevelMeta(level);
      const path = findWinningPath(meta, {
        roomId: level.playerStart,
        power: level.playerPower,
        keys: 0,
        mask: 0,
        visitedMask: 1 << meta.roomBits.get(level.playerStart)
      });

      if (!path) {
        console.warn(`[Stick Tower] Level ${level.id} has no winning path.`);
      }
    }
  }

  ui.levelPicker.addEventListener("change", () => {
    const index = Number(ui.levelPicker.value);
    if (Number.isInteger(index) && index >= 0 && index <= state.progress.unlocked) loadLevel(index);
  });

  ui.prevLevel.addEventListener("click", () => {
    hideModal();
    prevLevel();
  });

  ui.restartLevel.addEventListener("click", () => {
    hideModal();
    restartLevel();
  });

  ui.hintLevel.addEventListener("click", () => {
    hideModal();
    showHint();
  });

  ui.nextLevel.addEventListener("click", () => {
    hideModal();
    nextLevel();
  });

  ui.modalPrimary.addEventListener("click", () => {
    const action = state.modalActions.primary;
    hideModal();
    if (typeof action === "function") {
      action();
    }
  });

  ui.modalSecondary.addEventListener("click", () => {
    const action = state.modalActions.secondary;
    hideModal();
    if (typeof action === "function") {
      action();
    }
  });

  zoomButton.addEventListener("click", () => { state.overview = !state.overview; resizeCanvas(); locatePlayer(); });
  document.getElementById("map-locate").addEventListener("click", locatePlayer);
  canvas.addEventListener("click", handleCanvasPointerDown);
  canvas.addEventListener("pointermove", handleCanvasPointerMove);
  canvas.addEventListener("pointerleave", () => {
    state.hoverRoomId = null;
    canvas.style.cursor = "default";
  });

  ui.resultModal.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const first = ui.modalSecondary;
    const last = ui.modalPrimary;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  });
  window.addEventListener("resize", resizeCanvas, { passive: true });

  validateLevels();
  loadLevel(0);
  requestAnimationFrame(render);
})();
