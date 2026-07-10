package com.talent.platform.candidaterankingservice.service;

import com.talent.platform.candidaterankingservice.dto.InternalScreeningDtos.RankedCandidateDto;
import com.talent.platform.candidaterankingservice.dto.InternalScreeningDtos.ScreeningReportDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * FIX: Import changed from InternalScreeningReportController.* to InternalScreeningDtos.*
 *      JdbcTemplate is CORRECT here — screening_reports is THIS service's own table.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InternalScreeningReportService {

    private final JdbcTemplate jdbcTemplate;

    public List<RankedCandidateDto> getRankedCandidates(
            UUID jobDescriptionId, double minScore, int topN) {

        int safeTopN = Math.min(Math.max(topN, 1), 20);

        // FIX: candidate_name and candidate_email now exist (ScreeningReport @Transient removed)
        String sql = """
                SELECT
                    resume_id, candidate_name, candidate_email,
                    match_score, confidence_score, strengths, skill_gaps, structured_summary, requirements_checklist,
                    ROW_NUMBER() OVER (ORDER BY match_score DESC) AS rank
                FROM screening_reports
                WHERE job_description_id = ?
                  AND match_score >= ?
                ORDER BY match_score DESC
                LIMIT ?
                """;

        return jdbcTemplate.query(sql,
                new Object[]{jobDescriptionId, minScore, safeTopN},
                (rs, rowNum) -> new RankedCandidateDto(
                        (UUID) rs.getObject("resume_id"),
                        rs.getString("candidate_name"),
                        rs.getString("candidate_email"),
                        rs.getDouble("match_score"),
                        rs.getDouble("confidence_score"),
                        rs.getInt("rank"),
                        rs.getString("strengths"),
                        rs.getString("skill_gaps"),
                        rs.getString("structured_summary"),
                        rs.getString("requirements_checklist")
                ));
    }

    public RankedCandidateDto getCandidateScore(UUID resumeId, UUID jobDescriptionId) {
        String sql = """
                SELECT resume_id, candidate_name, candidate_email,
                       match_score, confidence_score, strengths, skill_gaps, structured_summary, requirements_checklist,
                       (SELECT COUNT(*) + 1 FROM screening_reports sr2
                        WHERE sr2.job_description_id = sr.job_description_id
                          AND sr2.match_score > sr.match_score) AS rank
                FROM screening_reports sr
                WHERE resume_id = ? AND job_description_id = ?
                """;
        try {
            return jdbcTemplate.queryForObject(sql,
                    new Object[]{resumeId, jobDescriptionId},
                    (rs, rowNum) -> new RankedCandidateDto(
                            (UUID) rs.getObject("resume_id"),
                            rs.getString("candidate_name"),
                            rs.getString("candidate_email"),
                            rs.getDouble("match_score"),
                            rs.getDouble("confidence_score"),
                            rs.getInt("rank"),
                            rs.getString("strengths"),
                            rs.getString("skill_gaps"),
                            rs.getString("structured_summary"),
                            rs.getString("requirements_checklist")
                    ));
        } catch (Exception e) {
            log.warn("[InternalScreeningReportService] No report: resume={} job={}", resumeId, jobDescriptionId);
            return null;
        }
    }

    public ScreeningReportDto getScreeningReport(UUID resumeId, UUID jobDescriptionId) {
        String sql = """
                SELECT resume_id, job_description_id,
                       match_score, strengths, skill_gaps, structured_summary, requirements_checklist
                FROM screening_reports
                WHERE resume_id = ? AND job_description_id = ?
                """;
        try {
            return jdbcTemplate.queryForObject(sql,
                    new Object[]{resumeId, jobDescriptionId},
                    (rs, rowNum) -> new ScreeningReportDto(
                            (UUID) rs.getObject("resume_id"),
                            (UUID) rs.getObject("job_description_id"),
                            rs.getDouble("match_score"),
                            rs.getString("strengths"),
                            rs.getString("skill_gaps"),
                            rs.getString("structured_summary"),
                            rs.getString("requirements_checklist")
                    ));
        } catch (Exception e) {
            log.warn("[InternalScreeningReportService] No report: resume={} job={}", resumeId, jobDescriptionId);
            return null;
        }
    }
}