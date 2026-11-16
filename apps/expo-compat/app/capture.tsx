import { useEffect, useRef, useState } from "react";
import { Link } from "expo-router";
import { byteLength, toByteArray } from "base64-js";
import * as Crypto from "expo-crypto";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { copy, useAppLanguage } from "../src/copy";
import { CAPTURE_IMAGE_QUALITY, MAX_RECEIPT_IMAGE_BYTES, SUPPORTED_RECEIPT_IMAGE_MIME_TYPES } from "../src/config";
import { SignInCard } from "../src/components/AccountActions";
import { PreviewShell } from "../src/components/PreviewShell";
import { loadSession, type SessionState } from "../src/home-data";
import { removeCameraTemp } from "../src/camera-temp";
import { listDrafts, saveDraft, type NewDraft } from "../src/draft-store";

type OwnerState = SessionState | { kind: "loading" };

export default function CaptureScreen() {
  const language = useAppLanguage();
  const [owner, setOwner] = useState<OwnerState>(
    Platform.OS === "web" ? { kind: "loading" } : { kind: "localPreview", userId: "local-preview-user" },
  );
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraFailed, setCameraFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const cameraRef = useRef<CameraView | null>(null);
  const processingFileRef = useRef(false);
  const [storageReady, setStorageReady] = useState(false);
  const [storageError, setStorageError] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web") return;
    const controller = new AbortController();
    void loadSession((url, init) => fetch(url, init), controller.signal)
      .then((state) => {
        if (!controller.signal.aborted) setOwner(state);
      });
    return () => controller.abort();
  }, []);

  const ownerId = owner.kind === "localPreview" || owner.kind === "signedIn" ? owner.userId : null;
  const localPreview = owner.kind === "localPreview";

  useEffect(() => {
    if (!ownerId) {
      setStorageReady(false);
      return;
    }
    let active = true;
    setStorageReady(false);
    setStorageError(false);
    void listDrafts(ownerId).then(
      () => {
        if (active) setStorageReady(true);
      },
      () => {
        if (active) setStorageError(true);
      },
    );
    return () => {
      active = false;
    };
  }, [ownerId]);

  async function saveImage(encodedImage: string | null, mimeType: string) {
    if (!ownerId || !encodedImage) {
      setMessage(copy("app.expoCapture.captureFailed", language));
      return;
    }
    if (!SUPPORTED_RECEIPT_IMAGE_MIME_TYPES.some((supported) => supported === mimeType)) {
      setMessage(copy("app.expoCapture.unsupportedType", language));
      return;
    }

    let imageBytes: Uint8Array;
    try {
      if (byteLength(encodedImage) > MAX_RECEIPT_IMAGE_BYTES) {
        setMessage(copy("app.expoCapture.fileTooLarge", language));
        return;
      }
      imageBytes = toByteArray(encodedImage);
    } catch {
      setMessage(copy("app.expoCapture.captureFailed", language));
      return;
    }
    if (imageBytes.byteLength > MAX_RECEIPT_IMAGE_BYTES) {
      setMessage(copy("app.expoCapture.fileTooLarge", language));
      return;
    }

    try {
      await saveDraft({
        id: Crypto.randomUUID(),
        ownerId,
        createdAt: Date.now(),
        mimeType,
        imageBytes,
      });
      setMessage(copy("app.expoCapture.saved", language));
    } catch {
      setMessage(copy("app.expoCapture.saveFailed", language));
    }
  }

  async function capturePhoto() {
    if (!cameraRef.current || !cameraReady || busy) return;
    setBusy(true);
    setMessage(null);
    let temporaryUri: string | null = null;
    try {
      const photo = await cameraRef.current.takePictureAsync({
        base64: true,
        quality: CAPTURE_IMAGE_QUALITY,
      });
      temporaryUri = photo.uri;
      await saveImage(photo.base64 ?? null, "image/jpeg");
    } catch {
      setMessage(copy("app.expoCapture.captureFailed", language));
    } finally {
      if (Platform.OS !== "web" && temporaryUri?.startsWith("file://")) {
        try {
          await removeCameraTemp(temporaryUri);
        } catch {
          setMessage(copy("app.expoCapture.tempCleanupFailed", language));
        }
      }
      setBusy(false);
    }
  }

  async function chooseNativePhoto() {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        base64: true,
        quality: CAPTURE_IMAGE_QUALITY,
        allowsEditing: false,
        exif: false,
      });
      if (!result.canceled) {
        const asset = result.assets[0];
        await saveImage(asset.base64 ?? null, asset.mimeType ?? "");
      }
    } catch {
      setMessage(copy("app.expoCapture.captureFailed", language));
    } finally {
      setBusy(false);
    }
  }


  function handleWebPhotoInput(input: HTMLInputElement) {
    if (processingFileRef.current) return;
    const file = input.files?.[0];
    if (!file) return;
    processingFileRef.current = true;
    if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
      setMessage(copy("app.expoCapture.fileTooLarge", language));
      input.value = "";
      processingFileRef.current = false;
      return;
    }

    setBusy(true);
    setMessage(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUri = typeof reader.result === "string" ? reader.result : "";
      const comma = dataUri.indexOf(",");
      const encoded = comma >= 0 ? dataUri.slice(comma + 1) : "";
      void saveImage(encoded || null, file.type).finally(() => {
        input.value = "";
        processingFileRef.current = false;
        setBusy(false);
      });
    };
    reader.onerror = () => {
      setMessage(copy("app.expoCapture.captureFailed", language));
      input.value = "";
      processingFileRef.current = false;
      setBusy(false);
    };
    try {
      reader.readAsDataURL(file);
    } catch {
      setMessage(copy("app.expoCapture.captureFailed", language));
      input.value = "";
      processingFileRef.current = false;
      setBusy(false);
    }
  }
  useEffect(() => {
    if (Platform.OS !== "web" || !ownerId || !storageReady || storageError) return;
    const input = document.querySelector<HTMLInputElement>("input[data-expo-photo-input]");
    if (!input) return;
    const handleChange = () => handleWebPhotoInput(input);
    input.addEventListener("change", handleChange);
    return () => input.removeEventListener("change", handleChange);
  }, [ownerId, storageReady, storageError, language]);

  return (
    <PreviewShell language={language} localPreview={localPreview}>
      <Text accessibilityRole="header" style={styles.title}>{copy("app.home.capture", language)}</Text>
      {owner.kind === "loading" ? (
        <Text accessibilityRole="text" style={styles.note}>{copy("app.capture.starting", language)}</Text>
      ) : null}
      {owner.kind === "signedOut" ? <SignInCard language={language} /> : null}
      {owner.kind === "error" ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.expoPreview.connectionError", language)}</Text>
        </View>
      ) : null}
      {ownerId && !storageReady && !storageError ? (
        <Text accessibilityRole="status" style={styles.note}>{copy("app.expoCapture.storageLoading", language)}</Text>
      ) : null}
      {ownerId && storageError ? (
        <View accessibilityRole="alert" style={styles.card}>
          <Text style={styles.body}>{copy("app.expoCapture.storageUnavailable", language)}</Text>
        </View>
      ) : null}
      {ownerId && storageReady && !storageError ? (
        <>
          {cameraPermission === null ? (
            <View style={styles.cameraFallback}>
              <Text style={styles.body}>{copy("app.capture.starting", language)}</Text>
            </View>
          ) : cameraPermission.granted && !cameraFailed ? (
            <CameraView
              ref={cameraRef}
              style={styles.camera}
              facing="back"
              onCameraReady={() => setCameraReady(true)}
              onMountError={() => {
                setCameraFailed(true);
                setCameraReady(false);
              }}
            />
          ) : (
            <View style={styles.cameraFallback}>
              <Text style={styles.body}>{copy("app.expoCapture.cameraUnavailable", language)}</Text>
              {cameraPermission.canAskAgain ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.secondary}
                  onPress={() => {
                    setCameraFailed(false);
                    setCameraReady(false);
                    void requestCameraPermission();
                  }}
                >
                  <Text style={styles.secondaryText}>{copy("app.capture.tapStart", language)}</Text>
                </Pressable>
              ) : null}
            </View>
          )}
          {cameraPermission?.granted && !cameraFailed ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={copy("app.capture.shutter", language)}
              disabled={!cameraReady || busy}
              style={[styles.shutter, (!cameraReady || busy) && styles.disabled]}
              onPress={() => void capturePhoto()}
            >
              <Text style={styles.shutterText}>{copy("app.capture.shutter", language)}</Text>
            </Pressable>
          ) : null}
          {Platform.OS === "web" ? (
            <View style={styles.pickerGroup}>
              <Text style={styles.note}>{copy("app.expoCapture.choosePhoto", language)}</Text>
              <input
                data-expo-photo-input="true"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                aria-label={copy("app.expoCapture.choosePhoto", language)}
                disabled={busy}
                style={{ width: "100%" }}
                onChange={(event) => handleWebPhotoInput(event.currentTarget)}
              />
            </View>
          ) : (
            <Pressable
              accessibilityRole="button"
              disabled={busy}
              style={[styles.secondary, busy && styles.disabled]}
              onPress={() => void chooseNativePhoto()}
            >
              <Text style={styles.secondaryText}>{copy("app.expoCapture.choosePhoto", language)}</Text>
            </Pressable>
          )}
          {busy ? (
            <Text accessibilityRole="status" style={styles.note}>
              {copy("app.expoCapture.saving", language)}
            </Text>
          ) : null}
          {message === copy("app.expoCapture.saved", language) ? (
            <Text accessibilityRole="status" style={styles.saved}>{message}</Text>
          ) : message ? (
            <View accessibilityRole="alert" style={styles.card}>
              <Text style={styles.body}>{message}</Text>
            </View>
          ) : null}
          <Link href="/inbox" asChild>
            <Pressable accessibilityRole="link" style={styles.inboxLink}>
              <Text style={styles.linkText}>{copy("app.inbox.title", language)}</Text>
            </Pressable>
          </Link>
        </>
      ) : null}
    </PreviewShell>
  );
}

