//package com.talent.platform.aiscreening.service;
//
//import com.talent.platform.aiscreening.client.FeignClientConfig.ResumeNotFoundException;
//import com.talent.platform.aiscreening.client.ResumeManagementClient;
//import com.talent.platform.aiscreening.dto.ResumeMetadataDto;
//import com.talent.platform.aiscreening.messaging.ResumeStatusUpdatedEvent;
//import com.talent.platform.aiscreening.model.ResumeChunk;
//import com.talent.platform.aiscreening.parser.TikaParser;
//import com.talent.platform.aiscreening.repository.ResumeChunkRepository;
//import org.junit.jupiter.api.BeforeEach;
//import org.junit.jupiter.api.DisplayName;
//import org.junit.jupiter.api.Test;
//import org.junit.jupiter.api.extension.ExtendWith;
//import org.mockito.ArgumentCaptor;
//import org.mockito.Mock;
//import org.mockito.junit.jupiter.MockitoExtension;
//import org.springframework.ai.vectorstore.VectorStore;
//import org.springframework.kafka.core.KafkaTemplate;
//
//import java.util.UUID;
//
//import static org.assertj.core.api.Assertions.assertThat;
//import static org.assertj.core.api.Assertions.assertThatThrownBy;
//import static org.mockito.ArgumentMatchers.*;
//import static org.mockito.Mockito.*;
//
///**
// * Unit tests for the migrated AIScreeningService.
// *
// * Verifies:
// * 1. JdbcTemplate is gone — no injection, no usage
// * 2. Feign getResumeMetadata() is called instead of SQL SELECT
// * 3. Feign updateResumeStatus("PARSED") is called instead of SQL UPDATE
// * 4. Feign updateResumeStatus("FAILED") is called on exception path
// * 5. Kafka "resume-status-updated" is published in both success and failure paths
// * 6. Metadata fetch failure is non-fatal (uses defaults, continues pipeline)
// */
//@ExtendWith(MockitoExtension.class)
//class AIScreeningServiceTest {
//
//    @Mock TikaParser                    tikaParser;
//    @Mock ResumeChunkRepository         chunkRepository;
//    @Mock VectorStore                   vectorStore;
//    @Mock KafkaTemplate<String, Object> kafkaTemplate;
//    @Mock ResumeManagementClient        resumeManagementClient;
//    // Deliberately NOT mocking JdbcTemplate — it must not exist in the service
//
//    AIScreeningService service;
//
//    @BeforeEach
//    void setUp() {
//        service = new AIScreeningService(
//                tikaParser, chunkRepository, vectorStore,
//                kafkaTemplate, resumeManagementClient);
//    }
//
//    @Test
//    @DisplayName("Success path: metadata fetched via Feign, status PARSED via Feign + Kafka")
//    void successPath_usesFeignNotJdbc() {
//        // Arrange
//        UUID resumeId = UUID.randomUUID();
//        String fileUrl = "https://bucket.s3.eu-north-1.amazonaws.com/resumes/test.pdf";
//        String resumeText = "Java developer with 5 years experience. " .repeat(20);
//
//        when(tikaParser.parse(fileUrl)).thenReturn(resumeText);
//        when(resumeManagementClient.getResumeMetadata(resumeId))
//                .thenReturn(new ResumeMetadataDto("Alice Smith", "alice@example.com"));
//        doNothing().when(vectorStore).add(anyList());
//        doNothing().when(resumeManagementClient).updateResumeStatus(any(), anyString());
//
//        // Act
//        service.processAndIndexResume(resumeId, fileUrl);
//
//        // Assert: Feign metadata called
//        verify(resumeManagementClient).getResumeMetadata(resumeId);
//
//        // Assert: Feign status update called with PARSED
//        verify(resumeManagementClient).updateResumeStatus(resumeId, "PARSED");
//
//        // Assert: Kafka published resume-parsed
//        ArgumentCaptor<String> topicCaptor = ArgumentCaptor.forClass(String.class);
//        verify(kafkaTemplate, atLeastOnce()).send(topicCaptor.capture(), anyString(), any());
//        assertThat(topicCaptor.getAllValues()).contains("resume-parsed");
//
//        // Assert: Kafka published resume-status-updated with PARSED
//        assertThat(topicCaptor.getAllValues()).contains("resume-status-updated");
//
//        // Assert: vector store received documents with candidate metadata
//        ArgumentCaptor<java.util.List> docsCaptor = ArgumentCaptor.forClass(java.util.List.class);
//        verify(vectorStore).add(docsCaptor.capture());
//        org.springframework.ai.document.Document firstDoc =
//                (org.springframework.ai.document.Document) docsCaptor.getValue().get(0);
//        assertThat(firstDoc.getMetadata().get("candidateName")).isEqualTo("Alice Smith");
//        assertThat(firstDoc.getMetadata().get("candidateEmail")).isEqualTo("alice@example.com");
//    }
//
//    @Test
//    @DisplayName("Metadata fetch failure is non-fatal: pipeline continues with defaults")
//    void metadataFetchFailure_nonFatal_continuesPipeline() {
//        UUID resumeId = UUID.randomUUID();
//        String resumeText = "Backend engineer. ".repeat(30);
//
//        when(tikaParser.parse(anyString())).thenReturn(resumeText);
//        when(resumeManagementClient.getResumeMetadata(resumeId))
//                .thenThrow(new RuntimeException("resume-management-service unavailable"));
//        doNothing().when(vectorStore).add(anyList());
//
//        // Should NOT throw
//        service.processAndIndexResume(resumeId, "https://bucket.s3.eu-north-1.amazonaws.com/r.pdf");
//
//        // Feign update still called with PARSED (metadata failure ≠ pipeline failure)
//        verify(resumeManagementClient).updateResumeStatus(resumeId, "PARSED");
//        // Pipeline was NOT aborted — vectorStore.add was called
//        verify(vectorStore).add(anyList());
//    }
//
//    @Test
//    @DisplayName("Resume not found (404 from Feign): uses defaults, does not abort")
//    void resumeNotFound_usesDefaults() {
//        UUID resumeId = UUID.randomUUID();
//        when(tikaParser.parse(anyString())).thenReturn("some resume text ".repeat(20));
//        when(resumeManagementClient.getResumeMetadata(resumeId))
//                .thenThrow(new ResumeNotFoundException("Resume not found: " + resumeId));
//        doNothing().when(vectorStore).add(anyList());
//
//        service.processAndIndexResume(resumeId, "s3://bucket/r.pdf");
//
//        // Vector documents should have default metadata
//        ArgumentCaptor<java.util.List> docsCaptor = ArgumentCaptor.forClass(java.util.List.class);
//        verify(vectorStore).add(docsCaptor.capture());
//        org.springframework.ai.document.Document doc =
//                (org.springframework.ai.document.Document) docsCaptor.getValue().get(0);
//        assertThat(doc.getMetadata().get("candidateName")).isEqualTo("Unknown Candidate");
//    }
//
//    @Test
//    @DisplayName("Failure path: exception causes FAILED status update via Feign + Kafka")
//    void failurePath_publishesFailedStatus() {
//        UUID resumeId = UUID.randomUUID();
//        when(tikaParser.parse(anyString()))
//                .thenThrow(new RuntimeException("Tika parse failed — corrupt PDF"));
//        when(resumeManagementClient.getResumeMetadata(resumeId))
//                .thenReturn(new ResumeMetadataDto("Bob", "bob@example.com"));
//
//        assertThatThrownBy(() ->
//                service.processAndIndexResume(resumeId, "s3://bucket/bad.pdf"))
//                .isInstanceOf(RuntimeException.class)
//                .hasMessageContaining("Resume RAG ingestion pipeline failed");
//
//        // Status update FAILED must be attempted
//        verify(resumeManagementClient).updateResumeStatus(resumeId, "FAILED");
//
//        // Kafka "resume-status-updated" with FAILED
//        ArgumentCaptor<String> topicCaptor = ArgumentCaptor.forClass(String.class);
//        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
//        verify(kafkaTemplate, atLeastOnce()).send(topicCaptor.capture(), anyString(), payloadCaptor.capture());
//
//        boolean hasStatusUpdatedFailed = false;
//        for (int i = 0; i < topicCaptor.getAllValues().size(); i++) {
//            if ("resume-status-updated".equals(topicCaptor.getAllValues().get(i))) {
//                ResumeStatusUpdatedEvent evt =
//                        (ResumeStatusUpdatedEvent) payloadCaptor.getAllValues().get(i);
//                if ("FAILED".equals(evt.status())) hasStatusUpdatedFailed = true;
//            }
//        }
//        assertThat(hasStatusUpdatedFailed).isTrue();
//    }
//
//    @Test
//    @DisplayName("VectorStore failure: falls back to resume_chunks table (still within ai_db)")
//    void vectorStoreFails_fallsBackToChunkRepository() {
//        UUID resumeId = UUID.randomUUID();
//        when(tikaParser.parse(anyString())).thenReturn("Java developer. ".repeat(30));
//        when(resumeManagementClient.getResumeMetadata(resumeId))
//                .thenReturn(new ResumeMetadataDto("Carol", "carol@example.com"));
//        doThrow(new RuntimeException("pgvector offline")).when(vectorStore).add(anyList());
//
//        service.processAndIndexResume(resumeId, "s3://bucket/c.pdf");
//
//        // Fallback to resume_chunks (still in ai_db — no cross-service boundary crossed)
//        verify(chunkRepository, atLeastOnce()).save(any(ResumeChunk.class));
//        // Status should still be PARSED — fallback storage worked
//        verify(resumeManagementClient).updateResumeStatus(resumeId, "PARSED");
//    }
//}