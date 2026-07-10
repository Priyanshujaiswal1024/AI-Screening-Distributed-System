package com.talent.platform.candidaterankingservice.messaging;

import com.talent.platform.candidaterankingservice.model.ScreeningReport;
import com.talent.platform.candidaterankingservice.repository.ScreeningReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeDeletedConsumer {

    private final ScreeningReportRepository screeningReportRepository;
    private final StringRedisTemplate redisTemplate;

    private static final String RANKING_KEY = "jd:ranking:";

    @KafkaListener(topics = "resume-deleted", groupId = "candidate-ranking-delete-group")
    @Transactional
    public void onResumeDeleted(Map<String, Object> event) {
        String resumeIdStr = String.valueOf(event.get("resumeId"));
        log.info("[RankingConsumer] Received resume-deleted: resumeId={}", resumeIdStr);

        try {
            UUID resumeId = UUID.fromString(resumeIdStr);
            
            // 1. Fetch all screening reports for this resume
            List<ScreeningReport> reports = screeningReportRepository.findByResumeId(resumeId);
            
            // 2. Clean up score rankings from Redis Sorted Sets
            for (ScreeningReport report : reports) {
                if (report.getJobDescriptionId() != null) {
                    String redisKey = RANKING_KEY + report.getJobDescriptionId();
                    redisTemplate.opsForZSet().remove(redisKey, resumeId.toString());
                    log.info("[RankingConsumer] Removed resumeId={} from Redis ZSet key={}", resumeId, redisKey);
                }
            }

            // 3. Delete database records
            screeningReportRepository.deleteByResumeId(resumeId);
            log.info("[RankingConsumer] Cleaned up screening reports for resumeId={} from database", resumeId);
            
        } catch (Exception e) {
            log.error("[RankingConsumer] Error cleaning up screening reports for resumeId={}: {}", resumeIdStr, e.getMessage());
        }
    }
}
