import { File } from "expo-file-system";

export async function removeCameraTemp(uri: string): Promise<void> {
  if (!uri.startsWith("file://")) return;
  const file = new File(uri);
  if (file.exists) file.delete();
}
