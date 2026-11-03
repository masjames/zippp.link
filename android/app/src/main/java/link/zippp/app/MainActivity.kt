package link.zippp.app

import android.content.Intent
import android.net.Uri
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalContext
import link.zippp.app.data.ApiClient
import link.zippp.app.data.SecureTokenStore
import link.zippp.app.ui.auth.SignInScreen
import link.zippp.app.ui.camera.CameraScreen
import link.zippp.app.ui.theme.ZipppTheme

class MainActivity : ComponentActivity() {
    private var pendingMagicToken = mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        pendingMagicToken.value = magicTokenFrom(intent)
        setContent {
            ZipppTheme {
                ZipppRoot(
                    magicToken = pendingMagicToken.value,
                    onMagicConsumed = { pendingMagicToken.value = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        pendingMagicToken.value = magicTokenFrom(intent)
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
}

@Composable
private fun ZipppRoot(
    magicToken: String?,
    onMagicConsumed: () -> Unit,
) {
    val context = LocalContext.current
    val store = remember { SecureTokenStore(context) }
    val api = remember { ApiClient() }
    var token by remember { mutableStateOf(store.loadToken()) }
    var credits by remember { mutableStateOf(0) }

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
    } else {
        CameraScreen(
            api = api,
            token = token!!,
            initialCredits = credits,
            onCreditsChanged = { credits = it },
            onSessionLost = {
                store.clear()
                token = null
            },
        )
    }
}
