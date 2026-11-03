// @implements FEAT-113
package link.zippp.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

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
    val muted = Color(0xFF5E4640)
    val line = Color(0xFFE4B9A8)
    val danger = Color(0xFFB3261E)
}

object ZipppRadius {
    val card = 8.dp
    val panel = 14.dp
    val phone = 18.dp
    val pill = 999.dp
}

object ZipppSpace {
    val page = 12.dp
    val shell = 24.dp
    val gap = 16.dp
}

/**
 * The phone shell every app screen sits in: grey page, white card, 24dp
 * padding, 430dp max width, matching PhoneShell.tsx.
 */
@Composable
fun ZipppShell(content: @Composable ColumnScope.() -> Unit) {
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
                .padding(horizontal = 8.dp, vertical = 8.dp)
                .background(ZipppColors.card, RoundedCornerShape(ZipppRadius.phone))
                .padding(start = ZipppSpace.shell, end = ZipppSpace.shell, top = 16.dp, bottom = 48.dp),
            verticalArrangement = Arrangement.spacedBy(ZipppSpace.gap),
            content = content,
        )
    }
}
