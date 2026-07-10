package com.talent.platform.aiscreening.client;

import feign.Logger;
import feign.Request;
import feign.codec.ErrorDecoder;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Bean;

import java.util.concurrent.TimeUnit;

/**
 * Shared Feign client configuration for ai-screening-service.
 *
 * - connectTimeout: 3 s  — fail fast if service is unreachable
 * - readTimeout:    5 s  — resume-management-service endpoints are DB reads, should be <1 s
 * - ErrorDecoder: translates 4xx/5xx into typed exceptions so the caller
 *   can fall back gracefully rather than receiving a raw FeignException.
 */
@Slf4j
public class FeignClientConfig {

    @Bean
    public Request.Options requestOptions() {
        return new Request.Options(3, TimeUnit.SECONDS, 5, TimeUnit.SECONDS, true);
    }

    @Bean
    public Logger.Level feignLoggerLevel() {
        return Logger.Level.BASIC;
    }

    @Bean
    public ErrorDecoder errorDecoder() {
        return (methodKey, response) -> {
            log.error("[Feign] {} returned HTTP {}", methodKey, response.status());
            if (response.status() == 404) {
                return new ResumeNotFoundException(
                        "Resource not found via Feign call: " + methodKey);
            }
            return new RuntimeException(
                    "Feign call failed — " + methodKey + " status=" + response.status());
        };
    }

    /** Thrown when the downstream /metadata or /status endpoint returns 404. */
    public static class ResumeNotFoundException extends RuntimeException {
        public ResumeNotFoundException(String msg) { super(msg); }
    }
}