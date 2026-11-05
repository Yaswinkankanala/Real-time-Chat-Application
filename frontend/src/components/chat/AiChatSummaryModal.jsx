import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  CheckCircle2,
  HelpCircle,
  ListOrdered,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { api } from '../../services/api';

export default function AiChatSummaryModal({ isOpen, onClose, targetUser, conversationId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [copied, setCopied] = useState(false);

  const fetchSummary = async () => {
    if (!targetUser?.id && !conversationId) return;

    setLoading(true);
    setError('');
    setSummaryData(null);

    try {
      // Use conversationId or targetUser.id
      const idToSummarize = conversationId || targetUser.id;
      const res = await api.summarizeConversation(idToSummarize);

      if (res.empty) {
        setSummaryData({
          empty: true,
          message: res.message || 'There are no messages available to summarize yet.'
        });
      } else if (res.summary) {
        setSummaryData(res.summary);
      } else {
        throw new Error('Unexpected summary response from backend.');
      }
    } catch (err) {
      console.error('Failed to load AI Chat Summary:', err);
      setError(err.message || 'Failed to generate conversation summary. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    }
  }, [isOpen, conversationId, targetUser?.id]);

  if (!isOpen) return null;

  const handleCopy = () => {
    if (!summaryData || summaryData.empty) return;

    const formatted = `**Conversation Summary**
${summaryData.summaryText || ''}

**Main Topics**
${(summaryData.mainTopics || []).map((t) => `- ${t}`).join('\n')}

**Important Points**
${(summaryData.importantPoints || []).map((p) => `- ${p}`).join('\n')}

**Pending Discussions**
${(summaryData.pendingDiscussions || []).map((q) => `- ${q}`).join('\n')}`;

    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl transition-colors max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  AI Chat Summary
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/60">
                  Personal Chat Only
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Conversation with{' '}
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {targetUser?.displayName || 'Friend'}
                </span>{' '}
                {targetUser?.uniqueCode && `(${targetUser.uniqueCode})`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
          {/* Loading State */}
          {loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-6 h-6 animate-spin" />
                </div>
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  Summarizing Conversation...
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Analyzing message history, decisions, and action items
                </p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-xs text-rose-600 dark:text-rose-400 space-y-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="font-semibold">{error}</span>
              </div>
              <button
                type="button"
                onClick={fetchSummary}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-100 dark:bg-rose-900/50 hover:bg-rose-200 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-200 font-bold transition text-[11px]"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Retry Summary</span>
              </button>
            </div>
          )}

          {/* Empty State */}
          {summaryData?.empty && !loading && !error && (
            <div className="py-10 px-4 text-center rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
              <MessageSquare className="w-8 h-8 mx-auto text-slate-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                {summaryData.message}
              </p>
              <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                Exchange a few messages in this personal conversation, then click Summarize again to generate insights.
              </p>
            </div>
          )}

          {/* Successful Summary Display */}
          {summaryData && !summaryData.empty && !loading && !error && (
            <div className="space-y-4 animate-fade-in">
              {/* Overview text */}
              {summaryData.summaryText && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40">
                  <p className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed font-medium">
                    {summaryData.summaryText}
                  </p>
                </div>
              )}

              {/* 1. Main Topics */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                  <ListOrdered className="w-4 h-4 text-indigo-500" />
                  <span>Main Topics</span>
                </div>
                <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed marker:text-indigo-500">
                  {(summaryData.mainTopics || []).map((topic, idx) => (
                    <li key={idx} className="font-medium">
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 2. Important Points */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Important Points</span>
                </div>
                <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed marker:text-emerald-500">
                  {(summaryData.importantPoints || []).map((pt, idx) => (
                    <li key={idx} className="font-medium">
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>

              {/* 3. Pending Discussions */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-xs uppercase tracking-wider">
                  <HelpCircle className="w-4 h-4 text-amber-500" />
                  <span>Pending Discussions</span>
                </div>
                <ul className="space-y-1.5 pl-6 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed marker:text-amber-500">
                  {(summaryData.pendingDiscussions || []).map((q, idx) => (
                    <li key={idx} className="font-medium">
                      {q}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div>
            {summaryData && !summaryData.empty && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                    <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Summary</span>
                  </>
                )}
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {summaryData && !summaryData.empty && (
              <button
                type="button"
                onClick={fetchSummary}
                disabled={loading}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                title="Regenerate summary"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-md shadow-indigo-600/20 transition active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
