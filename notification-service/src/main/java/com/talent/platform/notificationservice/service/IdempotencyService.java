package com.talent.platform.notificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class IdempotencyService {

    private final StringRedisTemplate redisTemplate;
    private static final String REDIS_PREFIX = "processed:event:";

    /**
     * Attempts to acquire a lock / mark the event as processed.
     * Uses SETNX (set if absent) to achieve atomicity.
     *
     * @param eventId The unique UUID of the event
     * @return true if the event was already processed (or lock couldn't be acquired),
     *         false if this is a new event and the processing can proceed.
     */
    public boolean checkAndMarkProcessed(String eventId) {
        String key = REDIS_PREFIX + eventId;
        // setIfAbsent behaves like SETNX: returns true if the key was set (meaning it didn't exist before)
        Boolean wasSet = redisTemplate.opsForValue().setIfAbsent(key, "true", Duration.ofDays(7));
        
        if (Boolean.TRUE.equals(wasSet)) {
            log.info("[Idempotency] Successfully acquired idempotency lock for eventId={}", eventId);
            return false; // Not processed yet, proceed
        } else {
            log.warn("[Idempotency] Event already processed or lock held for eventId={}", eventId);
            return true; // Already processed, skip
        }
    }
}
