package link.zippp.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val Light = lightColorScheme(
    primary = ZipppColors.orange,
    onPrimary = ZipppColors.ink,
    secondary = ZipppColors.maroon,
    onSecondary = ZipppColors.card,
    background = ZipppColors.page,
    onBackground = ZipppColors.ink,
    surface = ZipppColors.card,
    onSurface = ZipppColors.ink,
    surfaceVariant = ZipppColors.surface,
    onSurfaceVariant = ZipppColors.muted,
    outline = ZipppColors.line,
    error = ZipppColors.danger,
)

/** Same families and scale the web uses; screens read ZipppType directly. */
private val Type = Typography(
    headlineLarge = ZipppType.h1,
    headlineMedium = ZipppType.h2,
    headlineSmall = ZipppType.h3,
    titleMedium = ZipppType.h4,
    bodyLarge = ZipppType.body,
    bodyMedium = ZipppType.body,
    bodySmall = ZipppType.small,
    labelLarge = ZipppType.bodyStrong,
    labelMedium = ZipppType.smallStrong,
    labelSmall = ZipppType.label,
)

private val Shapes = Shapes(
    small = RoundedCornerShape(ZipppRadius.card),
    medium = RoundedCornerShape(ZipppRadius.card),
    large = RoundedCornerShape(ZipppRadius.panel),
)

@Composable
fun ZipppTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = Light,
        typography = Type,
        shapes = Shapes,
        content = content,
    )
}
