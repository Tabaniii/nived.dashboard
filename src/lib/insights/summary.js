import { buildRuleBasedSummary } from '@/lib/insights/themes';
import { DEFAULT_GEMINI_MODEL, summarizeWithGemini } from '@/lib/insights/gemini';

/**
 * Weekly feedback summary: Gemini when GEMINI_API_KEY is set and there is
 * written feedback to analyze, otherwise (or on any AI error) keyword rules.
 *
 * @param {Array<Object>} feedbacks
 * @param {{ env?: Record<string, string|undefined>, fetchImpl?: typeof fetch, storeNames?: string[] }} [options]
 */
export async function generateFeedbackSummary(
  feedbacks = [],
  { env = process.env, fetchImpl = fetch, storeNames = [] } = {}
) {
  const base = buildRuleBasedSummary(feedbacks);
  const apiKey = (env.GEMINI_API_KEY || '').trim();
  const hasWrittenFeedback = feedbacks.some(
    (f) => typeof f.feedback_text === 'string' && f.feedback_text.trim()
  );

  if (!apiKey || !hasWrittenFeedback) return base;

  try {
    const ai = await summarizeWithGemini(feedbacks, {
      apiKey,
      model: env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL,
      fetchImpl,
      context: {
        storeNames,
        feedbackCount: base.feedbackCount,
        complaintCount: base.complaintCount,
        avgRating: base.avgRating,
        ruleThemes: base.themes,
      },
    });

    return {
      ...base,
      summary: ai.summary,
      themes: ai.themes.length ? ai.themes : base.themes,
      actions: ai.actions.length ? ai.actions : base.actions,
      source: 'ai',
    };
  } catch (err) {
    console.warn('[insights] Gemini summary failed, using keyword fallback:', err?.message || err);
    return base;
  }
}
