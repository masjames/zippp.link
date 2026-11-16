import { useEffect, useState } from "react";
import { WORDING } from "./generated/wording";

export type AppLanguage = "en" | "id";

const wording: Record<string, string> = WORDING;

export function useAppLanguage(): AppLanguage {
  const [language, setLanguage] = useState<AppLanguage>("en");
  useEffect(() => {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale.toLowerCase();
    setLanguage(locale.startsWith("id") ? "id" : "en");
  }, []);
  return language;
}

export function copy(key: string, language: AppLanguage): string {
  const value = wording[`${key}.${language}`] ?? wording[`${key}.en`];
  if (value === undefined) throw new Error(`Missing app wording: ${key}.${language}`);
  return value;
}
