// @implements FEAT-115
package link.zippp.app.ui.manual

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import kotlinx.coroutines.launch
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.AppendRequest
import link.zippp.app.data.Receipt

@Composable
fun ManualEntryScreen(
    api: ApiClient,
    token: String,
    initialAmount: String?,
    initialMerchant: String?,
    onBack: () -> Unit,
    onSaved: (Int?) -> Unit,
    onSessionLost: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var merchant by remember { mutableStateOf(initialMerchant.orEmpty()) }
    var amount by remember { mutableStateOf(initialAmount.orEmpty()) }
    var date by remember { mutableStateOf(LocalDate.now().toString()) }
    var category by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var outOfCredits by remember { mutableStateOf(false) }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = stringResource(R.string.manual_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = stringResource(R.string.manual_body),
            style = MaterialTheme.typography.bodySmall,
        )

        OutlinedTextField(
            value = merchant,
            onValueChange = { merchant = it },
            label = { Text(stringResource(R.string.review_merchant)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = amount,
            onValueChange = { amount = it },
            label = { Text(stringResource(R.string.review_total)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = date,
            onValueChange = { date = it },
            label = { Text(stringResource(R.string.review_date)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        OutlinedTextField(
            value = category,
            onValueChange = { category = it },
            label = { Text(stringResource(R.string.review_category)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        error?.let {
            Text(
                text = stringResource(it),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
        }
        if (outOfCredits) {
            Text(
                text = stringResource(R.string.no_credits_message),
                style = MaterialTheme.typography.bodyMedium,
            )
        }

        Spacer(Modifier.height(4.dp))

        Button(
            enabled = !busy && !outOfCredits && amount.trim().toDoubleOrNull() != null,
            onClick = {
                val total = amount.trim().toDoubleOrNull() ?: return@Button
                busy = true
                error = null
                scope.launch {
                    try {
                        val issued = api.createManualScan(token)
                        val scanId = issued.scanId
                        if (!issued.ok || scanId == null) {
                            error = R.string.error_append
                            return@launch
                        }
                        val response = api.append(
                            token,
                            AppendRequest(
                                scanId = scanId,
                                receipt = Receipt(
                                    merchant = merchant.trim().ifBlank { null },
                                    date = date.trim().ifBlank { null },
                                    category = category.trim().ifBlank { null },
                                    total = total,
                                    lineItems = emptyList(),
                                ),
                            ),
                        )
                        when {
                            response.ok -> onSaved(response.creditsRemaining)
                            response.code == "NO_CREDITS" -> {
                                outOfCredits = true
                                error = R.string.error_no_credits
                            }
                            response.code == "PLAN_LIMIT" -> error = R.string.plan_limit
                            else -> error = R.string.error_append
                        }
                    } catch (e: ApiException) {
                        if (e.code == "DEVICE_REVOKED") onSessionLost()
                        else error = R.string.error_append
                    } catch (_: Exception) {
                        error = R.string.error_append
                    } finally {
                        busy = false
                    }
                }
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.height(18.dp))
            else Text(stringResource(R.string.manual_save))
        }

        OutlinedButton(
            onClick = onBack,
            enabled = !busy,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(stringResource(R.string.settings_back))
        }
    }
}
