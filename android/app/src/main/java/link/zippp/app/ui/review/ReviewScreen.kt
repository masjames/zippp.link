// @implements FEAT-102
package link.zippp.app.ui.review

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
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
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshots.SnapshotStateList
import androidx.compose.runtime.toMutableStateList
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import java.time.LocalDate
import kotlin.math.abs
import kotlinx.coroutines.launch
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.AppendRequest
import link.zippp.app.data.CorrectionField
import link.zippp.app.data.CorrectionRequest
import link.zippp.app.data.LineItem
import link.zippp.app.data.Receipt
import link.zippp.app.data.Workspace

/** Editable text for one line. Values stay strings until Accept. */
private data class LineDraft(
    val description: String,
    val qty: String,
    val amount: String,
)

private val SOFT_FLAGS = setOf("low_confidence", "row_mismatch")

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
    var workspace by remember { mutableStateOf<Workspace?>(null) }
    var merchant by remember(receipt) { mutableStateOf(receipt.merchant.orEmpty()) }
    var category by remember(receipt) { mutableStateOf(receipt.category.orEmpty()) }
    var total by remember(receipt) { mutableStateOf(receipt.total?.toString().orEmpty()) }
    val dateAssumed = receipt.date.isNullOrBlank()
    var date by remember(receipt) { mutableStateOf(receipt.date ?: LocalDate.now().toString()) }
    var lines by remember(receipt) {
        mutableStateOf(
            receipt.lineItems
                .map {
                    LineDraft(
                        description = it.description.orEmpty(),
                        qty = it.qty?.toString().orEmpty(),
                        amount = it.amount?.toString().orEmpty(),
                    )
                }
                .toMutableStateList()
        )
    }
    var staff by remember(receipt) { mutableStateOf("") }
    var outlet by remember(receipt) { mutableStateOf("") }
    var payment by remember(receipt) { mutableStateOf("") }
    var purpose by remember(receipt) { mutableStateOf("") }
    var customer by remember(receipt) { mutableStateOf("") }
    var editing by remember { mutableStateOf(false) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var outOfCredits by remember { mutableStateOf(false) }
    var acknowledged by remember { mutableStateOf(false) }

    LaunchedEffect(scanId) {
        runCatching { api.me(token) }.onSuccess { me ->
            workspace = me.workspace
            if (outlet.isBlank()) outlet = me.workspace?.defaultOutlet.orEmpty()
        }
    }

    val template = workspace?.templateId
    val showStaff = template == "resto-inventory"
    val showOutlet = template == "resto-inventory"
    val showPayment = template == "personal-expense" || template == "sales-recap"
    val showCustomer = template == "sales-recap"
    val showPurpose = template == "reimbursement"
    val paymentOptions = workspace?.paymentOptions.orEmpty()
    val staffOptions = workspace?.staffNames.orEmpty()
    val outletOptions = workspace?.outlets.orEmpty()

    val editedPaths = buildSet {
        if (!sameText(merchant, receipt.merchant)) add("merchant")
        if (!dateAssumed && !sameText(date, receipt.date)) add("date")
        if (!sameMoney(total, receipt.total)) add("total")
        val count = maxOf(lines.size, receipt.lineItems.size)
        for (i in 0 until count) {
            val draft = lines.getOrNull(i)
            val original = receipt.lineItems.getOrNull(i)
            if (!sameText(draft?.description.orEmpty(), original?.description)) {
                add("line_items[$i].description")
            }
            if (!sameMoney(draft?.qty.orEmpty(), original?.qty)) {
                add("line_items[$i].qty")
            }
            if (!sameMoney(draft?.amount.orEmpty(), original?.amount)) {
                add("line_items[$i].amount")
            }
        }
    }

    val hardFlags = receipt.flags.filter { it.reason !in SOFT_FLAGS }
    val unresolved = hardFlags.filter { it.path !in editedPaths }
    val blocked = unresolved.isNotEmpty() && !acknowledged

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
            if (unresolved.isNotEmpty() && !acknowledged) {
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
            value = category,
            onValueChange = { category = it },
            readOnly = !editing,
            label = { Text(stringResource(R.string.review_category)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )

        OutlinedTextField(
            value = date,
            onValueChange = { date = it },
            readOnly = !editing,
            label = { Text(stringResource(R.string.review_date)) },
            supportingText = if (dateAssumed) {
                { Text(stringResource(R.string.review_date_assumed)) }
            } else {
                null
            },
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

        if (showStaff) {
            ChoiceField(
                label = stringResource(R.string.review_staff),
                value = staff,
                options = staffOptions,
                enabled = editing,
                onSelect = { staff = it },
            )
        }
        if (showOutlet) {
            ChoiceField(
                label = stringResource(R.string.review_outlet),
                value = outlet,
                options = outletOptions,
                enabled = editing,
                onSelect = { outlet = it },
            )
        }
        if (showPayment) {
            ChoiceField(
                label = stringResource(R.string.review_payment),
                value = payment,
                options = paymentOptions,
                enabled = editing,
                onSelect = { payment = it },
            )
        }
        if (showPurpose) {
            OutlinedTextField(
                value = purpose,
                onValueChange = { purpose = it },
                readOnly = !editing,
                label = { Text(stringResource(R.string.review_purpose)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }
        if (showCustomer) {
            OutlinedTextField(
                value = customer,
                onValueChange = { customer = it },
                readOnly = !editing,
                label = { Text(stringResource(R.string.review_customer)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }

        lines.forEachIndexed { index, line ->
            if (editing) {
                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                    OutlinedTextField(
                        value = line.description,
                        onValueChange = { lines[index] = line.copy(description = it) },
                        label = { Text(stringResource(R.string.review_description)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                    )
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        OutlinedTextField(
                            value = line.qty,
                            onValueChange = { lines[index] = line.copy(qty = it) },
                            label = { Text(stringResource(R.string.review_qty)) },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                        OutlinedTextField(
                            value = line.amount,
                            onValueChange = { lines[index] = line.copy(amount = it) },
                            label = { Text(stringResource(R.string.review_amount)) },
                            modifier = Modifier.weight(1f),
                            singleLine = true,
                        )
                    }
                }
            } else {
                Row(modifier = Modifier.fillMaxWidth()) {
                    Text(
                        text = line.description.ifBlank { "-" },
                        modifier = Modifier.weight(1f),
                        style = MaterialTheme.typography.bodyMedium,
                    )
                    Text(
                        text = line.amount.ifBlank { "-" },
                        style = MaterialTheme.typography.bodyMedium,
                    )
                }
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
                enabled = !busy && !outOfCredits && !blocked,
                onClick = {
                    busy = true
                    error = null
                    val editedReceipt = receipt.copy(
                        merchant = merchant.trim().ifBlank { null },
                        date = date.trim().ifBlank { null },
                        category = category.trim().ifBlank { null },
                        total = total.trim().toDoubleOrNull(),
                        lineItems = lines.mapIndexed { index, line ->
                            LineItem(
                                description = line.description.trim().ifBlank { null },
                                qty = line.qty.trim().toDoubleOrNull(),
                                unitPrice = receipt.lineItems.getOrNull(index)?.unitPrice,
                                amount = line.amount.trim().toDoubleOrNull(),
                            )
                        },
                    )
                    val correction = CorrectionRequest(
                        runId = scanId,
                        countChanged = false,
                        fields = buildCorrectionFields(
                            receipt = receipt,
                            merchant = merchant,
                            date = date,
                            dateAssumed = dateAssumed,
                            total = total,
                            lines = lines,
                        ),
                    )
                    scope.launch {
                        runCatching { api.logCorrections(token, correction) }
                    }
                    scope.launch {
                        try {
                            val response = api.append(
                                token,
                                AppendRequest(
                                    scanId = scanId,
                                    receipt = editedReceipt,
                                    staff = if (showStaff) staff.trim().ifBlank { null } else null,
                                    outlet = if (showOutlet) outlet.trim().ifBlank { null } else null,
                                    payment = if (showPayment) payment.trim().ifBlank { null } else null,
                                    purpose = if (showPurpose) purpose.trim().ifBlank { null } else null,
                                    customer = if (showCustomer) customer.trim().ifBlank { null } else null,
                                ),
                            )
                            when {
                                response.ok -> onAccepted(response.creditsRemaining)
                                response.code == "NO_CREDITS" -> {
                                    outOfCredits = true
                                    error = R.string.error_no_credits
                                }
                                response.code == "SCAN_ALREADY_SENT" -> onAccepted(null)
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

/** Dropdown when the server sent options, free text otherwise. */
@Composable
private fun ChoiceField(
    label: String,
    value: String,
    options: List<String>,
    enabled: Boolean,
    onSelect: (String) -> Unit,
) {
    if (options.isEmpty()) {
        OutlinedTextField(
            value = value,
            onValueChange = onSelect,
            readOnly = !enabled,
            label = { Text(label) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
        )
        return
    }
    var open by remember { mutableStateOf(false) }
    Box(modifier = Modifier.fillMaxWidth()) {
        OutlinedButton(
            onClick = { open = true },
            enabled = enabled,
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(if (value.isBlank()) label else "$label: $value")
        }
        DropdownMenu(expanded = open, onDismissRequest = { open = false }) {
            options.forEach { option ->
                DropdownMenuItem(
                    text = { Text(option) },
                    onClick = {
                        onSelect(option)
                        open = false
                    },
                )
            }
        }
    }
}

/** Same paths as the web correction record, so telemetry stays comparable. */
private fun buildCorrectionFields(
    receipt: Receipt,
    merchant: String,
    date: String,
    dateAssumed: Boolean,
    total: String,
    lines: SnapshotStateList<LineDraft>,
): List<CorrectionField> {
    val reasonByPath = receipt.flags.associate { it.path to it.reason }
    val fields = mutableListOf<CorrectionField>()

    fun add(path: String, edited: Boolean) {
        val reason = reasonByPath[path]
        fields.add(
            CorrectionField(
                path = path,
                edited = edited,
                flagged = reason != null,
                reasons = if (reason != null) listOf(reason) else emptyList(),
            )
        )
    }

    add("merchant", !sameText(merchant, receipt.merchant))
    // An assumed date comes from the capture time, not from extraction.
    if (!dateAssumed) add("date", !sameText(date, receipt.date))
    add("total", !sameMoney(total, receipt.total))

    val count = maxOf(lines.size, receipt.lineItems.size)
    for (i in 0 until count) {
        val draft = lines.getOrNull(i)
        val original = receipt.lineItems.getOrNull(i)
        add("line_items[$i].description", !sameText(draft?.description.orEmpty(), original?.description))
        add("line_items[$i].qty", !sameMoney(draft?.qty.orEmpty(), original?.qty))
        add("line_items[$i].amount", !sameMoney(draft?.amount.orEmpty(), original?.amount))
    }
    return fields
}

private fun norm(value: String?): String =
    (value ?: "").lowercase().replace(Regex("\\s+"), " ").trim()

private fun sameText(a: String?, b: String?): Boolean = norm(a) == norm(b)

private fun sameMoney(a: String, b: Double?): Boolean {
    val parsed = a.trim().toDoubleOrNull()
    if (parsed == null && b == null) return true
    if (parsed == null || b == null) return false
    return abs(parsed - b) <= 0.005
}
