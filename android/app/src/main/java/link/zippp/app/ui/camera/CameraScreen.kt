package link.zippp.app.ui.camera

import android.Manifest
import android.content.pm.PackageManager
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.PickVisualMediaRequest
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.alpha
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import link.zippp.app.R
import link.zippp.app.data.ApiClient
import link.zippp.app.data.ApiException
import link.zippp.app.data.ExtractResponse
import link.zippp.app.data.Receipt
import link.zippp.app.data.SpaceSummary
import link.zippp.app.ui.batch.BatchDraft
import link.zippp.app.ui.batch.BatchStore
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppSpace
import java.io.ByteArrayOutputStream
import java.io.File
import java.text.NumberFormat

@Composable
fun CameraScreen(
    api: ApiClient,
    token: String,
    initialCredits: Int,
    onCreditsChanged: (Int) -> Unit,
    onOpenSettings: () -> Unit,
    onOpenManual: () -> Unit,
    onOpenSpace: () -> Unit,
    onOpenBatch: () -> Unit,
    batch: BatchStore,
    onOpenDraft: (String) -> Unit,
    onExtracted: (Receipt, String) -> Unit,
    onSessionLost: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var planText by remember { mutableStateOf<String?>(null) }

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
    }
    LaunchedEffect(token) {
        runCatching { api.me(token) }.onSuccess { me ->
            planText = me.plan?.let { plan ->
                val label = context.getString(R.string.plan_label)
                val detail = context
                    .getString(R.string.plan_used)
                    .replace("{used}", plan.used.toString())
                    .replace("{included}", plan.included.toString())
                "$label: $detail"
            }
        }
    }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted -> hasPermission = granted }

    var previewView by remember { mutableStateOf<PreviewView?>(null) }
    var imageCapture by remember { mutableStateOf<ImageCapture?>(null) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<Int?>(null) }
    var credits by remember { mutableStateOf(initialCredits) }
    var spaces by remember { mutableStateOf<List<SpaceSummary>>(emptyList()) }
    var flashOn by remember { mutableStateOf(false) }

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

    LaunchedEffect(token) {
        runCatching { api.listSpaces(token) }
            .onSuccess { spaces = it.spaces }
            .onFailure { err ->
                if (err is ApiException && err.code == "DEVICE_REVOKED") onSessionLost()
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

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ZipppColors.maroon),
    ) {
        if (hasPermission) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    PreviewView(ctx).also { previewView = it }
                },
            )
            GuideFrame()
        } else {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(ZipppSpace.shell),
                contentAlignment = Alignment.Center,
            ) {
                Column(
                    modifier = Modifier
                        .widthIn(max = 430.dp)
                        .fillMaxWidth()
                        .background(
                            ZipppColors.card,
                            RoundedCornerShape(ZipppRadius.panel),
                        )
                        .padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        text = stringResource(R.string.camera_permission),
                        style = MaterialTheme.typography.bodyMedium,
                        color = ZipppColors.ink,
                        textAlign = TextAlign.Center,
                    )
                    Spacer(Modifier.height(12.dp))
                    Button(
                        onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) },
                        shape = RoundedCornerShape(ZipppRadius.pill),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = ZipppColors.orange,
                            contentColor = ZipppColors.ink,
                        ),
                    ) {
                        Text(
                            text = stringResource(R.string.camera_allow),
                            style = MaterialTheme.typography.titleMedium,
                        )
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(horizontal = ZipppSpace.page, vertical = ZipppSpace.page),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 430.dp)
                    .fillMaxWidth()
                    .background(
                        ZipppColors.card.copy(alpha = 0.95f),
                        RoundedCornerShape(ZipppRadius.panel),
                    )
                    .padding(horizontal = ZipppSpace.page, vertical = 10.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        text = stringResource(R.string.app_name),
                        style = MaterialTheme.typography.titleMedium,
                        color = ZipppColors.maroon,
                    )
                    Spacer(Modifier.weight(1f))
                    Row(horizontalArrangement = Arrangement.spacedBy(2.dp)) {
                        TextButton(
                            onClick = onOpenManual,
                            modifier = Modifier.height(34.dp),
                            shape = RoundedCornerShape(ZipppRadius.pill),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = ZipppColors.orange,
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.camera_manual),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        TextButton(
                            onClick = onOpenSpace,
                            modifier = Modifier.height(34.dp),
                            shape = RoundedCornerShape(ZipppRadius.pill),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = ZipppColors.orange,
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.space_title),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        TextButton(
                            onClick = onOpenBatch,
                            modifier = Modifier.height(34.dp),
                            shape = RoundedCornerShape(ZipppRadius.pill),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = ZipppColors.orange,
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.queue_title),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                        TextButton(
                            onClick = onOpenSettings,
                            modifier = Modifier.height(34.dp),
                            shape = RoundedCornerShape(ZipppRadius.pill),
                            contentPadding = PaddingValues(horizontal = 10.dp, vertical = 0.dp),
                            colors = ButtonDefaults.textButtonColors(
                                contentColor = ZipppColors.orange,
                            ),
                        ) {
                            Text(
                                text = stringResource(R.string.settings_title),
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }
                Text(
                    text = "${stringResource(R.string.scan_balance_label)}: $credits",
                    modifier = Modifier.fillMaxWidth(),
                    style = MaterialTheme.typography.bodySmall,
                    color = ZipppColors.muted,
                    textAlign = TextAlign.Center,
                )
                planText?.let {
                    Text(
                        text = it,
                        modifier = Modifier.fillMaxWidth(),
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                        textAlign = TextAlign.Center,
                    )
                }
                if (spaces.isNotEmpty()) {
                    Text(
                        text = "${stringResource(R.string.space_label)}: " +
                            spaces.joinToString(", ") { it.displayName },
                        modifier = Modifier.fillMaxWidth(),
                        style = MaterialTheme.typography.bodySmall,
                        color = ZipppColors.muted,
                        textAlign = TextAlign.Center,
                    )
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(horizontal = ZipppSpace.page, vertical = 20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            BatchStrip(batch = batch, onOpenDraft = onOpenDraft)
            error?.let {
                Text(
                    text = stringResource(it),
                    modifier = Modifier
                        .widthIn(max = 430.dp)
                        .fillMaxWidth()
                        .background(
                            ZipppColors.card.copy(alpha = 0.95f),
                            RoundedCornerShape(ZipppRadius.card),
                        )
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    color = ZipppColors.danger,
                    style = MaterialTheme.typography.bodySmall,
                    textAlign = TextAlign.Center,
                )
                Spacer(Modifier.height(8.dp))
            }
            Row(
                modifier = Modifier
                    .widthIn(max = 430.dp)
                    .fillMaxWidth()
                    .padding(bottom = 10.dp),
                horizontalArrangement = Arrangement.spacedBy(
                    space = 8.dp,
                    alignment = Alignment.CenterHorizontally,
                ),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                CaptureToolPill(
                    label = stringResource(
                        if (flashOn) R.string.camera_flash_on else R.string.camera_flash_off
                    ),
                    enabled = imageCapture != null,
                    onClick = { flashOn = !flashOn },
                    active = flashOn,
                    icon = { FlashGlyph(on = flashOn) },
                )
                CaptureToolPill(
                    label = stringResource(R.string.camera_gallery),
                    enabled = !busy,
                    onClick = {
                        galleryLauncher.launch(
                            PickVisualMediaRequest(
                                ActivityResultContracts.PickVisualMedia.ImageOnly
                            )
                        )
                    },
                    icon = { GalleryGlyph() },
                )
            }
            if (busy) {
                CircularProgressIndicator(
                    color = ZipppColors.orange,
                    strokeWidth = 3.dp,
                )
            } else {
                Button(
                    enabled = hasPermission && imageCapture != null,
                    onClick = {
                        val capture = imageCapture ?: return@Button
                        busy = true
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
                    },
                    modifier = Modifier
                        .widthIn(max = 430.dp)
                        .fillMaxWidth()
                        .height(56.dp),
                    shape = RoundedCornerShape(ZipppRadius.pill),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = ZipppColors.orange,
                        contentColor = ZipppColors.ink,
                        disabledContainerColor = ZipppColors.orange.copy(alpha = 0.4f),
                        disabledContentColor = ZipppColors.ink.copy(alpha = 0.5f),
                    ),
                ) {
                    Text(
                        text = stringResource(R.string.camera_snap),
                        style = MaterialTheme.typography.titleMedium,
                    )
                }
            }
        }
    }
}

