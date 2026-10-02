"use client";

import { useState } from "react";
import BadPhotoScreen from "@/components/app/BadPhotoScreen";
import EmptyScreen from "@/components/app/EmptyScreen";
import ReadingScreen from "@/components/app/ReadingScreen";
import ResultScreen from "@/components/app/ResultScreen";
import { APP_COPY } from "@/components/app/copy";
import type { Language } from "@/components/copy";
import LanguageToggle from "@/components/LanguageToggle";
import type { ExtractResponse, Receipt } from "@/types/receipt";

type State =
    | { screen: "empty" }
    | { screen: "reading" }
    | { screen: "result"; receipt: Receipt }
    | { screen: "bad" };

export default function App() {
    const [language, setLanguage] = useState<Language>("en");
    const [state, setState] = useState<State>({ screen: "empty" });

    async function extract(file: File) {
        setState({ screen: "reading" });
        try {
            const form = new FormData();
            form.append("image", file);
            const res = await fetch("/api/extract", { method: "POST", body: form });
            const data = (await res.json()) as ExtractResponse;
            setState(
                data.ok
                    ? { screen: "result", receipt: data.receipt }
                    : { screen: "bad" },
            );
        } catch {
            setState({ screen: "bad" });
        }
    }

    const reset = () => setState({ screen: "empty" });

    return (
        <div className="min-h-screen bg-gray-50" lang={language}>
            <header className="mx-auto flex max-w-xl items-center justify-between px-4 py-4">
                <button
                    type="button"
                    onClick={reset}
                    className="text-2xl font-bold text-gray-900"
                >
                    {APP_COPY[language].brand}
                </button>
                <LanguageToggle language={language} onChange={setLanguage} />
            </header>
            <main className="mx-auto max-w-xl px-4 pb-8">
                {state.screen === "empty" && (
                    <EmptyScreen language={language} onFile={extract} />
                )}
                {state.screen === "reading" && <ReadingScreen language={language} />}
                {state.screen === "result" && (
                    <ResultScreen
                        language={language}
                        receipt={state.receipt}
                        onFile={extract}
                    />
                )}
                {state.screen === "bad" && (
                    <BadPhotoScreen language={language} onRetry={reset} />
                )}
            </main>
        </div>
    );
}
