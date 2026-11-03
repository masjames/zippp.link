package link.zippp.app.ui.pairing

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
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import link.zippp.app.BuildConfig
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.SecureTokenStore

@Composable
fun PairingScreen(
    api: ApiClient,
    store: SecureTokenStore,
    onPaired: (String, Int) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var code by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(28.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            text = stringResource(R.string.pairing_title),
            style = MaterialTheme.typography.headlineMedium,
        )
        Spacer(Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.pairing_subtitle),
            style = MaterialTheme.typography.bodyMedium,
        )
        Spacer(Modifier.height(24.dp))

        OutlinedTextField(
            value = code,
            onValueChange = { value ->
                code = value.uppercase()
                    .filter { it.isLetterOrDigit() || it == '-' }
                    .take(9)
            },
            modifier = Modifier.fillMaxWidth(),
            label = { Text(stringResource(R.string.pairing_hint)) },
            singleLine = true,
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Characters,
                imeAction = ImeAction.Done,
            ),
        )

        Spacer(Modifier.height(18.dp))
        Button(
            enabled = !loading && code.replace("-", "").length == 8,
            onClick = {
                loading = true
                error = null
                scope.launch {
                    try {
                        val deviceName = "${Build.MANUFACTURER} ${Build.MODEL}".trim()
                        val result = api.claim(
                            code = code,
                            deviceId = store.deviceId(),
                            deviceName = deviceName.ifBlank { "Android" },
                            appVersion = BuildConfig.VERSION_NAME,
                        )
                        val token = result.token
                        if (result.ok && token != null) {
                            store.saveToken(token)
                            onPaired(token, result.user?.credits ?: 0)
                        } else {
                            error = pairingError(result.code)
                        }
                    } catch (e: ApiException) {
                        error = pairingError(e.code)
                    } catch (_: Exception) {
                        error = R.string.error_pairing
                    } finally {
                        loading = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (loading) {
                CircularProgressIndicator(modifier = Modifier.height(20.dp))
            } else {
                Text(stringResource(R.string.pairing_connect))
            }
        }

        error?.let {
            Spacer(Modifier.height(12.dp))
            Text(
                text = stringResource(it),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}

private fun pairingError(code: String?): Int = when (code) {
    "RATE_LIMITED" -> R.string.error_rate_limited
    "INVALID_PAIRING_CODE" -> R.string.error_pairing_code
    "DEVICE_CONFLICT" -> R.string.error_device_conflict
    "STORE_UNAVAILABLE", "SERVER_MISCONFIGURED" -> R.string.error_server
    else -> R.string.error_pairing
}
