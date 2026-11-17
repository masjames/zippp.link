import { useEffect, useState } from "react";
import { COOKIE_MAX_AGE, LANG_COOKIE } from "../../../src/lib/region";
import { WORDING } from "./generated/wording";

export type AppLanguage = "en" | "id";

const wording: Record<string, string> = WORDING;

export function useAppLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>("en");
  useEffect(() => {
    const saved = document.cookie
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith(`${LANG_COOKIE}=`))
      ?.slice(LANG_COOKIE.length + 1);
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    setLanguage(saved === "id" || saved === "en" ? saved : locale.startsWith("id") ? "id" : "en");
  }, []);
  return language;
}

export function setAppLanguage(language: AppLanguage): void {
  if (typeof document === "undefined" || typeof window === "undefined") return;
  document.cookie = `${LANG_COOKIE}=${language}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  window.location.reload();
}

export function copy(key: string, language: AppLanguage): string {
  const value = wording[`${key}.${language}`] ?? wording[`${key}.en`];
  if (value === undefined) throw new Error(`Missing app wording: ${key}.${language}`);
  return value;
}
