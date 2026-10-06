import TopUpClient from "@/components/app/screens/TopUpClient";
import { IDR_PER_CREDIT, MIN_TOPUP_IDR } from "@/lib/billing/config";
import { paddleConfig, paddleConfigured } from "@/lib/billing/paddle";
import { getLocale } from "@/lib/server-locale";

export default async function TopUpPage() {
    const { region } = await getLocale();
    const paddle = { ...paddleConfig(), configured: paddleConfigured() };

    return (
        <TopUpClient
            region={region}
            paddle={paddle}
            minIdr={MIN_TOPUP_IDR}
            idrPerCredit={IDR_PER_CREDIT}
        />
    );
}
