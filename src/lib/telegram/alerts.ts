import { getChatIdForUser, claimLowCreditAlert, clearLowCreditAlert } from "./store";
import { sendMessage } from "./bot";
import { loadWording } from "@/lib/content";
import { fill, makeT } from "@/lib/t";
import { LOW_CREDITS_WARN } from "@/lib/billing/config";

function t() {
  return makeT(loadWording(), "id");
}

/**
 * Low-credit warning to the user's linked Telegram chat.
 * Called asynchronously AFTER a credit spend, never inside Lua.
 * Anti-steering compliant: no purchase CTA and no web purchase link.
 */
export async function sendLowCreditAlert(params: {
  userId: string;
  remaining: number;
}): Promise<void> {
  try {
    const chatId = await getChatIdForUser(params.userId);
    if (!chatId) return;
    const first = await claimLowCreditAlert(params.userId);
    if (!first) return;

    await sendMessage({
      chat_id: chatId,
      text: fill(t()("telegram.low_credit"), { count: params.remaining }),
    });
  } catch {
    /* notifications never block the caller */
  }
}

/** Notification when a new device is paired to the account. */
export async function sendPairingAlert(params: {
  userId: string;
  deviceName: string;
  appVersion: string;
}): Promise<void> {
  try {
    const chatId = await getChatIdForUser(params.userId);
    if (!chatId) return;

    // Plain text, so the device name cannot inject HTML or links.
    await sendMessage({
      chat_id: chatId,
      text: fill(t()("telegram.new_device"), {
        device: `${params.deviceName} (${params.appVersion})`,
      }),
    });
  } catch {
    /* notifications never block pairing */
  }
}

/** Top-up confirmation notification. */
export async function sendTopUpAlert(params: {
  userId: string;
  added: number;
  newBalance: number;
}): Promise<void> {
  try {
    if (params.newBalance >= LOW_CREDITS_WARN) {
      await clearLowCreditAlert(params.userId);
    }
    const chatId = await getChatIdForUser(params.userId);
    if (!chatId) return;

    await sendMessage({
      chat_id: chatId,
      text: fill(t()("telegram.topup_done"), {
        added: params.added,
        total: params.newBalance,
      }),
    });
  } catch {
    /* notifications never block billing */
  }
}
