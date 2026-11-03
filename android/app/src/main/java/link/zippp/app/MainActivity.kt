package link.zippp.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import link.zippp.app.data.ApiClient
import link.zippp.app.data.SecureTokenStore
import link.zippp.app.ui.auth.SignInScreen
import link.zippp.app.ui.camera.CameraScreen
import link.zippp.app.ui.manual.ManualEntryScreen
import link.zippp.app.ui.settings.SettingsScreen
import link.zippp.app.ui.space.SpaceScreen
import link.zippp.app.ui.theme.ZipppTheme

/** Values carried from a capture prompt into manual entry. */
data class ManualPrefill(
    val amount: String?,
    val merchant: String?,
)

private enum class RootScreen { Camera, Settings, Manual, Space }

class MainActivity : ComponentActivity() {
    private var pendingMagicToken = mutableStateOf<String?>(null)
    private var pendingManual = mutableStateOf<ManualPrefill?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingMagicToken.value = magicTokenFrom(intent)
        pendingManual.value = manualPrefillFrom(intent)
        setContent {
            ZipppTheme {
                ZipppRoot(
                    magicToken = pendingMagicToken.value,
                    onMagicConsumed = { pendingMagicToken.value = null },
                    manualPrefill = pendingManual.value,
                    onManualConsumed = { pendingManual.value = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingMagicToken.value = magicTokenFrom(intent)
        pendingManual.value = manualPrefillFrom(intent)
    }

    private fun magicTokenFrom(intent: Intent?): String? {
        val data: Uri = intent?.data ?: return null
        if (data.scheme == "zippp" && data.host == "auth") {
            return data.getQueryParameter("token")?.takeIf { it.isNotBlank() }
        }
        if (data.path?.contains("magic-link") == true) {
            return data.getQueryParameter("token")?.takeIf { it.isNotBlank() }
        }
        return null
    }

    private fun manualPrefillFrom(intent: Intent?): ManualPrefill? {
        if (intent?.getBooleanExtra(EXTRA_MANUAL, false) != true) return null
        return ManualPrefill(
            amount = intent.getStringExtra(EXTRA_AMOUNT),
            merchant = intent.getStringExtra(EXTRA_MERCHANT),
        )
    }

    companion object {
        const val EXTRA_MANUAL = "zippp_manual"
        const val EXTRA_AMOUNT = "zippp_amount"
        const val EXTRA_MERCHANT = "zippp_merchant"
    }
}

@Composable
private fun ZipppRoot(
    magicToken: String?,
    onMagicConsumed: () -> Unit,
    manualPrefill: ManualPrefill?,
    onManualConsumed: () -> Unit,
) {
    val context = LocalContext.current
    val store = remember { SecureTokenStore(context) }
    val api = remember { ApiClient() }
    var token by remember { mutableStateOf(store.loadToken()) }
    var credits by remember { mutableStateOf(0) }
    var screen by remember { mutableStateOf(RootScreen.Camera) }
    var manualSeed by remember { mutableStateOf(manualPrefill) }

    LaunchedEffect(manualPrefill) {
        if (manualPrefill != null) {
            manualSeed = manualPrefill
            screen = RootScreen.Manual
            onManualConsumed()
        }
    }

    if (token == null) {
        SignInScreen(
            api = api,
            store = store,
            initialMagicToken = magicToken,
            onSignedIn = { newToken, initialCredits ->
                onMagicConsumed()
                credits = initialCredits
                token = newToken
            },
        )
        return
    }

    when (screen) {
        RootScreen.Settings -> SettingsScreen(
            onBack = { screen = RootScreen.Camera },
        )
        RootScreen.Space -> SpaceScreen(
            api = api,
            token = token!!,
            onBack = { screen = RootScreen.Camera },
            onSessionLost = {
                store.clear()
                token = null
                screen = RootScreen.Camera
            },
        )
        RootScreen.Manual -> ManualEntryScreen(
            api = api,
            token = token!!,
            initialAmount = manualSeed?.amount,
            initialMerchant = manualSeed?.merchant,
            onBack = {
                manualSeed = null
                screen = RootScreen.Camera
            },
            onSaved = { remaining ->
                credits = remaining ?: credits
                manualSeed = null
                screen = RootScreen.Camera
            },
            onSessionLost = {
                store.clear()
                token = null
                screen = RootScreen.Camera
            },
        )
        RootScreen.Camera -> CameraScreen(
            api = api,
            token = token!!,
            initialCredits = credits,
            onCreditsChanged = { credits = it },
            onOpenSettings = { screen = RootScreen.Settings },
            onOpenManual = { screen = RootScreen.Manual },
            onOpenSpace = { screen = RootScreen.Space },
            onSessionLost = {
                store.clear()
                token = null
                screen = RootScreen.Camera
            },
        )
    }
}
