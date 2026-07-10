package com.talent.platform.candidaterankingservice.messaging;

import com.talent.platform.candidaterankingservice.client.JobServiceClient;
import com.talent.platform.candidaterankingservice.repository.ScreeningReportRepository;
import com.talent.platform.candidaterankingservice.service.RankingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * WHY THIS EXISTS:
 * When a resume is uploaded and parsed, it must be automatically ranked
 * against all jobs that recruiter has posted. Without this consumer,
 * rankings page shows empty forever unless manually triggered.
 *
 * Flow:
 *   resume-uploaded (resume-management-service)
 *       → ai-screening-service parses + indexes
 *       → publishes "resume-parsed"
 *       → THIS consumer receives it
 *       → calls RankingService.calculateAndStoreScore() for each job
 *       → rankings page populates automatically
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeParsedConsumer {

    private final RankingService rankingService;
    private final JobServiceClient jobServiceClient;
    private final ScreeningReportRepository screeningReportRepository;

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 3000, multiplier = 2.0),
            dltTopicSuffix = "-dlt"
    )
    @IdempotentConsumer(topic = "resume-parsed")
    @KafkaListener(topics = "resume-parsed", groupId = "candidate-ranking-group")
    public void onResumeParsed(Map<String, Object> event, @org.springframework.messaging.handler.annotation.Header(value = "event-id", required = false) String eventId) {
        String resumeIdStr   = String.valueOf(event.get("resumeId"));
        String recruiterIdStr = String.valueOf(event.getOrDefault("recruiterId", ""));
        Object jobIdObj      = event.get("jobId");
        String jobIdStr      = jobIdObj != null ? jobIdObj.toString() : null;

        log.info("[RankingConsumer] resume-parsed: resumeId={} recruiterId={} jobId={}",
                resumeIdStr, recruiterIdStr, jobIdStr);

        try {
            UUID resumeId = UUID.fromString(resumeIdStr);
            UUID recruiterId = (recruiterIdStr != null && !recruiterIdStr.isBlank() && !recruiterIdStr.equals("null"))
                    ? UUID.fromString(recruiterIdStr)
                    : null;
            UUID targetJobId = (jobIdStr != null && !jobIdStr.isBlank() && !jobIdStr.equals("null"))
                    ? UUID.fromString(jobIdStr)
                    : null;

            // Get jobs to rank against: target jobId or all recruiter jobs
            List<UUID> jobIds;
            if (targetJobId != null) {
                jobIds = List.of(targetJobId);
                log.info("[RankingConsumer] Specific jobId target found: {}. Will rank resume={} only for this job.",
                        targetJobId, resumeId);
            } else {
                if (recruiterId == null) {
                    log.warn("[RankingConsumer] No recruiterId or jobId in event for resume={} — cannot auto-rank", resumeId);
                    return;
                }
                try {
                    jobIds = jobServiceClient.getJobIdsByRecruiter(recruiterId);
                } catch (Exception e) {
                    log.error("[RankingConsumer] Could not fetch jobs for recruiter={}: {}", recruiterId, e.getMessage());
                    throw e; // trigger retry
                }
            }

            if (jobIds == null || jobIds.isEmpty()) {
                log.warn("[RankingConsumer] Recruiter {} has no jobs — skipping auto-rank for resume={}",
                        recruiterId != null ? recruiterId : "N/A", resumeId);
                return;
            }

            log.info("[RankingConsumer] Auto-ranking resume={} against {} job(s) for recruiter={}",
                    resumeId, jobIds.size(), recruiterId);

            int succeeded = 0;
            for (UUID jobId : jobIds) {
                try {
                    rankingService.calculateAndStoreScore(jobId, resumeId);
                    succeeded++;
                    log.info("[RankingConsumer] ✓ Ranked resume={} against job={}", resumeId, jobId);
                } catch (Exception e) {
                    // Don't fail the whole batch if one job fails
                    log.error("[RankingConsumer] ✗ Failed to rank resume={} against job={}: {}",
                            resumeId, jobId, e.getMessage());
                }
            }

            log.info("[RankingConsumer] Auto-ranking complete: resume={} scored against {}/{} jobs",
                    resumeId, succeeded, jobIds.size());

        } catch (IllegalArgumentException e) {
            log.error("[RankingConsumer] Invalid UUID in event: {}", e.getMessage());
            // Don't retry — bad data
        }
    }
}