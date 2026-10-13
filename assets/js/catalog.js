(function () {
  const catalog = window.MOYU_CATALOG;
  const siteRoot = new URL("../../", document.currentScript.src);
  const tones = new Set(["mint", "sunset", "sky"]);

  function createCard(item, label) {
    const link = document.createElement("a");
    link.className = `portal-card ${tones.has(item.tone) ? item.tone : "sky"}`;
    link.href = new URL(item.path, siteRoot).href;
    const tag = document.createElement("span");
    tag.className = "portal-tag";
    tag.textContent = label;
    const title = document.createElement("strong");
    title.textContent = item.title;
    const description = document.createElement("p");
    description.textContent = item.description;
    link.append(tag, title, description);
    return link;
  }

  document.querySelectorAll("[data-resource-list]").forEach((container) => {
    const scope = container.dataset.resourceList;
    const input = document.querySelector(`[data-resource-search="${scope}"]`);
    const count = document.querySelector(`[data-resource-count="${scope}"]`);

    function render() {
      const query = input ? input.value.trim().toLocaleLowerCase() : "";
      const resources = catalog.resources.filter((item) => {
        const inScope = scope === "featured" ? item.featured : item.category === scope;
        const text = [item.title, item.description, ...(item.tags || [])].join(" ").toLocaleLowerCase();
        return inScope && text.includes(query);
      });
      container.replaceChildren();
      if (scope === "featured") {
        catalog.categories.forEach((category) => container.append(createCard(category, "资源分类")));
      }
      resources.forEach((item) => container.append(createCard(item, (item.tags || []).join(" · ") || "资源")));
      if (!resources.length && scope !== "featured") {
        const empty = document.createElement("p");
        empty.className = "catalog-empty";
        empty.textContent = query ? "没有找到匹配的资源，试试其他关键词。" : "新作品正在准备中，先去小游戏仓逛逛吧。";
        container.append(empty);
      }
      if (count) count.textContent = `${resources.length} 个资源`;
    }

    if (input) input.addEventListener("input", render);
    render();
  });
})();
