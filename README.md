# MOYU

托管摸鱼静态页面、小游戏和轻量互动作品的 GitHub Pages 网站。

## 架构

纯 HTML / CSS / JavaScript，无依赖安装或打包步骤。

```text
index.html                   首页
assets/
  js/resources.js            全站资源与分类配置（唯一导航数据源）
  js/catalog.js              共享导航渲染、分类筛选和搜索
  js/home.js                 首页日期、折叠日历和段子
  css/home.css               首页与导航页的公共视觉样式
  css/catalog.css            分类目录样式
  images/                    全站共享图片
pages/index.html             静态页目录
games/index.html            游戏目录
games/<name>.html/.css/.js   现有单页游戏，保留原访问地址
games/stick-tower-hero/      独立游戏及关卡数据
games/assets/               游戏资源与许可说明
scripts/check-site.mjs       配置、路径和语法检查
.github/workflows/pages.yml  检查与自动部署
```

首页直接展示全部作品，提供分类切换、关键词搜索和随机打开；分类页展示对应 `category` 的作品。搜索与首页分类记录在 URL 中，便于刷新或返回后继续浏览。最近打开的作品 ID 保存在独立的本地存储键中，首页提供继续打开入口；禁用存储时仍可正常浏览。列表顺序遵循配置顺序，标题和简介共用同一份数据。

## 新增作品

1. 新游戏建议放在 `games/<id>/`，静态作品放在 `pages/<id>/`。
2. 在作品目录创建 `index.html`、`style.css`、`main.js`，私有图片放在该目录的 `assets/`。简单作品也可使用单文件 HTML。
3. 在 `assets/js/resources.js` 的 `resources` 数组添加一条记录：

```js
{
  id: "relax-clock",             // 唯一、稳定的资源 ID
  category: "pages",             // 对应 categories 中的 ID
  title: "放空时钟",
  description: "静静看时间流动，给大脑留一点空白。",
  path: "pages/relax-clock/",     // 从网站根目录算起，不以 / 开头
  tags: ["解压", "工具"],
  featured: true,                 // 预留给推荐列表；首页展示全部资源
  tone: "sky",                   // sky / mint / sunset
  symbol: "◷",                   // 可选，卡片装饰符号
}
```

4. 在作品中添加返回目录链接，例如 `../../pages/` 或 `../../games/`。
5. 运行 `node scripts/check-site.mjs` 并预览。首页和对应分类页自动出现新作品，无需重复添加链接。

资源路径采用站内相对路径，渲染器根据自身脚本位置计算站点根目录，兼容 GitHub Pages 的 `/MOYU/` 子路径。暂不支持把外部网址作为资源路径。

## 新增分类

在 `categories` 中注册 `id`、`title`、`description`、`path` 和 `tone`，创建对应目录的 `index.html`。参考 `pages/index.html`，将 `data-resource-list`、`data-resource-search`、`data-resource-count` 的值改为新分类 ID。然后为作品设置该分类。

## 本地预览与检查

需要 Python 3（预览）和 Node.js 22+（检查），无需 npm install。

```sh
python3 -m http.server 8000
node scripts/check-site.mjs
```

访问 `http://localhost:8000/`。导航列表需要启用 JavaScript。

游戏各自管理运行状态；需要存档时使用独立的 `localStorage` 键，并保留版本号，避免作品互相覆盖。现有游戏的存档键和游戏地址保持不变。

## 发布

GitHub 仓库 Settings → Pages → Build and deployment 选择 GitHub Actions。

推送到 `main` 后，Actions 先检查资源配置、HTML 本地链接、麻将动态图片路径及 JS 语法，通过后直接部署仓库静态文件。也可以手动触发工作流。检查不替代浏览器中的视觉及玩法验证。

线上地址：https://waterlemonc.github.io/MOYU/

## 火柴人爬塔关卡扩展

`games/stick-tower-hero/levels.js` 中的 `campaign` 是从底层到顶层的手工关卡定义。每间房通过 `R(label, x, item, from)` 指定唯一标签、横坐标、道具和连接来源（多个标签用空格分隔）。连接可跨层或横向；游戏允许沿连接移动，但禁止再次进入已走过的房间。`finish` 指定哪些房间连接 Boss。

24 关分为六个阶段，每关独立配置楼层、连线与道具。`K(2)` 提供两把钥匙，`L(2)` 消耗两把钥匙；后期组合机关、岔路和有明确出口的侧路。房间总数必须少于 31，以兼容游戏求解器的位掩码。

修改后运行 `node scripts/check-tower-levels.mjs`：检查房间与连线、布局重复、可通关性，以及双钥匙门是否存在可用的获胜路线。发布流程同时执行此检查。浏览器仍需验证绘制与实际点击。

新版关卡使用 `moyu-stick-tower-progress-v2` 保存进度。首次读取旧存档时保留已解锁关卡，旧地图的最佳时间与分数不迁入新地图。

每关的空间坐标与视觉主题在 `games/stick-tower-hero/maps.js` 独立定义，使用关卡中的房间标签定位。地图可横向、环形或双塔展开；胜负依赖实际连线，不依赖上下方向。默认全图视图，放大后可以滚动地图并定位角色。修改空间坐标后也需运行关卡检查，保证位置唯一、道具布局不重复及路线可通关。

部分地图要求先经过 ★ 必达房间，才能进入 Boss 房。运行时和提示求解器使用同一必达条件；地图改版使用 v3 存档，继承 v2/v1 的解锁进度并重新记录成绩。
