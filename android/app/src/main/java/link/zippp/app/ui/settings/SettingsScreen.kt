// @implements FEAT-118
package link.zippp.app.ui.settings

import android.Manifest
import android.content.Intent
import android.os.Build
import android.provider.Settings
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalLifecycleOwner
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import androidx.core.app.NotificationManagerCompat
import link.zippp.app.R
import link.zippp.app.notify.CapturePrefs
import link.zippp.app.ui.theme.ZipppColors
import link.zippp.app.ui.theme.ZipppRadius
import link.zippp.app.ui.theme.ZipppButton
import link.zippp.app.ui.theme.ZipppButtonKind
import link.zippp.app.ui.theme.ZipppSectionCard
import link.zippp.app.ui.theme.ZipppShell
import link.zippp.app.ui.theme.ZipppSpace
import link.zippp.app.ui.theme.ZipppType

@Composable
fun SettingsScreen(
    credits: Int,
    onSignOut: () -> Unit,
) {
    val context = LocalContext.current
    var captureOn by remember { mutableStateOf(CapturePrefs.enabled(context)) }
    var accessOn by remember {
        mutableStateOf(
            NotificationManagerCompat
                .getEnabledListenerPackages(context)
                .contains(context.packageName)
        )
    }
    var error by remember { mutableStateOf<Int?>(null) }

    val permissionLauncher = rememberLauncherForActivityResult(
        ActivityResultContracts.RequestPermission()
    ) { granted ->
        if (granted) {
            CapturePrefs.setEnabled(context, true)
            captureOn = true
        } else {
            CapturePrefs.setEnabled(context, false)
            captureOn = false
            error = R.string.error_capture_permission
        }
    }

    val lifecycleOwner = LocalLifecycleOwner.current
    DisposableEffect(lifecycleOwner) {
        val observer = LifecycleEventObserver { _, event ->
            if (event == Lifecycle.Event.ON_RESUME) {
                accessOn = NotificationManagerCompat
                    .getEnabledListenerPackages(context)
                    .contains(context.packageName)
            }
        }
        lifecycleOwner.lifecycle.addObserver(observer)
        onDispose { lifecycleOwner.lifecycle.removeObserver(observer) }
    }

    ZipppShell {
        Column(
            modifier = Modifier
                .weight(1f)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
        ) {
            Text(
                text = stringResource(R.string.settings_title),
                style = ZipppType.h1,
                color = ZipppColors.text,
            )

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(ZipppRadius.card))
                    .background(ZipppColors.surface)
                    .padding(16.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    text = stringResource(R.string.settings_balance),
                    style = ZipppType.small,
                    color = ZipppColors.muted,
                )
                Text(
                    text = credits.toString(),
                    style = ZipppType.h1,
                    color = ZipppColors.ink,
                )
            }

            ZipppSectionCard {
                Text(
                    text = stringResource(R.string.settings_capture_title),
                    style = ZipppType.h3,
                    color = ZipppColors.text,
                )
                Text(
                    text = stringResource(R.string.settings_capture_body),
                    style = ZipppType.small,
                    color = ZipppColors.muted,
                )
                Text(
                    text = if (accessOn) {
                        stringResource(R.string.settings_capture_access_on)
                    } else {
                        stringResource(R.string.settings_capture_access_off)
                    },
                    color = if (accessOn) ZipppColors.muted else ZipppColors.danger,
                    style = ZipppType.small,
                )
                ZipppButton(
                    text = stringResource(R.string.settings_capture_open_access),
                    onClick = {
                        context.startActivity(
                            Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
                        )
                    },
                    modifier = Modifier.fillMaxWidth(),
                    kind = ZipppButtonKind.Outline,
                )
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    Text(
                        text = stringResource(R.string.settings_capture_toggle),
                        modifier = Modifier.weight(1f),
                        style = ZipppType.bodyStrong,
                        color = ZipppColors.ink,
                    )
                    Switch(
                        checked = captureOn,
                        enabled = accessOn,
                        onCheckedChange = { wanted ->
                            error = null
                            if (!wanted) {
                                CapturePrefs.setEnabled(context, false)
                                captureOn = false
                                return@Switch
                            }
                            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                                permissionLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                            } else {
                                CapturePrefs.setEnabled(context, true)
                                captureOn = true
                            }
                        },
                        colors = SwitchDefaults.colors(
                            checkedThumbColor = ZipppColors.card,
                            checkedTrackColor = ZipppColors.orange,
                            checkedBorderColor = ZipppColors.orange,
                            uncheckedThumbColor = ZipppColors.ink,
                            uncheckedTrackColor = ZipppColors.mist,
                            uncheckedBorderColor = ZipppColors.line,
                            disabledUncheckedThumbColor = ZipppColors.muted,
                            disabledUncheckedTrackColor = ZipppColors.mist,
                            disabledUncheckedBorderColor = ZipppColors.line,
                        ),
                    )
                }
                error?.let {
                    Text(
                        text = stringResource(it),
                        color = ZipppColors.danger,
                        style = ZipppType.small,
                    )
                }
            }

            ZipppButton(
                text = stringResource(R.string.settings_sign_out),
                onClick = onSignOut,
                modifier = Modifier.fillMaxWidth(),
                kind = ZipppButtonKind.Danger,
            )
        }
    }
}
