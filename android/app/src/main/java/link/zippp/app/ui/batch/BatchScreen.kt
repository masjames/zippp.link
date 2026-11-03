package link.zippp.app.ui.batch

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import java.text.NumberFormat
import link.zippp.app.R
import link.zippp.app.data.Receipt
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppShell
import link.zippp.app.ui.theme.ZipppSpace

/**
 * The captured-receipt batch: every draft kept locally with its queue status.
 * Visual twin of the web review queue, without owning any network work.
 */
@Composable
fun BatchScreen(
    store: BatchStore,
    onCaptureMore: () -> Unit,
    onOpenDraft: (String) -> Unit,
    onClose: () -> Unit,
) {
    ZipppShell {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = stringResource(R.string.queue_title),
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = ZipppColors.ink,
                modifier = Modifier.weight(1f),
            )
            TextButton(
                onClick = onClose,
                colors = ButtonDefaults.textButtonColors(contentColor = ZipppColors.muted),
            ) {
                Text(
                    text = stringResource(R.string.settings_back),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            StatusChip(
                text = "${stringResource(R.string.queue_title)} ${store.pendingCount}",
                background = ZipppColors.peach,
                foreground = ZipppColors.maroon,
            )
            StatusChip(
                text = "${stringResource(R.string.queue_sent)} ${store.acceptedCount}",
                background = ZipppColors.mist,
                foreground = ZipppColors.ink,
            )
        }

        if (store.items.isEmpty()) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
                ) {
                    Text(
                        text = stringResource(R.string.queue_empty),
                        style = MaterialTheme.typography.bodyMedium,
                        color = ZipppColors.muted,
                    )
                }
            }
        } else {
            LazyColumn(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                verticalArrangement = Arrangement.spacedBy(8.dp),
                contentPadding = PaddingValues(vertical = 2.dp),
            ) {
                items(
                    items = store.items,
                    key = { draft -> draft.id },
                ) { draft ->
                    DraftRow(
                        draft = draft,
                        onOpen = { onOpenDraft(draft.id) },
                    )
                }
            }
        }

        Button(
            onClick = onCaptureMore,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(ZipppRadius.pill),
            colors = ButtonDefaults.buttonColors(
                containerColor = ZipppColors.orange,
                contentColor = ZipppColors.ink,
            ),
            contentPadding = PaddingValues(vertical = 14.dp),
        ) {
            Text(
                text = stringResource(R.string.queue_capture_more),
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
            )
        }
    }
}

@Composable
private fun DraftRow(
    draft: BatchDraft,
    onOpen: () -> Unit,
) {
    val pending = draft.status == BatchDraft.STATUS_PENDING
    val receipt = draft.receipt
    val merchant = receipt.merchant?.trim().takeUnless { it.isNullOrEmpty() }
        ?: stringResource(R.string.review_merchant)
    val date = receipt.date?.trim()?.takeIf { it.isNotEmpty() }
    val total = totalText(receipt)

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(ZipppRadius.panel))
            .background(ZipppColors.card)
            .border(
                border = BorderStroke(
                    width = 1.dp,
                    color = if (pending) ZipppColors.line else ZipppColors.mist,
                ),
                shape = RoundedCornerShape(ZipppRadius.panel),
            )
            .clickable(enabled = pending, onClick = onOpen)
            .padding(ZipppSpace.gap),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Column(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(2.dp),
            ) {
                Text(
                    text = merchant,
                    style = MaterialTheme.typography.titleMedium,
                    color = if (pending) ZipppColors.ink else ZipppColors.muted,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                date?.let {
                    Text(
                        text = it,
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            StatusChip(
                text = if (pending) {
                    stringResource(R.string.queue_title)
                } else {
                    stringResource(R.string.queue_sent)
                },
                background = if (pending) ZipppColors.peach else ZipppColors.mist,
                foreground = if (pending) ZipppColors.maroon else ZipppColors.ink,
            )
        }

        if (total != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.End,
            ) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        text = stringResource(R.string.review_total),
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                    )
                    Text(
                        text = total,
                        style = MaterialTheme.typography.titleMedium,
                        fontWeight = FontWeight.Bold,
                        color = ZipppColors.ink,
                    )
                }
            }
        }

        draft.error?.takeIf { it.isNotBlank() }?.let { message ->
            Text(
                text = message,
                style = MaterialTheme.typography.bodySmall,
                color = ZipppColors.danger,
            )
        }
    }
}

@Composable
private fun StatusChip(
    text: String,
    background: Color,
    foreground: Color,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(ZipppRadius.pill))
            .background(background)
            .padding(horizontal = 10.dp, vertical = 4.dp),
    ) {
        Text(
            text = text,
            style = MaterialTheme.typography.labelSmall,
            fontWeight = FontWeight.SemiBold,
            color = foreground,
            maxLines = 1,
        )
    }
}

/** Amount in the receipt's own currency code; never invents a symbol. */
private fun totalText(receipt: Receipt): String? {
    val total = receipt.total ?: return null
    val format = NumberFormat.getNumberInstance()
    format.maximumFractionDigits = if (total % 1.0 == 0.0) 0 else 2
    format.minimumFractionDigits = 0
    val amount = format.format(total)
    val currency = receipt.currency?.trim()?.takeIf { it.isNotEmpty() }
    return if (currency == null) amount else "$currency $amount"
}
