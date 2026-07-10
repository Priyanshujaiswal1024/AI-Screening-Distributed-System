package com.talent.platform.resumemanagementservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "candidate_resumes")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CandidateResume {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    @Column(name = "recruiter_id", nullable = false)
    private UUID recruiterId;

    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "candidate_email")
    private String candidateEmail;

    @Column(name = "file_url", nullable = false, length = 512)
    private String fileUrl;

    @Column(nullable = false)
    private String status; // UPLOADED, PARSED, SCREENED, FAILED

    @Column(name = "job_id")
    private UUID jobId;

    @Column(name = "total_experience")
    private Double totalExperience;

    @Column(name = "skills", length = 1024)
    private String skills;

    @Column(name = "notice_period", length = 255)
    private String noticePeriod;

    @Column(name = "archived", nullable = false)
    @Builder.Default
    private boolean archived = false;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
