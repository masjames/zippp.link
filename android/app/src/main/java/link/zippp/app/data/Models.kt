package link.zippp.app.data

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

@Serializable
data class PairClaimResponse(
    val ok: Boolean = false,
    val token: String? = null,
    val code: String? = null,
    val expires_at: Long? = null,
    val user: PairUser? = null,
    val workspace: Workspace? = null,
    val device: Device? = null,
)

@Serializable
data class MagicLinkRequestResponse(
    val ok: Boolean = false,
    val code: String? = null,
)

@Serializable
data class PairUser(
    val email: String? = null,
    val credits: Int = 0,
    @SerialName("billing_configured") val billingConfigured: Boolean = false,
)

@Serializable
data class Workspace(
    val ready: Boolean = false,
    @SerialName("spreadsheet_name") val spreadsheetName: String? = null,
    @SerialName("template_id") val templateId: String? = null,
    val headers: List<String> = emptyList(),
    @SerialName("column_map") val columnMap: Map<String, String> = emptyMap(),
    @SerialName("staff_names") val staffNames: List<String> = emptyList(),
    val outlets: List<String> = emptyList(),
    @SerialName("default_outlet") val defaultOutlet: String? = null,
    @SerialName("photo_proof") val photoProof: Boolean = false,
    @SerialName("payment_options") val paymentOptions: List<String> = emptyList(),
)

@Serializable
data class MeResponse(
    val ok: Boolean = false,
    val workspace: Workspace? = null,
)

@Serializable
data class CorrectionField(
    val path: String,
    val edited: Boolean,
    val flagged: Boolean,
    val reasons: List<String> = emptyList(),
)

@Serializable
data class CorrectionRequest(
    val runId: String? = null,
    val countChanged: Boolean = false,
    val fields: List<CorrectionField> = emptyList(),
)

@Serializable
data class Device(
    val id: String? = null,
    val name: String? = null,
)

@Serializable
data class SpaceSummary(
    val id: String = "",
    @SerialName("display_name") val displayName: String = "",
    val role: String = "member",
    @SerialName("member_count") val memberCount: Int = 1,
)

@Serializable
data class SpaceListResponse(
    val ok: Boolean = false,
    val spaces: List<SpaceSummary> = emptyList(),
)

@Serializable
data class ReceiptFlag(
    val path: String = "",
    val reason: String = "",
    val detail: String? = null,
)

@Serializable
data class LineItem(
    val description: String? = null,
    val qty: Double? = null,
    @SerialName("unit_price") val unitPrice: Double? = null,
    val amount: Double? = null,
)

@Serializable
data class Receipt(
    val merchant: String? = null,
    val date: String? = null,
    val currency: String? = null,
    val category: String? = null,
    @SerialName("line_items") val lineItems: List<LineItem> = emptyList(),
    val subtotal: Double? = null,
    val tax: Double? = null,
    val total: Double? = null,
    val flags: List<ReceiptFlag> = emptyList(),
)

@Serializable
data class ExtractResponse(
    val ok: Boolean = false,
    val receipt: Receipt? = null,
    val scanId: String? = null,
    val error: String? = null,
)

@Serializable
data class AppendRequest(
    val scanId: String,
    val receipt: Receipt,
    val staff: String? = null,
    val outlet: String? = null,
    val payment: String? = null,
    val purpose: String? = null,
    val customer: String? = null,
)

@Serializable
data class AppendResponse(
    val ok: Boolean = false,
    val code: String? = null,
    val duplicate: Boolean = false,
    @SerialName("credits_remaining") val creditsRemaining: Int? = null,
    @SerialName("rows_written") val rowsWritten: Int = 0,
)
