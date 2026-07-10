package com.talent.platform.authenticationservice;

import com.talent.platform.authenticationservice.model.OutboxEvent;
import com.talent.platform.authenticationservice.service.OutboxEventPublisher;
import com.talent.platform.authenticationservice.service.OutboxPoller;
import org.apache.kafka.clients.producer.ProducerRecord;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.kafka.bootstrap-servers=localhost:9092"
})
public class OutboxIntegrationTest {

    @Autowired
    private OutboxEventPublisher outboxEventPublisher;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @Autowired
    private OutboxPoller outboxPoller;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @MockitoBean
    private KafkaTemplate<String, Object> kafkaTemplate;

    @Test
    @SuppressWarnings("unchecked")
    public void testOutboxLifecycle() {
        outboxEventRepository.deleteAll();

        // 1. Publish event in transaction
        transactionTemplate.execute(status -> {
            outboxEventPublisher.publish("test-topic", "test-key", Map.of("foo", "bar"));
            return null;
        });

        // Verify event was saved as PENDING
        List<OutboxEvent> events = outboxEventRepository.findAll();
        assertEquals(1, events.size());
        OutboxEvent pendingEvent = events.get(0);
        assertEquals("PENDING", pendingEvent.getStatus());
        assertEquals("test-topic", pendingEvent.getTopic());
        assertEquals("test-key", pendingEvent.getKey());
        assertNotNull(pendingEvent.getPayload());

        // 2. Setup mock KafkaTemplate send result
        CompletableFuture<org.springframework.kafka.support.SendResult<String, Object>> future = 
                CompletableFuture.completedFuture(mock(org.springframework.kafka.support.SendResult.class));
        when(kafkaTemplate.send(any(ProducerRecord.class))).thenReturn(future);

        // 3. Run outbox poller
        outboxPoller.pollAndPublish();

        // Verify record status advanced to SENT
        List<OutboxEvent> processedEvents = outboxEventRepository.findAll();
        assertEquals(1, processedEvents.size());
        assertEquals("SENT", processedEvents.get(0).getStatus());

        // Verify KafkaTemplate send was triggered
        verify(kafkaTemplate, times(1)).send(any(ProducerRecord.class));
    }
}
