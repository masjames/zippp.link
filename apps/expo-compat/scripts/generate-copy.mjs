#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const appDirectory = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.resolve(appDirectory, "../../..");
const source = path.join(repositoryRoot, "spec", "wording.txt");
const destination = path.join(appDirectory, "..", "src", "generated", "wording.ts");
const wording = {};

for (const block of readFileSync(source, "utf8").split(/^## /m).slice(1)) {
  const newline = block.indexOf("\n");
  if (newline === -1) continue;
  const key = block.slice(0, newline).trim();
  if (!key.startsWith("app.")) continue;
  wording[key] = block.slice(newline + 1).trim();
}

if (!wording["app.home.title.en"] || !wording["app.inbox.title.en"]) {
  throw new Error("Required Home and Inbox wording is missing from spec/wording.txt");
}

mkdirSync(path.dirname(destination), { recursive: true });
writeFileSync(
  destination,
  `// Generated from spec/wording.txt by scripts/generate-copy.mjs. Do not edit.\nexport const WORDING: Record<string, string> = ${JSON.stringify(wording, null, 2)};\n`,
  "utf8",
);
console.log(`Generated ${Object.keys(wording).length} app strings from spec/wording.txt`);
