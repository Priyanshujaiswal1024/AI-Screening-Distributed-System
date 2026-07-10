package com.talent.platform.jobdescriptionservice.service;

import com.talent.platform.jobdescriptionservice.dto.CreateJobRequest;
import com.talent.platform.jobdescriptionservice.model.JobDescription;
import com.talent.platform.jobdescriptionservice.repository.JobDescriptionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.ai.document.Document;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class JobDescriptionService {

    private final JobDescriptionRepository repository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final VectorStore vectorStore;       // FIX W1: embed JD into pgvector
    private final EmbeddingModel embeddingModel;

//    JobDescriptionService(JobDescriptionRepository repository, KafkaTemplate<String, Object> kafkaTemplate, VectorStore vectorStore, EmbeddingModel embeddingModel)
//    {
//        this.repository = repository;
//        this.kafkaTemplate = kafkaTemplate;
//        this.embeddingModel=embeddingModel;
//        this.vectorStore=vectorStore;
//    };

    @Transactional
    public JobDescription createJob(CreateJobRequest request) {
        JobDescription jd = JobDescription.builder()
                .recruiterId(request.getRecruiterId())
                .title(request.getTitle())
                .rawText(request.getRawText())
                .keySkills(request.getKeySkills())
                .minExperienceYears(request.getMinExperienceYears())
                .build();

        JobDescription saved = repository.save(jd);
        log.info("Job description created: id={} title={}", saved.getId(), saved.getTitle());

        // FIX W1: embed JD text and store in pgvector for semantic search
        try {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("jobId",      saved.getId().toString());
            metadata.put("recruiterId", saved.getRecruiterId().toString());
            metadata.put("title",      saved.getTitle());
            metadata.put("source",     "job-description");

            vectorStore.add(List.of(new Document(saved.getRawText(), metadata)));
            log.info("JD embedded and stored in pgvector: jobId={}", saved.getId());
        } catch (Exception e) {
            log.warn("Failed to embed JD {}: {}", saved.getId(), e.getMessage());
            // Non-fatal — screening can still work via text comparison
        }

        // FIX C2: publish Kafka event
        publishEvent("JOB_CREATED", saved.getId(), saved.getTitle(), saved.getRecruiterId());

        return saved;
    }

    public JobDescription getById(UUID id) {
        return repository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Job not found: " + id));
    }

    public List<JobDescription> getByRecruiter(UUID recruiterId) {
        return repository.findByRecruiterId(recruiterId);
    }

    public List<JobDescription> getAllJobs() {
        return repository.findAll();
    }

    @Transactional
    public JobDescription updateJob(UUID id, CreateJobRequest request) {
        JobDescription existing = getById(id);
        existing.setTitle(request.getTitle());
        existing.setRawText(request.getRawText());
        existing.setKeySkills(request.getKeySkills());
        existing.setMinExperienceYears(request.getMinExperienceYears());
        JobDescription updated = repository.save(existing);
        publishEvent("JOB_UPDATED", updated.getId(), updated.getTitle(), updated.getRecruiterId());
        return updated;
    }

    @Transactional
    public void deleteJob(UUID id) {
        repository.deleteById(id);
        publishEvent("JOB_DELETED", id, "", null);
    }

    private void publishEvent(String type, UUID jobId, String title, UUID recruiterId) {
        try {
            Map<String, Object> event = new HashMap<>();
            event.put("eventType",   type);
            event.put("jobId",       jobId.toString());
            event.put("title",       title);
            if (recruiterId != null)
                event.put("recruiterId", recruiterId.toString());
            kafkaTemplate.send("job-events", jobId.toString(), event);
        } catch (Exception e) {
            log.warn("Failed to publish job event {}: {}", type, e.getMessage());
        }
    }
}