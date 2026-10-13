# MOYU

托管摸鱼静态页面、小游戏和轻量互动作品的 GitHub Pages 网站。

## 架构

纯 HTML / CSS / JavaScript，无依赖安装或打包步骤。

```text
index.html                   首页
assets/
  js/resources.js            全站资源与分类配置（唯一导航数据源）
  js/catalog.js              共享导航渲染、分类筛选和搜索
  js/home.js                 首页日历、状态和段子
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

首页展示全部分类及 `featured: true` 的作品；分类页展示对应 `category` 的全部作品，支持按名称、简介和标签搜索。列表顺序遵循配置中的顺序。所有页面共用同一份作品标题和介绍。

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
  featured: true,                 // 是否展示在首页
  tone: "sky",                   // sky / mint / sunset
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
