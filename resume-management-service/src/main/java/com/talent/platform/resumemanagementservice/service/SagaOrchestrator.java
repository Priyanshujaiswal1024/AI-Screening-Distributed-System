package com.talent.platform.resumemanagementservice.service;

import com.talent.platform.resumemanagementservice.messaging.KafkaEventPublisher;
import com.talent.platform.resumemanagementservice.model.SagaInstance;
import com.talent.platform.resumemanagementservice.repository.SagaInstanceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SagaOrchestrator {

    private final SagaInstanceRepository sagaInstanceRepository;
    private final StorageService storageService;
    private final KafkaEventPublisher eventPublisher;

    private static final int TIMEOUT_MINUTES = 10;

    @Transactional
    public void startSaga(UUID resumeId, String fileUrl) {
        LocalDateTime timeoutAt = LocalDateTime.now().plusMinutes(TIMEOUT_MINUTES);
        SagaInstance saga = new SagaInstance(resumeId, fileUrl, "STARTED", "UPLOAD", timeoutAt);
        sagaInstanceRepository.save(saga);
        log.info("[FIX] [SagaOrchestrator] Saga started for resumeId={} timeoutAt={}", resumeId, timeoutAt);
    }

    @Transactional
    public void advanceSaga(UUID resumeId, String statusUpdate) {
        sagaInstanceRepository.findById(resumeId).ifPresentOrElse(
                saga -> {
                    // Map incoming status from pipeline to SAGA steps
                    switch (statusUpdate.toUpperCase()) {
                        case "PARSED" -> {
                            saga.setStatus("PARSED");
                            saga.setCurrentStep("PARSED");
                            saga.setTimeoutAt(LocalDateTime.now().plusMinutes(TIMEOUT_MINUTES));
                        }
                        case "SCREENED" -> {
                            saga.setStatus("COMPLETED");
                            saga.setCurrentStep("SCREENED");
                            saga.setTimeoutAt(LocalDateTime.now().plusMinutes(TIMEOUT_MINUTES));
                        }
                        case "FAILED" -> {
                            log.warn("[SagaOrchestrator] Pipeline failed reported for resumeId={}. Initiating compensation.", resumeId);
                            compensateSaga(resumeId);
                            return;
                        }
                    }
                    saga.setUpdatedAt(LocalDateTime.now());
                    sagaInstanceRepository.save(saga);
                    log.info("[FIX] [SagaOrchestrator] Saga advanced for resumeId={} status={} step={}", 
                            resumeId, saga.getStatus(), saga.getCurrentStep());
                },
                () -> log.warn("[SagaOrchestrator] No Saga instance found for resumeId={}", resumeId)
        );
    }

    @Transactional
    public void compensateSaga(UUID resumeId) {
        sagaInstanceRepository.findById(resumeId).ifPresent(saga -> {
            if ("COMPENSATED".equals(saga.getStatus()) || "COMPENSATING".equals(saga.getStatus())) {
                log.info("[SagaOrchestrator] Saga for resumeId={} already compensated/compensating.", resumeId);
                return;
            }

            saga.setStatus("COMPENSATING");
            sagaInstanceRepository.saveAndFlush(saga);
            log.warn("[SagaOrchestrator] !!! COMPENSATING SAGA for resumeId={} !!!", resumeId);

            try {
                // Step 1: Delete file from S3 bucket
                storageService.delete(saga.getFileUrl());
                log.info("[SagaOrchestrator] Compensate: Deleted S3 file URL={}", saga.getFileUrl());

                // Step 2: Publish resume-deleted outbox event
                // This triggers cascading cleanups in ai-screening and candidate-ranking services
                eventPublisher.publishResumeDeleted(resumeId);
                log.info("[SagaOrchestrator] Compensate: Published resume-deleted event to outbox.");

                saga.setStatus("COMPENSATED");
                sagaInstanceRepository.save(saga);
                log.info("[SagaOrchestrator] Saga compensation COMPLETED successfully for resumeId={}", resumeId);

            } catch (Exception e) {
                log.error("[SagaOrchestrator] Critical: Saga compensation FAILED for resumeId={}: {}", 
                        resumeId, e.getMessage(), e);
                saga.setStatus("FAILED");
                sagaInstanceRepository.save(saga);
            }
        });
    }
}
