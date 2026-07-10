package com.talent.platform.resumemanagementservice.messaging;

import com.talent.platform.resumemanagementservice.repository.ResumeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.UUID;

/**
 * Consumes "resume-parsed" events published by ai-screening-service.
 *
 * WHY THIS EXISTS:
 * When a resume is uploaded, candidate_name = "Unknown" and candidate_email = "unknown@email.com"
 * because we don't parse the PDF at upload time.
 * ai-screening-service parses the PDF, extracts name+email from metadata,
 * and publishes this event. We update our record here.
 *
 * This is what makes "Parsing..." resolve to the real candidate name in the UI.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResumeParsedConsumer {

    private final ResumeRepository resumeRepository;

    @RetryableTopic(
            attempts = "3",
            backoff = @Backoff(delay = 2000, multiplier = 2.0),
            dltTopicSuffix = "-dlt"
    )
    @KafkaListener(topics = "resume-parsed", groupId = "resume-management-group")
    public void onResumeParsed(Map<String, Object> event) {
        String resumeIdStr    = String.valueOf(event.get("resumeId"));
        String candidateName  = String.valueOf(event.getOrDefault("candidateName", ""));
        String candidateEmail = String.valueOf(event.getOrDefault("candidateEmail", ""));

        log.info("[ResumeParsedConsumer] resume-parsed: resumeId={} name='{}' email='{}'",
                resumeIdStr, candidateName, candidateEmail);

        try {
            UUID resumeId = UUID.fromString(resumeIdStr);
            resumeRepository.findById(resumeId).ifPresentOrElse(
                    resume -> {
                        boolean updated = false;

                        // Only update if current database values are the default placeholders or blank
                        boolean isCurrentNameUnknown = resume.getCandidateName() == null 
                                || resume.getCandidateName().isBlank()
                                || resume.getCandidateName().equals("Unknown")
                                || resume.getCandidateName().equals("Unknown Candidate");

                        if (isCurrentNameUnknown 
                                && candidateName != null
                                && !candidateName.isBlank()
                                && !candidateName.equals("null")
                                && !candidateName.equals("Unknown Candidate")) {
                            resume.setCandidateName(candidateName);
                            updated = true;
                        }

                        boolean isCurrentEmailUnknown = resume.getCandidateEmail() == null
                                || resume.getCandidateEmail().isBlank()
                                || resume.getCandidateEmail().equals("unknown@email.com");

                        if (isCurrentEmailUnknown
                                && candidateEmail != null
                                && !candidateEmail.isBlank()
                                && !candidateEmail.equals("null")
                                && !candidateEmail.equals("unknown@email.com")) {
                            resume.setCandidateEmail(candidateEmail);
                            updated = true;
                        }

                        // Extract and set experience, skills, and noticePeriod
                        if (event.containsKey("totalExperience")) {
                            try {
                                Object expObj = event.get("totalExperience");
                                if (expObj != null && !expObj.toString().equals("null")) {
                                    resume.setTotalExperience(Double.valueOf(expObj.toString()));
                                }
                            } catch (Exception e) {
                                log.warn("[ResumeParsedConsumer] Failed to parse totalExperience: {}", e.getMessage());
                            }
                        }
                        if (event.containsKey("skills")) {
                            Object skillsObj = event.get("skills");
                            if (skillsObj != null && !skillsObj.toString().equals("null")) {
                                resume.setSkills(skillsObj.toString());
                            }
                        }
                        if (event.containsKey("noticePeriod")) {
                            Object npObj = event.get("noticePeriod");
                            if (npObj != null && !npObj.toString().equals("null")) {
                                resume.setNoticePeriod(npObj.toString());
                            }
                        }

                        // Always mark as PARSED
                        resume.setStatus("PARSED");
                        resumeRepository.save(resume);

                        if (updated) {
                            log.info("[ResumeParsedConsumer] Updated resume {} → name='{}' email='{}' exp={} skills='{}' notice='{}' status=PARSED",
                                    resumeId, resume.getCandidateName(), resume.getCandidateEmail(), 
                                    resume.getTotalExperience(), resume.getSkills(), resume.getNoticePeriod());
                        } else {
                            log.info("[ResumeParsedConsumer] Updated resume {} → status=PARSED (name/email unchanged)",
                                    resumeId);
                        }
                    },
                    () -> log.warn("[ResumeParsedConsumer] Resume {} not found", resumeId)
            );
        } catch (IllegalArgumentException e) {
            log.error("[ResumeParsedConsumer] Invalid resumeId '{}': {}", resumeIdStr, e.getMessage());
        }
    }
}