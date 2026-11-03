// @implements FEAT-102
package link.zippp.app.ui.review

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
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
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppSpace

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
    onAccept: (AppendRequest) -> Unit,
    overlay: Boolean = false,
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
    val showOps = showStaff || showOutlet || showPayment || showPurpose || showCustomer

    Box(
        modifier = if (overlay) {
            Modifier
                .fillMaxSize()
                .background(Color(0x99000000))
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { }
        } else {
            Modifier
                .fillMaxSize()
                .background(ZipppColors.page)
        },
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 430.dp)
                .verticalScroll(rememberScrollState())
                .padding(ZipppSpace.page),
            verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = stringResource(R.string.review_title),
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.titleMedium,
                    color = ZipppColors.ink,
                )
                Text(
                    text = "${stringResource(R.string.scan_balance_label)}: $credits",
                    style = MaterialTheme.typography.bodySmall,
                    color = ZipppColors.muted,
                )
            }

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(ZipppRadius.card))
                    .background(ZipppColors.card)
                    .border(1.dp, ZipppColors.line, RoundedCornerShape(ZipppRadius.card))
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
            ) {
                ReviewField(
                    label = stringResource(R.string.review_merchant),
                    value = merchant,
                    onChange = { merchant = it },
                    editing = editing,
                    textStyle = MaterialTheme.typography.headlineMedium,
                    valueColor = ZipppColors.maroon,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
                ) {
                    ReviewField(
                        label = stringResource(R.string.review_date),
                        value = date,
                        onChange = { date = it },
                        editing = editing,
                        modifier = Modifier.weight(1f),
                    )
                    ReviewField(
                        label = stringResource(R.string.review_total),
                        value = total,
                        onChange = { total = it },
                        editing = editing,
                        modifier = Modifier.weight(1f),
                        textStyle = MaterialTheme.typography.titleMedium
                            .copy(fontFeatureSettings = "tnum"),
                        align = TextAlign.End,
                    )
                }

                if (dateAssumed) {
                    Text(
                        text = stringResource(R.string.review_date_assumed),
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                    )
                }

                ReviewField(
                    label = stringResource(R.string.review_category),
                    value = category,
                    onChange = { category = it },
                    editing = editing,
                )

                if (lines.isNotEmpty()) {
                    Hairline()

                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        lines.forEachIndexed { index, line ->
                            if (editing) {
                                Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                                    ReviewField(
                                        label = stringResource(R.string.review_description),
                                        value = line.description,
                                        onChange = { lines[index] = line.copy(description = it) },
                                        editing = true,
                                    )
                                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                        ReviewField(
                                            label = stringResource(R.string.review_qty),
                                            value = line.qty,
                                            onChange = { lines[index] = line.copy(qty = it) },
                                            editing = true,
                                            modifier = Modifier.weight(1f),
                                        )
                                        ReviewField(
                                            label = stringResource(R.string.review_amount),
                                            value = line.amount,
                                            onChange = { lines[index] = line.copy(amount = it) },
                                            editing = true,
                                            modifier = Modifier.weight(1f),
                                            textStyle = MaterialTheme.typography.bodyMedium
                                                .copy(fontFeatureSettings = "tnum"),
                                            align = TextAlign.End,
                                        )
                                    }
                                }
                            } else {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    verticalAlignment = Alignment.CenterVertically,
                                ) {
                                    Text(
                                        text = line.description.ifBlank { "-" },
                                        modifier = Modifier.weight(1f),
                                        style = MaterialTheme.typography.bodyMedium,
                                        color = ZipppColors.ink,
                                    )
                                    Text(
                                        text = line.amount.ifBlank { "-" },
                                        style = MaterialTheme.typography.bodyMedium
                                            .copy(fontFeatureSettings = "tnum"),
                                        color = ZipppColors.ink,
                                        textAlign = TextAlign.End,
                                    )
                                }
                            }
                            if (index != lines.lastIndex) Hairline()
                        }
                    }
                }

                if (showOps) {
                    Hairline()
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
                        ReviewField(
                            label = stringResource(R.string.review_purpose),
                            value = purpose,
                            onChange = { purpose = it },
                            editing = editing,
                        )
                    }
                    if (showCustomer) {
                        ReviewField(
                            label = stringResource(R.string.review_customer),
                            value = customer,
                            onChange = { customer = it },
                            editing = editing,
                        )
                    }
                }

                if (hardFlags.isNotEmpty()) {
                    Hairline()
                    Text(
                        text = stringResource(R.string.review_hard_flags),
                        color = ZipppColors.danger,
                        style = MaterialTheme.typography.bodySmall,
                        fontWeight = FontWeight.Medium,
                    )
                    if (unresolved.isNotEmpty() && !acknowledged) {
                        OutlinedButton(
                            onClick = { acknowledged = true },
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(ZipppRadius.pill),
                            border = BorderStroke(1.dp, ZipppColors.line),
                            colors = ButtonDefaults.outlinedButtonColors(
                                contentColor = ZipppColors.ink,
                            ),
                            contentPadding = PaddingValues(
                                horizontal = 16.dp,
                                vertical = 10.dp,
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.review_acknowledge),
                                maxLines = 1,
                            )
                        }
                    } else if (acknowledged) {
                        Text(
                            text = stringResource(R.string.review_acknowledge),
                            style = MaterialTheme.typography.bodySmall,
                            color = ZipppColors.muted,
                        )
                    }
                }

                error?.let {
                    Text(
                        text = stringResource(it),
                        color = ZipppColors.danger,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }

                if (outOfCredits) {
                    Text(
                        text = stringResource(R.string.no_credits_message),
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                    )
                }

                Hairline()

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Button(
                        enabled = !blocked,
                        onClick = {
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
                            onAccept(
                                AppendRequest(
                                    scanId = scanId,
                                    receipt = editedReceipt,
                                    staff = if (showStaff) staff.trim().ifBlank { null } else null,
                                    outlet = if (showOutlet) outlet.trim().ifBlank { null } else null,
                                    payment = if (showPayment) payment.trim().ifBlank { null } else null,
                                    purpose = if (showPurpose) purpose.trim().ifBlank { null } else null,
                                    customer = if (showCustomer) customer.trim().ifBlank { null } else null,
                                )
                            )
                        },
                        modifier = Modifier.weight(1.4f),
                        shape = RoundedCornerShape(ZipppRadius.pill),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ZipppColors.orange,
                            contentColor = ZipppColors.ink,
                            disabledContainerColor = ZipppColors.mist,
                            disabledContentColor = ZipppColors.muted,
                        ),
                        contentPadding = PaddingValues(horizontal = 12.dp, vertical = 10.dp),
                    ) {
                        if (busy) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = ZipppColors.ink,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text = stringResource(R.string.review_accept),
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                            )
                        }
                    }
                    OutlinedButton(
                        onClick = { editing = !editing },
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(ZipppRadius.pill),
                        border = BorderStroke(1.dp, ZipppColors.line),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = ZipppColors.ink,
                            disabledContentColor = ZipppColors.muted,
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.review_edit),
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                        )
                    }
                    OutlinedButton(
                        onClick = onDiscard,
                        enabled = !busy,
                        modifier = Modifier.weight(1f),
                        shape = RoundedCornerShape(ZipppRadius.pill),
                        border = BorderStroke(1.dp, ZipppColors.line),
                        colors = ButtonDefaults.outlinedButtonColors(
                            contentColor = ZipppColors.danger,
                            disabledContentColor = ZipppColors.muted,
                        ),
                        contentPadding = PaddingValues(horizontal = 8.dp, vertical = 10.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.review_discard),
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                        )
                    }
                }

                if (outOfCredits) {
                    Button(
                        onClick = onDiscard,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(ZipppRadius.pill),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ZipppColors.orange,
                            contentColor = ZipppColors.ink,
                        ),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp),
                    ) {
                        Text(
                            text = stringResource(R.string.no_credits_refresh),
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
}

/** Muted 12sp label above every value, like the web card's field labels. */
@Composable
private fun ReviewLabel(text: String) {
    Text(
        text = text,
        style = MaterialTheme.typography.bodySmall,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 12.sp,
        color = ZipppColors.muted,
    )
}

/** Hairline rule in the brand line colour. */
@Composable
private fun Hairline() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(ZipppColors.line)
    )
}

