// lib/notificationSound.ts
// Notification sound — Web Audio API, preference in localStorage
// AudioContext is created lazily on first user interaction to comply with
// browser autoplay policy (https://developer.chrome.com/blog/autoplay)

const PREF_KEY = "zyoris-notification-sound";

export function isSoundEnabled(): boolean {
  if (typeof window === "undefined") return true;
  const v = localStorage.getItem(PREF_KEY);
  if (v === null) {
    localStorage.setItem(PREF_KEY, "true"); // explicitly set default
    return true;
  }
  return v === "true";
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, String(enabled));
}

// ── AudioContext — created lazily, shared singleton ───────────────────────────

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  try {
    _ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return _ctx;
  } catch {
    return null;
  }
}

// Call this on any user interaction (click, keydown) to unlock audio context.
// We attach it once to the document so it fires before sound is ever needed.
let _unlockAttached = false;
export function attachAudioUnlock(): void {
  if (typeof window === "undefined" || _unlockAttached) return;
  _unlockAttached = true;

  const unlock = () => {
    const ctx = getCtx();
    if (ctx && ctx.state === "suspended") {
      void ctx.resume();
    }
    // Remove listeners once unlocked — we only need to do this once
    document.removeEventListener("click", unlock);
    document.removeEventListener("keydown", unlock);
    document.removeEventListener("touchstart", unlock);
  };

  document.addEventListener("click", unlock, { passive: true });
  document.addEventListener("keydown", unlock, { passive: true });
  document.addEventListener("touchstart", unlock, { passive: true });
}

// ── Chime sound (two-tone, 150ms) ─────────────────────────────────────────────

function buildChime(ctx: AudioContext): AudioBuffer {
  const sr = ctx.sampleRate;
  const dur = 0.18;
  const buf = ctx.createBuffer(1, Math.floor(sr * dur), sr);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
    const t = i / sr;
    const env = Math.exp(-t * 18);
    ch[i] = env * (0.5 * Math.sin(2 * Math.PI * 880 * t) + 0.3 * Math.sin(2 * Math.PI * 1320 * t));
  }
  return buf;
}

export async function playNotificationSound(): Promise<void> {
  if (!isSoundEnabled()) return;
  const ctx = getCtx();
  if (!ctx) return;

  try {
    if (ctx.state === "suspended") await ctx.resume();

    const src = ctx.createBufferSource();
    src.buffer = buildChime(ctx);

    const gain = ctx.createGain();
    gain.gain.value = 0.4;

    src.connect(gain);
    gain.connect(ctx.destination);
    src.start();
  } catch {
    // Silently ignore — audio may not be available in all environments
  }
}
