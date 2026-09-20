"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { registerAgent } from "@/lib/api/agentApi";
import { toast } from "react-toastify";
import { Bot, ArrowLeft, Save } from "lucide-react";
import type { RegisterAgentPayload } from "@/types/agents";

export default function NewAgentPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !purpose.trim()) {
      toast.error("Name and Purpose are required");
      return;
    }
    
    setSaving(true);
    try {
      const payload: RegisterAgentPayload = {
        name: name.trim(),
        purpose: purpose.trim(),
        riskTier: "LOW",
        permissionLevel: "READ_ONLY",
        allowedTools: [],
        dataScope: {},
        modelPolicy: {},
        memoryPolicy: {},
      };
      
      const newAgent = await registerAgent(payload);
      toast.success("Agent registered successfully!");
      router.push(`/agents/${newAgent.id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to register agent");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => router.back()}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Bot size={20} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Register New Agent</h1>
              <p className="text-sm text-gray-500 font-medium">Create a new AI agent in the registry</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Agent Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="e.g. Sales Assistant"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Purpose
            </label>
            <textarea
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              rows={3}
              className="w-full text-sm px-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-100 transition-all resize-none"
              placeholder="Describe what this agent does..."
            />
          </div>

          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save size={16} />
              {saving ? "Registering..." : "Register Agent"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
