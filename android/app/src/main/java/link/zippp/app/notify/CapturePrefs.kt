package link.zippp.app.notify

import android.content.Context
import android.content.SharedPreferences

/** Opt-in switch for notification capture. Off unless the user turns it on. */
object CapturePrefs {
    private const val FILE = "zippp_capture"
    private const val KEY_ENABLED = "capture_enabled"

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(FILE, Context.MODE_PRIVATE)

    fun enabled(context: Context): Boolean =
        prefs(context).getBoolean(KEY_ENABLED, false)

    fun setEnabled(context: Context, enabled: Boolean) {
        prefs(context).edit().putBoolean(KEY_ENABLED, enabled).apply()
    }
}
