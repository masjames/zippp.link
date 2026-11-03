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
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
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
import link.zippp.app.data.SpaceSummary
import link.zippp.app.ui.review.ReviewScreen
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
    onSessionLost: () -> Unit,
) {
    val context = LocalContext.current
    val lifecycleOwner = LocalLifecycleOwner.current
    val scope = rememberCoroutineScope()

    var hasPermission by remember {
        mutableStateOf(
            ContextCompat.checkSelfPermission(context, Manifest.permission.CAMERA) ==
                PackageManager.PERMISSION_GRANTED
        )
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
            onDiscard = { result = null },
            onAccepted = { remaining ->
                credits = remaining ?: credits
                onCreditsChanged(credits)
                result = null
            },
            onSessionLost = onSessionLost,
        )
        return
    }

    Box(modifier = Modifier.fillMaxSize()) {
        if (hasPermission) {
            AndroidView(
                modifier = Modifier.fillMaxSize(),
                factory = { ctx ->
                    PreviewView(ctx).also { previewView = it }
                },
            )
        } else {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(28.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    text = stringResource(R.string.camera_permission),
                    style = MaterialTheme.typography.bodyMedium,
                )
                Spacer(Modifier.height(12.dp))
                Button(onClick = { permissionLauncher.launch(Manifest.permission.CAMERA) }) {
                    Text(stringResource(R.string.camera_allow))
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.TopCenter)
                .fillMaxWidth()
                .padding(20.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                TextButton(onClick = onOpenManual) {
                    Text(stringResource(R.string.camera_manual))
                }
                TextButton(onClick = onOpenSpace) {
                    Text(stringResource(R.string.space_title))
                }
                TextButton(onClick = onOpenSettings) {
                    Text(stringResource(R.string.settings_title))
                }
            }
            Text(
                text = "${stringResource(R.string.scan_balance_label)}: $credits",
                style = MaterialTheme.typography.titleMedium,
            )
            if (spaces.isNotEmpty()) {
                Text(
                    text = "${stringResource(R.string.space_label)}: " +
                        spaces.joinToString(", ") { it.displayName },
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .padding(24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            error?.let {
                Text(
                    text = stringResource(it),
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall,
                )
                Spacer(Modifier.height(8.dp))
            }
            if (busy) {
                CircularProgressIndicator()
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
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Text(stringResource(R.string.camera_snap))
                }
            }
        }
    }
}
