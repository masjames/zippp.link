#!/usr/bin/env node
import { cpSync, existsSync, lstatSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(repositoryRoot, "apps", "expo-compat", "dist");
const destination = path.join(repositoryRoot, "public", "rn");

if (!existsSync(path.join(source, "index.html"))) {
  throw new Error("Expo web export is missing; run npm run export:web in apps/expo-compat first.");
}
if (existsSync(destination) && lstatSync(destination).isSymbolicLink()) {
  throw new Error("Refusing to copy Expo output through a public/rn symlink.");
}

mkdirSync(destination, { recursive: true });
cpSync(source, destination, { recursive: true, force: true });
console.log("Copied Expo web export to public/rn (generated; ignored by git).");
