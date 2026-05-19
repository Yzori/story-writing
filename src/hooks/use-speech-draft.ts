"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export function useSpeechDraft({
  setDraftContent,
}: UseSpeechDraftOptions): UseSpeechDraftResult {
  const [isListening, setIsListening] = useState(false);
  const [hasSpeechSupport] = useState(() => getSpeechRecognitionConstructor() !== null);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
      return;
    }

    const SpeechRecognitionAPI = getSpeechRecognitionConstructor();
    if (!SpeechRecognitionAPI) {
      setSpeechError("Voice dictation is not available in this browser.");
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    setSpeechError(null);
    setInterimTranscript("");

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
      setSpeechError(
        event?.error === "not-allowed"
          ? "Microphone access was blocked."
          : "Voice dictation stopped.",
      );
      setInterimTranscript("");
      setIsListening(false);
    };

    recognition.onend = () => {
      setInterimTranscript("");
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setIsListening(true);
    } catch {
      setSpeechError("Voice dictation could not start.");
      setIsListening(false);
    }
  }, [isListening, setDraftContent, stopListening]);

  useEffect(() => {
    return () => {
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
