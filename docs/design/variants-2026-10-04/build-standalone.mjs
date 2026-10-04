// Inlines CSS, JS, fonts and images of index.dev.html into one self-contained index.html.
// Usage: node generate.mjs && node build-standalone.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const mime = { ".webp": "image/webp", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const dataUri = (rel) => {
  const file = path.resolve(HERE, rel);
  return `data:${mime[path.extname(file)]};base64,${fs.readFileSync(file).toString("base64")}`;
};

let css = fs.readFileSync(path.join(HERE, "variants.css"), "utf8");
let html = fs.readFileSync(path.join(HERE, "index.dev.html"), "utf8");
const js = fs.readFileSync(path.join(HERE, "variants.js"), "utf8");

// Fonts are referenced once each.
css = css.replace(/url\('([^']+\.woff2)'\)/g, (_, rel) => `url('${dataUri(rel)}')`);

// Every image is embedded once. CSS backgrounds use custom properties; <img> tags get their
// src from a script, so a file used many times is not duplicated.
const images = [];
const indexOf = (rel) => {
  const found = images.indexOf(rel);
  return found >= 0 ? found : images.push(rel) - 1;
};
const cssUsed = new Set();
css = css.replace(/url\('([^']+\.(?:webp|png|jpg))'\)/g, (_, rel) => {
  const i = indexOf(rel);
  cssUsed.add(i);
  return `var(--i${i})`;
});
const htmlUsed = new Set();
html = html.replace(/<img([^>]*?)\ssrc="([^"]+\.(?:webp|png|jpg))"/g, (_, attrs, rel) => {
  const i = indexOf(rel);
  htmlUsed.add(i);
  return `<img${attrs} data-i="${i}"`;
});

const vars = [...cssUsed].map((i) => `--i${i}:url(${dataUri(images[i])})`).join(";");
const map = JSON.stringify(images.map((rel, i) => (htmlUsed.has(i) ? dataUri(rel) : "")));
const loader = `const IMGS=${map};document.querySelectorAll("img[data-i]").forEach(function(e){e.src=IMGS[e.dataset.i]});`;

html = html
  .replace('<link rel="stylesheet" href="variants.css">', () => `<style>:root{${vars}}${css}</style>`)
  .replace('<script src="variants.js"></script>', () => `<script>${loader}${js}</script>`);

fs.writeFileSync(path.join(HERE, "index.html"), html);
console.log("standalone bytes:", html.length, "images:", images.length);
