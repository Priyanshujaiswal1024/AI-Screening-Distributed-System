package com.talent.platform.candidaterankingservice.client;

/**
 * REDUNDANT — This FallbackFactory has been intentionally emptied.
 *
 * WHY IT WAS REDUNDANT:
 * ─────────────────────────────────────────────────────────────────────
 * RankingService.calculateAndStoreScore() already wraps the
 * aiScreeningServiceClient.screenResume() call in a try-catch block:
 *
 *   try {
 *       ScreeningResultDto aiResult = aiScreeningServiceClient.screenResume(req);
 *       // use AI result ...
 *       aiScreeningSuccess = true;
 *   } catch (Exception e) {
 *       // AI failed — aiScreeningSuccess stays false
 *   }
 *
 *   if (!aiScreeningSuccess) {
 *       // Cosine-similarity based confidence estimation runs HERE
 *       // Score is always calculatedSkillScore (Java math — not AI)
 *       confidence = cosine similarity of JD vs resume chunks;
 *   }
 *
 * This try-catch already handles ALL AI failures gracefully.
 * A FallbackFactory at the Feign level was adding an extra layer of
 * complexity (including its own cosine-similarity calculation) with
 * zero additional benefit — the output was functionally identical.
 *
 * WHERE COSINE SIMILARITY IS MEANINGFULLY USED:
 * ─────────────────────────────────────────────────────────────────────
 * 1. RankingService.java (catch block)     — confidence estimate when AI is down
 * 2. RerankingService.java (chat-service)  — rerank RAG chunks by query similarity
 * 3. SkillGapAnalysisTool.java (ai-service)— semantic skill gap detection
 *
 * This file is kept as a documentation artifact only.
 * The @FeignClient fallbackFactory reference has been removed from
 * AIScreeningServiceClient.java.
 */
public class AIScreeningServiceClientFallbackFactory {
    // Intentionally empty — see Javadoc above.
}
