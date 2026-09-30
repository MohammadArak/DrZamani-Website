import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const version = (await read("VERSION")).trim();
const frontend = JSON.parse(await read("package.json")).version;
const lock = JSON.parse(await read("package-lock.json"));
const backend = (await read("api/pyproject.toml")).match(/^version = "([^"]+)"/m)?.[1];
if (![frontend, lock.version, lock.packages[""].version, backend].every((value) => value === version)) {
    throw new Error("Release versions differ from VERSION");
}
console.log(`Release versions verified: ${version}`);
