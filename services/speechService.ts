import { GoogleGenerativeAI } from "@google/generative-ai";
import Constants from "expo-constants";
import * as FileSystem from "expo-file-system/legacy";
import * as Speech from "expo-speech";
import { Audio } from "expo-av";
import { useEffect } from "react";

type SpeechRecognitionEventName = "start" | "end" | "result" | "error";

type SpeechRecognitionListener = (event: any) => void;

type SpeechRecognitionModuleShape = {
  ExpoSpeechRecognitionModule: {
    getStateAsync: () => Promise<any>;
    requestPermissionsAsync: () => Promise<{ granted: boolean }>;
    start: (options: Record<string, unknown>) => Promise<void>;
    stop: () => Promise<void>;
  };
  useSpeechRecognitionEvent?: (
    eventName: SpeechRecognitionEventName,
    listener: SpeechRecognitionListener,
  ) => void;
};

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;
const TRANSCRIPTION_MODEL = "gemini-2.5-flash";

let cachedSpeechRecognitionModule: SpeechRecognitionModuleShape | null | undefined;
let activeRecording: Audio.Recording | null = null;

const fallbackListeners: Record<
  SpeechRecognitionEventName,
  Set<SpeechRecognitionListener>
> = {
  start: new Set(),
  end: new Set(),
  result: new Set(),
  error: new Set(),
};

function emitFallbackEvent(
  eventName: SpeechRecognitionEventName,
  payload: any = {},
): void {
  for (const listener of fallbackListeners[eventName]) {
    try {
      listener(payload);
    } catch (error) {
      console.warn(`Speech listener for ${eventName} failed:`, error);
    }
  }
}

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
}

function hasGeminiTranscriptionFallback(): boolean {
  return !!genAI;
}

function getSpeechRecognitionModule(): SpeechRecognitionModuleShape | null {
  if (cachedSpeechRecognitionModule !== undefined) {
    return cachedSpeechRecognitionModule;
  }

  if (isExpoGo()) {
    cachedSpeechRecognitionModule = null;
    return cachedSpeechRecognitionModule;
  }

  try {
    cachedSpeechRecognitionModule =
      require("@jamsch/expo-speech-recognition") as SpeechRecognitionModuleShape;
  } catch {
    cachedSpeechRecognitionModule = null;
  }

  return cachedSpeechRecognitionModule;
}

function getAudioMimeType(uri: string): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith(".aac")) return "audio/aac";
  if (lower.endsWith(".mp3")) return "audio/mp3";
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".flac")) return "audio/flac";
  if (lower.endsWith(".m4a")) return "audio/aac";
  return "audio/aac";
}

async function transcribeWithGemini(uri: string): Promise<string> {
  if (!genAI) {
    throw new Error("GEMINI_KEY_MISSING");
  }

  const base64Audio = await FileSystem.readAsStringAsync(uri, {
    encoding: "base64",
  });

  const model = genAI.getGenerativeModel({ model: TRANSCRIPTION_MODEL });
  const result = await model.generateContent([
    "Generate a clean transcript of the speech in this audio. Return only the spoken words. No commentary.",
    {
      inlineData: {
        data: base64Audio,
        mimeType: getAudioMimeType(uri),
      },
    },
  ]);

  return result.response.text().trim();
}

async function startFallbackRecording(): Promise<void> {
  if (!hasGeminiTranscriptionFallback()) {
    throw new Error("SPEECH_RECOGNITION_UNAVAILABLE");
  }

  if (activeRecording) {
    return;
  }

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,
  });

  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
  await recording.startAsync();
  activeRecording = recording;
  emitFallbackEvent("start");
}

async function stopFallbackRecording(): Promise<void> {
  const recording = activeRecording;
  activeRecording = null;

  if (!recording) {
    emitFallbackEvent("end");
    return;
  }

  try {
    await recording.stopAndUnloadAsync();
    emitFallbackEvent("end");
    const uri = recording.getURI();
    if (!uri) {
      throw new Error("No recorded audio found.");
    }

    const transcript = await transcribeWithGemini(uri);
    if (!transcript) {
      throw new Error("No speech detected.");
    }

    emitFallbackEvent("result", {
      results: [{ transcript }],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not transcribe audio.";
    emitFallbackEvent("error", { message });
  } finally {
    await Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      playsInSilentModeIOS: true,
    });
  }
}

export async function checkSpeechRecognitionAvailable(): Promise<boolean> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    return hasGeminiTranscriptionFallback();
  }

  try {
    const result = await speechRecognition.ExpoSpeechRecognitionModule.getStateAsync();
    return typeof result === "object" && "isRecognitionAvailable" in result
      ? (result as any).isRecognitionAvailable
      : true;
  } catch {
    return false;
  }
}

export async function requestSpeechPermission(): Promise<boolean> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    const permission = await Audio.requestPermissionsAsync();
    return permission.granted;
  }

  try {
    const result =
      await speechRecognition.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

export async function startListening(
  language: string = "en-US",
): Promise<void> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    await startFallbackRecording();
    return;
  }

  try {
    await speechRecognition.ExpoSpeechRecognitionModule.start({
      lang: language,
      interimResults: true,
      maxAlternatives: 1,
      continuous: true,
      requiresOnDeviceRecognition: false,
      addsPunctuation: true,
    });
  } catch (error) {
    console.error("Failed to start speech recognition:", error);
    throw error;
  }
}

export async function stopListening(): Promise<void> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    await stopFallbackRecording();
    return;
  }

  try {
    await speechRecognition.ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    console.error("Failed to stop speech recognition:", error);
  }
}

export function speakText(
  text: string,
  onDone?: () => void,
  language: string = "en-US",
): void {
  Speech.speak(text, {
    language,
    rate: 0.9,
    onDone,
  });
}

export function stopSpeaking(): void {
  Speech.stop();
}

export function extractPersonFromSpeech(transcript: string): {
  name: string | null;
  details: string;
} {
  const lowerTranscript = transcript.toLowerCase();

  const patterns = [
    /(?:i'm|i am|my name is|this is|call me|they call me)\s+(\w+)/i,
    /(?:i'm|i am)\s+(\w+)/i,
    /^(\w+)(?:\s+here|\s+speaking)?$/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      const name =
        match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
      const nameIndex = lowerTranscript.indexOf(match[1].toLowerCase());
      const details = transcript.slice(nameIndex + match[1].length).trim();
      return {
        name,
        details: details || transcript,
      };
    }
  }

  return { name: null, details: transcript };
}

export function extractQueryFromSpeech(transcript: string): string | null {
  const patterns = [
    /who\s+is\s+(\w+)/i,
    /tell\s+me\s+about\s+(\w+)/i,
    /do\s+you\s+know\s+(\w+)/i,
    /remember\s+(\w+)/i,
  ];

  for (const pattern of patterns) {
    const match = transcript.match(pattern);
    if (match && match[1]) {
      return match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
    }
  }

  return null;
}

export function useSpeechRecognitionEvent(
  eventName: SpeechRecognitionEventName,
  listener: SpeechRecognitionListener,
): void {
  const speechRecognition = getSpeechRecognitionModule();
  if (speechRecognition?.useSpeechRecognitionEvent) {
    speechRecognition.useSpeechRecognitionEvent(eventName, listener);
    return;
  }

  useEffect(() => {
    fallbackListeners[eventName].add(listener);
    return () => {
      fallbackListeners[eventName].delete(listener);
    };
  }, [eventName, listener]);
}