/**
 * Static portrait guide over the viewfinder: four L-shaped corner brackets,
 * mirroring the guide frame on the web capture screen.
 */
@Composable
private fun GuideFrame() {
    Canvas(
        modifier = Modifier
            .fillMaxSize()
            // 28dp side inset; the vertical inset clears the top status card and
            // the shutter row so the brackets sit on the visible preview band.
            .padding(horizontal = 28.dp, vertical = 150.dp),
    ) {
        val color = ZipppColors.peach.copy(alpha = 0.9f)
        val stroke = 1.5.dp.toPx()
        val arm = 34.dp.toPx()
        val half = stroke / 2f
        val left = half
        val top = half
        val right = size.width - half
        val bottom = size.height - half

        drawLine(color, Offset(left, top), Offset(left + arm, top), stroke)
        drawLine(color, Offset(left, top), Offset(left, top + arm), stroke)

        drawLine(color, Offset(right - arm, top), Offset(right, top), stroke)
        drawLine(color, Offset(right, top), Offset(right, top + arm), stroke)

        drawLine(color, Offset(left, bottom), Offset(left + arm, bottom), stroke)
        drawLine(color, Offset(left, bottom - arm), Offset(left, bottom), stroke)

        drawLine(color, Offset(right - arm, bottom), Offset(right, bottom), stroke)
        drawLine(color, Offset(right, bottom - arm), Offset(right, bottom), stroke)
    }
}

