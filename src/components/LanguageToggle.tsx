import type { Language } from "./copy";

const OPTIONS: { value: Language; label: string }[] = [
    { value: "en", label: "EN" },
    { value: "id", label: "ID" },
];

/**
 * EN / ID language switch.
 *
 * Args:
 *     language: Currently selected language.
 *     onChange: Called with the newly selected language.
 */
export default function LanguageToggle({
    language,
    onChange,
}: {
    language: Language;
    onChange: (language: Language) => void;
}) {
    return (
        <div className="flex gap-1" role="group" aria-label="Language">
            {OPTIONS.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    onClick={() => onChange(o.value)}
                    aria-pressed={language === o.value}
                    className={`rounded-md px-3 py-1 text-sm font-medium ${
                        language === o.value
                            ? "bg-gray-900 text-white"
                            : "text-gray-600 hover:bg-gray-100"
                    }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    );
}
