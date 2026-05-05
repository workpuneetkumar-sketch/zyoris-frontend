import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#050816] px-4 text-center">
      {/* 404 glow number */}
      <div className="relative mb-6 select-none">
        <span className="text-[9rem] font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-cyan-400 via-indigo-400 to-purple-500 leading-none"
          style={{ filter: "drop-shadow(0 0 40px rgba(99,102,241,0.5))" }}>
          404
        </span>
      </div>

      {/* Text */}
      <h1 className="text-2xl font-bold text-white mb-2">Page not found</h1>
      <p className="text-gray-400 text-sm max-w-xs mb-8">
        The route you requested doesn't exist in the Zyoris intelligence layer.
      </p>

      {/* Divider pill */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-10 h-px bg-white/10" />
        <div className="w-2 h-2 rounded-full bg-gradient-to-br from-cyan-400 to-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.8)]" />
        <div className="w-10 h-px bg-white/10" />
      </div>

      {/* Back button */}
      <Link
        href="/"
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 to-indigo-500 text-white text-sm font-medium shadow-[0_8px_24px_rgba(99,102,241,0.4)] hover:brightness-110 hover:-translate-y-0.5 transition-all duration-150"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to home
      </Link>
    </div>
  );
}
