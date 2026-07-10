package com.talent.platform.jobdescriptionservice.service;

import com.talent.platform.jobdescriptionservice.dto.JobDetailsDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

/**
 * FIX: Replaced commented-out import with correct standalone import.
 *      JdbcTemplate is CORRECT here — job_descriptions and job_skills are this service's tables.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class InternalJobService {

    private final JdbcTemplate jdbcTemplate;

    public JobDetailsDto getJobDetails(UUID jobId) {
        String title;
        try {
            title = jdbcTemplate.queryForObject(
                    "SELECT title FROM job_descriptions WHERE id = ?",
                    String.class, jobId);
        } catch (Exception e) {
            log.warn("[InternalJobService] Job not found: {}", jobId);
            return new JobDetailsDto(jobId, "Unknown Position", List.of());
        }

        List<String> skills = jdbcTemplate.queryForList(
                "SELECT skill FROM job_skills WHERE job_description_id = ? ORDER BY skill",
                String.class, jobId);

        log.info("[InternalJobService] jobId={} title='{}' skills={}", jobId, title, skills.size());
        return new JobDetailsDto(jobId, title, skills);
    }
}