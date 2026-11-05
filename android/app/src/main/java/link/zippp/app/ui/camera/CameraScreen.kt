// @implements FEAT-118
package link.zippp.app.ui.camera

import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.NumberFormat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.PlanInfo
import link.zippp.app.data.Receipt
import link.zippp.app.ui.batch.BatchDraft
import link.zippp.app.ui.batch.BatchStore
import link.zippp.app.ui.theme.ShellTone
import link.zippp.app.ui.theme.ZipppButton
import link.zippp.app.ui.theme.ZipppButtonKind
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppSectionCard
import link.zippp.app.ui.theme.ZipppShell
import link.zippp.app.ui.theme.ZipppType

/** Shutter flash fades in this long after a capture. */
private const val FLASH_OVERLAY_MS = 140L

/**
 * Capture screen, mirroring the web SnapScreen: a page-tone shell with the
 * sheet pill on top, a tap-to-shoot viewfinder with the guide frame, the tool
 * pills, an inline draft strip, and the Open sheet button.
 */
@Composable
fun CameraScreen(
    api: ApiClient,
    token: String,
    initialCredits: Int?,
    onCreditsChanged: (Int) -> Unit,
    onOpenSettings: () -> Unit,
    onOpenManual: () -> Unit,
    onOpenSpace: () -> Unit,
    batch: BatchStore,
    onOpenDraft: (String) -> Unit,
    onExtracted: (Receipt, String) -> Unit,
    onSessionLost: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var sheetTitle by remember { mutableStateOf<String?>(null) }
    var sheetId by remember { mutableStateOf<String?>(null) }
    var plan by remember { mutableStateOf<PlanInfo?>(null) }

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    LaunchedEffect(token) {
        runCatching { api.me(token) }
            .onSuccess { me ->
                sheetTitle = me.workspace?.spreadsheetTitle ?: me.workspace?.spreadsheetName
                sheetId = me.workspace?.spreadsheetId
                plan = me.plan
            }
            .onFailure { err ->
                if (err is ApiException && err.code == "DEVICE_REVOKED") onSessionLost()
            }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasPermission = granted }

    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var flashOn by remember { mutableStateOf(false) }
    var shutterFlash by remember { mutableStateOf(false) }
    var stripIndex by remember { mutableIntStateOf(0) }
    // Unknown balance is not empty: after a relaunch the credit count is not
    // loaded yet, so only block when the plan or the balance says so.
    val outOfCredits = plan?.let { it.included > 0 && it.used >= it.included }
        ?: (initialCredits != null && initialCredits <= 0)

    /**
     * The single extract path: the shutter and the gallery picker both hand
     * bytes here, so result mapping and busy handling cannot drift apart.
     */
    suspend fun extractBytes(bytes: ByteArray) {
        try {
            val response = api.extract(token, bytes)
            val extracted = response.receipt
            val extractedScan = response.scanId
            if (response.ok && extracted != null && extractedScan != null) {
                onExtracted(extracted, extractedScan)
            } else {
                error = R.string.error_extract
            }
        } catch (e: ApiException) {
            if (e.code == "DEVICE_REVOKED") onSessionLost()
            else error = R.string.error_extract
        } catch (_: Exception) {
            error = R.string.error_extract
        } finally {
            busy = false
        }
    }

    val galleryLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.PickVisualMedia()
    ) { uri ->
        if (uri != null && !busy) {
            busy = true
            error = null
            scope.launch {
                try {
                    val raw = withContext(Dispatchers.IO) {
                        context.contentResolver.openInputStream(uri)?.use { it.readBytes() }
                    }
                    val bytes = if (raw == null) {
                        null
                    } else {
                        withContext(Dispatchers.IO) { encodeGalleryJpeg(raw) }
                    }
                    if (bytes == null) {
                        busy = false
                        error = R.string.error_extract
                    } else {
                        extractBytes(bytes)
                    }
                } catch (_: Exception) {
                    busy = false
                    error = R.string.error_extract
                }
            }
        }
    }

    LaunchedEffect(hasPermission, previewView) {
        val view = previewView ?: return@LaunchedEffect
        if (!hasPermission) return@LaunchedEffect

        val future = ProcessCameraProvider.getInstance(context)
        future.addListener({
            runCatching {
                val provider = future.get()
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = view.surfaceProvider
                }
                val capture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MINIMIZE_LATENCY)
                    .build()
                provider.unbindAll()
                provider.bindToLifecycle(
                    lifecycleOwner,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    capture,
                )
                imageCapture = capture
            }.onFailure {
                error = R.string.error_camera
            }
        }, ContextCompat.getMainExecutor(context))
    }

    // Apply the toggle to whatever capture use case is currently bound, and to
    // a fresh one after the camera rebinds.
    LaunchedEffect(imageCapture, flashOn) {
        val capture = imageCapture ?: return@LaunchedEffect
        capture.flashMode =
            if (flashOn) ImageCapture.FLASH_MODE_ON else ImageCapture.FLASH_MODE_OFF
    }

    LaunchedEffect(shutterFlash) {
        if (shutterFlash) {
            delay(FLASH_OVERLAY_MS)
            shutterFlash = false
        }
    }

    fun takePhoto() {
        val capture = imageCapture ?: return
        if (busy || outOfCredits) return
        busy = true
        shutterFlash = true
        error = null
        val file = File.createTempFile("receipt", ".jpg", context.cacheDir)
        capture.takePicture(
            ImageCapture.OutputFileOptions.Builder(file).build(),
            ContextCompat.getMainExecutor(context),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(output: ImageCapture.OutputFileResults) {
                    scope.launch {
                        try {
                            val bytes = withContext(Dispatchers.IO) { file.readBytes() }
                            extractBytes(bytes)
                        } catch (_: Exception) {
                            busy = false
                            error = R.string.error_extract
                        } finally {
                            file.delete()
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    busy = false
                    error = R.string.error_camera
                }
            },
        )
    }

    val drafts = batch.items.filter { it.status != BatchDraft.STATUS_ACCEPTED }
    if (stripIndex > drafts.lastIndex) stripIndex = maxOf(0, drafts.lastIndex)

    ZipppShell(
        tone = ShellTone.Page,
        pill = sheetTitle,
        onPillClick = null,
    ) {
        Viewfinder(
            modifier = Modifier
                .weight(1f)
                .fillMaxWidth(),
            hasPermission = hasPermission,
            ready = imageCapture != null && !outOfCredits,
            busy = busy,
            shutterFlash = shutterFlash,
            onPreview = { previewView = it },
            onTap = ::takePhoto,
            onAllow = { permissionLauncher.launch(Manifest.permission.CAMERA) },
        )

        error?.let {
            Text(
                text = stringResource(it),
                modifier = Modifier.fillMaxWidth(),
                color = ZipppColors.danger,
                style = ZipppType.smallStrong,
                textAlign = TextAlign.Center,
            )
        }

        if (outOfCredits) {
            ZipppSectionCard {
                Text(
                    text = stringResource(R.string.no_credits_message),
                    style = ZipppType.small,
                    color = ZipppColors.muted,
                )
            }
        }

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            ToolPill(
                label = stringResource(R.string.camera_gallery),
                enabled = !busy && !outOfCredits,
                active = false,
                onClick = {
                    galleryLauncher.launch(
                        PickVisualMediaRequest(ActivityResultContracts.PickVisualMedia.ImageOnly)
                    )
                },
            )
            ToolPill(
                label = stringResource(
                    if (flashOn) R.string.camera_flash_on else R.string.camera_flash_off
                ),
                enabled = imageCapture != null,
                active = flashOn,
                onClick = { flashOn = !flashOn },
            )
            ToolPill(
                label = stringResource(R.string.camera_manual),
                enabled = !outOfCredits,
                active = false,
                onClick = onOpenManual,
            )
        }

        DraftStrip(
            drafts = drafts,
            index = stripIndex,
            onIndex = { stripIndex = it },
            onOpenDraft = onOpenDraft,
        )

        val spreadsheetId = sheetId
        if (spreadsheetId != null) {
            ZipppButton(
                text = stringResource(R.string.sheets_open),
                onClick = {
                    val url = "https://docs.google.com/spreadsheets/d/$spreadsheetId"
                    context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
                },
                modifier = Modifier.fillMaxWidth(),
                kind = ZipppButtonKind.Mist,
            ) {
                Image(
                    painter = painterResource(R.drawable.ic_sheets),
                    contentDescription = null,
                    modifier = Modifier.size(18.dp),
                )
            }
        }

        // The header is hidden on capture, so the other screens stay one tap away.
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(20.dp, Alignment.CenterHorizontally),
        ) {
            NavLink(stringResource(R.string.space_title), onOpenSpace)
            NavLink(stringResource(R.string.settings_title), onOpenSettings)
        }
    }
}

