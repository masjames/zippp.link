const fs = require("node:fs");
const path = require("node:path");

const rawWording = fs.readFileSync(path.resolve(__dirname, "../../spec/wording.txt"), "utf8");
const wording = {};
for (const block of rawWording.split(/^## /m).slice(1)) {
  const newline = block.indexOf("\n");
  if (newline === -1) continue;
  wording[block.slice(0, newline).trim()] = block.slice(newline + 1).trim();
}

function requiredCopy(key) {
  const value = wording[`${key}.en`];
  if (!value) throw new Error(`Missing app configuration copy: ${key}.en`);
  return value;
}

const cameraPermission = requiredCopy("app.expoCapture.cameraPermission");
const photosPermission = requiredCopy("app.expoCapture.photosPermission");

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    "expo-router",
    ["expo-sqlite", { useSQLCipher: true }],
    "expo-secure-store",
    ["expo-camera", { cameraPermission, recordAudioAndroid: false }],
    ["expo-image-picker", { cameraPermission, photosPermission, microphonePermission: false }],
  ],
});
