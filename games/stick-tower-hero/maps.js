// Individually authored coordinates: the campaign no longer imposes floors.
// Room labels reference levels.js; changing a position never changes its reward.
function towerMap(name, hue, pattern, positions) {
  return { name, hue, pattern, positions: Object.fromEntries(positions.split(" ").map(entry => {
    const [label, pair] = entry.split(":");
    return [label, pair.split(",").map(Number)];
  })) };
}
window.STICK_TOWER_MAPS = [
  towerMap("起点之径", 135, "trail", "s:0,2 a:1,2 b:0,1 c:1,1 boss:2,0"),
  towerMap("双塔分流", 205, "towers", "s:1,3 a:0,3 b:2,3 c:0,2 d:2,2 e:0,1 f:2,1 boss:1,0"),
  towerMap("宝箱环廊", 35, "rings", "s:0,2 a:0,1 b:1,3 c:1,0 d:1,1 e:2,3 f:2,1 boss:3,1"),
  towerMap("菱形庭院", 155, "diamonds", "s:2,4 a:0,2 b:2,3 c:4,2 d:1,1 e:2,2 f:3,1 g:1,0 h:3,0 boss:2,0"),
  towerMap("钥匙侧堡", 45, "towers", "s:0,3 a:0,2 b:1,3 c:0,1 d:2,3 e:2,1 boss:3,0"),
  towerMap("天梯采集", 185, "circuit", "s:0,4 a:0,3 b:1,4 c:0,2 d:1,3 e:2,4 f:1,1 g:1,0 boss:2,0"),
  towerMap("双门城墙", 25, "towers", "s:1,4 a:1,3 b:0,3 c:2,3 d:0,2 e:2,2 f:0,1 g:2,1 boss:1,0"),
  towerMap("悬桥交错", 225, "islands", "s:0,4 a:0,3 b:2,4 c:0,2 d:1,3 e:2,3 f:0,1 g:2,2 h:1,1 i:2,1 boss:3,0"),
  towerMap("红沙峡谷", 15, "trail", "s:1,4 a:0,3 b:3,4 c:0,2 d:3,3 e:1,2 f:0,1 g:2,1 boss:1,0"),
  towerMap("折返长廊", 55, "circuit", "s:0,0 a:1,0 b:0,1 c:0,2 d:2,0 e:1,2 f:3,0 g:2,2 h:3,2 boss:3,1"),
  towerMap("沙漏窄桥", 195, "diamonds", "s:1,0 a:0,1 b:2,1 c:1,2 d:1,3 e:0,4 f:2,4 g:1,5 boss:1,6"),
  towerMap("浮岛试炼", 255, "islands", "s:0,4 a:0,3 b:2,4 c:3,4 d:0,2 e:2,3 f:0,1 g:1,2 h:3,2 i:0,0 j:2,1 k:1,0 boss:3,0"),
  towerMap("十字枢纽", 145, "circuit", "s:2,4 a:0,3 b:4,3 c:0,2 d:2,2 e:4,2 f:0,1 g:4,1 h:2,1 i:2,0 boss:3,0"),
  towerMap("宝库支巷", 40, "trail", "s:0,3 a:0,2 b:1,3 c:0,1 d:1,2 vault:2,3 e:1,0 f:2,1 g:2,0 h:3,0 boss:4,0"),
  towerMap("蝶翼迷宫", 285, "diamonds", "s:2,4 a:0,3 b:4,3 c:0,2 d:2,3 e:4,2 f:0,1 g:3,2 h:1,0 i:3,1 j:2,0 boss:3,0"),
  towerMap("蛇形回廊", 95, "trail", "s:0,4 a:1,4 b:0,3 c:2,4 d:2,3 e:3,3 f:4,3 g:2,5 h:3,2 i:3,5 j:2,1 k:3,1 boss:4,0"),
  towerMap("七重门塔", 175, "towers", "s:1,7 a:0,6 b:2,7 c:0,5 d:2,6 e:1,4 f:0,3 g:2,4 h:0,2 i:2,3 j:1,1 k:1,0 boss:2,0"),
  towerMap("锁钥棋盘", 215, "circuit", "s:0,0 a:1,0 b:2,0 c:1,1 d:3,0 e:1,2 f:3,1 g:2,2 h:3,2 i:3,3 j:2,3 boss:1,3"),
  towerMap("东西双城", 325, "towers", "s:2,6 a:0,5 b:4,5 c:0,4 d:4,4 e:0,3 f:4,3 g:0,2 h:4,2 i:0,1 j:4,1 k:1,0 l:3,0 boss:2,0"),
  towerMap("锯齿机关", 65, "trail", "s:0,6 a:1,5 b:0,4 c:2,5 d:1,3 vault:0,3 e:3,4 f:2,2 g:3,2 h:4,3 i:3,1 j:4,1 k:5,2 l:5,0 boss:4,0"),
  towerMap("分流群岛", 235, "islands", "s:2,5 a:0,5 b:2,4 c:4,5 d:0,4 e:3,3 f:0,3 g:3,2 h:0,2 i:2,2 j:4,2 k:0,1 l:3,1 m:1,0 n:4,0 boss:2,0"),
  towerMap("钥匙螺旋", 305, "rings", "s:0,0 a:1,0 b:0,1 c:2,0 d:0,2 e:2,2 f:3,2 g:2,3 h:3,1 i:1,3 j:3,0 k:2,1 l:1,2 m:1,1 boss:0,3"),
  towerMap("王座侧翼", 5, "diamonds", "s:2,7 a:0,6 b:4,6 c:0,5 d:1,5 e:4,5 f:0,4 g:3,4 vault:4,4 h:0,3 i:3,3 j:1,2 k:4,2 l:1,1 m:4,1 n:2,0 o:3,0 boss:2,1"),
  towerMap("终极星阵", 265, "rings", "s:2,6 a:0,5 b:2,5 c:4,5 d:0,4 e:3,4 f:4,4 g:0,3 h:4,3 i:0,2 j:2,3 k:4,2 l:1,1 m:3,1 n:0,0 o:4,0 p:1,0 q:3,0 boss:2,0"),
];
