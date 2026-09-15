"use client";

import { useState } from "react";
import { 
    Sparkles, 
    RefreshCw, 
    AlertCircle, 
    Smile, 
    Meh, 
    Frown, 
    FileText, 
    MessageSquare, 
    ChevronRight, 
    X,
    TrendingUp
} from "lucide-react";
import { 
    fetchAISummary, 
    fetchAISentiment, 
    fetchAISuggestions 
} from "@/lib/api/whatsappApi";

interface AIInsightsCacheItem {
    summary?: string;
    sentiment?: string;
    score?: number;
    suggestions?: string[];
}

interface SectionState {
    loading: boolean;
    error: string | null;
}

interface AIInsightsPanelProps {
    conversationId: string;
    contactName: string;
    onSelectSuggestion: (text: string) => void;
    onClose?: () => void;
}

export function AIInsightsPanel({
    conversationId,
    contactName,
    onSelectSuggestion,
    onClose
}: AIInsightsPanelProps) {
    // Cache per conversation ID
    const [cache, setCache] = useState<Record<string, AIInsightsCacheItem>>({});
    
    // Per-section loading and error states for current active conversation
    const [sectionStates, setSectionStates] = useState<Record<string, {
        summary: SectionState;
        sentiment: SectionState;
        suggestions: SectionState;
    }>>({});

    const currentCache = cache[conversationId] || {};
    const currentStates = sectionStates[conversationId] || {
        summary: { loading: false, error: null },
        sentiment: { loading: false, error: null },
        suggestions: { loading: false, error: null }
    };

    const updateSectionState = (section: 'summary' | 'sentiment' | 'suggestions', state: Partial<SectionState>) => {
        setSectionStates(prev => ({
            ...prev,
            [conversationId]: {
                ...currentStates,
                [section]: {
                    ...(prev[conversationId]?.[section] || { loading: false, error: null }),
                    ...state
                }
            }
        }));
    };

    const updateCache = (data: Partial<AIInsightsCacheItem>) => {
        setCache(prev => ({
            ...prev,
            [conversationId]: {
                ...(prev[conversationId] || {}),
                ...data
            }
        }));
    };

    const handleGenerateSummary = async () => {
        updateSectionState('summary', { loading: true, error: null });
        try {
            const res = await fetchAISummary(conversationId);
            updateCache({ summary: res.summary });
            updateSectionState('summary', { loading: false, error: null });
        } catch (err: any) {
            console.error("AI Summary error:", err);
            updateSectionState('summary', { 
                loading: false, 
                error: err?.message || "Failed to generate summary." 
            });
        }
    };

    const handleGenerateSentiment = async () => {
        updateSectionState('sentiment', { loading: true, error: null });
        try {
            const res = await fetchAISentiment(conversationId);
            updateCache({ sentiment: res.sentiment, score: res.score });
            updateSectionState('sentiment', { loading: false, error: null });
        } catch (err: any) {
            console.error("AI Sentiment error:", err);
            updateSectionState('sentiment', { 
                loading: false, 
                error: err?.message || "Failed to analyze sentiment." 
            });
        }
    };

    const handleGenerateSuggestions = async () => {
        updateSectionState('suggestions', { loading: true, error: null });
        try {
            const res = await fetchAISuggestions(conversationId);
            updateCache({ suggestions: res.suggestions });
            updateSectionState('suggestions', { loading: false, error: null });
        } catch (err: any) {
            console.error("AI Suggestions error:", err);
            updateSectionState('suggestions', { 
                loading: false, 
                error: err?.message || "Failed to generate reply suggestions." 
            });
        }
    };

    const getSentimentBadge = (sentiment?: string, score?: number) => {
        if (!sentiment) return null;
        const norm = sentiment.toLowerCase();

        let colorStyle = "bg-gray-100 text-gray-800 border-gray-200";
        let Icon = Meh;

        if (norm.includes("positive") || norm.includes("happy")) {
            colorStyle = "bg-emerald-50 text-emerald-700 border-emerald-200";
            Icon = Smile;
        } else if (norm.includes("negative") || norm.includes("angry") || norm.includes("frustrated")) {
            colorStyle = "bg-rose-50 text-rose-700 border-rose-200";
            Icon = Frown;
        } else if (norm.includes("neutral")) {
            colorStyle = "bg-blue-50 text-blue-700 border-blue-200";
            Icon = Meh;
        }

        const scoreText = score !== undefined ? (score <= 1 ? `${Math.round(score * 100)}%` : `${score}`) : null;

        return (
            <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${colorStyle}`}>
                    <Icon size={14} />
                    <span className="capitalize">{sentiment}</span>
                </span>
                {scoreText && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200" title="Sentiment confidence score">
                        <TrendingUp size={11} className="text-gray-400" />
                        {scoreText}
                    </span>
                )}
            </div>
        );
    };

    return (
        <aside className="w-80 border-l border-gray-100 bg-white flex flex-col h-full shadow-sm overflow-hidden animate-fadeIn">
            {/* Panel Header */}
            <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50/70 via-purple-50/50 to-white flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shadow-xs">
                        <Sparkles size={16} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-sm tracking-tight">AI Insights</h3>
                        <p className="text-[11px] text-gray-500 font-medium truncate max-w-[170px]">{contactName}</p>
                    </div>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose} 
                        className="p-1 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                        title="Close AI Insights"
                    >
                        <X size={16} />
                    </button>
                )}
            </div>

            {/* Scrollable Content Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-5">
                {/* 1. SUMMARY SECTION */}
                <div className="bg-gray-50/60 rounded-xl p-3.5 border border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                            <FileText size={14} className="text-indigo-600" />
                            <span>Conversation Summary</span>
                        </div>
                        <button
                            onClick={handleGenerateSummary}
                            disabled={currentStates.summary.loading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:text-indigo-600 hover:border-indigo-200 hover:bg-indigo-50/30 text-[11px] font-semibold transition-all disabled:opacity-50 shadow-xs"
                        >
                            <RefreshCw size={11} className={currentStates.summary.loading ? "animate-spin text-indigo-600" : ""} />
                            {currentCache.summary ? "Refresh" : "Generate"}
                        </button>
                    </div>

                    {currentStates.summary.loading ? (
                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-indigo-600 font-medium bg-white rounded-lg border border-gray-100">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Generating summary...</span>
                        </div>
                    ) : currentStates.summary.error ? (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800 space-y-2">
                            <div className="flex items-start gap-1.5">
                                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                <p className="leading-snug">{currentStates.summary.error}</p>
                            </div>
                            <button
                                onClick={handleGenerateSummary}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
                            >
                                Retry Summary
                            </button>
                        </div>
                    ) : currentCache.summary ? (
                        <div className="bg-white p-3 rounded-lg border border-gray-200/80 text-xs text-gray-700 leading-relaxed whitespace-pre-wrap font-normal shadow-xs">
                            {currentCache.summary}
                        </div>
                    ) : (
                        <p className="text-[11px] text-gray-400 italic">
                            Click Generate to summarize key discussion points in this chat.
                        </p>
                    )}
                </div>

                {/* 2. SENTIMENT SECTION */}
                <div className="bg-gray-50/60 rounded-xl p-3.5 border border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                            <Smile size={14} className="text-amber-500" />
                            <span>Sentiment Analysis</span>
                        </div>
                        <button
                            onClick={handleGenerateSentiment}
                            disabled={currentStates.sentiment.loading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:text-amber-600 hover:border-amber-200 hover:bg-amber-50/30 text-[11px] font-semibold transition-all disabled:opacity-50 shadow-xs"
                        >
                            <RefreshCw size={11} className={currentStates.sentiment.loading ? "animate-spin text-amber-600" : ""} />
                            {currentCache.sentiment ? "Refresh" : "Analyze"}
                        </button>
                    </div>

                    {currentStates.sentiment.loading ? (
                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-amber-600 font-medium bg-white rounded-lg border border-gray-100">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Analyzing sentiment...</span>
                        </div>
                    ) : currentStates.sentiment.error ? (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800 space-y-2">
                            <div className="flex items-start gap-1.5">
                                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                <p className="leading-snug">{currentStates.sentiment.error}</p>
                            </div>
                            <button
                                onClick={handleGenerateSentiment}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
                            >
                                Retry Analysis
                            </button>
                        </div>
                    ) : currentCache.sentiment ? (
                        <div className="bg-white p-3 rounded-lg border border-gray-200/80 shadow-xs flex items-center justify-between">
                            {getSentimentBadge(currentCache.sentiment, currentCache.score)}
                        </div>
                    ) : (
                        <p className="text-[11px] text-gray-400 italic">
                            Click Analyze to detect customer mood and tone.
                        </p>
                    )}
                </div>

                {/* 3. REPLY SUGGESTIONS SECTION */}
                <div className="bg-gray-50/60 rounded-xl p-3.5 border border-gray-100 space-y-2.5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-800">
                            <MessageSquare size={14} className="text-emerald-600" />
                            <span>Smart Reply Suggestions</span>
                        </div>
                        <button
                            onClick={handleGenerateSuggestions}
                            disabled={currentStates.suggestions.loading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-gray-200 text-gray-700 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50/30 text-[11px] font-semibold transition-all disabled:opacity-50 shadow-xs"
                        >
                            <RefreshCw size={11} className={currentStates.suggestions.loading ? "animate-spin text-emerald-600" : ""} />
                            {currentCache.suggestions?.length ? "Refresh" : "Suggest"}
                        </button>
                    </div>

                    {currentStates.suggestions.loading ? (
                        <div className="py-4 flex items-center justify-center gap-2 text-xs text-emerald-600 font-medium bg-white rounded-lg border border-gray-100">
                            <RefreshCw size={14} className="animate-spin" />
                            <span>Generating suggestions...</span>
                        </div>
                    ) : currentStates.suggestions.error ? (
                        <div className="p-3 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-800 space-y-2">
                            <div className="flex items-start gap-1.5">
                                <AlertCircle size={14} className="text-rose-600 shrink-0 mt-0.5" />
                                <p className="leading-snug">{currentStates.suggestions.error}</p>
                            </div>
                            <button
                                onClick={handleGenerateSuggestions}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 underline hover:text-rose-900"
                            >
                                Retry Suggestions
                            </button>
                        </div>
                    ) : currentCache.suggestions && currentCache.suggestions.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[11px] text-gray-400 font-medium">Click a chip to populate message composer:</p>
                            {currentCache.suggestions.map((suggestion, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => onSelectSuggestion(suggestion)}
                                    className="w-full text-left p-2.5 bg-white border border-emerald-100 hover:border-emerald-300 hover:bg-emerald-50/40 rounded-lg text-xs text-gray-800 transition-all flex items-start justify-between gap-2 group shadow-xs"
                                >
                                    <span className="leading-relaxed flex-1">{suggestion}</span>
                                    <ChevronRight size={13} className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5" />
                                </button>
                            ))}
                        </div>
                    ) : (
                        <p className="text-[11px] text-gray-400 italic">
                            Click Suggest to view recommended fast response options.
                        </p>
                    )}
                </div>
            </div>
        </aside>
    );
}
