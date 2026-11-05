// @implements FEAT-113, FEAT-118
package link.zippp.app.ui.theme

import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.ExperimentalTextApi
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.Font
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontVariation
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import link.zippp.app.R

/**
 * Mirrors spec tokens in src/app/globals.css and tailwind.config.ts.
 * Light only. Keep every value identical to the web; do not invent shades.
 */
object ZipppColors {
    val orange = Color(0xFFEE5329)
    val ink = Color(0xFF1C0B09)
    val maroon = Color(0xFF3E0F0C)
    val peach = Color(0xFFF6D3C5)
    val mist = Color(0xFFC9CFD9)
    val page = Color(0xFFE8E8E8)
    val card = Color(0xFFFFFFFF)
    val surface = Color(0xFFF6D3C5)
    val text = Color(0xFF1C0B09)
    val muted = Color(0xFF5E4640)
    val line = Color(0xFFE4B9A8)
    val btn = Color(0xFF3E0F0C)
    val btnText = Color(0xFFFFFFFF)
    val accent = Color(0xFFC73A12)
    val danger = Color(0xFFB3261E)
    val camera = Color(0xFF2A1410)
}

/** Half the web default scale, plus the named shell radii. */
object ZipppRadius {
    val hairline = 1.dp
    val sm = 2.dp
    val md = 3.dp
    val control = 4.dp
    val xl = 6.dp
    val card = 8.dp
    val sheet = 12.dp
    val panel = 14.dp
    val phone = 18.dp
    val pill = 999.dp

    fun pill(): RoundedCornerShape = RoundedCornerShape(pill)
    fun card(): RoundedCornerShape = RoundedCornerShape(card)
    fun panel(): RoundedCornerShape = RoundedCornerShape(panel)
}

object ZipppSpace {
    val page = 16.dp
    val shell = 24.dp
    val gap = 16.dp
    val top = 16.dp
    val bottom = 48.dp
}

/**
 * Archivo (heads) and Inter (body), both the variable OFL files the web
 * loads. Weight is applied with the variation axis so black headlines match
 * the web instead of falling back to synthetic bold.
 */
@OptIn(ExperimentalTextApi::class)
private fun head(weight: Int) = Font(
    R.font.archivo,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

@OptIn(ExperimentalTextApi::class)
private fun body(weight: Int) = Font(
    R.font.inter,
    weight = FontWeight(weight),
    variationSettings = FontVariation.Settings(FontVariation.weight(weight)),
)

val ZipppHeadFamily = FontFamily(
    head(400),
    head(600),
    head(700),
    head(800),
    head(900),
)

val ZipppBodyFamily = FontFamily(
    body(400),
    body(500),
    body(600),
    body(700),
)

/** Web text scale used by the app screens. */
object ZipppType {
    val wordmark = TextStyle(
        fontFamily = ZipppHeadFamily,
        fontWeight = FontWeight.Black,
        fontSize = 24.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.5).sp,
    )
    val h1 = TextStyle(
        fontFamily = ZipppHeadFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 30.sp,
        lineHeight = 30.sp,
        letterSpacing = (-1).sp,
    )
    val h2 = TextStyle(
        fontFamily = ZipppHeadFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 24.sp,
        lineHeight = 24.sp,
        letterSpacing = (-0.5).sp,
    )
    val h3 = TextStyle(
        fontFamily = ZipppHeadFamily,
        fontWeight = FontWeight.ExtraBold,
        fontSize = 18.sp,
        lineHeight = 22.sp,
        letterSpacing = (-0.3).sp,
    )
    val h4 = TextStyle(
        fontFamily = ZipppHeadFamily,
        fontWeight = FontWeight.Bold,
        fontSize = 16.sp,
        lineHeight = 20.sp,
    )
    val body = TextStyle(
        fontFamily = ZipppBodyFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    )
    val bodyStrong = body.copy(fontWeight = FontWeight.SemiBold)
    val small = TextStyle(
        fontFamily = ZipppBodyFamily,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    )
    val smallStrong = small.copy(fontWeight = FontWeight.SemiBold)
    val label = TextStyle(
        fontFamily = ZipppBodyFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 10.sp,
        lineHeight = 10.sp,
    )
    val pill = TextStyle(
        fontFamily = ZipppBodyFamily,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    )
}
