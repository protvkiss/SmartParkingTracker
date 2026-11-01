// src/services/audioService.js
// Quản lý ghi âm và phát âm thanh tương thích Expo Go mới nhất (expo-audio)
import { Alert } from "react-native";

let ExpoAudio = null;

try {
  // Nạp an toàn tránh lỗi thiếu native module làm sập toàn bộ ứng dụng
  ExpoAudio = require("expo-audio");
} catch (e) {
  ExpoAudio = null;
}

export function isAudioFeatureAvailable() {
  return Boolean(
    ExpoAudio &&
      (ExpoAudio.AudioModule ||
        ExpoAudio.createAudioPlayer ||
        ExpoAudio.requestRecordingPermissionsAsync),
  );
}

/**
 * Yêu cầu quyền Micro
 */
export async function requestMicPermission() {
  if (!ExpoAudio) {
    Alert.alert(
      "Thông báo",
      "Tính năng ghi âm chỉ dẫn giọng nói yêu cầu hỗ trợ expo-audio trên thiết bị.",
    );
    return false;
  }

  try {
    if (ExpoAudio.requestRecordingPermissionsAsync) {
      const res = await ExpoAudio.requestRecordingPermissionsAsync();
      return res.granted || res.status === "granted";
    }
    if (ExpoAudio.AudioModule?.requestRecordingPermissionsAsync) {
      const res = await ExpoAudio.AudioModule.requestRecordingPermissionsAsync();
      return res.granted || res.status === "granted";
    }
    return true;
  } catch (err) {
    console.warn("Lỗi kiểm tra quyền mic:", err);
    return false;
  }
}

/**
 * Bắt đầu ghi âm giọng nói
 */
export async function beginVoiceRecording() {
  const granted = await requestMicPermission();
  if (!granted) return null;

  try {
    const audioModule = ExpoAudio?.AudioModule;
    if (audioModule?.setAudioModeAsync) {
      await audioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });
    }

    const preset = ExpoAudio.RecordingPresets?.HIGH_QUALITY || {};

    const RecorderClass = audioModule?.AudioRecorder || ExpoAudio.AudioRecorder;
    if (!RecorderClass) {
      Alert.alert("Ghi âm", "Bộ ghi âm không khả dụng trên phiên bản runtime này.");
      return null;
    }

    const recorder = new RecorderClass(preset);
    if (recorder.prepareToRecordAsync) {
      await recorder.prepareToRecordAsync();
    }
    if (recorder.record) {
      recorder.record();
    }
    return recorder;
  } catch (err) {
    console.warn("Lỗi bắt đầu ghi âm:", err);
    Alert.alert("Lỗi ghi âm", "Không thể khởi tạo bộ ghi âm trên thiết bị.");
    return null;
  }
}

/**
 * Dừng ghi âm và lấy đường dẫn file
 */
export async function finishVoiceRecording(recorder) {
  if (!recorder) return null;
  try {
    if (recorder.stop) {
      await recorder.stop();
    }
    const uri = recorder.uri;

    const audioModule = ExpoAudio?.AudioModule;
    if (audioModule?.setAudioModeAsync) {
      await audioModule.setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: false,
      });
    }

    return uri;
  } catch (err) {
    console.warn("Lỗi kết thúc ghi âm:", err);
    return null;
  }
}

/**
 * Tạo bộ phát âm thanh an toàn
 */
export function createSafeAudioPlayer(uri, onStatusUpdate) {
  if (!ExpoAudio || !uri) {
    return {
      play: () => {
        Alert.alert("Phát âm thanh", "Thiết bị chưa hỗ trợ phát file âm thanh này.");
      },
      pause: () => {},
      stop: () => {},
      release: () => {},
      isPlaying: false,
    };
  }

  try {
    let player = null;
    if (ExpoAudio.createAudioPlayer) {
      player = ExpoAudio.createAudioPlayer(uri);
    } else if (ExpoAudio.AudioModule?.AudioPlayer) {
      player = new ExpoAudio.AudioModule.AudioPlayer(uri);
    }

    if (!player) return null;

    if (onStatusUpdate) {
      player.addListener?.("playbackStatusUpdate", (status) => {
        onStatusUpdate(status);
      });
    }

    return player;
  } catch (err) {
    console.warn("Lỗi tạo audio player:", err);
    return null;
  }
}
