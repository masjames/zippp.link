// @implements FEAT-118
package link.zippp.app.ui.theme

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import link.zippp.app.R

/** Which PhoneShell tone a screen uses. */
enum class ShellTone { Card, Page, Brand }

/**
 * The chrome above every app screen, mirroring AppShell.tsx: wordmark on the
 * left, then Home and the Settings entry on the right.
 */
@Composable
fun ZipppHeader(
    showHome: Boolean,
    showSettings: Boolean,
    onHome: () -> Unit,
    onSettings: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .background(ZipppColors.page),
        contentAlignment = Alignment.TopCenter,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 430.dp)
                .padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                text = "zippp",
                style = ZipppType.wordmark,
                color = ZipppColors.orange,
            )
            Spacer(Modifier.weight(1f))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (showHome) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(ZipppRadius.control))
                            .clickable(onClick = onHome)
                            .padding(vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_home),
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            colorFilter = ColorFilter.tint(
                                ZipppColors.muted
                            ),
                        )
                        Text(
                            text = stringResource(R.string.nav_home),
                            style = ZipppType.bodyStrong,
                            color = ZipppColors.muted,
                            maxLines = 1,
                        )
                    }
                }
                if (showSettings) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(ZipppRadius.control))
                            .clickable(onClick = onSettings)
                            .padding(vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Image(
                            painter = painterResource(R.drawable.ic_gear),
                            contentDescription = null,
                            modifier = Modifier.size(20.dp),
                            colorFilter = ColorFilter.tint(
                                ZipppColors.muted
                            ),
                        )
                        Text(
                            text = stringResource(R.string.settings_title),
                            style = ZipppType.bodyStrong,
                            color = ZipppColors.muted,
                            maxLines = 1,
                        )
                    }
                }
            }
        }
    }
}

/**
 * The phone shell every app screen sits in. White card by default, grey page
 * tone for the capture screen, brand orange for the auth screen.
 */
@Composable
fun ZipppShell(
    tone: ShellTone = ShellTone.Card,
    pill: String? = null,
    onPillClick: (() -> Unit)? = null,
    content: @Composable ColumnScope.() -> Unit,
) {
    val background = when (tone) {
        ShellTone.Page -> ZipppColors.page
        ShellTone.Brand -> ZipppColors.orange
        ShellTone.Card -> ZipppColors.card
    }
    val foreground = if (tone == ShellTone.Brand) ZipppColors.ink else ZipppColors.text

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(ZipppColors.page),
        contentAlignment = Alignment.TopCenter,
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .widthIn(max = 430.dp)
                .fillMaxHeight()
                .background(background),
        ) {
            if (pill != null) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(start = 24.dp, end = 24.dp, top = 12.dp, bottom = 8.dp),
                    horizontalArrangement = Arrangement.End,
                ) {
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(ZipppRadius.card))
                            .background(ZipppColors.card)
                            .border(
                                width = 2.dp,
                                color = ZipppColors.line,
                                shape = RoundedCornerShape(ZipppRadius.card),
                            )
                            .then(
                                if (onPillClick != null) {
                                    Modifier.clickable(onClick = onPillClick)
                                } else {
                                    Modifier
                                }
                            )
                            .padding(horizontal = 10.dp, vertical = 4.dp),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(4.dp),
                    ) {
                        Text(
                            text = pill,
                            modifier = Modifier.widthIn(max = 190.dp),
                            style = ZipppType.pill,
                            color = foreground,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        if (onPillClick != null) {
                            Text(
                                text = "▾",
                                style = ZipppType.pill,
                                color = foreground,
                            )
                        }
                    }
                }
            }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f)
                    .padding(
                        start = ZipppSpace.shell,
                        end = ZipppSpace.shell,
                        top = ZipppSpace.top,
                        bottom = ZipppSpace.bottom,
                    ),
                verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
                content = content,
            )
        }
    }
}

/** White section card: 8dp radius, 16dp padding, as in the web settings. */
@Composable
fun ZipppSectionCard(
    modifier: Modifier = Modifier,
    content: @Composable ColumnScope.() -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(ZipppRadius.card))
            .background(ZipppColors.card)
            .padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
        content = content,
    )
}

enum class ZipppButtonKind { Primary, Brand, Mist, Danger, Outline }

/** Pill button matching the web labels and heights. */
@Composable
fun ZipppButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    kind: ZipppButtonKind = ZipppButtonKind.Primary,
    enabled: Boolean = true,
    content: @Composable () -> Unit = {},
) {
    val bg = when (kind) {
        ZipppButtonKind.Primary -> ZipppColors.btn
        ZipppButtonKind.Brand -> ZipppColors.orange
        ZipppButtonKind.Mist -> ZipppColors.mist
        ZipppButtonKind.Danger -> ZipppColors.mist
        ZipppButtonKind.Outline -> Color.Transparent
    }
    val fg = when (kind) {
        ZipppButtonKind.Primary -> ZipppColors.btnText
        ZipppButtonKind.Brand -> ZipppColors.ink
        ZipppButtonKind.Mist, ZipppButtonKind.Danger -> ZipppColors.ink
        ZipppButtonKind.Outline -> ZipppColors.ink
    }
    val textColor = if (kind == ZipppButtonKind.Danger) ZipppColors.danger else fg
    Box(
        modifier = modifier
            .height(48.dp)
            .clip(RoundedCornerShape(ZipppRadius.pill))
            .background(if (enabled) bg else bg.copy(alpha = 0.4f))
            .then(
                if (kind == ZipppButtonKind.Outline) {
                    Modifier.border(
                        1.dp,
                        ZipppColors.line,
                        RoundedCornerShape(ZipppRadius.pill),
                    )
                } else {
                    Modifier
                }
            )
            .clickable(enabled = enabled, onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            Text(
                text = text,
                style = ZipppType.bodyStrong,
                color = textColor,
                maxLines = 1,
            )
            content()
        }
    }
}

