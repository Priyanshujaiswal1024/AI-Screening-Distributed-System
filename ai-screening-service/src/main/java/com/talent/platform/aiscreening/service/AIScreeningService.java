package com.talent.platform.aiscreening.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

import com.talent.platform.aiscreening.client.JobDescriptionClient;
import com.talent.platform.aiscreening.client.ResumeManagementClient;
import com.talent.platform.aiscreening.dto.ScreeningRequest;
import com.talent.platform.aiscreening.dto.ScreeningResult;
import com.talent.platform.aiscreening.model.ResumeChunk;
import com.talent.platform.aiscreening.parser.TextChunker;
import com.talent.platform.aiscreening.parser.TikaParser;
import com.talent.platform.aiscreening.repository.ResumeChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.document.Document;
import org.springframework.ai.vectorstore.VectorStore;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * AI Screening Service — Full RAG + Screening pipeline.
 *
 * ═══════════════════════════════════════════════════════════════════
 * BUGS FIXED IN THIS VERSION:
 * ═══════════════════════════════════════════════════════════════════
 *
 * BUG A — ResumeUploadedConsumer called old 2-arg signature:
 *   processAndIndexResume(resumeId, fileUrl)
 *   NEW signature: processAndIndexResume(resumeId, fileUrl, recruiterId)
 *   recruiterId is REQUIRED so ResumeParsedConsumer in candidate-ranking-service
 *   can look up the recruiter's jobs and auto-rank the new resume.
 *
 * BUG B + E — publishStatusUpdate published a typed Java record:
 *   new ResumeStatusUpdatedEvent(resumeId, status)
 *   Jackson adds __TypeId__ header → resume-management's Map<String,Object> consumer
 *   throws MismatchedInputException → 3 retries → DLT → status NEVER updates.
 *   FIX: publish as plain HashMap — no __TypeId__, no class coupling.
 *
 * BUG D — Feign AND Kafka both fired unconditionally (double-write):
 *   FIX: Kafka fires ONLY when Feign throws. True fallback, not parallel.
 *
 * BUG F — CRITICAL: OllamaScreeningService.screenResume() was NEVER called.
 *   Pipeline stopped at PARSED. SCREENED was never published.
 *   FIX: Step 8 calls screenResume(). Step 9 publishes SCREENED.
 *
 * BUG G — LLM template: .param("text", excerpt) conflicts with Llama3's
 *   native template engine → "template string is not valid" error.
 *   FIX: String.format() / concatenation — zero .param() calls in extraction.
 *
 * BUG H — OllamaScreeningService used .param("jd", ...) and .param("resume", ...)
 *   Same Llama3 template conflict.
 *   FIX: Plain string concatenation in OllamaScreeningService (see that file).
 *
 * ═══════════════════════════════════════════════════════════════════
 * PIPELINE:
 *   UPLOADED → parse → embed → PARSED → screen → SCREENED
 *                                              ↓ (if Ollama down)
 *                                            stays PARSED (non-fatal)
 * ═══════════════════════════════════════════════════════════════════
 */
@Service
@Slf4j
public class AIScreeningService {

    private final TikaParser tikaParser;
    private final ResumeChunkRepository chunkRepository;
    private final VectorStore vectorStore;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ResumeManagementClient resumeManagementClient;
    private final ChatClient chatClient;
    private final OllamaScreeningService ollamaScreeningService;
    private final TextChunker textChunker;
    private final JdbcTemplate jdbcTemplate;
    private final JobDescriptionClient jobDescriptionClient;
    private final MeterRegistry meterRegistry;

    // ── Topic names ───────────────────────────────────────────────────────────
    private static final String PARSED_TOPIC         = "resume-parsed";
    private static final String STATUS_UPDATED_TOPIC = "resume-status-updated";

    // ── Kafka event keys — shared constants (no class coupling) ──────────────
    public static final String EVENT_RESUME_ID       = "resumeId";
    public static final String EVENT_CANDIDATE_NAME  = "candidateName";
    public static final String EVENT_CANDIDATE_EMAIL = "candidateEmail";
    public static final String EVENT_RECRUITER_ID    = "recruiterId";
    public static final String EVENT_STATUS          = "status";

