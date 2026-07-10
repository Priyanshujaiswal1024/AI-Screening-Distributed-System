package com.talent.platform.candidaterankingservice;

import com.talent.platform.candidaterankingservice.client.AIScreeningServiceClient;
import io.github.resilience4j.circuitbreaker.CircuitBreaker;
import io.github.resilience4j.circuitbreaker.CircuitBreakerRegistry;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(classes = CandidateRankingServiceApplication.class)
@TestPropertySource(properties = {
        "spring.cloud.openfeign.circuitbreaker.enabled=true",
        "resilience4j.circuitbreaker.instances.ai-screening-service.slidingWindowSize=5",
        "resilience4j.circuitbreaker.instances.ai-screening-service.minimumNumberOfCalls=5",
        "resilience4j.circuitbreaker.instances.ai-screening-service.failureRateThreshold=50",
        "eureka.client.enabled=false",
        "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver"
})
public class CircuitBreakerIntegrationTest {

    @Autowired
    private AIScreeningServiceClient client;

    @Autowired
    private CircuitBreakerRegistry registry;

    @Test
    public void testCircuitBreakerState() {
        CircuitBreaker cb = registry.circuitBreaker("ai-screening-service");
        assertThat(cb).isNotNull();
        
        // Verify circuit breaker is initialized in CLOSED state
        assertThat(cb.getState()).isEqualTo(CircuitBreaker.State.CLOSED);
        
        // Make fallback calls to verify fallback is triggered
        AIScreeningServiceClient.ScreeningRequestDto req = new AIScreeningServiceClient.ScreeningRequestDto("Java", "Java");
        AIScreeningServiceClient.ScreeningResultDto result = client.screenResume(req);
        
        assertThat(result).isNotNull();
        assertThat(result.getExplanation()).contains("Cosine-Similarity fallback");
    }
}
