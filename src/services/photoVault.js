import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

const STORAGE_FOLDER = "smart-parking-vault";

function detectExtension(uri) {
  if (!uri) return "jpg";
  const raw = uri.split("?")[0];
  const ext = raw.split(".").pop()?.toLowerCase();
  return ext && ext.length <= 4 ? ext : "jpg";
}

export function archiveSnapshot(sourceUri) {
  if (!sourceUri || Platform.OS === "web") return sourceUri;

  try {
    const vaultDir = new Directory(Paths.document, STORAGE_FOLDER);
    vaultDir.create({ idempotent: true, intermediates: true });

    const ext = detectExtension(sourceUri);
    const targetName = `snapshot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const destination = new File(vaultDir, targetName);
    const source = new File(sourceUri);

    source.copy(destination);
    return destination.uri;
  } catch (err) {
    console.warn("Lỗi lưu trữ ảnh:", err);
    return sourceUri;
  }
}

export function evictSnapshot(storedUri) {
  if (!storedUri || Platform.OS === "web") return;
  if (!storedUri.includes(`/${STORAGE_FOLDER}/`)) return;

  try {
    const file = new File(storedUri);
    if (file.exists) {
      file.delete();
    }
  } catch (err) {
    console.warn("Lỗi xóa ảnh:", err);
  }
}