@Composable
private fun NavLink(text: String, onClick: () -> Unit) {
    Text(
        text = text,
        modifier = Modifier
            .clip(RoundedCornerShape(ZipppRadius.control))
            .clickable(onClick = onClick)
            .padding(vertical = 4.dp),
        style = ZipppType.bodyStrong,
        color = ZipppColors.muted,
        maxLines = 1,
    )
}

/** Tap-to-shoot viewfinder: preview, guide frame, hint pill, shutter flash. */
@Composable
private fun Viewfinder(
    modifier: Modifier,
    hasPermission: Boolean,
    ready: Boolean,
    busy: Boolean,
    shutterFlash: Boolean,
    onPreview: (PreviewView) -> Unit,
    onTap: () -> Unit,
    onAllow: () -> Unit,
) {
    val flashAlpha by animateFloatAsState(
        targetValue = if (shutterFlash) 0.7f else 0f,
        label = "shutterFlash",
    )
    Box(
        modifier = modifier
            .widthIn(max = 430.dp)
            .clip(RoundedCornerShape(ZipppRadius.panel))
            .background(ZipppColors.camera)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                enabled = hasPermission && ready && !busy,
                onClick = onTap,
            ),
        contentAlignment = Alignment.Center,
    ) {
        if (hasPermission) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    PreviewView(ctx).also {
                        // TextureView keeps the preview visible under the rounded clip.
                        it.implementationMode = PreviewView.ImplementationMode.COMPATIBLE
                        onPreview(it)
                    }
                },
            )
            GuideFrame()
            Text(
                text = stringResource(R.string.camera_tap_hint),
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .padding(top = 12.dp)
                    .clip(RoundedCornerShape(ZipppRadius.pill))
                    .background(Color.Black.copy(alpha = 0.5f))
                    .padding(horizontal = 12.dp, vertical = 6.dp),
                style = ZipppType.smallStrong,
                color = Color.White,
                maxLines = 1,
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .alpha(flashAlpha)
                    .background(Color.White)
            )
            if (busy) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.45f)),
                    contentAlignment = Alignment.Center,
                ) {
                    Column(
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        CircularProgressIndicator(color = ZipppColors.orange, strokeWidth = 3.dp)
                        Text(
                            text = stringResource(R.string.camera_reading),
                            style = ZipppType.smallStrong,
                            color = Color.White,
                        )
                    }
                }
            }
        } else {
            Column(
                modifier = Modifier.padding(24.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                Text(
                    text = stringResource(R.string.camera_permission),
                    style = ZipppType.body,
                    color = Color.White,
                    textAlign = TextAlign.Center,
                )
                ZipppButton(
                    text = stringResource(R.string.camera_allow),
                    onClick = onAllow,
                    kind = ZipppButtonKind.Brand,
                    modifier = Modifier.widthIn(min = 200.dp),
                )
            }
        }
    }
}

