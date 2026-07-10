package com.talent.platform.candidaterankingservice.dto;

import java.util.UUID;

/**
 * FIX: DTOs were inner records of InternalScreeningReportController.
 *      InternalScreeningReportService imported them from the controller —
 *      a service importing from a controller is an illegal dependency direction
 *      and causes circular import issues at compile time.
 *      Moved to standalone dto class. Both controller and service import from here.
 */
public class InternalScreeningDtos {

    public record RankedCandidateDto(
            UUID resumeId,
            String candidateName,
            String candidateEmail,
            double matchScore,
            double confidenceScore,
            int rank,
            String strengths,
            String skillGaps,
            String structuredSummary,
            String requirementsChecklist
    ) {}

    public record ScreeningReportDto(
            UUID resumeId,
            UUID jobDescriptionId,
            double matchScore,
            String strengths,
            String skillGaps,
            String structuredSummary,
            String requirementsChecklist
    ) {}
}