package link.zippp.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.Typography
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.unit.sp
import androidx.compose.ui.text.font.Font
import link.zippp.app.R

/** Archivo for heads, Inter for body, bundled from the same OFL sources as web. */
private val Head = FontFamily(Font(R.font.archivo))
private val Body = FontFamily(Font(R.font.inter))

private val Light = lightColorScheme(
    primary = ZipppColors.orange,
    onPrimary = ZipppColors.ink,
    secondary = ZipppColors.maroon,
    onSecondary = ZipppColors.card,
    background = ZipppColors.page,
    onBackground = ZipppColors.ink,
    surface = ZipppColors.card,
    onSurface = ZipppColors.ink,
    surfaceVariant = ZipppColors.peach,
    onSurfaceVariant = ZipppColors.muted,
    outline = ZipppColors.line,
    error = ZipppColors.danger,
)

/**
 * Archivo is not bundled, so headlines use the condensed system face with the
 * same tight tracking as the web. Body stays system sans, like Inter fallback.
 */
private val Type = Typography(
    headlineLarge = TextStyle(
        fontFamily = Head,
        fontWeight = FontWeight.Black,
        fontSize = 32.sp,
        lineHeight = 34.sp,
        letterSpacing = (-1.0).sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = Head,
        fontWeight = FontWeight.Black,
        fontSize = 26.sp,
        lineHeight = 28.sp,
        letterSpacing = (-0.8).sp,
    ),
    titleMedium = TextStyle(
        fontFamily = Head,
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp,
        lineHeight = 20.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = Body,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = Body,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
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
