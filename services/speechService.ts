import Constants from "expo-constants";
import * as Speech from "expo-speech";

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

let cachedSpeechRecognitionModule: SpeechRecognitionModuleShape | null | undefined;

function isExpoGo(): boolean {
  return Constants.executionEnvironment === "storeClient";
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

// Check if speech recognition is available
export async function checkSpeechRecognitionAvailable(): Promise<boolean> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    return false;
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

// Request microphone permission for speech recognition
export async function requestSpeechPermission(): Promise<boolean> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    return false;
  }

  try {
    const result =
      await speechRecognition.ExpoSpeechRecognitionModule.requestPermissionsAsync();
    return result.granted;
  } catch {
    return false;
  }
}

// Start listening for speech
export async function startListening(
  language: string = "en-US",
): Promise<void> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    throw new Error("SPEECH_RECOGNITION_UNAVAILABLE");
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

// Stop listening
export async function stopListening(): Promise<void> {
  const speechRecognition = getSpeechRecognitionModule();
  if (!speechRecognition) {
    return;
  }

  try {
    await speechRecognition.ExpoSpeechRecognitionModule.stop();
  } catch (error) {
    console.error("Failed to stop speech recognition:", error);
  }
}

// Speak text aloud (text-to-speech)
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

// Stop speaking
export function stopSpeaking(): void {
  Speech.stop();
}

// Extract person info from speech (patterns like "I'm Mark", "My name is Mark", "This is Mark")
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

// Extract query from speech (patterns like "Who is Mark?")
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
  if (!speechRecognition?.useSpeechRecognitionEvent) {
    return;
  }

  speechRecognition.useSpeechRecognitionEvent(eventName, listener);
}
