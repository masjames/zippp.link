/** Models sometimes wrap JSON in markdown fences; strip before JSON.parse. */
export function stripJsonFences(text: string): string {
    const trimmed = text.trim();
    if (!trimmed.startsWith("```")) return trimmed;
    return trimmed
        .replace(/^```[a-zA-Z]*\s*/, "")
        .replace(/\s*```$/, "")
        .trim();
}
