"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Dispatch, SetStateAction } from "react";

interface SpeechRecognitionAlternative {
  transcript: string;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  0: SpeechRecognitionAlternative;
}

interface SpeechRecognitionResultList {
  length: number;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event?: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

type SpeechRecognitionWindow = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

interface UseSpeechDraftOptions {
  setDraftContent: Dispatch<SetStateAction<string>>;
}

interface UseSpeechDraftResult {
  hasSpeechSupport: boolean;
  isListening: boolean;
  interimTranscript: string;
  speechError: string | null;
  toggleListening: () => void;
  stopListening: () => void;
}

function getSpeechRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  const speechWindow = window as SpeechRecognitionWindow;
  return speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition ?? null;
}

// Client-only support flag via useSyncExternalStore — returns false on the
// server, the real value on the client, with no hydration mismatch and no
// setState-in-effect. Browser speech support doesn't change at runtime, so the
// subscription is a no-op.
const subscribeSpeechSupport = () => () => {};
const getSpeechSupportSnapshot = () => getSpeechRecognitionConstructor() !== null;
const getSpeechSupportServerSnapshot = () => false;

// Web Speech error codes that are part of normal operation, not failures:
// `aborted` fires whenever we call stop(); `no-speech` fires after a silent
// stretch. Neither should surface an error — onend decides whether to resume.
const BENIGN_SPEECH_ERRORS = new Set(["aborted", "no-speech"]);

function messageForSpeechError(code: string | undefined): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "Microphone access was blocked.";
    case "audio-capture":
      return "No microphone was found.";
    case "network":
      return "Voice dictation needs a connection.";
    default:
      return "Voice dictation stopped.";
  }
}

export function useSpeechDraft({
  setDraftContent,
}: UseSpeechDraftOptions): UseSpeechDraftResult {
  const [isListening, setIsListening] = useState(false);
  const hasSpeechSupport = useSyncExternalStore(
    subscribeSpeechSupport,
    getSpeechSupportSnapshot,
    getSpeechSupportServerSnapshot,
  );
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  // The user's intent. We auto-resume while this is true (browsers end the
  // session on their own after a pause); a manual stop clears it.
  const shouldListenRef = useRef(false);

  const stopListening = useCallback(() => {
    shouldListenRef.current = false;
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const startRecognition = useCallback(() => {
    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      setSpeechError("Voice dictation is not available in this browser.");
      return false;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event) => {
      let finalText = "";
      let interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const text = event.results[i][0].transcript.trim();
        if (event.results[i].isFinal) {
          finalText += `${text} `;
        } else {
          interimText = text;
        }
      }

      if (finalText) {
        setDraftContent((prev) => {
          const base = prev.trimEnd();
          const spacer = base ? " " : "";
          return `${base}${spacer}${finalText.trim()}`;
        });
      }
      setInterimTranscript(interimText);
    };

    recognition.onerror = (event) => {
      const code = event?.error;
      if (code && BENIGN_SPEECH_ERRORS.has(code)) {
        // Let onend decide whether to resume; don't alarm the user.
        setInterimTranscript("");
        return;
      }
      shouldListenRef.current = false;
      setSpeechError(messageForSpeechError(code));
      setInterimTranscript("");
      setIsListening(false);
    };

    recognition.onend = () => {
      setInterimTranscript("");
      // Browsers stop dictation on their own; resume if the user hasn't stopped.
      if (shouldListenRef.current) {
        try {
          recognition.start();
          return;
        } catch {
          shouldListenRef.current = false;
        }
      }
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      return true;
    } catch {
      setSpeechError("Voice dictation could not start.");
      return false;
    }
  }, [setDraftContent]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }
    setSpeechError(null);
    setInterimTranscript("");
    shouldListenRef.current = true;
    if (startRecognition()) {
      setIsListening(true);
    } else {
      shouldListenRef.current = false;
    }
  }, [isListening, startRecognition, stopListening]);

  useEffect(() => {
    return () => {
      // Stop without auto-resuming after the component is gone.
      shouldListenRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  return {
    hasSpeechSupport,
    isListening,
    interimTranscript,
    speechError,
    toggleListening,
    stopListening,
  };
}
