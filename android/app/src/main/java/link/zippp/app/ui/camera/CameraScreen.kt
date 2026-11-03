package link.zippp.app.ui.camera

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextAlign
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
import link.zippp.app.ui.review.ReviewScreen
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppSpace
import java.io.File

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
    onScanQueued: (Receipt, String) -> Unit,
    onScanAccepted: (String) -> Unit,
    onScanDiscarded: (String) -> Unit,
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
    var result by remember { mutableStateOf<ExtractResponse?>(null) }
    var credits by remember { mutableStateOf(initialCredits) }
    var spaces by remember { mutableStateOf<List<SpaceSummary>>(emptyList()) }

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

    val receipt = result?.receipt
    val scanId = result?.scanId
    if (receipt != null && scanId != null) {
        ReviewScreen(
            api = api,
            token = token,
            receipt = receipt,
            scanId = scanId,
            credits = credits,
            onDiscard = {
                onScanDiscarded(scanId)
                result = null
            },
            onAccepted = { remaining ->
                onScanAccepted(scanId)
                credits = remaining ?: credits
                onCreditsChanged(credits)
                result = null
            },
            onSessionLost = onSessionLost,
        )
        return
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
                                            val response = api.extract(token, bytes)
                                            if (response.ok && response.receipt != null && response.scanId != null) {
                                                onScanQueued(response.receipt, response.scanId)
                                                result = response
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