/**
 * Guide frame: four rounded L corners in white, inset from the viewfinder
 * edge, like the web `h-7 w-7 border-4 border-white/90` corners.
 */
@Composable
private fun GuideFrame() {
    Canvas(
        modifier = Modifier
            .fillMaxSize()
            .padding(horizontal = 28.dp, vertical = 48.dp),
    ) {
        val color = Color.White.copy(alpha = 0.9f)
        val stroke = 4.dp.toPx()
        val arm = 28.dp.toPx()
        val half = stroke / 2f
        val left = half
        val top = half
        val right = size.width - half
        val bottom = size.height - half

        fun line(from: Offset, to: Offset) =
            drawLine(color, from, to, stroke, cap = androidx.compose.ui.graphics.StrokeCap.Round)

        line(Offset(left, top), Offset(left + arm, top))
        line(Offset(left, top), Offset(left, top + arm))
        line(Offset(right - arm, top), Offset(right, top))
        line(Offset(right, top), Offset(right, top + arm))
        line(Offset(left, bottom), Offset(left + arm, bottom))
        line(Offset(left, bottom - arm), Offset(left, bottom))
        line(Offset(right - arm, bottom), Offset(right, bottom))
        line(Offset(right, bottom - arm), Offset(right, bottom))
    }
}

/** Small pill under the viewfinder for upload, flash and manual entry. */
@Composable
private fun ToolPill(
    label: String,
    enabled: Boolean,
    active: Boolean,
    onClick: () -> Unit,
) {
    Text(
        text = label,
        modifier = Modifier
            .clip(RoundedCornerShape(ZipppRadius.pill))
            .background(if (active) ZipppColors.peach else ZipppColors.card)
            .border(1.dp, ZipppColors.line, RoundedCornerShape(ZipppRadius.pill))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        style = ZipppType.smallStrong,
        color = if (enabled) ZipppColors.ink else ZipppColors.muted,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
    )
}

