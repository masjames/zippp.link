import { StyleSheet, Text, View } from "react-native";

export default function Index() {
  return (
    <View style={styles.screen}>
      <Text accessibilityRole="header" style={styles.wordmark}>
        zippp
      </Text>
      <View style={styles.preview}>
        <Text style={styles.label}>Expo Router</Text>
        <Text style={styles.label}>React Native for web</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f5f3f1",
    padding: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  wordmark: {
    color: "#f04c24",
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 24,
  },
  preview: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 16,
    backgroundColor: "#ffffff",
    padding: 24,
    gap: 8,
  },
  label: {
    color: "#241a18",
    fontSize: 18,
  },
});
