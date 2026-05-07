export default function Loading() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050816]">
      {/* Glowing orb */}
      <div className="relative flex items-center justify-center mb-8">
        <div className="absolute w-24 h-24 rounded-full bg-cyan-500/20 animate-ping" />
        <div className="absolute w-16 h-16 rounded-full bg-indigo-500/30 animate-pulse" />
        <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_32px_rgba(99,102,241,0.7)]" />
      </div>

      {/* Spinner bar */}
      <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mb-6">
        <div className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 rounded-full animate-[shimmer_1.4s_ease-in-out_infinite]"
          style={{ animation: "shimmer 1.4s ease-in-out infinite" }}
        />
      </div>

      <p className="text-sm text-gray-400 tracking-widest uppercase animate-pulse">
        Loading Zyoris…
      </p>

      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(250%); }
        }
      `}</style>
    </div>
  );
}
