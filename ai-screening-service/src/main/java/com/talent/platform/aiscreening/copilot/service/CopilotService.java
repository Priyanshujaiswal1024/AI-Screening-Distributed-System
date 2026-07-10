package com.talent.platform.aiscreening.copilot.service;

import com.talent.platform.aiscreening.copilot.dto.CopilotDtos;
import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.client.advisor.MessageChatMemoryAdvisor;
import org.springframework.ai.chat.memory.ChatMemory;
import org.springframework.ai.tool.ToolCallback;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * FIX: Added @Qualifier("recruiterTools") on ToolCallback[] constructor param.
 *      Without this, Spring cannot resolve which ToolCallback[] bean to inject
 *      and throws NoSuchBeanDefinitionException at startup.
 *      @RequiredArgsConstructor removed — Lombok cannot generate @Qualifier on constructor params.
 */
@Service
@Slf4j
public class CopilotService {

    private final ChatClient chatClient;
    private final ChatMemory chatMemory;
    private final ToolCallback[] recruiterTools;
    private final MeterRegistry meterRegistry;

    public CopilotService(
            ChatClient chatClient,
            ChatMemory chatMemory,
            @Qualifier("recruiterTools") ToolCallback[] recruiterTools,  // FIX
            MeterRegistry meterRegistry
    ) {
        this.chatClient      = chatClient;
        this.chatMemory      = chatMemory;
        this.recruiterTools  = recruiterTools;
        this.meterRegistry   = meterRegistry;
    }

    private static final String COPILOT_SYSTEM = """
            You are a Talent Intelligence AI Copilot — an expert recruiter assistant.
            
            You have access to these tools:
            - searchResumes: find candidates by skill, name, or status
            - getRankedCandidates: get top candidates for a specific job
            - getCandidateScore: get score for one candidate + job pair
            - analyzeSkillGaps: check which skills a candidate has or lacks
            - generateCandidateSummary: produce executive summary + hiring recommendation
            - generateInterviewQuestions: create targeted interview questions
            
            WORKFLOW:
            When the recruiter asks to "find top candidates for job X":
              1. Call getRankedCandidates with the jobId
              2. For each top candidate, call generateCandidateSummary
              3. Synthesize a final ranked list with recommendations
            
            When the recruiter asks about skills:
              1. Call analyzeSkillGaps with relevant skills
              2. Report matched vs missing clearly
            
            Rules:
            - Always use tools to get real data — never invent candidate names or scores
            - Present data in a clear, recruiter-friendly format
            - If a jobDescriptionId is available in context, use it automatically
            - Be decisive in hiring recommendations
            """;

    public CopilotDtos.CopilotResponse chat(CopilotDtos.CopilotRequest request,
                                            String recruiterEmail) {
        String conversationId = (request.conversationId() != null
                && !request.conversationId().isBlank())
                ? request.conversationId()
                : "copilot-" + recruiterEmail + "-" + UUID.randomUUID();

        log.info("[CopilotService] recruiter='{}' conv='{}' message='{}'",
                recruiterEmail, conversationId,
                request.message().substring(0, Math.min(100, request.message().length())));

        Timer.Sample timer = Timer.start(meterRegistry);
        List<String> toolsUsed = new ArrayList<>();

        String userMessage = request.jobDescriptionId() != null
                && !request.jobDescriptionId().isBlank()
                ? "[Context: Job ID = " + request.jobDescriptionId() + "]\n" + request.message()
                : request.message();

        try {
            String answer = chatClient.prompt()
                    .system(COPILOT_SYSTEM)
                    .user(userMessage)
                    .tools(recruiterTools)
                    .advisors(new MessageChatMemoryAdvisor(chatMemory))
                    .advisors(a -> a.param("chat_memory_conversation_id", conversationId))
                    .call()
                    .content();

            timer.stop(Timer.builder("copilot.response.time")
                    .tag("recruiter", recruiterEmail)
                    .register(meterRegistry));

            return new CopilotDtos.CopilotResponse(
                    conversationId, answer, toolsUsed, LocalDateTime.now());

        } catch (Exception e) {
            log.error("[CopilotService] Failed: {}", e.getMessage(), e);
            meterRegistry.counter("copilot.errors").increment();
            throw new RuntimeException("Copilot failed to generate response: " + e.getMessage(), e);
        }
    }
}