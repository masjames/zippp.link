import type { ReactNode } from "react";
import { Link } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { copy, type AppLanguage } from "../copy";

export function PreviewShell({
  children,
  language,
  localPreview = false,
}: {
  children: ReactNode;
  language: AppLanguage;
  localPreview?: boolean;
}) {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text accessibilityRole="header" style={styles.wordmark}>zippp</Text>
      {localPreview ? (
        <View accessibilityLiveRegion="polite" style={styles.banner}>
          <Text style={styles.bannerText}>{copy("app.expoPreview.banner", language)}</Text>
        </View>
      ) : null}
      <View style={styles.navigation}>
        <Link href="/" asChild>
          <Pressable accessibilityRole="link" style={styles.navLink}>
            <Text style={styles.navText}>{copy("app.home.title", language)}</Text>
          </Pressable>
        </Link>
        <Link href="/capture" asChild>
          <Pressable accessibilityRole="link" style={styles.navLink}>
            <Text style={styles.navText}>{copy("app.home.capture", language)}</Text>
          </Pressable>
        </Link>
        <Link href="/inbox" asChild>
          <Pressable accessibilityRole="link" style={styles.navLink}>
            <Text style={styles.navText}>{copy("app.inbox.title", language)}</Text>
          </Pressable>
        </Link>
        <Link href="/sheet" asChild>
          <Pressable accessibilityRole="link" style={styles.navLink}>
            <Text style={styles.navText}>{copy("app.nav.sheet", language)}</Text>
          </Pressable>
        </Link>
        <Link href="/settings" asChild>
          <Pressable accessibilityRole="link" style={styles.navLink}>
            <Text style={styles.navText}>{copy("app.settings.title", language)}</Text>
          </Pressable>
        </Link>
      </View>
      <View style={styles.body}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#e9e9e9" },
  content: { width: "100%", maxWidth: 760, alignSelf: "center", padding: 24, gap: 20 },
  wordmark: { color: "#f04c24", fontSize: 34, fontWeight: "800" },
  banner: { borderRadius: 14, backgroundColor: "#f04c24", padding: 16 },
  bannerText: { color: "#170b08", fontSize: 16, fontWeight: "600" },
  navigation: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  navLink: { flex: 1, minWidth: 100, alignItems: "center", borderRadius: 999, backgroundColor: "#ffffff", padding: 12 },
  navText: { color: "#241a18", fontSize: 15, fontWeight: "600" },
  body: { gap: 16, paddingHorizontal: 12 },
});
