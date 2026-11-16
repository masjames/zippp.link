// @implements FEAT-102, FEAT-118
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
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import link.zippp.app.ui.theme.ZipppButton
import link.zippp.app.ui.theme.ZipppButtonKind
import link.zippp.app.ui.theme.ZipppType
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
    index: Int,
    count: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onMinimize: () -> Unit,
    onDiscard: () -> Unit,
    onAccept: (AppendRequest) -> Unit,
    onSessionLost: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var workspace by remember { mutableStateOf<Workspace?>(null) }
    var merchant by remember(receipt) { mutableStateOf(receipt.merchant.orEmpty()) }
    var category by remember(receipt) { mutableStateOf(receipt.category.orEmpty()) }
    var total by remember(receipt) { mutableStateOf(receipt.total?.toString().orEmpty()) }
    var date by remember(receipt) { mutableStateOf(receipt.date.orEmpty()) }
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
    val editing = true
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
        if (!sameText(date, receipt.date)) add("date")
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

    BoxWithConstraints(
        modifier = Modifier
            .fillMaxSize()
            .background(Color(0x73000000))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onMinimize,
            ),
        contentAlignment = Alignment.BottomCenter,
    ) {
        val maxSheetHeight = maxHeight * SHEET_MAX_HEIGHT
        Column(
            modifier = Modifier
                .widthIn(max = 430.dp)
                .fillMaxWidth()
                .heightIn(max = maxSheetHeight)
                .clip(RoundedCornerShape(topStart = ZipppRadius.phone, topEnd = ZipppRadius.phone))
                .background(ZipppColors.card)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                ) { },
        ) {
            SheetHeader(
                index = index,
                count = count,
                onPrev = onPrev,
                onNext = onNext,
                onMinimize = onMinimize,
            )
            Hairline()

            Column(
                modifier = Modifier
                    .weight(1f, fill = false)
                    .verticalScroll(rememberScrollState())
                    .padding(12.dp),
                verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
            ) {
                ReviewField(
                    label = stringResource(R.string.review_merchant),
                    value = merchant,
                    onChange = { merchant = it },
                    editing = editing,
                    textStyle = ZipppType.h3,
                    valueColor = ZipppColors.ink,
                )

                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
                ) {
                    ReviewField(
                        label = stringResource(R.string.review_category),
                        value = category,
                        onChange = { category = it },
                        editing = editing,
                        modifier = Modifier.weight(1f),
                    )
                    ReviewField(
                        label = stringResource(R.string.review_date),
                        value = date,
                        onChange = { date = it },
                        editing = editing,
                        modifier = Modifier.weight(1f),
                    )
                }

                ReviewField(
                    label = stringResource(R.string.review_total),
                    value = total,
                    onChange = { total = it },
                    editing = editing,
                    textStyle = ZipppType.h3.copy(fontFeatureSettings = "tnum"),
                    align = TextAlign.End,
                )

                if (lines.isNotEmpty()) {
                    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                        lines.forEachIndexed { lineIndex, line ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .border(
                                        1.dp,
                                        ZipppColors.line,
                                        RoundedCornerShape(ZipppRadius.sheet),
                                    )
                                    .padding(6.dp),
                                verticalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                ReviewField(
                                    label = stringResource(R.string.review_description),
                                    value = line.description,
                                    onChange = { lines[lineIndex] = line.copy(description = it) },
                                    editing = true,
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    ReviewField(
                                        label = stringResource(R.string.review_qty),
                                        value = line.qty,
                                        onChange = { lines[lineIndex] = line.copy(qty = it) },
                                        editing = true,
                                        modifier = Modifier.weight(1f),
                                    )
                                    ReviewField(
                                        label = stringResource(R.string.review_amount),
                                        value = line.amount,
                                        onChange = { lines[lineIndex] = line.copy(amount = it) },
                                        editing = true,
                                        modifier = Modifier.weight(1f),
                                        textStyle = ZipppType.body.copy(fontFeatureSettings = "tnum"),
                                        align = TextAlign.End,
                                    )
                                }
                            }
                        }
                    }
                }

                if (showOps) {
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
                    Text(
                        text = stringResource(R.string.review_hard_flags),
                        color = ZipppColors.danger,
                        style = ZipppType.smallStrong,
                    )
                    if (unresolved.isNotEmpty() && !acknowledged) {
                        ZipppButton(
                            text = stringResource(R.string.review_acknowledge),
                            onClick = { acknowledged = true },
                            modifier = Modifier.fillMaxWidth(),
                            kind = ZipppButtonKind.Outline,
                        )
                    } else if (acknowledged) {
                        Text(
                            text = stringResource(R.string.review_acknowledge),
                            style = ZipppType.small,
                            color = ZipppColors.muted,
                        )
                    }
                }

                error?.let {
                    Text(
                        text = stringResource(it),
                        color = ZipppColors.danger,
                        style = ZipppType.small,
                    )
                }

                if (outOfCredits) {
                    Text(
                        text = stringResource(R.string.no_credits_message),
                        style = ZipppType.small,
                        color = ZipppColors.muted,
                    )
                }
            }

            Hairline()
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 12.dp, vertical = 8.dp),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                ZipppButton(
                    text = stringResource(R.string.review_accept),
                    onClick = {
                        error = null
                        val editedReceipt = receipt.copy(
                            merchant = merchant.trim().ifBlank { null },
                            date = date.trim().ifBlank { null },
                            category = category.trim().ifBlank { null },
                            total = total.trim().toDoubleOrNull(),
                            lineItems = lines.mapIndexed { i, line ->
                                LineItem(
                                    description = line.description.trim().ifBlank { null },
                                    qty = line.qty.trim().toDoubleOrNull(),
                                    unitPrice = receipt.lineItems.getOrNull(i)?.unitPrice,
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
                    modifier = Modifier.weight(1f),
                    enabled = !blocked && !busy,
                )
                ZipppButton(
                    text = if (outOfCredits) {
                        stringResource(R.string.no_credits_refresh)
                    } else {
                        stringResource(R.string.review_discard)
                    },
                    onClick = onDiscard,
                    kind = ZipppButtonKind.Danger,
                    enabled = !busy,
                    modifier = Modifier.widthIn(min = 112.dp),
                )
            }
        }
    }
}