const styles = StyleSheet.create({
  title: { color: "#180c0b", fontSize: 30, fontWeight: "800" },
  camera: { width: "100%", height: 440, borderRadius: 16, overflow: "hidden" },
  cameraFallback: { minHeight: 180, justifyContent: "center", alignItems: "center", gap: 14, borderRadius: 16, backgroundColor: "#ffffff", padding: 20 },
  card: { borderRadius: 16, backgroundColor: "#ffffff", padding: 20 },
  body: { color: "#64514c", fontSize: 16, lineHeight: 24, textAlign: "center" },
  shutter: { alignSelf: "center", minWidth: 180, alignItems: "center", borderRadius: 999, backgroundColor: "#f04c24", paddingHorizontal: 24, paddingVertical: 14 },
  shutterText: { color: "#170b08", fontSize: 17, fontWeight: "800" },
  secondary: { alignSelf: "center", borderRadius: 999, backgroundColor: "#ffffff", paddingHorizontal: 20, paddingVertical: 12 },
  secondaryText: { color: "#241a18", fontSize: 15, fontWeight: "700" },
  pickerGroup: { gap: 8, borderRadius: 12, backgroundColor: "#ffffff", padding: 12 },
  disabled: { opacity: 0.55 },
  note: { color: "#64514c", fontSize: 14, textAlign: "center", padding: 12 },
  saved: { color: "#245b33", backgroundColor: "#e2f1e5", padding: 12, borderRadius: 12, textAlign: "center" },
  inboxLink: { alignSelf: "center", borderRadius: 999, backgroundColor: "#ffffff", paddingHorizontal: 20, paddingVertical: 12 },
  linkText: { color: "#241a18", fontSize: 15, fontWeight: "700" },
});
