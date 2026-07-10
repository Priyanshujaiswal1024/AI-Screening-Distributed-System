package com.talent.platform.candidaterankingservice.config;

import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;

@Configuration
@RequiredArgsConstructor
@Slf4j
public class CircuitBreakerLogConfig {

    private final CircuitBreakerRegistry circuitBreakerRegistry;

    @PostConstruct
    public void registerListeners() {
        circuitBreakerRegistry.getAllCircuitBreakers().forEach(cb -> {
            log.info("[Resilience4j] Registering state transition listener for Circuit Breaker: {}", cb.getName());
            cb.getEventPublisher().onStateTransition(event -> {
                log.warn("[Resilience4j] Circuit Breaker '{}' in 'candidate-ranking-service' changed state from {} to {}",
                        cb.getName(),
                        event.getStateTransition().getFromState(),
                        event.getStateTransition().getToState());
            });
        });
    }
}
