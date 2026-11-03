package link.zippp.app.ui.batch

import androidx.compose.runtime.Immutable
import androidx.compose.runtime.Stable
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.snapshots.SnapshotStateList
import java.util.UUID
import link.zippp.app.data.Receipt

/**
 * One captured receipt waiting in the local send queue, mirroring the web
 * BatchItem subset that matters before the row reaches the sheet.
 */
@Immutable
data class BatchDraft(
    val id: String,
    val scanId: String,
    val receipt: Receipt,
    val status: String = STATUS_PENDING,
    val error: String? = null,
) {
    companion object {
        const val STATUS_PENDING = "pending"
        const val STATUS_ACCEPTED = "accepted"
        const val STATUS_SENDING = "sending"
        const val STATUS_READY = "ready"
    }
}

/**
 * Compose state holder for the draft batch. List order is capture order; the
 * web sends accepted receipts one at a time, so senders walk [items] in order
 * and skip anything whose [BatchDraft.status] is not pending.
 *
 * Construct it directly: `val batch = remember { BatchStore() }`.
 */
@Stable
class BatchStore(initial: List<BatchDraft> = emptyList()) {
    val items: SnapshotStateList<BatchDraft> = mutableStateListOf<BatchDraft>().apply {
        addAll(initial)
    }

    val pendingCount: Int
        get() = items.count { it.status == BatchDraft.STATUS_PENDING }

    val acceptedCount: Int
        get() = items.count { it.status == BatchDraft.STATUS_ACCEPTED }

    /** Appends a captured receipt and returns the stored draft. */
    fun add(receipt: Receipt, scanId: String): BatchDraft {
        val draft = BatchDraft(
            id = UUID.randomUUID().toString(),
            scanId = scanId,
            receipt = receipt,
        )
        items.add(draft)
        return draft
    }

    fun markAccepted(id: String) {
        update(id) { it.copy(status = BatchDraft.STATUS_ACCEPTED, error = null) }
    }

    fun markSending(id: String) {
        update(id) { it.copy(status = BatchDraft.STATUS_SENDING, error = null) }
    }

    fun markReady(id: String, message: String?) {
        update(id) { it.copy(status = BatchDraft.STATUS_READY, error = message) }
    }

    fun markError(id: String, message: String) {
        markReady(id, message)
    }

    fun remove(id: String) {
        items.removeAll { it.id == id }
    }

    fun clear() {
        items.clear()
    }

    fun find(id: String): BatchDraft? = items.firstOrNull { it.id == id }

    private inline fun update(id: String, transform: (BatchDraft) -> BatchDraft) {
        val index = items.indexOfFirst { it.id == id }
        if (index >= 0) items[index] = transform(items[index])
    }
}
