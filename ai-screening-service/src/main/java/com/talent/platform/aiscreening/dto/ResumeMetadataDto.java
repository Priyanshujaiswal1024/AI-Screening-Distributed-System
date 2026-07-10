package com.talent.platform.aiscreening.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Projection of candidate_resumes columns that ai-screening-service is allowed to read.
 * Returned by resume-management-service's /internal/resumes/{id}/metadata endpoint.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumeMetadataDto {
    private String candidateName;
    private String candidateEmail;
}