/**
 * Inline draft strip under the viewfinder, mirroring the web capture screen
 * where captured receipts stay on the camera page instead of a queue page.
 * Shows the current draft with prev / next; tapping it opens the review sheet.
 */
@Composable
private fun DraftStrip(
    drafts: List<BatchDraft>,
    index: Int,
    onIndex: (Int) -> Unit,
    onOpenDraft: (String) -> Unit,
) {
    val draft = drafts.getOrNull(index) ?: return
    val pending = draft.status == BatchDraft.STATUS_PENDING || draft.status == BatchDraft.STATUS_READY
    val merchant = draft.receipt.merchant?.trim().takeUnless { it.isNullOrEmpty() }
        ?: stringResource(R.string.review_title)
    val total = draftTotalText(draft.receipt)

    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(ZipppRadius.card))
            .background(ZipppColors.card)
            .alpha(if (draft.status == BatchDraft.STATUS_SENDING) 0.55f else 1f)
            .padding(start = 12.dp, end = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(
            modifier = Modifier
                .weight(1f)
                .clickable(enabled = pending) { onOpenDraft(draft.id) }
                .padding(vertical = 10.dp),
            verticalArrangement = Arrangement.spacedBy(2.dp),
        ) {
            Text(
                text = stringResource(R.string.review_to_review)
                    .replace("{count}", drafts.size.toString()),
                style = ZipppType.small,
                color = ZipppColors.muted,
                maxLines = 1,
            )
            Text(
                text = if (total != null) "$merchant · $total" else merchant,
                style = ZipppType.bodyStrong,
                color = ZipppColors.ink,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        StripStep(
            glyph = "‹",
            description = stringResource(R.string.review_prev),
            enabled = index > 0,
            onClick = { onIndex(index - 1) },
        )
        StripStep(
            glyph = "›",
            description = stringResource(R.string.review_next),
            enabled = index < drafts.lastIndex,
            onClick = { onIndex(index + 1) },
        )
    }
}

@Composable
private fun StripStep(
    glyph: String,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(width = 36.dp, height = 40.dp)
            .alpha(if (enabled) 1f else 0.3f)
            .clickable(enabled = enabled, onClick = onClick)
            .semantics { contentDescription = description },
        contentAlignment = Alignment.Center,
    ) {
        Text(text = glyph, style = ZipppType.h3, color = ZipppColors.ink)
    }
}

/** Amount in the receipt's own currency code; never invents a symbol. */
private fun draftTotalText(receipt: Receipt): String? {
    val total = receipt.total ?: return null
    val format = NumberFormat.getNumberInstance()
    format.maximumFractionDigits = if (total % 1.0 == 0.0) 0 else 2
    format.minimumFractionDigits = 0
    val amount = format.format(total)
    val currency = receipt.currency?.trim()?.takeIf { it.isNotEmpty() }
    return if (currency == null) amount else "$currency $amount"
}

/** Gallery uploads stay within the same budget the web capture screen uses. */
private const val GALLERY_MAX_PIXELS = 3_000_000
private const val GALLERY_JPEG_QUALITY = 72

/**
 * Picker results can be PNG, WebP or HEIC and larger than the API accepts,
 * while the multipart upload always declares `image/jpeg`. Decode, downsample
 * and re-encode so the gallery path hands the API the same kind of bytes a
 * shutter capture produces.
 */
private fun encodeGalleryJpeg(bytes: ByteArray): ByteArray? {
    val bounds = BitmapFactory.Options().apply { inJustDecodeBounds = true }
    BitmapFactory.decodeByteArray(bytes, 0, bytes.size, bounds)
    val width = bounds.outWidth
    val height = bounds.outHeight
    if (width <= 0 || height <= 0) return null

    var sample = 1
    while (width * height / (sample * sample) > GALLERY_MAX_PIXELS) sample *= 2
    val bitmap = BitmapFactory.decodeByteArray(
        bytes,
        0,
        bytes.size,
        BitmapFactory.Options().apply { inSampleSize = sample },
    ) ?: return null

    return try {
        ByteArrayOutputStream().use { out ->
            bitmap.compress(Bitmap.CompressFormat.JPEG, GALLERY_JPEG_QUALITY, out)
            out.toByteArray()
        }
    } finally {
        bitmap.recycle()
    }
}
