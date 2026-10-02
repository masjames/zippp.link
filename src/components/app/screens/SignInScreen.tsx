import PhoneShell from "../PhoneShell";
import type { T } from "@/lib/t";

/** Screen 02 / Sign in. Google is the only login. */
export default function SignInScreen({
    t,
    onSignIn,
    error,
}: {
    t: T;
    onSignIn: () => void;
    error?: string | null;
}) {
    return (
        <PhoneShell pill={t("app.signin.step")}>
            <div className="mt-10 font-head text-6xl font-black leading-none tracking-tight text-brand">
                zippp
            </div>
            <h2 className="font-head text-3xl font-extrabold leading-none">
                {t("app.signin.title")}
            </h2>
            <p className="max-w-[32ch] text-muted">{t("app.signin.body")}</p>
            <div className="mt-auto grid gap-4">
                <button
                    type="button"
                    onClick={onSignIn}
                    className="flex w-full items-center justify-center gap-3 rounded-full border-2 border-[#747775] bg-white px-6 py-4 font-semibold text-[#1f1f1f]"
                >
                    <span
                        aria-hidden
                        style={{
                            background:
                                "conic-gradient(from -45deg,#EA4335 0 25%,#4285F4 0 50%,#34A853 0 75%,#FBBC05 0)",
                            WebkitBackgroundClip: "text",
                            backgroundClip: "text",
                            color: "transparent",
                        }}
                        className="text-xl font-bold"
                    >
                        G
                    </span>
                    {t("app.signin.google")}
                </button>
                {error ? (
                    <p className="text-center text-sm font-medium text-danger">
                        {error}
                    </p>
                ) : null}
                <p className="text-center text-xs text-muted">
                    {t("app.signin.fine")}
                </p>
            </div>
        </PhoneShell>
    );
}
