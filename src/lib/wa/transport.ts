import { waProvider } from "./config";
import {
    downloadMedia as metaDownloadMedia,
    sendCtaUrl as metaSendCtaUrl,
    sendReviewButtons as metaSendReviewButtons,
    sendText as metaSendText,
} from "./meta";
import {
    downloadTwilioMedia,
    sendTwilioCtaUrl,
    sendTwilioReviewButtons,
    sendTwilioText,
} from "./twilio";

type SendResult = { ok: boolean; id?: string; error?: string };

export async function sendText(
    to: string,
    body: string
): Promise<SendResult> {
    if (waProvider() === "twilio") return sendTwilioText(to, body);
    return metaSendText(to, body);
}

export async function sendReviewButtons(
    to: string,
    body: string,
    buttons: { id: string; title: string }[]
): Promise<SendResult> {
    if (waProvider() === "twilio") {
        return sendTwilioReviewButtons(to, body, buttons);
    }
    return metaSendReviewButtons(to, body, buttons);
}

export async function sendCtaUrl(
    to: string,
    body: string,
    buttonLabel: string,
    url: string
): Promise<SendResult> {
    if (waProvider() === "twilio") {
        return sendTwilioCtaUrl(to, body, buttonLabel, url);
    }
    return metaSendCtaUrl(to, body, buttonLabel, url);
}

export async function downloadMedia(mediaId: string): Promise<{
    bytes: Buffer;
    mime: string;
} | null> {
    if (waProvider() === "twilio") return downloadTwilioMedia(mediaId);
    return metaDownloadMedia(mediaId);
}
