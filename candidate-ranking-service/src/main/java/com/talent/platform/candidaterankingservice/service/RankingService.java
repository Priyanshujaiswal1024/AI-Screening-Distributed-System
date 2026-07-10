package com.talent.platform.candidaterankingservice.service;

import com.talent.platform.candidaterankingservice.client.AIScreeningServiceClient;
import com.talent.platform.candidaterankingservice.client.CandidateInfoClient;
import com.talent.platform.candidaterankingservice.client.JobServiceClient;
import com.talent.platform.candidaterankingservice.client.ResumeServiceClient;
import com.talent.platform.candidaterankingservice.model.ScreeningReport;
import com.talent.platform.candidaterankingservice.repository.ScreeningReportRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.LinkedHashMap;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class RankingService {

    private final ScreeningReportRepository repository;
    private final StringRedisTemplate redisTemplate;
    private final EmbeddingModel embeddingModel;
    private final ResumeServiceClient resumeServiceClient;
    private final CandidateInfoClient candidateInfoClient;
    private final JobServiceClient jobServiceClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final AIScreeningServiceClient aiScreeningServiceClient;
    private final MeterRegistry meterRegistry;
    private final SkillNormalizerService skillNormalizerService;

    private static final String RANKING_KEY = "jd:ranking:";
    private static final double SKILL_MATCH_THRESHOLD = 0.55;

    public ScreeningReport calculateAndStoreScore(UUID jobId, UUID resumeId) {
        log.info("[RankingService] Scoring resume={} for job={}", resumeId, jobId);
        Timer.Sample sample = Timer.start(meterRegistry);
        String finalStatus = "success";

        try {
            String jdText         = jobServiceClient.getJobText(jobId);
        List<String> skills   = jobServiceClient.getJobSkills(jobId);
        List<String> chunks   = resumeServiceClient.getResumeChunks(resumeId);
        String candidateName  = candidateInfoClient.getCandidateName(resumeId);
        String candidateEmail = candidateInfoClient.getCandidateEmail(resumeId);

        if (jdText == null || jdText.isBlank()) {
            log.warn("[RankingService] No JD text for job={}", jobId);
            throw new IllegalStateException("Job description not found: " + jobId);
        }

        if (chunks == null || chunks.isEmpty()) {
            log.warn("[RankingService] No chunks for resume={} — skipping scoring", resumeId);
            throw new IllegalStateException("No resume chunks found for: " + resumeId);
        }

        double matchScore = 0;
        double confidence = 0;
        boolean aiScreeningSuccess = false;

        ScreeningReport report = repository
                .findByResumeIdAndJobDescriptionId(resumeId, jobId)
                .orElse(ScreeningReport.builder()
                        .jobDescriptionId(jobId)
                        .resumeId(resumeId)
                        .build());

        // FIX 3: Fetch the candidate's skills list and perform normalized matching
        String rawCandidateSkills = "";
        try {
            rawCandidateSkills = candidateInfoClient.getCandidateSkills(resumeId);
        } catch (Exception e) {
            log.warn("[FIX] [RankingService] Failed to fetch candidate skills: {}", e.getMessage());
        }
        
        List<String> resumeSkills = new ArrayList<>();
        if (rawCandidateSkills != null && !rawCandidateSkills.isBlank()) {
            for (String s : rawCandidateSkills.split(",")) {
                if (!s.trim().isEmpty()) {
                    resumeSkills.add(s.trim());
                }
            }
        }
        
        String fullResumeText = String.join("\n\n", chunks);
        
        List<Map<String, Object>> matchedList = new ArrayList<>();
        List<Map<String, Object>> missingList = new ArrayList<>();
        List<Map<String, Object>> partialList = new ArrayList<>();
        
        for (String reqSkill : skills) {
            boolean isMatched = false;
            String foundAs = null;
            String section = "resume";
            SkillNormalizerService.MatchConfidence bestConfidence = SkillNormalizerService.MatchConfidence.NO_MATCH;
            
            for (String resSkill : resumeSkills) {
                SkillNormalizerService.MatchConfidence conf = skillNormalizerService.getMatchConfidence(reqSkill, resSkill);
                if (conf != SkillNormalizerService.MatchConfidence.NO_MATCH) {
                    isMatched = true;
                    foundAs = resSkill;
                    bestConfidence = conf;
                    section = "skills";
                    break;
                }
            }
            
            if (!isMatched && skillNormalizerService.resumeTextContainsSkill(reqSkill, fullResumeText)) {
                isMatched = true;
                foundAs = reqSkill;
                bestConfidence = SkillNormalizerService.MatchConfidence.PARTIAL;
                
                String textLower = fullResumeText.toLowerCase();
                String skillClean = reqSkill.toLowerCase().replaceAll("[.\\-\\s]+", "");
                int idx = textLower.indexOf(skillClean);
                if (idx == -1) {
                    idx = textLower.indexOf(reqSkill.toLowerCase());
                }
                if (idx != -1) {
                    String preceding = textLower.substring(Math.max(0, idx - 1000), idx);
                    if (preceding.contains("project")) {
                        section = "projects";
                    } else if (preceding.contains("intern") || preceding.contains("work") || preceding.contains("experi")) {
                        section = "experience";
                    } else if (preceding.contains("skill")) {
                        section = "skills";
                    }
                }
            }
            
            if (isMatched) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("required", reqSkill);
                m.put("found_as", foundAs != null ? foundAs : reqSkill);
                m.put("section", section);
                m.put("match_type", bestConfidence.name());
                matchedList.add(m);
            } else {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("skill", reqSkill);
                m.put("partial_match", false);
                missingList.add(m);
            }
        }
        
        double calculatedSkillScore = 0.0;
        if (!skills.isEmpty()) {
            calculatedSkillScore = Math.round(((double) matchedList.size() / skills.size() * 100.0) * 10.0) / 10.0;
        }
        
        // Build flat [{requirement, status}] array matching frontend expectations
        List<Map<String, Object>> flatChecklist = new ArrayList<>();
        for (Map<String, Object> m : matchedList) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("requirement", m.get("required"));
            item.put("status", "Matched");
            item.put("match_type", m.get("match_type"));
            item.put("section", m.get("section"));
            flatChecklist.add(item);
        }
        for (Map<String, Object> m : missingList) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("requirement", m.get("skill"));
            item.put("status", "Missing");
            item.put("match_type", "NO_MATCH");
            item.put("section", "-");
            flatChecklist.add(item);
        }

        String checklistJson = "[]";
        try {
            checklistJson = new ObjectMapper().writeValueAsString(flatChecklist);
        } catch (Exception ex) {
            log.error("[FIX] Checklist serialization failed", ex);
        }

        // Try context-based AI screening via Ollama
        try {
            String resumeExcerpt = fullResumeText.substring(0, Math.min(15000, fullResumeText.length()));

            AIScreeningServiceClient.ScreeningRequestDto screenReq = 
                    new AIScreeningServiceClient.ScreeningRequestDto(resumeExcerpt, jdText);

            log.info("[RankingService] Calling AI screening for resume={} job={}", resumeId, jobId);
            AIScreeningServiceClient.ScreeningResultDto aiResult = aiScreeningServiceClient.screenResume(screenReq);

            if (aiResult != null) {
                matchScore = calculatedSkillScore; // Use precise calculated skill score
                confidence = aiResult.getConfidenceScore();
                
                List<String> matchedNames = new ArrayList<>();
                for (Map<String, Object> m : matchedList) {
                    matchedNames.add(String.valueOf(m.get("required")));
                }
                String strengthsText = !matchedNames.isEmpty() ? String.join(", ", matchedNames) : "None identified";
                report.setStrengths("Matched strengths: " + strengthsText);
                
                // Store MISSING skills (gaps) in screening_reports.skill_gaps
                List<String> missingNames = new ArrayList<>();
                for (Map<String, Object> m : missingList) {
                    missingNames.add(String.valueOf(m.get("skill")));
                }
                report.setSkillGaps(missingNames.isEmpty() ? "None — all required skills matched" : String.join(", ", missingNames));
                
                // Construct a beautiful complete analysis text for structuredSummary
                StringBuilder summaryBuilder = new StringBuilder();
                if (aiResult.getOverallProfile() != null && aiResult.getOverallProfile().getDetails() != null) {
                    summaryBuilder.append("### OVERALL CANDIDATE PROFILE (Confidence: ")
                            .append(Math.round(aiResult.getOverallProfile().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getOverallProfile().getDetails()).append("\n\n");
                }
                if (aiResult.getEducation() != null && aiResult.getEducation().getDetails() != null) {
                    summaryBuilder.append("### EDUCATION (Confidence: ")
                            .append(Math.round(aiResult.getEducation().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getEducation().getDetails()).append("\n\n");
                }
                if (aiResult.getExperience() != null && aiResult.getExperience().getDetails() != null) {
                    summaryBuilder.append("### WORK EXPERIENCE & INTERNSHIPS (Confidence: ")
                            .append(Math.round(aiResult.getExperience().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getExperience().getDetails()).append("\n\n");
                }
                if (aiResult.getProjects() != null && aiResult.getProjects().getDetails() != null) {
                    summaryBuilder.append("### PROJECTS (Confidence: ")
                            .append(Math.round(aiResult.getProjects().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getProjects().getDetails()).append("\n\n");
                }
                if (aiResult.getAchievements() != null && aiResult.getAchievements().getDetails() != null) {
                    summaryBuilder.append("### ACHIEVEMENTS & CERTIFICATIONS (Confidence: ")
                            .append(Math.round(aiResult.getAchievements().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getAchievements().getDetails()).append("\n\n");
                }
                if (aiResult.getExtracurriculars() != null && aiResult.getExtracurriculars().getDetails() != null) {
                    summaryBuilder.append("### EXTRACURRICULARS & POR (Confidence: ")
                            .append(Math.round(aiResult.getExtracurriculars().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getExtracurriculars().getDetails()).append("\n\n");
                }
                if (aiResult.getSoftSkills() != null && aiResult.getSoftSkills().getDetails() != null) {
                    summaryBuilder.append("### SOFT SKILLS & POR (Confidence: ")
                            .append(Math.round(aiResult.getSoftSkills().getConfidence() * 100)).append("%)\n")
                            .append(aiResult.getSoftSkills().getDetails()).append("\n\n");
                }
                if (summaryBuilder.length() == 0) {
                    summaryBuilder.append(aiResult.getExplanation() != null ? aiResult.getExplanation() : "Screening complete.");
                }
                report.setStructuredSummary(summaryBuilder.toString().trim());
                report.setRequirementsChecklist(checklistJson);
                
                aiScreeningSuccess = true;
                log.info("[RankingService] AI screening success. Score={}", matchScore);
            }
        } catch (Exception e) {
            log.warn("[RankingService] AI screening service call failed: {}. Falling back to embedding-based heuristic.", e.getMessage());
        }

        if (!aiScreeningSuccess) {
            float[] jdEmbedding = embeddingModel.embed(jdText);
            double totalSim = 0;
            for (String chunk : chunks) {
                float[] e = embeddingModel.embed(chunk);
                totalSim += cosineSimilarity(jdEmbedding, e);
            }
            double avgSim   = totalSim / chunks.size();
            matchScore = calculatedSkillScore;
            confidence = Math.min(1.0, Math.max(0.0, Math.round(avgSim * 100.0) / 100.0));

            List<String> matchedNames = new ArrayList<>();
            for (Map<String, Object> m : matchedList) {
                matchedNames.add(String.valueOf(m.get("required")));
            }
            List<String> missingNames = new ArrayList<>();
            for (Map<String, Object> m : missingList) {
                missingNames.add(String.valueOf(m.get("skill")));
            }

            report.setStrengths("Matched skills: " + (matchedNames.isEmpty() ? "none" : String.join(", ", matchedNames)));
            report.setSkillGaps(missingNames.isEmpty() ? "None — all required skills matched" : String.join(", ", missingNames));
            report.setStructuredSummary(String.format(
                    "Match score: %.1f%%. Matched: %s. Gaps: %s.",
                    matchScore,
                    matchedNames.isEmpty() ? "none" : String.join(", ", matchedNames),
                    missingNames.isEmpty() ? "none" : String.join(", ", missingNames)));

            report.setRequirementsChecklist(checklistJson);
        }

        report.setCandidateName(candidateName);
        report.setCandidateEmail(candidateEmail);
        report.setMatchScore(matchScore);
        report.setConfidenceScore(confidence);

        ScreeningReport saved = repository.save(report);

        // Update ranking in Redis
        try {
            redisTemplate.opsForZSet().add(RANKING_KEY + jobId, resumeId.toString(), matchScore);
            meterRegistry.counter("ranking.redis.updates.total", "status", "success").increment();
        } catch (Exception e) {
            log.warn("[RankingService] Redis update failed: {}", e.getMessage());
            meterRegistry.counter("ranking.redis.updates.total", "status", "failed").increment();
        }

        // FIX: publish status-update so resume shows as SCREENED in the UI
        try {
            kafkaTemplate.send("resume-status-updated", resumeId.toString(),
                    Map.of("resumeId", resumeId.toString(), "status", "SCREENED"));
            log.info("[RankingService] Published SCREENED status for resume={}", resumeId);
        } catch (Exception e) {
            log.warn("[RankingService] Failed to publish SCREENED status: {}", e.getMessage());
        }

        log.info("[RankingService] ✓ resume={} job={} score={}", resumeId, jobId, matchScore);
        return saved;
        } catch (Exception e) {
            finalStatus = "failed";
            throw e;
        } finally {
            sample.stop(meterRegistry.timer("ranking.calculation.duration", "jobId", jobId.toString(), "status", finalStatus));
            meterRegistry.counter("ranking.calculated.total", "jobId", jobId.toString(), "status", finalStatus).increment();
        }
    }

    public List<ScreeningReport> getRankedCandidates(UUID jobId) {
        List<ScreeningReport> list =
                repository.findByJobDescriptionIdOrderByMatchScoreDesc(jobId);
        for (int i = 0; i < list.size(); i++) {
            list.get(i).setCandidateRank(i + 1);
        }
        return list;
    }

    public ScreeningReport getScreeningReport(UUID resumeId, UUID jobId) {
        return repository.findByResumeIdAndJobDescriptionId(resumeId, jobId).orElse(null);
    }

    public List<ScreeningReport> getReportsByResume(UUID resumeId) {
        return repository.findByResumeId(resumeId);
    }

    private double cosineSimilarity(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i]; na += a[i]*a[i]; nb += b[i]*b[i];
        }
        return (na == 0 || nb == 0) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    private String cleanStringForSearch(String s) {
        if (s == null) return "";
        return s.toLowerCase().replaceAll("[.\\-\\s]+", "").trim();
    }
}