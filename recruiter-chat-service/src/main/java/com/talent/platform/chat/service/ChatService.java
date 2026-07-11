package com.talent.platform.chat.service;

import com.talent.platform.chat.client.ResumeServiceClient;
import com.talent.platform.chat.client.JobServiceClient;
import com.talent.platform.chat.client.AiScreeningServiceClient;
import com.talent.platform.chat.client.ScreeningServiceClient;
import com.talent.platform.chat.event.ChatInteractionEvent;
import com.talent.platform.chat.model.ChatMessageEntity;
import com.talent.platform.chat.repository.ChatMessageRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.client.advisor.RetrievalAugmentationAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.rag.preretrieval.query.expansion.MultiQueryExpander;
import org.springframework.ai.rag.preretrieval.query.transformation.RewriteQueryTransformer;
import org.springframework.ai.rag.retrieval.join.ConcatenationDocumentJoiner;
import org.springframework.ai.rag.retrieval.search.DocumentRetriever;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatClient chatClient;
    private final ChatModel chatModel;                            // FIX: missing field — needed to build per-request transformers
    private final ChatMemory chatMemory;
    private final ChatMessageRepository chatMessageRepository;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final QueryRouterService queryRouter;
    private final HybridRetrievalService hybridRetrievalService;
    private final RerankingService rerankingService;
    private final RecruiterAssistantTools recruiterAssistantTools;
    private final ResumeServiceClient resumeServiceClient;
    private final JobServiceClient jobServiceClient;
    private final AiScreeningServiceClient aiScreeningServiceClient;
    private final ScreeningServiceClient screeningServiceClient;
    private final MeterRegistry meterRegistry;

    public String generateResponse(UUID jobId, UUID resumeId,
                                   String message, String conversationId) {

        log.info("[ChatService] ══════════════════════════════════════");
        log.info("[ChatService] Original Query  : '{}'", message);
        log.info("[ChatService] ResumeId        : '{}'", resumeId);
        log.info("[ChatService] JobId           : '{}'", jobId);
        log.info("[ChatService] ConversationId  : '{}'", conversationId);

        meterRegistry.counter("chat.messages.total", "role", "USER").increment();
        persist(conversationId, "USER", message, jobId, resumeId);

        try {
            ChatContextHolder.set(jobId, resumeId);

            // Build dynamic system prompt based on active candidate and job context
            String systemPrompt = """
                    You are an elite, recruiter-grade AI Copilot (combining the expertise of a Senior Recruiter, HR Consultant, Talent Intelligence Analyst, Staff Software Engineer, and AI Researcher). You match the caliber of advanced frontier models like Claude, ChatGPT, and Gemini.
                    
                    CORE PHILOSOPHY:
                    Provide highly contextual, professional, and trustworthy assessments. Demonstrate deep reasoning, context awareness, critical thinking, and professional judgment in every turn. Avoid shallow, repetitive, or generic one-line responses.
                    
                    THINKING PROCESS:
                    For complex queries, structure your response to show your reasoning:
                    1. Analyze the core requirements/problem.
                    2. Evaluate multiple alternatives/possibilities.
                    3. Explain tradeoffs, potential risks, or missing information.
                    4. Draw clear, evidence-based conclusions.
                    
                    STRICT COMPLIANCE RULES:
                    1. STRICT FACTUALITY: Base all candidate assessments, rankings, scores, skills, achievements, and timelines strictly on the verified context, RAG search results, tools, and candidate rankings list provided in the prompt.
                    2. NO HALLUCINATIONS: Never invent fake candidates, fictional names (e.g. 'Candidate A', 'John Doe'), mockup resumes, fake match scores, fictitious interview feedback, or fake actions.
                    3. DATA LIMITATIONS: If information is missing or unavailable, explicitly state the limitation. Explain what data is missing and ask clarifying questions to the recruiter if needed.
                    4. RANKINGS AND MATCH SCORES: Answer questions about top candidates or rankings ONLY from the provided candidate rankings list in the context. Never hallucinate names, scores, or IDs. If the list is empty, state that no candidates have been screened or ranked yet.
                    
                    AI BEHAVIOR & INTERACTION:
                    - Handle follow-up questions naturally, referencing previous turns in the conversation.
                    - Compare candidates or options side-by-side where appropriate, explaining trade-offs.
                    - Suggest concrete validation strategies (e.g. customized technical screening questions) for recruiters to assess specific candidate claims.
                    - Use clean, structured markdown formatting (e.g., tables, bullet lists, bold terminology) to present findings clearly.
                    """;

            if (resumeId != null) {
                String candidateName = "Unknown Candidate";
                String candidateEmail = "";
                try {
                    candidateName = resumeServiceClient.getCandidateName(resumeId.toString());
                    candidateEmail = resumeServiceClient.getCandidateEmail(resumeId.toString());
                } catch (Exception e) {
                    log.warn("Failed to get candidate details: {}", e.getMessage());
                }

                String fullResumeText = "";
                try {
                    java.util.List<AiScreeningServiceClient.ChunkDto> chunks = aiScreeningServiceClient.getResumeChunks(resumeId.toString());
                    if (chunks != null && !chunks.isEmpty()) {
                        java.util.List<AiScreeningServiceClient.ChunkDto> sortedChunks = new java.util.ArrayList<>(chunks);
                        sortedChunks.sort(java.util.Comparator.comparingInt(AiScreeningServiceClient.ChunkDto::chunkIndex));
                        StringBuilder sb = new StringBuilder();
                        for (AiScreeningServiceClient.ChunkDto chunk : sortedChunks) {
                            sb.append(chunk.content()).append("\n");
                        }
                        fullResumeText = sb.toString();
                    }
                } catch (Exception e) {
                    log.warn("Failed to retrieve full resume text for resume={}: {}", resumeId, e.getMessage());
                }

                String candidateReport = "";
                if (jobId != null) {
                    try {
                        candidateReport = screeningServiceClient.getCandidateReport(resumeId.toString(), jobId.toString());
                    } catch (Exception e) {
                        log.warn("Failed to retrieve candidate screening report for resume={} job={}: {}", resumeId, jobId, e.getMessage());
                    }
                }

                // Upgraded grounding system prompt
                systemPrompt = String.format("""
                        You are analyzing the candidate profile and resume of %s only.
                        The complete resume text and system screening report are provided below.
                        
                        ABSOLUTE GROUNDING RULES:
                        1. Base all answers ONLY on the provided Resume Text and System Screening Report.
                        2. If asked about match score, strengths, or gaps/missing skills, use the data in the System Screening Report.
                        3. If asked about project details, experience, or achievements, use the Resume Text.
                        4. NEVER invent projects, skills, scores, or facts not explicitly written below.
                        5. If the answer cannot be found in the provided text, say: "This information is not present in this resume or screening report."
                        6. Never fabricate or hallucinate names, scores, or emails under any circumstance.
                        
                        RESUME TEXT:
                        %s
                        
                        SYSTEM SCREENING REPORT:
                        %s
                        """,
                        candidateName, fullResumeText, (candidateReport == null || candidateReport.isEmpty()) ? "No screening report available yet." : candidateReport);
            }

            if (jobId != null) {
                String jobDetails = "";
                try {
                    jobDetails = jobServiceClient.getJobDetails(jobId.toString());
                } catch (Exception e) {
                    log.warn("Failed to get job details: {}", e.getMessage());
                }

                String candidateRankings = "No candidate rankings found for this job position.";
                try {
                    String rankingsJson = screeningServiceClient.getRankings(jobId.toString(), 0.0, 10);
                    candidateRankings = recruiterAssistantTools.formatRankings(rankingsJson);
                } catch (Exception e) {
                    log.warn("Failed to get candidate rankings for jobId={}: {}", jobId, e.getMessage());
                }

                systemPrompt += String.format("\n[Active Job Context]\n- Job ID: %s\n- Details: %s\n\n[Candidate Rankings for this Job]\n%s\n",
                        jobId, jobDetails, candidateRankings);
            }

            if (resumeId == null) {
                systemPrompt += """
                        
                        [Universal Chat Context]
                        You are in Universal Recruiter Chat mode. You do not have a single active candidate context selected.
                        Instead, you can query, scan, and assess all candidates/resumes and jobs in the platform.
                        To answer the recruiter's questions, you MUST use the appropriate tools:
                        - Use 'topCandidates' or 'candidateRanking' to see match scores and rankings of candidates for a job.
                        - Use 'compareCandidate' to do side-by-side comparison of candidates.
                        - Use 'candidateLookup' with a search string to find candidates matching specific skills, details, or names.
                        - Use 'listAllJobs' to see all available job positions.
                        - Use 'jobDescriptionLookup' to view details of a specific job description.
                        - Use 'interviewQuestion' to generate targeted technical interview questions for a candidate.
                        
                        CRITICAL: You MUST execute the correct tool to fetch real data before answering any query about candidates, rankings, or comparisons. Never invent names, scores, or details. If a tool returns no data, state that no records match the request.
                        """;
            }

            QueryRouterService.QueryRoute route =
                    queryRouter.route(message, resumeId != null);
            log.info("[ChatService] Route           : {}", route);

            String reply;
            try {
                String finalSystemPrompt = systemPrompt;
                reply = switch (route) {
                    case VECTOR_SEARCH -> {
                        if (resumeId == null) {
                            log.info("[ChatService] VECTOR_SEARCH but no resumeId — using toolCall to scan all resumes");
                            yield toolCall(message, conversationId, finalSystemPrompt);
                        }
                        yield ragCall(message, resumeId.toString(), conversationId, finalSystemPrompt);
                    }
                    case TOOL_CALL      -> toolCall(message, conversationId, finalSystemPrompt);
                    case CONVERSATIONAL -> {
                        if (resumeId == null) {
                            log.info("[ChatService] CONVERSATIONAL but no resumeId — using toolCall to scan all resumes");
                            yield toolCall(message, conversationId, finalSystemPrompt);
                        }
                        yield conversational(message, conversationId, finalSystemPrompt);
                    }
                };
            } catch (Exception e) {
                log.error("[ChatService] Pipeline error: {}", e.getMessage(), e);
                reply = "I encountered an error. Please try again.";
            }

            log.info("[ChatService] Answer preview  : '{}'",
                    reply.substring(0, Math.min(200, reply.length())));
            log.info("[ChatService] ══════════════════════════════════════");

            meterRegistry.counter("chat.messages.total", "role", "ASSISTANT").increment();
            persist(conversationId, "ASSISTANT", reply, jobId, resumeId);
            publishKafka(conversationId, jobId, resumeId, message, reply);

            return reply;
        } finally {
            ChatContextHolder.clear();
        }
    }

    private String ragCall(String message, String resumeId, String conversationId, String systemPrompt) {
        log.info("[ChatService] RAG path — resumeId={}", resumeId);
        Timer.Sample sample = Timer.start(meterRegistry);
        String finalStatus = "success";

        try {
            // Lambda retriever — resumeId captured in closure, threadsafe per request
            DocumentRetriever retriever = query ->
                    rerankingService.rank(
                            new org.springframework.ai.rag.Query(query.text()),
                            hybridRetrievalService.retrieve(query.text(), resumeId)
                    );

            // Build fresh advisor per request — chatModel now correctly in scope
            RetrievalAugmentationAdvisor ragAdvisor = RetrievalAugmentationAdvisor.builder()
                    .queryTransformers(
                            RewriteQueryTransformer.builder()
                                    .chatClientBuilder(ChatClient.builder(chatModel))
                                    .build()
                    )
                    .queryExpander(
                            MultiQueryExpander.builder()
                                    .chatClientBuilder(ChatClient.builder(chatModel))
                                    .numberOfQueries(3)
                                    .includeOriginal(true)
                                    .build()
                    )
                    .documentRetriever(retriever)
                    .documentJoiner(new ConcatenationDocumentJoiner())
                    .build();

            return chatClient.prompt()
                    .system(systemPrompt)
                    .messages(new UserMessage(message))
                    .advisors(ragAdvisor, new MessageChatMemoryAdvisor(chatMemory))
                    .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                    .call()
                    .content();
        } catch (Exception e) {
            finalStatus = "failed";
            throw e;
        } finally {
            sample.stop(meterRegistry.timer("rag.retrieval.duration", "status", finalStatus));
        }
    }

    private String toolCall(String message, String conversationId, String systemPrompt) {
        log.info("[ChatService] TOOL path");
        return chatClient.prompt()
                .system(systemPrompt)
                .messages(new UserMessage(message))
                .tools(recruiterAssistantTools)
                .advisors(new MessageChatMemoryAdvisor(chatMemory))
                .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                .call()
                .content();
    }

    private String conversational(String message, String conversationId, String systemPrompt) {
        log.info("[ChatService] CONVERSATIONAL path");
        return chatClient.prompt()
                .system(systemPrompt)
                .messages(new UserMessage(message))
                .advisors(new MessageChatMemoryAdvisor(chatMemory))
                .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                .call()
                .content();
    }

    private void persist(String sessionId, String role, String content,
                         UUID jobId, UUID resumeId) {
        chatMessageRepository.save(ChatMessageEntity.builder()
                .sessionId(sessionId).role(role).content(content)
                .jobId(jobId).resumeId(resumeId)
                .timestamp(LocalDateTime.now()).build());
    }

    private void publishKafka(String conversationId, UUID jobId, UUID resumeId,
                              String userMessage, String aiReply) {
        try {
            kafkaTemplate.send("chat.interaction.completed",
                    new ChatInteractionEvent(conversationId, jobId, resumeId,
                            userMessage, aiReply, LocalDateTime.now()));
        } catch (Exception e) {
            log.warn("[ChatService] Kafka publish failed: {}", e.getMessage());
        }
    }
}