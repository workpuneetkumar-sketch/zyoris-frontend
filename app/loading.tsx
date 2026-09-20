export default function GlobalLoading() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
      <div className="flex flex-col items-center gap-4">
        {/* Animated Brand Pulse Badge */}
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-blue-500 shadow-xl shadow-blue-500/20 flex items-center justify-center animate-pulse">
            <span className="text-white font-extrabold text-2xl tracking-tighter">Z</span>
          </div>
          <div className="absolute -inset-2 rounded-3xl border-2 border-blue-400/30 animate-ping pointer-events-none" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "0ms" }} />
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "150ms" }} />
          <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
        <p className="text-xs font-semibold text-slate-400 tracking-wider uppercase">Loading Zyoris CRM...</p>
      </div>
    </div>
  );
}