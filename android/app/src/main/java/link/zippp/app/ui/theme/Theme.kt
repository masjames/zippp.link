package link.zippp.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Light = lightColorScheme(
    primary = Color(0xFFB3202A),
    onPrimary = Color.White,
    secondary = Color(0xFF1F6F5C),
    background = Color(0xFFFFFBF5),
    surface = Color.White,
)

@Composable
fun ZipppTheme(content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = Light, content = content)
}
