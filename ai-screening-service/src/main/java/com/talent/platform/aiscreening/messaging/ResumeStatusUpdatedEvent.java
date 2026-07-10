package com.talent.platform.aiscreening.messaging;

import java.util.UUID;

/**
 * Published to topic "resume-status-updated" by ai-screening-service
 * after it finishes (or fails) processing a resume.
 *
 * resume-management-service consumes this event and updates
 * candidate_resumes.status in its own database — the only service
 * allowed to write to that table.
 *
 * This event replaces the two JdbcTemplate UPDATE calls that previously
 * crossed the service boundary:
 *   UPDATE candidate_resumes SET status = 'PARSED' WHERE id = ?
 *   UPDATE candidate_resumes SET status = 'FAILED' WHERE id = ?
 */
public record ResumeStatusUpdatedEvent(
        UUID resumeId,
        String status          // "PARSED" | "FAILED"
) {}