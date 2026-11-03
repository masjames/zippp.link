// @implements FEAT-115
package link.zippp.app.notify

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Intent
import android.os.Build
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import link.zippp.app.MainActivity
import link.zippp.app.R

/**
 * Opt-in Notification Listener. Reads a notification on the device, keeps a
 * payment-like amount, and posts a local prompt. Nothing leaves the device
 * until the user records the spend. No Accessibility service is involved.
 */
class CaptureListener : NotificationListenerService() {

    private var lastHash: Int = 0
    private var lastAt: Long = 0

    override fun onNotificationPosted(sbn: StatusBarNotification) {
        if (!CapturePrefs.enabled(this)) return
        val extras = sbn.notification.extras
        val title = extras.getCharSequence("android.title")?.toString().orEmpty()
        val text = extras.getCharSequence("android.text")?.toString().orEmpty()
        val combined = "$title $text".trim()
        if (combined.isEmpty()) return
        if (!looksLikePayment(combined)) return
        val amount = amountOf(combined) ?: return

        val now = System.currentTimeMillis()
        val hash = combined.hashCode()
        if (hash == lastHash && now - lastAt < 60_000) return
        lastHash = hash
        lastAt = now

        prompt(title = title.take(80), amount = amount)
    }

    private fun prompt(title: String, amount: String) {
        val manager = getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL,
                getString(R.string.notify_channel),
                NotificationManager.IMPORTANCE_DEFAULT,
            )
            manager.createNotificationChannel(channel)
        }

        val intent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
            putExtra(MainActivity.EXTRA_MANUAL, true)
            putExtra(MainActivity.EXTRA_AMOUNT, amount)
            putExtra(MainActivity.EXTRA_MERCHANT, title)
        }
        val pending = PendingIntent.getActivity(
            this,
            PROMPT_ID,
            intent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val cameraIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val cameraPending = PendingIntent.getActivity(
            this,
            PROMPT_ID + 1,
            cameraIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )

        val notification = NotificationCompat.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.ic_dialog_info)
            .setContentTitle(getString(R.string.notify_prompt_title))
            .setContentText(getString(R.string.notify_prompt_body))
            .setAutoCancel(true)
            .setContentIntent(pending)
            .addAction(0, getString(R.string.manual_title), pending)
            .addAction(0, getString(R.string.notify_open_camera), cameraPending)
            .build()

        try {
            NotificationManagerCompat.from(this).notify(PROMPT_ID, notification)
        } catch (_: SecurityException) {
            /* POST_NOTIFICATIONS not granted; the prompt is best effort. */
        }
    }

    private fun looksLikePayment(text: String): Boolean =
        PAYMENT_WORDS.any { text.contains(it, ignoreCase = true) }

    /** Indonesian rupiah amounts; dots are thousands, comma is the decimal. */
    private fun amountOf(text: String): String? {
        val match = AMOUNT.find(text) ?: return null
        val raw = match.groupValues[1].trim().trimEnd('.', ',')
        val value = raw.replace(".", "").replace(",", ".").toDoubleOrNull() ?: return null
        if (value <= 0.0) return null
        return raw.replace(".", "").replace(",", ".")
    }

    companion object {
        private const val CHANNEL = "zippp_capture"
        private const val PROMPT_ID = 4101
        private val AMOUNT = Regex("(?i)rp\\.?\\s*([0-9][0-9.,]*)")
        private val PAYMENT_WORDS = listOf(
            "payment",
            "pembayaran",
            "transfer",
            "berhasil",
            "qris",
            "debit",
            "kredit",
            "top up",
            "topup",
            "transaksi",
            "paid",
        )
    }
}
