package com.talent.platform.resumemanagementservice;

import com.talent.platform.resumemanagementservice.model.OutboxEvent;
import com.talent.platform.resumemanagementservice.model.SagaInstance;
import com.talent.platform.resumemanagementservice.repository.OutboxEventRepository;
import com.talent.platform.resumemanagementservice.repository.SagaInstanceRepository;
import com.talent.platform.resumemanagementservice.service.SagaOrchestrator;
import com.talent.platform.resumemanagementservice.service.StorageService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:testdb;DB_CLOSE_DELAY=-1;MODE=PostgreSQL",
    "spring.datasource.driver-class-name=org.h2.Driver",
    "spring.datasource.username=sa",
    "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop",
    "spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.H2Dialect",
    "spring.kafka.bootstrap-servers=localhost:9092",
    "aws.s3.bucket=test-bucket",
    "aws.s3.region=us-east-1",
    "aws.s3.access-key=test-key",
    "aws.s3.secret-key=test-secret"
})
public class SagaIntegrationTest {

    @Autowired
    private SagaOrchestrator sagaOrchestrator;

    @Autowired
    private SagaInstanceRepository sagaInstanceRepository;

    @Autowired
    private OutboxEventRepository outboxEventRepository;

    @MockitoBean
    private StorageService storageService;

    @Autowired
    private TransactionTemplate transactionTemplate;

    @Test
    public void testSagaWorkflowAndCompensation() {
        UUID resumeId = UUID.randomUUID();
        String fileUrl = "https://test-bucket.s3.us-east-1.amazonaws.com/resumes/test.pdf";

        // Cleanup outbox
        outboxEventRepository.deleteAll();

        // 1. Start Saga
        sagaOrchestrator.startSaga(resumeId, fileUrl);
        
        Optional<SagaInstance> sagaOpt = sagaInstanceRepository.findById(resumeId);
        assertTrue(sagaOpt.isPresent());
        assertEquals("STARTED", sagaOpt.get().getStatus());
        assertEquals("UPLOAD", sagaOpt.get().getCurrentStep());

        // 2. Advance Saga
        sagaOrchestrator.advanceSaga(resumeId, "PARSED");
        sagaOpt = sagaInstanceRepository.findById(resumeId);
        assertEquals("PARSED", sagaOpt.get().getStatus());
        assertEquals("PARSE", sagaOpt.get().getCurrentStep());

        // 3. Trigger Compensation
        doNothing().when(storageService).delete(anyString());
        
        // compensateSaga needs to run in a transaction because it writes outbox events
        transactionTemplate.execute(status -> {
            sagaOrchestrator.compensateSaga(resumeId);
            return null;
        });

        sagaOpt = sagaInstanceRepository.findById(resumeId);
        assertEquals("COMPENSATED", sagaOpt.get().getStatus());

        // Verify S3 delete was called
        verify(storageService, times(1)).delete(eq(fileUrl));

        // Verify resume-deleted outbox event was created
        List<OutboxEvent> outboxEvents = outboxEventRepository.findAll();
        boolean hasDeleteEvent = outboxEvents.stream()
                .anyMatch(event -> "resume-deleted".equals(event.getTopic()) && event.getPayload().contains(resumeId.toString()));
        assertTrue(hasDeleteEvent);
    }
}
