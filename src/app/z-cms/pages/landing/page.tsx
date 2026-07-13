"use client";

import { useState } from "react";

export default function PagesLandingEditorPage() {
  const [heroTitle, setHeroTitle] = useState("Turn Instagram followers into WhatsApp orders in 2 minutes");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editorText, setEditorText] = useState("");

  const handleSectionClick = (sectionId: string, currentText: string) => {
    setActiveSection(sectionId);
    setEditorText(currentText);
  };

  const handleSaveAndCommit = () => {
    if (activeSection === "hero-title") {
      setHeroTitle(editorText);
    }
    setActiveSection(null);
  };

  return (
    <div>
      <h1 className="text-3xl font-black mb-6">Landing Page Editor</h1>
      <p className="text-zinc-600 dark:text-zinc-400 mb-8">
        Click on any editable section below to change its content.
      </p>

      {/* Editor Modal / Panel */}
      {activeSection && (
        <div className="mb-8 p-6 border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded max-w-xl space-y-4 shadow-md">
          <h3 className="font-bold text-base">Edit Section: {activeSection}</h3>
          <textarea
            data-testid="editor-textarea"
            className="editor-textarea w-full p-2 border border-zinc-300 dark:border-zinc-700 rounded bg-transparent h-24 text-sm"
            value={editorText}
            onChange={(e) => setEditorText(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              onClick={handleSaveAndCommit}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold rounded text-sm hover:opacity-90 cursor-pointer"
            >
              Save & Commit
            </button>
            <button
              onClick={() => setActiveSection(null)}
              className="px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded text-sm font-semibold hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Live Preview Wrapper */}
      <div className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 rounded-lg p-8">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4">Live Preview</h3>
        <div className="border border-dashed border-zinc-300 dark:border-zinc-700 p-6 rounded">
          {/* Editable Hero Title */}
          <div
            data-testid="hero-title"
            className="editable-hero-title cursor-pointer p-4 border border-transparent hover:border-blue-500 rounded transition-all group"
            onClick={() => handleSectionClick("hero-title", heroTitle)}
          >
            <h1 className="text-3xl font-extrabold mb-2 text-zinc-900 dark:text-zinc-50 group-hover:text-blue-600 transition-colors">
              {heroTitle}
            </h1>
            <span className="text-xs text-blue-500 opacity-0 group-hover:opacity-100 transition-all font-semibold">
              ✎ Edit Title
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
