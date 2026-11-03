// @implements FEAT-116
package link.zippp.app.ui.space

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.RowScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.LedgerItem
import link.zippp.app.data.LedgerRequest
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppShell
import link.zippp.app.ui.theme.ZipppSpace

@Composable
fun SpaceScreen(
    api: ApiClient,
    token: String,
    onBack: () -> Unit,
    onSessionLost: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var spaces by remember { mutableStateOf<List<Pair<String, String>>>(emptyList()) }
    var selectedId by remember { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<LedgerItem>>(emptyList()) }
    var kind by remember { mutableStateOf("asset") }
    var name by remember { mutableStateOf("") }
    var amount by remember { mutableStateOf("") }
    var progress by remember { mutableStateOf("") }
    var note by remember { mutableStateOf("") }
    var editingId by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }

    suspend fun reload(spaceId: String) {
        items = api.listLedger(token, spaceId).items
    }

    LaunchedEffect(Unit) {
        try {
            spaces = api.listSpaces(token).spaces.map { it.id to it.displayName }
            val first = spaces.firstOrNull()?.first
            if (first != null) {
                selectedId = first
                reload(first)
            }
        } catch (e: ApiException) {
            if (e.code == "DEVICE_REVOKED") onSessionLost() else error = R.string.space_error
        } catch (_: Exception) {
            error = R.string.space_error
        }
    }

    fun resetForm() {
        editingId = null
        name = ""
        amount = ""
        progress = ""
        note = ""
        kind = "asset"
    }

    fun editItem(item: LedgerItem) {
        editingId = item.id
        kind = item.kind
        name = item.name
        amount = item.amount.toString()
        progress = item.progress?.toString().orEmpty()
        note = item.note.orEmpty()
    }

    ZipppShell {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
        ) {
            Text(
                text = stringResource(R.string.space_title),
                style = MaterialTheme.typography.headlineLarge,
                color = ZipppColors.ink,
            )

            if (spaces.size > 1) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    spaces.forEach { (id, label) ->
                        SpacePill(
                            label = label,
                            selected = id == selectedId,
                            onClick = {
                                selectedId = id
                                error = null
                                scope.launch {
                                    try {
                                        reload(id)
                                    } catch (e: ApiException) {
                                        if (e.code == "DEVICE_REVOKED") onSessionLost() else error = R.string.space_error
                                    } catch (_: Exception) {
                                        error = R.string.space_error
                                    }
                                }
                            },
                        )
                    }
                }
            }

            SpaceCard {
                Text(
                    text = stringResource(R.string.space_items_title),
                    style = MaterialTheme.typography.titleMedium,
                    color = ZipppColors.ink,
                )

                if (items.isEmpty()) {
                    Text(
                        text = stringResource(R.string.space_items_empty),
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                    )
                } else {
                    items.forEachIndexed { index, item ->
                        if (index > 0) LineDivider()
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(vertical = 8.dp),
                            horizontalArrangement = Arrangement.spacedBy(12.dp),
                            verticalAlignment = Alignment.Top,
                        ) {
                            Column(
                                modifier = Modifier.weight(1f),
                                verticalArrangement = Arrangement.spacedBy(2.dp),
                            ) {
                                Text(
                                    text = item.name,
                                    style = MaterialTheme.typography.bodyMedium,
                                    fontWeight = FontWeight.SemiBold,
                                    color = ZipppColors.ink,
                                )
                                Text(
                                    text = if (item.kind == "goal") {
                                        stringResource(R.string.space_goal_progress)
                                            .replace("{progress}", money(item.progress ?: 0.0))
                                            .replace("{target}", money(item.amount))
                                    } else {
                                        stringResource(R.string.space_value)
                                            .replace("{amount}", money(item.amount))
                                    },
                                    style = MaterialTheme.typography.bodySmall,
                                    color = ZipppColors.muted,
                                )
                                item.note?.let {
                                    Text(
                                        text = it,
                                        style = MaterialTheme.typography.bodySmall,
                                        color = ZipppColors.muted,
                                    )
                                }
                            }
                            Column(
                                horizontalAlignment = Alignment.End,
                                verticalArrangement = Arrangement.spacedBy(2.dp),
                            ) {
                                Text(
                                    text = stringResource(R.string.space_edit),
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (busy) ZipppColors.orange.copy(alpha = 0.5f) else ZipppColors.orange,
                                    modifier = Modifier
                                        .padding(vertical = 2.dp)
                                        .clickable(enabled = !busy) { editItem(item) },
                                )
                                Text(
                                    text = stringResource(R.string.space_archive),
                                    style = MaterialTheme.typography.bodySmall,
                                    fontWeight = FontWeight.SemiBold,
                                    color = if (busy) ZipppColors.danger.copy(alpha = 0.5f) else ZipppColors.danger,
                                    modifier = Modifier
                                        .padding(vertical = 2.dp)
                                        .clickable(enabled = !busy) {
                                            val spaceId = selectedId ?: return@clickable
                                            busy = true
                                            error = null
                                            scope.launch {
                                                try {
                                                    api.archiveLedger(token, spaceId, item.id)
                                                    if (editingId == item.id) resetForm()
                                                    reload(spaceId)
                                                } catch (e: ApiException) {
                                                    if (e.code == "DEVICE_REVOKED") onSessionLost() else error = R.string.space_error
                                                } catch (_: Exception) {
                                                    error = R.string.space_error
                                                } finally {
                                                    busy = false
                                                }
                                            }
                                        },
                                )
                            }
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(ZipppColors.page, RoundedCornerShape(ZipppRadius.panel))
                        .padding(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        KindPill(
                            label = stringResource(R.string.space_asset),
                            selected = kind == "asset",
                            onClick = { kind = "asset" },
                        )
                        KindPill(
                            label = stringResource(R.string.space_goal),
                            selected = kind == "goal",
                            onClick = { kind = "goal" },
                        )
                    }

                    OutlinedTextField(
                        value = name,
                        onValueChange = { name = it },
                        label = { Text(stringResource(R.string.space_name)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(ZipppRadius.card),
                        colors = zipppFieldColors(),
                    )
                    OutlinedTextField(
                        value = amount,
                        onValueChange = { amount = it },
                        label = {
                            Text(
                                stringResource(
                                    if (kind == "goal") R.string.space_target else R.string.space_amount
                                )
                            )
                        },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(ZipppRadius.card),
                        colors = zipppFieldColors(),
                    )
                    if (kind == "goal") {
                        OutlinedTextField(
                            value = progress,
                            onValueChange = { progress = it },
                            label = { Text(stringResource(R.string.space_progress)) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            shape = RoundedCornerShape(ZipppRadius.card),
                            colors = zipppFieldColors(),
                        )
                    }
                    OutlinedTextField(
                        value = note,
                        onValueChange = { note = it },
                        label = { Text(stringResource(R.string.space_note)) },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        shape = RoundedCornerShape(ZipppRadius.card),
                        colors = zipppFieldColors(),
                    )

                    error?.let {
                        Text(
                            text = stringResource(it),
                            color = ZipppColors.danger,
                            style = MaterialTheme.typography.bodySmall,
                        )
                    }

                    Button(
                        enabled = !busy && name.isNotBlank() && amount.toDoubleOrNull() != null,
                        onClick = {
                            val spaceId = selectedId ?: return@Button
                            val value = amount.toDoubleOrNull() ?: return@Button
                            busy = true
                            error = null
                            scope.launch {
                                try {
                                    val response = api.saveLedger(
                                        token = token,
                                        spaceId = spaceId,
                                        body = LedgerRequest(
                                            kind = kind,
                                            name = name.trim(),
                                            amount = value,
                                            progress = if (kind == "goal") {
                                                progress.toDoubleOrNull() ?: 0.0
                                            } else {
                                                null
                                            },
                                            note = note.trim().ifBlank { null },
                                        ),
                                        itemId = editingId,
                                    )
                                    if (response.ok) {
                                        resetForm()
                                        reload(spaceId)
                                    } else {
                                        error = R.string.space_error
                                    }
                                } catch (e: ApiException) {
                                    if (e.code == "DEVICE_REVOKED") onSessionLost() else error = R.string.space_error
                                } catch (_: Exception) {
                                    error = R.string.space_error
                                } finally {
                                    busy = false
                                }
                            }
                        },
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(44.dp),
                        shape = RoundedCornerShape(ZipppRadius.pill),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ZipppColors.orange,
                            contentColor = ZipppColors.ink,
                            disabledContainerColor = ZipppColors.orange.copy(alpha = 0.5f),
                            disabledContentColor = ZipppColors.ink.copy(alpha = 0.5f),
                        ),
                        elevation = ButtonDefaults.buttonElevation(0.dp),
                        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                    ) {
                        if (busy) {
                            CircularProgressIndicator(
                                modifier = Modifier.size(18.dp),
                                color = ZipppColors.ink,
                                strokeWidth = 2.dp,
                            )
                        } else {
                            Text(
                                text = stringResource(
                                    if (editingId == null) R.string.space_add else R.string.space_save
                                ),
                                style = MaterialTheme.typography.bodyMedium,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }

            Button(
                onClick = {
                    if (editingId != null) resetForm() else onBack()
                },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(44.dp),
                shape = RoundedCornerShape(ZipppRadius.pill),
                colors = ButtonDefaults.buttonColors(
                    containerColor = ZipppColors.mist,
                    contentColor = ZipppColors.ink,
                    disabledContainerColor = ZipppColors.mist.copy(alpha = 0.5f),
                    disabledContentColor = ZipppColors.ink.copy(alpha = 0.5f),
                ),
                elevation = ButtonDefaults.buttonElevation(0.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
            ) {
                Text(
                    text = stringResource(
                        if (editingId == null) R.string.settings_back else R.string.space_cancel
                    ),
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }
    }
}

/** White section card with an 8dp radius and a hairline border. */
@Composable
private fun SpaceCard(content: @Composable ColumnScope.() -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(ZipppColors.card, RoundedCornerShape(ZipppRadius.card))
            .border(
                width = 1.dp,
                color = ZipppColors.line,
                shape = RoundedCornerShape(ZipppRadius.card),
            )
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = content,
    )
}

/** Space selector pill: orange while selected, bordered white otherwise. */
@Composable
private fun SpacePill(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(ZipppRadius.pill)
    Box(
        modifier = Modifier
            .background(
                color = if (selected) ZipppColors.orange else ZipppColors.card,
                shape = shape,
            )
            .border(
                width = if (selected) 0.dp else 1.dp,
                color = if (selected) Color.Transparent else ZipppColors.line,
                shape = shape,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) ZipppColors.ink else ZipppColors.muted,
        )
    }
}

/** Asset/Goal toggle pill, mirroring the web tabs. */
@Composable
private fun RowScope.KindPill(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(ZipppRadius.pill)
    Box(
        modifier = Modifier
            .weight(1f)
            .background(
                color = if (selected) ZipppColors.mist else ZipppColors.card,
                shape = shape,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            text = label,
            style = MaterialTheme.typography.bodySmall,
            fontWeight = FontWeight.SemiBold,
            color = if (selected) ZipppColors.ink else ZipppColors.muted,
            textAlign = TextAlign.Center,
        )
    }
}

@Composable
private fun LineDivider() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(1.dp)
            .background(ZipppColors.line),
    )
}

/** Squared, line-bordered field on the page tone with muted labels. */
@Composable
private fun zipppFieldColors() = OutlinedTextFieldDefaults.colors(
    focusedContainerColor = ZipppColors.page,
    unfocusedContainerColor = ZipppColors.page,
    focusedBorderColor = ZipppColors.line,
    unfocusedBorderColor = ZipppColors.line,
    focusedTextColor = ZipppColors.ink,
    unfocusedTextColor = ZipppColors.ink,
    cursorColor = ZipppColors.ink,
    focusedLabelColor = ZipppColors.muted,
    unfocusedLabelColor = ZipppColors.muted,
)

private fun money(value: Double): String =
    if (value % 1.0 == 0.0) "%,.0f".format(value) else "%,.2f".format(value)
