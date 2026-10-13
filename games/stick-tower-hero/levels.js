// Each floor is authored separately, bottom to top. Connections are explicit;
// neighbors are bidirectional, but a visited room can never be entered again.
const E = value => ({ type: "enemy", value });
const T = value => ({ type: "treasure", value });
const K = (value = 1) => ({ type: "key", value });
const L = (value = 1) => ({ type: "lock", value });
const P = value => ({ type: "trap", value });
const R = (label, x, item, from) => ({ label, x, ...item, from: from.split(" ") });
const CHAPTERS = ["初登高塔", "钥匙之道", "险路求生", "岔路迷城", "机关堡垒", "塔顶试炼"];

function createCampaignLevel(config, index) {
  const floors = [[{ label: "s", x: config.startX ?? 1.5, type: "start", from: [] }], ...config.floors];
  floors.push([R("boss", config.bossX ?? 1.5, { type: "boss", value: config.boss }, config.finish)]);
  const roomSpecs = floors.flatMap((floor, y) => floor.map(item => ({ ...item, y: floors.length - 1 - y })));
  const ids = new Map(roomSpecs.map((item, i) => [item.label, i + 1]));
  return {
    id: index + 1,
    name: `第 ${index + 1} 关 · ${config.name}`,
    shortName: config.name,
    chapter: CHAPTERS[Math.floor(index / 4)],
    playerPower: config.power,
    playerStart: ids.get("s"),
    winRoom: ids.get("boss"),
    tip: config.tip,
    rooms: roomSpecs.map(({ label, x, y, type, value }) => ({ id: ids.get(label), x, y, type, ...(value === undefined ? {} : { value }) })),
    links: roomSpecs.flatMap(item => item.from.map(parent => {
      if (!ids.has(parent)) throw new Error(`Level ${index + 1}: unknown room ${parent}`);
      return [ids.get(parent), ids.get(item.label)];
    })),
  };
}

