import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { copy, type AppLanguage } from "../copy";

export function SignInCard({ language }: { language: AppLanguage }) {
  return (
    <View style={styles.card}>
      <Text style={styles.body}>{copy("app.signin.title", language)}</Text>
      <Pressable
        accessibilityRole="link"
        style={styles.primary}
        onPress={() => {
          if (Platform.OS === "web") window.location.assign("/api/auth/login?next=%2Frn");
        }}
      >
        <Text style={styles.primaryText}>{copy("app.signin.google", language)}</Text>
      </Pressable>
    </View>
  );
}


const styles = StyleSheet.create({
  card: { gap: 16, borderRadius: 16, backgroundColor: "#ffffff", padding: 20 },
  body: { color: "#64514c", fontSize: 18, lineHeight: 26 },
  primary: { alignSelf: "flex-start", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 18, paddingVertical: 11 },
  primaryText: { color: "#170b08", fontSize: 15, fontWeight: "700" },
});