/** Small pill for the flash and gallery actions beside the shutter. */
@Composable
private fun CaptureToolPill(
    label: String,
    enabled: Boolean,
    onClick: () -> Unit,
    active: Boolean = false,
    icon: @Composable () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(ZipppRadius.pill))
            .background(
                if (active) ZipppColors.peach else ZipppColors.card.copy(alpha = 0.92f)
            )
            .border(1.dp, ZipppColors.line, RoundedCornerShape(ZipppRadius.pill))
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        icon()
        Text(
            text = label,
            style = MaterialTheme.typography.labelLarge,
            fontWeight = FontWeight.SemiBold,
            color = if (enabled) ZipppColors.ink else ZipppColors.muted,
            maxLines = 1,
        )
    }
}

/** Bolt glyph; fills with the brand color while the flash is armed. */
@Composable
private fun FlashGlyph(on: Boolean) {
    Canvas(modifier = Modifier.size(width = 9.dp, height = 13.dp)) {
        val bolt = Path().apply {
            moveTo(size.width * 0.62f, 0f)
            lineTo(0f, size.height * 0.62f)
            lineTo(size.width * 0.44f, size.height * 0.62f)
            lineTo(size.width * 0.36f, size.height)
            lineTo(size.width, size.height * 0.36f)
            lineTo(size.width * 0.54f, size.height * 0.36f)
            close()
        }
        drawPath(path = bolt, color = if (on) ZipppColors.orange else ZipppColors.muted)
    }
}

/** Photo glyph for the gallery picker. */
@Composable
private fun GalleryGlyph() {
    Canvas(modifier = Modifier.size(13.dp)) {
        drawRoundRect(
            color = ZipppColors.muted,
            cornerRadius = CornerRadius(2.dp.toPx()),
            style = Stroke(width = 1.2.dp.toPx()),
        )
        drawCircle(
            color = ZipppColors.muted,
            radius = size.minDimension * 0.13f,
            center = Offset(size.width * 0.33f, size.height * 0.33f),
        )
        val dune = Path().apply {
            moveTo(size.width * 0.16f, size.height * 0.8f)
            lineTo(size.width * 0.44f, size.height * 0.46f)
            lineTo(size.width * 0.62f, size.height * 0.66f)
            lineTo(size.width * 0.72f, size.height * 0.55f)
            lineTo(size.width * 0.86f, size.height * 0.8f)
            close()
        }
        drawPath(path = dune, color = ZipppColors.muted)
    }
}

/**
 * Inline draft strip under the viewfinder, mirroring the web capture screen
 * where captured receipts stay on the camera page instead of a queue page.
 * Accepted drafts leave the batch on success, so they never appear here.
 */
@Composable
private fun BatchStrip(
    batch: BatchStore,
    onOpenDraft: (String) -> Unit,
) {
    val drafts = batch.items.filter { it.status != BatchDraft.STATUS_ACCEPTED }
    if (drafts.isEmpty()) return

    LazyRow(
        modifier = Modifier
            .widthIn(max = 430.dp)
            .fillMaxWidth()
            .heightIn(max = 92.dp)
            .padding(bottom = 10.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(items = drafts, key = { draft -> draft.id }) { draft ->
            BatchCard(
                draft = draft,
                onOpen = { onOpenDraft(draft.id) },
            )
        }
    }
}

@Composable
private fun BatchCard(
    draft: BatchDraft,
    onOpen: () -> Unit,
) {
    val pending = draft.status == BatchDraft.STATUS_PENDING
    val sending = draft.status == BatchDraft.STATUS_SENDING
    val receipt = draft.receipt
    val merchant = receipt.merchant?.trim().takeUnless { it.isNullOrEmpty() }
        ?: stringResource(R.string.review_title)
    val total = draftTotalText(receipt)
    val chipBackground = if (sending) ZipppColors.mist else ZipppColors.peach
    val chipForeground = when {
        sending -> ZipppColors.ink
        pending -> ZipppColors.maroon
        else -> ZipppColors.danger
    }

    Column(
        modifier = Modifier
            .width(160.dp)
            .alpha(if (sending) 0.55f else 1f)
            .clip(RoundedCornerShape(ZipppRadius.card))
            .background(ZipppColors.card)
            .border(
                width = 1.dp,
                color = ZipppColors.line,
                shape = RoundedCornerShape(ZipppRadius.card),
            )
            .clickable(enabled = pending, onClick = onOpen)
            .padding(horizontal = 12.dp, vertical = 10.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            Text(
                text = merchant,
                modifier = Modifier.weight(1f),
                style = MaterialTheme.typography.bodyMedium,
                color = if (pending || sending) ZipppColors.ink else ZipppColors.muted,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            BatchChip(
                text = stringResource(R.string.queue_pending),
                background = chipBackground,
                foreground = chipForeground,
            )
        }
        if (total != null) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = stringResource(R.string.review_total),
                    style = MaterialTheme.typography.bodySmall,
                    color = ZipppColors.muted,
                )
                Spacer(Modifier.weight(1f))
                Text(
                    text = total,
                    style = MaterialTheme.typography.bodyMedium,
                    fontWeight = FontWeight.Bold,
                    color = ZipppColors.ink,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun BatchChip(
    text: String,
    background: Color,
    foreground: Color,
) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(ZipppRadius.pill))
            .background(background)
            .padding(horizontal = 6.dp, vertical = 2.dp),
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
