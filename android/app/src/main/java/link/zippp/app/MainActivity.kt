package link.zippp.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.ui.Modifier
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
import link.zippp.app.ui.batch.BatchScreen
import link.zippp.app.ui.batch.BatchStore
import link.zippp.app.ui.review.ReviewScreen
import link.zippp.app.data.AppendRequest
import link.zippp.app.data.ApiException
import kotlinx.coroutines.channels.Channel
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppHeader
import link.zippp.app.ui.theme.ZipppTheme

/** Values carried from a capture prompt into manual entry. */
data class ManualPrefill(
    val amount: String?,
    val merchant: String?,
)

private enum class RootScreen { Camera, Settings, Manual, Space, Batch, Review }

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

/** Web AppShell: header above the screen on every screen except capture. */
@Composable
private fun AppFrame(
    showSettings: Boolean,
    onHome: () -> Unit,
    onSettings: () -> Unit,
    content: @Composable () -> Unit,
) {
    Column(modifier = Modifier.fillMaxSize().background(ZipppColors.page)) {
        ZipppHeader(
            showHome = true,
            showSettings = showSettings,
            onHome = onHome,
            onSettings = onSettings,
        )
        Box(modifier = Modifier.weight(1f)) { content() }
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
    val batch = remember { BatchStore() }
    var currentDraftId by remember { mutableStateOf<String?>(null) }
    val outbox = remember { Channel<Pair<String, AppendRequest>>(Channel.UNLIMITED) }

    LaunchedEffect(token, api) {
        val active = token ?: return@LaunchedEffect
        for ((draftId, request) in outbox) {
            batch.markSending(draftId)
            try {
                val response = api.append(active, request)
                when {
                    response.ok -> {
                        batch.remove(draftId)
                        response.creditsRemaining?.let { credits = it }
                    }
                    response.code == "NO_CREDITS" -> batch.markReady(draftId, "NO_CREDITS")
                    response.code == "PLAN_LIMIT" -> batch.markReady(draftId, "PLAN_LIMIT")
                    response.code == "SCAN_ALREADY_SENT" -> batch.remove(draftId)
                    else -> batch.markReady(draftId, response.code ?: "ERROR")
                }
            } catch (e: ApiException) {
                if (e.code == "DEVICE_REVOKED") {
                    store.clear()
                    token = null
                } else {
                    batch.markReady(draftId, e.code)
                }
            } catch (_: Exception) {
                batch.markReady(draftId, "NETWORK")
            }
        }
    }

    fun nextDraft(): RootScreen {
        val next = batch.items.firstOrNull {
            it.status == "pending" || it.status == "ready"
        }
        currentDraftId = next?.id
        return if (next != null) RootScreen.Review else RootScreen.Camera
    }

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
        RootScreen.Settings -> AppFrame(
            showSettings = false,
            onHome = { screen = RootScreen.Camera },
            onSettings = { screen = RootScreen.Settings },
        ) {
            SettingsScreen(
                credits = credits,
                onSignOut = {
                    store.clear()
                    token = null
                    screen = RootScreen.Camera
                },
            )
        }
        RootScreen.Batch -> BatchScreen(
            store = batch,
            onCaptureMore = { screen = RootScreen.Camera },
            onOpenDraft = { id ->
                currentDraftId = id
                screen = RootScreen.Review
            },
            onClose = { screen = RootScreen.Camera },
        )
        RootScreen.Space -> AppFrame(
            showSettings = true,
            onHome = { screen = RootScreen.Camera },
            onSettings = { screen = RootScreen.Settings },
        ) {
            SpaceScreen(
                api = api,
                token = token!!,
                onBack = { screen = RootScreen.Camera },
                onSessionLost = {
                    store.clear()
                    token = null
                    screen = RootScreen.Camera
                },
            )
        }
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
        RootScreen.Review -> {
            Box(modifier = Modifier.fillMaxSize()) {
                CameraScreen(
                    api = api,
                    token = token!!,
                    initialCredits = credits,
                    onCreditsChanged = { credits = it },
                    onOpenSettings = {},
                    onOpenManual = {},
                    onOpenSpace = {},
                    onOpenBatch = {},
                    batch = batch,
                    onOpenDraft = { },
                    onExtracted = { _, _ -> },
                    onSessionLost = { },
                )
                val draft = batch.find(currentDraftId ?: "")
                if (draft == null) {
                    screen = nextDraft()
                } else {
                    ReviewScreen(
                        api = api,
                        token = token!!,
                        receipt = draft.receipt,
                        scanId = draft.scanId,
                        credits = credits,
                        onDiscard = {
                            batch.remove(draft.id)
                            screen = nextDraft()
                        },
                        onAccept = { request ->
                            batch.markAccepted(draft.id)
                            outbox.trySend(draft.id to request)
                            screen = nextDraft()
                        },
                        onSessionLost = {
                            store.clear()
                            token = null
                            screen = RootScreen.Camera
                        },
                        overlay = true,
                    )
                }
            }
        }
        RootScreen.Camera -> CameraScreen(
            api = api,
            token = token!!,
            initialCredits = credits,
            onCreditsChanged = { credits = it },
            onOpenSettings = { screen = RootScreen.Settings },
            onOpenManual = { screen = RootScreen.Manual },
            onOpenSpace = { screen = RootScreen.Space },
            onOpenBatch = { screen = RootScreen.Batch },
            batch = batch,
            onOpenDraft = { id ->
                currentDraftId = id
                screen = RootScreen.Review
            },
            onExtracted = { receipt, scanId ->
                val draft = batch.add(receipt, scanId)
                currentDraftId = draft.id
                screen = RootScreen.Review
            },
            onSessionLost = {
                store.clear()
                token = null
                screen = RootScreen.Camera
            },
        )
    }
}
