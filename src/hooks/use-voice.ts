"use client";

// Voice mode via the Web Speech API (Chromium browsers).
// - Wake mode: listens continuously for "hey jarvis", then goes active.
// - Active mode: transcribes the next utterance and hands it to onCommand.
// - speak(): TTS for JARVIS replies; listening pauses while speaking.

import { useCallback, useEffect, useRef, useState } from "react";

type VoiceState = "unsupported" | "off" | "wake" | "listening" | "speaking";

interface SpeechRecognitionLike {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
}

function getRecognitionCtor(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null) as (new () => SpeechRecognitionLike) | null;
}

export function useVoice(onCommand: (text: string) => Promise<string | void>) {
  const [state, setState] = useState<VoiceState>("off");
  const [transcript, setTranscript] = useState("");
  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const stateRef = useRef<VoiceState>("off");
  const enabledRef = useRef(false);
  stateRef.current = state;

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.05;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find((v) => v.lang.startsWith("en") && /Daniel|Google UK English Male|Male/i.test(v.name));
    if (preferred) utter.voice = preferred;
    setState("speaking");
    utter.onend = () => setState(enabledRef.current ? "wake" : "off");
    window.speechSynthesis.speak(utter);
  }, []);

  const handleFinal = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const lower = clean.toLowerCase();
      const wakeIdx = lower.indexOf("hey jarvis");
      const jarvisIdx = lower.indexOf("jarvis");

      if (stateRef.current === "wake") {
        // Wake word alone activates; wake word + command executes immediately
        if (wakeIdx === -1 && jarvisIdx === -1) return;
        const after = clean.slice((wakeIdx !== -1 ? wakeIdx + 10 : jarvisIdx + 6)).replace(/^[\s,.!?]+/, "");
        if (after.length > 2) {
          setTranscript(after);
          const reply = await onCommand(after);
          if (reply) speak(reply);
        } else {
          setState("listening");
          speak("Yes?");
        }
        return;
      }
      if (stateRef.current === "listening") {
        setTranscript(clean);
        const reply = await onCommand(clean);
        if (reply) speak(reply);
      }
    },
    [onCommand, speak]
  );

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) { setState("unsupported"); return; }
    enabledRef.current = true;
    const rec = new Ctor();
    rec.continuous = true;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) void handleFinal(r[0].transcript);
        else interim += r[0].transcript;
      }
      if (interim) setTranscript(interim);
    };
    rec.onend = () => {
      // Chrome stops recognition periodically — restart while enabled
      if (enabledRef.current && stateRef.current !== "speaking") {
        try { rec.start(); } catch { /* already started */ }
      }
    };
    rec.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        enabledRef.current = false;
        setState("unsupported");
      }
    };
    recRef.current = rec;
    try { rec.start(); setState("wake"); } catch { /* ignore double start */ }
  }, [handleFinal]);

  const stop = useCallback(() => {
    enabledRef.current = false;
    recRef.current?.abort();
    window.speechSynthesis?.cancel();
    setState("off");
  }, []);

  useEffect(() => () => { enabledRef.current = false; recRef.current?.abort(); }, []);

  return { state, transcript, start, stop, speak, supported: getRecognitionCtor() !== null };
}
