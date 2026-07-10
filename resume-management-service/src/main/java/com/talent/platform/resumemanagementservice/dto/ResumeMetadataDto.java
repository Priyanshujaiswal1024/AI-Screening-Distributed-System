package com.talent.platform.resumemanagementservice.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Internal projection of candidate_resumes used by ai-screening-service
 * and candidate-ranking-service via Feign.
 *
 * Only exposes non-sensitive candidate identification fields.
 * Do NOT add fileUrl or recruiterId here — callers don't need them.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ResumeMetadataDto {
    private String candidateName;
    private String candidateEmail;
}