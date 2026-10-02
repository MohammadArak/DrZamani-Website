import {readFile,stat} from "node:fs/promises";
const css=await readFile("src/assets/styles/fonts.css","utf8");
const urls=[...css.matchAll(/url\(["']?(\/fonts\/[^\s"')]+)["']?\)/g)].map(match=>match[1]);
if(urls.length!==8||urls.some(url=>!url.startsWith("/fonts/optimized/")||!url.endsWith(".woff2")))throw new Error("Font CSS must retain the eight optimized WOFF2 faces");
let bytes=0;
for(const url of urls){const info=await stat("public"+url);if(!info.isFile()||!info.size)throw new Error("Missing font: "+url);bytes+=info.size;}
console.log(`Verified ${urls.length} existing optimized WOFF2 faces (${bytes} bytes); original font license is retained.`);
