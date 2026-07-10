package com.talent.platform.resumemanagementservice.messaging;

import com.talent.platform.resumemanagementservice.model.SagaInstance;
import com.talent.platform.resumemanagementservice.repository.ResumeRepository;
import com.talent.platform.resumemanagementservice.repository.SagaInstanceRepository;
import com.talent.platform.resumemanagementservice.service.SagaOrchestrator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class SagaTimeoutScheduler {

    private final SagaInstanceRepository sagaInstanceRepository;
    private final ResumeRepository resumeRepository;
    private final SagaOrchestrator sagaOrchestrator;

    private static final List<String> ACTIVE_STATUSES = List.of(
            "STARTED", "PARSING", "PARSED", "SCREENING", "RANKING"
    );

    @Scheduled(fixedDelay = 10000) // Scan every 10 seconds
    @Transactional
    public void scanAndHandleTimeouts() {
        LocalDateTime now = LocalDateTime.now();
        List<SagaInstance> timedOutSagas = sagaInstanceRepository.findByStatusInAndTimeoutAtBefore(ACTIVE_STATUSES, now);

        if (!timedOutSagas.isEmpty()) {
            log.warn("[FIX] [SagaTimeoutScheduler] Found {} timed out Saga transactions to evaluate.", timedOutSagas.size());
            
            for (SagaInstance saga : timedOutSagas) {
                String currentStep = saga.getCurrentStep();
                if (currentStep != null) {
                    currentStep = currentStep.toUpperCase();
                } else {
                    currentStep = "";
                }
                
                // If currentStep is SCREENED or COMPLETED:
                if ("SCREENED".equals(currentStep) || "COMPLETED".equals(currentStep) || "COMPLETED".equals(saga.getStatus())) {
                    saga.setStatus("COMPLETED");
                    sagaInstanceRepository.save(saga);
                    log.info("[FIX] [SagaTimeout] Skipping - already SCREENED/COMPLETED resumeId={}", saga.getResumeId());
                    continue;
                }

                // Check resume status in candidate_resumes table
                var resumeOpt = resumeRepository.findById(saga.getResumeId());
                if (resumeOpt.isPresent()) {
                    String resumeStatus = resumeOpt.get().getStatus();
                    if (resumeStatus != null) {
                        resumeStatus = resumeStatus.toUpperCase();
                    } else {
                        resumeStatus = "";
                    }

                    if ("SCREENED".equals(resumeStatus) || "COMPLETED".equals(resumeStatus)) {
                        saga.setStatus("COMPLETED");
                        saga.setCurrentStep("SCREENED");
                        sagaInstanceRepository.save(saga);
                        log.info("[FIX] [SagaTimeout] Skipping compensation - resume status is already {} for resumeId={}", resumeStatus, saga.getResumeId());
                        continue;
                    }
                    if ("FAILED".equals(resumeStatus)) {
                        saga.setStatus("FAILED");
                        sagaInstanceRepository.save(saga);
                        log.info("[FIX] [SagaTimeout] Skipping compensation - resume status is already FAILED for resumeId={}", saga.getResumeId());
                        continue;
                    }
                }

                // Genuine timeout
                log.warn("[FIX] [SagaTimeoutScheduler] Genuine timeout detected. Saga for resumeId={} timed out in step={} (timeoutAt={})",
                        saga.getResumeId(), saga.getCurrentStep(), saga.getTimeoutAt());

                try {
                    // Update main CandidateResume status to FAILED
                    resumeOpt.ifPresent(resume -> {
                        resume.setStatus("FAILED");
                        resumeRepository.save(resume);
                        log.info("[FIX] [SagaTimeoutScheduler] Updated CandidateResume status to FAILED for resumeId={}", saga.getResumeId());
                    });

                    // Trigger Saga rollback/compensation
                    sagaOrchestrator.compensateSaga(saga.getResumeId());

                } catch (Exception e) {
                    log.error("[FIX] [SagaTimeoutScheduler] Failed to handle timeout for resumeId={}: {}", 
                            saga.getResumeId(), e.getMessage(), e);
                }
            }
        }
    }
}
