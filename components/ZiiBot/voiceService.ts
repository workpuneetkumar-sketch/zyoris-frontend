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

// Simplified global declaration
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
      this.recognition.lang = 'en-US';
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
      
      this.recognition.onresult = (event: SpeechRecognitionEvent) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
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
          this.onResultCallback?.(interimTranscript + '...');
        }
      };
      
      this.recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.warn('Speech recognition error:', event.error);
        this.onErrorCallback?.(event.error);
        this.isListening = false;
      };
      
      this.recognition.onend = () => {
        this.isListening = false;
      };
    }
    
    // Initialize Speech Synthesis - use window.speechSynthesis directly
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      this.synthesis = window.speechSynthesis;
      
      // Load voices
      this.loadVoices();
    }
  }

  // Load available voices
  private loadVoices(): void {
    if (!this.synthesis || this.voicesLoaded) return;
    
    try {
      // Try to get voices immediately
      this.voices = this.synthesis.getVoices() || [];
      
      if (this.voices.length > 0) {
        this.voicesLoaded = true;
        console.log('✅ Voices loaded:', this.voices.length);
        return;
      }
      
      // If no voices, wait for them to load
      this.synthesis.onvoiceschanged = () => {
        if (this.synthesis) {
          this.voices = this.synthesis.getVoices() || [];
          this.voicesLoaded = true;
          console.log('✅ Voices loaded:', this.voices.length);
        }
      };
      
      // Fallback: check again after a delay
      setTimeout(() => {
        if (!this.voicesLoaded && this.synthesis) {
          this.voices = this.synthesis.getVoices() || [];
          if (this.voices.length > 0) {
            this.voicesLoaded = true;
            console.log('✅ Voices loaded (fallback):', this.voices.length);
          }
        }
      }, 1000);
    } catch (e) {
      console.warn('⚠️ Could not load voices:', e);
    }
  }

  // Start listening for voice input
  startListening(onResult: (text: string) => void, onError?: (error: string) => void): boolean {
    if (!this.recognition) {
      onError?.('Speech recognition is not supported in this browser');
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
      onError?.('Failed to start listening. Please try again.');
      return false;
    }
  }

  // Stop listening
  stopListening(): void {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {
        // Ignore
      }
    }
    this.isListening = false;
  }

  // Check if currently listening
  isCurrentlyListening(): boolean {
    return this.isListening;
  }

  // Check if speech recognition is supported
  isSpeechSupported(): boolean {
    return !!this.recognition;
  }

  // Speak text (Voice Output)
  speak(text: string, onEnd?: () => void): void {
    if (!this.synthesis || typeof window === "undefined") {
      onEnd?.();
      return;
    }
    
    // Cancel any ongoing speech
    try {
      this.synthesis.cancel();
    } catch (e) {
      // Ignore
    }
    
    // Clean text - remove markdown and special characters
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\n/g, '. ')
      .replace(/\*/g, '')
      .replace(/#/g, '')
      .replace(/\d\.\s/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    // Don't speak empty text
    if (!cleanText) {
      onEnd?.();
      return;
    }
    
    try {
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'en-US';
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      
      // Try to find a good voice
      if (this.voices.length === 0) {
        // Try to reload voices
        this.loadVoices();
      }
      
      // Preferred voices in order
      const preferredNames = [
        'Google UK English Female',
        'Google US English', 
        'Samantha',
        'Alex',
        'Microsoft David',
        'Microsoft Zira'
      ];
      
      let preferredVoice = null;
      for (const name of preferredNames) {
        preferredVoice = this.voices.find(v => v.name && v.name.includes(name));
        if (preferredVoice) break;
      }
      
      // Fallback to any English voice
      if (!preferredVoice) {
        preferredVoice = this.voices.find(v => v.lang && v.lang.startsWith('en'));
      }
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => {
        onEnd?.();
      };
      
      utterance.onerror = () => {
        onEnd?.();
      };
      
      this.synthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis error:', e);
      onEnd?.();
    }
  }

  // Stop speaking
  stopSpeaking(): void {
    if (this.synthesis) {
      try {
        this.synthesis.cancel();
      } catch (e) {
        // Ignore
      }
    }
  }

  // Check if currently speaking
  isSpeaking(): boolean {
    try {
      return this.synthesis ? this.synthesis.speaking : false;
    } catch (e) {
      return false;
    }
  }

  // Check if speech synthesis is supported
  isSpeechSynthesisSupported(): boolean {
    return !!this.synthesis;
  }

  // Get available voices (for debugging)
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

// Load voices (call this once on app startup)
export function loadVoices(): void {
  if (typeof window === "undefined") return;
  try {
    const synthesis = window.speechSynthesis;
    if (synthesis) {
      // Trigger voice loading
      synthesis.getVoices();
    }
  } catch (e) {
    // Ignore
  }
}