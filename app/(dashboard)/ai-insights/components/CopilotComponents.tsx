import { Brain, MessageSquare, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AiCopilotPanel({ 
  chatHistory, 
  chatMessage, 
  setChatMessage, 
  isChatLoading, 
  isProcessing, 
  handleSendMessage,
  chatEndRef
}: any) {
  return (
    <div className="bg-white border border-slate-200/60 rounded-[32px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-[500px] flex flex-col overflow-hidden relative">
      <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-blue-50 to-transparent rounded-full pointer-events-none" />
      
      <div className="p-6 border-b border-slate-100 bg-white/50 backdrop-blur-md relative z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-xl flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <Brain size={20} />
            </div>
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900">AI Dataset Copilot</h3>
            <p className="text-[11px] text-slate-500 font-semibold tracking-wide uppercase">Online & Ready</p>
          </div>
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50 custom-scrollbar relative z-10">
        {chatHistory.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 space-y-5">
            <div className="p-4 bg-white rounded-full shadow-sm border border-slate-100">
              <MessageSquare size={24} className="text-blue-500" />
            </div>
            <p className="text-sm font-medium text-slate-600">I've analyzed the dataset. What would you like to know?</p>
            
            <div className="flex flex-wrap justify-center gap-2 mt-2 w-4/5">
              {["Summarize the top anomalies", "Forecast next quarter's trend", "Find hidden correlations"].map(q => (
                <button 
                  key={q} 
                  onClick={() => handleSendMessage(q)}
                  className="px-4 py-2 bg-white border border-slate-200 hover:border-blue-300 hover:bg-blue-50 text-slate-700 text-[11px] font-bold rounded-xl transition-all shadow-sm"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence>
            {chatHistory.map((msg: any, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[85%] rounded-[20px] px-5 py-4 text-sm leading-relaxed shadow-sm font-medium
                  ${msg.role === 'user' 
                    ? 'bg-blue-600 text-white rounded-br-sm' 
                    : 'bg-white border border-slate-200/60 text-slate-700 rounded-bl-sm'
                  }`}
                >
                  {msg.content}
                </div>
              </motion.div>
            ))}
            {isChatLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
                <div className="bg-white border border-slate-200/60 rounded-[20px] rounded-bl-sm px-6 py-5 flex items-center gap-2.5 shadow-sm">
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200" />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}
        <div ref={chatEndRef} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatMessage); }} className="p-4 bg-white border-t border-slate-100 relative z-10">
        <div className="relative flex items-center">
          <input
            type="text"
            value={chatMessage}
            onChange={e => setChatMessage(e.target.value)}
            placeholder="Ask Copilot..."
            className="w-full bg-slate-50 border border-slate-200 rounded-[16px] pl-5 pr-14 py-3.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition text-slate-900 placeholder-slate-400"
            disabled={isChatLoading || isProcessing}
          />
          <button 
            type="submit"
            disabled={!chatMessage.trim() || isChatLoading || isProcessing}
            className="absolute right-2.5 p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-all shadow-md shadow-blue-500/20"
          >
            <Send size={16} />
          </button>
        </div>
      </form>
    </div>
  );
}
