package link.zippp.app.ui.auth

// @implements FEAT-113

import android.os.Build
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.credentials.CredentialManager
import androidx.credentials.CustomCredential
import androidx.credentials.GetCredentialRequest
import androidx.credentials.exceptions.GetCredentialException
import com.google.android.libraries.identity.googleid.GetGoogleIdOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import kotlinx.coroutines.launch
import link.zippp.app.BuildConfig
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.SecureTokenStore
import link.zippp.app.ui.pairing.PairingScreen
import java.util.UUID

@Composable
fun SignInScreen(
    api: ApiClient,
    store: SecureTokenStore,
    initialMagicToken: String? = null,
    onSignedIn: (String, Int) -> Unit,
) {
    var showPairing by remember { mutableStateOf(false) }

    if (showPairing) {
        PairingWithBack(
            api = api,
            store = store,
            onBack = { showPairing = false },
            onPaired = onSignedIn,
        )
    } else {
        MagicLinkPanel(
            api = api,
            store = store,
            initialToken = initialMagicToken,
            onSignedIn = onSignedIn,
            onUsePairing = { showPairing = true },
        )
    }
}

@Composable
private fun PairingWithBack(
    api: ApiClient,
    store: SecureTokenStore,
    onBack: () -> Unit,
    onPaired: (String, Int) -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(top = 8.dp),
    ) {
        TextButton(onClick = onBack) {
            Text(stringResource(R.string.signin_back))
        }
        PairingScreen(api = api, store = store, onPaired = onPaired)
    }
}

@Composable
private fun MagicLinkPanel(
    api: ApiClient,
    store: SecureTokenStore,
    initialToken: String?,
    onSignedIn: (String, Int) -> Unit,
    onUsePairing: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var email by remember { mutableStateOf("") }
    var token by remember { mutableStateOf(initialToken.orEmpty()) }
    var loading by remember { mutableStateOf(false) }
    var linkSent by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var errorText by remember { mutableStateOf<String?>(null) }
    val googleClientId = BuildConfig.GOOGLE_SERVER_CLIENT_ID.trim()

    suspend fun finishSession(session: String, credits: Int) {
        store.saveToken(session)
        onSignedIn(session, credits)
    }

    suspend fun consume(raw: String) {
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
        val result = api.consumeMagicLink(
            token = raw,
            deviceId = store.deviceId(),
            deviceName = deviceName.ifBlank { "Android" },
            appVersion = BuildConfig.VERSION_NAME,
        )
        val session = result.token
        if (result.ok && session != null) {
            finishSession(session, result.user?.credits ?: 0)
        } else {
            error = R.string.error_pairing
        }
    }

    suspend fun signInWithGoogle() {
        if (googleClientId.isEmpty()) {
            error = R.string.signin_google_missing_client
            return
        }
        val googleIdOption = GetGoogleIdOption.Builder()
            .setFilterByAuthorizedAccounts(false)
            .setServerClientId(googleClientId)
            .setNonce(UUID.randomUUID().toString())
            .build()
        val request = GetCredentialRequest.Builder()
            .addCredentialOption(googleIdOption)
            .build()
        val credentialManager = CredentialManager.create(context)
        val response = credentialManager.getCredential(context, request)
        val credential = response.credential
        if (credential !is CustomCredential ||
            credential.type != GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL
        ) {
            error = R.string.error_server
            return
        }
        val googleIdToken = GoogleIdTokenCredential.createFrom(credential.data).idToken
        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
        val result = api.exchangeGoogle(
            idToken = googleIdToken,
            deviceId = store.deviceId(),
            deviceName = deviceName.ifBlank { "Android" },
            appVersion = BuildConfig.VERSION_NAME,
        )
        val session = result.token
        if (result.ok && session != null) {
            finishSession(session, result.user?.credits ?: 0)
        } else {
            error = R.string.error_pairing
        }
    }

    LaunchedEffect(initialToken) {
        val seed = initialToken?.takeIf { it.isNotBlank() } ?: return@LaunchedEffect
        loading = true
        error = null
        try {
            consume(seed)
        } catch (e: ApiException) {
            error = mapAuthError(e.code)
        } catch (_: Exception) {
            error = R.string.error_server
        } finally {
            loading = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.signin_title),
            style = MaterialTheme.typography.headlineMedium,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.signin_subtitle),
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(24.dp))

        Button(
            enabled = !loading,
            onClick = {
                loading = true
                error = null
                errorText = null
                scope.launch {
                    try {
                        signInWithGoogle()
                    } catch (e: GetCredentialException) {
                        errorText = e.message
                        error = R.string.error_server
                    } catch (e: ApiException) {
                        error = mapAuthError(e.code)
                    } catch (_: Exception) {
                        error = R.string.error_server
                    } finally {
                        loading = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.signin_google))
        }
        Spacer(Modifier.height(16.dp))

        OutlinedTextField(
            value = email,
            onValueChange = { email = it.trim() },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.signin_email_hint)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Done,
            ),
        )
        Spacer(Modifier.height(12.dp))
        Button(
            enabled = !loading && email.contains("@"),
            onClick = {
                loading = true
                error = null
                linkSent = false
                scope.launch {
                    try {
                        api.requestMagicLink(email)
                        linkSent = true
                    } catch (e: ApiException) {
                        error = mapAuthError(e.code)
                    } catch (_: Exception) {
                        error = R.string.error_server
                    } finally {
                        loading = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.signin_send_link))
        }

        if (linkSent) {
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(R.string.signin_link_sent),
                style = MaterialTheme.typography.bodySmall,
            )
        }

        Spacer(Modifier.height(24.dp))
        OutlinedTextField(
            value = token,
            onValueChange = { token = it.trim() },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.signin_token_hint)) },
            singleLine = true,
        )
        Spacer(Modifier.height(12.dp))
        Button(
            enabled = !loading && token.length >= 16,
            onClick = {
                loading = true
                error = null
                scope.launch {
                    try {
                        consume(token)
                    } catch (e: ApiException) {
                        error = mapAuthError(e.code)
                    } catch (_: Exception) {
                        error = R.string.error_server
                    } finally {
                        loading = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.signin_consume))
        }

        Spacer(Modifier.height(16.dp))
        OutlinedButton(
            onClick = onUsePairing,
            enabled = !loading,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.signin_use_pairing))
        }

        if (loading) {
            Spacer(Modifier.height(16.dp))
            CircularProgressIndicator()
        }
        error?.let { res ->
            Spacer(Modifier.height(12.dp))
            Text(text = stringResource(res), color = MaterialTheme.colorScheme.error)
        }
        errorText?.let { msg ->
            Spacer(Modifier.height(8.dp))
            Text(text = msg, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
        }
    }
}

private fun mapAuthError(code: String): Int = when (code) {
    "RATE_LIMITED" -> R.string.error_rate_limited
    "INVALID_TOKEN", "INVALID_MAGIC_LINK", "INVALID_PAIRING_CODE" -> R.string.error_pairing_code
    "DEVICE_CONFLICT" -> R.string.error_device_conflict
    else -> R.string.error_server
}