/**
 * Label above value. Read-only values render as plain ink text; the editing
 * toggle swaps the same value into a bordered input, so nothing but the
 * affordance changes.
 */
@Composable
private fun ReviewField(
    label: String,
    value: String,
    onChange: (String) -> Unit,
    editing: Boolean,
    modifier: Modifier = Modifier,
    textStyle: TextStyle = MaterialTheme.typography.bodyMedium,
    valueColor: Color = ZipppColors.ink,
    align: TextAlign = TextAlign.Start,
) {
    Column(
        modifier = modifier,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        ReviewLabel(label)
        if (editing) {
            BasicTextField(
                value = value,
                onValueChange = onChange,
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(ZipppRadius.card))
                    .background(ZipppColors.card)
                    .border(1.dp, ZipppColors.line, RoundedCornerShape(ZipppRadius.card))
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                textStyle = textStyle.copy(color = valueColor, textAlign = align),
                singleLine = true,
                cursorBrush = SolidColor(ZipppColors.orange),
            )
        } else {
            Text(
                text = value.ifBlank { "-" },
                modifier = Modifier.fillMaxWidth(),
                style = textStyle,
                color = valueColor,
                textAlign = align,
            )
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
        ReviewField(
            label = label,
            value = value,
            onChange = onSelect,
            editing = enabled,
        )
        return
    }
    var open by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier.fillMaxWidth(),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        ReviewLabel(label)
        Box(modifier = Modifier.fillMaxWidth()) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(ZipppRadius.card))
                    .background(ZipppColors.card)
                    .border(1.dp, ZipppColors.line, RoundedCornerShape(ZipppRadius.card))
                    .clickable(enabled = enabled) { open = true }
                    .padding(horizontal = 8.dp, vertical = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    text = value.ifBlank { "-" },
                    modifier = Modifier.weight(1f),
                    style = MaterialTheme.typography.bodyMedium,
                    color = if (enabled) ZipppColors.ink else ZipppColors.muted,
                )
                Text(
                    text = "▾",
                    style = MaterialTheme.typography.bodySmall,
                    color = ZipppColors.muted,
                )
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
