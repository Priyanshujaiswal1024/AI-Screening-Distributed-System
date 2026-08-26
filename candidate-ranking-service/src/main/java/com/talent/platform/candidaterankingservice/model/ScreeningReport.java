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

    // HYBRID SCORING: Semantic cosine similarity (0.0–1.0) from ai-screening-service.
    // Used as 30% component in: finalScore = 0.70*skillMathScore + 0.30*(semanticScore*100)
    // Set to 0.0 if AI service is unavailable during screening.
    @Column(name = "semantic_score")
    private double semanticScore;

    // AI STATUS FLAG: true = screened by LLM (full qualitative analysis + cosine similarity)
    //                 false = fallback (skill math only, AI was offline)
    // Used by the Recruiter UI to show 🟢 AI Screened or ⚠️ Rule-Based Fallback badge.
    @Column(name = "ai_screened")
    private boolean aiScreened;

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