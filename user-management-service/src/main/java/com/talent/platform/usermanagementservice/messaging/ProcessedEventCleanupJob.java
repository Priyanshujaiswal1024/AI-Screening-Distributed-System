package com.talent.platform.usermanagementservice.messaging;

import com.talent.platform.usermanagementservice.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Component
@RequiredArgsConstructor
@Slf4j
public class ProcessedEventCleanupJob {

    private final ProcessedEventRepository repository;

    @Scheduled(cron = "0 0 2 * * ?")
    @Transactional
    public void cleanupOldEvents() {
        LocalDateTime threshold = LocalDateTime.now().minusDays(7);
        log.info("[Cleanup] Starting processed events cleanup in user-management-service.");
        try {
            repository.deleteByProcessedAtBefore(threshold);
            log.info("[Cleanup] Old processed events pruned successfully.");
        } catch (Exception e) {
            log.error("[Cleanup] Prune failed: {}", e.getMessage());
        }
    }
}
