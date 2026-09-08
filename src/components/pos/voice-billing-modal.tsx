"use client";

import React, { useState, useEffect } from "react";
import { usePosStore } from "@/lib/pos-store";
import { X, Mic, MicOff, Sparkles, CheckCircle2, AlertCircle, Volume2, ArrowRight } from "lucide-react";

export const VoiceBillingModal: React.FC = () => {
  const { isVoiceBillingOpen, setIsVoiceBillingOpen, processVoiceBilling } = usePosStore();
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>("");
  const [result, setResult] = useState<{ matched: number; errors: string[] } | null>(null);

  useEffect(() => {
    if (isVoiceBillingOpen) {
      setIsListening(true);
      setTranscript("");
      setResult(null);
    } else {
      setIsListening(false);
    }
  }, [isVoiceBillingOpen]);

  if (!isVoiceBillingOpen) return null;

  const handleVoiceCommand = (text: string) => {
    setTranscript(text);
    const res = processVoiceBilling(text);
    setResult(res);
  };

  const sampleVoicePrompts = [
    "Add 2 Dolo 650 and 3 Fortune Sunflower Oil",
    "2 Augmentin 625, 1 Tata Tea Gold, Cash",
    "5 Aashirvaad Atta, 1 Asian Paints",
    "Add 1 Samsung Galaxy S24 Ultra",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Glow Header */}
        <div className="relative p-6 bg-gradient-to-br from-indigo-900 via-purple-900 to-slate-900 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-indigo-300 border border-white/20 shadow-inner">
                <Sparkles className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <h3 className="text-lg font-black tracking-tight">
                  लेखा जोखा AI Voice Billing
                </h3>
                <p className="text-xs text-indigo-200">
                  Hinglish & English Multi-Item Dictation Engine
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsVoiceBillingOpen(false)}
              className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Interactive Audio Visualizer */}
        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center justify-center py-4 space-y-4">
            {/* Waveform Bars */}
            <div className="flex items-center justify-center gap-1.5 h-16 w-full">
              {[40, 75, 95, 60, 30, 85, 100, 70, 45, 90, 60, 35, 80, 50, 20].map((h, i) => (
                <div
                  key={i}
                  className={`w-1.5 rounded-full bg-gradient-to-t from-indigo-600 to-violet-400 transition-all duration-300 ${
                    isListening ? "animate-pulse" : "opacity-30"
                  }`}
                  style={{
                    height: isListening ? `${Math.max(12, h * (0.5 + Math.random() * 0.5))}%` : "12px",
                    animationDelay: `${i * 70}ms`,
                  }}
                />
              ))}
            </div>

            {/* Mic Toggle Button */}
            <button
              type="button"
              onClick={() => setIsListening(!isListening)}
              className={`w-16 h-16 rounded-full flex items-center justify-center shadow-xl transition transform active:scale-95 ${
                isListening
                  ? "bg-rose-500 text-white ring-4 ring-rose-300 dark:ring-rose-900 animate-pulse"
                  : "bg-indigo-600 text-white hover:bg-indigo-500"
              }`}
            >
              {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
            </button>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {isListening ? "Listening... Speak your order naturally" : "Click to speak"}
            </p>
          </div>

          {/* Transcript input box */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              <Volume2 className="w-4 h-4 text-indigo-600" /> Voice Transcript / Text Input:
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="e.g. 'Add 2 Dolo 650, 3 Tata Tea, Cash'..."
                className="w-full px-4 py-2.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 font-medium"
              />
              <button
                type="button"
                onClick={() => handleVoiceCommand(transcript)}
                className="px-4 py-2.5 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shrink-0"
              >
                Execute
              </button>
            </div>
          </div>

          {/* Results Feedback */}
          {result && (
            <div className="space-y-2">
              {result.matched > 0 && (
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs flex items-center gap-2 text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span className="font-bold">
                    Successfully added {result.matched} item(s) to the POS cart!
                  </span>
                </div>
              )}
              {result.errors.length > 0 && (
                <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs space-y-1 text-rose-800 dark:text-rose-300">
                  {result.errors.map((err, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{err}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Suggested Prompts */}
          <div>
            <span className="text-[11px] font-bold text-slate-500">
              Try clicking an example voice prompt:
            </span>
            <div className="flex flex-col gap-1.5 mt-2">
              {sampleVoicePrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleVoiceCommand(prompt)}
                  className="flex items-center justify-between p-2.5 text-left text-xs bg-slate-50 dark:bg-slate-800/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl border border-slate-200 dark:border-slate-800 transition group"
                >
                  <span className="font-medium truncate">&ldquo;{prompt}&rdquo;</span>
                  <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex justify-end">
          <button
            onClick={() => setIsVoiceBillingOpen(false)}
            className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow transition"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
