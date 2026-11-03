package link.zippp.app.ui.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
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
import kotlinx.coroutines.launch
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.AppendRequest
import link.zippp.app.data.Receipt

@Composable
fun ReviewScreen(
    api: ApiClient,
    token: String,
    receipt: Receipt,
    scanId: String,
    credits: Int,
    onDiscard: () -> Unit,
    onAccepted: (Int?) -> Unit,
    onSessionLost: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var merchant by remember(receipt) { mutableStateOf(receipt.merchant.orEmpty()) }
    var total by remember(receipt) { mutableStateOf(receipt.total?.toString().orEmpty()) }
    var editing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var outOfCredits by remember { mutableStateOf(false) }
    var acknowledged by remember { mutableStateOf(false) }

    val softFlags = setOf("low_confidence", "row_mismatch")
    val hardFlags = receipt.flags.filter { it.reason !in softFlags }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = stringResource(R.string.review_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )
        Text(
            text = "${stringResource(R.string.scan_balance_label)}: $credits",
            style = MaterialTheme.typography.bodyMedium,
        )

        if (hardFlags.isNotEmpty()) {
            Text(
                text = stringResource(R.string.review_hard_flags),
                color = MaterialTheme.colorScheme.error,
                style = MaterialTheme.typography.bodySmall,
            )
            if (!acknowledged) {
                OutlinedButton(
                    onClick = { acknowledged = true },
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.review_acknowledge))
                }
            }
        }

        OutlinedTextField(
            value = merchant,
            onValueChange = { merchant = it },
            readOnly = !editing,
            label = { Text(stringResource(R.string.review_merchant)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        OutlinedTextField(
            value = total,
            onValueChange = { total = it },
            readOnly = !editing,
            label = { Text(stringResource(R.string.review_total)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        receipt.date?.let {
            Text(text = "${stringResource(R.string.review_date)}: $it")
        }

        receipt.lineItems.forEach { line ->
            Row(modifier = Modifier.fillMaxWidth()) {
                Text(
                    text = line.description ?: "-",
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium,
                )
                Text(
                    text = line.amount?.toString() ?: "-",
                    style = MaterialTheme.typography.bodyMedium,
                )
            }
        }

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

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            OutlinedButton(
                onClick = { editing = !editing },
                enabled = !busy,
                modifier = Modifier.weight(1f),
            ) {
                Text(stringResource(R.string.review_edit))
            }
            OutlinedButton(
                onClick = onDiscard,
                enabled = !busy,
                modifier = Modifier.weight(1f),
            ) {
                Text(stringResource(R.string.review_discard))
            }
            Button(
                enabled = !busy && !outOfCredits && (hardFlags.isEmpty() || acknowledged),
                onClick = {
                    busy = true
                    error = null
                    scope.launch {
                        try {
                            val edited = receipt.copy(
                                merchant = merchant.trim().ifBlank { null },
                                total = total.trim().toDoubleOrNull(),
                            )
                            val response = api.append(
                                token,
                                AppendRequest(scanId = scanId, receipt = edited),
                            )
                            when {
                                response.ok -> onAccepted(response.creditsRemaining)
                                response.code == "NO_CREDITS" -> {
                                    outOfCredits = true
                                    error = R.string.error_no_credits
                                }
                                response.code == "SCAN_ALREADY_SENT" -> onAccepted(null)
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
                modifier = Modifier.weight(1f),
            ) {
                if (busy) CircularProgressIndicator(modifier = Modifier.height(18.dp))
                else Text(stringResource(R.string.review_accept))
            }
        }

        if (outOfCredits) {
            Button(
                onClick = onDiscard,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(stringResource(R.string.no_credits_refresh))
            }
        }
    }
}
