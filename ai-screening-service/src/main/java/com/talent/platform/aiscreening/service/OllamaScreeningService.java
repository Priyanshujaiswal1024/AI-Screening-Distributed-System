package com.talent.platform.aiscreening.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.talent.platform.aiscreening.dto.ScreeningRequest;
import com.talent.platform.aiscreening.dto.ScreeningResult;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import lombok.extern.slf4j.Slf4j;
import java.util.*;

@Service
@Slf4j
public class OllamaScreeningService {

    private final ChatClient chatClient;
    private final SkillNormalizerService skillNormalizerService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public OllamaScreeningService(
            @Qualifier("screeningChatClient") ChatClient chatClient,
            SkillNormalizerService skillNormalizerService) {
        this.chatClient = chatClient;
        this.skillNormalizerService = skillNormalizerService;
    }

    public List<String> extractSkills(String resumeText) {
        String prompt =
                "You are a precise skill extraction engine.\n" +
                "Read the COMPLETE resume text below word by word.\n" +
                "Extract EVERY technical skill mentioned ANYWHERE including:\n" +
                "- Technical Skills / Languages / Frameworks / Tools sections\n" +
                "- Every technology mentioned in project descriptions\n" +
                "- Every technology mentioned in internship descriptions\n" +
                "- Any tool, language, or framework named anywhere\n\n" +
                "Return ONLY a JSON object with no explanation:\n" +
                "{\n" +
                "  \"extracted_skills\": [\"skill1\", \"skill2\"],\n" +
                "  \"skills_from_projects\": [\"skill1\", \"skill2\"],\n" +
                "  \"skills_from_internship\": [\"skill1\", \"skill2\"],\n" +
                "  \"skills_from_skills_section\": [\"skill1\", \"skill2\"]\n" +
                "}\n\n" +
                "Extract skills EXACTLY as written in resume.\n" +
                "Do NOT normalize — return original text.\n" +
                "Do NOT skip any technology mentioned anywhere.\n" +
                "Do NOT add skills not present in resume.\n\n" +
                "RESUME TEXT:\n" + resumeText;

        try {
            log.info("[FIX] [Screening] Sending skill extraction prompt to Groq API");

            log.info("[FIX] [OllamaScreening] Sending skill extraction prompt to Ollama");
            String response = chatClient.prompt()
                    .messages(new UserMessage(prompt))
                    .call()
                    .content();

            if (response == null || response.isBlank()) {
                return Collections.emptyList();
            }

            String clean = response.replaceAll("```json|```", "").trim();
            int start = clean.indexOf('{');
            int end = clean.lastIndexOf('}');
            if (start != -1 && end != -1 && end > start) {
                clean = clean.substring(start, end + 1);
            }

            JsonNode node = objectMapper.readTree(clean);
            Set<String> allRawSkills = new LinkedHashSet<>();
            
            addSkillsFromNode(node, "extracted_skills", allRawSkills);
            addSkillsFromNode(node, "skills_from_projects", allRawSkills);
            addSkillsFromNode(node, "skills_from_internship", allRawSkills);
            addSkillsFromNode(node, "skills_from_skills_section", allRawSkills);

            List<String> deduplicatedSkills = new ArrayList<>();
            for (String rawSkill : allRawSkills) {
                String canonical = skillNormalizerService.normalize(rawSkill);
                if (!canonical.isEmpty() && !deduplicatedSkills.contains(canonical)) {
                    deduplicatedSkills.add(canonical);
                }
            }

            log.info("[FIX] [OllamaScreening] Extracted and normalized skills: {}", deduplicatedSkills);
            return deduplicatedSkills;
        } catch (Exception e) {
            log.error("[FIX] [OllamaScreening] Skill extraction failed: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    private void addSkillsFromNode(JsonNode parent, String fieldName, Set<String> target) {
        if (parent.has(fieldName) && parent.get(fieldName).isArray()) {
            for (JsonNode sNode : parent.get(fieldName)) {
                String skill = sNode.asText().trim();
                if (!skill.isEmpty()) {
                    target.add(skill);
                }
            }
        }
    }

    public ScreeningResult screenResume(ScreeningRequest request) {
        String prompt =
                "Analyze this resume against the job description and return a comprehensive JSON evaluation.\n\n" +
                        "JOB DESCRIPTION:\n" +
                        request.getJobDescription() + "\n\n" +
                        "RESUME:\n" +
                        request.getResumeText() + "\n\n" +
                        "Return ONLY a valid JSON object with exactly these fields:\n" +
                        "{\n" +
                        "  \"matchScore\": 75,\n" +
                        "  \"strengths\": [\"strength1\", \"strength2\"],\n" +
                        "  \"missingSkills\": [\"skill1\", \"skill2\"],\n" +
                        "  \"confidenceScore\": 0.8,\n" +
                        "  \"explanation\": \"brief overall evaluation summary\",\n" +
                        "  \"requirementsChecklist\": [\n" +
                        "    { \"requirement\": \"React\", \"status\": \"Matched\" }\n" +
                        "  ],\n" +
                        "  \"education\": {\n" +
                        "    \"details\": \"IIT/NIT or other college name, degree, branch, graduation year. Class 10th and 12th school names, boards, years, academic achievements, percentile, grades.\",\n" +
                        "    \"confidence\": 0.9\n" +
                        "  },\n" +
                        "  \"experience\": {\n" +
                        "    \"details\": \"Company name, role, duration, location. Bullet point responsibilities and technologies used.\",\n" +
                        "    \"confidence\": 0.95\n" +
                        "  },\n" +
                        "  \"projects\": {\n" +
                        "    \"details\": \"Project name, tech stack, what it does, scale metrics, candidate contribution, GitHub/live links.\",\n" +
                        "    \"confidence\": 0.85\n" +
                        "  },\n" +
                        "  \"achievements\": {\n" +
                        "    \"details\": \"Competitions, hackathons, certifications, ranks, percentiles, awarding org.\",\n" +
                        "    \"confidence\": 0.8\n" +
                        "  },\n" +
                        "  \"extracurriculars\": {\n" +
                        "    \"details\": \"Club names, roles, duration, events managed, team size, leadership.\",\n" +
                        "    \"confidence\": 0.8\n" +
                        "  },\n" +
                        "  \"softSkills\": {\n" +
                        "    \"details\": \"Inferred soft skills with event/POR evidence.\",\n" +
                        "    \"confidence\": 0.75\n" +
                        "  },\n" +
                        "  \"overallProfile\": {\n" +
                        "    \"details\": \"Strong points vs weak points, suitable roles, red flags (gaps, vague descriptions, no metrics), cultural/role fit beyond skills.\",\n" +
                        "    \"confidence\": 0.85\n" +
                        "  }\n" +
                        "}\n\n" +
                        "Rules:\n" +
                        "- matchScore must be a plain integer number (e.g. 75, not '75%')\n" +
                        "- confidenceScore must be a decimal double (e.g. 0.8)\n" +
                        "- Return ONLY the JSON object, no markdown, no extra text\n" +
                        "- Scan the ENTIRE resume text (all sections) to extract details\n" +
                        "- Never leave any details field empty — if not mentioned write 'not mentioned'\n" +
                        "- Support skill alias normalization (e.g., 'ReactJS' matches 'React', 'NodeJS' matches 'Node.js', 'TailwindCSS' matches 'Tailwind CSS')";

        try {


            String response = chatClient.prompt()
                    .messages(new UserMessage(prompt))
                    .call()
                    .content();

            if (response == null || response.isBlank()) {
                throw new RuntimeException("Ollama returned empty response");
            }

            String clean = response.replaceAll("```json|```", "").trim();
            // Fallback: search for first '{' and last '}' if model outputs text alongside JSON
            int start = clean.indexOf('{');
            int end = clean.lastIndexOf('}');
            if (start != -1 && end != -1 && end > start) {
                clean = clean.substring(start, end + 1);
            }

            return objectMapper.readValue(clean, ScreeningResult.class);
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse screening result from Ollama: " + e.getMessage(), e);
        }
    }
}