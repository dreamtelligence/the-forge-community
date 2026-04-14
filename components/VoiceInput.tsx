'use client';

import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
  onTranscript: (text: string) => void;
  variant?: 'full' | 'icon';
}

export function VoiceInput({ onTranscript, variant = 'full' }: VoiceInputProps) {
  const [isListening, setIsListening] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [supported, setSupported] = useState(true);
  const recognitionRef = useRef<any>(null);
  const isIconOnly = variant === 'icon';

  useEffect(() => {
    // Check if browser supports Speech Recognition
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSupported(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'de-DE'; // German

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') {
        return;
      }
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        alert('Mikrofon-Zugriff wurde verweigert. Bitte in den Browser-Einstellungen erlauben.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Only init once

  async function toggleListening() {
    if (!recognitionRef.current) {
      alert('Spracherkennung wird von diesem Browser nicht unterstützt.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      // Processing will happen via onresult/onend if we wanted, 
      // but here we trigger polish manually on the last transcript
      if (transcript.trim()) {
        await polishText(transcript);
      }
    } else {
      setTranscript('');
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (e) {
        console.error('Failed to start recognition', e);
      }
    }
  }

  async function polishText(rawText: string) {
    setIsPolishing(true);
    try {
      const response = await fetch('/api/voice/polish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });

      if (!response.ok) throw new Error('Polish failed');

      const data = await response.json();
      onTranscript(data.polished);
      setTranscript('');
    } catch (error) {
      console.error('Text polishing failed:', error);
      // Fallback: use raw transcript
      onTranscript(rawText);
    } finally {
      setIsPolishing(false);
    }
  }

  if (!supported) {
    return null; // Hide button if not supported
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={toggleListening}
        disabled={isPolishing}
        aria-label={isListening ? 'Diktieren stoppen' : 'Diktieren'}
        title={isListening ? 'Diktieren stoppen' : 'Diktieren'}
        className={`flex items-center gap-2 rounded-lg font-bold text-xs uppercase tracking-widest transition-all ${
          isListening
            ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
            : 'bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10'
        } ${isIconOnly ? 'p-2' : 'px-4 py-2'} disabled:opacity-50`}
      >
        {isPolishing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {!isIconOnly && 'AI poliert...'}
          </>
        ) : isListening ? (
          <>
            <MicOff className="w-4 h-4" />
            {!isIconOnly && 'Stop'}
          </>
        ) : (
          <>
            <Mic className="w-4 h-4" />
            {!isIconOnly && 'Diktieren'}
          </>
        )}
        {isIconOnly && <span className="sr-only">Diktieren</span>}
      </button>

      {/* Live Transcript Preview */}
      <AnimatePresence>
        {isListening && transcript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={`absolute top-full left-0 mt-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 z-50 ${
              isIconOnly ? 'min-w-[240px] max-w-[calc(100vw-32px)]' : 'min-w-[300px] max-w-[500px]'
            }`}
          >
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-red-400">
                Aufnahme läuft...
              </span>
            </div>
            <p className="text-xs text-white/80 leading-relaxed">
              {transcript}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
