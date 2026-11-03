// @implements FEAT-116
package link.zippp.app.ui.space

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
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
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
import link.zippp.app.data.LedgerItem
import link.zippp.app.data.LedgerRequest

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

    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Text(
            text = stringResource(R.string.space_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
        )

        if (spaces.size > 1) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                spaces.forEach { (id, label) ->
                    TextButton(onClick = {
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
                    }) {
                        Text(if (id == selectedId) "[$label]" else label)
                    }
                }
            }
        }

        Text(
            text = stringResource(R.string.space_items_title),
            style = MaterialTheme.typography.titleMedium,
        )

        if (items.isEmpty()) {
            Text(
                text = stringResource(R.string.space_items_empty),
                style = MaterialTheme.typography.bodySmall,
            )
        } else {
            items.forEach { item ->
                Row(modifier = Modifier.fillMaxWidth()) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(item.name, style = MaterialTheme.typography.bodyMedium)
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
                        )
                        item.note?.let {
                            Text(it, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                    TextButton(onClick = { editItem(item) }) {
                        Text(stringResource(R.string.space_edit))
                    }
                    TextButton(
                        onClick = {
                            val spaceId = selectedId ?: return@TextButton
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
                    ) {
                        Text(stringResource(R.string.space_archive))
                    }
                }
            }
        }

        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            TextButton(onClick = { kind = "asset" }) {
                Text(stringResource(R.string.space_asset))
            }
            TextButton(onClick = { kind = "goal" }) {
                Text(stringResource(R.string.space_goal))
            }
        }

        OutlinedTextField(
            value = name,
            onValueChange = { name = it },
            label = { Text(stringResource(R.string.space_name)) },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
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
        )
        if (kind == "goal") {
            OutlinedTextField(
                value = progress,
                onValueChange = { progress = it },
                label = { Text(stringResource(R.string.space_progress)) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }
        OutlinedTextField(
            value = note,
            onValueChange = { note = it },
            label = { Text(stringResource(R.string.space_note)) },
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

        Spacer(Modifier.height(4.dp))

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
            modifier = Modifier.fillMaxWidth(),
        ) {
            if (busy) CircularProgressIndicator(modifier = Modifier.height(18.dp))
            else Text(
                stringResource(
                    if (editingId == null) R.string.space_add else R.string.space_save
                )
            )
        }

        OutlinedButton(
            onClick = {
                if (editingId != null) resetForm() else onBack()
            },
            modifier = Modifier.fillMaxWidth(),
        ) {
            Text(
                stringResource(
                    if (editingId == null) R.string.settings_back else R.string.space_cancel
                )
            )
        }
    }
}

private fun money(value: Double): String =
    if (value % 1.0 == 0.0) "%,.0f".format(value) else "%,.2f".format(value)
