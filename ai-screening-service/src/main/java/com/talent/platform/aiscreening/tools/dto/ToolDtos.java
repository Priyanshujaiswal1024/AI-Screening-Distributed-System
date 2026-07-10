package com.talent.platform.aiscreening.tools.dto;

import java.util.List;
import java.util.UUID;

public class ToolDtos {

    public record CandidateSearchResult(
            UUID resumeId,
            String candidateName,
            String candidateEmail,
            String status,
            String fileUrl
    ) {}

    public record RankedCandidate(
            UUID resumeId,
            String candidateName,
            String candidateEmail,
            double matchScore,
            double confidenceScore,
            int rank,
            String strengths,
            String skillGaps,
            String structuredSummary
    ) {}

    public record SkillGapReport(
            UUID resumeId,
            String candidateName,
            List<String> requiredSkills,
            List<String> matchedSkills,
            List<String> missingSkills,
            double coveragePercent
    ) {}

    public record CandidateSummary(
            UUID resumeId,
            String candidateName,
            String candidateEmail,
            double matchScore,
            String executiveSummary,
            List<String> topStrengths,
            List<String> redFlags,
            String hiringRecommendation
    ) {}

    public record InterviewQuestionSet(
            UUID resumeId,
            String candidateName,
            String jobTitle,
            List<InterviewQuestion> questions
    ) {}

    public record InterviewQuestion(
            int questionNumber,
            String question,
            String targetSkill,
            String expectedAnswer,
            String difficulty
    ) {}

    public record ToolError(
            String toolName,
            String errorMessage,
            String fallbackResponse
    ) {}
}