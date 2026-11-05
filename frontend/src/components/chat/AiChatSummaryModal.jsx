import React, { useState, useEffect, useRef } from 'react';
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
  MessageSquare,
  Calendar,
  CheckSquare,
  Clock
} from 'lucide-react';
import { api } from '../../services/api';

export default function AiChatSummaryModal({ isOpen, onClose, targetUser, conversationId }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [copied, setCopied] = useState(false);

  // Request race-condition guard: ignores responses if closed or if target changes
  const activeRequestIdRef = useRef(0);

  const fetchSummary = async () => {
    if (!targetUser?.id && !conversationId) return;

    const currentRequestId = ++activeRequestIdRef.current;
    const targetId = conversationId || targetUser.id;

    setLoading(true);
    setError('');
    setSummaryData(null);

    try {
      // Use dedicated summarizeChat API or fallback to summarizeConversation
      const res = await api.summarizeChat({
        conversationId: conversationId || undefined,
        targetUserId: targetUser?.id || undefined
      }).catch(() => api.summarizeConversation(targetId));

      // Guard: Ignore if request is stale or modal was closed
      if (activeRequestIdRef.current !== currentRequestId) {
        return;
      }

      if (res.empty) {
        setSummaryData({
          empty: true,
          message: res.message || 'There are no messages available to summarize yet.'
        });
      } else if (res.summary) {
        setSummaryData(res.summary);
      } else {
        throw new Error('Unexpected summary response from server.');
      }
    } catch (err) {
      if (activeRequestIdRef.current !== currentRequestId) return;
      console.error('Failed to load AI Chat Summary:', err);
      setError(err.message || 'Failed to generate conversation summary. Please try again.');
    } finally {
      if (activeRequestIdRef.current === currentRequestId) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSummary();
    } else {
      // Invalidate pending requests on modal close
      activeRequestIdRef.current++;
      setSummaryData(null);
      setError('');
      setLoading(false);
    }
  }, [isOpen, conversationId, targetUser?.id]);

  if (!isOpen) return null;

  // Format timestamp nicely
  const formattedTimestamp = summaryData?.generatedAt
    ? new Date(summaryData.generatedAt).toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      })
    : new Date().toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short'
      });

  // Extract non-empty sections
  const hasOverview = Boolean(summaryData?.overview || summaryData?.summaryText);
  const hasTopics = Array.isArray(summaryData?.mainTopics) && summaryData.mainTopics.length > 0;
  const hasPoints = Array.isArray(summaryData?.importantPoints) && summaryData.importantPoints.length > 0;
  const hasDecisions = Array.isArray(summaryData?.decisions) && summaryData.decisions.length > 0;
  const hasPendingTasks =
    (Array.isArray(summaryData?.pendingTasks) && summaryData.pendingTasks.length > 0) ||
    (Array.isArray(summaryData?.pendingDiscussions) && summaryData.pendingDiscussions.length > 0 && !summaryData.pendingDiscussions[0]?.includes('No pending questions'));
  const hasDates = Array.isArray(summaryData?.datesAndDeadlines) && summaryData.datesAndDeadlines.length > 0;
  const hasOverall = Boolean(summaryData?.overallSummary);

  const handleCopy = () => {
    if (!summaryData || summaryData.empty) return;

    const sections = [];

    sections.push(`# AI Conversation Summary`);
    sections.push(`**With:** ${targetUser?.displayName || 'Friend'} (${targetUser?.uniqueCode || 'User'})`);
    sections.push(`**Generated:** ${formattedTimestamp}\n`);

    if (hasOverview) {
      sections.push(`### 1. Conversation Overview\n${summaryData.overview || summaryData.summaryText}\n`);
    }

    if (hasTopics) {
      sections.push(`### 2. Main Topics Discussed\n` + summaryData.mainTopics.map((t) => `- ${t}`).join('\n') + '\n');
    }

    if (hasPoints) {
      sections.push(`### 3. Important Points\n` + summaryData.importantPoints.map((p) => `- ${p}`).join('\n') + '\n');
    }

    if (hasDecisions) {
      sections.push(`### 4. Decisions Made\n` + summaryData.decisions.map((d) => `- ${d}`).join('\n') + '\n');
    }

    if (hasPendingTasks) {
      const tasks = summaryData.pendingTasks || summaryData.pendingDiscussions || [];
      sections.push(`### 5. Pending Tasks\n` + tasks.map((q) => `- ${q}`).join('\n') + '\n');
    }

    if (hasDates) {
      sections.push(`### 6. Important Dates & Deadlines\n` + summaryData.datesAndDeadlines.map((dt) => `- ${dt}`).join('\n') + '\n');
    }

    if (hasOverall) {
      sections.push(`### 7. Overall Summary\n${summaryData.overallSummary}\n`);
    }

    navigator.clipboard.writeText(sections.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in select-none">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl transition-colors max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/25 shrink-0">
              <Sparkles className="w-5 h-5 animate-pulse-subtle" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  AI Conversation Summary
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-300 text-[10px] font-bold border border-indigo-100 dark:border-indigo-800/60">
                  1-to-1 Chat
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                <span>
                  Chat with{' '}
                  <span className="font-semibold text-slate-700 dark:text-slate-200">
                    {targetUser?.displayName || 'Friend'}
                  </span>
                  {targetUser?.uniqueCode && ` (${targetUser.uniqueCode})`}
                </span>
                <span>•</span>
                <span>{formattedTimestamp}</span>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            title="Close summary"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
          {/* Loading Animation State */}
          {loading && (
            <div className="py-14 flex flex-col items-center justify-center text-center space-y-3">
              <div className="relative">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-500/10 to-purple-500/10 border border-indigo-200 dark:border-indigo-800/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                  <Sparkles className="w-7 h-7 animate-spin" />
                </div>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-900 dark:text-white">
                  Analyzing Conversation...
                </p>
                <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                  Extracting key topics, important points, decisions, and action items with AI
                </p>
              </div>
            </div>
          )}

          {/* Error State with Retry Button */}
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
                <span>Retry Generation</span>
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
                Exchange a few messages in this personal conversation, then click AI Summary again to generate insights.
              </p>
            </div>
          )}

          {/* 7 Structured Summary Sections (Only displayed when relevant) */}
          {summaryData && !summaryData.empty && !loading && !error && (
            <div className="space-y-3 animate-fade-in">
              {/* Section 1: Conversation Overview */}
              {hasOverview && (
                <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 space-y-1">
                  <div className="flex items-center gap-1.5 text-indigo-700 dark:text-indigo-300 font-bold text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>1. Conversation Overview</span>
                  </div>
                  <p className="text-xs text-indigo-950 dark:text-indigo-100 leading-relaxed font-medium">
                    {summaryData.overview || summaryData.summaryText}
                  </p>
                </div>
              )}

              {/* Section 2: Main Topics Discussed */}
              {hasTopics && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-[11px] uppercase tracking-wider">
                    <ListOrdered className="w-3.5 h-3.5 text-indigo-500" />
                    <span>2. Main Topics Discussed</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed marker:text-indigo-500">
                    {summaryData.mainTopics.map((topic, idx) => (
                      <li key={idx} className="font-medium">
                        {topic}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 3: Important Points */}
              {hasPoints && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-[11px] uppercase tracking-wider">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                    <span>3. Important Points</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-slate-700 dark:text-slate-300 leading-relaxed marker:text-emerald-500">
                    {summaryData.importantPoints.map((pt, idx) => (
                      <li key={idx} className="font-medium">
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 4: Decisions Made (Omit if empty) */}
              {hasDecisions && (
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 font-bold text-[11px] uppercase tracking-wider">
                    <CheckSquare className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>4. Decisions Made</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-emerald-900 dark:text-emerald-200 leading-relaxed marker:text-emerald-500">
                    {summaryData.decisions.map((dec, idx) => (
                      <li key={idx} className="font-medium">
                        {dec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 5: Pending Tasks (Omit if empty) */}
              {hasPendingTasks && (
                <div className="p-3.5 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-bold text-[11px] uppercase tracking-wider">
                    <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                    <span>5. Pending Tasks & Questions</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-amber-900 dark:text-amber-200 leading-relaxed marker:text-amber-500">
                    {(summaryData.pendingTasks || summaryData.pendingDiscussions || []).map((q, idx) => (
                      <li key={idx} className="font-medium">
                        {q}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 6: Important Dates and Deadlines (Omit if empty) */}
              {hasDates && (
                <div className="p-3.5 rounded-2xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40 space-y-2">
                  <div className="flex items-center gap-2 text-purple-800 dark:text-purple-300 font-bold text-[11px] uppercase tracking-wider">
                    <Calendar className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                    <span>6. Important Dates & Deadlines</span>
                  </div>
                  <ul className="space-y-1 pl-5 list-disc text-xs text-purple-900 dark:text-purple-200 leading-relaxed marker:text-purple-500">
                    {summaryData.datesAndDeadlines.map((dateItem, idx) => (
                      <li key={idx} className="font-medium">
                        {dateItem}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 7: Overall Summary */}
              {hasOverall && (
                <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="flex items-center gap-2 text-slate-900 dark:text-white font-bold text-[11px] uppercase tracking-wider">
                    <MessageSquare className="w-3.5 h-3.5 text-indigo-500" />
                    <span>7. Overall Summary</span>
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                    {summaryData.overallSummary}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Action Buttons */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center shrink-0">
          <div>
            {summaryData && !summaryData.empty && (
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold text-xs transition active:scale-95 shadow-sm"
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
