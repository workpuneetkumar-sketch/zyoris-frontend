// Voice Service for ZiiBot - Speech to Text & Text to Speech

// Type definitions for Web Speech API
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognition extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => void) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => void) | null;
  onend: ((this: SpeechRecognition, ev: Event) => void) | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognition;
}

declare global {
  interface Window {
    SpeechRecognition: SpeechRecognitionConstructor;
    webkitSpeechRecognition: SpeechRecognitionConstructor;
  }
}

export class VoiceService {
  private recognition: SpeechRecognition | null = null;
  private synthesis: SpeechSynthesis | null = null;
  private isListening = false;
  private onResultCallback: ((text: string) => void) | null = null;
  private onErrorCallback: ((error: string) => void) | null = null;
  private voicesLoaded = false;
  private voices: SpeechSynthesisVoice[] = [];

  constructor() {
    if (typeof window === "undefined") return;

    // Initialize Speech Recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      this.recognition = new SpeechRecognition();
      this.recognition.lang = "en-US";
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        if (finalTranscript) {
          this.onResultCallback?.(finalTranscript);
          this.stopListening();
        } else if (interimTranscript) {
          this.onResultCallback?.(interimTranscript + "...");
        }
      };

      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn("Speech recognition error:", event.error);
        this.onErrorCallback?.(event.error);
        this.isListening = false;
      };

      this.recognition.onend = () => {
        this.isListening = false;
      };
    }

    // Initialize Speech Synthesis
    if (typeof window !== "undefined" && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis;
      this.loadVoices();
    }
  }

  // Load available voices
  private loadVoices(): void {
    if (!this.synthesis) return;

    try {
      this.voices = this.synthesis.getVoices() || [];
      if (this.voices.length > 0) {
        this.voicesLoaded = true;
        return;
      }

      this.synthesis.onvoiceschanged = () => {
        if (this.synthesis) {
          this.voices = this.synthesis.getVoices() || [];
          this.voicesLoaded = true;
        }
      };

      setTimeout(() => {
        if (!this.voicesLoaded && this.synthesis) {
          this.voices = this.synthesis.getVoices() || [];
          if (this.voices.length > 0) {
            this.voicesLoaded = true;
          }
        }
      }, 500);
    } catch (e) {
      console.warn("Could not load voices:", e);
    }
  }

  // Start listening for voice input
  startListening(onResult: (text: string) => void, onError?: (error: string) => void): boolean {
    if (!this.recognition) {
      onError?.("Speech recognition is not supported in this browser");
      return false;
    }

    if (this.isListening) {
      this.stopListening();
    }

    this.onResultCallback = onResult;
    this.onErrorCallback = onError || null;
    this.isListening = true;

    try {
      this.recognition.start();
      return true;
    } catch (e) {
      this.isListening = false;
      onError?.("Failed to start listening. Please try again.");
      return false;
    }
  }

  // Stop listening
  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
    }
    this.isListening = false;
  }

  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  isSpeechSupported(): boolean {
    return !!this.recognition;
  }

  /**
   * Helper to select a natural, high-quality MALE voice
   */
  private selectMaleVoice(): SpeechSynthesisVoice | null {
    if (!this.voices || this.voices.length === 0) {
      if (this.synthesis) {
        this.voices = this.synthesis.getVoices() || [];
      }
    }

    if (this.voices.length === 0) return null;

    const femaleKeywords = [
      "female", "samantha", "victoria", "zira", "karen", "susan", "tessa",
      "moira", "fiona", "agnes", "kathy", "princess", "vicki", "veena",
      "alice", "jenny", "aria", "hazel", "catherine", "siri"
    ];

    // Priority ranked male voices across macOS, Chrome, Windows & Linux
    const preferredMaleNames = [
      "Google UK English Male",
      "Google US English Male",
      "Alex",
      "Daniel",
      "Microsoft David",
      "Microsoft Mark",
      "Microsoft George",
      "Microsoft Guy",
      "Fred",
      "Tom",
      "Oliver",
      "Aaron",
      "Arthur",
    ];

    // 1. Try to find a known preferred male voice
    for (const name of preferredMaleNames) {
      const match = this.voices.find(
        (v) => v.name && v.name.toLowerCase().includes(name.toLowerCase())
      );
      if (match) return match;
    }

    // 2. Search for any English voice with "male" in name and NOT containing female keywords
    const maleKeywordVoice = this.voices.find((v) => {
      const lower = (v.name || "").toLowerCase();
      const isEnglish = (v.lang || "").toLowerCase().startsWith("en");
      const hasMale = lower.includes("male") && !lower.includes("female");
      const hasFemale = femaleKeywords.some((f) => lower.includes(f));
      return isEnglish && hasMale && !hasFemale;
    });
    if (maleKeywordVoice) return maleKeywordVoice;

    // 3. Fallback: Any English voice that does NOT match female keywords
    const nonFemaleEnglish = this.voices.find((v) => {
      const lower = (v.name || "").toLowerCase();
      const isEnglish = (v.lang || "").toLowerCase().startsWith("en");
      const hasFemale = femaleKeywords.some((f) => lower.includes(f));
      return isEnglish && !hasFemale;
    });
    if (nonFemaleEnglish) return nonFemaleEnglish;

    // 4. Any English voice
    return this.voices.find((v) => (v.lang || "").toLowerCase().startsWith("en")) || this.voices[0] || null;
  }

  /**
   * Speak text with a clear MALE voice, excluding all emojis and noisy markdown symbols
   */
  speak(text: string, onEnd?: () => void): void {
    if (!this.synthesis || typeof window === "undefined") {
      onEnd?.();
      return;
    }

    // Cancel any ongoing speech
    try {
      this.synthesis.cancel();
    } catch {}

    // Clean text strictly: strip all emojis and clean markdown
    let cleanText = text
      // Remove all emojis using unicode property escapes & ranges
      .replace(/\p{Extended_Pictographic}/gu, "")
      .replace(
        /[\u{1F300}-\u{1F5FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{2300}-\u{23FF}]/gu,
        ""
      )
      // Strip code blocks
      .replace(/```[\s\S]*?```/g, " ")
      // Strip inline code backticks
      .replace(/`([^`]+)`/g, "$1")
      // Markdown links: [Title](url) -> Title
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      // Strip markdown formatting symbols
      .replace(/[*_#~>|]/g, " ")
      // Clean lists and bullets
      .replace(/^[•*-]\s+/gm, "")
      .replace(/^\d+\.\s+/gm, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      onEnd?.();
      return;
    }

    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = "en-US";
      // Male voice parameters: calm, articulate, slightly deeper natural male pitch
      utterance.rate = 0.96;
      utterance.pitch = 0.90;
      utterance.volume = 1.0;

      const maleVoice = this.selectMaleVoice();
      if (maleVoice) {
        utterance.voice = maleVoice;
      }

      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();

      this.synthesis.speak(utterance);
    } catch (e) {
      console.warn("Speech synthesis error:", e);
      onEnd?.();
    }
  }

  stopSpeaking(): void {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch {}
    }
  }

  isSpeaking(): boolean {
    try {
      return this.synthesis ? this.synthesis.speaking : false;
    } catch {
      return false;
    }
  }

  isSpeechSynthesisSupported(): boolean {
    return !!this.synthesis;
  }

  getVoices(): SpeechSynthesisVoice[] {
    return this.voices;
  }
}

// Singleton instance
let voiceServiceInstance: VoiceService | null = null;

export function getVoiceService(): VoiceService {
  if (!voiceServiceInstance) {
    voiceServiceInstance = new VoiceService();
  }
  return voiceServiceInstance;
}

export function loadVoices(): void {
  if (typeof window === "undefined") return;
  try {
    const synthesis = window.speechSynthesis;
    if (synthesis) {
      synthesis.getVoices();
    }
  } catch {}
}
