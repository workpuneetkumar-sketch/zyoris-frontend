import React from "react";

export default function BrandPanel() {
  return (
    <div className="hidden md:flex flex-col items-center justify-center w-full md:w-2/5 bg-[#00194A] text-white p-8 relative overflow-hidden rounded-l-2xl">
      {/* Background graphic/waves (using CSS for a simple gradient simulation) */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(ellipse_at_bottom,_var(--tw-gradient-stops))] from-[#002B7F] via-[#00194A] to-[#001033]"></div>
      
      {/* Abstract wave SVG could go here, for now using a subtle glowing effect */}
      <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-[#0044CC]/20 to-transparent z-0"></div>

      <div className="relative z-10 flex flex-col items-center text-center">
        <div className="w-24 h-24 mb-6 relative flex justify-center">
          <img 
            src="/logo.jpeg" 
            alt="Zyoris Logo" 
            className="w-full h-full object-contain drop-shadow-2xl rounded-xl" 
          />
        </div>
        
        <h2 className="text-3xl uppercase mb-4 tracking-widest" style={{ fontFamily: '"Neuropol X", "Neuropol X Free", sans-serif' }}>zyoris</h2>
        <p className="text-[#8FB3FF] text-sm max-w-[200px] leading-relaxed">
          Smart solutions.<br />
          Stronger tomorrow.
        </p>
      </div>
    </div>
  );
}