/** Minimize pill on the left, previous / index / next on the right. */
@Composable
private fun SheetHeader(
    index: Int,
    count: Int,
    onPrev: () -> Unit,
    onNext: () -> Unit,
    onMinimize: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            text = "↓ " + stringResource(R.string.review_minimize),
            modifier = Modifier
                .clip(RoundedCornerShape(ZipppRadius.pill))
                .background(ZipppColors.mist)
                .clickable(onClick = onMinimize)
                .padding(horizontal = 12.dp, vertical = 6.dp),
            style = ZipppType.smallStrong,
            color = ZipppColors.ink,
            maxLines = 1,
        )
        Spacer(Modifier.weight(1f))
        SheetStep(
            glyph = "‹",
            description = stringResource(R.string.review_prev),
            enabled = index > 0,
            onClick = onPrev,
        )
        Text(
            text = "${index + 1} / $count",
            modifier = Modifier.widthIn(min = 72.dp),
            style = ZipppType.smallStrong,
            color = ZipppColors.muted,
            textAlign = TextAlign.Center,
            maxLines = 1,
        )
        SheetStep(
            glyph = "›",
            description = stringResource(R.string.review_next),
            enabled = index < count - 1,
            onClick = onNext,
        )
    }
}

@Composable
private fun SheetStep(
    glyph: String,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(32.dp)
            .clip(RoundedCornerShape(ZipppRadius.pill))
            .alpha(if (enabled) 1f else 0.3f)
            .clickable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Text(text = glyph, style = ZipppType.h3, color = ZipppColors.ink)
    }
}

private const val SHEET_MAX_HEIGHT = 0.88f

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
    add("date", !sameText(date, receipt.date))
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
