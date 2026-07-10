package com.talent.platform.resumemanagementservice.model;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "saga_instances")
public class SagaInstance {

    @Id
    @Column(name = "resume_id", nullable = false)
    private UUID resumeId;

    @Column(name = "status", nullable = false)
    private String status; // STARTED, PARSING, PARSED, SCREENING, SCREENED, COMPLETED, FAILED, COMPENSATING, COMPENSATED

    @Column(name = "current_step", nullable = false)
    private String currentStep; // UPLOAD, PARSE, SCREEN, RANK

    @Column(name = "file_url", nullable = false, length = 512)
    private String fileUrl;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "timeout_at", nullable = false)
    private LocalDateTime timeoutAt;

    public SagaInstance() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public SagaInstance(UUID resumeId, String fileUrl, String status, String currentStep, LocalDateTime timeoutAt) {
        this();
        this.resumeId = resumeId;
        this.fileUrl = fileUrl;
        this.status = status;
        this.currentStep = currentStep;
        this.timeoutAt = timeoutAt;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }

    // Getters and Setters
    public UUID getResumeId() { return resumeId; }
    public void setResumeId(UUID resumeId) { this.resumeId = resumeId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public String getCurrentStep() { return currentStep; }
    public void setCurrentStep(String currentStep) { this.currentStep = currentStep; }

    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }

    public LocalDateTime getTimeoutAt() { return timeoutAt; }
    public void setTimeoutAt(LocalDateTime timeoutAt) { this.timeoutAt = timeoutAt; }
}
