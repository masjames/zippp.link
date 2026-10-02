"use client";

import { useState } from "react";
import Faq from "@/components/Faq";
import Hero from "@/components/Hero";
import LanguageToggle from "@/components/LanguageToggle";
import Steps from "@/components/Steps";
import { COPY, type Language } from "@/components/copy";

export default function Home() {
    const [language, setLanguage] = useState<Language>("en");

    return (
        <div className="min-h-screen bg-white" lang={language}>
            <header className="border-b border-gray-200">
                <div className="max-w-5xl mx-auto flex items-center justify-between px-4 sm:px-6 py-4">
                    <span className="text-2xl font-bold text-gray-900">zippp</span>
                    <LanguageToggle language={language} onChange={setLanguage} />
                </div>
            </header>
            <main>
                <Hero language={language} />
                <Steps language={language} />
                <Faq language={language} />
            </main>
            <footer className="border-t border-gray-200 py-8 text-center text-sm text-gray-500">
                {COPY[language].footer}
            </footer>
        </div>
    );
}
