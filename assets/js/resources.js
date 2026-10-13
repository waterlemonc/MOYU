// Paths are relative to the website root, without a leading slash.
window.MOYU_CATALOG = {
  categories: [
    { id: "pages", title: "页面陈列室", description: "专题页、整活页和轻量作品。", path: "pages/", tone: "sunset" },
    { id: "games", title: "快乐试验田", description: "小游戏、交互实验和工位上的快乐。", path: "games/", tone: "mint" },
  ],
  resources: [
    {
      id: "stick-tower-hero",
      category: "games",
      title: "火柴人爬塔英雄",
      description: "24 关爬塔，选路线、吞数值、拿钥匙、躲陷阱，挑战塔顶 Boss。",
      path: "games/stick-tower-hero/",
      tags: ["益智", "闯关"],
      featured: true,
      tone: "mint",
    },
    {
      id: "mahjong-match",
      category: "games",
      title: "麻将消消乐",
      description: "选择未被覆盖的麻将牌放入托盘，集齐三张相同牌消除，搭配道具挑战关卡。",
      path: "games/mahjong-match.html",
      tags: ["消除", "益智"],
      featured: true,
      tone: "sunset",
    },
    {
      id: "sand-paint",
      category: "games",
      title: "彩砂流动画板",
      description: "点击或拖动喷出彩色粒子，看落沙逐渐堆成沙丘，轻松发呆和解压。",
      path: "games/sand-paint.html",
      tags: ["解压", "互动"],
      featured: true,
      tone: "sky",
    },
  ],
};
