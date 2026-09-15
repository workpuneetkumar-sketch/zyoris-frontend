// Sound effects for ZiiBot

export function playMessageSound() {
  if (typeof window === "undefined") return;
  
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create a pleasant notification sound
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // First beep (higher)
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.08);
    
    // Second beep (slightly lower, after a tiny gap)
    setTimeout(() => {
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      
      osc2.frequency.setValueAtTime(660, ctx.currentTime + 0.1);
      osc2.type = "sine";
      gain2.gain.setValueAtTime(0.06, ctx.currentTime + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc2.start(ctx.currentTime + 0.1);
      osc2.stop(ctx.currentTime + 0.18);
    }, 80);
  } catch {
    // Silently fail if audio not supported
  }
}

export function playSendSound() {
  if (typeof window === "undefined") return;
  
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    // Quick ascending tone
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.06);
    osc.type = "sine";
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.07);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.07);
  } catch {
    // Silently fail
  }
}