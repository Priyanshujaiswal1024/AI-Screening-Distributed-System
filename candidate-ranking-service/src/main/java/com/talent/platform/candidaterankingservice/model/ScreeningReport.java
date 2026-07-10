package com.talent.platform.candidaterankingservice.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;
import java.util.UUID;

@Entity
@Table(name = "screening_reports", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"resume_id", "job_description_id"})
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ScreeningReport {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private UUID id;

    // FIX: was @Transient — columns did NOT exist in DB, InternalScreeningReportService
    //      was running "SELECT candidate_name, candidate_email FROM screening_reports"
    //      which threw SQLException. RankingService already sets these fields, so
    //      removing @Transient and adding @Column makes them persist correctly.
    @Column(name = "candidate_name")
    private String candidateName;

    @Column(name = "candidate_email")
    private String candidateEmail;

    @Column(name = "resume_id", nullable = false)
    private UUID resumeId;

    @Column(name = "job_description_id", nullable = false)
    private UUID jobDescriptionId;

    @Column(name = "match_score", nullable = false)
    private double matchScore;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "skill_gaps", columnDefinition = "TEXT")
    private String skillGaps;

    @Column(name = "structured_summary", columnDefinition = "TEXT")
    private String structuredSummary;

    @Column(name = "requirements_checklist", columnDefinition = "TEXT")
    private String requirementsChecklist;

    @Column(name = "confidence_score")
    private double confidenceScore;

    // candidateRank is computed at runtime — correct to keep @Transient
    @Transient
    private int candidateRank;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}