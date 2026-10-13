import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import { execFileSync } from "node:child_process";

const root = path.resolve(fileURLToPath(new URL("../", import.meta.url)));
const context = { window: {} };
vm.runInNewContext(readFileSync(path.join(root, "assets/js/resources.js"), "utf8"), context);
const { categories, resources } = context.window.MOYU_CATALOG;
const ids = new Set();
const categoryIds = new Set();

function checkPath(value, source = root) {
  assert.equal(typeof value, "string", "路径必须是字符串");
  assert(value && !/^(?:\/|[a-z]+:|\/\/)/i.test(value), `请使用站内相对路径: ${value}`);
  const target = path.resolve(source, value.split(/[?#]/)[0]);
  assert(target === root || target.startsWith(root + path.sep), `路径越出站点目录: ${value}`);
  assert(existsSync(target), `文件不存在: ${value}`);
  if (!path.extname(target)) assert(existsSync(path.join(target, "index.html")), `目录缺少 index.html: ${value}`);
}

for (const category of categories) {
  assert(category.id && !categoryIds.has(category.id), `分类 ID 为空或重复: ${category.id}`);
  categoryIds.add(category.id);
  assert(category.title && category.description, `分类缺少标题或简介: ${category.id}`);
  checkPath(category.path);
}
for (const item of resources) {
  assert(item.id && !ids.has(item.id), `资源 ID 为空或重复: ${item.id}`);
  ids.add(item.id);
  assert(categoryIds.has(item.category), `未知分类: ${item.category}`);
  assert(item.title && item.description, `资源缺少标题或简介: ${item.id}`);
  assert(Array.isArray(item.tags) && item.tags.every(tag => typeof tag === "string"), `标签必须是字符串数组: ${item.id}`);
  assert.equal(typeof item.featured, "boolean", `featured 必须是布尔值: ${item.id}`);
  checkPath(item.path);
}

function walk(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (entry.name.startsWith(".") || ["node_modules", "scripts"].includes(entry.name)) return [];
    const full = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}
const files = walk(root);
for (const file of files) {
  if (file.endsWith(".js")) execFileSync(process.execPath, ["--check", file]);
  if (file.endsWith(".html")) {
    const html = readFileSync(file, "utf8");
    for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
      if (/^(?:#|[a-z]+:|\/\/)/i.test(match[1])) continue;
      checkPath(match[1], path.dirname(file));
    }
  }
}
// Mahjong image references are created dynamically by its script.
const mahjong = readFileSync(path.join(root, "games/mahjong-match.js"), "utf8");
for (const match of mahjong.matchAll(/image:\s*"([^"]+)"/g)) checkPath(match[1], path.join(root, "games"));
console.log(`检查通过：${categories.length} 个分类、${resources.length} 个资源，HTML 链接、动态麻将图片和 JavaScript 语法均有效。`);