    // ── Manual constructor (no @RequiredArgsConstructor) so @Qualifier works ─
    public AIScreeningService(
            TikaParser tikaParser,
            ResumeChunkRepository chunkRepository,
            VectorStore vectorStore,
            KafkaTemplate<String, Object> kafkaTemplate,
            ResumeManagementClient resumeManagementClient,
            @Qualifier("screeningChatClient") ChatClient chatClient,
            OllamaScreeningService ollamaScreeningService,
            TextChunker textChunker,
            JdbcTemplate jdbcTemplate,
            JobDescriptionClient jobDescriptionClient,
            MeterRegistry meterRegistry) {
        this.tikaParser             = tikaParser;
        this.chunkRepository        = chunkRepository;
        this.vectorStore            = vectorStore;
        this.kafkaTemplate          = kafkaTemplate;
        this.resumeManagementClient = resumeManagementClient;
        this.chatClient             = chatClient;
        this.ollamaScreeningService = ollamaScreeningService;
        this.textChunker            = textChunker;
        this.jdbcTemplate           = jdbcTemplate;
        this.jobDescriptionClient   = jobDescriptionClient;
        this.meterRegistry          = meterRegistry;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // MAIN PIPELINE ENTRY POINT
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Full pipeline: UPLOADED → parse → embed → PARSED → screen → SCREENED
     *
     * BUG A FIX: Added recruiterId parameter.
     * This is passed into the resume-parsed Kafka event so that
     * candidate-ranking-service can auto-rank the resume against all of
     * the recruiter's jobs without needing a separate trigger.
     *
     * @param resumeId   UUID of the resume being processed
     * @param fileUrl    S3 URL of the uploaded file
     * @param recruiterId UUID of the recruiter who uploaded — REQUIRED for auto-ranking
     */
    public void processAndIndexResume(UUID resumeId, String fileUrl, UUID recruiterId, UUID jobId) {
        log.info("[AIScreening] ── START resume={} recruiter={} jobId={}", resumeId, recruiterId, jobId);
        String parsedText = null;
        String finalStatus = "FAILED";
        Timer.Sample sample = Timer.start(meterRegistry);

        try {
            // ── Step 1: Parse PDF/DOCX via Apache Tika ────────────────────────
            parsedText = tikaParser.parse(fileUrl);
            log.info("[AIScreening] Extracted {} chars from resume={}", parsedText.length(), resumeId);

            // ── Step 2: Extract candidate name, email, experience, skills, notice period via LLM ───────────────
            String candidateName  = "Unknown Candidate";
            String candidateEmail = "unknown@email.com";
            Double extractedExp = 0.0;
            String extractedSkills = "";
            String extractedNotice = "Not Specified";

            // Check if name/email are already specified manually by the user
            try {
                com.talent.platform.aiscreening.dto.ResumeMetadataDto meta = resumeManagementClient.getResumeMetadata(resumeId);
                if (meta != null) {
                    if (meta.getCandidateName() != null && !meta.getCandidateName().isBlank() && !meta.getCandidateName().equals("Unknown")) {
                        candidateName = meta.getCandidateName();
                    }
                    if (meta.getCandidateEmail() != null && !meta.getCandidateEmail().isBlank() && !meta.getCandidateEmail().equals("unknown@email.com")) {
                        candidateEmail = meta.getCandidateEmail();
                    }
                }
            } catch (Exception e) {
                log.warn("[AIScreening] Failed to fetch initial metadata for resume={}: {}", resumeId, e.getMessage());
            }

            // Extract from resume if not already set manually
            boolean needName = "Unknown Candidate".equals(candidateName) || "Unknown".equals(candidateName);
            boolean needEmail = "unknown@email.com".equals(candidateEmail);

            if (needEmail) {
                String regexEmail = extractEmailRegex(parsedText);
                if (regexEmail != null) {
                    candidateEmail = regexEmail;
                    needEmail = false;
                    log.info("[AIScreening] Regex extracted email: '{}'", candidateEmail);
                }
            }

            try {
                String excerpt = parsedText.substring(0, Math.min(15000, parsedText.length()));

                String prompt =
                        "Analyze the following resume text carefully and extract the candidate's core details.\n" +
                        "Note that the details could be located anywhere, so scan the entire text. For experience, calculate the total years of professional work experience by summing up duration of all full-time jobs / corporate work history (e.g. from 2021-2023 is 2 years, etc.), even if not explicitly written as a total number.\n" +
                        "Return ONLY a JSON object in this exact format, nothing else:\n" +
                        "{\n" +
                        "  \"name\": \"Full Name Here\",\n" +
                        "  \"email\": \"email@example.com\",\n" +
                        "  \"totalExperience\": 1.5,\n" +
                        "  \"skills\": [\"React\", \"TypeScript\", \"Node.js\"],\n" +
                        "  \"noticePeriod\": \"Immediate Joiner\"\n" +
                        "}\n\n" +
                        "Rules:\n" +
                        "- totalExperience must be a number (Double/Float, e.g. 1.5 or 0.0), representing total years of professional work experience. Use 0.0 if no professional experience is found.\n" +
                        "- DO NOT count education years (such as matriculation, high secondary, or college/university studies/degrees) towards professional experience.\n" +
                        "- DO NOT count self-learning, training programs, or course durations (like DSA training) as professional work experience.\n" +
                        "- Be extremely conservative: if no clear professional full-time jobs or formal corporate internships are listed, the experience must be 0.0.\n" +
                        "- skills must be a JSON array of strings containing up to 6 key technical skills found in the resume.\n" +
                        "- noticePeriod must be a string representing their notice period if mentioned (e.g., \"Immediate Joiner\", \"15 Days\", \"30 Days\", \"90 Days\"), otherwise \"Not Specified\".\n" +
                        "- Do not include any explanations, markdown, or text outside the JSON.\n\n" +
                        "Resume text:\n" + excerpt;

                String extraction = chatClient.prompt()
                        .messages(new UserMessage(prompt))
                        .call()
                        .content();

                String clean = extraction.replaceAll("```json|```", "").trim();
                int startIdx = clean.indexOf('{');
                int endIdx = clean.lastIndexOf('}');
                if (startIdx != -1 && endIdx != -1 && endIdx > startIdx) {
                    clean = clean.substring(startIdx, endIdx + 1);
                }

                String nameMatch  = extractJsonField(clean, "name");
                String emailMatch = extractJsonField(clean, "email");

                if (needName && nameMatch != null && !nameMatch.isBlank()
                        && !nameMatch.equals("Unknown Candidate")) {
                    candidateName = nameMatch;
                }
                if (needEmail && emailMatch != null && !emailMatch.isBlank()
                        && !emailMatch.equals("unknown@email.com")) {
                    candidateEmail = emailMatch;
                }

                try {
                    String expStr = extractJsonField(clean, "totalExperience");
                    if (expStr != null && !expStr.isBlank()) {
                        extractedExp = Double.valueOf(expStr);
                    }
                } catch (Exception e) {
                    log.warn("[AIScreening] Failed to parse extracted totalExperience: {}", e.getMessage());
                }

                // FIX 2: Use the new extractSkills method which scans all sections and normalizes using SkillNormalizerService
                try {
                    List<String> normalizedSkills = ollamaScreeningService.extractSkills(parsedText);
                    if (!normalizedSkills.isEmpty()) {
                        extractedSkills = String.join(", ", normalizedSkills);
                    }
                } catch (Exception e) {
                    log.warn("[FIX] [AIScreening] Failed to extract normalized skills: {}", e.getMessage());
                }

                try {
                    String npStr = extractJsonField(clean, "noticePeriod");
                    if (npStr != null && !npStr.isBlank()) {
                        extractedNotice = npStr;
                    }
                } catch (Exception e) {
                    log.warn("[AIScreening] Failed to parse extracted noticePeriod: {}", e.getMessage());
                }

                log.info("[AIScreening] LLM extracted details: name='{}' email='{}' exp={} skills='{}' notice='{}'",
                        candidateName, candidateEmail, extractedExp, extractedSkills, extractedNotice);

            } catch (Exception e) {
                log.warn("[AIScreening] LLM details extraction failed (Ollama offline?): {}. Using placeholders.", e.getMessage());
            }

            final String finalName      = candidateName;
            final String finalEmail     = candidateEmail;
            final String finalRecrId    = recruiterId != null ? recruiterId.toString() : "";
            final Double finalExp       = extractedExp;
            final String finalSkills    = extractedSkills;
            final String finalNotice    = extractedNotice;

            // ── Step 3 + 4: Chunk + build Spring AI Documents ─────────────────
            List<String> textChunks = textChunker.chunk(parsedText);
            log.info("[AIScreening] Split into {} chunks for resume={}", textChunks.size(), resumeId);

            List<Document> documents = new ArrayList<>();
            for (int i = 0; i < textChunks.size(); i++) {
                Map<String, Object> meta = new HashMap<>();
                meta.put("resumeId",       resumeId.toString());
                meta.put("candidateName",  finalName);
                meta.put("candidateEmail", finalEmail);
                meta.put("chunkIndex",     i);
                meta.put("source",         "resume-upload");
                meta.put("totalChunks",    textChunks.size());
                meta.put("recruiterId",    finalRecrId);
                meta.put("jobId",          jobId != null ? jobId.toString() : "");
                documents.add(new Document(textChunks.get(i), meta));
            }

            // ── Step 5: Store raw chunks in resume_chunks table and embeddings in pgvector ──
            // Always save to database for tool and controller access
            try {
                for (int i = 0; i < textChunks.size(); i++) {
                    chunkRepository.save(ResumeChunk.builder()
                            .resumeId(resumeId)
                            .chunkIndex(i)
                            .content(textChunks.get(i))
                            .build());
                }
                log.info("[AIScreening] Saved {} chunks to database for resume={}", textChunks.size(), resumeId);
            } catch (Exception e) {
                log.error("[AIScreening] Failed to save chunks to database for resume={}: {}", resumeId, e.getMessage());
            }

            // Store embeddings in pgvector
            try {
                vectorStore.add(documents);
                log.info("[AIScreening] Stored {} vectors in pgvector for resume={}", documents.size(), resumeId);
            } catch (Exception e) {
                log.warn("[AIScreening] pgvector failed ({}). Database chunks are still saved.", e.getMessage());
            }

            // ── Step 6: Publish resume-parsed event as plain Map ─────────────
            // BUG B FIX: HashMap, no type headers — all consumers deserialize safely
            Map<String, Object> parsedEvent = new HashMap<>();
            parsedEvent.put(EVENT_RESUME_ID,       resumeId.toString());
            parsedEvent.put(EVENT_CANDIDATE_NAME,  finalName);
            parsedEvent.put(EVENT_CANDIDATE_EMAIL, finalEmail);
            parsedEvent.put(EVENT_RECRUITER_ID,    finalRecrId);   // ← BUG A FIX: pass recruiterId
            parsedEvent.put("totalExperience",     finalExp);
            parsedEvent.put("skills",              finalSkills);
            parsedEvent.put("noticePeriod",        finalNotice);
            if (jobId != null) {
                parsedEvent.put("jobId", jobId.toString());
            }
            kafkaTemplate.send(PARSED_TOPIC, resumeId.toString(), parsedEvent);
            log.info("[AIScreening] Published resume-parsed event for resume={}", resumeId);

            // ── Step 7: Mark status → PARSED ─────────────────────────────────
            publishStatusUpdate(resumeId, "PARSED");
            finalStatus = "PARSED";

            // ── Step 8: Run AI Screening via Ollama ───────────────────────────
            // BUG F FIX: This entire block was MISSING. Without it, status could
            // never advance past PARSED and the ranking page stayed empty forever.
            log.info("[AIScreening] Starting AI screening for resume={}", resumeId);
            try {
                String resumeExcerpt = parsedText.substring(0, Math.min(3000, parsedText.length()));

                ScreeningRequest screeningRequest = new ScreeningRequest();
                screeningRequest.setResumeText(resumeExcerpt);
                
                String jobDesc = "Software Engineer / Developer position requiring strong programming skills, " +
                                "problem-solving ability, relevant technical experience, and good communication. " +
                                "This is a general screening to index the candidate profile for the talent pool.";
                if (jobId != null) {
                    try {
                        String fetchedDesc = jobDescriptionClient.getJobText(jobId);
                        if (fetchedDesc != null && !fetchedDesc.isBlank()) {
                            jobDesc = fetchedDesc;
                            log.info("[AIScreening] Fetched job description raw text for jobId={}", jobId);
                        }
                    } catch (Exception e) {
                        log.warn("[AIScreening] Failed to fetch job description raw text for jobId={}: {}", jobId, e.getMessage());
                    }
                }
                screeningRequest.setJobDescription(jobDesc);

                // OllamaScreeningService is also fixed (BUG H) — no .param() calls there either
                ScreeningResult result = ollamaScreeningService.screenResume(screeningRequest);
                log.info("[AIScreening] Screening complete for resume={} score={}",
                        resumeId, result.getMatchScore());

                // ── Step 9: Mark status → SCREENED ───────────────────────────
                // BUG F FIX: Was NEVER reached. Now it is.
                publishStatusUpdate(resumeId, "SCREENED");
                finalStatus = "SCREENED";

            } catch (Exception e) {
                // Screening failure is NON-FATAL:
                // Parsing + embedding succeeded → resume is indexed and searchable.
                // Status stays PARSED so the recruiter knows something needs attention.
                // Do NOT mark FAILED — that would hide the resume from ranking searches.
                log.warn("[AIScreening] Ollama screening failed for resume={} (Ollama offline?): {}. " +
                        "Resume stays PARSED — re-screening can be triggered manually.", resumeId, e.getMessage());
            }

        } catch (Exception e) {
            log.error("[AIScreening] Pipeline FAILED for resume={}: {}", resumeId, e.getMessage(), e);
            publishStatusUpdate(resumeId, "FAILED");
            sample.stop(meterRegistry.timer("ai.screening.duration", "status", "FAILED"));
            meterRegistry.counter("ai.screenings.processed.total", "status", "FAILED").increment();
            throw new RuntimeException("Resume RAG ingestion pipeline failed", e);
        }

        sample.stop(meterRegistry.timer("ai.screening.duration", "status", finalStatus));
        meterRegistry.counter("ai.screenings.processed.total", "status", finalStatus).increment();
        log.info("[AIScreening] ── END resume={}", resumeId);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // STATUS UPDATE — Feign primary, Kafka fallback
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * BUG D FIX: Kafka fires ONLY when Feign throws — true fallback, not double-write.
     * BUG B+E FIX: Kafka event is a plain HashMap, NOT a typed class.
     *   Typed class added __TypeId__ Jackson header which broke resume-management's
     *   Map<String,Object> consumer → MismatchedInputException → DLT.
     */
    private void publishStatusUpdate(UUID resumeId, String status) {
        boolean feignSucceeded = false;
        try {
            resumeManagementClient.updateResumeStatus(resumeId, status);
            log.info("[AIScreening] Feign status → {} for resume={}", status, resumeId);
            feignSucceeded = true;
        } catch (Exception e) {
            log.warn("[AIScreening] Feign status update failed for resume={} status={}: {}",
                    resumeId, status, e.getMessage());
        }

        // Kafka fires ONLY if Feign failed (BUG D FIX)
        if (!feignSucceeded) {
            try {
                Map<String, Object> statusEvent = new HashMap<>();
                statusEvent.put(EVENT_RESUME_ID, resumeId.toString());
                statusEvent.put(EVENT_STATUS,    status);
                kafkaTemplate.send(STATUS_UPDATED_TOPIC, resumeId.toString(), statusEvent);
                log.info("[AIScreening] Kafka fallback → {} for resume={}", status, resumeId);
            } catch (Exception e) {
                log.error("[AIScreening] CRITICAL: Both Feign AND Kafka failed for resume={} status={}: {}",
                        resumeId, status, e.getMessage());
            }
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    private String extractEmailRegex(String text) {
        if (text == null) return null;
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}")
                    .matcher(text);
            return m.find() ? m.group(0).trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    private String extractJsonField(String json, String field) {
        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode node = mapper.readTree(json);
            if (node.has(field)) {
                return node.get(field).asText().trim();
            }
        } catch (Exception e) {
            log.warn("[AIScreening] Jackson parsing failed for JSON: {}. Falling back to regex.", json);
        }
        try {
            java.util.regex.Matcher m = java.util.regex.Pattern
                    .compile("\"" + field + "\"\\s*:\\s*\"([^\"]+)\"")
                    .matcher(json);
            return m.find() ? m.group(1).trim() : null;
        } catch (Exception e) {
            return null;
        }
    }

    @Transactional
    public void deleteVectorsAndChunks(UUID resumeId) {
        log.info("[AIScreening] Deleting database chunks for resume={}", resumeId);
        try {
            chunkRepository.deleteByResumeId(resumeId);
            log.info("[AIScreening] Successfully deleted chunks for resume={}", resumeId);
        } catch (Exception e) {
            log.error("[AIScreening] Failed to delete chunks for resume={}: {}", resumeId, e.getMessage());
        }

        log.info("[AIScreening] Deleting pgvector vectors for resume={}", resumeId);
        try {
            jdbcTemplate.update("DELETE FROM vector_store WHERE metadata->>'resumeId' = ?", resumeId.toString());
            log.info("[AIScreening] Successfully deleted pgvector vectors for resume={}", resumeId);
        } catch (Exception e) {
            log.warn("[AIScreening] Failed to delete vectors from pgvector: {}", e.getMessage());
        }
    }
}