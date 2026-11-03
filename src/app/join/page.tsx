import type { Metadata } from "next";
import { loadWording } from "@/lib/content";
import { getLocale } from "@/lib/server-locale";
import { makeT } from "@/lib/t";
import JoinClient from "./JoinClient";

export const metadata: Metadata = {
    robots: { index: false, follow: false },
};

export default async function JoinPage({
    searchParams,
}: {
    searchParams: Promise<{ code?: string }>;
}) {
    const params = await searchParams;
    const { lang } = await getLocale();
    const t = makeT(loadWording(), lang);

    return (
        <main className="flex min-h-screen items-center justify-center bg-page px-4 py-10">
            <div className="w-full max-w-[430px] rounded-3xl bg-card p-6">
                <p className="font-head text-2xl font-black text-brand">
                    zippp
                </p>
                <h1 className="mt-4 font-head text-3xl font-extrabold leading-none">
                    {t("app.space.join.title")}
                </h1>
                <JoinClient
                    code={params.code ?? ""}
                    labels={{
                        loading: t("app.space.join.loading"),
                        invited: t("app.space.join.invited"),
                        join: t("app.space.join.button"),
                        busy: t("app.space.join.busy"),
                        signIn: t("app.space.join.signIn"),
                        success: t("app.space.join.success"),
                        open: t("app.space.join.open"),
                        invalid: t("app.space.join.invalid"),
                        missingCode: t("app.space.join.missingCode"),
                        emailMismatch: t("app.space.join.emailMismatch"),
                        error: t("app.space.join.error"),
                    }}
                />
            </div>
        </main>
    );
}