const campaign = [
  // 1–4: small towers introduce growth, branching and routes that cannot be undone.
  { name: "第一步", power: 10, boss: 20, finish: "c", tip: "先吃掉比自己弱的守卫，再拿宝箱。蓝色边框标记你的位置。",
    floors: [[R("a", 1, E(6), "s"), R("b", 2, T(2), "s")], [R("c", 1, T(8), "a b")]] },
  { name: "两条上山路", power: 12, boss: 28, finish: "e f", tip: "左路先战斗，右路先补给。同样的起点，两条路的收益不同。",
    floors: [[R("a", 0, E(8), "s"), R("b", 3, T(6), "s")], [R("c", 0, T(10), "a"), R("d", 3, E(14), "b")], [R("e", 1, E(5), "c"), R("f", 2, P(2), "d")]] },
  { name: "宝箱绕行", power: 14, boss: 34, finish: "f", tip: "中间的捷径收益偏低。边路多走一间宝箱，可能更划算。",
    floors: [[R("a", 0, T(10), "s"), R("b", 2, E(5), "s")], [R("c", 0, E(18), "a"), R("d", 1, T(4), "a b"), R("e", 3, P(6), "b")], [R("f", 1, T(6), "c d e")]] },
  { name: "第一座塔", power: 16, boss: 43, finish: "g h", tip: "宝箱不是唯一的成长方式。打得过的守卫也能帮你积累战力。",
    floors: [[R("a", 0, E(10), "s"), R("b", 1, T(5), "s"), R("c", 3, E(20), "s")], [R("d", 0, P(8), "a"), R("e", 2, E(18), "a b"), R("f", 3, T(12), "b c")], [R("g", 1, T(8), "d e"), R("h", 3, E(9), "f")]] },
  // 5–8: keys move to different floors; treasure and doors compete for your route.
  { name: "门前找钥匙", power: 18, boss: 29, finish: "e", tip: "金色锁门是必经之路。先从左侧拿钥匙，别被右侧宝箱带偏。",
    floors: [[R("a", 0, K(), "s"), R("b", 2, T(12), "s")], [R("c", 0, E(12), "a"), R("d", 2, E(10), "b")], [R("e", 1, L(), "c d")]] },
  { name: "钥匙在高处", power: 20, boss: 40, finish: "g", tip: "这次钥匙不在起点。先长战力，再决定在哪一层切到拿钥匙的路线。",
    floors: [[R("a", 0, E(12), "s"), R("b", 3, T(6), "s")], [R("c", 0, T(8), "a"), R("d", 2, K(), "a b"), R("e", 3, P(7), "b")], [R("f", 2, E(10), "c d e")], [R("g", 1, L(), "f")]] },
  { name: "开哪一扇门", power: 22, boss: 53, finish: "f g", tip: "一把钥匙，两扇门。左门后是补给，右门后是高收益守卫。",
    floors: [[R("a", 1, K(), "s")], [R("b", 0, E(13), "a"), R("c", 3, T(8), "a")], [R("d", 0, L(), "b"), R("e", 3, L(), "c")], [R("f", 0, T(20), "d"), R("g", 3, E(28), "e")]] },
  { name: "藏在岔路的钥匙", power: 24, boss: 63, finish: "i", tip: "左侧拿钥匙，右侧积累战力。中层的横向通道允许你两边都拿，但顺序要对。",
    floors: [[R("a", 0, K(), "s"), R("b", 3, E(16), "s")], [R("c", 0, T(10), "a"), R("d", 1, E(18), "a b"), R("e", 3, K(), "b d")], [R("f", 0, E(24), "c d"), R("g", 2, T(8), "d e")], [R("h", 1, L(), "f g")], [R("i", 1, E(12), "h")]] },
  // 9–12: some traps are worth paying for; not every easy branch can reach the boss.
  { name: "刺后的补给", power: 26, boss: 63, finish: "f g", tip: "左侧陷阱后有大宝箱，右侧是连续战斗。先算每条路线最终剩多少战力。",
    floors: [[R("a", 0, P(8), "s"), R("b", 3, E(20), "s")], [R("c", 0, T(30), "a"), R("d", 3, P(15), "b")], [R("e", 1, E(14), "c d")], [R("f", 0, T(8), "e"), R("g", 2, E(22), "e")]] },
  { name: "看起来很近", power: 28, boss: 77, finish: "f h", tip: "中间通道走得少，却可能不够打 Boss。长路线上的守卫能让你滚起雪球。",
    floors: [[R("a", 0, E(18), "s"), R("b", 2, T(8), "s"), R("c", 3, P(10), "s")], [R("d", 0, E(30), "a"), R("e", 2, P(12), "b c")], [R("f", 1, T(5), "d"), R("g", 3, T(20), "e")], [R("h", 3, E(14), "g")]] },
  { name: "窄桥两端", power: 30, boss: 78, finish: "g", tip: "进入窄桥前先把战力凑够。桥上的陷阱不能绕，前面的准备决定能否继续。",
    floors: [[R("a", 0, E(20), "s"), R("b", 3, T(9), "s")], [R("c", 1, E(32), "a b")], [R("d", 1, P(22), "c")], [R("e", 0, E(25), "d"), R("f", 3, T(12), "d")], [R("g", 1, P(4), "e f")]] },
  { name: "悬台试炼", power: 32, boss: 89, finish: "j k", tip: "钥匙能打开高收益支路，但也有不需要钥匙的路线。别把轻松与安全画等号。",
    floors: [[R("a", 0, K(), "s"), R("b", 1, E(24), "s"), R("c", 3, T(12), "s")], [R("d", 0, L(), "a"), R("e", 2, E(38), "b c")], [R("f", 0, T(45), "d"), R("g", 1, P(15), "e"), R("h", 3, E(22), "e")], [R("i", 0, P(8), "f"), R("j", 2, E(20), "g h")], [R("k", 1, E(26), "i")]] },
  // 13–16: cross-links, side rooms and routes with different lengths.
  { name: "交叉换道", power: 34, boss: 100, finish: "i", tip: "有些连线通往同层侧房。利用换道补齐钥匙和战力，再选择出口。",
    floors: [[R("a", 0, E(24), "s"), R("b", 3, K(), "s")], [R("c", 0, T(12), "a"), R("d", 2, K(), "a b"), R("e", 3, E(20), "b d")], [R("f", 0, E(30), "c d"), R("g", 3, T(22), "e")], [R("h", 1, L(), "f g")], [R("i", 2, E(18), "h")]] },
  { name: "宝库的死胡同", power: 36, boss: 111, finish: "h", tip: "右侧的大宝箱没有第二个出口。走过的房间不能回头，先看连线再拿奖励。",
    floors: [[R("a", 0, E(26), "s"), R("b", 2, T(14), "s")], [R("c", 0, K(), "a"), R("d", 1, E(30), "a b"), R("vault", 3, T(80), "b")], [R("e", 0, T(20), "c"), R("f", 2, K(), "d")], [R("g", 1, L(), "e f")], [R("h", 1, E(22), "g")]] },
  { name: "两把钥匙的距离", power: 38, boss: 108, finish: "j", tip: "塔顶锁门需要两把钥匙。横穿中层可以补拿一把，也可以走双钥匙补给线。",
    floors: [[R("a", 0, K(), "s"), R("b", 3, E(28), "s")], [R("c", 0, E(22), "a"), R("d", 1, K(), "b c"), R("e", 3, K(2), "b")], [R("f", 0, T(30), "c d"), R("g", 2, E(36), "d e")], [R("h", 0, P(8), "f"), R("i", 2, L(2), "g h")], [R("j", 1, E(24), "i")]] },
  { name: "绕路才能到达", power: 40, boss: 137, finish: "k", tip: "中层有一条横向补给链。只往上走会错过关键收益，但绕路后也要留下出口。",
    floors: [[R("a", 0, E(28), "s"), R("b", 3, T(12), "s")], [R("c", 0, K(), "a"), R("d", 1, E(34), "c b"), R("e", 2, T(16), "d"), R("f", 3, P(8), "e b")], [R("g", 0, T(18), "c"), R("h", 2, L(), "e f")], [R("i", 0, E(35), "g"), R("j", 2, E(26), "h")], [R("k", 1, T(10), "i j")]] },
  // 17–20: consecutive gates, scarce keys, compulsory bottlenecks.
  { name: "连开两道门", power: 42, boss: 128, finish: "k", tip: "两道锁门各消耗一把钥匙。开第一道前，确认第二把钥匙还能拿到。",
    floors: [[R("a", 0, K(2), "s"), R("b", 3, E(30), "s")], [R("c", 0, E(32), "a"), R("d", 2, K(), "b")], [R("e", 1, L(), "c d")], [R("f", 0, E(34), "e"), R("g", 3, T(16), "e")], [R("h", 0, T(24), "f"), R("i", 2, K(), "g")], [R("j", 1, L(), "h i")], [R("k", 1, E(28), "j")]] },
  { name: "别提前花钥匙", power: 44, boss: 143, finish: "j", tip: "起步拿到两把钥匙。可选的宝库会花掉一把，而顶层大门需要保留两把。",
    floors: [[R("a", 1, K(2), "s")], [R("b", 0, L(), "a"), R("c", 3, E(32), "a")], [R("d", 0, T(50), "b"), R("e", 3, E(38), "c")], [R("f", 0, T(18), "d"), R("g", 2, P(12), "e")], [R("h", 1, L(2), "f g")], [R("i", 0, E(25), "h"), R("j", 3, T(45), "h i")]] },
  { name: "双门后的人情债", power: 46, boss: 146, finish: "k l", tip: "左右路线都要开门。钥匙数量不同，门后的守卫与陷阱也不同，先规划到终点。",
    floors: [[R("a", 0, K(2), "s"), R("b", 3, K(), "s")], [R("c", 0, E(34), "a"), R("d", 3, E(40), "b")], [R("e", 0, L(2), "c"), R("f", 3, L(), "d")], [R("g", 0, E(45), "e"), R("h", 3, P(18), "f")], [R("i", 0, T(28), "g"), R("j", 3, E(50), "h")], [R("k", 0, P(6), "i"), R("l", 3, T(18), "j")]] },
  { name: "机关总账", power: 48, boss: 155, finish: "l", tip: "两侧汇合到陷阱瓶颈。中途大宝箱是断头路，真正的收益藏在连续守卫后。",
    floors: [[R("a", 0, E(35), "s"), R("b", 3, T(20), "s")], [R("c", 0, K(), "a"), R("d", 2, E(42), "b"), R("vault", 3, T(90), "b")], [R("e", 0, E(45), "c"), R("f", 2, K(), "d")], [R("g", 1, P(22), "e f")], [R("h", 0, E(50), "g"), R("i", 3, T(32), "g")], [R("j", 1, L(), "h i")], [R("k", 0, T(18), "j"), R("l", 2, E(25), "j k")]] },
  // 21–24: uneven towers combine earlier lessons and alternative win routes.
  { name: "分流前哨", power: 50, boss: 172, finish: "m n", tip: "三路起步、两路登顶。收集双钥匙走机关路，或用连续战斗攒出足够战力。",
    floors: [[R("a", 0, K(2), "s"), R("b", 1, E(38), "s"), R("c", 3, T(22), "s")], [R("d", 0, E(35), "a"), R("e", 2, E(48), "b c")], [R("f", 0, L(2), "d"), R("g", 2, P(16), "e")], [R("h", 0, T(72), "f"), R("i", 1, E(40), "g"), R("j", 3, T(24), "g")], [R("k", 0, P(12), "h"), R("l", 2, E(52), "i j")], [R("m", 0, E(30), "k"), R("n", 2, P(10), "l")]] },
  { name: "钥匙接力", power: 54, boss: 179, finish: "m", tip: "三道锁门分两段开。第一把钥匙开前门，第二段钥匙必须留给双锁出口。",
    floors: [[R("a", 0, E(40), "s"), R("b", 3, K(), "s")], [R("c", 0, K(), "a"), R("d", 3, T(32), "b")], [R("e", 1, L(), "c d")], [R("f", 0, K(2), "e"), R("g", 3, T(50), "e")], [R("h", 0, E(45), "f"), R("i", 3, E(30), "g")], [R("j", 1, L(2), "h i")], [R("k", 0, T(22), "j"), R("l", 3, P(14), "j")], [R("m", 1, E(28), "k l")]] },
  { name: "塔顶预演", power: 58, boss: 210, finish: "n o", tip: "高收益路线都有代价。算清陷阱后的剩余战力，分辨能返回主路的侧房和死胡同。",
    floors: [[R("a", 0, E(42), "s"), R("b", 3, K(2), "s")], [R("c", 0, P(18), "a"), R("d", 1, K(), "a"), R("e", 3, E(45), "b")], [R("f", 0, E(55), "c d"), R("g", 2, L(2), "e"), R("vault", 3, T(100), "e")], [R("h", 0, T(30), "f"), R("i", 3, T(70), "g")], [R("j", 0, L(), "h"), R("k", 2, P(20), "i")], [R("l", 0, E(48), "j"), R("m", 2, E(55), "k")], [R("n", 1, P(4), "l"), R("o", 3, E(28), "m")]] },
  { name: "摸鱼之巅", power: 60, boss: 238, finish: "p q", tip: "最后一塔：钥匙、横向换道、双门和陷阱都在场。先找出口，再算完整路线的收益。",
    floors: [[R("a", 0, K(2), "s"), R("b", 1, E(44), "s"), R("c", 3, T(24), "s")], [R("d", 0, E(45), "a"), R("e", 2, K(), "b c"), R("f", 3, E(58), "c e")], [R("g", 0, L(), "d"), R("h", 2, E(62), "e f")], [R("i", 0, T(50), "g"), R("j", 1, K(), "i h"), R("k", 3, P(24), "h")], [R("l", 0, E(70), "i j"), R("m", 2, L(2), "j k")], [R("n", 0, P(18), "l"), R("o", 2, T(65), "m")], [R("p", 1, E(42), "n"), R("q", 3, E(48), "o")]] },
];

window.STICK_TOWER_LEVELS = campaign.map(createCampaignLevel);
