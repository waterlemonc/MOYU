# MOYU

一个用于托管和展示摸鱼静态页面、小游戏的小仓库。

## 目录约定

- `index.html`: 仓库首页，也是 GitHub Pages 默认入口
- `styles.css`: 首页样式
- `pages/`: 放单页静态页面
- `games/`: 放小游戏
- `.github/workflows/pages.yml`: 自动部署到 GitHub Pages

## 使用方式

把新的静态页面或小游戏放进 `pages/` 或 `games/` 目录，然后在 `index.html` 里补一个入口链接即可。

## GitHub Pages

这个仓库已经带了 GitHub Actions 部署配置。将代码推送到 GitHub 仓库后：

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. 在 `Build and deployment` 中选择 `GitHub Actions`

之后每次推送到 `main` 分支都会自动部署。
