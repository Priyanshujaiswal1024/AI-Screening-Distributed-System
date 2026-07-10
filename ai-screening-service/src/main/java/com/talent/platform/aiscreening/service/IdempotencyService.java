package com.talent.platform.aiscreening.service;

import com.talent.platform.aiscreening.model.ProcessedEvent;
import com.talent.platform.aiscreening.repository.ProcessedEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final ProcessedEventRepository repository;

    @Transactional(readOnly = true)
    public boolean isProcessed(String eventId) {
        return repository.existsById(eventId);
    }

    @Transactional
    public void markProcessed(String eventId, String topic) {
        repository.save(new ProcessedEvent(eventId, topic, LocalDateTime.now()));
    }
}
