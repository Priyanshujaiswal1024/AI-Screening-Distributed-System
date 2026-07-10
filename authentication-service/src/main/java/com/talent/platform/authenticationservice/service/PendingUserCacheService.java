package com.talent.platform.authenticationservice.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.platform.authenticationservice.dto.SignUpRequestDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;

@Service
@RequiredArgsConstructor
@Slf4j
public class PendingUserCacheService {

    private final StringRedisTemplate redisTemplate;
    private final ObjectMapper objectMapper;
    private static final String PREFIX = "pending:user:";

    public void save(String email, SignUpRequestDto dto) {
        try {
            redisTemplate.opsForValue()
                    .set(PREFIX + email,
                            objectMapper.writeValueAsString(dto),
                            Duration.ofMinutes(15));
        } catch (Exception e) {
            throw new RuntimeException("Failed to cache pending user: " + e.getMessage());
        }
    }

    public SignUpRequestDto get(String email) {
        try {
            String raw = redisTemplate.opsForValue().get(PREFIX + email);
            if (raw == null)
                throw new RuntimeException("Signup session expired. Please start again.");
            return objectMapper.readValue(raw, SignUpRequestDto.class);
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Failed to retrieve pending user: " + e.getMessage());
        }
    }

    public void delete(String email) {
        redisTemplate.delete(PREFIX + email);
    }
}