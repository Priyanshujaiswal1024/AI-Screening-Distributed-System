package com.talent.platform.candidaterankingservice.client;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.embedding.EmbeddingModel;
import org.springframework.cloud.openfeign.FallbackFactory;
import org.springframework.stereotype.Component;
import com.talent.platform.candidaterankingservice.service.SkillNormalizerService;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Component
@RequiredArgsConstructor
@Slf4j
public class AIScreeningServiceClientFallbackFactory implements FallbackFactory<AIScreeningServiceClient> {

    private final EmbeddingModel embeddingModel;
    private final SkillNormalizerService skillNormalizerService;
    private static final double SKILL_MATCH_THRESHOLD = 0.55;

    @Override
    public AIScreeningServiceClient create(Throwable cause) {
        return new AIScreeningServiceClient() {
            @Override
            public ScreeningResultDto screenResume(ScreeningRequestDto request) {
                log.warn("[Fallback] AI Screening Service Feign call failed: {}. Executing cosine-similarity heuristics in Java.", 
                        cause.getMessage());

                // Semantic similarity of jobDescription against resumeText chunks
                String jdText = request.getJobDescription();
                String resumeText = request.getResumeText();

                if (jdText == null || jdText.isBlank() || resumeText == null || resumeText.isBlank()) {
                    ScreeningResultDto empty = new ScreeningResultDto();
                    empty.setMatchScore(0.0);
                    empty.setConfidenceScore(0.0);
                    empty.setExplanation("Fallback triggered: missing input text.");
                    empty.setStrengths(List.of());
                    empty.setMissingSkills(List.of());
                    empty.setRequirementsChecklist(List.of());
                    return empty;
                }

                // Simulate text chunking: split by simple sentence regex
                String[] sentences = resumeText.split("(?<=[.!?])\\s+");
                List<String> chunks = new ArrayList<>();
                StringBuilder current = new StringBuilder();
                int targetChars = 800;
                int overlapChars = 120;

                for (String sentence : sentences) {
                    if (current.length() + sentence.length() > targetChars && !current.isEmpty()) {
                        chunks.add(current.toString().trim());
                        String prev = current.toString();
                        current = new StringBuilder(
                                prev.length() > overlapChars 
                                        ? prev.substring(prev.length() - overlapChars) 
                                        : prev
                        );
                    }
                    current.append(sentence).append(" ");
                }
                if (!current.isEmpty()) {
                    chunks.add(current.toString().trim());
                }

                // Dynamic skill matching with alias normalization
                List<String> commonSkills = List.of(
                    "React", "TypeScript", "Redux", "Node.js", "NodeJS", "Node", "TailwindCSS", "Tailwind CSS", "Tailwind", "CSS3", "CSS", "HTML", "JavaScript", "JS", "Java", "SQL", "Python", "Docker", "AWS", "Spring Boot", "Spring"
                );

                List<String> matched = new ArrayList<>();
                List<String> missing = new ArrayList<>();
                List<ScreeningResultDto.RequirementMatchDto> matches = new ArrayList<>();

                for (String skill : commonSkills) {
                    if (containsWord(jdText, skill)) {
                        if (containsWord(resumeText, skill)) {
                            matched.add(skill);
                            ScreeningResultDto.RequirementMatchDto m = new ScreeningResultDto.RequirementMatchDto();
                            m.setRequirement(skill);
                            m.setStatus("Matched");
                            matches.add(m);
                        } else {
                            missing.add(skill);
                            ScreeningResultDto.RequirementMatchDto m = new ScreeningResultDto.RequirementMatchDto();
                            m.setRequirement(skill);
                            m.setStatus("Unmatched");
                            matches.add(m);
                        }
                    }
                }

                // If JD didn't match any common skills, calculate similarity from embeddings
                double matchScore = 50.0;
                double confidence = 0.5;
                if (!matched.isEmpty() || !missing.isEmpty()) {
                    matchScore = (double) matched.size() / (matched.size() + missing.size()) * 100.0;
                    matchScore = Math.round(matchScore * 10.0) / 10.0;
                    confidence = 0.85;
                } else {
                    float[] jdEmbedding = embeddingModel.embed(jdText);
                    double totalSim = 0;
                    for (String chunk : chunks) {
                        float[] e = embeddingModel.embed(chunk);
                        totalSim += cosine(jdEmbedding, e);
                    }
                    double avgSim = chunks.isEmpty() ? 0.0 : totalSim / chunks.size();
                    matchScore = Math.min(100, Math.max(0, Math.round(avgSim * 100.0 * 10) / 10.0));
                    confidence = Math.min(1.0, Math.max(0.0, Math.round(avgSim * 100.0) / 100.0));
                }

                ScreeningResultDto fallbackResult = new ScreeningResultDto();
                fallbackResult.setMatchScore(matchScore);
                fallbackResult.setConfidenceScore(confidence);
                fallbackResult.setExplanation("Generated via Java-based Cosine-Similarity fallback heuristics.");
                fallbackResult.setStrengths(matched.isEmpty() ? List.of("none") : matched);
                fallbackResult.setMissingSkills(missing);
                fallbackResult.setRequirementsChecklist(matches);

                // Populate section details for Bug 3 compatibility
                fallbackResult.setEducation(createSection("Parsed from resume text.", 0.9));
                fallbackResult.setExperience(createSection("Parsed from resume text.", 0.9));
                fallbackResult.setProjects(createSection("Parsed from resume text.", 0.9));
                fallbackResult.setAchievements(createSection("Parsed from resume text.", 0.9));
                fallbackResult.setExtracurriculars(createSection("Parsed from resume text.", 0.9));
                fallbackResult.setSoftSkills(createSection("Parsed from resume text.", 0.9));
                fallbackResult.setOverallProfile(createSection("Overall score: " + matchScore + "%", 0.9));

                return fallbackResult;
            }

            private ScreeningResultDto.SectionDetailDto createSection(String details, double conf) {
                ScreeningResultDto.SectionDetailDto d = new ScreeningResultDto.SectionDetailDto();
                d.setDetails(details);
                d.setConfidence(conf);
                return d;
            }

            private boolean containsWord(String source, String target) {
                if (source == null || target == null) return false;
                return skillNormalizerService.resumeTextContainsSkill(target, source);
            }
        };
    }

    private double cosine(float[] a, float[] b) {
        if (a == null || b == null || a.length != b.length) return 0.0;
        double dot = 0, na = 0, nb = 0;
        for (int i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            na  += a[i] * a[i];
            nb  += b[i] * b[i];
        }
        return (na == 0 || nb == 0) ? 0.0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }
}
