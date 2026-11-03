import { NextResponse } from "next/server";

export const runtime = "nodejs";

function intEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
}

function textEnv(name: string, fallback = ""): string {
  return (process.env[name] || fallback).trim();
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channel =
    url.searchParams.get("channel") ||
    req.headers.get("x-zippp-channel") ||
    "sideload";
  const currentVersion = Number(
    url.searchParams.get("current_version_code") ||
      req.headers.get("x-zippp-version-code") ||
      0
  );

  const minSupported = intEnv("APP_MIN_SUPPORTED_VERSION_CODE", 1);
  const latest = intEnv("APP_LATEST_VERSION_CODE", 1);
  const mandatory =
    Number.isFinite(currentVersion) &&
    currentVersion > 0 &&
    currentVersion < minSupported;

  const base = {
    version_code: latest,
    version_name: textEnv("APP_LATEST_VERSION_NAME", "1.0.0"),
    min_supported_version_code: minSupported,
    mandatory,
    release_notes: textEnv("APP_RELEASE_NOTES", "").slice(0, 500),
    channel,
  };

  if (channel === "play") {
    const playUrl = textEnv("APP_PLAY_STORE_URL");
    const res = NextResponse.json({
      ok: true,
      ...base,
      play_store_url: playUrl.startsWith("https://") ? playUrl : null,
    });
    res.headers.set("Cache-Control", "public, max-age=300");
    return res;
  }

  const downloadUrl = textEnv("APP_DOWNLOAD_URL");
  const sha256 = textEnv("APP_APK_SHA256").toLowerCase();
  const validDownload = downloadUrl.startsWith("https://");
  const validSha = /^[0-9a-f]{64}$/.test(sha256);

  const res = NextResponse.json({
    ok: true,
    ...base,
    download_url: validDownload ? downloadUrl : null,
    sha256: validSha ? sha256 : null,
    size: intEnv("APP_APK_SIZE", 0) || null,
  });
  res.headers.set("Cache-Control", "public, max-age=300");
  return res;
}
