package com.talent.platform.authenticationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Random;

@Service
@RequiredArgsConstructor
public class OtpService {

    private final StringRedisTemplate redisTemplate;
    private static final String PREFIX = "otp:";

    public String generateAndSave(String email) {
        String otp = String.valueOf(100000 + new Random().nextInt(900000));
        redisTemplate.opsForValue()
                .set(PREFIX + email, otp, Duration.ofMinutes(10));
        return otp;
    }

    public boolean verifyAndDelete(String email, String otp) {
        String stored = redisTemplate.opsForValue().get(PREFIX + email);
        if (stored != null && stored.equals(otp)) {
            redisTemplate.delete(PREFIX + email);
            return true;
        }
        return false;
    }
}