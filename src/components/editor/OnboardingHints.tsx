"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ONBOARDING_KEY = "inkwell-editor-onboarding-seen";
const ONBOARDING_STEP_KEY = "inkwell-editor-onboarding-step";

interface Hint {
  id: string;
  title: string;
  message: string;
  position: { top?: string; bottom?: string; left?: string; right?: string };
  arrowDirection: "left" | "down" | "up" | "right";
}

const hints: Hint[] = [
  {
    id: "sidebar",
    title: "Chapters live here",
    message:
      "Hover the left edge to see your chapters, add new ones, and access all your writing tools.",
    position: { top: "50%", left: "56px" },
    arrowDirection: "left",
  },
  {
    id: "formatting",
    title: "Format as you write",
    message:
      "Select any text to see formatting options, or type / to insert headings, quotes, and scene breaks.",
    position: { top: "30%", left: "50%" },
    arrowDirection: "up",
  },
  {
    id: "commands",
    title: "Your command palette",
    message: "", // filled dynamically for platform detection
    position: { bottom: "72px", right: "24px" },
    arrowDirection: "down",
  },
  {
    id: "status",
    title: "Track your progress",
    message:
      "Your words are auto-saved. Use the status bar for quick access to goals, story bible, and settings.",
    position: { bottom: "72px", left: "50%" },
    arrowDirection: "down",
  },
];

function Arrow({ direction }: { direction: Hint["arrowDirection"] }) {
  const base = "absolute w-0 h-0";

  switch (direction) {
    case "left":
      return (
        <div
          className={`${base} top-1/2 -left-[10px] -translate-y-1/2`}
          style={{
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderRight: "10px solid var(--color-elevated, #1e1e2e)",
          }}
        />
      );
    case "right":
      return (
        <div
          className={`${base} top-1/2 -right-[10px] -translate-y-1/2`}
          style={{
            borderTop: "8px solid transparent",
            borderBottom: "8px solid transparent",
            borderLeft: "10px solid var(--color-elevated, #1e1e2e)",
          }}
        />
      );
    case "up":
      return (
        <div
          className={`${base} -top-[10px] left-1/2 -translate-x-1/2`}
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderBottom: "10px solid var(--color-elevated, #1e1e2e)",
          }}
        />
      );
    case "down":
      return (
        <div
          className={`${base} -bottom-[10px] left-1/2 -translate-x-1/2`}
          style={{
            borderLeft: "8px solid transparent",
            borderRight: "8px solid transparent",
            borderTop: "10px solid var(--color-elevated, #1e1e2e)",
          }}
        />
      );
  }
}

interface OnboardingHintsProps {
  onComplete?: () => void;
}

export default function OnboardingHints({ onComplete }: OnboardingHintsProps) {
  const [currentStep, setCurrentStep] = useState<number | null>(null);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    const seen = localStorage.getItem(ONBOARDING_KEY);
    if (seen === "true") {
      setCurrentStep(null);
      return;
    }

    const savedStep = localStorage.getItem(ONBOARDING_STEP_KEY);
    const step = savedStep ? parseInt(savedStep, 10) : 0;

    if (step >= hints.length) {
      localStorage.setItem(ONBOARDING_KEY, "true");
      setCurrentStep(null);
      return;
    }

    setCurrentStep(step);

    if (typeof navigator !== "undefined" && /Mac/.test(navigator.platform)) {
      setIsMac(true);
    }
  }, []);

  const dismiss = useCallback(() => {
    if (currentStep === null) return;

    const nextStep = currentStep + 1;

    if (nextStep >= hints.length) {
      localStorage.setItem(ONBOARDING_KEY, "true");
      localStorage.setItem(ONBOARDING_STEP_KEY, String(nextStep));
      setCurrentStep(null);
      onComplete?.();
    } else {
      localStorage.setItem(ONBOARDING_STEP_KEY, String(nextStep));
      setCurrentStep(nextStep);
    }
  }, [currentStep, onComplete]);

  useEffect(() => {
    if (currentStep === null) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        dismiss();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep, dismiss]);

  if (currentStep === null) return null;

  const hint = hints[currentStep];
  const shortcut = isMac ? "\u2318K" : "Ctrl+K";
  const message =
    hint.id === "commands"
      ? `Press / or ${shortcut} to open commands \u2014 export, search, toggle panels, and more.`
      : hint.message;

  const transforms: string[] = [];
  if (hint.position.top === "50%" && !hint.position.bottom) {
    transforms.push("translateY(-50%)");
  }
  if (hint.position.left === "50%" && !hint.position.right) {
    transforms.push("translateX(-50%)");
  }
  const transformStyle: React.CSSProperties = transforms.length > 0 ? { transform: transforms.join(" ") } : {};

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={hint.id}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="fixed z-50 max-w-[280px]"
        style={{
          ...hint.position,
          ...transformStyle,
        }}
      >
        <div className="relative bg-elevated/95 backdrop-blur-xl border border-amber/20 rounded-xl shadow-2xl p-4">
          <Arrow direction={hint.arrowDirection} />

          <h3 className="text-sm font-semibold text-amber mb-1.5">
            {hint.title}
          </h3>

          <p className="text-sm text-text-secondary leading-relaxed mb-3">
            {message}
          </p>

          <div className="flex items-center justify-between">
            <span className="text-xs text-text-ghost">
              {currentStep + 1} of {hints.length}
            </span>

            <button
              onClick={dismiss}
              className="px-3 py-1 text-xs font-medium rounded-lg bg-amber/15 text-amber hover:bg-amber/25 transition-colors cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
