(function () {
  const catalog = window.MOYU_CATALOG;
  const siteRoot = new URL("../../", document.currentScript.src);
  const tones = new Set(["mint", "sunset", "sky"]);
  const recentKey = "moyu-last-resource-v1";

  function updateResume(id) {
    const item = catalog.resources.find((resource) => resource.id === id);
    document.querySelectorAll("[data-resource-resume]").forEach((link) => {
      link.hidden = !item;
      if (item) {
        link.href = new URL(item.path, siteRoot).href;
        link.querySelector("strong").textContent = item.title;
      }
    });
  }

  function remember(item) {
    try { window.localStorage.setItem(recentKey, item.id); } catch { /* Browsing works without storage. */ }
    updateResume(item.id);
  }
  try { updateResume(window.localStorage.getItem(recentKey)); } catch { updateResume(null); }

  function createCard(item) {
    const link = document.createElement("a");
    link.className = `portal-card ${tones.has(item.tone) ? item.tone : "sky"}`;
    link.href = new URL(item.path, siteRoot).href;
    link.addEventListener("click", () => remember(item));
    const art = document.createElement("div");
    art.className = "card-art";
    art.setAttribute("aria-hidden", "true");
    const category = document.createElement("span");
    category.className = "card-category";
    category.textContent = catalog.categories.find((entry) => entry.id === item.category)?.title || "资源";
    const symbol = document.createElement("span");
    symbol.className = "card-symbol";
    symbol.textContent = item.symbol || "✦";
    art.append(category, symbol);
    const body = document.createElement("div");
    body.className = "card-body";
    const title = document.createElement("strong");
    title.className = "card-title";
    title.textContent = item.title;
    const description = document.createElement("p");
    description.className = "card-description";
    description.textContent = item.description;
    const bottom = document.createElement("div");
    bottom.className = "card-bottom";
    const tag = document.createElement("span");
    tag.className = "portal-tag";
    tag.textContent = (item.tags || []).join(" · ");
    const cta = document.createElement("span");
    cta.className = "card-cta";
    cta.textContent = item.category === "games" ? "开始玩 ↗" : "打开看看 ↗";
    bottom.append(tag, cta);
    body.append(title, description, bottom);
    link.append(art, body);
    return link;
  }

  document.querySelectorAll("[data-resource-list]").forEach((container) => {
    const scope = container.dataset.resourceList;
    const input = document.querySelector(`[data-resource-search="${scope}"]`);
    const clear = document.querySelector(`[data-resource-clear="${scope}"]`);
    const count = document.querySelector(`[data-resource-count="${scope}"]`);
    const filters = document.querySelector(`[data-resource-filters="${scope}"]`);
    const random = document.querySelector(`[data-resource-random="${scope}"]`);
    let selectedCategory = "all";
    let visibleResources = [];
    const params = new URLSearchParams(window.location.search);
    if (input) input.value = params.get("q") || "";
    if (scope === "all" && catalog.categories.some((category) => category.id === params.get("category"))) {
      selectedCategory = params.get("category");
    }

    function syncUrl() {
      const url = new URL(window.location.href);
      const query = input ? input.value.trim() : "";
      if (query) url.searchParams.set("q", query); else url.searchParams.delete("q");
      if (scope === "all" && selectedCategory !== "all") url.searchParams.set("category", selectedCategory);
      else url.searchParams.delete("category");
      try { window.history.replaceState(null, "", url); } catch { /* File previews may restrict history changes. */ }
    }

    function reset() {
      if (input) input.value = "";
      selectedCategory = "all";
      render();
      syncUrl();
      if (input) input.focus();
    }

    function render() {
      const query = input ? input.value.trim().toLocaleLowerCase() : "";
      visibleResources = catalog.resources.filter((item) => {
        const inScope = scope === "all" || (scope === "featured" ? item.featured : item.category === scope);
        const inCategory = selectedCategory === "all" || item.category === selectedCategory;
        const text = [item.title, item.description, ...(item.tags || [])].join(" ").toLocaleLowerCase();
        return inScope && inCategory && text.includes(query);
      });
      container.replaceChildren(...visibleResources.map(createCard));
      if (!visibleResources.length) {
        const empty = document.createElement("div");
        empty.className = "catalog-empty";
        const title = document.createElement("h3");
        const text = document.createElement("p");
        const filtered = Boolean(query || (scope === "all" && selectedCategory !== "all"));
        title.textContent = query ? "暂时没找到" : "这里还在准备中";
        text.textContent = query ? "换个关键词，或者看看其他分类。" : "新的作品正在路上，先玩一局小游戏吧。";
        const action = document.createElement(filtered ? "button" : "a");
        action.className = "action secondary";
        if (filtered) {
          action.type = "button";
          action.textContent = "查看全部资源";
          action.addEventListener("click", reset);
        } else {
          action.href = new URL("games/", siteRoot).href;
          action.textContent = "去小游戏仓";
        }
        empty.append(title, text, action);
        container.append(empty);
      }
      if (count) count.textContent = `共 ${visibleResources.length} 个资源`;
      if (clear) clear.hidden = !input.value;
      if (random) random.disabled = !visibleResources.length;
      if (filters) filters.querySelectorAll("button").forEach((button) => {
        button.setAttribute("aria-pressed", String(button.dataset.category === selectedCategory));
      });
    }

    if (filters && scope === "all") {
      const entries = [{ id: "all", title: "全部" }, ...catalog.categories];
      entries.forEach((entry) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = "filter-button";
        button.dataset.category = entry.id;
        const total = catalog.resources.filter((item) => entry.id === "all" || item.category === entry.id).length;
        button.textContent = `${entry.title} ${total}`;
        button.addEventListener("click", () => { selectedCategory = entry.id; render(); syncUrl(); });
        filters.append(button);
      });
    }
    if (input) input.addEventListener("input", () => { render(); syncUrl(); });
    if (clear) clear.addEventListener("click", () => { input.value = ""; render(); syncUrl(); input.focus(); });
    if (random) random.addEventListener("click", () => {
      if (!visibleResources.length) return;
      const item = visibleResources[Math.floor(Math.random() * visibleResources.length)];
      remember(item);
      window.location.assign(new URL(item.path, siteRoot).href);
    });
    render();
  });
})();
