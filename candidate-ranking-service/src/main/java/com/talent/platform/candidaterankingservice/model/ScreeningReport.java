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

    @Builder.Default
    @Column(name = "match_score", nullable = false)
    private Double matchScore = 0.0;

    @Column(columnDefinition = "TEXT")
    private String strengths;

    @Column(name = "skill_gaps", columnDefinition = "TEXT")
    private String skillGaps;

    @Column(name = "structured_summary", columnDefinition = "TEXT")
    private String structuredSummary;

    @Column(name = "requirements_checklist", columnDefinition = "TEXT")
    private String requirementsChecklist;

    @Builder.Default
    @Column(name = "confidence_score")
    private Double confidenceScore = 0.0;

    // HYBRID SCORING: Semantic cosine similarity (0.0–1.0) from ai-screening-service.
    // Used as 30% component in: finalScore = 0.70*skillMathScore + 0.30*(semanticScore*100)
    // Set to 0.0 if AI service is unavailable during screening.
    @Builder.Default
    @Column(name = "semantic_score")
    private Double semanticScore = 0.0;

    // AI STATUS FLAG: true = screened by LLM (full qualitative analysis + cosine similarity)
    //                 false = fallback (skill math only, AI was offline)
    // Used by the Recruiter UI to show 🟢 AI Screened or ⚠️ Rule-Based Fallback badge.
    @Builder.Default
    @Column(name = "ai_screened")
    private Boolean aiScreened = false;

    // candidateRank is computed at runtime — correct to keep @Transient
    @Builder.Default
    @Transient
    private Integer candidateRank = 0;

    public boolean isAiScreened() {
        return aiScreened != null && aiScreened;
    }

    public double getMatchScore() {
        return matchScore != null ? matchScore : 0.0;
    }

    public double getConfidenceScore() {
        return confidenceScore != null ? confidenceScore : 0.0;
    }

    public double getSemanticScore() {
        return semanticScore != null ? semanticScore : 0.0;
    }

    public int getCandidateRank() {
        return candidateRank != null ? candidateRank : 0;
    }

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}